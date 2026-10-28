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
  test(`Gebäudekatalog: Filter, Varianten, Spielphase, Ensembles, Steckbrief und Übernahme (${viewport.width}px)`, async () => {
    const p = await browser.newPage({ viewport });
    p.setDefaultTimeout(10_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await p.goto(`${BASE}#/bibliothek`);
    await results(p).first().waitFor();
    // Variant families are collapsed by default; unchecking shows every building.
    const collapsedCount = await results(p).count();
    await p.getByLabel('Varianten zusammenfassen').uncheck();
    const allCount = await results(p).count();
    assert.ok(allCount >= 150, `großer Katalog: ${allCount}`);
    assert.ok(collapsedCount < allCount && collapsedCount >= 100, `zusammengefasst: ${collapsedCount}`);
    await p.getByLabel('Varianten zusammenfassen').check();
    await p.locator('.filter-panel > summary').click();

    await p.getByRole('group', { name: 'Filter Kategorie' }).getByRole('button', { name: /Wohnhaus/ }).click();
    await p.getByRole('group', { name: 'Filter Stil' }).getByRole('button', { name: /Nordisch/ }).click();
    const nordic = (await results(p).locator('strong').allInnerTexts()).map(t => t.trim());
    for (const n of ['Blockhütte', 'Iglu']) assert.ok(nordic.some(t => t.startsWith(n)), n);
    await p.getByRole('button', { name: 'Alle Filter zurücksetzen' }).click();

    // Play stage filter: nothing from the late game remains.
    await p.getByLabel('Spielphase bis').selectOption('frueh');
    const early = await results(p).allInnerTexts();
    assert.ok(early.length > 10 && !early.some(t => t.includes('Mittleres Spiel') || t.includes('Spätes Spiel')));
    await p.getByRole('button', { name: 'Alle Filter zurücksetzen' }).click();

    await p.getByLabel('Bauplatz Breite').fill('12'); await p.getByLabel('Bauplatz Tiefe').fill('4');
    const withRotation = await results(p).allInnerTexts();
    assert.ok(withRotation.some(t => t.includes('Hafensteg')), 'Steg 4×12 passt gedreht');
    await p.getByLabel('Drehen um 90° erlaubt').uncheck();
    assert.ok(!(await results(p).allInnerTexts()).some(t => t.includes('Hafensteg')));
    await p.getByRole('button', { name: 'Alle Filter zurücksetzen' }).click();

    // Variants: one collapsed entry, chips in the sheet switch between woods.
    await p.getByLabel('Bauteile suchen').fill('starterhaus');
    assert.equal(await results(p).count(), 1);
    assert.match(await results(p).first().innerText(), /\+7 Varianten/);
    await results(p).first().click();
    const variants = p.getByRole('group', { name: 'Varianten' });
    await variants.getByRole('button', { name: 'Kirsche' }).click();
    await p.locator('.building-sheet').getByText('Starterhaus (Kirsche)', { exact: true }).waitFor();
    assert.equal(await variants.getByRole('button', { name: 'Kirsche' }).getAttribute('aria-pressed'), 'true');
    assert.ok((await p.locator('.building-sheet').innerText()).includes('Bautipps'));
    await variants.getByRole('button', { name: 'Eiche', exact: true }).click();
    await p.getByRole('region', { name: 'Teil von Ensembles' }).getByRole('button', { name: 'Starter-Basis' }).waitFor();

    await p.getByLabel('Bauteile suchen').fill('kapelle');
    await results(p).filter({ has: p.locator('strong', { hasText: /^Kapelle$/ }) }).click();
    const sheet = p.locator('.building-sheet');
    await sheet.getByText('Kapelle', { exact: true }).waitFor();
    const text = await sheet.innerText();
    for (const s of ['Angaben', 'Kennwerte', 'Abmessungen (B × H × T)', '7 × 12 × 13', 'Bibliothekar', 'Schätzung', 'drehbar', 'Materialliste']) assert.ok(text.includes(s), s);
    assert.match(text, /Ähnliche Gebäude/);
    await p.getByLabel('Bauteile suchen').fill('');

    // Ensembles: preview without conflicts, then a new project with one instance per building.
    await p.getByRole('group', { name: 'Ansicht' }).getByRole('button', { name: /Ensembles/ }).click();
    await p.getByRole('region', { name: 'Ensembles' }).getByRole('button', { name: /^Burg/ }).click();
    const ens = p.locator('.ensemble-sheet');
    await ens.getByRole('heading', { name: 'Burg' }).waitFor();
    await ens.getByText('keine', { exact: true }).waitFor();
    await ens.getByRole('button', { name: 'Als Projekt anlegen' }).click();
    await p.waitForURL(/#\/projekt\//);
    await p.getByText('✓ Geometrisch konfliktfrei').waitFor();
    assert.equal(await p.locator('.instance-list li').count(), 7);

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
