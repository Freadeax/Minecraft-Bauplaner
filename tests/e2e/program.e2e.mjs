// Browser check of the planning tab (PROJ-01): milestones, dependencies with suggestions, builders, schedule, persistence, project card.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject, waitForStart } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4305, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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
  test(`Planung: Meilensteine, Abhängigkeiten, Bauleute, Zeitplan, dauerhaft (${viewport.width}px)`, async () => {
    const context = await browser.newContext({ viewport, acceptDownloads: true });
    const p = await context.newPage();
    p.setDefaultTimeout(10_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await p.goto(BASE);
    await openSampleProject(p);
    await p.waitForURL(/#\/projekt\//);
    const projectUrl = p.url().replace(/\/[a-z]+$/, '');
    const nav = p.getByRole('navigation', { name: 'Projektbereiche' });

    // Without sections the tab points to the site tab.
    await nav.getByRole('link', { name: 'Planung' }).click();
    const planning = p.getByRole('region', { name: 'Planung' });
    await planning.getByText(/baut auf Bauabschnitten auf/).waitFor();
    await planning.getByRole('link', { name: 'Baustelle' }).click();
    const site = p.getByRole('region', { name: 'Baustelle' });
    await site.getByRole('button', { name: /Fundament · Rohbau · Dach/ }).click();
    await site.locator('.site-section').nth(2).waitFor();

    // Planning: overview, single lane, suggestions from geometry (roof needs the shell, shell the foundation).
    await nav.getByRole('link', { name: 'Planung' }).click();
    await planning.locator('.prog-overview').waitFor();
    const gantt = planning.getByRole('region', { name: 'Zeitplan' });
    await gantt.locator('.prog-bar').nth(2).waitFor();
    assert.deepEqual(await gantt.locator('.prog-lane-label').allInnerTexts().then(t => t.filter(Boolean)), ['Bau-Reihenfolge']);
    const deps = planning.getByRole('region', { name: 'Abhängigkeiten' });
    await deps.getByText(/Vorschläge aus Geometrie/).waitFor();
    const suggested = await deps.locator('.prog-suggestions li').count();
    assert.ok(suggested >= 2, `${suggested} suggestions`);
    await deps.getByRole('button', { name: /Alle \d+ übernehmen/ }).click();
    await deps.locator('.prog-dep-list li').nth(suggested - 1).waitFor();
    await deps.getByText(/Vorschläge aus Geometrie/).waitFor({ state: 'detached' });
    assert.equal(await gantt.locator('.prog-bar.blocked').count(), suggested >= 2 ? 2 : 1, 'later sections wait');
    // A dependency that would close a cycle is refused with a readable message.
    await deps.getByLabel('Abschnitt, der wartet').selectOption({ label: 'Fundament' });
    await deps.getByLabel('Abschnitt, der vorher fertig sein muss').selectOption({ label: 'Dach und Abschluss' });
    await deps.getByRole('button', { name: '+ Abhängigkeit' }).click();
    await planning.getByRole('alert').getByText(/Kreis/).waitFor();
    await planning.getByRole('alert').getByRole('button', { name: 'OK' }).click();

    // Milestone with a date in the past → late; edit its sections.
    const ms = planning.getByRole('region', { name: 'Meilensteine' });
    await ms.getByLabel('Name des neuen Meilensteins').fill('Rohbau steht');
    await ms.getByLabel('Termin des neuen Meilensteins').fill('2024-01-01');
    await ms.getByRole('button', { name: '+ Meilenstein' }).click();
    const item = ms.locator('.prog-item').first();
    await item.getByText('keine Abschnitte').waitFor();
    await item.getByRole('button', { name: 'Bearbeiten' }).click();
    await item.getByRole('checkbox', { name: 'Fundament' }).check();
    await item.getByRole('checkbox', { name: 'Rohbau', exact: true }).check();
    await item.getByRole('button', { name: 'Übernehmen' }).click();
    await item.getByText('Fundament, Rohbau').waitFor();
    await item.locator('.badge.ms-late').waitFor();
    await planning.locator('.prog-overview').getByText('Rohbau steht').waitFor();

    // Builders: two lanes, assignment matrix, pace, sheet.
    const builders = planning.getByRole('region', { name: 'Bauleute' });
    await builders.getByLabel('Name der neuen Bauleute').fill('Anna');
    await builders.getByLabel('Blöcke je Bautag der neuen Bauleute').fill('100');
    await builders.getByRole('button', { name: '+ Bauleute' }).click();
    await builders.getByLabel('Name der neuen Bauleute').fill('Ben');
    await builders.getByRole('button', { name: '+ Bauleute' }).click();
    await builders.locator('.prog-builder').nth(1).waitFor();
    await builders.getByLabel('Fundament: Anna').check();
    await builders.getByLabel('Rohbau: Ben').check();
    await builders.getByLabel('Dach und Abschluss: Anna').check();
    await builders.getByLabel('Dach und Abschluss: Ben').check();
    await gantt.getByText('Anna', { exact: true }).waitFor();
    await gantt.getByText('Ben', { exact: true }).waitFor();
    await planning.getByText(/1 Abschnitt ist niemandem zugewiesen|Nicht zugewiesen/).waitFor({ state: 'detached' });
    await builders.locator('.prog-builder').first().getByText(/2 Abschnitte · \d+ Bautage/).waitFor();
    const clip = await p.evaluate(() => navigator.clipboard ? 'yes' : 'no');
    if (clip === 'yes') { await context.grantPermissions(['clipboard-read', 'clipboard-write']); }
    await builders.locator('.prog-builder').first().getByRole('button', { name: /Bauzettel/ }).click();
    const text = clip === 'yes' ? await p.evaluate(() => navigator.clipboard.readText()).catch(() => '') : '';
    if (text) assert.match(text, /Bauzettel für Anna/);

    // Settings: start date gives calendar dates; text download.
    const settings = planning.getByRole('region', { name: 'Einstellungen' });
    await settings.getByLabel('Startdatum').fill('2026-11-06');
    await settings.getByLabel('Bautage je Woche').selectOption('5');
    await planning.locator('.prog-overview').getByText(/bis \d\d\.\d\d\.2026/).waitFor();
    const [download] = await Promise.all([p.waitForEvent('download'), settings.getByRole('button', { name: 'Bauprogramm als Text' }).click()]);
    assert.match(download.suggestedFilename(), /^Bauprogramm_/);

    // Persistence and the project card chip.
    await p.waitForTimeout(400);
    await p.goto(`${projectUrl}/planung`);
    await p.reload();
    await p.getByRole('region', { name: 'Meilensteine' }).getByText('Rohbau steht').waitFor();
    assert.equal(await p.getByRole('region', { name: 'Abhängigkeiten' }).locator('.prog-dep-list li').count(), suggested);
    assert.equal(await p.getByLabel('Startdatum').inputValue(), '2026-11-06');
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no horizontal page scroll');
    await p.goto(BASE);
    await waitForStart(p);
    await p.locator('.project-card .milestone-chip').first().waitFor();
    assert.match(await p.locator('.project-card .milestone-chip').first().innerText(), /Rohbau steht/);
    assert.deepEqual(errors, []);
    await context.close();
  });
}
