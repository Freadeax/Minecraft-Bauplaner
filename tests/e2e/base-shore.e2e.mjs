// TERRAIN-03-S06 in a real browser: Basisplaner auf Gelände – Wasserseite und echte Uferlinie aus der
// Geländeaufnahme des Zielprojekts, Verschiebung ans Ufer, Übernahme an der verschobenen Stelle.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_TEMPLATES, SURVEY_UNKNOWN, applyOperation, createBackup, createBuildingLibrary, createPlacement, createProject, createSurvey, layoutBase, serializeBackup, surveyFile,
} from '../../dist/domain/src/index.js';

const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = 4331, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
const ORIGIN = [0, 64, 0], SEAWARD = 6;
let server, browser, backup, plannedLine;

before(async () => {
  // Same layout as the page's default (Küstenbasis, water south) to know where its shore is planned.
  const buildings = await createBuildingLibrary();
  const layout = layoutBase({ assets: buildings.assets, versions: new Map(buildings.versions.map(v => [v.id, v])) }, { template: BASE_TEMPLATES[0].id });
  assert.equal(layout.water.side, 'sued');
  plannedLine = layout.water.line + ORIGIN[2];
  // Survey around the base: grass at y 63, a straight coast SEAWARD blocks south of the planned shore.
  const e = layout.extent, margin = 80;
  const area = { minX: e.x0 - margin, minZ: e.z0 - margin, width: Math.min(512, e.x1 - e.x0 + 2 * margin), length: Math.min(512, e.z1 - e.z0 + 2 * margin) };
  const n = area.width * area.length;
  const ground = new Int16Array(n), surface = new Int16Array(n), gb = new Uint16Array(n), sb = new Uint16Array(n);
  for (let z = 0; z < area.length; z++) for (let x = 0; x < area.width; x++) {
    const i = x + z * area.width, wz = area.minZ + z;
    if (wz >= plannedLine + SEAWARD) { ground[i] = 58; gb[i] = 1; surface[i] = 62; sb[i] = 2; } else { ground[i] = 63; gb[i] = 1; surface[i] = 63; sb[i] = 1; }
  }
  assert.ok(!ground.includes(SURVEY_UNKNOWN));
  const survey = createSurvey({ ...area, ground, surface, groundBlock: gb, surfaceBlock: sb, ids: ['?', 'minecraft:grass_block', 'minecraft:water'] },
    { dimension: 'minecraft:overworld', readAt: '2026-11-05T10:00:00.000Z' });
  const { original, reference } = await surveyFile(survey, 'kueste');
  const project = applyOperation(createProject({ name: 'Bucht am Meer' }), { kind: 'batch', label: 'Bauplatz', operations: [
    { kind: 'world.set', world: createPlacement(ORIGIN, 'minecraft:overworld', 'Testküste') },
    { kind: 'terrain.set', terrain: reference },
  ] }).project;
  backup = serializeBackup(await createBackup({ projects: [project], assets: [], versions: new Map(), getOriginal: async sha => sha === original.sha256 ? original : null }, 'project', [project.id]));

  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.kill(); });

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Basisplaner auf Gelände: Küste aus der Geländeaufnahme, ans Ufer schieben, übernehmen (${viewport.width}px)`, async () => {
    const context = await browser.newContext({ viewport });
    const p = await context.newPage();
    p.setDefaultTimeout(30_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    // Project with world position and terrain survey from a backup.
    await p.goto(BASE);
    await p.getByLabel('Sicherung wiederherstellen …').setInputFiles({ name: 'kueste.bauplaner.json', mimeType: 'application/json', buffer: Buffer.from(backup) });
    await p.getByRole('button', { name: 'Wiederherstellen', exact: true }).click();
    await p.getByText(/^Wiederhergestellt\./).waitFor();

    await p.goto(`${BASE}#/bibliothek/basis`);
    await p.getByRole('heading', { name: 'Küstenbasis' }).waitFor();
    // Without a target project there is no terrain: no shore check.
    assert.equal(await p.getByTestId('base-shore').count(), 0);
    await p.getByLabel('Zielprojekt').selectOption({ label: 'Bucht am Meer' });
    const shore = p.getByTestId('base-shore');
    await shore.getByText('Uferlinie weicht vom echten Ufer ab').waitFor();
    assert.match(await shore.innerText(), /Küste im Süden/);
    assert.match(await shore.innerText(), new RegExp(`Echtes Ufer ${SEAWARD} Blöcke`));
    assert.match(await shore.innerText(), /Stegspalten an Land/);

    // Planned without water, the page finds the coast south of the base and offers that side.
    await p.getByLabel('Wasserseite').selectOption('keine');
    await shore.getByText('Wasserseite passt nicht zum Gelände').waitFor();
    assert.match(await shore.innerText(), /Küste im Süden: 100 % der Reihen/);
    await shore.getByRole('button', { name: 'Wasserseite übernehmen: Süden' }).click();
    assert.equal(await p.getByLabel('Wasserseite').inputValue(), 'sued');

    // Shift onto the real shore, then the planned shore lies on it.
    await shore.getByRole('button', { name: `Ans echte Ufer schieben (${SEAWARD} nach Süden)` }).click();
    await shore.getByText('Uferlinie liegt am echten Ufer').waitFor();
    await shore.getByRole('button', { name: `Verschiebung zurücksetzen (${SEAWARD} nach Süden)` }).waitFor();
    await p.getByTestId('base-conflicts').getByText('keine').waitFor();
    if (viewport.width < 500) assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'keine horizontale Überbreite');

    // Adoption uses the shifted offset: the harbour piers stand south of the real shore.
    await p.getByRole('button', { name: 'In Projekt einfügen' }).click();
    await p.getByText(/Basis in „Bucht am Meer“ eingefügt/).waitFor();
    const stored = await p.evaluate(() => new Promise((resolve, reject) => {
      const r = indexedDB.open('minecraft-bauplaner');
      r.onsuccess = () => { const q = r.result.transaction('projects').objectStore('projects').getAll(); q.onsuccess = () => { r.result.close(); resolve(q.result); }; q.onerror = () => reject(q.error); };
      r.onerror = () => reject(r.error);
    }));
    const target = stored.find(x => x.name === 'Bucht am Meer');
    assert.ok(target.instances.length > 10);
    const piers = target.instances.filter(i => /Steg/.test(i.name));
    assert.ok(piers.length > 0, 'Stege übernommen');
    for (const pier of piers) assert.ok(pier.transform.position[2] + ORIGIN[2] >= plannedLine + SEAWARD - 1, `${pier.name} liegt am echten Ufer`);
    assert.deepEqual(errors, []);
    await context.close();
  });
}
