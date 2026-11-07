// SPLIT-01-S05 in Chromium: the base the real game built and the mod recorded (basis-aus-dem-spiel.litematic from
// scripts/size/test_grossbau_ingame.sh, kept with BAUPLANER_KEEP) goes through „Gebäude herauslösen“ like a player's file:
// import, Gebäudeblatt → Verwalten → Gebäude herauslösen, list with houses, fields, pen, paths, cellar, bunker and bridge,
// „Als Projekt aufteilen“ → project without conflicts. Run after `npm run build`:
//   node tests/big/basis.big.mjs <dir with basis-aus-dem-spiel.litematic>
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const dir = process.argv[2];
if (!dir) throw new Error('usage: basis.big.mjs <dir>');
const PORT = Number(process.env.BAUPLANER_WEB_PORT ?? 4312), BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
let browser;
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await context.newPage();
  p.setDefaultTimeout(120_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(`${BASE}#/bibliothek`);
  await p.locator('input[type=file]').first().setInputFiles({ name: 'basis-aus-dem-spiel.litematic', mimeType: 'application/octet-stream', buffer: readFileSync(join(dir, 'basis-aus-dem-spiel.litematic')) });
  await p.getByText('DATEI GEPRÜFT').waitFor();
  await p.getByRole('button', { name: 'Als neues Bauteil speichern' }).click();
  await p.getByText(/als Bauteil gespeichert\./).waitFor();
  await p.waitForURL(/#\/bibliothek\/gebaeude\//);

  const split = p.locator('.split-panel');
  const t0 = performance.now();
  await split.locator('summary').click();
  const summary = await p.getByTestId('split-summary');
  await summary.waitFor();
  const analyseMs = Math.round(performance.now() - t0);
  const text = (await summary.innerText()).trim();
  const items = await split.locator('.split-parts li .split-meta').allInnerTexts();
  const names = await split.locator('.split-parts li input[type=text]').evaluateAll(els => els.map(e => e.value));
  const list = names.map((n, i) => `${n}: ${items[i]}`);
  console.log(`Herauslösen im Browser (${analyseMs} ms): ${text}`);
  for (const l of list) console.log(`  ${l}`);
  assert.match(text, /^3 Gebäude, \d+ Flächen, 1 unterirdisch, \d+ Brücken? gefunden/);
  assert.ok(list.some(l => /^Unterirdischer Raum/.test(l)), 'Bunker als „Unterirdischer Raum“');
  assert.ok(list.some(l => /^Brücke.*verbindet „[^“]+“ und „[^“]+“/.test(l)), 'Brücke mit „verbindet … und …“');
  assert.ok(list.some(l => /mit Keller/.test(l)), 'Keller gehört zum Haus darüber');
  assert.ok(list.filter(l => /Ackerboden/.test(l)).length >= 2, 'zwei Felder');
  assert.ok(list.some(l => /Weg/.test(l)), 'Wegenetz');

  await split.getByRole('button', { name: 'Alle wählen' }).click();
  await split.getByRole('button', { name: /Als Projekt aufteilen/ }).click();
  await p.waitForURL(/#\/projekt\//);
  await p.waitForFunction(() => [...document.querySelectorAll('.canvas-host')].some(h => h.dataset.mesh === 'ready' && Number(h.dataset.blocks) > 1000));
  const body = await p.locator('body').innerText();
  assert.doesNotMatch(body, /Voxelkonflikt/, 'aufgeteiltes Projekt ohne Konflikte');
  assert.deepEqual(errors, []);
  writeFileSync(join(dir, 'basis-browser.json'), JSON.stringify({ analyseMs, summary: text, parts: list }, null, 1));
  console.log('Herauslösen im Browser bestanden.');
} finally {
  await browser?.close();
  server.kill();
}
