// UX-02: Startseite mit Tour, Projektübersicht, Editor-Arbeitsfläche (Leisten, Vollbild, Inspektor, 2D-Plan),
// freier Schnitt, Geistermodus, gespeicherte Kameras und der Hinweis der Ersatzansicht ohne WebGL.
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { waitForStart, REFUSED } from './start.mjs';

const PORT = 4397, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

async function open(viewport = { width: 1400, height: 1000 }, init) {
  const context = await browser.newContext({ viewport, hasTouch: viewport.width < 500 });
  if (init) await context.addInitScript(init);
  const p = await context.newPage();
  p.setDefaultTimeout(15_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  return { p, errors, context };
}
const host = p => p.locator('.editor .canvas-host');
const xray = p => host(p).getAttribute('data-xray');

test('Startseite: geführte Tour durch die Burgmauer bis zur Übersicht', async () => {
  const { p, errors, context } = await open();
  try {
    await p.goto(BASE);
    await waitForStart(p);
    await p.getByRole('button', { name: 'Geführte Tour mit der Burgmauer' }).click();
    const tour = p.getByRole('dialog', { name: 'Bauteile' });
    await tour.waitFor();
    assert.match(await tour.innerText(), /TOUR · 1 \/ 8/);
    await p.locator('.editor-tree.tour-spot').waitFor();
    const titles = [];
    for (let i = 0; i < 7; i++) {
      await p.locator('.tour-card').getByRole('button', { name: 'Weiter' }).click();
      await p.locator(`.tour-card[data-tour-step="${i + 2}"]`).waitFor();
      await p.locator('.tour-spot').first().waitFor();
      titles.push(await p.locator('#tour-title').innerText());
    }
    assert.deepEqual(titles, ['3D-Bild', 'Inspektor', 'Konflikte', 'Bauen', 'Material', 'Übersicht', 'Verwalten']);
    assert.match(p.url(), /\/uebersicht$/, 'die Tour öffnet die Reiter selbst');
    await p.getByRole('button', { name: 'Fertig' }).click();
    assert.equal(await p.locator('.tour-card').count(), 0);
    assert.equal(await p.locator('.tour-spot').count(), 0);
    // „Projekt fortsetzen“ führt zum zuletzt benutzten Arbeitsreiter (die Übersicht selbst zählt nicht).
    await p.goto(BASE);
    const cont = p.getByRole('region', { name: 'Wie möchtest du anfangen?' }).locator('[data-continue-project]');
    await cont.waitFor();
    assert.match(await cont.innerText(), /Weiter: Material/);
    assert.match(await cont.getAttribute('href'), /\/material$/);
    assert.deepEqual(errors.filter(e => !REFUSED.test(e)), []);
  } finally { await context.close(); }
});

test('Übersicht zeigt Konflikte mit Hilfe und den nächsten Bauabschnitt', async () => {
  const { p, errors, context } = await open();
  try {
    await p.goto(BASE);
    await waitForStart(p);
    await p.getByRole('button', { name: 'Beispielprojekt „Burgmauer“' }).click();
    await p.getByText('✓ Geometrisch konfliktfrei').waitFor();
    // Konflikt erzeugen: Mauer 1 auf den Turm schieben.
    await p.locator('.instance-list button', { hasText: 'Mauer 1' }).click();
    const x = p.getByLabel('X-Koordinate');
    await x.fill('1'); await x.press('Enter');
    await p.getByText('⚠ Offene Punkte vor einem baubaren Export').waitFor();
    // Hilfe direkt am Fehler – im Konfliktbericht und im Inspektor.
    const help = p.locator('section.report .fix-help[data-fix=conflict]');
    await help.locator('summary').click();
    assert.match(await help.innerText(), /Vorrang bei Überschneidung/);
    await p.locator('.inspector .inspector-conflict .fix-help').waitFor();
    await p.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name: 'Übersicht' }).click();
    const ov = p.getByRole('region', { name: 'Projektübersicht' });
    await ov.locator('[data-open=voxel]').waitFor();
    assert.match(await ov.locator('[data-open=voxel]').innerText(), /überschneiden sich[\s\S]*Im Editor lösen/);
    assert.match(await ov.getByRole('heading', { level: 2 }).nth(2).innerText(), /Gesamtes Projekt/);
    assert.match(await ov.innerText(), /PACKLISTE/i);
    assert.equal(await ov.getByRole('link', { name: 'Abschnitt bauen' }).getAttribute('href').then(h => /\/bauen$/.test(h)), true);
    assert.equal(await ov.locator('[data-continue]').getAttribute('data-continue'), 'editor');
    assert.deepEqual(errors.filter(e => !REFUSED.test(e)), []);
  } finally { await context.close(); }
});

test('Editor: Leisten, Vollbild, 2D-Plan, Schnitt, Geistermodus und Kameras', async () => {
  const { p, errors, context } = await open();
  try {
    await p.goto(BASE);
    await waitForStart(p);
    await p.getByRole('button', { name: 'Beispielprojekt „Burgmauer“' }).click();
    await p.getByText('✓ Geometrisch konfliktfrei').waitFor();
    await p.waitForFunction(() => document.querySelector('.editor .canvas-host')?.dataset.mesh === 'ready');
    const editor = p.getByRole('region', { name: 'Editor' });
    const width = async () => (await editor.locator('.viewport').boundingBox()).width;
    const before = await width();
    // Seitenleisten einklappen: das 3D-Bild bekommt den Platz; der Zustand bleibt nach dem Neuladen.
    await p.getByRole('button', { name: 'Bauteile zeigen' }).click();
    await p.getByRole('button', { name: 'Inspektor zeigen' }).click();
    assert.equal(await p.locator('#editor-tree').isVisible(), false);
    assert.equal(await p.locator('#editor-inspector').isVisible(), false);
    assert.ok(await width() > before + 400, 'Vorschau wird breiter');
    await p.reload();
    await p.getByRole('button', { name: 'Bauteile zeigen' }).waitFor();
    assert.equal(await p.getByRole('button', { name: 'Bauteile zeigen' }).getAttribute('aria-pressed'), 'false');
    await p.getByRole('button', { name: 'Bauteile zeigen' }).click();
    await p.getByRole('button', { name: 'Inspektor zeigen' }).click();
    await p.locator('#editor-inspector').waitFor();

    // Vollbild: Fläche füllt das Fenster, Knopf beendet es wieder.
    await p.getByRole('button', { name: 'Vollbild', exact: true }).click();
    await p.locator('.editor[data-max]').waitFor();
    const full = await p.locator('.editor[data-max]').boundingBox();
    assert.ok(full.width >= 1390 && full.height >= 990, `Vollbild ${full.width}×${full.height}`);
    await p.getByRole('button', { name: 'Vollbild', exact: true }).click();
    await p.waitForFunction(() => !document.querySelector('.editor[data-max]'));

    // Inspektor bündelt Bauteil, Koordinaten, Ausrichtung und Anschlüsse.
    await p.locator('.instance-list button', { hasText: 'Tor' }).click();
    assert.deepEqual(await p.locator('#editor-inspector .inspector-section > summary').allTextContents(), ['Bauteil', 'Koordinaten', 'Ausrichtung', 'Anschlüsse']);

    // Geistermodus mit gewähltem Bauteil: alle anderen werden blass.
    await p.getByRole('button', { name: 'Geistermodus' }).click();
    await p.waitForFunction(() => Number(document.querySelector('.editor .canvas-host')?.dataset.xray) > 200);
    // Freier Schnitt: Achse, Lage, Seite; weggeschnittene Blöcke zählen mit.
    await p.getByRole('button', { name: 'Schnitt', exact: true }).click();
    const cut = p.getByRole('group', { name: 'Freier Schnitt' });
    await cut.waitFor();
    assert.match(await cut.innerText(), /Y ≤ \d+/);
    await cut.getByRole('button', { name: 'X', exact: true }).click();
    await cut.getByLabel('Schnittposition').focus();
    await p.keyboard.press('Home');
    assert.match(await cut.innerText(), /X ≤ 0/);
    const ghosts = Number(await xray(p));
    await cut.getByRole('button', { name: /Seite/ }).click();
    assert.match(await cut.innerText(), /X ≥ 0/);
    await p.getByRole('button', { name: 'Geistermodus' }).click();
    await p.waitForFunction(() => document.querySelector('.editor .canvas-host')?.dataset.xray === '0');
    assert.ok(ghosts > 0);
    await cut.getByRole('button', { name: 'Schnitt beenden' }).click();
    assert.equal(await cut.count(), 0);

    // Kameras: aktuelle Ansicht merken und wieder einnehmen.
    await p.getByRole('button', { name: 'Ansicht von Norden' }).click();
    await p.getByRole('button', { name: /Kameras/ }).click();
    await p.getByLabel('Name der Ansicht').fill('Torblick');
    await p.getByRole('button', { name: 'Aktuelle Ansicht merken' }).click();
    await p.getByRole('dialog', { name: 'Gespeicherte Kameras' }).getByRole('button', { name: 'Torblick', exact: true }).waitFor();
    await p.keyboard.press('Escape');
    await p.getByRole('button', { name: 'Schrägansicht' }).click();
    await p.getByRole('button', { name: /Kameras \(1\)/ }).click();
    await p.getByRole('dialog', { name: 'Gespeicherte Kameras' }).getByRole('button', { name: 'Torblick', exact: true }).click();
    await p.waitForFunction(() => document.querySelector('.editor .canvas-host')?.dataset.view === '');
    const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('bauplaner.kameras.v1')));
    assert.equal(Object.values(saved)[0][0].name, 'Torblick');

    // 2D-Schichtplan: Tastatur bewegt den Zeiger, Eingabe wählt den Block.
    await p.getByRole('button', { name: '2D-Schichtplan' }).click();
    const plan = p.getByRole('img', { name: /Schichtplan Ebene Y 0/ });
    await plan.focus();
    await p.keyboard.press('ArrowRight');
    await p.keyboard.press('Enter');
    assert.match(await p.locator('.plan2d-status').innerText(), /X 1 · Y 0 · Z 0: /);
    await p.keyboard.press('PageUp');
    await p.getByRole('img', { name: /Schichtplan Ebene Y 1/ }).waitFor();
    await p.getByRole('button', { name: '2D-Schichtplan' }).click();
    await host(p).waitFor();
    assert.deepEqual(errors.filter(e => !REFUSED.test(e)), []);
  } finally { await context.close(); }
});

test('Ohne WebGL: Hinweis der Ersatzansicht überdeckt die Werkzeugleiste nicht und hilft weiter', async () => {
  const { p, errors, context } = await open({ width: 1400, height: 1000 }, () => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) { return /webgl/.test(type) ? null : original.call(this, type, ...rest); };
  });
  try {
    await p.goto(BASE);
    await waitForStart(p);
    await p.getByRole('button', { name: 'Beispielprojekt „Burgmauer“' }).click();
    const note = p.locator('.editor .software-note');
    await note.waitFor();
    const tools = await p.locator('.editor .viewer-tools').boundingBox(), box = await note.boundingBox();
    assert.ok(box.y >= tools.y + tools.height, `Hinweis (${box.y}) unter der Werkzeugleiste (${tools.y + tools.height})`);
    await note.locator('.fix-help summary').click();
    assert.match(await note.innerText(), /Hardwarebeschleunigung/);
    // Schnitt läuft auch in der Ersatzansicht.
    await p.getByRole('button', { name: 'Schnitt', exact: true }).click();
    await p.getByRole('group', { name: 'Freier Schnitt' }).waitFor();
    // Three meldet den fehlenden Kontext selbst auf der Konsole; das ist hier gewollt.
    assert.deepEqual(errors.filter(e => !REFUSED.test(e) && !/Error creating WebGL context/.test(e)), []);
  } finally { await context.close(); }
});

test('Handy 390 px: Projektleiste ohne Querverschiebung, Bedienelemente groß genug', async () => {
  const { p, errors, context } = await open({ width: 390, height: 844 });
  try {
    await p.goto(BASE);
    await waitForStart(p);
    await p.getByRole('button', { name: 'Beispielprojekt „Burgmauer“' }).click();
    await p.getByText('✓ Geometrisch konfliktfrei').waitFor();
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    const bar = p.getByRole('navigation', { name: 'Projektbereiche' });
    for (const link of await bar.getByRole('link').all()) {
      const b = await link.boundingBox();
      assert.ok(b.x >= 0 && b.x + b.width <= 391, 'kein Reiter seitlich abgeschnitten');
      assert.ok(b.height >= 40, `Reiter ${b.height}px hoch`);
    }
    assert.deepEqual(errors.filter(e => !REFUSED.test(e)), []);
  } finally { await context.close(); }
});
