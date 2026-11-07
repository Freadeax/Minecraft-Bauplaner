// Block 3 acceptance (06.11.2026): the published planner in a real browser against the real mod in the running
// game test – nothing simulated. Started by scripts/mod/test_bridge_ingame.sh beside the game (skip with
// BAUPLANER_BROWSER=0). The game test (BridgeGameTest.browserPhase) and this script take turns over files in the
// work folder:
//   browser-ready  (this script: planner loaded)        → game writes browser-go once its link runs on port 47615
//   browser-ask    (this script: planner asks to pair)   → game presses J, clicks „Planer zulassen“, writes game-allowed
//   browser-sent   (this script: plan sent from the map) → game moves and turns the hologram with the keys, writes game-moved
//   browser-done   (this script: result in browser.json, pictures browser-*.png)
// Cases: LIVE-01 (pairing by click), LIVE-02 (send from the map), LIVE-03 (terrain around me), LIVE-04 (position
// back from the game), PROJ-24 (terrain from the game with biomes, block check, landscape by biomes).
// Usage: node scripts/mod/bridge_browser.mjs <work folder>   (needs `npm run build`)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { waitForStart } from '../../tests/e2e/start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const dir = process.argv[2];
if (!dir) throw new Error('usage: bridge_browser.mjs <work folder>');
const PORT = 4311, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
const result = { steps: [], errors: [] };
const step = (name, detail = '') => { result.steps.push({ name, detail }); console.log(`  Browser: ${name}${detail ? ` – ${detail}` : ''}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFile(name, ms) {
  for (let t = 0; t < ms; t += 250) { if (existsSync(join(dir, name))) return; await sleep(250); }
  throw new Error(`Spiel hat ${name} nicht innerhalb von ${ms / 1000} s geschrieben`);
}

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
let browser, page;
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await sleep(200); }
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = page = await context.newPage();
  p.setDefaultTimeout(30_000);
  p.on('pageerror', e => result.errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CONNECTION_REFUSED/.test(m.text())) result.errors.push(m.text()); });
  await p.goto(`${BASE}#/`);
  await waitForStart(p);
  // The sample project on the world map, where the game test stands (the map starts at 0/0).
  await p.getByRole('button', { name: 'Beispielprojekt „Burgmauer“' }).click();
  await p.waitForURL(/#\/projekt\//);
  const projectId = decodeURIComponent(p.url().split('#/projekt/')[1].split(/[/?]/)[0]);
  await p.goto(`${BASE}#/karte`);
  await p.locator('.map-page[data-map-state=ready]').waitFor({ timeout: 60_000 });
  await p.getByRole('button', { name: 'Platzieren' }).first().click();
  await p.getByRole('status').filter({ hasText: 'Auf die Weltkarte gesetzt' }).waitFor();
  writeFileSync(join(dir, 'browser-ready'), '');
  await waitFile('browser-go', 15 * 60_000);
  const go = JSON.parse(readFileSync(join(dir, 'browser-go'), 'utf8'));

  // LIVE-01 / LINK-03: „Verbinden“ without code, the game shows the question, the player allows it with J.
  const game = p.getByRole('region', { name: 'Spielverbindung' });
  if (!(await game.getByLabel('Port der Mod').isVisible())) await game.getByText('Port', { exact: true }).click();
  await game.getByLabel('Port der Mod').fill(String(go.port));
  await game.getByRole('button', { name: 'Verbinden' }).click();
  await p.locator('[data-live-phase=asking]').waitFor();
  step('Verbinden gedrückt, Planer fragt im Spiel', 'kein Code, kein Befehl');
  writeFileSync(join(dir, 'browser-ask'), '');
  await waitFile('game-allowed', 120_000);
  await p.locator('[data-live-phase=connected]').waitFor();
  const where = await game.getByText(/X -?\d+ · Y -?\d+ · Z -?\d+/).first().innerText();
  step('Verbunden nach „Planer zulassen“ im Spiel, Spielerposition auf der Karte', where);
  result.player = where;

  // LIVE-03: terrain around the player from the loaded chunks.
  await game.getByRole('button', { name: 'Gelände um mich lesen' }).click();
  const terrain = await p.getByRole('status').filter({ hasText: /Chunks aus dem Spiel gelesen/ }).first().innerText();
  step('Gelände um mich gelesen', terrain);
  // LIVE-03: a point where the player stands, the Weltplan into the game.
  await game.getByRole('button', { name: /Punkt, wo ich stehe/ }).click();
  await game.getByRole('button', { name: 'Weltplan ins Spiel senden' }).click();
  const marks = await p.getByRole('status').filter({ hasText: /Weltplan-Einträge \(Oberwelt\) im Spiel als Markierungen eingeblendet/ }).first().innerText();
  if (!/^[1-9]/.test(marks.trim())) throw new Error(`Weltplan nicht angekommen: ${marks}`);
  step('Punkt an der Spielerposition gesetzt und Weltplan ins Spiel gesendet', marks.split('\n')[0]);
  await p.screenshot({ path: join(dir, 'browser-karte.png') });

  // LIVE-02: send the project from the map; the hologram appears where the map says.
  const list = p.getByRole('complementary', { name: 'Projekte auf der Karte' });
  await list.getByRole('button', { name: /Burgmauer/ }).first().click();
  await p.getByRole('button', { name: '▶ Ins Spiel senden' }).click();
  const sent = await p.getByRole('status').filter({ hasText: /von der Website platziert/ }).first().innerText();
  await game.getByText(/liegt im Spiel genau an der geplanten Stelle/).waitFor();
  step('Plan von der Karte ins Spiel gesendet, liegt genau an der Kartenlage', sent);
  writeFileSync(join(dir, 'browser-sent'), '');

  // LIVE-04: the player moves and turns the hologram with the keys; the planner takes the position back.
  await waitFile('game-moved', 120_000);
  const moved = await game.getByText(/liegt im Spiel an einer anderen Stelle als geplant|ist im Spiel gedreht oder gespiegelt/).first().innerText();
  step('Planer sieht die Änderung im Spiel', moved.replace(/\s+/g, ' '));
  await game.getByRole('button', { name: 'Lage aus dem Spiel übernehmen' }).click();
  await p.getByRole('status').filter({ hasText: 'Lage aus dem Spiel übernommen' }).waitFor();
  await game.getByText(/liegt im Spiel genau an der geplanten Stelle/).waitFor();
  const progress = await game.getByText(/von [\d.]+ geprüften Blöcken richtig/).first().innerText();
  step('Verschobene und gedrehte Lage aus dem Spiel übernommen, Fortschritt live', progress);
  await p.screenshot({ path: join(dir, 'browser-lage.png') });
  // MAP-05: Baustand straight from the game, stored in the project (tab „Bauen“).
  await game.getByRole('button', { name: /Baustand holen/ }).first().click();
  step('Baustand aus dem Spiel geholt', await p.getByText(/Baustand geholt und im Projekt/).first().innerText());

  // PROJ-24 / TERRAIN-04: terrain of the building site straight from the game, biomes, block check, landscape.
  await p.goto(`${BASE}#/projekt/${encodeURIComponent(projectId)}/gelaende`);
  const fromGame = p.getByTestId('terrain-from-game');
  await fromGame.getByText('Spiel verbunden').waitFor();
  const coverage = await fromGame.getByTestId('terrain-coverage').innerText();
  await fromGame.getByRole('button', { name: /Gelände aus dem Spiel (übernehmen|erneuern)/ }).click();
  await p.getByRole('status').filter({ hasText: 'Geländeaufnahme aus dem Spiel gespeichert' }).waitFor();
  const state = await p.getByTestId('terrain-survey-state').innerText();
  if (!/aus dem Spiel/.test(state) || !/Biome:/.test(state)) throw new Error(`Geländeaufnahme ohne Spielquelle oder Biome: ${state}`);
  step('Gelände aus dem Spiel übernommen (ohne Datei)', `${coverage.replace(/\s+/g, ' ')} · ${state.replace(/\s+/g, ' ')}`);
  const check = p.getByRole('region', { name: 'Blockgenau prüfen' });
  await check.getByRole('button', { name: 'Gelände aus dem Spiel prüfen' }).click();
  await p.locator('.terrain-verdict').waitFor();
  await p.getByText('Quelle: Blöcke aus dem Spiel (geladene Chunks)').waitFor();
  step('Blockgenau aus dem Spiel geprüft', (await p.locator('.terrain-verdict').first().innerText()).replace(/\s+/g, ' ').slice(0, 160));
  await p.screenshot({ path: join(dir, 'browser-gelaende.png'), fullPage: false });
  // PROJ-24: far away from the site the terrain comes from the Geländegedächtnis.
  writeFileSync(join(dir, 'browser-far'), '');
  await waitFile('game-far', 120_000);
  await fromGame.getByRole('button', { name: /Gelände aus dem Spiel (übernehmen|erneuern)/ }).click();
  const far = await p.getByRole('status').filter({ hasText: /Geländeaufnahme aus dem Spiel gespeichert.*Geländegedächtnis/ }).first().innerText();
  step('Weit weg vom Bauplatz erneut übernommen: aus dem Geländegedächtnis', far.replace(/\s+/g, ' '));
  await p.goto(`${BASE}#/projekt/${encodeURIComponent(projectId)}/landschaft`);
  await p.getByRole('button', { name: 'Gestaltung beginnen' }).click();
  const biomes = p.getByTestId('landscape-biomes');
  await biomes.locator('summary').click();
  await biomes.getByRole('button', { name: 'Nach Biomen bemalen' }).click();
  step('Landschaft nach Biomen bemalt', await p.getByRole('status').filter({ hasText: /Spalten nach Biomen bemalt/ }).first().innerText());
  result.ok = result.errors.length === 0;
  await context.close();
} catch (e) {
  result.ok = false;
  result.failure = String(e?.stack ?? e);
  console.error(`  Browser: FEHLER ${e?.message ?? e}`);
  try { await page?.screenshot({ path: join(dir, 'browser-fehler.png') }); result.gameBox = await page?.getByRole('region', { name: 'Spielverbindung' }).innerText({ timeout: 2000 }); } catch {}
} finally {
  writeFileSync(join(dir, 'browser.json'), JSON.stringify(result, null, 2));
  writeFileSync(join(dir, 'browser-done'), '');
  await browser?.close();
  server.kill();
}
