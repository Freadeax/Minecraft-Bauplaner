// Browser check of TERRAIN-05 Gelände-Werkzeuge auf dem Projektgelände: Landschaft on flat ground → Formstempel Berg,
// Verwittern (Pinsel und ganze Fläche), Fluss graben mit Wasser, Maske (nur bis Y) für Anheben, Bauplätze schützen →
// rückgängig, speichern. Run after `npm run build`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4347, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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
// „1.234 Blöcke (56 Spalten)“ → 1234 (German thousands separator).
const stat = async (p, key) => Number((await p.locator(`[data-stat=${key}]`).innerText()).match(/^[\d.]+/)[0].replace(/\./g, ''));

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Gelände-Werkzeuge: Formstempel, Verwittern, Fluss, Maske (${viewport.width}px)`, async () => {
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
    const frame = async () => { await canvas.evaluate(e => e.scrollIntoView({ block: 'center' })); box = await canvas.boundingBox(); };
    const click = async (fx, fz) => { await p.mouse.move(...at(fx, fz)); await p.mouse.down(); await p.mouse.up(); };
    const tool = name => p.getByRole('toolbar', { name: 'Werkzeuge' }).getByRole('button', { name, exact: true }).click();
    const note = () => p.getByTestId('landscape-note');

    // 1. Formstempel: a mountain in one click.
    await tool('Formstempel');
    await p.getByLabel('Form', { exact: true }).selectOption('berg');
    await p.getByLabel('Formhöhe').fill('20');
    await p.getByLabel('Pinselgröße').fill('10');
    await frame();
    await click(0.3, 0.5);
    await note().getByText(/Berg gesetzt: .* höchster Punkt Y \d+/).waitFor();
    const peak = Number((await note().innerText()).match(/höchster Punkt Y (-?\d+)/)[1]);
    assert.ok(peak >= y0 + 14, `Gipfel ${peak} über ${y0}`);
    const fillAfterMountain = await stat(p, 'fill');
    assert.ok(fillAfterMountain > 0);

    // 2. Verwittern with the brush over the mountain, then the whole area: earth slides down, total stays similar.
    await tool('Verwittern');
    await p.getByLabel('Hang hält bis', { exact: true }).fill('1');
    await p.getByLabel('Regen', { exact: true }).selectOption('2');
    await p.getByLabel('Pinselgröße').fill('8');
    await frame();
    const [ax, ay] = at(0.25, 0.5), [bx, by] = at(0.35, 0.5);
    await p.mouse.move(ax, ay); await p.mouse.down(); await p.mouse.move(bx, by, { steps: 6 }); await p.mouse.up();
    await note().getByText(/Spalten verwittert/).waitFor();
    const area = p.getByTestId('landscape-erode');
    await area.locator('summary').click();
    await area.getByRole('button', { name: 'Ganze Fläche verwittern' }).click();
    await note().getByText(/Spalten verwittert, .* Blöcke Erde hangab gerutscht|Nichts verwittert/).waitFor();
    await shot(p, `sculpt-erode-${viewport.width}`);

    // 3. Fluss: two points across the right side, dig → water appears in the balance.
    const water0 = await stat(p, 'water');
    await tool('Fluss');
    await p.getByLabel('Flussbreite').fill('3');
    await p.getByLabel('Flusstiefe').fill('2');
    await frame();
    await click(0.75, 0.1); await click(0.8, 0.9);
    await p.getByRole('button', { name: 'Fluss graben' }).click();
    await note().getByText(/Fluss gegraben: \d+ Blöcke lang, Wasserspiegel von Y -?\d+ bis Y -?\d+/).waitFor();
    assert.ok(await stat(p, 'water') > water0, 'river water counted');
    await p.getByTestId('river-report').waitFor();

    // 4. Maske: raise only up to Y y0 – the mountain stays as it is, flat ground rises.
    await tool('Anheben');
    const mask = p.getByRole('group', { name: 'Maske' });
    await mask.getByLabel('nur bis Y').fill(String(y0));
    await p.getByLabel('Pinselgröße').fill('3');
    await p.getByLabel('Kante').selectOption('hard');
    await frame();
    const fill1 = await stat(p, 'fill');
    await click(0.1, 0.15);
    const fill2 = await stat(p, 'fill');
    assert.ok(fill2 > fill1, 'flat ground below the mask limit rises');
    await click(0.3, 0.5);
    assert.equal(await stat(p, 'fill'), fill2, 'the mountain top lies above the mask, nothing changes');
    await mask.getByLabel('nur bis Y').fill('');

    // 5. Undo the last dab, save, saved state.
    await p.getByRole('button', { name: '↶ Rückgängig' }).click();
    assert.equal(await stat(p, 'fill'), fill1);
    await p.getByRole('button', { name: 'Gestaltung speichern' }).click();
    await p.getByTestId('landscape-state').getByText('gespeichert', { exact: true }).waitFor();
    await shot(p, `sculpt-saved-${viewport.width}`);

    assert.deepEqual(errors, []);
    await context.close();
  });
}
