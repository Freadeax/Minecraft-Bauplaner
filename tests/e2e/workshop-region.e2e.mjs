// Browser check of the selection and form tools (EDIT-05): magic select, stack, extrude, move a cell selection,
// ellipsoid, torus and helix. Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { blockValue, ellipsoidEdit, torusEdit, helixEdit } from '../../dist/domain/src/index.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4293, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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
/** Canvas geometry read in one go once it has settled (see workshop-creative.e2e.mjs). */
async function gridGeometry(p) {
  const canvas = p.locator('.layer-grid canvas');
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
async function cellPoint(p, dx, dz) {
  const g = await gridGeometry(p), [cx, cz] = g.centre;
  const x = Math.floor(cx) + dx, z = Math.floor(cz) + dz;
  return [g.x + g.width / 2 + (x + 0.5 - cx) * g.size, g.y + g.height / 2 + (z + 0.5 - cz) * g.size];
}
async function dragCells(p, a, b) {
  const [x0, y0] = await cellPoint(p, ...a), [x1, y1] = await cellPoint(p, ...b);
  await p.mouse.move(x0, y0); await p.mouse.down(); await p.mouse.move(x1, y1, { steps: 6 }); await p.mouse.up();
}
async function waitCells(p, n) {
  try { await p.waitForFunction(n => document.querySelector('.editor-stats')?.textContent?.startsWith(`${n.toLocaleString('de-DE')} Zellen`), n); }
  catch (e) { throw new Error(`${n} Zellen erwartet; Stand: ${await p.locator('.editor-stats').innerText()} · Meldung: ${await p.locator('.editor-message').innerText().catch(() => '–')}`); }
}
const STONE = blockValue({ id: 'minecraft:stone', properties: {} });

test('Auswahl- und Formwerkzeuge: Zauberauswahl, Stapeln, Extrudieren, Verschieben, Ellipsoid, Torus, Wendel', async () => {
  const p = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  p.setDefaultTimeout(15_000);
  const errors = watch(p);
  await p.goto(`${BASE}#/werkstatt/neu`);
  await p.getByRole('heading', { name: 'Neues Bauteil bauen' }).waitFor();

  // A 4×4 stone floor and a loose block two cells away.
  await p.getByRole('radio', { name: /Quader/ }).click();
  await dragCells(p, [-2, 0], [1, 3]);
  await waitCells(p, 16);
  await p.getByRole('radio', { name: /Setzen/ }).click();
  const [lx, lz] = await cellPoint(p, 4, 0);
  await p.mouse.click(lx, lz);
  await waitCells(p, 17);

  // Magic select (W): the connected floor only, not the loose block.
  await p.keyboard.press('w');
  assert.equal(await p.getByRole('radio', { name: /Zauberstab/ }).getAttribute('aria-checked'), 'true');
  const [fx, fz] = await cellPoint(p, 0, 1);
  await p.mouse.move(fx, fz);
  await p.mouse.click(fx, fz);
  await p.locator('[data-testid="mask-size"]', { hasText: '16' }).waitFor();
  assert.match(await p.locator('.editor-message').innerText(), /Zauberauswahl \(Gleicher Block\): 16 Zellen/);
  // Shift+click adds the loose block, Alt+click removes it again.
  await p.keyboard.down('Shift'); await p.mouse.click(lx, lz); await p.keyboard.up('Shift');
  await p.locator('[data-testid="mask-size"]', { hasText: '17' }).waitFor();
  await p.keyboard.down('Alt'); await p.mouse.click(lx, lz); await p.keyboard.up('Alt');
  await p.locator('[data-testid="mask-size"]', { hasText: '16' }).waitFor();

  // Stack the floor three times upwards: 16 × 3 new cells; one undo step.
  const sel = p.getByRole('region', { name: 'Auswahl' });
  await sel.getByLabel('Stapelrichtung').selectOption('up');
  await sel.getByLabel('Anzahl der Kopien').fill('3');
  await sel.getByTestId('stack').click();
  await waitCells(p, 17 + 48);
  await p.keyboard.press('Control+z');
  await waitCells(p, 17);

  // Extrude the top face of the floor 2 up: the cell selection grows with it.
  await sel.getByLabel('Seite zum Extrudieren').selectOption('up');
  await sel.getByLabel('Weite in Blöcken').fill('2');
  await sel.getByTestId('extrude-out').click();
  await waitCells(p, 17 + 32);
  await p.locator('[data-testid="mask-size"]', { hasText: '48' }).waitFor();
  // Push one layer back in from the top.
  await sel.getByLabel('Weite in Blöcken').fill('1');
  await sel.getByTestId('extrude-in').click();
  await waitCells(p, 17 + 16);

  // Box tools act only on the cell selection: "Leeren" removes the 32 selected cells, the loose block stays.
  await p.keyboard.press('Control+z'); await waitCells(p, 17 + 32);
  await sel.getByRole('button', { name: 'Leeren' }).click();
  await waitCells(p, 1);
  await p.keyboard.press('Control+z'); await waitCells(p, 17 + 32);
  // Moving the cell selection keeps every cell (arrow key east).
  await p.locator('.layer-grid canvas').hover();
  await p.keyboard.press('ArrowRight');
  await p.locator('.editor-message', { hasText: 'Auswahl verschieben' }).waitFor();
  await waitCells(p, 17 + 32);
  await p.keyboard.press('Escape');

  // Ellipsoid (J): footprint 6×4, height 3.
  let total = 17 + 32;
  await p.keyboard.press('j');
  await p.getByLabel('Höhe ab Ebene').fill('3');
  await dragCells(p, [-3, 6], [2, 9]);
  total += ellipsoidEdit({ a: [0, 0, 0], b: [5, 2, 3] }, STONE).changes.length;
  await waitCells(p, total);
  assert.match(await p.locator('.editor-message').innerText(), /Ellipsoid/);

  // Torus (T): ring radius 3, tube radius 1, lying.
  // The height field still has the focus (keys there stay in the field), so the tool is picked by click.
  await p.getByRole('radio', { name: /Torus/ }).click();
  await dragCells(p, [-5, -5], [-2, -5]);
  total += torusEdit([0, 0, 0], 3, 1, STONE).changes.length;
  await waitCells(p, total);

  // Helix (H): radius 3, default height 16, width 2, pitch 12.
  await p.locator('.layer-grid canvas').hover();
  await p.keyboard.press('h');
  assert.equal(await p.getByRole('radio', { name: /Wendel/ }).getAttribute('aria-checked'), 'true');
  await dragCells(p, [5, -6], [8, -6]);
  total += helixEdit([0, 0, 0], 3, STONE, { width: 2, pitch: 12, height: 16, clockwise: true, thickness: 1 }).changes.length;
  await waitCells(p, total);
  assert.match(await p.locator('.editor-message').innerText(), /Wendel/);
  assert.deepEqual(errors, []);
  await p.close();
});

test('Auswahl- und Formwerkzeuge auf dem Handy (390 px): ohne waagrechtes Scrollen', async () => {
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const errors = watch(p);
  await p.goto(`${BASE}#/werkstatt/neu`);
  await p.getByRole('heading', { name: 'Neues Bauteil bauen' }).waitFor();
  await p.getByRole('radio', { name: /Wendel/ }).click();
  await p.getByLabel('Wendelhöhe').waitFor();
  await p.getByRole('radio', { name: /Zauberstab/ }).click();
  await p.getByLabel('Zauberauswahl wählt').waitFor();
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'kein waagrechtes Scrollen');
  assert.deepEqual(errors, []);
  await p.close();
});
