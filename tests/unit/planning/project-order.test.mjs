// PROJ-04: Reihenfolge zwischen Projekten („erst nach …“), Kreise, Stufen und frühester Start aus dem Basisplan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addProjectAfter, removeProjectAfter, checkSite, emptySite, setProgramSettings, projectLinks, projectCycle, projectAfterProblem,
  projectLevels, projectStartCheck, projectSuccessors, MAX_PROJECT_AFTER } from '../../../dist/domain/src/index.js';

const proj = (id, name, site = emptySite()) => ({ id, name, site });
const withBaseline = (site, end) => ({ ...site, program: { schemaVersion: 1, builders: [], milestones: [], dependencies: [], assignments: {}, start: '2026-11-01',
  baseline: { at: '2026-11-01', ...(end && { end }), sections: {}, milestones: {} } } });

test('erst nach: anlegen, prüfen, entfernen; ungültige Einträge abgewiesen', () => {
  let site = addProjectAfter(emptySite(), 'burg', 'lager', '  Material zuerst  ');
  assert.deepEqual(site.program.after, [{ projectId: 'lager', note: 'Material zuerst' }]);
  checkSite(site);
  assert.throws(() => addProjectAfter(site, 'burg', 'lager'), /schon eingetragen/);
  assert.throws(() => addProjectAfter(site, 'burg', 'burg'), /nach sich selbst/);
  site = removeProjectAfter(site, 'lager');
  assert.equal(site.program.after, undefined, 'leere Liste fällt weg');
  const bad = (after) => () => checkSite({ ...emptySite(), program: { schemaVersion: 1, builders: [], milestones: [], dependencies: [], assignments: {}, after } });
  assert.throws(bad([]), /vorherige Projekte/);
  assert.throws(bad([{ projectId: 'a' }, { projectId: 'a' }]), /doppelt/);
  assert.throws(bad([{ projectId: 'a', x: 1 }]), /unbekannte Felder/);
  let many = emptySite();
  for (let i = 0; i < MAX_PROJECT_AFTER; i++) many = addProjectAfter(many, 'x', `p${i}`);
  assert.throws(() => addProjectAfter(many, 'x', 'zu-viel'), /höchstens/);
});

test('Verknüpfungen, Kreise und Stufen über mehrere Projekte', () => {
  const lager = proj('lager', 'Lager'), farm = proj('farm', 'Farm', addProjectAfter(emptySite(), 'farm', 'lager'));
  const burg = proj('burg', 'Burg', addProjectAfter(addProjectAfter(emptySite(), 'burg', 'farm'), 'burg', 'weg'));
  const all = [lager, farm, burg];
  assert.deepEqual(projectLinks(all), [{ before: 'lager', after: 'farm' }, { before: 'farm', after: 'burg' }], 'Verweis auf gelöschtes Projekt fällt weg');
  assert.equal(projectCycle(projectLinks(all)), null);
  assert.deepEqual(projectCycle(projectLinks(all), { before: 'burg', after: 'lager' }), ['lager', 'farm', 'burg', 'lager']);
  assert.match(projectAfterProblem(all, 'lager', 'burg'), /Kreis: „Lager“ → „Farm“ → „Burg“ → „Lager“/);
  assert.match(projectAfterProblem(all, 'lager', 'farm'), /Kreis: „Lager“ → „Farm“ → „Lager“/);
  assert.match(projectAfterProblem(all, 'farm', 'lager'), /„Farm“ kommt schon nach „Lager“/);
  assert.equal(projectAfterProblem(all, 'burg', 'lager'), null);
  assert.deepEqual([...projectLevels(all)].sort(), [['burg', 2], ['farm', 1], ['lager', 0]]);
  assert.deepEqual(projectSuccessors('lager', all), [{ id: 'farm', name: 'Farm' }]);
});

test('frühester Start aus dem Basisplan der vorherigen Projekte', () => {
  const lager = proj('lager', 'Lager', withBaseline(emptySite(), '2026-11-20'));
  const weg = proj('weg', 'Weg', withBaseline(emptySite(), null));
  const offen = proj('offen', 'Offen');
  let site = ['lager', 'weg', 'offen', 'weg-alt'].reduce((s, id) => addProjectAfter(s, 'burg', id), emptySite());
  site = setProgramSettings(site, { start: '2026-11-15' });
  const c = projectStartCheck(proj('burg', 'Burg', site), [lager, weg, offen]);
  assert.deepEqual(c.predecessors.map(p => `${p.name}:${p.source}:${p.end}`), ['Lager:baseline:2026-11-20', 'Weg:done:2026-11-01', 'Offen:unknown:null', 'gelöschtes Projekt:missing:null']);
  assert.equal(c.earliestStart, '2026-11-21');
  assert.equal(c.tooEarly, true);
  assert.equal(c.unknown, 1);
  const later = projectStartCheck(proj('burg', 'Burg', setProgramSettings(site, { start: '2026-11-21' })), [lager, weg, offen]);
  assert.equal(later.tooEarly, false);
  assert.equal(projectStartCheck(proj('x', 'X'), []).earliestStart, null);
});
