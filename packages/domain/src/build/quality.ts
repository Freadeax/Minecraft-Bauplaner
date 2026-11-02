import type { VoxelPayload } from '../../../voxel/src/types.js';

/**
 * Gestaltungskennwerte (LIB-05): the measures used to compare our buildings
 * with the studied builds (docs/architecture/BAUSTIL.md). Terrain blocks
 * (grass, dirt, plants, water) are left out.
 */
export interface DesignMetrics {
  /** Counted building blocks. */
  readonly blocks: number;
  /** Share of blocks that are not full cubes (stairs, slabs, trapdoors, fences …), 0..1. */
  readonly detail: number;
  /** Share of stairs placed upside down (brackets, lintels, sills), 0..1. */
  readonly upsideDown: number;
  /** Share of the visible façade area lying on the main plane of each side (lower = more relief), 0..1. */
  readonly flatFacade: number;
  /** Distinct block ids. */
  readonly materials: number;
}

const TERRAIN = /^(grass_block|dirt|coarse_dirt|rooted_dirt|podzol|farmland|dirt_path|water|lava|sand|gravel|short_grass|tall_grass|fern|large_fern|.*_leaves|snow)$/;
const NOT_FULL = /(stairs|slab|_wall$|fence|trapdoor|door|button|pane|lantern|torch|carpet|sign|banner|chain|candle|bars|pot|rod|plate|hook|ladder|bed|campfire|cake|vine|flower|poppy|tulip|daisy|bluet|allium|orchid|dandelion|cornflower|lily|azalea$|bush|sapling|bell|chest|anvil|lectern|grindstone|stonecutter|cauldron|hopper|brewing|scaffold|head|skull|pickle|coral(?!_block)|amethyst_cluster|bud)/;

export function designMetrics(payload: VoxelPayload): DesignMetrics {
  const [sx, sy, sz] = payload.bounds.maxExclusive, [mx, my, mz] = payload.bounds.min;
  const W = sx - mx, Hh = sy - my, D = sz - mz;
  const occ = new Uint8Array(W * Hh * D);
  let blocks = 0, nonFull = 0, stairs = 0, upside = 0;
  const ids = new Set<string>();
  for (const c of payload.cells) {
    if (c.kind !== 'block') continue;
    const s = payload.palette[c.paletteIndex]!, id = s.id.replace('minecraft:', '');
    if (id === 'air' || TERRAIN.test(id)) continue;
    blocks++; ids.add(id);
    if (NOT_FULL.test(id)) nonFull++;
    if (id.endsWith('_stairs')) { stairs++; if (s.properties.half === 'top') upside++; }
    const [x, y, z] = c.position;
    occ[(x - mx) + W * ((y - my) + Hh * (z - mz))] = 1;
  }
  // Façade relief: for each of the four sides, the first hit along the view ray per (u, y).
  const planes: number[] = [];
  const views: readonly [number, number, (u: number, y: number, d: number) => number][] = [
    [W, D, (u, y, d) => u + W * (y + Hh * d)], [W, D, (u, y, d) => u + W * (y + Hh * (D - 1 - d))],
    [D, W, (u, y, d) => d + W * (y + Hh * u)], [D, W, (u, y, d) => (W - 1 - d) + W * (y + Hh * u)],
  ];
  for (const [U, depth, at] of views) {
    const hist = new Map<number, number>();
    let hits = 0;
    for (let u = 0; u < U; u++) for (let y = 0; y < Hh; y++) for (let d = 0; d < depth; d++) {
      if (!occ[at(u, y, d)]) continue;
      hist.set(d, (hist.get(d) ?? 0) + 1); hits++; break;
    }
    if (hits >= 10) planes.push(Math.max(...hist.values()) / hits);
  }
  return {
    blocks,
    detail: blocks ? nonFull / blocks : 0,
    upsideDown: stairs ? upside / stairs : 0,
    flatFacade: planes.length ? planes.reduce((a, b) => a + b, 0) / planes.length : 1,
    materials: ids.size,
  };
}
