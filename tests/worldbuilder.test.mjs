// MAP-04 Weltbuilder: deleting, duplicating, turning, mirroring, path corners and ground alignment of Weltplan entries.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyWorldPlan, applyWorldPlanOp, checkWorldItem, checkWorldPlan, describeWorldPlanOp, itemBounds,
  removeItemsOp, selectionBounds, selectionPivot, itemsInRect, rotateColumn, mirrorColumn, rotateItem, mirrorItem, updateItemsOp, duplicateItems,
  pathVertexAt, movePathVertex, insertPathVertex, removePathVertex, reversePath, splitPath, joinPaths, groundHeight, alignToGround, WORLD_PLAN_MAX_ITEMS,
} from '../dist/domain/src/index.js';

const OW = 'minecraft:overworld';
const site = (id, minX, minZ, width, length, extra = {}) => ({ kind: 'site', id, name: `Platz ${id}`, note: '', dimension: OW, minX, minZ, width, length, y: null, projectId: null, ...extra });
const path = (id, points, width = 3) => ({ kind: 'path', id, name: `Weg ${id}`, note: '', dimension: OW, style: 'weg', width, points });
const point = (id, x, y, z, type = 'anker') => ({ kind: 'point', id, name: `Punkt ${id}`, note: '', dimension: OW, type, x, y, z });
const planOf = items => checkWorldPlan({ ...emptyWorldPlan(), items });

test('Löschen: mehrere Einträge in einem Schritt, Rückgängig stellt Reihenfolge wieder her', () => {
  const plan = planOf([site('a', 0, 0, 8, 8), path('b', [[0, 0], [9, 0]]), point('c', 1, 64, 1), point('d', 2, 64, 2), site('e', 20, 0, 4, 4)]);
  const op = removeItemsOp(plan, ['b', 'd', 'zz']);
  assert.equal(op.kind, 'batch');
  assert.equal(op.label, '2 Einträge gelöscht');
  const { plan: next, inverse } = applyWorldPlanOp(plan, op);
  assert.deepEqual(next.items.map(i => i.id), ['a', 'c', 'e']);
  assert.deepEqual(applyWorldPlanOp(next, inverse).plan, plan);
  assert.equal(removeItemsOp(plan, ['zz']), null);
  assert.equal(removeItemsOp(plan, ['c']).label, '„Punkt c“ gelöscht');
  // Deleting everything and undoing it is cheap (inverse grows linearly, not quadratically).
  const many = planOf(Array.from({ length: WORLD_PLAN_MAX_ITEMS }, (_, i) => point(`p${i}`, i, 64, 0)));
  const all = applyWorldPlanOp(many, removeItemsOp(many, many.items.map(i => i.id)));
  assert.equal(all.plan.items.length, 0);
  assert.equal(all.inverse.ops.length, WORLD_PLAN_MAX_ITEMS);
  assert.deepEqual(applyWorldPlanOp(all.plan, all.inverse).plan, many);
});

test('Einfügen an Position (Umkehrung von Entfernen) wird geprüft', () => {
  const plan = planOf([point('a', 0, 64, 0), point('b', 1, 64, 1)]);
  const { plan: next, inverse } = applyWorldPlanOp(plan, { kind: 'insert', item: point('x', 5, 64, 5), at: 1 });
  assert.deepEqual(next.items.map(i => i.id), ['a', 'x', 'b']);
  assert.deepEqual(inverse, { kind: 'remove', id: 'x' });
  assert.throws(() => applyWorldPlanOp(plan, { kind: 'insert', item: point('x', 0, 0, 0), at: 3 }), /Listenposition/);
  assert.throws(() => applyWorldPlanOp(plan, { kind: 'insert', item: point('a', 0, 0, 0), at: 0 }), /gibt es schon/);
  assert.match(describeWorldPlanOp({ kind: 'insert', item: point('x', 0, 0, 0), at: 0 }), /wiederhergestellt/);
});

test('Auswahl: Grenzen, Drehpunkt, Rahmen', () => {
  const items = [site('a', 0, 0, 8, 4), point('p', 20, 64, 10), path('w', [[-5, 3], [2, 3]], 1)];
  assert.deepEqual(selectionBounds(items), [-5, 0, 21, 11]);
  assert.equal(selectionBounds([]), null);
  assert.deepEqual(selectionPivot(items), [8, 6]);
  assert.deepEqual(itemsInRect(items, [19, 9, 22, 12]).map(i => i.id), ['p']);
  assert.deepEqual(itemsInRect(items, [-10, 2, 1, 4]).map(i => i.id).sort(), ['a', 'w']);
  assert.deepEqual(itemsInRect(items, [100, 100, 101, 101]), []);
});

test('Drehen und Spiegeln bleiben im Blockraster und sind umkehrbar', () => {
  // East of the pivot turns to south of it (north up).
  assert.deepEqual(rotateColumn([5, 0], [0, 0], 1), [-1, 5]);
  assert.deepEqual(rotateColumn([0, 0], [0, 0], 1), [-1, 0]);
  for (const c of [[3, -7], [0, 0], [-4, 9]]) {
    let r = c; for (let i = 0; i < 4; i++) r = rotateColumn(r, [2, 5], 1);
    assert.deepEqual(r, c, 'vier Vierteldrehungen = Ausgang');
    assert.deepEqual(rotateColumn(rotateColumn(c, [2, 5], 1), [2, 5], -1), c, 'links zurück');
    assert.deepEqual(mirrorColumn(mirrorColumn(c, [2, 5], 'x'), [2, 5], 'x'), c);
  }
  const s = site('a', 0, 0, 10, 4);
  const r = rotateItem(s, [5, 2], 1);
  assert.equal(r.width, 4); assert.equal(r.length, 10);
  const back = rotateItem(rotateItem(rotateItem(r, [5, 2], 1), [5, 2], 1), [5, 2], 1);
  assert.deepEqual(back, s);
  // Mirroring a site east-west keeps its size and flips its position.
  assert.deepEqual(mirrorItem(site('m', 2, 0, 3, 1), [0, 0], 'x'), site('m', -5, 0, 3, 1));
  const w = path('w', [[0, 0], [4, 0], [4, 2]]);
  assert.deepEqual(rotateItem(w, [0, 0], 1).points, [[-1, 0], [-1, 4], [-3, 4]]);
  assert.deepEqual(mirrorItem(point('p', 3, 70, 1), [0, 0], 'z'), point('p', 3, 70, -2));
  // All results stay valid entries.
  for (const it of [r, rotateItem(w, [0, 0], 3), mirrorItem(point('p', 3, 70, 1), [0, 0], 'x')]) checkWorldItem(it);
  // updateItemsOp only contains changed entries; null when nothing changed.
  const op = updateItemsOp([s, point('p', 0, 64, 0)], [r, point('p', 0, 64, 0)], 'Gedreht');
  assert.equal(op.ops.length, 1);
  assert.equal(updateItemsOp([s], [s], 'x'), null);
});

test('Duplizieren: neue IDs, Name mit Kopie, ohne Überlappung, Projektbindung nur auf Wunsch', () => {
  const items = [site('a', 0, 0, 8, 8, { projectId: 'proj1' }), point('p', 10, 64, 2)];
  const copies = duplicateItems(items, { seed: 'k' });
  assert.deepEqual(copies.map(c => c.id), ['site_k0', 'point_k1']);
  assert.deepEqual(copies.map(c => c.name), ['Platz a (Kopie)', 'Punkt p (Kopie)']);
  assert.equal(copies[0].minX, 13); // selection is 11 wide + 2 gap
  assert.equal(copies[0].projectId, null);
  assert.equal(duplicateItems(items, { keepProject: true, dx: 0, dz: 20, seed: 'q' })[0].projectId, 'proj1');
  const [ab] = items.map(itemBounds), [cb] = copies.map(itemBounds);
  assert.ok(cb[0] >= ab[2], 'Kopie liegt neben dem Original');
  const plan = planOf(items);
  const added = applyWorldPlanOp(plan, { kind: 'batch', label: 'Dupliziert', ops: copies.map(item => ({ kind: 'add', item })) }).plan;
  assert.equal(added.items.length, 4);
  assert.throws(() => duplicateItems(items, { existing: WORLD_PLAN_MAX_ITEMS - 1 }), /höchstens/);
  assert.equal(duplicateItems([], {}).length, 0);
  assert.equal(duplicateItems([{ ...point('x', 0, 0, 0), name: 'n'.repeat(120) }], { seed: 'l' })[0].name.length, 120);
});

test('Wegecken: verschieben, einfügen, löschen, umkehren, teilen, verbinden', () => {
  const w = path('w', [[0, 0], [10, 0], [10, 10]]);
  assert.equal(pathVertexAt(w, 10.4, 0.6, 1), 1);
  assert.equal(pathVertexAt(w, 5, 5, 1), -1);
  assert.deepEqual(movePathVertex(w, 1, [12, -2]).points, [[0, 0], [12, -2], [10, 10]]);
  assert.deepEqual(insertPathVertex(w, 0, [5, 3]).points, [[0, 0], [5, 3], [10, 0], [10, 10]]);
  assert.throws(() => insertPathVertex(w, 2, [5, 3]), /Wegabschnitt/);
  assert.deepEqual(removePathVertex(w, 1).points, [[0, 0], [10, 10]]);
  assert.throws(() => removePathVertex(path('k', [[0, 0], [1, 0]]), 0), /mindestens zwei Ecken/);
  assert.deepEqual(reversePath(w).points, [[10, 10], [10, 0], [0, 0]]);
  const [a, b] = splitPath(w, 1, 's');
  assert.deepEqual(a.points, [[0, 0], [10, 0]]); assert.deepEqual(b.points, [[10, 0], [10, 10]]);
  assert.equal(b.id, 'path_s'); assert.equal(a.id, 'w');
  assert.throws(() => splitPath(w, 0), /inneren Ecke/);
  assert.deepEqual(joinPaths(a, b).points, w.points);
  assert.deepEqual(joinPaths(a, reversePath(b)).points, w.points);
  assert.deepEqual(joinPaths(b, a).points, [[0, 0], [10, 0], [10, 10]]);
  assert.throws(() => joinPaths(a, path('far', [[50, 50], [60, 60]])), /berühren sich nicht/);
});

test('Am Gelände ausrichten: Punkt eins über Boden, Bauplatz Median, unbekanntes Gelände bleibt', () => {
  const ground = (x, z) => x >= 0 && x < 100 && z >= 0 && z < 100 ? { y: 60 + (x < 4 ? 0 : 6) } : null;
  assert.deepEqual(groundHeight(point('p', 1, 0, 1), ground), { y: 61, known: 1, total: 1 });
  const g = groundHeight(site('s', 0, 0, 10, 2), ground);
  assert.equal(g.y, 67); assert.equal(g.known, 20);
  assert.equal(groundHeight(path('w', [[0, 0], [5, 0]]), ground), null);
  assert.equal(groundHeight(point('far', 500, 64, 500), ground), null);
  // Large sites are sampled on a grid.
  assert.ok(groundHeight(site('big', 0, 0, 1000, 1000), ground).total <= 64 * 64);
  const r = alignToGround([point('p', 1, 0, 1), site('s', 0, 0, 10, 2), point('far', 500, 64, 500), path('w', [[0, 0], [5, 0]])], ground);
  assert.equal(r.aligned, 2); assert.equal(r.unknown, 1);
  assert.deepEqual(r.items.map(i => i.y), [61, 67, 64, undefined]);
});
