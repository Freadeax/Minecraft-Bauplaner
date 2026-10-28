// Stability (S-03, S-04): delivery manifest check, routes, and time budgets for large models.
// The budgets are generous ceilings for slow machines; the measured times are printed for the test log.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createPayload, validatePayload, adoptPayload, stateKey } from '../dist/voxel/src/index.js';
import {
  canonicalJson, quickHash, createBuildingLibrary,
  createAsset, addAssetVersion, createProject, applyOperation, newInstance, resolveProject, computeMaterials, buildGuide, checkIntegrity, createBackup, readBackup,
} from '../dist/domain/src/index.js';
import { buildFaces } from '../apps/web/src/viewer/faces.ts';
import { parseManifest, verifyDelivery, shouldVerify } from '../apps/web/src/app/delivery.ts';
import { parseRoute, href } from '../apps/web/src/app/router.ts';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const enc = s => new TextEncoder().encode(s);

test('delivery: matching, changed and missing files are told apart; non-code files are skipped', async () => {
  const files = { 'index.html': enc('<html>'), 'assets/a.js': enc('a()'), 'assets/b.css': enc('b{}'), 'examples/x.schem': enc('x') };
  const manifest = parseManifest({ schemaVersion: 1, sourceCommit: 'c04b66c2946c242a722949749ba837360c8c0611', builtAt: '2026-10-28T00:00:00Z',
    files: Object.entries(files).map(([path, b]) => ({ path, bytes: b.length, sha256: sha(b) })) });
  const hash = async b => sha(b);
  const all = await verifyDelivery(manifest, async p => files[p] ?? null, hash);
  assert.deepEqual(all, { checked: 3, ok: 3, problems: [] });
  const served = { ...files, 'assets/a.js': enc('stale()') };
  delete served['assets/b.css'];
  const bad = await verifyDelivery(manifest, async p => { if (p === 'index.html') throw new Error('offline'); return served[p] ?? null; }, hash);
  assert.equal(bad.ok, 0);
  assert.deepEqual(bad.problems.map(p => [p.path, p.verdict]), [['assets/a.js', 'changed'], ['assets/b.css', 'missing'], ['index.html', 'missing']]);
  assert.match(bad.problems[0].detail, /7 statt 3 Bytes/);
  assert.equal(shouldVerify('THIRD_PARTY_NOTICES.txt'), false); assert.equal(shouldVerify('favicon.svg'), true);
});

test('delivery: a foreign or broken manifest is rejected instead of reading as "all fine"', () => {
  for (const raw of [null, {}, { schemaVersion: 2, sourceCommit: 'abcdef1', files: [] }, { schemaVersion: 1, sourceCommit: 'main', files: [] },
    { schemaVersion: 1, sourceCommit: 'abcdef1', files: [{ path: 'a.js' }] }]) assert.throws(() => parseManifest(raw), /deployment\.json/);
});

test('routes: system page and unchanged existing routes', () => {
  assert.deepEqual(parseRoute('#/system'), { view: 'system' });
  assert.equal(href({ view: 'system' }), '#/system');
  assert.equal(parseRoute('#/system/x').view, 'not-found');
  assert.deepEqual(parseRoute('#/betrachter'), { view: 'viewer' });
  assert.deepEqual(parseRoute('#/projekt/p1/bauen'), { view: 'project', projectId: 'p1', tab: 'bauen' });
});

/** Hollow building shell with floors every 6 layers: realistic surface/volume ratio for a large build. */
function bigPayload(sx, sy, sz) {
  const palette = [{ id: 'minecraft:stone_bricks', properties: {} }, { id: 'minecraft:oak_planks', properties: {} }, { id: 'minecraft:glass', properties: {} },
    { id: 'minecraft:oak_stairs', properties: { facing: 'north', half: 'bottom', shape: 'straight', waterlogged: 'false' } }];
  const cells = [];
  for (let x = 0; x < sx; x++) for (let y = 0; y < sy; y++) for (let z = 0; z < sz; z++) {
    const wall = x === 0 || z === 0 || x === sx - 1 || z === sz - 1, floor = y % 6 === 0;
    if (!wall && !floor) continue;
    const i = floor && !wall ? 1 : (y % 6 === 3 && (x + z) % 4 === 1) ? 2 : (y === sy - 1 && x % 3 === 0) ? 3 : 0;
    cells.push({ position: [x, y, z], kind: 'block', paletteIndex: i });
  }
  return createPayload({ schemaVersion: 1, profileId: 'java-1.21.4', bounds: { min: [0, 0, 0], maxExclusive: [sx, sy, sz] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette, cells, blockEntities: [] });
}

test('large model: 4 × 128×48×128 halls (~600 000 blocks) stay within time budgets end to end', async () => {
  const t = () => performance.now(), log = [];
  const time = async (label, fn, budget) => { const s = t(); const r = await fn(); const ms = t() - s; log.push(`${label} ${ms.toFixed(0)} ms`); assert.ok(ms < budget, `${label} took ${ms.toFixed(0)} ms (budget ${budget})`); return r; };
  const payload = await time('payload', () => bigPayload(128, 48, 128), 8000);
  const asset = createAsset({ name: 'Halle', provenance: { author: 'Test', source: 'synthetisch', license: '' } });
  const { asset: a, version } = await time('version (hash)', () => addAssetVersion(asset, { payload, source: { format: 'demo' } }), 8000);
  let p = createProject({ name: 'Großprojekt' });
  for (const [x, z] of [[0, 0], [130, 0], [0, 130], [130, 130]])
    p = applyOperation(p, { kind: 'instance.add', instance: newInstance({ assetVersionId: version.id, name: `Halle ${x}/${z}`, transform: { position: [x, 0, z], quarterTurns: 0, mirrorX: false } }) }).project;
  const versions = new Map([[version.id, version]]);
  const resolution = await time('resolveProject', () => resolveProject(p, versions), 12000);
  assert.equal(resolution.conflicts.length, 0);
  const blocks = resolution.world.cells.length;
  assert.ok(blocks > 300_000 && blocks <= 1_000_000, `${blocks} blocks`);
  const materials = await time('computeMaterials', () => computeMaterials(resolution.world), 10000);
  assert.equal(materials.totals.blocks ?? blocks, blocks);
  const guide = await time('buildGuide', () => buildGuide(p, resolution), 10000);
  assert.ok(guide.steps.length >= 4 * 48);
  const mesh = await time('buildFaces', () => buildFaces(resolution.world.cells, () => [0.5, 0.5, 0.5], [0, 0, 0]), 15000);
  assert.ok(mesh.quads < mesh.naiveQuads / 2, 'hidden faces removed');
  const report = await time('checkIntegrity', () => checkIntegrity({ projects: [{ ...p, revision: 1 }], assets: [a], versions: [version], originalHashes: [] }), 10000);
  assert.equal(report.ok, true);
  const backup = await time('backup write+read', async () => readBackup(JSON.stringify(await createBackup({ projects: [{ ...p, revision: 1 }], assets: [a], versions, getOriginal: async () => null }, 'all'))), 20000);
  assert.equal(backup.versions.length, 1);
  console.log(`# Großmodell ${blocks.toLocaleString('de-DE')} Blöcke, ${mesh.quads.toLocaleString('de-DE')} Flächen: ${log.join(' · ')}`);
});

test('guide geometry hash keeps its documented definition (ticked steps must stay valid after the speed-up)', async () => {
  const lib = await createBuildingLibrary();
  const versions = new Map(lib.versions.map(v => [v.id, v]));
  const withEntity = lib.versions.find(v => v.payload.blockEntities.length) ?? lib.versions[0];
  let p = createProject({ name: 'Hash' });
  p = applyOperation(p, { kind: 'instance.add', instance: newInstance({ assetVersionId: withEntity.id, name: 'A', transform: { position: [3, 0, -2], quarterTurns: 1, mirrorX: true } }) }).project;
  p = { ...p, profileId: withEntity.payload.profileId };
  const r = resolveProject(p, versions), world = r.world;
  const byPos = new Map(world.cells.map(c => [c.position.join(','), c]));
  const entity = new Map(world.blockEntities.map(e => [e.position.join(','), e.data]));
  const g = buildGuide(p, r);
  assert.ok(g.steps.length > 3);
  for (const step of g.steps) {
    // Reference: quickHash(canonicalJson([phase, [[x, y, z, kind, stateKey|null, data|null], …]])) in world cell order.
    const cells = world.cells.filter(c => step.positions.some(q => q.join(',') === c.position.join(',')));
    const expected = quickHash(canonicalJson([step.phase, cells.map(c => [...c.position, c.kind, c.kind === 'erase' ? null : stateKey(world.palette[c.paletteIndex]), entity.get(c.position.join(',')) ?? null])]));
    assert.equal(step.geometryHash, expected, step.id);
    assert.ok(cells.every(c => byPos.has(c.position.join(','))));
  }
});

test('validation cache: sealed payloads skip re-validation only under limits at least as strict', () => {
  const raw = () => ({ schemaVersion: 1, profileId: 'p', bounds: { min: [0, 0, 0], maxExclusive: [3, 1, 1] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0],
    palette: [{ id: 'minecraft:stone', properties: {} }], cells: [0, 1, 2].map(x => ({ position: [x, 0, 0], kind: 'block', paletteIndex: 0 })), blockEntities: [] });
  const sealed = createPayload(raw());
  assert.ok(Object.isFrozen(sealed.cells[0].position), 'deeply frozen');
  validatePayload(sealed);
  assert.throws(() => validatePayload(sealed, { maxCells: 2 }), /Limit/, 'stricter limits still re-validate');
  // A plain (unsealed) object with the same content is always checked in full.
  const tampered = raw(); tampered.cells.push({ position: [0, 0, 0], kind: 'block', paletteIndex: 0 });
  assert.throws(() => validatePayload(tampered), /doppelte Zellposition/);
  const adopted = adoptPayload(raw());
  assert.ok(Object.isFrozen(adopted.cells[2]));
  assert.throws(() => { 'use strict'; adopted.cells[0].position[0] = 5; }, TypeError);
});

test('validation fast path reports the same errors as before', () => {
  const base = { schemaVersion: 1, profileId: 'p', bounds: { min: [0, 0, 0], maxExclusive: [2, 2, 2] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0],
    palette: [{ id: 'minecraft:stone', properties: {} }, { id: 'minecraft:air', properties: {} }], blockEntities: [] };
  const check = cells => () => validatePayload({ ...base, cells });
  assert.throws(check([{ position: [2, 0, 0], kind: 'block', paletteIndex: 0 }]), /cells\[0\]: Zelle außerhalb/);
  assert.throws(check([{ position: [0, 0, 0], kind: 'block', paletteIndex: 1 }]), /widersprechen/);
  assert.throws(check([{ position: [0, 0, 0], kind: 'air', paletteIndex: 0 }]), /widersprechen/);
  assert.throws(check([{ position: [0, 0, 0], kind: 'stone' }]), /unbekannte Zellsemantik|unbekanntes Feld/);
  assert.throws(check([{ position: [0, 0, 0], kind: 'block', paletteIndex: 0, extra: 1 }]), /unbekanntes Feld/);
  assert.throws(check([{ position: [0, 0.5, 0], kind: 'erase' }]), /Ganzzahl/);
  assert.throws(check([{ position: [0, 0, 0], kind: 'erase' }, { position: [0, 0, 0], kind: 'erase' }]), /cells\[1\]: doppelte Zellposition/);
  const nullProto = Object.assign(Object.create(null), { position: [1, 1, 1], kind: 'erase' });
  validatePayload({ ...base, cells: [nullProto] });
  assert.throws(() => validatePayload({ ...base, cells: [{ position: [0, 0, 0], kind: 'erase' }], blockEntities: [{ position: [0, 0, 0], data: { type: 'compound', value: {} } }] }), /genau eine belegte Blockzelle/);
});
