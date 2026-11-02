import { Plot, axis, banner, barrel, bed, chain, chest, door, facing, furnace, gableRoof, gableRoofX, grass, ladder, lampPost, lantern, lectern, leaves, rail, rod, roundTree, slab, stairs, trapdoor, water, F } from '../plot.js';
import type { H } from '../plot.js';
import { pot, bell, chair, cupboard, daylight, hangingLamp, longTable, rug, sofa, table, wallBanner } from '../furnish.js';
import { PATH_PROFILE, WIKI, joint } from '../spec.js';
import type { BuildingSpec } from '../spec.js';

/**
 * Stadt (Katalog v3): moderne Kleinstadt mit öffentlichen Gebäuden,
 * Wohnhäusern vom Reihenhaus bis zum Hochhaus, Läden und einem
 * Straßenbaukasten mit dem Wege-Anschluss `weg_4`. Alle Gebäude sind innen
 * grob eingerichtet; Etagen sind über Leitern verbunden.
 */

const BREW = { has_bottle_0: F, has_bottle_1: F, has_bottle_2: F };
const MIRROR: Readonly<Record<H, H>> = { east: 'west', west: 'east', north: 'north', south: 'south' };

/** Glass panes on a wall line along x (fixed z), rows y0..y1. */
function panesX(p: Plot, xs: readonly number[], z: number, y0: number, y1: number, id = 'glass_pane'): void {
  for (const x of xs) for (let y = y0; y <= y1; y++) p.set(x, y, z, id);
}
/** Glass panes on a wall line along z (fixed x), rows y0..y1. */
function panesZ(p: Plot, x: number, zs: readonly number[], y0: number, y1: number, id = 'glass_pane'): void {
  for (const z of zs) for (let y = y0; y <= y1; y++) p.set(x, y, z, id);
}
const span = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, i) => a + i);
/** Planter: moss block with a flowering azalea on top. */
function planter(p: Plot, x: number, y: number, z: number): void { p.set(x, y, z, 'moss_block'); p.set(x, y + 1, z, 'flowering_azalea'); }
/** Kitchen row: smoker, sink (cauldron) and a quartz worktop, from (x,z) in direction (dx,dz). */
function kitchen(p: Plot, x: number, y: number, z: number, dx: number, dz: number, front: H): void {
  p.set(x, y, z, 'smoker', furnace(front)); p.set(x + dx, y, z + dz, 'cauldron'); p.set(x + 2 * dx, y, z + 2 * dz, 'smooth_quartz_slab', slab('top'));
}
/** Modern street lamp: wall pole with an arm of top slabs and a hanging lantern over the road. */
function streetLamp(p: Plot, x: number, z: number, dz: 1 | -1): void {
  p.fill(x, 1, z, x, 5, z, 'andesite_wall');
  for (let i = 0; i <= 1; i++) p.set(x, 6, z + i * dz, 'polished_andesite_slab', slab('top'));
  p.set(x, 6, z + 2 * dz, 'polished_andesite'); // volle Unterseite: daran hält die Laterne
  p.set(x, 5, z + 2 * dz, 'lantern', lantern(true));
}

// ------------------------------------------------------------ Wohnen
function hochhaus() {
  const p = new Plot([11, 41, 13]);
  p.fill(0, 0, 0, 10, 0, 12, 'smooth_stone'); p.fill(4, 0, 0, 6, 0, 2, 'polished_andesite');
  const colX = [1, 5, 9], colZ = [3, 7, 11];
  const isCol = (x: number, z: number) => ((x === 1 || x === 9) && colZ.includes(z)) || ((z === 3 || z === 11) && colX.includes(x));
  const perimeter: [number, number][] = [];
  for (let x = 1; x <= 9; x++) perimeter.push([x, 3], [x, 11]);
  for (let z = 4; z <= 10; z++) perimeter.push([1, z], [9, z]);
  const beds = ['light_gray', 'blue', 'white', 'cyan', 'gray', 'light_blue', 'black'];
  for (let k = 0; k < 8; k++) {
    const y = 4 * k;
    p.fill(1, y, 3, 9, y, 11, k === 0 ? 'polished_diorite' : 'light_gray_concrete');
    p.room(1, 3, 9, 11, y + 1, y + 3, 'white_concrete');
    if (k > 0) p.ring(0, 2, 10, 12, y, 'smooth_quartz_slab', slab('top'));
    for (const [x, z] of perimeter) {
      if (isCol(x, z)) { p.fill(x, y + 1, z, x, y + 3, z, 'light_gray_concrete'); continue; }
      if (x === 9 && z === 10) continue; // wall behind the ladder shaft
      if (k === 0) p.fill(x, 1, z, x, 3, z, 'glass');
      else { p.set(x, y + 1, z, 'glass_pane'); p.set(x, y + 2, z, 'glass_pane'); }
    }
    if (k === 0) continue;
    // apartment: bed, kitchen, dining table, sofa corner
    bed(p, 2, y + 1, 9, beds[k - 1]!, 'south'); p.set(3, y + 1, 10, 'barrel', barrel('up')); p.set(3, y + 2, 10, 'lantern', lantern());
    kitchen(p, 2, y + 1, 4, 1, 0, 'south');
    table(p, 4, y + 1, 7, 'birch'); chair(p, 3, y + 1, 7, 'birch', 'west'); chair(p, 5, y + 1, 7, 'birch', 'east');
    sofa(p, 8, y + 1, 5, 'birch', 'east', 2, 'smooth_quartz'); table(p, 7, y + 1, 6, 'birch', 'carpet', 'light_gray');
    p.set(2, y + 1, 6, 'potted_fern');
    hangingLamp(p, 5, y + 4, 8, 0);
  }
  // lobby
  door(p, 5, 1, 3, 'birch', 'south');
  for (let x = 2; x <= 4; x++) p.set(x, 1, 6, 'smooth_quartz_slab', slab('top'));
  chair(p, 3, 1, 7, 'birch', 'south');
  for (const z of [9, 10]) { p.set(2, 1, z, 'barrel', barrel('east')); p.set(2, 2, z, 'barrel', barrel('east')); }
  sofa(p, 8, 1, 6, 'birch', 'east', 2, 'smooth_quartz');
  p.set(2, 1, 4, 'potted_flowering_azalea_bush'); p.set(8, 1, 4, 'potted_flowering_azalea_bush');
  hangingLamp(p, 5, 4, 8, 0);
  p.fill(3, 4, 0, 7, 4, 1, 'smooth_quartz_slab', slab('top')); // entrance canopy
  lampPost(p, 1, 1, 0, 'andesite_wall', 3); lampPost(p, 9, 1, 0, 'andesite_wall', 3);
  // roof terrace with stair house
  p.fill(1, 32, 3, 9, 32, 11, 'gray_concrete');
  p.ring(0, 2, 10, 12, 32, 'smooth_quartz_slab', slab('top'));
  p.ring(1, 3, 9, 11, 33, 'white_concrete'); p.ring(1, 3, 9, 11, 34, 'glass_pane');
  p.room(6, 8, 9, 11, 33, 35, 'light_gray_concrete'); p.fill(6, 36, 8, 9, 36, 11, 'smooth_stone_slab', slab());
  door(p, 6, 33, 9, 'birch', 'west');
  p.fill(8, 37, 10, 8, 39, 10, 'iron_bars'); p.set(8, 40, 10, 'lightning_rod', rod('up'));
  for (const [x, z] of [[1, 3], [9, 3], [1, 11]] as const) p.set(x, 34, z, 'lantern', lantern());
  planter(p, 2, 33, 4); planter(p, 3, 33, 4); planter(p, 2, 33, 10);
  table(p, 4, 33, 7, 'birch'); chair(p, 3, 33, 7, 'birch', 'west'); chair(p, 5, 33, 7, 'birch', 'east');
  for (let y = 1; y <= 33; y++) p.set(8, y, 10, 'ladder', ladder('west'));
  return p.payload();
}

/** One apartment of the block; `m` mirrors it to the east half. */
function apartment(p: Plot, m: boolean, y: number, k: number): void {
  const X = (l: number) => (m ? 15 - l : 1 + l), f = (d: H): H => (m ? MIRROR[d] : d), y1 = y + 1;
  panesX(p, [0, 1, 3, 4, 5].map(X), 2, y1, y + 2);
  door(p, X(2), y1, 2, 'spruce', 'north');
  panesX(p, [2, 3, 4].map(X), 10, y + 2, y + 2);
  panesZ(p, m ? 16 : 0, [4, 5, 6], y + 2, y + 2);
  bed(p, X(1), y1, 8, (m ? ['orange', 'yellow', 'lime'] : ['blue', 'purple', 'red'])[k]!, 'south');
  p.set(X(0), y1, 9, 'barrel', barrel('up')); p.set(X(0), y + 2, 9, 'lantern', lantern());
  cupboard(p, X(4), y1, 9, 'spruce', 'north', 2);
  kitchen(p, X(0), y1, 4, 0, 1, f('east'));
  table(p, X(2), y1, 5, 'spruce'); chair(p, X(2), y1, 6, 'spruce', 'south'); chair(p, X(1), y1, 5, 'spruce', f('west')); chair(p, X(3), y1, 5, 'spruce', f('east'));
  sofa(p, X(5), y1, m ? 6 : 5, 'spruce', f('east'), 2);
  table(p, X(4), y1, 6, 'spruce', 'carpet', 'light_gray');
  hangingLamp(p, X(3), y + 4, 7, 0);
  if (k > 0) { // balcony
    for (let l = 0; l <= 5; l++) for (const z of [0, 1]) p.set(X(l), y, z, 'smooth_quartz_slab', slab('top'));
    for (let l = 0; l <= 5; l++) p.set(X(l), y1, 0, 'glass_pane');
    p.set(X(0), y1, 1, 'glass_pane'); p.set(X(5), y1, 1, 'glass_pane');
    chair(p, X(3), y1, 1, 'spruce', 'south'); p.set(X(4), y1, 1, 'potted_azalea_bush');
  } else for (let l = 0; l <= 5; l++) p.set(X(l), 0, 1, 'smooth_stone');
}

function wohnblock() {
  const p = new Plot([17, 14, 11]);
  p.fill(0, 0, 0, 16, 0, 1, 'grass_block', grass()); p.fill(7, 0, 0, 9, 0, 1, 'polished_andesite');
  for (let x = 0; x <= 16; x++) if (x < 7 || x > 9) p.set(x, 1, 0, 'azalea_leaves', leaves());
  for (let k = 0; k < 3; k++) {
    const y = 4 * k;
    p.fill(0, y, 2, 16, y, 10, k ? 'light_gray_concrete' : 'smooth_stone');
    p.room(0, 2, 16, 10, y + 1, y + 3, 'white_concrete');
    for (const x of [0, 7, 9, 16]) for (const z of [2, 10]) p.fill(x, y + 1, z, x, y + 3, z, 'gray_concrete');
    p.fill(7, y + 1, 3, 7, y + 3, 9, 'white_concrete'); p.fill(9, y + 1, 3, 9, y + 3, 9, 'white_concrete');
    door(p, 7, y + 1, 8, 'spruce', 'west'); door(p, 9, y + 1, 8, 'spruce', 'east');
    apartment(p, false, y, k); apartment(p, true, y, k);
    p.set(8, y + 2, 2, 'glass_pane');
    hangingLamp(p, 8, y + 4, 6, 0);
  }
  door(p, 8, 1, 2, 'spruce', 'south');
  p.set(8, 1, 3, 'chest', chest('south'));
  p.fill(0, 12, 2, 16, 12, 10, 'light_gray_concrete'); p.ring(0, 2, 16, 10, 13, 'gray_concrete');
  for (const x of [...span(2, 5), ...span(11, 14)]) for (let z = 5; z <= 7; z++) p.set(x, 13, z, 'daylight_detector', daylight());
  for (let y = 1; y <= 12; y++) p.set(8, y, 9, 'ladder', ladder('north'));
  return p.payload();
}

const REIHEN: readonly (readonly [string, string, string, string, string, string])[] = [
  ['weiss', 'Weiß', 'weißer', 'white_concrete', 'light_gray_concrete', 'light_gray'],
  ['gelb', 'Gelb', 'gelber', 'yellow_concrete', 'white_concrete', 'yellow'],
  ['hellblau', 'Hellblau', 'hellblauer', 'light_blue_concrete', 'white_concrete', 'light_blue'],
  ['rosa', 'Rosa', 'rosafarbener', 'pink_concrete', 'white_concrete', 'pink'],
];
/** 6 wide row house: party walls on x 0 and 5, so copies stand wall to wall every 6 blocks. */
function reihenhaus(color: string, accent: string, bedColor: string) {
  return () => {
    const p = new Plot([6, 14, 14]);
    p.fill(0, 0, 0, 5, 0, 2, 'grass_block', grass()); p.fill(2, 0, 0, 2, 0, 2, 'polished_andesite');
    for (const x of [0, 1, 3, 4, 5]) p.set(x, 1, 0, 'azalea_leaves', leaves());
    p.set(4, 1, 1, 'poppy'); p.set(5, 1, 1, 'oxeye_daisy'); p.set(0, 1, 2, 'composter');
    p.fill(0, 0, 3, 5, 0, 12, 'stone_bricks'); p.fill(1, 0, 4, 4, 0, 11, 'oak_planks');
    p.room(0, 3, 5, 12, 1, 3, color);
    p.fill(0, 4, 3, 5, 4, 12, 'oak_planks'); p.ring(0, 3, 5, 12, 4, accent);
    p.room(0, 3, 5, 12, 5, 7, color);
    // street side
    door(p, 2, 1, 3, 'dark_oak', 'south');
    panesX(p, [3, 4], 3, 1, 2); p.set(1, 2, 3, 'glass_pane');
    p.fill(1, 3, 2, 3, 3, 2, 'smooth_stone_slab', slab('top'));
    panesX(p, [1, 2, 3, 4], 3, 5, 6); panesX(p, [1, 2, 3, 4], 2, 5, 5, 'iron_bars');
    // garden side
    panesX(p, [2, 3], 12, 1, 2); panesX(p, [2, 3], 12, 5, 6);
    gableRoofX(p, 0, 5, 2, 13, 8, 'deepslate_tile_stairs', color, 'deepslate_tile_slab');
    // ground floor: living room and kitchen
    kitchen(p, 1, 1, 9, 0, 1, 'east');
    for (let z = 9; z <= 11; z++) p.set(1, 3, z, 'oak_trapdoor', trapdoor('east', 'top'));
    table(p, 3, 1, 9, 'oak'); chair(p, 3, 1, 10, 'oak', 'south'); chair(p, 2, 1, 9, 'oak', 'west'); chair(p, 3, 1, 8, 'oak', 'north');
    sofa(p, 1, 1, 6, 'oak', 'west', 2); table(p, 2, 1, 5, 'oak', 'carpet', 'white');
    p.set(4, 1, 5, 'bookshelf'); p.set(4, 1, 6, 'bookshelf'); p.set(4, 2, 5, 'potted_fern'); p.set(4, 2, 6, 'lantern', lantern());
    hangingLamp(p, 2, 4, 6, 0); hangingLamp(p, 3, 4, 10, 0);
    // upper floor: bedroom under the roof
    bed(p, 2, 5, 10, bedColor, 'south'); p.set(1, 5, 11, 'barrel', barrel('up')); p.set(1, 6, 11, 'lantern', lantern());
    cupboard(p, 1, 5, 6, 'oak', 'east', 2);
    p.set(3, 5, 4, 'oak_slab', slab('top')); p.set(4, 5, 4, 'oak_slab', slab('top')); chair(p, 3, 5, 5, 'oak', 'south');
    rug(p, 2, 7, 3, 8, 5, bedColor);
    hangingLamp(p, 2, 13, 7, 1);
    for (let y = 1; y <= 4; y++) p.set(4, y, 11, 'ladder', ladder('west'));
    return p.payload();
  };
}

// ------------------------------------------------------------ Handel
function cafe() {
  const p = new Plot([11, 8, 14]);
  for (let x = 0; x <= 10; x++) for (let z = 0; z <= 5; z++) p.set(x, 0, z, x === 5 || (x + z) % 2 ? 'smooth_stone' : 'polished_andesite');
  p.fill(0, 0, 6, 10, 0, 13, 'bricks'); p.fill(1, 0, 7, 9, 0, 12, 'spruce_planks');
  p.room(0, 6, 10, 13, 1, 4, 'bricks');
  for (const x of [0, 4, 6, 10]) p.fill(x, 1, 6, x, 4, 6, 'dark_oak_log', axis('y'));
  panesX(p, [1, 2, 3, 7, 8, 9], 6, 1, 3);
  door(p, 5, 1, 6, 'dark_oak', 'south'); p.set(5, 3, 6, 'glass_pane');
  panesZ(p, 0, [9, 10, 11], 2, 3); panesZ(p, 10, [9, 10, 11], 2, 3);
  p.fill(0, 5, 6, 10, 5, 13, 'dark_oak_planks'); p.ring(0, 6, 10, 13, 6, 'brick_slab', slab());
  p.set(5, 5, 5, 'dark_oak_wall_sign', { facing: 'north', waterlogged: F });
  // striped awning with a banner valance
  for (let x = 1; x <= 9; x++) {
    const red = x % 2 === 1;
    p.set(x, 4, 5, red ? 'red_wool' : 'white_wool'); p.set(x, 4, 4, red ? 'red_wool' : 'white_wool');
    p.set(x, 4, 3, red ? 'red_wall_banner' : 'white_wall_banner', wallBanner('north'));
  }
  // terrace: two parasol tables and two bistro tables
  for (const px of [2, 8]) {
    p.fill(px, 1, 1, px, 2, 1, 'dark_oak_fence');
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) p.set(px + dx, 3, 1 + dz, Math.abs(dx + dz) % 2 ? 'red_wool' : 'white_wool');
    chair(p, px - 1, 1, 1, 'dark_oak', 'west'); chair(p, px + 1, 1, 1, 'dark_oak', 'east'); chair(p, px, 1, 2, 'dark_oak', 'south'); chair(p, px, 1, 0, 'dark_oak', 'north');
    table(p, px, 1, 4, 'dark_oak'); chair(p, px - 1, 1, 4, 'dark_oak', 'west'); chair(p, px + 1, 1, 4, 'dark_oak', 'east');
  }
  for (const [x, z] of [[0, 0], [10, 0], [0, 5], [10, 5]] as const) p.set(x, 1, z, 'potted_flowering_azalea_bush');
  lampPost(p, 0, 1, 3, 'dark_oak_fence', 2); lampPost(p, 10, 1, 3, 'dark_oak_fence', 2);
  // inside: counter with cakes, coffee bar, two tables
  for (let x = 2; x <= 8; x++) p.set(x, 1, 10, 'dark_oak_slab', slab('top'));
  p.set(3, 2, 10, 'cake'); p.set(5, 2, 10, 'decorated_pot', pot()); p.set(7, 2, 10, 'cake');
  for (const x of [1, 2, 3, 7, 8, 9]) p.set(x, 1, 12, 'barrel', barrel('north'));
  p.set(4, 1, 12, 'smoker', furnace('north', true)); p.set(5, 1, 12, 'dark_oak_slab', slab('top')); p.set(5, 2, 12, 'brewing_stand', BREW); p.set(6, 1, 12, 'cauldron');
  for (let x = 1; x <= 9; x++) p.set(x, 3, 12, 'dark_oak_trapdoor', trapdoor('north', 'top'));
  for (const tx of [2, 8]) { table(p, tx, 1, 8, 'dark_oak'); chair(p, tx - 1, 1, 8, 'dark_oak', 'west'); chair(p, tx + 1, 1, 8, 'dark_oak', 'east'); }
  hangingLamp(p, 2, 5, 8, 1); hangingLamp(p, 8, 5, 8, 1); hangingLamp(p, 5, 5, 11, 1);
  return p.payload();
}

function baeckerei() {
  const p = new Plot([11, 16, 11]);
  p.fill(0, 0, 0, 10, 0, 10, 'smooth_stone');
  p.fill(1, 0, 1, 9, 0, 10, 'stone_bricks');
  for (let x = 2; x <= 8; x++) for (let z = 2; z <= 9; z++) p.set(x, 0, z, (x + z) % 2 ? 'polished_diorite' : 'polished_andesite');
  p.room(1, 1, 9, 10, 1, 4, 'bricks');
  panesX(p, [2, 3, 4, 6, 7, 8], 1, 1, 3);
  door(p, 5, 1, 1, 'spruce', 'south'); p.set(5, 3, 1, 'glass_pane');
  for (let x = 1; x <= 9; x++) p.set(x, 4, 0, 'dark_oak_stairs', stairs('south'));
  // shop window display
  for (const x of [2, 3, 4, 6, 7, 8]) p.set(x, 1, 2, 'spruce_slab', slab('top'));
  p.set(3, 2, 2, 'cake'); p.set(7, 2, 2, 'cake'); p.set(2, 2, 2, 'decorated_pot', pot()); p.set(8, 2, 2, 'decorated_pot', pot());
  // counter, oven, flour store
  for (let x = 2; x <= 7; x++) p.set(x, 1, 5, 'spruce_slab', slab('top'));
  p.set(3, 2, 5, 'cake'); p.set(6, 2, 5, 'flower_pot');
  p.fill(2, 1, 9, 4, 3, 9, 'bricks'); p.set(2, 1, 9, 'furnace', furnace('north', true)); p.set(3, 1, 9, 'smoker', furnace('north', true)); p.set(4, 1, 9, 'furnace', furnace('north', true));
  p.set(5, 1, 9, 'barrel', barrel('up')); p.set(6, 1, 9, 'barrel', barrel('up')); p.set(6, 2, 9, 'barrel', barrel('up')); p.set(7, 1, 9, 'hay_block', axis('y'));
  p.set(4, 1, 7, 'crafting_table'); p.set(5, 1, 7, 'spruce_slab', slab('top'));
  hangingLamp(p, 5, 5, 3, 0); hangingLamp(p, 4, 5, 7, 0);
  // flat above the shop
  p.fill(1, 5, 1, 9, 5, 10, 'spruce_planks');
  p.room(1, 1, 9, 10, 6, 8, 'white_terracotta');
  for (const [x, z] of [[1, 1], [9, 1], [1, 10], [9, 10]] as const) p.fill(x, 6, z, x, 8, z, 'dark_oak_log', axis('y'));
  panesX(p, [3, 7], 1, 6, 7); panesX(p, [5], 10, 7, 7); panesZ(p, 1, [5], 7, 7); panesZ(p, 9, [5], 7, 7);
  gableRoof(p, 0, 10, 1, 10, 9, 'spruce_stairs', 'white_terracotta', 'spruce_slab');
  p.set(5, 11, 1, 'glass_pane');
  bed(p, 2, 6, 8, 'white', 'south'); p.set(2, 6, 7, 'white_carpet');
  p.set(4, 6, 9, 'barrel', barrel('up')); p.set(4, 7, 9, 'lantern', lantern());
  cupboard(p, 7, 6, 3, 'spruce', 'west', 2);
  table(p, 5, 6, 4, 'spruce'); chair(p, 4, 6, 4, 'spruce', 'west'); chair(p, 6, 6, 4, 'spruce', 'east');
  hangingLamp(p, 5, 14, 5, 2);
  // chimney in the back wall
  p.fill(3, 1, 10, 3, 14, 10, 'bricks'); p.set(3, 15, 10, 'campfire', { facing: 'north', lit: 'true', signal_fire: F, waterlogged: F });
  for (let y = 1; y <= 5; y++) p.set(8, y, 9, 'ladder', ladder('west'));
  return p.payload();
}

function kiosk() {
  const p = new Plot([7, 6, 7]);
  p.fill(0, 0, 0, 6, 0, 6, 'smooth_stone'); p.fill(2, 0, 2, 4, 0, 4, 'spruce_planks');
  p.room(1, 1, 5, 5, 1, 3, 'cyan_terracotta');
  for (const [x, z] of [[1, 1], [5, 1], [1, 5], [5, 5]] as const) p.fill(x, 1, z, x, 3, z, 'white_concrete');
  for (let x = 2; x <= 4; x++) { p.air(x, 2, 1); p.set(x, 1, 1, 'white_concrete'); p.set(x, 3, 0, 'spruce_trapdoor', trapdoor('north', 'top')); }
  p.set(1, 2, 3, 'glass_pane'); p.set(5, 2, 3, 'glass_pane');
  door(p, 3, 1, 5, 'spruce', 'north');
  p.fill(1, 4, 1, 5, 4, 5, 'white_concrete'); p.ring(0, 0, 6, 6, 4, 'smooth_stone_slab', slab());
  p.set(2, 1, 2, 'lectern', lectern('north')); p.set(4, 1, 2, 'barrel', barrel('up')); p.set(2, 1, 4, 'chest', chest('east')); p.set(4, 1, 4, 'barrel', barrel('up'));
  p.set(4, 2, 2, 'flower_pot');
  p.set(3, 3, 3, 'lantern', lantern(true));
  // ice cream freezer, bin and plants outside
  p.set(6, 1, 2, 'white_concrete'); p.set(6, 1, 3, 'white_concrete'); p.set(6, 2, 2, 'light_blue_stained_glass_pane'); p.set(6, 2, 3, 'light_blue_stained_glass_pane');
  p.set(0, 1, 2, 'cauldron'); p.set(0, 1, 0, 'potted_fern'); p.set(6, 1, 0, 'potted_fern');
  return p.payload();
}

function supermarkt() {
  const p = new Plot([17, 9, 18]);
  p.fill(0, 0, 0, 16, 0, 2, 'gray_concrete');
  for (const x of [0, 4, 12, 16]) p.fill(x, 0, 0, x, 0, 2, 'white_concrete');
  p.fill(0, 0, 3, 16, 0, 4, 'smooth_stone');
  p.fill(0, 0, 5, 16, 0, 17, 'polished_diorite');
  p.room(0, 5, 16, 17, 1, 5, 'light_gray_concrete');
  panesX(p, [...span(1, 6), ...span(9, 15)], 5, 1, 3);
  for (const x of [0, 4, 12, 16]) p.fill(x, 1, 5, x, 3, 5, 'gray_concrete');
  p.fill(0, 4, 5, 16, 4, 5, 'lime_concrete');
  door(p, 7, 1, 5, 'birch', 'south', 'left'); door(p, 8, 1, 5, 'birch', 'south', 'right');
  p.set(7, 3, 5, 'glass_pane'); p.set(8, 3, 5, 'glass_pane');
  p.fill(5, 4, 3, 10, 4, 4, 'smooth_stone_slab', slab('top'));
  p.fill(0, 6, 5, 16, 6, 17, 'light_gray_concrete');
  for (const x of [4, 8, 12]) for (const z of [8, 11, 14]) p.set(x, 6, z, 'sea_lantern');
  p.ring(0, 5, 16, 17, 7, 'gray_concrete');
  p.set(3, 7, 14, 'iron_block'); p.set(13, 7, 14, 'iron_block'); p.set(3, 7, 13, 'iron_bars'); p.set(13, 7, 13, 'iron_bars');
  // shelves: double-sided barrel rows
  for (const z of [9, 12]) for (const x of [...span(3, 6), ...span(10, 13)]) { p.set(x, 1, z, 'barrel', barrel('north')); p.set(x, 2, z, 'barrel', barrel('south')); }
  for (let z = 10; z <= 15; z++) { p.set(1, 1, z, 'barrel', barrel('east')); p.set(1, 2, z, 'barrel', barrel('east')); }
  // fresh produce
  p.set(2, 1, 7, 'melon'); p.set(3, 1, 7, 'pumpkin'); p.set(4, 1, 7, 'composter'); p.set(2, 1, 8, 'hay_block', axis('y'));
  // fridges along the back wall
  for (let x = 2; x <= 14; x++) { p.set(x, 1, 16, 'white_concrete'); p.set(x, 2, 16, 'light_blue_stained_glass'); p.set(x, 3, 16, 'white_concrete'); }
  // checkouts
  for (const cx of [10, 13]) { p.set(cx, 1, 7, 'smooth_stone_slab', slab('top')); p.set(cx + 1, 1, 7, 'smooth_stone_slab', slab('top')); chair(p, cx, 1, 8, 'birch', 'south'); }
  lampPost(p, 0, 1, 4, 'andesite_wall', 3); lampPost(p, 16, 1, 4, 'andesite_wall', 3);
  return p.payload();
}

// ------------------------------------------------------------ Öffentliche Gebäude
function feuerwache() {
  const p = new Plot([15, 17, 14]);
  p.fill(0, 0, 0, 14, 0, 2, 'gray_concrete'); p.fill(0, 0, 0, 14, 0, 0, 'smooth_stone');
  for (const x of [1, 4, 6, 9]) p.fill(x, 0, 1, x, 0, 2, 'white_concrete');
  p.fill(0, 0, 3, 13, 0, 13, 'polished_andesite');
  p.room(0, 3, 10, 13, 1, 5, 'bricks');
  p.fill(1, 1, 3, 4, 4, 3, 'iron_trapdoor', trapdoor('south', 'bottom', true)); // closed roller door
  p.fill(6, 1, 3, 9, 4, 3, null); // open gate
  p.fill(0, 5, 3, 10, 5, 3, 'red_concrete');
  door(p, 0, 1, 5, 'spruce', 'east');
  // fire engine behind the open gate
  for (const x of [7, 8]) {
    for (let z = 5; z <= 11; z++) { p.set(x, 1, z, z === 6 || z === 10 ? 'black_concrete' : 'gray_concrete'); p.set(x, 2, z, 'red_concrete'); }
    p.set(x, 2, 5, 'sea_lantern'); p.set(x, 3, 5, 'glass'); p.set(x, 3, 6, 'red_concrete');
    for (let z = 7; z <= 11; z++) p.set(x, 3, z, 'rail', rail('north_south'));
  }
  p.set(7, 4, 6, 'blue_stained_glass'); p.set(8, 4, 6, 'blue_stained_glass');
  // equipment: lockers, bench, sliding pole
  for (let z = 8; z <= 12; z++) { p.set(1, 1, z, 'barrel', barrel('east')); p.set(1, 2, z, 'barrel', barrel('east')); }
  for (let z = 9; z <= 11; z++) chair(p, 3, 1, z, 'spruce', 'east');
  p.set(4, 1, 12, 'crafting_table'); p.set(4, 1, 4, 'cauldron');
  for (let y = 1; y <= 9; y++) p.set(3, y, 6, 'iron_chain', chain('y'));
  hangingLamp(p, 2, 6, 9, 0); hangingLamp(p, 8, 6, 8, 0);
  // upper floor: dormitory and kitchen
  p.fill(0, 6, 3, 10, 6, 13, 'spruce_planks'); p.ring(0, 3, 10, 13, 6, 'stone_bricks');
  p.set(3, 6, 6, 'iron_chain', chain('y'));
  p.room(0, 3, 10, 13, 7, 9, 'bricks');
  panesX(p, [1, 2, 3, 4, 6, 7, 8, 9], 3, 7, 8); panesX(p, [2, 3, 4], 13, 8, 8); panesZ(p, 0, span(6, 10), 8, 8); panesZ(p, 10, span(5, 8), 8, 8);
  p.set(5, 8, 2, 'red_wall_banner', wallBanner('north'));
  for (const x of [1, 3, 5]) { bed(p, x, 7, 11, 'red', 'south'); }
  p.set(2, 7, 12, 'barrel', barrel('up')); p.set(4, 7, 12, 'barrel', barrel('up'));
  kitchen(p, 7, 7, 4, 1, 0, 'south');
  longTable(p, 5, 8, 8, 8, 7, 'spruce_slab');
  for (let x = 5; x <= 8; x++) { chair(p, x, 7, 7, 'spruce', 'north'); chair(p, x, 7, 9, 'spruce', 'south'); }
  sofa(p, 1, 7, 8, 'spruce', 'west', 3);
  hangingLamp(p, 3, 10, 9, 0); hangingLamp(p, 7, 10, 6, 0);
  p.fill(0, 10, 3, 10, 10, 13, 'smooth_stone'); p.ring(0, 3, 10, 13, 11, 'brick_slab', slab());
  // hose tower with bell
  p.room(11, 10, 13, 12, 1, 14, 'bricks');
  for (const y of [12, 13]) for (const [x, z] of [[12, 10], [12, 12], [11, 11]] as const) p.set(x, y, z, 'iron_bars'); // Ostwand bleibt zu: dort hängt die Leiter
  p.fill(10, 15, 9, 14, 15, 13, 'brick_slab', slab());
  p.set(12, 14, 11, 'bell', bell('north', 'ceiling')); p.set(12, 16, 11, 'lightning_rod', rod('up'));
  p.air(10, 1, 11); p.air(10, 2, 11); door(p, 11, 1, 11, 'spruce', 'east');
  for (let y = 1; y <= 13; y++) p.set(12, y, 11, 'ladder', ladder('west'));
  for (let y = 1; y <= 6; y++) p.set(9, y, 12, 'ladder', ladder('north'));
  lampPost(p, 5, 1, 0, 'andesite_wall', 3);
  return p.payload();
}

/** One classroom (6×9 inside), `m` mirrors it so the door side stays free. */
function classroom(p: Plot, x0: number, y: number, m: boolean): void {
  const X = (l: number) => (m ? x0 + 5 - l : x0 + l), y1 = y + 1;
  for (let l = 1; l <= 4; l++) { p.set(X(l), y + 2, 14, 'black_concrete'); p.set(X(l), y + 3, 14, 'black_concrete'); }
  p.set(X(2), y1, 12, 'oak_slab', slab('top')); p.set(X(3), y1, 12, 'oak_slab', slab('top')); chair(p, X(2), y1, 13, 'oak', 'south');
  p.set(X(4), y1, 12, 'lectern', lectern('north'));
  for (const z of [8, 10]) for (const l of [0, 1, 3, 4]) { p.set(X(l), y1, z, 'birch_slab', slab('top')); chair(p, X(l), y1, z - 1, 'birch', 'north'); }
  p.set(X(5), y1, 13, 'potted_fern');
  hangingLamp(p, X(2), y + 4, 9, 0); hangingLamp(p, X(3), y + 4, 11, 0);
}

function schule() {
  const p = new Plot([21, 13, 16]);
  p.fill(0, 0, 0, 20, 0, 4, 'smooth_stone'); p.fill(9, 0, 0, 11, 0, 4, 'polished_andesite');
  for (const tx of [2, 18]) { p.set(tx, 0, 2, 'grass_block', grass()); roundTree(p, tx, 1, 2, 'birch', 4, 2); }
  sofa(p, 5, 1, 0, 'oak', 'north', 3); sofa(p, 13, 1, 0, 'oak', 'north', 3);
  p.fill(15, 1, 1, 15, 6, 1, 'iron_bars'); p.set(15, 7, 1, 'white_banner', banner(8));
  for (const k of [0, 1]) {
    const y = 4 * k;
    p.fill(0, y, 5, 20, y, 15, k ? 'white_concrete' : 'stone_bricks');
    p.fill(1, y, 6, 19, y, 14, k ? 'birch_planks' : 'polished_andesite');
    p.room(0, 5, 20, 15, y + 1, y + 3, 'bricks');
    p.fill(7, y + 1, 6, 7, y + 3, 14, 'white_concrete'); p.fill(13, y + 1, 6, 13, y + 3, 14, 'white_concrete');
    panesX(p, [...span(1, 6), ...span(14, 19)], 5, y + 1, y + 2);
    panesZ(p, 0, [7, 8, 9, 11, 12, 13], y + 1, y + 2); panesZ(p, 20, [7, 8, 9, 11, 12, 13], y + 1, y + 2);
    panesX(p, [9, 10, 11], 15, y + 2, y + 2);
    door(p, 7, y + 1, 7, 'oak', 'west'); door(p, 13, y + 1, 7, 'oak', 'east');
    classroom(p, 1, y, false); classroom(p, 14, y, true);
    hangingLamp(p, 10, y + 4, 10, 0);
  }
  // entrance hall
  door(p, 10, 1, 5, 'birch', 'south'); panesX(p, [9, 11], 5, 1, 3); p.set(10, 3, 5, 'glass_pane'); panesX(p, [9, 10, 11], 5, 5, 6);
  for (let z = 9; z <= 13; z++) { p.set(8, 1, z, 'barrel', barrel('east')); p.set(8, 2, z, 'barrel', barrel('east')); }
  for (let z = 9; z <= 11; z++) chair(p, 12, 1, z, 'oak', 'east');
  p.set(8, 1, 6, 'potted_flowering_azalea_bush'); p.set(12, 1, 6, 'potted_flowering_azalea_bush');
  // upper hall: reading corner
  p.fill(8, 5, 10, 8, 6, 13, 'bookshelf'); sofa(p, 12, 5, 9, 'oak', 'east', 2); p.set(10, 5, 12, 'lectern', lectern('north'));
  // roof with bell frame
  p.fill(0, 8, 5, 20, 8, 15, 'white_concrete'); p.fill(1, 8, 6, 19, 8, 14, 'smooth_stone'); p.ring(0, 5, 20, 15, 9, 'white_concrete');
  p.fill(9, 9, 10, 9, 11, 10, 'white_concrete'); p.fill(11, 9, 10, 11, 11, 10, 'white_concrete');
  p.fill(9, 12, 10, 11, 12, 10, 'smooth_stone_slab', slab()); p.set(10, 12, 10, 'white_concrete');
  p.set(10, 11, 10, 'bell', bell('north', 'ceiling'));
  for (let y = 1; y <= 4; y++) p.set(12, y, 14, 'ladder', ladder('west'));
  return p.payload();
}

function aerztehaus() {
  const p = new Plot([13, 11, 13]);
  p.fill(0, 0, 0, 12, 0, 1, 'smooth_stone');
  for (const k of [0, 1]) {
    const y = 4 * k;
    p.fill(0, y, 2, 12, y, 12, k ? 'light_gray_concrete' : 'smooth_stone');
    p.fill(1, y, 3, 11, y, 11, k ? 'birch_planks' : 'polished_diorite');
    p.room(0, 2, 12, 12, y + 1, y + 3, 'white_concrete');
    panesZ(p, 0, [4, 5, 9, 10], y + 2, y + 2); panesZ(p, 12, [4, 5, 9, 10], y + 2, y + 2);
  }
  panesX(p, [1, 2, 3, 4, 8, 9, 10, 11], 2, 1, 2); panesX(p, [5, 7], 2, 1, 2);
  door(p, 6, 1, 2, 'birch', 'south');
  panesX(p, [1, 2, 3, 9, 10, 11], 2, 5, 6);
  for (const [x, y] of [[6, 5], [6, 6], [6, 7], [5, 6], [7, 6]] as const) p.set(x, y, 2, 'red_concrete');
  p.fill(4, 3, 1, 8, 3, 1, 'smooth_quartz_slab', slab('top'));
  p.fill(0, 8, 2, 12, 8, 12, 'light_gray_concrete'); p.ring(0, 2, 12, 12, 9, 'white_concrete');
  // ground floor: waiting room, reception, two treatment rooms
  p.fill(1, 1, 8, 11, 3, 8, 'white_concrete'); p.fill(6, 1, 9, 6, 3, 11, 'white_concrete');
  door(p, 3, 1, 8, 'birch', 'south'); door(p, 9, 1, 8, 'birch', 'south');
  for (let z = 4; z <= 6; z++) chair(p, 1, 1, z, 'birch', 'west');
  p.set(1, 1, 3, 'potted_flowering_azalea_bush'); p.set(1, 1, 7, 'bookshelf'); table(p, 3, 1, 5, 'birch', 'carpet', 'white');
  for (let x = 8; x <= 10; x++) p.set(x, 1, 5, 'smooth_quartz_slab', slab('top'));
  chair(p, 9, 1, 6, 'birch', 'south');
  for (const [bx, f, sink, side] of [[2, 'east', 5, 1], [10, 'west', 7, 11]] as const) {
    bed(p, bx, 1, 10, 'white', f); p.set(sink, 1, 11, 'cauldron');
    p.set(side, 1, 11, 'smooth_quartz_slab', slab('top')); p.set(side, 2, 11, 'brewing_stand', BREW);
  }
  hangingLamp(p, 3, 4, 5, 0); hangingLamp(p, 9, 4, 7, 0); hangingLamp(p, 3, 4, 10, 0); hangingLamp(p, 9, 4, 10, 0);
  // upper floor: office, lab bench, recovery beds
  p.set(2, 5, 4, 'spruce_slab', slab('top')); p.set(3, 5, 4, 'spruce_slab', slab('top')); chair(p, 2, 5, 5, 'spruce', 'south');
  p.fill(1, 5, 6, 1, 6, 10, 'bookshelf');
  bed(p, 5, 5, 10, 'light_blue', 'south'); bed(p, 8, 5, 10, 'light_blue', 'south'); p.set(6, 5, 11, 'barrel', barrel('up')); p.set(7, 5, 11, 'potted_fern');
  p.set(9, 5, 4, 'smooth_quartz_slab', slab('top')); p.set(9, 6, 4, 'brewing_stand', BREW); p.set(10, 5, 4, 'cauldron');
  hangingLamp(p, 6, 8, 6, 0); hangingLamp(p, 4, 8, 9, 0);
  p.set(12, 2, 4, 'white_concrete'); // kein Fenster hinter der Leiter
  for (let y = 1; y <= 4; y++) p.set(11, y, 4, 'ladder', ladder('west'));
  return p.payload();
}

function bibliothek() {
  const p = new Plot([17, 11, 15]);
  p.fill(0, 0, 0, 16, 0, 2, 'smooth_stone'); p.fill(7, 0, 0, 9, 0, 2, 'polished_andesite');
  p.fill(0, 0, 3, 16, 0, 14, 'polished_andesite'); p.fill(1, 0, 4, 15, 0, 13, 'birch_planks');
  p.room(0, 3, 16, 14, 1, 8, 'smooth_quartz');
  panesX(p, span(1, 15), 3, 1, 7);
  for (const x of [0, 4, 12, 16]) p.fill(x, 1, 3, x, 8, 3, 'quartz_pillar', axis('y'));
  door(p, 8, 1, 3, 'birch', 'south');
  panesZ(p, 0, [6, 9, 12], 2, 7); panesZ(p, 16, [6, 9, 12], 2, 7);
  p.fill(0, 9, 2, 16, 9, 14, 'smooth_quartz'); p.fill(5, 9, 6, 11, 9, 8, 'glass');
  // gallery over the back part
  p.fill(1, 4, 10, 15, 4, 13, 'birch_planks');
  for (let x = 1; x <= 15; x++) p.set(x, 5, 10, 'glass_pane');
  for (const x of [...span(2, 7), ...span(9, 14)]) p.fill(x, 1, 11, x, 3, 11, 'bookshelf');
  p.fill(1, 1, 13, 14, 3, 13, 'bookshelf'); p.fill(1, 5, 13, 14, 7, 13, 'bookshelf');
  for (const x0 of [3, 10]) { longTable(p, x0, 11, x0 + 3, 11, 5, 'birch_slab'); for (let x = x0; x <= x0 + 3; x++) chair(p, x, 5, 12, 'birch', 'south'); }
  // reading hall
  for (const x0 of [2, 11]) {
    longTable(p, x0, 6, x0 + 3, 6, 1, 'birch_slab');
    for (let x = x0; x <= x0 + 3; x++) { chair(p, x, 1, 5, 'birch', 'north'); chair(p, x, 1, 7, 'birch', 'south'); }
  }
  for (let x = 7; x <= 9; x++) p.set(x, 1, 8, 'smooth_quartz_slab', slab('top'));
  chair(p, 8, 1, 9, 'birch', 'south');
  p.set(1, 1, 9, 'lectern', lectern('east')); p.set(15, 1, 9, 'lectern', lectern('west'));
  p.set(1, 1, 4, 'potted_flowering_azalea_bush'); p.set(15, 1, 4, 'potted_flowering_azalea_bush');
  hangingLamp(p, 3, 9, 6, 3); hangingLamp(p, 13, 9, 6, 3); hangingLamp(p, 8, 4, 12, 0);
  for (let y = 1; y <= 4; y++) p.set(15, y, 13, 'ladder', ladder('west'));
  // forecourt
  sofa(p, 2, 1, 1, 'birch', 'north', 3, 'smooth_quartz'); sofa(p, 12, 1, 1, 'birch', 'north', 3, 'smooth_quartz');
  p.set(10, 1, 2, 'barrel', barrel('north'));
  lampPost(p, 6, 1, 0, 'andesite_wall', 3); lampPost(p, 10, 1, 0, 'andesite_wall', 3);
  return p.payload();
}

function polizeiwache() {
  const p = new Plot([13, 13, 13]);
  p.fill(0, 0, 0, 12, 0, 1, 'smooth_stone');
  for (const k of [0, 1]) {
    const y = 4 * k;
    p.fill(0, y, 2, 12, y, 12, k ? 'blue_concrete' : 'gray_concrete');
    p.fill(1, y, 3, 11, y, 11, k ? 'spruce_planks' : 'polished_andesite');
    p.room(0, 2, 12, 12, y + 1, y + 3, 'light_gray_concrete');
    panesZ(p, 0, [4, 5, 7, 8, 10], y + 2, y + 2); panesZ(p, 12, [4, 5, 7, 8, 10], y + 2, y + 2);
  }
  door(p, 6, 1, 2, 'spruce', 'south');
  panesX(p, [2, 3, 4, 8, 9, 10], 2, 1, 2); panesX(p, [...span(1, 5), ...span(7, 11)], 2, 5, 6);
  p.fill(4, 3, 1, 8, 3, 1, 'smooth_stone_slab', slab('top')); p.set(6, 4, 1, 'blue_stained_glass');
  p.fill(0, 8, 2, 12, 8, 12, 'gray_concrete'); p.ring(0, 2, 12, 12, 9, 'light_gray_concrete');
  p.fill(11, 9, 11, 11, 11, 11, 'iron_bars'); p.set(11, 12, 11, 'lightning_rod', rod('up'));
  // ground floor: counter with glass screen, desk, files, holding cell
  for (let x = 2; x <= 10; x++) p.set(x, 1, 6, 'smooth_stone_slab', slab('top'));
  panesX(p, [2, 3, 4, 5, 7, 8, 9, 10], 6, 2, 2);
  chair(p, 1, 1, 3, 'spruce', 'west'); chair(p, 1, 1, 4, 'spruce', 'west'); p.set(11, 1, 3, 'potted_fern');
  table(p, 3, 1, 9, 'spruce'); chair(p, 3, 1, 8, 'spruce', 'north'); chair(p, 3, 1, 10, 'spruce', 'south');
  for (let z = 8; z <= 11; z++) { p.set(1, 1, z, 'barrel', barrel('east')); p.set(1, 2, z, 'barrel', barrel('east')); }
  for (let y = 1; y <= 3; y++) { for (let x = 8; x <= 11; x++) p.set(x, y, 8, 'iron_bars'); for (let z = 9; z <= 11; z++) p.set(7, y, z, 'iron_bars'); }
  door(p, 9, 1, 8, 'iron', 'north');
  bed(p, 10, 1, 10, 'gray', 'east'); p.set(8, 1, 11, 'cauldron');
  hangingLamp(p, 4, 4, 4, 0); hangingLamp(p, 8, 4, 4, 0); hangingLamp(p, 4, 4, 9, 0); hangingLamp(p, 9, 4, 10, 0);
  // upper floor: offices and break room
  p.set(2, 5, 4, 'spruce_slab', slab('top')); p.set(3, 5, 4, 'spruce_slab', slab('top')); p.set(4, 5, 4, 'spruce_slab', slab('top'));
  chair(p, 2, 5, 5, 'spruce', 'south'); chair(p, 4, 5, 5, 'spruce', 'south');
  p.set(1, 5, 7, 'cartography_table');
  for (let z = 9; z <= 11; z++) { p.set(1, 5, z, 'barrel', barrel('east')); p.set(1, 6, z, 'barrel', barrel('east')); }
  sofa(p, 4, 5, 11, 'spruce', 'south', 2);
  kitchen(p, 9, 5, 11, 1, 0, 'north');
  table(p, 9, 5, 8, 'spruce'); chair(p, 8, 5, 8, 'spruce', 'west'); chair(p, 10, 5, 8, 'spruce', 'east');
  hangingLamp(p, 4, 8, 7, 0); hangingLamp(p, 9, 8, 6, 0);
  for (let y = 1; y <= 4; y++) p.set(6, y, 11, 'ladder', ladder('north'));
  lampPost(p, 1, 1, 0, 'andesite_wall', 3); lampPost(p, 11, 1, 0, 'andesite_wall', 3);
  return p.payload();
}

function stadtplatz() {
  const p = new Plot([15, 7, 15]);
  for (let x = 0; x <= 14; x++) for (let z = 0; z <= 14; z++) {
    const r = Math.max(Math.abs(x - 7), Math.abs(z - 7));
    p.set(x, 0, z, r === 7 ? 'smooth_stone' : r % 2 ? 'polished_andesite' : 'polished_diorite');
  }
  // fountain: quartz basin, lit floor, column with a spring on top
  p.fill(6, 0, 6, 8, 0, 8, 'smooth_quartz');
  for (const [x, z] of [[6, 6], [8, 6], [6, 8], [8, 8]] as const) p.set(x, 0, z, 'sea_lantern');
  p.ring(5, 5, 9, 9, 1, 'smooth_quartz'); p.ring(5, 5, 9, 9, 2, 'smooth_quartz_slab', slab());
  for (let x = 6; x <= 8; x++) for (let z = 6; z <= 8; z++) if (x !== 7 || z !== 7) p.set(x, 1, z, 'water', water());
  p.fill(7, 1, 7, 7, 3, 7, 'quartz_pillar', axis('y')); p.set(7, 4, 7, 'water', water());
  // benches facing the fountain
  sofa(p, 6, 1, 2, 'birch', 'north', 3, 'smooth_quartz'); sofa(p, 8, 1, 12, 'birch', 'south', 3, 'smooth_quartz');
  sofa(p, 2, 1, 8, 'birch', 'west', 3, 'smooth_quartz'); sofa(p, 12, 1, 6, 'birch', 'east', 3, 'smooth_quartz');
  // flower beds around the basin
  const flowers = ['poppy', 'oxeye_daisy', 'cornflower'];
  for (let i = 0; i < 3; i++) for (const [x, z] of [[6 + i, 4], [6 + i, 10], [4, 6 + i], [10, 6 + i]] as const) { p.set(x, 0, z, 'grass_block', grass()); p.set(x, 1, z, flowers[i]!); }
  for (const [cx, cz] of [[2, 2], [12, 2], [2, 12], [12, 12]] as const) { p.set(cx, 0, cz, 'grass_block', grass()); roundTree(p, cx, 1, cz, 'birch', 4, 2); }
  for (const [x, z] of [[4, 4], [10, 4], [4, 10], [10, 10]] as const) lampPost(p, x, 1, z, 'andesite_wall', 3);
  return p.payload();
}

// ------------------------------------------------------------ Infrastruktur
function bushaltestelle() {
  const p = new Plot([7, 5, 4]);
  p.fill(0, 0, 0, 6, 0, 3, 'smooth_stone'); p.fill(0, 0, 0, 6, 0, 0, 'polished_andesite');
  for (let y = 1; y <= 3; y++) { p.set(1, y, 1, 'glass_pane'); p.set(5, y, 1, 'glass_pane'); for (let x = 1; x <= 5; x++) p.set(x, y, 2, 'glass_pane'); }
  for (let x = 2; x <= 4; x++) p.set(x, 1, 1, 'smooth_quartz_stairs', stairs('south'));
  p.fill(0, 4, 0, 5, 4, 3, 'smooth_stone_slab', slab());
  p.set(3, 3, 1, 'end_rod', facing('down'));
  p.fill(6, 1, 0, 6, 2, 0, 'andesite_wall'); p.set(6, 3, 0, 'yellow_banner', banner(8));
  p.set(0, 1, 1, 'cauldron');
  return p.payload();
}

type Strasse = 'gerade' | 'kreuzung' | 'einmuendung';
/** City street: 4 wide asphalt (z 3–6, or x 3–6 for the side arm) between raised sidewalks; joints in the road middle. */
function strasse(shape: Strasse) {
  return () => {
    const L = shape === 'gerade' ? 8 : 10, p = new Plot([L, 7, 10]);
    const road = (x: number, z: number) => (z >= 3 && z <= 6) || (shape !== 'gerade' && x >= 3 && x <= 6 && (shape === 'kreuzung' || z >= 3));
    for (let x = 0; x < L; x++) for (let z = 0; z < 10; z++) {
      if (road(x, z)) p.set(x, 0, z, 'gray_concrete');
      else { p.set(x, 0, z, 'stone'); p.set(x, 1, z, 'smooth_stone_slab', slab()); }
    }
    if (shape !== 'gerade') {
      for (const x of [0, 2, 7, 9]) for (let z = 3; z <= 6; z++) p.set(x, 0, z, 'white_concrete');
      const arms = shape === 'kreuzung' ? [0, 2, 7, 9] : [7, 9];
      for (const z of arms) for (let x = 3; x <= 6; x++) p.set(x, 0, z, 'white_concrete');
      streetLamp(p, 1, 1, 1); streetLamp(p, 8, 8, -1);
    } else {
      streetLamp(p, 1, 1, 1); streetLamp(p, 6, 8, -1);
      for (const [tx, tz] of [[4, 1], [3, 8]] as const) { p.set(tx, 0, tz, 'grass_block', grass()); p.clear(tx, 1, tz); roundTree(p, tx, 1, tz, 'oak', 4, 1.5); }
    }
    return p.payload();
  };
}
const SW = (id: string, pos: [number, number, number], n: [number, number, number]) => joint(id, pos, n, 'path_joint', PATH_PROFILE);
const STRASSE_JOINTS: Record<Strasse, ReturnType<typeof joint>[]> = {
  gerade: [SW('west', [0, 0, 5], [-1, 0, 0]), SW('east', [8, 0, 5], [1, 0, 0])],
  kreuzung: [SW('west', [0, 0, 5], [-1, 0, 0]), SW('east', [10, 0, 5], [1, 0, 0]), SW('north', [5, 0, 0], [0, 0, -1]), SW('south', [5, 0, 10], [0, 0, 1])],
  einmuendung: [SW('west', [0, 0, 5], [-1, 0, 0]), SW('east', [10, 0, 5], [1, 0, 0]), SW('south', [5, 0, 10], [0, 0, 1])],
};

function parkplatz() {
  const p = new Plot([10, 6, 12]);
  p.fill(0, 0, 0, 9, 0, 11, 'gray_concrete');
  for (const x of [0, 3, 6, 9]) { p.fill(x, 0, 0, x, 0, 3, 'white_concrete'); p.fill(x, 0, 8, x, 0, 11, 'white_concrete'); }
  for (const sx of [1, 4, 7]) { p.fill(sx, 1, 1, sx + 1, 1, 1, 'smooth_stone_slab', slab()); p.fill(sx, 1, 10, sx + 1, 1, 10, 'smooth_stone_slab', slab()); }
  p.fill(9, 1, 5, 9, 1, 6, 'azalea_leaves', leaves());
  lampPost(p, 9, 1, 4, 'andesite_wall', 4); lampPost(p, 9, 1, 7, 'andesite_wall', 4);
  p.fill(0, 1, 3, 0, 2, 3, 'andesite_wall'); p.set(0, 3, 3, 'blue_banner', banner(4));
  return p.payload();
}

// ------------------------------------------------------------ specs
const ST = 'bld_stadt_';
const LADDER_TIP = 'Die Etagen sind über eine Leiter im Treppenhaus verbunden; im Überlebensmodus lieber eine Treppe daneben bauen, wenn Platz ist.';

const REIHENHAEUSER: BuildingSpec[] = REIHEN.map(([key, label, adj, color, accent, bedColor]) => ({
  id: `${ST}reihenhaus_${key}`, name: `Reihenhaus (${label})`, payload: reihenhaus(color, accent, bedColor), tags: ['reihe', 'vorgarten', 'zweistöckig'],
  description: `Schmales Reihenhaus mit ${adj} Betonfassade: Wohnküche und Sofa unten, Schlafzimmer unter dem Satteldach, Vorgarten mit Hecke.`,
  facets: { kategorie: ['wohnhaus'], stil: ['modern'], biom: ['ebene', 'ueberall'], funktion: ['wohnen'] },
  family: { id: 'reihenhaus', label: 'Reihenhaus', variant: label },
  tips: ['6 Blöcke breit mit Brandwänden links und rechts: im Abstand von 6 Blöcken aneinandersetzen, dann läuft das Dach als Zeile durch.', 'Beton entsteht, wenn Trockenbeton Wasser berührt – am schnellsten an einem Wasserfall abbauen.'],
  inspiration: [WIKI('Concrete', 'Beton')],
}));

const STRASSEN: BuildingSpec[] = ([['gerade', 'Gerade'], ['kreuzung', 'Kreuzung'], ['einmuendung', 'Einmündung']] as const).map(([shape, label]) => ({
  id: `${ST}strasse_${shape}`, name: `Stadtstraße: ${label}`, payload: strasse(shape), tags: ['straße', 'gehweg', 'kettenbar'],
  description: `Straßenmodul „${label}“: 4 Blöcke breiter Asphalt aus grauem Beton zwischen erhöhten Gehwegen mit Bordstein${shape === 'gerade' ? ', zwei Straßenbäumen' : ', Zebrastreifen'} und Auslegerlaternen.`,
  facets: { kategorie: ['infrastruktur'], stil: ['modern'], biom: ['ueberall'], funktion: ['verbindung', 'transport'] },
  family: { id: 'stadtstrasse', label: 'Stadtstraße', variant: label },
  connectors: STRASSE_JOINTS[shape],
  tips: ['Gleicher Anschluss wie Wege-Baukasten, Brücke und Steg (weg_4): Stadtstraßen und Feldwege lassen sich im Editor direkt verbinden.', 'Die Gehwege sind halbe Stufen hoch – Fußgänger und Mobs steigen ohne Springen hinauf.'],
}));

export const STADT_SPECS: readonly BuildingSpec[] = [
  { id: `${ST}schule`, name: 'Stadtschule', payload: schule, tags: ['schule', 'klassenzimmer', 'pausenhof'],
    description: 'Zweistöckige Backsteinschule mit vier Klassenzimmern (Bänke, Pult, Tafel), Eingangshalle mit Spinden, Leseecke, Glocke auf dem Dach und Pausenhof mit Bäumen.',
    facets: { kategorie: ['oeffentlich'], stil: ['modern', 'klassisch'], biom: ['ebene', 'ueberall'], funktion: ['bildung', 'versammlung'] },
    tips: [LADDER_TIP, 'Ein Lesepult mit Buch und Feder lässt sich als Klassenbuch nutzen – mehrere Spieler können es lesen.'], inspiration: [WIKI('Lectern', 'Lesepult')] },
  { id: `${ST}feuerwache`, name: 'Feuerwache', payload: feuerwache, tags: ['feuerwehr', 'garage', 'turm'],
    description: 'Backstein-Feuerwache mit zwei Toren (eines als Rolltor aus Eisenfalltüren), Löschfahrzeug, Rutschstange aus Ketten, Schlafsaal mit Küche und Schlauchturm mit Glocke.',
    facets: { kategorie: ['oeffentlich'], stil: ['modern', 'industriell'], biom: ['ebene', 'ueberall'], funktion: ['transport', 'wohnen'] },
    tips: ['Eisenfalltüren öffnen nur mit Redstone – ein Hebel neben dem Tor macht das Rolltor bedienbar.', 'Die Kette ist durch die Decke geführt: Man kann an ihr nicht klettern, die Leiter hinten führt nach oben.'], inspiration: [WIKI('Iron_Trapdoor', 'Eisenfalltür'), WIKI('Bell', 'Glocke')] },
  { id: `${ST}aerztehaus`, name: 'Ärztehaus', payload: aerztehaus, tags: ['praxis', 'arzt', 'rotes kreuz'],
    description: 'Weißes Ärztehaus mit rotem Kreuz an der Fassade: Wartezimmer, Empfang, zwei Behandlungszimmer mit Liege, Waschbecken und Braustand, oben Büro, Labor und Ruheraum.',
    facets: { kategorie: ['oeffentlich'], stil: ['modern'], biom: ['ebene', 'ueberall'], funktion: ['versammlung', 'verzaubern'] },
    tips: [LADDER_TIP, 'Heiltränke braut man aus Netherwarze und glitzernder Melone – die Braustände stehen schon bereit.'], inspiration: [WIKI('Potion_of_Healing', 'Trank der Heilung')] },
  { id: `${ST}bibliothek`, name: 'Stadtbibliothek', payload: bibliothek, tags: ['bücher', 'galerie', 'glasfront'],
    description: 'Moderne Bibliothek mit Glasfront zwischen Quarzsäulen, Lesesaal mit langen Tischen, Ausleihtheke, Regalgängen und einer Galerie mit Glasgeländer unter dem Oberlicht.',
    facets: { kategorie: ['oeffentlich'], stil: ['modern'], biom: ['ueberall'], funktion: ['bildung', 'versammlung'] },
    tips: ['Bücherregale bauen sich aus 6 Brettern und 3 Büchern; für eine so große Bibliothek lohnt eine Zuckerrohrfarm.'], inspiration: [WIKI('Bookshelf', 'Bücherregal')] },
  { id: `${ST}polizeiwache`, name: 'Polizeiwache', payload: polizeiwache, tags: ['polizei', 'zelle', 'blaulicht'],
    description: 'Polizeiwache mit blauem Geschossband und blauem Licht über dem Eingang, Wachtheke mit Glasscheibe, Aktenschränken, Arrestzelle mit Eisentür, oben Büros und Aufenthaltsraum.',
    facets: { kategorie: ['oeffentlich'], stil: ['modern'], biom: ['ebene', 'ueberall'], funktion: ['verteidigung', 'lagern'] },
    tips: ['Die Zellentür ist eine Eisentür: nur ein Knopf oder Hebel außen öffnet sie.', LADDER_TIP], inspiration: [WIKI('Iron_Door', 'Eisentür')] },
  { id: `${ST}platz`, name: 'Stadtplatz mit Brunnen', payload: stadtplatz, tags: ['platz', 'brunnen', 'bänke'],
    description: 'Gepflasterter Stadtplatz mit beleuchtetem Quarzbrunnen und Quellsäule, vier Bänken, Blumenbeeten, Birken in den Ecken und Laternen.',
    facets: { kategorie: ['oeffentlich'], stil: ['modern'], biom: ['ueberall'], funktion: ['versammlung', 'deko', 'wasserquelle'] }, gaps: ['minecraft:water'],
    tips: ['Wasser im Becken mit Eimern setzen; die Quelle oben auf der Säule fließt von selbst ins Becken.', 'Seelaternen unter Wasser leuchten auch nachts – ideal für Brunnenböden.'], inspiration: [WIKI('Sea_Lantern', 'Seelaterne')] },
  { id: `${ST}hochhaus`, name: 'Hochhaus', payload: hochhaus, tags: ['hochhaus', 'fensterband', 'dachterrasse'],
    description: '40 Blöcke hohes Wohnhochhaus auf 9×9: Glaslobby, sieben eingerichtete Wohnetagen mit Fensterbändern und Quarzgesimsen, Leiterschacht und Dachterrasse mit Glasgeländer.',
    facets: { kategorie: ['wohnhaus'], stil: ['modern'], biom: ['ebene', 'ueberall'], funktion: ['wohnen', 'aussicht'] },
    tips: ['Der Leiterschacht läuft durch alle Etagen bis aufs Dach – für den Abstieg reicht auch ein Wasserfall daneben.', 'Erst alle Geschossdecken und Säulen hochziehen, dann die Fensterbänder einsetzen: so bleibt das Gerüst übersichtlich.'], inspiration: [WIKI('Ladder', 'Leiter')] },
  { id: `${ST}wohnblock`, name: 'Wohnblock', payload: wohnblock, tags: ['mehrfamilienhaus', 'balkone', 'treppenhaus'],
    description: 'Dreigeschossiger Wohnblock mit sechs eingerichteten Wohnungen (Bett, Küche, Esstisch, Sofa), Balkonen mit Glasgeländer, Treppenhaus mit Leiter und Solardach aus Tageslichtsensoren.',
    facets: { kategorie: ['wohnhaus'], stil: ['modern'], biom: ['ebene', 'ueberall'], funktion: ['wohnen'] },
    tips: [LADDER_TIP, 'Die Tageslichtsensoren auf dem Dach können eine Hausbeleuchtung aus Redstone-Lampen steuern (umgekehrt geschaltet: nachts an).'], inspiration: [WIKI('Daylight_Detector', 'Tageslichtsensor')] },
  ...REIHENHAEUSER,
  { id: `${ST}cafe`, name: 'Straßencafé', payload: cafe, tags: ['café', 'terrasse', 'markise'],
    description: 'Backsteincafé mit rot-weißer Markise und Bannerbehang, Terrasse mit zwei Sonnenschirmtischen und Bistrotischen, innen Kuchentheke, Kaffeebar und Sitzplätze.',
    facets: { kategorie: ['handel'], stil: ['modern', 'klassisch'], biom: ['ueberall'], funktion: ['handel', 'kochen'] },
    tips: ['Kuchen lässt sich in sieben Stücken essen – auf der Theke ein Imbiss für alle Mitspieler.'], inspiration: [WIKI('Cake', 'Kuchen')] },
  { id: `${ST}baeckerei`, name: 'Bäckerei', payload: baeckerei, tags: ['bäcker', 'schaufenster', 'backofen'],
    description: 'Bäckerei mit Schaufenster und Kuchenauslage, Verkaufstheke, gemauertem Backofen mit Öfen und Räucherofen, Mehlfässern und Wohnung unter dem Satteldach.',
    facets: { kategorie: ['handel'], stil: ['klassisch', 'modern'], biom: ['ebene', 'ueberall'], funktion: ['handel', 'kochen', 'wohnen'] },
    tips: ['Ein Räucherofen backt Brot nicht, brät aber Fleisch doppelt so schnell – Brot entsteht an der Werkbank aus drei Weizen.'], inspiration: [WIKI('Smoker', 'Räucherofen')] },
  { id: `${ST}kiosk`, name: 'Kiosk', payload: kiosk, tags: ['kiosk', 'klein', 'durchreiche'],
    description: 'Kleiner Kiosk mit Durchreiche unter einer Klappe, Zeitungs-Lesepult, Truhe und Fässern, Eistruhe und Mülleimer vor der Tür.',
    facets: { kategorie: ['handel'], stil: ['modern'], biom: ['ueberall'], funktion: ['handel'] } },
  { id: `${ST}supermarkt`, name: 'Supermarkt', payload: supermarkt, tags: ['laden', 'regale', 'parkplatz'],
    description: 'Flacher Supermarkt mit Glasfront und grünem Band, Regalreihen aus Fässern, Obst- und Gemüsestand, Kühlregalen, zwei Kassen und Parkbuchten davor.',
    facets: { kategorie: ['handel'], stil: ['modern'], biom: ['ebene', 'ueberall'], funktion: ['handel', 'lagern'] },
    tips: ['Die Fassregale sind echte Lager: 27 Plätze je Fass, ideal als Gemeinschaftsladen auf einem Server.'] },
  { id: `${ST}bushaltestelle`, name: 'Bushaltestelle', payload: bushaltestelle, tags: ['haltestelle', 'wartehäuschen', 'klein'],
    description: 'Wartehäuschen aus Glas mit Quarzbank, Flachdach und Endstab-Leuchte, Haltestellenschild mit gelbem Banner und Mülleimer.',
    facets: { kategorie: ['infrastruktur'], stil: ['modern'], biom: ['ueberall'], funktion: ['transport', 'verbindung'] },
    tips: ['Passt an den Gehweg der Stadtstraße: Bordsteinkante nach Norden zur Fahrbahn.'] },
  ...STRASSEN,
  { id: `${ST}parkplatz`, name: 'Parkplatz', payload: parkplatz, tags: ['parken', 'markierung', 'kettenbar'],
    description: 'Parkplatz mit sechs markierten Stellplätzen, Radstoppern aus Stufen, Hecke, zwei Laternen und Parkschild; Zufahrt mit Straßenanschluss.',
    facets: { kategorie: ['infrastruktur'], stil: ['modern'], biom: ['ueberall'], funktion: ['transport', 'verbindung'] },
    connectors: [SW('west', [0, 0, 6], [-1, 0, 0])],
    tips: ['Die Zufahrt hat den weg_4-Anschluss: direkt an eine Stadtstraße oder einen Weg setzen.'] },
];
