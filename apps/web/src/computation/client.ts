import type { ComputeInput, ProjectComputation } from '../../../../packages/application/src/projectComputation.js';
import type { ComputationRequest, ComputationTag } from './protocol';

/** Minimal transport boundary, injectable without DOM/Worker globals in tests. */
export interface ComputationWorker {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null;
  postMessage(request: ComputationRequest): void;
  terminate(): void;
}
export interface ComputationClientOptions { readonly workerFactory?: () => ComputationWorker; readonly timeoutMs?: number }
export interface ProjectComputationClient {
  run(input: ComputeInput, signal?: AbortSignal): Promise<ProjectComputation>;
  cancel(): void;
  dispose(): void;
}
const failure = (name: string, message: string): Error => Object.assign(new Error(message), { name });
const defaultFactory = (): ComputationWorker => new Worker(new URL('./project.worker.ts', import.meta.url), { type: 'module' });
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** Checks the structured-clone shape without rewalking a potentially large voxel model on the UI thread. */
function validResult(result: unknown): result is ProjectComputation {
  return object(result) && object(result.resolution) && result.resolution.owners instanceof Map && Array.isArray(result.resolution.conflicts) &&
    object(result.guide) && result.guide.byId instanceof Map && Array.isArray(result.guide.steps) &&
    object(result.materials) && Array.isArray(result.materials.items) && result.stepMaterials instanceof Map && result.instanceMaterials instanceof Map &&
    object(result.site) && object(result.site.progress) && result.site.progress.status instanceof Map && object(result.site.plan) && Array.isArray(result.site.plan.sections) && Array.isArray(result.site.issues) && Array.isArray(result.site.reservations);
}

/** Only referenced versions cross the transport; unrelated library payloads never block serialization. */
function transportInput(input: ComputeInput): ComputeInput {
  const ids = new Set((input.basis?.instances ?? input.project.instances).map(instance => instance.assetVersionId));
  const versions = new Map([...ids].flatMap(id => { const version = input.versions.get(id); return version ? [[id, version] as const] : []; }));
  return { ...input, versions };
}

/** One worker per active request: termination really interrupts synchronous computation in that worker. */
export function createProjectComputationClient(options: ComputationClientOptions = {}): ProjectComputationClient {
  const timeoutMs = options.timeoutMs ?? 120_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) throw new Error('Berechnungs-Timeout muss eine positive Ganzzahl sein.');
  const factory = options.workerFactory ?? defaultFactory;
  let sequence = 0, disposed = false;
  let cancelActive: (() => void) | null = null;
  return {
    run(input, signal) {
      cancelActive?.();
      if (disposed) return Promise.reject(failure('ComputationError', 'Berechnung wurde geschlossen. Bitte Seite neu öffnen.'));
      if (signal?.aborted) return Promise.reject(failure('AbortError', 'Projektberechnung abgebrochen.'));
      const tag: ComputationTag = { jobId: ++sequence, projectId: input.project.id, revision: input.project.revision, basisRevisionId: input.basis?.id ?? null };
      return new Promise((resolve, reject) => {
        let worker: ComputationWorker | null = null;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let settled = false;
        const abort = () => finish(failure('AbortError', 'Projektberechnung abgebrochen.'));
        const finish = (error: Error | null, result?: ProjectComputation) => {
          if (settled) return;
          settled = true;
          if (cancelActive === abort) cancelActive = null;
          if (timer !== undefined) clearTimeout(timer);
          signal?.removeEventListener('abort', abort);
          if (worker) {
            worker.onmessage = null; worker.onerror = null; worker.onmessageerror = null;
            worker.terminate();
          }
          if (error) reject(error); else resolve(result!);
        };
        cancelActive = abort;
        try {
          worker = factory();
          worker.onmessage = event => {
            if (settled) return;
            const response = event.data;
            if (!object(response) || response.jobId !== tag.jobId || response.projectId !== tag.projectId || response.revision !== tag.revision || response.basisRevisionId !== tag.basisRevisionId) {
              finish(failure('ComputationError', 'Berechnung lieferte eine fremde oder veraltete Projektbasis. Bitte erneut versuchen.')); return;
            }
            if (response.type === 'project-computation-error' && typeof response.error === 'string') {
              finish(failure('ComputationError', response.error)); return;
            }
            if (response.type !== 'project-computed' || !validResult(response.result)) {
              finish(failure('ComputationError', 'Berechnung lieferte ein unvollständiges Ergebnis. Bitte erneut versuchen.')); return;
            }
            finish(null, response.result);
          };
          worker.onerror = event => finish(failure('ComputationError', event.message || 'Rechen-Worker ist abgestürzt. Bitte erneut versuchen.'));
          worker.onmessageerror = () => finish(failure('ComputationError', 'Worker-Ergebnis konnte nicht übertragen werden. Bitte erneut versuchen.'));
          signal?.addEventListener('abort', abort, { once: true });
          if (signal?.aborted) { abort(); return; }
          timer = setTimeout(() => finish(failure('TimeoutError', 'Projektberechnung dauert zu lange und wurde beendet. Bitte erneut versuchen.')), timeoutMs);
          const request: ComputationRequest = { ...tag, type: 'compute-project', input: transportInput(input) };
          worker.postMessage(request);
        } catch (error) { finish(failure('ComputationError', error instanceof Error ? `Rechen-Worker konnte nicht gestartet werden: ${error.message}. Bitte erneut versuchen.` : 'Rechen-Worker ist nicht verfügbar. Bitte erneut versuchen.')); }
      });
    },
    cancel() { cancelActive?.(); },
    dispose() { disposed = true; cancelActive?.(); },
  };
}
