// Browser check of PERF-04-S05 (library start in the background worker) against the built Pages artifact:
// the start screen shows progress and keeps drawing, the catalogue is complete after the first start and
// after a reload, and the app also starts without workers or with a broken worker (direct fallback).
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { BUILDING_SPECS } from '../../dist/domain/src/index.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4293, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
const TOTAL = BUILDING_SPECS.length + 3;
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

/** Records long main-thread tasks and animation frames from the very first script on. */
const watch = () => {
  window.__long = []; window.__frames = 0;
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true }); } catch {}
  const tick = () => { window.__frames++; if (!document.querySelector('.catalog-results')) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
};

async function page(init) {
  const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  await context.addInitScript(watch);
  if (init) await context.addInitScript(init);
  const p = await context.newPage();
  p.setDefaultTimeout(60_000);
  const errors = [], warnings = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); if (m.type() === 'warning') warnings.push(m.text()); });
  return { p, errors, warnings, context };
}
/** Waits until the catalogue shows its first cards. */
async function catalogueCount(p) {
  await p.locator('.catalog-results .bcard-open').first().waitFor();
}

test('Bibliotheksstart im Hintergrund: Fortschritt, Seite bleibt bedienbar, Katalog vollständig, Neuladen schreibt nichts', async () => {
  const { p, errors, context } = await page();
  await p.goto(`${BASE}#/bibliothek`);
  // The start screen shows what is being computed.
  await p.locator('.app-start .job-status[data-job-step]').first().waitFor();
  const step = await p.locator('.app-start .job-status').getAttribute('data-job-step');
  assert.ok(step, 'a named step is shown');
  await catalogueCount(p);
  const firstLong = await p.evaluate(() => Math.max(0, ...window.__long));
  const frames = await p.evaluate(() => window.__frames);
  // Before PERF-04-S05 the start blocked the page for about 3–4 s in one piece.
  assert.ok(firstLong < 1500, `longest main-thread block at start ${firstLong} ms`);
  assert.ok(frames > 30, `the start screen kept drawing (${frames} frames)`);
  const assets = await p.evaluate(() => new Promise((res, rej) => {
    const r = indexedDB.open('minecraft-bauplaner');
    r.onsuccess = () => { const q = r.result.transaction('assets').objectStore('assets').getAll(); q.onsuccess = () => { res(q.result.map(a => [a.id, a.revision, a.versionIds.length])); r.result.close(); }; q.onerror = () => rej(q.error); };
    r.onerror = () => rej(r.error);
  }));
  assert.equal(assets.length, TOTAL, 'every shipped building and sample was stored');

  assert.equal(await p.evaluate(() => document.documentElement.dataset.libraryStart), 'built', 'first start builds the catalogue');
  const cacheKey = await p.evaluate(() => new Promise(res => {
    const r = indexedDB.open('minecraft-bauplaner');
    r.onsuccess = () => { const q = r.result.transaction('meta').objectStore('meta').get('catalogCache'); q.onsuccess = () => { res(q.result?.cache?.key ?? null); r.result.close(); }; };
  }));
  assert.match(cacheKey ?? '', /^[0-9a-f]{32}$/, 'the built catalogue is kept for this app version');

  await p.reload();
  await catalogueCount(p);
  assert.equal(await p.evaluate(() => document.documentElement.dataset.libraryStart), 'cache', 'a reload takes the catalogue from the cache');
  const again = await p.evaluate(() => new Promise(res => {
    const r = indexedDB.open('minecraft-bauplaner');
    r.onsuccess = () => { const q = r.result.transaction('assets').objectStore('assets').getAll(); q.onsuccess = () => { res(q.result.map(a => [a.id, a.revision, a.versionIds.length])); r.result.close(); }; };
  }));
  assert.deepEqual(again.sort(), assets.sort(), 'a second start writes nothing');
  // Stored records are intact after the worker-planned seed.
  await p.goto(`${BASE}#/system`);
  await p.getByRole('button', { name: 'Datencheck starten' }).click();
  await p.getByText('✓ Alles in Ordnung').waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});

test('Ohne Worker und mit defektem Worker startet die App direkt wie vorher', async () => {
  for (const init of [() => { delete window.Worker; }, () => { window.Worker = class { constructor() { throw new Error('kaputt'); } }; }]) {
    const { p, errors, warnings, context } = await page(init);
    await p.goto(`${BASE}#/bibliothek`);
    await catalogueCount(p);
    const n = await p.evaluate(() => new Promise(res => {
      const r = indexedDB.open('minecraft-bauplaner');
      r.onsuccess = () => { const q = r.result.transaction('assets').objectStore('assets').count(); q.onsuccess = () => { res(q.result); r.result.close(); }; };
    }));
    assert.equal(n, TOTAL);
    assert.equal(await p.evaluate(() => document.documentElement.dataset.libraryStart), 'direct');
    assert.deepEqual(errors, []);
    if (init.toString().includes('kaputt')) assert.ok(warnings.some(w => w.includes('Bibliotheksstart im Hintergrund fehlgeschlagen')), 'the fallback is logged');
    await context.close();
  }
});
