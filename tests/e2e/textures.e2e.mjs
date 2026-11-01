// Browser checks for the Blockdarstellung: texture dialog with a synthetic
// texture source (own PNGs in the client-jar layout, no Mojang files), stored in
// IndexedDB, textured viewer, removal. Mojang's download is not exercised here.
// Run after `npm run build`: `npm run test:e2e`. Local Playwright/Chromium.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { miniPackZip } from '../helpers/minipack.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4198, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

test('Blockdarstellung: eigene Formen, Texturquelle laden, speichern und entfernen', async () => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await context.newPage();
  p.setDefaultTimeout(15_000);
  const errors = [], requests = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('request', r => requests.push(r.url()));
  await p.goto(BASE);
  const chip = p.locator('.texture-chip');
  await assert.doesNotReject(chip.getByText('Eigene Formen').waitFor());
  assert.equal(await p.locator('.texture-dialog input[type=file]').count(), 0, 'closed dialog holds no file input');

  await chip.click();
  const dialog = p.locator('.texture-dialog');
  await dialog.getByText('Eigene Formen:').waitFor();
  await dialog.locator('input[type=file]').setInputFiles({ name: 'mini-pack.zip', mimeType: 'application/zip', buffer: Buffer.from(miniPackZip()) });
  await dialog.getByText('Originaltexturen aktiv:').waitFor();
  assert.match(await dialog.locator('.texture-state').innerText(), /mini-pack\.zip · 1[0-9] Dateien/);
  await p.keyboard.press('Escape');
  await chip.getByText('Originaltexturen').waitFor();

  // Stored in this browser: a reload restores the source without asking again.
  await p.reload();
  await p.locator('.texture-chip').getByText('Originaltexturen').waitFor();
  const stored = await p.evaluate(() => new Promise(resolve => {
    const r = indexedDB.open('bauplaner-texturen');
    r.onsuccess = () => { const g = r.result.transaction('packs').objectStore('packs').get('aktiv'); g.onsuccess = () => resolve(g.result?.meta?.sources?.[0]?.label ?? null); };
  }));
  assert.equal(stored, 'mini-pack.zip');

  // A resource pack without block states cannot replace the source.
  await p.locator('.texture-chip').click();
  const { makeZip, png } = await import('../helpers/minipack.mjs');
  await dialog.locator('input[type=file]').setInputFiles({ name: 'nur-texturen.zip', mimeType: 'application/zip',
    buffer: Buffer.from(makeZip([['assets/minecraft/textures/block/stone.png', png([1, 2, 3])]])) });
  await dialog.getByText(/Fehler:/).waitFor();
  assert.match(await dialog.locator('.texture-state').innerText(), /Weiter aktiv: mini-pack\.zip/);

  await dialog.getByRole('button', { name: 'Texturen aus diesem Browser entfernen' }).click();
  await dialog.getByText('Eigene Formen:').waitFor();
  await p.keyboard.press('Escape');
  await p.reload();
  await p.locator('.texture-chip').getByText('Eigene Formen').waitFor();
  assert.ok(!requests.some(u => u.includes('mojang.com')), 'nothing is fetched from Mojang without a click');
  assert.deepEqual(errors, []);
  await context.close();
});
