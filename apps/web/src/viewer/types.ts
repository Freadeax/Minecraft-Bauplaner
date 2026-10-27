import type { Bounds, Cell, VoxelPayload } from '../../../../packages/voxel/src/index.js';

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
}
