// Browser check of the production tab (PROD-01…04): farms, harvest log into the site stock, coverage, AFK spot, persistence.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4331, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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
  test(`Produktion: Farmen, Ernte ins Lager, Deckung, AFK-Platz, dauerhaft (${viewport.width}px)`, async () => {
    const context = await browser.newContext({ viewport });
    const p = await context.newPage();
    p.setDefaultTimeout(10_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await p.goto(BASE);
    await openSampleProject(p);
    await p.waitForURL(/#\/projekt\//);
    const nav = p.getByRole('navigation', { name: 'Projektbereiche' });
    await nav.getByRole('link', { name: 'Produktion' }).click();
    const prod = p.getByRole('region', { name: 'Produktion', exact: true });
    await prod.locator('.site-overview').waitFor();
    const coverage = prod.getByRole('region', { name: 'Deckung' });
    const cobble = coverage.locator('tr', { has: p.locator('code', { hasText: /^cobblestone$/ }) });
    await cobble.waitFor();
    assert.match(await cobble.innerText(), /Handarbeit/);
    await prod.getByText('Noch keine Farmen').waitFor();

    // A semi-automatic farm: once running it raises the hand rate of cobblestone.
    const farms = prod.getByRole('region', { name: 'Farmen' });
    await farms.getByLabel('Farmart').selectOption('bruchstein');
    await farms.getByRole('button', { name: '+ Farm' }).click();
    const card = farms.locator('.prod-farm').filter({ hasText: 'Bruchsteingenerator' });
    await card.waitFor();
    await card.getByLabel('Zustand Bruchsteingenerator').selectOption('laeuft');
    await cobble.getByText('mit Farm').waitFor({ state: 'attached' }); // hand column is hidden on phones
    await prod.locator('.site-kpi', { hasText: 'FARMEN' }).getByText('1 / 1').waitFor();

    // Harvest log: amount goes into the site stock and the measured rate replaces the guide value.
    await card.getByRole('button', { name: 'Ernte & Details' }).click();
    await card.getByLabel('Menge').fill('600');
    await card.getByLabel('Arbeitszeit in Stunden').fill('1');
    await card.getByRole('button', { name: 'Ins Lager buchen' }).click();
    await card.locator('.prod-rate.measured').getByText('gemessen').waitFor();
    await card.locator('.prod-log tbody tr').first().waitFor();
    await cobble.waitFor({ state: 'detached' });

    // An automatic farm with a place; the AFK analysis proposes a spot that is then chosen.
    await farms.getByLabel('Farmart').selectOption('zuckerrohr');
    await farms.getByRole('button', { name: '+ Farm' }).click();
    const cane = farms.locator('.prod-farm').filter({ hasText: 'Zuckerrohr-Farm' });
    await cane.getByRole('button', { name: 'Ernte & Details' }).click();
    await cane.getByLabel('X-Koordinate').fill('120');
    await cane.getByLabel('Z-Koordinate').fill('-40');
    await cane.getByRole('button', { name: 'Ort speichern' }).click();
    await cane.getByText(/Oberwelt 120 \/ 64 \/ -40/).first().waitFor();
    const afk = prod.getByRole('region', { name: 'AFK-Platz' });
    await afk.getByRole('button', { name: 'Als AFK-Platz übernehmen' }).click();
    await afk.getByText(/Gewählt: Oberwelt 120/).waitFor();

    // The stock is the site's stock.
    await nav.getByRole('link', { name: 'Baustelle' }).click();
    assert.equal(await p.getByLabel('Lagerbestand cobblestone').first().inputValue(), '600');

    // Everything persists.
    await nav.getByRole('link', { name: 'Produktion' }).click();
    await p.reload();
    await prod.locator('.prod-farm').nth(1).waitFor({ timeout: 90_000 });
    assert.equal(await prod.locator('.prod-farm').count(), 2);
    await prod.getByRole('region', { name: 'AFK-Platz' }).getByText(/Gewählt/).waitFor();
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 1, `no horizontal scroll (${overflow}px)`);
    assert.deepEqual(errors, []);
    await context.close();
  });
}
