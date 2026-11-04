// Browser check of TERRAIN-02: building site from real region data → Landschaft: shape, paint, water, path, save →
// world map and Anlagen use the planned terrain → terrain as a Bauteil in the project. Run after `npm run build`.
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { python } from '../../scripts/python.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4271, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
let server, browser, dir;

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'bauplaner-landscape-e2e-'));
  const r = spawnSync(python, ['-I', '-X', 'utf8', fileURLToPath(new URL('../../scripts/make_terrain_fixture.py', import.meta.url)), dir], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.kill(); });

const shot = async (p, name) => { if (process.env.SHOT_DIR) await p.screenshot({ path: `${process.env.SHOT_DIR}/${name}.png`, fullPage: true }); };
const stat = async (p, key) => Number((await p.locator(`[data-stat=${key}]`).innerText()).replace(/\D.*$/s, '').replace(/\./g, ''));

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Landschaft: Gelände formen, bemalen, Wasser, Weg, speichern und übergeben (${viewport.width}px)`, async () => {
    const context = await browser.newContext({ viewport, hasTouch: viewport.width < 500 });
    const p = await context.newPage();
    p.setDefaultTimeout(30_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    // 1. Building site from the region file (hillside 160 × 80).
    await p.goto(`${BASE}#/welt`);
    await p.getByLabel('Regionsdateien', { exact: true }).setInputFiles([join(dir, 'r.2.0.mca')]);
    await p.getByText(/1 Regionsdateien/).waitFor();
    await p.getByLabel('Ecke 1 X').fill('1024'); await p.getByLabel('Ecke 1 Z').fill('0');
    await p.getByLabel('Ecke 2 X').fill('1183'); await p.getByLabel('Ecke 2 Z').fill('79');
    const site = p.getByRole('form', { name: 'Als Bauplatz anlegen' });
    await site.getByLabel('Titel des Bauplatzes').fill('Tal am Bach');
    await site.getByRole('button', { name: 'Bauplatz anlegen' }).click();
    await p.waitForURL(/#\/karte\?projekt=/);
    const projectId = decodeURIComponent(new URL(p.url().replace('#/karte', '')).searchParams.get('projekt'));

    // 2. Landschaft tab: start on the survey.
    await p.goto(`${BASE}#/projekt/${encodeURIComponent(projectId)}/landschaft`);
    await p.getByRole('button', { name: 'Gestaltung beginnen' }).click();
    const canvas = p.getByTestId('landscape-canvas');
    await canvas.waitFor();
    // Canvas position after scrolling it into view (tool buttons above it may scroll the page on phones).
    let box;
    const at = (fx, fz) => [box.x + box.width * fx, box.y + box.height * fz];
    // Centre the canvas: on phones the fixed bottom bar covers a canvas that is only just scrolled into view.
    const frame = async () => { await canvas.evaluate(e => e.scrollIntoView({ block: 'center' })); box = await canvas.boundingBox(); };
    await frame();
    // Hover shows height and block.
    await p.mouse.move(...at(0.3, 0.5));
    await p.getByTestId('landscape-hover').getByText(/X \d+ · Z \d+ · Y \d+/).waitFor();

    // Raise a hill with a drag stroke.
    await p.getByRole('button', { name: 'Anheben' }).click();
    await p.getByLabel('Pinselgröße').fill('6');
    await frame();
    let [x0, y0] = at(0.2, 0.3), [x1, y1] = at(0.4, 0.3);
    await p.mouse.move(x0, y0); await p.mouse.down(); await p.mouse.move(x1, y1, { steps: 8 }); await p.mouse.up();
    await p.waitForFunction(() => Number(document.querySelector('[data-stat=changed]')?.textContent?.replace(/\D/g, '')) > 0);
    assert.ok(await stat(p, 'fill') > 0, 'raised blocks are counted');
    assert.equal(await p.getByTestId('landscape-state').innerText(), 'nicht gespeichert');

    // Undo and redo with the buttons.
    const changed = await stat(p, 'changed');
    await p.getByRole('button', { name: '↶ Rückgängig' }).click();
    await p.waitForFunction(() => Number(document.querySelector('[data-stat=changed]')?.textContent?.replace(/\D/g, '')) === 0);
    await p.getByRole('button', { name: '↷ Wiederholen' }).click();
    await p.waitForFunction(c => Number(document.querySelector('[data-stat=changed]')?.textContent?.replace(/\D/g, '')) === c, changed);

    // Paint with a style.
    await p.getByRole('button', { name: 'Bemalen' }).click();
    await p.getByLabel('Oberflächenstil').selectOption('wald');
    await frame();
    [x0, y0] = at(0.6, 0.7);
    await p.mouse.move(x0, y0); await p.mouse.down(); await p.mouse.move(...at(0.7, 0.7), { steps: 4 }); await p.mouse.up();

    // Water: dig a basin, then fill it with the bucket.
    await p.getByRole('button', { name: 'Absenken' }).click();
    await p.getByLabel('Pinselgröße').fill('4');
    await frame();
    [x0, y0] = at(0.85, 0.25);
    for (let k = 0; k < 3; k++) { await p.mouse.move(x0, y0); await p.mouse.down(); await p.mouse.up(); }
    await p.getByRole('button', { name: 'Wasser füllen' }).click();
    await frame(); [x0, y0] = at(0.85, 0.25);
    await p.mouse.move(x0, y0); await p.mouse.down(); await p.mouse.up();
    await p.getByTestId('landscape-note').getByText(/Spalten mit Wasser bis Y \d+ gefüllt/).waitFor();
    assert.ok(await stat(p, 'water') > 0);

    // Path: two points, then lay it.
    await p.getByRole('button', { name: 'Weg', exact: true }).click();
    await frame();
    for (const [fx, fz] of [[0.05, 0.9], [0.95, 0.9]]) { await p.mouse.move(...at(fx, fz)); await p.mouse.down(); await p.mouse.up(); }
    await p.getByText('2 Punkte').waitFor();
    await p.getByRole('button', { name: 'Weg legen' }).click();
    await p.getByTestId('landscape-note').getByText(/Weg gelegt: \d+ Blöcke lang/).waitFor();
    assert.ok(await stat(p, 'path') > 100);

    // Views and 3D preview.
    await p.getByLabel('Änderungen').check();
    await p.getByLabel('3D-Vorschau').check();
    await p.locator('.landscape-3d canvas').first().waitFor();
    await shot(p, `landscape-${viewport.width}`);

    // 3. Save: one undoable project operation.
    await p.getByRole('button', { name: 'Gestaltung speichern' }).click();
    await p.getByTestId('landscape-note').getByText(/Gespeichert: [\d.]+ Spalten gestaltet/).waitFor();
    assert.equal(await p.getByTestId('landscape-state').innerText(), 'gespeichert');
    // Reload: the saved design comes back.
    await p.reload();
    await p.getByTestId('landscape-canvas').waitFor();
    await p.waitForFunction(() => Number(document.querySelector('[data-stat=path]')?.textContent?.replace(/\D/g, '')) > 100);

    // 4. World map: planned terrain.
    await p.goto(`${BASE}#/karte?projekt=${encodeURIComponent(projectId)}`);
    await p.locator('.map-page[data-map-state=ready]').waitFor();
    await p.getByText(/davon 1 als geplantes Gelände/).waitFor();
    await p.getByLabel('geplantes Gelände').uncheck();
    await p.waitForFunction(() => !/davon 1 als geplantes/.test(document.querySelector('.map-terrain')?.textContent ?? ''));
    await p.getByLabel('geplantes Gelände').check();

    // 5. Anlagen: the Landschaft link preselects the project and uses the planned terrain.
    await p.goto(`${BASE}#/projekt/${encodeURIComponent(projectId)}/landschaft`);
    await p.getByRole('link', { name: 'Anlage auf diesem Gelände planen' }).click();
    await p.getByText(/Ziel ist vorausgewählt/).waitFor();
    await p.goto(`${BASE}#/bibliothek/anlagen/anl_landleben`);
    await p.getByRole('heading', { name: 'Dorf mit Hof' }).waitFor();
    assert.equal(await p.getByLabel('Ziel').inputValue(), projectId);
    const panel = p.locator('.anlage-terrain');
    await panel.getByText(/Geplantes Gelände \(Landschaft\) von „Tal am Bach“/).waitFor({ state: 'attached' });
    await panel.getByLabel('geplantes Gelände').uncheck();
    await panel.getByText(/Geländeaufnahme von „Tal am Bach“/).waitFor({ state: 'attached' });

    // 6. Terrain as a Bauteil in the project: material counts it.
    await p.goto(`${BASE}#/projekt/${encodeURIComponent(projectId)}/landschaft`);
    await p.getByRole('button', { name: 'Als Bauteil ins Projekt übernehmen' }).click();
    await p.getByTestId('landscape-note').getByText(/Gelände als Bauteil im Projekt: [\d.]+ Blöcke setzen/).waitFor();
    await p.getByRole('button', { name: 'Geländebauteil im Projekt erneuern' }).waitFor();
    await p.goto(`${BASE}#/projekt/${encodeURIComponent(projectId)}/material`);
    await p.getByText(/grass_block|Grasblock/i).first().waitFor();

    if (viewport.width < 500) {
      await p.goto(`${BASE}#/projekt/${encodeURIComponent(projectId)}/landschaft`);
      await p.getByTestId('landscape-canvas').waitFor();
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'kein waagerechtes Scrollen');
    }
    assert.deepEqual(errors, []);
    await context.close();
  });
}
