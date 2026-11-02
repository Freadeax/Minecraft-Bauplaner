import { checkColumns, columnsToCells } from '../../../../packages/voxel/src/index.js';
import type { BlockState, Cell, CellColumns } from '../../../../packages/voxel/src/index.js';
import * as formats from '../../../../packages/formats/src/index.js';
import { exportModel } from '../export3d/build.ts';
import type { ExportRequest, ExportResult } from '../export3d/build.ts';
import { rendererFromSnapshot } from '../blockmodels/snapshot.ts';
import type { RenderSnapshot } from '../blockmodels/snapshot.ts';
import type { JobContext } from './protocol';

/**
 * 3D export (MODEL-01) in the background (PERF-04): view model from the
 * block shapes of the loaded look, or the closed print hull. Large prints
 * took up to half a minute on the page before; now the page stays usable and
 * „Abbrechen“ stops at once. The texture PNG comes from the page (canvas).
 */
export interface ModelJobInput extends Omit<ExportRequest, 'cells' | 'palette' | 'view' | 'progress'> {
  readonly columns: CellColumns;
  readonly palette: readonly BlockState[];
  readonly view: Omit<ExportRequest['view'], 'renderer' | 'sprites' | 'texturePng'> & { readonly snapshot: RenderSnapshot; readonly texturePng: Uint8Array | null };
}
export type ModelJobOutput = ExportResult;

export async function modelJob(input: ModelJobInput, ctx: JobContext): Promise<ModelJobOutput> {
  checkColumns(input.columns);
  ctx.progress('Blöcke übernehmen', 0.02);
  const cells: Cell[] = new Array(input.columns.count);
  columnsToCells(input.columns, cells);
  const { snapshot, texturePng, ...view } = input.view;
  const { renderer, sprites } = rendererFromSnapshot(snapshot, input.palette);
  const { columns: _columns, ...rest } = input;
  const out = await exportModel(formats, {
    ...rest, cells, view: { ...view, renderer, sprites, ...(texturePng && { texturePng: async () => texturePng }) },
    progress: (step, fraction) => ctx.progress(step, 0.03 + fraction * 0.95),
  });
  ctx.transfer([out.file.bytes.buffer as ArrayBuffer]);
  return out;
}
