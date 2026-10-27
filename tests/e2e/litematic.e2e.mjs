// Browser check of the Litematic import and export (P5-01) against the built Pages artifact.
// The exported file is verified by the independent Python reader.
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4183, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
const dir = mkdtempSync(join(tmpdir(), 'litematic-e2e-'));
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

async function page() {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
  const p = await context.newPage();
  p.setDefaultTimeout(10_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  return { p, errors, context };
}

test('Betrachter öffnet die Litematic-Testdatei mit beiden Regionen', async () => {
  const { p, errors, context } = await page();
  await p.goto(`${BASE}#/betrachter`);
  await p.getByRole('button', { name: 'Litematic-Testdatei öffnen ↗' }).click();
  await p.getByText('Litematic-Importbericht').waitFor();
  const report = await p.locator('.import-report').innerText();
  assert.match(report, /Haus \(3×2×4 ab 4\/0\/-2\)/); assert.match(report, /Turm \(2×3×1 ab 0\/0\/0\)/);
  assert.match(report, /freie Entities/);
  assert.match(await p.locator('.stats').innerText(), /22/);
  await p.getByRole('button', { name: '↓ Original-Litematic sichern' }).waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});

test('Bibliothek: Litematic importieren, einzelne Region wählen und speichern', async () => {
  const { p, errors, context } = await page();
  await p.goto(`${BASE}#/bibliothek`);
  const bytes = Buffer.from(await p.evaluate(async url => Array.from(new Uint8Array(await (await fetch(url)).arrayBuffer())), `${BASE}examples/contract-multiregion.litematic`));
  await p.locator('input[type=file]').setInputFiles({ name: 'mehrregionen.litematic', mimeType: 'application/octet-stream', buffer: bytes });
  await p.getByText('DATEI GEPRÜFT').waitFor();
  assert.match(await p.locator('.inspector').innerText(), /Litematic, DataVersion 3465 · 7 × 3 × 4 · 22 Blöcke/);
  await p.getByLabel('Litematic-Region').selectOption('Turm');
  await p.getByText(/Nur Region „Turm“ von 2 importiert/).waitFor();
  assert.match(await p.locator('.inspector').innerText(), /2 × 3 × 1 · 5 Blöcke/);
  assert.equal(await p.getByLabel('Name').inputValue(), 'Turm');
  await p.getByRole('button', { name: 'Als neues Bauteil speichern' }).click();
  await p.getByText('„Turm“ als Bauteil gespeichert.').waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});

test('Export: Revision als .litematic, unabhängig geprüft', async () => {
  const { p, errors, context } = await page();
  await p.goto(BASE);
  await p.getByRole('button', { name: 'Beispielprojekt „Burgmauer“' }).click();
  await p.waitForURL(/#\/projekt\//);
  await p.getByRole('link', { name: 'Export' }).click();
  await p.getByText('✓ Exportbereit').waitFor();
  await p.getByLabel('Dateiformat').selectOption('litematic');
  await p.getByLabel('DataVersion (Zielversion)').fill('3465');
  await p.getByText('Litematic-Format 6 geschrieben').waitFor();
  const [d] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Revision einfrieren und .litematic exportieren' }).click()]);
  assert.match(d.suggestedFilename(), /-rev1\.litematic$/);
  const file = join(dir, 'export.litematic');
  await d.saveAs(file);
  await p.getByText('DATEI ERZEUGT').waitFor();
  assert.match(await p.locator('.export-report').innerText(), /Litematica \(\.litematic\), Format 6/);
  const r = spawnSync('python3', ['-I', 'scripts/verify_litematic.py', file], { encoding: 'utf8' });
  const summary = JSON.parse(r.stdout);
  assert.equal(r.status, 0, r.stdout);
  assert.equal(summary.version, 6); assert.equal(summary.dataVersion, 3465); assert.equal(summary.regions.length, 1);
  await p.getByRole('button', { name: 'Revision 1 als .litematic exportieren' }).waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});
