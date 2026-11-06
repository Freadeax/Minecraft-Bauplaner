import { Plot, axis, barrel, bed, chest, door, facing, furnace, gableRoof, grass, ladder, lantern, leaves, mushroom, slab, stairs, trapdoor, water, campfire, F, T } from '../plot.js';
import { WIKI, WOOD_PALETTES } from '../spec.js';
import { doorKit, hangLantern, house, LOOKS, lookWith, pick, pitchedRoof, put, putFree, woodLook } from '../style.js';
import type { Look, Mix } from '../style.js';
import type { BuildingSpec, WoodPalette } from '../spec.js';

/** Wohnen: a starter house in eight woods plus houses for every biome and style. */

const pane = { east: F, north: F, south: F, waterlogged: F, west: F };

/** Stone accent of each wood palette as a mixed plinth (LIB-05). */
const ACCENT: Readonly<Record<string, { mix: Mix; form: string }>> = {
  cobblestone: { mix: [['cobblestone', 8], ['mossy_cobblestone', 3], ['andesite', 2]], form: 'cobblestone' },
  stone_bricks: { mix: [['stone_bricks', 10], ['mossy_stone_bricks', 3], ['cracked_stone_bricks', 2], ['andesite', 1]], form: 'stone_brick' },
  polished_andesite: { mix: [['polished_andesite', 6], ['andesite', 3], ['stone', 1]], form: 'polished_andesite' },
  mossy_cobblestone: { mix: [['mossy_cobblestone', 5], ['cobblestone', 4], ['moss_block', 1]], form: 'mossy_cobblestone' },
  terracotta: { mix: [['terracotta', 5], ['granite', 2], ['packed_mud', 1]], form: 'granite' },
  deepslate_bricks: { mix: [['deepslate_bricks', 8], ['cracked_deepslate_bricks', 2], ['cobbled_deepslate', 2]], form: 'deepslate_brick' },
  mud_bricks: { mix: [['mud_bricks', 6], ['packed_mud', 2]], form: 'mud_brick' },
  calcite: { mix: [['calcite', 5], ['diorite', 2], ['polished_diorite', 1]], form: 'polished_diorite' },
};
function starterLook(w: WoodPalette): Look {
  const a = ACCENT[w.accent] ?? ACCENT.cobblestone!;
  const wall = a.form === 'polished_andesite' || a.form === 'granite' || a.form === 'polished_diorite' ? `${a.form}_wall` : `${a.form}_wall`;
  return { ...woodLook(w.key, a.mix), baseStairs: `${a.form}_stairs`, baseSlab: `${a.form}_slab`, baseWall: wall };
}

/** 7×7 starter house: one room in a timber frame on a stone plinth, gable to the front. */
function starterhaus(w: WoodPalette) {
  return () => {
    const p = new Plot([9, 2, 9]), l = starterLook(w);
    house(p, l, { at: { x0: 1, z0: 1, x1: 7, z1: 7 }, storeys: [{ h: 3, kind: 'fachwerk' }], plinth: 1, postEvery: 2, windowEvery: 3,
      roof: { kind: 'sattel', ridge: 'z', overhang: 1 }, flowerBoxes: true, door: { side: 'north' }, seed: w.key.length });
    bed(p, 2, 1, 5, w.bed, 'south'); p.set(2, 1, 2, 'crafting_table'); p.set(6, 1, 2, 'furnace', furnace('west'));
    p.set(6, 1, 6, 'chest', chest('north')); p.set(5, 1, 6, 'chest', chest('north'));
    p.set(4, 3, 4, 'lantern', lantern(true));
    return p.payload();
  };
}

const STADT_LOOK: Look = lookWith(LOOKS.fachwerk, {
  base: [['bricks', 8], ['granite', 1], ['mud_bricks', 1]], baseStairs: 'brick_stairs', baseSlab: 'brick_slab', baseWall: 'brick_wall', frame: 'stripped_dark_oak_log',
});
/** Narrow town house: brick ground floor, jettied timber floor, steep slate roof with the gable to the street. */
function stadthaus() {
  const p = new Plot([9, 2, 14]);
  house(p, STADT_LOOK, { at: { x0: 1, z0: 3, x1: 7, z1: 11 }, storeys: [{ h: 4, kind: 'stein' }, { h: 4, kind: 'fachwerk' }], jetty: 1, jettySides: ['north'],
    postEvery: 2, windowEvery: 2, roof: { kind: 'sattel', ridge: 'z', overhang: 1, pitch: 'steil' }, door: { side: 'north' }, chimney: { x: 6, z: 11 }, seed: 7 });
  for (let y = 1; y <= 5; y++) p.set(2, y, 10, 'ladder', ladder('north'));
  p.set(5, 1, 10, 'furnace', furnace('north')); p.set(4, 1, 10, 'crafting_table'); p.set(6, 1, 4, 'barrel', barrel('up')); p.set(2, 1, 4, 'flower_pot');
  bed(p, 5, 6, 8, 'red', 'south'); p.set(3, 6, 10, 'chest', chest('north')); p.set(6, 6, 3, 'barrel', barrel('up'));
  p.set(4, 4, 7, 'lantern', lantern(true)); p.set(4, 9, 6, 'lantern', lantern(true));
  return p.payload();
}

const HOF_LOOK: Look = lookWith(LOOKS.fachwerk, {
  base: [['cobblestone', 8], ['mossy_cobblestone', 3], ['andesite', 2], ['stone', 1]], baseStairs: 'cobblestone_stairs', baseSlab: 'cobblestone_slab', baseWall: 'cobblestone_wall',
  wall: [['spruce_planks', 5], ['stripped_spruce_wood', 1]], frame: 'stripped_oak_log',
  roof: [['spruce_planks', 4], ['stripped_spruce_wood', 1]], roofStairs: 'spruce_stairs', roofSlab: 'spruce_slab', trim: 'dark_oak', shutter: 'oak',
});
/** Long farmhouse: cobblestone plinth, timber frame, half-hipped roof, kitchen and bedroom. */
function bauernhaus() {
  const p = new Plot([13, 2, 11]);
  house(p, HOF_LOOK, { at: { x0: 1, z0: 2, x1: 11, z1: 8 }, storeys: [{ h: 4, kind: 'fachwerk' }], plinth: 2, postEvery: 3, windowEvery: 3,
    roof: { kind: 'krueppelwalm', ridge: 'x', overhang: 1 }, flowerBoxes: true, door: { side: 'north', at: 5 }, chimney: { x: 2, z: 8 }, seed: 11 });
  // Partition with a passage between kitchen and bedroom.
  for (let z = 3; z <= 7; z++) for (let y = 1; y <= 4; y++) if (!(z === 5 && y <= 2)) p.set(8, y, z, z === 3 || z === 7 ? 'stripped_oak_log' : 'spruce_planks', z === 3 || z === 7 ? axis('y') : {});
  p.set(3, 1, 7, 'smoker', furnace('north')); p.set(4, 1, 7, 'furnace', furnace('north')); p.set(5, 1, 7, 'crafting_table'); p.set(6, 1, 7, 'barrel', barrel('up'));
  p.set(2, 1, 3, 'composter'); p.set(7, 1, 3, 'barrel', barrel('up'));
  bed(p, 10, 1, 6, 'yellow', 'south'); p.set(9, 1, 7, 'chest', chest('north')); p.set(10, 1, 3, 'chest', chest('south'));
  p.set(4, 4, 5, 'lantern', lantern(true)); p.set(9, 4, 5, 'lantern', lantern(true));
  return p.payload();
}

const KUESTE_LOOK: Look = lookWith(LOOKS.nordisch, {
  base: [['spruce_planks', 1]], baseStairs: 'spruce_stairs', baseSlab: 'spruce_slab', baseWall: 'spruce_fence',
  wall: [['spruce_planks', 4], ['stripped_spruce_wood', 1], ['spruce_planks', 1]], frame: 'stripped_spruce_log',
  roof: [['dark_oak_planks', 1]], roofStairs: 'dark_oak_stairs', roofSlab: 'dark_oak_slab', trim: 'spruce', shutter: 'spruce',
});
/** Fisher's hut on stilts: veranda to the water, barrels for the catch, lantern on the railing. */
function fischerhuette() {
  const p = new Plot([9, 2, 11]);
  for (const [x, z] of [[0, 0], [8, 0], [0, 10], [8, 10], [0, 5], [8, 5], [4, 0]] as const) p.fill(x, 0, z, x, 1, z, 'stripped_spruce_log', axis('y'));
  for (let x = 0; x <= 8; x++) for (let z = 0; z <= 10; z++) p.set(x, 2, z, (x + z) % 5 === 0 ? 'stripped_spruce_wood' : 'spruce_planks', (x + z) % 5 === 0 ? axis('x') : {});
  // Deck edge: slabs over the water, brackets under the long sides.
  for (let z = 1; z <= 9; z += 2) for (const x of [0, 8]) putFree(p, x, 1, z, 'spruce_stairs', stairs(x === 0 ? 'east' : 'west', 'top'));
  house(p, KUESTE_LOOK, { at: { x0: 2, z0: 4, x1: 6, z1: 9 }, y0: 2, storeys: [{ h: 3, kind: 'fachwerk' }], postEvery: 2, windowEvery: 2,
    roof: { kind: 'sattel', ridge: 'z', overhang: 1 }, door: { side: 'north' }, seed: 5 });
  for (let x = 0; x <= 8; x++) if (x !== 4) p.set(x, 3, 0, 'spruce_fence');
  for (let z = 1; z <= 3; z++) { p.set(0, 3, z, 'spruce_fence'); p.set(8, 3, z, 'spruce_fence'); }
  p.set(0, 4, 0, 'lantern', lantern()); p.set(8, 4, 0, 'lantern', lantern());
  p.set(1, 3, 1, 'barrel', barrel('up')); p.set(2, 3, 1, 'barrel', barrel('north')); p.set(7, 3, 2, 'composter');
  p.set(3, 3, 8, 'barrel', barrel('north')); bed(p, 5, 3, 7, 'light_blue', 'south'); p.set(3, 3, 5, 'chest', chest('east'));
  p.set(4, 5, 6, 'lantern', lantern(true));
  return p.payload();
}

const JAPAN_LOOK: Look = lookWith(LOOKS.kirsch, {
  base: [['stone_bricks', 6], ['mossy_stone_bricks', 2], ['andesite', 1], ['cobblestone', 1]], wall: [['white_wool', 1]], frame: 'stripped_dark_oak_log',
  roof: [['deepslate_tiles', 4], ['cobbled_deepslate', 1]], trim: 'dark_oak', shutter: 'spruce', door: 'spruce', floor: 'spruce_planks',
});
/** Japanese house: stone base, engawa, paper walls in a dark frame, hipped roof with a deep overhang. */
function japanhaus() {
  const p = new Plot([13, 2, 11]), l = JAPAN_LOOK;
  for (let x = 1; x <= 11; x++) for (let z = 1; z <= 9; z++) put(p, x, 0, z, pick(l.base, x, 0, z, 3));
  for (let x = 1; x <= 11; x++) for (let z = 1; z <= 9; z++) p.set(x, 1, z, x === 1 || x === 11 || z === 1 || z === 9 ? 'spruce_slab' : 'spruce_planks', x === 1 || x === 11 || z === 1 || z === 9 ? slab('top') : {});
  // Paper walls: dark posts every two blocks, a rail at mid height.
  for (let x = 3; x <= 9; x++) for (let z = 3; z <= 7; z++) {
    const ring = x === 3 || x === 9 || z === 3 || z === 7;
    for (let y = 2; y <= 4; y++) {
      if (!ring) { p.air(x, y, z); continue; }
      const post = (x - 3) % 2 === 0 && (z === 3 || z === 7) || (z - 3) % 2 === 0 && (x === 3 || x === 9);
      p.set(x, y, z, post ? 'stripped_dark_oak_log' : y === 3 ? 'white_wool' : 'white_wool', post ? axis('y') : {});
    }
    if (ring) p.set(x, 5, z, 'stripped_dark_oak_log', axis(z === 3 || z === 7 ? 'x' : 'z')); else p.set(x, 5, z, 'spruce_planks');
  }
  for (let x = 4; x <= 8; x++) for (const z of [3, 7]) if ((x - 3) % 2 === 1) p.set(x, 3, z, 'spruce_trapdoor', trapdoor(z === 3 ? 'north' : 'south', 'bottom', false));
  p.air(6, 2, 3); p.air(6, 3, 3);
  pitchedRoof(p, l, { walls: { x0: 3, z0: 3, x1: 9, z1: 7 }, y: 6, kind: 'walm', ridge: 'x', overhang: 2, seed: 3 });
  for (const [x, z] of [[1, 1], [11, 1], [1, 9], [11, 9]] as const) p.fill(x, 2, z, x, 4, z, 'dark_oak_fence');
  p.set(6, 1, 0, 'spruce_stairs', stairs('south'));
  hangLantern(p, l, 6, 4, 5); p.set(4, 2, 5, 'white_carpet'); p.set(5, 2, 5, 'white_carpet'); p.set(7, 2, 5, 'white_carpet');
  bed(p, 8, 2, 4, 'white', 'south'); p.set(4, 2, 6, 'barrel', barrel('up')); p.set(4, 2, 4, 'potted_bamboo');
  p.set(2, 2, 2, 'potted_bamboo'); p.set(10, 2, 8, 'potted_azalea_bush');
  return p.payload();
}

/** Round mud hut with acacia posts, a thatched cone of hay and a deep eave on fence posts. */
function rundhuette() {
  const p = new Plot([11, 11, 11]);
  p.disc(5, 5, 0, 5, 'packed_mud'); p.disc(5, 5, 0, 4, 'coarse_dirt');
  for (let y = 1; y <= 3; y++) p.disc(5, 5, y, 4, null);
  for (let y = 1; y <= 3; y++) p.disc(5, 5, y, 4, 'mud_bricks', {}, true);
  for (const [x, z] of [[1, 5], [9, 5], [5, 9], [2, 2], [8, 2], [2, 8], [8, 8]] as const) p.fill(x, 1, z, x, 3, z, 'stripped_acacia_log', axis('y'));
  p.fill(5, 1, 1, 5, 2, 1, null); door(p, 5, 1, 1, 'acacia', 'south');
  for (const [x, z, f] of [[1, 3, 'west'], [9, 7, 'east']] as const) {
    p.set(x, 2, z, 'glass_pane', pane); putFree(p, x + (f === 'west' ? -1 : 1), 2, z - 1, 'acacia_trapdoor', trapdoor(f, 'bottom', true)); putFree(p, x + (f === 'west' ? -1 : 1), 2, z + 1, 'acacia_trapdoor', trapdoor(f, 'bottom', true));
  }
  // Thatch: eave ring of hay slabs (acacia slabs under), then a hay cone.
  p.disc(5, 5, 4, 5.4, 'hay_block', axis('y')); p.disc(5, 5, 4, 4, null);
  for (let i = 1; i <= 4; i++) p.disc(5, 5, 4 + i, 5.2 - i * 1.15, 'hay_block', axis('y'), i < 4);
  for (let i = 0; i <= 4; i++) p.disc(5, 5, 4 + i, 3.8 - i * 1.15, null);
  p.fill(5, 9, 5, 5, 10, 5, 'acacia_fence');
  for (const [x, z] of [[0, 5], [10, 5], [5, 10], [5, 0]] as const) p.fill(x, 1, z, x, 3, z, 'acacia_fence');
  p.set(5, 0, 0, 'acacia_stairs', stairs('south'));
  bed(p, 7, 1, 4, 'orange', 'south'); p.set(3, 1, 6, 'barrel', barrel('up')); p.set(3, 1, 4, 'crafting_table'); p.set(6, 1, 7, 'decorated_pot', { cracked: F, facing: 'north', waterlogged: F });
  hangLantern(p, null, 5, 3, 5);
  return p.payload();
}

const CHALET_LOOK: Look = lookWith(LOOKS.nordisch, {
  base: [['stone_bricks', 8], ['mossy_stone_bricks', 3], ['cobblestone', 2], ['andesite', 2]], baseStairs: 'stone_brick_stairs', baseSlab: 'stone_brick_slab', baseWall: 'stone_brick_wall',
  wall: [['spruce_planks', 6], ['stripped_spruce_wood', 1]], frame: 'stripped_spruce_log', roof: [['dark_oak_planks', 3], ['spruce_planks', 1]], roofStairs: 'dark_oak_stairs', roofSlab: 'dark_oak_slab', trim: 'spruce',
});
/** Mountain chalet: stone ground floor, timber upper floor with a balcony around, wide gable roof and a fireplace. */
function chalet() {
  const p = new Plot([13, 2, 13]), l = CHALET_LOOK;
  const h = house(p, l, { at: { x0: 2, z0: 2, x1: 10, z1: 10 }, storeys: [{ h: 4, kind: 'stein' }, { h: 4, kind: 'fachwerk' }], postEvery: 4, windowEvery: 2,
    roof: { kind: 'sattel', ridge: 'z', overhang: 2 }, flowerBoxes: true, door: { side: 'north' }, chimney: { x: 3, z: 10 }, seed: 13 });
  // Balcony on the front and the back: slab deck on brackets, fence railing.
  const yb = h.floors[1]!;
  for (const z of [1, 11]) {
    for (let x = 1; x <= 11; x++) {
      p.set(x, yb, z, 'spruce_slab', slab('top'));
      if (x % 2 === 1) putFree(p, x, yb - 1, z, 'spruce_stairs', stairs(z === 1 ? 'south' : 'north', 'top'));
      p.set(x, yb + 1, z, 'spruce_fence');
    }
  }
  doorKit(p, l, 6, yb + 1, 2, 'north', { step: false, lamp: false });
  p.set(6, yb + 1, 1, 'air' === 'air' ? 'spruce_slab' : 'spruce_slab', slab('top')); p.air(6, yb + 1, 1);
  for (let y = 1; y <= yb; y++) p.set(9, y, 9, 'ladder', ladder('west'));
  p.set(4, 1, 9, 'campfire', campfire('north')); p.set(3, 1, 9, 'cobblestone'); p.set(5, 1, 9, 'cobblestone');
  p.set(9, 1, 3, 'chest', chest('west')); p.set(9, 1, 4, 'furnace', furnace('west')); p.set(3, 1, 3, 'crafting_table');
  bed(p, 8, yb + 1, 7, 'red', 'south'); bed(p, 4, yb + 1, 7, 'red', 'south'); p.set(6, yb + 1, 9, 'chest', chest('north'));
  p.set(6, 4, 6, 'lantern', lantern(true)); p.set(6, h.ceiling - 1, 6, 'lantern', lantern(true));
  return p.payload();
}

const LANG_LOOK: Look = lookWith(LOOKS.nordisch, {
  base: [['cobblestone', 6], ['mossy_cobblestone', 2], ['cobbled_deepslate', 2]], baseStairs: 'cobblestone_stairs', baseSlab: 'cobblestone_slab', baseWall: 'cobblestone_wall',
  wall: [['stripped_spruce_wood', 3], ['spruce_planks', 2], ['spruce_log', 1]], frame: 'spruce_log',
  roof: [['spruce_planks', 3], ['dark_oak_planks', 1]], roofStairs: 'spruce_stairs', roofSlab: 'spruce_slab', trim: 'dark_oak',
});
/** Viking longhouse: low log walls, a steep hall roof open inside, central hearth and crossed gable posts. */
function langhaus() {
  const p = new Plot([11, 2, 19]), l = LANG_LOOK;
  const h = house(p, l, { at: { x0: 2, z0: 1, x1: 8, z1: 17 }, storeys: [{ h: 3, kind: 'fachwerk' }], plinth: 1, postEvery: 4, windowEvery: 4,
    roof: { kind: 'sattel', ridge: 'z', overhang: 1, pitch: 'steil' }, door: { side: 'north' }, openCeiling: true, noShutters: true, seed: 17 });
  // Crossed gable posts ("dragon heads") above both ridge ends.
  for (const z of [0, 18]) { const top = h.roofTop; putFree(p, 4, top + 1, z, 'dark_oak_fence'); putFree(p, 6, top + 1, z, 'dark_oak_fence'); p.set(5, top + 1, z, 'dark_oak_fence'); putFree(p, 5, top + 2, z, 'dark_oak_fence'); }
  for (let z = 7; z <= 11; z++) p.set(5, 0, z, z === 9 ? 'cobblestone' : 'cobblestone_slab', z === 9 ? {} : slab());
  p.set(5, 1, 9, 'campfire', campfire('north'));
  for (const z of [3, 5, 12, 14]) bed(p, 3, 1, z, 'brown', 'west');
  for (const z of [3, 14]) bed(p, 7, 1, z, 'brown', 'east');
  p.set(7, 1, 16, 'chest', chest('north')); p.set(6, 1, 16, 'chest', chest('north')); p.set(3, 1, 16, 'barrel', barrel('up')); p.set(4, 1, 16, 'smithing_table');
  for (const z of [5, 13]) hangLantern(p, l, 5, 4, z);
  return p.payload();
}

/** Bright birch beach house on stilts with a veranda, a window front and a sky-blue ridge. */
function strandhaus() {
  const p = new Plot([13, 2, 11]);
  const l = lookWith(woodLook('birch', [['birch_planks', 1]]), { wall: [['birch_planks', 5], ['stripped_birch_wood', 1]], frame: 'stripped_birch_log',
    roof: [['birch_planks', 1]], roofStairs: 'birch_stairs', roofSlab: 'birch_slab', trim: 'spruce', base: [['birch_planks', 1]], baseStairs: 'birch_stairs', baseSlab: 'birch_slab', baseWall: 'birch_fence' });
  for (let x = 0; x <= 12; x++) for (let z = 0; z <= 10; z++) p.set(x, 0, z, 'sand');
  for (const [x, z] of [[1, 2], [11, 2], [1, 9], [11, 9], [6, 2], [6, 9]] as const) p.fill(x, 1, z, x, 2, z, 'stripped_birch_log', axis('y'));
  for (let x = 1; x <= 11; x++) for (let z = 2; z <= 9; z++) p.set(x, 3, z, 'birch_planks');
  house(p, l, { at: { x0: 3, z0: 4, x1: 9, z1: 9 }, y0: 3, storeys: [{ h: 3, kind: 'fachwerk' }], postEvery: 6, windowEvery: 1,
    roof: { kind: 'walm', ridge: 'x', overhang: 1 }, door: { side: 'north' }, noShutters: true, seed: 19 });
  // Sky-blue ridge.
  let top = 0;
  for (let y = 0; y < 30; y++) for (let x = 0; x <= 12; x++) if (p.get(x, y, 6)?.id.startsWith('minecraft:birch_s')) top = Math.max(top, y);
  for (let x = 0; x <= 12; x++) for (let z = 0; z <= 10; z++) { const s = p.get(x, top, z); if (s && s.id.startsWith('minecraft:birch_s')) p.set(x, top, z, 'light_blue_concrete'); }
  for (let x = 1; x <= 11; x++) if (x !== 6) p.set(x, 4, 2, 'birch_fence');
  for (let z = 3; z <= 9; z++) { p.set(1, 4, z, 'birch_fence'); p.set(11, 4, z, 'birch_fence'); }
  p.set(6, 1, 0, 'birch_stairs', stairs('south')); p.set(6, 2, 1, 'birch_stairs', stairs('south'));
  p.set(2, 4, 3, 'potted_dead_bush'); p.set(10, 4, 3, 'barrel', barrel('up'));
  bed(p, 8, 4, 7, 'light_blue', 'south'); p.set(4, 4, 8, 'chest', chest('north')); p.set(5, 4, 8, 'barrel', barrel('up')); p.set(6, 6, 6, 'lantern', lantern(true));
  p.set(0, 1, 9, 'dead_bush');
  return p.payload();
}

/** Two offset concrete cubes: framed glass front, cantilevered roof slabs, planters and a roof terrace. */
function wuerfelhaus() {
  const p = new Plot([11, 11, 11]);
  p.fill(0, 0, 0, 10, 0, 10, 'smooth_stone');
  p.room(1, 1, 9, 9, 1, 3, 'white_concrete');
  for (let x = 2; x <= 8; x++) for (let y = 1; y <= 3; y++) if (x !== 5) p.set(x, y, 1, x % 2 === 1 ? 'light_gray_concrete' : 'glass_pane', x % 2 === 1 ? {} : pane);
  for (let z = 3; z <= 7; z++) for (let y = 2; y <= 3; y++) p.set(9, y, z, z % 2 === 1 ? 'light_gray_concrete' : 'glass_pane', z % 2 === 1 ? {} : pane);
  door(p, 5, 1, 1, 'iron', 'south'); p.set(5, 3, 1, 'light_gray_concrete');
  p.fill(1, 4, 1, 9, 4, 9, 'white_concrete');
  for (let x = 0; x <= 10; x++) for (let z = 0; z <= 10; z++) if (x === 0 || x === 10 || z === 0 || z === 10) p.set(x, 4, z, 'smooth_stone_slab', slab('top'));
  p.room(2, 2, 7, 7, 5, 7, 'gray_concrete');
  for (let z = 3; z <= 6; z++) for (let y = 5; y <= 6; y++) p.set(7, y, z, 'glass_pane', { ...pane, north: T, south: T });
  for (let x = 3; x <= 6; x++) p.set(x, 6, 2, 'glass_pane', { ...pane, east: T, west: T });
  p.fill(2, 8, 2, 7, 8, 7, 'white_concrete');
  for (let x = 1; x <= 8; x++) for (let z = 1; z <= 8; z++) if (x === 1 || x === 8 || z === 1 || z === 8) p.set(x, 8, z, 'smooth_stone_slab', slab('top'));
  for (let x = 1; x <= 9; x++) { p.set(x, 5, 9, 'glass_pane'); } for (let z = 1; z <= 8; z++) { if (z >= 2 && z <= 7) continue; p.set(9, 5, z, 'glass_pane'); }
  for (let z = 2; z <= 8; z++) p.set(9, 5, z, 'glass_pane'); for (let x = 8; x <= 9; x++) p.set(x, 5, 1, 'glass_pane');
  for (const x of [2, 3, 7, 8]) { p.set(x, 0, 0, 'moss_block'); p.set(x, 1, 0, x % 2 === 0 ? 'azalea' : 'flowering_azalea'); }
  bed(p, 3, 5, 4, 'black', 'south'); p.set(6, 1, 8, 'crafting_table'); p.set(7, 1, 8, 'smoker', furnace('north')); p.set(8, 1, 8, 'chest', chest('north'));
  p.fill(2, 1, 8, 2, 4, 8, 'ladder', ladder('north'));
  p.set(5, 3, 5, 'sea_lantern'); p.set(4, 7, 4, 'sea_lantern');
  return p.payload();
}

/** Mangrove stilt house over the mud: platform with a veranda, ladder, roots and a timber hut. */
function stelzenhaus() {
  const p = new Plot([11, 2, 11]), l = LOOKS.sumpf;
  for (let x = 0; x <= 10; x++) for (let z = 0; z <= 10; z++) p.set(x, 0, z, 'mud');
  for (const [x, z] of [[1, 1], [9, 1], [1, 9], [9, 9], [5, 1]] as const) {
    p.fill(x, 0, z, x, 3, z, 'mangrove_log', axis('y'));
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) putFree(p, x + dx, 1, z + dz, 'mangrove_roots');
  }
  for (const [x, z] of [[3, 4], [6, 0], [7, 6]] as const) p.set(x, 0, z, 'water', water()); // Pfützen im Schlamm, nicht darauf (sonst läuft das Wasser über den Boden)
  for (let x = 1; x <= 9; x++) for (let z = 1; z <= 9; z++) p.set(x, 4, z, 'mangrove_planks');
  house(p, l, { at: { x0: 2, z0: 3, x1: 8, z1: 8 }, y0: 4, storeys: [{ h: 3, kind: 'fachwerk' }], postEvery: 3, windowEvery: 3,
    roof: { kind: 'sattel', ridge: 'x', overhang: 1 }, door: { side: 'north' }, flowerBoxes: false, seed: 23 });
  for (let y = 1; y <= 4; y++) p.set(5, y, 0, 'ladder', ladder('north'));
  for (let x = 1; x <= 9; x++) if (x !== 5) p.set(x, 5, 1, 'mangrove_fence');
  for (const x of [1, 9]) p.set(x, 5, 2, 'mangrove_fence');
  p.set(1, 6, 1, 'lantern', lantern()); p.set(9, 6, 1, 'lantern', lantern());
  bed(p, 6, 5, 6, 'green', 'south'); p.set(3, 5, 7, 'chest', chest('north')); p.set(3, 5, 4, 'crafting_table'); p.set(5, 7, 6, 'lantern', lantern(true));
  return p.payload();
}

const LEHM_LOOK: Look = lookWith(LOOKS.wueste, {
  base: [['packed_mud', 3], ['mud_bricks', 2]], baseStairs: 'mud_brick_stairs', baseSlab: 'mud_brick_slab', baseWall: 'mud_brick_wall',
  wall: [['mud_bricks', 6], ['packed_mud', 1]], frame: 'stripped_acacia_log', shutter: 'acacia', trim: 'acacia', floor: 'packed_mud',
});
/** Mud brick house: flat roof with a crenellated parapet, protruding roof beams, shutters and a roof terrace. */
function lehmhaus() {
  const p = new Plot([11, 2, 11]), l = LEHM_LOOK;
  house(p, l, { at: { x0: 1, z0: 1, x1: 9, z1: 9 }, storeys: [{ h: 3, kind: 'wand' }], windowEvery: 4, windowH: 1,
    roof: { kind: 'flach', ridge: 'x' }, door: { side: 'north' }, seed: 29 });
  // Vigas: roof beams sticking out of the walls under the roof edge.
  for (let x = 2; x <= 8; x += 2) { putFree(p, x, 3, 0, 'stripped_acacia_log', axis('z')); putFree(p, x, 3, 10, 'stripped_acacia_log', axis('z')); }
  for (let z = 3; z <= 7; z += 2) { putFree(p, 0, 3, z, 'stripped_acacia_log', axis('x')); putFree(p, 10, 3, z, 'stripped_acacia_log', axis('x')); }
  for (let x = 1; x <= 9; x++) for (const z of [1, 9]) if (x % 2 === 0) p.set(x, 6, z, 'mud_brick_wall');
  for (let z = 2; z <= 8; z++) for (const x of [1, 9]) if (z % 2 === 0) p.set(x, 6, z, 'mud_brick_wall');
  for (let x = 2; x <= 4; x++) for (let z = 6; z <= 8; z++) p.set(x, 5, z, 'acacia_slab', slab());
  p.set(3, 6, 7, 'acacia_fence'); p.set(3, 7, 7, 'white_carpet');
  for (let y = 1; y <= 4; y++) p.set(8, y, 8, 'ladder', ladder('north'));
  bed(p, 2, 1, 7, 'orange', 'south'); p.set(7, 1, 2, 'barrel', barrel('up')); p.set(2, 1, 2, 'decorated_pot', { cracked: F, facing: 'north', waterlogged: F }); p.set(5, 3, 5, 'lantern', lantern(true));
  p.set(6, 5, 3, 'potted_cactus'); p.set(7, 5, 3, 'potted_dead_bush');
  return p.payload();
}

/** Big tree house: round platform in a dark oak, railing, ladder up the trunk, framed hut with a hipped roof. */
function baumhausGross() {
  const p = new Plot([15, 2, 15]), l = lookWith(LOOKS.nordisch, { base: [['dark_oak_planks', 1]], baseStairs: 'dark_oak_stairs', baseSlab: 'dark_oak_slab', baseWall: 'dark_oak_fence',
    wall: [['spruce_planks', 5], ['stripped_spruce_wood', 1]], frame: 'stripped_dark_oak_log', roof: [['spruce_planks', 1]], roofStairs: 'spruce_stairs', roofSlab: 'spruce_slab', trim: 'dark_oak' });
  p.fill(6, 0, 6, 8, 0, 8, 'grass_block', grass());
  p.fill(7, 1, 7, 7, 15, 7, 'dark_oak_log', axis('y')); p.fill(6, 1, 7, 6, 3, 7, 'dark_oak_log', axis('y')); p.fill(8, 1, 7, 8, 3, 7, 'dark_oak_log', axis('y')); p.fill(7, 1, 6, 7, 2, 6, 'dark_oak_log', axis('y'));
  for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]] as const) p.set(7 + dx * 2, 5, 7 + dz * 2, 'dark_oak_wood', axis('y'));
  p.disc(7, 7, 6, 6, 'dark_oak_planks'); p.set(7, 6, 7, 'dark_oak_log', axis('y'));
  for (let x = 0; x <= 14; x++) for (let z = 0; z <= 14; z++) if (p.get(x, 6, z)?.id === 'minecraft:dark_oak_planks' && !p.has(x, 5, z) && (x + z) % 3 === 0) p.set(x, 5, z, 'dark_oak_stairs', stairs(x < 7 ? 'east' : 'west', 'top'));
  p.disc(7, 7, 7, 6, 'dark_oak_fence', {}, true);
  house(p, l, { at: { x0: 4, z0: 4, x1: 10, z1: 10 }, y0: 6, storeys: [{ h: 3, kind: 'fachwerk' }], postEvery: 3, windowEvery: 3,
    roof: { kind: 'walm', ridge: 'x', overhang: 1 }, door: { side: 'north' }, flowerBoxes: false, seed: 31 });
  p.set(7, 7, 7, 'dark_oak_log', axis('y')); p.set(7, 8, 7, 'dark_oak_log', axis('y')); p.set(7, 9, 7, 'dark_oak_log', axis('y'));
  p.blob(7, 17, 7, 6, 2.5, 6, 'dark_oak_leaves', leaves()); p.fill(7, 10, 7, 7, 16, 7, 'dark_oak_log', axis('y'));
  for (let y = 1; y <= 6; y++) p.set(7, y, 8, 'ladder', ladder('south'));
  p.air(7, 6, 8);
  bed(p, 9, 7, 6, 'lime', 'south'); p.set(5, 7, 9, 'chest', chest('east')); p.set(5, 7, 5, 'crafting_table'); p.set(6, 9, 6, 'lantern', lantern(true));
  for (const [x, z] of [[1, 7], [13, 7]] as const) p.set(x, 8, z, 'lantern', lantern());
  return p.payload();
}

function erdhaus() {
  const p = new Plot([11, 6, 9]);
  p.blob(5, 0, 4, 5, 4, 4, 'grass_block', grass(), false, (_x, y) => y >= 0);
  p.blob(5, 0, 4, 3.6, 2.6, 2.6, 'dirt', {}, true, (_x, y) => y >= 0 && y < 3);
  p.fill(2, 0, 2, 8, 0, 6, 'oak_planks'); p.fill(2, 1, 2, 8, 2, 6, null); p.fill(3, 3, 3, 7, 3, 5, null);
  p.fill(4, 1, 0, 6, 2, 1, null); p.fill(4, 0, 0, 6, 0, 1, 'oak_planks');
  p.disc(5, 1, 1, 1, null);
  door(p, 5, 1, 1, 'oak', 'south'); p.set(4, 1, 1, 'oak_log', axis('y')); p.set(6, 1, 1, 'oak_log', axis('y')); p.set(4, 2, 1, 'oak_log', axis('y')); p.set(6, 2, 1, 'oak_log', axis('y'));
  p.fill(4, 3, 1, 6, 3, 1, 'oak_log', axis('x'));
  p.set(3, 2, 1, 'glass'); p.set(7, 2, 1, 'glass');
  bed(p, 7, 1, 5, 'green', 'west'); p.set(3, 1, 6, 'crafting_table'); p.set(4, 1, 6, 'furnace', furnace('north')); p.set(3, 1, 3, 'chest', chest('east'));
  p.set(5, 3, 4, 'lantern', lantern(true));
  p.set(2, 4, 4, 'oxeye_daisy'); p.set(8, 4, 5, 'poppy');
  return p.payload();
}



function jurte() {
  const p = new Plot([9, 7, 9]);
  p.disc(4, 4, 0, 4, 'spruce_planks'); p.tube(4, 4, 4, 1, 2, 'white_wool');
  for (let i = 0; i < 3; i++) p.disc(4, 4, 3 + i, 4 - i * 1.3, i === 2 ? 'light_gray_wool' : 'white_wool', {}, i < 2);
  p.disc(4, 4, 3, 3, null); p.set(4, 5, 4, 'glass'); p.set(4, 6, 4, 'spruce_slab', slab());
  for (let y = 1; y <= 2; y++) { p.set(4, y, 0, 'red_wool'); }
  p.air(4, 1, 0); p.air(4, 2, 0);
  for (const [x, z] of [[0, 4], [8, 4], [4, 8]] as const) p.set(x, 2, z, 'red_wool');
  p.set(4, 1, 4, 'campfire', campfire('north')); p.set(4, 0, 4, 'cobblestone');
  bed(p, 7, 1, 3, 'white', 'south'); p.set(1, 1, 3, 'chest', chest('east')); p.set(1, 1, 5, 'loom', facing('east'));
  for (const [x, z] of [[2, 6], [6, 6]] as const) p.set(x, 1, z, 'red_carpet');
  return p.payload();
}


function pilzhaus() {
  const p = new Plot([11, 13, 11]);
  p.fill(0, 0, 0, 10, 0, 10, 'mycelium', grass());
  p.tube(5, 5, 3, 1, 6, 'mushroom_stem', mushroom());
  p.fill(5, 1, 2, 5, 2, 2, null); door(p, 5, 1, 2, 'crimson', 'south');
  p.set(3, 3, 3, 'glass'); p.set(7, 3, 7, 'glass'); p.fill(2, 4, 2, 8, 4, 8, 'mushroom_stem', mushroom()); p.fill(3, 4, 3, 7, 4, 7, 'oak_planks');
  for (let i = 0; i < 4; i++) p.disc(5, 5, 7 + i, 5 - i * 1.1, 'red_mushroom_block', mushroom(), i < 3);
  p.disc(5, 5, 7, 4, null);
  for (const [x, y, z] of [[2, 9, 5], [6, 10, 3], [7, 8, 8], [4, 9, 8]] as const) p.set(x, y, z, 'white_concrete');
  p.fill(7, 1, 5, 7, 6, 5, 'ladder', ladder('west'));
  bed(p, 3, 5, 5, 'red', 'south'); p.set(5, 1, 7, 'crafting_table'); p.set(4, 1, 7, 'chest', chest('north')); p.set(5, 3, 5, 'shroomlight');
  p.set(1, 1, 8, 'red_mushroom'); p.set(9, 1, 2, 'brown_mushroom');
  return p.payload();
}


function hausboot() {
  const p = new Plot([7, 8, 14]);
  for (let z = 0; z < 14; z++) {
    const w = z < 2 ? 1 : z > 11 ? 2 : 3;
    for (let x = 3 - w; x <= 3 + w; x++) { p.set(x, 0, z, 'spruce_planks'); if (x === 3 - w || x === 3 + w || z === 0 || z === 13) p.set(x, 1, z, 'spruce_planks'); }
    p.fill(3 - w + 1, 1, z, 3 + w - 1, 1, z, 'spruce_slab', slab('top'));
    if (z !== 0 && z !== 13) for (let x = 3 - w + 1; x <= 3 + w - 1; x++) p.set(x, 1, z, 'spruce_slab', slab('top'));
  }
  p.room(1, 4, 5, 10, 2, 3, 'oak_planks');
  for (const [x, z] of [[1, 4], [5, 4], [1, 10], [5, 10]] as const) p.fill(x, 2, z, x, 3, z, 'oak_log', axis('y'));
  door(p, 3, 2, 4, 'oak', 'south'); p.set(1, 3, 7, 'glass_pane', pane); p.set(5, 3, 7, 'glass_pane', pane);
  gableRoof(p, 0, 6, 4, 10, 4, 'dark_oak_stairs', 'oak_planks', 'dark_oak_slab');
  bed(p, 4, 2, 8, 'cyan', 'south'); p.set(2, 2, 9, 'barrel', barrel('up')); p.set(2, 2, 6, 'chest', chest('east')); p.set(3, 3, 7, 'lantern', lantern(true));
  p.set(3, 2, 1, 'lantern', lantern()); p.set(3, 2, 12, 'spruce_fence'); p.set(3, 3, 12, 'lantern', lantern());
  return p.payload();
}


const STARTER: BuildingSpec[] = WOOD_PALETTES.map(w => ({
  id: `bld_starterhaus_${w.key}`, name: `Starterhaus (${w.label})`, payload: starterhaus(w), tags: ['erste-nacht', 'klein', 'starter'],
  description: `Kompaktes 7×7-Haus aus ${w.label} für die erste Nacht: Bett, Werkbank, Ofen, zwei Truhen und Satteldach.`,
  facets: { kategorie: ['wohnhaus'], stil: ['rustikal'], biom: [...w.biome], funktion: ['wohnen', 'lagern'] },
  family: { id: 'starterhaus', label: 'Starterhaus', variant: w.label },
  tips: ['Zuerst Boden und Eckpfosten setzen, dann Wände Reihe für Reihe – das Dach zuletzt.', 'Ein Bett setzt den Spawnpunkt; Fackeln außen verhindern Monster vor der Tür.'],
}));

export const WOHNEN_SPECS: readonly BuildingSpec[] = [
  ...STARTER,
  { id: 'bld_stadthaus', name: 'Stadthaus', payload: stadthaus, tags: ['stadt', 'zweistöckig', 'schmal'],
    description: 'Schmales Stadthaus: Ziegel im Erdgeschoss, Fachwerk darüber, steiles Schieferdach mit Schornstein.',
    facets: { kategorie: ['wohnhaus'], stil: ['mittelalterlich', 'klassisch'], biom: ['ebene', 'ueberall'], funktion: ['wohnen', 'lagern'] },
    tips: ['Mehrere Stadthäuser Wand an Wand ergeben eine Häuserzeile – Breite 7 passt auf ein Gassenraster.'] },
  { id: 'bld_bauernhaus', name: 'Bauernhaus', payload: bauernhaus, tags: ['hof', 'küche', 'lang'],
    description: 'Langes Bauernhaus mit Bruchsteinsockel, Küche mit Räucherofen und Komposter, Schlafkammer.',
    facets: { kategorie: ['wohnhaus'], stil: ['rustikal'], biom: ['ebene', 'savanne'], funktion: ['wohnen', 'landwirtschaft'] } },
  { id: 'bld_fischerhuette', name: 'Fischerhütte', payload: fischerhuette, tags: ['pfahlbau', 'steg', 'angeln'],
    description: 'Hütte auf Pfählen mit Veranda zum Wasser, Fass für den Fang und Laterne am Geländer.',
    facets: { kategorie: ['wohnhaus'], stil: ['kuestenstil', 'rustikal'], biom: ['kueste', 'sumpf'], funktion: ['wohnen'] } },
  { id: 'bld_erdhaus', name: 'Erdhaus', payload: erdhaus, tags: ['hobbit', 'hügel', 'versteckt'],
    description: 'In einen Grashügel gebautes Wohnhaus mit Rundtür-Rahmen aus Stämmen und Fenstern im Hang.',
    facets: { kategorie: ['wohnhaus'], stil: ['fantasy', 'rustikal'], biom: ['ebene', 'wald'], funktion: ['wohnen'] } },
  { id: 'bld_japanhaus', name: 'Japanisches Haus', payload: japanhaus, tags: ['japan', 'walmdach', 'veranda'],
    description: 'Haus auf Steinsockel mit Engawa-Veranda, Papierwänden aus weißer Wolle, Schwarzeichen-Rahmen und geschwungenem Walmdach.',
    facets: { kategorie: ['wohnhaus'], stil: ['fernoestlich'], biom: ['kirschhain', 'wald'], funktion: ['wohnen'] } },
  { id: 'bld_rundhuette', name: 'Rundhütte', payload: rundhuette, tags: ['rund', 'stroh', 'savanne'],
    description: 'Runde Lehmhütte mit Strohdach aus Heuballen und Akazienpfosten.',
    facets: { kategorie: ['wohnhaus'], stil: ['rustikal'], biom: ['savanne', 'wueste'], funktion: ['wohnen'] } },
  { id: 'bld_chalet', name: 'Berg-Chalet', payload: chalet, tags: ['alpen', 'balkon', 'kamin'],
    description: 'Zweistöckiges Chalet mit Steinsockel, umlaufendem Balkon, großem Giebelfenster und offenem Kamin.',
    facets: { kategorie: ['wohnhaus'], stil: ['nordisch', 'rustikal'], biom: ['gebirge', 'schnee', 'taiga'], funktion: ['wohnen', 'aussicht'] } },
  { id: 'bld_langhaus', name: 'Wikinger-Langhaus', payload: langhaus, tags: ['wikinger', 'halle', 'feuerstelle'],
    description: 'Langes Hallenhaus aus liegenden Fichtenstämmen mit zentraler Feuerstelle, sechs Betten und Drachen-Giebelpfosten.',
    facets: { kategorie: ['wohnhaus'], stil: ['nordisch'], biom: ['taiga', 'schnee', 'kueste'], funktion: ['wohnen', 'versammlung'] } },
  { id: 'bld_jurte', name: 'Jurte', payload: jurte, tags: ['zelt', 'rund', 'nomaden'],
    description: 'Runde Woll-Jurte mit Rauchöffnung, Feuerstelle, Webstuhl und Teppichen.',
    facets: { kategorie: ['wohnhaus'], stil: ['rustikal'], biom: ['ebene', 'savanne', 'schnee'], funktion: ['wohnen'] } },
  { id: 'bld_strandhaus', name: 'Strandhaus', payload: strandhaus, tags: ['strand', 'veranda', 'birke'],
    description: 'Helles Birkenhaus auf Stelzen über dem Sand, mit Veranda, Fensterfront und himmelblauem Dachfirst.',
    facets: { kategorie: ['wohnhaus'], stil: ['kuestenstil', 'modern'], biom: ['kueste'], funktion: ['wohnen', 'aussicht'] } },
  { id: 'bld_wuerfelhaus', name: 'Würfelhaus', payload: wuerfelhaus, tags: ['modern', 'glasfront', 'loft'],
    description: 'Zwei versetzte Betonwürfel mit Glasfront, Dachterrasse mit Glasgeländer und Seelaterne als Deckenlicht.',
    facets: { kategorie: ['wohnhaus'], stil: ['modern'], biom: ['ebene', 'ueberall'], funktion: ['wohnen', 'aussicht'] } },
  { id: 'bld_stelzenhaus', name: 'Mangroven-Stelzenhaus', payload: stelzenhaus, tags: ['sumpf', 'stelzen', 'leiter'],
    description: 'Mangrovenholzhaus auf hohen Stämmen über dem Schlamm, mit Leiter und Umgang.',
    facets: { kategorie: ['wohnhaus'], stil: ['rustikal', 'tropisch'], biom: ['sumpf'], funktion: ['wohnen'] }, gaps: ['minecraft:water'] },
  { id: 'bld_pilzhaus', name: 'Pilzhaus', payload: pilzhaus, tags: ['pilz', 'märchen', 'rund'],
    description: 'Märchenhaus im Riesenpilz: Stiel als Wohnturm, roter Hut mit weißen Punkten als Dach, Pilzlicht innen.',
    facets: { kategorie: ['wohnhaus'], stil: ['fantasy'], biom: ['pilzinsel', 'sumpf', 'wald'], funktion: ['wohnen'] } },
  { id: 'bld_lehmhaus', name: 'Lehmhaus', payload: lehmhaus, tags: ['lehm', 'flachdach', 'dachterrasse'],
    description: 'Lehmziegelhaus mit Flachdach, Zinnenmauer, Sitzplatz auf dem Dach und Klappläden.',
    facets: { kategorie: ['wohnhaus'], stil: ['wuestenstil'], biom: ['wueste', 'savanne', 'badlands'], funktion: ['wohnen'] } },
  { id: 'bld_hausboot', name: 'Hausboot', payload: hausboot, tags: ['boot', 'schwimmend', 'fluss'],
    description: 'Flaches Hausboot mit spitzem Bug, Kajüte mit Bett und Truhe und Laternen an Bug und Heck.',
    facets: { kategorie: ['fahrzeug'], stil: ['kuestenstil', 'rustikal'], biom: ['kueste', 'ozean', 'sumpf'], funktion: ['wohnen'] },
    tips: ['Ins Wasser setzen: y 0 liegt auf der Wasseroberfläche.'] },
  { id: 'bld_baumhaus_gross', name: 'Großes Baumhaus', payload: baumhausGross, tags: ['baum', 'plattform', 'walmdach'],
    description: 'Haus auf einer runden Plattform in einer Schwarzeiche, mit Geländer, Leiter im Stamm und dichter Krone.',
    facets: { kategorie: ['wohnhaus'], stil: ['rustikal', 'fantasy'], biom: ['wald', 'dschungel'], funktion: ['wohnen', 'aussicht'] },
    inspiration: [WIKI('Dark_Forest', 'Dunkelwald')] },
];
