// PERF-07: die Projektzentrale öffnet, bevor der mitgelieferte Katalog geladen ist. Die Katalogdatei wird im
// Test künstlich verzögert: eigene Projekte und „Leeres Projekt anlegen“ gehen sofort, Beispiel, Vorlagen und
// Sicherung warten, Seiten mit Bibliotheksbedarf zeigen bis dahin den Startbildschirm.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4405, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
let server, browser;

before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.kill(); });

/** A page whose catalogue file arrives only after `release()`. */
async function slowCatalog() {
  const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  let release;
  const gate = new Promise(r => { release = r; });
  // The worker fetches the file; context routes cover workers too.
  await context.route(/\/assets\/catalog-[0-9a-f]{32}\.json$/, async route => { await gate; await route.continue(); });
  const p = await context.newPage();
  p.setDefaultTimeout(60_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  return { p, context, errors, release: () => release() };
}

test('Projektzentrale vor dem Katalog: sofort bedienbar, Beispiel und Vorlagen folgen', async () => {
  const { p, context, errors, release } = await slowCatalog();
  await p.goto(BASE);
  await p.getByRole('heading', { name: /^Deine Projekte/ }).waitFor();
  assert.equal(await p.evaluate(() => document.documentElement.dataset.library), 'laedt');
  await p.locator('[data-library-loading]').waitFor();
  const sample = p.getByRole('button', { name: 'Beispielprojekt „Burgmauer“' });
  assert.equal(await sample.isDisabled(), true, 'Beispiel wartet auf die Bibliothek');
  await p.getByText('Vorlagen werden geladen …').waitFor();
  // Deep link into the library while the catalogue loads: start screen, then the library.
  await p.goto(`${BASE}#/bibliothek`);
  await p.locator('.app-start[data-start=loading]').waitFor();
  await p.goto(BASE);
  await p.getByRole('heading', { name: /^Deine Projekte/ }).waitFor();
  release();
  await p.locator('html[data-library="bereit"]').waitFor({ state: 'attached' });
  await p.waitForFunction(() => !document.querySelector('[data-library-loading]'));
  assert.equal(await sample.isDisabled(), false);
  await p.locator('.ecard').first().waitFor();
  await p.locator('.hero-mosaic[data-ready]').waitFor({ state: 'attached' });
  await sample.click();
  await p.waitForURL(/#\/projekt\//);
  await p.locator('.canvas-host[data-mesh=ready]').first().waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});

test('Leeres Projekt während des Katalogladens: Projekt öffnet, sobald die Bibliothek bereit ist', async () => {
  const { p, context, errors, release } = await slowCatalog();
  await p.goto(BASE);
  await p.getByRole('heading', { name: /^Deine Projekte/ }).waitFor();
  await p.getByLabel('Name').fill('Hafen');
  await p.getByRole('button', { name: '＋ Leeres Projekt anlegen' }).click();
  await p.waitForURL(/#\/projekt\//);
  await p.locator('.app-start[data-start=loading]').waitFor();
  release();
  await p.getByRole('heading', { name: 'Hafen' }).first().waitFor();
  await p.goto(BASE);
  await p.locator('.project-card', { hasText: 'Hafen' }).waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});
