// Browser check of the Weltbuilder (MAP-04) on the world map: deleting with Entf, context menu, list and
// selection bar, multi-select with a frame, duplicate, rotate, path corners, layers, one undo for everything.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4291, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

const ready = p => p.locator('.map-page[data-map-state=ready]').waitFor({ timeout: 20_000 });
/** Canvas pixel position of a world column, from the map's own centre/scale. */
async function at(canvas, x, z) {
  const box = await canvas.boundingBox();
  const scale = Number(await canvas.getAttribute('data-scale'));
  const [cx, cz] = (await canvas.getAttribute('data-center')).split(',').map(Number);
  return { x: box.x + box.width / 2 + (x + 0.5 - cx) * scale, y: box.y + box.height / 2 + (z + 0.5 - cz) * scale };
}
const names = async p => (await p.locator('.builder-objects .plan-row b').allInnerTexts()).map(t => t.trim());

test('Weltbuilder: löschen (Entf, Menü, Liste), Rahmen, duplizieren, drehen, Wegecken, Ebenen, ein Rückgängig', async () => {
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
  const tools = p.getByRole('group', { name: 'Planungswerkzeug' });
  await canvas.scrollIntoViewIfNeeded();
  const [cx, cz] = (await canvas.getAttribute('data-center')).split(',').map(Number);

  // Draw: a site south of the wall, two points and a path.
  await tools.getByRole('button', { name: 'Bauplatz' }).click();
  const a = await at(canvas, cx - 8, cz + 8), b = await at(canvas, cx - 3, cz + 11);
  await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.mouse.move(b.x, b.y, { steps: 6 }); await p.mouse.up();
  await p.locator('.plan-editor').getByRole('heading', { name: 'Bauplatz: Bauplatz 1' }).waitFor();
  for (const [x, z] of [[cx + 4, cz + 9], [cx + 8, cz + 9]]) {
    await canvas.focus(); await p.keyboard.press('p');
    const q = await at(canvas, x, z); await p.mouse.click(q.x, q.y);
    await p.waitForTimeout(400);
  }
  await canvas.focus(); await p.keyboard.press('w');
  for (const [x, z] of [[cx - 8, cz + 14], [cx + 2, cz + 14], [cx + 2, cz + 18]]) { const q = await at(canvas, x, z); await p.mouse.click(q.x, q.y); await p.waitForTimeout(400); }
  await canvas.press('Enter');
  await p.locator('.plan-editor').getByRole('heading', { name: 'Weg: Weg 1' }).waitFor();
  assert.deepEqual(await names(p), ['Bauplatz 1', 'Punkt 1', 'Punkt 2', 'Weg 1']);

  // 1) Entf deletes the selected point; Strg+Z brings it back at its place in the list.
  const p2 = await at(canvas, cx + 8, cz + 9);
  await p.mouse.click(p2.x, p2.y);
  await p.locator('.plan-editor').getByRole('heading', { name: /Punkt 2/ }).waitFor();
  await canvas.focus(); await p.keyboard.press('Delete');
  await p.getByRole('status').filter({ hasText: '„Punkt 2“ gelöscht' }).waitFor();
  assert.deepEqual(await names(p), ['Bauplatz 1', 'Punkt 1', 'Weg 1']);
  await p.keyboard.press('Control+z');
  await p.getByRole('status').filter({ hasText: 'Rückgängig gemacht' }).waitFor();
  assert.deepEqual(await names(p), ['Bauplatz 1', 'Punkt 1', 'Punkt 2', 'Weg 1']);
  await p.keyboard.press('Control+y');
  await p.getByRole('status').filter({ hasText: 'Wiederholt' }).waitFor();
  assert.deepEqual(await names(p), ['Bauplatz 1', 'Punkt 1', 'Weg 1']);

  // 2) Right click opens the context menu; „Löschen“ removes the point.
  const p1 = await at(canvas, cx + 4, cz + 9);
  await p.mouse.click(p1.x, p1.y, { button: 'right' });
  const menu = p.getByRole('menu');
  await menu.waitFor();
  assert.match(await menu.innerText(), /Punkt 1/);
  await menu.getByRole('menuitem', { name: /Löschen/ }).click();
  await p.getByRole('status').filter({ hasText: '„Punkt 1“ gelöscht' }).waitFor();
  assert.equal(await menu.count(), 0);
  assert.deepEqual(await names(p), ['Bauplatz 1', 'Weg 1']);
  // Right click on empty ground offers drawing there.
  const empty = await at(canvas, cx + 17, cz - 16);
  await p.mouse.click(empty.x, empty.y, { button: 'right' });
  await menu.getByRole('menuitem', { name: 'Punkt hier setzen' }).click();
  await p.locator('.plan-editor').getByRole('heading', { name: /Punkt 1/ }).waitFor();
  await p.keyboard.press('Escape');
  assert.equal(await p.locator('.plan-editor').count(), 0, 'Escape hebt die Auswahl auf');

  // 3) Delete button in the object list (per row).
  await p.getByRole('button', { name: 'Punkt „Punkt 1“ löschen' }).click();
  await p.getByRole('status').filter({ hasText: '„Punkt 1“ gelöscht' }).waitFor();
  assert.deepEqual(await names(p), ['Bauplatz 1', 'Weg 1']);

  // 4) Frame selection with the „Rahmen“ tool: site, path and the wall project.
  await tools.getByRole('button', { name: 'Rahmen' }).click();
  const f0 = await at(canvas, cx - 15, cz - 6), f1 = await at(canvas, cx + 15, cz + 20);
  await p.mouse.move(f0.x, f0.y); await p.mouse.down(); await p.mouse.move(f1.x, f1.y, { steps: 8 }); await p.mouse.up();
  const bar = p.getByRole('toolbar', { name: 'Auswahl' });
  await bar.getByText('2 Einträge und 1 Projekt gewählt').waitFor();
  assert.equal(await canvas.getAttribute('data-selected'), '3');

  // Moving the whole selection with the arrow keys is one undo step for entries and project together.
  const origin = () => p.locator('.map-entry-main small').first().innerText();
  const before = await origin();
  await canvas.focus(); await p.keyboard.press('Shift+ArrowRight');
  await p.getByRole('status').filter({ hasText: '3 Objekte um 16 / 0 verschoben' }).waitFor();
  await ready(p);
  assert.notEqual(await origin(), before);
  await p.getByRole('button', { name: 'Karte: Schritt zurück' }).click();
  await p.getByRole('status').filter({ hasText: 'Rückgängig gemacht' }).waitFor();
  await ready(p);
  assert.equal(await origin(), before);

  // 5) Delete everything selected: entries are deleted, the project is only taken off the map.
  await bar.getByRole('button', { name: /Löschen \/ von der Karte nehmen/ }).click();
  await p.getByRole('status').filter({ hasText: /2 Einträge gelöscht, „Burgmauer \(Beispiel\)“ von der Karte genommen/ }).waitFor();
  await ready(p);
  await p.locator('.map-unplaced li').first().waitFor();
  assert.equal(await p.locator('.map-entry').count(), 0);
  // One click on „Rückgängig“ brings back all three.
  await p.getByRole('status').getByRole('button', { name: 'Rückgängig' }).click();
  await ready(p);
  await p.locator('.map-entry').first().waitFor();
  assert.deepEqual(await names(p), ['Bauplatz 1', 'Weg 1']);
  await p.keyboard.press('Escape');

  // 6) Project row: take it off the map from the list.
  await p.getByRole('button', { name: '„Burgmauer (Beispiel)“ von der Karte nehmen' }).click();
  await p.getByRole('status').filter({ hasText: 'von der Karte genommen' }).waitFor();
  await ready(p);
  await p.locator('.map-unplaced li').first().waitFor();
  await p.keyboard.press('Control+z');
  await ready(p);
  await p.locator('.map-entry').first().waitFor();

  // 7) Duplicate (Strg+D) and rotate (R) the site.
  await p.locator('.builder-objects .plan-row', { hasText: 'Bauplatz 1' }).click();
  const editor = p.locator('.plan-editor');
  assert.match(await editor.innerText(), /6 × 4 = 24 Blöcke/);
  await canvas.focus(); await p.keyboard.press('Control+d');
  await p.getByRole('status').filter({ hasText: '„Bauplatz 1 (Kopie)“ östlich daneben angelegt' }).waitFor();
  assert.deepEqual(await names(p), ['Bauplatz 1', 'Weg 1', 'Bauplatz 1 (Kopie)']);
  await editor.getByRole('heading', { name: 'Bauplatz: Bauplatz 1 (Kopie)' }).waitFor();
  await p.keyboard.press('r');
  await p.getByRole('status').filter({ hasText: /Gedreht/ }).waitFor();
  assert.match(await editor.innerText(), /4 × 6 = 24 Blöcke/);

  // 8) Path corners: drag the first midpoint to insert a corner, right click a corner to delete it.
  await p.locator('.builder-objects .plan-row', { hasText: 'Weg 1' }).click();
  await editor.getByRole('heading', { name: 'Weg: Weg 1' }).waitFor();
  assert.match(await editor.innerText(), /3 Ecken/);
  const mid = await at(canvas, cx - 3, cz + 14), to = await at(canvas, cx - 3, cz + 10);
  await p.mouse.move(mid.x, mid.y); await p.mouse.down(); await p.mouse.move(to.x, to.y, { steps: 6 }); await p.mouse.up();
  await p.getByRole('status').filter({ hasText: 'Wegecke eingefügt' }).waitFor();
  assert.match(await editor.innerText(), /4 Ecken/);
  const corner = await at(canvas, cx - 3, cz + 10);
  await p.mouse.click(corner.x, corner.y, { button: 'right' });
  await menu.getByRole('menuitem', { name: 'Wegecke löschen' }).click();
  await p.getByRole('status').filter({ hasText: 'Wegecke gelöscht' }).waitFor();
  assert.match(await editor.innerText(), /3 Ecken/);

  // 9) Layers: hiding paths hides them in the list and on the map; drawing a path shows the layer again.
  await p.getByRole('group', { name: 'Ebenen' }).getByLabel(/Wege/).uncheck();
  assert.deepEqual(await names(p), ['Bauplatz 1', 'Bauplatz 1 (Kopie)']);
  await p.getByText('1 Einträge in ausgeblendeten Ebenen.').waitFor();
  await p.getByRole('group', { name: 'Ebenen' }).getByLabel(/Wege/).check();

  // 10) Strg+A and Entf clear the whole plan of this dimension; one undo restores it; reload keeps the result.
  await canvas.focus(); await p.keyboard.press('Control+a');
  await bar.getByText('3 Einträge und 1 Projekt gewählt').waitFor();
  await p.keyboard.press('Delete');
  await ready(p);
  await p.getByText(/Noch kein Weltplan in dieser Dimension/).waitFor();
  await p.keyboard.press('Control+z');
  await ready(p);
  // The list renders a frame after the undo; wait for it before reading.
  await p.locator('.builder-objects .plan-row b').nth(2).waitFor();
  assert.deepEqual(await names(p), ['Bauplatz 1', 'Weg 1', 'Bauplatz 1 (Kopie)']);
  await p.reload(); await ready(p);
  assert.deepEqual(await names(p), ['Bauplatz 1', 'Weg 1', 'Bauplatz 1 (Kopie)']);
  assert.equal(await p.locator('.map-entry').count(), 1);

  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'kein waagerechtes Scrollen');
  assert.deepEqual(errors, []);
  await context.close();
});

test('Weltbuilder am Handy: Auswahlleiste und Löschen erreichbar, kein waagerechtes Scrollen', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await context.newPage();
  p.setDefaultTimeout(15_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(`${BASE}#/karte`);
  await ready(p);
  const canvas = p.locator('.overview-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const [cx, cz] = (await canvas.getAttribute('data-center')).split(',').map(Number);
  await p.getByRole('group', { name: 'Planungswerkzeug' }).getByRole('button', { name: 'Punkt' }).click();
  const q = await at(canvas, cx + 2, cz + 2);
  await p.touchscreen.tap(q.x, q.y);
  const bar = p.getByRole('toolbar', { name: 'Auswahl' });
  await bar.getByText('1 Eintrag gewählt').waitFor();
  assert.ok(await bar.getByRole('button', { name: /Löschen/ }).isVisible());
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'kein waagerechtes Scrollen');
  await bar.getByRole('button', { name: /Löschen/ }).tap();
  await p.getByText(/Noch kein Weltplan in dieser Dimension/).waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});
