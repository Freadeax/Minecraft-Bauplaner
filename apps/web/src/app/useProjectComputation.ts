import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AssetVersion, BlueprintRevision, Project } from '../../../../packages/domain/src/types.js';
import type { ComputeInput, ProjectComputation } from '../../../../packages/application/src/projectComputation.js';
import { createProjectComputationClient } from '../computation/client';

export type ComputationStatus = 'pending' | 'ready' | 'error' | 'cancelled';
interface ComputationState {
  readonly input: ComputeInput | null;
  readonly attempt: number;
  readonly status: ComputationStatus;
  readonly result: ProjectComputation | null;
  readonly error: string;
}

/** A render never exposes a result for a previous in-memory project snapshot. */
export function useProjectComputation(
  project: Project | null,
  versions: ReadonlyMap<string, AssetVersion>,
  options: { readonly basis?: BlueprintRevision | undefined; readonly enabled?: boolean | undefined } = {},
) {
  const enabled = options.enabled !== false;
  const input = useMemo<ComputeInput | null>(() => project && enabled ? {
    project, versions, ...(options.basis && { basis: options.basis }),
  } : null, [project, versions, options.basis, enabled]);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ComputationState>({ input: null, attempt: 0, status: 'pending', result: null, error: '' });
  const active = useRef<{ readonly input: ComputeInput; readonly attempt: number; readonly client: ReturnType<typeof createProjectComputationClient> } | null>(null);
  useEffect(() => {
    if (!input) return;
    const client = createProjectComputationClient();
    const request = { input, attempt, client };
    active.current = request;
    setState({ input, attempt, status: 'pending', result: null, error: '' });
    void client.run(input).then(result => {
      if (active.current === request) setState({ input, attempt, status: 'ready', result, error: '' });
    }, error => {
      if (active.current !== request) return;
      const cancelled = error instanceof Error && error.name === 'AbortError';
      setState({ input, attempt, status: cancelled ? 'cancelled' : 'error', result: null,
        error: error instanceof Error ? error.message : String(error) });
    });
    return () => {
      if (active.current === request) active.current = null;
      client.dispose();
    };
  }, [input, attempt]);
  const cancel = useCallback(() => { if (active.current?.input === input && active.current.attempt === attempt) active.current.client.cancel(); }, [input, attempt]);
  const retry = useCallback(() => setAttempt(n => n + 1), []);
  // Effects run after rendering: identity gating also covers the render preceding cancellation of the old worker.
  const current = state.input === input && state.attempt === attempt && input !== null;
  return {
    result: current && state.status === 'ready' ? state.result : null,
    status: current ? state.status : 'pending' as ComputationStatus,
    error: current ? state.error : '', cancel, retry,
  };
}
