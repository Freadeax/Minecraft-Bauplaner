import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyWorldPlan, checkWorldItem, checkWorldPlan, applyWorldPlanOp, describeWorldPlanOp, siteFromCorners, snapSiteToChunks, pathColumns, pathLength,
  itemBounds, itemAt, moveItem, sitesTouching, worldPlanSummary, itemsOf, newWorldItemId, createBackup, readBackup, serializeBackup, planRestore, buildRestore,
  createSampleLibrary, WORLD_PLAN_MAX_ITEMS,
} from '../dist/domain/src/index.js';
import { MemoryRepository, WorldPlanConflictError } from '../dist/application/src/index.js';

const OW = 'minecraft:overworld';
const site = (id, minX, minZ, width, length, extra = {}) => ({ kind: 'site', id, name: `Platz ${id}`, note: '', dimension: OW, minX, minZ, width, length, y: null, projectId: null, ...extra });
const path = (id, points, width = 3, extra = {}) => ({ kind: 'path', id, name: `Weg ${id}`, note: '', dimension: OW, style: 'weg', width, points, ...extra });
const point = (id, x, y, z, type = 'anker') => ({ kind: 'point', id, name: `Punkt ${id}`, note: '', dimension: OW, type, x, y, z });

test('Einträge werden streng geprüft', () => {
  assert.deepEqual(checkWorldItem(site('a', 0, 0, 16, 16)), site('a', 0, 0, 16, 16));
  assert.throws(() => checkWorldItem({ ...site('a', 0, 0, 16, 16), extra: 1 }), /unbekannte Felder extra/);
  assert.throws(() => checkWorldItem(site('a', 0, 0, 0, 16)), /Breite/);
  assert.throws(() => checkWorldItem(site('a b', 0, 0, 1, 1)), /ID/);
  assert.throws(() => checkWorldItem({ ...site('a', 0, 0, 1, 1), name: '  ' }), /Name fehlt/);
  assert.throws(() => checkWorldItem({ ...site('a', 0, 0, 1, 1), dimension: 'Oberwelt' }), /Dimension/);
  assert.throws(() => checkWorldItem(site('a', 29_999_984, 0, 2, 1)), /Weltrand/);
  assert.throws(() => checkWorldItem(path('p', [[0, 0]])), /2 bis/);
  assert.throws(() => checkWorldItem(path('p', [[0, 0], [1.5, 2]])), /ganze Zahl/);
  assert.throws(() => checkWorldItem({ ...path('p', [[0, 0], [1, 1]]), style: 'autobahn' }), /Wegart/);
  assert.throws(() => checkWorldItem(point('x', 0, 5000, 0)), /Y/);
  assert.throws(() => checkWorldItem({ ...point('x', 0, 64, 0), type: 'schatz' }), /Punktart/);
  assert.throws(() => checkWorldItem({ kind: 'kreis', id: 'k', name: 'K', note: '', dimension: OW }), /unbekannte Art/);
  assert.throws(() => checkWorldPlan({ ...emptyWorldPlan(), items: [point('a', 0, 0, 0), point('a', 1, 1, 1)] }), /doppelt/);
  assert.throws(() => checkWorldPlan({ ...emptyWorldPlan(), schemaVersion: 2 }), /Schemaversion/);
});

test('Operationen mit exakter Umkehrung, auch Entfernen in der Mitte', () => {
  let plan = emptyWorldPlan();
  const steps = [
    { kind: 'add', item: site('a', 0, 0, 16, 16) },
    { kind: 'add', item: path('b', [[0, 0], [10, 0]]) },
    { kind: 'add', item: point('c', 5, 64, 5) },
  ];
  for (const op of steps) plan = applyWorldPlanOp(plan, op).plan;
  assert.deepEqual(plan.items.map(i => i.id), ['a', 'b', 'c']);
  const before = structuredClone(plan);
  for (const op of [{ kind: 'remove', id: 'a' }, { kind: 'remove', id: 'b' }, { kind: 'update', item: moveItem(plan.items[2], 3, -2, 1) },
    { kind: 'batch', label: 'Mehreres', ops: [{ kind: 'remove', id: 'c' }, { kind: 'add', item: point('d', 0, 70, 0, 'lager') }] }]) {
    const { plan: next, inverse } = applyWorldPlanOp(plan, op);
    assert.notDeepEqual(next, plan);
    assert.deepEqual(applyWorldPlanOp(next, inverse).plan, before, describeWorldPlanOp(op));
  }
  assert.throws(() => applyWorldPlanOp(plan, { kind: 'add', item: point('a', 0, 0, 0) }), /gibt es schon/);
  assert.throws(() => applyWorldPlanOp(plan, { kind: 'remove', id: 'zz' }), /fehlt/);
  assert.throws(() => applyWorldPlanOp(plan, { kind: 'update', item: point('zz', 0, 0, 0) }), /fehlt/);
  // Batches are all or nothing.
  assert.throws(() => applyWorldPlanOp(plan, { kind: 'batch', label: 'x', ops: [{ kind: 'remove', id: 'c' }, { kind: 'remove', id: 'c' }] }));
  assert.deepEqual(plan, before);
  assert.match(describeWorldPlanOp({ kind: 'add', item: point('e', 0, 0, 0, 'portal') }), /Portal „Punkt e“ angelegt/);
});

test('Limit der Einträge', () => {
  const items = Array.from({ length: WORLD_PLAN_MAX_ITEMS }, (_, i) => point(`p${i}`, i, 64, 0));
  const plan = checkWorldPlan({ ...emptyWorldPlan(), items });
  assert.throws(() => applyWorldPlanOp(plan, { kind: 'add', item: point('extra', 0, 0, 0) }), /höchstens/);
});

test('Geometrie: Rechteck aus Ecken, Chunkraster, Wegspalten, Länge, Treffer', () => {
  assert.deepEqual(siteFromCorners([10, 5], [3, -2]), { minX: 3, minZ: -2, width: 8, length: 8 });
  assert.deepEqual(snapSiteToChunks({ minX: 3, minZ: -2, width: 8, length: 8 }), { minX: 0, minZ: -16, width: 16, length: 32 });
  // Straight path, width 1: exactly the centre line.
  assert.deepEqual(pathColumns({ points: [[0, 0], [3, 0]], width: 1 }), [[0, 0], [1, 0], [2, 0], [3, 0]]);
  // Diagonal path is four-connected (no corner-only steps), from (0,0) to (3,3) = 7 columns.
  const diag = pathColumns({ points: [[0, 0], [3, 3]], width: 1 });
  assert.equal(diag.length, 7);
  const set = new Set(diag.map(c => c.join(',')));
  for (const [x, z] of diag) if (x !== 3 || z !== 3) assert.ok(set.has(`${x + 1},${z}`) || set.has(`${x},${z + 1}`), `Lücke nach ${x},${z}`);
  // Width 3 widens symmetrically; corners do not duplicate columns.
  const wide = pathColumns({ points: [[0, 0], [4, 0], [4, 4]], width: 3 });
  assert.equal(new Set(wide.map(c => c.join(','))).size, wide.length);
  assert.ok(wide.some(c => c[0] === -1 && c[1] === -1) && wide.some(c => c[0] === 5 && c[1] === 5));
  assert.equal(pathLength([[0, 0], [3, 4], [3, 10]]), 11);
  assert.deepEqual(itemBounds(path('p', [[0, 0], [10, 2]], 3)), [-1, -1, 12, 4]);
  assert.deepEqual(itemBounds(path('p', [[0, 0], [10, 2]], 4)), [-1, -1, 13, 5]);
  const items = [site('big', 0, 0, 50, 50), site('small', 10, 10, 5, 5), path('road', [[0, 25], [49, 25]], 3), point('pt', 12, 64, 12)];
  assert.equal(itemAt(items, 12.5, 12.5)?.id, 'pt');
  assert.equal(itemAt(items, 11, 11, 0.1)?.id, 'small');
  assert.equal(itemAt(items, 30.5, 25.9, 0.1)?.id, 'road');
  assert.equal(itemAt(items, 40, 40, 0.1)?.id, 'big');
  assert.equal(itemAt(items, 60, 60), null);
  assert.deepEqual(sitesTouching(items, [12, 12, 13, 13]).map(s => s.id).sort(), ['big', 'small']);
  assert.deepEqual(sitesTouching(items, [12, 12, 13, 13], 'big').map(s => s.id), ['small']);
  const sum = worldPlanSummary(items);
  assert.deepEqual({ ...sum, pathBlocks: undefined }, { sites: 2, freeSites: 2, siteArea: 2525, paths: 1, pathBlocks: undefined, pathLength: 49, points: 1 });
  assert.equal(sum.pathBlocks, 52 * 3); // x −1…50 (brush reaches one past both ends), three wide
  assert.deepEqual(moveItem(path('p', [[0, 0], [1, 1]]), 2, 3).points, [[2, 3], [3, 4]]);
  assert.equal(itemsOf({ ...emptyWorldPlan(), items: [point('a', 0, 0, 0), { ...point('b', 0, 0, 0), dimension: 'minecraft:the_nether' }] }, OW).length, 1);
  assert.match(newWorldItemId('site'), /^site_[a-z0-9]+$/);
  assert.equal(newWorldItemId('point', 'x1'), 'point_x1');
});

test('Speicher: Revision und Konflikt wie bei Projekten', async () => {
  const repo = new MemoryRepository();
  const empty = await repo.getWorldPlan();
  assert.equal(empty.revision, 0);
  const saved = await repo.saveWorldPlan(applyWorldPlanOp(empty, { kind: 'add', item: site('a', 0, 0, 8, 8) }).plan, 0);
  assert.equal(saved.revision, 1);
  await assert.rejects(repo.saveWorldPlan(applyWorldPlanOp(empty, { kind: 'add', item: site('b', 0, 0, 8, 8) }).plan, 0), WorldPlanConflictError);
  assert.deepEqual((await repo.getWorldPlan()).items.map(i => i.id), ['a']);
});

test('Sicherung: Weltplan reist mit (Format 2), Wiederherstellung ergänzt ohne zu überschreiben', async () => {
  const lib = await createSampleLibrary();
  const versions = new Map(lib.versions.map(v => [v.id, v]));
  const worldPlan = checkWorldPlan({ ...emptyWorldPlan(), revision: 3, items: [site('a', 0, 0, 16, 16), path('b', [[0, 0], [5, 5]]), point('c', 1, 64, 1)] });
  const source = { projects: [], assets: lib.assets, versions, getOriginal: async () => null, worldPlan };
  const file = await createBackup(source, 'all');
  assert.equal(file.formatVersion, 2);
  assert.deepEqual(file.worldPlanItems.map(i => i.id), ['a', 'b', 'c']);
  const back = await readBackup(serializeBackup(file));
  assert.deepEqual(back.worldPlanItems, worldPlan.items);
  // Project backups never carry the world plan.
  const none = await createBackup({ ...source, worldPlan }, 'project', []);
  assert.equal(none.worldPlanItems, undefined);
  // Tampering is caught by the content hash.
  const tampered = JSON.parse(serializeBackup(file)); tampered.worldPlanItems[0].name = 'Anders';
  await assert.rejects(readBackup(JSON.stringify(tampered)), /Prüfsumme/);
  // Restore: same entry skipped, new entry added, differing entry added as copy.
  const local = [site('a', 0, 0, 16, 16), { ...point('c', 1, 64, 1), name: 'Lokal' }];
  const plan = planRestore(back, { projects: [], assets: lib.assets, versionIds: new Set(versions.keys()), originalHashes: new Set(), worldPlanItems: local });
  assert.deepEqual(plan.worldPlanItems.map(p => p.status), ['same', 'new', 'differs']);
  const write = buildRestore(plan);
  assert.equal(write.worldPlanItems.length, 2);
  assert.equal(write.worldPlanItems[0].id, 'b');
  assert.notEqual(write.worldPlanItems[1].id, 'c');
  assert.match(write.worldPlanItems[1].name, /Wiederhergestellt/);
  assert.ok(write.summary.some(s => s.startsWith('Weltplan: 2')));
  // Format 1 files must not contain world plan entries.
  const plain = await createBackup({ ...source, worldPlan: emptyWorldPlan() }, 'all');
  assert.equal(plain.formatVersion, 1);
  const bad = { ...JSON.parse(serializeBackup(plain)), worldPlanItems: [] };
  await assert.rejects(readBackup(JSON.stringify(bad)), /Weltplan/);
});
