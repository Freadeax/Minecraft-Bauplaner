// Browser check of the world map (MAP-01): placing, top view, 3D flight, collisions, undo, persistence, live map links.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4213, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

async function sample(p) {
  await p.goto(`${BASE}#/`);
  await openSampleProject(p);
  await p.waitForURL(/#\/projekt\//);
}
const ready = p => p.locator('.map-page[data-map-state=ready]').waitFor({ timeout: 20_000 });

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Weltkarte: platzieren, fliegen, Überschneidung, Rückgängig, dauerhaft, Live-Karte (${viewport.width}px)`, async () => {
    const context = await browser.newContext({ viewport, acceptDownloads: true });
    const p = await context.newPage();
    p.setDefaultTimeout(10_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await sample(p); await sample(p);

    await p.goto(`${BASE}#/karte`);
    await ready(p);
    await p.getByRole('heading', { name: 'Weltkarte' }).waitFor();
    await p.getByText(/Gelände ungeprüft/).waitFor();
    const unplaced = p.locator('.map-unplaced li');
    assert.equal(await unplaced.count(), 2);
    assert.equal(await p.locator('.map-page').getAttribute('data-map-cells'), '0');

    // Place both: the second lands east of the first, chunk aligned.
    await unplaced.first().getByRole('button', { name: 'Platzieren' }).click();
    await p.getByRole('status').filter({ hasText: 'Auf die Weltkarte gesetzt' }).waitFor();
    await ready(p);
    await p.locator('.map-unplaced li').first().getByRole('button', { name: 'Platzieren' }).click();
    await p.locator('.map-entry').nth(1).waitFor();
    await ready(p);
    const origins = await p.locator('.map-entry-main small:first-of-type').allInnerTexts();
    assert.deepEqual(origins.map(t => t.trim()).sort(), ['X 0 · Y 64 · Z 0', 'X 48 · Y 64 · Z 0']);
    assert.equal(await p.locator('.map-page').getAttribute('data-map-cells'), '700', 'both 350-block walls are drawn');
    assert.equal(await p.locator('.map-unplaced').count(), 0);

    // 3D view: “Hinfliegen” moves the camera to the selected project.
    const host = p.locator('.map-3d .canvas-host');
    await host.waitFor();
    await p.waitForFunction(() => document.querySelector('.map-3d .canvas-host')?.getAttribute('data-blocks') === '700');
    await p.locator('.map-entry').first().getByRole('button', { name: /fliegen/ }).click();
    const camA = await host.getAttribute('data-camera');
    await p.locator('.map-entry').nth(1).getByRole('button', { name: /fliegen/ }).click();
    await p.waitForFunction(a => document.querySelector('.map-3d .canvas-host')?.getAttribute('data-camera') !== a, camA);
    const detail = p.locator('.map-detail');
    await detail.getByText('X 48 · Y 64 · Z 0').first().waitFor();
    await detail.getByText('26 × 4 Blöcke, 8 hoch').waitFor();
    assert.match(p.url(), /#\/karte\?projekt=/, 'selection is in the address');

    // Free flight works on the map like in the viewer.
    await p.getByRole('button', { name: 'Freier Flug' }).click();
    await p.locator('.map-3d .canvas-host[data-mode=flight]').waitFor();
    await p.getByRole('button', { name: /Flug beenden/ }).click();

    // Top view: clicking a footprint selects; the cursor shows world coordinates and chunk.
    const canvas = p.locator('.overview-canvas');
    await p.getByRole('button', { name: 'Alles' }).click();
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await p.locator('.overview-hud').getByText(/Chunk -?\d+, -?\d+/).waitFor();

    // Move the second wall two blocks east of the first: preview warns, saving reports the collision.
    await detail.getByLabel('Ursprung X').fill('2');
    await detail.getByText(/berührt die Fläche von/).waitFor();
    await detail.getByRole('button', { name: 'Lage speichern' }).click();
    await ready(p);
    await p.locator('.map-detail [role=alert]').filter({ hasText: 'Überschneidung mit' }).waitFor();
    await p.locator('.map-entry em').filter({ hasText: 'Überschneidung' }).first().waitFor();

    // Undo restores X 48 and clears the collision.
    await p.getByRole('button', { name: 'Rückgängig' }).click();
    await p.getByRole('status').filter({ hasText: 'Rückgängig gemacht' }).waitFor();
    await ready(p);
    await p.locator('.map-detail').getByText('X 48 · Y 64 · Z 0').first().waitFor();
    assert.equal(await p.locator('.map-entry em').count(), 0);

    // Progress colouring and the colour legend.
    await p.getByRole('group', { name: 'Färbung' }).getByRole('button', { name: 'Fortschritt' }).click();
    await p.locator('.map-legend').getByText(/keine Messung im Spiel/).waitFor();

    // Persistence: placements survive a reload, selection comes back from the address.
    await p.reload();
    await ready(p);
    assert.equal(await p.locator('.map-entry').count(), 2);
    await p.locator('.map-detail').waitFor();

    // Other dimension is empty; switching back shows both.
    await p.getByRole('group', { name: 'Dimension' }).getByRole('button', { name: 'Nether' }).click();
    await ready(p);
    await p.getByText(/In dieser Dimension liegt noch kein Projekt/).waitFor();
    await p.getByRole('group', { name: 'Dimension' }).getByRole('button', { name: 'Oberwelt' }).click();
    await ready(p);
    await p.locator('.map-entry').first().getByRole('button', { name: /fliegen/ }).click();

    // Live map: a pasted BlueMap link becomes a template; the project link points at its centre.
    // A real link typed into the template field (no placeholders) is converted, not rejected.
    await p.getByText('Server-Webkarte verknüpfen').click();
    await p.getByText('Erweitert: Vorlage, Kartennamen, Einbetten, Export').click();
    await p.getByLabel(/URL-Vorlage/).fill('http://server.example.net:8100/#1026:-2532:4:-2699:190:0:0.61:0:0:perspective');
    await p.getByText(/Link erkannt \(BlueMap-Format\): Karte „1026“ gilt jetzt für Oberwelt/).waitFor();
    assert.equal(await p.getByLabel(/URL-Vorlage/).inputValue(), 'http://server.example.net:8100/#{world}:{x}:{y}:{z}:190:0:0.61:0:0:perspective');
    assert.equal(await p.locator('.live-panel .field-error').count(), 0);
    await p.getByLabel('Link aus eurer Server-Karte').fill('https://karte.example.net/#world:12:64:-30:150:0:0.9:0:0:perspective');
    await p.getByRole('button', { name: 'Übernehmen' }).click();
    await p.getByText(/BlueMap-Format/).waitFor();
    await p.getByRole('link', { name: 'BlueMap öffnen ↗' }).waitFor();
    const link = p.locator('.map-detail a[target=_blank]');
    assert.equal(await link.getAttribute('href'), 'https://karte.example.net/#world:13:72:2:150:0:0.9:0:0:perspective');
    const download = p.waitForEvent('download');
    await p.getByRole('button', { name: 'Marker (JSON, Bauplaner-Format) herunterladen' }).click();
    const file = await download;
    const markers = JSON.parse(await (await file.createReadStream()).toArray().then(b => Buffer.concat(b).toString('utf8')));
    assert.equal(markers.format, 'bauplaner-world-markers');
    assert.equal(markers.markers.length, 2);

    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no horizontal scrolling');
    assert.deepEqual(errors, []);
    await context.close();
  });
}
