import { Plot, axis, barrel, bed, chest, door, furnace, grass, lampPost, lantern, lectern, roundTree, slab, stairs, water, OPPOSITE, F } from '../plot.js';
import type { H } from '../plot.js';
import { bell, chair, cupboard, longTable, rug, table, wallBanner } from '../furnish.js';
import { WIKI } from '../spec.js';
import type { BuildingSpec } from '../spec.js';
import { STEP, beltCourse, column, dome, hangLantern, house, LOOKS, lookWith, pick, pitchedRoof, put, putFree, skirt } from '../style.js';
import type { Look, Mix, Rect } from '../style.js';
import { stableAtan2, stableHypot } from '../../../../voxel/src/stableMath.js';

/**
 * Großbauten (GROSS-01-S05): the catalogue's largest single buildings, made as
 * landmarks for Großprojekte – city hall with tower, palace around a
 * courtyard, domed basilica, arena, market square and city gate. Drawn with
 * the style kit (BAUSTIL.md): mixed materials, relief, overhangs; interiors
 * furnished. Own designs, no copied schematics.
 */

const ground = (p: Plot, mix: Mix, seed: number, keep?: (x: number, z: number) => boolean): void => {
  for (let x = 0; x < p.size[0]; x++) for (let z = 0; z < p.size[2]; z++) if (!keep || keep(x, z)) { const id = pick(mix, x, 0, z, seed); put(p, x, 0, z, id, id === 'grass_block' ? grass() : {}); }
};
const PAVE: Mix = [['polished_andesite', 4], ['stone_bricks', 3], ['andesite', 2], ['cobblestone', 1]];
/** Standing light on a pedestal block (never hanging free in tall halls). */
const pedestalLamp = (p: Plot, x: number, y: number, z: number, block: string): void => { put(p, x, y, z, block); put(p, x, y + 1, z, 'lantern', lantern()); };

// ------------------------------------------------------------ Rathaus
const RAT: Look = lookWith(LOOKS.fachwerk, {
  base: [['stone_bricks', 6], ['polished_andesite', 3], ['mossy_stone_bricks', 1]], baseStairs: 'stone_brick_stairs', baseSlab: 'stone_brick_slab', baseWall: 'stone_brick_wall',
  wall: [['calcite', 5], ['white_terracotta', 2], ['diorite', 1]], frame: 'stripped_dark_oak_log', trim: 'dark_oak', shutter: 'dark_oak', door: 'dark_oak', floor: 'dark_oak_planks',
});
const TOWER_STONE: Mix = [['stone_bricks', 6], ['polished_andesite', 2], ['cracked_stone_bricks', 1], ['tuff_bricks', 1]];

/** Three storey city hall in a U around a forecourt, with a clock and bell tower in front of the main wing. */
function rathaus() {
  const p = new Plot([35, 2, 27]), l = RAT;
  ground(p, PAVE, 71);
  const h = house(p, l, { at: { x0: 4, z0: 9, x1: 30, z1: 21 }, storeys: [{ h: 6, kind: 'stein' }, { h: 5, kind: 'fachwerk' }, { h: 5, kind: 'fachwerk' }],
    wings: [{ at: { x0: 4, z0: 2, x1: 11, z1: 21 }, ridge: 'z' }, { at: { x0: 23, z0: 2, x1: 30, z1: 21 }, ridge: 'z' }],
    roof: { kind: 'sattel', ridge: 'x', overhang: 1, pitch: 'steil' }, door: null, postEvery: 3, windowEvery: 3, windowH: 3, flowerBoxes: true,
    chimney: { x: 27, z: 19 }, noWindow: (x, _y, z) => (x >= 15 && x <= 19 && z === 9) || (x === 6 && z === 20), seed: 71 });
  const [f0, f1, f2] = [h.floors[0]! + 1, h.floors[1]! + 1, h.floors[2]! + 1];
  beltCourse(p, l, { x0: 4, z0: 9, x1: 30, z1: 21 }, h.floors[1]!);
  // Tower x 15..19, z 3..9 in front of the main wing; the hall opens into it through an arch.
  const T: Rect = { x0: 15, z0: 3, x1: 19, z1: 9 }, top = Math.max(27, h.roofTop + 7), clock = top - 6, stages: number[] = [];
  for (let y = 7; y <= clock - 3; y += 6) stages.push(y);
  for (let y = 1; y <= top; y++) for (let x = T.x0; x <= T.x1; x++) for (let z = T.z0; z <= T.z1; z++) {
    const edge = x === T.x0 || x === T.x1 || z === T.z0 || z === T.z1;
    if (z === T.z1 && y <= h.ceiling) continue; // shared with the main wing
    if (edge) put(p, x, y, z, (x === T.x0 || x === T.x1) && (z === T.z0 || z === T.z1) ? 'polished_andesite' : pick(TOWER_STONE, x, y, z, 72)); else p.air(x, y, z);
  }
  for (const y of [...stages, clock - 2]) { for (let x = T.x0 + 1; x < T.x1; x++) for (let z = T.z0 + 1; z < T.z1; z++) put(p, x, y, z, 'dark_oak_planks'); beltCourse(p, l, T, y); }
  // Door, arch into the hall, tall windows, clock faces, belfry with bell.
  door(p, 17, 1, T.z0, 'dark_oak', 'north'); put(p, 17, 3, T.z0, 'stone_brick_stairs', stairs('north', 'top'));
  for (const x of [16, 18]) putFree(p, x, 1, T.z0 - 1, 'stone_brick_stairs', stairs('south'));
  putFree(p, 17, 0, T.z0 - 1, 'polished_andesite');
  for (let y = 1; y <= 3; y++) p.air(17, y, T.z1);
  for (const y of stages.flatMap(s => [s + 2, s + 3]).filter(y => y < clock - 2)) { put(p, 17, y, T.z0, 'glass_pane'); for (const x of [T.x0, T.x1]) put(p, x, y, 6, 'glass_pane'); }
  for (const [x, z] of [[17, T.z0], [T.x0, 6], [T.x1, 6]] as const) for (const dy of [clock, clock + 1]) put(p, x, dy, z, dy === clock ? 'white_concrete' : 'quartz_block');
  for (const [x, z, f] of [[17, T.z0 - 1, 'north'], [T.x0 - 1, 6, 'west'], [T.x1 + 1, 6, 'east']] as const) { putFree(p, x, clock + 1, z, 'stone_button', { face: 'wall', facing: f, powered: F }); }
  for (let y = top - 3; y <= top - 1; y++) for (const [x, z] of [[17, T.z0], [17, T.z1], [T.x0, 6], [T.x1, 6]] as const) p.air(x, y, z);
  for (const [x, z] of [[17, T.z0], [17, T.z1], [T.x0, 6], [T.x1, 6]] as const) put(p, x, top - 3, z, 'stone_brick_wall');
  for (let x = T.x0 + 1; x < T.x1; x++) for (let z = T.z0 + 1; z < T.z1; z++) put(p, x, top, z, 'dark_oak_planks');
  put(p, 17, top - 1, 6, 'bell', bell('north', 'ceiling'));
  ladderColumn(p, 16, 4, 1, top - 1);
  const roofTop = pitchedRoof(p, l, { walls: T, y: top + 1, kind: 'walm', ridge: 'z', overhang: 1, pitch: 'steil', seed: 72 });
  put(p, 17, roofTop + 1, 6, 'lightning_rod', { facing: 'up', powered: F, waterlogged: F });
  // Ground floor: citizens' hall with long table, lecterns and banners.
  longTable(p, 9, 15, 25, 15, f0, 'dark_oak_slab');
  for (let x = 9; x <= 25; x += 2) { chair(p, x, f0, 14, 'dark_oak', 'north'); chair(p, x, f0, 16, 'dark_oak', 'south'); }
  p.set(17, f0, 19, 'lectern', lectern('north')); chair(p, 17, f0, 20, 'dark_oak', 'south', true);
  for (const x of [13, 21]) put(p, x, f0 + 3, 20, 'red_wall_banner', wallBanner('north'));
  rug(p, 16, 10, 18, 13, f0, 'red', 'yellow');
  for (const [x, z] of [[11, 12], [23, 12], [11, 18], [23, 18], [17, 17]] as const) hangLantern(p, l, x, f1 - 2, z);
  // West wing: registry with chests; east wing: guard room.
  for (let z = 4; z <= 8; z++) { p.set(5, f0, z, 'chest', chest('east')); p.set(5, f0 + 1, z, 'bookshelf'); }
  table(p, 8, f0, 6, 'dark_oak'); chair(p, 8, f0, 7, 'dark_oak', 'south');
  for (let z = 4; z <= 8; z++) p.set(29, f0, z, 'barrel', barrel('west'));
  p.set(26, f0, 4, 'smithing_table'); p.set(27, f0, 4, 'grindstone', { face: 'floor', facing: 'south' });
  for (const [x, z] of [[8, 5], [26, 6]] as const) hangLantern(p, l, x, f1 - 2, z);
  // First floor: council chamber in a horseshoe of chairs.
  for (let x = 12; x <= 22; x++) chair(p, x, f1, 19, 'spruce', 'south');
  for (let z = 12; z <= 18; z++) { chair(p, 12, f1, z, 'spruce', 'west'); chair(p, 22, f1, z, 'spruce', 'east'); }
  p.set(17, f1, 12, 'lectern', lectern('south')); rug(p, 14, 13, 20, 17, f1, 'blue', 'white');
  hangLantern(p, l, 17, f2 - 2, 15);
  for (let x = 24; x <= 29; x++) p.set(x, f1, 20, 'bookshelf');
  // Second floor: archive and the mayor's chamber.
  for (let x = 6; x <= 14; x++) for (const z of [11, 13]) { p.set(x, f2, z, 'bookshelf'); p.set(x, f2 + 1, z, 'bookshelf'); }
  p.set(10, f2, 17, 'cartography_table'); table(p, 22, f2, 15, 'dark_oak'); chair(p, 22, f2, 16, 'dark_oak', 'south');
  bed(p, 27, f2, 16, 'red', 'south'); cupboard(p, 25, f2, 20, 'dark_oak', 'north', 2);
  hangLantern(p, l, 17, h.ceiling - 1, 15);
  for (const [x, z] of [[6, 20], [28, 20]] as const) ladderColumn(p, x, z, f0, h.floors[2]!);
  // Forecourt between the wings: lawns, benches, lamp posts.
  for (const [x0, x1] of [[13, 14], [20, 21]] as const) for (let x = x0; x <= x1; x++) for (let z = 3; z <= 7; z++) {
    put(p, x, 0, z, 'grass_block', grass());
    if ((x + z) % 3 === 0) put(p, x, 1, z, (x + z) % 2 ? 'poppy' : 'cornflower');
  }
  for (const x of [12, 22]) lampPost(p, x, 1, 1, 'dark_oak_fence', 3);
  for (const x of [13, 21]) chair(p, x, 1, 1, 'dark_oak', 'north');
  return p.payload();
}

/** Ladder column at (x, z) from y0 to y1 against the wall to the north, with holes in the floors it passes. */
function ladderColumn(p: Plot, x: number, z: number, y0: number, y1: number): void {
  for (let y = y0; y <= y1; y++) {
    if (y > y0) p.air(x, y, z);
    if (!p.get(x, y, z - 1) || p.get(x, y, z - 1)!.id === 'minecraft:air') put(p, x, y, z - 1, 'dark_oak_planks');
    put(p, x, y, z, 'ladder', { facing: 'south', waterlogged: F });
  }
}

// ------------------------------------------------------------ Schloss
const SCHLOSS: Look = lookWith(LOOKS.stein, {
  base: [['polished_andesite', 5], ['stone_bricks', 3], ['andesite', 1]], baseStairs: 'polished_andesite_stairs', baseSlab: 'polished_andesite_slab', baseWall: 'andesite_wall',
  wall: [['calcite', 5], ['white_terracotta', 2], ['smooth_quartz', 1]], frame: 'quartz_pillar',
  roof: [['deepslate_tiles', 5], ['cracked_deepslate_tiles', 1]], roofStairs: 'deepslate_tile_stairs', roofSlab: 'deepslate_tile_slab',
  trim: 'dark_oak', shutter: 'dark_oak', door: 'dark_oak', floor: 'dark_oak_planks',
});
const CAP: Mix = [['oxidized_copper', 3], ['weathered_copper', 2]];

/** Palace of four wings around a courtyard garden, corner towers with copper domes, gate passage, throne hall, chambers and kitchen. */
function schloss() {
  const p = new Plot([41, 2, 41]), l = SCHLOSS;
  ground(p, PAVE, 81);
  const N: Rect = { x0: 4, z0: 4, x1: 36, z1: 12 };
  const h = house(p, l, { at: N, storeys: [{ h: 6, kind: 'stein' }, { h: 5, kind: 'wand' }],
    wings: [{ at: { x0: 4, z0: 28, x1: 36, z1: 36 }, ridge: 'x' }, { at: { x0: 4, z0: 4, x1: 12, z1: 36 }, ridge: 'z' }, { at: { x0: 28, z0: 4, x1: 36, z1: 36 }, ridge: 'z' }],
    roof: { kind: 'walm', ridge: 'x', overhang: 1, pitch: 'normal' }, door: { side: 'north', at: 20 }, windowEvery: 3, windowH: 3, noShutters: false, flowerBoxes: false,
    noWindow: (x, _y, z) => (x === 20 && (z === 12 || z === 4)) || (x <= 8 && z <= 8) || (x >= 32 && z <= 8) || (x <= 8 && z >= 32) || (x >= 32 && z >= 32), seed: 81 });
  const [f0, f1] = [h.floors[0]! + 1, h.floors[1]! + 1];
  beltCourse(p, l, { x0: 4, z0: 4, x1: 36, z1: 36 }, h.floors[1]!);
  skirt(p, l, { x0: 4, z0: 4, x1: 36, z1: 36 }, 1);
  // Gate passage through the north wing into the courtyard.
  for (let z = 5; z <= 12; z++) for (let y = 1; y <= 3; y++) p.air(20, y, z);
  for (const z of [5, 11]) for (const x of [19, 21]) put(p, x, 1, z, 'polished_andesite');
  put(p, 20, 4, 12, 'polished_andesite_stairs', stairs('south', 'top'));
  // Courtyard garden: lawn, cross paths, fountain, hedges and four trees.
  for (let x = 13; x <= 27; x++) for (let z = 13; z <= 27; z++) put(p, x, 0, z, x === 20 || z === 20 ? 'gravel' : 'grass_block', x === 20 || z === 20 ? {} : grass());
  p.disc(20, 20, 0, 3, 'polished_andesite'); p.disc(20, 20, 1, 3, 'stone_brick_wall', {}, true);
  p.disc(20, 20, 1, 2, 'water', water());
  for (let y = 1; y <= 3; y++) put(p, 20, y, 20, 'polished_andesite');
  put(p, 20, 4, 20, 'lantern', lantern());
  for (const [x, z] of [[15, 15], [25, 15], [15, 25], [25, 25]] as const) roundTree(p, x, 1, z, 'oak', 4, 2);
  for (let x = 13; x <= 27; x++) for (const z of [13, 27]) if (Math.abs(x - 20) > 1) put(p, x, 1, z, 'oak_leaves', { distance: '1', persistent: 'true', waterlogged: F });
  for (let z = 14; z <= 26; z++) for (const x of [13, 27]) if (Math.abs(z - 20) > 1) put(p, x, 1, z, 'oak_leaves', { distance: '1', persistent: 'true', waterlogged: F });
  // Corner towers: round, with windows, floors, ladder and a copper dome.
  for (const [cx, cz] of [[5, 5], [35, 5], [5, 35], [35, 35]] as const) {
    for (let y = 1; y <= 17; y++) { p.disc(cx, cz, y, 4, null); p.disc(cx, cz, y, 4, 'stone_bricks', {}, true); }
    for (let y = 1; y <= 17; y++) for (const [dx, dz] of [[4, 0], [-4, 0], [0, 4], [0, -4]] as const) { const x = cx + dx, z = cz + dz; if (p.get(x, y, z)) put(p, x, y, z, pick(l.base, x, y, z, 83)); }
    for (const y of [6, 11]) { p.disc(cx, cz, y, 3, 'dark_oak_planks'); }
    for (const y of [3, 4, 8, 9, 13, 14]) for (const [dx, dz] of [[4, 0], [-4, 0], [0, 4], [0, -4]] as const) {
      const x = cx + dx, z = cz + dz, s = p.get(x, y, z);
      if (s && p.inside(x + Math.sign(dx), y, z + Math.sign(dz)) && !p.has(x + Math.sign(dx), y, z + Math.sign(dz))) put(p, x, y, z, 'glass_pane');
    }
    p.disc(cx, cz, 18, 4, 'polished_andesite'); p.disc(cx, cz, 18, 5, 'polished_andesite_slab', slab('top'), true);
    const t = dome(p, cx, cz, 19, 4, CAP, 'oxidized_cut_copper_stairs', 84);
    put(p, cx, t + 1, cz, 'lightning_rod', { facing: 'up', powered: F, waterlogged: F });
    for (let y = 1; y <= 17; y++) { const x = cx + (cx < 20 ? 1 : -1), z = cz + (cz < 20 ? 1 : -1); p.air(x, y, z); }
    for (const y of [6, 11]) { const x = cx + (cx < 20 ? 1 : -1), z = cz + (cz < 20 ? 1 : -1); p.air(x, y, z); }
    // Doorway from the wing into the tower on both floors.
    const dx = cx < 20 ? 4 : -4, dz = cz < 20 ? 4 : -4;
    for (const y of [1, 2, 7, 8]) { p.air(cx + dx, y, cz); p.air(cx, y, cz + dz); }
  }
  // North wing: throne hall with red carpet; banners.
  rug(p, 22, 8, 33, 8, f0, 'red');
  put(p, 34, f0, 8, 'gold_block'); put(p, 34, f0 + 1, 8, 'dark_oak_stairs', stairs('east'));
  for (const x of [24, 28, 32]) for (const z of [5, 11]) { put(p, x, f0 + 3, z === 5 ? 4 : 12, pick(l.base, x, f0 + 3, z, 86)); put(p, x, f0 + 3, z, 'purple_wall_banner', wallBanner(z === 5 ? 'south' : 'north')); }
  for (const x of [24, 30]) for (const z of [6, 10]) pedestalLamp(p, x, f0, z, 'polished_andesite');
  longTable(p, 7, 8, 17, 8, f0, 'dark_oak_slab');
  for (let x = 7; x <= 17; x += 2) { chair(p, x, f0, 7, 'dark_oak', 'north'); chair(p, x, f0, 9, 'dark_oak', 'south'); }
  for (const [x, z] of [[10, 6], [16, 10]] as const) hangLantern(p, l, x, f1 - 2, z);
  // East wing: kitchen and pantry; west wing: library; south wing: chapel side and guest rooms.
  for (let z = 14; z <= 22; z += 2) { p.set(35, f0, z, 'smoker', furnace('west')); p.set(35, f0, z + 1, 'barrel', barrel('west')); }
  longTable(p, 31, 15, 31, 22, f0, 'spruce_slab'); p.set(33, f0, 24, 'cauldron'); p.set(30, f0, 26, 'chest', chest('east'));
  for (let z = 14; z <= 26; z++) { p.set(5, f0, z, 'bookshelf'); p.set(5, f0 + 1, z, 'bookshelf'); }
  p.set(9, f0, 18, 'lectern', lectern('west')); p.set(9, f0, 22, 'enchanting_table'); rug(p, 7, 16, 10, 24, f0, 'green', 'lime');
  for (let x = 14; x <= 26; x += 3) { bed(p, x, f0, 33, 'blue', 'south'); p.set(x + 1, f0, 35, 'chest', chest('north')); }
  for (const [x, z] of [[33, 18], [8, 20], [20, 32]] as const) hangLantern(p, l, x, f1 - 2, z);
  // Upper floor: private chambers.
  for (let x = 14; x <= 26; x += 4) { bed(p, x, f1, 9, 'white', 'south'); cupboard(p, x + 2, f1, 5, 'dark_oak', 'south', 2); }
  for (let z = 14; z <= 26; z += 4) { bed(p, 33, f1, z, 'light_blue', 'south'); table(p, 31, f1, z + 1, 'dark_oak'); }
  rug(p, 15, 31, 25, 33, f1, 'purple', 'magenta');
  for (const [x, z] of [[20, 8], [32, 20], [20, 32], [8, 20]] as const) hangLantern(p, l, x, h.ceiling - 1, z);
  for (const [x, z] of [[9, 9], [31, 31]] as const) {
    for (let y = f0; y <= h.floors[1]!; y++) { if (y > f0) p.air(x, y, z); put(p, x, y, z - 1, pick(l.wall, x, y, z - 1, 85)); put(p, x, y, z, 'ladder', { facing: 'south', waterlogged: F }); }
  }
  // Forecourt: lamp posts at the gate.
  for (const x of [17, 23]) lampPost(p, x, 1, 1, 'dark_oak_fence', 3);
  return p.payload();
}

// ------------------------------------------------------------ Basilika
const BAS: Look = lookWith(LOOKS.antik, {
  base: [['polished_diorite', 4], ['smooth_quartz', 2], ['polished_andesite', 1]], baseStairs: 'polished_diorite_stairs', baseSlab: 'polished_diorite_slab', baseWall: 'diorite_wall',
  wall: [['smooth_sandstone', 4], ['cut_sandstone', 2], ['sandstone', 1]], frame: 'quartz_pillar',
  roof: [['terracotta', 3], ['orange_terracotta', 1]], roofStairs: 'granite_stairs', roofSlab: 'granite_slab', trim: 'spruce', floor: 'polished_diorite',
});
const DRUM: Mix = [['smooth_sandstone', 4], ['cut_sandstone', 2]];

/** Cross-shaped basilica with a portico of columns, a drum with windows and a copper dome over the crossing; nave with column rows and an apse. */
function basilika() {
  const p = new Plot([31, 2, 43]), l = BAS;
  ground(p, PAVE, 91);
  const nave: Rect = { x0: 9, z0: 16, x1: 21, z1: 40 }, transept: Rect = { x0: 3, z0: 18, x1: 27, z1: 26 };
  const h = house(p, l, { at: nave, storeys: [{ h: 11, kind: 'stein' }], wings: [{ at: transept, ridge: 'x' }], openCeiling: true,
    roof: { kind: 'sattel', ridge: 'z', overhang: 1, pitch: 'normal' }, door: { side: 'north', at: 15 }, windowEvery: 4, windowH: 5, noShutters: true, seed: 91 });
  const f0 = h.floors[0]! + 1;
  // Floor: chequered marble.
  for (const r of [nave, transept]) for (let x = r.x0 + 1; x < r.x1; x++) for (let z = r.z0 + 1; z < r.z1; z++) put(p, x, 0, z, (x + z) % 2 ? 'polished_diorite' : 'polished_andesite');
  // Portico: steps, six columns, pediment roof.
  for (let x = 8; x <= 22; x++) { put(p, x, 0, 4, 'polished_diorite_stairs', stairs('south')); for (let z = 5; z <= 15; z++) put(p, x, 0, z, 'smooth_quartz'); }
  for (const x of [9, 12, 14, 16, 18, 21]) column(p, x, 6, 1, 10, 'quartz_pillar', 'chiseled_quartz_block', 'quartz_stairs');
  for (const x of [9, 21]) column(p, x, 11, 1, 10, 'quartz_pillar', 'chiseled_quartz_block', 'quartz_stairs');
  for (let x = 8; x <= 22; x++) for (let z = 5; z <= 15; z++) put(p, x, 11, z, 'smooth_quartz');
  pitchedRoof(p, l, { walls: { x0: 8, z0: 5, x1: 22, z1: 16 }, y: 12, kind: 'sattel', ridge: 'z', overhang: 1, pitch: 'normal', seed: 92, gables: true });
  // Crossing: drum and dome over x 9..21, z 18..26 centred (15, 22).
  const cx = 15, cz = 22, ceil = h.ceiling;
  for (let y = ceil; y <= ceil + 8; y++) for (let x = cx - 7; x <= cx + 7; x++) for (let z = cz - 7; z <= cz + 7; z++) {
    const q = (x - cx) ** 2 + (z - cz) ** 2;
    if (q <= 6 * 6 + 4) p.air(x, y, z);
  }
  for (let y = ceil; y <= ceil + 5; y++) {
    p.disc(cx, cz, y, 6, 'smooth_sandstone', {}, true);
    for (let x = cx - 7; x <= cx + 7; x++) for (let z = cz - 7; z <= cz + 7; z++) { const s = p.get(x, y, z); if (s?.id === 'minecraft:smooth_sandstone') put(p, x, y, z, pick(DRUM, x, y, z, 93)); }
  }
  for (const [dx, dz] of [[6, 0], [-6, 0], [0, 6], [0, -6], [4, 4], [-4, 4], [4, -4], [-4, -4]] as const) for (let y = ceil + 2; y <= ceil + 4; y++) if (p.get(cx + dx, y, cz + dz)) put(p, cx + dx, y, cz + dz, 'yellow_stained_glass_pane');
  p.disc(cx, cz, ceil + 6, 7, 'cut_sandstone_slab', slab('top'), true);
  const top = dome(p, cx, cz, ceil + 6, 6, CAP, 'oxidized_cut_copper_stairs', 94);
  for (let y = top + 1; y <= top + 2; y++) put(p, cx, y, cz, 'polished_diorite');
  put(p, cx, top + 3, cz, 'lantern', lantern());
  // Inside: two column rows in the nave, pews, altar in the apse wall, side altars in the transept.
  for (let z = 28; z <= 38; z += 3) for (const x of [11, 19]) column(p, x, z, f0, 10, 'quartz_pillar', 'chiseled_quartz_block', 'quartz_stairs');
  for (let z = 28; z <= 37; z += 2) for (let x = 12; x <= 18; x++) if (x !== 15) chair(p, x, f0, z, 'spruce', 'south');
  for (let x = 13; x <= 17; x++) put(p, x, f0, 19, 'quartz_slab', slab('top'));
  put(p, 15, f0, 18, 'chiseled_quartz_block'); put(p, 15, f0 + 1, 18, 'lectern', lectern('south'));
  for (const x of [13, 17]) put(p, x, f0 + 1, 19, 'candle', { candles: '3', lit: F, waterlogged: F });
  for (const x of [5, 25]) { put(p, x, f0, 22, 'chiseled_quartz_block'); put(p, x, f0 + 1, 22, 'candle', { candles: '4', lit: F, waterlogged: F }); }
  for (const [x, z] of [[10, 20], [20, 20], [10, 25], [20, 25], [12, 33], [18, 33]] as const) pedestalLamp(p, x, f0, z, 'chiseled_quartz_block');
  rug(p, 15, 27, 15, 39, f0, 'red');
  // Bell niche on the north gable.
  put(p, 15, h.ceiling - 1, 16, 'bell', bell('north', 'single_wall'));
  return p.payload();
}

// ------------------------------------------------------------ Arena
const ARENA_WALL: Mix = [['smooth_sandstone', 5], ['cut_sandstone', 2], ['sandstone', 2], ['chiseled_sandstone', 1]];
const SEAT: Mix = [['smooth_sandstone', 3], ['cut_sandstone', 1]];

/** Oval arena: arcaded outer wall in two storeys with a walkway behind it, stepped seating, four gates, a sand field with a podium wall and a covered box for guests of honour. */
function arena() {
  const W = 45, D = 35, p = new Plot([W, 2, D]);
  const cx = (W - 1) / 2, cz = (D - 1) / 2, fa = 12, fb = 7;
  const r = (x: number, z: number, a: number, b: number) => ((x - cx) / a) ** 2 + ((z - cz) / b) ** 2;
  const inOval = (x: number, z: number) => r(x, z, cx + 0.5, cz + 0.5) <= 1;
  const field = (x: number, z: number) => r(x, z, fa, fb) <= 1;
  const gate = (x: number, z: number) => Math.abs(x - cx) <= 1 || Math.abs(z - cz) <= 1;
  // Ring depth: 0 on the outer face, counted inwards (4-neighbour steps).
  const depth = new Map<string, number>();
  let front: [number, number][] = [];
  for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) if (inOval(x, z) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => !inOval(x + dx!, z + dz!))) { depth.set(`${x},${z}`, 0); front.push([x, z]); }
  for (let d = 1; front.length; d++) {
    const next: [number, number][] = [];
    for (const [x, z] of front) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const k = `${x + dx},${z + dz}`;
      if (inOval(x + dx, z + dz) && !depth.has(k)) { depth.set(k, d); next.push([x + dx, z + dz]); }
    }
    front = next;
  }
  const out = (x: number, z: number): H => Math.abs(x - cx) / cx >= Math.abs(z - cz) / cz ? (x < cx ? 'west' : 'east') : (z < cz ? 'north' : 'south');
  // Arches on the outer face: piers and openings alternate along the perimeter, ordered by angle.
  const rim = [...depth].filter(([, d]) => d === 0).map(([k]) => k.split(',').map(Number) as [number, number])
    .sort((a, b) => stableAtan2(a[1] - cz, a[0] - cx) - stableAtan2(b[1] - cz, b[0] - cx));
  const opening = new Set(rim.filter((_, i) => i % 3 !== 0).map(([x, z]) => `${x},${z}`));
  for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) {
    if (!inOval(x, z)) continue;
    const d = depth.get(`${x},${z}`)!;
    if (field(x, z)) { put(p, x, 0, z, 'sand'); continue; }
    put(p, x, 0, z, pick(PAVE, x, 0, z, 101));
    if (d === 0) {
      const open = opening.has(`${x},${z}`) || gate(x, z);
      for (let y = 1; y <= 13; y++) {
        const hole = (open && ((y >= 1 && y <= 3) || (y >= 6 && y <= 8 && !gate(x, z)))) || (gate(x, z) && y <= 4);
        if (hole) continue;
        put(p, x, y, z, y === 5 || y === 10 ? 'cut_sandstone' : y === 4 || y === 9 ? 'smooth_sandstone' : pick(ARENA_WALL, x, y, z, 102));
      }
      if ((x + z) % 2 === 0) put(p, x, 14, z, 'sandstone_wall');
      continue;
    }
    if (d <= 2) { // two-storey walkway behind the arcade, open to the top seats
      put(p, x, 5, z, 'cut_sandstone'); put(p, x, 10, z, 'cut_sandstone');
      continue;
    }
    if (gate(x, z)) { put(p, x, 5, z, 'cut_sandstone'); continue; }
    const fi = Math.sqrt(r(x, z, fa, fb)), ro = Math.sqrt(r(x, z, cx + 0.5, cz + 0.5));
    const s = Math.max(0, Math.min(1, (ro - ro / fi) / (1 - ro / fi))); // 0 at the field edge, 1 at the outer edge
    if (s < 0.08) { put(p, x, 1, z, 'chiseled_sandstone'); put(p, x, 2, z, 'sandstone_wall'); continue; }
    const hgt = Math.min(10, 2 + Math.floor(s * 9));
    for (let y = 1; y < hgt; y++) put(p, x, y, z, pick(SEAT, x, y, z, 103));
    put(p, x, hgt, z, 'smooth_sandstone_stairs', stairs(out(x, z)));
  }
  // Lanterns hang from the walkway ceilings; pedestal lights flank the four gates outside.
  for (const [k, d] of depth) if (d === 1) { const [x, z] = k.split(',').map(Number) as [number, number]; if ((x * 7 + z * 3) % 9 === 0 && !gate(x, z)) { hangLantern(p, null, x, 4, z); hangLantern(p, null, x, 9, z); } }
  for (const f of ['north', 'south', 'west', 'east'] as const) {
    const [dx, dz] = STEP[f], along = f === 'north' || f === 'south' ? [1, 0] : [0, 1];
    let x = Math.round(cx), z = Math.round(cz);
    while (inOval(x + dx, z + dz)) { x += dx; z += dz; }
    for (const side of [-3, 3]) {
      const px = x + dx + along[0]! * side, pz = z + dz + along[1]! * side;
      if (!p.inside(px, 1, pz)) continue;
      put(p, px, 0, pz, 'smooth_sandstone'); put(p, px, 1, pz, 'chiseled_sandstone'); put(p, px, 2, pz, 'lantern', lantern());
    }
  }
  // Box for guests of honour on the north side: posts and a slab roof over the top seats.
  for (let x = cx - 3; x <= cx + 3; x++) for (let z = 3; z <= 5; z++) {
    if (depth.get(`${x},${z}`) === undefined || depth.get(`${x},${z}`)! < 3 || field(x, z)) continue;
    let y = 1; while (p.has(x, y, z)) y++;
    if (x === cx - 3 || x === cx + 3) for (let yy = y; yy <= 12; yy++) put(p, x, yy, z, 'birch_fence');
    put(p, x, 13, z, 'birch_slab', slab('bottom'));
  }
  // Banners on the podium wall facing the field.
  for (const [x, z] of [[cx - 6, cz - fb - 1], [cx + 6, cz - fb - 1], [cx - 6, cz + fb + 1], [cx + 6, cz + fb + 1]] as const) {
    if (p.get(x, 1, z)?.id !== 'minecraft:chiseled_sandstone') continue;
    const f: H = z < cz ? 'south' : 'north', [dx, dz] = STEP[f];
    putFree(p, x + dx, 1, z + dz, 'red_wall_banner', wallBanner(f));
  }
  return p.payload();
}

// ------------------------------------------------------------ Marktplatz
const STALL_COLORS = [['red', 'white'], ['blue', 'white'], ['yellow', 'orange'], ['green', 'lime'], ['purple', 'magenta'], ['cyan', 'light_blue'], ['orange', 'white'], ['brown', 'yellow']] as const;

/** Large paved market square: round fountain with a column, eight stalls with goods, linden trees, benches, lamp posts and a market cross. */
function marktplatz() {
  const S = 33, p = new Plot([S, 2, S]), c = 16;
  for (let x = 0; x < S; x++) for (let z = 0; z < S; z++) {
    const d = Math.max(Math.abs(x - c), Math.abs(z - c)), ring = Math.round(stableHypot(x - c, z - c));
    put(p, x, 0, z, d >= 15 ? 'cobblestone' : ring % 4 === 0 ? 'polished_andesite' : pick([['stone_bricks', 3], ['andesite', 2], ['cobblestone', 1], ['mossy_cobblestone', 1]], x, 0, z, 111));
  }
  // Fountain: basin ring, water, centre column with lanterns.
  p.disc(c, c, 0, 5, 'polished_andesite');
  p.disc(c, c, 1, 5, 'stone_brick_wall', {}, true); p.disc(c, c, 1, 4, 'water', water());
  for (let y = 1; y <= 5; y++) put(p, c, y, c, y === 5 ? 'chiseled_stone_bricks' : 'polished_andesite');
  for (const f of ['north', 'east', 'south', 'west'] as const) { const [dx, dz] = STEP[f]; put(p, c + dx, 5, c + dz, 'stone_brick_stairs', stairs(OPPOSITE[f], 'top')); }
  put(p, c, 6, c, 'lantern', lantern());
  // Eight stalls on a ring: posts, striped awning, counter, barrels and goods.
  const spots: readonly [number, number, H][] = [[5, 2, 'south'], [13, 2, 'south'], [21, 2, 'south'], [27, 9, 'west'], [27, 19, 'west'], [21, 27, 'north'], [13, 27, 'north'], [2, 15, 'east']];
  spots.forEach(([x0, z0, f], i) => {
    const along: H = f === 'north' || f === 'south' ? 'east' : 'south';
    const [ax, az] = STEP[along], [bx, bz] = STEP[OPPOSITE[f]];
    const cols = STALL_COLORS[i % STALL_COLORS.length]!;
    for (const k of [0, 3]) for (const back of [0, 2]) for (let y = 1; y <= 3; y++) put(p, x0 + ax * k + bx * back, y, z0 + az * k + bz * back, 'spruce_fence');
    for (let k = 0; k <= 3; k++) for (let back = 0; back <= 2; back++) put(p, x0 + ax * k + bx * back, 4, z0 + az * k + bz * back, `${cols[(k + back) % 2]}_wool`);
    put(p, x0 + ax, 1, z0 + az, 'spruce_slab', slab('top')); put(p, x0 + ax * 2, 1, z0 + az * 2, 'spruce_slab', slab('top'));
    put(p, x0 + ax + bx * 2, 1, z0 + az + bz * 2, 'barrel', barrel('up')); put(p, x0 + ax * 2 + bx * 2, 1, z0 + az * 2 + bz * 2, 'chest', chest(f));
    const goods = [['pumpkin', 'melon'], ['hay_block', 'barrel'], ['red_wool', 'white_wool'], ['beehive', 'composter'], ['cauldron', 'smithing_table'], ['bookshelf', 'lectern'], ['carved_pumpkin', 'pumpkin'], ['fletching_table', 'loom']][i]!;
    for (const [k, g] of [[1, goods[0]], [2, goods[1]]] as const) {
      const props: Record<string, string> = g === 'barrel' ? barrel('up') : g === 'beehive' ? { facing: f, honey_level: '0' } : g === 'lectern' ? lectern(f) : g === 'carved_pumpkin' ? { facing: f } : g === 'hay_block' ? axis('y') : g === 'loom' ? { facing: f } : {};
      put(p, x0 + ax * k + bx, 1, z0 + az * k + bz, g!, props);
    }
  });
  // Linden trees at the corners on lawn beds with benches.
  for (const [x, z] of [[4, 4], [28, 4], [4, 28], [28, 28]] as const) {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) put(p, x + dx, 0, z + dz, 'grass_block', grass());
    roundTree(p, x, 1, z, 'oak', 5, 3);
    for (const [bx, bz, f] of [[x - 2, z, 'west'], [x + 2, z, 'east']] as const) if (p.inside(bx, 1, bz) && !p.has(bx, 1, bz)) chair(p, bx, 1, bz, 'spruce', f);
  }
  for (const [x, z] of [[9, 9], [23, 9], [9, 23], [23, 23]] as const) lampPost(p, x, 1, z, 'dark_oak_fence', 3);
  // Market cross with a bell.
  for (let y = 1; y <= 4; y++) put(p, 16, y, 25, y === 4 ? 'chiseled_stone_bricks' : 'stone_bricks');
  for (let x = 15; x <= 17; x++) put(p, x, 5, 25, 'stone_brick_slab', slab('bottom'));
  put(p, 16, 5, 25, 'bell', bell('south', 'floor'));
  return p.payload();
}

// ------------------------------------------------------------ Stadttor
const GATE_STONE: Mix = [['stone_bricks', 8], ['mossy_stone_bricks', 2], ['cracked_stone_bricks', 2], ['andesite', 1]];

/** City gate: square gatehouse with a vaulted passage and portcullis, two round towers, wall segments with a parapet walk, and a timber upper storey. */
function stadttor() {
  const W = 37, D = 15, p = new Plot([W, 2, D]);
  ground(p, [['cobblestone', 3], ['andesite', 1], ['gravel', 1]], 121);
  const wall = (x: number, y: number, z: number) => put(p, x, y, z, pick(GATE_STONE, x, y, z, 122));
  // Wall segments x 0..10 and 26..36, z 5..9, to y 8, walk at y 8, crenels at y 9.
  for (const [x0, x1] of [[0, 11], [25, 36]] as const) for (let x = x0; x <= x1; x++) for (let z = 5; z <= 9; z++) {
    for (let y = 1; y <= 7; y++) wall(x, y, z);
    put(p, x, 8, z, z === 5 || z === 9 ? pick(GATE_STONE, x, 8, z, 123) : 'stone_bricks');
    if ((z === 5 || z === 9) && x % 2 === 0) wall(x, 9, z);
  }
  // Round towers at x 11 and 25.
  for (const cx of [11, 25]) {
    for (let y = 1; y <= 14; y++) { p.disc(cx, 7, y, 4, null); p.disc(cx, 7, y, 4, 'stone_bricks', {}, true); }
    for (let y = 1; y <= 14; y++) for (let x = cx - 5; x <= cx + 5; x++) for (let z = 2; z <= 12; z++) if (p.get(x, y, z)?.id === 'minecraft:stone_bricks') wall(x, y, z);
    for (const y of [8]) p.disc(cx, 7, y, 3, 'spruce_planks');
    p.disc(cx, 7, 15, 4, 'stone_bricks'); p.disc(cx, 7, 16, 4, 'stone_brick_wall', {}, true);
    for (const y of [4, 11]) for (const [dx, dz] of [[0, -4], [0, 4]] as const) put(p, cx + dx, y, 7 + dz, 'iron_bars');
    for (const y of [1, 2, 9, 10]) { p.air(cx + (cx < 18 ? -4 : 4), y, 7); }
    for (let y = 1; y <= 14; y++) { p.air(cx, y, 9); if (y !== 8) put(p, cx, y, 10, pick(GATE_STONE, cx, y, 10, 124)); put(p, cx, y, 9, 'ladder', { facing: 'north', waterlogged: F }); }
    p.air(cx, 15, 9); put(p, cx, 15, 9, 'ladder', { facing: 'north', waterlogged: F }); put(p, cx, 15, 10, 'stone_bricks');
  }
  // Gatehouse x 14..22, z 3..11: passage x 16..20 to y 5, upper hall, timber storey and a hipped roof.
  for (let x = 14; x <= 22; x++) for (let z = 3; z <= 11; z++) for (let y = 1; y <= 10; y++) {
    const edge = x === 14 || x === 22 || z === 3 || z === 11;
    const passage = x >= 16 && x <= 20 && y <= 5;
    if (passage) { p.air(x, y, z); continue; }
    if (edge || y <= 6) wall(x, y, z); else p.air(x, y, z);
  }
  for (let z = 3; z <= 11; z++) for (const x of [16, 20]) put(p, x, 5, z, 'stone_brick_stairs', stairs(x === 16 ? 'east' : 'west', 'top'));
  for (let x = 16; x <= 20; x++) put(p, x, 5, 4, 'iron_bars');
  for (let x = 15; x <= 21; x++) for (let z = 4; z <= 10; z++) put(p, x, 7, z, 'spruce_planks');
  for (const z of [3, 11]) for (const x of [16, 18, 20]) put(p, x, 9, z, 'glass_pane');
  for (const z of [3, 11]) put(p, 18, 7, z, 'stone_brick_stairs', stairs(z === 3 ? 'south' : 'north', 'top'));
  const l = lookWith(LOOKS.fachwerk, { base: GATE_STONE });
  const hgate = house(p, l, { at: { x0: 13, z0: 2, x1: 23, z1: 12 }, y0: 10, storeys: [{ h: 4, kind: 'fachwerk' }], roof: { kind: 'walm', ridge: 'x', overhang: 1, pitch: 'steil' }, door: null, postEvery: 2, windowEvery: 2, seed: 125 });
  for (let x = 13; x <= 23; x++) for (const z of [2, 12]) if (x % 2 === 1) putFree(p, x, 9, z, 'spruce_stairs', stairs(z === 2 ? 'south' : 'north', 'top'));
  // Inside the guard hall and the timber storey: table, beds, weapons racks (barrels), banners above the passage.
  table(p, 18, 8, 7, 'spruce'); chair(p, 17, 8, 7, 'spruce', 'west'); chair(p, 19, 8, 7, 'spruce', 'east');
  for (const z of [5, 9]) p.set(15, 8, z, 'barrel', barrel('east'));
  for (const x of [16, 20]) bed(p, x, hgate.floors[0]! + 1, 4, 'red', 'south');
  p.set(18, hgate.floors[0]! + 1, 9, 'chest', chest('north'));
  hangLantern(p, l, 18, hgate.ceiling - 1, 7);
  for (const z of [2, 12]) put(p, 18, 6, z, 'red_wall_banner', wallBanner(z === 2 ? 'north' : 'south'));
  // Access from the wall walks into the gatehouse hall.
  for (const z of [6, 7, 8]) { for (const x of [14, 22]) { p.air(x, 8, z); p.air(x, 9, z); } }
  // Lanterns at the gate.
  for (const z of [1, 13]) for (const x of [15, 21]) lampPost(p, x, 1, z, 'spruce_fence', 2);
  return p.payload();
}

// ------------------------------------------------------------ Kloster
const KLOSTER: Look = lookWith(LOOKS.stein, {
  base: [['stone_bricks', 5], ['mossy_stone_bricks', 2], ['cobblestone', 1], ['cracked_stone_bricks', 1]], baseStairs: 'stone_brick_stairs', baseSlab: 'stone_brick_slab', baseWall: 'stone_brick_wall',
  wall: [['stone_bricks', 4], ['andesite', 2], ['tuff', 1], ['mossy_stone_bricks', 1]], frame: 'stripped_spruce_log',
  roof: [['deepslate_tiles', 4], ['cracked_deepslate_tiles', 1]], roofStairs: 'deepslate_tile_stairs', roofSlab: 'deepslate_tile_slab',
  trim: 'spruce', shutter: 'spruce', door: 'spruce', floor: 'spruce_planks',
});

/** Monastery: church with a bell tower, three ranges around a cloister walk with an arcade and herb garden, refectory, kitchen, library, chapter house, dormitory, beehives and an orchard. */
function kloster() {
  const p = new Plot([41, 2, 39]), l = KLOSTER;
  ground(p, [['grass_block', 1]], 131);
  for (let x = 0; x < 41; x++) for (let z = 0; z < 39; z++) put(p, x, 0, z, 'grass_block', grass());
  // Church on the west side: nave with an open roof, door to the north.
  const church: Rect = { x0: 2, z0: 6, x1: 12, z1: 34 };
  const hc = house(p, l, { at: church, storeys: [{ h: 9, kind: 'stein' }], openCeiling: true, roof: { kind: 'sattel', ridge: 'z', overhang: 1, pitch: 'steil' },
    door: { side: 'north', at: 7 }, windowEvery: 4, windowH: 4, noShutters: true, seed: 131 });
  for (let x = church.x0 + 1; x < church.x1; x++) for (let z = church.z0 + 1; z < church.z1; z++) put(p, x, 0, z, (x + z) % 2 ? 'polished_andesite' : 'stone_bricks');
  for (let z = 12; z <= 30; z += 2) for (const x of [4, 5, 9, 10]) chair(p, x, 1, z, 'spruce', 'south');
  for (let x = 5; x <= 9; x++) put(p, x, 1, 32, 'stone_brick_slab', slab('top'));
  put(p, 7, 1, 33, 'chiseled_stone_bricks'); put(p, 7, 2, 33, 'lectern', lectern('north'));
  for (const x of [5, 9]) put(p, x, 2, 32, 'candle', { candles: '3', lit: F, waterlogged: F });
  for (const z of [11, 19, 27]) for (const x of [3, 11]) pedestalLamp(p, x, 1, z, 'chiseled_stone_bricks');
  rug(p, 7, 8, 7, 31, 1, 'red');
  // Bell tower at the north-west corner of the church.
  const T: Rect = { x0: 2, z0: 1, x1: 6, z1: 6 }, top = Math.max(20, hc.roofTop + 3);
  for (let y = 1; y <= top; y++) for (let x = T.x0; x <= T.x1; x++) for (let z = T.z0; z <= T.z1; z++) {
    const edge = x === T.x0 || x === T.x1 || z === T.z0 || z === T.z1;
    if (z === T.z1 && y <= 9) continue;
    if (edge) put(p, x, y, z, pick(l.base, x, y, z, 132)); else p.air(x, y, z);
  }
  for (const y of [top - 4]) for (let x = T.x0 + 1; x < T.x1; x++) for (let z = T.z0 + 1; z < T.z1; z++) put(p, x, y, z, 'spruce_planks');
  for (let y = top - 3; y <= top - 1; y++) for (const [x, z] of [[4, T.z0], [T.x0, 3], [T.x1, 3]] as const) p.air(x, y, z);
  for (let x = T.x0 + 1; x < T.x1; x++) for (let z = T.z0 + 1; z < T.z1; z++) put(p, x, top, z, 'spruce_planks');
  put(p, 4, top - 1, 3, 'bell', bell('north', 'ceiling'));
  for (let y = 1; y <= 3; y++) p.air(4, y, T.z1);
  ladderColumn(p, 4, 3, 1, top - 4);
  const tr = pitchedRoof(p, l, { walls: T, y: top + 1, kind: 'walm', ridge: 'z', overhang: 1, pitch: 'steil', seed: 133 });
  put(p, 4, tr + 1, 3, 'lightning_rod', { facing: 'up', powered: F, waterlogged: F });
  // Ranges around the cloister: north (chapter house, library above), east (dormitory), south (refectory and kitchen).
  const N: Rect = { x0: 13, z0: 8, x1: 37, z1: 15 };
  const h = house(p, l, { at: N, storeys: [{ h: 5, kind: 'stein' }, { h: 4, kind: 'wand' }],
    wings: [{ at: { x0: 30, z0: 8, x1: 37, z1: 34 }, ridge: 'z' }, { at: { x0: 13, z0: 27, x1: 37, z1: 34 }, ridge: 'x' }],
    roof: { kind: 'sattel', ridge: 'x', overhang: 1, pitch: 'steil' }, door: { side: 'north', at: 21 }, windowEvery: 3, windowH: 2, seed: 134 });
  const [f0, f1] = [h.floors[0]! + 1, h.floors[1]! + 1];
  // Passages from the ranges into the cloister and from the church into the ranges.
  for (const [x, z] of [[21, N.z1], [33, 26], [33, 27], [21, 27], [30, 20], [13, 12], [12, 12], [13, 30], [12, 30]] as const) for (let y = 1; y <= 2; y++) p.air(x, y, z);
  for (let y = 1; y <= 2; y++) { p.air(30, y, 21); }
  // Cloister: court x 14..29, z 16..26 with a covered walk around a herb garden and a well.
  const C: Rect = { x0: 13, z0: 16, x1: 29, z1: 26 };
  for (let x = C.x0; x <= C.x1; x++) for (let z = C.z0; z <= C.z1; z++) {
    const walk = x <= C.x0 + 1 || x >= C.x1 - 1 || z <= C.z0 + 1 || z >= C.z1 - 1;
    if (walk) {
      put(p, x, 0, z, 'polished_andesite'); put(p, x, 4, z, 'stone_brick_slab', slab('bottom'));
      const inner = (x === C.x0 + 1 || x === C.x1 - 1 || z === C.z0 + 1 || z === C.z1 - 1) && x > C.x0 && x < C.x1 && z > C.z0 && z < C.z1;
      if (inner && (x + z) % 2 === 0) for (let y = 1; y <= 3; y++) put(p, x, y, z, y === 3 ? 'stone_bricks' : 'stone_brick_wall');
      else if (inner) put(p, x, 3, z, 'stone_brick_stairs', stairs(x === C.x0 + 1 ? 'west' : x === C.x1 - 1 ? 'east' : z === C.z0 + 1 ? 'north' : 'south', 'top'));
    } else {
      const path = x === 21 || z === 21;
      put(p, x, 0, z, path ? 'gravel' : 'grass_block', path ? {} : grass());
      if (!path && (x * 3 + z) % 4 === 0) put(p, x, 1, z, ['allium', 'azure_bluet', 'cornflower', 'lily_of_the_valley'][(x + z) % 4]!);
    }
  }
  for (const [x, z] of [[14, 17], [28, 17], [14, 25], [28, 25]] as const) hangLantern(p, null, x, 3, z);
  p.disc(21, 21, 0, 1, 'stone_bricks'); put(p, 21, 0, 21, 'water', water());
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]] as const) put(p, 21 + dx, 1, 21 + dz, 'stone_brick_wall');
  for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]] as const) for (let y = 2; y <= 3; y++) put(p, 21 + dx, y, 21 + dz, 'spruce_fence');
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) put(p, 21 + dx, 4, 21 + dz, 'spruce_slab', slab('bottom'));
  // North range: chapter house (benches along the walls), library upstairs.
  for (let x = 15; x <= 28; x++) { if (x !== 21) { chair(p, x, f0, 9, 'spruce', 'north'); } }
  p.set(22, f0, 12, 'lectern', lectern('north'));
  hangLantern(p, l, 18, f1 - 2, 12); hangLantern(p, l, 25, f1 - 2, 12);
  for (let x = 14; x <= 28; x += 2) for (const z of [9, 14]) { p.set(x, f1, z, 'bookshelf'); p.set(x, f1 + 1, z, 'bookshelf'); }
  for (const x of [17, 23]) { table(p, x, f1, 11, 'spruce'); chair(p, x, f1, 12, 'spruce', 'south'); }
  p.set(26, f1, 11, 'lectern', lectern('south'));
  // East range: dormitory upstairs, infirmary below.
  for (let z = 17; z <= 31; z += 3) { bed(p, 32, f1, z, 'brown', 'west'); p.set(36, f1, z, 'chest', chest('west')); }
  for (let z = 18; z <= 30; z += 4) { bed(p, 36, f0, z, 'white', 'east'); p.set(31, f0, z, 'brewing_stand', { has_bottle_0: F, has_bottle_1: F, has_bottle_2: F }); }
  for (const z of [14, 24, 32]) { hangLantern(p, l, 34, f1 - 2, z); }
  hangLantern(p, l, 34, h.ceiling - 1, 22);
  // South range: refectory with a long table, kitchen at the east end.
  longTable(p, 15, 30, 26, 30, f0, 'spruce_slab');
  for (let x = 15; x <= 26; x += 1) { chair(p, x, f0, 29, 'spruce', 'north'); chair(p, x, f0, 31, 'spruce', 'south'); }
  p.set(20, f0, 33, 'lectern', lectern('north'));
  for (let x = 28; x <= 29; x++) for (const z of [28, 33]) p.set(x, f0, z, 'smoker', furnace(z === 28 ? 'south' : 'north'));
  p.set(28, f0, 30, 'cauldron'); p.set(29, f0, 31, 'barrel', barrel('up')); p.set(28, f0, 31, 'crafting_table');
  for (const x of [18, 24]) hangLantern(p, l, x, f1 - 2, 30);
  for (const [x, z] of [[15, 13], [35, 32]] as const) ladderColumn(p, x, z, f0, h.floors[1]!);
  // Grounds: bee garden and orchard along the east, lamp at the gate.
  for (const z of [3, 6]) for (const x of [32, 35, 38]) { p.set(x, 1, z, 'beehive', { facing: 'south', honey_level: '0' }); }
  for (const [x, z] of [[39, 12], [39, 20], [39, 28], [39, 36]] as const) roundTree(p, x, 1, z, 'oak', 3, 1);
  for (let x = 13; x <= 30; x += 4) put(p, x, 1, 37, 'composter', { level: '0' });
  for (const x of [17, 25]) lampPost(p, x, 1, 5, 'spruce_fence', 3);
  return p.payload();
}

// ------------------------------------------------------------ Universität
const UNI: Look = lookWith(LOOKS.backstein, {
  base: [['stone_bricks', 5], ['polished_andesite', 2], ['andesite', 1]], baseStairs: 'stone_brick_stairs', baseSlab: 'stone_brick_slab', baseWall: 'stone_brick_wall',
  wall: [['bricks', 6], ['granite', 1], ['terracotta', 1]], frame: 'polished_andesite',
  roof: [['deepslate_tiles', 4], ['cracked_deepslate_tiles', 1]], roofStairs: 'deepslate_tile_stairs', roofSlab: 'deepslate_tile_slab',
  trim: 'dark_oak', shutter: 'dark_oak', door: 'dark_oak', floor: 'oak_planks',
});

/** University in a U around a quad: great hall with tiered benches, library wing, laboratory wing, study rooms upstairs and an observatory tower with a copper dome. */
function universitaet() {
  const p = new Plot([39, 2, 35]), l = UNI;
  ground(p, PAVE, 141);
  const M: Rect = { x0: 3, z0: 5, x1: 35, z1: 13 };
  const h = house(p, l, { at: M, storeys: [{ h: 6, kind: 'stein' }, { h: 5, kind: 'wand' }, { h: 4, kind: 'wand' }],
    wings: [{ at: { x0: 3, z0: 5, x1: 11, z1: 31 }, ridge: 'z' }, { at: { x0: 27, z0: 5, x1: 35, z1: 31 }, ridge: 'z' }],
    roof: { kind: 'walm', ridge: 'x', overhang: 1, pitch: 'normal' }, door: null, windowEvery: 2, windowH: 3, noShutters: true, chimney: { x: 8, z: 28 },
    noWindow: (x, _y, z) => x >= 16 && x <= 22 && z === 5, seed: 141 });
  const [f0, f1, f2] = [h.floors[0]! + 1, h.floors[1]! + 1, h.floors[2]! + 1];
  beltCourse(p, l, { x0: 3, z0: 5, x1: 35, z1: 31 }, h.floors[1]!); beltCourse(p, l, { x0: 3, z0: 5, x1: 35, z1: 31 }, h.floors[2]!);
  // Observatory tower x 16..22, z 1..7 in front of the main range, entrance and a copper dome.
  const T: Rect = { x0: 16, z0: 1, x1: 22, z1: 7 }, top = h.roofTop + 3;
  for (let y = 1; y <= top; y++) for (let x = T.x0; x <= T.x1; x++) for (let z = T.z0; z <= T.z1; z++) {
    const edge = x === T.x0 || x === T.x1 || z === T.z0 || z === T.z1;
    if (z >= M.z0 && y <= h.ceiling && !(z === T.z1 && x > T.x0 && x < T.x1)) continue;
    if (edge) put(p, x, y, z, (x === T.x0 || x === T.x1) && (z === T.z0 || z === T.z1) ? 'polished_andesite' : pick(l.wall, x, y, z, 142)); else p.air(x, y, z);
  }
  for (let y = 1; y <= 3; y++) { p.air(19, y, T.z0); for (const z of [M.z0, T.z1]) p.air(19, y, z); }
  door(p, 19, 1, T.z0, 'dark_oak', 'north'); put(p, 19, 3, T.z0, 'stone_brick_stairs', stairs('north', 'top'));
  for (const x of [17, 21]) putFree(p, x, 1, 0, 'lantern', lantern()) && put(p, x, 0, 0, 'polished_andesite');
  for (const y of [h.floors[1]!, h.floors[2]!, h.ceiling + 1, top - 5]) { for (let x = T.x0 + 1; x < T.x1; x++) for (let z = T.z0 + 1; z < T.z1; z++) put(p, x, y, z, 'oak_planks'); }
  for (const y of [h.ceiling + 3, h.ceiling + 4, top - 3, top - 2]) for (const [x, z] of [[19, T.z0], [T.x0, 4], [T.x1, 4]] as const) put(p, x, y, z, 'glass_pane');
  beltCourse(p, l, T, top);
  p.disc(19, 4, top + 1, 3, 'polished_andesite');
  const dt = dome(p, 19, 4, top + 2, 3, CAP, 'oxidized_cut_copper_stairs', 143);
  put(p, 19, dt + 1, 4, 'lightning_rod', { facing: 'up', powered: F, waterlogged: F });
  ladderColumn(p, 17, 3, f0, top - 5);
  p.set(20, top - 4, 5, 'cartography_table'); p.set(21, top - 4, 3, 'lectern', lectern('west')); hangLantern(p, l, 19, top, 4);
  // Great hall in the main range: tiered benches facing a lectern in the east.
  for (let x = 13; x <= 25; x++) for (let z = 7; z <= 11; z++) {
    const tier = Math.max(0, Math.floor((25 - x) / 3) - 1);
    for (let y = f0; y < f0 + tier; y++) put(p, x, y, z, 'oak_planks');
    if ((25 - x) % 3 === 0 && x < 25) chair(p, x, f0 + tier, z, 'dark_oak', 'west');
  }
  p.set(27, f0, 9, 'lectern', lectern('west'));   for (let z = 7; z <= 11; z++) put(p, 30, f0 + 1, z, 'smooth_stone');
  for (const x of [14, 20, 26]) hangLantern(p, l, x, f1 - 2, 9);
  // West wing: library with shelf rows and reading tables.
  for (let z = 16; z <= 28; z += 3) for (let x = 4; x <= 8; x++) { p.set(x, f0, z, 'bookshelf'); p.set(x, f0 + 1, z, 'bookshelf'); p.set(x, f0 + 2, z, 'bookshelf'); }
  for (const z of [17, 23]) { longTable(p, 4, z + 1, 8, z + 1, f0, 'dark_oak_slab'); }
  p.set(10, f0, 22, 'lectern', lectern('west')); p.set(10, f0, 26, 'enchanting_table');
  for (const z of [18, 24, 29]) hangLantern(p, l, 9, f1 - 2, z);
  // East wing: laboratory with brewing stands, cauldrons and furnaces.
  for (let z = 16; z <= 28; z += 3) { p.set(34, f0, z, 'brewing_stand', { has_bottle_0: F, has_bottle_1: F, has_bottle_2: F }); p.set(34, f0, z + 1, 'cauldron'); }
  longTable(p, 30, 17, 30, 27, f0, 'polished_andesite_slab');
  for (const z of [16, 22, 28]) p.set(28, f0, z, 'blast_furnace', furnace('east'));
  for (const z of [18, 24, 29]) hangLantern(p, l, 31, f1 - 2, z);
  // Upper floors: study rooms with beds and desks; reading room on the top floor of the main range.
  for (const [x0, f] of [[5, f1], [29, f1], [5, f2], [29, f2]] as const) for (let z = 16; z <= 28; z += 4) { bed(p, x0, f, z, 'blue', 'west'); table(p, x0 + 4, f, z + 1, 'oak'); chair(p, x0 + 3, f, z + 1, 'oak', 'west'); }
  for (let x = 13; x <= 25; x += 3) { table(p, x, f1, 9, 'dark_oak'); chair(p, x, f1, 10, 'dark_oak', 'south'); }
  for (let x = 13; x <= 25; x += 2) { p.set(x, f2, 6, 'bookshelf'); p.set(x, f2, 12, 'bookshelf'); }
  rug(p, 14, 8, 24, 10, f2, 'green', 'lime');
  for (const [x, z, f] of [[7, 22, f1], [31, 22, f1], [7, 22, f2], [31, 22, f2], [19, 9, f2]] as const) hangLantern(p, l, x, f === f1 ? f2 - 2 : h.ceiling - 1, z);
  for (const [x, z] of [[10, 14], [28, 14]] as const) ladderColumn(p, x, z, f0, h.floors[2]!);
  // Doors from the quad into the wings and the hall.
  for (const [x, z] of [[11, 20], [27, 20], [19, 13]] as const) door(p, x, f0, z, 'dark_oak', x === 11 ? 'west' : x === 27 ? 'east' : 'north');
  // Quad: lawn with cross paths, trees, benches and a column with a lantern.
  for (let x = 12; x <= 26; x++) for (let z = 14; z <= 33; z++) {
    const path = x === 19 || z === 20;
    put(p, x, 0, z, path ? 'gravel' : 'grass_block', path ? {} : grass());
  }
  for (let y = 1; y <= 4; y++) put(p, 19, y, 24, y === 4 ? 'chiseled_stone_bricks' : 'polished_andesite');
  put(p, 19, 5, 24, 'lantern', lantern());
  for (const [x, z] of [[14, 17], [24, 17], [14, 29], [24, 29]] as const) roundTree(p, x, 1, z, 'birch', 4, 2);
  for (const x of [16, 22]) for (const z of [22, 26]) chair(p, x, 1, z, 'dark_oak', x < 19 ? 'west' : 'east');
  for (const x of [12, 26]) lampPost(p, x, 1, 33, 'dark_oak_fence', 3);
  return p.payload();
}

const G = 'bld_gross_';
export const GROSSBAUTEN_SPECS: readonly BuildingSpec[] = [
  { id: `${G}rathaus`, name: 'Großes Rathaus mit Turm', payload: rathaus, tags: ['rathaus', 'turm', 'uhr', 'fachwerk', 'großbau'],
    description: 'Dreigeschossiges Rathaus in U-Form um einen Vorhof: steinerne Bürgerhalle mit langer Tafel, zwei Fachwerkgeschosse mit Ratssaal und Archiv, Seitenflügel mit Kanzlei und Wachstube, davor ein Uhr- und Glockenturm mit Walmhelm.',
    facets: { kategorie: ['oeffentlich'], stil: ['mittelalterlich', 'klassisch'], biom: ['ebene', 'ueberall'], funktion: ['versammlung', 'orientierung', 'bildung'] },
    tips: ['Zuerst den Steinsockel aller drei Flügel bis zur Balkenlage bauen, dann den Turm hochziehen – er gibt die Achse für den Vorhof vor.', 'Die Glocke hängt an der Turmdecke; ein Redstone-Signal daneben lässt sie läuten.'],
    inspiration: [WIKI('Bell', 'Glocke'), WIKI('Lectern', 'Lesepult')] },
  { id: `${G}schloss`, name: 'Schloss mit Innenhof', payload: schloss, tags: ['schloss', 'innenhof', 'kuppel', 'park', 'großbau'],
    description: 'Vierflügelschloss um einen Innenhof mit Brunnen, Hecken und Bäumen: Torhalle, Thronsaal, Bankettafel, Küche, Bibliothek mit Zaubertisch, Gästezimmer und Gemächer im Obergeschoss; vier runde Ecktürme mit Kupferkuppeln.',
    facets: { kategorie: ['wahrzeichen'], stil: ['klassisch', 'mittelalterlich'], biom: ['ebene', 'wald', 'ueberall'], funktion: ['wohnen', 'versammlung', 'verteidigung'] }, gaps: ['minecraft:water'],
    tips: ['Die vier Flügel teilen ein durchgehendes Walmdach; an den Ecken entstehen Kehlen – erst die Flügel, dann die Ecktürme setzen.', 'Kupfer oxidiert mit der Zeit; gewachst (Honigwabe) behält die Kuppel ihre Farbe.'],
    inspiration: [WIKI('Copper_Block', 'Kupferblock'), WIKI('Enchanting_Table', 'Zaubertisch')] },
  { id: `${G}basilika`, name: 'Kuppelbasilika', payload: basilika, tags: ['basilika', 'kuppel', 'säulen', 'portikus', 'großbau'],
    description: 'Kreuzförmige Basilika aus Sandstein mit Säulenportikus und Giebel, Tambour mit Fenstern und Kupferkuppel über der Vierung; innen Säulenreihen, Bänke, Altar, Seitenaltäre und Schachbrettboden aus Marmor.',
    facets: { kategorie: ['sakral'], stil: ['antik', 'klassisch'], biom: ['ebene', 'wueste', 'ueberall'], funktion: ['versammlung', 'orientierung'] },
    tips: ['Die Kuppel ringweise von unten bauen: jeder Ring einen Block kleiner, außen Kupfertreppen als Abschluss.', 'Säulen erst setzen, dann den Portikus mit Quarz abdecken – das Giebeldach liegt darauf.'],
    inspiration: [WIKI('Block_of_Quartz', 'Quarzblock')] },
  { id: `${G}arena`, name: 'Arena', payload: arena, tags: ['arena', 'kolosseum', 'tribüne', 'bögen', 'großbau'],
    description: 'Ovale Arena aus Sandstein: zweigeschossige Bogenmauer mit Zinnen, ansteigende Sitzreihen aus Treppen, vier Tore, Sandfeld mit Podiumsmauer und Bannern, überdachte Ehrenloge auf der Nordseite.',
    facets: { kategorie: ['oeffentlich'], stil: ['antik'], biom: ['ebene', 'wueste', 'savanne', 'ueberall'], funktion: ['unterhaltung', 'versammlung'] },
    tips: ['Die Ellipse lagenweise mit einer Vorlage abstecken; Sitzreihen von innen nach außen jeweils eine Stufe höher.', 'Das Sandfeld liegt auf dem Boden – darunter nichts aushöhlen, sonst rieselt es.'],
    inspiration: [WIKI('Sandstone', 'Sandstein')] },
  { id: `${G}marktplatz`, name: 'Großer Marktplatz', payload: marktplatz, tags: ['markt', 'platz', 'brunnen', 'stände', 'großbau'],
    description: 'Gepflasterter Marktplatz mit rundem Brunnen und Laternensäule, acht Marktständen mit Waren, vier Linden mit Bänken, Laternenpfählen und einem Marktkreuz mit Glocke.',
    facets: { kategorie: ['handel'], stil: ['mittelalterlich', 'rustikal'], biom: ['ebene', 'ueberall'], funktion: ['handel', 'versammlung', 'wasserquelle'] }, gaps: ['minecraft:water'],
    tips: ['Den Pflasterring zuerst vom Brunnen aus abstecken; die Stände stehen auf dem äußeren Ring und lassen die Wege frei.', 'Dorfbewohner nutzen die Arbeitsblöcke in den Ständen als Berufsblock.'],
    inspiration: [WIKI('Villager', 'Dorfbewohner')] },
  { id: `${G}stadttor`, name: 'Stadttor mit Mauer', payload: stadttor, tags: ['stadttor', 'mauer', 'türme', 'fallgitter', 'großbau'],
    description: 'Torhaus mit gewölbter Durchfahrt und Fallgitter, zwei Rundtürme mit Schießscharten und Leitern, Mauerstücke mit Wehrgang und Zinnen, Wachstube und ein Fachwerkgeschoss mit Walmdach.',
    facets: { kategorie: ['befestigung'], stil: ['mittelalterlich'], biom: ['ebene', 'gebirge', 'ueberall'], funktion: ['verteidigung', 'verbindung'] },
    tips: ['Die Mauerstücke enden offen: weitere Mauer mit gleicher Höhe (Wehrgang auf Höhe 8) einfach anbauen.', 'Ein echtes Fallgitter lässt sich mit Kolben und Eisenstangen bauen.'],
    inspiration: [WIKI('Iron_Bars', 'Eisengitter')] },
  { id: `${G}kloster`, name: 'Klosteranlage mit Kreuzgang', payload: kloster, tags: ['kloster', 'kreuzgang', 'kirche', 'glockenturm', 'großbau'],
    description: 'Klosteranlage aus Stein: Kirche mit Glockenturm, drei Flügel um einen Kreuzgang mit Arkaden, Kräutergarten und Brunnen; Kapitelsaal, Bibliothek, Schlafsaal, Krankenstube, Refektorium mit langer Tafel und Küche; Bienenstöcke und Obstbäume.',
    facets: { kategorie: ['sakral'], stil: ['mittelalterlich'], biom: ['ebene', 'wald', 'gebirge', 'ueberall'], funktion: ['wohnen', 'versammlung', 'bildung', 'wasserquelle'] }, gaps: ['minecraft:water'],
    tips: ['Erst die Kirche, dann die drei Flügel; der Kreuzgang entsteht als Innenhof und bekommt zuletzt seine Arkaden.', 'Bienenstöcke neben Blumen im Kreuzgarten bringen Honig für die Küche.'],
    inspiration: [WIKI('Beehive', 'Bienenstock'), WIKI('Bell', 'Glocke')] },
  { id: `${G}universitaet`, name: 'Universität mit Sternwarte', payload: universitaet, tags: ['universität', 'akademie', 'bibliothek', 'sternwarte', 'großbau'],
    description: 'Dreigeschossige Universität aus Backstein in U-Form um einen Hof: Hörsaal mit ansteigenden Bänken, Bibliotheksflügel mit Regalreihen und Zaubertisch, Laborflügel mit Braustand und Hochöfen, Studierzimmer und Lesesaal oben, Sternwarte mit Kupferkuppel über dem Eingang.',
    facets: { kategorie: ['oeffentlich'], stil: ['klassisch', 'mittelalterlich'], biom: ['ebene', 'ueberall'], funktion: ['bildung', 'wohnen', 'orientierung'] },
    tips: ['Der Sternwartenturm gibt die Mittelachse vor; Hof und Flügel spiegeln sich daran.', 'Für volle Verzauberungsstärke braucht der Zaubertisch 15 Bücherregale im Abstand von einem Block – die Regalreihen lassen sich dafür umstellen.'],
    inspiration: [WIKI('Bookshelf', 'Bücherregal'), WIKI('Brewing_Stand', 'Braustand')] },
];
