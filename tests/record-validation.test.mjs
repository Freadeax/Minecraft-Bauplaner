import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAsset, createBuildingLibrary, createSampleLibrary, createBackup, readBackup, addAssetVersion, sampleWallPayload, canonicalJson, sha256Hex } from '../dist/domain/src/index.js';
import { assertAssetRecordFields, validateOriginalManifest } from '../dist/domain/src/recordValidation.js';

const fresh = () => createAsset({ name: 'Haus', provenance: { author: '', source: '', license: '' } });
const sha = 'ab'.repeat(32), other = 'cd'.repeat(32);
const rehash = async file => ({ ...file, contentSha256: await sha256Hex(canonicalJson({ projects: file.projects, assets: file.assets, versions: file.versions, originals: file.originals })) });

test('asset validation preserves current records, empty optional text and all shipped asset metadata', async () => {
  const a = fresh();
  assert.doesNotThrow(() => assertAssetRecordFields(a));
  const before = JSON.stringify(a);
  assertAssetRecordFields(a);
  assert.equal(JSON.stringify(a), before);
  for (const library of [await createSampleLibrary(), await createBuildingLibrary()])
    for (const asset of library.assets) assert.doesNotThrow(() => assertAssetRecordFields(asset), asset.id);
});

test('asset validation rejects every missing UI-consumed field before persistence', () => {
  for (const field of ['id', 'name', 'description', 'tags', 'provenance', 'archived', 'demo', 'versionIds', 'createdAt', 'updatedAt']) {
    const invalid = { ...fresh() }; delete invalid[field];
    assert.throws(() => assertAssetRecordFields(invalid), e => e.code === 'BACKUP', field);
  }
  for (const field of ['author', 'source', 'license'])
    assert.throws(() => assertAssetRecordFields({ ...fresh(), provenance: { ...fresh().provenance, [field]: 42 } }), /erwartet/);
  for (const patch of [{ tags: [null] }, { tags: ['x', 'x'] }, { tags: ['x'.repeat(41)] }, { versionIds: ['v', 'v'] },
    { versionIds: [''] }, { archived: 'false' }, { demo: 0 }, { createdAt: 'kein Datum' }, { name: ' ' }, { description: 'x'.repeat(2001) }])
    assert.throws(() => assertAssetRecordFields({ ...fresh(), ...patch }), e => e.code === 'BACKUP');
});

test('original manifest derives warnings from all references even when declared list is removed or inaccurate', () => {
  assert.deepEqual(validateOriginalManifest([sha, sha, other], [{ sha256: sha }], []), [other]);
  assert.deepEqual(validateOriginalManifest([sha], [], []), [sha]);
  assert.deepEqual(validateOriginalManifest([sha], [{ sha256: sha }], [sha]), []);
  assert.deepEqual(validateOriginalManifest([], [], [sha]), []);
  assert.throws(() => validateOriginalManifest([sha], [{ sha256: sha }, { sha256: sha }], []), /doppelt/);
  assert.throws(() => validateOriginalManifest(['bad'], [], []), /SHA-256/);
  assert.throws(() => validateOriginalManifest([], [], ['bad']), /SHA-256/);
  assert.throws(() => validateOriginalManifest([], [], {}), /Liste/);
});

test('backup reader rejects a checksummed malformed asset rather than restoring a future library crash', async () => {
  const asset = fresh();
  const source = { projects: [], assets: [asset], versions: new Map(), getOriginal: async () => null };
  const file = structuredClone(await createBackup(source, 'all'));
  delete file.assets[0].tags;
  await assert.rejects(readBackup(JSON.stringify(await rehash(file))), e => e.code === 'BACKUP');
});

test('backup reader restores missing-original warning even if the unhashed list was erased', async () => {
  const { asset, version } = await addAssetVersion(fresh(), { payload: sampleWallPayload(), source: { format: 'schem-v3', originalSha256: sha } });
  const file = await createBackup({ projects: [], assets: [asset], versions: new Map([[version.id, version]]), getOriginal: async () => null }, 'all');
  assert.deepEqual(file.missingOriginals, [sha]);
  const modified = { ...file, missingOriginals: [] };
  const restored = await readBackup(JSON.stringify(modified));
  assert.deepEqual(restored.missingOriginals, [sha]);
});
