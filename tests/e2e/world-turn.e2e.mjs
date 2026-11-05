// Browser check of MAP-07: a project turns on the world map (Weltlage „Drehung“ and R on the selection), the
// footprint swaps width and length, the block count stays, and one undo brings the previous turn back.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4347, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

const ready = p => p.locator('.map-page[data-map-state=ready]').waitFor({ timeout: 20_000 });
const size = async detail => {
  const t = await detail.locator('.map-facts').getByText(/Blöcke, \d+ hoch/).innerText();
  const m = /(\d+) × (\d+) Blöcke, (\d+) hoch/.exec(t);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};

test('Weltkarte: Projekt drehen und spiegeln (Weltlage, R, Rückgängig)', async () => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await context.newPage();
  p.setDefaultTimeout(15_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });

  await p.goto(BASE);
  await openSampleProject(p);
  await p.waitForURL(/#\/projekt\//);
  await p.goto(`${BASE}#/karte`);
  await ready(p);
  await p.getByRole('button', { name: 'Platzieren' }).first().click();
  await p.getByRole('status').filter({ hasText: 'Auf die Weltkarte gesetzt' }).waitFor();
  await ready(p);
  const page = p.locator('.map-page');
  const cells = await page.getAttribute('data-map-cells');
  const detail = p.locator('.map-detail');
  const [w, l, h] = await size(detail);
  assert.notEqual(w, l, 'sample footprint is not square');

  // Weltlage: 90° im Uhrzeigersinn around the origin.
  await detail.getByLabel('Drehung').selectOption('1');
  await detail.getByRole('button', { name: 'Lage speichern' }).click();
  await ready(p);
  await detail.locator('.map-facts dd[data-turn="1"]').waitFor();
  assert.deepEqual(await size(detail), [l, w, h]);
  assert.equal(await page.getAttribute('data-map-cells'), cells, 'same number of blocks');
  await p.locator('.map-entry-main small').first().getByText(/90° im Uhrzeigersinn/).waitFor();

  // R on the selected project turns it once more, in place.
  const nw = await detail.locator('.map-facts').getByText(/^X -?\d+ · Y -?\d+ · Z -?\d+$/).nth(1).innerText();
  await p.locator('.map-entry-main').first().click();
  await p.locator('.overview-canvas').focus();
  await p.keyboard.press('r');
  await p.getByRole('status').filter({ hasText: /Gedreht/ }).waitFor();
  await ready(p);
  await detail.locator('.map-facts dd[data-turn="2"]').waitFor();
  assert.deepEqual(await size(detail), [w, l, h]);
  assert.equal(await detail.locator('.map-facts').getByText(/^X -?\d+ · Y -?\d+ · Z -?\d+$/).nth(1).innerText(), nw, 'north-west corner stays');

  // One undo brings 90° back.
  await p.getByRole('button', { name: 'Rückgängig' }).click();
  await p.getByRole('status').filter({ hasText: 'Rückgängig gemacht' }).waitFor();
  await ready(p);
  await detail.locator('.map-facts dd[data-turn="1"]').waitFor();
  // Back to ungedreht via the form: the Drehung fact disappears.
  await detail.getByLabel('Drehung').selectOption('0');
  await detail.getByRole('button', { name: 'Lage speichern' }).click();
  await ready(p);
  await detail.locator('.map-facts dd[data-turn]').waitFor({ state: 'detached' });
  assert.deepEqual(await size(detail), [w, l, h]);
  assert.deepEqual(errors, []);
  await context.close();
});
