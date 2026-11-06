// Browser check of TERRAIN-04 „Gelände direkt aus der Mod“ against the mod simulator: the Gelände tab
// connects to the game, shows how much of the building site the Geländegedächtnis knows, takes the
// terrain over without region files (with biomes), checks block by block from the game, and the
// Landschaft tab paints by biome. An older mod (no `terrain`) still delivers loaded chunks.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startModSimulator } from './modSimulator.mjs';
import { openSampleProject } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4297, MOD_PORT = 47693, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
let server, browser, mod;

before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  mod = await startModSimulator(MOD_PORT, { protocol: 2, features: ['scan', 'marks2', 'players', 'terrain', 'box'] });
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.kill(); await mod?.close(); });

for (const [label, viewport] of [['Desktop', { width: 1400, height: 1000 }], ['Handy', { width: 390, height: 844 }]]) {
  test(`Gelände aus dem Spiel: Abdeckung, Übernahme mit Biomen, blockgenaue Prüfung, Landschaft nach Biomen (${label})`, async () => {
    mod.state.features = ['scan', 'marks2', 'players', 'terrain', 'box'];
    mod.state.tokens.clear();
    mod.state.boxReads = 0;
    const context = await browser.newContext({ viewport });
    const p = await context.newPage();
    p.setDefaultTimeout(20_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });

    await p.goto(`${BASE}#/`);
    await p.evaluate(port => localStorage.setItem('bauplaner.spielverbindung', JSON.stringify({ port, token: null, auto: true })), MOD_PORT);
    await openSampleProject(p);
    await p.waitForURL(/#\/projekt\//);
    const projectId = decodeURIComponent(p.url().split('#/projekt/')[1].split(/[/?]/)[0]);
    await p.goto(`${BASE}#/karte`);
    await p.locator('.map-page[data-map-state=ready]').waitFor({ timeout: 30_000 });
    await p.getByRole('button', { name: 'Platzieren' }).first().click();
    await p.getByRole('status').filter({ hasText: 'Auf die Weltkarte gesetzt' }).waitFor();

    await p.goto(`${BASE}#/projekt/${encodeURIComponent(projectId)}/gelaende`);
    const fromGame = p.getByTestId('terrain-from-game');
    await fromGame.getByRole('button', { name: 'Mit dem Spiel verbinden' }).click();
    mod.openPairing();
    await fromGame.getByLabel('Code').fill('482913');
    await fromGame.getByRole('button', { name: 'Koppeln' }).click();
    await fromGame.getByText('Spiel verbunden').waitFor();

    // How much of the site the game knows (simulator: memory reaches ±12 chunks around chunk 2/-2).
    const coverage = fromGame.getByTestId('terrain-coverage');
    await coverage.waitFor();
    assert.match(await coverage.innerText(), /Die Mod kennt\s+\d+ von \d+ Chunks/);

    await fromGame.getByRole('button', { name: 'Gelände aus dem Spiel übernehmen' }).click();
    await p.getByRole('status').filter({ hasText: 'Geländeaufnahme aus dem Spiel gespeichert' }).waitFor();
    const state = p.getByTestId('terrain-survey-state');
    await state.waitFor();
    assert.match(await state.innerText(), /aus dem Spiel/);
    await state.getByText(/Biome: .*Ebene/).waitFor();
    assert.ok(mod.state.requests.some(r => r.startsWith('GET /v1/terrain')), 'über /v1/terrain gelesen');

    // Block-exact check from the game, no region files.
    const check = p.getByRole('region', { name: 'Blockgenau prüfen' });
    await check.getByRole('button', { name: 'Gelände aus dem Spiel prüfen' }).click();
    await p.locator('.terrain-verdict').waitFor();
    assert.equal(mod.state.boxReads, 1);
    await p.getByText('Quelle: Blöcke aus dem Spiel (geladene Chunks)').waitFor();

    // Landschaft: start on the survey, then paint by the biomes the game delivered.
    await p.goto(`${BASE}#/projekt/${encodeURIComponent(projectId)}/landschaft`);
    await p.getByRole('button', { name: 'Gestaltung beginnen' }).click();
    const biomes = p.getByTestId('landscape-biomes');
    await biomes.locator('summary').click();
    await biomes.getByRole('button', { name: 'Nach Biomen bemalen' }).click();
    await p.getByRole('status').filter({ hasText: /Spalten nach Biomen bemalt/ }).waitFor();

    // An older mod without the Geländegedächtnis: only loaded chunks, the page says so.
    mod.state.features = ['scan', 'marks2', 'players'];
    await p.goto(`${BASE}#/projekt/${encodeURIComponent(projectId)}/gelaende`);
    await p.reload();
    await fromGame.getByText(/nur Chunks, die gerade geladen sind/).waitFor();
    const before = mod.state.requests.filter(r => r.startsWith('GET /v1/chunks')).length;
    await fromGame.getByRole('button', { name: 'Gelände aus dem Spiel erneuern' }).click();
    await p.getByRole('status').filter({ hasText: 'Geländeaufnahme aus dem Spiel gespeichert' }).waitFor();
    assert.ok(mod.state.requests.filter(r => r.startsWith('GET /v1/chunks')).length > before, 'alte Mod über /v1/chunks');
    await p.getByText(/kann noch nicht blockgenau lesen/).waitFor();

    const wide = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(wide, false, 'keine waagerechte Rollleiste');
    assert.deepEqual(errors, []);
    await context.close();
  });
}
