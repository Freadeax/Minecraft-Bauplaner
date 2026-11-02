import { adoptPayload, checkColumns, columnsToCells, packCells } from '../../../../packages/voxel/src/index.js';
import type { CellColumns, Cell, PackedCells, VoxelPayload } from '../../../../packages/voxel/src/index.js';
import { addAssetVersion, analyzeVersion } from '../../../../packages/domain/src/index.js';
import type { Asset, AssetVersion, BuildingMetrics, NewVersionInput } from '../../../../packages/domain/src/index.js';
import type { JobContext } from './protocol';

/**
 * Prepares a new immutable version of a large payload in the background
 * (PERF-04): content hash, version id, packed storage form and catalogue
 * metrics. The page already holds the identical sealed payload and only
 * attaches it; nothing large travels back.
 */
export interface VersionJobInput {
  readonly asset: Asset;
  readonly head: Omit<VoxelPayload, 'cells'>;
  readonly columns: CellColumns;
  readonly label?: string;
  readonly connectors?: NewVersionInput['connectors'];
  readonly source: NewVersionInput['source'];
}
export interface VersionJobOutput {
  readonly asset: Asset;
  /** The version without its payload. */
  readonly version: Omit<AssetVersion, 'payload'>;
  readonly packed: PackedCells | null;
  readonly metrics: BuildingMetrics;
}

export async function versionJob(input: VersionJobInput, ctx: JobContext): Promise<VersionJobOutput> {
  checkColumns(input.columns);
  ctx.progress('Blöcke übernehmen', 0.05);
  const cells: Cell[] = new Array(input.columns.count);
  columnsToCells(input.columns, cells);
  // Checked again here: the worker never trusts what it receives.
  const payload = adoptPayload({ ...input.head, cells });
  ctx.progress('Prüfsumme und Versionskennung berechnen', 0.2);
  const r = await addAssetVersion(input.asset, { payload, source: input.source, ...(input.label !== undefined && { label: input.label }), ...(input.connectors && { connectors: input.connectors }) });
  ctx.progress('Speicherform packen', 0.55);
  const packed = packCells(payload);
  ctx.progress('Kennwerte für den Katalog berechnen', 0.75);
  const metrics = analyzeVersion(r.version);
  const { payload: _payload, ...version } = r.version;
  if (packed) ctx.transfer([packed.bytes.buffer as ArrayBuffer]);
  return { asset: r.asset, version, packed, metrics };
}
