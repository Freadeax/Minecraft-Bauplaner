import type { BlockState, NbtTag, Vec3 } from '../../voxel/src/types.js';
import { FormatError, readNbt } from './nbt.js';
import { lz4BlockStreamDecompress } from './lz4.js';
import { defaultProperties } from './defaultStates.js';

/**
 * Minecraft Java region files (Anvil, `.mca`) and the chunk NBT inside them
 * (WORLD-IMPORT-01, docs/architecture/WORLD_IMPORT.md).
 *
 * A region file covers 32 × 32 chunks. The first 4 KiB hold one location per
 * chunk (3-byte sector offset, 1-byte sector count, big endian; index
 * `(cx & 31) + (cz & 31) · 32`), the next 4 KiB the last-save time in seconds.
 * A chunk record is `length (int32 BE, includes the type byte) · type · data`.
 * Type 1 GZip, 2 zlib, 3 uncompressed, 4 LZ4 (since 24w04a); bit 128 means the
 * data lives in an external `c.<x>.<z>.mcc` file next to the region file.
 *
 * Only what a bounded excerpt needs is read: the header, then the records of
 * the chunks that intersect the selection. Nothing here writes a world.
 */

export const SECTOR_BYTES = 4096;
export const REGION_HEADER_BYTES = 2 * SECTOR_BYTES;
/** DataVersion of 20w17a: from here on block-state longs never span two longs (1.16+). */
export const ANVIL_MIN_DATA_VERSION = 2529;
/** DataVersion of 21w43a: chunk root without `Level`, `sections`/`block_states`, negative Y (1.18+). */
export const ANVIL_FLAT_ROOT_DATA_VERSION = 2844;

export interface AnvilLimits {
  /** Bytes of one chunk record as stored (the game caps in-file chunks at 255 sectors ≈ 1 MiB; external files may be larger). */
  maxChunkRecordBytes: number;
  maxUncompressedChunkBytes: number;
  maxChunkNodes: number;
  maxDurationMs: number;
}
export const ANVIL_LIMITS: Readonly<AnvilLimits> = Object.freeze({
  maxChunkRecordBytes: 8_000_000, maxUncompressedChunkBytes: 16_000_000, maxChunkNodes: 400_000, maxDurationMs: 5_000,
});

/** Chunk compound entries the excerpt never uses; skipped without allocating (light, biomes, ticks, structures). */
export const CHUNK_SKIP_KEYS: ReadonlySet<string> = new Set([
  'BlockLight', 'SkyLight', 'biomes', 'Biomes', 'Heightmaps', 'PostProcessing', 'block_ticks', 'fluid_ticks', 'TileTicks', 'LiquidTicks',
  'structures', 'Structures', 'CarvingMasks', 'blending_data', 'Lights', 'LiquidsToBeTicked', 'ToBeTicked', 'Entities',
  'below_zero_retrogen', 'UpgradeData', 'isLightOn',
]);

function fail(message: string): never { throw new FormatError('ANVIL', message); }

export interface RegionName { readonly rx: number; readonly rz: number }
/** `r.<x>.<z>.mca` → region coordinates; null for any other name. */
export function parseRegionFileName(name: string): RegionName | null {
  const m = /(?:^|[\\/])r\.(-?\d{1,7})\.(-?\d{1,7})\.mca$/.exec(name);
  return m ? { rx: Number(m[1]), rz: Number(m[2]) } : null;
}
export const regionFileName = (rx: number, rz: number): string => `r.${rx}.${rz}.mca`;
/** `c.<x>.<z>.mcc` → absolute chunk coordinates of an external chunk file. */
export function parseExternalChunkName(name: string): { cx: number; cz: number } | null {
  const m = /(?:^|[\\/])c\.(-?\d{1,8})\.(-?\d{1,8})\.mcc$/.exec(name);
  return m ? { cx: Number(m[1]), cz: Number(m[2]) } : null;
}

export interface RegionEntry {
  /** Absolute chunk coordinates. */
  readonly cx: number; readonly cz: number;
  readonly sectorOffset: number; readonly sectorCount: number;
  /** Last save, seconds since epoch (0 when the game wrote none). */
  readonly timestamp: number;
}

/**
 * Locations of all stored chunks. Entries pointing into the header, beyond the
 * file or overlapping another entry are rejected: such a file is not a
 * consistent copy (e.g. copied while the game was writing).
 */
export function readRegionHeader(header: Uint8Array, region: RegionName, fileSize: number): RegionEntry[] {
  if (header.length < REGION_HEADER_BYTES) fail(`Regionsdatei ${regionFileName(region.rx, region.rz)} ist kürzer als ihr 8-KiB-Kopf.`);
  const view = new DataView(header.buffer, header.byteOffset, REGION_HEADER_BYTES);
  const entries: RegionEntry[] = [];
  const fileSectors = Math.ceil(fileSize / SECTOR_BYTES);
  for (let i = 0; i < 1024; i++) {
    const loc = view.getUint32(i * 4);
    if (loc === 0) continue;
    const sectorOffset = loc >>> 8, sectorCount = loc & 0xff;
    if (sectorOffset < 2 || sectorCount === 0 || sectorOffset + sectorCount > fileSectors)
      fail(`${regionFileName(region.rx, region.rz)}: Chunkeintrag ${i} zeigt außerhalb der Datei (Sektor ${sectorOffset}+${sectorCount} von ${fileSectors}). Die Kopie ist unvollständig oder beschädigt.`);
    entries.push({ cx: region.rx * 32 + (i & 31), cz: region.rz * 32 + (i >> 5), sectorOffset, sectorCount, timestamp: view.getUint32(SECTOR_BYTES + i * 4) });
  }
  const sorted = [...entries].sort((a, b) => a.sectorOffset - b.sectorOffset);
  for (let k = 1; k < sorted.length; k++) {
    const prev = sorted[k - 1]!, cur = sorted[k]!;
    if (prev.sectorOffset + prev.sectorCount > cur.sectorOffset)
      fail(`${regionFileName(region.rx, region.rz)}: Chunks ${prev.cx}/${prev.cz} und ${cur.cx}/${cur.cz} überlappen in der Datei.`);
  }
  return entries;
}

export type ChunkCompression = 'gzip' | 'zlib' | 'none' | 'lz4';
const COMPRESSION: Readonly<Record<number, ChunkCompression>> = { 1: 'gzip', 2: 'zlib', 3: 'none', 4: 'lz4' };

export interface ChunkRecord { readonly compression: ChunkCompression; readonly external: boolean; readonly data: Uint8Array }
/** Splits the sectors of one chunk into compression type and payload. */
export function splitChunkRecord(sectors: Uint8Array, where: string): ChunkRecord {
  if (sectors.length < 5) fail(`${where}: Chunk-Datensatz abgeschnitten.`);
  const length = new DataView(sectors.buffer, sectors.byteOffset, 4).getUint32(0);
  const type = sectors[4]!;
  const external = (type & 128) !== 0;
  if (!external && (length < 1 || length + 4 > sectors.length)) fail(`${where}: Chunklänge ${length} passt nicht zu den reservierten Sektoren.`);
  const kind = type & 127;
  if (kind === 127) fail(`${where}: eigener Kompressionsalgorithmus einer Mod (Typ 127) wird nicht unterstützt.`);
  const compression = COMPRESSION[kind];
  if (!compression) fail(`${where}: unbekannte Chunk-Kompression ${kind}.`);
  return { compression, external, data: external ? new Uint8Array(0) : sectors.subarray(5, 4 + length) };
}

async function inflate(data: Uint8Array, format: 'gzip' | 'deflate', limits: AnvilLimits, where: string): Promise<Uint8Array> {
  const copy = new Uint8Array(data.byteLength); copy.set(data);
  const reader = new Blob([copy]).stream().pipeThrough(new DecompressionStream(format)).getReader();
  const chunks: Uint8Array[] = []; let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      total += value.byteLength;
      if (total > limits.maxUncompressedChunkBytes) throw new FormatError('LIMIT', `${where}: entpackter Chunk überschreitet ${limits.maxUncompressedChunkBytes} Bytes.`);
      chunks.push(value);
    }
  } catch (e) { if (e instanceof FormatError) throw e; fail(`${where}: Chunkdaten sind beschädigt (${format === 'gzip' ? 'GZip' : 'zlib'}).`); }
  finally { void reader.cancel().catch(() => {}); }
  if (chunks.length === 1) return chunks[0]!;
  const out = new Uint8Array(total); let p = 0;
  for (const c of chunks) { out.set(c, p); p += c.byteLength; }
  return out;
}

/** Decompresses the payload of a chunk record (or of an external `.mcc` file). */
export async function decompressChunk(compression: ChunkCompression, data: Uint8Array, limits: AnvilLimits = ANVIL_LIMITS, where = 'Chunk'): Promise<Uint8Array> {
  if (data.length > limits.maxChunkRecordBytes) throw new FormatError('LIMIT', `${where}: Chunk-Datensatz überschreitet ${limits.maxChunkRecordBytes} Bytes.`);
  switch (compression) {
    case 'none': if (data.length > limits.maxUncompressedChunkBytes) throw new FormatError('LIMIT', `${where}: Chunk überschreitet das Größenlimit.`); return data;
    case 'gzip': return inflate(data, 'gzip', limits, where);
    case 'zlib': return inflate(data, 'deflate', limits, where);
    case 'lz4': try { return lz4BlockStreamDecompress(data, limits.maxUncompressedChunkBytes); } catch (e) { if (e instanceof FormatError && e.code === 'LZ4') fail(`${where}: ${e.message}`); throw e; }
  }
}

/** One 16 × 16 × 16 section: palette and the palette index of every cell (`y·256 + z·16 + x`), null when uniform. */
export interface ChunkSection {
  readonly y: number;
  readonly palette: readonly BlockState[];
  readonly indices: Uint16Array | null;
}
export type ChunkLayout = 'flat' | 'level';
export interface ChunkBlockEntity { readonly position: Vec3; readonly data: NbtTag }
export interface ParsedChunk {
  readonly cx: number; readonly cz: number;
  readonly dataVersion: number;
  /** Generation status as stored, e.g. "minecraft:full"; "" when absent. */
  readonly status: string;
  /** True only for fully generated chunks. Others may lack terrain, features or decoration. */
  readonly complete: boolean;
  readonly layout: ChunkLayout;
  /** Sections by section Y; missing sections inside the world height are air. */
  readonly sections: ReadonlyMap<number, ChunkSection>;
  /** Lowest/highest section Y present (or declared by `yPos`). */
  readonly minSectionY: number;
  readonly maxSectionY: number;
  /** Absolute world positions, complete raw NBT kept unchanged. */
  readonly blockEntities: readonly ChunkBlockEntity[];
  readonly lastUpdate: string | null;
  /** Palette entries stored as bare id (26.x default state) and completed from defaultStates.ts. */
  readonly expandedDefaults: number;
  /** Mod blocks stored as bare id: their default properties are unknown and stay empty. */
  readonly modDefaultIds: readonly string[];
}

type Compound = Readonly<Record<string, NbtTag>>;
const comp = (t: NbtTag | undefined, where: string): Compound => { if (t?.type !== 'compound') fail(`${where}: Compound fehlt.`); return t.value; };
const int = (t: NbtTag | undefined, where: string): number => { if (t?.type !== 'int') fail(`${where}: Int fehlt.`); return t.value; };
const listOf = (t: NbtTag | undefined, where: string): readonly NbtTag[] => {
  if (t === undefined) return [];
  if (t.type !== 'list') fail(`${where}: Liste erwartet.`);
  return t.value;
};
const NAMESPACED = /^[a-z0-9_.-]+:[a-z0-9_./-]+$/;
/** Per-chunk notes on palette entries that needed the default-state table. */
interface PaletteNotes { expanded: number; modDefaults: Set<string> }
function namespacedId(name: string, where: string): string {
  const id = name.includes(':') ? name : `minecraft:${name}`;
  if (!NAMESPACED.test(id)) fail(`${where}: ungültige Block-ID ${name}.`);
  return id;
}
function stringProps(t: NbtTag, where: string): Record<string, string> {
  const properties: Record<string, string> = Object.create(null);
  for (const [k, v] of Object.entries(comp(t, where))) {
    if (v.type !== 'string') fail(`${where}.${k}: Text erwartet.`);
    properties[k] = v.value;
  }
  return properties;
}
/**
 * Palette entry → complete block state. Three encodings occur:
 *  - up to 1.21.4: `{Name, Properties?}` with every property;
 *  - since 26.x a block in its default state is the bare id (a string, or `{"": id}`
 *    inside a mixed list), any other state `{id, properties}`.
 * Bare ids get the default values of the generated 26.3 report (defaultStates.ts),
 * so a chest stays `facing=north,type=single,waterlogged=false`, not a state without
 * properties. Unknown mod blocks keep their bare id and are noted.
 */
function blockState(t: NbtTag, where: string, notes: PaletteNotes): BlockState {
  let id: string, stored: Record<string, string> | null = null;
  if (t.type === 'string') id = namespacedId(t.value, where);
  else {
    const c = comp(t, where);
    if (c[''] !== undefined && Object.keys(c).length === 1) {
      if (c['']?.type !== 'string') fail(`${where}: Block-ID fehlt.`);
      id = namespacedId(c[''].value, where);
    } else if (c.Name !== undefined) {
      if (c.Name.type !== 'string') fail(`${where}.Name fehlt.`);
      id = namespacedId(c.Name.value, where);
      stored = c.Properties === undefined ? Object.create(null) as Record<string, string> : stringProps(c.Properties, `${where}.Properties`);
      return { id, properties: stored };
    } else if (c.id !== undefined) {
      if (c.id.type !== 'string') fail(`${where}.id fehlt.`);
      id = namespacedId(c.id.value, where);
      stored = c.properties === undefined ? Object.create(null) as Record<string, string> : stringProps(c.properties, `${where}.properties`);
    } else fail(`${where}: unbekannte Paletten-Kodierung.`);
  }
  const defaults = defaultProperties(id);
  if (stored === null) {
    if (defaults) notes.expanded++;
    else if (!id.startsWith('minecraft:')) notes.modDefaults.add(id);
  }
  const properties: Record<string, string> = Object.create(null);
  if (defaults) Object.assign(properties, defaults);
  if (stored) Object.assign(properties, stored);
  return { id, properties };
}

/**
 * Unpacks 4096 indices from a long array without spanning (1.16+): each long
 * holds ⌊64 / bits⌋ entries from the lowest bits up; bits = max(4, ⌈log2 n⌉).
 */
export function unpackSection(longs: readonly string[], paletteSize: number, where: string): Uint16Array {
  const bits = Math.max(4, Math.ceil(Math.log2(paletteSize)));
  const per = Math.floor(64 / bits), expected = Math.ceil(4096 / per);
  if (longs.length !== expected) fail(`${where}: ${longs.length} Longs für ${paletteSize} Paletteneinträge, erwartet ${expected}.`);
  const out = new Uint16Array(4096), mask = (1 << bits) - 1;
  let i = 0;
  for (const text of longs) {
    const value = BigInt.asUintN(64, BigInt(text));
    const lo = Number(value & 0xffffffffn) >>> 0, hi = Number(value >> 32n) >>> 0;
    for (let k = 0, o = 0; k < per && i < 4096; k++, i++, o += bits) {
      const v = o + bits <= 32 ? (lo >>> o) & mask : o >= 32 ? (hi >>> (o - 32)) & mask : ((lo >>> o) | (hi << (32 - o))) & mask;
      if (v >= paletteSize) fail(`${where}: Index ${v} außerhalb der Palette (${paletteSize}).`);
      out[i] = v;
    }
  }
  return out;
}

function readSection(t: NbtTag, flat: boolean, where: string, notes: PaletteNotes): ChunkSection | null {
  const s = comp(t, where);
  const yTag = s.Y;
  if (yTag?.type !== 'byte' && yTag?.type !== 'int') fail(`${where}.Y fehlt.`);
  const y = yTag.value;
  let paletteTag: NbtTag | undefined, dataTag: NbtTag | undefined;
  if (flat) {
    if (s.block_states === undefined) return null; // light-only section
    const bs = comp(s.block_states, `${where}.block_states`);
    paletteTag = bs.palette; dataTag = bs.data;
  } else { paletteTag = s.Palette; dataTag = s.BlockStates; }
  if (paletteTag === undefined) return null;
  const palette = listOf(paletteTag, `${where}.palette`).map((p, i) => blockState(p, `${where}.palette[${i}]`, notes));
  if (palette.length === 0) fail(`${where}: leere Palette.`);
  if (palette.length > 4096) fail(`${where}: Palette größer als 4096.`);
  if (dataTag === undefined) {
    if (palette.length !== 1) fail(`${where}: Blockdaten fehlen trotz ${palette.length} Paletteneinträgen.`);
    return { y, palette, indices: null };
  }
  if (dataTag.type !== 'longArray') fail(`${where}: Blockdaten müssen ein LongArray sein.`);
  return { y, palette, indices: unpackSection(dataTag.value, palette.length, where) };
}

/** Chunk NBT (1.16–1.17 `Level` layout or 1.18+ flat layout) → sections and block entities. */
export function parseChunkNbt(tag: NbtTag, expected?: { cx: number; cz: number }): ParsedChunk {
  const where = expected ? `Chunk ${expected.cx}/${expected.cz}` : 'Chunk';
  const root = comp(tag, where);
  const dataVersion = root.DataVersion === undefined ? 0 : int(root.DataVersion, `${where}.DataVersion`);
  if (dataVersion < ANVIL_MIN_DATA_VERSION)
    fail(`${where}: DataVersion ${dataVersion || 'fehlt'} – Welten vor Minecraft 1.16 werden nicht gelesen. Die Welt einmal in einer neueren Version öffnen und speichern.`);
  const flat = root.Level === undefined;
  if (!flat && dataVersion >= ANVIL_FLAT_ROOT_DATA_VERSION) fail(`${where}: Level-Compound in einem Chunk ab 1.18.`);
  const body = flat ? root : comp(root.Level, `${where}.Level`);
  const cx = int(body.xPos, `${where}.xPos`), cz = int(body.zPos, `${where}.zPos`);
  if (expected && (cx !== expected.cx || cz !== expected.cz)) fail(`${where}: Datei nennt Chunk ${cx}/${cz}. Die Regionsdatei gehört zu anderen Koordinaten oder ist beschädigt.`);
  const status = body.Status?.type === 'string' ? body.Status.value : '';
  const complete = status === 'minecraft:full' || status === 'full';
  const sections = new Map<number, ChunkSection>();
  const notes: PaletteNotes = { expanded: 0, modDefaults: new Set() };
  const list = flat ? body.sections : body.Sections;
  for (const [i, t] of listOf(list, `${where}.sections`).entries()) {
    const s = readSection(t, flat, `${where}.sections[${i}]`, notes);
    if (!s) continue;
    if (sections.has(s.y)) fail(`${where}: Section Y=${s.y} doppelt.`);
    sections.set(s.y, s);
  }
  const ys = [...sections.keys()];
  const declaredMin = flat && body.yPos?.type === 'int' ? body.yPos.value : (flat ? -4 : 0);
  const minSectionY = Math.min(declaredMin, ...ys), maxSectionY = Math.max(minSectionY, ...ys);
  const blockEntities: ChunkBlockEntity[] = [];
  for (const [i, t] of listOf(flat ? body.block_entities : body.TileEntities, `${where}.block_entities`).entries()) {
    const c = comp(t, `${where}.block_entities[${i}]`);
    const position: Vec3 = [int(c.x, 'x'), int(c.y, 'y'), int(c.z, 'z')];
    if (Math.floor(position[0] / 16) !== cx || Math.floor(position[2] / 16) !== cz) continue; // stale entry from another chunk
    blockEntities.push({ position, data: t });
  }
  const lastUpdate = body.LastUpdate?.type === 'long' ? body.LastUpdate.value : null;
  return { cx, cz, dataVersion, status, complete, layout: flat ? 'flat' : 'level', sections, minSectionY, maxSectionY, blockEntities, lastUpdate, expandedDefaults: notes.expanded, modDefaultIds: [...notes.modDefaults].sort() };
}

/** Palette entry at chunk-local x/z and absolute y; null for air outside every section. */
export function chunkBlockAt(chunk: ParsedChunk, lx: number, y: number, lz: number): BlockState | null {
  const s = chunk.sections.get(Math.floor(y / 16));
  if (!s) return null;
  if (!s.indices) return s.palette[0]!;
  return s.palette[s.indices[((y & 15) << 8) | (lz << 4) | lx]!]!;
}

/** Random access to one region file; `read` returns exactly `length` bytes or fewer at the end. */
export interface RegionSource {
  readonly name: string;
  readonly size: number;
  read(offset: number, length: number): Promise<Uint8Array>;
}
/** External chunk payloads (`c.<x>.<z>.mcc`) by absolute chunk coordinates. */
export type ExternalChunkLookup = (cx: number, cz: number) => RegionSource | undefined;

export type ChunkRead =
  | { readonly state: 'ok'; readonly chunk: ParsedChunk; readonly compression: ChunkCompression; readonly bytes: number; readonly timestamp: number }
  | { readonly state: 'missing' }
  | { readonly state: 'external-missing'; readonly timestamp: number }
  | { readonly state: 'error'; readonly message: string };

export class RegionReader {
  private constructor(readonly source: RegionSource, readonly region: RegionName, readonly entries: ReadonlyMap<string, RegionEntry>) {}

  static async open(source: RegionSource, region?: RegionName): Promise<RegionReader> {
    const name = region ?? parseRegionFileName(source.name);
    if (!name) fail(`„${source.name}“ ist keine Regionsdatei (erwartet r.<x>.<z>.mca).`);
    if (source.size === 0) return new RegionReader(source, name, new Map()); // the game creates empty files for untouched regions
    const header = await source.read(0, REGION_HEADER_BYTES);
    const entries = readRegionHeader(header, name, source.size);
    return new RegionReader(source, name, new Map(entries.map(e => [`${e.cx},${e.cz}`, e])));
  }

  entry(cx: number, cz: number): RegionEntry | undefined { return this.entries.get(`${cx},${cz}`); }

  async chunk(cx: number, cz: number, options: { limits?: AnvilLimits; external?: ExternalChunkLookup } = {}): Promise<ChunkRead> {
    const limits = options.limits ?? ANVIL_LIMITS;
    const e = this.entry(cx, cz);
    if (!e) return { state: 'missing' };
    const where = `Chunk ${cx}/${cz} (${this.source.name})`;
    try {
      const sectors = await this.source.read(e.sectorOffset * SECTOR_BYTES, e.sectorCount * SECTOR_BYTES);
      const record = splitChunkRecord(sectors, where);
      let data = record.data;
      if (record.external) {
        const file = options.external?.(cx, cz);
        if (!file) return { state: 'external-missing', timestamp: e.timestamp };
        if (file.size > limits.maxChunkRecordBytes) throw new FormatError('LIMIT', `${where}: externe Chunkdatei zu groß.`);
        data = await file.read(0, file.size);
      }
      const raw = await decompressChunk(record.compression, data, limits, where);
      const nbt = readNbt(raw, { maxBytes: limits.maxUncompressedChunkBytes, maxNodes: limits.maxChunkNodes, maxDurationMs: limits.maxDurationMs, maxDepth: 64 }, { skipKeys: CHUNK_SKIP_KEYS });
      return { state: 'ok', chunk: parseChunkNbt(nbt.tag, { cx, cz }), compression: record.compression, bytes: data.length, timestamp: e.timestamp };
    } catch (error) {
      if (error instanceof FormatError && error.code === 'LIMIT') throw error;
      return { state: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }
}

/** In-memory region source (tests, Node scripts). */
export function bytesRegionSource(name: string, bytes: Uint8Array): RegionSource {
  return { name, size: bytes.length, read: async (offset, length) => bytes.subarray(offset, Math.min(bytes.length, offset + length)) };
}
