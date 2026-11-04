// Browser check of PROJ-02: baseline with slip, share of building days, wait for material (link to Produktion), persistence.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4337, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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
  test(`Planung vertieft: Basisplan, Anteil, Material abwarten (${viewport.width}px)`, async () => {
    const context = await browser.newContext({ viewport });
    const p = await context.newPage();
    p.setDefaultTimeout(10_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await p.goto(BASE);
    await openSampleProject(p);
    await p.waitForURL(/#\/projekt\//);
    const projectUrl = p.url().replace(/\/[a-z]+$/, '');
    const nav = p.getByRole('navigation', { name: 'Projektbereiche' });
    await nav.getByRole('link', { name: 'Baustelle' }).click();
    const site = p.getByRole('region', { name: 'Baustelle' });
    await site.getByRole('button', { name: /Fundament · Rohbau · Dach/ }).click();
    await site.locator('.site-section').nth(2).waitFor();

    await nav.getByRole('link', { name: 'Planung' }).click();
    const planning = p.getByRole('region', { name: 'Planung' });
    const settings = planning.getByRole('region', { name: 'Einstellungen' });
    // Baseline needs a start date.
    assert.equal(await settings.getByRole('button', { name: 'Basisplan festhalten' }).isDisabled(), true);
    const start = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    await settings.getByLabel('Startdatum').fill(start);
    await settings.getByRole('button', { name: 'Basisplan festhalten' }).click();
    const kpi = planning.locator('.prog-slip-kpi');
    await kpi.getByText('± 0').waitFor();
    await planning.locator('.prog-baseline').first().waitFor();

    // A builder at 25 % of the days makes the plan later than the baseline.
    const builders = planning.getByRole('region', { name: 'Bauleute' });
    await builders.getByLabel('Name der neuen Bauleute').fill('Anna');
    await builders.getByLabel('Blöcke je Bautag der neuen Bauleute').fill('16');
    await builders.getByRole('button', { name: '+ Bauleute' }).click();
    for (const s of ['Fundament', 'Rohbau', 'Dach und Abschluss']) await builders.getByLabel(`${s}: Anna`).check();
    await builders.getByLabel('Anteil der Bautage von Anna').selectOption('25');
    await kpi.getByText(/^\+\d+ Bautage?$/).waitFor();
    const ms = planning.getByRole('region', { name: 'Meilensteine' });
    await ms.getByLabel('Name des neuen Meilensteins').fill('Fertig');
    await ms.getByRole('button', { name: '+ Meilenstein' }).click();

    // Wait for material: KPI from Produktion, Produktion tab says the plan waits.
    await settings.getByLabel('Auf Material warten').check();
    const material = planning.locator('.prog-material-kpi');
    await material.getByText(/MATERIAL · AUS PRODUKTION/).waitFor();
    assert.match(await material.innerText(), /Spieltagen|beisammen|offen/);
    await material.getByRole('link', { name: 'Farmen & Engpässe' }).click();
    await p.waitForURL(/\/produktion$/);
    await p.getByText(/Die Planung wartet auf das Material|Material rechtzeitig|Abschnitte, deren Material/).first().waitFor();

    // Persistence.
    await p.waitForTimeout(400);
    await p.goto(`${projectUrl}/planung`);
    await p.reload();
    const s2 = p.getByRole('region', { name: 'Einstellungen' });
    await s2.getByRole('button', { name: 'Basisplan verwerfen' }).waitFor();
    assert.equal(await s2.getByLabel('Auf Material warten').isChecked(), true);
    assert.equal(await p.getByLabel('Anteil der Bautage von Anna').inputValue(), '25');
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no horizontal page scroll');
    // Discarding the baseline removes the comparison.
    await s2.getByRole('button', { name: 'Basisplan verwerfen' }).click();
    await p.locator('.prog-slip-kpi').waitFor({ state: 'detached' });
    assert.deepEqual(errors, []);
    await context.close();
  });
}
