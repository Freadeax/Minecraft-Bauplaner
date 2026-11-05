// Browser check of PROJ-04: a project starts after another one; the start date is checked against the
// predecessor's baseline, a cycle is refused, and the world map names the order.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4353, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

/** Opens a fresh sample project with three sections and returns its id. */
async function sample(p) {
  await p.goto(BASE);
  await openSampleProject(p);
  await p.waitForURL(/#\/projekt\//);
  const id = /#\/projekt\/([^/]+)/.exec(p.url())[1];
  const nav = p.getByRole('navigation', { name: 'Projektbereiche' });
  await nav.getByRole('link', { name: 'Baustelle' }).click();
  const site = p.getByRole('region', { name: 'Baustelle' });
  await site.getByRole('button', { name: /Fundament · Rohbau · Dach/ }).click();
  await site.locator('.site-section').nth(2).waitFor();
  await nav.getByRole('link', { name: 'Planung' }).click();
  return id;
}

test('Reihenfolge zwischen Projekten: erst nach, Start prüfen, Kreis abweisen, Weltkarte', async () => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await context.newPage();
  p.setDefaultTimeout(15_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });

  // Project A: start in two days, baseline fixed.
  const a = await sample(p);
  let planning = p.getByRole('region', { name: 'Planung' });
  await planning.getByRole('region', { name: 'Einstellungen' }).getByLabel('Startdatum').fill(day(2));
  await planning.getByRole('button', { name: 'Basisplan festhalten' }).click();
  await planning.locator('.prog-slip-kpi').waitFor();
  const endA = await planning.locator('.prog-slip-kpi small').innerText();
  const end = /Ende geplant (\d\d)\.(\d\d)\.(\d{4})/.exec(endA);
  const endIso = `${end[3]}-${end[2]}-${end[1]}`;
  const next = new Date(Date.parse(endIso) + 86_400_000).toISOString().slice(0, 10);

  // Project B: starts tomorrow, then „erst nach“ A → too early, one click fixes it.
  const b = await sample(p);
  planning = p.getByRole('region', { name: 'Planung' });
  await planning.getByRole('region', { name: 'Einstellungen' }).getByLabel('Startdatum').fill(day(1));
  const order = planning.getByRole('region', { name: 'Reihenfolge der Projekte' });
  await order.getByText('Wartet auf kein anderes Projekt.').waitFor();
  const pick = order.getByLabel('Projekt, das vorher fertig sein muss');
  await pick.selectOption(a);
  await order.getByLabel('Grund für die Reihenfolge').fill('Material aus dem Lager');
  await order.getByRole('button', { name: '+ Erst nach' }).click();
  await order.getByText(`fertig bis ${de(endIso)}`).waitFor();
  await order.getByText('Material aus dem Lager').waitFor();
  await order.getByRole('alert').getByText(`Frühester Start: ${de(next)}`).waitFor();
  await order.getByRole('button', { name: `Start auf ${de(next)} setzen` }).click();
  await order.getByRole('alert').waitFor({ state: 'detached' });
  assert.equal(await planning.getByRole('region', { name: 'Einstellungen' }).getByLabel('Startdatum').inputValue(), next);

  // In A, B cannot come first: that would be a cycle.
  await p.goto(`${BASE}#/projekt/${a}/planung`);
  const orderA = p.getByRole('region', { name: 'Reihenfolge der Projekte' });
  await orderA.getByText(/Danach kommen:/).waitFor();
  await orderA.getByLabel('Projekt, das vorher fertig sein muss').selectOption(b);
  await orderA.getByRole('alert').getByText(/Das ergäbe einen Kreis/).waitFor();
  assert.equal(await orderA.getByRole('button', { name: '+ Erst nach' }).isDisabled(), true);

  // World map: both placed; B's details name the order.
  await p.goto(`${BASE}#/karte`);
  await p.locator('.map-page[data-map-state=ready]').waitFor({ timeout: 20_000 });
  for (let i = 0; i < 2; i++) {
    await p.getByRole('button', { name: 'Platzieren' }).first().click();
    await p.getByRole('status').filter({ hasText: 'Auf die Weltkarte gesetzt' }).waitFor();
    await p.locator('.map-page[data-map-state=ready]').waitFor({ timeout: 20_000 });
  }
  const entries = p.locator('.map-entry-main');
  await entries.nth(1).waitFor();
  for (let i = 0; i < 2; i++) {
    await entries.nth(i).click();
    if (await p.locator('.map-order').getByText(/Erst nach/).count()) break;
  }
  await p.locator('.map-order').getByText(/Erst nach .* \(bis /).waitFor();

  // Undo of the order (in B's Planung) removes it again.
  await p.goto(`${BASE}#/projekt/${b}/planung`);
  await p.getByRole('region', { name: 'Reihenfolge der Projekte' }).getByRole('button', { name: /^Erst nach .* entfernen$/ }).click();
  await p.getByRole('region', { name: 'Reihenfolge der Projekte' }).getByText('Wartet auf kein anderes Projekt.').waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});
