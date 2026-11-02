import type { BlockState, Vec3 } from '../../../voxel/src/types.js';
import { DomainError } from '../types.js';
import { cellAt, posKey, sameSlot } from './draft.js';
import type { CellChange, CellSlot, CellValue, Draft, Edit } from './draft.js';
import { boxBounds, carryProperties, boxVolume } from './tools.js';
import type { Box, SchemaLookup } from './tools.js';
import { editExtent, patternAt, validatePattern } from './patterns.js';
import type { Pattern } from './patterns.js';
import { MAX_EDIT_CELLS } from './draft.js';

/**
 * Natur- und Formwerkzeuge (EDIT-04, Ideen aus Pinseln wie smooth/erode/
 * overlay/naturalize und Bildhauer-Werkzeugen). All tools work inside a box
 * (the selection), read the draft once and return one edit; they never look
 * outside the box except for the neighbours of its border cells.
 *
 * "Solid" means a block cell. Explicit air, erase cells and empty positions
 * count as open. Removed cells become `null` (not part of the model), like
 * the "Abbauen" tool.
 */
const NB6: readonly Vec3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const add = (p: Vec3, d: Vec3): Vec3 => [p[0] + d[0], p[1] + d[1], p[2] + d[2]];
const solid = (v: CellSlot | undefined): v is Extract<CellValue, { kind: 'block' }> => !!v && v.kind === 'block';

function guardBox(box: Box): void {
  if (boxVolume(box) > MAX_EDIT_CELLS) throw new DomainError('LIMIT', `Die Auswahl umfasst ${boxVolume(box).toLocaleString('de-DE')} Zellen; höchstens ${MAX_EDIT_CELLS.toLocaleString('de-DE')} für Naturwerkzeuge.`);
}
function int(name: string, v: number, min: number, max: number): void {
  if (!Number.isInteger(v) || v < min || v > max) throw new DomainError('INVALID', `${name} ${min}–${max} erwartet`);
}

/** Working copy of the box (plus one cell border) that tools can update between iterations. */
class Grid {
  readonly min: Vec3; readonly max: Vec3; // inclusive box
  private readonly cells = new Map<string, CellSlot>();
  constructor(private readonly draft: Draft, box: Box) {
    const b = boxBounds(box);
    this.min = b.min; this.max = [b.maxExclusive[0] - 1, b.maxExclusive[1] - 1, b.maxExclusive[2] - 1];
  }
  inside(p: Vec3): boolean { return p.every((n, i) => n >= this.min[i]! && n <= this.max[i]!); }
  get(p: Vec3): CellSlot { const k = posKey(p); return this.cells.has(k) ? this.cells.get(k)! : cellAt(this.draft, p); }
  set(p: Vec3, v: CellSlot): void { this.cells.set(posKey(p), v); }
  *positions(): Generator<Vec3> {
    for (let y = this.min[1]; y <= this.max[1]; y++) for (let z = this.min[2]; z <= this.max[2]; z++) for (let x = this.min[0]; x <= this.max[0]; x++) yield [x, y, z];
  }
  /** Changes against the draft, in y/z/x order. */
  edit(label: string): Edit {
    const changes: CellChange[] = [];
    for (const p of this.positions()) {
      const k = posKey(p);
      if (this.cells.has(k) && !sameSlot(this.cells.get(k)!, cellAt(this.draft, p))) changes.push({ position: p, value: this.cells.get(k)! });
    }
    return { label, changes };
  }
}

/** Most common block among the given values (ties: first seen); undefined without blocks. */
function majority(values: readonly CellSlot[]): Extract<CellValue, { kind: 'block' }> | undefined {
  const counts = new Map<string, { v: Extract<CellValue, { kind: 'block' }>; n: number }>();
  for (const v of values) if (solid(v)) {
    const k = `${v.state.id}${JSON.stringify(v.state.properties)}`, c = counts.get(k);
    if (c) c.n++; else counts.set(k, { v, n: 1 });
  }
  let best: { v: Extract<CellValue, { kind: 'block' }>; n: number } | undefined;
  for (const c of counts.values()) if (!best || c.n > best.n) best = c;
  return best && { kind: 'block', state: best.v.state };
}

export interface ErodeOptions {
  /** A block with at least this many open faces is removed (1–6, default 3). */
  readonly faces?: number;
  /** Repetitions (1–8, default 1). */
  readonly iterations?: number;
}
/** Abtragen: removes exposed blocks (edges, corners, thin spikes) – ruins, weathered rock. */
export function erodeEdit(draft: Draft, box: Box, o: ErodeOptions = {}): Edit {
  const faces = o.faces ?? 3, it = o.iterations ?? 1;
  int('Offene Seiten', faces, 1, 6); int('Durchgänge', it, 1, 8); guardBox(box);
  const g = new Grid(draft, box);
  for (let i = 0; i < it; i++) {
    const remove: Vec3[] = [];
    for (const p of g.positions()) if (solid(g.get(p)) && NB6.filter(d => !solid(g.get(add(p, d)))).length >= faces) remove.push(p);
    if (!remove.length) break;
    for (const p of remove) g.set(p, null);
  }
  return g.edit('Abtragen');
}

export interface DilateOptions {
  /** An open cell with at least this many block neighbours is filled (1–6, default 4). */
  readonly neighbours?: number;
  readonly iterations?: number;
  /** Fill value; default the most common neighbouring block. */
  readonly value?: CellSlot;
}
/** Aufbauen: fills hollows and notches with the surrounding material – closes rock, rounds hills. */
export function dilateEdit(draft: Draft, box: Box, o: DilateOptions = {}): Edit {
  const need = o.neighbours ?? 4, it = o.iterations ?? 1;
  int('Nachbarn', need, 1, 6); int('Durchgänge', it, 1, 8); guardBox(box);
  const g = new Grid(draft, box);
  for (let i = 0; i < it; i++) {
    const fill: [Vec3, CellSlot][] = [];
    for (const p of g.positions()) {
      if (solid(g.get(p))) continue;
      const around = NB6.map(d => g.get(add(p, d)));
      if (around.filter(solid).length < need) continue;
      const v = o.value !== undefined ? o.value : majority(around);
      if (v) fill.push([p, v]);
    }
    if (!fill.length) break;
    for (const [p, v] of fill) g.set(p, v);
  }
  return g.edit('Aufbauen');
}

/** Height of the top block in a column inside the box, or min − 1 when the column is empty. */
function columnTop(g: Grid, x: number, z: number): number {
  for (let y = g.max[1]; y >= g.min[1]; y--) if (solid(g.get([x, y, z]))) return y;
  return g.min[1] - 1;
}

export interface SmoothOptions { readonly iterations?: number; /** Neighbourhood radius 1–3 (default 1 = 3×3). */ readonly radius?: number }
/**
 * Glätten as a height field: every column's top moves towards the mean of its
 * neighbourhood. Raised columns grow with the column's own top block (or the
 * most common neighbouring top), lowered columns lose their top blocks. Good
 * for hills, embankments and rough terrain under buildings.
 */
export function smoothEdit(draft: Draft, box: Box, o: SmoothOptions = {}): Edit {
  const it = o.iterations ?? 2, r = o.radius ?? 1;
  int('Durchgänge', it, 1, 8); int('Radius', r, 1, 3); guardBox(box);
  const g = new Grid(draft, box);
  const W = g.max[0] - g.min[0] + 1, D = g.max[2] - g.min[2] + 1;
  const idx = (x: number, z: number) => (z - g.min[2]) * W + (x - g.min[0]);
  let h = new Float64Array(W * D);
  const tops: (Extract<CellValue, { kind: 'block' }> | undefined)[] = [];
  for (let z = g.min[2]; z <= g.max[2]; z++) for (let x = g.min[0]; x <= g.max[0]; x++) {
    const t = columnTop(g, x, z); h[idx(x, z)] = t;
    const v = g.get([x, t, z]); tops[idx(x, z)] = solid(v) ? v : undefined;
  }
  const start = Float64Array.from(h);
  for (let i = 0; i < it; i++) {
    const next = new Float64Array(W * D);
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      let s = 0, n = 0;
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        const xx = x + dx, zz = z + dz;
        if (xx < 0 || zz < 0 || xx >= W || zz >= D) continue;
        s += h[zz * W + xx]!; n++;
      }
      next[z * W + x] = s / n;
    }
    h = next;
  }
  for (let z = g.min[2]; z <= g.max[2]; z++) for (let x = g.min[0]; x <= g.max[0]; x++) {
    const i = idx(x, z), from = start[i]!, to = Math.max(g.min[1] - 1, Math.min(g.max[1], Math.round(h[i]!)));
    if (to > from) {
      // A raised column grows towards its neighbours: its new top is the most common top block around it
      // (grass next to grass), the cells below get the column's own top block (dirt in a pit).
      const near: CellSlot[] = [];
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const xx = x + dx, zz = z + dz;
        if (xx < g.min[0] || xx > g.max[0] || zz < g.min[2] || zz > g.max[2]) continue;
        const t = tops[idx(xx, zz)]; if (t) near.push(t);
      }
      const topValue = majority(near) ?? tops[i];
      if (!topValue) continue;
      const below = tops[i] ? g.get([x, from - 1, z]) : null;
      const own: CellSlot = solid(below) ? { kind: 'block', state: below.state } : tops[i] ?? topValue;
      for (let y = from + (tops[i] ? 0 : 1); y < to; y++) g.set([x, y, z], own);
      g.set([x, to, z], topValue);
    } else if (to < from) {
      const top = g.get([x, from, z]);
      for (let y = to + 1; y <= from; y++) g.set([x, y, z], null);
      // The new top cell takes the old top block (grass stays on top).
      if (to >= g.min[1] && solid(top) && solid(g.get([x, to, z]))) g.set([x, to, z], top);
    }
  }
  return g.edit('Glätten');
}

export interface OverlayOptions {
  /** 'replace' paints the top `depth` blocks of each column, 'above' lays `depth` new layers on top. */
  readonly mode: 'replace' | 'above';
  readonly depth?: number;
  /** Only columns whose top block has one of these ids (e.g. only grass, not the roof). */
  readonly onlyOn?: readonly string[];
}
/** Überziehen: a surface layer from a pattern – snow, moss, gravel paths, flowers on grass. */
export function overlayEdit(draft: Draft, box: Box, pattern: Pattern, o: OverlayOptions, schemaOf?: SchemaLookup): Edit {
  const depth = o.depth ?? 1; int('Tiefe', depth, 1, 16); guardBox(box); validatePattern(pattern);
  const g = new Grid(draft, box), targets: Vec3[] = [];
  for (let z = g.min[2]; z <= g.max[2]; z++) for (let x = g.min[0]; x <= g.max[0]; x++) {
    const t = columnTop(g, x, z);
    if (t < g.min[1]) continue;
    const top = g.get([x, t, z]);
    if (o.onlyOn?.length && !(solid(top) && o.onlyOn.includes(top.state.id))) continue;
    for (let d = 0; d < depth; d++) {
      const y = o.mode === 'above' ? t + 1 + d : t - d;
      if (y < g.min[1]) break;
      if (o.mode === 'replace' && !solid(g.get([x, y, z]))) break;
      targets.push([x, y, z]);
    }
  }
  const extent = pattern.kind === 'gradient' ? editExtent(targets) : null;
  const changes: CellChange[] = [];
  for (const p of targets) {
    let v = patternAt(pattern, p, extent);
    if (v === 'keep') continue;
    const before = g.get(p);
    if (o.mode === 'replace' && v?.kind === 'block' && solid(before)) v = { kind: 'block', state: carryProperties(before.state, v.state, schemaOf) };
    if (!sameSlot(before, v)) changes.push({ position: p, value: v });
  }
  return { label: o.mode === 'above' ? 'Überziehen (darauf)' : 'Überziehen (Oberfläche)', changes };
}

/** Ids that Naturalisieren treats as natural ground (everything else, e.g. a wall, stays). */
export const NATURAL_GROUND: ReadonlySet<string> = new Set(['stone', 'dirt', 'grass_block', 'coarse_dirt', 'podzol', 'rooted_dirt', 'mycelium', 'granite', 'diorite', 'andesite', 'tuff', 'deepslate', 'gravel', 'dirt_path', 'moss_block'].map(id => `minecraft:${id}`));

export interface NaturalizeOptions { /** Dirt layers below the top (default 3). */ readonly dirt?: number; readonly top?: BlockState; readonly under?: BlockState; readonly deep?: BlockState }
/** Naturalisieren: natural ground in the box gets grass on top, then dirt, then stone – like a real hillside. */
export function naturalizeEdit(draft: Draft, box: Box, o: NaturalizeOptions = {}): Edit {
  const dirt = o.dirt ?? 3; int('Erdschichten', dirt, 0, 16); guardBox(box);
  const top: CellValue = { kind: 'block', state: o.top ?? { id: 'minecraft:grass_block', properties: { snowy: 'false' } } };
  const under: CellValue = { kind: 'block', state: o.under ?? { id: 'minecraft:dirt', properties: {} } };
  const deep: CellValue = { kind: 'block', state: o.deep ?? { id: 'minecraft:stone', properties: {} } };
  const g = new Grid(draft, box);
  for (let z = g.min[2]; z <= g.max[2]; z++) for (let x = g.min[0]; x <= g.max[0]; x++) {
    let depth = -1;
    // Depth counts natural cells from the open sky down; a non-natural block or a gap restarts the count.
    for (let y = g.max[1] + 1; y >= g.min[1]; y--) {
      const v = g.get([x, y, z]);
      if (!solid(v)) { depth = -1; continue; }
      if (!NATURAL_GROUND.has(v.state.id)) { depth = 99; continue; }
      depth = depth < 0 ? 0 : depth + 1;
      if (y > g.max[1]) continue;
      g.set([x, y, z], depth === 0 ? top : depth <= dirt ? under : deep);
    }
  }
  return g.edit('Naturalisieren');
}

export type SurfaceFaces = 'all' | 'top' | 'sides';
export const SURFACE_FACES_LABEL: Readonly<Record<SurfaceFaces, string>> = { all: 'alle sichtbaren Seiten', top: 'nur oben offen', sides: 'nur seitlich offen (Fassade)' };

/** Block cells in the box with at least one open face of the given kind (the visible skin). */
export function surfaceCells(draft: Draft, box: Box, faces: SurfaceFaces = 'all'): Vec3[] {
  guardBox(box);
  const g = new Grid(draft, box), dirs = faces === 'top' ? [NB6[2]!] : faces === 'sides' ? [NB6[0]!, NB6[1]!, NB6[4]!, NB6[5]!] : NB6;
  const out: Vec3[] = [];
  for (const p of g.positions()) if (solid(g.get(p)) && dirs.some(d => !solid(g.get(add(p, d))))) out.push(p);
  return out;
}

/**
 * Oberfläche bemalen: the pattern only touches the visible skin of the
 * selection (a mask like "only exposed blocks"). Properties carry over like
 * in replace, so stairs and slabs keep their shape where the target allows.
 */
export function paintSurfaceEdit(draft: Draft, box: Box, pattern: Pattern, faces: SurfaceFaces = 'all', schemaOf?: SchemaLookup): Edit {
  validatePattern(pattern);
  const cells = surfaceCells(draft, box, faces), extent = pattern.kind === 'gradient' ? editExtent(cells) : null;
  const changes: CellChange[] = [];
  for (const p of cells) {
    const before = cellAt(draft, p);
    let v = patternAt(pattern, p, extent);
    if (v === 'keep') continue;
    if (v?.kind === 'block' && solid(before)) {
      const state = carryProperties(before.state, v.state, schemaOf);
      v = before.entity && state.id === before.state.id ? { kind: 'block', state, entity: before.entity } : { kind: 'block', state };
    }
    if (!sameSlot(before, v)) changes.push({ position: p, value: v });
  }
  return { label: `Oberfläche bemalen (${SURFACE_FACES_LABEL[faces]})`, changes };
}
