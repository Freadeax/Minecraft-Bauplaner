/**
 * Layer index for the build plan (Ebenen, B12): occupied cells per Y layer and
 * per-layer block counts. Pure data, no DOM and no runtime imports, so Node
 * tests load it directly. Air, explicit air and erase cells are not drawn.
 */
export interface LayerCell { readonly x: number; readonly z: number; readonly index: number; readonly paletteIndex: number }
export interface LayerIndex {
  /** Inclusive x/z range of the payload bounds. */
  readonly x0: number; readonly x1: number; readonly z0: number; readonly z1: number;
  /** All Y layers of the bounds, lowest first. */
  readonly ys: readonly number[];
  readonly byY: ReadonlyMap<number, readonly LayerCell[]>;
}
interface PayloadLike {
  readonly bounds: { readonly min: readonly number[]; readonly maxExclusive: readonly number[] };
  readonly palette: readonly { readonly id: string }[];
  readonly cells: readonly ({ readonly position: readonly number[]; readonly kind: string; readonly paletteIndex?: number })[];
}
const EMPTY = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);

export function layerIndex(payload: PayloadLike): LayerIndex {
  const byY = new Map<number, LayerCell[]>();
  payload.cells.forEach((c, index) => {
    if (c.kind !== 'block' || c.paletteIndex === undefined || EMPTY.has(payload.palette[c.paletteIndex]?.id ?? '')) return;
    const y = c.position[1]!;
    let list = byY.get(y);
    if (!list) { list = []; byY.set(y, list); }
    list.push({ x: c.position[0]!, z: c.position[2]!, index, paletteIndex: c.paletteIndex });
  });
  const ys: number[] = [];
  for (let y = payload.bounds.min[1]!; y < payload.bounds.maxExclusive[1]!; y++) ys.push(y);
  return { x0: payload.bounds.min[0]!, x1: payload.bounds.maxExclusive[0]! - 1, z0: payload.bounds.min[2]!, z1: payload.bounds.maxExclusive[2]! - 1, ys, byY };
}

/** Lowest layer that holds a block (the natural start of a build), else the lowest layer. */
export function firstBuiltLayer(index: LayerIndex): number {
  return index.ys.find(y => (index.byY.get(y)?.length ?? 0) > 0) ?? index.ys[0] ?? 0;
}

/** Block ids of one layer with counts, most frequent first; ties by id. */
export function layerCounts(index: LayerIndex, y: number, palette: readonly { readonly id: string }[]): { id: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const c of index.byY.get(y) ?? []) { const id = palette[c.paletteIndex]!.id; counts.set(id, (counts.get(id) ?? 0) + 1); }
  return [...counts].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count || (a.id < b.id ? -1 : 1));
}

/** Screen arrow direction of a horizontal facing in the plan (north up): unit [dx, dz]. */
export function facingArrow(properties: Readonly<Record<string, string>>): readonly [number, number] | null {
  switch (properties.facing ?? properties.horizontal_facing) {
    case 'north': return [0, -1];
    case 'south': return [0, 1];
    case 'east': return [1, 0];
    case 'west': return [-1, 0];
    default: return null;
  }
}

/** Shape glyph of a block in the plan: half (slab), step (stairs) or none. */
export function shapeOf(id: string, properties: Readonly<Record<string, string>>): 'half-bottom' | 'half-top' | 'double' | 'stairs' | null {
  if (id.endsWith('_slab')) return properties.type === 'top' ? 'half-top' : properties.type === 'double' ? 'double' : 'half-bottom';
  if (id.endsWith('_stairs')) return 'stairs';
  return null;
}
