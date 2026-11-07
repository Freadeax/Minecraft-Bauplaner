// Ladezeit-Messung (PERF-05): misst gegen das gebaute Pages-Artefakt (dist-web) den
// Erststart (leerer Browser, Katalog wird erzeugt), den Neustart (Katalog aus dem Speicher)
// und je Seite das geladene JavaScript. Aufruf nach `npm run build`:
//   node scripts/bench/perf/measure_start.mjs [--runs 3] [--json datei]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { readFileSync, statSync, writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const RUNS = Number(opt('--runs', 3)), PORT = 4399, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
const SAMPLE = 'Beispielprojekt „Burgmauer“';
const ROUTES = ['#/', '#/bibliothek', '#/karte', '#/werkstatt/neu', '#/system'];

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
/** JavaScript the start page loads before anything else (entry and module preloads of dist-web/index.html). */
function startScriptKb() {
  const html = readFileSync('dist-web/index.html', 'utf8');
  const files = [...new Set([...html.matchAll(/assets\/[^"]+\.js/g)].map(m => m[0]))];
  return Math.round(files.reduce((sum, f) => sum + statSync(`dist-web/${f}`).size, 0) / 1024);
}
const median = xs => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

async function run() {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
  const browser = await chromium.launch();
  const result = { first: [], firstUsable: [], reload: [], reloadUsable: [], longest: [], scriptKb: {}, startKb: 0 };
  try {
    for (let r = 0; r < RUNS; r++) {
      const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
      await context.addInitScript(() => { window.__long = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long.push(e.duration); }).observe({ type: 'longtask', buffered: true }); } catch {} });
      const page = await context.newPage();
      let t = Date.now();
      await page.goto(BASE);
      // PERF-07: the project centre (own projects) shows before the catalogue; „bereit“ marks the loaded library.
      await page.getByRole('heading', { name: /^Deine Projekte/ }).waitFor({ timeout: 120_000 });
      result.firstUsable.push(Date.now() - t);
      await page.getByRole('button', { name: SAMPLE }).waitFor({ timeout: 120_000 });
      await page.locator('html[data-library="bereit"]').waitFor({ state: 'attached', timeout: 120_000 });
      result.first.push(Date.now() - t);
      result.longest.push(Math.max(0, ...await page.evaluate(() => window.__long)));
      t = Date.now();
      await page.reload();
      await page.getByRole('heading', { name: /^Deine Projekte/ }).waitFor({ timeout: 120_000 });
      result.reloadUsable.push(Date.now() - t);
      await page.locator('html[data-library="bereit"]').waitFor({ state: 'attached', timeout: 120_000 });
      result.reload.push(Date.now() - t);
      if (r === 0) for (const route of ROUTES) {
        const fresh = await context.newPage();
        let bytes = 0;
        fresh.on('response', async res => { if (/\.js$/.test(res.url()) && !/worker/.test(res.url())) { try { bytes += (await res.body()).length; } catch {} } });
        await fresh.goto(BASE + route);
        await fresh.waitForLoadState('networkidle');
        result.scriptKb[route] = Math.round(bytes / 1024);
        await fresh.close();
      }
      await context.close();
    }
  } finally { await browser.close(); server.kill(); }
  const summary = { runs: RUNS, startScriptKb: startScriptKb(), firstUsableMs: median(result.firstUsable), firstStartMs: median(result.first), reloadUsableMs: median(result.reloadUsable), reloadMs: median(result.reload), longestTaskMs: Math.round(median(result.longest)), scriptKbByRoute: result.scriptKb, raw: result };
  console.log(JSON.stringify(summary, null, 2));
  const out = opt('--json'); if (out) writeFileSync(out, JSON.stringify(summary, null, 2) + '\n');
}
run().catch(e => { console.error(e); server.kill(); process.exit(1); });
