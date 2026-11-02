// PERF-04-S05: the library start in the background worker gives exactly what the page used to compute itself.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { MemoryRepository } from '../dist/application/src/index.js';
import { createPayload } from '../dist/voxel/src/index.js';
import { addAssetVersion, analyzeVersion, buildCatalog, createAsset, latestReleaseId, packVersion, unpackVersion, updateAssetMeta, BUILDING_SPECS } from '../dist/domain/src/index.js';

/** Loads a web module whose imports are the core packages only, against the compiled packages. */
async function load(file) {
  let code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText;
  code = code.replaceAll(/\.\.\/\.\.\/\.\.\/\.\.\/packages\/(domain|application)\/src\/([A-Za-z]+)\.js/g, (_, pkg, name) => pathToFileURL(resolve(`dist/${pkg}/src/${name}.js`)).href);
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}
const { seedSamples } = await load('apps/web/src/app/repository.ts');
const { libraryJob } = await load('apps/web/src/jobs/libraryJob.ts');

function context() {
  const steps = [], transfers = [];
  return { steps, transfers, ctx: { progress(step, fraction = null) { steps.push([step, fraction]); }, transfer(b) { transfers.push(...b); } } };
}
/** What the page would send: stored assets and the stored records (cells packed). */
async function inputOf(repo) {
  return structuredClone({ assets: await repo.listAssets(), records: (await repo.listVersions()).map(packVersion) });
}
/** What the page does with the result (jobs/library.ts): write the plan as it is. */
async function apply(repo, out) {
  if (out.assets.length || out.versions.length) await repo.applyBatch({ assets: out.assets, versions: out.versions.map(unpackVersion) });
}
const summary = async repo => ({
  assets: (await repo.listAssets()).map(a => [a.id, a.versionIds.join(','), a.description, a.tags.join('|'), a.archived ?? false, a.revision]).sort(),
  versions: (await repo.listVersions()).map(v => [v.id, v.payloadHash, v.label]).sort(),
});
/** Catalogue metrics as the library view computes them on the page. */
async function pageMetrics(repo) {
  const versions = new Map((await repo.listVersions()).map(v => [v.id, v]));
  return new Map(buildCatalog(await repo.listAssets(), versions).entries.map(e => [e.version.id, e.metrics]));
}

let firstRun;
test('first start: the worker seeds exactly what seedSamples seeds and computes every catalogue metric', async () => {
  const page = new MemoryRepository(), worker = new MemoryRepository();
  await seedSamples(page);
  const { ctx, steps, transfers } = context();
  const out = await libraryJob(await inputOf(worker), ctx);
  firstRun = out;
  assert.equal(out.assets.length, BUILDING_SPECS.length + 3);
  assert.ok(out.versions.every(v => 'packedCells' in v && !('cells' in v.payload)), 'versions travel packed');
  assert.equal(transfers.length, out.versions.length, 'packed bytes are moved, not copied');
  await apply(worker, out);
  assert.deepEqual(await summary(worker), await summary(page));
  assert.deepEqual(new Map(out.metrics), await pageMetrics(page));
  // Progress: known steps, never backwards, ends before the page's own share (95 %).
  const fractions = steps.map(([, f]) => f);
  assert.ok(fractions.every((f, i) => f !== null && f >= (fractions[i - 1] ?? 0) && f <= 0.95));
  assert.ok(steps.some(([s]) => s === 'Mitgelieferte Gebäude erzeugen') && steps.some(([s]) => s === 'Kennwerte für den Katalog berechnen'));
});

test('later starts write nothing; own buildings get their metrics, stale demo metadata is refreshed, archive state stays', async () => {
  const repo = new MemoryRepository();
  await apply(repo, firstRun);
  // An own building with two versions: only the latest counts for the catalogue.
  const own = createAsset({ id: 'own_hall', name: 'Halle', description: '', tags: [], provenance: { author: 'ich', source: 'eigen', license: 'privat' } });
  const cells = [];
  for (let x = 0; x < 30; x++) for (let y = 0; y < 8; y++) for (let z = 0; z < 20; z++) if ((x + y + z) % 3) cells.push({ kind: 'block', position: [x, y, z], paletteIndex: (x + z) % 2 });
  const payload = createPayload({ schemaVersion: 1, profileId: 'java-26.3', bounds: { min: [0, 0, 0], maxExclusive: [30, 8, 20] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0],
    palette: [{ id: 'minecraft:stone', properties: {} }, { id: 'minecraft:oak_planks', properties: {} }], cells, blockEntities: [] });
  const r1 = await addAssetVersion(own, { payload, source: { format: 'editor' } });
  const r2 = await addAssetVersion(r1.asset, { payload: createPayload({ ...payload, cells: cells.slice(1) }), source: { format: 'editor' } });
  await repo.applyBatch({ assets: [r2.asset], versions: [r1.version, r2.version] });

  const quiet = await libraryJob(await inputOf(repo), context().ctx);
  assert.equal(quiet.assets.length + quiet.versions.length, 0, 'nothing to write');
  const metrics = new Map(quiet.metrics);
  assert.deepEqual(metrics, await pageMetrics(repo));
  assert.deepEqual(metrics.get(r2.version.id), analyzeVersion(r2.version));
  assert.ok(!metrics.has(r1.version.id));

  const tower = (await repo.listAssets()).find(a => a.id === 'sample_tower');
  await repo.saveAsset(updateAssetMeta(tower, { archived: true, description: 'veraltet' }));
  const before = await summary(repo);
  const refresh = await libraryJob(await inputOf(repo), context().ctx);
  assert.deepEqual(refresh.assets.map(a => a.id), ['sample_tower']);
  assert.equal(refresh.versions.length, 0);
  await apply(repo, refresh);
  const after = (await repo.listAssets()).find(a => a.id === 'sample_tower');
  assert.equal(after.archived, true);
  assert.notEqual(after.description, 'veraltet');
  assert.deepEqual(after.versionIds, tower.versionIds);
  assert.equal((await summary(repo)).assets.length, before.assets.length);
});

test('a damaged stored record does not stop the start; its metrics describe what is stored', async () => {
  const repo = new MemoryRepository();
  await apply(repo, firstRun);
  const input = await inputOf(repo);
  const index = input.records.findIndex(r => r.assetId === 'sample_wall');
  input.records[index] = { ...input.records[index], packedCells: { ...input.records[index].packedCells, bytes: new Uint8Array([1, 2, 3]) } };
  const out = await libraryJob(input, context().ctx);
  assert.equal(out.assets.length + out.versions.length, 0);
  const wall = input.assets.find(a => a.id === 'sample_wall');
  const id = latestReleaseId(wall, new Map(input.records.map(r => [r.id, r])));
  assert.equal(new Map(out.metrics).get(id).blocks, 0, 'empty cells, reported by the data check');
});
