import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EMPTY_HISTORY, execute as run, redo as runRedo, resolveProject, undo as runUndo } from '../../../../../packages/domain/src/index.js';
import type { History, Operation, Project, Resolution } from '../../../../../packages/domain/src/index.js';
import { useApp } from '../../app/context';
import { RevisionConflictError } from '../../app/repository';
import { errorText } from '../../app/ui';

export type SaveState = 'saved' | 'saving' | 'error' | 'conflict';

/** Everything a project tab needs. Tabs change the project only through `execute`. */
export interface ProjectSession {
  readonly project: Project;
  readonly history: History;
  /** Resolution of the current project, or the error that prevented it. */
  readonly resolution: Resolution | { readonly error: string };
  readonly saveState: SaveState;
  readonly saveError: string;
  readonly selectedInstanceId: string | null;
  select(id: string | null): void;
  /** Applies an operation, records undo and saves with baseRevision. Returns an error text or ''. */
  execute(op: Operation): string;
  undo(): void;
  redo(): void;
  /** Replaces the in-memory project after storing it elsewhere (e.g. freezing a revision). */
  replace(project: Project): void;
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

  const reload = useCallback(async () => {
    setLoadError('');
    try {
      const p = await repo.getProject(projectId);
      if (!p) { setLoadError('Projekt nicht gefunden. Es wurde gelöscht oder nur in einer früheren Sitzung gespeichert.'); setProject(null); return; }
      stored.current = p.revision; latest.current = p;
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
        if (latest.current === next) { latest.current = saved; setProject(saved); setSaveState('saved'); setSaveError(''); }
      } catch (e) {
        setSaveState(e instanceof RevisionConflictError ? 'conflict' : 'error'); setSaveError(errorText(e));
      }
    });
  }, [repo]);

  // Only instances and profile influence geometry; a new storage revision must not recompute it.
  const instances = project?.instances, profileId = project?.profileId;
  const resolution = useMemo<ProjectSession['resolution'] | null>(() => {
    if (!project) return null;
    try { return resolveProject(project, library.versions); } catch (e) { return { error: errorText(e) }; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instances, profileId, library.versions]);

  if (!project || !resolution) return { session: null, loadError };
  const blocked = saveState === 'conflict';
  const session: ProjectSession = {
    project, history, resolution, saveState, saveError, selectedInstanceId, select, reload,
    execute(op) {
      if (blocked) return 'Gespeicherter Stand hat sich geändert. Bitte zuerst neu laden.';
      try { const r = run(project, history, op); setProject(r.project); setHistory(r.history); persist(r.project); return ''; }
      catch (e) { return errorText(e); }
    },
    undo() { if (blocked) return; const r = runUndo(project, history); if (r) { setProject(r.project); setHistory(r.history); persist(r.project); } },
    redo() { if (blocked) return; const r = runRedo(project, history); if (r) { setProject(r.project); setHistory(r.history); persist(r.project); } },
    replace(next) { if (blocked) return; setProject(next); persist(next); },
  };
  return { session, loadError };
}
