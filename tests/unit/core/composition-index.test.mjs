import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPayload } from '../../../dist/voxel/src/index.js';
import { createProject, resolveProject } from '../../../dist/domain/src/index.js';

const state = id => ({ id, properties: {} });
const entityData = text => ({ type: 'compound', value: { note: { type: 'string', value: text } } });
const payload = (cells, palette, blockEntities = [], bounds = { min: [0, 0, 0], maxExclusive: [2, 2, 2] }) => createPayload({ schemaVersion: 1, profileId: 'java:registry-unverified', bounds, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette, cells, blockEntities });
const block = (position, paletteIndex = 0) => ({ position, kind: 'block', paletteIndex });
const version = (id, value) => ({ id, assetId: id, payload: value, connectors: [], source: { format: 'demo' } });
const instance = (id, assetVersionId, position = [0, 0, 0], override = false) => ({ id, assetVersionId, name: id, override, transform: { position, quarterTurns: 0, mirrorX: false } });
function resolve(instances, values, limits) {
  return resolveProject({ ...createProject({ name: 'Handberechnete Indizes' }), instances }, new Map(values.map(v => [v.id, v])), limits);
}
const mixedCells = [block([1, 1, 0]), { position: [0, 0, 1], kind: 'erase' }, { position: [1, 0, 0], kind: 'air', paletteIndex: 1 }, block([0, 0, 0], 2)];
const mixed = version('mixed', payload(mixedCells, [state('minecraft:chest'), state('minecraft:air'), state('minecraft:stone')], [{ position: [1, 1, 0], data: entityData('original') }]));

test('numeric composition retains negative positions, sparse bounds, cell kinds and insertion order', () => {
  const r = resolve([instance('A', 'mixed', [-3, -2, -4]), instance('B', 'mixed', [-3, -2, -4])], [mixed]);
  assert.deepEqual([...r.owners], [
    ['-2,-1,-4', ['A', 'B']], ['-3,-2,-3', ['A', 'B']], ['-2,-2,-4', ['A', 'B']], ['-3,-2,-4', ['A', 'B']],
  ]);
  assert.equal(r.duplicates, 4);
  assert.deepEqual(r.conflicts, []);
  assert.deepEqual(r.world.bounds, { min: [-3, -2, -4], maxExclusive: [-1, 0, -2] });
  assert.deepEqual(r.world.cells, [block([-3, -2, -4]), { position: [-2, -2, -4], kind: 'air', paletteIndex: 1 }, { position: [-3, -2, -3], kind: 'erase' }, block([-2, -1, -4], 2)]);
  assert.deepEqual(r.world.palette, [state('minecraft:stone'), state('minecraft:air'), state('minecraft:chest')]);
  assert.deepEqual(r.world.blockEntities, [{ position: [-2, -1, -4], data: entityData('original') }]);
  assert.deepEqual(structuredClone(r), r, 'public result remains structured-cloneable');
});

test('numeric collisions preserve all conflict kinds, explicit overrides and owner order', () => {
  const replacement = version('replacement', payload([block([1, 1, 0]), block([0, 0, 1], 1), block([1, 0, 0], 1), block([0, 0, 0], 1)], [state('minecraft:chest'), state('minecraft:oak_planks')], [{ position: [1, 1, 0], data: entityData('replacement') }]));
  const unresolved = resolve([instance('A', 'mixed'), instance('B', 'replacement')], [mixed, replacement]);
  assert.deepEqual(unresolved.conflicts.map(c => [c.position, c.kind, c.instanceIds, c.previewInstanceId]), [
    [[1, 1, 0], 'block-entity', ['A', 'B'], 'A'], [[0, 0, 1], 'erase-vs-block', ['A', 'B'], 'A'],
    [[1, 0, 0], 'air-vs-block', ['A', 'B'], 'A'], [[0, 0, 0], 'state', ['A', 'B'], 'A'],
  ]);
  const resolved = resolve([instance('A', 'mixed'), instance('B', 'replacement', [0, 0, 0], true)], [mixed, replacement]);
  assert.deepEqual(resolved.conflicts, []);
  assert.deepEqual(resolved.overridden.map(c => c.resolvedBy), ['B', 'B', 'B', 'B']);
  assert.deepEqual([...resolved.owners.values()], [['B', 'A'], ['B', 'A'], ['B', 'A'], ['B', 'A']]);
  assert.deepEqual(resolved.world.blockEntities, [{ position: [1, 1, 0], data: entityData('replacement') }]);
  const contested = resolve([instance('A', 'mixed', [0, 0, 0], true), instance('B', 'replacement', [0, 0, 0], true)], [mixed, replacement]);
  assert.equal(contested.conflicts.length, 4);
});

test('sparse numeric indices near the safe-integer boundary do not merge neighboring cells', () => {
  const one = version('one', payload([block([0, 0, 0])], [state('minecraft:stone')], [], { min: [0, 0, 0], maxExclusive: [1, 1, 1] }));
  const r = resolve([
    instance('A', 'one', [134217726, 0, 67108863]), instance('B', 'one', [134217725, 0, 67108863]), instance('C', 'one'),
  ], [one], { maxVolume: Number.MAX_SAFE_INTEGER });
  assert.equal(r.duplicates, 0);
  assert.deepEqual([...r.owners.keys()], ['134217726,0,67108863', '134217725,0,67108863', '0,0,0']);
  assert.deepEqual(r.world.cells.map(c => c.position), [[0, 0, 0], [134217725, 0, 67108863], [134217726, 0, 67108863]]);
  assert.throws(() => resolve([instance('A', 'one', [-2147483647, 0, -2147483647]), instance('B', 'one', [2147483646, 0, 2147483646])], [one], { maxVolume: Number.MAX_SAFE_INTEGER }), /Volumenlimit/);
});

test('empty/missing projects and tighter composition limits retain existing outcomes', () => {
  assert.equal(resolve([], []).world, null);
  const missing = resolve([instance('missing', 'absent')], []);
  assert.equal(missing.issues[0].code, 'MISSING_VERSION');
  assert.equal(missing.world, null);
  assert.throws(() => resolve([instance('A', 'mixed')], [mixed], { maxCells: 3 }), /Grenzen/);
  assert.throws(() => resolve([instance('A', 'mixed')], [mixed], { maxVolume: 7 }), /Volumenlimit/);
});
