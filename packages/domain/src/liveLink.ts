import { SURFACE_SKIP_IDS, isGroundId } from './terrain.js';
import { SURVEY_UNKNOWN, createSurvey } from './terrainSurvey.js';
import type { SurveyArea, TerrainSurvey } from './terrainSurvey.js';
import { DomainError } from './types.js';
import type { Project } from './types.js';
import { WORLD_POINT_TYPES } from './worldPlan.js';
import type { WorldItem } from './worldPlan.js';

/**
 * Live-Verbindung Website ↔ Mod (GAME-03/MAP-03). The Bauplaner mod opens a
 * small HTTP service on 127.0.0.1 only, switched off by default; the website
 * (same computer) pairs once with a code the mod shows in the chat and then
 * polls. This module is the shared contract: limits, strict readers for
 * everything the mod sends (it is still foreign input) and the pure
 * derivations the map needs (terrain columns → survey, hologram ↔ project).
 *
 * Endpoints (protocol 1), all JSON unless noted:
 * - GET  /v1/hello            → LiveHello (no token; tells whether pairing is open)
 * - POST /v1/pair  {code}     → {token}
 * - GET  /v1/status           → LiveStatus
 * - GET  /v1/chunks?c=x,z;…   → LiveChunks (surface runs of loaded chunks)
 * - POST /v1/plan?…           ← Schem v3 bytes; places the hologram (client only)
 * - POST /v1/placement        ← {dimension,x,y,z,turns,mirror}; moves the hologram
 * - POST /v1/marks            ← {dimension, items}; Weltplan marks shown in game
 * - POST /v1/section          ← {section}; build section shown in game (0 = all), mod 0.7.0+
 * - GET  /v1/scan             → bauplaner-scan file of the hologram box (feature `scan`, mod 0.7.1+)
 * Protocol 2 (MAP-06/GAME-08, draft for the next mod): same routes; `hello.protocol` 2,
 * `hello.features` lists what the mod can do (`scan`, `marks2`, `players`).
 * - POST /v1/marks (feature `marks2`) also takes zones, layer/colour and the new point types
 * - GET  /v1/players (feature `players`) → other players the client can see
 * The website speaks protocol 1 and 2 and enables buttons by features, never by version numbers.
 * Every request after pairing carries the header X-Bauplaner-Token. The mod
 * answers only for allowed origins and never changes the world.
 */

export const LIVE_PROTOCOL = 1;
/** Protocols this website understands (the mod may answer with any of them). */
export const LIVE_PROTOCOLS: readonly number[] = [1, 2];
export const LIVE_DEFAULT_PORT = 47615;
export const LIVE_TOKEN_HEADER = 'X-Bauplaner-Token';
export const LIVE_MAX_CHUNKS_PER_REQUEST = 64;
export const LIVE_MAX_RUNS = 16;
export const LIVE_MAX_MARKS = 500;
export const LIVE_MAX_PLAN_BYTES = 16 * 1024 * 1024;
/** Origins the mod accepts (besides http://localhost:* and http://127.0.0.1:* for development). */
export const LIVE_ALLOWED_ORIGINS: readonly string[] = ['https://freadeax.github.io'];

const fail = (message: string): never => { throw new DomainError('LIVELINK', `Mod-Verbindung: ${message}`); };
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, what: string, min = -3e7, max = 3e7): number => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) fail(`${what} ungültig`);
  return v as number;
};
const int = (v: unknown, what: string, min = -3e7, max = 3e7): number => {
  if (!Number.isInteger(v) || (v as number) < min || (v as number) > max) fail(`${what} muss ganzzahlig sein`);
  return v as number;
};
const str = (v: unknown, what: string, max = 256): string => {
  if (typeof v !== 'string' || v.length > max || /[\u0000-\u001f\u007f]/.test(v)) fail(`${what} ungültig`);
  return v as string;
};
const optStr = (v: unknown, what: string, max = 256): string | null => v === null || v === undefined ? null : str(v, what, max);
const DIMENSION_ID = /^[a-z0-9_.-]{1,64}:[a-z0-9_./-]{1,128}$/;
const BLOCK_ID = /^[a-z0-9_.-]{1,64}:[a-z0-9_./-]{1,128}$/;
const dim = (v: unknown): string => typeof v === 'string' && DIMENSION_ID.test(v) ? v : fail('Dimension ungültig');

export interface LiveHello {
  readonly app: 'bauplaner-mod';
  readonly protocol: number;
  readonly mod: { readonly version: string; readonly loader: string; readonly minecraft: string };
  /** True while the mod shows a pairing code in the chat. */
  readonly pairing: boolean;
  /** Abilities beyond protocol 1, e.g. `scan` (Baustand, mod 0.7.1+); empty for older mods. */
  readonly features: readonly string[];
}
/** Baustand: `GET /v1/scan` records the hologram's plan box as `bauplaner-scan` file (MAP-05). */
export const LIVE_FEATURE_SCAN = 'scan';
/** Marks of schema 2 (zones, layers, colours, new point types) are shown in the game (MAP-06, GAME-08). */
export const LIVE_FEATURE_MARKS2 = 'marks2';
/** `GET /v1/players`: other players the client sees (GAME-08). */
export const LIVE_FEATURE_PLAYERS = 'players';
export const liveCan = (hello: LiveHello | null, feature: string): boolean => !!hello?.features.includes(feature);
/** Known features with what they mean, for the „Mod kann“ line of the panel. */
export const LIVE_FEATURE_LABELS: readonly { readonly id: string; readonly label: string }[] = [
  { id: LIVE_FEATURE_SCAN, label: 'Baustand aus dem Spiel' },
  { id: LIVE_FEATURE_MARKS2, label: 'Zonen, Ebenen und neue Punktarten im Spiel' },
  { id: LIVE_FEATURE_PLAYERS, label: 'Mitspieler auf der Karte' },
];
/** Other players (feature `players`): name and position in the client's dimension. */
export interface LiveOtherPlayer { readonly name: string; readonly x: number; readonly y: number; readonly z: number; readonly yaw: number }
export interface LivePlayers { readonly dimension: string; readonly players: readonly LiveOtherPlayer[] }
export interface LivePlayer { readonly x: number; readonly y: number; readonly z: number; readonly yaw: number; readonly pitch: number; readonly dimension: string; readonly name: string }
export interface LiveWorld { readonly key: string; readonly server: string | null; readonly singleplayer: boolean }
export interface LiveCounts { readonly ok: number; readonly state: number; readonly missing: number; readonly wrong: number; readonly unknown: number }
export interface LivePlacement { readonly dimension: string; readonly x: number; readonly y: number; readonly z: number; readonly turns: number; readonly mirror: boolean }
export interface LiveHologram {
  readonly planFile: string;
  readonly name: string;
  readonly projectId: string | null;
  readonly revisionNumber: number | null;
  readonly placement: LivePlacement;
  readonly visible: boolean;
  /** World box [x0,y0,z0,x1,y1,z1], inclusive. */
  readonly box: readonly [number, number, number, number, number, number];
  readonly counts: LiveCounts;
  readonly total: number;
  /** Build section shown in the game (1-based, 0 = all); mod 0.7.0+, else 0. */
  readonly section: number;
  /** Build sections of the plan file in build order with progress; empty for older mods or plans without sections. */
  readonly sections: readonly LiveSection[];
}
export interface LiveSection { readonly name: string; readonly ok: number; readonly total: number }
export interface LiveStatus {
  readonly time: string;
  readonly player: LivePlayer | null;
  readonly world: LiveWorld | null;
  readonly hologram: LiveHologram | null;
  readonly marks: number;
}
/** One column: surface runs from the top down, flat [yTop, idIndex, yTop, idIndex, …]. Empty = unknown. */
export interface LiveChunk { readonly x: number; readonly z: number; readonly columns: readonly (readonly number[])[] }
export interface LiveChunks {
  readonly dimension: string;
  readonly ids: readonly string[];
  readonly chunks: readonly LiveChunk[];
  readonly missing: readonly (readonly [number, number])[];
}

export function readLiveHello(raw: unknown): LiveHello {
  if (!isObj(raw) || raw.app !== 'bauplaner-mod') return fail('Unter dieser Adresse antwortet keine Bauplaner-Mod');
  const protocol = int(raw.protocol, 'Protokoll', 1, 1000);
  if (!LIVE_PROTOCOLS.includes(protocol)) fail(`Protokoll ${protocol} wird nicht unterstützt (diese Website spricht ${LIVE_PROTOCOLS.join(' und ')}). Bitte Mod und Website aktualisieren.`);
  const mod = isObj(raw.mod) ? raw.mod : fail('Modangaben fehlen');
  return { app: 'bauplaner-mod', protocol, mod: { version: str(mod.version, 'Modversion', 40), loader: str(mod.loader, 'Loader', 40), minecraft: str(mod.minecraft, 'Spielversion', 40) }, pairing: raw.pairing === true,
    features: Array.isArray(raw.features) ? raw.features.filter((f): f is string => typeof f === 'string' && /^[a-z0-9-]{1,32}$/.test(f)).slice(0, 32) : [] };
}

export function readLivePairing(raw: unknown): string {
  if (!isObj(raw) || typeof raw.token !== 'string' || !/^[A-Za-z0-9_-]{24,128}$/.test(raw.token)) return fail('Kopplung ohne gültigen Schlüssel beantwortet');
  return raw.token;
}

function readCounts(raw: unknown): LiveCounts {
  const c = isObj(raw) ? raw : fail('Zählung fehlt');
  const n = (k: string) => int(c[k], `Zählung ${k}`, 0, 1e9);
  return { ok: n('ok'), state: n('state'), missing: n('missing'), wrong: n('wrong'), unknown: n('unknown') };
}

export function readLiveStatus(raw: unknown): LiveStatus {
  if (!isObj(raw)) return fail('Status ist kein Objekt');
  const time = typeof raw.time === 'string' && Number.isFinite(Date.parse(raw.time)) ? raw.time : new Date().toISOString();
  let player: LivePlayer | null = null, world: LiveWorld | null = null, hologram: LiveHologram | null = null;
  if (raw.player != null) {
    const p = isObj(raw.player) ? raw.player : fail('Spieler ungültig');
    player = { x: num(p.x, 'X'), y: num(p.y, 'Y', -5000, 5000), z: num(p.z, 'Z'), yaw: num(p.yaw, 'Blickrichtung', -1e6, 1e6), pitch: num(p.pitch, 'Neigung', -90, 90), dimension: dim(p.dimension), name: str(p.name ?? '', 'Spielername', 64) };
  }
  if (raw.world != null) {
    const w = isObj(raw.world) ? raw.world : fail('Welt ungültig');
    world = { key: str(w.key, 'Weltschlüssel'), server: optStr(w.server, 'Server'), singleplayer: w.singleplayer === true };
  }
  if (raw.hologram != null) {
    const h = isObj(raw.hologram) ? raw.hologram : fail('Hologramm ungültig');
    const pl = isObj(h.placement) ? h.placement : fail('Hologrammlage fehlt');
    const box = Array.isArray(h.box) && h.box.length === 6 ? h.box.map((v, i) => int(v, `Box ${i}`)) as unknown as LiveHologram['box'] : fail('Hologrammbox ungültig');
    const counts = readCounts(h.counts);
    hologram = {
      planFile: str(h.planFile, 'Plandatei'), name: str(h.name, 'Planname'), projectId: optStr(h.projectId, 'Projekt-ID', 128),
      revisionNumber: h.revisionNumber == null ? null : int(h.revisionNumber, 'Revision', 0, 1e9),
      placement: { dimension: dim(pl.dimension), x: int(pl.x, 'Anker X'), y: int(pl.y, 'Anker Y', -5000, 5000), z: int(pl.z, 'Anker Z'), turns: int(pl.turns, 'Drehung', 0, 3), mirror: pl.mirror === true },
      visible: h.visible !== false, box, counts, total: int(h.total, 'Blockzahl', 0, 1e9),
      section: h.section == null ? 0 : int(h.section, 'Abschnitt', 0, 255),
      sections: h.sections == null ? [] : (Array.isArray(h.sections) && h.sections.length <= 255 ? h.sections : fail('Abschnitte ungültig')).map((x: unknown, i: number) => {
        const o = isObj(x) ? x : fail(`Abschnitt ${i + 1} ungültig`);
        return { name: str(o.name, `Abschnittsname ${i + 1}`), ok: int(o.ok, `Abschnitt ${i + 1} richtig`, 0, 1e9), total: int(o.total, `Abschnitt ${i + 1} gesamt`, 0, 1e9) };
      }),
    };
  }
  return { time, player, world, hologram, marks: raw.marks == null ? 0 : int(raw.marks, 'Markierungen', 0, 1e6) };
}

/** `GET /v1/players` (feature `players`); at most 200 players, strictly read. */
export function readLivePlayers(raw: unknown): LivePlayers {
  if (!isObj(raw)) return fail('Spielerliste ist kein Objekt');
  const dimension = dim(raw.dimension);
  if (!Array.isArray(raw.players) || raw.players.length > 200) fail('Spielerliste ungültig');
  const players = (raw.players as unknown[]).map(p => {
    const o = isObj(p) ? p : fail('Spieler ungültig');
    return { name: str(o.name, 'Spielername', 64), x: num(o.x, 'X'), y: num(o.y, 'Y', -5000, 5000), z: num(o.z, 'Z'), yaw: o.yaw == null ? 0 : num(o.yaw, 'Blickrichtung', -1e6, 1e6) };
  });
  return { dimension, players };
}

export function readLiveChunks(raw: unknown): LiveChunks {
  if (!isObj(raw)) return fail('Chunkantwort ist kein Objekt');
  const dimension = dim(raw.dimension);
  if (!Array.isArray(raw.ids) || raw.ids.length > 65_535) fail('Blockliste ungültig');
  const ids = (raw.ids as unknown[]).map(id => typeof id === 'string' && BLOCK_ID.test(id) ? id : fail('Block-ID ungültig'));
  if (!Array.isArray(raw.chunks) || raw.chunks.length > LIVE_MAX_CHUNKS_PER_REQUEST) fail('zu viele Chunks');
  const chunks = (raw.chunks as unknown[]).map(c => {
    const ch = isObj(c) ? c : fail('Chunk ungültig');
    if (!Array.isArray(ch.columns) || ch.columns.length !== 256) fail('Chunk braucht 256 Spalten');
    const columns = (ch.columns as unknown[]).map(col => {
      if (!Array.isArray(col) || col.length % 2 || col.length > LIVE_MAX_RUNS * 2) return fail('Spalte ungültig');
      for (let i = 0; i < col.length; i += 2) { int(col[i], 'Höhe', -5000, 5000); int(col[i + 1], 'Blockindex', 0, ids.length - 1); }
      return col as number[];
    });
    return { x: int(ch.x, 'Chunk X', -2e6, 2e6), z: int(ch.z, 'Chunk Z', -2e6, 2e6), columns };
  });
  const missing = Array.isArray(raw.missing) ? (raw.missing as unknown[]).slice(0, LIVE_MAX_CHUNKS_PER_REQUEST).map(m => Array.isArray(m) && m.length === 2 ? [int(m[0], 'Chunk X', -2e6, 2e6), int(m[1], 'Chunk Z', -2e6, 2e6)] as const : fail('fehlender Chunk ungültig')) : [];
  return { dimension, ids, chunks, missing };
}

// ------------------------------------------------------------------ terrain

export interface LiveColumn { readonly surface: number; readonly surfaceId: string; readonly ground: number; readonly groundId: string }

/**
 * Same rule as the region-file survey (terrainSurvey.ts): surface = first
 * run that is not plant/air-like (water and leaves count), ground = first
 * run that is ground (solid, not a tree part). Runs are top-down.
 */
export function classifyRuns(runs: readonly number[], ids: readonly string[]): LiveColumn | null {
  let surface: number | null = null, surfaceId = '', ground: number | null = null, groundId = '';
  for (let i = 0; i < runs.length; i += 2) {
    const y = runs[i]!, id = ids[runs[i + 1]!]!;
    if (surface === null && !SURFACE_SKIP_IDS.has(id)) { surface = y; surfaceId = id; }
    if (isGroundId(id)) { ground = y; groundId = id; break; }
  }
  if (surface === null) return null;
  return { surface, surfaceId, ground: ground ?? surface, groundId: ground === null ? surfaceId : groundId };
}

/** Chunk cache entry kept by the map: classified columns of one chunk. */
export interface LiveChunkColumns { readonly x: number; readonly z: number; readonly dimension: string; readonly at: number; readonly columns: readonly (LiveColumn | null)[] }

export function chunkColumns(chunks: LiveChunks, at = Date.now()): LiveChunkColumns[] {
  return chunks.chunks.map(c => ({ x: c.x, z: c.z, dimension: chunks.dimension, at, columns: c.columns.map(r => r.length ? classifyRuns(r, chunks.ids) : null) }));
}

/**
 * Which chunks to ask for next: around a centre (block coordinates), nearest
 * first, skipping fresh ones. `known` maps "cx,cz" → time of last read.
 */
export function wantedChunks(centerX: number, centerZ: number, radius: number, known: ReadonlyMap<string, number>, now: number, maxAgeMs: number, limit = LIVE_MAX_CHUNKS_PER_REQUEST): [number, number][] {
  const cx = Math.floor(centerX / 16), cz = Math.floor(centerZ / 16), out: [number, number, number][] = [];
  for (let dx = -radius; dx <= radius; dx++) for (let dz = -radius; dz <= radius; dz++) {
    if (dx * dx + dz * dz > radius * radius + radius) continue;
    const t = known.get(`${cx + dx},${cz + dz}`);
    if (t !== undefined && now - t < maxAgeMs) continue;
    out.push([cx + dx, cz + dz, dx * dx + dz * dz + (t === undefined ? 0 : 0.5)]);
  }
  return out.sort((a, b) => a[2] - b[2]).slice(0, limit).map(([x, z]) => [x, z]);
}

/** Query value for GET /v1/chunks. */
export const chunkQuery = (chunks: readonly (readonly [number, number])[]): string => chunks.map(c => `${c[0]},${c[1]}`).join(';');

/**
 * Stored survey (TERRAIN-01 format) of an area from the live chunk cache, so
 * a building site keeps the terrain the mod saw. Columns the mod has not
 * delivered stay unknown.
 */
export function liveSurvey(area: SurveyArea, dimension: string, chunkAt: (cx: number, cz: number) => LiveChunkColumns | undefined, readAt = new Date().toISOString()): TerrainSurvey {
  const n = area.width * area.length;
  const surface = new Int16Array(n).fill(SURVEY_UNKNOWN), ground = new Int16Array(n).fill(SURVEY_UNKNOWN);
  const surfaceBlock = new Uint16Array(n), groundBlock = new Uint16Array(n);
  const ids = ['minecraft:air'], index = new Map<string, number>([['minecraft:air', 0]]);
  const idOf = (id: string) => { let i = index.get(id); if (i === undefined) { i = ids.length; ids.push(id); index.set(id, i); } return i; };
  for (let dz = 0; dz < area.length; dz++) for (let dx = 0; dx < area.width; dx++) {
    const x = area.minX + dx, z = area.minZ + dz, c = chunkAt(Math.floor(x / 16), Math.floor(z / 16));
    const col = c?.columns[((z & 15) << 4) | (x & 15)];
    if (!col) continue;
    const k = dx + dz * area.width;
    surface[k] = col.surface; surfaceBlock[k] = idOf(col.surfaceId); ground[k] = col.ground; groundBlock[k] = idOf(col.groundId);
  }
  return createSurvey({ ...area, surface, surfaceBlock, ground, groundBlock, ids }, { dimension, readAt });
}

// ------------------------------------------------------------------ hologram ↔ project

export type HologramMatch = 'same' | 'moved' | 'turned' | 'dimension' | 'unplaced';
export const HOLOGRAM_MATCH_LABEL: Readonly<Record<HologramMatch, string>> = {
  same: 'liegt im Spiel genau an der geplanten Stelle',
  moved: 'liegt im Spiel an einer anderen Stelle als geplant',
  turned: 'ist im Spiel gedreht oder gespiegelt (die Weltkarte plant ungedreht)',
  dimension: 'liegt im Spiel in einer anderen Dimension',
  unplaced: 'ist auf der Weltkarte noch nicht platziert',
};

/** Project of a hologram: by the project id inside the plan file. */
export function hologramProject(h: LiveHologram, projects: readonly Project[]): Project | null {
  return h.projectId ? projects.find(p => p.id === h.projectId) ?? null : null;
}

export function compareHologram(h: LiveHologram, project: Pick<Project, 'world'>): HologramMatch {
  const w = project.world;
  if (!w) return 'unplaced';
  if (w.dimension !== h.placement.dimension) return 'dimension';
  if (h.placement.turns !== 0 || h.placement.mirror) return 'turned';
  return w.origin[0] === h.placement.x && w.origin[1] === h.placement.y && w.origin[2] === h.placement.z ? 'same' : 'moved';
}

/** Share of planned blocks that are right in the game; unknown ones (unloaded chunks) are excluded from the base. */
export function liveShare(h: Pick<LiveHologram, 'counts' | 'total'>): { done: number; known: number; share: number } {
  const known = h.total - h.counts.unknown;
  return { done: h.counts.ok, known, share: known > 0 ? h.counts.ok / known : 0 };
}

/** Player block position (floored) and compass direction. Minecraft yaw: 0 = south (+Z), 90 = west (−X). */
export function playerBlock(p: LivePlayer): { x: number; y: number; z: number; facing: 'Süden' | 'Westen' | 'Norden' | 'Osten' } {
  const yaw = ((p.yaw % 360) + 360) % 360;
  const facing = (['Süden', 'Westen', 'Norden', 'Osten'] as const)[Math.round(yaw / 90) % 4]!;
  return { x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z), facing };
}

/** Anchor in the game for a project origin taken from where the player stands (block under the feet + 1 = feet level). */
export function originFromPlayer(p: LivePlayer): [number, number, number] { return [Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)]; }

/** Plan upload query (POST /v1/plan). */
export function planUploadQuery(fileName: string, placement: LivePlacement): string {
  if (!/^[A-Za-z0-9._-]{1,120}\.schem$/.test(fileName)) fail('Dateiname der Plandatei ungültig');
  const q = new URLSearchParams({ name: fileName, dimension: placement.dimension, x: String(placement.x), y: String(placement.y), z: String(placement.z), turns: String(placement.turns), mirror: String(placement.mirror) });
  return q.toString();
}

/** Marks body (POST /v1/marks): Weltplan items of one dimension, newest limit. */
export function marksBody(dimension: string, items: readonly WorldItem[]): { dimension: string; items: WorldItem[] } {
  const own = items.filter(i => i.dimension === dimension);
  if (own.length > LIVE_MAX_MARKS) fail(`höchstens ${LIVE_MAX_MARKS} Markierungen an die Mod`);
  return { dimension, items: own.map(i => ({ ...i })) };
}

/**
 * What a mod can show of the Weltplan (MAP-06): a mod without `marks2`
 * (protocol 1, 0.5–0.7) knows sites, paths and the six first point types and
 * ignores unknown fields – zones and newer point types would make it reject
 * the whole request, so they are left out and counted. With `marks2` every
 * entry goes as it is.
 */
export function marksForMod(items: readonly WorldItem[], hello: LiveHello | null): { items: WorldItem[]; skipped: number; skippedKinds: string[] } {
  if (liveCan(hello, LIVE_FEATURE_MARKS2)) return { items: [...items], skipped: 0, skippedKinds: [] };
  const v1 = new Set(WORLD_POINT_TYPES.filter(t => t.v1).map(t => t.id));
  const kept: WorldItem[] = [], kinds = new Set<string>();
  for (const i of items) {
    if (i.kind === 'zone') { kinds.add('Zonen'); continue; }
    if (i.kind === 'point' && !v1.has(i.type)) { kinds.add(`Punkte „${WORLD_POINT_TYPES.find(t => t.id === i.type)?.label ?? i.type}“`); continue; }
    const { layer: _l, color: _c, ...plain } = i;
    kept.push(plain as WorldItem);
  }
  return { items: kept, skipped: items.length - kept.length, skippedKinds: [...kinds] };
}

/** Base URL of the mod on this computer. */
export function liveBaseUrl(port: number): string {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) fail('Port muss zwischen 1024 und 65535 liegen');
  return `http://127.0.0.1:${port}`;
}

/** Whether the mod would accept this page origin (mirror of the Java check, for a clear message before connecting). */
export function originAllowed(origin: string): boolean {
  if (LIVE_ALLOWED_ORIGINS.includes(origin)) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(origin);
}
