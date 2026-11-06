// Szenariotests der Testphase für Projekt und Produktion (Block 7, 06.11.2026): jeder Test geht die Schritte eines
// Testfalls aus apps/web/src/testing/testplan.ts so nach, wie sie dort stehen, und prüft das dort genannte Ergebnis.
// PROJ-12 + Ofenstraße (PROD-03-Folge), PROJ-13, PROJ-09 (Großprojekt-Schritt), PROJ-21 (mit Löschen).
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject, waitForStart } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4471, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

/** Screen point of a block on the overview map canvas. */
async function at(canvas, x, z) {
  const box = await canvas.boundingBox();
  const scale = Number(await canvas.getAttribute('data-scale'));
  const [cx, cz] = (await canvas.getAttribute('data-center')).split(',').map(Number);
  return { x: box.x + box.width / 2 + (x + 0.5 - cx) * scale, y: box.y + box.height / 2 + (z + 0.5 - cz) * scale };
}

const day = n => { const d = new Date(Date.now() + n * 86_400_000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

async function page(viewport = { width: 1400, height: 1000 }) {
  const context = await browser.newContext({ viewport, acceptDownloads: true });
  const p = await context.newPage();
  p.setDefaultTimeout(15_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|clipboard/i.test(m.text())) errors.push(m.text()); });
  return { context, p, errors };
}

/** Sample project with the preset sections „Fundament · Rohbau · Dach“; returns its id and the tab navigation. */
/** Großprojekt „Große Burganlage“ as a new project (sections: Straßen & Plätze, Phase 1–3). */
async function burganlage(p) {
  await p.goto(`${BASE}#/bibliothek/grossprojekte/gp_burganlage`);
  await p.getByRole('heading', { name: 'Große Burganlage' }).waitFor({ timeout: 90_000 });
  await p.getByTestId('gp-conflicts').getByText('keine').waitFor({ timeout: 60_000 });
  await p.getByLabel('Projektname').fill('Szenario Burg');
  await p.getByRole('button', { name: 'Als Projekt anlegen' }).click();
  await p.waitForURL(/#\/projekt\//);
  const id = /#\/projekt\/([^/]+)/.exec(p.url())[1];
  return { id, nav: p.getByRole('navigation', { name: 'Projektbereiche' }) };
}

async function sampleWithSections(p) {
  await p.goto(BASE);
  await openSampleProject(p);
  await p.waitForURL(/#\/projekt\//);
  const id = /#\/projekt\/([^/]+)/.exec(p.url())[1];
  const nav = p.getByRole('navigation', { name: 'Projektbereiche' });
  await nav.getByRole('link', { name: 'Baustelle' }).click();
  const site = p.getByRole('region', { name: 'Baustelle' });
  await site.getByRole('button', { name: /Fundament · Rohbau · Dach/ }).click();
  await site.locator('.site-section').nth(2).waitFor();
  return { id, nav };
}

test('Szenario PROJ-12 + Ofenstraße: Farm, Ernte, Öfen, Ofenstraße in Baustelle und Planung, Rückgängig', async () => {
  const { context, p, errors } = await page();
  const { nav } = await sampleWithSections(p);
  // A build program, so the furnace section can be waited for.
  await nav.getByRole('link', { name: 'Planung' }).click();
  const planning = p.getByRole('region', { name: 'Planung' });
  await planning.getByRole('region', { name: 'Einstellungen' }).getByLabel('Startdatum').fill(day(1));
  await planning.locator('.prog-bar').nth(2).waitFor();

  // Step 1: cobblestone generator, running → coverage says „mit Farm“.
  await nav.getByRole('link', { name: 'Produktion' }).click();
  const prod = p.getByRole('region', { name: 'Produktion', exact: true });
  const farms = prod.getByRole('region', { name: 'Farmen' });
  await farms.getByLabel('Farmart').selectOption('bruchstein');
  await farms.getByRole('button', { name: '+ Farm' }).click();
  const card = farms.locator('.prod-farm').filter({ hasText: 'Bruchsteingenerator' });
  await card.getByLabel('Zustand Bruchsteingenerator').selectOption('laeuft');
  const cobble = prod.getByRole('region', { name: 'Deckung' }).locator('tr', { has: p.locator('code', { hasText: /^cobblestone$/ }) });
  await cobble.getByText('mit Farm').waitFor({ state: 'attached' });
  // Step 2: a real harvest goes into the site stock, the rate is measured, the rest demand falls.
  const before = Number((await prod.locator('.site-kpi.wide small').innerText()).match(/([\d.]+) Items fehlen/)[1].replace(/\./g, ''));
  await card.getByRole('button', { name: 'Ernte & Details' }).click();
  await card.getByLabel('Menge').fill('64');
  await card.getByLabel('Arbeitszeit in Stunden').fill('1');
  await card.getByRole('button', { name: 'Ins Lager buchen' }).click();
  await card.locator('.prod-rate.measured').getByText('gemessen').waitFor();
  await p.waitForFunction(b => { const m = /([\d.]+) Items fehlen/.exec(document.querySelector('.prod .site-kpi.wide small')?.textContent ?? ''); return m && Number(m[1].replace(/\./g, '')) < b; }, before);

  // Step 3: furnaces per target time, then the Ofenstraße from the catalogue.
  await prod.locator('details.prod-more').evaluate(d => { d.open = true; });
  const furnaces = prod.getByRole('region', { name: 'Öfen und Brennstoff' });
  await furnaces.getByText(/(Ofen|Öfen) für 1 h/).first().waitFor();
  const line = furnaces.getByRole('group', { name: 'Ofenstraße einplanen' });
  await line.getByLabel('Zielzeit der Öfen').selectOption('1');
  const first = line.locator('li').first();
  await first.getByText(/Öfen, fertig in/).waitFor();
  const label = await first.locator('strong').innerText();
  const copies = Number(/^(\d+)×/.exec(label)[1]);
  await first.getByRole('button', { name: /ins Projekt legen$/ }).click();
  const status = prod.getByRole('status', { name: 'Ofenstraße eingeplant' });
  await status.getByText(/eingeplant: Abschnitt „Ofenstraße“ an Stelle \d der Bau-Reihenfolge; in der Planung warten/).waitFor();
  await prod.locator('details.prod-more').evaluate(d => { d.open = true; });
  await prod.getByText(/Im Projekt stehen schon \d+ Öfen/).waitFor();

  // Baustelle: own section with exactly the new copies; Planung: the section, and the smelting sections wait for it.
  await nav.getByRole('link', { name: 'Baustelle' }).click();
  const sections = p.getByRole('region', { name: 'Baustelle' }).locator('.site-section');
  await sections.filter({ hasText: 'Ofenstraße' }).waitFor();
  await nav.getByRole('link', { name: 'Planung' }).click();
  const deps = planning.getByRole('region', { name: 'Abhängigkeiten' });
  await deps.locator('.prog-dep-list li', { hasText: 'Ofenstraße' }).first().waitFor();
  assert.ok(await deps.locator('.prog-dep-list li', { hasText: 'braucht geschmolzene Items' }).count() >= 1);
  await planning.getByRole('region', { name: 'Zeitplan' }).locator('.prog-bar', { hasText: 'Ofenstraße' }).first().waitFor({ state: 'attached' });

  // Persistence, then one undo removes copies, section and dependencies.
  await p.reload();
  await p.getByRole('region', { name: 'Abhängigkeiten' }).locator('.prog-dep-list li', { hasText: 'Ofenstraße' }).first().waitFor({ timeout: 90_000 });
  await nav.getByRole('link', { name: 'Produktion' }).click();
  await prod.locator('details.prod-more').evaluate(d => { d.open = true; });
  await line.getByLabel('Zielzeit der Öfen').selectOption('1');
  await first.getByRole('button', { name: /ins Projekt legen$/ }).click();
  await status.getByRole('button', { name: 'Rückgängig' }).click();
  await status.waitFor({ state: 'detached' });
  await nav.getByRole('link', { name: 'Baustelle' }).click();
  await sections.filter({ hasText: 'Ofenstraße' }).first().waitFor();
  await p.waitForTimeout(300);
  assert.equal(await sections.filter({ hasText: 'Ofenstraße' }).count(), 1, 'second placement undone, first stays');
  assert.ok(copies >= 1);
  // On a phone the furnace choice fits without horizontal scrolling.
  await p.setViewportSize({ width: 390, height: 844 });
  await nav.getByRole('link', { name: 'Produktion' }).click();
  await prod.locator('details.prod-more').evaluate(d => { d.open = true; });
  await line.locator('li').first().waitFor();
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 1, `no horizontal scroll (${overflow}px)`);
  assert.deepEqual(errors, []);
  await context.close();
});

test('Szenario PROJ-09 (Großprojekt) + PROJ-13: Phasen-Meilensteine, Engpass, geplante Farm, Planung wartet auf Material, AFK-Platz', async () => {
  const { context, p, errors } = await page();
  const { nav } = await burganlage(p);
  // PROJ-09 step 3: milestones from the section names – one per phase, roads first, critical path through all phases.
  await nav.getByRole('link', { name: 'Planung' }).click();
  const planning = p.getByRole('region', { name: 'Planung' });
  await planning.getByRole('button', { name: /^Meilensteine aus Abschnittsnamen/ }).click();
  const ms = planning.getByRole('region', { name: 'Meilensteine' });
  await ms.locator('.prog-item').nth(2).waitFor();
  const names = await ms.locator('.prog-item').allInnerTexts();
  assert.ok(names.length >= 3, `${names.length} Meilensteine`);
  assert.ok(names.some(n => /Phase 1/.test(n)) && names.some(n => /Phase 3/.test(n)), names.join(' | '));
  const gantt = planning.getByRole('region', { name: 'Zeitplan' });
  const bars = gantt.locator('.prog-bar');
  assert.match(await bars.first().getAttribute('title'), /^Straßen & Plätze/, 'roads first');
  const critical = await planning.locator('.site-kpi', { hasText: 'KRITISCHER PFAD' }).locator('small').innerText();
  for (const phase of ['Phase 1', 'Phase 2', 'Phase 3']) assert.match(critical, new RegExp(phase), `${phase} on the critical path: ${critical}`);
  await p.reload();
  await p.getByRole('region', { name: 'Meilensteine' }).locator('.prog-item').nth(2).waitFor({ timeout: 90_000 });

  // PROJ-13: planning with a builder and a start date.
  const builders = planning.getByRole('region', { name: 'Bauleute' });
  await builders.getByLabel('Name der neuen Bauleute').fill('Anna');
  await builders.getByRole('button', { name: '+ Bauleute' }).click();
  await builders.locator('.prog-builder').first().waitFor();
  await planning.getByRole('region', { name: 'Einstellungen' }).getByLabel('Startdatum').fill(day(0));

  // Step 1: little gathering time → bottleneck; a suggested farm „Als geplant anlegen“.
  await nav.getByRole('link', { name: 'Produktion' }).click();
  const prod = p.getByRole('region', { name: 'Produktion', exact: true });
  await prod.locator('details.prod-settings-more').evaluate(d => { d.open = true; });
  const gather = prod.getByLabel('Sammelzeit je Spieltag');
  await gather.fill('0.5'); await gather.press('Enter');
  await prod.locator('.site-kpi.wide small').getByText(/0,5 h Sammelzeit je Tag/).waitFor();
  const bottleneck = await prod.locator('.site-kpi', { hasText: 'ENGPASS' }).locator('strong').innerText();
  assert.notEqual(bottleneck, '–');
  const late = prod.locator('.site-kpi', { hasText: 'BAUBEGINN GEFÄHRDET' });
  await late.getByText(/Abschnitte, deren Material nach dem geplanten Baubeginn/).waitFor();
  const suggestion = prod.getByRole('button', { name: /^Als geplant anlegen/ }).first();
  await suggestion.click();
  const farms = prod.getByRole('region', { name: 'Farmen' });
  const planned = farms.locator('.prod-farm').first();
  await planned.waitFor();

  // Step 2: the planning waits for material (hatched), the KPI says so; a running farm shortens the wait.
  await nav.getByRole('link', { name: 'Planung' }).click();
  await planning.getByLabel('Auf Material warten').check();
  await gantt.getByText(/schraffiert = wartet auf Material/).waitFor();
  await gantt.locator('.prog-wait').first().waitFor({ state: 'attached' });
  const waitText = async () => planning.locator('.prog-overview, .prog-material-kpi').getByText(/warten zusammen|wartet zusammen|Kein Abschnitt wartet/).first().innerText();
  const waitingBefore = await waitText();
  await nav.getByRole('link', { name: 'Produktion' }).click();
  await late.getByText('Die Planung wartet auf das Material').waitFor();
  await planned.getByLabel(/^Zustand /).selectOption('laeuft');
  await prod.locator('.site-kpi', { hasText: 'FARMEN' }).getByText(/^1 \/ 1$/).waitFor();
  await nav.getByRole('link', { name: 'Planung' }).click();
  await p.waitForFunction(b => {
    const t = [...document.querySelectorAll('.prog-overview *, .prog-material-kpi *')].map(e => e.textContent ?? '').find(x => /warten zusammen|wartet zusammen|Kein Abschnitt wartet/.test(x));
    return t !== undefined && t !== b;
  }, waitingBefore);

  // Step 3: two automatic farms with a place → AFK spot names reached and missed farms with a reason.
  await nav.getByRole('link', { name: 'Produktion' }).click();
  for (const [type, name, x] of [['zuckerrohr', 'Zuckerrohr-Farm', '100'], ['kaktus', 'Kaktusfarm', '900']]) {
    await farms.getByLabel('Farmart').selectOption(type);
    await farms.getByRole('button', { name: '+ Farm' }).click();
    const c = farms.locator('.prod-farm').filter({ hasText: name });
    await c.getByLabel(/^Zustand /).selectOption('laeuft');
    await c.getByRole('button', { name: 'Ernte & Details' }).click();
    await c.getByLabel('X-Koordinate').fill(x);
    await c.getByLabel('Z-Koordinate').fill('0');
    await c.getByRole('button', { name: 'Ort speichern' }).click();
    await c.getByText(new RegExp(`Oberwelt ${x} / 64 / 0`)).first().waitFor();
  }
  await prod.locator('details.prod-more').evaluate(d => { d.open = true; });
  const afk = prod.getByRole('region', { name: 'AFK-Platz' });
  await afk.getByText(/erreicht 1 von 2 Farmen/).first().waitFor();
  await afk.getByText(/✕ (Zuckerrohr-Farm|Kaktusfarm).*: \S/).first().waitFor();
  await afk.getByRole('button', { name: 'Als AFK-Platz übernehmen' }).first().click();
  await afk.getByText(/Gewählt:/).waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});

test('Szenario PROJ-21: Reihenfolge zwischen Projekten und Löschen mit Bauplatz', async () => {
  const { context, p, errors } = await page();
  // A with a start and a baseline; B „erst nach“ A.
  const { id: a } = await sampleWithSections(p);
  await p.goto(`${BASE}#/projekt/${a}/planung`);
  let planning = p.getByRole('region', { name: 'Planung' });
  await planning.getByRole('region', { name: 'Einstellungen' }).getByLabel('Startdatum').fill(day(2));
  await planning.getByRole('button', { name: 'Basisplan festhalten' }).click();
  await planning.locator('.prog-slip-kpi').waitFor();
  // The baseline must be stored before B reads it: reload A and see it again.
  await p.waitForTimeout(500);
  await p.reload();
  await p.getByRole('region', { name: 'Planung' }).locator('.prog-slip-kpi').waitFor({ timeout: 90_000 });
  const { id: b } = await sampleWithSections(p);
  await p.goto(`${BASE}#/projekt/${b}/planung`);
  planning = p.getByRole('region', { name: 'Planung' });
  await planning.getByRole('region', { name: 'Einstellungen' }).getByLabel('Startdatum').fill(day(1));
  const order = planning.getByRole('region', { name: 'Reihenfolge der Projekte' });
  await order.getByLabel('Projekt, das vorher fertig sein muss').selectOption(a);
  await order.getByRole('button', { name: '+ Erst nach' }).click();
  await order.getByRole('alert').getByText(/Frühester Start/).waitFor();
  await order.getByRole('button', { name: /^Start auf .* setzen$/ }).click();
  await order.getByRole('alert').waitFor({ state: 'detached' });

  // Both on the world map; A also gets a building site (Bauplatz) drawn on the map and linked to it.
  await p.goto(`${BASE}#/karte`);
  await p.locator('.map-page[data-map-state=ready]').waitFor({ timeout: 30_000 });
  for (let i = 0; i < 2; i++) {
    await p.getByRole('button', { name: 'Platzieren' }).first().click();
    await p.getByRole('status').filter({ hasText: 'Auf die Weltkarte gesetzt' }).waitFor();
    await p.locator('.map-page[data-map-state=ready]').waitFor({ timeout: 30_000 });
  }
  const canvas = p.locator('.overview-canvas');
  await canvas.evaluate(el => el.scrollIntoView({ block: 'end' }));
  for (let i = 0; i < 3; i++) await p.getByRole('button', { name: 'Hineinzoomen' }).click();
  await p.getByRole('group', { name: 'Planungswerkzeug' }).getByRole('button', { name: 'Bauplatz' }).click();
  const [cx, cz] = (await canvas.getAttribute('data-center')).split(',').map(Number);
  const q1 = await at(canvas, cx - 6, cz - 3), q2 = await at(canvas, cx - 1, cz + 2);
  await p.mouse.move(q1.x, q1.y); await p.mouse.down(); await p.mouse.move((q1.x + q2.x) / 2, (q1.y + q2.y) / 2, { steps: 4 }); await p.mouse.move(q2.x, q2.y, { steps: 4 }); await p.mouse.up();
  const editor = p.locator('.plan-editor');
  await editor.getByRole('heading', { name: /^Bauplatz: / }).waitFor();
  await editor.getByLabel('Name').fill('Platz A');
  await editor.getByLabel('Projekt auf diesem Bauplatz').selectOption(a);
  await editor.getByRole('button', { name: 'Übernehmen' }).click();
  await editor.getByRole('heading', { name: 'Bauplatz: Platz A' }).waitFor();

  // Delete A in the Projektzentrale: the question names B (and the site if one points at A); B waits for nothing afterwards.
  await p.goto(BASE);
  await waitForStart(p);
  let question = '';
  p.once('dialog', d => { question = d.message(); void d.accept(); });
  const cardA = p.locator('.project-card').filter({ has: p.locator(`a[href*="${a}"]`) }).first();
  await cardA.waitFor();
  await cardA.getByRole('button', { name: /Löschen|löschen/ }).first().click();
  await p.getByText(/Projekt „.*“ gelöscht\./).waitFor();
  assert.match(question, /endgültig löschen/);
  assert.match(question, /wartet nicht mehr auf dieses Projekt/);
  assert.match(question, /Der Bauplatz „Platz A“ auf der Weltkarte wird frei/);
  await p.getByText(/Projekt „.*“ gelöscht\..*Der Bauplatz „Platz A“ auf der Weltkarte wird frei/).waitFor();
  await p.goto(`${BASE}#/projekt/${b}/planung`);
  await p.getByRole('region', { name: 'Reihenfolge der Projekte' }).getByText('Wartet auf kein anderes Projekt.').waitFor();
  assert.deepEqual(errors, []);
  await context.close();
});
