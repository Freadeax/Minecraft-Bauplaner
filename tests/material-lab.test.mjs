import test from 'node:test';
import assert from 'node:assert/strict';
import { createPayload } from '../dist/voxel/src/index.js';
import { computeMaterials } from '../dist/domain/src/materials.js';
import { materialLab, labEntry } from '../dist/domain/src/materialLab.js';

const states = [
  ['minecraft:stone_slab', { type: 'double' }],
  ['minecraft:oak_door', { half: 'lower' }],
  ['minecraft:oak_door', { half: 'upper' }],
  ['minecraft:red_wool', {}],
  ['minecraft:mysterious_widget', {}],
  ['example:stone', {}],
];
const world = createPayload({ schemaVersion: 1, profileId: 'test:unverified', bounds: { min: [0,0,0], maxExclusive: [6,2,1] }, pivot: [0,0,0], sourceOrigin: [0,0,0], palette: states.map(([id,properties]) => ({id, properties})), cells: states.map((_,i) => ({ kind: 'block', position: i === 2 ? [1,1,0] : [i,0,0], paletteIndex: i })), blockEntities: [] });
const report = computeMaterials(world);

test('labor uses exact mapped item counts: double slab twice, paired door once, unresolved mod excluded', () => {
  const lab = materialLab(report);
  assert.equal(report.placed.blocks, 6);
  assert.equal(lab.count, 5);
  assert.equal(lab.entries.find(e => e.line.itemId === 'minecraft:stone_slab').line.count, 2);
  assert.equal(lab.entries.find(e => e.line.itemId === 'minecraft:oak_door').line.count, 1);
  assert.equal(lab.entries.length, 4);
  assert.equal(report.unresolved.length, 1);
  assert.equal(lab.families.reduce((n,f) => n + f.count, 0), lab.count);
  assert.equal(lab.slots, report.totals.slots);
});

test('labor filters by German catalogue family, source block, and confidence without mutating input', () => {
  const before = JSON.stringify(report);
  assert.deepEqual(materialLab(report, { query: 'EICHE oak', family: 'holz' }).entries.map(e => e.line.itemId), ['minecraft:oak_door']);
  assert.equal(materialLab(report, { confidence: 'assumed' }).entries[0].line.itemId, 'minecraft:mysterious_widget');
  assert.equal(materialLab(report, { confidence: 'catalog' }).count, 4);
  assert.equal(materialLab(report, { family: 'holz', query: 'stone' }).entries.length, 0);
  assert.equal(materialLab(report, { query: ' \t  ' }).entries.length, 4);
  assert.equal(JSON.stringify(report), before);
  assert.equal(materialLab(report).entries.find(e => e.line === report.items[0]).line, report.items[0]);
});

test('name sorting is stable and unknown namespaces cannot inherit Vanilla family labels', () => {
  assert.deepEqual(materialLab(report, { sort: 'name' }).entries.map(e => e.line.itemId), ['minecraft:mysterious_widget','minecraft:oak_door','minecraft:red_wool','minecraft:stone_slab']);
  const sample = report.items.find(l => l.itemId === 'minecraft:stone_slab');
  assert.equal(labEntry({ ...sample, itemId: 'mod:stone_slab' }).family, 'sonstige');
  assert.equal(materialLab({items: []}).count, 0);
  assert.equal(materialLab({items: []}).slots, 0);
});
