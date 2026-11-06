// ARCH-02 / STORE-03 in the browser: IndexedDB migration 3 → 4 packs stored
// version cells without changing them, the system page shows the data model,
// and the building page lists where a building is used.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createAsset, addAssetVersion, sampleWallPayload } from '../../dist/domain/src/index.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4271, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

const newContext = () => browser.newContext({ viewport: { width: 1400, height: 1000 } });
function watch(p) {
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  p.setDefaultTimeout(15_000);
  return errors;
}

/** Raw IndexedDB access on the app origin (no app code involved). */
const readRaw = (p, store, key) => p.evaluate(([store, key]) => new Promise((resolve, reject) => {
  const r = indexedDB.open('minecraft-bauplaner');
  r.onsuccess = () => {
    const db = r.result, g = db.transaction(store).objectStore(store).get(key);
    g.onsuccess = () => { const v = g.result; db.close(); resolve(v && v.packedCells ? { ...v, packedCells: { ...v.packedCells, bytes: Array.from(v.packedCells.bytes), isBytes: v.packedCells.bytes instanceof Uint8Array } } : v); };
    g.onerror = () => reject(g.error);
  };
  r.onerror = () => reject(r.error);
}), [store, key]);

test('migration 3 → 4: a stored plain version is packed in place and still opens unchanged', async () => {
  const asset = createAsset({ name: 'Altbestand-Mauer', provenance: { author: 'Test', source: 'eigener Entwurf', license: '' } });
  const { asset: stored, version } = await addAssetVersion(asset, { payload: sampleWallPayload(), label: '1.0', source: { format: 'voxel-json' } });
  const ctx = await newContext();
  const p = await ctx.newPage();
  const errors = watch(p);
  // A blank page on the app origin creates the database exactly as release 3 left it.
  await p.route(`${BASE}leer.html`, r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>leer</title>' }));
  await p.goto(`${BASE}leer.html`);
  await p.evaluate(([asset, version]) => new Promise((resolve, reject) => {
    const r = indexedDB.open('minecraft-bauplaner', 3);
    r.onupgradeneeded = () => {
      const db = r.result;
      for (const [name, keyPath] of [['projects', 'id'], ['assets', 'id'], ['versions', 'id'], ['originals', 'sha256'], ['meta', 'key'], ['collections', 'id'], ['templates', 'id']]) db.createObjectStore(name, { keyPath });
      const tx = r.transaction;
      tx.objectStore('assets').put({ ...asset, revision: 1 });
      tx.objectStore('versions').put(version);
      tx.objectStore('meta').put({ key: 'schema', dbVersion: 3, domainSchemaVersion: 1, migratedAt: new Date().toISOString() });
    };
    r.onsuccess = () => { r.result.close(); resolve(); };
    r.onerror = () => reject(r.error);
  }), [stored, version]);
  const before = await readRaw(p, 'versions', version.id);
  assert.equal(before.payload.cells.length, version.payload.cells.length, 'fixture is a plain release-3 record');

  await p.goto(`${BASE}#/bibliothek`);
  await p.getByRole('heading', { name: /Bibliothek|Gebäude/ }).first().waitFor();
  await p.waitForFunction(() => new Promise(resolve => { const r = indexedDB.open('minecraft-bauplaner'); r.onsuccess = () => { const v = r.result.version; r.result.close(); resolve(v === 4); }; r.onerror = () => resolve(false); }));
  const after = await readRaw(p, 'versions', version.id);
  assert.equal('cells' in after.payload, false, 'cell list moved into packedCells');
  assert.equal(after.packedCells.encoding, 'bp-cells-1');
  assert.equal(after.packedCells.isBytes, true, 'stored as binary, not as text');
  assert.equal(after.packedCells.count, version.payload.cells.length);
  assert.ok(after.packedCells.bytes.length * 10 < JSON.stringify(version.payload.cells).length, 'much smaller');
  assert.equal(after.payloadHash, version.payloadHash); assert.equal(after.id, version.id);
  const meta = await readRaw(p, 'meta', 'schema');
  assert.equal(meta.dbVersion, 4);
  // The data check below recomputes every content address from the decoded cells: a single changed cell would be a VERSION_HASH error.
  await p.goto(`${BASE}#/system`);
  await p.getByRole('button', { name: 'Datencheck starten' }).click();
  await p.getByText(/✓ (Alles in Ordnung|Keine Fehler)/).waitFor();
  const model = p.locator('section.datamodel');
  await model.getByText('Verweise zwischen Datensätzen').waitFor();
  assert.match(await model.innerText(), /× kleiner/);
  assert.match(await model.innerText(), /Im Arbeitsspeicher entpackt[\s\S]*Grenze 2[.,]000[.,]000/, 'compact runtime form: budget shown');
  assert.ok(Number(await model.locator('[data-packed-bytes]').getAttribute('data-packed-bytes')) > 0);
  assert.match(await model.locator('[data-kind="version"]').innerText(), /Bauteilversion/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('building page: "Verwendet in" names the project after the building is added', async () => {
  const ctx = await newContext();
  const p = await ctx.newPage();
  const errors = watch(p);
  await p.goto(`${BASE}#/bibliothek/gebaeude/bld_dorfbrunnen`);
  const usage = p.locator('.usage-section');
  await usage.getByText('Noch in keinem Projekt').waitFor();
  await p.getByRole('button', { name: 'Neues Projekt damit starten' }).click();
  await p.waitForURL(/#\/projekt\//);
  await p.locator('.save-state.saved').waitFor();
  const projectUrl = p.url();
  await p.goto(`${BASE}#/bibliothek/gebaeude/bld_dorfbrunnen`);
  await p.locator('.usage-section[data-usage-count="1"]').waitFor();
  const entry = p.locator('.usage-list li').first();
  assert.match(await entry.innerText(), /Projekt[\s\S]*platzierte Instanz/i);
  const href = await entry.locator('a').getAttribute('href');
  assert.ok(projectUrl.endsWith(href), `${href} → ${projectUrl}`);
  assert.deepEqual(errors, []);
  await ctx.close();
});
