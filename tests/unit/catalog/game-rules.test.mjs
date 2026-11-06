import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPayload, settleState } from '../../../dist/voxel/src/index.js';
import { BUILDING_SPECS, sealBasins, dryCorals, gameReady } from '../../../dist/domain/src/index.js';
import { classify, jobText } from '../../../scripts/mod/game_placement.mjs';

/**
 * BLOCK-02-S07: rules the real Paper 26.3 server showed (scripts/mod/test_game_placement.sh). Each case
 * is the state the server made of the catalogue building it was found in.
 */
const mc = (id, properties = {}) => ({ id: `minecraft:${id}`, properties });
const world = entries => { const m = new Map(entries.map(([p, s]) => [p.join(','), s])); return p => m.get(p.join(',')); };
const payloadOf = (size, blocks) => {
  const palette = [mc('air')], cells = [];
  for (const [pos, state] of blocks) {
    let i = palette.findIndex(p => JSON.stringify(p) === JSON.stringify(state));
    if (i < 0) { i = palette.length; palette.push(state); }
    cells.push({ position: pos, kind: 'block', paletteIndex: i });
  }
  return createPayload({ schemaVersion: 1, profileId: 'test', bounds: { min: [0, 0, 0], maxExclusive: size }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette, cells, blockEntities: [] });
};
const at = (payload, pos) => { const c = payload.cells.find(c => c.position.join() === pos.join()); return c && payload.palette[c.paletteIndex]; };

test('double chests: a half whose partner side is no chest becomes single, a single chest joins a half pointing at it (Lagerhaus)', () => {
  const chest = type => mc('chest', { facing: 'north', type, waterlogged: 'false' });
  // facing north: left pairs to the east, right to the west
  assert.equal(settleState(chest('right'), [2, 0, 0], world([[[1, 0, 0], mc('andesite')], [[3, 0, 0], chest('left')]])).properties.type, 'single');
  assert.equal(settleState(chest('left'), [2, 0, 0], world([[[3, 0, 0], chest('right')]])).properties.type, 'left');
  assert.equal(settleState(chest('single'), [2, 0, 0], world([[[3, 0, 0], chest('right')]])).properties.type, 'left');
  assert.equal(settleState(chest('single'), [2, 0, 0], world([[[3, 0, 0], chest('left')]])).properties.type, 'single');
  const lager = BUILDING_SPECS.find(s => s.id === 'bld_lagerhaus').payload();
  const types = [2, 3, 4, 5, 6, 7, 8, 9].map(x => at(lager, [x, 1, 8]).properties.type);
  assert.deepEqual(types, ['left', 'right', 'left', 'right', 'left', 'right', 'left', 'right'], 'vier Doppeltruhen');
});

test('dirt path and farmland turn into dirt under a solid block, not under a fence gate or a flower (Obstgarten, Schießstand)', () => {
  const below = top => settleState(mc('dirt_path'), [0, 0, 0], world([[[0, 1, 0], top]]));
  assert.equal(below(mc('cherry_log', { axis: 'y' })).id, 'minecraft:dirt');
  assert.equal(below(mc('hay_block', { axis: 'y' })).id, 'minecraft:dirt');
  assert.equal(below(mc('oak_fence', { north: 'false', east: 'false', south: 'false', west: 'false', waterlogged: 'false' })).id, 'minecraft:dirt');
  assert.equal(below(mc('oak_fence_gate', { facing: 'north', in_wall: 'false', open: 'false', powered: 'false' })).id, 'minecraft:dirt_path');
  assert.equal(below(mc('poppy')).id, 'minecraft:dirt_path');
  assert.equal(below(undefined).id, 'minecraft:dirt_path');
  assert.equal(settleState(mc('farmland', { moisture: '7' }), [0, 0, 0], world([[[0, 1, 0], mc('stone')]])).id, 'minecraft:dirt');
});

test('redstone dust connects like the game: corners of a repeater clock, a lone dust is a cross, a dot stays a dot (Taktgeber)', () => {
  const dust = (n, e, s, w) => mc('redstone_wire', { north: n, east: e, south: s, west: w, power: '0' });
  const cross = dust('side', 'side', 'side', 'side');
  const rep = f => mc('repeater', { delay: '4', facing: f, locked: 'false', powered: 'false' });
  const floor = [...[0, 1, 2].flatMap(x => [0, 1, 2].map(z => [[x, -1, z], mc('smooth_stone')]))];
  // north-west corner: repeater east (facing west) and south (facing south)
  const corner = settleState(cross, [1, 0, 1], world([...floor, [[2, 0, 1], rep('west')], [[1, 0, 2], rep('south')]]));
  assert.deepEqual([corner.properties.north, corner.properties.east, corner.properties.south, corner.properties.west], ['none', 'side', 'side', 'none']);
  // a repeater across the dust's side does not connect
  const across = settleState(cross, [1, 0, 1], world([...floor, [[2, 0, 1], rep('north')]]));
  assert.deepEqual([across.properties.north, across.properties.east, across.properties.south, across.properties.west], ['side', 'side', 'side', 'side'], 'nichts verbunden = Kreuz');
  const dot = dust('none', 'none', 'none', 'none');
  assert.deepEqual(settleState(dot, [1, 0, 1], world(floor)).properties, dot.properties, 'Punkt bleibt Punkt');
  // one connection continues straight through
  const line = settleState(cross, [1, 0, 1], world([...floor, [[1, 0, 0], dust('side', 'none', 'side', 'none')]]));
  assert.deepEqual([line.properties.north, line.properties.east, line.properties.south, line.properties.west], ['side', 'none', 'side', 'none']);
  // climbing: dust on the block beside and above
  const climb = settleState(cross, [1, 0, 1], world([...floor, [[2, 0, 1], mc('stone')], [[2, 1, 1], dust('side', 'side', 'side', 'side')]]));
  assert.equal(climb.properties.east, 'up');
});

test('tight basins: a wall or slab between two water sources is sealed, other waterloggable blocks are drawn waterlogged (Brunnen)', () => {
  const water = mc('water', { level: '0' }), wall = mc('stone_brick_wall', { east: 'none', north: 'none', south: 'none', up: 'true', waterlogged: 'false', west: 'none' });
  const floor = [0, 1, 2].flatMap(x => [0, 1, 2].map(z => [[x, 0, z], mc('stone_bricks')]));
  const sealed = sealBasins(payloadOf([3, 2, 3], [...floor, [[1, 1, 1], wall], [[2, 1, 1], water], [[1, 1, 2], water]]));
  assert.equal(at(sealed, [1, 1, 1]).id, 'minecraft:stone_bricks');
  const slab = sealBasins(payloadOf([3, 2, 3], [...floor, [[1, 1, 1], mc('stone_brick_slab', { type: 'bottom', waterlogged: 'false' })], [[2, 1, 1], water], [[0, 1, 1], water]]));
  assert.equal(at(slab, [1, 1, 1]).properties.type, 'double');
  const ladder = sealBasins(payloadOf([3, 2, 3], [...floor, [[1, 1, 1], mc('ladder', { facing: 'north', waterlogged: 'false' })], [[2, 1, 1], water], [[0, 1, 1], water]]));
  assert.equal(at(ladder, [1, 1, 1]).properties.waterlogged, 'true');
  const one = payloadOf([3, 2, 3], [...floor, [[1, 1, 1], wall], [[2, 1, 1], water]]);
  assert.equal(sealBasins(one), one, 'eine Quelle allein füllt nichts');
});

test('corals without water die: inner reef blocks and dry coral fans are drawn dead (Korallenriff)', () => {
  const reef = dryCorals(payloadOf([3, 3, 3], [
    [[1, 1, 1], mc('brain_coral_block')], [[0, 1, 1], mc('brain_coral_block')], [[2, 1, 1], mc('brain_coral_block')], [[1, 1, 0], mc('brain_coral_block')],
    [[1, 1, 2], mc('brain_coral_block')], [[1, 2, 1], mc('brain_coral_block')], [[1, 0, 1], mc('sand')], [[0, 2, 1], mc('water', { level: '0' })],
    [[2, 2, 2], mc('tube_coral_fan', { waterlogged: 'false' })],
  ]));
  assert.equal(at(reef, [1, 1, 1]).id, 'minecraft:dead_brain_coral_block');
  assert.equal(at(reef, [1, 2, 1]).id, 'minecraft:brain_coral_block', 'Wasser daneben: lebt');
  assert.equal(at(reef, [2, 2, 2]).id, 'minecraft:dead_tube_coral_fan');
  assert.equal(gameReady(gameReady(reef)), gameReady(reef));
});

test('probe job and classification: edge water marks a shore, signals and leaf distance are harmless, breaks and spills are not', () => {
  const pond = payloadOf([2, 1, 1], [[[0, 0, 0], mc('water', { level: '0' })], [[1, 0, 0], mc('stone')]]);
  const [head, ...lines] = jobText('Teich', pond).trim().split('\n');
  assert.equal(head, 'Teich\t2 1 1\t0');
  assert.deepEqual(lines, ['0 0 0 minecraft:water[level=0]', '1 0 0 minecraft:stone']);
  assert.equal(jobText('Stein', payloadOf([1, 1, 1], [[[0, 0, 0], mc('stone')]])).split('\n')[0], 'Stein\t1 1 1');
  assert.equal(classify({ want: 'minecraft:lantern[hanging=false,waterlogged=false]', got: 'minecraft:air' }).kind, 'breaks');
  assert.equal(classify({ want: 'minecraft:daylight_detector[inverted=false,power=0]', got: 'minecraft:daylight_detector[inverted=false,power=12]' }).kind, 'harmless');
  assert.equal(classify({ want: 'minecraft:oak_leaves[distance=1,persistent=false,waterlogged=false]', got: 'minecraft:oak_leaves[distance=3,persistent=false,waterlogged=false]' }).kind, 'harmless');
  assert.equal(classify({ want: 'minecraft:oak_leaves[distance=1,persistent=false,waterlogged=false]', got: 'minecraft:oak_leaves[distance=7,persistent=false,waterlogged=false]' }).kind, 'decays');
  assert.equal(classify({ want: 'minecraft:oak_fence[east=false,north=false,south=false,waterlogged=false,west=false]', got: 'minecraft:oak_fence[east=true,north=false,south=false,waterlogged=false,west=false]' }).kind, 'connects');
  assert.equal(classify({ want: null, got: 'minecraft:water[level=1]' }).kind, 'flows');
  assert.equal(classify({ want: 'minecraft:water[level=0]', got: 'minecraft:bubble_column[drag=true]' }).kind, 'harmless');
});
