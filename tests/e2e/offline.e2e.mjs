// Browser check of PERF-06 (Offline-Speicher, sw.js) against the built Pages artifact:
// the service worker installs, keeps all program files, serves them on the next start,
// the app starts without network, a new app version replaces old files, and switching
// it off on the system page removes it. Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { waitForStart } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4387, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

const manifest = JSON.parse(/const MANIFEST = (\{.*\});/.exec(readFileSync('dist-web/sw.js', 'utf8'))[1]);

async function context() {
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('bauplaner.offline.test', '1'); } catch {} });
  const p = await ctx.newPage();
  p.setDefaultTimeout(60_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  return { ctx, p, errors };
}

const ready = p => p.evaluate(async () => {
  const reg = await navigator.serviceWorker.ready;
  for (let i = 0; i < 100 && !navigator.serviceWorker.controller; i++) await new Promise(r => setTimeout(r, 100));
  return { scope: reg.scope, controlled: !!navigator.serviceWorker.controller };
});
const cachedFiles = p => p.evaluate(async () => (await (await caches.open('bauplaner-app')).keys()).map(r => new URL(r.url).pathname));

test('Offline-Speicher: installiert, hält alle Programmdateien, startet ohne Netz', async () => {
  assert.ok(manifest.assets.length > 20, 'manifest lists the program files');
  assert.ok(!manifest.assets.some(a => a.includes('catalog-')), 'catalogue file stays out (IndexedDB keeps it)');
  const { ctx, p, errors } = await context();
  await p.goto(BASE);
  await waitForStart(p);
  const sw = await ready(p);
  assert.equal(sw.scope, BASE);
  assert.ok(sw.controlled, 'page is controlled after claim');
  // Install fetched every program file.
  for (let i = 0; i < 100; i++) { if ((await cachedFiles(p)).length >= manifest.assets.length) break; await p.waitForTimeout(100); }
  const files = new Set(await cachedFiles(p));
  for (const a of manifest.assets) assert.ok(files.has(`/Minecraft-Bauplaner/${a}`), `cached: ${a}`);

  // Next start: program files come from the service worker, not the network.
  const fromNetwork = [];
  p.on('response', r => { if (r.url().includes('/assets/') && !r.url().includes('catalog-') && !r.fromServiceWorker()) fromNetwork.push(r.url()); });
  await p.reload();
  await waitForStart(p);
  assert.deepEqual(fromNetwork, [], 'no program file loaded from the network on reload');

  // Without network the app still starts, including a page loaded on demand.
  await ctx.setOffline(true);
  await p.reload();
  await waitForStart(p);
  await p.goto(`${BASE}#/system`);
  await p.locator('[data-offline="aktiv"]').waitFor();
  await p.getByText('Offline-Speicher', { exact: true }).first().waitFor();
  await ctx.setOffline(false);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Offline-Speicher: alte Programmdateien fallen weg, Ausschalten entfernt ihn', async () => {
  const { ctx, p } = await context();
  await p.goto(BASE);
  await waitForStart(p);
  await ready(p);
  // A file of an older app version in the store goes when the worker activates again.
  await p.evaluate(async () => { const c = await caches.open('bauplaner-app'); await c.put(new URL('assets/alt-0000.js', location.href).href, new Response('old')); });
  await p.evaluate(async () => {
    // Another script URL counts as a new worker version: it installs and activates again.
    const next = await navigator.serviceWorker.register('sw.js?neu=1', { scope: './' });
    for (let i = 0; i < 600; i++) {
      if (next.active?.scriptURL.includes('neu=1') && next.active.state === 'activated') return;
      await new Promise(r => setTimeout(r, 100));
    }
    throw new Error(`new worker not activated: active=${next.active?.scriptURL} ${next.active?.state} waiting=${next.waiting?.scriptURL} installing=${next.installing?.scriptURL} ${next.installing?.state}`);
  });
  assert.ok(!(await cachedFiles(p)).includes('/Minecraft-Bauplaner/assets/alt-0000.js'), 'stale file removed on activate');

  await p.goto(`${BASE}#/system`);
  await p.locator('[data-offline="aktiv"]').waitFor();
  await p.getByRole('button', { name: 'Offline-Speicher leeren und ausschalten' }).click();
  await p.getByRole('button', { name: 'Offline-Speicher einschalten' }).waitFor();
  assert.equal(await p.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), 0);
  assert.equal(await p.evaluate(() => caches.has('bauplaner-app')), false);
  // Stays off after loading the page again.
  await p.goto(BASE);
  await p.reload();
  await waitForStart(p);
  await p.waitForTimeout(500);
  assert.equal(await p.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), 0);
  await ctx.close();
});

test('Offline-Speicher bleibt in automatisierten Browsern ohne Testschalter aus', async () => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(BASE);
  await waitForStart(p);
  await p.waitForTimeout(500);
  assert.equal(await p.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), 0);
  await ctx.close();
});
