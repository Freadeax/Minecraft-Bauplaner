// MODEL-01: exported 3D files checked by independent readers.
// - glTF/GLB: Khronos glTF-Validator (npm `gltf-validator`), zero errors and zero warnings.
// - STL, 3MF, GLB container, OBJ zip: scripts/checks/verify_model3d.py (standard library, no planner code),
//   plus the 3MF Consortium's lib3mf in strict mode when it is installed.
// Negative cases prove the Python check finds open, flipped, pinched and badly referenced meshes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { createRequire } from 'node:module';
import * as formats from '../../../dist/formats/src/index.js';
import { exportModel as exportWith, printModel as printWith, viewModel } from '../../../apps/web/src/export3d/build.ts';
import { fallbackRenderer } from '../../../apps/web/src/blockmodels/renderers.ts';
import { python } from '../../../scripts/dev/python.mjs';

const require = createRequire(import.meta.url);
const gltfValidator = require('gltf-validator');
const { writeGlb, writeStl, write3mf, writeZip, deflateRaw, crc32 } = formats;
const exportModel = req => exportWith(formats, req);
const printModel = (...a) => printWith(formats, ...a);

const dir = mkdtempSync(join(tmpdir(), 'model3d-'));
let fileNo = 0;
const VERIFY = fileURLToPath(new URL('../../../scripts/checks/verify_model3d.py', import.meta.url));
/** Runs the independent Python check on one file; returns its JSON report. */
function verify(bytes, name) {
  const file = join(dir, `${fileNo++}-${name}`);
  writeFileSync(file, bytes);
  const r = spawnSync(python, ['-I', '-X', 'utf8', VERIFY, file], { encoding: 'utf8' });
  assert.equal(r.stderr, '', r.stderr);
  const report = JSON.parse(r.stdout);
  assert.equal(r.status, report.errors.length ? 1 : 0);
  return report;
}
const ok = (report) => assert.deepEqual(report.errors, [], JSON.stringify(report));
const lib3mfInstalled = spawnSync(python, ['-I', '-c', 'import lib3mf'], { encoding: 'utf8' }).status === 0;

async function gltfReport(bytes) {
  const r = await gltfValidator.validateBytes(bytes, { maxIssues: 50 });
  return r.issues;
}

const state = (id, properties = {}) => ({ id: `minecraft:${id}`, properties });
const PALETTE = [state('stone'), state('red_wool'), state('oak_planks'), state('glass'),
  state('oak_stairs', { facing: 'north', half: 'bottom', shape: 'straight', waterlogged: 'false' }),
  state('oak_slab', { type: 'top', waterlogged: 'false' })];
/** A small house: hollow walls with a door, a stair and a slab on the roof, two colours, one glass pane. */
function house() {
  const cells = [];
  for (let x = 0; x < 7; x++) for (let y = 0; y < 5; y++) for (let z = 0; z < 6; z++) {
    const wall = x === 0 || x === 6 || z === 0 || z === 5 || y === 0 || y === 4;
    if (!wall || (x === 3 && z === 0 && (y === 1 || y === 2))) continue;
    cells.push({ position: [x, y, z], kind: 'block', paletteIndex: x === 2 && y === 2 && z === 5 ? 3 : (y === 4 ? 2 : (x + z) % 2) });
  }
  cells.push({ position: [3, 5, 2], kind: 'block', paletteIndex: 4 }, { position: [4, 5, 2], kind: 'block', paletteIndex: 5 });
  return cells;
}
/** Seeded random blob (same shapes in every run). */
function blob(seed) {
  let s = seed;
  const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  const cells = [];
  for (let x = 0; x < 6; x++) for (let y = 0; y < 6; y++) for (let z = 0; z < 6; z++)
    if (rnd() < 0.45) cells.push({ position: [x, y, z], kind: 'block', paletteIndex: Math.floor(rnd() * 3) });
  return cells;
}
const view = { renderer: fallbackRenderer(), sprites: () => ({ rect: [0, 0, 1, 1], layer: 0 }), textured: false, place: 'center', bake: true };

/** Minimal valid PNG (RGBA) so the validator can check the embedded image too. */
function png(w, h) {
  const raw = new Uint8Array(h * (1 + 4 * w));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.set([x * 40, y * 40, 120, 255], y * (1 + 4 * w) + 1 + 4 * x);
  const chunk = (type, data) => {
    const out = new Uint8Array(12 + data.length), dv = new DataView(out.buffer);
    dv.setUint32(0, data.length);
    out.set(new TextEncoder().encode(type), 4); out.set(data, 8);
    dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
    return out;
  };
  const ihdr = new Uint8Array(13), dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w); dv.setUint32(4, h); ihdr.set([8, 6, 0, 0, 0], 8);
  const parts = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

test('glTF-Validator: GLB view models (coloured, textured with glass, centred and in place) have no errors or warnings', async () => {
  const cells = house();
  for (const textured of [false, true]) for (const place of ['center', 'origin']) {
    const v = viewModel(cells, PALETTE, view.renderer, view.sprites, textured, { name: 'Haus', blockSize: 0.5, place, bake: place === 'center' });
    const glb = writeGlb(v, textured ? { texturePng: png(4, 4) } : {});
    const issues = await gltfReport(glb);
    assert.equal(issues.numErrors, 0, JSON.stringify(issues.messages));
    assert.equal(issues.numWarnings, 0, JSON.stringify(issues.messages));
    ok(verify(glb, 'haus.glb'));
  }
  const viaExport = await exportModel({ name: 'Haus', cells, palette: PALETTE, view, format: 'glb', kind: 'view', blockSize: 1,
    print: { detail: 1, smallParts: true, fill: false, hollow: 0, minPart: 0, maxColors: 0 } });
  const issues = await gltfReport(viaExport.file.bytes);
  assert.equal(issues.numErrors + issues.numWarnings, 0, JSON.stringify(issues.messages));
});

test('STL and 3MF print shells pass the independent check at every detail level, filled, hollowed and with few colours', async () => {
  const cells = house();
  const variants = [
    { detail: 1, fill: false, hollow: 0, maxColors: 0 },
    { detail: 2, fill: true, hollow: 0, maxColors: 4 },
    { detail: 4, fill: true, hollow: 0, maxColors: 2 },
    { detail: 2, fill: true, hollow: 2, maxColors: 0 },
  ];
  for (const v of variants) {
    const print = { ...v, smallParts: true, minPart: 0 };
    const stl = await exportModel({ name: 'Haus', cells, palette: PALETTE, view, format: 'stl', kind: 'print', blockSize: 4, print });
    const s = verify(stl.file.bytes, 'haus.stl');
    ok(s);
    assert.equal(s.mesh.openEdges, 0);
    assert.ok(Math.abs(s.mesh.volume - stl.print.check.volume) < 1e-6 * Math.max(1, s.mesh.volume), `${s.mesh.volume} vs ${stl.print.check.volume}`);
    const mf = await exportModel({ name: 'Haus', cells, palette: PALETTE, view, format: '3mf', kind: 'print', blockSize: 4, print });
    const m = verify(mf.file.bytes, 'haus.3mf');
    ok(m);
    assert.equal(m.unit, 'millimeter');
    assert.equal(m.objects, 1);
    if (v.maxColors) assert.ok(m.materials <= v.maxColors, `${m.materials} colours`);
    assert.deepEqual(m.warnings, [], 'every listed material is used');
    assert.equal(Math.round(m.meshes[0].volume), Math.round(s.mesh.volume), 'same solid in STL and 3MF');
    if (lib3mfInstalled) assert.equal(m.lib3mf.meshes[0].manifoldAndOriented, true);
  }
});

test('random shapes: merged print shells stay closed and vertex-manifold in the independent check', async () => {
  for (let seed = 1; seed <= 12; seed++) {
    const m = printModel(blob(seed), PALETTE, { name: `blob${seed}`, detail: 1, blockSize: 2, unit: 'millimeter', up: 'z', smallParts: true, fill: true, hollow: 0, minPart: 0, maxColors: 0 });
    const r = verify(writeStl(m), `blob${seed}.stl`);
    ok(r);
    assert.equal(r.mesh.pinchedVertices, 0);
    ok(verify(await write3mf(m, { deflate: deflateRaw }), `blob${seed}.3mf`));
  }
});

test('OBJ zip: mtllib and face indices check out', async () => {
  const obj = await exportModel({ name: 'Haus', cells: house(), palette: PALETTE, view, format: 'obj', kind: 'view', blockSize: 1,
    print: { detail: 1, smallParts: true, fill: false, hollow: 0, minPart: 0, maxColors: 0 } });
  const r = verify(obj.file.bytes, 'haus_obj.zip');
  ok(r);
  assert.ok(r.faces > 100);
});

/** Unit cube STL from explicit triangles (outward winding), for the negative cases. */
const CUBE_TRIS = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7]];
const cubeVerts = (o = [0, 0, 0]) => [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]].map(p => p.map((c, i) => c + o[i]));
function stlOf(tris) {
  const out = new Uint8Array(84 + 50 * tris.length), dv = new DataView(out.buffer);
  dv.setUint32(80, tris.length, true);
  tris.forEach((t, i) => t.forEach((p, k) => p.forEach((c, j) => dv.setFloat32(84 + 50 * i + 12 + 12 * k + 4 * j, c, true))));
  return out;
}
const cubeTris = (o, flip = -1) => CUBE_TRIS.map((t, i) => (i === flip ? [t[0], t[2], t[1]] : t).map(k => cubeVerts(o)[k]));

test('independent check rejects open, flipped, inside-out, pinched and badly referenced meshes', async () => {
  ok(verify(stlOf(cubeTris([0, 0, 0])), 'cube.stl'));
  const open = verify(stlOf(cubeTris([0, 0, 0]).slice(1)), 'open.stl');
  assert.ok(open.errors.some(e => /offene Kanten/.test(e)), open.errors.join('; '));
  const flipped = verify(stlOf(cubeTris([0, 0, 0], 3)), 'flipped.stl');
  assert.ok(flipped.errors.some(e => /gleicher Richtung|offene Kanten/.test(e)), flipped.errors.join('; '));
  const inside = verify(stlOf(cubeTris([0, 0, 0]).map(t => [t[0], t[2], t[1]])), 'inside.stl');
  assert.ok(inside.errors.some(e => /Volumen/.test(e)), inside.errors.join('; '));
  // Two cubes touching only at one corner: closed and edge-manifold, but not vertex-manifold.
  const pinched = verify(stlOf([...cubeTris([0, 0, 0]), ...cubeTris([1, 1, 1])]), 'pinched.stl');
  assert.ok(pinched.errors.some(e => /Flächenfächern/.test(e)), pinched.errors.join('; '));

  const m = printModel(blob(3), PALETTE, { name: 'b', detail: 1, blockSize: 2, unit: 'millimeter', up: 'z', smallParts: true, fill: true, hollow: 0, minPart: 0, maxColors: 0 });
  const good = await write3mf(m);
  const files = new Map();
  const { readZip } = await import('../../../apps/web/src/blockmodels/zip.ts');
  for (const [name, data] of await readZip(good, () => true)) files.set(name, data);
  const rezip = async (patch) => {
    const model = patch(new TextDecoder().decode(files.get('3D/3dmodel.model')));
    return writeZip([...files].map(([name, data]) => ({ name, data: name === '3D/3dmodel.model' ? new TextEncoder().encode(model) : data })));
  };
  const badIndex = verify(await rezip(s => s.replace(/<triangle v1="\d+"/, '<triangle v1="999999"')), 'badindex.3mf');
  assert.ok(badIndex.errors.some(e => /Punktnummern/.test(e)), badIndex.errors.join('; '));
  const badMat = verify(await rezip(s => s.replace(/p1="\d+"/, 'p1="77"')), 'badmat.3mf');
  assert.ok(badMat.errors.some(e => /Materialverweis/.test(e)), badMat.errors.join('; '));
  const badUnit = verify(await rezip(s => s.replace('unit="millimeter"', 'unit="block"')), 'badunit.3mf');
  assert.ok(badUnit.errors.some(e => /Einheit/.test(e)), badUnit.errors.join('; '));
  const noRels = verify(await writeZip([...files].filter(([n]) => n !== '_rels/.rels').map(([name, data]) => ({ name, data }))), 'norels.3mf');
  assert.ok(noRels.errors.some(e => /\.rels fehlt/.test(e)), noRels.errors.join('; '));
});

test('glTF-Validator itself flags a broken GLB (sanity check of the tool)', async () => {
  const v = viewModel(house(), PALETTE, view.renderer, view.sprites, false, { name: 'Haus', blockSize: 1, place: 'center', bake: true });
  const good = writeGlb(v);
  // Point the first index accessor past the end of its buffer view and rebuild the container around it.
  const dv = new DataView(good.buffer, good.byteOffset), len = dv.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(good.subarray(20, 20 + len)));
  json.accessors[json.meshes[0].primitives[0].indices].count += 1000;
  const text = new TextEncoder().encode(JSON.stringify(json)), padded = Math.ceil(text.length / 4) * 4;
  const bin = good.subarray(20 + len);
  const glb = new Uint8Array(20 + padded + bin.length), out = new DataView(glb.buffer);
  glb.set(good.subarray(0, 12)); out.setUint32(8, glb.length, true);
  out.setUint32(12, padded, true); out.setUint32(16, 0x4e4f534a, true);
  glb.fill(0x20, 20, 20 + padded); glb.set(text, 20); glb.set(bin, 20 + padded);
  const issues = await gltfReport(glb);
  assert.ok(issues.numErrors > 0);
  const own = verify(glb, 'broken.glb');
  assert.ok(own.errors.some(e => /accessor/.test(e)), own.errors.join('; '));
});
