// Browser check of PROJ-05: Bauleute aus dem Team in die Planung übernehmen, Konto je Bauleute (Zusagen, Lieferungen, Saldo), Bauzettel.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4371, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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
  test(`Planung: Bauleute aus dem Team und Konto je Bauleute (${viewport.width}px)`, async () => {
    const context = await browser.newContext({ viewport });
    const p = await context.newPage();
    p.setDefaultTimeout(15_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/clipboard/i.test(m.text())) errors.push(m.text()); });
    await p.goto(BASE);
    await openSampleProject(p);
    await p.waitForURL(/#\/projekt\//);
    const nav = p.getByRole('navigation', { name: 'Projektbereiche' });
    await nav.getByRole('link', { name: 'Baustelle' }).click();
    await p.getByRole('region', { name: 'Baustelle' }).getByRole('button', { name: /Fundament · Rohbau · Dach/ }).click();
    await p.locator('.site-section').nth(2).waitFor();

    // Team: found, deliver 32 oak logs, promise to gather 10 cobblestone.
    await nav.getByRole('link', { name: 'Team' }).click();
    await p.getByPlaceholder('Dein Name').fill('Philipp');
    await p.getByLabel(/Minecraft-Name/).fill('Freadeax');
    await p.getByRole('button', { name: 'Team gründen' }).click();
    const contrib = p.getByRole('region', { name: 'Beiträge und Sammeln' });
    await contrib.getByLabel('Geliefert: Item').fill('oak_log');
    await contrib.getByLabel('Menge').first().fill('32');
    await contrib.getByRole('button', { name: 'Beitrag melden' }).click();
    await contrib.getByPlaceholder('Ich sammle: Item').fill('cobblestone');
    await contrib.getByPlaceholder('Menge').last().fill('10');
    await contrib.getByRole('button', { name: 'Übernehmen' }).click();
    await contrib.getByText('10 × cobblestone').waitFor();

    // Planung: Philipp is a team member but no builder yet.
    await nav.getByRole('link', { name: 'Planung' }).click();
    const fromTeam = p.getByRole('region', { name: 'Bauleute aus dem Team' });
    await fromTeam.getByText('Noch nicht in der Planung').waitFor();
    await fromTeam.getByText(/Philipp \(Freadeax\)/).waitFor();
    await fromTeam.getByRole('button', { name: /Team übernehmen \(\d+\)/ }).click();
    await fromTeam.getByRole('button', { name: 'Planung entspricht dem Team' }).waitFor();
    assert.equal(await fromTeam.getByText('Noch nicht in der Planung').count(), 0);
    // Undo right there brings the candidate back; take over again.
    await fromTeam.getByRole('status').filter({ hasText: 'Aus dem Team übernommen' }).getByRole('button', { name: 'Rückgängig' }).click();
    await fromTeam.getByText('Noch nicht in der Planung').waitFor();
    await fromTeam.getByRole('button', { name: /Team übernehmen \(\d+\)/ }).click();
    await fromTeam.getByRole('button', { name: 'Planung entspricht dem Team' }).waitFor();
    // Philipp builds every section: their items become his need.
    const builders = p.getByRole('region', { name: 'Bauleute', exact: true });
    for (const box of await p.getByRole('table', { name: 'Zuweisung' }).getByRole('checkbox').all()) await box.check();
    await fromTeam.getByText('Noch ohne Sammelzusage').waitFor();

    const account = builders.locator('.prog-account').first();
    await account.locator('summary').click();
    const summary = await account.locator('summary').innerText();
    assert.match(summary, /zugesagt 10/);
    assert.match(summary, /eingebracht 32/);
    assert.match(summary, /Saldo \+32/);
    const table = builders.getByRole('table', { name: 'Konto von Philipp' });
    await table.getByRole('row', { name: /oak_log/ }).waitFor();
    await table.getByRole('row', { name: /cobblestone/ }).waitFor();


    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `kein Querscrollen (${overflow}px)`);
    assert.deepEqual(errors, []);
    await context.close();
  });
}
