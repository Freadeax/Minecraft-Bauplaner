import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { deflateSync } from 'node:zlib';
import { python } from '../../../scripts/dev/python.mjs';
import {
  RegionReader, bytesRegionSource, collectWorldFiles, sampleWorld, sampleToPayload, sampleAt, surfaceMap, checkWorldBox, chunksOfBox,
  readRegionHeader, splitChunkRecord, parseChunkNbt, unpackSection, parseRegionFileName, lz4BlockStreamDecompress, lz4DecodeBlock, xxhash32,
  writeNbt, readNbt, defaultProperties, defaultStateCount, FormatError, SURFACE_UNKNOWN, DEFAULT_STATES_DATA_VERSION, buildSchemV3,
} from '../../../dist/formats/src/index.js';
import { stateKey, countBlocks, UNLOADED_STATE } from '../../../dist/voxel/src/index.js';

const text = s => s.id + (Object.keys(s.properties).length ? `[${Object.keys(s.properties).sort().map(k => `${k}=${s.properties[k]}`).join(',')}]` : '');

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'bauplaner-region-'));
  const r = spawnSync(python, ['-I', '-X', 'utf8', fileURLToPath(new URL('../../../scripts/fixtures/make_region_fixture.py', import.meta.url)), dir], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const sources = readdirSync(dir).filter(n => n.endsWith('.mca')).map(n => bytesRegionSource(n, new Uint8Array(readFileSync(join(dir, n)))));
  return { dir, sources, expected: JSON.parse(readFileSync(join(dir, 'expected.json'), 'utf8')) };
}
const fx = fixture();
const world = () => collectWorldFiles(fx.sources).files;

test('region file names and empty regions', async () => {
  assert.deepEqual(parseRegionFileName('world/region/r.-1.12.mca'), { rx: -1, rz: 12 });
  assert.equal(parseRegionFileName('r.1.2.mcr'), null);
  assert.equal(parseRegionFileName('level.dat'), null);
  const empty = await RegionReader.open(fx.sources.find(s => s.name === 'r.5.5.mca'));
  assert.equal(empty.entries.size, 0);
  const { ignored, duplicates } = collectWorldFiles([...fx.sources, bytesRegionSource('level.dat', new Uint8Array(1)), fx.sources[0]]);
  assert.deepEqual(ignored, ['level.dat']);
  assert.equal(duplicates.length, 1);
});

test('independent fixture: every block, state and block entity of the readable chunks', async () => {
  const box = { min: [-16, -64, -16], maxExclusive: [48, 80, 32] };
  const s = await sampleWorld(world(), box);
  const states = Object.fromEntries(s.chunks.map(c => [`${c.cx},${c.cz}`, c.state]));
  for (const [k, v] of Object.entries(fx.expected.chunks)) assert.equal(states[k], v, `Chunk ${k}`);
  assert.equal(states['-1,0'], 'no-region');
  assert.deepEqual(s.dataVersions, fx.expected.dataVersions);
  // Expected blocks inside the box, everything else in readable chunks is air.
  const want = new Map(fx.expected.blocks.filter(b => b[1] >= -64 && b[1] < 80).map(b => [`${b[0]},${b[1]},${b[2]}`, b[3]]));
  const readable = new Set(Object.entries(states).filter(([, v]) => v === 'ok').map(([k]) => k));
  let checked = 0;
  for (let y = box.min[1]; y < box.maxExclusive[1]; y++) for (let z = box.min[2]; z < box.maxExclusive[2]; z++) for (let x = box.min[0]; x < box.maxExclusive[0]; x++) {
    const st = sampleAt(s, [x, y, z]), chunk = `${Math.floor(x / 16)},${Math.floor(z / 16)}`;
    if (!readable.has(chunk)) { assert.equal(st.id, UNLOADED_STATE, `${x}/${y}/${z} muss unbekannt sein`); continue; }
    if (chunk === '-1,-1' && (y < 0 || y >= 256)) { assert.equal(st.id, 'minecraft:air'); continue; }
    assert.equal(text(st), want.get(`${x},${y},${z}`) ?? 'minecraft:air', `${x}/${y}/${z}`);
    checked++;
  }
  assert.ok(checked > 100_000);
  assert.deepEqual(s.blockEntities.map(b => b.position).sort(), fx.expected.blockEntities.map(b => b.pos).sort());
  const chest = s.blockEntities.find(b => b.position[0] === 2);
  assert.equal(chest.data.value.Items.value[0].value.id.value, 'minecraft:diamond', 'Truheninhalt verlustfrei');
  // Bare ids in 26.x palettes get the default state of the official report.
  assert.equal(text(sampleAt(s, [2, 65, 1])), 'minecraft:chest[facing=north,type=single,waterlogged=false]');
  assert.ok(s.expandedDefaults > 0);
  assert.ok(s.unknownCells > 0);
  assert.match(s.warnings.join(' '), /nicht fertig generiert/);
  assert.match(s.warnings.join(' '), /verschiedenen Spielversionen/);
});

test('incomplete chunks only on request', async () => {
  const s = await sampleWorld(world(), { min: [0, 60, 16], maxExclusive: [16, 61, 32] }, { includeIncomplete: true });
  assert.equal(s.unknownCells, 0);
  assert.equal(text(sampleAt(s, [3, 60, 20])), 'minecraft:stone');
  assert.match(s.warnings.join(' '), /trotzdem gelesen/);
});

test('excerpt payload: trim, air policy, exclusion, block entities and origin', async () => {
  const s = await sampleWorld(world(), { min: [0, 64, 0], maxExclusive: [16, 70, 16] });
  const { payload, report } = sampleToPayload(s, { air: 'none', trim: true, exclude: new Set(['minecraft:stone']) });
  assert.deepEqual(report.origin, [0, 65, 1]);
  assert.deepEqual(payload.sourceOrigin, [0, 65, 1]);
  assert.deepEqual(report.size, [16, 2, 8]);
  assert.equal(report.blocks, 18);
  assert.equal(report.excluded, 0, 'Der Stein liegt nach dem Zuschnitt außerhalb');
  assert.equal(payload.blockEntities.length, 1);
  assert.deepEqual(payload.blockEntities[0].position, [2, 0, 0]);
  const withAir = sampleToPayload(s, { air: 'explicit', trim: false });
  assert.equal(withAir.payload.cells.length, 16 * 6 * 16);
  assert.equal(countBlocks(withAir.payload).blocks, withAir.report.blocks);
  assert.equal(countBlocks(withAir.payload).air, 16 * 6 * 16 - withAir.report.blocks);
  // The excerpt exports like any other asset; raw tile x/y/z are converted by the writer.
  const schem = buildSchemV3(payload, { dataVersion: report.dataVersion, anchor: 'min-corner', unselected: 'air' });
  assert.equal(schem.report.blockEntities, 1);
  assert.throws(() => sampleToPayload(s, { air: 'none', trim: true, exclude: new Set(payload.palette.map(p => p.id).concat('minecraft:stone')) }), e => e.code === 'EMPTY');
});

test('box limits and chunk enumeration', () => {
  assert.equal(chunksOfBox({ min: [-1, 0, -1], maxExclusive: [1, 1, 1] }).length, 4);
  assert.throws(() => checkWorldBox({ min: [0, 0, 0], maxExclusive: [2000, 1, 1] }), e => e.code === 'LIMIT');
  assert.throws(() => checkWorldBox({ min: [0, -64, 0], maxExclusive: [1024, 320, 1024] }), e => e.code === 'LIMIT');
  assert.throws(() => checkWorldBox({ min: [0, 0, 0], maxExclusive: [0, 1, 1] }), e => e.code === 'BOX');
});

test('surface map shows top blocks and leaves unknown chunks empty', async () => {
  const m = await surfaceMap(world(), { cx: 0, cz: 0 }, { cx: 2, cz: 1 });
  const at = (x, z) => ({ h: m.heights[(z - m.minZ) * m.width + (x - m.minX)], id: m.ids[m.blocks[(z - m.minZ) * m.width + (x - m.minX)]] });
  assert.deepEqual(at(3, 3), { h: 64, id: 'minecraft:stone' });
  assert.deepEqual(at(5, 8), { h: 66, id: 'minecraft:lime_wool' });
  assert.deepEqual(at(40, 8), { h: 65, id: 'minecraft:oak_log' });
  assert.equal(at(3, 20).h, SURFACE_UNKNOWN, 'unfertiger Chunk bleibt leer');
  assert.equal(at(20, 20).h, SURFACE_UNKNOWN, 'fehlender Chunk bleibt leer');
});

test('section packing without spanning, bit widths 4/5/12', () => {
  for (const n of [2, 17, 20, 4096]) {
    const bits = Math.max(4, Math.ceil(Math.log2(n))), per = Math.floor(64 / bits);
    const idx = Array.from({ length: 4096 }, (_, i) => (i * 7919) % n);
    const longs = [];
    for (let s = 0; s < 4096; s += per) {
      let v = 0n; idx.slice(s, s + per).forEach((x, k) => { v |= BigInt(x) << BigInt(k * bits); });
      longs.push(BigInt.asIntN(64, v).toString());
    }
    assert.deepEqual([...unpackSection(longs, n, 'test')], idx, `${n} Einträge`);
  }
  assert.throws(() => unpackSection(['0'], 20, 'kurz'), FormatError);
  // Index beyond the palette.
  const bad = Array.from({ length: 256 }, () => '15');
  assert.throws(() => unpackSection(bad, 3, 'x'), /außerhalb der Palette/);
});

test('header checks reject inconsistent copies', () => {
  const bytes = new Uint8Array(readFileSync(join(fx.dir, 'r.0.0.mca')));
  const cut = bytes.slice(0, bytes.length - 4096);
  assert.throws(() => readRegionHeader(cut, { rx: 0, rz: 0 }, cut.length), /außerhalb der Datei/);
  const overlap = bytes.slice();
  overlap.set(overlap.subarray(0, 4), 4); // chunk 1 points at chunk 0's sectors
  assert.throws(() => readRegionHeader(overlap, { rx: 0, rz: 0 }, overlap.length), /überlappen/);
  assert.throws(() => splitChunkRecord(new Uint8Array([0, 0, 0, 2, 127, 0]), 'x'), /Typ 127/);
  assert.throws(() => splitChunkRecord(new Uint8Array([0, 0, 0, 9, 2, 0]), 'x'), /reservierten Sektoren/);
});

test('chunk at the wrong coordinates and old worlds are refused', async () => {
  const bytes = new Uint8Array(readFileSync(join(fx.dir, 'r.0.0.mca')));
  const reader = await RegionReader.open(bytesRegionSource('r.1.0.mca', bytes));
  const r = await reader.chunk(32, 0);
  assert.equal(r.state, 'error');
  assert.match(r.message, /nennt Chunk 0\/0/);
  const old = { type: 'compound', value: { DataVersion: { type: 'int', value: 1976 }, Level: { type: 'compound', value: {} } } };
  assert.throws(() => parseChunkNbt(old), /vor Minecraft 1\.16/);
});

test('broken chunk data becomes an unreadable chunk, not air', async () => {
  const bytes = new Uint8Array(readFileSync(join(fx.dir, 'r.0.0.mca'))).slice();
  const at = (new DataView(bytes.buffer).getUint32(0) >>> 8) * 4096;
  bytes[at + 20] ^= 0xff; bytes[at + 21] ^= 0xff;
  const files = collectWorldFiles([bytesRegionSource('r.0.0.mca', bytes)]).files;
  const s = await sampleWorld(files, { min: [0, 64, 0], maxExclusive: [16, 65, 16] });
  assert.equal(s.chunks[0].state, 'error');
  assert.equal(s.unknownCells, 256);
});

test('LZ4 block stream: matches, raw blocks, checksum and limits', () => {
  // Hand-made block: literals "abc", match offset 3 length 9 → "abcabcabcabc" + literal "Z".
  const block = new Uint8Array([0x35, 0x61, 0x62, 0x63, 0x03, 0x00, 0x10, 0x5a]);
  const out = new Uint8Array(13);
  lz4DecodeBlock(block, out, 0, 13);
  assert.equal(new TextDecoder().decode(out), 'abcabcabcabcZ');
  const frame = (method, body, original) => {
    const h = new Uint8Array(21); h.set([...'LZ4Block'].map(c => c.charCodeAt(0))); h[8] = method | 6;
    const v = new DataView(h.buffer); v.setUint32(9, body.length, true); v.setUint32(13, original.length, true); v.setUint32(17, xxhash32(original, 0x9747b28c) & 0x0fffffff, true);
    return [...h, ...body];
  };
  const end = [...'LZ4Block'].map(c => c.charCodeAt(0)).concat([0x16, ...new Array(12).fill(0)]);
  const stream = new Uint8Array([...frame(0x20, block, out), ...frame(0x10, new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3])), ...end]);
  assert.deepEqual([...lz4BlockStreamDecompress(stream, 100)], [...out, 1, 2, 3]);
  const wrong = stream.slice(); wrong[17] ^= 1;
  assert.throws(() => lz4BlockStreamDecompress(wrong, 100), /Prüfsumme/);
  assert.throws(() => lz4BlockStreamDecompress(stream, 5), e => e.code === 'LIMIT');
  assert.throws(() => lz4DecodeBlock(new Uint8Array([0x10, 0x61, 0x09, 0x00]), new Uint8Array(10), 0, 10), /Versatz/);
  // XXH32 reference vectors.
  assert.equal(xxhash32(new Uint8Array(0), 0), 0x02cc5d05);
  assert.equal(xxhash32(new TextEncoder().encode('abc'), 0), 0x32d153ff);
  assert.equal(xxhash32(new TextEncoder().encode('Nobody inspects the spammish repetition'), 0), 0xe2293b2f);
});

test('default-state table from the official 26.3 report', () => {
  assert.equal(DEFAULT_STATES_DATA_VERSION, 5023);
  assert.ok(defaultStateCount() > 800);
  assert.deepEqual({ ...defaultProperties('minecraft:chest') }, { facing: 'north', type: 'single', waterlogged: 'false' });
  assert.deepEqual({ ...defaultProperties('minecraft:redstone_wire') }, { east: 'none', north: 'none', power: '0', south: 'none', west: 'none' });
  assert.equal(defaultProperties('minecraft:stone'), undefined);
});

test('NBT reader skips bulky keys without changing the rest', () => {
  const tag = { type: 'compound', value: { keep: { type: 'int', value: 7 }, SkyLight: { type: 'byteArray', value: new Array(2048).fill(1) },
    nested: { type: 'list', elementType: 'compound', value: [{ type: 'compound', value: { SkyLight: { type: 'byteArray', value: [1] }, Y: { type: 'byte', value: 2 } } }] } } };
  const bytes = writeNbt({ name: '', tag });
  const full = readNbt(bytes, { maxNodes: 10_000 });
  const skipped = readNbt(bytes, { maxNodes: 100 }, { skipKeys: new Set(['SkyLight']) });
  assert.equal(full.tag.value.SkyLight.value.length, 2048);
  assert.equal(skipped.tag.value.SkyLight, undefined);
  assert.equal(skipped.tag.value.keep.value, 7);
  assert.equal(skipped.tag.value.nested.value[0].value.Y.value, 2);
  assert.throws(() => readNbt(bytes.subarray(0, bytes.length - 3), {}, { skipKeys: new Set(['SkyLight']) }), FormatError);
});

test('load scenario: 256 × 384 × 256 excerpt of 256 chunks stays within budget', async () => {
  // 16 × 16 synthetic chunks in one region (own writer path: deflate of a 26.x chunk from the fixture).
  const src = new Uint8Array(readFileSync(join(fx.dir, 'r.0.0.mca')));
  const r0 = await RegionReader.open(bytesRegionSource('r.0.0.mca', src));
  const e = r0.entry(0, 0);
  const rec = splitChunkRecord(src.subarray(e.sectorOffset * 4096, (e.sectorOffset + e.sectorCount) * 4096), 'x');
  const { inflateSync } = await import('node:zlib');
  const nbt = readNbt(inflateSync(rec.data), { maxNodes: 2_000_000 });
  const chunks = [];
  for (let cz = 0; cz < 16; cz++) for (let cx = 0; cx < 16; cx++) {
    const v = { ...nbt.tag.value, xPos: { type: 'int', value: cx }, zPos: { type: 'int', value: cz }, block_entities: { type: 'list', elementType: 'end', value: [] } };
    chunks.push(deflateSync(writeNbt({ name: '', tag: { type: 'compound', value: v } }, { maxNodes: 2_000_000 })));
  }
  const sectors = chunks.map(c => Math.ceil((c.length + 5) / 4096));
  const total = 2 + sectors.reduce((a, b) => a + b, 0), file = new Uint8Array(total * 4096), view = new DataView(file.buffer);
  let at = 2;
  chunks.forEach((c, i) => {
    const cx = i % 16, cz = Math.floor(i / 16);
    view.setUint32((cx + cz * 32) * 4, (at << 8) | sectors[i]);
    view.setUint32(at * 4096, c.length + 1); file[at * 4096 + 4] = 2; file.set(c, at * 4096 + 5); at += sectors[i];
  });
  const files = collectWorldFiles([bytesRegionSource('r.0.0.mca', file)]).files;
  const t = performance.now();
  const s = await sampleWorld(files, { min: [0, -64, 0], maxExclusive: [256, 192, 256] });
  const ms = performance.now() - t;
  assert.equal(s.unknownCells, 0);
  assert.equal(s.chunks.length, 256);
  assert.equal(text(sampleAt(s, [16 * 7 + 5, 66, 16 * 3 + 8])), 'minecraft:lime_wool');
  assert.ok(ms < 15_000, `${Math.round(ms)} ms`);
  console.log(`# Lastszenario: 256 Chunks, ${s.data.length.toLocaleString('de-DE')} Zellen in ${Math.round(ms)} ms`);
});
