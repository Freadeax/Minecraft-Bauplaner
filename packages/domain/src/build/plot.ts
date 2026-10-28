import { createPayload, stateKey } from '../../../voxel/src/validation.js';
import type { BlockState, Cell, Vec3, VoxelPayload } from '../../../voxel/src/types.js';
import { SAMPLE_PROFILE } from '../samples.js';

/**
 * Gebäudebaukasten (B9 Ausbau): sparse voxel plot plus shape and state helpers
 * for the themed building sets. Every helper writes states in the exact schema
 * of the B7 state catalogue, so generated buildings rotate and mirror.
 * The classic 16 buildings in buildings.ts keep their own copy of the plot so
 * their content-addressed versions stay byte-identical.
 */

export type Props = Readonly<Record<string, string>>;
export type H = 'north' | 'east' | 'south' | 'west';
export type D6 = H | 'up' | 'down';
export const F = 'false', T = 'true';

/**
 * Plot with a fixed x/z footprint; the height grows with the highest block,
 * so designs never fail on a too small height.
 */
export class Plot {
  private readonly cells = new Map<string, { position: Vec3; air: boolean; state?: BlockState }>();
  private top = 0;
  constructor(readonly size: readonly [number, number, number]) {}
  inside(x: number, y: number, z: number): boolean {
    return Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(z) && x >= 0 && z >= 0 && y >= 0 && x < this.size[0] && z < this.size[2] && y < 256;
  }
  private put(x: number, y: number, z: number, value: { air: boolean; state?: BlockState }): void {
    if (!this.inside(x, y, z)) throw new Error(`Gebäudegenerator: ${x},${y},${z} außerhalb ${this.size[0]}×?×${this.size[2]}`);
    this.top = Math.max(this.top, y + 1);
    this.cells.set(`${x},${y},${z}`, { position: [x, y, z], ...value });
  }
  set(x: number, y: number, z: number, id: string, properties: Props = {}): void {
    this.put(x, y, z, { air: false, state: { id: `minecraft:${id}`, properties: { ...properties } } });
  }
  /** Explicit air: the cell must be empty after building. */
  air(x: number, y: number, z: number): void { this.put(x, y, z, { air: true }); }
  /** Removes a cell from the plan (neither block nor explicit air). */
  clear(x: number, y: number, z: number): void { this.cells.delete(`${x},${y},${z}`); }
  fill(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: string | null, properties: Props = {}): void {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) id === null ? this.air(x, y, z) : this.set(x, y, z, id, properties);
  }
  /** Perimeter of a rectangle on one layer. */
  ring(x0: number, z0: number, x1: number, z1: number, y: number, id: string, properties: Props = {}): void {
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (x === x0 || x === x1 || z === z0 || z === z1) this.set(x, y, z, id, properties);
  }
  /** Walls from y0 to y1 around the rectangle with explicit air inside. */
  room(x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, wall: string, props: Props = {}): void {
    for (let y = y0; y <= y1; y++) this.ring(x0, z0, x1, z1, y, wall, props);
    if (x1 - x0 > 1 && z1 - z0 > 1) this.fill(x0 + 1, y0, z0 + 1, x1 - 1, y1, z1 - 1, null);
  }
  /** Filled disc (or its outline with `shell`) on one layer; `null` writes air. */
  disc(cx: number, cz: number, y: number, r: number, id: string | null, props: Props = {}, shell = false): void {
    const R = r * r + r * 0.8;
    const inDisc = (x: number, z: number) => (x - cx) ** 2 + (z - cz) ** 2 <= R;
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) for (let z = Math.floor(cz - r - 1); z <= Math.ceil(cz + r + 1); z++) {
      if (!inDisc(x, z) || !this.inside(x, y, z)) continue;
      if (shell && inDisc(x + 1, z) && inDisc(x - 1, z) && inDisc(x, z + 1) && inDisc(x, z - 1)) continue;
      id === null ? this.air(x, y, z) : this.set(x, y, z, id, props);
    }
  }
  /** Round tower wall: ring of radius r from y0 to y1, air inside. */
  tube(cx: number, cz: number, r: number, y0: number, y1: number, id: string, props: Props = {}): void {
    for (let y = y0; y <= y1; y++) { if (r > 1) this.disc(cx, cz, y, r - 1, null); this.disc(cx, cz, y, r, id, props, true); }
  }
  /** Ellipsoid blob (tree crowns, rocks, domes). Only empty cells are filled unless `overwrite`. */
  blob(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, id: string, props: Props = {}, overwrite = false, keep?: (x: number, y: number, z: number) => boolean): void {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) {
        if (!this.inside(x, y, z)) continue;
        if (((x - cx) / (rx + 0.5)) ** 2 + ((y - cy) / (ry + 0.5)) ** 2 + ((z - cz) / (rz + 0.5)) ** 2 > 1) continue;
        if (keep && !keep(x, y, z)) continue;
        if (overwrite || !this.get(x, y, z)) this.set(x, y, z, id, props);
      }
  }
  get(x: number, y: number, z: number): BlockState | undefined { return this.cells.get(`${x},${y},${z}`)?.state; }
  has(x: number, y: number, z: number): boolean { return this.cells.has(`${x},${y},${z}`); }

  /** Sets fence/pane/wall arms from neighbours, like the game does on placement. */
  private connect(): void {
    const sides: readonly [string, number, number][] = [['north', 0, -1], ['east', 1, 0], ['south', 0, 1], ['west', -1, 0]];
    const connectable = (s: BlockState | undefined, self: BlockState): boolean => {
      if (!s) return false;
      const id = s.id.slice(10);
      if (/(_fence|_fence_gate)$/.test(self.id)) return /_fence(_gate)?$/.test(id) || isFull(id);
      return /(glass_pane|iron_bars|_wall)$/.test(id) || isFull(id);
    };
    for (const cell of this.cells.values()) {
      const s = cell.state;
      if (!s || !/(_fence|glass_pane|iron_bars|_wall)$/.test(s.id) || /_fence_gate$/.test(s.id)) continue;
      const [x, y, z] = cell.position, wall = s.id.endsWith('_wall');
      const props: Record<string, string> = { waterlogged: F };
      let count = 0;
      for (const [name, dx, dz] of sides) {
        const on = connectable(this.get(x + dx, y, z + dz), s);
        if (on) count++;
        props[name] = wall ? (on ? 'low' : 'none') : on ? T : F;
      }
      if (wall) {
        const straight = count === 2 && ((props.north !== 'none' && props.south !== 'none') || (props.east !== 'none' && props.west !== 'none'));
        props.up = straight && !this.get(x, y + 1, z) ? F : T;
      }
      cell.state = { id: s.id, properties: props };
    }
  }

  payload(): VoxelPayload {
    this.connect();
    const palette: BlockState[] = [{ id: 'minecraft:air', properties: {} }], index = new Map<string, number>([[stateKey(palette[0]!), 0]]);
    const cells: Cell[] = [];
    const sorted = [...this.cells.values()].sort((a, b) => a.position[1] - b.position[1] || a.position[2] - b.position[2] || a.position[0] - b.position[0]);
    for (const c of sorted) {
      if (c.air) { cells.push({ position: c.position, kind: 'air', paletteIndex: 0 }); continue; }
      const key = stateKey(c.state!);
      if (!index.has(key)) { index.set(key, palette.length); palette.push(c.state!); }
      cells.push({ position: c.position, kind: 'block', paletteIndex: index.get(key)! });
    }
    const maxExclusive: Vec3 = [this.size[0], Math.max(this.size[1], this.top), this.size[2]];
    return createPayload({ schemaVersion: 1, profileId: SAMPLE_PROFILE, bounds: { min: [0, 0, 0], maxExclusive }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette, cells, blockEntities: [] });
  }
}

const FULL_PATTERN = /(_planks|_log|_wood|_bricks|_concrete|_terracotta|_wool|stone|cobblestone|sandstone|_block|glass|_tiles|deepslate|blackstone|quartz|obsidian|calcite|_pillar|prismarine|purpur|bookshelf|mud|andesite|diorite|granite|tuff)$/;
export function isFull(id: string): boolean { return FULL_PATTERN.test(id) && !/(_slab|_stairs|_pane|_wall|_pressure_plate|_button|mushroom_stem)$/.test(id); }

// ------------------------------------------------------------ state helpers (B7 schemas)
export const stairs = (facing: H, half: 'bottom' | 'top' = 'bottom'): Props => ({ facing, half, shape: 'straight', waterlogged: F });
export const slab = (type: 'bottom' | 'top' | 'double' = 'bottom'): Props => ({ type, waterlogged: F });
export const axis = (a: 'x' | 'y' | 'z'): Props => ({ axis: a });
export const facing = (f: D6): Props => ({ facing: f });
export const lantern = (hanging = false): Props => ({ hanging: hanging ? T : F, waterlogged: F });
export const chest = (f: H, type: 'single' | 'left' | 'right' = 'single'): Props => ({ facing: f, type, waterlogged: F });
export const furnace = (f: H, lit = false): Props => ({ facing: f, lit: lit ? T : F });
export const ladder = (f: H): Props => ({ facing: f, waterlogged: F });
export const trapdoor = (f: H, half: 'top' | 'bottom' = 'bottom', open = false): Props => ({ facing: f, half, open: open ? T : F, powered: F, waterlogged: F });
export const leaves = (): Props => ({ distance: '1', persistent: T, waterlogged: F });
export const barrel = (f: D6 = 'up'): Props => ({ facing: f, open: F });
export const gate = (f: H, open = false): Props => ({ facing: f, in_wall: F, open: open ? T : F, powered: F });
export const hopper = (f: 'down' | H = 'down'): Props => ({ enabled: T, facing: f });
export const observer = (f: D6): Props => ({ facing: f, powered: F });
export const piston = (f: D6): Props => ({ extended: F, facing: f });
export const dispenser = (f: D6): Props => ({ facing: f, triggered: F });
/** Java: a repeater/comparator `facing` points to its input side, output is the opposite. */
export const repeater = (f: H, delay = 1): Props => ({ delay: String(delay), facing: f, locked: F, powered: F });
export const comparator = (f: H, mode: 'compare' | 'subtract' = 'compare'): Props => ({ facing: f, mode, powered: F });
export const lever = (f: H, face: 'floor' | 'wall' | 'ceiling' = 'wall'): Props => ({ face, facing: f, powered: F });
export const button = (f: H, face: 'floor' | 'wall' | 'ceiling' = 'wall'): Props => ({ face, facing: f, powered: F });
export const rail = (shape = 'north_south'): Props => ({ shape, waterlogged: F });
export const poweredRail = (shape: 'north_south' | 'east_west' = 'north_south', powered = false): Props => ({ powered: powered ? T : F, shape, waterlogged: F });
export const campfire = (f: H = 'north', lit = true): Props => ({ facing: f, lit: lit ? T : F, signal_fire: F, waterlogged: F });
export const candle = (n = 1, lit = false): Props => ({ candles: String(n), lit: lit ? T : F, waterlogged: F });
export const crop = (age = 7): Props => ({ age: String(age) });
export const sapling = (): Props => ({ stage: '0' });
export const sign = (rotation: number): Props => ({ rotation: String(rotation), waterlogged: F });
export const wallSign = (f: H): Props => ({ facing: f, waterlogged: F });
export const banner = (rotation: number): Props => ({ rotation: String(rotation) });
export const head = (rotation: number): Props => ({ powered: F, rotation: String(rotation) });
export const redstoneTorch = (lit = true): Props => ({ lit: lit ? T : F });
export const redstoneWallTorch = (f: H, lit = true): Props => ({ facing: f, lit: lit ? T : F });
export const lamp = (lit = false): Props => ({ lit: lit ? T : F });
export const water = (): Props => ({ level: '0' });
export const lava = (): Props => ({ level: '0' });
export const grass = (): Props => ({ snowy: F });
export const farmland = (): Props => ({ moisture: '7' });
export const half = (h: 'lower' | 'upper'): Props => ({ half: h });
export const beehive = (f: H): Props => ({ facing: f, honey_level: '0' });
export const lectern = (f: H): Props => ({ facing: f, has_book: F, powered: F });
export const chain = (a: 'x' | 'y' | 'z' = 'y'): Props => ({ axis: a, waterlogged: F });
export const rod = (f: D6 = 'up'): Props => ({ facing: f, powered: F, waterlogged: F });
export const pickle = (n = 1): Props => ({ pickles: String(n), waterlogged: T });
export const snow = (layers = 1): Props => ({ layers: String(layers) });
/** Mushroom blocks with every face showing cap/stem texture. */
export const mushroom = (): Props => ({ down: T, east: T, north: T, south: T, up: T, west: T });
export const wire = (ns: boolean, ew: boolean, power = 0): Props => ({ east: ew ? 'side' : 'none', north: ns ? 'side' : 'none', power: String(power), south: ns ? 'side' : 'none', west: ew ? 'side' : 'none' });

export const OPPOSITE: Readonly<Record<H, H>> = { north: 'south', south: 'north', east: 'west', west: 'east' };
const STEP: Readonly<Record<H, readonly [number, number]>> = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] };

// ------------------------------------------------------------ shapes
export function door(p: Plot, x: number, y: number, z: number, wood: string, f: H, hinge: 'left' | 'right' = 'left'): void {
  p.set(x, y, z, `${wood}_door`, { facing: f, half: 'lower', hinge, open: F, powered: F });
  p.set(x, y + 1, z, `${wood}_door`, { facing: f, half: 'upper', hinge, open: F, powered: F });
}
/** Bed from foot to head along `f`. */
export function bed(p: Plot, x: number, y: number, z: number, color: string, f: H): void {
  const [dx, dz] = STEP[f];
  p.set(x, y, z, `${color}_bed`, { facing: f, occupied: F, part: 'foot' });
  p.set(x + dx, y, z + dz, `${color}_bed`, { facing: f, occupied: F, part: 'head' });
}
export function tallPlant(p: Plot, x: number, y: number, z: number, id: string): void {
  p.set(x, y, z, id, half('lower')); p.set(x, y + 1, z, id, half('upper'));
}
/** Gable roof, ridge along z; returns the first layer above the roof. */
export function gableRoof(p: Plot, x0: number, x1: number, z0: number, z1: number, y: number, stair: string, gable: string, ridge: string | null): number {
  let layer = 0;
  for (let l = x0, r = x1; l <= r; l++, r--, layer++) {
    const yy = y + layer;
    if (l === r) { p.fill(l, yy, z0, l, yy, z1, ridge ?? gable, ridge ? slab() : {}); layer++; break; }
    for (let z = z0; z <= z1; z++) { p.set(l, yy, z, stair, stairs('east')); p.set(r, yy, z, stair, stairs('west')); }
    for (let x = l + 1; x < r; x++) { p.set(x, yy, z0, gable); p.set(x, yy, z1, gable); for (let z = z0 + 1; z < z1; z++) p.air(x, yy, z); }
  }
  return y + layer;
}
/** Gable roof, ridge along x. */
export function gableRoofX(p: Plot, x0: number, x1: number, z0: number, z1: number, y: number, stair: string, gable: string, ridge: string | null): number {
  let layer = 0;
  for (let l = z0, r = z1; l <= r; l++, r--, layer++) {
    const yy = y + layer;
    if (l === r) { p.fill(x0, yy, l, x1, yy, l, ridge ?? gable, ridge ? slab() : {}); layer++; break; }
    for (let x = x0; x <= x1; x++) { p.set(x, yy, l, stair, stairs('south')); p.set(x, yy, r, stair, stairs('north')); }
    for (let z = l + 1; z < r; z++) { p.set(x0, yy, z, gable); p.set(x1, yy, z, gable); for (let x = x0 + 1; x < x1; x++) p.air(x, yy, z); }
  }
  return y + layer;
}
/** Hip roof: stairs on all four sides, shrinking rings; flat cap of slabs. */
export function hipRoof(p: Plot, x0: number, x1: number, z0: number, z1: number, y: number, stair: string, cap: string, capSlab = true): number {
  let i = 0;
  for (; x0 + i < x1 - i && z0 + i < z1 - i; i++) {
    const yy = y + i, a = x0 + i, b = x1 - i, c = z0 + i, d = z1 - i;
    for (let x = a; x <= b; x++) { p.set(x, yy, c, stair, stairs('south')); p.set(x, yy, d, stair, stairs('north')); }
    for (let z = c + 1; z < d; z++) { p.set(a, yy, z, stair, stairs('east')); p.set(b, yy, z, stair, stairs('west')); }
  }
  const a = x0 + i, b = x1 - i, c = z0 + i, d = z1 - i;
  if (a <= b && c <= d) p.fill(a, y + i, c, b, y + i, d, cap, capSlab ? slab() : {});
  return y + i + 1;
}
/** Flat roof with optional parapet ring. */
export function flatRoof(p: Plot, x0: number, x1: number, z0: number, z1: number, y: number, floor: string, parapet: string | null): void {
  p.fill(x0, y, z0, x1, y, z1, floor);
  if (parapet) p.ring(x0, z0, x1, z1, y + 1, parapet);
}

export type TreeKind = 'oak' | 'birch' | 'spruce' | 'cherry' | 'dark_oak' | 'acacia' | 'jungle' | 'mangrove' | 'pale_oak';
/** Rounded broadleaf tree: trunk of `height`, crown radius `r`. */
export function roundTree(p: Plot, x: number, y: number, z: number, wood: TreeKind, height: number, r: number, leafId = `${wood}_leaves`): void {
  p.blob(x, y + height - 1, z, r, Math.max(1.5, r * 0.7), r, leafId, leaves());
  p.fill(x, y, z, x, y + height - 1, z, `${wood}_log`, axis('y'));
}
/** Conical conifer with layered rings. */
export function spruceTree(p: Plot, x: number, y: number, z: number, height: number): void {
  for (let i = 2; i < height + 1; i++) {
    const r = Math.max(0, Math.round(((height - i) / height) * 3.2 - ((i % 2) ? 0.6 : 0)));
    if (r > 0) p.disc(x, z, y + i, r, 'spruce_leaves', leaves());
  }
  p.set(x, y + height, z, 'spruce_leaves', leaves()); p.set(x, y + height + 1, z, 'spruce_leaves', leaves());
  p.fill(x, y, z, x, y + height - 1, z, 'spruce_log', axis('y'));
}
/** Palm: leaning trunk with drooping fronds (jungle wood). */
export function palmTree(p: Plot, x: number, y: number, z: number, height: number): void {
  for (let i = 0; i < height; i++) p.set(x + (i > height / 2 ? 1 : 0), y + i, z, 'jungle_log', axis('y'));
  const tx = x + 1, ty = y + height;
  p.set(tx, ty, z, 'jungle_leaves', leaves());
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    p.set(tx + dx, ty, z + dz, 'jungle_leaves', leaves()); p.set(tx + 2 * dx, ty, z + 2 * dz, 'jungle_leaves', leaves());
    p.set(tx + 3 * dx, ty - 1, z + 3 * dz, 'jungle_leaves', leaves());
  }
  for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]] as const) p.set(tx + dx, ty, z + dz, 'jungle_leaves', leaves());
}
/** Lamp post: fence or wall pole with a standing light on top. */
export function lampPost(p: Plot, x: number, y: number, z: number, pole: string, height: number, light = 'lantern'): void {
  p.fill(x, y, z, x, y + height - 1, z, pole);
  p.set(x, y + height, z, light, light.includes('lantern') ? lantern() : {});
}
/** Crenellations on every second cell of a rectangle's perimeter. */
export function crenels(p: Plot, x0: number, z0: number, x1: number, z1: number, y: number, id: string): void {
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if ((x === x0 || x === x1 || z === z0 || z === z1) && (x + z) % 2 === 0) p.set(x, y, z, id);
}
/** Deterministic pseudo noise in [0,1) for organic shapes (no randomness). */
export const noise = (x: number, y: number, z: number): number => (((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0) % 1000 / 1000;
