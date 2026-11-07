import { loadFromFiles, loadFromMojang } from '../blockmodels/pack';
import type { PackSourceInfo } from '../blockmodels/pack';
import type { JobContext } from './protocol';

/**
 * Loads a texture source in the background (P1 Härtung 07.11.2026): download, unzipping and the image check of
 * client jars, resource packs and mod jars run here, so „Abbrechen“ ends the worker at once and a hostile archive
 * can never freeze the page. The page keeps its current source and merges the result itself.
 */
export type PackJobInput =
  | { readonly mode: 'mojang'; readonly version: string }
  /** `held`: bytes the kept source already holds; they count against the shared budget. */
  | { readonly mode: 'files'; readonly files: readonly File[]; readonly held: number };
export interface PackJobOutput { readonly files: [string, Uint8Array][]; readonly infos: PackSourceInfo[] }

export async function packJob(input: PackJobInput, ctx: JobContext): Promise<PackJobOutput> {
  const progress = (step: string, fraction?: number) => ctx.progress(step, fraction ?? null);
  const { files, infos } = input.mode === 'mojang'
    ? await loadFromMojang(input.version, progress).then(r => ({ files: r.files, infos: [r.info] }))
    : await loadFromFiles(input.files, new Map(), progress, undefined, input.held);
  const list = [...files];
  ctx.transfer(list.map(([, v]) => v.buffer as ArrayBuffer).filter((b, i, all) => all.indexOf(b) === i));
  return { files: list, infos };
}
