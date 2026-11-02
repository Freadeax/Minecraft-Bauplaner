import { useCallback, useEffect, useRef, useState } from 'react';
import { applyWorldPlanOp, describeWorldPlanOp, emptyWorldPlan } from '../../../../../packages/domain/src/index.js';
import type { WorldPlan, WorldPlanOp } from '../../../../../packages/domain/src/index.js';
import type { Repository } from '../../app/repository';
import { WorldPlanConflictError } from '../../app/repository';
import { errorText } from '../../app/ui';

/**
 * Weltplan of this browser (MAP-03): building sites, paths and points on the
 * world map. Every change is one operation with an exact inverse, so undo/redo
 * work across all tools; saving checks the revision like projects do.
 */
export interface WorldPlanState {
  readonly plan: WorldPlan;
  readonly loaded: boolean;
  readonly error: string;
  readonly canUndo: string | null;
  readonly canRedo: string | null;
  apply(op: WorldPlanOp): Promise<boolean>;
  undo(): Promise<void>;
  redo(): Promise<void>;
}

const MAX_HISTORY = 100;

export function useWorldPlan(repo: Repository): WorldPlanState {
  const [plan, setPlan] = useState<WorldPlan>(emptyWorldPlan);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const current = useRef(plan); current.current = plan;
  const undoStack = useRef<{ op: WorldPlanOp; label: string }[]>([]);
  const redoStack = useRef<{ op: WorldPlanOp; label: string }[]>([]);
  const [, bump] = useState(0);

  const load = useCallback(async () => {
    try { const p = await repo.getWorldPlan(); setPlan(p); current.current = p; setLoaded(true); }
    catch (e) { setError(errorText(e)); setLoaded(true); }
  }, [repo]);
  useEffect(() => { void load(); }, [load]);
  // Another tab saved: show its state; the local history no longer fits it.
  useEffect(() => repo.subscribe(c => {
    if (c.kind !== 'worldPlan') return;
    void repo.getWorldPlan().then(p => {
      if (p.revision !== current.current.revision) { undoStack.current = []; redoStack.current = []; setPlan(p); current.current = p; bump(n => n + 1); }
    }).catch(() => undefined);
  }), [repo]);

  const commit = useCallback(async (op: WorldPlanOp): Promise<WorldPlanOp | null> => {
    const base = current.current;
    try {
      const { plan: next, inverse } = applyWorldPlanOp(base, op);
      const saved = await repo.saveWorldPlan(next, base.revision);
      setPlan(saved); current.current = saved; setError('');
      return inverse;
    } catch (e) {
      if (e instanceof WorldPlanConflictError) {
        setError('Der Weltplan wurde inzwischen in einem anderen Tab geändert. Die Karte zeigt jetzt den gespeicherten Stand.');
        undoStack.current = []; redoStack.current = [];
        await load();
      } else setError(errorText(e));
      return null;
    }
  }, [repo, load]);

  const apply = useCallback(async (op: WorldPlanOp) => {
    const inverse = await commit(op);
    if (!inverse) return false;
    undoStack.current = [...undoStack.current, { op: inverse, label: describeWorldPlanOp(op) }].slice(-MAX_HISTORY);
    redoStack.current = [];
    bump(n => n + 1);
    return true;
  }, [commit]);
  const undo = useCallback(async () => {
    const last = undoStack.current.at(-1); if (!last) return;
    const inverse = await commit(last.op); if (!inverse) return;
    undoStack.current = undoStack.current.slice(0, -1);
    redoStack.current = [...redoStack.current, { op: inverse, label: last.label }];
    bump(n => n + 1);
  }, [commit]);
  const redo = useCallback(async () => {
    const last = redoStack.current.at(-1); if (!last) return;
    const inverse = await commit(last.op); if (!inverse) return;
    redoStack.current = redoStack.current.slice(0, -1);
    undoStack.current = [...undoStack.current, { op: inverse, label: last.label }];
    bump(n => n + 1);
  }, [commit]);

  return { plan, loaded, error, canUndo: undoStack.current.at(-1)?.label ?? null, canRedo: redoStack.current.at(-1)?.label ?? null, apply, undo, redo };
}
