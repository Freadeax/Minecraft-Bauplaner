import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateRoadmap, renderRoadmap, renderOverview, checkChange } from '../../../scripts/roadmap/roadmap.mjs';
const baseline = () => JSON.parse(readFileSync('docs/roadmap.json', 'utf8'));

test('complete roadmap validates with unique IDs, four phases and real evidence paths', () => assert.deepEqual(validateRoadmap(baseline()), []));
test('roadmap rejects cycles, unknown dependencies and false verified states', () => {
  const a = baseline(); a.items[0].dependencies = [a.items[1].id];
  assert.ok(validateRoadmap(a).some(e => /Zyklisch/.test(e)));
  const b = baseline(); b.items[0].dependencies = ['MISSING-01'];
  assert.ok(validateRoadmap(b).some(e => /unbekannte/.test(e)));
  const c = baseline(); c.items[0].steps[0].done = false;
  assert.ok(validateRoadmap(c).some(e => /geprüft ohne/.test(e)));
});
test('roadmap shows partial steps, blockers and separate integration/publication', () => {
  // Blocker rendering must not depend on whether the live roadmap currently has a blocked task.
  const data = baseline(); data.items[0].blockers = ['Testblocker'];
  const text = renderRoadmap(data);
  for (const expected of ['PLAN-01', 'Nächste Aktion', 'Pages-Quelle', 'Blocker:', 'Implementiert ≠ geprüft']) assert.ok(text.includes(expected));
});
const required = ['docs/roadmap.json', 'docs/ROADMAP.md', 'docs/ROADMAP_HISTORY.md'];
test('source merge requires changed-file mapping, appended history and task attribution', () => {
  const previous = { items: [{ id: 'A-01', status: 'planned' }], events: [] };
  const current = { items: [{ id: 'A-01', status: 'in_progress' }], events: [{ items: ['A-01'], files: ['packages/a.ts'] }] };
  assert.deepEqual(checkChange(previous, current, [...required, 'packages/a.ts']), []);
  assert.ok(checkChange(previous, current, ['packages/a.ts']).some(e => /Fortschrittsnachweis/.test(e)));
  assert.ok(checkChange(previous, current, [...required, 'packages/b.ts']).some(e => /Aufgabenzuordnung/.test(e)));
  assert.ok(checkChange({ ...previous, events: [{ summary: 'original' }] }, { ...current, events: [{ summary: 'edited' }, ...current.events] }, [...required, 'packages/a.ts']).some(e => /umgeschrieben/.test(e)));
  assert.ok(checkChange(previous, { ...current, events: [{ items: ['B-01'], files: ['packages/a.ts'] }] }, [...required, 'packages/a.ts']).some(e => /Aufgabenänderung/.test(e)));
});
test('artifact-only child commit does not require a self-referencing roadmap update', () => {
  assert.deepEqual(checkChange({}, {}, ['deployment.json', 'assets/main-abc.js', 'index.html']), []);
  assert.ok(checkChange({ items: [], events: [] }, { items: [], events: [] }, ['packages/domain/src/core/project.ts', 'deployment.json']).length > 0);
});
test('overview groups open work by area, lists Philipp-only tasks and orphaned work', () => {
  const data = baseline();
  const text = renderOverview(data);
  for (const expected of ['## Überblick nach Bereichen', '## Was nur Philipp tun kann', '## Verwaiste Punkte']) assert.ok(text.includes(expected), expected);
  // „verwaist“ steht da, sobald es offene Arbeit ohne Thread gibt (der echte Stand kann auch keine haben).
  const orphan = structuredClone(data); orphan.items[0].status = 'planned'; delete orphan.items[0].thread; orphan.items[0].area = orphan.areas.find(a => a.id !== 'SPAETER').id;
  orphan.items[0].steps = orphan.items[0].steps.map(s => ({ ...s, done: false })); orphan.items[0].verification = { state: 'pending', note: 'x' };
  assert.ok(renderOverview(orphan).includes('**verwaist**'));
  for (const a of data.areas) assert.ok(text.includes(a.title), a.id);
  // Jede offene Aufgabe ohne Thread erscheint unter den verwaisten Punkten (außer zurückgestellte Backend-Option).
  const orphanPart = text.slice(text.indexOf('## Verwaiste Punkte'));
  for (const i of data.items.filter(i => !['verified', 'deferred'].includes(i.status) && !i.thread && i.area !== 'SPAETER')) assert.ok(orphanPart.includes(`[${i.id}]`), i.id);
  // Neue Aufgaben paralleler Threads ohne Bereich bleiben gültig und landen in eigener Gruppe.
  const loose = baseline(); delete loose.items[0].area;
  assert.deepEqual(validateRoadmap(loose), []);
  assert.ok(renderOverview(loose).includes('Noch keinem Bereich zugeordnet'));
});
test('overview fields reject unknown areas, Philipp kinds and intake references', () => {
  const a = baseline(); a.items[0].area = 'NIRGENDS';
  assert.ok(validateRoadmap(a).some(e => /unbekannter Bereich/.test(e)));
  const b = baseline(); b.items[0].philipp = [{ kind: 'irgendwas', text: 'x' }];
  assert.ok(validateRoadmap(b).some(e => /Philipp-Aufgaben/.test(e)));
  const c = baseline(); c.intake[0].items = ['MISSING-01'];
  assert.ok(validateRoadmap(c).some(e => /Eingang unvollständig/.test(e)));
});
