// PRIV-01 Release-Probe der Browserdaten (docs/operations/VEROEFFENTLICHUNG.md „Datenprobe“): gegen den gebauten
// Planer mit Offline-Speicher. Offline-Start mit vorhandenem Projekt, App-Update bei offenem Projekt (neue
// Service-Worker-Fassung) ohne Datenverlust, Speicherwarnung am Projekt, Rücksprung auf eine ältere Fassung
// (Daten einer neueren Fassung werden nicht angefasst). Die Wiederherstellung aus der Sicherungsdatei prüft
// persistence.e2e.mjs. Läuft nach `npm run build` mit `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject, waitForStart } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4391, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
let server, browser;
// Ein Deploy wie auf GitHub/Cloudflare Pages: dieselbe Adresse sw.js, neuer Inhalt. (Eine andere Skriptadresse
// anzumelden, hängt in Chromium manchmal, und die App meldet danach ohnehin wieder sw.js an.)
const SW = new URL('../../dist-web/sw.js', import.meta.url);
const swBefore = readFileSync(SW, 'utf8');

before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  browser = await chromium.launch();
});
after(async () => { writeFileSync(SW, swBefore); await browser?.close(); server?.kill(); });

async function context() {
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('bauplaner.offline.test', '1'); } catch {} });
  const p = await ctx.newPage();
  p.setDefaultTimeout(60_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  return { ctx, p, errors };
}
const controlled = p => p.evaluate(async () => {
  await navigator.serviceWorker.ready;
  for (let i = 0; i < 100 && !navigator.serviceWorker.controller; i++) await new Promise(r => setTimeout(r, 100));
  return !!navigator.serviceWorker.controller;
});

test('Release-Probe: Offline-Start mit Projekt, Update bei offenem Projekt, Speicherwarnung', async () => {
  const { ctx, p, errors } = await context();
  await p.goto(BASE);
  await waitForStart(p);
  await openSampleProject(p);
  await p.waitForURL(/#\/projekt\//);
  const projectUrl = p.url();
  await p.locator('.save-state.saved').waitFor();
  assert.equal((await p.locator('.save-state').innerText()).trim(), 'In diesem Browser gespeichert');
  // Speicherwarnung am Projekt: der Testbrowser darf Daten bei Platzmangel löschen.
  const warning = p.locator('[data-storage-risk]');
  await warning.waitFor();
  assert.equal(await warning.getAttribute('data-storage-risk'), 'evictable');
  assert.match(await warning.locator('summary').innerText(), /Speicher nicht geschützt/);
  await warning.locator('summary').click();
  await warning.getByRole('button', { name: 'Dauerhaft speichern anfragen' }).click();
  await warning.getByRole('status').filter({ hasText: /dauerhaft/i }).waitFor();
  assert.match(await p.locator('.backup-chip').innerText(), /noch keine Sicherungsdatei/);
  assert.ok(await controlled(p), 'Offline-Speicher aktiv');

  // Offline-Start: ohne Netz öffnet das Projekt aus dem Browser-Speicher.
  await p.goto(BASE);
  await waitForStart(p);
  await ctx.setOffline(true);
  await p.reload();
  await waitForStart(p);
  await p.evaluate(url => { location.hash = new URL(url).hash; }, projectUrl);
  await p.getByText('✓ Geometrisch konfliktfrei').waitFor();
  await ctx.setOffline(false);

  // Update bei offenem Projekt: eine neue Fassung des Service Workers übernimmt, das Projekt bleibt offen und speichert weiter.
  writeFileSync(SW, `${swBefore}\n// Release-Probe: neue Fassung\n`);
  await p.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const old = reg.active;
    await reg.update();
    for (let i = 0; i < 600; i++) {
      if (reg.active && reg.active !== old && reg.active.state === 'activated' && navigator.serviceWorker.controller === reg.active) return;
      await new Promise(r => setTimeout(r, 100));
    }
    throw new Error('neue Fassung nicht aktiv');
  });
  p.once('dialog', d => void d.accept('Burgmauer nach Update'));
  await p.getByRole('button', { name: 'Projekt umbenennen' }).click();
  await p.getByRole('heading', { name: /Burgmauer nach Update/ }).waitFor();
  await p.locator('.save-state.saved').waitFor();
  await p.reload();
  await p.getByRole('heading', { name: /Burgmauer nach Update/ }).waitFor();
  await p.getByText('✓ Geometrisch konfliktfrei').waitFor();
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Release-Probe Rücksprung: Daten einer neueren Fassung bleiben unangetastet', async () => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  p.setDefaultTimeout(60_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  // Eine spätere Fassung hat die Datenbank schon auf eine höhere Version gehoben (hier: 99).
  await p.goto(`${BASE}deployment.json`);
  await p.evaluate(() => new Promise((resolve, reject) => {
    const r = indexedDB.open('minecraft-bauplaner', 99);
    r.onupgradeneeded = () => { r.result.createObjectStore('zukunft'); };
    r.onsuccess = () => { r.result.close(); resolve(); };
    r.onerror = () => reject(r.error);
  }));
  await p.goto(BASE);
  const alert = p.getByRole('alert').filter({ hasText: 'neueren Version' });
  await alert.waitFor();
  // Nichts verändert: die Datenbank hat weiter Version 99 und ihren Speicher.
  const db = await p.evaluate(() => new Promise(resolve => { const r = indexedDB.open('minecraft-bauplaner'); r.onsuccess = () => { const out = { version: r.result.version, stores: [...r.result.objectStoreNames] }; r.result.close(); resolve(out); }; }));
  assert.deepEqual(db, { version: 99, stores: ['zukunft'] });
  assert.deepEqual(errors, []);
  await ctx.close();
});
