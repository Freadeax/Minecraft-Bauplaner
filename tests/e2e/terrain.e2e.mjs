// Browser check of TERRAIN-01: building site from real region data → world map with terrain → Anlage fitted to the hillside → adoption.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { python } from '../../scripts/dev/python.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4263, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
let server, browser, dir;

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'bauplaner-terrain-e2e-'));
  const r = spawnSync(python, ['-I', '-X', 'utf8', fileURLToPath(new URL('../../scripts/fixtures/make_terrain_fixture.py', import.meta.url)), dir], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.kill(); });

const shot = async (p, name) => { if (process.env.SHOT_DIR) await p.screenshot({ path: `${process.env.SHOT_DIR}/${name}.png`, fullPage: true }); };

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Gelände: Bauplatz aus der Welt, Weltkarte mit Gelände, Anlage auf dem Hang (${viewport.width}px)`, async () => {
    const context = await browser.newContext({ viewport });
    const p = await context.newPage();
    p.setDefaultTimeout(30_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    // 1. Building site from the region file: area 1024/0 … 1183/79 (the whole hillside).
    await p.goto(`${BASE}#/welt`);
    await p.getByLabel('Regionsdateien', { exact: true }).setInputFiles([join(dir, 'r.2.0.mca')]);
    await p.getByText(/1 Regionsdateien/).waitFor();
    await p.getByLabel('Ecke 1 X').fill('1024'); await p.getByLabel('Ecke 1 Z').fill('0');
    await p.getByLabel('Ecke 2 X').fill('1183'); await p.getByLabel('Ecke 2 Z').fill('79');
    const site = p.getByRole('form', { name: 'Als Bauplatz anlegen' });
    await site.getByText('X 1024 … 1183 · Z 0 … 79 (160 × 80)').waitFor();
    await site.getByLabel('Titel des Bauplatzes').fill('Hang am Fluss');
    await site.getByRole('button', { name: 'Bauplatz anlegen' }).click();

    // 2. The world map selects the new site and draws its terrain.
    await p.waitForURL(/#\/karte\?projekt=/);
    await p.locator('.map-page[data-map-state=ready]').waitFor();
    await p.getByText(/Gelände aus 1 Geländeaufnahme/).waitFor();
    await p.getByLabel('Gelände (1)').waitFor();
    const projectId = decodeURIComponent(new URL(p.url().replace('#/karte', '')).searchParams.get('projekt'));
    assert.ok(projectId);
    // Pointer over the terrain shows the ground height there (map is framed on the survey).
    const canvas = p.locator('.overview canvas');
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await p.getByText(/Gelände Y \d+ \(grass_block\)/).waitFor();
    // The 3D scene got terrain cells on top of the (empty) plan.
    assert.ok(Number(await p.locator('.map-page').getAttribute('data-map-cells')) === 0, 'the site itself has no planned blocks');
    assert.equal(Number(await p.locator('.map-page').getAttribute('data-terrain-cells')) >= 160 * 80, true, 'one terrain cell per column at least');
    await p.locator('.map-3d canvas').first().waitFor();
    await shot(p, `terrain-map-${viewport.width}`);

    // 3. Anlage "Dorf mit Hof" into the site, fitted to the hillside.
    await p.goto(`${BASE}#/bibliothek/anlagen/anl_landleben`);
    await p.getByRole('heading', { name: 'Dorf mit Hof' }).waitFor();
    // Doors to the path are on by default and every entrance faces the path.
    const doors = p.getByLabel(/Türen zum Weg drehen/);
    assert.equal(await doors.isChecked(), true);
    const doorText = await p.locator('label', { has: doors }).innerText();
    const [, facing, all] = doorText.match(/\((\d+) von (\d+) Eingängen/);
    assert.equal(facing, all);
    assert.ok(Number(all) > 5);
    await p.getByText(/Eingang zum Weg \(automatisch gedreht\)/).first().waitFor();
    await p.getByLabel('Ziel').selectOption({ label: 'In „Hang am Fluss“ einfügen (mit Gelände)' });
    const panel = p.locator('.anlage-terrain');
    await panel.getByRole('heading', { name: 'Gelände' }).waitFor();
    await panel.getByTestId('anlage-terrain-totals').waitFor();
    await p.getByTestId('anlage-plan-terrain').waitFor({ state: 'attached' });
    // At offset 0 the north districts reach beyond the survey (z < 0): unknown columns are named, never treated as flat.
    assert.match(await panel.getByTestId('anlage-terrain-totals').innerText(), /Unbekannt\s+[1-9]/);
    await panel.getByRole('button', { name: 'Flachsten Platz suchen' }).click();
    await panel.getByText(/Platz mit den wenigsten Erdarbeiten gewählt/).waitFor();
    await p.getByText(/Versatz: x \d+, z \d+/).waitFor();
    await p.waitForFunction(() => /Unbekannt\s*0/.test(document.querySelector('[data-testid=anlage-terrain-totals]')?.textContent ?? ''));
    // Switch modes: one level vs. terraces change the totals.
    const totals = () => panel.getByTestId('anlage-terrain-totals').innerText();
    const terraces = await totals(), before = await panel.getByTestId('anlage-terrain-totals').textContent();
    await panel.getByRole('button', { name: 'Eine Ebene' }).click();
    await p.waitForFunction(t => document.querySelector('[data-testid=anlage-terrain-totals]')?.textContent !== t, before);
    assert.notEqual(await totals(), terraces);
    await panel.getByRole('button', { name: 'Terrassen (Hanglage)' }).click();
    await p.waitForFunction(() => !document.querySelector('.anlage-planner .small-note[role=status]')?.textContent?.includes('neu berechnet'));
    await shot(p, `terrain-anlage-${viewport.width}`);
    await p.getByTestId('anlage-conflicts').getByText('keine').waitFor();
    await p.getByRole('button', { name: 'In Projekt einfügen' }).click();
    await p.getByText(/in „Hang am Fluss“ eingefügt/).waitFor();

    // 4. Back on the map: the site now has blocks on terraces and an earthwork estimate from its own survey.
    await p.goto(`${BASE}#/karte?projekt=${encodeURIComponent(projectId)}`);
    await p.locator('.map-page[data-map-state=ready]').waitFor();
    const estimate = p.getByTestId('map-terrain-estimate');
    await estimate.waitFor();
    assert.match(await estimate.innerText(), /eigene Geländeaufnahme/);
    assert.match(await estimate.innerText(), /Boden im Grundriss Y [67]\d … [78]\d/);
    assert.ok(Number(await p.locator('.map-page').getAttribute('data-map-cells')) > 1000);

    // 5. The project tab "Gelände" shows the stored survey.
    await p.goto(`${BASE}#/projekt/${encodeURIComponent(projectId)}/gelaende`);
    await p.getByTestId('terrain-survey-state').getByText(/X 1024 … 1183 · Z 0 … 79/).waitFor();
    if (viewport.width < 500) assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'kein waagerechtes Scrollen');
    assert.deepEqual(errors, []);
    await context.close();
  });
}
