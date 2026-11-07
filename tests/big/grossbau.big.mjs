// SIZE-01-S05: automatic acceptance of DATEI-05, WERK-07 and LIVE-02 (with LIVE-09) with a real big build in Chromium
// against the built Pages artifact (`npm run build` first). Not part of `npm run test:e2e` (several minutes):
//   node scripts/size/big_build.mjs <dir> && node tests/big/grossbau.big.mjs <dir>
// <dir> holds grossstadt.litematic/.json and zu-gross.litematic. Without BAUPLANER_MOD_PORT the test pairs with the
// mod stand-in (tests/e2e/modSimulator.mjs); scripts/size/test_grossbau_ingame.sh sets BAUPLANER_MOD_PORT and lets
// the real mod in a running Minecraft 26.3 receive the plan (pairing code from <dir>/pair-code.txt).
// Writes <dir>/browser.json: duration, longest frame gap of the page and peak memory per step.
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { importLitematic } from '../../dist/formats/src/index.js';
import { startModSimulator } from '../e2e/modSimulator.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const dir = process.argv[2];
if (!dir) throw new Error('usage: grossbau.big.mjs <dir>');
const PORT = Number(process.env.BAUPLANER_WEB_PORT ?? 4311), BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
const realMod = process.env.BAUPLANER_MOD_PORT ? Number(process.env.BAUPLANER_MOD_PORT) : null;
const meta = JSON.parse(readFileSync(join(dir, 'grossstadt.json'), 'utf8'));
const de = n => n.toLocaleString('de-DE');
const results = { started: new Date().toISOString(), file: meta, realMod: !!realMod, steps: {} };

/** Sum of the resident memory of every Chromium process (MB), sampled by the step timer. */
function chromeRss() {
  try {
    const out = execFileSync('ps', ['-eo', 'rss,comm'], { encoding: 'utf8' });
    return Math.round(out.split('\n').filter(l => /chrome|headless_shell/.test(l)).reduce((s, l) => s + Number(l.trim().split(/\s+/)[0] || 0), 0) / 1024);
  } catch { return 0; }
}

let page;
/** Runs one step: wall time, longest gap between two animation frames of the page (did it freeze?), peak RSS and JS heap. */
async function step(name, fn) {
  await page.evaluate(() => { window.__gap = { max: 0, last: performance.now() }; const f = () => { const n = performance.now(); window.__gap.max = Math.max(window.__gap.max, n - window.__gap.last); window.__gap.last = n; requestAnimationFrame(f); }; if (!window.__gapLoop) { window.__gapLoop = true; requestAnimationFrame(f); } });
  let peak = chromeRss();
  const timer = setInterval(() => { peak = Math.max(peak, chromeRss()); }, 500);
  const t0 = performance.now();
  try { await fn(); } finally { clearInterval(timer); }
  const ms = Math.round(performance.now() - t0);
  const gap = Math.round(await page.evaluate(() => window.__gap.max));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable').catch(() => {});
  const { metrics } = await cdp.send('Performance.getMetrics').catch(() => ({ metrics: [] }));
  await cdp.detach().catch(() => {});
  const heap = Math.round((metrics.find(m => m.name === 'JSHeapUsedSize')?.value ?? 0) / 1e6);
  results.steps[name] = { ms, maxFrameGapMs: gap, peakChromeRssMb: Math.max(peak, chromeRss()), jsHeapMb: heap };
  console.log(`  ${name}: ${(ms / 1000).toFixed(1)} s, längste Bildpause ${gap} ms, Speicher Chromium ${results.steps[name].peakChromeRssMb} MB (JS ${heap} MB)`);
}

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
let browser, sim;
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
  page = await context.newPage();
  page.setDefaultTimeout(240_000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const p = page;
  // ---------------------------------------------------------------- Pairing first (the game's code is valid 5 minutes)
  let code;
  if (realMod) {
    for (let i = 0; i < 600 && !existsSync(join(dir, 'pair-code.txt')); i++) await new Promise(r => setTimeout(r, 1000));
    code = readFileSync(join(dir, 'pair-code.txt'), 'utf8').trim();
  } else {
    sim = await startModSimulator(47695, { features: ['scan', 'bigplans'] });
    sim.openPairing();
    code = '482913';
  }
  const modPort = realMod ?? 47695;
  await p.goto(`${BASE}#/karte`);
  await p.locator('.map-page[data-map-state=ready]').waitFor();
  const game = p.getByRole('region', { name: 'Spielverbindung' });
  if (!(await game.getByLabel('Port der Mod').isVisible().catch(() => false))) await game.getByText('Port', { exact: true }).click();
  await game.getByLabel('Port der Mod').fill(String(modPort));
  await game.getByRole('button', { name: 'Verbinden' }).click();
  const connected = game.locator('[data-live-phase=connected]').or(p.locator('.live-game[data-live-phase=connected]')).first();
  if (realMod) {
    // LINK-03: the real mod asks the player to allow the planner (the game test does that), no code needed.
    writeFileSync(join(dir, 'verbinden.txt'), new Date().toISOString());
    await connected.waitFor({ timeout: 120_000 });
    results.pairing = 'Klick-Freigabe im Spiel';
  } else {
    await game.getByText('Mod gefunden, nicht gekoppelt').waitFor();
    await game.getByLabel('Code').fill(code);
    await game.getByRole('button', { name: 'Koppeln' }).click();
    await connected.waitFor();
    results.pairing = 'Code';
  }
  const big = readFileSync(join(dir, 'grossstadt.litematic'));
  await p.goto(`${BASE}#/bibliothek`);
  await p.locator('input[type=file]').first().waitFor({ state: 'attached' });

  // ---------------------------------------------------------------- DATEI-05: too big, cancel, load, save
  await step('zuGross', async () => {
    await p.locator('input[type=file]').first().setInputFiles({ name: 'zu-gross.litematic', mimeType: 'application/octet-stream', buffer: readFileSync(join(dir, 'zu-gross.litematic')) });
    const msg = p.getByText(/Import nicht übernommen/);
    await msg.waitFor();
    results.tooBigMessage = (await msg.innerText()).trim();
    assert.match(results.tooBigMessage, /4,2 Mio\. Blöcke/, 'nennt die Blockzahl der Datei');
    assert.match(results.tooBigMessage, /teilen/, 'rät, die Datei zu teilen');
  });
  await step('importAbbrechen', async () => {
    await p.locator('input[type=file]').first().setInputFiles({ name: 'grossstadt.litematic', mimeType: 'application/octet-stream', buffer: big });
    await p.locator('.job-status').getByRole('button', { name: 'Abbrechen' }).click();
    await p.getByText('Import abgebrochen.').waitFor();
    assert.equal(await p.getByText('DATEI GEPRÜFT').count(), 0);
  });
  await step('import', async () => {
    await p.locator('input[type=file]').first().setInputFiles({ name: 'grossstadt.litematic', mimeType: 'application/octet-stream', buffer: big });
    await p.getByText('DATEI GEPRÜFT').waitFor();
  });
  const inspector = await p.locator('.inspector').innerText();
  assert.match(inspector, new RegExp(`600 × ${meta.box[1]} × 600 · ${de(meta.blocks).replace(/\./g, '\\.')} Blöcke`));
  assert.match(inspector, /Luftzellen sind nicht als Zellen übernommen/, 'der Bericht sagt, dass nur Blöcke übernommen sind');
  assert.doesNotMatch(inspector, /Bauvolumen überschreitet/);
  await step('alsBauteilSpeichern', async () => {
    await p.getByRole('button', { name: 'Als neues Bauteil speichern' }).click();
    await p.getByText('„Grossstadt“ als Bauteil gespeichert.').waitFor();
    await p.waitForURL(/#\/bibliothek\/gebaeude\//);
  });
  const detail = p.url();

  // ---------------------------------------------------------------- WERK-07: big model in the workshop
  await step('werkstattOeffnen', async () => {
    await p.getByRole('link', { name: /Blöcke bearbeiten/ }).click();
    await p.waitForURL(/#\/werkstatt\/av_/);
    await p.locator('.editor-stats').waitFor();
  });
  const notice = p.locator('.size-notice').first();
  await notice.waitFor();
  results.workshopNotice = { level: await notice.getAttribute('data-size-level'), text: (await notice.innerText()).trim() };
  assert.ok(['gross', 'sehr-gross'].includes(results.workshopNotice.level), JSON.stringify(results.workshopNotice));
  const stats = async () => (await p.locator('.editor-stats').innerText()).trim().split(' · ')[0];
  const before = await stats();
  // Fill a big area: every grass block of the ground plate becomes moss (one step, several hundred thousand cells).
  await p.getByLabel('Blöcke suchen').fill('moss_block');
  await p.locator('.block-tile', { hasText: /Moos/ }).first().click();
  await p.getByLabel('Zu ersetzender Block').selectOption('minecraft:grass_block');
  const replaceButton = p.getByRole('button', { name: /Zellen ersetzen$/ });
  const replaced = Number((await replaceButton.innerText()).replace(/\D/g, ''));
  results.workshopReplaced = replaced;
  assert.ok(replaced > 300_000, `großer Bereich: ${replaced}`);
  await step('werkstattFuellen', async () => {
    await replaceButton.click();
    await p.locator('.editor-message', { hasText: `Ersetzen: ${de(replaced)} Zellen` }).waitFor();
    await p.waitForFunction(n => document.querySelector('.editor-stats')?.textContent?.includes(`~${n}`), de(replaced));
  });
  await step('werkstattRueckgaengig', async () => {
    await p.getByRole('button', { name: /Rückgängig/ }).first().click();
    await p.waitForFunction(() => document.querySelector('.editor-stats')?.textContent?.includes('~0'));
  });
  await step('werkstattWiederholen', async () => {
    await p.keyboard.press('Control+y');
    await p.waitForFunction(n => document.querySelector('.editor-stats')?.textContent?.includes(`~${n}`), de(replaced));
  });
  assert.equal(await stats(), before, 'Ersetzen ändert die Zellzahl nicht');
  await step('werkstattSpeichern', async () => {
    await p.getByRole('button', { name: 'Als Version 2.0 speichern' }).click();
    await p.locator('.notice.success', { hasText: 'Version 2.0' }).waitFor();
  });

  // ---------------------------------------------------------------- DATEI-05: into a project
  await step('projektAnlegen', async () => {
    await p.goto(detail);
    await p.getByRole('button', { name: 'Neues Projekt damit starten' }).click();
    await p.waitForURL(/#\/projekt\//);
    await p.waitForFunction(() => [...document.querySelectorAll('.canvas-host')].some(h => h.dataset.mesh === 'ready' && Number(h.dataset.blocks) > 1_000_000), null, { timeout: 300_000 });
  });
  const projectUrl = p.url().replace(/(#\/projekt\/[^/?]+).*$/, '$1');

  // ---------------------------------------------------------------- Export of the big project (.litematic)
  await p.getByRole('link', { name: 'Export' }).click();
  await p.getByText('✓ Exportbereit').waitFor();
  await p.getByLabel('Dateiformat').selectOption('litematic');
  await p.getByLabel('DataVersion (Zielversion)').fill('5023');
  let exported;
  await step('exportLitematic', async () => {
    const [d] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Revision einfrieren und .litematic exportieren' }).click()]);
    exported = join(dir, 'export-grossstadt.litematic');
    await d.saveAs(exported);
    await p.getByText('DATEI ERZEUGT').waitFor();
  });
  const back = readFileSync(exported);
  const re = await importLitematic(back.buffer.slice(back.byteOffset, back.byteOffset + back.byteLength));
  results.export = { bytes: back.length, blocks: re.payload.cells.filter(c => c.kind === 'block').length, moss: 0 };
  const mossIndex = re.payload.palette.map((s, i) => s.id === 'minecraft:moss_block' ? i : -1).filter(i => i >= 0);
  results.export.moss = re.payload.cells.filter(c => mossIndex.includes(c.paletteIndex)).length;
  assert.equal(results.export.blocks, meta.blocks, 'die exportierte Datei enthält jeden Block');
  const src = await importLitematic(big.buffer.slice(big.byteOffset, big.byteOffset + big.byteLength));
  const srcMoss = src.payload.palette.map((s, i) => s.id === 'minecraft:moss_block' ? i : -1).filter(i => i >= 0);
  const mossBefore = src.payload.cells.filter(c => srcMoss.includes(c.paletteIndex)).length;
  const grassIndex = re.payload.palette.map((s, i) => s.id === 'minecraft:grass_block' ? i : -1).filter(i => i >= 0);
  assert.equal(re.payload.cells.filter(c => grassIndex.includes(c.paletteIndex)).length, 0, 'kein Grasblock mehr: Version 2.0 steckt im Projekt');
  assert.equal(results.export.moss, mossBefore + replaced, 'Moos = Moos der Gebäude + ersetzter Boden');

  // ---------------------------------------------------------------- LIVE-02/LIVE-09: send to the game
  await p.goto(`${BASE}#/karte`);
  await p.locator('.map-page[data-map-state=ready]').waitFor();
  await game.locator('[data-live-phase=connected]').or(p.locator('.live-game[data-live-phase=connected]')).first().waitFor();
  results.modHello = (await game.innerText()).split('\n').find(l => /Mod \d/.test(l)) ?? '';
  const list = p.getByRole('complementary', { name: 'Projekte auf der Karte' });
  // The new project is not on the map yet: place it where the player stands in the game (button of „Noch nicht platziert“).
  await list.getByRole('button', { name: /Wo ich stehe/ }).first().click();
  await list.getByRole('button', { name: /Grossstadt/ }).first().click();
  const sendButton = p.getByRole('button', { name: '▶ Ins Spiel senden' });
  await sendButton.waitFor();
  writeFileSync(join(dir, 'senden.txt'), new Date().toISOString());
  await step('senden', async () => {
    await sendButton.click();
    await p.getByRole('status').filter({ hasText: /von der Website platziert.* Revision \d+\./ }).waitFor({ timeout: 600_000 });
  });
  results.sendNotice = (await p.getByRole('status').filter({ hasText: /platziert/ }).first().innerText()).trim();
  assert.match(results.sendNotice, /Großer Plan \(/, 'Hinweis „Großer Plan …“ beim Senden');
  const origin = /Ursprung\s+X (-?\d+) · Y (-?\d+) · Z (-?\d+)/.exec(await p.locator('.map-detail').innerText());
  assert.ok(origin, 'Ursprung des Projekts auf der Karte');
  results.mapOrigin = origin.slice(1, 4).map(Number);
  if (sim) {
    const sent = sim.state.plans.at(-1);
    assert.match(sent.name, /^grossstadt.*\.schem$/);
    results.simulatorPlanBytes = sent.bytes ?? null;
  }
  results.errors = errors;
  assert.deepEqual(errors, []);
  results.finished = new Date().toISOString();
  writeFileSync(join(dir, 'browser.json'), JSON.stringify(results, null, 1));
  console.log(`Browser-Großbau bestanden (${realMod ? 'echte Mod' : 'Mod-Stellvertreter'}): ${de(meta.blocks)} Blöcke importiert, bearbeitet, exportiert und gesendet.`);
} catch (e) {
  writeFileSync(join(dir, 'browser-fehler.txt'), String(e?.stack ?? e));
  try { await page?.screenshot({ path: join(dir, 'browser-fehler.png') }); } catch {}
  throw e;
} finally {
  await browser?.close();
  await sim?.close();
  server.kill();
}
