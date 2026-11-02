import type { JobContext, JobMessage, JobRequest } from './protocol';
import { HANDLERS } from './jobs';
import type { JobKind } from './jobs';

/**
 * The one background worker of the app (PERF-04). Runs one job per worker
 * instance; the page terminates the worker to cancel. Progress is sent at
 * most every 80 ms (and on every step change) so it never floods the page.
 */
const post = (message: JobMessage, transfer: ArrayBuffer[] = []) => (self as unknown as Worker).postMessage(message, transfer);

self.onmessage = async (event: MessageEvent<JobRequest>) => {
  const request = event.data;
  if (!request || request.type !== 'run') return;
  const { id } = request;
  const transfer: ArrayBuffer[] = [];
  let lastStep = '', lastAt = 0;
  const ctx: JobContext = {
    progress(step, fraction = null) {
      const now = performance.now();
      if (step === lastStep && now - lastAt < 80) return;
      lastStep = step; lastAt = now;
      post({ type: 'progress', id, step, fraction: fraction === null ? null : Math.max(0, Math.min(1, fraction)) });
    },
    transfer(buffers) { for (const b of buffers) if (!transfer.includes(b)) transfer.push(b); },
  };
  try {
    const load = HANDLERS[request.kind as JobKind];
    if (!load) throw new Error(`Unbekannte Hintergrundberechnung: ${request.kind}`);
    const handler = await load() as (input: unknown, ctx: JobContext) => Promise<unknown>;
    const result = await handler(request.input, ctx);
    post({ type: 'done', id, result }, transfer);
  } catch (e) {
    const code = e && typeof e === 'object' && typeof (e as { code?: unknown }).code === 'string' ? (e as { code: string }).code : undefined;
    post({ type: 'error', id, message: e instanceof Error ? e.message : 'Berechnung fehlgeschlagen.', ...(code && { code }) });
  }
};
