// Browser check of MAT-03-S03: glass, concrete and terracotta variants in the building sheet – each family
// is swapped on its own, the counts match, the saved variant contains exactly the new colours.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4349, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Materialvarianten: Glas, Beton und Terrakotta getrennt umfärben (${viewport.width}px)`, async () => {
    const context = await browser.newContext({ viewport });
    const p = await context.newPage();
    p.setDefaultTimeout(20_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await p.goto(`${BASE}#/bibliothek/gebaeude/bld_leuchtturm/versionen`);
    const versions = p.getByRole('region', { name: 'Bauversionen' });
    await versions.getByText('Materialvariante erzeugen', { exact: true }).click();
    const table = versions.locator('.swap-table');
    // All scoped families of the lighthouse are offered, each with its own colour list.
    for (const name of ['Beton · Weiß', 'Beton · Rot', 'Klarglas', 'Terrakotta · Weiß', 'Terrakotta · Rot']) await table.getByRole('rowheader', { name: new RegExp(`^${name.replace('·', '\\·')}`) }).waitFor();
    const glassOptions = await versions.getByLabel('Klarglas ersetzen durch').locator('option').allInnerTexts();
    assert.equal(glassOptions.length, 17, 'Klarglas plus 16 Farben');
    assert.ok(!glassOptions.some(o => /Beton|Terrakotta/.test(o)), 'Glas bleibt Glas');
    await versions.getByLabel('Beton · Weiß ersetzen durch').selectOption({ label: 'Beton · Schwarz' });
    await versions.getByLabel('Klarglas ersetzen durch').selectOption({ label: 'Glas · Hellblau' });
    await versions.getByLabel('Terrakotta · Rot ersetzen durch').selectOption({ label: 'Terrakotta · Grün' });
    const preview = versions.locator('.swap-preview');
    await preview.waitFor();
    assert.match(await preview.innerText(), /208 Blöcke getauscht/);
    assert.equal(await preview.locator('[role=note]').count(), 0, 'jede Form hat ihr Gegenstück');
    await versions.getByRole('button', { name: 'Als neue Variante speichern' }).click();
    await p.locator('.building-detail h1', { hasText: 'Leuchtturm (' }).waitFor();
    // The saved variant contains the new colours and still the untouched ones.
    const saved = p.getByRole('region', { name: 'Bauversionen' });
    await saved.getByText('Materialvariante erzeugen', { exact: true }).click();
    const rows = saved.locator('.swap-table tbody th');
    await rows.first().waitFor();
    const names = (await rows.allInnerTexts()).map(t => t.split('\n')[0].replace(/\s+\S+ · \d+ Formen?$/, '').trim());
    for (const want of ['Beton · Schwarz', 'Glas · Hellblau', 'Terrakotta · Grün', 'Beton · Rot', 'Terrakotta · Weiß']) assert.ok(names.some(n => n.startsWith(want)), `${want} in ${names.join(', ')}`);
    assert.ok(!names.some(n => n.startsWith('Klarglas') || n.startsWith('Beton · Weiß') || n.startsWith('Terrakotta · Rot')), names.join(', '));
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no horizontal page scroll');
    assert.deepEqual(errors, []);
    await context.close();
  });
}
