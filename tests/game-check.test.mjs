import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { createPayload } from '../dist/voxel/src/index.js';
import { normalizeScan, readWorldScan, readNbt, writeNbt, UNLOADED_STATE, FormatError } from '../dist/formats/src/index.js';
import {
  createAsset, addAssetVersion, createProject, applyOperation, newInstance, resolveProject, buildGuide, evaluateProgress, freezeRevision, exportRevisionSchem,
  checkScan, compareBlock, ignoredProperties, scanTarget, confirmedUnticked, tickedButNotBuilt, tickConfirmed,
} from '../dist/domain/src/index.js';

const provenance = { author: 'Test', source: 'synthetisch', license: '' };
const S = id => ({ id, properties: {} });

/**
 * Hand-built column (x = 0..2, z = 0), placed at X 5 / Y 10 (same as the guide test):
 *   y0: stone stone stone
 *   y1: sand  stone wall_torch[facing=east]
 *   y2: water erase mymod:thing
 */
async function column() {
  const palette = [S('minecraft:stone'), S('minecraft:sand'), { id: 'minecraft:wall_torch', properties: { facing: 'east' } }, { id: 'minecraft:water', properties: { level: '0' } }, S('mymod:thing')];
  const b = (x, y, paletteIndex) => ({ position: [x, y, 0], kind: 'block', paletteIndex });
  const payload = createPayload({ schemaVersion: 1, profileId: 'java:registry-unverified', bounds: { min: [0, 0, 0], maxExclusive: [3, 3, 1] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette,
    cells: [b(0, 0, 0), b(1, 0, 0), b(2, 0, 0), b(0, 1, 1), b(1, 1, 0), b(2, 1, 2), b(0, 2, 3), { position: [1, 2, 0], kind: 'erase' }, b(2, 2, 4)], blockEntities: [] });
  const { version } = await addAssetVersion(createAsset({ id: 'hand', name: 'Säule', provenance }), { payload, source: { format: 'voxel-json' } });
  const inst = newInstance({ assetVersionId: version.id, name: 'Säule', transform: { position: [5, 10, 0], quarterTurns: 0, mirrorX: false } });
  const base = applyOperation(createProject({ name: 'Spiel' }), { kind: 'instance.add', instance: inst }).project;
  const { project, revision } = freezeRevision(base, 'Bauplan');
  const versions = new Map([[version.id, version]]);
  const resolution = resolveProject(project, versions);
  return { project, revision, versions, resolution, guide: buildGuide(project, resolution), id: (layer, phase) => `${inst.id}~L${layer}~${phase}` };
}

/** Independent VarInt encoder (LEB128, as in Sponge v3). */
function varints(values) {
  const out = [];
  for (let v of values) { do { let b = v & 127; v >>>= 7; if (v) b |= 128; out.push(b > 127 ? b - 256 : b); } while (v); }
  return out;
}

/**
 * Builds the NBT tree of a recording by hand. `cells` is a list of state texts in
 * Sponge order (x fastest, then z, then y); the palette follows first appearance.
 */
function scanTag({ size, cells, meta, offset = [0, 0, 0] }) {
  const ids = new Map();
  for (const c of cells) if (!ids.has(c)) ids.set(c, ids.size);
  const int = value => ({ type: 'int', value }), str = value => ({ type: 'string', value }), vec = v => ({ type: 'intArray', value: v });
  const bauplaner = meta && { type: 'compound', value: Object.fromEntries(Object.entries(meta).map(([k, v]) => [k, Array.isArray(v) ? vec(v) : typeof v === 'number' ? int(v) : str(v)])) };
  return { name: '', tag: { type: 'compound', value: { Schematic: { type: 'compound', value: {
    Version: int(3), DataVersion: int(4189),
    Width: { type: 'short', value: size[0] }, Height: { type: 'short', value: size[1] }, Length: { type: 'short', value: size[2] }, Offset: vec(offset),
    Blocks: { type: 'compound', value: { Palette: { type: 'compound', value: Object.fromEntries([...ids].map(([k, v]) => [k, int(v)])) }, Data: { type: 'byteArray', value: varints(cells.map(c => ids.get(c))) } } },
    ...(bauplaner && { Metadata: { type: 'compound', value: { Bauplaner: bauplaner } } }),
  } } } } };
}
const metaFor = (project, revision, extra = {}) => ({ Kind: 'scan', ScanVersion: 1, ProjectId: project.id, RevisionId: revision.id, RevisionNumber: revision.number, ProjectMin: [5, 10, 0], ...extra });

test('hand-counted recording: every verdict and every step status as expected', async () => {
  const c = await column();
  const scan = normalizeScan(scanTag({ size: [3, 3, 1], meta: metaFor(c.project, c.revision, { Unloaded: 1, Source: 'client' }), cells: [
    'minecraft:stone', 'minecraft:stone', 'minecraft:cobblestone',
    'minecraft:air', 'minecraft:stone', 'minecraft:wall_torch[facing=north]',
    UNLOADED_STATE, 'minecraft:dirt', 'mymod:thing',
  ] }));
  assert.equal(scan.meta.source, 'client');
  const target = scanTarget(c.project, scan);
  assert.equal(target.revision.id, c.revision.id);
  assert.deepEqual(target.projectMin, [5, 10, 0]);
  const check = checkScan(c.guide, c.resolution.world, scan, target.projectMin, target.notes);
  const st = Object.fromEntries([...check.steps].map(([k, v]) => [k, [v.status, v.ok, v.total]]));
  assert.deepEqual(st, {
    [c.id(0, 'structure')]: ['deviating', 2, 3],
    [c.id(1, 'structure')]: ['confirmed', 1, 1],
    [c.id(1, 'gravity')]: ['unchecked', 0, 1],
    [c.id(1, 'attached')]: ['deviating', 0, 1],
    [c.id(2, 'clear')]: ['deviating', 0, 1],
    [c.id(2, 'structure')]: ['confirmed', 1, 1],
    [c.id(2, 'liquid')]: ['unchecked', 0, 1],
  });
  assert.deepEqual({ ...check.totals }, { ok: 4, state: 1, missing: 1, wrong: 1, remove: 1, unknown: 1, cells: 9, blocks: 8, blocksOk: 4 });
  const dev = Object.fromEntries([...check.deviations.values()].map(d => [d.position.join(','), [d.verdict, d.expected, d.actual]]));
  assert.deepEqual(dev, {
    '7,10,0': ['wrong', 'minecraft:stone', 'minecraft:cobblestone'],
    '5,11,0': ['missing', 'minecraft:sand', 'minecraft:air'],
    '7,11,0': ['state', 'minecraft:wall_torch[facing=east]', 'minecraft:wall_torch[facing=north]'],
    '6,12,0': ['remove', 'Luft', 'minecraft:dirt'],
    '5,12,0': ['unknown', 'minecraft:water[level=0]', null],
  });
  assert.match(check.notes.join(' '), /1 Zellen lagen in nicht geladenen Chunks/);
});

test('alignment and index order x + z·W + y·W·L in a larger box; confirmed steps tick as one explicit batch', async () => {
  const c = await column();
  // Box 4×3×2 starting one block west of the plan; plan cells sit at local x 1..3, z 0.
  const W = 4, L = 2, H = 3, cells = new Array(W * H * L).fill('minecraft:diamond_block');
  const set = (x, y, z, s) => { cells[x + z * W + y * W * L] = s; };
  const plan = [['minecraft:stone', 'minecraft:stone', 'minecraft:stone'], ['minecraft:sand', 'minecraft:stone', 'minecraft:wall_torch[facing=east]'], ['minecraft:water[level=0]', 'minecraft:air', 'mymod:thing']];
  plan.forEach((row, y) => row.forEach((s, x) => set(x + 1, y, 0, s)));
  const scan = normalizeScan(scanTag({ size: [W, H, L], cells, meta: metaFor(c.project, c.revision, { ProjectMin: [4, 10, 0] }) }));
  const check = checkScan(c.guide, c.resolution.world, scan, scan.meta.projectMin);
  assert.ok([...check.steps.values()].every(s => s.status === 'confirmed'), 'unselected cells (diamond blocks) are ignored');
  assert.equal(check.totals.ok, 9);
  const progress = evaluateProgress(c.guide, c.project.progress);
  const status = id => progress.status.get(id) ?? 'open';
  assert.equal(confirmedUnticked(c.guide, check, status).length, 7);
  const op = tickConfirmed(c.guide, check, status, '2026-10-27T12:00:00.000Z');
  assert.equal(op.kind, 'batch');
  assert.equal(op.operations.length, 7);
  const ticked = applyOperation(c.project, op).project;
  assert.equal(evaluateProgress(c.guide, ticked.progress).done, 7);
  assert.equal(tickConfirmed(c.guide, check, id => evaluateProgress(c.guide, ticked.progress).status.get(id)), null, 'nothing left to tick');
});

test('ticked steps contradicted by the recording are reported, never unticked', async () => {
  const c = await column();
  const ticked = applyOperation(c.project, tickConfirmed(c.guide, { steps: new Map(c.guide.steps.map(s => [s.id, { status: 'confirmed' }])) }, () => 'open')).project;
  const empty = normalizeScan(scanTag({ size: [3, 3, 1], cells: new Array(9).fill('minecraft:air'), meta: metaFor(c.project, c.revision) }));
  const check = checkScan(c.guide, c.resolution.world, empty, [5, 10, 0]);
  const progress = evaluateProgress(c.guide, ticked.progress);
  const contradicted = tickedButNotBuilt(c.guide, check, id => progress.status.get(id));
  assert.deepEqual(contradicted.map(s => s.id).sort(), [c.id(0, 'structure'), c.id(1, 'structure'), c.id(1, 'gravity'), c.id(1, 'attached'), c.id(2, 'structure'), c.id(2, 'liquid')].sort());
  assert.equal(check.steps.get(c.id(2, 'clear')).status, 'confirmed', 'air where erase is planned is correct');
});

test('plan cells outside the recording are unknown and named', async () => {
  const c = await column();
  const scan = normalizeScan(scanTag({ size: [2, 3, 1], cells: ['minecraft:stone', 'minecraft:stone', 'minecraft:sand', 'minecraft:stone', 'minecraft:water[level=0]', 'minecraft:air'], meta: metaFor(c.project, c.revision) }));
  const check = checkScan(c.guide, c.resolution.world, scan, [5, 10, 0]);
  assert.equal(check.outside, 3);
  assert.equal(check.totals.unknown, 3);
  assert.equal(check.totals.ok, 6);
  assert.match(check.notes.join(' '), /3 Planzellen liegen außerhalb/);
});

test('construction properties: derived vanilla properties are ignored, explicit ones and mod properties are compared', () => {
  const st = (id, properties = {}) => ({ id, properties });
  assert.equal(compareBlock(st('minecraft:oak_fence', { north: 'false', waterlogged: 'false' }), st('minecraft:oak_fence', { north: 'true', waterlogged: 'false' })), 'ok');
  assert.equal(compareBlock(st('minecraft:oak_fence', { waterlogged: 'false' }), st('minecraft:oak_fence', { waterlogged: 'true' })), 'state');
  assert.equal(compareBlock(st('minecraft:oak_stairs', { facing: 'east', shape: 'straight', half: 'bottom' }), st('minecraft:oak_stairs', { facing: 'east', shape: 'inner_left', half: 'bottom' })), 'ok');
  assert.equal(compareBlock(st('minecraft:oak_stairs', { facing: 'east', half: 'bottom' }), st('minecraft:oak_stairs', { facing: 'west', half: 'bottom' })), 'state');
  assert.equal(compareBlock(st('minecraft:oak_leaves', { persistent: 'false', distance: '7' }), st('minecraft:oak_leaves', { persistent: 'true', distance: '1' })), 'ok');
  assert.equal(compareBlock(st('minecraft:oak_door', { open: 'false', powered: 'false', hinge: 'left' }), st('minecraft:oak_door', { open: 'true', powered: 'true', hinge: 'left' })), 'ok');
  assert.equal(compareBlock(st('minecraft:oak_door', { hinge: 'left' }), st('minecraft:oak_door', { hinge: 'right' })), 'state');
  assert.equal(compareBlock(st('minecraft:furnace', { facing: 'north', lit: 'false' }), st('minecraft:furnace', { facing: 'north', lit: 'true' })), 'ok');
  assert.equal(compareBlock(st('minecraft:candle', { lit: 'false', candles: '1' }), st('minecraft:candle', { lit: 'true', candles: '1' })), 'state', 'candles are lit by the player');
  assert.equal(compareBlock(st('minecraft:stone'), st('minecraft:stone', { anything: 'x' })), 'ok', 'properties the plan leaves out are free');
  assert.equal(compareBlock(st('mymod:pipe', { north: 'true' }), st('mymod:pipe', { north: 'false' })), 'state');
  assert.equal(compareBlock(st('minecraft:stone'), st('minecraft:cave_air')), 'missing');
  assert.equal(compareBlock(st('minecraft:stone'), st(UNLOADED_STATE)), 'unknown');
  assert.ok(ignoredProperties('minecraft:cobblestone_wall').has('up'));
  assert.ok(!ignoredProperties('minecraft:wall_torch').has('north'));
  assert.equal(ignoredProperties('mymod:pipe').size, 0);
});

test('scanTarget refuses other projects, unknown revisions and treats foreign recordings as manual', async () => {
  const c = await column();
  const other = normalizeScan(scanTag({ size: [1, 1, 1], cells: ['minecraft:stone'], meta: metaFor({ id: 'prj_fremd' }, c.revision) }));
  assert.match(scanTarget(c.project, other).error, /anderen Projekt/);
  const gone = normalizeScan(scanTag({ size: [1, 1, 1], cells: ['minecraft:stone'], meta: metaFor(c.project, { id: 'rev_weg', number: 9 }) }));
  assert.match(scanTarget(c.project, gone).error, /Revision 9/);
  const foreign = normalizeScan(scanTag({ size: [1, 1, 1], cells: ['minecraft:stone'] }));
  assert.equal(foreign.meta, null);
  assert.match(foreign.warnings.join(' '), /WorldEdit/);
  assert.deepEqual(scanTarget(c.project, foreign), { revision: null, projectMin: null, notes: [] });
});

test('reader refuses plan files, unknown scan versions and broken data', () => {
  const plan = scanTag({ size: [1, 1, 1], cells: ['minecraft:stone'], meta: { ProjectId: 'p', RevisionId: 'r', RevisionNumber: 1 } });
  assert.throws(() => normalizeScan(plan), /Plan-Datei/);
  assert.throws(() => normalizeScan(scanTag({ size: [1, 1, 1], cells: ['minecraft:stone'], meta: { Kind: 'scan', ScanVersion: 2 } })), /Version 2/);
  assert.throws(() => normalizeScan(scanTag({ size: [1, 1, 1], cells: ['minecraft:stone'], meta: { Kind: 'scan', ScanVersion: 1, ProjectId: 'p', RevisionId: 'r', RevisionNumber: 1 } })), /ProjectMin/);
  const short = scanTag({ size: [2, 1, 1], cells: ['minecraft:stone'] });
  assert.throws(() => normalizeScan(short), /enden vor dem erwarteten Volumen/);
  const gap = scanTag({ size: [1, 1, 1], cells: ['minecraft:stone'] });
  gap.tag.value.Schematic.value.Blocks.value.Palette.value['minecraft:stone'] = { type: 'int', value: 1 };
  assert.throws(() => normalizeScan(gap), /lückenlos/);
  assert.throws(() => normalizeScan(scanTag({ size: [300, 300, 300], cells: ['minecraft:stone'] })), err => err instanceof FormatError && err.code === 'LIMIT');
});

test('readWorldScan: GZip file roundtrip with SHA-256 of the original bytes; multi-byte VarInts', async () => {
  const cells = Array.from({ length: 200 }, (_, i) => `minecraft:candle[candles=${(i % 4) + 1},lit=false,waterlogged=${i % 50 < 25}]`).concat(Array.from({ length: 200 }, (_, i) => `mymod:b${i}`));
  const tag = scanTag({ size: [20, 4, 5], cells });
  const file = gzipSync(writeNbt(tag));
  const scan = await readWorldScan(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
  assert.equal(scan.sourceSha256, createHash('sha256').update(file).digest('hex'));
  assert.equal(scan.palette.length, 208);
  assert.equal(scan.data[399], 207, 'palette ids ≥ 128 need two VarInt bytes');
  assert.deepEqual({ ...scan.palette[scan.data[0]].properties }, { candles: '1', lit: 'false', waterlogged: 'true' });
  await assert.rejects(readWorldScan(new Uint8Array([1, 2, 3]).buffer), /GZip/);
});

test('plan export carries ProjectMin so recordings align for every anchor', async () => {
  const c = await column();
  for (const anchor of ['project-origin', 'min-corner']) {
    const out = await exportRevisionSchem(c.project, c.revision.id, c.versions, { dataVersion: 4189, anchor, unselected: 'air' });
    const { gunzipSync } = await import('node:zlib');
    const root = readNbt(new Uint8Array(gunzipSync(out.bytes)));
    const b = root.tag.value.Schematic.value.Metadata.value.Bauplaner.value;
    assert.deepEqual(b.ProjectMin, { type: 'intArray', value: [5, 10, 0] });
    assert.equal(b.Kind, undefined, 'plan files carry no Kind and are refused as recordings');
  }
});
