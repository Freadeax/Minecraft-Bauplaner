import type { BlockState, Cell, VoxelPayload } from '../../voxel/src/types.js';
import { createPayload } from '../../voxel/src/validation.js';
import { completeState } from '../../voxel/src/blocklogic/facts.js';
import type { OriginalFile } from './backup.js';
import { sha256Hex } from './hash.js';
import { checkSurveyArea, createSurvey, SURVEY_UNKNOWN } from './terrainSurvey.js';
import type { ColumnBase, SurveyArea, TerrainSurvey } from './terrainSurvey.js';
import { DomainError } from './types.js';

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
  /** 1 = path column. */
  readonly path: Uint8Array;
  /** Block id palette; index 0 is reserved (unknown). Tools append. */
  readonly ids: string[];
  updatedAt: string;
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
    ids: [''], updatedAt: new Date().toISOString() };
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
  return { ...d, height: d.height.slice(), top: d.top.slice(), fill: d.fill.slice(), water: d.water.slice(), path: d.path.slice(), ids: [...d.ids] };
}

// ------------------------------------------------------------------ file

/** Binary file: "BPTDES01", uint32 LE header length, header JSON, padding to even, then height, top, fill, water (16 bit LE) and path (8 bit). */
export function encodeDesign(d: TerrainDesign): Uint8Array {
  const header = new TextEncoder().encode(JSON.stringify({ schemaVersion: d.schemaVersion, dimension: d.dimension, base: d.base, minX: d.minX, minZ: d.minZ, width: d.width, length: d.length, ids: d.ids, updatedAt: d.updatedAt }));
  const start = 12 + header.length + ((12 + header.length) % 2), n = d.width * d.length;
  const out = new Uint8Array(start + n * 9), view = new DataView(out.buffer);
  out.set(new TextEncoder().encode(MAGIC), 0);
  view.setUint32(8, header.length, true);
  out.set(header, 12);
  [d.height, d.top, d.fill, d.water].forEach((a, k) => {
    const base = start + k * n * 2;
    if (a instanceof Int16Array) for (let i = 0; i < n; i++) view.setInt16(base + i * 2, a[i]!, true);
    else for (let i = 0; i < n; i++) view.setUint16(base + i * 2, a[i]!, true);
  });
  out.set(d.path, start + n * 8);
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
  if (bytes.length !== start + n * 9) fail('Datengröße passt nicht zum Bereich');
  const read16 = (k: number, signed: boolean) => {
    const a = signed ? new Int16Array(n) : new Uint16Array(n), b = start + k * n * 2;
    for (let i = 0; i < n; i++) a[i] = signed ? view.getInt16(b + i * 2, true) : view.getUint16(b + i * 2, true);
    return a;
  };
  const ids = h.ids as string[];
  const d: TerrainDesign = { schemaVersion: DESIGN_SCHEMA_VERSION, dimension: h.dimension as string, base, ...area,
    height: read16(0, true) as Int16Array, top: read16(1, false) as Uint16Array, fill: read16(2, false) as Uint16Array, water: read16(3, true) as Int16Array,
    path: bytes.slice(start + n * 8, start + n * 9), ids: [...ids], updatedAt: typeof h.updatedAt === 'string' ? h.updatedAt : new Date(0).toISOString() };
  for (let i = 0; i < n; i++) if (d.top[i]! >= ids.length || d.fill[i]! >= ids.length || d.path[i]! > 1) fail('Blockindex außerhalb der Liste');
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

export type BrushTool = 'raise' | 'lower' | 'smooth' | 'flatten' | 'roughen' | 'terrace' | 'soften' | 'paint' | 'drain';
export type Falloff = 'hard' | 'soft' | 'cone';

export interface Brush {
  readonly tool: BrushTool;
  /** 0 = one column. */
  readonly radius: number;
  /** Blocks per dab (raise/lower/roughen), passes (smooth), maximum step (soften). */
  readonly strength: number;
  readonly falloff: Falloff;
  /** Target height (flatten). */
  readonly target?: number;
  /** Terrace height (terrace). */
  readonly step?: number;
  /** Surface style id (paint). */
  readonly style?: string;
  /** Paint only where these hold (WorldPainter-like filter). */
  readonly filter?: PaintFilter;
}

export interface PaintFilter { readonly minY?: number; readonly maxY?: number; readonly minSlope?: number; readonly maxSlope?: number; readonly onlyDry?: boolean }

export const BRUSH_LABEL: Readonly<Record<BrushTool, string>> = {
  raise: 'Anheben', lower: 'Absenken', smooth: 'Glätten', flatten: 'Einebnen', roughen: 'Aufrauen', terrace: 'Terrassen', soften: 'Hänge abflachen', paint: 'Bemalen', drain: 'Wasser entfernen',
};

export const brushWeight = (dist: number, radius: number, falloff: Falloff): number => {
  if (dist > radius + 0.5) return 0;
  if (falloff === 'hard') return 1;
  const t = Math.min(1, dist / (radius + 1));
  return falloff === 'cone' ? 1 - t : 0.5 * (1 + Math.cos(Math.PI * t));
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

const passes = (d: TerrainDesign, x: number, z: number, f: PaintFilter | undefined): boolean => {
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

const setHeight = (d: TerrainDesign, i: number, h: number, lim: [number, number]): boolean => {
  const v = Math.max(lim[0], Math.min(lim[1], Math.round(h)));
  if (v === d.height[i]) return false;
  d.height[i] = v;
  if (d.water[i] !== NO_WATER && v >= d.water[i]!) d.water[i] = NO_WATER;
  return true;
};

/** Paints one column with a style. */
export function paintColumn(d: TerrainDesign, i: number, style: SurfaceStyle): boolean {
  const x = d.minX + i % d.width, z = d.minZ + Math.floor(i / d.width);
  const t = idIndex(d, pickTop(style, x, z)), f = idIndex(d, style.fill);
  const p = style.path ? 1 : 0;
  if (d.top[i] === t && d.fill[i] === f && d.path[i] === p) return false;
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
      if (d.height[i] === SURVEY_UNKNOWN) continue;
      const w = brushWeight(Math.hypot(x - gx, z - gz), r, b.falloff);
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
    case 'flatten': {
      const target = b.target ?? d.height[Math.max(0, Math.min(d.width - 1, gx)) + Math.max(0, Math.min(d.length - 1, gz)) * d.width]!;
      if (target === SURVEY_UNKNOWN) return 0;
      each((i, w) => setHeight(d, i, d.height[i]! + (target - d.height[i]!) * w, lim));
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
    case 'paint': each((i, w, x, z) => w >= 0.5 && passes(d, x, z, b.filter) && paintColumn(d, i, style!)); break;
    case 'drain': each((i, w) => { if (w < 0.5 || d.water[i] === NO_WATER) return false; d.water[i] = NO_WATER; return true; }); break;
  }
  if (changed) d.updatedAt = new Date().toISOString();
  return changed;
}

/** Columns along a stroke from (x0,z0) to (x1,z1), spaced for brushes of the given radius. */
export function strokePoints(x0: number, z0: number, x1: number, z1: number, radius: number): [number, number][] {
  const len = Math.hypot(x1 - x0, z1 - z0), spacing = Math.max(1, radius / 2), n = Math.max(1, Math.ceil(len / spacing));
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

export interface PathOptions {
  /** Path width in blocks (1–9). */
  readonly width: number;
  /** Path style id (SURFACE_STYLES with `path`). */
  readonly style: string;
  /** Highest height change between two path blocks (1 = walkable without jumping onto full blocks). */
  readonly maxStep?: number;
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
}

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
 * becomes a causeway at water level.
 */
export function layPath(d: TerrainDesign, points: readonly (readonly [number, number])[], o: PathOptions): PathReport {
  const style = styleById(o.style);
  if (!style.path) fail(`„${style.label}“ ist kein Wegbelag`);
  const width = Math.max(1, Math.min(9, Math.round(o.width))), maxStep = Math.max(1, Math.min(4, Math.round(o.maxStep ?? 1)));
  const lim = heightLimits(d.dimension);
  const line = pathLine(points).filter(([x, z]) => x >= d.minX && z >= d.minZ && x < d.minX + d.width && z < d.minZ + d.length);
  if (!line.length) return { length: 0, columns: 0, steps: 0, rise: 0, causeway: 0, cut: 0, fill: 0, unknown: 0 };
  const at = (x: number, z: number) => (x - d.minX) + (z - d.minZ) * d.width;
  // Centre heights: ground, at least the water surface (causeway); unknown takes the previous one.
  let unknown = 0;
  const floor = line.map(([x, z]) => { const i = at(x, z); return d.height[i] !== SURVEY_UNKNOWN && d.water[i] !== NO_WATER ? d.water[i]! : -Infinity; });
  const raw = line.map(([x, z], k) => {
    const i = at(x, z), h = d.height[i]!;
    if (h === SURVEY_UNKNOWN) { unknown++; return NaN; }
    return Math.max(h, floor[k]!);
  });
  const firstKnown = raw.find(v => !Number.isNaN(v));
  if (firstKnown === undefined) return { length: line.length, columns: 0, steps: 0, rise: 0, causeway: 0, cut: 0, fill: 0, unknown };
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
  // Assign each column of the width to its nearest centre point.
  const half = (width - 1) / 2, owner = new Map<number, { k: number; dist: number }>();
  line.forEach(([x, z], k) => {
    const r = Math.ceil(half);
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const dist = width % 2 ? Math.max(Math.abs(dx), Math.abs(dz)) : Math.hypot(dx, dz);
      if (dist > half + (width % 2 ? 0 : 0.5)) continue;
      const nx = x + dx, nz = z + dz;
      if (nx < d.minX || nz < d.minZ || nx >= d.minX + d.width || nz >= d.minZ + d.length) continue;
      const i = at(nx, nz);
      if (d.height[i] === SURVEY_UNKNOWN) continue;
      const before = owner.get(i), exact = Math.hypot(dx, dz);
      if (!before || exact < before.dist) owner.set(i, { k, dist: exact });
    }
  });
  let cut = 0, fill = 0, causeway = 0;
  for (const [i, { k }] of owner) {
    const target = Math.max(lim[0], Math.min(lim[1], h[k]!)), before = d.height[i]!;
    if (d.water[i] !== NO_WATER) { causeway++; d.water[i] = NO_WATER; }
    if (target > before) fill += target - before; else cut += before - target;
    d.height[i] = target;
    paintColumn(d, i, style);
  }
  let steps = 0, rise = 0;
  for (let k = 1; k < h.length; k++) if (h[k] !== h[k - 1]) { steps++; rise += Math.abs(h[k]! - h[k - 1]!); }
  d.updatedAt = new Date().toISOString();
  return { length: line.length, columns: owner.size, steps, rise, causeway, cut, fill, unknown };
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
    d.water[i] = fresh.water[i]!; d.path[i] = 0;
  }
  d.updatedAt = new Date().toISOString();
}

// ------------------------------------------------------------------ comparison and blocks

/** One cell the design asks for, world coordinates. */
interface DesignCell { readonly x: number; readonly y: number; readonly z: number; readonly id: string }

const AIR = 'minecraft:air';

/**
 * Visits every block a design asks for, compared with its base. Changed
 * columns: filler and top where ground is raised, explicit air where it is
 * removed (up to the old surface, so plants and leaves over the column are
 * cleared), the top block repainted, water up to the planned surface and air
 * where water is drained. Unchanged columns produce nothing.
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
    if (!heightChanged && !topChanged && !waterChanged) continue;
    const x = d.minX + gx, z = d.minZ + gz;
    for (let y = g + 1; y < h; y++) visit({ x, y, z, id: filler });
    if (heightChanged || topChanged) visit({ x, y: h, z, id: top });
    for (let y = h + 1; y <= w; y++) visit({ x, y, z, id: WATER_ID });
    // Above the new ground (and above new water): clear what was there.
    const oldTop = Math.max(g, base.surface[i]!);
    if (heightChanged || waterChanged) for (let y = Math.max(h, w === NO_WATER ? h : w) + 1; y <= oldTop; y++) visit({ x, y, z, id: AIR });
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
  readonly heightRange: readonly [number, number] | null;
  /** Blocks to place (not air), most first. */
  readonly materials: readonly { readonly id: string; readonly count: number }[];
}

/** Compares a design with its base. */
export function compareDesign(base: TerrainSurvey, d: TerrainDesign): DesignStats {
  if (!designMatchesBase(d, base)) fail('Gestaltung und Grundlage haben verschiedene Bereiche');
  let known = 0, changed = 0, raised = 0, lowered = 0, repainted = 0, cut = 0, fill = 0, drained = 0, path = 0, lo = Infinity, hi = -Infinity;
  for (let i = 0; i < d.height.length; i++) {
    const h = d.height[i]!;
    if (h === SURVEY_UNKNOWN || base.surface[i] === SURVEY_UNKNOWN || !base.groundBlock[i]) continue;
    known++; lo = Math.min(lo, h); hi = Math.max(hi, h);
    if (d.path[i]) path++;
    const g = base.ground[i]!, sTop = base.ids[base.surfaceBlock[i]!] ?? '';
    const baseWater = sTop === WATER_ID && base.surface[i]! > g ? base.surface[i]! : NO_WATER;
    const topChanged = d.ids[d.top[i]!] !== base.ids[base.groundBlock[i]!];
    if (h !== g || topChanged || d.water[i] !== baseWater) changed++;
    if (h > g) { raised++; fill += h - g; } else if (h < g) { lowered++; cut += g - h; } else if (topChanged) repainted++;
    if (baseWater !== NO_WATER && d.water[i] === NO_WATER) drained++;
  }
  const counts = new Map<string, number>();
  let water = 0;
  visitDesign(base, d, c => { if (c.id === AIR) return; if (c.id === WATER_ID) water++; counts.set(c.id, (counts.get(c.id) ?? 0) + 1); });
  return { known, changed, raised, lowered, repainted, cut, fill, water, drained, path, heightRange: Number.isFinite(lo) ? [lo, hi] : null,
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
export function designPayload(base: TerrainSurvey, d: TerrainDesign, profileId: string, skip?: (x: number, y: number, z: number) => boolean): DesignBlocks | null {
  const cells: DesignCell[] = [];
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity], skipped = 0;
  visitDesign(base, d, c => {
    if (skip?.(c.x, c.y, c.z)) { skipped++; return; }
    if (cells.length >= DESIGN_MAX_CELLS) fail(`mehr als ${DESIGN_MAX_CELLS.toLocaleString('de-DE')} Blöcke. Bitte in kleineren Teilen gestalten.`);
    cells.push(c);
    lo = [Math.min(lo[0]!, c.x), Math.min(lo[1]!, c.y), Math.min(lo[2]!, c.z)];
    hi = [Math.max(hi[0]!, c.x), Math.max(hi[1]!, c.y), Math.max(hi[2]!, c.z)];
  });
  if (!cells.length) return null;
  const palette: BlockState[] = [], index = new Map<string, number>();
  const stateOf = (id: string): number => {
    let i = index.get(id);
    if (i === undefined) {
      const state = id === WATER_ID ? { id, properties: { level: '0' } } : completeState({ id, properties: {} }) ?? { id, properties: {} };
      i = palette.length; palette.push(state); index.set(id, i);
    }
    return i;
  };
  let blocks = 0, air = 0;
  const out: Cell[] = cells.map(c => {
    const position = [c.x - lo[0]!, c.y - lo[1]!, c.z - lo[2]!] as const;
    if (c.id === AIR) { air++; return { position: [...position] as [number, number, number], kind: 'air' as const, paletteIndex: stateOf(AIR) }; }
    blocks++;
    return { position: [...position] as [number, number, number], kind: 'block' as const, paletteIndex: stateOf(c.id) };
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
export function designedSurvey(base: TerrainSurvey, d: TerrainDesign): TerrainSurvey {
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
    if (h === g && top === base.ids[base.groundBlock[i]!] && d.water[i] === baseWater) continue;
    ground[i] = h; groundBlock[i] = idOf(top);
    if (d.water[i] !== NO_WATER) { surface[i] = d.water[i]!; surfaceBlock[i] = water; }
    else { surface[i] = h; surfaceBlock[i] = groundBlock[i]!; }
  }
  return createSurvey({ minX: base.minX, minZ: base.minZ, width: base.width, length: base.length, surface, surfaceBlock, ground, groundBlock, ids },
    { dimension: base.dimension, readAt: d.updatedAt, newestChunkSave: base.newestChunkSave, dataVersions: base.dataVersions, regions: base.regions });
}

export const DESIGN_NOTE = 'Geplantes Gelände (Höhenkarte): Höhlen und Überhänge kennt es nicht. In der Welt ändert sich nichts, bis du die Blöcke selbst baust (Bauteil im Projekt, Export oder Mod).';
