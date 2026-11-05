import type { BlockState, Vec3, VoxelPayload } from '../../../voxel/src/types.js';
import { DomainError } from '../core/types.js';
import { applyEdit, createDraft, payloadCells, keyPos, MAX_EDIT_CELLS } from './draft.js';
import type { CellValue, Draft } from './draft.js';
import { defaultState } from './blocks.js';
import type { ClipCell, Clipboard } from './tools.js';
import { entitiesRelative, pasteEdit } from './tools.js';

/**
 * Schablonen (EDIT-03). A stencil is a clipboard with a name: built-in
 * stencils are generated here; the user's own stencils are ordinary library
 * modules tagged `schablone` (stored, versioned and backed up like every
 * other asset), loaded into the clipboard with `clipboardFromPayload`.
 */
export const STENCIL_TAG = 'schablone';

export interface Stencil { readonly id: string; readonly label: string; readonly hint: string; readonly clip: Clipboard }

/** Whole payload (bounds included) as a clipboard; offsets relative to the bounds minimum. */
export function clipboardFromPayload(payload: VoxelPayload): Clipboard {
  if (payload.cells.length > MAX_EDIT_CELLS) throw new DomainError('LIMIT', `Die Vorlage hat ${payload.cells.length.toLocaleString('de-DE')} Zellen; höchstens ${MAX_EDIT_CELLS.toLocaleString('de-DE')} lassen sich einfügen.`);
  const { min, maxExclusive } = payload.bounds, cells: ClipCell[] = [];
  for (const [k, value] of payloadCells(payload)) {
    const p = keyPos(k);
    cells.push({ offset: [p[0] - min[0], p[1] - min[1], p[2] - min[2]], value });
  }
  // Paintings, frames and armor stands travel with the stencil (CREATIVE_TOOLS: „gespeicherte Schablonen behalten sie“).
  const entities = entitiesRelative(payload.entities, () => true, min);
  return { size: [maxExclusive[0] - min[0], maxExclusive[1] - min[1], maxExclusive[2] - min[2]], cells, ...(entities.length && { entities }) };
}

/** A new draft containing only the clipboard at the origin (to save it as a module/stencil). */
export function draftFromClipboard(clip: Clipboard, profileId: string): Draft {
  const empty = createDraft(null, profileId);
  return applyEdit(empty, pasteEdit(clip, [0, 0, 0], { entities: [] })).draft;
}

// ------------------------------------------------------------------ built-in stencils

type Cells = [number, number, number, BlockState | 'air'][];
const s = (id: string, props: Record<string, string> = {}): BlockState => {
  const d = defaultState(id);
  return { id: d.id, properties: { ...d.properties, ...props } };
};
function build(cells: Cells): Clipboard {
  const size = [0, 0, 0];
  const out: ClipCell[] = cells.map(([x, y, z, st]) => {
    size[0] = Math.max(size[0]!, x + 1); size[1] = Math.max(size[1]!, y + 1); size[2] = Math.max(size[2]!, z + 1);
    const value: CellValue = st === 'air' ? { kind: 'air' } : { kind: 'block', state: st };
    return { offset: [x, y, z] as Vec3, value };
  });
  return { size: size as unknown as Vec3, cells: out };
}

function windowStencil(): Clipboard {
  // 3 wide, 4 high, facing north (in the X/Y plane): log posts, plank lintel and sill, 1×2 glass.
  const c: Cells = [];
  for (let y = 0; y < 4; y++) for (let x = 0; x < 3; x++) {
    const edgeY = y === 0 || y === 3, edgeX = x === 0 || x === 2;
    c.push([x, y, 0, edgeX ? s('stripped_spruce_log', { axis: 'y' }) : edgeY ? s('spruce_planks') : s('glass')]);
  }
  return build(c);
}
function doorStencil(): Clipboard {
  const c: Cells = [];
  for (let y = 0; y < 4; y++) for (let x = 0; x < 3; x++) {
    if (x === 1 && y < 2) c.push([x, y, 0, s('oak_door', { facing: 'north', half: y === 0 ? 'lower' : 'upper', hinge: 'left', open: 'false', powered: 'false' })]);
    else c.push([x, y, 0, x === 1 ? s('oak_planks') : s('stripped_oak_log', { axis: 'y' })]);
  }
  return build(c);
}
function pillarStencil(): Clipboard {
  return build([[0, 0, 0, s('chiseled_stone_bricks')], [0, 1, 0, s('stone_bricks')], [0, 2, 0, s('stone_bricks')], [0, 3, 0, s('stone_bricks')], [0, 4, 0, s('chiseled_stone_bricks')]]);
}
function battlementStencil(): Clipboard {
  // Two layers: a full parapet course and merlons on every second block (air keeps the embrasures clear).
  const c: Cells = [];
  for (let x = 0; x < 6; x++) { c.push([x, 0, 0, s('stone_bricks')]); c.push([x, 1, 0, x % 2 === 0 ? s('stone_bricks') : 'air']); }
  return build(c);
}
function stairStencil(): Clipboard {
  // Five steps rising towards north (−Z), each on a full support block.
  const c: Cells = [];
  for (let i = 0; i < 5; i++) {
    const z = 4 - i;
    for (let y = 0; y < i; y++) c.push([0, y, z, s('stone_bricks')]);
    c.push([0, i, z, s('stone_brick_stairs', { facing: 'north', half: 'bottom', shape: 'straight', waterlogged: 'false' })]);
  }
  return build(c);
}
function lanternStencil(): Clipboard {
  return build([[0, 0, 0, s('cobblestone')], [0, 1, 0, s('oak_fence')], [0, 2, 0, s('oak_fence')], [0, 3, 0, s('lantern', { hanging: 'false', waterlogged: 'false' })]]);
}
function treeStencil(): Clipboard {
  const c: Cells = [];
  const leaves = s('oak_leaves', { persistent: 'true' });
  for (let y = 3; y <= 6; y++) for (let z = -2; z <= 2; z++) for (let x = -2; x <= 2; x++) {
    const r = y >= 5 ? 1 : 2;
    if (Math.abs(x) > r || Math.abs(z) > r) continue;
    if (Math.abs(x) === 2 && Math.abs(z) === 2) continue; // round the corners
    if (x === 0 && z === 0 && y < 6) continue; // trunk
    c.push([x + 2, y, z + 2, leaves]);
  }
  for (let y = 0; y < 6; y++) c.push([2, y, 2, s('oak_log', { axis: 'y' })]);
  return build(c);
}

/** Built-in stencils: ready parts for typical details. Rotate them with R before placing. */
export const BUILTIN_STENCILS: readonly Stencil[] = [
  { id: 'fenster', label: 'Fenster mit Rahmen', hint: '3 × 4, Glas mit Fichtenrahmen, Blick nach Norden', clip: windowStencil() },
  { id: 'tuer', label: 'Tür mit Rahmen', hint: '3 × 4, Eichentür nach Norden mit Stammrahmen', clip: doorStencil() },
  { id: 'saeule', label: 'Steinsäule', hint: '1 × 5, gemeißelte Steinziegel oben und unten', clip: pillarStencil() },
  { id: 'zinnen', label: 'Zinnen', hint: '6 lang, Brüstung und Zinnen mit freien Scharten', clip: battlementStencil() },
  { id: 'treppe', label: 'Treppenaufgang', hint: '5 Stufen nach Norden mit Unterbau', clip: stairStencil() },
  { id: 'laterne', label: 'Laternenpfosten', hint: 'Zaun mit Laterne auf Bruchstein', clip: lanternStencil() },
  { id: 'baum', label: 'Kleiner Eichenbaum', hint: '5 × 7 × 5, Laub dauerhaft (verrottet nicht)', clip: treeStencil() },
];
