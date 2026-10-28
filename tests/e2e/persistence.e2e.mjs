// Browser check of durable storage (B3): IndexedDB survives reloads, two tabs
// conflict on baseRevision, originals are stored and backups restore without
// silent overwrites. Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4182, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

async function open(context, hash = '') {
  const p = await context.newPage();
  p.setDefaultTimeout(10_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(BASE + hash);
  return { p, errors };
}
const newContext = () => browser.newContext({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
const sampleName = 'Burgmauer (Beispiel)';

async function createSample(p) {
  await p.getByRole('button', { name: 'Beispielprojekt „Burgmauer“' }).click();
  await p.waitForURL(/#\/projekt\//);
  await p.getByText('✓ Geometrisch konfliktfrei').waitFor();
  await p.locator('.save-state.saved').waitFor();
}

async function downloadBackup(p, button) {
  const [download] = await Promise.all([p.waitForEvent('download'), button.click()]);
  const path = await download.path();
  return { name: download.suggestedFilename(), text: await readFile(path, 'utf8'), path };
}

test('Projekt überlebt Neuladen; Projektliste anderer Tabs aktualisiert sich', async () => {
  const context = await newContext();
  const { p, errors } = await open(context);
  await p.getByText('Lokal in diesem Browser gespeichert').waitFor();
  const other = await open(context);
  await createSample(p);
  const url = p.url();
  // Second tab on the project list sees the new project via BroadcastChannel without reload.
  await other.p.getByRole('link', { name: sampleName }).waitFor();
  await p.getByRole('button', { name: /Mauer 1/ }).click();
  await p.getByRole('button', { name: 'X minus 1' }).click();
  await p.getByText('⚠ Offene Punkte vor einem baubaren Export').waitFor();
  await p.locator('.save-state.saved').waitFor();
  await p.reload();
  await p.getByText('⚠ Offene Punkte vor einem baubaren Export').waitFor();
  assert.equal(p.url(), url);
  assert.equal(await p.locator('.instance-list li').count(), 5);
  await p.goto(BASE);
  await p.getByRole('link', { name: sampleName }).waitFor();
  assert.match(await p.locator('.card', { hasText: sampleName }).innerText(), /Speicherrevision\s*\n?\s*2/);
  assert.deepEqual([...errors, ...other.errors], []);
  await context.close();
});

test('Zwei Tabs: späteres Speichern auf alter Basis wird als Konflikt gemeldet, nichts überschrieben', async () => {
  const context = await newContext();
  const a = await open(context);
  await createSample(a.p);
  const b = await open(context, new URL(a.p.url()).hash);
  await b.p.getByText('✓ Geometrisch konfliktfrei').waitFor();
  await a.p.getByRole('button', { name: /Mauer 1/ }).click();
  await a.p.getByRole('button', { name: 'X minus 1' }).click();
  await a.p.locator('.save-state.saved').waitFor();
  await b.p.getByRole('button', { name: /Turm Ost/ }).click();
  await b.p.getByRole('button', { name: '✕ Entfernen' }).click();
  await b.p.getByText('Gespeicherter Stand wurde zwischenzeitlich geändert.').waitFor();
  assert.match(await b.p.locator('.save-state').innerText(), /Konflikt mit anderem Tab/);
  await b.p.getByRole('button', { name: 'Gespeicherten Stand laden' }).click();
  // Tab A's change won; tab B's removal was not written.
  await b.p.getByText('⚠ Offene Punkte vor einem baubaren Export').waitFor();
  assert.equal(await b.p.locator('.instance-list li').count(), 5);
  await a.p.reload();
  await a.p.getByText('⚠ Offene Punkte vor einem baubaren Export').waitFor();
  assert.equal(await a.p.locator('.instance-list li').count(), 5);
  assert.deepEqual([...a.errors, ...b.errors], []);
  await context.close();
});

test('Originaldatei, Sicherung und Wiederherstellung in leerem Browser', async () => {
  const context = await newContext();
  const { p, errors } = await open(context, '#/bibliothek');
  const bytes = Buffer.from(await p.evaluate(async url => Array.from(new Uint8Array(await (await fetch(url)).arrayBuffer())), `${BASE}examples/contract-v3.schem`));
  const sha = createHash('sha256').update(bytes).digest('hex');
  await p.locator('input[type=file]').setInputFiles({ name: 'vertrag.schem', mimeType: 'application/octet-stream', buffer: bytes });
  await p.getByText('DATEI GEPRÜFT').waitFor();
  await p.getByLabel('Name').fill('Vertragsbauteil');
  await p.getByRole('button', { name: 'Als neues Bauteil speichern' }).click();
  await p.getByText('„Vertragsbauteil“ als Bauteil gespeichert.').waitFor();
  await p.reload();
  await p.getByRole('heading', { name: 'Vertragsbauteil' }).waitFor();
  await p.goto(BASE);
  await createSample(p);
  await p.goto(BASE);
  await p.getByRole('link', { name: sampleName }).waitFor();

  const full = await downloadBackup(p, p.getByRole('button', { name: 'Alles sichern' }));
  assert.match(full.name, /^bauplaner-alle-projekte-\d{4}-\d{2}-\d{2}\.bauplaner\.json$/);
  const json = JSON.parse(full.text);
  assert.equal(json.projects.length, 1);
  assert.ok(json.assets.some(a => a.name === 'Vertragsbauteil'));
  assert.equal(json.originals.length, 1);
  assert.equal(json.originals[0].sha256, sha);
  assert.equal(Buffer.from(json.originals[0].base64, 'base64').equals(bytes), true, 'original bytes unchanged');

  // Fresh browser profile: restore, verify, reload.
  const fresh = await newContext();
  const r = await open(fresh);
  await r.p.getByLabel('Sicherung wiederherstellen …').setInputFiles(full.path);
  await r.p.getByText('WIEDERHERSTELLUNG PRÜFEN').waitFor();
  assert.match(await r.p.locator('.restore-plan').innerText(), /Burgmauer \(Beispiel\) · neu/);
  assert.equal(await r.p.locator('.card', { hasText: sampleName }).count(), 0, 'nothing written before confirmation');
  await r.p.getByRole('button', { name: 'Wiederherstellen', exact: true }).click();
  await r.p.getByText(/^Wiederhergestellt\./).waitFor();
  await r.p.reload();
  await r.p.getByRole('link', { name: sampleName }).click();
  await r.p.getByText('✓ Geometrisch konfliktfrei').waitFor();
  await r.p.goto(`${BASE}#/bibliothek`);
  await r.p.getByLabel('Bauteile suchen').fill('vertrag');
  await r.p.getByRole('link', { name: /Vertragsbauteil/ }).waitFor();

  // Second restore: identical project is skipped, nothing duplicated.
  await r.p.goto(BASE);
  await r.p.getByLabel('Sicherung wiederherstellen …').setInputFiles(full.path);
  assert.match(await r.p.locator('.restore-plan').innerText(), /identisch vorhanden/);
  await r.p.getByRole('button', { name: 'Wiederherstellen', exact: true }).click();
  await r.p.getByText(/^Wiederhergestellt\./).waitFor();
  assert.equal(await r.p.locator('.card', { hasText: sampleName }).count(), 1);

  // Local project changed afterwards: default is a copy, the local one stays.
  await r.p.getByRole('link', { name: sampleName }).click();
  await r.p.getByRole('button', { name: /Mauer 1/ }).click();
  await r.p.getByRole('button', { name: '✕ Entfernen' }).click();
  await r.p.locator('.save-state.saved').waitFor();
  await r.p.goto(BASE);
  await r.p.getByLabel('Sicherung wiederherstellen …').setInputFiles(full.path);
  assert.match(await r.p.locator('.restore-plan').innerText(), /weicht lokal ab/);
  assert.equal(await r.p.getByLabel(`Vorgehen für ${sampleName}`).inputValue(), 'copy');
  await r.p.getByRole('button', { name: 'Wiederherstellen', exact: true }).click();
  await r.p.locator('.notice', { hasText: 'als Kopie' }).waitFor();
  await r.p.getByRole('link', { name: /Burgmauer \(Beispiel\) \(Wiederhergestellt/ }).waitFor();
  const localCard = r.p.locator('.card').filter({ has: r.p.getByRole('link', { name: sampleName, exact: true }) });
  assert.match(await localCard.innerText(), /Instanzen\s*\n?\s*4/, 'local project keeps its own change');

  // Tampered file is rejected and nothing changes.
  const tampered = full.text.replace('"name":"Burgmauer (Beispiel)"', '"name":"Manipuliert"');
  assert.notEqual(tampered, full.text);
  await r.p.getByLabel('Sicherung wiederherstellen …').setInputFiles({ name: 'kaputt.bauplaner.json', mimeType: 'application/json', buffer: Buffer.from(tampered) });
  await r.p.getByText(/Sicherung nicht lesbar – nichts geändert: Prüfsumme/).waitFor();
  assert.equal(await r.p.locator('.restore-plan').count(), 0);

  // Single project backup from its card.
  const single = await downloadBackup(r.p, r.p.locator('.card', { hasText: 'Wiederhergestellt' }).getByRole('button', { name: 'Sichern' }));
  assert.equal(JSON.parse(single.text).projects.length, 1);
  assert.deepEqual([...errors, ...r.errors], []);
  await fresh.close();
  await context.close();
});
