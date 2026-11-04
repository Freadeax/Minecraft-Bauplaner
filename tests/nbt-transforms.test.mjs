import test from 'node:test';
import assert from 'node:assert/strict';
import { createPayload, transformPayload, nbtFamily, profileNbtFamilies, blockEntityTypeOf, factBlockIds, transformBlockEntity, turnStructureBlock, commandCoordinates } from '../dist/voxel/src/index.js';

const s = value => ({ type: 'string', value }), i = value => ({ type: 'int', value }), c = value => ({ type: 'compound', value });
const L = (value, elementType = 'compound') => ({ type: 'list', elementType, value });
const mc = (id, properties = {}) => ({ id: `minecraft:${id}`, properties });
const T = (quarterTurns, mirrorX = false, position = [0, 0, 0]) => ({ position, quarterTurns, mirrorX });

/** One block with one block entity at [1,0,0] (pivot origin). */
function single(state, data) {
  return createPayload({ schemaVersion: 1, profileId: 'test:nbt', bounds: { min: [0, 0, 0], maxExclusive: [2, 1, 1] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0],
    palette: [state], cells: [{ position: [1, 0, 0], kind: 'block', paletteIndex: 0 }], blockEntities: [{ position: [1, 0, 0], data }] });
}
const all = [T(1), T(2), T(3), T(0, true), T(1, true), T(0, false, [5, 2, -3])];

test('NBT-01: every block entity type of the profile has a family; every block with one maps to it', () => {
  const fams = profileNbtFamilies();
  assert.equal(fams.length, 49);
  assert.deepEqual(fams.filter(f => f.family === 'unknown'), []);
  // Block → type for the blocks the block facts mark as entity blocks.
  for (const id of ['chest', 'copper_chest', 'oak_wall_sign', 'oak_hanging_sign', 'white_wall_banner', 'red_shulker_box', 'shulker_box', 'zombie_wall_head', 'oak_shelf',
    'chain_command_block', 'suspicious_sand', 'soul_campfire', 'bee_nest', 'spawner', 'moving_piston', 'waxed_copper_golem_statue', 'lectern', 'vault'])
    assert.ok(profileNbtFamilies().some(f => f.type === blockEntityTypeOf(`minecraft:${id}`)), id);
  assert.equal(blockEntityTypeOf('minecraft:stone'), null);
  assert.equal(blockEntityTypeOf('create:shaft'), null);
  assert.equal(nbtFamily('create:kinetic'), 'unknown');
  for (const id of factBlockIds()) { const t = blockEntityTypeOf(id); if (t) assert.notEqual(nbtFamily(t), 'unknown', id); }
});

test('NBT-01: relative content survives four quarter turns and double mirroring unchanged', () => {
  const chest = c({ id: s('minecraft:chest'), Items: L([c({ Slot: { type: 'byte', value: 0 }, id: s('minecraft:torch'), count: i(5) })]), CustomName: s('"Lager"'), Lock: c({}) });
  const p = single(mc('chest', { facing: 'north', type: 'left', waterlogged: 'false' }), chest);
  let cur = p;
  for (let k = 0; k < 4; k++) { const r = transformPayload(cur, T(1)); assert.equal(r.semanticsResolved, true); cur = r.payload; }
  assert.deepEqual(cur.blockEntities[0], p.blockEntities[0]);
  assert.deepEqual(cur.palette[0], p.palette[0]);
  const m = transformPayload(transformPayload(p, T(0, true)).payload, T(0, true));
  assert.deepEqual(m.payload.blockEntities[0], p.blockEntities[0]);
  // Concrete direction: one quarter turn moves the cell [1,0,0] to [-1,0,1] and turns its facing.
  const one = transformPayload(p, T(1)).payload;
  assert.deepEqual(one.blockEntities[0].position, [-1, 0, 1]);
  assert.equal(one.palette[0].properties.facing, 'east');
  assert.deepEqual(one.blockEntities[0].data, chest, 'content and unknown rest data (Lock) kept');
});

test('NBT-01: sherds, books, signs and banners keep their NBT like a Minecraft structure', () => {
  const cases = [
    [mc('decorated_pot', { facing: 'north', cracked: 'false', waterlogged: 'false' }), c({ id: s('minecraft:decorated_pot'), sherds: L([s('minecraft:brick'), s('minecraft:angler_pottery_sherd'), s('minecraft:brick'), s('minecraft:brick')], 'string') })],
    [mc('chiseled_bookshelf', {}), c({ id: s('minecraft:chiseled_bookshelf'), last_interacted_slot: i(2) })],
    [mc('oak_sign', { rotation: '4', waterlogged: 'false' }), c({ id: s('minecraft:sign'), front_text: c({ messages: L([s('"Nord"'), s('""'), s('""'), s('""')], 'string') }), is_waxed: { type: 'byte', value: 1 } })],
    [mc('white_banner', { rotation: '0' }), c({ id: s('minecraft:banner'), patterns: L([c({ pattern: s('minecraft:stripe_left'), color: s('red') })]) })],
  ];
  for (const [state, data] of cases) for (const t of all) {
    const r = transformPayload(single(state, data), t);
    assert.deepEqual(r.issues.filter(x => x.code === 'UNRESOLVED_BLOCK_ENTITY'), [], `${state.id} ${JSON.stringify(t)}`);
    assert.deepEqual(r.payload.blockEntities[0].data, data);
  }
});

test('NBT-01: world positions, commands and own boxes block the approval without losing data', () => {
  const hive = c({ id: s('minecraft:beehive'), bees: L([c({ entity_data: c({ id: s('minecraft:bee') }), flower_pos: { type: 'intArray', value: [10, 64, 3] } })]) });
  const r = transformPayload(single(mc('beehive', { facing: 'north', honey_level: '0' }), hive), T(0, false, [3, 0, 0]));
  assert.equal(r.semanticsResolved, false);
  assert.match(r.issues[0].message, /flower_pos/);
  assert.deepEqual(r.payload.blockEntities[0].data, hive, 'nothing dropped');
  // A hive without flower memory is relative.
  assert.equal(transformPayload(single(mc('beehive', { facing: 'north', honey_level: '0' }), c({ id: s('minecraft:beehive'), bees: L([]) })), T(1)).semanticsResolved, true);

  const gate = c({ id: s('minecraft:end_gateway'), exit_portal: { type: 'intArray', value: [0, 70, 0] } });
  assert.equal(transformPayload(single(mc('end_gateway'), gate), T(0, false, [1, 0, 0])).semanticsResolved, false);

  const cmd = command => c({ id: s('minecraft:command_block'), Command: s(command) });
  const cb = mc('command_block', { conditional: 'false', facing: 'north' });
  assert.equal(transformPayload(single(cb, cmd('say hallo')), T(1)).semanticsResolved, true);
  assert.equal(transformPayload(single(cb, cmd('setblock ~1 ~ ~ stone')), T(0, false, [4, 0, 0])).semanticsResolved, true, 'relative coordinates survive moving');
  assert.equal(transformPayload(single(cb, cmd('setblock ~1 ~ ~ stone')), T(1)).semanticsResolved, false, '… but not turning');
  assert.equal(transformPayload(single(cb, cmd('tp @p 100 64 -20')), T(0, false, [4, 0, 0])).semanticsResolved, false, 'absolute coordinates break on any move');
  assert.deepEqual(commandCoordinates('fill ^ ^1 ^ ^2 ^3 ^4 air'), { relative: true, absolute: false });

  const structure = c({ id: s('minecraft:structure_block'), mode: s('SAVE'), posX: i(1), posY: i(0), posZ: i(0), sizeX: i(5), sizeY: i(4), sizeZ: i(3), rotation: s('NONE'), mirror: s('NONE') });
  const sb = mc('structure_block', { mode: 'save' });
  assert.equal(transformPayload(single(sb, structure), T(0, false, [9, 0, 9])).semanticsResolved, true, 'offset is relative to the block');
  // NBT-01-S03: turning is resolved by the structure block adapter, mirroring stays unresolved.
  const turned = transformPayload(single(sb, structure), T(1));
  assert.equal(turned.semanticsResolved, true);
  const tile = turned.payload.blockEntities[0].data.value;
  // Region x 1..5, z 0..2 turned clockwise ((x,z) → (−z,x)): x −2..0, z 1..5.
  assert.deepEqual(['posX', 'posY', 'posZ', 'sizeX', 'sizeY', 'sizeZ'].map(k => tile[k].value), [-2, 0, 1, 3, 4, 5]);
  assert.equal(transformPayload(single(sb, structure), T(1, true)).semanticsResolved, false);

  const mod = c({ id: s('create:mechanical_press'), Speed: i(16) });
  const rm = transformPayload(single({ id: 'create:mechanical_press', properties: { facing: 'north' } }, mod), T(1));
  assert.equal(rm.semanticsResolved, false);
  assert.deepEqual(rm.payload.blockEntities[0].data, mod);
});

test('NBT-01: Sponge entries move their Pos, flat entries their x/y/z; entries without id use the block', () => {
  const sponge = c({ Id: s('minecraft:barrel'), Pos: { type: 'intArray', value: [1, 0, 0] }, Data: c({ Items: L([]) }) });
  const r = transformBlockEntity({ position: [1, 0, 0], data: sponge }, [0, 0, 1], T(1));
  assert.equal(r.resolved, true);
  assert.deepEqual(r.entity.data.value.Pos.value, [0, 0, 1]);
  const flat = c({ x: i(101), y: i(64), z: i(7), Items: L([]) });
  const f = transformBlockEntity({ position: [1, 0, 0], data: flat }, [3, 0, 0], T(0, false, [2, 0, 0]), 'minecraft:chest');
  assert.equal(f.type, 'minecraft:chest');
  assert.equal(f.resolved, true);
  assert.deepEqual([f.entity.data.value.x.value, f.entity.data.value.y.value, f.entity.data.value.z.value], [103, 64, 7], 'offset to the world kept');
  const none = transformBlockEntity({ position: [1, 0, 0], data: c({ Items: L([]) }) }, [0, 0, 1], T(1));
  assert.equal(none.resolved, false);
});

test('NBT-01-S03: structure block adapter – SAVE region, LOAD anchor and rotation, four turns are identity', () => {
  const save = { mode: s('SAVE'), posX: i(1), posY: i(0), posZ: i(2), sizeX: i(3), sizeY: i(4), sizeZ: i(2) };
  const r1 = turnStructureBlock(save, 1);
  // Cells x 1..3, z 2..3 → (−z, x): x −3..−2, z 1..3.
  assert.deepEqual([r1.posX.value, r1.posZ.value, r1.sizeX.value, r1.sizeY.value, r1.sizeZ.value], [-3, 1, 2, 4, 3]);
  let r = save; for (let k = 0; k < 4; k++) r = turnStructureBlock(r, 1);
  assert.deepEqual(r, { ...save, posX: i(1), posY: i(0), posZ: i(2), sizeX: i(3), sizeY: i(4), sizeZ: i(2) });
  const load = { mode: s('LOAD'), posX: i(1), posY: i(-1), posZ: i(2), rotation: s('COUNTERCLOCKWISE_90') };
  const l1 = turnStructureBlock(load, 1);
  assert.deepEqual([l1.posX.value, l1.posY.value, l1.posZ.value, l1.rotation.value], [-2, -1, 1, 'NONE']);
  assert.equal(turnStructureBlock(load, 2).rotation.value, 'CLOCKWISE_90');
  assert.equal(turnStructureBlock({ mode: s('CORNER') }, 1).mode.value, 'CORNER');
  assert.equal(turnStructureBlock({ mode: s('LOAD'), posX: i(0), posY: i(0), posZ: i(0), rotation: s('SIDEWAYS') }, 1), null);
});
