import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { createPayload } from '../dist/voxel/src/index.js';
import { readNbt, writeNbt, modifiedUtf8, buildSchemV3, writeSchemV3, importSchemV3, formatBlockState, FormatError } from '../dist/formats/src/index.js';
import {
  createProject, execute, newInstance, EMPTY_HISTORY, resolveProject, createSampleLibrary, DomainError,
  revisionForExport, exportRevisionSchem, suggestDataVersion, dataVersionFromProfile, exportFileName,
} from '../dist/domain/src/index.js';

const dir = mkdtempSync(join(tmpdir(), 'schem-export-'));
let fileNo = 0;
/** Runs the independent Python verifier; returns { status, summary }. */
function verify(bytes, expect) {
  const file = join(dir, `f${fileNo++}.schem`);
  writeFileSync(file, bytes);
  const args = [new URL('../scripts/verify_schem.py', import.meta.url).pathname, file];
  if (expect) { const e = `${file}.expect.json`; writeFileSync(e, JSON.stringify(expect)); args.push('--expect', e); }
  const r = spawnSync('python3', ['-I', ...args], { encoding: 'utf8' });
  assert.equal(r.stderr, '', r.stderr);
  return { status: r.status, summary: JSON.parse(r.stdout) };
}
const ab = b => Uint8Array.from(b).buffer;
const S = (id, properties = {}) => ({ id, properties });

// Hand-built 3×2×2 world at a negative/raised position. Every expectation below is written by hand.
const STAIRS = 'minecraft:oak_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]';
const CHEST = 'minecraft:chest[facing=north,type=single,waterlogged=false]';
const MACHINE = 'example:machine[powered=true]';
const BARREL = 'minecraft:barrel[facing=up,open=false]';
const handWorld = () => createPayload({
  schemaVersion: 1, profileId: 'java:dataversion-3955:registry-unverified',
  bounds: { min: [-2, 64, 5], maxExclusive: [1, 66, 7] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0],
  palette: [
    S('minecraft:stone'), S('minecraft:oak_stairs', { waterlogged: 'false', shape: 'straight', half: 'bottom', facing: 'east' }), S('minecraft:air'),
    S('example:machine', { powered: 'true' }), S('minecraft:chest', { type: 'single', facing: 'north', waterlogged: 'false' }), S('minecraft:cave_air'),
    S('minecraft:barrel', { open: 'false', facing: 'up' }),
  ],
  cells: [
    { position: [-2, 64, 5], kind: 'block', paletteIndex: 0 },
    { position: [-1, 64, 5], kind: 'block', paletteIndex: 1 },
    { position: [0, 64, 5], kind: 'erase' },
    { position: [-2, 64, 6], kind: 'block', paletteIndex: 4 },
    { position: [-1, 64, 6], kind: 'air', paletteIndex: 2 },
    { position: [0, 64, 6], kind: 'block', paletteIndex: 3 },
    { position: [-2, 65, 5], kind: 'block', paletteIndex: 0 },
    { position: [-1, 65, 5], kind: 'air', paletteIndex: 5 },
    // [0,65,5] and [-2,65,6] are deliberately unselected.
    { position: [-1, 65, 6], kind: 'block', paletteIndex: 0 },
    { position: [0, 65, 6], kind: 'block', paletteIndex: 6 },
  ],
  blockEntities: [
    { position: [-2, 64, 6], data: { type: 'compound', value: {
      id: { type: 'string', value: 'minecraft:chest' }, x: { type: 'int', value: -2 }, y: { type: 'int', value: 64 }, z: { type: 'int', value: 6 },
      CustomName: { type: 'string', value: 'Ä\0😀' }, Items: { type: 'list', elementType: 'end', value: [] } } } },
    { position: [0, 65, 6], data: { type: 'compound', value: {
      Pos: { type: 'intArray', value: [9, 9, 9] }, Id: { type: 'string', value: 'minecraft:barrel' },
      Data: { type: 'compound', value: { Lock: { type: 'string', value: '' } } }, Extension: { type: 'string', value: 'keep' } } } },
  ],
});
const handCells = {
  '0,0,0': 'minecraft:stone', '1,0,0': STAIRS, '2,0,0': 'minecraft:air',
  '0,0,1': CHEST, '1,0,1': 'minecraft:air', '2,0,1': MACHINE,
  '0,1,0': 'minecraft:stone', '1,1,0': 'minecraft:cave_air', '2,1,0': 'minecraft:air',
  '0,1,1': 'minecraft:air', '1,1,1': 'minecraft:stone', '2,1,1': BARREL,
};
const opts = { dataVersion: 3955, anchor: 'project-origin', unselected: 'air' };

test('NBT writer reproduces the independent Python fixture byte for byte', () => {
  const raw = Buffer.from(readFileSync(new URL('../fixtures/schem/asymmetric.nbt.hex', import.meta.url), 'utf8').replace(/\s/g, ''), 'hex');
  assert.deepEqual(Buffer.from(writeNbt(readNbt(raw))), raw);
});

test('Modified UTF-8: NUL as two bytes, surrogates as two 3-byte units', () => {
  assert.deepEqual([...modifiedUtf8('Ä\0😀')], [0xc3, 0x84, 0xc0, 0x80, 0xed, 0xa0, 0xbd, 0xed, 0xb8, 0x80]);
  assert.throws(() => modifiedUtf8('ä'.repeat(40000)), /65535/);
});

for (const [name, tag, pattern] of [
  ['byte overflow', { type: 'byte', value: 128 }, /byte/],
  ['fractional int', { type: 'int', value: 1.5 }, /int/],
  ['non float32', { type: 'float', value: 0.1 }, /float32/],
  ['infinite double', { type: 'double', value: Infinity }, /endlich/],
  ['long overflow', { type: 'long', value: '9223372036854775808' }, /int64/],
  ['long as number', { type: 'long', value: 5 }, /Long/],
  ['heterogeneous list', { type: 'list', elementType: 'int', value: [{ type: 'int', value: 1 }, { type: 'short', value: 1 }] }, /Listenelement/],
  ['non-empty end list', { type: 'list', elementType: 'end', value: [{ type: 'int', value: 1 }] }, /End-Liste/],
  ['byte array overflow', { type: 'byteArray', value: [200] }, /byte/],
  ['unknown type', { type: 'bogus', value: 1 }, /Unbekannt/],
]) test(`NBT writer rejects ${name}`, () => {
  assert.throws(() => writeNbt({ name: '', tag: { type: 'compound', value: { x: tag } } }), pattern);
});
test('NBT writer rejects non-compound root and excessive depth', () => {
  assert.throws(() => writeNbt({ name: '', tag: { type: 'int', value: 1 } }), /Compound/);
  let deep = { type: 'compound', value: {} };
  for (let i = 0; i < 20; i++) deep = { type: 'compound', value: { a: deep } };
  assert.throws(() => writeNbt({ name: '', tag: deep }, { maxDepth: 10 }), /Tiefenlimit/);
});

test('block states are written canonically with sorted properties', () => {
  assert.equal(formatBlockState(S('minecraft:oak_stairs', { waterlogged: 'false', facing: 'east' })), 'minecraft:oak_stairs[facing=east,waterlogged=false]');
  assert.equal(formatBlockState(S('minecraft:stone')), 'minecraft:stone');
  assert.throws(() => formatBlockState(S('example:x', { a: 'b,c' })), /nicht darstellbar/);
  assert.throws(() => formatBlockState(S('example:x', { a: 'b]' })), /nicht darstellbar/);
});

test('hand world: exact palette order, VarInt data, offset, policy counts', () => {
  const { nbt, report } = buildSchemV3(handWorld(), opts);
  const s = nbt.tag.value.Schematic.value;
  assert.deepEqual(Object.keys(s), ['Version', 'DataVersion', 'Metadata', 'Width', 'Height', 'Length', 'Offset', 'Blocks']);
  assert.equal(s.Version.value, 3); assert.equal(s.DataVersion.value, 3955);
  assert.deepEqual([s.Width.value, s.Height.value, s.Length.value], [3, 2, 2]);
  assert.deepEqual(s.Offset.value, [-2, 64, 5]);
  const pal = Object.fromEntries(Object.entries(s.Blocks.value.Palette.value).map(([k, v]) => [k, v.value]));
  assert.deepEqual(pal, { 'minecraft:stone': 0, [STAIRS]: 1, 'minecraft:air': 2, [CHEST]: 3, [MACHINE]: 4, 'minecraft:cave_air': 5, [BARREL]: 6 });
  assert.deepEqual(s.Blocks.value.Data.value, [0, 1, 2, 3, 2, 4, 0, 5, 2, 2, 0, 6]);
  const [chest, barrel] = s.Blocks.value.BlockEntities.value.map(e => e.value);
  assert.deepEqual(chest.Pos.value, [0, 0, 1]); assert.equal(chest.Id.value, 'minecraft:chest');
  assert.deepEqual(Object.keys(chest.Data.value).sort(), ['CustomName', 'Items']);
  assert.deepEqual(barrel.Pos.value, [2, 1, 1]); assert.equal(barrel.Extension.value, 'keep'); assert.equal(barrel.Data.value.Lock.value, '');
  const m = s.Metadata.value;
  assert.deepEqual(m.RequiredMods.value.map(t => t.value), ['example']);
  assert.deepEqual([m.WEOffsetX.value, m.WEOffsetY.value, m.WEOffsetZ.value], [-2, 64, 5]);
  assert.deepEqual(report.counts, { blocks: 7, explicitAir: 2, erasedAsAir: 1, unselected: 2 });
  assert.equal(report.paletteSize, 7); assert.equal(report.blockEntities, 2); assert.equal(report.convertedBlockEntities, 1);
  assert.deepEqual(report.worldMin, [-2, 64, 5]);
  assert.ok(report.warnings.some(w => w.includes('Löschzellen')) && report.warnings.some(w => w.includes('nicht ausgewählte')) && report.warnings.some(w => w.includes('example')));
});

test('independent Python verifier accepts the hand world and agrees cell by cell', async () => {
  const out = await writeSchemV3(handWorld(), { ...opts, metadata: { name: 'Hand', date: 1767225600000 } });
  assert.equal(out.sha256, createHash('sha256').update(out.bytes).digest('hex'));
  const { status, summary } = verify(out.bytes, {
    dataVersion: 3955, size: [3, 2, 2], offset: [-2, 64, 5], paletteSize: 7,
    counts: { 'minecraft:air': 4, 'minecraft:cave_air': 1, 'minecraft:stone': 3, [BARREL]: 1, [CHEST]: 1, [STAIRS]: 1, [MACHINE]: 1 },
    cells: handCells,
    blockEntities: [
      { pos: [0, 0, 1], id: 'minecraft:chest', state: CHEST, dataKeys: ['CustomName', 'Items'] },
      { pos: [2, 1, 1], id: 'minecraft:barrel', state: BARREL, dataKeys: ['Lock'] },
    ],
    metadataKeys: ['Date', 'Name', 'RequiredMods', 'WEOffsetX', 'WEOffsetY', 'WEOffsetZ'],
  });
  assert.equal(status, 0, JSON.stringify(summary)); assert.equal(summary.valid, true);
});

test('roundtrip through the own importer keeps states, positions, Offset and BlockEntity data', async () => {
  const world = handWorld();
  const out = await writeSchemV3(world, opts);
  const back = await importSchemV3(ab(out.bytes));
  assert.deepEqual(back.offset, [-2, 64, 5]); assert.equal(back.dataVersion, 3955);
  const key = s => formatBlockState(s);
  const got = Object.fromEntries(back.payload.cells.map(c => [c.position.join(','), key(back.payload.palette[c.paletteIndex])]));
  assert.deepEqual(got, handCells);
  assert.equal(back.payload.cells.filter(c => c.kind === 'air').length, 5);
  const be = Object.fromEntries(back.payload.blockEntities.map(e => [e.position.join(','), e.data.value]));
  assert.equal(be['0,0,1'].Data.value.CustomName.value, 'Ä\0😀');
  assert.equal(be['2,1,1'].Extension.value, 'keep');
  // Re-export of the import gives identical NBT (stable writer, no drift).
  const again = buildSchemV3(createPayload({ ...back.payload, bounds: { min: [-2, 64, 5], maxExclusive: [1, 66, 7] },
    cells: back.payload.cells.map(c => ({ ...c, position: [c.position[0] - 2, c.position[1] + 64, c.position[2] + 5] })),
    blockEntities: back.payload.blockEntities.map(e => ({ ...e, position: [e.position[0] - 2, e.position[1] + 64, e.position[2] + 5] })) }), opts);
  assert.deepEqual(Buffer.from(writeNbt(again.nbt)), Buffer.from(out.raw));
});

test('min-corner anchor and structure_void policy', async () => {
  const out = await writeSchemV3(handWorld(), { ...opts, anchor: 'min-corner', unselected: 'structure_void' });
  assert.deepEqual(out.report.offset, [0, 0, 0]); assert.equal(out.report.unselectedState, 'minecraft:structure_void');
  const { status, summary } = verify(out.bytes);
  assert.equal(status, 0);
  assert.deepEqual(summary.offset, [0, 0, 0]);
  assert.equal(summary.counts['minecraft:structure_void'], 2); assert.equal(summary.counts['minecraft:air'], 2);
  assert.equal(summary.cells['2,1,0'], 'minecraft:structure_void'); assert.equal(summary.cells['0,1,1'], 'minecraft:structure_void');
  assert.equal(summary.cells['2,0,0'], 'minecraft:air', 'erase stays air under every policy');
});

test('palette ids ≥ 128 use multi-byte VarInts', async () => {
  const n = 300;
  const world = createPayload({ schemaVersion: 1, profileId: 'p', bounds: { min: [0, 0, 0], maxExclusive: [n, 1, 1] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0],
    palette: Array.from({ length: n }, (_, i) => S(`test:b${i}`)), cells: Array.from({ length: n }, (_, i) => ({ position: [i, 0, 0], kind: 'block', paletteIndex: i })), blockEntities: [] });
  const out = await writeSchemV3(world, opts);
  const data = out.nbt.tag.value.Schematic.value.Blocks.value.Data.value;
  assert.equal(data.length, 128 + 2 * (n - 128));
  assert.deepEqual(data.slice(127, 131), [127, -128, 1, -127]); // 127, then 128 = 0x80 0x01, 129 = 0x81 0x01
  const { status, summary } = verify(out.bytes);
  assert.equal(status, 0); assert.equal(summary.paletteSize, n); assert.equal(summary.cells['299,0,0'], 'test:b299');
  const back = await importSchemV3(ab(out.bytes), { maxPalette: 1000, maxDimension: 512 });
  assert.equal(back.payload.palette[back.payload.cells[299].paletteIndex].id, 'test:b299');
});

test('export refuses what it cannot write faithfully', () => {
  const w = handWorld();
  assert.throws(() => buildSchemV3(w, { ...opts, dataVersion: 0 }), /DataVersion/);
  assert.throws(() => buildSchemV3(w, { ...opts, dataVersion: 1.5 }), /DataVersion/);
  assert.throws(() => buildSchemV3(w, { ...opts, anchor: 'centre' }), /Anker/);
  assert.throws(() => buildSchemV3(w, opts, { maxVolume: 11 }), /Volumen/);
  const noId = createPayload({ ...structuredClone(w), blockEntities: [{ position: [-2, 64, 6], data: { type: 'compound', value: { Items: { type: 'list', elementType: 'end', value: [] } } } }] });
  assert.throws(() => buildSchemV3(noId, opts), /keine Id/);
  assert.throws(() => buildSchemV3(w, { ...opts, metadata: { extra: { WEOffsetX: { type: 'int', value: 1 } } } }), /reserviert/);
  assert.ok(new FormatError('X', 'y') instanceof Error);
});

test('independent verifier rejects corrupted files', () => {
  const base = () => structuredClone(buildSchemV3(handWorld(), opts).nbt);
  const file = nbt => gzipSync(writeNbt(nbt));
  const s = n => n.tag.value.Schematic.value;
  const cases = [
    ['short data', n => { s(n).Blocks.value.Data.value.pop(); }, /block values|truncated/],
    ['palette gap', n => { s(n).Blocks.value.Palette.value['minecraft:stone'].value = 9; }, /contiguous/],
    ['unknown id', n => { s(n).Blocks.value.Data.value[0] = 7; }, /unknown palette id/],
    ['entity on air', n => { s(n).Blocks.value.BlockEntities.value[0].value.Pos.value = [1, 0, 1]; }, /on air/],
    ['entity outside', n => { s(n).Blocks.value.BlockEntities.value[0].value.Pos.value = [3, 0, 0]; }, /outside/],
    ['version 2', n => { s(n).Version.value = 2; }, /Version/],
    ['open varint', n => { s(n).Blocks.value.Data.value[11] = -128; }, /truncated varint/],
  ];
  for (const [name, change, pattern] of cases) {
    const n = base(); change(n);
    const { status, summary } = verify(file(n));
    assert.equal(status, 1, name); assert.match(summary.error, pattern, name);
  }
  const ok = verify(file(base()));
  assert.equal(ok.status, 0);
  assert.equal(verify(Buffer.from('not gzip')).status, 1);
});

// --- Domain: export lock and frozen revisions -------------------------------------------

const lib = await createSampleLibrary();
const versions = new Map(lib.versions.map(v => [v.id, v]));
const tower = lib.versions.find(v => v.assetId === 'sample_tower'), wall = lib.versions.find(v => v.assetId === 'sample_wall');
const place = (version, position) => newInstance({ assetVersionId: version.id, name: version.assetId, transform: { position, quarterTurns: 0, mirrorX: false } });
function build(...instances) {
  let p = createProject({ name: 'Burg Süd' }), h = EMPTY_HISTORY;
  for (const instance of instances) ({ project: p, history: h } = execute(p, h, { kind: 'instance.add', instance }));
  return p;
}
const settings = { dataVersion: 3955, anchor: 'project-origin', unselected: 'air' };

test('export freezes one revision, reuses it while unchanged and names it', async () => {
  let p = build(place(tower, [0, 0, 0]), place(wall, [10, 0, 0]));
  const first = revisionForExport(p, resolveProject(p, versions), 'Abnahme');
  assert.equal(first.created, true); assert.equal(first.revision.number, 1); assert.equal(first.revision.comment, 'Abnahme');
  p = first.project;
  const again = revisionForExport(p, resolveProject(p, versions), 'egal');
  assert.equal(again.created, false); assert.equal(again.revision.id, first.revision.id);
  const a = await exportRevisionSchem(p, first.revision.id, versions, settings);
  assert.equal(a.fileName, 'burg-sud-rev1.schem'); assert.equal(exportFileName({ name: '!!!' }, { number: 4 }), 'bauplan-rev4.schem');
  const meta = readNbt(gzipToRaw(a.bytes)).tag.value.Schematic.value.Metadata.value;
  assert.equal(meta.Bauplaner.value.RevisionNumber.value, 1); assert.equal(meta.Bauplaner.value.RevisionId.value, first.revision.id);
  assert.equal(meta.Name.value, 'Burg Süd · Revision 1');
  const b = await exportRevisionSchem(p, first.revision.id, versions, settings);
  assert.equal(b.sha256, a.sha256, 'same revision, same settings ⇒ identical file');

  // Later edits create a new revision; the old one still exports its frozen content.
  ({ project: p } = execute(p, EMPTY_HISTORY, { kind: 'instance.remove', instanceId: p.instances[1].id }));
  const second = revisionForExport(p, resolveProject(p, versions), '');
  assert.equal(second.created, true); assert.equal(second.revision.number, 2); assert.equal(second.revision.comment, 'Schem-Export');
  p = second.project;
  const old = await exportRevisionSchem(p, first.revision.id, versions, settings);
  assert.equal(old.sha256, a.sha256);
  const now = await exportRevisionSchem(p, second.revision.id, versions, settings);
  assert.notEqual(now.sha256, a.sha256);
  const world = resolveProject(p, versions).world;
  const blocks = world.cells.filter(c => c.kind === 'block').length;
  const v = verify(now.bytes);
  assert.equal(v.status, 0);
  const nonAir = Object.entries(v.summary.counts).filter(([k]) => !k.startsWith('minecraft:air')).reduce((s, [, n]) => s + n, 0);
  assert.equal(nonAir, blocks);
});

test('export lock: conflicts, missing versions and empty projects refuse to freeze or write', async () => {
  const clash = build(place(tower, [0, 0, 0]), place(wall, [1, 0, 0]));
  const r = resolveProject(clash, versions);
  assert.ok(r.exportBlockers.length);
  assert.throws(() => revisionForExport(clash, r, ''), e => e instanceof DomainError && e.code === 'EXPORT_BLOCKED');
  assert.throws(() => revisionForExport(build(), resolveProject(build(), versions), ''), /keine Bauteile/);
  // A clean revision becomes blocked once a version is missing.
  let p = build(place(tower, [0, 0, 0]));
  const { project, revision } = revisionForExport(p, resolveProject(p, versions), '');
  await assert.rejects(exportRevisionSchem(project, revision.id, new Map(), settings), /nicht exportierbar/);
  await assert.rejects(exportRevisionSchem(project, 'rev_missing', versions, settings), /existiert nicht/);
});

test('DataVersion suggestion: profile, then shared source, never guessed', () => {
  assert.equal(dataVersionFromProfile('java:dataversion-3465:registry-unverified'), 3465);
  assert.equal(dataVersionFromProfile('java:registry-unverified'), null);
  assert.equal(dataVersionFromProfile('java:dataversion-99999999999:x'), null);
  const p = build(place(tower, [0, 0, 0]));
  assert.equal(suggestDataVersion(p, versions).dataVersion, null);
  assert.equal(suggestDataVersion({ ...p, profileId: 'java:dataversion-3700' }, versions).dataVersion, 3700);
  const imported = new Map([[tower.id, { ...tower, source: { format: 'schem-v3', dataVersion: 3465 } }]]);
  assert.equal(suggestDataVersion(p, imported).dataVersion, 3465);
  const other = new Map([...imported, [wall.id, { ...wall, source: { format: 'schem-v3', dataVersion: 3955 } }]]);
  const mixed = suggestDataVersion(build(place(tower, [0, 0, 0]), place(wall, [10, 0, 0])), other);
  assert.equal(mixed.dataVersion, null); assert.match(mixed.source, /3465, 3955/);
});

function gzipToRaw(bytes) { return new Uint8Array(gunzipSync(bytes)); }
