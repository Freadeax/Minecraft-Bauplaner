import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeOwners, encodeOwners } from '../dist/domain/src/team/ownerWire.js';
import { computeProject, decodeComputeResult, encodeComputeResult } from '../dist/application/src/index.js';
import { createProject, createSampleLibrary, newInstance, resolveProject, buildGuide, materialsForParts } from '../dist/domain/src/index.js';
import { stepCellIndices } from '../dist/domain/src/building/guide.js';

// PERF-02-S03: owners compact on the wire; same keys, values and order as the worker's Map.
const library = await createSampleLibrary(), versions = new Map(library.versions.map(v => [v.id, v]));
const [a, b] = library.versions;
const project = { ...createProject({ name: 'Besitz' }), profileId: a.payload.profileId, instances: [
  newInstance({ name: 'A', assetVersionId: a.id, transform: { position: [0, 0, 0], quarterTurns: 0, mirrorX: false } }),
  // overlaps A: shared cells with several owners
  newInstance({ name: 'B', assetVersionId: b.id, transform: { position: [1, 0, 1], quarterTurns: 1, mirrorX: true } }),
] };
const plain = m => [...Map.prototype.entries.call(new Map([...m]))];

test('owners wire form: same keys, values and order', () => {
  const shared = ['x'], eager = new Map([['0,0,0', shared], ['-1,2,3', ['y', 'x']], ['5,-7,9', shared]]);
  const wire = encodeOwners(eager);
  assert.equal(wire.lists.length, 2, 'identical lists once');
  const idx = decodeOwners(structuredClone(wire));
  assert.deepEqual([...idx.keys()], ['0,0,0', '-1,2,3', '5,-7,9']);
  assert.deepEqual(idx.get('-1,2,3'), ['y', 'x']);
  assert.equal(idx.get('9,9,9'), undefined);
  assert.deepEqual(plain(idx), plain(eager));
  assert.throws(() => encodeOwners(new Map([['1,2', ['x']]])), /Zellschlüssel/);
  assert.throws(() => decodeOwners({ ...wire, list: Int32Array.of(0, 5, 0) }), /ins Leere/);
});

test('resolveProject: owners match world cells and survive the wire', () => {
  const r = resolveProject(project, versions);
  const entries = plain(r.owners);
  assert.equal(entries.length, r.world.cells.length);
  assert.ok(entries.some(([, ids]) => ids.length > 1), 'Überlappung mit mehreren Besitzern');
  const keys = new Set(r.world.cells.map(c => c.position.join(',')));
  for (const [k] of entries) assert.ok(keys.has(k));
  assert.ok(structuredClone(r).owners.size === entries.length, 'Worker-Map bleibt klonbar');
  const viaKeys = encodeOwners(new Map(entries)), viaRemembered = encodeOwners(r.owners);
  assert.deepEqual(viaRemembered, viaKeys, 'gemerkte Einträge = zerlegte Schlüssel');
  const sent = encodeComputeResult(computeProject({ project, versions }));
  const back = decodeComputeResult(structuredClone(sent.result, { transfer: sent.transfer }), versions);
  assert.deepEqual(plain(back.resolution.owners), entries);
});

test('guide steps know their world cells; materials per step unchanged', () => {
  const r = resolveProject(project, versions), guide = buildGuide(project, r);
  const parts = guide.steps.map(s => ({ id: s.id, positions: s.positions, conflicts: s.conflicts }));
  for (const s of guide.steps) {
    const idx = stepCellIndices(s, r.world);
    if (!s.positions.length) continue;
    assert.ok(idx, s.id);
    assert.deepEqual([...idx].map(i => r.world.cells[i].position), s.positions);
  }
  assert.equal(stepCellIndices(guide.steps[0], resolveProject(project, versions).world), undefined, 'nur für dieselbe Welt');
  const withIdx = materialsForParts(r.world, guide.steps.map(s => ({ id: s.id, positions: s.positions, conflicts: s.conflicts, cellIndices: stepCellIndices(s, r.world) })));
  assert.deepEqual(withIdx, materialsForParts(r.world, parts));
});
