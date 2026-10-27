import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { createPayload, countBlocks } from '../dist/voxel/src/index.js';
import {
  readNbt, writeNbt, importLitematic, normalizeLitematic, importStructure, detectStructureFormat, buildLitematic, writeLitematic,
  packLongs, unpackAt, litematicBits, litematicVersionFor, FormatError,
} from '../dist/formats/src/index.js';
import {
  createProject, execute, newInstance, EMPTY_HISTORY, resolveProject, createSampleLibrary, revisionForExport, exportRevisionSchem, exportFileName,
} from '../dist/domain/src/index.js';

const raw = Buffer.from(readFileSync(new URL('../fixtures/litematic/multiregion.nbt.hex', import.meta.url), 'utf8').replace(/\s/g, ''), 'hex');
const zipped = gzipSync(raw);
const ab = b => Uint8Array.from(b).buffer;
const source = () => readNbt(raw);
const dir = mkdtempSync(join(tmpdir(), 'litematic-'));
let fileNo = 0;
/** Independent Python reader; returns its JSON summary. */
function verify(bytes) {
  const file = join(dir, `f${fileNo++}.litematic`);
  writeFileSync(file, bytes);
  const r = spawnSync('python3', ['-I', new URL('../scripts/verify_litematic.py', import.meta.url).pathname, file], { encoding: 'utf8' });
  assert.equal(r.stderr, '', r.stderr);
  const summary = JSON.parse(r.stdout);
  assert.equal(r.status, summary.valid ? 0 : 1);
  return summary;
}
const text = s => s.id + (Object.keys(s.properties).length ? `[${Object.entries(s.properties).sort(([a], [b]) => a < b ? -1 : 1).map(([k, v]) => `${k}=${v}`).join(',')}]` : '');
/** Payload cells keyed by schematic-origin coordinate, like the Python verifier. */
const cellMap = (payload, offset) => Object.fromEntries(payload.cells.map(c => [c.position.map((v, i) => v + offset[i]).join(','), text(payload.palette[c.paletteIndex])]));
const STAIRS = 'minecraft:oak_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]';
const CHEST = 'minecraft:chest[facing=north,type=single,waterlogged=false]';
const MACHINE = 'example:machine[powered=true]';

test('independent fixture: two regions, signed sizes, enclosing box and exact cells', async () => {
  const r = await importLitematic(ab(zipped));
  assert.equal(r.format, 'litematic'); assert.equal(r.version, 6); assert.equal(r.subVersion, 1); assert.equal(r.dataVersion, 3465);
  assert.equal(r.sourceSha256, createHash('sha256').update(zipped).digest('hex'));
  assert.deepEqual(r.offset, [0, 0, -2]); assert.deepEqual(r.payload.sourceOrigin, [0, 0, -2]);
  assert.deepEqual(r.payload.bounds, { min: [0, 0, 0], maxExclusive: [7, 3, 4] });
  assert.deepEqual(r.regions.map(g => [g.name, g.min, g.dimensions, g.bitsPerEntry, g.paletteSize, g.blocks, g.air]), [
    ['Haus', [4, 0, -2], [3, 2, 4], 3, 6, 17, 7],
    ['Turm', [0, 0, 0], [2, 3, 1], 2, 3, 5, 1],
  ]);
  assert.deepEqual(r.regions[0].size, [3, 2, -4]); assert.deepEqual(r.regions[1].position, [1, 0, 0]);
  const c = countBlocks(r.payload);
  assert.equal(c.blocks, 22); assert.equal(c.air, 8); assert.equal(r.payload.cells.length, 30);
  assert.equal(c.states.find(x => x.state.id === 'minecraft:stone').count, 8);
  assert.equal(r.payload.palette.filter(s => s.id === 'minecraft:stone').length, 1);
  const cells = cellMap(r.payload, r.offset);
  // Hand table from fixtures/litematic/README.md, schematic-origin coordinates.
  assert.equal(cells['4,1,1'], MACHINE, 'cell straddling long 0/1');
  assert.equal(cells['4,0,0'], CHEST); assert.equal(cells['6,0,0'], STAIRS); assert.equal(cells['5,0,0'], 'minecraft:air');
  assert.equal(cells['5,1,-2'], 'minecraft:oak_planks'); assert.equal(cells['6,1,1'], STAIRS);
  assert.equal(cells['0,2,0'], 'minecraft:stone'); assert.equal(cells['1,1,0'], 'minecraft:air'); assert.equal(cells['1,2,0'], 'minecraft:cobblestone');
  assert.equal(cells['2,0,0'], undefined, 'gap between regions stays unselected');
  assert.deepEqual(r.payload.blockEntities.map(e => e.position), [[4, 0, 2]]);
  const chest = r.payload.blockEntities[0].data.value;
  assert.equal(chest.id.value, 'minecraft:chest'); assert.equal(chest.CustomName.value, 'Ä\0😀'); assert.deepEqual([chest.x.value, chest.y.value, chest.z.value], [0, 0, 2]);
  assert.equal(r.metadata.name, 'Vertragsfixture'); assert.equal(r.metadata.timeModified, '9223372036854775807'); assert.deepEqual(r.metadata.enclosingSize, [7, 3, 4]);
  for (const w of ['2 Regionen', 'freie Entities', 'ticks', 'Modblöcke']) assert.ok(r.warnings.some(x => x.includes(w)), w);
  assert.ok(r.payload.profileId.includes('3465') && r.payload.profileId.includes('unverified'));
});

test('TypeScript reader and independent Python reader agree cell by cell', async () => {
  const r = await importLitematic(ab(zipped));
  const py = verify(zipped);
  assert.equal(py.valid, true);
  assert.deepEqual(cellMap(r.payload, r.offset), py.cells);
  assert.deepEqual(py.regions.map(g => [g.name, g.min, g.bits, g.longs]), [['Haus', [4, 0, -2], 3, 2], ['Turm', [0, 0, 0], 2, 1]]);
});

test('single region import keeps the region position as origin and reports the rest', () => {
  const r = normalizeLitematic(source(), { region: 'Turm' });
  assert.equal(r.selectedRegion, 'Turm'); assert.equal(r.regions.length, 2);
  assert.deepEqual(r.payload.bounds.maxExclusive, [2, 3, 1]); assert.deepEqual(r.offset, [0, 0, 0]);
  assert.equal(r.payload.cells.length, 6); assert.equal(r.payload.blockEntities.length, 0);
  assert.ok(r.warnings.some(w => w.includes('Nur Region „Turm“')));
  assert.equal(normalizeLitematic(source(), { region: 'Haus' }).payload.blockEntities.length, 1);
  assert.throws(() => normalizeLitematic(source(), { region: 'Keller' }), /Keller/);
});

test('bit packing matches LitematicaBitArray for every width and straddling entries', () => {
  for (let bits = 2; bits <= 20; bits++) {
    const values = Array.from({ length: 200 }, (_, i) => (i * 2654435761 >>> 0) % (2 ** bits));
    const longs = packLongs(values, bits);
    assert.equal(longs.length, Math.ceil(200 * bits / 64));
    const words = new Uint32Array(longs.flatMap(s => { const v = BigInt.asUintN(64, BigInt(s)); return [Number(v & 0xffffffffn), Number(v >> 32n)]; }));
    assert.deepEqual(values.map((_, i) => unpackAt(words, bits, i)), values, `bits ${bits}`);
    // Reference: one big integer, bit k of the stream = bit k%64 of long k/64.
    const big = longs.reduce((acc, s, k) => acc | (BigInt.asUintN(64, BigInt(s)) << BigInt(64 * k)), 0n);
    values.forEach((v, i) => assert.equal(Number((big >> BigInt(i * bits)) & ((1n << BigInt(bits)) - 1n)), v));
  }
  assert.deepEqual([1, 2, 3, 4, 5, 8, 9, 16, 17, 20000].map(litematicBits), [2, 2, 2, 2, 3, 3, 4, 4, 5, 15]);
});

// Error cases on the parsed fixture tree.
const mutate = change => { const s = source(); change(s.tag.value); return s; };
const haus = root => root.Regions.value.Haus.value;
for (const [name, change, pattern] of [
  ['newer format', r => { r.Version = { type: 'int', value: 8 }; }, /neuer als die bekannte Version 7/],
  ['format 1', r => { r.Version = { type: 'int', value: 1 }; }, /Format 1/],
  ['missing version', r => { delete r.Version; }, /Version/],
  ['no regions', r => { r.Regions = { type: 'compound', value: {} }; }, /keine Region/],
  ['zero size', r => { haus(r).Size.value.y = { type: 'int', value: 0 }; }, /0 sein/],
  ['too few longs', r => { haus(r).BlockStates = { type: 'longArray', value: ['0'] }; }, /1 Longs, erwartet 2/],
  ['palette index out of range', r => { haus(r).BlockStatePalette = { type: 'list', elementType: 'compound', value: haus(r).BlockStatePalette.value.slice(0, 5) }; }, /Paletteneintrag 5/],
  ['palette without Name', r => { haus(r).BlockStatePalette.value[1] = { type: 'compound', value: {} }; }, /Name/],
  ['invalid block id', r => { haus(r).BlockStatePalette.value[1] = { type: 'compound', value: { Name: { type: 'string', value: 'Stone!' } } }; }, /Block-ID/],
  ['non-string property', r => { haus(r).BlockStatePalette.value[3].value.Properties.value.facing = { type: 'int', value: 1 }; }, /Properties\.facing/],
  ['negative data version', r => { r.MinecraftDataVersion = { type: 'int', value: -1 }; }, /negativ/],
  ['sponge root', r => { r.Schematic = { type: 'compound', value: {} }; }, /Sponge/],
]) test(`rejects ${name}`, () => {
  assert.throws(() => normalizeLitematic(mutate(change)), e => e instanceof FormatError && pattern.test(e.message));
});

test('limits: total volume, box per axis (with region hint) and region count', () => {
  assert.throws(() => normalizeLitematic(source(), { maxVolume: 29 }), e => e.code === 'LIMIT');
  assert.equal(normalizeLitematic(source(), { maxVolume: 24, region: 'Haus' }).payload.cells.length, 24);
  assert.throws(() => normalizeLitematic(source(), { maxDimension: 6 }), /einzeln|getrennt/);
  assert.throws(() => normalizeLitematic(source(), { maxRegions: 1 }), e => e.code === 'LIMIT');
  assert.throws(() => normalizeLitematic(source(), { maxVolume: 0 }), /Limit/);
});

test('overlapping regions: later region wins, conflict is reported, its tile entity is dropped', () => {
  const s = mutate(r => { r.Regions.value.Turm.value.Position = { type: 'compound', value: { x: { type: 'int', value: 5 }, y: { type: 'int', value: 0 }, z: { type: 'int', value: 0 } } }; });
  // Turm now covers x 4..5, z 0: over the chest at 4/0/0 and the air at 5/0/0.
  const r = normalizeLitematic(s);
  const cells = cellMap(r.payload, r.offset);
  assert.equal(cells['4,0,0'], 'minecraft:cobblestone'); assert.equal(cells['5,1,0'], 'minecraft:air');
  assert.equal(r.payload.blockEntities.length, 0);
  assert.ok(r.warnings.some(w => /\d+ Zellen liegen in mehreren Regionen/.test(w)));
});

test('tile entities outside the region or on air stay only in the original', () => {
  const s = mutate(r => { const t = haus(r).TileEntities.value[0].value; t.x = { type: 'int', value: 1 }; });
  const r = normalizeLitematic(s);
  assert.equal(r.payload.blockEntities.length, 0); assert.ok(r.warnings.some(w => w.includes('auf Luft')));
});

test('pre-1.13 files are read without conversion and flagged', () => {
  const r = normalizeLitematic(mutate(r => { r.Version = { type: 'int', value: 4 }; r.MinecraftDataVersion = { type: 'int', value: 1139 }; }));
  assert.ok(r.warnings.some(w => w.includes('1.12')));
  const n = normalizeLitematic(mutate(r => { delete r.MinecraftDataVersion; delete r.SubVersion; }));
  assert.equal(n.dataVersion, 0); assert.equal(n.subVersion, null); assert.ok(n.warnings.some(w => w.includes('fehlt')));
});

test('content sniffing: one entry point for Schem v3 and Litematic', async () => {
  const lit = await importStructure(ab(zipped));
  assert.equal(lit.format, 'litematic'); assert.equal(lit.result.payload.cells.length, 30);
  const one = await importStructure(ab(zipped), { region: 'Haus' });
  assert.equal(one.result.selectedRegion, 'Haus');
  const schemRaw = Buffer.from(readFileSync(new URL('../fixtures/schem/asymmetric.nbt.hex', import.meta.url), 'utf8').replace(/\s/g, ''), 'hex');
  const schem = await importStructure(ab(gzipSync(schemRaw)));
  assert.equal(schem.format, 'schem'); assert.deepEqual(schem.result.offset, [-10, 64, 30]);
  const tag = value => ({ type: 'compound', value });
  assert.throws(() => detectStructureFormat(tag({ Blocks: { type: 'byteArray', value: [] }, Materials: { type: 'string', value: 'Alpha' } })), /MCEdit/);
  assert.throws(() => detectStructureFormat(tag({ size: { type: 'list', elementType: 'int', value: [] }, palette: { type: 'list', elementType: 'end', value: [] } })), /\.nbt/);
  assert.throws(() => detectStructureFormat(tag({})), /Unbekanntes Strukturformat/);
  await assert.rejects(importStructure(ab(raw)), /GZip/);
});

// Writer.
const S = (id, properties = {}) => ({ id, properties });
const handWorld = () => createPayload({
  schemaVersion: 1, profileId: 'java:dataversion-3955:registry-unverified',
  bounds: { min: [-2, 64, 5], maxExclusive: [1, 66, 7] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0],
  palette: [S('minecraft:stone'), S('minecraft:oak_stairs', { waterlogged: 'false', shape: 'straight', half: 'bottom', facing: 'east' }), S('minecraft:cave_air'),
    S('example:machine', { powered: 'true' }), S('minecraft:chest', { type: 'single', facing: 'north', waterlogged: 'false' }), S('minecraft:barrel', { open: 'false', facing: 'up' })],
  cells: [
    { position: [-2, 64, 5], kind: 'block', paletteIndex: 0 }, { position: [-1, 64, 5], kind: 'block', paletteIndex: 1 }, { position: [0, 64, 5], kind: 'erase' },
    { position: [-2, 64, 6], kind: 'block', paletteIndex: 4 }, { position: [0, 64, 6], kind: 'block', paletteIndex: 3 },
    { position: [-2, 65, 5], kind: 'block', paletteIndex: 0 }, { position: [-1, 65, 5], kind: 'air', paletteIndex: 2 },
    { position: [-1, 65, 6], kind: 'block', paletteIndex: 0 }, { position: [0, 65, 6], kind: 'block', paletteIndex: 5 },
  ],
  blockEntities: [
    { position: [-2, 64, 6], data: { type: 'compound', value: { id: { type: 'string', value: 'minecraft:chest' }, x: { type: 'int', value: -2 }, y: { type: 'int', value: 64 }, z: { type: 'int', value: 6 }, CustomName: { type: 'string', value: 'Ä\0😀' } } } },
    { position: [0, 65, 6], data: { type: 'compound', value: { Pos: { type: 'intArray', value: [9, 9, 9] }, Id: { type: 'string', value: 'minecraft:barrel' }, Data: { type: 'compound', value: { Lock: { type: 'string', value: '' } } }, Extension: { type: 'string', value: 'lost' } } } },
  ],
});
// [-1,64,6], [0,65,5] and [-2,65,6] are unselected; Y→Z→X, schematic origin = region position.
const handCells = (o, unselected = 'minecraft:air') => {
  const rows = [
    ['minecraft:stone', STAIRS, 'minecraft:air'], [CHEST, unselected, MACHINE],
    ['minecraft:stone', 'minecraft:cave_air', unselected], [unselected, 'minecraft:stone', 'minecraft:barrel[facing=up,open=false]'],
  ];
  const out = {};
  rows.forEach((row, r) => row.forEach((s, x) => { out[`${o[0] + x},${o[1] + (r >> 1)},${o[2] + (r & 1)}`] = s; }));
  return out;
};
const opts = { dataVersion: 3955, anchor: 'project-origin', unselected: 'air', regionName: 'Hafen' };

test('writer: layout, air at palette 0, tile format and counts', () => {
  const { nbt, report } = buildLitematic(handWorld(), { ...opts, metadata: { name: 'Hand', author: 'Philipp', date: 1767225600000, extra: { Bauplaner: { type: 'compound', value: {} } } } });
  const root = nbt.tag.value;
  assert.deepEqual(Object.keys(root), ['MinecraftDataVersion', 'Version', 'SubVersion', 'Metadata', 'Regions']);
  assert.deepEqual([root.MinecraftDataVersion.value, root.Version.value, root.SubVersion.value], [3955, 7, 1]);
  const region = root.Regions.value.Hafen.value;
  assert.deepEqual(Object.fromEntries(['x', 'y', 'z'].map(k => [k, region.Position.value[k].value])), { x: -2, y: 64, z: 5 });
  assert.equal(region.BlockStatePalette.value[0].value.Name.value, 'minecraft:air');
  assert.equal(region.BlockStatePalette.value.length, 7); assert.equal(report.bitsPerEntry, 3); assert.equal(region.BlockStates.value.length, 1);
  const [chest, barrel] = region.TileEntities.value.map(t => t.value);
  assert.deepEqual([chest.id.value, chest.x.value, chest.y.value, chest.z.value, chest.CustomName.value], ['minecraft:chest', 0, 0, 1, 'Ä\0😀']);
  assert.deepEqual([barrel.id.value, barrel.x.value, barrel.y.value, barrel.z.value, barrel.Lock.value], ['minecraft:barrel', 2, 1, 1, '']);
  assert.equal(barrel.Pos, undefined); assert.equal(barrel.Extension, undefined);
  const m = root.Metadata.value;
  assert.deepEqual([m.Name.value, m.Author.value, m.RegionCount.value, m.TotalVolume.value, m.TotalBlocks.value, m.TimeCreated.value], ['Hand', 'Philipp', 1, 12, 7, '1767225600000']);
  assert.ok(m.Bauplaner);
  assert.deepEqual(report.counts, { blocks: 7, explicitAir: 1, erasedAsAir: 1, unselected: 3 });
  assert.equal(report.convertedBlockEntities, 1); assert.equal(report.droppedBlockEntityFields, 1);
  assert.ok(report.warnings.some(w => w.includes('Paste Replace Behavior')) && report.warnings.some(w => w.includes('Zusatzfelder')));
  assert.ok(!report.warnings.some(w => /WorldEdit|-a\b/.test(w)));
  assert.throws(() => buildLitematic(handWorld(), { ...opts, metadata: { extra: { Name: { type: 'string', value: 'x' } } } }), /reserviert/);
});

test('writer output: independent Python reader, exact cells, both anchors and policies', async () => {
  for (const [anchor, origin] of [['project-origin', [-2, 64, 5]], ['min-corner', [0, 0, 0]]]) for (const unselected of ['air', 'structure_void']) {
    const out = await writeLitematic(handWorld(), { ...opts, anchor, unselected });
    assert.equal(out.sha256, createHash('sha256').update(out.bytes).digest('hex'));
    const py = verify(out.bytes);
    assert.equal(py.valid, true, py.error);
    assert.deepEqual(py.cells, handCells(origin, unselected === 'air' ? 'minecraft:air' : 'minecraft:structure_void'));
    assert.deepEqual(py.tileEntities.map(t => [t.id, t.pos]), [['minecraft:chest', [origin[0], origin[1], origin[2] + 1]], ['minecraft:barrel', [origin[0] + 2, origin[1] + 1, origin[2] + 1]]]);
    assert.equal(py.regions[0].palette0, 'minecraft:air');
  }
});

test('roundtrip: written file reads back to the same blocks; output is deterministic', async () => {
  const a = await writeLitematic(handWorld(), opts), b = await writeLitematic(handWorld(), opts);
  assert.deepEqual(Buffer.from(a.raw), Buffer.from(b.raw));
  assert.deepEqual(Buffer.from(writeNbt(readNbt(a.raw))), Buffer.from(a.raw));
  const back = await importLitematic(ab(a.bytes));
  assert.deepEqual(back.offset, [-2, 64, 5]); assert.deepEqual(back.regions.map(r => r.name), ['Hafen']);
  const world = handWorld(), expected = Object.fromEntries(world.cells.filter(c => c.kind !== 'erase').map(c => [c.position.join(','), text(world.palette[c.paletteIndex])]));
  const got = cellMap(back.payload, back.offset);
  for (const [k, v] of Object.entries(expected)) assert.equal(got[k], v, k);
  assert.equal(got['0,64,5'], 'minecraft:air', 'erase cell written as air');
  assert.deepEqual(back.payload.blockEntities.map(e => e.position.map((v, i) => v + back.offset[i])), [[-2, 64, 6], [0, 65, 6]]);
});

test('target format follows the DataVersion (Litematica refuses newer formats)', () => {
  assert.deepEqual([1631, 2730, 2860, 3465, 3700, 3837, 3955, 4189].map(litematicVersionFor), [5, 5, 6, 6, 6, 7, 7, 7]);
  assert.equal(buildLitematic(handWorld(), { ...opts, dataVersion: 3465 }).nbt.tag.value.Version.value, 6);
  assert.throws(() => buildLitematic(handWorld(), { ...opts, dataVersion: 0 }), /DataVersion/);
  assert.throws(() => buildLitematic(handWorld(), opts, { maxVolume: 5 }), /Exportvolumen|Volumen/);
});

test('domain: a frozen revision exports as .litematic with the same cells as .schem', async () => {
  const lib = await createSampleLibrary();
  const versions = new Map(lib.versions.map(x => [x.id, x]));
  const v = lib.versions.find(x => x.assetId === 'sample_tower');
  let project = createProject({ name: 'Hafen Süd', profileId: 'java:dataversion-3955:registry-unverified' });
  ({ project } = execute(project, EMPTY_HISTORY, { kind: 'instance.add', instance: newInstance({ assetVersionId: v.id, name: v.assetId, transform: { position: [3, 0, -1], quarterTurns: 0, mirrorX: false } }) }));
  const resolution = resolveProject(project, versions);
  const r = revisionForExport(project, resolution, 'Litematic-Test');
  const lit = await exportRevisionSchem(r.project, r.revision.id, versions, { format: 'litematic', dataVersion: 3955, anchor: 'project-origin', unselected: 'air', author: 'Philipp' });
  assert.equal(lit.format, 'litematic'); assert.equal(lit.fileName, 'hafen-sud-rev1.litematic'); assert.equal(exportFileName(r.project, r.revision), 'hafen-sud-rev1.schem');
  assert.equal(lit.report.litematicVersion, 7); assert.equal(lit.report.regionName, 'Hafen Süd');
  const py = verify(lit.bytes);
  assert.equal(py.valid, true); assert.equal(py.metadata.Description, 'Litematic-Test'); assert.equal(py.metadata.Author, 'Philipp');
  const back = await importLitematic(ab(lit.bytes));
  const world = resolution.world;
  assert.deepEqual(back.offset, world.bounds.min);
  assert.equal(countBlocks(back.payload).blocks, countBlocks(world).blocks);
  await assert.rejects(exportRevisionSchem(r.project, r.revision.id, versions, { format: 'zip', dataVersion: 3955, anchor: 'project-origin', unselected: 'air' }), /Exportformat/);
});
