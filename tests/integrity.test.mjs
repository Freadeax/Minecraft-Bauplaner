// Datencheck (S-02): read-only consistency check of stored records.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  checkIntegrity, createSampleLibrary, createAsset, addAssetVersion, sampleWallPayload, createProject, applyOperation, newInstance, freezeRevision,
} from '../dist/domain/src/index.js';

const lib = await createSampleLibrary();
const tower = lib.versions.find(v => v.assetId === 'sample_tower');
// Expected digest from Node's crypto module, independent of the code under test.
const bytes = new Uint8Array([0x1f, 0x8b, 8, 0, 42, 7, 9]);
const sha = createHash('sha256').update(bytes).digest('hex');
const original = { sha256: sha, fileName: 'haus.schem', mediaType: 'application/octet-stream', size: bytes.length, createdAt: '2026-10-28T00:00:00.000Z', bytes };

async function healthy() {
  const asset = createAsset({ name: 'Haus', provenance: { author: 'Test', source: 'haus.schem', license: '' } });
  const imported = await addAssetVersion(asset, { payload: sampleWallPayload(), label: '1.0', source: { format: 'schem-v3', fileName: 'haus.schem', originalSha256: sha } });
  let p = createProject({ name: 'Burg' });
  p = applyOperation(p, { kind: 'instance.add', instance: newInstance({ assetVersionId: tower.id, name: 'Turm', transform: { position: [0, 0, 0], quarterTurns: 0, mirrorX: false } }) }).project;
  p = applyOperation(p, { kind: 'instance.add', instance: newInstance({ assetVersionId: imported.version.id, name: 'Haus', transform: { position: [10, 0, 0], quarterTurns: 0, mirrorX: false } }) }).project;
  p = freezeRevision(p, 'erste').project;
  return {
    projects: [{ ...p, revision: 1 }], assets: [...lib.assets, imported.asset], versions: [...lib.versions, imported.version],
    originalHashes: [sha], getOriginal: async h => h === sha ? original : null, imported,
  };
}
const codes = r => r.findings.map(f => f.code).sort();

test('healthy store: no findings, counts reported', async () => {
  const s = await healthy();
  const r = await checkIntegrity(s, () => new Date('2026-10-28T12:00:00Z'));
  assert.deepEqual(r.findings, []);
  assert.equal(r.ok, true); assert.equal(r.checkedAt, '2026-10-28T12:00:00.000Z');
  assert.deepEqual(r.counts, { projects: 1, assets: lib.assets.length + 1, versions: lib.versions.length + 1, originals: 1 });
});

test('tampered payload is found by recomputing the content address', async () => {
  const s = await healthy();
  const bad = structuredClone(s.imported.version);
  bad.payload.palette[0] = { id: 'minecraft:diamond_block', properties: {} };
  const r = await checkIntegrity({ ...s, versions: [...lib.versions, bad] });
  assert.equal(r.ok, false);
  assert.deepEqual(codes(r), ['VERSION_HASH']);
  assert.match(r.findings[0].message, /Payload-Hash stimmt nicht/);
});

test('project referencing a missing version is an error; frozen revisions count too', async () => {
  const s = await healthy();
  const r = await checkIntegrity({ ...s, versions: lib.versions, assets: lib.assets, originalHashes: [] });
  assert.deepEqual(codes(r), ['MISSING_VERSION']);
  assert.equal(r.findings[0].subject.name, 'Burg');
  // Remove the instance from the working copy: the frozen revision still needs the version.
  const p = s.projects[0];
  const onlyRevision = { ...p, instances: p.instances.filter(i => i.assetVersionId === tower.id), links: [] };
  const r2 = await checkIntegrity({ ...s, projects: [onlyRevision], versions: lib.versions, assets: lib.assets, originalHashes: [] });
  assert.deepEqual(codes(r2), ['MISSING_VERSION']);
});

test('asset/version bookkeeping: missing listed version, orphan version, unlisted version', async () => {
  const s = await healthy();
  const withoutAsset = await checkIntegrity({ ...s, assets: lib.assets });
  assert.deepEqual(codes(withoutAsset), ['VERSION_WITHOUT_ASSET']);
  assert.equal(withoutAsset.ok, true, 'warnings alone keep the store usable');
  const unlisted = await checkIntegrity({ ...s, assets: [...lib.assets, { ...s.imported.asset, versionIds: [] }] });
  assert.deepEqual(codes(unlisted), ['VERSION_NOT_LISTED']);
  const ghost = await checkIntegrity({ ...s, assets: [...lib.assets, { ...s.imported.asset, versionIds: [...s.imported.asset.versionIds, 'av_fehlt'] }] });
  assert.deepEqual(codes(ghost), ['ASSET_VERSION_MISSING']);
});

test('originals: missing, corrupted bytes and unused files', async () => {
  const s = await healthy();
  const missing = await checkIntegrity({ ...s, originalHashes: [] });
  assert.deepEqual(codes(missing), ['ORIGINAL_MISSING']);
  const broken = await checkIntegrity({ ...s, getOriginal: async () => ({ ...original, bytes: new Uint8Array([1, 2, 3]) }) });
  assert.deepEqual(codes(broken), ['ORIGINAL_HASH']); assert.equal(broken.ok, false);
  const unused = await checkIntegrity({ ...s, originalHashes: [sha, 'ab'.repeat(32)], getOriginal: undefined });
  assert.deepEqual(codes(unused), ['ORIGINAL_UNUSED']);
  assert.equal(unused.findings[0].severity, 'info');
  const unreadable = await checkIntegrity({ ...s, getOriginal: async () => { throw new Error('Blob weg'); } });
  assert.deepEqual(codes(unreadable), ['ORIGINAL_MISSING']); assert.match(unreadable.findings[0].message, /Blob weg/);
});

test('broken project record is reported and does not stop the remaining checks', async () => {
  const s = await healthy();
  const p = s.projects[0];
  const broken = { ...p, revision: -1 };
  const dangling = { ...p, id: 'p2', links: [{ id: 'l1', a: { instanceId: 'nope', connectorId: 'c' }, b: { instanceId: p.instances[0].id, connectorId: 'c' } }] };
  const disordered = { ...p, id: 'p3', revisions: [{ ...p.revisions[0], number: 2 }, { ...p.revisions[0], number: 1 }] };
  const r = await checkIntegrity({ ...s, projects: [broken, dangling, disordered], originalHashes: [] });
  assert.deepEqual(codes(r), ['ORIGINAL_MISSING', 'PROJECT_RECORD', 'PROJECT_RECORD', 'REVISION_ORDER']);
  assert.equal(r.findings[0].severity, 'error', 'errors are listed first');
  assert.equal(r.errors, 2); assert.equal(r.warnings, 2);
});

test('the check never mutates its input', async () => {
  const s = await healthy();
  const before = JSON.stringify([s.projects, s.assets, s.versions.map(v => v.id), s.originalHashes]);
  await checkIntegrity(s);
  assert.equal(JSON.stringify([s.projects, s.assets, s.versions.map(v => v.id), s.originalHashes]), before);
});
