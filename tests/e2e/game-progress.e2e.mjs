// Browser check of the Baustand from the game on the map (MAP-05) against the mod simulator: the plan goes
// to the game, „Baustand holen“ reads the recording, compares it, shows layers and deviations on the map,
// ticks confirmed steps (undoable) and keeps the recording in the project (Bauen tab). Also: Weltplan
// follows into the game by itself, the hologram can be set from the map's context menu.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startModSimulator } from './modSimulator.mjs';
import { openSampleProject } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4293, MOD_PORT = 47695, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
let server, browser, mod;

before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  mod = await startModSimulator(MOD_PORT);
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.kill(); await mod?.close(); });

const ready = p => p.locator('.map-page[data-map-state=ready]').waitFor({ timeout: 20_000 });

test('Baustand aus dem Spiel: holen, Ebenen, Abweichungen auf der Karte, abhaken, im Projekt gespeichert', async () => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await context.newPage();
  p.setDefaultTimeout(15_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });

  await p.goto(`${BASE}#/`);
  await openSampleProject(p);
  await p.waitForURL(/#\/projekt\//);
  const projectId = decodeURIComponent(p.url().split('#/projekt/')[1].split(/[/?]/)[0]);
  await p.goto(`${BASE}#/karte`);
  await ready(p);
  await p.getByRole('button', { name: 'Platzieren' }).first().click();
  await p.getByRole('status').filter({ hasText: 'Auf die Weltkarte gesetzt' }).waitFor();

  const game = p.getByRole('region', { name: 'Spielverbindung' });
  await game.getByText('Port', { exact: true }).click();
  await game.getByLabel('Port der Mod').fill(String(MOD_PORT));
  await game.getByRole('button', { name: 'Verbinden' }).click();
  await game.getByText('Mod gefunden, nicht gekoppelt').waitFor();
  mod.openPairing();
  await game.getByLabel('Code').fill('482913');
  await game.getByRole('button', { name: 'Koppeln' }).click();
  await p.locator('.live-game[data-live-phase=connected]').waitFor();

  // Weltplan follows by itself once switched on: a new point reaches the game without „senden“.
  await game.getByLabel(/Weltplan automatisch abgleichen/).check();
  const canvas = p.locator('.overview-canvas');
  await canvas.evaluate(el => el.scrollIntoView({ block: 'center' }));
  await canvas.focus(); await p.keyboard.press('p');
  const box = await canvas.boundingBox();
  await p.mouse.click(box.x + box.width / 2 + 40, box.y + box.height / 2 - 40);
  await p.locator('.plan-editor').getByRole('heading', { name: /Punkt 1/ }).waitFor();
  for (let i = 0; i < 40 && mod.state.marks.length !== 1; i++) await p.waitForTimeout(150);
  assert.equal(mod.state.marks.length, 1, 'Punkt automatisch im Spiel');
  assert.equal(mod.state.marks[0].kind, 'point');
  await p.locator('.plan-editor').getByRole('button', { name: 'Schließen' }).click().catch(() => {});
  await p.keyboard.press('Escape');

  // Plan to the game, then the Baustand.
  mod.state.nextProjectId = projectId;
  const list = p.getByRole('complementary', { name: 'Projekte auf der Karte' });
  await list.getByRole('button', { name: /Burgmauer/ }).first().click();
  await p.getByRole('button', { name: '▶ Ins Spiel senden' }).click();
  await p.getByRole('status').filter({ hasText: /von der Website platziert\. Revision \d+\./ }).waitFor();
  // Build sections of the plan (mod 0.7.0): choose one, the game shows only it.
  const sections = p.getByRole('group', { name: 'Bauabschnitte im Spiel' });
  await sections.getByRole('button', { name: /2\. Tor/ }).click();
  await p.getByRole('status').filter({ hasText: 'Im Spiel wird nur Abschnitt „Tor“ gezeigt.' }).waitFor();
  assert.equal(mod.state.hologram.section, 2);
  await sections.getByRole('button', { name: /2\. Tor/ }).and(p.locator('[aria-pressed=true]')).waitFor();
  await sections.getByRole('button', { name: /^Alle/ }).click();
  await sections.getByRole('button', { name: /^Alle/ }).and(p.locator('[aria-pressed=true]')).waitFor();

  const panel = p.getByRole('region', { name: 'Baustand aus dem Spiel' });
  await panel.getByRole('button', { name: '⟳ Baustand holen' }).click();
  await panel.getByRole('status').filter({ hasText: /Baustand geholt und im Projekt „Burgmauer \(Beispiel\)“ gespeichert/ }).waitFor();
  const totals = panel.locator('[data-game-totals]');
  await totals.waitFor();
  const text = await totals.innerText();
  const m = /^(\d[\d.]*) von (\d[\d.]*) Blöcken richtig/.exec(text);
  assert.ok(m, text);
  const ok = Number(m[1].replace(/\./g, '')), all = Number(m[2].replace(/\./g, ''));
  assert.ok(ok > 0 && ok < all, `teilweise gebaut: ${text}`);
  assert.match(text, /falscher Block 1\b/, text);
  assert.match(text, /fehlt \d/, text);

  // Layers: the bottom one is built except the one wrong block; the map shows the deviations.
  const layers = panel.locator('.game-layers');
  assert.match(await layers.locator('summary').innerText(), /^Ebenen \(0 von \d+ fertig\)$/);
  assert.ok(Number(await canvas.getAttribute('data-deviations')) > 0, 'Abweichungen auf der Karte');
  const all0 = Number(await canvas.getAttribute('data-deviations'));
  const bottom = layers.locator('.game-layer').last();
  assert.match(await bottom.innerText(), /falsch 1/);
  await bottom.click();
  assert.equal(await bottom.getAttribute('aria-pressed'), 'true');
  assert.equal(Number(await canvas.getAttribute('data-deviations')), 1, 'nur die unterste Ebene: der falsche Block');
  await layers.getByRole('button', { name: 'alle Ebenen' }).click();
  assert.equal(Number(await canvas.getAttribute('data-deviations')), all0);
  await panel.getByLabel(/Abweichungen auf der Karte/).uncheck();
  assert.equal(Number(await canvas.getAttribute('data-deviations')), 0);
  await panel.getByLabel(/Abweichungen auf der Karte/).check();

  // Confirmed steps are ticked only on request, and the tick is one undo step on the map.
  const tick = panel.getByRole('button', { name: /bestätigte Schritte abhaken/ });
  if (await tick.count()) {
    const n = Number(/(\d+)/.exec(await tick.innerText())[1]);
    await tick.click();
    await p.getByRole('status').filter({ hasText: `${n} im Spiel bestätigte Schritte abgehakt` }).first().waitFor();
    await tick.waitFor({ state: 'detached' });
    await p.getByRole('button', { name: 'Karte: Schritt zurück' }).click();
    await panel.getByRole('button', { name: /bestätigte Schritte abhaken/ }).waitFor();
  }

  // Context menu on empty ground (nothing selected): set the hologram there.
  await canvas.evaluate(el => el.scrollIntoView({ block: 'center' }));
  await canvas.focus(); await p.keyboard.press('Escape');
  await canvas.click({ button: 'right', position: { x: 24, y: 470 } });
  await p.getByRole('menuitem', { name: /Hologramm „.*“ hierher setzen/ }).click();
  await p.getByRole('status').filter({ hasText: /Hologramm „.*“ im Spiel nach X -?\d+ · Y -?\d+ · Z -?\d+ gesetzt/ }).waitFor();
  assert.equal(mod.state.placements.length, 1);

  // The recording is in the project: the Bauen tab finds it after a reload.
  await p.goto(`${BASE}#/projekt/${encodeURIComponent(projectId)}/bauen`);
  await p.getByText(/burgmauer_r1_20261102-180000\.schem · Revision \d+/).waitFor({ timeout: 20_000 });
  await p.getByText('1 falscher Block', { exact: true }).waitFor();

  // FALLBACK-01: „Baustand holen (bester Weg)“ in the Bauen tab – the own game first, no server, no room.
  const routes = p.getByTestId('scan-routes');
  await routes.getByText('✓ dein Spiel auf diesem PC').waitFor();
  await routes.getByText('– Spiele im Team-Raum').waitFor();
  await routes.getByRole('button', { name: '⟳ Baustand holen (bester Weg)' }).click();
  await p.getByRole('status').filter({ hasText: 'Baustand über dein Spiel auf diesem PC geholt' }).waitFor({ timeout: 30_000 });
  // Another plan in the game and no other way: the planner says why each way failed and names the file as way out.
  mod.state.hologram = { ...mod.state.hologram, projectId: 'prj_anderer_plan' };
  await routes.getByRole('button', { name: '⟳ Baustand holen (bester Weg)' }).click();
  const fail = p.getByRole('alert').filter({ hasText: 'Kein Weg hat geklappt' });
  await fail.waitFor();
  assert.match(await fail.innerText(), /dein Spiel auf diesem PC: im Spiel ist ein anderer Plan platziert/);
  assert.match(await fail.innerText(), /Server-Plugin: kein Server gekoppelt/);
  assert.match(await fail.innerText(), /Notfall: Aufnahme-Datei/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('Baustand: ältere Mod ohne „scan“ bekommt einen Hinweis statt eines Knopfs', async () => {
  const old = await startModSimulator(MOD_PORT + 1);
  old.state.features = [];
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await context.newPage();
  p.setDefaultTimeout(15_000);
  await p.goto(`${BASE}#/`);
  await openSampleProject(p);
  await p.waitForURL(/#\/projekt\//);
  const projectId = decodeURIComponent(p.url().split('#/projekt/')[1].split(/[/?]/)[0]);
  await p.goto(`${BASE}#/karte`);
  await ready(p);
  await p.getByRole('button', { name: 'Platzieren' }).first().click();
  const game = p.getByRole('region', { name: 'Spielverbindung' });
  await game.getByText('Port', { exact: true }).click();
  await game.getByLabel('Port der Mod').fill(String(MOD_PORT + 1));
  await game.getByRole('button', { name: 'Verbinden' }).click();
  old.openPairing();
  await game.getByLabel('Code').fill('482913');
  await game.getByRole('button', { name: 'Koppeln' }).click();
  await p.locator('.live-game[data-live-phase=connected]').waitFor();
  old.state.nextProjectId = projectId;
  await p.getByRole('complementary', { name: 'Projekte auf der Karte' }).getByRole('button', { name: /Burgmauer/ }).first().click();
  await p.getByRole('button', { name: '▶ Ins Spiel senden' }).click();
  const panel = p.getByRole('region', { name: 'Baustand aus dem Spiel' });
  await panel.getByText(/Mit der Mod ab 0\.7\.1 liest die Karte/).waitFor();
  assert.equal(await panel.getByRole('button', { name: '⟳ Baustand holen' }).count(), 0);
  await context.close();
  await old.close();
});
