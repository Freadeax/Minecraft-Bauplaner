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

const results = p => p.locator('.catalog-results .bcard-open');
const resultCount = async p => Number((await p.locator('.result-count b').innerText()).replace(/\D/g, ''));
const resetFilters = p => p.getByRole('button', { name: 'Alle Filter zurücksetzen' }).click();
// On narrow screens the filter column is folded behind a toggle.
const openFilters = async p => { const t = p.locator('.filter-toggle'); if (await t.isVisible() && (await t.getAttribute('aria-expanded')) === 'false') await t.click(); };

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Gebäudekatalog: Karten, Filter, Varianten, Spielphase, Ensembles, Detailseite und Übernahme (${viewport.width}px)`, async () => {
    const p = await browser.newPage({ viewport });
    p.setDefaultTimeout(10_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await p.goto(`${BASE}#/bibliothek`);
    await results(p).first().waitFor();
    // Cards carry a rendered preview image.
    await p.locator('.catalog-results .bcard img[src^="data:image/png"]').first().waitFor();
    // Variant families are collapsed by default; unchecking shows every building.
    await openFilters(p);
    const collapsedCount = await resultCount(p);
    await p.getByLabel('Varianten zusammenfassen').uncheck();
    const allCount = await resultCount(p);
    assert.ok(allCount >= 150, `großer Katalog: ${allCount}`);
    assert.ok(collapsedCount < allCount && collapsedCount >= 100, `zusammengefasst: ${collapsedCount}`);
    assert.equal(await results(p).count(), 48, 'erste Seite');
    await p.getByRole('button', { name: /^Weitere \d+ laden/ }).click();
    assert.equal(await results(p).count(), 96);
    await p.getByLabel('Varianten zusammenfassen').check();

    await p.getByRole('group', { name: 'Kategorien' }).getByRole('button', { name: /Wohnhaus/ }).click();
    await p.getByRole('group', { name: 'Filter Stil' }).getByRole('button', { name: /Nordisch/ }).click();
    const nordic = (await results(p).locator('strong').allInnerTexts()).map(t => t.trim());
    for (const n of ['Blockhütte', 'Iglu']) assert.ok(nordic.some(t => t.startsWith(n)), n);
    // Active filters show as removable chips.
    await p.getByRole('button', { name: 'Filter Stil: Nordisch entfernen' }).waitFor();
    await resetFilters(p);

    // Play stage filter: nothing from the late game remains.
    await p.getByLabel('Spielphase bis').selectOption('frueh');
    const early = await results(p).allInnerTexts();
    assert.ok(early.length > 10 && !early.some(t => t.includes('Mittleres Spiel') || t.includes('Spätes Spiel')));
    await resetFilters(p);

    await p.getByLabel('Bauplatz Breite').fill('12'); await p.getByLabel('Bauplatz Tiefe').fill('4');
    const withRotation = await results(p).allInnerTexts();
    assert.ok(withRotation.some(t => t.includes('Hafensteg')), 'Steg 4×12 passt gedreht');
    await p.getByLabel('Drehen um 90° erlaubt').uncheck();
    assert.ok(!(await results(p).allInnerTexts()).some(t => t.includes('Hafensteg')));
    await resetFilters(p);

    // Merkliste and comparison from the cards.
    await p.getByLabel('Bauteile suchen').fill('kapelle');
    await p.getByRole('button', { name: 'Kapelle merken', exact: true }).click();
    await p.getByRole('button', { name: 'Kapelle vergleichen', exact: true }).click();
    await p.getByLabel('Bauteile suchen').fill('kathedrale');
    await p.getByRole('button', { name: 'Kathedrale vergleichen', exact: true }).click();
    await p.getByLabel('Bauteile suchen').fill('');
    await p.getByLabel(/Nur Merkliste/).check();
    assert.equal(await resultCount(p), 1);
    await p.getByLabel(/Nur Merkliste/).uncheck();
    await p.getByRole('link', { name: 'Vergleichen (2)' }).click();
    await p.waitForURL(/#\/bibliothek\/vergleich\//);
    const table = await p.locator('.compare-table').innerText();
    for (const s of ['Kapelle', 'Kathedrale', 'Blöcke', 'Spielphase', 'Shulkerkisten']) assert.ok(table.includes(s), s);
    await p.getByRole('button', { name: 'Kathedrale aus dem Vergleich nehmen' }).click();
    await p.locator('.compare-table thead th', { hasText: 'Kathedrale' }).waitFor({ state: 'detached' });
    assert.equal(await p.locator('.compare-table thead th').count(), 2);
    await p.getByRole('button', { name: 'Kapelle aus dem Vergleich nehmen' }).click();
    await p.goto(`${BASE}#/bibliothek`);

    // Variants: one collapsed entry, preview links on the detail page switch between woods.
    await p.getByLabel('Bauteile suchen').fill('starterhaus');
    assert.equal(await results(p).count(), 1);
    assert.match(await results(p).first().innerText(), /\+7 Varianten/);
    await results(p).first().click();
    const variants = p.getByRole('group', { name: 'Varianten' });
    await variants.getByRole('link', { name: 'Kirsche' }).click();
    await p.getByRole('heading', { name: 'Starterhaus (Kirsche)' }).waitFor();
    assert.equal(await variants.getByRole('link', { name: 'Kirsche' }).getAttribute('aria-current'), 'true');
    assert.ok((await p.locator('.building-detail').innerText()).includes('Bautipps'));
    await variants.getByRole('link', { name: 'Eiche', exact: true }).click();
    await p.getByRole('region', { name: 'Teil von Ensembles' }).getByRole('link', { name: 'Starter-Basis' }).waitFor();

    await p.goto(`${BASE}#/bibliothek`);
    await p.getByLabel('Bauteile suchen').fill('kapelle');
    await results(p).filter({ has: p.locator('strong', { hasText: /^Kapelle$/ }) }).click();
    await p.getByRole('heading', { name: 'Kapelle', exact: true }).waitFor();
    const text = await p.locator('.building-detail').innerText();
    for (const s of ['Angaben', 'Kennwerte', 'Abmessungen (B × H × T)', '7 × 12 × 13', 'Bibliothekar', 'Schätzung', 'drehbar', 'Materialliste', '♥ Gemerkt']) assert.ok(text.includes(s), s);
    assert.match(text, /Ähnliche Gebäude/);
    await p.getByRole('button', { name: '♥ Gemerkt' }).click();
    await p.getByRole('button', { name: '♡ Merken' }).waitFor();

    // Ensembles: preview cards, detail without conflicts, then a new project with one instance per building.
    await p.getByRole('navigation', { name: 'Ansicht' }).getByRole('link', { name: /Ensembles/ }).click();
    await p.locator('.ecard img').first().waitFor();
    await p.locator('.ecard').filter({ has: p.locator('strong', { hasText: /^Burg$/ }) }).click();
    const ens = p.locator('.ensemble-sheet');
    await ens.getByRole('heading', { name: 'Burg' }).waitFor();
    await ens.getByText('keine', { exact: true }).waitFor();
    await ens.getByRole('button', { name: 'Als Projekt anlegen' }).click();
    await p.waitForURL(/#\/projekt\//);
    await p.getByText('✓ Geometrisch konfliktfrei').waitFor();
    assert.equal(await p.locator('.instance-list li').count(), 7);

    // New project straight from a building page.
    await p.goto(`${BASE}#/bibliothek/gebaeude/bld_dorfbrunnen`);
    await p.getByRole('button', { name: 'Neues Projekt damit starten' }).click();
    await p.waitForURL(/#\/projekt\//);
    await p.getByRole('button', { name: /Dorfbrunnen 1/ }).waitFor();
    assert.equal(await p.locator('.instance-list li').count(), 1);

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
    await p.getByLabel('Bauteile suchen').fill('dorfbrunnen');
    await results(p).filter({ hasText: 'Dorfbrunnen' }).click();
    await p.locator('.sheet-section.match').getByText(/Passung zu „Burgmauer/).waitFor();
    assert.equal(await p.getByLabel('Zielprojekt').locator('option:checked').innerText(), 'Burgmauer (Beispiel)');
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
