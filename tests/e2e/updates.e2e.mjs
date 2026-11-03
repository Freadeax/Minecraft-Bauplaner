// Browser check of the project tab "Updates" (UPDATE-01): new version shown, consequences, take over, return, freeze, persistence.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4263, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

function watch(p) {
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  return errors;
}

/** Erases the block in the centre of the lowest layer of the opened workshop model. */
async function eraseCentre(p) {
  const canvas = p.locator('.layer-grid canvas');
  let g = null, last = '';
  for (let i = 0; i < 50 && !g; i++) {
    const now = await canvas.evaluate(c => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(() => {
      const b = c.getBoundingClientRect(); done({ x: b.x, y: b.y, w: b.width, h: b.height, size: Number(c.dataset.cellSize), centre: c.dataset.centre });
    }))));
    const key = JSON.stringify(now);
    if (key === last) g = now; else last = key;
  }
  const [cx, cz] = g.centre.split(',').map(Number);
  await p.getByRole('radio', { name: /Abbauen/ }).click();
  await p.mouse.click(g.x + g.w / 2 + (Math.floor(cx) + 0.5 - cx) * g.size, g.y + g.h / 2 + (Math.floor(cz) + 0.5 - cz) * g.size);
}

const row = (p, name) => p.locator(`.updates-table tr[data-instance="${name}"]`);

test('Updates: neue Version anzeigen, Folgen prüfen, übernehmen, zurückkehren, einfrieren, dauerhaft', async () => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await context.newPage();
  p.setDefaultTimeout(15_000);
  const errors = watch(p);
  await p.goto(BASE);
  await openSampleProject(p);
  await p.waitForURL(/#\/projekt\//);
  const projectUrl = p.url().replace(/(#\/projekt\/[^/]+).*$/, '$1');
  await p.getByRole('link', { name: 'Updates' }).click();
  await p.getByRole('heading', { name: 'Updates und Versionen' }).waitFor();
  assert.equal(await p.getByTestId('updates-available').innerText(), '0');
  assert.equal(await row(p, 'Mauer 1').getAttribute('data-status'), 'current');
  assert.equal(await p.locator('.update-head-chip').count(), 0, 'no chip without updates');

  // A new library version of the wall, made in the workshop.
  await p.goto(`${BASE}#/bibliothek/gebaeude/sample_wall`);
  await p.getByRole('link', { name: /Blöcke bearbeiten/ }).click();
  await p.waitForURL(/#\/werkstatt\/av_/);
  await eraseCentre(p);
  await p.getByRole('button', { name: 'Als Version 2.0 speichern' }).click();
  await p.locator('.notice.success', { hasText: 'Version 2.0' }).waitFor();

  // Project list and project head show it; nothing was switched.
  await p.goto(BASE);
  await p.locator('.update-card-chip', { hasText: '2 Updates' }).first().waitFor();
  await p.goto(`${projectUrl}/updates`);
  await p.locator('.update-head-chip', { hasText: '2 Updates verfügbar' }).waitFor();
  assert.equal(await p.getByTestId('updates-available').innerText(), '2');
  assert.equal(await row(p, 'Mauer 1').getAttribute('data-status'), 'available');
  assert.match(await row(p, 'Mauer 1').innerText(), /1\.0[\s\S]*neu: 2\.0/);
  assert.equal(await row(p, 'Turm West').getAttribute('data-status'), 'current');

  // Consequences before taking over.
  await row(p, 'Mauer 1').getByRole('button', { name: 'Folgen anzeigen' }).click();
  const plan = p.getByRole('region', { name: 'Folgen des Updates' });
  await plan.getByRole('heading', { name: 'Folgen vor dem Übernehmen' }).waitFor();
  assert.match(await plan.innerText(), /Mauer 1: 1\.0 → 2\.0/);
  assert.match(await plan.innerText(), /1 Zellen anders/);
  assert.match(await plan.locator('.plan-stats').innerText(), /Blöcke im Projekt[\s\S]*\(−?-?1\)/);
  await plan.locator('.diff-view').waitFor();
  await plan.getByRole('button', { name: /Update übernehmen/ }).click();
  await p.locator('.notice.success', { hasText: 'Mauer 1 steht jetzt auf 2.0' }).waitFor();
  assert.equal(await row(p, 'Mauer 1').getAttribute('data-status'), 'current');
  assert.equal(await p.getByTestId('updates-available').innerText(), '1');
  await p.locator('.updates-log li', { hasText: 'Update · Mauer 1: 1.0 → 2.0' }).waitFor();

  // Undo is one step, redo via taking over again is not needed: return through the log path instead.
  await p.getByRole('button', { name: 'Rückgängig', exact: true }).click();
  await p.waitForFunction(() => document.querySelector('.updates-table tr[data-instance="Mauer 1"]')?.getAttribute('data-status') === 'available');
  assert.equal(await p.locator('.updates-log li').count(), 0);
  await row(p, 'Mauer 1').getByRole('button', { name: 'Folgen anzeigen' }).click();
  await plan.getByRole('button', { name: /Update übernehmen/ }).click();
  await p.locator('.notice.success', { hasText: 'Mauer 1 steht jetzt auf 2.0' }).waitFor();
  await row(p, 'Mauer 1').getByRole('button', { name: 'Zurückkehren' }).click();
  await plan.getByText(/Zurückgekehrt/).first().waitFor();
  await plan.getByRole('button', { name: /Update übernehmen/ }).click();
  await p.locator('.updates-log li', { hasText: 'Zurückgekehrt · Mauer 1: 2.0 → 1.0' }).waitFor();
  assert.equal(await row(p, 'Mauer 1').getAttribute('data-status'), 'available');

  // Freeze Mauer 2 with a note: no update offered, kept after reload.
  await p.getByLabel('Notiz zum Einfrieren').fill('so gebaut');
  await row(p, 'Mauer 2').getByRole('button', { name: 'Einfrieren' }).click();
  await p.waitForFunction(() => document.querySelector('.updates-table tr[data-instance="Mauer 2"]')?.getAttribute('data-status') === 'frozen');
  assert.match(await row(p, 'Mauer 2').innerText(), /so gebaut[\s\S]*neuer: 2\.0/);
  assert.equal(await row(p, 'Mauer 2').getByRole('checkbox').isDisabled(), true);
  await p.locator('.save-state.saved').waitFor();
  await p.reload();
  await p.getByRole('heading', { name: 'Updates und Versionen' }).waitFor();
  assert.equal(await row(p, 'Mauer 2').getAttribute('data-status'), 'frozen');
  assert.equal(await p.locator('.updates-log li').count(), 2);

  // Several at once via selection.
  await p.getByRole('button', { name: 'Alle mit Update wählen' }).click();
  await p.getByRole('button', { name: 'Folgen für 1 anzeigen' }).click();
  await plan.getByRole('button', { name: 'Update übernehmen (1)' }).click();
  await p.locator('.notice.success').waitFor();
  assert.equal(await p.getByTestId('updates-available').innerText(), '0');
  assert.deepEqual(errors, []);
  await context.close();
});

test('Updates: Reiter auf dem Telefon ohne waagerechtes Scrollen', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await context.newPage();
  p.setDefaultTimeout(15_000);
  const errors = watch(p);
  await p.goto(BASE);
  await openSampleProject(p);
  await p.waitForURL(/#\/projekt\//);
  await p.goto(`${p.url().replace(/(#\/projekt\/[^/]+).*$/, '$1')}/updates`);
  await p.getByRole('heading', { name: 'Updates und Versionen' }).waitFor();
  await row(p, 'Mauer 1').getByRole('button', { name: 'Einfrieren' }).click();
  await p.waitForFunction(() => document.querySelector('.updates-table tr[data-instance="Mauer 1"]')?.getAttribute('data-status') === 'frozen');
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `page scrolls sideways by ${overflow}px`);
  assert.deepEqual(errors, []);
  await context.close();
});
