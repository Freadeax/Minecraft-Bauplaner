// GUIDE-01: Anleitung „Wie geh ich es an?“ – kurze Sätze, gültige Ziele, Links ins Projekt (ohne Browser).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GUIDE_PATHS, GUIDE_ORDER, GUIDE_TERMS, MAX_TEXT, guidePath, parseGuideSearch, guideSearch, stepLink, parseDone, pathProgress, doneKey } from '../../../apps/web/src/views/guide/guideSteps.ts';
import { parseRoute, href } from '../../../apps/web/src/app/router.ts';
import { projectTabNames } from '../../../apps/web/src/views/project/tabNames.ts';
import { mainNav } from '../../../apps/web/src/app/nav.ts';

const icons = readFileSync('apps/web/src/app/icons.tsx', 'utf8');

test('Anleitung: jeder Schritt ist ein kurzer Satz mit Bild und gültigem Ziel', () => {
  const ids = new Set();
  const tabs = new Set(projectTabNames.map(t => t.id));
  for (const path of GUIDE_PATHS) {
    assert.ok(!ids.has(path.id), `doppelter Weg ${path.id}`); ids.add(path.id);
    assert.ok(path.steps.length >= 3 && path.steps.length <= 7, `${path.id}: 3 bis 7 Schritte`);
    const stepIds = new Set();
    for (const s of path.steps) {
      assert.ok(!stepIds.has(s.id), `${path.id}/${s.id} doppelt`); stepIds.add(s.id);
      assert.ok(s.text.length <= MAX_TEXT, `${path.id}/${s.id}: Satz zu lang (${s.text.length})`);
      assert.match(s.text, /^(?:[^.!?]|[.](?=\S))+[.!?]$/u, `${path.id}/${s.id}: genau ein Satz`);
      assert.ok(s.title.split(/\s+/).length <= 4, `${path.id}/${s.id}: Titel höchstens vier Wörter`);
      assert.ok(new RegExp(`\\b${s.icon}:`).test(icons), `${path.id}/${s.id}: Symbol ${s.icon} fehlt`);
      assert.doesNotMatch(s.text, /herunterlad|hochlad|Datei (kopier|einfüg)/i, `${path.id}/${s.id}: kein Dateiweg als Hauptweg`);
      const t = s.target;
      if (t.kind === 'route') assert.equal(href(parseRoute(t.href)).split('?')[0], t.href.split('?')[0], `${t.href} ist keine Route`);
      if (t.kind === 'project') assert.ok(tabs.has(t.tab), `Reiter ${t.tab} gibt es nicht`);
      if (t.kind === 'path') assert.ok(guidePath(t.path) && t.path !== path.id, `Weg ${t.path} fehlt`);
    }
  }
  assert.deepEqual([...GUIDE_ORDER].sort(), [...ids].sort(), 'Reihenfolge nennt jeden Weg genau einmal');
  assert.ok(GUIDE_TERMS.length >= 6 && GUIDE_TERMS.every(t => t.text.length <= MAX_TEXT));
});

test('Anleitung: Links führen ins gewählte Projekt, ohne Projekt zur Projektzentrale', () => {
  const step = (path, id) => guidePath(path).steps.find(s => s.id === id);
  assert.deepEqual(stepLink(step('gelaende', 'pruefen'), 'Burg / Süd'), { href: '#/projekt/Burg%20%2F%20S%C3%BCd/gelaende', label: '„Gelände“ öffnen' });
  assert.equal(stepLink(step('erstes-projekt', 'anordnen'), 'p1').href, '#/projekt/p1');
  assert.equal(stepLink(step('erstes-projekt', 'anordnen'), null).href, '#/');
  assert.ok(stepLink(step('erstes-projekt', 'anordnen'), null).note);
  assert.equal(stepLink(step('erstes-projekt', 'gebaeude'), 'p1').href, '#/bibliothek/fuer/p1');
  assert.equal(stepLink(step('hologramm', 'senden'), 'p1').href, '#/karte?projekt=p1');
  assert.equal(stepLink(step('hologramm', 'setzen'), 'p1').href, null, 'Schritte im Spiel haben keinen Link');
  assert.equal(stepLink(step('hologramm', 'mod'), 'p1').href, '#/anleitung?weg=mod');
  for (const path of GUIDE_PATHS) for (const s of path.steps) {
    const link = stepLink(s, 'p1');
    if (link.href) assert.notEqual(parseRoute(link.href).view, 'not-found', `${path.id}/${s.id}: ${link.href}`);
  }
});

test('Anleitung: Adresse, Fortschritt und kaputte Speicherdaten', () => {
  assert.deepEqual(parseGuideSearch('weg=mod&schritt=3'), { path: 'mod', step: 3 });
  assert.deepEqual(parseGuideSearch('weg=mod&schritt=99'), { path: 'mod' });
  assert.deepEqual(parseGuideSearch('weg=gibtsnicht&schritt=1'), {});
  assert.deepEqual(parseGuideSearch(undefined), {});
  assert.deepEqual(parseRoute(`#/anleitung?${guideSearch('team', 2)}`), { view: 'guide', search: 'weg=team&schritt=2' });
  assert.equal(href({ view: 'guide' }), '#/anleitung');
  assert.deepEqual([...parseDone('["mod/profil", 3, null]')], ['mod/profil']);
  assert.equal(parseDone('{kaputt').size, 0);
  assert.equal(parseDone(null).size, 0);
  const mod = guidePath('mod');
  assert.deepEqual(pathProgress(mod, new Set([doneKey('mod', 'profil'), doneKey('team', 'team')])), { done: 1, total: mod.steps.length });
  assert.ok(mainNav.some(n => n.href === '#/anleitung' && n.views.includes('guide')), 'Anleitung in der Hauptnavigation');
});
