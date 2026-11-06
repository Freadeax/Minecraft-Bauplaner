import { DomainError } from '../core/types.js';
import { WORLD_GROUP_MAX, WORLD_PATH_MAX_POINTS, WORLD_PLAN_MAX_ITEMS, WORLD_ZONE_MAX_POINTS, itemBounds, newWorldItemId } from './worldPlan.js';
import type { WorldItem, WorldPath, WorldPlan, WorldPlanOp, WorldSite, WorldZone } from './worldPlan.js';

/**
 * Weltbuilder (MAP-04): editing several Weltplan entries at once – delete,
 * duplicate, rotate, mirror, align to the ground – and the corners of paths.
 * Everything here is pure: it returns new items or one batch operation for
 * `applyWorldPlanOp`, so every action is a single undoable step with an
 * exact inverse. Rotation and mirroring work on whole block columns around an
 * integer pivot, so four quarter turns or two mirrors give the original back.
 */

const fail = (message: string): never => { throw new DomainError('INVALID', `Weltplan: ${message}`); };
type XZ = readonly [number, number];

/** One batch that removes the given entries (unknown ids are ignored); null when nothing matches. */
export function removeItemsOp(plan: WorldPlan, ids: readonly string[], label?: string): WorldPlanOp | null {
  const want = new Set(ids), hit = plan.items.filter(i => want.has(i.id));
  if (!hit.length) return null;
  return { kind: 'batch', label: label ?? (hit.length === 1 ? `„${hit[0]!.name}“ gelöscht` : `${hit.length} Einträge gelöscht`), ops: hit.map(i => ({ kind: 'remove', id: i.id }) as WorldPlanOp) };
}

/** Bounds of several entries: [minX, minZ, maxXExclusive, maxZExclusive]; null when empty. */
export function selectionBounds(items: readonly WorldItem[]): [number, number, number, number] | null {
  if (!items.length) return null;
  const b = items.map(itemBounds);
  return [Math.min(...b.map(x => x[0])), Math.min(...b.map(x => x[1])), Math.max(...b.map(x => x[2])), Math.max(...b.map(x => x[3]))];
}

/** Integer pivot near the centre of the entries (rotation/mirror stay on the block grid). */
export function selectionPivot(items: readonly WorldItem[]): XZ {
  const b = selectionBounds(items) ?? [0, 0, 1, 1];
  return [Math.round((b[0] + b[2]) / 2), Math.round((b[1] + b[3]) / 2)];
}

/** Entries whose area touches a rectangle (minX, minZ, maxX excl., maxZ excl.). */
export function itemsInRect(items: readonly WorldItem[], rect: readonly [number, number, number, number]): WorldItem[] {
  return items.filter(i => { const b = itemBounds(i); return b[0] < rect[2] && b[2] > rect[0] && b[1] < rect[3] && b[3] > rect[1]; });
}

/** Column (x, z) turned clockwise (north up: east → south) `turns` quarter turns around an integer pivot. */
export function rotateColumn(c: XZ, pivot: XZ, turns: number): [number, number] {
  let x = c[0] - pivot[0], z = c[1] - pivot[1];
  // Work on column centres (k + 0.5) so the result is a whole column again.
  for (let t = ((turns % 4) + 4) % 4; t > 0; t--) { const nx = -(z + 0.5) - 0.5, nz = x; x = nx; z = nz; }
  return [x + pivot[0], z + pivot[1]];
}

/** Column mirrored across the line x = pivot (axis 'x': east ↔ west) or z = pivot (axis 'z': north ↔ south). */
export function mirrorColumn(c: XZ, pivot: XZ, axis: 'x' | 'z'): [number, number] {
  return axis === 'x' ? [2 * pivot[0] - c[0] - 1, c[1]] : [c[0], 2 * pivot[1] - c[1] - 1];
}

function mapColumns<T extends WorldItem>(item: T, f: (c: XZ) => [number, number]): T {
  if (item.kind === 'point') { const [x, z] = f([item.x, item.z]); return { ...item, x, z }; }
  if (item.kind === 'path' || item.kind === 'zone') return { ...item, points: item.points.map(p => f(p) as readonly [number, number]) };
  const a = f([item.minX, item.minZ]), b = f([item.minX + item.width - 1, item.minZ + item.length - 1]);
  return { ...item, minX: Math.min(a[0], b[0]), minZ: Math.min(a[1], b[1]), width: Math.abs(a[0] - b[0]) + 1, length: Math.abs(a[1] - b[1]) + 1 };
}

export function rotateItem<T extends WorldItem>(item: T, pivot: XZ, turns = 1): T { return mapColumns(item, c => rotateColumn(c, pivot, turns)); }
export function mirrorItem<T extends WorldItem>(item: T, pivot: XZ, axis: 'x' | 'z'): T { return mapColumns(item, c => mirrorColumn(c, pivot, axis)); }

const canonical = (v: unknown): string => JSON.stringify(v, (_k, x: unknown) =>
  x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x as Record<string, unknown>).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : x);

/** Batch that replaces entries by changed copies (one undo step); null when nothing changed. */
export function updateItemsOp(before: readonly WorldItem[], after: readonly WorldItem[], label: string): WorldPlanOp | null {
  const ops: WorldPlanOp[] = [];
  // Key order does not count (removing and re-adding a field like `group` moves it to the end).
  after.forEach((a, k) => { if (canonical(a) !== canonical(before[k])) ops.push({ kind: 'update', item: a }); });
  return ops.length ? { kind: 'batch', label, ops } : null;
}

/**
 * Copies of the entries with new ids and „(Kopie)“ names, shifted so they do
 * not lie on the originals: by default east of the whole selection plus a gap
 * of two blocks. Sites keep their project link only when asked (a project
 * stands on one site).
 */
export function duplicateItems(items: readonly WorldItem[], opts: { dx?: number; dz?: number; existing?: number; keepProject?: boolean; seed?: string } = {}): WorldItem[] {
  if (!items.length) return [];
  if ((opts.existing ?? 0) + items.length > WORLD_PLAN_MAX_ITEMS) fail(`höchstens ${WORLD_PLAN_MAX_ITEMS} Einträge`);
  const b = selectionBounds(items)!;
  const dx = opts.dx ?? b[2] - b[0] + 2, dz = opts.dz ?? 0;
  return items.map((i, k) => {
    const name = `${i.name} (Kopie)`.slice(0, 120);
    const id = newWorldItemId(i.kind, opts.seed ? `${opts.seed}${k}` : undefined);
    // Copies start unlocked: a lock protects the original, and undoing the copy must be able to remove it.
    const { locked: _locked, ...open } = mapColumns(i, c => [c[0] + dx, c[1] + dz]);
    const moved = open as WorldItem;
    return i.kind === 'site' ? { ...(moved as WorldSite), id, name, projectId: opts.keepProject ? i.projectId : null } : { ...moved, id, name };
  });
}

// ------------------------------------------------------------------ path and zone corners

/** Entries with corners: paths (open) and zones (closed polygons, MAP-06). */
export type Polyline = WorldPath | WorldZone;
const minCorners = (p: Polyline) => p.kind === 'zone' ? 3 : 2;
const maxCorners = (p: Polyline) => p.kind === 'zone' ? WORLD_ZONE_MAX_POINTS : WORLD_PATH_MAX_POINTS;

/** Index of the corner of a path or zone near (x, z) in blocks; -1 when none. */
export function pathVertexAt(path: Polyline, x: number, z: number, tolerance = 1): number {
  let best = -1, bestD = Infinity;
  path.points.forEach((p, i) => { const d = Math.hypot(x - (p[0] + 0.5), z - (p[1] + 0.5)); if (d <= tolerance && d < bestD) { best = i; bestD = d; } });
  return best;
}

export function movePathVertex<T extends Polyline>(path: T, index: number, to: XZ): T {
  if (index < 0 || index >= path.points.length) fail('Ecke fehlt');
  return { ...path, points: path.points.map((p, i) => i === index ? [to[0], to[1]] as const : p) };
}

/** New corner after corner `after` (so between `after` and `after + 1`; for a zone also on the closing side). */
export function insertPathVertex<T extends Polyline>(path: T, after: number, at: XZ): T {
  if (after < 0 || after >= path.points.length - (path.kind === 'zone' ? 0 : 1)) fail(path.kind === 'zone' ? 'Zonenabschnitt fehlt' : 'Wegabschnitt fehlt');
  if (path.points.length >= maxCorners(path)) fail(`${path.kind === 'zone' ? 'Zone' : 'Weg'} hat schon ${maxCorners(path)} Ecken`);
  const points = [...path.points]; points.splice(after + 1, 0, [at[0], at[1]] as const);
  return { ...path, points };
}

export function removePathVertex<T extends Polyline>(path: T, index: number): T {
  if (index < 0 || index >= path.points.length) fail('Ecke fehlt');
  if (path.points.length <= minCorners(path)) fail(path.kind === 'zone' ? 'eine Zone braucht mindestens drei Ecken – lösche stattdessen die ganze Zone' : 'ein Weg braucht mindestens zwei Ecken – lösche stattdessen den ganzen Weg');
  return { ...path, points: path.points.filter((_, i) => i !== index) };
}

export function reversePath(path: WorldPath): WorldPath { return { ...path, points: [...path.points].reverse() }; }

/** Splits a path at an inner corner into two paths that share that corner. */
export function splitPath(path: WorldPath, index: number, seed?: string): [WorldPath, WorldPath] {
  if (index <= 0 || index >= path.points.length - 1) fail('teilen geht nur an einer inneren Ecke');
  return [{ ...path, points: path.points.slice(0, index + 1) },
    { ...path, id: newWorldItemId('path', seed), name: `${path.name} (Teil 2)`.slice(0, 120), points: path.points.slice(index) }];
}

/** Joins b to the end of a when one end of b meets an end of a (b's direction is adjusted). */
export function joinPaths(a: WorldPath, b: WorldPath): WorldPath {
  const same = (p: XZ, q: XZ) => p[0] === q[0] && p[1] === q[1];
  const a0 = a.points[0]!, a1 = a.points.at(-1)!, b0 = b.points[0]!, b1 = b.points.at(-1)!;
  let pts: (readonly [number, number])[];
  if (same(a1, b0)) pts = [...a.points, ...b.points.slice(1)];
  else if (same(a1, b1)) pts = [...a.points, ...[...b.points].reverse().slice(1)];
  else if (same(a0, b1)) pts = [...b.points, ...a.points.slice(1)];
  else if (same(a0, b0)) pts = [...[...b.points].reverse(), ...a.points.slice(1)];
  else return fail('die Wege berühren sich nicht an einem Ende');
  if (pts.length > WORLD_PATH_MAX_POINTS) fail(`höchstens ${WORLD_PATH_MAX_POINTS} Ecken`);
  return { ...a, points: pts };
}

// ------------------------------------------------------------------ ground

export type GroundAt = (x: number, z: number) => { readonly y: number } | null;

/**
 * Height of an entry from the known ground (survey or live chunks): a point
 * stands one block above the ground, a site gets the median ground of its
 * columns + 1 (sampled on a grid for large sites). Paths have no height.
 * Returns null when no column under the entry is known.
 */
export function groundHeight(item: WorldItem, groundAt: GroundAt): { y: number; known: number; total: number } | null {
  if (item.kind === 'point') { const g = groundAt(item.x, item.z); return g ? { y: g.y + 1, known: 1, total: 1 } : null; }
  if (item.kind === 'path' || item.kind === 'zone') return null;
  const step = Math.max(1, Math.ceil(Math.max(item.width, item.length) / 64)), ys: number[] = [];
  let total = 0;
  for (let x = item.minX; x < item.minX + item.width; x += step) for (let z = item.minZ; z < item.minZ + item.length; z += step) {
    total++; const g = groundAt(x, z); if (g) ys.push(g.y);
  }
  if (!ys.length) return null;
  ys.sort((a, b) => a - b);
  return { y: ys[Math.floor(ys.length / 2)]! + 1, known: ys.length, total };
}

/** Sets the named layer of entries (empty = no layer); one batch, null when nothing changes. */
export function setLayerOp(items: readonly WorldItem[], layer: string): WorldPlanOp | null {
  const name = layer.trim();
  const next = items.map(i => { const { layer: _old, ...rest } = i; return name ? { ...rest, layer: name } as WorldItem : rest as WorldItem; });
  return updateItemsOp(items, next, name ? `Ebene „${name}“ zugewiesen` : 'Aus der Ebene genommen');
}

/** Entries with their height set from the ground; entries without known ground stay unchanged. */
export function alignToGround(items: readonly WorldItem[], groundAt: GroundAt): { items: WorldItem[]; aligned: number; unknown: number } {
  let aligned = 0, unknown = 0;
  const out = items.map(i => {
    if (i.kind === 'path' || i.kind === 'zone') return i;
    const g = groundHeight(i, groundAt);
    if (!g) { unknown++; return i; }
    aligned++;
    return i.kind === 'point' ? { ...i, y: g.y } : { ...i, y: g.y };
  });
  return { items: out, aligned, unknown };
}

// ------------------------------------------------------------------ groups and locks (schema 3)

/** Puts entries into a named group (empty = out of their group); one batch, null when nothing changes. */
export function setGroupOp(items: readonly WorldItem[], group: string): WorldPlanOp | null {
  const name = group.trim();
  if (name.length > WORLD_GROUP_MAX) fail(`Gruppenname bis ${WORLD_GROUP_MAX} Zeichen`);
  const next = items.map(i => { const { group: _old, ...rest } = i; return name ? { ...rest, group: name } as WorldItem : rest as WorldItem; });
  return updateItemsOp(items, next, name ? `Gruppe „${name}“ gebildet` : 'Aus der Gruppe genommen');
}

/** Locks or unlocks entries; one batch, null when nothing changes. */
export function setLockedOp(items: readonly WorldItem[], locked: boolean): WorldPlanOp | null {
  const next = items.map(i => { const { locked: _old, ...rest } = i; return locked ? { ...rest, locked: true } as WorldItem : rest as WorldItem; });
  const what = items.length === 1 ? `„${items[0]!.name}“` : `${items.length} Einträge`;
  return updateItemsOp(items, next, `${what} ${locked ? 'gesperrt' : 'entsperrt'}`);
}

/** Renames a group on all its entries (merging into an existing group of that name); null when nothing changes. */
export function renameGroupOp(items: readonly WorldItem[], from: string, to: string): WorldPlanOp | null {
  const members = items.filter(i => i.group === from);
  const op = setGroupOp(members, to);
  return op && op.kind === 'batch' ? { ...op, label: to.trim() ? `Gruppe „${from}“ in „${to.trim()}“ umbenannt` : `Gruppe „${from}“ aufgelöst` } : op;
}

/**
 * Ids to select for a click on an entry: the entry and, when it is in a
 * group, every other entry of that group among `items` (the visible ones).
 * The clicked entry comes last, so it stays the primary of the selection.
 */
export function withGroupMates(items: readonly WorldItem[], id: string): string[] {
  const hit = items.find(i => i.id === id);
  if (!hit?.group) return [id];
  return [...items.filter(i => i.group === hit.group && i.id !== id).map(i => i.id), id];
}

/** Splits entries into those that may be moved or deleted and the locked ones. */
export function splitLocked<T extends WorldItem>(items: readonly T[]): { open: T[]; locked: T[] } {
  const open: T[] = [], locked: T[] = [];
  for (const i of items) (i.locked ? locked : open).push(i);
  return { open, locked };
}

/** Per group: number of entries and how many of them are locked (sorted by name). */
export function groupSummary(items: readonly WorldItem[]): { name: string; count: number; locked: number }[] {
  const m = new Map<string, { count: number; locked: number }>();
  for (const i of items) if (i.group) { const e = m.get(i.group) ?? { count: 0, locked: 0 }; e.count++; if (i.locked) e.locked++; m.set(i.group, e); }
  return [...m].map(([name, e]) => ({ name, ...e })).sort((a, b) => a.name.localeCompare(b.name, 'de'));
}
