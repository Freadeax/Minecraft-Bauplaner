// MODEL-01: 3D export – view mesh (OBJ/MTL, GLB) and watertight print shell (STL, 3MF).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkClosed, createPrintGrid, fillCavities, hollowGrid, labelParts, readStl, removeSmallParts, repairGrid, reduceMaterials, shellMesh,
  writeGlb, writeObj, writeStl, write3mf, writeZip, crc32, deflateRaw, weldMesh,
} from '../dist/formats/src/index.js';
import * as formats from '../dist/formats/src/index.js';
import { exportModel as exportWith, printModel as printWith, viewModel, blockColor } from '../apps/web/src/export3d/build.ts';

const printModel = (...a) => printWith(formats, ...a);
const exportModel = (req) => exportWith(formats, req);
import { fallbackRenderer } from '../apps/web/src/blockmodels/renderers.ts';
import { solidParts } from '../apps/web/src/blockmodels/shapes.ts';
import { readZip, zipEntries } from '../apps/web/src/blockmodels/zip.ts';

const state = (id, properties = {}) => ({ id: `minecraft:${id}`, properties });
const block = (x, y, z, paletteIndex = 0) => ({ position: [x, y, z], kind: 'block', paletteIndex });
const slot = () => ({ rect: [0, 0, 1, 1], layer: 0 });
const mat = (name, color = [0.5, 0.5, 0.5]) => ({ name, color, opacity: 1, textured: false, alpha: 'opaque' });
const idx = (g, x, y, z) => (x * g.sy + y) * g.sz + z;
const shell = (g, extra = {}) => shellMesh(g, { cellSize: 1, unit: 'millimeter', up: 'y', name: 't', materials: [mat('a'), mat('b')], ...extra });

/** A room: hollow box of stone (walls 1) with an air room inside, plus one cell of window. */
function cube(n, wall = n) {
  const cells = [];
  for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) {
    const inner = x >= wall && x < n - wall && y >= wall && y < n - wall && z >= wall && z < n - wall;
    if (!inner) cells.push(block(x, y, z));
  }
  return cells;
}

test('closed check: a single cube is watertight with volume 1, an open quad is not', () => {
  const g = createPrintGrid(5, 5, 5);
  g.cells[idx(g, 2, 2, 2)] = 1;
  const m = shell(g);
  const c = checkClosed(m);
  assert.equal(c.closed, true);
  assert.equal(c.boundaryEdges, 0);
  assert.ok(Math.abs(c.volume - 1) < 1e-9, `volume ${c.volume}`);
  assert.equal(m.faces, 6);
  const open = { ...m, groups: [{ ...m.groups[0], indices: m.groups[0].indices.slice(0, 6) }] };
  assert.equal(checkClosed(open).closed, false);
  assert.ok(checkClosed(open).boundaryEdges > 0);
});

test('print shell of blocks: faces between equal neighbours are hidden, volume equals block count, Z up keeps orientation', () => {
  const cells = cube(3);
  const m = printModel(cells, [state('stone')], { name: 'Würfel', detail: 1, blockSize: 10, unit: 'millimeter', up: 'z', smallParts: true, fill: false, hollow: 0, minPart: 0, maxColors: 0 });
  assert.equal(m.report.check.closed, true);
  assert.equal(m.report.faces, 6 * 9);
  assert.ok(Math.abs(m.report.check.volume - 27 * 1000) < 1e-6);
  assert.equal(m.up, 'z');
  // Printer bed: model starts at 0/0/0.
  const all = m.groups.flatMap(g => [...g.positions]);
  assert.equal(Math.min(...all), 0);
});

test('touching only along an edge or a corner is repaired with connecting cells', () => {
  const edge = createPrintGrid(6, 6, 6);
  edge.cells[idx(edge, 2, 2, 2)] = 1; edge.cells[idx(edge, 3, 3, 2)] = 1;
  assert.equal(checkClosed(shell(edge)).closed, false, 'edge contact is not manifold');
  assert.equal(repairGrid(edge), 1);
  assert.equal(checkClosed(shell(edge)).closed, true);

  const corner = createPrintGrid(6, 6, 6);
  corner.cells[idx(corner, 2, 2, 2)] = 1; corner.cells[idx(corner, 3, 3, 3)] = 2;
  assert.equal(checkClosed(shell(corner)).closed, false, 'corner contact is not manifold');
  assert.ok(repairGrid(corner) >= 1);
  const fixed = shell(corner);
  assert.equal(checkClosed(fixed).closed, true);
  assert.equal(labelParts(corner).sizes.length, 1);

  // Checkerboard layer: many diagonal contacts at once.
  const board = createPrintGrid(10, 6, 10);
  for (let x = 2; x < 8; x++) for (let z = 2; z < 8; z++) if ((x + z) % 2 === 0) board.cells[idx(board, x, 2, z)] = 1;
  repairGrid(board);
  assert.equal(checkClosed(shell(board)).closed, true);
});

test('fill cavities closes inner rooms; hollowing keeps a closed shell with walls of the given thickness', () => {
  const room = cube(7, 1);
  const solid = printModel(room, [state('stone')], { name: 'r', detail: 1, blockSize: 1, unit: 'millimeter', up: 'y', smallParts: true, fill: true, hollow: 0, minPart: 0, maxColors: 0 });
  assert.equal(solid.report.cellsFilled, 125);
  assert.ok(Math.abs(solid.report.check.volume - 343) < 1e-6);
  assert.equal(solid.report.check.closed, true);
  const open = printModel(room, [state('stone')], { name: 'r', detail: 1, blockSize: 1, unit: 'millimeter', up: 'y', smallParts: true, fill: false, hollow: 0, minPart: 0, maxColors: 0 });
  assert.ok(Math.abs(open.report.check.volume - (343 - 125)) < 1e-6, 'inner room is a void (inward shell)');
  assert.equal(open.report.check.closed, true);

  const g = createPrintGrid(12, 12, 12);
  for (let x = 2; x < 10; x++) for (let y = 2; y < 10; y++) for (let z = 2; z < 10; z++) g.cells[idx(g, x, y, z)] = 1;
  const removed = hollowGrid(g, 2);
  assert.equal(removed, 4 ** 3);
  const c = checkClosed(shell(g));
  assert.equal(c.closed, true);
  assert.ok(Math.abs(c.volume - (512 - 64)) < 1e-6);
  assert.equal(fillCavities(g), 64, 'fill brings the hollow back');
});

test('small loose parts are removed, the largest stays; colours reduce to the most used', () => {
  const g = createPrintGrid(12, 6, 12);
  for (let x = 2; x < 8; x++) for (let z = 2; z < 8; z++) g.cells[idx(g, x, 2, z)] = 1;
  g.cells[idx(g, 10, 2, 10)] = 2;
  assert.deepEqual(removeSmallParts(g, 2), { removedParts: 1, removedCells: 1 });
  assert.equal(labelParts(g).sizes.length, 1);
  const h = createPrintGrid(8, 4, 4);
  for (let x = 1; x < 7; x++) h.cells[idx(h, x, 1, 1)] = x < 4 ? 1 : x < 5 ? 2 : 3;
  const r = reduceMaterials(h, [[1, 0, 0], [0.9, 0.1, 0], [0, 0, 1]], 2);
  assert.equal(r.kept, 2);
  assert.equal(r.map[2], 1, 'orange-ish joins red');
  assert.equal(r.map[3], 3, 'blue stays');
});

test('own block shapes give solid parts: slab, stairs, wall post, door; plants and rails have none', () => {
  assert.deepEqual(solidParts('minecraft:stone', {}), [[0, 0, 0, 1, 1, 1]]);
  assert.deepEqual(solidParts('minecraft:oak_slab', { type: 'top' }), [[0, 0.5, 0, 1, 1, 1]]);
  assert.equal(solidParts('minecraft:oak_stairs', { facing: 'east', half: 'bottom', shape: 'straight' }).length, 2);
  const door = solidParts('minecraft:oak_door', { facing: 'north', open: 'false', half: 'lower', hinge: 'left' });
  assert.deepEqual(door, [[0, 0, 0.8125, 1, 1, 1]]);
  const east = solidParts('minecraft:oak_door', { facing: 'east', open: 'false', half: 'lower', hinge: 'left' })[0];
  assert.ok(east[3] - east[0] < 0.2 && east[5] - east[2] === 1, 'door turned to the east is thin along X');
  assert.deepEqual(solidParts('minecraft:poppy', {}), []);
  assert.deepEqual(solidParts('minecraft:rail', { shape: 'north_south' }), []);
  assert.ok(solidParts('minecraft:cobblestone_wall', { up: 'true', north: 'low', east: 'none', south: 'none', west: 'none' }).length === 2);
});

test('print detail: a bottom slab at detail 2 fills half the block, stairs 3/4; small parts follow the switch', () => {
  const opt = { name: 's', blockSize: 2, unit: 'millimeter', up: 'z', smallParts: false, fill: false, hollow: 0, minPart: 0, maxColors: 0 };
  const slab = printModel([block(0, 0, 0)], [state('stone_slab', { type: 'bottom' })], { ...opt, detail: 2 });
  assert.ok(Math.abs(slab.report.check.volume - 4) < 1e-6, `slab ${slab.report.check.volume}`);
  const stairs = printModel([block(0, 0, 0)], [state('stone_stairs', { facing: 'north', half: 'bottom', shape: 'straight' })], { ...opt, detail: 2 });
  assert.ok(Math.abs(stairs.report.check.volume - 6) < 1e-6);
  assert.equal(stairs.report.check.closed, true);
  // Torch next to a block: dropped without small parts, kept (one cell column) with them.
  const cells = [block(0, 0, 0, 0), block(1, 0, 0, 1)], pal = [state('stone'), state('torch')];
  assert.equal(printModel(cells, pal, { ...opt, detail: 4 }).report.skipped, 1);
  const keep = printModel(cells, pal, { ...opt, detail: 4, smallParts: true });
  assert.equal(keep.report.skipped, 0);
  assert.equal(keep.report.check.closed, true);
  assert.throws(() => printModel([block(0, 0, 0)], [state('poppy')], { ...opt, detail: 1 }), /druckbares Volumen/);
  assert.throws(() => printModel([block(0, 0, 0)], [state('water')], { ...opt, detail: 1 }), /druckbares Volumen/);
});

test('a real-ish house (walls, stairs roof, fence, door, glass) prints watertight at every detail', () => {
  const pal = [state('oak_planks'), state('oak_stairs', { facing: 'north', half: 'bottom', shape: 'straight' }), state('oak_stairs', { facing: 'south', half: 'bottom', shape: 'straight' }),
    state('oak_fence', { north: 'false', south: 'false', east: 'true', west: 'true', waterlogged: 'false' }), state('oak_door', { facing: 'south', half: 'lower', open: 'false', hinge: 'left', powered: 'false' }),
    state('glass'), state('torch'), state('poppy')];
  const cells = [];
  for (let x = 0; x < 6; x++) for (let z = 0; z < 6; z++) for (let y = 0; y < 4; y++) {
    const wall = x === 0 || x === 5 || z === 0 || z === 5;
    if (y === 0 || wall) cells.push(block(x, y, z, y === 2 && wall && (x === 2 || z === 2) ? 5 : y === 1 && x === 2 && z === 5 ? 4 : 0));
  }
  for (let x = 0; x < 6; x++) { cells.push(block(x, 4, 0, 1)); cells.push(block(x, 4, 5, 2)); for (let z = 1; z < 5; z++) cells.push(block(x, 4, z, 0)); }
  for (let x = 6; x < 10; x++) cells.push(block(x, 0, 2, 3));
  cells.push(block(2, 1, 2, 6), block(3, 1, 3, 7));
  for (const detail of [1, 2, 4]) for (const fill of [false, true]) {
    const m = printModel(cells, pal, { name: 'Haus', detail, blockSize: 4, unit: 'millimeter', up: 'z', smallParts: true, fill, hollow: 0, minPart: 0, maxColors: 0 });
    assert.equal(m.report.check.closed, true, `detail ${detail} fill ${fill}: ${JSON.stringify(m.report.check)}`);
    assert.ok(m.report.check.volume > 0);
  }
  const hollow = printModel(cells, pal, { name: 'Haus', detail: 4, blockSize: 4, unit: 'millimeter', up: 'z', smallParts: true, fill: true, hollow: 2, minPart: 0, maxColors: 3 });
  assert.equal(hollow.report.check.closed, true);
  assert.ok(hollow.report.cellsHollowed > 0);
  assert.ok(hollow.report.colors <= 3);
});

test('view mesh: same quads as the viewer, materials per colour, glass separate, bake darkens corners', () => {
  const r = fallbackRenderer();
  const cells = [block(0, 0, 0, 0), block(1, 0, 0, 0), block(0, 1, 0, 1)];
  const pal = [state('stone'), state('glass')];
  const v = viewModel(cells, pal, r, slot, false, { name: 'v', blockSize: 1, place: 'center', bake: false });
  const tris = v.groups.reduce((s, g) => s + g.indices.length / 3, 0);
  assert.equal(tris, 2 * (10 + 5), 'two stones share a face, glass hides its bottom against stone? no – 5 visible glass faces');
  assert.ok(v.materials.some(m => m.alpha === 'blend' && m.name.startsWith('glas_')));
  assert.equal(v.groups.every(g => g.colors === null), true);
  // Centered bottom: x from −1 to 1, y from 0.
  const xs = v.groups.flatMap(g => [...g.positions].filter((_, i) => i % 3 === 0)), ys = v.groups.flatMap(g => [...g.positions].filter((_, i) => i % 3 === 1));
  assert.equal(Math.min(...xs), -1); assert.equal(Math.max(...xs), 1); assert.equal(Math.min(...ys), 0);
  const baked = viewModel([block(0, 0, 0), block(1, 0, 0), block(0, 0, 1), block(0, 1, 1)], [state('stone')], r, slot, false, { name: 'b', blockSize: 1, place: 'world', bake: true });
  const cs = baked.groups.flatMap(g => [...g.colors]);
  const base = blockColor('minecraft:stone')[0];
  assert.ok(cs.some(c => c < base * 0.5), 'corner shading and face brightness are baked in');
});

test('OBJ/MTL: indices, colours, texture references and vertex count roundtrip', () => {
  const r = fallbackRenderer();
  const v = viewModel([block(0, 0, 0), block(0, 1, 0, 1)], [state('stone'), state('oak_leaves', { persistent: 'true', distance: '1', waterlogged: 'false' })], r, slot, true, { name: 'Baum', blockSize: 1, place: 'center', bake: true });
  const { obj, mtl } = writeObj(v, { mtlFile: 'baum.mtl', textureFile: 'baum.png', comment: ['Test'] });
  const text = new TextDecoder().decode(obj), m = new TextDecoder().decode(mtl);
  const vs = text.split('\n').filter(l => l.startsWith('v ')), fs = text.split('\n').filter(l => l.startsWith('f '));
  assert.equal(vs.length, v.groups.reduce((s, g) => s + g.positions.length / 3, 0));
  assert.equal(fs.length, v.groups.reduce((s, g) => s + g.indices.length / 3, 0));
  assert.equal(vs[0].split(' ').length, 7, 'v x y z r g b');
  assert.match(text, /^mtllib baum\.mtl$/m);
  const maxRef = Math.max(...fs.flatMap(l => l.slice(2).split(' ').map(t => Number(t.split('/')[0]))));
  assert.equal(maxRef, vs.length);
  assert.match(m, /map_Kd baum\.png/);
  for (const mt of v.materials) assert.match(m, new RegExp(`newmtl ${mt.name}`));
});

test('GLB: valid header, chunks, accessors with bounds, embedded texture, Y up only', () => {
  const r = fallbackRenderer();
  const v = viewModel([block(0, 0, 0), block(0, 0, 1, 1)], [state('stone'), state('glass')], r, slot, true, { name: 'G', blockSize: 0.5, place: 'center', bake: false });
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
  const glb = writeGlb(v, { texturePng: png });
  const dv = new DataView(glb.buffer);
  assert.equal(dv.getUint32(0, true), 0x46546c67);
  assert.equal(dv.getUint32(8, true), glb.length);
  const jsonLen = dv.getUint32(12, true);
  assert.equal(jsonLen % 4, 0);
  const json = JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + jsonLen)));
  const binLen = dv.getUint32(20 + jsonLen, true);
  assert.equal(dv.getUint32(24 + jsonLen, true), 0x004e4942);
  assert.equal(json.buffers[0].byteLength, binLen);
  assert.equal(json.meshes[0].primitives.length, v.groups.length);
  for (const p of json.meshes[0].primitives) {
    const pos = json.accessors[p.attributes.POSITION];
    assert.ok(pos.min && pos.max);
    assert.ok(p.attributes.TEXCOORD_0 !== undefined);
    const ix = json.accessors[p.indices];
    const bv = json.bufferViews[ix.bufferView];
    assert.ok(bv.byteOffset + bv.byteLength <= binLen);
    assert.equal(bv.byteOffset % 4, 0);
  }
  assert.equal(json.images[0].mimeType, 'image/png');
  const img = json.bufferViews[json.images[0].bufferView];
  assert.deepEqual([...glb.subarray(28 + jsonLen + img.byteOffset, 28 + jsonLen + img.byteOffset + png.length)], [...png]);
  assert.ok(json.materials.some(m => m.alphaMode === 'BLEND'));
  assert.equal(json.samplers[0].magFilter, 9728);
  const print = printModel([block(0, 0, 0)], [state('stone')], { name: 'p', detail: 1, blockSize: 1, unit: 'millimeter', up: 'z', smallParts: true, fill: false, hollow: 0, minPart: 0, maxColors: 0 });
  assert.throws(() => writeGlb(print), /Y nach oben/);
});

test('STL binary roundtrip keeps triangles and outward normals', () => {
  const m = printModel(cube(2), [state('stone')], { name: 'w', detail: 1, blockSize: 5, unit: 'millimeter', up: 'z', smallParts: true, fill: false, hollow: 0, minPart: 0, maxColors: 0 });
  const stl = writeStl(m);
  const back = readStl(stl);
  assert.equal(back.triangles, m.report.faces * 2);
  assert.equal(new TextDecoder().decode(stl.subarray(0, 5)) === 'solid', false, 'binary STL must not start with "solid"');
  // Normals point away from the centre (5 mm × 2 blocks = 10 mm cube from 0..10).
  for (let t = 0; t < back.triangles; t++) {
    const cx = (back.positions[t * 9] + back.positions[t * 9 + 3] + back.positions[t * 9 + 6]) / 3 - 5;
    const cy = (back.positions[t * 9 + 1] + back.positions[t * 9 + 4] + back.positions[t * 9 + 7]) / 3 - 5;
    const cz = (back.positions[t * 9 + 2] + back.positions[t * 9 + 5] + back.positions[t * 9 + 8]) / 3 - 5;
    assert.ok(cx * back.normals[t * 3] + cy * back.normals[t * 3 + 1] + cz * back.normals[t * 3 + 2] > 0);
  }
});

test('ZIP writer: CRC, stored and deflated entries read back with the app zip reader', async () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  const big = new TextEncoder().encode('Minecraft '.repeat(1000));
  const zip = await writeZip([{ name: 'a.txt', data: new Uint8Array([1, 2, 3]) }, { name: 'ordner/b.txt', data: big }], { deflate: deflateRaw });
  const entries = zipEntries(zip);
  assert.deepEqual(entries.map(e => [e.name, e.method]), [['a.txt', 0], ['ordner/b.txt', 8]]);
  const files = await readZip(zip, () => true);
  assert.deepEqual([...files.get('a.txt')], [1, 2, 3]);
  assert.deepEqual(files.get('ordner/b.txt'), big);
});

test('3MF: package parts, unit, materials and welded closed mesh', async () => {
  const pal = [state('stone'), state('red_wool')];
  const cells = [...cube(2).map(c => ({ ...c })), block(2, 0, 0, 1)];
  const m = printModel(cells, pal, { name: 'Zwei Farben', detail: 1, blockSize: 8, unit: 'millimeter', up: 'z', smallParts: true, fill: false, hollow: 0, minPart: 0, maxColors: 0 });
  const bytes = await write3mf(m, { title: 'Zwei Farben & mehr', deflate: deflateRaw });
  const files = await readZip(bytes, () => true);
  assert.ok(files.has('[Content_Types].xml') && files.has('_rels/.rels') && files.has('3D/3dmodel.model'));
  const model = new TextDecoder().decode(files.get('3D/3dmodel.model'));
  assert.match(model, /unit="millimeter"/);
  assert.match(model, /Zwei Farben &amp; mehr/);
  assert.equal((model.match(/<base /g) ?? []).length, 2);
  const w = weldMesh(m);
  assert.equal((model.match(/<vertex /g) ?? []).length, w.positions.length / 3);
  assert.equal((model.match(/<triangle /g) ?? []).length, w.triangles.length / 3);
  assert.match(model, /p1="1"/, 'wool triangles use the second material');
  assert.equal(checkClosed(w).closed, true);
});

test('exportModel: file names, units, print formats force the print shell, OBJ is a zip', async () => {
  const r = fallbackRenderer();
  const common = { name: 'Mein Haus', cells: cube(3), palette: [state('stone')], view: { renderer: r, sprites: slot, textured: false, place: 'center', bake: true },
    print: { detail: 2, smallParts: false, fill: true, hollow: 0, minPart: 0, maxColors: 0 } };
  const stl = await exportModel({ ...common, format: 'stl', kind: 'view', blockSize: 2 });
  assert.equal(stl.file.name, 'Mein_Haus.stl'); assert.equal(stl.unit, 'millimeter'); assert.ok(stl.print?.check.closed);
  assert.ok(Math.abs(stl.stats.max[0] - 6) < 1e-6, '3 blocks × 2 mm');
  const glb = await exportModel({ ...common, format: 'glb', kind: 'view', blockSize: 1 });
  assert.equal(glb.file.name, 'Mein_Haus.glb'); assert.equal(glb.print, null); assert.equal(glb.unit, 'meter');
  const obj = await exportModel({ ...common, format: 'obj', kind: 'print', blockSize: 1 });
  assert.equal(obj.file.name, 'Mein_Haus_obj.zip');
  const files = await readZip(obj.file.bytes, () => true);
  assert.deepEqual([...files.keys()].sort(), ['Mein_Haus.mtl', 'Mein_Haus.obj']);
  const mf = await exportModel({ ...common, format: '3mf', kind: 'view', blockSize: 2 });
  assert.equal(mf.file.name, 'Mein_Haus.3mf');
});
