// COMPAT-01: „Passt zu deinem Spiel?“ im Export, im Gebäudeblatt und auf der Mod-Seite. Die Auswahl gilt
// für den ganzen Browser; die Minecraft-Version setzt die DataVersion, das Werkzeug das Dateiformat.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4407, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
let server, browser;

before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.kill(); });

test('Export: Spiel wählen setzt DataVersion und Format, Statuszeile nennt Verluste vor dem Herunterladen', async () => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await context.newPage();
  p.setDefaultTimeout(60_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(BASE);
  await openSampleProject(p);
  await p.waitForURL(/#\/projekt\//);
  await p.getByRole('link', { name: 'Export' }).click();
  const region = p.getByRole('region', { name: 'Passt zu deinem Spiel?' });
  const status = region.locator('.compat-status');
  await status.waitFor();
  // Default: version profile, Fabric, WorldEdit → .schem, DataVersion of 26.3.
  assert.equal(await status.getAttribute('data-compat'), 'ok');
  assert.match(await status.innerText(), /Minecraft 26\.3 · Fabric · WorldEdit \/ FAWE: passt/);
  assert.equal(await p.getByLabel('DataVersion (Zielversion)').inputValue(), '5023');
  assert.equal(await p.getByLabel('Dateiformat').inputValue(), 'schem');

  await region.getByLabel('Version deines Spiels').selectOption('1.21.1');
  assert.equal(await p.getByLabel('DataVersion (Zielversion)').inputValue(), '3955');
  await region.getByLabel('Einfügewerkzeug').selectOption('litematica');
  assert.equal(await p.getByLabel('Dateiformat').inputValue(), 'litematic');
  await region.getByLabel('Loader deines Spiels').selectOption('vanilla');
  await p.waitForFunction(() => document.querySelector('.export-compat .compat-status')?.dataset.compat === 'loss');
  assert.match(await status.innerText(), /Litematica ist eine Mod/);
  // A hand-typed DataVersion that does not match the chosen game is flagged.
  await p.getByLabel('DataVersion (Zielversion)').fill('4189');
  await region.locator('[data-compat-dataversion]').waitFor();
  // Back to a working setup; the choice is stored for the whole browser.
  await region.getByLabel('Loader deines Spiels').selectOption('fabric');
  await p.waitForFunction(() => document.querySelector('.export-compat .compat-status')?.dataset.compat === 'ok');
  assert.deepEqual(JSON.parse(await p.evaluate(() => localStorage.getItem('bauplaner.spiel'))), { version: '1.21.1', loader: 'fabric', tool: 'litematica' });

  // Mod page: the same game; for 1.21.1 there is no client mod yet, for 26.3 there is.
  await p.goto(`${BASE}#/mod`);
  const fit = p.getByRole('region', { name: 'Passt zu deinem Spiel?' }).or(p.locator('.mod-game-fit')).first();
  await fit.locator('.compat-status[data-compat=loss]').waitFor();
  assert.match(await fit.innerText(), /Minecraft 1\.21\.1 · Fabric: dafür gibt es die Mod noch nicht/);
  await fit.getByLabel('Version deines Spiels').selectOption('26.3');
  await fit.locator('.compat-status[data-compat=ok]').waitFor();
  assert.match(await fit.innerText(), /Mod \d+\.\d+\.\d+ passt/);

  // Building sheet in the library: compact line with the same game.
  await p.goto(`${BASE}#/bibliothek/gebaeude/sample_tower`);
  await p.locator('.sheet-section .compat-status').first().waitFor();
  assert.match(await p.locator('.sheet-section .compat-status').first().innerText(), /Minecraft 26\.3 · Fabric · Litematica/);
  assert.deepEqual(errors, []);
  await context.close();
});
