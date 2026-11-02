// Testphase (QA-04) im echten Chromium: Checklisten, Haken bleiben nach dem Neuladen, Fehlerbericht mit
// Diagnose (Fehlerprotokoll und Konsole), GitHub-Adresse, Absturzseite verweist auf „Fehler melden“.
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const PORT = 4295, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

async function open(viewport = { width: 1400, height: 1000 }) {
  const context = await browser.newContext({ viewport });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: `http://127.0.0.1:${PORT}` });
  const p = await context.newPage();
  p.setDefaultTimeout(15_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  return { p, errors, context };
}

test('Checklisten: Fall öffnen, bewerten, Notiz; Zusammenfassung und Haken überleben das Neuladen; nur Kernfälle', async () => {
  const { p, errors, context } = await open();
  await p.goto(`${BASE}#/testphase`);
  await p.getByRole('heading', { name: 'Alles einmal durchspielen' }).waitFor();
  const areas = p.locator('.tp-area');
  assert.ok(await areas.count() >= 8);
  const first = p.locator('.tp-case[data-case="START-01"]');
  await first.locator('.tp-case-title').click();
  await first.getByText('Erwartet:').waitFor();
  await first.getByRole('button', { name: 'START-01 In Ordnung' }).click();
  const second = p.locator('.tp-case[data-case="START-02"]');
  await second.getByRole('button', { name: 'START-02 Fehler gefunden' }).click();
  await second.getByLabel('Notiz').fill('Name verschwand');
  assert.match(await p.locator('.tp-summary').innerText(), /2\/\d+ geprüft · Kern \d+\/\d+ · 1 Fehler/);
  await p.reload();
  await p.getByRole('heading', { name: 'Alles einmal durchspielen' }).waitFor();
  assert.equal(await p.locator('.tp-case[data-case="START-01"]').getAttribute('class'), 'tp-case tp-ok');
  assert.equal(await p.locator('.tp-case[data-case="START-02"] input').inputValue(), 'Name verschwand', 'Fehlerfall bleibt aufgeklappt mit Notiz');
  await p.getByLabel('Nur Kernfälle zeigen').check();
  assert.equal(await p.locator('.tp-case[data-level=vertieft]').count(), 0);
  assert.ok(await p.locator('.tp-case[data-level=kern]').count() > 20);
  await p.getByRole('button', { name: 'Protokoll kopieren' }).click();
  await p.getByText('Testprotokoll kopiert.').waitFor();
  const md = await p.evaluate(() => navigator.clipboard.readText());
  assert.match(md, /- START-02 Projekt anlegen, umbenennen, löschen: ✕ Fehler – Name verschwand/);
  assert.match(md, /- Build: [0-9a-f]{7}/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('Fehler melden: Formular aus dem Fall vorausgefüllt, Diagnose mit Umgebung, Konsole und Fehlerprotokoll; GitHub-Adresse trägt die Felder', async () => {
  const { p, context } = await open();
  await p.goto(`${BASE}#/testphase`);
  await p.getByRole('heading', { name: 'Alles einmal durchspielen' }).waitFor();
  // Ein echter Fehler und eine Warnung in dieser Sitzung.
  await p.evaluate(() => { console.warn('Testwarnung 123'); setTimeout(() => { throw new Error('Testfehler 456'); }, 0); });
  await p.waitForFunction(() => document.querySelector('.tp-summary') !== null);
  const bad = p.locator('.tp-case[data-case="PROJ-04"]');
  await bad.getByRole('button', { name: 'PROJ-04 Fehler gefunden' }).click();
  await bad.getByRole('button', { name: 'Fehler zu PROJ-04 melden' }).click();
  const form = p.locator('.tp-report');
  await form.waitFor();
  assert.equal(await form.getByLabel('Titel').inputValue(), 'PROJ-04: Export .schem und .litematic');
  assert.equal(await form.getByLabel('Testfall').inputValue(), 'PROJ-04');
  assert.equal(await form.getByLabel('Bereich').inputValue(), 'Projekt: Editor, Material, Bauen, Export');
  assert.match(await form.getByLabel('Was ich gemacht habe').inputValue(), /^1\. Tab „Export“/);
  await form.getByLabel('Tatsächlich').fill('Nichts passiert');
  await form.locator('summary', { hasText: 'Diagnose ansehen' }).click();
  await form.locator('.tp-diagnosis pre').getByText('Testfehler 456').waitFor();
  const diag = await form.locator('.tp-diagnosis pre').innerText();
  assert.match(diag, /- Build: [0-9a-f]{7} \(/);
  assert.match(diag, /- Grafik: (WebGL [12] · |keine|nicht ermittelbar)/);
  assert.match(diag, /- Speicherart: IndexedDB \(dauerhaft\)/);
  assert.match(diag, /Warnung: Testwarnung 123/);
  assert.match(diag, /\[error\] #\/testphase\nError: Testfehler 456/);
  assert.match(diag, /- \d\d:\d\d:\d\d #\/testphase/);
  const href = await form.getByRole('link', { name: /Als GitHub-Issue öffnen/ }).getAttribute('href');
  const u = new URL(href);
  assert.equal(u.pathname, '/Freadeax/Minecraft-Bauplaner/issues/new');
  assert.equal(u.searchParams.get('template'), 'testphase-planer.yml');
  assert.equal(u.searchParams.get('title'), '[Planer] PROJ-04: Export .schem und .litematic');
  assert.equal(u.searchParams.get('tatsaechlich'), 'Nichts passiert');
  assert.ok(u.searchParams.get('diagnose').includes('Testfehler 456'));
  await form.getByRole('button', { name: 'Bericht kopieren' }).click();
  await form.getByText('Bericht kopiert.').waitFor();
  const text = await p.evaluate(() => navigator.clipboard.readText());
  assert.match(text, /^## PROJ-04: Export \.schem und \.litematic\n- Bereich: Projekt: Editor, Material, Bauen, Export\n- Schwere: Funktion geht nicht\n- Testfall: PROJ-04\n/);
  assert.ok(text.includes('## Diagnose (automatisch erfasst, ohne Projektdaten)'));
  // Keine Projektnamen im Bericht: der Beispielname aus dem Katalog darf nicht auftauchen.
  assert.ok(!/Eckturm|Fachwerkhaus/.test(text));
  await context.close();
});

test('Direkteinstieg #/testphase?melden und Links aus Systemcheck', async () => {
  const { p, errors, context } = await open();
  await p.goto(`${BASE}#/system`);
  await p.getByRole('heading', { name: 'Läuft alles sauber?' }).waitFor();
  await p.getByRole('link', { name: 'Fehler melden (mit Diagnose)' }).click();
  await p.waitForURL(/#\/testphase\?melden$/);
  await p.locator('.tp-report').getByRole('heading', { name: 'Fehler melden' }).waitFor();
  assert.equal(await p.locator('.tp-report').getByLabel('Titel').inputValue(), '');
  await p.locator('.tp-report').getByRole('button', { name: 'Schließen' }).click();
  assert.equal(await p.locator('.tp-report').count(), 0);
  assert.deepEqual(errors, []);
  await context.close();
});
