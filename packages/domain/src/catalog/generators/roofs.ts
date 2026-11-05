import { slab, stairs } from '../build/plot.js';
import type { H, Plot } from '../build/plot.js';
import type { Style } from './styles.js';
import { lookOfStyle } from './styles.js';
import { pitchedRoof } from '../build/style.js';
import type { RoofPitch } from '../build/style.js';

/**
 * Dachformen (B13), shared by the roof, house and tower generators. A roof is
 * described by a height field: every cell of the footprint gets its distance
 * `d` to the eaves along the slope; steep roofs rise one block per step
 * (stairs), shallow roofs half a block (slabs alternating bottom/top).
 */
export type RoofForm = 'sattel' | 'walm' | 'pult' | 'flach';
export type Pitch = 'steil' | 'sehrsteil' | 'flach';
export const ROOF_OPTIONS = [
  { value: 'sattel', label: 'Satteldach' }, { value: 'walm', label: 'Walmdach (auf Quadrat: Zeltdach)' },
  { value: 'pult', label: 'Pultdach' }, { value: 'flach', label: 'Flachdach' },
] as const;
export const PITCH_OPTIONS = [{ value: 'steil', label: 'Steil (1:1, Treppen)' }, { value: 'sehrsteil', label: 'Sehr steil (2:1, Fachwerkgiebel)' }, { value: 'flach', label: 'Flach (1:2, Stufen)' }] as const;
/** Generator pitch → design kit pitch (LIB-05). */
export const kitPitch = (p: string): RoofPitch => p === 'sehrsteil' ? 'steil' : p === 'flach' ? 'flach' : 'normal';

export interface RoofSpec {
  readonly x0: number; readonly x1: number; readonly z0: number; readonly z1: number;
  /** Layer of the eaves. */
  readonly y: number;
  readonly form: RoofForm;
  readonly pitch: Pitch;
  /** Ridge direction of gable and shed roofs. */
  readonly ridge: 'x' | 'z';
  readonly style: Style;
  /** Gable triangles (sattel, pult) are closed with wall blocks on this inner rectangle. */
  readonly gable?: { readonly x0: number; readonly x1: number; readonly z0: number; readonly z1: number; readonly block: string } | undefined;
  /** Parapet on flat roofs. */
  readonly parapet?: boolean;
  /** Shed roofs: rise toward west/north instead of east/south (GEN-02, e.g. the east aisle of a church). */
  readonly flip?: boolean;
  /** Seed of the material mixes (generator variant). */
  readonly seed?: number;
}

/** Builds the roof; returns the highest layer used (for chimneys and spires). */
export function buildRoof(p: Plot, r: RoofSpec): number {
  const { style } = r;
  let top = r.y;
  if (r.form === 'flach') {
    p.fill(r.x0, r.y, r.z0, r.x1, r.y, r.z1, style.roof.full);
    if (r.parapet) { p.ring(r.x0, r.z0, r.x1, r.z1, r.y + 1, style.trim.wall ?? style.trim.slab, style.trim.wall ? {} : slab()); top = r.y + 1; }
    return top;
  }
  // LIB-05: pitched roofs come from the design kit (overhang with soffit, verge boards, thick body, gables with post and windows).
  const walls = r.gable ? { x0: r.gable.x0, x1: r.gable.x1, z0: r.gable.z0, z1: r.gable.z1 } : { x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1 };
  const ov = Math.max(0, walls.x0 - r.x0);
  const look = lookOfStyle(style);
  return pitchedRoof(p, r.gable && r.gable.block !== style.wall ? { ...look, wall: [[r.gable.block, 1]] } : look, { walls, y: r.y, kind: r.form, ridge: r.ridge, overhang: ov, pitch: kitPitch(r.pitch),
    flip: !!r.flip, gables: !!r.gable, seed: r.seed ?? 0 });
}

export const range = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/** Cone roof for round towers: shrinking rings of stairs rising toward the centre. */
export function coneRoof(p: Plot, cx: number, cz: number, y: number, r: number, style: Style): number {
  let layer = 0;
  for (let rr = r; rr >= 1; rr--, layer++) {
    const R = rr * rr + rr * 0.8, inner = (rr - 1) * (rr - 1) + (rr - 1) * 0.8;
    for (let x = cx - rr - 1; x <= cx + rr + 1; x++) for (let z = cz - rr - 1; z <= cz + rr + 1; z++) {
      const q = (x - cx) ** 2 + (z - cz) ** 2;
      if (q > R || (rr > 1 && q <= inner) || !p.inside(x, y + layer, z)) continue;
      const dx = cx - x, dz = cz - z;
      const up: H = Math.abs(dx) >= Math.abs(dz) ? (dx > 0 ? 'east' : 'west') : (dz > 0 ? 'south' : 'north');
      if (x === cx && z === cz) p.set(x, y + layer, z, style.roof.full);
      else p.set(x, y + layer, z, style.roof.stairs, stairs(up));
    }
  }
  p.set(cx, y + layer, cz, style.roof.full);
  return y + layer;
}
