import type { BlockState, Cell, Vec3, VoxelPayload } from './types.js';
import { createPayload, stateKey, validatePayload } from './validation.js';

/**
 * Cell-by-cell comparison of two structures (Bauversionen, B12). Both payloads
 * are aligned at their bounds minimum, so a moved selection does not count as
 * changed. A cell is occupied when it holds a selected block that is not air;
 * explicit air, erase and unselected cells are empty. Changes are classified as
 * added, removed, material (other block id) or state (same id, other properties,
 * e.g. a rotated stair). The comparison is exact: no tolerance, no mesh.
 */
export type DiffKind = 'same' | 'added' | 'removed' | 'material' | 'state';
export interface DiffCell {
  /** Position relative to the aligned minimum of both payloads. */
  readonly position: Vec3;
  readonly kind: DiffKind;
  readonly before: BlockState | null;
  readonly after: BlockState | null;
}
export interface BlockDelta { readonly id: string; readonly before: number; readonly after: number }
export interface PayloadDiff {
  /** Extent of the union of both aligned payloads. */
  readonly size: Vec3;
  readonly counts: Readonly<Record<DiffKind, number>>;
  /** Number of occupied cells in A and B. */
  readonly blocksBefore: number;
  readonly blocksAfter: number;
  /** Every occupied cell of A or B, sorted y, z, x. */
  readonly cells: readonly DiffCell[];
  /** Block counts by id (properties ignored), largest absolute change first; unchanged ids omitted. */
  readonly blocks: readonly BlockDelta[];
}

const EMPTY_IDS = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
/** True for cells that hold a visible block. */
export function isOccupied(payload: Pick<VoxelPayload, 'palette'>, cell: Cell): boolean {
  return cell.kind === 'block' && !EMPTY_IDS.has(payload.palette[cell.paletteIndex]?.id ?? 'minecraft:air');
}

function occupied(payload: VoxelPayload): Map<string, { position: Vec3; state: BlockState }> {
  const out = new Map<string, { position: Vec3; state: BlockState }>();
  const [mx, my, mz] = payload.bounds.min;
  for (const c of payload.cells) {
    if (c.kind !== 'block' || !isOccupied(payload, c)) continue;
    const position: Vec3 = [c.position[0] - mx, c.position[1] - my, c.position[2] - mz];
    out.set(position.join(','), { position, state: payload.palette[c.paletteIndex]! });
  }
  return out;
}

export function diffPayloads(a: VoxelPayload, b: VoxelPayload): PayloadDiff {
  validatePayload(a); validatePayload(b);
  const before = occupied(a), after = occupied(b);
  const counts: Record<DiffKind, number> = { same: 0, added: 0, removed: 0, material: 0, state: 0 };
  const cells: DiffCell[] = [];
  const byId = new Map<string, { before: number; after: number }>();
  const tally = (id: string, side: 'before' | 'after') => { const t = byId.get(id) ?? { before: 0, after: 0 }; t[side]++; byId.set(id, t); };
  for (const [key, x] of before) {
    tally(x.state.id, 'before');
    const y = after.get(key);
    const kind: DiffKind = !y ? 'removed' : x.state.id !== y.state.id ? 'material' : stateKey(x.state) !== stateKey(y.state) ? 'state' : 'same';
    counts[kind]++;
    cells.push({ position: x.position, kind, before: x.state, after: y?.state ?? null });
  }
  for (const [key, y] of after) {
    tally(y.state.id, 'after');
    if (before.has(key)) continue;
    counts.added++;
    cells.push({ position: y.position, kind: 'added', before: null, after: y.state });
  }
  cells.sort((p, q) => p.position[1] - q.position[1] || p.position[2] - q.position[2] || p.position[0] - q.position[0]);
  const size = [0, 1, 2].map(i => Math.max(a.bounds.maxExclusive[i]! - a.bounds.min[i]!, b.bounds.maxExclusive[i]! - b.bounds.min[i]!)) as unknown as Vec3;
  const blocks = [...byId].filter(([, t]) => t.before !== t.after).map(([id, t]) => ({ id, ...t }))
    .sort((p, q) => Math.abs(q.after - q.before) - Math.abs(p.after - p.before) || (p.id < q.id ? -1 : p.id > q.id ? 1 : 0));
  return { size, counts, blocksBefore: before.size, blocksAfter: after.size, cells, blocks };
}

/**
 * The union of a diff as one payload for previews: B's state where it exists,
 * otherwise A's (removed cells). `kinds[i]` is the change kind of `cells[i]`.
 */
export function diffAsPayload(diff: PayloadDiff, profileId: string): { payload: VoxelPayload; kinds: readonly DiffKind[] } {
  const palette: BlockState[] = [], index = new Map<string, number>();
  const cells: Cell[] = [], kinds: DiffKind[] = [];
  for (const c of diff.cells) {
    const state = c.after ?? c.before!;
    const key = stateKey(state);
    let i = index.get(key);
    if (i === undefined) { i = palette.length; palette.push(state); index.set(key, i); }
    cells.push({ position: c.position, kind: 'block', paletteIndex: i });
    kinds.push(c.kind);
  }
  const max: Vec3 = [Math.max(1, diff.size[0]), Math.max(1, diff.size[1]), Math.max(1, diff.size[2])];
  const payload = createPayload({ schemaVersion: 1, profileId, bounds: { min: [0, 0, 0], maxExclusive: max }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0],
    palette, cells, blockEntities: [] });
  return { payload, kinds };
}
