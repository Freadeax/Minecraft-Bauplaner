import type { Bounds, Cell, VoxelPayload } from '../../../../packages/voxel/src/index.js';
import type { DragHandler, GhostTone } from './sceneController';
export type { DragHandler, GhostTone } from './sceneController';

export interface ViewerProps {
  /** Structure the cells belong to: bounds frame the camera, the palette names hovered blocks. */
  readonly payload: VoxelPayload;
  /** Visible cells (e.g. after a layer filter). */
  readonly cells: readonly Cell[];
  readonly onSelect: (cell: Cell | null) => void;
  /** "#rrggbb" per cell (selection, conflicts); default colours follow the palette index. */
  readonly colorFor?: (cell: Cell) => string;
  /** What “Fokus” (key F) frames, e.g. the selected instance; null ⇒ the whole structure. */
  readonly focus?: Bounds | null;
  /** Grab-and-move of a selection (editor); null/absent ⇒ dragging only orbits. Not available in the software view. */
  readonly drag?: DragHandler | null;
  /** Outline of a planned placement, e.g. while dragging. */
  readonly ghost?: { readonly bounds: Bounds; readonly tone: GhostTone } | null;
}
