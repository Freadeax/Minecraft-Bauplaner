// Browser check of building directly in the 3D view (EDIT-06): place on a face, remove, drag a shape on a top
// face and a wall on a side face, select a group in 3D and drag it, edit chest and sign contents.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4341, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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
/** Canvas geometry of the layer grid once it has settled. */
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
const cells = p => p.locator('.editor-stats').evaluate(e => Number(e.textContent.split(' Zellen')[0].replace(/\./g, '')));
const waitCells = (p, n) => p.waitForFunction(n => document.querySelector('.editor-stats')?.textContent?.startsWith(`${n.toLocaleString('de-DE')} Zellen`), n);
const host = p => p.locator('.editor-3d .canvas-host');
/** Waits until the 3D view shows `blocks` blocks and is idle, then returns the canvas box. */
async function scene(p, blocks) {
  await p.locator(`.editor-3d .canvas-host[data-blocks="${blocks}"][data-mesh="ready"]`).waitFor();
  await p.waitForTimeout(150); // camera damping
  return await host(p).locator('canvas').boundingBox();
}
async function view(p, title, blocks) {
  await p.locator('.editor-3d').getByRole('button', { name: title, exact: true }).click();
  return await scene(p, blocks);
}
const modelY = async p => (await p.locator('.layer-bar').innerText()).match(/Modell Y (-?\d+) … (-?\d+)/).slice(1).map(Number);

test('Werkstatt: im 3D-Bild setzen, abbauen, Formen und Wände aufziehen, Gruppe verschieben', async () => {
  const p = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  p.setDefaultTimeout(20_000);
  const errors = watch(p);
  await p.goto(`${BASE}#/werkstatt/neu`);
  await p.getByRole('heading', { name: 'Neues Bauteil bauen' }).waitFor();
  assert.equal(await p.getByTestId('build3d').isChecked(), true, 'Im 3D bauen ist voreingestellt');

  // One stone block from the layer grid, then build on it in 3D.
  const [gx, gy] = await cellPoint(p, 0, 0);
  await p.mouse.click(gx, gy);
  await waitCells(p, 1);
  let box = await view(p, 'Draufsicht (Norden oben)', 1);
  assert.equal(await host(p).getAttribute('data-build'), 'on');
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

  // Hover shows the cell in front of the face; a click places the brush on top.
  await p.mouse.move(cx, cy);
  await p.waitForFunction(() => document.querySelector('.editor-3d .canvas-host')?.dataset.preview === '1');
  await p.mouse.click(cx, cy);
  await waitCells(p, 2);
  assert.deepEqual(await modelY(p), [0, 1]);
  assert.match(await p.getByRole('region', { name: 'Gewählter Block' }).innerText(), /X 0 · Y 1 · Z 0/);
  box = await scene(p, 2);

  // „Abbauen“: a click removes the top block again.
  await p.getByRole('radio', { name: /Abbauen/ }).click();
  await p.mouse.click(cx, cy);
  await waitCells(p, 1);

  // Quader on the top face: drag spans a floor in the layer above (height 1).
  await p.getByRole('radio', { name: /Quader/ }).click();
  box = await scene(p, 1);
  await p.mouse.move(cx, cy); await p.mouse.down();
  await p.mouse.move(cx + box.width * 0.42, cy + box.height * 0.42, { steps: 8 });
  await p.waitForFunction(() => Number(document.querySelector('.editor-3d .canvas-host')?.dataset.preview) >= 4);
  await p.mouse.up();
  await p.waitForFunction(() => !document.querySelector('.editor-stats')?.textContent?.startsWith('1 Zellen'));
  const floor = await cells(p) - 1;
  assert.ok(floor >= 4, `Boden aus mehreren Zellen (${floor})`);
  assert.deepEqual(await modelY(p), [0, 1], 'Boden liegt eine Ebene über dem Block');

  // Side face from the south: the drag becomes a wall (spans Y).
  const before = await cells(p);
  box = await view(p, 'Ansicht von Süden', before);
  const sx = box.x + box.width / 2, sy = box.y + box.height / 2;
  await p.mouse.move(sx, sy); await p.mouse.down();
  await p.mouse.move(sx + box.width * 0.1, sy - box.height * 0.4, { steps: 8 });
  await p.mouse.up();
  await p.waitForFunction(n => !document.querySelector('.editor-stats')?.textContent?.startsWith(`${n.toLocaleString('de-DE')} Zellen`), before);
  const [, top] = await modelY(p);
  assert.ok(top >= 2, `Wand reicht nach oben (bis Y ${top})`);

  // Shift+drag on the top selects a group in 3D; the selection tool then drags it east.
  const total = await cells(p);
  box = await view(p, 'Draufsicht (Norden oben)', total);
  const tx = box.x + box.width / 2, ty = box.y + box.height / 2;
  await p.getByRole('radio', { name: /Auswahl/ }).click();
  const d = box.width * 0.12;
  await p.mouse.move(tx - d, ty - d); await p.mouse.down();
  await p.mouse.move(tx + d, ty + d, { steps: 6 });
  await p.waitForFunction(() => (document.querySelector('.editor-3d .canvas-host')?.dataset.ghost ?? '').endsWith('|snap'));
  await p.mouse.up();
  const selection = p.getByRole('region', { name: 'Auswahl' });
  await selection.getByRole('button', { name: /Auswahl aufheben/ }).waitFor();
  const range = async () => (await selection.innerText()).match(/X (-?\d+)…(-?\d+)/).slice(1).map(Number);
  const [x0] = await range();
  await scene(p, total);
  await p.mouse.move(tx, ty); await p.mouse.down();
  await p.mouse.move(tx + box.width * 0.3, ty, { steps: 8 });
  await p.waitForFunction(() => document.querySelector('.editor-3d .canvas-host')?.dataset.dragging === 'true');
  await p.mouse.up();
  await p.waitForFunction(x0 => { const m = document.querySelector('[aria-label="Auswahl"]')?.textContent?.match(/X (-?\d+)…/); return m && Number(m[1]) > x0; }, x0);
  assert.equal(await cells(p), total, 'Verschieben ändert die Zahl der Zellen nicht');

  // Undo brings the group back.
  await p.getByRole('button', { name: /Rückgängig/ }).click();
  await p.waitForFunction(() => document.querySelector('.editor-stats')?.dataset.changes !== undefined);

  // With „Im 3D bauen“ off, a drag on blocks orbits again and changes nothing.
  await p.getByTestId('build3d').uncheck();
  assert.equal(await host(p).getAttribute('data-build'), 'off');
  const n = await cells(p), cam = await host(p).getAttribute('data-camera');
  await p.getByRole('radio', { name: /Setzen/ }).click();
  const ob = await host(p).locator('canvas').boundingBox(), ox = ob.x + ob.width / 2, oy = ob.y + ob.height / 2;
  await p.mouse.move(ox, oy); await p.mouse.down(); await p.mouse.move(ox + 80, oy - 80, { steps: 6 }); await p.mouse.up();
  await p.waitForFunction(c => document.querySelector('.editor-3d .canvas-host')?.dataset.camera !== c, cam);
  assert.equal(await cells(p), n);
  await p.getByTestId('build3d').check();
  assert.deepEqual(errors, []);
  await p.close();
});

test('Werkstatt: Truhen- und Schildinhalt bearbeiten, rückgängig machen und speichern', async () => {
  const p = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  p.setDefaultTimeout(20_000);
  const errors = watch(p);
  await p.goto(`${BASE}#/werkstatt/neu`);
  await p.getByRole('heading', { name: 'Neues Bauteil bauen' }).waitFor();

  // A chest and a sign side by side from the layer grid.
  await p.getByLabel('Blöcke suchen').fill('chest');
  await p.locator('.block-tile', { hasText: /chest$/ }).first().click();
  const [ax, ay] = await cellPoint(p, 0, 0);
  await p.mouse.click(ax, ay);
  await waitCells(p, 1);
  await p.getByLabel('Blöcke suchen').fill('oak_sign');
  await p.locator('.block-tile', { hasText: 'oak_sign' }).first().click();
  const [bx, by] = await cellPoint(p, 2, 0);
  await p.mouse.click(bx, by);
  await waitCells(p, 2);

  // Pick the chest: two items and a name.
  await p.getByRole('radio', { name: /Prüfen/ }).click();
  await p.mouse.click(ax, ay);
  const editor = p.getByTestId('content-editor');
  await editor.waitFor();
  assert.equal(await editor.getAttribute('data-kind'), 'container');
  await editor.getByRole('button', { name: '＋ Gegenstand' }).click();
  await editor.getByLabel('Gegenstand').fill('torch');
  await editor.getByLabel('Anzahl').fill('16');
  await editor.getByRole('button', { name: '＋ Gegenstand' }).click();
  await editor.getByLabel('Gegenstand').nth(1).fill('no_such_thing');
  await editor.locator('.content-problem', { hasText: 'kein Gegenstand' }).waitFor();
  assert.equal(await editor.getByRole('button', { name: 'Inhalt übernehmen' }).isDisabled(), true);
  await editor.getByLabel('Gegenstand').nth(1).fill('bread');
  await editor.getByLabel('Name des Behälters').fill('Vorrat');
  await editor.getByRole('button', { name: 'Inhalt übernehmen' }).click();
  await p.locator('.editor-message', { hasText: 'Inhalt Truhe' }).waitFor();
  // Undo empties the form again, redo restores it.
  await p.keyboard.press('Control+z');
  await p.waitForFunction(() => document.querySelectorAll('[data-testid=content-editor] .content-slots li').length === 0);
  await p.keyboard.press('Control+y');
  await p.waitForFunction(() => document.querySelectorAll('[data-testid=content-editor] .content-slots li').length === 2);

  // Pick the sign: text on both sides (the page may have scrolled; measure the grid again).
  const [sx, sy] = await cellPoint(p, 2, 0);
  await p.mouse.click(sx, sy);
  await p.locator('[data-testid=content-editor][data-kind=sign]').waitFor();
  await editor.getByLabel('Vorderseite Zeile 1').fill('Taverne');
  await editor.getByLabel('Vorderseite Zeile 2').fill('zum Creeper');
  await editor.getByLabel('Rückseite Zeile 1').fill('Geöffnet');
  await editor.getByLabel('Textfarbe').selectOption('red');
  await editor.getByRole('button', { name: 'Text übernehmen' }).click();
  await p.locator('.editor-message', { hasText: 'Schildtext' }).waitFor();

  // Saved building: the profile lists the chest content and the sign text.
  await p.getByLabel('Name des neuen Bauteils').fill('Taverne mit Vorrat');
  await p.getByRole('button', { name: 'Bauteil speichern' }).click();
  await p.getByRole('link', { name: 'Zum Steckbrief' }).click();
  const summary = p.getByTestId('furnishing-summary');
  await summary.waitFor();
  assert.match(await summary.innerText(), /1 Behälter mit Inhalt · 1 beschriftete Schilder/);
  await summary.locator('summary').click();
  const text = await summary.innerText();
  assert.match(text, /„Vorrat“/);
  assert.match(text, /16× torch/);
  assert.match(text, /Taverne/);
  assert.match(text, /Geöffnet/);
  assert.deepEqual(errors, []);
  await p.close();
});
