import { useCallback, useEffect, useRef, useState } from 'react';
import { EMPTY_HISTORY, execute as run, redoKeepingTeam as runRedo, undoKeepingTeam as runUndo } from '../../../../../packages/domain/src/index.js';
import type { History, Operation, Project, Resolution } from '../../../../../packages/domain/src/index.js';
import type { ProjectComputation } from '../../../../../packages/application/src/projectComputation.js';
import { useApp } from '../../app/context';
import { RevisionConflictError } from '../../app/repository';
import { errorText } from '../../app/ui';
import { useProjectComputation } from '../../app/useProjectComputation';
import type { ComputationStatus } from '../../app/useProjectComputation';

export type SaveState = 'saved' | 'saving' | 'error' | 'conflict';

/** Everything a project tab needs. Tabs change the project only through `execute`. */
export interface ProjectSession {
  readonly project: Project;
  readonly history: History;
  /** Resolution of the current project, or the error that prevented it. */
  readonly resolution: Resolution | { readonly error: string };
  readonly computation: ProjectComputation | null;
  readonly computationState: ComputationStatus;
  readonly computationError: string;
  cancelComputation(): void;
  retryComputation(): void;
  readonly saveState: SaveState;
  readonly saveError: string;
  readonly selectedInstanceId: string | null;
  select(id: string | null): void;
  /** Applies an operation, records undo and saves with baseRevision. Returns an error text or ''. */
  execute(op: Operation): string;
  undo(): void;
  redo(): void;
  /**
   * Replaces the in-memory project without an undo step (team events, a frozen revision) and saves it.
   * Pass a function to build on the newest state: two calls before the next render then both survive.
   */
  replace(project: Project | ((current: Project) => Project)): void;
  reload(): Promise<void>;
}

export function isResolved(r: ProjectSession['resolution']): r is Resolution { return !('error' in r); }

export function useProjectSession(projectId: string): { session: ProjectSession | null; loadError: string } {
  const { repo, library } = useApp();
  const [project, setProject] = useState<Project | null>(null);
  const [history, setHistory] = useState<History>(EMPTY_HISTORY);
  const [loadError, setLoadError] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [saveError, setSaveError] = useState('');
  const [selectedInstanceId, select] = useState<string | null>(null);
  // Saves are serialised; `stored` is the last revision confirmed by the repository.
  const stored = useRef(0), queue = useRef<Promise<void>>(Promise.resolve()), latest = useRef<Project | null>(null);
  /** Newest project and history, updated synchronously by every action (state follows on the next render). */
  const current = useRef<{ project: Project; history: History } | null>(null);

  const reload = useCallback(async () => {
    setLoadError('');
    try {
      const p = await repo.getProject(projectId);
      if (!p) { setLoadError('Projekt nicht gefunden. Es wurde gelöscht oder nur in einer früheren Sitzung gespeichert.'); setProject(null); return; }
      stored.current = p.revision; latest.current = p; current.current = { project: p, history: EMPTY_HISTORY };
      setProject(p); setHistory(EMPTY_HISTORY); setSaveState('saved'); setSaveError('');
    } catch (e) { setLoadError(errorText(e)); }
  }, [repo, projectId]);
  useEffect(() => { void reload(); }, [reload]);

  const persist = useCallback((next: Project) => {
    latest.current = next; setSaveState('saving');
    queue.current = queue.current.then(async () => {
      if (latest.current !== next) return; // a newer state will be saved next
      try {
        const saved = await repo.saveProject(next, stored.current);
        stored.current = saved.revision;
        if (latest.current === next) {
          latest.current = saved; setProject(saved); setSaveState('saved'); setSaveError('');
          if (current.current?.project === next) current.current = { ...current.current, project: saved };
        }
      } catch (e) {
        setSaveState(e instanceof RevisionConflictError ? 'conflict' : 'error'); setSaveError(errorText(e));
      }
    });
  }, [repo]);

  const computation = useProjectComputation(project, library.versions);
  const resolution: ProjectSession['resolution'] = computation.result?.resolution ?? { error: computation.error ||
    (computation.status === 'cancelled' ? 'Projektberechnung abgebrochen. Bitte neu berechnen.' : 'Projekt wird berechnet …') };

  if (!project) return { session: null, loadError };
  const blocked = saveState === 'conflict';
  // Actions build on the newest state, not on this render's copy: two actions in one tick (a team event
  // arriving right after a click, a double click) must not overwrite each other.
  const base = () => current.current ?? { project, history };
  const commit = (next: Project, nextHistory: History) => {
    current.current = { project: next, history: nextHistory };
    setProject(next); setHistory(nextHistory); persist(next);
  };
  const session: ProjectSession = {
    project, history, resolution, saveState, saveError, selectedInstanceId, select, reload,
    computation: computation.result, computationState: computation.status, computationError: computation.error,
    cancelComputation: computation.cancel, retryComputation: computation.retry,
    execute(op) {
      if (blocked) return 'Gespeicherter Stand hat sich geändert. Bitte zuerst neu laden.';
      const { project: p, history: h } = base();
      try { const r = run(p, h, op); commit(r.project, r.history); return ''; }
      catch (e) { return errorText(e); }
    },
    undo() { if (blocked) return; const { project: p, history: h } = base(); const r = runUndo(p, h); if (r) commit(r.project, r.history); },
    redo() { if (blocked) return; const { project: p, history: h } = base(); const r = runRedo(p, h); if (r) commit(r.project, r.history); },
    replace(next) {
      if (blocked) return;
      const { project: p, history: h } = base();
      const value = typeof next === 'function' ? next(p) : next;
      if (value !== p) commit(value, h);
    },
  };
  return { session, loadError };
}
