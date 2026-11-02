import { hydratePayload } from '../../../../packages/voxel/src/index.js';
import type { CellColumns, VoxelPayload } from '../../../../packages/voxel/src/index.js';
import type { SchemResult, LitematicResult } from '../../../../packages/formats/src/index.js';
import { pause, runJob } from '../jobs/client';
import type { JobProgress } from '../jobs/protocol';

export interface ImportedFile {
  readonly name: string;
  readonly format: ImportFormat;
  readonly payload: VoxelPayload;
  readonly report: SchemResult | LitematicResult | null;
  /** Unchanged original bytes (kept by the caller, never uploaded). */
  readonly original: ArrayBuffer;
  /** Cell columns of exactly `payload` (PERF-04): saving hands them to the worker without converting again. */
  readonly columns?: CellColumns;
}

export type ImportFormat = 'schem' | 'litematic' | 'json';
export const IMPORT_FORMAT_LABEL: Readonly<Record<ImportFormat, string>> = { schem: 'Sponge Schem v3', litematic: 'Litematic', json: 'Voxel-JSON' };
/** File dialog filter for every importable structure format. */
export const IMPORT_ACCEPT = '.schem,.litematic,.json,application/json,application/octet-stream';

export { MAX_IMPORT_BYTES, MAX_IMPORT_LABEL } from './importLimits';
import { MAX_IMPORT_BYTES, MAX_IMPORT_LABEL } from './importLimits';

/**
 * Reads one structure file in the background worker (PERF-04) and rebuilds
 * the payload here in slices, so even a million blocks never freeze the page.
 * Rejects with a readable message; `signal.abort()` stops it at once.
 * `region` imports a single region of a Litematic file instead of all regions merged.
 */
export async function importFile(file: File, signal?: AbortSignal, region?: string, onProgress?: (p: JobProgress) => void): Promise<ImportedFile> {
  if (file.size > MAX_IMPORT_BYTES) throw new Error(`Die Datei ist zu groß (maximal ${MAX_IMPORT_LABEL}).`);
  onProgress?.({ step: 'Datei laden', fraction: 0 });
  const buffer = await file.arrayBuffer();
  if (signal?.aborted) throw new Error('Import abgebrochen.');
  const copy = buffer.slice(0);
  try {
    const out = await runJob('import', { buffer: copy, name: file.name, ...(region !== undefined && { region }) }, {
      transfer: [copy], ...(signal && { signal }), timeoutMs: 180_000,
      ...(onProgress && { onProgress: p => onProgress({ step: p.step, fraction: p.fraction === null ? null : p.fraction * 0.85 }) }),
    });
    const payload = await hydratePayload(out.transport, {
      pause, ...(signal && { signal }),
      ...(onProgress && { onProgress: f => onProgress({ step: 'Blöcke übernehmen', fraction: 0.85 + f * 0.15 }) }),
    });
    const report = out.report ? { ...out.report, payload } as SchemResult | LitematicResult : null;
    return { name: file.name, format: out.format, payload, report, original: buffer, columns: out.transport.columns };
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw new Error('Import abgebrochen.');
    if (e instanceof Error && e.name === 'TimeoutError') throw new Error('Import wegen überschrittenem Zeitbudget abgebrochen.');
    throw e;
  }
}
