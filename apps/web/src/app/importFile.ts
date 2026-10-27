import type { VoxelPayload } from '../../../../packages/voxel/src/index.js';
import type { SchemResult, LitematicResult } from '../../../../packages/formats/src/index.js';

export interface ImportedFile {
  readonly name: string;
  readonly format: ImportFormat;
  readonly payload: VoxelPayload;
  readonly report: SchemResult | LitematicResult | null;
  /** Unchanged original bytes (kept by the caller, never uploaded). */
  readonly original: ArrayBuffer;
}

export type ImportFormat = 'schem' | 'litematic' | 'json';
export const IMPORT_FORMAT_LABEL: Readonly<Record<ImportFormat, string>> = { schem: 'Sponge Schem v3', litematic: 'Litematic', json: 'Voxel-JSON' };
/** File dialog filter for every importable structure format. */
export const IMPORT_ACCEPT = '.schem,.litematic,.json,application/json,application/octet-stream';

export const MAX_IMPORT_BYTES = 2_000_000;

/**
 * Runs the existing import worker for one file. Rejects with a readable message; abort() terminates it.
 * `region` imports a single region of a Litematic file instead of all regions merged.
 */
export function importFile(file: File, signal?: AbortSignal, region?: string): Promise<ImportedFile> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_IMPORT_BYTES) { reject(new Error('Die Datei ist zu groß (maximal 2 MB).')); return; }
    void file.arrayBuffer().then(buffer => {
      if (signal?.aborted) { reject(new Error('Import abgebrochen.')); return; }
      const worker = new Worker(new URL('../import.worker.ts', import.meta.url), { type: 'module' });
      const finish = () => { clearTimeout(timer); worker.terminate(); signal?.removeEventListener('abort', abort); };
      const abort = () => { finish(); reject(new Error('Import abgebrochen.')); };
      const timer = setTimeout(() => { finish(); reject(new Error('Import wegen überschrittenem Zeitbudget abgebrochen.')); }, 12_000);
      signal?.addEventListener('abort', abort);
      worker.onmessage = (event: MessageEvent<{ error?: string; payload: VoxelPayload; format: ImportFormat; report?: SchemResult | LitematicResult }>) => {
        finish();
        if (event.data.error) reject(new Error(event.data.error));
        else resolve({ name: file.name, format: event.data.format, payload: event.data.payload, report: event.data.report ?? null, original: buffer });
      };
      worker.onerror = () => { finish(); reject(new Error('Der Datei-Worker ist fehlgeschlagen.')); };
      const copy = buffer.slice(0);
      worker.postMessage({ jobId: 1, buffer: copy, name: file.name, ...(region !== undefined && { region }) }, [copy]);
    }, reject);
  });
}
