// Browser check of the parametric generators (B13) against the built Pages artifact.
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

const tile = (p, label) => p.locator('.stat-tiles > div').filter({ has: p.locator('dt', { hasText: label }) }).locator('dd');

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Generatoren: Übersicht, Parameter mit Live-Vorschau, Speichern, neue Version, Anlage als Projekt (${viewport.width}px)`, async () => {
    const p = await browser.newPage({ viewport });
    p.setDefaultTimeout(15_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    await p.goto(`${BASE}#/bibliothek`);
    await p.locator('.lib-tabs a', { hasText: 'Generatoren' }).click();
    await p.waitForURL(/#\/bibliothek\/generatoren$/);
    await p.locator('.gen-card').nth(6).waitFor();
    assert.equal(await p.locator('.gen-card').count(), 7, '5 Generatoren + 2 Anlagen');
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'kein waagrechtes Scrollen');

    // Tower: change a parameter, the preview figures follow.
    await p.getByRole('link', { name: 'Generator Turm öffnen' }).click();
    await p.locator('.generator-page canvas, .generator-page .scene').first().waitFor();
    const before = await tile(p, 'Blöcke').innerText();
    await p.getByLabel('Turmhöhe (Zahl)').fill('30');
    await p.waitForFunction(b => document.querySelector('.stat-tiles')?.textContent?.includes('Blöcke') && ![...document.querySelectorAll('.stat-tiles dd')].some(d => d.textContent === b), before);
    assert.match(await tile(p, 'Größe').innerText(), /× 3\d ×/, 'Höhe über 30');
    // Out of range input is clamped visibly.
    await p.getByLabel('Radius (Zahl)').fill('99');
    await p.locator('.gen-issues li', { hasText: 'Radius: 99 auf 8 angepasst' }).waitFor();
    await p.getByLabel('Radius (Zahl)').fill('3');
    await p.getByLabel('Name des Bauteils').fill(`Testturm ${viewport.width}`);
    await p.getByRole('button', { name: 'Als neues Bauteil speichern' }).click();
    await p.waitForURL(/#\/bibliothek\/gebaeude\//);
    await p.locator('.building-detail h1', { hasText: `Testturm ${viewport.width}` }).waitFor();
    await p.locator('.gen-info .ok-text', { hasText: 'identisch' }).waitFor();

    // Edit with the generator: a new version of the same asset.
    await p.getByRole('link', { name: '⚙ Mit Generator bearbeiten' }).click();
    await p.waitForURL(/#\/bibliothek\/generatoren\/turm(@|%40)/);
    const saveVersion = p.getByRole('button', { name: /Als Version 2\.0 von/ });
    assert.equal(await saveVersion.isDisabled(), true, 'unverändert ⇒ keine neue Version');
    await p.getByRole('button', { name: 'Eckig' }).click();
    await saveVersion.click();
    await p.waitForURL(/#\/bibliothek\/gebaeude\//);
    await p.locator('.notice', { hasText: 'Version 2.0' }).waitFor();

    // Preset link from the overview, then a compound as a project.
    await p.goto(`${BASE}#/bibliothek/generatoren/haus~villa`);
    assert.equal(await p.getByLabel('Vorlage').inputValue(), 'villa');
    await p.locator('.detail-title', { hasText: 'Modern' }).waitFor();
    await p.goto(`${BASE}#/bibliothek/generatoren/burganlage~burg`);
    await p.locator('.stat-tiles', { hasText: '9 Bauteile' }).waitFor();
    await p.locator('.stat-tiles .ok-text', { hasText: 'keine' }).waitFor();
    await p.getByRole('button', { name: 'Als Projekt anlegen' }).click();
    await p.waitForURL(/#\/projekt\//);
    await p.locator('.instance-list li').nth(8).waitFor();
    assert.equal(await p.locator('.instance-list li').count(), 9);
    assert.deepEqual(errors, []);
    await p.close();
  });
}
