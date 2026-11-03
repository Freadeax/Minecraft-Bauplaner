import { adoptPayload, checkColumns, columnsToCells, columnBuffers, diffAsPayload, diffPayloads, payloadToTransport } from '../../../../packages/voxel/src/index.js';
import type { Cell, DiffKind, PayloadDiff, PayloadTransport, VoxelPayload } from '../../../../packages/voxel/src/index.js';
import type { JobContext } from './protocol';

/**
 * Difference of two large structures (B12 Bauversionen, UPDATE-01 preview)
 * in the background (PERF-04): counts, block deltas and the coloured union
 * payload. The per-cell diff list itself stays here; the page gets the union
 * as cell columns and the change kind per union cell as one byte.
 */
export const DIFF_KINDS: readonly DiffKind[] = ['same', 'added', 'removed', 'material', 'state', 'content'];
export interface DiffJobInput { readonly a: PayloadTransport; readonly b: PayloadTransport; readonly profileId: string; readonly align?: 'auto' | 'fixed' }
export interface DiffJobOutput {
  readonly summary: Omit<PayloadDiff, 'cells'>;
  readonly union: PayloadTransport;
  /** Index into DIFF_KINDS per union cell. */
  readonly kinds: Uint8Array;
}

/** Rebuilds a payload sent by the page and validates it here (the page's copy may come straight from storage). */
export function receivePayload(t: PayloadTransport): VoxelPayload {
  checkColumns(t.columns);
  const cells: Cell[] = new Array(t.columns.count);
  columnsToCells(t.columns, cells);
  return adoptPayload({ ...t.head, cells }, t.limits);
}

export async function diffJob(input: DiffJobInput, ctx: JobContext): Promise<DiffJobOutput> {
  ctx.progress('Stände übernehmen', 0.05);
  const a = receivePayload(input.a), b = receivePayload(input.b);
  ctx.progress('Unterschiede berechnen', 0.3);
  const diff = diffPayloads(a, b, { align: input.align ?? 'auto' });
  ctx.progress('Vergleichsansicht zusammensetzen', 0.7);
  const union = diffAsPayload(diff, input.profileId);
  const kinds = Uint8Array.from(union.kinds, k => DIFF_KINDS.indexOf(k));
  const { cells: _cells, ...summary } = diff;
  const transport = payloadToTransport(union.payload);
  ctx.transfer([...columnBuffers(transport.columns), kinds.buffer as ArrayBuffer]);
  return { summary, union: transport, kinds };
}
