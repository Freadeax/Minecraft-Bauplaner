import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AssetVersion, BlueprintRevision, Project } from '../../../../packages/domain/src/core/types.js';
import type { ComputeInput, ProjectComputation } from '../../../../packages/application/src/projectComputation.js';
import { createProjectComputationClient } from '../computation/client';
import type { ComputationCodec } from '../computation/client';
import { decodeComputeResult, encodeComputeInput, isWireResult } from '../../../../packages/application/src/computationTransport.js';
import { recomputeSite } from '../../../../packages/application/src/projectComputation.js';

/** Columns and cell indices instead of a structured clone of every cell (SIZE-01). */
const computationTransport: ComputationCodec = {
  encodeInput: input => encodeComputeInput(input),
  decodeResult: (result, versions) => isWireResult(result) ? decodeComputeResult(result, versions) : result,
};

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
  // Selective recomputation (PERF-02-S03): same geometry as the last finished result (progress ticked, site plan
  // or project name edited) → only the cheap site part again, here, without a worker round trip.
  const lastReady = useRef<{ readonly input: ComputeInput; readonly attempt: number; readonly result: ProjectComputation } | null>(null);
  const reused = useMemo(() => {
    const previous = lastReady.current;
    if (!input || !previous || previous.attempt !== attempt || previous.input.project.id !== input.project.id) return null;
    if (previous.input === input) return previous.result;
    try { return recomputeSite(input, previous); } catch { return null; }
  }, [input, attempt]);
  useEffect(() => {
    if (!input) return;
    if (reused) { active.current = null; lastReady.current = { input, attempt, result: reused }; return; }
    const client = createProjectComputationClient({ codec: computationTransport });
    const request = { input, attempt, client };
    active.current = request;
    setState({ input, attempt, status: 'pending', result: null, error: '' });
    void client.run(input).then(result => {
      if (active.current !== request) return;
      lastReady.current = { input, attempt, result };
      setState({ input, attempt, status: 'ready', result, error: '' });
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
  }, [input, attempt, reused]);
  const cancel = useCallback(() => { if (active.current?.input === input && active.current.attempt === attempt) active.current.client.cancel(); }, [input, attempt]);
  const retry = useCallback(() => setAttempt(n => n + 1), []);
  // Effects run after rendering: identity gating also covers the render preceding cancellation of the old worker.
  const current = state.input === input && state.attempt === attempt && input !== null;
  if (reused) return { result: reused, status: 'ready' as ComputationStatus, error: '', cancel, retry };
  return {
    result: current && state.status === 'ready' ? state.result : null,
    status: current ? state.status : 'pending' as ComputationStatus,
    error: current ? state.error : '', cancel, retry,
  };
}
