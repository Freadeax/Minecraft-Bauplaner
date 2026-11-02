import type { BlockState, Bounds, Vec3, VoxelPayload } from '../../voxel/src/types.js';
import { UNLOADED_STATE } from '../../voxel/src/observation.js';
import { AIR_IDS } from '../../voxel/src/validation.js';
import type { WorldPlacement } from './worldmap.js';

/**
 * Terrain check of a placed project (WORLD-IMPORT-01). The planned blocks
 * (project coordinates + `project.world.origin`) are compared with a terrain
 * grid read from the player's own world files (packages/formats/src/worldExcerpt.ts):
 *
 *  - every planned cell: already there, free, terrain in the way, has to be
 *    cleared (planned air), stands in a fluid, or unknown;
 *  - every column of the base layer: carried by solid ground, hanging in the
 *    air (with the fill depth down to the ground), on a fluid, or unknown.
 *
 * Unknown terrain (chunk not read, not generated, unreadable) stays unknown and
 * is never counted as free or carried. Nothing here changes a world.
 */

/** Dense grid, structurally the same as WorldSample/WorldScan: `x + z·W + y·W·L`. */
export interface TerrainGrid {
  readonly box: Bounds;
  readonly size: Vec3;
  readonly palette: readonly BlockState[];
  readonly data: Uint32Array;
}

/** Placing a block replaces these without breaking anything first (vanilla tag #replaceable, without fluids). */
export const REPLACEABLE_IDS: ReadonlySet<string> = new Set([
  ...AIR_IDS, 'minecraft:short_grass', 'minecraft:tall_grass', 'minecraft:fern', 'minecraft:large_fern', 'minecraft:dead_bush', 'minecraft:bush',
  'minecraft:snow', 'minecraft:vine', 'minecraft:glow_lichen', 'minecraft:light', 'minecraft:structure_void', 'minecraft:fire', 'minecraft:soul_fire',
  'minecraft:seagrass', 'minecraft:tall_seagrass', 'minecraft:crimson_roots', 'minecraft:warped_roots', 'minecraft:nether_sprouts', 'minecraft:hanging_roots',
  'minecraft:leaf_litter', 'minecraft:resin_clump', 'minecraft:short_dry_grass', 'minecraft:tall_dry_grass',
]);
/** Natural ground a world excerpt may leave out ("Gelände weglassen"), so only the building remains. */
export const NATURAL_TERRAIN_IDS: ReadonlySet<string> = new Set([
  'grass_block', 'dirt', 'coarse_dirt', 'rooted_dirt', 'podzol', 'mycelium', 'mud', 'dirt_path', 'farmland', 'clay', 'gravel', 'sand', 'red_sand', 'suspicious_sand', 'suspicious_gravel',
  'stone', 'deepslate', 'granite', 'diorite', 'andesite', 'tuff', 'calcite', 'dripstone_block', 'bedrock', 'sandstone', 'red_sandstone', 'terracotta',
  'snow', 'snow_block', 'powder_snow', 'ice', 'packed_ice', 'water', 'lava', 'bubble_column', 'short_grass', 'tall_grass', 'fern', 'large_fern', 'seagrass', 'tall_seagrass', 'kelp', 'kelp_plant',
  'coal_ore', 'iron_ore', 'copper_ore', 'gold_ore', 'redstone_ore', 'lapis_ore', 'diamond_ore', 'emerald_ore',
  'deepslate_coal_ore', 'deepslate_iron_ore', 'deepslate_copper_ore', 'deepslate_gold_ore', 'deepslate_redstone_ore', 'deepslate_lapis_ore', 'deepslate_diamond_ore', 'deepslate_emerald_ore',
  'netherrack', 'soul_sand', 'soul_soil', 'basalt', 'blackstone', 'magma_block', 'nether_quartz_ore', 'nether_gold_ore', 'crimson_nylium', 'warped_nylium', 'end_stone',
].map(id => `minecraft:${id}`));
export const FLUID_IDS: ReadonlySet<string> = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
/** Not ground: trees and their parts stand on the ground, they are obstacles. */
const isTreePart = (id: string) => /_(leaves|log|wood|stem|hyphae)$/.test(id) || id === 'minecraft:mangrove_roots' || id === 'minecraft:muddy_mangrove_roots' || id.endsWith('mushroom_block');
/** Ground for heightmaps (TERRAIN-01): solid, not replaceable, no fluid, not part of a tree, not unknown. Same classes as checkTerrain. */
export const isGroundId = (id: string): boolean => id !== UNLOADED_STATE && !REPLACEABLE_IDS.has(id) && !FLUID_IDS.has(id) && !isTreePart(id);
export const isTreePartId = (id: string): boolean => isTreePart(id);
/** Not a surface for height maps: air, markers and everything a placed block replaces (plants, snow layers). */
export const SURFACE_SKIP_IDS: ReadonlySet<string> = new Set([...REPLACEABLE_IDS, 'minecraft:barrier', 'minecraft:structure_void', 'minecraft:light']);

export type TerrainVerdict = 'present' | 'free' | 'obstacle' | 'clear' | 'fluid' | 'unknown';
export const TERRAIN_VERDICT_LABEL: Readonly<Record<TerrainVerdict, string>> = {
  present: 'steht schon', free: 'frei', obstacle: 'Gelände im Weg', clear: 'freiräumen', fluid: 'im Wasser/Lava', unknown: 'unbekannt',
};
export type FootVerdict = 'carried' | 'hanging' | 'fluid' | 'unknown';
export const FOOT_VERDICT_LABEL: Readonly<Record<FootVerdict, string>> = {
  carried: 'trägt', hanging: 'hängt in der Luft', fluid: 'auf Wasser/Lava', unknown: 'unbekannt',
};

export interface TerrainOptions {
  /** How far below the base layer the grid reaches (fill depth search). */
  readonly depth?: number;
}
export const TERRAIN_DEPTH = 16;

export interface TerrainCheck {
  readonly origin: Vec3;
  readonly dimension: string;
  /** Planned cells by verdict (block, air and erase cells). */
  readonly cells: Readonly<Record<TerrainVerdict, number>>;
  /** Verdict per planned cell, keyed by project coordinate `x,y,z`. */
  readonly verdictAt: ReadonlyMap<string, TerrainVerdict>;
  readonly foundation: {
    /** Base layer columns (lowest planned block of the column is on the plan's lowest block layer). */
    readonly columns: number;
    /** Project Y of the base layer (lowest planned block layer); null without blocks. */
    readonly baseY: number | null;
    readonly carried: number; readonly hanging: number; readonly fluid: number; readonly unknown: number;
    /** Blocks needed to fill the gaps under hanging columns down to the ground. */
    readonly fillBlocks: number;
    readonly maxGap: number;
    /** At least one gap reaches the bottom of the grid; the true depth is larger. */
    readonly gapCapped: boolean;
    /** Verdict per base column, keyed by project `x,z`. */
    readonly at: ReadonlyMap<string, FootVerdict>;
  };
  /** Terrain blocks that have to go before building (obstacles and cells to clear), most frequent first. */
  readonly removal: readonly { readonly id: string; readonly count: number }[];
  /** Highest ground (solid, not part of a tree) in the footprint columns, world Y. */
  readonly ground: { readonly min: number; readonly max: number; readonly median: number } | null;
  /** Origin Y that puts the base layer directly onto the median ground; null without known ground. */
  readonly suggestedOriginY: number | null;
  /** True when no planned cell and no base column is unknown. */
  readonly complete: boolean;
  readonly notes: readonly string[];
}

/** World box a terrain check needs: the planned bounds at the placement, `depth` blocks deeper. */
export function terrainBox(planned: Bounds, origin: Vec3, depth = TERRAIN_DEPTH): Bounds {
  return {
    min: [planned.min[0] + origin[0], planned.min[1] + origin[1] - depth, planned.min[2] + origin[2]],
    maxExclusive: [planned.maxExclusive[0] + origin[0], planned.maxExclusive[1] + origin[1], planned.maxExclusive[2] + origin[2]],
  };
}

/** Compares a resolved project (project coordinates) with the terrain at its placement. */
export function checkTerrain(planned: VoxelPayload, placement: WorldPlacement, grid: TerrainGrid, options: TerrainOptions = {}): TerrainCheck {
  const depth = options.depth ?? TERRAIN_DEPTH;
  const o = placement.origin;
  const [W, H, L] = grid.size, [bx, by, bz] = grid.box.min;
  const kind = grid.palette.map(p => p.id === UNLOADED_STATE ? 'unknown' as const : REPLACEABLE_IDS.has(p.id) ? 'open' as const : FLUID_IDS.has(p.id) ? 'fluid' as const : 'solid' as const);
  const ground = grid.palette.map((p, i) => kind[i] === 'solid' && !isTreePart(p.id));
  /** Palette index at a world position; -1 outside the grid. */
  const at = (x: number, y: number, z: number): number => {
    const gx = x - bx, gy = y - by, gz = z - bz;
    if (gx < 0 || gy < 0 || gz < 0 || gx >= W || gy >= H || gz >= L) return -1;
    return grid.data[gx + gz * W + gy * W * L]!;
  };
  const cells: Record<TerrainVerdict, number> = { present: 0, free: 0, obstacle: 0, clear: 0, fluid: 0, unknown: 0 };
  const verdictAt = new Map<string, TerrainVerdict>();
  const removal = new Map<string, number>();
  let outside = 0;
  // Lowest planned block per column, and the plan's lowest block layer.
  const lowest = new Map<string, number>();
  let baseY = Infinity;
  for (const c of planned.cells) {
    const [x, y, z] = c.position, i = at(x + o[0], y + o[1], z + o[2]);
    let v: TerrainVerdict;
    if (i < 0) { outside++; v = 'unknown'; }
    else if (kind[i] === 'unknown') v = 'unknown';
    else if (c.kind === 'block') {
      const want = planned.palette[c.paletteIndex]!.id;
      v = grid.palette[i]!.id === want ? 'present' : kind[i] === 'open' ? 'free' : kind[i] === 'fluid' ? 'fluid' : 'obstacle';
    } else v = kind[i] === 'solid' ? 'clear' : kind[i] === 'fluid' ? 'fluid' : 'free';
    if (v === 'obstacle' || v === 'clear') { const id = grid.palette[i]!.id; removal.set(id, (removal.get(id) ?? 0) + 1); }
    cells[v]++; verdictAt.set(`${x},${y},${z}`, v);
    if (c.kind === 'block') {
      const k = `${x},${z}`, before = lowest.get(k);
      if (before === undefined || y < before) lowest.set(k, y);
      if (y < baseY) baseY = y;
    }
  }
  const foot = new Map<string, FootVerdict>();
  let carried = 0, hanging = 0, onFluid = 0, footUnknown = 0, fillBlocks = 0, maxGap = 0, gapCapped = false;
  const heights: number[] = [];
  const gridTop = by + H - 1;
  for (const [k, y] of lowest) {
    const [x, z] = k.split(',').map(Number) as [number, number];
    const wx = x + o[0], wz = z + o[2];
    // Ground height of the column (for the Y suggestion), searched from the grid top down.
    for (let wy = gridTop; wy >= by; wy--) {
      const i = at(wx, wy, wz);
      if (i < 0 || kind[i] === 'unknown') break;
      if (ground[i]) { heights.push(wy); break; }
    }
    if (y !== baseY) continue; // overhangs and upper storeys are carried by the building itself
    const below = at(wx, y + o[1] - 1, wz);
    let v: FootVerdict;
    if (below < 0 || kind[below] === 'unknown') v = 'unknown';
    else if (kind[below] === 'solid') v = 'carried';
    else if (kind[below] === 'fluid') v = 'fluid';
    else {
      v = 'hanging';
      let gap = 0, wy = y + o[1] - 1;
      for (; wy >= by; wy--, gap++) { const i = at(wx, wy, wz); if (i < 0 || kind[i] === 'unknown' || kind[i] === 'solid') break; }
      if (wy < by || at(wx, wy, wz) < 0 || kind[at(wx, wy, wz)] === 'unknown') gapCapped = true;
      fillBlocks += gap; maxGap = Math.max(maxGap, gap);
    }
    foot.set(k, v);
    if (v === 'carried') carried++; else if (v === 'hanging') hanging++; else if (v === 'fluid') onFluid++; else footUnknown++;
  }
  heights.sort((a, b) => a - b);
  const groundStats = heights.length ? { min: heights[0]!, max: heights.at(-1)!, median: heights[Math.floor(heights.length / 2)]! } : null;
  const suggestedOriginY = groundStats && Number.isFinite(baseY) ? groundStats.median + 1 - baseY : null;
  const notes: string[] = [];
  if (outside) notes.push(`${outside} geplante Zellen liegen außerhalb des gelesenen Bereichs.`);
  if (cells.unknown) notes.push(`${cells.unknown} geplante Zellen stehen auf unbekanntem Gelände (Chunk nicht gelesen, nie erzeugt oder unfertig) und sind ungeprüft.`);
  if (gapCapped) notes.push(`Mindestens eine Lücke unter dem Fundament reicht tiefer als ${depth} Blöcke; die Unterbaumenge ist eine Untergrenze.`);
  if (groundStats && groundStats.max - groundStats.min > 3) notes.push(`Das Gelände im Grundriss schwankt um ${groundStats.max - groundStats.min} Blöcke.`);
  notes.push('Geprüft werden nur Blöcke. Entities, Redstone-Verhalten und Schutzgebiete auf Servern sind nicht Teil der Prüfung.');
  return {
    origin: o, dimension: placement.dimension, cells, verdictAt,
    foundation: { columns: foot.size, baseY: Number.isFinite(baseY) ? baseY : null, carried, hanging, fluid: onFluid, unknown: footUnknown, fillBlocks, maxGap, gapCapped, at: foot },
    removal: [...removal].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count || a.id.localeCompare(b.id)),
    ground: groundStats, suggestedOriginY,
    complete: cells.unknown === 0 && footUnknown === 0,
    notes,
  };
}
