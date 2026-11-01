import { Plot, axis, banner, barrel, bed, campfire, chain, chest, door, furnace, ladder, lantern, lever, rail, rod, slab, stairs, trapdoor, F } from '../plot.js';
import type { H } from '../plot.js';
import { WIKI, joint } from '../spec.js';
import type { BuildingSpec } from '../spec.js';

/**
 * Schiffe & Fahrzeuge (Katalog v3): Dampflok und Personenwagen auf dem
 * Gleisraster des Gleis-Baukastens, Luftschiff, Drachenboot, Floß, Kutsche,
 * U-Boot und Doppeldecker. Reine Deko-Modelle aus Vanilla-Blöcken.
 */

const pane = { east: F, north: F, south: F, waterlogged: F, west: F };
/** Rail axis of the vehicles on track: same bed as the track kit (slab, gravel + rail, slab), here at z 1–3. */
const RAIL_Z = 2;

/** Track bed like bld_gleis_gerade: top slabs left and right, gravel with rail in the middle. */
function trackBed(p: Plot, length: number): void {
  for (let x = 0; x < length; x++) {
    p.set(x, 0, RAIL_Z - 1, 'stone_brick_slab', slab('top')); p.set(x, 0, RAIL_Z + 1, 'stone_brick_slab', slab('top'));
    p.set(x, 0, RAIL_Z, 'gravel'); p.set(x, 1, RAIL_Z, 'rail', rail('east_west'));
  }
}
/** Wheel pair beside the rail: open trapdoors on the outer faces of the cells left and right of it. */
function wheels(p: Plot, x: number, wood: string): void {
  p.set(x, 1, RAIL_Z - 1, `${wood}_trapdoor`, trapdoor('south', 'bottom', true));
  p.set(x, 1, RAIL_Z + 1, `${wood}_trapdoor`, trapdoor('north', 'bottom', true));
}
/** Boiler section: 3×3 with corners rounded by stairs, along x at z 1–3, y 3–5. */
function boilerRing(p: Plot, x: number, block: string, stair: string): void {
  p.fill(x, 3, 1, x, 5, 3, block);
  p.set(x, 3, 1, stair, stairs('south', 'top')); p.set(x, 3, 3, stair, stairs('north', 'top'));
  p.set(x, 5, 1, stair, stairs('south')); p.set(x, 5, 3, stair, stairs('north'));
}
const RAIL_JOINTS = (length: number) => [joint('west', [0, 1, RAIL_Z], [-1, 0, 0], 'rail_joint', 'gleis_3'), joint('east', [length, 1, RAIL_Z], [1, 0, 0], 'rail_joint', 'gleis_3')];

// ------------------------------------------------------------ Dampflok
function dampflok() {
  const p = new Plot([16, 10, 5]);
  trackBed(p, 16);
  // frame, cab floor, running boards, buffer beam, cowcatcher
  p.fill(0, 2, 1, 14, 2, 3, 'polished_blackstone'); p.fill(0, 2, 0, 7, 2, 0, 'polished_blackstone'); p.fill(0, 2, 4, 7, 2, 4, 'polished_blackstone');
  p.fill(8, 2, 0, 14, 2, 0, 'polished_blackstone_slab', slab('top')); p.fill(8, 2, 4, 14, 2, 4, 'polished_blackstone_slab', slab('top'));
  p.fill(15, 2, 0, 15, 2, 4, 'red_nether_bricks');
  p.set(15, 1, 1, 'polished_blackstone_stairs', stairs('west')); p.set(15, 1, 3, 'polished_blackstone_stairs', stairs('west'));
  for (const x of [1, 3, 6, 8, 10, 12, 14]) wheels(p, x, 'iron');
  for (const z of [0, 4]) p.fill(8, 1, z, 12, 1, z, 'polished_blackstone_slab', slab('top'));
  // tender with coal heap
  p.room(0, 0, 3, 4, 3, 4, 'polished_blackstone_bricks');
  p.fill(1, 3, 1, 2, 4, 3, 'coal_block'); p.fill(1, 5, 2, 2, 5, 2, 'coal_block');
  // cab with firebox, levers, windows and a slab roof
  p.room(4, 0, 7, 4, 3, 5, 'dark_oak_planks');
  for (const [x, z] of [[4, 0], [7, 0], [4, 4], [7, 4]] as const) p.fill(x, 3, z, x, 5, z, 'stripped_dark_oak_log', axis('y'));
  for (const z of [0, 4]) { p.fill(5, 3, z, 5, 4, z, null); p.set(6, 4, z, 'glass_pane', pane); }
  p.set(7, 5, 1, 'glass_pane', pane); p.set(7, 5, 3, 'glass_pane', pane);
  p.set(7, 3, 2, 'furnace', furnace('west', true));
  p.set(6, 4, 1, 'lever', lever('west')); p.set(6, 4, 3, 'lever', lever('west'));
  p.fill(3, 6, 0, 8, 6, 4, 'dark_oak_slab', slab()); p.set(5, 5, 2, 'lantern', lantern(true));
  // boiler with brass bands, smokebox, chimney with smoke, dome and whistle
  for (let x = 8; x <= 13; x++) boilerRing(p, x, x === 9 || x === 12 ? 'cut_copper' : 'deepslate_tiles', x === 9 || x === 12 ? 'cut_copper_stairs' : 'deepslate_tile_stairs');
  boilerRing(p, 14, 'polished_blackstone', 'polished_blackstone_stairs');
  p.set(14, 4, 2, 'polished_blackstone_bricks'); p.set(15, 3, 2, 'lantern', lantern());
  p.fill(13, 6, 2, 13, 7, 2, 'polished_blackstone_wall'); p.set(13, 8, 2, 'campfire', campfire('east'));
  p.set(11, 6, 2, 'polished_blackstone_slab', slab()); p.set(9, 6, 2, 'lightning_rod', rod('up'));
  return p.payload();
}

// ------------------------------------------------------------ Personenwagen
function personenwagen() {
  const p = new Plot([16, 9, 5]);
  trackBed(p, 16);
  p.fill(0, 2, 0, 15, 2, 4, 'dark_oak_planks');
  for (const x of [2, 4, 11, 13]) wheels(p, x, 'iron');
  for (const x of [3, 12]) { p.set(x, 1, 1, 'polished_blackstone_slab', slab('top')); p.set(x, 1, 3, 'polished_blackstone_slab', slab('top')); }
  // body: green lower band, window band, cream upper band
  p.room(2, 0, 13, 4, 3, 6, 'green_terracotta');
  p.ring(2, 0, 13, 4, 6, 'white_terracotta');
  for (let x = 3; x <= 12; x++) if ((x - 3) % 3 !== 2) for (const z of [0, 4]) { p.set(x, 4, z, 'glass_pane', pane); p.set(x, 5, z, 'glass_pane', pane); }
  door(p, 2, 3, 2, 'spruce', 'east'); door(p, 13, 3, 2, 'spruce', 'west');
  for (const x of [2, 13]) { p.set(x, 5, 1, 'glass_pane', pane); p.set(x, 5, 3, 'glass_pane', pane); }
  // arched roof
  for (let x = 1; x <= 14; x++) {
    p.set(x, 7, 0, 'dark_oak_stairs', stairs('south')); p.set(x, 7, 4, 'dark_oak_stairs', stairs('north'));
    p.fill(x, 7, 1, x, 7, 3, 'dark_oak_planks'); p.set(x, 8, 2, 'dark_oak_slab', slab());
  }
  // open end platforms with railings
  for (const x of [0, 1, 14, 15]) for (const z of [0, 4]) p.set(x, 3, z, 'dark_oak_fence');
  for (const x of [0, 15]) for (const z of [1, 3]) p.set(x, 3, z, 'dark_oak_fence');
  // compartments: facing seats, fold-out tables, luggage racks, lamps
  const seats: readonly [number, H][] = [[3, 'west'], [5, 'east'], [6, 'west'], [8, 'east'], [9, 'west'], [11, 'east']];
  for (const [x, back] of seats) for (const z of [1, 3]) p.set(x, 3, z, 'red_nether_brick_stairs', stairs(back));
  for (const x of [4, 7, 10]) for (const z of [1, 3]) p.set(x, 3, z, 'dark_oak_trapdoor', trapdoor(z === 1 ? 'south' : 'north', 'top'));
  for (let x = 3; x <= 11; x++) for (const z of [1, 3]) p.set(x, 6, z, 'dark_oak_trapdoor', trapdoor(z === 1 ? 'south' : 'north', 'top'));
  p.set(12, 3, 1, 'barrel', barrel('up')); p.set(12, 3, 3, 'barrel', barrel('up'));
  for (const x of [5, 10]) p.set(x, 6, 2, 'lantern', lantern(true));
  return p.payload();
}

// ------------------------------------------------------------ Luftschiff
function luftschiff() {
  const p = new Plot([27, 17, 11]);
  const cx = 14, cy = 10, cz = 5, rx = 11.5, ry = 4.5, rz = 4.5;
  const inside = (x: number, y: number, z: number) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 <= 1;
  // hollow envelope with two red bands and a red nose
  for (let x = 0; x < 27; x++) for (let y = 0; y < 17; y++) for (let z = 0; z < 11; z++) {
    if (!inside(x, y, z)) continue;
    if (inside(x + 1, y, z) && inside(x - 1, y, z) && inside(x, y + 1, z) && inside(x, y - 1, z) && inside(x, y, z + 1) && inside(x, y, z - 1)) continue;
    p.set(x, y, z, x === 8 || x === 20 || x >= 24 ? 'red_wool' : 'light_gray_wool');
  }
  const top = (x: number, z: number) => { let y = 16; while (y > 0 && !p.get(x, y, z)) y--; return y; };
  const bottom = (x: number, z: number) => { let y = 0; while (y < 16 && !p.get(x, y, z)) y++; return y; };
  // tail fins (top, bottom, both sides) and propeller
  for (let x = 3; x <= 7; x++) {
    for (let y = top(x, cz) + 1; y <= 15 - Math.max(0, x - 5); y++) p.set(x, y, cz, 'red_wool');
    for (let y = bottom(x, cz) - 1; y >= 6 + Math.max(0, x - 5); y--) p.set(x, y, cz, 'red_wool');
    for (let z = 0; z < 11; z++) if (!inside(x, cy, z) && (x <= 5 || z === 0 || z === 10 || z === 1 || z === 9) && !p.get(x, cy, z)) p.set(x, cy, z, 'red_wool');
  }
  p.set(2, cy, cz, 'chain', chain('x')); p.set(1, cy, cz, 'iron_block');
  for (const [y, z] of [[cy - 1, cz], [cy + 1, cz], [cy, cz - 1], [cy, cz + 1]] as const) p.set(1, y, z, 'iron_trapdoor', trapdoor('east', 'bottom', true));
  // gondola: floor, plank walls with window band, slab roof
  p.fill(9, 0, 3, 19, 0, 7, 'spruce_planks');
  p.room(9, 3, 19, 7, 1, 2, 'spruce_planks');
  for (const x of [9, 14, 19]) for (const z of [3, 7]) p.fill(x, 1, z, x, 2, z, 'stripped_spruce_log', axis('y'));
  for (let x = 10; x <= 18; x++) if (x !== 14) { p.set(x, 2, 3, 'glass_pane', pane); p.set(x, 2, 7, 'glass_pane', pane); }
  for (const z of [4, 5, 6]) p.set(19, 2, z, 'glass_pane', pane);
  p.fill(9, 3, 3, 19, 3, 7, 'spruce_slab', slab());
  door(p, 12, 1, 7, 'spruce', 'north');
  // suspension chains up to the envelope
  for (const x of [10, 18]) for (const z of [4, 6]) for (let y = 4; y < 16 && !p.get(x, y, z); y++) p.set(x, y, z, 'chain', chain());
  // bridge and cabin
  p.set(18, 1, 5, 'lectern', { facing: 'west', has_book: F, powered: F }); p.set(17, 1, 4, 'cartography_table'); p.set(17, 1, 6, 'spruce_stairs', stairs('west'));
  bed(p, 10, 1, 4, 'white', 'east'); p.set(10, 1, 6, 'chest', chest('east')); p.set(13, 1, 4, 'barrel', barrel('up'));
  p.set(13, 2, 4, 'lantern', lantern(true)); p.set(16, 2, 6, 'lantern', lantern(true));
  // engine with propeller at the gondola stern
  p.set(8, 1, 5, 'blast_furnace', furnace('west', true)); p.set(7, 1, 5, 'iron_block');
  for (const [y, z] of [[0, 5], [2, 5], [1, 4], [1, 6]] as const) p.set(7, y, z, 'iron_trapdoor', trapdoor('east', 'bottom', true));
  return p.payload();
}

// ------------------------------------------------------------ Drachenboot
function drachenboot() {
  const p = new Plot([25, 14, 9]);
  const c = 4, hw = (x: number) => Math.max(0, Math.min(3, Math.floor(x / 2), Math.floor((22 - x) / 2)));
  for (let x = 0; x <= 22; x++) {
    const w = hw(x), b = Math.max(0, w - 2), f = Math.max(0, w - 1);
    p.fill(x, 0, c - b, x, 0, c + b, 'spruce_planks');
    p.fill(x, 1, c - f, x, 1, c + f, 'spruce_planks');
    p.set(x, 2, c - w, 'dark_oak_planks'); p.set(x, 2, c + w, 'dark_oak_planks');
    p.set(x, 3, c - w, 'spruce_slab', slab()); if (w > 0) p.set(x, 3, c + w, 'spruce_slab', slab());
    if (w > 0) p.fill(x, 2, c - w + 1, x, 3, c + w - 1, null);
    p.set(x, 0, c, 'dark_oak_log', axis('x'));
  }
  // stern post curling inwards, dragon neck and head at the bow
  p.fill(0, 3, c, 0, 5, c, 'dark_oak_planks'); p.set(1, 6, c, 'dark_oak_stairs', stairs('west', 'top')); p.set(1, 5, c, 'dark_oak_trapdoor', trapdoor('east', 'top'));
  p.set(22, 3, c, 'dark_oak_planks'); p.set(23, 3, c, 'dark_oak_stairs', stairs('west', 'top'));
  p.fill(23, 4, c, 23, 6, c, 'dark_oak_planks'); p.set(24, 6, c, 'dark_oak_stairs', stairs('west')); p.set(24, 5, c, 'dark_oak_trapdoor', trapdoor('west', 'top'));
  p.set(23, 7, c, 'dark_oak_fence'); p.set(22, 6, c, 'dark_oak_trapdoor', trapdoor('east', 'bottom', true));
  // mast, yard and striped square sail
  p.fill(11, 2, c, 11, 12, c, 'stripped_spruce_log', axis('y'));
  p.fill(11, 11, 1, 11, 11, 7, 'spruce_log', axis('z')); p.set(11, 11, c, 'stripped_spruce_log', axis('y'));
  for (let y = 4; y <= 10; y++) for (let z = 1; z <= 7; z++) if (z !== c) p.set(11, y, z, z % 2 ? 'red_wool' : 'white_wool');
  p.set(11, 13, c, 'red_banner', banner(4));
  // shields along both sides, sea chests as rowing benches
  const shield = ['red', 'yellow', 'white', 'blue'];
  for (let x = 4, i = 0; x <= 18; x += 2, i++) {
    const w = hw(x), color = shield[i % shield.length]!;
    p.set(x, 2, c - w - 1, `${color}_wall_banner`, { facing: 'north' }); p.set(x, 2, c + w + 1, `${color}_wall_banner`, { facing: 'south' });
  }
  for (const x of [7, 9, 13, 15]) { p.set(x, 2, c - 2, 'chest', chest('east')); p.set(x, 2, c + 2, 'chest', chest('east')); }
  p.set(20, 2, c, 'barrel', barrel('up')); p.set(3, 2, c, 'barrel', barrel('up')); p.set(3, 3, c, 'lantern', lantern());
  return p.payload();
}

// ------------------------------------------------------------ Floß mit Zelt
function floss() {
  const p = new Plot([11, 8, 9]);
  for (let x = 1; x <= 9; x++) for (let z = 0; z <= 8; z++) p.set(x, 0, z, 'stripped_spruce_log', axis('x'));
  for (const x of [0, 10]) p.fill(x, 0, 1, x, 0, 7, 'spruce_log', axis('z'));
  // A-frame wool tent with a closed back and a ridge pole
  for (let x = 1; x <= 4; x++) {
    p.set(x, 1, 2, 'white_wool'); p.set(x, 1, 6, 'white_wool'); p.set(x, 2, 3, 'white_wool'); p.set(x, 2, 5, 'white_wool'); p.set(x, 3, 4, 'white_wool');
    if (x > 1) { p.fill(x, 1, 3, x, 1, 5, null); p.air(x, 2, 4); }
  }
  p.fill(1, 1, 3, 1, 1, 5, 'white_wool'); p.set(1, 2, 4, 'white_wool');
  p.set(0, 3, 4, 'spruce_fence'); p.set(5, 3, 4, 'spruce_fence');
  bed(p, 3, 1, 4, 'brown', 'west'); p.set(2, 1, 3, 'chest', chest('east')); p.set(2, 1, 5, 'barrel', barrel('up'));
  // hearth, seats, provisions, lantern, flag pole
  p.set(7, 0, 2, 'cobblestone'); p.set(7, 1, 2, 'campfire', campfire('north'));
  p.set(6, 1, 2, 'stripped_spruce_log', axis('z')); p.set(8, 1, 2, 'stripped_spruce_log', axis('z'));
  p.set(9, 1, 1, 'barrel', barrel('up')); p.set(9, 1, 3, 'composter'); p.set(8, 1, 7, 'chest', chest('north'));
  p.set(6, 1, 7, 'spruce_fence'); p.set(6, 2, 7, 'lantern', lantern());
  p.fill(9, 1, 6, 9, 5, 6, 'spruce_fence'); p.set(9, 6, 6, 'white_banner', banner(4));
  // paddle lying on deck
  p.set(5, 1, 8, 'spruce_trapdoor', trapdoor('north')); p.set(6, 1, 8, 'spruce_slab', slab());
  return p.payload();
}

// ------------------------------------------------------------ Kutsche
function kutsche() {
  const p = new Plot([11, 7, 5]);
  // axles and trapdoor wheels: big rear pair, small front pair
  p.fill(3, 0, 1, 3, 0, 3, 'dark_oak_fence'); p.fill(6, 0, 1, 6, 0, 3, 'dark_oak_fence');
  for (const x of [2, 3]) for (const y of [0, 1]) { p.set(x, y, 0, 'dark_oak_trapdoor', trapdoor('north', 'bottom', true)); p.set(x, y, 4, 'dark_oak_trapdoor', trapdoor('south', 'bottom', true)); }
  p.set(6, 0, 0, 'dark_oak_trapdoor', trapdoor('north', 'bottom', true)); p.set(6, 0, 4, 'dark_oak_trapdoor', trapdoor('south', 'bottom', true));
  p.fill(1, 1, 1, 7, 1, 3, 'dark_oak_planks');
  // cabin with doors on both sides, windows, facing seats
  p.room(2, 1, 6, 3, 2, 3, 'dark_oak_planks');
  for (const [x, z] of [[2, 1], [6, 1], [2, 3], [6, 3]] as const) p.fill(x, 2, z, x, 3, z, 'stripped_dark_oak_log', axis('y'));
  door(p, 4, 2, 1, 'dark_oak', 'south'); door(p, 4, 2, 3, 'dark_oak', 'north', 'right');
  for (const x of [3, 5]) { p.set(x, 3, 1, 'glass_pane', pane); p.set(x, 3, 3, 'glass_pane', pane); }
  p.set(2, 3, 2, 'glass_pane', pane); p.set(6, 3, 2, 'glass_pane', pane);
  p.set(3, 2, 2, 'red_nether_brick_stairs', stairs('west')); p.set(5, 2, 2, 'red_nether_brick_stairs', stairs('east'));
  // roof with luggage rail, lamps, boot and coachman box
  p.fill(1, 4, 0, 7, 4, 4, 'dark_oak_slab', slab());
  for (const [x, z] of [[2, 1], [6, 1], [2, 3], [6, 3]] as const) p.set(x, 5, z, 'gold_block');
  p.set(4, 5, 2, 'chest', chest('east')); p.set(3, 5, 2, 'barrel', barrel('east'));
  p.set(7, 3, 0, 'lantern', lantern(true)); p.set(7, 3, 4, 'lantern', lantern(true));
  p.set(1, 2, 2, 'chest', chest('west'));
  for (let z = 1; z <= 3; z++) { p.set(7, 2, z, 'dark_oak_stairs', stairs('west')); p.set(8, 1, z, 'dark_oak_slab', slab()); }
  // shafts for the horses
  for (const z of [1, 3]) p.fill(9, 1, z, 10, 1, z, 'dark_oak_fence');
  return p.payload();
}

// ------------------------------------------------------------ U-Boot
function uboot() {
  const p = new Plot([24, 14, 9]);
  const cx = 12, cy = 4, cz = 4, rx = 10.5, ry = 3.5, rz = 3.5;
  const inHull = (x: number, y: number, z: number) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 <= 1;
  const shell = (x: number, y: number, z: number) => inHull(x, y, z) && !(inHull(x + 1, y, z) && inHull(x - 1, y, z) && inHull(x, y + 1, z) && inHull(x, y - 1, z) && inHull(x, y, z + 1) && inHull(x, y, z - 1));
  const interior = (x: number, y: number, z: number) => inHull(x, y, z) && !shell(x, y, z);
  for (let x = 0; x < 24; x++) for (let y = 0; y < 9; y++) for (let z = 0; z < 9; z++) {
    if (shell(x, y, z)) {
      const porthole = (y === 4 || y === 5) && (z <= 1 || z >= 7) && x >= 6 && x <= 18 && x % 3 === 0;
      p.set(x, y, z, porthole ? 'glass' : y <= 2 ? 'red_terracotta' : 'gray_concrete');
    } else if (interior(x, y, z)) {
      if (y === 2) p.set(x, y, z, 'smooth_stone'); else if (y > 2) p.air(x, y, z);
    }
  }
  // conning tower with windows, hatch, periscope
  p.room(10, 3, 14, 5, 8, 9, 'gray_concrete');
  p.set(12, 9, 3, 'glass_pane', pane); p.set(12, 9, 5, 'glass_pane', pane);
  p.fill(10, 10, 3, 14, 10, 5, 'smooth_stone_slab', slab());
  p.set(11, 10, 4, 'iron_trapdoor', trapdoor('north', 'bottom'));
  p.fill(13, 11, 4, 13, 12, 4, 'iron_bars'); p.set(13, 13, 4, 'lightning_rod', rod('up'));
  // ladder from the deck up into the tower, steel column behind it
  p.fill(10, 3, 4, 10, 7, 4, 'gray_concrete');
  p.fill(11, 3, 4, 11, 9, 4, 'ladder', ladder('east'));
  p.air(12, 7, 4);
  // deck walkway, dive planes, propeller and rudder
  for (let x = 4; x <= 20; x++) if ((x < 10 || x > 14) && shell(x, 7, cz)) p.set(x, 8, cz, 'smooth_stone_slab', slab());
  for (const x of [18, 19]) { p.set(x, 4, 1, 'iron_trapdoor', trapdoor('north', 'bottom')); p.set(x, 4, 7, 'iron_trapdoor', trapdoor('south', 'bottom')); }
  p.set(1, 4, cz, 'iron_block');
  for (const [y, z] of [[3, cz], [5, cz], [4, cz - 1], [4, cz + 1]] as const) p.set(1, y, z, 'iron_trapdoor', trapdoor('east', 'bottom', true));
  p.fill(2, 6, cz, 3, 6, cz, 'iron_trapdoor', trapdoor('south', 'bottom', true));
  // inside: torpedo tubes, control room, bunks, engine, lamps
  const put = (x: number, y: number, z: number, id: string, props: Record<string, string> = {}) => { if (interior(x, y, z)) p.set(x, y, z, id, props); };
  put(19, 3, 3, 'dispenser', { facing: 'east', triggered: F }); put(19, 3, 5, 'dispenser', { facing: 'east', triggered: F });
  put(13, 3, 5, 'lectern', { facing: 'west', has_book: F, powered: F }); put(13, 3, 3, 'cartography_table');
  bedIf(p, interior, 7, 3, 3, 'gray', 'east'); bedIf(p, interior, 7, 3, 5, 'gray', 'east');
  put(16, 3, 3, 'chest', chest('south')); put(16, 3, 5, 'barrel', barrel('up'));
  put(5, 3, 4, 'blast_furnace', furnace('east', true)); put(6, 3, 3, 'lever', { face: 'floor', facing: 'east', powered: F });
  for (const x of [7, 16]) put(x, 6, cz, 'lantern', lantern(true));
  return p.payload();
}
function bedIf(p: Plot, ok: (x: number, y: number, z: number) => boolean, x: number, y: number, z: number, color: string, f: H): void {
  if (ok(x, y, z) && ok(x + (f === 'east' ? 1 : f === 'west' ? -1 : 0), y, z)) bed(p, x, y, z, color, f);
}

// ------------------------------------------------------------ Doppeldecker
function doppeldecker() {
  const p = new Plot([11, 6, 13]);
  // fuselage, tail boom, cockpit with seat and windscreen
  p.fill(3, 1, 5, 8, 2, 7, 'red_concrete'); p.fill(8, 1, 5, 8, 2, 7, 'white_concrete');
  p.fill(2, 1, 6, 2, 2, 6, 'red_concrete'); p.fill(0, 2, 6, 1, 2, 6, 'red_concrete');
  p.air(4, 2, 6); p.set(4, 1, 6, 'spruce_stairs', stairs('west')); p.set(5, 3, 6, 'glass_pane', pane);
  // engine cowling and propeller
  p.fill(9, 1, 5, 9, 2, 7, 'iron_block'); p.set(10, 2, 6, 'polished_blackstone');
  for (const [y, z] of [[1, 6], [3, 6], [2, 5], [2, 7]] as const) p.set(10, y, z, 'spruce_trapdoor', trapdoor('west', 'bottom', true));
  // lower wing (top slabs), upper wing (bottom slabs), struts
  for (let x = 5; x <= 7; x++) for (let z = 0; z <= 12; z++) { if (z < 5 || z > 7) p.set(x, 1, z, 'birch_slab', slab('top')); p.set(x, 4, z, 'birch_slab', slab()); }
  for (const z of [1, 11, 3, 9]) p.fill(6, 2, z, 6, 3, z, 'birch_fence');
  for (const z of [5, 7]) p.set(6, 3, z, 'birch_fence');
  for (let x = 5; x <= 7; x++) for (const z of [0, 12]) { p.set(x, 1, z, 'mangrove_slab', slab('top')); p.set(x, 4, z, 'mangrove_slab', slab()); }
  // undercarriage, tail fin, stabilisers, skid
  for (const z of [5, 7]) p.set(6, 0, z, 'black_wool');
  p.fill(0, 3, 6, 0, 4, 6, 'red_concrete'); p.set(1, 3, 6, 'white_concrete');
  for (const z of [4, 5, 7, 8]) p.fill(0, 2, z, 1, 2, z, 'birch_slab', slab());
  p.fill(1, 0, 6, 1, 1, 6, 'birch_fence');
  return p.payload();
}

export const FAHRZEUGE_SPECS: readonly BuildingSpec[] = [
  { id: 'bld_fahrzeug_dampflok', name: 'Dampflok', payload: dampflok, tags: ['zug', 'lok', 'dampf'],
    description: 'Dampflok auf 16 Gleisblöcken mit Kohletender, Führerhaus mit Feuerbüchse und Hebeln, rundem Kessel mit Kupferbändern, rauchendem Schornstein und Schienenräumer.',
    facets: { kategorie: ['fahrzeug'], stil: ['industriell', 'viktorianisch'], biom: ['ueberall'], funktion: ['transport', 'deko'] },
    family: { id: 'zug', label: 'Zug', variant: 'Dampflok' }, connectors: RAIL_JOINTS(16),
    tips: ['Liegt auf dem Raster des Gleis-Baukastens und lässt sich an gerade Gleise anschließen.', 'Das Lagerfeuer im Schornstein raucht; ein Heuballen darunter würde den Rauch höher steigen lassen.'],
    inspiration: [WIKI('Campfire', 'Lagerfeuer')] },
  { id: 'bld_fahrzeug_personenwagen', name: 'Personenwagen', payload: personenwagen, tags: ['zug', 'wagen', 'abteil'],
    description: 'Grün-cremefarbener Personenwagen auf 16 Gleisblöcken mit offenen Endbühnen, Fensterband, gewölbtem Dach, sechs Sitzbänken mit Klapptischen, Gepäckablagen und Laternen.',
    facets: { kategorie: ['fahrzeug'], stil: ['viktorianisch', 'klassisch'], biom: ['ueberall'], funktion: ['transport', 'deko'] },
    family: { id: 'zug', label: 'Zug', variant: 'Personenwagen' }, connectors: RAIL_JOINTS(16),
    tips: ['Hinter die Dampflok gesetzt ergibt sich ein Zug; die Gleise laufen unter beiden durch.'] },
  { id: 'bld_fahrzeug_luftschiff', name: 'Luftschiff', payload: luftschiff, tags: ['zeppelin', 'gondel', 'himmel'],
    description: 'Hohle Ballonhülle aus Wolle mit roten Bändern, Leitwerk und Heckpropeller, darunter an Ketten eine Holzgondel mit Brücke, Kartentisch, Koje und Motor mit Propeller.',
    facets: { kategorie: ['fahrzeug'], stil: ['viktorianisch', 'fantasy'], biom: ['ueberall'], funktion: ['transport', 'deko'] },
    tips: ['Hoch in den Himmel bauen: ein Gerüstturm hilft beim Setzen der Hülle und lässt sich danach schnell abbauen.'] },
  { id: 'bld_fahrzeug_drachenboot', name: 'Wikinger-Drachenboot', payload: drachenboot, tags: ['wikinger', 'langschiff', 'segel'],
    description: 'Klinkergebautes Langschiff mit Drachenkopf am Bug, eingerolltem Heck, rot-weißem Rahsegel, Schildreihe aus Bannern und Seekisten als Ruderbänke.',
    facets: { kategorie: ['fahrzeug'], stil: ['nordisch'], biom: ['kueste', 'ozean', 'taiga'], funktion: ['transport', 'deko'] },
    tips: ['y 0 ist der Kiel: zwei Blöcke tief ins Wasser setzen, dann liegt die Bordwand knapp über der Oberfläche.'] },
  { id: 'bld_fahrzeug_floss', name: 'Floß mit Zelt', payload: floss, tags: ['floß', 'zelt', 'fluss'],
    description: 'Floß aus Fichtenstämmen mit Wollzelt samt Bett und Truhe, Feuerstelle auf Bruchstein, Vorräten, Laterne, Paddel und Fahne.',
    facets: { kategorie: ['fahrzeug'], stil: ['rustikal'], biom: ['kueste', 'sumpf', 'dschungel'], funktion: ['wohnen', 'transport'] },
    tips: ['Stämme direkt auf die Wasseroberfläche setzen – Blöcke schwimmen in Minecraft ohne Stütze.'] },
  { id: 'bld_fahrzeug_kutsche', name: 'Kutsche', payload: kutsche, tags: ['kutsche', 'räder', 'pferd'],
    description: 'Geschlossene Kutsche mit Falltür-Rädern auf Zaun-Achsen, Kabine mit zwei Türen und gegenüberliegenden Sitzen, Gepäck auf dem Dach, Kutschbock, Laternen und Deichsel.',
    facets: { kategorie: ['fahrzeug'], stil: ['mittelalterlich', 'viktorianisch'], biom: ['ueberall'], funktion: ['transport', 'deko'] },
    tips: ['Pferde an die Deichsel leinen: eine Leine lässt sich an jeden Zaun knoten.'], inspiration: [WIKI('Lead', 'Leine')] },
  { id: 'bld_fahrzeug_uboot', name: 'U-Boot', payload: uboot, tags: ['unterwasser', 'turm', 'periskop'],
    description: 'Zigarrenförmiges U-Boot mit Bullaugen, rotem Unterwasserschiff, Turm mit Luke und Periskop, Tiefenrudern, Propeller und eingerichtetem Inneren mit Torpedorohren, Kojen und Maschinenraum.',
    facets: { kategorie: ['fahrzeug'], stil: ['industriell', 'modern'], biom: ['ozean'], funktion: ['transport', 'deko', 'wohnen'] },
    tips: ['Innen ist alles als Luft geplant: unter Wasser gebaut verdrängt das Boot das Wasser, wenn die Hülle zuerst steht.', 'Ein Aquisitor im Rahmen aus Prismarin daneben lässt beim Bauen unter Wasser frei atmen.'],
    inspiration: [WIKI('Conduit', 'Aquisitor')] },
  { id: 'bld_fahrzeug_doppeldecker', name: 'Doppeldecker', payload: doppeldecker, tags: ['flugzeug', 'propeller', 'flügel'],
    description: 'Roter Doppeldecker mit zwei Tragflächen aus Birkenstufen, Zaunstreben, offenem Cockpit mit Windschutz, Motorhaube, Propeller, Fahrwerk und Leitwerk.',
    facets: { kategorie: ['fahrzeug'], stil: ['klassisch', 'industriell'], biom: ['ueberall', 'ebene'], funktion: ['transport', 'deko'] } },
];
