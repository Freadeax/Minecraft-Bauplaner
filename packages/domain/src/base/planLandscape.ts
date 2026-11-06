import type { Cell, Vec3 } from '../../../voxel/src/types.js';
import { createPayload } from '../../../voxel/src/validation.js';
import type { AnlagePlacement, AnlagePlan } from './anlagen.js';
import { placementColumns } from './anlagenTerrain.js';
import { NO_WATER, fortifyShore, gradeFootprints, layPathCells } from '../world/terrainDesign.js';
import type { GradeResult, PathReport, PathSteps, PathWater, TerrainDesign } from '../world/terrainDesign.js';
import { SURVEY_UNKNOWN } from '../world/terrainSurvey.js';
import type { ColumnBase } from '../world/terrainSurvey.js';
import { addAssetVersion, createAsset } from '../catalog/library.js';
import { SAMPLE_PROFILE } from '../core/samples.js';
import { DomainError } from '../core/types.js';
import type { Asset, AssetVersion } from '../core/types.js';

/**
 * Pläne auf geplantem Gelände (TERRAIN-03-S08, GROSS-01-S08): a base, an
 * Anlage or a Großprojekt is written into the target project's terrain design
 * instead of carrying a flat path part.
 *
 *  - Bauplätze: under every building the ground is set to one below its lowest
 *    block (after the terrace fit), a margin blends into the terrain
 *    (gradeFootprints). Building sites in the water are reclaimed; with `quay`
 *    the new water edge gets a quay wall of stone bricks.
 *  - Wegenetz: the network columns (routed base paths, street lanes) are laid
 *    as one landscape path network (layPathCells): the surface follows the
 *    ground with at most one block between neighbours, stairs or slabs at the
 *    rises, a bridge with railings or a causeway over water.
 *  - Laternen: the lamp posts beside the network stand on the planned ground;
 *    they become a small own part (lampPostPart) because the design only knows
 *    terrain columns.
 *
 * Coordinates as everywhere for plans: plan cell (x, z) lies at world
 * (origin + offset + x, origin + offset + z). Nothing is stored here; the
 * caller stores the design and adopts the plan in one step.
 */

export type NetworkMode = 'bauteil' | 'landschaft';
export const NETWORK_MODE_LABEL: Readonly<Record<NetworkMode, string>> = {
  bauteil: 'als eigenes Bauteil (eine Ebene)',
  landschaft: 'als Landschaftsweg (folgt dem Gelände, Treppen, Brücken)',
};

/** Surface style (SURFACE_STYLES id) of a base path or Großprojekt street style. */
export const NETWORK_SURFACE: Readonly<Record<string, string>> = { dorf: 'pfad', kies: 'kiesweg', stein: 'steinweg', asphalt: 'asphalt' };

export interface PlanNetwork {
  /** Network columns in plan coordinates. */
  readonly cells: readonly (readonly [number, number])[];
  /** Lamp posts beside the network in plan coordinates. */
  readonly lamps: readonly (readonly [number, number])[];
  /** Surface style id (SURFACE_STYLES with `path`). */
  readonly style: string;
}

/** The routed network of a plan: a spread-out path part (base Wegenetz, Großprojekt Straßennetz). */
export const isNetworkPlacement = (p: Pick<AnlagePlacement, 'kind' | 'area'>): boolean => p.kind === 'path' && !!p.area;

/** The same plan without its network part (the network then lives in the terrain design). */
export function withoutNetwork<T extends AnlagePlan>(plan: T): T {
  return { ...plan, placements: plan.placements.filter(p => !isNetworkPlacement(p)) };
}

export interface PlanLandscapeInput {
  /** World origin of the target project. */
  readonly origin: Vec3;
  /** Offset of the plan inside the project (x, z). */
  readonly offset: readonly [number, number];
  /** Project Y shift per placement key (the terrain fit of the plan without its network). */
  readonly heights?: ReadonlyMap<string, number>;
  readonly network: PlanNetwork | null;
  readonly steps?: PathSteps;
  readonly water?: PathWater;
  readonly material?: string;
  /** Columns around the building sites blended into the terrain (0–16); null keeps the ground under the buildings. */
  readonly grade?: number | null;
  /** Quay walls along water edges at graded building sites. */
  readonly quay?: boolean;
}

export interface WetPlacement { readonly key: string; readonly name: string; readonly districtId: string | null; readonly columns: number; readonly total: number }

export interface PlanLandscapeResult {
  readonly path: PathReport | null;
  readonly grade: GradeResult | null;
  /** Building sites reclaimed from water (columns that were water). */
  readonly reclaimed: number;
  /** Quay wall columns set. */
  readonly quay: number;
  /** Lamp posts on known dry ground: world (x, ground y, z). */
  readonly lamps: readonly (readonly [number, number, number])[];
  readonly lampsDropped: number;
  /** Buildings standing on water in the design before grading (Wasserkanten). */
  readonly wet: readonly WetPlacement[];
}

const fail = (message: string): never => { throw new DomainError('ANLAGE', `Gelände: ${message}`); };

/** Building columns (world) of the plan with their heights applied. */
function buildingColumns(plan: AnlagePlan, input: Pick<PlanLandscapeInput, 'origin' | 'offset' | 'heights'>): { p: AnlagePlacement; columns: ColumnBase[] }[] {
  return plan.placements.filter(p => !isNetworkPlacement(p)).map(p => {
    const dy = input.heights?.get(p.key) ?? 0;
    return { p, columns: placementColumns(p, input.origin, input.offset).map(c => ({ ...c, y: c.y + dy })) };
  });
}

/** Buildings of a plan that stand on water of a design (no change). */
export function wetPlacements(d: TerrainDesign, plan: AnlagePlan, input: Pick<PlanLandscapeInput, 'origin' | 'offset' | 'heights'>): WetPlacement[] {
  const out: WetPlacement[] = [];
  for (const { p, columns } of buildingColumns(plan, input)) {
    let wet = 0;
    for (const c of columns) {
      const gx = c.x - d.minX, gz = c.z - d.minZ;
      if (gx < 0 || gz < 0 || gx >= d.width || gz >= d.length) continue;
      if (d.water[gx + gz * d.width] !== NO_WATER) wet++;
    }
    if (wet) out.push({ key: p.key, name: p.name, districtId: p.districtId, columns: wet, total: columns.length });
  }
  return out;
}

/**
 * Writes the plan's building sites and network into a design (mutates it).
 * Order: building sites first, then the network (it may cross a blended
 * margin, never a footprint – the network avoids buildings), then the lamps.
 */
export function applyPlanLandscape(d: TerrainDesign, plan: AnlagePlan, input: PlanLandscapeInput): PlanLandscapeResult {
  if (!input.offset.every(Number.isInteger) || !input.origin.every(Number.isInteger)) fail('Versatz und Ursprung müssen ganzzahlig sein');
  const wet = wetPlacements(d, plan, input);
  let grade: GradeResult | null = null, reclaimed = 0, quay = 0;
  if (input.grade !== null && input.grade !== undefined) {
    const sites = buildingColumns(plan, input).flatMap(b => b.columns);
    const footprint = new Set<number>();
    for (const c of sites) {
      const gx = c.x - d.minX, gz = c.z - d.minZ;
      if (gx < 0 || gz < 0 || gx >= d.width || gz >= d.length) continue;
      const i = gx + gz * d.width;
      if (d.height[i] === SURVEY_UNKNOWN) continue;
      if (!footprint.has(i) && d.water[i] !== NO_WATER) reclaimed++;
      footprint.add(i);
    }
    const before = input.quay ? d.water.slice() : null;
    grade = gradeFootprints(d, sites, input.grade);
    if (before) {
      // The new water edge: graded sites and blended margins that were water and are land now, plus the sites themselves.
      const edge = new Set(footprint);
      for (let i = 0; i < before.length; i++) if (before[i] !== NO_WATER && d.water[i] === NO_WATER) edge.add(i);
      quay = fortifyShore(d, edge);
    }
  }
  const [ox, oz] = [input.origin[0] + input.offset[0], input.origin[2] + input.offset[1]];
  const net = input.network;
  const path = net && net.cells.length
    ? layPathCells(d, net.cells.map(([x, z]) => [x + ox, z + oz] as const), { style: net.style, steps: input.steps ?? 'stairs', water: input.water ?? 'bridge', ...(input.material && { material: input.material }) })
    : null;
  const lamps: [number, number, number][] = [];
  let lampsDropped = 0;
  for (const [lx, lz] of net?.lamps ?? []) {
    const x = lx + ox, z = lz + oz, gx = x - d.minX, gz = z - d.minZ;
    const i = gx + gz * d.width;
    if (gx < 0 || gz < 0 || gx >= d.width || gz >= d.length || d.height[i] === SURVEY_UNKNOWN || d.water[i] !== NO_WATER || d.path[i]) { lampsDropped++; continue; }
    lamps.push([x, d.height[i]!, z]);
  }
  return { path, grade, reclaimed, quay, lamps, lampsDropped, wet };
}

/**
 * Lamp posts on the planned ground as one own part (post block, fence or bars,
 * lantern; one above the ground so the terrain part keeps its top block) and
 * its placement for the plan. Null without lamps.
 */
export async function lampPostPart(lamps: readonly (readonly [number, number, number])[], input: {
  readonly origin: Vec3; readonly offset: readonly [number, number]; readonly key: string; readonly name: string; readonly asphalt?: boolean;
}): Promise<{ asset: Asset; version: AssetVersion; placement: AnlagePlacement } | null> {
  if (!lamps.length) return null;
  const x0 = Math.min(...lamps.map(l => l[0])), z0 = Math.min(...lamps.map(l => l[2])), y0 = Math.min(...lamps.map(l => l[1])) + 1;
  const x1 = Math.max(...lamps.map(l => l[0])) + 1, z1 = Math.max(...lamps.map(l => l[2])) + 1, y1 = Math.max(...lamps.map(l => l[1])) + 4;
  const post = input.asphalt ? ['polished_andesite', 'iron_bars', 'lantern'] as const : ['mossy_cobblestone', 'spruce_fence', 'lantern'] as const;
  const closed = { east: 'false', north: 'false', south: 'false', waterlogged: 'false', west: 'false' };
  const palette = [{ id: `minecraft:${post[0]}`, properties: {} }, { id: `minecraft:${post[1]}`, properties: closed }, { id: `minecraft:${post[2]}`, properties: { hanging: 'false', waterlogged: 'false' } }];
  const cells: Cell[] = [];
  for (const [x, y, z] of lamps) for (let k = 0; k < 3; k++) cells.push({ position: [x - x0, y + 1 + k - y0, z - z0], kind: 'block', paletteIndex: k });
  const payload = createPayload({ schemaVersion: 1, profileId: SAMPLE_PROFILE, bounds: { min: [0, 0, 0], maxExclusive: [x1 - x0, y1 - y0, z1 - z0] },
    pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette, cells, blockEntities: [] });
  const asset = createAsset({ name: `Laternen: ${input.name}`.slice(0, 120), tags: ['laternen', 'wegenetz', 'infrastruktur'],
    description: `${lamps.length} Laternen am Landschaftsweg von „${input.name}“, jede auf dem geplanten Gelände.`,
    provenance: { author: 'Minecraft-Bauplaner', source: 'Weg auf geplantem Gelände (eigener Entwurf)', license: 'frei für dieses Projekt' } });
  const r = await addAssetVersion(asset, { payload, label: '1.0', source: { format: 'base-plan' } });
  const px = x0 - input.origin[0] - input.offset[0], pz = z0 - input.origin[2] - input.offset[1];
  const placement: AnlagePlacement = { key: input.key, districtId: null, kind: 'path', name: 'Laternen am Weg', version: r.version, area: true,
    transform: { position: [px, y0 - input.origin[1], pz], quarterTurns: 0, mirrorX: false }, footprint: { x0: px, z0: pz, x1: px + x1 - x0, z1: pz + z1 - z0 } };
  return { asset: r.asset, version: r.version, placement };
}
