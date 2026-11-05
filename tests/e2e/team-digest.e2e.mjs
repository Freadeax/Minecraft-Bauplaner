// Browser check of COOP-11 „Verlauf verdichten“ and the Ertragsbuch (COOP-08 S03): a month of server
// measurements comes in, the Ertragsbuch shows the measured rate, the Bauleitung compacts the log, the
// numbers stay the same and „Rückgängig“ brings the full log back. Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject } from './start.mjs';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readTeamPackage, teamEvent, TEAM_SERVER_FORMAT } from '../../dist/domain/src/index.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4343, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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
  test(`Teambau: Ertragsbuch und Verlauf verdichten (${viewport.width}px)`, async () => {
    const context = await browser.newContext({ viewport, acceptDownloads: true });
    const a = await context.newPage();
    a.setDefaultTimeout(15_000);
    const errors = [];
    a.on('pageerror', e => errors.push(e.message));
    a.on('console', m => { if (m.type() === 'error' && !/clipboard/i.test(m.text())) errors.push(m.text()); });

    await a.goto(BASE);
    await openSampleProject(a);
    await a.waitForURL(/#\/projekt\//);
    await a.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name: 'Baustelle' }).click();
    await a.getByRole('region', { name: 'Baustelle' }).getByRole('button', { name: /Fundament · Rohbau · Dach/ }).click();
    await a.locator('.site-section').nth(2).waitFor();
    await a.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name: 'Team' }).click();
    await a.getByPlaceholder('Dein Name').fill('Philipp');
    await a.getByRole('button', { name: 'Team gründen' }).click();
    await a.getByText('Noch kein Planstand freigegeben').waitFor();
    await a.getByRole('region', { name: 'Abschnitte' }).getByRole('button', { name: 'Übernehmen' }).first().click();
    const [onlyTeam] = await Promise.all([a.waitForEvent('download'), a.getByRole('button', { name: 'Teampaket nur Teamstand' }).click()]);
    const pkg = await readTeamPackage(readFileSync(await onlyTeam.path(), 'utf8'));
    const me = pkg.team.founder, sec = pkg.team.events.find(e => e.kind === 'section.claim').section;

    // A month of plugin measurements, 40 to 30 days ago.
    const start = Date.now() - 40 * 86_400_000;
    let n = 0;
    const at = () => new Date(start + (n++) * 600_000).toISOString();
    const srv = body => teamEvent(me, body, at(), 'server');
    const events = [
      srv({ kind: 'store.chest', chest: 'farm_e2e', name: 'Kakteenkiste', pos: [40, 64, 10], dimension: 'minecraft:overworld' }),
      teamEvent(me, { kind: 'store.config', chest: 'farm_e2e', purpose: 'ertrag' }, at()),
    ];
    for (let i = 0; i < 120; i++) {
      events.push(srv({ kind: 'build.tally', section: sec, placed: 10, broken: 1, blocks: [{ item: 'minecraft:stone', count: 10 }], from: at(), until: at() }));
      events.push(srv({ kind: 'store.yield', chest: 'farm_e2e', items: [{ item: 'minecraft:cactus', count: 50 }], from: at(), until: at(), minutes: 10 }));
    }
    const exportFile = join(mkdtempSync(join(tmpdir(), 'team-digest-')), 'Burg-server.export.json');
    writeFileSync(exportFile, JSON.stringify({
      format: TEAM_SERVER_FORMAT, formatVersion: 1, teamId: pkg.team.teamId, name: pkg.team.name, projectName: 'Burg', founder: me, createdAt: pkg.team.createdAt,
      dimension: 'minecraft:overworld', sections: [], members: [], exportedAt: new Date().toISOString(), events: [...pkg.team.events, ...events],
    }));
    await a.locator('.team-exchange input[type=file]').setInputFiles(exportFile);
    const pa = a.getByRole('region', { name: 'Vorschau Einlesen' });
    await pa.getByText(/neue Ereignisse/).waitFor();
    await pa.getByRole('button', { name: 'Übernehmen' }).click();

    // Ertragsbuch: 120 × 50 cactus in 1200 min = 300 per hour.
    const proof = a.getByRole('region', { name: 'Baunachweis und Lager' });
    const book = proof.getByRole('region', { name: 'Ertragsbuch' });
    await book.locator('tr[data-yield="farm_e2e"]').getByText('300 cactus').waitFor();
    await book.getByText('20 h').waitFor();
    const placed = proof.locator('.team-proof-members tr', { hasText: 'Philipp' });
    await placed.getByText('1.200', { exact: true }).waitFor();

    // Compact everything older than 14 days.
    const compact = a.locator('details.team-compact');
    await compact.locator('summary').click();
    await compact.getByRole('button', { name: 'Vorschau' }).click();
    const preview = compact.getByRole('list', { name: 'Vorschau' });
    await preview.getByText(/Messungen, ältere Zählungen/).waitFor();
    await compact.getByRole('button', { name: 'Jetzt verdichten' }).click();
    await compact.getByText(/Verdichtet: \d+ → \d+ Ereignisse/).waitFor();
    const summary = await compact.locator('summary').innerText();
    const count = Number(/([\d.]+) von/.exec(summary)[1].replace(/\./g, ''));
    assert.ok(count < 40, `log compacted to ${count} events`);
    assert.match(summary, /verdichtet bis/);
    // Same numbers after compacting.
    await book.locator('tr[data-yield="farm_e2e"]').getByText('300 cactus').waitFor();
    await placed.getByText('1.200', { exact: true }).waitFor();

    // Rückgängig brings the full log back.
    await compact.getByRole('button', { name: 'Rückgängig' }).click();
    await a.waitForFunction(() => { const m = /([\d.]+) von/.exec(document.querySelector('details.team-compact summary')?.textContent ?? ''); return !!m && Number(m[1].replace(/\./g, '')) > 200; });
    assert.deepEqual(errors, []);
    await context.close();
  });
}
