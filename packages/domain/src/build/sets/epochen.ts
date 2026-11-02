import { Plot, axis, bed, chest, crenels, door, furnace, gableRoofX, grass, hipRoof, lantern, lectern, noise, roundTree, slab, stairs, water, campfire, candle, rod, F, T } from '../plot.js';
import type { H, Props } from '../plot.js';
import { pot, bamboo, bell, hangingLamp, longTable, rug, wallBanner } from '../furnish.js';
import { WIKI } from '../spec.js';
import type { BuildingSpec } from '../spec.js';
import { buttress, facade, machicolations } from '../facade.js';
import type { FacadeLook } from '../facade.js';
import { putFree } from '../style.js';
import type { Mix } from '../style.js';

/**
 * Epochen (Katalog v3): historische Baustile von Fernost über Rom und
 * Mittelalter bis zur Dschungelpyramide. Eigene Entwürfe; keine Nachbauten
 * realer Einzelbauwerke.
 */

const STEP: Readonly<Record<H, readonly [number, number]>> = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] };
const INWARD: Readonly<Record<H, H>> = { north: 'south', south: 'north', east: 'west', west: 'east' };
const dist2 = (x: number, z: number, cx: number, cz: number) => (x - cx) ** 2 + (z - cz) ** 2;
function outward(cx: number, cz: number, x: number, z: number): H {
  const dx = x - cx, dz = z - cz;
  return Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'east' : 'west') : (dz > 0 ? 'south' : 'north');
}
/** Square ring of stairs at distance d around (c,c), backs facing `toward` ('in' = hip roof, 'out' = lean-to sloping inward). */
function stairRing(p: Plot, c: number, d: number, y: number, id: string, toward: 'in' | 'out'): void {
  for (let x = c - d; x <= c + d; x++) for (let z = c - d; z <= c + d; z++) {
    if (Math.max(Math.abs(x - c), Math.abs(z - c)) !== d) continue;
    const side: H = z === c - d ? 'north' : z === c + d ? 'south' : x === c - d ? 'west' : 'east';
    p.set(x, y, z, id, stairs(toward === 'in' ? INWARD[side] : side));
  }
}
const vine = (side: H): Props => ({ east: side === 'east' ? T : F, north: side === 'north' ? T : F, south: side === 'south' ? T : F, up: F, west: side === 'west' ? T : F });
const ruinStone = (x: number, y: number, z: number): string => { const n = noise(x, y, z); return n < 0.35 ? 'mossy_stone_bricks' : n < 0.5 ? 'cracked_stone_bricks' : n < 0.58 ? 'mossy_cobblestone' : 'stone_bricks'; };

/** Masonry trim of the historic designs (LIB-05 Runde 2). */
const MOSSY: Mix = [['stone_bricks', 8], ['mossy_stone_bricks', 3], ['cracked_stone_bricks', 2]];
const STEIN: FacadeLook = { pilaster: 'stone_bricks', band: 'stone_brick_stairs', bandSlab: 'stone_brick_slab', plinth: 'stone_brick_stairs' };

function pagode() {
  const p = new Plot([15, 30, 15]), c = 7;
  const sq = (y: number, d: number, id: string, props: Props = {}) => p.fill(c - d, y, c - d, c + d, y, c + d, id, props);
  sq(0, 7, 'stone_bricks'); sq(1, 6, 'polished_andesite');
  for (let x = c - 1; x <= c + 1; x++) p.set(x, 1, c + 7, 'stone_brick_stairs', stairs('north'));
  const halves = [5, 4, 3, 3, 2];
  let yf = 1;
  halves.forEach((h, i) => {
    yf = 1 + 4 * i;
    if (i > 0) sq(yf, halves[i - 1]!, 'spruce_planks');
    for (let y = yf + 1; y <= yf + 3; y++) p.ring(c - h, c - h, c + h, c + h, y, y === yf + 3 ? 'dark_oak_planks' : 'white_terracotta');
    p.fill(c - h + 1, yf + 1, c - h + 1, c + h - 1, yf + 3, c + h - 1, null);
    for (const [x, z] of [[c - h, c - h], [c + h, c - h], [c - h, c + h], [c + h, c + h]] as const) p.fill(x, yf + 1, z, x, yf + 3, z, 'stripped_mangrove_log', axis('y'));
    for (const [x, z] of [[c, c - h], [c - h, c], [c + h, c]] as const) p.set(x, yf + 2, z, 'glass_pane');
    if (i === 0) door(p, c, yf + 1, c + h, 'spruce', 'south'); else p.set(c, yf + 2, c + h, 'glass_pane');
    // eaves with upturned corners and corner lanterns
    stairRing(p, c, h + 2, yf + 3, 'deepslate_tile_stairs', 'in');
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      p.set(c + sx * (h + 2), yf + 4, c + sz * (h + 2), 'deepslate_tile_slab', slab());
      p.set(c + sx * (h + 2), yf + 2, c + sz * (h + 2), 'lantern', lantern(true));
    }
    stairRing(p, c, h + 1, yf + 4, 'deepslate_tile_stairs', 'in');
    const next = halves[i + 1];
    if (next !== undefined && next < h) stairRing(p, c, h, yf + 5, 'deepslate_tile_stairs', 'in');
    if (next === undefined) {
      for (let d = h; d >= 1; d--) stairRing(p, c, d, yf + 5 + (h - d), 'deepslate_tile_stairs', 'in');
      const top = yf + 5 + h;
      p.set(c, top, c, 'deepslate_tiles'); p.set(c, top + 1, c, 'polished_blackstone_wall'); p.set(c, top + 2, c, 'gold_block');
      p.set(c, top + 3, c, 'polished_blackstone_wall'); p.set(c, top + 4, c, 'lightning_rod', rod('up'));
    }
  });
  // central pillar with ladder
  for (let y = 2; y <= yf + 6; y++) p.set(c, y, c, 'stripped_spruce_log', axis('y'));
  for (let y = 2; y <= yf; y++) p.set(c, y, c + 1, 'ladder', { facing: 'south', waterlogged: F });
  for (const [x, z] of [[c - 4, c - 4], [c + 4, c - 4], [c - 4, c + 4], [c + 4, c + 4]] as const) p.set(x, 2, z, 'potted_bamboo');
  p.set(c - 2, 2, c, 'candle', candle(3, true)); p.set(c + 2, 2, c, 'candle', candle(3, true));
  for (let i = 0; i < 4; i++) p.set(c - 1, 4 + 4 * i, c - 1, 'lantern', lantern(true));
  return p.payload();
}

function teehaus() {
  const p = new Plot([15, 13, 13]);
  p.fill(0, 0, 0, 14, 0, 12, 'grass_block', grass());
  p.fill(3, 1, 2, 9, 1, 9, 'stone_bricks'); p.fill(3, 2, 2, 9, 2, 9, 'spruce_planks');
  for (const x of [4, 5]) p.set(x, 1, 10, 'stone_brick_stairs', stairs('north'));
  // frame with paper walls
  p.room(3, 2, 9, 8, 3, 5, 'white_wool');
  for (let x = 3; x <= 9; x++) for (const z of [2, 8]) p.set(x, 3, z, 'spruce_planks');
  for (let z = 2; z <= 8; z++) for (const x of [3, 9]) p.set(x, 3, z, 'spruce_planks');
  for (const [x, z] of [[3, 2], [6, 2], [9, 2], [3, 5], [9, 5], [3, 8], [6, 8], [9, 8]] as const) p.fill(x, 3, z, x, 5, z, 'dark_oak_log', axis('y'));
  p.fill(4, 3, 8, 5, 4, 8, null);
  for (const z of [3, 4]) p.set(3, 4, z, 'glass_pane');
  for (const z of [6, 7]) p.set(9, 4, z, 'glass_pane');
  // roof and ceiling
  hipRoof(p, 2, 10, 1, 10, 6, 'dark_oak_stairs', 'dark_oak_slab');
  p.fill(3, 6, 2, 9, 6, 8, 'spruce_planks');
  for (const [x, z] of [[2, 1], [10, 1], [2, 10], [10, 10]] as const) p.set(x, 5, z, 'lantern', lantern(true));
  // tatami, sunken hearth, tea corner, alcove
  rug(p, 4, 3, 8, 7, 3, 'lime', 'green');
  p.set(6, 2, 5, 'campfire', campfire('south')); p.air(6, 3, 5);
  for (const [x, z] of [[5, 5], [7, 5], [6, 4], [6, 6]] as const) p.set(x, 3, z, 'red_carpet');
  p.set(7, 3, 4, 'decorated_pot', pot()); p.set(5, 3, 4, 'spruce_trapdoor', { facing: 'north', half: 'bottom', open: F, powered: F, waterlogged: F });
  p.set(7, 4, 3, 'white_wall_banner', wallBanner('south')); p.set(8, 3, 3, 'potted_azalea_bush'); p.set(4, 3, 3, 'barrel', { facing: 'up', open: F });
  // garden: stepping stones, stone lantern, pond, bamboo, cherry tree
  for (const [x, z] of [[5, 11], [4, 12]] as const) p.set(x, 1, z, 'smooth_stone_slab', slab());
  p.set(1, 1, 7, 'andesite_wall'); p.set(1, 2, 7, 'lantern', lantern()); p.set(1, 3, 7, 'andesite_slab', slab());
  p.fill(10, 0, 10, 11, 0, 11, 'water', water()); p.set(10, 1, 11, 'lily_pad');
  for (const [x, z] of [[12, 11], [9, 11], [10, 12], [11, 9]] as const) p.set(x, 1, z, 'mossy_cobblestone');
  for (const [x, z, h] of [[0, 0, 4], [1, 0, 5], [0, 1, 3], [0, 3, 4], [1, 2, 3]] as const) p.fill(x, 1, z, x, h, z, 'bamboo', bamboo(x === 1 ? 'large' : 'small'));
  roundTree(p, 12, 1, 4, 'cherry', 5, 2);
  return p.payload();
}

function glockenturm() {
  const p = new Plot([9, 24, 10]);
  p.fill(0, 0, 0, 8, 0, 8, 'stone_bricks');
  p.room(1, 1, 7, 7, 1, 17, 'bricks');
  for (let y = 1; y <= 17; y++) for (const [x, z] of [[1, 1], [7, 1], [1, 7], [7, 7]] as const) p.set(x, y, z, y % 2 ? 'stone_bricks' : 'chiseled_stone_bricks');
  for (const y of [6, 12]) { p.ring(1, 1, 7, 7, y, 'stone_bricks'); p.fill(2, y, 2, 6, y, 6, 'spruce_planks'); }
  door(p, 4, 1, 7, 'spruce', 'south');
  for (const [x, y, z] of [[1, 3, 4], [7, 3, 4], [1, 9, 4], [7, 9, 4], [4, 9, 7], [4, 4, 7]] as const) p.set(x, y, z, 'glass_pane');
  for (let y = 1; y <= 12; y++) p.set(4, y, 2, 'ladder', { facing: 'south', waterlogged: F });
  // belfry with arched openings on all four sides
  for (const z of [1, 7]) { p.fill(3, 14, z, 5, 16, z, null); p.set(3, 16, z, 'stone_brick_stairs', stairs('west', 'top')); p.set(5, 16, z, 'stone_brick_stairs', stairs('east', 'top')); }
  for (const x of [1, 7]) { p.fill(x, 14, 3, x, 16, 5, null); p.set(x, 16, 3, 'stone_brick_stairs', stairs('north', 'top')); p.set(x, 16, 5, 'stone_brick_stairs', stairs('south', 'top')); }
  for (const z of [1, 7]) for (const x of [3, 4, 5]) p.set(x, 13, z, 'stone_brick_slab', slab());
  for (const x of [1, 7]) for (const z of [3, 4, 5]) p.set(x, 13, z, 'stone_brick_slab', slab());
  p.fill(2, 17, 4, 6, 17, 4, 'spruce_log', axis('x'));
  p.set(4, 16, 4, 'bell', bell('south', 'ceiling'));
  hipRoof(p, 0, 8, 0, 8, 18, 'brick_stairs', 'bricks', false);
  p.set(4, 23, 4, 'lightning_rod', rod('up'));
  for (const x of [2, 6]) { p.set(x, 1, 9, 'stone_brick_wall'); p.set(x, 2, 9, 'lantern', lantern()); }
  p.set(4, 0, 9, 'stone_brick_stairs', stairs('north')); p.set(2, 0, 9, 'stone_bricks'); p.set(6, 0, 9, 'stone_bricks');
  p.set(6, 1, 6, 'chest', chest('west')); p.set(2, 1, 6, 'barrel', { facing: 'up', open: F }); p.set(4, 5, 4, 'lantern', lantern(true)); p.set(4, 11, 4, 'lantern', lantern(true));
  // Campanile: Eckpfeiler, Gesimse auf den Geschossdecken, Sockel.
  facade(p, STEIN, { at: { x0: 1, z0: 1, x1: 7, z1: 7 }, y0: 1, y1: 12, bands: [6, 12], crown: null, pilasters: 'corners', plinth: true });
  return p.payload();
}

function kreuzgang() {
  const p = new Plot([19, 11, 19]), c = 9;
  p.fill(0, 0, 0, 18, 0, 18, 'stone_bricks');
  p.fill(c - 5, 0, c - 5, c + 5, 0, c + 5, 'grass_block', grass());
  for (let i = -5; i <= 5; i++) { p.set(c + i, 0, c, 'gravel'); p.set(c, 0, c + i, 'gravel'); }
  // outer wall and arcade
  for (let y = 1; y <= 7; y++) p.ring(0, 0, 18, 18, y, 'stone_bricks');
  for (let x = 0; x <= 18; x++) for (let z = 0; z <= 18; z++) {
    if (Math.max(Math.abs(x - c), Math.abs(z - c)) !== 6) continue;
    const along = Math.abs(x - c) === 6 ? z - c : x - c;
    if (Math.abs(along) % 2 === 0) { p.fill(x, 1, z, x, 2, z, 'stone_brick_wall'); p.set(x, 3, z, 'stone_bricks'); }
    else p.set(x, 3, z, 'stone_brick_slab', slab('top'));
    p.set(x, 4, z, 'stone_bricks');
  }
  // lean-to roof sloping into the courtyard
  stairRing(p, c, 5, 4, 'deepslate_tile_stairs', 'out');
  for (let d = 6; d <= 9; d++) stairRing(p, c, d, d - 1, 'deepslate_tile_stairs', 'out');
  // doors: gate in the south, church door in the west
  door(p, c, 1, 18, 'spruce', 'south'); door(p, 0, 1, c, 'dark_oak', 'east');
  for (const [x, z] of [[c, c - 7], [c, c + 7], [c - 7, c], [c + 7, c]] as const) hangingLamp(p, x, 6, z, 0);
  // benches and candles in the walk
  for (const x of [4, 6, 12, 14]) { p.set(x, 1, 1, 'spruce_stairs', stairs('north')); p.set(x, 1, 17, 'spruce_stairs', stairs('south')); }
  p.set(1, 1, 4, 'lectern', lectern('east')); p.set(17, 1, 4, 'candle', candle(3, true)); p.set(17, 1, 14, 'barrel', { facing: 'up', open: F });
  // well in the centre and herb beds
  p.ring(c - 1, c - 1, c + 1, c + 1, 1, 'stone_bricks'); p.set(c, 0, c, 'water', water()); p.set(c, 1, c, 'water', water());
  for (const [x, z] of [[c - 1, c - 1], [c + 1, c - 1], [c - 1, c + 1], [c + 1, c + 1]] as const) p.fill(x, 2, z, x, 3, z, 'spruce_fence');
  p.fill(c - 1, 4, c - 1, c + 1, 4, c + 1, 'spruce_slab', slab());
  const herbs = ['lily_of_the_valley', 'cornflower', 'oxeye_daisy', 'azure_bluet', 'allium'];
  for (let x = c - 4; x <= c + 4; x++) for (let z = c - 4; z <= c + 4; z++) {
    if (x === c || z === c || Math.max(Math.abs(x - c), Math.abs(z - c)) <= 1) continue;
    if ((x + z) % 2 === 0) p.set(x, 1, z, herbs[(Math.abs(x - c) + Math.abs(z - c)) % herbs.length]!);
  }
  // Außenwand mit Spitzbogenfenstern zwischen Strebepfeilern (Pläne um 2 erweitert).
  const q = p.moved(2, 0, 2, [23, 11, 23]);
  for (const a of [3, 5, 13, 15].map(v => v + 2)) for (const [x, z, f] of [[a, 2, 'south'], [a, 20, 'north'], [2, a, 'east'], [20, a, 'west']] as const) {
    q.set(x, 3, z, 'glass_pane'); q.set(x, 4, z, 'glass_pane'); q.set(x, 5, z, 'stone_brick_stairs', stairs(f, 'top'));
  }
  for (const a of [1, 4, 7, 11, 14, 17].map(v => v + 2)) {
    buttress(q, a, 2, 'north', 1, 5, MOSSY, 'stone_brick_stairs'); buttress(q, a, 20, 'south', 1, 5, MOSSY, 'stone_brick_stairs');
    buttress(q, 2, a, 'west', 1, 5, MOSSY, 'stone_brick_stairs'); buttress(q, 20, a, 'east', 1, 5, MOSSY, 'stone_brick_stairs');
  }
  facade(q, { ...STEIN, pave: [['gravel', 2], ['cobblestone', 2], ['mossy_cobblestone', 1]] }, { at: { x0: 2, z0: 2, x1: 20, z1: 20 }, y0: 1, y1: 7, pilasters: 'none', sills: false, plinth: true, crown: null, ground: 0 });
  return q.payload();
}

function amphitheater() {
  const p = new Plot([25, 11, 16]), cx = 12, cz = 3;
  p.fill(0, 0, 0, 24, 0, 15, 'smooth_sandstone');
  for (let x = 0; x <= 24; x++) for (let z = cz; z <= 15; z++) {
    const r = Math.sqrt(dist2(x, z, cx, cz));
    if (r < 4) { p.set(x, 0, z, (x + z) % 2 ? 'smooth_stone' : 'polished_diorite'); continue; }
    if (r < 11) {
      const n = Math.floor(r) - 4;
      if (n > 0) p.fill(x, 1, z, x, n, z, 'sandstone');
      p.set(x, n + 1, z, 'smooth_sandstone_stairs', stairs(outward(cx, cz, x, z)));
    } else if (r < 12.4) {
      p.fill(x, 1, z, x, 9, z, 'cut_sandstone');
      if (Math.round(Math.atan2(z - cz, x - cx) * 6) % 2 === 0) p.set(x, 10, z, 'cut_sandstone_slab', slab());
    }
  }
  // stage and stage wall with columns, three doors and a banner
  p.fill(3, 1, 1, 21, 1, 2, 'spruce_planks');
  p.fill(2, 1, 0, 22, 8, 0, 'cut_sandstone');
  for (const x of [4, 8, 16, 20]) p.fill(x, 2, 1, x, 5, 1, 'quartz_pillar', axis('y'));
  p.fill(3, 6, 1, 21, 6, 1, 'smooth_quartz_slab', slab());
  p.fill(12, 2, 0, 12, 4, 0, null); p.fill(7, 2, 0, 7, 3, 0, null); p.fill(17, 2, 0, 17, 3, 0, null);
  p.set(12, 5, 1, 'red_wall_banner', wallBanner('south'));
  for (const x of [3, 21]) p.set(x, 2, 2, 'lantern', lantern());
  return p.payload();
}

function roemischeVilla() {
  const p = new Plot([17, 10, 17]);
  p.fill(0, 0, 0, 16, 0, 16, 'stone_bricks'); p.fill(1, 1, 1, 15, 1, 15, 'polished_diorite');
  for (let x = 6; x <= 10; x++) for (let z = 6; z <= 10; z++) p.set(x, 1, z, (x + z) % 2 ? 'white_terracotta' : 'cyan_terracotta');
  p.fill(7, 1, 7, 9, 1, 9, 'water', water());
  // outer walls, atrium walls, partitions
  for (let y = 2; y <= 5; y++) p.ring(1, 1, 15, 15, y, y === 2 ? 'stone_bricks' : 'white_terracotta');
  for (let y = 2; y <= 7; y++) p.ring(5, 5, 11, 11, y, 'white_terracotta');
  for (const [x0, z0, x1, z1] of [[5, 2, 5, 4], [11, 2, 11, 4], [5, 12, 5, 14], [11, 12, 11, 14], [2, 9, 4, 9], [12, 9, 14, 9], [7, 12, 7, 14], [9, 12, 9, 14]] as const)
    p.fill(x0, 2, z0, x1, 5, z1, 'white_terracotta');
  for (const [x, z] of [[8, 5], [8, 11], [5, 8], [11, 8], [5, 10], [11, 10], [7, 13], [9, 13]] as const) p.fill(x, 2, z, x, 3, z, null);
  door(p, 8, 2, 15, 'spruce', 'south'); p.set(8, 1, 16, 'stone_brick_stairs', stairs('north'));
  for (const x of [6, 10]) p.fill(x, 1, 16, x, 4, 16, 'quartz_pillar', axis('y'));
  for (const [x, z] of [[3, 1], [13, 1], [1, 5], [15, 5], [1, 12], [15, 12]] as const) p.set(x, 4, z, 'glass_pane');
  // low tiled roof rising to the open atrium (compluvium)
  for (let i = 0; i <= 5; i++) {
    const y = 5 + Math.ceil(i / 2);
    if (i % 2 === 0) stairRing(p, 8, 8 - i, y, 'brick_stairs', 'in');
    else p.ring(i, i, 16 - i, 16 - i, y, 'brick_slab', slab('top'));
  }
  // tablinum
  p.fill(6, 2, 2, 10, 3, 2, 'bookshelf'); p.set(8, 2, 3, 'lectern', lectern('south')); p.set(6, 2, 4, 'candle', candle(2, true)); hangingLamp(p, 8, 7, 3, 1);
  // triclinium with three couches
  for (let z = 4; z <= 6; z++) p.set(2, 2, z, 'spruce_stairs', stairs('west'));
  p.set(3, 2, 3, 'spruce_stairs', stairs('north')); p.set(3, 2, 7, 'spruce_stairs', stairs('south'));
  p.set(3, 2, 5, 'smooth_quartz_slab', slab('top')); p.set(3, 3, 5, 'flower_pot');
  p.set(4, 2, 2, 'decorated_pot', pot()); p.set(4, 2, 8, 'decorated_pot', pot()); hangingLamp(p, 3, 7, 5, 1);
  // kitchen
  p.set(14, 2, 3, 'smoker', furnace('west', true)); p.set(14, 2, 4, 'furnace', furnace('west')); p.set(14, 2, 6, 'barrel', { facing: 'up', open: F });
  p.set(14, 2, 7, 'chest', chest('west')); p.set(12, 2, 2, 'cauldron'); p.set(13, 2, 2, 'crafting_table'); p.set(12, 2, 7, 'decorated_pot', pot()); hangingLamp(p, 13, 7, 5, 1);
  // two bedrooms
  bed(p, 3, 2, 13, 'white', 'south'); p.set(2, 2, 11, 'chest', chest('east')); hangingLamp(p, 3, 7, 12, 1);
  bed(p, 13, 2, 13, 'red', 'south'); p.set(14, 2, 11, 'chest', chest('west')); hangingLamp(p, 13, 7, 12, 1);
  // store rooms beside the entrance hall and atrium plants
  for (const x of [6, 10]) { p.set(x, 2, 12, 'barrel', { facing: 'up', open: F }); p.set(x, 3, 12, 'barrel', { facing: 'up', open: F }); p.set(x, 2, 14, 'decorated_pot', pot()); }
  for (const [x, z] of [[6, 6], [10, 6], [6, 10], [10, 10]] as const) p.set(x, 2, z, 'potted_fern');
  // Pilaster mit Sockel und Gebälk vor den Außenwänden.
  facade(p, { pilaster: 'quartz_pillar', band: 'smooth_quartz_stairs', bandSlab: 'smooth_quartz_slab', plinth: 'stone_brick_stairs' },
    { at: { x0: 1, z0: 1, x1: 15, z1: 15 }, y0: 2, y1: 4, crown: null, plinth: true, seed: 5 });
  return p.payload();
}

function stufenpyramide() {
  const p = new Plot([23, 17, 24]), c = 11;
  const tiers = [10, 8, 6, 4, 3];
  tiers.forEach((d, t) => {
    for (let x = c - d; x <= c + d; x++) for (let z = c - d; z <= c + d; z++) for (let y = 2 * t; y <= 2 * t + 1; y++) p.set(x, y, z, ruinStone(x, y, z));
    for (let x = c - d; x <= c + d; x += 3) for (const z of [c - d, c + d]) p.set(x, 2 * t + 1, z, 'chiseled_stone_bricks');
  });
  // central staircase with cheek walls
  for (let k = 0; k <= 9; k++) {
    const z = 23 - k;
    for (let x = 9; x <= 13; x++) if (k > 0) p.fill(x, 0, z, x, k - 1, z, 'stone_bricks');
    for (let x = 10; x <= 12; x++) p.set(x, k, z, k % 2 ? 'mossy_stone_brick_stairs' : 'stone_brick_stairs', stairs('north'));
    p.set(9, k, z, 'mossy_stone_bricks'); p.set(13, k, z, 'mossy_stone_bricks');
  }
  // temple on the top platform
  p.room(9, 9, 13, 13, 10, 12, 'mossy_stone_bricks');
  for (const [x, z] of [[9, 9], [13, 9], [9, 13], [13, 13]] as const) p.fill(x, 10, z, x, 12, z, 'chiseled_stone_bricks');
  p.fill(11, 10, 13, 11, 11, 13, null);
  p.fill(9, 13, 9, 13, 13, 13, 'stone_bricks');
  for (let x = 9; x <= 13; x++) p.set(x, 14, 11, x % 2 ? 'chiseled_stone_bricks' : 'mossy_stone_brick_wall');
  p.set(10, 15, 11, 'mossy_stone_brick_wall'); p.set(12, 15, 11, 'mossy_stone_brick_wall'); p.set(11, 15, 11, 'chiseled_stone_bricks');
  p.set(11, 10, 10, 'chiseled_stone_bricks'); p.set(11, 11, 10, 'candle', candle(4, true)); p.set(10, 10, 10, 'chest', chest('south'));
  p.set(12, 10, 10, 'decorated_pot', pot()); p.set(11, 12, 11, 'lantern', lantern(true));
  for (const x of [8, 14]) p.set(x, 10, 14, 'campfire', campfire('south'));
  // jungle overgrowth: vines on the tier faces, moss on the terraces
  tiers.forEach((d, t) => {
    for (let y = 2 * t; y <= 2 * t + 1; y++) for (let i = -d; i <= d; i++) for (const side of ['north', 'south', 'east', 'west'] as const) {
      const x = side === 'east' ? c + d + 1 : side === 'west' ? c - d - 1 : c + i, z = side === 'south' ? c + d + 1 : side === 'north' ? c - d - 1 : c + i;
      if (!p.inside(x, y, z) || p.has(x, y, z) || noise(x, y, z) > 0.22) continue;
      if (side === 'south' && Math.abs(i) <= 1) continue; // Freitreppe: Stufen tragen keine Ranken
      p.set(x, y, z, 'vine', vine(INWARD[side]));
    }
  });
  for (let x = 0; x <= 22; x++) for (let z = 0; z <= 22; z++) for (let t = 0; t < tiers.length; t++) {
    const y = 2 * t + 2;
    if (p.get(x, y - 1, z) && !p.has(x, y, z) && noise(x, y, z) < 0.12 && Math.abs(x - c) > 2) p.set(x, y, z, 'moss_carpet');
  }
  return p.payload();
}

function zugbrueckentor() {
  const p = new Plot([17, 15, 18]);
  for (let x = 0; x <= 16; x++) for (let z = 0; z <= 17; z++) p.set(x, 0, z, z >= 12 && z <= 15 ? 'water' : z === 11 || z === 16 ? 'stone_bricks' : 'grass_block', z >= 12 && z <= 15 ? water() : z === 11 || z === 16 ? {} : grass());
  for (let z = 0; z <= 10; z++) for (let x = 7; x <= 9; x++) p.set(x, 0, z, 'cobblestone');
  p.set(8, 0, 17, 'cobblestone');
  // two towers and the gate block between them
  for (const x0 of [1, 11]) {
    p.room(x0, 4, x0 + 4, 10, 1, 11, 'stone_bricks');
    p.fill(x0 + 1, 5, 5, x0 + 3, 5, 9, 'spruce_planks'); p.fill(x0 + 1, 12, 5, x0 + 3, 12, 9, 'stone_bricks');
    p.ring(x0, 4, x0 + 4, 10, 12, 'stone_bricks'); crenels(p, x0, 4, x0 + 4, 10, 13, 'stone_bricks');
    for (let y = 1; y <= 12; y++) p.set(x0 + 2, y, 5, 'ladder', { facing: 'south', waterlogged: F });
    for (const y of [3, 8]) p.set(x0 + 2, y, 10, 'iron_bars');
    p.set(x0 + 2, 9, 11, 'red_wall_banner', wallBanner('south'));
    p.set(x0 + 2, 4, 8, 'lantern', lantern(true));
  }
  p.fill(6, 1, 4, 10, 9, 10, 'stone_bricks');
  p.fill(7, 1, 4, 9, 4, 10, null);
  for (let z = 4; z <= 10; z++) { p.set(7, 4, z, 'stone_brick_stairs', stairs('west', 'top')); p.set(9, 4, z, 'stone_brick_stairs', stairs('east', 'top')); }
  p.fill(7, 6, 5, 9, 8, 9, null); p.set(8, 7, 10, 'iron_bars'); p.set(8, 7, 4, 'iron_bars');
  crenels(p, 6, 4, 10, 10, 10, 'stone_bricks');
  for (const [a, b] of [[5, 6], [10, 11]] as const) { p.fill(a, 1, 7, b, 2, 7, null); p.fill(a, 6, 7, b, 7, 7, null); }
  // raised portcullis and lamps in the gateway
  for (let x = 7; x <= 9; x++) p.set(x, 3, 10, 'iron_bars');
  p.set(8, 4, 10, 'iron_bars');
  p.set(8, 4, 7, 'lantern', lantern(true)); p.set(8, 8, 7, 'lantern', lantern(true)); p.set(7, 6, 6, 'chest', chest('east'));
  // lowered drawbridge with side beams and chains back to the gate
  for (let z = 11; z <= 16; z++) {
    for (let x = 7; x <= 9; x++) p.set(x, 1, z, 'spruce_slab', slab());
    for (const x of [6, 10]) { p.set(x, 1, z, 'stripped_spruce_log', axis('z')); p.set(x, 8 - (z - 10), z, 'iron_chain', { axis: 'z', waterlogged: F }); }
  }
  for (const x of [6, 10]) { p.set(x, 1, 17, 'spruce_fence'); p.set(x, 2, 17, 'lantern', lantern()); }
  // Türme mit Gurtgesims und vorkragendem Wehrgang (Maschikulis).
  for (const x0 of [1, 11]) {
    const r = { x0, z0: 4, x1: x0 + 4, z1: 10 };
    facade(p, STEIN, { at: r, y0: 1, y1: 10, bands: [6], crown: null, pilasters: 'none', sills: false, plinth: true, sides: x0 === 1 ? ['north', 'west', 'south'] : ['north', 'east', 'south'] });
    machicolations(p, r, 11, 'stone_brick_stairs', MOSSY, 'stone_brick_slab', x0);
  }
  return p.payload();
}

function kaserne() {
  const p = new Plot([22, 13, 14]);
  for (let x = 0; x <= 21; x++) for (let z = 0; z <= 13; z++) p.set(x, 0, z, x >= 16 ? (noise(x, 0, z) < 0.4 ? 'gravel' : 'coarse_dirt') : 'grass_block', x >= 16 ? {} : grass());
  p.fill(1, 0, 1, 15, 0, 9, 'cobblestone'); p.fill(2, 0, 2, 14, 0, 8, 'spruce_planks');
  p.room(1, 1, 15, 9, 1, 4, 'spruce_planks');
  for (let x = 1; x <= 15; x++) for (const z of [1, 9]) p.fill(x, 1, z, x, 2, z, 'stone_bricks');
  for (let z = 1; z <= 9; z++) for (const x of [1, 15]) p.fill(x, 1, z, x, 2, z, 'stone_bricks');
  for (const x of [1, 6, 10, 15]) for (const z of [1, 9]) p.fill(x, 1, z, x, 4, z, 'spruce_log', axis('y'));
  door(p, 8, 1, 9, 'spruce', 'south');
  for (const x of [3, 4, 12, 13]) p.set(x, 3, 9, 'glass_pane');
  for (const x of [3, 13]) p.set(x, 3, 1, 'glass_pane');
  p.set(1, 3, 5, 'glass_pane'); p.set(15, 3, 5, 'glass_pane');
  gableRoofX(p, 1, 15, 0, 10, 5, 'spruce_stairs', 'spruce_planks', 'spruce_slab');
  p.fill(2, 5, 2, 14, 5, 8, 'spruce_planks');
  // bunk beds along the back wall with chests between
  for (const x of [2, 4, 6, 10, 12, 14]) {
    bed(p, x, 1, 3, 'blue', 'north');
    p.set(x, 2, 2, 'spruce_slab', slab('top')); p.set(x, 2, 3, 'spruce_slab', slab('top'));
    bed(p, x, 3, 3, 'blue', 'north');
  }
  for (const x of [3, 5, 11, 13]) p.set(x, 1, 2, 'chest', chest('south'));
  // hearth with chimney
  p.fill(7, 1, 2, 7, 3, 2, 'bricks'); p.fill(9, 1, 2, 9, 3, 2, 'bricks'); p.set(8, 2, 2, 'bricks'); p.set(8, 3, 2, 'bricks');
  p.set(8, 1, 2, 'campfire', campfire('south'));
  for (let y = 1; y <= 11; y++) p.set(8, y, 1, 'bricks');
  // mess table, weapon corner
  longTable(p, 4, 6, 12, 6, 1, 'spruce_slab');
  for (let x = 4; x <= 12; x++) { p.set(x, 1, 5, 'spruce_stairs', stairs('north')); p.set(x, 1, 7, 'spruce_stairs', stairs('south')); }
  p.set(2, 1, 8, 'grindstone', { face: 'floor', facing: 'east' }); p.set(14, 1, 8, 'smithing_table'); p.set(14, 1, 7, 'barrel', { facing: 'up', open: F });
  for (const x of [5, 11]) hangingLamp(p, x, 5, 6, 0);
  for (const x of [5, 11]) p.set(x, 3, 10, 'red_wall_banner', wallBanner('south'));
  // training yard with fence, archery targets and straw dummies
  for (let x = 16; x <= 21; x++) for (const z of [0, 13]) p.set(x, 1, z, 'spruce_fence');
  for (let z = 1; z <= 12; z++) p.set(21, 1, z, 'spruce_fence');
  p.set(16, 1, 13, 'spruce_fence_gate', { facing: 'south', in_wall: F, open: F, powered: F });
  for (const z of [3, 6]) { p.set(20, 1, z, 'hay_block', axis('y')); p.set(20, 2, z, 'target', { power: '0' }); }
  for (const z of [9, 11]) { p.set(18, 1, z, 'spruce_fence'); p.set(18, 2, z, 'hay_block', axis('y')); p.set(18, 3, z, 'carved_pumpkin', { facing: 'west' }); p.set(17, 2, z, 'spruce_fence'); p.set(19, 2, z, 'spruce_fence'); }
  p.set(16, 1, 4, 'barrel', { facing: 'up', open: F }); p.set(16, 2, 4, 'lantern', lantern());
  // Bruchsteinsockel, Fensterbänke und ein Vordach über der Tür.
  facade(p, { pilaster: 'cobblestone', band: 'spruce_stairs', bandSlab: 'spruce_slab', plinth: 'cobblestone_stairs' }, { at: { x0: 1, z0: 1, x1: 15, z1: 9 }, y0: 1, y1: 4, pilasters: 'none', plinth: true, crown: null });
  for (let x = 6; x <= 10; x++) for (const z of [10, 11]) putFree(p, x, 3, z, 'spruce_slab', slab('top'));
  for (const x of [6, 10]) { putFree(p, x, 1, 11, 'spruce_fence'); putFree(p, x, 2, 11, 'spruce_fence'); }
  for (const x of [6, 10]) putFree(p, x, 4, 11, 'lantern', lantern());
  return p.payload();
}

function turmruine() {
  const p = new Plot([13, 16, 13]), c = 6;
  for (let x = 0; x <= 12; x++) for (let z = 0; z <= 12; z++) {
    if (dist2(x, z, c, c) > 40) continue;
    const n = noise(x, 0, z); p.set(x, 0, z, n < 0.2 ? 'coarse_dirt' : n < 0.3 ? 'mossy_cobblestone' : 'grass_block', n >= 0.3 ? grass() : {});
  }
  const R = 16 + 3.2, in4 = (x: number, z: number) => dist2(x, z, c, c) <= R;
  const height = (x: number, z: number) => {
    const a = Math.atan2(z - c, x - c), k = Math.cos(a - 0.6);
    return k < -0.75 ? 1 + Math.round(noise(x, 1, z) * 2) : Math.round(5 + 9 * Math.max(0, k) + noise(x, 2, z) * 2);
  };
  const shell: [number, number][] = [];
  for (let x = 0; x <= 12; x++) for (let z = 0; z <= 12; z++) {
    if (!in4(x, z)) continue;
    if (in4(x + 1, z) && in4(x - 1, z) && in4(x, z + 1) && in4(x, z - 1)) continue;
    shell.push([x, z]);
    for (let y = 1; y <= height(x, z); y++) p.set(x, y, z, ruinStone(x, y, z));
  }
  // doorway, arrow slits, floor remains, moss on the broken crown
  p.fill(6, 1, 10, 6, 2, 10, null);
  for (const [x, y, z] of [[2, 4, 6], [6, 6, 2], [10, 8, 6]] as const) if (p.get(x, y, z)) p.air(x, y, z);
  for (let x = 2; x <= 10; x++) for (let z = 2; z <= 10; z++) {
    const d = dist2(x, z, c, c);
    if (d > 4 && d <= 9 + 2.4 && Math.cos(Math.atan2(z - c, x - c) - 0.6) > 0.3 && noise(x, 6, z) < 0.6) p.set(x, 6, z, 'spruce_planks');
  }
  for (const [x, z] of shell) {
    const h = height(x, z);
    if (noise(x, h + 1, z) < 0.4) p.set(x, h + 1, z, 'moss_carpet');
    for (const side of ['north', 'south', 'east', 'west'] as const) {
      const [dx, dz] = STEP[side], nx = x + dx, nz = z + dz;
      if (in4(nx, nz) || !p.inside(nx, 1, nz)) continue;
      for (let y = Math.max(2, h - 4); y <= h - 1; y++) if (!p.has(nx, y, nz) && noise(nx, y, nz) < 0.3) p.set(nx, y, nz, 'vine', vine(INWARD[side]));
    }
  }
  // birch growing inside, rubble at the breach
  p.set(5, 0, 7, 'grass_block', grass()); roundTree(p, 5, 1, 7, 'birch', 6, 2);
  for (const [x, z, id] of [[1, 3, 'mossy_cobblestone'], [2, 2, 'cobblestone'], [0, 5, 'mossy_stone_bricks'], [4, 1, 'stone_bricks'], [1, 5, 'mossy_cobblestone']] as const)
    if (p.get(x, 0, z) && !p.has(x, 1, z)) p.set(x, 1, z, id);
  if (!p.has(2, 1, 4)) p.set(2, 1, 4, 'stone_brick_stairs', stairs('east'));
  if (!p.has(3, 1, 2)) p.set(3, 1, 2, 'stone_brick_slab', slab());
  for (const [x, z] of [[8, 4], [9, 7], [7, 9], [10, 3]] as const) if (p.get(x, 0, z)?.id === 'minecraft:grass_block' && !p.has(x, 1, z)) p.set(x, 1, z, 'fern');
  return p.payload();
}

export const EPOCHEN_SPECS: readonly BuildingSpec[] = [
  { id: 'bld_epoche_pagode', name: 'Fünfstöckige Pagode', payload: pagode, tags: ['pagode', 'stockwerke', 'laternen'],
    description: 'Pagode mit fünf schmaler werdenden Geschossen um eine Mittelsäule mit Leiter, geschwungenen Schieferdächern, Eckaufschwüngen und Laternen an jeder Traufe.',
    facets: { kategorie: ['sakral'], stil: ['fernoestlich'], biom: ['kirschhain', 'wald', 'gebirge'], funktion: ['aussicht', 'orientierung', 'deko'] },
    tips: ['Jedes Dach besteht aus zwei Treppenringen; die Eckstufen obenauf ergeben den typischen Aufschwung.'] },
  { id: 'bld_epoche_teehaus', name: 'Teehaus', payload: teehaus, tags: ['teehaus', 'tatami', 'garten'],
    description: 'Kleines Teehaus mit Papierwänden, Tatami aus Teppich, eingelassener Feuerstelle und Bildnische, dazu Trittsteine, Steinlaterne, Teich, Bambus und Kirschbaum.',
    facets: { kategorie: ['oeffentlich'], stil: ['fernoestlich'], biom: ['kirschhain', 'wald'], funktion: ['versammlung', 'erholung', 'kochen'] }, gaps: ['minecraft:water'],
    tips: ['Ein Lagerfeuer im Boden steckt keine Teppiche in Brand, solange darüber Luft bleibt.'] },
  { id: 'bld_epoche_glockenturm', name: 'Glockenturm', payload: glockenturm, tags: ['campanile', 'glocke', 'backstein'],
    description: 'Schlanker Backsteinturm mit Steinecken, Leiter durch drei Geschosse, Glockenstube mit Bogenöffnungen nach allen Seiten, hängender Glocke am Balken und Walmdach.',
    facets: { kategorie: ['wahrzeichen'], stil: ['klassisch', 'mittelalterlich'], biom: ['ueberall'], funktion: ['orientierung', 'aussicht'] },
    tips: ['Eine Glocke kann an der Decke hängen; läutet man sie, leuchten Plünderer in der Nähe kurz auf.'],
    inspiration: [WIKI('Bell', 'Glocke')] },
  { id: 'bld_epoche_kreuzgang', name: 'Kloster-Kreuzgang', payload: kreuzgang, tags: ['kloster', 'arkaden', 'innenhof'],
    description: 'Quadratischer Kreuzgang mit Bogengang auf Säulen, Pultdach zum Hof, Kräuterbeeten, Kieswegen und überdachtem Brunnen in der Mitte.',
    facets: { kategorie: ['sakral'], stil: ['mittelalterlich', 'klassisch'], biom: ['ebene', 'ueberall'], funktion: ['versammlung', 'erholung', 'wasserquelle'] }, gaps: ['minecraft:water'] },
  { id: 'bld_epoche_amphitheater', name: 'Römisches Theater', payload: amphitheater, tags: ['theater', 'ränge', 'bühne'],
    description: 'Halbrundes Theater mit sieben Sitzreihen aus Sandsteintreppen, Orchestra mit Schachbrettboden, Holzbühne und Bühnenwand mit Quarzsäulen und drei Toren.',
    facets: { kategorie: ['oeffentlich'], stil: ['antik', 'klassisch'], biom: ['ebene', 'wueste', 'savanne'], funktion: ['versammlung', 'unterhaltung'] } },
  { id: 'bld_epoche_roemische_villa', name: 'Römische Villa', payload: roemischeVilla, tags: ['atrium', 'impluvium', 'säulen'],
    description: 'Atriumhaus mit Wasserbecken unter der Dachöffnung, Mosaikboden, Speisezimmer mit drei Liegen, Arbeitszimmer, Küche, zwei Schlafräumen und Säulenvorhalle.',
    facets: { kategorie: ['wohnhaus'], stil: ['antik', 'klassisch'], biom: ['ebene', 'savanne', 'kueste'], funktion: ['wohnen', 'kochen', 'wasserquelle'] }, gaps: ['minecraft:water'],
    tips: ['Das 3×3-Becken ist eine unendliche Wasserquelle: aus der Mitte lässt sich beliebig oft schöpfen.'],
    inspiration: [WIKI('Water', 'Wasser')] },
  { id: 'bld_epoche_stufenpyramide', name: 'Dschungel-Stufenpyramide', payload: stufenpyramide, tags: ['pyramide', 'stufen', 'ranken'],
    description: 'Fünfstufige Pyramide aus bemoosten Steinziegeln mit Mitteltreppe zwischen Wangenmauern, Tempel mit Dachkamm, Altar und Truhe, Feuerbecken, Ranken und Moos.',
    facets: { kategorie: ['wahrzeichen'], stil: ['antik', 'tropisch'], biom: ['dschungel'], funktion: ['orientierung', 'aussicht', 'deko'] } },
  { id: 'bld_epoche_zugbrueckentor', name: 'Burgtor mit Zugbrücke', payload: zugbrueckentor, tags: ['zugbrücke', 'fallgitter', 'graben'],
    description: 'Torbau zwischen zwei Zinnentürmen mit hochgezogenem Fallgitter, Wachstube über der Durchfahrt und herabgelassener Zugbrücke an Ketten über dem Wassergraben.',
    facets: { kategorie: ['befestigung'], stil: ['mittelalterlich'], biom: ['ebene', 'ueberall'], funktion: ['verteidigung', 'verbindung'] }, gaps: ['minecraft:water'],
    tips: ['Die Brücke ist fest; beweglich wird sie mit klebrigen Kolben, die das Deck seitlich unter den Torboden ziehen.'] },
  { id: 'bld_epoche_kaserne', name: 'Kaserne', payload: kaserne, tags: ['soldaten', 'etagenbetten', 'übungsplatz'],
    description: 'Langes Mannschaftshaus mit sechs Etagenbetten, Truhen, Kamin, langer Speisetafel und Waffenecke, daneben ein Übungsplatz mit Zielscheiben und Strohpuppen.',
    facets: { kategorie: ['befestigung'], stil: ['mittelalterlich', 'rustikal'], biom: ['ueberall'], funktion: ['wohnen', 'verteidigung'] },
    tips: ['Zielblöcke geben beim Treffer ein Redstone-Signal – ideal für einen Schießstand mit Anzeige.'],
    inspiration: [WIKI('Target', 'Zielblock')] },
  { id: 'bld_epoche_turmruine', name: 'Bemooste Turmruine', payload: turmruine, tags: ['ruine', 'moos', 'verfallen'],
    description: 'Eingestürzter Rundturm mit gezackter Mauerkrone, Bresche, Resten des Zwischenbodens, Ranken, Moos, Schutt und einer Birke im Inneren.',
    facets: { kategorie: ['wahrzeichen'], stil: ['mittelalterlich'], biom: ['wald', 'ebene', 'gebirge'], funktion: ['deko', 'aussicht', 'orientierung'] } },
];
