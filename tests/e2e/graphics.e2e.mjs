// Browser check of GFX-01 (light, shadows, spawn check, sections) against the built Pages artifact.
// Run after `npm run build`: `npm run test:e2e`. BAUPLANER_SHOTS=<dir> keeps the screenshots.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4247, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
const SHOTS = process.env.BAUPLANER_SHOTS;
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
  p.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
  return errors;
}

/** Mean luminance (0..255) of the non-transparent pixels of a PNG (8-bit RGB/RGBA, as Playwright writes them). */
function meanLuminance(png) {
  let pos = 8, width = 0, height = 0, type = 6;
  const idat = [];
  while (pos < png.length) {
    const len = png.readUInt32BE(pos), kind = png.toString('ascii', pos + 4, pos + 8), body = png.subarray(pos + 8, pos + 8 + len);
    if (kind === 'IHDR') { width = body.readUInt32BE(0); height = body.readUInt32BE(4); type = body[9]; }
    if (kind === 'IDAT') idat.push(body);
    pos += 12 + len;
  }
  const bpp = type === 6 ? 4 : 3, stride = width * bpp, raw = inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[y * stride + x - bpp] : 0, b = y ? out[(y - 1) * stride + x] : 0, c = x >= bpp && y ? out[(y - 1) * stride + x - bpp] : 0;
      const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
      const pred = f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : f === 4 ? (pa <= pb && pa <= pc ? a : pb <= pc ? b : c) : 0;
      out[y * stride + x] = (line[x] + pred) & 255;
    }
  }
  let sum = 0, n = 0;
  for (let i = 0; i < out.length; i += bpp) {
    if (bpp === 4 && out[i + 3] < 200) continue;
    sum += 0.2126 * out[i] + 0.7152 * out[i + 1] + 0.0722 * out[i + 2]; n++;
  }
  return n ? sum / n : 0;
}

const host = p => p.locator('.canvas-host');
const data = p => host(p).evaluate(e => ({ ...e.dataset }));
async function shot(p, name) {
  await p.waitForTimeout(250);
  const png = await host(p).screenshot();
  if (SHOTS) { mkdirSync(SHOTS, { recursive: true }); writeFileSync(path.join(SHOTS, `${name}.png`), png); }
  return meanLuminance(png);
}
async function chooseLight(p, label) {
  const menu = p.locator('.gfx-menu > button');
  if (await menu.getAttribute('aria-expanded') !== 'true') await menu.click();
  const dialog = p.getByRole('dialog', { name: 'Licht und Grafik' });
  await dialog.locator('.gfx-modes label').filter({ hasText: new RegExp(`^${label}$`) }).click();
  assert.equal(await dialog.getByRole('radio', { name: label, exact: true }).isChecked(), true);
}

test('Licht: Tag, Sonne mit Schatten, Nacht und Flach im Betrachter; Einstellung bleibt nach Neuladen', async () => {
  const p = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  p.setDefaultTimeout(15_000);
  const errors = watch(p);
  await p.goto(`${BASE}#/betrachter`);
  await p.waitForFunction(() => { const d = document.querySelector('.canvas-host')?.dataset; return d?.faces && d.camera && d.light; });
  let d = await data(p);
  assert.equal(d.light, 'day', 'Tageslicht ist Standard');
  assert.ok(Number(d.sections) >= 1, `Abschnitte ${d.sections}`);
  const day = await shot(p, 'licht-tag');

  await chooseLight(p, 'Sonne');
  await p.waitForFunction(() => document.querySelector('.canvas-host').dataset.light === 'sun');
  const dialog = p.getByRole('dialog', { name: 'Licht und Grafik' });
  await dialog.getByLabel('Uhrzeit der Sonne').fill('16');
  assert.match(await dialog.locator('output').innerText(), /16:00 Uhr/);
  await p.locator('.scene').click({ position: { x: 5, y: 400 } }); // closes the panel
  await dialog.waitFor({ state: 'detached' });
  const sun = await shot(p, 'licht-sonne-16uhr');
  await chooseLight(p, 'Sonne');
  await dialog.getByRole('checkbox', { name: 'Schatten', exact: true }).uncheck();
  await p.keyboard.press('Escape');
  const noShadow = await shot(p, 'licht-sonne-ohne-schatten');
  assert.ok(noShadow > sun + 0.5, `Schatten dunkeln ab (${sun.toFixed(1)} mit, ${noShadow.toFixed(1)} ohne)`);
  await chooseLight(p, 'Sonne');
  await dialog.getByRole('checkbox', { name: 'Schatten', exact: true }).check();

  await chooseLight(p, 'Nacht');
  await p.waitForFunction(() => document.querySelector('.canvas-host').dataset.light === 'night');
  await p.keyboard.press('Escape');
  const night = await shot(p, 'licht-nacht');
  assert.ok(night < day - 6, `Nacht deutlich dunkler (${night.toFixed(1)} gegen ${day.toFixed(1)})`);

  await chooseLight(p, 'Flach');
  await p.keyboard.press('Escape');
  const flat = await shot(p, 'licht-flach');
  assert.ok(flat >= day - 1, `Flach mindestens so hell wie Tag (${flat.toFixed(1)} / ${day.toFixed(1)})`);
  await chooseLight(p, 'Nacht');
  await p.keyboard.press('Escape');

  // Remembered in this browser.
  await p.reload();
  await p.waitForFunction(() => document.querySelector('.canvas-host')?.dataset.light === 'night');
  d = await data(p);
  assert.equal(d.light, 'night');
  await chooseLight(p, 'Tag');
  assert.deepEqual(errors, []);
  await p.close();
});

test('Spawnprüfung: Markierungen und Zähler, Ecken­schatten abschaltbar ohne Neuaufbau', async () => {
  const p = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  p.setDefaultTimeout(15_000);
  const errors = watch(p);
  await p.goto(`${BASE}#/betrachter`);
  await p.waitForFunction(() => document.querySelector('.canvas-host')?.dataset.spawn !== undefined && document.querySelector('.canvas-host').dataset.faces);
  const before = await data(p);
  assert.ok(before.spawnDay !== '' && before.spawnNight !== '', 'Spawnflächen werden berechnet');
  await p.locator('.gfx-menu > button').click();
  const dialog = p.getByRole('dialog', { name: 'Licht und Grafik' });
  await dialog.getByLabel('Spawnprüfung (Monster)').check();
  await p.waitForFunction(() => document.querySelector('.canvas-host').dataset.spawnCheck === 'on');
  const total = Number(before.spawnDay) + Number(before.spawnNight);
  assert.ok(total > 0, 'Das Beispielhaus hat Dach- oder Bodenflächen ohne Licht');
  assert.match(await dialog.locator('.gfx-note[role=status]').innerText(), /tagsüber|nur nachts/);
  await p.keyboard.press('Escape');
  await p.locator('.spawn-hud').waitFor();
  await shot(p, 'spawnpruefung');
  await p.locator('.gfx-menu > button').click();
  await dialog.getByLabel('Eckschatten (weiche Beleuchtung)').uncheck();
  const after = await data(p);
  assert.equal(after.buildMs, before.buildMs, 'Lichtwechsel baut keine Geometrie neu');
  await dialog.getByLabel('Eckschatten (weiche Beleuchtung)').check();
  await dialog.getByLabel('Spawnprüfung (Monster)').uncheck();
  assert.deepEqual(errors, []);
  await p.close();
});

test('Große Modelle: Dorfplatz in mehreren 32³-Abschnitten, Auswahl findet den Block über die Abschnitte hinweg', async () => {
  const p = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  p.setDefaultTimeout(20_000);
  const errors = watch(p);
  await p.goto(`${BASE}#/bibliothek/generatoren/dorfplatz~dorf`);
  await p.waitForFunction(() => document.querySelector('.canvas-host')?.dataset.faces);
  const d = await data(p);
  assert.ok(Number(d.sections) > 1, `Abschnitte ${d.sections}`);
  // Hover over the middle of the view names a block with world coordinates (picking through the sections).
  const box = await host(p).boundingBox();
  let named = '';
  for (const [fx, fy] of [[0.5, 0.5], [0.45, 0.55], [0.55, 0.45], [0.5, 0.6], [0.4, 0.5]]) {
    await p.mouse.move(box.x + box.width * fx, box.y + box.height * fy);
    await p.waitForTimeout(150);
    named = await p.locator('.viewer-hud').innerText();
    if (/X -?\d+ · Y -?\d+ · Z -?\d+/.test(named)) break;
  }
  assert.match(named, /X -?\d+ · Y -?\d+ · Z -?\d+ minecraft:/);
  await shot(p, 'dorfplatz-abschnitte');
  assert.deepEqual(errors, []);
  await p.close();
});
