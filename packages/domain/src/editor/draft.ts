import { AIR_IDS, createPayload, stateKey } from '../../../voxel/src/validation.js';
import { MODEL_MAX_CELLS, formatCount } from '../../../voxel/src/sizeLimits.js';
import type { BlockState, Bounds, Cell, FreeEntity, NbtTag, Vec3, VoxelPayload } from '../../../voxel/src/types.js';
import { entityAnchor } from '../../../voxel/src/entities.js';
import { canonicalJson } from '../hash.js';
import { DomainError } from '../types.js';

/**
 * Blockeditor (B15): a draft is a base payload plus an overlay of edited
 * cells. The base stays untouched; every edit is an explicit list of cell
 * values with an exact inverse, so undo/redo replays inverses like project
 * operations do. Saving turns the draft into a new immutable AssetVersion
 * (commit.ts); the editor never changes a stored version in place.
 *
 * Cell values keep the payload semantics: a block (with optional block
 * entity), explicit air, explicit erase, or `null` = not part of the model.
 */
export type CellValue =
  | { readonly kind: 'block'; readonly state: BlockState; readonly entity?: NbtTag }
  | { readonly kind: 'air' }
  | { readonly kind: 'erase' };
export type CellSlot = CellValue | null;

export const AIR_VALUE: CellValue = Object.freeze({ kind: 'air' });
export const ERASE_VALUE: CellValue = Object.freeze({ kind: 'erase' });
export const posKey = (p: Vec3): string => `${p[0]},${p[1]},${p[2]}`;
export const keyPos = (k: string): Vec3 => k.split(',').map(Number) as unknown as Vec3;

/** Largest number of cells one edit may touch; keeps the browser responsive (SIZE-01, vorher 250 000). */
export const MAX_EDIT_CELLS = 1_000_000;
/** Largest draft model (cells after the edit) the editor accepts: the planner's model limit (SIZE-01, vorher 400 000). */
export const MAX_DRAFT_CELLS = MODEL_MAX_CELLS;
/**
 * Undo budget in changed cells over all steps (forward + inverse). Large fills on big builds would otherwise
 * keep hundreds of megabytes alive; the oldest steps are dropped first, the newest step always stays.
 */
export const HISTORY_MAX_CELLS = 6_000_000;

export function blockValue(state: BlockState, entity?: NbtTag): CellValue {
  const s = { id: state.id, properties: { ...state.properties } };
  return entity ? { kind: 'block', state: s, entity } : { kind: 'block', state: s };
}

export function sameSlot(a: CellSlot | undefined, b: CellSlot | undefined): boolean {
  if (!a || !b) return (a ?? null) === (b ?? null);
  if (a.kind !== b.kind) return false;
  if (a.kind !== 'block' || b.kind !== 'block') return true;
  if (stateKey(a.state) !== stateKey(b.state)) return false;
  return (a.entity ? canonicalJson(a.entity) : '') === (b.entity ? canonicalJson(b.entity) : '');
}

export interface CellChange { readonly position: Vec3; readonly value: CellSlot }
/**
 * One undoable editor step. `entities` (optional) replaces the whole list of free entities (paintings,
 * frames, armor stands); the inverse carries the previous list.
 */
export interface Edit { readonly label: string; readonly changes: readonly CellChange[]; readonly entities?: readonly FreeEntity[] }

export interface Draft {
  readonly profileId: string;
  /** Base payload the overlay applies to; null for a new, empty model. */
  readonly base: VoxelPayload | null;
  /** Base cells by position key (built once per draft). */
  readonly baseCells: ReadonlyMap<string, CellValue>;
  /** Edited positions → new value (null = removed from the model). Positions equal to the base are not stored. */
  readonly overlay: ReadonlyMap<string, CellSlot>;
  /** Free entities of the model (starts with the base's). */
  readonly entities: readonly FreeEntity[];
}

export interface DraftHistory {
  readonly undo: readonly { readonly label: string; readonly forward: Edit; readonly inverse: Edit }[];
  readonly redo: readonly { readonly label: string; readonly forward: Edit; readonly inverse: Edit }[];
}
export const EMPTY_DRAFT_HISTORY: DraftHistory = Object.freeze({ undo: Object.freeze([]), redo: Object.freeze([]) });
const HISTORY_LIMIT = 300;

export function payloadCells(payload: VoxelPayload): Map<string, CellValue> {
  const entities = new Map(payload.blockEntities.map(e => [posKey(e.position), e.data]));
  const out = new Map<string, CellValue>();
  // One frozen value per palette entry for cells without block entity: a million cells then share a handful
  // of objects instead of a million (SIZE-01). Values are compared by content (sameSlot), never by identity.
  const shared: (CellValue | undefined)[] = [];
  for (const c of payload.cells) {
    const k = posKey(c.position);
    if (c.kind === 'erase') out.set(k, ERASE_VALUE);
    else if (c.kind === 'air') out.set(k, AIR_VALUE);
    else {
      const state = payload.palette[c.paletteIndex]!, entity = entities.get(k);
      out.set(k, entity ? { kind: 'block', state, entity } : (shared[c.paletteIndex] ??= Object.freeze({ kind: 'block', state }) as CellValue));
    }
  }
  return out;
}

export function createDraft(base: VoxelPayload | null, profileId?: string): Draft {
  const profile = profileId ?? base?.profileId;
  if (!profile) throw new DomainError('INVALID', 'Für ein leeres Modell ist eine Profilkennung erforderlich');
  return { profileId: profile, base, baseCells: base ? payloadCells(base) : new Map(), overlay: new Map(), entities: base?.entities ?? [] };
}

/** Current value of a cell (overlay first, then base). */
export function cellAt(draft: Draft, p: Vec3): CellSlot {
  const k = posKey(p);
  return draft.overlay.has(k) ? draft.overlay.get(k)! : draft.baseCells.get(k) ?? null;
}

/** Number of cells in the model after the overlay. */
export function draftCellCount(draft: Draft): number {
  let n = draft.baseCells.size;
  for (const [k, v] of draft.overlay) { const inBase = draft.baseCells.has(k); if (inBase && !v) n--; else if (!inBase && v) n++; }
  return n;
}

/**
 * Applies an edit and returns the inverse (previous values of exactly the
 * positions that changed). Unchanged positions are dropped, so a no-op edit
 * returns an empty inverse and is not recorded.
 */
export function applyEdit(draft: Draft, edit: Edit): { draft: Draft; inverse: Edit; changed: number } {
  if (edit.changes.length > MAX_EDIT_CELLS) throw new DomainError('LIMIT', `Eine Änderung darf höchstens ${formatCount(MAX_EDIT_CELLS)} Zellen betreffen (hier ${formatCount(edit.changes.length)}). Bitte in mehreren Schritten arbeiten.`);
  const overlay = new Map(draft.overlay), inverse: CellChange[] = [], seen = new Set<string>();
  for (const change of edit.changes) {
    const p = change.position;
    if (!p.every(n => Number.isSafeInteger(n))) throw new DomainError('INVALID', 'Zellposition muss ganzzahlig sein');
    if (change.value?.kind === 'block' && AIR_IDS.has(change.value.state.id)) throw new DomainError('INVALID', 'Luft wird als eigene Zellart gesetzt, nicht als Block');
    const k = posKey(p);
    const before = overlay.has(k) ? overlay.get(k)! : draft.baseCells.get(k) ?? null;
    if (sameSlot(before, change.value)) continue;
    // Collected forwards and reversed once below: unshift would make big edits quadratic.
    if (!seen.has(k)) { inverse.push({ position: p, value: before }); seen.add(k); }
    if (sameSlot(draft.baseCells.get(k) ?? null, change.value)) overlay.delete(k); else overlay.set(k, change.value);
  }
  inverse.reverse();
  const before = draft.entities ?? [];
  const entitiesChanged = edit.entities !== undefined && canonicalJson(edit.entities) !== canonicalJson(before);
  if (entitiesChanged) for (const e of edit.entities!) {
    if (!e.position.every(n => Number.isFinite(n))) throw new DomainError('INVALID', 'Entity-Position muss endlich sein');
  }
  const next: Draft = { ...draft, overlay, entities: entitiesChanged ? edit.entities! : before };
  if (inverse.length && draftCellCount(next) > MAX_DRAFT_CELLS) throw new DomainError('LIMIT', `Das Modell darf höchstens ${formatCount(MAX_DRAFT_CELLS)} Zellen haben. Bitte in mehrere Bauteile teilen.`);
  return { draft: next, inverse: { label: edit.label, changes: inverse, ...(entitiesChanged && { entities: before }) }, changed: inverse.length + (entitiesChanged ? 1 : 0) };
}

export function executeEdit(draft: Draft, history: DraftHistory, edit: Edit): { draft: Draft; history: DraftHistory; changed: number } {
  const r = applyEdit(draft, edit);
  if (!r.changed) return { draft, history, changed: 0 };
  const entry = { label: edit.label, forward: edit, inverse: r.inverse };
  return { draft: r.draft, history: { undo: trimHistory([...history.undo, entry]), redo: [] }, changed: r.changed };
}

type HistoryEntry = DraftHistory['undo'][number];
const entryCells = (e: HistoryEntry): number => e.forward.changes.length + e.inverse.changes.length;
/** Keeps at most HISTORY_LIMIT steps and HISTORY_MAX_CELLS changed cells; the newest step always stays. */
export function trimHistory(undo: readonly HistoryEntry[]): readonly HistoryEntry[] {
  let start = Math.max(0, undo.length - HISTORY_LIMIT), cells = 0;
  for (let i = undo.length - 1; i >= start; i--) {
    cells += entryCells(undo[i]!);
    if (cells > HISTORY_MAX_CELLS && i < undo.length - 1) { start = i + 1; break; }
  }
  return start ? undo.slice(start) : undo;
}
export function undoEdit(draft: Draft, history: DraftHistory): { draft: Draft; history: DraftHistory } | null {
  const entry = history.undo.at(-1);
  if (!entry) return null;
  const r = applyEdit(draft, entry.inverse);
  return { draft: r.draft, history: { undo: history.undo.slice(0, -1), redo: [...history.redo, { ...entry, inverse: r.inverse }] } };
}
export function redoEdit(draft: Draft, history: DraftHistory): { draft: Draft; history: DraftHistory } | null {
  const entry = history.redo.at(-1);
  if (!entry) return null;
  const r = applyEdit(draft, entry.forward);
  return { draft: r.draft, history: { undo: trimHistory([...history.undo, { ...entry, inverse: r.inverse }]), redo: history.redo.slice(0, -1) } };
}

/** All cells of the draft model (base with overlay applied). */
export function draftEntries(draft: Draft): Map<string, CellValue> {
  const out = new Map(draft.baseCells);
  for (const [k, v] of draft.overlay) { if (v) out.set(k, v); else out.delete(k); }
  return out;
}

export interface DraftSummary {
  readonly added: number; readonly removed: number; readonly changed: number;
  /** Free entities differ from the base (count of the draft's entities then, else 0). */
  readonly entities: number;
}
/** Counts overlay positions by effect against the base. */
export function summarizeDraft(draft: Draft): DraftSummary {
  let added = 0, removed = 0, changed = 0;
  for (const [k, v] of draft.overlay) { const b = draft.baseCells.has(k); if (!b) added++; else if (!v) removed++; else changed++; }
  const now = draft.entities ?? [], before = draft.base?.entities ?? [];
  const entities = now === before || canonicalJson(now) === canonicalJson(before) ? 0 : Math.max(1, now.length);
  return { added, removed, changed, entities };
}

function cellBox(keys: Iterable<string>): Bounds | null {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  let any = false;
  for (const k of keys) { any = true; const p = keyPos(k); for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i]!, p[i]!); max[i] = Math.max(max[i]!, p[i]! + 1); } }
  return any ? { min: min as unknown as Vec3, maxExclusive: max as unknown as Vec3 } : null;
}
function union(a: Bounds | null, b: Bounds | null): Bounds | null {
  if (!a || !b) return a ?? b;
  return { min: a.min.map((n, i) => Math.min(n, b.min[i]!)) as unknown as Vec3, maxExclusive: a.maxExclusive.map((n, i) => Math.max(n, b.maxExclusive[i]!)) as unknown as Vec3 };
}

/**
 * Builds the validated payload of the draft. Bounds keep the base selection
 * and grow to every cell; pivot and source origin stay (coordinates are not
 * renumbered, so instances keep their placement). The palette is rebuilt in
 * first-use order with equal states merged. Returns null for an empty model.
 */
export function materializeDraft(draft: Draft): VoxelPayload | null {
  const entries = draftEntries(draft);
  if (!entries.size) return null;
  // Deterministic order: y, z, x (layer by layer like the build guide).
  const keys = [...entries.keys()].map(k => ({ k, p: keyPos(k) })).sort((a, b) => a.p[1] - b.p[1] || a.p[2] - b.p[2] || a.p[0] - b.p[0]);
  const palette: BlockState[] = [], index = new Map<string, number>();
  const paletteIndex = (s: BlockState): number => {
    const key = stateKey(s);
    let i = index.get(key);
    if (i === undefined) { i = palette.length; palette.push({ id: s.id, properties: { ...s.properties } }); index.set(key, i); }
    return i;
  };
  const cells: Cell[] = [], blockEntities: { position: Vec3; data: NbtTag }[] = [];
  for (const { k, p } of keys) {
    const v = entries.get(k)!;
    if (v.kind === 'erase') cells.push({ position: p, kind: 'erase' });
    else if (v.kind === 'air') cells.push({ position: p, kind: 'air', paletteIndex: paletteIndex({ id: 'minecraft:air', properties: {} }) });
    else {
      cells.push({ position: p, kind: 'block', paletteIndex: paletteIndex(v.state) });
      if (v.entity) blockEntities.push({ position: p, data: v.entity });
    }
  }
  const entities = draft.entities ?? [];
  // The box grows to every cell and to the cell each entity belongs to.
  const bounds = union(union(draft.base?.bounds ?? null, cellBox(entries.keys())), cellBox(entities.map(e => posKey(entityAnchor(e)))))!;
  return createPayload({
    schemaVersion: 1, profileId: draft.base?.profileId ?? draft.profileId, bounds,
    pivot: draft.base?.pivot ?? bounds.min, sourceOrigin: draft.base?.sourceOrigin ?? [0, 0, 0],
    palette, cells, blockEntities, ...(entities.length && { entities }),
  });
}
