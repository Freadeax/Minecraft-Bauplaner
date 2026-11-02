import { entityAnchor } from '../../../voxel/src/entities.js';
import type { Bounds, FreeEntity, Transform, Vec3 } from '../../../voxel/src/types.js';
import { DomainError } from '../types.js';
import { AIR_VALUE, MAX_EDIT_CELLS, cellAt, draftEntries, keyPos, posKey } from './draft.js';
import type { CellChange, CellSlot, CellValue, Draft, Edit } from './draft.js';
import { boxBounds, entitiesRelative, inBox, pasteEdit, transformClipboard } from './tools.js';
import type { Box, ClipCell, Clipboard } from './tools.js';

/**
 * Zellauswahl und Auswahlwerkzeuge (EDIT-05). Ideas from editor mods
 * (magic select, grow/shrink, stack, extrude), built on the editor's own
 * rules: a region is a set of cell keys in payload coordinates; every tool
 * returns an `Edit` (one undo step); rotation and mirroring go through
 * `transformClipboard` (transformBlockState / transformEntity), so there is
 * no second coordinate or rotation rule.
 */
export type Region = ReadonlySet<string>;

const N6: readonly Vec3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const N4: readonly Vec3[] = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, n: number): Vec3 => [a[0] * n, a[1] * n, a[2] * n];
function guard(count: number, what = 'Die Auswahl'): void {
  if (count > MAX_EDIT_CELLS) throw new DomainError('LIMIT', `${what} umfasst ${count.toLocaleString('de-DE')} Zellen; höchstens ${MAX_EDIT_CELLS.toLocaleString('de-DE')} je Schritt.`);
}
function int(name: string, v: number, min: number, max: number): void {
  if (!Number.isInteger(v) || v < min || v > max) throw new DomainError('INVALID', `${name} ${min}–${max} erwartet`);
}
/** Sorted like the build guide (y, z, x), so every result is deterministic. */
export function sortKeys(keys: Iterable<string>): string[] {
  return [...keys].map(k => ({ k, p: keyPos(k) })).sort((a, b) => a.p[1] - b.p[1] || a.p[2] - b.p[2] || a.p[0] - b.p[0]).map(x => x.k);
}

// ------------------------------------------------------------------ magic select

export type MagicMode = 'state' | 'block' | 'family' | 'solid';
export const MAGIC_MODE_LABEL: Readonly<Record<MagicMode, string>> = {
  state: 'Gleicher Zustand', block: 'Gleicher Block', family: 'Gleiches Material (Treppen, Stufen, Mauern …)', solid: 'Alle Blöcke (ganzes Bauteil)',
};

const SUFFIXES = ['_hanging_sign', '_wall_hanging_sign', '_wall_sign', '_sign', '_fence_gate', '_pressure_plate', '_button', '_stairs', '_slab', '_wall', '_fence', '_trapdoor', '_door',
  '_planks', '_log', '_wood', '_hyphae', '_stem', '_leaves', '_pane', '_carpet'];
/**
 * Material family of a block id: `oak_planks`, `oak_stairs`, `stripped_oak_log` → `oak`;
 * `stone_bricks`, `stone_brick_wall` → `stone_brick`; `white_stained_glass_pane` → `white_stained_glass`.
 */
export function blockFamily(id: string): string {
  let n = id.includes(':') ? id.slice(id.indexOf(':') + 1) : id;
  if (n.startsWith('stripped_')) n = n.slice(9);
  for (const s of SUFFIXES) if (n.endsWith(s) && n.length > s.length) { n = n.slice(0, -s.length); break; }
  if (/(brick|tile)s$/.test(n)) n = n.slice(0, -1);
  if (n === 'bamboo_mosaic' || n === 'bamboo_block') n = 'bamboo';
  return `${id.includes(':') ? id.slice(0, id.indexOf(':')) : 'minecraft'}:${n}`;
}

export interface MagicOptions {
  readonly mode: MagicMode;
  /** Stay in the layer of the start cell. */
  readonly plane?: boolean;
  /** Also step to the 12 edge neighbours (diagonal steps, e.g. roofs and stair runs). */
  readonly diagonal?: boolean;
  /** Bound of the search; defaults to the model bounds. */
  readonly limitBox?: Box;
}
const N18: readonly Vec3[] = (() => {
  const out: Vec3[] = [];
  for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) for (let x = -1; x <= 1; x++) if (Math.abs(x) + Math.abs(y) + Math.abs(z) && Math.abs(x) + Math.abs(y) + Math.abs(z) <= 2) out.push([x, y, z]);
  return out;
})();

/**
 * Connected block cells from `start` that match the start block in the chosen
 * mode. Air, erase and empty cells never belong to a magic selection.
 */
export function magicSelect(draft: Draft, start: Vec3, o: MagicOptions): Set<string> {
  const first = cellAt(draft, start);
  if (first?.kind !== 'block') throw new DomainError('INVALID', 'Die Zauberauswahl beginnt auf einem Block.');
  const family = blockFamily(first.state.id), stateKey = JSON.stringify([first.state.id, Object.entries(first.state.properties).sort()]);
  const match = (v: CellSlot): boolean => {
    if (v?.kind !== 'block') return false;
    switch (o.mode) {
      case 'solid': return true;
      case 'block': return v.state.id === first.state.id;
      case 'family': return blockFamily(v.state.id) === family;
      case 'state': return JSON.stringify([v.state.id, Object.entries(v.state.properties).sort()]) === stateKey;
    }
  };
  const bound = o.limitBox ? boxBounds(o.limitBox) : null;
  const within = (p: Vec3) => !bound || p.every((n, i) => n >= bound.min[i]! && n < bound.maxExclusive[i]!);
  const dirs = (o.diagonal ? N18 : N6).filter(d => !o.plane || d[1] === 0);
  const seen = new Set([posKey(start)]), out = new Set<string>(), queue: Vec3[] = [start];
  while (queue.length) {
    const p = queue.pop()!;
    out.add(posKey(p));
    guard(out.size, 'Die Zauberauswahl');
    for (const d of dirs) {
      const n = add(p, d), k = posKey(n);
      if (seen.has(k)) continue;
      seen.add(k);
      if (within(n) && match(cellAt(draft, n))) queue.push(n);
    }
  }
  return out;
}

// ------------------------------------------------------------------ region geometry

export function regionBounds(region: Iterable<string>): Bounds | null {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  let any = false;
  for (const k of region) { any = true; const p = keyPos(k); for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i]!, p[i]!); max[i] = Math.max(max[i]!, p[i]! + 1); } }
  return any ? { min: min as unknown as Vec3, maxExclusive: max as unknown as Vec3 } : null;
}
/** Cells of the model inside the box (blocks, explicit air and erase); empty cells are not part of it. */
export function boxRegion(draft: Draft, box: Box): Set<string> {
  const out = new Set<string>();
  for (const k of draftEntries(draft).keys()) if (inBox(box, keyPos(k))) out.add(k);
  guard(out.size);
  return out;
}
/** Adds every face neighbour (`plane`: only in the same layer) `times` times. */
export function growRegion(region: Region, o: { plane?: boolean; times?: number } = {}): Set<string> {
  const times = o.times ?? 1; int('Schritte', times, 1, 16);
  let cur = new Set(region);
  for (let i = 0; i < times; i++) {
    const next = new Set(cur);
    for (const k of cur) for (const d of o.plane ? N4 : N6) next.add(posKey(add(keyPos(k), d)));
    guard(next.size);
    cur = next;
  }
  return cur;
}
/** Keeps only cells whose face neighbours (`plane`: in the layer) all belong to the region. */
export function shrinkRegion(region: Region, o: { plane?: boolean; times?: number } = {}): Set<string> {
  const times = o.times ?? 1; int('Schritte', times, 1, 16);
  let cur = new Set(region);
  for (let i = 0; i < times; i++) {
    const next = new Set<string>();
    for (const k of cur) if ((o.plane ? N4 : N6).every(d => cur.has(posKey(add(keyPos(k), d))))) next.add(k);
    cur = next;
  }
  return cur;
}
/** Smallest box around the model cells inside `box`, or null when it holds none ("an Inhalt anpassen"). */
export function fitBox(draft: Draft, box: Box): Box | null {
  const b = regionBounds(boxRegion(draft, box));
  return b ? { a: b.min, b: [b.maxExclusive[0] - 1, b.maxExclusive[1] - 1, b.maxExclusive[2] - 1] } : null;
}
/** Grows (n > 0) or shrinks (n < 0) a box on all six sides; null when it would vanish. */
export function resizeBox(box: Box, n: number): Box | null {
  const { min, maxExclusive } = boxBounds(box);
  const a: Vec3 = [min[0] - n, min[1] - n, min[2] - n], b: Vec3 = [maxExclusive[0] - 1 + n, maxExclusive[1] - 1 + n, maxExclusive[2] - 1 + n];
  return a.every((v, i) => v <= b[i]!) ? { a, b } : null;
}
/** Keeps only the changes inside the region (box tools, patterns and nature tools on a cell selection). */
export function clipEdit(edit: Edit, region: Region): Edit {
  return { ...edit, changes: edit.changes.filter(c => region.has(posKey(c.position))) };
}

// ------------------------------------------------------------------ copy, clear, move

/** Region content as a clipboard (relative to the region's minimum corner), entities anchored in it included. */
export function copyRegion(draft: Draft, region: Region): Clipboard {
  const b = regionBounds(region);
  if (!b) return { size: [0, 0, 0], cells: [] };
  const cells: ClipCell[] = [];
  for (const k of sortKeys(region)) {
    const v = cellAt(draft, keyPos(k));
    if (v) { const p = keyPos(k); cells.push({ offset: [p[0] - b.min[0], p[1] - b.min[1], p[2] - b.min[2]], value: v }); }
  }
  guard(cells.length);
  const entities = entitiesRelative(draft.entities, p => region.has(posKey(p)), b.min);
  return { size: [b.maxExclusive[0] - b.min[0], b.maxExclusive[1] - b.min[1], b.maxExclusive[2] - b.min[2]], cells, ...(entities.length && { entities }) };
}

function entitiesOutside(draft: Draft, inside: (p: Vec3) => boolean): { rest: FreeEntity[]; removed: number } {
  const all = draft.entities ?? [], rest = all.filter(e => !inside(entityAnchor(e)));
  return { rest, removed: all.length - rest.length };
}
function clearEdit(draft: Draft, region: Region, inside: (p: Vec3) => boolean, o: { label?: string; entities?: boolean }): Edit {
  const changes: CellChange[] = [];
  for (const k of sortKeys(region)) if (cellAt(draft, keyPos(k))) changes.push({ position: keyPos(k), value: null });
  guard(changes.length);
  const e = o.entities === false ? { removed: 0, rest: [] } : entitiesOutside(draft, inside);
  return { label: o.label ?? 'Auswahl leeren', changes, ...(e.removed && { entities: e.rest }) };
}
/** Removes the region's cells (and, unless `entities` is false, the free entities anchored in it). */
export function clearRegionEdit(draft: Draft, region: Region, o: { label?: string; entities?: boolean } = {}): Edit {
  return clearEdit(draft, region, p => region.has(posKey(p)), o);
}
/** Clears the model cells of a box together with the entities anchored anywhere in it (Ausschneiden, Entf). */
export function clearBoxEdit(draft: Draft, box: Box, label = 'Auswahl leeren'): Edit {
  return clearEdit(draft, boxRegion(draft, box), p => inBox(box, p), { label });
}
/** Writes a value into every cell of the region. */
export function fillRegionEdit(region: Region, value: CellSlot, label = 'Auswahl füllen'): Edit {
  guard(region.size);
  return { label, changes: sortKeys(region).map(k => ({ position: keyPos(k), value })) };
}

/**
 * Moves (and optionally turns/mirrors) the region's content by `delta`, like
 * `moveBoxEdit` for a box: a turned region keeps its centre column. Returns the
 * moved region (also its empty cells), so the selection can follow.
 */
export function moveRegionEdit(draft: Draft, region: Region, delta: Vec3, t?: Pick<Transform, 'quarterTurns' | 'mirrorX'>): { edit: Edit; unresolved: readonly string[]; region: Set<string> } {
  const b = regionBounds(region);
  if (!b) return { edit: { label: 'Auswahl verschieben', changes: [] }, unresolved: [], region: new Set() };
  const clip0 = copyRegion(draft, region);
  // The cells of the region itself (empty ones too) follow the same rule as the content.
  const shape: Clipboard = { size: clip0.size, cells: [...region].map(k => { const p = keyPos(k); return { offset: [p[0] - b.min[0], p[1] - b.min[1], p[2] - b.min[2]] as Vec3, value: AIR_VALUE }; }) };
  const r = t ? transformClipboard(clip0, t) : { clip: clip0, unresolved: [] as string[] };
  const moved = t ? transformClipboard(shape, t).clip : shape;
  const centre = [0, 1, 2].map(i => Math.floor((clip0.size[i]! - r.clip.size[i]!) / 2));
  const at: Vec3 = [b.min[0] + delta[0] + centre[0]!, b.min[1] + delta[1], b.min[2] + delta[2] + centre[2]!];
  const clear: CellChange[] = clip0.cells.map(c => ({ position: add(b.min, c.offset), value: null }));
  const rest = clip0.entities?.length ? entitiesOutside(draft, p => region.has(posKey(p))).rest : undefined;
  const paste = pasteEdit(r.clip, at, rest ? { entities: rest } : {});
  const label = t ? (t.mirrorX ? 'Auswahl spiegeln' : 'Auswahl drehen') : 'Auswahl verschieben';
  return {
    edit: { label, changes: [...clear, ...paste.changes], ...(paste.entities && { entities: paste.entities }) },
    unresolved: r.unresolved,
    region: new Set(moved.cells.map(c => posKey(add(at, c.offset)))),
  };
}

// ------------------------------------------------------------------ stack and extrude

export interface StackOptions {
  /** Explicit air of the region is written too (clears what is in the way). Default true. */
  readonly withAir?: boolean;
  /** Copy the free entities anchored in the region. Default true. */
  readonly entities?: boolean;
}
/**
 * Repeats the region `count` times, each copy shifted by `step` from the
 * previous one (WorldEdit //stack, Axiom array): towers of floors, rows of
 * windows, arcades, diagonal stair runs. Copies keep block states and block
 * entities. Returns the bounds of all copies together with the original.
 */
export function stackEdit(draft: Draft, region: Region, step: Vec3, count: number, o: StackOptions = {}): { edit: Edit; bounds: Bounds | null } {
  int('Anzahl', count, 1, 64);
  if (!step.every(Number.isInteger) || step.every(n => n === 0)) throw new DomainError('INVALID', 'Der Versatz braucht mindestens eine Richtung.');
  const cells: [Vec3, CellValue][] = [];
  for (const k of sortKeys(region)) { const v = cellAt(draft, keyPos(k)); if (v && (o.withAir !== false || v.kind !== 'air')) cells.push([keyPos(k), v]); }
  guard(cells.length * count, 'Das Stapeln');
  const changes: CellChange[] = [];
  for (let i = 1; i <= count; i++) for (const [p, v] of cells) changes.push({ position: add(p, scale(step, i)), value: v });
  const own = o.entities === false ? [] : (draft.entities ?? []).filter(e => region.has(posKey(entityAnchor(e))));
  const copies: FreeEntity[] = [];
  for (let i = 1; i <= count; i++) for (const e of own) copies.push({ position: [e.position[0] + step[0] * i, e.position[1] + step[1] * i, e.position[2] + step[2] * i], data: e.data });
  const b = regionBounds(region);
  const bounds = b && {
    min: [0, 1, 2].map(i => Math.min(b.min[i]!, b.min[i]! + step[i]! * count)) as unknown as Vec3,
    maxExclusive: [0, 1, 2].map(i => Math.max(b.maxExclusive[i]!, b.maxExclusive[i]! + step[i]! * count)) as unknown as Vec3,
  };
  return { edit: { label: `Stapeln ×${count}`, changes, ...(copies.length && { entities: [...(draft.entities ?? []), ...copies] }) }, bounds };
}

export type FaceDirection = 'north' | 'south' | 'west' | 'east' | 'up' | 'down';
export const FACE_DIRECTION_VECTOR: Readonly<Record<FaceDirection, Vec3>> = {
  north: [0, 0, -1], south: [0, 0, 1], west: [-1, 0, 0], east: [1, 0, 0], up: [0, 1, 0], down: [0, -1, 0],
};
export const FACE_DIRECTION_LABEL: Readonly<Record<FaceDirection, string>> = {
  north: 'Norden', south: 'Süden', west: 'Westen', east: 'Osten', up: 'oben', down: 'unten',
};

/**
 * Extrudes the visible face of the region towards `dir` (Axiom extrude):
 * every block of the region whose neighbour in that direction is not a block
 * grows by `distance` cells of its own state (stopping at the first block in
 * the way); a negative distance pushes the face in, removing up to |distance|
 * blocks per column inside the region. Block entities are not duplicated.
 */
export function extrudeEdit(draft: Draft, region: Region, dir: FaceDirection, distance: number): Edit {
  if (!Number.isInteger(distance) || distance === 0 || Math.abs(distance) > 64) throw new DomainError('INVALID', 'Weite −64…−1 oder 1…64 erwartet');
  const d = FACE_DIRECTION_VECTOR[dir], solid = (v: CellSlot) => v?.kind === 'block';
  const changes: CellChange[] = [], seen = new Set<string>();
  for (const k of sortKeys(region)) {
    const p = keyPos(k), v = cellAt(draft, p);
    if (v?.kind !== 'block' || solid(cellAt(draft, add(p, d)))) continue;
    if (distance > 0) {
      const value: CellValue = { kind: 'block', state: v.state };
      for (let s = 1; s <= distance; s++) {
        const q = add(p, scale(d, s));
        if (solid(cellAt(draft, q))) break;
        const qk = posKey(q);
        if (!seen.has(qk)) { seen.add(qk); changes.push({ position: q, value }); }
      }
    } else {
      for (let s = 0; s < -distance; s++) {
        const q = add(p, scale(d, -s)), qk = posKey(q);
        if (!region.has(qk) || !solid(cellAt(draft, q))) break;
        if (!seen.has(qk)) { seen.add(qk); changes.push({ position: q, value: null }); }
      }
    }
    guard(changes.length, 'Das Extrudieren');
  }
  return { label: distance > 0 ? `Herausziehen nach ${FACE_DIRECTION_LABEL[dir]}` : `Einschieben von ${FACE_DIRECTION_LABEL[dir]}`, changes };
}
