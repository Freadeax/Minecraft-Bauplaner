import { Plot, axis, bed, candle, chest, furnace, lantern, slab, stairs, water, F, T } from '../plot.js';
import type { H } from '../plot.js';
import { counter, hangingLamp, pot, rug, wallBanner } from '../furnish.js';
import { shopAwning } from '../facade.js';
import { column, dome, pick, putFree } from '../style.js';
import type { Mix } from '../style.js';
import { joint, WIKI } from '../spec.js';
import type { BuildingSpec } from '../spec.js';
import { ARENA_GENERATOR } from '../../generators/arena.js';
import { Args, defaultsOf, normalizeParams } from '../../generators/params.js';

/**
 * Antike (Kolosseum-Viertel): das Kolosseum aus Philipps Bauplan als
 * Katalogeintrag (Generator „Arena“, Vorlage „Kolosseum“) und die Bauten
 * eines römischen Viertels darum herum – Gladiatorenschule, Triumphbogen,
 * Thermen, Tabernae und Ehrensäule. Eigene Entwürfe nach dem Vorbild
 * römischer Bautypen, keine Nachbauten einzelner realer Bauwerke.
 */

const TRAVERTIN: Mix = [['smooth_sandstone', 6], ['sandstone', 2], ['cut_sandstone', 1]];
const MARMOR: Mix = [['quartz_bricks', 4], ['smooth_quartz', 3], ['calcite', 2]];
const ZIEGEL: Mix = [['bricks', 5], ['granite', 1]];
const FENCE_PROPS = { east: F, north: F, south: F, waterlogged: F, west: F } as const;

/** Payload of an arena preset, built directly (no registry import, so the catalogue has no import cycle). */
const arena = (presetId: string) => (): ReturnType<typeof ARENA_GENERATOR.build>['payload'] => {
  const preset = ARENA_GENERATOR.presets.find(pr => pr.id === presetId)!;
  const { values } = normalizeParams(ARENA_GENERATOR.params, { ...defaultsOf(ARENA_GENERATOR.params), ...preset.values });
  return ARENA_GENERATOR.build(new Args(values), values).payload;
};

/** Arched opening xa..xb in a wall running along x at depth z: air from y0 to y1, rounded with upside-down stairs. */
function archX(p: Plot, xa: number, xb: number, z: number, y0: number, y1: number, stair: string): void {
  for (let x = xa; x <= xb; x++) for (let y = y0; y <= y1; y++) p.air(x, y, z);
  p.set(xa, y1, z, stair, stairs('west', 'top')); p.set(xb, y1, z, stair, stairs('east', 'top'));
  if (xb - xa >= 3) { p.set(xa + 1, y1 + 1, z, stair, stairs('west', 'top')); p.set(xb - 1, y1 + 1, z, stair, stairs('east', 'top')); }
}
function archZ(p: Plot, za: number, zb: number, x: number, y0: number, y1: number, stair: string): void {
  for (let z = za; z <= zb; z++) for (let y = y0; y <= y1; y++) p.air(x, y, z);
  p.set(x, y1, za, stair, stairs('north', 'top')); p.set(x, y1, zb, stair, stairs('south', 'top'));
  if (zb - za >= 3) { p.set(x, y1 + 1, za + 1, stair, stairs('north', 'top')); p.set(x, y1 + 1, zb - 1, stair, stairs('south', 'top')); }
}
/** Ring of stairs at y around the rectangle (outer cells), step facing `toward` the centre ('in') or away ('out'). */
function stairFrame(p: Plot, x0: number, z0: number, x1: number, z1: number, y: number, id: string, half: 'bottom' | 'top', toward: 'in' | 'out'): void {
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    if (x !== x0 && x !== x1 && z !== z0 && z !== z1) continue;
    const side: H = z === z0 ? 'north' : z === z1 ? 'south' : x === x0 ? 'west' : 'east';
    const f: H = toward === 'out' ? side : ({ north: 'south', south: 'north', east: 'west', west: 'east' } as const)[side];
    putFree(p, x, y, z, id, stairs(f, half));
  }
}
const mix = (p: Plot, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, m: Mix, seed = 1) => {
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) p.set(x, y, z, pick(m, x, y, z, seed));
};

// ------------------------------------------------------------ Triumphbogen
function triumphbogen() {
  const p = new Plot([15, 15, 7]);
  mix(p, 0, 0, 0, 14, 0, 6, MARMOR, 2);
  for (let x = 2; x <= 12; x++) for (let z = 0; z <= 6; z++) if (x !== 4 && x !== 5 && x !== 9 && x !== 10) p.set(x, 0, z, (x + z) % 2 ? 'polished_diorite' : 'smooth_quartz');
  // Four piers, side passages two wide and four high, central passage three wide and six high.
  for (const [xa, xb] of [[0, 1], [4, 5], [9, 10], [13, 14]] as const) mix(p, xa, 1, 1, xb, 7, 5, MARMOR, 3);
  for (let z = 1; z <= 5; z++) { mix(p, 2, 5, z, 3, 7, z, MARMOR, 4); mix(p, 11, 5, z, 12, 7, z, MARMOR, 4); mix(p, 6, 7, z, 8, 7, z, MARMOR, 4); }
  for (let z = 1; z <= 5; z++) { archX(p, 2, 3, z, 1, 4, 'quartz_stairs'); archX(p, 11, 12, z, 1, 4, 'quartz_stairs'); archX(p, 6, 8, z, 1, 6, 'quartz_stairs'); }
  // Engaged columns on both faces, keystones, lanterns in the vaults.
  for (const z of [0, 6]) for (const x of [0, 5, 9, 14]) column(p, x, z, 1, 7, 'quartz_pillar', 'chiseled_quartz_block', 'quartz_stairs');
  for (const z of [0, 6]) { p.set(7, 7, z, 'chiseled_quartz_block'); p.set(2, 5, z, 'chiseled_quartz_block'); p.set(12, 5, z, 'chiseled_quartz_block'); }
  for (const z of [0, 6]) for (const x of [2, 3, 11, 12]) for (let y = 6; y <= 7; y++) putFree(p, x, y, z, 'quartz_bricks');
  p.set(7, 6, 3, 'lantern', lantern(true)); p.set(2, 4, 3, 'lantern', lantern(true)); p.set(12, 4, 3, 'lantern', lantern(true));
  // Entablature with cornice, attic with inscription band and banners, crowning statues.
  mix(p, 0, 8, 0, 14, 8, 6, MARMOR, 5);
  stairFrame(p, 0, 0, 14, 6, 9, 'quartz_stairs', 'top', 'in'); mix(p, 1, 9, 1, 13, 9, 5, MARMOR, 6);
  mix(p, 1, 10, 1, 13, 12, 5, MARMOR, 7);
  for (let x = 3; x <= 11; x++) for (const z of [1, 5]) p.set(x, 11, z, x % 2 ? 'chiseled_quartz_block' : 'quartz_bricks');
  for (const [x, z, f] of [[4, 0, 'north'], [10, 0, 'north'], [4, 6, 'south'], [10, 6, 'south']] as const) p.set(x, 11, z, 'red_wall_banner', wallBanner(f));
  stairFrame(p, 0, 0, 14, 6, 13, 'quartz_stairs', 'top', 'in'); mix(p, 1, 13, 1, 13, 13, 5, MARMOR, 8);
  for (const [x, z] of [[1, 1], [13, 1], [1, 5], [13, 5]] as const) { p.set(x, 14, z, 'quartz_pillar', axis('y')); }
  for (const x of [5, 7, 9]) p.set(x, 14, 3, x === 7 ? 'gold_block' : 'chiseled_quartz_block');
  for (const [x, z] of [[3, 3], [11, 3]] as const) p.set(x, 14, z, 'lantern', lantern());
  return p.payload();
}

// ------------------------------------------------------------ Ehrensäule
function ehrensaeule() {
  const p = new Plot([7, 17, 7]), c = 3;
  mix(p, 0, 0, 0, 6, 0, 6, MARMOR, 2);
  stairFrame(p, 0, 0, 6, 6, 1, 'quartz_stairs', 'bottom', 'in'); mix(p, 1, 1, 1, 5, 1, 5, MARMOR, 3);
  mix(p, 2, 2, 2, 4, 3, 4, [['quartz_bricks', 1]], 1);
  for (const [x, z] of [[2, 2], [4, 2], [2, 4], [4, 4]] as const) p.set(x, 3, z, 'chiseled_quartz_block');
  for (let y = 4; y <= 12; y++) p.set(c, y, c, y % 3 === 0 ? 'chiseled_quartz_block' : 'quartz_pillar', y % 3 === 0 ? {} : axis('y'));
  p.set(c, 13, c, 'chiseled_quartz_block');
  for (const [dx, dz, f] of [[0, -1, 'north'], [1, 0, 'east'], [0, 1, 'south'], [-1, 0, 'west']] as const) {
    p.set(c + dx, 13, c + dz, 'quartz_stairs', stairs(({ north: 'south', south: 'north', east: 'west', west: 'east' } as const)[f], 'top'));
    p.set(c + dx, 4, c + dz, 'quartz_stairs', stairs(({ north: 'south', south: 'north', east: 'west', west: 'east' } as const)[f]));
  }
  p.fill(2, 14, 2, 4, 14, 4, 'smooth_quartz'); p.set(c, 15, c, 'gold_block'); p.set(c, 16, c, 'lightning_rod', { facing: 'up', powered: F, waterlogged: F });
  for (const [x, z] of [[1, 1], [5, 1], [1, 5], [5, 5]] as const) p.set(x, 2, z, 'lantern', lantern());
  for (const [x, z] of [[c, 1], [c, 5], [1, c], [5, c]] as const) p.set(x, 2, z, 'potted_azalea_bush');
  return p.payload();
}

// ------------------------------------------------------------ Tabernae
function tabernae() {
  const p = new Plot([21, 10, 11]);
  mix(p, 0, 0, 0, 20, 0, 10, TRAVERTIN, 2);
  for (let x = 1; x <= 19; x++) for (let z = 1; z <= 7; z++) p.set(x, 0, z, (x + z) % 3 ? 'terracotta' : 'orange_terracotta');
  // Shell: back wall, side walls, partitions, arcade front with four arches.
  for (let y = 1; y <= 8; y++) { mix(p, 0, y, 0, 20, y, 0, TRAVERTIN, 3); mix(p, 0, y, 0, 0, y, 8, TRAVERTIN, 3); mix(p, 20, y, 0, 20, y, 8, TRAVERTIN, 3); }
  for (const x of [5, 10, 15]) mix(p, x, 1, 1, x, 4, 8, TRAVERTIN, 4);
  mix(p, 0, 1, 8, 20, 4, 8, TRAVERTIN, 5);
  for (const x of [0, 5, 10, 15, 20]) for (let y = 1; y <= 4; y++) p.set(x, y, 8, 'cut_sandstone');
  for (const x0 of [1, 6, 11, 16]) archX(p, x0, x0 + 3, 8, 1, 3, 'sandstone_stairs');
  // Upper floor: planks over the shops, walls, windows, flat roof with a parapet.
  p.fill(1, 5, 1, 19, 5, 8, 'spruce_planks');
  for (let y = 6; y <= 8; y++) { mix(p, 0, y, 8, 20, y, 8, TRAVERTIN, 6); }
  for (const x of [2, 4, 7, 9, 12, 14, 17, 19]) { p.set(x, 7, 8, 'glass_pane'); p.set(x, 6, 8, 'sandstone_slab', slab('top')); p.set(x, 8, 8, 'sandstone_stairs', stairs('north', 'top')); }
  for (const x of [5, 10, 15]) mix(p, x, 6, 1, x, 8, 7, TRAVERTIN, 7);
  mix(p, 0, 9, 0, 20, 9, 8, ZIEGEL, 8);
  for (let x = 0; x <= 20; x++) for (const z of [0, 8]) p.set(x, 9, z, 'sandstone_wall');
  for (let z = 0; z <= 8; z++) for (const x of [0, 20]) p.set(x, 9, z, 'sandstone_wall');
  for (let x = 1; x <= 19; x++) p.set(x, 8, 9, 'sandstone_stairs', stairs('north', 'top'));
  // Awnings in front of every shop (red and white, towards the street).
  for (const x0 of [4, 9, 14, 19]) shopAwning(p, x0, 4, 8, 'south', 4, ['red', 'white'], 'sandstone_slab');
  for (const x of [0, 5, 10, 15, 20]) { for (let y = 1; y <= 3; y++) p.set(x, y, 9, 'cut_sandstone'); p.set(x, 4, 9, 'sandstone_stairs', stairs('south', 'top')); }
  // Shops: counter towards the street, a stair to the dwelling above, wares and lights.
  const shops: ((x0: number) => void)[] = [
    x0 => { // Thermopolium: hot food counter with pots and a smoker
      p.set(x0, 1, 2, 'smoker', furnace('south', true)); p.set(x0 + 1, 1, 2, 'cauldron'); p.set(x0 + 2, 1, 2, 'cauldron'); p.set(x0, 2, 2, 'decorated_pot', pot('south'));
      p.set(x0 + 1, 1, 1, 'barrel', { facing: 'up', open: F }); p.set(x0 + 2, 1, 1, 'barrel', { facing: 'up', open: F });
    },
    x0 => { // Bakery: oven, flour sacks, bread shelf
      p.set(x0, 1, 2, 'furnace', furnace('south', true)); p.set(x0 + 1, 1, 2, 'furnace', furnace('south')); p.set(x0, 1, 1, 'hay_block', axis('y')); p.set(x0, 2, 1, 'hay_block', axis('y'));
      p.set(x0 + 2, 1, 1, 'composter', { level: '3' }); p.set(x0 + 2, 2, 2, 'oak_trapdoor', { facing: 'north', half: 'top', open: F, powered: F, waterlogged: F });
    },
    x0 => { // Potter: pots on shelves, clay, a stonecutter
      for (let i = 0; i < 3; i++) p.set(x0 + i, 1, 1, 'decorated_pot', pot('south'));
      p.set(x0, 2, 1, 'oak_slab', slab()); p.set(x0 + 1, 2, 1, 'oak_slab', slab()); p.set(x0 + 2, 2, 1, 'oak_slab', slab());
      p.set(x0, 3, 1, 'flower_pot'); p.set(x0 + 2, 3, 1, 'decorated_pot', pot('south'));
      p.set(x0 + 1, 1, 2, 'clay'); p.set(x0 + 2, 1, 2, 'stonecutter', { facing: 'south' });
    },
    x0 => { // Cloth merchant: loom, bolts of wool, banner
      p.set(x0, 1, 2, 'loom', { facing: 'south' }); p.set(x0 + 1, 1, 1, 'red_wool'); p.set(x0 + 2, 1, 1, 'white_wool'); p.set(x0 + 1, 2, 1, 'purple_wool'); p.set(x0 + 2, 2, 1, 'yellow_wool');
      p.set(x0 + 2, 1, 2, 'purple_wall_banner', wallBanner('south'));
    },
  ];
  shops.forEach((shop, i) => {
    const x0 = 1 + 5 * i;
    shop(x0);
    counter(p, x0, 6, x0 + 2, 6, 1, 'smooth_sandstone_slab');
    p.set(x0 + 3, 1, 6, 'oak_trapdoor', { facing: 'south', half: 'bottom', open: F, powered: F, waterlogged: F });
    for (let k = 0; k < 4; k++) { p.set(x0 + 3, 1 + k, 4 - k, 'sandstone_stairs', stairs('north')); for (let y = 1; y < 1 + k; y++) p.set(x0 + 3, y, 4 - k, 'smooth_sandstone'); }
    p.air(x0 + 3, 5, 1); p.air(x0 + 3, 5, 2);
    hangingLamp(p, x0 + 1, 5, 4, 1);
    // Dwelling above: bed, chest, candle, rug.
    bed(p, x0, 6, 3, i % 2 ? 'white' : 'red', 'north'); p.set(x0 + 2, 6, 2, 'chest', chest('south')); p.set(x0, 6, 1, 'candle', candle(2, true));
    rug(p, x0, 5, x0 + 2, 7, 6, i % 2 ? 'orange' : 'light_gray', 'brown');
    p.set(x0 + 1, 7, 0, 'glass_pane');
  });
  for (let x = 1; x <= 19; x++) for (let y = 5; y <= 8; y++) if (x % 5 !== 0) putFree(p, x, y, 0, 'smooth_sandstone');
  return p.payload();
}

// ------------------------------------------------------------ Thermen
function thermen() {
  const p = new Plot([25, 13, 19]);
  mix(p, 0, 0, 0, 24, 0, 18, TRAVERTIN, 2);
  // Ground floor level is y = 1; pools are sunk to y = 1 with their bottom at y = 0.
  mix(p, 1, 1, 1, 23, 1, 16, [['smooth_sandstone', 1]], 1);
  const shell = (x0: number, z0: number, x1: number, z1: number, y1: number) => { for (let y = 2; y <= y1; y++) { mix(p, x0, y, z0, x1, y, z0, TRAVERTIN, 3); mix(p, x0, y, z1, x1, y, z1, TRAVERTIN, 3); mix(p, x0, y, z0, x0, y, z1, TRAVERTIN, 3); mix(p, x1, y, z0, x1, y, z1, TRAVERTIN, 3); } };
  // Caldarium (west, domed), tepidarium (middle), frigidarium (east, vaulted), apodyterium (south strip).
  shell(0, 0, 10, 10, 7); shell(10, 0, 14, 10, 6); shell(14, 0, 24, 10, 6); shell(0, 10, 24, 17, 5);
  for (let x = 1; x <= 23; x++) for (let z = 1; z <= 16; z++) for (let y = 2; y <= 5; y++) if (!p.has(x, y, z)) p.air(x, y, z);
  // Doors between the rooms and to the street.
  for (const [x, z0] of [[12, 10], [5, 10], [19, 10]] as const) archZ(p, z0, z0, x, 2, 4, 'sandstone_stairs');
  for (const x of [10, 14]) archZ(p, 4, 6, x, 2, 4, 'sandstone_stairs');
  archX(p, 11, 13, 17, 2, 4, 'sandstone_stairs');
  // Caldarium: hot pool over magma (bubble column), benches, dome with oculus, furnace in the north wall.
  p.fill(3, 0, 3, 7, 0, 7, 'magma_block'); p.fill(3, 1, 3, 7, 1, 7, 'water', water());
  for (let x = 2; x <= 8; x++) for (let z = 2; z <= 8; z++) if (x === 2 || x === 8 || z === 2 || z === 8) p.set(x, 1, z, 'smooth_sandstone_slab', slab('top'));
  for (const z of [3, 5, 7]) { p.set(1, 2, z, 'sandstone_stairs', stairs('west')); p.set(9, 2, z, 'sandstone_stairs', stairs('east')); }
  for (let y = 2; y <= 7; y++) for (const [x, z] of [[1, 1], [9, 1], [1, 9], [9, 9]] as const) p.set(x, y, z, 'cut_sandstone');
  mix(p, 1, 7, 1, 9, 7, 9, TRAVERTIN, 4);
  const top = dome(p, 5, 5, 8, 4, TRAVERTIN, 'sandstone_stairs', 5);
  p.air(5, top, 5); p.air(5, top - 1, 5); p.air(5, 7, 5);
  p.set(5, 2, 0, 'furnace', furnace('north', true)); p.set(5, 3, 0, 'bricks'); p.set(5, 8, 0, 'brick_wall'); p.set(5, 9, 0, 'campfire', { facing: 'north', lit: T, signal_fire: F, waterlogged: F });
  for (const [x, z] of [[2, 2], [8, 2], [2, 8], [8, 8]] as const) p.set(x, 6, z, 'lantern', lantern(true));
  // Tepidarium: warm hall with benches, candles, a flat roof with a parapet.
  for (const z of [2, 8]) for (let x = 11; x <= 13; x++) p.set(x, 2, z, 'spruce_stairs', stairs(z === 2 ? 'north' : 'south'));
  p.set(11, 2, 5, 'candle', candle(3, true)); p.set(13, 2, 5, 'candle', candle(3, true)); hangingLamp(p, 12, 6, 5, 1);
  mix(p, 10, 6, 0, 14, 6, 10, TRAVERTIN, 6); for (let x = 10; x <= 14; x++) for (const z of [0, 10]) p.set(x, 7, z, 'sandstone_wall');
  // Frigidarium: cold pool, mosaic floor, high windows, barrel vault of stairs.
  for (let x = 15; x <= 23; x++) for (let z = 1; z <= 9; z++) p.set(x, 1, z, (x + z) % 2 ? 'white_terracotta' : (x * z) % 3 ? 'cyan_terracotta' : 'blue_terracotta');
  p.fill(17, 0, 3, 21, 0, 7, 'polished_diorite'); p.fill(17, 1, 3, 21, 1, 7, 'water', water());
  for (let x = 16; x <= 22; x++) for (let z = 2; z <= 8; z++) if (x === 16 || x === 22 || z === 2 || z === 8) p.set(x, 1, z, 'smooth_quartz_slab', slab('top'));
  for (const x of [16, 18, 20, 22]) { p.set(x, 5, 0, 'glass_pane'); p.set(x, 4, 0, 'sandstone_slab', slab('top')); }
  for (const z of [3, 7]) p.set(23, 2, z, 'sandstone_stairs', stairs('east'));
  for (let i = 0; i <= 4; i++) {
    const y = 6 + i;
    for (let z = 0; z <= 10; z++) {
      if (i < 4) { p.set(14 + i, y, z, 'sandstone_stairs', stairs('east')); p.set(24 - i, y, z, 'sandstone_stairs', stairs('west')); }
      if (i === 4) for (let x = 18; x <= 20; x++) p.set(x, y, z, 'smooth_sandstone_slab', slab());
      if (i > 0 && i < 4 && (z === 0 || z === 10)) mix(p, 14 + i + 1, y, z, 24 - i - 1, y, z, TRAVERTIN, 7);
    }
  }
  for (let x = 15; x <= 23; x++) for (let z = 1; z <= 9; z++) for (let y = 6; y <= 9; y++) if (!p.has(x, y, z) && Math.abs(x - 19) <= 7 - (y - 6) * 2) p.air(x, y, z);
  for (const [x, z] of [[16, 5], [22, 5]] as const) p.set(x, 7, z, 'lantern', lantern(true));
  // Apodyterium: lockers, benches, rugs, the street door with a portico.
  for (let x = 2; x <= 22; x += 2) if (x !== 12 && x !== 4 && x !== 6 && x !== 18 && x !== 20) p.set(x, 2, 11, 'chest', chest('south'));
  for (let x = 1; x <= 23; x++) if (x < 10 || x > 14) p.set(x, 2, 16, 'spruce_stairs', stairs('north'));
  rug(p, 9, 12, 15, 15, 1, 'cyan', 'white');
  for (const x of [6, 18]) hangingLamp(p, x, 5, 13, 1);
  mix(p, 0, 5, 10, 24, 5, 17, TRAVERTIN, 8);
  for (let x = 0; x <= 24; x++) for (const z of [10, 17]) putFree(p, x, 6, z, 'sandstone_wall');
  for (let z = 10; z <= 17; z++) for (const x of [0, 24]) putFree(p, x, 6, z, 'sandstone_wall');
  for (const x of [9, 15]) column(p, x, 18, 1, 4, 'quartz_pillar', 'chiseled_quartz_block', 'quartz_stairs');
  for (let x = 8; x <= 16; x++) p.set(x, 5, 18, 'smooth_sandstone_slab', slab());
  for (let x = 9; x <= 15; x++) p.set(x, 5, 17, 'sandstone_stairs', stairs('south', 'top'));
  for (const x of [8, 16]) p.set(x, 2, 18, 'lantern', lantern());
  // Pilasters and cornice around the outside.
  for (let x = 2; x <= 22; x += 4) for (const z of [0, 17]) for (let y = 2; y <= 4; y++) if (p.get(x, y, z)?.id !== 'minecraft:air' && p.has(x, y, z)) p.set(x, y, z, 'cut_sandstone');
  for (let z = 2; z <= 15; z += 4) for (const x of [0, 24]) for (let y = 2; y <= 4; y++) if (p.has(x, y, z)) p.set(x, y, z, 'cut_sandstone');
  return p.payload();
}

// ------------------------------------------------------------ Ludus (Gladiatorenschule)
function ludus() {
  const p = new Plot([27, 9, 23]), cx = 13, cz = 11;
  mix(p, 0, 0, 0, 26, 0, 22, TRAVERTIN, 2);
  // Outer wall with pilasters, arcade ring at offset 4 on wall posts, cells between wall and arcade.
  for (let y = 1; y <= 7; y++) p.ring(0, 0, 26, 22, y, pick(TRAVERTIN, y, y, 0, 3));
  for (let x = 0; x <= 26; x++) for (let z = 0; z <= 22; z++) {
    if (x !== 0 && x !== 26 && z !== 0 && z !== 22) continue;
    const pil = (x === 0 || x === 26) ? z % 4 === 2 : x % 4 === 2;
    for (let y = 1; y <= 7; y++) p.set(x, y, z, pil && y < 7 ? 'cut_sandstone' : y === 7 ? 'sandstone_wall' : pick(TRAVERTIN, x, y, z, 3));
    if (!pil && y7Window(x, z)) { p.set(x, 3, z, 'glass_pane'); p.set(x, 4, z, 'sandstone_stairs', stairs(x === 0 ? 'east' : x === 26 ? 'west' : z === 0 ? 'south' : 'north', 'top')); }
  }
  function y7Window(x: number, z: number): boolean { return (x === 0 || x === 26) ? z % 4 === 0 && z > 0 && z < 22 : x % 4 === 0 && x > 0 && x < 26; }
  for (let x = 4; x <= 22; x++) for (let z = 4; z <= 18; z++) {
    if (x !== 4 && x !== 22 && z !== 4 && z !== 18) continue;
    const along = (x === 4 || x === 22) ? z - 4 : x - 4;
    if (along % 2 === 0) { p.fill(x, 1, z, x, 2, z, 'sandstone_wall'); p.set(x, 3, z, 'cut_sandstone'); }
    else p.set(x, 3, z, 'sandstone_slab', slab('top'));
  }
  // Lean-to roof of tiles from the arcade up to the wall.
  for (let d = 0; d <= 3; d++) {
    const x0 = 4 - d, z0 = 4 - d, x1 = 22 + d, z1 = 18 + d, y = 4 + d;
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      if (x !== x0 && x !== x1 && z !== z0 && z !== z1) continue;
      const side: H = z === z0 ? 'north' : z === z1 ? 'south' : x === x0 ? 'west' : 'east';
      if (d === 3) p.set(x, y, z, 'brick_slab', slab('top'));
      else p.set(x, y, z, 'brick_stairs', stairs(side));
    }
  }
  // Cells: partitions every four blocks, each with bed, chest and candle; the south wing holds the gate and the armoury.
  const partitions = (fixedX: number | null, fixedZ: number | null) => {
    for (let a = 5; a <= 21; a += 4) {
      if (fixedZ !== null) { if (a >= 11 && a <= 15 && fixedZ === 21) continue; for (let z = fixedZ === 1 ? 1 : 19; z <= (fixedZ === 1 ? 3 : 21); z++) for (let y = 1; y <= 3; y++) p.set(a, y, z, pick(TRAVERTIN, a, y, z, 4)); }
      if (fixedX !== null) for (let x = fixedX === 1 ? 1 : 23; x <= (fixedX === 1 ? 3 : 25); x++) for (let y = 1; y <= 3; y++) p.set(x, y, a, pick(TRAVERTIN, x, y, a, 4));
    }
  };
  partitions(null, 1); partitions(null, 21); partitions(1, null); partitions(23, null);
  let n = 0;
  for (let a = 6; a <= 18; a += 4) {
    bed(p, a + 1, 1, 1, n % 2 ? 'brown' : 'white', 'west'); p.set(a + 2, 1, 2, 'chest', chest('west')); p.set(a + 2, 1, 3, 'candle', candle(1, true)); n++;
    if (a < 10 || a > 14) { bed(p, a + 1, 1, 21, n % 2 ? 'brown' : 'white', 'west'); p.set(a + 2, 1, 20, 'chest', chest('west')); p.set(a + 2, 1, 19, 'candle', candle(1, true)); n++; }
    bed(p, 1, 1, a + 1, n % 2 ? 'brown' : 'white', 'north'); p.set(2, 1, a + 2, 'chest', chest('north')); p.set(3, 1, a + 2, 'candle', candle(1, true)); n++;
    bed(p, 25, 1, a + 1, n % 2 ? 'brown' : 'white', 'north'); p.set(24, 1, a + 2, 'chest', chest('north')); p.set(23, 1, a + 2, 'candle', candle(1, true)); n++;
  }
  // Gate in the south wall, armoury beside it (grindstone, anvil, weapon racks).
  archX(p, 12, 14, 22, 1, 4, 'sandstone_stairs');
  for (const x of [11, 15]) p.set(x, 5, 22, 'lantern', lantern()); for (const x of [11, 15]) p.set(x, 4, 22, 'cut_sandstone');
  p.set(16, 1, 20, 'grindstone', { face: 'floor', facing: 'west' }); p.set(17, 1, 20, 'anvil', { facing: 'north' }); p.set(18, 1, 20, 'smithing_table');
  for (const x of [20, 21]) { p.set(x, 1, 20, 'oak_fence', FENCE_PROPS); p.set(x, 2, 20, 'iron_bars', FENCE_PROPS); }
  // Courtyard: sand training ring with post rail, dummies, target, water troughs, shade trees in pots.
  p.disc(cx, cz, 0, 5, 'sand');
  for (let x = cx - 6; x <= cx + 6; x++) for (let z = cz - 6; z <= cz + 6; z++) {
    const q = (x - cx) ** 2 + (z - cz) ** 2;
    if (q > 25 + 4 && q <= 36 + 4.8 && (x + z) % 2 === 0) p.set(x, 1, z, 'oak_fence', FENCE_PROPS);
  }
  for (const [x, z] of [[cx - 2, cz - 2], [cx + 2, cz + 2]] as const) { p.set(x, 1, z, 'oak_fence', FENCE_PROPS); p.set(x, 2, z, 'hay_block', axis('y')); }
  p.set(cx + 3, 1, cz - 2, 'oak_fence', FENCE_PROPS); p.set(cx + 3, 2, cz - 2, 'target', { power: '0' });
  for (const x of [6, 7]) p.set(x, 1, 6, 'cauldron');
  for (const [x, z] of [[6, 16], [20, 16], [20, 6]] as const) { p.set(x, 1, z, 'sandstone_wall'); p.set(x, 2, z, 'lantern', lantern()); }
  p.set(8, 1, 16, 'potted_azalea_bush'); p.set(18, 1, 16, 'potted_flowering_azalea_bush');
  // Relief: pilasters stand a block in front of the wall, a cornice of upside-down stairs crowns it (plan grows by one block all round).
  const q = p.moved(1, 0, 1, [29, 9, 25]);
  mix(q, 0, 0, 0, 28, 0, 0, TRAVERTIN, 9); mix(q, 0, 0, 24, 28, 0, 24, TRAVERTIN, 9); mix(q, 0, 0, 0, 0, 0, 24, TRAVERTIN, 9); mix(q, 28, 0, 0, 28, 0, 24, TRAVERTIN, 9);
  for (let x = 1; x <= 27; x++) for (const z of [0, 24]) { if (x % 4 === 3) for (let y = 1; y <= 6; y++) q.set(x, y, z, 'cut_sandstone'); q.set(x, 7, z, 'sandstone_stairs', stairs(z === 0 ? 'south' : 'north', 'top')); }
  for (let z = 1; z <= 23; z++) for (const x of [0, 28]) { if (z % 4 === 3) for (let y = 1; y <= 6; y++) q.set(x, y, z, 'cut_sandstone'); q.set(x, 7, z, 'sandstone_stairs', stairs(x === 0 ? 'east' : 'west', 'top')); }
  for (const [x, z] of [[0, 0], [28, 0], [0, 24], [28, 24]] as const) q.set(x, 7, z, 'sandstone_slab', slab('top'));
  q.set(14, 5, 24, 'red_wall_banner', wallBanner('south'));
  for (let y = 1; y <= 6; y++) for (const [x, z] of [[0, 0], [28, 0], [0, 24], [28, 24]] as const) q.set(x, y, z, 'cut_sandstone');
  return q.payload();
}

const W5 = 'weg_5';
export const ANTIKE_SPECS: readonly BuildingSpec[] = [
  { id: 'bld_antike_kolosseum', name: 'Kolosseum', payload: arena('kolosseum'), tags: ['kolosseum', 'arena', 'amphitheater', 'hypogäum', 'generator:arena'],
    description: 'Ovales Amphitheater 81 × 61 nach Philipps Bauplan: vier Etagen aus Sandstein-Rundbögen (32 je Etage), Wandelgang mit Treppen, zwei Ränge auf Gewölben, Podiumsmauer, Sandarena 41 × 21, vier Tore mit Wegeanschluss, Hypogäum mit Gängen, Kammern, Zellen und Aufzugsschächten, Velarium auf Masten.',
    facets: { kategorie: ['wahrzeichen'], stil: ['antik', 'wuestenstil'], biom: ['ebene', 'wueste', 'savanne'], funktion: ['versammlung', 'unterhaltung'] },
    connectors: [joint('west', [0, 10, 30], [-1, 0, 0], 'path_joint', W5), joint('ost', [81, 10, 30], [1, 0, 0], 'path_joint', W5), joint('nord', [40, 10, 0], [0, 0, -1], 'path_joint', W5), joint('sued', [40, 10, 61], [0, 0, 1], 'path_joint', W5)],
    tips: ['Bodenniveau ist Ebene 9 des Plans: die neun Ebenen darunter (Hypogäum) zuerst ausheben, dann die Arena schließen.', 'Reihenfolge wie im Bauplan: ovales Fundament, Arena und Podium, Ränge, dann Etage für Etage die Fassade; die Sitzreihen sind begehbare Treppen.', 'Im Generator „Arena“ lässt sich dasselbe Bauwerk in Marmor, kleiner oder ohne Hypogäum erzeugen.'],
    inspiration: [WIKI('Sandstone', 'Sandstein')] },
  { id: 'bld_antike_provinzarena', name: 'Provinzarena', payload: arena('provinz'), tags: ['arena', 'amphitheater', 'generator:arena'],
    description: 'Kleines Amphitheater 53 × 41 aus Stein mit zwei Etagen, sechs Sitzreihen, Sandarena 25 × 13 und zwei Toren; ohne Hypogäum, für Dörfer und Außenposten.',
    facets: { kategorie: ['oeffentlich'], stil: ['antik', 'mittelalterlich'], biom: ['ebene', 'wald', 'gebirge'], funktion: ['versammlung', 'unterhaltung'] },
    connectors: [joint('west', [0, 1, 20], [-1, 0, 0], 'path_joint', W5), joint('ost', [53, 1, 20], [1, 0, 0], 'path_joint', W5)] },
  { id: 'bld_antike_triumphbogen', name: 'Kaiserlicher Ehrenbogen', payload: triumphbogen, tags: ['triumphbogen', 'tor', 'marmor', 'denkmal'],
    description: 'Großer dreitoriger Triumphbogen aus Marmor, 15 × 15 × 7: hoher Mitteldurchgang, zwei Seitenbögen, Halbsäulen mit Kapitellen, Gebälk mit Gesims, Attika mit Inschriftband und Bannern, bekrönt von Figurensockeln und vergoldeter Mitte.',
    facets: { kategorie: ['wahrzeichen'], stil: ['antik', 'klassisch'], biom: ['ebene', 'wueste', 'savanne'], funktion: ['orientierung', 'deko', 'verbindung'] },
    tips: ['Stellt man den Bogen quer über eine 3 breite Straße, läuft der Weg durch den Mitteldurchgang; die Seitenbögen sind Fußgängerdurchgänge.'] },
  { id: 'bld_antike_ehrensaeule', name: 'Ehrensäule', payload: ehrensaeule, tags: ['säule', 'forum', 'statue', 'denkmal'],
    description: 'Freistehende Quarzsäule auf gestuftem Sockel mit Ringen, Kapitell und vergoldeter Figur auf der Spitze; Laternen und Pflanzkübel an den Ecken. Mittelpunkt eines Forums oder Platzes.',
    facets: { kategorie: ['wahrzeichen'], stil: ['antik', 'klassisch'], biom: ['ueberall'], funktion: ['orientierung', 'deko'] } },
  { id: 'bld_antike_tabernae', name: 'Tabernae', payload: tabernae, tags: ['läden', 'arkaden', 'markise', 'wohnen oben'],
    description: 'Vier römische Läden hinter einer Bogenarkade: Garküche, Bäckerei, Töpferei und Tuchhändler mit Theken und Markisen; über jeder Taberna eine Wohnung mit Treppe, Bett und Fenster, darüber ein Ziegel-Flachdach mit Brüstung.',
    facets: { kategorie: ['handel'], stil: ['antik', 'klassisch'], biom: ['ebene', 'wueste', 'savanne'], funktion: ['handel', 'wohnen', 'kochen'] },
    tips: ['Die Theke ist eine obere Stufenreihe zur Straße; Kunden stehen in der Arkade, verkauft wird über die Theke.'] },
  { id: 'bld_antike_thermen', name: 'Thermen', payload: thermen, tags: ['bad', 'kuppel', 'mosaik', 'becken'],
    description: 'Römisches Bad: Umkleide mit Truhen und Bänken, warmes Mittelschiff, Kaltbad mit Mosaikboden, Becken und Tonnengewölbe, Heißbad unter einer Kuppel mit Okulus; das heiße Becken sprudelt über Magma, der Ofen in der Nordwand heizt.',
    facets: { kategorie: ['oeffentlich'], stil: ['antik', 'klassisch'], biom: ['ebene', 'wueste', 'savanne'], funktion: ['erholung', 'versammlung', 'wasserquelle'] }, gaps: ['minecraft:water'],
    tips: ['Magmablöcke unter Wasser erzeugen eine Blasensäule, die Spieler nach unten zieht – im flachen Becken harmlos und ein echter Whirlpool-Effekt.'],
    inspiration: [WIKI('Bubble_Column', 'Blasensäule')] },
  { id: 'bld_antike_ludus', name: 'Gladiatorenschule', payload: ludus, tags: ['ludus', 'gladiatoren', 'kaserne', 'übungsplatz'],
    description: 'Geschlossener Hof mit Säulenarkade und Pultdach aus Ziegeln, vierzehn Schlafzellen mit Bett, Truhe und Kerze, Rüstkammer mit Schleifstein und Amboss, Tor mit Banner und in der Mitte ein runder Sandplatz mit Zaun, Strohpuppen, Zielscheibe und Wassertrögen.',
    facets: { kategorie: ['befestigung'], stil: ['antik', 'klassisch'], biom: ['ebene', 'wueste', 'savanne'], funktion: ['wohnen', 'verteidigung', 'versammlung'] },
    tips: ['Der Übungsplatz hat denselben Sandboden wie die Arena des Kolosseums; wer hier trainiert, trainiert unter Wettkampfbedingungen.'] },
];
