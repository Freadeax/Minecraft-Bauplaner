import type { Bounds, Cell, VoxelPayload } from '../../../../packages/voxel/src/index.js';
import type { Mark } from '../blockmodels/mesh';
import type { DragHandler, GhostTone } from './sceneController';
export type { Mark } from '../blockmodels/mesh';
export type { DragHandler, GhostTone } from './sceneController';

export interface ViewerProps {
  /** Structure the cells belong to: bounds frame the camera, the palette names hovered blocks. */
  readonly payload: VoxelPayload;
  /** Visible cells (e.g. after a layer filter). */
  readonly cells: readonly Cell[];
  readonly onSelect: (cell: Cell | null) => void;
  /**
   * Per-cell highlight (selection, conflicts, diff, build progress): the block
   * keeps its shape and texture and is mixed towards `color` by `amount`.
   * Must be stable (memoised); a new function rebuilds the mesh.
   */
  readonly markFor?: (cell: Cell) => Mark | null;
  /** What “Fokus” (key F) frames, e.g. the selected instance; null ⇒ the whole structure. */
  readonly focus?: Bounds | null;
  /** Grab-and-move of a selection (editor); null/absent ⇒ dragging only orbits. Not available in the software view. */
  readonly drag?: DragHandler | null;
  /** Outline of a planned placement, e.g. while dragging. */
  readonly ghost?: { readonly bounds: Bounds; readonly tone: GhostTone } | null;
  /** Frames `bounds` once whenever `seq` changes (e.g. “Hinfliegen” on the world map); works in orbit and flight. */
  readonly frameRequest?: { readonly bounds: Bounds; readonly seq: number } | null;
}
