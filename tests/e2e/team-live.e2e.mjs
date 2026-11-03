// Browser check of „Mit Spiel abgleichen“ (COOP-03, docs/architecture/TEAMBAU.md §7) against the mod simulator:
// the team view goes to the mod, a claim made in the game comes back as a preview, is merged in one undoable
// step and acknowledged; with the team channel live, events of other players come from the server.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startModSimulator } from './modSimulator.mjs';
import { openSampleProject } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4316, MOD_PORT = 47731, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
const TOKEN = 'simteamlive0123456789abcdefghij';
let server, browser, mod;

before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  mod = await startModSimulator(MOD_PORT, { protocol: 2, features: ['scan', 'marks2', 'players', 'bigplans', 'team'] });
  mod.state.tokens.add(TOKEN);
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); await mod?.close(); server?.kill(); });

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Teambau mit der Mod: Teamstand ins Spiel, Übernahme aus dem Spiel zurück, Server live (${viewport.width}px)`, async () => {
    Object.assign(mod.state, { teamPushed: null, teamOutbox: [], teamAcked: [], teamRejections: [], teamServerEvents: [], teamLink: 'none' });
    const context = await browser.newContext({ viewport });
    await context.addInitScript(([port, token]) => localStorage.setItem('bauplaner.spielverbindung', JSON.stringify({ port, token, auto: false })), [MOD_PORT, TOKEN]);
    const p = await context.newPage();
    p.setDefaultTimeout(15_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|clipboard/i.test(m.text())) errors.push(m.text()); });

    await p.goto(BASE);
    await openSampleProject(p);
    await p.waitForURL(/#\/projekt\//);
    await p.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name: 'Baustelle' }).click();
    await p.getByRole('region', { name: 'Baustelle' }).getByRole('button', { name: /Fundament · Rohbau · Dach/ }).click();
    await p.locator('.site-section').nth(2).waitFor();
    await p.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name: 'Team' }).click();
    await p.getByPlaceholder('Dein Name').fill('Philipp');
    await p.getByLabel(/Minecraft-Name/).fill('Freadeax');
    await p.getByRole('button', { name: 'Team gründen' }).click();

    // 1. Team view to the game.
    const live = p.getByRole('region', { name: 'Mit Spiel abgleichen' });
    await live.getByRole('button', { name: 'Jetzt abgleichen' }).click();
    await live.getByText('Minecraft ist mit keinem Server verbunden').waitFor();
    const pushed = mod.state.teamPushed;
    assert.ok(pushed, 'Teamstand an die Mod geschickt');
    assert.deepEqual(pushed.sections.map(s => [s.nr, s.name, s.status]), [[1, 'Fundament', 'frei'], [2, 'Rohbau', 'frei'], [3, 'Dach und Abschluss', 'frei']]);
    assert.ok(pushed.me, '„Ich bin“ geht mit');
    assert.equal(pushed.members.find(m => m.id === pushed.me).player, 'Freadeax');
    assert.ok(await live.getByRole('button', { name: 'Meldungen vom Server holen' }).isDisabled(), 'ohne Server nicht abholbar');

    // 2. In the game: „/bauplaner team nehmen 2“ – the mod offers it as an event of „Ich bin“.
    const claim = { id: 'tev_mrohbau00000001', at: new Date(Date.now() + 1000).toISOString(), by: pushed.me, origin: 'planer', kind: 'section.claim', section: pushed.sections[1].id };
    mod.state.teamOutbox = [claim];
    await live.getByRole('button', { name: 'Jetzt abgleichen' }).click();
    const preview = p.getByRole('region', { name: 'Vorschau Abgleich' });
    await preview.getByText('Aus dem Spiel: 1 neue Meldung').waitFor();
    assert.equal(mod.state.teamAcked.length, 0, 'erst nach dem Übernehmen quittiert');
    await preview.getByRole('button', { name: 'Übernehmen' }).click();
    await preview.waitFor({ state: 'detached' });
    const rohbau = p.getByRole('region', { name: 'Abschnitte' }).locator('.team-sections > li').filter({ has: p.locator('strong', { hasText: /^Rohbau/ }) });
    await rohbau.getByText('in Arbeit').waitFor();
    for (let i = 0; i < 20 && !mod.state.teamAcked.length; i++) await p.waitForTimeout(100);
    assert.deepEqual(mod.state.teamAcked, [claim.id], 'Quittung an die Mod');
    assert.equal(mod.state.teamOutbox.length, 0);

    // 3. Same meldung again (e.g. lost ack): nothing new, nothing doubled.
    mod.state.teamOutbox = [claim];
    await live.getByRole('button', { name: 'Jetzt abgleichen' }).click();
    await p.getByText(/1 Meldung aus dem Spiel schon bekannt oder übernommen/).waitFor();
    assert.equal(await preview.count(), 0, 'keine leere Vorschau');
    for (let i = 0; i < 20 && mod.state.teamOutbox.length; i++) await p.waitForTimeout(100);
    assert.deepEqual(mod.state.teamAcked, [claim.id, claim.id], 'bekannte Meldung sofort quittiert');

    // 4. Channel live: a note from the server comes from the server.
    mod.state.teamLink = 'live';
    const anna = { id: 'tev_server000000001', at: new Date(Date.now() + 2000).toISOString(), by: pushed.me, origin: 'server', kind: 'note.add', noteId: 'note_srv1', text: 'Treppe am Turm fehlt', tag: 'frage' };
    mod.state.teamServerEvents = [anna];
    await live.getByRole('button', { name: 'Jetzt abgleichen' }).click();
    await live.getByText('Live mit dem Server-Plugin').waitFor();
    await live.getByRole('button', { name: 'Meldungen vom Server holen' }).click();
    await preview.getByText('Aus dem Server: 1 neue Meldung').waitFor();
    await preview.getByRole('button', { name: 'Übernehmen' }).click();
    await p.getByText('Treppe am Turm fehlt').first().waitFor();
    // „Rückgängig“ right there takes the server merge back in one step.
    await live.getByText('Server: 1 Meldung übernommen').waitFor();
    await live.getByRole('button', { name: 'Rückgängig' }).click();
    await p.getByText('Treppe am Turm fehlt').first().waitFor({ state: 'detached' });

    const scroll = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(scroll <= 1, `kein waagerechtes Scrollen (${scroll}px)`);
    assert.deepEqual(errors, []);
    await context.close();
  });
}
