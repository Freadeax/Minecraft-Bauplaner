import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createAsset, updateAssetMeta, addAssetVersion, sampleWallPayload, createBackup, readBackup, planRestore, buildRestore, canonicalJson, checkAssetRecord } from '../../../dist/domain/src/index.js';
import { MemoryRepository, AssetRevisionConflictError } from '../../../dist/application/src/index.js';

const fresh = () => createAsset({ name: 'Eigene Mauer', provenance: { author: 'Test', source: 'eigener Entwurf', license: 'Test' } });
const target = async repo => ({ projects: [], assets: await repo.listAssets(), versionIds: new Set((await repo.listVersions()).map(v => v.id)), originalHashes: new Set() });
const backupOf = async (asset, versions = []) => readBackup(JSON.stringify(await createBackup({ projects: [], assets: [asset], versions: new Map(versions.map(v => [v.id, v])), getOriginal: async () => null }, 'all')));

test('asset edits retain the storage base; legacy revision is accepted without changing source bytes', () => {
  const asset = { ...fresh(), revision: 9 };
  assert.equal(updateAssetMeta(asset, { tags: ['haus'] }).revision, 9);
  const legacy = { ...asset }; delete legacy.revision;
  const before = JSON.stringify(legacy);
  assert.equal(checkAssetRecord(legacy), legacy);
  assert.equal(JSON.stringify(legacy), before);
  for (const revision of [-1, .5, NaN, Infinity, '1', null, Number.MAX_SAFE_INTEGER + 1])
    assert.throws(() => checkAssetRecord({ ...legacy, revision }), /Speicherrevision/);
});

test('checksummed legacy backups remain readable; restoring to another store starts a local revision', async () => {
  const asset = { ...fresh(), revision: 23 };
  const file = await createBackup({ projects: [], assets: [asset], versions: new Map(), getOriginal: async () => null }, 'all');
  const legacy = structuredClone(file); delete legacy.assets[0].revision;
  legacy.contentSha256 = createHash('sha256').update(canonicalJson({ projects: legacy.projects, assets: legacy.assets, versions: legacy.versions, originals: legacy.originals })).digest('hex');
  assert.equal((await readBackup(JSON.stringify(legacy))).assets[0].revision, undefined);
  const repo = new MemoryRepository();
  const write = buildRestore(planRestore(await backupOf(asset), await target(repo)));
  assert.equal(write.assets[0].revision, 0);
  await repo.applyBatch(write);
  assert.equal((await repo.listAssets())[0].revision, 1);
  assert.equal(buildRestore(planRestore(await backupOf(asset), await target(repo))).assets.length, 0, 'different local revisions alone are not content changes');
});

test('a stale restore merge cannot erase newer metadata or leave orphan versions', async () => {
  const repo = new MemoryRepository();
  await repo.saveAsset(fresh());
  const base = (await repo.listAssets())[0];
  const added = await addAssetVersion(base, { payload: sampleWallPayload(), label: '1.0', source: { format: 'demo' } });
  const restore = buildRestore(planRestore(await backupOf(added.asset, [added.version]), await target(repo)));
  assert.equal(restore.assets[0].revision, base.revision);
  await repo.saveAsset(updateAssetMeta(base, { name: 'In anderem Tab umbenannt' }));
  await assert.rejects(repo.applyBatch(restore), e => e instanceof AssetRevisionConflictError);
  assert.equal((await repo.listAssets())[0].name, 'In anderem Tab umbenannt');
  assert.deepEqual((await repo.listAssets())[0].versionIds, []);
  assert.deepEqual(await repo.listVersions(), []);
});
