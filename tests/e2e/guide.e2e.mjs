// Browser check of the build guide tab (B4) against the built Pages artifact.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4181, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

async function page(viewport = { width: 1400, height: 1000 }) {
  const p = await browser.newPage({ viewport, hasTouch: viewport.width < 600 });
  p.setDefaultTimeout(10_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(BASE);
  await p.getByRole('button', { name: 'Beispielprojekt „Burgmauer“' }).click();
  await p.waitForURL(/#\/projekt\//);
  return { p, errors };
}

test('Bauen: abhaken, Geometrie ändern ⇒ prüfbedürftig, erneut bestätigen, Schicht abhaken', async () => {
  const { p, errors } = await page();
  await p.getByRole('link', { name: 'Bauen' }).click();
  await p.waitForURL(/\/bauen$/);
  const head = p.locator('.build-progress strong');
  const total = Number((await head.innerText()).match(/0 \/ (\d+) Schritte/)[1]);
  assert.ok(total > 20, `viele Schichtschritte erwartet, ${total}`);
  assert.match(await p.locator('.build-step h2').innerText(), /Grundblöcke · Turm West · Y 0/);
  assert.match(await p.locator('.build-check').innerText(), /Y 0, X 0…3, Z 0…3: genau 16 Blöcke/);
  assert.equal(await p.locator('.layer-plan rect.own').count(), 16);
  // Item column (B1 rules): 16 full blocks of the tower floor are 16 build items.
  const items = p.locator('.build-step .build-items').first();
  const counts = await items.locator('tbody td:last-child').allInnerTexts();
  assert.ok(counts.length >= 1);
  assert.equal(counts.reduce((a, c) => a + Number(c.replace(/\D/g, '')), 0), 16);
  const pack = p.locator('.build-pack summary');
  assert.match(await pack.innerText(), /Packliste Schicht Y 0 · \d+ offene Schritte, \d+ Items/);
  await pack.click();
  await p.locator('.build-pack table caption', { hasText: 'Noch zu setzen in Schicht Y 0' }).waitFor();
  await p.getByRole('button', { name: '✓ Abhaken' }).click();
  await head.filter({ hasText: `1 / ${total} Schritte` }).waitFor();
  assert.doesNotMatch(await p.locator('.build-step h2').innerText(), /Turm West · Y 0/, 'springt zum nächsten Schritt');

  // Change the ticked geometry in the editor.
  await p.getByRole('link', { name: 'Editor' }).click();
  await p.waitForURL(/#\/projekt\/[^/]+$/);
  await p.locator('.instance-list button', { hasText: 'Turm West' }).click();
  await p.getByRole('button', { name: 'Y plus 1' }).click();
  await p.getByRole('link', { name: 'Bauen' }).click();
  await p.getByText('1 abgehakte Schritte wurden seit dem Haken geändert.').waitFor();
  await p.getByRole('button', { name: 'Nur prüfbedürftige zeigen' }).click();
  assert.equal(await p.locator('.step-item').count(), 1);
  await p.locator('.step-item').first().click();
  assert.match(await p.locator('.build-step h2').innerText(), /Turm West · Y 1/, 'gleiche Schritt-ID, neue Lage');
  await p.getByRole('button', { name: '✓ Erneut bestätigen' }).click();
  await p.getByText('Keine Schritte in diesem Filter.').waitFor();
  assert.equal(await p.locator('.notice', { hasText: 'seit dem Haken geändert' }).count(), 0);

  await p.getByRole('button', { name: 'Alle', exact: true }).click();
  await p.getByRole('button', { name: 'Ganze Schicht Y 1 abhaken' }).click();
  const done = Number((await head.innerText()).match(/^(\d+) \//)[1]);
  assert.ok(done >= 5, `Schicht Y 1 aller Abschnitte abgehakt, ${done}`);
  await p.getByRole('button', { name: '3D-Ansicht zeigen' }).click();
  await p.locator('.build-3d canvas').first().waitFor();
  assert.deepEqual(errors, []);
  await p.close();
});

test('Bauen mobil: Schritt zuerst, große Abhaken-Schaltfläche, kein horizontales Scrollen', async () => {
  const { p, errors } = await page({ width: 390, height: 844 });
  await p.goto(`${p.url()}/bauen`);
  await p.locator('.build-step').waitFor();
  const tickBox = await p.getByRole('button', { name: '✓ Abhaken' }).boundingBox();
  assert.ok(tickBox.height >= 44 && tickBox.width >= 390 * 0.35, `Touch-Ziel ${tickBox.width}×${tickBox.height}`);
  const stepTop = (await p.locator('.build-step').boundingBox()).y, listTop = (await p.locator('.build-list').boundingBox()).y;
  assert.ok(stepTop < listTop, 'Schrittkarte steht vor der Liste');
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'kein horizontales Scrollen');
  await p.getByRole('button', { name: '✓ Abhaken' }).tap();
  await p.locator('.build-progress strong', { hasText: /^1 \// }).waitFor();
  assert.deepEqual(errors, []);
  await p.close();
});
