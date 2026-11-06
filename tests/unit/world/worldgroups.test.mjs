// MAP-04 / GAME-07-S11: benannte Gruppen und Sperren im Weltplan (Schema 3) und ihr Weg zur Mod.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyWorldPlan, applyWorldPlanOp, checkWorldItem, checkWorldPlan, removeItemsOp, updateItemsOp, moveItem, duplicateItems, splitPath,
  setGroupOp, setLockedOp, renameGroupOp, withGroupMates, splitLocked, groupSummary, groupNames, marksForMod, marksBody, groupBody, readLiveStatus,
  LIVE_FEATURE_GROUPS, WORLD_PLAN_SCHEMA_VERSION,
} from '../../../dist/domain/src/index.js';

const OW = 'minecraft:overworld';
const site = (id, extra = {}) => ({ kind: 'site', id, name: `Platz ${id}`, note: '', dimension: OW, minX: 0, minZ: 0, width: 8, length: 8, y: 64, projectId: null, ...extra });
const path = (id, extra = {}) => ({ kind: 'path', id, name: `Weg ${id}`, note: '', dimension: OW, style: 'weg', width: 3, points: [[0, 0], [5, 0], [9, 4]], ...extra });
const point = (id, extra = {}) => ({ kind: 'point', id, name: `Punkt ${id}`, note: '', dimension: OW, type: 'anker', x: 1, y: 64, z: 1, ...extra });
const planOf = items => checkWorldPlan({ ...emptyWorldPlan(), items });
const run = (plan, op) => applyWorldPlanOp(plan, op);

test('Schema 3: Gruppe und Sperre sind optional, ältere Einträge bleiben gleich', () => {
  assert.equal(WORLD_PLAN_SCHEMA_VERSION, 3);
  assert.deepEqual(checkWorldItem(site('a')), site('a'));
  assert.deepEqual(checkWorldItem(site('a', { group: ' Markt ', locked: true })), site('a', { group: 'Markt', locked: true }));
  // Empty values are dropped, so the entry looks like before.
  assert.deepEqual(checkWorldItem(site('a', { group: '', locked: false })), site('a'));
  assert.throws(() => checkWorldItem(site('a', { locked: 'ja' })), /Sperre/);
  assert.throws(() => checkWorldItem(site('a', { group: 'x'.repeat(41) })), /Gruppe/);
  assert.equal(checkWorldPlan({ ...emptyWorldPlan(), schemaVersion: 2, items: [point('p')] }).schemaVersion, 3);
  assert.deepEqual(groupNames([site('a', { group: 'Zentrum' }), point('b', { group: 'Außen' }), path('c')]), ['Außen', 'Zentrum']);
});

test('Gruppen bilden, umbenennen und auflösen – je ein Rückgängig-Schritt', () => {
  const plan = planOf([site('a'), path('b'), point('c')]);
  const op = setGroupOp(plan.items.slice(0, 2), 'Marktplatz');
  assert.equal(op.label, 'Gruppe „Marktplatz“ gebildet');
  const { plan: grouped, inverse } = run(plan, op);
  assert.deepEqual(grouped.items.map(i => i.group ?? null), ['Marktplatz', 'Marktplatz', null]);
  assert.deepEqual(run(grouped, inverse).plan, plan);
  assert.equal(setGroupOp(grouped.items.slice(0, 2), 'Marktplatz'), null, 'nothing changes');
  const renamed = run(grouped, renameGroupOp(grouped.items, 'Marktplatz', 'Altstadt')).plan;
  assert.deepEqual(groupNames(renamed.items), ['Altstadt']);
  const dissolved = run(renamed, renameGroupOp(renamed.items, 'Altstadt', ''));
  assert.deepEqual(groupNames(dissolved.plan.items), []);
  assert.match(renameGroupOp(renamed.items, 'Altstadt', '').label, /aufgelöst/);
  // A click selects the whole group, the clicked entry stays the primary (last).
  assert.deepEqual(withGroupMates(grouped.items, 'b'), ['a', 'b']);
  assert.deepEqual(withGroupMates(grouped.items, 'c'), ['c']);
  assert.deepEqual(groupSummary(run(grouped, setLockedOp([grouped.items[0]], true)).plan.items), [{ name: 'Marktplatz', count: 2, locked: 1 }]);
});

test('Gesperrte Einträge: nicht verschieben, umformen oder löschen; Name und Projekt bleiben änderbar', () => {
  const plan = planOf([site('a'), path('b'), point('c')]);
  const locked = run(plan, setLockedOp(plan.items, true));
  assert.equal(setLockedOp(plan.items, true).label, '3 Einträge gesperrt');
  const [a, b, c] = locked.plan.items;
  assert.equal(a.locked, true);
  assert.throws(() => run(locked.plan, updateItemsOp([a], [moveItem(a, 4, 0)], 'Verschoben')), /gesperrt – erst entsperren/);
  assert.throws(() => run(locked.plan, removeItemsOp(locked.plan, ['c'])), /gesperrt – erst entsperren, dann löschen/);
  assert.throws(() => run(locked.plan, { kind: 'batch', label: 'teilen', ops: splitPath(b, 1, 't').map((p, k) => k ? { kind: 'add', item: p } : { kind: 'update', item: p }) }), /gesperrt/);
  // Renaming, notes, groups and the project link are no change of place or shape.
  const renamed = run(locked.plan, { kind: 'update', item: { ...a, name: 'Rathausplatz', projectId: 'p_rathaus', group: 'Zentrum' } });
  assert.equal(renamed.plan.items[0].name, 'Rathausplatz');
  // Unlock, move, undo both: back to the locked original.
  const open = run(locked.plan, setLockedOp([c], false));
  assert.equal(open.plan.items[2].locked, undefined);
  const moved = run(open.plan, updateItemsOp([open.plan.items[2]], [moveItem(open.plan.items[2], 1, 1)], 'Verschoben'));
  assert.deepEqual(run(run(moved.plan, moved.inverse).plan, open.inverse).plan, locked.plan);
  // Undo of locking is always possible (only the lock changes).
  assert.deepEqual(run(locked.plan, locked.inverse).plan, plan);
  assert.deepEqual(splitLocked(open.plan.items).open.map(i => i.id), ['c']);
  // Copies of a locked entry start unlocked, so undoing the copy can remove it.
  const copies = duplicateItems([a], { seed: 'k' });
  assert.equal(copies[0].locked, undefined);
  const added = run(locked.plan, { kind: 'batch', label: 'Dupliziert', ops: copies.map(item => ({ kind: 'add', item })) });
  assert.deepEqual(run(added.plan, added.inverse).plan, locked.plan);
});

test('Mod-Vertrag: Gruppe und Sperre gehen mit, ältere Mods bekommen sie nicht', () => {
  const items = [site('a', { group: 'Markt', locked: true, layer: 'Phase 1' }), point('b')];
  const body = marksBody(OW, items);
  assert.deepEqual(body.items[0], items[0]);
  const v2 = { app: 'bauplaner-mod', protocol: 2, mod: { version: '0.17.2', loader: 'fabric', minecraft: '26.3' }, pairing: false, features: ['marks2'] };
  assert.deepEqual(marksForMod(items, v2).items, items, 'marks2 mods ignore unknown fields');
  const v1 = marksForMod(items, { ...v2, protocol: 1, features: [] });
  assert.equal(v1.items[0].group, undefined); assert.equal(v1.items[0].locked, undefined); assert.equal(v1.items[0].layer, undefined);
  assert.deepEqual(groupBody(' Markt '), { group: 'Markt' });
  assert.deepEqual(groupBody(null), { group: null });
  assert.throws(() => groupBody(''), /Gruppe/);
  assert.equal(LIVE_FEATURE_GROUPS, 'groups');
  const hologram = { planFile: 't.schem', name: 'T', projectId: null, revisionNumber: null, placement: { dimension: OW, x: 0, y: 64, z: 0, turns: 0, mirror: false },
    visible: true, box: [0, 64, 0, 4, 70, 4], counts: { ok: 1, state: 0, missing: 2, wrong: 0, unknown: 0 }, total: 3 };
  const st = { time: '2026-11-06T10:00:00Z', player: null, world: null, marks: 2 };
  const old = readLiveStatus({ ...st, hologram });
  assert.equal(old.hologram.group, null); assert.equal(old.hologram.locked, 0);
  const neu = readLiveStatus({ ...st, hologram: { ...hologram, group: 'Markt', locked: 17 } });
  assert.equal(neu.hologram.group, 'Markt'); assert.equal(neu.hologram.locked, 17);
});
