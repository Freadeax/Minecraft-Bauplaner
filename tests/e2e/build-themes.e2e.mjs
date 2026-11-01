// Browser check of the building catalogue (B9) against the built Pages artifact.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4198, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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
  test(`Bauwelten: echte Treffer, Suchwechsel, Detail und Projektkontext (${viewport.width}px)`, async () => {
    const p = await browser.newPage({ viewport });
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.setDefaultTimeout(10_000);
    // Start with unrelated filters; theme links must replace them, including the text.
    await p.goto(`${BASE}#/bibliothek?q=kein_treffer_123`);
    await p.getByLabel('Bauteile suchen').waitFor();
    await p.getByRole('link', { name: 'Bauwelten', exact: true }).click();
    await p.waitForFunction(() => document.querySelectorAll('.build-theme-card').length === 11);
    const card = p.locator('#bauwelt-kueste');
    const browse = card.locator('.build-theme-browse');
    const expected = Number((await browse.innerText()).match(/[\d.]+/)[0].replace(/\./g, ''));
    assert.ok(expected > 0);
    assert.match(await browse.getAttribute('href'), /varianten=alle/);
    await browse.click();
    await p.waitForFunction(n => Number(document.querySelector('.result-count b')?.textContent) === n, expected);
    assert.equal(await p.getByLabel('Bauteile suchen').inputValue(), '');
    await p.reload();
    await p.waitForFunction(n => Number(document.querySelector('.result-count b')?.textContent) === n, expected);
    await p.getByRole('link', { name: 'Bauwelten', exact: true }).click();
    await card.locator('.build-theme-previews a').first().click();
    await p.locator('.building-detail').waitFor();
    // A browse from project context keeps the encoded project ID in its route.
    await p.goto(`${BASE}#/bibliothek/fuer/Hafen%20%2F%20S%C3%BCd/bauwelten`);
    await p.locator('.build-theme-browse').first().waitFor();
    assert.match(await p.locator('.build-theme-browse').first().getAttribute('href'), /fuer\/Hafen%20%2F%20S%C3%BCd\?/);
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
    assert.deepEqual(errors, []);
    await p.close();
  });
}
