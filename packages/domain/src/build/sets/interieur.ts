import { Plot, axis, barrel, bed, campfire, candle, chest, door, furnace, lantern, lectern, slab, stairs, trapdoor, head, F, T } from '../plot.js';
import { bell, chair, cupboard, beamLamp, longTable, roomShell, rug, sofa, table, wallBanner } from '../furnish.js';
import { WIKI } from '../spec.js';
import type { BuildingSpec } from '../spec.js';
import { dressRoom } from '../facade.js';

/**
 * Interieur & Räume (Katalog v3): eingerichtete Raummodule als offener
 * Schnitt (Süd- und Ostseite offen, sichtbare Deckenbalken statt Decke). Sie
 * lassen sich in eine Hausschale setzen oder zeigen, wie ein Raum eingerichtet
 * werden kann. Möbel nur aus Vanilla-Blöcken.
 */

const pane = { east: F, north: F, south: F, waterlogged: F, west: F };
const water3 = { level: '3' };

function bauernkueche() {
  const p = new Plot([7, 6, 7]);
  roomShell(p, 7, 7, 4, 'spruce_planks', 'cobblestone', ['south', 'east'], null);
  p.fill(0, 1, 0, 0, 4, 0, 'spruce_log', axis('y'));
  p.set(1, 1, 1, 'smoker', furnace('south', true)); p.fill(1, 2, 1, 1, 4, 1, 'bricks');
  p.set(2, 1, 1, 'water_cauldron', water3); p.set(3, 1, 1, 'barrel', barrel('up'));
  p.set(4, 1, 1, 'spruce_slab', slab('top')); p.set(5, 1, 1, 'crafting_table');
  for (const x of [2, 3, 4, 5]) p.set(x, 3, 1, 'spruce_trapdoor', trapdoor('south', 'top'));
  p.set(4, 2, 1, 'flower_pot'); p.set(3, 2, 0, 'glass_pane', pane);
  p.set(5, 1, 2, 'composter'); p.set(5, 1, 4, 'hay_block', axis('y'));
  table(p, 3, 1, 3, 'spruce'); p.set(3, 2, 3, 'candle', candle(3, true));
  for (const [x, z, b] of [[2, 3, 'west'], [4, 3, 'east'], [3, 4, 'south']] as const) chair(p, x, 1, z, 'spruce', b);
  beamLamp(p, 3, 3, 5, 7, 'spruce_log', 1);
  dressRoom(p, 7, 7, 4, 'spruce', { posts: 3, border: 'stripped_spruce_wood' });
  return p.payload();
}

function schlafzimmer() {
  const p = new Plot([7, 6, 7]);
  roomShell(p, 7, 7, 4, 'oak_planks', 'oak_planks', ['south', 'east'], null);
  for (const x of [0, 6]) p.fill(x, 1, 0, x, 4, 0, 'oak_log', axis('y'));
  bed(p, 3, 1, 2, 'red', 'north'); p.set(2, 1, 1, 'barrel', barrel('up')); p.set(4, 1, 1, 'barrel', barrel('up'));
  p.set(2, 2, 1, 'lantern', lantern()); p.set(4, 2, 1, 'flower_pot');
  p.set(3, 2, 0, 'glass_pane', pane); p.set(3, 3, 0, 'glass_pane', pane);
  for (const x of [2, 3, 4]) p.set(x, 4, 1, 'oak_trapdoor', trapdoor('south', 'top'));
  cupboard(p, 1, 1, 4, 'oak', 'east', 3);
  rug(p, 2, 3, 4, 5, 1, 'white', 'red');
  p.set(5, 1, 5, 'oak_stairs', stairs('east')); p.set(5, 1, 4, 'chest', chest('west'));
  beamLamp(p, 3, 4, 5, 7, 'oak_log', 1);
  dressRoom(p, 7, 7, 4, 'dark_oak', { posts: 3, border: 'dark_oak_planks' });
  return p.payload();
}

function lesezimmer() {
  const p = new Plot([7, 6, 7]);
  roomShell(p, 7, 7, 4, 'dark_oak_planks', 'bookshelf', ['south', 'east'], null);
  for (const [x, z] of [[0, 0], [6, 0], [0, 6]] as const) p.fill(x, 1, z, x, 4, z, 'dark_oak_log', axis('y'));
  p.fill(0, 4, 1, 0, 4, 5, 'dark_oak_planks'); p.fill(1, 4, 0, 5, 4, 0, 'dark_oak_planks');
  p.set(3, 1, 1, 'lectern', lectern('south'));
  chair(p, 2, 1, 4, 'dark_oak', 'south', true); chair(p, 5, 1, 4, 'dark_oak', 'south', true);
  table(p, 3, 1, 4, 'dark_oak', 'carpet', 'green'); p.set(1, 1, 1, 'potted_fern'); p.set(5, 1, 1, 'candle', candle(2, true));
  for (let x = 1; x <= 5; x++) for (let z = 2; z <= 5; z++) if (!p.get(x, 1, z)) p.set(x, 1, z, x === 1 || x === 5 || z === 2 || z === 5 ? 'lime_carpet' : 'green_carpet');
  beamLamp(p, 3, 3, 5, 7, 'dark_oak_log', 1);
  dressRoom(p, 7, 7, 4, 'dark_oak', { dado: false, posts: 0 });
  return p.payload();
}

function kaminzimmer() {
  const p = new Plot([9, 7, 7]);
  roomShell(p, 9, 7, 4, 'spruce_planks', 'stone_bricks', ['south', 'east'], null);
  // fireplace: brick mantle with campfire, chimney up through the ceiling
  p.fill(3, 1, 0, 5, 3, 1, 'bricks'); p.set(4, 1, 1, 'campfire', campfire('south'));
  p.air(4, 2, 1);
  p.fill(3, 3, 1, 5, 3, 1, 'brick_slab', slab('top')); p.set(3, 4, 1, 'flower_pot'); p.set(5, 4, 1, 'candle', candle(3, true));
  p.fill(4, 4, 0, 4, 6, 0, 'bricks');
  sofa(p, 3, 1, 5, 'spruce', 'south', 3, 'red_nether_brick');
  chair(p, 1, 1, 3, 'spruce', 'west'); chair(p, 7, 1, 3, 'spruce', 'east');
  rug(p, 2, 2, 6, 4, 1, 'red', 'orange'); table(p, 4, 1, 3, 'spruce', 'carpet', 'brown');
  p.set(1, 1, 1, 'barrel', barrel('up')); p.set(7, 1, 1, 'potted_azalea_bush');
  p.set(1, 2, 0, 'glass_pane', pane); p.set(7, 2, 0, 'glass_pane', pane);
  beamLamp(p, 2, 3, 5, 9, 'spruce_log', 1); beamLamp(p, 6, 3, 5, 9, 'spruce_log', 1);
  dressRoom(p, 9, 7, 4, 'spruce', { posts: 4, border: 'stripped_spruce_wood' });
  return p.payload();
}

function esszimmer() {
  const p = new Plot([9, 6, 7]);
  roomShell(p, 9, 7, 4, 'oak_planks', 'white_terracotta', ['south', 'east'], null);
  for (const x of [0, 4, 8]) p.fill(x, 1, 0, x, 4, 0, 'dark_oak_log', axis('y'));
  longTable(p, 2, 3, 6, 3, 1, 'dark_oak_slab');
  for (let x = 2; x <= 6; x++) { chair(p, x, 1, 2, 'dark_oak', 'north'); chair(p, x, 1, 4, 'dark_oak', 'south'); }
  chair(p, 1, 1, 3, 'dark_oak', 'west'); chair(p, 7, 1, 3, 'dark_oak', 'east');
  p.set(3, 2, 3, 'candle', candle(3, true)); p.set(5, 2, 3, 'candle', candle(3, true)); p.set(4, 2, 3, 'flower_pot');
  for (const x of [2, 6]) p.set(x, 2, 0, 'glass_pane', pane);
  cupboard(p, 1, 1, 1, 'dark_oak', 'south', 2); cupboard(p, 7, 1, 1, 'dark_oak', 'south', 2);
  beamLamp(p, 3, 3, 5, 9, 'dark_oak_log', 1); beamLamp(p, 5, 3, 5, 9, 'dark_oak_log', 1);
  dressRoom(p, 9, 7, 4, 'dark_oak', { posts: 4, border: 'dark_oak_planks' });
  return p.payload();
}

function badezimmer() {
  const p = new Plot([7, 6, 6]);
  roomShell(p, 7, 6, 4, 'smooth_quartz', 'white_concrete', ['south', 'east'], null);
  p.fill(1, 1, 1, 2, 1, 1, 'water_cauldron', water3); p.fill(1, 1, 2, 2, 1, 2, 'quartz_slab', slab('top'));
  p.set(1, 2, 1, 'tripwire_hook', { attached: F, facing: 'south', powered: F });
  p.set(4, 1, 1, 'cauldron'); p.set(4, 2, 1, 'tripwire_hook', { attached: F, facing: 'south', powered: F });
  p.set(4, 3, 0, 'glass'); p.set(3, 3, 0, 'glass'); p.set(5, 3, 0, 'glass');
  p.set(5, 1, 3, 'quartz_stairs', stairs('east')); p.set(5, 1, 2, 'birch_trapdoor', trapdoor('south', 'bottom', true));
  p.set(5, 1, 1, 'potted_bamboo'); rug(p, 2, 3, 3, 4, 1, 'light_blue');
  p.set(2, 2, 2, 'white_candle', candle(2, true));
  p.set(3, 4, 2, 'sea_lantern');
  dressRoom(p, 7, 6, 4, 'birch', { dado: false });
  return p.payload();
}

function thronsaal() {
  const p = new Plot([11, 9, 15]);
  roomShell(p, 11, 15, 7, 'polished_andesite', 'stone_bricks', ['south', 'east'], null);
  for (const z of [3, 7, 11]) for (const x of [2, 8]) p.fill(x, 1, z, x, 7, z, 'quartz_pillar', axis('y'));
  rug(p, 4, 3, 6, 14, 1, 'red'); for (let z = 3; z <= 14; z++) { p.set(4, 1, z, 'yellow_carpet'); p.set(6, 1, z, 'yellow_carpet'); }
  p.fill(3, 1, 1, 7, 1, 2, 'polished_andesite'); p.fill(4, 2, 1, 6, 2, 1, 'gold_block');
  p.set(5, 2, 2, 'quartz_stairs', stairs('north')); p.set(4, 2, 2, 'red_carpet'); p.set(6, 2, 2, 'red_carpet');
  p.fill(4, 3, 1, 6, 3, 1, 'gold_block'); p.set(5, 4, 1, 'gold_block'); p.set(5, 5, 1, 'player_head', head(0));
  for (const x of [3, 7]) p.set(x, 2, 1, 'lantern', lantern());
  for (const z of [5, 9, 13]) { p.set(1, 4, z, 'red_wall_banner', wallBanner('east')); }
  for (const x of [3, 7]) p.set(x, 5, 1, 'yellow_wall_banner', wallBanner('south'));
  for (const z of [5, 9]) { for (let i = 0; i < 2; i++) p.set(5, 7 - i, z, 'iron_chain', { axis: 'y', waterlogged: F }); p.set(5, 5, z, 'lantern', lantern(true));
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) p.set(5 + dx, 5, z + dz, 'dark_oak_trapdoor', trapdoor(dx > 0 ? 'east' : dx < 0 ? 'west' : dz > 0 ? 'south' : 'north', 'top', true)); }
  p.set(5, 7, 1, 'bell', bell('north', 'single_wall'));
  dressRoom(p, 11, 15, 7, 'dark_oak', { dado: false, border: 'polished_deepslate' });
  return p.payload();
}

function vorratskammer() {
  const p = new Plot([7, 6, 7]);
  roomShell(p, 7, 7, 4, 'cobblestone', 'spruce_planks', ['south', 'east'], null);
  for (let x = 1; x <= 5; x++) for (let y = 1; y <= 3; y++) p.set(x, y, 1, 'barrel', barrel('south'));
  p.set(1, 1, 2, 'chest', chest('east', 'left')); p.set(1, 1, 3, 'chest', chest('east', 'right'));
  p.set(5, 1, 2, 'hay_block', axis('y')); p.set(5, 2, 2, 'hay_block', axis('x')); p.set(5, 1, 3, 'pumpkin'); p.set(5, 1, 4, 'melon');
  p.set(4, 1, 3, 'composter'); p.set(1, 1, 4, 'dried_kelp_block'); p.set(1, 2, 4, 'honey_block');
  for (const x of [2, 4]) p.set(x, 4, 4, 'spruce_slab', slab('top'));
  beamLamp(p, 3, 3, 5, 7, 'spruce_log', 1);
  dressRoom(p, 7, 7, 4, 'spruce', { posts: 3 });
  return p.payload();
}

function alchemielabor() {
  const p = new Plot([7, 6, 7]);
  roomShell(p, 7, 7, 4, 'deepslate_tiles', 'deepslate_bricks', ['south', 'east'], null);
  p.fill(1, 1, 1, 5, 1, 1, 'dark_oak_slab', slab('top'));
  for (const x of [1, 3, 5]) p.set(x, 2, 1, 'brewing_stand', { has_bottle_0: T, has_bottle_1: F, has_bottle_2: T });
  p.set(2, 2, 1, 'purple_candle', candle(3, true)); p.set(4, 2, 1, 'amethyst_cluster', { facing: 'up', waterlogged: F });
  p.fill(0, 1, 2, 0, 3, 4, 'bookshelf'); p.fill(6, 1, 2, 6, 3, 4, 'bookshelf');
  p.set(3, 1, 3, 'water_cauldron', water3); p.set(3, 1, 4, 'cauldron'); p.set(5, 1, 4, 'ender_chest', { facing: 'west', waterlogged: F }); p.set(1, 1, 4, 'lectern', lectern('east'));
  for (const x of [1, 5]) p.set(x, 3, 1, 'potted_crimson_fungus');
  beamLamp(p, 3, 3, 5, 7, 'dark_oak_log', 1, 'soul_lantern');
  dressRoom(p, 7, 7, 4, 'dark_oak', { posts: 3, border: 'polished_deepslate' });
  return p.payload();
}

function kartenraum() {
  const p = new Plot([7, 6, 7]);
  roomShell(p, 7, 7, 4, 'birch_planks', 'stripped_birch_log', ['south', 'east'], null, axis('y'));
  p.set(3, 1, 3, 'cartography_table'); chair(p, 3, 1, 4, 'birch', 'south');
  p.set(1, 1, 1, 'lectern', lectern('south')); p.set(5, 1, 1, 'barrel', barrel('up'));
  // wall map: a coastline in wool on the back wall
  const map = ['lbbbl', 'lggbl', 'bglgb'];
  map.forEach((row, i) => [...row].forEach((c, j) => p.set(1 + j, 4 - i, 0, c === 'b' ? 'blue_wool' : c === 'g' ? 'lime_wool' : 'light_blue_wool')));
  p.set(5, 2, 1, 'blue_concrete'); // globe stand on the barrel
  p.set(1, 1, 3, 'chest', chest('east')); p.set(5, 1, 3, 'white_banner', { rotation: '12' });
  beamLamp(p, 3, 2, 5, 7, 'birch_log', 0);
  dressRoom(p, 7, 7, 4, 'spruce', { dado: false, border: 'stripped_birch_wood' });
  return p.payload();
}

function handwerkskammer() {
  const p = new Plot([9, 6, 7]);
  roomShell(p, 9, 7, 4, 'stone_bricks', 'oak_planks', ['south', 'east'], null);
  for (const [x, z] of [[0, 0], [8, 0], [0, 6]] as const) p.fill(x, 1, z, x, 4, z, 'oak_log', axis('y'));
  const stations: readonly [string, Record<string, string>][] = [['crafting_table', {}], ['loom', { facing: 'south' }], ['stonecutter', { facing: 'south' }],
    ['smithing_table', {}], ['fletching_table', {}], ['cartography_table', {}], ['grindstone', { face: 'floor', facing: 'south' }]];
  stations.forEach(([id, props], i) => p.set(1 + i, 1, 1, id, props));
  p.set(1, 1, 3, 'anvil', { facing: 'east' }); p.set(7, 1, 3, 'blast_furnace', furnace('west')); p.set(7, 1, 4, 'furnace', furnace('west'));
  p.set(1, 1, 4, 'chest', chest('east')); p.set(4, 1, 3, 'barrel', barrel('up'));
  for (let x = 1; x <= 7; x++) p.set(x, 3, 1, 'oak_trapdoor', trapdoor('south', 'top'));
  beamLamp(p, 4, 3, 5, 9, 'oak_log', 1);
  dressRoom(p, 9, 7, 4, 'spruce', { posts: 4, border: 'polished_andesite' });
  return p.payload();
}

function weinkeller() {
  const p = new Plot([7, 6, 9]);
  roomShell(p, 7, 9, 4, 'stone_bricks', 'stone_bricks', ['south', 'east'], null);
  // vault ribs
  for (const z of [2, 5]) { p.set(1, 4, z, 'stone_brick_stairs', stairs('west', 'top')); p.set(5, 4, z, 'stone_brick_stairs', stairs('east', 'top')); }
  for (let z = 1; z <= 7; z++) for (const [x, f] of [[1, 'east'], [5, 'west']] as const) { p.set(x, 1, z, 'barrel', barrel(f)); p.set(x, 2, z, 'barrel', barrel(f)); }
  for (let z = 1; z <= 7; z++) { p.set(1, 3, z, 'spruce_slab', slab('bottom')); p.set(5, 3, z, 'spruce_slab', slab('bottom')); }
  table(p, 3, 1, 3, 'spruce'); p.set(3, 1, 1, 'barrel', barrel('south')); p.set(3, 2, 1, 'candle', candle(4, true));
  beamLamp(p, 3, 5, 5, 7, 'stone_bricks', 1); beamLamp(p, 3, 2, 5, 7, 'stone_bricks', 0);
  return p.payload();
}

function moderneKueche() {
  const p = new Plot([9, 6, 7]);
  roomShell(p, 9, 7, 4, 'polished_diorite', 'white_concrete', ['south', 'east'], null);
  for (let x = 1; x <= 7; x++) p.set(x, 1, 1, 'white_concrete');
  p.set(3, 1, 1, 'smoker', furnace('south')); p.set(5, 1, 1, 'cauldron'); p.set(5, 2, 1, 'tripwire_hook', { attached: F, facing: 'south', powered: F });
  for (let x = 1; x <= 7; x++) if (x !== 3 && x !== 5) p.set(x, 2, 1, 'smooth_stone_slab', slab('bottom'));
  for (let x = 1; x <= 7; x++) p.set(x, 3, 1, 'iron_trapdoor', trapdoor('south', 'top'));
  p.fill(4, 2, 0, 4, 3, 0, 'glass'); p.set(1, 1, 2, 'iron_trapdoor', trapdoor('south', 'bottom', true));
  p.fill(3, 1, 3, 5, 1, 3, 'quartz_block'); p.fill(3, 2, 3, 5, 2, 3, 'smooth_quartz_slab', slab('bottom'));
  for (const x of [3, 4, 5]) chair(p, x, 1, 4, 'birch', 'south');
  for (const x of [3, 5]) p.set(x, 4, 3, 'sea_lantern');
  p.set(7, 1, 3, 'potted_dandelion');
  dressRoom(p, 9, 7, 4, 'birch', { dado: false, border: 'polished_andesite' });
  return p.payload();
}

function arbeitszimmer() {
  const p = new Plot([7, 6, 6]);
  roomShell(p, 7, 6, 4, 'birch_planks', 'light_gray_concrete', ['south', 'east'], null);
  p.fill(1, 2, 0, 5, 3, 0, 'glass');
  p.fill(2, 1, 1, 4, 1, 1, 'dark_oak_slab', slab('top')); chair(p, 3, 1, 2, 'dark_oak', 'south');
  p.set(4, 2, 1, 'end_rod', { facing: 'up' }); p.set(2, 2, 1, 'flower_pot');
  p.fill(5, 1, 3, 5, 3, 3, 'bookshelf'); p.fill(1, 1, 3, 1, 1, 4, 'bookshelf');
  rug(p, 2, 3, 4, 4, 1, 'gray');
  p.set(3, 4, 3, 'sea_lantern');
  dressRoom(p, 7, 6, 4, 'birch', { posts: 3, border: 'stripped_birch_wood' });
  return p.payload();
}

function schankraum() {
  const p = new Plot([11, 7, 9]);
  roomShell(p, 11, 9, 4, 'spruce_planks', 'stripped_spruce_log', ['south', 'east'], null, axis('y'));
  // bar along the back
  p.fill(1, 1, 2, 6, 1, 2, 'spruce_planks'); p.fill(1, 2, 2, 6, 2, 2, 'spruce_slab', slab('bottom'));
  for (let x = 1; x <= 6; x++) { p.set(x, 1, 1, 'barrel', barrel('south')); p.set(x, 2, 1, 'barrel', barrel('south')); }
  for (const x of [2, 4, 6]) chair(p, x, 1, 3, 'spruce', 'south');
  // fireplace in the corner
  p.fill(8, 1, 0, 10, 3, 1, 'cobblestone'); p.set(9, 1, 1, 'campfire', campfire('south')); p.air(9, 2, 1); p.fill(9, 4, 0, 9, 6, 0, 'cobblestone');
  for (const [x, z] of [[8, 4], [5, 6]] as const) { table(p, x, 1, z, 'spruce'); chair(p, x - 1, 1, z, 'spruce', 'west'); chair(p, x + 1, 1, z, 'spruce', 'east'); }
  p.set(2, 1, 6, 'barrel', barrel('up')); p.set(2, 2, 6, 'candle', candle(2, true));
  p.set(1, 3, 1, 'red_wall_banner', wallBanner('south'));
  beamLamp(p, 3, 3, 5, 11, 'dark_oak_log', 1); beamLamp(p, 7, 5, 5, 11, 'dark_oak_log', 1);
  dressRoom(p, 11, 9, 4, 'dark_oak', { dado: false, border: 'stripped_spruce_wood' });
  return p.payload();
}

function schatzkammer() {
  const p = new Plot([7, 6, 7]);
  roomShell(p, 7, 7, 4, 'polished_blackstone_bricks', 'polished_blackstone_bricks', ['east'], null);
  p.fill(2, 1, 6, 4, 3, 6, 'iron_bars'); p.fill(4, 1, 6, 4, 3, 6, 'polished_blackstone_bricks'); p.fill(3, 1, 6, 3, 2, 6, null); door(p, 3, 1, 6, 'iron', 'north');
  p.set(4, 1, 5, 'stone_button', { face: 'wall', facing: 'north', powered: F });
  p.fill(1, 1, 1, 2, 1, 1, 'gold_block'); p.set(1, 2, 1, 'gold_block'); p.set(5, 1, 1, 'emerald_block'); p.set(4, 1, 1, 'diamond_block');
  p.set(1, 1, 2, 'chest', chest('east', 'left')); p.set(1, 1, 3, 'chest', chest('east', 'right'));
  p.set(5, 1, 3, 'chest', chest('west', 'left')); p.set(5, 1, 2, 'chest', chest('west', 'right'));
  p.set(3, 1, 1, 'lapis_block'); p.set(3, 2, 1, 'player_head', head(8));
  p.set(1, 3, 1, 'lantern', lantern()); p.set(5, 2, 1, 'lantern', lantern());
  return p.payload();
}

function kerker() {
  const p = new Plot([9, 6, 7]);
  roomShell(p, 9, 7, 4, 'cobblestone', 'mossy_stone_bricks', ['south'], null);
  for (const x of [3, 6]) p.fill(x, 1, 1, x, 4, 3, 'stone_bricks');
  p.fill(1, 1, 3, 2, 4, 3, 'iron_bars'); p.fill(4, 1, 3, 5, 4, 3, 'iron_bars'); p.fill(7, 1, 3, 7, 4, 3, 'iron_bars');
  p.fill(1, 1, 1, 2, 4, 2, null); p.fill(4, 1, 1, 5, 4, 2, null); p.fill(7, 1, 1, 7, 4, 2, null);
  p.set(1, 1, 1, 'skeleton_skull', head(2)); p.set(5, 1, 1, 'cobweb'); p.set(7, 1, 1, 'cobweb'); p.set(4, 4, 1, 'cobweb');
  for (const x of [2, 4]) for (const y of [3, 4]) p.set(x, y, 1, 'iron_chain', { axis: 'y', waterlogged: F });
  p.set(1, 1, 5, 'barrel', barrel('up')); p.set(7, 1, 5, 'soul_lantern', lantern());
  p.set(4, 1, 5, 'oak_slab', slab('top')); p.set(4, 2, 5, 'candle', candle(1, true));
  return p.payload();
}

function wintergarten() {
  const p = new Plot([9, 6, 7]);
  roomShell(p, 9, 7, 4, 'mossy_stone_bricks', 'glass', ['south', 'east'], null);
  for (const x of [0, 4, 8]) p.fill(x, 1, 0, x, 4, 0, 'stripped_birch_log', axis('y'));
  p.fill(0, 1, 6, 0, 4, 6, 'stripped_birch_log', axis('y'));
  for (const [x, z] of [[1, 1], [7, 1], [1, 5], [7, 5]] as const) { p.set(x, 0, z, 'moss_block'); p.set(x, 1, z, 'flowering_azalea'); }
  for (const [x, plant] of [[2, 'potted_red_tulip'], [3, 'potted_fern'], [5, 'potted_blue_orchid'], [6, 'potted_cactus']] as const) p.set(x, 1, 1, plant);
  sofa(p, 3, 1, 5, 'birch', 'south', 3); p.set(4, 1, 3, 'birch_fence'); p.set(4, 2, 3, 'potted_white_tulip');
  dressRoom(p, 9, 7, 4, 'birch', { crown: false });
  return p.payload();
}

function gaestezimmer() {
  const p = new Plot([7, 6, 7]);
  roomShell(p, 7, 7, 4, 'birch_planks', 'birch_planks', ['south', 'east'], null);
  bed(p, 1, 1, 2, 'light_blue', 'north'); bed(p, 5, 1, 2, 'light_blue', 'north');
  p.set(3, 1, 1, 'barrel', barrel('up')); p.set(3, 2, 1, 'lantern', lantern());
  p.set(1, 2, 0, 'glass_pane', pane); p.set(5, 2, 0, 'glass_pane', pane);
  cupboard(p, 5, 1, 5, 'birch', 'west', 2); p.set(1, 1, 5, 'chest', chest('east'));
  rug(p, 2, 3, 4, 4, 1, 'light_blue');
  beamLamp(p, 3, 3, 5, 7, 'birch_log', 1);
  dressRoom(p, 7, 7, 4, 'spruce', { posts: 3, border: 'spruce_planks' });
  return p.payload();
}

function waffenkammer() {
  const p = new Plot([7, 6, 7]);
  roomShell(p, 7, 7, 4, 'stone_bricks', 'cobblestone', ['south', 'east'], null);
  p.set(1, 1, 1, 'grindstone', { face: 'floor', facing: 'south' }); p.set(2, 1, 1, 'smithing_table'); p.set(3, 1, 1, 'anvil', { facing: 'east' });
  p.set(4, 1, 1, 'blast_furnace', furnace('south', true)); p.set(5, 1, 1, 'barrel', barrel('up'));
  for (const x of [1, 3, 5]) p.set(x, 3, 1, 'red_wall_banner', wallBanner('south'));
  for (const z of [2, 4]) p.set(1, 3, z, 'skeleton_wall_skull', { facing: 'east', powered: F });
  p.set(1, 1, 4, 'chest', chest('east')); p.set(5, 1, 4, 'chest', chest('west'));
  p.set(5, 1, 3, 'target', { power: '0' }); p.set(1, 1, 3, 'fletching_table');
  beamLamp(p, 3, 3, 5, 7, 'spruce_log', 1);
  dressRoom(p, 7, 7, 4, 'spruce', { posts: 3, border: 'polished_andesite' });
  return p.payload();
}

const ROOM = 'Raummodul als offener Schnitt (Süd- und Ostseite offen, ohne Decke): in eine Hausschale gleicher Größe setzen, Wände und Decke liefert das Haus.';

export const INTERIEUR_SPECS: readonly BuildingSpec[] = [
  { id: 'bld_raum_bauernkueche', name: 'Bauernküche', payload: bauernkueche, tags: ['küche', 'raum', 'räucherofen'],
    description: 'Bauernküche mit Räucherofen unter Ziegelhaube, Kesselspüle, Hängeschränken aus Falltüren und Esstisch mit Kerzen.',
    facets: { kategorie: ['interieur'], stil: ['rustikal'], biom: ['ueberall'], funktion: ['kochen', 'einrichtung'] }, assumed: ['minecraft:cauldron'], tips: [ROOM, 'Der Räucherofen macht einen Dorfbewohner zum Metzger.'] },
  { id: 'bld_raum_schlafzimmer', name: 'Schlafzimmer', payload: schlafzimmer, tags: ['schlafen', 'raum', 'bett'],
    description: 'Schlafzimmer mit Bett zwischen zwei Nachttischen, Fenster, Kleiderschrank aus Fässern hinter Falltüren und Teppich.',
    facets: { kategorie: ['interieur'], stil: ['rustikal', 'klassisch'], biom: ['ueberall'], funktion: ['wohnen', 'einrichtung'] }, tips: [ROOM, 'Fässer lassen sich auch mit einem Block darüber öffnen – ideal hinter Falltür-Türen.'] },
  { id: 'bld_raum_lesezimmer', name: 'Lesezimmer', payload: lesezimmer, tags: ['bibliothek', 'raum', 'bücher'],
    description: 'Lesezimmer mit Bücherregalwänden, Lesepult, zwei Ohrensesseln mit Falltür-Armlehnen und grünem Teppich.',
    facets: { kategorie: ['interieur'], stil: ['klassisch', 'viktorianisch'], biom: ['ueberall'], funktion: ['bildung', 'einrichtung'] }, tips: [ROOM] },
  { id: 'bld_raum_kaminzimmer', name: 'Kaminzimmer', payload: kaminzimmer, tags: ['wohnzimmer', 'kamin', 'sofa'],
    description: 'Wohnzimmer mit Ziegelkamin und Lagerfeuer, Sofa aus Treppen, Sesseln, Couchtisch und Teppich.',
    facets: { kategorie: ['interieur'], stil: ['rustikal', 'nordisch'], biom: ['ueberall'], funktion: ['wohnen', 'einrichtung'] },
    tips: [ROOM, 'Ein Lagerfeuer brennt Blöcke nicht an und hält Rauch senkrecht: der Kamin bleibt sicher.'], inspiration: [WIKI('Campfire', 'Lagerfeuer')] },
  { id: 'bld_raum_esszimmer', name: 'Esszimmer', payload: esszimmer, tags: ['speisesaal', 'tafel', 'raum'],
    description: 'Esszimmer mit langer Tafel aus oberen Stufen, zwölf Stühlen, Kerzen und zwei Anrichten.',
    facets: { kategorie: ['interieur'], stil: ['klassisch', 'mittelalterlich'], biom: ['ueberall'], funktion: ['versammlung', 'einrichtung'] }, tips: [ROOM] },
  { id: 'bld_raum_badezimmer', name: 'Badezimmer', payload: badezimmer, tags: ['bad', 'wanne', 'raum'],
    description: 'Helles Bad aus Quarz und weißem Beton: Wanne aus Wasserkesseln, Waschbecken mit Haken als Hahn, Spiegel und Toilette.',
    facets: { kategorie: ['interieur'], stil: ['modern'], biom: ['ueberall'], funktion: ['wohnen', 'einrichtung'] }, assumed: ['minecraft:cauldron'], tips: [ROOM, 'Kessel mit Wasser füllt man mit dem Eimer; Wasser zählt nicht als Bauitem.'] },
  { id: 'bld_raum_thronsaal', name: 'Thronsaal', payload: thronsaal, tags: ['burg', 'thron', 'saal'],
    description: 'Großer Thronsaal mit Quarzsäulen, rotem Läufer mit Goldrand, goldenem Thron, Bannern und zwei Kronleuchtern.',
    facets: { kategorie: ['interieur'], stil: ['mittelalterlich', 'fantasy'], biom: ['ueberall'], funktion: ['versammlung', 'deko'] }, tips: [ROOM, 'Passt in den Bergfried oder eine Burganlage aus dem Generator.'] },
  { id: 'bld_raum_vorratskammer', name: 'Vorratskammer', payload: vorratskammer, tags: ['lager', 'fässer', 'raum'],
    description: 'Vorratskammer mit einer Wand aus 15 Fässern, Doppeltruhe, Heu, Kürbis, Melone und Honig.',
    facets: { kategorie: ['interieur'], stil: ['rustikal'], biom: ['ueberall'], funktion: ['lagern', 'kochen'] }, tips: [ROOM] },
  { id: 'bld_raum_alchemielabor', name: 'Alchemielabor', payload: alchemielabor, tags: ['tränke', 'labor', 'raum'],
    description: 'Dunkles Labor mit drei Braustände, Kessel, Bücherwänden, Endertruhe, Amethyst und Seelenlaterne.',
    facets: { kategorie: ['interieur'], stil: ['fantasy'], biom: ['ueberall'], funktion: ['verzaubern', 'einrichtung'] },
    assumed: ['minecraft:cauldron'], tips: [ROOM, 'Braustände brauchen Lohenstaub als Brennstoff.'], inspiration: [WIKI('Brewing', 'Brauen')] },
  { id: 'bld_raum_kartenraum', name: 'Kartenraum', payload: kartenraum, tags: ['karten', 'forscher', 'raum'],
    description: 'Kartenraum aus Birke mit Kartentisch, Lesepult, Globus und einer Küstenkarte aus Wolle an der Wand.',
    facets: { kategorie: ['interieur'], stil: ['klassisch'], biom: ['ueberall'], funktion: ['bildung', 'orientierung'] }, tips: [ROOM, 'Der Kartentisch macht Dorfbewohner zu Kartografen.'] },
  { id: 'bld_raum_handwerk', name: 'Handwerkskammer', payload: handwerkskammer, tags: ['werkstatt', 'arbeitsblöcke', 'raum'],
    description: 'Werkraum mit allen Arbeitsblöcken in einer Reihe: Werkbank, Webstuhl, Steinsäge, Schmiedetisch, Bogner, Kartentisch, Schleifstein, dazu Amboss und Öfen.',
    facets: { kategorie: ['interieur'], stil: ['rustikal'], biom: ['ueberall'], funktion: ['handwerk', 'einrichtung'] }, tips: [ROOM] },
  { id: 'bld_raum_weinkeller', name: 'Weinkeller', payload: weinkeller, tags: ['keller', 'fässer', 'gewölbe'],
    description: 'Gewölbekeller aus Steinziegeln mit liegenden Fässern an beiden Seiten, Probiertisch und Kerzen.',
    facets: { kategorie: ['interieur'], stil: ['mittelalterlich'], biom: ['hoehle', 'ueberall'], funktion: ['lagern'] }, tips: [ROOM] },
  { id: 'bld_raum_moderne_kueche', name: 'Moderne Küche', payload: moderneKueche, tags: ['küche', 'modern', 'kochinsel'],
    description: 'Weiße Küche mit Eisen-Hängeschränken, Spüle, Kochinsel aus Quarz mit Barhockern und Seelaternen als Deckenlicht.',
    facets: { kategorie: ['interieur'], stil: ['modern'], biom: ['ueberall'], funktion: ['kochen', 'einrichtung'] }, tips: [ROOM] },
  { id: 'bld_raum_arbeitszimmer', name: 'Arbeitszimmer', payload: arbeitszimmer, tags: ['büro', 'schreibtisch', 'modern'],
    description: 'Modernes Arbeitszimmer mit Fensterband, Schreibtisch, Endstab-Leuchte, Regalen und Teppich.',
    facets: { kategorie: ['interieur'], stil: ['modern'], biom: ['ueberall'], funktion: ['bildung', 'einrichtung'] }, tips: [ROOM] },
  { id: 'bld_raum_schankraum', name: 'Schankraum', payload: schankraum, tags: ['taverne', 'bar', 'kamin'],
    description: 'Schankraum mit Theke vor einer Fasswand, Barhockern, Ecktisch-Gruppen und Feuerstelle aus Bruchstein.',
    facets: { kategorie: ['interieur'], stil: ['mittelalterlich', 'rustikal'], biom: ['ueberall'], funktion: ['versammlung', 'unterhaltung'] }, tips: [ROOM] },
  { id: 'bld_raum_schatzkammer', name: 'Schatzkammer', payload: schatzkammer, tags: ['tresor', 'gold', 'eisentür'],
    description: 'Geschlossene Schatzkammer aus Schwarzstein mit Eisentür und Knopf, Gitterwand, Goldhaufen und vier Truhen.',
    facets: { kategorie: ['interieur'], stil: ['mittelalterlich', 'fantasy'], biom: ['ueberall'], funktion: ['lagern', 'verteidigung'] },
    tips: ['Eisentüren öffnen nur mit Redstone: der Knopf innen neben der Tür reicht für den Ausgang, außen einen zweiten setzen.'] },
  { id: 'bld_raum_kerker', name: 'Kerker', payload: kerker, tags: ['gefängnis', 'zellen', 'gitter'],
    description: 'Kerker mit drei Zellen hinter Eisengittern, Ketten, Spinnweben, Schädel und Seelenlaternen.',
    facets: { kategorie: ['interieur'], stil: ['mittelalterlich'], biom: ['hoehle', 'ueberall'], funktion: ['verteidigung', 'deko'] }, tips: [ROOM] },
  { id: 'bld_raum_wintergarten', name: 'Wintergarten', payload: wintergarten, tags: ['glas', 'pflanzen', 'sofa'],
    description: 'Glasraum mit Birkenpfosten, blühenden Azaleen in den Ecken, Topfpflanzen, Sofa und Beistelltisch mit Tulpe.',
    facets: { kategorie: ['interieur'], stil: ['klassisch', 'modern'], biom: ['ueberall'], funktion: ['wohnen', 'erholung'] }, tips: [ROOM] },
  { id: 'bld_raum_gaestezimmer', name: 'Gästezimmer', payload: gaestezimmer, tags: ['zwei betten', 'birke', 'raum'],
    description: 'Helles Gästezimmer mit zwei Betten, Nachttisch, Schrank und Truhe.',
    facets: { kategorie: ['interieur'], stil: ['klassisch'], biom: ['ueberall'], funktion: ['wohnen', 'einrichtung'] }, tips: [ROOM] },
  { id: 'bld_raum_waffenkammer', name: 'Waffenkammer', payload: waffenkammer, tags: ['rüstung', 'schmiede', 'burg'],
    description: 'Waffenkammer mit Schleifstein, Schmiedetisch, Amboss, Schmelzofen, Bannern, Trophäenschädeln und Zielblock.',
    facets: { kategorie: ['interieur'], stil: ['mittelalterlich'], biom: ['ueberall'], funktion: ['handwerk', 'verteidigung'] }, tips: [ROOM] },
];
