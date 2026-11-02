import { transformBlockState, transformVector } from '../../../voxel/src/states.js';
import type { Transform, Vec3 } from '../../../voxel/src/types.js';
import { DomainError } from '../types.js';
import { MAX_EDIT_CELLS, posKey } from './draft.js';
import type { CellChange, CellSlot, Edit } from './draft.js';

/**
 * Symmetrie beim Bauen (EDIT-04, Idee aus Editor-Mods mit Symmetriepunkten).
 * A symmetry is a finite group of discrete transforms around a vertical axis
 * through `centre2 / 2` (doubled so the axis may lie on a cell centre or on a
 * cell border). Every change of an edit is copied to all images; block states
 * are turned with the single orientation rule of the voxel core
 * (`transformBlockState`), positions with `transformVector`. Nothing here
 * knows a second coordinate rule.
 */
export interface Symmetry {
  /** Mirror across the plane x = centre2[0] / 2 (east ↔ west). */
  readonly mirrorX: boolean;
  /** Mirror across the plane z = centre2[1] / 2 (north ↔ south). */
  readonly mirrorZ: boolean;
  /** Rotational symmetry around the vertical axis: 1 (none), 2 (half turn) or 4 (quarter turns). */
  readonly rotate: 1 | 2 | 4;
  /** Doubled axis position [2·x, 2·z]: even = through a cell centre, odd = on the border between two cells. */
  readonly centre2: readonly [number, number];
}
export const NO_SYMMETRY: Symmetry = Object.freeze({ mirrorX: false, mirrorZ: false, rotate: 1, centre2: Object.freeze([0, 0]) as readonly [number, number] });

type T = Pick<Transform, 'quarterTurns' | 'mirrorX'>;
const ID: T = { quarterTurns: 0, mirrorX: false };
const key = (t: T) => `${t.mirrorX ? 1 : 0}${t.quarterTurns}`;
/** a ∘ b (apply b first): R^qa M^ma R^qb M^mb = R^(qa ± qb) M^(ma xor mb), since M R = R⁻¹ M. */
function compose(a: T, b: T): T {
  const q = (a.quarterTurns + (a.mirrorX ? 4 - b.quarterTurns : b.quarterTurns)) % 4 as 0 | 1 | 2 | 3;
  return { quarterTurns: q, mirrorX: a.mirrorX !== b.mirrorX };
}

export function symmetryActive(s: Symmetry): boolean { return s.mirrorX || s.mirrorZ || s.rotate > 1; }

export function validateSymmetry(s: Symmetry): void {
  if (![1, 2, 4].includes(s.rotate)) throw new DomainError('INVALID', 'Drehsymmetrie 1, 2 oder 4 erwartet');
  if (!s.centre2.every(n => Number.isSafeInteger(n))) throw new DomainError('INVALID', 'Symmetrieachse muss auf einer Zellmitte oder Zellgrenze liegen');
  // Quarter turns map cells to cells only when both axis coordinates lie on centres or both on borders.
  if (s.rotate === 4 && (s.centre2[0] - s.centre2[1]) % 2 !== 0)
    throw new DomainError('INVALID', 'Für Vierteldrehungen muss die Achse in X und Z gleich liegen (beide auf Zellmitte oder beide auf Zellgrenze)');
}

/** All transforms of the symmetry group, identity first (1, 2, 4 or 8 elements). */
export function symmetryGroup(s: Symmetry): readonly T[] {
  validateSymmetry(s);
  const gens: T[] = [];
  if (s.mirrorX) gens.push({ quarterTurns: 0, mirrorX: true });
  if (s.mirrorZ) gens.push({ quarterTurns: 2, mirrorX: true });
  if (s.rotate === 2) gens.push({ quarterTurns: 2, mirrorX: false });
  if (s.rotate === 4) gens.push({ quarterTurns: 1, mirrorX: false });
  const out: T[] = [ID], seen = new Set([key(ID)]);
  for (let i = 0; i < out.length; i++) for (const g of gens) {
    const n = compose(g, out[i]!);
    if (!seen.has(key(n))) { seen.add(key(n)); out.push(n); }
  }
  return out;
}

/** Image of a cell under one transform of the group (around the symmetry axis). */
export function symmetryImage(p: Vec3, t: T, s: Symmetry): Vec3 {
  const [cx2, cz2] = s.centre2;
  const r = transformVector([2 * p[0] - cx2, 0, 2 * p[2] - cz2], { ...t, position: [0, 0, 0] } as Transform);
  return [(r[0] + cx2) / 2, p[1], (r[2] + cz2) / 2];
}

export interface SymmetricResult {
  readonly edit: Edit;
  /** Block ids whose state could not be turned (written unturned, reported to the user). */
  readonly unresolved: readonly string[];
  /** Number of images per change (group size). */
  readonly images: number;
}

/**
 * Copies every change to all symmetric positions. The original changes are
 * written last, so where an image falls onto a cell the user edited directly,
 * the direct edit wins. Block entities are copied unchanged (their NBT is not
 * turned, see NBT-01).
 */
export function symmetricEdit(edit: Edit, s: Symmetry): SymmetricResult {
  if (!symmetryActive(s)) return { edit, unresolved: [], images: 1 };
  const group = symmetryGroup(s), unresolved = new Set<string>();
  const direct = new Set(edit.changes.map(c => posKey(c.position)));
  const turned = new Map<string, CellSlot>();
  const images: CellChange[] = [];
  const turn = (v: CellSlot, t: T): CellSlot => {
    if (!v || v.kind !== 'block') return v;
    const k = `${key(t)}|${v.state.id}|${JSON.stringify(v.state.properties)}`;
    let out = turned.get(k);
    if (out === undefined) {
      const r = transformBlockState(v.state, { ...t, position: [0, 0, 0] } as Transform);
      if (!r.resolved) unresolved.add(v.state.id);
      out = { kind: 'block', state: r.state };
      turned.set(k, out);
    }
    return out && v.entity && out.kind === 'block' ? { ...out, entity: v.entity } : out;
  };
  const seen = new Set<string>();
  for (const t of group.slice(1)) for (const c of edit.changes) {
    const p = symmetryImage(c.position, t, s), k = posKey(p);
    if (direct.has(k) || seen.has(k)) continue;
    seen.add(k);
    images.push({ position: p, value: turn(c.value, t) });
  }
  const total = images.length + edit.changes.length;
  if (total > MAX_EDIT_CELLS) throw new DomainError('LIMIT', `Mit Symmetrie umfasst der Schritt ${total.toLocaleString('de-DE')} Zellen; höchstens ${MAX_EDIT_CELLS.toLocaleString('de-DE')}.`);
  return { edit: { label: `${edit.label} · Symmetrie ×${group.length}`, changes: [...images, ...edit.changes], ...(edit.entities && { entities: edit.entities }) }, unresolved: [...unresolved].sort(), images: group.length };
}

/** Axis through the middle of an extent (inclusive min/max): `centre2 = min + max`. */
export function centreOf(min: Vec3, max: Vec3): readonly [number, number] { return [min[0] + max[0], min[2] + max[2]]; }

/** Short German description, e.g. „Spiegeln X + Z · Achse X 4,5 · Z 7“. */
export function symmetryLabel(s: Symmetry): string {
  if (!symmetryActive(s)) return 'aus';
  const parts: string[] = [];
  if (s.mirrorX || s.mirrorZ) parts.push(`Spiegeln ${[s.mirrorX && 'Ost/West', s.mirrorZ && 'Nord/Süd'].filter(Boolean).join(' + ')}`);
  if (s.rotate > 1) parts.push(`${s.rotate}-fach drehen`);
  const f = (n: number) => (n / 2).toLocaleString('de-DE');
  return `${parts.join(' · ')} · Achse X ${f(s.centre2[0])} · Z ${f(s.centre2[1])}`;
}
