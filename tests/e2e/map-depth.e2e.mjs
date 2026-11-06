// Browser check of the deepened world map (MAP-06): zones, named layers, measuring with several points,
// notes from the context menu, reload keeps schema 2; with the mod simulator: an old mod gets only what it
// understands, height profile and route over the live terrain, a point where the player stands; a mod of
// protocol 2 shows other players and takes zones. Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startModSimulator } from './modSimulator.mjs';
import { openSampleProject } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4301, OLD_MOD = 47697, NEW_MOD = 47699, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
let server, browser, oldMod, newMod;

before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  oldMod = await startModSimulator(OLD_MOD);
  newMod = await startModSimulator(NEW_MOD, { protocol: 2, features: ['scan', 'marks2', 'players', 'bigplans', 'team', 'marks3'] });
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.kill(); await oldMod?.close(); await newMod?.close(); });

const ready = p => p.locator('.map-page[data-map-state=ready]').waitFor({ timeout: 20_000 });
async function at(canvas, x, z) {
  const box = await canvas.boundingBox();
  const scale = Number(await canvas.getAttribute('data-scale'));
  const [cx, cz] = (await canvas.getAttribute('data-center')).split(',').map(Number);
  return { x: box.x + box.width / 2 + (x + 0.5 - cx) * scale, y: box.y + box.height / 2 + (z + 0.5 - cz) * scale };
}
const names = p => p.locator('.builder-objects .plan-row b').evaluateAll(els => els.map(b => (b.childNodes[0]?.textContent ?? '').trim()));
async function clickAll(p, canvas, cols) {
  for (const [x, z] of cols) { const q = await at(canvas, x, z); await p.mouse.click(q.x, q.y); await p.waitForTimeout(420); }
}
async function openMap(p) {
  await p.goto(`${BASE}#/`);
  await openSampleProject(p);
  await p.waitForURL(/#\/projekt\//);
  await p.goto(`${BASE}#/karte`);
  await ready(p);
  await p.getByRole('button', { name: 'Platzieren' }).first().click();
  await p.getByRole('status').filter({ hasText: 'Auf die Weltkarte gesetzt' }).waitFor();
  await ready(p);
  const canvas = p.locator('.overview-canvas');
  await canvas.evaluate(el => el.scrollIntoView({ block: 'center' }));
  return canvas;
}
async function connect(p, port, mod) {
  const game = p.getByRole('region', { name: 'Spielverbindung' });
  await game.getByText('Port', { exact: true }).click();
  await game.getByLabel('Port der Mod').fill(String(port));
  await game.getByRole('button', { name: 'Verbinden' }).click();
  await game.getByText('Mod gefunden, nicht gekoppelt').waitFor();
  mod.openPairing();
  await game.getByLabel('Code').fill('482913');
  await game.getByRole('button', { name: 'Koppeln' }).click();
  await p.locator('.live-game[data-live-phase=connected]').waitFor();
  return game;
}
function watch(p) {
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  return errors;
}

test('Zonen, benannte Ebenen, Messen mit Fläche, Notiz aus dem Menü, Neuladen', async () => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await context.newPage();
  p.setDefaultTimeout(15_000);
  const errors = watch(p);
  const canvas = await openMap(p);
  const [cx, cz] = (await canvas.getAttribute('data-center')).split(',').map(Number);

  // Zone: tool Z, three corners, Eingabe closes it; the editor opens with category and layer.
  await canvas.focus(); await p.keyboard.press('z');
  await clickAll(p, canvas, [[cx - 14, cz + 6], [cx - 4, cz + 6], [cx - 9, cz + 14]]);
  assert.equal(await canvas.getAttribute('data-draft'), 'zone:3');
  await canvas.press('Enter');
  const editor = p.locator('.plan-editor');
  await editor.getByRole('heading', { name: 'Zone: Zone 1' }).waitFor();
  await editor.getByLabel('Art').selectOption('farm');
  await editor.getByLabel('Ebene').fill('Nord');
  await editor.getByRole('button', { name: 'Übernehmen' }).click();
  await p.getByRole('status').filter({ hasText: '„Zone 1“ gespeichert' }).waitFor();
  assert.match(await p.locator('.builder-objects .plan-row').first().innerText(), /Zone 1\s*Nord\s*Zone · Farmen · ≈ \d+ Blöcke²/);
  await p.getByRole('group', { name: 'Benannte Ebenen' }).getByText('Nord').waitFor();

  // A point, then both into the layer „Nord“ via the selection bar; hiding the layer empties the visible list.
  await canvas.focus(); await p.keyboard.press('p');
  await clickAll(p, canvas, [[cx + 6, cz + 8]]);
  await editor.getByRole('heading', { name: 'Ziel: Punkt 1' }).waitFor();
  await canvas.focus(); await p.keyboard.press('Control+a');
  const bar = p.getByRole('toolbar', { name: 'Auswahl' });
  await bar.getByText(/2 Einträge und 1 Projekt gewählt/).waitFor();
  await bar.getByLabel('Ebene zuweisen').selectOption('Nord');
  await p.getByRole('status').filter({ hasText: '2 Einträge in Ebene „Nord“ gelegt' }).waitFor();
  assert.deepEqual(await names(p), ['Zone 1', 'Punkt 1']);
  const named = p.getByRole('group', { name: 'Benannte Ebenen' });
  assert.match(await named.innerText(), /Nord\s*2/);
  await named.getByLabel(/Nord/).uncheck();
  await p.getByText('2 Einträge in ausgeblendeten Ebenen.').waitFor();
  assert.equal(await canvas.getAttribute('data-selected'), '1', 'nur das Projekt bleibt gewählt');
  await named.getByLabel(/Nord/).check();
  assert.deepEqual(await names(p), ['Zone 1', 'Punkt 1']);
  // The list filters by layer.
  await p.locator('.builder-objects').getByLabel('Ebene').selectOption('');
  await p.getByText('Kein Eintrag passt zur Suche.').waitFor();
  await p.locator('.builder-objects').getByLabel('Ebene').selectOption('all');

  // Measuring with three points: area and corner count in the HUD, Eingabe finishes, Escape clears.
  await canvas.focus(); await p.keyboard.press('Escape'); await p.keyboard.press('m');
  await clickAll(p, canvas, [[cx + 2, cz - 10], [cx + 12, cz - 10], [cx + 12, cz]]);
  const measure = p.getByTestId('map-measure');
  assert.match(await measure.innerText(), /^20 Blöcke Luftlinie · 20 zu Fuß \(ΔX 10, ΔZ 10\) · 3 Punkte · 2,5 Blöcke im Nether · Fläche ≈ 50 Blöcke²/);
  await canvas.press('Enter');
  assert.equal(await canvas.getAttribute('data-draft'), '');
  await measure.waitFor();
  await canvas.press('Escape');
  await measure.waitFor({ state: 'detached' });

  // Context menu on empty ground: a note; its text shows on the map (the editor keeps it).
  await canvas.focus(); await p.keyboard.press('v');
  const empty = await at(canvas, cx + 10, cz + 14);
  await p.mouse.click(empty.x, empty.y, { button: 'right' });
  await p.getByRole('menuitem', { name: '📝 Notiz hier setzen' }).click();
  await editor.getByRole('heading', { name: 'Notiz: Notiz 1' }).waitFor();
  await editor.getByRole('textbox', { name: 'Notiz' }).fill('Hier Lager bauen');
  await editor.getByRole('button', { name: 'Übernehmen' }).click();
  await p.getByRole('status').filter({ hasText: '„Notiz 1“ gespeichert' }).waitFor();

  // Reload: the plan of schema 2 loads with zone, layer and note.
  await p.reload();
  await ready(p);
  assert.deepEqual(await names(p), ['Zone 1', 'Punkt 1', 'Notiz 1']);
  assert.match(await p.locator('.builder-objects').innerText(), /1 Zonen, ≈ \d+ Blöcke²/);
  await p.getByRole('group', { name: 'Benannte Ebenen' }).getByText('Nord').waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});

test('Alte Mod (Protokoll 1): nur verständliche Markierungen, Höhenprofil und Route über das Live-Gelände, Punkt wo ich stehe', async () => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await context.newPage();
  p.setDefaultTimeout(15_000);
  const errors = watch(p);
  const canvas = await openMap(p);
  const [cx, cz] = (await canvas.getAttribute('data-center')).split(',').map(Number);
  const editor = p.locator('.plan-editor');
  // A zone and a danger marker the old mod does not know, plus a plain point it does.
  await canvas.focus(); await p.keyboard.press('z');
  await clickAll(p, canvas, [[cx - 14, cz + 6], [cx - 4, cz + 6], [cx - 9, cz + 14]]);
  await canvas.press('Enter');
  await editor.getByRole('heading', { name: 'Zone: Zone 1' }).waitFor();
  await canvas.focus(); await p.keyboard.press('p');
  await clickAll(p, canvas, [[cx + 6, cz + 8]]);
  await editor.getByRole('heading', { name: 'Ziel: Punkt 1' }).waitFor();
  await canvas.focus(); await p.keyboard.press('Escape'); await p.keyboard.press('v');
  const empty = await at(canvas, cx + 10, cz + 14);
  await p.mouse.click(empty.x, empty.y, { button: 'right' });
  await p.getByRole('menuitem', { name: '⚠ Gefahr hier markieren' }).click();
  await editor.getByRole('heading', { name: 'Gefahr: Gefahr 1' }).waitFor();

  const game = await connect(p, OLD_MOD, oldMod);
  assert.match(await game.locator('.live-features').innerText(), /Mod kann: Baustand aus dem Spiel · fehlt: Zonen, Ebenen und neue Punktarten im Spiel, Mitspieler auf der Karte/);
  await game.getByText(/2 Einträge bleiben nur auf der Karte \(Zonen, Punkte „Gefahr“\)/).waitFor();
  await game.getByRole('button', { name: 'Weltplan ins Spiel senden' }).click();
  await p.getByRole('status').filter({ hasText: /1 Weltplan-Einträge \(Oberwelt\) im Spiel als Markierungen eingeblendet, 2 kann diese Mod nicht zeigen \(Zonen, Punkte „Gefahr“\)/ }).waitFor();
  assert.deepEqual(oldMod.state.marks.map(m => m.kind), ['point']);
  assert.ok(!('layer' in oldMod.state.marks[0]), 'keine neuen Felder an die alte Mod');

  // Terrain from the game, then a path near the player: profile and route over the terrain.
  await game.getByRole('button', { name: 'Gelände um mich lesen' }).click();
  await p.getByRole('status').filter({ hasText: /Chunks aus dem Spiel gelesen/ }).waitFor();
  await game.getByRole('button', { name: 'Zu mir' }).click();
  await p.waitForTimeout(800);
  await canvas.evaluate(el => el.scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(300);
  await canvas.focus(); await p.keyboard.press('Escape');
  const [px, pz] = (await canvas.getAttribute('data-center')).split(',').map(Number);
  await canvas.focus(); await p.keyboard.press('w');
  await clickAll(p, canvas, [[px - 8, pz + 3], [px + 8, pz + 3]]);
  await canvas.press('Enter');
  await editor.getByRole('heading', { name: 'Weg: Weg 1' }).waitFor();
  const profile = p.getByTestId('path-profile');
  await profile.waitFor();
  assert.match(await profile.innerText(), /Höhenprofil\s*Y 64 … 64\s*↑ 0 ↓ 0 Blöcke · größte Stufe 0 · ohne Treppe begehbar/);
  await profile.getByRole('button', { name: '⤳ Route übers Gelände' }).click();
  await p.getByRole('status').filter({ hasText: /„Weg 1“ über das Gelände geführt \(\d+ Ecken\)/ }).waitFor();
  // A point where the player stands, with the game height.
  await game.getByRole('button', { name: '📍 Punkt, wo ich stehe' }).click();
  await editor.getByRole('heading', { name: /Anker: Philipp \d\d:\d\d/ }).waitFor();
  assert.equal(await editor.getByLabel('X', { exact: true }).inputValue(), '40');
  assert.equal(await editor.getByLabel('Y', { exact: true }).inputValue(), '65');
  assert.equal(await editor.getByLabel('Z', { exact: true }).inputValue(), '-21');
  await p.getByRole('toolbar', { name: 'Auswahl' }).getByText(/0 Blöcke von dir/).waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});

test('Neue Mod (Protokoll 2): Mitspieler, Zonen und Ebenen gehen ins Spiel', async () => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await context.newPage();
  p.setDefaultTimeout(15_000);
  const errors = watch(p);
  const canvas = await openMap(p);
  const [cx, cz] = (await canvas.getAttribute('data-center')).split(',').map(Number);
  const editor = p.locator('.plan-editor');
  await canvas.focus(); await p.keyboard.press('z');
  await clickAll(p, canvas, [[cx - 14, cz + 6], [cx - 4, cz + 6], [cx - 9, cz + 14]]);
  await canvas.press('Enter');
  await editor.getByRole('heading', { name: 'Zone: Zone 1' }).waitFor();
  await editor.getByLabel('Ebene').fill('Hafen');
  await editor.getByRole('button', { name: 'Übernehmen' }).click();
  await p.getByRole('status').filter({ hasText: '„Zone 1“ gespeichert' }).waitFor();

  const game = await connect(p, NEW_MOD, newMod);
  await game.getByText(/Protokoll 2/).waitFor();
  assert.match(await game.locator('.live-features').innerText(), /^Mod kann: Baustand aus dem Spiel, Zonen, Ebenen und neue Punktarten im Spiel, Mitspieler auf der Karte, große Pläne bis 16,7 Mio. Zellen, Teambau im Spiel \(Abschnitte, Meldungen, Server-Plugin\), Markierungen aus dem Spiel übernehmen · fehlt: Gruppen und Sperren im Hologramm, Gelände aus dem Geländegedächtnis \(ohne Regionsdateien\), Blockgenaue Geländeprüfung aus dem Spiel, Server-Plugin von selbst mit dem Team-Raum verbinden \(neuere Mod\)$/);
  await p.getByTestId('live-others').waitFor();
  assert.match(await p.getByTestId('live-others').innerText(), /Mitspieler in Sichtweite: Anna \(X 52 · Z -15\)/);
  assert.equal(await game.getByText(/bleiben nur auf der Karte/).count(), 0);
  await game.getByRole('button', { name: 'Weltplan ins Spiel senden' }).click();
  await p.getByRole('status').filter({ hasText: /^1 Weltplan-Einträge \(Oberwelt\) im Spiel als Markierungen eingeblendet\./ }).waitFor();
  assert.equal(newMod.state.marks[0].kind, 'zone');
  assert.equal(newMod.state.marks[0].layer, 'Hafen');

  // Protocol 3 (GAME-08, mod 0.13.0): points set in the game with /bauplaner markieren go into the Weltplan.
  newMod.state.gameMarks = [
    { id: 'gabc-0', type: 'lager', name: 'Erzlager', dimension: 'minecraft:overworld', x: 40, y: 70, z: -12, at: '2026-11-04T09:15:00Z', by: 'Philipp' },
    { id: 'gabc-1', type: 'gefahr', name: 'Lavasee', dimension: 'minecraft:overworld', x: 60, y: 11, z: 5, at: '2026-11-04T09:16:00Z', by: 'Philipp' },
  ];
  const waiting = game.locator('.live-game-marks');
  await waiting.getByText('2 Markierungen aus dem Spiel').waitFor({ timeout: 12_000 });
  await waiting.getByRole('button', { name: 'In den Weltplan übernehmen' }).click();
  await p.getByRole('status').filter({ hasText: '2 Markierungen aus dem Spiel übernommen (Ebene „Aus dem Spiel“).' }).waitFor();
  assert.deepEqual(newMod.state.gameMarksAcked, ['gabc-0', 'gabc-1']);
  assert.equal(await waiting.count(), 0);
  assert.ok((await names(p)).includes('Erzlager'));
  assert.ok((await names(p)).includes('Lavasee'));
  // The same points once more (ack lost): nothing is added twice, the game gets its ack.
  newMod.state.gameMarks = [{ id: 'gabc-0', type: 'lager', name: 'Erzlager', dimension: 'minecraft:overworld', x: 40, y: 70, z: -12, at: '2026-11-04T09:15:00Z', by: 'Philipp' }];
  await waiting.getByText('1 Markierung aus dem Spiel').waitFor({ timeout: 12_000 });
  await waiting.getByRole('button', { name: 'In den Weltplan übernehmen' }).click();
  await p.getByRole('status').filter({ hasText: 'stehen schon im Weltplan' }).waitFor();
  assert.equal((await names(p)).filter(n => n === 'Erzlager').length, 1);
  // One undo takes the adopted points out again.
  await p.getByRole('button', { name: 'Karte: Schritt zurück' }).click();
  await p.getByRole('status').filter({ hasText: 'Rückgängig gemacht: 2 Markierungen aus dem Spiel übernommen' }).waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});
