// Browser check of PERF-04 (heavy work in the background worker) against the built Pages artifact:
// a large Litematic is imported, shown, saved, checked, exported and cancelled; with the test hook
// `bauplaner.hintergrund.ab` the update preview and the version comparison run through the worker too.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { writeLitematic, checkClosed, readStl } from '../../dist/formats/src/index.js';
import { adoptPayload } from '../../dist/voxel/src/index.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4291, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
let server, browser, big, blocks;

/** 80 × 40 × 80 stepped hall: about 130 000 blocks, above every background threshold. */
async function bigLitematic() {
  const palette = ['stone', 'quartz_block', 'glass', 'oak_planks', 'sea_lantern'].map(id => ({ id: `minecraft:${id}`, properties: {} }));
  const cells = [];
  for (let x = 0; x < 80; x++) for (let y = 0; y < 40; y++) for (let z = 0; z < 80; z++) {
    const edge = Math.max(Math.abs(x - 39.5), Math.abs(z - 39.5));
    if (edge > 40 - y * 0.5) continue;
    if (!(edge > 36 - y * 0.5 || y % 6 === 0 || (x * 7 + z * 3 + y) % 4 !== 0)) continue;
    cells.push({ kind: 'block', position: [x, y, z], paletteIndex: (x * 31 + y * 17 + z * 13) % 5 });
  }
  const payload = adoptPayload({ schemaVersion: 1, profileId: 'java-26.3', bounds: { min: [0, 0, 0], maxExclusive: [80, 40, 80] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette, cells, blockEntities: [] });
  const out = await writeLitematic(payload, { dataVersion: 4671, anchor: 'min-corner', unselected: 'air', metadata: { name: 'Grosse Halle', author: 'Test' } });
  return { bytes: Buffer.from(out.bytes), blocks: cells.length };
}

before(async () => {
  ({ bytes: big, blocks } = await bigLitematic());
  assert.ok(blocks > 120_000, `fixture too small: ${blocks}`);
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.kill(); });

async function page(init) {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
  if (init) await context.addInitScript(init);
  const p = await context.newPage();
  p.setDefaultTimeout(60_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  return { p, errors, context };
}
const bytesOf = async download => new Uint8Array(await readFile(await download.path()));
const meshReady = (p, n) => p.waitForFunction(count => [...document.querySelectorAll('.canvas-host')].some(h => h.dataset.mesh === 'ready' && h.dataset.blocks === String(count)), n);

test('Großes Litematic: Import, 3D-Ansicht und Speichern im Hintergrund, Datencheck ohne Befund, STL-Export', async () => {
  const { p, errors, context } = await page();
  await p.goto(`${BASE}#/bibliothek`);
  await p.locator('input[type=file]').setInputFiles({ name: 'halle.litematic', mimeType: 'application/octet-stream', buffer: big });
  await p.getByText('DATEI GEPRÜFT').waitFor();
  assert.match(await p.locator('.inspector').innerText(), new RegExp(`80 × 40 × 80 · ${blocks.toLocaleString('de-DE').replace('.', '\\.')} Blöcke`));
  // The 3D view of the import was built in the worker and shows every block.
  await meshReady(p, blocks);
  assert.equal(await p.getByLabel('Name').inputValue(), 'Grosse Halle');

  await p.getByRole('button', { name: 'Als neues Bauteil speichern' }).click();
  await p.getByText('„Grosse Halle“ als Bauteil gespeichert.').waitFor();
  await meshReady(p, blocks);
  await p.waitForURL(/#\/bibliothek\/gebaeude\//);
  const detail = p.url();

  // Stored hash, id and packed cells must match what the page holds: the data check recomputes them after a reload.
  await p.reload();
  await p.goto(`${BASE}#/system`);
  await p.getByRole('button', { name: 'Datencheck starten' }).click();
  await p.getByText('✓ Alles in Ordnung').waitFor();

  // STL of the stored building, computed in the worker: watertight.
  await p.goto(detail);
  await p.getByRole('tablist', { name: 'Ansicht' }).getByRole('tab', { name: 'Modelldatei' }).click();
  const panel = p.getByRole('region', { name: '3D-Datei' });
  await panel.getByText('STL (.stl)').click();
  await panel.getByRole('combobox', { name: 'Feinheit' }).selectOption('1');
  const [stl] = await Promise.all([p.waitForEvent('download'), panel.getByRole('button', { name: /STL exportieren/ }).click()]);
  await p.getByRole('region', { name: '3D-Exportbericht' }).getByText('✓ wasserdicht und mannigfaltig').waitFor();
  const s = await bytesOf(stl);
  const { positions, triangles } = readStl(s);
  const check = checkClosed({ name: 'stl', unit: 'millimeter', up: 'z', materials: [], groups: [{ material: 0, positions, normals: null, uvs: null, colors: null, indices: Uint32Array.from({ length: triangles * 3 }, (_, i) => i) }] });
  assert.equal(check.closed, true);
  assert.equal(await p.locator('.job-status').count(), 0, 'no progress left over');
  assert.deepEqual(errors, []);
  await context.close();
});

test('Abbrechen: Import und 3D-Export großer Modelle stoppen sofort, nichts wird gespeichert oder geladen', async () => {
  const { p, errors, context } = await page();
  await p.goto(`${BASE}#/betrachter`);
  await p.locator('input[type=file]').setInputFiles({ name: 'halle.litematic', mimeType: 'application/octet-stream', buffer: big });
  await meshReady(p, blocks);
  const plans = p.getByRole('region', { name: 'Bilder und Bauplan' });
  await plans.getByRole('tab', { name: 'Modelldatei' }).click();
  const panel = plans.getByRole('region', { name: '3D-Datei' });
  await panel.getByText('3MF (.3mf)').click();
  await panel.getByRole('combobox', { name: 'Feinheit' }).selectOption('4');
  let downloaded = false;
  p.on('download', () => { downloaded = true; });
  await panel.getByRole('button', { name: /3MF exportieren/ }).click();
  const status = panel.locator('.job-status');
  await status.waitFor();
  // The page answers while the export runs: the format choice still reacts.
  assert.equal(await p.evaluate(() => new Promise(r => requestAnimationFrame(() => r(true)))), true);
  await status.getByRole('button', { name: 'Abbrechen' }).click();
  await panel.getByText('Export abgebrochen – es wurde keine Datei erzeugt.').waitFor();
  assert.equal(await status.count(), 0);
  await p.waitForTimeout(500);
  assert.equal(downloaded, false);

  await p.goto(`${BASE}#/bibliothek`);
  await p.locator('input[type=file]').setInputFiles({ name: 'halle.litematic', mimeType: 'application/octet-stream', buffer: big });
  await p.locator('.job-status').getByRole('button', { name: 'Abbrechen' }).click();
  await p.getByText('Import abgebrochen.').waitFor();
  assert.equal(await p.getByText('DATEI GEPRÜFT').count(), 0);
  assert.deepEqual(errors, []);
  await context.close();
});

test('Update-Vorschau und Versionsvergleich über den Hintergrund (Testschwelle 1 Zelle) mit gleichem Ergebnis', async () => {
  const { p, errors, context } = await page(() => localStorage.setItem('bauplaner.hintergrund.ab', '1'));
  await p.goto(BASE);
  await p.getByRole('button', { name: 'Beispielprojekt „Burgmauer“' }).click();
  await p.waitForURL(/#\/projekt\//);
  const projectUrl = p.url().replace(/(#\/projekt\/[^/]+).*$/, '$1');
  // Even the small project view is meshed in the worker with this hook.
  await p.waitForFunction(() => [...document.querySelectorAll('.canvas-host')].some(h => h.dataset.mesh === 'ready' && Number(h.dataset.blocks) > 0));

  // A new library version of the wall: one block removed in the workshop.
  await p.goto(`${BASE}#/bibliothek/gebaeude/sample_wall`);
  await p.getByRole('link', { name: /Blöcke bearbeiten/ }).click();
  await p.waitForURL(/#\/werkstatt\/av_/);
  const canvas = p.locator('.layer-grid canvas');
  let g = null, last = '';
  for (let i = 0; i < 50 && !g; i++) {
    const now = await canvas.evaluate(c => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(() => {
      const b = c.getBoundingClientRect(); done({ x: b.x, y: b.y, w: b.width, h: b.height, size: Number(c.dataset.cellSize), centre: c.dataset.centre });
    }))));
    const key = JSON.stringify(now);
    if (key === last) g = now; else last = key;
  }
  const [cx, cz] = g.centre.split(',').map(Number);
  await p.getByRole('radio', { name: /Abbauen/ }).click();
  await p.mouse.click(g.x + g.w / 2 + (Math.floor(cx) + 0.5 - cx) * g.size, g.y + g.h / 2 + (Math.floor(cz) + 0.5 - cz) * g.size);
  await p.getByRole('button', { name: 'Als Version 2.0 speichern' }).click();
  await p.locator('.notice.success', { hasText: 'Version 2.0' }).waitFor();

  await p.goto(`${projectUrl}/updates`);
  await p.locator('.updates-table tr[data-instance="Mauer 1"]').getByRole('button', { name: 'Folgen anzeigen' }).click();
  const plan = p.getByRole('region', { name: 'Folgen des Updates' });
  await plan.getByRole('heading', { name: 'Folgen vor dem Übernehmen' }).waitFor();
  assert.match(await plan.innerText(), /Mauer 1: 1\.0 → 2\.0/);
  assert.match(await plan.innerText(), /1 Zellen anders/);
  // The comparison below was computed in the worker as well: exactly one removed cell.
  const diff = plan.locator('.diff-view');
  await diff.locator('.diff-stats').waitFor();
  assert.match(await diff.locator('.diff-removed').innerText(), /entfernt\s*1$/);
  assert.match(await diff.locator('.diff-added').innerText(), /hinzugefügt\s*0$/);
  await plan.getByRole('button', { name: /Update übernehmen/ }).click();
  await p.locator('.notice.success', { hasText: 'Mauer 1 steht jetzt auf 2.0' }).waitFor();
  assert.equal(await p.locator('.updates-table tr[data-instance="Mauer 1"]').getAttribute('data-status'), 'current');
  assert.deepEqual(errors, []);
  await context.close();
});
