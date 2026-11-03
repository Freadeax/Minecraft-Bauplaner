// Browser check of Teambau (COOP-01): two separate browsers (Bauleitung and Helfer) found a team, exchange
// a team package with plan, a report code and a team-only package, take sections, report, confirm, write notes,
// and see a double claim as a visible conflict. Run after `npm run build`: `npm run test:e2e`.
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
const PORT = 4311, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

async function page(viewport) {
  const context = await browser.newContext({ viewport, acceptDownloads: true });
  const p = await context.newPage();
  p.setDefaultTimeout(15_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/clipboard/i.test(m.text())) errors.push(m.text()); });
  // Prompts (fertig melden, Freigabe, Nacharbeit) are answered with the text queued here.
  const answers = [];
  p.on('dialog', d => void d.accept(answers.shift() ?? ''));
  return { p, errors, answers, context };
}
const teamTab = p => p.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name: 'Team' }).click();
const section = (p, name) => p.getByRole('region', { name: 'Abschnitte' }).locator('.team-sections > li').filter({ has: p.locator('strong', { hasText: new RegExp(`^${name}`) }) });
const shownText = async p => p.locator('.team-shown textarea').inputValue();

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Teambau: zwei Browser, Teampaket, Meldecode, Bestätigen, Doppelübernahme (${viewport.width}px)`, async () => {
    const A = await page(viewport), B = await page(viewport);
    const a = A.p, b = B.p;

    // ---- Bauleitung: project with three sections, found the team, release the plan.
    await a.goto(BASE);
    await openSampleProject(a);
    await a.waitForURL(/#\/projekt\//);
    await a.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name: 'Baustelle' }).click();
    await a.getByRole('region', { name: 'Baustelle' }).getByRole('button', { name: /Fundament · Rohbau · Dach/ }).click();
    await a.locator('.site-section').nth(2).waitFor();
    await teamTab(a);
    await a.getByPlaceholder('Dein Name').fill('Philipp');
    await a.getByLabel(/Minecraft-Name/).fill('Freadeax');
    await a.getByRole('button', { name: 'Team gründen' }).click();
    await a.getByText('Noch kein Planstand freigegeben').waitFor();
    A.answers.push('Erster Stand');
    await a.getByRole('button', { name: 'Aktuellen Plan freigeben' }).click();
    await a.getByText('Planstand 1 gilt').waitFor();
    await section(a, 'Dach').getByRole('button', { name: 'Übernehmen' }).click();
    await section(a, 'Dach').getByText('in Arbeit').waitFor();
    const [pkgDownload] = await Promise.all([a.waitForEvent('download'), a.getByRole('button', { name: 'Teampaket mit Plan' }).click()]);
    assert.match(pkgDownload.suggestedFilename(), /\.bauteam\.json$/);
    const pkgPath = await pkgDownload.path();

    // ---- Helfer in another browser: open the package, join, take a section, report, contribute, note.
    await b.goto(BASE);
    await b.getByLabel('Teampaket wählen').setInputFiles(pkgPath);
    await b.waitForURL(/\/team$/);
    await b.getByRole('group', { name: 'Wer bist du?' }).waitFor();
    await b.getByText('Planstand 1 gilt').waitFor();
    await b.getByPlaceholder('Ich bin neu: Name').fill('Anna');
    await b.getByPlaceholder('Minecraft-Name').first().fill('Anna_MC');
    await b.getByRole('button', { name: 'Beitreten' }).click();
    await b.getByText(/Helfer darf freie Abschnitte übernehmen/).waitFor();
    assert.equal(await section(b, 'Dach').locator('.team-owner').innerText(), 'Philipp', 'Abschnitt der Bauleitung kam mit dem Paket');
    await section(b, 'Fundament').getByRole('button', { name: 'Übernehmen' }).click();
    await section(b, 'Rohbau').getByRole('button', { name: 'Übernehmen' }).click();
    B.answers.push('Fundament steht');
    await b.getByRole('region', { name: 'Meine Aufgaben' }).locator('li', { hasText: 'Fundament' }).getByRole('button', { name: 'Fertig melden' }).click();
    await section(b, 'Fundament').getByText('fertig gemeldet').waitFor();
    const contrib = b.getByRole('region', { name: 'Beiträge und Sammeln' });
    await contrib.getByLabel('Gebaute Blöcke').fill('320');
    await contrib.getByLabel('Geliefert: Item').fill('stone');
    await contrib.getByLabel('Menge').first().fill('128');
    await contrib.getByRole('button', { name: 'Beitrag melden' }).click();
    await contrib.getByText('128 × stone').waitFor();
    const notes = b.getByRole('region', { name: 'Notizen am Bau' });
    await notes.getByPlaceholder(/Notiz/).fill('Wie breit wird das Tor, @Philipp?');
    await notes.getByRole('button', { name: 'Schreiben' }).click();
    await notes.getByText('Wie breit wird das Tor').waitFor();
    await b.getByRole('button', { name: 'Meldecode kopieren' }).click();
    const code = await shownText(b);
    assert.match(code, /^BPT1:[A-Za-z0-9]+:[A-Za-z0-9_-]+:[a-f0-9]{8}$/);

    // ---- Bauleitung, meanwhile offline: also takes "Rohbau" (later than Anna) → conflict after reading the code.
    await section(a, 'Rohbau').getByRole('button', { name: 'Übernehmen' }).click();
    await section(a, 'Rohbau').locator('.team-owner', { hasText: 'Philipp' }).waitFor();
    await a.getByLabel('Meldecode').fill(code);
    await a.getByRole('button', { name: 'Prüfen' }).click();
    const preview = a.getByRole('region', { name: 'Vorschau Einlesen' });
    await preview.getByText(/neue Ereignisse/).waitFor();
    await preview.getByText(/Philipp wollte „Rohbau“ übernehmen, der Abschnitt war schon an Anna vergeben/).waitFor();
    await preview.getByRole('button', { name: 'Übernehmen' }).click();
    await section(a, 'Rohbau').locator('.team-owner', { hasText: 'Anna' }).waitFor();
    await section(a, 'Fundament').getByText('fertig gemeldet').waitFor();
    await a.getByRole('region', { name: 'Mitglieder' }).getByText('Anna_MC').waitFor();
    await a.getByRole('region', { name: 'Meine Aufgaben' }).getByText(/für dich/).waitFor(); // @Philipp mention
    await a.locator('.team-issues summary').getByText(/1 Hinweis/).waitFor();
    // Confirm, make Anna Baumeister; survives a reload.
    await section(a, 'Fundament').getByRole('button', { name: '✓ Bestätigen' }).click();
    await section(a, 'Fundament').getByText('bestätigt').waitFor();
    await a.getByRole('region', { name: 'Mitglieder' }).getByLabel('Rolle von Anna').selectOption('meister');
    await a.waitForTimeout(400);
    await a.reload();
    await section(a, 'Fundament').getByText('bestätigt').waitFor();
    const [onlyTeam] = await Promise.all([a.waitForEvent('download'), a.getByRole('button', { name: 'Teampaket nur Teamstand' }).click()]);

    // ---- COOP-04: the server plugin's export brings Baunachweis and storage chests (built here like the plugin writes it).
    const pkg = await readTeamPackage(readFileSync(await onlyTeam.path(), 'utf8'));
    const anna = pkg.team.events.find(e => e.kind === 'member.join' && e.name === 'Anna').member;
    const fundament = pkg.team.events.find(e => e.kind === 'section.done').section;
    const server = (by, body, at) => teamEvent(by, body, at, 'server');
    const later = n => new Date(Date.parse(pkg.team.events.at(-1).at) + n * 1000).toISOString();
    const items = list => list.map(([item, count]) => ({ item: `minecraft:${item}`, count }));
    const exportFile = join(mkdtempSync(join(tmpdir(), 'team-')), 'Burg-server.export.json');
    writeFileSync(exportFile, JSON.stringify({
      format: TEAM_SERVER_FORMAT, formatVersion: 1, teamId: pkg.team.teamId, name: pkg.team.name, projectName: 'Burgmauer', founder: pkg.team.founder, createdAt: pkg.team.createdAt,
      dimension: 'minecraft:overworld', sections: [], members: [], exportedAt: later(10),
      events: [...pkg.team.events,
        server(anna, { kind: 'build.tally', section: fundament, placed: 120, broken: 4, blocks: items([['cobblestone', 120]]), from: later(1), until: later(2) }, later(2)),
        server(pkg.team.founder, { kind: 'build.tally', section: fundament, placed: 40, broken: 0, from: later(1), until: later(2) }, later(3)),
        server(pkg.team.founder, { kind: 'store.chest', chest: 'lager_e2e', name: 'Hauptlager', pos: [10, 64, 20], dimension: 'minecraft:overworld' }, later(4)),
        server(pkg.team.founder, { kind: 'store.count', chest: 'lager_e2e', items: items([['stone', 64]]) }, later(5)),
        server(anna, { kind: 'store.count', chest: 'lager_e2e', items: items([['stone', 64], ['oak_log', 32]]) }, later(6)),
      ],
    }));
    await a.locator('.team-exchange input[type=file]').setInputFiles(exportFile);
    const pa = a.getByRole('region', { name: 'Vorschau Einlesen' });
    await pa.getByText(/neue Ereignisse/).waitFor();
    await pa.getByRole('button', { name: 'Übernehmen' }).click();
    const proof = a.getByRole('region', { name: 'Baunachweis und Lager' });
    const annaRow = proof.locator('.team-proof-members tr', { hasText: 'Anna' });
    await annaRow.getByText('120', { exact: true }).waitFor();
    await annaRow.getByText('32 oak_log').waitFor();
    await proof.getByLabel('Anteile an Fundament').getByText('Anna 75 %').waitFor();
    await proof.getByText('Hauptlager').waitFor();
    await proof.getByLabel('Lagerbestand').getByText('32 × oak_log').waitFor();
    await proof.getByRole('button', { name: 'Bestand ins Baustellen-Lager übernehmen' }).click();
    await proof.getByRole('button', { name: 'Baustellen-Lager entspricht dem Bestand' }).waitFor();
    await proof.getByRole('button', { name: 'Meinen Baunachweis abschalten' }).click();
    await proof.locator('.team-proof-members tr', { hasText: 'Philipp' }).getByText('Nachweis aus').waitFor();
    await proof.getByRole('button', { name: 'Meinen Baunachweis einschalten' }).click();
    await proof.locator('.team-proof-members tr', { hasText: 'Philipp' }).getByText('40', { exact: true }).waitFor();

    // ---- Helfer reads the team-only package: confirmation and new role arrive, nothing of her own is lost.
    await b.getByRole('button', { name: 'Datei wählen …' }).click({ trial: true });
    await b.locator('.team-exchange input[type=file]').setInputFiles(await onlyTeam.path());
    const pb = b.getByRole('region', { name: 'Vorschau Einlesen' });
    await pb.getByText(/neue Ereignisse/).waitFor();
    await pb.getByRole('button', { name: 'Übernehmen' }).click();
    await section(b, 'Fundament').getByText('bestätigt').waitFor();
    await b.getByText(/Baumeister darf Abschnitte zuweisen/).waitFor();
    await b.getByRole('region', { name: 'Notizen am Bau' }).getByText('Wie breit wird das Tor').waitFor();
    // Undo of an import is one step.
    await b.keyboard.press('Control+z');

    for (const p of [a, b]) {
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 1, `kein waagerechtes Scrollen (${overflow}px)`);
    }
    assert.deepEqual(A.errors, []);
    assert.deepEqual(B.errors, []);
    await A.context.close(); await B.context.close();
  });
}
