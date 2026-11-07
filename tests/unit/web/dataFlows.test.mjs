// PRIV-01: Datenwege, Freigabe-Hinweise und freigegebene Webkarten-Domains.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DATA_FLOWS, dataFlow, hostOf } from '../../../apps/web/src/app/dataFlows.ts';
import { href, parseRoute } from '../../../apps/web/src/app/router.ts';

test('jeder Datenweg sagt was, wohin, wer, wie lange und wie man ihn zurücknimmt', () => {
  const ids = new Set();
  for (const f of DATA_FLOWS) {
    assert.ok(!ids.has(f.id), `doppelt: ${f.id}`); ids.add(f.id);
    for (const k of ['title', 'what', 'where', 'who', 'keep', 'stop']) assert.ok(f[k] && f[k].length > 3, `${f.id}.${k}`);
  }
  for (const id of ['team-room', 'world-share', 'position', 'scans', 'webmap']) assert.equal(dataFlow(id).online, true, id);
  assert.equal(dataFlow('browser').online, false);
  // Fakten aus dem Team-Raum (services/team-room/src/vault.js, core.js) stehen so auch im Hinweis.
  const vault = readFileSync('services/team-room/src/vault.js', 'utf8'), core = readFileSync('services/team-room/src/core.js', 'utf8');
  assert.match(vault, /idleDays: 365, deletedKeepDays: 90/);
  assert.match(dataFlow('team-room').keep, /365 Tage.*90 Tage/);
  assert.match(core, /scansKept: 12/);
  assert.match(dataFlow('scans').keep, /12 Aufnahmen/);
});

test('zwei Adressen: jede kennt die andere, fremde Adressen bekommen keinen Umzug', () => {
  assert.equal(hostOf('https://freadeax.github.io')?.other.id, 'cloudflare');
  assert.equal(hostOf('https://bauplaner.pages.dev')?.other.id, 'github');
  assert.equal(hostOf('http://127.0.0.1:4173'), null);
});

test('Datenschutz-Seite hat eine eigene Route und kein „Alles bleibt lokal“ mehr im Planer', () => {
  assert.deepEqual(parseRoute('#/datenschutz'), { view: 'privacy' });
  assert.equal(href({ view: 'privacy' }), '#/datenschutz');
  for (const f of ['apps/web/src/app/Shell.tsx', 'apps/web/src/views/ProjectsView.tsx', 'apps/web/src/views/SystemView.tsx'])
    assert.doesNotMatch(readFileSync(f, 'utf8'), /Alles (bleibt|läuft) lokal/, f);
});

test('Webkarten-Domains: erst nach Freigabe, eigene Freigabe bleibt, Entfernen wirkt', async () => {
  const store = new Map();
  globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
  const { mapHostOf, isTrustedMapHost, trustMapHost, forgetMapHost, trustedMapHosts } = await import('../../../apps/web/src/views/map/mapHosts.ts');
  assert.equal(mapHostOf('https://Karte.Example.net:8100/#{world}:{x}:{y}:{z}'), 'karte.example.net:8100');
  assert.equal(mapHostOf('javascript:alert(1)'), '');
  assert.equal(isTrustedMapHost('karte.example.net:8100'), false);
  trustMapHost('https://karte.example.net:8100/#world:1:2:3');
  assert.equal(isTrustedMapHost('karte.example.net:8100'), true);
  assert.deepEqual(trustedMapHosts(), ['karte.example.net:8100']);
  assert.equal(isTrustedMapHost('evil.example'), false);
  forgetMapHost('karte.example.net:8100');
  assert.equal(isTrustedMapHost('karte.example.net:8100'), false);
});
