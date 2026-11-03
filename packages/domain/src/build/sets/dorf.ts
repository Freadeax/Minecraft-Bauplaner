import { Plot, axis, barrel, bed, door, facing, furnace, grass, lantern, lectern, slab, ladder, chest, campfire, stairs, trapdoor, water, F, T } from '../plot.js';
import type { Props } from '../plot.js';
import { WIKI } from '../spec.js';
import { beltCourse, column, hangLantern, ladderUp, house, LOOKS, lookWith, pick, pitchedRoof, put, putFree } from '../style.js';
import type { Look, Mix } from '../style.js';
import type { BuildingSpec } from '../spec.js';
import { stableHypot } from '../../../../voxel/src/stableMath.js';

/** Dorf: one workshop per villager profession, market stalls and the buildings of a village centre. */


interface Profession {
  readonly key: string; readonly label: string; readonly job: string; readonly station: string; readonly stationProps?: Props;
  readonly wood: string; readonly roof: string; readonly wall: string; readonly extra: (p: Plot) => void; readonly note: string;
}
const PROFESSIONS: readonly Profession[] = [
  { key: 'bibliothekar', label: 'Bibliothek', job: 'Bibliothekar', station: 'lectern', stationProps: lectern('south'), wood: 'oak', roof: 'dark_oak', wall: 'white_terracotta',
    extra: p => { p.fill(2, 1, 7, 6, 3, 7, 'bookshelf'); p.set(2, 1, 5, 'bookshelf'); p.set(6, 1, 5, 'bookshelf'); }, note: 'Verzauberte Bücher handeln – Mending ist der begehrteste Tausch.' },
  { key: 'kartograf', label: 'Kartenzeichnerei', job: 'Kartograf', station: 'cartography_table', wood: 'birch', roof: 'spruce', wall: 'birch_planks',
    extra: p => { p.set(2, 1, 7, 'chest', { facing: 'north', type: 'single', waterlogged: F }); p.set(6, 2, 7, 'white_wool'); }, note: 'Verkauft Erkundungskarten zu Ozeanmonumenten und Waldanwesen.' },
  { key: 'pfeilmacher', label: 'Pfeilmacherei', job: 'Pfeilmacher', station: 'fletching_table', wood: 'spruce', roof: 'spruce', wall: 'spruce_planks',
    extra: p => { p.set(2, 1, 7, 'hay_block', axis('y')); p.set(6, 1, 7, 'barrel', barrel('up')); }, note: 'Kauft Stöcke – mit einer Baumfarm eine verlässliche Smaragdquelle.' },
  { key: 'steinmetz', label: 'Steinmetzhütte', job: 'Steinmetz', station: 'stonecutter', stationProps: facing('south'), wood: 'oak', roof: 'stone_brick', wall: 'stone_bricks',
    extra: p => { p.set(2, 1, 7, 'chiseled_stone_bricks'); p.set(6, 1, 7, 'polished_andesite'); p.set(6, 2, 7, 'polished_granite'); }, note: 'Kauft Ton und Stein, verkauft Quarz und glasierte Keramik.' },
  { key: 'schaefer', label: 'Schäferei', job: 'Schäfer', station: 'loom', stationProps: facing('south'), wood: 'oak', roof: 'birch', wall: 'oak_planks',
    extra: p => { for (const [x, c] of [[1, 'white'], [2, 'red'], [4, 'yellow'], [5, 'blue']] as const) p.set(x + 1, 1, 7, `${c}_wool`); }, note: 'Kauft Wolle in allen Farben, verkauft Banner und Gemälde.' },
  { key: 'gerber', label: 'Gerberei', job: 'Gerber', station: 'water_cauldron', stationProps: { level: '3' }, wood: 'acacia', roof: 'acacia', wall: 'acacia_planks',
    extra: p => { p.set(2, 1, 7, 'barrel', barrel('up')); p.set(6, 1, 7, 'brown_carpet'); p.set(5, 1, 7, 'brown_carpet'); }, note: 'Verkauft Lederrüstung und Sattel.' },
  { key: 'metzger', label: 'Metzgerei', job: 'Metzger', station: 'smoker', stationProps: furnace('south'), wood: 'spruce', roof: 'dark_oak', wall: 'smooth_stone',
    extra: p => { p.set(2, 1, 7, 'barrel', barrel('up')); p.set(6, 1, 7, 'campfire', { facing: 'north', lit: T, signal_fire: F, waterlogged: F }); }, note: 'Kauft Kohle, Hühner und Kaninchen, verkauft Gebratenes.' },
  { key: 'fischer', label: 'Fischerei', job: 'Fischer', station: 'barrel', stationProps: barrel('up'), wood: 'oak', roof: 'spruce', wall: 'oak_planks',
    extra: p => { p.set(2, 1, 7, 'barrel', barrel('north')); p.set(6, 1, 7, 'barrel', barrel('north')); p.set(6, 2, 7, 'barrel', barrel('up')); }, note: 'Kauft Fisch und Kohle – ideal neben einer Angelstelle.' },
  { key: 'werkzeugschmied', label: 'Werkzeugschmiede', job: 'Werkzeugschmied', station: 'smithing_table', wood: 'oak', roof: 'stone_brick', wall: 'cobblestone',
    extra: p => { p.set(2, 1, 7, 'anvil', facing('east')); p.set(6, 1, 7, 'furnace', furnace('north')); }, note: 'Verkauft verzauberte Diamantwerkzeuge auf Meisterstufe.' },
  { key: 'waffenschmied', label: 'Waffenschmiede', job: 'Waffenschmied', station: 'grindstone', stationProps: { face: 'floor', facing: 'south' }, wood: 'dark_oak', roof: 'dark_oak', wall: 'cobblestone',
    extra: p => { p.set(2, 1, 7, 'anvil', facing('east')); p.set(6, 1, 7, 'blast_furnace', furnace('north')); }, note: 'Verkauft verzauberte Äxte und Schwerter.' },
  { key: 'ruestungsschmied', label: 'Rüstungsschmiede', job: 'Rüstungsschmied', station: 'blast_furnace', stationProps: furnace('south'), wood: 'spruce', roof: 'deepslate_tile', wall: 'stone_bricks',
    extra: p => { p.set(2, 1, 7, 'anvil', facing('east')); p.set(6, 1, 7, 'lava_cauldron'); }, note: 'Verkauft Diamantrüstung; Kauf von Eisen hebt die Stufe schnell.' },
  { key: 'bauer', label: 'Bauernhütte', job: 'Bauer', station: 'composter', wood: 'oak', roof: 'oak', wall: 'oak_planks',
    extra: p => { p.set(2, 1, 7, 'hay_block', axis('y')); p.set(6, 1, 7, 'barrel', barrel('up')); }, note: 'Kauft Weizen, Kartoffeln, Karotten, Rote Bete, Kürbis und Melonen.' },
];

/** Look of a workshop from its wood, wall and roof material (LIB-05). */
function workshopLook(pr: Profession): { look: Look; masonry: boolean } {
  const w = pr.wood, masonry = /stone|cobble|bricks/.test(pr.wall);
  const roofKey = pr.roof === 'stone_brick' || pr.roof === 'deepslate_tile' ? pr.roof : pr.roof;
  const roofBlock: Mix = roofKey === 'stone_brick' ? [['stone_bricks', 4], ['mossy_stone_bricks', 1]] : roofKey === 'deepslate_tile' ? [['deepslate_tiles', 5], ['cracked_deepslate_tiles', 1]] : [[`${roofKey}_planks`, 1]];
  const wall: Mix = pr.wall === 'stone_bricks' ? [['stone_bricks', 8], ['mossy_stone_bricks', 2], ['cracked_stone_bricks', 2], ['andesite', 1]]
    : pr.wall === 'cobblestone' ? [['cobblestone', 7], ['mossy_cobblestone', 2], ['andesite', 2], ['stone', 1]]
    : pr.wall === 'smooth_stone' ? [['smooth_stone', 5], ['stone', 2], ['andesite', 1]]
    : pr.wall === 'white_terracotta' ? [['white_terracotta', 5], ['calcite', 2], ['diorite', 1]]
    : pr.wall.endsWith('_planks') ? [[pr.wall, 5], [`stripped_${pr.wall.replace('_planks', '')}_wood`, 1]] : [[pr.wall, 1]];
  const trim = w === 'dark_oak' ? 'spruce' : w === 'oak' || w === 'birch' ? 'spruce' : 'dark_oak';
  const look: Look = {
    key: `werkstatt_${pr.key}`, label: pr.label,
    base: [['cobblestone', 7], ['mossy_cobblestone', 2], ['andesite', 2], ['stone', 1]], baseStairs: 'cobblestone_stairs', baseSlab: 'cobblestone_slab', baseWall: 'cobblestone_wall',
    wall: masonry ? wall : wall, frame: `stripped_${w}_log`,
    roof: roofBlock, roofStairs: `${roofKey}_stairs`, roofSlab: `${roofKey}_slab`,
    trim, shutter: w, door: w, floor: `${w}_planks`, window: 'glass_pane', light: 'lantern',
  };
  return { look: masonry ? lookWith(look, { base: wall }) : look, masonry };
}

/** Workshop: plinth and frame (or masonry), shop window with a counter, porch roof over the door, job block inside. */
function werkstatt(pr: Profession, i: number) {
  return () => {
    const p = new Plot([9, 2, 11]), { look: l, masonry } = workshopLook(pr), w = pr.wood;
    const ridge = i % 2 === 0 ? 'z' : 'x';
    for (let x = 0; x <= 8; x++) for (let z = 0; z <= 1; z++) p.set(x, 0, z, (x + z * 3) % 4 === 0 ? 'coarse_dirt' : 'dirt_path');
    house(p, l, { at: { x0: 1, z0: 2, x1: 7, z1: 8 }, storeys: [{ h: 4, kind: masonry ? 'stein' : 'fachwerk' }], plinth: 1, postEvery: 3, windowEvery: 3,
      roof: { kind: i % 3 === 2 ? 'krueppelwalm' : 'sattel', ridge, overhang: 1, pitch: i % 4 === 3 ? 'steil' : 'normal' }, flowerBoxes: !masonry, door: { side: 'north', at: 3 },
      chimney: /schmied|metzger|steinmetz/.test(pr.key) ? { x: 7, z: 8 } : null, seed: i * 7 + 1, noWindow: (x, _y, z) => z === 2 && x >= 5 });
    // Shop window right of the door: open counter with a trim slab sill and an awning of trapdoors.
    for (const x of [5, 6]) { p.air(x, 2, 2); p.air(x, 3, 2); p.set(x, 1, 2, `${w}_planks`); p.set(x, 2, 2, `${l.trim}_slab`, slab('bottom')); p.set(x, 4, 1, `${l.trim}_trapdoor`, trapdoor('north', 'top', false)); }
    p.set(5, 4, 2, `${l.trim}_stairs`, stairs('south', 'top')); p.set(6, 4, 2, `${l.trim}_stairs`, stairs('south', 'top'));
    // Porch roof over the door: slabs on two brackets.
    for (const x of [2, 3, 4]) p.set(x, 4, 1, `${l.trim}_slab`, slab('bottom'));
    putFree(p, 2, 3, 1, `${l.trim}_stairs`, stairs('east', 'top')); putFree(p, 4, 3, 1, `${l.trim}_stairs`, stairs('west', 'top'));
    p.set(3, 1, 4, pr.station, pr.stationProps ?? {});
    pr.extra(p);
    hangLantern(p, l, 4, 4, 5);
    p.set(0, 1, 0, `${w}_fence`); p.set(0, 2, 0, 'lantern', lantern()); p.set(8, 1, 0, 'barrel', barrel('up'));
    return p.payload();
  };
}

function marktbude(color: string) {
  return () => {
    const p = new Plot([5, 5, 4]);
    for (const [x, z] of [[0, 0], [4, 0], [0, 3], [4, 3]] as const) p.fill(x, 0, z, x, 2, z, 'spruce_fence');
    for (let x = 0; x <= 4; x++) for (let z = 0; z <= 3; z++) p.set(x, 3, z, x % 2 ? 'white_wool' : `${color}_wool`);
    for (let x = 1; x <= 3; x++) p.set(x, 0, 1, 'spruce_slab', slab('top'));
    const goods: Readonly<Record<string, readonly [string, Props]>> = { red: ['melon', {}], blue: ['barrel', barrel('up')], green: ['pumpkin', {}], yellow: ['hay_block', axis('y')] };
    const [good, goodProps] = goods[color]!;
    p.set(1, 1, 1, good, goodProps);
    p.set(3, 1, 1, 'barrel', barrel('up')); p.set(2, 1, 2, 'chest', { facing: 'south', type: 'single', waterlogged: F });
    p.set(2, 2, 2, 'lantern', lantern(true));
    return p.payload();
  };
}

const TAVERNE_LOOK: Look = lookWith(LOOKS.fachwerk, { frame: 'stripped_dark_oak_log', trim: 'dark_oak', shutter: 'spruce', door: 'dark_oak',
  roof: [['spruce_planks', 1]], roofStairs: 'spruce_stairs', roofSlab: 'spruce_slab' });
/** Tavern: L-shaped, stone ground floor and jettied timber floor, half-hipped roof with a cross gable, beer garden. */
function taverne() {
  const p = new Plot([17, 2, 15]), l = TAVERNE_LOOK;
  const h = house(p, l, { at: { x0: 2, z0: 2, x1: 12, z1: 9 }, storeys: [{ h: 4, kind: 'stein' }, { h: 4, kind: 'fachwerk' }], jetty: 1, jettySides: ['north', 'west'],
    wings: [{ at: { x0: 9, z0: 9, x1: 14, z1: 13 }, ridge: 'z', storeys: 1 }], postEvery: 2, windowEvery: 2,
    roof: { kind: 'krueppelwalm', ridge: 'x', overhang: 1, pitch: 'steil' }, flowerBoxes: true, door: { side: 'north', at: 7 }, chimney: { x: 12, z: 5 }, seed: 41 });
  const yu = h.floors[1]! + 1;
  // Hanging tavern sign: fence bracket with a barrel.
  p.set(4, 4, 1, 'dark_oak_fence'); p.set(4, 4, 0, 'dark_oak_fence'); p.set(4, 3, 0, 'barrel', barrel('north'));
  // Taproom: counter of slabs on barrels, tables with stair benches.
  for (let x = 8; x <= 11; x++) { p.set(x, 1, 6, 'barrel', barrel('north')); p.set(x, 2, 6, 'spruce_slab', slab()); }
  for (let x = 8; x <= 11; x++) { p.set(x, 1, 8, 'barrel', barrel('north')); p.set(x, 2, 8, 'barrel', barrel('north')); }
  for (const [x, z] of [[4, 4], [4, 7]] as const) { p.set(x, 1, z, 'spruce_fence'); p.set(x, 2, z, 'spruce_pressure_plate', { powered: F }); p.set(x - 1, 1, z, 'spruce_stairs', stairs('east')); p.set(x + 1, 1, z, 'spruce_stairs', stairs('west')); }
  for (let y = 1; y < yu; y++) p.set(3, y, 8, 'ladder', ladder('north'));
  p.set(11, 1, 4, 'campfire', campfire('west'));
  // Back room in the wing: kitchen.
  p.set(13, 1, 12, 'smoker', furnace('north')); p.set(12, 1, 12, 'furnace', furnace('north')); p.set(11, 1, 12, 'crafting_table'); p.set(10, 1, 12, 'barrel', barrel('up'));
  // Guest rooms upstairs.
  for (const x of [5, 8, 11]) bed(p, x, yu, 7, 'red', 'south');
  p.set(2, yu, 3, 'chest', chest('east')); p.set(7, yu, 3, 'barrel', barrel('up'));
  for (const [x, z] of [[5, 5], [10, 4]] as const) hangLantern(p, l, x, yu - 2, z);
  hangLantern(p, l, 8, h.ceiling - 1, 5);
  // Beer garden west of the wing: fence, benches, lantern posts.
  for (let x = 1; x <= 7; x++) for (let z = 11; z <= 14; z++) p.set(x, 0, z, (x * 3 + z) % 5 ? 'grass_block' : 'coarse_dirt', (x * 3 + z) % 5 ? grass() : {});
  for (let x = 1; x <= 7; x++) p.set(x, 1, 14, 'spruce_fence');
  for (const z of [11, 12, 13]) p.set(1, 1, z, 'spruce_fence');
  for (const x of [3, 6]) { p.set(x, 1, 12, 'spruce_fence'); p.set(x, 2, 12, 'spruce_pressure_plate', { powered: F }); p.set(x, 1, 13, 'spruce_stairs', stairs('north')); }
  p.set(1, 2, 14, 'lantern', lantern()); p.set(7, 2, 14, 'lantern', lantern());
  return p.payload();
}

const RAT_LOOK: Look = lookWith(LOOKS.stein, {
  base: [['stone_bricks', 8], ['mossy_stone_bricks', 2], ['cracked_stone_bricks', 1], ['andesite', 1]], baseStairs: 'stone_brick_stairs', baseSlab: 'stone_brick_slab', baseWall: 'stone_brick_wall',
  wall: [['smooth_quartz', 5], ['calcite', 2], ['diorite', 1]], frame: 'quartz_pillar',
  roof: [['deepslate_tiles', 5], ['cracked_deepslate_tiles', 1]], roofStairs: 'deepslate_tile_stairs', roofSlab: 'deepslate_tile_slab', trim: 'dark_oak', shutter: 'spruce', door: 'spruce',
});
/** Town hall: rusticated base, quartz upper floor, columned portico with a pediment, hipped roof and a clock tower. */
function rathaus() {
  const p = new Plot([17, 2, 15]), l = RAT_LOOK;
  // Raised terrace with steps.
  for (let x = 0; x <= 16; x++) for (let z = 0; z <= 14; z++) put(p, x, 0, z, pick(l.base, x, 0, z, 5));
  for (let x = 5; x <= 11; x++) p.set(x, 0, 0, 'stone_brick_stairs', stairs('north'));
  const h = house(p, l, { at: { x0: 1, z0: 4, x1: 15, z1: 13 }, y0: 1, storeys: [{ h: 5, kind: 'stein' }, { h: 4, kind: 'wand' }], windowEvery: 2, windowH: 2,
    roof: { kind: 'walm', ridge: 'x', overhang: 1 }, door: { side: 'north', at: 8 }, noShutters: true, seed: 5 });
  beltCourse(p, l, { x0: 1, z0: 4, x1: 15, z1: 13 }, h.floors[1]!);
  // Portico: four columns, entablature, a stepped pediment.
  for (const x of [4, 6, 10, 12]) column(p, x, 1, 1, 7, 'quartz_pillar', 'chiseled_quartz_block', 'quartz_stairs');
  for (let x = 3; x <= 13; x++) for (let z = 1; z <= 3; z++) { put(p, x, 8, z, 'smooth_quartz'); }
  for (let x = 3; x <= 13; x++) putFree(p, x, 8, 0, 'quartz_stairs', stairs('south', 'top'));
  for (let i = 0; i <= 3; i++) for (let x = 3 + i * 2; x <= 13 - i * 2; x++) for (let z = 1; z <= 3; z++) {
    const edge = x <= 3 + i * 2 + 1 || x >= 13 - i * 2 - 1;
    put(p, x, 9 + i, z, edge ? 'deepslate_tile_stairs' : 'deepslate_tiles', edge ? stairs(x < 8 ? 'east' : 'west') : {});
  }
  for (let x = 4; x <= 12; x++) putFree(p, x, 9, 0, 'deepslate_tile_slab', slab());
  // Clock tower on the ridge.
  const ty = h.roofTop - 1;
  for (let y = ty; y <= ty + 6; y++) for (let x = 6; x <= 10; x++) for (let z = 7; z <= 10; z++) {
    const ring = x === 6 || x === 10 || z === 7 || z === 10;
    if (!ring) { p.air(x, y, z); continue; }
    put(p, x, y, z, (x === 6 || x === 10) && (z === 7 || z === 10) ? 'quartz_pillar' : pick(l.wall, x, y, z, 5), (x === 6 || x === 10) && (z === 7 || z === 10) ? axis('y') : {});
  }
  for (const [x, z] of [[8, 7]] as const) { p.set(x, ty + 4, z, 'black_concrete'); p.set(x - 1, ty + 4, z, 'gold_block'); p.set(x + 1, ty + 4, z, 'gold_block'); p.set(x, ty + 5, z, 'gold_block'); p.set(x, ty + 3, z, 'gold_block'); }
  for (const x of [7, 9]) for (const z of [10]) { p.set(x, ty + 4, z, 'iron_bars'); p.set(x, ty + 5, z, 'iron_bars'); }
  pitchedRoof(p, l, { walls: { x0: 6, z0: 7, x1: 10, z1: 10 }, y: ty + 7, kind: 'walm', ridge: 'x', overhang: 1, pitch: 'steil', seed: 5 });
  p.set(8, ty + 4, 9, 'bell', { attachment: 'ceiling', facing: 'north', powered: F });
  p.set(8, ty + 5, 9, 'oak_planks');
  // Council hall.
  for (let x = 5; x <= 11; x++) p.set(x, 2, 12, 'dark_oak_planks'); p.set(8, 2, 11, 'lectern', lectern('north'));
  for (const x of [4, 5, 6, 10, 11, 12]) for (const z of [7, 9]) p.set(x, 2, z, 'spruce_stairs', stairs('north'));
  for (const [x, z] of [[4, 8], [12, 8], [8, 6]] as const) hangLantern(p, l, x, 5, z);
  for (let y = 2; y <= h.floors[1]!; y++) p.set(14, y, 12, 'ladder', ladder('west'));
  p.set(2, h.floors[1]! + 1, 12, 'chest', chest('north')); p.set(8, h.floors[1]! + 1, 8, 'cartography_table');
  return p.payload();
}

/** Tower windmill: mixed stone base with a skirt, timber upper drum, conical cap, four sails with frames and cloth. */
function windmuehle() {
  const p = new Plot([15, 23, 11]);
  const stone: Mix = [['cobblestone', 6], ['mossy_cobblestone', 2], ['stone_bricks', 2], ['andesite', 1]];
  for (let y = 0; y <= 9; y++) for (let x = 0; x <= 14; x++) for (let z = 0; z <= 10; z++) {
    const d = stableHypot(x - 7, z - 5), r = 3.6 - (y > 6 ? 0.4 : 0);
    if (d <= r && d > r - 1.2) p.set(x, y, z, y === 0 ? 'cobblestone' : pick(stone, x, y, z, 2));
    else if (d <= r - 1.2) { if (y === 0) p.set(x, y, z, 'spruce_planks'); else p.air(x, y, z); }
  }
  for (let x = 0; x <= 14; x++) for (let z = 0; z <= 10; z++) { const d = stableHypot(x - 7, z - 5); if (d > 3.6 && d <= 4.5) { const dx = 7 - x, dz = 5 - z; p.set(x, 1, z, 'cobblestone_stairs', stairs(Math.abs(dx) >= Math.abs(dz) ? (dx > 0 ? 'east' : 'west') : (dz > 0 ? 'south' : 'north'))); } }
  // Timber drum with a gallery.
  for (let y = 10; y <= 14; y++) for (let x = 0; x <= 14; x++) for (let z = 0; z <= 10; z++) {
    const d = stableHypot(x - 7, z - 5);
    if (d <= 3.2 && d > 2.1) { const id = y === 10 || (x + z) % 3 === 0 ? 'stripped_spruce_wood' : 'spruce_planks'; p.set(x, y, z, id, id === 'spruce_planks' ? {} : axis('y')); }
    else if (d <= 2.1) { if (y === 10) p.set(x, y, z, 'spruce_planks'); else p.air(x, y, z); }
  }
  for (let x = 0; x <= 14; x++) for (let z = 0; z <= 10; z++) { const d = stableHypot(x - 7, z - 5); if (d > 3.2 && d <= 4.6) { p.set(x, 10, z, 'spruce_slab', slab('top')); if (d > 3.7) p.set(x, 11, z, 'spruce_fence'); } }
  // Cap: cone of dark oak stairs.
  for (let i = 0; i < 4; i++) for (let x = 0; x <= 14; x++) for (let z = 0; z <= 10; z++) {
    const d = stableHypot(x - 7, z - 5), r = 3.9 - i * 1.05;
    if (d <= r && d > r - 1.1) { const dx = 7 - x, dz = 5 - z; p.set(x, 15 + i, z, 'dark_oak_stairs', stairs(Math.abs(dx) >= Math.abs(dz) ? (dx > 0 ? 'east' : 'west') : (dz > 0 ? 'south' : 'north'))); }
    else if (d <= r - 1.1) p.air(x, 15 + i, z);
  }
  p.set(7, 19, 5, 'dark_oak_planks'); p.set(7, 20, 5, 'dark_oak_fence'); p.set(7, 21, 5, 'dark_oak_fence');
  // Door and windows.
  p.air(7, 1, 2); p.air(7, 2, 2); door(p, 7, 1, 2, 'spruce', 'south'); p.set(7, 3, 2, 'spruce_stairs', stairs('south', 'top'));
  for (const [x, y, z] of [[4, 5, 5], [10, 7, 5], [7, 12, 2]] as const) { p.set(x, y, z, 'glass_pane'); }
  // Axle and sails on the back (wind from the south).
  p.fill(7, 13, 8, 7, 13, 10, 'stripped_spruce_log', axis('z'));
  for (let i = 1; i <= 7; i++) for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
    const x = 7 + dx * i, y = 13 + dy * i;
    if (y < 1) continue;
    p.set(x, y, 10, 'spruce_fence');
    if (i >= 2) { const cx = x + (dy !== 0 ? dy : 0), cy = y + (dx !== 0 ? -dx : 0); p.set(cx, cy, 10, i % 3 === 0 ? 'spruce_planks' : 'white_wool'); }
  }
  ladderUp(p, 5, 5, 1, 9, 'north');
  p.set(9, 1, 6, 'barrel', barrel('up')); p.set(9, 1, 4, 'hay_block', axis('y')); p.set(9, 2, 4, 'hay_block', axis('y')); p.set(6, 1, 4, 'composter');
  hangLantern(p, null, 7, 8, 5);
  return p.payload();
}

const LAGER_LOOK: Look = lookWith(LOOKS.backstein, { wall: [['spruce_planks', 5], ['stripped_spruce_wood', 1]], frame: 'spruce_log', roof: [['dark_oak_planks', 1]], roofStairs: 'dark_oak_stairs', roofSlab: 'dark_oak_slab', trim: 'spruce' });
/** Warehouse: hall on a stone plinth, big gate with a hoist beam, loft hatch, steep gable roof. */
function lagerhaus() {
  const p = new Plot([13, 2, 11]), l = LAGER_LOOK;
  house(p, l, { at: { x0: 1, z0: 1, x1: 11, z1: 9 }, storeys: [{ h: 5, kind: 'fachwerk' }], plinth: 2, postEvery: 5, windowEvery: 4,
    roof: { kind: 'sattel', ridge: 'x', overhang: 1, pitch: 'steil' }, door: null, seed: 43, noWindow: (x, _y, z) => z === 1 && x >= 4 && x <= 8 });
  // Gate.
  for (let x = 5; x <= 7; x++) for (let y = 1; y <= 4; y++) p.air(x, y, 1);
  for (let x = 4; x <= 8; x++) put(p, x, 5, 1, 'spruce_log', axis('x'));
  for (const x of [5, 7]) p.set(x, 4, 0, 'spruce_trapdoor', trapdoor('north', 'top', true));
  p.set(4, 4, 0, 'spruce_stairs', stairs('east', 'top')); p.set(8, 4, 0, 'spruce_stairs', stairs('west', 'top'));
  // Hoist beam with chain and barrel above the gate.
  p.set(6, 8, 0, 'spruce_fence'); p.set(6, 8, 1, 'spruce_planks');
  p.set(6, 7, 0, 'iron_chain', { axis: 'y', waterlogged: F }); p.set(6, 6, 0, 'barrel', barrel('up'));
  for (let x = 2; x <= 10; x++) { p.set(x, 1, 8, 'chest', chest('north', x % 2 ? 'left' : 'right')); p.set(x, 2, 8, 'barrel', barrel('north')); }
  p.set(10, 1, 8, 'barrel', barrel('north'));
  for (let z = 3; z <= 7; z++) { p.set(2, 1, z, 'barrel', barrel('east')); p.set(10, 1, z, 'barrel', barrel('west')); }
  p.set(6, 1, 5, 'crafting_table'); hangLantern(p, l, 6, 4, 5);
  for (const x of [0, 12]) p.set(x, 1, 0, 'hay_block', axis('y'));
  return p.payload();
}

function dorfplatz() {
  const p = new Plot([15, 6, 15]);
  for (let x = 0; x < 15; x++) for (let z = 0; z < 15; z++) {
    const d = stableHypot(x - 7, z - 7);
    p.set(x, 0, z, d < 6.5 ? ((x + z) % 3 ? 'cobblestone' : 'stone_bricks') : (x === 7 || z === 7 ? 'dirt_path' : 'grass_block'), d >= 6.5 && x !== 7 && z !== 7 ? grass() : {});
  }
  p.disc(7, 7, 1, 2, 'stone_brick_wall', {}, true); p.disc(7, 7, 0, 1, 'water', water()); p.set(7, 1, 7, 'chiseled_stone_bricks'); p.set(7, 2, 7, 'lantern', lantern());
  p.fill(7, 0, 7, 7, 0, 7, 'water', water()); p.set(7, 0, 6, 'water', water()); p.set(7, 0, 8, 'water', water()); p.set(6, 0, 7, 'water', water()); p.set(8, 0, 7, 'water', water());
  for (const [x, z] of [[2, 2], [12, 2], [2, 12], [12, 12]] as const) { p.fill(x, 1, z, x, 2, z, 'spruce_fence'); p.set(x, 3, z, 'lantern', lantern()); }
  for (const [x, z, f] of [[4, 2, 'north'], [10, 12, 'south']] as const) for (let i = 0; i < 3; i++) p.set(x + i, 1, z, 'spruce_stairs', stairs(f));
  p.set(11, 1, 4, 'oak_log', axis('y')); p.set(11, 2, 4, 'oak_fence'); p.set(11, 3, 4, 'oak_planks');
  for (const [x, z] of [[1, 6], [13, 8], [6, 13], [8, 1]] as const) { p.set(x, 0, z, 'grass_block', grass()); p.set(x, 1, z, (x + z) % 2 ? 'poppy' : 'dandelion'); }
  for (const [x, z] of [[0, 0], [14, 14]] as const) { p.set(x, 1, z, 'oak_leaves', { distance: '1', persistent: T, waterlogged: F }); }
  return p.payload();
}

function dorfmauerTor() {
  const p = new Plot([9, 7, 3]);
  p.fill(0, 0, 0, 8, 0, 2, 'cobblestone');
  p.fill(0, 1, 1, 2, 4, 1, 'cobblestone'); p.fill(6, 1, 1, 8, 4, 1, 'cobblestone');
  p.fill(3, 4, 1, 5, 4, 1, 'spruce_log', axis('x')); p.fill(2, 5, 0, 6, 5, 2, 'spruce_slab', slab());
  p.set(3, 1, 1, 'spruce_fence_gate', { facing: 'south', in_wall: F, open: F, powered: F }); p.set(4, 1, 1, 'spruce_fence_gate', { facing: 'south', in_wall: F, open: F, powered: F }); p.set(5, 1, 1, 'spruce_fence_gate', { facing: 'south', in_wall: F, open: F, powered: F });
  for (const x of [0, 8]) p.set(x, 5, 1, 'lantern', lantern());
  for (const x of [2, 6]) p.set(x, 3, 0, 'wall_torch', facing('north'));
  return p.payload();
}

const WERKSTAETTEN: BuildingSpec[] = PROFESSIONS.map((pr, i) => ({
  id: `bld_werkstatt_${pr.key}`, name: `Werkstatt: ${pr.label}`, payload: werkstatt(pr, i), tags: ['dorf', 'beruf', pr.job.toLowerCase()],
  description: `Kleine Werkstatt mit Arbeitsblock für den Beruf ${pr.job} (${pr.station.replace(/_/g, ' ')}), Vorplatz mit Laternen und passender Einrichtung.`,
  facets: { kategorie: ['handwerk'], stil: ['mittelalterlich', 'rustikal'], biom: ['ueberall'], funktion: ['handwerk', 'handelsplatz'] },
  family: { id: 'dorfwerkstatt', label: 'Dorfwerkstatt', variant: pr.job },
  assumed: /cauldron/.test(pr.station) || pr.key === 'ruestungsschmied' ? ['minecraft:cauldron', 'minecraft:dirt'] : ['minecraft:dirt'],
  tips: [`Ein arbeitsloser Dorfbewohner in Reichweite des Arbeitsblocks wird ${pr.job}.`, pr.note], inspiration: [WIKI('Villager', 'Dorfbewohner')],
}));
const BUDEN: BuildingSpec[] = (([['red', 'Rot'], ['blue', 'Blau'], ['green', 'Grün'], ['yellow', 'Gelb']]) as const).map(([c, label]) => ({
  id: `bld_marktbude_${c}`, name: `Marktbude (${label})`, payload: marktbude(c), tags: ['markt', 'klein', 'bude'],
  description: `Offene Marktbude mit gestreiftem Wolldach in ${label}/Weiß, Theke, Kiste und Hängelaterne.`,
  facets: { kategorie: ['handel'], stil: ['mittelalterlich'], biom: ['ueberall'], funktion: ['handel', 'deko'] },
  family: { id: 'marktbude', label: 'Marktbude', variant: label },
}));

export const DORF_SPECS: readonly BuildingSpec[] = [
  ...WERKSTAETTEN,
  ...BUDEN,
  { id: 'bld_taverne', name: 'Taverne', payload: taverne, tags: ['gasthaus', 'zweistöckig', 'schank'],
    description: 'Zweistöckige Taverne mit Schankraum, Fässertheke, Tischen, Kamin und drei Gästebetten im Obergeschoss.',
    facets: { kategorie: ['handel'], stil: ['mittelalterlich'], biom: ['ebene', 'wald', 'ueberall'], funktion: ['versammlung', 'wohnen', 'unterhaltung'] } },
  { id: 'bld_rathaus', name: 'Rathaus', payload: rathaus, tags: ['stadt', 'uhrturm', 'säulen'],
    description: 'Repräsentatives Rathaus mit Säulenfront aus Quarz, Ratssaal mit Lesepult und mittigem Uhrturm.',
    facets: { kategorie: ['wahrzeichen'], stil: ['klassisch'], biom: ['ueberall'], funktion: ['versammlung', 'orientierung'] } },
  { id: 'bld_windmuehle', name: 'Windmühle', payload: windmuehle, tags: ['mühle', 'flügel', 'turm'],
    description: 'Runde Turmwindmühle aus Bruchstein mit Holzkappe und vier Segelflügeln; Lager für Heu und Getreide.',
    facets: { kategorie: ['landwirtschaft'], stil: ['rustikal', 'mittelalterlich'], biom: ['ebene', 'savanne'], funktion: ['landwirtschaft', 'lagern', 'orientierung'] } },
  { id: 'bld_lagerhaus', name: 'Lagerhaus', payload: lagerhaus, tags: ['lager', 'truhen', 'tor'],
    description: 'Hallenlager mit breitem Tor, Doppeltruhenreihe und Fasswänden – 26 Lagerplätze ohne Umbau.',
    facets: { kategorie: ['handel'], stil: ['rustikal'], biom: ['ueberall'], funktion: ['lagern'] },
    tips: ['Fässer brauchen keinen freien Block darüber – sie lassen sich stapeln.'] },
  { id: 'bld_dorfplatz', name: 'Dorfplatz', payload: dorfplatz, tags: ['platz', 'mittelpunkt', 'brunnen'],
    description: 'Gepflasterter Dorfplatz mit rundem Brunnen, vier Laternen, Bänken und Wegen in alle Richtungen.',
    facets: { kategorie: ['dekoration'], stil: ['mittelalterlich'], biom: ['ueberall'], funktion: ['versammlung', 'wasserquelle'] }, gaps: ['minecraft:water'], assumed: ['minecraft:dirt'] },
  { id: 'bld_dorftor', name: 'Dorftor', payload: dorfmauerTor, tags: ['tor', 'eingang', 'mauer'],
    description: 'Einfaches Dorftor aus Bruchstein mit Zauntoren, Holzsturz, Laternen und Fackeln.',
    facets: { kategorie: ['befestigung'], stil: ['mittelalterlich', 'rustikal'], biom: ['ueberall'], funktion: ['verteidigung', 'verbindung'] } },
];
