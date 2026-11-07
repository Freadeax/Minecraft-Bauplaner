import { hydratePayload } from '../../../../packages/voxel/src/index.js';
import type { PayloadTransport } from '../../../../packages/voxel/src/index.js';
import { writeExportFile } from '../../../../packages/application/src/revisionExport.js';
import type { FileWriteRequest, FileWriteResult } from '../../../../packages/application/src/revisionExport.js';
import type { JobContext } from './protocol';

/**
 * Writes a .schem or .litematic file in the background (PERF-07, O-10). The page freezes the revision and
 * builds the metadata; only the world (as cell columns) and the format options come here. Before, a plan
 * with 300 000 blocks held the page for about a second while the file was packed.
 */
export type WriteJobInput = Omit<FileWriteRequest, 'world'> & { readonly world: PayloadTransport };
export type WriteJobOutput = FileWriteResult;

export async function writeJob(input: WriteJobInput, ctx: JobContext): Promise<WriteJobOutput> {
  ctx.progress('Blöcke übernehmen', 0.05);
  const world = await hydratePayload(input.world);
  ctx.progress(input.format === 'litematic' ? '.litematic schreiben' : '.schem schreiben', 0.4);
  const out = await writeExportFile({ ...input, world } as FileWriteRequest);
  ctx.transfer([out.bytes.buffer as ArrayBuffer]);
  return out;
}
