import { Plot, axis, barrel, bed, beehive, campfire, candle, chest, crop, door, farmland, furnace, gableRoof, gableRoofX, gate, grass, hipRoof, lampPost, lantern, lectern, noise, slab, stairs, tallPlant, water, F, T } from '../plot.js';
import { berries, chair, hangingLamp, kelp } from '../furnish.js';
import { WIKI } from '../spec.js';
import type { BuildingSpec } from '../spec.js';
import type { Props } from '../plot.js';

/**
 * Hof (Katalog v3): Tierhaltung und Anbau jenseits der Grundfarmen.
 * Ställe mit Einrichtung, Wasser- und Netherkulturen, Dorfbewohner-Bauten.
 * Alle Entwürfe sind eigene, schlichte Vanilla-Bauten.
 */

const waterCauldron: Props = { level: '3' };
const scaffold: Props = { bottom: F, distance: '0', waterlogged: F };
/** Mature (thick) bamboo stalk with the given leaves. */
const bam = (leaves: 'none' | 'small' | 'large'): Props => ({ age: '1', leaves, stage: '0' });
const FLOWERS = ['poppy', 'dandelion', 'cornflower', 'allium', 'oxeye_daisy', 'azure_bluet', 'blue_orchid', 'pink_tulip'] as const;

function ground(p: Plot, w: number, d: number, id = 'grass_block'): void {
  for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) p.set(x, 0, z, id, id === 'grass_block' || id === 'podzol' ? grass() : {});
}

// ------------------------------------------------------------ Ställe

function kuhstall() {
  const p = new Plot([13, 10, 15]);
  ground(p, 13, 15);
  p.fill(1, 0, 1, 11, 0, 7, 'cobblestone'); p.fill(2, 0, 2, 10, 0, 6, 'coarse_dirt');
  p.room(1, 1, 11, 7, 1, 4, 'spruce_planks');
  p.ring(1, 1, 11, 7, 1, 'cobblestone');
  for (const x of [1, 6, 11]) p.fill(x, 1, 1, x, 4, 1, 'spruce_log', axis('y'));
  for (const x of [1, 11]) { p.fill(x, 1, 7, x, 4, 7, 'spruce_log', axis('y')); p.fill(x, 1, 4, x, 4, 4, 'spruce_log', axis('y')); }
  for (const x of [1, 11]) for (const z of [3, 5]) { p.set(x, 2, z, 'spruce_fence'); p.set(x, 3, z, 'spruce_fence'); }
  for (const x of [3, 9]) p.set(x, 3, 1, 'spruce_fence');
  // barn gate: three fence gates, open above
  p.fill(5, 1, 7, 7, 3, 7, null);
  for (let x = 5; x <= 7; x++) p.set(x, 1, 7, 'spruce_fence_gate', gate('south'));
  p.fill(4, 4, 7, 8, 4, 7, 'stripped_spruce_log', axis('x'));
  gableRoofX(p, 1, 11, 0, 8, 5, 'dark_oak_stairs', 'spruce_planks', 'dark_oak_slab');
  for (const x of [3, 6, 9]) { p.fill(x, 5, 1, x, 5, 7, 'spruce_log', axis('z')); p.set(x, 4, 4, 'lantern', lantern(true)); }
  // stalls: hay troughs along the back wall, fence partitions, water cauldron
  for (const x of [2, 3, 5, 7, 9, 10]) p.set(x, 1, 2, 'hay_block', axis('x'));
  p.set(6, 1, 2, 'water_cauldron', waterCauldron);
  for (const x of [4, 8]) p.fill(x, 1, 2, x, 1, 4, 'spruce_fence');
  p.set(2, 1, 6, 'barrel', barrel('up')); p.set(2, 2, 6, 'barrel', barrel('up'));
  p.set(10, 1, 6, 'chest', chest('west')); p.set(10, 1, 5, 'composter');
  // paddock in front
  p.fill(0, 1, 7, 0, 1, 14, 'oak_fence'); p.fill(12, 1, 7, 12, 1, 14, 'oak_fence'); p.fill(0, 1, 14, 12, 1, 14, 'oak_fence');
  p.set(6, 1, 14, 'oak_fence_gate', gate('south'));
  for (const x of [5, 7]) p.set(x, 2, 14, 'lantern', lantern());
  p.fill(9, 0, 10, 10, 0, 11, 'water', water());
  for (const [x, z] of [[2, 13], [3, 13]] as const) p.set(x, 1, z, 'hay_block', axis('y'));
  for (const [x, z] of [[3, 10], [5, 12], [10, 13]] as const) tallPlant(p, x, 1, z, 'tall_grass');
  return p.payload();
}

function schafweide() {
  const p = new Plot([16, 9, 11]);
  ground(p, 16, 11);
  // pasture
  p.ring(0, 0, 10, 10, 1, 'oak_fence');
  p.set(5, 1, 10, 'oak_fence_gate', gate('south'));
  // shearing shed, open towards the pasture
  p.fill(10, 0, 2, 14, 0, 8, 'spruce_planks');
  p.fill(10, 1, 3, 10, 3, 7, null);
  p.fill(11, 1, 2, 13, 3, 2, 'spruce_planks'); p.fill(11, 1, 8, 13, 3, 8, 'spruce_planks'); p.fill(14, 1, 3, 14, 3, 7, 'spruce_planks');
  for (const [x, z] of [[10, 2], [14, 2], [10, 8], [14, 8], [14, 5]] as const) p.fill(x, 1, z, x, 3, z, 'spruce_log', axis('y'));
  p.fill(10, 1, 3, 10, 1, 7, 'spruce_fence'); p.set(10, 1, 5, 'spruce_fence_gate', gate('west'));
  p.fill(11, 1, 3, 13, 3, 7, null);
  p.set(14, 2, 4, 'glass_pane'); p.set(14, 2, 6, 'glass_pane');
  gableRoof(p, 9, 15, 2, 8, 4, 'spruce_stairs', 'spruce_planks', 'spruce_slab');
  p.fill(12, 4, 3, 12, 4, 7, 'spruce_log', axis('z')); p.set(12, 3, 5, 'lantern', lantern(true));
  p.set(13, 1, 3, 'loom', { facing: 'west' }); p.set(11, 1, 3, 'hay_block', axis('y'));
  p.set(13, 1, 4, 'chest', chest('west'));
  for (const [x, id] of [[11, 'white_wool'], [12, 'light_gray_wool']] as const) p.set(x, 1, 7, id);
  p.set(11, 2, 7, 'white_wool'); p.set(13, 1, 7, 'barrel', barrel('up')); p.set(13, 1, 6, 'crafting_table');
  // trough and meadow
  p.fill(2, 0, 2, 3, 0, 2, 'water', water());
  for (let x = 1; x <= 9; x++) for (let z = 4; z <= 9; z++) if (noise(x, 1, z) > 0.84) p.set(x, 1, z, x % 2 ? 'dandelion' : 'oxeye_daisy');
  for (const [x, z] of [[7, 2], [2, 7]] as const) tallPlant(p, x, 1, z, 'tall_grass');
  return p.payload();
}

function schweinestall() {
  const p = new Plot([13, 8, 12]);
  ground(p, 13, 12);
  for (let x = 1; x <= 10; x++) for (let z = 2; z <= 10; z++) p.set(x, 0, z, noise(x, 0, z) > 0.55 ? 'podzol' : 'coarse_dirt', noise(x, 0, z) > 0.55 ? grass() : {});
  // mud wallow with a puddle
  for (let x = 1; x <= 6; x++) for (let z = 5; z <= 10; z++)
    if (((x - 3.5) / 2.6) ** 2 + ((z - 7.5) / 2.2) ** 2 + (noise(x, 2, z) - 0.5) * 0.4 <= 1) p.set(x, 0, z, 'mud');
  p.set(3, 0, 7, 'water', water()); p.set(4, 0, 8, 'water', water());
  p.ring(0, 1, 11, 11, 1, 'cobblestone_wall');
  p.set(4, 1, 11, 'oak_fence_gate', { facing: 'south', in_wall: T, open: F, powered: F });
  for (const [x, z] of [[0, 1], [0, 11], [11, 11]] as const) p.set(x, 2, z, 'lantern', lantern());
  // hut in the corner
  p.fill(8, 0, 2, 10, 0, 4, 'spruce_planks');
  p.room(7, 1, 11, 5, 1, 2, 'spruce_planks');
  for (const [x, z] of [[7, 1], [11, 1], [7, 5], [11, 5]] as const) p.fill(x, 1, z, x, 2, z, 'spruce_log', axis('y'));
  p.air(7, 1, 3); p.air(7, 2, 3);
  gableRoofX(p, 7, 11, 0, 6, 3, 'spruce_stairs', 'spruce_planks', 'spruce_slab');
  p.set(10, 1, 2, 'hay_block', axis('y')); p.set(10, 1, 4, 'barrel', barrel('up')); p.set(9, 1, 2, 'composter');
  // feeding and drinking
  p.set(10, 1, 9, 'water_cauldron', waterCauldron); p.set(1, 1, 2, 'hay_block', axis('x')); p.set(2, 1, 2, 'hay_block', axis('x'));
  return p.payload();
}

function pferdestall() {
  const p = new Plot([13, 12, 14]);
  ground(p, 13, 14);
  p.fill(0, 0, 1, 12, 0, 12, 'cobblestone');
  p.fill(1, 0, 2, 11, 0, 4, 'coarse_dirt'); p.fill(1, 0, 9, 11, 0, 11, 'coarse_dirt'); p.fill(1, 0, 6, 11, 0, 7, 'stone_bricks');
  p.room(0, 1, 12, 12, 1, 4, 'spruce_planks');
  p.ring(0, 1, 12, 12, 1, 'cobblestone');
  for (const x of [0, 4, 8, 12]) for (const z of [1, 12]) p.fill(x, 1, z, x, 4, z, 'spruce_log', axis('y'));
  for (const x of [0, 12]) for (const z of [5, 8]) p.fill(x, 1, z, x, 4, z, 'spruce_log', axis('y'));
  // boxes: plank partitions, fence fronts with gates
  for (const x of [4, 8]) for (const [z0, z1] of [[2, 4], [9, 11]] as const) { p.fill(x, 1, z0, x, 2, z1, 'spruce_planks'); p.fill(x, 3, z0, x, 3, z1, 'spruce_fence'); }
  for (const z of [5, 8]) {
    p.fill(1, 1, z, 11, 1, z, 'spruce_fence');
    for (const x of [4, 8]) p.fill(x, 1, z, x, 3, z, 'stripped_spruce_log', axis('y'));
    for (const x of [2, 6, 10]) p.set(x, 1, z, 'spruce_fence_gate', gate('south'));
  }
  for (const x of [1, 5, 9]) { p.set(x, 1, 2, 'hay_block', axis('y')); p.set(x, 1, 11, 'hay_block', axis('y')); }
  for (const x of [3, 7, 11]) { p.set(x, 1, 2, 'water_cauldron', waterCauldron); p.set(x, 1, 11, 'water_cauldron', waterCauldron); }
  for (const x of [2, 6, 10]) { p.set(x, 3, 1, 'glass_pane'); p.set(x, 3, 12, 'glass_pane'); }
  // double doors at both aisle ends
  door(p, 0, 1, 6, 'spruce', 'east', 'left'); door(p, 0, 1, 7, 'spruce', 'east', 'right');
  door(p, 12, 1, 6, 'spruce', 'west', 'right'); door(p, 12, 1, 7, 'spruce', 'west', 'left');
  gableRoofX(p, 0, 12, 0, 13, 5, 'dark_oak_stairs', 'spruce_planks', null);
  for (const x of [4, 8]) { p.fill(x, 5, 1, x, 5, 12, 'spruce_log', axis('z')); p.set(x, 4, 6, 'lantern', lantern(true)); }
  // tack corner outside: hitching rail and saddle chest
  p.fill(2, 1, 13, 4, 1, 13, 'spruce_fence'); p.set(8, 1, 13, 'chest', chest('south')); p.set(9, 1, 13, 'barrel', barrel('up'));
  return p.payload();
}

function kaninchenstall() {
  const p = new Plot([10, 6, 8]);
  ground(p, 10, 8);
  p.ring(0, 0, 9, 7, 1, 'oak_fence');
  p.set(4, 1, 7, 'oak_fence_gate', gate('south'));
  for (const [x, z] of [[0, 0], [9, 0], [0, 7], [9, 7]] as const) { p.set(x, 1, z, 'oak_log', axis('y')); p.set(x, 2, z, 'lantern', lantern()); }
  // hutch with a low entrance
  p.set(6, 0, 2, 'hay_block', axis('y'));
  p.ring(5, 1, 7, 3, 1, 'spruce_planks'); p.air(6, 1, 2); p.air(6, 1, 3);
  gableRoof(p, 4, 8, 1, 3, 2, 'spruce_stairs', 'spruce_planks', 'spruce_slab');
  // carrot bed watered from the middle
  for (let x = 1; x <= 3; x++) for (let z = 4; z <= 6; z++) {
    if (x === 2 && z === 5) { p.set(x, 0, z, 'water', water()); p.set(x, 1, z, 'lily_pad'); continue; }
    p.set(x, 0, z, 'farmland', farmland()); p.set(x, 1, z, 'carrots', crop(7));
  }
  for (const [x, z] of [[1, 1], [3, 2], [8, 5], [6, 6]] as const) p.set(x, 1, z, 'dandelion');
  p.set(8, 1, 1, 'hay_block', axis('y')); p.set(8, 1, 3, 'barrel', barrel('up'));
  return p.payload();
}

// ------------------------------------------------------------ Wasser und Sonderkulturen

function fischteich() {
  const p = new Plot([14, 6, 12]);
  const pond = (x: number, z: number) => ((x - 6.5) / 5.2) ** 2 + ((z - 5) / 3.7) ** 2 + (noise(x, 0, z) - 0.5) * 0.3 <= 1;
  for (let x = 0; x < 14; x++) for (let z = 0; z < 12; z++) {
    if (pond(x, z)) { p.set(x, 0, z, noise(x, 1, z) > 0.6 ? 'gravel' : 'sand'); p.set(x, 1, z, 'water', water()); p.set(x, 2, z, 'water', water()); continue; }
    p.set(x, 0, z, 'dirt'); p.set(x, 1, z, 'dirt');
    const shore = pond(x + 1, z) || pond(x - 1, z) || pond(x, z + 1) || pond(x, z - 1);
    p.set(x, 2, z, shore && noise(x, 2, z) > 0.45 ? 'sand' : 'grass_block', shore && noise(x, 2, z) > 0.45 ? {} : grass());
    if (shore && noise(x, 3, z) > 0.72) { p.set(x, 3, z, 'sugar_cane', { age: '0' }); p.set(x, 4, z, 'sugar_cane', { age: '0' }); }
  }
  for (let x = 0; x < 14; x++) for (let z = 0; z < 12; z++) if (pond(x, z)) {
    if (noise(x, 5, z) < 0.18) p.set(x, 1, z, 'seagrass');
    else if (noise(x, 6, z) > 0.86) p.set(x, 3, z, 'lily_pad');
  }
  // jetty from the south shore
  for (let z = 6; z <= 10; z++) for (const x of [6, 7]) { p.set(x, 2, z, 'spruce_planks'); p.clear(x, 3, z); }
  for (const x of [6, 7]) { p.set(x, 1, 6, 'spruce_log', axis('y')); p.set(x, 0, 6, 'spruce_log', axis('y')); }
  chair(p, 6, 3, 6, 'spruce', 'south');
  p.set(7, 3, 6, 'spruce_fence'); p.set(7, 4, 6, 'lantern', lantern());
  p.set(7, 3, 8, 'barrel', barrel('up'));
  // smoke stand on the shore
  for (let x = 11; x <= 13; x++) for (let z = 9; z <= 11; z++) { p.set(x, 2, z, 'grass_block', grass()); p.clear(x, 3, z); p.clear(x, 4, z); }
  for (const [x, z] of [[11, 9], [11, 11], [13, 9], [13, 11]] as const) p.fill(x, 3, z, x, 4, z, 'spruce_fence');
  p.fill(11, 5, 9, 13, 5, 11, 'spruce_slab', slab());
  p.set(12, 3, 9, 'barrel', barrel('up')); p.set(12, 3, 10, 'smoker', furnace('west')); p.set(12, 3, 11, 'chest', chest('west'));
  p.set(12, 4, 10, 'lantern', lantern(true));
  return p.payload();
}

function seetangfarm() {
  const p = new Plot([12, 9, 7]);
  p.fill(0, 0, 0, 11, 0, 6, 'stone_bricks');
  for (let x = 1; x <= 7; x++) for (let z = 1; z <= 3; z++) {
    const plant = (x + z) % 2 === 1;
    p.set(x, 0, z, !plant && z === 2 ? 'sea_lantern' : 'sand');
    for (let y = 1; y <= 5; y++) {
      if (plant) p.set(x, y, z, y === 5 ? 'kelp' : 'kelp_plant', y === 5 ? kelp(25) : {});
      else p.set(x, y, z, 'water', water());
    }
  }
  for (let y = 1; y <= 5; y++) {
    for (let x = 1; x <= 7; x++) { p.set(x, y, 0, 'glass'); p.set(x, y, 4, 'glass'); }
    for (let z = 1; z <= 3; z++) { p.set(0, y, z, 'glass'); p.set(8, y, z, 'glass'); }
    for (const [x, z] of [[0, 0], [8, 0], [0, 4], [8, 4]] as const) p.set(x, y, z, 'stone_bricks');
  }
  p.ring(0, 0, 8, 4, 6, 'smooth_stone_slab', slab());
  p.fill(9, 1, 2, 9, 5, 2, 'ladder', { facing: 'east', waterlogged: F });
  // drying station along the walkway
  p.fill(0, 0, 5, 11, 0, 6, 'spruce_planks');
  p.set(2, 1, 6, 'furnace', furnace('north')); p.set(3, 1, 6, 'smoker', furnace('north'));
  p.set(4, 1, 6, 'chest', chest('north'));
  p.set(6, 1, 6, 'dried_kelp_block'); p.set(7, 1, 6, 'dried_kelp_block'); p.set(6, 2, 6, 'dried_kelp_block');
  p.set(6, 3, 6, 'lantern', lantern()); p.set(8, 1, 6, 'composter'); p.set(10, 1, 6, 'barrel', barrel('up'));
  return p.payload();
}

function bambusfarm() {
  const p = new Plot([16, 12, 12]);
  ground(p, 16, 12);
  for (let x = 0; x <= 10; x++) for (let z = 0; z <= 10; z++) {
    const edge = x === 0 || z === 0 || x === 10 || z === 10;
    p.set(x, 0, z, edge ? 'dirt_path' : 'podzol', edge ? {} : grass());
  }
  for (let x = 1; x <= 9; x += 2) for (let z = 1; z <= 9; z += 2) {
    const h = 6 + Math.floor(noise(x, 0, z) * 4);
    for (let y = 1; y <= h; y++) p.set(x, y, z, 'bamboo', bam(y >= h - 1 ? 'large' : y === h - 2 ? 'small' : 'none'));
  }
  // open bamboo shed
  p.fill(11, 0, 1, 14, 0, 5, 'bamboo_planks');
  for (const [x, z] of [[11, 1], [14, 1], [11, 5], [14, 5]] as const) p.fill(x, 1, z, x, 3, z, 'bamboo_block', axis('y'));
  p.fill(10, 4, 0, 15, 4, 6, 'bamboo_slab', slab());
  p.fill(10, 4, 0, 15, 4, 0, 'bamboo_stairs', stairs('south')); p.fill(10, 4, 6, 15, 4, 6, 'bamboo_stairs', stairs('north'));
  p.set(12, 1, 2, 'scaffolding', scaffold); p.set(12, 2, 2, 'scaffolding', scaffold);
  p.set(13, 1, 1, 'crafting_table'); p.set(14, 1, 3, 'chest', chest('west')); p.set(14, 1, 2, 'composter');
  p.set(12, 1, 5, 'bamboo_block', axis('y')); p.set(13, 1, 5, 'bamboo_block', axis('y')); p.set(12, 2, 5, 'bamboo_block', axis('x'));
  p.set(14, 1, 4, 'barrel', barrel('up'));
  p.set(13, 3, 3, 'lantern', lantern(true));
  lampPost(p, 10, 1, 11, 'bamboo_fence', 2);
  return p.payload();
}

function suessbeeren() {
  const p = new Plot([17, 6, 11]);
  ground(p, 17, 11);
  p.ring(0, 0, 12, 10, 1, 'spruce_fence');
  p.set(6, 1, 10, 'spruce_fence_gate', gate('south'));
  for (const [x, z] of [[0, 0], [12, 0], [0, 10], [12, 10]] as const) { p.set(x, 1, z, 'spruce_log', axis('y')); p.set(x, 2, z, 'lantern', lantern()); }
  for (let x = 1; x <= 11; x++) for (let z = 1; z <= 9; z++) {
    if (x === 6 || z === 3 || z === 6 || z === 9) { p.set(x, 0, z, 'dirt_path'); continue; }
    p.set(x, 1, z, 'sweet_berry_bush', berries(noise(x, 1, z) > 0.3 ? 3 : 2));
  }
  // picking stand with striped awning
  for (const [x, z] of [[13, 1], [16, 1], [13, 5], [16, 5]] as const) p.fill(x, 1, z, x, 2, z, 'spruce_fence');
  for (let x = 13; x <= 16; x++) for (let z = 1; z <= 5; z++) p.set(x, 3, z, z % 2 ? 'red_wool' : 'white_wool');
  for (let z = 1; z <= 5; z++) p.set(12, 3, z, 'spruce_slab', slab());
  for (const z of [2, 3, 4]) p.set(13, 1, z, 'barrel', barrel('up'));
  p.set(15, 1, 2, 'chest', chest('west')); p.set(15, 1, 4, 'composter'); p.set(16, 1, 3, 'spruce_stairs', stairs('east'));
  p.set(14, 2, 3, 'lantern', lantern(true));
  return p.payload();
}

function netherwarze() {
  const p = new Plot([11, 5, 9]);
  p.fill(0, 0, 0, 10, 0, 8, 'polished_blackstone_bricks');
  for (let x = 1; x <= 9; x++) for (let z = 1; z <= 7; z++) {
    if (x === 5) continue;
    p.set(x, 0, z, 'soul_sand'); p.set(x, 1, z, 'nether_wart', { age: noise(x, 1, z) > 0.25 ? '3' : '2' });
  }
  p.ring(0, 0, 10, 8, 1, 'red_nether_brick_wall');
  p.air(5, 1, 8);
  for (const [x, z] of [[0, 0], [10, 0], [0, 8], [10, 8]] as const) { p.fill(x, 1, z, x, 2, z, 'nether_bricks'); p.set(x, 3, z, 'soul_lantern', lantern()); }
  for (const x of [4, 6]) p.set(x, 2, 8, 'soul_lantern', lantern());
  p.set(5, 1, 1, 'brewing_stand', { has_bottle_0: F, has_bottle_1: F, has_bottle_2: F });
  p.set(5, 1, 0, 'nether_bricks'); p.set(5, 2, 0, 'nether_brick_fence'); p.set(5, 3, 0, 'soul_lantern', lantern());
  return p.payload();
}

// ------------------------------------------------------------ Dorfbewohner

function zuchthaus() {
  const p = new Plot([13, 12, 13]);
  ground(p, 13, 13);
  p.fill(1, 0, 1, 11, 0, 11, 'spruce_planks');
  p.room(1, 1, 11, 11, 1, 5, 'oak_planks');
  for (const [x, z] of [[1, 1], [11, 1], [1, 11], [11, 11], [6, 1], [1, 6], [11, 6]] as const) p.fill(x, 1, z, x, 5, z, 'oak_log', axis('y'));
  for (const [x, z] of [[3, 1], [9, 1], [1, 3], [1, 9], [11, 3], [11, 9], [3, 11], [9, 11]] as const) { p.set(x, 2, z, 'glass_pane'); p.set(x, 3, z, 'glass_pane'); }
  // entrance: fence gate, villagers cannot open it
  p.set(6, 1, 11, 'oak_fence_gate', gate('south')); p.air(6, 2, 11);
  p.fill(2, 5, 2, 10, 5, 10, 'oak_planks');
  hipRoof(p, 0, 12, 0, 12, 5, 'spruce_stairs', 'spruce_slab');
  // four beds, workstation, field
  for (const x of [3, 5, 7, 9]) bed(p, x, 1, 3, 'white', 'north');
  p.set(2, 1, 2, 'barrel', barrel('up')); p.set(10, 1, 2, 'chest', chest('south'));
  p.set(6, 1, 5, 'composter');
  for (let x = 3; x <= 9; x++) for (let z = 7; z <= 9; z++) {
    if (x === 6 && z === 8) { p.set(x, 0, z, 'water', water()); p.set(x, 1, z, 'oak_slab', slab()); continue; }
    p.set(x, 0, z, 'farmland', farmland()); p.set(x, 1, z, x % 2 ? 'carrots' : 'potatoes', crop(7));
  }
  for (const [x, z] of [[4, 5], [8, 5], [6, 9]] as const) p.set(x, 4, z, 'lantern', lantern(true));
  return p.payload();
}

const STATIONS_N: readonly [string, Props][] = [
  ['composter', {}], ['smoker', furnace('south')], ['loom', { facing: 'south' }], ['cauldron', {}], ['fletching_table', {}],
];
const STATIONS_S: readonly [string, Props][] = [
  ['barrel', barrel('north')], ['lectern', lectern('north')], ['cartography_table', {}],
  ['brewing_stand', { has_bottle_0: F, has_bottle_1: F, has_bottle_2: F }], ['stonecutter', { facing: 'north' }],
];

function handelsscheune() {
  const p = new Plot([13, 12, 12]);
  ground(p, 13, 12);
  p.fill(0, 0, 1, 12, 0, 10, 'spruce_planks'); p.fill(1, 0, 5, 11, 0, 6, 'stone_bricks');
  p.room(0, 1, 12, 10, 1, 4, 'spruce_planks');
  p.ring(0, 1, 12, 10, 1, 'cobblestone');
  for (const [x, z] of [[0, 1], [12, 1], [0, 10], [12, 10], [6, 1], [6, 10]] as const) p.fill(x, 1, z, x, 4, z, 'spruce_log', axis('y'));
  // two rows of trade cells facing the aisle
  for (const x of [1, 3, 5, 7, 9, 11]) { p.fill(x, 1, 2, x, 3, 4, 'spruce_planks'); p.fill(x, 1, 7, x, 3, 9, 'spruce_planks'); }
  p.fill(1, 3, 2, 11, 3, 3, 'spruce_planks'); p.fill(1, 3, 8, 11, 3, 9, 'spruce_planks');
  p.fill(1, 3, 4, 11, 3, 4, 'stripped_spruce_log', axis('x')); p.fill(1, 3, 7, 11, 3, 7, 'stripped_spruce_log', axis('x'));
  [2, 4, 6, 8, 10].forEach((x, i) => {
    const [nId, nProps] = STATIONS_N[i]!, [sId, sProps] = STATIONS_S[i]!;
    p.set(x, 1, 2, nId, nProps); p.air(x, 2, 2); p.air(x, 1, 3); p.air(x, 2, 3); p.set(x, 1, 4, 'spruce_fence'); p.air(x, 2, 4);
    p.set(x, 1, 9, sId, sProps); p.air(x, 2, 9); p.air(x, 1, 8); p.air(x, 2, 8); p.set(x, 1, 7, 'spruce_fence'); p.air(x, 2, 7);
  });
  door(p, 0, 1, 5, 'spruce', 'east', 'left'); door(p, 0, 1, 6, 'spruce', 'east', 'right');
  door(p, 12, 1, 5, 'spruce', 'west', 'right'); door(p, 12, 1, 6, 'spruce', 'west', 'left');
  gableRoofX(p, 0, 12, 0, 11, 5, 'spruce_stairs', 'spruce_planks', null);
  for (const x of [3, 6, 9]) { p.fill(x, 5, 1, x, 5, 10, 'spruce_log', axis('z')); p.set(x, 4, 5, 'lantern', lantern(true)); }
  return p.payload();
}

// ------------------------------------------------------------ Imkerei

function imkerei() {
  const p = new Plot([16, 9, 12]);
  ground(p, 16, 12);
  // beekeeper's hut
  p.fill(2, 0, 2, 4, 0, 4, 'spruce_planks');
  p.room(1, 1, 5, 5, 1, 3, 'spruce_planks');
  for (const [x, z] of [[1, 1], [5, 1], [1, 5], [5, 5]] as const) p.fill(x, 1, z, x, 3, z, 'spruce_log', axis('y'));
  door(p, 3, 1, 5, 'spruce', 'south'); p.set(1, 2, 3, 'glass_pane'); p.set(5, 2, 3, 'glass_pane');
  gableRoof(p, 0, 6, 1, 5, 4, 'spruce_stairs', 'spruce_planks', 'spruce_slab');
  hangingLamp(p, 3, 7, 3, 2);
  p.set(2, 1, 2, 'barrel', barrel('up')); p.set(2, 2, 2, 'candle', candle(3, false));
  p.set(4, 1, 2, 'honey_block'); p.set(4, 1, 3, 'honeycomb_block'); p.set(2, 1, 3, 'chest', chest('east'));
  p.set(4, 1, 4, 'crafting_table');
  // hives over campfires: the smoke keeps the bees calm when harvesting
  for (const x of [8, 10, 12, 14]) {
    p.set(x, 1, 2, 'campfire', campfire('south'));
    p.set(x, 2, 2, 'beehive', x === 10 ? { facing: 'south', honey_level: '5' } : beehive('south'));
    p.set(x, 3, 2, 'spruce_slab', slab());
  }
  // path and flower meadow
  for (let x = 3; x <= 15; x++) p.set(x, 0, 6, 'dirt_path');
  for (let z = 7; z <= 11; z++) p.set(3, 0, z, 'dirt_path');
  for (let x = 0; x <= 15; x++) for (let z = 3; z <= 11; z++) {
    if (z === 6 || x === 3 || (x <= 6 && z <= 6) || p.has(x, 1, z)) continue;
    const n = noise(x, 1, z);
    if (n > 0.92 && z > 7) tallPlant(p, x, 1, z, ['lilac', 'peony', 'rose_bush'][(x + z) % 3]!);
    else if (n > 0.35) p.set(x, 1, z, FLOWERS[(x * 3 + z) % FLOWERS.length]!);
  }
  lampPost(p, 6, 1, 5, 'spruce_fence', 2); lampPost(p, 15, 1, 7, 'spruce_fence', 2);
  return p.payload();
}

const TIP_WIKI = (page: string, label: string) => [WIKI(page, label)];

export const HOF_SPECS: readonly BuildingSpec[] = [
  { id: 'bld_hof_kuhstall', name: 'Kuhstall', payload: kuhstall, tags: ['kühe', 'stall', 'koppel'],
    description: 'Kuhstall mit Heutrögen, zwei Zaunabtrennungen, Wasserkessel, Milchfässern und eingezäunter Koppel mit Tränke vor dem Tor.',
    facets: { kategorie: ['landwirtschaft'], stil: ['rustikal'], biom: ['ebene', 'ueberall'], funktion: ['tierhaltung'] },
    gaps: ['minecraft:water'], assumed: ['minecraft:cauldron'],
    tips: ['Kühe folgen Weizen in der Hand; zwei gefütterte Kühe bekommen ein Kalb.', 'Zauntore sind 1,5 Blöcke hoch – Kühe springen nicht darüber.'],
    inspiration: TIP_WIKI('Cow', 'Kuh') },
  { id: 'bld_hof_schafweide', name: 'Schafweide mit Scherstall', payload: schafweide, tags: ['schafe', 'wolle', 'weide'],
    description: 'Eingezäunte Schafweide mit Tränke und offenem Scherstall: Webstuhl, Truhe, Wollballen, Heu und Laterne unter dem Satteldach.',
    facets: { kategorie: ['landwirtschaft'], stil: ['rustikal', 'nordisch'], biom: ['ebene', 'taiga'], funktion: ['tierhaltung', 'handwerk'] },
    gaps: ['minecraft:water'],
    tips: ['Geschorene Schafe fressen Gras und bekommen so ihre Wolle zurück – die Weide braucht freie Grasflächen.'],
    inspiration: TIP_WIKI('Sheep', 'Schaf') },
  { id: 'bld_hof_schweinestall', name: 'Schweinestall mit Suhle', payload: schweinestall, tags: ['schweine', 'schlamm', 'suhle'],
    description: 'Ummauerter Schweinepferch mit Schlammsuhle und Pfütze, Futterheu, Wasserkessel und kleinem Stall mit Satteldach.',
    facets: { kategorie: ['landwirtschaft'], stil: ['rustikal'], biom: ['ebene', 'sumpf'], funktion: ['tierhaltung'] },
    gaps: ['minecraft:water'], assumed: ['minecraft:cauldron'],
    tips: ['Schweine lassen sich mit Karotten, Kartoffeln oder Roter Bete locken und vermehren.', 'Neben Mauern liegt ein Zauntor tiefer (in_wall) und schließt bündig ab.'],
    inspiration: TIP_WIKI('Pig', 'Schwein') },
  { id: 'bld_hof_pferdestall', name: 'Pferdestall', payload: pferdestall, tags: ['pferde', 'boxen', 'stall'],
    description: 'Pferdestall mit sechs Boxen beiderseits einer Stallgasse, Heu und Wasser je Box, Doppeltüren an beiden Enden und Anbindebalken.',
    facets: { kategorie: ['landwirtschaft'], stil: ['rustikal', 'mittelalterlich'], biom: ['ebene', 'savanne'], funktion: ['tierhaltung', 'transport'] },
    assumed: ['minecraft:cauldron'],
    tips: ['Die Gasse ist zwei Blöcke breit, damit Pferde (1,4 Blöcke) hindurchpassen.', 'Pferde ohne Reiter springen nicht über Zäune.'],
    inspiration: TIP_WIKI('Horse', 'Pferd') },
  { id: 'bld_hof_kaninchenstall', name: 'Kaninchenstall', payload: kaninchenstall, tags: ['kaninchen', 'karotten', 'gehege'],
    description: 'Kleines Kaninchengehege mit Holzhütte und Heu-Einstreu, bewässertem Karottenbeet, Löwenzahn und Laternenpfosten.',
    facets: { kategorie: ['landwirtschaft'], stil: ['rustikal'], biom: ['wald', 'ebene'], funktion: ['tierhaltung', 'landwirtschaft'] },
    gaps: ['minecraft:water'], assumed: ['minecraft:dirt'],
    tips: ['Kaninchen fressen reife Karotten vom Feld – das Beet ist hier Futterquelle.', 'Kaninchen vermehren sich mit Karotten, Goldenen Karotten oder Löwenzahn.'],
    inspiration: TIP_WIKI('Rabbit', 'Kaninchen') },
  { id: 'bld_hof_fischteich', name: 'Fischteich', payload: fischteich, tags: ['angeln', 'steg', 'teich'],
    description: 'Zwei Blöcke tiefer Fischteich mit Seegras, Seerosen und Zuckerrohr am Ufer, Angelsteg mit Bank sowie Räucherstand mit Räucherofen.',
    facets: { kategorie: ['landwirtschaft'], stil: ['rustikal'], biom: ['ebene', 'wald'], funktion: ['wasserquelle', 'erholung'] },
    gaps: ['minecraft:water'],
    tips: ['Angeln klappt nur, wenn über dem Köder freier Himmel bzw. offenes Wasser ist.', 'Kabeljau und Lachs lassen sich mit einem Wassereimer einsetzen.'],
    inspiration: TIP_WIKI('Fishing', 'Angeln') },
  { id: 'bld_hof_seetangfarm', name: 'Seetangfarm', payload: seetangfarm, tags: ['seetang', 'aquarium', 'trocknen'],
    description: 'Gläsernes Becken mit Seetang auf Sand, Seelaternen im Boden, Leiter zum Rand und Trockenstation mit Ofen, Räucherofen und Seetangblöcken.',
    facets: { kategorie: ['landwirtschaft'], stil: ['kuestenstil'], biom: ['kueste', 'ozean'], funktion: ['landwirtschaft', 'ressourcen'] },
    gaps: ['minecraft:water'],
    tips: ['Seetang nur oberhalb des untersten Blocks ernten – er wächst nach.', 'Getrockneter Seetangblock brennt 20 Gegenstände im Ofen.'],
    inspiration: TIP_WIKI('Kelp', 'Seetang') },
  { id: 'bld_hof_bambusfarm', name: 'Bambusfarm', payload: bambusfarm, tags: ['bambus', 'gerüst', 'hain'],
    description: 'Bambushain aus 25 Stauden auf Podsol, umrandet von einem Trampelpfad, mit offenem Bambusschuppen für Gerüste, Truhe und Komposter.',
    facets: { kategorie: ['landwirtschaft'], stil: ['fernoestlich', 'tropisch'], biom: ['dschungel', 'ueberall'], funktion: ['landwirtschaft', 'ressourcen'] },
    assumed: ['minecraft:dirt'],
    tips: ['Bambus wächst bis 12–16 Blöcke hoch; den untersten Block stehen lassen.', 'Bambus ist ein guter Ofenbrennstoff und ergibt Gerüste.'],
    inspiration: TIP_WIKI('Bamboo', 'Bambus') },
  { id: 'bld_hof_suessbeeren', name: 'Süßbeeren-Plantage', payload: suessbeeren, tags: ['beeren', 'plantage', 'marktstand'],
    description: 'Eingezäunte Plantage mit Süßbeerensträuchern in Reihen zwischen Trampelpfaden und einem Pflückstand mit gestreiftem Wolldach.',
    facets: { kategorie: ['landwirtschaft'], stil: ['rustikal', 'nordisch'], biom: ['taiga', 'ueberall'], funktion: ['landwirtschaft', 'kochen'] },
    assumed: ['minecraft:dirt'],
    tips: ['Die Sträucher stechen und bremsen – deshalb die Pfade zwischen den Reihen.', 'Reife Beeren (Stufe 3) per Rechtsklick ernten, der Strauch bleibt stehen.'],
    inspiration: TIP_WIKI('Sweet_Berries', 'Süße Beeren') },
  { id: 'bld_hof_netherwarze', name: 'Netherwarzen-Beet', payload: netherwarze, tags: ['netherwarze', 'seelensand', 'brauen'],
    description: 'Zwei Seelensand-Beete mit Netherwarzen in einer Rotnetherziegel-Einfassung, Seelenlaternen auf Pfeilern und Braustand am Kopfende.',
    facets: { kategorie: ['landwirtschaft'], stil: ['nether'], biom: ['nether', 'ueberall'], funktion: ['landwirtschaft'] },
    tips: ['Netherwarzen wachsen in jeder Dimension, brauchen aber Seelensand und kein Wasser.'],
    inspiration: TIP_WIKI('Nether_Wart', 'Netherwarze') },
  { id: 'bld_hof_zuchthaus', name: 'Dorfbewohner-Zuchthaus', payload: zuchthaus, tags: ['dorfbewohner', 'betten', 'vermehren'],
    description: 'Geschlossenes Zuchthaus mit vier Betten, Komposter als Arbeitsplatz, bewässertem Karotten- und Kartoffelfeld und Zauntor als Eingang.',
    facets: { kategorie: ['farm'], stil: ['rustikal'], biom: ['ueberall'], funktion: ['ressourcen', 'handelsplatz'] },
    gaps: ['minecraft:water'], assumed: ['minecraft:dirt'],
    tips: ['Zwei Dorfbewohner vermehren sich, wenn freie Betten da sind und sie genug Nahrung haben – der Bauer wirft ihnen Feldfrüchte zu.', 'Dorfbewohner können Zauntore nicht öffnen.'],
    inspiration: TIP_WIKI('Villager', 'Dorfbewohner') },
  { id: 'bld_hof_handelsscheune', name: 'Handelsscheune', payload: handelsscheune, tags: ['dorfbewohner', 'arbeitsplätze', 'handel'],
    description: 'Scheune mit zehn Handelsboxen in zwei Reihen, je ein anderer Arbeitsblock (Bauer bis Steinmetz) hinter dem Händler, Zaun als Tresen und Mittelgang mit Doppeltüren.',
    facets: { kategorie: ['farm'], stil: ['rustikal'], biom: ['ueberall'], funktion: ['handelsplatz', 'handel'] },
    tips: ['Über den Zaun hinweg handeln: er ist 1,5 Blöcke hoch, darüber bleibt die Öffnung frei.', 'Die Boxdecke verhindert, dass Händler auf ihren Arbeitsblock springen.'],
    inspiration: TIP_WIKI('Trading', 'Handel') },
  { id: 'bld_hof_imkerei', name: 'Imkerei', payload: imkerei, tags: ['bienen', 'honig', 'imker'],
    description: 'Imkerhütte mit Honig- und Wabenblock, vier Bienenstöcke über Lagerfeuern mit Schutzdach und eine große Blumenwiese am Weg.',
    facets: { kategorie: ['landwirtschaft'], stil: ['rustikal'], biom: ['ebene', 'wald', 'kirschhain'], funktion: ['tierhaltung', 'ressourcen'] },
    assumed: ['minecraft:dirt'],
    tips: ['Ein Lagerfeuer bis 5 Blöcke unter dem Stock beruhigt die Bienen beim Ernten mit Schere oder Flasche.', 'Bienen verlassen den Stock nur nach vorne – die Wiese liegt deshalb davor.'],
    inspiration: TIP_WIKI('Beehive', 'Bienenstock') },
];
