import { DomainError } from './types.js';

/**
 * Weltplan (MAP-03): what is planned directly on the world map besides the
 * projects themselves – building sites (Bauplätze), paths (Wege) and points
 * (Anker, Ziele, Lager, Portale …). One plan for all dimensions, stored next
 * to the projects (repository `getWorldPlan`/`saveWorldPlan`, full backups)
 * and changed only through `applyWorldPlanOp` with an exact inverse.
 *
 * Coordinates are Minecraft block coordinates of the world (X east, Z
 * south). A site is a rectangle of columns; it may be linked to the project
 * that is built on it. A path is a polyline of column centres with a width;
 * `pathColumns` rasterises it with the same rule the map, the length count
 * and the game overlay use. Nothing here ever changes a world: the mod only
 * shows these marks (client side).
 */

export const WORLD_PLAN_SCHEMA_VERSION = 1;
export const WORLD_PLAN_MAX_ITEMS = 2000;
export const WORLD_PATH_MAX_POINTS = 256;
export const WORLD_SITE_MAX_SIDE = 4096;
const XZ = 29_999_984, Y_MIN = -2032, Y_MAX = 2031;
const DIMENSION_ID = /^[a-z0-9_.-]{1,64}:[a-z0-9_./-]{1,128}$/;
const ID = /^[A-Za-z0-9_-]{1,64}$/;

export type WorldPointType = 'anker' | 'ziel' | 'lager' | 'portal' | 'farm' | 'treffpunkt';
export const WORLD_POINT_TYPES: readonly { readonly id: WorldPointType; readonly label: string; readonly color: string }[] = [
  { id: 'anker', label: 'Anker', color: '#5ff0b0' },
  { id: 'ziel', label: 'Ziel', color: '#7ab8ff' },
  { id: 'lager', label: 'Lager', color: '#f2b84b' },
  { id: 'portal', label: 'Portal', color: '#c79bff' },
  { id: 'farm', label: 'Farm', color: '#8fe36a' },
  { id: 'treffpunkt', label: 'Treffpunkt', color: '#ff8fa3' },
];
export type WorldPathStyle = 'weg' | 'strasse' | 'bahn' | 'bruecke';
export const WORLD_PATH_STYLES: readonly { readonly id: WorldPathStyle; readonly label: string; readonly color: string; readonly width: number }[] = [
  { id: 'weg', label: 'Weg', color: '#c9a66b', width: 3 },
  { id: 'strasse', label: 'Straße', color: '#9aa4ab', width: 5 },
  { id: 'bahn', label: 'Schiene', color: '#b07a4f', width: 1 },
  { id: 'bruecke', label: 'Brücke', color: '#8c6a43', width: 3 },
];

interface ItemBase {
  readonly id: string;
  readonly name: string;
  readonly dimension: string;
  readonly note: string;
}
export interface WorldSite extends ItemBase {
  readonly kind: 'site';
  readonly minX: number; readonly minZ: number; readonly width: number; readonly length: number;
  /** Planned floor height; null = not decided yet. */
  readonly y: number | null;
  /** Project built on this site; null = free site. */
  readonly projectId: string | null;
}
export interface WorldPath extends ItemBase {
  readonly kind: 'path';
  readonly style: WorldPathStyle;
  /** Odd widths stay symmetric around the centre line. */
  readonly width: number;
  /** Column coordinates [x, z] of the corners, at least two. */
  readonly points: readonly (readonly [number, number])[];
}
export interface WorldPoint extends ItemBase {
  readonly kind: 'point';
  readonly type: WorldPointType;
  readonly x: number; readonly y: number; readonly z: number;
}
export type WorldItem = WorldSite | WorldPath | WorldPoint;

export interface WorldPlan {
  readonly schemaVersion: 1;
  /** Increases with every saved change (optimistic concurrency like projects). */
  readonly revision: number;
  readonly updatedAt: string;
  readonly items: readonly WorldItem[];
}

export type WorldPlanOp =
  | { readonly kind: 'add'; readonly item: WorldItem }
  | { readonly kind: 'update'; readonly item: WorldItem }
  | { readonly kind: 'remove'; readonly id: string }
  /** Adds an item at a list position (exact inverse of `remove`, keeps the order). */
  | { readonly kind: 'insert'; readonly item: WorldItem; readonly at: number }
  | { readonly kind: 'batch'; readonly label: string; readonly ops: readonly WorldPlanOp[] };

const fail = (message: string): never => { throw new DomainError('INVALID', `Weltplan: ${message}`); };
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const int = (v: unknown, min: number, max: number, what: string): number => {
  if (!Number.isInteger(v) || (v as number) < min || (v as number) > max) fail(`${what} muss eine ganze Zahl von ${min} bis ${max} sein`);
  return v as number;
};
const text = (v: unknown, max: number, what: string, required = false): string => {
  if (typeof v !== 'string' || v.length > max || /[\u0000-\u0008\u000b-\u001f\u007f]/.test(v)) fail(`${what}: Text bis ${max} Zeichen`);
  if (required && !(v as string).trim()) fail(`${what} fehlt`);
  return v as string;
};
function fields(raw: Record<string, unknown>, keys: readonly string[], what: string): void {
  const extra = Object.keys(raw).filter(k => !keys.includes(k));
  if (extra.length) fail(`${what}: unbekannte Felder ${extra.join(', ')}`);
}

export const emptyWorldPlan = (): WorldPlan => ({ schemaVersion: WORLD_PLAN_SCHEMA_VERSION, revision: 0, updatedAt: new Date(0).toISOString(), items: [] });

/** Validates one item (operation input and backup restore). Returns a fresh copy. */
export function checkWorldItem(raw: unknown): WorldItem {
  if (!isObj(raw)) return fail('Eintrag ist kein Objekt');
  if (typeof raw.id !== 'string' || !ID.test(raw.id)) fail('ungültige ID');
  const base = { id: raw.id as string, name: text(raw.name, 120, 'Name', true), note: text(raw.note, 500, 'Notiz'),
    dimension: typeof raw.dimension === 'string' && DIMENSION_ID.test(raw.dimension) ? raw.dimension : fail('Dimension muss eine ID wie minecraft:overworld sein') };
  switch (raw.kind) {
    case 'site': {
      fields(raw, ['kind', 'id', 'name', 'note', 'dimension', 'minX', 'minZ', 'width', 'length', 'y', 'projectId'], 'Bauplatz');
      const site: WorldSite = { kind: 'site', ...base, minX: int(raw.minX, -XZ, XZ, 'X'), minZ: int(raw.minZ, -XZ, XZ, 'Z'),
        width: int(raw.width, 1, WORLD_SITE_MAX_SIDE, 'Breite'), length: int(raw.length, 1, WORLD_SITE_MAX_SIDE, 'Länge'),
        y: raw.y === null ? null : int(raw.y, Y_MIN, Y_MAX, 'Höhe'),
        projectId: raw.projectId === null ? null : typeof raw.projectId === 'string' && raw.projectId.length > 0 && raw.projectId.length <= 128 ? raw.projectId : fail('Projektverweis ungültig') };
      if (site.minX + site.width > XZ + 1 || site.minZ + site.length > XZ + 1) fail('Bauplatz ragt über den Weltrand');
      return site;
    }
    case 'path': {
      fields(raw, ['kind', 'id', 'name', 'note', 'dimension', 'style', 'width', 'points'], 'Weg');
      if (!WORLD_PATH_STYLES.some(s => s.id === raw.style)) fail('unbekannte Wegart');
      if (!Array.isArray(raw.points) || raw.points.length < 2 || raw.points.length > WORLD_PATH_MAX_POINTS) fail(`Weg braucht 2 bis ${WORLD_PATH_MAX_POINTS} Punkte`);
      const points = (raw.points as unknown[]).map((p, i) => {
        if (!Array.isArray(p) || p.length !== 2) return fail(`Wegpunkt ${i + 1} braucht X und Z`);
        return [int(p[0], -XZ, XZ, 'X'), int(p[1], -XZ, XZ, 'Z')] as const;
      });
      return { kind: 'path', ...base, style: raw.style as WorldPathStyle, width: int(raw.width, 1, 15, 'Wegbreite'), points };
    }
    case 'point': {
      fields(raw, ['kind', 'id', 'name', 'note', 'dimension', 'type', 'x', 'y', 'z'], 'Punkt');
      if (!WORLD_POINT_TYPES.some(t => t.id === raw.type)) fail('unbekannte Punktart');
      return { kind: 'point', ...base, type: raw.type as WorldPointType, x: int(raw.x, -XZ, XZ, 'X'), y: int(raw.y, Y_MIN, Y_MAX, 'Y'), z: int(raw.z, -XZ, XZ, 'Z') };
    }
    default: return fail(`unbekannte Art ${String(raw.kind)}`);
  }
}

/** Validates a stored plan: schema, unique ids, item limit. */
export function checkWorldPlan(raw: unknown): WorldPlan {
  if (!isObj(raw)) return fail('kein Objekt');
  fields(raw, ['schemaVersion', 'revision', 'updatedAt', 'items'], 'Weltplan');
  if (raw.schemaVersion !== WORLD_PLAN_SCHEMA_VERSION) fail(`unbekannte Schemaversion ${String(raw.schemaVersion)}`);
  const revision = int(raw.revision, 0, Number.MAX_SAFE_INTEGER, 'Revision');
  if (typeof raw.updatedAt !== 'string' || !Number.isFinite(Date.parse(raw.updatedAt))) fail('ungültige Änderungszeit');
  if (!Array.isArray(raw.items) || raw.items.length > WORLD_PLAN_MAX_ITEMS) fail(`höchstens ${WORLD_PLAN_MAX_ITEMS} Einträge`);
  const items = (raw.items as unknown[]).map(checkWorldItem), ids = new Set<string>();
  for (const i of items) { if (ids.has(i.id)) fail(`ID ${i.id} doppelt`); ids.add(i.id); }
  return { schemaVersion: WORLD_PLAN_SCHEMA_VERSION, revision, updatedAt: raw.updatedAt as string, items };
}

export function describeWorldPlanOp(op: WorldPlanOp): string {
  const what = (i: WorldItem) => `${i.kind === 'site' ? 'Bauplatz' : i.kind === 'path' ? 'Weg' : pointTypeLabel(i.type)} „${i.name}“`;
  switch (op.kind) {
    case 'add': return `${what(op.item)} angelegt`;
    case 'insert': return `${what(op.item)} wiederhergestellt`;
    case 'update': return `${what(op.item)} geändert`;
    case 'remove': return 'Eintrag entfernt';
    case 'batch': return op.label;
  }
}

/**
 * Applies one operation and returns the next plan with its exact inverse.
 * The plan's revision is not touched here; the repository increases it on save.
 */
export function applyWorldPlanOp(plan: WorldPlan, op: WorldPlanOp): { plan: WorldPlan; inverse: WorldPlanOp } {
  switch (op.kind) {
    case 'add': {
      const item = checkWorldItem(op.item);
      if (plan.items.some(i => i.id === item.id)) fail(`ID ${item.id} gibt es schon`);
      if (plan.items.length >= WORLD_PLAN_MAX_ITEMS) fail(`höchstens ${WORLD_PLAN_MAX_ITEMS} Einträge`);
      return { plan: { ...plan, items: [...plan.items, item] }, inverse: { kind: 'remove', id: item.id } };
    }
    case 'update': {
      const item = checkWorldItem(op.item), at = plan.items.findIndex(i => i.id === item.id);
      if (at < 0) fail(`Eintrag ${item.id} fehlt`);
      const items = [...plan.items]; const old = items[at]!; items[at] = item;
      return { plan: { ...plan, items }, inverse: { kind: 'update', item: old } };
    }
    case 'insert': {
      const item = checkWorldItem(op.item);
      if (plan.items.some(i => i.id === item.id)) fail(`ID ${item.id} gibt es schon`);
      if (plan.items.length >= WORLD_PLAN_MAX_ITEMS) fail(`höchstens ${WORLD_PLAN_MAX_ITEMS} Einträge`);
      if (!Number.isInteger(op.at) || op.at < 0 || op.at > plan.items.length) fail('ungültige Listenposition');
      const items = [...plan.items]; items.splice(op.at, 0, item);
      return { plan: { ...plan, items }, inverse: { kind: 'remove', id: item.id } };
    }
    case 'remove': {
      const at = plan.items.findIndex(i => i.id === op.id);
      if (at < 0) fail(`Eintrag ${op.id} fehlt`);
      // The inverse puts the entry back at its old place, so undo keeps list order.
      return { plan: { ...plan, items: plan.items.filter(i => i.id !== op.id) }, inverse: { kind: 'insert', item: plan.items[at]!, at } };
    }
    case 'batch': {
      if (op.ops.length > WORLD_PLAN_MAX_ITEMS * 2) fail('zu viele Schritte');
      let next = plan; const inverses: WorldPlanOp[] = [];
      for (const o of op.ops) { const r = applyWorldPlanOp(next, o); next = r.plan; inverses.unshift(r.inverse); }
      return { plan: next, inverse: { kind: 'batch', label: `Rückgängig: ${op.label}`, ops: inverses } };
    }
  }
}

// ------------------------------------------------------------------ helpers

export const pointTypeLabel = (t: WorldPointType): string => WORLD_POINT_TYPES.find(x => x.id === t)?.label ?? t;
export const pathStyleOf = (s: WorldPathStyle) => WORLD_PATH_STYLES.find(x => x.id === s) ?? WORLD_PATH_STYLES[0]!;

let counter = 0;
/** Short unique id; `seed` makes tests deterministic. */
export function newWorldItemId(prefix: 'site' | 'path' | 'point', seed?: string): string {
  if (seed) return `${prefix}_${seed}`;
  counter = (counter + 1) % 1_000_000;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.floor(Math.random() * 36 ** 4).toString(36)}`;
}

export function itemsOf(plan: WorldPlan, dimension: string): WorldItem[] { return plan.items.filter(i => i.dimension === dimension); }

/** Block columns of a rectangle given by two corner columns (inclusive), in any order. */
export function siteFromCorners(a: readonly [number, number], b: readonly [number, number]): Pick<WorldSite, 'minX' | 'minZ' | 'width' | 'length'> {
  const minX = Math.min(a[0], b[0]), minZ = Math.min(a[1], b[1]);
  return { minX, minZ, width: Math.min(WORLD_SITE_MAX_SIDE, Math.abs(a[0] - b[0]) + 1), length: Math.min(WORLD_SITE_MAX_SIDE, Math.abs(a[1] - b[1]) + 1) };
}

/** Snaps a site to whole chunks (16×16) around its current area. */
export function snapSiteToChunks(s: Pick<WorldSite, 'minX' | 'minZ' | 'width' | 'length'>): Pick<WorldSite, 'minX' | 'minZ' | 'width' | 'length'> {
  const x0 = Math.floor(s.minX / 16) * 16, z0 = Math.floor(s.minZ / 16) * 16;
  const x1 = Math.ceil((s.minX + s.width) / 16) * 16, z1 = Math.ceil((s.minZ + s.length) / 16) * 16;
  return { minX: x0, minZ: z0, width: Math.min(WORLD_SITE_MAX_SIDE, x1 - x0), length: Math.min(WORLD_SITE_MAX_SIDE, z1 - z0) };
}

/**
 * Columns of a path: every segment is walked block by block (supercover
 * Bresenham, no diagonal gaps, so a player can walk it), widened by a square
 * brush of `width` columns. Sorted, without duplicates.
 */
export function pathColumns(path: Pick<WorldPath, 'points' | 'width'>, limit = 200_000): [number, number][] {
  const seen = new Set<string>(), out: [number, number][] = [];
  const r0 = -Math.floor((path.width - 1) / 2), r1 = r0 + path.width - 1;
  const add = (x: number, z: number) => {
    for (let dx = r0; dx <= r1; dx++) for (let dz = r0; dz <= r1; dz++) {
      const k = `${x + dx},${z + dz}`;
      if (!seen.has(k)) { if (out.length >= limit) fail(`Weg zu groß (über ${limit} Spalten)`); seen.add(k); out.push([x + dx, z + dz]); }
    }
  };
  for (let i = 0; i + 1 < path.points.length; i++) {
    let [x, z] = path.points[i]!; const [x1, z1] = path.points[i + 1]!;
    const dx = Math.abs(x1 - x), dz = Math.abs(z1 - z), sx = x < x1 ? 1 : -1, sz = z < z1 ? 1 : -1;
    add(x, z);
    // One axis per step (four-connected): step along the axis whose next block border is nearer.
    for (let ix = 0, iz = 0; ix < dx || iz < dz;) {
      if ((0.5 + ix) / dx < (0.5 + iz) / dz) { x += sx; ix++; } else { z += sz; iz++; }
      add(x, z);
    }
  }
  if (path.points.length === 1) add(path.points[0]![0], path.points[0]![1]);
  return out.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

/** Length of the centre line in blocks (Euclidean, rounded to one decimal). */
export function pathLength(points: readonly (readonly [number, number])[]): number {
  let sum = 0;
  for (let i = 0; i + 1 < points.length; i++) sum += Math.hypot(points[i + 1]![0] - points[i]![0], points[i + 1]![1] - points[i]![1]);
  return Math.round(sum * 10) / 10;
}

/** XZ bounds of an item: [minX, minZ, maxXExclusive, maxZExclusive]. */
export function itemBounds(item: WorldItem): [number, number, number, number] {
  if (item.kind === 'site') return [item.minX, item.minZ, item.minX + item.width, item.minZ + item.length];
  if (item.kind === 'point') return [item.x, item.z, item.x + 1, item.z + 1];
  const h = Math.floor((item.width - 1) / 2), e = item.width - 1 - h;
  const xs = item.points.map(p => p[0]), zs = item.points.map(p => p[1]);
  return [Math.min(...xs) - h, Math.min(...zs) - h, Math.max(...xs) + e + 1, Math.max(...zs) + e + 1];
}

function segmentDistance(px: number, pz: number, a: readonly [number, number], b: readonly [number, number]): number {
  const ax = a[0] + 0.5, az = a[1] + 0.5, bx = b[0] + 0.5, bz = b[1] + 0.5;
  const vx = bx - ax, vz = bz - az, len = vx * vx + vz * vz;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / len)) : 0;
  return Math.hypot(px - (ax + t * vx), pz - (az + t * vz));
}

/**
 * Item under a world position (fractional block coordinates); `tolerance`
 * in blocks (grows when zoomed out). Points win over paths, paths over sites,
 * smaller sites over larger ones.
 */
export function itemAt(items: readonly WorldItem[], x: number, z: number, tolerance = 1): WorldItem | null {
  let best: { item: WorldItem; rank: number } | null = null;
  for (const item of items) {
    let rank = Infinity;
    if (item.kind === 'point') { const d = Math.hypot(x - (item.x + 0.5), z - (item.z + 0.5)); if (d <= tolerance + 0.5) rank = d; }
    else if (item.kind === 'path') {
      let d = Infinity;
      for (let i = 0; i + 1 < item.points.length; i++) d = Math.min(d, segmentDistance(x, z, item.points[i]!, item.points[i + 1]!));
      if (d <= item.width / 2 + tolerance) rank = 1000 + d;
    } else if (x >= item.minX && x < item.minX + item.width && z >= item.minZ && z < item.minZ + item.length) rank = 1e6 + item.width * item.length;
    if (rank < (best?.rank ?? Infinity)) best = { item, rank };
  }
  return best?.item ?? null;
}

/** Moves any item by whole blocks (sites, paths and points alike). */
export function moveItem<T extends WorldItem>(item: T, dx: number, dz: number, dy = 0): T {
  if (item.kind === 'site') return { ...item, minX: item.minX + dx, minZ: item.minZ + dz, ...(item.y !== null && { y: item.y + dy }) };
  if (item.kind === 'point') return { ...item, x: item.x + dx, y: item.y + dy, z: item.z + dz };
  return { ...item, points: item.points.map(p => [p[0] + dx, p[1] + dz] as const) };
}

/** Sites overlapping each other or a given rectangle (minX, minZ, maxX excl., maxZ excl.). */
export function sitesTouching(items: readonly WorldItem[], rect: readonly [number, number, number, number], exceptId?: string): WorldSite[] {
  return items.filter((i): i is WorldSite => i.kind === 'site' && i.id !== exceptId
    && i.minX < rect[2] && i.minX + i.width > rect[0] && i.minZ < rect[3] && i.minZ + i.length > rect[1]);
}

/** Totals for the plan overview of one dimension. */
export function worldPlanSummary(items: readonly WorldItem[]): { sites: number; freeSites: number; siteArea: number; paths: number; pathBlocks: number; pathLength: number; points: number } {
  let sites = 0, freeSites = 0, siteArea = 0, paths = 0, pathBlocks = 0, length = 0, points = 0;
  for (const i of items) {
    if (i.kind === 'site') { sites++; if (!i.projectId) freeSites++; siteArea += i.width * i.length; }
    else if (i.kind === 'path') { paths++; length += pathLength(i.points); pathBlocks += pathColumns(i).length; }
    else points++;
  }
  return { sites, freeSites, siteArea, paths, pathBlocks, pathLength: Math.round(length * 10) / 10, points };
}
