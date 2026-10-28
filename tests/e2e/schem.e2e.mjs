// Browser check of B12: schem views (3D, images, layer plan), building versions
// (variants, comparison, material variant), shareable library URLs, browse rows,
// card view direction and the plan section of the file viewer.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4196, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

const page = async viewport => {
  const p = await browser.newPage({ viewport, acceptDownloads: true });
  p.setDefaultTimeout(15_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  return { p, errors };
};
const noHorizontalScroll = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Schem-Ansicht: 3D, Bilder mit Schnitt und Download, Bauplan je Ebene (${viewport.width}px)`, async () => {
    const { p, errors } = await page(viewport);
    await p.goto(`${BASE}#/bibliothek/gebaeude/bld_verzauberungsraum`);
    const tabs = p.getByRole('tablist', { name: 'Ansicht' });
    assert.equal(await tabs.getByRole('tab', { name: '3D' }).getAttribute('aria-selected'), 'true');
    await p.locator('.schem-panel canvas').first().waitFor();
    // The layer filter of the 3D view sits right under it.
    await p.getByRole('group', { name: 'Schichtfilter' }).waitFor();

    await tabs.getByRole('tab', { name: 'Bilder' }).click();
    assert.match(p.url(), /gebaeude\/bld_verzauberungsraum\/bilder$/, 'tab is part of the address');
    const strip = p.getByRole('group', { name: 'Blickwinkel' });
    assert.equal(await strip.getByRole('button').count(), 9);
    await p.locator('.shot-main img[src^="data:image/png"]').waitFor();
    const iso = await p.locator('.shot-main img').getAttribute('src');
    await strip.getByRole('button', { name: 'Draufsicht, Norden oben' }).click();
    await p.locator('.shot-main figcaption', { hasText: 'Draufsicht' }).waitFor();
    await p.waitForFunction(prev => document.querySelector('.shot-main img')?.getAttribute('src') !== prev, iso);
    await p.getByRole('checkbox', { name: 'Schnitt' }).check();
    await p.locator('.shot-main figcaption', { hasText: 'Schnitt bei Y' }).waitFor();
    const [download] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: '⤓ Bild speichern' }).click()]);
    assert.match(download.suggestedFilename(), /^verzauberungsraum-oben-schnitt-y\d+\.png$/);

    await tabs.getByRole('tab', { name: 'Ebenen' }).click();
    const plan = p.locator('.layer-canvas canvas');
    await plan.waitFor();
    const status = p.locator('.layer-pos');
    assert.match(await status.innerText(), /Ebene 1 von \d+/);
    await p.getByRole('button', { name: 'Ebene höher' }).click();
    assert.match(await status.innerText(), /Ebene 2 von/);
    // Layer Y 1 holds the enchanting table and the 15 shelves.
    const legend = p.getByRole('complementary', { name: /Blöcke der Ebene Y 1/ });
    assert.match(await legend.innerText(), /bookshelf\s*15/);
    assert.match(await legend.innerText(), /enchanting_table\s*1/);
    const box = await plan.boundingBox();
    await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await p.locator('.layer-hover b', { hasText: 'enchanting_table' }).waitFor();
    await p.getByRole('button', { name: 'Alle Ebenen' }).click();
    assert.ok(await p.locator('.layer-all li').count() >= 5, 'one small plan per built layer');
    await p.getByRole('button', { name: 'Ebene Y 0 öffnen' }).click();
    assert.match(await status.innerText(), /Ebene 1 von/);
    assert.ok(await noHorizontalScroll(p), 'kein horizontales Scrollen');

    // Deep link straight into a tab.
    await p.goto(`${BASE}#/bibliothek/gebaeude/bld_fachwerkhaus/ebenen`);
    await p.locator('.layer-canvas canvas').waitFor();
    assert.deepEqual(errors, []);
    await p.close();
  });
}

test('Bauversionen: Varianten vergleichen, Materialvariante erzeugen und als eigenes Bauteil speichern', async () => {
  const { p, errors } = await page({ width: 1400, height: 1000 });
  await p.goto(`${BASE}#/bibliothek/gebaeude/bld_rundturm`);
  const section = p.getByRole('region', { name: 'Bauversionen' });
  await section.scrollIntoViewIfNeeded();
  assert.equal(await section.locator('.variant-cards li').count(), 4, 'Original plus drei Materialvarianten');
  await section.getByLabel('Stand B').selectOption({ label: 'Variante: Rundturm (Tiefenschiefer)' });
  const stats = section.locator('.diff-stats');
  assert.equal(await stats.locator('.diff-added dd').innerText(), '0');
  assert.equal(await stats.locator('.diff-removed dd').innerText(), '0');
  assert.ok(Number((await stats.locator('.diff-material dd').innerText()).replace(/\D/g, '')) > 300, 'Material getauscht');
  await section.locator('.diff-table', { hasText: 'deepslate_bricks' }).waitFor();
  await section.getByRole('button', { name: '3D' }).click();
  await section.locator('.diff-stage canvas').waitFor();
  await section.getByRole('button', { name: 'Ebenen' }).click();
  await section.locator('.diff-stage .layer-canvas canvas').waitFor();
  await section.getByRole('button', { name: 'A und B tauschen' }).click();
  assert.match(await section.getByLabel('Stand A').inputValue(), /bld_rundturm_tiefenschiefer/);

  // Material variant of a building without family.
  await p.goto(`${BASE}#/bibliothek/gebaeude/bld_wachturm/versionen`);
  const versions = p.getByRole('region', { name: 'Bauversionen' });
  await versions.getByText('Materialvariante erzeugen', { exact: true }).click();
  await versions.getByLabel('Eiche ersetzen durch').selectOption({ label: 'Kirsche' });
  await versions.locator('.swap-preview').waitFor();
  assert.match(await versions.locator('.swap-preview').innerText(), /\d+ Blöcke getauscht/);
  assert.equal(await versions.getByLabel('Name der Variante').inputValue(), 'Holz-Wachturm (Kirsche)');
  await versions.getByRole('button', { name: 'Als neue Variante speichern' }).click();
  await p.locator('.building-detail h1', { hasText: 'Holz-Wachturm (Kirsche)' }).waitFor();
  assert.match(p.url(), /gebaeude\/asset_/);
  const group = p.getByRole('region', { name: 'Bauversionen' });
  assert.equal(await group.locator('.variant-cards li').count(), 2, 'Basis und neue Variante gehören zusammen');
  await p.locator('.chips .tag', { hasText: 'Eigenes Bauteil' }).waitFor();
  // Own parts can get the next swap as a new version as well.
  await group.getByText('Materialvariante erzeugen', { exact: true }).click();
  await group.getByLabel('Kirsche ersetzen durch').selectOption({ label: 'Birke' });
  await group.getByRole('button', { name: 'Als neue Version v2.0' }).click();
  await p.getByRole('status').filter({ hasText: 'Version 2.0' }).waitFor();
  const older = await group.getByLabel('Stand B').locator('option', { hasText: 'Ältere Version v1.0' }).getAttribute('value');
  await group.getByLabel('Stand B').selectOption(older);
  assert.ok(Number((await group.locator('.diff-material dd').innerText()).replace(/\D/g, '')) > 0);
  assert.deepEqual(errors, []);
  await p.close();
});

test('Bibliothek: teilbare Suche in der URL, Stöbern, Blickrichtung der Bilder, Betrachter mit Bauplan', async () => {
  const { p, errors } = await page({ width: 1400, height: 1000 });
  await p.goto(`${BASE}#/bibliothek?kategorie=statue&q=statue`);
  await p.locator('.catalog-results .bcard-open').first().waitFor();
  const names = await p.locator('.catalog-results .bcard strong').allInnerTexts();
  for (const n of ['Axolotl-Statue', 'Bienen-Statue', 'Schweine-Statue']) assert.ok(names.includes(n), n);
  assert.equal(await p.getByLabel('Bauteile suchen').inputValue(), 'statue');
  await p.getByRole('button', { name: 'Filter Kategorie: Statue entfernen' }).waitFor();
  // Browse rows only on the plain overview.
  assert.equal(await p.getByRole('region', { name: 'Stöbern' }).count(), 0);
  await p.getByRole('button', { name: 'Alle Filter zurücksetzen' }).click();
  await p.getByLabel('Bauteile suchen').fill('');
  await p.waitForFunction(() => !location.hash.includes('?'));
  const browse = p.getByRole('region', { name: 'Stöbern' });
  await browse.getByRole('list', { name: 'Nach Biom' }).getByRole('button', { name: /^Nether/ }).click();
  await p.waitForFunction(() => location.hash.includes('biom=nether'));
  const nether = await p.locator('.catalog-results .bcard strong').allInnerTexts();
  assert.ok(nether.some(n => n.startsWith('Rundturm') || n.startsWith('Bergfried') || n === 'Netherbasis'), nether.join(', '));
  // Reload keeps the search.
  await p.reload();
  await p.getByRole('button', { name: 'Filter Biom: Nether entfernen' }).waitFor();

  const img = p.locator('.catalog-results .bcard img').first();
  await img.waitFor();
  const before = await img.getAttribute('src');
  await p.getByLabel('Blickrichtung der Vorschaubilder').selectOption('nw');
  await p.waitForFunction(prev => { const i = document.querySelector('.catalog-results .bcard img'); return i && i.getAttribute('src') !== prev; }, before);

  await p.goto(`${BASE}#/betrachter`);
  const plans = p.getByRole('region', { name: 'Bilder und Bauplan' });
  await plans.scrollIntoViewIfNeeded();
  await plans.locator('.shot-main img[src^="data:image/png"]').waitFor();
  await plans.getByRole('tab', { name: 'Bauplan je Ebene' }).click();
  await plans.locator('.layer-canvas canvas').waitFor();
  assert.deepEqual(errors, []);
  await p.close();
});
