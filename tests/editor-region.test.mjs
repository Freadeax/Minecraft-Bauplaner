// EDIT-05: Zauberauswahl, Zellauswahl-Operationen, Stapeln, Extrudieren, Ellipsoid/Torus/Wendel, Entities ziehen mit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeArmorStand, makePainting, entityAnchor, entityFacing, entityYaw } from '../dist/voxel/src/index.js';
import {
  createDraft, applyEdit, blockValue, boxEdit, cellAt, setCells, posKey, keyPos, draftEntries, undoEdit, executeEdit, EMPTY_DRAFT_HISTORY,
  blockFamily, magicSelect, regionBounds, boxRegion, growRegion, shrinkRegion, fitBox, resizeBox, clipEdit,
  copyRegion, clearRegionEdit, clearBoxEdit, fillRegionEdit, moveRegionEdit, stackEdit, extrudeEdit,
  ellipsoidEdit, torusEdit, helixEdit, moveBoxEdit, copyBox, transformClipboard, pasteEdit, draftFromClipboard,
} from '../dist/domain/src/index.js';

const P = 'mc-java-26.3';
const st = (id, properties = {}) => ({ id: `minecraft:${id}`, properties });
const B = (id, properties) => blockValue(st(id, properties));
const draftOf = edits => { let d = createDraft(null, P); for (const e of edits) d = applyEdit(d, e).draft; return d; };
const keys = edit => new Set(edit.changes.map(c => posKey(c.position)));
const N6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
function connected(cells) {
  const set = new Set(cells.map(posKey)), seen = new Set([posKey(cells[0])]), queue = [cells[0]];
  while (queue.length) { const p = queue.pop(); for (const d of N6) { const k = posKey([p[0] + d[0], p[1] + d[1], p[2] + d[2]]); if (set.has(k) && !seen.has(k)) { seen.add(k); queue.push(keyPos(k)); } } }
  return seen.size === set.size;
}

// ---------------------------------------------------------------- magic select

test('blockFamily groups the shapes of one material', () => {
  assert.equal(blockFamily('minecraft:oak_planks'), 'minecraft:oak');
  assert.equal(blockFamily('minecraft:oak_stairs'), 'minecraft:oak');
  assert.equal(blockFamily('minecraft:stripped_oak_log'), 'minecraft:oak');
  assert.equal(blockFamily('minecraft:stone_bricks'), 'minecraft:stone_brick');
  assert.equal(blockFamily('minecraft:stone_brick_wall'), 'minecraft:stone_brick');
  assert.equal(blockFamily('minecraft:white_stained_glass_pane'), 'minecraft:white_stained_glass');
  assert.equal(blockFamily('minecraft:stone'), 'minecraft:stone');
  assert.notEqual(blockFamily('minecraft:spruce_planks'), blockFamily('minecraft:oak_planks'));
});

test('magic select: connected cells by state, block, family and solid', () => {
  // Row x 0..5 at y 0: stone, stone, oak_planks, oak_stairs[north], oak_stairs[east], stone; plus a separate stone at x 8.
  const d = draftOf([
    setCells([[0, 0, 0], [1, 0, 0], [5, 0, 0], [8, 0, 0]], B('stone'), 's'),
    setCells([[2, 0, 0]], B('oak_planks'), 'p'),
    setCells([[3, 0, 0]], B('oak_stairs', { facing: 'north' }), 'a'),
    setCells([[4, 0, 0]], B('oak_stairs', { facing: 'east' }), 'b'),
  ]);
  assert.deepEqual([...magicSelect(d, [0, 0, 0], { mode: 'block' })].sort(), ['0,0,0', '1,0,0']);
  assert.deepEqual([...magicSelect(d, [3, 0, 0], { mode: 'state' })], ['3,0,0']);
  assert.deepEqual([...magicSelect(d, [3, 0, 0], { mode: 'block' })].sort(), ['3,0,0', '4,0,0']);
  assert.deepEqual([...magicSelect(d, [3, 0, 0], { mode: 'family' })].sort(), ['2,0,0', '3,0,0', '4,0,0']);
  assert.equal(magicSelect(d, [0, 0, 0], { mode: 'solid' }).size, 6, 'the separate stone at x 8 is not connected');
  assert.throws(() => magicSelect(d, [7, 0, 0], { mode: 'solid' }), /beginnt auf einem Block/);
});

test('magic select: plane, diagonal steps and limit box', () => {
  // Diagonal staircase of stone: (0,0,0), (1,1,0), (2,2,0); a column (0,0..3,5).
  const d = draftOf([setCells([[0, 0, 0], [1, 1, 0], [2, 2, 0]], B('stone'), 's'), setCells([[0, 0, 5], [0, 1, 5], [0, 2, 5], [0, 3, 5]], B('stone'), 'c')]);
  assert.equal(magicSelect(d, [0, 0, 0], { mode: 'block' }).size, 1);
  assert.equal(magicSelect(d, [0, 0, 0], { mode: 'block', diagonal: true }).size, 3);
  assert.equal(magicSelect(d, [0, 1, 5], { mode: 'block' }).size, 4);
  assert.deepEqual([...magicSelect(d, [0, 1, 5], { mode: 'block', plane: true })], ['0,1,5']);
  assert.equal(magicSelect(d, [0, 1, 5], { mode: 'block', limitBox: { a: [0, 0, 5], b: [0, 2, 5] } }).size, 3);
});

// ---------------------------------------------------------------- region geometry

test('grow, shrink, fit and resize', () => {
  const one = new Set(['0,0,0']);
  assert.equal(growRegion(one).size, 7);
  assert.equal(growRegion(one, { plane: true }).size, 5);
  assert.equal(growRegion(one, { times: 2 }).size, 25, 'octahedron of radius 2');
  const cube = boxRegion(draftOf([boxEdit({ a: [0, 0, 0], b: [2, 2, 2] }, 'fill', B('stone'))]), { a: [0, 0, 0], b: [2, 2, 2] });
  assert.equal(cube.size, 27);
  assert.deepEqual([...shrinkRegion(cube)], ['1,1,1']);
  assert.equal(shrinkRegion(cube, { plane: true }).size, 3, 'centre column in each layer');
  const d = draftOf([setCells([[3, 1, 4], [5, 2, 6]], B('stone'), 's')]);
  assert.deepEqual(fitBox(d, { a: [0, 0, 0], b: [9, 9, 9] }), { a: [3, 1, 4], b: [5, 2, 6] });
  assert.equal(fitBox(d, { a: [-5, 0, 0], b: [-1, 3, 3] }), null);
  assert.deepEqual(resizeBox({ a: [0, 0, 0], b: [2, 2, 2] }, 1), { a: [-1, -1, -1], b: [3, 3, 3] });
  assert.deepEqual(resizeBox({ a: [0, 0, 0], b: [2, 2, 2] }, -1), { a: [1, 1, 1], b: [1, 1, 1] });
  assert.equal(resizeBox({ a: [0, 0, 0], b: [2, 2, 2] }, -2), null);
  assert.deepEqual(regionBounds(['1,2,3', '4,0,3']), { min: [1, 0, 3], maxExclusive: [5, 3, 4] });
});

test('box tools on a cell selection only touch its cells', () => {
  const d = draftOf([boxEdit({ a: [0, 0, 0], b: [3, 0, 0] }, 'fill', B('stone')), setCells([[1, 0, 0]], B('oak_planks'), 'p')]);
  const region = magicSelect(d, [1, 0, 0], { mode: 'block' });
  const e = clipEdit(boxEdit({ a: [0, 0, 0], b: [3, 0, 0] }, 'fill', B('glass')), region);
  assert.deepEqual([...keys(e)], ['1,0,0']);
  const f = fillRegionEdit(region, B('glass'));
  assert.deepEqual(f.changes.map(c => c.position), [[1, 0, 0]]);
});

// ---------------------------------------------------------------- copy, clear, move

test('copy and move a cell selection, turned states and the selection following', () => {
  // L-shaped region of oak stairs facing north at (0,0,0),(1,0,0),(0,0,1); a stone at (5,0,5) stays.
  const stairs = B('oak_stairs', { facing: 'north', half: 'bottom', shape: 'straight', waterlogged: 'false' });
  const d = draftOf([setCells([[0, 0, 0], [1, 0, 0], [0, 0, 1]], stairs, 's'), setCells([[5, 0, 5], [1, 0, 1]], B('stone'), 'x')]);
  const region = magicSelect(d, [0, 0, 0], { mode: 'block' });
  assert.equal(region.size, 3);
  const clip = copyRegion(d, region);
  assert.deepEqual(clip.size, [2, 1, 2]);
  assert.equal(clip.cells.length, 3);
  // Move east by 3: stone at (1,0,1) inside the bounding box but not the region stays.
  const m = moveRegionEdit(d, region, [3, 0, 0]);
  const d2 = applyEdit(d, m.edit).draft;
  assert.equal(cellAt(d2, [0, 0, 0]), null);
  assert.equal(cellAt(d2, [1, 0, 1]).state.id, 'minecraft:stone');
  assert.equal(cellAt(d2, [3, 0, 0]).state.id, 'minecraft:oak_stairs');
  assert.deepEqual([...m.region].sort(), ['3,0,0', '3,0,1', '4,0,0']);
  // Quarter turn clockwise: facing north → east, region turns with it and keeps its centre.
  const t = moveRegionEdit(d, region, [0, 0, 0], { quarterTurns: 1, mirrorX: false });
  const d3 = applyEdit(d, t.edit).draft;
  for (const k of t.region) assert.equal(cellAt(d3, keyPos(k)).state.properties.facing, 'east', k);
  assert.equal(t.region.size, 3);
  assert.equal(cellAt(d3, [1, 0, 1]).state.id, 'minecraft:oak_stairs', 'turned L covers the old empty corner');
  // Undo restores everything in one step.
  const h = executeEdit(d, EMPTY_DRAFT_HISTORY, t.edit), back = undoEdit(h.draft, h.history).draft;
  assert.deepEqual([...draftEntries(back)].sort(), [...draftEntries(d)].sort());
});

test('clear region removes cells and anchored entities only', () => {
  const stand = makeArmorStand([2, 1, 0], 'south'), other = makeArmorStand([9, 1, 9], 'north');
  let d = draftOf([boxEdit({ a: [0, 0, 0], b: [3, 0, 0] }, 'fill', B('stone'))]);
  d = applyEdit(d, { label: 'e', changes: [], entities: [stand, other] }).draft;
  const e = clearBoxEdit(d, { a: [0, 0, 0], b: [3, 1, 0] });
  assert.equal(e.changes.length, 4, 'only model cells, not the empty layer above');
  assert.equal(e.entities.length, 1);
  assert.deepEqual(e.entities[0], other);
  const none = clearRegionEdit(d, new Set(['0,0,0']));
  assert.equal(none.entities, undefined, 'no entity in the region: the list stays as it is');
});

// ---------------------------------------------------------------- entities follow the selection (ENTITY-01 open point)

test('moving and turning a box takes paintings and armor stands along', () => {
  const wall = boxEdit({ a: [0, 0, 0], b: [2, 2, 0] }, 'fill', B('stone_bricks'));
  const painting = makePainting([1, 1, 1], 'south', 'minecraft:kebab'); // hangs on the south side of the wall
  const stand = makeArmorStand([1, 0, 1], 'south'), outside = makeArmorStand([8, 0, 8], 'west');
  let d = draftOf([wall]);
  d = applyEdit(d, { label: 'e', changes: [], entities: [painting, stand, outside] }).draft;
  const box = { a: [0, 0, 0], b: [2, 2, 1] };
  const moved = moveBoxEdit(d, box, [4, 0, 0]);
  const d2 = applyEdit(d, moved.edit).draft;
  assert.equal(d2.entities.length, 3);
  const anchors = d2.entities.map(e => posKey(entityAnchor(e))).sort();
  assert.deepEqual(anchors, ['5,0,1', '5,1,1', '8,0,8']);
  // Turned: the painting still hangs in front of the turned wall and faces the turned way.
  const turned = moveBoxEdit(d, box, [0, 0, 0], { quarterTurns: 1, mirrorX: false });
  const d3 = applyEdit(d, turned.edit).draft;
  const p3 = d3.entities.find(e => entityFacing(e) && entityAnchor(e)[1] === 1);
  assert.equal(entityFacing(p3), 'west');
  const a = entityAnchor(p3), behind = [a[0] + 1, a[1], a[2]];
  assert.equal(cellAt(d3, behind)?.state.id, 'minecraft:stone_bricks', 'painting hangs on a wall block');
  const s3 = d3.entities.find(e => !entityFacing(e) && e !== outside && entityAnchor(e)[0] !== 8);
  assert.equal(Math.round(entityYaw(s3)), 90, 'armor stand looking south turns to look west');
});

test('clipboard keeps entities through transform and paste; stencils keep them', () => {
  const stand = makeArmorStand([0, 1, 0], 'south');
  let d = draftOf([setCells([[0, 0, 0]], B('stone'), 's')]);
  d = applyEdit(d, { label: 'e', changes: [], entities: [stand] }).draft;
  const clip = copyBox(d, { a: [0, 0, 0], b: [0, 1, 0] });
  assert.equal(clip.entities.length, 1);
  const r = transformClipboard(clip, { quarterTurns: 2, mirrorX: false });
  assert.equal(r.clip.entities.length, 1);
  const plain = pasteEdit(r.clip, [10, 0, 0]);
  assert.equal(plain.entities, undefined, 'without the current list entities are left out');
  const withList = pasteEdit(r.clip, [10, 0, 0], { entities: d.entities });
  assert.equal(withList.entities.length, 2);
  assert.deepEqual(entityAnchor(withList.entities[1]), [10, 1, 0]);
  assert.equal(draftFromClipboard(clip, P).entities.length, 1);
});

// ---------------------------------------------------------------- stack and extrude

test('stack repeats the selection with a step, entities copied, air optional', () => {
  const d0 = draftOf([boxEdit({ a: [0, 0, 0], b: [2, 3, 0] }, 'walls', B('stone')), setCells([[1, 1, 0]], { kind: 'air' }, 'air')]);
  const d = applyEdit(d0, { label: 'e', changes: [], entities: [makeArmorStand([1, 0, 0], 'south')] }).draft;
  const region = boxRegion(d, { a: [0, 0, 0], b: [2, 3, 0] });
  const s = stackEdit(d, region, [4, 0, 0], 3);
  assert.equal(s.edit.changes.length, region.size * 3);
  assert.deepEqual(s.bounds, { min: [0, 0, 0], maxExclusive: [15, 4, 1] });
  assert.equal(s.edit.entities.length, 4);
  const d2 = applyEdit(d, s.edit).draft;
  for (const x of [4, 8, 12]) assert.deepEqual(cellAt(d2, [x, 2, 0]), cellAt(d, [0, 2, 0]));
  assert.equal(cellAt(d2, [9, 1, 0]).kind, 'air');
  const noAir = stackEdit(d, region, [4, 0, 0], 3, { withAir: false, entities: false });
  assert.equal(noAir.edit.changes.length, (region.size - 1) * 3);
  assert.equal(noAir.edit.entities, undefined);
  // Diagonal step: a stair run.
  const step = stackEdit(draftOf([setCells([[0, 0, 0]], B('stone'), 's')]), new Set(['0,0,0']), [1, 1, 0], 4);
  assert.deepEqual(step.edit.changes.map(c => c.position), [[1, 1, 0], [2, 2, 0], [3, 3, 0], [4, 4, 0]]);
  assert.throws(() => stackEdit(d, region, [0, 0, 0], 2), /Richtung/);
  assert.throws(() => stackEdit(d, region, [1, 0, 0], 0), /Anzahl/);
});

test('extrude pulls the visible face out, stops at blocks, pushes in inside the region', () => {
  // 3×1 wall at z 0 (x 0..2, y 0), a block in the way at (2,0,-2).
  const d = draftOf([boxEdit({ a: [0, 0, 0], b: [2, 0, 0] }, 'fill', B('stone')), setCells([[2, 0, -2]], B('oak_planks'), 'o')]);
  const region = boxRegion(d, { a: [0, 0, 0], b: [2, 0, 0] });
  const out = extrudeEdit(d, region, 'north', 3);
  const got = [...keys(out)].sort();
  assert.deepEqual(got, ['0,0,-1', '0,0,-2', '0,0,-3', '1,0,-1', '1,0,-2', '1,0,-3', '2,0,-1'].sort());
  assert.ok(out.changes.every(c => c.value.state.id === 'minecraft:stone'));
  // Thicken a 1-thick wall to 3 and push 2 back in from the north.
  const thick = applyEdit(draftOf([boxEdit({ a: [0, 0, 0], b: [2, 0, 2] }, 'fill', B('stone'))]), { label: 'n', changes: [] }).draft;
  const all = boxRegion(thick, { a: [0, 0, 0], b: [2, 0, 2] });
  const inward = extrudeEdit(thick, all, 'north', -2);
  assert.equal(inward.changes.length, 6);
  assert.ok(inward.changes.every(c => c.value === null && c.position[2] <= 1));
  // Faces not open towards the direction do not move: top of a cube with a block above.
  const capped = draftOf([setCells([[0, 0, 0], [0, 1, 0]], B('stone'), 's')]);
  assert.equal(extrudeEdit(capped, new Set(['0,0,0']), 'up', 2).changes.length, 0);
  assert.throws(() => extrudeEdit(d, region, 'up', 0), /Weite/);
});

// ---------------------------------------------------------------- forms

test('ellipsoid in a box: symmetric, inside the box, hollow shell, dome on its base', () => {
  const box = { a: [0, 0, 0], b: [8, 4, 4] };
  const e = ellipsoidEdit(box, B('stone'));
  const k = keys(e);
  for (const c of e.changes) {
    const [x, y, z] = c.position;
    assert.ok(x >= 0 && x <= 8 && y >= 0 && y <= 4 && z >= 0 && z <= 4);
    assert.ok(k.has(posKey([8 - x, y, z])) && k.has(posKey([x, 4 - y, z])) && k.has(posKey([x, y, 4 - z])), 'mirror symmetric in every axis');
  }
  assert.ok(k.has('4,2,2') && k.has('0,2,2') && k.has('8,2,2') && !k.has('0,0,0'));
  const h = ellipsoidEdit(box, B('stone'), { hollow: true });
  assert.ok(h.changes.length < e.changes.length && !keys(h).has('4,2,2'));
  assert.ok(connected(h.changes.map(c => c.position)));
  const dome = ellipsoidEdit({ a: [0, 0, 0], b: [6, 3, 6] }, B('stone'), { dome: true, hollow: true });
  assert.ok(dome.changes.some(c => c.position[1] === 0), 'the rim stands on the base layer');
  assert.ok(!keys(dome).has('3,0,3'), 'hollow dome is open inside, the base layer is only its rim');
  assert.ok(keys(dome).has('3,3,3'), 'apex');
});

test('torus lying and standing, hollow and half', () => {
  const t = torusEdit([0, 0, 0], 5, 1, B('stone'));
  const k = keys(t);
  assert.ok(k.has('5,0,0') && k.has('-5,0,0') && k.has('0,0,5') && k.has('0,0,-5') && k.has('5,1,0'));
  assert.ok(!k.has('0,0,0') && !k.has('3,0,0'), 'hole in the middle');
  assert.ok(t.changes.every(c => Math.abs(c.position[1]) <= 1));
  assert.ok(connected(t.changes.map(c => c.position)));
  for (const c of t.changes) { const [x, y, z] = c.position; assert.ok(k.has(posKey([-x, y, z])) && k.has(posKey([z, y, x]))); }
  const s = torusEdit([0, 0, 0], 5, 1, B('stone'), { axis: 'z' });
  assert.ok(keys(s).has('0,5,0') && keys(s).has('5,0,0') && s.changes.every(c => Math.abs(c.position[2]) <= 1));
  const half = torusEdit([0, 0, 0], 5, 1, B('stone'), { axis: 'x', half: true });
  assert.ok(half.changes.every(c => c.position[1] >= 0) && keys(half).has('0,5,0'));
  const hollow = torusEdit([0, 0, 0], 8, 3, B('stone'), { hollow: true });
  assert.ok(hollow.changes.length < torusEdit([0, 0, 0], 8, 3, B('stone')).changes.length && !keys(hollow).has('8,0,0'));
  assert.throws(() => torusEdit([0, 0, 0], 0, 1, B('stone')), /Ringradius/);
});

test('helix: one step per cell and turn, connected, stairs face uphill, walkable flag', () => {
  const stairs = B('oak_stairs', { facing: 'north', half: 'bottom', shape: 'straight', waterlogged: 'false' });
  const h = helixEdit([0, 0, 0], 3, stairs, { width: 2, pitch: 12, height: 24, clockwise: true });
  assert.ok(h.walkable);
  const ys = h.changes.map(c => c.position[1]);
  assert.equal(Math.min(...ys), 0); assert.equal(Math.max(...ys), 23);
  // Each ring cell appears once per turn (two turns of 12 for height 24).
  const perColumn = new Map();
  for (const c of h.changes) { const col = `${c.position[0]},${c.position[2]}`; perColumn.set(col, (perColumn.get(col) ?? 0) + 1); }
  assert.ok([...perColumn.values()].every(n => n === 2));
  assert.ok(!perColumn.has('0,0'), 'centre column stays free');
  // Facing follows the ascent: clockwise from above, the east side (x>0, z=0) climbs towards south.
  assert.equal(h.changes.find(c => c.position[0] === 3 && c.position[2] === 0).value.state.properties.facing, 'south');
  assert.equal(h.changes.find(c => c.position[0] === 0 && c.position[2] === 3).value.state.properties.facing, 'west');
  const ccw = helixEdit([0, 0, 0], 3, stairs, { width: 2, pitch: 12, height: 12, clockwise: false });
  assert.equal(ccw.changes.find(c => c.position[0] === 3 && c.position[2] === 0).value.state.properties.facing, 'north');
  // A thick ramp of stone is connected face to face.
  const ramp = helixEdit([0, 0, 0], 4, B('stone'), { width: 2, pitch: 16, height: 32, clockwise: true, thickness: 2 });
  assert.ok(connected(ramp.changes.map(c => c.position)));
  assert.equal(helixEdit([0, 0, 0], 2, B('stone'), { width: 1, pitch: 40, height: 40, clockwise: true }).walkable, false);
  // Deterministic.
  assert.deepEqual(helixEdit([0, 0, 0], 3, stairs, { width: 2, pitch: 12, height: 24, clockwise: true }), h);
});
