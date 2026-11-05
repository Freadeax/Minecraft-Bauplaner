import type { Vec3 } from '../../../voxel/src/types.js';
import { DomainError } from '../core/types.js';
import { MAX_EDIT_CELLS, posKey } from './draft.js';
import type { CellChange, CellSlot, Edit } from './draft.js';
import { lineEdit } from './tools.js';

/**
 * Weitere Formwerkzeuge (EDIT-03): Bogen, Pyramide/Walmdach, Kegel und
 * Mauerzug. Like tools.ts they only produce cell changes in the payload's
 * integer coordinates; patterns (patterns.ts) can paint them afterwards.
 */
function guard(count: number): void {
  if (count > MAX_EDIT_CELLS) throw new DomainError('LIMIT', `Die Form umfasst ${count.toLocaleString('de-DE')} Zellen; höchstens ${MAX_EDIT_CELLS.toLocaleString('de-DE')} je Schritt.`);
}
function int(name: string, v: number, min: number, max: number): void {
  if (!Number.isInteger(v) || v < min || v > max) throw new DomainError('INVALID', `${name} ${min}–${max} erwartet`);
}

export type ArchStyle = 'round' | 'pointed' | 'segment';
export const ARCH_STYLE_LABEL: Readonly<Record<ArchStyle, string>> = { round: 'Rundbogen', pointed: 'Spitzbogen', segment: 'Flachbogen' };

export interface ArchOptions {
  readonly style: ArchStyle;
  /** Height of the arch above the springing line (outer edge), ≥ 1. */
  readonly rise: number;
  /** Thickness of the arch band in blocks, ≥ 1. */
  readonly thickness: number;
  /** Depth along the axis across the span (towards +X or +Z), ≥ 1. */
  readonly depth: number;
  /** Straight posts below the springing line. */
  readonly legs: number;
  /** Fill the rectangle around the opening (a wall with an arched opening) instead of only the band. */
  readonly wall: boolean;
}

/**
 * Arch over the span from `a` to `b` (outer feet, both inclusive) on the
 * layer of `a`. The span runs along the dominant horizontal axis; the arch
 * stands in the vertical plane through `a`. Geometry is tested at cell
 * centres: the band is "inside the outer curve but not inside the opening".
 */
export function archEdit(a: Vec3, b: Vec3, value: CellSlot, o: ArchOptions): Edit {
  int('Höhe', o.rise, 1, 128); int('Stärke', o.thickness, 1, 32); int('Tiefe', o.depth, 1, 64); int('Pfosten', o.legs, 0, 128);
  const alongX = Math.abs(b[0] - a[0]) >= Math.abs(b[2] - a[2]);
  const u0 = Math.min(alongX ? a[0] : a[2], alongX ? b[0] : b[2]), u1 = Math.max(alongX ? a[0] : a[2], alongX ? b[0] : b[2]);
  const width = u1 - u0 + 1, R = width / 2, t = o.thickness, H = o.rise;
  if (width < 3) throw new DomainError('INVALID', 'Ein Bogen braucht mindestens 3 Blöcke Spannweite');
  const height = o.legs + H;
  guard(width * height * o.depth);
  const r = R - t, h = H - t; // opening half-width and height

  /** Inside a curve of half-width w and height k (x from the centre, y above the springing line, both at cell centres). */
  const inside = (x: number, y: number, w: number, k: number): boolean => {
    if (w <= 0 || k <= 0 || y < 0 || Math.abs(x) > w) return false;
    if (o.style === 'round') return (x / w) ** 2 + (y / k) ** 2 <= 1;
    if (o.style === 'pointed') {
      // Equilateral arch: arcs of radius 2w around the opposite springing points, scaled to height k.
      const ys = y * (w * Math.sqrt(3)) / k;
      return (x - w) ** 2 + ys ** 2 <= (2 * w) ** 2 && (x + w) ** 2 + ys ** 2 <= (2 * w) ** 2;
    }
    // Segmental: circle through both springing points with apex height k.
    const rho = (w * w + k * k) / (2 * k), cy = k - rho;
    return x * x + (y - cy) ** 2 <= rho * rho;
  };
  // Profile in the span plane: column u, height dy.
  const opens = (u: number, dy: number): boolean => {
    const x = u + 0.5 - (u0 + R), yc = dy + 0.5;
    return dy < o.legs ? Math.abs(x) < r : inside(x, yc - o.legs, r, h);
  };
  const profile = new Set<string>();
  for (let u = u0; u <= u1; u++) {
    const x = u + 0.5 - (u0 + R);
    for (let dy = 0; dy < height; dy++) {
      // Below the springing line: posts outside the opening width; above: the curves.
      const outer = dy < o.legs ? Math.abs(x) <= R : inside(x, dy + 0.5 - o.legs, R, H);
      if (o.wall ? !opens(u, dy) : outer && !opens(u, dy)) profile.add(`${u},${dy}`);
    }
  }
  if (!o.wall) {
    // Close diagonal-only steps so the band is connected face to face (no gaps in game).
    // Of the two cells completing the step, the one outside the opening and farther from the centre wins; ties add both.
    const dist = (u: number, dy: number) => Math.hypot((u + 0.5 - (u0 + R)) / R, (dy + 0.5 - o.legs) / H);
    for (const k of [...profile]) {
      const [u, dy] = k.split(',').map(Number) as [number, number];
      for (const [du, dd] of [[1, 1], [-1, 1]] as const) {
        if (!profile.has(`${u + du},${dy + dd}`) || profile.has(`${u + du},${dy}`) || profile.has(`${u},${dy + dd}`)) continue;
        const cands = ([[u + du, dy], [u, dy + dd]] as const).filter(([cu, cd]) => cu >= u0 && cu <= u1 && cd < height && !opens(cu, cd));
        if (!cands.length) continue;
        const best = Math.max(...cands.map(([cu, cd]) => dist(cu, cd)));
        for (const [cu, cd] of cands) if (dist(cu, cd) >= best - 1e-9) profile.add(`${cu},${cd}`);
      }
    }
  }
  const changes: CellChange[] = [];
  const v0 = alongX ? a[2] : a[0];
  for (const k of [...profile].sort()) {
    const [u, dy] = k.split(',').map(Number) as [number, number];
    for (let d = 0; d < o.depth; d++) {
      const v = v0 + d;
      changes.push({ position: alongX ? [u, a[1] + dy, v] : [v, a[1] + dy, u], value });
    }
  }
  return { label: o.wall ? `Wand mit ${ARCH_STYLE_LABEL[o.style]}` : ARCH_STYLE_LABEL[o.style], changes };
}

/**
 * Stepped pyramid on the footprint between `a` and `b` (layer of `a`). Each
 * layer shrinks by `step` blocks on every side; on a rectangle it ends in a
 * ridge (hip roof). `maxHeight` 0 = until it closes.
 */
export function pyramidEdit(a: Vec3, b: Vec3, value: CellSlot, opts: { hollow?: boolean; step?: number; maxHeight?: number } = {}): Edit {
  const step = opts.step ?? 1, maxHeight = opts.maxHeight ?? 0;
  int('Stufe', step, 1, 8); int('Höhe', maxHeight, 0, 384);
  const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), z0 = Math.min(a[2], b[2]), z1 = Math.max(a[2], b[2]);
  const changes: CellChange[] = [];
  for (let dy = 0; ; dy++) {
    if (maxHeight && dy >= maxHeight) break;
    const ax = x0 + dy * step, bx = x1 - dy * step, az = z0 + dy * step, bz = z1 - dy * step;
    if (ax > bx || az > bz) break;
    for (let z = az; z <= bz; z++) for (let x = ax; x <= bx; x++) {
      // Hollow: only the outer ring of each layer, plus the top layer and the cells the next layer does not cover.
      if (opts.hollow) {
        const nx0 = ax + step, nx1 = bx - step, nz0 = az + step, nz1 = bz - step;
        const covered = nx0 <= nx1 && nz0 <= nz1 && (!maxHeight || dy + 1 < maxHeight);
        const ring = x === ax || x === bx || z === az || z === bz;
        if (!ring && covered && x >= nx0 && x <= nx1 && z >= nz0 && z <= nz1) continue;
      }
      changes.push({ position: [x, a[1] + dy, z], value });
    }
    guard(changes.length);
  }
  return { label: opts.hollow ? 'Hohlpyramide' : 'Pyramide', changes };
}

/** Upright cone (round tower roof) on the centre cell; radius 0–64, height 1–384. */
export function coneEdit(base: Vec3, radius: number, height: number, value: CellSlot, opts: { hollow?: boolean } = {}): Edit {
  int('Radius', radius, 0, 64); int('Höhe', height, 1, 384);
  guard((2 * radius + 1) ** 2 * height);
  const rAt = (dy: number) => (radius + 0.5) * (height - dy) / height;
  const inside = (dx: number, dy: number, dz: number) => dy >= 0 && dy < height && dx * dx + dz * dz <= rAt(dy) ** 2;
  const changes: CellChange[] = [];
  for (let dy = 0; dy < height; dy++) for (let dz = -radius; dz <= radius; dz++) for (let dx = -radius; dx <= radius; dx++) {
    if (!inside(dx, dy, dz)) continue;
    if (opts.hollow && inside(dx + 1, dy, dz) && inside(dx - 1, dy, dz) && inside(dx, dy, dz + 1) && inside(dx, dy, dz - 1) && inside(dx, dy + 1, dz)) continue;
    changes.push({ position: [base[0] + dx, base[1] + dy, base[2] + dz], value });
  }
  return { label: opts.hollow ? 'Hohlkegel' : 'Kegel', changes };
}

/** Wall along a straight (also diagonal) line, `height` blocks high and `thickness` thick (grows to +X/+Z of the line). */
export function wallLineEdit(a: Vec3, b: Vec3, height: number, value: CellSlot, opts: { thickness?: number } = {}): Edit {
  const thickness = opts.thickness ?? 1;
  int('Höhe', height, 1, 384); int('Stärke', thickness, 1, 16);
  const base = lineEdit(a, b, value).changes, seen = new Set<string>(), changes: CellChange[] = [];
  const alongX = Math.abs(b[0] - a[0]) >= Math.abs(b[2] - a[2]);
  guard(base.length * height * thickness);
  for (const c of base) for (let t = 0; t < thickness; t++) for (let dy = 0; dy < height; dy++) {
    const p: Vec3 = alongX ? [c.position[0], c.position[1] + dy, c.position[2] + t] : [c.position[0] + t, c.position[1] + dy, c.position[2]];
    const k = posKey(p);
    if (!seen.has(k)) { seen.add(k); changes.push({ position: p, value }); }
  }
  return { label: height > 1 || thickness > 1 ? 'Mauerzug' : 'Linie', changes };
}
