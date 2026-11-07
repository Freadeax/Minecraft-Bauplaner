// UX-02: Werkzeuge der 3D-Ansicht (freier Schnitt, Geistermodus, gespeicherte Kameras) und Projektansichten.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampCut, cutRange, defaultCut, inCut, nextCameraName, parseCameras, splitCells, withCamera, MAX_CAMERAS } from '../../../apps/web/src/viewer/viewTools.ts';
import { projectTabGroups, projectTabNames } from '../../../apps/web/src/views/project/tabNames.ts';
import { FIX_HELP } from '../../../apps/web/src/app/fixHelpText.ts';

const bounds = { min: [-2, 0, 5], maxExclusive: [4, 10, 8] };
const cell = (x, y, z, kind = 'block') => kind === 'erase' ? { kind, position: [x, y, z] } : { kind, position: [x, y, z], paletteIndex: 0 };

test('Schnitt: Bereich, Startlage, Grenzen und Seiten', () => {
  assert.deepEqual(cutRange(bounds, 'x'), [-2, 3]);
  assert.deepEqual(cutRange(bounds, 'y'), [0, 9]);
  assert.deepEqual(defaultCut(bounds), { axis: 'y', at: 4, keep: 'below' });
  assert.deepEqual(defaultCut(bounds, 'z'), { axis: 'z', at: 6, keep: 'below' });
  assert.equal(clampCut({ axis: 'x', at: 99, keep: 'above' }, bounds).at, 3);
  assert.equal(clampCut({ axis: 'x', at: -99, keep: 'above' }, bounds).at, -2);
  const c = { axis: 'y', at: 4, keep: 'below' };
  assert.equal(clampCut(c, bounds), c, 'unverändert = gleiche Referenz (kein neues Netz)');
  assert.equal(inCut([0, 4, 0], c), true);
  assert.equal(inCut([0, 5, 0], c), false);
  assert.equal(inCut([0, 4, 0], { ...c, keep: 'above' }), true);
  assert.equal(inCut([0, 3, 0], { ...c, keep: 'above' }), false);
});

test('Schnitt und Geister teilen Zellen; Löschzellen bleiben immer sichtbar', () => {
  const cells = [cell(0, 0, 5), cell(0, 6, 5), cell(1, 7, 5, 'erase'), cell(3, 1, 6)];
  const none = splitCells(cells, null, null);
  assert.equal(none.shown, cells, 'ohne Schnitt dieselbe Liste');
  const cut = splitCells(cells, { axis: 'y', at: 4, keep: 'below' });
  assert.deepEqual(cut.shown.map(c => c.position), [[0, 0, 5], [1, 7, 5], [3, 1, 6]]);
  assert.deepEqual(cut.hidden.map(c => c.position), [[0, 6, 5]]);
  const ghost = splitCells(cells, null, c => c.position[0] === 3);
  assert.deepEqual(ghost.hidden.map(c => c.position), [[3, 1, 6]]);
});

test('Kameras: Prüfung beim Lesen, Ersetzen gleicher Namen, Obergrenze', () => {
  const cam = name => ({ name, eye: [1, 2, 3], target: [0, 0, 0], projection: 'perspective' });
  const raw = JSON.stringify({ a: [cam('Ansicht 1'), { name: 'kaputt', eye: [1, 2] }, { ...cam('x'), projection: 'fisheye' }], b: 'nein' });
  assert.deepEqual(parseCameras(raw, 'a').map(c => c.name), ['Ansicht 1']);
  assert.deepEqual(parseCameras(raw, 'b'), []);
  assert.deepEqual(parseCameras('{kaputt', 'a'), []);
  assert.deepEqual(parseCameras(null, 'a'), []);
  let list = [cam('Ansicht 1')];
  assert.equal(nextCameraName(list), 'Ansicht 2');
  list = withCamera(list, { ...cam('Ansicht 1'), eye: [9, 9, 9] });
  assert.equal(list.length, 1); assert.deepEqual(list[0].eye, [9, 9, 9]);
  for (let i = 0; i < 20; i++) list = withCamera(list, cam(`K${i}`));
  assert.equal(list.length, MAX_CAMERAS);
  assert.equal(list.at(-1).name, 'K19');
});

test('Projekt: drei Hauptansichten, jede mit Reitern; Kurzlinks zeigen auf andere Ansichten', () => {
  assert.deepEqual(projectTabGroups.map(g => g.label), ['Entwerfen', 'Bauen', 'Verwalten']);
  const ids = new Set(projectTabNames.map(t => t.id));
  assert.equal(ids.size, projectTabNames.length, 'Reiter-Ids eindeutig');
  for (const g of projectTabGroups) assert.ok(projectTabNames.some(t => t.group === g.id), `${g.id} hat Reiter`);
  for (const t of projectTabNames) for (const r of t.related) {
    assert.ok(ids.has(r), `${t.id} → ${r} existiert`);
    assert.notEqual(r, t.id);
  }
  // Material, Gelände, Export und Team sind von einem passenden Schritt aus direkt verlinkt.
  const linked = new Set(projectTabNames.flatMap(t => t.related));
  for (const id of ['material', 'gelaende', 'export', 'team']) assert.ok(linked.has(id), `${id} als Kurzlink`);
});

test('Hilfe am Fehler: kurze Schritte, gültige Anleitungslinks', () => {
  for (const [id, h] of Object.entries(FIX_HELP)) {
    assert.ok(h.steps.length >= 1 && h.steps.length <= 3, `${id}: 1–3 Schritte`);
    for (const s of h.steps) assert.ok(s.length <= 200, `${id}: Schritt zu lang`);
    if ('guide' in h) assert.match(h.guide, /^#\/anleitung\?weg=[a-z-]+&schritt=\d+$/);
  }
});
