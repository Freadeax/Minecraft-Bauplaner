// Browser check of the creative workshop tools (EDIT-04): symmetry, curves, nature tools, colour palettes, image → blocks.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4239, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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
const stats = p => p.locator('.editor-stats');


const cellCount = async p => Number((await stats(p).innerText()).match(/^([\d.]+) Zellen/)[1].replace('.', ''));
const waitCells = (p, n) => p.waitForFunction(n => document.querySelector('.editor-stats')?.textContent?.startsWith(`${n.toLocaleString('de-DE')} Zellen`), n);


/** Minimal PNG encoder (RGBA, no filter) for a test picture. */
function png(width, height, rgba) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) { raw[y * (width * 4 + 1)] = 0; for (let i = 0; i < width * 4; i++) raw[y * (width * 4 + 1) + 1 + i] = rgba[y * width * 4 + i]; }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

test('Kreativwerkzeuge: Symmetrie, Kurve, Natur, Oberfläche, Farbverlauf und Bild → Blöcke', async () => {
  const p = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  p.setDefaultTimeout(15_000);
  const errors = watch(p);
  await p.goto(`${BASE}#/werkstatt/neu`);
  await p.getByRole('heading', { name: 'Neues Bauteil bauen' }).waitFor();

  // Symmetry: mirror east/west around the cell column under the grid centre; one click sets two blocks.
  const g = await gridGeometry(p), cx = Math.floor(g.centre[0]);
  await p.getByRole('button', { name: /Ost\/West/ }).click();
  await p.getByLabel('Achse X').fill(String(cx));
  await p.locator(`[data-symmetry*="Achse X ${cx}"]`).waitFor();
  const [x3, z0] = await cellPoint(p, 3, 0);
  await p.mouse.click(x3, z0);
  await waitCells(p, 2);
  assert.match(await p.locator('.editor-message').innerText(), /Symmetrie ×2/);

  // Curve: a 3-wide path through three points (mirrored as well), Enter places it as one undo step.
  await p.keyboard.press('u');
  assert.equal(await p.getByRole('radio', { name: /Kurve/ }).getAttribute('aria-checked'), 'true');
  for (const [dx, dz] of [[2, -6], [6, -3], [9, -7]]) { const [x, y] = await cellPoint(p, dx, dz); await p.mouse.click(x, y); }
  await p.locator('[data-curve-points="3"]').waitFor();
  await p.keyboard.press('Enter');
  await p.locator('.editor-message', { hasText: 'Kurve · Weg' }).waitFor();
  const withCurve = await cellCount(p);
  assert.ok(withCurve > 2 + 2 * 25, `${withCurve} Zellen mit gespiegelter Kurve`);
  await p.keyboard.press('Control+z'); await waitCells(p, 2);

  // Nature tools need a selection: a 5×5×3 stone block (symmetry off), Ctrl+A, „Abtragen“ removes the 8 corners
  // and the two loose blocks from the start.
  await p.getByRole('button', { name: /Ost\/West/ }).click();
  await p.getByRole('radio', { name: /Quader/ }).click();
  await p.getByLabel('Höhe ab Ebene').fill('3');
  await dragCells(p, [-2, 4], [2, 8]);
  await waitCells(p, 2 + 75);
  await p.keyboard.press('Control+a');
  const nature = p.getByRole('region', { name: 'Natur und Oberfläche' });
  await nature.getByLabel('Durchgänge').fill('1');
  await nature.getByRole('button', { name: 'Abtragen' }).click();
  // The two single mirrored blocks (six open faces) go as well.
  await waitCells(p, 75 - 8);
  await nature.getByRole('button', { name: 'Naturalisieren' }).click();
  await p.locator('.editor-message', { hasText: 'Naturalisieren' }).waitFor();
  // Stone on top became grass: the replace list of model blocks now offers it.
  await p.waitForFunction(() => [...document.querySelectorAll('select[aria-label="Zu ersetzender Block"] option')].some(o => o.value === 'minecraft:grass_block'));

  // Colour panel: similar blocks to stone, gradient stone → white concrete in 4 steps becomes the pattern.
  await p.getByRole('radio', { name: /Setzen/ }).click();
  const colors = p.getByRole('region', { name: 'Farbpaletten' });
  await colors.getByRole('list', { name: 'Ähnliche Blöcke' }).getByRole('listitem').first().waitFor();
  await colors.getByLabel('Zielblock des Farbverlaufs').selectOption('minecraft:white_concrete');
  await colors.getByLabel('Stufen des Farbverlaufs').fill('4');
  await p.waitForFunction(() => document.querySelector('[data-gradient]')?.getAttribute('data-gradient')?.split(' ').length === 4);
  await colors.getByRole('button', { name: 'Als Verlaufsmuster übernehmen' }).click();
  await p.locator('.editor-message', { hasText: 'Farbverlauf mit 4 Stufen' }).waitFor();
  assert.match(await p.locator('.brush-now').innerText(), /Muster: Verlauf \(4\)/);

  // Surface mask: paint only the visible skin of the selection with the gradient.
  await nature.getByRole('button', { name: 'Sichtbare Blöcke bemalen' }).click();
  await p.locator('.editor-message', { hasText: 'Oberfläche bemalen' }).waitFor();

  // Image → blocks: a 4×2 picture (red, yellow, blue, white / black, transparent …) as wool wall into the clipboard.
  const px = [[161, 39, 34, 255], [249, 198, 40, 255], [53, 57, 157, 255], [233, 236, 236, 255], [20, 21, 25, 255], [0, 0, 0, 0], [161, 39, 34, 255], [249, 198, 40, 255]].flat();
  const image = p.getByRole('region', { name: 'Bild zu Blöcken' });
  await image.getByLabel('Bildbreite in Blöcken').fill('4');
  await image.getByLabel('Bilddatei').setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: png(4, 2, px) });
  await p.locator('[data-image-blocks="7"]').waitFor();
  assert.equal(await p.getByRole('radio', { name: /Einfügen/ }).getAttribute('aria-checked'), 'true');
  const before = await cellCount(p);
  const [ix, iz] = await cellPoint(p, -8, -8);
  await p.mouse.move(ix, iz);
  await p.mouse.click(ix, iz);
  await waitCells(p, before + 7);
  assert.deepEqual(errors, []);
  await p.close();
});

test('Kreativwerkzeuge auf dem Handy (390 px): ohne waagrechtes Scrollen', async () => {
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const errors = watch(p);
  await p.goto(`${BASE}#/werkstatt/neu`);
  await p.getByRole('heading', { name: 'Neues Bauteil bauen' }).waitFor();
  await p.getByRole('button', { name: /4× drehen/ }).click();
  await p.getByRole('radio', { name: /Kurve/ }).click();
  await p.getByRole('region', { name: 'Farbpaletten' }).waitFor();
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'kein waagrechtes Scrollen');
  assert.deepEqual(errors, []);
  await p.close();
});
