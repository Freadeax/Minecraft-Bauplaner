// PERF-03 acceptance in the browser: the library overview keeps its search, filters and layout when the user
// opens a building, switches to another (lazily loaded) page and comes back with the browser history.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { waitForStart } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 47752, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
let server, browser;

before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.kill(); });

test('Bibliothek: Suche, Filter und Liste bleiben über Detailseite, Seitenwechsel und Neuladen erhalten', async () => {
  const p = await browser.newPage({ viewport: { width: 1300, height: 900 } });
  p.setDefaultTimeout(30_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
  await p.goto(BASE);
  await waitForStart(p);
  await p.goto(`${BASE}#/bibliothek`);
  const search = p.getByRole('searchbox', { name: 'Bauteile suchen' });
  await search.fill('Turm');
  await p.getByRole('button', { name: 'Liste', exact: true }).click();
  await p.waitForFunction(() => /q=Turm|Turm/.test(decodeURIComponent(location.hash)) && /liste/.test(location.hash));
  const results = p.locator('.catalog-results.liste > li');
  await results.first().waitFor();
  const count = await results.count();
  const names = await results.evaluateAll(li => li.slice(0, 5).map(e => e.textContent));
  const overview = p.url();

  const check = async step => {
    await results.first().waitFor();
    assert.equal(await search.inputValue(), 'Turm', `${step}: Suchtext`);
    assert.equal(await p.getByRole('button', { name: 'Liste', exact: true }).getAttribute('aria-pressed'), 'true', `${step}: Listenansicht`);
    assert.equal(await results.count(), count, `${step}: gleiche Trefferzahl`);
    assert.deepEqual(await results.evaluateAll(li => li.slice(0, 5).map(e => e.textContent)), names, `${step}: gleiche Treffer`);
  };

  // Detail page and back.
  await results.first().locator('a.bcard-open').click();
  await p.waitForURL(/#\/bibliothek\/gebaeude\//);
  await p.goBack();
  await check('Zurück von der Detailseite');

  // Another lazily loaded page (Weltkarte) and back.
  await p.getByRole('link', { name: /Weltkarte/ }).first().click();
  await p.waitForURL(/#\/karte/);
  await p.goBack();
  await check('Zurück von der Weltkarte');

  // Reload keeps the state from the address; the shared link opens the same overview.
  await p.reload();
  await check('Neuladen');
  const other = await browser.newPage({ viewport: { width: 1300, height: 900 } });
  await other.goto(overview);
  await other.getByRole('searchbox', { name: 'Bauteile suchen' }).waitFor({ timeout: 90_000 });
  assert.equal(await other.getByRole('searchbox', { name: 'Bauteile suchen' }).inputValue(), 'Turm', 'geteilter Link');
  await other.close();
  assert.deepEqual(errors, []);
  await p.close();
});
