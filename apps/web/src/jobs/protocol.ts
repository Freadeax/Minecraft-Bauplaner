/**
 * Messages between the page and the background worker (PERF-04). One worker
 * runs one job; terminating it really stops synchronous work, so “Abbrechen”
 * is immediate. Progress is throttled on the worker side.
 */
export interface JobRequest { readonly type: 'run'; readonly id: number; readonly kind: string; readonly input: unknown }
export type JobMessage =
  | { readonly type: 'progress'; readonly id: number; readonly step: string; readonly fraction: number | null }
  | { readonly type: 'done'; readonly id: number; readonly result: unknown }
  | { readonly type: 'error'; readonly id: number; readonly message: string; readonly code?: string };

export interface JobProgress {
  /** What is being computed right now, in plain German. */
  readonly step: string;
  /** 0..1 within the whole job, null when unknown. */
  readonly fraction: number | null;
}

/** Given to every job handler inside the worker. */
export interface JobContext {
  /** Reports the current step; `fraction` is 0..1 of the whole job. */
  progress(step: string, fraction?: number | null): void;
  /** Buffers of the result to move instead of copy. */
  transfer(buffers: readonly ArrayBuffer[]): void;
}
