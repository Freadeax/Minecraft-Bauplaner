// LINK-13 (Block C, 07.11.2026): file ways only as emergency. On the Team and Bauen tabs, the world map and the game
// page no main way asks for a download or a file: team package, report code, server file, server link and
// recording file sit only in closed „Notfall“ sections, and the texts name „Team live“, „Mein Spiel verbinden“
// and „⟳ Baustand holen“ as the normal way (with or without a running game on this computer). Chromium on the built planner (npm run build), desktop and phone width.
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { openSampleProject, REFUSED } from './start.mjs';

const PORT = 4351, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

/** Words of the file ways (LINK-13): none of them may label a visible control outside an emergency section. */
const FILE_WAY = /Teampaket|Meldecode|Serverdatei|Server-Datei|Aufnahme-Datei|herunterladen|Datei (laden|wählen|öffnen|einlesen)|einfügen/i;

/** Visible buttons and links, with whether they sit inside a „Notfall“ section. */
const controls = p => p.evaluate(() => [...document.querySelectorAll('button, a[href], input[type=file], label')]
  .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; })
  .map(e => ({ text: (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' '), emergency: !!e.closest('details')?.querySelector(':scope > summary')?.textContent.trim().startsWith('Notfall') })));

/** Every emergency section on the page: summary text and whether it is open. */
const emergencies = p => p.evaluate(() => [...document.querySelectorAll('details')]
  .map(d => ({ summary: d.querySelector(':scope > summary')?.textContent.trim().replace(/\s+/g, ' ') ?? '', open: d.open }))
  .filter(d => d.summary.startsWith('Notfall')));

async function check(p, where, normal, { folded = false } = {}) {
  const found = await emergencies(p);
  for (const d of found) assert.equal(d.open, false, `${where}: „${d.summary}“ ist zugeklappt`);
  // The mod itself (its .jar, „Mod herunterladen“) is the installation, not a data file between planner, mod and server.
  const bad = (await controls(p)).filter(c => !c.emergency && FILE_WAY.test(c.text) && !/(\.jar|^Mod) herunterladen$/.test(c.text));
  assert.deepEqual(bad.map(c => c.text), [], `${where}: kein sichtbarer Dateiweg außerhalb von „Notfall“`);
  // folded: the normal way may also stand in a folded „Mehr wissen“ part (text, not a control).
  const text = folded ? await p.locator('body').textContent() : await p.locator('body').innerText();
  for (const n of normal) assert.ok(text.includes(n), `${where}: nennt „${n}“ als normalen Weg`);
  return found;
}

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) test(`LINK-13: Dateiwege nur als Notfall (${viewport.width} px)`, async () => {
  const context = await browser.newContext({ viewport, hasTouch: viewport.width < 500 });
  const p = await context.newPage();
  p.setDefaultTimeout(15_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  try {
    await p.goto(BASE);
    await openSampleProject(p);
    await p.getByText('✓ Geometrisch konfliktfrei').waitFor();
    const bar = p.getByRole('navigation', { name: 'Projektbereiche' });
    const seen = [];

    await bar.getByRole('link', { name: 'Team' }).click();
    await p.waitForURL(/\/team$/);
    // Before founding: the invitation link is the way, files only under „Notfall“.
    await p.getByRole('button', { name: 'Team gründen' }).waitFor();
    seen.push(...await check(p, 'Team (ohne Team)', ['Einladungslink']));
    await p.getByPlaceholder('Dein Name').fill('Philipp');
    await p.getByRole('button', { name: 'Team gründen' }).click();
    await p.locator('.team-me').getByText('Bauleitung', { exact: true }).waitFor();
    seen.push(...await check(p, 'Team', ['Team live']));
    // Opened, the emergency section holds the file ways (team package, report code).
    const exchange = p.locator('details', { has: p.locator('summary', { hasText: 'Notfall ohne Internet' }) });
    if (await exchange.count()) {
      await exchange.locator('summary').first().click();
      assert.match(await exchange.first().innerText(), /Teampaket|Meldecode|Datei/, 'Team: im Notfall stehen die Dateiwege');
    }

    await bar.getByRole('link', { name: 'Bauen' }).click();
    await p.waitForURL(/\/bauen$/);
    await p.getByText('Fortschritt · laut Spielaufnahme', { exact: false }).first().waitFor();
    seen.push(...await check(p, 'Bauen', ['Team live', 'Baustand']));

    await p.goto(`${BASE}#/mod`);
    await p.getByRole('heading', { name: "So geht's in drei Schritten" }).waitFor();
    seen.push(...await check(p, 'Spiel', ['Planer zulassen', 'Ins Spiel senden']));
    // „Mehr wissen“ open: the team way is „Team live“ → „Mein Spiel verbinden“, still without files.
    await p.getByText('Mehr wissen', { exact: true }).click();
    seen.push(...await check(p, 'Spiel (Mehr wissen)', ['Mein Spiel verbinden'], { folded: true }));

    await p.goto(`${BASE}#/karte`);
    await p.waitForTimeout(1500);
    seen.push(...await check(p, 'Weltkarte', []));

    assert.ok(seen.some(d => /Notfall ohne Internet/.test(d.summary)), `Notfall ohne Internet gefunden (${seen.map(d => d.summary)})`);
    assert.ok(seen.some(d => /Notfall: Aufnahme-Datei/.test(d.summary)), `Notfall: Aufnahme-Datei gefunden (${seen.map(d => d.summary)})`);
    assert.deepEqual(errors.filter(e => !REFUSED.test(e)), []);
  } finally { await context.close(); }
});
