// Browser check of named groups and locks (Weltplan schema 3, MAP-04 / GAME-07-S11): group two sites, one click
// selects the group and a second only the entry, lock stops moving and deleting, hide a group, reload keeps it;
// with the mod simulator (feature `groups`) the marks carry group and lock and the hologram is limited to a group.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject } from './start.mjs';
import { startModSimulator } from './modSimulator.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4361, MOD = 47751, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
let server, browser, mod;

before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  mod = await startModSimulator(MOD, { protocol: 2, features: ['scan', 'marks2', 'players', 'bigplans', 'marks3', 'groups'] });
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.kill(); await mod?.close(); });

const ready = p => p.locator('.map-page[data-map-state=ready]').waitFor({ timeout: 20_000 });
async function at(canvas, x, z) {
  const box = await canvas.boundingBox();
  const scale = Number(await canvas.getAttribute('data-scale'));
  const [cx, cz] = (await canvas.getAttribute('data-center')).split(',').map(Number);
  return { x: box.x + box.width / 2 + (x + 0.5 - cx) * scale, y: box.y + box.height / 2 + (z + 0.5 - cz) * scale };
}
const selected = p => p.locator('.builder-selection b').first().innerText();

test('Gruppen und Sperren im Weltbuilder und bis zur Mod', async () => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await context.newPage();
  p.setDefaultTimeout(15_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });

  await p.goto(`${BASE}#/`);
  await openSampleProject(p);
  await p.waitForURL(/#\/projekt\//);
  await p.goto(`${BASE}#/karte`);
  await ready(p);
  await p.getByRole('button', { name: 'Platzieren' }).first().click();
  await p.getByRole('status').filter({ hasText: 'Auf die Weltkarte gesetzt' }).waitFor();
  await ready(p);
  const canvas = p.locator('.overview-canvas');
  await canvas.evaluate(el => el.scrollIntoView({ block: 'end' }));
  const tools = p.getByRole('group', { name: 'Planungswerkzeug' });
  const [cx, cz] = (await canvas.getAttribute('data-center')).split(',').map(Number);

  // Two sites south of the wall.
  for (const [k, x0] of [[1, cx - 10], [2, cx + 2]]) {
    await tools.getByRole('button', { name: 'Bauplatz' }).click();
    const a = await at(canvas, x0, cz + 8), b = await at(canvas, x0 + 5, cz + 11);
    await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.mouse.move(b.x, b.y, { steps: 6 }); await p.mouse.up();
    await p.locator('.plan-editor').getByRole('heading', { name: `Bauplatz: Bauplatz ${k}` }).waitFor();
  }
  // Both into a new group „Markt“ (list: select all shown).
  await p.locator('.builder-objects').getByRole('button', { name: 'Alle wählen' }).click();
  assert.match(await selected(p), /2 Einträge gewählt/);
  await p.getByLabel('Gruppe zuweisen').selectOption({ label: 'Neue Gruppe …' });
  await p.getByLabel('Neue Gruppe').fill('Markt');
  await p.getByLabel('Neue Gruppe').press('Enter');
  await p.getByRole('status').filter({ hasText: 'in Gruppe „Markt“' }).waitFor();
  assert.equal(await p.locator('.builder-objects .plan-layer-chip.group').count(), 2);

  // One click on a site selects the group, a second click only that site.
  await p.keyboard.press('Escape');
  const s1 = await at(canvas, cx - 8, cz + 9);
  await p.mouse.click(s1.x, s1.y);
  await p.waitForFunction(() => /2 Einträge gewählt/.test(document.querySelector('.builder-selection b')?.textContent ?? ''));
  await p.waitForTimeout(400);
  // The selection bar pushed the map down: measure again.
  const s1b = await at(canvas, cx - 8, cz + 9);
  await p.mouse.click(s1b.x, s1b.y);
  await p.locator('.plan-editor').getByRole('heading', { name: 'Bauplatz: Bauplatz 1' }).waitFor();

  // Lock the whole group from the group chip; Entf and arrows leave it alone.
  await p.getByRole('group', { name: 'Gruppen' }).getByRole('button', { name: 'Markt' }).click();
  assert.match(await selected(p), /2 Einträge gewählt/);
  await p.locator('.builder-selection').getByRole('button', { name: '🔒 Sperren' }).click();
  await p.getByRole('status').filter({ hasText: '2 Einträge gesperrt' }).waitFor();
  assert.equal(await p.locator('.builder-objects .plan-lock').count(), 2);
  await canvas.focus(); await p.keyboard.press('Delete');
  await p.getByRole('status').filter({ hasText: '2 gesperrte Einträge bleiben erhalten' }).waitFor();
  assert.equal(await p.locator('.builder-objects .plan-row').count(), 2);
  await canvas.focus(); await p.keyboard.press('ArrowRight');
  await p.getByRole('status').filter({ hasText: 'gesperrte Einträge bleiben stehen' }).waitFor();
  assert.ok(await p.getByRole('button', { name: 'Bauplatz „Bauplatz 1“ löschen' }).isDisabled(), 'Löschknopf der Liste gesperrt');
  // Undo of the lock works (only the lock changes).
  await p.keyboard.press('Control+z');
  await p.getByRole('status').filter({ hasText: 'Rückgängig gemacht' }).waitFor();
  assert.equal(await p.locator('.builder-objects .plan-lock').count(), 0);
  await p.keyboard.press('Control+y');
  await p.getByRole('status').filter({ hasText: 'Wiederholt' }).waitFor();
  assert.equal(await p.locator('.builder-objects .plan-lock').count(), 2);

  // Hiding the group hides both sites from map and list; showing brings them back.
  await p.getByRole('group', { name: 'Gruppen' }).getByLabel('Gruppe „Markt“ zeigen').uncheck();
  assert.equal(await p.locator('.builder-objects .plan-row').count(), 0);
  await p.getByRole('group', { name: 'Gruppen' }).getByLabel('Gruppe „Markt“ zeigen').check();
  assert.equal(await p.locator('.builder-objects .plan-row').count(), 2);

  // Reload keeps group and lock (schema 3 in IndexedDB).
  await p.reload();
  await ready(p);
  assert.equal(await p.locator('.builder-objects .plan-lock').count(), 2);
  assert.equal(await p.locator('.builder-objects .plan-layer-chip.group').count(), 2);

  // Mod with feature `groups`: marks carry group and lock, the hologram is limited to the group.
  const game = p.getByRole('region', { name: 'Spielverbindung' });
  await game.getByText('Port', { exact: true }).click();
  await game.getByLabel('Port der Mod').fill(String(MOD));
  await game.getByRole('button', { name: 'Verbinden' }).click();
  await game.getByText('Mod gefunden, nicht gekoppelt').waitFor();
  mod.openPairing();
  await game.getByLabel('Code').fill('482913');
  await game.getByRole('button', { name: 'Koppeln' }).click();
  await p.locator('.live-game[data-live-phase=connected]').waitFor();
  assert.match(await game.locator('.live-features').innerText(), /Gruppen und Sperren im Hologramm/);
  await game.getByRole('button', { name: 'Weltplan ins Spiel senden' }).click();
  await p.waitForFunction(() => true);
  for (let i = 0; i < 50 && mod.state.marks.length < 2; i++) await p.waitForTimeout(100);
  assert.deepEqual(mod.state.marks.map(m => [m.group, m.locked]), [['Markt', true], ['Markt', true]]);
  mod.state.hologram = { planFile: 'burgmauer.schem', name: 'Burgmauer', projectId: null, revisionNumber: 1,
    placement: { dimension: 'minecraft:overworld', x: cx, y: 64, z: cz, turns: 0, mirror: false }, visible: true,
    box: [cx, 64, cz, cx + 4, 70, cz + 4], counts: { ok: 10, state: 0, missing: 30, wrong: 0, unknown: 0 }, total: 40, section: 0, sections: [] };
  const groupsBox = game.getByRole('group', { name: 'Weltplan-Gruppen im Spiel' });
  await groupsBox.waitFor();
  assert.match(await groupsBox.innerText(), /20 Planblöcke in gesperrten Flächen/);
  await groupsBox.getByRole('button', { name: 'Markt' }).click();
  await p.getByRole('status').filter({ hasText: 'nur noch Gruppe „Markt“' }).waitFor();
  assert.equal(mod.state.hologram.group, 'Markt');
  await groupsBox.getByRole('button', { name: 'Markt', pressed: true }).waitFor();
  await groupsBox.getByRole('button', { name: 'Alle' }).click();
  await p.getByRole('status').filter({ hasText: 'wieder der ganze Plan' }).waitFor();
  assert.equal(mod.state.hologram.group, null);

  assert.deepEqual(errors, []);
  await context.close();
});
