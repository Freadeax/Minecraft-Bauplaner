// MODEL-01-S05: exported files opened in the real programs people use, as far as a machine can do it.
// - Blender (Python module `bpy`, 5.2 checked): GLB with texture, OBJ+MTL, STL; scripts/checks/blender_model3d.py.
// - PrusaSlicer CLI (2.7 checked): STL and 3MF `--info` (manifold, facets, volume) and a real G-code export.
// Both are optional tools: without them the tests are skipped with a note (see docs/TESTING.md, MODEL-01).
//   BLENDER_PYTHON=<python with bpy>  PRUSA_SLICER=<prusa-slicer binary>  (defaults: python3 / prusa-slicer on PATH)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import * as formats from '../../../dist/formats/src/index.js';
import { createBuildingLibrary } from '../../../dist/domain/src/index.js';
import { exportModel as exportWith } from '../../../apps/web/src/export3d/build.ts';
import { fallbackRenderer } from '../../../apps/web/src/blockmodels/renderers.ts';
import { readZip } from '../../../apps/web/src/blockmodels/zip.ts';

const exportModel = req => exportWith(formats, req);
const BLENDER_PY = process.env.BLENDER_PYTHON || 'python3';
const SLICER = process.env.PRUSA_SLICER || 'prusa-slicer';
const hasBlender = spawnSync(BLENDER_PY, ['-c', 'import bpy'], { encoding: 'utf8' }).status === 0;
const hasSlicer = spawnSync(SLICER, ['--help'], { encoding: 'utf8' }).status === 0;
const dir = mkdtempSync(join(tmpdir(), 'model3d-ext-'));
const BLENDER_SCRIPT = fileURLToPath(new URL('../../../scripts/checks/blender_model3d.py', import.meta.url));

const state = (id, properties = {}) => ({ id: `minecraft:${id}`, properties });
const PALETTE = [state('stone'), state('red_wool'), state('oak_planks'), state('glass'),
  state('oak_stairs', { facing: 'north', half: 'bottom', shape: 'straight', waterlogged: 'false' })];
function house() {
  const cells = [];
  for (let x = 0; x < 7; x++) for (let y = 0; y < 5; y++) for (let z = 0; z < 6; z++) {
    const wall = x === 0 || x === 6 || z === 0 || z === 5 || y === 0 || y === 4;
    if (!wall || (x === 3 && z === 0 && (y === 1 || y === 2))) continue;
    cells.push({ position: [x, y, z], kind: 'block', paletteIndex: x === 2 && y === 2 && z === 5 ? 3 : (y === 4 ? 2 : (x + z) % 2) });
  }
  cells.push({ position: [3, 5, 2], kind: 'block', paletteIndex: 4 });
  return cells;
}
function png(w, h) {
  const raw = new Uint8Array(h * (1 + 4 * w));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.set([x * 60, y * 60, 120, 255], y * (1 + 4 * w) + 1 + 4 * x);
  const chunk = (type, data) => {
    const out = new Uint8Array(12 + data.length), dv = new DataView(out.buffer);
    dv.setUint32(0, data.length); out.set(new TextEncoder().encode(type), 4); out.set(data, 8);
    dv.setUint32(8 + data.length, formats.crc32(out.subarray(4, 8 + data.length)));
    return out;
  };
  const ihdr = new Uint8Array(13), dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w); dv.setUint32(4, h); ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())]);
}
const view = textured => ({ renderer: fallbackRenderer(), sprites: () => ({ rect: [0, 0, 1, 1], layer: 0 }), textured, place: 'center', bake: true,
  ...(textured && { texturePng: async () => new Uint8Array(png(4, 4)) }) });
const print = { detail: 2, smallParts: true, fill: true, hollow: 0, minPart: 0, maxColors: 4 };
const save = (name, bytes) => { const f = join(dir, name); writeFileSync(f, bytes); return f; };

function blender(...files) {
  const r = spawnSync(BLENDER_PY, ['-I', BLENDER_SCRIPT, ...files], { encoding: 'utf8', timeout: 300_000 });
  const lines = r.stdout.split('\n').filter(l => l.startsWith('{')).map(l => JSON.parse(l));
  assert.equal(lines.length, files.length, r.stdout + r.stderr);
  return lines;
}
function slicerInfo(file) {
  const r = spawnSync(SLICER, ['--info', file], { encoding: 'utf8', timeout: 300_000 });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return Object.fromEntries(r.stdout.split('\n').map(l => l.split('=').map(s => s.trim())).filter(p => p.length === 2));
}
function slice(file) {
  const out = `${file}.gcode`;
  const r = spawnSync(SLICER, ['--export-gcode', '--center', '100,100', '-o', out, file], { encoding: 'utf8', timeout: 600_000 });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const g = readFileSync(out, 'utf8');
  return { layers: (g.match(/^;LAYER_CHANGE/gm) ?? []).length, filament: Number(/; filament used \[mm\] = ([\d.]+)/.exec(g)?.[1] ?? 0) };
}

test('Blender opens GLB (with embedded texture), OBJ+MTL and STL with the exported geometry', { skip: !hasBlender && 'Blender-Python (bpy) fehlt' }, async () => {
  const cells = house(), common = { name: 'Haus', cells, palette: PALETTE, print };
  const glb = await exportModel({ ...common, view: view(true), format: 'glb', kind: 'view', blockSize: 1 });
  const obj = await exportModel({ ...common, view: view(false), format: 'obj', kind: 'view', blockSize: 1 });
  const stl = await exportModel({ ...common, view: view(false), format: 'stl', kind: 'print', blockSize: 10 });
  const files = await readZip(obj.file.bytes, () => true);
  for (const [name, data] of files) save(name, data);
  const [g, o, s] = blender(save('Haus.glb', glb.file.bytes), join(dir, 'Haus.obj'), save('Haus.stl', stl.file.bytes));
  for (const r of [g, o, s]) assert.deepEqual(r.errors, [], JSON.stringify(r));
  assert.equal(g.triangles, glb.stats.triangles, 'GLB: same triangles in Blender');
  assert.ok(g.materials >= 2);
  assert.ok(g.images >= 1, 'GLB: embedded texture reaches Blender');
  assert.equal(o.triangles, obj.stats.triangles, 'OBJ: same triangles in Blender');
  assert.ok(o.materials >= 2, 'OBJ: materials from the MTL');
  // Size: 7 × 6 × 6 blocks (stair on the roof) at 1 m, Blender is Z-up after the glTF/OBJ Y-up conversion.
  for (const r of [g, o]) assert.deepEqual([...r.size].sort((a, b) => a - b), [6, 6, 7], JSON.stringify(r.size));
  assert.equal(s.nonManifoldEdges, 0, 'STL: no non-manifold edges after merge by distance');
  assert.equal(s.nonManifoldVerts, 0);
  assert.equal(s.wrongNormals, 0, 'STL: consistent normals');
  assert.ok(Math.abs(s.volume - stl.print.check.volume) < 1e-3 * stl.print.check.volume, `${s.volume} vs ${stl.print.check.volume}`);
});

test('PrusaSlicer: STL and 3MF are manifold with the same volume and slice to G-code; a large catalogue building too', { skip: !hasSlicer && 'PrusaSlicer fehlt' }, async () => {
  const cells = house(), common = { name: 'Haus', cells, palette: PALETTE, view: view(false), print };
  const stl = await exportModel({ ...common, format: 'stl', kind: 'print', blockSize: 10 });
  const mf = await exportModel({ ...common, format: '3mf', kind: 'print', blockSize: 10 });
  for (const [file, model] of [[save('Haus.stl', stl.file.bytes), stl], [save('Haus.3mf', mf.file.bytes), mf]]) {
    const info = slicerInfo(file);
    assert.equal(info.manifold, 'yes', JSON.stringify(info));
    assert.equal(info.number_of_parts, '1');
    assert.ok(Math.abs(Number(info.volume) - model.print.check.volume) < 1e-3 * model.print.check.volume, `${info.volume} vs ${model.print.check.volume}`);
    assert.equal(Number(info.size_x), 70);
    const g = slice(file);
    assert.ok(g.layers > 100, `${g.layers} layers`);
    assert.ok(g.filament > 0);
  }
  // Largest shipped building, 120 mm, hollowed – a realistic print job.
  const lib = await createBuildingLibrary();
  const big = [...lib.versions].sort((a, b) => b.payload.cells.length - a.payload.cells.length)[0];
  const { min, maxExclusive } = big.payload.bounds;
  const longest = Math.max(...[0, 1, 2].map(i => maxExclusive[i] - min[i]));
  const large = await exportModel({ name: 'Gross', cells: big.payload.cells, palette: big.payload.palette, view: view(false), format: '3mf', kind: 'print', blockSize: 120 / longest,
    print: { detail: 1, smallParts: false, fill: true, hollow: 2, minPart: 8, maxColors: 4 } });
  const file = save('Gross.3mf', large.file.bytes);
  const info = slicerInfo(file);
  assert.equal(info.manifold, 'yes', JSON.stringify(info));
  assert.ok(Number(info.number_of_facets) > 1000);
  const g = slice(file);
  assert.ok(g.layers > 10 && g.filament > 0, JSON.stringify(g));
  console.log(`PrusaSlicer: ${big.assetId} ${big.payload.cells.length} Zellen → ${info.number_of_facets} Dreiecke, ${g.layers} Schichten, ${g.filament} mm Filament`);
});
