// Browser check of GFX-02 (biome colours, beacon beams, progressive GPU upload) against the built Pages artifact.
// Run after `npm run build`: `npm run test:e2e`. BAUPLANER_SHOTS=<dir> keeps the screenshots.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { writeLitematic } from '../../dist/formats/src/index.js';
import { adoptPayload } from '../../dist/voxel/src/index.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 47751, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
const SHOTS = process.env.BAUPLANER_SHOTS;
let server, browser;

async function litematic(name, ids, cells, size) {
  const palette = ids.map(id => ({ id: `minecraft:${id}`, properties: {} }));
  const payload = adoptPayload({ schemaVersion: 1, profileId: 'java-26.3', bounds: { min: [0, 0, 0], maxExclusive: size }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette, cells, blockEntities: [] });
  const out = await writeLitematic(payload, { dataVersion: 4671, anchor: 'min-corner', unselected: 'air', metadata: { name, author: 'Test' } });
  return Buffer.from(out.bytes);
}

/** Meadow 15 × 15 with a pond, a leaf bush, a beacon on an iron pyramid with red glass and a beacon without pyramid. */
function garden() {
  const ids = ['grass_block', 'water', 'oak_leaves', 'iron_block', 'beacon', 'red_stained_glass', 'stone'];
  const cells = [];
  const put = (x, y, z, i) => cells.push({ kind: 'block', position: [x, y, z], paletteIndex: i });
  for (let x = 0; x < 15; x++) for (let z = 0; z < 15; z++) put(x, 0, z, x >= 9 && z >= 9 && x < 13 && z < 13 ? 1 : 0);
  for (let x = 1; x < 5; x++) for (let y = 1; y < 4; y++) for (let z = 9; z < 13; z++) put(x, y, z, 2);
  for (let x = 2; x < 5; x++) for (let z = 2; z < 5; z++) put(x, 1, z, 3);
  put(3, 2, 3, 4); put(3, 5, 3, 5);
  put(10, 1, 3, 4);
  return { ids, cells, size: [15, 6, 15] };
}
/** 96 × 24 × 96 terrace field: well above one frame of GPU upload. */
function field() {
  const ids = ['stone', 'grass_block', 'oak_planks', 'glass'];
  const cells = [];
  for (let x = 0; x < 96; x++) for (let z = 0; z < 96; z++) for (let y = 0; y < 24; y++) {
    if ((x * 5 + z * 3 + y * 7) % 3 === 0) continue;
    cells.push({ kind: 'block', position: [x, y, z], paletteIndex: (x + y + z) % 4 });
  }
  return { ids, cells, size: [96, 24, 96] };
}

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
const host = p => p.locator('.canvas-host').first();
const data = p => host(p).evaluate(e => ({ ...e.dataset }));
/** Mean colour (r, g, b) of the canvas, read back from WebGL via a 2D copy. */
async function meanColour(p, name) {
  await p.waitForTimeout(300);
  const png = await host(p).screenshot();
  if (SHOTS) { mkdirSync(SHOTS, { recursive: true }); writeFileSync(path.join(SHOTS, `${name}.png`), png); }
  return p.evaluate(async b64 => {
    const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let r = 0, gr = 0, bl = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 200) continue; r += d[i]; gr += d[i + 1]; bl += d[i + 2]; n++; }
    return [r / n, gr / n, bl / n];
  }, png.toString('base64'));
}
async function load(p, name, scene) {
  await p.goto(`${BASE}#/betrachter`);
  await p.waitForFunction(() => document.querySelector('.canvas-host')?.dataset.faces);
  await p.locator('input[type=file]').first().setInputFiles({ name: `${name}.litematic`, mimeType: 'application/octet-stream', buffer: await litematic(name, scene.ids, scene.cells, scene.size) });
  await p.waitForFunction(n => { const d = document.querySelector('.canvas-host')?.dataset; return d?.mesh === 'ready' && d.blocks === String(n) && d.upload === '0'; }, scene.cells.length);
}

test('Biomfarben ohne Neuaufbau und Leuchtfeuer mit Pyramide im Betrachter', async () => {
  const p = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  p.setDefaultTimeout(30_000);
  const errors = watch(p);
  const scene = garden();
  await load(p, 'garten', scene);
  const before = await data(p);
  assert.equal(before.biome, 'plains', 'Ebene ist Standard');
  assert.equal(before.beacons, '1/2', 'ein Leuchtfeuer mit Pyramide, eines ohne');
  const plains = await meanColour(p, 'biom-ebene');

  await p.locator('.gfx-menu > button').click();
  const dialog = p.getByRole('dialog', { name: 'Licht und Grafik' });
  assert.match(await dialog.locator('[data-beacons]').innerText(), /1 von 2 leuchten/);
  await dialog.getByLabel('Biom für Gras-, Laub- und Wasserfarben').selectOption({ label: 'Sumpf' });
  await p.waitForFunction(() => document.querySelector('.canvas-host').dataset.biome === 'swamp');
  await p.keyboard.press('Escape');
  const swamp = await meanColour(p, 'biom-sumpf');
  const after = await data(p);
  assert.equal(after.buildMs, before.buildMs, 'Biomwechsel baut keine Geometrie neu');
  assert.ok(swamp[1] < plains[1] - 2, `Sumpf ist weniger grün (${plains.map(v => v.toFixed(0))} → ${swamp.map(v => v.toFixed(0))})`);

  await p.locator('.gfx-menu > button').click();
  await dialog.getByLabel('Biom für Gras-, Laub- und Wasserfarben').selectOption({ label: 'Kirschblütenhain' });
  await p.keyboard.press('Escape');
  const cherry = await meanColour(p, 'biom-kirschbluetenhain');
  assert.ok(cherry[1] > swamp[1] + 2, 'Kirschblütenhain ist heller grün als Sumpf');

  // Remembered in this browser; reset for the other tests.
  await p.reload();
  await p.waitForFunction(() => document.querySelector('.canvas-host')?.dataset.biome === 'cherry_grove');
  await p.locator('.gfx-menu > button').click();
  await dialog.getByLabel('Biom für Gras-, Laub- und Wasserfarben').selectOption({ label: 'Ebene' });
  assert.deepEqual(errors, []);
  await p.close();
});

test('Große Szene: Abschnitte gehen in mehreren Bildern auf die Grafikkarte, Auswahl funktioniert danach', async () => {
  const p = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  p.setDefaultTimeout(90_000);
  const errors = watch(p);
  const scene = field();
  await load(p, 'feld', scene);
  const d = await data(p);
  assert.ok(Number(d.sections) >= 9, `Abschnitte ${d.sections}`);
  assert.ok(Number(d.uploadFrames) > 1, `in Stücken hochgeladen (${d.uploadFrames} Bilder, ${d.uploadMs} ms)`);
  // GFX-03: glass is sorted over frames and then rests.
  await p.waitForFunction(() => document.querySelector('.canvas-host')?.dataset.sorting === 'false');
  await meanColour(p, 'feld-hochgeladen');
  const box = await host(p).boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.waitForFunction(() => /X -?\d+ · Y -?\d+ · Z -?\d+/.test(document.querySelector('.viewer-hud')?.textContent ?? ''));
  assert.deepEqual(errors, []);
  await p.close();
});
