import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createBackup, readBackup, planRestore, buildRestore, backupFileName, checkSchemaVersion, checkProjectRecord,
  createSampleLibrary, createAsset, addAssetVersion, sampleWallPayload, createProject, applyOperation, newInstance, freezeRevision,
  sha256Hex, toBase64, fromBase64, canonicalJson, BACKUP_FORMAT,
} from '../dist/domain/src/index.js';

const lib = await createSampleLibrary();
const versions = new Map(lib.versions.map(v => [v.id, v]));
const byAsset = id => lib.versions.find(v => v.assetId === id);
const tower = byAsset('sample_tower'), wall = byAsset('sample_wall');

// Independent original bytes and their expected SHA-256 computed by Node's crypto module, not by the code under test.
const { createHash } = await import('node:crypto');
const originalBytes = new Uint8Array([0x1f, 0x8b, 8, 0, 1, 2, 3, 250, 0, 255]);
const originalSha = createHash('sha256').update(originalBytes).digest('hex');

async function importedAsset() {
  const asset = createAsset({ name: 'Importiertes Haus', provenance: { author: 'Test', source: 'haus.schem', license: '' } });
  const r = await addAssetVersion(asset, { payload: sampleWallPayload(), label: '1.0', source: { format: 'schem-v3', fileName: 'haus.schem', originalSha256: originalSha } });
  return r;
}

function project(name, ...placed) {
  let p = createProject({ name });
  for (const [version, x] of placed) p = applyOperation(p, { kind: 'instance.add', instance: newInstance({ assetVersionId: version.id, name: version.assetId, transform: { position: [x, 0, 0], quarterTurns: 0, mirrorX: false } }) }).project;
  return { ...p, revision: 3 };
}

async function fixture() {
  const imported = await importedAsset();
  const allVersions = new Map([...versions, [imported.version.id, imported.version]]);
  const original = { sha256: originalSha, fileName: 'haus.schem', mediaType: 'application/octet-stream', size: originalBytes.length, createdAt: '2026-10-27T00:00:00.000Z', bytes: originalBytes };
  const a = project('Burg', [tower, 0], [imported.version, 10]);
  const b = project('Nur Mauer', [wall, 0]);
  return { imported, allVersions, original, a, b,
    source: { projects: [a, b], assets: [...lib.assets, imported.asset], versions: allVersions, getOriginal: async sha => sha === originalSha ? original : null } };
}

test('Base64 roundtrip is byte exact including high bytes and large chunks', () => {
  const big = new Uint8Array(70_000).map((_, i) => (i * 31) & 255);
  assert.deepEqual(fromBase64(toBase64(big)), big);
  assert.equal(toBase64(new Uint8Array([0, 255, 128])), Buffer.from([0, 255, 128]).toString('base64'));
});

test('project backup is self-contained: used versions, complete asset histories and originals', async () => {
  const f = await fixture();
  const file = await createBackup(f.source, 'project', [f.a.id]);
  assert.equal(file.format, BACKUP_FORMAT);
  assert.deepEqual(file.projects.map(p => p.id), [f.a.id]);
  assert.deepEqual(file.assets.map(a => a.id).sort(), [f.imported.asset.id, 'sample_tower'].sort());
  assert.equal(file.versions.length, 2);
  assert.equal(file.originals.length, 1);
  assert.equal(file.originals[0].sha256, originalSha);
  assert.equal(Buffer.from(file.originals[0].base64, 'base64').toString('hex'), Buffer.from(originalBytes).toString('hex'));
  assert.deepEqual(file.missingOriginals, []);
  assert.match(backupFileName(file), /^bauplaner-burg-\d{4}-\d{2}-\d{2}\.bauplaner\.json$/);
  // Independent check of the content hash with Node crypto over the canonical JSON.
  const expected = createHash('sha256').update(canonicalJson({ projects: file.projects, assets: file.assets, versions: file.versions, originals: file.originals })).digest('hex');
  assert.equal(file.contentSha256, expected);
});

test('frozen revisions keep their versions in the backup', async () => {
  const f = await fixture();
  const frozen = freezeRevision(f.b, 'Stand 1').project;
  const swapped = applyOperation(frozen, { kind: 'instance.remove', instanceId: frozen.instances[0].id }).project;
  const file = await createBackup({ ...f.source, projects: [swapped] }, 'project', [swapped.id]);
  assert.ok(file.versions.some(v => v.id === wall.id), 'version only used by a frozen revision must be included');
});

test('missing originals are listed, never invented; missing versions abort', async () => {
  const f = await fixture();
  const file = await createBackup({ ...f.source, getOriginal: async () => null }, 'project', [f.a.id]);
  assert.deepEqual(file.missingOriginals, [originalSha]);
  assert.equal(file.originals.length, 0);
  await assert.rejects(createBackup({ ...f.source, versions: versions }, 'project', [f.a.id]), /fehlende Version/);
  await assert.rejects(createBackup(f.source, 'project', ['project_unknown']), /nicht gefunden/);
});

test('damaged local data aborts the backup', async () => {
  const f = await fixture();
  await assert.rejects(createBackup({ ...f.source, getOriginal: async () => ({ ...f.original, bytes: new Uint8Array([1, 2, 3]) }) }, 'project', [f.a.id]), /beschädigt/);
  const tampered = new Map(f.allVersions); tampered.set(tower.id, { ...tower, label: 'manipuliert' });
  await assert.rejects(createBackup({ ...f.source, versions: tampered }, 'project', [f.a.id]), /Kennung|Hash/);
});

test('full backup roundtrip restores into an empty store exactly', async () => {
  const f = await fixture();
  const file = await createBackup(f.source, 'all');
  const backup = await readBackup(JSON.stringify(file));
  assert.equal(backup.projects.length, 2);
  assert.deepEqual(backup.originals[0].bytes, originalBytes);
  const plan = planRestore(backup, { projects: [], assets: [], versionIds: new Set(), originalHashes: new Set() });
  const write = buildRestore(plan);
  assert.deepEqual(write.projects.map(p => [p.project.id, p.baseRevision]).sort(), [[f.a.id, 0], [f.b.id, 0]].sort());
  assert.equal(write.versions.length, file.versions.length);
  assert.equal(write.originals.length, 1);
  assert.deepEqual(write.projects.find(p => p.project.id === f.a.id).project.instances, f.a.instances);
});

test('readBackup rejects tampering, truncation, foreign files and newer formats', async () => {
  const f = await fixture();
  const file = await createBackup(f.source, 'all');
  const text = JSON.stringify(file);
  await assert.rejects(readBackup(text.slice(0, -20)), /kein JSON/);
  await assert.rejects(readBackup('{"hello":1}'), /Keine Minecraft-Bauplaner-Sicherung/);
  await assert.rejects(readBackup(JSON.stringify({ ...file, formatVersion: 99 })), e => e.code === 'SCHEMA_NEWER');
  const renamed = structuredClone(file); renamed.projects[0].name = 'Heimlich geändert';
  await assert.rejects(readBackup(JSON.stringify(renamed)), /Prüfsumme/);
  // A consistent rehash still fails when a version or original is altered.
  const rehash = async c => ({ ...c, contentSha256: await sha256Hex(canonicalJson({ projects: c.projects, assets: c.assets, versions: c.versions, originals: c.originals })) });
  const badVersion = structuredClone(file); badVersion.versions[0].label = 'x';
  await assert.rejects(readBackup(JSON.stringify(await rehash(badVersion))), /Kennung|Hash/);
  const badOriginal = structuredClone(file); badOriginal.originals[0].base64 = toBase64(new Uint8Array([9, 9, 9]));
  await assert.rejects(readBackup(JSON.stringify(await rehash(badOriginal))), /beschädigt/);
  const incomplete = structuredClone(file); incomplete.versions = incomplete.versions.filter(v => v.assetId !== 'sample_tower');
  await assert.rejects(readBackup(JSON.stringify(await rehash(incomplete))), /Unvollständig/);
  const newerProject = structuredClone(file); newerProject.projects[0].schemaVersion = 2;
  await assert.rejects(readBackup(JSON.stringify(await rehash(newerProject))), e => e.code === 'SCHEMA_NEWER');
  const brokenLink = structuredClone(file); brokenLink.projects[0].links = [{ id: 'l', a: { instanceId: 'nope', connectorId: 'x' }, b: { instanceId: 'nope', connectorId: 'y' } }];
  await assert.rejects(readBackup(JSON.stringify(await rehash(brokenLink))), /fehlende Instanz/);
  const badTransform = structuredClone(file); badTransform.projects[0].instances[0].transform.quarterTurns = 5;
  await assert.rejects(readBackup(JSON.stringify(await rehash(badTransform))), /Projekt/);
});

test('restore never overwrites silently: identical skipped, differing copied by default', async () => {
  const f = await fixture();
  const backup = await readBackup(JSON.stringify(await createBackup(f.source, 'all')));
  const changedLocal = { ...f.a, name: 'Burg lokal weiter bearbeitet', revision: 7 };
  const sameLocal = { ...f.b, revision: 12, updatedAt: '2030-01-01T00:00:00.000Z' };
  const target = { projects: [changedLocal, sameLocal], assets: [...lib.assets], versionIds: new Set(versions.keys()), originalHashes: new Set() };
  const plan = planRestore(backup, target);
  assert.deepEqual(Object.fromEntries(plan.projects.map(p => [p.project.id, p.status])), { [f.a.id]: 'differs', [f.b.id]: 'same' });
  assert.deepEqual(plan.newVersions.map(v => v.id), [f.imported.version.id]);

  const copy = buildRestore(plan);
  assert.equal(copy.projects.length, 1);
  assert.notEqual(copy.projects[0].project.id, f.a.id);
  assert.equal(copy.projects[0].baseRevision, 0);
  assert.match(copy.projects[0].project.name, /^Burg \(Wiederhergestellt /);
  assert.ok(copy.summary.some(s => /Original unverändert/.test(s)));
  assert.ok(copy.summary.some(s => /identisch vorhanden/.test(s)));

  const replace = buildRestore(plan, { [f.a.id]: 'replace' });
  assert.deepEqual(replace.projects.map(p => [p.project.id, p.baseRevision]), [[f.a.id, 7]]);
  assert.equal(buildRestore(plan, { [f.a.id]: 'skip' }).projects.length, 0);
});

test('existing assets keep local metadata; only missing versions are appended', async () => {
  const f = await fixture();
  const backup = await readBackup(JSON.stringify(await createBackup(f.source, 'all')));
  const localImported = { ...f.imported.asset, name: 'Lokal umbenannt', versionIds: [] };
  const plan = planRestore(backup, { projects: [], assets: [...lib.assets, localImported], versionIds: new Set(versions.keys()), originalHashes: new Set([originalSha]) });
  const entry = plan.assets.find(a => a.asset.id === f.imported.asset.id);
  assert.equal(entry.status, 'merge');
  const write = buildRestore(plan);
  const merged = write.assets.find(a => a.id === f.imported.asset.id);
  assert.equal(merged.name, 'Lokal umbenannt');
  assert.deepEqual(merged.versionIds, [f.imported.version.id]);
  assert.equal(write.originals.length, 0, 'originals already stored are not written again');
  assert.ok(!write.assets.some(a => a.id === 'sample_tower'), 'identical sample assets are not rewritten');
});

test('schema guard distinguishes newer from unknown records', () => {
  assert.doesNotThrow(() => checkSchemaVersion('X', { schemaVersion: 1 }));
  assert.throws(() => checkSchemaVersion('X', { schemaVersion: 2 }), e => e.code === 'SCHEMA_NEWER');
  assert.throws(() => checkSchemaVersion('X', {}), e => e.code === 'SCHEMA');
  assert.throws(() => checkProjectRecord({ schemaVersion: 1, name: 'x' }), /ID/);
});
