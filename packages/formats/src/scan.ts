import type { BlockState, NbtTag, Vec3 } from '../../voxel/src/types.js';
import { FormatError, NBT_LIMITS, readNbt } from './nbt.js';
import { gunzipLimited, parseBlockState } from './schem.js';

/**
 * Reader for in-game recordings ("Ist-Aufnahme", see docs/architecture/MOD_BRIDGE.md).
 * A recording is a Sponge Schem v3 of the plan box as it stands in the world. Unlike
 * the asset import it is not turned into a voxel payload: the comparison works on the
 * dense palette indices, so recordings up to the export size stay cheap.
 */

/** Cells the recorder could not read (chunk not loaded). Never treated as air. */
export const UNLOADED_STATE = 'bauplaner:unloaded';

export interface ScanLimits { maxCompressedBytes: number; maxUncompressedBytes: number; maxVolume: number; maxDimension: number; maxPalette: number; maxDepth: number; maxNodes: number; maxDurationMs: number }
/** Same volume as the Schem export; the byte array counts as nodes in the NBT reader. */
export const SCAN_LIMITS: Readonly<ScanLimits> = Object.freeze({ maxCompressedBytes: 16_000_000, maxUncompressedBytes: 40_000_000, maxVolume: 4_000_000, maxDimension: 65_535, maxPalette: 65_536, maxDepth: 32, maxNodes: 6_000_000, maxDurationMs: 20_000 });

/** `Metadata.Bauplaner` of a recording written by the game bridge (format `bauplaner-scan` v1). */
export interface ScanMeta {
  readonly projectId: string;
  readonly revisionId: string;
  readonly revisionNumber: number;
  /** Project coordinate of the recording's local 0/0/0 cell. */
  readonly projectMin: Vec3;
  readonly planSha256?: string;
  readonly worldAnchor?: Vec3;
  readonly dimension?: string;
  readonly scannedAt?: string;
  readonly source?: 'client' | 'server';
  readonly unloaded?: number;
  readonly gameVersion?: string;
  readonly modVersion?: string;
  readonly loader?: string;
}

export interface WorldScan {
  readonly dataVersion: number;
  /** Width (X), Height (Y), Length (Z). */
  readonly size: Vec3;
  /** Schem `Offset` as written; informational, the comparison uses `meta.projectMin` or an explicit alignment. */
  readonly offset: Vec3;
  readonly palette: readonly BlockState[];
  /** Palette index per cell, index `x + z·W + y·W·L`. */
  readonly data: Uint32Array;
  readonly blockEntities: number;
  /** null for foreign recordings without bridge metadata (e.g. WorldEdit `//schem save`). */
  readonly meta: ScanMeta | null;
  readonly warnings: readonly string[];
}

function fail(message: string): never { throw new FormatError('SCAN', message); }
type Compound = Readonly<Record<string, NbtTag>>;
function compound(tag: NbtTag | undefined, path: string): Compound { if (tag?.type !== 'compound') fail(`${path}: NBT-Compound fehlt.`); return tag.value; }
function int(tag: NbtTag | undefined, path: string): number { if (tag?.type !== 'int') fail(`${path}: NBT-Int fehlt.`); return tag.value; }
function vec(tag: NbtTag | undefined, path: string): Vec3 { if (tag?.type !== 'intArray' || tag.value.length !== 3) fail(`${path}: genau drei NBT-Ints erwartet.`); return [tag.value[0]!, tag.value[1]!, tag.value[2]!]; }
function str(tag: NbtTag | undefined, path: string): string { if (tag?.type !== 'string') fail(`${path}: NBT-String fehlt.`); return tag.value; }
function optional<T>(c: Compound, key: string, read: (t: NbtTag, path: string) => T): T | undefined { return c[key] === undefined ? undefined : read(c[key], `Bauplaner.${key}`); }

function readMeta(schematic: Compound): ScanMeta | null {
  if (!schematic.Metadata) return null;
  const metadata = compound(schematic.Metadata, 'Metadata');
  if (!metadata.Bauplaner) return null;
  const b = compound(metadata.Bauplaner, 'Metadata.Bauplaner');
  if (b.Kind === undefined) fail('Das ist eine Plan-Datei aus dem Export, keine Spielaufnahme. Bitte die von der Mod geschriebene Aufnahme wählen.');
  if (str(b.Kind, 'Bauplaner.Kind') !== 'scan') fail('Bauplaner.Kind muss "scan" sein.');
  const version = int(b.ScanVersion, 'Bauplaner.ScanVersion');
  if (version !== 1) fail(`Aufnahmeformat Version ${version} wird nicht unterstützt (erwartet 1).`);
  const source = optional(b, 'Source', str);
  if (source !== undefined && source !== 'client' && source !== 'server') fail('Bauplaner.Source muss "client" oder "server" sein.');
  const unloaded = optional(b, 'Unloaded', int);
  if (unloaded !== undefined && unloaded < 0) fail('Bauplaner.Unloaded darf nicht negativ sein.');
  const meta: Record<string, unknown> = {
    projectId: str(b.ProjectId, 'Bauplaner.ProjectId'),
    revisionId: str(b.RevisionId, 'Bauplaner.RevisionId'),
    revisionNumber: int(b.RevisionNumber, 'Bauplaner.RevisionNumber'),
    projectMin: vec(b.ProjectMin, 'Bauplaner.ProjectMin'),
    planSha256: optional(b, 'PlanSha256', str), worldAnchor: optional(b, 'WorldAnchor', vec), dimension: optional(b, 'Dimension', str),
    scannedAt: optional(b, 'ScannedAt', str), source, unloaded,
    gameVersion: optional(b, 'GameVersion', str), modVersion: optional(b, 'ModVersion', str), loader: optional(b, 'Loader', str),
  };
  for (const k of Object.keys(meta)) if (meta[k] === undefined) delete meta[k];
  return meta as unknown as ScanMeta;
}

/** Schema adapter for an already decompressed recording (testable without streams). */
export function normalizeScan(sourceNbt: { name: string; tag: NbtTag }, options: Partial<ScanLimits> = {}): WorldScan {
  const limits = { ...SCAN_LIMITS, ...options };
  const root = compound(sourceNbt.tag, 'Root');
  const s = compound(root.Schematic, 'Root.Schematic');
  if (int(s.Version, 'Version') !== 3) fail('Unterstützt wird ausschließlich Sponge Schematic Version 3.');
  const dataVersion = int(s.DataVersion, 'DataVersion');
  const size = (['Width', 'Height', 'Length'] as const).map(key => {
    const t = s[key];
    if (t?.type !== 'short') fail(`${key}: NBT-Short fehlt.`);
    const n = t.value & 0xffff;
    if (n < 1 || n > limits.maxDimension) fail(`${key}: erlaubter Bereich 1–${limits.maxDimension}.`);
    return n;
  }) as unknown as Vec3;
  const volume = size[0] * size[1] * size[2];
  if (volume > limits.maxVolume) throw new FormatError('LIMIT', `Aufnahme überschreitet ${limits.maxVolume} Zellen.`);
  const offset = s.Offset ? vec(s.Offset, 'Offset') : [0, 0, 0] as const;
  const blocks = compound(s.Blocks, 'Blocks');
  const entries = Object.entries(compound(blocks.Palette, 'Blocks.Palette'));
  if (entries.length < 1 || entries.length > limits.maxPalette) fail('Blockpalette fehlt oder ist zu groß.');
  const palette: BlockState[] = new Array(entries.length);
  for (const [text, t] of entries) {
    const index = int(t, `Palette.${text}`);
    if (index < 0 || index >= entries.length || palette[index]) fail('Paletten-IDs müssen lückenlos und eindeutig sein.');
    palette[index] = text === UNLOADED_STATE ? { id: UNLOADED_STATE, properties: {} } : parseBlockState(text);
  }
  if (blocks.Data?.type !== 'byteArray') fail('Blocks.Data: NBT-ByteArray fehlt.');
  const bytes = blocks.Data.value, data = new Uint32Array(volume);
  let pos = 0;
  for (let n = 0; n < volume; n++) {
    let value = 0, shift = 0, done = false;
    for (let i = 0; i < 5; i++) {
      if (pos >= bytes.length) fail('Blockdaten enden vor dem erwarteten Volumen.');
      const b = bytes[pos++]! & 255;
      if (i === 4 && (b & 0xf8) !== 0) fail('VarInt überschreitet nichtnegativen int32-Bereich.');
      value += (b & 127) * 2 ** shift;
      if ((b & 128) === 0) { done = true; break; }
      shift += 7;
    }
    if (!done) fail('Block-VarInt länger als fünf Bytes.');
    if (value >= palette.length) fail(`Block referenziert unbekannte Paletten-ID ${value}.`);
    data[n] = value;
  }
  if (pos !== bytes.length) fail('Überzählige Blockdaten hinter dem erwarteten Volumen.');
  const blockEntities = blocks.BlockEntities?.type === 'list' ? blocks.BlockEntities.value.length : 0;
  const meta = readMeta(s);
  const warnings: string[] = [];
  if (!meta) warnings.push('Fremde Aufnahme ohne Bauplaner-Metadaten (z. B. WorldEdit): Revision und Ausrichtung müssen manuell gewählt werden.');
  if (blockEntities) warnings.push(`${blockEntities} BlockEntities (Kisteninhalte, Schildtexte) werden nicht verglichen, nur der Block selbst.`);
  return { dataVersion, size, offset, palette, data, blockEntities, meta, warnings };
}

/** Reads a GZip-compressed recording with byte, node and time budgets. */
export async function readWorldScan(buffer: ArrayBuffer, options: Partial<ScanLimits> = {}): Promise<WorldScan & { sourceSha256: string }> {
  const limits = { ...SCAN_LIMITS, ...options };
  for (const [key, v] of Object.entries(limits)) if (!Number.isSafeInteger(v) || v < 1) throw new FormatError('LIMIT', `Ungültiges Limit: ${key}`);
  if (buffer.byteLength > limits.maxCompressedBytes) throw new FormatError('LIMIT', 'Aufnahme überschreitet das Größenlimit.');
  const input = new Uint8Array(buffer);
  if (input[0] !== 31 || input[1] !== 139) throw new FormatError('GZIP', 'Eine Aufnahme ist GZip-komprimiertes Sponge Schem v3 (.schem).');
  const start = performance.now();
  const raw = await gunzipLimited(buffer, limits);
  const remaining = limits.maxDurationMs - (performance.now() - start);
  if (remaining < 1) throw new FormatError('TIMEOUT', 'Zeitbudget überschritten.');
  const nbt = readNbt(raw, { ...NBT_LIMITS, maxBytes: limits.maxUncompressedBytes, maxDepth: limits.maxDepth, maxNodes: limits.maxNodes, maxDurationMs: Math.max(1, Math.floor(remaining)) });
  const scan = normalizeScan(nbt, limits);
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return { ...scan, sourceSha256: Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('') };
}
