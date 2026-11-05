import { DomainError } from '../core/types.js';
import { WORLD_PATH_MAX_POINTS, pathLength } from './worldPlan.js';
import type { WorldPath } from './worldPlan.js';

/**
 * Measuring, height profiles and routes over the terrain of the world map
 * (MAP-06). Everything here is pure and works on a `Ground` lookup: the
 * known surface height of a column from a terrain survey or from chunks the
 * mod has read. Unknown columns return null and are reported, never guessed.
 */

export type Ground = (x: number, z: number) => { readonly y: number; readonly id?: string } | null;
type XZ = readonly [number, number];
const fail = (message: string): never => { throw new DomainError('INVALID', `Weltkarte: ${message}`); };
const fmt = (n: number) => n.toLocaleString('de-DE');
const round1 = (n: number) => Math.round(n * 10) / 10;

// ------------------------------------------------------------------ measuring

export interface MeasureSummary {
  /** Straight line length of all legs in blocks (one decimal). */
  readonly length: number;
  /** Walking distance on the block grid (|ΔX| + |ΔZ| per leg). */
  readonly walk: number;
  readonly dx: number;
  readonly dz: number;
  /** Height known at every corner: metres climbed and descended along the corners. */
  readonly climb: number | null;
  readonly descent: number | null;
  readonly yStart: number | null;
  readonly yEnd: number | null;
  /** Area of the closed polygon in blocks² when there are three or more corners. */
  readonly area: number | null;
  readonly corners: number;
}

/** Totals of a measured polyline: lengths, height difference, area of the closed shape. */
export function measureSummary(points: readonly XZ[], groundAt?: Ground): MeasureSummary {
  let length = 0, walk = 0;
  for (let i = 0; i + 1 < points.length; i++) {
    const dx = points[i + 1]![0] - points[i]![0], dz = points[i + 1]![1] - points[i]![1];
    length += Math.hypot(dx, dz); walk += Math.abs(dx) + Math.abs(dz);
  }
  const first = points[0], last = points.at(-1);
  const ys = groundAt && points.length ? points.map(p => groundAt(p[0], p[1])?.y ?? null) : [];
  const known = ys.length > 0 && ys.every(y => y !== null);
  let climb = 0, descent = 0;
  if (known) for (let i = 0; i + 1 < ys.length; i++) { const d = ys[i + 1]! - ys[i]!; if (d > 0) climb += d; else descent -= d; }
  let area: number | null = null;
  if (points.length >= 3) {
    let sum = 0;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) sum += (points[j]![0] - points[i]![0]) * (points[j]![1] + points[i]![1]);
    area = Math.round(Math.abs(sum) / 2);
  }
  return { length: round1(length), walk, dx: first && last ? last[0] - first[0] : 0, dz: first && last ? last[1] - first[1] : 0,
    climb: known ? climb : null, descent: known ? descent : null, yStart: known ? ys[0]! : null, yEnd: known ? ys.at(-1)! : null, area, corners: points.length };
}

/** Measuring result as one line: straight line, walking distance, height, Nether distance, area. */
export function measureText(points: readonly XZ[], groundAt?: Ground): string {
  const m = measureSummary(points, groundAt);
  if (m.corners < 2) return '';
  const parts = [`${fmt(m.length)} Blöcke Luftlinie`, `${fmt(m.walk)} zu Fuß (ΔX ${m.dx}, ΔZ ${m.dz})`];
  if (m.corners > 2) parts.push(`${m.corners} Punkte`);
  if (m.yStart !== null && m.yEnd !== null) parts.push(m.corners > 2 && (m.climb || m.descent)
    ? `Höhe ${m.yStart} → ${m.yEnd} (↑${m.climb} ↓${m.descent})` : `Höhe ${m.yStart} → ${m.yEnd} (${m.yEnd - m.yStart >= 0 ? '+' : ''}${m.yEnd - m.yStart})`);
  parts.push(`${fmt(round1(m.length / 8))} Blöcke im Nether`);
  if (m.area !== null) parts.push(`Fläche ≈ ${fmt(m.area)} Blöcke²`);
  return parts.join(' · ');
}

// ------------------------------------------------------------------ profiles

/** Columns of a centre line in walking order (four-connected, no duplicates in a row). */
export function lineColumns(points: readonly XZ[], limit = 200_000): [number, number][] {
  const out: [number, number][] = [];
  const add = (x: number, z: number) => {
    const last = out.at(-1);
    if (last && last[0] === x && last[1] === z) return;
    if (out.length >= limit) fail(`Linie zu lang (über ${limit} Spalten)`);
    out.push([x, z]);
  };
  for (let i = 0; i + 1 < points.length; i++) {
    let [x, z] = points[i]!; const [x1, z1] = points[i + 1]!;
    const dx = Math.abs(x1 - x), dz = Math.abs(z1 - z), sx = x < x1 ? 1 : -1, sz = z < z1 ? 1 : -1;
    add(x, z);
    for (let ix = 0, iz = 0; ix < dx || iz < dz;) {
      if ((0.5 + ix) / dx < (0.5 + iz) / dz) { x += sx; ix++; } else { z += sz; iz++; }
      add(x, z);
    }
  }
  if (points.length === 1) add(points[0]![0], points[0]![1]);
  return out;
}

export interface PathProfile {
  /** Surface height per column of the centre line, null where unknown. */
  readonly samples: readonly (number | null)[];
  readonly columns: number;
  readonly known: number;
  readonly unknown: number;
  readonly yMin: number | null;
  readonly yMax: number | null;
  readonly climb: number;
  readonly descent: number;
  /** Largest step between two neighbouring known columns. */
  readonly maxStep: number;
  /** Steps of two or more blocks (a player cannot walk them without stairs). */
  readonly steep: number;
  /** Columns on water or lava. */
  readonly water: number;
}

const isWater = (id?: string) => !!id && /(^|:)(water|lava|bubble_column)$/.test(id);

/** Height profile of a path along its centre line from the known ground. */
export function pathProfile(points: readonly XZ[], groundAt: Ground): PathProfile {
  const cols = lineColumns(points);
  const samples: (number | null)[] = [];
  let known = 0, water = 0, yMin = Infinity, yMax = -Infinity;
  for (const [x, z] of cols) {
    const g = groundAt(x, z);
    if (!g) { samples.push(null); continue; }
    samples.push(g.y); known++; yMin = Math.min(yMin, g.y); yMax = Math.max(yMax, g.y);
    if (isWater(g.id)) water++;
  }
  let climb = 0, descent = 0, maxStep = 0, steep = 0, prev: number | null = null;
  for (const y of samples) {
    if (y === null) { prev = null; continue; }
    if (prev !== null) { const d = y - prev; if (d > 0) climb += d; else descent -= d; maxStep = Math.max(maxStep, Math.abs(d)); if (Math.abs(d) >= 2) steep++; }
    prev = y;
  }
  return { samples, columns: cols.length, known, unknown: cols.length - known, yMin: known ? yMin : null, yMax: known ? yMax : null, climb, descent, maxStep, steep, water };
}

// ------------------------------------------------------------------ routes

export interface RouteOptions {
  /** Largest step up or down between two columns a route may take (default 1 = walkable without stairs). */
  readonly maxStep?: number;
  /** Extra cost per block of height change (default 2). */
  readonly slopeCost?: number;
  /** Extra cost per column on water (default 6); lava is never crossed. */
  readonly waterCost?: number;
  /** Columns without known ground: null = impassable (default), a number = extra cost per column. */
  readonly unknownCost?: number | null;
  /** Search area around the straight line in blocks (default: half the distance, at least 24). */
  readonly margin?: number;
  /** Upper bound of visited columns (default 400 000). */
  readonly maxNodes?: number;
}

export interface RouteResult {
  readonly columns: readonly [number, number][];
  /** Corners of the route (simplified), at most `WORLD_PATH_MAX_POINTS`. */
  readonly points: readonly [number, number][];
  readonly cost: number;
  readonly visited: number;
}

/**
 * A* on the block grid (four-connected, so the result is walkable) from one
 * column to another over the known terrain, preferring flat ground and dry
 * land. Returns null when no route exists within the limits (unknown ground,
 * walls of steep slopes, lava) – the caller tells the player why.
 */
export function routeOverTerrain(from: XZ, to: XZ, groundAt: Ground, opts: RouteOptions = {}): RouteResult | null {
  const maxStep = opts.maxStep ?? 1, slopeCost = opts.slopeCost ?? 2, waterCost = opts.waterCost ?? 6, unknownCost = opts.unknownCost ?? null;
  const dist = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const margin = Math.max(24, opts.margin ?? Math.ceil(dist / 2));
  const x0 = Math.min(from[0], to[0]) - margin, x1 = Math.max(from[0], to[0]) + margin, z0 = Math.min(from[1], to[1]) - margin, z1 = Math.max(from[1], to[1]) + margin;
  const W = x1 - x0 + 1, H = z1 - z0 + 1;
  if (W * H > 16_000_000) fail('Route zu weit – lege Zwischenpunkte an');
  const maxNodes = opts.maxNodes ?? 400_000;
  const key = (x: number, z: number) => (z - z0) * W + (x - x0);
  const cell = (x: number, z: number): { y: number | null; water: boolean; lava: boolean } => {
    const g = groundAt(x, z);
    if (!g) return { y: null, water: false, lava: false };
    return { y: g.y, water: isWater(g.id) && !/lava$/.test(g.id ?? ''), lava: /lava$/.test(g.id ?? '') };
  };
  const start = cell(from[0], from[1]), goal = cell(to[0], to[1]);
  if (unknownCost === null && (start.y === null || goal.y === null)) return null;
  const g = new Float64Array(W * H).fill(Infinity), cameFrom = new Int32Array(W * H).fill(-1);
  const closed = new Uint8Array(W * H);
  // Binary heap of [f, index].
  const heapF: number[] = [], heapI: number[] = [];
  const push = (f: number, i: number) => {
    heapF.push(f); heapI.push(i);
    let k = heapF.length - 1;
    while (k > 0) { const p = (k - 1) >> 1; if (heapF[p]! <= heapF[k]!) break; [heapF[p], heapF[k]] = [heapF[k]!, heapF[p]!]; [heapI[p], heapI[k]] = [heapI[k]!, heapI[p]!]; k = p; }
  };
  const pop = (): number => {
    const top = heapI[0]!, lf = heapF.pop()!, li = heapI.pop()!;
    if (heapF.length) {
      heapF[0] = lf; heapI[0] = li;
      let k = 0;
      for (;;) {
        const a = 2 * k + 1, b = a + 1; let m = k;
        if (a < heapF.length && heapF[a]! < heapF[m]!) m = a;
        if (b < heapF.length && heapF[b]! < heapF[m]!) m = b;
        if (m === k) break;
        [heapF[m], heapF[k]] = [heapF[k]!, heapF[m]!]; [heapI[m], heapI[k]] = [heapI[k]!, heapI[m]!]; k = m;
      }
    }
    return top;
  };
  const h = (x: number, z: number) => Math.abs(x - to[0]) + Math.abs(z - to[1]);
  const si = key(from[0], from[1]), gi = key(to[0], to[1]);
  g[si] = 0; push(h(from[0], from[1]), si);
  let visited = 0;
  const heights = new Map<number, { y: number | null; water: boolean; lava: boolean }>();
  const at = (i: number) => { let c = heights.get(i); if (!c) { c = cell(x0 + (i % W), z0 + Math.floor(i / W)); heights.set(i, c); } return c; };
  while (heapF.length) {
    const i = pop();
    if (closed[i]) continue;
    closed[i] = 1; visited++;
    if (i === gi) break;
    if (visited > maxNodes) return null;
    const x = x0 + (i % W), z = z0 + Math.floor(i / W), here = at(i);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx, nz = z + dz;
      if (nx < x0 || nx > x1 || nz < z0 || nz > z1) continue;
      const j = key(nx, nz);
      if (closed[j]) continue;
      const n = at(j);
      if (n.lava) continue;
      let step = 1;
      if (n.y === null || here.y === null) { if (unknownCost === null) continue; step += unknownCost; }
      else { const d = Math.abs(n.y - here.y); if (d > maxStep) continue; step += d * slopeCost; }
      if (n.water) step += waterCost;
      const ng = g[i]! + step;
      if (ng < g[j]!) { g[j] = ng; cameFrom[j] = i; push(ng + h(nx, nz), j); }
    }
  }
  if (!closed[gi]) return null;
  const columns: [number, number][] = [];
  for (let i = gi; i >= 0; i = cameFrom[i]!) { columns.push([x0 + (i % W), z0 + Math.floor(i / W)]); if (i === si) break; }
  columns.reverse();
  return { columns, points: simplifyLine(columns, WORLD_PATH_MAX_POINTS), cost: g[gi]!, visited };
}

/** Removes columns on straight runs; if still too many corners, Douglas–Peucker with a growing tolerance. */
export function simplifyLine(columns: readonly XZ[], maxPoints = WORLD_PATH_MAX_POINTS): [number, number][] {
  if (columns.length <= 2) return columns.map(c => [c[0], c[1]]);
  let pts: [number, number][] = [[columns[0]![0], columns[0]![1]]];
  for (let i = 1; i + 1 < columns.length; i++) {
    const a = columns[i - 1]!, b = columns[i]!, c = columns[i + 1]!;
    if ((b[0] - a[0]) * (c[1] - b[1]) !== (b[1] - a[1]) * (c[0] - b[0])) pts.push([b[0], b[1]]);
  }
  pts.push([columns.at(-1)![0], columns.at(-1)![1]]);
  for (let eps = 0.75; pts.length > maxPoints && eps < 1e6; eps *= 1.6) pts = douglasPeucker(pts, eps);
  return pts;
}

function douglasPeucker(pts: readonly XZ[], eps: number): [number, number][] {
  if (pts.length <= 2) return pts.map(p => [p[0], p[1]]);
  const a = pts[0]!, b = pts.at(-1)!;
  let worst = 0, index = -1;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  for (let i = 1; i + 1 < pts.length; i++) {
    const p = pts[i]!;
    const d = len ? Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / len : Math.hypot(p[0] - a[0], p[1] - a[1]);
    if (d > worst) { worst = d; index = i; }
  }
  if (worst <= eps || index < 0) return [[a[0], a[1]], [b[0], b[1]]];
  const left = douglasPeucker(pts.slice(0, index + 1), eps), right = douglasPeucker(pts.slice(index), eps);
  return [...left.slice(0, -1), ...right];
}

/** Re-routes a path over the terrain between its corners; every user corner stays a waypoint. Null when a leg has no route. */
export function routePath(path: WorldPath, groundAt: Ground, opts: RouteOptions = {}): { path: WorldPath; legs: number; failed: number } | null {
  const pts: [number, number][] = [];
  let failed = 0, legs = 0;
  for (let i = 0; i + 1 < path.points.length; i++) {
    const a = path.points[i]!, b = path.points[i + 1]!;
    const r = routeOverTerrain(a, b, groundAt, opts);
    legs++;
    const leg = r ? r.points : [[a[0], a[1]], [b[0], b[1]]] as [number, number][];
    if (!r) failed++;
    for (const p of pts.length ? leg.slice(1) : leg) pts.push(p);
  }
  if (failed === legs) return null;
  return { path: { ...path, points: simplifyLine(pts, WORLD_PATH_MAX_POINTS) }, legs, failed };
}

/** The player's trail (fractional positions) as a path: whole columns, straight runs merged, at most 256 corners. */
export function trailToPath(trail: readonly { readonly x: number; readonly z: number }[], base: Omit<WorldPath, 'points'>): WorldPath | null {
  const cols: [number, number][] = [];
  for (const t of trail) {
    const c: [number, number] = [Math.floor(t.x), Math.floor(t.z)];
    const last = cols.at(-1);
    if (!last || last[0] !== c[0] || last[1] !== c[1]) cols.push(c);
  }
  if (cols.length < 2) return null;
  const points = simplifyLine(cols, WORLD_PATH_MAX_POINTS);
  if (pathLength(points) < 1) return null;
  return { ...base, points };
}
