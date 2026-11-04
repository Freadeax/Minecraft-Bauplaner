// Browser check of TERRAIN-02-S06 Streu-Ebene: building site from real region data → Landschaft → mix scattered,
// layer edited, items set and removed by hand, undo → save and reload → Bauteil in the project with trees in the material list.
// Run after `npm run build`.
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
const PORT = 4273, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
let server, browser, dir;

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'bauplaner-scatter-e2e-'));
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
const stat = async (p, key) => Number((await p.locator(`[data-stat=${key}]`).innerText()).replace(/\D/g, ''));
const dots = p => p.evaluate(() => Number(document.querySelector('[data-testid=scatter-dots]')?.getAttribute('data-count') ?? 0));

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Streu-Ebene: Mischung streuen, Ebene ändern, von Hand setzen/entfernen, speichern, ins Projekt (${viewport.width}px)`, async () => {
    const context = await browser.newContext({ viewport, hasTouch: viewport.width < 500 });
    const p = await context.newPage();
    p.setDefaultTimeout(30_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    await p.goto(`${BASE}#/welt`);
    await p.getByLabel('Regionsdateien', { exact: true }).setInputFiles([join(dir, 'r.2.0.mca')]);
    await p.getByText(/1 Regionsdateien/).waitFor();
    await p.getByLabel('Ecke 1 X').fill('1024'); await p.getByLabel('Ecke 1 Z').fill('0');
    await p.getByLabel('Ecke 2 X').fill('1183'); await p.getByLabel('Ecke 2 Z').fill('79');
    const site = p.getByRole('form', { name: 'Als Bauplatz anlegen' });
    await site.getByLabel('Titel des Bauplatzes').fill('Waldrand');
    await site.getByRole('button', { name: 'Bauplatz anlegen' }).click();
    await p.waitForURL(/#\/karte\?projekt=/);
    const projectId = decodeURIComponent(new URL(p.url().replace('#/karte', '')).searchParams.get('projekt'));

    await p.goto(`${BASE}#/projekt/${encodeURIComponent(projectId)}/landschaft`);
    await p.getByRole('button', { name: 'Gestaltung beginnen' }).click();
    const canvas = p.getByTestId('landscape-canvas');
    await canvas.waitFor();
    let box;
    const at = (fx, fz) => [box.x + box.width * fx, box.y + box.height * fz];
    // Centre the canvas: on phones the fixed bottom bar covers a canvas that is only just scrolled into view.
    const frame = async () => { await canvas.evaluate(e => e.scrollIntoView({ block: 'center' })); box = await canvas.boundingBox(); };

    // 1. Mix: Mischwald on the grass of the hillside.
    const panel = p.getByTestId('scatter-panel');
    await panel.getByLabel('Mischung').selectOption('mischwald');
    await panel.getByRole('button', { name: 'Mischung streuen' }).click();
    await p.getByTestId('landscape-note').getByText(/„Mischwald“: 4 Ebenen, [\d.]+ Teile gestreut/).waitFor();
    const placed = await stat(p, 'scatter');
    assert.ok(placed > 20, `${placed} Teile`);
    assert.equal(await dots(p), placed);
    assert.ok(await stat(p, 'scatter-blocks') > placed);
    assert.equal(await p.getByTestId('landscape-state').innerText(), 'nicht gespeichert');
    // Same rules → same result: scatter everything again.
    await panel.getByRole('button', { name: 'Alle Ebenen neu streuen' }).click();
    await p.getByTestId('landscape-note').getByText(/Alle Ebenen neu gestreut/).waitFor();
    assert.equal(await stat(p, 'scatter'), placed, 'deterministisch');

    // 2. Edit a layer: no ferns.
    const fern = panel.locator('li', { hasText: 'Farn' });
    await fern.locator('summary').click();
    await fern.getByLabel('Dichte je 1000 Spalten').fill('0');
    await p.getByTestId('landscape-note').getByText(/„Farn“ neu gestreut: 0 Teile/).waitFor();
    const withoutFern = await stat(p, 'scatter');
    assert.ok(withoutFern < placed);

    // 3. By hand: set oaks until one fits, then remove items with a stroke; undo brings them back.
    const oak = panel.locator('li', { hasText: 'Eiche' });
    await oak.locator('summary').click();
    await oak.getByRole('button', { name: 'Von Hand setzen' }).click();
    assert.equal(await p.getByLabel('Streu-Ebene zum Setzen').inputValue(), await oak.getAttribute('data-layer'));
    let set = false;
    for (const [fx, fz] of [[0.5, 0.5], [0.3, 0.6], [0.7, 0.4], [0.2, 0.3], [0.8, 0.7], [0.45, 0.2]]) {
      await frame();
      await p.mouse.move(...at(fx, fz)); await p.mouse.down(); await p.mouse.up();
      const note = await p.getByTestId('landscape-note').innerText();
      if (/gesetzt bei X/.test(note)) { set = true; break; }
      assert.match(note, /passt hier nicht/);
    }
    assert.ok(set, 'eine Eiche ließ sich setzen');
    const afterSet = await stat(p, 'scatter');
    assert.equal(afterSet, withoutFern + 1);
    await p.getByLabel('Entfernen').check();
    await p.getByLabel('Pinselgröße').fill('12');
    await frame();
    await p.mouse.move(...at(0.1, 0.5)); await p.mouse.down(); await p.mouse.move(...at(0.9, 0.5), { steps: 10 }); await p.mouse.up();
    await p.getByTestId('landscape-note').getByText(/[\d.]+ Teile entfernt/).waitFor();
    assert.ok(await stat(p, 'scatter') < afterSet);
    await p.getByRole('button', { name: '↶ Rückgängig' }).click();
    await p.waitForFunction(n => Number(document.querySelector('[data-stat=scatter]')?.textContent?.replace(/\D/g, '')) === n, afterSet);

    // 3D preview shows the trees.
    await p.getByLabel('3D-Vorschau').check();
    await p.locator('.landscape-3d canvas').first().waitFor();
    await shot(p, `scatter-${viewport.width}`);

    // 4. Save and reload: plan comes back.
    await p.getByRole('button', { name: 'Gestaltung speichern' }).click();
    await p.getByTestId('landscape-note').getByText(/Gespeichert/).waitFor();
    await p.reload();
    await p.getByTestId('landscape-canvas').waitFor();
    await p.waitForFunction(n => Number(document.querySelector('[data-stat=scatter]')?.textContent?.replace(/\D/g, '')) === n, afterSet);

    // 5. Into the project: the Bauteil carries the trees; the material list counts leaves and logs.
    await p.getByRole('button', { name: 'Als Bauteil ins Projekt übernehmen' }).click();
    await p.getByTestId('landscape-note').getByText(/Mit [\d.]+ Bäumen, Felsen und Pflanzen der Streu-Ebene/).waitFor();
    await p.goto(`${BASE}#/projekt/${encodeURIComponent(projectId)}/material`);
    await p.getByText(/oak_leaves|Eichenlaub/i).first().waitFor();
    await p.getByText(/oak_log|Eichenstamm/i).first().waitFor();

    if (viewport.width < 500) {
      await p.goto(`${BASE}#/projekt/${encodeURIComponent(projectId)}/landschaft`);
      await p.getByTestId('scatter-panel').waitFor();
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'kein waagerechtes Scrollen');
    }
    assert.deepEqual(errors, []);
    await context.close();
  });
}
