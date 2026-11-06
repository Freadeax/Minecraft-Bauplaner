// WORLD-SHARE-01: Weltplan and server web maps over the Team-Raum – document format and three-way merge.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWorldShareDoc, readWorldShareDoc, mergeWorldItems, mergeShapes, buildMapListDoc, readMapListDoc, mergeMapLists, mapShapes, sameItems } from '../../../dist/domain/src/index.js';

const site = (id, extra = {}) => ({ kind: 'site', id, name: `Platz ${id}`, note: '', dimension: 'minecraft:overworld', minX: 0, minZ: 0, width: 16, length: 16, y: null, projectId: null, ...extra });
const point = (id, extra = {}) => ({ kind: 'point', id, name: `Punkt ${id}`, note: '', dimension: 'minecraft:the_nether', type: 'portal', x: 1, y: 64, z: 2, ...extra });

test('document: build, read back, shapes per dimension, rejects foreign data', () => {
  const items = [site('s1', { group: 'Dorf', locked: true }), point('p1')];
  const shapes = { 'minecraft:overworld': mapShapes(null, items, 'minecraft:overworld'), 'minecraft:the_nether': mapShapes(null, items, 'minecraft:the_nether'), 'minecraft:the_end': [] };
  const doc = buildWorldShareDoc(items, shapes, 'bld_a', '2026-11-06T12:00:00Z');
  assert.deepEqual(Object.keys(doc.shapes), ['minecraft:overworld', 'minecraft:the_nether'], 'empty dimensions are left out');
  const back = readWorldShareDoc(JSON.parse(JSON.stringify(doc)));
  assert.ok(sameItems(back.items, items));
  assert.equal(back.shapes['minecraft:overworld'][0].kind, 'area');
  assert.throws(() => readWorldShareDoc({ ...doc, format: 'x' }), /kein geteilter Weltplan/);
  assert.throws(() => readWorldShareDoc({ ...doc, items: [site('a'), site('a')] }), /doppelt/);
  assert.throws(() => readWorldShareDoc({ ...doc, items: [{ ...site('a'), evil: 1 }] }), /unbekannte Felder/);
  assert.throws(() => readWorldShareDoc({ ...doc, shapes: { 'minecraft:overworld': [{ kind: 'blob' }] } }), /Marker/);
});

test('merge: one side changed wins, both changed → room, deletions, locks of the room hold', () => {
  const base = [site('a'), site('b'), site('c'), site('d'), site('e', { locked: true })];
  const local = [site('a', { name: 'hier umbenannt' }), site('b'), /* c deleted here */ site('d', { width: 20 }), site('e', { name: 'hier geändert' }), site('n')];
  const remote = [site('a'), site('b', { minX: 5 }), site('c'), site('d', { width: 30 }), site('e', { locked: true }), site('r')];
  const m = mergeWorldItems(base, local, remote);
  const by = Object.fromEntries(m.items.map(i => [i.id, i]));
  assert.equal(by.a.name, 'hier umbenannt', 'only here changed → here');
  assert.equal(by.b.minX, 5, 'only room changed → room');
  assert.equal(by.c, undefined, 'deleted here, untouched in the room → gone');
  assert.equal(by.d.width, 30, 'both changed → room');
  assert.deepEqual(m.conflicts, ['Platz d']);
  assert.equal(by.e.name, 'Platz e', 'locked in the room → room');
  assert.ok(by.n && by.r, 'new entries of both sides stay');
  assert.deepEqual(m.items.map(i => i.id), ['a', 'b', 'd', 'e', 'r', 'n'], 'room order, then new local entries');
  assert.equal(m.toSend, true);
  // Removed in the room, unchanged here → removed; changed here → kept.
  const m2 = mergeWorldItems([site('x'), site('y')], [site('x'), site('y', { width: 9 })], []);
  assert.deepEqual(m2.items.map(i => i.id), ['y']);
  // First contact (no base): union, nothing lost.
  const m3 = mergeWorldItems([], [site('l')], [site('r')]);
  assert.deepEqual(m3.items.map(i => i.id), ['r', 'l']);
  // Nothing local changed → exactly the room, nothing to send.
  const m4 = mergeWorldItems(remote, remote, remote);
  assert.equal(m4.toSend, false); assert.ok(sameItems(m4.items, remote));
});

test('shapes: fresh dimensions replace, other dimensions keep only their project markers', () => {
  const proj = { kind: 'area', id: 'projekt_x', label: 'Burg', detail: '', color: '#f2b84b', group: 'projekte', points: [[0, 0], [1, 0], [1, 1]], minY: 60, maxY: 70 };
  const old = { kind: 'poi', id: 'p', label: 'alt', detail: '', color: '#ffffff', group: 'punkte', x: 0, y: 0, z: 0 };
  const fresh = { ...old, id: 'q', label: 'neu' };
  const out = mergeShapes({ 'minecraft:the_end': [proj, old], 'minecraft:overworld': [old] }, { 'minecraft:overworld': [proj], 'minecraft:the_end': [fresh] }, 'minecraft:overworld');
  assert.deepEqual(out['minecraft:the_end'], [proj, fresh], 'other dimension: room projects + fresh Weltplan markers');
  assert.deepEqual(out['minecraft:overworld'], [proj], 'shown dimension: all fresh');
  assert.deepEqual(Object.keys(mergeShapes({ 'minecraft:the_end': [old] }, {}, 'minecraft:overworld')), [], 'old Weltplan markers do not survive');
});

test('Kartenliste: document and merge by name', () => {
  const a = { name: 'BlueMap', urlTemplate: 'https://karte.example/#{world}:{x}:{y}:{z}:150:0:0.9:0:0:perspective', worlds: { 'minecraft:overworld': 'world' } };
  const b = { name: 'Dynmap', urlTemplate: 'https://d.example/?worldname={world}&x={x}&y={y}&z={z}', worlds: { 'minecraft:overworld': 'world' } };
  const doc = readMapListDoc(JSON.parse(JSON.stringify(buildMapListDoc([a, b], a, 'bld_a'))));
  assert.equal(doc.maps.length, 2); assert.equal(doc.active.name, 'BlueMap');
  assert.throws(() => readMapListDoc({ format: 'bauplaner-live-maps' }), /keine geteilte Kartenliste/);
  const a2 = { ...a, worlds: { 'minecraft:overworld': 'welt' } };
  const m = mergeMapLists([a, b], [a2], [a, b]);
  assert.deepEqual(m.maps.map(x => x.worlds['minecraft:overworld'] ?? x.name), ['welt'], 'b deleted here, a changed here');
  assert.equal(m.toSend, true);
  assert.equal(mergeMapLists([a], [a], [a, b]).maps.length, 2, 'new in the room → here too');
});
