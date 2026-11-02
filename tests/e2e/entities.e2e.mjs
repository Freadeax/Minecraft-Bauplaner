// Browser check of ENTITY-01: put up a painting, an item frame and an armor stand in the Werkstatt, save,
// then see them in 3D, in the layer plan and in the „Ausstattung und Inhalte“ summary of the building page.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4273, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

function watch(p) {
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  return errors;
}
/**
 * Geometry of the layer canvas, read in one go once it has settled: the grid measures itself with a
 * ResizeObserver (late panels, scrollbars, „Modell einpassen“) and re-renders a frame later. Reading the
 * box and the cell size in separate steps while that happens aimed drags at the wrong cells.
 */
async function gridGeometry(p) {
  const canvas = p.locator('.layer-grid canvas');
  // Long side panels (symmetry, nature, colours) can scroll the grid out of view after a form input.
  await canvas.evaluate(c => { const b = c.getBoundingClientRect(); if (b.top < 0 || b.bottom > window.innerHeight) c.scrollIntoView({ block: 'center' }); });
  let last = '';
  for (let i = 0; i < 50; i++) {
    const g = await canvas.evaluate(c => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(() => {
      const b = c.getBoundingClientRect();
      done({ x: b.x, y: b.y, width: b.width, height: b.height, size: Number(c.dataset.cellSize), centre: c.dataset.centre });
    }))));
    const key = JSON.stringify(g);
    if (key === last) return { ...g, centre: g.centre.split(',').map(Number) };
    last = key;
  }
  throw new Error('Ebenenraster kommt nicht zur Ruhe');
}
/** Screen point of a grid cell relative to the canvas centre. */
async function cellPoint(p, dx, dz) {
  const g = await gridGeometry(p), [cx, cz] = g.centre;
  const x = Math.floor(cx) + dx, z = Math.floor(cz) + dz;
  return [g.x + g.width / 2 + (x + 0.5 - cx) * g.size, g.y + g.height / 2 + (z + 0.5 - cz) * g.size];
}
async function dragCells(p, a, b) {
  const [x0, y0] = await cellPoint(p, ...a), [x1, y1] = await cellPoint(p, ...b);
  await p.mouse.move(x0, y0); await p.mouse.down(); await p.mouse.move(x1, y1, { steps: 6 }); await p.mouse.up();
}

const waitCells = (p, n) => p.waitForFunction(n => document.querySelector('.editor-stats')?.textContent?.startsWith(`${n.toLocaleString('de-DE')} Zellen`), n);

test('Werkstatt: Gemälde, Rahmen und Rüstungsständer platzieren, speichern und überall sehen', async () => {
  const p = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  p.setDefaultTimeout(20_000);
  const errors = watch(p);
  await p.goto(`${BASE}#/werkstatt/neu`);
  await p.getByRole('heading', { name: 'Neues Bauteil bauen' }).waitFor();

  // A wall 5 wide and 3 high along X (line tool with height).
  await p.getByRole('radio', { name: /Linie/ }).click();
  await p.getByLabel('Mauerhöhe').fill('3');
  await dragCells(p, [-2, 0], [2, 0]);
  await waitCells(p, 15);

  // Pick the middle block of the wall (tool „Prüfen“), then hang a painting on its south face.
  await p.keyboard.press('p');
  const [x, y] = await cellPoint(p, 0, 0);
  await p.mouse.click(x, y);
  const panel = p.getByTestId('entity-panel');
  await panel.getByRole('button', { name: /^Anbringen an/ }).waitFor();
  await panel.getByLabel('Motiv').selectOption('kebab');
  await panel.getByTestId('entity-place').click();
  await p.locator('.editor-message', { hasText: 'Gemälde an' }).waitFor();
  // An item frame with a sword on the north face, and an armor stand on top of the wall.
  await panel.getByRole('button', { name: 'Rahmen', exact: true }).click();
  await panel.getByLabel('Richtung').selectOption('north');
  await panel.getByTestId('entity-place').click();
  await p.locator('.editor-message', { hasText: 'Rahmen an' }).waitFor();
  await panel.getByRole('button', { name: 'Rüstungsständer', exact: true }).click();
  await panel.getByTestId('entity-place').click();
  await p.locator('.editor-message', { hasText: 'Rüstungsständer auf' }).waitFor();
  assert.equal(await panel.locator('.entity-list li').count(), 3);
  await p.locator('.editor-stats', { hasText: 'Ausstattung geändert' }).waitFor();
  // Undo removes the stand, redo brings it back.
  await p.keyboard.press('Control+z');
  await p.waitForFunction(() => document.querySelectorAll('[data-testid=entity-panel] .entity-list li').length === 2);
  await p.keyboard.press('Control+y');
  await p.waitForFunction(() => document.querySelectorAll('[data-testid=entity-panel] .entity-list li').length === 3);

  // The 3D preview draws the three entities.
  const show3d = p.getByLabel('3D-Vorschau');
  if (!(await show3d.isChecked())) await show3d.check();
  await p.locator('.editor-3d .canvas-host[data-entities="3"]').waitFor();
  assert.equal(await p.locator('.editor-3d .canvas-host').getAttribute('data-blocks'), '15');

  // Save as a new building and open its page.
  await p.getByLabel('Name des neuen Bauteils').fill('Galerie');
  await p.getByRole('button', { name: 'Bauteil speichern' }).click();
  await p.getByRole('link', { name: 'Zum Steckbrief' }).click();
  const summary = p.getByTestId('furnishing-summary');
  await summary.waitFor();
  assert.match(await summary.innerText(), /1 Gemälde · 1 Rahmen · 1 Rüstungsständer/);
  await summary.locator('summary').click();
  assert.equal(await summary.getByTestId('entity-card').count(), 3);
  assert.match(await summary.innerText(), /diamond sword/);
  // Layer plan lists the painting and the frame on the wall's lowest layer.
  await p.getByRole('tab', { name: 'Ebenen' }).click();
  const legend = p.getByTestId('layer-furnish');
  await legend.waitFor();
  assert.match(await legend.innerText(), /Gemälde kebab/);
  assert.match(await legend.innerText(), /Rahmen mit diamond sword/);
  assert.deepEqual(errors, []);
  await p.close();
});
