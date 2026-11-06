import { DomainError } from '../core/types.js';
import { checkWorldItem, WORLD_PLAN_MAX_ITEMS } from './worldPlan.js';
import type { WorldItem } from './worldPlan.js';
import { checkSavedLiveMap, checkSavedLiveMaps, LIVE_MAP_SAVED_MAX } from './livemap.js';
import type { SavedLiveMap } from './livemap.js';
import { MAP_SHAPE_GROUPS } from './liveMapExport.js';
import type { MapShape } from './liveMapExport.js';

/**
 * WORLD-SHARE-01: the Weltplan and the server web maps over the internet (Team-Raum, documents
 * `weltplan` and `karten`, services/team-room). No file is downloaded or pasted anywhere:
 *
 * - The planner puts the Weltplan (sites, paths, points, zones with groups and locks) into the room
 *   together with ready map markers per dimension (`shapes`, the same shapes the BlueMap/Dynmap
 *   writers use) – the mods of the team show the marks, the Paper plugin draws the markers on BlueMap/
 *   Dynmap itself and may protect locked areas.
 * - Every planner of the team merges the room's version with its own (three-way by entry id against
 *   the last version both knew), so two people can plan at the same time.
 * - The list of server web maps (`karten`) and the linked map go the same way.
 */
export const WORLD_SHARE_SCHEMA = 1;
export const WORLD_SHARE_FORMAT = 'bauplaner-weltplan';
export const MAP_LIST_FORMAT = 'bauplaner-karten';
/** Room limit of one document (services/team-room LIMITS.docBytes). */
export const WORLD_SHARE_MAX_BYTES = 4 * 1024 * 1024;
const MAX_SHAPES = 6000;
const DIMENSION = /^[a-z0-9_.-]{1,64}:[a-z0-9_./-]{1,128}$/;

const fail = (message: string): never => { throw new DomainError('INVALID', `Geteilter Weltplan: ${message}`); };
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export interface WorldShareDoc {
  readonly schema: 1;
  readonly format: typeof WORLD_SHARE_FORMAT;
  readonly at: string;
  /** Member id of who saved this version. */
  readonly by: string;
  readonly items: readonly WorldItem[];
  /** Ready map markers per dimension id (projects with height, sites, paths, zones, points). */
  readonly shapes: Readonly<Record<string, readonly MapShape[]>>;
}

/** The document for the room. `shapes` per dimension come from `mapShapes` of the planner. */
export function buildWorldShareDoc(items: readonly WorldItem[], shapes: Readonly<Record<string, readonly MapShape[]>>, by: string, at = new Date().toISOString()): WorldShareDoc {
  const doc: WorldShareDoc = { schema: 1, format: WORLD_SHARE_FORMAT, at, by, items: items.map(i => ({ ...i })), shapes: Object.fromEntries(Object.entries(shapes).filter(([, s]) => s.length)) };
  if (new TextEncoder().encode(JSON.stringify(doc)).byteLength > WORLD_SHARE_MAX_BYTES) fail('größer als 4 MB – bitte Einträge oder Projekte aufteilen');
  return doc;
}

function checkShape(raw: unknown): MapShape {
  if (!isObj(raw)) return fail('Marker ist kein Objekt');
  const s = raw as Record<string, unknown>;
  const str = (v: unknown, max: number, what: string): string => typeof v === 'string' && v.length <= max ? v : fail(`Marker: ${what} ungültig`);
  const num = (v: unknown, what: string): number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 30_000_000 ? v : fail(`Marker: ${what} ungültig`);
  const pts = (v: unknown): [number, number][] => Array.isArray(v) && v.length >= 2 && v.length <= 256 ? v.map(p => Array.isArray(p) && p.length === 2 ? [num(p[0], 'X'), num(p[1], 'Z')] as [number, number] : fail('Marker: Punkt ungültig')) : fail('Marker: Punkte ungültig');
  const base = { id: str(s.id, 80, 'ID'), label: str(s.label, 200, 'Name'), detail: str(s.detail, 600, 'Text'), color: /^#[0-9a-f]{6}$/i.test(String(s.color)) ? String(s.color) : '#f2b84b',
    group: MAP_SHAPE_GROUPS.includes(s.group as never) ? s.group as MapShape['group'] : fail('Marker: Gruppe ungültig') };
  if (s.kind === 'poi') return { kind: 'poi', ...base, x: num(s.x, 'X'), y: num(s.y, 'Y'), z: num(s.z, 'Z') };
  if (s.kind === 'line') return { kind: 'line', ...base, points: pts(s.points), y: num(s.y, 'Y'), width: num(s.width, 'Breite') };
  if (s.kind === 'area') return { kind: 'area', ...base, points: pts(s.points), minY: s.minY === null ? null : num(s.minY, 'Y'), maxY: s.maxY === null ? null : num(s.maxY, 'Y') };
  return fail('Marker: Art unbekannt');
}

/** Reads a room document (the `doc` part of GET …/doc/weltplan); unknown parts are rejected. */
export function readWorldShareDoc(raw: unknown): WorldShareDoc {
  if (!isObj(raw)) return fail('kein Objekt');
  if (raw.format !== WORLD_SHARE_FORMAT) return fail('das ist kein geteilter Weltplan');
  if (raw.schema !== 1) return fail(`unbekannte Schemaversion ${String(raw.schema)}`);
  if (!Array.isArray(raw.items) || raw.items.length > WORLD_PLAN_MAX_ITEMS) return fail(`höchstens ${WORLD_PLAN_MAX_ITEMS} Einträge`);
  const items = raw.items.map(checkWorldItem);
  const ids = new Set<string>();
  for (const i of items) { if (ids.has(i.id)) fail(`Eintrag ${i.id} doppelt`); ids.add(i.id); }
  const shapes: Record<string, MapShape[]> = {};
  let n = 0;
  if (raw.shapes !== undefined) {
    if (!isObj(raw.shapes)) return fail('Marker ungültig');
    for (const [dim, list] of Object.entries(raw.shapes)) {
      if (!DIMENSION.test(dim) || !Array.isArray(list)) fail(`Marker für ${dim} ungültig`);
      n += (list as unknown[]).length; if (n > MAX_SHAPES) fail(`höchstens ${MAX_SHAPES} Marker`);
      shapes[dim] = (list as unknown[]).map(checkShape);
    }
  }
  return { schema: 1, format: WORLD_SHARE_FORMAT, at: typeof raw.at === 'string' ? raw.at.slice(0, 40) : '', by: typeof raw.by === 'string' ? raw.by.slice(0, 64) : '?', items, shapes };
}

/** Canonical text of an entry (sorted keys) to see whether two versions differ. */
export function worldItemKey(i: WorldItem): string {
  const c = (v: unknown): string => Array.isArray(v) ? `[${v.map(c).join(',')}]` : isObj(v) ? `{${Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => `${JSON.stringify(k)}:${c(v[k])}`).join(',')}}` : JSON.stringify(v);
  return c(i);
}
export function sameItems(a: readonly WorldItem[], b: readonly WorldItem[]): boolean {
  return a.length === b.length && a.every((x, n) => worldItemKey(x) === worldItemKey(b[n]!));
}

export interface WorldMerge {
  readonly items: WorldItem[];
  /** Entries changed on both sides: the room's version was taken (names). */
  readonly conflicts: string[];
  /** What came from the room into this browser. */
  readonly fromRoom: { readonly added: number; readonly changed: number; readonly removed: number };
  /** Whether the result differs from the room's version (then this browser has something to send). */
  readonly toSend: boolean;
}

/**
 * Three-way merge by entry id. `base` is the last version this browser and the room agreed on (empty on
 * the first contact), `local` this browser's Weltplan, `remote` the room's. Rules per id:
 * changed only on one side → that side; changed on both → the room (the other person saved first; a
 * local entry deleted in the room while changed here stays). Locked entries in the room are never
 * changed or removed by this browser. Order: the room's order, then new local entries.
 */
export function mergeWorldItems(base: readonly WorldItem[], local: readonly WorldItem[], remote: readonly WorldItem[]): WorldMerge {
  const B = new Map(base.map(i => [i.id, i])), L = new Map(local.map(i => [i.id, i])), R = new Map(remote.map(i => [i.id, i]));
  const k = (i: WorldItem | undefined) => i ? worldItemKey(i) : '';
  const out: WorldItem[] = [], conflicts: string[] = [];
  let added = 0, changed = 0, removed = 0;
  for (const r of remote) {
    const b = B.get(r.id), l = L.get(r.id);
    const localChanged = k(l) !== k(b), remoteChanged = k(r) !== k(b);
    if (!l) {
      // Deleted here (it was in base) – unless the room changed it meanwhile or it is locked there.
      if (b && !remoteChanged && !r.locked) continue;
      out.push(r); if (!b) added++; else changed++;
      continue;
    }
    if (r.locked || !localChanged) { out.push(r); if (k(r) !== k(l)) changed++; continue; }
    if (!remoteChanged) { out.push(l); continue; }
    if (k(r) !== k(l)) { conflicts.push(r.name || r.id); changed++; }
    out.push(r);
  }
  for (const l of local) {
    if (R.has(l.id)) continue;
    const b = B.get(l.id);
    if (b && k(b) === k(l)) { removed++; continue; } // removed in the room, unchanged here
    out.push(l);
  }
  if (out.length > WORLD_PLAN_MAX_ITEMS) fail(`zusammen mehr als ${WORLD_PLAN_MAX_ITEMS} Einträge`);
  return { items: out, conflicts, fromRoom: { added, changed, removed }, toSend: !sameItems(out, remote) };
}

/**
 * Shapes of the new document. Only `current` (the dimension shown in this browser) has fresh project
 * markers; for every other dimension the project markers of the room stay (another browser computed
 * them) and the Weltplan markers are taken fresh from the merged entries.
 */
export function mergeShapes(room: Readonly<Record<string, readonly MapShape[]>> | undefined, fresh: Readonly<Record<string, readonly MapShape[]>>, current: string): Record<string, readonly MapShape[]> {
  const out: Record<string, readonly MapShape[]> = {};
  const dims = new Set([...Object.keys(room ?? {}), ...Object.keys(fresh)]);
  for (const dim of dims) {
    const mine = fresh[dim] ?? [];
    const list = dim === current ? mine : [...(room?.[dim] ?? []).filter(s => s.group === 'projekte'), ...mine.filter(s => s.group !== 'projekte')];
    if (list.length) out[dim] = list;
  }
  return out;
}

// ------------------------------------------------------------------ Kartenliste

export interface MapListDoc {
  readonly schema: 1;
  readonly format: typeof MAP_LIST_FORMAT;
  readonly at: string;
  readonly by: string;
  readonly maps: readonly SavedLiveMap[];
  /** The server web map the team uses right now (link template and map names per dimension), if any. */
  readonly active: SavedLiveMap | null;
}

export function buildMapListDoc(maps: readonly SavedLiveMap[], active: SavedLiveMap | null, by: string, at = new Date().toISOString()): MapListDoc {
  return { schema: 1, format: MAP_LIST_FORMAT, at, by, maps: checkSavedLiveMaps(maps), active: active && active.urlTemplate ? checkSavedLiveMap(active) : null };
}

export function readMapListDoc(raw: unknown): MapListDoc {
  if (!isObj(raw) || raw.format !== MAP_LIST_FORMAT) return fail('das ist keine geteilte Kartenliste');
  if (raw.schema !== 1) return fail(`Kartenliste: unbekannte Schemaversion ${String(raw.schema)}`);
  return { schema: 1, format: MAP_LIST_FORMAT, at: typeof raw.at === 'string' ? raw.at.slice(0, 40) : '', by: typeof raw.by === 'string' ? raw.by.slice(0, 64) : '?',
    maps: checkSavedLiveMaps(raw.maps), active: raw.active === null || raw.active === undefined ? null : checkSavedLiveMap(raw.active) };
}

const mapKey = (m: SavedLiveMap) => JSON.stringify([m.name, m.urlTemplate, Object.entries(m.worlds).sort()]);
const nameKey = (m: SavedLiveMap) => m.name.toLocaleLowerCase('de');

/** Three-way merge of saved maps by name, same rules as the Weltplan (both changed → the room). */
export function mergeMapLists(base: readonly SavedLiveMap[], local: readonly SavedLiveMap[], remote: readonly SavedLiveMap[]): { maps: SavedLiveMap[]; toSend: boolean } {
  const B = new Map(base.map(m => [nameKey(m), m])), L = new Map(local.map(m => [nameKey(m), m])), R = new Map(remote.map(m => [nameKey(m), m]));
  const k = (m: SavedLiveMap | undefined) => m ? mapKey(m) : '';
  const out: SavedLiveMap[] = [];
  for (const r of remote) {
    const b = B.get(nameKey(r)), l = L.get(nameKey(r));
    if (!l) { if (b && k(b) === k(r)) continue; out.push(r); continue; }
    out.push(k(r) !== k(b) ? r : l);
  }
  for (const l of local) {
    if (R.has(nameKey(l))) continue;
    const b = B.get(nameKey(l));
    if (b && k(b) === k(l)) continue;
    if (out.length < LIVE_MAP_SAVED_MAX) out.push(l);
  }
  const toSend = out.length !== remote.length || out.some((m, i) => k(m) !== k(remote[i]));
  return { maps: out, toSend };
}
