// GAME-02: Mod-Download-Seite im echten Chromium (Pages-Build unter Unterpfad). Die .jar liegt in
// downloads/mod/ und wird auf Pages direkt aus main ausgeliefert; vite preview kennt den Ordner
// nicht, deshalb beantwortet der Test Abrufe dieser Dateien aus dem Arbeitsbaum.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const PORT = 4214, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
const { releases } = JSON.parse(readFileSync('apps/web/src/views/mod/releases.json', 'utf8'));
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

for (const viewport of [{ width: 1400, height: 900 }, { width: 390, height: 844 }]) {
  test(`Mod wählen und herunterladen (${viewport.width} px)`, async () => {
    const context = await browser.newContext({ viewport, acceptDownloads: true });
    const p = await context.newPage();
    p.setDefaultTimeout(10_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await context.route('**/downloads/mod/*.jar', route => {
      const file = new URL(route.request().url()).pathname.split('/').pop();
      route.fulfill({ status: 200, contentType: 'application/java-archive', body: readFileSync(`downloads/mod/${file}`) });
    });
    await p.goto(`${BASE}#/`);
    await p.getByRole('link', { name: 'Minecraft-Mod' }).click();
    await p.getByRole('heading', { name: 'Mod herunterladen' }).waitFor();
    assert.equal(await p.title(), 'Mod herunterladen · LMNT Build Studio');
    const byVersion = (a, b) => b.minecraft.localeCompare(a.minecraft, 'de', { numeric: true }) || b.modVersion.localeCompare(a.modVersion, 'de', { numeric: true });
    // Vorauswahl: neueste Minecraft-Version, Fabric, neueste Mod-Version.
    const newest = releases.filter(r => r.loader === 'fabric').toSorted(byVersion)[0];
    const older = releases.find(r => r.loader === 'fabric' && r.minecraft === newest.minecraft && r.modVersion !== newest.modVersion);
    assert.equal(await p.getByLabel('Minecraft-Version').inputValue(), newest.minecraft);
    assert.equal(await p.getByLabel('Mod-Loader').inputValue(), 'fabric');
    assert.equal(await p.locator('option[value=forge]').evaluate(o => o.disabled), true, 'geplante Loader nicht wählbar');
    // NeoForge-Mod (GAME-05): eigene .jar und eigener Installationsschritt.
    const neo = releases.find(r => r.loader === 'neoforge' && r.minecraft === newest.minecraft);
    if (neo) {
      await p.getByLabel('Mod-Loader').selectOption('neoforge');
      assert.equal(await p.getByRole('link', { name: /herunterladen$/ }).getAttribute('href'), `/Minecraft-Bauplaner/downloads/mod/${neo.file}`);
      assert.ok(await p.getByText(/NeoForge-Instanz/).isVisible());
      await p.getByLabel('Mod-Loader').selectOption('fabric');
    }
    const link = p.getByRole('link', { name: /herunterladen$/ });
    assert.equal(await link.getAttribute('href'), `/Minecraft-Bauplaner/downloads/mod/${newest.file}`);
    assert.ok(await p.getByText(newest.sha256).isVisible());
    // The page loads the jar, checks it like a launcher (size, SHA-256, ZIP end, fabric.mod.json) and saves those bytes.
    const [download] = await Promise.all([p.waitForEvent('download'), link.click()]);
    assert.equal(download.suggestedFilename(), newest.file);
    const saved = readFileSync(await download.path());
    assert.equal(saved.length, newest.bytes, 'gespeicherte Datei vollständig');
    await p.getByText(/Geprüft und gespeichert/).waitFor();
    // Browser downloads bypass request routing; the same URL fetched by the page goes through it.
    assert.equal(await p.evaluate(href => fetch(href).then(r => r.arrayBuffer()).then(b => b.byteLength), await link.getAttribute('href')), newest.bytes);
    // Ältere Mod-Versionen bleiben wählbar.
    if (older) {
      await p.getByLabel('Mod-Version').selectOption(older.modVersion);
      assert.equal(await link.getAttribute('href'), `/Minecraft-Bauplaner/downloads/mod/${older.file}`);
    }
    // Die Auswahl steht als teilbarer Link in der Adresszeile.
    await p.getByLabel('Mod-Version').selectOption(newest.modVersion);
    assert.match(p.url(), new RegExp(`#/mod\\?minecraft=${newest.minecraft.replace('.', '\\.')}&loader=fabric&version=`));
    // Paper-Plugin: eine .jar für mehrere Minecraft-Versionen, Serveranleitung statt Mod-Anleitung.
    const paper = releases.find(r => r.loader === 'paper');
    if (paper) {
      const older = paper.minecraftVersions.find(v => v !== paper.minecraft);
      await p.getByLabel('Minecraft-Version').selectOption(older);
      assert.equal(await p.getByLabel('Mod-Loader').inputValue(), 'paper', 'ältere Version nur als Paper-Plugin');
      assert.equal(await link.getAttribute('href'), `/Minecraft-Bauplaner/downloads/mod/${paper.file}`);
      await p.getByRole('heading', { name: 'Auf dem Server installieren und benutzen' }).waitFor();
      assert.ok(await p.getByText('plugins/BauplanerBridge/plans/').first().isVisible());
      assert.match(p.url(), new RegExp(`#/mod\\?minecraft=${older.replaceAll('.', '\\.')}&loader=paper&version=`));
      await p.getByLabel('Minecraft-Version').selectOption(paper.minecraft);
      await p.getByLabel('Mod-Loader').selectOption('paper');
      assert.equal(await link.getAttribute('href'), `/Minecraft-Bauplaner/downloads/mod/${paper.file}`);
    }
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'keine waagerechte Scrollleiste');
    // A cut-off download (the Modrinth "EOCD not found" case) is refused instead of saved.
    await context.unroute('**/downloads/mod/*.jar');
    await context.route('**/downloads/mod/*.jar', route => {
      const file = new URL(route.request().url()).pathname.split('/').pop();
      route.fulfill({ status: 200, contentType: 'application/java-archive', body: readFileSync(`downloads/mod/${file}`).subarray(0, 20_000) });
    });
    await p.getByLabel('Minecraft-Version').selectOption(newest.minecraft);
    await p.getByLabel('Mod-Loader').selectOption('fabric');
    let saved2 = false;
    p.on('download', () => { saved2 = true; });
    await link.click();
    await p.getByText(/Nicht gespeichert, die geladene Datei ist fehlerhaft/).waitFor();
    assert.match(await p.locator('.mod-check').innerText(), /EOCD/);
    assert.equal(saved2, false, 'fehlerhafte Datei nicht gespeichert');
    assert.deepEqual(errors, []);
    await context.close();
  });
}
