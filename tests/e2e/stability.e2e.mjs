// Browser checks for stability work (S-01…S-04): import preview framing, Systemcheck page, data check on a
// deliberately damaged record and the error log. Runs against the built Pages artifact.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4186, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

async function page(viewport = { width: 1400, height: 1000 }) {
  const context = await browser.newContext({ viewport });
  const p = await context.newPage();
  p.setDefaultTimeout(15_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  return { p, errors, context };
}

for (const viewport of [{ width: 1400, height: 1000 }, { width: 400, height: 860 }]) {
  test(`Import-Vorschau bleibt im Bild (${viewport.width} px): 3D-Fläche wächst nicht mit dem Importbericht`, async () => {
    const { p, errors, context } = await page(viewport);
    await p.goto(`${BASE}#/bibliothek`);
    const bytes = Buffer.from(await p.evaluate(async url => Array.from(new Uint8Array(await (await fetch(url)).arrayBuffer())), `${BASE}examples/contract-multiregion.litematic`));
    await p.locator('input[type=file]').setInputFiles({ name: 'mehrregionen.litematic', mimeType: 'application/octet-stream', buffer: bytes });
    await p.getByText('DATEI GEPRÜFT').waitFor();
    const stage = await p.locator('.import-hero .detail-stage').boundingBox();
    assert.ok(stage.height <= viewport.height, `3D-Fläche ${stage.height} px höher als das Fenster ${viewport.height} px`);
    // The camera targets the centre of the canvas; that centre must be visible after scrolling the stage into view.
    await p.locator('.import-hero .detail-stage').scrollIntoViewIfNeeded();
    const box = await p.locator('.import-hero canvas').boundingBox();
    const centre = box.y + box.height / 2;
    assert.ok(centre > 0 && centre < viewport.height, `Bildmitte bei ${centre} px liegt außerhalb des Fensters`);
    assert.deepEqual(errors, []);
    await context.close();
  });
}

test('Systemcheck: Auslieferung, Browser und Datencheck ohne Befund', async () => {
  const { p, errors, context } = await page();
  await p.goto(`${BASE}#/`);
  await p.getByRole('link', { name: 'Datencheck' }).click();
  await p.getByRole('heading', { name: 'Läuft alles sauber?' }).waitFor();
  assert.match(await p.locator('#sys-build').locator('..').innerText(), /Quellstand/);
  await p.getByRole('button', { name: 'Geladene Dateien prüfen' }).click();
  await p.getByText(/Programmdateien stimmen mit dem Build überein/).waitFor();
  assert.match(await p.locator('.system-caps').innerText(), /Dauerhafter Speicher \(IndexedDB\)\naktiv/);
  await p.getByRole('button', { name: 'Datencheck starten' }).click();
  await p.getByText('✓ Alles in Ordnung').waitFor();
  assert.match(await p.locator(".system-result").innerText(), /geprüft: 0 Projekte, (\d{3}) Bauteile, \1 Versionen/);
  assert.equal(await p.getByText('Keine Fehler aufgetreten.').count(), 1);
  assert.deepEqual(errors, []);
  await context.close();
});

test('Datencheck findet eine beschädigte Bauteilversion und eine fehlende Version im Projekt', async () => {
  const { p, errors, context } = await page();
  await p.goto(`${BASE}#/`);
  await p.locator('#projekt-name').fill('Prüfprojekt');
  await p.locator('#projekt-name').press('Enter');
  await p.waitForURL(/#\/projekt\//);
  // Damage stored records directly in IndexedDB, as bit rot or a buggy foreign tool would.
  const damaged = await p.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('minecraft-bauplaner');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result, tx = db.transaction(['versions', 'projects'], 'readwrite');
      const versions = tx.objectStore('versions'), projects = tx.objectStore('projects');
      const all = versions.getAll(), list = projects.getAll();
      tx.oncomplete = () => resolve(all.result[0].label);
      list.onsuccess = () => {
        const project = list.result[0];
        project.instances = [{ id: 'kaputt', name: 'Verwaiste Instanz', assetVersionId: 'av_gibt_es_nicht', transform: { position: [0, 0, 0], quarterTurns: 0, mirrorX: false }, override: false }];
        projects.put(project);
      };
      all.onsuccess = () => { const v = all.result[0]; v.payload.cells = v.payload.cells.slice(1); versions.put(v); };
    };
  }));
  assert.ok(damaged);
  await p.goto(`${BASE}#/system`);
  await p.getByRole('button', { name: 'Datencheck starten' }).click();
  await p.getByText(/✕ 2 Fehler/).waitFor();
  const findings = await p.locator('.system-findings').innerText();
  assert.match(findings, /Payload-Hash stimmt nicht/);
  assert.match(findings, /Prüfprojekt[\s\S]*av_gibt_es_nicht/);
  assert.match(await p.locator('.system-result').innerText(), /Alles sichern/);
  assert.deepEqual(errors.filter(e => !/av_gibt_es_nicht|Bauteilversion/.test(e)), []);
  await context.close();
});

test('Fehlerprotokoll sammelt unbehandelte Fehler und erstellt einen Bericht ohne Projektdaten', async () => {
  const { p, context } = await page();
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: `http://127.0.0.1:${PORT}` });
  await p.goto(`${BASE}#/system`);
  await p.getByRole('heading', { name: 'Läuft alles sauber?' }).waitFor();
  await p.evaluate(() => { setTimeout(() => { throw new Error('Testfehler S-01'); }); Promise.reject(new Error('Abgelehnt S-01')); });
  await p.locator('.system-errors li').nth(1).waitFor();
  assert.match(await p.locator('.system-errors').innerText(), /Testfehler S-01[\s\S]*Abgelehnt S-01|Abgelehnt S-01[\s\S]*Testfehler S-01/);
  await p.getByRole('button', { name: 'Fehlerbericht kopieren' }).click();
  await p.getByText(/Fehlerbericht kopiert/).waitFor();
  const report = await p.evaluate(() => navigator.clipboard.readText());
  assert.match(report, /^Minecraft-Bauplaner Fehlerbericht/); assert.match(report, /Build: [0-9a-f]{7}/); assert.match(report, /Testfehler S-01/);
  await p.getByRole('button', { name: 'Protokoll leeren' }).click();
  await p.getByText('Keine Fehler aufgetreten.').waitFor();
  await context.close();
});
