// Browser check of the world import (WORLD-IMPORT-01): region files → overview → box → library asset, and the terrain tab.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { python } from '../../scripts/python.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4219, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
let server, browser, dir;

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'bauplaner-world-e2e-'));
  const r = spawnSync(python, ['-I', '-X', 'utf8', fileURLToPath(new URL('../../scripts/make_region_fixture.py', import.meta.url)), dir], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.kill(); });

const regionFiles = () => ['r.0.0.mca', 'r.-1.-1.mca', 'r.5.5.mca'].map(n => join(dir, n));

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Weltimport: Regionsdateien, Übersicht, Bereich, Bibliothek (${viewport.width}px)`, async () => {
    const context = await browser.newContext({ viewport });
    const p = await context.newPage();
    p.setDefaultTimeout(15_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await p.goto(`${BASE}#/welt`);
    await p.getByRole('heading', { name: 'Ausschnitt aus deiner Welt übernehmen' }).waitFor();
    await p.getByLabel('Regionsdateien', { exact: true }).setInputFiles(regionFiles());
    await p.getByText(/3 Regionsdateien/).waitFor();
    await p.locator('.world-map-canvas').waitFor();
    // Drag across the stone floor of chunk 0/0 (map window starts at region −1/−1: x −512 … 511).
    const stage = p.locator('.world-map-stage');
    await stage.scrollIntoViewIfNeeded();
    const b = await stage.boundingBox();
    const px = x => b.x + (x + 512 + 0.5) / 1024 * b.width, pz = z => b.y + (z + 512 + 0.5) / 1024 * b.height;
    await p.mouse.move(px(0), pz(0)); await p.mouse.down(); await p.mouse.move(px(15), pz(15), { steps: 4 }); await p.mouse.up();
    assert.equal(await p.getByLabel('Ecke 1 X').inputValue(), '0');
    assert.equal(await p.getByLabel('Ecke 2 Z').inputValue(), '15');
    // Exact box: y 64 … 66.
    await p.getByLabel('Ecke 1 Y').fill('64'); await p.getByLabel('Ecke 2 Y').fill('66');
    await p.getByText('16 × 3 × 16 Blöcke').waitFor();
    await p.getByRole('button', { name: 'Ausschnitt lesen' }).click();
    await p.getByRole('heading', { name: 'Gelesen' }).waitFor();
    if (process.env.SHOT_DIR) await p.screenshot({ path: `${process.env.SHOT_DIR}/world-${viewport.width}.png`, fullPage: true });
    const facts = await p.locator('.world-facts').innerText();
    assert.match(facts, /Blöcke\s+274/, facts); // 256 stone + 16 wool + stairs + chest
    assert.match(facts, /BlockEntities\s+1/);
    assert.match(facts, /X 0 · Y 64 · Z 0/);
    // Leave out natural terrain: only the 18 placed blocks remain, trimmed.
    await p.getByLabel(/Natürliches Gelände weglassen/).check();
    await p.getByRole('button', { name: 'Ausschnitt lesen' }).click();
    await p.locator('.world-facts').getByText('16 × 2 × 8').waitFor();
    assert.match(await p.locator('.world-facts').innerText(), /Blöcke\s+18/);
    await p.getByLabel('Name').fill('Wollreihe aus der Welt');
    await p.getByRole('button', { name: 'In die Bibliothek' }).click();
    await p.waitForURL(/#\/bibliothek\/gebaeude\//);
    await p.getByRole('heading', { name: 'Wollreihe aus der Welt' }).first().waitFor();
    if (viewport.width < 500) assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'kein waagerechtes Scrollen');
    assert.deepEqual(errors, []);
    await context.close();
  });
}

test('Gelände: unplatziertes Projekt verweist auf die Karte, platziertes wird geprüft', async () => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await context.newPage();
  p.setDefaultTimeout(20_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(`${BASE}#/`);
  await p.getByRole('button', { name: 'Beispielprojekt „Burgmauer“' }).click();
  await p.waitForURL(/#\/projekt\//);
  const id = decodeURIComponent(p.url().split('#/projekt/')[1].split('/')[0]);
  await p.goto(`${BASE}#/projekt/${encodeURIComponent(id)}/gelaende`);
  await p.getByText('Noch keine Weltlage.').waitFor();
  // Place it via the world map (default: X 0 · Y 64 · Z 0).
  await p.goto(`${BASE}#/karte`);
  await p.locator('.map-page[data-map-state=ready]').waitFor();
  await p.locator('.map-unplaced li').first().getByRole('button', { name: 'Platzieren' }).click();
  await p.getByRole('status').filter({ hasText: 'Auf die Weltkarte gesetzt' }).waitFor();
  await p.goto(`${BASE}#/projekt/${encodeURIComponent(id)}/gelaende`);
  await p.getByText('GELÄNDE AN DER WELTLAGE').waitFor();
  await p.getByLabel('Regionsdateien', { exact: true }).setInputFiles(regionFiles());
  await p.getByRole('button', { name: 'Gelände prüfen' }).click();
  const verdict = p.locator('.terrain-verdict');
  await verdict.waitFor();
  // The wall stands at y 64 on the stone floor of the fixture (y 64): the floor is in the way where it overlaps.
  const text = await verdict.innerText();
  assert.match(text, /Teilweise geprüft|Vorarbeit|frei und tragfähig/);
  const side = await p.locator('.terrain-side').innerText();
  assert.match(side, /Gelände im Weg\s+\d+/);
  assert.match(side, /Chunks: /);
  assert.deepEqual(errors, []);
  await context.close();
});
