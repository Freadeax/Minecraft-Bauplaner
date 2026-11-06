import { Plot, axis, bed, chest, door, facing, grass, gableRoofX, lantern, leaves, lectern, mushroom, noise, roundTree, slab, stairs, water, campfire, candle, banner, F, T } from '../plot.js';
import type { H, Props } from '../plot.js';
import { hangingLamp } from '../furnish.js';
import { WIKI } from '../spec.js';
import type { BuildingSpec } from '../spec.js';
import { buttress, facade } from '../facade.js';
import type { Mix } from '../style.js';

/**
 * Fantasy (Katalog v3): Drachen, Elfen, Kristalle, Feen und Hexen. Eigene
 * Entwürfe aus Vanilla-Blöcken; Portalruinen ohne echtes Portal, Wasser als
 * deklarierte Lücke.
 */

const brewing = (): Props => ({ has_bottle_0: T, has_bottle_1: F, has_bottle_2: T });
/** Glow lichen lying on the block below (or hanging under the block above with `up`). */
const lichen = (side: 'down' | 'up' = 'down'): Props => ({ down: side === 'down' ? T : F, east: F, north: F, south: F, up: side === 'up' ? T : F, waterlogged: F, west: F });
const cluster = (f: 'up' | 'down' | H = 'up'): Props => ({ facing: f, waterlogged: F });
/** Horizontal direction pointing from the centre to (x,z). */
function outward(cx: number, cz: number, x: number, z: number): H {
  const dx = x - cx, dz = z - cz;
  return Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'east' : 'west') : (dz > 0 ? 'south' : 'north');
}
const dist2 = (x: number, z: number, cx: number, cz: number) => (x - cx) ** 2 + (z - cz) ** 2;

function drachenstatue() {
  const p = new Plot([17, 18, 15]);
  p.fill(1, 0, 1, 15, 0, 13, 'polished_blackstone_bricks');
  p.fill(2, 1, 2, 14, 1, 12, 'polished_blackstone');
  for (let x = 1; x <= 15; x++) { p.set(x, 1, 1, 'polished_blackstone_brick_stairs', stairs('south')); p.set(x, 1, 13, 'polished_blackstone_brick_stairs', stairs('north')); }
  for (let z = 2; z <= 12; z++) { p.set(1, 1, z, 'polished_blackstone_brick_stairs', stairs('east')); p.set(15, 1, z, 'polished_blackstone_brick_stairs', stairs('west')); }
  // body, haunches and legs
  p.blob(8, 4, 7, 2.5, 2, 3.5, 'blackstone', {}, false, (_x, y) => y >= 2);
  p.blob(5, 3, 9, 1.5, 1.2, 2, 'blackstone', {}, false, (_x, y) => y >= 2); p.blob(11, 3, 9, 1.5, 1.2, 2, 'blackstone', {}, false, (_x, y) => y >= 2);
  p.fill(5, 2, 4, 6, 3, 5, 'blackstone'); p.fill(10, 2, 4, 11, 3, 5, 'blackstone');
  for (const x of [5, 6, 10, 11]) p.set(x, 2, 3, 'blackstone_stairs', stairs('south'));
  // neck rising to the north and the head
  const neck: readonly [number, number, number][] = [[5, 3, 5], [6, 3, 4], [7, 2, 4], [8, 2, 3], [9, 1, 3], [10, 1, 3]];
  for (const [y, z0, z1] of neck) p.fill(7, y, z0, 9, y, z1, 'blackstone');
  p.fill(7, 11, 1, 9, 12, 3, 'blackstone'); p.fill(7, 11, 0, 9, 11, 0, 'polished_blackstone');
  for (let x = 7; x <= 9; x++) p.set(x, 12, 0, 'blackstone_stairs', stairs('south'));
  p.set(7, 12, 2, 'shroomlight'); p.set(9, 12, 2, 'shroomlight');
  for (const x of [7, 9]) { p.set(x, 13, 3, 'blackstone_wall'); p.set(x, 14, 3, 'blackstone_wall'); }
  // wings: spar of polished blackstone, membrane of deepslate tiles
  for (let i = 0; i <= 4; i++) {
    const top = 7 + Math.round(i * 1.5), bottom = top - (4 - Math.floor(i / 2));
    for (const x of [4 - i, 12 + i]) {
      p.fill(x, bottom, 6, x, top - 1, 6, 'deepslate_tiles');
      if (i <= 1) p.fill(x, bottom + 1, 7, x, top - 1, 7, 'deepslate_tiles');
      p.set(x, top, 6, 'polished_blackstone');
    }
  }
  p.set(0, 14, 6, 'blackstone_wall'); p.set(16, 14, 6, 'blackstone_wall');
  // spine spikes and tail curling around the pedestal
  for (let z = 4; z <= 10; z += 2) { let y = 12; while (y > 2 && !p.get(8, y, z)) y--; p.set(8, y + 1, z, 'blackstone_wall'); }
  for (const [x, z] of [[8, 11], [8, 12], [9, 12], [10, 12], [11, 12], [12, 11], [13, 11], [13, 10], [14, 9]] as const) p.set(x, 2, z, 'blackstone');
  p.set(8, 3, 11, 'blackstone'); p.set(14, 3, 9, 'blackstone_wall');
  for (const [x, z] of [[2, 2], [14, 2], [2, 12], [14, 12]] as const) p.set(x, 2, z, 'soul_lantern', lantern());
  return p.payload();
}

function elfenbaumhaus() {
  const p = new Plot([26, 26, 15]);
  // main tree (3×3 birch trunk) with ground, platform, round house and crown
  p.disc(5, 7, 0, 5, 'grass_block', grass()); p.disc(20, 7, 0, 3, 'grass_block', grass());
  p.disc(5, 7, 9, 5, 'birch_planks'); p.disc(5, 7, 10, 5, 'birch_fence', {}, true);
  p.tube(5, 7, 3, 10, 12, 'birch_planks');
  for (const [x, z] of [[2, 7], [8, 7], [5, 4]] as const) p.set(x, 11, z, 'glass_pane');
  p.disc(5, 7, 13, 4, 'green_terracotta'); p.disc(5, 7, 14, 3, 'green_terracotta'); p.disc(5, 7, 15, 2, 'green_terracotta');
  p.blob(5, 19, 7, 6, 4, 6, 'flowering_azalea_leaves', leaves(), false, (x, y, z) => noise(x, y, z) < 0.35);
  p.blob(5, 19, 7, 6, 4, 6, 'azalea_leaves', leaves());
  p.fill(4, 0, 6, 6, 20, 8, 'birch_log', axis('y'));
  for (const [x, z] of [[3, 7], [7, 7], [5, 5], [5, 9]] as const) p.set(x, 0, z, 'birch_wood', axis('y'));
  for (let y = 1; y <= 10; y++) p.set(5, y, 9, 'ladder', { facing: 'south', waterlogged: F });
  door(p, 5, 10, 10, 'birch', 'south');
  bed(p, 3, 10, 8, 'white', 'north'); p.set(7, 10, 8, 'chest', chest('west')); p.set(7, 10, 6, 'lectern', lectern('west'));
  p.set(3, 10, 6, 'potted_azalea_bush'); p.set(3, 12, 7, 'lantern', lantern(true)); p.set(7, 12, 7, 'lantern', lantern(true));
  for (const [x, z] of [[2, 4], [8, 10], [1, 8]] as const) p.set(x, 8, z, 'lantern', lantern(true));
  // second tree with lookout platform
  p.disc(20, 7, 9, 3, 'birch_planks'); p.disc(20, 7, 10, 3, 'birch_fence', {}, true);
  p.blob(20, 15, 7, 4, 3, 4, 'birch_leaves', leaves());
  p.fill(20, 0, 7, 20, 16, 7, 'birch_log', axis('y'));
  for (const [x, z, a] of [[19, 7, 'x'], [21, 7, 'x'], [20, 6, 'z'], [20, 8, 'z']] as const) p.set(x, 8, z, 'stripped_birch_log', axis(a));
  p.set(21, 10, 8, 'birch_stairs', stairs('south')); p.set(19, 10, 8, 'birch_stairs', stairs('south'));
  p.set(22, 11, 9, 'lantern', lantern());
  // sagging rope bridge between the platforms
  for (const [x, y, s] of [[11, 9, 'p'], [12, 9, 's'], [13, 8, 'p'], [14, 8, 'p'], [15, 9, 's'], [16, 9, 'p']] as const) {
    for (let z = 6; z <= 8; z++) s === 'p' ? p.set(x, y, z, 'birch_planks') : p.set(x, y, z, 'birch_slab', slab());
    p.set(x, y + 1, 6, 'birch_fence'); p.set(x, y + 1, 8, 'birch_fence');
  }
  p.set(13, 10, 6, 'lantern', lantern()); p.set(14, 10, 8, 'lantern', lantern());
  for (const x of [10, 17]) p.air(x, 10, 7);
  return p.payload();
}

function kristallturm() {
  const p = new Plot([13, 27, 13]);
  p.disc(6, 6, 0, 6, 'smooth_basalt'); p.disc(6, 6, 0, 5, 'calcite'); p.disc(6, 6, 1, 4, 'calcite');
  p.tube(6, 6, 3, 1, 14, 'amethyst_block');
  for (const y of [5, 10]) p.disc(6, 6, y, 2, 'calcite');
  for (const y of [3, 7, 12]) for (const [x, z] of [[3, 6], [9, 6], [6, 9]] as const) p.set(x, y, z, 'purple_stained_glass');
  door(p, 6, 1, 9, 'dark_oak', 'south');
  for (let y = 1; y <= 14; y++) p.set(6, y, 4, 'ladder', { facing: 'south', waterlogged: F });
  // spire of amethyst and tinted glass
  p.disc(6, 6, 15, 3, 'amethyst_block');
  for (let y = 16; y <= 23; y++) {
    const r = y < 18 ? 2 : y < 21 ? 1 : 0;
    p.disc(6, 6, y, r, 'amethyst_block');
    for (let x = 6 - r; x <= 6 + r; x++) for (let z = 6 - r; z <= 6 + r; z++) if (p.get(x, y, z) && (x + y + z) % 3 === 0) p.set(x, y, z, 'tinted_glass');
  }
  p.set(6, 24, 6, 'amethyst_cluster', cluster());
  for (const [x, z] of [[6, 3], [6, 9], [3, 6], [9, 6]] as const) p.set(x, 16, z, 'amethyst_cluster', cluster());
  // crystal shards around the base
  for (const [x, z, h] of [[1, 5, 3], [10, 2, 2], [2, 10, 2], [11, 8, 2], [8, 11, 1]] as const) {
    p.fill(x, 1, z, x, h, z, 'amethyst_block'); p.set(x, h + 1, z, 'amethyst_cluster', cluster());
  }
  // rooms: crystal hall, alchemy, sleeping chamber
  p.set(4, 1, 6, 'amethyst_cluster', cluster()); p.set(8, 1, 6, 'brewing_stand', brewing()); p.set(8, 1, 7, 'chest', chest('west'));
  p.set(5, 4, 6, 'lantern', lantern(true)); p.set(7, 9, 6, 'lantern', lantern(true)); p.set(5, 14, 6, 'lantern', lantern(true));
  p.set(4, 6, 6, 'bookshelf'); p.set(4, 6, 7, 'bookshelf'); p.set(8, 6, 6, 'cauldron'); p.set(7, 6, 8, 'lectern', lectern('north'));
  bed(p, 4, 11, 7, 'purple', 'north'); p.set(8, 11, 6, 'tinted_glass'); p.set(8, 12, 6, 'end_rod', facing('up'));
  return p.payload();
}

function feenring() {
  const p = new Plot([13, 6, 13]);
  p.disc(6, 6, 0, 6, 'grass_block', grass());
  const caps: readonly [number, number][] = [[6, 1], [11, 6], [6, 11], [1, 6]];
  for (const [cx, cz] of caps) {
    p.fill(cx, 1, cz, cx, 2, cz, 'mushroom_stem', mushroom());
    p.fill(cx - 1, 3, cz - 1, cx + 1, 3, cz + 1, 'red_mushroom_block', mushroom()); p.set(cx, 4, cz, 'red_mushroom_block', mushroom());
    for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]] as const) p.set(cx + dx, 2, cz + dz, 'glow_lichen', lichen('up'));
  }
  for (let x = 0; x <= 12; x++) for (let z = 0; z <= 12; z++) {
    if (!p.get(x, 0, z) || p.get(x, 1, z)) continue;
    const d = Math.sqrt(dist2(x, z, 6, 6));
    if (d >= 4.3 && d <= 5.3) { p.set(x, 0, z, 'mycelium', { snowy: 'false' }); p.set(x, 1, z, (x + z) % 2 ? 'red_mushroom' : 'brown_mushroom'); } // Pilze halten im Licht nur auf Myzel/Podsol
    else if (d >= 2.5 && d < 4.3 && noise(x, 1, z) < 0.45) p.set(x, 1, z, 'glow_lichen', lichen());
  }
  p.set(6, 1, 6, 'flowering_azalea');
  for (const [x, z] of [[5, 6], [7, 6], [6, 5], [6, 7]] as const) p.set(x, 1, z, 'pink_tulip');
  for (const [x, z, id] of [[5, 5, 'lily_of_the_valley'], [7, 7, 'lily_of_the_valley'], [5, 7, 'allium'], [7, 5, 'allium']] as const) p.set(x, 1, z, id);
  return p.payload();
}

function portalruine() {
  const p = new Plot([11, 9, 9]);
  for (let x = 0; x <= 10; x++) for (let z = 0; z <= 8; z++) {
    if (dist2(x, z, 5, 4) > 30 + noise(x, 0, z) * 8) continue;
    const n = noise(x, 1, z), d = dist2(x, z, 5, 4);
    p.set(x, 0, z, d < 12 && n < 0.55 ? 'netherrack' : n < 0.12 ? 'magma_block' : n < 0.5 ? 'blackstone' : 'cobblestone');
  }
  p.fill(2, 1, 3, 8, 1, 5, 'polished_blackstone_bricks');
  for (let x = 2; x <= 8; x++) { p.set(x, 1, 2, 'polished_blackstone_brick_stairs', stairs('south')); p.set(x, 1, 6, 'polished_blackstone_brick_stairs', stairs('north')); }
  // broken frame: obsidian with weeping obsidian, upper right corner fallen
  for (let x = 3; x <= 7; x++) for (let y = 2; y <= 7; y++) {
    const frame = x === 3 || x === 7 || y === 2 || y === 7;
    if (!frame) { p.air(x, y, 4); continue; }
    if ((x >= 6 && y === 7) || (x === 7 && y >= 6)) continue;
    p.set(x, y, 4, noise(x, y, 4) < 0.4 ? 'crying_obsidian' : 'obsidian');
  }
  p.set(8, 1, 7, 'obsidian'); p.set(9, 1, 6, 'crying_obsidian'); p.set(7, 2, 5, 'obsidian'); p.set(1, 1, 2, 'crying_obsidian');
  p.set(2, 2, 4, 'iron_bars'); p.set(2, 2, 3, 'gold_block'); p.set(8, 2, 3, 'chest', chest('west'));
  p.set(8, 2, 5, 'lantern', lantern()); p.set(4, 2, 5, 'polished_blackstone_brick_slab', slab());
  return p.payload();
}

function hexenhuette() {
  const p = new Plot([13, 15, 13]);
  p.disc(6, 6, 0, 6, 'mud'); p.disc(6, 6, 1, 6, 'mud'); p.disc(6, 6, 1, 5, 'water', water()); // Schlammufer hält den Teich
  for (const [x, z] of [[2, 10], [1, 9], [2, 9], [10, 2], [11, 3]] as const) { p.set(x, 1, z, 'grass_block', grass()); p.set(x, 2, z, 'blue_orchid'); }
  for (const [x, z] of [[2, 3], [8, 10], [11, 7], [1, 5]] as const) p.set(x, 2, z, 'lily_pad');
  // stilts and floor with porch
  for (const [x, z] of [[3, 2], [9, 2], [3, 9], [9, 9], [6, 2]] as const) p.fill(x, 0, z, x, 3, z, 'mangrove_log', axis('y'));
  p.fill(3, 4, 2, 9, 4, 9, 'spruce_planks');
  for (let y = 1; y <= 4; y++) p.set(6, y, 1, 'ladder', { facing: 'north', waterlogged: F });
  p.room(3, 4, 9, 9, 5, 7, 'dark_oak_planks');
  for (const [x, z] of [[3, 4], [9, 4], [3, 9], [9, 9]] as const) p.fill(x, 5, z, x, 7, z, 'mangrove_log', axis('y'));
  for (let x = 3; x <= 9; x++) if (x !== 6) p.set(x, 5, 2, 'spruce_fence');
  p.set(3, 5, 3, 'spruce_fence'); p.set(9, 5, 3, 'spruce_fence'); p.set(3, 6, 2, 'lantern', lantern());
  door(p, 6, 5, 4, 'dark_oak', 'north');
  for (const [x, z] of [[3, 6], [9, 6], [6, 9]] as const) p.set(x, 6, z, 'glass_pane');
  // crooked roof, attic ceiling and mossy chimney
  gableRoofX(p, 3, 9, 3, 10, 8, 'dark_oak_stairs', 'dark_oak_planks', 'dark_oak_slab');
  p.fill(4, 8, 4, 8, 8, 9, 'dark_oak_planks');
  for (let y = 5; y <= 12; y++) p.set(9, y, 8, y % 3 ? 'mossy_cobblestone' : 'cobblestone');
  p.set(9, 13, 8, 'campfire', campfire('north'));
  // interior
  bed(p, 4, 5, 5, 'purple', 'south'); p.set(5, 5, 8, 'cauldron'); p.set(7, 5, 8, 'brewing_stand', brewing());
  p.set(8, 5, 6, 'barrel', { facing: 'up', open: F }); p.set(8, 6, 6, 'candle', candle(3, true));
  p.set(8, 5, 5, 'potted_red_mushroom'); p.set(4, 5, 8, 'crafting_table'); p.set(4, 6, 8, 'potted_brown_mushroom');
  p.set(6, 7, 6, 'lantern', lantern(true));
  return p.payload();
}

function schwebendeInsel() {
  const p = new Plot([16, 20, 15]);
  const cx = 6, cz = 7;
  for (let y = 5; y <= 12; y++) {
    const r = 1 + (y - 5) * 0.75;
    for (let x = 0; x <= 13; x++) for (let z = 0; z <= 14; z++) {
      if (Math.sqrt(dist2(x, z, cx, cz)) > r + 0.4 - noise(x, y, z) * 0.9) continue;
      const depth = 12 - y, n = noise(x, y + 7, z);
      p.set(x, y, z, depth === 0 ? 'grass_block' : depth <= 2 ? 'dirt' : n < 0.3 ? 'andesite' : n < 0.4 ? 'tuff' : 'stone', depth === 0 ? grass() : {});
    }
  }
  // spring and waterfall into a small pool on the ground
  for (let x = 9; x <= 12; x++) p.set(x, 12, cz, 'water', water());
  p.fill(13, 1, cz, 13, 12, cz, 'water', water());
  p.ring(11, 5, 15, 9, 0, 'mossy_cobblestone'); p.fill(12, 0, 6, 14, 0, 8, 'water', water());
  p.set(11, 1, 5, 'moss_carpet'); p.set(15, 1, 9, 'moss_carpet');
  // tree, lamp and flowers on top
  roundTree(p, 4, 13, 5, 'oak', 5, 2.5);
  p.fill(8, 13, 10, 8, 14, 10, 'spruce_fence'); p.set(8, 15, 10, 'lantern', lantern());
  p.set(5, 13, 10, 'spruce_stairs', stairs('north')); p.set(6, 13, 10, 'spruce_stairs', stairs('north'));
  const flowers = ['poppy', 'dandelion', 'allium', 'oxeye_daisy', 'cornflower'];
  for (let x = 0; x <= 13; x++) for (let z = 0; z <= 14; z++)
    if (p.get(x, 12, z)?.id === 'minecraft:grass_block' && !p.has(x, 13, z) && noise(x, 13, z) < 0.2) p.set(x, 13, z, flowers[(x + z) % flowers.length]!);
  return p.payload();
}

function maerchenturm() {
  const p = new Plot([13, 31, 13]);
  p.disc(6, 6, 0, 5, 'stone_bricks');
  p.tube(6, 6, 4, 1, 18, 'calcite'); p.tube(6, 6, 4, 1, 2, 'stone_bricks');
  for (const y of [9, 18]) p.disc(6, 6, y, 4, 'polished_diorite', {}, true);
  for (const y of [7, 13]) p.disc(6, 6, y, 3, 'spruce_planks');
  for (const y of [4, 10, 16]) for (const [x, z] of [[2, 6], [10, 6]] as const) p.set(x, y, z, 'glass_pane');
  p.set(6, 4, 10, 'glass_pane'); p.set(6, 10, 10, 'glass_pane');
  door(p, 6, 1, 10, 'spruce', 'south');
  for (let y = 1; y <= 13; y++) p.set(6, y, 3, 'ladder', { facing: 'south', waterlogged: F });
  // balcony with corbels at the top floor
  for (let x = 0; x <= 12; x++) for (let z = 0; z <= 12; z++) {
    const d = dist2(x, z, 6, 6);
    if (d > 16 + 3.2 && d <= 36 + 4.8) { p.set(x, 13, z, 'spruce_planks'); p.set(x, 12, z, 'stone_brick_stairs', stairs(outward(6, 6, x, z) === 'north' ? 'south' : outward(6, 6, x, z) === 'south' ? 'north' : outward(6, 6, x, z) === 'east' ? 'west' : 'east', 'top')); }
  }
  p.disc(6, 6, 14, 6, 'spruce_fence', {}, true);
  door(p, 6, 14, 10, 'spruce', 'south');
  // conical blue roof with banner
  for (let k = 0; k <= 9; k++) p.disc(6, 6, 19 + k, 5 - k * 0.5, 'blue_terracotta');
  p.set(6, 29, 6, 'gold_block'); p.set(6, 30, 6, 'yellow_banner', banner(0));
  // rooms
  p.set(3, 1, 6, 'barrel', { facing: 'up', open: F }); p.set(9, 1, 6, 'chest', chest('west')); p.set(6, 6, 6, 'lantern', lantern(true));
  for (const [x, z] of [[3, 5], [3, 7], [9, 5], [9, 7]] as const) p.set(x, 8, z, 'bookshelf');
  p.set(6, 8, 8, 'lectern', lectern('south')); p.set(6, 12, 6, 'lantern', lantern(true));
  bed(p, 4, 14, 7, 'pink', 'north'); p.set(8, 14, 6, 'chest', chest('west')); p.set(8, 14, 8, 'potted_allium');
  for (let x = 4; x <= 8; x++) for (let z = 4; z <= 8; z++) if (!p.has(x, 14, z) && dist2(x, z, 6, 6) <= 5) p.set(x, 14, z, 'pink_carpet');
  hangingLamp(p, 6, 19, 6, 1);
  return p.payload();
}

function magierakademie() {
  const p = new Plot([22, 25, 13]);
  p.fill(0, 0, 1, 16, 0, 11, 'deepslate_bricks');
  p.room(0, 1, 16, 11, 1, 9, 'deepslate_bricks');
  for (const x of [0, 5, 11, 16]) for (const z of [1, 11]) p.fill(x, 1, z, x, 9, z, 'polished_deepslate');
  p.fill(1, 5, 2, 15, 5, 10, 'dark_oak_planks'); p.ring(0, 1, 16, 11, 5, 'polished_deepslate');
  for (const z of [1, 11]) for (const x of [2, 3, 7, 9, 13, 14]) {
    if (!(z === 11 && x === 8)) { p.fill(x, 2, z, x, 3, z, 'purple_stained_glass_pane'); p.fill(x, 6, z, x, 8, z, 'purple_stained_glass_pane'); }
  }
  p.fill(8, 6, 1, 8, 8, 1, 'purple_stained_glass_pane'); p.fill(8, 6, 11, 8, 8, 11, 'purple_stained_glass_pane');
  door(p, 8, 1, 11, 'dark_oak', 'south'); p.set(8, 0, 12, 'deepslate_brick_stairs', stairs('north'));
  p.set(7, 3, 12, 'soul_lantern', lantern()); p.fill(7, 1, 12, 7, 2, 12, 'deepslate_brick_wall');
  p.set(9, 3, 12, 'soul_lantern', lantern()); p.fill(9, 1, 12, 9, 2, 12, 'deepslate_brick_wall');
  // staircase to the upper floor
  for (let i = 0; i < 4; i++) { if (i > 0) p.fill(11 + i, 1, 2, 11 + i, i, 2, 'deepslate_bricks'); p.set(11 + i, 1 + i, 2, 'dark_oak_stairs', stairs('east')); }
  // lecture hall: teacher's lectern, desks and chairs, bookshelves
  p.set(5, 1, 3, 'lectern', lectern('south')); p.fill(1, 1, 2, 1, 4, 10, 'bookshelf');
  for (const z of [6, 8]) for (const x of [3, 4, 5, 6, 7, 9, 10, 11, 12]) { p.set(x, 1, z, 'dark_oak_slab', slab('top')); p.set(x, 1, z + 1, 'dark_oak_stairs', stairs('south')); }
  for (const [x, z] of [[4, 5], [12, 5], [8, 9]] as const) hangingLamp(p, x, 5, z, 0);
  // upper floor: alchemy laboratory and library
  for (const x of [2, 3, 4]) p.set(x, 6, 2, 'dark_oak_slab', slab('top'));
  for (const x of [2, 4]) p.set(x, 7, 2, 'brewing_stand', brewing());
  p.set(5, 6, 2, 'cauldron'); p.set(6, 6, 2, 'barrel', { facing: 'up', open: F }); p.set(7, 6, 2, 'chest', chest('south'));
  p.fill(15, 6, 4, 15, 8, 10, 'bookshelf'); p.fill(1, 6, 3, 1, 8, 10, 'bookshelf');
  p.set(8, 6, 6, 'enchanting_table'); p.set(10, 6, 8, 'lectern', lectern('west'));
  for (const x of [3, 4, 5]) p.set(x, 6, 7, 'purple_carpet');
  for (const [x, z] of [[4, 6], [12, 6], [8, 9]] as const) p.set(x, 9, z, 'lantern', lantern(true));
  gableRoofX(p, 0, 16, 0, 12, 10, 'deepslate_tile_stairs', 'deepslate_bricks', 'deepslate_tile_slab');
  p.fill(1, 10, 2, 15, 10, 10, 'dark_oak_planks');
  // corner turret with purple cone
  p.tube(18, 6, 2, 0, 17, 'deepslate_bricks'); p.disc(18, 6, 0, 1, 'deepslate_bricks'); p.disc(18, 6, 5, 1, 'dark_oak_planks');
  for (const y of [1, 2, 6, 7]) p.air(16, y, 6);
  for (let y = 1; y <= 16; y++) p.set(19, y, 6, 'ladder', { facing: 'west', waterlogged: F });
  for (const y of [4, 9, 13]) { p.set(18, y, 4, 'purple_stained_glass'); p.set(18, y, 8, 'purple_stained_glass'); }
  for (let k = 0; k <= 5; k++) p.disc(18, 6, 18 + k, 3 - k * 0.5, 'purple_terracotta');
  p.set(18, 24, 6, 'end_rod', facing('up'));
  // LIB-05: Strebepfeiler zwischen den Fensterachsen, Gurtgesims, Sockel (Plan um zwei Blöcke tiefer).
  const q = p.moved(0, 0, 2, [22, 25, 17]), r = { x0: 0, z0: 3, x1: 16, z1: 13 };
  const deep: Mix = [['deepslate_bricks', 6], ['cracked_deepslate_bricks', 2], ['polished_deepslate', 2]];
  for (const x of [5, 11]) { buttress(q, x, 3, 'north', 1, 8, deep, 'deepslate_brick_stairs'); buttress(q, x, 13, 'south', 1, 8, deep, 'deepslate_brick_stairs'); }
  facade(q, { pilaster: 'polished_deepslate', band: 'deepslate_brick_stairs', bandSlab: 'deepslate_brick_slab', plinth: 'polished_deepslate_stairs' },
    { at: r, y0: 1, y1: 9, bands: [5], crown: null, pilasters: 'none', plinth: true, sides: ['north', 'south', 'west'] });
  return q.payload();
}

function schaedelhoehle() {
  const p = new Plot([15, 13, 16]);
  for (let x = 0; x <= 14; x++) for (let z = 0; z <= 15; z++) { const n = noise(x, 0, z); p.set(x, 0, z, n < 0.3 ? 'gravel' : n < 0.6 ? 'coarse_dirt' : 'dirt'); }
  const cx = 7, cz = 8;
  const inside = (x: number, y: number, z: number, rh: number, rv: number) => ((x - cx) / rh) ** 2 + (Math.max(y - 4, 0) / rv) ** 2 + ((z - cz) / rh) ** 2 <= 1;
  for (let x = 0; x <= 14; x++) for (let y = 1; y <= 10; y++) for (let z = 0; z <= 15; z++) {
    if (inside(x, y, z, 5, 4.5)) p.air(x, y, z);
    else if (inside(x, y, z, 6.5, 5.5)) p.set(x, y, z, 'bone_block', axis('y'));
  }
  // eye sockets with soul light, nose and mouth with teeth
  for (const ex of [4, 10]) for (let x = ex - 1; x <= ex + 1; x++) for (let y = 6; y <= 7; y++) for (let z = 11; z <= 15; z++) if (p.get(x, y, z)) p.air(x, y, z);
  for (const ex of [4, 10]) { p.set(ex, 5, 11, 'blackstone'); p.set(ex, 6, 11, 'soul_lantern', lantern()); }
  for (const [x, y] of [[7, 5], [6, 4], [7, 4], [8, 4]] as const) for (let z = 12; z <= 15; z++) if (p.get(x, y, z)) p.air(x, y, z);
  for (let x = 4; x <= 10; x++) for (let y = 1; y <= 3; y++) for (let z = 10; z <= 15; z++) if (p.get(x, y, z)) p.air(x, y, z);
  for (let x = 4; x <= 10; x += 2) { let z = 15; while (z > 10 && !p.get(x, 4, z)) z--; p.set(x, 3, z, 'bone_block', axis('y')); }
  for (const x of [3, 11]) { let z = 15; while (z > 10 && !p.get(x, 2, z)) z--; if (z < 15) p.set(x, 1, z + 1, 'bone_block', axis('y')); }
  // moss and cracks on the crown
  for (let x = 0; x <= 14; x++) for (let y = 7; y <= 10; y++) for (let z = 0; z <= 15; z++)
    if (p.get(x, y, z)?.id === 'minecraft:bone_block' && !p.get(x, y + 1, z) && noise(x, y, z) < 0.18) p.set(x, y, z, 'moss_block');
  // the cave inside
  for (let x = 4; x <= 10; x++) for (let z = 5; z <= 13; z++) if (!p.get(x, 1, z) && noise(x, 2, z) < 0.25) p.set(x, 1, z, 'moss_carpet');
  p.set(7, 1, 4, 'chest', chest('south')); p.set(6, 1, 4, 'skeleton_skull', { powered: F, rotation: '0' });
  p.set(8, 1, 4, 'candle', candle(2, true)); p.set(4, 1, 6, 'soul_lantern', lantern()); p.set(10, 1, 6, 'soul_lantern', lantern());
  p.set(7, 7, 8, 'cobweb'); p.set(5, 6, 5, 'cobweb');
  p.set(7, 7, 6, 'iron_chain', { axis: 'y', waterlogged: F }); p.set(7, 6, 6, 'soul_lantern', lantern(true));
  return p.payload();
}

export const FANTASY_SPECS: readonly BuildingSpec[] = [
  { id: 'bld_fantasy_drachenstatue', name: 'Drachenstatue', payload: drachenstatue, tags: ['drache', 'flügel', 'sockel'],
    description: 'Sitzender Drache aus Schwarzstein mit ausgebreiteten Flügeln, Rückenstacheln, leuchtenden Augen und um den Sockel gelegtem Schwanz.',
    facets: { kategorie: ['statue'], stil: ['fantasy'], biom: ['ueberall', 'gebirge'], funktion: ['deko', 'orientierung'] },
    tips: ['Flügel zuerst als Kante aus poliertem Schwarzstein setzen, dann die Haut aus Tiefenschieferfliesen darunter auffüllen.'] },
  { id: 'bld_fantasy_elfenbaumhaus', name: 'Elfen-Baumhaus', payload: elfenbaumhaus, tags: ['elfen', 'hängebrücke', 'riesenbaum'],
    description: 'Rundes Birkenhaus auf einer Plattform im Riesenbaum mit Azaleenkrone, Leiter im Stamm und Hängebrücke zu einem Aussichtsbaum.',
    facets: { kategorie: ['wohnhaus'], stil: ['fantasy'], biom: ['wald', 'kirschhain'], funktion: ['wohnen', 'aussicht', 'verbindung'] },
    tips: ['Die Brücke hängt durch: Bretter außen, Stufen dazwischen, in der Mitte eine Ebene tiefer.'] },
  { id: 'bld_fantasy_kristallturm', name: 'Kristallturm', payload: kristallturm, tags: ['amethyst', 'kristall', 'turm'],
    description: 'Runder Amethystturm auf Calcit- und Basaltsockel mit lila Fenstern, Brau- und Schlafraum und einer Spitze aus Amethyst und getöntem Glas.',
    facets: { kategorie: ['magie'], stil: ['fantasy'], biom: ['gebirge', 'hoehle', 'ueberall'], funktion: ['wohnen', 'aussicht', 'deko'] },
    tips: ['Getöntes Glas lässt kein Licht durch – die Spitze wirkt dunkel funkelnd, der Raum darunter bleibt dunkel.'],
    inspiration: [WIKI('Amethyst_Geode', 'Amethystgeode')] },
  { id: 'bld_fantasy_feenring', name: 'Feenring', payload: feenring, tags: ['pilze', 'glühflechte', 'kreis'],
    description: 'Kreis aus roten und braunen Pilzen mit vier kleinen Riesenpilzen, Glühflechte am Boden und blühender Azalee mit Blüten in der Mitte.',
    facets: { kategorie: ['dekoration'], stil: ['fantasy'], biom: ['wald', 'pilzinsel', 'kirschhain'], funktion: ['deko', 'beleuchtung'] },
    tips: ['Glühflechte gibt Lichtstufe 7 – genug für Stimmung, aber nicht genug gegen Monster.'],
    inspiration: [WIKI('Glow_Lichen', 'Leuchtflechte')] },
  { id: 'bld_fantasy_portalruine', name: 'Portalruine mit weinendem Obsidian', payload: portalruine, tags: ['ruine', 'obsidian', 'nether'],
    description: 'Zerbrochener Portalrahmen aus Obsidian und weinendem Obsidian auf Schwarzstein-Stufen, mit Netherrack, Magmablöcken, Goldblock und Truhe.',
    facets: { kategorie: ['dekoration'], stil: ['fantasy', 'nether'], biom: ['ueberall', 'ebene', 'wald'], funktion: ['deko'] },
    tips: ['Weinender Obsidian zählt nicht als Portalrahmen – die Ruine lässt sich so nicht entzünden.'],
    inspiration: [WIKI('Ruined_Portal', 'Portalruine'), WIKI('Crying_Obsidian', 'Weinender Obsidian')] },
  { id: 'bld_fantasy_hexenhuette', name: 'Hexenhütte am Sumpf', payload: hexenhuette, tags: ['hexe', 'stelzen', 'kessel'],
    description: 'Hütte auf Mangrovenstelzen über dem Sumpfwasser mit Veranda, Leiter, schiefem Dach, bemoostem Kamin, Kessel und Braustand.',
    facets: { kategorie: ['wohnhaus'], stil: ['fantasy', 'rustikal'], biom: ['sumpf'], funktion: ['wohnen', 'handwerk'] }, gaps: ['minecraft:water'],
    inspiration: [WIKI('Swamp_Hut', 'Sumpfhütte')] },
  { id: 'bld_fantasy_schwebende_insel', name: 'Schwebende Insel', payload: schwebendeInsel, tags: ['insel', 'wasserfall', 'schwebend'],
    description: 'Kegelförmige Insel aus Stein und Erde mit Baum, Blumen, Laterne und einer Quelle, die als Wasserfall in ein Becken am Boden fällt.',
    facets: { kategorie: ['landschaft'], stil: ['fantasy'], biom: ['ueberall', 'gebirge'], funktion: ['deko', 'aussicht'] }, gaps: ['minecraft:water'],
    tips: ['Unterseite von der Spitze her nach oben bauen und mit Gerüst abstützen, danach das Gerüst abbauen.'] },
  { id: 'bld_fantasy_maerchenturm', name: 'Märchenschloss-Turm', payload: maerchenturm, tags: ['märchen', 'kegeldach', 'balkon'],
    description: 'Weißer Rundturm aus Calcit mit umlaufendem Balkon auf Konsolen, Bibliothek, Turmzimmer und spitzem blauem Kegeldach mit Banner.',
    facets: { kategorie: ['wahrzeichen'], stil: ['fantasy', 'mittelalterlich'], biom: ['ebene', 'wald', 'kirschhain'], funktion: ['wohnen', 'aussicht'] } },
  { id: 'bld_fantasy_magierakademie', name: 'Magierakademie-Flügel', payload: magierakademie, tags: ['akademie', 'hörsaal', 'alchemie'],
    description: 'Zweistöckiger Tiefenschiefer-Flügel mit Hörsaal (Pulte, Lesepult, Bücherwand), Alchemielabor mit Braustand und Rundturm mit lila Kegeldach.',
    facets: { kategorie: ['magie'], stil: ['fantasy', 'mittelalterlich'], biom: ['ueberall'], funktion: ['bildung', 'verzaubern', 'versammlung'] },
    inspiration: [WIKI('Brewing', 'Brauen')] },
  { id: 'bld_fantasy_schaedelhoehle', name: 'Riesenschädel-Höhleneingang', payload: schaedelhoehle, tags: ['schädel', 'knochen', 'höhle'],
    description: 'Riesiger Schädel aus Knochenblöcken mit Seelenlaternen in den Augenhöhlen, Zahnreihe am Maul und einer Höhle mit Truhe im Inneren.',
    facets: { kategorie: ['wahrzeichen'], stil: ['fantasy'], biom: ['badlands', 'wueste', 'hoehle'], funktion: ['deko', 'orientierung', 'lagern'] },
    tips: ['Knochenblöcke gibt es aus je neun Knochenmehl – eine Skelettfarm oder Fossilien in der Wüste liefern genug.'] },
];
