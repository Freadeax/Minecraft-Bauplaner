// Browser end-to-end check of the built Pages artifact (dist-web) under the
// repository sub-path. Run after `npm run build`: `npm run test:e2e`.
// Uses the locally installed Playwright/Chromium; no GitHub Actions involved.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4179, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

async function page() {
  const p = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  p.setDefaultTimeout(10_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  return { p, errors };
}

test('Projektzentrale → Beispielprojekt → Editor: konfliktfrei, Konflikt erzeugen, Undo', async () => {
  const { p, errors } = await page();
  await p.goto(BASE);
  await p.getByRole('button', { name: 'Beispielprojekt „Burgmauer“' }).click();
  await p.waitForURL(/#\/projekt\//);
  await p.getByText('✓ Geometrisch konfliktfrei').waitFor();
  assert.equal(await p.locator('.instance-list li').count(), 5);
  await p.getByRole('button', { name: /Mauer 1/ }).click();
  await p.getByRole('button', { name: 'X minus 1' }).click();
  await p.getByText('⚠ Offene Punkte vor einem baubaren Export').waitFor();
  assert.match(await p.locator('.report').innerText(), /ungeklärte Voxelkonflikte/);
  await p.getByRole('button', { name: /Rückgängig/ }).click();
  await p.getByText('✓ Geometrisch konfliktfrei').waitFor();
  await p.getByRole('button', { name: /Wiederholen/ }).click();
  await p.getByText('⚠ Offene Punkte vor einem baubaren Export').waitFor();
  await p.getByLabel('Vorrang bei Überschneidung (expliziter Override)').check();
  await p.getByText('✓ Geometrisch konfliktfrei').waitFor();
  assert.match(await p.locator('.report').innerText(), /Per Vorrang entschieden\s*\n?\s*[1-9]/);
  await p.getByRole('button', { name: '✕ Entfernen' }).click();
  assert.equal(await p.locator('.instance-list li').count(), 4);
  await p.locator('.asset-picker button', { hasText: 'Eckturm' }).click();
  assert.equal(await p.locator('.instance-list li').count(), 5);
  await p.getByText('gespeichert', { exact: false }).first().waitFor();
  assert.deepEqual(errors, []);
  await p.close();
});

test('Bibliothek zeigt Beispielbauteile mit Herkunft, Suche und Tags', async () => {
  const { p, errors } = await page();
  await p.goto(`${BASE}#/bibliothek`);
  await p.getByRole('button', { name: /Eckturm/ }).click();
  await p.getByText('Synthetisches Beispiel').waitFor();
  assert.match(await p.locator('.inspector').innerText(), /west, east, north, south/);
  await p.getByLabel('Bauteile suchen').fill('wehrmauer zinnen');
  assert.equal(await p.locator('.library-list .instance-list li').count(), 1);
  await p.getByLabel('Bauteile suchen').fill('');
  await p.locator('.filter-panel > summary').click(); await p.getByText(/^Tags \(/).click();
  await p.getByRole('button', { name: 'tor', exact: true }).click();
  assert.equal(await p.locator('.library-list .instance-list li').count(), 1);
  assert.deepEqual(errors, []);
  await p.close();
});

test('Schem-Testdatei im Betrachter und als Bauteil importierbar', async () => {
  const { p, errors } = await page();
  await p.goto(`${BASE}#/betrachter`);
  await p.getByRole('button', { name: /Schem-Testdatei öffnen/ }).click();
  await p.getByText('Schem-Importbericht').waitFor();
  const bytes = await p.evaluate(async url => Array.from(new Uint8Array(await (await fetch(url)).arrayBuffer())), `${BASE}examples/contract-v3.schem`);
  await p.goto(`${BASE}#/bibliothek`);
  await p.locator('input[type=file]').setInputFiles({ name: 'vertrag.schem', mimeType: 'application/octet-stream', buffer: Buffer.from(bytes) });
  await p.getByText('DATEI GEPRÜFT').waitFor();
  await p.getByLabel('Name').fill('Vertragsbauteil');
  await p.getByRole('button', { name: 'Als neues Bauteil speichern' }).click();
  await p.getByText('„Vertragsbauteil“ als Bauteil gespeichert.').waitFor();
  assert.match(await p.locator('.inspector').innerText(), /schem-v3/);
  assert.deepEqual(errors, []);
  await p.close();
});

test('Unbekannte Route und Reload unter Unterpfad', async () => {
  const { p, errors } = await page();
  await p.goto(`${BASE}#/gibtsnicht`);
  await p.getByText('gibt es nicht').waitFor();
  await p.goto(`${BASE}#/projekt/unbekannt`);
  await p.getByText('Projekt nicht gefunden').waitFor();
  assert.deepEqual(errors, []);
  await p.close();
});
