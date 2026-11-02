import { Plot, axis, barrel, bed, chest, door, facing, furnace, grass, lantern, lectern, rail, slab, stairs, trapdoor, water, campfire, F } from '../plot.js';
import { bell, chair, cupboard, longTable, rug, sofa, table, wallBanner } from '../furnish.js';
import { WIKI } from '../spec.js';
import type { BuildingSpec } from '../spec.js';
import { beltCourse, column, hangLantern, house, ladderUp, LOOKS, lookWith, pick, pitchedRoof, put, putFree } from '../style.js';
import type { Look, Mix } from '../style.js';
import { facade } from '../facade.js';

/**
 * Meisterstücke (LIB-05 Runde 2): neue Gebäude, die von Anfang an mit dem
 * Baukasten aus BAUSTIL.md gezeichnet sind – gemischte Materialien, Relief,
 * Dachüberstände, Vorkragungen – und innen vollständig eingerichtet. Eigene
 * Entwürfe nach den Regeln der untersuchten Vorlagen, keine Nachbauten.
 */

const GILDE: Look = lookWith(LOOKS.fachwerk, { wall: [['calcite', 5], ['white_terracotta', 2], ['diorite', 1]], frame: 'stripped_dark_oak_log', trim: 'dark_oak', shutter: 'spruce', door: 'dark_oak' });
const MUEHLE: Look = lookWith(LOOKS.backstein, { roof: [['dark_oak_planks', 1]], roofStairs: 'dark_oak_stairs', roofSlab: 'dark_oak_slab' });
const KATE: Look = lookWith(LOOKS.nordisch, { base: [['stripped_spruce_wood', 1]], baseStairs: 'spruce_stairs', baseSlab: 'spruce_slab', baseWall: 'spruce_fence',
  wall: [['spruce_planks', 5], ['stripped_spruce_wood', 1], ['birch_planks', 1]], roof: [['deepslate_tiles', 3], ['mossy_cobblestone', 1]] });
const BAHNHOF: Look = lookWith(LOOKS.stein, {
  base: [['stone_bricks', 6], ['polished_andesite', 3], ['andesite', 1]], baseStairs: 'stone_brick_stairs', baseSlab: 'stone_brick_slab', baseWall: 'stone_brick_wall',
  wall: [['bricks', 7], ['granite', 1], ['terracotta', 1]], frame: 'polished_andesite',
  roof: [['deepslate_tiles', 5], ['cracked_deepslate_tiles', 1]], roofStairs: 'deepslate_tile_stairs', roofSlab: 'deepslate_tile_slab', trim: 'dark_oak', door: 'dark_oak',
});
const VILLA: Look = lookWith(LOOKS.stein, {
  base: [['polished_andesite', 4], ['stone_bricks', 3], ['andesite', 1]], baseStairs: 'polished_andesite_stairs', baseSlab: 'polished_andesite_slab', baseWall: 'andesite_wall',
  wall: [['white_terracotta', 5], ['calcite', 2], ['smooth_quartz', 1]], frame: 'quartz_pillar',
  roof: [['deepslate_tiles', 5], ['cracked_deepslate_tiles', 1]], roofStairs: 'deepslate_tile_stairs', roofSlab: 'deepslate_tile_slab', trim: 'dark_oak', shutter: 'dark_oak', door: 'dark_oak', floor: 'dark_oak_planks',
});
const MARKT: Look = lookWith(LOOKS.backstein, { wall: [['bricks', 4], ['calcite', 3], ['terracotta', 1]], frame: 'stripped_spruce_log', trim: 'spruce', roof: [['deepslate_tiles', 4], ['cracked_deepslate_tiles', 1]], roofStairs: 'deepslate_tile_stairs', roofSlab: 'deepslate_tile_slab' });

const ground = (p: Plot, mix: Mix, seed: number, keep?: (x: number, z: number) => boolean): void => {
  for (let x = 0; x < p.size[0]; x++) for (let z = 0; z < p.size[2]; z++) if (!keep || keep(x, z)) { const id = pick(mix, x, 0, z, seed); put(p, x, 0, z, id, id === 'grass_block' ? grass() : {}); }
};
const COBBLE_GROUND: Mix = [['cobblestone', 4], ['andesite', 2], ['gravel', 1], ['mossy_cobblestone', 1]];
const GARDEN: Mix = [['grass_block', 6], ['coarse_dirt', 1], ['podzol', 1]];

// ------------------------------------------------------------ Gildehaus
/** Three storey guild house: stone hall, two jettied timber storeys, cross gables front and back, oriel sign, market stalls. */
function gildehaus() {
  const p = new Plot([19, 2, 17]), l = GILDE;
  ground(p, COBBLE_GROUND, 61);
  const h = house(p, l, { at: { x0: 3, z0: 4, x1: 15, z1: 12 }, storeys: [{ h: 5, kind: 'stein' }, { h: 4, kind: 'fachwerk' }, { h: 4, kind: 'fachwerk' }], jetty: 2,
    jettySides: ['north', 'south'], postEvery: 2, windowEvery: 2, wings: [{ at: { x0: 7, z0: 4, x1: 11, z1: 12 }, ridge: 'z' }],
    roof: { kind: 'sattel', ridge: 'x', overhang: 1, pitch: 'steil' }, flowerBoxes: true, door: { side: 'north', at: 9 }, chimney: { x: 14, z: 10 },
    noWindow: (x, _y, z) => x === 4 && z === 11, seed: 61 });
  const [f0, f1, f2] = [h.floors[0]! + 1, h.floors[1]! + 1, h.floors[2]! + 1];
  // Guild hall: long oak table with chairs, master's lectern, banners, a hearth.
  longTable(p, 6, 8, 12, 8, f0, 'dark_oak_slab');
  for (let x = 6; x <= 12; x++) { chair(p, x, f0, 7, 'spruce', 'north'); chair(p, x, f0, 9, 'spruce', 'south'); }
  p.set(9, f0, 11, 'lectern', lectern('north')); chair(p, 9, f0, 10, 'dark_oak', 'south', true);
  for (const x of [5, 13]) put(p, x, f0 + 2, 11, 'red_wall_banner', wallBanner('north'));
  p.set(14, f0, 7, 'campfire', campfire('west')); p.set(14, f0, 5, 'barrel', barrel('up')); p.set(4, f0, 5, 'chest', chest('east'));
  for (const [x, z] of [[6, 6], [12, 6], [9, 9]] as const) hangLantern(p, l, x, f1 - 3, z);
  // First floor: guild office with ledgers and maps.
  for (let z = 5; z <= 9; z++) put(p, 3, f1, z, 'bookshelf');
  p.set(7, f1, 6, 'cartography_table'); table(p, 10, f1, 7, 'dark_oak'); chair(p, 10, f1, 8, 'dark_oak', 'south'); chair(p, 9, f1, 7, 'dark_oak', 'west');
  p.set(13, f1, 5, 'chest', chest('west')); p.set(13, f1, 6, 'chest', chest('west')); p.set(11, f1, 10, 'lectern', lectern('west'));
  rug(p, 7, 9, 11, 10, f1, 'red', 'orange');
  hangLantern(p, l, 8, f2 - 2, 8);
  // Second floor: wool, cloth and the master's chamber.
  bed(p, 5, f2, 9, 'red', 'south'); p.set(5, f2, 11, 'barrel', barrel('up')); cupboard(p, 7, f2, 11, 'dark_oak', 'north', 2);
  for (const [x, c] of [[11, 'white'], [12, 'red'], [13, 'blue']] as const) { p.set(x, f2, 6, `${c}_wool`); p.set(x, f2 + 1, 6, `${c}_wool`); }
  p.set(13, f2, 9, 'loom', facing('west'));
  hangLantern(p, l, 9, h.ceiling - 1, 8);
  ladderUp(p, 4, 11, f0, f2 - 1, 'north');
  for (const y of [f1 - 1, f2 - 1]) p.air(4, y, 11);
  // Guild sign on a bracket, market stalls on the square.
  put(p, 13, f0 + 3, 2, 'dark_oak_fence'); put(p, 13, f0 + 3, 1, 'dark_oak_fence'); put(p, 13, f0 + 2, 1, 'lantern', lantern(true));
  for (const [x0, cols] of [[1, ['red', 'white']], [14, ['blue', 'white']]] as const) {
    for (const x of [x0, x0 + 3]) { put(p, x, 1, 0, 'spruce_fence'); put(p, x, 2, 0, 'spruce_fence'); }
    for (let x = x0; x <= x0 + 3; x++) { put(p, x, 3, 0, `${cols[x % 2]}_wool`); put(p, x, 3, 1, `${cols[(x + 1) % 2]}_wool`); }
    put(p, x0 + 1, 1, 0, 'barrel', barrel('up')); put(p, x0 + 2, 1, 0, 'spruce_slab', slab('top'));
    put(p, x0 + 1, 2, 0, 'pumpkin'); put(p, x0 + 2, 2, 0, 'melon');
  }
  return p.payload();
}

// ------------------------------------------------------------ Wassermühle
/** Water mill on a stream: brick and timber mill house, undershot wheel on an oak axle, millstones, the miller's room under the roof. */
function wassermuehle() {
  const p = new Plot([20, 2, 17]), l = MUEHLE;
  // Bank, stream (z 11–14) and far bank.
  ground(p, GARDEN, 71, (_x, z) => z <= 10 || z >= 15);
  for (let x = 0; x < 20; x++) { for (let z = 11; z <= 14; z++) { put(p, x, 0, z, 'water', water()); } put(p, x, 0, 10, pick([['stone_bricks', 3], ['mossy_stone_bricks', 2], ['cobblestone', 1]], x, 0, 10, 7)); put(p, x, 0, 15, pick([['mossy_cobblestone', 2], ['cobblestone', 1]], x, 0, 15, 8)); }
  const h = house(p, l, { at: { x0: 3, z0: 2, x1: 13, z1: 9 }, storeys: [{ h: 5, kind: 'stein' }, { h: 4, kind: 'fachwerk' }], jetty: 1, jettySides: ['north'],
    roof: { kind: 'krueppelwalm', ridge: 'x', overhang: 1, pitch: 'steil' }, door: { side: 'north', at: 6 }, chimney: { x: 4, z: 3 }, windowEvery: 3,
    noWindow: (x, _y, z) => z === 9 && x >= 7 && x <= 9, seed: 71 });
  const [f0, f1] = [h.floors[0]! + 1, h.floors[1]! + 1];
  // Wheel: rim of radius 4 around (8, 4, 12), eight spokes, paddles; the axle runs into the mill.
  const cx = 8, cy = 4, cz = 12;
  for (let dx = -5; dx <= 5; dx++) for (let dy = -5; dy <= 5; dy++) {
    const r = Math.sqrt(dx * dx + dy * dy), y = cy + dy, x = cx + dx;
    if (y < 0) continue;
    if (r > 3.5 && r < 4.5) { put(p, x, y, cz, 'spruce_planks'); put(p, x, y, cz + 1, 'spruce_planks'); }
    else if (r >= 4.5 && r < 5.3 && (Math.abs(dx) === 0 || Math.abs(dy) === 0 || Math.abs(dx) === Math.abs(dy))) { put(p, x, y, cz, 'spruce_trapdoor', trapdoor('north', 'bottom', true)); }
    else if (r > 0.5 && r <= 3.5 && (dx === 0 || dy === 0)) put(p, x, y, cz, 'stripped_spruce_log', axis(dx === 0 ? 'y' : 'x'));
    else if (r > 0.5 && r <= 3.5 && Math.abs(dx) === Math.abs(dy)) put(p, x, y, cz, 'spruce_fence');
  }
  for (let z = 9; z <= 14; z++) put(p, cx, cy, z, 'stripped_oak_log', axis('z'));
  for (const z of [11, 14]) { put(p, cx - 1, 1, z, 'stone_bricks'); put(p, cx - 1, 2, z, 'stone_bricks'); put(p, cx - 1, 3, z, 'stone_brick_stairs', stairs('east', 'top')); }
  // Mill room: millstones, grain store, sacks.
  p.set(8, f0, 8, 'grindstone', { face: 'floor', facing: 'north' }); p.set(8, f0 + 1, 8, 'smooth_stone_slab', slab());
  p.set(10, f0, 7, 'stonecutter', facing('north')); p.set(11, f0, 8, 'composter');
  for (const [x, z] of [[4, 6], [4, 7], [4, 8], [5, 8]] as const) { p.set(x, f0, z, 'hay_block', axis('y')); }
  p.set(4, f0 + 1, 7, 'hay_block', axis('y'));
  for (const x of [11, 12]) { p.set(x, f0, 3, 'barrel', barrel('up')); p.set(x, f0 + 1, 3, 'barrel', barrel('up')); }
  p.set(12, f0, 5, 'chest', chest('west')); p.set(7, f0, 3, 'crafting_table');
  hangLantern(p, l, 7, f1 - 2, 5); hangLantern(p, l, 11, f1 - 2, 6);
  // Miller's room.
  bed(p, 11, f1, 7, 'brown', 'south'); p.set(12, f1, 5, 'chest', chest('west')); table(p, 6, f1, 6, 'spruce'); chair(p, 5, f1, 6, 'spruce', 'west');
  for (const [x, c] of [[8, 'white'], [9, 'brown'], [10, 'white']] as const) p.set(x, f1, 3, `${c}_wool`);
  hangLantern(p, l, 8, h.ceiling - 1, 6);
  ladderUp(p, 12, 8, f0, f1 - 1, 'north'); p.air(12, f1 - 1, 8);
  // Footbridge over the stream, sacks on the cart.
  for (let z = 10; z <= 15; z++) for (const x of [16, 17]) put(p, x, 1, z, 'spruce_slab', slab());
  for (let z = 10; z <= 15; z++) { putFree(p, 15, 2, z, 'spruce_fence'); putFree(p, 18, 2, z, 'spruce_fence'); }
  for (const z of [10, 15]) for (const x of [15, 18]) put(p, x, 1, z, 'stripped_spruce_log', axis('y'));
  put(p, 15, 3, 10, 'lantern', lantern()); put(p, 18, 3, 15, 'lantern', lantern());
  put(p, 15, 1, 3, 'barrel', barrel('up')); put(p, 16, 1, 3, 'hay_block', axis('y')); put(p, 15, 1, 4, 'white_wool');
  return p.payload();
}

// ------------------------------------------------------------ Markthalle
/** Market hall: open stone arcade on columns, a timber hall above under a steep roof, stalls between the columns. */
function markthalle() {
  const p = new Plot([21, 2, 15]), l = MARKT;
  ground(p, COBBLE_GROUND, 81);
  const xs = [2, 6, 10, 14, 18], zs = [2, 7, 12];
  for (const x of xs) for (const z of zs) if (z !== 7 || (x !== 2 && x !== 18)) column(p, x, z, 1, 5, 'stripped_spruce_log', 'stone_bricks', 'stone_brick_stairs');
  for (const z of [7]) for (const x of [2, 18]) column(p, x, z, 1, 5, 'stripped_spruce_log', 'stone_bricks', 'stone_brick_stairs');
  // Arches between the columns: upside-down stairs at the top of each bay.
  for (const z of [2, 12]) for (let x = 3; x <= 17; x++) if (!xs.includes(x)) { const k = (x - 2) % 4; if (k === 1) put(p, x, 5, z, 'stone_brick_stairs', stairs('west', 'top')); if (k === 3) put(p, x, 5, z, 'stone_brick_stairs', stairs('east', 'top')); }
  const h = house(p, l, { at: { x0: 2, z0: 2, x1: 18, z1: 12 }, y0: 6, storeys: [{ h: 4, kind: 'fachwerk' }], postEvery: 4, windowEvery: 2,
    roof: { kind: 'sattel', ridge: 'x', overhang: 1, pitch: 'steil' }, door: null, flowerBoxes: false,
    wings: [{ at: { x0: 8, z0: 2, x1: 12, z1: 12 }, ridge: 'z' }], noWindow: (x, _y, z) => x === 10 && z === 12, seed: 81 });
  const f1 = h.floors[0]! + 1;
  // Stalls on the ground: fruit, fish, cloth, tools.
  const stall = (x: number, z: number, goods: readonly string[], cloth: string) => {
    for (let i = 0; i < 3; i++) { put(p, x + i, 1, z, 'spruce_slab', slab('top')); if (goods[i]) putFree(p, x + i, 2, z, goods[i]!); }
    put(p, x, 1, z + 1, 'barrel', barrel('up')); put(p, x + 2, 1, z + 1, 'chest', chest('south'));
    putFree(p, x + 1, 1, z + 1, `${cloth}_carpet`);
  };
  stall(3, 4, ['melon', 'pumpkin', 'hay_block'], 'green'); stall(11, 4, ['barrel', 'cauldron', 'barrel'], 'blue');
  stall(3, 9, ['white_wool', 'red_wool', 'yellow_wool'], 'red'); stall(15, 9, ['anvil', 'grindstone', 'smithing_table'], 'gray');
  // Fix states of stall goods that need them.
  p.set(11, 2, 4, 'barrel', barrel('up')); p.set(13, 2, 4, 'barrel', barrel('up')); p.set(15, 2, 9, 'anvil', facing('north'));
  p.set(16, 2, 9, 'grindstone', { face: 'floor', facing: 'north' }); p.set(5, 2, 4, 'hay_block', axis('y'));
  for (const [x, z] of [[4, 7], [8, 7], [12, 7], [16, 7]] as const) hangLantern(p, l, x, 4, z);
  // Well in the middle, stair to the hall.
  for (const [x, z] of [[9, 9], [10, 9], [11, 9], [9, 10], [11, 10]] as const) put(p, x, 1, z, 'stone_bricks');
  put(p, 10, 0, 10, 'water', water()); put(p, 10, 1, 10, 'water', water()); put(p, 10, 1, 11, 'stone_bricks'); put(p, 9, 1, 11, 'stone_bricks'); put(p, 11, 1, 11, 'stone_bricks');
  ladderUp(p, 10, 11, 1, 6, 'north'); p.air(10, 6, 11);
  // Hall above: council table, scales, storage.
  longTable(p, 5, 7, 15, 7, f1, 'spruce_slab');
  for (let x = 5; x <= 15; x += 2) { chair(p, x, f1, 6, 'spruce', 'north'); chair(p, x, f1, 8, 'spruce', 'south'); }
  for (const x of [3, 4]) { p.set(x, f1, 3, 'barrel', barrel('up')); p.set(x, f1, 11, 'chest', chest('east')); }
  p.set(17, f1, 7, 'lectern', lectern('west'));
  for (const x of [6, 14]) hangLantern(p, l, x, h.ceiling - 1, 7);
  // Bell above the gable.
  let by = h.roofTop; while (by > 0 && !(p.get(10, by, 2) && p.get(10, by, 2)!.id !== 'minecraft:air')) by--;
  put(p, 10, by + 1, 2, 'stone_bricks'); put(p, 10, by + 2, 2, 'bell', bell('north', 'floor'));
  return p.payload();
}

// ------------------------------------------------------------ Bahnhof
/** Small town station: brick hall with stone trim, clock tower, platform roof on iron columns, track along the platform. */
function bahnhof() {
  const p = new Plot([25, 2, 17]), l = BAHNHOF;
  ground(p, [['smooth_stone', 4], ['polished_andesite', 2], ['stone', 1]], 91, (_x, z) => z <= 11);
  for (let x = 0; x < 25; x++) { for (let z = 12; z <= 16; z++) put(p, x, 0, z, pick([['gravel', 5], ['andesite', 1]], x, 0, z, 9)); put(p, x, 1, 14, 'rail', rail('east_west')); }
  for (let x = 0; x < 25; x += 2) put(p, x, 0, 14, 'stripped_spruce_log', axis('z'));
  const at = { x0: 2, z0: 2, x1: 16, z1: 9 };
  const h = house(p, l, { at, storeys: [{ h: 5, kind: 'stein' }, { h: 4, kind: 'wand' }], windowEvery: 2, windowH: 3,
    roof: { kind: 'walm', ridge: 'x', overhang: 1 }, door: { side: 'north', at: 9 }, noShutters: true, seed: 91,
    noWindow: (x, _y, z) => x === 15 && z === 8 });
  beltCourse(p, l, at, h.floors[1]!);
  facade(p, { pilaster: 'stone_bricks', band: 'stone_brick_stairs', bandSlab: 'stone_brick_slab', plinth: 'stone_brick_stairs' }, { at, y0: 1, y1: h.floors[1]! - 1, crown: null, pilasters: 'corners', sills: false, plinth: true });
  const [f0, f1] = [h.floors[0]! + 1, h.floors[1]! + 1];
  // Clock tower at the east end.
  const T = { x0: 17, z0: 3, x1: 21, z1: 7 }, tTop = 16;
  for (let y = 0; y <= tTop; y++) for (let x = T.x0; x <= T.x1; x++) for (let z = T.z0; z <= T.z1; z++) {
    const ring = x === T.x0 || x === T.x1 || z === T.z0 || z === T.z1, corner = (x === T.x0 || x === T.x1) && (z === T.z0 || z === T.z1);
    if (y === 0) { put(p, x, y, z, pick(l.base, x, y, z, 9)); continue; }
    if (!ring) { if (y === 6 || y === 11) put(p, x, y, z, 'spruce_planks'); else p.air(x, y, z); continue; }
    put(p, x, y, z, corner ? 'polished_andesite' : y <= 2 ? pick(l.base, x, y, z, 9) : pick(l.wall, x, y, z, 9));
  }
  beltCourse(p, l, T, 6); beltCourse(p, l, T, 11);
  for (const [x, z, f] of [[19, 2, 'north'], [22, 5, 'east'], [19, 8, 'south']] as const) {
    // Clock face: dark disc with golden hands, framed by quartz.
    const [ax, az] = f === 'east' ? [0, 1] : [1, 0], [ox, oz] = f === 'north' ? [0, 1] : f === 'south' ? [0, -1] : [-1, 0];
    const wx = x + ox, wz = z + oz;
    for (const d of [-1, 0, 1]) for (const yy of [12, 13, 14]) put(p, wx + ax * d, yy, wz + az * d, d === 0 && yy === 13 ? 'gold_block' : 'black_concrete');
    put(p, wx, 14, wz, 'gold_block'); put(p, wx + ax, 13, wz + az, 'gold_block');
    for (const d of [-2, 2]) for (const yy of [12, 13, 14]) put(p, wx + ax * d, yy, wz + az * d, 'smooth_quartz');
  }
  pitchedRoof(p, l, { walls: T, y: tTop + 1, kind: 'walm', ridge: 'x', overhang: 1, pitch: 'steil', seed: 9 });
  door(p, 17, 1, 5, 'dark_oak', 'east'); p.air(16, 1, 5); p.air(16, 2, 5);
  ladderUp(p, 21, 6, 1, 15, 'west'); for (const y of [6, 11]) p.air(20, y, 6);
  put(p, 19, 15, 5, 'bell', bell('north', 'ceiling')); put(p, 19, 16, 5, 'spruce_planks');
  // Waiting hall and ticket counter.
  for (let x = 4; x <= 8; x++) chair(p, x, f0, 4, 'dark_oak', 'north');
  for (let x = 4; x <= 8; x++) chair(p, x, f0, 7, 'dark_oak', 'south');
  for (let z = 3; z <= 8; z++) if (z !== 6) put(p, 12, f0, z, 'dark_oak_slab', slab('top'));
  chair(p, 14, f0, 4, 'spruce', 'east'); p.set(14, f0, 7, 'chest', chest('west')); p.set(15, f0, 3, 'barrel', barrel('up'));
  door(p, 9, f0, 9, 'dark_oak', 'north'); p.set(9, f0 + 2, 9, 'dark_oak_stairs', stairs('north', 'top'));
  for (const x of [5, 9, 13]) hangLantern(p, l, x, f1 - 3, 6);
  // Stationmaster's flat upstairs.
  bed(p, 4, f1, 7, 'blue', 'south'); p.set(3, f1, 8, 'barrel', barrel('up')); table(p, 9, f1, 5, 'dark_oak'); chair(p, 9, f1, 6, 'dark_oak', 'south');
  sofa(p, 12, f1, 3, 'dark_oak', 'north', 2); p.set(14, f1, 3, 'bookshelf'); hangLantern(p, l, 9, h.ceiling - 1, 6);
  ladderUp(p, 15, 7, f0, f1 - 1, 'north'); p.air(15, f1 - 1, 7);
  // Platform roof on iron columns with a dark tiled canopy.
  for (let x = 1; x <= 23; x++) for (let z = 10; z <= 12; z++) put(p, x, 1, z, 'smooth_stone_slab', slab('top'));
  for (let x = 1; x <= 23; x++) put(p, x, 1, 13, 'polished_andesite_slab', slab('top'));
  for (const x of [3, 9, 15, 21]) { for (let y = 2; y <= 4; y++) put(p, x, y, 12, 'iron_bars'); put(p, x, 5, 12, 'polished_andesite'); }
  for (let x = 1; x <= 23; x++) { put(p, x, 5, 10, 'deepslate_tile_slab', slab('top')); put(p, x, 5, 11, 'deepslate_tile_slab', slab('top')); put(p, x, 6, 12, 'deepslate_tile_stairs', stairs('north')); putFree(p, x, 5, 12, 'deepslate_tile_slab', slab('top')); putFree(p, x, 5, 13, 'deepslate_tile_stairs', stairs('north', 'top')); }
  for (const x of [6, 12, 18]) { chair(p, x, 2, 11, 'dark_oak', 'north'); chair(p, x + 1, 2, 11, 'dark_oak', 'north'); }
  for (const x of [5, 13, 20]) { put(p, x, 5, 11, 'polished_andesite'); hangLantern(p, l, x, 4, 11); }
  put(p, 0, 1, 11, 'stone_brick_wall'); put(p, 0, 2, 11, 'stone_brick_wall'); put(p, 0, 3, 11, 'lantern', lantern());
  // Forecourt: lamps and a bench.
  for (const x of [5, 13]) { put(p, x, 1, 0, 'stone_brick_wall'); put(p, x, 2, 0, 'stone_brick_wall'); put(p, x, 3, 0, 'lantern', lantern()); }
  return p.payload();
}

// ------------------------------------------------------------ Fischerkate
/** Fisher's cottage on stilts over the beach: log house with a mossy slate roof, deck to the water, drying racks and a jetty. */
function fischerkate() {
  const p = new Plot([16, 2, 19]), l = KATE;
  for (let x = 0; x < 16; x++) for (let z = 0; z < 19; z++) {
    if (z >= 12) put(p, x, 0, z, 'water', water());
    else { const id = pick(z <= 2 ? [['grass_block', 3], ['sand', 1]] : [['sand', 6], ['gravel', 1]], x, 0, z, 3); put(p, x, 0, z, id, id === 'grass_block' ? grass() : {}); }
  }
  const at = { x0: 3, z0: 3, x1: 11, z1: 9 }, y0 = 3;
  // Stilts and cross bracing.
  for (const x of [3, 7, 11]) for (const z of [3, 9]) for (let y = 1; y < y0; y++) put(p, x, y, z, 'stripped_spruce_log', axis('y'));
  const h = house(p, l, { at, y0, storeys: [{ h: 4, kind: 'wand' }], roof: { kind: 'krueppelwalm', ridge: 'x', overhang: 1, pitch: 'steil' },
    door: { side: 'south', at: 6 }, chimney: { x: 10, z: 5 }, flowerBoxes: false, windowEvery: 3, postEvery: 4, seed: 33 });
  const f0 = h.floors[0]! + 1;
  // Deck to the water and a jetty.
  for (let x = 3; x <= 11; x++) for (let z = 10; z <= 12; z++) put(p, x, y0, z, 'spruce_planks');
  for (let x = 2; x <= 12; x++) putFree(p, x, y0 + 1, 13, 'spruce_fence');
  for (let z = 10; z <= 12; z++) { putFree(p, 2, y0 + 1, z, 'spruce_fence'); putFree(p, 12, y0 + 1, z, 'spruce_fence'); }
  p.air(7, y0 + 1, 13);
  for (const x of [3, 11]) for (const z of [12]) for (let y = 1; y < y0; y++) put(p, x, y, z, 'stripped_spruce_log', axis('y'));
  for (let z = 13; z <= 18; z++) for (const x of [6, 7, 8]) put(p, x, y0 - 1, z, 'spruce_slab', slab('top'));
  for (const z of [15, 18]) for (const x of [5, 9]) for (let y = 1; y <= y0; y++) put(p, x, y, z, 'stripped_spruce_log', axis('y'));
  for (const x of [5, 9]) put(p, x, y0 + 1, 18, 'lantern', lantern());
  put(p, 7, y0, 13, 'spruce_stairs', stairs('south')); p.air(7, y0 + 1, 13);
  // Ladder up from the beach.
  for (let y = 1; y < y0; y++) put(p, 3, y, 6, 'stripped_spruce_log', axis('y'));
  for (let y = 1; y <= y0; y++) put(p, 2, y, 6, 'ladder', { facing: 'west', waterlogged: F });
  // Drying racks with nets (cobwebs) on the beach, a boat stand.
  for (const x of [13, 15]) for (let y = 1; y <= 3; y++) put(p, x, y, 4, 'spruce_fence');
  for (let x = 13; x <= 15; x++) put(p, x, 4, 4, 'spruce_slab', slab());
  put(p, 14, 2, 4, 'cobweb'); put(p, 14, 3, 4, 'cobweb');
  put(p, 13, 1, 8, 'barrel', barrel('up')); put(p, 14, 1, 8, 'barrel', barrel('up')); put(p, 13, 2, 8, 'barrel', barrel('up'));
  put(p, 1, 1, 9, 'composter'); put(p, 0, 1, 1, 'oak_sapling', { stage: '0' });
  // Inside: bed, smoker, fish barrels, fishing gear.
  bed(p, 4, f0, 4, 'cyan', 'north'); p.set(5, f0, 4, 'chest', chest('south'));
  p.set(10, f0, 7, 'smoker', furnace('west')); p.set(10, f0, 8, 'barrel', barrel('west')); p.set(9, f0, 8, 'crafting_table');
  table(p, 6, f0, 5, 'spruce'); chair(p, 7, f0, 5, 'spruce', 'east'); rug(p, 5, 6, 7, 7, f0, 'cyan');
  hangLantern(p, l, 7, h.ceiling - 1, 6);
  return p.payload();
}

// ------------------------------------------------------------ Alchemistenturm
/** Crooked alchemist's tower: round stone tower with oriels on brackets, a purple-tiled cone, laboratory floors. */
function alchemistenturm() {
  const p = new Plot([15, 2, 15]), cx = 7, cz = 7, r = 4;
  const STONE: Mix = [['stone_bricks', 5], ['mossy_stone_bricks', 2], ['cracked_stone_bricks', 1], ['tuff_bricks', 2]];
  ground(p, [['grass_block', 5], ['moss_block', 1], ['coarse_dirt', 1]], 13);
  p.disc(cx, cz, 0, r + 1, 'cobblestone');
  for (let y = 1; y <= 18; y++) for (let x = cx - r; x <= cx + r; x++) for (let z = cz - r; z <= cz + r; z++) {
    const q = (x - cx) ** 2 + (z - cz) ** 2, R = r * r + r * 0.8, inner = (r - 1) ** 2 + (r - 1) * 0.8;
    if (q > R) continue;
    if (q > inner) put(p, x, y, z, pick(STONE, x, y, z, 13)); else if ([6, 12].includes(y)) put(p, x, y, z, 'dark_oak_planks'); else p.air(x, y, z);
  }
  // Plinth skirt and belt courses.
  for (const y of [1, 6, 12]) for (let x = cx - r - 1; x <= cx + r + 1; x++) for (let z = cz - r - 1; z <= cz + r + 1; z++) {
    const dx = x - cx, dz = z - cz, q = dx * dx + dz * dz;
    if (q <= r * r + r * 0.8 || q > (r + 1) ** 2 + (r + 1) * 0.8) continue;
    const out = Math.abs(dx) >= Math.abs(dz) ? (dx > 0 ? 'east' : 'west') : (dz > 0 ? 'south' : 'north');
    const inward = out === 'east' ? 'west' : out === 'west' ? 'east' : out === 'north' ? 'south' : 'north';
    putFree(p, x, y, z, 'stone_brick_stairs', stairs(inward, y === 1 ? 'bottom' : 'top'));
  }
  // Windows with lintels on three floors.
  for (const [x, z, f] of [[cx, cz - r, 'south'], [cx + r, cz, 'west'], [cx - r, cz, 'east']] as const) for (const y of [3, 8, 14]) { put(p, x, y, z, 'purple_stained_glass_pane'); put(p, x, y + 1, z, 'purple_stained_glass_pane'); put(p, x, y + 2, z, 'stone_brick_stairs', stairs(f, 'top')); }
  door(p, cx, 1, cz + r, 'dark_oak', 'north'); put(p, cx, 3, cz + r, 'stone_brick_stairs', stairs('north', 'top'));
  // Oriel on brackets (south-east), half-timbered with its own little roof.
  const ox0 = cx + 2, oz0 = cz + 4;
  for (let x = ox0; x <= ox0 + 2; x++) { put(p, x, 8, oz0 + 1, 'dark_oak_stairs', stairs('north', 'top')); put(p, x, 9, oz0 + 1, 'dark_oak_planks'); }
  for (let x = ox0; x <= ox0 + 2; x++) for (const y of [10, 11]) put(p, x, y, oz0 + 1, x === ox0 + 1 ? 'purple_stained_glass_pane' : 'stripped_dark_oak_log', x === ox0 + 1 ? {} : axis('y'));
  for (let x = ox0 - 1; x <= ox0 + 3; x++) { putFree(p, x, 12, oz0 + 2, 'deepslate_tile_stairs', stairs('north')); putFree(p, x, 12, oz0 + 1, 'deepslate_tile_slab', slab('top')); }
  for (let x = ox0; x <= ox0 + 2; x++) for (const y of [9, 10, 11]) if (p.get(x, y, oz0)?.id.includes('brick')) p.air(x, y, oz0);
  // Cone roof: shrinking rings of purple tiles with an upturned rim.
  for (let k = 0; k <= 8; k++) {
    const rr = r + 1 - k * 0.65, y = 19 + k;
    if (rr < 0.6) { put(p, cx, y, cz, 'purple_terracotta'); put(p, cx, y + 1, cz, 'end_rod', facing('up')); break; }
    for (let x = Math.floor(cx - rr - 1); x <= Math.ceil(cx + rr + 1); x++) for (let z = Math.floor(cz - rr - 1); z <= Math.ceil(cz + rr + 1); z++) {
      const q = (x - cx) ** 2 + (z - cz) ** 2, R = rr * rr + rr * 0.8;
      if (q > R) continue;
      const rim = q > (rr - 1) ** 2 + (rr - 1) * 0.8;
      if (!rim) { if (k > 0) continue; p.air(x, y, z); continue; }
      const dx = x - cx, dz = z - cz;
      const up = Math.abs(dx) >= Math.abs(dz) ? (dx > 0 ? 'west' : 'east') : (dz > 0 ? 'north' : 'south');
      put(p, x, y, z, k === 0 ? 'deepslate_tile_stairs' : (x + y + z) % 3 === 0 ? 'purple_terracotta' : 'magenta_terracotta', k === 0 ? stairs(up) : {});
    }
  }
  // Laboratory: cauldrons, brewing stands, shelves; library; observatory.
  p.set(cx - 2, 1, cz - 1, 'cauldron'); p.set(cx - 2, 1, cz + 1, 'cauldron'); p.set(cx + 2, 1, cz - 2, 'smooth_stone_slab', slab('top'));
  p.set(cx + 2, 2, cz - 2, 'brewing_stand', { has_bottle_0: 'true', has_bottle_1: F, has_bottle_2: 'true' }); p.set(cx + 2, 1, cz, 'barrel', barrel('up'));
  p.set(cx, 1, cz - 2, 'campfire', campfire('south'));
  for (const [x, z] of [[cx - 3, cz], [cx - 3, cz - 1], [cx - 3, cz + 1]] as const) { put(p, x, 7, z, 'bookshelf'); put(p, x, 8, z, 'bookshelf'); }
  p.set(cx, 7, cz, 'enchanting_table'); p.set(cx + 2, 7, cz + 1, 'lectern', lectern('west'));
  for (const [x, z] of [[cx + 3, cz - 1], [cx + 3, cz + 1]] as const) put(p, x, 13, z, 'chest', chest('west'));
  p.set(cx, 13, cz, 'cartography_table'); p.set(cx - 1, 13, cz + 2, 'amethyst_cluster', { facing: 'up', waterlogged: F });
  for (const y of [5, 11, 17]) hangLantern(p, null, cx, y, cz + 1);
  ladderUp(p, cx - 2, cz - 2, 1, 13, 'south'); for (const y of [6, 12]) p.air(cx - 2, y, cz - 2);
  // Herb garden.
  for (const [x, z, id] of [[1, 1, 'allium'], [2, 1, 'azure_bluet'], [1, 2, 'lily_of_the_valley'], [13, 13, 'red_mushroom'], [12, 13, 'brown_mushroom'], [13, 1, 'cornflower']] as const) {
    put(p, x, 0, z, x > 10 && z > 10 ? 'podzol' : 'grass_block', x > 10 && z > 10 ? { snowy: F } : grass()); put(p, x, 1, z, id);
  }
  return p.payload();
}

// ------------------------------------------------------------ Stadtvilla
/** Town villa: two storeys on a stone plinth, corner tower wing, veranda on columns, balcony, hipped slate roof, furnished salon. */
function stadtvilla() {
  const p = new Plot([19, 2, 18]), l = VILLA;
  ground(p, GARDEN, 51);
  const at = { x0: 3, z0: 4, x1: 13, z1: 13 };
  const h = house(p, l, { at, storeys: [{ h: 5, kind: 'wand' }, { h: 4, kind: 'wand' }], windowEvery: 2, windowH: 3, plinth: 1,
    wings: [{ at: { x0: 11, z0: 2, x1: 16, z1: 7 }, ridge: 'z', kind: 'walm' }],
    roof: { kind: 'walm', ridge: 'x', overhang: 1, pitch: 'steil' }, door: { side: 'north', at: 7 }, chimney: { x: 4, z: 11 }, seed: 51,
    noWindow: (x, _y, z) => x === 12 && z === 12 });
  beltCourse(p, l, at, h.floors[1]!);
  facade(p, { pilaster: 'quartz_pillar', band: 'polished_andesite_stairs', bandSlab: 'polished_andesite_slab', plinth: 'polished_andesite_stairs' },
    { at, y0: 1, y1: h.floors[1]! - 1, crown: null, pilasters: 'corners', sills: true, plinth: true, sides: ['west', 'south'] });
  const [f0, f1] = [h.floors[0]! + 1, h.floors[1]! + 1];
  // Veranda on quartz columns with a balcony above.
  for (const x of [5, 9]) column(p, x, 1, 1, 5, 'quartz_pillar', 'smooth_quartz', 'quartz_stairs');
  for (let x = 4; x <= 10; x++) for (let z = 1; z <= 3; z++) put(p, x, 6, z, 'smooth_quartz_slab', slab('top'));
  for (let x = 4; x <= 10; x++) put(p, x, 7, 1, 'dark_oak_fence');
  for (const x of [4, 10]) for (const z of [2, 3]) put(p, x, 7, z, 'dark_oak_fence');
  for (let x = 5; x <= 9; x++) put(p, x, 0, 2, 'polished_andesite');
  for (let x = 6; x <= 8; x++) put(p, x, 0, 0, 'polished_andesite_stairs', stairs('south'));
  p.set(7, f1, 4, 'dark_oak_door', { facing: 'north', half: 'lower', hinge: 'left', open: F, powered: F }); p.set(7, f1 + 1, 4, 'dark_oak_door', { facing: 'north', half: 'upper', hinge: 'left', open: F, powered: F });
  // Salon, dining room, kitchen.
  sofa(p, 4, f0, 6, 'dark_oak', 'west', 3); table(p, 5, f0, 7, 'dark_oak', 'carpet', 'red');
  rug(p, 4, 9, 7, 12, f0, 'red', 'black');
  p.set(4, f0, 12, 'jukebox'); p.set(4, f0, 10, 'bookshelf'); p.set(4, f0 + 1, 10, 'bookshelf');
  longTable(p, 9, 9, 11, 9, f0, 'dark_oak_slab'); for (let x = 9; x <= 11; x++) { chair(p, x, f0, 8, 'dark_oak', 'north'); chair(p, x, f0, 10, 'dark_oak', 'south'); }
  p.set(12, f0, 12, 'smoker', furnace('west')); p.set(12, f0, 11, 'barrel', barrel('west')); p.set(11, f0, 12, 'cauldron');
  for (const [x, z] of [[6, 8], [10, 9]] as const) hangLantern(p, l, x, f1 - 2, z);
  // Tower room in the wing: reading corner.
  for (let x = 12; x <= 15; x++) p.set(x, f0, 3, 'bookshelf');
  chair(p, 14, f0, 5, 'dark_oak', 'south', true);
  // Bedrooms upstairs.
  bed(p, 5, f1, 11, 'white', 'south'); bed(p, 9, f1, 11, 'light_blue', 'south'); cupboard(p, 4, f1, 7, 'dark_oak', 'east', 2);
  p.set(12, f1, 9, 'chest', chest('west')); table(p, 14, f1, 4, 'dark_oak'); chair(p, 13, f1, 4, 'dark_oak', 'west');
  hangLantern(p, l, 8, h.ceiling - 1, 8);
  ladderUp(p, 12, 12, f0, f1 - 1, 'north'); p.air(12, f1 - 1, 12);
  // Garden: hedge, path, two trees, a bench.
  for (let x = 0; x < 19; x++) if (x < 6 || x > 8) putFree(p, x, 1, 0, 'azalea_leaves', { distance: '1', persistent: 'true', waterlogged: F });
  for (let z = 1; z <= 3; z++) for (const x of [6, 7, 8]) if (z !== 2) put(p, x, 0, z, 'gravel');
  for (const [x, z] of [[1, 15], [16, 15]] as const) { put(p, x, 1, z, 'birch_log', axis('y')); put(p, x, 2, z, 'birch_log', axis('y')); put(p, x, 3, z, 'birch_log', axis('y'));
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { putFree(p, x + dx, 4, z + dz, 'birch_leaves', { distance: '1', persistent: 'true', waterlogged: F }); } putFree(p, x, 5, z, 'birch_leaves', { distance: '1', persistent: 'true', waterlogged: F }); }
  sofa(p, 8, 1, 16, 'dark_oak', 'south', 3);
  for (const [x, z, id] of [[2, 3, 'red_tulip'], [3, 3, 'white_tulip'], [14, 1, 'allium'], [15, 1, 'oxeye_daisy']] as const) putFree(p, x, 1, z, id);
  return p.payload();
}

const M = 'bld_meister_';
export const MEISTER_SPECS: readonly BuildingSpec[] = [
  { id: `${M}gildehaus`, name: 'Gildehaus', payload: gildehaus, tags: ['zunft', 'fachwerk', 'vorkragung', 'markt'],
    description: 'Dreigeschossiges Gildehaus: Steinhalle mit langer Tafel, zwei vorkragende Fachwerkgeschosse mit Zwerchgiebeln, Blumenkästen und Läden, Schreibstube, Tuchlager und Meisterkammer; davor zwei Marktstände.',
    facets: { kategorie: ['handel'], stil: ['mittelalterlich'], biom: ['ebene', 'wald', 'ueberall'], funktion: ['handel', 'versammlung', 'lagern'] },
    tips: ['Erst die Steinhalle bis zur Balkenlage bauen, dann jedes Fachwerkgeschoss einen Block weiter vorziehen – die umgedrehten Treppen darunter tragen optisch.', 'Die Zwerchgiebel entstehen, wenn zwei Satteldächer quer ineinanderlaufen: zuerst das Hauptdach, dann das Querdach bis zur Kehle.'],
    inspiration: [WIKI('Loom', 'Webstuhl')] },
  { id: `${M}wassermuehle`, name: 'Wassermühle', payload: wassermuehle, tags: ['mühle', 'wasserrad', 'bach', 'fachwerk'],
    description: 'Mühlenhaus aus Backstein und Fachwerk am Bach, mit unterschlächtigem Wasserrad auf Eichenwelle, Mahlstein, Getreidelager, Müllerstube unter dem Krüppelwalmdach und Steg über den Bach.',
    facets: { kategorie: ['landwirtschaft'], stil: ['rustikal', 'mittelalterlich'], biom: ['ebene', 'wald'], funktion: ['landwirtschaft', 'wohnen', 'lagern'] }, gaps: ['minecraft:water'],
    tips: ['Das Rad steht im Bachbett: zuerst das Wasser setzen, dann Felge und Speichen; Bretter im Wasser werden nicht geflutet.', 'Ein echtes Rad dreht sich in Vanilla nicht – mit einer Seifenkiste aus Kolben lässt es sich höchstens andeuten.'],
    inspiration: [WIKI('Grindstone', 'Schleifstein')] },
  { id: `${M}markthalle`, name: 'Markthalle', payload: markthalle, tags: ['markt', 'arkaden', 'säulen', 'brunnen'],
    description: 'Offene Markthalle auf Holzsäulen mit Steinkapitellen und Bögen, darunter Obst-, Fass-, Tuch- und Werkzeugstand und ein Brunnen; im Fachwerkgeschoss der Ratssaal, auf dem Giebel eine Glocke.',
    facets: { kategorie: ['handel'], stil: ['mittelalterlich'], biom: ['ebene', 'ueberall'], funktion: ['handel', 'versammlung', 'wasserquelle'] }, gaps: ['minecraft:water'],
    tips: ['Säulen zuerst setzen und mit einer Lage Balken verbinden – darauf steht das ganze Obergeschoss.', 'Die Stände sind echte Lager: Fässer und Truhen unter den Tischen.'],
    inspiration: [WIKI('Bell', 'Glocke')] },
  { id: `${M}bahnhof`, name: 'Bahnhof mit Uhrturm', payload: bahnhof, tags: ['bahnhof', 'uhrturm', 'bahnsteig', 'schiene'],
    description: 'Kleinstadtbahnhof aus Backstein mit Steinsockel, Gurtgesims und hohen Fenstern, Uhrturm mit drei Zifferblättern und Glocke, Wartehalle mit Fahrkartenschalter, Wohnung des Bahnhofsvorstehers und überdachter Bahnsteig an einem Gleis.',
    facets: { kategorie: ['infrastruktur'], stil: ['klassisch', 'industriell'], biom: ['ebene', 'ueberall'], funktion: ['transport', 'verbindung', 'wohnen'] },
    tips: ['Das Gleis läuft über die ganze Breite: an beiden Enden weiterbauen und mit Antriebsschienen alle 30 Blöcke beschleunigen.', 'Die Uhren sind Blockbilder; eine echte Uhr im Rahmen zeigt die Spielzeit an.'],
    inspiration: [WIKI('Rail', 'Schiene'), WIKI('Clock', 'Uhr')] },
  { id: `${M}fischerkate`, name: 'Fischerkate auf Pfählen', payload: fischerkate, tags: ['fischer', 'pfähle', 'steg', 'strand'],
    description: 'Fischerhaus aus Fichte auf Pfählen über dem Strand, mit bemoostem Krüppelwalmdach, Terrasse, Steg ins Wasser, Netztrockengestell und Räucherofen.',
    facets: { kategorie: ['wohnhaus'], stil: ['kuestenstil', 'rustikal'], biom: ['kueste', 'ozean'], funktion: ['wohnen', 'kochen'] }, gaps: ['minecraft:water'],
    tips: ['Pfähle erst bis zur Bodenhöhe setzen, dann die Bodenplatte darüberlegen – so bleibt der Strand darunter frei.', 'Spinnweben als Netze erhält man mit einer Schere aus Minen.'],
    inspiration: [WIKI('Fishing_Rod', 'Angel')] },
  { id: `${M}alchemistenturm`, name: 'Alchemistenturm', payload: alchemistenturm, tags: ['turm', 'alchemie', 'erker', 'kegeldach'],
    description: 'Runder Alchemistenturm aus gemischtem Stein mit Gurtgesimsen, violetten Fenstern, Fachwerkerker auf Konsolen und violettem Kegeldach; innen Labor mit Kesseln und Braustand, Bibliothek mit Zaubertisch und Sternwarte, davor ein Kräutergarten.',
    facets: { kategorie: ['magie'], stil: ['fantasy', 'mittelalterlich'], biom: ['wald', 'sumpf', 'ueberall'], funktion: ['verzaubern', 'bildung', 'wohnen'] },
    tips: ['Runde Wände Schicht für Schicht mit derselben Kreisvorlage hochziehen; die Gesimse sind ein Ring umgedrehter Treppen.', 'Für volle Zauberstufe 15 Bücherregale mit einem Block Abstand um den Zaubertisch stellen.'],
    inspiration: [WIKI('Brewing_Stand', 'Braustand'), WIKI('Enchanting_Table', 'Zaubertisch')] },
  { id: `${M}stadtvilla`, name: 'Stadtvilla', payload: stadtvilla, tags: ['villa', 'veranda', 'turmzimmer', 'walmdach'],
    description: 'Zweigeschossige Stadtvilla in Weiß und Schiefer: Turmzimmer im Eckflügel, Veranda auf Quarzsäulen mit Balkon, Gurtgesims, hohe Fenster mit Läden; Salon, Esszimmer, Küche, zwei Schlafzimmer und ein Garten mit Hecke.',
    facets: { kategorie: ['wohnhaus'], stil: ['viktorianisch', 'klassisch'], biom: ['ebene', 'ueberall'], funktion: ['wohnen'] },
    tips: ['Weiße Keramik entsteht aus Ton im Ofen und wird mit Knochenmehl gefärbt.', 'Das Walmdach des Eckflügels steht steiler als das Hauptdach – so wirkt der Flügel wie ein Turm.'],
    inspiration: [WIKI('Terracotta', 'Keramik')] },
];
