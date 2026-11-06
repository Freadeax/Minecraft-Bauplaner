import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readLiveTerrain, areaChunks, chunkBatches, readLiveKnown, knownQuery, terrainCoverage, surveyFromLiveTerrain, boxQuery, readLiveBox, styleForBiome, biomeLabel, paintByBiome,
  encodeSurvey, decodeSurvey, columnAt, biomeAt, biomeShares, surveyFile, checkTerrainReference, designFromSurvey, SURVEY_UNKNOWN, LIVE_BOX_MAX_CELLS, liveCan, LIVE_FEATURE_TERRAIN,
  LIVE_FEATURE_LABELS, checkTerrain,
} from '../../../dist/domain/src/index.js';

/** Chunk like the mod's TerrainMemory answer: grass at 64, a water column at index 1, river biome on column 2. */
const chunk = (x, z, extra = {}) => ({
  x, z, at: 1_700_000_000_000, live: false,
  columns: Array.from({ length: 256 }, (_, i) => i === 1 ? [62, 1, 58, 2] : i === 0 ? [70, 3, 64, 0] : [64, 0, 63, 4]),
  biome: Array.from({ length: 256 }, (_, i) => i === 2 ? 1 : 0), ...extra,
});
const answer = (chunks, extra = {}) => ({ dimension: 'minecraft:overworld', ids: ['minecraft:grass_block', 'minecraft:water', 'minecraft:sand', 'minecraft:oak_leaves', 'minecraft:dirt'], biomes: ['minecraft:plains', 'minecraft:river'], chunks, missing: [[9, 9]], ...extra });

test('readLiveTerrain classifies runs like the region survey and keeps biomes, time and live flag', () => {
  const t = readLiveTerrain(answer([chunk(0, 0, { live: true })]));
  assert.equal(t.dimension, 'minecraft:overworld');
  const c = t.chunks[0];
  assert.equal(c.live, true);
  assert.equal(c.at, 1_700_000_000_000);
  // Leaves are surface, not ground; water column: surface water, ground sand.
  assert.deepEqual(c.columns[0], { surface: 70, surfaceId: 'minecraft:oak_leaves', ground: 64, groundId: 'minecraft:grass_block' });
  assert.deepEqual(c.columns[1], { surface: 62, surfaceId: 'minecraft:water', ground: 58, groundId: 'minecraft:sand' });
  assert.equal(c.biomes[2], 'minecraft:river');
  assert.deepEqual(t.missing, [[9, 9]]);
  // Strict: bad biome index, missing biome list, wrong count.
  assert.throws(() => readLiveTerrain(answer([chunk(0, 0, { biome: Array(256).fill(5) })])), /Biomindex/);
  assert.throws(() => readLiveTerrain({ ...answer([chunk(0, 0)]), biomes: undefined }), /Biomliste/);
  assert.throws(() => readLiveTerrain(answer([chunk(0, 0, { biome: [0] })])), /256 Biome/);
  // Older mods: /v1/chunks without at/live/biome.
  const legacy = readLiveTerrain({ dimension: 'minecraft:overworld', ids: ['minecraft:grass_block'], chunks: [{ x: 1, z: 1, columns: Array(256).fill([64, 0]) }], missing: [] }, true, 42);
  assert.equal(legacy.chunks[0].biomes, null);
  assert.equal(legacy.chunks[0].at, 42);
});

test('area chunks, batches of 64 and the known query', () => {
  const area = { minX: -20, minZ: 5, width: 200, length: 100 };
  assert.deepEqual(areaChunks(area), { x0: -2, z0: 0, x1: 11, z1: 6, count: 14 * 7 });
  const batches = chunkBatches(area);
  assert.deepEqual(batches.map(b => b.length), [64, 34]);
  assert.deepEqual(batches[0][0], [-2, 0]);
  assert.equal(chunkBatches(area, (x) => x < 0).flat().length, 12 * 7);
  assert.equal(knownQuery(area), '-2,0,11,6');
  assert.equal(knownQuery({ minX: 0, minZ: 0, width: 512, length: 512 }), '0,0,31,31');
  const k = readLiveKnown({ dimension: 'minecraft:overworld', total: 3, chunks: [[0, 0, 5], [1, 0, 9]] });
  assert.equal(k.chunks.length, 2);
  assert.throws(() => readLiveKnown({ dimension: 'minecraft:overworld', total: 1, chunks: [[0, 0]] }), /Chunk ungültig/);
});

test('coverage says how much is known and where the rest is', () => {
  const area = { minX: 0, minZ: 0, width: 64, length: 64 }; // 4 × 4 chunks
  const south = [];
  for (let x = 0; x < 4; x++) for (let z = 0; z < 2; z++) south.push([x, z, 1000 + x]);
  const c = terrainCoverage(area, south);
  assert.equal(c.chunks, 16); assert.equal(c.known, 8); assert.equal(c.share, 0.5);
  assert.equal(c.oldest, 1000); assert.equal(c.newest, 1003);
  assert.equal(c.missingSide, 'im Süden');
  const all = [];
  for (let x = 0; x < 4; x++) for (let z = 0; z < 4; z++) all.push([x, z, 1]);
  assert.equal(terrainCoverage(area, all).missingSide, '');
  assert.equal(terrainCoverage(area, all.filter(([x, z]) => !(x === 3 && z === 0))).missingSide, 'im Nordosten');
  assert.equal(terrainCoverage(area, []).missingSide, 'rundherum');
});

test('survey from the game: unknown where not delivered, biomes survive the file, reference says mod', async () => {
  const t = readLiveTerrain(answer([chunk(0, 0), chunk(1, 0)]));
  const area = { minX: 8, minZ: 0, width: 40, length: 10 }; // chunks 0..2 in X, chunk 2 missing
  const s = surveyFromLiveTerrain(area, 'minecraft:overworld', t.chunks, '2026-11-06T12:00:00.000Z');
  assert.equal(s.source, 'mod');
  assert.deepEqual(columnAt(s, 16, 0), { surface: 70, ground: 64, surfaceId: 'minecraft:oak_leaves', groundId: 'minecraft:grass_block', fluid: false });
  assert.equal(columnAt(s, 17, 0).fluid, true);
  assert.equal(columnAt(s, 40, 0), null);
  assert.equal(s.surface[40 - 8], SURVEY_UNKNOWN);
  assert.equal(biomeAt(s, 18, 0), 'minecraft:river');
  assert.equal(biomeAt(s, 20, 3), 'minecraft:plains');
  assert.equal(s.newestChunkSave, 1_700_000_000);
  const back = decodeSurvey(encodeSurvey(s));
  assert.deepEqual([...back.biomes.data], [...s.biomes.data]);
  assert.deepEqual(back.biomes.ids, s.biomes.ids);
  assert.equal(back.source, 'mod');
  assert.deepEqual(biomeShares(back), [{ id: 'minecraft:plains', columns: 239 }, { id: 'minecraft:river', columns: 1 }]);
  const { reference } = await surveyFile(s, 'Haus');
  assert.equal(reference.source, 'mod');
  assert.equal(checkTerrainReference(reference), reference);
  assert.throws(() => checkTerrainReference({ ...reference, source: 'cloud' }), /Quelle/);
  // Region-file surveys keep the old file exactly (no new header keys).
  const plain = decodeSurvey(encodeSurvey({ ...s, source: undefined, biomes: undefined }));
  assert.equal(plain.source, undefined); assert.equal(plain.biomes, undefined);
  // Old mods without biomes: no biome layer at all.
  const legacy = readLiveTerrain({ dimension: 'minecraft:overworld', ids: ['minecraft:grass_block'], chunks: [{ x: 0, z: 0, columns: Array(256).fill([64, 0]) }], missing: [] }, true);
  assert.equal(surveyFromLiveTerrain({ minX: 0, minZ: 0, width: 16, length: 16 }, 'minecraft:overworld', legacy.chunks).biomes, undefined);
});

test('box reader and query: limits, palette indexes, unloaded cells for checkTerrain', () => {
  assert.equal(boxQuery([0, 60, 0], [10, 70, 10]), '0,60,0,10,70,10');
  assert.throws(() => boxQuery([0, 0, 0], [200, 100, 200]), /zu groß/);
  assert.equal(LIVE_BOX_MAX_CELLS, 2_000_000);
  const data = Buffer.alloc(2 * 2 * 2 * 2);
  data.writeUInt16LE(1, 0); data.writeUInt16LE(2, 2);
  const box = readLiveBox({ dimension: 'minecraft:overworld', box: [0, 63, 0, 2, 65, 2], palette: ['minecraft:air', 'minecraft:grass_block[snowy=false]', 'bauplaner:unloaded'], data: data.toString('base64'), unloaded: 1 });
  assert.deepEqual([...box.data], [1, 2, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(box.maxExclusive, [2, 65, 2]);
  assert.throws(() => readLiveBox({ dimension: 'minecraft:overworld', box: [0, 63, 0, 2, 65, 2], palette: ['minecraft:air'], data: data.toString('base64'), unloaded: 0 }), /Palette/);
  assert.throws(() => readLiveBox({ dimension: 'minecraft:overworld', box: [0, 63, 0, 2, 65, 2], palette: ['minecraft:air'], data: 'AAA', unloaded: 0 }), /passen nicht|ungültig/);
  assert.throws(() => readLiveBox({ dimension: 'minecraft:overworld', box: [0, 63, 0, 2, 65, 2], palette: ['Stein!'], data: data.toString('base64'), unloaded: 0 }), /Blockzustand/);

  // The grid from the game feeds the same check as a region sample: one block at Y 65 on grass at 64 is carried.
  const grid = { box: { min: [0, 63, 0], maxExclusive: [2, 66, 2] }, size: [2, 3, 2],
    palette: [{ id: 'minecraft:air', properties: {} }, { id: 'minecraft:grass_block', properties: { snowy: 'false' } }, { id: 'bauplaner:unloaded', properties: {} }],
    data: Uint32Array.from([1, 1, 1, 2, 1, 1, 1, 2, 0, 0, 0, 0]) };
  const planned = { bounds: { min: [0, 0, 0], maxExclusive: [1, 1, 1] }, palette: [{ id: 'minecraft:stone', properties: {} }], cells: [{ position: [0, 0, 0], kind: 'block', paletteIndex: 0 }], blockEntities: [] };
  const check = checkTerrain(planned, { dimension: 'minecraft:overworld', origin: [0, 65, 0] }, grid, { depth: 2 });
  assert.equal(check.foundation.carried, 1);
});

test('biomes map onto landscape styles and paint a design', () => {
  assert.equal(styleForBiome('minecraft:desert'), 'wueste');
  assert.equal(styleForBiome('minecraft:dark_forest'), 'wald');
  assert.equal(styleForBiome('minecraft:snowy_plains'), 'schnee');
  assert.equal(styleForBiome('minecraft:beach'), 'strand');
  assert.equal(styleForBiome('minecraft:stony_shore'), 'fels');
  assert.equal(styleForBiome('minecraft:river'), null);
  assert.equal(styleForBiome('minecraft:mangrove_swamp'), 'sumpf');
  assert.equal(styleForBiome('minecraft:plains'), 'wiese');
  assert.equal(biomeLabel('minecraft:dark_forest'), 'Dunkelwald');
  assert.equal(biomeLabel('mymod:crystal_fields'), 'mymod:crystal fields');

  const forest = chunk(0, 0, { biome: Array(256).fill(1) });
  const t = readLiveTerrain(answer([forest], { biomes: ['minecraft:plains', 'minecraft:forest'] }));
  const s = surveyFromLiveTerrain({ minX: 0, minZ: 0, width: 16, length: 16 }, 'minecraft:overworld', t.chunks);
  const d = designFromSurvey(s, { kind: 'survey', sha256: 'a'.repeat(64) });
  const changed = paintByBiome(d, s);
  assert.ok(changed > 100, `${changed}`);
  const top = d.ids[d.top[5]];
  assert.ok(['minecraft:podzol', 'minecraft:grass_block', 'minecraft:coarse_dirt'].includes(top), top);
  assert.equal(paintByBiome(d, { ...s, biomes: undefined }), 0);
});

test('hello features name the terrain abilities', () => {
  assert.ok(liveCan({ features: ['terrain', 'box'] }, LIVE_FEATURE_TERRAIN));
  assert.ok(LIVE_FEATURE_LABELS.some(f => f.id === 'box'));
});
