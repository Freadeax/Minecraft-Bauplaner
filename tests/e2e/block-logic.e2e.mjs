// Browser check of the real block logic (BLOCK-01): Spielprüfung in der Bauanleitung, „Wie im Spiel verbinden“ in der Werkstatt.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4237, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

function watch(p) {
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  return errors;
}
const noHorizontalScroll = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Bauanleitung: Spielprüfung mit Blocklogik 26.3 (${viewport.width} px)`, async () => {
    const p = await browser.newPage({ viewport, hasTouch: viewport.width < 600 });
    p.setDefaultTimeout(15_000);
    const errors = watch(p);
    await p.goto(BASE);
    await openSampleProject(p);
    await p.waitForURL(/#\/projekt\//);
    await p.getByRole('link', { name: 'Bauen' }).click();
    await p.waitForURL(/\/bauen$/);
    const panel = p.getByTestId('placement-panel');
    await panel.locator('summary').click();
    await panel.locator('.placement-body').waitFor();
    const text = await panel.innerText();
    assert.match(text, /Geprüft mit den Regeln des echten Spiels/);
    assert.match(text, /\d+ Blöcke/);
    // The sample castle wall: every finding names a block and a coordinate; „Schritt zeigen“ jumps to its step.
    const issues = panel.locator('.placement-issues li');
    if (await issues.count()) {
      assert.match(await issues.first().innerText(), /X -?\d+ · Y -?\d+ · Z -?\d+/);
      const jump = issues.first().getByRole('button', { name: 'Schritt zeigen' });
      if (await jump.count()) { await jump.click(); await p.locator('.build-step h2').waitFor(); }
    }
    assert.ok(await noHorizontalScroll(p), 'kein waagerechtes Scrollen');
    assert.deepEqual(errors, []);
    await p.close();
  });
}

test('Werkstatt: Zaunreihe wie im Spiel verbinden, Spielprüfung, rückgängig', async () => {
  const p = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  p.setDefaultTimeout(15_000);
  const errors = watch(p);
  await p.goto(`${BASE}#/werkstatt/neu`);
  await p.getByRole('heading', { name: 'Neues Bauteil bauen' }).waitFor();
  await p.getByLabel('Blöcke suchen').fill('oak_fence');
  await p.getByRole('list', { name: 'Blöcke' }).locator('button[title*="minecraft:oak_fence"]').first().click();
  // Line of fences across the layer grid.
  await p.getByRole('radio', { name: /Linie/ }).click();
  const canvas = p.locator('.layer-grid canvas');
  await canvas.waitFor();
  const box = await canvas.boundingBox();
  const size = Number(await canvas.getAttribute('data-cell-size'));
  const y = box.y + box.height / 2;
  await p.mouse.move(box.x + box.width / 2 - 2 * size, y); await p.mouse.down();
  await p.mouse.move(box.x + box.width / 2 + 2 * size, y, { steps: 6 }); await p.mouse.up();
  await p.waitForFunction(() => /^[1-9]\d* Zellen/.test(document.querySelector('.editor-stats')?.textContent ?? ''));
  const cells = Number((await p.locator('.editor-stats').innerText()).match(/^(\d+) Zellen/)[1]);
  assert.ok(cells >= 3, `${cells} Zäune`);

  await p.getByTestId('placement-check').click();
  await p.locator('.editor-message', { hasText: /Spielprüfung: \d+ Verbindungen anders als im Spiel/ }).waitFor();
  await p.getByTestId('settle').click();
  await p.locator('.editor-message', { hasText: `Wie im Spiel verbunden (${cells})` }).waitFor();
  await p.getByTestId('placement-check').click();
  await p.locator('.editor-message', { hasText: /Spielprüfung bestanden/ }).waitFor();
  await p.getByTestId('settle').click();
  await p.locator('.editor-message', { hasText: 'Alle Verbindungen entsprechen schon dem Spiel.' }).waitFor();
  await p.keyboard.press('Control+z');
  await p.getByTestId('placement-check').click();
  await p.locator('.editor-message', { hasText: /Verbindungen anders als im Spiel/ }).waitFor();
  assert.deepEqual(errors, []);
  await p.close();
});
