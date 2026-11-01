import type { ChunkSummary, ExcerptReport, SurfaceMap } from '../../../../../packages/formats/src/index.js';
import type { TerrainCheck, WorldPlacement } from '../../../../../packages/domain/src/index.js';
import type { Bounds, VoxelPayload } from '../../../../../packages/voxel/src/index.js';

/** One picked region file as the worker sees it after reading its header. */
export interface RegionInfo {
  readonly name: string;
  readonly rx: number; readonly rz: number;
  readonly size: number;
  /** Stored chunks according to the header. */
  readonly chunks: number;
  /** Newest chunk save, seconds since epoch. */
  readonly newest: number;
  readonly error?: string;
}

export type WorldRequest =
  | { readonly id: number; readonly kind: 'open'; readonly files: readonly File[] }
  | { readonly id: number; readonly kind: 'surface'; readonly min: { cx: number; cz: number }; readonly max: { cx: number; cz: number }; readonly includeIncomplete: boolean; readonly maxY?: number }
  | { readonly id: number; readonly kind: 'excerpt'; readonly box: Bounds; readonly air: 'none' | 'explicit'; readonly trim: boolean; readonly exclude: readonly string[]; readonly includeIncomplete: boolean; readonly name: string; readonly dimension: string }
  | { readonly id: number; readonly kind: 'terrain'; readonly planned: VoxelPayload; readonly placement: WorldPlacement; readonly depth: number; readonly includeIncomplete: boolean }
  | { readonly id: number; readonly kind: 'abort' };

export type WorldResponse =
  | { readonly id: number; readonly kind: 'progress'; readonly done: number; readonly total: number }
  | { readonly id: number; readonly kind: 'opened'; readonly regions: readonly RegionInfo[]; readonly ignored: readonly string[]; readonly duplicates: readonly string[] }
  | { readonly id: number; readonly kind: 'surface'; readonly map: SurfaceMap }
  | { readonly id: number; readonly kind: 'excerpt'; readonly payload: VoxelPayload; readonly report: ExcerptReport; readonly chunks: readonly ChunkSummary[]; readonly regions: readonly string[]; readonly original: Uint8Array; readonly originalSha256: string }
  | { readonly id: number; readonly kind: 'terrain'; readonly check: TerrainCheck; readonly chunks: readonly ChunkSummary[]; readonly warnings: readonly string[]; readonly box: Bounds }
  | { readonly id: number; readonly kind: 'error'; readonly message: string; readonly code: string };

type Result<K extends WorldResponse['kind']> = Extract<WorldResponse, { kind: K }>;
type Body<K extends WorldRequest['kind']> = Omit<Extract<WorldRequest, { kind: K }>, 'id' | 'kind'>;
type Progress = (done: number, total: number) => void;

/**
 * One long-lived worker per page: it keeps the picked files between requests.
 * Requests are serialised by the caller; a new request replaces the pending one.
 */
export class WorldClient {
  private worker: Worker | null = null;
  private next = 1;
  private pending: { id: number; resolve: (r: WorldResponse) => void; reject: (e: Error) => void; progress?: Progress } | null = null;

  private ensure(): Worker {
    if (this.worker) return this.worker;
    const w = new Worker(new URL('./world.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (event: MessageEvent<WorldResponse>) => {
      const p = this.pending, m = event.data;
      if (!p || m.id !== p.id) return;
      if (m.kind === 'progress') { p.progress?.(m.done, m.total); return; }
      this.pending = null;
      if (m.kind === 'error') p.reject(new Error(m.message)); else p.resolve(m);
    };
    w.onerror = () => { const p = this.pending; this.pending = null; this.worker?.terminate(); this.worker = null; p?.reject(new Error('Der Welt-Worker ist abgestürzt.')); };
    return this.worker = w;
  }

  open(files: readonly File[]): Promise<Result<'opened'>> { return this.ask('open', { files }); }
  surface(body: Body<'surface'>, progress?: Progress): Promise<Result<'surface'>> { return this.ask('surface', body, progress); }
  excerpt(body: Body<'excerpt'>, progress?: Progress): Promise<Result<'excerpt'>> { return this.ask('excerpt', body, progress); }
  terrain(body: Body<'terrain'>, progress?: Progress): Promise<Result<'terrain'>> { return this.ask('terrain', body, progress); }

  private ask<R extends WorldResponse>(kind: WorldRequest['kind'], body: object, progress?: Progress): Promise<R> {
    const w = this.ensure();
    this.pending?.reject(new Error('Durch eine neue Anfrage ersetzt.'));
    const id = this.next++;
    return new Promise<R>((resolve, reject) => {
      this.pending = { id, resolve: r => resolve(r as R), reject, ...(progress && { progress }) };
      w.postMessage({ id, kind, ...body });
    });
  }

  abort(): void {
    if (!this.pending) return;
    this.worker?.postMessage({ id: 0, kind: 'abort' });
    this.pending.reject(new Error('Abgebrochen.')); this.pending = null;
  }

  dispose(): void { this.worker?.terminate(); this.worker = null; this.pending = null; }
}
