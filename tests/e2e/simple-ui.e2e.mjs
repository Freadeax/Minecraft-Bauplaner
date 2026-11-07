// UX-01: einfache Bedienung – vier Hauptbereiche, Projektreiter in vier Schritten mit Kurzsatz,
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

    // Startseite: Sicherung und Datei-Notfallwege eingeklappt, Hauptaktionen sichtbar.
    assert.equal(await p.getByRole('button', { name: 'Alles sichern' }).isVisible(), false);
    await p.locator('details.storage-more > summary').click();
    assert.ok(await p.getByRole('button', { name: 'Alles sichern' }).isVisible());
    assert.equal(await p.getByRole('link', { name: 'Nur eine Datei ansehen →' }).isVisible(), false);
    assert.ok(await p.getByRole('button', { name: '＋ Leeres Projekt anlegen' }).isVisible());
    assert.ok(await fits(p));

    // Projekt: vier Schritte, alle zwölf Reiter, Kurzsatz zum aktiven Reiter.
    await openSampleProject(p);
    await p.getByText('✓ Geometrisch konfliktfrei').waitFor();
    const bar = p.getByRole('navigation', { name: 'Projektbereiche' });
    assert.equal(await bar.getByRole('group').count(), 4);
    assert.equal(await bar.getByRole('link').count(), 12);
    assert.match(await bar.getByRole('group', { name: 'Schritt 1: Gestalten' }).innerText(), /Editor[\s\S]*Blöcke[\s\S]*Gelände[\s\S]*Landschaft/);
    // Der Hash wechselt vor dem Neuzeichnen: auf den Kurzsatz des jeweiligen Reiters warten, nicht sofort lesen.
    assert.match(await p.locator('.tab-hint[data-tab-hint=editor]').innerText(), /Gebäude aus der Bibliothek einfügen/);
    await bar.getByRole('link', { name: 'Material' }).click();
    await p.waitForURL(/\/material$/);
    assert.match(await p.locator('.tab-hint[data-tab-hint=material]').innerText(), /Welche Blöcke/);
    await bar.locator('.tab-group[data-group=bauen][data-active]').waitFor();
    assert.equal(await bar.getByRole('group', { name: 'Schritt 2: Bauen' }).getAttribute('data-active'), '');
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
