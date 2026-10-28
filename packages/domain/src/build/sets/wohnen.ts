import { Plot, axis, barrel, bed, chest, door, facing, flatRoof, furnace, gableRoof, gableRoofX, grass, hipRoof, ladder, lantern, leaves, mushroom, slab, stairs, trapdoor, water, campfire, F, T } from '../plot.js';
import { WIKI, WOOD_PALETTES } from '../spec.js';
import type { BuildingSpec, WoodPalette } from '../spec.js';

/** Wohnen: a starter house in eight woods plus houses for every biome and style. */

const pane = { east: F, north: F, south: F, waterlogged: F, west: F };

/** 7×7 starter house: one room, bed, chest, crafting table, furnace, gable roof. */
function starterhaus(w: WoodPalette) {
  return () => {
    const k = w.key, p = new Plot([7, 8, 7]);
    p.fill(0, 0, 0, 6, 0, 6, w.accent); p.fill(1, 0, 1, 5, 0, 5, `${k}_planks`);
    p.room(0, 0, 6, 6, 1, 3, `${k}_planks`);
    for (const [x, z] of [[0, 0], [6, 0], [0, 6], [6, 6]] as const) p.fill(x, 1, z, x, 3, z, w.log, axis('y'));
    door(p, 3, 1, 0, k, 'south');
    for (const [x, z] of [[0, 3], [6, 3], [3, 6]] as const) p.set(x, 2, z, 'glass_pane', pane);
    gableRoof(p, 0, 6, 0, 6, 4, `${k}_stairs`, `${k}_planks`, `${k}_slab`);
    bed(p, 1, 1, 4, w.bed, 'south'); p.set(1, 1, 1, 'crafting_table'); p.set(5, 1, 1, 'furnace', furnace('south'));
    p.set(5, 1, 5, 'chest', chest('north')); p.set(4, 1, 5, 'chest', chest('north'));
    p.set(3, 3, 3, 'lantern', lantern(true));
    return p.payload();
  };
}

function stadthaus() {
  const p = new Plot([7, 14, 9]);
  p.fill(0, 0, 0, 6, 0, 8, 'stone_bricks');
  p.room(0, 0, 6, 8, 1, 4, 'bricks'); p.room(0, 0, 6, 8, 5, 8, 'white_terracotta');
  for (let y = 1; y <= 8; y++) for (const [x, z] of [[0, 0], [6, 0], [0, 8], [6, 8]] as const) p.set(x, y, z, 'dark_oak_log', axis('y'));
  p.fill(1, 5, 1, 5, 5, 7, 'dark_oak_planks'); p.fill(0, 5, 0, 6, 5, 0, 'dark_oak_log', axis('x')); p.fill(0, 5, 8, 6, 5, 8, 'dark_oak_log', axis('x'));
  door(p, 3, 1, 0, 'dark_oak', 'south');
  for (const x of [1, 5]) { p.set(x, 2, 0, 'glass_pane', pane); p.set(x, 6, 0, 'glass_pane', pane); p.set(x, 7, 0, 'glass_pane', pane); p.set(x, 2, 8, 'glass_pane', pane); }
  p.set(3, 6, 0, 'glass_pane', pane); p.set(3, 7, 0, 'glass_pane', pane);
  gableRoof(p, 0, 6, 0, 8, 9, 'deepslate_tile_stairs', 'white_terracotta', 'deepslate_tile_slab');
  p.fill(5, 9, 6, 5, 12, 6, 'bricks'); p.set(5, 13, 6, 'campfire', campfire('north'));
  p.fill(1, 1, 7, 1, 5, 7, 'ladder', ladder('north'));
  p.set(1, 5, 7, 'ladder', ladder('north'));
  p.set(5, 1, 7, 'furnace', furnace('north')); p.set(4, 1, 7, 'crafting_table'); p.set(5, 1, 1, 'barrel', barrel('up'));
  bed(p, 4, 6, 6, 'red', 'north'); p.set(2, 6, 7, 'chest', chest('south')); p.set(3, 4, 4, 'lantern', lantern(true)); p.set(3, 8, 4, 'lantern', lantern(true));
  p.set(2, 1, 1, 'flower_pot');
  return p.payload();
}

function bauernhaus() {
  const p = new Plot([11, 10, 8]);
  p.fill(0, 0, 0, 10, 0, 7, 'cobblestone'); p.fill(1, 0, 1, 9, 0, 6, 'spruce_planks');
  p.room(0, 0, 10, 7, 1, 3, 'cobblestone'); p.room(0, 0, 10, 7, 2, 3, 'spruce_planks');
  for (const [x, z] of [[0, 0], [10, 0], [0, 7], [10, 7], [5, 0], [5, 7]] as const) p.fill(x, 1, z, x, 3, z, 'oak_log', axis('y'));
  door(p, 3, 1, 0, 'spruce', 'south');
  for (const x of [2, 7, 8]) p.set(x, 2, 0, 'glass_pane', pane);
  for (const x of [2, 4, 7]) p.set(x, 2, 7, 'glass_pane', pane);
  gableRoofX(p, 0, 10, 0, 7, 4, 'spruce_stairs', 'oak_planks', null);
  p.fill(6, 1, 1, 6, 3, 6, 'spruce_planks'); p.fill(6, 1, 3, 6, 2, 3, null);
  bed(p, 9, 1, 5, 'yellow', 'north'); p.set(7, 1, 6, 'chest', chest('north')); p.set(1, 1, 6, 'furnace', furnace('north')); p.set(2, 1, 6, 'smoker', furnace('north'));
  p.set(4, 1, 6, 'crafting_table'); p.set(1, 1, 1, 'barrel', barrel('up')); p.set(2, 1, 1, 'composter');
  p.set(3, 3, 3, 'lantern', lantern(true)); p.set(8, 3, 3, 'lantern', lantern(true));
  return p.payload();
}

function fischerhuette() {
  const p = new Plot([7, 8, 9]);
  for (const [x, z] of [[0, 0], [6, 0], [0, 8], [6, 8], [0, 4], [6, 4]] as const) p.fill(x, 0, z, x, 1, z, 'stripped_spruce_log', axis('y'));
  p.fill(0, 2, 0, 6, 2, 8, 'spruce_planks');
  p.room(1, 3, 5, 8, 3, 5, 'spruce_planks');
  for (const [x, z] of [[1, 3], [5, 3], [1, 8], [5, 8]] as const) p.fill(x, 3, z, x, 5, z, 'spruce_log', axis('y'));
  door(p, 3, 3, 3, 'spruce', 'south'); p.set(1, 4, 5, 'glass_pane', pane); p.set(5, 4, 6, 'glass_pane', pane);
  gableRoof(p, 1, 5, 3, 8, 6, 'dark_oak_stairs', 'spruce_planks', 'dark_oak_slab');
  for (let x = 0; x <= 6; x++) if (x !== 3) p.set(x, 3, 0, 'spruce_fence');
  p.set(0, 3, 1, 'spruce_fence'); p.set(6, 3, 1, 'spruce_fence');
  p.set(1, 3, 1, 'barrel', barrel('up')); p.set(5, 3, 1, 'lantern', lantern());
  p.set(2, 3, 7, 'barrel', barrel('north')); bed(p, 4, 3, 7, 'light_blue', 'west'); p.set(4, 5, 5, 'lantern', lantern(true));
  return p.payload();
}

function erdhaus() {
  const p = new Plot([11, 6, 9]);
  p.blob(5, 0, 4, 5, 4, 4, 'grass_block', grass(), false, (_x, y) => y >= 0);
  p.blob(5, 0, 4, 3.6, 2.6, 2.6, 'dirt', {}, true, (_x, y) => y >= 0 && y < 3);
  p.fill(2, 0, 2, 8, 0, 6, 'oak_planks'); p.fill(2, 1, 2, 8, 2, 6, null); p.fill(3, 3, 3, 7, 3, 5, null);
  p.fill(4, 1, 0, 6, 2, 1, null); p.fill(4, 0, 0, 6, 0, 1, 'oak_planks');
  p.disc(5, 1, 1, 1, null);
  door(p, 5, 1, 1, 'oak', 'south'); p.set(4, 1, 1, 'oak_log', axis('y')); p.set(6, 1, 1, 'oak_log', axis('y')); p.set(4, 2, 1, 'oak_log', axis('y')); p.set(6, 2, 1, 'oak_log', axis('y'));
  p.fill(4, 3, 1, 6, 3, 1, 'oak_log', axis('x'));
  p.set(3, 2, 1, 'glass'); p.set(7, 2, 1, 'glass');
  bed(p, 7, 1, 5, 'green', 'west'); p.set(3, 1, 6, 'crafting_table'); p.set(4, 1, 6, 'furnace', furnace('north')); p.set(3, 1, 3, 'chest', chest('east'));
  p.set(5, 3, 4, 'lantern', lantern(true));
  p.set(2, 4, 4, 'oxeye_daisy'); p.set(8, 3, 5, 'poppy');
  return p.payload();
}

function japanhaus() {
  const p = new Plot([11, 9, 9]);
  p.fill(0, 0, 0, 10, 0, 8, 'stone_bricks'); p.fill(1, 1, 1, 9, 1, 7, 'spruce_planks');
  for (let x = 0; x <= 10; x++) { p.set(x, 1, 0, 'spruce_slab', slab('top')); p.set(x, 1, 8, 'spruce_slab', slab('top')); }
  p.room(2, 2, 8, 6, 2, 4, 'white_wool');
  for (let y = 2; y <= 4; y++) for (const x of [2, 4, 6, 8]) { p.set(x, y, 2, 'dark_oak_log', axis('y')); p.set(x, y, 6, 'dark_oak_log', axis('y')); }
  for (let y = 2; y <= 4; y++) { p.set(2, y, 4, 'dark_oak_log', axis('y')); p.set(8, y, 4, 'dark_oak_log', axis('y')); }
  p.fill(5, 2, 2, 5, 3, 2, null);
  for (const x of [3, 7]) p.set(x, 3, 2, 'spruce_trapdoor', trapdoor('south', 'bottom', true));
  hipRoof(p, 0, 10, 0, 8, 5, 'dark_oak_stairs', 'dark_oak_slab');
  for (const [x, z] of [[0, 0], [10, 0], [0, 8], [10, 8]] as const) p.set(x, 4, z, 'dark_oak_stairs', stairs(z === 0 ? 'south' : 'north', 'top'));
  p.set(5, 4, 4, 'lantern', lantern(true)); p.set(4, 2, 5, 'white_carpet'); p.set(6, 2, 5, 'white_carpet');
  bed(p, 7, 2, 3, 'white', 'south'); p.set(3, 2, 5, 'barrel', barrel('up')); p.set(3, 2, 3, 'potted_bamboo');
  p.set(5, 1, 0, 'spruce_stairs', stairs('south'));
  return p.payload();
}

function rundhuette() {
  const p = new Plot([9, 9, 9]);
  p.disc(4, 4, 0, 4, 'packed_mud'); p.tube(4, 4, 4, 1, 3, 'mud_bricks');
  for (let y = 1; y <= 3; y++) for (const [x, z] of [[0, 4], [8, 4], [4, 8]] as const) p.set(x, y, z, 'stripped_acacia_log', axis('y'));
  p.fill(4, 1, 0, 4, 2, 0, null); door(p, 4, 1, 0, 'acacia', 'south');
  p.set(1, 2, 2, 'glass_pane', pane); p.set(7, 2, 6, 'glass_pane', pane);
  for (let i = 0; i <= 4; i++) p.disc(4, 4, 4 + i, 4.6 - i, 'hay_block', axis('y'), i < 4);
  p.set(4, 9, 4, 'acacia_fence');
  bed(p, 6, 1, 3, 'orange', 'south'); p.set(2, 1, 5, 'barrel', barrel('up')); p.set(2, 1, 3, 'crafting_table'); p.set(4, 3, 4, 'lantern', lantern(true));
  return p.payload();
}

function chalet() {
  const p = new Plot([11, 13, 10]);
  p.fill(0, 0, 0, 10, 0, 9, 'stone_bricks'); p.room(1, 1, 9, 9, 1, 2, 'cobblestone'); p.fill(2, 1, 2, 8, 1, 8, null);
  p.fill(1, 3, 1, 9, 3, 9, 'spruce_planks'); p.room(1, 1, 9, 9, 4, 6, 'spruce_planks');
  for (const [x, z] of [[1, 1], [9, 1], [1, 9], [9, 9]] as const) p.fill(x, 1, z, x, 6, z, 'spruce_log', axis('y'));
  p.fill(0, 3, 0, 10, 3, 0, 'spruce_slab', slab('top'));
  for (let x = 0; x <= 10; x++) p.set(x, 4, 0, 'spruce_fence');
  door(p, 5, 1, 1, 'spruce', 'south'); door(p, 5, 4, 1, 'spruce', 'south');
  for (const x of [3, 7]) { p.set(x, 2, 1, 'glass_pane', pane); p.set(x, 5, 1, 'glass_pane', pane); p.set(x, 5, 9, 'glass_pane', pane); }
  gableRoof(p, 0, 10, 0, 9, 7, 'spruce_stairs', 'spruce_planks', 'spruce_slab');
  p.fill(5, 9, 1, 5, 10, 1, 'glass_pane'); p.fill(2, 1, 8, 2, 12, 8, 'cobblestone'); p.set(2, 2, 7, 'campfire', campfire('south'));
  bed(p, 7, 4, 7, 'red', 'north'); bed(p, 3, 4, 7, 'red', 'north'); p.set(8, 1, 7, 'chest', chest('west')); p.set(8, 1, 6, 'furnace', furnace('west'));
  p.fill(8, 1, 3, 8, 3, 3, 'ladder', ladder('west'));
  p.set(5, 3, 5, 'lantern', lantern(true)); p.set(5, 6, 5, 'lantern', lantern(true));
  return p.payload();
}

function langhaus() {
  const p = new Plot([9, 9, 17]);
  p.fill(0, 0, 0, 8, 0, 16, 'cobblestone'); p.fill(1, 0, 1, 7, 0, 15, 'spruce_planks');
  p.room(1, 0, 7, 16, 1, 2, 'spruce_log', axis('z'));
  for (let z = 0; z <= 16; z += 4) { p.fill(1, 1, z, 1, 3, z, 'stripped_spruce_log', axis('y')); p.fill(7, 1, z, 7, 3, z, 'stripped_spruce_log', axis('y')); }
  p.fill(2, 1, 0, 6, 2, 0, 'spruce_planks'); p.fill(2, 1, 16, 6, 2, 16, 'spruce_planks');
  door(p, 4, 1, 0, 'spruce', 'south');
  gableRoof(p, 0, 8, 0, 16, 3, 'dark_oak_stairs', 'spruce_planks', 'dark_oak_slab');
  for (const z of [0, 16]) { p.set(0, 3, z, 'dark_oak_fence'); p.set(8, 3, z, 'dark_oak_fence'); p.set(4, 8, z, 'dark_oak_fence'); }
  p.fill(4, 0, 6, 4, 0, 10, 'cobblestone'); p.set(4, 1, 8, 'campfire', campfire('north'));
  for (const z of [3, 5, 11, 13]) bed(p, 2, 1, z, 'brown', 'west');
  for (const z of [3, 13]) bed(p, 6, 1, z, 'brown', 'east');
  p.set(6, 1, 15, 'chest', chest('north')); p.set(5, 1, 15, 'chest', chest('north')); p.set(2, 1, 15, 'barrel', barrel('up')); p.set(3, 1, 15, 'smithing_table');
  for (const z of [4, 12]) p.set(4, 4, z, 'lantern', lantern(true));
  return p.payload();
}

function jurte() {
  const p = new Plot([9, 7, 9]);
  p.disc(4, 4, 0, 4, 'spruce_planks'); p.tube(4, 4, 4, 1, 2, 'white_wool');
  for (let i = 0; i < 3; i++) p.disc(4, 4, 3 + i, 4 - i * 1.3, i === 2 ? 'light_gray_wool' : 'white_wool', {}, i < 2);
  p.disc(4, 4, 3, 3, null); p.set(4, 5, 4, 'glass'); p.set(4, 6, 4, 'spruce_slab', slab());
  for (let y = 1; y <= 2; y++) { p.set(4, y, 0, 'red_wool'); }
  p.air(4, 1, 0); p.air(4, 2, 0);
  for (const [x, z] of [[0, 4], [8, 4], [4, 8]] as const) p.set(x, 2, z, 'red_wool');
  p.set(4, 1, 4, 'campfire', campfire('north')); p.set(4, 0, 4, 'cobblestone');
  bed(p, 7, 1, 3, 'white', 'south'); p.set(1, 1, 3, 'chest', chest('east')); p.set(1, 1, 5, 'loom', facing('east'));
  for (const [x, z] of [[2, 6], [6, 6]] as const) p.set(x, 1, z, 'red_carpet');
  return p.payload();
}

function strandhaus() {
  const p = new Plot([11, 9, 9]);
  p.fill(0, 0, 0, 10, 0, 8, 'sand');
  for (const [x, z] of [[1, 1], [9, 1], [1, 7], [9, 7], [5, 1], [5, 7]] as const) p.fill(x, 1, z, x, 1, z, 'stripped_birch_log', axis('y'));
  p.fill(1, 2, 1, 9, 2, 7, 'birch_planks');
  p.room(2, 3, 8, 7, 3, 5, 'birch_planks');
  for (const [x, z] of [[2, 3], [8, 3], [2, 7], [8, 7]] as const) p.fill(x, 3, z, x, 5, z, 'stripped_birch_log', axis('y'));
  for (const x of [3, 4, 6, 7]) p.set(x, 4, 3, 'glass_pane', pane);
  door(p, 5, 3, 3, 'birch', 'south');
  for (let x = 1; x <= 9; x++) p.set(x, 3, 1, 'birch_fence');
  p.set(1, 3, 2, 'birch_fence'); p.set(9, 3, 2, 'birch_fence'); p.air(5, 3, 1);
  for (let x = 4; x <= 6; x++) p.set(x, 1, 0, 'birch_stairs', stairs('south'));
  hipRoof(p, 1, 9, 2, 8, 6, 'birch_stairs', 'light_blue_concrete', false);
  bed(p, 7, 3, 6, 'light_blue', 'west'); p.set(3, 3, 6, 'chest', chest('east')); p.set(4, 3, 6, 'barrel', barrel('up')); p.set(5, 5, 5, 'lantern', lantern(true));
  p.set(0, 1, 7, 'dead_bush');
  return p.payload();
}

function wuerfelhaus() {
  const p = new Plot([9, 10, 9]);
  p.fill(0, 0, 0, 8, 0, 8, 'smooth_stone');
  p.room(0, 0, 8, 8, 1, 3, 'white_concrete'); p.room(1, 1, 6, 6, 4, 7, 'gray_concrete');
  p.fill(1, 4, 1, 7, 4, 7, 'white_concrete'); p.fill(2, 4, 2, 5, 4, 5, 'white_concrete');
  for (let x = 1; x <= 7; x++) for (let y = 1; y <= 3; y++) if (x !== 4) p.set(x, y, 0, 'glass_pane', { ...pane, east: T, west: T });
  door(p, 4, 1, 0, 'iron', 'south');
  for (let z = 2; z <= 5; z++) for (let y = 5; y <= 6; y++) p.set(6, y, z, 'glass_pane', { ...pane, north: T, south: T });
  flatRoof(p, 0, 8, 0, 8, 4, 'white_concrete', null); p.fill(1, 4, 1, 6, 4, 6, 'gray_concrete');
  flatRoof(p, 1, 6, 1, 6, 8, 'white_concrete', null);
  for (let x = 0; x <= 8; x++) p.set(x, 5, 8, 'glass_pane');
  p.set(7, 5, 7, 'glass_pane');
  p.set(7, 5, 0, 'glass_pane'); p.set(8, 5, 0, 'glass_pane'); for (let z = 1; z <= 6; z++) p.set(8, 5, z, 'glass_pane');
  bed(p, 3, 5, 3, 'black', 'south'); p.set(5, 1, 7, 'crafting_table'); p.set(6, 1, 7, 'smoker', furnace('north')); p.set(7, 1, 7, 'chest', chest('north'));
  p.fill(1, 1, 7, 1, 4, 7, 'ladder', ladder('north'));
  p.set(4, 3, 4, 'sea_lantern'); p.air(4, 4, 4); p.set(4, 4, 4, 'glass');
  return p.payload();
}

function stelzenhaus() {
  const p = new Plot([9, 11, 9]);
  for (let x = 0; x <= 8; x++) for (let z = 0; z <= 8; z++) p.set(x, 0, z, 'mud');
  for (const [x, z] of [[1, 1], [7, 1], [1, 7], [7, 7]] as const) p.fill(x, 0, z, x, 4, z, 'mangrove_log', axis('y'));
  for (const [x, z] of [[2, 3], [4, 0], [6, 5]] as const) p.set(x, 1, z, 'water', water());
  p.fill(0, 4, 0, 8, 4, 8, 'mangrove_planks');
  p.room(1, 1, 7, 7, 5, 7, 'mangrove_planks');
  for (const [x, z] of [[1, 1], [7, 1], [1, 7], [7, 7]] as const) p.fill(x, 5, z, x, 7, z, 'mangrove_log', axis('y'));
  door(p, 4, 5, 1, 'mangrove', 'south'); p.set(1, 6, 4, 'glass_pane', pane); p.set(7, 6, 4, 'glass_pane', pane);
  gableRoof(p, 0, 8, 0, 8, 8, 'mangrove_stairs', 'mangrove_planks', 'mangrove_slab');
  p.fill(4, 1, 0, 4, 3, 0, 'ladder', ladder('north'));
  for (let x = 0; x <= 8; x++) if (x !== 4) p.set(x, 5, 0, 'mangrove_fence');
  bed(p, 5, 5, 5, 'green', 'south'); p.set(2, 5, 6, 'chest', chest('east')); p.set(2, 5, 2, 'crafting_table'); p.set(4, 7, 4, 'lantern', lantern(true));
  return p.payload();
}

function pilzhaus() {
  const p = new Plot([11, 13, 11]);
  p.fill(0, 0, 0, 10, 0, 10, 'mycelium', grass());
  p.tube(5, 5, 3, 1, 6, 'mushroom_stem', mushroom());
  p.fill(5, 1, 2, 5, 2, 2, null); door(p, 5, 1, 2, 'crimson', 'south');
  p.set(3, 3, 3, 'glass'); p.set(7, 3, 7, 'glass'); p.fill(2, 4, 2, 8, 4, 8, 'mushroom_stem', mushroom()); p.fill(3, 4, 3, 7, 4, 7, 'oak_planks');
  for (let i = 0; i < 4; i++) p.disc(5, 5, 7 + i, 5 - i * 1.1, 'red_mushroom_block', mushroom(), i < 3);
  p.disc(5, 5, 7, 4, null);
  for (const [x, y, z] of [[2, 9, 5], [6, 10, 3], [7, 8, 8], [4, 9, 8]] as const) p.set(x, y, z, 'white_concrete');
  p.fill(7, 1, 5, 7, 6, 5, 'ladder', ladder('west'));
  bed(p, 3, 5, 5, 'red', 'south'); p.set(5, 1, 7, 'crafting_table'); p.set(4, 1, 7, 'chest', chest('north')); p.set(5, 3, 5, 'shroomlight');
  p.set(1, 1, 8, 'red_mushroom'); p.set(9, 1, 2, 'brown_mushroom');
  return p.payload();
}

function lehmhaus() {
  const p = new Plot([9, 8, 9]);
  p.fill(0, 0, 0, 8, 0, 8, 'packed_mud'); p.room(0, 0, 8, 8, 1, 3, 'mud_bricks');
  for (const x of [0, 8]) for (const z of [0, 8]) p.fill(x, 1, z, x, 4, z, 'stripped_acacia_log', axis('y'));
  door(p, 4, 1, 0, 'acacia', 'south'); for (const x of [2, 6]) p.set(x, 2, 0, 'acacia_trapdoor', trapdoor('south', 'bottom', true));
  flatRoof(p, 0, 8, 0, 8, 4, 'mud_bricks', null); for (let x = 0; x <= 8; x++) for (const z of [0, 8]) if (x % 2 === 0) p.set(x, 5, z, 'mud_brick_wall');
  for (let z = 1; z <= 7; z++) for (const x of [0, 8]) if (z % 2 === 0) p.set(x, 5, z, 'mud_brick_wall');
  for (let x = 1; x <= 3; x++) for (let z = 5; z <= 7; z++) p.set(x, 5, z, 'acacia_slab', slab());
  p.fill(7, 1, 7, 7, 4, 7, 'ladder', ladder('north'));
  bed(p, 2, 1, 6, 'orange', 'north'); p.set(6, 1, 1, 'barrel', barrel('up')); p.set(1, 1, 1, 'decorated_pot'); p.set(4, 3, 4, 'lantern', lantern(true));
  p.set(5, 5, 2, 'potted_cactus');
  return p.payload();
}

function hausboot() {
  const p = new Plot([7, 8, 14]);
  for (let z = 0; z < 14; z++) {
    const w = z < 2 ? 1 : z > 11 ? 2 : 3;
    for (let x = 3 - w; x <= 3 + w; x++) { p.set(x, 0, z, 'spruce_planks'); if (x === 3 - w || x === 3 + w || z === 0 || z === 13) p.set(x, 1, z, 'spruce_planks'); }
    p.fill(3 - w + 1, 1, z, 3 + w - 1, 1, z, 'spruce_slab', slab('top'));
    if (z !== 0 && z !== 13) for (let x = 3 - w + 1; x <= 3 + w - 1; x++) p.set(x, 1, z, 'spruce_slab', slab('top'));
  }
  p.room(1, 4, 5, 10, 2, 3, 'oak_planks');
  for (const [x, z] of [[1, 4], [5, 4], [1, 10], [5, 10]] as const) p.fill(x, 2, z, x, 3, z, 'oak_log', axis('y'));
  door(p, 3, 2, 4, 'oak', 'south'); p.set(1, 3, 7, 'glass_pane', pane); p.set(5, 3, 7, 'glass_pane', pane);
  gableRoof(p, 0, 6, 4, 10, 4, 'dark_oak_stairs', 'oak_planks', 'dark_oak_slab');
  bed(p, 4, 2, 8, 'cyan', 'south'); p.set(2, 2, 9, 'barrel', barrel('up')); p.set(2, 2, 6, 'chest', chest('east')); p.set(3, 3, 7, 'lantern', lantern(true));
  p.set(3, 2, 1, 'lantern', lantern()); p.set(3, 2, 12, 'spruce_fence'); p.set(3, 3, 12, 'lantern', lantern());
  return p.payload();
}

function baumhausGross() {
  const p = new Plot([13, 18, 13]);
  p.fill(5, 0, 5, 7, 0, 7, 'grass_block', grass());
  p.fill(6, 1, 6, 6, 13, 6, 'dark_oak_log', axis('y')); p.fill(5, 1, 6, 5, 3, 6, 'dark_oak_log', axis('y')); p.fill(7, 1, 6, 7, 3, 6, 'dark_oak_log', axis('y'));
  p.disc(6, 6, 6, 5, 'dark_oak_planks'); p.set(6, 6, 6, 'dark_oak_log', axis('y'));
  p.disc(6, 6, 7, 5, 'dark_oak_fence', {}, true);
  p.room(3, 3, 9, 9, 7, 9, 'spruce_planks'); p.fill(6, 7, 6, 6, 9, 6, 'dark_oak_log', axis('y'));
  door(p, 6, 7, 3, 'spruce', 'south'); p.set(3, 8, 6, 'glass_pane', pane); p.set(9, 8, 6, 'glass_pane', pane); p.set(6, 8, 9, 'glass_pane', pane);
  hipRoof(p, 2, 10, 2, 10, 10, 'spruce_stairs', 'spruce_slab');
  p.blob(6, 15, 6, 5, 2.5, 5, 'dark_oak_leaves', leaves()); p.fill(6, 10, 6, 6, 14, 6, 'dark_oak_log', axis('y'));
  p.fill(6, 1, 7, 6, 5, 7, 'ladder', ladder('south'));
  bed(p, 8, 7, 5, 'lime', 'south'); p.set(4, 7, 8, 'chest', chest('east')); p.set(4, 7, 4, 'crafting_table'); p.set(5, 9, 5, 'lantern', lantern(true));
  for (const [x, z] of [[1, 6], [11, 6]] as const) p.set(x, 7, z, 'lantern', lantern());
  return p.payload();
}

const STARTER: BuildingSpec[] = WOOD_PALETTES.map(w => ({
  id: `bld_starterhaus_${w.key}`, name: `Starterhaus (${w.label})`, payload: starterhaus(w), tags: ['erste-nacht', 'klein', 'starter'],
  description: `Kompaktes 7×7-Haus aus ${w.label} für die erste Nacht: Bett, Werkbank, Ofen, zwei Truhen und Satteldach.`,
  facets: { kategorie: ['wohnhaus'], stil: ['rustikal'], biom: [...w.biome], funktion: ['wohnen', 'lagern'] },
  family: { id: 'starterhaus', label: 'Starterhaus', variant: w.label },
  tips: ['Zuerst Boden und Eckpfosten setzen, dann Wände Reihe für Reihe – das Dach zuletzt.', 'Ein Bett setzt den Spawnpunkt; Fackeln außen verhindern Monster vor der Tür.'],
}));

export const WOHNEN_SPECS: readonly BuildingSpec[] = [
  ...STARTER,
  { id: 'bld_stadthaus', name: 'Stadthaus', payload: stadthaus, tags: ['stadt', 'zweistöckig', 'schmal'],
    description: 'Schmales Stadthaus: Ziegel im Erdgeschoss, Fachwerk darüber, steiles Schieferdach mit Schornstein.',
    facets: { kategorie: ['wohnhaus'], stil: ['mittelalterlich', 'klassisch'], biom: ['ebene', 'ueberall'], funktion: ['wohnen', 'lagern'] },
    tips: ['Mehrere Stadthäuser Wand an Wand ergeben eine Häuserzeile – Breite 7 passt auf ein Gassenraster.'] },
  { id: 'bld_bauernhaus', name: 'Bauernhaus', payload: bauernhaus, tags: ['hof', 'küche', 'lang'],
    description: 'Langes Bauernhaus mit Bruchsteinsockel, Küche mit Räucherofen und Komposter, Schlafkammer.',
    facets: { kategorie: ['wohnhaus'], stil: ['rustikal'], biom: ['ebene', 'savanne'], funktion: ['wohnen', 'landwirtschaft'] } },
  { id: 'bld_fischerhuette', name: 'Fischerhütte', payload: fischerhuette, tags: ['pfahlbau', 'steg', 'angeln'],
    description: 'Hütte auf Pfählen mit Veranda zum Wasser, Fass für den Fang und Laterne am Geländer.',
    facets: { kategorie: ['wohnhaus'], stil: ['kuestenstil', 'rustikal'], biom: ['kueste', 'sumpf'], funktion: ['wohnen'] } },
  { id: 'bld_erdhaus', name: 'Erdhaus', payload: erdhaus, tags: ['hobbit', 'hügel', 'versteckt'],
    description: 'In einen Grashügel gebautes Wohnhaus mit Rundtür-Rahmen aus Stämmen und Fenstern im Hang.',
    facets: { kategorie: ['wohnhaus'], stil: ['fantasy', 'rustikal'], biom: ['ebene', 'wald'], funktion: ['wohnen'] } },
  { id: 'bld_japanhaus', name: 'Japanisches Haus', payload: japanhaus, tags: ['japan', 'walmdach', 'veranda'],
    description: 'Haus auf Steinsockel mit Engawa-Veranda, Papierwänden aus weißer Wolle, Schwarzeichen-Rahmen und geschwungenem Walmdach.',
    facets: { kategorie: ['wohnhaus'], stil: ['fernoestlich'], biom: ['kirschhain', 'wald'], funktion: ['wohnen'] } },
  { id: 'bld_rundhuette', name: 'Rundhütte', payload: rundhuette, tags: ['rund', 'stroh', 'savanne'],
    description: 'Runde Lehmhütte mit Strohdach aus Heuballen und Akazienpfosten.',
    facets: { kategorie: ['wohnhaus'], stil: ['rustikal'], biom: ['savanne', 'wueste'], funktion: ['wohnen'] } },
  { id: 'bld_chalet', name: 'Berg-Chalet', payload: chalet, tags: ['alpen', 'balkon', 'kamin'],
    description: 'Zweistöckiges Chalet mit Steinsockel, umlaufendem Balkon, großem Giebelfenster und offenem Kamin.',
    facets: { kategorie: ['wohnhaus'], stil: ['nordisch', 'rustikal'], biom: ['gebirge', 'schnee', 'taiga'], funktion: ['wohnen', 'aussicht'] } },
  { id: 'bld_langhaus', name: 'Wikinger-Langhaus', payload: langhaus, tags: ['wikinger', 'halle', 'feuerstelle'],
    description: 'Langes Hallenhaus aus liegenden Fichtenstämmen mit zentraler Feuerstelle, sechs Betten und Drachen-Giebelpfosten.',
    facets: { kategorie: ['wohnhaus'], stil: ['nordisch'], biom: ['taiga', 'schnee', 'kueste'], funktion: ['wohnen', 'versammlung'] } },
  { id: 'bld_jurte', name: 'Jurte', payload: jurte, tags: ['zelt', 'rund', 'nomaden'],
    description: 'Runde Woll-Jurte mit Rauchöffnung, Feuerstelle, Webstuhl und Teppichen.',
    facets: { kategorie: ['wohnhaus'], stil: ['rustikal'], biom: ['ebene', 'savanne', 'schnee'], funktion: ['wohnen'] } },
  { id: 'bld_strandhaus', name: 'Strandhaus', payload: strandhaus, tags: ['strand', 'veranda', 'birke'],
    description: 'Helles Birkenhaus auf Stelzen über dem Sand, mit Veranda, Fensterfront und himmelblauem Dachfirst.',
    facets: { kategorie: ['wohnhaus'], stil: ['kuestenstil', 'modern'], biom: ['kueste'], funktion: ['wohnen', 'aussicht'] } },
  { id: 'bld_wuerfelhaus', name: 'Würfelhaus', payload: wuerfelhaus, tags: ['modern', 'glasfront', 'loft'],
    description: 'Zwei versetzte Betonwürfel mit Glasfront, Dachterrasse mit Glasgeländer und Seelaterne als Deckenlicht.',
    facets: { kategorie: ['wohnhaus'], stil: ['modern'], biom: ['ebene', 'ueberall'], funktion: ['wohnen', 'aussicht'] } },
  { id: 'bld_stelzenhaus', name: 'Mangroven-Stelzenhaus', payload: stelzenhaus, tags: ['sumpf', 'stelzen', 'leiter'],
    description: 'Mangrovenholzhaus auf hohen Stämmen über dem Schlamm, mit Leiter und Umgang.',
    facets: { kategorie: ['wohnhaus'], stil: ['rustikal', 'tropisch'], biom: ['sumpf'], funktion: ['wohnen'] }, gaps: ['minecraft:water'] },
  { id: 'bld_pilzhaus', name: 'Pilzhaus', payload: pilzhaus, tags: ['pilz', 'märchen', 'rund'],
    description: 'Märchenhaus im Riesenpilz: Stiel als Wohnturm, roter Hut mit weißen Punkten als Dach, Pilzlicht innen.',
    facets: { kategorie: ['wohnhaus'], stil: ['fantasy'], biom: ['pilzinsel', 'sumpf', 'wald'], funktion: ['wohnen'] } },
  { id: 'bld_lehmhaus', name: 'Lehmhaus', payload: lehmhaus, tags: ['lehm', 'flachdach', 'dachterrasse'],
    description: 'Lehmziegelhaus mit Flachdach, Zinnenmauer, Sitzplatz auf dem Dach und Klappläden.',
    facets: { kategorie: ['wohnhaus'], stil: ['wuestenstil'], biom: ['wueste', 'savanne', 'badlands'], funktion: ['wohnen'] } },
  { id: 'bld_hausboot', name: 'Hausboot', payload: hausboot, tags: ['boot', 'schwimmend', 'fluss'],
    description: 'Flaches Hausboot mit spitzem Bug, Kajüte mit Bett und Truhe und Laternen an Bug und Heck.',
    facets: { kategorie: ['fahrzeug'], stil: ['kuestenstil', 'rustikal'], biom: ['kueste', 'ozean', 'sumpf'], funktion: ['wohnen'] },
    tips: ['Ins Wasser setzen: y 0 liegt auf der Wasseroberfläche.'] },
  { id: 'bld_baumhaus_gross', name: 'Großes Baumhaus', payload: baumhausGross, tags: ['baum', 'plattform', 'walmdach'],
    description: 'Haus auf einer runden Plattform in einer Schwarzeiche, mit Geländer, Leiter im Stamm und dichter Krone.',
    facets: { kategorie: ['wohnhaus'], stil: ['rustikal', 'fantasy'], biom: ['wald', 'dschungel'], funktion: ['wohnen', 'aussicht'] },
    inspiration: [WIKI('Dark_Forest', 'Dunkelwald')] },
];
