// TERRAIN-03-S08 / GROSS-01-S08 in a real browser: Basis-Wegenetz und Großprojekt-Straßen als Landschaftsweg
// (Treppen, Brücken), Bauplätze eingeebnet mit Kaimauer, echte Küstenlinie im Lageplan, eigenes Großprojekt aus
// einer Sammlung. Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  addToCollection, applyOperation, createBackup, createBuildingLibrary, createCollection, createPlacement, createProject, createSurvey, serializeBackup, surveyFile,
} from '../../dist/domain/src/index.js';
import { waitForStart } from './start.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = 4357, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
const ORIGIN = [0, 64, 0];
let server, browser, backup, ownName;

before(async () => {
  // Bauplatz 400 × 400 around the origin: a hill rising to the east, a creek 7 wide running north–south at x 20..26.
  const area = { minX: -200, minZ: -200, width: 400, length: 400 };
  const creek = x => x >= 20 && x < 27;
  const n = area.width * area.length;
  const ground = new Int16Array(n), surface = new Int16Array(n), gb = new Uint16Array(n), sb = new Uint16Array(n);
  for (let z = 0; z < area.length; z++) for (let x = 0; x < area.width; x++) {
    const i = x + z * area.width, wx = area.minX + x;
    if (creek(wx)) { ground[i] = 57; gb[i] = 1; surface[i] = 61; sb[i] = 2; continue; }
    ground[i] = 62 + Math.max(0, Math.floor((wx - 27) / 4)); gb[i] = 1; surface[i] = ground[i]; sb[i] = 1;
  }
  const survey = createSurvey({ ...area, ground, surface, groundBlock: gb, surfaceBlock: sb, ids: ['?', 'minecraft:grass_block', 'minecraft:water'] },
    { dimension: 'minecraft:overworld', readAt: '2026-11-06T09:00:00.000Z' });
  const { original, reference } = await surveyFile(survey, 'hang');
  const project = applyOperation(createProject({ name: 'Hang am Bach' }), { kind: 'batch', label: 'Bauplatz', operations: [
    { kind: 'world.set', world: createPlacement(ORIGIN, 'minecraft:overworld', 'Testhang') },
    { kind: 'terrain.set', terrain: reference },
  ] }).project;
  // An own collection with ten catalogue buildings and a sub-folder.
  const buildings = await createBuildingLibrary();
  const ids = buildings.assets.filter(a => a.id.startsWith('bld_') && !a.archived).slice(0, 10).map(a => a.id);
  ownName = 'Meine Siedlung';
  let root = createCollection({ name: ownName, id: 'col_e2e_siedlung' });
  for (const id of ids.slice(0, 7)) root = addToCollection(root, { kind: 'asset', assetId: id });
  let child = createCollection({ name: 'Werkstätten', parentId: root.id, id: 'col_e2e_werk' });
  for (const id of ids.slice(7)) child = addToCollection(child, { kind: 'asset', assetId: id });
  backup = serializeBackup(await createBackup({ projects: [project], assets: [], versions: new Map(), collections: [{ ...root, revision: 1 }, { ...child, revision: 1 }], templates: [],
    getOriginal: async sha => sha === original.sha256 ? original : null }, 'all'));

  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.kill(); });

const storedProjects = p => p.evaluate(() => new Promise((resolve, reject) => {
  const r = indexedDB.open('minecraft-bauplaner');
  r.onsuccess = () => { const q = r.result.transaction('projects').objectStore('projects').getAll(); q.onsuccess = () => { r.result.close(); resolve(q.result); }; q.onerror = () => reject(q.error); };
  r.onerror = () => reject(r.error);
}));

async function restore(p) {
  await p.goto(BASE);
  await waitForStart(p);
  await p.getByLabel('Sicherung wiederherstellen …').setInputFiles({ name: 'hang.bauplaner.json', mimeType: 'application/json', buffer: Buffer.from(backup) });
  await p.getByRole('button', { name: 'Wiederherstellen', exact: true }).click();
  await p.getByText(/^Wiederhergestellt\./).waitFor();
}

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Basis und Großprojekt auf dem Gelände, eigenes Großprojekt aus der Sammlung (${viewport.width}px)`, async () => {
    const context = await browser.newContext({ viewport });
    const p = await context.newPage();
    p.setDefaultTimeout(60_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await restore(p);
    const wide = viewport.width > 500;

    // Basisplaner: target with terrain → landscape controls; real coast drawn in the site map.
    await p.goto(`${BASE}#/bibliothek/basis`);
    await p.getByRole('heading', { name: 'Küstenbasis' }).waitFor();
    assert.equal(await p.getByTestId('base-landscape').count(), 0, 'without a target no terrain controls');
    await p.getByLabel('Vorlage').selectOption('starterbasis');
    await p.getByLabel('Zielprojekt').selectOption({ label: 'Hang am Bach' });
    await p.getByTestId('base-landscape').waitFor();
    await p.getByTestId('base-coast').waitFor();
    assert.ok(await p.getByTestId('base-coast-water').count() === 1, 'creek drawn');
    await p.getByLabel('Wegenetz', { exact: true }).selectOption('landschaft');
    await p.getByTestId('base-landscape').getByText('Bauplätze einebnen').click();
    const report = p.getByTestId('base-landscape-report');
    // The first ring around a levelled site stays at site level (Spielprüfstand 07.11.): on this gentle slope the
    // network then runs without a height change – stairs only where it rises, never an open step.
    await report.getByText(/Bauplatzspalten eingeebnet/).waitFor();
    assert.match(await report.innerText(), /Weg \d+ Felder/);
    assert.doesNotMatch(await report.innerText(), /ohne Stufe/);
    await p.getByTestId('base-conflicts').getByText('keine').waitFor();
    if (!wide) assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'keine horizontale Überbreite (Basis)');
    await p.getByRole('button', { name: 'In Projekt einfügen' }).click();
    await p.getByText(/Basis in „Hang am Bach“ eingefügt.*Gelände angepasst/).waitFor();
    let target = (await storedProjects(p)).find(x => x.name === 'Hang am Bach');
    assert.ok(target.terrainDesign, 'design stored with the project');
    assert.ok(target.instances.length > 5);
    assert.ok(!target.instances.some(i => i.name === 'Wegenetz'), 'no flat network part');
    assert.ok(target.instances.some(i => i.name === 'Laternen am Weg'), 'lamp posts on the terrain');
    const firstDesign = target.terrainDesign.sha256;

    // Großprojekt: streets as landscape network, sites levelled with quay walls; the creek runs under some quarters.
    await p.goto(`${BASE}#/bibliothek/grossprojekte/gp_marktstadt`);
    await p.getByRole('heading', { name: 'Marktstadt', exact: false }).first().waitFor();
    await p.getByRole('combobox', { name: 'Ziel' }).or(p.locator('.anlage-target select').first()).first().selectOption({ label: 'In „Hang am Bach“ einfügen' });
    await p.getByTestId('gp-landscape').waitFor();
    // Beside the base the town would leave the survey: search the flattest place inside it.
    await p.getByRole('button', { name: 'Flachsten Platz in der Geländeaufnahme suchen' }).click();
    await p.getByText(/^Flachster Platz: Versatz/).waitFor();
    await p.getByTestId('gp-water-edges').waitFor();
    await p.getByLabel('Straßennetz', { exact: true }).selectOption('landschaft');
    await p.getByTestId('gp-landscape').getByText('Bauplätze einebnen').click();
    const gpReport = p.getByTestId('gp-landscape-report');
    await gpReport.getByText(/Weg [1-9]/).waitFor();
    await p.getByTestId('gp-conflicts').getByText('keine').waitFor();
    if (!wide) assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'keine horizontale Überbreite (Großprojekt)');
    await p.getByRole('button', { name: 'In Projekt einfügen' }).click();
    await p.getByText(/in „Hang am Bach“ eingefügt.*Gelände angepasst/).waitFor();
    target = (await storedProjects(p)).find(x => x.name === 'Hang am Bach');
    assert.notEqual(target.terrainDesign.sha256, firstDesign, 'the design keeps the base and adds the town');

    // Eigenes Großprojekt aus der Sammlung.
    await p.goto(`${BASE}#/bibliothek/grossprojekte`);
    const own = p.getByTestId('gp-own');
    await own.getByLabel('Sammlung für ein eigenes Großprojekt').selectOption({ label: ownName });
    await own.getByRole('link', { name: 'Als Großprojekt planen' }).click();
    await p.getByRole('heading', { name: ownName }).first().waitFor();
    await p.getByTestId('gp-buildings').getByText(/^10/).waitFor();
    await p.locator('[data-quarter]').filter({ hasText: 'Werkstätten' }).first().waitFor();
    await p.getByTestId('gp-conflicts').getByText('keine').waitFor();
    assert.deepEqual(errors, []);
    await context.close();
  });
}
