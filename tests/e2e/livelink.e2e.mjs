// Browser check of the live map (MAP-03): Weltplan tools on the top view, undo, persistence, and the game link
// against a mod simulator (pairing, player, live terrain, hologram progress, plan and marks to the game).
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startModSimulator } from './modSimulator.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4281, MOD_PORT = 47691, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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
/** Canvas pixel position of a world column, from the map's own centre/scale. */
async function at(canvas, x, z) {
  const box = await canvas.boundingBox();
  const scale = Number(await canvas.getAttribute('data-scale'));
  const [cx, cz] = (await canvas.getAttribute('data-center')).split(',').map(Number);
  return { x: box.x + box.width / 2 + (x + 0.5 - cx) * scale, y: box.y + box.height / 2 + (z + 0.5 - cz) * scale };
}

test('Live-Karte: Weltplan zeichnen, rückgängig, Spiel koppeln, Gelände, Hologramm, Senden', async () => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await context.newPage();
  p.setDefaultTimeout(15_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });

  // A sample project on the map so there is something to send.
  await p.goto(`${BASE}#/`);
  await p.getByRole('button', { name: 'Beispielprojekt „Burgmauer“' }).click();
  await p.waitForURL(/#\/projekt\//);
  await p.goto(`${BASE}#/karte`);
  await ready(p);
  await p.getByRole('button', { name: 'Platzieren' }).first().click();
  await p.getByRole('status').filter({ hasText: 'Auf die Weltkarte gesetzt' }).waitFor();

  const canvas = p.locator('.overview-canvas');
  // Zoom so blocks are big enough to hit reliably, around the origin.
  for (let i = 0; i < 3; i++) await p.getByRole('button', { name: 'Hineinzoomen' }).click();

  // Building site: drag a rectangle.
  await p.getByRole('group', { name: 'Planungswerkzeug' }).getByRole('button', { name: 'Bauplatz' }).click();
  const scale = Number(await canvas.getAttribute('data-scale'));
  assert.ok(scale >= 4, `zoomed in (${scale})`);
  const [cx, cz] = (await canvas.getAttribute('data-center')).split(',').map(Number);
  const a = await at(canvas, cx - 6, cz - 3), b = await at(canvas, cx - 1, cz + 2);
  await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 }); await p.mouse.move(b.x, b.y, { steps: 4 }); await p.mouse.up();
  const editor = p.locator('.plan-editor');
  await editor.getByRole('heading', { name: 'Bauplatz: Bauplatz 1' }).waitFor();
  assert.match(await editor.innerText(), /6 × 6 = 36 Blöcke Fläche/);
  assert.equal(await p.getByRole('group', { name: 'Planungswerkzeug' }).getByRole('button', { name: 'Auswählen' }).getAttribute('aria-pressed'), 'true');

  // Rename and link the project; then undo the rename and redo it.
  await editor.getByLabel('Name').fill('Burgplatz');
  await editor.getByLabel('Projekt auf diesem Bauplatz').selectOption({ label: 'Burgmauer (Beispiel)' });
  await editor.getByRole('button', { name: 'Übernehmen' }).click();
  await editor.getByRole('heading', { name: 'Bauplatz: Burgplatz' }).waitFor();
  await p.getByRole('button', { name: 'Weltplan: Schritt zurück' }).click();
  await editor.getByRole('heading', { name: 'Bauplatz: Bauplatz 1' }).waitFor();
  await p.getByRole('button', { name: 'Weltplan: wiederholen' }).click();
  await editor.getByRole('heading', { name: 'Bauplatz: Burgplatz' }).waitFor();

  // Path: three corners, finish with Enter.
  await p.getByRole('group', { name: 'Planungswerkzeug' }).getByRole('button', { name: 'Weg' }).click();
  for (const [dx, dz] of [[1, 0], [6, 0], [6, 4]]) { const q = await at(canvas, cx + dx, cz + dz); await p.mouse.click(q.x, q.y); await p.waitForTimeout(400); }
  assert.equal(await canvas.getAttribute('data-draft'), 'path:3');
  await canvas.press('Enter');
  await editor.getByRole('heading', { name: 'Weg: Weg 1' }).waitFor();
  assert.match(await editor.innerText(), /3 Ecken · 9 Blöcke lang · \d+ Wegblöcke bei 3 Breite/);

  // Point with the keyboard shortcut P, then Escape-free single click.
  await canvas.focus(); await p.keyboard.press('p');
  const q = await at(canvas, cx + 3, cz - 3); await p.mouse.click(q.x, q.y);
  await editor.getByRole('heading', { name: /Punkt 1/ }).waitFor();
  const list = p.getByRole('complementary', { name: 'Projekte auf der Karte' });
  assert.match(await list.innerText(), /1 Bauplätze \(0 frei\) · 1 Wege, 9 Blöcke lang · 1 Punkte/);

  // Measure: two clicks.
  await canvas.focus(); await p.keyboard.press('m');
  const m1 = await at(canvas, cx, cz), m2 = await at(canvas, cx + 3, cz + 4);
  await p.mouse.click(m1.x, m1.y); await p.waitForTimeout(400); await p.mouse.click(m2.x, m2.y);
  assert.match(await p.getByTestId('map-measure').innerText(), /^5 Blöcke Luftlinie · 7 zu Fuß \(ΔX 3, ΔZ 4\)/);

  // Persistence: reload keeps the Weltplan.
  await p.reload(); await ready(p);
  assert.match(await list.innerText(), /Burgplatz[\s\S]*Weg 1[\s\S]*Punkt 1/);

  // ---------------------------------------------------------------- game link
  const game = p.getByRole('region', { name: 'Spielverbindung' });
  await game.getByText('Port', { exact: true }).click();
  await game.getByLabel('Port der Mod').fill(String(MOD_PORT));
  await game.getByRole('button', { name: 'Verbinden' }).click();
  await game.getByText('Mod gefunden, nicht gekoppelt').waitFor();
  // Wrong code first, then the one the game shows.
  mod.openPairing();
  await game.getByLabel('Code').fill('111111');
  await game.getByRole('button', { name: 'Koppeln' }).click();
  await game.getByRole('alert').filter({ hasText: 'Code stimmt nicht.' }).waitFor();
  await game.getByLabel('Code').fill('482913');
  await game.getByRole('button', { name: 'Koppeln' }).click();
  await game.locator('[data-live-phase=connected]').or(p.locator('.live-game[data-live-phase=connected]')).first().waitFor();
  await game.getByText(/X 40 · Y 65 · Z -21 · blickt nach Süden/).waitFor();
  assert.match(await game.innerText(), /Mod 0\.5\.0-sim · fabric · Minecraft 26\.3/);

  // Player moves: the panel follows within the poll interval.
  mod.state.player = { ...mod.state.player, x: 44.5, z: -12.5, yaw: 90 };
  await game.getByText(/X 44 · Y 65 · Z -13 · blickt nach Westen/).waitFor();

  // Live terrain around the player; the cursor shows ground "aus dem Spiel".
  await game.getByRole('button', { name: 'Gelände um mich lesen' }).click();
  await p.getByRole('status').filter({ hasText: /Chunks aus dem Spiel gelesen, \d+ sind im Spiel gerade nicht geladen/ }).waitFor();
  assert.match(await game.innerText(), /\d+ Chunks aus dem Spiel/);
  const pond = await at(canvas, 50, -4);
  await p.getByRole('button', { name: 'Zu mir' }).click();
  await p.waitForTimeout(1500);
  const pond2 = await at(canvas, 50, -4);
  await p.mouse.move(pond2.x, pond2.y);
  await p.locator('.overview-hud').getByText(/Gelände Y 62 \(water, aus dem Spiel\)/).waitFor();
  assert.ok(pond, 'pond position');
  await p.getByRole('button', { name: '◉ Folgen an' }).click();

  // Marks to the game.
  await game.getByRole('button', { name: 'Weltplan ins Spiel senden' }).click();
  await p.getByRole('status').filter({ hasText: '3 Weltplan-Einträge (Oberwelt) im Spiel als Markierungen eingeblendet.' }).waitFor();
  assert.deepEqual(mod.state.marks.map(i => i.kind).sort(), ['path', 'point', 'site']);

  // Send the project: a .schem (gzip) lands in the game at the map's placement.
  await list.getByRole('button', { name: /Burgmauer/ }).first().click();
  const projectId = new URLSearchParams(p.url().split('?')[1] ?? '').get('projekt');
  mod.state.nextProjectId = projectId;
  await p.getByRole('button', { name: '▶ Ins Spiel senden' }).click();
  await p.getByRole('status').filter({ hasText: /von der Website platziert\. Revision \d+\./ }).waitFor();
  const sent = mod.state.plans.at(-1);
  assert.equal(sent.magic, '1f8b', 'gzip-compressed schem');
  assert.match(sent.name, /^burgmauer-beispiel-rev\d+\.schem$/);
  assert.equal(sent.turns, '0');

  // Hologram progress appears; moving it in the game lets the map adopt the place.
  await game.getByText(/30 von 100 geprüften Blöcken richtig \(30 %\)/).waitFor();
  await game.getByText(/liegt im Spiel genau an der geplanten Stelle/).waitFor();
  mod.state.hologram = { ...mod.state.hologram, placement: { ...mod.state.hologram.placement, x: mod.state.hologram.placement.x + 7 } };
  await game.getByText(/liegt im Spiel an einer anderen Stelle als geplant/).waitFor();
  await game.getByRole('button', { name: 'Lage aus dem Spiel übernehmen' }).click();
  await p.getByRole('status').filter({ hasText: 'Lage aus dem Spiel übernommen' }).waitFor();
  await game.getByText(/liegt im Spiel genau an der geplanten Stelle/).waitFor();

  // Unpair: the key is forgotten here and in the mod.
  await game.getByRole('button', { name: 'Trennen' }).click();
  await game.getByRole('button', { name: 'Verbinden' }).waitFor();
  assert.equal(mod.state.tokens.size, 0);
  assert.deepEqual(errors, []);
  await context.close();
});

test('Live-Karte am Handy: Werkzeuge erreichbar, kein waagerechtes Scrollen', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await context.newPage();
  await p.goto(`${BASE}#/karte`);
  await ready(p);
  const tools = p.getByRole('group', { name: 'Planungswerkzeug' });
  for (const name of ['Auswählen', 'Bauplatz', 'Weg', 'Punkt', 'Messen']) assert.ok(await tools.getByRole('button', { name }).isVisible(), name);
  await p.getByRole('region', { name: 'Spielverbindung' }).getByRole('button', { name: 'Verbinden' }).waitFor();
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await context.close();
});
