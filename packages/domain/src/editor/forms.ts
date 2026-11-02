import type { Vec3 } from '../../../voxel/src/types.js';
import { DomainError } from '../types.js';
import { MAX_EDIT_CELLS, posKey } from './draft.js';
import type { CellChange, CellSlot, Edit } from './draft.js';
import { boxBounds } from './tools.js';
import type { Box } from './tools.js';

/**
 * Weitere Formen (EDIT-05): Ellipsoid im aufgezogenen Quader, Torus und
 * Wendel (Spiralrampe/-treppe). Like shapes.ts they only produce cell changes
 * in payload coordinates; patterns and symmetry act on them afterwards. All
 * shapes are tested at cell centres, so equal inputs give equal cells.
 */
function guard(count: number): void {
  if (count > MAX_EDIT_CELLS) throw new DomainError('LIMIT', `Die Form umfasst ${count.toLocaleString('de-DE')} Zellen; höchstens ${MAX_EDIT_CELLS.toLocaleString('de-DE')} je Schritt.`);
}
function int(name: string, v: number, min: number, max: number): void {
  if (!Number.isInteger(v) || v < min || v > max) throw new DomainError('INVALID', `${name} ${min}–${max} erwartet`);
}
/** Face and edge neighbours (18). */
const N18: readonly (readonly [number, number, number])[] = (() => {
  const out: [number, number, number][] = [];
  for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) for (let x = -1; x <= 1; x++) { const n = Math.abs(x) + Math.abs(y) + Math.abs(z); if (n === 1 || n === 2) out.push([x, y, z]); }
  return out;
})();

/**
 * Keeps only shell cells: inside cells with a face or edge neighbour outside. Testing edges too keeps
 * the shell face-connected on curved surfaces (no cells that only touch at an edge, no gaps in game).
 */
function shell(inside: (x: number, y: number, z: number) => boolean, x: number, y: number, z: number): boolean {
  return N18.some(([a, b, c]) => !inside(x + a, y + b, z + c));
}

/**
 * Ellipsoid filling the box (each axis its own radius: eggs, onion domes,
 * flattened hills). `dome` uses the box as the upper half: the equator lies on
 * the bottom face of the box.
 */
export function ellipsoidEdit(box: Box, value: CellSlot, o: { hollow?: boolean; dome?: boolean } = {}): Edit {
  const { min, maxExclusive } = boxBounds(box), s = [0, 1, 2].map(i => maxExclusive[i]! - min[i]!);
  guard(s[0]! * s[1]! * s[2]!);
  const c = [min[0] + s[0]! / 2, o.dome ? min[1] : min[1] + s[1]! / 2, min[2] + s[2]! / 2];
  const r = [s[0]! / 2, o.dome ? s[1]! : s[1]! / 2, s[2]! / 2];
  const inside = (x: number, y: number, z: number): boolean => {
    if (x < min[0] || y < min[1] || z < min[2] || x >= maxExclusive[0] || y >= maxExclusive[1] || z >= maxExclusive[2]) return false;
    return ((x + 0.5 - c[0]!) / r[0]!) ** 2 + ((y + 0.5 - c[1]!) / r[1]!) ** 2 + ((z + 0.5 - c[2]!) / r[2]!) ** 2 <= 1;
  };
  const changes: CellChange[] = [];
  for (let y = min[1]; y < maxExclusive[1]; y++) for (let z = min[2]; z < maxExclusive[2]; z++) for (let x = min[0]; x < maxExclusive[0]; x++) {
    if (!inside(x, y, z)) continue;
    // A dome stands on its base: the bottom layer is not a shell face of its own.
    if (o.hollow && !shell((a, b, cc) => inside(a, b, cc) || (!!o.dome && b < min[1] && inside(a, min[1], cc)), x, y, z)) continue;
    changes.push({ position: [x, y, z], value });
  }
  return { label: o.dome ? (o.hollow ? 'Ellipsenkuppel (hohl)' : 'Ellipsenkuppel') : o.hollow ? 'Hohlellipsoid' : 'Ellipsoid', changes };
}

export type TorusAxis = 'y' | 'x' | 'z';
export const TORUS_AXIS_LABEL: Readonly<Record<TorusAxis, string>> = { y: 'liegend (Ring)', x: 'stehend, Öffnung nach Osten/Westen', z: 'stehend, Öffnung nach Norden/Süden' };

/**
 * Torus around the centre cell: `major` = distance from the centre to the
 * middle of the tube, `minor` = tube radius. Lying (axis y) it is a ring
 * (fountain rim, tower collar); standing it is a wheel or round window frame.
 */
export function torusEdit(centre: Vec3, major: number, minor: number, value: CellSlot, o: { axis?: TorusAxis; hollow?: boolean; half?: boolean } = {}): Edit {
  int('Ringradius', major, 1, 64); int('Rohrradius', minor, 1, 32);
  const axis = o.axis ?? 'y', R = major, r2 = (minor + 0.5) ** 2, ext = major + minor;
  guard((2 * ext + 1) ** 2 * (2 * minor + 1));
  // (u, v) span the ring plane, w is the axis.
  const uvw = (dx: number, dy: number, dz: number): [number, number, number] => axis === 'y' ? [dx, dz, dy] : axis === 'x' ? [dz, dy, dx] : [dx, dy, dz];
  const inside = (dx: number, dy: number, dz: number): boolean => {
    const [u, v, w] = uvw(dx, dy, dz);
    if (o.half && (axis === 'y' ? w < 0 : v < 0)) return false;
    return (Math.hypot(u, v) - R) ** 2 + w * w <= r2;
  };
  const span = (a: 'x' | 'y' | 'z') => a === axis ? minor : ext;
  const changes: CellChange[] = [];
  for (let dy = -span('y'); dy <= span('y'); dy++) for (let dz = -span('z'); dz <= span('z'); dz++) for (let dx = -span('x'); dx <= span('x'); dx++) {
    if (!inside(dx, dy, dz)) continue;
    if (o.hollow && !shell(inside, dx, dy, dz)) continue;
    changes.push({ position: [centre[0] + dx, centre[1] + dy, centre[2] + dz], value });
  }
  return { label: o.half ? 'Halber Torus (Bogenring)' : o.hollow ? 'Hohltorus' : 'Torus', changes };
}

export interface HelixOptions {
  /** Radial width of the ramp in blocks (from the outer edge inwards). */
  readonly width: number;
  /** Height gained per full turn. */
  readonly pitch: number;
  /** Total height in blocks. */
  readonly height: number;
  /** Turning direction seen from above (X right, Z down as in the layer grid). */
  readonly clockwise: boolean;
  /** Blocks below each step (1 = thin ramp). */
  readonly thickness?: number;
  /** Turn `facing` of the brush along the ascent (stairs face uphill). Default true. */
  readonly orient?: boolean;
}

/**
 * Wendel: spiral ramp or staircase around the centre column (towers,
 * lighthouses, mine shafts). Every cell of the ring gets one step per turn at
 * the height of its angle; with stairs as the brush the steps face uphill.
 * Walkable (≤ 1 block rise between neighbouring steps) while the pitch is at
 * most the circumference; `walkable` reports it.
 */
export function helixEdit(base: Vec3, radius: number, value: CellSlot, o: HelixOptions): Edit & { readonly walkable: boolean } {
  int('Radius', radius, 1, 64); int('Breite', o.width, 1, radius + 1); int('Steigung', o.pitch, 2, 384); int('Höhe', o.height, 1, 384);
  const thick = o.thickness ?? 1; int('Stärke', thick, 1, 16);
  const outer = (radius + 0.5) ** 2, inner = Math.max(0, radius + 0.5 - o.width) ** 2;
  const turns = Math.ceil(o.height / o.pitch) + 1;
  guard((2 * radius + 1) ** 2 * turns * thick);
  const changes: CellChange[] = [], seen = new Set<string>();
  const oriented = (dx: number, dz: number): CellSlot => {
    if (value?.kind !== 'block' || o.orient === false || !Object.hasOwn(value.state.properties, 'facing')) return value;
    // Tangent of the ascent at the cell (z grows downwards in the grid: clockwise = increasing atan2(z, x)).
    const t = o.clockwise ? [-dz, dx] : [dz, -dx];
    const facing = Math.abs(t[0]!) >= Math.abs(t[1]!) ? (t[0]! > 0 ? 'east' : 'west') : (t[1]! > 0 ? 'south' : 'north');
    return { ...value, state: { id: value.state.id, properties: { ...value.state.properties, facing } } };
  };
  for (let dz = -radius; dz <= radius; dz++) for (let dx = -radius; dx <= radius; dx++) {
    const d2 = dx * dx + dz * dz;
    if (d2 > outer || d2 <= inner || (dx === 0 && dz === 0 && o.width <= radius)) continue;
    let a = Math.atan2(dz, dx) / (2 * Math.PI); if (a < 0) a += 1;
    const f = o.clockwise ? a : (1 - a) % 1, v = oriented(dx, dz);
    for (let k = 0; k < turns; k++) {
      const top = Math.floor((f + k) * o.pitch);
      if (top >= o.height) break;
      for (let s = 0; s < thick && top - s >= 0; s++) {
        const p: Vec3 = [base[0] + dx, base[1] + top - s, base[2] + dz], key = posKey(p);
        if (!seen.has(key)) { seen.add(key); changes.push({ position: p, value: s === 0 ? v : value }); }
      }
    }
  }
  guard(changes.length);
  // Walkable: every height of a turn has steps, and each height touches the next one face to face
  // (plateaus of several cells are walked across; no climb of two blocks).
  const level = new Map<string, number>();
  for (let dz = -radius; dz <= radius; dz++) for (let dx = -radius; dx <= radius; dx++) {
    const d2 = dx * dx + dz * dz;
    if (d2 > outer || d2 <= inner || (dx === 0 && dz === 0 && o.width <= radius)) continue;
    let a = Math.atan2(dz, dx) / (2 * Math.PI); if (a < 0) a += 1;
    level.set(`${dx},${dz}`, Math.floor((o.clockwise ? a : (1 - a) % 1) * o.pitch));
  }
  const touches = new Set<number>();
  for (const [k, y] of level) {
    const [x, z] = k.split(',').map(Number) as [number, number];
    for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const n = level.get(`${x + ax},${z + az}`);
      if (n !== undefined && n === (y + 1) % o.pitch) touches.add(y);
    }
  }
  let walkable = true;
  for (let y = 0; y < o.pitch; y++) if (!touches.has(y)) { walkable = false; break; }
  return { label: 'Wendel', changes, walkable };
}
