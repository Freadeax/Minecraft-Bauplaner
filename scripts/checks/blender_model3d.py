#!/usr/bin/env python3
"""Opens exported 3D files in real Blender (MODEL-01-S05) and reports what Blender sees.

Usage: <python with the `bpy` module> blender_model3d.py FILE [FILE …]   (.glb, .obj, .stl)

`pip install bpy` (Blender as a Python module, 5.2 checked) is enough; no Blender window is needed.
One JSON line per file: objects, vertices, triangles, materials, images, size. For STL files the
mesh is welded by distance and Blender's own manifold flags and volume are reported, the same
numbers a slicer preparing the print sees. Exit 1 if Blender fails to import a file or finds no
geometry; judging the numbers is left to the caller (tests/unit/formats/model3d-external.test.mjs).
"""
import json
import sys

import bpy  # must come first: it makes bmesh and mathutils importable
import bmesh  # noqa: E402
from mathutils import Vector  # noqa: E402


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_file(path: str) -> None:
    low = path.lower()
    if low.endswith('.glb') or low.endswith('.gltf'):
        bpy.ops.import_scene.gltf(filepath=path)
    elif low.endswith('.obj'):
        bpy.ops.wm.obj_import(filepath=path)
    elif low.endswith('.stl'):
        bpy.ops.wm.stl_import(filepath=path)
    else:
        raise ValueError(f'unbekannte Endung: {path}')


def report(path: str) -> dict:
    reset()
    import_file(path)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    out = {'file': path, 'objects': len(meshes), 'vertices': 0, 'triangles': 0, 'materials': 0, 'images': 0, 'errors': []}
    lo, hi = [float('inf')] * 3, [float('-inf')] * 3
    mats = set()
    for o in meshes:
        me = o.data
        me.calc_loop_triangles()
        out['vertices'] += len(me.vertices)
        out['triangles'] += len(me.loop_triangles)
        for m in me.materials:
            if m:
                mats.add(m.name)
        for corner in o.bound_box:
            w = o.matrix_world @ Vector(corner)
            for k in range(3):
                lo[k] = min(lo[k], w[k])
                hi[k] = max(hi[k], w[k])
    out['materials'] = len(mats)
    out['images'] = len([i for i in bpy.data.images if i.size[0] > 0])
    if meshes:
        out['size'] = [round(hi[k] - lo[k], 4) for k in range(3)]
    if not meshes or out['triangles'] == 0:
        out['errors'].append('Blender findet keine Geometrie')
    if path.lower().endswith('.stl') and meshes:
        bm = bmesh.new()
        for o in meshes:
            bm.from_mesh(o.data)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        out['nonManifoldEdges'] = sum(1 for e in bm.edges if not e.is_manifold)
        out['nonManifoldVerts'] = sum(1 for v in bm.verts if not v.is_manifold)
        out['wrongNormals'] = sum(1 for e in bm.edges if e.is_manifold and not e.is_contiguous)
        out['volume'] = round(bm.calc_volume(signed=True), 4)
        bm.free()
    return out


def main(argv):
    failed = False
    for path in argv:
        try:
            r = report(path)
        except Exception as e:  # an import error is a finding
            r = {'file': path, 'errors': [f'Import fehlgeschlagen: {e}']}
        failed |= bool(r['errors'])
        print(json.dumps(r, ensure_ascii=False), flush=True)
    return 1 if failed else 0


if __name__ == '__main__':
    # Blender prints its own start lines; the caller reads only lines starting with '{'.
    sys.exit(main(sys.argv[1:]))
