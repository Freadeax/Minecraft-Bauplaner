// Browser check of raw materials and recipes in the material tab (B1-R).
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4191, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

const stat = async (p, label) => Number((await p.locator('.raw-stats div', { hasText: label }).first().locator('dd').innerText()).split(/\s/)[0].replace(/\./g, ''));

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Rohstoffe: Rezeptbaum, Steinsäge, vorhanden markieren (${viewport.width}px)`, async () => {
    const p = await browser.newPage({ viewport, acceptDownloads: true });
    p.setDefaultTimeout(10_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await p.goto(BASE);
    await openSampleProject(p);
    await p.waitForURL(/#\/projekt\//);
    await p.getByRole('link', { name: 'Material' }).click();
    const panel = p.getByRole('region', { name: 'Rohstoffe und Rezepte' });
    await panel.getByText('✓ Alle Bauitems bis zu Rohstoffen aufgelöst').waitFor();
    const raw = await stat(p, 'Rohstoffe');
    assert.ok(raw > 0);
    assert.ok(await panel.locator('.raw-table tbody tr').count() >= 1);
    assert.ok(await panel.locator('.recipe-steps li').count() >= 1);
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no horizontal page scroll');
    // MAT-02: recipes are checked against the version profile; other game recipes open as alternatives.
    assert.match(await panel.locator('.materials-notes').innerText(), /Versionsprofil java-26\.3/);
    const alt = panel.locator('.recipe-alternatives').first();
    if (await alt.count()) { await alt.locator('summary').click(); assert.match(await alt.locator('.alt-line').first().innerText(), /→ \d+$/); }

    // MAT-02-S03: sort per tag and fuel are chosen here and stored in the project.
    const fuel = panel.getByLabel('Brennstoff', { exact: true });
    assert.equal(await fuel.count(), 1, 'the sample project smelts something');
    {
      await fuel.selectOption('minecraft:charcoal');
      await panel.locator('.raw-stats dt', { hasText: 'Brennstoff (charcoal)' }).waitFor();
      await panel.getByLabel('Brennstoff in die Rohstoffe aufnehmen').check();
      await panel.locator('.raw-stats dd', { hasText: 'in Rohstoffen' }).waitFor();
      assert.match(await panel.locator('.materials-notes').innerText(), /der Brennstoff ist in den Rohstoffen enthalten/);
      await panel.getByLabel('Brennstoff in die Rohstoffe aufnehmen').uncheck();
      await fuel.selectOption('minecraft:coal');
      await panel.locator('.raw-stats dt', { hasText: 'Brennstoff (coal)' }).waitFor();
    }
    const sort = panel.locator('.recipe-choices select[aria-label^="Sorte für"]').first();
    assert.equal(await sort.count(), 1, 'the sample project uses a recipe tag');
    {
      const option = await sort.locator('option').nth(2).getAttribute('value');
      await sort.selectOption(option);
      assert.match(await panel.locator('.materials-notes').innerText(), new RegExp(`${option.replace('minecraft:', '')} von dir gewählt`));
      await sort.selectOption('');
    }

    // Marking the first intermediate as available removes its subtree.
    const steps = await panel.locator('.recipe-steps li').count();
    await panel.locator('.recipe-steps li').first().getByRole('button', { name: 'vorhanden' }).click();
    await panel.getByRole('button', { name: /Vorhanden zurücksetzen \(1\)/ }).waitFor();
    assert.ok(await panel.locator('.raw-table .badge.stock').count() === 1);
    assert.ok(await panel.locator('.recipe-steps li').count() < steps);
    await panel.getByRole('button', { name: /Vorhanden zurücksetzen/ }).click();
    await p.waitForFunction(expected => document.querySelectorAll('.raw-materials .recipe-steps li').length === expected, steps);
    assert.equal(await panel.locator('.recipe-steps li').count(), steps);

    // Without stonecutter the crafting table rounds up: never fewer raw materials.
    await panel.getByLabel('Steinsäge bevorzugen').uncheck();
    assert.ok(await stat(p, 'Rohstoffe') >= raw);
    const [download] = await Promise.all([p.waitForEvent('download'), panel.getByRole('button', { name: '⤓ Rohstoff-CSV' }).click()]);
    assert.match(download.suggestedFilename(), /-rohstoffe\.csv$/);
    assert.deepEqual(errors, []);
    await p.close();
  });
}
