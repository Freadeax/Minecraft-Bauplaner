import test from 'node:test';
import assert from 'node:assert/strict';
import { computeProject, decodeComputeInput, decodeComputeResult, encodeComputeInput, encodeComputeResult, isWireResult } from '../../../dist/application/src/index.js';
import { createProject, createSampleLibrary, newInstance } from '../../../dist/domain/src/index.js';
import { isSealedPayload } from '../../../dist/voxel/src/validation.js';

// SIZE-01: the project computation travels between page and worker as columns and cell indices.
const library = await createSampleLibrary(), versions = new Map(library.versions.map(v => [v.id, v]));
const [a, b] = library.versions;
const project = { ...createProject({ name: 'Übertragung' }), profileId: a.payload.profileId, instances: [
  newInstance({ name: 'Gerade', assetVersionId: a.id, transform: { position: [0, 0, 0], quarterTurns: 0, mirrorX: false } }),
  newInstance({ name: 'Gedreht', assetVersionId: b.id, transform: { position: [40, 2, -30], quarterTurns: 3, mirrorX: true } }),
] };

test('SIZE-01: input and result survive the wire form unchanged', () => {
  const input = { project, versions };
  const direct = computeProject(input);
  const sent = encodeComputeInput(input);
  assert.ok(sent.transfer.length >= 6, 'Zellspalten werden übertragen');
  const wireIn = structuredClone(sent.input, { transfer: sent.transfer });
  const worker = decodeComputeInput(wireIn);
  for (const v of worker.versions.values()) assert.ok(isSealedPayload(v.payload), 'im Worker versiegelt');
  const encoded = encodeComputeResult(computeProject(worker));
  assert.ok(isWireResult(encoded.result));
  assert.equal(encoded.result.resolution.placed[0].payload, undefined, 'platzierte Payloads reisen nicht zurück');
  const back = decodeComputeResult(structuredClone(encoded.result, { transfer: encoded.transfer }), versions);
  assert.deepEqual(back.resolution, direct.resolution);
  assert.deepEqual(back.guide, direct.guide);
  assert.deepEqual(back.materials, direct.materials);
  assert.deepEqual(back.stepMaterials, direct.stepMaterials);
  assert.deepEqual(back.instanceMaterials, direct.instanceMaterials);
  assert.deepEqual(back.site, direct.site);
  // Steps share the world's position objects, sections the guide's step objects – as before.
  const step = back.guide.steps.find(s => s.positions.length);
  assert.ok(back.resolution.world.cells.some(c => c.position === step.positions[0]));
  assert.equal(back.site.plan.sections[0].steps[0], back.guide.byId.get(back.site.plan.sections[0].steps[0].id));
  assert.throws(() => decodeComputeResult(encodeComputeResult(computeProject({ project, versions })).result, new Map()), /fehlt/);
});
