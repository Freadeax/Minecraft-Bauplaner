import { useCallback, useEffect, useRef, useState } from 'react';
import { applyWorldPlanOp, emptyWorldPlan } from '../../../../../packages/domain/src/index.js';
import type { WorldPlan, WorldPlanOp } from '../../../../../packages/domain/src/index.js';
import type { Repository } from '../../app/repository';
import { WorldPlanConflictError } from '../../app/repository';
import { errorText } from '../../app/ui';

/**
 * Weltplan of this browser (MAP-03): building sites, paths and points on the
 * world map. Every change is one operation with an exact inverse; the undo
 * history lives in `useMapHistory` (MAP-04) together with project placements.
 * Saving checks the revision like projects do. `epoch` increases when the
 * stored plan changed elsewhere (another tab, a conflict) – a local history
 * no longer fits it then.
 */
export interface WorldPlanState {
  readonly plan: WorldPlan;
  readonly loaded: boolean;
  readonly error: string;
  readonly epoch: number;
  /** Applies and saves one operation; returns its inverse, or null when it failed (error is set). */
  commit(op: WorldPlanOp): Promise<WorldPlanOp | null>;
}

export function useWorldPlan(repo: Repository): WorldPlanState {
  const [plan, setPlan] = useState<WorldPlan>(emptyWorldPlan);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [epoch, setEpoch] = useState(0);
  const current = useRef(plan); current.current = plan;

  const load = useCallback(async () => {
    try { const p = await repo.getWorldPlan(); setPlan(p); current.current = p; setLoaded(true); }
    catch (e) { setError(errorText(e)); setLoaded(true); }
  }, [repo]);
  useEffect(() => { void load(); }, [load]);
  // Another tab saved: show its state.
  useEffect(() => repo.subscribe(c => {
    if (c.kind !== 'worldPlan') return;
    void repo.getWorldPlan().then(p => {
      if (p.revision !== current.current.revision) { setPlan(p); current.current = p; setEpoch(n => n + 1); }
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
        await load(); setEpoch(n => n + 1);
      } else setError(errorText(e));
      return null;
    }
  }, [repo, load]);

  return { plan, loaded, error, epoch, commit };
}
