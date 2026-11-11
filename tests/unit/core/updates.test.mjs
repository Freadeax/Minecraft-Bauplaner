// UPDATE-01: controlled version updates with local overrides. Run after `npm run build:core`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from '@typescript/typescript6';
import { createPayload } from '../../../dist/voxel/src/index.js';
import {
  addAssetVersion, applyOperation, buildGuide, checkLinks, checkProjectRecord, createProject, createSampleLibrary, diffConnectors, diffVersions, findUpdates,
  freezeOperation, isLocalPatch, newInstance, patchBase, prepareUpdate, rebasePatch, referencedVersionIds, resolveProject, returnChoice, summarizeUpdates,
  tickSteps, unfreezeOperation, undo, execute, EMPTY_HISTORY, checkUpdates, updatesOf, sampleWallPayload,
} from '../../../dist/domain/src/index.js';
import { MemoryRepository, planCatalogDelivery, nextReleaseLabel } from '../../../dist/application/src/index.js';

const STONE = { id: 'minecraft:stone', properties: {} }, OAK = { id: 'minecraft:oak_planks', properties: {} }, GLASS = { id: 'minecraft:glass', properties: {} };
const GOLD = { id: 'minecraft:gold_block', properties: {} };

/** Payload from a map "x,y,z" → state (null = explicit air), bounds from the cells, pivot as given. */
function payload(cells, pivot = [0, 0, 0]) {
  const palette = [], index = new Map(), out = [];
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const [k, s] of Object.entries(cells)) {
    const p = k.split(',').map(Number);
    p.forEach((v, i) => { min[i] = Math.min(min[i], v); max[i] = Math.max(max[i], v + 1); });
    const state = s ?? { id: 'minecraft:air', properties: {} };
    const key = JSON.stringify(state);
    if (!index.has(key)) { index.set(key, palette.length); palette.push(state); }
    out.push({ position: p, kind: s ? 'block' : 'air', paletteIndex: index.get(key) });
  }
  return createPayload({ schemaVersion: 1, profileId: 'java:registry-unverified', bounds: { min, maxExclusive: max }, pivot, sourceOrigin: [0, 0, 0], palette, cells: out, blockEntities: [] });
}
const row = (n, state = STONE) => Object.fromEntries(Array.from({ length: n }, (_, x) => [`${x},0,0`, state]));

async function library() {
  const lib = await createSampleLibrary();
  const wall1 = lib.versions.find(v => v.assetId === 'sample_wall');
  let wall = lib.assets.find(a => a.id === 'sample_wall');
  // 2.0: one block more on top, the foundation corner in stone bricks, east joint dropped.
  const grown = { ...sampleWallPayload() };
  const corner = grown.cells.findIndex(c => c.position.join() === '5,0,1');
  const v2r = await addAssetVersion(wall, { payload: createPayload({ ...grown, bounds: { min: [0, 0, 0], maxExclusive: [6, 6, 2] },
    palette: [...grown.palette], cells: [...grown.cells.map((c, i) => i === corner ? { ...c, paletteIndex: 0 } : c), { position: [0, 5, 0], kind: 'block', paletteIndex: 0 }] }), connectors: wall1.connectors.filter(c => c.id !== 'east'), source: { format: 'demo' } });
  wall = v2r.asset;
  // A local patch of 1.0 made in another project: not an update for anyone.
  const patched = await addAssetVersion(wall, { payload: createPayload({ ...grown, palette: [...grown.palette, GOLD], cells: grown.cells.map((c, i) => i === 0 ? { ...c, paletteIndex: grown.palette.length } : c) }),
    connectors: wall1.connectors, source: { format: 'editor', editedFrom: wall1.id, localTo: 'project_other' } });
  wall = patched.asset;
  const versions = new Map([...lib.versions, v2r.version, patched.version].map(v => [v.id, v]));
  return { assets: lib.assets.map(a => a.id === wall.id ? wall : a), versions, wall1, wall2: v2r.version, patch: patched.version };
}

function wallProject(lib) {
  let project = createProject({ name: 'Mauerzug', id: 'project_mauer' });
  const a = { ...newInstance({ assetVersionId: lib.wall1.id, name: 'Mauer A' }), id: 'inst_a' };
  const b = { ...newInstance({ assetVersionId: lib.wall1.id, name: 'Mauer B', transform: { position: [6, 0, 0], quarterTurns: 0, mirrorX: false } }), id: 'inst_b' };
  project = applyOperation(project, { kind: 'batch', label: 'Aufbau', operations: [
    { kind: 'instance.add', instance: a }, { kind: 'instance.add', instance: b },
    { kind: 'link.add', link: { id: 'link_ab', a: { instanceId: 'inst_a', connectorId: 'east' }, b: { instanceId: 'inst_b', connectorId: 'west' } } },
  ] }).project;
  return project;
}

test('findUpdates offers newer library versions only, never local patches of other projects', async () => {
  const lib = await library();
  assert.equal(isLocalPatch(lib.patch), true);
  assert.equal(patchBase(lib.patch, lib.versions).base.id, lib.wall1.id);
  const project = wallProject(lib);
  const infos = findUpdates(project, lib);
  assert.deepEqual(infos.map(i => i.status), ['available', 'available']);
  assert.deepEqual(infos[0].newer.map(v => v.label), ['2.0']);
  assert.equal(infos[0].local, false);
  const summary = summarizeUpdates(infos);
  assert.deepEqual(summary, { available: 2, frozen: 0, local: 0, missing: 0, assets: 1 });
  // An instance on the local patch stands on 1.0 and is offered 2.0 as well.
  const onPatch = applyOperation(project, { kind: 'instance.update', instanceId: 'inst_b', assetVersionId: lib.patch.id }).project;
  const info = findUpdates(onPatch, lib)[1];
  assert.equal(info.local, true); assert.equal(info.base.id, lib.wall1.id); assert.deepEqual(info.newer.map(v => v.id), [lib.wall2.id]);
  // Already on the newest version: current. Missing version: missing.
  const latest = applyOperation(project, { kind: 'instance.update', instanceId: 'inst_a', assetVersionId: lib.wall2.id }).project;
  assert.equal(findUpdates(latest, lib)[0].status, 'current');
  assert.deepEqual(findUpdates(latest, lib)[0].older.map(v => v.label), ['1.0']);
  const missing = applyOperation(project, { kind: 'instance.update', instanceId: 'inst_a', assetVersionId: 'av_gone' }).project;
  assert.equal(findUpdates(missing, lib)[0].status, 'missing');
});

test('rebasePatch carries local changes onto the new version and reports conflicts per policy', () => {
  const base = payload({ ...row(4), '0,1,0': STONE });
  // local: x=1 becomes oak, x=3 removed, new block at 5,0,0, top block becomes glass
  const local = payload({ '0,0,0': STONE, '1,0,0': OAK, '2,0,0': STONE, '5,0,0': OAK, '0,1,0': GLASS });
  // upstream: x=2 becomes glass (untouched locally), top block becomes gold (conflict), x=3 stays, extension at 4,0,0
  const upstream = payload({ '0,0,0': STONE, '1,0,0': STONE, '2,0,0': GLASS, '3,0,0': STONE, '4,0,0': STONE, '0,1,0': GOLD });
  const keep = rebasePatch(base, local, upstream, 'local');
  assert.equal(keep.patchCells, 4);
  assert.equal(keep.conflicts.length, 1);
  assert.deepEqual(keep.conflicts[0].position, [0, 1, 0]);
  assert.equal(keep.conflicts[0].local.state.id, 'minecraft:glass');
  assert.equal(keep.conflicts[0].upstream.state.id, 'minecraft:gold_block');
  const at = (p, pos) => { const c = p.cells.find(c => c.position.join() === pos); return c ? p.palette[c.paletteIndex].id : null; };
  assert.equal(at(keep.payload, '1,0,0'), 'minecraft:oak_planks');
  assert.equal(at(keep.payload, '2,0,0'), 'minecraft:glass', 'upstream change outside the patch stays');
  assert.equal(at(keep.payload, '3,0,0'), null, 'local removal is carried over');
  assert.equal(at(keep.payload, '4,0,0'), 'minecraft:stone', 'upstream extension stays');
  assert.equal(at(keep.payload, '5,0,0'), 'minecraft:oak_planks');
  assert.equal(at(keep.payload, '0,1,0'), 'minecraft:glass');
  const take = rebasePatch(base, local, upstream, 'upstream');
  assert.equal(at(take.payload, '0,1,0'), 'minecraft:gold_block');
  assert.equal(take.applied, keep.applied - 1);
  // Identical change on both sides is no conflict.
  const same = rebasePatch(base, local, local, 'upstream');
  assert.equal(same.conflicts.length, 0); assert.equal(same.already, same.patchCells);
});

test('patches are pivot-relative: a version that grows to the west keeps local cells in place', () => {
  const base = payload(row(3), [0, 0, 0]);
  const local = payload({ ...row(3), '1,0,0': OAK }, [0, 0, 0]);
  // upstream: same building with an annex to the west; payload shifted by +2, pivot moved with it
  const upstream = payload({ '0,0,0': GLASS, '1,0,0': GLASS, '2,0,0': STONE, '3,0,0': STONE, '4,0,0': STONE }, [2, 0, 0]);
  const r = rebasePatch(base, local, upstream, 'local');
  assert.equal(r.conflicts.length, 0);
  const cell = r.payload.cells.find(c => c.position.join() === '3,0,0');
  assert.equal(r.payload.palette[cell.paletteIndex].id, 'minecraft:oak_planks');
  const d = diffVersions(base, upstream);
  assert.equal(d.counts.added, 2, 'pivot alignment reports the annex as added'); assert.equal(d.counts.same, 3);
});

test('prepareUpdate shows all consequences and applies as one undoable step with log, return and links', async () => {
  const lib = await library();
  let project = wallProject(lib);
  assert.equal(checkLinks(project, lib.versions)[0].state, 'ok');
  // tick the bottom steps of A so the task diff has something to report
  const guide = buildGuide(project, resolveProject(project, lib.versions));
  const stepsA = guide.steps.filter(s => s.instanceId === 'inst_a');
  project = applyOperation(project, tickSteps(stepsA, 'Mauer A fertig', '2026-11-02T06:00:00.000Z')).project;
  assert.deepEqual(diffConnectors(lib.wall1, lib.wall2).map(c => `${c.id}:${c.kind}`), ['east:removed']);

  const prepared = await prepareUpdate(project, lib, [{ instanceId: 'inst_a', targetVersionId: lib.wall2.id }], { at: '2026-11-02T07:00:00.000Z' });
  const plan = prepared.plan;
  assert.equal(plan.instances.length, 1);
  assert.equal(plan.instances[0].kind, 'update');
  assert.equal(plan.instances[0].geometry.counts.added, 1);
  assert.equal(plan.instances[0].geometry.counts.material, 1);
  assert.equal(plan.openedSteps, 1, 'the new top layer is a new open step');
  assert.deepEqual(plan.removedLinkIds, ['link_ab']);
  assert.equal(plan.links[0].after, 'missing-connector');
  assert.ok(plan.materials.some(m => m.id === 'minecraft:stone_bricks' && m.after === m.before + 2));
  assert.equal(plan.blocksAfter, plan.blocksBefore + 1);
  assert.ok(plan.steps.length >= 1, 'ticked steps of the changed instance are reported');
  assert.ok(plan.steps.every(s => s.label.startsWith('Mauer A') && s.before === 'done' && s.after === 'review'));
  assert.ok(plan.warnings.some(w => w.includes('Verbindung')));
  assert.equal(prepared.versions.length, 0, 'plain update needs no new version');
  // Nothing changed before execution.
  assert.equal(project.instances[0].assetVersionId, lib.wall1.id);

  let history = EMPTY_HISTORY;
  ({ project, history } = execute(project, history, prepared.operation));
  assert.equal(project.instances[0].assetVersionId, lib.wall2.id);
  assert.equal(project.links.length, 0);
  assert.equal(updatesOf(project).log.length, 1);
  assert.equal(updatesOf(project).log[0].fromLabel, '1.0');
  assert.equal(updatesOf(project).log[0].removedLinks, 1);
  assert.ok(referencedVersionIds(project).has(lib.wall1.id), 'the version to return to stays in backups');
  checkProjectRecord(JSON.parse(JSON.stringify(project)));
  // B is still offered the update; A is current.
  assert.deepEqual(findUpdates(project, lib).map(i => i.status), ['current', 'available']);

  // One undo restores version, link and log.
  const undone = undo(project, history).project;
  assert.equal(undone.instances[0].assetVersionId, lib.wall1.id);
  assert.equal(undone.links.length, 1);
  assert.equal(updatesOf(undone).log.length, 0);

  // Return: back to 1.0 as a recorded step.
  const back = returnChoice(project, lib, 'inst_a');
  assert.deepEqual(back, { instanceId: 'inst_a', targetVersionId: lib.wall1.id, keepLocal: false });
  const ret = await prepareUpdate(project, lib, [back]);
  assert.equal(ret.plan.instances[0].kind, 'return');
  project = applyOperation(project, ret.operation).project;
  assert.equal(project.instances[0].assetVersionId, lib.wall1.id);
  assert.deepEqual(updatesOf(project).log.map(e => e.kind), ['update', 'return']);
  await assert.rejects(prepareUpdate(project, lib, [{ instanceId: 'inst_a', targetVersionId: lib.wall1.id }]), /steht bereits/);
  await assert.rejects(prepareUpdate(project, lib, [{ instanceId: 'inst_a', targetVersionId: lib.versions.values().next().value.id }]), /gehört nicht/);
});

test('local patch is rebased into a new local version, reused on repeat, original patch kept', async () => {
  const lib = await library();
  let project = wallProject(lib);
  project = applyOperation(project, { kind: 'instance.update', instanceId: 'inst_b', assetVersionId: lib.patch.id }).project;
  const prepared = await prepareUpdate(project, lib, [{ instanceId: 'inst_b', targetVersionId: lib.wall2.id }]);
  assert.equal(prepared.versions.length, 1);
  const v = prepared.versions[0];
  assert.equal(v.label, '2.0 + lokal');
  assert.equal(v.source.editedFrom, lib.wall2.id);
  assert.equal(v.source.localTo, 'project_other');
  assert.equal(prepared.plan.instances[0].rebase.patchCells, 1);
  assert.equal(prepared.plan.instances[0].rebase.conflicts.length, 0);
  assert.ok(v.payload.palette.some(s => s.id === 'minecraft:gold_block'), 'local gold block survives');
  assert.equal(v.payload.cells.length, lib.wall2.payload.cells.length);
  assert.equal(prepared.assets[0].versionIds.at(-1), v.id);
  // Without keeping local changes the plain 2.0 is used.
  const plain = await prepareUpdate(project, lib, [{ instanceId: 'inst_b', targetVersionId: lib.wall2.id, keepLocal: false }]);
  assert.equal(plain.versions.length, 0); assert.equal(plain.plan.instances[0].to.id, lib.wall2.id);
  // Stored once, the same rebase is reused instead of duplicated.
  const lib2 = { assets: lib.assets.map(a => a.id === v.assetId ? prepared.assets[0] : a), versions: new Map([...lib.versions, [v.id, v]]) };
  const again = await prepareUpdate(project, lib2, [{ instanceId: 'inst_b', targetVersionId: lib.wall2.id }]);
  assert.equal(again.versions.length, 0); assert.equal(again.plan.instances[0].to.id, v.id);
  // The rebased version itself is a local patch, so others never see it as an update.
  const after = applyOperation(project, again.operation).project;
  assert.equal(findUpdates(after, lib2)[1].status, 'current');
  assert.equal(findUpdates(after, lib2)[1].local, true);
});

test('freezing pins an instance; frozen instances are not offered or updated until released', async () => {
  const lib = await library();
  let project = wallProject(lib);
  project = applyOperation(project, freezeOperation(project, ['inst_a'], 'Bleibt wie gebaut', '2026-11-02T08:00:00.000Z')).project;
  const infos = findUpdates(project, lib);
  assert.equal(infos[0].status, 'frozen'); assert.equal(infos[0].frozen.note, 'Bleibt wie gebaut');
  assert.equal(infos[0].newer.length, 1, 'the newer version stays visible');
  assert.equal(summarizeUpdates(infos).available, 1);
  await assert.rejects(prepareUpdate(project, lib, [{ instanceId: 'inst_a', targetVersionId: lib.wall2.id }]), /eingefroren/);
  assert.throws(() => freezeOperation(project, ['inst_a']), /bereits eingefroren/);
  checkProjectRecord(JSON.parse(JSON.stringify(project)));
  project = applyOperation(project, unfreezeOperation(project, ['inst_a'])).project;
  assert.equal(findUpdates(project, lib)[0].status, 'available');
  // Removing an instance drops its pin on the next freeze write.
  project = applyOperation(project, freezeOperation(project, ['inst_a', 'inst_b'])).project;
  project = applyOperation(project, { kind: 'instance.remove', instanceId: 'inst_b' }).project;
  assert.throws(() => freezeOperation(project, ['inst_a']), /bereits/);
});

test('update state validation rejects malformed records', () => {
  assert.throws(() => checkUpdates({ schemaVersion: 2, frozen: {}, log: [] }), /Schema/);
  assert.throws(() => checkUpdates({ schemaVersion: 1, frozen: { a: { versionId: 'x', at: 'nie', note: '' } }, log: [] }), /Einfrierung/);
  assert.throws(() => checkUpdates({ schemaVersion: 1, frozen: {}, log: [{ id: 'u' }] }), /Verlaufseintrag/);
  const project = createProject({ name: 'X' });
  assert.throws(() => checkProjectRecord({ ...project, updates: { schemaVersion: 1, frozen: [], log: [] } }), /Einfrierliste/);
});

// --------------------------------------------------------------------------- catalogue delivery

let code = ts.transpileModule(readFileSync('apps/web/src/app/repository.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText;
code = code.replaceAll(/\.\.\/\.\.\/\.\.\/\.\.\/packages\/(domain|application)\/src\/([A-Za-z]+)\.js/g, (_, pkg, name) => pathToFileURL(resolve(`dist/${pkg}/src/${name}.js`)).href);
const { seedSamples } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

test('changed shipped buildings arrive as a new version; projects keep their pin', async () => {
  const v1 = await createSampleLibrary();
  const repo = new MemoryRepository();
  await seedSamples(repo, 0, v1);
  const before = (await repo.listAssets()).find(a => a.id === 'sample_wall');
  assert.equal(before.versionIds.length, 1);
  const pinned = before.versionIds[0];
  let project = createProject({ name: 'Bestand', id: 'project_bestand' });
  project = applyOperation(project, { kind: 'instance.add', instance: newInstance({ assetVersionId: pinned, name: 'Mauer' }) }).project;
  await repo.saveProject(project, 0);
  await repo.saveAsset({ ...before, archived: true });
  const archivedRevision = (await repo.listAssets()).find(a => a.id === 'sample_wall').revision;

  // Next app release: the wall grows a block.
  const shippedWall = v1.versions.find(v => v.assetId === 'sample_wall');
  const p = shippedWall.payload;
  const changed = await addAssetVersion(v1.assets.find(a => a.id === 'sample_wall') && { ...v1.assets.find(a => a.id === 'sample_wall'), versionIds: [] },
    { payload: createPayload({ ...p, bounds: { min: [0, 0, 0], maxExclusive: [6, 6, 2] }, cells: [...p.cells, { position: [1, 5, 0], kind: 'block', paletteIndex: 0 }] }), label: '1.0', connectors: shippedWall.connectors, source: { format: 'demo' } });
  const v2 = { assets: v1.assets.map(a => a.id === 'sample_wall' ? changed.asset : a), versions: v1.versions.map(v => v.assetId === 'sample_wall' ? changed.version : v) };
  await seedSamples(repo, 0, v2);
  const after = (await repo.listAssets()).find(a => a.id === 'sample_wall');
  assert.equal(after.versionIds.length, 2);
  assert.equal(after.versionIds[0], pinned);
  assert.equal(after.archived, true, 'archive state stays');
  assert.equal(after.revision, archivedRevision + 1);
  const versions = new Map((await repo.listVersions()).map(v => [v.id, v]));
  const delivered = versions.get(after.versionIds[1]);
  assert.equal(delivered.label, '2.0'); assert.equal(delivered.source.format, 'demo');
  assert.equal(delivered.payloadHash, changed.version.payloadHash);
  assert.equal((await repo.getProject('project_bestand')).instances[0].assetVersionId, pinned, 'no automatic update');
  const stored = await repo.getProject('project_bestand');
  const info = findUpdates(stored, { assets: await repo.listAssets(), versions })[0];
  assert.equal(info.status, 'available'); assert.equal(info.newer[0].label, '2.0');
  // Seeding again or going back to the old catalogue adds nothing.
  await seedSamples(repo, 0, v2); await seedSamples(repo, 0, v1);
  assert.equal((await repo.listAssets()).find(a => a.id === 'sample_wall').versionIds.length, 2);
  // Other assets were not touched.
  assert.equal((await repo.listAssets()).find(a => a.id === 'sample_tower').versionIds.length, 1);
});

test('release labels skip labels in use; local patches of the shipped asset do not block delivery', async () => {
  const v1 = await createSampleLibrary();
  const wall = v1.assets.find(a => a.id === 'sample_wall'), wv = v1.versions.find(v => v.assetId === 'sample_wall');
  const local = await addAssetVersion(wall, { payload: sampleWallPayload(), label: '2.0', connectors: [], source: { format: 'editor', editedFrom: wv.id, localTo: 'p' } });
  const versions = new Map([[wv.id, wv], [local.version.id, local.version]]);
  assert.equal(nextReleaseLabel(local.asset, versions), '3.0');
  const shipped = { assets: [wall], versions: [{ ...wv, id: 'av_new', payloadHash: 'other' }] };
  const r = await planCatalogDelivery(new Map([[wall.id, local.asset]]), versions, shipped);
  assert.equal(r.delivered.get('sample_wall'), '3.0');
  // Geometry already delivered as a catalogue version: no second delivery.
  const known = await planCatalogDelivery(new Map([[wall.id, local.asset]]), versions, { assets: [wall], versions: [{ ...wv, id: 'av_new' }] });
  assert.equal(known.versions.length, 0);
});

test('latest release skips local patches, so new instances never pick up another project’s local change', async () => {
  const { latestReleaseId, latestVersions, buildCatalog } = await import('../../../dist/domain/src/index.js');
  const lib = await library();
  const wall = lib.assets.find(a => a.id === 'sample_wall');
  assert.equal(wall.versionIds.at(-1), lib.patch.id, 'the local patch is the last stored version');
  assert.equal(latestReleaseId(wall, lib.versions), lib.wall2.id);
  assert.equal(latestVersions(lib.assets, lib.versions).get('sample_wall').id, lib.wall2.id);
  assert.equal(buildCatalog(lib.assets, lib.versions).entries.find(e => e.asset.id === 'sample_wall').version.id, lib.wall2.id);
});
