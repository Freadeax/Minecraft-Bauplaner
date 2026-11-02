import { createPayload, stateKey, AIR_IDS } from '../../voxel/src/validation.js';
import { UNLOADED_STATE } from '../../voxel/src/observation.js';
import type { BlockEntity, BlockState, Bounds, Cell, Vec3, VoxelPayload } from '../../voxel/src/types.js';
import { FormatError } from './nbt.js';
import { ANVIL_LIMITS, RegionReader, chunkBlockAt, parseRegionFileName, parseExternalChunkName } from './anvil.js';
import type { AnvilLimits, ChunkBlockEntity, ChunkCompression, ParsedChunk, RegionSource, ExternalChunkLookup } from './anvil.js';

/**
 * Bounded world excerpt (WORLD-IMPORT-01). A box in world coordinates is read
 * from the region files that cover it, chunk by chunk, into a dense sample.
 * Every cell whose chunk is not available (region file not given, chunk never
 * generated, not fully generated, unreadable) is `bauplaner:unloaded`, never
 * air: unknown terrain stays unchecked. Cells above or below the world height
 * of a readable chunk are air (nothing can be there).
 *
 * The sample feeds two consumers: the library import (sampleToPayload) and the
 * terrain check of a placed project (packages/domain/src/terrain.ts).
 */

export interface WorldSampleLimits {
  /** Cells of the dense sample (4 bytes each). */
  maxVolume: number;
  /** Per horizontal axis. */
  maxSpan: number;
  maxHeight: number;
  maxChunks: number;
  maxBlockEntities: number;
}
export const WORLD_SAMPLE_LIMITS: Readonly<WorldSampleLimits> = Object.freeze({
  maxVolume: 16_777_216, maxSpan: 1024, maxHeight: 4064, maxChunks: 4096, maxBlockEntities: 20_000,
});
/** Library assets keep the same per-axis budget as file imports. */
export const EXCERPT_PAYLOAD_LIMITS = Object.freeze({ maxCells: 250_000, maxDimension: 256 });

/** The files a user picked from a world folder, keyed by region coordinates. */
export interface WorldFiles {
  readonly regions: ReadonlyMap<string, RegionSource>;
  readonly external?: ExternalChunkLookup;
}
export const regionKey = (rx: number, rz: number): string => `${rx},${rz}`;

/** Sorts picked files into region files and external chunk files; anything else is listed as ignored. */
export function collectWorldFiles(files: readonly RegionSource[]): { files: WorldFiles; ignored: string[]; duplicates: string[] } {
  const regions = new Map<string, RegionSource>(), external = new Map<string, RegionSource>();
  const ignored: string[] = [], duplicates: string[] = [];
  for (const f of files) {
    const r = parseRegionFileName(f.name), c = parseExternalChunkName(f.name);
    if (r) { const k = regionKey(r.rx, r.rz); if (regions.has(k)) duplicates.push(f.name); else regions.set(k, f); }
    else if (c) external.set(`${c.cx},${c.cz}`, f);
    else ignored.push(f.name);
  }
  return { files: { regions, ...(external.size && { external: (cx: number, cz: number) => external.get(`${cx},${cz}`) }) }, ignored, duplicates };
}

export type ChunkState = 'ok' | 'no-region' | 'missing' | 'incomplete' | 'external-missing' | 'error';
export const CHUNK_STATE_LABEL: Readonly<Record<ChunkState, string>> = {
  ok: 'gelesen', 'no-region': 'Regionsdatei fehlt', missing: 'nie erzeugt', incomplete: 'nicht fertig generiert',
  'external-missing': 'externe .mcc-Datei fehlt', error: 'unlesbar',
};
export interface ChunkSummary {
  readonly cx: number; readonly cz: number;
  readonly state: ChunkState;
  readonly status?: string;
  readonly dataVersion?: number;
  readonly compression?: ChunkCompression;
  /** Last save, seconds since epoch. */
  readonly timestamp?: number;
  readonly message?: string;
}

export interface WorldSample {
  /** World coordinates, maxExclusive. */
  readonly box: Bounds;
  /** Width (X), Height (Y), Length (Z). */
  readonly size: Vec3;
  /** Index 0 is always `bauplaner:unloaded`. */
  readonly palette: readonly BlockState[];
  /** Palette index per cell, `x + z·W + y·W·L` (same layout as WorldScan). */
  readonly data: Uint32Array;
  /** Absolute positions inside the box, raw chunk NBT unchanged. */
  readonly blockEntities: readonly ChunkBlockEntity[];
  readonly chunks: readonly ChunkSummary[];
  readonly dataVersions: readonly number[];
  readonly unknownCells: number;
  /** Bare-id palette entries completed with 26.3 default states. */
  readonly expandedDefaults: number;
  readonly modDefaultIds: readonly string[];
  readonly warnings: readonly string[];
}

export interface WorldSampleOptions {
  readonly limits?: Partial<WorldSampleLimits>;
  readonly anvil?: AnvilLimits;
  /** Read chunks that are not fully generated anyway (default: treat as unknown). */
  readonly includeIncomplete?: boolean;
  readonly onProgress?: (done: number, total: number) => void;
  readonly signal?: { readonly aborted: boolean };
}

const failLimit = (message: string): never => { throw new FormatError('LIMIT', message); };
const floorDiv = (a: number, b: number) => Math.floor(a / b);

/** Validates a world box and returns its size. */
export function checkWorldBox(box: Bounds, limits: Partial<WorldSampleLimits> = {}): Vec3 {
  const l = { ...WORLD_SAMPLE_LIMITS, ...limits };
  for (const v of [...box.min, ...box.maxExclusive]) if (!Number.isSafeInteger(v)) throw new FormatError('BOX', 'Bereich braucht ganze Koordinaten.');
  const size = [0, 1, 2].map(i => box.maxExclusive[i]! - box.min[i]!) as unknown as Vec3;
  if (size.some(n => n < 1)) throw new FormatError('BOX', 'Bereich ist leer.');
  if (size[0] > l.maxSpan || size[2] > l.maxSpan) failLimit(`Bereich ${size[0]} × ${size[2]} Blöcke; erlaubt sind höchstens ${l.maxSpan} je Richtung.`);
  if (size[1] > l.maxHeight) failLimit(`Bereich ist ${size[1]} Blöcke hoch; erlaubt sind höchstens ${l.maxHeight}.`);
  const volume = size[0] * size[1] * size[2];
  if (volume > l.maxVolume) failLimit(`Bereich umfasst ${volume.toLocaleString('de-DE')} Zellen; erlaubt sind höchstens ${l.maxVolume.toLocaleString('de-DE')}. Bitte kleiner wählen.`);
  const chunks = (floorDiv(box.maxExclusive[0] - 1, 16) - floorDiv(box.min[0], 16) + 1) * (floorDiv(box.maxExclusive[2] - 1, 16) - floorDiv(box.min[2], 16) + 1);
  if (chunks > l.maxChunks) failLimit(`Bereich berührt ${chunks} Chunks; erlaubt sind höchstens ${l.maxChunks}.`);
  return size;
}

/** Chunk coordinates touched by a box, row by row (Z, then X). */
export function chunksOfBox(box: Bounds): { cx: number; cz: number }[] {
  const out: { cx: number; cz: number }[] = [];
  for (let cz = floorDiv(box.min[2], 16); cz <= floorDiv(box.maxExclusive[2] - 1, 16); cz++)
    for (let cx = floorDiv(box.min[0], 16); cx <= floorDiv(box.maxExclusive[0] - 1, 16); cx++) out.push({ cx, cz });
  return out;
}

/** Opens each region file once; header errors make the whole region unreadable. */
class RegionCache {
  private readonly open = new Map<string, Promise<RegionReader | string>>();
  constructor(private readonly files: WorldFiles) {}
  get(rx: number, rz: number): Promise<RegionReader | string> | null {
    const k = regionKey(rx, rz), src = this.files.regions.get(k);
    if (!src) return null;
    let p = this.open.get(k);
    if (!p) { p = RegionReader.open(src, { rx, rz }).catch((e: unknown) => e instanceof Error ? e.message : String(e)); this.open.set(k, p); }
    return p;
  }
}

/** Reads one chunk for an excerpt (shared by the sample and the surface map). */
export async function readExcerptChunk(cache: { get(rx: number, rz: number): Promise<RegionReader | string> | null }, cx: number, cz: number,
  options: Pick<WorldSampleOptions, 'anvil' | 'includeIncomplete'> & { external?: ExternalChunkLookup }): Promise<{ summary: ChunkSummary; chunk: ParsedChunk | null }> {
  const region = cache.get(floorDiv(cx, 32), floorDiv(cz, 32));
  if (!region) return { summary: { cx, cz, state: 'no-region' }, chunk: null };
  const reader = await region;
  if (typeof reader === 'string') return { summary: { cx, cz, state: 'error', message: reader }, chunk: null };
  const r = await reader.chunk(cx, cz, { limits: options.anvil ?? ANVIL_LIMITS, ...(options.external && { external: options.external }) });
  if (r.state === 'missing') return { summary: { cx, cz, state: 'missing' }, chunk: null };
  if (r.state === 'external-missing') return { summary: { cx, cz, state: 'external-missing', timestamp: r.timestamp }, chunk: null };
  if (r.state === 'error') return { summary: { cx, cz, state: 'error', message: r.message }, chunk: null };
  const c = r.chunk, base = { cx, cz, status: c.status, dataVersion: c.dataVersion, compression: r.compression, timestamp: r.timestamp };
  if (!c.complete && !options.includeIncomplete) return { summary: { ...base, state: 'incomplete' }, chunk: null };
  return { summary: { ...base, state: c.complete ? 'ok' : 'incomplete' }, chunk: c };
}

export function createRegionCache(files: WorldFiles): { get(rx: number, rz: number): Promise<RegionReader | string> | null } { return new RegionCache(files); }

/** Reads the box from the given region files into a dense sample. */
export async function sampleWorld(files: WorldFiles, box: Bounds, options: WorldSampleOptions = {}): Promise<WorldSample> {
  const limits = { ...WORLD_SAMPLE_LIMITS, ...options.limits };
  const size = checkWorldBox(box, limits);
  const [W, H, L] = size;
  const data = new Uint32Array(W * H * L); // 0 = unloaded until a chunk fills its columns
  const palette: BlockState[] = [{ id: UNLOADED_STATE, properties: {} }];
  const byKey = new Map<string, number>([[stateKey(palette[0]!), 0]]);
  const indexOf = (s: BlockState) => { const k = stateKey(s); let i = byKey.get(k); if (i === undefined) { i = palette.length; palette.push(s); byKey.set(k, i); } return i; };
  const air = indexOf({ id: 'minecraft:air', properties: {} });
  const cache = createRegionCache(files);
  const chunks: ChunkSummary[] = [], blockEntities: ChunkBlockEntity[] = [];
  const dataVersions = new Set<number>(), modDefaults = new Set<string>();
  let expandedDefaults = 0;
  const list = chunksOfBox(box);
  for (const [n, { cx, cz }] of list.entries()) {
    if (options.signal?.aborted) throw new FormatError('ABORT', 'Weltimport abgebrochen.');
    const { summary, chunk } = await readExcerptChunk(cache, cx, cz, { ...options, ...(files.external && { external: files.external }) });
    chunks.push(summary);
    options.onProgress?.(n + 1, list.length);
    if (!chunk) continue;
    dataVersions.add(chunk.dataVersion); expandedDefaults += chunk.expandedDefaults;
    for (const id of chunk.modDefaultIds) modDefaults.add(id);
    const x0 = Math.max(box.min[0], cx * 16), x1 = Math.min(box.maxExclusive[0], cx * 16 + 16);
    const z0 = Math.max(box.min[2], cz * 16), z1 = Math.min(box.maxExclusive[2], cz * 16 + 16);
    // Per-section palette remap, built lazily.
    const remaps = new Map<number, Uint32Array>();
    for (let y = box.min[1]; y < box.maxExclusive[1]; y++) {
      const sy = floorDiv(y, 16), s = chunk.sections.get(sy), dy = (y - box.min[1]) * W * L;
      let remap: Uint32Array | undefined;
      if (s) { remap = remaps.get(sy); if (!remap) { remap = Uint32Array.from(s.palette, indexOf); remaps.set(sy, remap); } }
      for (let z = z0; z < z1; z++) {
        const row = dy + (z - box.min[2]) * W - box.min[0];
        if (!s) { for (let x = x0; x < x1; x++) data[row + x] = air; continue; }
        if (!s.indices) { const v = remap![0]!; for (let x = x0; x < x1; x++) data[row + x] = v; continue; }
        const base = ((y & 15) << 8) | ((z & 15) << 4);
        for (let x = x0; x < x1; x++) data[row + x] = remap![s.indices[base | (x & 15)]!]!;
      }
    }
    for (const be of chunk.blockEntities) {
      const p = be.position;
      if (p.some((v, i) => v < box.min[i]! || v >= box.maxExclusive[i]!)) continue;
      if (blockEntities.length >= limits.maxBlockEntities) failLimit(`Mehr als ${limits.maxBlockEntities} BlockEntities im Bereich.`);
      blockEntities.push(be);
    }
  }
  let unknownCells = 0;
  for (let i = 0; i < data.length; i++) if (data[i] === 0) unknownCells++;
  const warnings: string[] = [];
  const count = (s: ChunkState) => chunks.filter(c => c.state === s).length;
  if (count('no-region')) warnings.push(`${count('no-region')} Chunks liegen in Regionsdateien, die nicht ausgewählt wurden – dort bleibt das Gelände ungeprüft.`);
  if (count('missing')) warnings.push(`${count('missing')} Chunks wurden in dieser Welt nie erzeugt – Gelände unbekannt.`);
  if (count('incomplete')) warnings.push(options.includeIncomplete ? `${count('incomplete')} Chunks sind nicht fertig generiert und trotzdem gelesen; Gelände kann unvollständig sein.` : `${count('incomplete')} Chunks sind nicht fertig generiert – Gelände unbekannt.`);
  if (count('external-missing')) warnings.push(`${count('external-missing')} sehr große Chunks liegen in .mcc-Dateien, die nicht ausgewählt wurden.`);
  if (count('error')) warnings.push(`${count('error')} Chunks sind unlesbar (Kopie während des Spielens oder beschädigt?).`);
  if (dataVersions.size > 1) warnings.push(`Chunks aus verschiedenen Spielversionen (DataVersion ${[...dataVersions].sort((a, b) => a - b).join(', ')}). Ältere Chunks aktualisiert das Spiel erst beim nächsten Laden.`);
  if (modDefaults.size) warnings.push(`Modblöcke im Standardzustand ohne bekannte Properties: ${[...modDefaults].sort().slice(0, 8).join(', ')}${modDefaults.size > 8 ? ' …' : ''}.`);
  return { box, size, palette, data, blockEntities, chunks, dataVersions: [...dataVersions].sort((a, b) => a - b), unknownCells, expandedDefaults, modDefaultIds: [...modDefaults].sort(), warnings };
}

/** State of a world cell in a sample; null outside the box. */
export function sampleAt(sample: WorldSample, p: Vec3): BlockState | null {
  const [W, H, L] = sample.size, x = p[0] - sample.box.min[0], y = p[1] - sample.box.min[1], z = p[2] - sample.box.min[2];
  if (x < 0 || y < 0 || z < 0 || x >= W || y >= H || z >= L) return null;
  return sample.palette[sample.data[x + z * W + y * W * L]!]!;
}

export interface ExcerptOptions {
  /** 'explicit' keeps air cells (the excerpt clears the space when built); 'none' leaves them unselected. */
  readonly air: 'none' | 'explicit';
  /** Shrink to the bounding box of the non-air blocks. */
  readonly trim: boolean;
  /** Block ids that are left out (e.g. terrain like grass_block when lifting a house). */
  readonly exclude?: ReadonlySet<string>;
}
export interface ExcerptReport {
  readonly box: Bounds;
  /** World coordinate of the payload's local 0/0/0. */
  readonly origin: Vec3;
  readonly size: Vec3;
  readonly blocks: number;
  readonly air: number;
  readonly excluded: number;
  readonly unknown: number;
  readonly blockEntities: number;
  readonly dataVersion: number;
  readonly warnings: readonly string[];
}

/** Dense sample → sparse payload for the library (unknown cells always unselected). */
export function sampleToPayload(sample: WorldSample, options: ExcerptOptions): { payload: VoxelPayload; report: ExcerptReport } {
  const [W, H, L] = sample.size;
  const isAir = sample.palette.map(p => AIR_IDS.has(p.id));
  const isExcluded = sample.palette.map(p => options.exclude?.has(p.id) ?? false);
  let lo: [number, number, number] = [0, 0, 0], hi: [number, number, number] = [W, H, L];
  if (options.trim) {
    lo = [W, H, L]; hi = [0, 0, 0];
    for (let y = 0; y < H; y++) for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) {
      const v = sample.data[x + z * W + y * W * L]!;
      if (v === 0 || isAir[v] || isExcluded[v]) continue;
      if (x < lo[0]) lo[0] = x; if (y < lo[1]) lo[1] = y; if (z < lo[2]) lo[2] = z;
      if (x >= hi[0]) hi[0] = x + 1; if (y >= hi[1]) hi[1] = y + 1; if (z >= hi[2]) hi[2] = z + 1;
    }
    if (hi[0] === 0) throw new FormatError('EMPTY', 'Im Bereich steht kein Block (nur Luft, ausgeschlossene oder unbekannte Zellen).');
  }
  const dims = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]] as const;
  if (dims.some(n => n > EXCERPT_PAYLOAD_LIMITS.maxDimension)) failLimit(`Ausschnitt ${dims.join(' × ')}; für die Bibliothek sind höchstens ${EXCERPT_PAYLOAD_LIMITS.maxDimension} Blöcke je Achse erlaubt.`);
  const palette: BlockState[] = [], remap = new Map<number, number>();
  const cells: Cell[] = [];
  let blocks = 0, air = 0, excluded = 0, unknown = 0;
  for (let y = lo[1]; y < hi[1]; y++) for (let z = lo[2]; z < hi[2]; z++) for (let x = lo[0]; x < hi[0]; x++) {
    const v = sample.data[x + z * W + y * W * L]!;
    if (v === 0) { unknown++; continue; }
    if (isExcluded[v]) { excluded++; continue; }
    if (isAir[v] && options.air === 'none') { air++; continue; }
    let i = remap.get(v);
    if (i === undefined) { i = palette.length; palette.push(sample.palette[v]!); remap.set(v, i); }
    const kind = isAir[v] ? 'air' : 'block';
    if (kind === 'air') air++; else blocks++;
    if (cells.length >= EXCERPT_PAYLOAD_LIMITS.maxCells) failLimit(`Mehr als ${EXCERPT_PAYLOAD_LIMITS.maxCells.toLocaleString('de-DE')} Zellen; bitte den Bereich verkleinern${options.air === 'explicit' ? ' oder Luft weglassen' : ''}.`);
    cells.push({ position: [x - lo[0], y - lo[1], z - lo[2]], kind, paletteIndex: i });
  }
  if (blocks === 0) throw new FormatError('EMPTY', 'Im Bereich steht kein Block (nur Luft, ausgeschlossene oder unbekannte Zellen).');
  const origin: Vec3 = [sample.box.min[0] + lo[0], sample.box.min[1] + lo[1], sample.box.min[2] + lo[2]];
  const placed = new Set(cells.filter(c => c.kind === 'block').map(c => c.position.join(',')));
  const blockEntities: BlockEntity[] = [];
  for (const be of sample.blockEntities) {
    const local: Vec3 = [be.position[0] - origin[0], be.position[1] - origin[1], be.position[2] - origin[2]];
    if (placed.has(local.join(','))) blockEntities.push({ position: local, data: be.data });
  }
  const dataVersion = sample.dataVersions.at(-1) ?? 0;
  const payload = createPayload({
    schemaVersion: 1, profileId: `java:dataversion-${dataVersion}:registry-unverified`,
    bounds: { min: [0, 0, 0], maxExclusive: [dims[0], dims[1], dims[2]] }, pivot: [0, 0, 0], sourceOrigin: origin,
    palette, cells, blockEntities,
  }, { maxCells: EXCERPT_PAYLOAD_LIMITS.maxCells, maxVolume: 256 ** 3, maxPalette: 20_000, maxNbtDepth: 64, maxNbtNodes: 2_000_000 });
  const warnings = [...sample.warnings];
  if (unknown) warnings.push(`${unknown.toLocaleString('de-DE')} Zellen mit unbekanntem Gelände bleiben unausgewählt.`);
  if (excluded) warnings.push(`${excluded.toLocaleString('de-DE')} Blöcke ausgeschlossen (${[...(options.exclude ?? [])].join(', ')}).`);
  if (blockEntities.length) warnings.push(`${blockEntities.length} BlockEntities (Truhen, Schilder …) mit vollständigen Rohdaten übernommen; Weltkoordinaten in den Rohdaten bleiben unverändert, der Export rechnet sie um.`);
  if (sample.expandedDefaults) warnings.push('Blöcke im Standardzustand (in 26.x nur als ID gespeichert) mit den Standardwerten des offiziellen 26.3-Berichts ergänzt.');
  warnings.push('Entities (Tiere, Rahmen, Rüstungsständer) liegen in eigenen Dateien und werden nicht übernommen.');
  return { payload, report: { box: sample.box, origin, size: [dims[0], dims[1], dims[2]], blocks, air, excluded, unknown, blockEntities: blockEntities.length, dataVersion, warnings } };
}

/** Top non-air block per column of one or more regions, for an overview map. */
export interface SurfaceMap {
  /** World X/Z of the map's first column. */
  readonly minX: number; readonly minZ: number;
  readonly width: number; readonly length: number;
  /** Top block Y per column; -32768 where unknown. */
  readonly heights: Int16Array;
  /** Index into `ids` per column; 0 = unknown. */
  readonly blocks: Uint16Array;
  readonly ids: readonly string[];
  readonly chunks: readonly ChunkSummary[];
}
export const SURFACE_UNKNOWN = -32768;
const SURFACE_SKIP = new Set([...AIR_IDS, 'minecraft:light', 'minecraft:structure_void', 'minecraft:barrier']);

/** Surface of all stored chunks in a chunk rectangle (inclusive), e.g. one region = 32 × 32 chunks. */
export async function surfaceMap(files: WorldFiles, chunkMin: { cx: number; cz: number }, chunkMax: { cx: number; cz: number },
  options: Pick<WorldSampleOptions, 'anvil' | 'includeIncomplete' | 'onProgress' | 'signal'> & { readonly maxY?: number } = {}): Promise<SurfaceMap> {
  const cw = chunkMax.cx - chunkMin.cx + 1, cl = chunkMax.cz - chunkMin.cz + 1;
  if (cw < 1 || cl < 1 || cw * cl > 4096) failLimit('Übersicht höchstens 64 × 64 Chunks.');
  const width = cw * 16, length = cl * 16;
  const heights = new Int16Array(width * length).fill(SURFACE_UNKNOWN), blocks = new Uint16Array(width * length);
  const ids: string[] = ['?'], idIndex = new Map<string, number>();
  const cache = createRegionCache(files), chunks: ChunkSummary[] = [];
  let n = 0;
  for (let cz = chunkMin.cz; cz <= chunkMax.cz; cz++) for (let cx = chunkMin.cx; cx <= chunkMax.cx; cx++) {
    if (options.signal?.aborted) throw new FormatError('ABORT', 'Übersicht abgebrochen.');
    // Skip chunks whose region file was not given without counting them as read.
    const { summary, chunk } = await readExcerptChunk(cache, cx, cz, { ...options, ...(files.external && { external: files.external }) });
    options.onProgress?.(++n, cw * cl);
    if (summary.state !== 'no-region') chunks.push(summary);
    if (!chunk) continue;
    const ys = [...chunk.sections.keys()].sort((a, b) => b - a);
    for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) {
      const at = ((cz - chunkMin.cz) * 16 + lz) * width + (cx - chunkMin.cx) * 16 + lx;
      heights[at] = chunk.minSectionY * 16 - 1; blocks[at] = 0;
      search: for (const sy of ys) {
        const s = chunk.sections.get(sy)!;
        if (!s.indices && SURFACE_SKIP.has(s.palette[0]!.id)) continue;
        if (options.maxY !== undefined && sy * 16 > options.maxY) continue;
        for (let ly = 15; ly >= 0; ly--) {
          if (options.maxY !== undefined && sy * 16 + ly > options.maxY) continue;
          const state = chunkBlockAt(chunk, lx, sy * 16 + ly, lz)!;
          if (SURFACE_SKIP.has(state.id)) continue;
          let i = idIndex.get(state.id);
          if (i === undefined) { i = ids.length; ids.push(state.id); idIndex.set(state.id, i); }
          heights[at] = sy * 16 + ly; blocks[at] = i;
          break search;
        }
      }
      if (blocks[at] === 0) heights[at] = SURFACE_UNKNOWN; // empty column (void): nothing to show
    }
  }
  return { minX: chunkMin.cx * 16, minZ: chunkMin.cz * 16, width, length, heights, blocks, ids, chunks };
}

/**
 * Terrain columns of an XZ area (TERRAIN-01): per column the top visible block
 * (`surface`, plants and air skipped, water and leaves count) and the highest
 * ground block (`ground`, decided by the caller's `isGround`, e.g. solid and
 * not part of a tree). Columns of unavailable chunks stay unknown
 * (SURFACE_UNKNOWN, index 0), never "flat" or "empty".
 */
export interface TerrainColumns {
  readonly minX: number; readonly minZ: number;
  readonly width: number; readonly length: number;
  readonly surface: Int16Array; readonly surfaceBlock: Uint16Array;
  readonly ground: Int16Array; readonly groundBlock: Uint16Array;
  /** Block ids; index 0 = unknown. */
  readonly ids: readonly string[];
  readonly chunks: readonly ChunkSummary[];
  readonly dataVersions: readonly number[];
}
export const TERRAIN_COLUMN_LIMIT = 262_144;
export const TERRAIN_SIDE_LIMIT = 512;

export async function terrainColumns(files: WorldFiles, area: { readonly minX: number; readonly minZ: number; readonly width: number; readonly length: number },
  options: Pick<WorldSampleOptions, 'anvil' | 'includeIncomplete' | 'onProgress' | 'signal'> & { readonly isGround: (id: string) => boolean; readonly skip?: ReadonlySet<string>; readonly maxY?: number }): Promise<TerrainColumns> {
  const { minX, minZ, width, length } = area;
  if (![minX, minZ, width, length].every(Number.isSafeInteger) || width < 1 || length < 1) throw new FormatError('BOX', 'Geländebereich braucht ganze Koordinaten und eine Fläche.');
  if (width > TERRAIN_SIDE_LIMIT || length > TERRAIN_SIDE_LIMIT || width * length > TERRAIN_COLUMN_LIMIT) failLimit(`Geländeaufnahme höchstens ${TERRAIN_SIDE_LIMIT} × ${TERRAIN_SIDE_LIMIT} Blöcke (gewählt ${width} × ${length}).`);
  const skip = options.skip ?? SURFACE_SKIP;
  const n = width * length;
  const surface = new Int16Array(n).fill(SURFACE_UNKNOWN), ground = new Int16Array(n).fill(SURFACE_UNKNOWN);
  const surfaceBlock = new Uint16Array(n), groundBlock = new Uint16Array(n);
  const ids: string[] = ['?'], idIndex = new Map<string, number>();
  const idOf = (id: string) => { let i = idIndex.get(id); if (i === undefined) { i = ids.length; ids.push(id); idIndex.set(id, i); } return i; };
  const groundCache = new Map<string, boolean>();
  const isGround = (id: string) => { let g = groundCache.get(id); if (g === undefined) { g = options.isGround(id); groundCache.set(id, g); } return g; };
  const cache = createRegionCache(files), chunks: ChunkSummary[] = [], dataVersions = new Set<number>();
  const list = chunksOfBox({ min: [minX, 0, minZ], maxExclusive: [minX + width, 1, minZ + length] });
  for (const [k, { cx, cz }] of list.entries()) {
    if (options.signal?.aborted) throw new FormatError('ABORT', 'Geländeaufnahme abgebrochen.');
    const { summary, chunk } = await readExcerptChunk(cache, cx, cz, { ...options, ...(files.external && { external: files.external }) });
    chunks.push(summary);
    options.onProgress?.(k + 1, list.length);
    if (!chunk) continue;
    dataVersions.add(chunk.dataVersion);
    const ys = [...chunk.sections.keys()].sort((a, b) => b - a);
    const x0 = Math.max(minX, cx * 16), x1 = Math.min(minX + width, cx * 16 + 16), z0 = Math.max(minZ, cz * 16), z1 = Math.min(minZ + length, cz * 16 + 16);
    for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) {
      const at = (z - minZ) * width + (x - minX);
      // A readable chunk is known: an empty column (void) has neither surface nor ground below the world bottom.
      surface[at] = chunk.minSectionY * 16 - 1; ground[at] = chunk.minSectionY * 16 - 1;
      let haveSurface = false;
      search: for (const sy of ys) {
        const s = chunk.sections.get(sy)!;
        if (options.maxY !== undefined && sy * 16 > options.maxY) continue;
        if (!s.indices && skip.has(s.palette[0]!.id)) continue;
        for (let ly = 15; ly >= 0; ly--) {
          const y = sy * 16 + ly;
          if (options.maxY !== undefined && y > options.maxY) continue;
          const id = chunkBlockAt(chunk, x & 15, y, z & 15)!.id;
          if (skip.has(id)) continue;
          if (!haveSurface) { surface[at] = y; surfaceBlock[at] = idOf(id); haveSurface = true; }
          if (isGround(id)) { ground[at] = y; groundBlock[at] = idOf(id); break search; }
        }
      }
    }
  }
  return { minX, minZ, width, length, surface, surfaceBlock, ground, groundBlock, ids, chunks, dataVersions: [...dataVersions].sort((a, b) => a - b) };
}
