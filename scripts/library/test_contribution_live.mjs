// BIB-15 Teil 3 (Block B, 07.11.2026): ein Bibliotheksbeitrag läuft den ganzen Weg. Im Browser wird aus einer eigenen
// .litematic ein Beitragspaket; `library_intake.mjs add --root` übernimmt es in einen frischen Checkout (git worktree vom
// aktuellen Stand, kein Eingriff in diesen Checkout); dort wird die Seite gebaut. Ein frischer Browser findet den Beitrag
// über die Suche „beitrag“, sieht „Bibliotheksbeitrag von …“ und genau die eingereichten Blöcke, übernimmt ihn in ein
// Projekt, zeigt die Materialliste und exportiert ihn als .litematic – die Datei trägt dieselben Blöcke wie das Paket.
//
//   npm run build && node --test scripts/library/test_contribution_live.mjs
//
// Dauert wegen des zweiten Builds 1–3 Minuten; nicht Teil von `npm run test:e2e`. Braucht git und Playwright.
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, symlinkSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readContribution } from '../../dist/domain/src/index.js';
import { importStructure } from '../../dist/formats/src/index.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const PORT_A = 4397, PORT_B = 4398;
const base = port => `http://127.0.0.1:${port}/Minecraft-Bauplaner/`;
const work = mkdtempSync(join(tmpdir(), 'bib15-'));
const tree = join(work, 'checkout');
const servers = [];
let browser;

after(async () => {
  await browser?.close();
  for (const s of servers) s.kill();
  try { execFileSync('git', ['worktree', 'remove', '--force', tree], { cwd: ROOT, stdio: 'ignore' }); } catch { /* not created */ }
  rmSync(work, { recursive: true, force: true });
});

async function serve(cwd, port) {
  const s = spawn(process.execPath, [join(ROOT, 'node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd, stdio: 'ignore' });
  servers.push(s);
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(base(port))).ok) return; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`Vorschau auf ${port} startet nicht`);
}
async function page(viewport = { width: 1400, height: 1000 }) {
  const context = await browser.newContext({ viewport, acceptDownloads: true });
  const p = await context.newPage();
  p.setDefaultTimeout(30_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|clipboard/i.test(m.text())) errors.push(m.text()); });
  p.on('dialog', d => void d.accept());
  return { p, context, errors };
}
const blockCounts = payload => {
  const out = {};
  for (const c of payload.cells) if (c.kind === 'block') { const id = payload.palette[c.paletteIndex].id; out[id] = (out[id] ?? 0) + 1; }
  return Object.fromEntries(Object.entries(out).sort());
};

test('BIB-15: Beitrag einreichen, übernehmen, in frischem Browser finden, ins Projekt übernehmen und exportieren', { timeout: 600_000 }, async () => {
  await serve(ROOT, PORT_A);
  browser = await chromium.launch();

  // 1. Einreichen wie ein Spieler: eigene .litematic als Bauteil, Paket aus dem Gebäudeblatt.
  const A = await page();
  await A.p.goto(`${base(PORT_A)}#/bibliothek`);
  const raw = Buffer.from(readFileSync(join(ROOT, 'fixtures/litematic/realworld.nbt.hex'), 'utf8').replace(/\s/g, ''), 'hex');
  await A.p.locator('input[type=file]').first().setInputFiles({ name: 'rathaus.litematic', mimeType: 'application/octet-stream', buffer: raw });
  await A.p.getByText('DATEI GEPRÜFT').waitFor();
  await A.p.getByRole('button', { name: 'Als neues Bauteil speichern' }).click();
  await A.p.getByText('„rathaus“ als Bauteil gespeichert.').waitFor();
  await A.p.getByRole('link', { name: /Steckbrief|Zum Bauteil/ }).first().click().catch(() => {});
  const assetId = await A.p.evaluate(() => new Promise((ok, fail) => {
    const r = indexedDB.open('minecraft-bauplaner');
    r.onsuccess = () => { const q = r.result.transaction('assets').objectStore('assets').getAll(); q.onsuccess = () => ok(q.result.find(a => a.name === 'rathaus' && !a.demo)?.id); q.onerror = () => fail(q.error); };
    r.onerror = () => fail(r.error);
  }));
  await A.p.goto(`${base(PORT_A)}#/bibliothek/gebaeude/${encodeURIComponent(assetId)}`);
  await A.p.getByRole('button', { name: '⇪ In Bibliothek einreichen' }).click();
  const panel = A.p.getByRole('region', { name: 'In Bibliothek einreichen' });
  await panel.getByRole('button', { name: '⇪ Beitrag vorbereiten …' }).click();
  const form = panel.locator('form.contribute-form');
  await form.getByLabel('Name', { exact: true }).fill('Rathaus Abnahme');
  await form.getByLabel('Autor oder Erbauer').fill('Philipp');
  await form.getByRole('checkbox', { name: /selbst gebaut oder habe die Erlaubnis/ }).check();
  const [download] = await Promise.all([A.p.waitForEvent('download'), form.getByRole('button', { name: '↓ Beitragspaket erstellen' }).click()]);
  const pkgFile = join(work, download.suggestedFilename());
  await download.saveAs(pkgFile);
  const pkg = await readContribution(JSON.parse(readFileSync(pkgFile, 'utf8')));
  const id = pkg.meta.id ?? download.suggestedFilename().replace('.bauplaner-beitrag.json', '');
  const submitted = blockCounts(pkg.payload);
  assert.deepEqual(A.errors, []);
  await A.context.close();

  // 2. Übernahme mit dem Skript in einen frischen Checkout, dort bauen.
  execFileSync('git', ['worktree', 'add', '--detach', tree, 'HEAD'], { cwd: ROOT, stdio: 'ignore' });
  symlinkSync(join(ROOT, 'node_modules'), join(tree, 'node_modules'));
  const added = execFileSync(process.execPath, [join(ROOT, 'scripts/library/library_intake.mjs'), 'add', pkgFile, '--root', tree], { cwd: ROOT, encoding: 'utf8' });
  console.log(`# Übernahme: ${added.trim().split('\n').slice(-2).join(' · ')}`);
  assert.ok(existsSync(join(tree, 'packages/domain/src/catalog/community/entries', `${id}.ts`)), 'Eintrag geschrieben');
  execFileSync('npm', ['run', 'build'], { cwd: tree, stdio: 'ignore', timeout: 480_000 });
  await serve(tree, PORT_B);

  // 3. Frischer Browser: suchen, öffnen, Herkunft und Blöcke, ins Projekt, Material, Export.
  const B = await page();
  await B.p.goto(base(PORT_B));
  await B.p.locator('#projekt-name').fill('Mit Beitrag');
  await B.p.getByRole('button', { name: '＋ Leeres Projekt anlegen' }).click();
  await B.p.waitForURL(/#\/projekt\//);
  await B.p.goto(`${base(PORT_B)}#/bibliothek`);
  const search = B.p.getByRole('searchbox', { name: 'Bauteile suchen' });
  await search.waitFor({ timeout: 90_000 });
  await search.fill('beitrag');
  const hit = B.p.locator('.catalog-results > li').filter({ hasText: 'Rathaus Abnahme' });
  await hit.first().waitFor();
  await hit.first().getByRole('link').first().click();
  await B.p.locator('.building-detail').waitFor();
  await B.p.getByText('Bibliotheksbeitrag von Philipp').waitFor();
  const target = B.p.locator('.building-detail select').filter({ has: B.p.locator('option', { hasText: 'Mit Beitrag' }) }).first();
  if (await target.count()) await target.selectOption({ label: 'Mit Beitrag' });
  await B.p.getByRole('button', { name: '＋ Ins Projekt übernehmen' }).click();
  await B.p.getByText(/„Rathaus Abnahme“ in „Mit Beitrag“ eingefügt/).waitFor();
  await B.p.getByRole('link', { name: 'Zum Editor →' }).click();
  await B.p.waitForURL(/#\/projekt\//);
  await B.p.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name: 'Material', exact: true }).click();
  await B.p.getByText(/Inventarplätze/).first().waitFor();
  await B.p.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name: 'Export', exact: true }).click();
  await B.p.getByText('✓ Exportbereit').waitFor();
  await B.p.getByLabel('Dateiformat').selectOption('litematic');
  const dv = B.p.getByLabel('DataVersion (Zielversion)');
  if (!(await dv.inputValue())) await dv.fill('5023');
  const [d] = await Promise.all([B.p.waitForEvent('download'), B.p.getByRole('button', { name: 'Revision einfrieren und .litematic exportieren' }).click()]);
  const out = join(work, d.suggestedFilename());
  await d.saveAs(out);
  const buf = readFileSync(out);
  const exported = (await importStructure(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))).result.payload;
  assert.deepEqual(blockCounts(exported), submitted, 'Export trägt genau die eingereichten Blöcke');
  console.log(`# BIB-15: ${id} – ${Object.values(submitted).reduce((a, n) => a + n, 0)} Blöcke eingereicht = exportiert`);
  assert.deepEqual(B.errors, []);
  await B.context.close();
});
