// Browser check of the deeper workshop tools (EDIT-03): patterns, new shapes, stencils, keys, layer view.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4231, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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
const stats = p => p.locator('.editor-stats');


const cellCount = async p => Number((await stats(p).innerText()).match(/^([\d.]+) Zellen/)[1].replace('.', ''));
const waitCells = (p, n) => p.waitForFunction(n => document.querySelector('.editor-stats')?.textContent?.startsWith(`${n.toLocaleString('de-DE')} Zellen`), n);

test('Werkstatt vertieft: Muster-Pinsel, Bogen, Schablone mit Vorschau, Tastenkürzel, Schnitt und eigene Schablone', async () => {
  const p = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  p.setDefaultTimeout(15_000);
  const errors = watch(p);
  await p.goto(`${BASE}#/werkstatt/neu`);
  await p.getByRole('heading', { name: 'Neues Bauteil bauen' }).waitFor();

  // Mixed wall: preset „Alte Steinmauer“, 9×1 wall 4 high via the line tool with height (36 cells, three block types).
  await p.getByRole('radio', { name: /Linie/ }).click();
  await p.getByLabel('Mauerhöhe').fill('4');
  await p.getByLabel('Mustervorlage').selectOption('steinmauer-alt');
  assert.match(await p.locator('.brush-now').innerText(), /Muster: Mischung \(3\)/);
  await p.locator('.pattern-sample').waitFor();
  await dragCells(p, [-4, 0], [4, 0]);
  await waitCells(p, 36);
  await p.getByRole('button', { name: /Im Modell \(3\)/ }).waitFor();

  // Same pattern again on a fresh draft gives the same blocks (fixed seed): undo, redo keeps the mix.
  await p.keyboard.press('Control+z'); await waitCells(p, 0);
  await p.keyboard.press('Control+y'); await waitCells(p, 36);

  // Round arch over 7 blocks with 2-block posts in front of the wall (key O selects the tool).
  await p.keyboard.press('o');
  assert.equal(await p.getByRole('radio', { name: /Bogen/ }).getAttribute('aria-checked'), 'true');
  await p.getByLabel('Mustervorlage').selectOption('bruchstein');
  await p.getByLabel('Bogenhöhe').fill('4');
  await dragCells(p, [-3, 3], [3, 3]);
  await p.waitForFunction(() => Number(document.querySelector('.editor-stats')?.textContent?.match(/^(\d+) Zellen/)?.[1]) > 50);
  const afterArch = await cellCount(p);
  assert.match(await p.locator('.editor-message').innerText(), /Rundbogen · Mischung/);

  // Stencil „Tür mit Rahmen“: preview follows the pointer, R turns it, click places 12 cells.
  await p.getByRole('button', { name: 'Tür mit Rahmen' }).click();
  assert.equal(await p.getByRole('radio', { name: /Einfügen/ }).getAttribute('aria-checked'), 'true');
  const [dx, dz] = await cellPoint(p, 6, -5);
  await p.mouse.move(dx, dz);
  await p.locator('.grid-hud', { hasText: '3 × 4 × 1 · 12 Zellen' }).waitFor();
  await p.keyboard.press('r');
  await p.locator('.editor-message', { hasText: '1 × 4 × 3' }).waitFor();
  await p.mouse.click(dx, dz);
  await waitCells(p, afterArch + 12);

  // Keyboard selection work: Ctrl+A, copy, Delete empties, Ctrl+Z restores; the layer strip and 3D cut work.
  await p.keyboard.press('Control+a');
  await p.locator('[aria-label="Auswahl"] b').first().waitFor();
  await p.keyboard.press('Control+c');
  await p.locator('.editor-message', { hasText: 'Kopiert' }).waitFor();
  await p.keyboard.press('Delete'); await waitCells(p, 0);
  await p.keyboard.press('Control+z'); await waitCells(p, afterArch + 12);
  await p.getByRole('button', { name: 'Ebene 2', exact: true }).click();
  assert.equal(await p.getByLabel('Ebene Y', { exact: true }).inputValue(), '2');
  await p.keyboard.press('g');
  assert.equal(await p.getByLabel(/3D bis Ebene/).isChecked(), true);
  await p.keyboard.press('?');
  await p.getByRole('region', { name: 'Tastenkürzel' }).waitFor();
  await p.keyboard.press('Escape');
  await p.getByRole('region', { name: 'Tastenkürzel' }).waitFor({ state: 'detached' });

  // Own stencil: select the door area and save it; it shows up under „Meine Schablonen“ and loads into the clipboard.
  await p.keyboard.press('Control+a');
  await p.getByLabel('Name der Schablone').fill('Testtor');
  await p.getByRole('button', { name: 'Auswahl speichern' }).click();
  await p.locator('.editor-message', { hasText: 'Schablone „Testtor“ gespeichert' }).waitFor();
  await p.getByRole('group', { name: 'Meine Schablonen' }).getByRole('button', { name: 'Testtor' }).click();
  await p.locator('.editor-message', { hasText: '„Testtor“ v1.0 in der Zwischenablage' }).waitFor();

  // Replace with a pattern: weathering only touches part of the stone bricks.
  await p.keyboard.press('b');
  await p.getByLabel('Mustervorlage').selectOption('verwittern');
  await p.getByLabel('Zu ersetzender Block').selectOption('minecraft:stone_bricks');
  const replaceButton = p.getByRole('button', { name: /Zellen mit Muster ersetzen/ });
  const hits = Number((await replaceButton.innerText()).match(/^(\d+)/)[1]);
  assert.ok(hits > 5, `${hits} Steinziegel`);
  await replaceButton.click();
  const done = Number((await p.locator('.editor-message').innerText()).match(/(\d+) Zellen/)?.[1] ?? 0);
  assert.ok(done > 0 && done < hits, `${done} von ${hits} verwittert`);
  await waitCells(p, afterArch + 12);
  assert.deepEqual(errors, []);
  await p.close();
});

test('Werkstatt-Werkzeuge auf dem Handy (390 px): Musterfeld und Schablonen ohne waagrechtes Scrollen', async () => {
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const errors = watch(p);
  await p.goto(`${BASE}#/werkstatt/neu`);
  await p.getByRole('heading', { name: 'Neues Bauteil bauen' }).waitFor();
  await p.getByRole('radio', { name: /Mischung/ }).click();
  await p.getByRole('button', { name: '+ Pinsel' }).click();
  await p.getByRole('button', { name: /Tasten/ }).click();
  await p.getByRole('region', { name: 'Tastenkürzel' }).waitFor();
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'kein waagrechtes Scrollen');
  assert.deepEqual(errors, []);
  await p.close();
});
