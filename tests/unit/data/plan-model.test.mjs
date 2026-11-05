// ARCH-02 / STORE-03: compact block data storage and the shared reference graph.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  createSampleLibrary, createBuildingLibrary, createAsset, addAssetVersion, sampleWallPayload, canonicalJson, verifyAssetVersion,
  packVersion, unpackVersion, unpackVersionOrDamaged, isPackedVersionRecord, cellStorageEstimate,
  createBackup, readBackup, serializeBackup, BACKUP_FORMAT_VERSION, BACKUP_FORMAT_VERSION_PACKED,
  applyOperation, createProject, newInstance, freezeRevision, resolveProject, buildGuide, evaluateProgress, emptySite, addSection, siteOperation, freezeSection,
  buildPlanGraph, whereUsed, projectVersionIds, referencedVersionIds, checkIntegrity,
  createCollection, addToCollection, templateFromProject,
} from '../../../dist/domain/src/index.js';
import { packCells, unpackCells, PACKED_CELLS_ENCODING } from '../../../dist/voxel/src/index.js';

const bounds = (min, max) => ({ min, maxExclusive: max });
const sameCells = (a, b) => assert.equal(JSON.stringify(a), JSON.stringify(b));

// ---------------------------------------------------------------------------
// Codec

test('packCells: hand-checked bytes for a run, an air cell and an erase cell', () => {
  const payload = { bounds: bounds([0, 0, 0], [4, 1, 1]), cells: [
    { position: [0, 0, 0], kind: 'block', paletteIndex: 1 }, { position: [1, 0, 0], kind: 'block', paletteIndex: 1 },
    { position: [3, 0, 0], kind: 'air', paletteIndex: 0 }, { position: [2, 0, 0], kind: 'erase' },
  ] };
  const p = packCells(payload);
  // run 1: delta 0−(−1)=1 → zz 2, tag 2+2·1=4, run−1=1 · run 2: delta 3−1=2 → zz 4, tag 1, 0 · run 3: delta 2−3=−1 → zz 1, tag 0, 0
  assert.deepEqual([...p.bytes], [2, 4, 1, 4, 1, 0, 1, 0, 0]);
  assert.equal(p.encoding, PACKED_CELLS_ENCODING); assert.equal(p.count, 4);
  sameCells(unpackCells(payload.bounds, p), payload.cells);
});

test('packCells keeps any cell order, negative bounds and indices beyond 32 bit', () => {
  const b = bounds([-5, -64, -7], [300_000, 320, 300_000]);
  const cells = [
    { position: [299_999, 319, 299_999], kind: 'block', paletteIndex: 70_000 },
    { position: [-5, -64, -7], kind: 'air', paletteIndex: 0 },
    { position: [12, 0, -3], kind: 'erase' },
    { position: [13, 0, -3], kind: 'erase' },
    { position: [11, 0, -3], kind: 'block', paletteIndex: 2 },
  ];
  const p = packCells({ bounds: b, cells });
  assert.ok(p);
  sameCells(unpackCells(b, p), cells);
});

test('packCells refuses what it cannot reproduce exactly', () => {
  const b = bounds([0, 0, 0], [2, 2, 2]);
  assert.equal(packCells({ bounds: b, cells: [{ position: [2, 0, 0], kind: 'block', paletteIndex: 0 }] }), null, 'outside bounds');
  assert.equal(packCells({ bounds: b, cells: [{ position: [0, 0, 0], kind: 'block', paletteIndex: 0, extra: 1 }] }), null, 'extra key');
  assert.equal(packCells({ bounds: b, cells: [{ position: [0.5, 0, 0], kind: 'block', paletteIndex: 0 }] }), null, 'fractional');
  assert.equal(packCells({ bounds: b, cells: [{ position: [0, 0, 0], kind: 'stone', paletteIndex: 0 }] }), null, 'unknown kind');
  assert.equal(packCells({ bounds: b, cells: [{ position: [0, 0, 0], kind: 'erase', paletteIndex: 0 }] }), null, 'erase with palette index');
});

test('unpackCells rejects truncated, out-of-bounds and miscounted data', () => {
  const b = bounds([0, 0, 0], [2, 1, 1]);
  const ok = packCells({ bounds: b, cells: [{ position: [0, 0, 0], kind: 'block', paletteIndex: 0 }, { position: [1, 0, 0], kind: 'block', paletteIndex: 0 }] });
  assert.throws(() => unpackCells(b, { ...ok, bytes: ok.bytes.slice(0, 2) }), /mitten in einem Eintrag/);
  assert.throws(() => unpackCells(b, { ...ok, bytes: new Uint8Array([2, 2, 5]) }), /außerhalb/);
  assert.throws(() => unpackCells(b, { ...ok, count: 3 }), /2 statt 3/);
  assert.throws(() => unpackCells(b, { ...ok, count: 1 }), /mehr Zellen/);
  assert.throws(() => unpackCells(b, { ...ok, bytes: new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 1]) }), /zu groß/);
  assert.throws(() => unpackCells(b, { ...ok, encoding: 'x' }), /unbekannte Kodierung/);
});

test('whole shipped catalogue: exact roundtrip, unchanged ids and hashes, far smaller', async () => {
  const [samples, buildings] = await Promise.all([createSampleLibrary(), createBuildingLibrary()]);
  const all = [...samples.versions, ...buildings.versions];
  for (const v of all) {
    const stored = packVersion(v);
    assert.equal(isPackedVersionRecord(stored), true, v.id);
    assert.equal('cells' in stored.payload, false);
    const back = unpackVersion(structuredClone(stored));
    assert.equal(canonicalJson(back), canonicalJson(v), v.id);
  }
  await verifyAssetVersion(unpackVersion(structuredClone(packVersion(all.at(-1)))));
  const est = cellStorageEstimate(all);
  assert.equal(est.unpackable, 0);
  assert.ok(est.plainBytes / est.packedBytes > 20, `factor ${est.plainBytes / est.packedBytes}`);
});

test('unpackVersion: plain records pass, packed record with extra cell list is rejected', async () => {
  const lib = await createSampleLibrary();
  const v = lib.versions[0];
  assert.equal(unpackVersion(v), v);
  const stub = { schemaVersion: 1, id: 'legacy', payloadHash: 'x', assetId: 'a' };
  assert.equal(packVersion(stub), stub, 'incomplete legacy record is left for the read checks');
  const stored = packVersion(v);
  assert.throws(() => unpackVersion({ ...stored, payload: { ...stored.payload, cells: [] } }), /zusätzlich eine Zellliste/);
  assert.throws(() => unpackVersion({ ...stored, packedCells: { ...stored.packedCells, count: stored.packedCells.count + 1 } }), err => err.code === 'STORAGE');
  // Storage read: a damaged record stays visible with no cells; its content address no longer matches.
  const damaged = unpackVersionOrDamaged({ ...stored, packedCells: { ...stored.packedCells, count: stored.packedCells.count + 1 } });
  assert.deepEqual(damaged.payload.cells, []);
  await assert.rejects(verifyAssetVersion(damaged), /Payload-Hash/);
});

// ---------------------------------------------------------------------------
// Backup format 3

const lib = await createSampleLibrary();
const versions = new Map(lib.versions.map(v => [v.id, v]));
const latest = id => lib.versions.find(v => v.assetId === id).id;
const at = (assetVersionId, name, position) => newInstance({ assetVersionId, name, transform: { position, quarterTurns: 0, mirrorX: false } });
const run = (p, op) => applyOperation(p, op).project;
const add = (p, ...instances) => run(p, { kind: 'batch', label: 't', operations: instances.map(instance => ({ kind: 'instance.add', instance })) });

test('serializeBackup writes format 3; readBackup returns the same logical content and checksum', async () => {
  const p = { ...add(createProject({ name: 'Burg' }), at(latest('sample_tower'), 'Turm', [0, 0, 0])), revision: 1 };
  const file = await createBackup({ projects: [p], assets: lib.assets, versions, getOriginal: async () => null }, 'project', [p.id]);
  assert.equal(file.formatVersion, BACKUP_FORMAT_VERSION);
  const text = serializeBackup(file), raw = JSON.parse(text);
  assert.equal(raw.formatVersion, BACKUP_FORMAT_VERSION_PACKED); assert.equal(raw.baseFormatVersion, BACKUP_FORMAT_VERSION);
  assert.equal(raw.contentSha256, file.contentSha256);
  assert.ok(raw.versions.every(v => typeof v.packedCells.base64 === 'string' && !('cells' in v.payload)));
  assert.ok(text.length < JSON.stringify(file).length / 2, `packed ${text.length} vs ${JSON.stringify(file).length}`);
  const back = await readBackup(text);
  assert.equal(canonicalJson(back.versions), canonicalJson([...file.versions]));
  // Plain format 1 text stays readable.
  assert.equal((await readBackup(JSON.stringify(file))).versions.length, file.versions.length);
});

test('format 3: tampered packed cells and unknown base format are rejected', async () => {
  const p = { ...add(createProject({ name: 'Burg' }), at(latest('sample_wall'), 'Mauer', [0, 0, 0])), revision: 1 };
  const file = await createBackup({ projects: [p], assets: lib.assets, versions, getOriginal: async () => null }, 'project', [p.id]);
  const raw = JSON.parse(serializeBackup(file));
  const v = raw.versions[0], bytes = Buffer.from(v.packedCells.base64, 'base64');
  bytes[1] ^= 2; // different palette index for the first run
  v.packedCells.base64 = bytes.toString('base64');
  await assert.rejects(readBackup(JSON.stringify(raw)), /Prüfsumme|Payload-Hash|Gepackte Blockdaten/);
  const other = JSON.parse(serializeBackup(file)); other.baseFormatVersion = 9;
  await assert.rejects(readBackup(JSON.stringify(other)), /unbekanntes Grundformat 9/);
  const newer = JSON.parse(serializeBackup(file)); newer.formatVersion = 4;
  await assert.rejects(readBackup(JSON.stringify(newer)), err => err.code === 'SCHEMA_NEWER');
});

// ---------------------------------------------------------------------------
// Reference graph

const derive = project => { const guide = buildGuide(project, resolveProject(project, versions)); return { guide, progress: evaluateProgress(guide, project.progress) }; };

async function scene() {
  const asset = createAsset({ name: 'Haus', provenance: { author: 'Test', source: 'eigener Entwurf', license: '' } });
  const haus = await addAssetVersion(asset, { payload: sampleWallPayload(), label: '1.0', source: { format: 'voxel-json' } });
  const all = new Map([...versions, [haus.version.id, haus.version]]);
  let p = add(createProject({ name: 'Burg' }), at(latest('sample_tower'), 'Turm', [0, 0, 0]), at(haus.version.id, 'Haus', [10, 0, 0]));
  const [, hausInstance] = p.instances;
  p = run(p, siteOperation(addSection(emptySite(), 'Dorf', [{ instanceId: hausInstance.id }], 'dorf'), 'Abschnitt'));
  const guide = buildGuide(p, resolveProject(p, all));
  const { site } = freezeSection({ site: p.site, project: p, guide, progress: evaluateProgress(guide, p.progress), sectionId: 'dorf', label: 'vorher', at: '2026-11-02T08:00:00.000Z', id: 'snap_1' });
  p = run(p, siteOperation(site, 'eingefroren'));
  // The house leaves the plan; only the section snapshot still remembers it.
  p = run(p, { kind: 'instance.remove', instanceId: hausInstance.id });
  p = freezeRevision(p, 'r1').project;
  return { p: { ...p, revision: 3 }, haus, all, assets: [...lib.assets, haus.asset] };
}

test('project edges: required (instances, revisions) vs history (section snapshot)', async () => {
  const { p, haus } = await scene();
  assert.deepEqual([...referencedVersionIds(p)].sort(), [latest('sample_tower')]);
  assert.deepEqual([...projectVersionIds(p, true)].sort(), [latest('sample_tower')]);
  assert.deepEqual([...projectVersionIds(p)].sort(), [haus.version.id, latest('sample_tower')].sort());
});

test('createBackup now also carries versions only a section snapshot needs', async () => {
  const { p, haus, all, assets } = await scene();
  const file = await createBackup({ projects: [p], assets, versions: all, getOriginal: async () => null }, 'project', [p.id]);
  assert.ok(file.versions.some(v => v.id === haus.version.id), 'snapshot version included');
  assert.ok(file.assets.some(a => a.id === haus.asset.id));
  // Without that version locally the backup still succeeds (history reference is optional).
  const without = new Map([...all].filter(([id]) => id !== haus.version.id));
  const partial = await createBackup({ projects: [p], assets: lib.assets, versions: without, getOriginal: async () => null }, 'project', [p.id]);
  assert.equal(partial.versions.some(v => v.id === haus.version.id), false);
  await readBackup(serializeBackup(partial));
});

test('whereUsed: project (via snapshot), template and collection; grouped per user', async () => {
  const { p, haus, all, assets } = await scene();
  const tpl = templateFromProject(add(createProject({ name: 'Hof' }), at(haus.version.id, 'Haus A', [0, 0, 0]), at(haus.version.id, 'Haus B', [8, 0, 0])), { name: 'Hofvorlage' });
  const col = addToCollection(createCollection({ name: 'Favoriten', id: 'col_fav' }), { kind: 'asset', assetId: haus.asset.id });
  const graph = buildPlanGraph({ projects: [p], assets, versions: [...all.values()], collections: [col], templates: [tpl] });
  const used = whereUsed(graph, { kind: 'asset', id: haus.asset.id });
  assert.deepEqual(used.map(g => `${g.from.kind}:${g.roles.join('+')}`), ['project:section-snapshot', 'template:template-member', 'collection:collection-asset']);
  assert.match(used[0].details[0], /Dorf · Stand 1/);
  assert.equal(used[1].details.length, 2, 'both template members named');
  assert.deepEqual(graph.dangling, []);
  assert.deepEqual(whereUsed(graph, { kind: 'asset', id: 'sample_gate' }), []);
});

test('data check reports dangling history, collection and template references with the right severity', async () => {
  const { p, haus, assets } = await scene();
  const tpl = templateFromProject(add(createProject({ name: 'Hof' }), at(haus.version.id, 'Haus A', [0, 0, 0])), { name: 'Hofvorlage' });
  const col = addToCollection(addToCollection(createCollection({ name: 'Favoriten', id: 'col_fav' }), { kind: 'asset', assetId: 'bld_weg' }), { kind: 'template', templateId: 'tpl_weg' });
  // The house version is gone (and with it its asset): snapshot and template now dangle.
  const r = await checkIntegrity({ projects: [p], assets: assets.filter(a => a.id !== haus.asset.id), versions: lib.versions, originalHashes: [], collections: [col], templates: [tpl] });
  const dangling = r.findings.filter(f => f.code === 'DANGLING_REFERENCE').map(f => `${f.severity}:${f.subject.kind}:${f.message.split(' ')[0]}`).sort();
  assert.deepEqual(dangling, ['error:template:Vorlagenmitglied', 'warning:collection:Sammlungseintrag', 'warning:collection:Vorlage', 'warning:project:Abschnittsstand']);
  assert.equal(r.ok, false, 'a template that cannot be taken over is an error');
  const healthy = await checkIntegrity({ projects: [p], assets, versions: [...lib.versions, haus.version], originalHashes: [], collections: [], templates: [tpl] });
  assert.deepEqual(healthy.findings, []);
});

test('version edges: original file, edit origin and local project', () => {
  const sha = createHash('sha256').update('x').digest('hex');
  const v = { ...lib.versions[0], id: 'av_x', source: { format: 'editor', originalSha256: sha, editedFrom: lib.versions[0].id, localTo: 'prj_gone' } };
  const graph = buildPlanGraph({ projects: [], assets: lib.assets, versions: [...lib.versions, v], originalHashes: [] });
  assert.deepEqual(graph.usesOf({ kind: 'version', id: 'av_x' }).map(e => e.role), ['version-asset', 'original-file', 'edited-from', 'local-to']);
  assert.deepEqual(graph.dangling.map(e => e.role).sort(), ['local-to', 'original-file']);
  assert.equal(graph.counts.version, lib.versions.length + 1);
});
