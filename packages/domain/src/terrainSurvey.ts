import type { OriginalFile } from './backup.js';
import { sha256Hex } from './hash.js';
import { FLUID_IDS } from './terrain.js';
import { DomainError } from './types.js';

/**
 * Geländeaufnahme (TERRAIN-01): a stored height map of an area of the
 * player's own world, read once from the region files (WORLD-IMPORT-01) and
 * then used without the files: the world map draws it, Anlagen are fitted to
 * it, the world map estimates foundations from it.
 *
 * Per column it keeps the top visible block (`surface`: water and leaves
 * count, plants and air do not) and the highest ground block (`ground`: solid,
 * not part of a tree; terrain.ts `isGroundId`). Unknown columns (chunk not
 * read) keep SURVEY_UNKNOWN and are never treated as flat.
 *
 * The bytes live in the repository's original store (content addressed,
 * included in backups); the project only keeps a small reference
 * (`project.terrain`, operation `terrain.set`). A survey is 2.5D: caves,
 * overhangs and the inside of the ground are not part of it. Exact checks
 * stay with the terrain tab (checkTerrain over the region files).
 */

export const SURVEY_SCHEMA_VERSION = 1;
export const SURVEY_UNKNOWN = -32768;
export const SURVEY_MAX_SIDE = 512;
export const SURVEY_MAX_COLUMNS = 262_144;
export const SURVEY_MEDIA_TYPE = 'application/x-bauplaner-terrain';
const MAGIC = 'BPTERR01';
const DIMENSION_ID = /^[a-z0-9_.-]{1,64}:[a-z0-9_./-]{1,128}$/;
const SHA = /^[a-f0-9]{64}$/;

export interface SurveyArea { readonly minX: number; readonly minZ: number; readonly width: number; readonly length: number }

export interface TerrainSurvey extends SurveyArea {
  readonly schemaVersion: 1;
  readonly dimension: string;
  /** World Y of the top visible block per column (`x + z·width`); SURVEY_UNKNOWN where unknown. */
  readonly surface: Int16Array;
  readonly surfaceBlock: Uint16Array;
  /** World Y of the highest ground block; below the world bottom where there is none (void). */
  readonly ground: Int16Array;
  readonly groundBlock: Uint16Array;
  /** Block ids; index 0 = unknown / none. */
  readonly ids: readonly string[];
  readonly readAt: string;
  /** Newest chunk save of the read chunks, seconds since epoch (0 = unknown). */
  readonly newestChunkSave: number;
  readonly dataVersions: readonly number[];
  readonly regions: readonly string[];
}

/** What a project stores about its survey; the bytes are an original file. */
export interface ProjectTerrainReference {
  readonly schemaVersion: 1;
  readonly sha256: string;
  readonly fileName: string;
  readonly dimension: string;
  readonly area: SurveyArea;
  readonly readAt: string;
  /** Columns with known terrain. */
  readonly known: number;
  /** Lowest and highest ground of the known columns. */
  readonly groundRange: readonly [number, number] | null;
}

const fail = (message: string): never => { throw new DomainError('TERRAIN', `Geländeaufnahme: ${message}`); };
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

export function checkSurveyArea(raw: unknown): SurveyArea {
  if (!isObj(raw)) return fail('Bereich fehlt');
  const { minX, minZ, width, length } = raw;
  if (!isInt(minX, -30_000_000, 30_000_000) || !isInt(minZ, -30_000_000, 30_000_000)) fail('Ecke muss ganzzahlig in der Welt liegen');
  if (!isInt(width, 1, SURVEY_MAX_SIDE) || !isInt(length, 1, SURVEY_MAX_SIDE)) fail(`Breite und Länge 1–${SURVEY_MAX_SIDE} Blöcke`);
  if ((width as number) * (length as number) > SURVEY_MAX_COLUMNS) fail(`höchstens ${SURVEY_MAX_COLUMNS.toLocaleString('de-DE')} Spalten`);
  return { minX: minX as number, minZ: minZ as number, width: width as number, length: length as number };
}

/** Validates a stored reference (operation input and backup restore). */
export function checkTerrainReference(raw: unknown): ProjectTerrainReference {
  if (!isObj(raw)) return fail('kein Objekt');
  if (raw.schemaVersion !== SURVEY_SCHEMA_VERSION) fail(`unbekannte Schemaversion ${String(raw.schemaVersion)}`);
  if (typeof raw.sha256 !== 'string' || !SHA.test(raw.sha256)) fail('ungültiger Hash');
  if (typeof raw.fileName !== 'string' || !raw.fileName.trim() || raw.fileName.length > 255 || /[\x00-\x1f]/.test(raw.fileName)) fail('ungültiger Dateiname');
  if (typeof raw.dimension !== 'string' || !DIMENSION_ID.test(raw.dimension)) fail('Dimension muss eine ID wie minecraft:overworld sein');
  const area = checkSurveyArea(raw.area);
  if (typeof raw.readAt !== 'string' || !Number.isFinite(Date.parse(raw.readAt))) fail('ungültige Lesezeit');
  if (!isInt(raw.known, 0, area.width * area.length)) fail('ungültige Anzahl bekannter Spalten');
  if (raw.groundRange !== null && !(Array.isArray(raw.groundRange) && raw.groundRange.length === 2 && raw.groundRange.every(n => isInt(n, -32767, 32767)) && raw.groundRange[0] <= raw.groundRange[1])) fail('ungültiger Höhenbereich');
  return raw as unknown as ProjectTerrainReference;
}

// ------------------------------------------------------------------ build, encode, decode

export interface SurveyColumnsInput extends SurveyArea {
  readonly surface: Int16Array; readonly surfaceBlock: Uint16Array;
  readonly ground: Int16Array; readonly groundBlock: Uint16Array;
  readonly ids: readonly string[];
}

/** Survey from the worker's column scan (packages/formats terrainColumns). */
export function createSurvey(columns: SurveyColumnsInput, meta: { dimension: string; readAt?: string; newestChunkSave?: number; dataVersions?: readonly number[]; regions?: readonly string[] }): TerrainSurvey {
  const area = checkSurveyArea(columns);
  const n = area.width * area.length;
  if (columns.surface.length !== n || columns.surfaceBlock.length !== n || columns.ground.length !== n || columns.groundBlock.length !== n) fail('Spaltenzahl passt nicht zum Bereich');
  if (!DIMENSION_ID.test(meta.dimension)) fail('Dimension muss eine ID wie minecraft:overworld sein');
  if (!columns.ids.length || columns.ids.length > 65_535) fail('ungültige Blockliste');
  for (const a of [columns.surfaceBlock, columns.groundBlock]) for (let i = 0; i < n; i++) if (a[i]! >= columns.ids.length) fail('Blockindex außerhalb der Liste');
  return {
    schemaVersion: SURVEY_SCHEMA_VERSION, dimension: meta.dimension, ...area,
    surface: columns.surface, surfaceBlock: columns.surfaceBlock, ground: columns.ground, groundBlock: columns.groundBlock, ids: [...columns.ids],
    readAt: meta.readAt ?? new Date().toISOString(), newestChunkSave: meta.newestChunkSave ?? 0,
    dataVersions: [...(meta.dataVersions ?? [])], regions: [...(meta.regions ?? [])].sort(),
  };
}

/**
 * Binary file: "BPTERR01", uint32 LE header length, header JSON (UTF-8),
 * zero padding to an even offset, then surface, surfaceBlock, ground,
 * groundBlock as little-endian 16-bit arrays.
 */
export function encodeSurvey(s: TerrainSurvey): Uint8Array {
  const header = new TextEncoder().encode(JSON.stringify({ schemaVersion: s.schemaVersion, dimension: s.dimension, minX: s.minX, minZ: s.minZ, width: s.width, length: s.length,
    ids: s.ids, readAt: s.readAt, newestChunkSave: s.newestChunkSave, dataVersions: s.dataVersions, regions: s.regions }));
  const start = 12 + header.length + ((12 + header.length) % 2), n = s.width * s.length;
  const out = new Uint8Array(start + n * 8), view = new DataView(out.buffer);
  out.set(new TextEncoder().encode(MAGIC), 0);
  view.setUint32(8, header.length, true);
  out.set(header, 12);
  const arrays = [s.surface, s.surfaceBlock, s.ground, s.groundBlock];
  arrays.forEach((a, k) => {
    const base = start + k * n * 2;
    if (a instanceof Int16Array) for (let i = 0; i < n; i++) view.setInt16(base + i * 2, a[i]!, true);
    else for (let i = 0; i < n; i++) view.setUint16(base + i * 2, a[i]!, true);
  });
  return out;
}

export function decodeSurvey(bytes: Uint8Array): TerrainSurvey {
  if (bytes.length < 12 || new TextDecoder().decode(bytes.subarray(0, 8)) !== MAGIC) fail('keine Bauplaner-Geländedatei');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const len = view.getUint32(8, true);
  if (12 + len > bytes.length) fail('Kopf abgeschnitten');
  let h: Record<string, unknown>;
  try { h = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(12, 12 + len))) as Record<string, unknown>; } catch { return fail('Kopf unlesbar'); }
  if (!isObj(h) || h.schemaVersion !== SURVEY_SCHEMA_VERSION) fail('unbekannte Schemaversion');
  const area = checkSurveyArea(h);
  const n = area.width * area.length, start = 12 + len + ((12 + len) % 2);
  if (bytes.length !== start + n * 8) fail('Datengröße passt nicht zum Bereich');
  if (!Array.isArray(h.ids) || !h.ids.every(i => typeof i === 'string')) fail('ungültige Blockliste');
  const read16 = (k: number, signed: boolean) => {
    const a = signed ? new Int16Array(n) : new Uint16Array(n), base = start + k * n * 2;
    for (let i = 0; i < n; i++) a[i] = signed ? view.getInt16(base + i * 2, true) : view.getUint16(base + i * 2, true);
    return a;
  };
  return createSurvey({ ...area, surface: read16(0, true) as Int16Array, surfaceBlock: read16(1, false) as Uint16Array, ground: read16(2, true) as Int16Array, groundBlock: read16(3, false) as Uint16Array, ids: h.ids as string[] },
    { dimension: String(h.dimension), readAt: String(h.readAt), newestChunkSave: Number(h.newestChunkSave) || 0, dataVersions: Array.isArray(h.dataVersions) ? h.dataVersions.filter(Number.isInteger) as number[] : [], regions: Array.isArray(h.regions) ? h.regions.map(String) : [] });
}

/** Known columns and ground range of a survey. */
export function surveyStats(s: TerrainSurvey): { known: number; groundRange: [number, number] | null; surfaceRange: [number, number] | null } {
  let known = 0, gLo = Infinity, gHi = -Infinity, sLo = Infinity, sHi = -Infinity;
  for (let i = 0; i < s.surface.length; i++) {
    if (s.surface[i] === SURVEY_UNKNOWN) continue;
    known++;
    if (s.groundBlock[i]) { gLo = Math.min(gLo, s.ground[i]!); gHi = Math.max(gHi, s.ground[i]!); }
    if (s.surfaceBlock[i]) { sLo = Math.min(sLo, s.surface[i]!); sHi = Math.max(sHi, s.surface[i]!); }
  }
  return { known, groundRange: Number.isFinite(gLo) ? [gLo, gHi] : null, surfaceRange: Number.isFinite(sLo) ? [sLo, sHi] : null };
}

/** File, content address and project reference of a survey. */
export async function surveyFile(s: TerrainSurvey, name = 'gelaende'): Promise<{ original: OriginalFile; reference: ProjectTerrainReference }> {
  const bytes = encodeSurvey(s), sha256 = await sha256Hex(bytes), stats = surveyStats(s);
  const fileName = `${name.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 60) || 'gelaende'}_${s.minX}_${s.minZ}.bpterrain`;
  const original: OriginalFile = { sha256, fileName, mediaType: SURVEY_MEDIA_TYPE, size: bytes.byteLength, createdAt: s.readAt, bytes };
  const reference = checkTerrainReference({ schemaVersion: SURVEY_SCHEMA_VERSION, sha256, fileName, dimension: s.dimension, area: { minX: s.minX, minZ: s.minZ, width: s.width, length: s.length },
    readAt: s.readAt, known: stats.known, groundRange: stats.groundRange });
  return { original, reference };
}

// ------------------------------------------------------------------ lookups

export interface SurveyColumn {
  readonly ground: number;
  readonly surface: number;
  readonly groundId: string;
  readonly surfaceId: string;
  /** The top visible block is water/lava (over the ground). */
  readonly fluid: boolean;
}

/** Column at a world position; null outside the survey or unknown. */
export function columnAt(s: TerrainSurvey, x: number, z: number): SurveyColumn | null {
  const gx = x - s.minX, gz = z - s.minZ;
  if (gx < 0 || gz < 0 || gx >= s.width || gz >= s.length) return null;
  const i = gx + gz * s.width;
  if (s.surface[i] === SURVEY_UNKNOWN) return null;
  const surfaceId = s.ids[s.surfaceBlock[i]!] ?? '?';
  return { ground: s.ground[i]!, surface: s.surface[i]!, groundId: s.ids[s.groundBlock[i]!] ?? '?', surfaceId, fluid: FLUID_IDS.has(surfaceId) };
}

/** Whether a world XZ rectangle lies inside the survey area. */
export const surveyCovers = (s: SurveyArea, x0: number, z0: number, x1: number, z1: number): boolean =>
  x0 >= s.minX && z0 >= s.minZ && x1 <= s.minX + s.width && z1 <= s.minZ + s.length;

// ------------------------------------------------------------------ earthwork estimate

/** Lowest planned block of one column, world coordinates. */
export interface ColumnBase { readonly x: number; readonly z: number; readonly y: number }

export interface EarthworkEstimate {
  readonly columns: number;
  readonly unknown: number;
  /** Lowest planned block layer (world Y); null without columns. */
  readonly baseY: number | null;
  /** Base columns standing directly on ground. */
  readonly carried: number;
  /** Base columns over a gap (air, plants or water above the ground). */
  readonly hanging: number;
  /** Blocks to fill under hanging base columns down to the ground. */
  readonly fill: number;
  readonly maxGap: number;
  /** Columns whose ground reaches into the planned blocks. */
  readonly buried: number;
  /** Ground blocks to dig out above the lowest planned block of each column. */
  readonly cut: number;
  readonly maxCut: number;
  /** Columns whose surface is water or lava at or above the lowest planned block. */
  readonly water: number;
  readonly ground: { readonly min: number; readonly max: number; readonly median: number } | null;
  /** Y shift that puts the base layer onto the median ground (0 = already there); null without known ground. */
  readonly suggestedShift: number | null;
}

/**
 * Estimates foundations and earthwork of planned columns against a survey.
 * Base columns (lowest block on the base layer, `isBase`, default: the lowest
 * layer of all columns) can hang; any column can be buried. Upper columns
 * (overhangs, upper storeys) are carried by the building itself.
 */
export function estimateEarthwork(columns: Iterable<ColumnBase>, s: TerrainSurvey, isBase?: (c: ColumnBase, baseY: number) => boolean): EarthworkEstimate {
  const list = [...columns];
  let baseY = Infinity;
  for (const c of list) baseY = Math.min(baseY, c.y);
  const base = isBase ?? ((c: ColumnBase, b: number) => c.y === b);
  let unknown = 0, carried = 0, hanging = 0, fill = 0, maxGap = 0, buried = 0, cut = 0, maxCut = 0, water = 0;
  const heights: number[] = [];
  for (const c of list) {
    const col = columnAt(s, c.x, c.z);
    if (!col) { unknown++; continue; }
    const g = col.ground;
    if (col.groundId !== '?') heights.push(g);
    if (col.fluid && col.surface >= c.y - 1) water++;
    if (g >= c.y) { buried++; const d = g - c.y + 1; cut += d; maxCut = Math.max(maxCut, d); }
    else if (base(c, baseY)) {
      const gap = c.y - 1 - g;
      if (gap <= 0) carried++;
      else { hanging++; fill += gap; maxGap = Math.max(maxGap, gap); }
    }
  }
  heights.sort((a, b) => a - b);
  const ground = heights.length ? { min: heights[0]!, max: heights.at(-1)!, median: heights[Math.floor(heights.length / 2)]! } : null;
  return { columns: list.length, unknown, baseY: Number.isFinite(baseY) ? baseY : null, carried, hanging, fill, maxGap, buried, cut, maxCut, water, ground,
    suggestedShift: ground && Number.isFinite(baseY) ? ground.median + 1 - baseY : null };
}

/** Lowest planned block per XZ column of cells (any coordinates), as ColumnBase list. */
export function columnBases(cells: Iterable<{ readonly position: readonly [number, number, number] | readonly number[]; readonly kind: string }>, shift: readonly [number, number, number] = [0, 0, 0]): ColumnBase[] {
  const low = new Map<number, Map<number, number>>();
  for (const c of cells) {
    if (c.kind !== 'block') continue;
    const x = c.position[0]! + shift[0], y = c.position[1]! + shift[1], z = c.position[2]! + shift[2];
    let row = low.get(x); if (!row) { row = new Map(); low.set(x, row); }
    const before = row.get(z);
    if (before === undefined || y < before) row.set(z, y);
  }
  const out: ColumnBase[] = [];
  for (const [x, row] of low) for (const [z, y] of row) out.push({ x, z, y });
  return out;
}

export const EARTHWORK_NOTE = 'Schätzung aus der Geländeaufnahme (Höhenkarte): Höhlen, Überhänge und Blöcke im Boden sind nicht enthalten. Blockgenau prüft der Projektreiter „Gelände“ mit den Regionsdateien.';

// ------------------------------------------------------------------ display

export interface SurveyDisplay {
  /** Block ids of the display cells (index = paletteIndex offset by the caller). */
  readonly ids: readonly string[];
  /** x, y, z, id index quadruples. */
  readonly cells: Int32Array;
  readonly count: number;
  /** Surveys left out because the budget was reached. */
  readonly skipped: number;
}

/**
 * Display cells of surveys for a 3D view: per known column the top block of
 * the ground (water and lava where they lie on top; tree tops are left out so
 * the ground stays visible), plus up to `skirt` blocks down to the lowest
 * neighbour so slopes and cliffs read as closed terrain. `occupied` drops
 * cells where a planned block stands. Display data only, never a blueprint.
 */
export function surveyDisplayCells(surveys: readonly TerrainSurvey[], options: { maxCells: number; skirt?: number; occupied?: (x: number, y: number, z: number) => boolean }): SurveyDisplay {
  const skirt = options.skirt ?? 4;
  const ids: string[] = [], idIndex = new Map<string, number>();
  const idOf = (id: string) => { let i = idIndex.get(id); if (i === undefined) { i = ids.length; ids.push(id); idIndex.set(id, i); } return i; };
  let out = new Int32Array(4 * 1024), count = 0, skipped = 0;
  const push = (x: number, y: number, z: number, id: number) => {
    if (count * 4 + 4 > out.length) { const next = new Int32Array(out.length * 2); next.set(out); out = next; }
    out[count * 4] = x; out[count * 4 + 1] = y; out[count * 4 + 2] = z; out[count * 4 + 3] = id; count++;
  };
  const seen = new Set<string>();
  for (const s of surveys) {
    const key = `${s.minX},${s.minZ},${s.width},${s.length}:${s.readAt}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const n = s.width * s.length;
    const top = new Int16Array(n).fill(SURVEY_UNKNOWN), block = new Int32Array(n).fill(-1);
    let known = 0;
    for (let i = 0; i < n; i++) {
      if (s.surface[i] === SURVEY_UNKNOWN) continue;
      const surfaceId = s.ids[s.surfaceBlock[i]!] ?? '?';
      const fluid = FLUID_IDS.has(surfaceId);
      const y = fluid ? s.surface[i]! : s.ground[i]!, id = fluid ? surfaceId : s.ids[s.groundBlock[i]!] ?? '?';
      if (id === '?') continue;
      top[i] = y; block[i] = idOf(id); known++;
    }
    if (count + known * 2 > options.maxCells) { skipped++; continue; }
    const start = count;
    for (let z = 0; z < s.length; z++) for (let x = 0; x < s.width; x++) {
      const i = x + z * s.width, y = top[i]!;
      if (y === SURVEY_UNKNOWN) continue;
      let low = y;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx, nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= s.width || nz >= s.length) continue;
        const ny = top[nx + nz * s.width]!;
        if (ny !== SURVEY_UNKNOWN && ny < low) low = ny;
      }
      const wx = s.minX + x, wz = s.minZ + z;
      for (let yy = y; yy >= Math.min(y, Math.max(low + 1, y - skirt)); yy--) {
        if (options.occupied?.(wx, yy, wz)) continue;
        push(wx, yy, wz, block[i]!);
      }
      if (count > options.maxCells) { count = start; skipped++; break; }
    }
  }
  return { ids, cells: out.subarray(0, count * 4), count, skipped };
}
