// Browser check of the building catalogue (B9) against the built Pages artifact.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4191, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

const results = p => p.locator('.catalog-results li button');

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Gebäudekatalog: Filter, Bauplatz, Steckbrief, Vorschläge und Übernahme (${viewport.width}px)`, async () => {
    const p = await browser.newPage({ viewport });
    p.setDefaultTimeout(10_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await p.goto(`${BASE}#/bibliothek`);
    await results(p).first().waitFor();
    assert.equal(await results(p).count(), 19, '16 Gebäude + 3 Module');
    await p.locator('.filter-panel > summary').click();

    await p.getByRole('group', { name: 'Filter Kategorie' }).getByRole('button', { name: /Wohnhaus/ }).click();
    assert.equal(await results(p).count(), 6);
    await p.getByRole('group', { name: 'Filter Stil' }).getByRole('button', { name: /Nordisch/ }).click();
    assert.deepEqual((await results(p).locator('strong').allInnerTexts()).map(t => t.trim()), ['Blockhütte', 'Iglu']);
    await p.getByRole('button', { name: 'Alle Filter zurücksetzen' }).click();

    await p.getByLabel('Bauplatz Breite').fill('12'); await p.getByLabel('Bauplatz Tiefe').fill('4');
    const withRotation = await results(p).allInnerTexts();
    assert.ok(withRotation.some(t => t.includes('Hafensteg')), 'Steg 4×12 passt gedreht');
    await p.getByLabel('Drehen um 90° erlaubt').uncheck();
    assert.ok(!(await results(p).allInnerTexts()).some(t => t.includes('Hafensteg')));
    await p.getByRole('button', { name: 'Alle Filter zurücksetzen' }).click();

    await p.getByLabel('Bauteile suchen').fill('bibliothekar');
    assert.equal(await results(p).count(), 1);
    await results(p).first().click();
    const sheet = p.locator('.building-sheet');
    await sheet.getByText('Kapelle', { exact: true }).waitFor();
    const text = await sheet.innerText();
    for (const s of ['Angaben', 'Kennwerte', 'Abmessungen (B × H × T)', '7 × 12 × 13', 'Bibliothekar', 'Schätzung', 'drehbar', 'Materialliste']) assert.ok(text.includes(s), s);
    assert.match(text, /Ähnliche Gebäude/);
    await p.getByLabel('Bauteile suchen').fill('');

    // Sample project, then suggestions for it and adding a building.
    await p.goto(BASE);
    await p.getByRole('button', { name: 'Beispielprojekt „Burgmauer“' }).click();
    await p.waitForURL(/#\/projekt\//);
    await p.getByText('✓ Geometrisch konfliktfrei').waitFor();
    await p.getByRole('link', { name: /Passende Gebäude vorschlagen/ }).click();
    await p.waitForURL(/#\/bibliothek\/fuer\//);
    await p.locator('.score').first().waitFor();
    assert.equal(await p.getByRole('combobox', { name: 'Sortierung' }).inputValue(), 'match');
    const scores = (await p.locator('.score').allInnerTexts()).map(Number);
    for (let i = 1; i < scores.length; i++) assert.ok(scores[i - 1] >= scores[i], 'absteigend nach Passung');
    await results(p).filter({ hasText: 'Dorfbrunnen' }).click();
    await p.locator('.sheet-section.match').getByText(/Passung zu „Burgmauer/).waitFor();
    await p.getByRole('button', { name: '＋ Ins Projekt übernehmen' }).click();
    await p.getByText('„Dorfbrunnen“ in „Burgmauer (Beispiel)“ eingefügt').waitFor();
    await p.getByRole('link', { name: 'Zum Editor →' }).click();
    await p.waitForURL(/#\/projekt\//);
    await p.getByRole('button', { name: /Dorfbrunnen 1/ }).waitFor();
    assert.equal(await p.locator('.instance-list li').count(), 6);
    assert.deepEqual(errors, []);
    await p.close();
  });
}
