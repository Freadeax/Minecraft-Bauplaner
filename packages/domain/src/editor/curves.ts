import type { Vec3 } from '../../../voxel/src/types.js';
import { DomainError } from '../core/types.js';
import { MAX_EDIT_CELLS, keyPos, posKey } from './draft.js';
import type { CellChange, CellSlot, Edit } from './draft.js';

/**
 * Kurven und Pfade (EDIT-04, Idee aus Spline-/Pfadwerkzeugen). A smooth
 * Catmull-Rom curve runs through the clicked control points (cell centres)
 * and is turned into cells with a profile:
 *
 * - `tube`  round cross-section of radius r (r = 0: a single connected line),
 * - `road`  flat horizontal band of `width` across the direction of travel,
 * - `wall`  band of `width` raised by `height` blocks (city walls, hedges).
 *
 * Every result is face-connected along the path (diagonal-only steps are
 * closed), so a wall or path has no gaps in game.
 */
export type CurveProfile = 'tube' | 'road' | 'wall';
export const CURVE_PROFILE_LABEL: Readonly<Record<CurveProfile, string>> = { tube: 'Rohr / Linie', road: 'Weg (flaches Band)', wall: 'Mauer (Band mit Höhe)' };

export interface CurveOptions {
  readonly profile: CurveProfile;
  /** Tube radius 0–16. */
  readonly radius?: number;
  /** Band width 1–33 (road/wall). */
  readonly width?: number;
  /** Wall height 1–128. */
  readonly height?: number;
  /** Close the curve back to the first point (rings, enclosures). */
  readonly closed?: boolean;
  /** 0 = straight segments between the points, 1 = full Catmull-Rom smoothing (default 1). */
  readonly tension?: number;
}

function int(name: string, v: number, min: number, max: number): void {
  if (!Number.isInteger(v) || v < min || v > max) throw new DomainError('INVALID', `${name} ${min}–${max} erwartet`);
}

/** Point on a uniform Catmull-Rom segment p1→p2 at t ∈ [0,1], blended with the straight segment by `tension`. */
function catmull(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number, tension: number): [number, number, number] {
  const t2 = t * t, t3 = t2 * t, out: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const c = 0.5 * (2 * p1[i]! + (-p0[i]! + p2[i]!) * t + (2 * p0[i]! - 5 * p1[i]! + 4 * p2[i]! - p3[i]!) * t2 + (-p0[i]! + 3 * p1[i]! - 3 * p2[i]! + p3[i]!) * t3);
    const lin = p1[i]! + (p2[i]! - p1[i]!) * t;
    out[i] = lin + (c - lin) * tension;
  }
  return out;
}

/** Dense samples along the curve (≤ ¼ block apart) with their horizontal direction. */
export function curveSamples(points: readonly Vec3[], o: { closed?: boolean; tension?: number } = {}): { p: [number, number, number]; dir: [number, number] }[] {
  if (points.length < 2) throw new DomainError('INVALID', 'Eine Kurve braucht mindestens zwei Punkte');
  if (points.length > 64) throw new DomainError('INVALID', 'Höchstens 64 Kurvenpunkte');
  const tension = Math.max(0, Math.min(1, o.tension ?? 1)), closed = !!o.closed && points.length >= 3;
  const n = points.length, at = (i: number): Vec3 => closed ? points[((i % n) + n) % n]! : points[Math.max(0, Math.min(n - 1, i))]!;
  const segs = closed ? n : n - 1, out: { p: [number, number, number]; dir: [number, number] }[] = [];
  for (let s = 0; s < segs; s++) {
    const p0 = at(s - 1), p1 = at(s), p2 = at(s + 1), p3 = at(s + 2);
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]);
    const steps = Math.max(1, Math.ceil(len * 4));
    for (let k = 0; k < steps + (s === segs - 1 ? 1 : 0); k++) out.push({ p: catmull(p0, p1, p2, p3, k / steps, tension), dir: [0, 0] });
  }
  // Horizontal direction from the neighbouring samples (central difference).
  for (let i = 0; i < out.length; i++) {
    const a = out[Math.max(0, i - 1)]!.p, b = out[Math.min(out.length - 1, i + 1)]!.p;
    let dx = b[0] - a[0], dz = b[2] - a[2];
    const l = Math.hypot(dx, dz);
    if (l < 1e-9) { const prev = out[i - 1]?.dir; [dx, dz] = prev && (prev[0] || prev[1]) ? prev : [1, 0]; } else { dx /= l; dz /= l; }
    out[i]!.dir = [dx, dz];
  }
  return out;
}

/** Adds the cell and, for a diagonal step from `prev`, the bridging cells so the path stays face-connected. */
function addConnected(set: Set<string>, prev: Vec3 | null, p: Vec3): void {
  if (prev) {
    const cur: number[] = [...prev];
    // Walk axis by axis (x, z, then y) from prev to p; every intermediate cell joins the path.
    for (const i of [0, 2, 1]) while (cur[i] !== p[i]) { cur[i]! += Math.sign(p[i]! - cur[i]!); set.add(posKey(cur as unknown as Vec3)); }
  }
  set.add(posKey(p));
}

const round3 = (p: readonly number[]): Vec3 => [Math.round(p[0]!), Math.round(p[1]!), Math.round(p[2]!)];

/** Cells of the curve (positions only). */
export function curveCells(points: readonly Vec3[], o: CurveOptions): Vec3[] {
  const samples = curveSamples(points, o);
  const cells = new Set<string>();
  if (o.profile === 'tube') {
    const r = o.radius ?? 0; int('Radius', r, 0, 16);
    const spine = new Set<string>();
    let prev: Vec3 | null = null;
    for (const s of samples) { const c = round3(s.p); addConnected(spine, prev, c); prev = c; }
    if (r === 0) return [...spine].map(keyPos);
    const ball: Vec3[] = [], r2 = (r + 0.5) ** 2;
    for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy + dz * dz <= r2) ball.push([dx, dy, dz]);
    if (spine.size * ball.length > MAX_EDIT_CELLS * 8) throw new DomainError('LIMIT', 'Die Kurve ist für diesen Radius zu lang.');
    for (const k of spine) { const c = keyPos(k); for (const d of ball) cells.add(posKey([c[0] + d[0], c[1] + d[1], c[2] + d[2]])); }
  } else {
    const w = o.width ?? 3; int('Breite', w, 1, 33);
    const h = o.profile === 'wall' ? (o.height ?? 4) : 1; int('Höhe', h, 1, 128);
    const half = (w - 1) / 2;
    // One rail per half-block offset across the direction; each rail is face-connected on its own,
    // and neighbouring rails are at most half a block apart, so the band has no holes.
    for (let off = -half; off <= half + 1e-9; off += 0.5) {
      let prev: Vec3 | null = null;
      for (const s of samples) {
        const c = round3([s.p[0] - s.dir[1] * off, s.p[1], s.p[2] + s.dir[0] * off]);
        addConnected(cells, prev, c); prev = c;
      }
    }
    if (h > 1) {
      const base = [...cells].map(keyPos);
      if (base.length * h > MAX_EDIT_CELLS) throw new DomainError('LIMIT', `Die Mauer umfasst ${(base.length * h).toLocaleString('de-DE')} Zellen; höchstens ${MAX_EDIT_CELLS.toLocaleString('de-DE')} je Schritt.`);
      for (const b of base) for (let dy = 1; dy < h; dy++) cells.add(posKey([b[0], b[1] + dy, b[2]]));
    }
  }
  if (cells.size > MAX_EDIT_CELLS) throw new DomainError('LIMIT', `Die Kurve umfasst ${cells.size.toLocaleString('de-DE')} Zellen; höchstens ${MAX_EDIT_CELLS.toLocaleString('de-DE')} je Schritt.`);
  return [...cells].map(keyPos);
}

/** Curve as one undoable edit (patterns can paint it afterwards, e.g. a gravel path with cobblestone). */
export function curveEdit(points: readonly Vec3[], value: CellSlot, o: CurveOptions): Edit {
  const changes: CellChange[] = curveCells(points, o).map(position => ({ position, value }));
  return { label: `Kurve · ${CURVE_PROFILE_LABEL[o.profile]}`, changes };
}

/** Approximate length of the curve in blocks (for the HUD). */
export function curveLength(points: readonly Vec3[], o: { closed?: boolean; tension?: number } = {}): number {
  const s = curveSamples(points, o);
  let l = 0;
  for (let i = 1; i < s.length; i++) l += Math.hypot(s[i]!.p[0] - s[i - 1]!.p[0], s[i]!.p[1] - s[i - 1]!.p[1], s[i]!.p[2] - s[i - 1]!.p[2]);
  return l;
}
