import { useCallback, useEffect, useMemo, useState } from 'react';
import { EMPTY_DRAFT_HISTORY, createDraft, executeEdit, keyPos, redoEdit, summarizeDraft, undoEdit } from '../../../../packages/domain/src/index.js';
import type { CellValue, Draft, DraftHistory, DraftSummary, Edit } from '../../../../packages/domain/src/index.js';
import type { Vec3, VoxelPayload } from '../../../../packages/voxel/src/index.js';
import { errorText } from '../app/ui';

export interface LayerCell { readonly x: number; readonly z: number; readonly value: CellValue }
export interface DraftModel {
  readonly draft: Draft;
  readonly history: DraftHistory;
  readonly summary: DraftSummary;
  /** Cells by Y layer (built once per draft). */
  readonly layers: ReadonlyMap<number, readonly LayerCell[]>;
  /** Bounds of base and draft together, null for an empty new model. */
  readonly extent: { readonly min: Vec3; readonly max: Vec3 } | null;
  readonly cellCount: number;
  /** Applies an edit; returns an error text ('' on success, 'Keine Änderung' for no-ops). */
  run(edit: Edit): string;
  undo(): void;
  redo(): void;
  /** Starts over from a new base (after saving). */
  reset(base: VoxelPayload | null): void;
}

/** Session state of one editor: draft + undo stack. Nothing is stored until the caller saves. */
export function useDraft(base: VoxelPayload | null, profileId: string): DraftModel {
  const [draft, setDraft] = useState<Draft>(() => createDraft(base, profileId));
  const [history, setHistory] = useState<DraftHistory>(EMPTY_DRAFT_HISTORY);
  const reset = useCallback((next: VoxelPayload | null) => { setDraft(createDraft(next, profileId)); setHistory(EMPTY_DRAFT_HISTORY); }, [profileId]);

  const { layers, extent, cellCount } = useMemo(() => draftLayers(draft), [draft]);

  const run = useCallback((edit: Edit) => {
    try {
      const r = executeEdit(draft, history, edit);
      if (!r.changed) return 'Keine Änderung';
      setDraft(r.draft); setHistory(r.history); return '';
    } catch (e) { return errorText(e); }
  }, [draft, history]);
  const undo = useCallback(() => { const r = undoEdit(draft, history); if (r) { setDraft(r.draft); setHistory(r.history); } }, [draft, history]);
  const redo = useCallback(() => { const r = redoEdit(draft, history); if (r) { setDraft(r.draft); setHistory(r.history); } }, [draft, history]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest('input,textarea,select')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [undo, redo]);

  return { draft, history, summary: useMemo(() => summarizeDraft(draft), [draft]), layers, extent, cellCount, run, undo, redo, reset };
}

interface KeyedCell extends LayerCell { readonly k: string }
interface BaseLayers { readonly layers: ReadonlyMap<number, readonly KeyedCell[]>; readonly min: readonly number[]; readonly max: readonly number[] }
const baseLayerCache = new WeakMap<Draft['baseCells'], BaseLayers>();
function baseLayersOf(draft: Draft): BaseLayers {
  let cached = baseLayerCache.get(draft.baseCells);
  if (!cached) {
    const layers = new Map<number, KeyedCell[]>();
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (const [k, value] of draft.baseCells) {
      const p = keyPos(k);
      let list = layers.get(p[1]);
      if (!list) { list = []; layers.set(p[1], list); }
      list.push({ x: p[0], z: p[2], value, k });
      for (let i = 0; i < 3; i++) { if (p[i]! < min[i]!) min[i] = p[i]!; if (p[i]! > max[i]!) max[i] = p[i]!; }
    }
    cached = { layers, min, max };
    baseLayerCache.set(draft.baseCells, cached);
  }
  return cached;
}

/**
 * Cells by Y layer. The base layers are built once per draft base; an edit rebuilds only the layers it
 * touches (SIZE-01: rebuilding a million-cell model after every click took a second). Cell order within a
 * layer stays base order with new cells appended, as before.
 */
export function draftLayers(draft: Draft): Pick<DraftModel, 'layers' | 'extent' | 'cellCount'> {
  const base = baseLayersOf(draft);
  const min = [...base.min], max = [...base.max];
  let cellCount = draft.baseCells.size, layers: ReadonlyMap<number, readonly LayerCell[]> = base.layers;
  if (draft.overlay.size) {
    const touched = new Map<number, [string, Vec3][]>();
    for (const [k, v] of draft.overlay) {
      const p = keyPos(k), inBase = draft.baseCells.has(k);
      if (inBase && !v) cellCount--; else if (!inBase && v) cellCount++;
      if (v) for (let i = 0; i < 3; i++) { if (p[i]! < min[i]!) min[i] = p[i]!; if (p[i]! > max[i]!) max[i] = p[i]!; }
      let list = touched.get(p[1]);
      if (!list) { list = []; touched.set(p[1], list); }
      list.push([k, p]);
    }
    const next = new Map<number, readonly LayerCell[]>(base.layers);
    for (const [y, edits] of touched) {
      const out: KeyedCell[] = [];
      for (const c of base.layers.get(y) ?? []) {
        if (!draft.overlay.has(c.k)) { out.push(c); continue; }
        const v = draft.overlay.get(c.k);
        if (v) out.push({ x: c.x, z: c.z, value: v, k: c.k });
      }
      for (const [k, p] of edits) { const v = draft.overlay.get(k); if (v && !draft.baseCells.has(k)) out.push({ x: p[0], z: p[2], value: v, k }); }
      if (out.length) next.set(y, out); else next.delete(y);
    }
    layers = next;
  }
  if (draft.base) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i]!, draft.base.bounds.min[i]!); max[i] = Math.max(max[i]!, draft.base.bounds.maxExclusive[i]! - 1); }
  const extent = Number.isFinite(min[0]) ? { min: min as unknown as Vec3, max: max as unknown as Vec3 } : null;
  return { layers, extent, cellCount };
}
