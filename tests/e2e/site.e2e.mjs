// Browser check of the construction site tab (B14): sections, stock, gathering plan, reservations, persistence.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4193, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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
  test(`Baustelle: Abschnitte, Lager, Sammelplan, Freiraum, dauerhaft (${viewport.width}px)`, async () => {
    const context = await browser.newContext({ viewport, acceptDownloads: true });
    const p = await context.newPage();
    p.setDefaultTimeout(10_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await p.goto(BASE);
    await p.getByRole('button', { name: 'Beispielprojekt „Burgmauer“' }).click();
    await p.waitForURL(/#\/projekt\//);
    const projectUrl = p.url().replace(/\/[a-z]+$/, '');

    // "vorhanden" in the material tab survives a reload.
    await p.getByRole('link', { name: 'Material' }).click();
    const raw = p.getByRole('region', { name: 'Rohstoffe und Rezepte' });
    await raw.locator('.recipe-steps li').first().getByRole('button', { name: 'vorhanden' }).click();
    await raw.getByRole('button', { name: /Vorhanden zurücksetzen \(1\)/ }).waitFor();
    await p.waitForTimeout(300);
    await p.reload();
    await p.getByRole('region', { name: 'Rohstoffe und Rezepte' }).getByRole('button', { name: /Vorhanden zurücksetzen \(1\)/ }).waitFor();

    // Site tab: overview, presets.
    await p.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name: 'Baustelle' }).click();
    const site = p.getByRole('region', { name: 'Baustelle' });
    await site.locator('.site-overview').waitFor();
    await site.getByRole('button', { name: /Fundament · Rohbau · Dach/ }).click();
    const sections = site.locator('.site-section');
    await sections.nth(2).waitFor();
    assert.deepEqual(await sections.locator('.site-section-text strong').allInnerTexts(), ['Fundament', 'Rohbau', 'Dach und Abschluss']);

    // Gathering plan of the current section with a stock entry.
    const gather = site.getByRole('region', { name: 'Sammel- und Farmplan' });
    await gather.getByRole('heading', { name: /Fundament/ }).waitFor();
    await gather.getByText(/Bruchsteingenerator/).first().waitFor();
    const input = gather.getByLabel('Lagerbestand cobblestone').first();
    await input.fill('5000');
    await input.press('Enter');
    await gather.locator('tr', { has: p.getByLabel('Lagerbestand cobblestone') }).first().locator('td.good').waitFor();
    const [download] = await Promise.all([p.waitForEvent('download'), gather.getByRole('button', { name: '⤓ Sammelplan-CSV' }).click()]);
    assert.match(download.suggestedFilename(), /-sammelplan-Fundament\.csv$/);

    // Reservations: the burg keeps its outer joints free, linked ones hidden by default.
    const res = site.getByRole('region', { name: 'Freiraum an Anschlüssen' });
    await res.locator('.badge.res-free').first().waitFor();
    assert.equal(await res.locator('.badge.res-blocked').count(), 0);
    await res.getByRole('button', { name: /Angedockte verbinden/ }).click();
    await res.getByRole('button', { name: /Angedockte verbinden/ }).waitFor({ state: 'detached' });
    assert.equal(await res.locator('.badge.res-docked').count(), 0);

    // Rename a section via the editor, move it, undo-able and persisted.
    await sections.nth(1).getByRole('button', { name: 'Bearbeiten' }).click();
    await sections.nth(1).getByLabel('Name').fill('Mauern hochziehen');
    await sections.nth(1).getByRole('button', { name: 'Übernehmen' }).click();
    await site.getByText('Mauern hochziehen').waitFor();
    await p.waitForTimeout(300);
    await p.goto(`${projectUrl}/baustelle`);
    await p.reload();
    await p.getByRole('region', { name: 'Baustelle' }).getByText('Mauern hochziehen').waitFor();
    assert.equal(await p.getByLabel('Lagerbestand cobblestone').first().inputValue(), '5000');
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no horizontal page scroll');

    // Build tab filters by section.
    await p.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name: 'Bauen' }).click();
    const filter = p.getByLabel('Bauabschnitt filtern');
    await p.locator('.step-list li').first().waitFor({ state: 'attached' });
    const all = await p.locator('.step-list li').count();
    await filter.selectOption({ label: '1. Fundament' });
    const found = await p.locator('.step-list li').count();
    assert.ok(found > 0 && found < all, `${found} of ${all} steps in Fundament`);
    assert.deepEqual(errors, []);
    await context.close();
  });
}
