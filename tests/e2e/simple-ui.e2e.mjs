// UX-01/UX-02: einfache Bedienung – vier Hauptbereiche, drei Einstiege, Projektreiter in drei Hauptansichten mit Kurzsatz,
// Bibliotheksgruppen und eingeklappte Experten- und Datei-Wege (Desktop 1400 px und Handy 390 px).
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { openSampleProject, waitForStart, REFUSED } from './start.mjs';

const PORT = 4339, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

async function open(viewport) {
  const context = await browser.newContext({ viewport, hasTouch: viewport.width < 500 });
  const p = await context.newPage();
  p.setDefaultTimeout(10_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  return { p, errors, context };
}
const fits = p => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) test(`Einfache Bedienung (${viewport.width} px)`, async () => {
  const { p, errors, context } = await open(viewport);
  try {
    await p.goto(BASE);
    await waitForStart(p);
    const mobile = viewport.width < 500;
    const nav = p.getByRole('navigation', { name: mobile ? 'Hauptnavigation mobil' : 'Hauptnavigation', exact: true });
    // Vier Hauptbereiche plus die Anleitung (GUIDE-01); Betrachter und Weltimport nicht mehr oben.
    assert.deepEqual(await nav.getByRole('link').evaluateAll(a => a.map(x => x.getAttribute('href'))), ['#/', '#/bibliothek', '#/karte', '#/mod', '#/anleitung']);
    // Datei-Wege in der Fußzeile.
    const footer = p.getByRole('navigation', { name: 'Weitere Links' });
    assert.equal(await footer.getByRole('link', { name: 'Weltimport aus Datei' }).getAttribute('href'), '#/welt');

    // Startseite (UX-02): drei direkte Einstiege, Datei-Import ist ein normaler Weg; Sicherung bleibt eingeklappt.
    const entries = p.getByRole('region', { name: 'Wie möchtest du anfangen?' });
    assert.deepEqual(await entries.getByRole('heading').allInnerTexts(), ['Projekt fortsetzen', 'Bauwerk auswählen', 'Datei ansehen oder importieren']);
    assert.equal(await entries.getByRole('link', { name: 'Datei ansehen' }).getAttribute('href'), '#/betrachter');
    assert.equal(await entries.getByRole('link', { name: 'Als Bauteil in die Bibliothek' }).getAttribute('href'), '#/bibliothek?import=1');
    assert.ok(await entries.getByRole('button', { name: 'Geführte Tour mit der Burgmauer' }).isVisible());
    assert.doesNotMatch(await p.locator('.page').first().innerText(), /nur im Notfall/);
    assert.equal(await p.getByRole('button', { name: 'Alles sichern' }).isVisible(), false);
    await p.locator('details.storage-more > summary').click();
    assert.ok(await p.getByRole('button', { name: 'Alles sichern' }).isVisible());
    assert.ok(await p.getByRole('button', { name: '＋ Leeres Projekt anlegen' }).isVisible());
    assert.ok(await fits(p));

    // Projekt (UX-02): drei Hauptansichten statt zwölf gleich lauter Reiter. Die aktive zeigt ihre Reiter mit Namen,
    // die anderen nur als Symbole (Name für Screenreader); alle 13 Reiter bleiben direkt erreichbar.
    await openSampleProject(p);
    await p.getByText('✓ Geometrisch konfliktfrei').waitFor();
    const bar = p.getByRole('navigation', { name: 'Projektbereiche' });
    assert.deepEqual(await bar.getByRole('group').evaluateAll(g => g.map(x => x.getAttribute('aria-label'))), ['Ansicht Entwerfen', 'Ansicht Bauen', 'Ansicht Verwalten']);
    assert.equal(await bar.getByRole('link').count(), 13);
    assert.match(await bar.getByRole('group', { name: 'Ansicht Entwerfen' }).innerText(), /Editor[\s\S]*Blöcke[\s\S]*Gelände[\s\S]*Landschaft/);
    assert.equal(await bar.locator('.view-group[data-group=bauen] .tab-label').first().isVisible(), true, 'Symbolreiter behalten ihren Namen für Screenreader');
    assert.ok((await bar.locator('.view-group[data-group=bauen] .tab-label').first().boundingBox()).width <= 1, 'andere Ansichten nur als Symbol');
    // Der Hash wechselt vor dem Neuzeichnen: auf den Kurzsatz des jeweiligen Reiters warten, nicht sofort lesen.
    assert.match(await p.locator('.tab-hint[data-tab-hint=editor]').innerText(), /Gebäude aus der Bibliothek einfügen[\s\S]*Passt dazu: Gelände · Material · Export/);
    await bar.getByRole('link', { name: 'Material' }).click();
    await p.waitForURL(/\/material$/);
    assert.match(await p.locator('.tab-hint[data-tab-hint=material]').innerText(), /Welche Blöcke/);
    await bar.locator('.view-group[data-group=bauen][data-active]').waitFor();
    assert.equal(await bar.getByRole('button', { name: 'Bauen', exact: true }).getAttribute('aria-pressed'), 'true');
    // Wechsel der Hauptansicht öffnet den dort zuletzt benutzten Reiter, sonst den ersten.
    await bar.getByRole('button', { name: 'Verwalten', exact: true }).click();
    await p.waitForURL(/\/uebersicht$/);
    await p.getByRole('region', { name: 'Projektübersicht' }).getByRole('heading', { name: '✓ Nichts offen' }).waitFor();
    await bar.getByRole('button', { name: 'Bauen', exact: true }).click();
    await p.waitForURL(/\/material$/);
    assert.ok(await fits(p));

    // Bibliothek: drei Gruppen, Generatoren unter „Nach Maß“.
    await p.goto(`${BASE}#/bibliothek`);
    const lib = p.getByRole('navigation', { name: 'Ansicht' });
    await lib.waitFor();
    assert.deepEqual(await lib.getByRole('group').evaluateAll(g => g.map(x => x.getAttribute('aria-label'))), ['Finden', 'Nach Maß', 'Größer planen']);
    assert.ok(await lib.getByRole('group', { name: 'Nach Maß' }).getByRole('link', { name: /Generatoren/ }).count() === 1);

    // Mod-Seite: drei Schritte zuerst, ausführliche Teile eingeklappt.
    await p.goto(`${BASE}#/mod`);
    await p.getByRole('heading', { name: "So geht's in drei Schritten" }).waitFor();
    assert.equal(await p.getByRole('heading', { name: 'Gemeinsam bauen im Spiel (ab Mod 0.10.0)' }).isVisible(), false);
    await p.getByText('Mehr wissen', { exact: true }).click();
    assert.ok(await p.getByRole('heading', { name: 'Gemeinsam bauen im Spiel (ab Mod 0.10.0)' }).isVisible());
    assert.ok(await fits(p));
    // Die Mod-Seite sucht die Mod auf diesem PC; ohne laufendes Spiel lehnt 127.0.0.1 ab.
    assert.deepEqual(errors.filter(e => !REFUSED.test(e)), []);
  } finally { await context.close(); }
});
