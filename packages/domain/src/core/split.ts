import type { BlockEntity, Cell, FreeEntity, Vec3, VoxelPayload } from '../../../voxel/src/types.js';
import { createPayload, validatePayload, AIR_IDS } from '../../../voxel/src/validation.js';
import { entityId } from '../../../voxel/src/entities.js';
import { NATURAL_TERRAIN_IDS, REPLACEABLE_IDS, isTreePartId } from '../world/terrain.js';
import { detectFunction } from '../base/baseFunctions.js';
import type { BaseFunctionId } from '../base/baseFunctions.js';
import { applyOperation, createProject } from './project.js';
import type { Operation } from './project.js';
import { addSection, checkSite, siteOf } from '../building/site.js';
import { newId } from './hash.js';
import { DomainError } from './types.js';
import type { AssetVersion, Instance, Project } from './types.js';

/**
 * Gebäude herauslösen (SPLIT-01). A large model – a whole base from a
 * .litematic or .schem, a world excerpt – is split into its single buildings
 * and areas, each of which can become its own library part and, all together,
 * a project with one instance per part at its original position.
 *
 * Detection works on columns (x, z):
 *  - every block is natural (ground, plants, trees, water), flat (paths, farmland,
 *    crops – things lying on the ground) or built;
 *  - a column is a core column when built blocks reach `coreHeight` blocks above
 *    the natural ground (walls, towers); fences, lamp posts and paths do not;
 *  - core columns closer than `join` blocks form one building; low built and flat
 *    columns up to `margin` blocks around a building belong to it (stairs,
 *    porch, lanterns);
 *  - the remaining low columns form areas (fields, pens, path networks); areas
 *    with fewer than `minArea` columns stay in the rest;
 *  - underground rooms (SPLIT-01-S05): columns whose built blocks all lie at or below
 *    the ground form their own buildings (role 'underground') and never join surface
 *    buildings, except as the cellar of the building they lie under;
 *  - bridges (SPLIT-01-S05): thin built columns that float over the ground or over
 *    water (a gap below) never make a core column; a floating strip that links two
 *    buildings, or is long and narrow, becomes its own part (role 'bridge', `connects`).
 *
 * Analysis is pure and never changes the source; extraction returns new
 * payloads, the source stays as it is.
 */

export type BlockClass = 'nature' | 'flat' | 'built';
export interface SplitOptions {
  /** Built blocks above ground that make a core column (walls). Default 4. */
  readonly coreHeight?: number;
  /** Core columns at most this far apart (Chebyshev) belong to the same building. Default 2. */
  readonly join?: number;
  /** Low columns up to this distance around a building belong to it. Default 2. */
  readonly margin?: number;
  /** Buildings need at least this many core columns. Default 9. */
  readonly minCore?: number;
  /** Areas need at least this many columns. Default 16. */
  readonly minArea?: number;
}
export const SPLIT_DEFAULTS: Required<SplitOptions> = { coreHeight: 4, join: 2, margin: 2, minCore: 9, minArea: 16 };
/** Largest footprint the column analysis accepts (same as a 1024 × 1024 world excerpt). */
export const SPLIT_MAX_COLUMNS = 1_048_576;

export interface SplitPart {
  /** Stable within one analysis: `teil-<n>`. */
  readonly id: string;
  readonly kind: 'building' | 'area';
  readonly name: string;
  readonly fn: BaseFunctionId | 'wege' | null;
  readonly reason: string;
  /** Payload coordinates, inclusive minimum / exclusive maximum. */
  readonly box: { readonly min: Vec3; readonly maxExclusive: Vec3 };
  readonly columns: number;
  /** Built + flat blocks inside the part (without natural ground). */
  readonly blocks: number;
  /** Height of the building above its ground (blocks). */
  readonly height: number;
  /** Most frequent blocks of the part (for the list). */
  readonly top: readonly { readonly id: string; readonly count: number }[];
  /** SPLIT-01-S05: 'underground' = room below the ground, 'bridge' = floating link; missing = ordinary part. */
  readonly role?: 'underground' | 'bridge';
  /** Built blocks of the part at or below the ground of their column (cellars, tunnels). */
  readonly below?: number;
  /** Bridges: ids of the parts at both ends. */
  readonly connects?: readonly string[];
}
export interface SplitAnalysis {
  readonly options: Required<SplitOptions>;
  readonly parts: readonly SplitPart[];
  /** Columns per part index (`owner[col] = part index + 1`, 0 = rest); `col = (x − minX) + (z − minZ)·width`. */
  readonly owner: Int32Array;
  readonly width: number;
  readonly length: number;
  readonly minX: number;
  readonly minZ: number;
  /** Ground top per column (payload y; soil, paths, farmland, filled in from neighbours under buildings), `NO_GROUND` without any ground. */
  readonly ground: Int32Array;
  /** Columns with farmland (water beside them is part of the field). */
  readonly field: Uint8Array;
  /** Built/flat blocks that ended up in no part. */
  readonly restBlocks: number;
  readonly natureBlocks: number;
}
export const NO_GROUND = -2_147_483_648;

const FLAT_IDS: ReadonlySet<string> = new Set(['dirt_path', 'farmland', 'wheat', 'carrots', 'potatoes', 'beetroots', 'melon_stem', 'pumpkin_stem', 'attached_melon_stem', 'attached_pumpkin_stem',
  'torchflower_crop', 'pitcher_crop', 'sweet_berry_bush', 'sugar_cane'].map(id => `minecraft:${id}`));
const FLOWER = /^minecraft:(dandelion|poppy|blue_orchid|allium|azure_bluet|.*_tulip|oxeye_daisy|cornflower|lily_of_the_valley|wither_rose|sunflower|lilac|rose_bush|peony|pink_petals|wildflowers|torchflower|pitcher_plant|lily_pad|sea_pickle|cactus|bamboo|brown_mushroom|red_mushroom|moss_carpet|moss_block|azalea|flowering_azalea|big_dripleaf|small_dripleaf|spore_blossom|firefly_bush|cactus_flower|closed_eyeblossom|open_eyeblossom)$/;

const PAVING: ReadonlySet<string> = new Set(['cobblestone', 'mossy_cobblestone', 'stone_bricks', 'cracked_stone_bricks', 'mossy_stone_bricks', 'polished_andesite', 'polished_diorite', 'polished_granite',
  'bricks', 'mud_bricks', 'packed_mud', 'smooth_stone', 'polished_blackstone_bricks', 'deepslate_bricks', 'deepslate_tiles', 'tuff_bricks', 'cobbled_deepslate', 'stone'].map(id => `minecraft:${id}`));

/** Unambiguous natural ground: never placed as part of a building. */
const SOIL: ReadonlySet<string> = new Set(['grass_block', 'dirt', 'rooted_dirt', 'podzol', 'mycelium', 'sand', 'red_sand', 'suspicious_sand', 'suspicious_gravel', 'bedrock', 'netherrack', 'soul_sand', 'soul_soil',
  'crimson_nylium', 'warped_nylium', 'end_stone', 'coal_ore', 'iron_ore', 'copper_ore', 'gold_ore', 'redstone_ore', 'lapis_ore', 'diamond_ore', 'emerald_ore', 'deepslate_coal_ore', 'deepslate_iron_ore', 'deepslate_copper_ore',
  'deepslate_gold_ore', 'deepslate_redstone_ore', 'deepslate_lapis_ore', 'deepslate_diamond_ore', 'deepslate_emerald_ore', 'nether_quartz_ore', 'nether_gold_ore'].map(id => `minecraft:${id}`));
type Kind = 'air' | 'flat' | 'plant' | 'soil' | 'water' | 'stone' | 'built';
/** Stone, gravel, sand­stone, terracotta … are natural below the ground and built above it ('stone' = decided per cell). */
function kindOf(id: string): Kind {
  if (AIR_IDS.has(id)) return 'air';
  if (FLAT_IDS.has(id)) return 'flat';
  if (REPLACEABLE_IDS.has(id) || isTreePartId(id) || FLOWER.test(id) || id === 'minecraft:kelp' || id === 'minecraft:kelp_plant') return 'plant';
  if (SOIL.has(id)) return 'soil';
  if (id === 'minecraft:water' || id === 'minecraft:lava' || id === 'minecraft:bubble_column') return 'water';
  if (NATURAL_TERRAIN_IDS.has(id)) return 'stone';
  return 'built';
}
/** Class of a block id for splitting, without the per-cell ground decision (stone counts as nature here). */
export function blockClass(id: string): BlockClass | 'air' {
  const k = kindOf(id);
  return k === 'air' ? 'air' : k === 'flat' ? 'flat' : k === 'built' ? 'built' : 'nature';
}
/** Whether a block cell is natural (ground, plants, water) given the column's ground level. */
function natureAt(kind: Kind, y: number, ground: number, fieldNear: boolean): boolean {
  if (kind === 'plant' || kind === 'soil') return true;
  if (kind === 'stone') return ground !== NO_GROUND && y <= ground;
  if (kind === 'water') return ground === NO_GROUND ? true : y < ground || (y === ground && !fieldNear);
  return false;
}

const fail = (message: string): never => { throw new DomainError('SPLIT', `Herauslösen: ${message}`); };

function normalize(raw: SplitOptions): Required<SplitOptions> {
  const o = { ...SPLIT_DEFAULTS, ...raw };
  const check = (k: keyof SplitOptions, lo: number, hi: number) => { const v = o[k]; if (!Number.isInteger(v) || v < lo || v > hi) fail(`${k} muss ${lo}–${hi} sein`); };
  check('coreHeight', 1, 64); check('join', 0, 16); check('margin', 0, 16); check('minCore', 1, 100_000); check('minArea', 1, 1_000_000);
  return o;
}

/**
 * Finds the buildings and areas of a large model. Linear in the number of
 * cells plus `(2·join+1)²` per core column; for a million cells well below a
 * second.
 */
export function analyzeSplit(payload: VoxelPayload, rawOptions: SplitOptions = {}): SplitAnalysis {
  validatePayload(payload);
  const options = normalize(rawOptions);
  const [minX, minY, minZ] = payload.bounds.min;
  const W = payload.bounds.maxExclusive[0] - minX, L = payload.bounds.maxExclusive[2] - minZ;
  if (W * L > SPLIT_MAX_COLUMNS) fail(`Grundfläche ${W} × ${L} ist größer als ${SPLIT_MAX_COLUMNS} Säulen`);
  const N = W * L;
  const kinds = payload.palette.map(s => kindOf(s.id));
  const ground = new Int32Array(N).fill(NO_GROUND);
  const builtMin = new Int32Array(N).fill(2 ** 31 - 1), builtMax = new Int32Array(N).fill(NO_GROUND);
  const hasFlat = new Uint8Array(N), field = new Uint8Array(N);
  // Area category per column: 1 field (farmland, crops), 2 path (paths, gravel, paving), 3 other low built. Areas only join within one category.
  const cat = new Uint8Array(N);
  const fieldId = kinds.map((k, i) => k === 'flat' && payload.palette[i]!.id !== 'minecraft:dirt_path');
  const pathId = kinds.map((k, i) => (k === 'flat' && payload.palette[i]!.id === 'minecraft:dirt_path') || PAVING.has(payload.palette[i]!.id) || ['minecraft:gravel', 'minecraft:coarse_dirt'].includes(payload.palette[i]!.id));
  // Paving: a column whose only built blocks are paving stones (path edges, plazas) counts as flat when one block high.
  const paving = kinds.map((k, i) => (k === 'built' || k === 'stone') && PAVING.has(payload.palette[i]!.id));
  const nonPaving = new Uint8Array(N);
  // Lowest built block that is not water, highest water above the ground (bridges float over it).
  const solidMin = new Int32Array(N).fill(2 ** 31 - 1), solidMax = new Int32Array(N).fill(NO_GROUND), waterTop = new Int32Array(N).fill(NO_GROUND);
  const colOf = (c: { readonly position: readonly number[] }) => (c.position[0]! - minX) + (c.position[2]! - minZ) * W;
  // Pass 1: ground from unambiguous soil, paths and farmland (a building on a path does not start below it).
  for (const c of payload.cells) {
    if (c.kind !== 'block') continue;
    const k = kinds[c.paletteIndex]!, col = colOf(c), y = c.position[1];
    const id = payload.palette[c.paletteIndex]!.id;
    if (k === 'soil' || id === 'minecraft:dirt_path' || id === 'minecraft:farmland') { if (y > ground[col]!) ground[col] = y; }
    if (id === 'minecraft:farmland') field[col] = 1;
  }
  // Columns without visible soil (under buildings, paved places) take the ground level of their nearest known neighbour.
  {
    let frontier: number[] = [];
    for (let i = 0; i < N; i++) if (ground[i] !== NO_GROUND) frontier.push(i);
    while (frontier.length) {
      const next: number[] = [];
      for (const i of frontier) {
        const x = i % W, z = (i - x) / W;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = x + dx, nz = z + dz;
          if (nx < 0 || nz < 0 || nx >= W || nz >= L) continue;
          const n = nx + nz * W;
          if (ground[n] === NO_GROUND) { ground[n] = ground[i]!; next.push(n); }
        }
      }
      frontier = next;
    }
  }
  const fieldNear = (col: number) => { const x = col % W, z = (col - x) / W; return !!(field[col] || (x > 0 && field[col - 1]) || (x + 1 < W && field[col + 1]) || (z > 0 && field[col - W]) || (z + 1 < L && field[col + W])); };
  const isNature = (c: Cell & { kind: 'block' | 'air' }): boolean => { const col = colOf(c); return natureAt(kinds[c.paletteIndex]!, c.position[1], ground[col]!, fieldNear(col)); };
  // Pass 2: classify every cell.
  let natureBlocks = 0;
  for (const c of payload.cells) {
    if (c.kind !== 'block') continue;
    const k = kinds[c.paletteIndex]!, col = colOf(c), y = c.position[1];
    if (isNature(c)) { natureBlocks++; continue; }
    if (fieldId[c.paletteIndex]) cat[col] = 1; else if (pathId[c.paletteIndex] && cat[col] !== 1) cat[col] = 2; else if (k !== 'flat' && !cat[col]) cat[col] = 3;
    if (k === 'flat') hasFlat[col] = 1;
    else { if (y < builtMin[col]!) builtMin[col] = y; if (y > builtMax[col]!) builtMax[col] = y; if (!paving[c.paletteIndex]) nonPaving[col] = 1; }
    if (k === 'water') { if (y > waterTop[col]!) waterTop[col] = y; }
    else if (k !== 'flat') { if (y < solidMin[col]!) solidMin[col] = y; if (y > solidMax[col]!) solidMax[col] = y; }
  }
  // under: every solid built block lies at or below the ground (cellar, bunker, tunnel).
  // float: the solid built blocks start above a gap (air or water) and are thin – a deck, not a wall on the ground.
  const under = new Uint8Array(N), float = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (solidMax[i] === NO_GROUND || ground[i] === NO_GROUND) continue;
    if (solidMax[i]! <= ground[i]!) { under[i] = 1; continue; }
    const floor = Math.max(ground[i]!, waterTop[i]!);
    if (solidMin[i]! - floor >= (waterTop[i] !== NO_GROUND && waterTop[i]! >= ground[i]! ? 1 : 2) && solidMax[i]! - solidMin[i]! < options.coreHeight) float[i] = 1;
  }
  // low: built but below core height; flatOnly: only paths/fields (never absorbed into a building, so path networks stay whole).
  const tall = new Uint8Array(N), core = new Uint8Array(N), low = new Uint8Array(N), flatOnly = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (builtMax[i] !== NO_GROUND) {
      // SPLIT-01-S05 (real base from the game): water never makes a column tall – a slab footbridge over a stream two blocks
      // deep counted as a „Gebäude“ before. Height = solid built blocks above the ground or above the water they stand on.
      if (solidMax[i] === NO_GROUND) { low[i] = 1; continue; }
      let base = ground[i] !== NO_GROUND && ground[i]! < solidMax[i]! ? ground[i]! : solidMin[i]! - 1;
      if (waterTop[i] !== NO_GROUND && waterTop[i]! < solidMin[i]! && waterTop[i]! > base) base = waterTop[i]!;
      if (solidMax[i]! - base >= options.coreHeight) tall[i] = 1;
      else { low[i] = 1; if (!nonPaving[i] && builtMax[i] === builtMin[i]) flatOnly[i] = 1; }
    } else if (hasFlat[i]) { low[i] = 1; flatOnly[i] = 1; }
  }

  // Buildings: core columns joined within `join` (Chebyshev); rooms below ground and surface buildings never join,
  // except a room lying (mostly) right next to or under a surface building: that is its cellar.
  const owner = new Int32Array(N);
  const j = options.join;
  const groupCores = (): number => {
    owner.fill(0);
    const groups: number[][] = [];
    for (let start = 0; start < N; start++) {
      if (!core[start] || owner[start]) continue;
      const id = groups.length + 1, list = [start];
      owner[start] = id;
      for (let q = 0; q < list.length; q++) {
        const i = list[q]!, x = i % W, z = (i - x) / W;
        for (let dz = -j - 1; dz <= j + 1; dz++) for (let dx = -j - 1; dx <= j + 1; dx++) {
          const nx = x + dx, nz = z + dz;
          if (nx < 0 || nz < 0 || nx >= W || nz >= L) continue;
          const n = nx + nz * W;
          if (core[n] && !owner[n] && under[n] === under[start]) { owner[n] = id; list.push(n); }
        }
      }
      groups.push(list);
    }
    const boxOf = groups.map(list => { let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity; for (const i of list) { const x = i % W, z = (i - x) / W; x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); } return { x0: x0 - j - 1, z0: z0 - j - 1, x1: x1 + j + 1, z1: z1 + j + 1 }; });
    for (let g = 0; g < groups.length; g++) {
      if (!groups[g]!.length || !under[groups[g]![0]!]) continue;
      let best = -1, bestIn = 0;
      for (let h = 0; h < groups.length; h++) {
        if (h === g || !groups[h]!.length || under[groups[h]![0]!]) continue;
        const b = boxOf[h]!;
        const inside = groups[g]!.filter(i => { const x = i % W, z = (i - x) / W; return x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1; }).length;
        if (inside > bestIn) { best = h; bestIn = inside; }
      }
      if (best >= 0 && bestIn * 2 >= groups[g]!.length) {
        for (const i of groups[g]!) { owner[i] = best + 1; groups[best]!.push(i); }
        groups[g] = [];
      }
    }
    // Too small cores (lamp posts, single pillars) stay low columns.
    const keep: number[] = [];
    for (let g = 0; g < groups.length; g++) {
      if (!groups[g]!.length) continue;
      if (groups[g]!.length >= options.minCore) keep.push(g);
      else for (const i of groups[g]!) owner[i] = 0;
    }
    const remap = new Map(keep.map((g, k) => [g + 1, k + 1]));
    for (let i = 0; i < N; i++) if (owner[i]) owner[i] = remap.get(owner[i]!)!;
    return keep.length;
  };

  // Bridges, first pass: buildings without floating columns; a floating strip that touches two of them,
  // or a long narrow free strip, is a bridge. Every other floating column (roofs over a hall, eaves) is
  // part of its building again in the second pass.
  for (let i = 0; i < N; i++) core[i] = tall[i] && !float[i] ? 1 : 0;
  const firstBuildings = groupCores();
  const bridgeCols: number[][] = [], bridgeEnds: number[][] = [];
  const isBridge = new Uint8Array(N);
  {
    const seen = new Uint8Array(N);
    for (let start = 0; start < N; start++) {
      if (!float[start] || owner[start] || seen[start]) continue;
      const list = [start]; seen[start] = 1;
      for (let q = 0; q < list.length; q++) {
        const i = list[q]!, x = i % W, z = (i - x) / W;
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, nz = z + dz;
          if ((!dx && !dz) || nx < 0 || nz < 0 || nx >= W || nz >= L) continue;
          const n = nx + nz * W;
          if (float[n] && !owner[n] && !seen[n]) { seen[n] = 1; list.push(n); }
        }
      }
      const touch = new Map<number, number>();
      let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
      for (const i of list) {
        const x = i % W, z = (i - x) / W;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
        // Direct neighbours only: eaves of two close houses do not make a bridge (their cores join anyway).
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, nz = z + dz;
          if (nx < 0 || nz < 0 || nx >= W || nz >= L) continue;
          const o = owner[nx + nz * W]!;
          if (o > 0 && o <= firstBuildings && !touch.has(o)) touch.set(o, nx + nz * W);
        }
      }
      const long = Math.max(x1 - x0, z1 - z0) + 1, wide = Math.min(x1 - x0, z1 - z0) + 1;
      // One building only: eaves, balconies, overhangs, roofs – they stay with it.
      if (touch.size >= 2 || (touch.size === 0 && long >= 8 && wide <= 5 && long >= wide * 3)) {
        for (const i of list) isBridge[i] = 1;
        bridgeCols.push(list); bridgeEnds.push([...touch.values()]);
      }
    }
  }
  // Second pass: the real buildings (floating roofs belong to them again), bridges after them.
  for (let i = 0; i < N; i++) { core[i] = tall[i] && !isBridge[i] ? 1 : 0; if (tall[i] && !core[i]) low[i] = 1; }
  const buildings = groupCores();
  for (let i = 0; i < N; i++) if (tall[i] && !owner[i]) { core[i] = 0; low[i] = 1; }
  const bridgeLinks: number[][] = [];
  bridgeCols.forEach((list, b) => {
    for (const i of list) { owner[i] = buildings + b + 1; low[i] = 1; }
    bridgeLinks.push([...new Set(bridgeEnds[b]!.map(i => owner[i]!).filter(o => o > 0 && o <= buildings))].sort((a, c) => a - c));
  });
  const bridges = bridgeLinks.length;

  // Margin: low columns near a building join it (breadth first, nearest wins).
  let frontier: number[] = [];
  for (let i = 0; i < N; i++) if (owner[i]) frontier.push(i);
  for (let step = 0; step < options.margin; step++) {
    const next: number[] = [];
    for (const i of frontier) {
      const x = i % W, z = (i - x) / W;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, nz = z + dz;
        if ((!dx && !dz) || nx < 0 || nz < 0 || nx >= W || nz >= L) continue;
        const n = nx + nz * W;
        if (low[n] && !flatOnly[n] && !owner[n]) { owner[n] = owner[i]!; next.push(n); }
      }
    }
    frontier = next;
  }

  // Areas: remaining low columns, 8-connected.
  let nextId = buildings + bridges + 1;
  const areaIds: number[] = [];
  // Seeds by category: fields first (they take their fence rings with them), then paths, then the rest.
  for (const seedCat of [1, 2, 3]) for (let start = 0; start < N; start++) {
    if (!low[start] || owner[start] || cat[start] !== seedCat) continue;
    const list = [start];
    owner[start] = nextId;
    for (let q = 0; q < list.length; q++) {
      const i = list[q]!, x = i % W, z = (i - x) / W;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, nz = z + dz;
        if ((!dx && !dz) || nx < 0 || nz < 0 || nx >= W || nz >= L) continue;
        const n = nx + nz * W;
        if (low[n] && !owner[n] && (cat[n] === seedCat || (seedCat === 1 && cat[n] === 3))) { owner[n] = nextId; list.push(n); }
      }
    }
    if (list.length >= options.minArea) { areaIds.push(nextId); nextId++; }
    else for (const i of list) owner[i] = -1;
  }
  for (let i = 0; i < N; i++) if (owner[i] === -1) owner[i] = 0;

  // Per part: box, counts, height.
  const total = nextId - 1;
  const box = Array.from({ length: total }, () => ({ x0: Infinity, z0: Infinity, x1: -Infinity, z1: -Infinity, y0: Infinity, y1: -Infinity, cols: 0, blocks: 0, groundMin: Infinity, below: 0, under: 0 }));
  const counts = Array.from({ length: total }, () => new Map<string, number>());
  const ents = Array.from({ length: total }, () => new Map<string, number>());
  for (let i = 0; i < N; i++) {
    const o = owner[i]!; if (!o) continue;
    const b = box[o - 1]!, x = i % W, z = (i - x) / W;
    b.cols++; b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.z0 = Math.min(b.z0, z); b.z1 = Math.max(b.z1, z);
    if (ground[i] !== NO_GROUND) b.groundMin = Math.min(b.groundMin, ground[i]!);
    if (under[i]) b.under++;
  }
  let restBlocks = 0;
  for (const c of payload.cells) {
    if (c.kind !== 'block' || isNature(c)) continue;
    const o = owner[colOf(c)]!;
    if (!o) { restBlocks++; continue; }
    const b = box[o - 1]!;
    b.blocks++; b.y0 = Math.min(b.y0, c.position[1]); b.y1 = Math.max(b.y1, c.position[1]);
    const g = ground[colOf(c)]!;
    if (g !== NO_GROUND && c.position[1] <= g && kinds[c.paletteIndex] !== 'flat') b.below++;
    const id = payload.palette[c.paletteIndex]!.id.replace('minecraft:', '');
    counts[o - 1]!.set(id, (counts[o - 1]!.get(id) ?? 0) + 1);
  }
  for (const e of payload.entities ?? []) {
    const x = Math.floor(e.position[0]), z = Math.floor(e.position[2]);
    const col = (x - minX) + (z - minZ) * W;
    if (x < minX || z < minZ || x - minX >= W || z - minZ >= L) continue;
    const o = owner[col]!; if (!o) continue;
    const id = entityId(e).replace('minecraft:', '');
    ents[o - 1]!.set(id, (ents[o - 1]!.get(id) ?? 0) + 1);
  }
  const parts: SplitPart[] = [];
  const named = new Map<string, number>();
  // Order: buildings (rooms below ground after the surface ones of the same size), bridges, areas.
  const rank = (k: number) => k < buildings ? 0 : k < buildings + bridges ? 1 : 2;
  const order = [...Array(total).keys()].filter(k => box[k]!.blocks > 0)
    .sort((a, b) => rank(a) - rank(b) || box[b]!.blocks - box[a]!.blocks || a - b);
  const toPart = new Int32Array(total + 1);
  order.forEach((k, idx) => { toPart[k + 1] = idx + 1; });
  for (const k of order) {
    const b = box[k]!, kind = k < buildings ? 'building' : k < buildings + bridges ? 'building' : 'area';
    const role = k >= buildings && k < buildings + bridges ? 'bridge' as const : k < buildings && b.under * 2 > b.cols ? 'underground' as const : undefined;
    const guess = role === 'bridge' ? { id: null, name: 'Brücke', reason: '' } : detectFunction(counts[k]!, ents[k]!, kind === 'area');
    const base = role === 'underground' ? (guess.id ? `${guess.name} (unterirdisch)` : 'Unterirdischer Raum') : guess.name;
    const n = (named.get(base) ?? 0) + 1; named.set(base, n);
    const groundTop = Number.isFinite(b.groundMin) ? b.groundMin : b.y0 - 1;
    const links = role === 'bridge' ? bridgeLinks[k - buildings]!.map(o => toPart[o]!).filter(Boolean).map(o => `teil-${o}`) : [];
    const reason = role === 'bridge' ? (links.length >= 2 ? 'verbindet zwei Gebäude über eine Lücke' : 'schmaler Steg über Wasser oder Luft')
      : role === 'underground' ? [guess.reason, 'unter dem Gelände'].filter(Boolean).join(', ')
      : b.below >= 20 && b.below * 5 >= b.blocks ? [guess.reason, `mit Keller (${b.below} Blöcke unter dem Gelände)`].filter(Boolean).join(', ') : guess.reason;
    parts.push({ id: `teil-${parts.length + 1}`, kind, name: n > 1 ? `${base} ${n}` : base, fn: guess.id, reason,
      box: { min: [minX + b.x0, Math.min(b.y0, groundTop + 1), minZ + b.z0], maxExclusive: [minX + b.x1 + 1, b.y1 + 1, minZ + b.z1 + 1] },
      columns: b.cols, blocks: b.blocks, height: role === 'underground' ? b.y1 - b.y0 + 1 : Math.max(0, b.y1 - groundTop),
      top: [...counts[k]!].sort((p, q) => q[1] - p[1] || (p[0] < q[0] ? -1 : 1)).slice(0, 5).map(([id, count]) => ({ id, count })),
      ...(role && { role }), ...(b.below && { below: b.below }), ...(links.length && { connects: links }) });
  }
  // Renumber owners to the sorted part order.
  for (let i = 0; i < N; i++) if (owner[i]) owner[i] = toPart[owner[i]!]!;
  void minY;
  return { options, parts, owner, width: W, length: L, minX, minZ, ground, field, restBlocks, natureBlocks };
}

// ---------------------------------------------------------------------------
// Extraction

export type GroundMode = 'ohne' | 'mit';
export interface ExtractOptions {
  /** 'ohne' (default): only built and flat blocks; 'mit': natural ground and plants in the part's columns too. */
  readonly ground?: GroundMode;
  /** Layers of ground below the part to include with `ground: 'mit'` (0–8, default 1). */
  readonly foundation?: number;
}

export interface ExtractedPart {
  readonly part: SplitPart;
  readonly payload: VoxelPayload;
  /** Minimum corner of the new payload in source coordinates (where it came from). */
  readonly at: Vec3;
}

/** Natural cell (ground, plants, water below the surface) according to an analysis. */
export function isNatureCell(payload: VoxelPayload, analysis: SplitAnalysis, c: Cell): boolean {
  if (c.kind !== 'block') return false;
  const { minX, minZ, width: W, length: L } = analysis;
  const x = c.position[0] - minX, z = c.position[2] - minZ;
  if (x < 0 || z < 0 || x >= W || z >= L) return false;
  const col = x + z * W, f = analysis.field;
  const near = !!(f[col] || (x > 0 && f[col - 1]) || (x + 1 < W && f[col + 1]) || (z > 0 && f[col - W]) || (z + 1 < L && f[col + W]));
  return natureAt(kindOf(payload.palette[c.paletteIndex]!.id), c.position[1], analysis.ground[col]!, near);
}

/** Cuts one or more parts (by id, merged) out of the source. The source stays unchanged. */
export function extractParts(payload: VoxelPayload, analysis: SplitAnalysis, partIds: readonly string[], options: ExtractOptions = {}): ExtractedPart {
  validatePayload(payload);
  const index = new Map(analysis.parts.map((p, i) => [p.id, i + 1]));
  const want = new Set<number>();
  for (const id of partIds) { const i = index.get(id); if (!i) fail(`Teil ${id} gibt es nicht`); want.add(i!); }
  if (!want.size) fail('kein Teil gewählt');
  const parts = [...want].map(i => analysis.parts[i - 1]!);
  const ground = options.ground ?? 'ohne', foundation = options.foundation ?? 1;
  if (!Number.isInteger(foundation) || foundation < 0 || foundation > 8) fail('Fundament 0–8 Schichten');
  const min: [number, number, number] = [Math.min(...parts.map(p => p.box.min[0])), Math.min(...parts.map(p => p.box.min[1])) - (ground === 'mit' ? foundation : 0), Math.min(...parts.map(p => p.box.min[2]))];
  const max: [number, number, number] = [Math.max(...parts.map(p => p.box.maxExclusive[0])), Math.max(...parts.map(p => p.box.maxExclusive[1])), Math.max(...parts.map(p => p.box.maxExclusive[2]))];
  const { minX, minZ, width: W, length: L, owner } = analysis;
  const mine = (x: number, z: number) => x >= minX && z >= minZ && x - minX < W && z - minZ < L && want.has(owner[(x - minX) + (z - minZ) * W]!);
  const inY = (y: number) => y >= min[1] && y < max[1];
  const keepCell = (c: Cell): boolean => {
    if (c.kind === 'erase' || !inY(c.position[1]) || !mine(c.position[0], c.position[2])) return false;
    if (c.kind === 'air') return true;
    return ground === 'mit' || !isNatureCell(payload, analysis, c);
  };
  const shift = (p: readonly number[]): [number, number, number] => [p[0]! - min[0], p[1]! - min[1], p[2]! - min[2]];
  const cells = payload.cells.filter(keepCell);
  if (!cells.some(c => c.kind === 'block')) fail('der gewählte Teil enthält keine Blöcke');
  // Palette compacted to the used states.
  const used = new Map<number, number>();
  const palette: VoxelPayload['palette'][number][] = [];
  const out: Cell[] = cells.map(c => {
    if (c.kind === 'erase') return c;
    let idx = used.get(c.paletteIndex);
    if (idx === undefined) { idx = palette.length; used.set(c.paletteIndex, idx); palette.push(payload.palette[c.paletteIndex]!); }
    return { position: shift(c.position), kind: c.kind, paletteIndex: idx };
  });
  const kept = new Set<string>();
  for (const c of cells) if (c.kind === 'block') kept.add(`${c.position[0]},${c.position[1]},${c.position[2]}`);
  const blockEntities: BlockEntity[] = payload.blockEntities.filter(e => kept.has(`${e.position[0]},${e.position[1]},${e.position[2]}`))
    .map(e => ({ ...e, position: shift(e.position) }));
  const entities: FreeEntity[] = (payload.entities ?? []).filter(e => { const p = e.position.map(Math.floor); return inY(p[1]!) && mine(p[0]!, p[2]!); })
    .map(e => ({ ...e, position: [e.position[0] - min[0], e.position[1] - min[1], e.position[2] - min[2]] as [number, number, number] }));
  const merged: SplitPart = parts.length === 1 ? parts[0]! : { ...parts[0]!, id: parts.map(p => p.id).join('+'), name: parts.map(p => p.name).join(' + '),
    columns: parts.reduce((n, p) => n + p.columns, 0), blocks: parts.reduce((n, p) => n + p.blocks, 0), box: { min, maxExclusive: max } };
  const result = createPayload({
    schemaVersion: 1, profileId: payload.profileId,
    bounds: { min: [0, 0, 0], maxExclusive: shift(max) }, pivot: [0, 0, 0],
    sourceOrigin: payload.sourceOrigin.map((n, i) => n + min[i]!),
    palette, cells: out, blockEntities, ...(entities.length && { entities }),
  });
  return { part: merged, payload: result, at: min };
}

/** Everything that is in no chosen part (ground, trees, small leftovers) – optional "Gelände & Rest". */
export function extractRest(payload: VoxelPayload, analysis: SplitAnalysis, takenIds: readonly string[]): VoxelPayload | null {
  const index = new Map(analysis.parts.map((p, i) => [p.id, i + 1]));
  const taken = new Set(takenIds.map(id => index.get(id)).filter((n): n is number => !!n));
  const { minX, minZ, width: W, owner } = analysis;
  const ranges = new Map(analysis.parts.map((p, i) => [i + 1, p.box]));
  const inTaken = (c: Cell) => {
    const o = owner[(c.position[0] - minX) + (c.position[2] - minZ) * W]!;
    if (!taken.has(o)) return false;
    const b = ranges.get(o)!;
    if (c.position[1] < b.min[1] || c.position[1] >= b.maxExclusive[1]) return false;
    // Natural ground in a taken column stays in the rest.
    return !isNatureCell(payload, analysis, c);
  };
  const cells = payload.cells.filter(c => c.kind !== 'erase' && !inTaken(c));
  if (!cells.some(c => c.kind === 'block')) return null;
  const keys = new Set(cells.map(c => c.position.join(',')));
  return createPayload({ ...payload, cells, blockEntities: payload.blockEntities.filter(e => keys.has(e.position.join(','))),
    ...(payload.entities && { entities: payload.entities.filter(e => { const o = owner[(Math.floor(e.position[0]) - minX) + (Math.floor(e.position[2]) - minZ) * W]; return !o || !taken.has(o); }) }) });
}

// ---------------------------------------------------------------------------
// As a project

export interface SplitProjectPart {
  readonly version: AssetVersion;
  readonly name: string;
  readonly kind: 'building' | 'area' | 'rest';
  /** Minimum corner in source coordinates. */
  readonly at: Vec3;
}

/**
 * Project with one instance per extracted part at its original position
 * (source minimum = project origin) and build sections: rest/ground first, then
 * areas (paths, fields), then the buildings.
 */
export function splitProject(input: { name: string; profileId: string; description?: string; source: Pick<VoxelPayload, 'bounds'>; parts: readonly SplitProjectPart[] }): Project {
  if (!input.parts.length) fail('keine Teile');
  let project = createProject({ name: input.name.trim().slice(0, 120) || 'Aufgeteiltes Modell', profileId: input.profileId,
    description: (input.description ?? `In ${input.parts.length} Teile aufgeteilt; jede Instanz steht an ihrer ursprünglichen Stelle.`).slice(0, 2000) });
  const o = input.source.bounds.min;
  const instances: Instance[] = input.parts.map(p => ({ id: newId('inst'), assetVersionId: p.version.id, name: p.name.slice(0, 120), override: false,
    transform: { position: [p.at[0] - o[0] - p.version.payload.bounds.min[0], p.at[1] - o[1] - p.version.payload.bounds.min[1], p.at[2] - o[2] - p.version.payload.bounds.min[2]], quarterTurns: 0, mirrorX: false } }));
  let site = siteOf(project);
  const group = (kind: SplitProjectPart['kind'], name: string, note: string) => {
    const members = input.parts.map((p, i) => p.kind === kind ? { instanceId: instances[i]!.id } : null).filter((x): x is { instanceId: string } => !!x);
    if (!members.length) return;
    site = addSection(site, name, members);
    const added = site.sections.at(-1)!;
    site = { ...site, sections: site.sections.map(x => x === added ? { ...x, note } : x) };
  };
  group('rest', 'Gelände & Rest', 'Boden, Bäume und Kleinteile, die keinem Teil zugeordnet wurden.');
  group('area', 'Wege, Felder & Flächen', 'Flache Bereiche zuerst: sie geben die Lage der Gebäude vor.');
  group('building', 'Gebäude', 'Jedes Gebäude ist ein eigenes Bauteil in der Bibliothek.');
  const operations: Operation[] = [...instances.map(instance => ({ kind: 'instance.add' as const, instance })), { kind: 'site.set', site: checkSite(site), label: 'Bauabschnitte aus dem Aufteilen' }];
  return applyOperation(project, { kind: 'batch', label: 'Modell in Teile aufgeteilt', operations }).project;
}
