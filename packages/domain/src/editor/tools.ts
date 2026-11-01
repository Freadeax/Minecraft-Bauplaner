import { transformBlockState, transformVector } from '../../../voxel/src/states.js';
import type { BlockState, Bounds, Transform, Vec3 } from '../../../voxel/src/types.js';
import { DomainError } from '../types.js';
import { MAX_EDIT_CELLS, cellAt, draftEntries, keyPos, posKey, sameSlot } from './draft.js';
import type { CellChange, CellSlot, CellValue, Draft, Edit } from './draft.js';

/**
 * Werkzeuge des Blockeditors (B15). Every tool is a pure function from the
 * draft (and its arguments) to an Edit; nothing is applied here. All shapes
 * use the same integer cell coordinates as the payload (no second coordinate
 * rule): a box is given by two inclusive corner cells.
 */
export type Corner = Vec3;
export interface Box { readonly a: Corner; readonly b: Corner }

export function boxBounds(box: Box): Bounds {
  return {
    min: [0, 1, 2].map(i => Math.min(box.a[i]!, box.b[i]!)) as unknown as Vec3,
    maxExclusive: [0, 1, 2].map(i => Math.max(box.a[i]!, box.b[i]!) + 1) as unknown as Vec3,
  };
}
export function boxSize(box: Box): Vec3 {
  const b = boxBounds(box);
  return [b.maxExclusive[0] - b.min[0], b.maxExclusive[1] - b.min[1], b.maxExclusive[2] - b.min[2]];
}
export function boxVolume(box: Box): number { const s = boxSize(box); return s[0] * s[1] * s[2]; }
export function inBox(box: Box, p: Vec3): boolean {
  const b = boxBounds(box);
  return p.every((n, i) => n >= b.min[i]! && n < b.maxExclusive[i]!);
}
function guard(count: number): void {
  if (count > MAX_EDIT_CELLS) throw new DomainError('LIMIT', `Der Bereich umfasst ${count.toLocaleString('de-DE')} Zellen; höchstens ${MAX_EDIT_CELLS.toLocaleString('de-DE')} je Schritt.`);
}
function* boxCells(box: Box): Generator<Vec3> {
  const { min, maxExclusive: max } = boxBounds(box);
  for (let y = min[1]; y < max[1]; y++) for (let z = min[2]; z < max[2]; z++) for (let x = min[0]; x < max[0]; x++) yield [x, y, z];
}

export function setCells(positions: Iterable<Vec3>, value: CellSlot, label: string): Edit {
  const changes: CellChange[] = [];
  for (const position of positions) changes.push({ position, value });
  guard(changes.length);
  return { label, changes };
}

export type BoxShape = 'fill' | 'hollow' | 'walls' | 'frame' | 'floor';
export const BOX_SHAPE_LABEL: Readonly<Record<BoxShape, string>> = {
  fill: 'Quader füllen', hollow: 'Hohlkörper', walls: 'Nur Wände', frame: 'Nur Kanten', floor: 'Boden und Decke',
};

/**
 * Box shapes. `inner` decides what happens inside hollow shapes:
 * undefined = keep the cells, a value = write it (e.g. explicit air to clear).
 */
export function boxEdit(box: Box, shape: BoxShape, value: CellSlot, inner?: CellSlot): Edit {
  guard(boxVolume(box));
  const { min, maxExclusive } = boxBounds(box), max = maxExclusive.map(n => n - 1);
  const edge = (p: Vec3, i: number) => p[i] === min[i] || p[i] === max[i];
  const changes: CellChange[] = [];
  for (const p of boxCells(box)) {
    const ex = edge(p, 0), ey = edge(p, 1), ez = edge(p, 2);
    const on = shape === 'fill' ? true
      : shape === 'hollow' ? ex || ey || ez
      : shape === 'walls' ? ex || ez
      : shape === 'floor' ? ey
      : (ex && ey) || (ex && ez) || (ey && ez);
    if (on) changes.push({ position: p, value });
    else if (inner !== undefined) changes.push({ position: p, value: inner });
  }
  return { label: BOX_SHAPE_LABEL[shape], changes };
}

/** Sphere (or dome) around a centre cell; radius in blocks, measured centre to centre. */
export function sphereEdit(centre: Vec3, radius: number, value: CellSlot, opts: { hollow?: boolean; half?: 'upper' | 'lower' } = {}): Edit {
  if (!Number.isInteger(radius) || radius < 0 || radius > 64) throw new DomainError('INVALID', 'Radius 0–64 erwartet');
  guard((2 * radius + 1) ** 3);
  const r2 = (radius + 0.5) ** 2, inner2 = (radius - 0.5) ** 2, changes: CellChange[] = [];
  for (let dy = -radius; dy <= radius; dy++) {
    if ((opts.half === 'upper' && dy < 0) || (opts.half === 'lower' && dy > 0)) continue;
    for (let dz = -radius; dz <= radius; dz++) for (let dx = -radius; dx <= radius; dx++) {
      const d = dx * dx + dy * dy + dz * dz;
      if (d > r2) continue;
      if (opts.hollow && d < inner2) {
        // Keep the shell closed: a cell is inner only if all six neighbours are inside the sphere too.
        const n = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].every(([a, b, c]) => (dx + a!) ** 2 + (dy + b!) ** 2 + (dz + c!) ** 2 <= r2);
        if (n) continue;
      }
      changes.push({ position: [centre[0] + dx, centre[1] + dy, centre[2] + dz], value });
    }
  }
  return { label: opts.half ? 'Kuppel' : opts.hollow ? 'Hohlkugel' : 'Kugel', changes };
}

/** Vertical cylinder standing on the centre cell; height ≥ 1. */
export function cylinderEdit(base: Vec3, radius: number, height: number, value: CellSlot, opts: { hollow?: boolean } = {}): Edit {
  if (!Number.isInteger(radius) || radius < 0 || radius > 64) throw new DomainError('INVALID', 'Radius 0–64 erwartet');
  if (!Number.isInteger(height) || height < 1 || height > 384) throw new DomainError('INVALID', 'Höhe 1–384 erwartet');
  guard((2 * radius + 1) ** 2 * height);
  const r2 = (radius + 0.5) ** 2, inside = (x: number, z: number) => x * x + z * z <= r2, changes: CellChange[] = [];
  for (let dz = -radius; dz <= radius; dz++) for (let dx = -radius; dx <= radius; dx++) {
    if (!inside(dx, dz)) continue;
    if (opts.hollow && inside(dx + 1, dz) && inside(dx - 1, dz) && inside(dx, dz + 1) && inside(dx, dz - 1)) continue;
    for (let dy = 0; dy < height; dy++) changes.push({ position: [base[0] + dx, base[1] + dy, base[2] + dz], value });
  }
  return { label: opts.hollow ? 'Rohr' : 'Zylinder', changes };
}

/** Straight 3D line between two cells (inclusive), each step moves along the dominant axis. */
export function lineEdit(a: Vec3, b: Vec3, value: CellSlot): Edit {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], steps = Math.max(...d.map(Math.abs));
  guard(steps + 1);
  const seen = new Set<string>(), changes: CellChange[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = steps ? i / steps : 0;
    const p: Vec3 = [Math.round(a[0] + d[0]! * t), Math.round(a[1] + d[1]! * t), Math.round(a[2] + d[2]! * t)];
    const k = posKey(p);
    if (!seen.has(k)) { seen.add(k); changes.push({ position: p, value }); }
  }
  return { label: 'Linie', changes };
}

export type PropertySchema = Readonly<Record<string, readonly string[]>>;
export type SchemaLookup = (id: string) => PropertySchema | undefined;

export interface ReplaceQuery {
  /** Block id to match; with `properties` only that exact state, otherwise all states of the id. */
  readonly from: { readonly id: string; readonly properties?: Readonly<Record<string, string>> } | 'air' | 'erase';
  readonly to: CellSlot;
  /** Copy properties the target block also has (facing, half, waterlogged …). Default true. */
  readonly keepProperties?: boolean;
  /** Restrict to a box; otherwise the whole model. */
  readonly box?: Box;
}

function sameProps(a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>>): boolean {
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every(k => a[k] === b[k]);
}
function matches(v: CellValue, from: ReplaceQuery['from']): boolean {
  if (from === 'air' || from === 'erase') return v.kind === from;
  return v.kind === 'block' && v.state.id === from.id && (!from.properties || sameProps(v.state.properties, from.properties));
}

/**
 * Carries properties from `source` over to the `target` block where the
 * target's schema allows the value; other target properties stay. Without a
 * schema only properties the target state already has are carried.
 */
export function carryProperties(source: BlockState, target: BlockState, schemaOf?: SchemaLookup): BlockState {
  const schema = schemaOf?.(target.id), props: Record<string, string> = { ...target.properties };
  for (const [k, v] of Object.entries(source.properties)) {
    if (schema ? schema[k]?.includes(v) : Object.hasOwn(target.properties, k)) props[k] = v;
  }
  return { id: target.id, properties: props };
}

/** Replace blocks by id or state. A block entity survives only when the block id stays the same. */
export function replaceEdit(draft: Draft, q: ReplaceQuery, schemaOf?: SchemaLookup): Edit {
  const changes: CellChange[] = [];
  for (const [k, v] of draftEntries(draft)) {
    const p = keyPos(k);
    if (q.box && !inBox(q.box, p)) continue;
    if (!matches(v, q.from)) continue;
    let next = q.to;
    if (next?.kind === 'block' && v.kind === 'block') {
      const state = q.keepProperties === false ? next.state : carryProperties(v.state, next.state, schemaOf);
      next = v.entity && state.id === v.state.id ? { kind: 'block', state, entity: v.entity } : { kind: 'block', state };
    }
    changes.push({ position: p, value: next });
  }
  guard(changes.length);
  return { label: 'Ersetzen', changes };
}

/** Same as above but counts only; for the UI preview before replacing. */
export function countMatches(draft: Draft, from: ReplaceQuery['from'], box?: Box): number {
  let n = 0;
  for (const [k, v] of draftEntries(draft)) if ((!box || inBox(box, keyPos(k))) && matches(v, from)) n++;
  return n;
}

/**
 * Flood fill from a start cell over all connected cells with the same value
 * (same state, or both empty). `plane` keeps the fill inside one layer;
 * `limitBox` bounds it (required when filling empty space).
 */
export function floodEdit(draft: Draft, start: Vec3, value: CellSlot, opts: { plane?: 'x' | 'y' | 'z'; limitBox?: Box; maxCells?: number } = {}): Edit {
  const target = cellAt(draft, start), max = Math.min(opts.maxCells ?? MAX_EDIT_CELLS, MAX_EDIT_CELLS);
  if (!target && !opts.limitBox) throw new DomainError('INVALID', 'Leere Flächen nur mit Begrenzungsbereich füllen');
  if (sameSlot(target, value)) return { label: 'Fläche füllen', changes: [] };
  const axis = opts.plane ? { x: 0, y: 1, z: 2 }[opts.plane] : -1;
  const dirs = ([[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const).filter(d => axis < 0 || d[axis] === 0);
  const seen = new Set([posKey(start)]), queue: Vec3[] = [start], changes: CellChange[] = [];
  while (queue.length) {
    const p = queue.pop()!;
    changes.push({ position: p, value });
    if (changes.length > max) throw new DomainError('LIMIT', `Die Fläche ist größer als ${max.toLocaleString('de-DE')} Zellen; bitte mit einem Bereich begrenzen.`);
    for (const d of dirs) {
      const n: Vec3 = [p[0] + d[0], p[1] + d[1], p[2] + d[2]], k = posKey(n);
      if (seen.has(k)) continue;
      seen.add(k);
      if (opts.limitBox && !inBox(opts.limitBox, n)) continue;
      if (!opts.limitBox && draft.base && !n.every((c, i) => c >= draft.base!.bounds.min[i]! && c < draft.base!.bounds.maxExclusive[i]!)) continue;
      if (sameSlot(cellAt(draft, n), target)) queue.push(n);
    }
  }
  return { label: 'Fläche füllen', changes };
}

/** Rotates or mirrors the block state of one cell in place (quarter turn clockwise seen from above). */
export function rotateCellEdit(draft: Draft, p: Vec3, t: Pick<Transform, 'quarterTurns' | 'mirrorX'>): { edit: Edit; resolved: boolean; message: string } {
  const v = cellAt(draft, p);
  if (v?.kind !== 'block') return { edit: { label: 'Block drehen', changes: [] }, resolved: false, message: 'Hier ist kein Block.' };
  const r = transformBlockState(v.state, { position: [0, 0, 0], ...t });
  if (!r.resolved) return { edit: { label: 'Block drehen', changes: [] }, resolved: false, message: `${v.state.id} hat keine geprüfte Drehregel; Zustand bleibt unverändert.` };
  const value: CellValue = v.entity ? { kind: 'block', state: r.state, entity: v.entity } : { kind: 'block', state: r.state };
  return { edit: { label: t.mirrorX ? 'Block spiegeln' : 'Block drehen', changes: [{ position: p, value }] }, resolved: true, message: '' };
}

// ------------------------------------------------------------------ clipboard

export interface ClipCell { readonly offset: Vec3; readonly value: CellValue }
/** Copied region relative to its minimum corner. Empty (null) cells are not stored. */
export interface Clipboard { readonly size: Vec3; readonly cells: readonly ClipCell[] }

export function copyBox(draft: Draft, box: Box): Clipboard {
  const { min } = boxBounds(box), cells: ClipCell[] = [];
  for (const [k, v] of draftEntries(draft)) {
    const p = keyPos(k);
    if (inBox(box, p)) cells.push({ offset: [p[0] - min[0], p[1] - min[1], p[2] - min[2]], value: v });
  }
  guard(cells.length);
  return { size: boxSize(box), cells };
}

export interface ClipTransformResult { readonly clip: Clipboard; readonly unresolved: readonly string[] }
/**
 * Rotates (quarter turns clockwise from above) and/or mirrors (along X) a
 * clipboard about its own box, using the shared B7 state rules. States without
 * a rule stay unchanged and are reported.
 */
export function transformClipboard(clip: Clipboard, t: Pick<Transform, 'quarterTurns' | 'mirrorX'>): ClipTransformResult {
  const full: Transform = { position: [0, 0, 0], ...t }, unresolved = new Set<string>();
  const corners = [[0, 0, 0], [clip.size[0], 0, clip.size[2]]].map(c => transformVector(c as unknown as Vec3, full));
  const shift = [0, 1, 2].map(i => -Math.min(corners[0]![i]!, corners[1]![i]!));
  const cells = clip.cells.map(c => {
    // Rotate the cell centre, then return to the minimum corner (same rule as transformCellPosition).
    const r = transformVector([c.offset[0] + 0.5, c.offset[1] + 0.5, c.offset[2] + 0.5], full);
    const offset: Vec3 = [Math.floor(r[0] + shift[0]!), Math.floor(r[1] + shift[1]!), Math.floor(r[2] + shift[2]!)];
    if (c.value.kind !== 'block') return { offset, value: c.value };
    const s = transformBlockState(c.value.state, full);
    if (!s.resolved) unresolved.add(c.value.state.id);
    return { offset, value: c.value.entity ? { kind: 'block' as const, state: s.state, entity: c.value.entity } : { kind: 'block' as const, state: s.state } };
  });
  const size = transformVector(clip.size, full).map(Math.abs) as unknown as Vec3;
  return { clip: { size, cells }, unresolved: [...unresolved].sort() };
}

/** Pastes with the clipboard minimum at `at`. `withAir` false skips explicit air cells. */
export function pasteEdit(clip: Clipboard, at: Vec3, opts: { withAir?: boolean; label?: string } = {}): Edit {
  const changes: CellChange[] = [];
  for (const c of clip.cells) {
    if (c.value.kind === 'air' && opts.withAir === false) continue;
    changes.push({ position: [at[0] + c.offset[0], at[1] + c.offset[1], at[2] + c.offset[2]], value: c.value });
  }
  guard(changes.length);
  return { label: opts.label ?? 'Einfügen', changes };
}

/** Clears the box and writes its content again moved by `delta` (one undo step). */
export function moveBoxEdit(draft: Draft, box: Box, delta: Vec3, t?: Pick<Transform, 'quarterTurns' | 'mirrorX'>): { edit: Edit; unresolved: readonly string[] } {
  const clip0 = copyBox(draft, box), r = t ? transformClipboard(clip0, t) : { clip: clip0, unresolved: [] };
  const { min } = boxBounds(box);
  // A rotated box keeps its centre column: shift so the footprint stays centred on the old one.
  const centre = [0, 1, 2].map(i => Math.floor((clip0.size[i]! - r.clip.size[i]!) / 2));
  const at: Vec3 = [min[0] + delta[0] + centre[0]!, min[1] + delta[1], min[2] + delta[2] + centre[2]!];
  const clear: CellChange[] = clip0.cells.map(c => ({ position: [min[0] + c.offset[0], min[1] + c.offset[1], min[2] + c.offset[2]] as Vec3, value: null }));
  const paste = pasteEdit(r.clip, at).changes;
  return { edit: { label: t ? (t.mirrorX ? 'Bereich spiegeln' : 'Bereich drehen') : 'Bereich verschieben', changes: [...clear, ...paste] }, unresolved: r.unresolved };
}

/** Bounds of the current model, or null when empty. */
export function draftBounds(draft: Draft): Bounds | null {
  let min: number[] | null = null, max: number[] | null = null;
  for (const k of draftEntries(draft).keys()) {
    const p = keyPos(k);
    if (!min || !max) { min = [...p]; max = p.map(n => n + 1); continue; }
    for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i]!, p[i]!); max[i] = Math.max(max[i]!, p[i]! + 1); }
  }
  return min && max ? { min: min as unknown as Vec3, maxExclusive: max as unknown as Vec3 } : null;
}
