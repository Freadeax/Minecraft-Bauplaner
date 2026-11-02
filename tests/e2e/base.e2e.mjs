// BASE-01/SPLIT-01 in a real browser: Basisplaner (Zonen, Wasserseite, Prüfung, Übernahme mit Bauphasen)
// und „Gebäude herauslösen“ im Gebäudeblatt. Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = 4297, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

test('Basisplaner: Vorlage, Zonen, Wasserseite, Prüfung, Übernahme mit Bauphasen; Gebäude herauslösen', async () => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await context.newPage();
  p.setDefaultTimeout(30_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await p.goto(`${BASE}#/bibliothek/basis`);
  await p.getByRole('heading', { name: 'Küstenbasis' }).waitFor();
  await p.getByTestId('base-conflicts').getByText('keine').waitFor();
  assert.equal(await p.getByTestId('base-zones').innerText(), '12');
  assert.ok(await p.getByTestId('base-map').locator('rect').count() > 20, 'Lageplan zeigt Zonen und Gebäude');
  assert.match(await p.locator('.anlage-checks').innerText(), /Keine Voxelkonflikte[\s\S]*Alle Zonen am Wegenetz/);
  const before = (await readStore(p, 'projects')).length;

  // Zone off, main building swapped, reserved plot, water side.
  await p.locator('[data-zone=tierfarm]').getByRole('checkbox').first().uncheck();
  await p.getByTestId('base-zones').getByText('11').waitFor();
  await p.getByLabel('Hauptgebäude Lager').selectOption({ label: 'Hafenspeicher' });
  await p.getByLabel('Hauptgebäude Schmiede').selectOption({ label: 'Freier Bauplatz' });
  await p.locator('[data-zone=schmiede] .muted').getByText('Bauplatz frei').waitFor();
  await p.getByLabel('Wasserseite').selectOption('west');
  await p.getByTestId('base-conflicts').getByText('keine').waitFor();
  assert.match(await p.locator('[data-zone=hafen] .base-reqs').innerText(), /Stege reichen ins Wasser/);
  assert.match(await p.locator('[data-zone=verzauberung] .base-reqs').innerText(), /15 von 15/);
  await p.getByLabel('Zone hinzufügen').selectOption({ label: 'Wohnhaus' });
  await p.getByTestId('base-zones').getByText('12').waitFor();
  assert.equal((await readStore(p, 'projects')).length, before, 'Planen speichert nichts');

  await p.getByLabel('Projektname').fill('Meine Küste');
  const adopt = p.getByRole('button', { name: 'Als neues Projekt anlegen' });
  await adopt.waitFor();
  for (let i = 0; i < 60 && await adopt.isDisabled(); i++) await p.waitForTimeout(250);
  await adopt.click();
  await p.waitForURL(/#\/projekt\//);
  const projects = await readStore(p, 'projects');
  const created = projects.find(x => x.name === 'Meine Küste');
  assert.ok(created);
  assert.equal(created.site.sections[0].name, 'Wege & Platz');
  assert.ok(created.site.sections.some(s => s.name.startsWith('Phase 1')) && created.site.sections.some(s => s.name.startsWith('Phase 4')));
  const assets = await readStore(p, 'assets');
  const net = assets.find(a => a.name.startsWith('Wegenetz: Meine Küste'));
  assert.ok(net, 'Wegenetz als eigenes Bauteil gespeichert');
  assert.ok(created.instances.some(i => i.name === 'Wegenetz'));

  // Gebäude herauslösen: the shipped Küstendorf ensemble has no single model, so use a big catalog building with annex: Werft.
  await p.goto(`${BASE}#/bibliothek/gebaeude/bld_hof_handelsscheune`);
  await p.getByRole('heading', { name: 'Handelsscheune' }).first().waitFor();
  const split = p.locator('.split-panel');
  await split.locator('summary').click();
  await p.getByTestId('split-summary').waitFor();
  const parts = await split.locator('.split-parts li').count();
  assert.ok(parts >= 1, 'mindestens ein Teil gefunden');
  await split.locator('.split-parts li').first().getByRole('checkbox').check();
  await split.locator('.split-parts li').first().getByRole('textbox').fill('Mein Teil');
  await split.getByRole('button', { name: 'Einzeln als Bauteile speichern' }).click();
  await p.locator('.notice[role=status]').getByText(/Bauteil/).waitFor();
  const after = await readStore(p, 'assets');
  assert.ok(after.some(a => a.name === 'Mein Teil' && a.tags.includes('herausgeloest')), 'herausgelöstes Teil in der Bibliothek');

  // Handy width: planner stays usable.
  await p.setViewportSize({ width: 390, height: 800 });
  await p.goto(`${BASE}#/bibliothek/basis`);
  await p.getByTestId('base-conflicts').getByText('keine').waitFor();
  assert.ok(await p.getByRole('button', { name: 'Als neues Projekt anlegen' }).isVisible());
  assert.deepEqual(errors, []);
  await context.close();
});
