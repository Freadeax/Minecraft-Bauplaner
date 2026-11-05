// Browser check of MAP-02: saved live maps (save, switch, share as file), BlueMap/Dynmap marker export and
// a marker file taken over as Weltplan points (one undo step).
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
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

const text = async download => Buffer.concat(await (await download.createReadStream()).toArray()).toString('utf8');

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Live-Karte: gespeicherte Karten, BlueMap/Dynmap-Export, Markerdatei übernehmen (${viewport.width}px)`, async () => {
    const context = await browser.newContext({ viewport, acceptDownloads: true });
    const p = await context.newPage();
    p.setDefaultTimeout(15_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });

    await p.goto(BASE);
    await openSampleProject(p);
    await p.waitForURL(/#\/projekt\//);
    await p.goto(`${BASE}#/karte`);
    await p.locator('.map-page[data-map-state=ready]').waitFor({ timeout: 20_000 });
    await p.getByRole('button', { name: 'Platzieren' }).first().click();
    await p.getByRole('status').filter({ hasText: 'Auf die Weltkarte gesetzt' }).waitFor();

    const panel = p.locator('.live-panel');
    await panel.getByText('Server-Webkarte verknüpfen').click();
    await panel.getByLabel('Link aus eurer Server-Karte').fill('https://karte.example.net/#world:12:64:-30:150:0:0.9:0:0:perspective');
    await panel.getByRole('button', { name: 'Übernehmen', exact: true }).click();
    const saved = panel.getByRole('region', { name: 'Gespeicherte Karten' });
    await saved.getByRole('button', { name: 'Aktuelle Karte speichern' }).click();
    await saved.getByRole('listitem').filter({ hasText: 'BlueMap' }).getByRole('button', { name: 'Aktiv' }).waitFor();

    // A second map (Dynmap) – the first stays saved and can be switched back to.
    await panel.getByLabel('Link aus eurer Server-Karte').fill('https://dyn.example.net/?worldname=survival&mapname=flat&zoom=6&x=1&y=64&z=2');
    await panel.getByRole('button', { name: 'Übernehmen', exact: true }).click();
    await saved.getByRole('button', { name: 'Aktuelle Karte speichern' }).click();
    await saved.getByRole('listitem').filter({ hasText: 'Dynmap' }).getByRole('button', { name: 'Aktiv' }).waitFor();
    assert.equal(await saved.getByRole('listitem').count(), 2);

    // Share the list as a file.
    let dl = p.waitForEvent('download');
    await saved.getByRole('button', { name: 'Kartenliste herunterladen' }).click();
    const list = JSON.parse(await text(await dl));
    assert.equal(list.format, 'bauplaner-live-maps');
    assert.deepEqual(list.maps.map(m => m.name), ['Dynmap', 'BlueMap']);

    // Dynmap commands use the Dynmap world name of the active map.
    const ex = panel.getByRole('region', { name: 'Für die Server-Karte exportieren' });
    dl = p.waitForEvent('download');
    await ex.getByRole('button', { name: 'Dynmap-Befehle (.txt)' }).click();
    const cmds = await text(await dl);
    assert.match(cmds, /^dmarker addset id:bauplaner-projekte "Bauplaner: Projekte" hide:false$/m);
    assert.match(cmds, /^dmarker addarea id:projekt_\S+ ".+" set:bauplaner-projekte .* ybottom:-?\d+ ytop:-?\d+$/m);
    assert.match(cmds, /^dmarker addcorner -?\d+ -?\d+ -?\d+ survival$/m);

    // Back to BlueMap, then the BlueMap config.
    await saved.getByRole('listitem').filter({ hasText: 'BlueMap' }).getByRole('button', { name: 'Verwenden' }).click();
    await saved.getByRole('listitem').filter({ hasText: 'BlueMap' }).getByRole('button', { name: 'Aktiv' }).waitFor();
    dl = p.waitForEvent('download');
    await ex.getByRole('button', { name: 'BlueMap-Marker (.conf)' }).click();
    const conf = await text(await dl);
    assert.match(conf, /^marker-sets: \{$/m);
    assert.match(conf, /type: "extrude"/);

    // A marker file becomes two points; importing again adds nothing; one undo removes both.
    const markerFile = { schemaVersion: 1, format: 'bauplaner-world-markers', coordinateSystem: 'minecraft-blocks', markers: [
      { id: 'a', label: 'Dorf am Fluss', position: { x: 40, y: 70, z: -20, world: 'world', dimension: 'minecraft:overworld' } },
      { id: 'b', label: 'Mine', position: { x: -30, y: 12, z: 50, world: 'world', dimension: 'minecraft:overworld' } }] };
    const upload = { name: 'marker.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(markerFile)) };
    await ex.getByLabel('Markerdatei als Punkte laden').setInputFiles(upload);
    await panel.getByText(/2 Marker als Punkte \(Notiz\) in den Weltplan übernommen/).waitFor();
    await p.getByRole('status').filter({ hasText: '2 Marker als Punkte übernommen' }).waitFor();
    await ex.getByText(/· 3 Marker$/).waitFor();
    await ex.getByLabel('Markerdatei als Punkte laden').setInputFiles(upload);
    await panel.getByText(/Keine neuen Marker: 2 schon vorhanden/).waitFor();
    await p.getByRole('button', { name: 'Rückgängig' }).click();
    await p.getByRole('status').filter({ hasText: 'Rückgängig gemacht' }).waitFor();
    await ex.getByText(/· 1 Marker$/).waitFor();

    // Saved maps survive a reload; a list file merges without duplicates.
    await p.reload();
    await p.locator('.map-page[data-map-state=ready]').waitFor({ timeout: 20_000 });
    await p.locator('.live-panel').getByText('Server-Webkarte verknüpfen').click();
    const saved2 = p.getByRole('region', { name: 'Gespeicherte Karten' });
    await saved2.getByRole('button', { name: 'Karte „Dynmap“ entfernen' }).click();
    await saved2.getByLabel('Kartenliste laden').setInputFiles({ name: 'karten.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(list)) });
    await p.locator('.live-panel').getByText(/1 Karte\(n\) übernommen, 1 übersprungen/).waitFor();
    assert.equal(await saved2.getByRole('listitem').count(), 2);

    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no horizontal scrolling');
    assert.deepEqual(errors, []);
    await context.close();
  });
}
