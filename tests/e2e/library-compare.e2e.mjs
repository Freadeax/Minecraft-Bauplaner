// Browsertest LIB-07: Bibliothek vergleichbar und filterbar – Vergleichswerte auf jeder Karte
// (Grundfläche, Höhe, Material, Survival-Aufwand, Profil, Prüfstand), Filter Grundstück,
// Survival-Aufwand, Mods und „nur im Spiel geprüft“, einheitliche Ansichten außen/innen/oben,
// Vergleich und Baustil-Paletten (eigene Palette speichern, auf die Merkliste anwenden).
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { START_TIMEOUT } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 47771, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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
  const p = await browser.newPage({ viewport });
  p.setDefaultTimeout(20_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION_REFUSED/.test(m.text())) errors.push(m.text()); });
  return { p, errors };
};
const noHorizontalScroll = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const cards = p => p.locator('.catalog-results .bcard');

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Karten zeigen Vergleichswerte, Filter Grundstück/Aufwand/Mods/geprüft (${viewport.width}px)`, async () => {
    const { p, errors } = await page(viewport);
    await p.goto(`${BASE}#/bibliothek`);
    await cards(p).first().waitFor({ timeout: START_TIMEOUT });
    const first = cards(p).first();
    for (const label of ['Grundfläche', 'Höhe', 'Material']) assert.equal(await first.locator('.bcard-facts dt', { hasText: label }).count(), 1, label);
    assert.match(await first.locator('.badge.profile').innerText(), /Java 26\.3/);
    assert.match(await first.locator('.badge.check').innerText(), /Im Spiel geprüft/);

    // Filter über die Adresse (der Filterbereich ist am Handy eingeklappt): Grundstück 16 × 16, Aufwand ≤ Überschaubar.
    await p.goto(`${BASE}#/bibliothek?platz=16x16&aufwand=2`);
    await p.getByRole('button', { name: 'Filter Grundstück 16 × 16 entfernen' }).waitFor();
    await cards(p).first().waitFor();
    const facts = await cards(p).evaluateAll(list => list.map(c => ({
      size: c.querySelector('.bcard-facts dd')?.textContent ?? '',
      effort: c.querySelector('.bcard-facts .effort')?.textContent ?? '',
    })));
    assert.ok(facts.length > 0);
    for (const f of facts) {
      const [w, d] = f.size.split('×').map(Number);
      assert.ok(Math.max(w, d) <= 16, `passt auf 16 × 16: ${f.size}`);
      if (viewport.width > 600) assert.match(f.effort, /Gering|Überschaubar/);
    }

    if (viewport.width > 600) {
      const filters = p.getByRole('complementary', { name: 'Filter' });
      await filters.getByRole('button', { name: 'Filter Survival-Aufwand entfernen' }).count(); // chip row lives in results
      await p.getByRole('button', { name: /Filter Survival-Aufwand ≤ Überschaubar entfernen/ }).click();
      await p.waitForFunction(() => !location.hash.includes('aufwand='));
      const group = filters.getByRole('group', { name: 'Filter Survival-Aufwand' });
      await group.getByRole('button', { name: /^Gering/ }).click();
      await p.waitForFunction(() => location.hash.includes('aufwand=1'));
      await filters.getByRole('group', { name: 'Filter benötigte Mods' }).getByRole('button', { name: /Keine \(nur Vanilla\)/ }).click();
      await p.waitForFunction(() => location.hash.includes('vanilla=1'));
      await filters.getByLabel(/Nur im Spiel geprüft/).check();
      await p.waitForFunction(() => location.hash.includes('geprueft=1'));
      const badges = await p.locator('.catalog-results .badge.check').allInnerTexts();
      assert.ok(badges.length > 0 && badges.every(b => /Im Spiel geprüft/.test(b)), badges.join(' | '));
      // Einheitliche Innenansicht: der Schnitt ändert das Bild.
      // Einheitliche Innenansicht: bei Bauten mit Boden zeigt der Schnitt ein anderes Bild.
      await p.goto(`${BASE}#/bibliothek?kategorie=wohnhaus`);
      await p.locator('.catalog-results .bcard img').first().waitFor();
      const srcs = () => p.locator('.catalog-results .bcard img').evaluateAll(list => list.slice(0, 6).map(i => i.getAttribute('src')));
      const before = await srcs();
      await p.getByLabel('Blickrichtung der Vorschaubilder').selectOption('innen');
      await p.waitForFunction(prev => [...document.querySelectorAll('.catalog-results .bcard img')].slice(0, 6).some((i, n) => i.getAttribute('src') !== prev[n]), before);
    }
    assert.ok(await noHorizontalScroll(p), 'keine seitliche Überbreite');
    assert.deepEqual(errors, []);
    await p.close();
  });
}

test('Detail, Vergleich mit Ansichten außen/innen/oben, Generatoren und Ensembles mit denselben Werten', async () => {
  const { p, errors } = await page({ width: 1400, height: 1000 });
  await p.goto(`${BASE}#/bibliothek/gebaeude/bld_fachwerkhaus`);
  const detail = p.locator('.building-detail');
  await detail.waitFor({ timeout: START_TIMEOUT });
  for (const t of ['Survival-Aufwand', 'Minecraft', 'Prüfstand']) await detail.locator('.stat-tiles dt', { hasText: t }).first().waitFor();
  const views = detail.getByRole('group', { name: /^Ansichten / });
  for (const v of ['Außen', 'Innen', 'Oben']) assert.equal(await views.locator('figcaption', { hasText: v }).count(), 1, v);

  await p.goto(`${BASE}#/bibliothek/vergleich/bld_fachwerkhaus,bld_wachturm`);
  const table = p.locator('.compare-table');
  await table.waitFor();
  for (const row of ['Grundfläche', 'Passt auf Grundstück', 'Materialaufwand', 'Survival-Aufwand', 'Minecraft-Profil', 'Benötigte Mods', 'Prüfstand'])
    await table.getByRole('rowheader', { name: row, exact: true }).waitFor();
  assert.equal(await table.getByRole('group', { name: /^Ansichten / }).count(), 2);

  await p.goto(`${BASE}#/bibliothek/generatoren`);
  const gen = p.locator('.gen-card').first();
  await gen.waitFor();
  assert.match(await gen.locator('.badge.check').innerText(), /Fälle im Spiel geprüft/);
  assert.equal(await gen.locator('.bcard-facts dt', { hasText: 'Grundfläche' }).count(), 1);

  await p.goto(`${BASE}#/bibliothek/ensembles`);
  const ens = p.locator('.ecard').first();
  await ens.waitFor();
  assert.match(await ens.locator('.badge.check').innerText(), /im Spiel geprüft/);
  assert.deepEqual(errors, []);
  await p.close();
});

test('Baustil-Paletten: eigene Palette speichern und auf die Merkliste anwenden', async () => {
  const { p, errors } = await page({ width: 1400, height: 1000 });
  await p.goto(`${BASE}#/bibliothek/paletten`);
  const grid = p.getByRole('list', { name: 'Paletten' });
  await grid.waitFor({ timeout: START_TIMEOUT });
  assert.ok(await grid.locator('.palette-card').count() >= 8);
  await grid.getByRole('link', { name: /Nordische Bergsiedlung/ }).click();
  await p.getByLabel('Name der Palette').fill('Meine Bergsiedlung');
  await p.getByLabel('Holz (Haupt) der Palette').selectOption('cherry');
  await p.getByRole('button', { name: 'Als eigene Palette speichern' }).click();
  await p.waitForFunction(() => /paletten\/tpl/.test(location.hash));
  await grid.getByRole('link', { name: /Meine Bergsiedlung/ }).waitFor();

  // Zwei Gebäude merken, dann die Palette auf die Merkliste legen.
  for (const id of ['bld_fachwerkhaus', 'bld_wachturm']) {
    await p.goto(`${BASE}#/bibliothek?q=${id === 'bld_wachturm' ? 'Holz-Wachturm' : 'Fachwerkhaus'}`);
    const card = cards(p).first();
    await card.waitFor();
    await card.getByRole('button', { name: / merken$/ }).click();
  }
  await p.goto(`${BASE}#/bibliothek/paletten`);
  await grid.getByRole('link', { name: /Meine Bergsiedlung/ }).click();
  await p.getByLabel('Gebäude für die Palette').selectOption('merkliste');
  const save = p.getByRole('button', { name: /Varianten im Stil „Meine Bergsiedlung“ speichern/ });
  await save.waitFor();
  assert.match(await save.innerText(), /^[12] Varianten/);
  await p.locator('.palette-preview img').first().waitFor();
  await save.click();
  await p.getByText(/Materialvarianten im Stil „Meine Bergsiedlung“ gespeichert/).waitFor();
  await p.goto(`${BASE}#/bibliothek?q=Meine Bergsiedlung&varianten=alle`);
  await cards(p).first().waitFor();
  assert.ok(await cards(p).count() >= 1);
  assert.ok(await noHorizontalScroll(p));
  assert.deepEqual(errors, []);
  await p.close();
});
