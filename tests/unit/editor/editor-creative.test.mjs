// EDIT-04: Symmetrie, Kurven, Naturwerkzeuge, Oberflächenmaske, Farbpaletten, Bild → Blöcke.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transformBlockState, stateRuleFor } from '../../../dist/voxel/src/index.js';
import {
  createDraft, applyEdit, blockValue, boxEdit, cellAt, setCells, lineEdit, posKey,
  NO_SYMMETRY, symmetryGroup, symmetryImage, symmetricEdit, validateSymmetry, centreOf, symmetryLabel,
  curveCells, curveEdit, curveLength,
  erodeEdit, dilateEdit, smoothEdit, overlayEdit, naturalizeEdit, surfaceCells, paintSurfaceEdit,
  hexToRgb, rgbToHex, rgbToLab, deltaE, similarBlocks, colorGradient, imageToBlocks,
} from '../../../dist/domain/src/index.js';

const P = 'mc-java-26.3';
const st = (id, properties = {}) => ({ id: `minecraft:${id}`, properties });
const B = (id, properties) => blockValue(st(id, properties));
const schemaOf = id => stateRuleFor(id)?.schema;
const keys = edit => new Set(edit.changes.map(c => posKey(c.position)));
const N6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
/** Face-connected? (BFS over the cell set) */
function connected(cells) {
  const set = new Set(cells.map(posKey)), start = cells[0], seen = new Set([posKey(start)]), queue = [start];
  while (queue.length) { const p = queue.pop(); for (const d of N6) { const k = posKey([p[0] + d[0], p[1] + d[1], p[2] + d[2]]); if (set.has(k) && !seen.has(k)) { seen.add(k); queue.push(k.split(',').map(Number)); } } }
  return seen.size === set.size;
}
const draftOf = edits => { let d = createDraft(null, P); for (const e of edits) d = applyEdit(d, e).draft; return d; };

// ---------------------------------------------------------------- symmetry

test('symmetry group sizes: mirrors, rotations and the dihedral group', () => {
  const s = (o) => ({ ...NO_SYMMETRY, centre2: [0, 0], ...o });
  assert.equal(symmetryGroup(s({})).length, 1);
  assert.equal(symmetryGroup(s({ mirrorX: true })).length, 2);
  assert.equal(symmetryGroup(s({ mirrorX: true, mirrorZ: true })).length, 4);
  assert.equal(symmetryGroup(s({ rotate: 2 })).length, 2);
  assert.equal(symmetryGroup(s({ rotate: 4 })).length, 4);
  assert.equal(symmetryGroup(s({ rotate: 4, mirrorX: true })).length, 8);
  assert.throws(() => validateSymmetry(s({ rotate: 4, centre2: [1, 0] })), /gleich liegen/);
});

test('mirror images: across a cell centre and across a cell border', () => {
  const T = { quarterTurns: 0, mirrorX: true };
  // Axis through cell centre x = 5 (centre2 10): 3 ↔ 7, 5 stays.
  assert.deepEqual(symmetryImage([3, 4, 9], T, { ...NO_SYMMETRY, centre2: [10, 0] }), [7, 4, 9]);
  assert.deepEqual(symmetryImage([5, 4, 9], T, { ...NO_SYMMETRY, centre2: [10, 0] }), [5, 4, 9]);
  // Axis on the border between 4 and 5 (centre2 9): 4 ↔ 5, 0 ↔ 9.
  assert.deepEqual(symmetryImage([4, 0, 0], T, { ...NO_SYMMETRY, centre2: [9, 0] }), [5, 0, 0]);
  assert.deepEqual(symmetryImage([0, 0, 0], T, { ...NO_SYMMETRY, centre2: [9, 0] }), [9, 0, 0]);
  // Z mirror is (mirrorX, two quarter turns).
  assert.deepEqual(symmetryImage([2, 1, 3], { quarterTurns: 2, mirrorX: true }, { ...NO_SYMMETRY, centre2: [0, 10] }), [2, 1, 7]);
});

test('4-fold rotation: 4 images of a cell lie on the same circle, four steps return the cell', () => {
  const s = { ...NO_SYMMETRY, rotate: 4, centre2: [9, 9] }; // axis at the corner between cells
  const q = { quarterTurns: 1, mirrorX: false };
  let p = [7, 2, 4];
  const seen = [];
  for (let i = 0; i < 4; i++) { seen.push(posKey(p)); p = symmetryImage(p, q, s); }
  assert.deepEqual(p, [7, 2, 4]);
  assert.equal(new Set(seen).size, 4);
  const r = seen.map(k => k.split(',').map(Number)).map(([x, , z]) => (2 * x + 1 - 10) ** 2 + (2 * z + 1 - 10) ** 2);
  assert.ok(r.every(v => v === r[0]));
});

test('symmetricEdit turns block states with the core rule; direct edits win; images deduplicated', () => {
  const stair = B('oak_stairs', { facing: 'east', half: 'bottom', shape: 'straight', waterlogged: 'false' });
  const s = { ...NO_SYMMETRY, mirrorX: true, centre2: [10, 0] };
  const r = symmetricEdit(setCells([[2, 0, 0], [5, 0, 0]], stair, 'Setzen'), s);
  assert.equal(r.images, 2);
  // [5,0,0] lies on the axis: its image is itself and the direct edit is kept.
  assert.equal(r.edit.changes.length, 3);
  const img = r.edit.changes.find(c => c.position[0] === 8);
  assert.equal(img.value.state.properties.facing, 'west');
  assert.deepEqual(img.value.state, transformBlockState(stair.state, { quarterTurns: 0, mirrorX: true, position: [0, 0, 0] }).state);
  // Originals come last, so they win on applyEdit.
  assert.deepEqual(r.edit.changes.at(-1).position, [5, 0, 0]);
  assert.deepEqual(r.unresolved, []);
  assert.match(symmetryLabel(s), /Ost\/West · Achse X 5/);
});

test('symmetricEdit with 4-fold rotation: a stair facing outwards faces outwards on every side', () => {
  const s = { ...NO_SYMMETRY, rotate: 4, centre2: centreOf([0, 0, 0], [10, 0, 10]) }; // axis at cell 5,5
  const r = symmetricEdit(setCells([[5, 0, 0]], B('stone_brick_stairs', { facing: 'north', half: 'bottom', shape: 'straight', waterlogged: 'false' }), 'x'), s);
  const byPos = Object.fromEntries(r.edit.changes.map(c => [posKey(c.position), c.value.state.properties.facing]));
  assert.deepEqual(byPos, { '5,0,0': 'north', '10,0,5': 'east', '5,0,10': 'south', '0,0,5': 'west' });
});

test('symmetricEdit: unresolvable states are reported, not silently changed', () => {
  const mod = { kind: 'block', state: { id: 'somemod:thing', properties: { facing: 'north' } } };
  const r = symmetricEdit(setCells([[1, 0, 0]], mod, 'x'), { ...NO_SYMMETRY, mirrorX: true, centre2: [0, 0] });
  assert.deepEqual(r.unresolved, ['somemod:thing']);
  assert.equal(r.edit.changes.length, 2);
});

// ---------------------------------------------------------------- curves

test('curve through points passes every control point and is face-connected', () => {
  const pts = [[0, 0, 0], [10, 0, 6], [20, 3, 0], [28, 3, 12]];
  const cells = curveCells(pts, { profile: 'tube', radius: 0 });
  const set = new Set(cells.map(posKey));
  for (const p of pts) assert.ok(set.has(posKey(p)), `Punkt ${p}`);
  assert.ok(connected(cells));
  assert.ok(curveLength(pts) > 30);
});

test('road profile: band of the given width, flat, connected, no holes across', () => {
  const cells = curveCells([[0, 5, 0], [12, 5, 12], [24, 5, 0]], { profile: 'road', width: 3 });
  assert.ok(cells.every(c => c[1] === 5));
  assert.ok(connected(cells));
  // A straight road along X of width 3 has exactly 3 cells per column.
  const straight = curveCells([[0, 0, 0], [9, 0, 0]], { profile: 'road', width: 3 });
  assert.equal(straight.length, 30);
  assert.deepEqual([...new Set(straight.map(c => c[2]))].sort((a, b) => a - b), [-1, 0, 1]);
});

test('wall profile raises the band; closed curve forms a ring', () => {
  const wall = curveCells([[0, 0, 0], [8, 0, 0]], { profile: 'wall', width: 1, height: 4 });
  assert.equal(wall.length, 9 * 4);
  const ring = curveCells([[0, 0, 0], [10, 0, 0], [10, 0, 10], [0, 0, 10]], { profile: 'tube', radius: 0, closed: true });
  assert.ok(connected(ring));
  // Every cell of a closed ring has at least two path neighbours (no loose ends).
  const set = new Set(ring.map(posKey));
  for (const p of ring) assert.ok(N6.filter(d => set.has(posKey([p[0] + d[0], p[1] + d[1], p[2] + d[2]]))).length >= 2, posKey(p));
  assert.throws(() => curveEdit([[0, 0, 0]], B('stone'), { profile: 'tube' }), /mindestens zwei/);
});

// ---------------------------------------------------------------- sculpt

test('erode removes exposed corners, dilate fills a notch with the surrounding block', () => {
  const box = { a: [0, 0, 0], b: [4, 4, 4] };
  const d = draftOf([boxEdit(box, 'fill', B('stone'))]);
  const e = erodeEdit(d, box, { faces: 3 });
  assert.equal(e.changes.length, 8); // the eight corners have three open faces
  assert.ok(e.changes.every(c => c.value === null));
  const notched = applyEdit(d, setCells([[2, 2, 0]], null, 'x')).draft;
  const f = dilateEdit(notched, box, { neighbours: 4 });
  assert.equal(f.changes.length, 1);
  assert.deepEqual(f.changes[0].position, [2, 2, 0]);
  assert.equal(f.changes[0].value.state.id, 'minecraft:stone');
});

test('smooth flattens a spike and fills a pit, keeping grass on top', () => {
  const box = { a: [0, 0, 0], b: [6, 6, 6] };
  const ground = [boxEdit({ a: [0, 0, 0], b: [6, 1, 6] }, 'fill', B('dirt')), boxEdit({ a: [0, 2, 0], b: [6, 2, 6] }, 'fill', B('grass_block', { snowy: 'false' }))];
  const spike = setCells([[3, 3, 3], [3, 4, 3], [3, 5, 3], [3, 6, 3]], B('grass_block', { snowy: 'false' }), 'Spitze');
  const d = draftOf([...ground, spike]);
  const s = smoothEdit(d, box, { iterations: 2 });
  const after = applyEdit(d, s).draft;
  assert.equal(cellAt(after, [3, 6, 3]), null);
  // Column top is lower than before and still grass.
  let top = 6; while (top >= 0 && cellAt(after, [3, top, 3])?.kind !== 'block') top--;
  assert.ok(top < 6 && top >= 2, `top ${top}`);
  assert.equal(cellAt(after, [3, top, 3]).state.id, 'minecraft:grass_block');
  // A pit is filled: grass on top, dirt below.
  const pit = draftOf([...ground, setCells([[3, 2, 3], [3, 1, 3]], null, 'Grube')]);
  const filled = applyEdit(pit, smoothEdit(pit, box, { iterations: 1 })).draft;
  assert.equal(cellAt(filled, [3, 2, 3])?.state.id, 'minecraft:grass_block');
});

test('overlay: snow layer on top only on grass; replace mode keeps properties', () => {
  const box = { a: [0, 0, 0], b: [3, 4, 0] };
  const d = draftOf([boxEdit({ a: [0, 0, 0], b: [1, 0, 0] }, 'fill', B('grass_block', { snowy: 'false' })), boxEdit({ a: [2, 0, 0], b: [3, 0, 0] }, 'fill', B('stone'))]);
  const snow = overlayEdit(d, box, { kind: 'single', value: B('snow', { layers: '1' }) }, { mode: 'above', onlyOn: ['minecraft:grass_block'] });
  assert.deepEqual(snow.changes.map(c => c.position), [[0, 1, 0], [1, 1, 0]]);
  const stairs = draftOf([setCells([[0, 0, 0]], B('oak_stairs', { facing: 'east', half: 'bottom', shape: 'straight', waterlogged: 'false' }), 'x')]);
  const r = overlayEdit(stairs, { a: [0, 0, 0], b: [0, 0, 0] }, { kind: 'single', value: B('spruce_stairs', { facing: 'north', half: 'bottom', shape: 'straight', waterlogged: 'false' }) }, { mode: 'replace' }, schemaOf);
  assert.equal(r.changes[0].value.state.properties.facing, 'east');
});

test('naturalize: grass, three dirt, then stone; buildings are left alone', () => {
  const box = { a: [0, 0, 0], b: [0, 7, 0] };
  const d = draftOf([boxEdit({ a: [0, 0, 0], b: [0, 6, 0] }, 'fill', B('stone')), setCells([[0, 7, 0]], B('oak_planks'), 'Haus')]);
  const after = applyEdit(d, naturalizeEdit(d, { a: [0, 0, 0], b: [0, 7, 0] })).draft;
  assert.equal(cellAt(after, [0, 7, 0]).state.id, 'minecraft:oak_planks');
  const free = draftOf([boxEdit({ a: [0, 0, 0], b: [0, 6, 0] }, 'fill', B('stone'))]);
  const nat = applyEdit(free, naturalizeEdit(free, box)).draft;
  const col = [6, 5, 4, 3, 2].map(y => cellAt(nat, [0, y, 0]).state.id.slice(10));
  assert.deepEqual(col, ['grass_block', 'dirt', 'dirt', 'dirt', 'stone']);
});

test('surface mask: only the visible skin is painted; facades exclude the roof-only cells', () => {
  const box = { a: [0, 0, 0], b: [4, 4, 4] };
  const d = draftOf([boxEdit(box, 'fill', B('stone'))]);
  assert.equal(surfaceCells(d, box).length, 125 - 27);
  assert.equal(surfaceCells(d, box, 'top').length, 25);
  const sides = surfaceCells(d, box, 'sides');
  assert.equal(sides.length, 5 * 16);
  const moss = paintSurfaceEdit(d, box, { kind: 'single', value: B('mossy_cobblestone') }, 'all');
  assert.equal(moss.changes.length, 98);
  assert.ok(!keys(moss).has('2,2,2'));
});

// ---------------------------------------------------------------- colours

const C = (id, hex, top = hex) => ({ id: `minecraft:${id}`, side: hexToRgb(hex), top: hexToRgb(top) });
const WOOL = [C('white_wool', '#e9ecec'), C('light_gray_wool', '#8e8e86'), C('gray_wool', '#3e4447'), C('black_wool', '#141519'), C('red_wool', '#a12722'), C('orange_wool', '#f07613'), C('yellow_wool', '#f9c628'), C('blue_wool', '#35399d')];

test('Lab: black/white extremes, ΔE symmetric; hex round trip', () => {
  assert.ok(Math.abs(rgbToLab([0, 0, 0])[0]) < 1e-6);
  assert.ok(Math.abs(rgbToLab([255, 255, 255])[0] - 100) < 0.01);
  assert.equal(deltaE(rgbToLab([10, 20, 30]), rgbToLab([30, 20, 10])), deltaE(rgbToLab([30, 20, 10]), rgbToLab([10, 20, 30])));
  assert.equal(rgbToHex(hexToRgb('#a12722')), '#a12722');
});

test('similar blocks and a grey gradient chosen by colour', () => {
  assert.equal(similarBlocks([240, 240, 240], WOOL, 1)[0].candidate.id, 'minecraft:white_wool');
  const g = colorGradient(WOOL[0], WOOL[3], 4, WOOL).map(c => c.id.slice(10));
  assert.deepEqual(g, ['white_wool', 'light_gray_wool', 'gray_wool', 'black_wool']);
  const twice = colorGradient(WOOL[0], WOOL[3], 6, WOOL).map(c => c.id);
  assert.equal(new Set(twice).size, twice.length, 'no block twice');
});

test('image → blocks: orientation, transparency, nearest colour, dithering deterministic', () => {
  // 2×2: red, yellow / transparent, blue
  const data = [161, 39, 34, 255, 249, 198, 40, 255, 0, 0, 0, 0, 53, 57, 157, 255];
  const wall = imageToBlocks({ width: 2, height: 2, data }, WOOL, { orientation: 'wall-x', origin: [10, 64, 3] });
  const at = Object.fromEntries(wall.edit.changes.map(c => [posKey(c.position), c.value.state.id.slice(10)]));
  assert.deepEqual(at, { '10,65,3': 'red_wool', '11,65,3': 'yellow_wool', '11,64,3': 'blue_wool' });
  const floor = imageToBlocks({ width: 2, height: 2, data }, WOOL, { orientation: 'floor', origin: [0, 0, 0] });
  assert.deepEqual(floor.edit.changes.map(c => c.position), [[0, 0, 0], [1, 0, 0], [1, 0, 1]]);
  // A mid-grey field dithers between neighbours, reproducibly.
  const grey = { width: 16, height: 16, data: Array.from({ length: 256 }, () => [100, 100, 100, 255]).flat() };
  const a = imageToBlocks(grey, WOOL, { orientation: 'floor', origin: [0, 0, 0], dither: true });
  const b = imageToBlocks(grey, WOOL, { orientation: 'floor', origin: [0, 0, 0], dither: true });
  assert.deepEqual(a.edit, b.edit);
  assert.ok(a.counts.length >= 2);
  assert.throws(() => imageToBlocks({ width: 300, height: 2, data: [] }, WOOL, { orientation: 'floor', origin: [0, 0, 0] }), /höchstens 256/);
});

test('symmetry combines with curves: a mirrored road is one edit', () => {
  const road = curveEdit([[0, 0, 0], [6, 0, 6]], B('dirt_path'), { profile: 'road', width: 3 });
  const r = symmetricEdit(road, { ...NO_SYMMETRY, mirrorX: true, centre2: [20, 0] });
  assert.ok(r.edit.changes.length >= road.changes.length * 2 - 3);
  assert.ok(r.edit.changes.some(c => c.position[0] === 20 - 6));
  const line = symmetricEdit(lineEdit([0, 0, 0], [3, 0, 0], B('stone')), { ...NO_SYMMETRY, rotate: 2, centre2: [0, 0] });
  assert.ok(keys(line.edit).has('-3,0,0'));
});
