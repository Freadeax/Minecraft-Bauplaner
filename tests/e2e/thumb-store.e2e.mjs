// Browser check of PERF-05 O-1 (stored preview images) against the built Pages artifact:
// the first start renders the previews and keeps them; after a reload they come from the store
// (data URLs, marked data-from="store") instead of being rendered again, and only one store (this render code) exists.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { waitForStart } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4319, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

// UI-04: the start page is taller (stage first); previews render when they come near the view, so walk the page once.
const walk = async p => {
  const height = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= height; y += 600) { await p.evaluate(top => scrollTo(0, top), y); await p.waitForTimeout(80); }
  await p.evaluate(() => scrollTo(0, 0));
};

const sources = p => p.locator('.thumb img').evaluateAll(imgs => imgs.map(i => i.getAttribute('src') ?? ''));
// Block 5: stored previews are data URLs too (Safari refuses object URLs); the wrapper names the origin.
const origins = p => p.locator('.thumb:has(img)').evaluateAll(els => els.map(e => e.getAttribute('data-from') ?? ''));

test('Vorschaubilder werden gespeichert und beim Neustart nicht neu gerendert', async () => {
  // Block 5: WebKit keeps Cache Storage entries of a throw-away (private) context only for one page load;
  // a real Safari profile keeps them, so WebKit runs this check with a persistent profile.
  const options = { viewport: { width: 1300, height: 900 } };
  const context = browser.browserType().name() === 'webkit'
    ? await browser.browserType().launchPersistentContext(await mkdtemp(join(tmpdir(), 'bauplaner-wk-')), options)
    : await browser.newContext(options);
  const p = await context.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(BASE);
  await waitForStart(p);
  await p.locator('.thumb img').first().waitFor({ timeout: 60_000 });
  // Every preview of the start page rendered (none still loading).
  await walk(p);
  await p.waitForFunction(() => document.querySelectorAll('.thumb').length > 0 && !document.querySelector('.thumb.loading'), null, { timeout: 60_000 });
  const first = await sources(p);
  assert.ok(first.length > 0 && first.every(s => s.startsWith('data:image/')), 'the first start renders the previews');
  assert.ok((await origins(p)).every(o => o === 'render'), 'first start: rendered, not stored');
  // Storing is in the background; wait until the store holds every shown image.
  await p.waitForFunction(async n => {
    const names = (await caches.keys()).filter(k => k.startsWith('bauplaner-vorschau-'));
    return names.length === 1 && (await (await caches.open(names[0])).keys()).length >= n;
  }, first.length, { timeout: 30_000 });

  await p.reload();
  await waitForStart(p);
  await p.locator('.thumb img').first().waitFor();
  await walk(p);
  await p.waitForFunction(n => document.querySelectorAll('.thumb img').length >= n, first.length);
  const again = await origins(p);
  assert.ok(again.length >= first.length && again.every(o => o === 'store'), `after a reload the previews come from the store: ${again.join(', ')}`);
  assert.ok((await sources(p)).every(s => s.startsWith('data:image/')), 'stored previews are data URLs');
  // The stored image is a real picture of the same size class as the rendered one.
  const size = await p.locator('.thumb img').first().evaluate(i => i.complete ? [i.naturalWidth, i.naturalHeight] : [0, 0]);
  assert.ok(size[0] > 0 && size[1] > 0);
  assert.deepEqual(errors, []);
  await context.close();
});

test('Fremder alter Vorschauspeicher wird entfernt, ohne Cache Storage wird normal gerendert', async () => {
  const context = await browser.newContext();
  const p = await context.newPage();
  await p.goto(BASE);
  await p.evaluate(async () => { await (await caches.open('bauplaner-vorschau-00000000')).put('https://vorschau.invalid/alt', new Response('x')); });
  await p.reload();
  await waitForStart(p);
  await p.locator('.thumb img').first().waitFor({ timeout: 60_000 });
  await p.waitForFunction(async () => !(await caches.keys()).includes('bauplaner-vorschau-00000000'));
  await context.close();

  const without = await browser.newContext();
  await without.addInitScript(() => { delete window.caches; });
  const q = await without.newPage();
  const errors = [];
  q.on('pageerror', e => errors.push(e.message));
  await q.goto(BASE);
  await waitForStart(q);
  await q.locator('.thumb img').first().waitFor({ timeout: 60_000 });
  assert.ok((await sources(q)).every(s => s.startsWith('data:image/')));
  assert.deepEqual(errors, []);
  await without.close();
});
