import { Plot, axis, candle, slab, F, door, facing, grass, hipRoof, lantern, lectern, noise, roundTree, stairs } from '../plot.js';
import { WIKI } from '../spec.js';
import type { BuildingSpec } from '../spec.js';
import { beltCourse, column, hangLantern, ladderUp, LOOKS, lookWith, pick, pitchedRoof, put, putFree } from '../style.js';
import type { Look, Mix } from '../style.js';

/** Sakral & Magie: cathedral, temples, shrines, stone circle, enchanting tower, graveyard. */

const GOTH_STONE: Mix = [['stone_bricks', 9], ['mossy_stone_bricks', 1], ['cracked_stone_bricks', 2], ['andesite', 1], ['polished_andesite', 1]];
const GOTH_LOOK: Look = lookWith(LOOKS.stein, { wall: GOTH_STONE, base: [['cobblestone', 4], ['stone_bricks', 4], ['mossy_cobblestone', 2]], baseStairs: 'stone_brick_stairs', baseSlab: 'stone_brick_slab', baseWall: 'stone_brick_wall',
  roof: [['deepslate_tiles', 5], ['cracked_deepslate_tiles', 1]], roofStairs: 'deepslate_tile_stairs', roofSlab: 'deepslate_tile_slab', trim: 'dark_oak', frame: 'stone_bricks' });

/** Spire: a stepped square cone of stairs with corner pinnacles, ending in a rod. */
function spire(p: Plot, x0: number, z0: number, w: number, y: number, stairId: string, body: string): number {
  let yy = y;
  for (let s = 0; w - 2 * s >= 1; s++) {
    const a = x0 + s, b = x0 + w - 1 - s, c = z0 + s, d = z0 + w - 1 - s;
    for (let k = 0; k < 2 && a <= b; k++, yy++) for (let x = a; x <= b; x++) for (let z = c; z <= d; z++) {
      const edge = x === a || x === b || z === c || z === d;
      if (!edge) { p.set(x, yy, z, body); continue; }
      const f = z === c ? 'south' : z === d ? 'north' : x === a ? 'east' : 'west';
      p.set(x, yy, z, stairId, stairs(f));
    }
    if (a === b) break;
  }
  p.set(x0 + (w - 1) / 2, yy, z0 + (w - 1) / 2, 'stone_brick_wall');
  p.set(x0 + (w - 1) / 2, yy + 1, z0 + (w - 1) / 2, 'lightning_rod', { facing: 'up', powered: F, waterlogged: F });
  return yy + 1;
}

/** Gothic cathedral: high nave with clerestory, low aisles with lean-to roofs, buttresses, two west towers with spires, rose window, apse. */
function kathedrale() {
  const p = new Plot([19, 2, 33]), l = GOTH_LOOK;
  for (let x = 0; x <= 18; x++) for (let z = 0; z <= 32; z++) put(p, x, 0, z, x >= 3 && x <= 15 && z >= 7 && z <= 30 ? ((x + z) % 2 ? 'polished_andesite' : 'polished_diorite') : pick(l.base, x, 0, z, 4));
  const wallCell = (x: number, y: number, z: number) => put(p, x, y, z, pick(GOTH_STONE, x, y, z, 4));
  // Nave x 6..12, z 7..30, walls to y 14; aisles x 3..6 and 12..15, walls to y 6.
  for (let y = 1; y <= 14; y++) for (let z = 7; z <= 30; z++) for (let x = 3; x <= 15; x++) {
    const nave = x >= 6 && x <= 12, aisle = !nave;
    if (aisle && y > 6) continue;
    const edge = x === 3 || x === 15 || z === 7 || z === 30 || (nave && y > 6 && (x === 6 || x === 12));
    const pier = (x === 6 || x === 12) && (z - 7) % 4 === 0;
    if (edge || (pier && y <= 6)) wallCell(x, y, z); else p.air(x, y, z);
  }
  for (let z = 8; z <= 29; z++) for (let x = 4; x <= 14; x++) if (!(x >= 6 && x <= 12)) put(p, x, 7, z, pick(GOTH_STONE, x, 7, z, 5));
  // Arcade arches between piers.
  for (let z = 8; z <= 29; z++) for (const x of [6, 12]) if ((z - 7) % 4 !== 0) { put(p, x, 6, z, 'stone_bricks'); if ((z - 7) % 4 === 1) put(p, x, 5, z, 'stone_brick_stairs', stairs('south', 'top')); if ((z - 7) % 4 === 3) put(p, x, 5, z, 'stone_brick_stairs', stairs('north', 'top')); }
  // Tall pointed windows: aisles y2..4, clerestory y9..12.
  for (let z = 9; z <= 29; z += 4) {
    for (const x of [3, 15]) { for (let y = 2; y <= 4; y++) put(p, x, y, z, y === 4 ? 'yellow_stained_glass_pane' : 'light_blue_stained_glass_pane'); put(p, x, 5, z, 'stone_brick_stairs', stairs(x === 3 ? 'east' : 'west', 'top')); }
    for (const x of [6, 12]) { for (let y = 9; y <= 12; y++) put(p, x, y, z, y >= 11 ? 'purple_stained_glass_pane' : 'blue_stained_glass_pane'); put(p, x, 13, z, 'stone_brick_stairs', stairs(x === 6 ? 'east' : 'west', 'top')); }
  }
  // Buttresses with flying arches over the aisle roofs.
  for (let z = 7; z <= 30; z += 4) for (const [x, o] of [[2, -1], [16, 1]] as const) {
    for (let y = 1; y <= 8; y++) put(p, x, y, z, pick(GOTH_STONE, x, y, z, 6));
    put(p, x, 9, z, 'stone_brick_stairs', stairs(o < 0 ? 'east' : 'west'));
    put(p, x - o, 9, z, pick(GOTH_STONE, x - o, 9, z, 6)); put(p, x - o, 10, z, 'stone_brick_stairs', stairs(o < 0 ? 'east' : 'west'));
    for (let i = 2; i <= 3; i++) { put(p, x - o * i, 10, z, 'stone_brick_slab', slab('top')); }
    put(p, x - o * 3, 11, z, 'stone_brick_stairs', stairs(o < 0 ? 'east' : 'west'));
    putFree(p, x + o, 1, z, 'stone_brick_stairs', stairs(o < 0 ? 'east' : 'west'));
  }
  // Roofs: steep nave roof, lean-to aisle roofs.
  pitchedRoof(p, l, { walls: { x0: 6, z0: 7, x1: 12, z1: 30 }, y: 15, kind: 'sattel', ridge: 'z', overhang: 1, pitch: 'steil', seed: 4 });
  for (const [x0, x1, f] of [[3, 5, 'east'], [13, 15, 'west']] as const) for (let z = 7; z <= 30; z++) for (let x = x0; x <= x1; x++) {
    const step = f === 'east' ? x - x0 : x1 - x;
    put(p, x, 8 + step, z, 'deepslate_tile_stairs', stairs(f));
  }
  // West front: two towers x 3..7 and 11..15, z 2..7, a portal between with a rose window.
  for (const tx of [3, 11]) {
    for (let y = 1; y <= 22; y++) for (let x = tx; x <= tx + 4; x++) for (let z = 2; z <= 7; z++) {
      const e = x === tx || x === tx + 4 || z === 2 || z === 7;
      if (e) put(p, x, y, z, (x === tx || x === tx + 4) && (z === 2 || z === 7) ? 'chiseled_stone_bricks' : pick(GOTH_STONE, x, y, z, 7)); else p.air(x, y, z);
    }
    for (const y of [7, 15]) beltCourse(p, l, { x0: tx, z0: 2, x1: tx + 4, z1: 7 }, y);
    for (const y of [10, 17]) { put(p, tx + 2, y, 2, 'iron_bars'); put(p, tx + 2, y + 1, 2, 'iron_bars'); put(p, tx + 2, y + 2, 2, 'stone_brick_stairs', stairs('south', 'top')); }
    for (let x = tx; x <= tx + 4; x++) for (let z = 2; z <= 7; z++) put(p, x, 23, z, (x + z) % 2 ? 'stone_brick_slab' : 'stone_bricks', (x + z) % 2 ? slab() : {});
    spire(p, tx, 2, 5, 24, 'deepslate_tile_stairs', 'deepslate_tiles');
  }
  for (let y = 1; y <= 16; y++) for (let x = 8; x <= 10; x++) { put(p, x, y, 6, pick(GOTH_STONE, x, y, 6, 8)); if (y > 14) put(p, x, y, 7, pick(GOTH_STONE, x, y, 7, 8)); }
  for (let y = 1; y <= 4; y++) p.air(9, y, 6);
  for (let y = 1; y <= 3; y++) p.air(9, y, 7);
  door(p, 9, 1, 6, 'dark_oak', 'south');
  p.set(9, 3, 6, 'stone_brick_stairs', stairs('south', 'top')); p.set(8, 4, 6, 'stone_brick_stairs', stairs('east', 'top')); p.set(10, 4, 6, 'stone_brick_stairs', stairs('west', 'top')); p.set(9, 4, 6, 'stone_bricks');
  for (const x of [7, 11]) for (let y = 1; y <= 5; y++) putFree(p, x, y, 5, 'stone_brick_wall');
  // Rose window.
  for (let x = 7; x <= 11; x++) for (let y = 8; y <= 12; y++) { const d = Math.hypot(x - 9, y - 10); if (d <= 2.3) p.set(x, y, 6, d < 0.5 ? 'orange_stained_glass' : d < 1.5 ? 'red_stained_glass' : 'purple_stained_glass'); }
  pitchedRoof(p, l, { walls: { x0: 8, z0: 6, x1: 10, z1: 7 }, y: 17, kind: 'sattel', ridge: 'z', overhang: 0, pitch: 'steil', seed: 9, noSoffit: true });
  for (let x = 6; x <= 12; x++) putFree(p, x, 0, 1, 'stone_brick_stairs', stairs('south'));
  // Apse: half-round choir beyond z 30.
  for (let y = 1; y <= 10; y++) for (let x = 6; x <= 12; x++) for (let z = 30; z <= 32; z++) { const d = Math.hypot(x - 9, (z - 30) * 1.4); if (d <= 3.4 && d > 2.4) put(p, x, y, z, pick(GOTH_STONE, x, y, z, 9)); else if (d <= 2.4 && z > 30) p.air(x, y, z); }
  for (let y = 1; y <= 9; y++) for (let x = 7; x <= 11; x++) p.air(x, y, 30);
  for (let x = 6; x <= 12; x++) for (let z = 30; z <= 32; z++) { const d = Math.hypot(x - 9, (z - 30) * 1.4); if (d <= 3.4) p.set(x, 11, z, d > 2.4 ? 'deepslate_tile_slab' : 'deepslate_tiles', d > 2.4 ? slab() : {}); }
  for (const x of [8, 10]) for (let y = 3; y <= 6; y++) p.set(x, y, 32, 'yellow_stained_glass_pane');
  // Interior.
  for (let z = 10; z <= 24; z += 2) for (const x of [7, 8, 10, 11]) p.set(x, 1, z, 'spruce_stairs', stairs('south'));
  for (let z = 8; z <= 27; z++) p.set(9, 1, z, 'red_carpet');
  p.fill(7, 1, 28, 11, 1, 29, 'polished_diorite'); p.fill(8, 2, 29, 10, 2, 29, 'quartz_block'); p.set(9, 2, 28, 'lectern', lectern('north'));
  for (const x of [8, 10]) p.set(x, 3, 29, 'candle', candle(3, true));
  for (let z = 11; z <= 27; z += 8) hangLantern(p, l, 9, 11, z);
  for (const x of [4, 14]) for (const z of [12, 20]) hangLantern(p, l, x, 4, z);
  return p.payload();
}

/** Classical temple: three-step stylobate, peristyle of columns with capitals, entablature, cella, stepped pediments. */
function antikerTempel() {
  const p = new Plot([15, 2, 21]);
  const marble: Mix = [['quartz_bricks', 4], ['smooth_quartz', 3], ['calcite', 2]];
  for (let i = 0; i < 3; i++) for (let x = i; x <= 14 - i; x++) for (let z = i; z <= 20 - i; z++) {
    const edge = x === i || x === 14 - i || z === i || z === 20 - i;
    put(p, x, i, z, edge && i < 2 ? 'quartz_stairs' : pick(marble, x, i, z, 2), edge && i < 2 ? stairs(z === i ? 'south' : z === 20 - i ? 'north' : x === i ? 'east' : 'west') : {});
  }
  for (let x = 3; x <= 11; x++) for (let z = 3; z <= 17; z++) put(p, x, 2, z, (x + z) % 2 ? 'smooth_quartz' : 'polished_diorite');
  const cols: [number, number][] = [];
  for (let x = 3; x <= 11; x += 2) cols.push([x, 3], [x, 17]);
  for (let z = 5; z <= 15; z += 2) cols.push([3, z], [11, z]);
  for (const [x, z] of cols) column(p, x, z, 3, 7, 'quartz_pillar', 'chiseled_quartz_block', 'quartz_stairs');
  // Entablature: architrave, frieze of alternating blocks, cornice of upside-down stairs.
  for (let x = 3; x <= 11; x++) for (let z = 3; z <= 17; z++) put(p, x, 10, z, 'smooth_quartz');
  for (let x = 3; x <= 11; x++) for (let z = 3; z <= 17; z++) if (x === 3 || x === 11 || z === 3 || z === 17) put(p, x, 11, z, (x + z) % 2 ? 'chiseled_quartz_block' : 'quartz_bricks');
  for (let x = 2; x <= 12; x++) for (const z of [2, 18]) putFree(p, x, 11, z, 'quartz_stairs', stairs(z === 2 ? 'south' : 'north', 'top'));
  for (let z = 3; z <= 17; z++) for (const x of [2, 12]) putFree(p, x, 11, z, 'quartz_stairs', stairs(x === 2 ? 'east' : 'west', 'top'));
  // Cella.
  for (let y = 3; y <= 9; y++) for (let x = 5; x <= 9; x++) for (let z = 6; z <= 14; z++) { const e = x === 5 || x === 9 || z === 6 || z === 14; if (e) put(p, x, y, z, pick(marble, x, y, z, 3)); else p.air(x, y, z); }
  for (let y = 3; y <= 6; y++) p.air(7, y, 6);
  p.set(7, 7, 6, 'quartz_stairs', stairs('south', 'top')); p.set(6, 7, 6, 'quartz_stairs', stairs('east', 'top')); p.set(8, 7, 6, 'quartz_stairs', stairs('west', 'top'));
  // Roof: low-pitched with stepped pediments of quartz stairs; copper ridge.
  for (let i = 0; i <= 4; i++) for (let z = 2; z <= 18; z++) for (const x of [2 + i, 12 - i]) {
    const pediment = z === 2 || z === 18;
    if (i === 4 && x === 6) continue;
    put(p, x, 12 + i, z, pediment && x !== 2 + i && x !== 12 - i ? 'smooth_quartz' : pediment ? 'quartz_stairs' : 'oxidized_cut_copper_stairs', stairs(x < 7 ? 'east' : 'west'));
    if (x !== 7) for (let xx = 2 + i + 1; xx < 12 - i; xx++) if (pediment) put(p, xx, 12 + i, z, 'smooth_quartz'); else if (i < 4) p.air(xx, 12 + i, z);
  }
  for (let z = 2; z <= 18; z++) put(p, 7, 17, z, z === 2 || z === 18 ? 'smooth_quartz_slab' : 'oxidized_cut_copper_slab', slab());
  for (let z = 2; z <= 18; z++) put(p, 7, 16, z, z === 2 || z === 18 ? 'smooth_quartz' : 'oxidized_cut_copper');
  for (const z of [2, 18]) p.set(7, 14, z, 'chiseled_quartz_block');
  p.set(7, 3, 12, 'gold_block'); p.set(7, 4, 12, 'lantern', lantern());
  for (const [x, z] of [[2, 2], [12, 2], [2, 18], [12, 18]] as const) p.set(x, 3, z, 'lantern', lantern());
  for (const [x, z] of [[6, 13], [8, 13]] as const) p.set(x, 3, z, 'potted_azalea_bush');
  return p.payload();
}

function schrein() {
  const p = new Plot([7, 8, 7]);
  p.fill(0, 0, 0, 6, 0, 6, 'stone_bricks'); p.fill(1, 1, 1, 5, 1, 5, 'mossy_stone_bricks');
  for (const [x, z] of [[1, 1], [5, 1], [1, 5], [5, 5]] as const) p.fill(x, 2, z, x, 4, z, 'stripped_dark_oak_log', axis('y'));
  hipRoof(p, 0, 6, 0, 6, 5, 'dark_oak_stairs', 'dark_oak_slab');
  p.set(3, 2, 4, 'chiseled_stone_bricks'); p.set(3, 3, 4, 'candle', candle(4, true)); p.set(3, 4, 3, 'lantern', lantern(true));
  p.set(2, 2, 4, 'flower_pot'); p.set(4, 2, 4, 'potted_red_tulip');
  for (let x = 2; x <= 4; x++) p.set(x, 1, 0, 'stone_brick_stairs', stairs('south'));
  return p.payload();
}

function torii() {
  const p = new Plot([9, 8, 3]);
  for (const x of [1, 7]) { p.set(x, 0, 1, 'stone_bricks'); p.fill(x, 1, 1, x, 5, 1, 'crimson_stem', axis('y')); }
  p.fill(1, 4, 1, 7, 4, 1, 'red_concrete');
  p.fill(1, 6, 1, 7, 6, 1, 'black_concrete'); p.set(4, 5, 1, 'red_concrete');
  p.set(0, 6, 1, 'polished_blackstone_stairs', stairs('east')); p.set(8, 6, 1, 'polished_blackstone_stairs', stairs('west'));
  return p.payload();
}

function wuestenpyramide() {
  const p = new Plot([21, 12, 21]);
  for (let i = 0; i <= 10; i++) p.ring(i, i, 20 - i, 20 - i, i, i % 3 === 2 ? 'cut_sandstone' : 'sandstone');
  for (let i = 0; i < 10; i++) p.fill(i + 1, i, i + 1, 19 - i, i, 19 - i, null);
  p.fill(0, 0, 0, 20, 0, 20, 'sandstone'); p.fill(4, 1, 4, 16, 1, 16, null);
  p.fill(9, 1, 0, 11, 3, 3, null);
  for (let x = 8; x <= 12; x++) for (let z = 8; z <= 12; z++) p.set(x, 0, z, (x + z) % 2 ? 'orange_terracotta' : 'blue_terracotta');
  p.set(10, 0, 10, 'blue_terracotta');
  p.set(10, 1, 14, 'chest', { facing: 'north', type: 'single', waterlogged: 'false' });
  for (const [x, z] of [[6, 6], [14, 6], [6, 14], [14, 14]] as const) p.set(x, 1, z, 'lantern', lantern());
  return p.payload();
}

function steinkreis() {
  const p = new Plot([13, 6, 13]);
  for (let x = 0; x < 13; x++) for (let z = 0; z < 13; z++) p.set(x, 0, z, 'grass_block', grass());
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2, x = Math.round(6 + Math.cos(a) * 5), z = Math.round(6 + Math.sin(a) * 5);
    const h = 2 + (i % 3 === 0 ? 1 : 0);
    p.fill(x, 1, z, x, h, z, noise(x, 0, z) > 0.5 ? 'mossy_cobblestone' : 'stone');
  }
  p.fill(6, 1, 6, 6, 1, 6, 'chiseled_stone_bricks'); p.set(6, 2, 6, 'candle', candle(3, true));
  return p.payload();
}

const MAGE_STONE: Mix = [['deepslate_bricks', 7], ['cracked_deepslate_bricks', 2], ['deepslate_tiles', 2], ['polished_deepslate', 1], ['cobbled_deepslate', 1]];
/** Wizard tower: battered deepslate foot, belt courses, balcony on corbels, purple bay windows, a crooked spire with amethyst tip. */
function zaubererturm() {
  const p = new Plot([15, 2, 15]), c = 7;
  const ring = (r: number, f: (x: number, z: number, edge: boolean, d: number) => void) => {
    for (let x = 0; x <= 14; x++) for (let z = 0; z <= 14; z++) { const d = Math.hypot(x - c, z - c); if (d <= r + 0.35) f(x, z, d > r - 0.95, d); }
  };
  const face = (x: number, z: number) => { const dx = c - x, dz = c - z; return Math.abs(dx) >= Math.abs(dz) ? (dx > 0 ? 'east' : 'west') : (dz > 0 ? 'south' : 'north'); };
  ring(5.5, (x, z) => p.set(x, 0, z, pick(MAGE_STONE, x, 0, z, 6)));
  for (let y = 1; y <= 18; y++) ring(y <= 2 ? 5 : 4.5, (x, z, e) => e ? p.set(x, y, z, pick(MAGE_STONE, x, y, z, 6)) : p.air(x, y, z));
  ring(5.5, (x, z, _e, d) => { if (d > 4.9) putFree(p, x, 3, z, 'deepslate_brick_stairs', stairs(face(x, z))); });
  for (const y of [7, 13]) { ring(3.7, (x, z) => p.set(x, y, z, 'dark_oak_planks')); ring(5.4, (x, z, _e, d) => { if (d > 4.9) putFree(p, x, y, z, 'deepslate_brick_stairs', stairs(face(x, z), 'top')); }); }
  // Balcony at the top on corbels.
  ring(6.5, (x, z, _e, d) => { if (d > 4.9) { if (d <= 5.9) putFree(p, x, 18, z, 'deepslate_brick_stairs', stairs(face(x, z), 'top')); p.set(x, 19, z, 'polished_deepslate'); if (d > 5.6) p.set(x, 20, z, (x + z) % 2 ? 'deepslate_brick_wall' : 'polished_deepslate_wall'); } else p.set(x, 19, z, 'dark_oak_planks'); });
  for (let y = 20; y <= 23; y++) ring(3.5, (x, z, e) => e ? p.set(x, y, z, y === 21 && (x === c || z === c) ? 'purple_stained_glass_pane' : pick(MAGE_STONE, x, y, z, 7)) : p.air(x, y, z));
  // Crooked spire: rings of purple concrete stairs shifting east as they rise.
  for (let i = 0; i < 8; i++) {
    const r = 4.2 - i * 0.5, ox = Math.floor(i / 3);
    for (let x = 0; x <= 14; x++) for (let z = 0; z <= 14; z++) {
      const d = Math.hypot(x - c - ox, z - c); if (d > r + 0.35) continue;
      if (d > r - 0.95) { const dx = c + ox - x, dz = c - z; p.set(x, 24 + i, z, 'deepslate_tile_stairs', stairs(Math.abs(dx) >= Math.abs(dz) ? (dx > 0 ? 'east' : 'west') : (dz > 0 ? 'south' : 'north'))); }
      else p.set(x, 24 + i, z, (x + z + i) % 3 ? 'purple_concrete' : 'purple_terracotta');
    }
  }
  p.set(c + 2, 32, c, 'amethyst_block'); p.set(c + 2, 33, c, 'end_rod', facing('up'));
  // Windows with lintels and a door.
  for (const [x, y, z, f] of [[c - 4, 5, c, 'east'], [c, 10, c + 4, 'north'], [c - 4, 15, c, 'east'], [c, 16, c - 4, 'south']] as const) {
    p.set(x, y, z, 'purple_stained_glass_pane'); p.set(x, y + 1, z, 'purple_stained_glass_pane'); p.set(x, y + 2, z, 'deepslate_brick_stairs', stairs(f, 'top'));
  }
  p.air(c, 1, c - 4); p.air(c, 2, c - 4); p.air(c, 1, c - 5); p.air(c, 2, c - 5); door(p, c, 1, c - 4, 'dark_oak', 'south'); p.set(c, 3, c - 5, 'deepslate_brick_stairs', stairs('south', 'top')); p.set(c, 3, c - 4, 'deepslate_brick_stairs', stairs('south', 'top'));
  p.set(c, 0, c - 6, 'deepslate_brick_stairs', stairs('south'));
  // Enchanting room: 15 bookshelves one block from the table.
  for (let x = c - 2; x <= c + 2; x++) for (let z = c - 2; z <= c + 2; z++) if ((x === c - 2 || x === c + 2 || z === c - 2 || z === c + 2) && !(x === c && z === c - 2)) p.set(x, 1, z, 'bookshelf');
  p.set(c, 1, c, 'enchanting_table');
  ladderUp(p, c + 3, c, 1, 19, 'west');
  p.set(c - 2, 8, c - 1, 'brewing_stand', { has_bottle_0: F, has_bottle_1: F, has_bottle_2: F }); p.set(c - 1, 8, c + 2, 'cauldron'); p.set(c, 14, c + 2, 'lectern', lectern('north'));
  for (const y of [6, 12, 18]) hangLantern(p, null, c, y, c);
  return p.payload();
}

function friedhof() {
  const p = new Plot([13, 5, 11]);
  for (let x = 0; x < 13; x++) for (let z = 0; z < 11; z++) p.set(x, 0, z, 'grass_block', grass());
  for (let x = 0; x < 13; x++) for (const z of [0, 10]) p.set(x, 1, z, 'cobblestone_wall');
  for (let z = 1; z < 10; z++) for (const x of [0, 12]) p.set(x, 1, z, 'cobblestone_wall');
  p.air(6, 1, 0); p.set(6, 1, 0, 'spruce_fence_gate', { facing: 'south', in_wall: 'true', open: 'false', powered: 'false' });
  for (const x of [2, 5, 8, 11]) for (const z of [3, 7]) { if (x === 11) continue; p.set(x, 1, z, 'mossy_stone_brick_wall'); p.set(x, 0, z + 1, 'coarse_dirt'); }
  roundTree(p, 10, 1, 5, 'dark_oak', 4, 2);
  p.set(1, 1, 1, 'lantern', lantern()); p.set(11, 1, 9, 'lantern', lantern());
  return p.payload();
}

export const SAKRAL_SPECS: readonly BuildingSpec[] = [
  { id: 'bld_kathedrale', name: 'Kathedrale', payload: kathedrale, tags: ['kirche', 'türme', 'buntglas'],
    description: 'Gotische Kathedrale mit hohem Mittelschiff, Seitenschiffen, Doppelturmfassade, Rosette und Buntglasfenstern.',
    facets: { kategorie: ['sakral'], stil: ['mittelalterlich', 'klassisch'], biom: ['ueberall'], funktion: ['versammlung', 'orientierung'] } },
  { id: 'bld_antiker_tempel', name: 'Antiker Tempel', payload: antikerTempel, tags: ['säulen', 'quarz', 'stufen'],
    description: 'Säulentempel aus Quarz auf drei Stufen, mit Cella, goldenem Altar und flachem Giebeldach.',
    facets: { kategorie: ['sakral'], stil: ['antik', 'klassisch'], biom: ['ueberall'], funktion: ['versammlung', 'deko'] } },
  { id: 'bld_schrein', name: 'Schrein', payload: schrein, tags: ['schrein', 'kerzen', 'klein'],
    description: 'Kleiner Schrein mit Walmdach, Kerzenaltar, Blumentöpfen und Stufenzugang.',
    facets: { kategorie: ['sakral'], stil: ['fernoestlich'], biom: ['kirschhain', 'ueberall'], funktion: ['deko'] } },
  { id: 'bld_torii', name: 'Torii', payload: torii, tags: ['tor', 'japan', 'rot'],
    description: 'Rotes Torii-Tor aus Karmesinstämmen und Beton mit geschwungenem schwarzem Querbalken.',
    facets: { kategorie: ['dekoration'], stil: ['fernoestlich'], biom: ['kirschhain', 'ueberall'], funktion: ['deko', 'verbindung'] } },
  { id: 'bld_wuestenpyramide', name: 'Wüstenpyramide', payload: wuestenpyramide, tags: ['pyramide', 'sandstein', 'schatz'],
    description: 'Begehbare Sandsteinpyramide mit Eingang, Muster aus Terrakotta und Schatzkammer – eigene Interpretation des Wüstentempels.',
    facets: { kategorie: ['wahrzeichen'], stil: ['wuestenstil', 'antik'], biom: ['wueste', 'badlands'], funktion: ['deko', 'lagern'] }, inspiration: [WIKI('Desert_pyramid', 'Wüstentempel')] },
  { id: 'bld_steinkreis', name: 'Steinkreis', payload: steinkreis, tags: ['menhire', 'kreis', 'ritual'],
    description: 'Zehn bemooste Menhire im Kreis um einen Altarstein mit Kerzen.',
    facets: { kategorie: ['wahrzeichen'], stil: ['antik', 'fantasy'], biom: ['ebene', 'gebirge'], funktion: ['deko', 'orientierung'] } },
  { id: 'bld_zaubererturm', name: 'Zaubererturm', payload: zaubererturm, tags: ['zauberei', 'bücherregale', 'spitzdach'],
    description: 'Runder Tiefenschiefer-Turm: unten ein Verzauberungsraum mit 15 Bücherregalen (Stufe 30), darüber Braukammer und Studierstube, lila Spitzdach mit Endstab.',
    facets: { kategorie: ['magie'], stil: ['fantasy'], biom: ['ueberall'], funktion: ['verzaubern', 'aussicht'] },
    tips: ['15 Bücherregale im Abstand von genau einem Block zum Zaubertisch geben Stufe 30.', 'Zwischen Tisch und Regal darf nur Luft sein – keine Fackeln oder Teppiche.'],
    inspiration: [WIKI('Enchanting_mechanics', 'Verzauberungsmechanik')] },
  { id: 'bld_friedhof', name: 'Friedhof', payload: friedhof, tags: ['gräber', 'grusel', 'mauer'],
    description: 'Kleiner ummauerter Friedhof mit Grabsteinen, Grabhügeln, Schwarzeiche und Laternen.',
    facets: { kategorie: ['sakral'], stil: ['mittelalterlich', 'fantasy'], biom: ['ueberall'], funktion: ['deko'] } },
];
