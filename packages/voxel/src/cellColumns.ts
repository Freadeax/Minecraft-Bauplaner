import type { Cell, Limits, Vec3, VoxelPayload } from './types.js';
import { sealTransportedPayload } from './validation.js';

/**
 * Transport form of a cell list between the page and a worker (PERF-04).
 *
 * A `Cell` is two JavaScript objects (the cell and its position). Handing a
 * payload with a million cells to `postMessage` makes the receiving thread
 * rebuild two million objects in one uninterruptible step – in Chromium that
 * froze the page for several seconds after a large Litematic import. The
 * columns are three typed arrays instead; their buffers are moved, not
 * copied, and the receiving side builds the objects in slices
 * ({@link columnsToCells}), so the page can draw and react in between.
 *
 * Lossless for every cell shape the contract allows: order, kind, position
 * and palette index are kept exactly, so `payloadHash` and version ids are
 * identical after the round trip.
 */
export interface CellColumns {
  readonly count: number;
  /** 0 = erase, 1 = air, 2 = block. */
  readonly kinds: Uint8Array;
  /** Palette index; −1 for erase cells. */
  readonly palette: Int32Array;
  /** x, y, z per cell. */
  readonly xyz: Int32Array;
}

const KIND = ['erase', 'air', 'block'] as const;

export function cellsToColumns(cells: readonly Cell[]): CellColumns {
  const columns = emptyColumns(cells.length);
  fillColumns(cells, columns);
  return columns;
}

export const emptyColumns = (count: number): CellColumns => ({ count, kinds: new Uint8Array(count), palette: new Int32Array(count), xyz: new Int32Array(count * 3) });

/** Writes cells `from` … `to` (exclusive) into `columns`; call it in slices to keep a page responsive. */
export function fillColumns(cells: readonly Cell[], columns: CellColumns, from = 0, to = cells.length): void {
  const { kinds, palette, xyz } = columns;
  for (let i = from; i < to; i++) {
    const c = cells[i]!, p = c.position;
    if (c.kind === 'erase') { kinds[i] = 0; palette[i] = -1; }
    else { kinds[i] = c.kind === 'air' ? 1 : 2; palette[i] = c.paletteIndex; }
    xyz[i * 3] = p[0]; xyz[i * 3 + 1] = p[1]; xyz[i * 3 + 2] = p[2];
  }
}

/** Buffers to list in `postMessage(…, transfer)`. */
export const columnBuffers = (c: CellColumns): ArrayBuffer[] => [c.kinds.buffer as ArrayBuffer, c.palette.buffer as ArrayBuffer, c.xyz.buffer as ArrayBuffer];

/** Independent copy (the original buffers can then be transferred while the copy stays). */
export const copyColumns = (c: CellColumns): CellColumns => ({ count: c.count, kinds: c.kinds.slice(), palette: c.palette.slice(), xyz: c.xyz.slice() });

/** Checks the column shapes; a damaged or foreign message fails here instead of producing wrong cells. */
export function checkColumns(c: unknown): asserts c is CellColumns {
  const o = c as Partial<CellColumns> | null;
  if (!o || typeof o !== 'object' || !Number.isSafeInteger(o.count) || o.count! < 0
    || !(o.kinds instanceof Uint8Array) || !(o.palette instanceof Int32Array) || !(o.xyz instanceof Int32Array)
    || o.kinds.length !== o.count || o.palette.length !== o.count || o.xyz.length !== o.count! * 3) throw new Error('Zellspalten sind unvollständig.');
}

/**
 * Builds the frozen cells `from` … `to` (exclusive) into `out` at the same
 * indices. Call it in slices to keep a page responsive.
 */
export function columnsToCells(c: CellColumns, out: Cell[], from = 0, to = c.count): void {
  for (let i = from; i < to; i++) {
    const kind = KIND[c.kinds[i]!];
    if (kind === undefined) throw new Error(`Zellspalten: unbekannte Zellart ${c.kinds[i]}`);
    const position = Object.freeze([c.xyz[i * 3]!, c.xyz[i * 3 + 1]!, c.xyz[i * 3 + 2]!]) as unknown as Vec3;
    out[i] = Object.freeze(kind === 'erase' ? { position, kind } : { position, kind, paletteIndex: c.palette[i]! });
  }
}

/** Everything of a payload except its cells, plus the limits it passed, for the trip to another thread. */
export interface PayloadTransport {
  readonly head: Omit<VoxelPayload, 'cells'>;
  readonly columns: CellColumns;
  /** Limits the payload was validated against on the sending side. */
  readonly limits: Partial<Limits>;
}

export function payloadToTransport(payload: VoxelPayload, limits: Partial<Limits> = {}): PayloadTransport {
  const { cells, ...head } = payload;
  return { head, columns: cellsToColumns(cells), limits };
}

export interface HydrateOptions {
  /** Cells built per slice before `pause` is awaited (default 40 000, about 10–20 ms). */
  readonly slice?: number;
  /** Gives the page a turn between slices, e.g. `() => new Promise(r => setTimeout(r))`; without it everything runs in one go. */
  readonly pause?: () => Promise<void>;
  readonly onProgress?: (fraction: number) => void;
  readonly signal?: AbortSignal;
}

/**
 * Rebuilds and seals a payload from its transport form in slices. The
 * sending side validated it (see {@link sealTransportedPayload}).
 */
export async function hydratePayload(t: PayloadTransport, options: HydrateOptions = {}): Promise<VoxelPayload> {
  checkColumns(t.columns);
  const slice = Math.max(1000, options.slice ?? 40_000), cells: Cell[] = new Array(t.columns.count);
  for (let from = 0; from < t.columns.count; from += slice) {
    if (options.signal?.aborted) throw Object.assign(new Error('Abgebrochen.'), { name: 'AbortError' });
    columnsToCells(t.columns, cells, from, Math.min(t.columns.count, from + slice));
    options.onProgress?.(Math.min(1, (from + slice) / t.columns.count));
    if (options.pause && from + slice < t.columns.count) await options.pause();
  }
  return sealTransportedPayload({ ...t.head, cells } as VoxelPayload, t.limits);
}
