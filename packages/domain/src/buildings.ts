import { createPayload } from '../../voxel/src/validation.js';
import { stateKey } from '../../voxel/src/validation.js';
import type { BlockState, Cell, Vec3, VoxelPayload } from '../../voxel/src/types.js';
import { addAssetVersion, createAsset } from './library.js';
import { SAMPLE_PROFILE } from './samples.js';
import { facetTags } from './catalog.js';
import type { BuildingFacets } from './catalog.js';
import type { Asset, AssetVersion, Connector } from './types.js';

/**
 * Gebäudevorschläge (B9): original synthetic buildings generated from code.
 * No imported world, no Minecraft textures, no third-party designs. Every state
 * with properties uses the exact schema of the B7 state catalogue so the
 * buildings rotate and mirror without unresolved states (tested).
 *
 * Declared values (category, style, biome, function) are stored as facet tags
 * and labelled "Angabe" in the UI; all numbers are computed by catalog.ts.
 */

type Props = Readonly<Record<string, string>>;
const F = 'false', T = 'true';

/** Small sparse grid with bounds check; later writes replace earlier ones. */
class Plot {
  private readonly cells = new Map<string, { position: Vec3; air: boolean; state?: BlockState }>();
  constructor(readonly size: readonly [number, number, number]) {}
  private put(x: number, y: number, z: number, value: { air: boolean; state?: BlockState }): void {
    if (![x, y, z].every((n, i) => Number.isInteger(n) && n >= 0 && n < this.size[i]!)) throw new Error(`Gebäudegenerator: ${x},${y},${z} außerhalb ${this.size.join('×')}`);
    this.cells.set(`${x},${y},${z}`, { position: [x, y, z], ...value });
  }
  set(x: number, y: number, z: number, id: string, properties: Props = {}): void {
    this.put(x, y, z, { air: false, state: { id: `minecraft:${id}`, properties: { ...properties } } });
  }
  /** Explicit air: the cell must be empty after building (clears terrain inside rooms). */
  air(x: number, y: number, z: number): void { this.put(x, y, z, { air: true }); }
  fill(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: string | null, properties: Props = {}): void {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) id === null ? this.air(x, y, z) : this.set(x, y, z, id, properties);
  }
  /** Perimeter of a rectangle on one layer. */
  ring(x0: number, z0: number, x1: number, z1: number, y: number, id: string, properties: Props = {}): void {
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (x === x0 || x === x1 || z === z0 || z === z1) this.set(x, y, z, id, properties);
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
    return createPayload({ schemaVersion: 1, profileId: SAMPLE_PROFILE, bounds: { min: [0, 0, 0], maxExclusive: [...this.size] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette, cells, blockEntities: [] });
  }
}

const FULL_PATTERN = /(_planks|_log|_wood|_bricks|_concrete|_terracotta|_wool|stone|cobblestone|sandstone|_block|glass)$/;
function isFull(id: string): boolean { return FULL_PATTERN.test(id) && !/(_slab|_stairs|_pane|_wall|_pressure_plate|_button)$/.test(id); }

// ------------------------------------------------------------ state helpers
type H = 'north' | 'east' | 'south' | 'west';
const stairs = (facing: H, half: 'bottom' | 'top' = 'bottom'): Props => ({ facing, half, shape: 'straight', waterlogged: F });
const slab = (type: 'bottom' | 'top' | 'double' = 'bottom'): Props => ({ type, waterlogged: F });
const axis = (a: 'x' | 'y' | 'z'): Props => ({ axis: a });
const facing = (f: H): Props => ({ facing: f });
const lantern = (hanging = false): Props => ({ hanging: hanging ? T : F, waterlogged: F });
const chest = (f: H): Props => ({ facing: f, type: 'single', waterlogged: F });
const furnace = (f: H): Props => ({ facing: f, lit: F });
const ladder = (f: H): Props => ({ facing: f, waterlogged: F });
const trapdoor = (f: H, half: 'top' | 'bottom' = 'bottom', open = false): Props => ({ facing: f, half, open: open ? T : F, powered: F, waterlogged: F });
const leaves = (): Props => ({ distance: '1', persistent: T, waterlogged: F });

function door(p: Plot, x: number, y: number, z: number, wood: string, f: H, hinge: 'left' | 'right' = 'left'): void {
  p.set(x, y, z, `${wood}_door`, { facing: f, half: 'lower', hinge, open: F, powered: F });
  p.set(x, y + 1, z, `${wood}_door`, { facing: f, half: 'upper', hinge, open: F, powered: F });
}
/** Bed from foot to head along `f`. */
function bed(p: Plot, x: number, y: number, z: number, color: string, f: H): void {
  const [dx, dz] = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] }[f];
  p.set(x, y, z, `${color}_bed`, { facing: f, occupied: F, part: 'foot' });
  p.set(x + dx!, y, z + dz!, `${color}_bed`, { facing: f, occupied: F, part: 'head' });
}
/**
 * Gable roof with ridge along z over x0..x1, starting at y; gables at z0 and z1
 * in `gable` material; odd widths end in a ridge of `ridge` slabs (or gable
 * blocks). Returns the first layer above the roof.
 */
function gableRoof(p: Plot, x0: number, x1: number, z0: number, z1: number, y: number, stair: string, gable: string, ridge: string | null): number {
  let layer = 0;
  for (let l = x0, r = x1; l <= r; l++, r--, layer++) {
    const yy = y + layer;
    if (l === r) { p.fill(l, yy, z0, l, yy, z1, ridge ?? gable, ridge ? slab() : {}); layer++; break; }
    for (let z = z0; z <= z1; z++) { p.set(l, yy, z, stair, stairs('east')); p.set(r, yy, z, stair, stairs('west')); }
    for (let x = l + 1; x < r; x++) {
      p.set(x, yy, z0, gable); p.set(x, yy, z1, gable);
      for (let z = z0 + 1; z < z1; z++) p.air(x, yy, z);
    }
  }
  return y + layer;
}

// ------------------------------------------------------------ buildings

function fachwerkhaus(): VoxelPayload {
  const p = new Plot([7, 9, 9]);
  p.fill(0, 0, 0, 6, 0, 8, 'cobblestone'); p.fill(1, 0, 1, 5, 0, 7, 'oak_planks');
  for (let y = 1; y <= 3; y++) p.ring(0, 0, 6, 8, y, 'white_terracotta');
  for (const [x, z] of [[0, 0], [6, 0], [0, 8], [6, 8], [3, 0], [3, 8], [0, 4], [6, 4]] as const) p.fill(x, 1, z, x, 3, z, 'oak_log', axis('y'));
  p.fill(0, 4, 0, 6, 4, 0, 'oak_log', axis('x')); p.fill(0, 4, 8, 6, 4, 8, 'oak_log', axis('x'));
  p.fill(0, 4, 1, 0, 4, 7, 'oak_log', axis('z')); p.fill(6, 4, 1, 6, 4, 7, 'oak_log', axis('z'));
  p.fill(1, 1, 1, 5, 3, 7, null); p.fill(1, 4, 1, 5, 4, 7, 'oak_planks');
  for (const z of [2, 6]) { p.set(0, 2, z, 'glass_pane'); p.set(6, 2, z, 'glass_pane'); }
  p.set(1, 2, 0, 'glass_pane'); p.set(5, 2, 0, 'glass_pane'); p.set(1, 2, 8, 'glass_pane'); p.set(5, 2, 8, 'glass_pane');
  door(p, 3, 1, 0, 'oak', 'north');
  bed(p, 1, 1, 6, 'red', 'south'); p.set(5, 1, 1, 'crafting_table'); p.set(1, 1, 3, 'furnace', furnace('east'));
  p.set(5, 1, 3, 'chest', chest('west')); p.set(3, 3, 7, 'wall_torch', facing('north'));
  p.fill(5, 1, 7, 5, 4, 7, 'ladder', ladder('north'));
  gableRoof(p, 0, 6, 0, 8, 5, 'oak_stairs', 'white_terracotta', 'oak_slab');
  p.set(3, 5, 0, 'glass_pane'); p.set(3, 5, 8, 'glass_pane');
  p.set(1, 5, 4, 'bookshelf'); p.set(2, 5, 6, 'chest', chest('east')); p.set(4, 5, 2, 'white_bed', { facing: 'south', occupied: F, part: 'foot' }); p.set(4, 5, 3, 'white_bed', { facing: 'south', occupied: F, part: 'head' });
  p.set(3, 5, 4, 'lantern', lantern());
  return p.payload();
}

function blockhuette(): VoxelPayload {
  const p = new Plot([7, 8, 6]);
  p.fill(0, 0, 0, 5, 0, 5, 'cobblestone'); p.fill(1, 0, 1, 4, 0, 4, 'spruce_planks');
  for (let y = 1; y <= 4; y++) {
    p.fill(1, y, 0, 4, y, 0, 'spruce_log', axis('x')); p.fill(1, y, 5, 4, y, 5, 'spruce_log', axis('x'));
    p.fill(0, y, 1, 0, y, 4, 'spruce_log', axis('z')); p.fill(5, y, 1, 5, y, 4, 'spruce_log', axis('z'));
    for (const [x, z] of [[0, 0], [5, 0], [0, 5], [5, 5]] as const) p.set(x, y, z, 'stripped_spruce_log', axis('y'));
  }
  p.fill(1, 1, 1, 4, 4, 4, null);
  door(p, 2, 1, 0, 'spruce', 'north'); p.set(4, 2, 0, 'glass_pane'); p.set(0, 2, 2, 'glass_pane'); p.set(5, 2, 3, 'glass_pane');
  gableRoof(p, 0, 5, 0, 5, 5, 'spruce_stairs', 'spruce_planks', null);
  bed(p, 1, 1, 3, 'brown', 'south'); p.set(4, 1, 4, 'barrel', { facing: 'up', open: F }); p.set(4, 2, 4, 'lantern', lantern());
  p.set(4, 1, 1, 'crafting_table'); p.set(3, 1, 4, 'chest', chest('north'));
  p.fill(6, 0, 2, 6, 6, 2, 'cobblestone'); p.set(6, 7, 2, 'cobblestone_wall');
  return p.payload();
}

function wuestenhaus(): VoxelPayload {
  const p = new Plot([9, 6, 9]);
  p.fill(0, 0, 0, 8, 0, 8, 'sandstone'); p.fill(1, 0, 1, 7, 0, 7, 'smooth_sandstone');
  for (let y = 1; y <= 3; y++) p.ring(0, 0, 8, 8, y, 'sandstone');
  for (const [x, z] of [[0, 0], [8, 0], [0, 8], [8, 8]] as const) p.fill(x, 1, z, x, 4, z, 'cut_sandstone');
  p.fill(1, 1, 1, 7, 3, 7, null);
  p.fill(0, 4, 0, 8, 4, 8, 'smooth_sandstone');
  for (let x = 0; x <= 8; x++) for (let z = 0; z <= 8; z++) if ((x === 0 || x === 8 || z === 0 || z === 8) && (x + z) % 2 === 0) p.set(x, 5, z, 'cut_sandstone');
  door(p, 4, 1, 0, 'acacia', 'north');
  for (const [x, z] of [[2, 0], [6, 0], [0, 4], [8, 4], [4, 8]] as const) p.set(x, 2, z, 'acacia_trapdoor', trapdoor(z === 0 ? 'north' : z === 8 ? 'south' : x === 0 ? 'west' : 'east', 'bottom', true));
  p.fill(2, 1, 6, 5, 1, 6, 'orange_carpet'); p.fill(2, 1, 2, 2, 1, 4, 'orange_carpet');
  bed(p, 6, 1, 6, 'orange', 'west'); p.set(7, 1, 1, 'smoker', furnace('west')); p.set(1, 1, 1, 'barrel', { facing: 'up', open: F });
  p.set(1, 1, 7, 'cauldron'); p.set(6, 1, 1, 'potted_cactus'); p.set(4, 3, 7, 'wall_torch', facing('north'));
  p.fill(7, 1, 7, 7, 4, 7, 'ladder', ladder('west'));
  return p.payload();
}

function leuchtturm(): VoxelPayload {
  const p = new Plot([7, 19, 7]);
  // Octagonal rings around the centre column (3, 3).
  const octagon = (r: number) => (x: number, z: number) => { const dx = Math.abs(x - 3), dz = Math.abs(z - 3); return Math.max(dx, dz) <= r && dx + dz <= r + 1; };
  const outer = octagon(3), inner = octagon(2);
  for (let x = 0; x < 7; x++) for (let z = 0; z < 7; z++) {
    if (!outer(x, z)) continue;
    p.set(x, 0, z, 'stone_bricks');
    for (let y = 1; y <= 13; y++) {
      if (inner(x, z)) p.air(x, y, z);
      else p.set(x, y, z, Math.floor((y - 1) / 3) % 2 === 0 ? 'white_concrete' : 'red_concrete');
    }
    p.set(x, 14, z, 'smooth_stone');
    if (!inner(x, z)) p.set(x, 15, z, 'iron_bars');
  }
  p.fill(3, 1, 5, 3, 14, 5, 'ladder', ladder('north'));
  door(p, 3, 1, 0, 'spruce', 'north');
  p.set(0, 6, 3, 'glass_pane'); p.set(6, 10, 3, 'glass_pane'); p.set(3, 8, 6, 'glass_pane');
  for (let x = 2; x <= 4; x++) for (let z = 2; z <= 4; z++) {
    if (x === 3 && z === 3) continue;
    p.set(x, 15, z, 'glass'); p.set(x, 16, z, 'glass');
  }
  p.set(3, 15, 3, 'glowstone'); p.set(3, 16, 3, 'sea_lantern');
  p.fill(2, 17, 2, 4, 17, 4, 'red_concrete');
  p.set(3, 18, 3, 'lightning_rod', { facing: 'up', powered: F, waterlogged: F });
  return p.payload();
}

function dorfbrunnen(): VoxelPayload {
  const p = new Plot([5, 5, 5]);
  p.fill(0, 0, 0, 4, 0, 4, 'cobblestone'); p.ring(0, 0, 4, 4, 1, 'mossy_cobblestone');
  p.fill(1, 0, 1, 3, 1, 3, 'water', { level: '0' });
  for (const [x, z] of [[0, 0], [4, 0], [0, 4], [4, 4]] as const) p.fill(x, 2, z, x, 3, z, 'oak_fence');
  p.fill(0, 4, 0, 4, 4, 4, 'oak_slab', slab()); p.set(2, 4, 2, 'oak_planks');
  p.set(2, 3, 2, 'lantern', lantern(true));
  return p.payload();
}

function schmiede(): VoxelPayload {
  const p = new Plot([9, 7, 7]);
  p.fill(0, 0, 0, 8, 0, 6, 'cobblestone'); p.fill(0, 0, 0, 5, 0, 3, 'gravel');
  p.fill(0, 1, 6, 8, 3, 6, 'stone_bricks'); p.fill(8, 1, 0, 8, 3, 6, 'stone_bricks');
  p.fill(0, 1, 0, 7, 3, 5, null);
  for (const [x, z] of [[0, 0], [0, 6], [4, 0]] as const) p.fill(x, 1, z, x, 3, z, 'spruce_log', axis('y'));
  p.set(8, 2, 2, 'cracked_stone_bricks'); p.set(3, 2, 6, 'mossy_stone_bricks');
  p.set(6, 1, 5, 'furnace', furnace('north')); p.set(7, 1, 5, 'blast_furnace', furnace('north'));
  p.fill(6, 2, 5, 7, 3, 5, 'cobblestone');
  p.set(3, 1, 3, 'anvil', facing('east')); p.set(1, 1, 5, 'smithing_table'); p.set(2, 1, 5, 'grindstone', { face: 'floor', facing: 'north' });
  p.set(4, 1, 5, 'chest', chest('north')); p.set(7, 1, 1, 'barrel', { facing: 'west', open: F }); p.set(5, 1, 5, 'cauldron');
  p.set(0, 3, 1, 'wall_torch', facing('south')); p.set(7, 3, 2, 'wall_torch', facing('west'));
  p.fill(0, 4, 0, 8, 4, 6, 'spruce_planks'); p.fill(0, 5, 0, 8, 5, 6, 'spruce_slab', slab());
  p.fill(7, 4, 5, 7, 6, 5, 'cobblestone');
  return p.payload();
}

function scheune(): VoxelPayload {
  const p = new Plot([11, 11, 13]);
  p.fill(0, 0, 0, 10, 0, 12, 'cobblestone'); p.fill(1, 0, 1, 9, 0, 11, 'coarse_dirt');
  for (let y = 1; y <= 4; y++) p.ring(0, 0, 10, 12, y, 'spruce_planks');
  for (const x of [0, 10]) for (const z of [0, 4, 8, 12]) p.fill(x, 1, z, x, 4, z, 'dark_oak_log', axis('y'));
  for (const x of [3, 7]) for (const z of [0, 12]) p.fill(x, 1, z, x, 4, z, 'dark_oak_log', axis('y'));
  p.fill(1, 1, 1, 9, 4, 11, null);
  p.fill(4, 1, 0, 6, 3, 0, null);
  for (const z of [2, 6, 10]) { p.set(0, 3, z, 'spruce_trapdoor', trapdoor('west', 'top', true)); p.set(10, 3, z, 'spruce_trapdoor', trapdoor('east', 'top', true)); }
  for (const x of [1, 2, 3, 7, 8, 9]) for (const z of [4, 7]) p.set(x, 1, z, 'oak_fence');
  for (const z of [5, 6]) { p.set(3, 1, z, 'oak_fence'); p.set(7, 1, z, 'oak_fence'); }
  p.fill(1, 4, 8, 9, 4, 11, 'spruce_planks');
  p.fill(1, 1, 10, 2, 2, 11, 'hay_block', axis('x'));
  p.fill(9, 1, 8, 9, 4, 8, 'ladder', ladder('west'));
  p.set(5, 4, 4, 'lantern', lantern(true)); p.set(5, 4, 7, 'lantern', lantern(true));
  p.set(8, 1, 11, 'chest', chest('north')); p.set(9, 1, 11, 'barrel', { facing: 'up', open: F });
  gableRoof(p, 0, 10, 0, 12, 5, 'dark_oak_stairs', 'spruce_planks', 'dark_oak_slab');
  p.set(5, 7, 0, 'glass_pane'); p.set(5, 7, 12, 'glass_pane');
  // Hay on the loft is placed after the roof, which clears the attic volume.
  p.fill(1, 5, 10, 3, 6, 11, 'hay_block', axis('y')); p.fill(7, 5, 10, 9, 5, 11, 'hay_block', axis('y'));
  return p.payload();
}

function marktstand(): VoxelPayload {
  const p = new Plot([5, 4, 3]);
  for (const [x, z] of [[0, 0], [4, 0], [0, 2], [4, 2]] as const) p.fill(x, 0, z, x, 2, z, 'spruce_fence');
  for (let x = 1; x <= 3; x++) p.set(x, 0, 0, 'barrel', { facing: 'up', open: F });
  p.set(1, 1, 0, 'carved_pumpkin', facing('north')); p.set(2, 1, 0, 'melon'); p.set(3, 1, 0, 'potted_red_tulip');
  p.set(2, 0, 2, 'chest', chest('north')); p.set(1, 0, 2, 'crafting_table'); p.set(3, 0, 2, 'hay_block', axis('y'));
  for (let x = 0; x <= 4; x++) for (let z = 0; z <= 2; z++) p.set(x, 3, z, x % 2 === 0 ? 'red_wool' : 'white_wool');
  p.set(2, 2, 1, 'lantern', lantern(true));
  return p.payload();
}

function kapelle(): VoxelPayload {
  const p = new Plot([7, 12, 13]);
  p.fill(0, 0, 0, 6, 0, 12, 'stone_bricks'); p.fill(1, 0, 1, 5, 0, 11, 'andesite');
  for (let y = 1; y <= 4; y++) p.ring(0, 0, 6, 12, y, 'stone_bricks');
  for (const z of [3, 6, 9, 12]) { p.fill(0, 1, z, 0, 4, z, 'chiseled_stone_bricks'); p.fill(6, 1, z, 6, 4, z, 'chiseled_stone_bricks'); }
  p.fill(1, 1, 1, 5, 4, 11, null);
  for (const z of [2, 5, 8, 11]) for (const y of [2, 3]) { p.set(0, y, z, y === 2 ? 'light_blue_stained_glass_pane' : 'yellow_stained_glass_pane'); p.set(6, y, z, y === 2 ? 'light_blue_stained_glass_pane' : 'yellow_stained_glass_pane'); }
  for (const z of [3, 5, 7]) for (const x of [1, 2, 4, 5]) p.set(x, 1, z, 'oak_stairs', stairs('north'));
  p.fill(3, 1, 1, 3, 1, 9, 'red_carpet');
  p.set(3, 1, 10, 'chiseled_quartz_block'); p.set(3, 2, 10, 'candle', { candles: '3', lit: F, waterlogged: F });
  p.set(2, 1, 10, 'lectern', { facing: 'north', has_book: F, powered: F }); p.set(4, 1, 11, 'potted_lily_of_the_valley'); p.set(2, 1, 11, 'potted_lily_of_the_valley');
  p.set(1, 4, 6, 'wall_torch', facing('east')); p.set(5, 4, 6, 'wall_torch', facing('west'));
  gableRoof(p, 0, 6, 0, 12, 5, 'stone_brick_stairs', 'stone_bricks', 'stone_brick_slab');
  p.set(3, 6, 12, 'light_blue_stained_glass_pane');
  for (let y = 1; y <= 9; y++) p.ring(2, 0, 4, 2, y, 'stone_bricks');
  p.fill(3, 1, 1, 3, 6, 1, null); p.fill(3, 1, 2, 3, 2, 2, null); p.set(3, 1, 1, 'red_carpet'); p.set(3, 1, 2, 'red_carpet');
  door(p, 3, 1, 0, 'dark_oak', 'north');
  for (const y of [7, 8]) { p.air(3, y, 0); p.air(2, y, 1); p.air(4, y, 1); p.air(3, y, 2); }
  p.air(3, 7, 1); p.set(3, 8, 1, 'lantern', lantern(true)); p.set(3, 9, 1, 'stone_bricks');
  p.fill(2, 10, 0, 4, 10, 2, 'stone_brick_slab', slab()); p.set(3, 10, 1, 'stone_brick_wall');
  p.set(3, 11, 1, 'lightning_rod', { facing: 'up', powered: F, waterlogged: F });
  return p.payload();
}

function gewaechshaus(): VoxelPayload {
  const p = new Plot([9, 5, 7]);
  p.fill(0, 0, 0, 8, 0, 6, 'stone_bricks');
  for (let x = 1; x <= 7; x++) for (let z = 1; z <= 5; z++) p.set(x, 0, z, x === 4 ? 'water' : 'farmland', x === 4 ? { level: '0' } : { moisture: '7' });
  for (let y = 1; y <= 3; y++) p.ring(0, 0, 8, 6, y, 'glass');
  for (const [x, z] of [[0, 0], [8, 0], [0, 6], [8, 6], [4, 6]] as const) p.fill(x, 1, z, x, 3, z, 'birch_log', axis('y'));
  p.fill(1, 1, 1, 7, 3, 5, null);
  for (let z = 1; z <= 5; z++) {
    for (const x of [1, 2, 3]) p.set(x, 1, z, 'wheat', { age: '7' });
    for (const x of [5, 6]) p.set(x, 1, z, 'carrots', { age: '7' });
    p.set(7, 1, z, 'potatoes', { age: '7' });
  }
  door(p, 4, 1, 0, 'birch', 'north');
  p.fill(0, 4, 0, 8, 4, 6, 'glass'); p.fill(0, 4, 3, 8, 4, 3, 'birch_slab', slab());
  p.set(4, 3, 3, 'lantern', lantern(true)); p.set(4, 4, 3, 'birch_planks');
  return p.payload();
}

function villa(): VoxelPayload {
  const p = new Plot([13, 8, 9]);
  p.fill(0, 0, 0, 12, 0, 8, 'smooth_stone'); p.fill(1, 0, 1, 11, 0, 7, 'smooth_quartz');
  for (let y = 1; y <= 3; y++) p.ring(0, 0, 12, 8, y, 'white_concrete');
  p.fill(1, 1, 0, 11, 3, 0, 'glass'); for (const x of [4, 8]) p.fill(x, 1, 0, x, 3, 0, 'white_concrete');
  p.fill(12, 2, 2, 12, 2, 6, 'glass_pane'); p.fill(0, 2, 2, 0, 2, 6, 'glass_pane');
  p.fill(1, 1, 1, 11, 3, 7, null);
  p.fill(6, 1, 0, 6, 2, 0, null); door(p, 6, 1, 0, 'dark_oak', 'north');
  p.fill(0, 4, 0, 12, 4, 8, 'smooth_quartz');
  for (let y = 5; y <= 6; y++) p.ring(0, 0, 8, 8, y, 'white_concrete');
  p.fill(1, 5, 0, 7, 6, 0, 'glass'); p.fill(8, 5, 2, 8, 6, 6, 'glass'); p.fill(1, 6, 8, 7, 6, 8, 'glass_pane');
  p.fill(1, 5, 1, 7, 6, 7, null);
  p.fill(0, 7, 0, 8, 7, 8, 'gray_concrete');
  for (let x = 9; x <= 12; x++) { p.set(x, 5, 0, 'glass_pane'); p.set(x, 5, 8, 'glass_pane'); }
  p.fill(12, 5, 1, 12, 5, 7, 'glass_pane');
  p.set(10, 5, 4, 'potted_bamboo'); p.set(11, 5, 6, 'potted_fern'); p.set(10, 5, 2, 'lantern', lantern());
  p.fill(1, 1, 4, 3, 1, 6, 'light_gray_carpet'); p.set(1, 1, 7, 'bookshelf'); p.set(2, 1, 7, 'bookshelf'); p.set(3, 1, 7, 'bookshelf');
  p.set(10, 1, 7, 'smoker', furnace('north')); p.set(11, 1, 7, 'barrel', { facing: 'up', open: F }); p.set(9, 1, 7, 'crafting_table');
  p.fill(11, 1, 1, 11, 4, 1, 'ladder', ladder('west'));
  bed(p, 2, 5, 6, 'light_gray', 'south'); bed(p, 4, 5, 6, 'light_gray', 'south'); p.set(6, 5, 7, 'chest', chest('north'));
  for (const [x, z] of [[2, 3], [10, 3]] as const) p.set(x, 3, z, 'lantern', lantern(true));
  p.set(4, 6, 4, 'lantern', lantern(true));
  return p.payload();
}

function iglu(): VoxelPayload {
  const p = new Plot([7, 4, 7]);
  const inside = (x: number, z: number, r: number) => (x - 3) ** 2 + (z - 3) ** 2 <= r * r + 0.5;
  for (let x = 0; x < 7; x++) for (let z = 0; z < 7; z++) {
    if (!inside(x, z, 3)) continue;
    p.set(x, 0, z, 'snow_block');
    if (!inside(x, z, 2)) p.set(x, 1, z, 'snow_block'); else p.air(x, 1, z);
    if (inside(x, z, 2.6)) { if (!inside(x, z, 1.6)) p.set(x, 2, z, 'snow_block'); else p.air(x, 2, z); }
    if (inside(x, z, 1.6)) p.set(x, 3, z, 'snow_block');
  }
  p.air(3, 1, 0); p.set(1, 2, 3, 'ice'); p.set(5, 2, 3, 'ice');
  p.set(3, 1, 3, 'white_carpet'); p.set(2, 1, 3, 'white_carpet'); p.set(4, 1, 3, 'white_carpet');
  bed(p, 2, 1, 4, 'white', 'east'); p.set(4, 1, 4, 'chest', chest('west'));
  p.set(4, 1, 2, 'furnace', furnace('west')); p.set(2, 1, 2, 'crafting_table'); p.set(3, 1, 2, 'lantern', lantern());
  return p.payload();
}

function steinbruecke(): VoxelPayload {
  const p = new Plot([13, 5, 4]);
  for (const x0 of [0, 11]) p.fill(x0, 0, 0, x0 + 1, 2, 3, 'stone_bricks');
  p.fill(0, 3, 0, 12, 3, 3, 'stone_bricks');
  for (let x = 2; x <= 10; x++) for (let z = 0; z <= 3; z++) p.set(x, 2, z, x === 2 ? 'stone_brick_stairs' : x === 10 ? 'stone_brick_stairs' : 'stone_bricks', x === 2 ? stairs('west', 'top') : x === 10 ? stairs('east', 'top') : {});
  for (let z = 0; z <= 3; z++) { p.set(2, 1, z, 'stone_brick_stairs', stairs('west', 'top')); p.set(10, 1, z, 'stone_brick_stairs', stairs('east', 'top')); }
  p.set(3, 0, 0, 'mossy_stone_bricks'); p.set(9, 0, 3, 'mossy_stone_bricks');
  for (let x = 0; x <= 12; x++) { p.set(x, 4, 0, 'stone_brick_wall'); p.set(x, 4, 3, 'stone_brick_wall'); }
  p.fill(0, 4, 1, 0, 4, 2, null); p.fill(12, 4, 1, 12, 4, 2, null);
  for (const x of [1, 11]) for (const z of [0, 3]) p.set(x, 4, z, 'lantern', lantern());
  for (const x of [4, 8]) { p.set(x, 3, 0, 'chiseled_stone_bricks'); p.set(x, 3, 3, 'chiseled_stone_bricks'); }
  return p.payload();
}

function hafensteg(): VoxelPayload {
  const p = new Plot([4, 4, 12]);
  for (const z of [0, 3, 6, 9, 11]) for (const x of [0, 3]) p.fill(x, 0, z, x, 1, z, 'stripped_oak_log', axis('y'));
  p.fill(0, 2, 0, 3, 2, 11, 'spruce_planks');
  for (let z = 1; z <= 11; z++) { p.set(0, 3, z, 'spruce_fence'); p.set(3, 3, z, 'spruce_fence'); }
  p.fill(1, 3, 11, 2, 3, 11, 'spruce_fence');
  p.set(0, 3, 11, 'lantern', lantern()); p.set(3, 3, 11, 'lantern', lantern()); p.set(0, 3, 0, 'lantern', lantern()); p.set(3, 3, 0, 'lantern', lantern());
  p.set(1, 3, 9, 'barrel', { facing: 'up', open: F }); p.set(2, 3, 9, 'chest', chest('west'));
  p.fill(1, 2, 5, 2, 2, 5, 'spruce_trapdoor', trapdoor('north', 'top'));
  return p.payload();
}

function wachturm(): VoxelPayload {
  const p = new Plot([5, 12, 5]);
  for (const [x, z] of [[0, 0], [4, 0], [0, 4], [4, 4]] as const) p.fill(x, 0, z, x, 10, z, 'oak_log', axis('y'));
  for (const y of [3, 6]) { p.fill(1, y, 0, 3, y, 0, 'stripped_oak_log', axis('x')); p.fill(1, y, 4, 3, y, 4, 'stripped_oak_log', axis('x')); p.fill(0, y, 1, 0, y, 3, 'stripped_oak_log', axis('z')); p.fill(4, y, 1, 4, y, 3, 'stripped_oak_log', axis('z')); }
  p.fill(1, 0, 0, 1, 8, 0, 'ladder', ladder('east'));
  p.fill(0, 8, 0, 4, 8, 4, 'spruce_planks'); p.set(1, 8, 0, 'ladder', ladder('east'));
  p.ring(0, 0, 4, 4, 9, 'spruce_fence'); p.air(1, 9, 0);
  for (const [x, z] of [[0, 0], [4, 0], [0, 4], [4, 4]] as const) p.set(x, 9, z, 'oak_log', axis('y'));
  p.fill(0, 11, 0, 4, 11, 4, 'spruce_slab', slab()); p.set(2, 11, 2, 'spruce_planks');
  p.set(2, 10, 2, 'lantern', lantern(true)); p.set(3, 9, 3, 'barrel', { facing: 'up', open: F });
  p.fill(1, 1, 1, 3, 7, 3, null);
  return p.payload();
}

function baumhaus(): VoxelPayload {
  const p = new Plot([9, 14, 9]);
  p.fill(4, 0, 4, 4, 9, 4, 'jungle_log', axis('y'));
  p.fill(0, 6, 0, 8, 6, 8, 'jungle_planks'); p.set(4, 6, 4, 'jungle_log', axis('y'));
  for (let y = 7; y <= 8; y++) p.ring(2, 2, 6, 6, y, 'jungle_planks');
  p.fill(3, 7, 3, 5, 8, 5, null); p.fill(4, 7, 4, 4, 8, 4, 'jungle_log', axis('y'));
  p.ring(0, 0, 8, 8, 7, 'jungle_fence');
  for (const y of [7, 8]) p.air(4, y, 2);
  door(p, 4, 7, 2, 'jungle', 'north');
  p.set(2, 8, 4, 'glass_pane'); p.set(6, 8, 4, 'glass_pane'); p.set(4, 8, 6, 'glass_pane');
  p.fill(2, 9, 2, 6, 9, 6, 'jungle_slab', slab());
  for (let x = 0; x < 9; x++) for (let z = 0; z < 9; z++) for (let y = 10; y <= 13; y++) {
    const r = y === 13 ? 1.5 : y === 10 ? 3.6 : 3.1, d = (x - 4) ** 2 + (z - 4) ** 2;
    if (d <= r * r) p.set(x, y, z, 'jungle_leaves', leaves());
  }
  p.fill(4, 10, 4, 4, 11, 4, 'jungle_log', axis('y'));
  p.fill(4, 1, 3, 4, 6, 3, 'ladder', ladder('north'));
  p.set(4, 6, 3, 'ladder', ladder('north'));
  p.set(3, 7, 4, 'crafting_table'); p.set(3, 7, 5, 'chest', chest('east')); p.set(3, 7, 3, 'lantern', lantern());
  bed(p, 5, 7, 4, 'cyan', 'south');
  return p.payload();
}

// ------------------------------------------------------------ catalogue

export interface BuildingSpec {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly facets: BuildingFacets;
  readonly tags: readonly string[];
  readonly payload: () => VoxelPayload;
  readonly connectors?: readonly Connector[];
}

const joint = (id: string, position: Vec3, normal: Vec3, type: string, profile: string): Connector => ({ id, position, normal, up: [0, 1, 0], type, profile });
/** Shared path connector of bridge and jetty: a 4-wide deck end. */
export const PATH_PROFILE = 'weg_4';

export const BUILDING_SPECS: readonly BuildingSpec[] = [
  { id: 'bld_fachwerkhaus', name: 'Fachwerkhaus', payload: fachwerkhaus, tags: ['dorf', 'zweistöckig'],
    description: 'Zweistöckiges Wohnhaus mit Eichenfachwerk, Satteldach, Dachboden mit Schlafplatz und Leiter.',
    facets: { kategorie: ['wohnhaus'], stil: ['mittelalterlich'], biom: ['ebene', 'wald'], funktion: ['wohnen', 'lagern'] } },
  { id: 'bld_blockhuette', name: 'Blockhütte', payload: blockhuette, tags: ['hütte', 'schornstein'],
    description: 'Kleine Fichtenstamm-Hütte mit Satteldach und Bruchsteinschornstein für kalte Wälder.',
    facets: { kategorie: ['wohnhaus'], stil: ['rustikal', 'nordisch'], biom: ['taiga', 'gebirge'], funktion: ['wohnen'] } },
  { id: 'bld_wuestenhaus', name: 'Wüstenhaus', payload: wuestenhaus, tags: ['flachdach', 'dachterrasse'],
    description: 'Sandsteinhaus mit Flachdach, Zinnenbrüstung, Klappläden und Leiter zur Dachterrasse.',
    facets: { kategorie: ['wohnhaus'], stil: ['wuestenstil'], biom: ['wueste', 'savanne'], funktion: ['wohnen'] } },
  { id: 'bld_leuchtturm', name: 'Leuchtturm', payload: leuchtturm, tags: ['turm', 'hafen', 'leuchtfeuer'],
    description: 'Rot-weiß gestreifter Leuchtturm mit Innenleiter, Aussichtsplattform, Laternenhaus und Blitzableiter.',
    facets: { kategorie: ['wahrzeichen'], stil: ['kuestenstil'], biom: ['kueste'], funktion: ['orientierung', 'aussicht'] } },
  { id: 'bld_dorfbrunnen', name: 'Dorfbrunnen', payload: dorfbrunnen, tags: ['dorfplatz', 'wasser'],
    description: 'Überdachter Brunnen mit Wasserbecken und Hängelaterne als Mittelpunkt eines Dorfplatzes.',
    facets: { kategorie: ['dekoration'], stil: ['mittelalterlich'], biom: ['ueberall'], funktion: ['wasserquelle', 'versammlung'] } },
  { id: 'bld_schmiede', name: 'Schmiede', payload: schmiede, tags: ['werkstatt', 'esse'],
    description: 'Offene Werkstatt mit Ofen, Schmelzofen, Amboss, Schmiedetisch und Schleifstein unter Pultdach.',
    facets: { kategorie: ['handwerk'], stil: ['mittelalterlich'], biom: ['ebene', 'wald', 'taiga'], funktion: ['handwerk', 'lagern'] } },
  { id: 'bld_scheune', name: 'Scheune', payload: scheune, tags: ['bauernhof', 'heuboden', 'stall'],
    description: 'Große Scheune mit Tierboxen aus Zäunen, Heuboden mit Leiter und breitem Tor.',
    facets: { kategorie: ['landwirtschaft'], stil: ['rustikal'], biom: ['ebene', 'savanne'], funktion: ['tierhaltung', 'lagern'] } },
  { id: 'bld_marktstand', name: 'Marktstand', payload: marktstand, tags: ['markt', 'klein'],
    description: 'Kompakter Marktstand mit gestreiftem Wollbaldachin, Fass-Theke und Warenauslage.',
    facets: { kategorie: ['handel'], stil: ['mittelalterlich'], biom: ['ueberall'], funktion: ['handel', 'deko'] } },
  { id: 'bld_kapelle', name: 'Kapelle', payload: kapelle, tags: ['glockenturm', 'buntglas'],
    description: 'Steinkapelle mit Glockenturm, Buntglasfenstern, Bankreihen, Altar und Lesepult.',
    facets: { kategorie: ['sakral'], stil: ['mittelalterlich', 'klassisch'], biom: ['ebene', 'wald'], funktion: ['versammlung'] } },
  { id: 'bld_gewaechshaus', name: 'Gewächshaus', payload: gewaechshaus, tags: ['feld', 'glas'],
    description: 'Glasgewächshaus mit bewässerten Beeten für Weizen, Karotten und Kartoffeln.',
    facets: { kategorie: ['landwirtschaft'], stil: ['modern'], biom: ['ueberall'], funktion: ['landwirtschaft'] } },
  { id: 'bld_villa', name: 'Moderne Villa', payload: villa, tags: ['flachdach', 'terrasse', 'zweistöckig'],
    description: 'Zweistöckige Villa aus weißem Beton mit Glasfront, Dachterrasse und Schlafzimmer im Obergeschoss.',
    facets: { kategorie: ['wohnhaus'], stil: ['modern'], biom: ['ebene', 'kueste'], funktion: ['wohnen', 'aussicht'] } },
  { id: 'bld_iglu', name: 'Iglu', payload: iglu, tags: ['kuppel', 'klein'],
    description: 'Schneekuppel mit Eisfenstern, Bett, Ofen und Truhe für Schneebiome.',
    facets: { kategorie: ['wohnhaus'], stil: ['nordisch'], biom: ['schnee'], funktion: ['wohnen'] } },
  { id: 'bld_steinbruecke', name: 'Steinbrücke', payload: steinbruecke, tags: ['bogen', 'weg'],
    description: 'Steinziegelbrücke mit Bogen, Mauerbrüstung und Laternen; Weganschlüsse an beiden Enden.',
    facets: { kategorie: ['infrastruktur'], stil: ['mittelalterlich', 'klassisch'], biom: ['ueberall'], funktion: ['verbindung'] },
    connectors: [joint('west', [0, 3, 2], [-1, 0, 0], 'path_joint', PATH_PROFILE), joint('east', [13, 3, 2], [1, 0, 0], 'path_joint', PATH_PROFILE)] },
  { id: 'bld_hafensteg', name: 'Hafensteg', payload: hafensteg, tags: ['hafen', 'steg', 'weg'],
    description: 'Holzsteg auf Pfählen mit Geländer, Laternen und Ladeplatz am Ende; Weganschluss zur Landseite.',
    facets: { kategorie: ['infrastruktur'], stil: ['kuestenstil', 'rustikal'], biom: ['kueste'], funktion: ['verbindung', 'lagern'] },
    connectors: [joint('land', [2, 2, 0], [0, 0, -1], 'path_joint', PATH_PROFILE)] },
  { id: 'bld_wachturm', name: 'Holz-Wachturm', payload: wachturm, tags: ['turm', 'aussicht'],
    description: 'Offener Wachturm aus Eichenstämmen mit Leiter, Brüstung und Dach über der Plattform.',
    facets: { kategorie: ['befestigung'], stil: ['rustikal'], biom: ['wald', 'taiga', 'ebene'], funktion: ['verteidigung', 'aussicht'] } },
  { id: 'bld_baumhaus', name: 'Baumhaus', payload: baumhaus, tags: ['baum', 'versteck'],
    description: 'Hütte auf einem Tropenbaumstamm mit umlaufender Veranda, Leiter und Blätterkrone.',
    facets: { kategorie: ['wohnhaus'], stil: ['rustikal'], biom: ['dschungel', 'wald'], funktion: ['wohnen', 'aussicht'] } },
];

export interface BuildingLibrary { readonly assets: readonly Asset[]; readonly versions: readonly AssetVersion[] }

const PROVENANCE = { author: 'Minecraft-Bauplaner', source: 'eigener synthetischer Entwurf (Gebäudegenerator)', license: 'frei für dieses Projekt' };

/** Builds every shipped building as demo asset with one immutable version 1.0. */
export async function createBuildingLibrary(): Promise<BuildingLibrary> {
  const assets: Asset[] = [], versions: AssetVersion[] = [];
  for (const spec of BUILDING_SPECS) {
    const asset = createAsset({ id: spec.id, name: spec.name, description: spec.description, tags: [...spec.tags, ...facetTags(spec.facets)], provenance: PROVENANCE, demo: true });
    const r = await addAssetVersion(asset, { payload: spec.payload(), label: '1.0', connectors: spec.connectors ?? [], source: { format: 'demo' } });
    assets.push(r.asset); versions.push(r.version);
  }
  return { assets, versions };
}
