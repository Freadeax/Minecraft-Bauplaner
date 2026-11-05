// Browser check of PROJ-03: absences of a builder move the schedule; a second baseline keeps the first one for comparison.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4345, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

const day = n => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const de = iso => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Planung: Abwesenheiten und frühere Basispläne (${viewport.width}px)`, async () => {
    const context = await browser.newContext({ viewport });
    const p = await context.newPage();
    p.setDefaultTimeout(10_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await p.goto(BASE);
    await openSampleProject(p);
    await p.waitForURL(/#\/projekt\//);
    const nav = p.getByRole('navigation', { name: 'Projektbereiche' });
    await nav.getByRole('link', { name: 'Baustelle' }).click();
    const site = p.getByRole('region', { name: 'Baustelle' });
    await site.getByRole('button', { name: /Fundament · Rohbau · Dach/ }).click();
    await site.locator('.site-section').nth(2).waitFor();

    await nav.getByRole('link', { name: 'Planung' }).click();
    const planning = p.getByRole('region', { name: 'Planung' });
    const settings = planning.getByRole('region', { name: 'Einstellungen' });
    const start = day(2);
    await settings.getByLabel('Startdatum').fill(start);
    // Anna builds everything, slowly.
    const builders = planning.getByRole('region', { name: 'Bauleute' });
    await builders.getByLabel('Name der neuen Bauleute').fill('Anna');
    await builders.getByLabel('Blöcke je Bautag der neuen Bauleute').fill('16');
    await builders.getByRole('button', { name: '+ Bauleute' }).click();
    const matrix = planning.getByRole('table', { name: 'Zuweisung' });
    for (const box of await matrix.getByRole('checkbox').all()) await box.check();
    const first = matrix.locator('tbody tr').first();
    await first.getByText(de(start)).waitFor();

    // First baseline with a name.
    await settings.getByLabel('Name des neuen Basisplans').fill('Erster Plan');
    await settings.getByRole('button', { name: 'Basisplan festhalten' }).click();
    await planning.locator('.prog-slip-kpi').getByText(/„ERSTER PLAN“/).waitFor();

    // Anna is away for the first three days: the first section starts three days later.
    const away = builders.getByRole('group', { name: 'Abwesenheiten von Anna' });
    await away.getByLabel('Abwesend von (Anna)').fill(start);
    await away.getByLabel('Abwesend bis (Anna)').fill(day(4));
    await away.getByLabel('Grund der Abwesenheit von Anna').fill('Klausuren');
    await away.getByRole('button', { name: '+ Abwesend' }).click();
    await away.getByText(`abwesend ${de(start)} – ${de(day(4))} · Klausuren`).waitFor();
    await first.getByText(de(day(5))).waitFor();
    await first.getByText(/davon 3 Bautage abwesend/).waitFor();
    await planning.locator('.prog-slip-kpi').getByText('+3 Bautage').waitFor();

    // Second baseline keeps the first for comparison.
    await settings.getByLabel('Name des neuen Basisplans').fill('Nach den Klausuren');
    await settings.getByRole('button', { name: 'Neuen Basisplan festhalten' }).click();
    await planning.locator('.prog-slip-kpi').getByText('± 0').waitFor();
    const older = settings.getByRole('table', { name: 'Frühere Basispläne' });
    await older.getByText(/„Erster Plan“/).waitFor();
    await older.getByText('+3 Bautage').waitFor();
    await older.getByRole('button', { name: 'Vergleichen' }).click();
    await planning.locator('.prog-slip-kpi').getByText(/„ERSTER PLAN“/).waitFor();
    await settings.getByRole('table', { name: 'Frühere Basispläne' }).getByText(/„Nach den Klausuren“/).waitFor();

    // Persistence over a reload.
    await p.waitForTimeout(400);
    await p.reload();
    await p.getByRole('group', { name: 'Abwesenheiten von Anna' }).getByText(/Klausuren/).waitFor();
    await p.getByRole('table', { name: 'Frühere Basispläne' }).waitFor();
    // Removing the absence brings the old dates back.
    await p.getByRole('button', { name: `Abwesenheit ${de(start)} von Anna entfernen` }).click();
    await p.getByRole('table', { name: 'Zuweisung' }).locator('tbody tr').first().getByText(de(start)).waitFor();
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no horizontal page scroll');
    assert.deepEqual(errors, []);
    await context.close();
  });
}
