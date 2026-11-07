import type { VoxelPayload } from '../../../voxel/src/types.js';
import { columnAt } from './terrainSurvey.js';
import type { TerrainSurvey } from './terrainSurvey.js';
import { placeToWorld } from './worldmap.js';
import type { WorldPlacement } from './worldmap.js';

/**
 * Geländeschnitt, Höhenprofil, Wassertiefe, Erdbewegung und Kollisionen (FLOW-01).
 *
 * Drei Quellen bleiben getrennt und werden nie vermischt:
 *  - **Plan**: die geplanten Blöcke an der Weltlage (unterster und oberster Block je Spalte);
 *  - **Geländeaufnahme**: die gespeicherte Höhenkarte des Projekts (Stand mit Datum);
 *  - **Live**: eine frische Höhenkarte aus der Mod, die nur verglichen und nicht gespeichert wird.
 * Die Rechnung je Spalte folgt `estimateEarthwork` (Fundament nur auf der untersten Planschicht, Abtrag überall),
 * damit Schnitt, Karte und die Zahlen der Weltkarte übereinstimmen. Höhlen und Überhänge kennt eine Höhenkarte nicht.
 */
export interface PlanColumn { readonly x: number; readonly z: number; readonly low: number; readonly high: number }

/** Unterster und oberster geplanter Block je XZ-Spalte in Weltkoordinaten (Drehung der Weltlage eingerechnet). */
export function planColumns(world: Pick<VoxelPayload, 'cells'>, placement: Pick<WorldPlacement, 'origin' | 'turns' | 'mirror'>): Map<string, PlanColumn> {
  const out = new Map<string, { x: number; z: number; low: number; high: number }>();
  for (const c of world.cells) {
    if (c.kind !== 'block') continue;
    const [x, y, z] = placeToWorld(c.position, placement);
    const k = `${x},${z}`, col = out.get(k);
    if (!col) out.set(k, { x, z, low: y, high: y });
    else { if (y < col.low) col.low = y; if (y > col.high) col.high = y; }
  }
  return out;
}

export interface EarthColumn {
  readonly x: number;
  readonly z: number;
  /** Aufnahme (null = unbekannt). */
  readonly ground: number | null;
  readonly surface: number | null;
  readonly fluid: boolean;
  /** Wassertiefe in Blöcken (Oberfläche − Boden), 0 an Land. */
  readonly water: number;
  readonly plan: PlanColumn | null;
  /** Bodenblöcke, die in den Plan ragen und abgetragen werden. */
  readonly cut: number;
  /** Blöcke Unterbau unter der untersten Planschicht bis zum Boden (auch Stützen im Wasser). */
  readonly fill: number;
  /** Gelände ragt in geplante Blöcke. */
  readonly collision: boolean;
  /** Fundament steht im oder auf Wasser. */
  readonly wet: boolean;
  /** Live-Höhenkarte (null = nicht gelesen oder unbekannt). */
  readonly live: { readonly ground: number; readonly surface: number; readonly fluid: boolean } | null;
  /** Live weicht von der Aufnahme ab (Boden oder Oberfläche). */
  readonly changed: boolean;
}

export interface EarthTotals {
  readonly planned: number;
  readonly unknown: number;
  readonly cut: number;
  readonly fill: number;
  readonly collisions: number;
  readonly wet: number;
  readonly maxWater: number;
  readonly maxCut: number;
  readonly maxFill: number;
  /** Spalten, in denen Live und Aufnahme abweichen (nur wo beide bekannt sind). */
  readonly changed: number;
  readonly liveKnown: number;
}

function column(x: number, z: number, survey: TerrainSurvey, plan: PlanColumn | null, baseY: number | null, live: TerrainSurvey | null): EarthColumn {
  const col = columnAt(survey, x, z);
  const l = live ? columnAt(live, x, z) : null;
  const liveCol = l ? { ground: l.ground, surface: l.surface, fluid: l.fluid } : null;
  const changed = !!(col && l && (col.ground !== l.ground || col.surface !== l.surface));
  if (!col) return { x, z, ground: null, surface: null, fluid: false, water: 0, plan, cut: 0, fill: 0, collision: false, wet: false, live: liveCol, changed };
  const water = col.fluid ? Math.max(0, col.surface - col.ground) : 0;
  let cut = 0, fill = 0, collision = false, wet = false;
  if (plan) {
    if (col.fluid && col.surface >= plan.low - 1) wet = true;
    if (col.ground >= plan.low) { collision = true; cut = col.ground - plan.low + 1; }
    else if (plan.low === baseY) fill = Math.max(0, plan.low - 1 - col.ground);
  }
  return { x, z, ground: col.ground, surface: col.surface, fluid: col.fluid, water, plan, cut, fill, collision, wet, live: liveCol, changed };
}

const lowest = (plan: ReadonlyMap<string, PlanColumn>): number | null => { let b = Infinity; for (const c of plan.values()) b = Math.min(b, c.low); return Number.isFinite(b) ? b : null; };

function totalsOf(columns: readonly EarthColumn[]): EarthTotals {
  let planned = 0, unknown = 0, cut = 0, fill = 0, collisions = 0, wet = 0, maxWater = 0, maxCut = 0, maxFill = 0, changed = 0, liveKnown = 0;
  for (const c of columns) {
    if (c.live) liveKnown++;
    if (c.changed) changed++;
    if (!c.plan) continue;
    planned++;
    if (c.ground === null) { unknown++; continue; }
    cut += c.cut; fill += c.fill; maxCut = Math.max(maxCut, c.cut); maxFill = Math.max(maxFill, c.fill);
    if (c.collision) collisions++;
    if (c.wet) wet++;
    maxWater = Math.max(maxWater, c.water);
  }
  return { planned, unknown, cut, fill, collisions, wet, maxWater, maxCut, maxFill, changed, liveKnown };
}

export interface EarthworkMap {
  readonly minX: number; readonly minZ: number; readonly width: number; readonly length: number;
  /** Zeilenweise (x + z·width). */
  readonly columns: readonly EarthColumn[];
  readonly baseY: number | null;
  readonly totals: EarthTotals;
}

/** Erdbewegungskarte über den Grundriss des Plans plus Rand, begrenzt auf die Aufnahme. */
export function earthworkMap(survey: TerrainSurvey, plan: ReadonlyMap<string, PlanColumn>, options: { readonly margin?: number; readonly live?: TerrainSurvey | null; readonly maxSide?: number } = {}): EarthworkMap {
  const margin = options.margin ?? 4, maxSide = options.maxSide ?? 256;
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const c of plan.values()) { x0 = Math.min(x0, c.x); z0 = Math.min(z0, c.z); x1 = Math.max(x1, c.x); z1 = Math.max(z1, c.z); }
  if (!Number.isFinite(x0)) { x0 = survey.minX; z0 = survey.minZ; x1 = survey.minX + survey.width - 1; z1 = survey.minZ + survey.length - 1; }
  const minX = Math.max(survey.minX, x0 - margin), minZ = Math.max(survey.minZ, z0 - margin);
  const maxX = Math.min(survey.minX + survey.width - 1, x1 + margin, minX + maxSide - 1), maxZ = Math.min(survey.minZ + survey.length - 1, z1 + margin, minZ + maxSide - 1);
  const width = Math.max(0, maxX - minX + 1), length = Math.max(0, maxZ - minZ + 1);
  const baseY = lowest(plan), live = options.live ?? null;
  const columns: EarthColumn[] = [];
  for (let z = minZ; z < minZ + length; z++) for (let x = minX; x < minX + width; x++) columns.push(column(x, z, survey, plan.get(`${x},${z}`) ?? null, baseY, live));
  // Plan columns outside the clipped map still count (unknown terrain), so totals match the whole plan.
  const inMap = (c: PlanColumn) => c.x >= minX && c.x < minX + width && c.z >= minZ && c.z < minZ + length;
  const outside = [...plan.values()].filter(c => !inMap(c)).map(c => column(c.x, c.z, survey, c, baseY, live));
  return { minX, minZ, width, length, columns, baseY, totals: totalsOf([...columns, ...outside]) };
}

export type SectionAxis = 'x' | 'z';

export interface TerrainSection {
  /** Schnitt entlang `axis` (x = West→Ost auf festem Z, z = Nord→Süd auf festem X). */
  readonly axis: SectionAxis;
  /** Feste Koordinate der Schnittlinie (Z bei axis x, X bei axis z). */
  readonly line: number;
  readonly from: number;
  readonly columns: readonly EarthColumn[];
  /** Höhenbereich für die Zeichnung (Boden, Wasser, Plan, Live). */
  readonly yMin: number;
  readonly yMax: number;
  readonly totals: EarthTotals;
}

/** Ein Schnitt durch eine Erdbewegungskarte (dieselben Spalten, dieselben Zahlen). */
export function terrainSection(map: EarthworkMap, axis: SectionAxis, line: number): TerrainSection {
  const columns: EarthColumn[] = [];
  if (axis === 'x') { const z = line - map.minZ; if (z >= 0 && z < map.length) for (let x = 0; x < map.width; x++) columns.push(map.columns[x + z * map.width]!); }
  else { const x = line - map.minX; if (x >= 0 && x < map.width) for (let z = 0; z < map.length; z++) columns.push(map.columns[x + z * map.width]!); }
  let yMin = Infinity, yMax = -Infinity;
  const see = (y: number | null | undefined) => { if (y === null || y === undefined) return; yMin = Math.min(yMin, y); yMax = Math.max(yMax, y); };
  for (const c of columns) { see(c.ground); see(c.surface); see(c.plan?.low); see(c.plan?.high); see(c.live?.ground); see(c.live?.surface); }
  if (!Number.isFinite(yMin)) { yMin = 60; yMax = 70; }
  return { axis, line, from: axis === 'x' ? map.minX : map.minZ, columns, yMin: yMin - 2, yMax: yMax + 2, totals: totalsOf(columns) };
}

/** Schnittlinie durch die Mitte des Plans (oder der Karte). */
export function middleLine(map: EarthworkMap, axis: SectionAxis): number {
  const planned = map.columns.filter(c => c.plan);
  if (!planned.length) return axis === 'x' ? map.minZ + Math.floor(map.length / 2) : map.minX + Math.floor(map.width / 2);
  const vals = planned.map(c => axis === 'x' ? c.z : c.x).sort((a, b) => a - b);
  return vals[Math.floor(vals.length / 2)]!;
}
