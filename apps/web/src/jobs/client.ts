import type { JobMessage, JobProgress, JobRequest } from './protocol';
import type { JobKind, JobInput, JobOutput } from './jobs';

/**
 * Runs heavy computations in a background worker (PERF-04): 3D export, large
 * imports, saving large versions, the 3D view with light, update previews.
 * One worker per job; `signal.abort()` terminates it at once, a superseded
 * job never reports a result. Errors arrive as readable German messages.
 */
export interface JobWorker {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null;
  postMessage(message: JobRequest, transfer?: Transferable[]): void;
  terminate(): void;
}

export interface JobOptions {
  readonly signal?: AbortSignal;
  readonly onProgress?: (progress: JobProgress) => void;
  /** Input buffers to move into the worker (they are unusable here afterwards). */
  readonly transfer?: readonly ArrayBuffer[];
  /** Default 10 minutes; heavy jobs report progress, so a long budget is fine. */
  readonly timeoutMs?: number;
}

let factory: () => JobWorker = () => new Worker(new URL('./heavy.worker.ts', import.meta.url), { type: 'module' }) as unknown as JobWorker;
/** Tests and the Node checks swap the worker. */
export function setJobWorkerFactory(next: () => JobWorker): void { factory = next; }

let sequence = 0;
const named = (name: string, message: string) => Object.assign(new Error(message), { name });
export const isAbort = (e: unknown): boolean => e instanceof Error && e.name === 'AbortError';
/** True where workers exist (browsers); Node checks and very old browsers compute in place. */
export const workersAvailable = (): boolean => typeof Worker !== 'undefined';

export function runJob<K extends JobKind>(kind: K, input: JobInput<K>, options: JobOptions = {}): Promise<JobOutput<K>> {
  const { signal, onProgress, transfer = [], timeoutMs = 600_000 } = options;
  if (signal?.aborted) return Promise.reject(named('AbortError', 'Abgebrochen.'));
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    let worker: JobWorker | null = null, settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const abort = () => finish(named('AbortError', 'Abgebrochen.'));
    const finish = (error: Error | null, result?: unknown) => {
      if (settled) return;
      settled = true;
      if (timer !== undefined) clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      if (worker) { worker.onmessage = null; worker.onerror = null; worker.onmessageerror = null; worker.terminate(); }
      if (error) reject(error); else resolve(result as JobOutput<K>);
    };
    try {
      worker = factory();
      worker.onmessage = event => {
        const m = event.data as JobMessage;
        if (settled || !m || typeof m !== 'object' || m.id !== id) return;
        if (m.type === 'progress') { onProgress?.({ step: m.step, fraction: m.fraction }); return; }
        if (m.type === 'error') { finish(named(m.code === 'TIMEOUT' ? 'TimeoutError' : 'JobError', m.message)); return; }
        if (m.type === 'done') finish(null, m.result);
      };
      worker.onerror = event => { event.preventDefault?.(); finish(named('JobError', `Hintergrundberechnung ist abgestürzt${event.message ? `: ${event.message}` : ''}. Bitte erneut versuchen.`)); };
      worker.onmessageerror = () => finish(named('JobError', 'Ergebnis der Hintergrundberechnung konnte nicht übertragen werden.'));
      signal?.addEventListener('abort', abort, { once: true });
      timer = setTimeout(() => finish(named('TimeoutError', `Berechnung nach ${Math.round(timeoutMs / 60_000)} Minuten beendet – das Modell ist zu groß für diesen Rechner oder Browser.`)), timeoutMs);
      const request: JobRequest = { type: 'run', id, kind, input };
      worker.postMessage(request, [...transfer]);
    } catch (e) {
      finish(named('JobError', `Hintergrundberechnung konnte nicht starten: ${e instanceof Error ? e.message : String(e)}`));
    }
  });
}

/** Gives the page a turn (input, drawing) between slices of main-thread work. */
export function pause(): Promise<void> {
  const s = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (s?.yield) return s.yield();
  return new Promise(r => setTimeout(r, 0));
}

/**
 * Size from which work goes to the background. The browser checks can lower
 * every threshold with localStorage `bauplaner.hintergrund.ab` (cells) to run
 * small fixtures through the worker path too; it never raises one.
 */
export function backgroundFrom(threshold: number): number {
  try {
    const v = Number(globalThis.localStorage?.getItem('bauplaner.hintergrund.ab'));
    return Number.isFinite(v) && v > 0 ? Math.min(threshold, v) : threshold;
  } catch { return threshold; }
}
