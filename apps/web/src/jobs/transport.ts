import { emptyColumns, fillColumns } from '../../../../packages/voxel/src/index.js';
import type { Cell, CellColumns, PayloadTransport, VoxelPayload } from '../../../../packages/voxel/src/index.js';
import { pause } from './client';

const SLICE = 100_000;

/** Cell columns built in slices, so a million cells never block the page in one piece (PERF-04). */
export async function columnsInSlices(cells: readonly Cell[], signal?: AbortSignal): Promise<CellColumns> {
  const columns = emptyColumns(cells.length);
  for (let from = 0; from < cells.length; from += SLICE) {
    if (signal?.aborted) throw Object.assign(new Error('Abgebrochen.'), { name: 'AbortError' });
    fillColumns(cells, columns, from, Math.min(cells.length, from + SLICE));
    if (from + SLICE < cells.length) await pause();
  }
  return columns;
}

/** Transport form of a payload, prepared in slices. The worker validates it again. */
export async function transportInSlices(payload: VoxelPayload, signal?: AbortSignal): Promise<PayloadTransport> {
  const { cells, ...head } = payload;
  return { head, columns: await columnsInSlices(cells, signal), limits: {} };
}
