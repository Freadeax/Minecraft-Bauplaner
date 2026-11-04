// Browser check of TERRAIN-03 Gelände und Wege: Landschaft on flat ground → Aufschütten, Abtragen (Graben), Rampe,
// Weg mit Treppen die Rampe hinauf, Wasser im Graben und Weg als Brücke darüber → 3D, speichern, neu laden → Bauteil im Projekt.
// Run after `npm run build`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4341, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

const shot = async (p, name) => { if (process.env.SHOT_DIR) await p.screenshot({ path: `${process.env.SHOT_DIR}/${name}.png`, fullPage: true }); };
const stat = async (p, key) => Number((await p.locator(`[data-stat=${key}]`).innerText()).replace(/\D/g, ''));

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Gelände und Wege: Aufschütten, Abtragen, Rampe, Treppen, Brücke, speichern, ins Projekt (${viewport.width}px)`, async () => {
    const context = await browser.newContext({ viewport, hasTouch: viewport.width < 500 });
    const p = await context.newPage();
    p.setDefaultTimeout(30_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    await p.goto(BASE);
    await openSampleProject(p);
    await p.waitForURL(/#\/projekt\//);
    const projectId = decodeURIComponent(p.url().split('#/projekt/')[1].split(/[/?]/)[0]);
    await p.goto(`${BASE}#/projekt/${encodeURIComponent(projectId)}/landschaft`);
    const y0 = Number(await p.getByLabel('Bodenhöhe Y').inputValue());
    await p.getByRole('button', { name: 'Auf ebenem Grund beginnen' }).click();
    const canvas = p.getByTestId('landscape-canvas');
    await canvas.waitFor();
    let box;
    const at = (fx, fz) => [box.x + box.width * fx, box.y + box.height * fz];
    // Centre the canvas: on phones the fixed bottom bar covers a canvas that is only just scrolled into view.
    const frame = async () => { await canvas.evaluate(e => e.scrollIntoView({ block: 'center' })); box = await canvas.boundingBox(); };
    const click = async (fx, fz) => { await p.mouse.move(...at(fx, fz)); await p.mouse.down(); await p.mouse.up(); };
    const tool = name => p.getByRole('toolbar', { name: 'Werkzeuge' }).getByRole('button', { name, exact: true }).click();
    const note = () => p.getByTestId('landscape-note');

    // 1. Aufschütten: a small mound up to y0 + 3, only where the ground is lower.
    await tool('Aufschütten');
    await p.getByLabel('Zielhöhe Y').fill(String(y0 + 3));
    await p.getByLabel('Pinselgröße').fill('2');
    await p.getByLabel('Kante').selectOption('hard');
    await frame();
    await click(0.15, 0.15);
    const fill = await stat(p, 'fill');
    assert.ok(fill > 0, `aufgeschüttet ${fill}`);
    assert.equal(await stat(p, 'cut'), 0);
    // A second dab on the same spot changes nothing (hard edge: already at the target).
    await click(0.15, 0.15);
    assert.equal(await stat(p, 'fill'), fill);

    // 2. Abtragen: a trench across the area (x ≈ 0.8) down to y0 − 3.
    await tool('Abtragen');
    await p.getByLabel('Zielhöhe Y').fill(String(y0 - 3));
    await p.getByLabel('Pinselgröße').fill('1');
    await frame();
    await p.mouse.move(...at(0.8, 0.05)); await p.mouse.down(); await p.mouse.move(...at(0.8, 0.95), { steps: 20 }); await p.mouse.up();
    assert.ok(await stat(p, 'cut') > 0);

    // 3. Rampe from y0 to y0 + 6 along the middle.
    await tool('Rampe');
    await p.getByLabel('Rampe Anfang Y').fill(String(y0));
    await p.getByLabel('Rampe Ende Y').fill(String(y0 + 6));
    await frame();
    await click(0.2, 0.55);
    await note().getByText(/Jetzt das Ende anklicken/).waitFor();
    await click(0.6, 0.55);
    await note().getByText(new RegExp(`Rampe gelegt: \\d+ Blöcke lang von Y ${y0} nach Y ${y0 + 6}`)).waitFor();

    // 4. Weg mit Treppen die Rampe hinauf (Treppen sind voreingestellt).
    await tool('Weg');
    assert.equal(await p.getByLabel('Wegstufen').inputValue(), 'stairs');
    await p.getByLabel('Wegbelag').selectOption('steinweg');
    await frame();
    await click(0.1, 0.55); await click(0.65, 0.55);
    await p.getByRole('button', { name: 'Weg legen' }).click();
    await note().getByText(/Weg gelegt: .* Höhenwechsel mit \d+ Treppen/).waitFor();
    await p.getByTestId('landscape-stats').locator('[data-stat=pieces]').getByText(/\d+ Treppen/).waitFor();
    await p.mouse.move(...at(0.4, 0.55));
    await p.getByTestId('landscape-hover').getByText(/Weg/).waitFor();

    // 5. Wasser im Graben, dann ein Weg als Brücke darüber.
    await tool('Wasser füllen');
    await p.getByLabel('Wasserspiegel').fill(String(y0 - 1));
    await frame();
    await click(0.8, 0.3);
    await note().getByText(/Spalten mit Wasser bis Y/).waitFor();
    const water = await stat(p, 'water');
    assert.ok(water > 0);
    await tool('Weg');
    await p.getByLabel('Weg über Wasser').selectOption('bridge');
    await p.getByLabel('Stufenmaterial').selectOption('eiche');
    await frame();
    await click(0.7, 0.3); await click(0.9, 0.3);
    await p.getByRole('button', { name: 'Weg legen' }).click();
    await note().getByText(/Brücke über \d+ Spalten Wasser mit \d+ Geländerfeldern/).waitFor();
    assert.equal(await stat(p, 'water'), water, 'the bridge keeps the water');
    await p.getByTestId('landscape-stats').locator('[data-stat=pieces]').getByText(/Brückenfelder/).waitFor();
    await p.getByRole('cell', { name: /oak_planks/ }).waitFor();

    // 6. 3D, save, reload.
    await p.getByLabel('3D-Vorschau').check();
    await p.locator('.landscape-3d canvas').waitFor();
    await shot(p, `landscape-paths-${viewport.width}`);
    await p.getByRole('button', { name: 'Gestaltung speichern' }).click();
    await p.getByTestId('landscape-state').getByText('gespeichert', { exact: true }).waitFor();
    await p.reload();
    await p.getByTestId('landscape-stats').locator('[data-stat=pieces]').getByText(/Treppen.*Brückenfelder/).waitFor({ timeout: 60_000 });
    assert.equal(await stat(p, 'water'), water);

    // 7. Ins Projekt: stairs, deck and fences count as material.
    await p.getByRole('button', { name: /Als Bauteil ins Projekt übernehmen|Geländebauteil im Projekt erneuern/ }).click();
    await note().getByText(/Gelände als Bauteil im Projekt/).waitFor();
    await p.goto(`${BASE}#/projekt/${encodeURIComponent(projectId)}/material`);
    await p.getByText(/stone_brick_stairs|Steinziegeltreppe/i).first().waitFor({ timeout: 60_000 });
    await p.getByText(/oak_fence|Eichenzaun/i).first().waitFor();

    assert.deepEqual(errors, []);
    await context.close();
  });
}
