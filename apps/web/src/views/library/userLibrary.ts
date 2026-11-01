import { useCallback, useEffect, useState } from 'react';
import type { Collection, LibraryTemplate } from '../../../../../packages/domain/src/index.js';
import type { Repository, StorageBatch } from '../../app/repository';

/**
 * Own collections and templates (LIB-02/LIB-03) for the library views. They
 * live in the repository (IndexedDB stores `collections`/`templates`), are part
 * of full backups and refresh when another tab changes them. Every write goes
 * through one atomic batch with revision check; on a conflict nothing is
 * written, the lists are re-read and the error is returned for display.
 */
export interface UserLibrary {
  readonly collections: readonly Collection[];
  readonly templates: readonly LibraryTemplate[];
  readonly loaded: boolean;
  /** Load failure (e.g. damaged record); the views show it instead of an empty state. */
  readonly error: string;
  reload(): Promise<void>;
  /** Writes the batch and reloads; resolves to an error text or null on success. */
  write(batch: StorageBatch): Promise<string | null>;
}

export function useUserLibrary(repo: Repository): UserLibrary {
  const [state, setState] = useState<{ collections: readonly Collection[]; templates: readonly LibraryTemplate[]; loaded: boolean; error: string }>(
    { collections: [], templates: [], loaded: false, error: '' });
  const reload = useCallback(async () => {
    try {
      const [collections, templates] = await Promise.all([repo.listCollections(), repo.listTemplates()]);
      setState({ collections, templates, loaded: true, error: '' });
    } catch (e) { setState(s => ({ ...s, loaded: true, error: e instanceof Error ? e.message : String(e) })); }
  }, [repo]);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => repo.subscribe(c => { if (c.kind === 'userLibrary') void reload(); }), [repo, reload]);
  const write = useCallback(async (batch: StorageBatch) => {
    try { await repo.applyBatch(batch); await reload(); return null; }
    catch (e) { await reload(); return e instanceof Error ? e.message : String(e); }
  }, [repo, reload]);
  return { ...state, reload, write };
}
