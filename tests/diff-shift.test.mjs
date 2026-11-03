import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPayload, diffPayloads, diffAsPayload, changedCells } from '../dist/voxel/src/index.js';
import { diffVersions } from '../dist/domain/src/index.js';

const P = 'mc-java-26.3';
const st = (id, properties = {}) => ({ id: `minecraft:${id}`, properties });
const str = v => ({ type: 'string', value: v });
const int = v => ({ type: 'int', value: v });
const comp = value => ({ type: 'compound', value });
const list = (elementType, value) => ({ type: 'list', elementType, value });

/** A small house: 5×4×5 stone shell with an oak door gap, glowstone in one corner and a chest. */
function house(off = [0, 0, 0], box = [12, 8, 12], { chest = 'minecraft:bread', extra = [] } = {}) {
  const palette = [st('stone'), st('glowstone'), st('chest', { facing: 'north', type: 'single', waterlogged: 'false' }), st('oak_planks')];
  const cells = [], blockEntities = [];
  const put = (x, y, z, i) => cells.push({ position: [x + off[0], y + off[1], z + off[2]], kind: 'block', paletteIndex: i });
  for (let y = 0; y < 4; y++) for (let z = 0; z < 5; z++) for (let x = 0; x < 5; x++) {
    const shell = x === 0 || x === 4 || z === 0 || z === 4 || y === 0 || y === 3;
    if (!shell || (x === 2 && z === 0 && (y === 1 || y === 2))) continue;
    put(x, y, z, x === 4 && z === 4 && y === 3 ? 1 : 0);
  }
  put(2, 1, 3, 2);
  blockEntities.push({ position: [2 + off[0], 1 + off[1], 3 + off[2]], data: comp({ id: str('minecraft:chest'), x: int(2 + off[0]), y: int(1 + off[1]), z: int(3 + off[2]),
    Items: list('compound', [comp({ Slot: { type: 'byte', value: 0 }, id: str(chest), count: int(3) })]) }) });
  for (const [x, y, z] of extra) put(x, y, z, 3);
  return createPayload({ schemaVersion: 1, profileId: P, bounds: { min: [0, 0, 0], maxExclusive: box }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette, cells, blockEntities });
}

test('DIFF-01: a moved building is recognised as a pure shift', () => {
  const a = house(), b = house([3, 0, 2]);
  const d = diffPayloads(a, b);
  assert.deepEqual(d.shift.offset, [-3, 0, -2]);
  assert.equal(d.shift.applied, true);
  assert.equal(d.shift.pure, true);
  assert.equal(changedCells(d), 0);
  assert.ok(d.shift.changedWithout > 50, 'without the shift almost everything differs');
  assert.equal(d.counts.same, d.blocksBefore);
  assert.equal(d.counts.content, 0, 'the chest moved with its own x/y/z – no content change');
  const fixed = diffPayloads(a, b, { align: 'fixed' });
  assert.equal(fixed.shift.applied, false);
  assert.equal(changedCells(fixed), d.shift.changedWithout);
  // Deterministic and inputs untouched.
  assert.deepEqual(diffPayloads(a, b), d);
  assert.deepEqual(a, house());
});

test('DIFF-01: shift plus a real extension keeps the extension as change', () => {
  const a = house(), b = house([2, 1, 0], [12, 8, 12], { extra: [[5, 0, 0], [5, 0, 1], [5, 0, 2]] });
  const d = diffPayloads(a, b);
  assert.deepEqual(d.shift.offset, [-2, -1, 0]);
  assert.equal(d.shift.pure, false);
  assert.deepEqual({ added: d.counts.added, removed: d.counts.removed, material: d.counts.material }, { added: 3, removed: 0, material: 0 });
  assert.deepEqual(d.followUps.layers, [d.cells.find(c => c.kind === 'added').position[1]]);
  const u = diffAsPayload(d, P);
  assert.ok(u.payload.cells.every(c => c.position.every(v => v >= 0)));
});

test('DIFF-01: a material swap or a pivot-aligned extension is not mistaken for a shift', () => {
  const a = house();
  const swapped = createPayload({ ...a, palette: a.palette.map(s => s.id === 'minecraft:stone' ? st('cobblestone') : s) });
  const d = diffPayloads(a, swapped);
  assert.equal(d.shift.applied, false);
  assert.ok(d.counts.material > 50);
  const grown = house([0, 0, 0], [12, 8, 12], { extra: [[5, 0, 0], [5, 1, 0], [6, 0, 0]] });
  const g = diffPayloads(a, grown);
  assert.equal(g.shift.applied, false);
  assert.equal(g.counts.added, 3);
  // Updates compare world positions: never shifted.
  assert.equal(diffVersions(a, house([3, 0, 2])).shift.applied, false);
});

test('DIFF-01: block entity changes count as content with what changed', () => {
  const a = house(), b = house([0, 0, 0], [12, 8, 12], { chest: 'minecraft:apple' });
  const d = diffPayloads(a, b);
  assert.equal(d.counts.content, 1);
  const c = d.cells.find(x => x.kind === 'content');
  assert.deepEqual(c.position, [2, 1, 3]);
  assert.deepEqual(c.contentChanges, ['Inhalt']);
  assert.deepEqual(d.followUps.content, { Inhalt: 1 });
  assert.deepEqual(d.followUps.layers, [1]);
  // Removing the entry entirely is a content change too.
  const empty = createPayload({ ...a, blockEntities: [] });
  assert.equal(diffPayloads(a, empty).counts.content, 1);
});

test('DIFF-01: connection-only state changes are marked as derived', () => {
  const mk = (fence, stairs) => createPayload({ schemaVersion: 1, profileId: P, bounds: { min: [0, 0, 0], maxExclusive: [3, 1, 1] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0],
    palette: [st('oak_fence', fence), st('oak_stairs', stairs)],
    cells: [{ position: [0, 0, 0], kind: 'block', paletteIndex: 0 }, { position: [2, 0, 0], kind: 'block', paletteIndex: 1 }], blockEntities: [] });
  const fence = (east) => ({ north: 'false', east, south: 'false', west: 'false', waterlogged: 'false' });
  const stairs = (facing, shape) => ({ facing, half: 'bottom', shape, waterlogged: 'false' });
  const d = diffPayloads(mk(fence('false'), stairs('north', 'straight')), mk(fence('true'), stairs('east', 'straight')));
  assert.equal(d.counts.state, 2);
  assert.equal(d.followUps.derivedStates, 1);
  const f = d.cells.find(c => c.before.id === 'minecraft:oak_fence');
  assert.deepEqual([f.changedProperties, f.derived], [['east'], true]);
  const s = d.cells.find(c => c.before.id === 'minecraft:oak_stairs');
  assert.deepEqual([s.changedProperties, s.derived], [['facing'], false]);
  assert.deepEqual(d.followUps.layers, [0], 'only the turned stair needs a look in the build steps');
});
