// PERF-07: feste Leistungstests für Großbauten gegen das gebaute Pages-Artefakt (`npm run build` vorher).
// Ein großer Bau (Standard ~300 000 Blöcke, LMNT_PERF_SIDE ändert die Kantenlänge) kommt als Bauteil in ein
// Projekt; gemessen werden Öffnen, Schichtwechsel, Kamera und Export. Jede Messung hat ein festes Budget in
// tests/e2e/perf-budgets.json. Die Budgets gelten für Chromium mit Software-WebGL im Cloud-Container und sind
// bewusst großzügig: sie fangen Rückschritte um ein Vielfaches ab, keine Schwankungen. Mit
// LMNT_PERF_REPORT=<datei> schreibt der Test die Messwerte als JSON (Verlauf in docs/architecture/kern/PERFORMANCE_AUDIT.md).
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { writeLitematic } from '../../dist/formats/src/index.js';
import { adoptPayload } from '../../dist/voxel/src/index.js';
import { waitForStart } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4403, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
const SIDE = Number(process.env.LMNT_PERF_SIDE ?? 130);
const BUDGETS = JSON.parse(readFileSync(new URL('./perf-budgets.json', import.meta.url), 'utf8')).grossbau;
const results = { side: SIDE, blocks: 0, steps: {} };
let server, browser, file;

/** Stepped hall with open floors and windows: realistic faces per block, about 300 000 blocks at side 130. */
async function hall(side) {
  const h = Math.round(side / 2), c = (side - 1) / 2;
  const palette = ['stone_bricks', 'oak_planks', 'glass', 'spruce_log', 'sea_lantern', 'cobblestone'].map(id => ({ id: `minecraft:${id}`, properties: {} }));
  const cells = [];
  for (let x = 0; x < side; x++) for (let y = 0; y < h; y++) for (let z = 0; z < side; z++) {
    const edge = Math.max(Math.abs(x - c), Math.abs(z - c));
    if (edge > side / 2 - y * 0.5) continue;
    const wall = edge > side / 2 - 4 - y * 0.5;
    if (!(wall || y % 6 === 0 || (x * 7 + z * 3 + y) % 5 === 0)) continue;
    cells.push({ kind: 'block', position: [x, y, z], paletteIndex: wall && y % 6 === 3 ? 2 : (x * 31 + y * 17 + z * 13) % 6 === 2 ? 0 : (x * 31 + y * 17 + z * 13) % 6 });
  }
  const payload = adoptPayload({ schemaVersion: 1, profileId: 'java-26.3', bounds: { min: [0, 0, 0], maxExclusive: [side, h, side] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette, cells, blockEntities: [] });
  const out = await writeLitematic(payload, { dataVersion: 5023, anchor: 'min-corner', unselected: 'air', metadata: { name: 'Leistungshalle', author: 'Test' } });
  return { bytes: Buffer.from(out.bytes), blocks: cells.length, layers: h };
}

before(async () => {
  file = await hall(SIDE);
  results.blocks = file.blocks;
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close(); server?.kill();
  if (process.env.LMNT_PERF_REPORT) writeFileSync(process.env.LMNT_PERF_REPORT, JSON.stringify(results, null, 2) + '\n');
});

const host = p => p.locator('.canvas-host[data-mesh]').first();
/** Waits for a finished 3D mesh with exactly `all` blocks, or (partial) with more than 0 and fewer than `all`. */
const meshReady = (p, all, partial = false) => p.waitForFunction(([a, part]) => [...document.querySelectorAll('.canvas-host')].some(h => {
  const n = Number(h.dataset.blocks); return h.dataset.mesh === 'ready' && (part ? n > 0 && n < a : n === a);
}), [all, partial], { timeout: 240_000 });

/** Wall time and longest gap between two animation frames during `fn` (did the page freeze?). */
async function measure(p, name, fn) {
  await p.evaluate(() => { window.__gap.max = 0; window.__gap.last = performance.now(); });
  const t0 = performance.now();
  const extra = await fn();
  const ms = Math.round(performance.now() - t0);
  const gap = Math.round(await p.evaluate(() => window.__gap.max));
  results.steps[name] = { ms, maxFrameGapMs: gap, ...(extra ?? {}) };
  console.log(`# ${name}: ${ms} ms, längste Bildpause ${gap} ms${extra ? ` ${JSON.stringify(extra)}` : ''}`);
  return results.steps[name];
}
const within = (name, key = 'ms') => {
  const got = results.steps[name][key], max = BUDGETS[name][key];
  assert.ok(got <= max, `${name}.${key} = ${got} über dem Budget ${max} (tests/e2e/perf-budgets.json)`);
};

test('Großbau: Öffnen, Schichtwechsel, Kamera und Export bleiben im festen Budget', { timeout: 900_000 }, async () => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
  // Longest gap between two animation frames, on every page load (also across the reload of „Öffnen“).
  await context.addInitScript(() => { const g = window.__gap = { max: 0, last: performance.now() }; const f = () => { const n = performance.now(); g.max = Math.max(g.max, n - g.last); g.last = n; requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const p = await context.newPage();
  p.setDefaultTimeout(240_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(`${BASE}#/bibliothek`);
  await p.locator('input[type=file]').first().setInputFiles({ name: 'halle.litematic', mimeType: 'application/octet-stream', buffer: file.bytes });
  await p.getByText('DATEI GEPRÜFT').waitFor();
  await p.getByRole('button', { name: 'Als neues Bauteil speichern' }).click();
  await p.getByText('„Leistungshalle“ als Bauteil gespeichert.').waitFor();
  await p.waitForURL(/#\/bibliothek\/gebaeude\//);
  await p.getByRole('button', { name: 'Neues Projekt damit starten' }).click();
  await p.waitForURL(/#\/projekt\//);
  await meshReady(p, file.blocks);
  const projectUrl = p.url().replace(/(#\/projekt\/[^/?]+).*$/, '$1');

  // 1. Öffnen: frischer Start der Seite direkt auf dem Projekt (Katalog aus dem Speicher, Projekt berechnen, 3D-Netz).
  await p.goto(`${BASE}#/`);
  await waitForStart(p);
  await measure(p, 'oeffnen', async () => {
    await p.goto(`${BASE}${projectUrl.slice(projectUrl.indexOf('#'))}/editor`);
    await p.reload();
    await meshReady(p, file.blocks);
  });
  within('oeffnen');

  // 2. Schichtwechsel: Einzelschicht, dann zehnmal eine Schicht höher; jede Schicht neu vernetzt.
  await p.getByRole('button', { name: 'Einzeln' }).click();
  await meshReady(p, file.blocks, true);
  await p.getByLabel('Y-Schicht').fill('0');
  await meshReady(p, file.blocks, true);
  const times = [];
  await measure(p, 'schichtwechsel', async () => {
    for (let i = 0; i < 10; i++) {
      const t = performance.now();
      await p.getByRole('button', { name: 'Schicht höher' }).click();
      await p.waitForFunction(y => (document.querySelector('.layer-control')?.textContent ?? '').includes(`Y = ${y}`), i + 1);
      await p.waitForFunction(() => [...document.querySelectorAll('.canvas-host')].some(h => h.dataset.mesh === 'ready'));
      times.push(performance.now() - t);
    }
    return { perLayerMaxMs: Math.round(Math.max(...times)), perLayerMedianMs: Math.round([...times].sort((a, b) => a - b)[5]) };
  });
  within('schichtwechsel', 'perLayerMaxMs');
  await p.getByRole('button', { name: 'Alles' }).click();
  await meshReady(p, file.blocks);

  // 3. Kamera: 30 Bilder Ziehen mit der Maus (Orbit) über dem ganzen Bau; Zeit je Bild.
  const box = await host(p).boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.mouse.down();
  await measure(p, 'kamera', async () => {
    const frame = await p.evaluate(() => new Promise(done => {
      const el = document.querySelector('.canvas-host canvas') ?? document.querySelector('.canvas-host');
      const r = el.getBoundingClientRect(); let n = 0; const t0 = performance.now(); const gaps = []; let last = t0;
      const step = () => {
        const now = performance.now(); gaps.push(now - last); last = now; n++;
        el.dispatchEvent(new PointerEvent('pointermove', { clientX: r.x + r.width / 2 + n * 3, clientY: r.y + r.height / 2 + Math.sin(n / 9) * 30, pointerType: 'mouse', buttons: 1, bubbles: true }));
        if (n < 30) requestAnimationFrame(step); else { gaps.sort((a, b) => a - b); done({ msPerFrame: Math.round((performance.now() - t0) / n * 10) / 10, p95FrameMs: Math.round(gaps[Math.floor(gaps.length * 0.95)]) }); }
      };
      requestAnimationFrame(step);
    }));
    return frame;
  });
  await p.mouse.up();
  within('kamera', 'msPerFrame');

  // 4. Export: Revision einfrieren und .litematic schreiben (im Hintergrund), Datei vollständig.
  await p.getByRole('link', { name: 'Export' }).click();
  await p.getByText('✓ Exportbereit').waitFor();
  await p.getByLabel('Dateiformat').selectOption('litematic');
  await p.getByLabel('DataVersion (Zielversion)').fill('5023');
  let bytes = 0;
  await measure(p, 'export', async () => {
    const [d] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Revision einfrieren und .litematic exportieren' }).click()]);
    bytes = readFileSync(await d.path()).length;
    await p.getByText('DATEI ERZEUGT').waitFor();
    return { bytes };
  });
  assert.ok(bytes > 10_000, `Exportdatei ${bytes} Bytes`);
  within('export');
  for (const name of Object.keys(BUDGETS)) if (BUDGETS[name].maxFrameGapMs) within(name, 'maxFrameGapMs');
  assert.deepEqual(errors, []);
  await context.close();
});
