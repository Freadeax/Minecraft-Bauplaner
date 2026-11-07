// PRIV-01 Datenschutz und Freigaben im Browser: Fußzeile ohne „Alles bleibt lokal“, Seite #/datenschutz mit allen
// Datenwegen, Webkarte aus dem Team (fremde Domain) öffnet erst nach Bestätigung, Einbetten erst nach Freigabe.
// Läuft nach `npm run build` mit `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { waitForStart } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4392, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

test('Datenschutz-Seite: ehrliche Fußzeile, alle Datenwege, Umzug zwischen den Adressen', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  p.setDefaultTimeout(60_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE);
  await waitForStart(p);
  const footer = await p.locator('.site-footer').innerText();
  assert.doesNotMatch(footer, /Alles bleibt lokal/);
  assert.match(footer, /ins Internet geht nur, was du im Team teilst/);
  await p.locator('.site-footer').getByRole('link', { name: 'Datenschutz & Freigaben' }).click();
  await p.getByRole('heading', { name: 'Was geht wohin?' }).waitFor();
  assert.equal(await p.locator('.flow-card').count(), 10);
  for (const id of ['team-room', 'position', 'scans', 'world-share', 'webmap']) assert.match(await p.locator(`[data-flow="${id}"] .flow-badge`).innerText(), /Internet/, id);
  assert.match(await p.locator('[data-flow="team-room"]').innerText(), /90 Tage/);
  await p.getByRole('heading', { name: 'Zwei Adressen, zwei Speicher' }).waitFor();
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'keine waagerechte Scrollleiste am Handy');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Webkarte aus dem Team: fremde Domain erst nach Bestätigung öffnen und einbetten', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  // So kommt eine Webkarte aus dem Team-Raum an: als Einstellung, die dieser Browser nicht selbst eingetragen hat.
  await ctx.addInitScript(() => {
    try { if (!sessionStorage.getItem('gesetzt')) { localStorage.setItem('bauplaner.livekarte', JSON.stringify({ name: 'BlueMap', urlTemplate: 'https://karte.fremd.example/#{world}:{x}:{y}:{z}:150:0:0.9:0:0:perspective', worlds: { 'minecraft:overworld': 'world' }, embed: true })); sessionStorage.setItem('gesetzt', '1'); } } catch {}
  });
  await ctx.route('https://karte.fremd.example/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>Karte</title>' }));
  const p = await ctx.newPage();
  p.setDefaultTimeout(60_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(`${BASE}#/karte`);
  await p.getByText('Server-Webkarte verknüpfen').click();
  // Nicht freigegeben: kein Link, kein eingebetteter Rahmen, sondern die Domain zur Bestätigung.
  assert.equal(await p.locator('.live-panel a[href^="https://karte.fremd.example"]').count(), 0);
  assert.equal(await p.locator('.live-panel iframe').count(), 0);
  await p.locator('.live-embed-ask [data-map-host="karte.fremd.example"]').waitFor();
  await p.getByRole('button', { name: 'BlueMap öffnen ↗' }).click();
  const confirm = p.locator('.map-link-ask [data-map-host="karte.fremd.example"]');
  await confirm.waitFor();
  assert.match(await confirm.innerText(), /Fremde Seite: karte\.fremd\.example/);
  const [popup] = await Promise.all([ctx.waitForEvent('page'), confirm.getByRole('button', { name: 'Öffnen und Domain merken' }).click()]);
  assert.match(popup.url(), /^https:\/\/karte\.fremd\.example\//);
  await popup.close();
  // Jetzt freigegeben: normaler Link und eingebettete Karte mit wenigen Rechten.
  await p.reload();
  await p.getByText('Server-Webkarte verknüpfen').click();
  await p.getByRole('link', { name: 'BlueMap öffnen ↗' }).waitFor();
  const frame = p.locator('.live-panel iframe');
  await frame.waitFor();
  assert.equal(await frame.getAttribute('sandbox'), 'allow-scripts allow-same-origin');
  // Die Freigabe steht auf der Datenschutz-Seite und lässt sich dort entfernen.
  await p.goto(`${BASE}#/datenschutz`);
  await p.getByText('karte.fremd.example').waitFor();
  await p.getByRole('button', { name: 'Freigabe entfernen' }).click();
  await p.getByText('Noch keine.').waitFor();
  assert.deepEqual(errors, []);
  await ctx.close();
});
