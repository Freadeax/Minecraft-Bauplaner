// GROSS-01 in a real browser: Großprojekte overview and planner, nothing placed by browsing, choices only
// recompute the preview, adoption as new project with street network and one section per phase,
// insertion into an existing project. Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = 4303, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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
const conflicts = p => p.getByTestId('gp-conflicts');

test('Großprojekt: Übersicht, Planer, Quartiere und Straßen wählen, Übernahme mit Straßennetz und Bauphasen', async () => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await context.newPage();
  p.setDefaultTimeout(30_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  // Overview: tab in the library, one card per project, browsing stores nothing.
  await p.goto(`${BASE}#/bibliothek`);
  await p.getByRole('link', { name: /^Großprojekte/ }).click();
  await p.getByRole('heading', { name: 'Ganze Städte, Festungen und Anlagen als Plan.' }).waitFor();
  assert.equal(await p.locator('.gp-card').count(), 11);
  const before = (await readStore(p, 'projects')).length;
  await p.locator('[data-gp=gp_burganlage]').click();
  await p.getByRole('heading', { name: 'Große Burganlage' }).waitFor();
  assert.match(p.url(), /#\/bibliothek\/grossprojekte\/gp_burganlage$/);
  await conflicts(p).getByText('keine').waitFor();
  assert.match(await p.locator('.anlage-checks').innerText(), /Keine Voxelkonflikte[\s\S]*Grundflächen getrennt[\s\S]*Abstände eingehalten/);
  assert.ok(await p.getByTestId('gp-plan').locator('rect').count() > 20, 'Lageplan zeigt Quartiere, Straßen und Grundflächen');
  const buildings = Number((await p.getByTestId('gp-buildings').innerText()).match(/\d+/)[0]);
  assert.ok(buildings >= 25, `${buildings} Gebäude`);

  // Choices: a quarter off, wider streets, another style – only the preview changes.
  await p.locator('[data-quarter=felder]').getByRole('checkbox').uncheck();
  await conflicts(p).getByText('keine').waitFor();
  const fewer = Number((await p.getByTestId('gp-buildings').innerText()).match(/\d+/)[0]);
  assert.ok(fewer < buildings, 'Quartier abgewählt');
  await p.getByRole('slider', { name: 'Straßenbreite in Blöcken' }).fill('6');
  await p.getByLabel('Straßenstil').selectOption('asphalt');
  await conflicts(p).getByText('keine').waitFor();
  // Swap one slot and turn another.
  await p.locator('[data-quarter=hof]').getByRole('combobox').first().selectOption({ index: 1 });
  await p.locator('[data-quarter=hof]').getByText('getauscht').waitFor();
  await p.locator('[data-quarter=wache]').getByRole('button', { name: 'Wachturm drehen' }).click();
  await conflicts(p).getByText('keine').waitFor();
  assert.equal((await readStore(p, 'projects')).length, before, 'Vorschau speichert nichts');

  // Adopt as a new project.
  const adopt = p.getByRole('button', { name: 'Als Projekt anlegen' });
  await p.getByLabel('Projektname').fill('Meine Burg');
  await adopt.click();
  await p.waitForURL(/#\/projekt\//);
  const created = (await readStore(p, 'projects')).find(x => x.name === 'Meine Burg');
  assert.ok(created, 'Projekt angelegt');
  assert.deepEqual(created.site.sections.map(s => s.name), ['Straßen & Plätze', 'Phase 1: Kernburg', 'Phase 2: Zwinger & Garnison', 'Phase 3: Vorburg']);
  const assets = await readStore(p, 'assets');
  assert.ok(assets.some(a => a.name.startsWith('Straßennetz: Meine Burg')), 'Straßennetz als eigenes Bauteil gespeichert');
  assert.ok(created.instances.length >= 20);

  // Insert a second project beside the existing one.
  await p.goto(`${BASE}#/bibliothek/grossprojekte/gp_tempelstadt`);
  await p.getByRole('heading', { name: 'Tempelstadt am Kirschhain' }).waitFor();
  await p.getByLabel('Ziel').selectOption({ label: 'In „Meine Burg“ einfügen' });
  await conflicts(p).getByText('keine').waitFor();
  await p.getByRole('button', { name: 'In Projekt einfügen' }).click();
  await p.locator('.notice[role=status]').getByText(/in „Meine Burg“ eingefügt/).waitFor();
  const after = (await readStore(p, 'projects')).find(x => x.id === created.id);
  assert.ok(after.instances.length > created.instances.length + 30);
  assert.equal(after.site.sections.length, created.site.sections.length + 5, 'Straßen + vier Phasen angehängt');
  assert.deepEqual(errors, []);
  await context.close();
});

test('Großprojekt am Handy: Planer bedienbar, keine horizontale Überbreite', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await context.newPage();
  p.setDefaultTimeout(30_000);
  await p.goto(`${BASE}#/bibliothek/grossprojekte/gp_landgut`);
  await p.getByRole('heading', { name: 'Großes Landgut' }).waitFor();
  await conflicts(p).getByText('keine').waitFor();
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 1, `horizontale Überbreite ${overflow}px`);
  await p.getByRole('slider', { name: 'Abstand in Blöcken' }).fill('0');
  await p.getByText('Enger als empfohlen').waitFor();
  await context.close();
});
