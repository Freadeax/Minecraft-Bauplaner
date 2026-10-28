import { slab, stairs } from '../build/plot.js';
import type { H, Plot } from '../build/plot.js';
import type { Style } from './styles.js';

/**
 * Dachformen (B13), shared by the roof, house and tower generators. A roof is
 * described by a height field: every cell of the footprint gets its distance
 * `d` to the eaves along the slope; steep roofs rise one block per step
 * (stairs), shallow roofs half a block (slabs alternating bottom/top).
 */
export type RoofForm = 'sattel' | 'walm' | 'pult' | 'flach';
export type Pitch = 'steil' | 'flach';
export const ROOF_OPTIONS = [
  { value: 'sattel', label: 'Satteldach' }, { value: 'walm', label: 'Walmdach (auf Quadrat: Zeltdach)' },
  { value: 'pult', label: 'Pultdach' }, { value: 'flach', label: 'Flachdach' },
] as const;
export const PITCH_OPTIONS = [{ value: 'steil', label: 'Steil (1:1, Treppen)' }, { value: 'flach', label: 'Flach (1:2, Stufen)' }] as const;

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
}

interface Slope { readonly d: number; readonly up: H }

/** Distance to the eaves and the direction in which the roof rises at (x, z). */
function slopeAt(r: RoofSpec, x: number, z: number): Slope {
  const w = x - r.x0, e = r.x1 - x, n = z - r.z0, s = r.z1 - z;
  const across = r.ridge === 'z' ? [[w, 'east'], [e, 'west']] as const : [[n, 'south'], [s, 'north']] as const;
  switch (r.form) {
    case 'sattel': return across[0][0] <= across[1][0] ? { d: across[0][0], up: across[0][1] } : { d: across[1][0], up: across[1][1] };
    case 'pult': return r.ridge === 'z' ? { d: w, up: 'east' } : { d: n, up: 'south' };
    case 'walm': {
      const opts: readonly (readonly [number, H])[] = [[w, 'east'], [e, 'west'], [n, 'south'], [s, 'north']];
      let best = opts[0]!;
      for (const o of opts) if (o[0] < best[0]) best = o;
      return { d: best[0], up: best[1] };
    }
    case 'flach': return { d: 0, up: 'north' };
  }
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
  const maxD = Math.max(...range(r.x0, r.x1).flatMap(x => range(r.z0, r.z1).map(z => slopeAt(r, x, z).d)));
  for (let x = r.x0; x <= r.x1; x++) for (let z = r.z0; z <= r.z1; z++) {
    const { d, up } = slopeAt(r, x, z);
    const ridge = d === maxD && r.form !== 'pult';
    // Two cells share the ridge when the span is even: both keep their stairs and meet back to back.
    const lone = ridge && isLoneRidge(r, x, z, maxD);
    if (r.pitch === 'steil') {
      const y = r.y + d;
      if (lone) p.set(x, y, z, style.roof.slab, slab());
      else p.set(x, y, z, style.roof.stairs, stairs(up));
      for (let yy = r.y + Math.max(0, d - 1); yy < y && d > 0; yy++) if (!p.has(x, yy, z)) p.set(x, yy, z, style.roof.full);
      top = Math.max(top, y);
    } else {
      const y = r.y + Math.floor(d / 2);
      p.set(x, y, z, style.roof.slab, slab(d % 2 === 0 ? 'bottom' : 'top'));
      if (d % 2 === 0 && d > 0 && !p.has(x, y - 1, z)) p.set(x, y - 1, z, style.roof.full);
      top = Math.max(top, y);
    }
  }
  if (r.gable && (r.form === 'sattel' || r.form === 'pult')) closeGables(p, r, maxD);
  return top;
}

function isLoneRidge(r: RoofSpec, x: number, z: number, maxD: number): boolean {
  const n = (dx: number, dz: number) => {
    const xx = x + dx, zz = z + dz;
    return xx >= r.x0 && xx <= r.x1 && zz >= r.z0 && zz <= r.z1 && slopeAt(r, xx, zz).d === maxD && slopeAt(r, xx, zz).up !== slopeAt(r, x, z).up;
  };
  return !(n(1, 0) || n(-1, 0) || n(0, 1) || n(0, -1));
}

/** Fills the triangle under the roof on both gable walls. */
function closeGables(p: Plot, r: RoofSpec, maxD: number): void {
  const g = r.gable!;
  // Gable ends across the ridge; a shed roof also closes its high side.
  const lines: [number, number][] = [];
  if (r.ridge === 'z') { for (let x = g.x0; x <= g.x1; x++) lines.push([x, g.z0], [x, g.z1]); if (r.form === 'pult') for (let z = g.z0; z <= g.z1; z++) lines.push([g.x1, z]); }
  else { for (let z = g.z0; z <= g.z1; z++) lines.push([g.x0, z], [g.x1, z]); if (r.form === 'pult') for (let x = g.x0; x <= g.x1; x++) lines.push([x, g.z1]); }
  {
    for (const [x, z] of lines) {
      const { d } = slopeAt(r, x, z);
      const surface = r.pitch === 'steil' ? r.y + d : r.y + Math.floor(d / 2) - (d % 2 === 0 ? 1 : 0);
      for (let y = r.y; y < surface; y++) p.set(x, y, z, g.block);
      if (d === maxD && r.pitch === 'steil' && r.form === 'sattel' && isLoneRidge(r, x, z, maxD)) p.set(x, surface, z, g.block);
    }
  }
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
