import type { BlockState, Vec3 } from '../../../voxel/src/types.js';
import { DomainError } from '../types.js';
import { cellAt, draftEntries, keyPos, sameSlot } from './draft.js';
import type { CellChange, CellSlot, CellValue, Draft, Edit } from './draft.js';
import { carryProperties, inBox } from './tools.js';
import type { ReplaceQuery, SchemaLookup } from './tools.js';

/**
 * Muster-Pinsel (EDIT-03). A pattern decides per cell which value a shape,
 * fill or replace writes. It is a pure, deterministic function of the cell
 * position, the pattern (including its seed) and the extent of the edit, so
 * the same inputs always give the same version.
 *
 * An entry value can be a cell value, `null` (remove the cell) or `'keep'`
 * (leave the cell as it is; e.g. only every third stone brick becomes mossy).
 */
export type PatternValue = CellSlot | 'keep';
export interface PatternEntry { readonly value: PatternValue; readonly weight: number }
export type PatternAxis = 'x' | 'y' | 'z';
export type GradientAxis = PatternAxis | 'radial';

export type Pattern =
  | { readonly kind: 'single'; readonly value: PatternValue }
  /** Weighted random mix (deterministic hash of position and seed). */
  | { readonly kind: 'mix'; readonly entries: readonly PatternEntry[]; readonly seed: number }
  /** Ordered stops along an axis over the extent of the edit; `blend` 0–1 dithers the borders. */
  | { readonly kind: 'gradient'; readonly stops: readonly PatternValue[]; readonly axis: GradientAxis; readonly blend: number; readonly seed: number; readonly reverse?: boolean }
  /** 3D checkerboard over the entries with cubes of `size` cells. */
  | { readonly kind: 'checker'; readonly entries: readonly PatternValue[]; readonly size: number }
  /** Stripes across an axis, each `width` cells wide. */
  | { readonly kind: 'stripes'; readonly entries: readonly PatternValue[]; readonly axis: PatternAxis; readonly width: number };

export type PatternKind = Pattern['kind'];
export const PATTERN_KIND_LABEL: Readonly<Record<PatternKind, string>> = {
  single: 'Einzelblock', mix: 'Mischung', gradient: 'Verlauf', checker: 'Schachbrett', stripes: 'Streifen',
};
export const GRADIENT_AXIS_LABEL: Readonly<Record<GradientAxis, string>> = {
  y: 'von unten nach oben', x: 'von West nach Ost', z: 'von Nord nach Süd', radial: 'von der Mitte nach außen',
};

/** Integer hash of a cell and a seed → [0, 1). Stable across browsers (32-bit integer arithmetic only). */
export function cellNoise(p: Vec3, seed: number): number {
  let h = (seed | 0) ^ 0x9e3779b9;
  for (const n of p) {
    h = Math.imul(h ^ (n | 0), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return (h >>> 0) / 4294967296;
}

export interface PatternExtent { readonly min: Vec3; readonly max: Vec3 }

/** Extent (inclusive) of the positions an edit touches; the reference frame of gradients. */
export function editExtent(positions: Iterable<Vec3>): PatternExtent | null {
  let min: number[] | null = null, max: number[] | null = null;
  for (const p of positions) {
    if (!min || !max) { min = [...p]; max = [...p]; continue; }
    for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i]!, p[i]!); max[i] = Math.max(max[i]!, p[i]!); }
  }
  return min && max ? { min: min as unknown as Vec3, max: max as unknown as Vec3 } : null;
}

const AXIS = { x: 0, y: 1, z: 2 } as const;
const mod = (n: number, m: number) => ((n % m) + m) % m;

export function validatePattern(p: Pattern): void {
  const list = p.kind === 'single' ? [p.value] : p.kind === 'mix' ? p.entries.map(e => e.value) : p.kind === 'gradient' ? p.stops : p.entries;
  if (!list.length) throw new DomainError('INVALID', 'Das Muster braucht mindestens einen Block');
  if (list.length > 32) throw new DomainError('INVALID', 'Höchstens 32 Einträge je Muster');
  if (p.kind === 'mix') {
    if (p.entries.some(e => !Number.isFinite(e.weight) || e.weight < 0)) throw new DomainError('INVALID', 'Gewichte müssen ≥ 0 sein');
    if (!p.entries.some(e => e.weight > 0)) throw new DomainError('INVALID', 'Mindestens ein Gewicht muss größer als 0 sein');
  }
  if (p.kind === 'gradient' && !(p.blend >= 0 && p.blend <= 1)) throw new DomainError('INVALID', 'Übergang 0–1 erwartet');
  if (p.kind === 'checker' && !(Number.isInteger(p.size) && p.size >= 1 && p.size <= 64)) throw new DomainError('INVALID', 'Feldgröße 1–64 erwartet');
  if (p.kind === 'stripes' && !(Number.isInteger(p.width) && p.width >= 1 && p.width <= 64)) throw new DomainError('INVALID', 'Streifenbreite 1–64 erwartet');
}

/** Value of the pattern at `p`. `extent` is required for gradients (the extent of the whole edit). */
export function patternAt(pattern: Pattern, p: Vec3, extent: PatternExtent | null): PatternValue {
  switch (pattern.kind) {
    case 'single': return pattern.value;
    case 'mix': {
      const total = pattern.entries.reduce((s, e) => s + Math.max(0, e.weight), 0);
      let r = cellNoise(p, pattern.seed) * total;
      for (const e of pattern.entries) { if (e.weight <= 0) continue; if (r < e.weight) return e.value; r -= e.weight; }
      return pattern.entries.filter(e => e.weight > 0).at(-1)!.value;
    }
    case 'checker': {
      const s = pattern.size, n = pattern.entries.length;
      return pattern.entries[mod(Math.floor(p[0] / s) + Math.floor(p[1] / s) + Math.floor(p[2] / s), n)]!;
    }
    case 'stripes': return pattern.entries[mod(Math.floor(p[AXIS[pattern.axis]] / pattern.width), pattern.entries.length)]!;
    case 'gradient': {
      const n = pattern.stops.length;
      if (n === 1 || !extent) return pattern.stops[0]!;
      let t: number;
      if (pattern.axis === 'radial') {
        // Horizontal distance from the centre column, 1 at the farthest corner of the extent.
        const cx = (extent.min[0] + extent.max[0]) / 2, cz = (extent.min[2] + extent.max[2]) / 2;
        const far = Math.hypot((extent.max[0] - extent.min[0]) / 2, (extent.max[2] - extent.min[2]) / 2);
        t = far ? Math.min(1, Math.hypot(p[0] - cx, p[2] - cz) / far) : 0;
      } else {
        const i = AXIS[pattern.axis], span = extent.max[i]! - extent.min[i]!;
        t = span ? (p[i]! - extent.min[i]!) / span : 0;
      }
      if (pattern.reverse) t = 1 - t;
      // Position on the stop scale (0 … n), shifted by up to ±blend/2 stop widths of noise at the borders.
      const s = t * n + (cellNoise(p, pattern.seed) - 0.5) * pattern.blend;
      return pattern.stops[Math.max(0, Math.min(n - 1, Math.floor(s >= n ? n - 1 : s)))]!;
    }
  }
}

/**
 * Applies a pattern to an edit: every change that writes a value (not a
 * removal) gets the pattern value at its position instead. `'keep'` drops
 * the change. The edit label gets the pattern name.
 */
export function paintEdit(edit: Edit, pattern: Pattern): Edit {
  if (pattern.kind === 'single' && pattern.value !== 'keep') {
    const v = pattern.value;
    return { label: edit.label, changes: edit.changes.map(c => c.value === null ? c : { position: c.position, value: v }) };
  }
  validatePattern(pattern);
  const painted = edit.changes.filter(c => c.value !== null);
  const extent = pattern.kind === 'gradient' ? editExtent(painted.map(c => c.position)) : null;
  const changes: CellChange[] = [];
  for (const c of edit.changes) {
    if (c.value === null) { changes.push(c); continue; }
    const v = patternAt(pattern, c.position, extent);
    if (v !== 'keep') changes.push({ position: c.position, value: v });
  }
  return { label: pattern.kind === 'single' ? edit.label : `${edit.label} · ${PATTERN_KIND_LABEL[pattern.kind]}`, changes };
}

function matchesFrom(v: CellValue, from: ReplaceQuery['from']): boolean {
  if (from === 'air' || from === 'erase') return v.kind === from;
  if (v.kind !== 'block' || v.state.id !== from.id) return false;
  if (!from.properties) return true;
  const a = v.state.properties, b = from.properties, ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every(k => a[k] === b[k]);
}

/**
 * Replace with a pattern (e.g. 30 % of the stone bricks become mossy or
 * cracked). Same rules as `replaceEdit`: properties carry over where the
 * target allows them, a block entity stays only when the id stays.
 */
export function replacePatternEdit(draft: Draft, q: Omit<ReplaceQuery, 'to'>, pattern: Pattern, schemaOf?: SchemaLookup): Edit {
  validatePattern(pattern);
  const hits: { p: Vec3; v: CellValue }[] = [];
  for (const [k, v] of draftEntries(draft)) {
    const p = keyPos(k);
    if (q.box && !inBox(q.box, p)) continue;
    if (matchesFrom(v, q.from)) hits.push({ p, v });
  }
  const extent = pattern.kind === 'gradient' ? editExtent(hits.map(h => h.p)) : null;
  const changes: CellChange[] = [];
  for (const { p, v } of hits) {
    let next = patternAt(pattern, p, extent);
    if (next === 'keep') continue;
    if (next?.kind === 'block' && v.kind === 'block') {
      const state = q.keepProperties === false ? next.state : carryProperties(v.state, next.state, schemaOf);
      next = v.entity && state.id === v.state.id ? { kind: 'block', state, entity: v.entity } : { kind: 'block', state };
    }
    if (!sameSlot(cellAt(draft, p), next)) changes.push({ position: p, value: next });
  }
  return { label: pattern.kind === 'single' ? 'Ersetzen' : `Ersetzen · ${PATTERN_KIND_LABEL[pattern.kind]}`, changes };
}

/** Counts how often each value occurs in an edit (for the preview "60 % Steinziegel …"). */
export function patternShares(edit: Edit): { value: CellSlot; count: number }[] {
  const out: { value: CellSlot; count: number }[] = [];
  for (const c of edit.changes) {
    const hit = out.find(o => sameSlot(o.value, c.value));
    if (hit) hit.count++; else out.push({ value: c.value, count: 1 });
  }
  return out.sort((a, b) => b.count - a.count);
}

// ------------------------------------------------------------------ presets

export interface PatternPreset { readonly id: string; readonly label: string; readonly hint: string; readonly pattern: Pattern }
const b = (id: string, properties: Record<string, string> = {}): CellValue => ({ kind: 'block', state: { id: `minecraft:${id}`, properties } as BlockState });
const mix = (seed: number, ...entries: [CellValue | 'keep', number][]): Pattern => ({ kind: 'mix', seed, entries: entries.map(([value, weight]) => ({ value, weight })) });

/** Ready-made patterns for typical building materials (all blocks of the 26.3 register). */
export const PATTERN_PRESETS: readonly PatternPreset[] = [
  { id: 'steinmauer-alt', label: 'Alte Steinmauer', hint: 'Steinziegel mit bemoosten und rissigen Ziegeln', pattern: mix(1, [b('stone_bricks'), 6], [b('mossy_stone_bricks'), 2], [b('cracked_stone_bricks'), 2]) },
  { id: 'bruchstein', label: 'Bruchsteinmauer', hint: 'Bruchstein, Stein, Andesit und bemooster Bruchstein', pattern: mix(2, [b('cobblestone'), 5], [b('stone'), 2], [b('andesite'), 2], [b('mossy_cobblestone'), 1]) },
  { id: 'verwittern', label: 'Verwittern (30 %)', hint: 'Zum Ersetzen: 30 % der Treffer werden bemooste Steinziegel, der Rest bleibt', pattern: mix(3, [b('mossy_stone_bricks'), 3], ['keep', 7]) },
  { id: 'pflaster', label: 'Wegpflaster', hint: 'Erdpfad, Grobe Erde, Kies und Bruchstein', pattern: mix(4, [b('dirt_path'), 5], [b('coarse_dirt'), 2], [b('gravel'), 2], [b('cobblestone'), 1]) },
  { id: 'tiefenschiefer', label: 'Tiefenschiefer-Mauer', hint: 'Tiefenschieferziegel mit rissigen Ziegeln und Fliesen', pattern: mix(5, [b('deepslate_bricks'), 6], [b('cracked_deepslate_bricks'), 2], [b('deepslate_tiles'), 2]) },
  { id: 'sockel-verlauf', label: 'Sockel nach oben heller', hint: 'Verlauf: Bruchstein → Steinziegel → Stein → Glatter Stein', pattern: { kind: 'gradient', axis: 'y', blend: 0.6, seed: 6, stops: [b('cobblestone'), b('stone_bricks'), b('stone'), b('smooth_stone')] } },
  { id: 'holz-verlauf', label: 'Holz dunkel → hell', hint: 'Verlauf: Schwarzeichen-, Fichten-, Eichen-, Birkenbretter', pattern: { kind: 'gradient', axis: 'y', blend: 0.5, seed: 7, stops: [b('dark_oak_planks'), b('spruce_planks'), b('oak_planks'), b('birch_planks')] } },
  { id: 'sand-verlauf', label: 'Sandstein-Verlauf', hint: 'Verlauf: Sand → Sandstein → Geschliffener Sandstein', pattern: { kind: 'gradient', axis: 'y', blend: 0.5, seed: 8, stops: [b('sand'), b('sandstone'), b('cut_sandstone'), b('smooth_sandstone')] } },
  { id: 'schachbrett', label: 'Schachbrettboden', hint: 'Weißer und schwarzer Beton im Wechsel', pattern: { kind: 'checker', size: 1, entries: [b('white_concrete'), b('black_concrete')] } },
  { id: 'fachwerk-streifen', label: 'Streifen Holz/Putz', hint: 'Streifen Eichenstamm (aufrecht) und weiße Terrakotta, je 1 breit', pattern: { kind: 'stripes', axis: 'x', width: 1, entries: [b('oak_log', { axis: 'y' }), b('white_terracotta'), b('white_terracotta')] } },
];
