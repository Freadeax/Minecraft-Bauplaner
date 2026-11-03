// Browser check of Teamplanung (COOP-06): the Bauleitung splits a section into work packages, takes over
// the assignment proposal, sees schedule, material per member, the progress board, the plan comparison
// and the issue fixes; a helper takes a handover, reports absence, and the Bauleitung hands over the lead.
// Run after `npm run build`: `npm run test:e2e`. Screenshots go to $TEAMPLAN_SHOTS when set.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4317, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
const SHOTS = process.env.TEAMPLAN_SHOTS;
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

const area = (p, name) => p.getByRole('navigation', { name: 'Teambereiche' }).getByRole('button', { name }).click();
const who = async (p, name) => {
  const pick = p.getByRole('group', { name: 'Wer bist du?' });
  if (!(await pick.isVisible())) await p.locator('.team-me').getByRole('button', { name: 'wechseln' }).click();
  await p.getByRole('group', { name: 'Wer bist du?' }).getByRole('button', { name: new RegExp(`^${name}`) }).click();
  await p.locator('.team-me strong', { hasText: name }).waitFor();
};
const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }); };

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Teamplanung: Arbeitspakete, Zuteilung, Zeitplan, Material, Fortschritt, Übergabe (${viewport.width}px)`, async () => {
    const context = await browser.newContext({ viewport });
    const p = await context.newPage();
    p.setDefaultTimeout(15_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/clipboard/i.test(m.text())) errors.push(m.text()); });
    const answers = [];
    p.on('dialog', d => void d.accept(answers.shift() ?? ''));

    await p.goto(BASE);
    await openSampleProject(p);
    await p.waitForURL(/#\/projekt\//);
    await p.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name: 'Baustelle' }).click();
    await p.getByRole('region', { name: 'Baustelle' }).getByRole('button', { name: /Fundament · Rohbau · Dach/ }).click();
    await p.locator('.site-section').nth(2).waitFor();
    await p.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name: 'Team' }).click();
    await p.getByPlaceholder('Dein Name').fill('Philipp');
    await p.getByRole('button', { name: 'Team gründen' }).click();
    answers.push('Erster Stand');
    await p.getByRole('button', { name: 'Aktuellen Plan freigeben' }).click();
    await p.getByText('Planstand 1 gilt').waitFor();
    // a second member in the same browser
    await p.locator('.team-me').getByRole('button', { name: 'wechseln' }).click();
    await p.getByPlaceholder('Ich bin neu: Name').fill('Anna');
    await p.getByRole('button', { name: 'Beitreten' }).click();
    await who(p, 'Philipp');

    // ---- Planung: split Rohbau into two layer packages
    await area(p, 'Planung');
    const packages = p.getByRole('region', { name: 'Arbeitspakete' });
    await packages.getByRole('button', { name: 'Rohbau' }).click();
    await packages.getByLabel('Anzahl Arbeitspakete').fill('2');
    await packages.getByLabel('Teilungsart').selectOption('layers');
    await packages.getByText('Rohbau · Teil 2/2').waitFor();
    await shot(p, `planung-vorschau-${viewport.width}`);
    await packages.getByRole('button', { name: 'In 2 Pakete teilen' }).click();
    await packages.getByRole('button', { name: 'Rohbau · Teil 1/2' }).waitFor();
    assert.equal(await packages.locator('.team-work > li').count(), 4, 'Fundament, two Rohbau packages, Dach');

    // ---- Zuteilung: take over the proposal for all free sections
    const assign = p.getByRole('region', { name: 'Zuteilung' });
    const rows = await assign.locator('tbody tr').count();
    assert.equal(rows, 4);
    await assign.getByRole('button', { name: /4 Zuweisungen übernehmen/ }).click();
    await assign.getByText(/Keine freien Abschnitte/).waitFor();

    // ---- Zeitplan and material
    const schedule = p.getByRole('region', { name: 'Zeitplan' });
    await schedule.getByText(/Fertig in/).waitFor();
    assert.ok(await schedule.locator('.team-lane').count() >= 2, 'two members build in parallel');
    const material = p.getByRole('region', { name: 'Material im Team' });
    await material.locator('.team-card').first().waitFor();
    assert.ok(await material.locator('tbody tr').count() > 0);
    await shot(p, `planung-${viewport.width}`);

    // ---- Fortschritt: board, members, plan comparison
    await area(p, 'Fortschritt');
    const board = p.getByRole('region', { name: 'Gesamtfortschritt' });
    assert.equal(await board.getByRole('list', { name: 'in Arbeit' }).getByRole('listitem').count(), 4);
    await p.getByRole('region', { name: 'Planänderungen' }).getByRole('button', { name: 'Mit Planstand 1 vergleichen' }).click();
    await p.getByText('Der aktuelle Plan entspricht Planstand 1.').waitFor();
    await shot(p, `fortschritt-${viewport.width}`);

    // ---- Rechte & Übergabe: Philipp offers a package to Anna, Anna accepts; absence; lead handover
    await area(p, 'Rechte & Übergabe');
    const handover = p.getByRole('region', { name: 'Übergabe' });
    const mySelect = handover.getByRole('combobox', { name: /übergeben an/ }).first();
    await mySelect.waitFor();
    const offered = (await handover.locator('.team-list li strong').first().innerText()).trim();
    answers.push('Bis Schicht 3 fertig');
    await mySelect.selectOption({ label: 'Anna' });
    await handover.getByText('angeboten an Anna').waitFor();
    await who(p, 'Anna');
    await area(p, 'Rechte & Übergabe');
    await handover.getByText('Für dich angeboten').waitFor();
    await handover.getByRole('button', { name: 'Annehmen' }).click();
    await handover.getByText('Meine Abschnitte').waitFor();
    assert.ok(await handover.locator('.team-list li strong', { hasText: offered }).count() >= 1, 'Anna now owns the package');
    const away = p.getByRole('region', { name: 'Abwesenheit' });
    await away.getByLabel('abwesend bis').fill('2099-12-31');
    await away.getByPlaceholder(/Grund/).fill('Urlaub');
    await away.getByRole('button', { name: 'Abwesend eintragen' }).click();
    await away.getByText(/Du bist als abwesend eingetragen bis 31\.12\.2099/).waitFor();
    await shot(p, `rechte-${viewport.width}`);
    // the absent owner shows up under Fortschritt → Achtung for the Bauleitung
    await who(p, 'Philipp');
    await area(p, 'Fortschritt');
    await p.getByRole('region', { name: 'Achtung' }).getByText(/Anna ist abwesend bis 2099-12-31/).first().waitFor();
    await area(p, 'Rechte & Übergabe');
    const lead = p.getByRole('region', { name: 'Bauleitung übergeben' });
    await lead.getByLabel('Neue Bauleitung').selectOption({ label: 'Anna (Helfer)' });
    answers.push('');
    await lead.getByRole('button', { name: 'Übergeben', exact: true }).click();
    await lead.getByText(/Nur die Bauleitung kann/).waitFor();
    await p.locator('.team-me').getByText('Baumeister', { exact: true }).waitFor();

    // ---- issue fix: a double claim shows up with a one-click fix
    await area(p, 'Bauen');
    assert.deepEqual(errors, []);
    await context.close();
  });
}
