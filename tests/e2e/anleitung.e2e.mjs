// GUIDE-01: Anleitung „Wie geh ich es an?“ (#/anleitung) gegen das gebaute Pages-Artefakt.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject, waitForStart } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 47761, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

test('Anleitung: Wege wählen, Schritte mit Bild und Satz, Links ins Projekt, Haken bleiben', async () => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const p = await context.newPage();
  p.setDefaultTimeout(15_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(`${BASE}#/`);
  await waitForStart(p);
  // Einstieg aus der Projektzentrale; ohne Projekt führen Projektlinks zur Projektzentrale.
  await p.locator('[data-guide-link]').click();
  await p.getByRole('heading', { name: 'Wie geh ich es an?' }).waitFor();
  assert.equal(await p.title(), 'Wie geh ich es an? · LMNT Build Studio');
  assert.equal(await p.locator('.guide-path').count(), 6, 'sechs Wege');
  assert.equal(await p.locator('.guide-path[aria-pressed=true]').getAttribute('data-path'), 'erstes-projekt');
  const steps = p.locator('.guide-step');
  assert.equal(await steps.count(), 5);
  for (let i = 0; i < 5; i++) {
    assert.equal(await steps.nth(i).locator('svg.guide-art').count(), 1, `Schritt ${i + 1} hat eine Grafik`);
    const text = await steps.nth(i).locator('p').first().innerText();
    assert.ok(text.length > 10 && text.length <= 110, `kurzer Satz: ${text}`);
  }
  assert.equal(await steps.nth(2).getByRole('link').first().getAttribute('href'), '#/', 'ohne Projekt zur Projektzentrale');

  // Mit Projekt führen die Knöpfe in genau dieses Projekt.
  await p.goto(`${BASE}#/`);
  await openSampleProject(p);
  await p.waitForURL(/#\/projekt\//);
  const projectId = decodeURIComponent(p.url().split('#/projekt/')[1].split('/')[0]);
  await p.goto(`${BASE}#/anleitung?weg=gelaende&schritt=3`);
  await p.getByRole('heading', { name: 'Gelände aus der Mod holen' }).waitFor();
  await p.locator('.guide-project select').waitFor();
  const current = p.locator('.guide-step[aria-current=step]');
  assert.equal(await current.getAttribute('data-step'), 'pruefen', 'Schritt aus der Adresse ist markiert');
  assert.equal(await current.getByRole('link').getAttribute('href'), `#/projekt/${encodeURIComponent(projectId)}/gelaende`);
  await current.getByRole('link').click();
  await p.waitForURL(/\/gelaende$/);
  await p.goBack();

  // Voraussetzung springt in den anderen Weg, ohne die Seite zu verlassen.
  await p.locator('.guide-step[data-step=mod]').getByRole('link').click();
  await p.getByRole('heading', { name: 'Mod installieren und verbinden' }).waitFor();
  assert.match(p.url(), /#\/anleitung\?weg=mod$/);
  assert.ok(await p.locator('.guide-step[data-step=zulassen] .ga-key').isVisible(), 'Tastenkappe J im Bild');

  // Haken setzen, Fortschritt zählt mit und bleibt nach dem Neuladen.
  await p.locator('.guide-step[data-step=profil]').getByLabel('erledigt').check();
  await p.locator('.guide-step[data-step=installieren]').getByLabel('erledigt').check();
  assert.equal(await p.locator('.guide-count').innerText(), '2 von 5 erledigt');
  await p.reload();
  await p.getByRole('heading', { name: 'Mod installieren und verbinden' }).waitFor();
  assert.equal(await p.locator('.guide-count').innerText(), '2 von 5 erledigt');
  assert.equal(await p.locator('.guide-step[aria-current=step]').getAttribute('data-step'), 'starten', 'erster offener Schritt ist dran');
  assert.equal(await p.locator('.guide-path[data-path=mod] [role=progressbar]').getAttribute('aria-valuenow'), '2');

  // Schnellsuche kennt die Anleitung.
  await p.goto(`${BASE}#/`);
  await waitForStart(p);
  await p.keyboard.press('Control+k');
  const dialog = p.getByRole('dialog', { name: 'Schnellsuche' });
  await dialog.waitFor();
  await dialog.getByRole('combobox').fill('Anleitung');
  await dialog.getByRole('option', { name: /Anleitung/ }).first().click();
  await p.getByRole('heading', { name: 'Wie geh ich es an?' }).waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});

test('Anleitung auf dem Handy: nichts ragt seitlich heraus', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await context.newPage();
  await p.goto(`${BASE}#/anleitung?weg=hologramm`);
  await p.getByRole('heading', { name: 'Im Spiel mit Hologramm bauen' }).waitFor({ timeout: 90_000 });
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `seitlicher Überhang ${overflow} px`);
  assert.equal(await p.locator('.guide-step').count(), 6);
  await context.close();
});
