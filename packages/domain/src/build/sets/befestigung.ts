import { Plot, axis, banner, barrel, bed, chest, crenels, door, facing, furnace, gate, hipRoof, ladder, lantern, slab, stairs, trapdoor, F } from '../plot.js';
import { WIKI, joint } from '../spec.js';
import type { BuildingSpec } from '../spec.js';
import { beltCourse, hangLantern, LOOKS, lookWith, pick, pitchedRoof, put, putFree, skirt } from '../style.js';
import type { Look, Mix, Rect } from '../style.js';

/** Befestigung: palisade kit, keep, towers, gatehouse matching the sample walls, desert fort, outpost, bunker. */

/** Palisade: sharpened log wall with a walkway behind; 4 long, chainable. */
function palisadeGerade() {
  const p = new Plot([4, 6, 3]);
  for (let x = 0; x < 4; x++) {
    p.set(x, 0, 1, 'cobblestone'); p.fill(x, 1, 1, x, 4, 1, 'spruce_log', axis('y')); p.set(x, 5, 1, 'spruce_fence');
    p.set(x, 3, 2, 'spruce_slab', slab('top'));
  }
  return p.payload();
}
function palisadeTurm() {
  const p = new Plot([5, 10, 5]);
  p.fill(0, 0, 0, 4, 0, 4, 'cobblestone');
  for (let y = 1; y <= 6; y++) p.ring(0, 0, 4, 4, y, 'spruce_log', axis('y'));
  p.fill(1, 1, 1, 3, 6, 3, null);
  p.fill(0, 7, 0, 4, 7, 4, 'spruce_planks'); p.ring(0, 0, 4, 4, 8, 'spruce_fence');
  hipRoof(p, 0, 4, 0, 4, 9, 'spruce_stairs', 'spruce_slab');
  p.fill(2, 1, 3, 2, 7, 3, 'ladder', ladder('north'));
  p.fill(2, 1, 0, 2, 2, 0, null); door(p, 2, 1, 0, 'spruce', 'south');
  p.set(2, 8, 2, 'lantern', lantern());
  return p.payload();
}
function palisadeTor() {
  const p = new Plot([6, 8, 3]);
  for (const x of [0, 5]) { p.set(x, 0, 1, 'cobblestone'); p.fill(x, 1, 1, x, 6, 1, 'spruce_log', axis('y')); p.set(x, 7, 1, 'spruce_fence'); }
  p.fill(1, 0, 1, 4, 0, 1, 'cobblestone');
  p.fill(1, 4, 1, 4, 4, 1, 'stripped_spruce_log', axis('x')); p.fill(1, 5, 1, 4, 5, 1, 'spruce_log', axis('y'));
  for (let x = 1; x <= 4; x++) { p.set(x, 1, 1, 'spruce_fence_gate', gate('south')); p.set(x, 6, 1, 'spruce_fence'); }
  for (const x of [0, 5]) p.set(x, 3, 0, 'wall_torch', facing('north'));
  return p.payload();
}

const KEEP_STONE: Mix = [['stone_bricks', 9], ['mossy_stone_bricks', 2], ['cracked_stone_bricks', 2], ['andesite', 1], ['cobblestone', 1]];
const KEEP_BASE: Mix = [['cobblestone', 6], ['mossy_cobblestone', 3], ['stone_bricks', 2], ['andesite', 1]];
const KEEP_LOOK: Look = lookWith(LOOKS.stein, { wall: KEEP_STONE, base: KEEP_BASE, baseStairs: 'stone_brick_stairs', baseSlab: 'stone_brick_slab', baseWall: 'stone_brick_wall',
  roof: [['deepslate_tiles', 5], ['cracked_deepslate_tiles', 1]], roofStairs: 'deepslate_tile_stairs', roofSlab: 'deepslate_tile_slab', trim: 'dark_oak' });

/** Battlement in the studied manner: corbels (upside-down stairs) one block out, a parapet ring on them, merlons on every second cell. */
function battlement(p: Plot, r: Rect, y: number, stone: Mix, seed: number): void {
  for (let x = r.x0 - 1; x <= r.x1 + 1; x++) for (let z = r.z0 - 1; z <= r.z1 + 1; z++) {
    const outer = x === r.x0 - 1 || x === r.x1 + 1 || z === r.z0 - 1 || z === r.z1 + 1;
    if (!outer) continue;
    const s: 'north' | 'south' | 'west' | 'east' = z < r.z0 ? 'north' : z > r.z1 ? 'south' : x < r.x0 ? 'west' : 'east';
    const corner = (x === r.x0 - 1 || x === r.x1 + 1) && (z === r.z0 - 1 || z === r.z1 + 1);
    if (!corner) putFree(p, x, y - 1, z, 'stone_brick_stairs', stairs(s === 'north' ? 'south' : s === 'south' ? 'north' : s === 'west' ? 'east' : 'west', 'top'));
    put(p, x, y, z, pick(stone, x, y, z, seed));
    if ((x + z) % 2 === 0 || corner) put(p, x, y + 1, z, pick(stone, x, y + 1, z, seed)); else putFree(p, x, y + 1, z, 'stone_brick_slab', slab());
  }
  for (let x = r.x0; x <= r.x1; x++) for (let z = r.z0; z <= r.z1; z++) put(p, x, y, z, 'stone_bricks');
}

/** Keep: battered plinth, mixed masonry with corner quoins, arrow slits, three floors, corbelled battlement and a slate-roofed watch room. */
function bergfried() {
  const p = new Plot([13, 2, 13]), l = KEEP_LOOK, r: Rect = { x0: 2, z0: 2, x1: 10, z1: 10 };
  for (let x = 1; x <= 11; x++) for (let z = 1; z <= 11; z++) put(p, x, 0, z, pick(KEEP_BASE, x, 0, z, 7));
  skirt(p, l, r, 1);
  for (let y = 1; y <= 17; y++) for (let x = 2; x <= 10; x++) for (let z = 2; z <= 10; z++) {
    const edge = x === 2 || x === 10 || z === 2 || z === 10, corner = (x === 2 || x === 10) && (z === 2 || z === 10);
    if (!edge) { p.air(x, y, z); continue; }
    put(p, x, y, z, corner ? (y % 2 ? 'polished_andesite' : 'stone_bricks') : y <= 3 ? pick(KEEP_BASE, x, y, z, 7) : pick(KEEP_STONE, x, y, z, 7));
  }
  for (const y of [6, 12]) for (let x = 3; x <= 9; x++) for (let z = 3; z <= 9; z++) p.set(x, y, z, 'spruce_planks');
  for (const y of [6, 12]) beltCourse(p, l, r, y);
  // Arrow slits: one-wide, two-high, with a stair lintel.
  for (const y of [3, 8, 14]) for (const [x, z, f] of [[6, 2, 'south'], [2, 6, 'east'], [10, 6, 'west'], [6, 10, 'north']] as const) {
    if (y === 3 && z === 2) continue;
    p.set(x, y, z, 'iron_bars'); p.set(x, y + 1, z, 'iron_bars'); p.set(x, y + 2, z, 'stone_brick_stairs', stairs(f, 'top'));
  }
  // Portal with a pointed arch and a stair.
  p.air(6, 1, 2); p.air(6, 2, 2); door(p, 6, 1, 2, 'dark_oak', 'south');
  p.set(6, 3, 2, 'stone_brick_stairs', stairs('south', 'top')); p.set(5, 3, 2, 'stone_brick_stairs', stairs('east', 'top')); p.set(7, 3, 2, 'stone_brick_stairs', stairs('west', 'top'));
  p.set(5, 0, 1, 'stone_brick_stairs', stairs('south')); p.set(6, 0, 1, 'stone_brick_stairs', stairs('south')); p.set(7, 0, 1, 'stone_brick_stairs', stairs('south'));
  p.set(6, 3, 1, 'lantern', lantern(true)); p.set(6, 4, 1, 'stone_brick_wall');
  battlement(p, r, 18, KEEP_STONE, 7);
  // Watch room on the platform with a steep hipped roof.
  for (let y = 19; y <= 21; y++) for (let x = 4; x <= 8; x++) for (let z = 4; z <= 8; z++) {
    const edge = x === 4 || x === 8 || z === 4 || z === 8;
    if (edge) put(p, x, y, z, (x === 4 || x === 8) && (z === 4 || z === 8) ? 'stripped_spruce_log' : y === 20 && (x === 6 || z === 6) ? 'glass_pane' : pick(KEEP_STONE, x, y, z, 8)); else p.air(x, y, z);
  }
  p.air(6, 19, 4); p.air(6, 20, 4); door(p, 6, 19, 4, 'spruce', 'north');
  pitchedRoof(p, l, { walls: { x0: 4, z0: 4, x1: 8, z1: 8 }, y: 22, kind: 'walm', ridge: 'x', overhang: 1, pitch: 'steil', seed: 8 });
  let top = 22; while (p.has(6, top + 1, 6)) top++;
  p.set(6, top + 1, 6, 'spruce_fence'); p.set(6, top + 2, 6, 'red_banner', banner(0));
  for (let y = 1; y <= 18; y++) p.set(9, y, 9, 'ladder', ladder('west'));
  p.air(9, 18, 9); p.air(9, 12, 9); p.air(9, 6, 9);
  for (const y of [6, 12, 18]) p.set(9, y, 9, 'ladder', ladder('west'));
  bed(p, 4, 7, 8, 'red', 'south'); p.set(7, 7, 9, 'chest', chest('north')); p.set(3, 1, 9, 'furnace', furnace('east')); p.set(4, 1, 9, 'crafting_table');
  p.set(3, 13, 3, 'barrel', barrel('up')); p.set(4, 13, 3, 'barrel', barrel('up')); p.set(3, 13, 4, 'fletching_table');
  for (const y of [5, 11, 17]) hangLantern(p, l, 6, y, 6);
  return p.payload();
}

/** Round tower: battered cobble foot, mixed masonry, slit windows, corbelled gallery and a conical roof with a finial. */
function rundturm() {
  const p = new Plot([13, 2, 13]), c = 6;
  const ring = (_y: number, r: number, f: (x: number, z: number, edge: boolean, d: number) => void) => {
    for (let x = 0; x <= 12; x++) for (let z = 0; z <= 12; z++) { const d = Math.hypot(x - c, z - c); if (d <= r + 0.35) f(x, z, d > r - 0.95, d); }
  };
  ring(0, 5, (x, z) => p.set(x, 0, z, pick(KEEP_BASE, x, 0, z, 3)));
  for (let y = 1; y <= 15; y++) ring(y, y <= 2 ? 4.6 : 4, (x, z, e) => e ? p.set(x, y, z, pick(y <= 3 ? KEEP_BASE : KEEP_STONE, x, y, z, 3)) : p.air(x, y, z));
  for (const y of [6, 11]) ring(y, 3.2, (x, z) => p.set(x, y, z, 'spruce_planks'));
  // Corbels and gallery.
  ring(15, 5, (x, z, e, d) => { if (d > 4.3 && d <= 5.35) { const dx = c - x, dz = c - z; putFree(p, x, 15, z, 'stone_brick_stairs', stairs(Math.abs(dx) >= Math.abs(dz) ? (dx > 0 ? 'east' : 'west') : (dz > 0 ? 'south' : 'north'), 'top')); } void e; });
  ring(16, 5, (x, z, e) => p.set(x, 16, z, e ? pick(KEEP_STONE, x, 16, z, 3) : 'stone_bricks'));
  ring(17, 5, (x, z, e) => { if (e) { if ((x + z) % 2 === 0) p.set(x, 17, z, pick(KEEP_STONE, x, 17, z, 3)); else p.set(x, 17, z, 'stone_brick_slab', slab()); } });
  // Cone.
  for (let i = 0; i < 7; i++) ring(18 + i, 4.2 - i * 0.62, (x, z, e) => {
    if (e) { const dx = c - x, dz = c - z; p.set(x, 18 + i, z, 'dark_oak_stairs', stairs(Math.abs(dx) >= Math.abs(dz) ? (dx > 0 ? 'east' : 'west') : (dz > 0 ? 'south' : 'north'))); }
    else p.set(x, 18 + i, z, 'dark_oak_planks');
  });
  for (let y = 17; y <= 22; y++) p.set(c, y, c, 'stripped_spruce_log', axis('y'));
  p.set(c, 25, c, 'dark_oak_fence'); p.set(c, 26, c, 'lightning_rod', { facing: 'up', powered: F, waterlogged: F });
  for (const [x, y, z, f] of [[2, 4, 6, 'east'], [10, 4, 6, 'west'], [10, 8, 6, 'west'], [2, 9, 6, 'east'], [10, 13, 6, 'west'], [6, 13, 2, 'south']] as const) { p.set(x, y, z, 'iron_bars'); p.set(x, y + 1, z, 'iron_bars'); p.set(x, y + 2, z, 'stone_brick_stairs', stairs(f, 'top')); }
  p.air(c, 1, 2); p.air(c, 2, 2); p.air(c, 1, 1); p.air(c, 2, 1); door(p, c, 1, 2, 'spruce', 'south'); p.set(c, 3, 2, 'stone_brick_stairs', stairs('south', 'top')); p.set(c, 3, 1, 'stone_brick_stairs', stairs('south', 'top'));
  p.set(c, 0, 0, 'stone_brick_stairs', stairs('south'));
  for (let y = 1; y <= 16; y++) p.set(c, y, 9, 'ladder', ladder('north'));
  for (const y of [5, 10, 15]) hangLantern(p, null, c, y, c);
  return p.payload();
}

const SAND_STONE: Mix = [['sandstone', 5], ['smooth_sandstone', 3], ['cut_sandstone', 1]];
/** Gatehouse between two wall segments (wall_2x5 like the sample walls). */
function torhaus() {
  const p = new Plot([13, 13, 7]);
  p.fill(0, 0, 0, 12, 0, 6, 'stone_bricks');
  for (const x0 of [0, 8]) { p.room(x0, 0, x0 + 4, 6, 1, 9, 'stone_bricks'); p.fill(x0 + 1, 5, 1, x0 + 3, 5, 5, 'spruce_planks'); crenels(p, x0, 0, x0 + 4, 6, 10, 'stone_bricks'); p.fill(x0, 9, 0, x0 + 4, 9, 6, 'stone_bricks'); }
  p.fill(5, 6, 0, 7, 9, 6, 'stone_bricks'); p.fill(5, 8, 1, 7, 8, 5, null); p.fill(5, 9, 1, 7, 9, 5, 'spruce_planks');
  for (let z = 0; z <= 6; z++) { p.set(5, 6, z, 'stone_brick_stairs', stairs('west', 'top')); p.set(7, 6, z, 'stone_brick_stairs', stairs('east', 'top')); }
  p.fill(5, 1, 0, 7, 5, 6, null);
  for (let x = 5; x <= 7; x++) p.set(x, 5, 1, 'iron_bars');
  for (const x of [4, 8]) { p.fill(x, 1, 3, x, 2, 3, null); door(p, x, 1, 3, 'spruce', x === 4 ? 'east' : 'west'); }
  for (const x0 of [0, 8]) p.fill(x0 + 3, 1, 5, x0 + 3, 9, 5, 'ladder', ladder('north'));
  p.fill(0, 0, 1, 0, 4, 2, 'stone_bricks'); p.fill(12, 0, 1, 12, 4, 2, 'stone_bricks');
  // Fackeln und Banner hängen in der Tordurchfahrt an den Seitenwänden.
  p.set(5, 4, 1, 'wall_torch', facing('east')); p.set(7, 4, 1, 'wall_torch', facing('west'));
  p.set(5, 3, 5, 'red_wall_banner', facing('east')); p.set(7, 3, 5, 'red_wall_banner', facing('west'));
  p.set(2, 4, 3, 'lantern', lantern(true)); p.set(10, 4, 3, 'lantern', lantern(true));
  return p.payload();
}

/** Desert fort: battered walls with corbelled walkways, four corner towers with awnings, a gate with a portcullis and a barracks. */
function wuestenfort() {
  const p = new Plot([17, 2, 17]), s = SAND_STONE;
  for (let x = 0; x <= 16; x++) for (let z = 0; z <= 16; z++) p.set(x, 0, z, (x + 2 * z) % 7 === 0 ? 'smooth_sandstone' : 'sandstone');
  const wall = (x: number, z: number) => x === 1 || x === 15 || z === 1 || z === 15;
  for (let y = 1; y <= 5; y++) for (let x = 1; x <= 15; x++) for (let z = 1; z <= 15; z++) if (wall(x, z)) put(p, x, y, z, pick(s, x, y, z, 2));
  for (let x = 0; x <= 16; x++) for (let z = 0; z <= 16; z++) if (x === 0 || x === 16 || z === 0 || z === 16) { const f = z === 0 ? 'south' : z === 16 ? 'north' : x === 0 ? 'east' : 'west'; if (!((x === 0 || x === 16) && (z === 0 || z === 16))) p.set(x, 1, z, 'sandstone_stairs', stairs(f)); }
  // Walkway on corbels inside.
  for (let x = 2; x <= 14; x++) for (let z = 2; z <= 14; z++) if (x === 2 || x === 14 || z === 2 || z === 14) { p.set(x, 5, z, 'smooth_sandstone_slab', slab('top')); if ((x + z) % 2 === 0) putFree(p, x, 4, z, 'sandstone_stairs', stairs(x === 2 ? 'west' : x === 14 ? 'east' : z === 2 ? 'north' : 'south', 'top')); }
  for (let x = 1; x <= 15; x++) for (let z = 1; z <= 15; z++) if (wall(x, z)) { if ((x + z) % 2 === 0) put(p, x, 6, z, 'cut_sandstone'); else put(p, x, 6, z, 'sandstone_slab', slab()); }
  for (const [x0, z0] of [[0, 0], [12, 0], [0, 12], [12, 12]] as const) {
    for (let y = 1; y <= 8; y++) for (let x = x0; x <= x0 + 4; x++) for (let z = z0; z <= z0 + 4; z++) {
      const e = x === x0 || x === x0 + 4 || z === z0 || z === z0 + 4;
      if (e) put(p, x, y, z, (x === x0 || x === x0 + 4) && (z === z0 || z === z0 + 4) ? 'cut_sandstone' : pick(s, x, y, z, 3)); else p.air(x, y, z);
    }
    for (let x = x0 + 1; x <= x0 + 3; x++) for (let z = z0 + 1; z <= z0 + 3; z++) p.set(x, 5, z, 'smooth_sandstone');
    for (let x = x0; x <= x0 + 4; x++) for (let z = z0; z <= z0 + 4; z++) { const e = x === x0 || x === x0 + 4 || z === z0 || z === z0 + 4; p.set(x, 9, z, e ? ((x + z) % 2 ? 'sandstone_wall' : 'cut_sandstone') : 'smooth_sandstone'); }
    for (const [x, z] of [[x0 + 1, z0 + 1], [x0 + 3, z0 + 1], [x0 + 1, z0 + 3], [x0 + 3, z0 + 3]] as const) p.set(x, 10, z, 'acacia_fence');
    for (let x = x0 + 1; x <= x0 + 3; x++) for (let z = z0 + 1; z <= z0 + 3; z++) p.set(x, 11, z, (x + z) % 2 ? 'orange_wool' : 'white_wool');
    p.set(x0 + 2, 7, z0, 'iron_bars'); p.set(x0, 7, z0 + 2, 'iron_bars'); p.set(x0 + 4, 7, z0 + 2, 'iron_bars'); p.set(x0 + 2, 7, z0 + 4, 'iron_bars');
  }
  for (let x = 7; x <= 9; x++) for (let y = 1; y <= 3; y++) { p.air(x, y, 1); }
  for (let x = 7; x <= 9; x++) p.set(x, 3, 1, 'iron_bars');
  p.set(6, 4, 0, 'sandstone_stairs', stairs('east', 'top')); p.set(10, 4, 0, 'sandstone_stairs', stairs('west', 'top'));
  for (let x = 7; x <= 9; x++) p.set(x, 4, 1, 'chiseled_sandstone');
  for (const x of [6, 10]) { p.set(x, 5, 0, 'cut_sandstone'); p.set(x, 6, 0, 'lantern', lantern()); }
  // Barracks with a flat roof and an awning.
  for (let y = 1; y <= 3; y++) for (let x = 4; x <= 12; x++) for (let z = 10; z <= 14; z++) { const e = x === 4 || x === 12 || z === 10 || z === 14; if (e) put(p, x, y, z, pick(s, x, y, z, 4)); else p.air(x, y, z); }
  for (let x = 3; x <= 13; x++) for (let z = 9; z <= 14; z++) p.set(x, 4, z, z === 9 || x === 3 || x === 13 ? 'smooth_sandstone_slab' : 'smooth_sandstone', z === 9 || x === 3 || x === 13 ? slab('bottom') : {});
  p.air(8, 1, 10); p.air(8, 2, 10); door(p, 8, 1, 10, 'acacia', 'north');
  for (const x of [6, 10]) p.set(x, 2, 10, 'acacia_trapdoor', trapdoor('north', 'bottom', true));
  bed(p, 5, 1, 13, 'orange', 'west'); bed(p, 11, 1, 13, 'orange', 'east'); p.set(8, 1, 13, 'chest', chest('north'));
  p.set(8, 1, 7, 'cut_sandstone'); p.set(8, 2, 7, 'barrel', barrel('up'));
  for (const [x, z] of [[4, 4], [12, 4]] as const) p.set(x, 1, z, 'lantern', lantern());
  return p.payload();
}

function aussenposten() {
  const p = new Plot([9, 21, 9]);
  p.fill(0, 0, 0, 8, 0, 8, 'cobblestone');
  for (const [x, z] of [[1, 1], [7, 1], [1, 7], [7, 7]] as const) p.fill(x, 1, z, x, 15, z, 'dark_oak_log', axis('y'));
  for (const y of [5, 10, 15]) { p.fill(0, y, 0, 8, y, 8, 'dark_oak_planks'); p.ring(0, 0, 8, 8, y + 1, 'dark_oak_fence'); }
  p.room(2, 2, 6, 6, 1, 4, 'cobblestone'); p.fill(4, 1, 2, 4, 2, 2, null); door(p, 4, 1, 2, 'dark_oak', 'south');
  p.fill(5, 5, 6, 5, 16, 6, 'dark_oak_log', axis('y'));
  for (let y = 1; y <= 16; y++) p.set(5, y, 5, 'ladder', ladder('north'));
  hipRoof(p, 0, 8, 0, 8, 17, 'dark_oak_stairs', 'dark_oak_slab');
  for (const y of [6, 11]) p.set(2, y, 2, 'lantern', lantern());
  p.set(3, 16, 3, 'chest', { facing: 'south', type: 'single', waterlogged: F });
  return p.payload();
}

function bunker() {
  const p = new Plot([11, 6, 11]);
  p.fill(0, 0, 0, 10, 0, 10, 'deepslate_bricks');
  p.room(0, 0, 10, 10, 1, 3, 'polished_deepslate'); p.fill(0, 4, 0, 10, 4, 10, 'deepslate_tiles');
  for (let x = 2; x <= 8; x += 2) { p.set(x, 2, 0, 'iron_bars'); p.set(x, 2, 10, 'iron_bars'); p.set(0, 2, x, 'iron_bars'); p.set(10, 2, x, 'iron_bars'); }
  p.fill(5, 1, 0, 5, 2, 0, null); door(p, 5, 1, 0, 'iron', 'south');
  for (const x of [2, 4, 6, 8]) { bed(p, x, 1, 8, 'gray', 'north'); }
  p.fill(1, 1, 1, 1, 1, 6, 'chest', { facing: 'east', type: 'single', waterlogged: F });
  p.set(9, 1, 1, 'furnace', furnace('west')); p.set(9, 1, 2, 'blast_furnace', furnace('west')); p.set(9, 1, 3, 'smithing_table'); p.set(9, 1, 4, 'anvil', facing('west'));
  p.set(5, 3, 5, 'sea_lantern');
  p.fill(0, 5, 0, 10, 5, 10, 'deepslate_tile_slab', slab());
  p.set(5, 4, 9, 'iron_trapdoor', trapdoor('north')); p.fill(5, 1, 9, 5, 3, 9, 'ladder', ladder('north'));
  return p.payload();
}

export const BEFESTIGUNG_SPECS: readonly BuildingSpec[] = [
  { id: 'bld_palisade_gerade', name: 'Palisade: Wand', payload: palisadeGerade, tags: ['palisade', 'holz', 'kettenbar'],
    description: 'Vier Blöcke Palisade aus Fichtenstämmen mit Zaunspitzen und Wehrgang aus Stufen.',
    facets: { kategorie: ['befestigung'], stil: ['rustikal', 'nordisch'], biom: ['ueberall'], funktion: ['verteidigung'] },
    family: { id: 'palisade', label: 'Palisaden-Baukasten', variant: 'Wand' },
    connectors: [joint('west', [0, 0, 1], [-1, 0, 0], 'palisade_joint', 'palisade_1x4'), joint('east', [4, 0, 1], [1, 0, 0], 'palisade_joint', 'palisade_1x4')] },
  { id: 'bld_palisade_turm', name: 'Palisade: Turm', payload: palisadeTurm, tags: ['palisade', 'turm', 'ausguck'],
    description: 'Hölzerner Eckturm mit Plattform, Brüstung, Leiter und Walmdach.',
    facets: { kategorie: ['befestigung'], stil: ['rustikal', 'nordisch'], biom: ['ueberall'], funktion: ['verteidigung', 'aussicht'] },
    family: { id: 'palisade', label: 'Palisaden-Baukasten', variant: 'Turm' },
    connectors: [joint('west', [0, 0, 2], [-1, 0, 0], 'palisade_joint', 'palisade_1x4'), joint('east', [5, 0, 2], [1, 0, 0], 'palisade_joint', 'palisade_1x4')] },
  { id: 'bld_palisade_tor', name: 'Palisade: Tor', payload: palisadeTor, tags: ['palisade', 'tor', 'eingang'],
    description: 'Palisadentor mit vier Zauntoren, Querbalken und Fackeln.',
    facets: { kategorie: ['befestigung'], stil: ['rustikal', 'nordisch'], biom: ['ueberall'], funktion: ['verteidigung', 'verbindung'] },
    family: { id: 'palisade', label: 'Palisaden-Baukasten', variant: 'Tor' },
    connectors: [joint('west', [0, 0, 1], [-1, 0, 0], 'palisade_joint', 'palisade_1x4'), joint('east', [6, 0, 1], [1, 0, 0], 'palisade_joint', 'palisade_1x4')] },
  { id: 'bld_bergfried', name: 'Bergfried', payload: bergfried, tags: ['burg', 'turm', 'zinnen'],
    description: 'Viergeschossiger Wohnturm aus Steinziegeln mit Schießscharten, Innenleiter, Wohn- und Lagerebene und Zinnen.',
    facets: { kategorie: ['befestigung'], stil: ['mittelalterlich'], biom: ['ueberall', 'gebirge'], funktion: ['verteidigung', 'wohnen', 'aussicht'] } },
  { id: 'bld_rundturm', name: 'Rundturm', payload: rundturm, tags: ['burg', 'rund', 'kegeldach'],
    description: 'Runder Steinturm mit drei Ebenen, Schießscharten und Kegeldach aus Schwarzeiche.',
    facets: { kategorie: ['befestigung'], stil: ['mittelalterlich', 'fantasy'], biom: ['ueberall'], funktion: ['verteidigung', 'aussicht'] } },
  { id: 'bld_torhaus', name: 'Torhaus', payload: torhaus, tags: ['burg', 'tor', 'fallgitter'],
    description: 'Torhaus mit zwei Flankentürmen, Torbogen, Fallgitter aus Eisenstäben und Wehrgang; passt zwischen die Beispiel-Mauerstücke.',
    facets: { kategorie: ['befestigung'], stil: ['mittelalterlich'], biom: ['ueberall'], funktion: ['verteidigung', 'verbindung'] },
    connectors: [joint('west', [0, 0, 1], [-1, 0, 0], 'wall_joint', 'wall_2x5'), joint('east', [13, 0, 1], [1, 0, 0], 'wall_joint', 'wall_2x5')],
    tips: ['Die Anschlüsse passen zur Beispiel-Mauer: Torhaus und Mauerstücke rasten im Editor ein.'] },
  { id: 'bld_wuestenfort', name: 'Wüstenfort', payload: wuestenfort, tags: ['fort', 'sandstein', 'innenhof'],
    description: 'Quadratisches Sandsteinfort mit vier Ecktürmen, Wehrgang, Torbogen und Unterkunft im Innenhof.',
    facets: { kategorie: ['befestigung'], stil: ['wuestenstil'], biom: ['wueste', 'badlands'], funktion: ['verteidigung', 'wohnen'] } },
  { id: 'bld_aussenposten', name: 'Außenposten', payload: aussenposten, tags: ['turm', 'schwarzeiche', 'stockwerke'],
    description: 'Hoher Wachturm aus Schwarzeiche mit drei Plattformen, Steinkern unten und Walmdach – eigene Interpretation des Plünderer-Außenpostens.',
    facets: { kategorie: ['befestigung'], stil: ['rustikal'], biom: ['ueberall'], funktion: ['verteidigung', 'aussicht'] }, inspiration: [WIKI('Pillager_Outpost', 'Plünderer-Außenposten')] },
  { id: 'bld_bunker', name: 'Bunker', payload: bunker, tags: ['bunker', 'tiefenschiefer', 'versteck'],
    description: 'Flacher Tiefenschiefer-Bunker mit Eisentür, Schlafsaal, Lagerreihe, Schmiedeecke und Dachluke.',
    facets: { kategorie: ['basis'], stil: ['modern', 'industriell'], biom: ['ueberall', 'hoehle'], funktion: ['verteidigung', 'wohnen', 'lagern'] } },
];
