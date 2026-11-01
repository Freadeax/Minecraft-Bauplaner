import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkTerrain, terrainBox, NATURAL_TERRAIN_IDS } from '../dist/domain/src/index.js';
import { createPayload, UNLOADED_STATE } from '../dist/voxel/src/index.js';

const S = id => ({ id: `minecraft:${id}`, properties: {} });
/**
 * Hand-made 6 × 6 × 6 grid at world 100/60/200 … 105/65/205:
 *   y 60–62 stone, y 63 grass_block except column x=104 (air down to y 61: a 2-deep hole),
 *   water at x=105 y 63, an oak log at 101/64/201 (in the way), unknown column x=100 z=205.
 */
function grid() {
  const palette = [{ id: UNLOADED_STATE, properties: {} }, S('air'), S('stone'), S('grass_block'), S('water'), S('oak_log'), S('short_grass')];
  const W = 6, H = 6, L = 6, data = new Uint32Array(W * H * L).fill(1);
  const set = (x, y, z, v) => { data[(x - 100) + (z - 200) * W + (y - 60) * W * L] = v; };
  for (let x = 100; x < 106; x++) for (let z = 200; z < 206; z++) {
    for (let y = 60; y < 63; y++) set(x, y, z, 2);
    set(x, 63, z, 3);
  }
  for (let z = 200; z < 206; z++) { set(104, 63, z, 1); set(104, 62, z, 1); set(105, 63, z, 4); }
  set(101, 64, 201, 5);
  set(102, 64, 202, 6);
  for (let y = 60; y < 66; y++) set(100, y, 205, 0);
  return { box: { min: [100, 60, 200], maxExclusive: [106, 66, 206] }, size: [W, H, L], palette, data };
}
/** Plan in project coordinates: a 6 × 1 × 6 floor at y 0 plus one wall block at 1/1/1 and explicit air at 3/1/3. */
function plan() {
  const cells = [];
  for (let x = 0; x < 6; x++) for (let z = 0; z < 6; z++) cells.push({ position: [x, 0, z], kind: 'block', paletteIndex: 0 });
  cells.push({ position: [1, 1, 1], kind: 'block', paletteIndex: 1 });
  cells.push({ position: [2, 1, 2], kind: 'block', paletteIndex: 1 });
  cells.push({ position: [3, 1, 3], kind: 'air', paletteIndex: 2 });
  return createPayload({ schemaVersion: 1, profileId: 'test', bounds: { min: [0, 0, 0], maxExclusive: [6, 2, 6] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0],
    palette: [S('oak_planks'), S('cobblestone'), S('air')], cells, blockEntities: [] });
}
const placement = y => ({ schemaVersion: 1, origin: [100, y, 200], dimension: 'minecraft:overworld', hidden: false, note: '' });

test('terrain box reaches below the plan by the search depth', () => {
  assert.deepEqual(terrainBox({ min: [0, 0, 0], maxExclusive: [6, 2, 6] }, [100, 64, 200], 4), { min: [100, 60, 200], maxExclusive: [106, 66, 206] });
});

test('floor on the grass layer: obstacles, fluid, unknown and the hole', () => {
  const c = checkTerrain(plan(), placement(63), grid(), { depth: 3 });
  // y 63 floor replaces grass (obstacle) except the hole column (free), the water column (fluid), the unknown column.
  assert.equal(c.cells.unknown, 1, 'nur die Bodenzelle über der unbekannten Spalte');
  assert.equal(c.cells.fluid, 6);
  assert.ok(c.cells.obstacle >= 24);
  assert.equal(c.foundation.columns, 36);
  assert.equal(c.foundation.baseY, 0);
  // Floor at y 63 stands on stone (y 62) everywhere except the hole x=104 (air at 62, ground at 61) and water column (stone below).
  assert.equal(c.foundation.hanging, 6);
  assert.equal(c.foundation.fillBlocks, 6);
  assert.equal(c.foundation.maxGap, 1);
  assert.equal(c.foundation.unknown, 1);
  assert.equal(c.complete, false);
  assert.equal(c.removal[0].id, 'minecraft:grass_block');
});

test('floor one block higher: log in the way, grass replaceable, plants free', () => {
  const c = checkTerrain(plan(), placement(64), grid(), { depth: 4 });
  assert.equal(c.verdictAt.get('1,0,1'), 'obstacle', 'Baumstamm steht im Weg');
  assert.equal(c.verdictAt.get('2,0,2'), 'free', 'Gras wird beim Setzen ersetzt');
  assert.equal(c.verdictAt.get('3,0,3'), 'free');
  assert.equal(c.verdictAt.get('3,1,3'), 'free', 'geplante Luft über Luft');
  assert.equal(c.foundation.carried, 36 - 6 - 6 - 1);
  // Hole column: air at 63 and 62 → 2 blocks; water column: fluid below.
  assert.equal(c.foundation.hanging, 6);
  assert.equal(c.foundation.fillBlocks, 12);
  assert.equal(c.foundation.fluid, 6);
  assert.deepEqual(c.ground, { min: 61, max: 63, median: 63 });
  assert.equal(c.suggestedOriginY, 64);
  assert.equal(c.removal.find(r => r.id === 'minecraft:oak_log').count, 1);
});

test('explicit air inside terrain has to be cleared; present blocks need nothing', () => {
  const g = grid();
  const c = checkTerrain(plan(), placement(62), g, { depth: 2 });
  assert.equal(c.verdictAt.get('3,1,3'), 'clear', 'geplante Luft im Grasblock');
  const same = createPayload({ ...plan(), palette: [S('stone'), S('cobblestone'), S('air')] });
  const d = checkTerrain(same, placement(62), g, { depth: 2 });
  assert.equal(d.verdictAt.get('0,0,0'), 'present');
});

test('gaps deeper than the grid are marked as lower bounds', () => {
  const c = checkTerrain(plan(), placement(70), grid(), { depth: 4 });
  // The grid ends at y 65, the plan sits at 70: outside → unknown, never free.
  assert.equal(c.cells.unknown, 39, 'alle geplanten Zellen außerhalb des Rasters');
  assert.match(c.notes.join(' '), /außerhalb des gelesenen Bereichs/);
  assert.equal(c.foundation.unknown, 36);
  assert.equal(c.complete, false);
  const deep = checkTerrain(plan(), placement(65), { ...grid() }, { depth: 1 });
  assert.equal(deep.foundation.hanging > 0, true);
  assert.equal(deep.foundation.gapCapped, false);
});

test('natural terrain list covers ground, not building blocks', () => {
  for (const id of ['grass_block', 'dirt', 'stone', 'water', 'deepslate', 'sand']) assert.ok(NATURAL_TERRAIN_IDS.has(`minecraft:${id}`), id);
  for (const id of ['oak_planks', 'cobblestone', 'stone_bricks', 'glass']) assert.ok(!NATURAL_TERRAIN_IDS.has(`minecraft:${id}`), id);
});
