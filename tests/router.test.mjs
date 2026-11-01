import { test } from 'node:test';
import assert from 'node:assert/strict';
import { href, parseRoute } from '../apps/web/src/app/router.ts';

test('supported routes preserve semantic values through generated links', () => {
  const routes = [
    { view: 'projects' }, { view: 'viewer' }, { view: 'system' },
    { view: 'project', projectId: 'Burg Süd / Tor? #1', tab: 'editor' },
    { view: 'project', projectId: '世界', tab: 'bauen' },
    { view: 'project', projectId: '100%', tab: 'Material / prüfen?' },
    { view: 'library' },
    { view: 'library', projectId: 'Burg / Süd', search: 'q=Stein%20%26%20Holz&kategorie=haus' },
    { view: 'library', page: 'building', id: 'mod:Tor/Süd', sub: 'ebenen' },
    { view: 'library', projectId: 'Hafen', page: 'building', id: 'Turm', sub: 'versionen' },
    { view: 'library', page: 'ensembles' },
    { view: 'library', page: 'ensembles', id: 'Dorf' },
    { view: 'library', page: 'compare', id: 'Turm,Haus' },
    { view: 'library', page: 'generators' },
    { view: 'library', page: 'generators', id: 'haus~fachwerk' },
    { view: 'library', page: 'themes' },
    { view: 'library', page: 'themes', projectId: 'Hafen / Süd' },
  ];
  for (const route of routes) assert.deepEqual(parseRoute(href(route)), route, href(route));
});

test('malformed encodings return a recoverable not-found route on first load', () => {
  for (const path of ['/projekt/%', '/bibliothek/gebaeude/%E0%A4%A', '/%FF', '/projekt/%2']) {
    assert.deepEqual(parseRoute(`#${path}`), { view: 'not-found', path });
  }
  assert.deepEqual(parseRoute('#/bibliothek?q=100%'), { view: 'library', search: 'q=100%' });
});

test('encoded IDs cannot introduce route structure or be decoded twice', () => {
  assert.deepEqual(parseRoute('#/projekt/a%2Fb/bauen'), { view: 'project', projectId: 'a/b', tab: 'bauen' });
  assert.deepEqual(parseRoute('#/projekt/%252F'), { view: 'project', projectId: '%2F', tab: 'editor' });
  assert.equal(parseRoute('#/projekt/a/bauen/extra').view, 'not-found');
});

test('unknown pages including prototype names are never accepted as library pages', () => {
  for (const page of ['unbekannt', 'constructor', 'toString', '__proto__']) {
    assert.equal(parseRoute(`#/bibliothek/${page}`).view, 'not-found');
  }
  assert.deepEqual(parseRoute('#/bibliothek///'), { view: 'library' });
  assert.equal(href({ view: 'not-found', path: '/wrong' }), '#/');
});
