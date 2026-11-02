import { cellsToColumns, columnBuffers, copyColumns, createPayload } from '../../../../packages/voxel/src/index.js';
import type { CellColumns } from '../../../../packages/voxel/src/index.js';
import { addAssetVersion, deepFreeze, rememberPackedCells, rememberPayloadHash } from '../../../../packages/domain/src/index.js';
import type { Asset, AssetVersion, NewVersionInput } from '../../../../packages/domain/src/index.js';
import { catalogMetrics } from '../app/metricsCache';
import { backgroundFrom, runJob, workersAvailable } from './client';
import type { JobOptions } from './client';

/** From this many cells a new version is prepared in the background. */
export const BACKGROUND_VERSION_CELLS = 60_000;

/**
 * Like `addAssetVersion`, but for large payloads the hash, version id, packed
 * storage form and catalogue metrics are computed in a worker (PERF-04). The
 * returned version carries the caller's (sealed) payload object; the worker's
 * result is only accepted when it hashed exactly these cells.
 * `columns` may pass the cell columns of an import for exactly this payload.
 */
export async function addAssetVersionInBackground(asset: Asset, input: NewVersionInput & { readonly columns?: CellColumns | undefined },
  options: Pick<JobOptions, 'signal' | 'onProgress'> = {}): Promise<{ asset: Asset; version: AssetVersion }> {
  const { columns: given, ...plain } = input;
  const payload = createPayload(plain.payload);
  if (!workersAvailable() || payload.cells.length < backgroundFrom(BACKGROUND_VERSION_CELLS)) return addAssetVersion(asset, { ...plain, payload });
  const { cells, ...head } = payload;
  const columns = given && given.count === cells.length ? copyColumns(given) : cellsToColumns(cells);
  const out = await runJob('version', {
    asset, head, columns, source: plain.source, ...(plain.label !== undefined && { label: plain.label }), ...(plain.connectors && { connectors: plain.connectors }),
  }, { ...options, transfer: columnBuffers(columns) });
  if (out.version.assetId !== asset.id || out.asset.id !== asset.id || out.asset.versionIds.at(-1) !== out.version.id) throw new Error('Hintergrundberechnung lieferte eine fremde Version.');
  rememberPayloadHash(payload, out.version.payloadHash);
  if (out.packed && out.packed.count === cells.length) rememberPackedCells(payload, out.packed);
  catalogMetrics.set(out.version.id, out.metrics);
  return { asset: out.asset, version: deepFreeze({ ...out.version, payload }) as AssetVersion };
}
