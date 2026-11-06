#!/usr/bin/env node
// ARCH-02-S05: "aged" browser data written by REAL old releases of the planner.
//
//   node scripts/dev/make_aged_browserdata.mjs <commit> <out.json.gz> [--port 4290]
//
// 1. Checks out <commit> as a detached git worktree (needs full history: `git fetch --unshallow`),
//    links this checkout's node_modules into it and starts that release's Vite dev server.
// 2. Opens the old app in Chromium. The old app opens IndexedDB with ITS migrations and seeds ITS
//    catalogue with ITS code – exactly what happened in Philipp's browser on that day.
// 3. Runs a usage scenario with the old release's own modules (imported from its dev server): own
//    building with several versions (one large, with air/erase cells and a chest), a generated
//    building, a project with catalogue and own buildings, site sections and stock, ticked guide
//    steps, a frozen revision, an original file; and – when the release has them – collections,
//    templates, world plan and backup receipts. Steps the release does not know are skipped and
//    listed in the fixture.
// 4. Dumps the raw database (every store with keyPath, indexes and records; Blobs as Base64) to a
//    gzip JSON fixture. tests/e2e/aged-browserdata.e2e.mjs restores it at the old database version
//    and starts the CURRENT app on it.
//
// The fixture is generated once per release and committed; the test itself needs no old checkout.
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, symlinkSync, writeFileSync, rmSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [commit, outFile] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const port = Number(process.argv[process.argv.indexOf('--port') + 1]) || 4290;
if (!commit || !outFile) { console.error('Aufruf: make_aged_browserdata.mjs <commit> <out.json.gz> [--port 4290]'); process.exit(2); }

const repo = resolve(import.meta.dirname, '../..');
const git = (...args) => spawnSync('git', args, { cwd: repo, encoding: 'utf8' });
const full = git('rev-parse', `${commit}^{commit}`).stdout.trim();
if (!full) { console.error(`Commit ${commit} nicht gefunden (Verlauf vollständig? git fetch --unshallow)`); process.exit(2); }
const date = git('show', '-s', '--format=%cI', full).stdout.trim();
const tree = join(tmpdir(), `bauplaner-aged-${full.slice(0, 10)}`);
if (!existsSync(tree)) {
  const r = git('worktree', 'add', '--detach', tree, full);
  if (r.status) { console.error(r.stderr); process.exit(1); }
}
if (!existsSync(join(tree, 'node_modules'))) symlinkSync(join(repo, 'node_modules'), join(tree, 'node_modules'));

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: tree, stdio: 'ignore' });
const BASE = `http://127.0.0.1:${port}/Minecraft-Bauplaner/`;
const profile = join(tmpdir(), `bauplaner-aged-profile-${port}`);
rmSync(profile, { recursive: true, force: true });
let context;
try {
  for (let i = 0; i < 150; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch { /* starting */ }
    await new Promise(r => setTimeout(r, 200));
  }
  context = await chromium.launchPersistentContext(profile);
  const page = context.pages()[0] ?? await context.newPage();
  page.on('pageerror', e => console.warn('Seite (alter Stand):', e.message));
  await page.goto(BASE);
  console.log('Alter Stand geöffnet:', BASE);
  // The old app seeds its catalogue on start; wait until the asset store has stopped growing.
  let last = -1;
  for (let i = 0; i < 300; i++) {
    const n = await page.evaluate(async () => {
      // Never open a database that does not exist yet: that would create it empty at version 1.
      if (!(await indexedDB.databases()).some(d => d.name === 'minecraft-bauplaner')) return 0;
      return new Promise(res => {
      const r = indexedDB.open('minecraft-bauplaner');
      r.onsuccess = () => { const db = r.result; if (!db.objectStoreNames.contains('versions')) { db.close(); res(0); return; }
        const c = db.transaction('versions').objectStore('versions').count(); c.onsuccess = () => { db.close(); res(c.result); }; };
      r.onerror = () => res(0);
    }); });
    if (i % 10 === 0) console.log(`Katalog im alten Stand: ${n} Versionen`);
    if (n > 0 && n === last) break;
    last = n;
    await new Promise(r => setTimeout(r, 1000));
  }
  const scenario = await page.evaluate(SCENARIO, tree);
  console.log('Szenario:', JSON.stringify(scenario.steps));
  await page.close();
  const dumpPage = await context.newPage();
  await dumpPage.goto(`${BASE}favicon.svg`).catch(() => dumpPage.goto(BASE));
  const dump = await dumpPage.evaluate(DUMP);
  const fixture = { format: 'bauplaner-aged-browserdata', formatVersion: 1, release: { commit: full, date }, generatedAt: new Date().toISOString(), scenario, ...dump };
  mkdirSync(dirname(resolve(outFile)), { recursive: true });
  writeFileSync(outFile, gzipSync(JSON.stringify(fixture), { level: 9 }));
  const counts = Object.fromEntries(dump.stores.map(s => [s.name, s.records.length]));
  console.log(`${outFile}: Datenbank Version ${dump.dbVersion}, ${JSON.stringify(counts)}`);
} finally {
  await context?.close();
  server.kill();
  git('worktree', 'remove', '--force', tree);
}

/** Runs in the old app's page. Uses only that release's modules. */
async function SCENARIO(tree) {
  const steps = [];
  const step = async (name, fn) => { try { await fn(); steps.push([name, 'ok']); } catch (e) { steps.push([name, `übersprungen: ${e?.message ?? e}`]); } };
  const base = new URL('.', location.href).pathname;
  // Vite serves the app root (apps/web) under the base path and other repository files under @fs.
  const domain = await import(/* @vite-ignore */ `${base}@fs${tree}/packages/domain/src/index.ts`);
  const { openIdbRepository } = await import(/* @vite-ignore */ `${base}src/app/idbRepository.ts`);
  const repo = await openIdbRepository();
  const profileId = domain.SAMPLE_PROFILE ?? 'java:registry-unverified';
  const out = { versions: {}, projects: {} };

  // Own building: three versions; the large one has air and erase cells and a chest with items.
  let own;
  await step('eigenes Gebäude mit drei Versionen', async () => {
    const S = { id: 'minecraft:stone', properties: {} }, P = { id: 'minecraft:oak_planks', properties: {} },
      G = { id: 'minecraft:glass', properties: {} }, C = { id: 'minecraft:chest', properties: { facing: 'north', type: 'single', waterlogged: 'false' } },
      St = { id: 'minecraft:oak_stairs', properties: { facing: 'east', half: 'bottom', shape: 'straight', waterlogged: 'false' } };
    const payload = (n, h, erase) => {
      const cells = [];
      for (let y = 0; y < h; y++) for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
        const wall = x === 0 || z === 0 || x === n - 1 || z === n - 1 || y === 0;
        if (wall) cells.push({ position: [x, y, z], kind: 'block', paletteIndex: y === 0 ? 0 : ((x * 7 + z * 3 + y) % 11 === 0 ? 2 : 1) });
        else if (erase && y === h - 1 && (x + z) % 5 === 0) cells.push({ position: [x, y, z], kind: 'erase' });
        else if (y < 4) cells.push({ position: [x, y, z], kind: 'air', paletteIndex: 5 });
      }
      cells.push({ position: [1, 1, 1], kind: 'block', paletteIndex: 3 }, { position: [2, 1, 1], kind: 'block', paletteIndex: 4 });
      const filtered = cells.filter((c, i, a) => !(c.position[0] === 1 && c.position[1] === 1 && c.position[2] === 1 && a[i] !== cells[cells.length - 2])
        && !(c.position[0] === 2 && c.position[1] === 1 && c.position[2] === 1 && a[i] !== cells[cells.length - 1]));
      const chest = { type: 'compound', value: { id: { type: 'string', value: 'minecraft:chest' }, Items: { type: 'list', elementType: 'compound', value: [
        { type: 'compound', value: { Slot: { type: 'byte', value: 0 }, id: { type: 'string', value: 'minecraft:torch' }, count: { type: 'int', value: 32 } } }] } } };
      return { schemaVersion: 1, profileId, bounds: { min: [0, 0, 0], maxExclusive: [n, h, n] }, pivot: [0, 0, 0], sourceOrigin: [100, 64, -40],
        palette: [S, P, G, C, St, { id: 'minecraft:air', properties: {} }], cells: filtered, blockEntities: [{ position: [1, 1, 1], data: chest }] };
    };
    let asset = domain.createAsset({ name: 'Meine Burg', description: 'Eigenes Gebäude (gealterte Testdaten)', tags: ['eigen', 'burg'], provenance: { author: 'Philipp', source: 'eigener Entwurf', license: 'eigene Nutzung' } });
    const versions = [];
    for (const [label, p] of [['1.0', payload(8, 6, false)], ['1.1', payload(12, 8, true)], ['2.0', payload(56, 40, true)]]) {
      const r = await domain.addAssetVersion(asset, { payload: p, label, source: { format: 'voxel-json' } });
      asset = r.asset; versions.push(r.version);
    }
    await repo.applyBatch({ assets: [asset], versions });
    own = { asset, versions };
    out.versions.own = versions.map(v => ({ id: v.id, payloadHash: v.payloadHash, cells: v.payload.cells.length }));
  });

  let generated;
  await step('Gebäude aus dem Generator', async () => {
    const id = domain.GENERATORS[0].id;
    const run = domain.runGenerator(id, domain.presetValues ? domain.presetValues(id, domain.GENERATORS[0].presets?.[0]?.id) ?? {} : {});
    generated = await domain.createGeneratedAsset(run, { name: 'Generierter Turm', author: 'Philipp' });
    await repo.applyBatch({ assets: [generated.asset], versions: [generated.version] });
  });

  await step('Originaldatei', async () => {
    const bytes = new TextEncoder().encode('Originaldatei einer alten Schem (gealterte Testdaten)');
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
    await repo.applyBatch({ originals: [{ sha256: hash, fileName: 'alt.schem', mediaType: 'application/octet-stream', size: bytes.length, createdAt: new Date().toISOString(), bytes }] });
  });

  // Project: catalogue buildings, own building, generated building; site, stock, ticked steps, frozen revision.
  await step('Projekt mit Instanzen', async () => {
    const versions = await repo.listVersions(), assets = await repo.listAssets();
    const latest = a => versions.find(v => v.id === a.versionIds[a.versionIds.length - 1]);
    const catalogue = assets.filter(a => a.demo).slice(0, 6).map(latest).filter(Boolean);
    let project = domain.createProject({ name: 'Dorf am Fluss', description: 'Seit Oktober gewachsen', profileId });
    const add = (version, name, x, z, q = 0) => { project = domain.applyOperation(project, { kind: 'instance.add', instance: domain.newInstance({ assetVersionId: version.id, name, transform: { position: [x, 0, z], quarterTurns: q, mirrorX: false } }) }).project; };
    catalogue.forEach((v, i) => add(v, `Katalog ${i + 1}`, i * 40, 0, i % 4));
    if (own) add(own.versions[2], 'Burg', 0, 80, 1);
    if (generated) add(generated.version, 'Turm', 80, 80);
    let saved = (await repo.applyBatch({ projects: [{ project, baseRevision: 0 }] }))[0];
    out.projects.main = { id: saved.id, instances: saved.instances.map(i => i.id) };
    globalThis.__agedProject = saved;
  });
  await step('Baustelle mit Abschnitten und Lager', async () => {
    let p = globalThis.__agedProject;
    let site = domain.emptySite ? domain.emptySite() : domain.siteOf(p);
    site = domain.addSection(site, 'Erster Abschnitt', p.instances.slice(0, 2).map(i => ({ instanceId: i.id })));
    site = domain.addSection(site, 'Burg', p.instances.slice(-2, -1).map(i => ({ instanceId: i.id })));
    site = domain.setStock(site, 'minecraft:stone', 640);
    const next = domain.applyOperation(p, domain.siteOperation(site, 'Abschnitte')).project;
    globalThis.__agedProject = (await repo.applyBatch({ projects: [{ project: next, baseRevision: p.revision }] }))[0];
  });
  await step('Bauschritte abgehakt und Stand eingefroren', async () => {
    let p = globalThis.__agedProject;
    const versions = new Map((await repo.listVersions()).map(v => [v.id, v]));
    const guide = domain.buildGuide(p, domain.resolveProject(p, versions));
    const op = domain.tickSteps(guide.steps.slice(0, 3), 'Erste Schritte');
    let next = op ? domain.applyOperation(p, op).project : p;
    if (domain.freezeRevision) next = domain.freezeRevision(next, 'Stand Oktober').project;
    globalThis.__agedProject = (await repo.applyBatch({ projects: [{ project: next, baseRevision: p.revision }] }))[0];
    out.projects.main.progress = Object.keys(globalThis.__agedProject.progress ?? {}).length;
    out.projects.main.revisions = (globalThis.__agedProject.revisions ?? []).length;
  });
  // Later releases only.
  await step('Eigene Sammlung', async () => {
    if (!domain.createCollection || !repo.listCollections) throw new Error('nicht in diesem Stand');
    let c = domain.createCollection({ name: 'Lieblingsbauten', category: 'Dorf' });
    for (const a of (await repo.listAssets()).slice(0, 4)) c = domain.addToCollection(c, { kind: 'asset', assetId: a.id });
    if (own) c = domain.addToCollection(c, { kind: 'asset', assetId: own.asset.id, versionId: own.versions[0].id, note: 'erste Fassung' });
    await repo.applyBatch({ collections: [c] });
  });
  await step('Eigene Vorlage aus dem Projekt', async () => {
    if (!domain.templateFromProject || !repo.listTemplates) throw new Error('nicht in diesem Stand');
    await repo.applyBatch({ templates: [domain.templateFromProject(globalThis.__agedProject, { name: 'Dorfvorlage' })] });
  });
  await step('Sicherung mit Beleg', async () => {
    const [projects, assets, versions] = await Promise.all([repo.listProjects(), repo.listAssets(), repo.listVersions()]);
    const extra = repo.listCollections ? { collections: await repo.listCollections(), templates: await repo.listTemplates() } : {};
    const file = await domain.createBackup({ projects, assets, versions: new Map(versions.map(v => [v.id, v])), ...extra, getOriginal: sha => repo.getOriginal(sha) }, 'all');
    out.backup = file; // the backup file as this release wrote it (current readBackup must still accept it)
    if (domain.receiptForBackup && repo.recordBackup) await repo.recordBackup(await domain.receiptForBackup(file, 'download', 'bauplaner-sicherung.json'));
  });
  return { steps, expected: out };
}

/** Raw dump of the whole database, structure included. Runs in a page of the same origin. */
async function DUMP() {
  const db = await new Promise((res, rej) => { const r = indexedDB.open('minecraft-bauplaner'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const b64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
  async function enc(v) {
    if (v instanceof Blob) return { $blob: b64(new Uint8Array(await v.arrayBuffer())), type: v.type };
    if (v instanceof Uint8Array) return { $u8: b64(v) };
    if (v instanceof ArrayBuffer) return { $ab: b64(new Uint8Array(v)) };
    if (Array.isArray(v)) return Promise.all(v.map(enc));
    if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = await enc(x); return o; }
    return v;
  }
  const stores = [];
  for (const name of db.objectStoreNames) {
    const tx = db.transaction(name), store = tx.objectStore(name);
    const records = await new Promise((res, rej) => { const r = store.getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const indexes = [...store.indexNames].map(i => { const ix = store.index(i); return { name: i, keyPath: ix.keyPath, unique: ix.unique, multiEntry: ix.multiEntry }; });
    stores.push({ name, keyPath: store.keyPath, autoIncrement: store.autoIncrement, indexes, records: await enc(records) });
  }
  const dbVersion = db.version;
  db.close();
  return { dbVersion, stores };
}
