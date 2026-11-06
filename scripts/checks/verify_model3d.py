#!/usr/bin/env python3
"""Independent check of exported 3D files (MODEL-01). Standard library only.

Usage: verify_model3d.py FILE [FILE …]   (.stl, .3mf, .glb, _obj.zip)

Prints one JSON report per file and exits 1 when any file has an error.
The check does not reuse the planner's TypeScript code: it reads the bytes as
the format specifications describe them and checks what a slicer needs.

- STL (binary and ASCII): triangle count matches the file size, finite
  coordinates, no degenerate triangles, stored normals agree with the
  winding.
- 3MF (3MF Core Specification 1.3): OPC package ([Content_Types].xml,
  _rels/.rels → model part), model namespace and unit, unique resource ids,
  base materials and colour syntax, vertex/triangle index ranges, property
  references, build items pointing at model objects.
- Print meshes (STL and every 3MF object): vertices welded exactly, every
  directed edge used once and its reverse once (closed, consistently
  oriented, edge-manifold), one triangle fan around every vertex
  (vertex-manifold), positive enclosed volume.
- GLB (glTF 2.0 binary container): header, chunk layout and alignment,
  buffer length, accessor and bufferView ranges. The full glTF rules are
  checked by the Khronos glTF-Validator in the Node tests.
- OBJ zip: mtllib names a file in the zip, face indices in range.

If the official 3MF library (`pip install lib3mf`) is installed, 3MF files are
also read with it in strict mode and its warnings are reported (`lib3mf`).
"""
from __future__ import annotations

import io
import json
import math
import struct
import sys
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict

CORE_NS = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02'
REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships'
CT_NS = 'http://schemas.openxmlformats.org/package/2006/content-types'
MODEL_REL = 'http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel'
MODEL_CT = 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml'
RELS_CT = 'application/vnd.openxmlformats-package.relationships+xml'
UNITS = {'micron', 'millimeter', 'centimeter', 'inch', 'foot', 'meter'}


class Report:
    def __init__(self, path: str, kind: str):
        self.data = {'file': path, 'kind': kind, 'errors': [], 'warnings': []}

    def error(self, msg: str) -> None:
        if len(self.data['errors']) < 50:
            self.data['errors'].append(msg)

    def warn(self, msg: str) -> None:
        if len(self.data['warnings']) < 50:
            self.data['warnings'].append(msg)

    def __setitem__(self, key, value):
        self.data[key] = value


# ---------------------------------------------------------------- mesh rules

def check_mesh(rep: Report, vertices: list, triangles: list, label: str) -> dict:
    """Closed, consistently oriented, edge- and vertex-manifold, positive volume."""
    out = {'vertices': len(vertices), 'triangles': len(triangles)}
    for i, v in enumerate(vertices):
        if not all(math.isfinite(c) for c in v):
            rep.error(f'{label}: Punkt {i} ist keine endliche Zahl')
            return out
    directed = {}
    degenerate = 0
    for t, (a, b, c) in enumerate(triangles):
        if a == b or b == c or a == c:
            degenerate += 1
            continue
        pa, pb, pc = vertices[a], vertices[b], vertices[c]
        u = [pb[k] - pa[k] for k in range(3)]
        w = [pc[k] - pa[k] for k in range(3)]
        cross = (u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0])
        if cross[0] == 0 and cross[1] == 0 and cross[2] == 0:
            degenerate += 1
        for e in ((a, b), (b, c), (c, a)):
            if e in directed:
                directed[e] = -1  # used twice in the same direction
            else:
                directed[e] = t
    if degenerate:
        rep.error(f'{label}: {degenerate} entartete Dreiecke (Fläche 0)')
    doubled = sum(1 for v in directed.values() if v == -1)
    open_edges = sum(1 for (a, b) in directed if (b, a) not in directed)
    if doubled:
        rep.error(f'{label}: {doubled} Kanten doppelt in gleicher Richtung (nicht mannigfaltig oder falsch orientiert)')
    if open_edges:
        rep.error(f'{label}: {open_edges} offene Kanten (nicht wasserdicht)')
    out['openEdges'] = open_edges
    # Vertex fans: around each vertex the triangles must form exactly one cycle.
    if not doubled and not open_edges and not degenerate:
        nxt = defaultdict(dict)  # vertex -> {from_neighbour: to_neighbour}
        for (a, b, c) in triangles:
            nxt[a][b] = c
            nxt[b][c] = a
            nxt[c][a] = b
        pinched = 0
        for v, ring in nxt.items():
            start = next(iter(ring))
            cur, steps = start, 0
            while True:
                cur = ring[cur]
                steps += 1
                if cur == start or steps > len(ring):
                    break
            if steps != len(ring):
                pinched += 1
        if pinched:
            rep.error(f'{label}: {pinched} Punkte mit mehreren Flächenfächern (Berührung nur an einer Ecke)')
        out['pinchedVertices'] = pinched
    volume = 0.0
    for (a, b, c) in triangles:
        pa, pb, pc = vertices[a], vertices[b], vertices[c]
        volume += (pa[0] * (pb[1] * pc[2] - pb[2] * pc[1])
                   - pa[1] * (pb[0] * pc[2] - pb[2] * pc[0])
                   + pa[2] * (pb[0] * pc[1] - pb[1] * pc[0])) / 6.0
    out['volume'] = volume
    if not volume > 0:
        rep.error(f'{label}: eingeschlossenes Volumen {volume} ist nicht positiv (Normalen zeigen nach innen?)')
    # Components and Euler characteristic (information for the report).
    parent = list(range(len(vertices)))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    used = set()
    for (a, b, c) in triangles:
        used.update((a, b, c))
        for x, y in ((a, b), (b, c)):
            rx, ry = find(x), find(y)
            if rx != ry:
                parent[rx] = ry
    out['parts'] = len({find(v) for v in used})
    out['unusedVertices'] = len(vertices) - len(used)
    out['euler'] = len(used) - len(directed) // 2 + len(triangles)
    if not math.isfinite(volume):
        rep.error(f'{label}: Volumen nicht berechenbar')
    return out


def weld_exact(points: list) -> tuple[list, list]:
    """Welds identical coordinates (STL stores each triangle's corners separately)."""
    index, vertices, tris = {}, [], []
    for i in range(0, len(points), 3):
        tri = []
        for p in points[i:i + 3]:
            k = index.get(p)
            if k is None:
                k = index[p] = len(vertices)
                vertices.append(p)
            tri.append(k)
        tris.append(tuple(tri))
    return vertices, tris


# ---------------------------------------------------------------- STL

def check_stl(path: str, data: bytes) -> dict:
    rep = Report(path, 'stl')
    binary = len(data) >= 84 and 84 + 50 * struct.unpack_from('<I', data, 80)[0] == len(data)
    points, normals = [], []
    if binary:
        if data[:5] == b'solid':
            rep.warn('Binäres STL beginnt mit "solid" – manche Programme halten es für ASCII')
        n = struct.unpack_from('<I', data, 80)[0]
        for t in range(n):
            vals = struct.unpack_from('<12f', data, 84 + 50 * t)
            normals.append(vals[0:3])
            points.extend([vals[3:6], vals[6:9], vals[9:12]])
        rep['format'] = 'binary'
    else:
        text = data.decode('ascii', errors='replace')
        if not text.lstrip().startswith('solid'):
            rep.error('Weder binäres STL (Länge passt nicht zur Dreieckszahl) noch ASCII-STL')
            return rep.data
        cur = None
        for line in text.splitlines():
            parts = line.split()
            if parts[:2] == ['facet', 'normal']:
                normals.append(tuple(float(x) for x in parts[2:5]))
            elif parts[:1] == ['vertex']:
                points.append(tuple(float(x) for x in parts[1:4]))
        rep['format'] = 'ascii'
        if len(points) != 3 * len(normals):
            rep.error('ASCII-STL: Anzahl Punkte passt nicht zur Anzahl Dreiecke')
            return rep.data
    rep['triangles'] = len(normals)
    if not normals:
        rep.error('STL enthält keine Dreiecke')
        return rep.data
    # Stored normals must agree with the winding (slicers use either).
    bad = 0
    for t, nrm in enumerate(normals):
        a, b, c = points[3 * t:3 * t + 3]
        u = [b[k] - a[k] for k in range(3)]
        w = [c[k] - a[k] for k in range(3)]
        cr = (u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0])
        if any(nrm) and cr[0] * nrm[0] + cr[1] * nrm[1] + cr[2] * nrm[2] <= 0:
            bad += 1
    if bad:
        rep.error(f'{bad} gespeicherte Normalen widersprechen der Eckreihenfolge')
    vertices, tris = weld_exact(points)
    rep['mesh'] = check_mesh(rep, vertices, tris, 'STL')
    lo = [min(p[k] for p in vertices) for k in range(3)]
    hi = [max(p[k] for p in vertices) for k in range(3)]
    rep['size'] = [round(hi[k] - lo[k], 4) for k in range(3)]
    return rep.data


# ---------------------------------------------------------------- 3MF

def q(tag: str, ns: str = CORE_NS) -> str:
    return f'{{{ns}}}{tag}'


def check_3mf(path: str, data: bytes) -> dict:
    rep = Report(path, '3mf')
    try:
        z = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile as e:
        rep.error(f'Kein ZIP-Paket: {e}')
        return rep.data
    names = set(z.namelist())
    bad_crc = z.testzip()
    if bad_crc:
        rep.error(f'Prüfsumme falsch: {bad_crc}')
    # OPC: content types.
    if '[Content_Types].xml' not in names:
        rep.error('[Content_Types].xml fehlt')
        return rep.data
    ct = ET.fromstring(z.read('[Content_Types].xml'))
    defaults = {d.get('Extension', '').lower(): d.get('ContentType') for d in ct.findall(q('Default', CT_NS))}
    overrides = {o.get('PartName'): o.get('ContentType') for o in ct.findall(q('Override', CT_NS))}
    if defaults.get('rels') != RELS_CT:
        rep.error('[Content_Types].xml: Inhaltstyp für .rels fehlt oder ist falsch')
    # OPC: root relationship to the model part.
    if '_rels/.rels' not in names:
        rep.error('_rels/.rels fehlt')
        return rep.data
    rels = ET.fromstring(z.read('_rels/.rels'))
    targets = [r.get('Target', '') for r in rels.findall(q('Relationship', REL_NS)) if r.get('Type') == MODEL_REL]
    if len(targets) != 1:
        rep.error(f'_rels/.rels: genau eine 3D-Modell-Beziehung erwartet, gefunden {len(targets)}')
        return rep.data
    part = targets[0].lstrip('/')
    if part not in names:
        rep.error(f'Modellteil {targets[0]} fehlt im Paket')
        return rep.data
    ext = part.rsplit('.', 1)[-1].lower()
    if overrides.get('/' + part, defaults.get(ext)) != MODEL_CT:
        rep.error(f'Inhaltstyp des Modellteils {part} ist nicht {MODEL_CT}')
    try:
        root = ET.fromstring(z.read(part))
    except ET.ParseError as e:
        rep.error(f'Modellteil ist kein gültiges XML: {e}')
        return rep.data
    if root.tag != q('model'):
        rep.error(f'Wurzelelement {root.tag} ist nicht {{{CORE_NS}}}model')
        return rep.data
    unit = root.get('unit', 'millimeter')
    if unit not in UNITS:
        rep.error(f'Einheit {unit!r} ist nicht erlaubt')
    rep['unit'] = unit
    required = root.get('requiredextensions')
    if required:
        rep.warn(f'Benötigte Erweiterungen: {required}')
    res = root.find(q('resources'))
    build = root.find(q('build'))
    if res is None or build is None:
        rep.error('resources oder build fehlt')
        return rep.data
    ids = set()
    materials = {}  # id -> count
    objects = {}
    for el in res:
        rid = el.get('id')
        if rid is None or not rid.isdigit() or int(rid) < 1:
            rep.error(f'Ressource {el.tag} ohne gültige positive id')
            continue
        if rid in ids:
            rep.error(f'Ressourcen-id {rid} doppelt')
        ids.add(rid)
        if el.tag == q('basematerials'):
            bases = el.findall(q('base'))
            for b in bases:
                col = b.get('displaycolor', '')
                if not (col.startswith('#') and len(col) in (7, 9) and all(ch in '0123456789abcdefABCDEF' for ch in col[1:])):
                    rep.error(f'Grundmaterial {b.get("name")!r}: Farbe {col!r} ist nicht #RRGGBB(AA)')
                if not b.get('name'):
                    rep.error('Grundmaterial ohne Namen')
            materials[rid] = len(bases)
        elif el.tag == q('object'):
            objects[rid] = el
    rep['materials'] = sum(materials.values())
    meshes = []
    for oid, obj in objects.items():
        typ = obj.get('type', 'model')
        if typ not in ('model', 'solidsupport', 'support', 'surface', 'other'):
            rep.error(f'Objekt {oid}: Typ {typ!r} unbekannt')
        mesh = obj.find(q('mesh'))
        if mesh is None:
            if obj.find(q('components')) is None:
                rep.error(f'Objekt {oid}: weder mesh noch components')
            continue
        opid, opindex = obj.get('pid'), obj.get('pindex')
        if (opid is None) != (opindex is None) and opid is not None:
            rep.error(f'Objekt {oid}: pid ohne pindex')
        vertices = []
        vs = mesh.find(q('vertices'))
        ts = mesh.find(q('triangles'))
        if vs is None or ts is None:
            rep.error(f'Objekt {oid}: vertices oder triangles fehlt')
            continue
        for v in vs.findall(q('vertex')):
            try:
                vertices.append((float(v.get('x')), float(v.get('y')), float(v.get('z'))))
            except (TypeError, ValueError):
                rep.error(f'Objekt {oid}: Punkt ohne gültige Koordinaten')
                vertices.append((math.nan,) * 3)
        tris, bad_refs, bad_props, used_props = [], 0, 0, set()
        n = len(vertices)
        for t in ts.findall(q('triangle')):
            try:
                a, b, c = int(t.get('v1')), int(t.get('v2')), int(t.get('v3'))
            except (TypeError, ValueError):
                bad_refs += 1
                continue
            if not (0 <= a < n and 0 <= b < n and 0 <= c < n):
                bad_refs += 1
                continue
            tris.append((a, b, c))
            pid = t.get('pid', opid)
            if t.get('p1') is not None or t.get('pid') is not None:
                p1 = t.get('p1', opindex)
                used_props.add((pid, p1))
                if pid not in materials or p1 is None or not p1.isdigit() or int(p1) >= materials[pid]:
                    bad_props += 1
                for key in ('p2', 'p3'):
                    pk = t.get(key)
                    if pk is not None and (pid not in materials or not pk.isdigit() or int(pk) >= materials[pid]):
                        bad_props += 1
        if bad_refs:
            rep.error(f'Objekt {oid}: {bad_refs} Dreiecke mit ungültigen Punktnummern')
        if bad_props:
            rep.error(f'Objekt {oid}: {bad_props} Dreiecke mit ungültigem Materialverweis')
        if opid is not None and (opid not in materials or not (opindex or '').isdigit() or int(opindex) >= materials[opid]):
            rep.error(f'Objekt {oid}: Materialverweis pid={opid} pindex={opindex} ungültig')
        if typ == 'model' and not tris:
            rep.error(f'Objekt {oid}: Modell ohne Dreiecke')
        info = check_mesh(rep, vertices, tris, f'Objekt {oid}')
        info['usedMaterials'] = len(used_props)
        meshes.append(info)
    items = build.findall(q('item'))
    if not items:
        rep.error('build enthält kein item')
    for it in items:
        ref = it.get('objectid')
        if ref not in objects:
            rep.error(f'build item verweist auf fehlendes Objekt {ref}')
        elif objects[ref].get('type', 'model') == 'other':
            rep.error(f'build item {ref}: Objekttyp other darf nicht gebaut werden')
    used_total = sum(m.get('usedMaterials', 0) for m in meshes)
    if materials and used_total < sum(materials.values()):
        rep.warn(f'{sum(materials.values()) - used_total} Grundmaterialien werden von keinem Dreieck benutzt')
    rep['objects'] = len(objects)
    rep['meshes'] = meshes
    lib3mf_check(rep, data)
    return rep.data


def lib3mf_check(rep: Report, data: bytes) -> None:
    """Second reader: the 3MF Consortium's reference library, if installed."""
    try:
        import lib3mf  # type: ignore
    except Exception:
        rep['lib3mf'] = 'nicht installiert'
        return
    try:
        wrapper = lib3mf.get_wrapper()
        model = wrapper.CreateModel()
        reader = model.QueryReader('3mf')
        reader.SetStrictModeActive(True)
        reader.ReadFromBuffer(data)
        warnings = [reader.GetWarning(i)[1] for i in range(reader.GetWarningCount())]
        objects = model.GetMeshObjects()
        meshes = []
        while objects.MoveNext():
            m = objects.GetCurrentMeshObject()
            meshes.append({'triangles': m.GetTriangleCount(), 'manifoldAndOriented': m.IsManifoldAndOriented()})
            if not m.IsManifoldAndOriented():
                rep.error('lib3mf: Netz ist nicht mannigfaltig und einheitlich orientiert')
        major, minor, micro = wrapper.GetLibraryVersion()
        rep['lib3mf'] = {'version': f'{major}.{minor}.{micro}', 'warnings': warnings, 'meshes': meshes}
        for w in warnings:
            rep.error(f'lib3mf (strikt): {w}')
    except Exception as e:  # lib3mf raises ELib3MFException
        rep.error(f'lib3mf lehnt die Datei ab: {e}')


# ---------------------------------------------------------------- GLB

COMPONENT_SIZE = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
TYPE_COUNT = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT2': 4, 'MAT3': 9, 'MAT4': 16}


def check_glb(path: str, data: bytes) -> dict:
    rep = Report(path, 'glb')
    if len(data) < 20 or data[:4] != b'glTF':
        rep.error('Kein GLB (Kennung glTF fehlt)')
        return rep.data
    version, length = struct.unpack_from('<II', data, 4)
    if version != 2:
        rep.error(f'GLB-Version {version}, erwartet 2')
    if length != len(data):
        rep.error(f'Längenangabe {length} ≠ Dateilänge {len(data)}')
    chunks, off = [], 12
    while off + 8 <= len(data):
        clen, ctype = struct.unpack_from('<II', data, off)
        if clen % 4:
            rep.error(f'Block bei {off} ist nicht auf 4 Byte ausgerichtet')
        chunks.append((ctype, data[off + 8:off + 8 + clen]))
        off += 8 + clen
    if off != len(data):
        rep.error('Blöcke enden nicht genau am Dateiende')
    if not chunks or chunks[0][0] != 0x4E4F534A:
        rep.error('Erster Block ist kein JSON')
        return rep.data
    gltf = json.loads(chunks[0][1].decode('utf-8').rstrip(' \0'))
    if gltf.get('asset', {}).get('version') != '2.0':
        rep.error('asset.version ist nicht 2.0')
    bin_chunk = chunks[1][1] if len(chunks) > 1 and chunks[1][0] == 0x004E4942 else None
    buffers = gltf.get('buffers', [])
    if buffers:
        if bin_chunk is None:
            rep.error('BIN-Block fehlt')
            return rep.data
        if buffers[0].get('byteLength', 0) > len(bin_chunk):
            rep.error('buffers[0].byteLength größer als der BIN-Block')
    views = gltf.get('bufferViews', [])
    for i, bv in enumerate(views):
        size = buffers[bv['buffer']]['byteLength'] if bv.get('buffer', 0) < len(buffers) else 0
        if bv.get('byteOffset', 0) + bv['byteLength'] > size:
            rep.error(f'bufferView {i} reicht über den Puffer hinaus')
    for i, acc in enumerate(gltf.get('accessors', [])):
        if 'bufferView' not in acc:
            continue
        bv = views[acc['bufferView']]
        elem = COMPONENT_SIZE[acc['componentType']] * TYPE_COUNT[acc['type']]
        stride = bv.get('byteStride', elem)
        end = acc.get('byteOffset', 0) + stride * (acc['count'] - 1) + elem
        if end > bv['byteLength']:
            rep.error(f'accessor {i} reicht über seine bufferView hinaus')
        if acc.get('byteOffset', 0) % COMPONENT_SIZE[acc['componentType']]:
            rep.error(f'accessor {i} ist nicht ausgerichtet')
    prims = [p for m in gltf.get('meshes', []) for p in m.get('primitives', [])]
    rep['primitives'] = len(prims)
    rep['triangles'] = sum(gltf['accessors'][p['indices']]['count'] // 3 for p in prims if 'indices' in p)
    if not prims:
        rep.error('Keine Netze im GLB')
    return rep.data


# ---------------------------------------------------------------- OBJ zip

def check_obj_zip(path: str, data: bytes) -> dict:
    rep = Report(path, 'obj')
    z = zipfile.ZipFile(io.BytesIO(data))
    names = z.namelist()
    objs = [n for n in names if n.endswith('.obj')]
    if len(objs) != 1:
        rep.error(f'Genau eine .obj-Datei erwartet, gefunden {len(objs)}')
        return rep.data
    text = z.read(objs[0]).decode('utf-8')
    vcount, faces, bad = 0, 0, 0
    for line in text.splitlines():
        if line.startswith('v '):
            vcount += 1
        elif line.startswith('mtllib '):
            if line[7:].strip() not in names:
                rep.error(f'mtllib {line[7:].strip()} fehlt im ZIP')
        elif line.startswith('f '):
            faces += 1
            for tok in line.split()[1:]:
                k = int(tok.split('/')[0])
                if not (1 <= k <= vcount or -vcount <= k <= -1):
                    bad += 1
    if bad:
        rep.error(f'{bad} Flächenverweise außerhalb der Punktliste')
    rep['vertices'], rep['faces'] = vcount, faces
    return rep.data


def check_file(path: str) -> dict:
    with open(path, 'rb') as f:
        data = f.read()
    low = path.lower()
    if low.endswith('.stl'):
        return check_stl(path, data)
    if low.endswith('.3mf'):
        return check_3mf(path, data)
    if low.endswith('.glb'):
        return check_glb(path, data)
    if low.endswith('.zip'):
        return check_obj_zip(path, data)
    return {'file': path, 'kind': 'unknown', 'errors': ['Unbekannte Dateiendung'], 'warnings': []}


def main(argv: list[str]) -> int:
    if not argv:
        print(__doc__)
        return 2
    failed = False
    for path in argv:
        try:
            r = check_file(path)
        except Exception as e:  # a crash on a damaged file is a finding, not a pass
            r = {'file': path, 'errors': [f'Prüfung abgebrochen: {type(e).__name__}: {e}'], 'warnings': []}
        failed |= bool(r['errors'])
        print(json.dumps(r, ensure_ascii=False))
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
