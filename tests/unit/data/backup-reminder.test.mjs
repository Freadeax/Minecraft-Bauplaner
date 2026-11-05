import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyOperation, createProject, newInstance, createSampleLibrary, resolveProject, buildGuide, evaluateProgress, tickSteps,
  createBackup, readBackup, checkProjectRecord, emptySite, addSection, updateSection, removeSection, moveSection, siteOperation, checkSite, pruneSite,
  freezeSection, compareSnapshot, planSnapshotRestore, deleteSnapshot, snapshotsOf, latestSnapshot, snapshotProjectContent, MAX_SNAPSHOTS,
  emptyLedger, checkBackupLedger, receiptForBackup, addReceipt, compareWithBackups, receiptForHash, recordFingerprint, MAX_BACKUP_RECEIPTS, BACKUP_REMIND_AFTER_DAYS, BACKUP_DISCLAIMER,
} from '../../../dist/domain/src/index.js';
import { MemoryRepository } from '../../../dist/application/src/memoryRepository.js';

const lib = await createSampleLibrary();
const versions = new Map(lib.versions.map(v => [v.id, v]));
const latest = id => lib.versions.find(v => v.assetId === id).id;
const at = (assetVersionId, name, position, quarterTurns = 0) => newInstance({ assetVersionId, name, transform: { position, quarterTurns, mirrorX: false } });
const run = (project, op) => applyOperation(project, op).project;
const withInstances = (name, ...instances) => run(createProject({ name }), { kind: 'batch', label: 't', operations: instances.map(instance => ({ kind: 'instance.add', instance })) });
const burg = () => withInstances('Burg', at(latest('sample_tower'), 'Turm West', [0, 0, 0]), at(latest('sample_wall'), 'Mauer', [4, 0, 1]), at(latest('sample_tower'), 'Turm Ost', [10, 0, 0]));
const derive = project => {
  const resolution = resolveProject(project, versions), guide = buildGuide(project, resolution);
  return { guide, progress: evaluateProgress(guide, project.progress) };
};
const source = (projects, extra = {}) => ({ projects, assets: lib.assets, versions, getOriginal: async () => null, ...extra });
const DAY = 86_400_000;

// ---------------------------------------------------------------------------
// S01 · Sicherungsstand

test('S01: never backed up → due; receipt from the file makes the data current', async () => {
  const p = { ...burg(), revision: 2 };
  const data = { projects: [p], assets: lib.assets, collections: [], templates: [] };
  const none = await compareWithBackups(emptyLedger(), data);
  assert.equal(none.level, 'due');
  assert.match(none.headline, /Noch nie gesichert/);
  assert.equal(none.pending.length, 1, 'shipped demo assets are not user data');
  assert.equal(none.disclaimer, BACKUP_DISCLAIMER);
  assert.doesNotMatch(none.headline + none.details.join(' '), /Cloud(kopie)? (vorhanden|gesichert)|in der Cloud gespeichert/i, 'never claims a cloud copy');
  assert.match(BACKUP_DISCLAIMER, /kann er nicht prüfen/);

  const file = await createBackup(source([p]), 'all');
  const ledger = addReceipt(emptyLedger(), await receiptForBackup(file, 'download', 'sicherung.json', '2026-11-01T10:00:00.000Z', 'r1'));
  const ok = await compareWithBackups(ledger, data, new Date('2026-11-01T11:00:00Z'));
  assert.equal(ok.level, 'ok');
  assert.equal(ok.lines[0].state, 'current');
  assert.equal(ok.lastDownload.id, 'r1');
  assert.equal(ok.lastFull.id, 'r1');
  assert.ok(ok.details.some(d => /Noch keine Sicherungsdatei wieder eingelesen/.test(d)), 'suggests verifying the file');
});

test('S01: storage revision is ignored, content changes are detected and age decides hint vs due', async () => {
  const p = { ...burg(), revision: 2, updatedAt: '2026-11-01T09:00:00.000Z' };
  const file = await createBackup(source([p]), 'project', [p.id]);
  const ledger = addReceipt(emptyLedger(), await receiptForBackup(file, 'download', 'p.json', '2026-11-01T10:00:00.000Z'));
  // Restored elsewhere with another storage revision, same content → still covered.
  const restored = { ...p, revision: 9 };
  assert.equal(await recordFingerprint(restored), await recordFingerprint(p));
  assert.equal((await compareWithBackups(ledger, { projects: [restored], assets: [], collections: [], templates: [] })).level, 'ok');

  const edited = { ...run(p, { kind: 'project.rename', name: 'Burg 2' }), updatedAt: '2026-11-02T09:00:00.000Z' };
  const fresh = await compareWithBackups(ledger, { projects: [edited], assets: [], collections: [], templates: [] }, new Date('2026-11-03T09:00:00Z'));
  assert.equal(fresh.lines[0].state, 'changed');
  assert.equal(fresh.level, 'hint', 'recent change: only a hint');
  assert.equal(fresh.pendingDays, 1);
  const old = await compareWithBackups(ledger, { projects: [edited], assets: [], collections: [], templates: [] }, new Date(Date.parse('2026-11-02T09:00:00Z') + BACKUP_REMIND_AFTER_DAYS * DAY));
  assert.equal(old.level, 'due');
  assert.match(old.headline, /Sicherung fällig: 1 Änderung .*seit 7 Tagen/);
  // A new project that is in no backup at all is due immediately.
  const other = { ...createProject({ name: 'Neu' }), revision: 1 };
  const withNew = await compareWithBackups(ledger, { projects: [p, other], assets: [], collections: [], templates: [] }, new Date('2026-11-01T11:00:00Z'));
  assert.equal(withNew.level, 'due');
  assert.deepEqual(withNew.pending.map(l => [l.name, l.state]), [['Neu', 'never']]);
});

test('S01: per-project backups cover only their project; full backups list removed projects', async () => {
  const a = { ...burg(), revision: 1 }, b = { ...withInstances('Hof', at(latest('sample_wall'), 'Mauer', [0, 0, 0])), revision: 1 };
  const full = await createBackup(source([a, b]), 'all');
  const one = await createBackup(source([a, b]), 'project', [a.id]);
  let ledger = addReceipt(emptyLedger(), await receiptForBackup(full, 'download', 'alles.json', '2026-11-01T10:00:00.000Z'));
  const a2 = run(a, { kind: 'project.rename', name: 'Burg neu' });
  const one2 = await createBackup(source([a2, b]), 'project', [a2.id]);
  ledger = addReceipt(ledger, await receiptForBackup(one2, 'download', 'burg.json', '2026-11-02T10:00:00.000Z'));
  const s = await compareWithBackups(ledger, { projects: [a2], assets: [], collections: [], templates: [] }, new Date('2026-11-02T11:00:00Z'));
  assert.equal(s.lines[0].state, 'current', 'newest receipt containing the project decides');
  assert.equal(s.lines[0].receipt.fileName, 'burg.json');
  assert.equal(s.lastFull.fileName, 'alles.json');
  assert.deepEqual(s.removedSinceFull.map(p => p.name), ['Hof']);
  assert.ok(s.details.some(d => /gibt es lokal nicht mehr/.test(d)));
  assert.ok(one.projects.length === 1);
});

test('S01: own library records count; verified receipts are found by hash; ledger validation and limit', async () => {
  const p = { ...burg(), revision: 1 };
  const own = { ...lib.assets.find(a => a.id === 'sample_wall'), id: 'own_wall', name: 'Eigene Mauer', demo: false };
  const data = { projects: [p], assets: [...lib.assets, own], collections: [], templates: [] };
  const projectOnly = await createBackup(source([p]), 'project', [p.id]);
  const ledger = addReceipt(emptyLedger(), await receiptForBackup(projectOnly, 'download', 'p.json', '2026-11-01T10:00:00.000Z'));
  const s = await compareWithBackups(ledger, data, new Date('2026-11-01T11:00:00Z'));
  assert.deepEqual(s.pending.map(l => [l.kind, l.name, l.state]), [['asset', 'Eigene Mauer', 'never']]);
  assert.ok(s.details.some(d => /eigener Bibliothekseintrag/.test(d)));

  const text = JSON.stringify(projectOnly);
  await readBackup(text);
  assert.equal(receiptForHash(ledger, JSON.parse(text).contentSha256).fileName, 'p.json');
  assert.equal(receiptForHash(ledger, 'ff'.repeat(32)), null);
  const verified = addReceipt(ledger, await receiptForBackup(JSON.parse(text), 'verified', 'kopie.json', '2026-11-01T12:00:00.000Z'));
  const v = await compareWithBackups(verified, { projects: [p], assets: [], collections: [], templates: [] });
  assert.equal(v.lastVerified.fileName, 'kopie.json');
  assert.ok(v.details.some(d => /Prüfsumme bestätigt/.test(d)));

  assert.throws(() => checkBackupLedger({ schemaVersion: 2, receipts: [] }), /Format/);
  assert.throws(() => checkBackupLedger({ schemaVersion: 1, receipts: [{ id: 'x', kind: 'cloud' }] }), /ungültig/);
  let big = emptyLedger();
  const r = await receiptForBackup(projectOnly, 'download', 'x.json', '2026-01-01T00:00:00.000Z');
  for (let i = 0; i < MAX_BACKUP_RECEIPTS + 5; i++) big = addReceipt(big, { ...r, id: `r${i}`, at: new Date(Date.parse('2026-01-01T00:00:00Z') + i * 1000).toISOString() });
  assert.equal(big.receipts.length, MAX_BACKUP_RECEIPTS);
  assert.equal(big.receipts[0].id, 'r5', 'oldest receipts are dropped first');
  assert.doesNotThrow(() => checkBackupLedger(big));
});

test('S01: memory repository records receipts atomically and validates them', async () => {
  const repo = new MemoryRepository();
  assert.deepEqual(await repo.getBackupLedger(), emptyLedger());
  const p = { ...burg(), revision: 1 };
  const file = await createBackup(source([p]), 'all');
  const ledger = await repo.recordBackup(await receiptForBackup(file, 'download', 'a.json'));
  assert.equal(ledger.receipts.length, 1);
  assert.equal((await repo.getBackupLedger()).receipts[0].fileName, 'a.json');
});

// ---------------------------------------------------------------------------
// S02 · Abschnittsstände

function frozenBurg() {
  let p = burg();
  const [west, wall, east] = p.instances;
  let site = addSection(addSection(emptySite(), 'Westteil', [{ instanceId: west.id }, { instanceId: wall.id, toLayer: 1 }], 'w'), 'Ost', [{ instanceId: east.id }], 'o');
  p = run(p, siteOperation(site, 'Abschnitte'));
  let d = derive(p);
  p = run(p, tickSteps(d.guide.steps.filter(s => s.instanceId === west.id && s.layer === 0), 'Fundament'));
  d = derive(p);
  const { site: frozen, snapshot } = freezeSection({ site: p.site, project: p, guide: d.guide, progress: d.progress, sectionId: 'w', label: 'vor dem Umbau', at: '2026-11-01T10:00:00.000Z', id: 'snap_1' });
  p = run(p, siteOperation(frozen, 'eingefroren'));
  return { p, snapshot, west, wall, east };
}
const cmp = (snapshot, p) => { const d = derive(p); return compareSnapshot(snapshot, { site: p.site, project: p, guide: d.guide, progress: d.progress }); };

test('S02: freezing keeps members, placements, links and steps reproducibly; survives storage and backups', async () => {
  const { p, snapshot, west, wall } = frozenBurg();
  assert.equal(snapshot.number, 1);
  assert.equal(snapshot.order, 0);
  assert.deepEqual(snapshot.instances.map(i => i.id).sort(), [west.id, wall.id].sort());
  assert.ok(snapshot.steps.length > 0 && snapshot.steps.every(s => s.instanceId === west.id || (s.instanceId === wall.id && s.layer <= 1)));
  assert.ok(snapshot.totals.done > 0 && snapshot.totals.done < snapshot.totals.steps);
  assert.equal(cmp(snapshot, p).state, 'same');
  assert.doesNotThrow(() => checkSite(p.site));
  assert.doesNotThrow(() => checkProjectRecord(structuredClone(p)));
  const back = await readBackup(JSON.stringify(await createBackup(source([p]), 'all')));
  assert.deepEqual(back.projects[0].site.snapshots, p.site.snapshots, 'snapshots travel with the project backup');
  // Second freeze of the same section gets the next number; another section starts at 1.
  const d = derive(p);
  const two = freezeSection({ site: p.site, project: p, guide: d.guide, progress: d.progress, sectionId: 'w', label: '' });
  assert.equal(two.snapshot.number, 2);
  const east = freezeSection({ site: two.site, project: p, guide: d.guide, progress: d.progress, sectionId: 'o', label: '' });
  assert.equal(east.snapshot.number, 1);
  assert.equal(latestSnapshot(east.site, 'w').number, 2);
  assert.equal(snapshotsOf(east.site).length, 3);
  assert.throws(() => freezeSection({ site: p.site, project: p, guide: d.guide, progress: d.progress, sectionId: 'nope', label: '' }), /existiert nicht/);
  const empty = addSection(p.site, 'Leer', [], 'e');
  assert.throws(() => freezeSection({ site: empty, project: p, guide: d.guide, progress: d.progress, sectionId: 'e', label: '' }), /keine vorhandenen Bauteile/);
});

test('S02: no silent changes – moves, version changes, membership, removal and step geometry are reported', () => {
  const { p, snapshot, west, wall } = frozenBurg();
  // Ticking more steps is progress, not a change of the section.
  const d0 = derive(p);
  const ticked = run(p, tickSteps(d0.guide.steps.filter(s => s.instanceId === west.id && s.layer === 1), 'mehr'));
  const c0 = cmp(snapshot, ticked);
  assert.equal(c0.state, 'same');
  assert.ok(c0.progress.doneNow > c0.progress.doneThen);
  // Renaming is cosmetic.
  const renamed = run(p, siteOperation(updateSection(p.site, 'w', { name: 'West' }), 'r'));
  assert.equal(cmp(snapshot, renamed).state, 'same');
  assert.match(cmp(snapshot, renamed).cosmetic[0].message, /Umbenannt/);
  // Move an instance.
  const moved = run(p, { kind: 'instance.transform', instanceId: west.id, transform: { position: [0, 0, -5], quarterTurns: 1, mirrorX: false } });
  const c1 = cmp(snapshot, moved);
  assert.equal(c1.state, 'changed');
  assert.ok(c1.changes.some(c => c.kind === 'instance-transform' && /verschoben oder gedreht/.test(c.message)));
  // Other version.
  const other = lib.versions.find(v => v.assetId === 'sample_wall');
  const swapped = run(p, { kind: 'instance.update', instanceId: west.id, assetVersionId: other.id });
  const c2 = cmp(snapshot, swapped);
  assert.ok(c2.changes.some(c => c.kind === 'instance-version'));
  assert.ok(c2.changes.some(c => c.kind === 'steps-geometry' || c.kind === 'steps-added' || c.kind === 'steps-removed'));
  // Membership.
  const widened = run(p, siteOperation(updateSection(p.site, 'w', { members: [{ instanceId: west.id }, { instanceId: wall.id }] }), 'm'));
  const c3 = cmp(snapshot, widened);
  assert.ok(c3.changes.some(c => c.kind === 'members'));
  assert.ok(c3.changes.some(c => c.kind === 'steps-added'));
  // A section earlier in the order that claims the same layers takes steps away.
  const stolen = run(p, siteOperation(moveSection(addSection(p.site, 'Vorab', [{ instanceId: west.id, toLayer: 0 }], 'v'), 'v', -1), 'v'));
  const stolenOnce = run(p, siteOperation({ ...p.site, sections: [{ id: 'v', name: 'Vorab', members: [{ instanceId: west.id, toLayer: 0 }] }, ...p.site.sections] }, 'v'));
  assert.ok(cmp(snapshot, stolenOnce).changes.some(c => c.kind === 'steps-removed'), 'steps claimed by an earlier section are reported');
  assert.ok(stolen);
  // Instance removed and section removed.
  const removedInstance = run(p, { kind: 'instance.remove', instanceId: wall.id });
  assert.ok(cmp(snapshot, removedInstance).changes.some(c => c.kind === 'instance-removed'));
  const removedSection = run(p, siteOperation(removeSection(p.site, 'w'), 'weg'));
  const c4 = cmp(snapshot, removedSection);
  assert.equal(c4.state, 'section-removed');
  assert.equal(snapshotsOf(removedSection.site).length, 1, 'removing a section keeps its frozen states');
  assert.equal(snapshotsOf(pruneSite(removedInstance.site, removedInstance)).length, 1, 'pruning keeps frozen states');
});

test('S02: restore is previewed, undoable and reproduces the frozen geometry', () => {
  const { p, snapshot, west, wall } = frozenBurg();
  const other = lib.versions.find(v => v.assetId === 'sample_wall');
  let changed = run(p, { kind: 'instance.transform', instanceId: west.id, transform: { position: [0, 0, -5], quarterTurns: 1, mirrorX: false } });
  changed = run(changed, { kind: 'instance.remove', instanceId: wall.id });
  changed = run(changed, siteOperation(removeSection(changed.site, 'w'), 'weg'));
  assert.equal(cmp(snapshot, changed).state, 'section-removed');
  const plan = planSnapshotRestore(snapshot, changed.site, changed, versions);
  assert.equal(plan.blocked.length, 0);
  assert.ok(plan.actions.some(a => /wieder einfügen/.test(a)));
  assert.ok(plan.actions.some(a => /zurück an/.test(a)));
  assert.ok(plan.actions.some(a => /wieder anlegen/.test(a)));
  assert.ok(plan.warnings.some(w => /prüfbedürftig/.test(w)));
  const restored = applyOperation(changed, plan.operation);
  const c = cmp(snapshot, restored.project);
  assert.equal(c.state, 'same', c.changes.map(x => x.message).join('; '));
  assert.equal(c.fingerprintNow, snapshot.fingerprint, 'fingerprint reproduces exactly');
  assert.equal(restored.project.site.sections[0].id, 'w', 'section back at its old position');
  // Ticks are not touched; undo returns to the changed state.
  assert.deepEqual(restored.project.progress, changed.progress);
  const undone = applyOperation(restored.project, restored.inverse).project;
  assert.equal(cmp(snapshot, undone).state, 'section-removed');
  // Nothing to do when unchanged; missing versions block.
  assert.equal(planSnapshotRestore(snapshot, p.site, p, versions).operation, null);
  const missing = new Map([...versions].filter(([id]) => id !== west.assetVersionId));
  const blocked = planSnapshotRestore(snapshot, changed.site, changed, missing);
  assert.equal(blocked.operation, null);
  assert.match(blocked.blocked[0], /fehlt lokal/);
  assert.ok(other);
});

test('S02: a stand as separate project keeps ticks only where the geometry is the same; deletion is explicit', () => {
  const { p, snapshot } = frozenBurg();
  const content = snapshotProjectContent(snapshot);
  const copy = { ...createProject({ name: 'Kopie' }), ...content };
  assert.doesNotThrow(() => checkProjectRecord(structuredClone(copy)));
  const d = derive(copy);
  const done = [...d.progress.status.values()].filter(s => s === 'done').length, review = [...d.progress.status.values()].filter(s => s === 'review').length;
  assert.equal(done + review, snapshot.totals.done, 'every frozen tick is either still done or visibly prüfbedürftig');
  assert.ok(done > 0);
  const c = compareSnapshot(snapshot, { site: copy.site, project: copy, guide: d.guide, progress: d.progress });
  assert.equal(c.changes.filter(x => x.kind.startsWith('instance') || x.kind === 'members').length, 0, 'same instances and members in the copy');
  const without = deleteSnapshot(p.site, snapshot.id);
  assert.equal(without.snapshots, undefined);
  assert.throws(() => deleteSnapshot(without, snapshot.id), /existiert nicht/);
  assert.throws(() => checkSite({ ...p.site, snapshots: [{ ...snapshot }, { ...snapshot }] }), /doppelt/);
  assert.throws(() => checkSite({ ...p.site, snapshots: [{ ...snapshot, instances: [{ id: 'x' }] }] }), /Bauteilkopie/);
  assert.ok(MAX_SNAPSHOTS >= 100);
});
