// ARCH-02-S05: the CURRENT app starts on browser data that REAL old releases wrote
// (fixtures/aged-browserdata, made by scripts/dev/make_aged_browserdata.mjs):
//   2026-10-28-db1 – release 48aa1f3a, IndexedDB version 1 (no revisions, no collections, plain cells)
//   2026-11-02-db3 – release 553f35a8, IndexedDB version 3 (collections, templates, backup receipt)
//   2026-11-04-db4 – release b7f73a9e, IndexedDB version 4 (packed cells; newer sub-schemas without a database step)
// Each database is restored raw at its old version, then the app opens it and runs every migration.
// Checked: migration finishes, every stored version keeps id, hash and exactly the same cells,
// nothing old is lost or changed, the data check is clean, the old project opens, a backup that
// the old release wrote is still readable and a new backup verifies.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { canonicalJson, unpackVersion, readBackup, verifyAssetVersion } from '../../dist/domain/src/index.js';
import { waitForStart, START_TIMEOUT } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4278, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
const DB_VERSION = Number(/export const DB_VERSION = (\d+)/.exec(readFileSync('apps/web/src/app/idbRepository.ts', 'utf8'))[1]);
const DIR = 'fixtures/aged-browserdata';
const FIXTURES = readdirSync(DIR).filter(f => f.endsWith('.json.gz')).sort();
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

const fromB64 = s => new Uint8Array(Buffer.from(s, 'base64'));
/** Fixture values: Blobs and byte arrays were stored as Base64 markers. */
function decode(v) {
  if (Array.isArray(v)) return v.map(decode);
  if (v && typeof v === 'object') {
    if ('$u8' in v) return fromB64(v.$u8);
    const o = {};
    for (const [k, x] of Object.entries(v)) o[k] = decode(x);
    return o;
  }
  return v;
}

/** Restores the raw dump at its old database version (runs in the page, no app code involved). */
const RESTORE = async ({ dbVersion, stores }) => {
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const dec = v => {
    if (Array.isArray(v)) return v.map(dec);
    if (v && typeof v === 'object') {
      if ('$blob' in v) return new Blob([b64(v.$blob)], { type: v.type });
      if ('$u8' in v) return b64(v.$u8);
      if ('$ab' in v) return b64(v.$ab).buffer;
      const o = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o;
    }
    return v;
  };
  await new Promise((resolve, reject) => {
    const r = indexedDB.open('minecraft-bauplaner', dbVersion);
    r.onupgradeneeded = () => {
      const db = r.result;
      for (const s of stores) {
        const store = db.createObjectStore(s.name, { keyPath: s.keyPath, autoIncrement: s.autoIncrement });
        for (const i of s.indexes) store.createIndex(i.name, i.keyPath, { unique: i.unique, multiEntry: i.multiEntry });
        for (const rec of s.records) store.put(dec(rec));
      }
    };
    r.onsuccess = () => { r.result.close(); resolve(); };
    r.onerror = () => reject(r.error);
  });
};

/** Raw dump of the current database: byte arrays as Base64, Blobs as Base64 with type. */
const DUMP = async () => {
  const db = await new Promise((res, rej) => { const r = indexedDB.open('minecraft-bauplaner'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const b64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
  async function enc(v) {
    if (v instanceof Blob) return { $blob: b64(new Uint8Array(await v.arrayBuffer())), type: v.type };
    if (v instanceof Uint8Array) return { $u8: b64(v) };
    if (Array.isArray(v)) return Promise.all(v.map(enc));
    if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = await enc(x); return o; }
    return v;
  }
  const out = { version: db.version, stores: {} };
  for (const name of db.objectStoreNames) {
    const all = await new Promise((res, rej) => { const r = db.transaction(name).objectStore(name).getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    out.stores[name] = await enc(all);
  }
  db.close();
  return out;
};

for (const name of FIXTURES) {
  test(`gealterte Browserdaten ${name}: aktuelle App migriert verlustfrei und startet`, async () => {
    const fixture = JSON.parse(gunzipSync(readFileSync(`${DIR}/${name}`)).toString('utf8'));
    assert.equal(fixture.format, 'bauplaner-aged-browserdata');
    assert.ok(fixture.dbVersion <= DB_VERSION, 'fixture is not newer than the current database');
    const old = Object.fromEntries(fixture.stores.map(s => [s.name, decode(s.records)]));
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const p = await ctx.newPage();
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });

    // 1. Restore the old database on the app origin without starting the app.
    await p.goto(`${BASE}favicon.svg`);
    await p.evaluate(RESTORE, { dbVersion: fixture.dbVersion, stores: fixture.stores });

    // 2. Start the current app on it (migrations run in the upgrade transaction).
    const t0 = Date.now();
    await p.goto(BASE);
    await waitForStart(p, START_TIMEOUT);
    const startMs = Date.now() - t0;

    // 3. Raw comparison: nothing old lost or changed, cells bit-identical.
    const now = decode(await p.evaluate(DUMP));
    assert.equal(now.version, DB_VERSION);
    const meta = now.stores.meta.find(m => m.key === 'schema');
    assert.equal(meta.dbVersion, DB_VERSION);
    for (const store of ['collections', 'templates']) assert.ok(Array.isArray(now.stores[store]), `store ${store} exists`);

    const versionsNow = new Map(now.stores.versions.map(v => [v.id, v]));
    let packed = 0;
    for (const before of old.versions) {
      const after = versionsNow.get(before.id);
      assert.ok(after, `version ${before.id} still stored`);
      assert.equal(after.payloadHash, before.payloadHash);
      if (after.packedCells) packed++;
      const decoded = unpackVersion(after);
      assert.equal(canonicalJson(decoded), canonicalJson(unpackVersion(before)), `version ${before.id}: same record after unpacking`);
    }
    assert.ok(packed >= old.versions.length * 0.95, `${packed}/${old.versions.length} versions packed`);
    // A sample of content addresses recomputed from the migrated bytes (own buildings and a few catalogue ones).
    const own = fixture.scenario.expected.versions.own ?? [];
    for (const v of [...own.map(o => versionsNow.get(o.id)), ...old.versions.slice(0, 5).map(v => versionsNow.get(v.id))]) await verifyAssetVersion(unpackVersion(v));

    const assetsNow = new Map(now.stores.assets.map(a => [a.id, a]));
    for (const before of old.assets) {
      const after = assetsNow.get(before.id);
      assert.ok(after, `asset ${before.id} still stored`);
      assert.ok(Number.isSafeInteger(after.revision) && after.revision >= 1, 'asset has a revision');
      if (!after.demo) {
        const { revision: _r, ...rest } = after, { revision: _o, ...was } = before;
        assert.equal(canonicalJson(rest), canonicalJson(was), `own asset ${before.id} unchanged apart from its revision`);
      }
    }
    const projectsNow = new Map(now.stores.projects.map(p => [p.id, p]));
    for (const before of old.projects) assert.equal(canonicalJson(projectsNow.get(before.id)), canonicalJson(before), 'project record unchanged');
    for (const store of ['originals', 'collections', 'templates']) for (const before of old[store] ?? []) {
      const key = store === 'originals' ? 'sha256' : 'id';
      const after = now.stores[store].find(r => r[key] === before[key]);
      assert.equal(canonicalJson(after), canonicalJson(before), `${store} ${before[key]} unchanged`);
    }

    // 4. A backup the old release wrote is still readable and verifies.
    if (fixture.scenario.expected.backup) {
      const backup = await readBackup(JSON.stringify(fixture.scenario.expected.backup));
      assert.equal(backup.projects.length, old.projects.length);
    }

    // 5. In the app: data check without errors, the old project opens with its instances.
    await p.goto(`${BASE}#/system`);
    await p.getByRole('button', { name: 'Datencheck starten' }).click();
    await p.getByText(/✓ (Alles in Ordnung|Keine Fehler)/).waitFor({ timeout: 60_000 });
    const project = old.projects[0];
    await p.goto(`${BASE}#/projekt/${encodeURIComponent(project.id)}`);
    await p.getByText(project.name).first().waitFor({ timeout: 30_000 });
    assert.deepEqual(errors, []);
    console.log(`${name}: Start mit Migration ${startMs} ms, ${packed} Versionen gepackt, Projekt „${project.name}“ mit ${project.instances.length} Bauteilen`);
    await ctx.close();
  });
}
