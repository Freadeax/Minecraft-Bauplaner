import { DomainError } from '../core/types.js';
import { LIVE_MAX_CHUNKS_PER_REQUEST, classifyRuns, readLiveChunks } from '../team/liveLink.js';
import type { LiveColumn } from '../team/liveLink.js';
import { SURVEY_UNKNOWN, checkSurveyArea, createSurvey } from './terrainSurvey.js';
import type { SurveyArea, TerrainSurvey } from './terrainSurvey.js';
import { NO_WATER, paintColumn, styleById } from './terrainDesign.js';
import type { TerrainDesign } from './terrainDesign.js';

/**
 * Gelände direkt aus der Mod (TERRAIN-04, mod 0.20.0). The Gelände and Landschaft tabs take a building
 * site's terrain from the game instead of region files:
 *
 * - `GET /v1/terrain?c=x,z;…` (feature `terrain`): per chunk the surface runs like `/v1/chunks`, plus
 *   `at` (when the game saw it), `live` (loaded right now) and the surface biome per column. Chunks the
 *   client has not loaded come from the mod's Geländegedächtnis (everything the player has seen in this
 *   world, saved on the player's computer). Older mods only have `/v1/chunks` (loaded chunks, no biomes);
 *   the planner falls back to it.
 * - `GET /v1/terrain/known?a=x0,z0,x1,z1` (chunk coordinates, inclusive): which chunks the memory holds.
 * - `GET /v1/box?b=x0,y0,z0,x1,y1,z1` (feature `box`): every block of a world box from the loaded chunks,
 *   for the block-exact check (`checkTerrain`) without region files.
 *
 * Classification stays on the website (`classifyRuns`, same rules as the region-file survey).
 */

const fail = (message: string): never => { throw new DomainError('LIVELINK', `Mod-Gelände: ${message}`); };
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const int = (v: unknown, what: string, min: number, max: number): number => {
  if (!Number.isInteger(v) || (v as number) < min || (v as number) > max) fail(`${what} muss ganzzahlig sein`);
  return v as number;
};
const ID = /^[a-z0-9_.-]{1,64}:[a-z0-9_./-]{1,128}$/;
const STATE = /^[a-z0-9_.-]+:[a-z0-9_./-]+(\[[a-z0-9_]+=[a-z0-9_.+-]+(,[a-z0-9_]+=[a-z0-9_.+-]+)*])?$/;

/** Largest box `GET /v1/box` reads (same as BoxRead.MAX_CELLS in the mod). */
export const LIVE_BOX_MAX_CELLS = 2_000_000;
/** Chunk rectangle `GET /v1/terrain/known` answers at most (same as TerrainMemory.MAX_KNOWN). */
export const LIVE_KNOWN_MAX_CHUNKS = 4096;

export interface LiveTerrainChunk {
  readonly x: number; readonly z: number;
  /** When the game read it (ms since epoch); 0 for `/v1/chunks` answers (read now). */
  readonly at: number;
  /** Loaded in the client right now (else from the Geländegedächtnis). */
  readonly live: boolean;
  readonly columns: readonly (LiveColumn | null)[];
  /** Biome id per column; null without biomes (older mods). */
  readonly biomes: readonly string[] | null;
}
export interface LiveTerrain { readonly dimension: string; readonly chunks: readonly LiveTerrainChunk[]; readonly missing: readonly (readonly [number, number])[] }

/** Strict reader for `GET /v1/terrain` (and, with `legacy`, `/v1/chunks`). */
export function readLiveTerrain(raw: unknown, legacy = false, now = Date.now()): LiveTerrain {
  const base = readLiveChunks(raw);
  const r = raw as Record<string, unknown>;
  const biomeIds = legacy ? [] : Array.isArray(r.biomes) && r.biomes.length <= 65_535 ? (r.biomes as unknown[]).map(b => typeof b === 'string' && ID.test(b) ? b : fail('Biom-ID ungültig')) : fail('Biomliste fehlt');
  const rawChunks = r.chunks as unknown[];
  const chunks = base.chunks.map((c, k): LiveTerrainChunk => {
    const columns = c.columns.map(runs => runs.length ? classifyRuns(runs, base.ids) : null);
    if (legacy) return { x: c.x, z: c.z, at: now, live: true, columns, biomes: null };
    const ch = rawChunks[k] as Record<string, unknown>;
    const at = int(ch.at, 'Lesezeit', 0, 8.64e15);
    if (typeof ch.live !== 'boolean') fail('live fehlt');
    if (!Array.isArray(ch.biome) || ch.biome.length !== 256) fail('Chunk braucht 256 Biome');
    const biomes = (ch.biome as unknown[]).map(b => biomeIds[int(b, 'Biomindex', 0, biomeIds.length - 1)]!);
    return { x: c.x, z: c.z, at, live: ch.live as boolean, columns, biomes };
  });
  return { dimension: base.dimension, chunks, missing: base.missing };
}

/** Chunks (inclusive rectangle) covering a survey area. */
export function areaChunks(area: SurveyArea): { x0: number; z0: number; x1: number; z1: number; count: number } {
  const x0 = Math.floor(area.minX / 16), z0 = Math.floor(area.minZ / 16);
  const x1 = Math.floor((area.minX + area.width - 1) / 16), z1 = Math.floor((area.minZ + area.length - 1) / 16);
  return { x0, z0, x1, z1, count: (x1 - x0 + 1) * (z1 - z0 + 1) };
}

/** Chunk lists of at most 64 for the requests, row by row from the north-west. */
export function chunkBatches(area: SurveyArea, skip: (x: number, z: number) => boolean = () => false, size = LIVE_MAX_CHUNKS_PER_REQUEST): [number, number][][] {
  const a = areaChunks(area), out: [number, number][][] = [];
  let cur: [number, number][] = [];
  for (let z = a.z0; z <= a.z1; z++) for (let x = a.x0; x <= a.x1; x++) {
    if (skip(x, z)) continue;
    cur.push([x, z]);
    if (cur.length === size) { out.push(cur); cur = []; }
  }
  if (cur.length) out.push(cur);
  return out;
}

export interface LiveKnown { readonly dimension: string; readonly total: number; readonly chunks: readonly (readonly [number, number, number])[] }

/** Strict reader for `GET /v1/terrain/known`. */
export function readLiveKnown(raw: unknown): LiveKnown {
  if (!isObj(raw)) return fail('Antwort ist kein Objekt');
  if (typeof raw.dimension !== 'string' || !ID.test(raw.dimension)) fail('Dimension ungültig');
  if (!Array.isArray(raw.chunks) || raw.chunks.length > LIVE_KNOWN_MAX_CHUNKS) fail('Chunkliste ungültig');
  const chunks = (raw.chunks as unknown[]).map(c => Array.isArray(c) && c.length === 3
    ? [int(c[0], 'Chunk X', -2e6, 2e6), int(c[1], 'Chunk Z', -2e6, 2e6), int(c[2], 'Lesezeit', 0, 8.64e15)] as const : fail('Chunk ungültig'));
  return { dimension: raw.dimension as string, total: int(raw.total, 'Anzahl', 0, 1e7), chunks };
}

/** Query value of `GET /v1/terrain/known` for an area (null when larger than the mod answers). */
export function knownQuery(area: SurveyArea): string | null {
  const a = areaChunks(area);
  return a.count > LIVE_KNOWN_MAX_CHUNKS ? null : `${a.x0},${a.z0},${a.x1},${a.z1}`;
}

export interface TerrainCoverage {
  readonly chunks: number;
  readonly known: number;
  /** Fraction 0…1 of the area's chunks the game knows. */
  readonly share: number;
  /** Oldest and newest reading of the known chunks (ms), null when none. */
  readonly oldest: number | null;
  readonly newest: number | null;
  /** Where most missing chunks are, seen from the area centre ("im Norden", …); empty when complete. */
  readonly missingSide: string;
}

/** How much of an area the Geländegedächtnis covers, for the hint "lauf einmal um den Bauplatz". */
export function terrainCoverage(area: SurveyArea, known: readonly (readonly [number, number, number])[]): TerrainCoverage {
  const a = areaChunks(area), have = new Map(known.map(([x, z, at]) => [`${x},${z}`, at] as const));
  let k = 0, oldest = Infinity, newest = -Infinity, mx = 0, mz = 0, missing = 0;
  const cx = (a.x0 + a.x1) / 2, cz = (a.z0 + a.z1) / 2;
  for (let z = a.z0; z <= a.z1; z++) for (let x = a.x0; x <= a.x1; x++) {
    const at = have.get(`${x},${z}`);
    if (at === undefined) { missing++; mx += x - cx; mz += z - cz; continue; }
    k++; oldest = Math.min(oldest, at); newest = Math.max(newest, at);
  }
  let side = '';
  if (missing) {
    const ax = mx / missing, az = mz / missing;
    if (Math.hypot(ax, az) < 0.75) side = 'rundherum';
    else {
      const ns = az < -0.4 * Math.abs(ax) ? 'Norden' : az > 0.4 * Math.abs(ax) ? 'Süden' : '';
      const ew = ax > 0.4 * Math.abs(az) ? 'Osten' : ax < -0.4 * Math.abs(az) ? 'Westen' : '';
      side = ns && ew ? `im ${ns === 'Norden' ? 'Nord' : 'Süd'}${ew === 'Osten' ? 'osten' : 'westen'}` : `im ${ns || ew}`;
    }
  }
  return { chunks: a.count, known: k, share: a.count ? k / a.count : 0, oldest: k ? oldest : null, newest: k ? newest : null, missingSide: side };
}

/**
 * Geländeaufnahme (TERRAIN-01 format, source `mod`) of an area from terrain answers. Columns of chunks
 * the game did not deliver stay unknown. Biomes are kept when every delivered chunk has them.
 */
export function surveyFromLiveTerrain(area: SurveyArea, dimension: string, chunks: Iterable<LiveTerrainChunk>, readAt = new Date().toISOString()): TerrainSurvey {
  checkSurveyArea(area);
  const byKey = new Map<string, LiveTerrainChunk>();
  let withBiomes = true, any = false, newest = 0;
  for (const c of chunks) { byKey.set(`${c.x},${c.z}`, c); any = true; if (!c.biomes) withBiomes = false; newest = Math.max(newest, c.at); }
  const n = area.width * area.length;
  const surface = new Int16Array(n).fill(SURVEY_UNKNOWN), ground = new Int16Array(n).fill(SURVEY_UNKNOWN);
  const surfaceBlock = new Uint16Array(n), groundBlock = new Uint16Array(n), biomeData = new Uint16Array(n);
  const ids = ['minecraft:air'], index = new Map<string, number>([['minecraft:air', 0]]);
  const biomeIds = ['minecraft:plains'], biomeIndex = new Map<string, number>([['minecraft:plains', 0]]);
  const idOf = (id: string) => { let i = index.get(id); if (i === undefined) { i = ids.length; ids.push(id); index.set(id, i); } return i; };
  const biomeOf = (id: string) => { let i = biomeIndex.get(id); if (i === undefined) { i = biomeIds.length; biomeIds.push(id); biomeIndex.set(id, i); } return i; };
  for (let dz = 0; dz < area.length; dz++) for (let dx = 0; dx < area.width; dx++) {
    const x = area.minX + dx, z = area.minZ + dz, c = byKey.get(`${Math.floor(x / 16)},${Math.floor(z / 16)}`);
    if (!c) continue;
    const ci = ((z & 15) << 4) | (x & 15), col = c.columns[ci];
    if (!col) continue;
    const k = dx + dz * area.width;
    surface[k] = col.surface; surfaceBlock[k] = idOf(col.surfaceId); ground[k] = col.ground; groundBlock[k] = idOf(col.groundId);
    if (c.biomes) biomeData[k] = biomeOf(c.biomes[ci]!);
  }
  return createSurvey({ ...area, surface, surfaceBlock, ground, groundBlock, ids }, {
    dimension, readAt, newestChunkSave: Math.floor(newest / 1000), source: 'mod',
    ...(any && withBiomes && { biomes: { ids: biomeIds, data: biomeData } }),
  });
}

// ------------------------------------------------------------------ box

export interface LiveBox {
  readonly dimension: string;
  /** World box, max exclusive. */
  readonly min: readonly [number, number, number];
  readonly maxExclusive: readonly [number, number, number];
  readonly palette: readonly string[];
  /** Palette index per cell, `x + z·W + y·W·L`. */
  readonly data: Uint16Array;
  readonly unloaded: number;
}

/** Query value of `GET /v1/box` (max exclusive); throws when the box is bigger than the mod reads. */
export function boxQuery(min: readonly number[], maxExclusive: readonly number[]): string {
  const v = (maxExclusive[0]! - min[0]!) * (maxExclusive[1]! - min[1]!) * (maxExclusive[2]! - min[2]!);
  if (!(v > 0)) fail('Bereich ist leer');
  if (v > LIVE_BOX_MAX_CELLS) fail(`Bereich zu groß für die Mod (${v.toLocaleString('de-DE')} Zellen, höchstens ${LIVE_BOX_MAX_CELLS.toLocaleString('de-DE')}). Große Projekte mit den Regionsdateien prüfen.`);
  return [...min, ...maxExclusive].join(',');
}

const decodeBase64 = (text: string): Uint8Array => {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(text)) fail('Blockdaten ungültig');
  if (typeof atob === 'function') { const b = atob(text), out = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i); return out; }
  return new Uint8Array((globalThis as unknown as { Buffer: { from(t: string, e: string): Uint8Array } }).Buffer.from(text, 'base64'));
};

/** Strict reader for `GET /v1/box`. */
export function readLiveBox(raw: unknown): LiveBox {
  if (!isObj(raw)) return fail('Antwort ist kein Objekt');
  if (typeof raw.dimension !== 'string' || !ID.test(raw.dimension)) fail('Dimension ungültig');
  if (!Array.isArray(raw.box) || raw.box.length !== 6) fail('Bereich ungültig');
  const b = (raw.box as unknown[]).map((v, i) => int(v, 'Bereich', i % 3 === 1 ? -2048 : -3e7, i % 3 === 1 ? 2048 : 3e7));
  const size = [b[3]! - b[0]!, b[4]! - b[1]!, b[5]! - b[2]!];
  if (size.some(s => s <= 0) || size[0]! * size[1]! * size[2]! > LIVE_BOX_MAX_CELLS) fail('Bereich ungültig');
  if (!Array.isArray(raw.palette) || !raw.palette.length || raw.palette.length > 65_535) fail('Palette ungültig');
  const palette = (raw.palette as unknown[]).map(p => typeof p === 'string' && STATE.test(p) ? p : fail('Blockzustand ungültig'));
  if (typeof raw.data !== 'string') fail('Blockdaten fehlen');
  const bytes = decodeBase64(raw.data as string), n = size[0]! * size[1]! * size[2]!;
  if (bytes.length !== n * 2) fail('Blockdaten passen nicht zum Bereich');
  const data = new Uint16Array(n);
  for (let i = 0; i < n; i++) { const v = bytes[2 * i]! | (bytes[2 * i + 1]! << 8); if (v >= palette.length) fail('Blockindex außerhalb der Palette'); data[i] = v; }
  return { dimension: raw.dimension as string, min: [b[0]!, b[1]!, b[2]!], maxExclusive: [b[3]!, b[4]!, b[5]!], palette, data, unloaded: int(raw.unloaded, 'Ungeladen', 0, n) };
}

// ------------------------------------------------------------------ biomes → landscape styles

/** Landscape surface style (terrainDesign SURFACE_STYLES) that paints like a Minecraft biome; null keeps the paint (water, caves). */
export function styleForBiome(id: string): string | null {
  const b = id.replace(/^minecraft:/, '');
  if (/ocean|river/.test(b)) return null;
  if (/beach|shore/.test(b) && !/stony/.test(b)) return 'strand';
  if (/stony|windswept_gravelly|jagged|peaks/.test(b)) return /snowy|frozen|jagged/.test(b) ? 'schnee' : 'fels';
  if (/swamp|mangrove/.test(b)) return 'sumpf';
  if (/snowy|frozen|ice_spikes|^grove$/.test(b)) return 'schnee';
  if (/desert|badlands/.test(b)) return 'wueste';
  if (/lush|moss|pale_garden/.test(b)) return 'moos';
  if (/forest|taiga|jungle|grove|dark/.test(b)) return 'wald';
  if (/savanna|windswept/.test(b)) return 'geroell';
  return 'wiese';
}

/** German name of a biome for legends ("minecraft:dark_forest" → "Dark Forest" falls unbekannt). */
export const BIOME_LABEL: Readonly<Record<string, string>> = {
  'minecraft:plains': 'Ebene', 'minecraft:sunflower_plains': 'Sonnenblumenebene', 'minecraft:meadow': 'Wiese', 'minecraft:forest': 'Wald', 'minecraft:flower_forest': 'Blumenwald',
  'minecraft:birch_forest': 'Birkenwald', 'minecraft:dark_forest': 'Dunkelwald', 'minecraft:pale_garden': 'Blasser Garten', 'minecraft:taiga': 'Taiga', 'minecraft:snowy_taiga': 'Verschneite Taiga',
  'minecraft:old_growth_pine_taiga': 'Urtaiga (Kiefern)', 'minecraft:old_growth_spruce_taiga': 'Urtaiga (Fichten)', 'minecraft:old_growth_birch_forest': 'Birkenurwald', 'minecraft:jungle': 'Dschungel',
  'minecraft:sparse_jungle': 'Lichter Dschungel', 'minecraft:bamboo_jungle': 'Bambusdschungel', 'minecraft:savanna': 'Savanne', 'minecraft:savanna_plateau': 'Savannenhochebene', 'minecraft:desert': 'Wüste',
  'minecraft:badlands': 'Tafelberge', 'minecraft:swamp': 'Sumpf', 'minecraft:mangrove_swamp': 'Mangrovensumpf', 'minecraft:river': 'Fluss', 'minecraft:frozen_river': 'Vereister Fluss',
  'minecraft:beach': 'Strand', 'minecraft:snowy_beach': 'Verschneiter Strand', 'minecraft:stony_shore': 'Steinküste', 'minecraft:ocean': 'Ozean', 'minecraft:deep_ocean': 'Tiefsee',
  'minecraft:warm_ocean': 'Warmer Ozean', 'minecraft:lukewarm_ocean': 'Lauwarmer Ozean', 'minecraft:cold_ocean': 'Kalter Ozean', 'minecraft:frozen_ocean': 'Vereister Ozean',
  'minecraft:snowy_plains': 'Verschneite Ebene', 'minecraft:ice_spikes': 'Eiszapfen', 'minecraft:grove': 'Hain', 'minecraft:snowy_slopes': 'Verschneite Hänge', 'minecraft:jagged_peaks': 'Zerklüftete Gipfel',
  'minecraft:frozen_peaks': 'Vereiste Gipfel', 'minecraft:stony_peaks': 'Steinige Gipfel', 'minecraft:windswept_hills': 'Windgepeitschte Hügel', 'minecraft:windswept_forest': 'Windgepeitschter Wald',
  'minecraft:windswept_gravelly_hills': 'Windgepeitschte Kieshügel', 'minecraft:mushroom_fields': 'Pilzland', 'minecraft:cherry_grove': 'Kirschblütenhain', 'minecraft:lush_caves': 'Üppige Höhlen',
};
export const biomeLabel = (id: string): string => BIOME_LABEL[id] ?? id.replace(/^minecraft:/, '').replace(/_/g, ' ');

/**
 * Paints a landscape design like the biomes the game reported (TERRAIN-04): every known column outside
 * paths and water gets the style of its biome (`styleForBiome`). Needs a base survey with biomes over the
 * same area as the design. Returns changed columns (0 without biomes).
 */
export function paintByBiome(d: TerrainDesign, base: TerrainSurvey): number {
  if (!base.biomes || base.minX !== d.minX || base.minZ !== d.minZ || base.width !== d.width || base.length !== d.length) return 0;
  const styles = base.biomes.ids.map(id => { const s = styleForBiome(id); return s ? styleById(s) : null; });
  let changed = 0;
  for (let i = 0; i < d.width * d.length; i++) {
    if (d.height[i] === SURVEY_UNKNOWN || d.path[i] || d.water[i] !== NO_WATER || base.surface[i] === SURVEY_UNKNOWN) continue;
    const style = styles[base.biomes.data[i]!];
    if (style && paintColumn(d, i, style)) changed++;
  }
  if (changed) d.updatedAt = new Date().toISOString();
  return changed;
}
