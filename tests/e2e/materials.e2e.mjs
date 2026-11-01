// Browser check of the material tab (B1) against the built Pages artifact.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4181, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

const number = async (p, label) => Number((await p.locator('.materials-stats div', { hasText: label }).locator('dd').innerText()).split(/\s/)[0].replace(/\./g, ''));

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Material-Tab: Bauitems, Stacks, Umfang und Konflikthinweis (${viewport.width}px)`, async () => {
    const p = await browser.newPage({ viewport, acceptDownloads: true });
    p.setDefaultTimeout(10_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await p.goto(BASE);
    await p.getByRole('button', { name: 'Beispielprojekt „Burgmauer“' }).click();
    await p.waitForURL(/#\/projekt\//);
    await p.getByText('✓ Geometrisch konfliktfrei').waitFor();
    await p.getByRole('link', { name: 'Material' }).click();
    await p.waitForURL(/\/material$/);
    await p.getByText('✓ Gesamtprojekt: vollständige Bauitemliste').waitFor();
    const items = await number(p, 'Bauitems'), placed = await number(p, 'Platzierte Blöcke');
    assert.ok(items > 0);
    assert.equal(items, placed, 'sample palette maps one item per placed block');
    assert.ok(await p.locator('.materials-table tbody tr').count() >= 4);
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no horizontal page scroll');
    // The lab is another view of the same report: searching never changes the totals.
    const lab = p.getByRole('region', { name: 'Materiallabor', exact: true });
    await lab.getByRole('heading', { name: 'Materiallabor' }).waitFor();
    assert.ok(await lab.locator('.material-lab-card').count() > 0);
    await lab.getByLabel('Materiallabor durchsuchen').fill('cobble');
    assert.equal(await lab.locator('.material-lab-card').count(), 1);
    assert.match(await lab.locator('.material-lab-card h4').innerText(), /cobblestone/);
    assert.equal(await number(p, 'Bauitems'), items, 'labor search leaves full report untouched');
    await lab.getByLabel('Materiallabor durchsuchen').fill('no_such_material');
    assert.equal(await lab.locator('.material-lab-card').count(), 0);
    await lab.getByText('Kein Bauitem passt', { exact: false }).waitFor();
    await lab.getByRole('button', { name: 'Zurücksetzen', exact: true }).click();
    await lab.getByRole('button', { name: /^Stein/ }).click();
    assert.equal(await lab.getByRole('button', { name: /^Stein/ }).getAttribute('aria-pressed'), 'true');
    await lab.getByLabel('Materiallabor Zuordnung').selectOption('assumed');
    assert.equal(await lab.locator('.material-lab-card').count(), 0, 'sample has no assumed item mappings');
    await lab.getByRole('button', { name: 'Zurücksetzen', exact: true }).click();
    // instance scope is a subset of the project
    const options = await p.getByLabel('Umfang der Materialliste').locator('option').allInnerTexts();
    await p.getByLabel('Umfang der Materialliste').selectOption({ label: options[1] });
    await p.getByText(/Instanz „.*“: vollständige Bauitemliste/).waitFor();
    assert.ok(await number(p, 'Bauitems') < items);
    assert.ok((await lab.locator('.material-lab-result').innerText()).includes(`${(await number(p, 'Bauitems')).toLocaleString('de-DE')} Bauitems`));
    await p.getByLabel('Umfang der Materialliste').selectOption({ label: 'Gesamtprojekt' });
    await p.getByLabel('Materialien filtern').fill('cobble');
    assert.match(await p.locator('.materials-title').first().innerText(), /^Bauitems\s*1 von/);
    await p.getByLabel('Materialien filtern').fill('');
    const [download] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: '⤓ CSV' }).click()]);
    assert.match(download.suggestedFilename(), /-material\.csv$/);
    // a conflict made in the editor makes the list provisional
    await p.getByRole('link', { name: 'Editor' }).click();
    await p.getByRole('button', { name: /Mauer 1/ }).click();
    await p.getByRole('button', { name: 'X minus 1' }).click();
    await p.getByText('⚠ Offene Punkte vor einem baubaren Export').waitFor();
    await p.getByRole('link', { name: 'Material' }).click();
    await p.getByText('⚠ Gesamtprojekt: vorläufige Bauitemliste').waitFor();
    assert.match(await p.locator('.materials-status').innerText(), /ungeklärte Voxelkonflikte/);
    assert.deepEqual(errors, []);
    await p.close();
  });
}
