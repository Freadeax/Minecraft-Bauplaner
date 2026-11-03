import { Plot, axis, barrel, bed, chest, door, facing, furnace, ladder, leaves, slab, stairs, trapdoor, F } from '../plot.js';
import type { VoxelPayload } from '../../../../voxel/src/types.js';
import { beltCourse, hangLantern, ladderUp, house, LOOKS, lookWith, pick, pitchedRoof, put, putFree, skirt } from '../style.js';
import type { Look, Mix } from '../style.js';
import { stableHypot } from '../../../../voxel/src/stableMath.js';

/**
 * The B9 classics redrawn with the design kit (LIB-05, docs/architecture/BAUSTIL.md):
 * same purpose, rooms and furnishing as before, now with mixed materials,
 * plinths, frames, dressed windows and roofs with overhang, soffit and verge.
 */

const OAK_LOOK: Look = lookWith(LOOKS.fachwerk, { frame: 'stripped_oak_log', trim: 'dark_oak', shutter: 'oak', door: 'oak', floor: 'oak_planks',
  roof: [['spruce_planks', 1]], roofStairs: 'spruce_stairs', roofSlab: 'spruce_slab' });
/** Two-storey timber house: stone ground floor, jettied oak frame upper floor, steep roof with a dormer window and attic bed. */
export function fachwerkhaus(): VoxelPayload {
  const p = new Plot([11, 2, 13]), l = OAK_LOOK;
  const h = house(p, l, { at: { x0: 2, z0: 2, x1: 8, z1: 10 }, storeys: [{ h: 4, kind: 'stein' }, { h: 4, kind: 'fachwerk' }], jetty: 1, jettySides: ['north', 'south'],
    postEvery: 2, windowEvery: 2, roof: { kind: 'sattel', ridge: 'z', overhang: 1, pitch: 'steil' }, flowerBoxes: true, door: { side: 'north' }, chimney: { x: 8, z: 6 }, seed: 3, noWindow: (x, _y, z) => x === 8 && z >= 7 });
  const yu = h.floors[1]! + 1;
  bed(p, 3, 1, 8, 'red', 'south'); p.set(7, 1, 3, 'crafting_table'); p.set(3, 1, 4, 'furnace', furnace('east'));
  p.set(7, 1, 5, 'chest', chest('west')); p.set(7, 1, 9, 'barrel', barrel('up'));
  for (let y = 1; y < yu; y++) p.set(7, y, 8, 'ladder', ladder('west'));
  p.set(3, yu, 5, 'bookshelf'); p.set(3, yu, 6, 'bookshelf'); p.set(4, yu, 9, 'chest', chest('north'));
  bed(p, 5, yu, 8, 'white', 'south');
  hangLantern(p, l, 5, 4, 6); hangLantern(p, l, 5, h.ceiling - 1, 6);
  return p.payload();
}

const LOG_LOOK: Look = lookWith(LOOKS.nordisch, { wall: [['spruce_log', 1]], frame: 'stripped_spruce_log', base: [['cobblestone', 6], ['mossy_cobblestone', 3], ['andesite', 1]],
  baseStairs: 'cobblestone_stairs', baseSlab: 'cobblestone_slab', baseWall: 'cobblestone_wall', roof: [['spruce_planks', 3], ['dark_oak_planks', 1]], roofStairs: 'spruce_stairs', roofSlab: 'spruce_slab' });
/** Log cabin: lying logs with crossed corner heads, porch on posts, stone chimney with a collar. */
export function blockhuette(): VoxelPayload {
  const p = new Plot([10, 2, 10]), l = LOG_LOOK;
  house(p, l, { at: { x0: 1, z0: 3, x1: 7, z1: 8 }, storeys: [{ h: 4, kind: 'wand' }], plinth: 1, windowEvery: 3,
    roof: { kind: 'sattel', ridge: 'z', overhang: 1, pitch: 'steil' }, door: { side: 'north', at: 3 }, chimney: { x: 7, z: 6 }, seed: 9 });
  // Logs lie along each wall; corner heads stick out.
  for (let y = 2; y <= 4; y++) {
    for (let x = 2; x <= 6; x++) for (const z of [3, 8]) { const s = p.get(x, y, z); if (s?.id === 'minecraft:spruce_log') p.set(x, y, z, 'spruce_log', axis('x')); }
    for (let z = 4; z <= 7; z++) for (const x of [1, 7]) { const s = p.get(x, y, z); if (s?.id === 'minecraft:spruce_log') p.set(x, y, z, 'spruce_log', axis('z')); }
    for (const [x, z] of [[0, 3], [8, 3], [0, 8], [8, 8]] as const) if (y % 2 === 0) put(p, x, y, z, 'stripped_spruce_log', axis(x === 0 || x === 8 ? 'x' : 'z'));
  }
  // Porch: slab roof on log posts, plank deck.
  for (let x = 1; x <= 7; x++) for (let z = 0; z <= 2; z++) p.set(x, 0, z, 'spruce_planks');
  for (const x of [1, 7]) { p.set(x, 1, 0, 'spruce_fence'); p.set(x, 2, 0, 'spruce_fence'); p.set(x, 3, 0, 'stripped_spruce_log', axis('y')); }
  for (let x = 1; x <= 7; x++) for (let z = 0; z <= 2; z++) putFree(p, x, 4, z, 'spruce_slab', slab('bottom'));
  for (let x = 2; x <= 6; x++) putFree(p, x, 3, 0, 'spruce_trapdoor', trapdoor('north', 'top', true));
  p.set(5, 1, 1, 'spruce_stairs', stairs('north')); p.set(6, 1, 1, 'barrel', barrel('up'));
  bed(p, 2, 1, 6, 'brown', 'south'); p.set(6, 1, 7, 'barrel', barrel('up')); p.set(6, 1, 4, 'crafting_table'); p.set(5, 1, 7, 'chest', chest('north'));
  hangLantern(p, l, 4, 4, 5);
  for (const [x, z] of [[9, 1], [9, 9]] as const) p.set(x, 0, z, 'podzol');
  return p.payload();
}

const SAND_LOOK: Look = lookWith(LOOKS.wueste, { wall: [['smooth_sandstone', 5], ['sandstone', 2], ['cut_sandstone', 1]], frame: 'cut_sandstone' });
/** Desert house: plastered cube on a plinth, roof beams, shaded door, crenellated roof terrace with an awning. */
export function wuestenhaus(): VoxelPayload {
  const p = new Plot([11, 2, 11]), l = SAND_LOOK;
  house(p, l, { at: { x0: 1, z0: 1, x1: 9, z1: 9 }, storeys: [{ h: 4, kind: 'wand' }], plinth: 1, windowEvery: 3, windowH: 1,
    roof: { kind: 'flach', ridge: 'x' }, door: { side: 'north' }, seed: 13 });
  for (let x = 2; x <= 8; x += 2) { putFree(p, x, 4, 0, 'stripped_acacia_log', axis('z')); putFree(p, x, 4, 10, 'stripped_acacia_log', axis('z')); }
  for (let z = 3; z <= 7; z += 2) { putFree(p, 0, 4, z, 'stripped_acacia_log', axis('x')); putFree(p, 10, 4, z, 'stripped_acacia_log', axis('x')); }
  for (let x = 1; x <= 9; x++) for (const z of [1, 9]) if (x % 2 === 1) p.set(x, 7, z, 'cut_sandstone');
  for (let z = 2; z <= 8; z++) for (const x of [1, 9]) if (z % 2 === 1) p.set(x, 7, z, 'cut_sandstone');
  // Awning over half the roof terrace.
  for (const [x, z] of [[5, 5], [8, 5], [5, 8], [8, 8]] as const) p.set(x, 7, z, 'acacia_fence');
  for (let x = 5; x <= 8; x++) for (let z = 5; z <= 8; z++) p.set(x, 8, z, (x + z) % 2 ? 'orange_wool' : 'white_wool');
  p.set(3, 7, 3, 'potted_cactus'); p.set(6, 7, 6, 'barrel', barrel('up'));
  p.set(2, 1, 7, 'orange_carpet'); p.set(3, 1, 7, 'orange_carpet');
  bed(p, 7, 1, 7, 'orange', 'west'); p.set(8, 1, 2, 'smoker', furnace('west')); p.set(2, 1, 2, 'barrel', barrel('up'));
  p.set(2, 1, 8, 'cauldron'); p.set(7, 1, 2, 'potted_cactus');
  for (let y = 1; y <= 5; y++) p.set(8, y, 8, 'ladder', ladder('west'));
  hangLantern(p, l, 5, 4, 5);
  return p.payload();
}

/** Lighthouse: tapering striped tower on a stone base with a gallery on brackets, glass lantern room and a copper cap. */
export function leuchtturm(): VoxelPayload {
  const p = new Plot([11, 2, 11]);
  const stone: Mix = [['stone_bricks', 6], ['mossy_stone_bricks', 2], ['cobblestone', 2], ['andesite', 1]];
  const ring = (_y: number, r: number, f: (x: number, z: number, edge: boolean) => void) => {
    for (let x = 0; x <= 10; x++) for (let z = 0; z <= 10; z++) { const d = stableHypot(x - 5, z - 5); if (d <= r + 0.3) f(x, z, d > r - 0.9); }
  };
  ring(0, 5, (x, z) => p.set(x, 0, z, pick(stone, x, 0, z, 2)));
  for (let y = 1; y <= 3; y++) ring(y, 4, (x, z, e) => e ? p.set(x, y, z, pick(stone, x, y, z, 2)) : p.air(x, y, z));
  ring(4, 4.6, (x, z, e) => { if (e) { const dx = 5 - x, dz = 5 - z; p.set(x, 4, z, 'stone_brick_stairs', stairs(Math.abs(dx) >= Math.abs(dz) ? (dx > 0 ? 'east' : 'west') : (dz > 0 ? 'south' : 'north'), 'top')); } });
  for (let y = 4; y <= 17; y++) {
    const r = y < 9 ? 3.4 : y < 14 ? 3 : 2.6, band = Math.floor((y - 4) / 3) % 2 === 0;
    ring(y, r, (x, z, e) => e ? p.set(x, y, z, band ? (pick([['white_concrete', 4], ['white_terracotta', 1]], x, y, z, 1)) : (pick([['red_concrete', 4], ['red_terracotta', 1]], x, y, z, 1))) : p.air(x, y, z));
  }
  // Gallery on brackets.
  ring(18, 4, (x, z, e) => p.set(x, 18, z, e ? 'polished_andesite_slab' : 'smooth_stone', e ? slab('top') : {}));
  ring(17, 3.9, (x, z, e) => { if (e && (x + z) % 2 === 0) putFree(p, x, 17, z, 'stone_brick_stairs', stairs(x < 5 ? 'east' : x > 5 ? 'west' : z < 5 ? 'south' : 'north', 'top')); });
  ring(19, 4, (x, z, e) => { if (e) p.set(x, 19, z, 'iron_bars'); });
  // Lantern room.
  for (let y = 19; y <= 21; y++) for (let x = 3; x <= 7; x++) for (let z = 3; z <= 7; z++) {
    const corner = (x === 3 || x === 7) && (z === 3 || z === 7), edge = x === 3 || x === 7 || z === 3 || z === 7;
    if (corner) p.set(x, y, z, 'andesite_wall'); else if (edge) p.set(x, y, z, 'glass'); else if (!(x === 5 && z === 5)) p.air(x, y, z);
  }
  p.set(5, 19, 5, 'polished_andesite'); p.set(5, 20, 5, 'sea_lantern'); p.set(5, 21, 5, 'glowstone');
  for (let x = 2; x <= 8; x++) for (let z = 2; z <= 8; z++) { const e = x === 2 || x === 8 || z === 2 || z === 8; p.set(x, 22, z, e ? 'cut_copper_slab' : 'cut_copper', e ? slab('bottom') : {}); }
  for (let x = 4; x <= 6; x++) for (let z = 4; z <= 6; z++) p.set(x, 23, z, x === 5 && z === 5 ? 'cut_copper' : 'cut_copper_stairs', x === 5 && z === 5 ? {} : stairs(x < 5 ? 'east' : x > 5 ? 'west' : z < 5 ? 'south' : 'north'));
  p.set(5, 24, 5, 'lightning_rod', { facing: 'up', powered: F, waterlogged: F });
  // Door, windows, ladder.
  p.air(5, 1, 1); p.air(5, 2, 1); door(p, 5, 1, 1, 'spruce', 'north'); p.set(5, 3, 1, 'spruce_stairs', stairs('south', 'top'));
  for (const [x, y, z] of [[2, 7, 5], [8, 11, 5], [5, 14, 8], [5, 9, 2]] as const) p.set(x, y, z, 'glass_pane');
  ladderUp(p, 5, 5, 1, 17, 'north');
  p.set(7, 1, 4, 'barrel', barrel('up')); p.set(3, 1, 5, 'chest', chest('east'));
  return p.payload();
}

const SMITH_LOOK: Look = lookWith(LOOKS.stein, { frame: 'stripped_spruce_log', roof: [['spruce_planks', 3], ['dark_oak_planks', 1]], roofStairs: 'spruce_stairs', roofSlab: 'spruce_slab', trim: 'dark_oak' });
/** Smithy: stone back wall with the forge, open front under a lean-to roof on posts, chimney with a collar. */
export function schmiede(): VoxelPayload {
  const p = new Plot([11, 2, 9]), l = SMITH_LOOK;
  for (let x = 0; x <= 10; x++) for (let z = 0; z <= 8; z++) p.set(x, 0, z, z >= 6 || x === 10 ? pick(l.base, x, 0, z, 4) : (x * 7 + z * 3) % 5 ? 'gravel' : 'cobblestone');
  for (let y = 1; y <= 4; y++) { for (let x = 0; x <= 10; x++) put(p, x, y, 7, pick(l.wall, x, y, 7, 4)); for (let z = 1; z <= 7; z++) put(p, 10, y, z, pick(l.wall, 10, y, z, 4)); }
  for (const [x, z] of [[0, 1], [5, 1], [0, 7]] as const) for (let y = 1; y <= 4; y++) put(p, x, y, z, 'stripped_spruce_log', axis('y'));
  for (let x = 0; x <= 10; x++) put(p, x, 5, 1, 'stripped_spruce_log', axis('x'));
  pitchedRoof(p, l, { walls: { x0: 0, z0: 1, x1: 10, z1: 7 }, y: 5, kind: 'pult', ridge: 'x', overhang: 1, pitch: 'flach', seed: 4, gables: false });
  // Forge: stone hood over furnaces, lava behind bars.
  for (let x = 7; x <= 9; x++) { put(p, x, 3, 6, pick(l.base, x, 3, 6, 4)); put(p, x, 4, 6, pick(l.base, x, 4, 6, 4)); }
  p.set(7, 1, 6, 'furnace', furnace('north')); p.set(9, 1, 6, 'blast_furnace', furnace('north')); p.set(8, 1, 6, 'iron_bars'); p.set(8, 0, 6, 'magma_block');
  p.set(7, 2, 5, 'stone_brick_stairs', stairs('south', 'top')); p.set(8, 2, 5, 'stone_brick_slab', slab('top')); p.set(9, 2, 5, 'stone_brick_stairs', stairs('south', 'top'));
  let t = 5; while (p.has(8, t + 1, 6)) t++;
  for (let y = 5; y <= t + 1; y++) put(p, 8, y, 7, pick(l.base, 8, y, 7, 4));
  p.set(8, t + 2, 7, 'campfire', { facing: 'north', lit: 'true', signal_fire: F, waterlogged: F });
  p.set(3, 1, 3, 'anvil', facing('east')); p.set(1, 1, 6, 'smithing_table'); p.set(2, 1, 6, 'grindstone', { face: 'floor', facing: 'north' });
  p.set(4, 1, 6, 'chest', chest('north')); p.set(9, 1, 2, 'barrel', barrel('west')); p.set(5, 1, 6, 'water_cauldron', { level: '3' }); p.set(9, 1, 3, 'barrel', barrel('up'));
  hangLantern(p, l, 3, 4, 4);
  return p.payload();
}

const BARN_LOOK: Look = lookWith(LOOKS.backstein, { wall: [['spruce_planks', 5], ['stripped_spruce_wood', 1]], frame: 'dark_oak_log', roof: [['dark_oak_planks', 1]], roofStairs: 'dark_oak_stairs', roofSlab: 'dark_oak_slab', trim: 'spruce', shutter: 'spruce' });
/** Barn: plank walls between dark posts on a cobble plinth, big gate with a hay hatch, steep half-hipped roof, stalls and a loft. */
export function scheune(): VoxelPayload {
  const p = new Plot([13, 2, 15]), l = BARN_LOOK;
  house(p, l, { at: { x0: 1, z0: 1, x1: 11, z1: 13 }, storeys: [{ h: 5, kind: 'fachwerk' }], plinth: 1, postEvery: 4, windowEvery: 4,
    roof: { kind: 'krueppelwalm', ridge: 'z', overhang: 1, pitch: 'steil' }, door: null, noShutters: true, seed: 17, noWindow: (_x, _y, z) => z === 1 || z === 13 });
  for (let x = 5; x <= 7; x++) for (let y = 1; y <= 4; y++) p.air(x, y, 1);
  for (const x of [5, 7]) p.set(x, 4, 0, 'spruce_trapdoor', trapdoor('north', 'top', true));
  // Diagonal braces on the gate leaves (stairs) and a hay hatch above.
  p.set(4, 4, 0, 'spruce_stairs', stairs('east', 'top')); p.set(8, 4, 0, 'spruce_stairs', stairs('west', 'top'));
  p.set(6, 7, 1, 'spruce_trapdoor', trapdoor('north', 'bottom', true)); p.air(6, 7, 2);
  p.set(6, 8, 0, 'dark_oak_fence'); p.set(6, 8, 1, 'dark_oak_planks');
  // Stalls of fences with gates.
  for (const x of [2, 3, 4, 8, 9, 10]) for (const z of [5, 9]) p.set(x, 1, z, 'oak_fence');
  for (const z of [6, 7, 8]) { p.set(4, 1, z, 'oak_fence'); p.set(8, 1, z, 'oak_fence'); }
  p.set(4, 1, 7, 'oak_fence_gate', { facing: 'east', in_wall: F, open: F, powered: F }); p.set(8, 1, 7, 'oak_fence_gate', { facing: 'west', in_wall: F, open: F, powered: F });
  for (const z of [6, 8]) { p.set(2, 1, z, 'hay_block', axis('y')); p.set(10, 1, z, 'composter'); }
  // Loft over the back third.
  for (let x = 2; x <= 10; x++) for (let z = 9; z <= 12; z++) p.set(x, 5, z, 'spruce_planks');
  for (let x = 2; x <= 10; x++) p.set(x, 6, 9, 'spruce_fence');
  p.air(10, 6, 9);
  for (let y = 1; y <= 5; y++) p.set(10, y, 10, 'ladder', ladder('west'));
  p.fill(2, 6, 11, 4, 7, 12, 'hay_block', axis('y')); p.fill(7, 6, 11, 9, 6, 12, 'hay_block', axis('y'));
  p.set(9, 1, 12, 'chest', chest('north')); p.set(10, 1, 12, 'barrel', barrel('up'));
  hangLantern(p, l, 6, 4, 4); hangLantern(p, l, 6, 4, 8);
  return p.payload();
}

const CHAPEL_LOOK: Look = lookWith(LOOKS.stein, {
  wall: [['stone_bricks', 8], ['mossy_stone_bricks', 2], ['cracked_stone_bricks', 2], ['andesite', 1]], base: [['cobblestone', 5], ['mossy_cobblestone', 2], ['stone_bricks', 3]],
  baseStairs: 'stone_brick_stairs', baseSlab: 'stone_brick_slab', baseWall: 'stone_brick_wall',
  roof: [['deepslate_tiles', 5], ['cracked_deepslate_tiles', 1]], roofStairs: 'deepslate_tile_stairs', roofSlab: 'deepslate_tile_slab', trim: 'dark_oak', frame: 'stone_bricks',
});
/** Chapel: nave with buttresses and tall stained windows, steep slate roof, front tower with belfry and spire. */
export function kapelle(): VoxelPayload {
  const p = new Plot([11, 2, 17]), l = CHAPEL_LOOK;
  house(p, l, { at: { x0: 2, z0: 4, x1: 8, z1: 15 }, storeys: [{ h: 6, kind: 'stein' }], plinth: 1, windowEvery: 3, windowH: 3,
    roof: { kind: 'sattel', ridge: 'z', overhang: 1, pitch: 'steil' }, door: null, noShutters: true, seed: 21 });
  for (let z = 5; z <= 14; z++) for (const x of [2, 8]) for (let y = 2; y <= 4; y++) { const s = p.get(x, y, z); if (s?.id === 'minecraft:glass_pane') p.set(x, y, z, y === 4 ? 'yellow_stained_glass_pane' : 'light_blue_stained_glass_pane'); }
  // Buttresses between the windows.
  for (const z of [6, 9, 12, 15]) for (const x of [1, 9]) { for (let y = 1; y <= 3; y++) put(p, x, y, z, pick(l.wall, x, y, z, 21)); put(p, x, 4, z, 'stone_brick_stairs', stairs(x === 1 ? 'east' : 'west')); }
  // Tower in front.
  for (let y = 1; y <= 12; y++) for (let x = 3; x <= 7; x++) for (let z = 0; z <= 4; z++) {
    const edge = x === 3 || x === 7 || z === 0 || z === 4;
    if (edge) put(p, x, y, z, (x === 3 || x === 7) && (z === 0 || z === 4) ? 'chiseled_stone_bricks' : pick(l.wall, x, y, z, 22)); else p.air(x, y, z);
  }
  for (let x = 3; x <= 7; x++) for (let z = 0; z <= 4; z++) put(p, x, 0, z, pick(l.base, x, 0, z, 22));
  for (let x = 4; x <= 6; x++) for (let z = 1; z <= 3; z++) p.set(x, 8, z, 'spruce_planks');
  beltCourse(p, l, { x0: 3, z0: 0, x1: 7, z1: 4 }, 8);
  // Belfry openings with arches.
  for (const [x, z] of [[5, 0], [5, 4], [3, 2], [7, 2]] as const) { p.air(x, 10, z); p.air(x, 11, z); put(p, x, 12, z, 'stone_brick_stairs', stairs(x === 3 ? 'east' : x === 7 ? 'west' : z === 0 ? 'south' : 'north', 'top')); }
  p.set(5, 11, 2, 'bell', { attachment: 'ceiling', facing: 'north', powered: F }); p.set(5, 12, 2, 'stone_bricks');
  pitchedRoof(p, l, { walls: { x0: 3, z0: 0, x1: 7, z1: 4 }, y: 13, kind: 'walm', ridge: 'x', overhang: 1, pitch: 'steil', seed: 22 });
  let top = 13; while (p.has(5, top + 1, 2)) top++;
  p.set(5, top + 1, 2, 'stone_brick_wall'); p.set(5, top + 2, 2, 'lightning_rod', { facing: 'up', powered: F, waterlogged: F });
  // Portal: arch, door, steps; nave opening behind the tower.
  for (let y = 1; y <= 3; y++) p.air(5, y, 0);
  door(p, 5, 1, 0, 'dark_oak', 'north'); p.set(5, 3, 0, 'stone_brick_stairs', stairs('south', 'top')); p.set(4, 3, 0, 'stone_brick_stairs', stairs('east', 'top')); p.set(6, 3, 0, 'stone_brick_stairs', stairs('west', 'top'));
  for (let y = 1; y <= 3; y++) { p.air(5, y, 4); }
  skirt(p, l, { x0: 3, z0: 0, x1: 7, z1: 4 }, 0);
  p.set(5, 9, 0, 'light_blue_stained_glass_pane'); p.set(5, 5, 0, 'light_blue_stained_glass_pane');
  // Pews, aisle, altar.
  for (const z of [6, 8, 10]) for (const x of [3, 4, 6, 7]) p.set(x, 1, z, 'oak_stairs', stairs('north'));
  for (let z = 4; z <= 13; z++) p.set(5, 1, z, 'red_carpet');
  p.set(5, 1, 14, 'chiseled_quartz_block'); p.set(5, 2, 14, 'candle', { candles: '3', lit: F, waterlogged: F });
  p.set(4, 1, 14, 'lectern', { facing: 'north', has_book: F, powered: F }); p.set(3, 1, 14, 'potted_lily_of_the_valley'); p.set(7, 1, 14, 'potted_lily_of_the_valley');
  hangLantern(p, l, 5, 5, 8); hangLantern(p, l, 5, 5, 12);
  return p.payload();
}

/** Timber watchtower: braced log frame on stone feet, a covered platform with a hipped roof, ladder inside. */
export function wachturm(): VoxelPayload {
  const p = new Plot([9, 2, 9]);
  const l: Look = lookWith(LOOKS.stein, { roof: [['spruce_planks', 1]], roofStairs: 'spruce_stairs', roofSlab: 'spruce_slab', trim: 'dark_oak' });
  for (const [x, z] of [[2, 2], [6, 2], [2, 6], [6, 6]] as const) {
    p.set(x, 0, z, 'cobblestone'); p.set(x, 1, z, 'mossy_cobblestone');
    for (let y = 2; y <= 11; y++) p.set(x, y, z, 'oak_log', axis('y'));
  }
  // Cross braces of stairs and fences on every side.
  for (const y of [4, 8]) {
    for (let x = 3; x <= 5; x++) for (const z of [2, 6]) p.set(x, y, z, 'stripped_oak_log', axis('x'));
    for (let z = 3; z <= 5; z++) for (const x of [2, 6]) p.set(x, y, z, 'stripped_oak_log', axis('z'));
  }
  for (const [y, dx] of [[5, 0], [6, 1], [7, 2]] as const) { p.set(3 + dx, y, 2, 'oak_fence'); p.set(5 - dx, y, 6, 'oak_fence'); p.set(2, y, 3 + dx, 'oak_fence'); p.set(6, y, 5 - dx, 'oak_fence'); }
  for (let x = 1; x <= 7; x++) for (let z = 1; z <= 7; z++) p.set(x, 11, z, 'spruce_planks');
  for (let x = 1; x <= 7; x++) for (const z of [1, 7]) if (x % 2 === 1) putFree(p, x, 10, z, 'spruce_stairs', stairs(z === 1 ? 'south' : 'north', 'top'));
  for (let x = 1; x <= 7; x++) for (let z = 1; z <= 7; z++) if (x === 1 || x === 7 || z === 1 || z === 7) p.set(x, 12, z, (x + z) % 2 ? 'spruce_fence' : 'spruce_trapdoor', (x + z) % 2 ? {} : trapdoor(z === 1 ? 'north' : z === 7 ? 'south' : x === 1 ? 'west' : 'east', 'bottom', true));
  for (const [x, z] of [[1, 1], [7, 1], [1, 7], [7, 7]] as const) { p.set(x, 12, z, 'oak_log', axis('y')); p.set(x, 13, z, 'oak_fence'); p.set(x, 14, z, 'oak_fence'); }
  pitchedRoof(p, l, { walls: { x0: 1, z0: 1, x1: 7, z1: 7 }, y: 15, kind: 'walm', ridge: 'x', overhang: 1, seed: 6, gables: false });
  for (let y = 1; y <= 11; y++) p.set(4, y, 5, 'ladder', ladder('north'));
  p.air(4, 11, 5); p.set(4, 12, 4, 'barrel', barrel('up')); hangLantern(p, l, 4, 14, 4);
  for (let y = 1; y <= 11; y++) p.set(4, y, 6, 'oak_planks');
  p.set(4, 0, 4, 'cobblestone');
  return p.payload();
}

/** Jungle tree house: big trunk with buttress roots, wrap-around veranda on brackets, framed hut with a hipped roof, leaf crown. */
export function baumhaus(): VoxelPayload {
  const p = new Plot([13, 2, 13]);
  const l: Look = lookWith(LOOKS.nordisch, { base: [['jungle_planks', 1]], baseStairs: 'jungle_stairs', baseSlab: 'jungle_slab', baseWall: 'jungle_fence',
    wall: [['jungle_planks', 4], ['stripped_jungle_wood', 1]], frame: 'stripped_jungle_log', roof: [['spruce_planks', 1]], roofStairs: 'spruce_stairs', roofSlab: 'spruce_slab', trim: 'dark_oak', shutter: 'jungle', door: 'jungle', floor: 'jungle_planks' });
  for (let x = 5; x <= 7; x++) for (let z = 5; z <= 7; z++) p.set(x, 0, z, 'podzol');
  for (let y = 1; y <= 7; y++) for (const [x, z] of [[6, 6], [7, 6], [6, 7], [7, 7]] as const) p.set(x, y, z, 'jungle_log', axis('y'));
  for (const [x, z] of [[5, 6], [8, 7], [6, 8], [7, 5]] as const) { p.set(x, 1, z, 'jungle_log', axis('y')); p.set(x, 2, z, 'jungle_wood', axis('y')); }
  for (let x = 1; x <= 11; x++) for (let z = 1; z <= 11; z++) {
    const d = stableHypot(x - 6.5, z - 6.5);
    if (d <= 5.4) p.set(x, 7, z, 'jungle_planks');
    if (d > 4.6 && d <= 5.4 && (x + z) % 3 === 0) putFree(p, x, 6, z, 'jungle_stairs', stairs(x < 6.5 ? 'east' : 'west', 'top'));
    if (d > 4.6 && d <= 5.4) p.set(x, 8, z, 'jungle_fence');
  }
  house(p, l, { at: { x0: 3, z0: 3, x1: 9, z1: 9 }, y0: 7, storeys: [{ h: 3, kind: 'fachwerk' }], postEvery: 3, windowEvery: 3,
    roof: { kind: 'walm', ridge: 'x', overhang: 1 }, door: { side: 'north', at: 6 }, seed: 33 });
  for (let y = 8; y <= 10; y++) for (const [x, z] of [[6, 6], [7, 6], [6, 7], [7, 7]] as const) p.set(x, y, z, 'jungle_log', axis('y'));
  p.air(6, 8, 2); p.air(6, 9, 2);
  for (let x = 0; x <= 12; x++) for (let z = 0; z <= 12; z++) for (let y = 15; y <= 18; y++) {
    const r = y === 18 ? 2.5 : y === 15 ? 5.5 : 5, d = (x - 6.5) ** 2 + (z - 6.5) ** 2;
    if (d <= r * r && !p.has(x, y, z)) p.set(x, y, z, 'jungle_leaves', leaves());
  }
  for (let y = 11; y <= 16; y++) if (!p.get(6, y, 6) || p.get(6, y, 6)?.id === 'minecraft:air' || !p.has(6, y, 6)) p.set(6, y, 6, 'jungle_log', axis('y'));
  for (let y = 1; y <= 7; y++) p.set(6, y, 5, 'ladder', ladder('north'));
  p.air(6, 7, 5);
  p.set(4, 8, 4, 'crafting_table'); p.set(4, 8, 8, 'chest', chest('east')); bed(p, 8, 8, 4, 'cyan', 'south');
  hangLantern(p, l, 8, 10, 8);
  return p.payload();
}

