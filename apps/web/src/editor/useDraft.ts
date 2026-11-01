import { useCallback, useEffect, useMemo, useState } from 'react';
import { EMPTY_DRAFT_HISTORY, createDraft, draftEntries, executeEdit, keyPos, redoEdit, summarizeDraft, undoEdit } from '../../../../packages/domain/src/index.js';
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

  const { layers, extent, cellCount } = useMemo(() => {
    const layers = new Map<number, LayerCell[]>();
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    const entries = draftEntries(draft);
    for (const [k, value] of entries) {
      const p = keyPos(k);
      let list = layers.get(p[1]);
      if (!list) { list = []; layers.set(p[1], list); }
      list.push({ x: p[0], z: p[2], value });
      for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i]!, p[i]!); max[i] = Math.max(max[i]!, p[i]!); }
    }
    if (draft.base) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i]!, draft.base.bounds.min[i]!); max[i] = Math.max(max[i]!, draft.base.bounds.maxExclusive[i]! - 1); }
    const extent = Number.isFinite(min[0]) ? { min: min as unknown as Vec3, max: max as unknown as Vec3 } : null;
    return { layers, extent, cellCount: entries.size };
  }, [draft]);

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
