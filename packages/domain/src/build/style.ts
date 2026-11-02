import { axis, lantern, noise, OPPOSITE, slab, stairs, trapdoor, F } from './plot.js';
import type { H, Plot, Props } from './plot.js';

/**
 * Gestaltungsbaukasten (LIB-05 Baustil). Rules derived from studying finished
 * builds (docs/architecture/BAUSTIL.md): mixed materials instead of one block
 * per surface, relief in front of and behind the wall plane, upside-down stairs
 * as brackets and lintels, open trapdoors as shutters, roofs with overhang,
 * soffit, verge boards and a thick body, storeys that jetty out, stone plinths.
 *
 * Everything is deterministic (position hash, no Math.random) and only writes
 * states of the B7 catalogue, so buildings stay rotatable and mirrorable.
 * Helpers never throw on cells outside the plot; they skip them, so a design
 * can ask for overhangs without first checking the margin.
 */

// ------------------------------------------------------------ materials
/** Weighted material mix: `[block, weight]`; picked per cell by a position hash. */
export type Mix = readonly (readonly [string, number])[];

const hash = (x: number, y: number, z: number, seed: number): number => {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(z | 0, 0x9e3779b1) ^ Math.imul(seed | 0, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
};

/** Picks one block of a mix for a cell. Same cell and seed ⇒ same block. */
export function pick(mix: Mix, x: number, y: number, z: number, seed = 0): string {
  if (mix.length === 1) return mix[0]![0];
  const total = mix.reduce((s, [, w]) => s + w, 0);
  let n = hash(x, y, z, seed) * total;
  for (const [id, w] of mix) { if (n < w) return id; n -= w; }
  return mix[mix.length - 1]![0];
}
/** A single block as a mix. */
export const solid = (id: string): Mix => [[id, 1]];

export const isAxialBlock = (id: string): boolean => /(_log|_stem|_wood|_hyphae|_pillar|basalt|bamboo_block|hay_block|bone_block)$/.test(id);

/**
 * A complete look: which block plays which role. Wood keys (`trim`, `shutter`,
 * `door`) name a wood family whose `_stairs`, `_slab`, `_trapdoor`, `_fence`
 * and `_door` exist.
 */
export interface Look {
  readonly key: string;
  readonly label: string;
  /** Plinth / ground floor masonry. */
  readonly base: Mix;
  readonly baseStairs: string;
  readonly baseSlab: string;
  readonly baseWall: string;
  /** Wall infill (plaster, planks, bricks). */
  readonly wall: Mix;
  /** Posts and beams (logs get an axis). */
  readonly frame: string;
  /** Roof body (full blocks under the stairs) and roof surface. */
  readonly roof: Mix;
  readonly roofStairs: string;
  readonly roofSlab: string;
  /** Wood family for eaves, verge boards, brackets, lintels and sills. */
  readonly trim: string;
  /** Wood family for shutters and flower boxes. */
  readonly shutter: string;
  readonly door: string;
  readonly floor: string;
  readonly window: string;
  readonly light: string;
}

const wood = (w: string, part: 'stairs' | 'slab' | 'trapdoor' | 'fence' | 'planks' | 'door'): string =>
  part === 'planks' ? (w === 'bamboo' ? 'bamboo_planks' : `${w}_planks`) : `${w}_${part}`;
export const trimStairs = (l: Look): string => wood(l.trim, 'stairs');
export const trimSlab = (l: Look): string => wood(l.trim, 'slab');
export const trimFence = (l: Look): string => wood(l.trim, 'fence');

const MOSSY_STONE: Mix = [['stone_bricks', 10], ['mossy_stone_bricks', 3], ['cracked_stone_bricks', 2], ['andesite', 2], ['cobblestone', 1]];
const COBBLE: Mix = [['cobblestone', 8], ['mossy_cobblestone', 3], ['andesite', 2], ['stone', 1]];
const DEEP: Mix = [['deepslate_bricks', 8], ['cracked_deepslate_bricks', 2], ['cobbled_deepslate', 2], ['deepslate_tiles', 1]];

/** The looks of the catalogue; generator styles map onto them in `lookOfStyle`. */
export const LOOKS = {
  /** Plaster between spruce posts over a mossy stone plinth, slate roof with dark oak trim (studied medieval houses). */
  fachwerk: { key: 'fachwerk', label: 'Fachwerk hell', base: MOSSY_STONE, baseStairs: 'stone_brick_stairs', baseSlab: 'stone_brick_slab', baseWall: 'stone_brick_wall',
    wall: [['calcite', 6], ['white_concrete', 2], ['diorite', 2]], frame: 'stripped_spruce_log',
    roof: [['deepslate_tiles', 5], ['cracked_deepslate_tiles', 1]], roofStairs: 'deepslate_tile_stairs', roofSlab: 'deepslate_tile_slab',
    trim: 'dark_oak', shutter: 'spruce', door: 'spruce', floor: 'spruce_planks', window: 'glass_pane', light: 'lantern' },
  /** Dark timber with brick infill, red-brown roof. */
  backstein: { key: 'backstein', label: 'Fachwerk Backstein', base: COBBLE, baseStairs: 'cobblestone_stairs', baseSlab: 'cobblestone_slab', baseWall: 'cobblestone_wall',
    wall: [['bricks', 6], ['granite', 1], ['terracotta', 1]], frame: 'stripped_dark_oak_log',
    roof: [['spruce_planks', 1]], roofStairs: 'spruce_stairs', roofSlab: 'spruce_slab',
    trim: 'dark_oak', shutter: 'spruce', door: 'dark_oak', floor: 'oak_planks', window: 'glass_pane', light: 'lantern' },
  /** Spruce log house on dark stone, slate roof. */
  nordisch: { key: 'nordisch', label: 'Nordisch', base: DEEP, baseStairs: 'deepslate_brick_stairs', baseSlab: 'deepslate_brick_slab', baseWall: 'deepslate_brick_wall',
    wall: [['spruce_planks', 6], ['stripped_spruce_wood', 1]], frame: 'spruce_log',
    roof: [['deepslate_tiles', 4], ['cobbled_deepslate', 1]], roofStairs: 'deepslate_tile_stairs', roofSlab: 'deepslate_tile_slab',
    trim: 'dark_oak', shutter: 'spruce', door: 'spruce', floor: 'spruce_planks', window: 'glass_pane', light: 'lantern' },
  /** Stone keep look: masonry walls, timber roof. */
  stein: { key: 'stein', label: 'Stein', base: COBBLE, baseStairs: 'cobblestone_stairs', baseSlab: 'cobblestone_slab', baseWall: 'cobblestone_wall',
    wall: MOSSY_STONE, frame: 'stripped_spruce_log',
    roof: [['dark_oak_planks', 1]], roofStairs: 'dark_oak_stairs', roofSlab: 'dark_oak_slab',
    trim: 'spruce', shutter: 'spruce', door: 'spruce', floor: 'spruce_planks', window: 'glass_pane', light: 'lantern' },
  /** Sandstone, smooth plaster, acacia accents. */
  wueste: { key: 'wueste', label: 'Wüste', base: [['sandstone', 5], ['smooth_sandstone', 2], ['cut_sandstone', 1]], baseStairs: 'sandstone_stairs', baseSlab: 'sandstone_slab', baseWall: 'sandstone_wall',
    wall: [['smooth_sandstone', 6], ['sandstone', 1], ['birch_planks', 0]], frame: 'stripped_acacia_log',
    roof: [['smooth_sandstone', 1]], roofStairs: 'smooth_sandstone_stairs', roofSlab: 'smooth_sandstone_slab',
    trim: 'acacia', shutter: 'acacia', door: 'acacia', floor: 'acacia_planks', window: 'glass_pane', light: 'lantern' },
  /** Cherry walls on stone, dark tiled roofs (studied cherry houses). */
  kirsch: { key: 'kirsch', label: 'Kirsche', base: [['stone_bricks', 6], ['mossy_stone_bricks', 2], ['andesite', 1]], baseStairs: 'stone_brick_stairs', baseSlab: 'stone_brick_slab', baseWall: 'stone_brick_wall',
    wall: [['cherry_planks', 5], ['birch_planks', 1]], frame: 'stripped_cherry_log',
    roof: [['deepslate_tiles', 1]], roofStairs: 'deepslate_tile_stairs', roofSlab: 'deepslate_tile_slab',
    trim: 'dark_oak', shutter: 'cherry', door: 'cherry', floor: 'dark_oak_planks', window: 'glass_pane', light: 'lantern' },
  /** Quartz/tuff civic look with copper roofs (studied city hall). */
  antik: { key: 'antik', label: 'Antik', base: [['polished_deepslate', 3], ['deepslate_bricks', 2], ['polished_diorite', 2]], baseStairs: 'polished_deepslate_stairs', baseSlab: 'polished_deepslate_slab', baseWall: 'polished_deepslate_wall',
    wall: [['chiseled_tuff_bricks', 3], ['tuff_bricks', 3], ['polished_tuff', 1]], frame: 'quartz_pillar',
    roof: [['oxidized_copper', 3], ['weathered_copper', 2]], roofStairs: 'oxidized_cut_copper_stairs', roofSlab: 'oxidized_cut_copper_slab',
    trim: 'spruce', shutter: 'spruce', door: 'spruce', floor: 'polished_tuff', window: 'glass_pane', light: 'lantern' },
  /** Mangrove and mud for swamps. */
  sumpf: { key: 'sumpf', label: 'Sumpf', base: [['mud_bricks', 5], ['packed_mud', 2]], baseStairs: 'mud_brick_stairs', baseSlab: 'mud_brick_slab', baseWall: 'mud_brick_wall',
    wall: [['mangrove_planks', 5], ['stripped_mangrove_wood', 1]], frame: 'mangrove_log',
    roof: [['dark_oak_planks', 1]], roofStairs: 'dark_oak_stairs', roofSlab: 'dark_oak_slab',
    trim: 'spruce', shutter: 'mangrove', door: 'mangrove', floor: 'mangrove_planks', window: 'glass_pane', light: 'lantern' },
} as const satisfies Record<string, Look>;
export type LookKey = keyof typeof LOOKS;

/** A look with one role swapped, e.g. another wood for a material variant. */
export const lookWith = (base: Look, change: Partial<Look>): Look => ({ ...base, ...change });

/** Look of a single wood palette (starter houses in eight woods). */
export function woodLook(w: string, accent: Mix): Look {
  const darkRoof = w === 'oak' || w === 'birch' || w === 'cherry' ? 'spruce' : 'dark_oak';
  return {
    key: `holz_${w}`, label: w, base: accent, baseStairs: 'cobblestone_stairs', baseSlab: 'cobblestone_slab', baseWall: 'cobblestone_wall',
    wall: [[wood(w, 'planks'), 1]], frame: `stripped_${w}_log`, roof: [[wood(darkRoof, 'planks'), 1]], roofStairs: wood(darkRoof, 'stairs'), roofSlab: wood(darkRoof, 'slab'),
    trim: darkRoof, shutter: w, door: w, floor: wood(w, 'planks'), window: 'glass_pane', light: 'lantern',
  };
}

// ------------------------------------------------------------ geometry helpers
export const STEP: Readonly<Record<H, readonly [number, number]>> = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] };
/** 90° clockwise seen from above. */
export const CW: Readonly<Record<H, H>> = { north: 'east', east: 'south', south: 'west', west: 'north' };

/** Writes only when the cell lies in the plot. */
export function put(p: Plot, x: number, y: number, z: number, id: string, props: Props = {}): boolean {
  if (!p.inside(x, y, z)) return false;
  if (isAxialBlock(id)) p.set(x, y, z, id, props.axis ? props : { ...props, ...axis('y') });
  else if (props.axis && !/chain$/.test(id)) { const { axis: _a, ...rest } = props; p.set(x, y, z, id, rest); }
  else p.set(x, y, z, id, props);
  return true;
}
/** Writes only into an empty, existing cell (details never overwrite structure). */
export function putFree(p: Plot, x: number, y: number, z: number, id: string, props: Props = {}): boolean {
  if (!p.inside(x, y, z) || p.has(x, y, z)) return false;
  if (isAxialBlock(id)) p.set(x, y, z, id, props.axis ? props : { ...props, ...axis('y') });
  else if (props.axis && !/chain$/.test(id)) { const { axis: _a, ...rest } = props; p.set(x, y, z, id, rest); }
  else p.set(x, y, z, id, props);
  return true;
}
export const putMix = (p: Plot, x: number, y: number, z: number, mix: Mix, seed = 0): boolean => put(p, x, y, z, pick(mix, x, y, z, seed));

export interface Rect { readonly x0: number; readonly z0: number; readonly x1: number; readonly z1: number }
export const grow = (r: Rect, n: number): Rect => ({ x0: r.x0 - n, z0: r.z0 - n, x1: r.x1 + n, z1: r.z1 + n });
/** Outward side of a ring cell (corners report the z side). */
const sideOf = (r: Rect, x: number, z: number): H => z === r.z0 ? 'north' : z === r.z1 ? 'south' : x === r.x0 ? 'west' : 'east';

// ------------------------------------------------------------ wall parts
/**
 * Window kit: panes `h` high and `w` wide in the wall plane at (x..,y..,z),
 * looking `out`. Lintel: upside-down trim stair in the wall above; sill:
 * upside-down trim stair outside below; shutters: open trapdoors flat on the
 * wall left and right; optional flower box under the sill row.
 */
export function windowKit(p: Plot, l: Look, x: number, y: number, z: number, out: H,
  o: { h?: number; w?: number; shutters?: boolean; sill?: boolean; lintel?: boolean; box?: boolean; seed?: number } = {}): void {
  const h = o.h ?? 2, w = o.w ?? 1, [ox, oz] = STEP[out], [ax, az] = STEP[CW[out]];
  const inward = OPPOSITE[out];
  for (let i = 0; i < w; i++) for (let k = 0; k < h; k++) put(p, x + ax * i, y + k, z + az * i, l.window, l.window.endsWith('pane') || l.window === 'iron_bars' ? {} : {});
  if (o.lintel !== false) for (let i = 0; i < w; i++) put(p, x + ax * i, y + h, z + az * i, trimStairs(l), stairs(inward, 'top'));
  if (o.sill !== false && !o.box) for (let i = 0; i < w; i++) putFree(p, x + ax * i + ox, y - 1, z + az * i + oz, trimStairs(l), stairs(inward, 'top'));
  if (o.box) flowerBox(p, l, x + ox, y - 1, z + oz, out, w, o.seed ?? 0);
  if (o.shutters !== false) for (let k = 0; k < h; k++) {
    putFree(p, x - ax + ox, y + k, z - az + oz, wood(l.shutter, 'trapdoor'), trapdoor(out, k === 0 ? 'bottom' : 'top', true));
    putFree(p, x + ax * w + ox, y + k, z + az * w + oz, wood(l.shutter, 'trapdoor'), trapdoor(out, k === 0 ? 'bottom' : 'top', true));
  }
}

const FLOWERS = ['poppy', 'cornflower', 'azure_bluet', 'oxeye_daisy', 'allium', 'red_tulip', 'lily_of_the_valley', 'dandelion'];
/** Flower box: moss row with flowers, framed by open trapdoors on the front and the ends. */
export function flowerBox(p: Plot, l: Look, x: number, y: number, z: number, out: H, w = 1, seed = 0): void {
  const [ox, oz] = STEP[out], [ax, az] = STEP[CW[out]], td = wood(l.shutter, 'trapdoor');
  for (let i = 0; i < w; i++) {
    const bx = x + ax * i, bz = z + az * i;
    if (!putFree(p, bx, y, bz, 'moss_block')) continue;
    putFree(p, bx, y + 1, bz, FLOWERS[Math.floor(hash(bx, y, bz, seed) * FLOWERS.length)]!);
    putFree(p, bx + ox, y, bz + oz, td, trapdoor(out, 'bottom', true));
  }
  putFree(p, x - ax, y, z - az, td, trapdoor(OPPOSITE[CW[out]], 'bottom', true));
  putFree(p, x + ax * w, y, z + az * w, td, trapdoor(CW[out], 'bottom', true));
}

/** Door with a trim lintel, a step outside and a lantern on a post beside it. */
export function doorKit(p: Plot, l: Look, x: number, y: number, z: number, out: H, o: { step?: boolean; lamp?: boolean; hinge?: 'left' | 'right' } = {}): void {
  const [ox, oz] = STEP[out], [ax, az] = STEP[CW[out]], inward = OPPOSITE[out];
  put(p, x, y, z, wood(l.door, 'door'), { facing: inward, half: 'lower', hinge: o.hinge ?? 'left', open: F, powered: F });
  put(p, x, y + 1, z, wood(l.door, 'door'), { facing: inward, half: 'upper', hinge: o.hinge ?? 'left', open: F, powered: F });
  put(p, x, y + 2, z, trimStairs(l), stairs(inward, 'top'));
  if (o.step !== false && y > 0) putFree(p, x + ox, y - 1, z + oz, l.baseStairs, stairs(inward));
  if (o.lamp !== false) {
    // Lantern hanging under a trim fence bracket next to the door frame (a fence holds a hanging lantern; a top slab does not).
    const lx = x + ax * 1 + ox, lz = z + az * 1 + oz;
    if (p.inside(lx, y + 2, lz) && !p.has(lx, y + 2, lz) && !p.has(lx, y + 1, lz)) {
      put(p, lx, y + 2, lz, trimFence(l));
      put(p, lx, y + 1, lz, l.light, lantern(true));
    }
  }
}

// ------------------------------------------------------------ roofs
export type RoofKind = 'sattel' | 'walm' | 'pult' | 'krueppelwalm';
/** Pitch: 'steil' rises two blocks per step (≈ 63°), 'normal' one (45°), 'flach' half a block (slabs). */
export type RoofPitch = 'steil' | 'normal' | 'flach';
export interface RoofWing {
  /** Footprint of the walls under this roof part (gable walls stand on its edges). */
  readonly walls: Rect;
  readonly kind: RoofKind;
  readonly ridge: 'x' | 'z';
  readonly overhang?: number;
  readonly pitch?: RoofPitch;
  /** Shed roofs rise toward west/north instead of east/south. */
  readonly flip?: boolean;
}
export interface RoofOpts extends RoofWing {
  /** Layer of the eaves (first roof layer, one above the ceiling beams). */
  readonly y: number;
  readonly seed?: number;
  /** Fill gable triangles with the wall look, a centre post and a small window. */
  readonly gables?: boolean;
  /** Skip the soffit (upside-down stairs under the eaves). */
  readonly noSoffit?: boolean;
  /** Further roof parts (cross gables, wings); valleys form where they meet. */
  readonly wings?: readonly RoofWing[];
}

interface Slope { d: number; up: H }
function slope(o: RoofWing, r: Rect, x: number, z: number): Slope {
  const w = x - r.x0, e = r.x1 - x, n = z - r.z0, s = r.z1 - z;
  if (o.kind === 'pult') return o.ridge === 'z' ? (o.flip ? { d: e, up: 'west' } : { d: w, up: 'east' }) : (o.flip ? { d: s, up: 'north' } : { d: n, up: 'south' });
  const across: readonly (readonly [number, H])[] = o.ridge === 'z' ? [[w, 'east'], [e, 'west']] : [[n, 'south'], [s, 'north']];
  let best = across[0]![0] <= across[1]![0] ? across[0]! : across[1]!;
  if (o.kind === 'walm' || o.kind === 'krueppelwalm') {
    const along: readonly (readonly [number, H])[] = o.ridge === 'z' ? [[n, 'south'], [s, 'north']] : [[w, 'east'], [e, 'west']];
    // Half hip: the end slope only covers the upper part of the gable.
    const shift = o.kind === 'krueppelwalm' ? Math.max(1, Math.floor(Math.min(r.x1 - r.x0, r.z1 - r.z0) / 2) - 1) : 0;
    for (const a of along) if (a[0] + shift < best[0]) best = [a[0] + shift, a[1]];
  }
  return { d: best[0], up: best[1] };
}
const rise = (p: RoofPitch, d: number): number => p === 'steil' ? 2 * d : p === 'flach' ? d / 2 : d;

interface Cell { wing: number; d: number; up: H; h: number; maxD: number }

/**
 * Pitched roof in the studied manner: overhang on all sides, a two-layer body
 * (stairs over full blocks, air below), verge boards of trim stairs along the
 * gable edges, a soffit of upside-down trim stairs under the eaves, a slab
 * ridge with fence finials, and filled gables. Several wings form one height
 * field (highest surface wins), so cross gables meet in clean valleys.
 * Returns the top layer.
 */
export function pitchedRoof(p: Plot, l: Look, o: RoofOpts): number {
  const seed = o.seed ?? 0, wings: RoofWing[] = [o, ...(o.wings ?? [])];
  const grown = wings.map(w => grow(w.walls, w.overhang ?? 1));
  const maxDs = wings.map((w, i) => { let m = 0; const r = grown[i]!; for (let x = r.x0; x <= r.x1; x++) for (let z = r.z0; z <= r.z1; z++) m = Math.max(m, slope(w, r, x, z).d); return m; });
  const field = new Map<string, Cell>();
  wings.forEach((w, i) => {
    const r = grown[i]!;
    for (let x = r.x0; x <= r.x1; x++) for (let z = r.z0; z <= r.z1; z++) {
      const s = slope(w, r, x, z), h = rise(w.pitch ?? 'normal', s.d), k = `${x},${z}`, old = field.get(k);
      if (!old || h > old.h) field.set(k, { wing: i, d: s.d, up: s.up, h, maxD: maxDs[i]! });
    }
  });
  const insideWalls = (x: number, z: number) => wings.some(w => x >= w.walls.x0 && x <= w.walls.x1 && z >= w.walls.z0 && z <= w.walls.z1);
  // A wider overhang drops the eaves below the wall top, so the roof still sits on the wall line.
  const ov0 = o.overhang ?? 1, base = o.y - Math.max(0, Math.floor(rise(o.pitch ?? 'normal', ov0)) - Math.floor(rise(o.pitch ?? 'normal', 1)));
  const surfaceY = (c: Cell) => base + Math.floor(c.h);
  let top = o.y;
  for (const [k, c] of field) {
    const [x, z] = k.split(',').map(Number) as [number, number];
    const w = wings[c.wing]!, r = grown[c.wing]!, pitch = w.pitch ?? 'normal';
    const y = surfaceY(c), ridge = c.d === c.maxD && w.kind !== 'pult';
    const lone = ridge && !neighbourRidge(field, x, z, c);
    const verge = w.kind !== 'walm' && (w.ridge === 'z' ? (z === r.z0 || z === r.z1) : (x === r.x0 || x === r.x1));
    const body = (yy: number) => put(p, x, yy, z, verge ? wood(l.trim, 'planks') : pick(l.roof, x, yy, z, seed));
    if (pitch === 'flach') {
      put(p, x, y, z, verge ? trimSlab(l) : l.roofSlab, slab(c.d % 2 === 0 ? 'bottom' : 'top'));
      if (c.d % 2 === 0 && c.d > 0) body(y - 1);
    } else {
      if (lone) put(p, x, y, z, verge ? trimSlab(l) : l.roofSlab, slab());
      else put(p, x, y, z, verge ? trimStairs(l) : l.roofStairs, stairs(c.up));
      if (c.d > 0) body(y - 1);
      if (pitch === 'steil' && c.d > 0) body(y - 2);
    }
    top = Math.max(top, y);
    // Soffit: upside-down trim stairs under the eaves row outside the walls.
    if (!o.noSoffit && !insideWalls(x, z) && c.d === 0 && pitch !== 'flach') putFree(p, x, y - 1, z, trimStairs(l), stairs(OPPOSITE[c.up], 'top'));
  }
  // Air in the attic under the body.
  for (const [k, c] of field) {
    const [x, z] = k.split(',').map(Number) as [number, number];
    if (!insideWalls(x, z) || wings.some(w => x === w.walls.x0 || x === w.walls.x1 || z === w.walls.z0 || z === w.walls.z1) && !wings.some(w => x > w.walls.x0 && x < w.walls.x1 && z > w.walls.z0 && z < w.walls.z1)) continue;
    const pitch = wings[c.wing]!.pitch ?? 'normal';
    const bodyRows = c.d > 0 ? (pitch === 'steil' ? 2 : 1) : 0;
    for (let y = Math.max(base, o.y); y < surfaceY(c) - bodyRows; y++) if (!p.has(x, y, z)) p.air(x, y, z);
  }
  if (o.gables !== false) wings.forEach((w, i) => { if (w.kind !== 'walm') fillGables(p, l, w, i, grown[i]!, base, o.y, field, wings, seed); });
  // Finials on the ridge ends of gable roofs with a lone ridge.
  wings.forEach((w, i) => {
    if (w.kind !== 'sattel' && w.kind !== 'krueppelwalm') return;
    const r = grown[i]!, span = w.ridge === 'z' ? r.x1 - r.x0 : r.z1 - r.z0;
    if (span % 2 !== 0) return;
    const ends = w.ridge === 'z' ? [[(r.x0 + r.x1) / 2, r.z0], [(r.x0 + r.x1) / 2, r.z1]] : [[r.x0, (r.z0 + r.z1) / 2], [r.x1, (r.z0 + r.z1) / 2]];
    for (const [x, z] of ends) {
      const c = field.get(`${x},${z}`);
      if (c && c.wing === i) putFree(p, x!, surfaceY(c) + 1, z!, trimFence(l));
    }
  });
  return top;
}

function neighbourRidge(field: ReadonlyMap<string, Cell>, x: number, z: number, c: Cell): boolean {
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const n = field.get(`${x + dx},${z + dz}`);
    if (n && n.wing === c.wing && n.d === c.maxD && n.up !== c.up) return true;
  }
  return false;
}

/** Gable triangles of one wing: wall look, a centre post, two small windows. */
function fillGables(p: Plot, l: Look, w: RoofWing, i: number, r: Rect, y0: number, wallTop: number, field: ReadonlyMap<string, Cell>, wings: readonly RoofWing[], seed: number): void {
  const W = w.walls, pitch = w.pitch ?? 'normal';
  const lines: { cells: [number, number][]; out: H }[] = w.ridge === 'z'
    ? [{ cells: range(W.x0, W.x1).map(x => [x, W.z0]), out: 'north' }, { cells: range(W.x0, W.x1).map(x => [x, W.z1]), out: 'south' }]
    : [{ cells: range(W.z0, W.z1).map(z => [W.x0, z]), out: 'west' }, { cells: range(W.z0, W.z1).map(z => [W.x1, z]), out: 'east' }];
  if (w.kind === 'pult') lines.push(w.ridge === 'z'
    ? { cells: range(W.z0, W.z1).map(z => [w.flip ? W.x0 : W.x1, z]), out: w.flip ? 'west' : 'east' }
    : { cells: range(W.x0, W.x1).map(x => [x, w.flip ? W.z0 : W.z1]), out: w.flip ? 'north' : 'south' });
  const inOther = (x: number, z: number) => wings.some((o, j) => j !== i && x > o.walls.x0 && x < o.walls.x1 && z > o.walls.z0 && z < o.walls.z1);
  for (const line of lines) {
    let peak: [number, number, number] | null = null;
    for (const [x, z] of line.cells) {
      if (inOther(x, z)) continue;
      const own = slope(w, r, x, z), c = field.get(`${x},${z}`);
      const ownY = y0 + Math.floor(rise(pitch, own.d)), fieldY = c ? y0 + Math.floor(c.h) : ownY;
      const lone = c && c.wing === i && own.d === c.maxD && pitch !== 'flach' && w.kind !== 'pult' && !neighbourRidge(field, x, z, c);
      const bodyRows = own.d > 0 ? (pitch === 'steil' ? 2 : pitch === 'normal' ? 1 : (own.d % 2 === 0 ? 1 : 0)) : 0;
      const yTop = Math.min(ownY, fieldY) - bodyRows - (lone ? 0 : 0) - (own.d > 0 || pitch === 'flach' ? 0 : 1);
      for (let y = wallTop; y <= yTop; y++) { const s = p.get(x, y, z); if (!s || s.id === 'minecraft:air' || !p.has(x, y, z)) put(p, x, y, z, pick(l.wall, x, y, z, seed)); }
      if (!peak || yTop > peak[1]) peak = [x, yTop, z];
    }
    if (!peak || peak[1] < wallTop) continue;
    const [px, py, pz] = peak;
    for (let y = wallTop; y <= py; y++) put(p, px, y, pz, l.frame, axis('y'));
    if (py - wallTop >= 3) {
      const [ax, az] = STEP[CW[line.out]];
      for (const s of [-1, 1]) {
        const wx = px + ax * s, wz = pz + az * s;
        if (p.get(wx, wallTop + 1, wz)?.id === `minecraft:${pick(l.wall, wx, wallTop + 1, wz, seed)}`) {
          put(p, wx, wallTop + 1, wz, l.window);
          put(p, wx, wallTop + 2, wz, trimStairs(l), stairs(OPPOSITE[line.out], 'top'));
        }
      }
    }
  }
}

export const range = (a: number, b: number): number[] => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);

// ------------------------------------------------------------ chimney, columns, domes
/** Chimney of mixed base stone with a slab collar and a smoking campfire. */
export function chimneyKit(p: Plot, l: Look, x: number, z: number, y0: number, top: number, seed = 0): void {
  for (let y = y0; y <= top; y++) put(p, x, y, z, pick(l.base, x, y, z, seed));
  for (const h of ['north', 'east', 'south', 'west'] as const) { const [dx, dz] = STEP[h]; putFree(p, x + dx, top, z + dz, l.baseStairs, stairs(OPPOSITE[h], 'top')); }
  put(p, x, top + 1, z, 'campfire', { facing: 'north', lit: 'true', signal_fire: F, waterlogged: F });
}

/** Column: base block, shaft, capital ring of upside-down stairs where there is room. */
export function column(p: Plot, x: number, z: number, y0: number, h: number, shaft: string, capital: string, capitalStairs: string): void {
  put(p, x, y0, z, capital);
  for (let y = y0 + 1; y < y0 + h - 1; y++) put(p, x, y, z, shaft, axis('y'));
  put(p, x, y0 + h - 1, z, capital);
  for (const f of ['north', 'east', 'south', 'west'] as const) {
    const [dx, dz] = STEP[f];
    putFree(p, x + dx, y0 + h - 1, z + dz, capitalStairs, stairs(OPPOSITE[f], 'top'));
    putFree(p, x + dx, y0, z + dz, capitalStairs, stairs(OPPOSITE[f]));
  }
}

/** Stepped dome of radius r with a mixed surface and stairs on the rim of every ring. */
export function dome(p: Plot, cx: number, cz: number, y: number, r: number, surface: Mix, stairId: string, seed = 0): number {
  // Radius per layer follows a quarter circle: slow at the drum, fast at the top.
  const radii: number[] = [];
  for (let i = 0; ; i++) { const rr = Math.round(r * Math.sqrt(Math.max(0, 1 - (i / (r + 0.5)) ** 2))); if (rr < 1) break; radii.push(rr); }
  let layer = 0;
  for (const rr of radii) {
    const R = rr * rr + rr * 0.8, inner = (rr - 1) * (rr - 1) + (rr - 1) * 0.8;
    for (let x = cx - rr - 1; x <= cx + rr + 1; x++) for (let z = cz - rr - 1; z <= cz + rr + 1; z++) {
      const q = (x - cx) ** 2 + (z - cz) ** 2;
      if (q > R || !p.inside(x, y + layer, z)) continue;
      if (q > inner) {
        const dx = cx - x, dz = cz - z;
        const up: H = Math.abs(dx) >= Math.abs(dz) ? (dx > 0 ? 'east' : 'west') : (dz > 0 ? 'south' : 'north');
        p.set(x, y + layer, z, stairId, stairs(up));
      } else if (q > (rr - 2) * (rr - 2)) p.set(x, y + layer, z, pick(surface, x, y + layer, z, seed));
      else p.air(x, y + layer, z);
    }
    layer++;
  }
  put(p, cx, y + layer, cz, pick(surface, cx, y + layer, cz, seed));
  return y + layer;
}

// ------------------------------------------------------------ house composer
export interface StoreySpec {
  /** Clear height (wall rows) of the storey. */
  readonly h: number;
  /** Wall treatment: masonry (base look), timber frame with infill, or plain infill. */
  readonly kind: 'stein' | 'fachwerk' | 'wand';
}

export interface WingSpec {
  /** Ground footprint of the wing; it overlaps the main body where they join. */
  readonly at: Rect;
  readonly ridge: 'x' | 'z';
  readonly kind?: RoofKind;
  /** Number of storeys (default: all). */
  readonly storeys?: number;
}

export interface HouseOpts {
  /** Ground floor footprint (outer wall ring). */
  readonly at: Rect;
  readonly storeys: readonly StoreySpec[];
  /** Upper storeys project one block per storey on these sides (Vorkragung), at most `jetty` blocks. */
  readonly jetty?: number;
  readonly jettySides?: readonly H[];
  readonly roof: { readonly kind: RoofKind | 'flach'; readonly ridge: 'x' | 'z'; readonly overhang?: number; readonly pitch?: RoofPitch };
  /** Cross wings with their own gable roofs (L, T and cross plans). */
  readonly wings?: readonly WingSpec[];
  /** Door side and offset along that side (default: middle). */
  readonly door?: { readonly side: H; readonly at?: number } | null;
  /** Distance between window axes. */
  readonly windowEvery?: number;
  readonly windowH?: number;
  /** Post spacing of the timber frame. */
  readonly postEvery?: number;
  readonly flowerBoxes?: boolean;
  readonly chimney?: { readonly x: number; readonly z: number } | null;
  /** Masonry rows of the ground floor under timber storeys (posts run through). */
  readonly plinth?: number;
  readonly seed?: number;
  /** Cells to keep free of windows (e.g. a stair landing). */
  readonly noWindow?: (x: number, y: number, z: number) => boolean;
  /** No shutters (modern, civic and desert looks). */
  readonly noShutters?: boolean;
  /** Layer of the foundation (default 0); raise it for houses on stilts or platforms. */
  readonly y0?: number;
  /** Top storey open to the roof (halls): no attic floor, only the beam ring. */
  readonly openCeiling?: boolean;
}

export interface HouseInfo {
  /** Floor layer of each storey (furniture stands at floor + 1). */
  readonly floors: readonly number[];
  /** Inner rectangle of each storey of the main body. */
  readonly rooms: readonly Rect[];
  /** Ceiling beam layer of the top storey. */
  readonly ceiling: number;
  /** First layer above the ceiling (eaves). */
  readonly eaves: number;
  readonly roofTop: number;
  readonly door: { x: number; y: number; z: number; side: H } | null;
}

/**
 * Whole house in the studied manner: masonry plinth, storeys with frame posts
 * and beam rows, optional jetty with bracket stairs and cross wings, windows
 * with shutters, sills, lintels and flower boxes, a door with step and lantern,
 * a roof with overhang/soffit/verge (one height field over all wings) and a
 * chimney. Interiors stay empty (air) for the caller to furnish.
 */
export function house(p: Plot, l: Look, o: HouseOpts): HouseInfo {
  const seed = o.seed ?? 0, jetty = o.jetty ?? 0, sides = new Set<H>(o.jettySides ?? ['north', 'south']);
  const postEvery = o.postEvery ?? 4, every = o.windowEvery ?? 3, wh = o.windowH ?? 2;
  const plinthRows = o.plinth ?? 1, n = o.storeys.length;
  const floors: number[] = [], rooms: Rect[] = [];
  const mainRect = (k: number): Rect => {
    const j = Math.min(k, jetty);
    return { x0: o.at.x0 - (sides.has('west') ? j : 0), x1: o.at.x1 + (sides.has('east') ? j : 0), z0: o.at.z0 - (sides.has('north') ? j : 0), z1: o.at.z1 + (sides.has('south') ? j : 0) };
  };
  const wings = o.wings ?? [];
  /** All parts of storey k (main first). */
  const partsOf = (k: number): Rect[] => [mainRect(k), ...wings.filter(w => k < (w.storeys ?? n)).map(w => w.at)];
  const inner = (rs: readonly Rect[], x: number, z: number) => rs.some(r => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1);
  const covered = (rs: readonly Rect[], x: number, z: number) => rs.some(r => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1);
  const outerSide = (rs: readonly Rect[], r: Rect, x: number, z: number): H | null => {
    for (const s of ['north', 'south', 'west', 'east'] as const) {
      const [dx, dz] = STEP[s];
      const onEdge = s === 'north' ? z === r.z0 : s === 'south' ? z === r.z1 : s === 'west' ? x === r.x0 : x === r.x1;
      if (onEdge && !covered(rs, x + dx, z + dz)) return s;
    }
    return null;
  };
  // Foundation layer under every part of the ground floor.
  const ground = partsOf(0), y0 = o.y0 ?? 0;
  for (const r of ground) for (let x = r.x0; x <= r.x1; x++) for (let z = r.z0; z <= r.z1; z++)
    put(p, x, y0, z, inner(ground, x, z) ? l.floor : pick(l.base, x, y0, z, seed));
  let y = y0 + 1;
  let door: HouseInfo['door'] = null;
  o.storeys.forEach((st, k) => {
    const parts = partsOf(k), r = parts[0]!;
    floors.push(y - 1); rooms.push(grow(r, -1));
    const isPost = (x: number, z: number) => parts.some(q => ((x === q.x0 || x === q.x1) && (z === q.z0 || z === q.z1)) ||
      (st.kind === 'fachwerk' && ((((z === q.z0 || z === q.z1) && x >= q.x0 && x <= q.x1 && (x - q.x0) % postEvery === 0)) || ((x === q.x0 || x === q.x1) && z >= q.z0 && z <= q.z1 && (z - q.z0) % postEvery === 0))));
    const walls: { x: number; z: number; out: H | null }[] = [];
    for (const q of parts) for (let x = q.x0; x <= q.x1; x++) for (let z = q.z0; z <= q.z1; z++) {
      if (inner(parts, x, z)) { for (let yy = y; yy < y + st.h; yy++) p.air(x, yy, z); continue; }
      walls.push({ x, z, out: outerSide(parts, q, x, z) });
      for (let yy = y; yy < y + st.h; yy++) {
        const masonry = st.kind === 'stein' || (k === 0 && yy - y < plinthRows);
        if (isPost(x, z) && st.kind === 'fachwerk') put(p, x, yy, z, l.frame, axis('y'));
        else if (masonry) put(p, x, yy, z, pick(l.base, x, yy, z, seed));
        else put(p, x, yy, z, pick(l.wall, x, yy, z, seed));
      }
    }
    const doorSide = o.door === null ? null : o.door?.side ?? 'north';
    const doorPos = k === 0 && doorSide ? doorCell(o.at, doorSide, o.door?.at) : null;
    // Windows on outer walls in a rhythm centred on each wall run.
    const seen = new Set<string>();
    for (const q of parts) for (const c of walls) {
      if (!c.out || seen.has(`${c.x},${c.z}`)) continue;
      const along = c.out === 'north' || c.out === 'south' ? c.x - q.x0 : c.z - q.z0;
      const len = c.out === 'north' || c.out === 'south' ? q.x1 - q.x0 : q.z1 - q.z0;
      const onThis = (c.out === 'north' && c.z === q.z0) || (c.out === 'south' && c.z === q.z1) || (c.out === 'west' && c.x === q.x0) || (c.out === 'east' && c.x === q.x1);
      if (!onThis) continue;
      seen.add(`${c.x},${c.z}`);
      if (along < 2 || along > len - 2 || (along - Math.floor(len / 2)) % every !== 0) continue;
      if (isPost(c.x, c.z)) continue;
      if (doorPos && Math.abs(c.x - doorPos.x) + Math.abs(c.z - doorPos.z) <= 1) continue;
      if (o.chimney && Math.abs(c.x - o.chimney.x) + Math.abs(c.z - o.chimney.z) <= 1) continue;
      const wy = y + Math.max(k === 0 ? Math.min(plinthRows, st.h - wh) : 1, Math.floor((st.h - wh) / 2));
      if (wy + wh > y + st.h) continue;
      if (o.noWindow?.(c.x, wy, c.z)) continue;
      windowKit(p, l, c.x, wy, c.z, c.out, { h: wh, box: !!o.flowerBoxes && k === 0 && wy - 1 >= 1, shutters: !o.noShutters, seed });
    }
    if (doorPos && doorSide) {
      doorKit(p, l, doorPos.x, y, doorPos.z, doorSide);
      door = { x: doorPos.x, y, z: doorPos.z, side: doorSide };
    }
    // Ceiling / next floor: beam ring (logs lying along the side) and floor boards; jetty brackets.
    const nextParts = k + 1 < n ? partsOf(k + 1) : parts;
    const by = y + st.h;
    for (const q of [...nextParts, ...parts]) for (let x = q.x0; x <= q.x1; x++) for (let z = q.z0; z <= q.z1; z++) {
      const ring = !inner(nextParts, x, z) && covered(nextParts, x, z);
      if (ring) {
        const s = outerSide(nextParts, nextParts.find(t => x >= t.x0 && x <= t.x1 && z >= t.z0 && z <= t.z1)!, x, z) ?? 'north';
        put(p, x, by, z, l.frame, axis(s === 'north' || s === 'south' ? 'x' : 'z'));
      } else if (covered(nextParts, x, z)) { if (o.openCeiling && k + 1 >= n) p.air(x, by, z); else put(p, x, by, z, l.floor); }
      else if (k + 1 >= n) put(p, x, by, z, l.frame, axis('x'));
    }
    const next = nextParts[0]!;
    if (k + 1 < n && (next.x0 !== r.x0 || next.x1 !== r.x1 || next.z0 !== r.z0 || next.z1 !== r.z1)) {
      // Brackets under the projecting ring: upside-down trim stairs on every second cell.
      for (let x = next.x0; x <= next.x1; x++) for (let z = next.z0; z <= next.z1; z++) {
        if (covered(parts, x, z)) continue;
        const s = sideOf(next, x, z);
        const along = s === 'north' || s === 'south' ? x - next.x0 : z - next.z0;
        if (along % 2 === 0) putFree(p, x, by - 1, z, trimStairs(l), stairs(OPPOSITE[s], 'top'));
      }
    }
    y = by + 1;
  });
  const topParts = partsOf(n - 1), top = topParts[0]!, ceiling = y - 1;
  let roofTop = ceiling;
  if (o.roof.kind === 'flach') {
    for (const q of topParts) for (let x = q.x0 - 1; x <= q.x1 + 1; x++) for (let z = q.z0 - 1; z <= q.z1 + 1; z++) {
      if (!covered(topParts, x, z)) putFree(p, x, ceiling, z, l.baseSlab, slab('top'));
      else if (!inner(topParts, x, z)) put(p, x, y, z, l.baseWall);
    }
    roofTop = y;
  } else {
    const ov = o.roof.overhang ?? 1, pitch = o.roof.pitch ?? 'normal';
    roofTop = pitchedRoof(p, l, { walls: top, y, kind: o.roof.kind, ridge: o.roof.ridge, overhang: ov, pitch, seed,
      wings: wings.filter(w => (w.storeys ?? n) >= n).map(w => ({ walls: w.at, kind: w.kind ?? 'sattel', ridge: w.ridge, overhang: ov, pitch })) });
  }
  if (o.chimney) {
    let t = roofTop;
    while (p.has(o.chimney.x, t + 1, o.chimney.z)) t++;
    chimneyKit(p, l, o.chimney.x, o.chimney.z, y0 + 1, Math.max(t + 1, ceiling + 2), seed);
  }
  return { floors, rooms, ceiling, eaves: y, roofTop, door };
}

function doorCell(r: Rect, side: H, at?: number): { x: number; z: number } {
  const mx = at ?? Math.floor((r.x0 + r.x1) / 2), mz = at ?? Math.floor((r.z0 + r.z1) / 2);
  switch (side) {
    case 'north': return { x: mx, z: r.z0 };
    case 'south': return { x: mx, z: r.z1 };
    case 'west': return { x: r.x0, z: mz };
    case 'east': return { x: r.x1, z: mz };
  }
}

/**
 * Ladder column facing `f` from y0 to y1: each rung moves from (x, z) towards
 * the wall behind it until that wall cell is solid, so curved or tapering
 * walls always hold the ladder.
 */
export function ladderUp(p: Plot, x: number, z: number, y0: number, y1: number, f: H, reach = 6): void {
  const [bx, bz] = STEP[OPPOSITE[f]];
  const solid = (xx: number, yy: number, zz: number) => { const s = p.get(xx, yy, zz); return !!s && s.id !== 'minecraft:air'; };
  for (let y = y0; y <= y1; y++) {
    let cx = x, cz = z;
    for (let i = 0; i < reach && !solid(cx + bx, y, cz + bz); i++) { cx += bx; cz += bz; }
    if (solid(cx + bx, y, cz + bz)) put(p, cx, y, cz, 'ladder', { facing: f, waterlogged: F });
  }
}

/** Hanging lantern with an iron chain up to the next block above (at most `max` links). */
export function hangLantern(p: Plot, l: Look | null, x: number, y: number, z: number, max = 8): void {
  if (!put(p, x, y, z, l?.light ?? 'lantern', lantern(true))) return;
  for (let yy = y + 1; yy <= y + max && p.inside(x, yy, z); yy++) {
    const s = p.get(x, yy, z);
    if (s && s.id !== 'minecraft:air') return;
    p.set(x, yy, z, 'iron_chain', { axis: 'y', waterlogged: F });
  }
}

/** Stone belt course: upside-down base stairs projecting one block around a rectangle at layer y. */
export function beltCourse(p: Plot, l: Look, r: Rect, y: number): void {
  for (let x = r.x0 - 1; x <= r.x1 + 1; x++) for (let z = r.z0 - 1; z <= r.z1 + 1; z++) {
    if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) continue;
    const s: H = z < r.z0 ? 'north' : z > r.z1 ? 'south' : x < r.x0 ? 'west' : 'east';
    putFree(p, x, y, z, l.baseStairs, stairs(OPPOSITE[s], 'top'));
  }
}

/** Plinth skirt: bottom base stairs around a rectangle at layer y, sloping away from the wall. */
export function skirt(p: Plot, l: Look, r: Rect, y: number): void {
  for (let x = r.x0 - 1; x <= r.x1 + 1; x++) for (let z = r.z0 - 1; z <= r.z1 + 1; z++) {
    if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) continue;
    if ((x < r.x0 || x > r.x1) && (z < r.z0 || z > r.z1)) continue;
    const s: H = z < r.z0 ? 'north' : z > r.z1 ? 'south' : x < r.x0 ? 'west' : 'east';
    putFree(p, x, y, z, l.baseStairs, stairs(OPPOSITE[s]));
  }
}

/** Shared wood helper for callers: id of a wood family part. */
export const woodPart = wood;
/** Deterministic 0..1 value for a cell (exported for designs). */
export const cellHash = hash;
export { noise };
