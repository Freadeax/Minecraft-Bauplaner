import type { BlockState, Vec3, VoxelPayload } from './types.js';
import { createPayload, stateKey, validatePayload } from './validation.js';

/** Counts selected placed block states only. No item or raw-material inference. */
export function countBlocks(payload: VoxelPayload): {
  readonly blocks: number;
  readonly air: number;
  readonly erase: number;
  readonly states: readonly { readonly state: BlockState; readonly count: number }[];
} {
  validatePayload(payload);
  let blocks = 0, air = 0, erase = 0;
  const counts = new Map<string, { state: BlockState; count: number }>();
  for (const cell of payload.cells) {
    if (cell.kind === 'air') air++;
    else if (cell.kind === 'erase') erase++;
    else {
      blocks++;
      const state = payload.palette[cell.paletteIndex]!, key = stateKey(state), previous = counts.get(key);
      counts.set(key, { state, count: (previous?.count ?? 0) + 1 });
    }
  }
  return { blocks, air, erase, states: [...counts.entries()].sort(([a],[b])=>a < b ? -1 : a > b ? 1 : 0).map(([,v])=>v) };
}
/** Explicit selection operation. A viewer should filter its view without editing the payload. */
export function selectLayers(payload: VoxelPayload, axis: 'x' | 'y' | 'z', min: number, maxExclusive: number): VoxelPayload {
  validatePayload(payload);
  const index = { x: 0, y: 1, z: 2 }[axis];
  if (index === undefined || !Number.isInteger(min) || !Number.isInteger(maxExclusive) || min >= maxExclusive ||
      min < payload.bounds.min[index]! || maxExclusive > payload.bounds.maxExclusive[index]!) throw new Error('Ungültiger ganzzahliger Schichtbereich');
  const lo = [...payload.bounds.min] as [number,number,number], hi = [...payload.bounds.maxExclusive] as [number,number,number];
  lo[index] = min; hi[index] = maxExclusive;
  const selected = (position: Vec3): boolean => position[index]! >= min && position[index]! < maxExclusive;
  return createPayload({ ...payload, bounds: { min: lo, maxExclusive: hi },
    cells: payload.cells.filter(c=>selected(c.position)), blockEntities: payload.blockEntities.filter(e=>selected(e.position)),
  });
}
