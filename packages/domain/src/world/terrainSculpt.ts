import { DomainError } from '../core/types.js';
import { stableHypot, stableCos } from '../../../voxel/src/stableMath.js';
import { SURVEY_UNKNOWN } from './terrainSurvey.js';
import type { ColumnBase } from './terrainSurvey.js';
import { NO_WATER, columnHash, columnPasses, heightLimits, paintColumn, pathLine, setHeight, styleById, valueNoise } from './terrainDesign.js';
import type { PaintFilter, TerrainDesign } from './terrainDesign.js';

/**
 * Gelände-Werkzeuge auf dem Projektgelände (TERRAIN-05), on top of the
 * Geländegestaltung (TERRAIN-02/03):
 *
 * - Verwittern (`erodeTerrain`): thermal erosion moves earth from columns that
 *   stand more than the slope limit above a neighbour down to that neighbour,
 *   rain droplets wash shallow gullies down the slopes and leave the earth at
 *   the foot. Mass-conserving (what comes off a slope lands below it).
 * - Formstempel (`stampShape`): hill, mountain, crater, hollow and plateau with
 *   size and height in one click.
 * - Fluss (`carveRiver`): a river bed along a line, with a water surface that
 *   never rises downstream, banks that slope into the terrain or embank low
 *   ground, and a gravel or sand bed.
 * - Maske (`footprintMask`): columns of the planned buildings (plus a margin)
 *   that every tool leaves alone.
 *
 * Everything is deterministic (same input, same result), never touches
 * unknown columns and never writes outside the world height limits.
 */

const fail = (message: string): never => { throw new DomainError('VALIDATION_ERROR', message); };
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

/** Where a tool works: the whole design or a circle (world column, radius). */
export interface SculptRegion { readonly x: number; readonly z: number; readonly radius: number }

/** Common limits of the sculpt tools. */
export interface SculptMask {
  /** Columns with a non-zero entry stay as they are. */
  readonly protect?: Uint8Array;
  /** Only columns that pass (height, slope, dry). */
  readonly filter?: PaintFilter;
}

const editable = (d: TerrainDesign, x: number, z: number, m: SculptMask): boolean => {
  const i = x + z * d.width;
  return d.height[i] !== SURVEY_UNKNOWN && !m.protect?.[i] && (!m.filter || columnPasses(d, x, z, m.filter));
};

/** Grid box of a region (or the whole design). */
function regionBox(d: TerrainDesign, r: SculptRegion | undefined): [number, number, number, number] | null {
  if (!r) return [0, 0, d.width - 1, d.length - 1];
  const radius = Math.max(0, Math.min(64, Math.round(r.radius))), gx = r.x - d.minX, gz = r.z - d.minZ;
  const x0 = Math.max(0, gx - radius), x1 = Math.min(d.width - 1, gx + radius), z0 = Math.max(0, gz - radius), z1 = Math.min(d.length - 1, gz + radius);
  return x0 > x1 || z0 > z1 ? null : [x0, z0, x1, z1];
}

const inRegion = (d: TerrainDesign, r: SculptRegion | undefined, x: number, z: number): boolean =>
  !r || stableHypot(x - (r.x - d.minX), z - (r.z - d.minZ)) <= Math.max(0, Math.min(64, Math.round(r.radius))) + 0.5;

// ------------------------------------------------------------------ Verwittern

export type RainAmount = 0 | 1 | 2 | 3;
export const RAIN_LABEL: Readonly<Record<RainAmount, string>> = { 0: 'kein Regen', 1: 'wenig Regen', 2: 'Regen', 3: 'starker Regen' };

export interface ErodeOptions extends SculptMask {
  /** Rounds of thermal erosion (1–32). */
  readonly passes: number;
  /** Highest step that stays (1–8): steeper steps crumble. Default 1. */
  readonly talus?: number;
  /** Rain droplets that wash gullies (0 none … 3 strong). Default 0. */
  readonly rain?: RainAmount;
  /** Only inside this circle (brush); absent = the whole design. */
  readonly region?: SculptRegion;
  /** Seed of the droplets (default 0). */
  readonly seed?: number;
}

export interface ErodeReport {
  /** Columns whose height changed. */
  readonly columns: number;
  /** Blocks of earth moved downhill. */
  readonly moved: number;
  /** Droplets that washed earth away. */
  readonly gullies: number;
}

/**
 * Verwittern: steep steps crumble down to their lowest neighbour (talus), rain
 * washes gullies. Path columns and water columns are kept; earth only moves
 * between columns that may be edited, so the total volume stays the same.
 */
export function erodeTerrain(d: TerrainDesign, o: ErodeOptions): ErodeReport {
  const box = regionBox(d, o.region);
  if (!box) return { columns: 0, moved: 0, gullies: 0 };
  const passes = Math.max(1, Math.min(32, Math.round(o.passes))), talus = Math.max(1, Math.min(8, Math.round(o.talus ?? 1)));
  const rain = (Math.max(0, Math.min(3, Math.round(o.rain ?? 0))) as RainAmount);
  const lim = heightLimits(d.dimension);
  const [x0, z0, x1, z1] = box;
  const before = d.height.slice();
  // Which columns take part: known, not protected, in the mask and region, no path, no water.
  const live = new Uint8Array(d.width * d.length);
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    const i = x + z * d.width;
    if (inRegion(d, o.region, x, z) && editable(d, x, z, o) && !d.path[i] && d.water[i] === NO_WATER) live[i] = 1;
  }
  let moved = 0;
  const move = (from: number, to: number, k: number) => {
    const a = d.height[from]! - k, b = d.height[to]! + k;
    if (a < lim[0] || b > lim[1]) return false;
    d.height[from] = a; d.height[to] = b; moved += k;
    return true;
  };
  for (let pass = 0; pass < passes; pass++) {
    let any = false;
    // Alternating scan directions keep the result free of a drift towards one side.
    const fwd = pass % 2 === 0;
    for (let zz = z0; zz <= z1; zz++) for (let xx = x0; xx <= x1; xx++) {
      const x = fwd ? xx : x1 - (xx - x0), z = fwd ? zz : z1 - (zz - z0), i = x + z * d.width;
      if (!live[i]) continue;
      let low = -1, lowH = d.height[i]!;
      for (const [dx, dz] of N4) {
        const nx = x + dx, nz = z + dz;
        if (nx < x0 || nz < z0 || nx > x1 || nz > z1) continue;
        const j = nx + nz * d.width;
        if (live[j] && d.height[j]! < lowH) { lowH = d.height[j]!; low = j; }
      }
      const diff = d.height[i]! - lowH;
      if (low < 0 || diff <= talus) continue;
      if (move(i, low, Math.floor((diff - talus + 1) / 2))) any = true;
    }
    if (!any) break;
  }
  // Rain: droplets start on a deterministic grid, run down the steepest way, take one block off each
  // steep step (up to their load) and drop it where they come to rest.
  let gullies = 0;
  if (rain > 0) {
    const spacing = [0, 6, 4, 3][rain]!, steps = 48, capacity = rain + 1, seed = o.seed ?? 0;
    for (let sz = z0; sz <= z1; sz += spacing) for (let sx = x0; sx <= x1; sx += spacing) {
      const jx = Math.min(x1, sx + Math.floor(columnHash(d.minX + sx, d.minZ + sz, 31 + seed) * spacing));
      const jz = Math.min(z1, sz + Math.floor(columnHash(d.minX + sx, d.minZ + sz, 37 + seed) * spacing));
      let i = jx + jz * d.width;
      if (!live[i]) continue;
      let load = 0, took = false;
      for (let k = 0; k < steps; k++) {
        const x = i % d.width, z = (i - x) / d.width;
        let next = -1, nextH = d.height[i]!;
        for (const [dx, dz] of N4) {
          const nx = x + dx, nz = z + dz;
          if (nx < x0 || nz < z0 || nx > x1 || nz > z1) continue;
          const j = nx + nz * d.width;
          if (live[j] && d.height[j]! < nextH) { nextH = d.height[j]!; next = j; }
        }
        if (next < 0) break;
        // A step of two or more blocks loses one block to the droplet.
        if (d.height[i]! - nextH >= 2 && load < capacity && d.height[i]! - 1 >= lim[0]) { d.height[i] = d.height[i]! - 1; load++; took = true; }
        i = next;
      }
      // Rest: the earth settles here, spread to the lowest neighbours so it does not pile into a needle.
      while (load > 0) {
        const x = i % d.width, z = (i - x) / d.width;
        let target = i, tH = d.height[i]!;
        for (const [dx, dz] of N4) {
          const nx = x + dx, nz = z + dz;
          if (nx < x0 || nz < z0 || nx > x1 || nz > z1) continue;
          const j = nx + nz * d.width;
          if (live[j] && d.height[j]! < tH) { tH = d.height[j]!; target = j; }
        }
        if (d.height[target]! + 1 > lim[1]) break;
        d.height[target] = d.height[target]! + 1; load--; moved++;
      }
      if (took) gullies++;
    }
  }
  let columns = 0;
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { const i = x + z * d.width; if (d.height[i] !== before[i]) columns++; }
  if (columns) d.updatedAt = new Date().toISOString();
  return { columns, moved, gullies };
}

// ------------------------------------------------------------------ Formstempel

export type StampShape = 'huegel' | 'berg' | 'krater' | 'mulde' | 'plateau';
export const STAMP_LABEL: Readonly<Record<StampShape, string>> = { huegel: 'Hügel', berg: 'Berg', krater: 'Krater', mulde: 'Mulde', plateau: 'Plateau' };

export interface StampOptions extends SculptMask {
  readonly shape: StampShape;
  /** Radius in blocks (2–64). */
  readonly radius: number;
  /** Height of the shape in blocks (1–128): rise of hill, mountain and plateau, depth of hollow and crater. */
  readonly height: number;
  /** Seed of the mountain ridges (default 0). */
  readonly seed?: number;
}

export interface StampReport { readonly columns: number; readonly cut: number; readonly fill: number; readonly peakY: number | null }

/** Profile of a shape at relative distance t (0 centre … 1 rim): height change in units of `height`. */
function profile(shape: StampShape, t: number, noise: number): number {
  const bell = 0.5 * (1 + stableCos(Math.PI * Math.min(1, t)));
  switch (shape) {
    case 'huegel': return bell;
    case 'mulde': return -bell;
    case 'berg': return Math.pow(Math.max(0, 1 - t), 1.6) * (0.8 + 0.4 * noise);
    case 'krater': {
      // Bowl inside (down to −0.7), rim at t≈0.8 (+0.3), falls off to 0 at the edge.
      if (t < 0.8) { const u = t / 0.8; return -0.7 + u * u; }
      const u = (t - 0.8) / 0.2; return 0.3 * 0.5 * (1 + stableCos(Math.PI * u));
    }
    case 'plateau': return 1;
  }
}

/**
 * Stamps a shape at world column (cx, cz). Hill, mountain, hollow and crater
 * add to the ground that is there (so a hill on a slope stays a slope with a
 * hill); a plateau levels everything to the centre height plus `height` with a
 * smooth flank that ends at the rim.
 */
export function stampShape(d: TerrainDesign, cx: number, cz: number, o: StampOptions): StampReport {
  const radius = Math.max(2, Math.min(64, Math.round(o.radius))), height = Math.max(1, Math.min(128, Math.round(o.height)));
  if (!(o.shape in STAMP_LABEL)) fail(`unbekannte Form ${String(o.shape)}`);
  const lim = heightLimits(d.dimension), gx = cx - d.minX, gz = cz - d.minZ;
  const box = regionBox(d, { x: cx, z: cz, radius });
  if (!box) return { columns: 0, cut: 0, fill: 0, peakY: null };
  const centre = gx >= 0 && gz >= 0 && gx < d.width && gz < d.length ? d.height[gx + gz * d.width]! : SURVEY_UNKNOWN;
  if (o.shape === 'plateau' && centre === SURVEY_UNKNOWN) fail('Die Mitte des Plateaus liegt auf unbekanntem Gelände');
  const top = centre + height, seed = o.seed ?? 0;
  const [x0, z0, x1, z1] = box;
  let columns = 0, cut = 0, fill = 0, peak: number | null = null;
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    const dist = stableHypot(x - gx, z - gz);
    if (dist > radius + 0.5 || !editable(d, x, z, o)) continue;
    const i = x + z * d.width, h = d.height[i]!, t = dist / (radius + 0.5);
    let next: number;
    if (o.shape === 'plateau') {
      // Flat top inside 60 %, smooth flank outside down to the ground at the rim.
      const w = t <= 0.6 ? 1 : 0.5 * (1 + stableCos(Math.PI * (t - 0.6) / 0.4));
      next = h + (top - h) * w;
    } else {
      const noise = o.shape === 'berg' ? valueNoise(d.minX + x, d.minZ + z, Math.max(3, radius / 3), 53 + seed) : 0;
      next = h + profile(o.shape, t, noise) * height;
    }
    if (!setHeight(d, i, next, lim)) continue;
    const now = d.height[i]!;
    if (now > h) fill += now - h; else cut += h - now;
    columns++;
    if (peak === null || now > peak) peak = now;
  }
  if (columns) d.updatedAt = new Date().toISOString();
  return { columns, cut, fill, peakY: peak };
}

// ------------------------------------------------------------------ Fluss

export type RiverBed = 'kies' | 'sand' | 'lehm';
export const RIVER_BED_LABEL: Readonly<Record<RiverBed, string>> = { kies: 'Kies', sand: 'Sand', lehm: 'Lehm' };
const BED_STYLE: Readonly<Record<RiverBed, string>> = { kies: 'geroell', sand: 'strand', lehm: 'lehm' };

export interface RiverOptions extends SculptMask {
  /** Water width in blocks (1–31). */
  readonly width: number;
  /** Depth in the middle (1–8); the bed rises towards the banks. */
  readonly depth: number;
  /** Bank columns on each side that slope into the terrain (0–16). Default 2. */
  readonly bank?: number;
  readonly bed?: RiverBed;
  /** Water surface at the start; absent = the lowest ground around the start. */
  readonly startY?: number;
}

export interface RiverReport {
  readonly length: number;
  /** Water surface at the start and at the end (never higher than at the start). */
  readonly fromY: number;
  readonly toY: number;
  /** Columns with water, water blocks. */
  readonly columns: number;
  readonly water: number;
  /** Bank columns shaped; columns raised to hold the water (embankment). */
  readonly banks: number;
  readonly embanked: number;
  readonly cut: number;
  readonly fill: number;
  /** Line cells over unknown terrain (skipped). */
  readonly unknown: number;
}

/**
 * A river along a polyline (world columns, in flow direction). The water
 * surface follows the lowest ground beside the line and never rises
 * downstream; the bed lies `depth` below it in the middle and rises to one
 * block at the edge; banks slope one block per block into higher ground and
 * low ground beside the water is raised to the water surface so the river
 * stays in its bed. Paths crossing the river are cut (their pieces cleared).
 */
export function carveRiver(d: TerrainDesign, points: readonly (readonly [number, number])[], o: RiverOptions): RiverReport {
  if (points.length < 2) fail('Ein Fluss braucht mindestens zwei Punkte');
  const width = Math.max(1, Math.min(31, Math.round(o.width))), depth = Math.max(1, Math.min(8, Math.round(o.depth)));
  const bank = Math.max(0, Math.min(16, Math.round(o.bank ?? 2))), half = (width - 1) / 2, reach = Math.ceil(half + bank + 1);
  const lim = heightLimits(d.dimension), style = styleById(BED_STYLE[o.bed ?? 'kies']);
  const line = pathLine(points);
  const n = d.width * d.length, orig = d.height.slice();
  // Nearest line cell (and its distance) for every column near the line.
  const near = new Int32Array(n).fill(-1), dist = new Float32Array(n).fill(Infinity);
  const inside = (gx: number, gz: number) => gx >= 0 && gz >= 0 && gx < d.width && gz < d.length;
  line.forEach(([lx, lz], k) => {
    const gx = lx - d.minX, gz = lz - d.minZ;
    for (let z = gz - reach; z <= gz + reach; z++) for (let x = gx - reach; x <= gx + reach; x++) {
      if (!inside(x, z)) continue;
      const i = x + z * d.width, dd = stableHypot(x - gx, z - gz);
      if (dd < dist[i]!) { dist[i] = dd; near[i] = k; }
    }
  });
  // Water surface per line cell: the lowest known ground within the water width (+1), never rising downstream.
  const level = new Int32Array(line.length);
  let unknown = 0, prev = o.startY ?? Number.POSITIVE_INFINITY;
  if (o.startY !== undefined && (o.startY < lim[0] || o.startY > lim[1])) fail(`Wasserspiegel muss zwischen Y ${lim[0]} und ${lim[1]} liegen`);
  line.forEach(([lx, lz], k) => {
    const gx = lx - d.minX, gz = lz - d.minZ, r = Math.ceil(half + 1);
    let low = Number.POSITIVE_INFINITY;
    for (let z = gz - r; z <= gz + r; z++) for (let x = gx - r; x <= gx + r; x++) {
      if (!inside(x, z) || stableHypot(x - gx, z - gz) > half + 1.5) continue;
      const h = orig[x + z * d.width]!;
      if (h !== SURVEY_UNKNOWN) low = Math.min(low, h);
    }
    if (low === Number.POSITIVE_INFINITY || !inside(gx, gz) || orig[gx + gz * d.width] === SURVEY_UNKNOWN) unknown++;
    prev = Math.min(prev, low);
    level[k] = prev === Number.POSITIVE_INFINITY ? SURVEY_UNKNOWN : Math.max(lim[0] + depth + 1, Math.min(lim[1], prev));
  });
  // Cells before the first known cell take the first known level.
  const firstKnown = level.findIndex(v => v !== SURVEY_UNKNOWN);
  if (firstKnown < 0) fail('Der Fluss liegt ganz auf unbekanntem Gelände');
  for (let k = 0; k < firstKnown; k++) level[k] = level[firstKnown]!;
  let columns = 0, water = 0, banks = 0, embanked = 0, cut = 0, fill = 0;
  for (let i = 0; i < n; i++) {
    const k = near[i]!;
    if (k < 0 || orig[i] === SURVEY_UNKNOWN) continue;
    const x = i % d.width, z = (i - x) / d.width;
    if (!editable(d, x, z, o)) continue;
    const s = level[k]!, dd = dist[i]!, h = orig[i]!;
    if (dd <= half + 0.5) {
      // Bed: `depth` in the middle, at least one block at the edge.
      const rel = half > 0 ? dd / (half + 0.5) : 0;
      const bed = s - Math.max(1, Math.round(depth * (1 - rel * rel)));
      setHeight(d, i, Math.min(h, bed), lim);
      const now = d.height[i]!;
      cut += h - now;
      d.water[i] = s; water += s - now; columns++;
      paintColumn(d, i, style);
      if (d.path[i]) { d.path[i] = 0; d.step[i] = 0; }
    } else if (dd <= half + bank + 0.5) {
      // Bank: higher ground slopes down one block per block to the water; lower ground is raised to hold it.
      const target = s + Math.max(0, Math.round(dd - half - 0.5));
      if (h > target) { if (setHeight(d, i, target, lim)) { cut += h - d.height[i]!; banks++; } }
      else if (h < s) { if (setHeight(d, i, s, lim)) { fill += d.height[i]! - h; embanked++; } }
      if (d.water[i] !== NO_WATER && d.water[i]! <= d.height[i]!) d.water[i] = NO_WATER;
    }
  }
  if (columns || banks || embanked) d.updatedAt = new Date().toISOString();
  const known = Array.from(level).filter(v => v !== SURVEY_UNKNOWN);
  return { length: line.length, fromY: known[0]!, toY: known.at(-1)!, columns, water, banks, embanked, cut, fill, unknown };
}

// ------------------------------------------------------------------ Maske

/**
 * Columns of the planned buildings plus `margin` columns around them, as a
 * protect mask for the tools: the graded building sites stay as they are.
 */
export function footprintMask(d: TerrainDesign, bases: readonly ColumnBase[], margin = 1): Uint8Array {
  const m = Math.max(0, Math.min(16, Math.round(margin)));
  const mask = new Uint8Array(d.width * d.length);
  for (const b of bases) {
    const gx = b.x - d.minX, gz = b.z - d.minZ;
    for (let z = gz - m; z <= gz + m; z++) for (let x = gx - m; x <= gx + m; x++)
      if (x >= 0 && z >= 0 && x < d.width && z < d.length) mask[x + z * d.width] = 1;
  }
  return mask;
}

/** Number of columns a mask protects. */
export const maskCount = (mask: Uint8Array): number => { let c = 0; for (const v of mask) if (v) c++; return c; };
