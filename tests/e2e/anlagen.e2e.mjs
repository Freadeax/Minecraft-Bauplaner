// BUILD-05 in a real browser: Bauwelt → Anlage planner, nothing placed by browsing, conflict preview
// with explicit confirmation, adoption as new project with build sections, insertion into an existing project.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = 4251, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
let server, browser;

before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.kill(); });

const readStore = (p, store) => p.evaluate(store => new Promise((resolve, reject) => {
  const r = indexedDB.open('minecraft-bauplaner');
  r.onsuccess = () => { const db = r.result, q = db.transaction(store).objectStore(store).getAll(); q.onsuccess = () => { db.close(); resolve(q.result); }; q.onerror = () => reject(q.error); };
  r.onerror = () => reject(r.error);
}), store);
const conflicts = p => p.getByTestId('anlage-conflicts');

test('Anlage: von der Bauwelt zum Planer, Konfliktvorschau mit Bestätigung, Übernahme mit Bauabschnitten', async () => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await context.newPage();
  p.setDefaultTimeout(20_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  // Bauwelten link to their Anlage; browsing there stores nothing.
  await p.goto(`${BASE}#/bibliothek/bauwelten`);
  await p.locator('#bauwelt-landleben').getByRole('link', { name: /Als Anlage planen: Dorf mit Hof/ }).click();
  await p.getByRole('heading', { name: 'Dorf mit Hof' }).waitFor();
  assert.match(p.url(), /#\/bibliothek\/anlagen\/anl_landleben$/);
  await assert.doesNotReject(conflicts(p).getByText('keine').waitFor());
  const before = (await readStore(p, 'projects')).length;
  assert.match(await p.locator('.anlage-checks').innerText(), /Keine Voxelkonflikte[\s\S]*Grundflächen getrennt[\s\S]*Anschlüsse verbunden/);
  assert.equal(await p.locator('.anlage-plan rect').count() > 30, true, 'Lageplan zeigt alle Grundflächen');

  // Shift the craftsmen row onto the village houses: real voxel conflicts, adoption needs confirmation.
  const hand = p.locator('[data-district=handwerk]');
  for (let i = 0; i < 12; i++) await hand.getByRole('button', { name: 'Handwerkerzeile nach Westen' }).click();
  await conflicts(p).locator('.warn-text').waitFor();
  const n = Number(await conflicts(p).innerText());
  assert.ok(n > 0, 'Konflikte nach Verschieben');
  const adopt = p.getByRole('button', { name: 'Als Projekt anlegen' });
  assert.equal(await adopt.isDisabled(), true, 'ohne Bestätigung gesperrt');
  await hand.getByRole('button', { name: 'zurücksetzen' }).click();
  await conflicts(p).getByText('keine').waitFor();
  assert.equal(await adopt.isDisabled(), false);
  assert.equal((await readStore(p, 'projects')).length, before, 'Vorschau und Verschieben speichern nichts');

  // Leave one district out, swap one house variant, then adopt explicitly.
  await p.locator('[data-district=tiere]').getByRole('checkbox').uncheck();
  await p.locator('[data-district=dorf]').getByRole('combobox').first().selectOption({ index: 1 });
  await p.locator('[data-district=dorf]').getByText('getauscht').waitFor();
  await p.getByLabel('Projektname').fill('Mein Dorf');
  await adopt.click();
  await p.waitForURL(/#\/projekt\//);
  const projects = await readStore(p, 'projects');
  const created = projects.find(x => x.name === 'Mein Dorf');
  assert.ok(created);
  assert.deepEqual(created.site.sections.map(s => s.name), ['Dorf mit Hof: Hauptweg', 'Bauernhof', 'Dorfhäuser', 'Handwerkerzeile']);
  assert.ok(created.links.length > 0, 'Wegmodule verbunden');

  // Insert a second Anlage into the same project beside the existing buildings.
  await p.goto(`${BASE}#/bibliothek/anlagen/anl_endposten`);
  await p.getByRole('heading', { name: 'End-Außenposten' }).waitFor();
  await p.getByLabel('Ziel').selectOption({ label: 'In „Mein Dorf“ einfügen' });
  await conflicts(p).getByText('keine').waitFor();
  await p.getByRole('button', { name: 'In Projekt einfügen' }).click();
  await p.locator('.notice[role=status]').getByText(/in „Mein Dorf“ eingefügt/).waitFor();
  const after = (await readStore(p, 'projects')).find(x => x.id === created.id);
  assert.equal(after.instances.length, created.instances.length + 6);
  assert.equal(after.site.sections.length, created.site.sections.length + 3);

  // Overview lists all Anlagen.
  await p.goto(`${BASE}#/bibliothek/anlagen`);
  assert.equal(await p.locator('.anlage-card').count(), 11);
  assert.deepEqual(errors, []);
  await context.close();
});

test('Anlage am Handy: Planer bedienbar, keine horizontale Überbreite', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await context.newPage();
  p.setDefaultTimeout(20_000);
  await p.goto(`${BASE}#/bibliothek/anlagen/anl_fernost`);
  await p.getByRole('heading', { name: 'Fernöstlicher Gartenbezirk' }).waitFor();
  await conflicts(p).getByText('keine').waitFor();
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 1, `horizontale Überbreite ${overflow}px`);
  await p.getByRole('slider', { name: 'Abstand in Blöcken' }).fill('0');
  await p.getByText('Enger als empfohlen').waitFor();
  await context.close();
});
