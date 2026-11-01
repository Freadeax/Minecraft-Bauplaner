import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareRevisionExport, MemoryRepository, RevisionConflictError } from '../dist/application/src/index.js';
import { createProject, createSampleLibrary, newInstance, applyOperation } from '../dist/domain/src/index.js';

const lib = await createSampleLibrary();
const versions = new Map(lib.versions.map(v => [v.id, v]));
const instance = newInstance({ assetVersionId: lib.versions[0].id, name: 'Test', transform: { position: [0, 0, 0], quarterTurns: 0, mirrorX: false } });
const project = applyOperation(createProject({ name: 'Anwendung' }), { kind: 'instance.add', instance }).project;
const settings = { dataVersion: 3955, anchor: 'project-origin', unselected: 'air' };

test('application export succeeds independently of React/storage and reuses a frozen revision', async () => {
  const before = JSON.stringify(project);
  const first = await prepareRevisionExport(project, versions, settings, { comment: 'Abnahme' });
  assert.equal(JSON.stringify(project), before);
  assert.equal(first.created, true);
  assert.equal(first.output.revision.comment, 'Abnahme');
  const again = await prepareRevisionExport(first.project, versions, settings);
  assert.equal(again.created, false);
  assert.equal(again.output.sha256, first.output.sha256);
  const historical = await prepareRevisionExport(first.project, versions, { ...settings, format: 'litematic' }, { revisionId: first.output.revision.id });
  assert.equal(historical.created, false);
  assert.equal(historical.output.format, 'litematic');
});
test('failed export leaves source revision history intact; missing historic revision and geometry reject', async () => {
  const before = JSON.stringify(project);
  await assert.rejects(prepareRevisionExport(project, versions, { ...settings, dataVersion: 0 }), /DataVersion/);
  assert.equal(JSON.stringify(project), before);
  await assert.rejects(prepareRevisionExport(project, versions, settings, { revisionId: 'missing' }), /existiert nicht/);
  await assert.rejects(prepareRevisionExport(project, new Map(), settings), /Export gesperrt/);
});
test('portable repository reports the shared conflict error and does not partially store a failed batch', async () => {
  const repo = new MemoryRepository();
  const saved = await repo.saveProject(project, 0);
  const original = { sha256: 'fake', bytes: new Uint8Array([1]) };
  await assert.rejects(repo.applyBatch({ originals: [original], projects: [{ project, baseRevision: 0 }] }), e => e instanceof RevisionConflictError && e.stored === 1 && e.base === 0);
  assert.equal(await repo.getOriginal('fake'), null);
  assert.deepEqual(await repo.getProject(project.id), saved);
});
