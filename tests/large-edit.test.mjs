import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalPayloadJson } from '../dist/domain/src/catalog/library.js';
import { canonicalJson } from '../dist/domain/src/core/hash.js';
import { blockValue, createDraft, EMPTY_DRAFT_HISTORY, executeEdit, materializeDraft, keyPos } from '../dist/domain/src/index.js';
import { createPayload } from '../dist/voxel/src/index.js';
import { isSealedPayload } from '../dist/voxel/src/validation.js';

// SIZE-01: fast paths for million-cell models must give exactly the old results.

const stone = { id: 'minecraft:stone', properties: {} }, stairs = { id: 'minecraft:oak_stairs', properties: { facing: 'north', half: 'bottom' } };
function sample() {
  const cells = [];
  for (let x = -3; x < 4; x++) for (let y = 0; y < 3; y++) for (let z = 0; z < 3; z++) {
    const n = (x * 7 + y * 3 + z) & 3;
    cells.push(n === 0 ? { position: [x, y, z], kind: 'erase' } : n === 1 ? { kind: 'air', paletteIndex: 2, position: [x, y, z] } : { paletteIndex: n - 2, position: [x, y, z], kind: 'block' });
  }
  return createPayload({
    schemaVersion: 1, profileId: 'mc-java-26.3', bounds: { min: [-3, 0, 0], maxExclusive: [4, 3, 3] }, pivot: [0, 0, 0], sourceOrigin: [5, 6, 7],
    palette: [stone, stairs, { id: 'minecraft:air', properties: {} }], cells: cells.reverse(),
    blockEntities: [{ position: [1, 1, 1], data: { type: 'compound', value: { id: { type: 'string', value: 'minecraft:chest' } } } }],
  });
}

test('canonicalPayloadJson ist textgleich mit canonicalJson (gespeicherte Hashes bleiben gültig)', () => {
  const p = sample();
  assert.equal(canonicalPayloadJson(p), canonicalJson(p));
  // unusual shapes fall back to the generic walk
  const odd = { ...p, cells: [{ kind: 'block', paletteIndex: 0, position: [-0, 1, 2] }, { kind: 'erase', position: [1, 2, 3], extra: undefined }, { kind: 'block', paletteIndex: 0, position: [1, 2, 3], note: 'x' }] };
  assert.equal(canonicalPayloadJson(odd), canonicalJson(odd));
});

test('materializeDraft: Zusammenführen ohne Neusortieren ergibt dieselbe Reihenfolge, Grenzen und Palette', () => {
  const base = sample();
  let draft = createDraft(base);
  const first = materializeDraft(draft);
  assert.ok(isSealedPayload(first));
  const sorted = [...base.cells].sort((a, b) => a.position[1] - b.position[1] || a.position[2] - b.position[2] || a.position[0] - b.position[0]);
  assert.deepEqual(first.cells.map(c => c.position), sorted.map(c => c.position));
  const r = executeEdit(draft, EMPTY_DRAFT_HISTORY, { label: 'x', changes: [
    { position: [0, 1, 1], value: blockValue(stairs) }, { position: [9, 5, -2], value: blockValue(stone) },
    { position: [-3, 0, 0], value: null }, { position: [2, 0, 5], value: blockValue({ id: 'minecraft:gold_block', properties: {} }) },
  ] });
  draft = r.draft;
  const after = materializeDraft(draft);
  const ys = after.cells.map(c => c.position);
  for (let i = 1; i < ys.length; i++) { const a = ys[i - 1], b = ys[i]; assert.ok((a[1] - b[1] || a[2] - b[2] || a[0] - b[0]) < 0, `Reihenfolge bei ${i}`); }
  assert.equal(after.cells.length, base.cells.length + 1);
  assert.ok(!ys.some(p => p.join() === '-3,0,0'));
  assert.deepEqual(after.bounds, { min: [-3, 0, -2], maxExclusive: [10, 6, 6] });
  assert.equal(after.palette.at(-1).id, 'minecraft:gold_block');
  assert.equal(new Set(after.palette.map(s => JSON.stringify(s))).size, after.palette.length);
  // the draft's base stays untouched and the result does not share mutable parts with it
  assert.deepEqual(keyPos('1,2,3'), [1, 2, 3]);
  assert.ok(Object.isFrozen(after.blockEntities[0].data));
  assert.notEqual(after.blockEntities[0].data, base.blockEntities[0].data);
});
