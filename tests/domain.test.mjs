import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPayload, countBlocks } from '../dist/voxel/src/index.js';
import {
  createAsset, addAssetVersion, verifyAssetVersion, cropPayload, searchAssets, canonicalJson, quickHash,
  createProject, execute, undo, redo, newInstance, freezeRevision, applyOperation, EMPTY_HISTORY,
  resolveProject, createSampleLibrary, sampleWallPayload, DomainError,
} from '../dist/domain/src/index.js';

const provenance = { author: 'Test', source: 'synthetisch', license: '' };
const lib = await createSampleLibrary();
const versions = new Map(lib.versions.map(v => [v.id, v]));
const byAsset = id => lib.versions.find(v => v.assetId === id);
const tower = byAsset('sample_tower'), wall = byAsset('sample_wall'), gate = byAsset('sample_gate');
const place = (version, position, extra = {}) => newInstance({ assetVersionId: version.id, name: version.assetId, transform: { position, quarterTurns: 0, mirrorX: false, ...extra.t }, override: extra.override });
function projectWith(...instances) {
  let p = createProject({ name: 'Test' }), h = EMPTY_HISTORY;
  for (const instance of instances) ({ project: p, history: h } = execute(p, h, { kind: 'instance.add', instance }));
  return { project: p, history: h };
}
const tiny = (id, x = 0) => createPayload({ schemaVersion: 1, profileId: 'java:registry-unverified', bounds: { min: [0, 0, 0], maxExclusive: [1, 1, 1] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0],
  palette: [{ id, properties: {} }], cells: [{ position: [0, 0, 0], kind: id.endsWith(':air') ? 'air' : 'block', paletteIndex: 0 }], blockEntities: [] });

test('canonical JSON is key-order independent and quickHash is stable', () => {
  assert.equal(canonicalJson({ b: 1, a: [1, { d: 2, c: 3 }] }), '{"a":[1,{"c":3,"d":2}],"b":1}');
  assert.equal(quickHash('abc'), quickHash('abc')); assert.notEqual(quickHash('abc'), quickHash('abd'));
  assert.throws(() => canonicalJson({ a: NaN }));
});
test('asset versions are immutable, content addressed and tamper evident', async () => {
  const asset = createAsset({ name: '  Turm ', tags: ['Mauer', 'mauer', 'Turm'], provenance });
  assert.equal(asset.name, 'Turm'); assert.deepEqual(asset.tags, ['mauer', 'turm']); assert.equal(asset.provenance.license, 'ungeklärt');
  const r = await addAssetVersion(asset, { payload: sampleWallPayload(), source: { format: 'demo' } });
  assert.equal(r.asset.versionIds.length, 1); assert.equal(asset.versionIds.length, 0);
  assert.match(r.version.id, /^av_[0-9a-f]{32}$/); assert.equal(r.version.label, '1.0');
  assert.ok(Object.isFrozen(r.version) && Object.isFrozen(r.version.payload.cells));
  await verifyAssetVersion(r.version);
  const again = await addAssetVersion(createAsset({ id: asset.id, name: 'X', provenance }), { payload: sampleWallPayload(), source: { format: 'demo' } });
  assert.equal(again.version.id, r.version.id, 'same asset, label and content give the same id');
  await assert.rejects(addAssetVersion(r.asset, { payload: sampleWallPayload(), label: '1.0', source: { format: 'demo' } }), /existiert bereits/);
  const tampered = structuredClone(r.version); tampered.payload.cells[0].paletteIndex = 1;
  await assert.rejects(verifyAssetVersion(tampered), /Payload-Hash/);
  const relabelled = { ...structuredClone(r.version), label: '9.9' };
  await assert.rejects(verifyAssetVersion(relabelled), /Kennung/);
  await assert.rejects(addAssetVersion(r.asset, { payload: sampleWallPayload(), label: '2', connectors: [lib.versions[0].connectors[0], lib.versions[0].connectors[0]], source: { format: 'demo' } }), /doppelte Anschluss/);
  assert.throws(() => createAsset({ name: ' ', provenance }), DomainError);
});
test('crop selects an explicit region, re-origins it and keeps the source unchanged', () => {
  const source = sampleWallPayload();
  const c = cropPayload(source, { min: [2, 0, 0], maxExclusive: [4, 2, 2] });
  assert.deepEqual(c.bounds, { min: [0, 0, 0], maxExclusive: [2, 2, 2] }); assert.deepEqual(c.sourceOrigin, [2, 0, 0]);
  assert.equal(countBlocks(c).blocks, 8); assert.equal(countBlocks(source).blocks, 54, '12 base + 36 body + 6 merlons');
  assert.throws(() => cropPayload(source, { min: [10, 0, 0], maxExclusive: [12, 1, 1] }), /außerhalb/);
});
test('library search matches words and tags deterministically and hides archived assets', () => {
  assert.deepEqual(searchAssets(lib.assets, { text: 'mauer' }).map(a => a.name), ['Eckturm', 'Mauersegment', 'Tor']);
  assert.deepEqual(searchAssets(lib.assets, { text: 'mauer zinnen' }).map(a => a.name), ['Mauersegment']);
  assert.deepEqual(searchAssets(lib.assets, { tags: ['tor'] }).map(a => a.id), ['sample_gate']);
  const archived = lib.assets.map(a => a.id === 'sample_gate' ? { ...a, archived: true } : a);
  assert.equal(searchAssets(archived, { tags: ['tor'] }).length, 0);
  assert.equal(searchAssets(archived, { tags: ['tor'], includeArchived: true }).length, 1);
});
test('operations have exact inverses: undo/redo restore instances, links and order', () => {
  const a = place(tower, [0, 0, 0]), b = place(wall, [4, 0, 1]);
  let { project, history } = projectWith(a, b);
  ({ project, history } = execute(project, history, { kind: 'link.add', link: { id: 'l1', a: { instanceId: a.id, connectorId: 'east' }, b: { instanceId: b.id, connectorId: 'west' } } }));
  const before = project;
  ({ project, history } = execute(project, history, { kind: 'instance.remove', instanceId: a.id }));
  assert.equal(project.instances.length, 1); assert.equal(project.links.length, 0);
  ({ project, history } = undo(project, history));
  assert.deepEqual(project.instances, before.instances); assert.deepEqual(project.links, before.links);
  ({ project, history } = redo(project, history));
  assert.equal(project.instances.length, 1); assert.equal(project.links.length, 0);
  ({ project, history } = undo(project, history));
  ({ project, history } = execute(project, history, { kind: 'instance.transform', instanceId: b.id, transform: { position: [9, 0, 9], quarterTurns: 1, mirrorX: true } }));
  assert.equal(history.redo.length, 0);
  ({ project, history } = undo(project, history));
  assert.deepEqual(project.instances[1].transform, b.transform);
  assert.ok(Object.isFrozen(project.instances));
});
test('invalid operations fail atomically', () => {
  const { project } = projectWith(place(tower, [0, 0, 0]));
  assert.throws(() => applyOperation(project, { kind: 'batch', label: 'x', operations: [
    { kind: 'instance.add', instance: place(wall, [0, 0, 0]) }, { kind: 'instance.remove', instanceId: 'nope' }] }), /existiert nicht/);
  assert.equal(project.instances.length, 1);
  assert.throws(() => applyOperation(project, { kind: 'instance.transform', instanceId: project.instances[0].id, transform: { position: [0.5, 0, 0], quarterTurns: 0, mirrorX: false } }));
  assert.throws(() => applyOperation(project, { kind: 'instance.add', instance: project.instances[0] }), /existiert bereits/);
});
test('tower and wall joined at their connectors compose without overlap', () => {
  const { project } = projectWith(place(tower, [0, 0, 0]), place(wall, [4, 0, 1]), place(gate, [10, 0, 1]));
  const r = resolveProject(project, versions);
  assert.equal(r.conflicts.length, 0); assert.equal(r.duplicates, 0); assert.deepEqual(r.exportBlockers, []);
  const sum = r.placed.reduce((n, p) => n + countBlocks(p.payload).blocks, 0);
  assert.equal(countBlocks(r.world).blocks, sum);
  assert.deepEqual(r.world.bounds, { min: [0, 0, 0], maxExclusive: [16, 8, 4] });
  assert.equal(r.boundsOverlaps.length, 0);
  assert.deepEqual(r.owners.get('5,1,1'), [project.instances[1].id]);
});
test('identical overlap counts once; differing overlap is a conflict, never silently ordered', () => {
  const dup = projectWith(place(wall, [0, 0, 0]), place(wall, [0, 0, 0])).project;
  const d = resolveProject(dup, versions);
  assert.equal(d.conflicts.length, 0); assert.equal(d.duplicates, 54); assert.equal(countBlocks(d.world).blocks, 54);
  const clash = projectWith(place(wall, [0, 0, 0]), place(gate, [0, 0, 0])).project;
  const c = resolveProject(clash, versions);
  assert.ok(c.conflicts.length > 0); assert.ok(c.exportBlockers.some(b => b.includes('Voxelkonflikte')));
  assert.ok(c.conflicts.every(x => x.previewInstanceId === clash.instances[0].id && !x.resolvedBy));
  assert.ok(c.conflicts.some(x => x.kind === 'state'));
  assert.equal(c.boundsOverlaps.length, 1);
});
test('explicit override decides conflicts; two overrides still conflict', () => {
  const p = projectWith(place(wall, [0, 0, 0]), place(gate, [0, 0, 0], { override: true })).project;
  const r = resolveProject(p, versions);
  assert.equal(r.conflicts.length, 0); assert.ok(r.overridden.length > 0);
  assert.ok(r.overridden.every(c => c.resolvedBy === p.instances[1].id));
  const fence = r.world.palette.findIndex(s => s.id === 'minecraft:oak_fence');
  assert.ok(r.world.cells.some(c => c.paletteIndex === fence));
  const both = projectWith(place(wall, [0, 0, 0], { override: true }), place(gate, [0, 0, 0], { override: true })).project;
  assert.ok(resolveProject(both, versions).conflicts.length > 0);
});
test('explicit air against a block is a conflict; missing versions and mod rotations block export', async () => {
  const air = await addAssetVersion(createAsset({ name: 'Luft', provenance }), { payload: tiny('minecraft:air'), source: { format: 'demo' } });
  const mod = await addAssetVersion(createAsset({ name: 'Mod', provenance }), { payload: tiny('example:machine'), source: { format: 'demo' } });
  const map = new Map([...versions, [air.version.id, air.version], [mod.version.id, mod.version]]);
  const r = resolveProject(projectWith(place(wall, [0, 0, 0]), place(air.version, [0, 1, 0])).project, map);
  assert.equal(r.conflicts.length, 1); assert.equal(r.conflicts[0].kind, 'air-vs-block');
  const rotated = resolveProject(projectWith(place(mod.version, [0, 0, 0], { t: { quarterTurns: 1 } })).project, map);
  assert.ok(rotated.issues.some(i => i.code === 'UNRESOLVED_BLOCK_STATE')); assert.ok(rotated.exportBlockers.length > 0);
  const vanilla = resolveProject(projectWith(place(gate, [0, 0, 0], { t: { quarterTurns: 3, mirrorX: true } })).project, map);
  assert.deepEqual(vanilla.issues, [], 'property-less vanilla blocks and fences rotate resolved');
  const missing = resolveProject(projectWith(newInstance({ assetVersionId: 'av_missing', name: 'weg' })).project, map);
  assert.ok(missing.exportBlockers.some(b => b.includes('fehlende')));
  assert.equal(resolveProject(createProject({ name: 'leer' }), map).world, null);
});
test('frozen revisions snapshot instances and stay unchanged by later edits', () => {
  let { project, history } = projectWith(place(tower, [0, 0, 0]));
  const f = freezeRevision(project, 'erste Freigabe');
  ({ project } = execute(f.project, history, { kind: 'instance.remove', instanceId: project.instances[0].id }));
  assert.equal(project.revisions[0].number, 1); assert.equal(project.revisions[0].instances.length, 1);
  assert.ok(Object.isFrozen(project.revisions[0].instances[0]));
});
