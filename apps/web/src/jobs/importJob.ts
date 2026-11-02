import { countBlocks, createPayload, payloadToTransport, columnBuffers, validatePayload } from '../../../../packages/voxel/src/index.js';
import type { PayloadTransport } from '../../../../packages/voxel/src/index.js';
import { importStructure, detectNbtCompression, FormatError } from '../../../../packages/formats/src/index.js';
import type { LitematicResult, SchemResult } from '../../../../packages/formats/src/index.js';
import { MAX_IMPORT_BYTES } from '../app/importLimits';
import type { JobContext } from './protocol';

/**
 * Reads a structure file (Sponge Schem v3, Litematic, Voxel-JSON) in the
 * background and hands the payload back as cell columns (PERF-04, before:
 * `import.worker.ts`). The parsed NBT tree stays here; the page keeps the
 * original bytes itself.
 */
export interface ImportJobInput { readonly buffer: ArrayBuffer; readonly name: string; readonly region?: string }
export type ImportReport = Omit<SchemResult, 'sourceNbt' | 'payload'> | Omit<LitematicResult, 'sourceNbt' | 'payload'>;
export interface ImportJobOutput {
  readonly format: 'schem' | 'litematic' | 'json';
  readonly transport: PayloadTransport;
  readonly report: ImportReport | null;
  readonly counts: ReturnType<typeof countBlocks>;
}

export async function importJob(input: ImportJobInput, ctx: JobContext): Promise<ImportJobOutput> {
  const { buffer, name, region } = input;
  try {
    if (buffer.byteLength > MAX_IMPORT_BYTES) throw new Error(`Die Datei ist zu groß (maximal ${MAX_IMPORT_BYTES / 1_000_000} MB).`);
    const bytes = new Uint8Array(buffer);
    let out: Omit<ImportJobOutput, 'transport' | 'counts'> & { payload: Parameters<typeof payloadToTransport>[0] };
    if (detectNbtCompression(bytes) !== null) {
      // Sponge Schem v3 and Litematic are recognised by content, not by file extension;
      // GZip (as Litematica writes it), zlib and uncompressed NBT are all accepted.
      const s = await importStructure(buffer, { ...(region !== undefined && { region }), onStep: step => ctx.progress(step, step.startsWith('Datei') ? 0.1 : 0.5) });
      const { sourceNbt: _sourceNbt, payload, ...report } = s.result;
      out = { format: s.format, payload, report };
    } else {
      if (!name.toLowerCase().endsWith('.json')) throw new Error('Erwartet Sponge Schem v3, Litematic (.litematic, komprimiert oder unkomprimiert) oder Voxel-JSON. Alte Schematic-Versionen werden nicht unterstützt.');
      ctx.progress('JSON lesen', 0.2);
      const payload = createPayload(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)), { maxCells: 250_000, maxNbtNodes: 50_000, maxNbtDepth: 32, maxStringLength: 100_000 });
      if (payload.bounds.maxExclusive.some((n, i) => n - payload.bounds.min[i]! > 256)) throw new Error('Die Vorschau unterstützt höchstens 256 Blöcke pro Achse.');
      out = { format: 'json', payload, report: null };
    }
    ctx.progress('Blöcke prüfen', 0.8);
    // The page seals the payload with the default limits without checking it again, so they must hold here.
    validatePayload(out.payload);
    const counts = countBlocks(out.payload);
    ctx.progress('Übergabe vorbereiten', 0.9);
    const transport = payloadToTransport(out.payload);
    ctx.transfer(columnBuffers(transport.columns));
    return { format: out.format, report: out.report, counts, transport };
  } catch (e) {
    throw Object.assign(e instanceof Error ? e : new Error('Datei konnte nicht gelesen werden.'), { code: e instanceof FormatError ? e.code : 'IMPORT' });
  }
}
