import type { Vec3 } from '../../../voxel/src/types.js';
import { transformCellPosition } from '../../../voxel/src/transforms.js';
import type { AnlagePlacement, AnlagePlan } from './anlagen.js';
import { estimateEarthwork, columnAt } from '../world/terrainSurvey.js';
import type { ColumnBase, EarthworkEstimate, TerrainSurvey } from '../world/terrainSurvey.js';
import { DomainError } from '../core/types.js';
import type { AssetVersion } from '../core/types.js';

/**
 * Anlagen auf echtem Gelände (TERRAIN-01). A planned Anlage is fitted to a
 * stored terrain survey of the target project's building site:
 *
 *  - `terrassen` (Hanglage): every unit gets its own height so its base layer
 *    sits on the median ground under its footprint. A unit is one building,
 *    one embedded ensemble (its curated layout keeps one level) or the whole
 *    main path (its modules share one level so their joints still mate).
 *  - `eben`: the whole Anlage on one level (median ground of everything).
 *
 * The fit only proposes heights; the earthwork per unit (fill under hanging
 * base columns, cut where the ground reaches into the plan, water) is an
 * estimate from the height map. Nothing in the world or the project changes
 * until the Anlage is adopted, and the exact check stays with the terrain
 * tab. Pure and deterministic.
 */

export type TerrainMode = 'terrassen' | 'eben';
export const TERRAIN_MODE_LABEL: Readonly<Record<TerrainMode, string>> = { terrassen: 'Terrassen (Hanglage)', eben: 'Eine Ebene' };
/** Height difference to the path from which a unit needs steps or a ramp. */
export const STEP_LIMIT = 1;
/** Ground variation under one unit that is called a slope. */
export const SLOPE_LIMIT = 4;

export interface AnlageTerrainInput {
  readonly survey: TerrainSurvey;
  /** World origin of the target project (`project.world.origin`). */
  readonly origin: Vec3;
  /** Offset of the Anlage inside the project (x, z), as for previewAnlage. */
  readonly offset?: readonly [number, number];
  readonly mode?: TerrainMode;
}

export interface UnitTerrain {
  /** Unit id: placement key, `ensemble:<district>:<id>` or `weg`. */
  readonly id: string;
  readonly name: string;
  readonly kind: 'building' | 'ensemble' | 'path';
  readonly keys: readonly string[];
  /** Project Y shift applied to the unit's placements. */
  readonly dy: number;
  /** World Y of the unit's base layer after the shift. */
  readonly baseY: number;
  readonly estimate: EarthworkEstimate;
  /** Base height minus path height; null without path. */
  readonly stepToPath: number | null;
  /** Ground variation under the unit (max − min); null without known ground. */
  readonly slope: number | null;
}

export interface AnlageTerrainFit {
  readonly mode: TerrainMode;
  readonly units: readonly UnitTerrain[];
  /** Placement key → project Y shift (input for previewAnlage `heights`). */
  readonly heights: ReadonlyMap<string, number>;
  /** World Y of the path's base layer; null without path. */
  readonly pathY: number | null;
  readonly totals: { readonly fill: number; readonly cut: number; readonly water: number; readonly unknown: number; readonly columns: number; readonly hanging: number; readonly buried: number };
  /** Every footprint column lies in the survey and is known. */
  readonly complete: boolean;
  readonly notes: readonly string[];
}

const fail = (message: string): never => { throw new DomainError('ANLAGE', `Anlage auf Gelände: ${message}`); };

/** Lowest block per column of a version under a transform without its position (cached). */
const baseCache = new WeakMap<AssetVersion, Map<string, readonly [number, number, number][]>>();
function versionBases(version: AssetVersion, turns: 0 | 1 | 2 | 3, mirrorX: boolean): readonly [number, number, number][] {
  let byT = baseCache.get(version);
  if (!byT) { byT = new Map(); baseCache.set(version, byT); }
  const key = `${turns}:${mirrorX}`;
  const hit = byT.get(key);
  if (hit) return hit;
  const p = version.payload, t = { position: [0, 0, 0] as Vec3, quarterTurns: turns, mirrorX };
  const low = new Map<string, [number, number, number]>();
  for (const c of p.cells) {
    if (c.kind !== 'block') continue;
    const [x, y, z] = transformCellPosition(c.position, p.pivot, t), k = `${x},${z}`, before = low.get(k);
    if (!before || y < before[1]) low.set(k, [x, y, z]);
  }
  const out = [...low.values()];
  byT.set(key, out);
  return out;
}

/** Base columns of one placement in world coordinates (before a height shift). */
export function placementColumns(p: Pick<AnlagePlacement, 'version' | 'transform'>, origin: Vec3, offset: readonly [number, number]): ColumnBase[] {
  const [px, py, pz] = p.transform.position;
  return versionBases(p.version, p.transform.quarterTurns, p.transform.mirrorX).map(([x, y, z]) => ({ x: x + px + offset[0] + origin[0], y: y + py + origin[1], z: z + pz + offset[1] + origin[2] }));
}

interface Unit { id: string; name: string; kind: UnitTerrain['kind']; placements: AnlagePlacement[] }
function unitsOf(plan: AnlagePlan): Unit[] {
  const units = new Map<string, Unit>();
  for (const p of plan.placements) {
    const id = p.kind === 'path' ? 'weg' : p.ensembleId ? `ensemble:${p.districtId}:${p.ensembleId}` : p.key;
    let u = units.get(id);
    if (!u) {
      const district = plan.anlage.districts.find(d => d.id === p.districtId);
      u = { id, kind: p.kind === 'path' ? 'path' : p.ensembleId ? 'ensemble' : 'building', placements: [],
        name: p.kind === 'path' ? 'Hauptweg' : p.ensembleId ? `${district?.name ?? p.districtId} (Ensemble)` : p.name };
      units.set(id, u);
    }
    u.placements.push(p);
  }
  return [...units.values()];
}

/** Median of known ground under columns; null when none is known. */
function medianGround(columns: readonly ColumnBase[], s: TerrainSurvey): number | null {
  const g: number[] = [];
  for (const c of columns) { const col = columnAt(s, c.x, c.z); if (col && col.groundId !== '?') g.push(col.ground); }
  if (!g.length) return null;
  g.sort((a, b) => a - b);
  return g[Math.floor(g.length / 2)]!;
}

/** Fits a plan to a survey: heights per unit plus the earthwork estimate. */
export function fitAnlageToTerrain(plan: AnlagePlan, input: AnlageTerrainInput): AnlageTerrainFit {
  const { survey, origin } = input;
  const offset = input.offset ?? [0, 0], mode = input.mode ?? 'terrassen';
  if (!offset.every(Number.isInteger) || !origin.every(Number.isInteger)) fail('Versatz und Ursprung müssen ganzzahlig sein');
  const units = unitsOf(plan).map(u => {
    const columns = u.placements.flatMap(p => placementColumns(p, origin, offset));
    const base = columns.reduce((m, c) => Math.min(m, c.y), Infinity);
    return { ...u, columns, base };
  });
  const all = units.flatMap(u => u.columns);
  const common = medianGround(all, survey);
  const path = units.find(u => u.kind === 'path');
  // World Y the base layer of a unit should get; null = keep the planned height (no known ground).
  const target = (u: typeof units[number]): number | null => {
    if (mode === 'eben') {
      const ref = path ? medianGround(path.columns, survey) ?? common : common;
      return ref === null ? null : ref + 1;
    }
    const g = medianGround(u.columns, survey);
    return g === null ? null : g + 1;
  };
  const heights = new Map<string, number>();
  const fitted = units.map(u => {
    const t = Number.isFinite(u.base) ? target(u) : null;
    const dy = t === null ? 0 : t - u.base;
    for (const p of u.placements) heights.set(p.key, dy);
    const shifted = u.columns.map(c => ({ ...c, y: c.y + dy }));
    const baseY = Number.isFinite(u.base) ? u.base + dy : origin[1];
    // Every unit has its own base layer: a terrace hangs or is buried on its own.
    const estimate = estimateEarthwork(shifted, survey, (c, b) => c.y === b);
    return { u, dy, baseY, estimate };
  });
  const pathFit = fitted.find(f => f.u.kind === 'path');
  const pathY = pathFit ? pathFit.baseY : null;
  const out: UnitTerrain[] = fitted.map(({ u, dy, baseY, estimate }) => ({
    id: u.id, name: u.name, kind: u.kind, keys: u.placements.map(p => p.key), dy, baseY, estimate,
    stepToPath: pathY === null || u.kind === 'path' ? null : baseY - pathY,
    slope: estimate.ground ? estimate.ground.max - estimate.ground.min : null,
  }));
  const sum = (k: 'fill' | 'cut' | 'water' | 'unknown' | 'columns' | 'hanging' | 'buried') => out.reduce((a, x) => a + x.estimate[k], 0);
  const totals = { fill: sum('fill'), cut: sum('cut'), water: sum('water'), unknown: sum('unknown'), columns: sum('columns'), hanging: sum('hanging'), buried: sum('buried') };
  const notes: string[] = [];
  if (totals.unknown) notes.push(`${totals.unknown} Grundrissspalten liegen außerhalb der Geländeaufnahme oder auf unbekanntem Gelände; dort bleibt die geplante Höhe und das Gelände ungeprüft.`);
  const steep = out.filter(x => x.kind !== 'path' && (x.slope ?? 0) > SLOPE_LIMIT);
  if (steep.length) notes.push(`Hang unter ${steep.slice(0, 4).map(x => `${x.name} (${x.slope} Blöcke)`).join(', ')}${steep.length > 4 ? ' …' : ''}: Stützmauer oder Sockel einplanen.`);
  const steps = out.filter(x => x.stepToPath !== null && Math.abs(x.stepToPath) > STEP_LIMIT);
  if (steps.length) notes.push(`${steps.length} ${steps.length === 1 ? 'Einheit liegt' : 'Einheiten liegen'} mehr als ${STEP_LIMIT} Block über oder unter dem Weg und ${steps.length === 1 ? 'braucht' : 'brauchen'} Treppe oder Rampe.`);
  if (totals.water) notes.push(`${totals.water} Spalten stehen im Wasser oder an Lava.`);
  if (path && pathFit && (pathFit.estimate.ground?.max ?? 0) - (pathFit.estimate.ground?.min ?? 0) > SLOPE_LIMIT) notes.push('Der Hauptweg bleibt auf einer Höhe (Anschlüsse der Wegmodule); am Hang wird er aufgeschüttet oder eingeschnitten.');
  return { mode, units: out, heights, pathY, totals, complete: totals.unknown === 0, notes };
}

export interface TerrainSpot {
  readonly offset: readonly [number, number];
  /** Fill + cut + penalties for water and unknown columns (lower is better). */
  readonly score: number;
  readonly fit: AnlageTerrainFit;
  /** Candidate positions compared. */
  readonly tried: number;
}

const score = (f: AnlageTerrainFit) => f.totals.fill + f.totals.cut + 20 * f.totals.water + 50 * f.totals.unknown
  + 2 * f.units.reduce((a, u) => a + Math.max(0, Math.abs(u.stepToPath ?? 0) - STEP_LIMIT), 0);

/**
 * Searches the offset with the least earthwork for a plan inside the survey
 * (coarse grid over every position where the whole Anlage fits, then a fine
 * search around the best one). Returns null when the Anlage does not fit
 * into the survey at all.
 */
export function findTerrainSpot(plan: AnlagePlan, input: Omit<AnlageTerrainInput, 'offset'> & { readonly step?: number; readonly avoid?: readonly { x0: number; z0: number; x1: number; z1: number }[] }): TerrainSpot | null {
  const { survey, origin } = input;
  const e = plan.extent;
  if (!e) return null;
  // Offsets (project coordinates) for which the extent lies inside the survey.
  const ox0 = survey.minX - origin[0] - e.x0, ox1 = survey.minX + survey.width - origin[0] - e.x1;
  const oz0 = survey.minZ - origin[2] - e.z0, oz1 = survey.minZ + survey.length - origin[2] - e.z1;
  if (ox1 < ox0 || oz1 < oz0) return null;
  const step = Math.max(1, Math.trunc(input.step ?? Math.max(2, Math.ceil(Math.max(ox1 - ox0, oz1 - oz0) / 16))));
  const mode = input.mode ?? 'terrassen';
  const state: { best: { offset: [number, number]; score: number; fit: AnlageTerrainFit } | null; tried: number } = { best: null, tried: 0 };
  // Areas already built on (project coordinates, max exclusive) are never chosen (GROSS-01-S08).
  const free = (dx: number, dz: number) => !(input.avoid ?? []).some(a => e.x0 + dx < a.x1 && e.x1 + dx > a.x0 && e.z0 + dz < a.z1 && e.z1 + dz > a.z0);
  const consider = (dx: number, dz: number) => {
    if (!free(dx, dz)) return;
    const fit = fitAnlageToTerrain(plan, { survey, origin, offset: [dx, dz], mode }); state.tried++;
    const sc = score(fit), b = state.best;
    if (!b || sc < b.score || (sc === b.score && Math.abs(dx) + Math.abs(dz) < Math.abs(b.offset[0]) + Math.abs(b.offset[1]))) state.best = { offset: [dx, dz], score: sc, fit };
  };
  const xs: number[] = [], zs: number[] = [];
  for (let x = ox0; x <= ox1; x += step) xs.push(x);
  if (xs.at(-1) !== ox1) xs.push(ox1);
  for (let z = oz0; z <= oz1; z += step) zs.push(z);
  if (zs.at(-1) !== oz1) zs.push(oz1);
  for (const z of zs) for (const x of xs) consider(x, z);
  if (!state.best) return null;
  const coarse = state.best.offset;
  const r = Math.min(step - 1, 4);
  for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    const x = coarse[0] + dx, z = coarse[1] + dz;
    if ((dx || dz) && x >= ox0 && x <= ox1 && z >= oz0 && z <= oz1) consider(x, z);
  }
  const b = state.best!;
  return { offset: b.offset, score: b.score, fit: b.fit, tried: state.tried };
}
