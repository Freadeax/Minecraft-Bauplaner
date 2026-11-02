import { Plot, F, T, axis, barrel, button, chest, dispenser, door, facing, head, hipRoof, hopper, ladder, lantern, noise, slab, stairs, wallSign } from '../plot.js';
import type { H } from '../plot.js';
import { hangingLamp } from '../furnish.js';
import { WIKI } from '../spec.js';
import type { BuildingSpec } from '../spec.js';

/**
 * Nether & End (Katalog v3): Verkehr, Handel, Wehrbau und Gärten für die
 * beiden anderen Dimensionen. Die Nether-Eisbahn und ihr Knotenpunkt teilen
 * ein Raster (Fahrspur 3 breit, Wände links und rechts, Deckel in Höhe 3),
 * damit sich die Module lückenlos aneinandersetzen lassen.
 */


/** Solid core under the inner rings of a `hipRoof`, so every roof layer rests on the one below. */
function roofCore(p: Plot, x0: number, x1: number, z0: number, z1: number, y: number, id: string): void {
  for (let i = 1; x0 + i <= x1 - i && z0 + i <= z1 - i; i++) p.fill(x0 + i, y + i - 1, z0 + i, x1 - i, y + i - 1, z1 - i, id);
}

// ------------------------------------------------------------ Nether-Eisbahn (gerade)
/** Ice lane along x: walls at z0 and z0+4, blue ice z0+1..z0+3, lid at y3. */
function iceLane(p: Plot, x0: number, x1: number, z0: number): void {
  for (let x = x0; x <= x1; x++) {
    p.set(x, 0, z0, 'polished_blackstone_bricks'); p.set(x, 0, z0 + 4, 'polished_blackstone_bricks');
    p.fill(x, 0, z0 + 1, x, 0, z0 + 3, 'blue_ice');
    for (const z of [z0, z0 + 4]) { p.set(x, 1, z, 'blackstone'); p.set(x, 2, z, x % 4 === 2 ? 'shroomlight' : 'polished_blackstone_bricks'); }
    p.fill(x, 1, z0 + 1, x, 2, z0 + 3, null);
    p.fill(x, 3, z0, x, 3, z0 + 4, 'polished_blackstone_slab', slab());
  }
}
/** The same lane along z (walls at x0 and x0+4). */
function iceLaneZ(p: Plot, z0: number, z1: number, x0: number): void {
  for (let z = z0; z <= z1; z++) {
    p.set(x0, 0, z, 'polished_blackstone_bricks'); p.set(x0 + 4, 0, z, 'polished_blackstone_bricks');
    p.fill(x0 + 1, 0, z, x0 + 3, 0, z, 'blue_ice');
    for (const x of [x0, x0 + 4]) { p.set(x, 1, z, 'blackstone'); p.set(x, 2, z, z % 4 === 2 ? 'shroomlight' : 'polished_blackstone_bricks'); }
    p.fill(x0 + 1, 1, z, x0 + 3, 2, z, null);
    p.fill(x0, 3, z, x0 + 4, 3, z, 'polished_blackstone_slab', slab());
  }
}
function eisbahn() {
  const p = new Plot([16, 4, 5]);
  iceLane(p, 0, 15, 0);
  return p.payload();
}

// ------------------------------------------------------------ Nether-Knotenpunkt
function knotenpunkt() {
  const p = new Plot([15, 8, 15]);
  iceLane(p, 0, 2, 5); iceLane(p, 12, 14, 5); iceLaneZ(p, 0, 2, 5); iceLaneZ(p, 12, 14, 5);
  // hall x3..11 / z3..11 with openings for the four lanes
  p.fill(3, 0, 3, 11, 0, 11, 'polished_blackstone_bricks');
  p.fill(4, 0, 6, 10, 0, 8, 'blue_ice'); p.fill(6, 0, 4, 8, 0, 10, 'blue_ice');
  p.fill(6, 0, 3, 8, 0, 3, 'blue_ice'); p.fill(6, 0, 11, 8, 0, 11, 'blue_ice'); p.fill(3, 0, 6, 3, 0, 8, 'blue_ice'); p.fill(11, 0, 6, 11, 0, 8, 'blue_ice');
  p.room(3, 3, 11, 11, 1, 4, 'polished_blackstone_bricks');
  p.fill(3, 1, 6, 3, 2, 8, null); p.fill(11, 1, 6, 11, 2, 8, null); p.fill(6, 1, 3, 8, 2, 3, null); p.fill(6, 1, 11, 8, 2, 11, null);
  p.fill(3, 5, 3, 11, 5, 11, 'polished_blackstone_bricks'); p.set(7, 5, 7, 'shroomlight');
  for (const [x, z] of [[3, 3], [11, 3], [3, 11], [11, 11]] as const) p.fill(x, 1, z, x, 6, z, 'basalt', axis('y'));
  for (let x = 4; x <= 10; x++) for (const z of [3, 11]) p.set(x, 6, z, x % 2 ? 'polished_blackstone_brick_wall' : 'polished_blackstone_bricks');
  for (let z = 4; z <= 10; z++) for (const x of [3, 11]) p.set(x, 6, z, z % 2 ? 'polished_blackstone_brick_wall' : 'polished_blackstone_bricks');
  // corner platforms between the lanes
  for (const [x, z] of [[4, 4], [9, 4], [4, 9], [9, 9]] as const) p.fill(x, 1, z, x + 1, 1, z + 1, 'polished_blackstone');
  p.set(4, 2, 4, 'soul_lantern', lantern()); p.set(10, 2, 10, 'soul_lantern', lantern());
  p.set(10, 2, 4, 'ender_chest', { facing: 'west', waterlogged: F }); p.set(4, 2, 10, 'chest', chest('east'));
  p.set(9, 2, 9, 'crafting_table'); p.set(5, 2, 5, 'lodestone');
  // direction signs above each lane opening
  const signs: readonly [number, number, H][] = [[4, 7, 'east'], [10, 7, 'west'], [7, 4, 'south'], [7, 10, 'north']];
  for (const [x, z, f] of signs) p.set(x, 3, z, 'crimson_wall_sign', wallSign(f));
  return p.payload();
}

// ------------------------------------------------------------ Piglin-Tauschstation
function piglinTausch() {
  const p = new Plot([9, 9, 9]);
  p.fill(0, 0, 0, 8, 0, 8, 'polished_blackstone_bricks');
  p.fill(2, 1, 2, 6, 1, 6, 'polished_blackstone');
  // hopper floor: three rows flowing east into the output chests
  for (let z = 3; z <= 5; z++) for (let x = 3; x <= 5; x++) p.set(x, 2, z, 'hopper', hopper('east'));
  p.ring(2, 2, 6, 6, 2, 'polished_blackstone_bricks');
  p.set(6, 2, 3, 'chest', chest('east', 'left')); p.set(6, 2, 4, 'chest', chest('east', 'right')); p.set(6, 2, 5, 'chest', chest('east'));
  // cage walls: gilded corners, iron bars, dropper for the gold
  for (let y = 3; y <= 4; y++) p.ring(2, 2, 6, 6, y, 'iron_bars');
  for (const [x, z] of [[2, 2], [6, 2], [2, 6], [6, 6]] as const) p.fill(x, 3, z, x, 4, z, 'gilded_blackstone');
  p.set(3, 3, 2, 'polished_blackstone_bricks'); p.set(5, 3, 2, 'polished_blackstone_bricks');
  p.set(4, 3, 2, 'dropper', dispenser('south'));
  p.set(4, 3, 1, 'hopper', hopper('south')); p.set(4, 4, 1, 'chest', chest('north'));
  p.set(3, 3, 1, 'polished_blackstone_button', button('north'));
  p.ring(2, 2, 6, 6, 5, 'polished_blackstone_bricks');
  hipRoof(p, 1, 7, 1, 7, 5, 'crimson_stairs', 'crimson_slab'); roofCore(p, 1, 7, 1, 7, 5, 'crimson_planks');
  p.set(4, 8, 4, 'gold_block');
  // forecourt: gold posts with soul lanterns
  for (const [x, z] of [[0, 0], [8, 0], [8, 8]] as const) { p.set(x, 1, z, 'gold_block'); p.set(x, 2, z, 'polished_blackstone_wall'); p.set(x, 3, z, 'soul_lantern', lantern()); }
  p.set(0, 1, 8, 'barrel', barrel('up'));
  p.set(7, 1, 4, 'polished_blackstone_stairs', stairs('west'));
  return p.payload();
}

// ------------------------------------------------------------ Bastion-Wachturm
function bastionTurm() {
  const p = new Plot([9, 17, 9]);
  p.fill(0, 0, 0, 8, 0, 8, 'blackstone');
  for (let x = 0; x <= 8; x++) for (const z of [0, 8]) p.set(x, 1, z, 'polished_blackstone_stairs', stairs(z === 0 ? 'south' : 'north'));
  for (let z = 1; z <= 7; z++) for (const x of [0, 8]) p.set(x, 1, z, 'polished_blackstone_stairs', stairs(x === 0 ? 'east' : 'west'));
  for (let y = 1; y <= 12; y++) for (let x = 1; x <= 7; x++) for (let z = 1; z <= 7; z++) {
    if (x > 1 && x < 7 && z > 1 && z < 7) { p.air(x, y, z); continue; }
    const corner = (x === 1 || x === 7) && (z === 1 || z === 7);
    p.set(x, y, z, corner ? 'basalt' : y === 4 || y === 10 ? 'gilded_blackstone' : noise(x, y, z) < 0.2 ? 'cracked_polished_blackstone_bricks' : 'polished_blackstone_bricks', corner ? axis('y') : {});
  }
  // entrance arch and arrow slits
  p.fill(4, 1, 7, 4, 2, 7, null); p.set(4, 3, 7, 'polished_blackstone_stairs', stairs('north', 'top'));
  for (const y of [7, 11]) { p.air(1, y, 4); p.air(7, y, 4); p.air(4, y, 7); }
  // floors with a ladder well on the north wall
  for (const y of [5, 9]) { p.fill(2, y, 2, 6, y, 6, 'polished_blackstone'); p.air(4, y, 2); }
  for (let y = 1; y <= 13; y++) p.set(4, y, 2, 'ladder', ladder('south'));
  // overhanging fighting platform
  p.fill(0, 13, 0, 8, 13, 8, 'polished_blackstone_bricks'); p.set(4, 13, 2, 'ladder', ladder('south'));
  for (let x = 0; x <= 8; x++) for (const z of [0, 8]) p.set(x, 12, z, 'polished_blackstone_brick_stairs', stairs(z === 0 ? 'south' : 'north', 'top'));
  for (let z = 1; z <= 7; z++) for (const x of [0, 8]) p.set(x, 12, z, 'polished_blackstone_brick_stairs', stairs(x === 0 ? 'east' : 'west', 'top'));
  for (let x = 0; x <= 8; x++) for (let z = 0; z <= 8; z++) if (x === 0 || x === 8 || z === 0 || z === 8)
    p.set(x, 14, z, (x + z) % 2 === 0 ? 'polished_blackstone_bricks' : 'polished_blackstone_brick_wall');
  for (const [x, z] of [[0, 0], [8, 0], [0, 8], [8, 8]] as const) { p.set(x, 15, z, 'polished_blackstone_brick_wall'); p.set(x, 16, z, 'soul_lantern', lantern()); }
  p.set(4, 15, 0, 'piglin_head', head(8));
  p.set(4, 14, 4, 'black_banner', { rotation: '0' });
  // inside: storage and a soul campfire on the ground floor
  p.set(2, 1, 6, 'chest', chest('east')); p.set(6, 1, 6, 'barrel', barrel('up')); p.set(6, 1, 3, 'soul_campfire', { facing: 'west', lit: T, signal_fire: F, waterlogged: F });
  p.set(2, 6, 3, 'chest', chest('east')); p.set(6, 6, 6, 'smithing_table');
  for (const y of [8, 12]) { p.set(3, y, 4, 'iron_chain', { axis: 'y', waterlogged: F }); p.set(3, y - 1, 4, 'soul_lantern', lantern(true)); }
  return p.payload();
}

// ------------------------------------------------------------ Wirrwald-Gewächshaus
function wirrwaldHaus() {
  const p = new Plot([11, 11, 11]);
  p.fill(0, 0, 0, 10, 0, 10, 'polished_blackstone_bricks');
  p.fill(1, 0, 1, 9, 0, 9, 'warped_nylium'); p.fill(1, 0, 5, 9, 0, 5, 'polished_blackstone');
  p.room(0, 0, 10, 10, 1, 4, 'glass');
  for (const x of [0, 5, 10]) for (const z of [0, 5, 10]) if (x !== 5 || z !== 5) p.fill(x, 1, z, x, 4, z, 'warped_stem', axis('y'));
  p.fill(0, 1, 4, 0, 1, 6, 'polished_blackstone_bricks'); p.fill(10, 1, 4, 10, 1, 6, 'polished_blackstone_bricks');
  p.fill(0, 1, 5, 0, 2, 5, null); door(p, 0, 1, 5, 'warped', 'east');
  // glass roof on warped ribs, ridge along x
  for (let i = 0; i <= 5; i++) {
    const y = 5 + i;
    if (i === 5) { p.fill(0, y, 5, 10, y, 5, 'warped_slab', slab()); break; }
    for (let x = 0; x <= 10; x++) for (const [z, f] of [[i, 'south'], [10 - i, 'north']] as const)
      p.set(x, y, z, i === 0 || x === 0 || x === 5 || x === 10 ? 'warped_stairs' : 'glass', i === 0 || x === 0 || x === 5 || x === 10 ? stairs(f) : {});
    for (let z = i + 1; z <= 9 - i; z++) { p.set(0, y, z, 'glass'); p.set(10, y, z, 'glass'); }
  }
  // two warped fungus saplings grown into small trees
  for (const [cx, cz] of [[3, 3], [7, 7]] as const) {
    p.fill(cx, 1, cz, cx, 3, cz, 'warped_stem', axis('y'));
    for (let x = cx - 1; x <= cx + 1; x++) for (let z = cz - 1; z <= cz + 1; z++) p.set(x, 4, z, 'warped_wart_block');
    p.set(cx, 5, cz, 'shroomlight');
    p.set(cx + 1, 3, cz, 'weeping_vines'); p.set(cx - 1, 3, cz - 1, 'weeping_vines');
  }
  // beds: fungi, roots, sprouts and twisting vines
  for (let x = 1; x <= 9; x++) for (let z = 1; z <= 9; z++) {
    if (z === 5 || p.get(x, 1, z)) continue;
    const n = noise(x, 1, z);
    const plant = n < 0.18 ? 'warped_fungus' : n < 0.45 ? 'warped_roots' : n < 0.62 ? 'nether_sprouts' : n < 0.68 ? 'crimson_fungus' : n < 0.74 ? 'twisting_vines' : null;
    if (plant) p.set(x, 1, z, plant);
  }
  hangingLamp(p, 5, 10, 5, 2, 'soul_lantern');
  p.set(9, 1, 5, 'composter'); p.set(1, 1, 4, 'barrel', barrel('up'));
  return p.payload();
}

// ------------------------------------------------------------ Netherfestungs-Brücke
function festungsbruecke() {
  const p = new Plot([16, 12, 7]);
  const DECK = 8;
  p.fill(0, DECK, 1, 15, DECK, 5, 'nether_bricks'); p.fill(0, DECK, 3, 15, DECK, 3, 'red_nether_bricks');
  for (let x = 0; x < 16; x++) {
    p.set(x, DECK, 0, 'nether_brick_slab', slab('top')); p.set(x, DECK, 6, 'nether_brick_slab', slab('top'));
    p.set(x, DECK - 1, 0, 'nether_brick_stairs', stairs('south', 'top')); p.set(x, DECK - 1, 6, 'nether_brick_stairs', stairs('north', 'top'));
    p.set(x, DECK + 1, 1, 'nether_brick_fence'); p.set(x, DECK + 1, 5, 'nether_brick_fence');
  }
  // two piers and arches between and beyond them
  for (const x0 of [2, 12]) p.fill(x0, 0, 1, x0 + 1, DECK - 1, 5, 'nether_bricks');
  const arch: readonly [number, number][] = [[0, 7], [1, 6], [4, 4], [5, 5], [6, 6], [7, 7], [8, 7], [9, 6], [10, 5], [11, 4], [14, 6], [15, 7]];
  for (const [x, h] of arch) {
    p.fill(x, h, 1, x, DECK - 1, 5, 'nether_bricks');
    p.fill(x, h - 1, 1, x, h - 1, 5, 'nether_brick_stairs', stairs(x < 2 ? 'east' : x > 13 ? 'west' : x < 8 ? 'west' : 'east', 'top'));
  }
  for (const x0 of [2, 12]) for (const x of [x0, x0 + 1]) { p.fill(x, 2, 0, x, 3, 0, 'nether_brick_fence'); p.fill(x, 2, 6, x, 3, 6, 'nether_brick_fence'); }
  // lantern posts on the railing
  for (const x of [2, 7, 13]) for (const z of [1, 5]) { p.set(x, DECK + 1, z, 'red_nether_brick_wall'); p.set(x, DECK + 2, z, 'red_nether_brick_wall'); p.set(x, DECK + 3, z, 'soul_lantern', lantern()); }
  return p.payload();
}

// ------------------------------------------------------------ Seelenfeuer-Schrein
function seelenschrein() {
  const p = new Plot([11, 11, 11]);
  const c = 5;
  p.disc(c, c, 0, 5, 'soul_soil');
  for (let x = 0; x < 11; x++) for (let z = 0; z < 11; z++) if (p.get(x, 0, z) && noise(x, 0, z) < 0.3) p.set(x, 0, z, 'soul_sand');
  p.fill(1, 0, 1, 9, 0, 9, 'polished_blackstone_bricks'); p.disc(c, c, 0, 2, 'polished_blackstone');
  p.set(c, 1, c, 'soul_campfire', { facing: 'south', lit: T, signal_fire: F, waterlogged: F });
  for (let x = c - 1; x <= c + 1; x++) for (let z = c - 1; z <= c + 1; z++) if (x !== c || z !== c) p.set(x, 1, z, 'polished_blackstone_brick_slab', slab());
  // basalt columns with bone beams
  for (const [x, z] of [[2, 2], [8, 2], [2, 8], [8, 8]] as const) {
    p.set(x, 1, z, 'chiseled_polished_blackstone'); p.fill(x, 2, z, x, 5, z, 'basalt', axis('y')); p.set(x, 6, z, 'polished_basalt', axis('y'));
  }
  for (const z of [2, 8]) p.fill(3, 6, z, 7, 6, z, 'bone_block', axis('x'));
  for (const x of [2, 8]) p.fill(x, 6, 3, x, 6, 7, 'bone_block', axis('z'));
  for (const [x, z] of [[5, 2], [5, 8], [2, 5], [8, 5]] as const) p.set(x, 5, z, 'soul_lantern', lantern(true));
  // stepped roof with an open smoke hole
  p.ring(2, 2, 8, 8, 7, 'polished_blackstone_bricks');
  for (let i = 0; i < 3; i++) {
    const y = 7 + i, a = 1 + i, b = 9 - i;
    for (let x = a; x <= b; x++) { p.set(x, y, a, 'polished_blackstone_brick_stairs', stairs('south')); p.set(x, y, b, 'polished_blackstone_brick_stairs', stairs('north')); }
    for (let z = a + 1; z < b; z++) { p.set(a, y, z, 'polished_blackstone_brick_stairs', stairs('east')); p.set(b, y, z, 'polished_blackstone_brick_stairs', stairs('west')); }
  }
  p.ring(3, 3, 7, 7, 8, 'polished_blackstone_bricks');
  // offering pedestal and soul torches around
  p.set(c, 1, 1, 'polished_blackstone_bricks'); p.set(c, 2, 1, 'wither_skeleton_skull', head(0));
  for (const [x, z] of [[1, 3], [9, 3], [1, 7], [9, 7]] as const) p.set(x, 1, z, 'soul_torch');
  for (const x of [4, 6]) p.set(x, 1, 9, 'polished_blackstone_stairs', stairs('north'));
  return p.payload();
}

// ------------------------------------------------------------ End-Stadtturm
function endTurm() {
  const p = new Plot([11, 24, 11]);
  p.disc(5, 5, 0, 5, 'end_stone'); p.fill(1, 0, 1, 9, 0, 9, 'end_stone_bricks');
  const tier = (a: number, b: number, y0: number, y1: number) => {
    p.room(a, a, b, b, y0, y1, 'purpur_block');
    for (const [x, z] of [[a, a], [b, a], [a, b], [b, b]] as const) p.fill(x, y0, z, x, y1, z, 'purpur_pillar', axis('y'));
    const m = (a + b) / 2;
    for (let y = y0 + 1; y <= y0 + 2; y++) for (const [x, z] of [[m, a], [m, b], [a, m], [b, m]] as const) p.set(x, y, z, 'magenta_stained_glass_pane');
  };
  // tier 1
  tier(1, 9, 1, 6);
  p.fill(5, 1, 9, 5, 3, 9, null); p.set(5, 4, 9, 'purpur_stairs', stairs('north', 'top'));
  for (const x of [4, 6]) p.set(x, 4, 9, 'purpur_stairs', stairs(x === 4 ? 'east' : 'west', 'top'));
  p.fill(1, 7, 1, 9, 7, 9, 'purpur_block'); p.ring(0, 0, 10, 10, 7, 'purpur_slab', slab());
  // tier 2
  tier(2, 8, 8, 12);
  p.fill(2, 13, 2, 8, 13, 8, 'purpur_block'); p.ring(1, 1, 9, 9, 13, 'purpur_slab', slab());
  // tier 3 and roof with spire
  tier(3, 7, 14, 17);
  hipRoof(p, 2, 8, 2, 8, 18, 'purpur_stairs', 'purpur_block', false);
  roofCore(p, 2, 8, 2, 8, 18, 'purpur_block');
  p.set(5, 22, 5, 'purpur_pillar', axis('y')); p.set(5, 23, 5, 'end_rod', facing('up'));
  for (const [x, z] of [[0, 0], [10, 0], [0, 10], [10, 10]] as const) p.set(x, 8, z, 'end_rod', facing('up'));
  for (const [x, z] of [[1, 1], [9, 1], [1, 9], [9, 9]] as const) p.set(x, 14, z, 'end_rod', facing('up'));
  // ladders: tier 1 against a pillar, tier 2 against a pillar, tier 3 against the wall
  p.fill(3, 1, 2, 3, 6, 2, 'purpur_pillar', axis('y'));
  for (let y = 1; y <= 7; y++) p.set(3, y, 3, 'ladder', ladder('south'));
  p.fill(5, 8, 3, 5, 12, 3, 'purpur_pillar', axis('y'));
  for (let y = 8; y <= 13; y++) p.set(5, y, 4, 'ladder', ladder('south'));
  // furnishing
  p.set(7, 1, 7, 'ender_chest', { facing: 'west', waterlogged: F }); p.set(7, 1, 2, 'brewing_stand', { has_bottle_0: F, has_bottle_1: F, has_bottle_2: F });
  p.set(2, 1, 7, 'purple_shulker_box', facing('up')); p.set(2, 1, 6, 'magenta_shulker_box', facing('up'));
  for (const [x, z] of [[2, 2], [8, 8]] as const) p.set(x, 1, z, 'end_rod', facing('up'));
  p.set(7, 8, 7, 'purpur_pillar', axis('y')); p.set(7, 9, 7, 'end_rod', facing('up'));
  p.set(3, 8, 7, 'chest', chest('east'));
  p.set(5, 14, 6, 'purpur_pillar', axis('y')); p.set(5, 15, 6, 'dragon_head', head(8));
  return p.payload();
}

// ------------------------------------------------------------ Chorus-Garten
function chorusGarten() {
  const p = new Plot([15, 9, 15]);
  p.fill(0, 0, 0, 14, 0, 14, 'end_stone');
  p.fill(6, 0, 0, 8, 0, 14, 'end_stone_bricks'); p.fill(0, 0, 6, 14, 0, 8, 'end_stone_bricks');
  p.ring(0, 0, 14, 14, 0, 'purpur_block');
  for (const z of [6, 7, 8]) { p.set(0, 0, z, 'end_stone_bricks'); p.set(14, 0, z, 'end_stone_bricks'); }
  // four raised end stone beds with planted chorus flowers
  for (const [bx, bz] of [[1, 1], [9, 1], [1, 9], [9, 9]] as const) {
    p.ring(bx, bz, bx + 4, bz + 4, 1, 'purpur_slab', slab());
    p.fill(bx + 1, 1, bz + 1, bx + 3, 1, bz + 3, 'end_stone');
    const flip = (bx + bz) % 4 === 2;
    for (const [dx, dz] of flip ? [[1, 3], [3, 1]] as const : [[1, 1], [3, 3]] as const) p.set(bx + dx, 2, bz + dz, 'chorus_flower');
    p.set(bx + 2, 2, bz + 2, 'end_rod', facing('up'));
  }
  // purpur sculpture in the shape of a grown chorus plant
  p.set(7, 1, 7, 'purpur_block'); p.fill(7, 2, 7, 7, 6, 7, 'purpur_pillar', axis('y')); p.set(7, 7, 7, 'end_rod', facing('up'));
  p.set(6, 3, 7, 'purpur_pillar', axis('x')); p.set(5, 3, 7, 'purpur_block'); p.fill(5, 4, 7, 5, 5, 7, 'purpur_pillar', axis('y')); p.set(5, 6, 7, 'end_rod', facing('up'));
  p.set(8, 4, 7, 'purpur_pillar', axis('x')); p.set(9, 4, 7, 'purpur_block'); p.set(9, 5, 7, 'purpur_pillar', axis('y')); p.set(9, 6, 7, 'end_rod', facing('up'));
  p.set(7, 5, 6, 'purpur_pillar', axis('z')); p.set(7, 5, 5, 'purpur_block'); p.set(7, 6, 5, 'end_rod', facing('up'));
  p.set(7, 4, 8, 'purpur_pillar', axis('z')); p.set(7, 4, 9, 'purpur_block'); p.set(7, 5, 9, 'end_rod', facing('up'));
  // benches at the path ends, lamp posts on the corners
  for (let x = 6; x <= 8; x++) { p.set(x, 1, 1, 'purpur_stairs', stairs('north')); p.set(x, 1, 13, 'purpur_stairs', stairs('south')); }
  for (const [x, z] of [[0, 0], [14, 0], [0, 14], [14, 14]] as const) { p.set(x, 1, z, 'end_stone_brick_wall'); p.set(x, 2, z, 'end_rod', facing('up')); }
  return p.payload();
}

// ------------------------------------------------------------ End-Inselbrücke
function endBruecke() {
  const p = new Plot([25, 10, 9]);
  const island = (cx: number) => {
    for (let y = 0; y <= 6; y++) p.disc(cx, 4, y, Math.max(0.4, 3.6 - (6 - y) * 0.55), 'end_stone');
    for (let x = cx - 4; x <= cx + 4; x++) for (let z = 0; z < 9; z++) if (p.get(x, 6, z) && noise(x, 6, z) < 0.25) p.set(x, 7, z, 'end_stone');
  };
  island(3); island(21);
  // deck and railings
  for (let x = 5; x <= 19; x++) {
    p.fill(x, 6, 3, x, 6, 5, 'end_stone_bricks'); p.set(x, 6, 2, 'purpur_slab', slab('top')); p.set(x, 6, 6, 'purpur_slab', slab('top'));
    for (const z of [3, 5]) if (!p.get(x, 7, z)) p.set(x, 7, z, 'end_stone_brick_wall');
    p.air(x, 7, 4);
  }
  // supporting arch ribs from the island flanks to mid-span
  for (let x = 5; x <= 19; x++) {
    const y = 3 + Math.round(3 * (1 - ((x - 12) / 7.5) ** 2));
    for (const z of [3, 5]) { p.set(x, y, z, 'purpur_block'); if (x % 2 === 0 && y < 5) p.fill(x, y + 1, z, x, 5, z, 'purpur_pillar', axis('y')); }
  }
  for (const x of [5, 12, 19]) for (const z of [3, 5]) { p.set(x, 7, z, 'purpur_pillar', axis('y')); p.set(x, 8, z, 'end_rod', facing('up')); }
  // chorus flower on one island, launch pad marker on the other
  p.set(2, 6, 5, 'end_stone'); p.set(2, 7, 5, 'chorus_flower');
  p.set(21, 7, 4, 'obsidian'); p.set(22, 7, 4, 'end_stone_brick_slab', slab()); p.set(20, 7, 4, 'end_stone_brick_slab', slab());
  return p.payload();
}

export const DIMENSIONEN_SPECS: readonly BuildingSpec[] = [
  { id: 'bld_dim_eisbahn', name: 'Nether-Eisbahn', payload: eisbahn, tags: ['blaueis', 'boot', 'kettenbar'],
    description: '16 Blöcke Bootsbahn aus Blaueis, dreispurig zwischen Schwarzsteinwänden mit Pilzlicht und Stufendeckel gegen Ghasts.',
    facets: { kategorie: ['infrastruktur'], stil: ['nether'], biom: ['nether'], funktion: ['transport', 'reisen', 'verbindung'] },
    family: { id: 'eisbahn', label: 'Nether-Eisbahn', variant: 'Gerade' },
    tips: ['Ein Block im Nether sind acht in der Oberwelt – auf Blaueis fährt ein Boot rund 70 Blöcke pro Sekunde.', 'Der Deckel verhindert, dass Boote bei Fahrt hochspringen.'],
    inspiration: [WIKI('Blue_Ice', 'Blaueis')] },
  { id: 'bld_dim_knotenpunkt', name: 'Nether-Knotenpunkt', payload: knotenpunkt, tags: ['kreuzung', 'blaueis', 'halle'],
    description: 'Schwarzsteinhalle, in der sich vier Eisbahnen kreuzen, mit Wegweiserschildern, Seelenlaternen, Endertruhe, Leitstein und Werkbank.',
    facets: { kategorie: ['infrastruktur'], stil: ['nether'], biom: ['nether'], funktion: ['transport', 'reisen', 'orientierung'] },
    family: { id: 'eisbahn', label: 'Nether-Eisbahn', variant: 'Kreuzung' },
    tips: ['Die Spuren liegen im Raster der geraden Eisbahn: Module an den Armenden bündig ansetzen.', 'Ein Leitstein macht den Knoten mit einem Kompass auffindbar.'],
    inspiration: [WIKI('Lodestone', 'Leitstein')] },
  { id: 'bld_dim_piglin_tausch', name: 'Piglin-Tauschstation', payload: piglinTausch, tags: ['piglin', 'gold', 'tauschen'],
    description: 'Vergitterter Piglin-Käfig mit Trichterboden und Ausgabetruhen; ein Knopf lässt den Spender Goldbarren aus der Eingabetruhe werfen.',
    facets: { kategorie: ['farm'], stil: ['nether'], biom: ['nether'], funktion: ['handel', 'ressourcen'] },
    tips: ['Piglins tauschen nur Goldbarren; einen Piglin per Boot oder Lore hineinbringen und mit Namensschild halten.', 'Goldrüstung tragen, sonst werden Piglins feindlich.'],
    inspiration: [WIKI('Bartering', 'Tauschhandel')] },
  { id: 'bld_dim_bastion_turm', name: 'Bastion-Wachturm', payload: bastionTurm, tags: ['schwarzstein', 'wachturm', 'gold'],
    description: 'Zwölf Blöcke hoher Turm aus poliertem Schwarzstein mit Basaltecken, Goldadern, Schießscharten, Leiter, zwei Etagen und überkragender Plattform.',
    facets: { kategorie: ['befestigung'], stil: ['nether'], biom: ['nether'], funktion: ['verteidigung', 'aussicht'] },
    tips: ['Schwarzstein hält Ghast-Feuerbällen stand; Glas würde zerspringen.'], inspiration: [WIKI('Bastion_Remnant', 'Bastionsruine')] },
  { id: 'bld_dim_wirrwald_haus', name: 'Wirrwald-Gewächshaus', payload: wirrwaldHaus, tags: ['wirrpilz', 'nyzel', 'gewächshaus'],
    description: 'Glashaus mit Wirrstamm-Rippen über Wirrnyzelbeeten mit Wirrpilzen, Wurzeln, Sprossen, Zwirbelranken und zwei gewachsenen Wirrpilz-Bäumchen.',
    facets: { kategorie: ['landwirtschaft'], stil: ['nether'], biom: ['nether'], funktion: ['landwirtschaft', 'ressourcen'] },
    tips: ['Wirrpilze wachsen mit Knochenmehl nur auf Wirrnyzel zu großen Pilzen.'], inspiration: [WIKI('Huge_Fungus', 'Riesenpilz (Nether)')] },
  { id: 'bld_dim_festungsbruecke', name: 'Netherfestungs-Brücke', payload: festungsbruecke, tags: ['netherziegel', 'brücke', 'bogen'],
    description: 'Brückensegment aus Netherziegeln auf zwei Pfeilern mit Bögen, Zaungeländer, rotem Mittelstreifen und Seelenlaternen-Pfosten.',
    facets: { kategorie: ['infrastruktur'], stil: ['nether'], biom: ['nether'], funktion: ['verbindung', 'transport'] },
    tips: ['Über Lavaseen bauen: Netherziegel brennen nicht und sind ghastfest.'], inspiration: [WIKI('Nether_Fortress', 'Netherfestung')] },
  { id: 'bld_dim_seelenschrein', name: 'Seelenfeuer-Schrein', payload: seelenschrein, tags: ['seelenfeuer', 'knochen', 'schrein'],
    description: 'Offener Schrein auf Seelenerde mit Seelenlagerfeuer, Basaltsäulen, Knochenbalken, hängenden Seelenlaternen und gestuftem Dach mit Rauchloch.',
    facets: { kategorie: ['sakral'], stil: ['nether', 'fantasy'], biom: ['nether'], funktion: ['deko', 'beleuchtung'] },
    tips: ['Seelenfeuer hält Piglins fern – gut als Schutz an einem Lagerplatz.'], inspiration: [WIKI('Soul_Sand_Valley', 'Seelensandtal')] },
  { id: 'bld_dim_end_turm', name: 'End-Stadtturm', payload: endTurm, tags: ['purpur', 'endstab', 'turm'],
    description: 'Dreistufiger Purpurturm mit Säulenecken, Magentafenstern, Endstäben auf den Simsen, Leitern, Endertruhe, Braustand, Shulkerkisten und Drachenkopf.',
    facets: { kategorie: ['wahrzeichen'], stil: ['end'], biom: ['end'], funktion: ['aussicht', 'lagern'] },
    tips: ['Betten explodieren im End wie im Nether – hier keine Betten aufstellen.'], inspiration: [WIKI('End_City', 'Endsiedlung')] },
  { id: 'bld_dim_chorus_garten', name: 'Chorus-Garten', payload: chorusGarten, tags: ['chorus', 'endstein', 'garten'],
    description: 'Endsteingarten mit vier Hochbeeten voller gepflanzter Chorusblüten, Kreuzweg aus Endsteinziegeln, Chorus-Skulptur aus Purpur, Bänken und Endstab-Lampen.',
    facets: { kategorie: ['garten'], stil: ['end'], biom: ['end'], funktion: ['landwirtschaft', 'deko'] },
    tips: ['Chorusblüten nur auf Endstein setzen; sie wachsen von selbst zu verzweigten Pflanzen mit Chorusfrüchten heran.', 'Choruspflanzen selbst gibt es nicht als Gegenstand – darum stehen hier nur Blüten.'], inspiration: [WIKI('Chorus_Plant', 'Choruspflanze')] },
  { id: 'bld_dim_end_bruecke', name: 'End-Inselbrücke', payload: endBruecke, tags: ['end', 'brücke', 'insel'],
    description: 'Endsteinziegel-Brücke mit Purpurbögen, Mauergeländer und Endstäben zwischen zwei schwebenden Endstein-Inseln mit Chorusblüte und Startmarke.',
    facets: { kategorie: ['infrastruktur'], stil: ['end'], biom: ['end'], funktion: ['verbindung', 'reisen'] },
    tips: ['Beim Bauen über der Leere schleichen: Wer abstürzt, verliert alles Inventar.'] },
];
