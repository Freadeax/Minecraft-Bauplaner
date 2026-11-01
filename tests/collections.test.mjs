// LIB-02/LIB-03: own collections, folders, categories and templates (pure domain + storage + backup).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  createCollection, updateCollection, addToCollection, removeFromCollection, moveCollectionItem, setItemNote, pinItemVersion, itemKey, hasItem,
  moveProblem, moveCollection, collectionDeletion, collectionTree, flattenTree, groupByCategory, collectionCategories, resolveCollection, collectionsWith, assetIdsIn, ancestorsOf,
  createTemplate, editTemplate, restoreTemplateSnapshot, archiveTemplate, duplicateTemplate, templateFromProject, templateFromEnsemble, templateFromGenerator, createTemplateProject,
  missingTemplateVersions, templateVersionIds, describeTemplate, checkCollectionRecord, checkTemplateRecord, nextLibraryRevision, LibraryRecordConflictError, MAX_TEMPLATE_HISTORY, MAX_COLLECTION_DEPTH,
  createSampleLibrary, createAsset, addAssetVersion, sampleWallPayload, createProject, applyOperation, newInstance, latestVersions, ENSEMBLES, createBuildingLibrary, runGenerator,
  createBackup, readBackup, planRestore, buildRestore, canonicalJson, BACKUP_FORMAT_VERSION, BACKUP_FORMAT_VERSION_LIBRARY,
} from '../dist/domain/src/index.js';
import { MemoryRepository } from '../dist/application/src/index.js';

const lib = await createSampleLibrary();
const versions = new Map(lib.versions.map(v => [v.id, v]));
const tower = lib.versions.find(v => v.assetId === 'sample_tower'), wall = lib.versions.find(v => v.assetId === 'sample_wall');
const T0 = { position: [0, 0, 0], quarterTurns: 0, mirrorX: false };

async function ownAssetWithTwoVersions() {
  const asset = createAsset({ name: 'Eigenes Haus', provenance: { author: 'Test', source: 'eigener Entwurf', license: 'eigener Test' } });
  const v1 = await addAssetVersion(asset, { payload: sampleWallPayload(), label: '1.0', source: { format: 'voxel-json' } });
  const p2 = sampleWallPayload();
  const v2 = await addAssetVersion(v1.asset, { payload: { ...p2, cells: p2.cells.slice(1) }, label: '2.0', source: { format: 'voxel-json' } });
  return { asset: v2.asset, v1: v1.version, v2: v2.version };
}

function projectWithLink() {
  let p = createProject({ name: 'Mauerzug', description: 'zwei Teile' });
  const a = newInstance({ assetVersionId: wall.id, name: 'Mauer A', transform: T0 });
  const b = newInstance({ assetVersionId: tower.id, name: 'Turm B', transform: { position: [9, 0, 0], quarterTurns: 1, mirrorX: false }, override: true });
  p = applyOperation(p, { kind: 'instance.add', instance: a }).project;
  p = applyOperation(p, { kind: 'instance.add', instance: b }).project;
  p = applyOperation(p, { kind: 'link.add', link: { id: 'link_x', a: { instanceId: a.id, connectorId: 'east' }, b: { instanceId: b.id, connectorId: 'west' } } }).project;
  return p;
}

test('collection items: add once, remove, reorder, note and version pin keep exact references', async () => {
  const own = await ownAssetWithTwoVersions();
  let c = createCollection({ name: '  Meine Burg  ', category: 'Mittelalter' });
  assert.equal(c.name, 'Meine Burg'); assert.equal(c.revision, 0); assert.equal(c.parentId, null); assert.deepEqual(c.items, []);
  c = addToCollection(c, { kind: 'asset', assetId: own.asset.id });
  const same = addToCollection(c, { kind: 'asset', assetId: own.asset.id });
  assert.equal(same, c, 'duplicate add returns the unchanged record');
  c = addToCollection(c, { kind: 'asset', assetId: own.asset.id, versionId: own.v1.id });
  c = addToCollection(c, { kind: 'ensemble', ensembleId: 'ens_burg' });
  c = addToCollection(c, { kind: 'template', templateId: 'tpl_x', note: 'später' });
  assert.deepEqual(c.items.map(itemKey), [`asset:${own.asset.id}@*`, `asset:${own.asset.id}@${own.v1.id}`, 'ensemble:ens_burg', 'template:tpl_x']);
  assert.ok(hasItem(c, { kind: 'ensemble', ensembleId: 'ens_burg' }));
  c = moveCollectionItem(c, 'template:tpl_x', -10);
  assert.equal(itemKey(c.items[0]), 'template:tpl_x');
  c = setItemNote(c, 'template:tpl_x', '');
  assert.equal(c.items[0].note, undefined);
  c = setItemNote(c, 'ensemble:ens_burg', 'Vorbild');
  assert.equal(c.items.find(i => i.kind === 'ensemble').note, 'Vorbild');
  // Pinning to the version that is already pinned elsewhere in the folder is refused; another version is fine.
  assert.throws(() => pinItemVersion(c, `asset:${own.asset.id}@*`, own.v1.id, own.asset), /bereits/);
  c = pinItemVersion(c, `asset:${own.asset.id}@*`, own.v2.id, own.asset);
  assert.ok(c.items.some(i => i.kind === 'asset' && i.versionId === own.v2.id));
  assert.throws(() => pinItemVersion(c, `asset:${own.asset.id}@${own.v2.id}`, tower.id, own.asset), /gehört nicht/);
  c = removeFromCollection(c, 'ensemble:ens_burg');
  assert.equal(c.items.length, 3);
  assert.ok(Object.isFrozen(c) && Object.isFrozen(c.items));
  assert.throws(() => createCollection({ name: '   ' }), /Name/);
  assert.throws(() => addToCollection(c, { kind: 'asset', assetId: '' }), /Bauteil-ID/);
  assert.equal(updateCollection(c, { category: ' Survival ' }).category, 'Survival');
  checkCollectionRecord(c);
});

test('folders: tree by name, categories, depth limit, cycles and missing parents stay visible, deletion keeps children', () => {
  const root = createCollection({ name: 'Basis', category: 'Survival', id: 'col_root' });
  const sub = createCollection({ name: 'Farmen', parentId: root.id, id: 'col_sub' });
  const subsub = createCollection({ name: 'Tiere', parentId: sub.id, id: 'col_subsub' });
  const other = createCollection({ name: 'Andere', id: 'col_other' });
  const orphan = createCollection({ name: 'Verwaist', parentId: 'col_gone', id: 'col_orphan' });
  const a = { ...createCollection({ name: 'Zyklus A', id: 'col_a' }), parentId: 'col_b' }, b = { ...createCollection({ name: 'Zyklus B', id: 'col_b' }), parentId: 'col_a' };
  const all = [addToCollection(root, { kind: 'asset', assetId: 'x' }), addToCollection(sub, { kind: 'asset', assetId: 'x' }), addToCollection(subsub, { kind: 'asset', assetId: 'y' }), other, orphan, a, b];
  const tree = collectionTree(all);
  assert.deepEqual(tree.map(n => n.collection.name), ['Andere', 'Basis', 'Verwaist', 'Zyklus A', 'Zyklus B']);
  const basis = tree.find(n => n.collection.id === root.id);
  assert.equal(basis.children[0].collection.id, sub.id); assert.equal(basis.children[0].children[0].depth, 2);
  assert.equal(basis.totalItems, 2, 'unique items over sub folders (x twice, y once)');
  assert.deepEqual(flattenTree(tree).map(n => n.collection.id).slice(0, 4), ['col_other', 'col_root', 'col_sub', 'col_subsub']);
  assert.deepEqual(groupByCategory(tree).map(g => g.category), ['Survival', '']);
  assert.deepEqual(collectionCategories(all), ['Survival']);
  assert.deepEqual(ancestorsOf(all, subsub.id).map(c => c.id), [sub.id, root.id]);
  assert.deepEqual([...assetIdsIn(all, root.id)].sort(), ['x', 'y']);
  assert.deepEqual([...assetIdsIn(all, root.id, false)], ['x']);
  assert.match(moveProblem(all, root.id, subsub.id), /eigenen Unterordner/);
  assert.match(moveProblem(all, root.id, root.id), /sich selbst/);
  assert.match(moveProblem(all, other.id, 'col_nope'), /gibt es nicht/);
  const deep = createCollection({ name: 'Ebene 4', parentId: subsub.id, id: 'col_l4' });
  assert.equal(moveProblem([...all, deep], 'col_new', deep.id), `Höchstens ${MAX_COLLECTION_DEPTH} Ordnerebenen.`);
  assert.equal(moveProblem(all, other.id, subsub.id), null);
  assert.equal(moveProblem(all, root.id, other.id), null, 'a 3-level subtree fits below a top folder (4 levels)');
  assert.match(moveProblem([...all, deep], root.id, other.id) ?? '', /Ordnerebenen/, 'a 4-level subtree below a top folder would need 5 levels');
  assert.equal(moveCollection(all, other, sub.id).parentId, sub.id);
  const { children } = collectionDeletion(all, sub.id);
  assert.deepEqual(children.map(c => [c.id, c.parentId]), [[subsub.id, root.id]]);
  assert.equal(collectionTree([{ ...other, archived: true }]).length, 0);
  assert.equal(collectionTree([{ ...other, archived: true }], { includeArchived: true }).length, 1);
});

test('resolving items reports missing assets, missing pinned versions, outdated pins and archived entries without dropping them', async () => {
  const own = await ownAssetWithTwoVersions();
  const vmap = new Map([...versions, [own.v1.id, own.v1], [own.v2.id, own.v2]]);
  const tpl = archiveTemplate(templateFromGenerator(runGenerator('turm').source, { name: 'Mein Turm' }), true);
  let c = createCollection({ name: 'Prüfung' });
  for (const item of [{ kind: 'asset', assetId: own.asset.id }, { kind: 'asset', assetId: own.asset.id, versionId: own.v1.id }, { kind: 'asset', assetId: 'gone' },
    { kind: 'asset', assetId: 'sample_tower', versionId: 'av_not_there' }, { kind: 'ensemble', ensembleId: 'ens_burg' }, { kind: 'ensemble', ensembleId: 'ens_weg' },
    { kind: 'template', templateId: tpl.id }, { kind: 'template', templateId: 'tpl_gone' }]) c = addToCollection(c, item);
  const r = resolveCollection(c, { assets: [...lib.assets, own.asset], versions: vmap, templates: [tpl], ensembles: ENSEMBLES });
  assert.deepEqual(r.map(x => x.state), ['ok', 'ok', 'missing', 'version-missing', 'ok', 'missing', 'archived', 'missing']);
  assert.equal(r[0].version.id, own.v2.id); assert.equal(r[0].outdated, undefined);
  assert.equal(r[1].version.id, own.v1.id); assert.equal(r[1].outdated, true); assert.match(r[1].label, /v1\.0/);
  assert.deepEqual(collectionsWith([c], { kind: 'asset', assetId: own.asset.id }).map(x => x.id), [c.id]);
  assert.deepEqual(collectionsWith([c], { kind: 'template', templateId: 'nope' }), []);
});

test('ensemble template from a project pins versions, remaps links and creates independent projects', () => {
  const source = projectWithLink();
  const t = templateFromProject(source, { name: 'Mauerzug-Vorlage', tags: ['mauer'] });
  assert.equal(t.body.kind, 'ensemble'); assert.equal(t.number, 1); assert.deepEqual(t.history, []);
  assert.deepEqual(t.body.members.map(m => [m.id, m.assetVersionId, m.override]), [['m1', wall.id, false], ['m2', tower.id, true]]);
  assert.deepEqual(t.body.links, [{ id: 'l1', a: { instanceId: 'm1', connectorId: 'east' }, b: { instanceId: 'm2', connectorId: 'west' } }]);
  assert.deepEqual(t.origin, { kind: 'project', projectId: source.id, projectName: 'Mauerzug' });
  assert.equal(describeTemplate(t), '2 Bauteile · 1 Verbindung');
  assert.deepEqual([...templateVersionIds(t)].sort(), [wall.id, tower.id].sort());

  const p1 = createTemplateProject(t, versions);
  assert.notEqual(p1.id, source.id); assert.equal(p1.revision, 0);
  assert.deepEqual(p1.instances.map(i => [i.name, i.assetVersionId, i.transform, i.override]), source.instances.map(i => [i.name, i.assetVersionId, i.transform, i.override]));
  assert.ok(p1.instances.every(i => !source.instances.some(s => s.id === i.id)), 'fresh instance ids');
  assert.equal(p1.links.length, 1);
  assert.deepEqual([p1.links[0].a.instanceId, p1.links[0].b.instanceId], p1.instances.map(i => i.id));
  assert.match(p1.description, /Aus Vorlage „Mauerzug-Vorlage“ \(Stand 1\)/);
  const before = canonicalJson(p1);

  // Editing the template afterwards does not reach the created project (it is a copy).
  const edited = editTemplate(t, { name: 'Mauerzug v2', body: { kind: 'ensemble', members: [t.body.members[0]], links: [] } });
  assert.equal(edited.number, 2); assert.equal(edited.history.length, 1); assert.equal(edited.history[0].name, 'Mauerzug-Vorlage');
  assert.equal(canonicalJson(p1), before);
  const p2 = createTemplateProject(edited, versions);
  assert.equal(p2.instances.length, 1); assert.equal(p1.instances.length, 2);
  assert.equal(editTemplate(edited, { name: 'Mauerzug v2' }), edited, 'no-op edit keeps the record');

  // Restore the earlier state: becomes number 3, the replaced state stays in the history.
  const restored = restoreTemplateSnapshot(edited, 1);
  assert.equal(restored.number, 3); assert.equal(restored.name, 'Mauerzug-Vorlage'); assert.equal(restored.body.members.length, 2);
  assert.deepEqual(restored.history.map(s => s.number), [1, 2]);
  assert.throws(() => restoreTemplateSnapshot(restored, 7), /nicht mehr gespeichert/);
  checkTemplateRecord(restored);

  let many = t;
  for (let i = 0; i < MAX_TEMPLATE_HISTORY + 5; i++) many = editTemplate(many, { description: `Stand ${i}` });
  assert.equal(many.history.length, MAX_TEMPLATE_HISTORY); assert.equal(many.number, MAX_TEMPLATE_HISTORY + 6);
  checkTemplateRecord(many);

  const copy = duplicateTemplate(restored);
  assert.notEqual(copy.id, restored.id); assert.equal(copy.number, 1); assert.deepEqual(copy.history, []);
  assert.deepEqual(copy.origin, { kind: 'template', templateId: restored.id });
});

test('missing pinned version blocks project creation; generator templates open in the generator', () => {
  const t = templateFromProject(projectWithLink());
  const partial = new Map([[wall.id, wall]]);
  assert.deepEqual(missingTemplateVersions(t, partial), [tower.id]);
  assert.throws(() => createTemplateProject(t, partial), /1 feste Version\(en\) fehlen/);
  const run = runGenerator('turm', { hoehe: 12 });
  const g = templateFromGenerator(run.source, { name: 'Hoher Turm' });
  assert.deepEqual(g.body, { kind: 'generator', source: { id: 'turm', version: run.generator.version, params: run.values } });
  assert.deepEqual(missingTemplateVersions(g, new Map()), []);
  assert.throws(() => createTemplateProject(g, versions), /Generatorvorlage/);
  assert.match(describeTemplate(g), /^Generator turm v\d+$/);
  assert.throws(() => createTemplate({ name: 'leer', body: { kind: 'ensemble', members: [], links: [] } }), /mindestens ein Bauteil/);
  assert.throws(() => createTemplate({ name: 'x', body: { kind: 'generator', source: { id: 'turm', version: 0, params: {} } } }), /Algorithmusversion/);
  assert.throws(() => createTemplate({ name: 'x', body: { kind: 'ensemble', members: [{ id: 'a', name: 'A', assetVersionId: wall.id, transform: T0, override: false }], links: [{ id: 'l', a: { instanceId: 'a', connectorId: 'e' }, b: { instanceId: 'zz', connectorId: 'w' } }] } }), /fehlendes Bauteil/);
});

test('shipped ensemble becomes an own template with the same layout as "Als Projekt anlegen"', async () => {
  const buildings = await createBuildingLibrary();
  const byAsset = latestVersions(buildings.assets, new Map(buildings.versions.map(v => [v.id, v])));
  const names = new Map(buildings.assets.map(a => [a.id, a.name]));
  const ensemble = ENSEMBLES.find(e => e.id === 'ens_burg');
  const t = templateFromEnsemble(ensemble, byAsset, names);
  assert.equal(t.name, 'Burg (eigene Vorlage)'); assert.deepEqual(t.origin, { kind: 'ensemble', ensembleId: 'ens_burg' });
  assert.equal(t.body.members.length, ensemble.members.length);
  assert.deepEqual(t.body.members.map(m => m.name).filter(n => n.startsWith('Rundturm')), ['Rundturm', 'Rundturm 2']);
  const { createEnsembleProject } = await import('../dist/domain/src/index.js');
  const direct = createEnsembleProject(ensemble, byAsset, names), viaTemplate = createTemplateProject(t, new Map(buildings.versions.map(v => [v.id, v])));
  assert.deepEqual(viaTemplate.instances.map(i => [i.name, i.assetVersionId, i.transform]), direct.instances.map(i => [i.name, i.assetVersionId, i.transform]));
  assert.throws(() => templateFromEnsemble(ensemble, new Map()), /Bauteile fehlen/);
});

test('record validation rejects malformed, duplicated and newer records', () => {
  const c = addToCollection(createCollection({ name: 'Gültig' }), { kind: 'asset', assetId: 'a' });
  assert.equal(checkCollectionRecord(c), c);
  assert.throws(() => checkCollectionRecord({ ...c, schemaVersion: 9 }), e => e.code === 'SCHEMA_NEWER');
  assert.throws(() => checkCollectionRecord({ ...c, items: [...c.items, c.items[0]] }), /doppelter Eintrag/);
  assert.throws(() => checkCollectionRecord({ ...c, items: [{ kind: 'foo', addedAt: c.createdAt }] }), /unbekannte Eintragsart/);
  assert.throws(() => checkCollectionRecord({ ...c, parentId: c.id }), /in sich selbst/);
  assert.throws(() => checkCollectionRecord({ ...c, revision: -1 }), /Speicherrevision/);
  assert.throws(() => checkCollectionRecord({ ...c, name: '' }), /Sammlungsname/);
  const t = templateFromProject(projectWithLink());
  assert.equal(checkTemplateRecord(t), t);
  assert.throws(() => checkTemplateRecord({ ...t, body: { kind: 'ensemble', members: [], links: [] } }), /mindestens ein Bauteil/);
  assert.throws(() => checkTemplateRecord({ ...t, history: [{ number: 5, name: 'x', description: '', tags: [], body: t.body, savedAt: t.createdAt }] }), /Verlaufseintrag/);
  assert.throws(() => checkTemplateRecord({ ...t, body: { ...t.body, members: [{ ...t.body.members[0], transform: { position: [0, 0, 0], quarterTurns: 5, mirrorX: false } }] } }), /Transformation/);
  assert.throws(() => checkTemplateRecord({ ...t, tags: ['a', 'a'] }), /Tags/);
  // CAS: incoming revision is the expected stored base.
  assert.equal(nextLibraryRevision('collection', c, undefined).revision, 1);
  assert.throws(() => nextLibraryRevision('collection', c, { revision: 2 }), e => e instanceof LibraryRecordConflictError && e.stored === 2 && e.base === 0);
});

test('memory repository stores collections and templates with CAS; a conflict writes nothing of the batch', async () => {
  const repo = new MemoryRepository();
  const c = createCollection({ name: 'Speicher' }), t = templateFromProject(projectWithLink());
  await repo.applyBatch({ collections: [c], templates: [t] });
  const [stored] = await repo.listCollections();
  assert.equal(stored.revision, 1); assert.equal((await repo.listTemplates())[0].revision, 1);
  const project = createProject({ name: 'Nebenbei' });
  await assert.rejects(repo.applyBatch({ projects: [{ project, baseRevision: 0 }], collections: [c] }), LibraryRecordConflictError);
  assert.deepEqual(await repo.listProjects(), [], 'project of the failed batch was not written');
  await repo.applyBatch({ collections: [updateCollection(stored, { name: 'Umbenannt' })] });
  await assert.rejects(repo.applyBatch({ removeCollections: [{ id: c.id, revision: 1 }] }), LibraryRecordConflictError);
  await repo.applyBatch({ removeCollections: [{ id: c.id, revision: 2 }], removeTemplates: [{ id: t.id, revision: 1 }] });
  assert.deepEqual(await repo.listCollections(), []); assert.deepEqual(await repo.listTemplates(), []);
  await assert.rejects(repo.applyBatch({ collections: [c, c] }), /doppelt/);
  await assert.rejects(repo.applyBatch({ collections: [{ ...c, items: 'kaputt' }] }), /Eintragsliste/);
});

test('backups: format 1 unchanged without own records; format 2 roundtrip keeps collections, templates and pinned versions', async () => {
  const own = await ownAssetWithTwoVersions();
  const allVersions = new Map([...versions, [own.v1.id, own.v1], [own.v2.id, own.v2]]);
  const source = { projects: [], assets: [...lib.assets, own.asset], versions: allVersions, getOriginal: async () => null };
  const plain = await createBackup(source, 'all');
  assert.equal(plain.formatVersion, BACKUP_FORMAT_VERSION); assert.equal('collections' in plain, false);
  const expected = createHash('sha256').update(canonicalJson({ projects: plain.projects, assets: plain.assets, versions: plain.versions, originals: plain.originals })).digest('hex');
  assert.equal(plain.contentSha256, expected, 'format 1 hash input unchanged');

  const tpl = templateFromProject(projectWithLink(), { name: 'Mit Beispielteilen' });
  const col = addToCollection(addToCollection(createCollection({ name: 'Favoriten', category: 'Survival' }), { kind: 'asset', assetId: own.asset.id, versionId: own.v1.id }), { kind: 'template', templateId: tpl.id });
  const file = await createBackup({ ...source, collections: [col], templates: [tpl] }, 'all');
  assert.equal(file.formatVersion, BACKUP_FORMAT_VERSION_LIBRARY);
  assert.deepEqual(file.collections.map(c => c.id), [col.id]); assert.deepEqual(file.templates.map(t => t.id), [tpl.id]);
  assert.ok(file.assets.some(a => a.id === 'sample_tower') && file.assets.some(a => a.id === 'sample_wall'), 'demo assets pinned by the template are included');
  const project = await createBackup({ ...source, projects: [createProject({ name: 'P' })], collections: [col], templates: [tpl] }, 'project', [source.projects[0]?.id].filter(Boolean));
  assert.equal(project.formatVersion, BACKUP_FORMAT_VERSION, 'project backups do not carry the library');

  const read = await readBackup(JSON.stringify(file));
  assert.deepEqual(read.collections, file.collections); assert.deepEqual(read.templates, file.templates);
  assert.deepEqual((await readBackup(JSON.stringify(plain))).collections, []);
  await assert.rejects(readBackup(JSON.stringify({ ...file, collections: [{ ...col, name: 'manipuliert' }] })), /Prüfsumme/);
  await assert.rejects(readBackup(JSON.stringify({ ...plain, collections: [] })), /format 1 darf keine/i);
  await assert.rejects(readBackup(JSON.stringify({ ...file, formatVersion: 3 })), e => e.code === 'SCHEMA_NEWER');
  await assert.rejects(createBackup({ ...source, versions: new Map([...allVersions].filter(([id]) => id !== tower.id)), collections: [], templates: [tpl] }, 'all'), /Vorlage verweist auf fehlende Version/);

  // Restore: new records are added, identical ones skipped, differing ones added as copies – the local record stays.
  const target = { projects: [], assets: [], versionIds: new Set(), originalHashes: new Set() };
  const fresh = buildRestore(planRestore(read, target));
  assert.deepEqual(fresh.collections.map(c => [c.id, c.revision]), [[col.id, 0]]); assert.equal(fresh.templates[0].id, tpl.id);
  const same = buildRestore(planRestore(read, { ...target, collections: [{ ...col, revision: 4 }], templates: [{ ...tpl, revision: 2 }] }));
  assert.deepEqual([same.collections, same.templates], [[], []]);
  assert.ok(same.summary.some(l => /2 Sammlung\(en\)\/Vorlage\(n\) bereits identisch/.test(l)));
  const localEdit = { ...updateCollection(col, { name: 'Lokal geändert' }), revision: 3 };
  const differs = buildRestore(planRestore(read, { ...target, collections: [localEdit] }));
  assert.equal(differs.collections.length, 1); assert.notEqual(differs.collections[0].id, col.id);
  assert.match(differs.collections[0].name, /^Favoriten \(Wiederhergestellt /); assert.equal(differs.collections[0].revision, 0);
  assert.ok(differs.summary.some(l => /lokale Fassung unverändert/.test(l)));
  const repo = new MemoryRepository();
  await repo.applyBatch(fresh);
  assert.equal((await repo.listCollections())[0].revision, 1);
  assert.equal((await repo.listTemplates())[0].name, 'Mit Beispielteilen');
});
