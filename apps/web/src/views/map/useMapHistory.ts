import { useCallback, useEffect, useRef, useState } from 'react';
import { applyOperation } from '../../../../../packages/domain/src/index.js';
import type { Operation, WorldPlanOp } from '../../../../../packages/domain/src/index.js';
import type { Repository } from '../../app/repository';
import { RevisionConflictError } from '../../app/repository';
import { errorText } from '../../app/ui';

/**
 * One undo history for everything the Weltbuilder changes (MAP-04): Weltplan
 * entries and project placements together. A change is a list of steps; all
 * Weltplan steps are saved as one batch, each project step is saved with its
 * own revision check. Undo runs the collected inverses in reverse order.
 */
export type MapStep =
  | { readonly kind: 'plan'; readonly op: WorldPlanOp }
  | { readonly kind: 'project'; readonly projectId: string; readonly op: Operation };
export interface MapChange { readonly label: string; readonly steps: readonly MapStep[] }

export interface MapHistory {
  readonly canUndo: string | null;
  readonly canRedo: string | null;
  /** Runs a change and records it; false when nothing could be saved. */
  run(change: MapChange): Promise<boolean>;
  undo(): Promise<string | null>;
  redo(): Promise<string | null>;
}

const MAX_HISTORY = 100;

export function useMapHistory({ repo, commitPlan, epoch, onSaved, onError }: {
  repo: Repository;
  commitPlan: (op: WorldPlanOp) => Promise<WorldPlanOp | null>;
  /** Changes when the stored Weltplan changed elsewhere: the history is dropped. */
  epoch: number;
  /** Called after project placements were saved (reload the project list). */
  onSaved: () => Promise<void> | void;
  onError: (message: string) => void;
}): MapHistory {
  const undoStack = useRef<MapChange[]>([]), redoStack = useRef<MapChange[]>([]);
  const [, bump] = useState(0);
  useEffect(() => { undoStack.current = []; redoStack.current = []; bump(n => n + 1); }, [epoch]);

  /** Executes the steps; returns the inverse change (possibly partial) or null when nothing was saved. */
  const execute = useCallback(async (change: MapChange): Promise<MapChange | null> => {
    const inverse: MapStep[] = [];
    const planOps = change.steps.flatMap(s => s.kind === 'plan' ? [s.op] : []);
    if (planOps.length) {
      const inv = await commitPlan(planOps.length === 1 ? planOps[0]! : { kind: 'batch', label: change.label, ops: planOps });
      if (!inv) return null;
      inverse.push({ kind: 'plan', op: inv });
    }
    let projectsSaved = false;
    for (const s of change.steps) {
      if (s.kind !== 'project') continue;
      try {
        const p = await repo.getProject(s.projectId);
        if (!p) throw new Error('Projekt gibt es nicht mehr.');
        const { project: next, inverse: inv } = applyOperation(p, s.op);
        await repo.saveProject(next, p.revision);
        inverse.unshift({ kind: 'project', projectId: s.projectId, op: inv });
        projectsSaved = true;
      } catch (e) {
        onError(e instanceof RevisionConflictError ? 'Ein Projekt wurde inzwischen in einem anderen Tab geändert. Die Karte zeigt jetzt den gespeicherten Stand.' : errorText(e));
        break;
      }
    }
    if (projectsSaved) await onSaved();
    // Inverses run in reverse order: projects (already reversed) first, then the plan.
    const ordered = [...inverse.filter(s => s.kind === 'project'), ...inverse.filter(s => s.kind === 'plan')];
    return ordered.length ? { label: change.label, steps: ordered } : null;
  }, [repo, commitPlan, onSaved, onError]);

  const run = useCallback(async (change: MapChange) => {
    if (!change.steps.length) return false;
    const inv = await execute(change);
    if (!inv) return false;
    undoStack.current = [...undoStack.current, inv].slice(-MAX_HISTORY);
    redoStack.current = [];
    bump(n => n + 1);
    return true;
  }, [execute]);
  const undo = useCallback(async () => {
    const last = undoStack.current.at(-1); if (!last) return null;
    const inv = await execute(last); if (!inv) return null;
    undoStack.current = undoStack.current.slice(0, -1);
    redoStack.current = [...redoStack.current, inv];
    bump(n => n + 1);
    return last.label;
  }, [execute]);
  const redo = useCallback(async () => {
    const last = redoStack.current.at(-1); if (!last) return null;
    const inv = await execute(last); if (!inv) return null;
    redoStack.current = redoStack.current.slice(0, -1);
    undoStack.current = [...undoStack.current, inv];
    bump(n => n + 1);
    return last.label;
  }, [execute]);

  return { canUndo: undoStack.current.at(-1)?.label ?? null, canRedo: redoStack.current.at(-1)?.label ?? null, run, undo, redo };
}
