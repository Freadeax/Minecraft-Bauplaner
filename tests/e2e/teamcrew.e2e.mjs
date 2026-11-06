// Browser check of TEAM-03: a Baumeister puts several players on one section (Mitbauer), a Mitbauer sees it
// under „Meine Aufgaben“ and leaves again, a gather order is split over two players, and a booked
// contribution is corrected and cancelled with versions instead of being overwritten.
// Run after `npm run build`: `npm run test:e2e`. Screenshots go to $TEAMCREW_SHOTS when set.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4383, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
const SHOTS = process.env.TEAMCREW_SHOTS;
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

const who = async (p, name) => {
  const pick = p.getByRole('group', { name: 'Wer bist du?' });
  if (!(await pick.isVisible())) await p.locator('.team-me').getByRole('button', { name: 'wechseln' }).click();
  await p.getByRole('group', { name: 'Wer bist du?' }).getByRole('button', { name: new RegExp(`^${name}`) }).click();
  await p.locator('.team-me strong', { hasText: name }).waitFor();
};
const join = async (p, name) => {
  await p.locator('.team-me').getByRole('button', { name: 'wechseln' }).click();
  await p.getByPlaceholder('Ich bin neu: Name').fill(name);
  await p.getByRole('button', { name: 'Beitreten' }).click();
  await p.locator('.team-me strong', { hasText: name }).waitFor();
};
const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }); };

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Team: Mitbauer, verteilte Sammelaufträge, versionierte Buchungen (${viewport.width}px)`, async () => {
    const context = await browser.newContext({ viewport });
    const p = await context.newPage();
    p.setDefaultTimeout(15_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/clipboard/i.test(m.text())) errors.push(m.text()); });
    const answers = [];
    p.on('dialog', d => void (d.type() === 'confirm' ? d.accept() : d.accept(answers.shift() ?? '')));

    await p.goto(BASE);
    await openSampleProject(p);
    await p.waitForURL(/#\/projekt\//);
    await p.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name: 'Baustelle' }).click();
    await p.getByRole('region', { name: 'Baustelle' }).getByRole('button', { name: /Fundament · Rohbau · Dach/ }).click();
    await p.locator('.site-section').nth(2).waitFor();
    await p.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name: 'Team' }).click();
    await p.getByPlaceholder('Dein Name').fill('Philipp');
    await p.getByRole('button', { name: 'Team gründen' }).click();
    await join(p, 'Anna');
    await join(p, 'Ben');
    await who(p, 'Philipp');

    // ---- Bauleitung legt die Mannschaft für das Fundament fest: Anna verantwortlich, Ben baut mit
    const sections = p.getByRole('region', { name: 'Abschnitte' });
    const fund = sections.locator('.team-sections > li').first();
    await fund.getByRole('button', { name: 'Mitbauer …' }).click();
    const editor = fund.getByRole('group', { name: /Mitbauer für/ });
    await editor.getByLabel('Anna').check();
    await editor.getByLabel('Ben').check();
    await editor.getByText('Anna (verantwortlich)').waitFor();
    await shot(p, `mitbauer-auswahl-${viewport.width}`);
    await editor.getByRole('button', { name: 'Speichern' }).click();
    await fund.locator('.team-owner', { hasText: 'Anna' }).waitFor();
    await fund.getByLabel('Mitbauer').filter({ hasText: 'Ben' }).waitFor();
    await fund.getByRole('button', { name: /Verlauf · V1/ }).waitFor();

    // ---- Ben sieht den Abschnitt unter „Meine Aufgaben“, Philipp baut am Dach mit
    await who(p, 'Ben');
    const mine = p.getByRole('region', { name: 'Meine Aufgaben' });
    await mine.getByText('Mitbauer · verantwortlich Anna').waitFor();
    await shot(p, `mitbauer-meine-${viewport.width}`);
    await mine.getByRole('button', { name: 'Aussteigen' }).click();
    await mine.getByText(/Gerade nichts/).waitFor();
    await assert.rejects(fund.getByLabel('Mitbauer').waitFor({ timeout: 500 }));
    await fund.getByRole('button', { name: 'Mitbauen' }).click();
    await fund.getByLabel('Mitbauer').filter({ hasText: 'Ben' }).waitFor();

    // ---- Sammelauftrag auf zwei verteilen
    await who(p, 'Philipp');
    const gather = p.getByRole('region', { name: 'Beiträge und Sammeln' });
    await gather.getByText('Sammelauftrag auf mehrere verteilen').click();
    await gather.getByLabel('Item zum Verteilen').fill('oak_log');
    await gather.getByLabel('Gesamtmenge').fill('101');
    await gather.locator('.team-split').getByLabel('Anna', { exact: true }).check();
    await gather.locator('.team-split').getByLabel('Ben', { exact: true }).check();
    assert.equal(await gather.getByLabel('Anteil Anna').inputValue(), '51');
    await gather.getByLabel('Anteil Ben').fill('60');
    await gather.getByRole('button', { name: 'An 2 verteilen' }).click();
    await gather.getByText('Anna 51 · Ben 60 · verteilt von Philipp').waitFor();
    await who(p, 'Anna');
    await mine.getByText('von Philipp zugeteilt').waitFor();

    // ---- Buchung: melden, korrigieren (Version 2), stornieren (Version 3)
    await gather.getByLabel('Geliefert: Item').fill('stone');
    await gather.getByLabel('Menge').fill('64');
    await gather.getByRole('button', { name: 'Beitrag melden' }).click();
    const bookings = gather.locator('.team-bookings');
    await bookings.getByText('V1').waitFor();
    answers.push('32 stone', 'verzählt');
    await bookings.getByRole('button', { name: 'Korrigieren' }).click();
    await bookings.getByText(/V2 korrigiert: verzählt/).waitFor();
    await bookings.getByText(/stone 32/).waitFor();
    await shot(p, `buchung-version-${viewport.width}`);
    await bookings.getByRole('button', { name: 'Stornieren' }).click();
    await bookings.getByText('storniert', { exact: true }).waitFor();
    await assert.rejects(gather.getByText('Gemeldete Lieferungen').waitFor({ timeout: 500 }));

    // ---- Rechte: der Helfer sieht keine Mitbauer-Auswahl
    assert.equal(await sections.getByRole('button', { name: 'Mitbauer …' }).count(), 0);
    assert.deepEqual(errors, []);
    await context.close();
  });
}
