import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPayload, countBlocks } from '../dist/voxel/src/index.js';
import {
  computeMaterials, materialsForResolution, materialsForParts, buildGuide, itemsForCell, formatStacks, materialsToCsv, SHULKER_SLOTS,
  createProject, execute, newInstance, resolveProject, createSampleLibrary, EMPTY_HISTORY,
} from '../dist/domain/src/index.js';

// Hand-written world: each entry is [x, y, z, id, properties]. Expectations below are counted by hand.
function world(entries, extra = {}) {
  const palette = [], index = new Map(), cells = [];
  let max = [1, 1, 1];
  for (const [x, y, z, id, properties = {}, kind] of entries) {
    const key = JSON.stringify([id, properties]);
    if (!index.has(key)) { index.set(key, palette.length); palette.push({ id, properties }); }
    cells.push(kind === 'erase' ? { position: [x, y, z], kind } : { position: [x, y, z], kind: kind ?? (id.endsWith(':air') ? 'air' : 'block'), paletteIndex: index.get(key) });
    max = [Math.max(max[0], x + 1), Math.max(max[1], y + 1), Math.max(max[2], z + 1)];
  }
  return createPayload({ schemaVersion: 1, profileId: 'java:registry-unverified', bounds: { min: [0, 0, 0], maxExclusive: max }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0],
    palette, cells, blockEntities: extra.blockEntities ?? [] });
}
const item = (report, id) => report.items.find(l => l.itemId === `minecraft:${id}`);
const none = () => undefined;
const yields = (id, properties = {}, at = none) => {
  const r = itemsForCell({ id: `minecraft:${id}`, properties }, [0, 0, 0], at);
  return 'yields' in r ? r.yields.map(y => [y.itemId.replace('minecraft:', ''), y.items, y.rule, y.confidence]) : r.unresolved;
};

test('placed states, build items and storage stay separate layers', () => {
  const w = world([
    [0, 0, 0, 'minecraft:stone'], [1, 0, 0, 'minecraft:stone'], [2, 0, 0, 'minecraft:stone_slab', { type: 'double', waterlogged: 'false' }],
    [0, 1, 0, 'minecraft:air'], [1, 1, 0, 'minecraft:air', {}, 'erase'],
  ]);
  const r = computeMaterials(w);
  assert.deepEqual([r.placed.blocks, r.placed.air, r.placed.erase], [3, 1, 1]);
  assert.equal(r.placed.states.length, 2);
  assert.equal(item(r, 'stone').count, 2);
  assert.equal(item(r, 'stone_slab').count, 2, 'one double slab cell = two slab items');
  assert.equal(r.totals.items, 4);
  assert.equal(r.totals.slots, 2);
  assert.ok(r.complete);
  assert.ok(r.notes.some(n => n.includes('1 Löschzellen')));
  // placed layer agrees with the shared voxel counter
  assert.equal(r.placed.blocks, countBlocks(w).blocks);
});

test('doors, tall plants and beds yield exactly one item per object', () => {
  const r = computeMaterials(world([
    [0, 0, 0, 'minecraft:oak_door', { half: 'lower', facing: 'north', hinge: 'left', open: 'false', powered: 'false' }],
    [0, 1, 0, 'minecraft:oak_door', { half: 'upper', facing: 'north', hinge: 'left', open: 'false', powered: 'false' }],
    [1, 0, 0, 'minecraft:sunflower', { half: 'lower' }], [1, 1, 0, 'minecraft:sunflower', { half: 'upper' }],
    [2, 0, 0, 'minecraft:tall_grass', { half: 'lower' }], [2, 1, 0, 'minecraft:tall_grass', { half: 'upper' }],
    // red bed facing east: foot at x=3, head at x=4
    [3, 0, 2, 'minecraft:red_bed', { part: 'foot', facing: 'east', occupied: 'false' }],
    [4, 0, 2, 'minecraft:red_bed', { part: 'head', facing: 'east', occupied: 'false' }],
    // second bed facing north: foot z=4, head z=3
    [0, 0, 4, 'minecraft:blue_bed', { part: 'foot', facing: 'north', occupied: 'false' }],
    [0, 0, 3, 'minecraft:blue_bed', { part: 'head', facing: 'north', occupied: 'false' }],
  ]));
  assert.equal(item(r, 'oak_door').count, 1);
  assert.equal(item(r, 'sunflower').count, 1);
  assert.equal(item(r, 'tall_grass').count, 1);
  assert.equal(item(r, 'red_bed').count, 1);
  assert.equal(item(r, 'blue_bed').count, 1);
  assert.equal(item(r, 'red_bed').stackSize, 1);
  assert.equal(r.placed.blocks, 10);
  assert.equal(r.totals.items, 5);
  assert.ok(r.complete);
});

test('a lone upper half or bed head still needs one item and is annotated', () => {
  const r = computeMaterials(world([
    [0, 1, 0, 'minecraft:iron_door', { half: 'upper', facing: 'south', hinge: 'right', open: 'false', powered: 'false' }],
    // bed head facing south whose foot (z-1) is a different bed colour
    [2, 0, 1, 'minecraft:white_bed', { part: 'head', facing: 'south', occupied: 'false' }],
    [2, 0, 0, 'minecraft:black_bed', { part: 'foot', facing: 'south', occupied: 'false' }],
  ]));
  assert.equal(item(r, 'iron_door').count, 1);
  assert.match(item(r, 'iron_door').sources[0].note, /obere Hälfte/);
  assert.equal(item(r, 'white_bed').count, 1);
  assert.match(item(r, 'white_bed').sources[0].note, /Kopfteil ohne Fußteil/);
  assert.equal(item(r, 'black_bed').count, 1);
  // door upper above a lower half of a different door type is not a pair
  assert.deepEqual(yields('oak_door', { half: 'upper' }, () => ({ id: 'minecraft:spruce_door', properties: { half: 'lower' } })), [['oak_door', 1, 'multiblock', 'catalog']]);
});

test('counted blocks follow their property, invalid counts stay unresolved', () => {
  const r = computeMaterials(world([
    [0, 0, 0, 'minecraft:candle', { candles: '3', lit: 'false', waterlogged: 'false' }],
    [1, 0, 0, 'minecraft:red_candle', { candles: '4', lit: 'true', waterlogged: 'false' }],
    [2, 0, 0, 'minecraft:sea_pickle', { pickles: '2', waterlogged: 'true' }],
    [3, 0, 0, 'minecraft:snow', { layers: '8' }], [4, 0, 0, 'minecraft:snow', { layers: '1' }],
    [5, 0, 0, 'minecraft:turtle_egg', { eggs: '4', hatch: '0' }],
    [6, 0, 0, 'minecraft:pink_petals', { flower_amount: '3', facing: 'north' }],
    [7, 0, 0, 'minecraft:snow', { layers: '9' }],
  ]));
  assert.equal(item(r, 'candle').count, 3);
  assert.equal(item(r, 'red_candle').count, 4);
  assert.equal(item(r, 'sea_pickle').count, 2);
  assert.equal(item(r, 'snow').count, 9);
  assert.equal(item(r, 'turtle_egg').count, 4);
  assert.equal(item(r, 'pink_petals').count, 3);
  assert.equal(r.unresolved.length, 1);
  assert.equal(r.unresolved[0].reason, 'invalid-state');
  assert.equal(r.waterlogged, 1);
  assert.ok(r.notes.some(n => n.includes('wassergeflutete')));
  assert.equal(r.complete, false);
});

test('wall variants map to the standing item, walls themselves stay walls', () => {
  assert.deepEqual(yields('wall_torch', { facing: 'east' }), [['torch', 1, 'wall-variant', 'catalog']]);
  assert.deepEqual(yields('soul_wall_torch', { facing: 'east' }), [['soul_torch', 1, 'wall-variant', 'catalog']]);
  assert.deepEqual(yields('redstone_wall_torch', { facing: 'east', lit: 'true' }), [['redstone_torch', 1, 'wall-variant', 'catalog']]);
  assert.deepEqual(yields('oak_wall_sign', { facing: 'north' }), [['oak_sign', 1, 'wall-variant', 'catalog']]);
  assert.deepEqual(yields('spruce_wall_hanging_sign', { facing: 'north' }), [['spruce_hanging_sign', 1, 'wall-variant', 'catalog']]);
  assert.deepEqual(yields('red_wall_banner', { facing: 'north' }), [['red_banner', 1, 'wall-variant', 'catalog']]);
  assert.deepEqual(yields('skeleton_wall_skull', { facing: 'north' }), [['skeleton_skull', 1, 'wall-variant', 'catalog']]);
  assert.deepEqual(yields('player_wall_head', { facing: 'north' }), [['player_head', 1, 'wall-variant', 'catalog']]);
  assert.deepEqual(yields('dead_tube_coral_wall_fan', { facing: 'north' }), [['dead_tube_coral_fan', 1, 'wall-variant', 'catalog']]);
  assert.deepEqual(yields('cobblestone_wall', { up: 'true' }), [['cobblestone_wall', 1, 'direct', 'catalog']]);
  const r = computeMaterials(world([[0, 0, 0, 'minecraft:oak_wall_sign', { facing: 'north' }], [1, 0, 0, 'minecraft:oak_sign', { rotation: '4' }]]));
  assert.equal(item(r, 'oak_sign').count, 2, 'wall and standing sign share one item line');
  assert.equal(item(r, 'oak_sign').stackSize, 16);
});

test('renamed, composite and derived blocks', () => {
  assert.deepEqual(yields('redstone_wire', { power: '0' }), [['redstone', 1, 'renamed', 'catalog']]);
  assert.deepEqual(yields('tripwire', {}), [['string', 1, 'renamed', 'catalog']]);
  assert.deepEqual(yields('carrots', { age: '7' }), [['carrot', 1, 'renamed', 'catalog']]);
  assert.deepEqual(yields('potted_poppy'), [['flower_pot', 1, 'composite', 'catalog'], ['poppy', 1, 'composite', 'catalog']]);
  assert.deepEqual(yields('potted_flowering_azalea_bush'), [['flower_pot', 1, 'composite', 'catalog'], ['flowering_azalea', 1, 'composite', 'catalog']]);
  assert.deepEqual(yields('potted_dead_bush'), [['flower_pot', 1, 'composite', 'catalog'], ['dead_bush', 1, 'composite', 'catalog']]);
  assert.deepEqual(yields('white_candle_cake', { lit: 'false' }), [['cake', 1, 'composite', 'catalog'], ['white_candle', 1, 'composite', 'catalog']]);
  assert.deepEqual(yields('farmland', { moisture: '7' }), [['dirt', 1, 'derived', 'assumed']]);
  assert.deepEqual(yields('piston_head', { facing: 'up', short: 'false', type: 'normal' }), []);
});

test('liquids, mod blocks, fire and creative-only blocks remain visibly unresolved', () => {
  const r = computeMaterials(world([
    [0, 0, 0, 'minecraft:water', { level: '0' }], [1, 0, 0, 'minecraft:water', { level: '0' }], [2, 0, 0, 'minecraft:lava', { level: '0' }],
    [3, 0, 0, 'create:shaft', { axis: 'y' }], [4, 0, 0, 'minecraft:fire', { age: '0' }], [5, 0, 0, 'minecraft:barrier'],
    [6, 0, 0, 'minecraft:stone'],
  ]));
  const reason = id => r.unresolved.find(u => u.state.id === id)?.reason;
  assert.equal(reason('minecraft:water'), 'liquid');
  assert.equal(r.unresolved.find(u => u.state.id === 'minecraft:water').count, 2);
  assert.equal(reason('minecraft:lava'), 'liquid');
  assert.equal(reason('create:shaft'), 'mod-namespace');
  assert.equal(reason('minecraft:fire'), 'no-item');
  assert.equal(reason('minecraft:barrier'), 'creative-only');
  assert.equal(r.items.length, 1);
  assert.equal(r.placed.blocks, 7, 'unresolved states are still counted as placed');
  assert.equal(r.complete, false);
});

test('unknown vanilla ids are flagged as assumption, never as complete', () => {
  const r = computeMaterials(world([[0, 0, 0, 'minecraft:copper_grate_variant_from_future']]));
  assert.equal(r.items[0].confidence, 'assumed');
  assert.equal(r.items[0].sources[0].rule, 'assumed');
  assert.equal(r.complete, false);
  assert.match(materialsToCsv(r), /Annahme/);
});

test('stacks, slots and shulker boxes by hand', () => {
  const entries = [];
  for (let i = 0; i < 200; i++) entries.push([i % 20, Math.floor(i / 20), 0, 'minecraft:stone']);      // 200 = 3×64 + 8 → 4 slots
  for (let i = 0; i < 20; i++) entries.push([i, 0, 1, 'minecraft:oak_sign', { rotation: '0' }]);       // 20 = 1×16 + 4 → 2 slots
  for (let i = 0; i < 3; i++) entries.push([i, 0, 2, 'minecraft:white_shulker_box', { facing: 'up' }]); // 3 unpackable slots
  const r = computeMaterials(world(entries));
  const stone = item(r, 'stone'), sign = item(r, 'oak_sign'), box = item(r, 'white_shulker_box');
  assert.deepEqual([stone.fullStacks, stone.remainder, stone.slots, formatStacks(stone)], [3, 8, 4, '3 × 64 + 8']);
  assert.deepEqual([sign.fullStacks, sign.remainder, sign.slots, formatStacks(sign)], [1, 4, 2, '1 × 16 + 4']);
  assert.deepEqual([box.stackSize, box.slots, box.packable], [1, 3, false]);
  assert.deepEqual(r.totals, { items: 223, slots: 9, shulkerBoxes: 1, unpackableSlots: 3 });
  assert.equal(formatStacks({ fullStacks: 2, remainder: 0, stackSize: 64 }), '2 × 64');
  assert.equal(formatStacks({ fullStacks: 0, remainder: 5, stackSize: 64 }), '5');
  // 28 full stacks of distinct packable items need two shulker boxes
  const many = [];
  for (let k = 0; k < SHULKER_SLOTS + 1; k++) many.push([k, 0, 0, `minecraft:${['stone', 'dirt', 'sand', 'gravel', 'glass', 'clay', 'mud'][k % 7]}_${k}_block`]);
  assert.equal(computeMaterials(world(many)).totals.shulkerBoxes, 2);
});

test('container contents are not counted but reported', () => {
  const r = computeMaterials(world([[0, 0, 0, 'minecraft:chest', { facing: 'north', type: 'single', waterlogged: 'false' }]], {
    blockEntities: [{ position: [0, 0, 0], data: { type: 'compound', value: { id: { type: 'string', value: 'minecraft:chest' }, Items: { type: 'list', elementType: 'end', value: [] } } } }],
  }));
  assert.equal(item(r, 'chest').count, 1);
  assert.equal(r.totals.items, 1);
  assert.equal(r.containersWithContents, 1);
});

test('project materials come from resolution.world: duplicates once, conflicts provisional, instances add up', async () => {
  const lib = await createSampleLibrary();
  const versions = new Map(lib.versions.map(v => [v.id, v]));
  const wall = lib.versions.find(v => v.assetId === 'sample_wall');
  const place = (x, name) => newInstance({ assetVersionId: wall.id, name, transform: { position: [x, 0, 0], quarterTurns: 0, mirrorX: false } });
  let p = createProject({ name: 'M' }), h = EMPTY_HISTORY;
  const a = place(0, 'A'), b = place(10, 'B');
  for (const instance of [a, b]) ({ project: p, history: h } = execute(p, h, { kind: 'instance.add', instance }));
  const single = computeMaterials(resolveProject(createProject({ name: 'x' }), versions).world);
  assert.equal(single.placed.blocks, 0);
  assert.equal(single.complete, false, 'an empty report is never complete');
  const res = resolveProject(p, versions), report = materialsForResolution(res);
  assert.equal(report.placed.blocks, 2 * 54);
  assert.equal(report.totals.items, 2 * 54);
  assert.ok(report.complete, 'sample palette is fully covered by the catalogue');
  const ra = materialsForResolution(res, { kind: 'instance', instanceId: a.id, name: 'A' });
  const rb = materialsForResolution(res, { kind: 'instance', instanceId: b.id, name: 'B' });
  assert.equal(ra.totals.items + rb.totals.items, report.totals.items);
  // identical copy on the same spot: duplicates are counted once
  const twin = newInstance({ assetVersionId: wall.id, name: 'A2', transform: a.transform });
  ({ project: p } = execute(p, h, { kind: 'instance.add', instance: twin }));
  const dup = resolveProject(p, versions);
  assert.equal(dup.duplicates, 54);
  assert.equal(materialsForResolution(dup).totals.items, 2 * 54);
  // shift B into A: conflicting cells make the report provisional
  const moved = execute(p, h, { kind: 'instance.transform', instanceId: b.id, transform: { ...b.transform, position: [1, 0, 0] } }).project;
  const conflicted = resolveProject(moved, versions), cr = materialsForResolution(conflicted);
  assert.ok(conflicted.conflicts.length > 0);
  assert.equal(cr.conflicts, conflicted.conflicts.length);
  assert.equal(cr.complete, false);
  assert.ok(cr.notes.some(n => n.includes('vorläufig')));
});

test('csv export lists items, unresolved states and completeness', () => {
  const r = computeMaterials(world([[0, 0, 0, 'minecraft:stone'], [1, 0, 0, 'minecraft:water', { level: '0' }]]));
  const csv = materialsToCsv(r).trim().split('\n');
  assert.equal(csv[0], 'Typ;ID;Menge;Stapelgröße;Stacks;Slots;Status;Hinweis');
  assert.match(csv[1], /^Item;minecraft:stone;1;64;1;1;Katalog;$/);
  assert.match(csv[2], /^Ungelöst;minecraft:water;1;;;;liquid;/);
  assert.match(csv.at(-1), /^Summe;;1;;;1;unvollständig;1 Shulkerkisten$/);
});

test('parts (guide steps, layers) look up partner halves in the whole world and add up to the world report', () => {
  const door = half => ({ half, facing: 'north', hinge: 'left', open: 'false', powered: 'false' });
  const w = world([
    [0, 0, 0, 'minecraft:oak_door', door('lower')], [0, 1, 0, 'minecraft:oak_door', door('upper')],
    [1, 0, 0, 'minecraft:stone'], [1, 1, 0, 'minecraft:stone_slab', { type: 'double', waterlogged: 'false' }],
    [2, 0, 0, 'minecraft:water', { level: '0' }],
  ]);
  const layer = y => w.cells.filter(c => c.position[1] === y).map(c => c.position);
  const parts = materialsForParts(w, [{ id: 'y0', positions: layer(0) }, { id: 'y1', positions: layer(1), conflicts: 2 }, { id: 'none', positions: [[9, 9, 9]] }]);
  const y0 = parts.get('y0'), y1 = parts.get('y1');
  assert.equal(item(y0, 'oak_door').count, 1, 'lower half carries the door');
  assert.equal(item(y1, 'oak_door'), undefined, 'upper half finds its partner in the other layer and yields nothing');
  assert.equal(item(y1, 'stone_slab').count, 2);
  assert.equal(y0.unresolved.length, 1, 'water stays unresolved in its own layer');
  assert.equal(y1.conflicts, 2);
  assert.equal(parts.get('none').placed.blocks, 0, 'positions without a cell are ignored');
  // selection-only lookup (instance scope) would count the lone upper half: the part rule is different on purpose
  assert.equal(item(computeMaterials(w, { include: c => c.position[1] === 1 }), 'oak_door').count, 1);
  const whole = computeMaterials(w);
  assert.equal(y0.totals.items + y1.totals.items, whole.totals.items);
});

test('guide steps of the sample castle add up to the project item report', async () => {
  const lib = await createSampleLibrary();
  const versions = new Map(lib.versions.map(v => [v.id, v]));
  let p = createProject({ name: 'Burg' }), h = EMPTY_HISTORY;
  for (const [assetId, x] of [['sample_tower', 0], ['sample_gate', 4], ['sample_tower', 10]]) {
    const v = lib.versions.find(v => v.assetId === assetId);
    ({ project: p, history: h } = execute(p, h, { kind: 'instance.add', instance: newInstance({ assetVersionId: v.id, name: assetId, transform: { position: [x, 0, assetId === 'sample_gate' ? 1 : 0], quarterTurns: 0, mirrorX: false } }) }));
  }
  const res = resolveProject(p, versions), guide = buildGuide(p, res);
  const parts = materialsForParts(res.world, guide.steps);
  const sum = new Map();
  for (const r of parts.values()) for (const l of r.items) sum.set(l.itemId, (sum.get(l.itemId) ?? 0) + l.count);
  const whole = materialsForResolution(res);
  assert.deepEqual(Object.fromEntries([...sum].sort()), Object.fromEntries(whole.items.map(l => [l.itemId, l.count]).sort()));
});

test('catalogue v2: stone/copper variants are catalogue items, filled cauldrons derived, frogspawn and chorus plant unresolved', () => {
  for (const id of ['polished_andesite', 'polished_deepslate', 'chiseled_tuff', 'cracked_deepslate_bricks', 'cut_red_sandstone', 'smooth_red_sandstone',
    'waxed_oxidized_cut_copper', 'exposed_copper', 'copper_grate', 'ochre_froglight', 'crimson_fungus', 'mangrove_roots', 'small_amethyst_bud', 'redstone_lamp'])
    assert.deepEqual(yields(id), [[id, 1, 'direct', 'catalog']], id);
  assert.deepEqual(yields('water_cauldron', { level: '3' }), [['cauldron', 1, 'derived', 'assumed']]);
  assert.equal(yields('frogspawn'), 'no-item');
  assert.equal(yields('chorus_plant'), 'creative-only');
  assert.equal(yields('mystery_thing')[0][3], 'assumed', 'unknown ids still fall back to a visible assumption');
});
