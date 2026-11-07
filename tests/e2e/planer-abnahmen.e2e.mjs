// Block B (07.11.2026): automatische Abnahme der Planer-Fälle, die bisher ohne Nachweis waren – genau in den
// Schritten der Testphase (apps/web/src/testing/testplan.ts): START-02, BIB-01, BIB-03, PROJ-01, PROJ-02,
// PROJ-08, KARTE-06, GERAET-01, GERAET-04, GERAET-06 und SYS-01. Läuft unverändert in Chromium, Firefox und
// WebKit (`node scripts/checks/e2e_engine.mjs firefox tests/e2e/planer-abnahmen.e2e.mjs`). Was nur ein Mensch
// beurteilen kann, steht in apps/web/src/testing/autochecks.ts unter „remaining“.
// Run after `npm run build`: `node --test tests/e2e/planer-abnahmen.e2e.mjs`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject, waitForStart, REFUSED, WEBKIT_NOISE } from './start.mjs';
import { startModSimulator } from './modSimulator.mjs';
import { profileRecipesFor } from '../../dist/domain/src/index.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ENGINE = chromium.name();
const PORT = 4391, MOD = 47711, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
// KARTE-06: a plateau with a cliff of 8 blocks (x 28..37, z -12..3) next to the default pond (x 48..55, z -8..-1).
const plateau = (x, z) => x >= 28 && x < 38 && z >= -12 && z < 4 ? [72, 0, 71, 3] : undefined;
let server, browser, mod;

before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  mod = await startModSimulator(MOD, { column: plateau });
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.kill(); await mod?.close(); });

async function open(viewport = { width: 1400, height: 1000 }, opts = {}) {
  const context = await browser.newContext({ viewport, ...opts });
  const p = await context.newPage();
  p.setDefaultTimeout(30_000);
  const errors = [];
  p.on('pageerror', e => { if (!WEBKIT_NOISE.test(e.message)) errors.push(e.message); });
  p.on('console', m => { if (m.type() === 'error' && !REFUSED.test(m.text()) && !WEBKIT_NOISE.test(m.text()) && !/Failed to load resource|clipboard/i.test(m.text())) errors.push(m.text()); });
  const answers = [];
  p.on('dialog', d => void (d.type() === 'confirm' ? d.accept() : d.type() === 'alert' ? d.dismiss() : d.accept(answers.shift() ?? '')));
  return { p, context, errors, answers };
}
const readStore = (p, store) => p.evaluate(store => new Promise((resolve, reject) => {
  const r = indexedDB.open('minecraft-bauplaner');
  r.onsuccess = () => { const db = r.result, q = db.transaction(store).objectStore(store).getAll(); q.onsuccess = () => { db.close(); resolve(q.result); }; q.onerror = () => reject(q.error); };
  r.onerror = () => reject(r.error);
}), store);
const noSideScroll = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const projectCards = p => p.getByRole('region', { name: 'Projekte' }).locator('article.project-card');
const cardNames = async p => (await projectCards(p).locator('h2').allInnerTexts()).map(s => s.trim());

// ───────────── START-02 ─────────────
test('START-02: Projekt anlegen, umbenennen, zweites anlegen und löschen; Namen bleiben nach dem Neuladen', async () => {
  const { p, context, errors, answers } = await open();
  await p.goto(BASE);
  await waitForStart(p);
  await p.locator('#projekt-name').fill('Hafenviertel');
  await p.getByRole('button', { name: '＋ Leeres Projekt anlegen' }).click();
  await p.waitForURL(/#\/projekt\//);
  await p.getByRole('heading', { name: 'Hafenviertel' }).waitFor();
  // Umbenennen im Projektkopf (eigener Schritt, gespeichert wie jede Änderung).
  answers.push('Hafenviertel Nord');
  await p.getByRole('button', { name: 'Projekt umbenennen' }).click();
  await p.getByRole('heading', { name: 'Hafenviertel Nord' }).waitFor();
  await p.locator('.save-state.saved').waitFor();
  assert.equal(await p.locator('.crumbs [aria-current=page]').innerText(), 'Hafenviertel Nord');
  // A blank name is refused and changes nothing.
  answers.push('   ');
  await p.getByRole('button', { name: 'Projekt umbenennen' }).click();
  await p.getByRole('heading', { name: 'Hafenviertel Nord' }).waitFor();
  const first = (await readStore(p, 'projects')).find(x => x.name === 'Hafenviertel Nord');
  assert.ok(first, 'umbenanntes Projekt gespeichert');

  // Zweites Projekt anlegen und wieder löschen.
  await p.goto(BASE);
  await waitForStart(p);
  await p.locator('#projekt-name').fill('Wegwerfprojekt');
  await p.getByRole('button', { name: '＋ Leeres Projekt anlegen' }).click();
  await p.waitForURL(/#\/projekt\//);
  await p.goto(BASE);
  await waitForStart(p);
  assert.deepEqual((await cardNames(p)).sort(), ['Hafenviertel Nord', 'Wegwerfprojekt']);
  await projectCards(p).filter({ hasText: 'Wegwerfprojekt' }).getByRole('button', { name: 'Löschen' }).click();
  await p.getByRole('status').filter({ hasText: 'Projekt „Wegwerfprojekt“ gelöscht.' }).waitFor();
  assert.deepEqual(await cardNames(p), ['Hafenviertel Nord']);

  // F5: Namen bleiben, das gelöschte ist weg, das andere unverändert.
  await p.reload();
  await waitForStart(p);
  await projectCards(p).first().waitFor();
  assert.deepEqual(await cardNames(p), ['Hafenviertel Nord']);
  const stored = await readStore(p, 'projects');
  assert.equal(stored.length, 1);
  assert.equal(stored[0].id, first.id);
  assert.equal(stored[0].revision, first.revision, 'das andere Projekt ist unverändert');
  // Rückgängig nimmt das Umbenennen zurück (eigener Schritt).
  await projectCards(p).first().getByRole('link', { name: 'Öffnen' }).click();
  await p.getByRole('heading', { name: 'Hafenviertel Nord' }).waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});

// ───────────── BIB-01 ─────────────
test('BIB-01: Suche, Kategorie, Größe, Spielphase, Seite 2; Zurück und neuer Tab zeigen dieselbe Suche', async () => {
  const { p, context, errors } = await open();
  await p.goto(`${BASE}#/bibliothek`);
  const search = p.getByRole('searchbox', { name: 'Bauteile suchen' });
  await search.waitFor({ timeout: 90_000 });
  const results = p.locator('.catalog-results > li');
  await results.first().waitFor();
  // Vorschaubilder erscheinen ohne langes Nachladen: jede sichtbare Karte hat ihr Bild in wenigen Sekunden
  // (Karten unterhalb des Bildschirms rechnen erst beim Hinscrollen).
  await results.first().scrollIntoViewIfNeeded();
  const t0 = Date.now();
  const visibleThumbs = () => p.waitForFunction(() => {
    const seen = [...document.querySelectorAll('.catalog-results > li')].filter(li => { const r = li.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; });
    return seen.length > 0 && seen.every(li => { const img = li.querySelector('.thumb img'); return img && img.complete && img.naturalWidth > 0; });
  }, null, { timeout: 15_000 });
  await visibleThumbs();
  const thumbs = Date.now() - t0;
  await results.nth(12).scrollIntoViewIfNeeded();
  const t1 = Date.now();
  await visibleThumbs();
  const scrolled = Date.now() - t1;

  // Suchbegriff, Kategorie, Größe und Spielphase: jede Karte passt zum Filter.
  await search.fill('Turm');
  await p.getByRole('group', { name: 'Kategorien' }).getByRole('button', { name: /^Befestigung/ }).click();
  await p.getByRole('combobox', { name: 'Spielphase bis' }).selectOption({ label: 'Mittleres Spiel' });
  await p.getByRole('group', { name: 'Filter Größe' }).getByRole('button', { name: /^Mittel/ }).click();
  await p.waitForFunction(() => /q=Turm/.test(decodeURIComponent(location.hash)));
  await results.first().waitFor();
  const cards = await results.evaluateAll(lis => lis.map(li => ({ text: li.textContent ?? '', kicker: li.querySelector('.bcard-kicker')?.textContent ?? '', size: li.querySelector('.bcard-facts span')?.textContent ?? '', stage: li.querySelector('.stage')?.textContent ?? '' })));
  assert.ok(cards.length > 0, 'Treffer');
  for (const c of cards) {
    assert.match(c.kicker, /^Befestigung/, `Kategorie: ${c.kicker}`);
    assert.match(c.stage, /Erster Tag|Frühes Spiel|Mittleres Spiel/, `Spielphase: ${c.stage}`);
    const [w, , d] = c.size.split('×').map(Number);
    assert.ok(w * d > 25, `Größe Mittel (bebaute Fläche 26–100 m², Kasten größer): ${c.size}`);
  }
  const filtered = cards.length;
  // Das Suchwort grenzt wirklich ein (sucht in Namen, Stichwörtern und Beschreibung).
  await search.fill('');
  await p.waitForFunction(n => document.querySelectorAll('.catalog-results > li').length > n, filtered);
  await search.fill('Turm');
  await p.waitForFunction(n => document.querySelectorAll('.catalog-results > li').length === n, filtered);

  // Seite 2: ohne Suchwort, nur Spielphase, hat der Katalog mehr Treffer als eine Seite.
  await p.getByRole('button', { name: 'Alle Filter zurücksetzen' }).click();
  await search.fill('');
  await p.getByRole('combobox', { name: 'Spielphase bis' }).selectOption({ label: 'Mittleres Spiel' });
  await results.first().waitFor();
  const page1 = await results.count();
  await p.getByRole('button', { name: /^Weitere \d+ laden/ }).click();
  await p.waitForFunction(n => document.querySelectorAll('.catalog-results > li').length > n, page1);
  const page2 = await results.count();
  const overview = p.url();
  const state = async () => ({ q: await search.inputValue(), n: await results.count(), stage: await p.getByRole('combobox', { name: 'Spielphase bis' }).inputValue(), last: await results.last().innerText() });
  const want = await state();

  // Gebäude von Seite 2 öffnen, mit „Zurück“ des Browsers zurück: Filter, Suchwort und Seite wie vorher.
  await results.last().locator('a.bcard-open').click();
  await p.waitForURL(/#\/bibliothek\/gebaeude\//);
  await p.locator('.building-detail').waitFor();
  await p.goBack();
  await results.first().waitFor();
  assert.deepEqual(await state(), want, 'nach Zurück wie vorher');

  // Dieselbe Suche mit Suchwort im neuen Tab: gleiche Treffer.
  await search.fill('Turm');
  await p.getByRole('group', { name: 'Kategorien' }).getByRole('button', { name: /^Befestigung/ }).click();
  await p.waitForFunction(() => /q=Turm/.test(decodeURIComponent(location.hash)) && /Befestigung|befestigung/.test(decodeURIComponent(location.hash)));
  await results.first().waitFor();
  const shared = p.url(), names = await results.locator('.bcard-body strong').allInnerTexts();
  const tab = await context.newPage();
  await tab.goto(shared);
  await tab.getByRole('searchbox', { name: 'Bauteile suchen' }).waitFor({ timeout: 90_000 });
  await tab.locator('.catalog-results > li').first().waitFor();
  assert.equal(await tab.getByRole('searchbox', { name: 'Bauteile suchen' }).inputValue(), 'Turm');
  assert.deepEqual(await tab.locator('.catalog-results > li .bcard-body strong').allInnerTexts(), names, 'neuer Tab: dieselbe Suche');
  void overview;
  console.log(`# BIB-01 ${ENGINE}: gefiltert ${filtered}, bis Mittleres Spiel ${page1}+${page2 - page1}, Vorschaubilder ${thumbs} ms, nach Scrollen ${scrolled} ms`);
  assert.ok(thumbs < 10_000 && scrolled < 10_000, 'Vorschaubilder ohne langes Nachladen');
  assert.deepEqual(errors, []);
  await context.close();
});

// ───────────── BIB-03 ─────────────
test('BIB-03: Gebäude in ein Projekt, Ensemble als Projekt ohne Überschneidung, Anlage mit Konfliktvorschau, Bauwelten', async () => {
  const { p, context, errors } = await open();
  await p.goto(BASE);
  await openSampleProject(p);
  await p.waitForURL(/#\/projekt\//);
  await p.getByText('✓ Geometrisch konfliktfrei').waitFor();
  // Detailseite → Projekt hinzufügen → Projekt öffnen: das Gebäude steht im Editor und ist auswählbar.
  await p.goto(`${BASE}#/bibliothek/gebaeude/bld_dorfbrunnen`);
  await p.locator('.building-detail').waitFor();
  await p.getByRole('button', { name: '＋ Ins Projekt übernehmen' }).click();
  await p.getByText(/„Dorfbrunnen“ in „Burgmauer \(Beispiel\)“ eingefügt/).waitFor();
  await p.getByRole('link', { name: 'Zum Editor →' }).click();
  await p.waitForURL(/#\/projekt\//);
  const brunnen = p.locator('.instance-list li').filter({ hasText: 'Dorfbrunnen' }).getByRole('button');
  await brunnen.click();
  assert.equal(await brunnen.getAttribute('aria-pressed'), 'true', 'auswählbar');
  await p.locator('.inspector-body input').first().waitFor();
  assert.equal(await p.locator('.inspector-body input').first().inputValue(), 'Dorfbrunnen 1');

  // Ensemble als Projekt: alle Gebäude ohne Überschneidung.
  await p.goto(`${BASE}#/bibliothek/ensembles`);
  await p.locator('.ecard').filter({ has: p.locator('strong', { hasText: /^Marktdorf$/ }) }).click();
  const ens = p.locator('.ensemble-sheet');
  await ens.getByRole('heading', { name: 'Marktdorf' }).waitFor();
  const members = Number((await ens.innerText()).match(/(\d+) Gebäude/)?.[1] ?? 0);
  await ens.getByRole('button', { name: 'Als Projekt anlegen' }).click();
  await p.waitForURL(/#\/projekt\//);
  await p.getByText('✓ Geometrisch konfliktfrei').waitFor();
  const placed = await p.locator('.instance-list li').count();
  assert.ok(placed >= 3 && (!members || placed === members), `alle Gebäude des Ensembles (${placed}/${members})`);
  assert.equal(await p.locator('.instance-list .badge.danger').count(), 0, 'keine Überschneidung');
  // Sinnvolle Stelle: keine zwei Grundflächen deckungsgleich, alle in einem kompakten Bereich.
  const proj = (await readStore(p, 'projects')).find(x => x.id === decodeURIComponent(p.url().match(/projekt\/([^/]+)/)[1]));
  const spots = proj.instances.map(i => i.transform.position.join(','));
  assert.equal(new Set(spots).size, spots.length, 'jedes Gebäude an eigener Stelle');

  // Bauwelten durchblättern, Anlage mit Konfliktvorschau ansehen und übernehmen.
  await p.goto(`${BASE}#/bibliothek/bauwelten`);
  const worlds = p.locator('[id^="bauwelt-"]');
  await worlds.first().waitFor();
  assert.ok(await worlds.count() >= 8, 'Bauwelten');
  await p.locator('#bauwelt-landleben').getByRole('link', { name: /Als Anlage planen/ }).click();
  await p.waitForURL(/anlagen\/anl_landleben$/);
  const conflicts = p.getByTestId('anlage-conflicts');
  await conflicts.getByText('keine').waitFor();
  const hand = p.locator('[data-district=handwerk]');
  for (let i = 0; i < 12; i++) await hand.getByRole('button', { name: 'Handwerkerzeile nach Westen' }).click();
  await conflicts.locator('.warn-text').waitFor();
  assert.ok(Number(await conflicts.innerText()) > 0, 'Konflikte werden markiert');
  const adopt = p.getByRole('button', { name: 'Als Projekt anlegen' });
  assert.equal(await adopt.isDisabled(), true, 'ohne Bestätigung gesperrt');
  await p.locator('.anlage-accept input').check();
  const before = (await readStore(p, 'projects')).length;
  await p.getByLabel('Projektname').fill('Dorf mit Konflikt');
  await adopt.click();
  await p.waitForURL(/#\/projekt\//, { timeout: 60_000 });
  const all = await readStore(p, 'projects');
  assert.equal(all.length, before + 1, 'Übernahme legt ein Projekt an');
  assert.ok(all.find(x => x.name === 'Dorf mit Konflikt').instances.length > 10, 'Anlage mit allen Gebäuden übernommen');
  assert.deepEqual(errors, []);
  await context.close();
});

// ───────────── PROJ-01 ─────────────
test('PROJ-01: Bauteile verschieben, drehen, spiegeln, Mehrfachauswahl mit Umschalt, Überschneidung rot, Rückgängig/Wiederholen', async () => {
  const { p, context, errors } = await open();
  await p.goto(BASE);
  await openSampleProject(p);
  await p.waitForURL(/#\/projekt\//);
  await p.getByText('✓ Geometrisch konfliktfrei').waitFor();
  const stored = async () => (await readStore(p, 'projects')).find(x => x.name === 'Burgmauer (Beispiel)');
  const saved = () => p.locator('.save-state.saved').waitFor();
  const start = await stored();
  const pos = name => start.instances.find(i => i.name === name).transform;
  const undo = p.getByRole('button', { name: /Rückgängig/ }), redo = p.getByRole('button', { name: /Wiederholen/ });

  // Verschieben (Knopf und Eingabe), drehen, spiegeln – jeder Schritt einzeln rückgängig.
  await p.locator('.instance-list').getByRole('button', { name: /Turm Ost/ }).click();
  await p.getByRole('button', { name: 'Z plus 1' }).click();
  await p.getByLabel('X-Koordinate').fill('30');
  await p.getByLabel('X-Koordinate').press('Enter');
  await p.getByRole('button', { name: '↻ 90°' }).click();
  await p.getByText('Drehung 90° · nicht gespiegelt').waitFor();
  await p.getByRole('button', { name: '⇋ Spiegeln' }).click();
  await p.getByText('Drehung 90° · gespiegelt').waitFor();
  await saved();
  let t = (await stored()).instances.find(i => i.name === 'Turm Ost').transform;
  assert.deepEqual([t.position[0], t.position[2], t.quarterTurns, t.mirrorX], [30, pos('Turm Ost').position[2] + 1, (pos('Turm Ost').quarterTurns + 1) % 4, !pos('Turm Ost').mirrorX]);
  for (const text of ['Drehung 90° · nicht gespiegelt', 'Drehung 0° · nicht gespiegelt']) { await undo.click(); await p.getByText(text).waitFor(); }
  await undo.click(); await undo.click();
  await saved();
  t = (await stored()).instances.find(i => i.name === 'Turm Ost').transform;
  assert.deepEqual(t, pos('Turm Ost'), 'Rückgängig stellt jeden Schritt wieder her');
  for (let i = 0; i < 4; i++) await redo.click();
  await p.getByText('Drehung 90° · gespiegelt').waitFor();
  for (let i = 0; i < 4; i++) await undo.click();
  await p.getByText('Drehung 0° · nicht gespiegelt').waitFor();

  // Tastatur: Strg+Z / Strg+Y wirken außerhalb von Eingabefeldern.
  await p.getByRole('button', { name: 'X minus 1' }).click();
  await p.locator('.viewport').click({ position: { x: 5, y: 5 } }).catch(() => {});
  await p.keyboard.press('Control+z');
  await saved();
  assert.equal((await stored()).instances.find(i => i.name === 'Turm Ost').transform.position[0], pos('Turm Ost').position[0]);
  await p.keyboard.press('Control+y');
  await saved();
  assert.equal((await stored()).instances.find(i => i.name === 'Turm Ost').transform.position[0], pos('Turm Ost').position[0] - 1);
  await p.keyboard.press('Control+z');

  // Überschneidung wird rot gemeldet (Abzeichen in der Liste und Bericht), Rückgängig löst sie.
  await p.locator('.instance-list').getByRole('button', { name: /Mauer 1/ }).click();
  await p.getByRole('button', { name: 'X minus 1' }).click();
  await p.locator('.instance-list .badge.danger').first().waitFor();
  // Rot heißt: der Hintergrund des Abzeichens ist deutlich rötlich (Farbe in srgb/rgb, Theme hell oder dunkel).
  const [r, g, b] = await p.locator('.instance-list .badge.danger').first().evaluate(e => {
    const c = document.createElement('canvas').getContext('2d'); c.fillStyle = getComputedStyle(e).backgroundColor; c.fillRect(0, 0, 1, 1);
    return [...c.getImageData(0, 0, 1, 1).data].slice(0, 3);
  });
  assert.ok(r > g + 25 && r > b + 25, `Konflikt rot markiert (Hintergrund ${r},${g},${b})`);
  await p.getByText('⚠ Offene Punkte vor einem baubaren Export').waitFor();
  await undo.click();
  await p.getByText('✓ Geometrisch konfliktfrei').waitFor();

  // Mehrfachauswahl mit Umschalt-Klick: Gruppe, als Ganzes verschieben, ein Rückgängig-Schritt.
  await p.locator('.instance-list').getByRole('button', { name: /Turm West/ }).click({ modifiers: ['Shift'] });
  await p.locator('.instance-list').getByRole('button', { name: /Mauer 1/ }).click({ modifiers: ['Shift'] });
  const panel = p.locator('.group-panel');
  await panel.getByText('GRUPPE · 2 INSTANZEN').waitFor();
  await panel.getByRole('button', { name: 'Gruppe X+' }).click();
  await saved();
  const moved = await stored();
  for (const name of ['Turm West', 'Mauer 1']) assert.equal(moved.instances.find(i => i.name === name).transform.position[0], pos(name).position[0] + 1, `${name} mitbewegt`);
  assert.match(await undo.getAttribute('title'), /2 Instanzen/);
  await undo.click();
  await saved();
  for (const name of ['Turm West', 'Mauer 1']) assert.equal((await stored()).instances.find(i => i.name === name).transform.position[0], pos(name).position[0]);
  assert.deepEqual(errors, []);
  await context.close();
});

// ───────────── PROJ-02 ─────────────
test('PROJ-02: Bauitems und Rohstoffe, nach Bauteil filtern, Rezepte wie im offiziellen Minecraft 26.3', async () => {
  const { p, context, errors } = await open();
  await p.goto(`${BASE}#/bibliothek/ensembles`);
  await p.locator('.ecard').filter({ has: p.locator('strong', { hasText: /^Marktdorf$/ }) }).click();
  await p.locator('.ensemble-sheet').getByRole('button', { name: 'Als Projekt anlegen' }).click();
  await p.waitForURL(/#\/projekt\//);
  await p.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name: 'Material' }).click();
  await p.getByText(/Gesamtprojekt: (vollständige|vorläufige) Bauitemliste/).first().waitFor();
  // Was nicht als Item zählt, sind nur Flüssigkeiten (Eimer und Quellen werden nicht berechnet).
  const shown = await p.locator('.page').innerText();
  if (/vorläufige/.test(shown)) assert.match(shown.slice(shown.indexOf('Ungelöst nicht')), /^Ungelöst[^\n]*\n[^\n]*\nminecraft:water[\s\S]*?Flüssigkeit/);
  const table = p.locator('.materials-table tbody tr');
  const rows = await table.evaluateAll(trs => trs.map(tr => tr.textContent ?? ''));
  // Treppen, Stufen und Türen als Items: eine Tür ist ein Item, nicht zwei Blöcke.
  assert.ok(rows.some(r => /_stairs/.test(r)) && rows.some(r => /_slab/.test(r)), 'Treppen und Stufen als Items');
  // Nach Bauteil filtern: kleinerer Umfang, kleinere Liste.
  const scope = p.getByLabel('Umfang der Materialliste');
  const options = await scope.locator('option').allInnerTexts();
  await scope.selectOption({ label: options[1] });
  await p.getByText(/Instanz „.*“: vollständige Bauitemliste/).waitFor();
  assert.ok(await table.count() <= rows.length);
  await scope.selectOption({ label: 'Gesamtprojekt' });
  await p.getByText(/Gesamtprojekt: (vollständige|vorläufige) Bauitemliste/).first().waitFor();

  const panel = p.getByRole('region', { name: 'Rohstoffe und Rezepte' });
  await panel.getByText('✓ Alle Bauitems bis zu Rohstoffen aufgelöst').waitFor();
  assert.ok(await panel.locator('.raw-table tbody tr').count() > 0);
  assert.match(await panel.innerText(), /Inventarplätze Rohstoffe\s+\d+/, 'Rohstoffplanung zeigt Inventarplätze');
  assert.match(shown, /Inventarplätze \(Stacks\)\s+\d+[\s\S]*Shulkerkisten à 27 Plätze\s+\d+/, 'Stapel und Kisten');
  const short = id => id.replace(/^minecraft:/, '');
  const checked = new Set();
  // Every shown step, per operation, is a recipe of the official 26.3 server (version profile from server.jar).
  const verify = async label => {
    const lines = await panel.locator('.recipe-steps li').evaluateAll(lis => lis.map(li => ({ station: li.querySelector('.step-station')?.textContent ?? '', formula: li.querySelector('.step-formula')?.textContent ?? '', out: li.querySelector('.step-formula b')?.textContent ?? '' })));
    assert.ok(lines.length > 5, `${label}: Rezeptschritte`);
    for (const { station, formula, out: made } of lines) {
      const ops = Number(station.match(/× ([\d.]+)/)[1].replace(/\./g, ''));
      const left = formula.split(' → ')[0];
      const out = made.trim().match(/^([\d.]+) ([a-z0-9_]+)$/);
      const produced = Number(out[1].replace(/\./g, '')), item = out[2];
      const inputs = left.split(' + ').map(s => s.match(/^([\d.]+) (\S+)/)).map(m => [m[2], Number(m[1].replace(/\./g, '')) / ops]);
      if (/Ofen|Schmelz|Werkzeug|Wasser/.test(station)) continue;
      const game = profileRecipesFor(`minecraft:${item}`).filter(r => r.station === (/Steinsäge/.test(station) ? 'stonecutter' : 'crafting'));
      assert.ok(game.length, `${label}: ${item} hat ein ${station}-Rezept im Spiel`);
      const ok = game.some(r => r.count === produced / ops &&
        inputs.every(([id, n]) => r.inputs.some(g => g.count === n && g.alternatives.includes(`minecraft:${id}`))) &&
        r.inputs.reduce((a, g) => a + g.count, 0) === inputs.reduce((a, [, n]) => a + n, 0));
      assert.ok(ok, `${label}: ${formula} (${station}) entspricht einem Spielrezept: ${JSON.stringify(game.map(r => [r.file, r.count, r.inputs.map(g => [g.count, g.tag ?? g.alternatives.slice(0, 2)])]))}`);
      checked.add(`${/Steinsäge/.test(station) ? 'S' : 'W'}:${item}:${produced / ops}`);
    }
  };
  await verify('Steinsäge bevorzugt');
  await panel.getByLabel('Steinsäge bevorzugen').uncheck();
  await verify('nur Werkbank');
  const list = [...checked];
  // The examples of the case: 6 slabs from 3 blocks, 4 stairs from 6 blocks; glass panes and lanterns when present.
  assert.ok(list.some(x => /^W:.*_slab:6$/.test(x)), `6 Platten aus 3 Blöcken: ${list.join(' ')}`);
  assert.ok(list.some(x => /^W:.*_stairs:4$/.test(x)), `4 Treppen aus 6 Blöcken: ${list.join(' ')}`);
  console.log(`# PROJ-02 ${ENGINE}: ${list.length} Rezepte gegen das 26.3-Profil geprüft: ${list.filter(x => /pane|lantern|stairs|slab|door/.test(x)).join(' ')}`);
  assert.deepEqual(errors, []);
  await context.close();
});

// ───────────── PROJ-08 ─────────────
test('PROJ-08: großes Projekt (Ensemble Burg) bleibt in allen Reitern bedienbar, lange Berechnungen zeigen Fortschritt', async () => {
  const { p, context, errors } = await open();
  await p.goto(`${BASE}#/bibliothek/ensembles`);
  await p.locator('.ecard').filter({ has: p.locator('strong', { hasText: /^Burg$/ }) }).click();
  await p.locator('.ensemble-sheet').getByRole('button', { name: 'Als Projekt anlegen' }).click();
  await p.waitForURL(/#\/projekt\//);
  await p.getByText('✓ Geometrisch konfliktfrei').waitFor({ timeout: 60_000 });
  // Event-loop probe: the longest block of the main thread while switching through every tab.
  await p.evaluate(() => {
    window.__longest = 0; let last = performance.now();
    const tick = () => { const now = performance.now(); window.__longest = Math.max(window.__longest, now - last); last = now; window.__probe = setTimeout(tick, 16); };
    tick();
  });
  const tabs = await p.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link').evaluateAll(as => as.map(a => a.textContent?.trim()));
  const timings = [];
  for (const name of tabs) {
    const t0 = Date.now();
    await p.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name, exact: true }).click();
    await p.locator('[data-page-loading]').waitFor({ state: 'detached', timeout: 60_000 });
    await p.locator('.project-page[data-computation-state=ready]').waitFor({ timeout: 60_000 });
    // While something computes, the page says so instead of freezing; a button stays clickable.
    await p.getByRole('link', { name: 'Projekte' }).first().hover({ timeout: 5_000 });
    timings.push(`${name} ${Date.now() - t0} ms`);
  }
  const longest = await p.evaluate(() => { clearTimeout(window.__probe); return window.__longest; });
  console.log(`# PROJ-08 ${ENGINE}: ${tabs.length} Reiter, längste Blockade ${Math.round(longest)} ms; ${timings.join(', ')}`);
  assert.ok(tabs.length >= 10, `alle Reiter (${tabs.length})`);
  assert.ok(longest < 5_000, `Seite friert nicht ein (längste Blockade ${Math.round(longest)} ms)`);
  assert.deepEqual(errors, []);
  await context.close();
});

// ───────────── KARTE-06 ─────────────
test('KARTE-06: Messen mit drei Punkten, Höhenprofil über einen Hang, Route weicht Steilstufe und Wasser aus oder meldet keinen Weg', async () => {
  const { p, context, errors } = await open();
  await p.goto(`${BASE}#/karte`);
  await p.locator('.map-page[data-map-state=ready]').waitFor({ timeout: 90_000 });
  const canvas = p.locator('.overview-canvas');
  await canvas.evaluate(el => el.scrollIntoView({ block: 'center' }));
  const at = async (x, z) => {
    const box = await canvas.boundingBox(), scale = Number(await canvas.getAttribute('data-scale'));
    const [cx, cz] = (await canvas.getAttribute('data-center')).split(',').map(Number);
    return { x: box.x + box.width / 2 + (x + 0.5 - cx) * scale, y: box.y + box.height / 2 + (z + 0.5 - cz) * scale };
  };
  const clickAll = async cols => { for (const [x, z] of cols) { const q = await at(x, z); await p.mouse.click(q.x, q.y); await p.waitForTimeout(420); } };

  // Gelände aus der Mod (alter Mod-Stand: nur Chunks).
  const game = p.getByRole('region', { name: 'Spielverbindung' });
  await game.getByText('Port', { exact: true }).click();
  await game.getByLabel('Port der Mod').fill(String(MOD));
  await game.getByRole('button', { name: 'Verbinden' }).click();
  await game.getByText('Mod gefunden, nicht gekoppelt').waitFor();
  mod.openPairing();
  await game.getByLabel('Code').fill('482913');
  await game.getByRole('button', { name: 'Koppeln' }).click();
  await p.locator('.live-game[data-live-phase=connected]').waitFor();
  await game.getByRole('button', { name: 'Gelände um mich lesen' }).click();
  await p.getByRole('status').filter({ hasText: /Chunks aus dem Spiel gelesen/ }).waitFor();
  await game.getByRole('button', { name: 'Zu mir' }).click();
  await p.waitForTimeout(800);
  await canvas.evaluate(el => el.scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(300);

  // Messen (M): drei Punkte, Eingabe beendet, Escape löscht.
  await canvas.focus(); await p.keyboard.press('Escape'); await p.keyboard.press('m');
  await clickAll([[0, -30], [12, -30], [12, -21]]);
  await canvas.press('Enter');
  const hud = p.getByTestId('map-measure');
  const text = await hud.innerText();
  assert.match(text, /^21 Blöcke Luftlinie · 21 zu Fuß \(ΔX 12, ΔZ 9\) · 3 Punkte · Höhe 64 → 64 \(\+0\) · 2,6 Blöcke im Nether · Fläche ≈ 54 Blöcke²/, text);
  await canvas.press('Escape');
  await hud.waitFor({ state: 'detached' });

  // Weg gerade über das Plateau: Höhenprofil nennt Y-Bereich, Auf-/Abstieg und Stufen.
  await canvas.focus(); await p.keyboard.press('Escape'); await p.keyboard.press('w');
  await clickAll([[22, -4], [43, -4]]);
  await canvas.press('Enter');
  const editor = p.locator('.plan-editor');
  await editor.getByRole('heading', { name: 'Weg: Weg 1' }).waitFor();
  const profile = p.getByTestId('path-profile');
  assert.match(await profile.innerText(), /Höhenprofil\s*Y 64 … 72\s*↑ 8 ↓ 8 Blöcke · größte Stufe 8/);
  await profile.getByRole('button', { name: '⤳ Route übers Gelände' }).click();
  await p.getByRole('status').filter({ hasText: /„Weg 1“ über das Gelände geführt \(\d+ Ecken\)/ }).waitFor();
  const plan = async () => (await readStore(p, 'meta')).find(m => m.key === 'worldPlan').value ?? (await readStore(p, 'meta')).find(m => m.key === 'worldPlan');
  const columns = pts => { const out = []; for (let i = 1; i < pts.length; i++) { const [a, b] = [pts[i - 1], pts[i]]; const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); for (let k = 0; k <= n; k++) out.push([Math.round(a[0] + (b[0] - a[0]) * k / n), Math.round(a[1] + (b[1] - a[1]) * k / n)]); } return out; };
  const pathOf = async name => { const w = await plan(); return (w.items ?? w.plan?.items).find(i => i.kind === 'path' && i.name === name); };
  const around = await pathOf('Weg 1');
  assert.ok(columns(around.points).every(([x, z]) => !plateau(x, z)), `Route geht um die Steilstufe: ${JSON.stringify(around.points)}`);
  assert.match(await profile.innerText(), /größte Stufe [01]\b/, 'nach der Route: keine Steilstufe mehr');

  // Weg durch den Teich: die Route weicht dem Wasser aus.
  await canvas.focus(); await p.keyboard.press('Escape'); await p.keyboard.press('w');
  await clickAll([[44, -4], [60, -4]]);
  await canvas.press('Enter');
  await editor.getByRole('heading', { name: 'Weg: Weg 2' }).waitFor();
  await profile.getByRole('button', { name: '⤳ Route übers Gelände' }).click();
  await p.getByRole('status').filter({ hasText: /„Weg 2“ über das Gelände geführt/ }).waitFor();
  const dry = await pathOf('Weg 2');
  const pond = (x, z) => x >= 48 && x < 56 && z >= -8 && z < 0;
  assert.ok(columns(dry.points).every(([x, z]) => !pond(x, z)), `Route weicht dem Wasser aus: ${JSON.stringify(dry.points)}`);

  // Ziel oben auf dem Plateau: rundum Steilstufe → verständliche Meldung statt eines falschen Wegs.
  await canvas.focus(); await p.keyboard.press('Escape'); await p.keyboard.press('w');
  await clickAll([[20, -20], [32, -4]]);
  await canvas.press('Enter');
  await editor.getByRole('heading', { name: 'Weg: Weg 3' }).waitFor();
  const straight = (await pathOf('Weg 3')).points;
  assert.equal(straight.length, 2);
  await profile.getByRole('button', { name: '⤳ Route übers Gelände' }).click();
  await p.getByRole('status').filter({ hasText: /Keine Route gefunden: .*Stufen sind zu steil/ }).waitFor();
  assert.deepEqual((await pathOf('Weg 3')).points, straight, 'gerade belassen');
  assert.deepEqual(errors, []);
  await context.close();
});

// ───────────── GERAET-06 ─────────────
test('GERAET-06: Reiter Ebenen, alle Ebenen als kleine Pläne, Druckvorschau ohne abgeschnittene Ränder', async () => {
  const { p, context, errors } = await open({ width: 1300, height: 900 });
  await p.goto(`${BASE}#/bibliothek/gebaeude/bld_fachwerkhaus`);
  await p.locator('.building-detail').waitFor({ timeout: 90_000 });
  await p.getByRole('tablist', { name: 'Ansicht' }).getByRole('tab', { name: 'Ebenen' }).click();
  await p.getByRole('button', { name: 'Alle Ebenen' }).click();
  const plans = p.locator('.layer-all li');
  await plans.first().waitFor();
  const n = await plans.count();
  const range = await p.locator('.layer-all canvas').evaluateAll(cs => cs.length);
  assert.ok(n >= 5 && range === n, `alle Ebenen als Pläne (${n})`);
  // Druck: der Knopf ruft window.print; die Druckansicht (A4 hoch, 96 dpi) zeigt jeden Plan ganz.
  await p.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed++; }; });
  await p.getByRole('button', { name: '⎙ Drucken' }).click();
  await p.waitForFunction(() => window.__printed === 1 && document.body.classList.contains('printing-layers'));
  await p.setViewportSize({ width: 794, height: 1123 });
  await p.emulateMedia({ media: 'print' });
  const boxes = await p.locator('.layer-all').evaluate(root => {
    const page = document.documentElement.clientWidth;
    return { page, head: getComputedStyle(root.querySelector('.layer-print-head')).display, items: [...root.querySelectorAll('li')].map(li => { const r = li.getBoundingClientRect(), c = li.querySelector('canvas').getBoundingClientRect(); return [r.left, r.right, c.left, c.right, c.width, getComputedStyle(li).visibility]; }) };
  });
  assert.equal(boxes.head, 'block', 'Druckkopf mit Namen');
  for (const [l, r, cl, cr, w, vis] of boxes.items) {
    assert.equal(vis, 'visible');
    assert.ok(l >= 0 && r <= boxes.page && cl >= l - 0.5 && cr <= r + 0.5 && w > 20, `Plan ganz auf der Seite: ${[l, r, cl, cr, w]} / ${boxes.page}`);
  }
  const hidden = await p.evaluate(() => getComputedStyle(document.querySelector('.topbar, header')).visibility);
  assert.equal(hidden, 'hidden', 'nur die Pläne werden gedruckt');
  if (ENGINE === 'chromium') {
    const pdf = await p.pdf({ format: 'A4' });
    const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    assert.ok(pages >= 1 && pages <= Math.ceil(n / 3), `Druck als PDF: ${pages} Seiten für ${n} Ebenen`);
  }
  await p.emulateMedia({ media: 'screen' });
  assert.deepEqual(errors, []);
  await context.close();
});

// ───────────── SYS-01 + GERAET-01 ─────────────
test('SYS-01/GERAET-01: Systemcheck nennt Browser, System und Grafik, Dateien und Datencheck ohne Befund; Probebericht und Protokoll ohne Projektdaten', async () => {
  const { p, context, errors } = await open({ width: 1300, height: 900 }, { acceptDownloads: true });
  await p.goto(BASE);
  await openSampleProject(p);
  await p.waitForURL(/#\/projekt\//);
  await p.goto(`${BASE}#/system`);
  await p.getByRole('heading', { name: 'Läuft alles sauber?' }).waitFor();
  const device = p.getByTestId('device-facts');
  const facts = await device.innerText();
  assert.match(facts, /Browser\s+(Chrome|Chromium|Firefox|Safari|Edge)[^\n]* \d+/, facts);
  assert.match(facts, /System\s+(Linux|Windows|macOS|iPadOS|iOS|Android)/, facts);
  assert.match(facts, /Grafik\s+(WebGL [12] · \S|keine|nicht ermittelbar)/, facts);
  await p.getByRole('button', { name: 'Geladene Dateien prüfen' }).click();
  await p.getByText(/Programmdateien stimmen mit dem Build überein/).waitFor({ timeout: 60_000 });
  await p.getByRole('button', { name: 'Datencheck starten' }).click();
  await p.getByText('✓ Alles in Ordnung').waitFor({ timeout: 60_000 });
  assert.match(await p.locator('.system-result').innerText(), /geprüft: 1 Projekte?, \d+ Bauteile/);

  // Testprotokoll mit Gerät beim Namen: enthält Gerät, Browser und System.
  await p.goto(`${BASE}#/testphase`);
  await p.getByRole('heading', { name: 'Alles einmal durchspielen' }).waitFor();
  await p.getByLabel('Dein Name').fill('Philipp · iPad Air (Test)');
  const [protocolFile] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Protokoll als Datei' }).click()]);
  const protocol = readFileSync(await protocolFile.path(), 'utf8');
  assert.match(protocol, /- Tester: Philipp · iPad Air \(Test\)/);
  assert.match(protocol, /- Browser: \S+/);
  assert.match(protocol, /- System: \S+/);
  assert.match(protocol, /- Build: [0-9a-f]{7}/);

  // Probebericht: ausfüllen, als Datei speichern (nicht abschicken).
  await p.getByRole('button', { name: 'Fehler melden', exact: true }).click();
  const form = p.locator('.tp-report');
  await form.getByLabel('Titel').fill('Probebericht Block B');
  await form.getByLabel('Tatsächlich').fill('Nur ein Probebericht');
  const [reportFile] = await Promise.all([p.waitForEvent('download'), form.getByRole('button', { name: 'Als Datei speichern' }).click()]);
  const report = readFileSync(await reportFile.path(), 'utf8');
  assert.match(report, /Probebericht Block B/);
  assert.match(report, /- Build: [0-9a-f]{7} \(/);
  assert.match(report, /- Browser: /);
  assert.match(report, /- Grafik: (WebGL [12] · |keine|nicht ermittelbar)/);
  assert.match(report, /## Diagnose \(automatisch erfasst, ohne Projektdaten\)/);
  assert.ok(!/Burgmauer|Turm West|Mauer 1|Eckturm/.test(report), 'keine Projektdaten im Bericht');
  assert.deepEqual(errors, []);
  await context.close();
});

// ───────────── GERAET-04 ─────────────
// Playwright can only tap; one-finger drags and two-finger pinches are pointer events with pointerType "touch",
// the events Safari hands to the page for fingers (same approach as touch-devices.e2e.mjs). Langdruck auf der
// Weltkarte und die Werkstatt mit dem Finger prüft touch-devices.e2e.mjs.
const { devices } = require('playwright');
function profile(name) {
  const { defaultBrowserType: _e, ...d } = devices[name];
  if (ENGINE === 'firefox') delete d.isMobile;
  return d;
}
async function openTouch(name, extra = {}) {
  const r = await open(undefined, { ...profile(name), ...extra });
  await r.context.addInitScript(() => {
    for (const k of ['setPointerCapture', 'releasePointerCapture']) {
      const orig = Element.prototype[k];
      Element.prototype[k] = function (id) { try { return orig.call(this, id); } catch { /* synthetic pointer */ } };
    }
  });
  return r;
}
let pid = 500;
async function touch(p, steps) {
  await p.evaluate(steps => (async () => {
    const target = document.elementFromPoint(steps[0].x, steps[0].y);
    if (!target) throw new Error(`nichts unter ${steps[0].x},${steps[0].y}`);
    for (const s of steps) {
      const init = { bubbles: true, cancelable: true, composed: true, pointerId: s.id, pointerType: 'touch', isPrimary: !!s.primary, clientX: s.x, clientY: s.y, button: s.type === 'pointermove' ? -1 : 0, buttons: s.type === 'pointerup' ? 0 : 1, width: 10, height: 10, pressure: s.type === 'pointerup' ? 0 : 0.5 };
      target.dispatchEvent(new PointerEvent(s.type, init));
      await new Promise(r => requestAnimationFrame(() => r()));
    }
  })(), steps);
}
const fingerDrag = (a, b, n = 8) => { const id = pid++; return [{ type: 'pointerdown', id, primary: true, ...a }, ...Array.from({ length: n }, (_, i) => ({ type: 'pointermove', id, primary: true, x: a.x + (b.x - a.x) * (i + 1) / n, y: a.y + (b.y - a.y) * (i + 1) / n })), { type: 'pointerup', id, primary: true, ...b }]; };
const fingerPinch = (c, from = 30, to = 120, n = 8) => {
  const a = pid++, b = pid++;
  const s = [{ type: 'pointerdown', id: a, primary: true, x: c.x - from, y: c.y }, { type: 'pointerdown', id: b, x: c.x + from, y: c.y }];
  for (let i = 1; i <= n; i++) { const d = from + (to - from) * i / n; s.push({ type: 'pointermove', id: a, primary: true, x: c.x - d, y: c.y }, { type: 'pointermove', id: b, x: c.x + d, y: c.y }); }
  return [...s, { type: 'pointerup', id: b, x: c.x + to, y: c.y }, { type: 'pointerup', id: a, primary: true, x: c.x - to, y: c.y }];
};
const cameraOf = async host => (await host.getAttribute('data-camera')).split(',').map(Number);
const dist = v => Math.hypot(...v);

for (const name of ['iPad Pro 11', 'iPad Pro 11 landscape', 'iPhone 15']) {
  test(`GERAET-04 (${name}): 3D mit einem Finger drehen, mit zwei zoomen, Ebenenschieber, Reiterleiste, Spiel-Bereiche, Ziele treffbar`, async () => {
    const { p, context, errors } = await openTouch(name);
    // Gebäude in 3D: drehen und zoomen folgen dem Finger, die Seite scrollt nicht mit.
    await p.goto(`${BASE}#/bibliothek/gebaeude/bld_fachwerkhaus`);
    const host = p.locator('.building-detail .canvas-host[data-mesh=ready]');
    await host.waitFor({ timeout: 90_000 });
    await host.evaluate(h => h.scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(400);
    assert.equal(await host.locator('canvas').evaluate(c => getComputedStyle(c).touchAction), 'none', 'Finger auf dem 3D-Bild scrollen die Seite nicht');
    const box = await host.locator('canvas').boundingBox(), c = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const scrollY = await p.evaluate(() => scrollY);
    const cam0 = await cameraOf(host);
    await touch(p, fingerDrag({ x: c.x - 60, y: c.y }, { x: c.x + 60, y: c.y + 20 }));
    await p.waitForTimeout(500);
    const cam1 = await cameraOf(host);
    assert.notDeepEqual(cam1, cam0, 'ein Finger dreht');
    assert.ok(Math.abs(dist(cam1) - dist(cam0)) < dist(cam0) * 0.1, 'Drehen ändert den Abstand kaum');
    await touch(p, fingerPinch(c));
    await p.waitForTimeout(600);
    const cam2 = await cameraOf(host);
    assert.ok(dist(cam2) < dist(cam1) * 0.95, `zwei Finger zoomen hinein (${dist(cam1).toFixed(1)} → ${dist(cam2).toFixed(1)})`);
    assert.equal(await p.evaluate(() => scrollY), scrollY, 'Seite bleibt stehen');
    // Ebenenschieber: Einzeln, dann eine Ebene – das Bild zeigt weniger Blöcke; Schieber gut treffbar.
    const blocks = Number(await host.getAttribute('data-blocks'));
    const layers = p.getByRole('group', { name: 'Schichtfilter' });
    await layers.getByRole('button', { name: 'Einzeln' }).tap();
    const slider = layers.locator('input[type=range]').last();
    const sb = await slider.boundingBox();
    assert.ok(sb.height >= 44 && sb.width >= 160, `Schieber treffbar (${Math.round(sb.width)}×${Math.round(sb.height)})`);
    await p.waitForFunction(n => Number(document.querySelector('.building-detail .canvas-host[data-mesh=ready]')?.dataset.blocks) < n, blocks);
    for (const h of await layers.getByRole('button').evaluateAll(bs => bs.map(b => b.getBoundingClientRect().height))) assert.ok(h >= 44, `Schichtknöpfe treffbar (${h} px)`);
    assert.ok(await noSideScroll(p), 'Gebäude: nichts ragt seitlich heraus');

    // Projekt: Reiterleiste waagerecht wischbar, der aktive Reiter bleibt sichtbar, Reiter 44 px hoch.
    await p.goto(BASE);
    await openSampleProject(p);
    await p.waitForURL(/#\/projekt\//);
    const bar = p.getByRole('navigation', { name: 'Projektbereiche' });
    await bar.getByRole('link', { name: 'Updates', exact: true }).tap();
    await p.waitForURL(/\/updates$/);
    await p.waitForTimeout(300);
    const geo = await bar.evaluate(b => { const a = b.querySelector('[aria-current=page]').getBoundingClientRect(), r = b.getBoundingClientRect(); return { a: [a.left, a.right], r: [r.left, r.right], scroll: b.scrollWidth > b.clientWidth + 1, hs: [...b.querySelectorAll('a')].map(x => x.getBoundingClientRect().height) }; });
    assert.ok(geo.a[0] >= geo.r[0] - 1 && geo.a[1] <= geo.r[1] + 1, `aktiver Reiter sichtbar: ${JSON.stringify(geo)}`);
    assert.ok(geo.hs.every(h => h >= 44), `Reiter mindestens 44 px: ${geo.hs.join(',')}`);
    if (geo.scroll) assert.match(await bar.evaluate(b => getComputedStyle(b).overflowX), /auto|scroll/, 'Reiterleiste wischbar');
    assert.ok(await noSideScroll(p), 'Projekt: nichts ragt seitlich heraus');

    // Spiel: aufklappbare Bereiche öffnen per Finger.
    await p.goto(`${BASE}#/mod`);
    const more = p.locator('.page details.more > summary');
    await more.first().waitFor();
    const n = await more.count();
    for (let i = 0; i < n; i++) { await more.nth(i).scrollIntoViewIfNeeded(); await more.nth(i).tap(); }
    assert.equal(await p.locator('.page details.more[open]').count(), n, `alle ${n} Bereiche offen`);
    for (const h of await more.evaluateAll(s => s.map(x => x.getBoundingClientRect().height))) assert.ok(h >= 40, `Bereichskopf treffbar (${h} px)`);
    assert.ok(await noSideScroll(p), 'Spiel: nichts ragt seitlich heraus');
    for (const route of ['#/', '#/bibliothek', '#/karte', '#/anleitung']) {
      await p.goto(`${BASE}${route}`);
      await p.waitForTimeout(1200);
      assert.ok(await noSideScroll(p), `${route}: nichts ragt seitlich heraus`);
    }
    assert.deepEqual(errors, []);
    await context.close();
  });
}

test('GERAET-04: „Bewegung reduzieren“ – nach dem Neuladen blendet nichts mehr ein', async () => {
  const { p, context, errors } = await openTouch('iPad Pro 11', { reducedMotion: 'reduce' });
  await p.goto(BASE);
  await waitForStart(p);
  await p.reload();
  await waitForStart(p);
  for (const route of ['#/', '#/bibliothek', '#/anleitung']) {
    await p.goto(`${BASE}${route}`);
    await p.waitForTimeout(800);
    const moving = await p.evaluate(() => document.getAnimations().filter(a => { const t = a.effect?.getComputedTiming?.(); return a.playState === 'running' && t && Number(t.duration) > 20; }).map(a => `${a.effect?.target?.className ?? ''}:${a.effect?.getComputedTiming?.().duration}`));
    assert.deepEqual(moving, [], `${route}: keine laufende Einblendung`);
    const slow = await p.evaluate(() => [...document.querySelectorAll('button, a, .card, .bcard')].slice(0, 200).map(e => getComputedStyle(e)).filter(s => s.transitionDuration.split(',').some(d => parseFloat(d) > 0.01)).length);
    assert.equal(slow, 0, `${route}: keine Übergänge`);
  }
  assert.deepEqual(errors, []);
  await context.close();
});
