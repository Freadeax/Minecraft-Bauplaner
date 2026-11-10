// RELEASE-01 Browser-Schutz: dist-web wird mit genau den Headern ausgeliefert, die Cloudflare Pages bekommt
// (scripts/pages/security_headers.mjs). Geprüft wird, dass die wichtigsten Wege keinen einzigen Verstoß
// gegen die durchgesetzte Richtlinie auslösen, ein fremdes Verbindungsziel blockiert wird und dass fremde
// Seiten den Planer nicht einbetten können – mit Headern (Cloudflare) und ohne (GitHub Pages, Schutz im Programm).
// Nach `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { SECURITY_HEADERS } from '../../scripts/pages/security_headers.mjs';
import { openSampleProject, REFUSED } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const DIST = path.resolve('dist-web');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain', '.wasm': 'application/wasm' };
let withHeaders, without, foreign, browser;

/** Static server for dist-web under /Minecraft-Bauplaner/, optionally with the Cloudflare security headers. */
function serve(headers) {
  return new Promise(resolve => {
    const s = createServer(async (req, res) => {
      const url = new URL(req.url, 'http://x');
      let rel = decodeURIComponent(url.pathname).replace(/^\/Minecraft-Bauplaner\/?/, '');
      if (!rel || rel.endsWith('/')) rel += 'index.html';
      const file = path.join(DIST, rel);
      if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
      try {
        if (!(await stat(file)).isFile()) throw new Error('dir');
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', ...headers });
        res.end(await readFile(file));
      } catch { res.writeHead(404, headers).end('not found'); }
    });
    s.listen(0, '127.0.0.1', () => resolve(s));
  });
}
/** A "foreign" site on another origin (localhost vs. 127.0.0.1) that tries to frame the planner. */
function framer() {
  return new Promise(resolve => {
    const s = createServer((req, res) => {
      const target = new URL(req.url, 'http://x').searchParams.get('src');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(`<!doctype html><title>fremd</title><iframe id="f" src="${target}" width="800" height="600"></iframe>`);
    });
    s.listen(0, 'localhost', () => resolve(s));
  });
}
const base = s => `http://127.0.0.1:${s.address().port}/Minecraft-Bauplaner/`;

before(async () => {
  [withHeaders, without, foreign] = await Promise.all([serve(SECURITY_HEADERS), serve({}), framer()]);
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); for (const s of [withHeaders, without, foreign]) s?.close(); });

async function page() {
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', e => window.__csp.push(`${e.disposition} ${e.effectiveDirective} ${e.blockedURI}`));
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(60_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !REFUSED.test(m.text()) && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  return { ctx, p, errors };
}
const violations = p => p.evaluate(() => window.__csp);

test('Sicherheitsheader: Hauptwege ohne Verstoß gegen die durchgesetzte Richtlinie', async () => {
  const { ctx, p, errors } = await page();
  const res = await p.goto(base(withHeaders));
  const h = res.headers();
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) assert.equal(h[k.toLowerCase()], v, k);
  await openSampleProject(p);
  // Editor with 3D view and workers, then the tabs that fetch, compute and download.
  await p.locator('canvas').first().waitFor();
  for (const tab of ['Material', 'Bauanleitung', 'Export']) {
    const link = p.getByRole('link', { name: tab, exact: true });
    if (await link.count()) { await link.first().click(); await p.waitForTimeout(800); }
  }
  await p.getByText('✓ Exportbereit').waitFor();
  await p.getByLabel('DataVersion (Zielversion)').fill('3955');
  await p.getByLabel('Sicherer Modus').check();
  await p.getByText('Keine Befehlsblöcke, Befehls-Minecarts, Klickbefehle oder Betreiberblöcke im Plan.').waitFor();
  const [d] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Revision einfrieren und .schem exportieren' }).click()]);
  await p.getByText('nichts zu entfernen').waitFor();
  assert.match(d.suggestedFilename(), /\.schem$/);
  for (const hash of ['#/bibliothek', '#/karte', '#/mod', '#/system', '#/anleitung', '#/welt', '#/werkstatt/neu']) {
    await p.goto(base(withHeaders) + hash);
    await p.locator('main, [role="main"], #root > *').first().waitFor();
    await p.waitForTimeout(1500);
  }
  assert.deepEqual(await violations(p), [], 'keine CSP-Verstöße');
  assert.deepEqual(errors, []);
  // Gegenprobe: ein fremdes Verbindungsziel (z. B. ein eigener Team-Raum) wird blockiert.
  const fremd = await p.evaluate(() => fetch('https://fremd.example.invalid/x').then(() => 'durchgelassen', () => 'blockiert'));
  assert.equal(fremd, 'blockiert');
  await p.waitForTimeout(300);
  assert.ok((await violations(p)).some(v => /^enforce connect-src https:\/\/fremd\.example\.invalid/.test(v)), JSON.stringify(await violations(p)));
  await ctx.close();
});

test('Einbettung: mit Headern blockiert der Browser, ohne Header startet der Planer nicht im fremden Rahmen', async () => {
  const { ctx, p } = await page();
  const framerUrl = src => `http://localhost:${foreign.address().port}/?src=${encodeURIComponent(src)}`;
  // Cloudflare: X-Frame-Options/frame-ancestors – the frame never gets the planner document.
  await p.goto(framerUrl(base(withHeaders)));
  await p.waitForTimeout(1500);
  const blocked = p.frames().find(f => f !== p.mainFrame());
  const loaded = blocked ? await blocked.evaluate(() => !!document.querySelector('#root')).catch(() => false) : false;
  assert.equal(loaded, false, 'Planer-Dokument darf im fremden Rahmen nicht laden');
  // GitHub Pages: no headers – the program itself refuses to start and offers its own tab.
  await p.goto(framerUrl(base(without)));
  const frame = p.frameLocator('#f');
  await frame.getByRole('alert').getByText('läuft nicht in fremden Seiten').waitFor();
  assert.equal(await frame.getByRole('link', { name: /Im eigenen Tab öffnen/ }).count(), 1);
  assert.equal(await frame.getByRole('button', { name: /Beispielprojekt/ }).count(), 0);
  // Directly opened, the same artifact starts normally.
  await p.goto(base(without));
  await p.getByRole('button', { name: /Beispielprojekt/ }).waitFor();
  await ctx.close();
});
