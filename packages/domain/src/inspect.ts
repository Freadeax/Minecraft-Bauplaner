import { transformCellPosition } from '../../voxel/src/transforms.js';
import type { BlockState, Cell, Vec3 } from '../../voxel/src/types.js';
import { positionKey } from './compose.js';
import type { Resolution, VoxelConflict } from './compose.js';

/** One instance's contribution to a world cell, with the cell's coordinate inside that instance's version payload. */
export interface CellSource {
  readonly instanceId: string;
  readonly instanceName: string;
  readonly assetVersionId: string;
  /** Coordinate in the (untransformed) AssetVersion payload. */
  readonly local: Vec3;
  readonly cell: Cell;
  readonly state: BlockState | null;
}

export interface CellInspection {
  readonly world: Vec3;
  /** Resolved world cell, or undefined when nothing is placed there. */
  readonly cell: Cell | undefined;
  readonly state: BlockState | null;
  /** All contributing instances, owner first (override winner, else project order). */
  readonly sources: readonly CellSource[];
  readonly conflict: VoxelConflict | undefined;
  readonly overridden: VoxelConflict | undefined;
}

/**
 * Explains a world cell for the inspector: which instances contribute it and
 * where it lies in each source payload. Uses the shared transform
 * (`transformCellPosition`), never a separate inverse.
 */
export function inspectCell(resolution: Resolution, world: Vec3): CellInspection {
  const key = positionKey(world);
  const cell = resolution.world?.cells.find(c => positionKey(c.position) === key);
  const state = cell && cell.kind !== 'erase' ? resolution.world!.palette[cell.paletteIndex] ?? null : null;
  const sources: CellSource[] = [];
  for (const id of resolution.owners.get(key) ?? []) {
    const placed = resolution.placed.find(p => p.instance.id === id);
    if (!placed) continue;
    const source = placed.version.payload, t = placed.instance.transform;
    const hit = source.cells.find(c => positionKey(transformCellPosition(c.position, source.pivot, t)) === key);
    if (!hit) continue;
    sources.push({ instanceId: id, instanceName: placed.instance.name, assetVersionId: placed.version.id, local: hit.position, cell: hit,
      state: hit.kind === 'erase' ? null : source.palette[hit.paletteIndex] ?? null });
  }
  return { world, cell, state, sources,
    conflict: resolution.conflicts.find(c => positionKey(c.position) === key),
    overridden: resolution.overridden.find(c => positionKey(c.position) === key) };
}
