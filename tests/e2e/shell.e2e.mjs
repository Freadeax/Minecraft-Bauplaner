// UI-02: App-Hülle, Schnellsuche, Projektkopf und Handyleiste im echten Chromium (Pages-Build unter Unterpfad).
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { openSampleProject, waitForStart } from './start.mjs';

const PORT = 4211, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

async function open(viewport, colorScheme = 'dark') {
  const context = await browser.newContext({ viewport, colorScheme, hasTouch: viewport.width < 500 });
  const p = await context.newPage();
  p.setDefaultTimeout(10_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  return { p, errors, context };
}
const fits = p => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);

test('Desktop: Hauptnavigation, Seitentitel und Schnellsuche (Strg+K) mit Tastatur', async () => {
  const { p, errors, context } = await open({ width: 1400, height: 1000 });
  try {
    await p.goto(BASE);
    // PERF-07: the shell opens before the catalogue; building search needs the loaded library.
    await p.locator('html[data-library="bereit"]').waitFor({ state: 'attached', timeout: 90_000 });
    const nav = p.getByRole('navigation', { name: 'Hauptnavigation', exact: true });
    // UX-01: vier Hauptbereiche plus Anleitung (GUIDE-01); Datei-Wege (Betrachter, Weltimport) stehen in Fußzeile und Schnellsuche.
    assert.equal(await nav.getByRole('link').count(), 5);
    assert.equal(await p.getByRole('navigation', { name: 'Weitere Links' }).getByRole('link', { name: 'Datei ansehen' }).getAttribute('href'), '#/betrachter');
    // GUIDE-01: die Anleitung steht in der Hauptnavigation (bei knapper Breite als ?-Symbol).
    assert.equal(await nav.getByRole('link', { name: 'Anleitung' }).getAttribute('href'), '#/anleitung');
    // MAP-03: the game connection (mod download, pairing) has its own main entry.
    assert.equal(await nav.getByRole('link', { name: 'Spiel' }).getAttribute('href'), '#/mod');
    assert.equal(await p.locator('.bottom-nav').isVisible(), false);
    await nav.getByRole('link', { name: 'Bibliothek' }).click();
    await p.waitForURL(/#\/bibliothek$/);
    // The hash changes before React marks the link; wait for the mark instead of reading it right away.
    await nav.locator('a[aria-current="page"]', { hasText: 'Bibliothek' }).waitFor({ timeout: 5000 });
    assert.equal(await nav.getByRole('link', { name: 'Bibliothek' }).getAttribute('aria-current'), 'page');
    await p.waitForFunction(() => document.title.startsWith('Bibliothek ·'));

    await p.keyboard.press('Control+k');
    const dialog = p.getByRole('dialog', { name: 'Schnellsuche' });
    await dialog.waitFor();
    assert.equal(await p.evaluate(() => document.activeElement?.getAttribute('role')), 'combobox');
    // Ohne Eingabe: Seiten, Gebäude erst beim Tippen.
    assert.ok(await dialog.getByRole('option', { name: /Systemcheck/ }).count() === 1);
    assert.equal(await dialog.getByRole('option', { name: /Eckturm/ }).count(), 0);
    await p.keyboard.type('eckturm');
    assert.equal(await dialog.getByRole('option').count(), 1);
    await p.keyboard.press('Enter');
    await p.waitForURL(/#\/bibliothek\/gebaeude\//);
    await p.locator('.building-detail').waitFor();
    assert.equal(await dialog.count(), 0);

    // Umlaute/ß unabhängig, Pfeiltasten, Escape schließt und gibt den Fokus zurück.
    await p.getByRole('button', { name: /Schnellsuche öffnen|Suchen/ }).first().click();
    await dialog.waitFor();
    await p.keyboard.type('brucke');
    assert.ok(await dialog.getByRole('option').count() >= 1);
    await p.keyboard.press('ArrowDown');
    await p.keyboard.press('Escape');
    assert.equal(await dialog.count(), 0);
    assert.equal(await p.evaluate(() => document.activeElement?.classList.contains('search-trigger')), true);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('Desktop: Projektkopf mit Pfad, Bereichen und Sprung per Schnellsuche', async () => {
  const { p, errors, context } = await open({ width: 1400, height: 1000 }, 'light');
  try {
    await p.goto(BASE);
    await openSampleProject(p);
    await p.getByText('✓ Geometrisch konfliktfrei').waitFor();
    assert.match(await p.getByRole('navigation', { name: 'Pfad' }).innerText(), /Projekte\s*›\s*Burgmauer \(Beispiel\)/);
    await p.waitForFunction(() => document.title.startsWith('Burgmauer (Beispiel) ·'));
    await p.keyboard.press('Control+k');
    const dialog = p.getByRole('dialog', { name: 'Schnellsuche' });
    await p.keyboard.type('material');
    // Bereiche des offenen Projekts tragen den Projektnamen als Hinweis.
    const option = dialog.getByRole('option', { name: /^Material.*Burgmauer/ });
    await option.waitFor();
    await option.click();
    await p.waitForURL(/\/material$/);
    await p.waitForFunction(() => document.title.startsWith('Burgmauer (Beispiel) · Material'));
    assert.equal(await p.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name: 'Material' }).getAttribute('aria-current'), 'page');
    assert.ok(await fits(p));
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

for (const colorScheme of ['dark', 'light']) test(`Handy 390 px (${colorScheme}): untere Leiste, keine Überbreite, aktiver Bereich sichtbar, 3D zuerst`, async () => {
  const { p, errors, context } = await open({ width: 390, height: 844 }, colorScheme);
  try {
    await p.goto(BASE);
    await waitForStart(p);
    assert.equal(await p.getByRole('navigation', { name: 'Hauptnavigation', exact: true }).isVisible(), false);
    const bottom = p.getByRole('navigation', { name: 'Hauptnavigation mobil' });
    const box = await bottom.boundingBox();
    assert.ok(box && Math.abs(box.y + box.height - 844) <= 1 && box.width === 390, 'Leiste unten über volle Breite');
    assert.ok(await fits(p));
    await bottom.getByRole('link', { name: 'Bibliothek' }).click();
    await p.waitForURL(/#\/bibliothek$/);
    await p.locator('.catalog-results .bcard-open').first().waitFor();
    assert.ok(await fits(p));
    await bottom.getByRole('button', { name: 'Suchen' }).click();
    const dialog = p.getByRole('dialog', { name: 'Schnellsuche' });
    const d = await dialog.boundingBox();
    assert.ok(d && d.x >= 0 && d.x + d.width <= 390);
    await p.keyboard.press('Escape');

    await bottom.getByRole('link', { name: 'Projekte' }).click();
    await openSampleProject(p);
    await p.getByText('✓ Geometrisch konfliktfrei').waitFor();
    const viewport = await p.locator('.editor > .viewport').boundingBox(), list = await p.locator('.editor-tree').boundingBox();
    assert.ok(viewport && list && viewport.y < list.y, '3D-Ansicht steht über der Instanzliste');
    assert.ok(await fits(p));
    await p.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name: 'Baustelle' }).click();
    await p.waitForURL(/\/baustelle$/);
    const bar = await p.locator('.project-head .tabs').boundingBox();
    const active = await p.locator('.project-head .tabs [aria-current=page]').boundingBox();
    assert.ok(bar && active && active.x >= bar.x - 1 && active.x + active.width <= bar.x + bar.width + 1, 'aktiver Bereich sichtbar');
    assert.ok(await fits(p));
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('Kopfzeile passt in jeder Breite (1920 bis 761 px): Stufen statt Überbreite', async () => {
  const { p, errors, context } = await open({ width: 1920, height: 900 });
  try {
    await p.goto(BASE);
    await p.locator('.topbar').waitFor();
    for (const width of [1920, 1400, 1280, 1100, 1024, 900, 761]) {
      await p.setViewportSize({ width, height: 900 });
      assert.ok(await fits(p), `keine Überbreite bei ${width} px`);
      assert.ok(await p.getByRole('navigation', { name: 'Hauptnavigation', exact: true }).isVisible(), `Hauptnavigation sichtbar bei ${width} px`);
    }
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});
