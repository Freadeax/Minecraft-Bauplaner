// UI regression for storing and restoring unchanged game recordings; run after the production build.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { writeNbt } from '../../dist/formats/src/index.js';

const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = 4194, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

// Independent one-cell foreign recording: no bridge metadata, so alignment must be chosen explicitly.
const bytes = gzipSync(writeNbt({ name: '', tag: { type: 'compound', value: { Schematic: { type: 'compound', value: {
  Version: { type: 'int', value: 3 }, DataVersion: { type: 'int', value: 4189 },
  Width: { type: 'short', value: 1 }, Height: { type: 'short', value: 1 }, Length: { type: 'short', value: 1 },
  Blocks: { type: 'compound', value: {
    Palette: { type: 'compound', value: { 'minecraft:stone': { type: 'int', value: 0 } } },
    Data: { type: 'byteArray', value: [0] },
  } },
} } } } }));

test('saved recording survives reload with manual alignment and byte-exact original download', async () => {
  const p = await browser.newPage({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
  p.setDefaultTimeout(15_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE);
  await p.getByRole('button', { name: 'Beispielprojekt „Burgmauer“' }).click();
  await p.waitForURL(/#\/projekt\//);
  await p.locator('.save-state.saved').waitFor();
  await p.getByRole('link', { name: 'Bauen', exact: true }).click();
  await p.locator('.game-check input[type=file]').setInputFiles({ name: 'kleine-aufnahme.schem', mimeType: 'application/octet-stream', buffer: bytes });
  await p.locator('.game-align').waitFor();
  for (const [axis, value] of [['X', '17'], ['Y', '18'], ['Z', '19']]) await p.locator('.game-align').getByLabel(axis, { exact: true }).fill(value);
  await p.getByRole('button', { name: 'Aufnahme im Projekt speichern', exact: true }).click();
  await p.getByText('Aufnahme mit Original und Verlauf lokal gespeichert.', { exact: true }).waitFor();
  assert.equal(await p.getByLabel('Gespeicherte Spielaufnahme', { exact: true }).locator('option').count(), 2);
  await p.reload();
  await p.getByText('Gespeicherte Aufnahme geladen.', { exact: false }).waitFor();
  for (const [axis, value] of [['X', '17'], ['Y', '18'], ['Z', '19']]) assert.equal(await p.locator('.game-align').getByLabel(axis, { exact: true }).inputValue(), value);
  const [download] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Aufnahme-Original herunterladen', exact: true }).click()]);
  assert.deepEqual(await readFile(await download.path()), bytes);
  assert.equal(download.suggestedFilename(), 'kleine-aufnahme.schem');
  await p.getByRole('button', { name: 'Aufnahme ausblenden', exact: true }).click();
  await p.getByText('Noch keine Aufnahme.', { exact: false }).waitFor();
  await p.getByLabel('Gespeicherte Spielaufnahme', { exact: true }).selectOption({ label: await p.getByLabel('Gespeicherte Spielaufnahme', { exact: true }).locator('option').nth(1).innerText() });
  await p.locator('.game-align').waitFor();
  assert.deepEqual(errors, []);
  await p.close();
});
