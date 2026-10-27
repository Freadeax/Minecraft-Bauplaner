// Browser check of the in-game check (B8) in the "Bauen" tab against the built Pages artifact.
// The recording is derived from the exported plan: every planned cell built, one block wrong (a block the sample never uses).
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readNbt, writeNbt } from '../../dist/formats/src/index.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4181, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
const dir = mkdtempSync(join(tmpdir(), 'scan-e2e-'));
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

/** Turns a plan file into a recording: Kind/ScanVersion added, the first planned block replaced by mossy cobblestone wall. */
function recordingFromPlan(planFile, { projectId } = {}) {
  const root = readNbt(new Uint8Array(gunzipSync(readFileSync(planFile))));
  const s = root.tag.value.Schematic.value;
  const b = s.Metadata.value.Bauplaner.value;
  const meta = { ...b, Kind: { type: 'string', value: 'scan' }, ScanVersion: { type: 'int', value: 1 }, Source: { type: 'string', value: 'client' }, GameVersion: { type: 'string', value: '26.3' } };
  if (projectId) meta.ProjectId = { type: 'string', value: projectId };
  const palette = { ...s.Blocks.value.Palette.value };
  const size = Object.keys(palette).length;
  assert.ok(!('minecraft:mossy_cobblestone_wall' in palette));
  assert.ok(size < 127, 'one VarInt byte per cell keeps the edit simple');
  palette['minecraft:mossy_cobblestone_wall'] = { type: 'int', value: size };
  const air = new Set(Object.entries(palette).filter(([k]) => k.startsWith('minecraft:air')).map(([, v]) => v.value));
  const data = [...s.Blocks.value.Data.value];
  const victim = data.findIndex(v => !air.has(v));
  data[victim] = size;
  const W = s.Width.value, L = s.Length.value;
  const local = [victim % W, Math.floor(victim / (W * L)), Math.floor(victim / W) % L];
  const tag = { type: 'compound', value: { Schematic: { type: 'compound', value: {
    ...s, Metadata: { type: 'compound', value: { ...s.Metadata.value, Bauplaner: { type: 'compound', value: meta } } },
    Blocks: { type: 'compound', value: { ...s.Blocks.value, Palette: { type: 'compound', value: palette }, Data: { type: 'byteArray', value: data } } },
  } } } };
  const out = join(dir, projectId ? 'fremd.schem' : 'aufnahme.schem');
  writeFileSync(out, gzipSync(writeNbt({ name: root.name, tag })));
  const min = b.ProjectMin.value;
  return { file: out, world: local.map((v, i) => v + min[i]) };
}

test('Bauen: Spielaufnahme importieren, Abweichung finden, bestätigte Schritte ausdrücklich abhaken', async () => {
  const p = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  p.setDefaultTimeout(15_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(BASE);
  await p.getByRole('button', { name: 'Beispielprojekt „Burgmauer“' }).click();
  await p.waitForURL(/#\/projekt\//);

  await p.getByRole('link', { name: 'Export' }).click();
  await p.getByLabel('DataVersion (Zielversion)').fill('4189');
  const [d] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Revision einfrieren und .schem exportieren' }).click()]);
  const plan = join(dir, 'plan.schem');
  await d.saveAs(plan);
  const rec = recordingFromPlan(plan);

  await p.getByRole('link', { name: 'Bauen' }).click();
  await p.waitForURL(/\/bauen$/);
  await p.getByText('Noch keine Aufnahme.').waitFor();
  await p.locator('.game-check input[type=file]').setInputFiles(rec.file);
  await p.getByText(/Revision 1 · aufgenommen|Revision 1 ·/).first().waitFor();
  assert.equal(await p.locator('.build-basis select').inputValue() !== 'working', true, 'basis switched to the recorded revision');
  const summary = await p.locator('.game-check-head small').innerText();
  const [, ok, all] = summary.match(/([\d.]+) von ([\d.]+) Blöcken korrekt/).map(x => x.replace(/\./g, ''));
  assert.equal(Number(ok), Number(all) - 1);
  assert.match(await p.locator('.game-counts').innerText(), /1 falscher Block/);
  assert.ok(await p.locator('.step-item .badge.game.danger').count() === 1, 'exactly one step deviates');
  assert.ok(await p.locator('.step-item .badge.game.ok').count() > 10);

  // The deviating step names the cell and marks it in the layer plan.
  await p.locator('.step-item', { has: p.locator('.badge.game.danger') }).click();
  const detail = await p.locator('.game-step').innerText();
  assert.match(detail, new RegExp(`X ${rec.world[0]} · Y ${rec.world[1]} · Z ${rec.world[2]}: falscher Block`));
  assert.match(detail, /im Spiel minecraft:mossy_cobblestone_wall/);
  assert.equal(await p.locator('.layer-plan rect.dev').count(), 1);

  // Ticking happens only on the explicit button and is undoable like any other tick.
  assert.match(await p.locator('.build-progress strong').first().innerText(), /^0 \//);
  const tickButton = p.getByRole('button', { name: /im Spiel bestätigte Schritte abhaken/ });
  const n = Number((await tickButton.innerText()).match(/^(\d+)/)[1]);
  await tickButton.click();
  await p.locator('.build-progress strong').first().filter({ hasText: new RegExp(`^${n} /`) }).waitFor();
  await p.getByRole('button', { name: 'Keine weiteren bestätigten Schritte zum Abhaken' }).waitFor();

  // A recording of another project is refused with a readable message.
  const foreign = recordingFromPlan(plan, { projectId: 'prj_fremd' });
  await p.locator('.game-check input[type=file]').setInputFiles(foreign.file);
  await p.getByText(/gehört zu einem anderen Projekt/).waitFor();
  // A plan file is not a recording.
  await p.locator('.game-check input[type=file]').setInputFiles(plan);
  await p.getByText(/Plan-Datei aus dem Export, keine Spielaufnahme/).waitFor();
  assert.deepEqual(errors, []);
  await p.close();
});

test('Bauen mobil: Abgleich bleibt bedienbar', async () => {
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await p.goto(BASE);
  await p.getByRole('button', { name: 'Beispielprojekt „Burgmauer“' }).click();
  await p.waitForURL(/#\/projekt\//);
  await p.getByRole('link', { name: 'Bauen' }).click();
  const button = p.locator('.game-check .file-button');
  await button.waitFor();
  const box = await button.boundingBox();
  assert.ok(box.x >= 0 && box.x + box.width <= 390, 'import button fits the phone width');
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= 390), 'no horizontal scroll');
  await p.close();
});
