// FLOW-01 Abnahme „Hafen“ (07.11.2026): durchgängiger Weg vom Großprojekt bis zum nächsten Block im Spiel.
// Große Hafenstadt anlegen, an einer Küste platzieren, Gelände aus der Mod übernehmen, Schnitt mit Wassertiefe,
// Erdbewegung und Kollisionen, Live-Vergleich ohne Speichern; Baumodus für Tablet/Zweitbildschirm mit großem Plan,
// Tastatur und Packliste des Abschnitts, Haken im zweiten Fenster erscheinen im ersten; Materialbilanz;
// Materialtausch mit Vorschau macht abgehakte Schritte „neu prüfen“.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startModSimulator } from './modSimulator.mjs';
import { waitForStart } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4311, MOD_PORT = 47711, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
// Coast (plan base at Y 65): land with grass at 64 north of z 30, sea floor at 58 with water up to 64 south of it, a hill reaching
// into the plan, and a pit the player digs later (only the live terrain shows it).
const geo = { dug: false };
const column = (x, z) => {
  if (geo.dug && x >= 2 && x < 7 && z >= -36 && z < -31) return [60, 0, 59, 3];
  if (z >= 30) return [64, 1, 58, 2];
  if (x >= 20 && x < 30 && z >= -30 && z < -20) return [67, 0, 66, 3];
  return undefined;
};
let server, browser, mod;

before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  mod = await startModSimulator(MOD_PORT, { protocol: 2, features: ['scan', 'marks2', 'players', 'terrain', 'box'], column });
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.kill(); await mod?.close(); });

// BAUPLANER_SHOTS=<Ordner> legt Bildschirmfotos der Abnahme ab (für Anleitung und Galerie).
const shot = (page, name) => process.env.BAUPLANER_SHOTS ? page.screenshot({ path: `${process.env.BAUPLANER_SHOTS}/${name}.png` }) : null;
const noise = m => /Failed to load resource|ERR_CONNECTION_REFUSED/.test(m);

test('Hafen: vom Großprojekt über Gelände, Baumodus, Zweitbildschirm und Materialbilanz bis zum Materialtausch', async () => {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await context.newPage();
  p.setDefaultTimeout(30_000);
  const errors = [];
  const watch = page => { page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !noise(m.text())) errors.push(m.text()); }); };
  watch(p);
  await p.goto(`${BASE}#/`);
  await p.evaluate(port => localStorage.setItem('bauplaner.spielverbindung', JSON.stringify({ port, token: null, auto: true })), MOD_PORT);
  await waitForStart(p);

  // 1. Großprojekt „Große Hafenstadt“ als Projekt anlegen.
  await p.goto(`${BASE}#/bibliothek/grossprojekte/gp_hafenstadt`);
  await p.getByRole('heading', { name: 'Große Hafenstadt' }).waitFor();
  await p.getByLabel('Projektname').fill('Hafen Abnahme');
  await p.getByRole('button', { name: 'Als Projekt anlegen' }).click();
  await p.waitForURL(/#\/projekt\//);
  const projectId = decodeURIComponent(p.url().split('#/projekt/')[1].split(/[/?]/)[0]);
  const tab = name => `${BASE}#/projekt/${encodeURIComponent(projectId)}/${name}`;

  // 2. An der Küste platzieren.
  await p.goto(`${BASE}#/karte?projekt=${encodeURIComponent(projectId)}`);
  await p.locator('.map-page[data-map-state=ready]').waitFor({ timeout: 60_000 });
  await p.getByRole('button', { name: 'Platzieren' }).first().click();
  await p.getByRole('status').filter({ hasText: 'Auf die Weltkarte gesetzt' }).waitFor();
  const detail = p.locator('.map-detail');
  await detail.getByLabel('Ursprung Y').fill('65');
  await detail.getByLabel('Ursprung Z').fill('-40');
  await detail.getByRole('button', { name: 'Lage speichern' }).click();
  await detail.getByText('X 0 · Y 65 · Z -40').first().waitFor();

  // 3. Gelände aus der Mod, dann Schnitt, Wassertiefe, Erdbewegung, Kollisionen.
  await p.goto(tab('gelaende'));
  const fromGame = p.getByTestId('terrain-from-game');
  await fromGame.getByRole('button', { name: 'Mit dem Spiel verbinden' }).click();
  mod.openPairing();
  await fromGame.getByLabel('Code').fill('482913');
  await fromGame.getByRole('button', { name: 'Koppeln' }).click();
  await fromGame.getByText('Spiel verbunden').waitFor();
  await fromGame.getByRole('button', { name: 'Gelände aus dem Spiel übernehmen' }).click();
  await p.getByRole('status').filter({ hasText: 'Geländeaufnahme aus dem Spiel gespeichert' }).waitFor();
  const section = p.getByTestId('terrain-section');
  await section.getByTestId('earth-map').waitFor();
  const totals = await section.getByTestId('earth-totals').innerText();
  const num = label => Number((totals.match(new RegExp(`${label}\\s*([\\d.]+)`)) ?? [0, '0'])[1].replace(/\./g, ''));
  assert.ok(num('Unterbau') > 0, `Unterbau im Wasser: ${totals}`);
  assert.ok(num('Kollisionen') > 0, `Hügel ragt in den Plan: ${totals}`);
  assert.ok(num('Im Wasser') > 0, `Fundament im Wasser: ${totals}`);
  assert.match(totals, /max\. 6 tief/);
  // North–south section through the plan crosses land and sea.
  assert.match(await section.getByTestId('section-summary').innerText(), /Nord → Süd bei X \d+: Boden Y \d+ … \d+, Wasser bis 6 tief/);
  assert.ok(await section.getByTestId('section-svg').locator('rect').count() > 50);
  // Clicking the map moves the section line; the other axis works too.
  await section.getByLabel('Richtung des Schnitts').selectOption('x');
  const earth = section.getByTestId('earth-map');
  await earth.scrollIntoViewIfNeeded();
  const box = await earth.boundingBox();
  await earth.click({ position: { x: box.width / 2, y: box.height * 0.9 } });
  assert.match(await section.getByTestId('section-summary').innerText(), /West → Ost bei Z \d+: .*Wasser bis 6 tief/);
  await section.getByRole('button', { name: 'Wassertiefe' }).click();
  // Live terrain: the player dug a pit after the survey; it is compared, not stored.
  geo.dug = true;
  const stored = await p.getByTestId('terrain-survey-state').innerText();
  await section.getByRole('button', { name: 'Live vergleichen' }).click();
  await section.getByTestId('live-changed').filter({ hasText: '25' }).waitFor();
  assert.equal(await p.getByTestId('terrain-survey-state').innerText(), stored, 'Aufnahme bleibt unverändert');
  assert.equal(await section.getByTestId('earth-totals').innerText(), totals, 'Zahlen bleiben auf der Aufnahme');
  await section.getByRole('button', { name: 'Erdbewegung' }).click();
  await section.scrollIntoViewIfNeeded();
  await shot(p, 'hafen-gelaendeschnitt');

  // 4. Baumodus für Tablet/Zweitbildschirm: großer Plan, Tastatur, Packliste des Abschnitts.
  await p.goto(tab('bauen'));
  await p.getByRole('button', { name: 'Baumodus (Tablet/Handy)' }).click();
  await p.locator('.focus-card').waitFor();
  assert.ok(await p.locator('.focus-plan .layer-plan.big rect.own').count() > 0, 'großer Schichtplan neben dem Schritt');
  const planBox = await p.locator('.focus-plan').boundingBox(), cardBox = await p.locator('.focus-card').boundingBox();
  assert.ok(planBox.x + planBox.width <= cardBox.x + 1, 'Plan links, Schritt rechts');
  const pack = p.getByTestId('focus-pack');
  const sectionName = (await pack.locator('summary').innerText()).match(/Packliste Abschnitt „([^“]+)“ \d+ offene Schritte/)[1];
  assert.match(await p.locator('.focus-section').innerText(), /\S/);
  await pack.locator('summary').click();
  assert.ok(await pack.locator('tbody tr').count() > 0);
  const kicker = () => p.locator('.focus-card .panel-kicker').innerText();
  const first = await kicker();
  await p.keyboard.press('ArrowRight');
  await p.waitForFunction(b => document.querySelector('.focus-card .panel-kicker')?.textContent !== b, first);
  await p.keyboard.press('ArrowLeft');
  await p.waitForFunction(b => document.querySelector('.focus-card .panel-kicker')?.textContent === b, first);
  await p.keyboard.press('Space');
  await p.getByTestId('proof-summary').filter({ hasText: '1 manuell abgehakt' }).waitFor();
  await p.evaluate(() => document.querySelector('.focus')?.scrollIntoView());
  await shot(p, 'hafen-baumodus-tablet');

  // 5. Zweitbildschirm: eigenes Fenster im Baumodus, Haken dort erscheinen im ersten Fenster.
  const [popup] = await Promise.all([context.waitForEvent('page'), p.getByRole('button', { name: 'Zweitbildschirm' }).click()]);
  watch(popup);
  await popup.locator('.focus.second-screen .focus-card').waitFor({ timeout: 60_000 });
  assert.match(popup.url(), /bauen\?zweitbildschirm=1$/);
  assert.equal(await popup.getByRole('button', { name: 'Zweitbildschirm' }).count(), 0);
  await popup.getByRole('button', { name: '✓ Abhaken & weiter' }).click();
  await popup.locator('.save-state.saved').waitFor();
  await p.getByTestId('proof-summary').filter({ hasText: '2 manuell abgehakt' }).waitFor();
  // The first window may show the step the second one just ticked: go on to the next open step.
  if (await p.getByRole('button', { name: 'Haken entfernen' }).count()) await p.keyboard.press('ArrowRight');
  await p.getByRole('button', { name: '✓ Abhaken & weiter' }).click();
  await popup.getByTestId('proof-summary').filter({ hasText: '3 manuell abgehakt' }).waitFor();
  await popup.close();

  // 6. Materialbilanz: Gesamtbedarf, verbaut, reserviert, zu beschaffen.
  await p.locator('.save-state.saved').waitFor();
  await p.goto(tab('material'));
  const ledger = p.getByTestId('material-ledger');
  await ledger.waitFor();
  assert.match(await ledger.innerText(), /Aktueller Bauabschnitt: (Straßen & Plätze|Phase \d: [^.]+)\./);
  assert.ok(sectionName);
  const stats = await ledger.locator('.ledger-stats').innerText();
  assert.match(stats, /Gesamtbedarf\s*[\d.]+[\s\S]*Verbaut \(abgehakt\)\s*[1-9]/);
  await ledger.getByRole('button', { name: 'Zu beschaffen' }).click();
  assert.ok(await ledger.locator('tbody tr').count() > 3);
  await ledger.scrollIntoViewIfNeeded();
  await shot(p, 'hafen-materialbilanz');

  // 7. Materialtausch mit Vorschau: Holz tauschen, abgehakte Schritte werden neu prüfen.
  const swap = p.getByTestId('project-swap');
  await swap.locator('summary').click();
  const wood = swap.locator('select[aria-label$="ersetzen durch"]').first();
  const options = await wood.locator('option').allInnerTexts();
  await wood.selectOption({ index: options.findIndex(o => !o.includes('unverändert')) });
  const previewBox = swap.getByTestId('swap-preview');
  await previewBox.waitFor();
  assert.match(await previewBox.innerText(), /Betroffene Instanzen[\s\S]*Blockwechsel/);
  assert.ok(await previewBox.locator('.swap-items tbody tr').count() >= 2, 'Mehr- und Minderbedarf');
  await previewBox.scrollIntoViewIfNeeded();
  await shot(p, 'hafen-materialtausch-vorschau');
  const recheck = await swap.getByTestId('swap-recheck').innerText();
  assert.match(recheck, /\d+ Bauschritte ändern sich/);
  const ticked = Number((recheck.match(/davon (\d+) bereits abgehakt/) ?? [0, '0'])[1]);
  await swap.getByRole('button', { name: 'Tausch übernehmen' }).click();
  await p.getByTestId('swap-done').filter({ hasText: 'Material getauscht' }).waitFor({ timeout: 60_000 });
  await p.locator('.save-state.saved').waitFor();
  await p.goto(tab('bauen'));
  await p.locator('.build-progress').waitFor();
  if (ticked) await p.getByTestId('proof-summary').filter({ hasText: `${ticked} neu prüfen (Plan geändert)` }).waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});
