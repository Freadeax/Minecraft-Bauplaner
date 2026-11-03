// Browser check of the Bauführung (BUILD-06) in the "Bauen" tab against the built Pages artifact:
// anchor from a recording, Schichtführung in world coordinates, building days with pack list,
// game progress per day, rework list, print sheet, focus mode on a phone.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readNbt, writeNbt } from '../../dist/formats/src/index.js';
import { openSampleProject } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4181, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
const dir = mkdtempSync(join(tmpdir(), 'buildrun-e2e-'));
const ANCHOR = [500, 70, -300];
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

/** Plan file → recording with bridge anchor; the first planned block is replaced by a block the sample never uses. */
function recordingFromPlan(planFile) {
  const root = readNbt(new Uint8Array(gunzipSync(readFileSync(planFile))));
  const s = root.tag.value.Schematic.value;
  const b = s.Metadata.value.Bauplaner.value;
  const Int = b.ProjectMin.value.constructor;
  const meta = { ...b, Kind: { type: 'string', value: 'scan' }, ScanVersion: { type: 'int', value: 1 }, Source: { type: 'string', value: 'client' },
    WorldAnchor: { type: 'intArray', value: Int.from(ANCHOR) }, Dimension: { type: 'string', value: 'minecraft:overworld' } };
  const palette = { ...s.Blocks.value.Palette.value };
  const size = Object.keys(palette).length;
  palette['minecraft:mossy_cobblestone_wall'] = { type: 'int', value: size };
  const air = new Set(Object.entries(palette).filter(([k]) => k.startsWith('minecraft:air')).map(([, v]) => v.value));
  const data = [...s.Blocks.value.Data.value];
  data[data.findIndex(v => !air.has(v))] = size;
  const tag = { type: 'compound', value: { Schematic: { type: 'compound', value: {
    ...s, Metadata: { type: 'compound', value: { ...s.Metadata.value, Bauplaner: { type: 'compound', value: meta } } },
    Blocks: { type: 'compound', value: { ...s.Blocks.value, Palette: { type: 'compound', value: palette }, Data: { type: 'byteArray', value: data } } },
  } } } };
  const out = join(dir, 'aufnahme.schem');
  writeFileSync(out, gzipSync(writeNbt({ name: root.name, tag })));
  return out;
}

test('Bauführung: Anker aus Aufnahme, Schichtführung, Bautage, Packliste, Nacharbeit, Druck, Baumodus', async () => {
  const p = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  p.setDefaultTimeout(15_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(BASE);
  await openSampleProject(p);
  await p.waitForURL(/#\/projekt\//);

  await p.getByRole('link', { name: 'Export' }).click();
  await p.getByLabel('DataVersion (Zielversion)').fill('4189');
  const [d] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Revision einfrieren und .schem exportieren' }).click()]);
  const plan = join(dir, 'plan.schem');
  await d.saveAs(plan);

  await p.getByRole('link', { name: 'Bauen' }).click();
  await p.waitForURL(/\/bauen$/);
  await p.locator('.build-step h2').waitFor();
  // Schichtführung without anchor: relative coordinates only.
  assert.match(await p.locator('.run-table caption').innerText(), /relativ zum Anker/i);
  assert.match(await p.locator('.run-table tbody tr').first().innerText(), /X 0…3 · Y 0 · Z 0…3/);
  assert.match(await p.locator('.anchor-text').innerText(), /nicht gesetzt/);

  // Recording with WorldAnchor ⇒ adopt the anchor explicitly.
  await p.locator('.game-check input[type=file]').setInputFiles(recordingFromPlan(plan));
  await p.locator('.game-check-head small', { hasText: /Blöcken korrekt/ }).waitFor();
  await p.getByRole('button', { name: /Anker aus Spielaufnahme übernehmen \(X 500 · Y 70 · Z -300\)/ }).click();
  await p.locator('.anchor-text strong[data-anchor="500,70,-300"]').waitFor();
  assert.equal(await p.getByRole('button', { name: /Anker aus Spielaufnahme übernehmen/ }).count(), 0, 'no offer once the anchor matches');
  const firstRun = await p.locator('.run-table tbody tr').first().innerText();
  assert.match(firstRun, /X 500…503 · Y 70 · Z -300…-297/, 'world coordinates = project + anchor');
  assert.match(firstRun, /Anker X 0…3 · Y 0 · Z 0…3/);

  // Building days with a small pace ⇒ several days, every block planned once.
  await p.getByRole('button', { name: 'Bautage & Packliste' }).click();
  await p.locator('.session').first().waitFor();
  await p.getByLabel('Blöcke je Bautag').fill('100');
  await p.getByRole('button', { name: 'Bautempo speichern' }).click();
  await p.locator('.sessions-note', { hasText: /ergeben [4-9] Bautage/ }).waitFor();
  const dayCount = await p.locator('.session').count();
  const works = await p.locator('.session-title small').allInnerTexts();
  const total = works.reduce((n, t) => n + Number(t.match(/· ([\d.]+) Blöcke/)[1].replace('.', '')), 0);
  assert.match(await p.locator('.sessions-note').innerText(), new RegExp(`mit ${total} Blöcken ergeben ${dayCount} Bautage`));
  assert.match(works[0], /Welt-Y 70/);
  const day1 = p.locator('.session[data-day="1"]');
  assert.match(await day1.locator('.pack-summary').innerText(), /1 Shulkerkiste · \d+ Items/);
  assert.ok(await day1.locator('.pack-box').count() >= 1);

  // Game progress per day and rework list from the recording.
  await p.locator('.rework', { hasText: 'Nacharbeit laut Spielaufnahme' }).waitFor();
  const rework = await p.locator('.rework-list li li').first().innerText();
  assert.match(rework, /ersetzen X 50\d · Y 7\d · Z -\d+ \(Anker X \d+ · Y \d+ · Z \d+\): falscher Block/);
  assert.match(rework, /im Spiel minecraft:mossy_cobblestone_wall/);
  const tickDay = day1.getByRole('button', { name: /bestätigte Schritte dieses Tages abhaken/ });
  const n = Number((await tickDay.innerText()).match(/^(\d+)/)[1]);
  assert.ok(n > 0);
  await tickDay.click();
  await p.locator('.build-progress strong', { hasText: new RegExp(`^${n} / \\d+ Schritte`) }).waitFor();
  await p.locator('.today strong', { hasText: /^[1-9][\d.]* \/ 100 Blöcke/ }).waitFor();

  // Print sheet: only the sheet is visible in print media.
  await day1.getByRole('button', { name: 'Bauzettel drucken' }).click();
  await p.locator('.print-banner', { hasText: 'druckbereit' }).waitFor();
  await p.emulateMedia({ media: 'print' });
  assert.equal(await p.locator('#root').isVisible(), false);
  assert.ok(await p.locator('.print-sheet').isVisible());
  assert.match(await p.locator('.print-sheet .ps-head').innerText(), /Anker \(Projekt 0\/0\/0\) = Welt X 500 · Y 70 · Z -300/);
  assert.ok(await p.locator('.print-sheet .ps-step').count() >= 1);
  await p.emulateMedia({ media: 'screen' });
  assert.equal(await p.locator('.print-sheet').isVisible(), false);
  await p.getByRole('button', { name: 'Bauzettel schließen' }).click();
  assert.equal(await p.locator('.print-sheet').count(), 0);

  // Text download.
  const [txt] = await Promise.all([p.waitForEvent('download'), day1.getByRole('button', { name: 'Als Text herunterladen' }).click()]);
  const text = readFileSync(await txt.path(), 'utf8');
  assert.match(text, /Bautag 1: \d+ Schritte/);
  assert.match(text, /\[ \] Kiste 1/);

  // Focus mode on a phone: tick and advance, no horizontal scroll, view remembered.
  await p.setViewportSize({ width: 390, height: 844 });
  await day1.getByRole('button', { name: 'Im Baumodus starten' }).click();
  await p.locator('.focus-card').waitFor();
  const before = await p.locator('.focus-card .panel-kicker').innerText();
  assert.match(before, /SCHRITT \d+ · 1 VON \d+ OFFENEN · BAUTAG 1/);
  await p.locator('.run-table input[type=checkbox]').first().check();
  assert.match(await p.locator('.focus-card .muted').last().innerText(), /1 von \d+ Reihen/);
  await p.getByRole('button', { name: '✓ Abhaken & weiter' }).click();
  await p.waitForFunction(b => document.querySelector('.focus-card .panel-kicker')?.textContent !== b, before);
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= 390), 'no horizontal scroll at 390 px');
  await p.reload();
  await p.locator('.focus-card').waitFor();
  assert.deepEqual(errors, []);
  await p.close();
});
