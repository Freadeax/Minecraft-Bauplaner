// Browser check of PERF-05 (catalogue file built with the page) against the built Pages artifact:
// the first start takes assets/catalog-<key>.json; without that file, or with a damaged or foreign one,
// the worker builds the catalogue itself, and both ways store exactly the same assets and versions.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { waitForStart } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4317, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

/** Starts a fresh browser; `snapshot` decides what the catalogue file request gets. */
async function start(snapshot) {
  const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  const requests = [];
  await context.route(/\/assets\/catalog-[0-9a-f]{32}\.json$/, async route => {
    requests.push(route.request().url());
    if (snapshot === 'pass') return route.continue();
    if (snapshot === 'missing') return route.fulfill({ status: 404, body: 'nicht da' });
    if (snapshot === 'damaged') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"format":"bp-catalog-snapshot-1","key":' });
    // Another app version's file: right format, wrong key.
    const res = await route.fetch(), body = await res.json();
    return route.fulfill({ response: res, json: { ...body, key: '0'.repeat(32) } });
  });
  const p = await context.newPage();
  const errors = [], warnings = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => {
    // The browser names every refused request itself; that is the case under test, not an app error.
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text());
    if (m.type() === 'warning') warnings.push(m.text());
  });
  const t = Date.now();
  await p.goto(BASE);
  await waitForStart(p);
  const ms = Date.now() - t;
  const source = await p.evaluate(() => document.documentElement.dataset.libraryStart);
  const stored = await p.evaluate(() => new Promise((res, rej) => {
    const r = indexedDB.open('minecraft-bauplaner');
    r.onsuccess = () => {
      const tx = r.result.transaction(['assets', 'versions']);
      const a = tx.objectStore('assets').getAll(), v = tx.objectStore('versions').getAll();
      tx.oncomplete = () => {
        res({ assets: a.result.map(x => [x.id, x.versionIds.join(','), x.name, x.tags.join('|')]).sort(), versions: v.result.map(x => [x.id, x.payloadHash, x.packedCells?.count ?? x.payload.cells.length]).sort() });
        r.result.close();
      };
      tx.onerror = () => rej(tx.error);
    };
    r.onerror = () => rej(r.error);
  }));
  return { context, p, errors, warnings, requests, source, stored, ms };
}

test('Erststart nimmt die mitgelieferte Katalogdatei; ohne sie wird derselbe Katalog im Browser erzeugt', async () => {
  const fromFile = await start('pass');
  assert.equal(fromFile.source, 'snapshot');
  assert.equal(fromFile.requests.length, 1, 'the catalogue file is requested once');
  assert.deepEqual(fromFile.errors, []);
  // The next start reads the stored cache and does not ask for the file again.
  await fromFile.p.reload();
  await waitForStart(fromFile.p);
  assert.equal(await fromFile.p.evaluate(() => document.documentElement.dataset.libraryStart), 'cache');
  assert.equal(fromFile.requests.length, 1, 'a reload takes the stored cache');
  await fromFile.context.close();

  const built = await start('missing');
  assert.equal(built.source, 'built');
  assert.ok(built.warnings.some(w => w.includes('Katalogdatei nicht geladen')), 'the fallback is logged');
  assert.deepEqual(built.errors, []);
  // Same code, same catalogue: what Node built at build time equals what the browser builds.
  assert.deepEqual(fromFile.stored, built.stored);
  console.log(`Erststart mit Katalogdatei ${fromFile.ms} ms, selbst erzeugt ${built.ms} ms`);
  await built.context.close();
});

test('Beschädigte oder fremde Katalogdatei: Katalog wird erzeugt, App startet ohne Fehler', async () => {
  for (const kind of ['damaged', 'foreign']) {
    const run = await start(kind);
    assert.equal(run.source, 'built', kind);
    assert.ok(run.warnings.some(w => w.includes('Katalogdatei')), `${kind}: the fallback is logged`);
    assert.deepEqual(run.errors, [], kind);
    await run.context.close();
  }
});
