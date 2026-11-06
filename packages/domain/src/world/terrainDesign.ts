import type { BlockState, Cell, VoxelPayload } from '../../../voxel/src/types.js';
import { createPayload } from '../../../voxel/src/validation.js';
import { completeState } from '../../../voxel/src/blocklogic/facts.js';
import type { OriginalFile } from '../data/backup.js';
import { sha256Hex } from '../core/hash.js';
import { checkSurveyArea, createSurvey, SURVEY_UNKNOWN } from './terrainSurvey.js';
import { SURFACE_SKIP_IDS } from './terrain.js';
import type { ColumnBase, SurveyArea, TerrainSurvey } from './terrainSurvey.js';
import { DomainError } from '../core/types.js';
import { checkScatterPlan, cloneScatter } from './terrainScatterPlan.js';
import type { ScatterPlan } from './terrainScatterPlan.js';
import { stableCos, stableHypot } from '../../../voxel/src/stableMath.js';

/**
 * Geländegestaltung (TERRAIN-02): a planned terrain on top of a Geländeaufnahme
 * (TERRAIN-01) or on flat ground. Per column it keeps the planned ground height,
 * the top block and the filler underneath, a water surface and whether the
 * column belongs to a path. Brushes shape heights (raise, lower, smooth,
 * flatten, roughen, terraces, soften slopes), styles paint the surface like
 * biomes, water is filled from a point, paths follow the ground with at most
 * one block per step.
 *
 * The design never changes the world or the survey. It is compared with its
 * base (cut, fill, water, materials), handed to the world map and the Anlagen
 * planner as a planned survey (`designedSurvey`) and turned into real blocks
 * (`designPayload`, explicit air for removed ground) that can be saved as a
 * Bauteil, placed in the project, exported and built with the mod.
 */

export const DESIGN_SCHEMA_VERSION = 1;
export const DESIGN_MEDIA_TYPE = 'application/x-bauplaner-terrain-design';
/** No water on a column. */
export const NO_WATER = -32768;
const MAGIC = 'BPTDES01';
const DIMENSION_ID = /^[a-z0-9_.-]{1,64}:[a-z0-9_./-]{1,128}$/;
const SHA = /^[a-f0-9]{64}$/;
const WATER_ID = 'minecraft:water';

export type DesignBase = { readonly kind: 'survey'; readonly sha256: string } | { readonly kind: 'flat'; readonly y: number };

/** Working state of a design. Arrays are indexed `x + z·width` and mutated in place by the tools. */
export interface TerrainDesign extends SurveyArea {
  readonly schemaVersion: 1;
  readonly dimension: string;
  readonly base: DesignBase;
  /** Planned ground Y; SURVEY_UNKNOWN for columns without known terrain (never edited). */
  readonly height: Int16Array;
  /** Palette index of the top block. */
  readonly top: Uint16Array;
  /** Palette index of the filler under the top (used where ground is raised). */
  readonly fill: Uint16Array;
  /** Water surface Y, NO_WATER without water. */
  readonly water: Int16Array;
  /**
   * 0 = no path, 1 = path column; TERRAIN-03 path pieces on top of the column:
   * 2…5 stair rising to north/east/south/west (`PATH_STAIR + dir`), 6 slab step,
   * 7 bridge deck (one block over the water), 8 deck with railing.
   */
  readonly path: Uint8Array;
  /** TERRAIN-03: palette index of the stair, slab or deck block of a path piece (0 = none). */
  readonly step: Uint16Array;
  /** Block id palette; index 0 is reserved (unknown). Tools append. */
  readonly ids: string[];
  updatedAt: string;
  /** Streu-Ebene (S06): Natur-Bauteile on the planned ground; see terrainScatter.ts. */
  scatter?: ScatterPlan;
}

/** What a project stores about its design; the bytes are an original file. */
export interface ProjectTerrainDesignReference {
  readonly schemaVersion: 1;
  readonly sha256: string;
  readonly fileName: string;
  readonly dimension: string;
  readonly area: SurveyArea;
  readonly base: DesignBase;
  readonly updatedAt: string;
  /** Columns that differ from the base, at the time of saving. */
  readonly changed: number;
}

const fail = (message: string): never => { throw new DomainError('TERRAIN_DESIGN', `Geländegestaltung: ${message}`); };
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const ns = (id: string) => id.includes(':') ? id : `minecraft:${id}`;

function checkBase(raw: unknown): DesignBase {
  if (!isObj(raw)) return fail('Grundlage fehlt');
  if (raw.kind === 'survey' && typeof raw.sha256 === 'string' && SHA.test(raw.sha256)) return { kind: 'survey', sha256: raw.sha256 };
  if (raw.kind === 'flat' && isInt(raw.y, -2032, 2031)) return { kind: 'flat', y: raw.y as number };
  return fail('ungültige Grundlage');
}

export function checkTerrainDesignReference(raw: unknown): ProjectTerrainDesignReference {
  if (!isObj(raw)) return fail('kein Objekt');
  if (raw.schemaVersion !== DESIGN_SCHEMA_VERSION) fail(`unbekannte Schemaversion ${String(raw.schemaVersion)}`);
  if (typeof raw.sha256 !== 'string' || !SHA.test(raw.sha256)) fail('ungültiger Hash');
  if (typeof raw.fileName !== 'string' || !raw.fileName.trim() || raw.fileName.length > 255 || /[\x00-\x1f]/.test(raw.fileName)) fail('ungültiger Dateiname');
  if (typeof raw.dimension !== 'string' || !DIMENSION_ID.test(raw.dimension)) fail('Dimension muss eine ID wie minecraft:overworld sein');
  const area = checkSurveyArea(raw.area);
  checkBase(raw.base);
  if (typeof raw.updatedAt !== 'string' || !Number.isFinite(Date.parse(raw.updatedAt))) fail('ungültige Änderungszeit');
  if (!isInt(raw.changed, 0, area.width * area.length)) fail('ungültige Anzahl geänderter Spalten');
  return raw as unknown as ProjectTerrainDesignReference;
}

/** Build height range of a dimension (vanilla 26.3; data packs can differ). */
export function heightLimits(dimension: string): [number, number] {
  return dimension === 'minecraft:overworld' ? [-64, 319] : [0, 255];
}

// ------------------------------------------------------------------ surface styles

/** A surface style paints like a biome: weighted top blocks (deterministic per column) and a filler. */
export interface SurfaceStyle {
  readonly id: string;
  readonly label: string;
  readonly top: readonly (readonly [string, number])[];
  readonly fill: string;
  /** Paths only. */
  readonly path?: boolean;
}

export const SURFACE_STYLES: readonly SurfaceStyle[] = [
  { id: 'wiese', label: 'Wiese', top: [['minecraft:grass_block', 1]], fill: 'minecraft:dirt' },
  { id: 'wald', label: 'Waldboden', top: [['minecraft:podzol', 0.45], ['minecraft:grass_block', 0.35], ['minecraft:coarse_dirt', 0.2]], fill: 'minecraft:dirt' },
  { id: 'moos', label: 'Moos', top: [['minecraft:moss_block', 0.7], ['minecraft:grass_block', 0.3]], fill: 'minecraft:dirt' },
  { id: 'sumpf', label: 'Sumpf', top: [['minecraft:mud', 0.5], ['minecraft:grass_block', 0.3], ['minecraft:moss_block', 0.2]], fill: 'minecraft:dirt' },
  { id: 'strand', label: 'Strand', top: [['minecraft:sand', 1]], fill: 'minecraft:sand' },
  { id: 'wueste', label: 'Wüste', top: [['minecraft:sand', 0.9], ['minecraft:red_sand', 0.1]], fill: 'minecraft:sandstone' },
  { id: 'fels', label: 'Fels', top: [['minecraft:stone', 0.7], ['minecraft:andesite', 0.2], ['minecraft:cobblestone', 0.1]], fill: 'minecraft:stone' },
  { id: 'geroell', label: 'Geröll', top: [['minecraft:gravel', 0.6], ['minecraft:stone', 0.25], ['minecraft:cobblestone', 0.15]], fill: 'minecraft:stone' },
  { id: 'schnee', label: 'Schnee', top: [['minecraft:snow_block', 1]], fill: 'minecraft:dirt' },
  { id: 'lehm', label: 'Lehm', top: [['minecraft:clay', 0.6], ['minecraft:packed_mud', 0.4]], fill: 'minecraft:dirt' },
  { id: 'pfad', label: 'Trampelpfad', top: [['minecraft:dirt_path', 0.85], ['minecraft:coarse_dirt', 0.15]], fill: 'minecraft:dirt', path: true },
  { id: 'kiesweg', label: 'Kiesweg', top: [['minecraft:gravel', 1]], fill: 'minecraft:dirt', path: true },
  { id: 'pflaster', label: 'Pflaster', top: [['minecraft:cobblestone', 0.6], ['minecraft:mossy_cobblestone', 0.2], ['minecraft:stone', 0.2]], fill: 'minecraft:stone', path: true },
  { id: 'steinweg', label: 'Steinweg', top: [['minecraft:stone_bricks', 0.7], ['minecraft:cracked_stone_bricks', 0.15], ['minecraft:mossy_stone_bricks', 0.15]], fill: 'minecraft:stone', path: true },
  { id: 'asphalt', label: 'Asphalt', top: [['minecraft:gray_concrete', 0.85], ['minecraft:light_gray_concrete', 0.15]], fill: 'minecraft:stone', path: true },
];
export const styleById = (id: string): SurfaceStyle => SURFACE_STYLES.find(s => s.id === id) ?? fail(`unbekannter Stil ${id}`);

/** Filler under a top block when ground is raised. */
export function fillerFor(top: string): string {
  const id = ns(top);
  if (/(grass_block|podzol|mycelium|dirt_path|moss_block|coarse_dirt|rooted_dirt|farmland|mud|clay|snow_block|packed_mud)$/.test(id)) return 'minecraft:dirt';
  if (id === 'minecraft:sand') return 'minecraft:sand';
  if (id === 'minecraft:red_sand') return 'minecraft:red_sand';
  if (id === 'minecraft:gravel') return 'minecraft:gravel';
  if (/(netherrack|crimson_nylium|warped_nylium)$/.test(id)) return 'minecraft:netherrack';
  if (/(soul_sand|soul_soil)$/.test(id)) return 'minecraft:soul_soil';
  if (/end_stone$/.test(id)) return 'minecraft:end_stone';
  if (/(stone|andesite|diorite|granite|tuff|deepslate|calcite|cobblestone)$/.test(id)) return id;
  return 'minecraft:dirt';
}

/** Deterministic 0…1 hash of a column (styles and roughness never depend on randomness). */
export function columnHash(x: number, z: number, seed = 0): number {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(z | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4_294_967_296;
}

/** Smooth value noise in 0…1 (cell size `scale` blocks). */
export function valueNoise(x: number, z: number, scale: number, seed = 0): number {
  const fx = x / scale, fz = z / scale, x0 = Math.floor(fx), z0 = Math.floor(fz), tx = fx - x0, tz = fz - z0;
  const s = (t: number) => t * t * (3 - 2 * t);
  const a = columnHash(x0, z0, seed), b = columnHash(x0 + 1, z0, seed), c = columnHash(x0, z0 + 1, seed), d = columnHash(x0 + 1, z0 + 1, seed);
  const u = s(tx), v = s(tz);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

const pickTop = (style: SurfaceStyle, x: number, z: number): string => {
  let r = columnHash(x, z, 7) * style.top.reduce((n, [, w]) => n + w, 0);
  for (const [id, w] of style.top) { if (r < w) return id; r -= w; }
  return style.top.at(-1)![0];
};

const idIndex = (d: TerrainDesign, id: string): number => {
  let i = d.ids.indexOf(id);
  if (i < 0) { if (d.ids.length >= 65_535) fail('zu viele Blockarten'); i = d.ids.length; d.ids.push(id); }
  return i;
};

// ------------------------------------------------------------------ create

/** A flat survey (no world data): grass on `y` everywhere. Base of a design without Geländeaufnahme. */
export function flatSurvey(area: SurveyArea, y: number, dimension: string): TerrainSurvey {
  const a = checkSurveyArea(area), n = a.width * a.length;
  return createSurvey({ ...a, surface: new Int16Array(n).fill(y), ground: new Int16Array(n).fill(y), surfaceBlock: new Uint16Array(n).fill(1), groundBlock: new Uint16Array(n).fill(1),
    ids: ['', 'minecraft:grass_block'] }, { dimension, readAt: '1970-01-01T00:00:00.000Z' });
}

/** Starts a design from its base: planned = measured. */
export function designFromSurvey(s: TerrainSurvey, base: DesignBase): TerrainDesign {
  const n = s.width * s.length;
  const d: TerrainDesign = { schemaVersion: DESIGN_SCHEMA_VERSION, dimension: s.dimension, base, minX: s.minX, minZ: s.minZ, width: s.width, length: s.length,
    height: new Int16Array(n).fill(SURVEY_UNKNOWN), top: new Uint16Array(n), fill: new Uint16Array(n), water: new Int16Array(n).fill(NO_WATER), path: new Uint8Array(n),
    step: new Uint16Array(n), ids: [''], updatedAt: new Date().toISOString() };
  for (let i = 0; i < n; i++) {
    if (s.surface[i] === SURVEY_UNKNOWN || !s.groundBlock[i]) continue;
    const top = s.ids[s.groundBlock[i]!]!;
    d.height[i] = s.ground[i]!;
    d.top[i] = idIndex(d, top);
    d.fill[i] = idIndex(d, fillerFor(top));
    if (s.ids[s.surfaceBlock[i]!] === WATER_ID && s.surface[i]! > s.ground[i]!) d.water[i] = s.surface[i]!;
  }
  return d;
}

export function cloneDesign(d: TerrainDesign): TerrainDesign {
  return { ...d, height: d.height.slice(), top: d.top.slice(), fill: d.fill.slice(), water: d.water.slice(), path: d.path.slice(), step: d.step.slice(), ids: [...d.ids], ...(d.scatter && { scatter: cloneScatter(d.scatter) }) };
}

// ------------------------------------------------------------------ file

/**
 * Binary file: "BPTDES01", uint32 LE header length, header JSON, padding to even, then height, top, fill, water (16 bit LE) and path (8 bit).
 * TERRAIN-03: with path pieces the header says `steps: true` and the step blocks follow as a fifth 16-bit field; files without pieces stay byte-identical.
 */
export function encodeDesign(d: TerrainDesign): Uint8Array {
  const header = new TextEncoder().encode(JSON.stringify({ schemaVersion: d.schemaVersion, dimension: d.dimension, base: d.base, minX: d.minX, minZ: d.minZ, width: d.width, length: d.length, ids: d.ids, updatedAt: d.updatedAt, ...(hasPieces(d) && { steps: true }),
    ...(d.scatter && (d.scatter.layers.length || d.scatter.items.length) && { scatter: d.scatter }) }));
  const start = 12 + header.length + ((12 + header.length) % 2), n = d.width * d.length;
  const steps = hasPieces(d), out = new Uint8Array(start + n * (steps ? 11 : 9)), view = new DataView(out.buffer);
  out.set(new TextEncoder().encode(MAGIC), 0);
  view.setUint32(8, header.length, true);
  out.set(header, 12);
  [d.height, d.top, d.fill, d.water].forEach((a, k) => {
    const base = start + k * n * 2;
    if (a instanceof Int16Array) for (let i = 0; i < n; i++) view.setInt16(base + i * 2, a[i]!, true);
    else for (let i = 0; i < n; i++) view.setUint16(base + i * 2, a[i]!, true);
  });
  out.set(d.path, start + n * 8);
  if (steps) for (let i = 0; i < n; i++) view.setUint16(start + n * 9 + i * 2, d.step[i]!, true);
  return out;
}

export function decodeDesign(bytes: Uint8Array): TerrainDesign {
  if (bytes.length < 12 || new TextDecoder().decode(bytes.subarray(0, 8)) !== MAGIC) fail('keine Bauplaner-Geländegestaltung');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const len = view.getUint32(8, true);
  if (12 + len > bytes.length) fail('Kopf abgeschnitten');
  let h: Record<string, unknown>;
  try { h = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(12, 12 + len))) as Record<string, unknown>; } catch { return fail('Kopf unlesbar'); }
  if (!isObj(h) || h.schemaVersion !== DESIGN_SCHEMA_VERSION) fail('unbekannte Schemaversion');
  const area = checkSurveyArea(h), base = checkBase(h.base);
  if (typeof h.dimension !== 'string' || !DIMENSION_ID.test(h.dimension)) fail('ungültige Dimension');
  if (!Array.isArray(h.ids) || !h.ids.length || h.ids.length > 65_535 || !h.ids.every(i => typeof i === 'string')) fail('ungültige Blockliste');
  const n = area.width * area.length, start = 12 + len + ((12 + len) % 2);
  const withSteps = h.steps === true;
  if (bytes.length !== start + n * (withSteps ? 11 : 9)) fail('Datengröße passt nicht zum Bereich');
  const read16 = (k: number, signed: boolean) => {
    const a = signed ? new Int16Array(n) : new Uint16Array(n), b = start + k * n * 2;
    for (let i = 0; i < n; i++) a[i] = signed ? view.getInt16(b + i * 2, true) : view.getUint16(b + i * 2, true);
    return a;
  };
  const ids = h.ids as string[];
  const d: TerrainDesign = { schemaVersion: DESIGN_SCHEMA_VERSION, dimension: h.dimension as string, base, ...area,
    height: read16(0, true) as Int16Array, top: read16(1, false) as Uint16Array, fill: read16(2, false) as Uint16Array, water: read16(3, true) as Int16Array,
    path: bytes.slice(start + n * 8, start + n * 9), step: new Uint16Array(n), ids: [...ids], updatedAt: typeof h.updatedAt === 'string' ? h.updatedAt : new Date(0).toISOString(),
    ...(h.scatter !== undefined && { scatter: checkScatterPlan(h.scatter) }) };
  if (withSteps) for (let i = 0; i < n; i++) d.step[i] = view.getUint16(start + n * 9 + i * 2, true);
  for (let i = 0; i < n; i++) {
    if (d.top[i]! >= ids.length || d.fill[i]! >= ids.length || d.step[i]! >= ids.length) fail('Blockindex außerhalb der Liste');
    if (d.path[i]! > PATH_DECK_RAIL || (d.path[i]! >= PATH_STAIR) !== (d.step[i]! > 0)) fail('ungültige Wegstufe');
  }
  return d;
}

/** File, content address and project reference of a design. */
export async function designFile(d: TerrainDesign, base: TerrainSurvey, name = 'gestaltung'): Promise<{ original: OriginalFile; reference: ProjectTerrainDesignReference }> {
  const bytes = encodeDesign(d), sha256 = await sha256Hex(bytes);
  const fileName = `${name.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 60) || 'gestaltung'}_${d.minX}_${d.minZ}.bpdesign`;
  const original: OriginalFile = { sha256, fileName, mediaType: DESIGN_MEDIA_TYPE, size: bytes.byteLength, createdAt: d.updatedAt, bytes };
  const reference = checkTerrainDesignReference({ schemaVersion: DESIGN_SCHEMA_VERSION, sha256, fileName, dimension: d.dimension, area: { minX: d.minX, minZ: d.minZ, width: d.width, length: d.length },
    base: d.base, updatedAt: d.updatedAt, changed: compareDesign(base, d).changed });
  return { original, reference };
}

/** Whether a design fits its base (same area and dimension). */
export function designMatchesBase(d: TerrainDesign, s: TerrainSurvey): boolean {
  return d.minX === s.minX && d.minZ === s.minZ && d.width === s.width && d.length === s.length && d.dimension === s.dimension;
}

// ------------------------------------------------------------------ brushes

export type BrushTool = 'raise' | 'lower' | 'smooth' | 'flatten' | 'fillUp' | 'cut' | 'roughen' | 'terrace' | 'soften' | 'paint' | 'drain';
export type Falloff = 'hard' | 'soft' | 'cone';

export interface Brush {
  readonly tool: BrushTool;
  /** 0 = one column. */
  readonly radius: number;
  /** Blocks per dab (raise/lower/roughen), passes (smooth), maximum step (soften). */
  readonly strength: number;
  readonly falloff: Falloff;
  /** Target height (flatten, fillUp, cut). */
  readonly target?: number;
  /** Terrace height (terrace). */
  readonly step?: number;
  /** Surface style id (paint). */
  readonly style?: string;
  /**
   * Only where these hold (WorldPainter-like filter). Paint has used it from
   * the start; TERRAIN-05 applies it to every brush as a mask.
   */
  readonly filter?: PaintFilter;
  /** TERRAIN-05: columns (index `x + z·width`) with a non-zero entry are never changed (e.g. graded building sites). */
  readonly protect?: Uint8Array;
}

export interface PaintFilter { readonly minY?: number; readonly maxY?: number; readonly minSlope?: number; readonly maxSlope?: number; readonly onlyDry?: boolean }

export const BRUSH_LABEL: Readonly<Record<BrushTool, string>> = {
  raise: 'Anheben', lower: 'Absenken', smooth: 'Glätten', flatten: 'Einebnen', fillUp: 'Aufschütten', cut: 'Abtragen', roughen: 'Aufrauen', terrace: 'Terrassen', soften: 'Hänge abflachen', paint: 'Bemalen', drain: 'Wasser entfernen',
};

export const brushWeight = (dist: number, radius: number, falloff: Falloff): number => {
  if (dist > radius + 0.5) return 0;
  if (falloff === 'hard') return 1;
  const t = Math.min(1, dist / (radius + 1));
  return falloff === 'cone' ? 1 - t : 0.5 * (1 + stableCos(Math.PI * t));
};

/** Highest height difference to the four neighbours (known columns only). */
export function slopeAt(d: TerrainDesign, x: number, z: number): number {
  const i = x + z * d.width, h = d.height[i]!;
  if (h === SURVEY_UNKNOWN) return 0;
  let s = 0;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const nx = x + dx, nz = z + dz;
    if (nx < 0 || nz < 0 || nx >= d.width || nz >= d.length) continue;
    const n = d.height[nx + nz * d.width]!;
    if (n !== SURVEY_UNKNOWN) s = Math.max(s, Math.abs(n - h));
  }
  return s;
}

/** Whether column (x, z) (grid coordinates) passes a filter; no filter passes. */
export const columnPasses = (d: TerrainDesign, x: number, z: number, f: PaintFilter | undefined): boolean => {
  if (!f) return true;
  const h = d.height[x + z * d.width]!;
  if (f.minY !== undefined && h < f.minY) return false;
  if (f.maxY !== undefined && h > f.maxY) return false;
  if (f.onlyDry && d.water[x + z * d.width] !== NO_WATER) return false;
  if (f.minSlope !== undefined || f.maxSlope !== undefined) {
    const s = slopeAt(d, x, z);
    if (f.minSlope !== undefined && s < f.minSlope) return false;
    if (f.maxSlope !== undefined && s > f.maxSlope) return false;
  }
  return true;
};

/** Sets a column's planned height (rounded, within the world limits); drops water and path pieces that no longer fit. */
export const setHeight = (d: TerrainDesign, i: number, h: number, lim: readonly [number, number]): boolean => {
  const v = Math.max(lim[0], Math.min(lim[1], Math.round(h)));
  if (v === d.height[i]) return false;
  d.height[i] = v;
  if (d.water[i] !== NO_WATER && v >= d.water[i]!) d.water[i] = NO_WATER;
  // A stair or slab belongs to the old height; a deck needs its water.
  if (d.path[i]! >= PATH_STAIR && (d.path[i]! < PATH_DECK || d.water[i] === NO_WATER)) clearPiece(d, i);
  return true;
};

/** Removes the stair, slab or deck of a column; a deck column stops being a path (its ground is the bed of the water). */
function clearPiece(d: TerrainDesign, i: number): void {
  d.path[i] = d.path[i]! >= PATH_DECK ? 0 : d.path[i]! >= PATH_STAIR ? 1 : d.path[i]!;
  d.step[i] = 0;
}

/** Paints one column with a style. */
export function paintColumn(d: TerrainDesign, i: number, style: SurfaceStyle): boolean {
  const x = d.minX + i % d.width, z = d.minZ + Math.floor(i / d.width);
  const t = idIndex(d, pickTop(style, x, z)), f = idIndex(d, style.fill);
  // A path style keeps the stair or slab of a path column; any other style ends the path (and its pieces).
  const p = style.path ? (d.path[i]! >= PATH_DECK ? 1 : d.path[i]! || 1) : 0;
  if (d.top[i] === t && d.fill[i] === f && d.path[i] === p) return false;
  if (p <= 1 && d.path[i]! >= PATH_STAIR) d.step[i] = 0;
  d.top[i] = t; d.fill[i] = f; d.path[i] = p;
  return true;
}

/**
 * One dab of a brush at world column (cx, cz). Returns the number of changed
 * columns. Unknown columns are never touched. Deterministic.
 */
export function applyBrush(d: TerrainDesign, cx: number, cz: number, b: Brush): number {
  const r = Math.max(0, Math.min(64, Math.round(b.radius))), strength = Math.max(1, Math.min(32, Math.round(b.strength)));
  const lim = heightLimits(d.dimension);
  const gx = cx - d.minX, gz = cz - d.minZ;
  const x0 = Math.max(0, gx - r), x1 = Math.min(d.width - 1, gx + r), z0 = Math.max(0, gz - r), z1 = Math.min(d.length - 1, gz + r);
  if (x0 > x1 || z0 > z1) return 0;
  const style = b.tool === 'paint' ? styleById(b.style ?? 'wiese') : null;
  let changed = 0;
  const each = (fn: (i: number, w: number, x: number, z: number) => boolean) => {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const i = x + z * d.width;
      if (d.height[i] === SURVEY_UNKNOWN || b.protect?.[i]) continue;
      if (b.filter && !columnPasses(d, x, z, b.filter)) continue;
      const w = brushWeight(stableHypot(x - gx, z - gz), r, b.falloff);
      if (w <= 0) continue;
      if (fn(i, w, x, z)) changed++;
    }
  };
  switch (b.tool) {
    case 'raise': case 'lower': {
      const sign = b.tool === 'raise' ? 1 : -1;
      each((i, w) => { const delta = Math.round(strength * w); return delta > 0 && setHeight(d, i, d.height[i]! + sign * delta, lim); });
      break;
    }
    case 'flatten': case 'fillUp': case 'cut': {
      const target = b.target ?? d.height[Math.max(0, Math.min(d.width - 1, gx)) + Math.max(0, Math.min(d.length - 1, gz)) * d.width]!;
      if (target === SURVEY_UNKNOWN) return 0;
      // Aufschütten only fills hollows up to the target, Abtragen only cuts what stands above it, Einebnen does both.
      each((i, w) => {
        const h = d.height[i]!;
        if ((b.tool === 'fillUp' && h >= target) || (b.tool === 'cut' && h <= target)) return false;
        return setHeight(d, i, h + (target - h) * w, lim);
      });
      break;
    }
    case 'smooth': {
      for (let pass = 0; pass < Math.min(strength, 8); pass++) {
        const before = d.height.slice();
        each((i, w, x, z) => {
          let sum = 0, n = 0;
          for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, nz = z + dz;
            if (nx < 0 || nz < 0 || nx >= d.width || nz >= d.length) continue;
            const v = before[nx + nz * d.width]!;
            if (v !== SURVEY_UNKNOWN) { sum += v; n++; }
          }
          return n > 0 && setHeight(d, i, before[i]! + (sum / n - before[i]!) * w, lim);
        });
      }
      break;
    }
    case 'roughen': {
      each((i, w, x, z) => setHeight(d, i, d.height[i]! + (valueNoise(d.minX + x, d.minZ + z, 4, 11) * 2 - 1) * strength * w, lim));
      break;
    }
    case 'terrace': {
      const step = Math.max(2, Math.min(16, Math.round(b.step ?? 4)));
      each((i, w) => { const h = d.height[i]!, q = Math.round(h / step) * step; return setHeight(d, i, h + (q - h) * w, lim); });
      break;
    }
    case 'soften': {
      // Lowers columns that stand more than `strength` above their lowest neighbour (cliffs become slopes).
      for (let pass = 0; pass < 16; pass++) {
        let moved = 0;
        const before = d.height.slice();
        each((i, w, x, z) => {
          if (w < 0.5) return false;
          let low = before[i]!;
          for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
            const nx = x + dx, nz = z + dz;
            if (nx < 0 || nz < 0 || nx >= d.width || nz >= d.length) continue;
            const v = before[nx + nz * d.width]!;
            if (v !== SURVEY_UNKNOWN) low = Math.min(low, v);
          }
          const ok = before[i]! - low > strength && setHeight(d, i, low + strength, lim);
          if (ok) moved++;
          return ok;
        });
        if (!moved) break;
      }
      break;
    }
    case 'paint': each((i, w) => w >= 0.5 && paintColumn(d, i, style!)); break;
    case 'drain': each((i, w) => { if (w < 0.5 || d.water[i] === NO_WATER) return false; d.water[i] = NO_WATER; if (d.path[i]! >= PATH_DECK) clearPiece(d, i); return true; }); break;
  }
  if (changed) d.updatedAt = new Date().toISOString();
  return changed;
}

/** Columns along a stroke from (x0,z0) to (x1,z1), spaced for brushes of the given radius. */
export function strokePoints(x0: number, z0: number, x1: number, z1: number, radius: number): [number, number][] {
  const len = stableHypot(x1 - x0, z1 - z0), spacing = Math.max(1, radius / 2), n = Math.max(1, Math.ceil(len / spacing));
  const out: [number, number][] = [];
  for (let k = 1; k <= n; k++) out.push([Math.round(x0 + (x1 - x0) * k / n), Math.round(z0 + (z1 - z0) * k / n)]);
  return out;
}

// ------------------------------------------------------------------ water

export interface FloodResult { readonly filled: number; readonly blocks: number; readonly reachedEdge: boolean }

/**
 * Fills water from a column up to `level` (the water surface): every column
 * connected to the start whose planned ground lies below `level` gets water,
 * like a bucket in a basin. `reachedEdge` says the water would run out of the
 * area (the basin is open there).
 */
export function floodWater(d: TerrainDesign, x: number, z: number, level: number): FloodResult {
  const gx = x - d.minX, gz = z - d.minZ;
  const lim = heightLimits(d.dimension);
  if (level < lim[0] || level > lim[1]) fail(`Wasserspiegel muss zwischen Y ${lim[0]} und ${lim[1]} liegen`);
  if (gx < 0 || gz < 0 || gx >= d.width || gz >= d.length) return { filled: 0, blocks: 0, reachedEdge: false };
  const start = gx + gz * d.width;
  if (d.height[start] === SURVEY_UNKNOWN || d.height[start]! >= level) return { filled: 0, blocks: 0, reachedEdge: false };
  const seen = new Uint8Array(d.width * d.length), queue = new Int32Array(d.width * d.length);
  let head = 0, tail = 0, filled = 0, blocks = 0, reachedEdge = false;
  queue[tail++] = start; seen[start] = 1;
  while (head < tail) {
    const i = queue[head++]!, cx = i % d.width, cz = (i - cx) / d.width;
    if (d.water[i] !== level) { d.water[i] = level; filled++; }
    blocks += level - d.height[i]!;
    if (cx === 0 || cz === 0 || cx === d.width - 1 || cz === d.length - 1) reachedEdge = true;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = cx + dx, nz = cz + dz;
      if (nx < 0 || nz < 0 || nx >= d.width || nz >= d.length) continue;
      const j = nx + nz * d.width;
      if (seen[j] || d.height[j] === SURVEY_UNKNOWN || d.height[j]! >= level) continue;
      seen[j] = 1; queue[tail++] = j;
    }
  }
  if (filled) d.updatedAt = new Date().toISOString();
  return { filled, blocks, reachedEdge };
}

// ------------------------------------------------------------------ paths

// ------------------------------------------------------------------ path pieces (TERRAIN-03)

/** Path codes (`TerrainDesign.path`). */
export const PATH_PLAIN = 1;
/** Stair rising towards `PATH_DIRS[k]`: code PATH_STAIR + k. */
export const PATH_STAIR = 2;
export const PATH_SLAB = 6;
/** Bridge deck one block over the water surface. */
export const PATH_DECK = 7;
export const PATH_DECK_RAIL = 8;
/** Directions of path pieces: [dx, dz, facing]. A stair "facing north" rises towards north (you walk up northwards). */
export const PATH_DIRS = [[0, -1, 'north'], [1, 0, 'east'], [0, 1, 'south'], [-1, 0, 'west']] as const;

/** A material family for stairs, slab steps, bridge decks and railings. */
export interface PathMaterial {
  readonly id: string;
  readonly label: string;
  readonly stairs: string;
  readonly slab: string;
  readonly deck: string;
  readonly rail: string;
}
export const PATH_MATERIALS: readonly PathMaterial[] = [
  { id: 'fichte', label: 'Fichtenholz', stairs: 'minecraft:spruce_stairs', slab: 'minecraft:spruce_slab', deck: 'minecraft:spruce_planks', rail: 'minecraft:spruce_fence' },
  { id: 'eiche', label: 'Eichenholz', stairs: 'minecraft:oak_stairs', slab: 'minecraft:oak_slab', deck: 'minecraft:oak_planks', rail: 'minecraft:oak_fence' },
  { id: 'dunkeleiche', label: 'Schwarzeichenholz', stairs: 'minecraft:dark_oak_stairs', slab: 'minecraft:dark_oak_slab', deck: 'minecraft:dark_oak_planks', rail: 'minecraft:dark_oak_fence' },
  { id: 'bruchstein', label: 'Bruchstein', stairs: 'minecraft:cobblestone_stairs', slab: 'minecraft:cobblestone_slab', deck: 'minecraft:cobblestone', rail: 'minecraft:cobblestone_wall' },
  { id: 'moosbruchstein', label: 'Bemooster Bruchstein', stairs: 'minecraft:mossy_cobblestone_stairs', slab: 'minecraft:mossy_cobblestone_slab', deck: 'minecraft:mossy_cobblestone', rail: 'minecraft:mossy_cobblestone_wall' },
  { id: 'steinziegel', label: 'Steinziegel', stairs: 'minecraft:stone_brick_stairs', slab: 'minecraft:stone_brick_slab', deck: 'minecraft:stone_bricks', rail: 'minecraft:stone_brick_wall' },
  { id: 'andesit', label: 'Polierter Andesit', stairs: 'minecraft:polished_andesite_stairs', slab: 'minecraft:polished_andesite_slab', deck: 'minecraft:polished_andesite', rail: 'minecraft:andesite_wall' },
  { id: 'sandstein', label: 'Sandstein', stairs: 'minecraft:sandstone_stairs', slab: 'minecraft:sandstone_slab', deck: 'minecraft:sandstone', rail: 'minecraft:sandstone_wall' },
  { id: 'ziegel', label: 'Ziegel', stairs: 'minecraft:brick_stairs', slab: 'minecraft:brick_slab', deck: 'minecraft:bricks', rail: 'minecraft:brick_wall' },
];
/** Material that fits a path style when the user picks „passend zum Belag“. */
export const PATH_STYLE_MATERIAL: Readonly<Record<string, string>> = { pfad: 'fichte', kiesweg: 'bruchstein', pflaster: 'bruchstein', steinweg: 'steinziegel', asphalt: 'andesit' };
export const pathMaterialById = (id: string): PathMaterial => PATH_MATERIALS.find(m => m.id === id) ?? fail(`unbekanntes Stufenmaterial ${id}`);

/** Whether a design has any stair, slab or deck (the file then carries the step field). */
export function hasPieces(d: TerrainDesign): boolean {
  for (let i = 0; i < d.path.length; i++) if (d.path[i]! >= PATH_STAIR) return true;
  return false;
}

/** Walking surface of a column: the deck of a bridge, otherwise the planned ground. */
const surfaceY = (d: TerrainDesign, i: number): number => d.path[i]! >= PATH_DECK && d.water[i] !== NO_WATER ? d.water[i]! + 1 : d.height[i]!;

/** Directions (index into PATH_DIRS) in which a neighbouring path column stands exactly one block higher. */
export function risingDirs(d: TerrainDesign, gx: number, gz: number): number[] {
  const i = gx + gz * d.width, h = d.height[i]!;
  if (h === SURVEY_UNKNOWN) return [];
  const out: number[] = [];
  PATH_DIRS.forEach(([dx, dz], k) => {
    const nx = gx + dx, nz = gz + dz;
    if (nx < 0 || nz < 0 || nx >= d.width || nz >= d.length) return;
    const j = nx + nz * d.width;
    if (d.path[j] && d.height[j] !== SURVEY_UNKNOWN && surfaceY(d, j) === h + 1) out.push(k);
  });
  return out;
}

const isWall = (id: string) => /_wall$/.test(id);
const railOf = (deck: string): string | undefined => PATH_MATERIALS.find(m => m.deck === deck)?.rail;

/** Railing state: fences and walls connect to the railings next to them. */
function railState(d: TerrainDesign, gx: number, gz: number, id: string): BlockState {
  const props: Record<string, string> = {};
  for (const [dx, dz, facing] of PATH_DIRS) {
    const nx = gx + dx, nz = gz + dz;
    const on = nx >= 0 && nz >= 0 && nx < d.width && nz < d.length && d.path[nx + nz * d.width] === PATH_DECK_RAIL;
    props[facing] = isWall(id) ? (on ? 'low' : 'none') : String(on);
  }
  if (isWall(id)) props.up = 'true';
  return completeState({ id, properties: props }) ?? { id, properties: props };
}

/**
 * The blocks of the path piece on one column (stair or slab one block above
 * the ground, deck one block above the water, railing on the deck). A stair or
 * slab whose neighbour no longer stands one block higher is left out, so later
 * brush strokes never leave stairs leading nowhere.
 */
function visitPiece(d: TerrainDesign, gx: number, gz: number, visit: (c: DesignCell) => void): void {
  const i = gx + gz * d.width, code = d.path[i]!, id = d.ids[d.step[i]!];
  if (code < PATH_STAIR || !id || d.height[i] === SURVEY_UNKNOWN) return;
  const x = d.minX + gx, z = d.minZ + gz, h = d.height[i]!;
  if (code >= PATH_DECK) {
    const w = d.water[i]!;
    if (w === NO_WATER) return;
    visit({ x, y: w + 1, z, id });
    const rail = code === PATH_DECK_RAIL ? railOf(id) : undefined;
    if (rail) visit({ x, y: w + 2, z, id: rail, state: railState(d, gx, gz, rail) });
    return;
  }
  const dirs = risingDirs(d, gx, gz);
  if (code === PATH_SLAB) {
    if (dirs.length) visit({ x, y: h + 1, z, id, state: completeState({ id, properties: { type: 'bottom' } }) ?? { id, properties: { type: 'bottom' } } });
    return;
  }
  const k = code - PATH_STAIR;
  if (!dirs.includes(k)) return;
  const props = { facing: PATH_DIRS[k]![2], half: 'bottom', shape: 'straight' };
  visit({ x, y: h + 1, z, id, state: completeState({ id, properties: props }) ?? { id, properties: props } });
}

/** All stair, slab, deck and railing blocks of a design (world coordinates), e.g. for a 3D preview. */
export function pathPieceCells(d: TerrainDesign): DesignCell[] {
  const out: DesignCell[] = [];
  for (let gz = 0; gz < d.length; gz++) for (let gx = 0; gx < d.width; gx++) if (d.path[gx + gz * d.width]! >= PATH_STAIR) visitPiece(d, gx, gz, c => out.push(c));
  return out;
}

// ------------------------------------------------------------------ paths

/** Pieces at height changes: none (only the report names them), stairs or slab steps (half blocks). */
export type PathSteps = 'none' | 'stairs' | 'slabs';
/** Over water: a causeway of ground, or a bridge deck one block above the water. */
export type PathWater = 'causeway' | 'bridge';

export interface PathOptions {
  /** Path width in blocks (1–9). */
  readonly width: number;
  /** Path style id (SURFACE_STYLES with `path`). */
  readonly style: string;
  /** Highest height change between two path blocks (1 = walkable without jumping onto full blocks). */
  readonly maxStep?: number;
  /** TERRAIN-03: stairs or slabs at every one-block rise (default none). */
  readonly steps?: PathSteps;
  /** PATH_MATERIALS id; absent or 'auto' = fitting the path style. */
  readonly material?: string;
  /** TERRAIN-03: causeway (default) or bridge. */
  readonly water?: PathWater;
}

export interface PathReport {
  readonly length: number;
  readonly columns: number;
  /** Places where the path changes height (a stair or slab makes them comfortable). */
  readonly steps: number;
  readonly rise: number;
  /** Columns raised out of water (causeway). */
  readonly causeway: number;
  readonly cut: number;
  readonly fill: number;
  readonly unknown: number;
  /** TERRAIN-03: stair and slab blocks set, deck columns (railing columns among them). */
  readonly stairs: number;
  readonly slabs: number;
  readonly bridge: number;
  readonly rails: number;
  /** Height changes along the centre line without a stair or slab (more than one block, or none chosen). */
  readonly open: number;
}

const EMPTY_REPORT = { length: 0, columns: 0, steps: 0, rise: 0, causeway: 0, cut: 0, fill: 0, unknown: 0, stairs: 0, slabs: 0, bridge: 0, rails: 0, open: 0 } as const;

/** Centre line of a polyline (world columns), without repeated points. */
export function pathLine(points: readonly (readonly [number, number])[]): [number, number][] {
  const out: [number, number][] = [];
  for (let k = 0; k < points.length; k++) {
    const [x1, z1] = points[k]!;
    if (k === 0) { out.push([x1, z1]); continue; }
    let [x, z] = out.at(-1)!;
    const dx = Math.abs(x1 - x), dz = -Math.abs(z1 - z), sx = x < x1 ? 1 : -1, sz = z < z1 ? 1 : -1;
    let err = dx + dz;
    while (x !== x1 || z !== z1) {
      const e2 = 2 * err, stepX = e2 >= dz && x !== x1, stepZ = e2 <= dx && z !== z1;
      // 4-connected: a diagonal step becomes two steps, so the path never touches only at a corner.
      if (stepX) { err += dz; x += sx; out.push([x, z]); }
      if (stepZ) { err += dx; z += sz; out.push([x, z]); }
    }
  }
  return out;
}

/**
 * Lays a path along a polyline: the centre heights follow the planned ground,
 * smoothed and limited to `maxStep` per block; the path width is levelled to
 * the centre height and painted with the path style. Over water the path
 * becomes a causeway at water level, or (TERRAIN-03) a bridge deck one block
 * above the water with railings at its open sides. With `steps` every
 * one-block rise gets a stair (facing up the path) or a slab step on the lower
 * column, across the whole width.
 */
export function layPath(d: TerrainDesign, points: readonly (readonly [number, number])[], o: PathOptions): PathReport {
  const style = styleById(o.style);
  if (!style.path) fail(`„${style.label}“ ist kein Wegbelag`);
  const width = Math.max(1, Math.min(9, Math.round(o.width))), maxStep = Math.max(1, Math.min(4, Math.round(o.maxStep ?? 1)));
  const bridge = o.water === 'bridge', steps = o.steps ?? 'none';
  const material = pathMaterialById(o.material && o.material !== 'auto' ? o.material : PATH_STYLE_MATERIAL[style.id] ?? 'fichte');
  const lim = heightLimits(d.dimension);
  const line = pathLine(points).filter(([x, z]) => x >= d.minX && z >= d.minZ && x < d.minX + d.width && z < d.minZ + d.length);
  if (!line.length) return EMPTY_REPORT;
  const at = (x: number, z: number) => (x - d.minX) + (z - d.minZ) * d.width;
  // Centre heights (walking surface): ground, over water at least the water surface (causeway) or one above it (deck); unknown takes the previous one.
  let unknown = 0;
  const floor = line.map(([x, z]) => { const i = at(x, z); return d.height[i] !== SURVEY_UNKNOWN && d.water[i] !== NO_WATER ? d.water[i]! + (bridge ? 1 : 0) : -Infinity; });
  const raw = line.map(([x, z], k) => {
    const i = at(x, z), h = d.height[i]!;
    if (h === SURVEY_UNKNOWN) { unknown++; return NaN; }
    return Math.max(h, floor[k]!);
  });
  const firstKnown = raw.find(v => !Number.isNaN(v));
  if (firstKnown === undefined) return { ...EMPTY_REPORT, length: line.length, unknown };
  for (let k = 0; k < raw.length; k++) if (Number.isNaN(raw[k]!)) raw[k] = k ? raw[k - 1]! : firstKnown;
  // Moving average (5) then a slope limit forwards and backwards.
  const h = raw.map((_, k) => { let s = 0, n = 0; for (let j = Math.max(0, k - 2); j <= Math.min(raw.length - 1, k + 2); j++) { s += raw[j]!; n++; } return Math.round(s / n); });
  for (let k = 1; k < h.length; k++) h[k] = Math.max(h[k - 1]! - maxStep, Math.min(h[k - 1]! + maxStep, h[k]!));
  for (let k = h.length - 2; k >= 0; k--) h[k] = Math.max(h[k + 1]! - maxStep, Math.min(h[k + 1]! + maxStep, h[k]!));
  // Over water the path stays at least at the water surface; neighbours ramp up to it.
  if (floor.some(f => f > -Infinity)) {
    for (let k = 0; k < h.length; k++) h[k] = Math.max(h[k]!, floor[k]!);
    for (let k = 1; k < h.length; k++) h[k] = Math.max(h[k]!, h[k - 1]! - maxStep);
    for (let k = h.length - 2; k >= 0; k--) h[k] = Math.max(h[k]!, h[k + 1]! - maxStep);
  }
  // A bridge deck lies exactly one block above its water; the banks follow it within the slope limit.
  if (bridge) {
    const fixed = floor.map(f => f > -Infinity);
    floor.forEach((f, k) => { if (fixed[k]) h[k] = f; });
    // Landings: the first bank column on each side lies level with the deck, so stairs can lead up from it (a deck carries no stairs).
    const landing = fixed.map((f, k) => !f && ((k > 0 && fixed[k - 1]) || (k < fixed.length - 1 && fixed[k + 1])) ? h[fixed[k - 1] ? k - 1 : k + 1]! : null);
    landing.forEach((y, k) => { if (y !== null) { h[k] = y; fixed[k] = true; } });
    for (let k = 1; k < h.length; k++) if (!fixed[k]) h[k] = Math.max(h[k - 1]! - maxStep, Math.min(h[k - 1]! + maxStep, h[k]!));
    for (let k = h.length - 2; k >= 0; k--) if (!fixed[k]) h[k] = Math.max(h[k + 1]! - maxStep, Math.min(h[k + 1]! + maxStep, h[k]!));
  }
  // Assign each column of the width to its nearest centre point.
  const half = (width - 1) / 2, owner = new Map<number, { k: number; dist: number }>();
  line.forEach(([x, z], k) => {
    const r = Math.ceil(half);
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const dist = width % 2 ? Math.max(Math.abs(dx), Math.abs(dz)) : stableHypot(dx, dz);
      if (dist > half + (width % 2 ? 0 : 0.5)) continue;
      const nx = x + dx, nz = z + dz;
      if (nx < d.minX || nz < d.minZ || nx >= d.minX + d.width || nz >= d.minZ + d.length) continue;
      const i = at(nx, nz);
      if (d.height[i] === SURVEY_UNKNOWN) continue;
      const before = owner.get(i), exact = stableHypot(dx, dz);
      if (!before || exact < before.dist) owner.set(i, { k, dist: exact });
    }
  });
  let cut = 0, fill = 0, causeway = 0;
  const decks: number[] = [];
  for (const [i, { k }] of owner) {
    const target = Math.max(lim[0], Math.min(lim[1], h[k]!)), before = d.height[i]!;
    if (d.path[i]! >= PATH_STAIR) clearPiece(d, i);
    if (bridge && d.water[i] !== NO_WATER && target === d.water[i]! + 1) {
      // Deck: the ground under the water and the water stay as they are.
      d.path[i] = PATH_DECK; d.step[i] = idIndex(d, material.deck); decks.push(i);
      continue;
    }
    if (d.water[i] !== NO_WATER) { causeway++; d.water[i] = NO_WATER; }
    if (target > before) fill += target - before; else cut += before - target;
    d.height[i] = target;
    paintColumn(d, i, style);
  }
  // Railings where a deck borders anything that is not path (water, bank, the edge of the area).
  let rails = 0;
  for (const i of decks) {
    const gx = i % d.width, gz = (i - gx) / d.width;
    const open = PATH_DIRS.some(([dx, dz]) => { const nx = gx + dx, nz = gz + dz; return nx < 0 || nz < 0 || nx >= d.width || nz >= d.length || !d.path[nx + nz * d.width]; });
    if (open) { d.path[i] = PATH_DECK_RAIL; rails++; }
  }
  // Stairs or slabs on every lower column of a one-block rise, facing up the path where possible.
  let stairs = 0, slabs = 0;
  if (steps !== 'none') {
    const stairIdx = idIndex(d, material.stairs), slabIdx = idIndex(d, material.slab);
    const along = (k: number): number => {
      const [ax, az] = line[Math.max(0, k - (k === line.length - 1 ? 1 : 0))]!, [bx, bz] = line[Math.min(line.length - 1, k + (k === line.length - 1 ? 0 : 1))]!;
      return PATH_DIRS.findIndex(([dx, dz]) => dx === Math.sign(bx - ax) && dz === Math.sign(bz - az));
    };
    for (const [i, { k }] of owner) {
      if (d.path[i]! >= PATH_DECK) continue;
      const gx = i % d.width, gz = (i - gx) / d.width, dirs = risingDirs(d, gx, gz);
      if (!dirs.length) continue;
      if (steps === 'slabs') { d.path[i] = PATH_SLAB; d.step[i] = slabIdx; slabs++; continue; }
      const a = along(k), back = a < 0 ? -1 : (a + 2) % 4;
      const dir = dirs.includes(a) ? a : dirs.includes(back) ? back : dirs[0]!;
      d.path[i] = PATH_STAIR + dir; d.step[i] = stairIdx; stairs++;
    }
  }
  let rises = 0, rise = 0, covered = 0;
  for (let k = 1; k < h.length; k++) {
    if (h[k] === h[k - 1]) continue;
    rises++; rise += Math.abs(h[k]! - h[k - 1]!);
    const low = h[k]! < h[k - 1]! ? line[k]! : line[k - 1]!, code = d.path[at(low[0], low[1])]!;
    if (Math.abs(h[k]! - h[k - 1]!) === 1 && code >= PATH_STAIR && code <= PATH_SLAB) covered++;
  }
  d.updatedAt = new Date().toISOString();
  return { length: line.length, columns: owner.size, steps: rises, rise, causeway, cut, fill, unknown, stairs, slabs, bridge: decks.length, rails, open: rises - covered };
}

// ------------------------------------------------------------------ path networks (TERRAIN-03-S08)

export interface NetworkOptions {
  /** Path style id (SURFACE_STYLES with `path`). */
  readonly style: string;
  readonly steps?: PathSteps;
  /** PATH_MATERIALS id; absent or 'auto' = fitting the path style. */
  readonly material?: string;
  readonly water?: PathWater;
  /** Highest height change between two neighbouring path columns (1–4, default 1). */
  readonly maxStep?: number;
  /** Smoothing radius over the network in blocks (0–6, default 2). */
  readonly smooth?: number;
}

/** Small binary heap of [key, value] pairs (min first). */
function heapOf(): { push(k: number, v: number): void; pop(): [number, number]; readonly size: number } {
  const a: [number, number][] = [];
  return {
    get size() { return a.length; },
    push(k, v) { a.push([k, v]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p]![0] <= a[i]![0]) break; [a[p], a[i]] = [a[i]!, a[p]!]; i = p; } },
    pop() {
      const top = a[0]!, last = a.pop()!;
      if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l]![0] < a[m]![0]) m = l; if (r < a.length && a[r]![0] < a[m]![0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i]!, a[m]!]; i = m; } }
      return top;
    },
  };
}

/**
 * Lays a whole path network given as its columns (a routed base network,
 * the street lanes of a Großprojekt): the walking surface follows the planned
 * ground, smoothed over the network and limited to `maxStep` between any two
 * neighbouring path columns – at junctions and across the width as well, so
 * branches meet without a cliff. Over water the network becomes a causeway, or
 * a bridge deck one block above the water with railings at its open sides. With
 * `steps` every one-block rise along the walking direction gets a stair or a
 * slab; a rise only across the path (its edge on a side slope) is left as it is
 * instead of a stair facing sideways. Deterministic; unknown columns stay.
 */
export function layPathCells(d: TerrainDesign, cells: readonly (readonly [number, number])[], o: NetworkOptions): PathReport {
  const style = styleById(o.style);
  if (!style.path) fail(`„${style.label}“ ist kein Wegbelag`);
  const maxStep = Math.max(1, Math.min(4, Math.round(o.maxStep ?? 1))), radius = Math.max(0, Math.min(6, Math.round(o.smooth ?? 2)));
  const bridge = o.water === 'bridge', steps = o.steps ?? 'none';
  const material = pathMaterialById(o.material && o.material !== 'auto' ? o.material : PATH_STYLE_MATERIAL[style.id] ?? 'fichte');
  const lim = heightLimits(d.dimension);
  const slot = new Map<number, number>(), list: number[] = [];
  let unknown = 0;
  for (const [x, z] of cells) {
    const gx = x - d.minX, gz = z - d.minZ;
    if (gx < 0 || gz < 0 || gx >= d.width || gz >= d.length) { unknown++; continue; }
    const i = gx + gz * d.width;
    if (slot.has(i)) continue;
    if (d.height[i] === SURVEY_UNKNOWN) { unknown++; continue; }
    slot.set(i, -1); list.push(i);
  }
  if (!list.length) return { ...EMPTY_REPORT, length: cells.length, unknown };
  list.sort((a, b) => a - b);
  list.forEach((i, k) => slot.set(i, k));
  const n = list.length;
  const nb = (k: number): number[] => {
    const i = list[k]!, gx = i % d.width, gz = (i - gx) / d.width, out: number[] = [];
    for (const [dx, dz] of PATH_DIRS) {
      const nx = gx + dx, nz = gz + dz;
      if (nx < 0 || nz < 0 || nx >= d.width || nz >= d.length) continue;
      const j = slot.get(nx + nz * d.width);
      if (j !== undefined) out.push(j);
    }
    return out;
  };
  const wet = (k: number) => d.water[list[k]!] !== NO_WATER;
  // Walking surface: ground; over water the causeway floor (water surface) or the fixed deck (one above it).
  const fixed = new Uint8Array(n), raw = new Float64Array(n), floor = new Float64Array(n).fill(-Infinity);
  for (let k = 0; k < n; k++) {
    const i = list[k]!, h = d.height[i]!;
    if (wet(k) && bridge) { raw[k] = d.water[i]! + 1; fixed[k] = 1; }
    else if (wet(k)) { floor[k] = d.water[i]!; raw[k] = Math.max(h, d.water[i]!); }
    else raw[k] = h;
  }
  // Smoothing over the network (path columns within `radius`, decks count with their deck height).
  const h = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    if (fixed[k]) { h[k] = raw[k]!; continue; }
    const i = list[k]!, gx = i % d.width, gz = (i - gx) / d.width;
    let sum = 0, cnt = 0;
    for (let dz = -radius; dz <= radius; dz++) for (let dx = -radius; dx <= radius; dx++) {
      const nx = gx + dx, nz = gz + dz;
      if (nx < 0 || nz < 0 || nx >= d.width || nz >= d.length) continue;
      const j = slot.get(nx + nz * d.width);
      if (j === undefined) continue;
      sum += raw[j]!; cnt++;
    }
    h[k] = Math.round(sum / cnt);
  }
  const neighbours = Array.from({ length: n }, (_, k) => nb(k));
  // Lower envelope: no column more than maxStep above a neighbour (cuts through crests).
  const lower = heapOf();
  for (let k = 0; k < n; k++) lower.push(h[k]!, k);
  while (lower.size) {
    const [v, k] = lower.pop();
    if (v !== h[k]) continue;
    for (const j of neighbours[k]!) if (!fixed[j] && h[j]! > v + maxStep) { h[j] = v + maxStep; lower.push(h[j]!, j); }
  }
  // Water floors (causeway at least at the water surface), then the upper envelope (fills hollows and banks).
  for (let k = 0; k < n; k++) if (!fixed[k] && h[k]! < floor[k]!) h[k] = floor[k]!;
  const upper = heapOf();
  for (let k = 0; k < n; k++) upper.push(-h[k]!, k);
  while (upper.size) {
    const [nv, k] = upper.pop(), v = -nv;
    if (v !== h[k]) continue;
    for (const j of neighbours[k]!) if (!fixed[j] && h[j]! < v - maxStep) { h[j] = v - maxStep; upper.push(-h[j]!, j); }
  }
  // Write the columns.
  let cut = 0, fill = 0, causeway = 0;
  const decks: number[] = [];
  for (let k = 0; k < n; k++) {
    const i = list[k]!;
    if (d.path[i]! >= PATH_STAIR) clearPiece(d, i);
    if (fixed[k]) { d.path[i] = PATH_DECK; d.step[i] = idIndex(d, material.deck); decks.push(i); continue; }
    const target = Math.max(lim[0], Math.min(lim[1], h[k]!)), before = d.height[i]!;
    if (d.water[i] !== NO_WATER) { causeway++; d.water[i] = NO_WATER; }
    if (target > before) fill += target - before; else cut += before - target;
    d.height[i] = target;
    paintColumn(d, i, style);
  }
  let rails = 0;
  for (const i of decks) {
    const gx = i % d.width, gz = (i - gx) / d.width;
    const open = PATH_DIRS.some(([dx, dz]) => { const nx = gx + dx, nz = gz + dz; return nx < 0 || nz < 0 || nx >= d.width || nz >= d.length || !d.path[nx + nz * d.width]; });
    if (open) { d.path[i] = PATH_DECK_RAIL; rails++; }
  }
  // Stairs or slabs: only where the walk goes through (the column on the downhill side is path as well).
  let stairs = 0, slabs = 0;
  const isPath = (gx: number, gz: number) => gx >= 0 && gz >= 0 && gx < d.width && gz < d.length && slot.has(gx + gz * d.width);
  if (steps !== 'none') {
    const stairIdx = idIndex(d, material.stairs), slabIdx = idIndex(d, material.slab);
    for (let k = 0; k < n; k++) {
      const i = list[k]!;
      if (fixed[k]) continue;
      const gx = i % d.width, gz = (i - gx) / d.width;
      const through = risingDirs(d, gx, gz).filter(dir => { const [dx, dz] = PATH_DIRS[(dir + 2) % 4]!; return isPath(gx + dx, gz + dz); });
      if (!through.length) continue;
      if (steps === 'slabs') { d.path[i] = PATH_SLAB; d.step[i] = slabIdx; slabs++; continue; }
      d.path[i] = PATH_STAIR + through[0]!; d.step[i] = stairIdx; stairs++;
    }
  }
  // Report: height changes between neighbouring path columns, and those without a piece on the lower column.
  let rises = 0, rise = 0, covered = 0;
  const walk = (k: number) => fixed[k] ? d.water[list[k]!]! + 1 : d.height[list[k]!]!;
  for (let k = 0; k < n; k++) for (const j of neighbours[k]!) {
    if (j < k) continue;
    const a = walk(k), b = walk(j);
    if (a === b) continue;
    rises++; rise += Math.abs(a - b);
    const low = a < b ? list[k]! : list[j]!, code = d.path[low]!;
    if (Math.abs(a - b) === 1 && code >= PATH_STAIR && code <= PATH_SLAB) covered++;
  }
  d.updatedAt = new Date().toISOString();
  return { length: cells.length, columns: n, steps: rises, rise, causeway, cut, fill, unknown, stairs, slabs, bridge: decks.length, rails, open: rises - covered };
}

/** Quay walls: the given dry columns that border water get `block` as top and filler (a fortified water edge). Returns the count. */
export function fortifyShore(d: TerrainDesign, columns: Iterable<number>, block = 'minecraft:stone_bricks'): number {
  const t = idIndex(d, block);
  let count = 0;
  for (const i of columns) {
    if (i < 0 || i >= d.height.length || d.height[i] === SURVEY_UNKNOWN || d.water[i] !== NO_WATER || d.path[i]) continue;
    const gx = i % d.width, gz = (i - gx) / d.width;
    const edge = PATH_DIRS.some(([dx, dz]) => { const nx = gx + dx, nz = gz + dz; return nx >= 0 && nz >= 0 && nx < d.width && nz < d.length && d.water[nx + nz * d.width] !== NO_WATER; });
    if (!edge) continue;
    if (d.top[i] !== t || d.fill[i] !== t) { d.top[i] = t; d.fill[i] = t; count++; }
  }
  if (count) d.updatedAt = new Date().toISOString();
  return count;
}

// ------------------------------------------------------------------ ramp (TERRAIN-03)

export interface RampOptions {
  /** Ramp width in blocks (1–15). */
  readonly width: number;
  /** Heights at start and end; absent = the planned ground there. */
  readonly fromY?: number;
  readonly toY?: number;
  /** Columns beside the ramp that blend into the terrain (0–16). */
  readonly margin?: number;
}
export interface RampReport { readonly columns: number; readonly blended: number; readonly fromY: number; readonly toY: number; readonly length: number; readonly cut: number; readonly fill: number }

/**
 * A straight ramp from a to b (world columns): the height runs evenly from
 * `fromY` to `toY`, the full width is set exactly, the margin blends into the
 * surrounding ground. Unknown columns are left alone.
 */
export function layRamp(d: TerrainDesign, a: readonly [number, number], b: readonly [number, number], o: RampOptions): RampReport {
  const lim = heightLimits(d.dimension);
  const heightAt = (x: number, z: number) => {
    const gx = x - d.minX, gz = z - d.minZ;
    return gx < 0 || gz < 0 || gx >= d.width || gz >= d.length ? SURVEY_UNKNOWN : d.height[gx + gz * d.width]!;
  };
  const fromY = o.fromY ?? heightAt(a[0], a[1]), toY = o.toY ?? heightAt(b[0], b[1]);
  if (fromY === SURVEY_UNKNOWN || toY === SURVEY_UNKNOWN) fail('Anfang oder Ende der Rampe liegt auf unbekanntem Gelände – bitte die Höhe angeben');
  if (!isInt(fromY, lim[0], lim[1]) || !isInt(toY, lim[0], lim[1])) fail(`Rampenhöhen müssen zwischen Y ${lim[0]} und ${lim[1]} liegen`);
  const width = Math.max(1, Math.min(15, Math.round(o.width))), margin = Math.max(0, Math.min(16, Math.round(o.margin ?? 2))), half = (width - 1) / 2;
  const vx = b[0] - a[0], vz = b[1] - a[1], len2 = vx * vx + vz * vz, reach = Math.ceil(half + margin + 1);
  const x0 = Math.max(0, Math.min(a[0], b[0]) - reach - d.minX), x1 = Math.min(d.width - 1, Math.max(a[0], b[0]) + reach - d.minX);
  const z0 = Math.max(0, Math.min(a[1], b[1]) - reach - d.minZ), z1 = Math.min(d.length - 1, Math.max(a[1], b[1]) + reach - d.minZ);
  let columns = 0, blended = 0, cut = 0, fill = 0;
  for (let gz = z0; gz <= z1; gz++) for (let gx = x0; gx <= x1; gx++) {
    const i = gx + gz * d.width, h = d.height[i]!;
    if (h === SURVEY_UNKNOWN) continue;
    const x = d.minX + gx, z = d.minZ + gz;
    const t = len2 ? Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / len2)) : 0;
    const dist = stableHypot(x - (a[0] + t * vx), z - (a[1] + t * vz));
    if (dist > half + margin + 0.5) continue;
    const target = Math.round(fromY + (toY - fromY) * t), core = dist <= half + 0.5;
    const w = core ? 1 : 1 - (dist - half - 0.5) / (margin + 1);
    if (!setHeight(d, i, h + (target - h) * w, lim)) continue;
    const now = d.height[i]!;
    if (now > h) fill += now - h; else cut += h - now;
    if (core) columns++; else blended++;
  }
  if (columns || blended) d.updatedAt = new Date().toISOString();
  return { columns, blended, fromY, toY, length: Math.round(Math.sqrt(len2)), cut, fill };
}

// ------------------------------------------------------------------ area tools

export interface AutoPaintRules {
  /** Slope (height difference to a neighbour) from which rock shows. */
  readonly steep: number;
  /** Ground from this Y up is snow; null = no snow. */
  readonly snowY: number | null;
  /** Columns up to this many blocks from water and at most one above its surface become beach. */
  readonly beach: number;
  /** Style of everything else. */
  readonly rest: string;
}
export const DEFAULT_AUTO_PAINT: AutoPaintRules = { steep: 3, snowY: null, beach: 2, rest: 'wiese' };

/**
 * Paints the whole design by rules (like WorldPainter's automatic layers): rock
 * on steep slopes, snow above a height, beach next to water, the rest style
 * elsewhere. Paths and water columns keep their paint. Returns changed columns.
 */
export function autoPaint(d: TerrainDesign, rules: AutoPaintRules = DEFAULT_AUTO_PAINT): number {
  const n = d.width * d.length, rock = styleById('fels'), snow = styleById('schnee'), beach = styleById('strand'), rest = styleById(rules.rest);
  // Distance to water columns (chessboard), up to rules.beach.
  const near = new Int16Array(n).fill(32767), nearLevel = new Int16Array(n).fill(NO_WATER);
  let frontier: number[] = [];
  for (let i = 0; i < n; i++) if (d.water[i] !== NO_WATER) { near[i] = 0; nearLevel[i] = d.water[i]!; frontier.push(i); }
  for (let step = 1; step <= rules.beach && frontier.length; step++) {
    const next: number[] = [];
    for (const i of frontier) {
      const x = i % d.width, z = (i - x) / d.width;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= d.width || nz >= d.length) continue;
        const j = nx + nz * d.width;
        if (near[j]! <= step) continue;
        near[j] = step; nearLevel[j] = nearLevel[i]!; next.push(j);
      }
    }
    frontier = next;
  }
  let changed = 0;
  for (let i = 0; i < n; i++) {
    if (d.height[i] === SURVEY_UNKNOWN || d.path[i]) continue;
    const x = i % d.width, z = (i - x) / d.width, h = d.height[i]!;
    const style = slopeAt(d, x, z) >= rules.steep ? rock
      : rules.snowY !== null && h >= rules.snowY ? snow
      : (d.water[i] !== NO_WATER || (near[i]! <= rules.beach && h <= nearLevel[i]! + 1)) ? beach
      : rest;
    if (paintColumn(d, i, style)) changed++;
  }
  if (changed) d.updatedAt = new Date().toISOString();
  return changed;
}

export interface GradeResult { readonly graded: number; readonly blended: number; readonly outside: number }

/**
 * Prepares building sites: under every planned column the ground is set to one
 * below its lowest block (no hanging foundations, nothing buried), and up to
 * `margin` columns around the footprints blend into the surrounding terrain.
 */
export function gradeFootprints(d: TerrainDesign, bases: readonly ColumnBase[], margin: number): GradeResult {
  const n = d.width * d.length, lim = heightLimits(d.dimension);
  const target = new Int16Array(n).fill(SURVEY_UNKNOWN), dist = new Int16Array(n).fill(32767);
  let outside = 0, graded = 0, blended = 0;
  let frontier: number[] = [];
  for (const c of bases) {
    const gx = c.x - d.minX, gz = c.z - d.minZ;
    if (gx < 0 || gz < 0 || gx >= d.width || gz >= d.length) { outside++; continue; }
    const i = gx + gz * d.width;
    if (d.height[i] === SURVEY_UNKNOWN) { outside++; continue; }
    const t = c.y - 1;
    if (target[i] === SURVEY_UNKNOWN || t < target[i]!) target[i] = t;
    if (dist[i] !== 0) { dist[i] = 0; frontier.push(i); }
  }
  for (const i of frontier) {
    if (setHeight(d, i, target[i]!, lim)) graded++;
    if (d.water[i] !== NO_WATER) d.water[i] = NO_WATER;
  }
  const m = Math.max(0, Math.min(32, Math.round(margin)));
  for (let step = 1; step <= m && frontier.length; step++) {
    const next: number[] = [];
    for (const i of frontier) {
      const x = i % d.width, z = (i - x) / d.width;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx, nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= d.width || nz >= d.length) continue;
        const j = nx + nz * d.width;
        if (dist[j]! <= step || d.height[j] === SURVEY_UNKNOWN) continue;
        dist[j] = step; target[j] = target[i]!; next.push(j);
      }
    }
    for (const j of next) {
      const w = 1 - step / (m + 1);
      if (setHeight(d, j, d.height[j]! + (target[j]! - d.height[j]!) * w, lim)) blended++;
    }
    frontier = next;
  }
  if (graded || blended) d.updatedAt = new Date().toISOString();
  return { graded, blended, outside };
}

/** Resets a rectangle (or everything) to the base. */
export function resetToBase(d: TerrainDesign, base: TerrainSurvey): void {
  const fresh = designFromSurvey(base, d.base);
  for (let i = 0; i < d.height.length; i++) {
    d.height[i] = fresh.height[i]!; d.top[i] = idIndex(d, fresh.ids[fresh.top[i]!]!); d.fill[i] = idIndex(d, fresh.ids[fresh.fill[i]!]!);
    d.water[i] = fresh.water[i]!; d.path[i] = 0; d.step[i] = 0;
  }
  d.updatedAt = new Date().toISOString();
}

// ------------------------------------------------------------------ comparison and blocks

/** One cell the design asks for, world coordinates; `state` carries properties (scatter parts), otherwise the defaults of `id`. */
export interface DesignCell { readonly x: number; readonly y: number; readonly z: number; readonly id: string; readonly state?: BlockState }

const AIR = 'minecraft:air';

/**
 * Visits every block a design asks for, compared with its base. Changed
 * columns: filler and top where ground is raised, explicit air where it is
 * removed (up to the old surface, so plants and leaves over the column are
 * cleared), the top block repainted, water up to the planned surface and air
 * where water is drained. Unchanged columns produce nothing, except path
 * pieces (TERRAIN-03: stairs, slabs, bridge decks, railings), which come last
 * so they replace the air of their column.
 */
function visitDesign(base: TerrainSurvey, d: TerrainDesign, visit: (c: DesignCell) => void): void {
  if (!designMatchesBase(d, base)) fail('Gestaltung und Grundlage haben verschiedene Bereiche');
  for (let gz = 0; gz < d.length; gz++) for (let gx = 0; gx < d.width; gx++) {
    const i = gx + gz * d.width, h = d.height[i]!;
    if (h === SURVEY_UNKNOWN || base.surface[i] === SURVEY_UNKNOWN || !base.groundBlock[i]) continue;
    const g = base.ground[i]!, gTop = base.ids[base.groundBlock[i]!]!, sTop = base.ids[base.surfaceBlock[i]!] ?? '';
    const baseWater = sTop === WATER_ID && base.surface[i]! > g ? base.surface[i]! : NO_WATER;
    const top = d.ids[d.top[i]!]!, filler = d.ids[d.fill[i]!]!, w = d.water[i]!;
    const heightChanged = h !== g, topChanged = top !== gTop, waterChanged = w !== baseWater;
    if (!heightChanged && !topChanged && !waterChanged) { visitPiece(d, gx, gz, visit); continue; }
    const x = d.minX + gx, z = d.minZ + gz;
    for (let y = g + 1; y < h; y++) visit({ x, y, z, id: filler });
    if (heightChanged || topChanged) visit({ x, y: h, z, id: top });
    for (let y = h + 1; y <= w; y++) visit({ x, y, z, id: WATER_ID });
    // Above the new ground (and above new water): clear what was there.
    const oldTop = Math.max(g, base.surface[i]!);
    if (heightChanged || waterChanged) for (let y = Math.max(h, w === NO_WATER ? h : w) + 1; y <= oldTop; y++) visit({ x, y, z, id: AIR });
    visitPiece(d, gx, gz, visit);
  }
}

export interface DesignStats {
  readonly known: number;
  readonly changed: number;
  readonly raised: number;
  readonly lowered: number;
  readonly repainted: number;
  /** Ground blocks to dig out. */
  readonly cut: number;
  /** Blocks to place for raised ground (filler and top). */
  readonly fill: number;
  readonly water: number;
  readonly drained: number;
  readonly path: number;
  /** TERRAIN-03: stair, slab and deck columns of paths (railings counted with the decks). */
  readonly stairs: number;
  readonly slabs: number;
  readonly deck: number;
  readonly heightRange: readonly [number, number] | null;
  /** Blocks to place (not air), most first. */
  readonly materials: readonly { readonly id: string; readonly count: number }[];
}

/** Compares a design with its base. */
export function compareDesign(base: TerrainSurvey, d: TerrainDesign): DesignStats {
  if (!designMatchesBase(d, base)) fail('Gestaltung und Grundlage haben verschiedene Bereiche');
  let known = 0, changed = 0, raised = 0, lowered = 0, repainted = 0, cut = 0, fill = 0, drained = 0, path = 0, stairs = 0, slabs = 0, deck = 0, lo = Infinity, hi = -Infinity;
  for (let i = 0; i < d.height.length; i++) {
    const h = d.height[i]!;
    if (h === SURVEY_UNKNOWN || base.surface[i] === SURVEY_UNKNOWN || !base.groundBlock[i]) continue;
    known++; lo = Math.min(lo, h); hi = Math.max(hi, h);
    const code = d.path[i]!;
    if (code) path++;
    if (code >= PATH_DECK) deck++; else if (code === PATH_SLAB) slabs++; else if (code >= PATH_STAIR) stairs++;
    const g = base.ground[i]!, sTop = base.ids[base.surfaceBlock[i]!] ?? '';
    const baseWater = sTop === WATER_ID && base.surface[i]! > g ? base.surface[i]! : NO_WATER;
    const topChanged = d.ids[d.top[i]!] !== base.ids[base.groundBlock[i]!];
    if (h !== g || topChanged || d.water[i] !== baseWater || code >= PATH_STAIR) changed++;
    if (h > g) { raised++; fill += h - g; } else if (h < g) { lowered++; cut += g - h; } else if (topChanged) repainted++;
    if (baseWater !== NO_WATER && d.water[i] === NO_WATER) drained++;
  }
  const counts = new Map<string, number>();
  let water = 0;
  visitDesign(base, d, c => { if (c.id === AIR) return; if (c.id === WATER_ID) water++; counts.set(c.id, (counts.get(c.id) ?? 0) + 1); });
  return { known, changed, raised, lowered, repainted, cut, fill, water, drained, path, stairs, slabs, deck, heightRange: Number.isFinite(lo) ? [lo, hi] : null,
    materials: [...counts].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count || a.id.localeCompare(b.id)) };
}

export interface DesignBlocks {
  readonly payload: VoxelPayload;
  /** World position of the payload's (0,0,0). */
  readonly origin: readonly [number, number, number];
  readonly blocks: number;
  readonly air: number;
  /** Cells left to planned buildings (`skip`). */
  readonly skipped: number;
}

export const DESIGN_MAX_CELLS = 1_000_000;

/**
 * The blocks of a design as a Bauteil payload (explicit air for removed
 * ground and drained water), relative to its lowest north-west corner. Null
 * when nothing changed. `skip` leaves cells to planned buildings, so the
 * terrain never conflicts with them.
 */
export function designPayload(base: TerrainSurvey, d: TerrainDesign, profileId: string, skip?: (x: number, y: number, z: number) => boolean,
  extra: readonly DesignCell[] = []): DesignBlocks | null {
  // Keyed by position: `extra` (Streu-Ebene) wins over the terrain cell at the same place (a rock replaces the top block).
  const cells = new Map<string, DesignCell>();
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity], skipped = 0;
  const add = (c: DesignCell) => {
    if (skip?.(c.x, c.y, c.z)) { skipped++; return; }
    const key = `${c.x},${c.y},${c.z}`;
    if (!cells.has(key) && cells.size >= DESIGN_MAX_CELLS) fail(`mehr als ${DESIGN_MAX_CELLS.toLocaleString('de-DE')} Blöcke. Bitte in kleineren Teilen gestalten.`);
    cells.set(key, c);
    lo = [Math.min(lo[0]!, c.x), Math.min(lo[1]!, c.y), Math.min(lo[2]!, c.z)];
    hi = [Math.max(hi[0]!, c.x), Math.max(hi[1]!, c.y), Math.max(hi[2]!, c.z)];
  };
  visitDesign(base, d, add);
  for (const c of extra) add(c);
  if (!cells.size) return null;
  const palette: BlockState[] = [], index = new Map<string, number>();
  const stateOf = (c: DesignCell): number => {
    const key = c.state ? `${c.state.id}[${Object.entries(c.state.properties).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join(',')}]` : c.id;
    let i = index.get(key);
    if (i === undefined) {
      const state = c.state ?? (c.id === WATER_ID ? { id: c.id, properties: { level: '0' } } : completeState({ id: c.id, properties: {} }) ?? { id: c.id, properties: {} });
      i = palette.length; palette.push(state); index.set(key, i);
    }
    return i;
  };
  let blocks = 0, air = 0;
  const out: Cell[] = [...cells.values()].map(c => {
    const position = [c.x - lo[0]!, c.y - lo[1]!, c.z - lo[2]!] as const;
    if (c.id === AIR) { air++; return { position: [...position] as [number, number, number], kind: 'air' as const, paletteIndex: stateOf(c) }; }
    blocks++;
    return { position: [...position] as [number, number, number], kind: 'block' as const, paletteIndex: stateOf(c) };
  });
  const size: [number, number, number] = [hi[0]! - lo[0]! + 1, hi[1]! - lo[1]! + 1, hi[2]! - lo[2]! + 1];
  const payload = createPayload({ schemaVersion: 1, profileId, bounds: { min: [0, 0, 0], maxExclusive: size }, pivot: [0, 0, 0], sourceOrigin: [lo[0]!, lo[1]!, lo[2]!], palette, cells: out, blockEntities: [] });
  return { payload, origin: [lo[0]!, lo[1]!, lo[2]!], blocks, air, skipped };
}

/**
 * The planned terrain as a survey (same area and dimension), so the world map
 * and the Anlagen planner use it exactly like a Geländeaufnahme. Unchanged
 * columns keep the measured surface (trees, lava); changed ones show the
 * planned top or water.
 */
export function designedSurvey(base: TerrainSurvey, d: TerrainDesign, extra: readonly DesignCell[] = []): TerrainSurvey {
  if (!designMatchesBase(d, base)) fail('Gestaltung und Grundlage haben verschiedene Bereiche');
  const n = d.width * d.length;
  const ids = [...base.ids], index = new Map(ids.map((id, i) => [id, i] as const));
  const idOf = (id: string) => { let i = index.get(id); if (i === undefined) { i = ids.length; ids.push(id); index.set(id, i); } return i; };
  const surface = base.surface.slice(), surfaceBlock = base.surfaceBlock.slice(), ground = base.ground.slice(), groundBlock = base.groundBlock.slice();
  const water = idOf(WATER_ID);
  for (let i = 0; i < n; i++) {
    const h = d.height[i]!;
    if (h === SURVEY_UNKNOWN || base.surface[i] === SURVEY_UNKNOWN || !base.groundBlock[i]) continue;
    const g = base.ground[i]!, top = d.ids[d.top[i]!]!, sTop = base.ids[base.surfaceBlock[i]!] ?? '';
    const baseWater = sTop === WATER_ID && base.surface[i]! > g ? base.surface[i]! : NO_WATER;
    const deck = d.path[i]! >= PATH_DECK && d.water[i] !== NO_WATER && d.step[i] ? d.ids[d.step[i]!]! : null;
    if (h === g && top === base.ids[base.groundBlock[i]!] && d.water[i] === baseWater && !deck) continue;
    ground[i] = h; groundBlock[i] = idOf(top);
    // A bridge deck is the visible surface over its water (the world map draws the bridge).
    if (deck) { surface[i] = d.water[i]! + 1; surfaceBlock[i] = idOf(deck); }
    else if (d.water[i] !== NO_WATER) { surface[i] = d.water[i]!; surfaceBlock[i] = water; }
    else { surface[i] = h; surfaceBlock[i] = groundBlock[i]!; }
  }
  // Streu-Ebene: trees and rocks raise the visible surface (plants do not, like in a real survey).
  for (const c of extra) {
    const gx = c.x - d.minX, gz = c.z - d.minZ;
    if (gx < 0 || gz < 0 || gx >= d.width || gz >= d.length || c.id === AIR || SURFACE_SKIP_IDS.has(c.id)) continue;
    const i = gx + gz * d.width;
    if (surface[i] === SURVEY_UNKNOWN || c.y < surface[i]!) continue;
    surface[i] = c.y; surfaceBlock[i] = idOf(c.id);
  }
  return createSurvey({ minX: base.minX, minZ: base.minZ, width: base.width, length: base.length, surface, surfaceBlock, ground, groundBlock, ids },
    { dimension: base.dimension, readAt: d.updatedAt, newestChunkSave: base.newestChunkSave, dataVersions: base.dataVersions, regions: base.regions });
}

export const DESIGN_NOTE = 'Geplantes Gelände (Höhenkarte): Höhlen und Überhänge kennt es nicht. In der Welt ändert sich nichts, bis du die Blöcke selbst baust (Bauteil im Projekt, Export oder Mod).';
