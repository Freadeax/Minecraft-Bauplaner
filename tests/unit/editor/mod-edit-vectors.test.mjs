import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vectors } from '../../../scripts/fixtures/make_edit_vectors.mjs';

// EDIT-04 (mod side): the Java port in the mod is tested against this file (EditGuidesTest); it must stay what the planner computes.
test('symmetry and curve vectors for the mod match the planner', () => {
  const stored = JSON.parse(readFileSync('fixtures/edit/mod-edit-vectors.json', 'utf8'));
  assert.deepEqual(stored, JSON.parse(JSON.stringify(vectors())), 'fixtures/edit/mod-edit-vectors.json neu erzeugen: node scripts/fixtures/make_edit_vectors.mjs');
  // Every curve is face-connected and every symmetry group starts with the identity.
  for (const c of stored.curves) assert.ok(c.cells.length > 1, c.name);
  for (const s of stored.symmetries) assert.deepEqual(s.group[0], [0, false]);
});
