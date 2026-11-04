import type { Bounds, Cell, FreeEntity, VoxelPayload } from '../../../../packages/voxel/src/index.js';
import type { Mark } from '../blockmodels/mesh';
import type { BuildHandler, DragHandler, GhostTone, PickHit, PointerMods, PreviewCells } from './sceneController';
export type { Mark } from '../blockmodels/mesh';
export type { BuildHandler, DragHandler, GhostTone, PickHit, PointerMods, PreviewCells } from './sceneController';

export interface ViewerProps {
  /** Structure the cells belong to: bounds frame the camera, the palette names hovered blocks. */
  readonly payload: VoxelPayload;
  /** Visible cells (e.g. after a layer filter). */
  readonly cells: readonly Cell[];
  /** Click on a block (or empty space ⇒ null); `hit` names the face that was clicked (EDIT-06). */
  readonly onSelect: (cell: Cell | null, hit?: PickHit | null, mods?: PointerMods) => void;
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
  /** Building on block faces (EDIT-06): a left drag on blocks builds instead of orbiting. Not in the software view. */
  readonly build?: BuildHandler | null;
  /** Planned cells drawn as translucent boxes (shape preview, cells to remove). */
  readonly preview?: PreviewCells | null;
  /** Outline of a planned placement, e.g. while dragging. */
  readonly ghost?: { readonly bounds: Bounds; readonly tone: GhostTone } | null;
  /** Frames `bounds` once whenever `seq` changes (e.g. “Hinfliegen” on the world map); works in orbit and flight. */
  readonly frameRequest?: { readonly bounds: Bounds; readonly seq: number } | null;
  /**
   * Free entities to draw (paintings, frames, armor stands). Absent ⇒ the payload's entities within the Y range
   * of the visible cells (follows layer filters); null ⇒ none.
   */
  readonly entities?: readonly FreeEntity[] | null;
  /** Picking an entity selects it here (and clears the block selection). */
  readonly onSelectEntity?: (entity: FreeEntity | null) => void;
}
