import type { NbtTag } from '../../voxel/src/types.js';
import { FormatError } from './nbt.js';
import { normalizeSchem, SCHEM_LIMITS } from './schem.js';
import type { SchemResult } from './schem.js';
import { normalizeLitematic, readCompressedNbt, LITEMATIC_LIMITS } from './litematic.js';
import type { LitematicResult } from './litematic.js';

/** One imported structure file, recognised by content rather than by file extension. */
export type StructureImport =
  | { readonly format: 'schem'; readonly result: SchemResult }
  | { readonly format: 'litematic'; readonly result: LitematicResult };

export type StructureFormat = StructureImport['format'];

/** Names the format of a parsed NBT root, or explains why it is not supported. */
export function detectStructureFormat(tag: NbtTag): StructureFormat {
  if (tag.type !== 'compound') throw new FormatError('FORMAT', 'NBT-Wurzel muss ein Compound sein.');
  const root = tag.value;
  if (root.Schematic?.type === 'compound') return 'schem';
  if (root.Regions?.type === 'compound' && root.Version?.type === 'int') return 'litematic';
  if (root.Version?.type === 'int' && root.Width && root.BlockData) throw new FormatError('FORMAT', 'Sponge Schematic Version 1/2 wird nicht unterstützt; bitte als Version 3 speichern.');
  if (root.Blocks?.type === 'byteArray' && root.Materials) throw new FormatError('FORMAT', 'Altes MCEdit-.schematic-Format (vor Minecraft 1.13) wird nicht unterstützt.');
  if (root.size?.type === 'list' && root.palette !== undefined) throw new FormatError('FORMAT', 'Vanilla-Strukturdateien (.nbt) werden noch nicht unterstützt.');
  throw new FormatError('FORMAT', 'Unbekanntes Strukturformat: erwartet Sponge Schem v3 oder Litematic.');
}

/** GZip structure file → Sponge Schem v3 or Litematic, decompressed and parsed once. */
export async function importStructure(buffer: ArrayBuffer, options: { region?: string } = {}): Promise<StructureImport> {
  const limits = { ...SCHEM_LIMITS, ...LITEMATIC_LIMITS };
  const { sourceNbt, sourceSha256 } = await readCompressedNbt(buffer, limits);
  if (detectStructureFormat(sourceNbt.tag) === 'schem') return { format: 'schem', result: { ...normalizeSchem(sourceNbt), sourceSha256 } };
  return { format: 'litematic', result: { ...normalizeLitematic(sourceNbt, options.region === undefined ? {} : { region: options.region }), sourceSha256 } };
}
