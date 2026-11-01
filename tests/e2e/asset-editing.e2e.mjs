// Browser check of the building catalogue (B9) against the built Pages artifact.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4235, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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


test('two UI tabs keep the editing base and retain a rejected metadata draft', async () => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const a = await context.newPage(), b = await context.newPage();
  const errors = [];
  a.on('pageerror', e => errors.push(e.message)); b.on('pageerror', e => errors.push(e.message));
  for (const p of [a, b]) p.setDefaultTimeout(10_000);
  await a.goto(`${BASE}#/bibliothek/generatoren/turm`);
  await a.getByLabel('Name des Bauteils').fill('Revisionstest');
  await a.getByRole('button', { name: 'Als neues Bauteil speichern', exact: true }).click();
  await a.waitForURL(/#\/bibliothek\/gebaeude\//);
  await b.goto(a.url());
  for (const p of [a, b]) await p.getByRole('button', { name: 'Angaben bearbeiten', exact: true }).click();
  const tags = p => p.getByLabel('Weitere Tags (Komma-getrennt)');
  await tags(a).fill('entwurf-tab-a'); await tags(b).fill('gewinner-tab-b');
  await b.getByRole('button', { name: 'Angaben speichern', exact: true }).click();
  await b.getByText('Angaben zu „Revisionstest“ gespeichert.').waitFor();
  // Broadcast updates the current asset, but must not bless the older form base.
  await a.getByText('Dieses Bauteil wurde inzwischen geändert.', { exact: true }).waitFor();
  await a.getByRole('button', { name: 'Angaben speichern', exact: true }).click();
  await a.getByText(/Angaben nicht gespeichert:.*zwischenzeitlich anderswo gespeichert/).waitFor();
  assert.equal(await tags(a).inputValue(), 'entwurf-tab-a');
  await b.reload(); await b.getByText('gewinner-tab-b', { exact: true }).waitFor();
  await a.getByRole('button', { name: 'Seite neu laden', exact: true }).click();
  await a.getByText('gewinner-tab-b', { exact: true }).waitFor();
  assert.equal(await tags(a).count(), 0);
  assert.deepEqual(errors, []);
  await context.close();
});
