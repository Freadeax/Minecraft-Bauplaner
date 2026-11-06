import type { VoxelPayload } from '../../../voxel/src/types.js';
import { newInstance } from '../core/project.js';
import type { Operation } from '../core/project.js';
import type { AssetVersion, Project } from '../core/types.js';
import { newId } from '../core/hash.js';
import { unlinkedMates } from '../core/connectors.js';
import { addSection, siteOf, siteOperation } from '../building/site.js';
import type { SiteOverview, SitePlan } from '../building/site.js';
import { addDependency } from '../planning/program.js';
import { computeMaterials } from './materials.js';
import { farmCostOf } from './productionPlan.js';
import type { FurnacePlan } from './productionPlan.js';

/**
 * Ofenstraße in die Planung (PROD-03-Folge, Block 7, 06.11.2026). The furnace plan of the production analysis says
 * how many furnace hours the missing smelt items need; this module turns that into a concrete build: which catalogue
 * furnace building (Ofenstraße, kettenbares Schmelzofen-Modul), how many copies for a target time, what they cost
 * to build – and one undoable operation that puts the copies beside the project, gives them their own build section
 * before the first section that needs smelted items and, with a build program, makes those sections wait for it.
 *
 * Nothing is counted a second way: furnaces per building come from computeMaterials of its payload, build cost from
 * farmCostOf (same as the farm suggestions), smelt hours from FurnacePlan.
 */

/** Catalogue buildings that work as a furnace line, best first. */
export const FURNACE_LINE_BUILDINGS = ['bld_technik_ofenstrasse', 'bld_schmelz_modul'] as const;
/** Target times the UI offers (hours of furnace time for all missing smelts). */
export const FURNACE_TARGET_HOURS = [1, 2, 4, 8] as const;
/** More copies than this are not offered: past that a dedicated smelter build is the better plan. */
export const MAX_FURNACE_MODULES = 16;
export const FURNACE_SECTION_NAME = 'Ofenstraße';

export interface FurnaceBuilding {
  readonly assetId: string;
  readonly versionId: string;
  readonly name: string;
  /** Furnaces (plain furnaces; blast furnaces smelt only ores and are left out) in one copy. */
  readonly furnaces: number;
  readonly blocks: number;
  /** Hand-gathering hours of one copy's raw materials (Richtwerte, like the farm suggestions). */
  readonly gatherHours: number;
  /** Size along X, for placing copies in a row. */
  readonly width: number;
  readonly minX: number;
}

export function furnaceBuildingOf(input: { assetId: string; versionId: string; name: string; payload: VoxelPayload }): FurnaceBuilding | null {
  const report = computeMaterials(input.payload);
  const furnaces = report.items.filter(i => i.itemId === 'minecraft:furnace').reduce((n, i) => n + i.count, 0);
  if (!furnaces) return null;
  const cost = farmCostOf(input.payload), b = input.payload.bounds;
  return { assetId: input.assetId, versionId: input.versionId, name: input.name, furnaces, blocks: cost.blocks, gatherHours: cost.gatherHours,
    width: b.maxExclusive[0] - b.min[0], minX: b.min[0] };
}

export interface FurnaceLineOption {
  readonly building: FurnaceBuilding;
  readonly copies: number;
  readonly furnaces: number;
  /** Furnace time for all missing smelts with these furnaces running side by side. */
  readonly hours: number;
  readonly blocks: number;
  readonly gatherHours: number;
  /** True when the target time is reached without hitting MAX_FURNACE_MODULES. */
  readonly meetsTarget: boolean;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** Options per furnace building for a target time; cheapest (fewest blocks) first among those that meet it. */
export function furnaceLineOptions(plan: Pick<FurnacePlan, 'furnaceHours'>, buildings: readonly FurnaceBuilding[], targetHours: number): FurnaceLineOption[] {
  if (!(plan.furnaceHours > 0) || !(targetHours > 0)) return [];
  const needed = Math.ceil(plan.furnaceHours / targetHours);
  return buildings.map(building => {
    const want = Math.ceil(needed / building.furnaces), copies = Math.max(1, Math.min(MAX_FURNACE_MODULES, want)), furnaces = copies * building.furnaces;
    return { building, copies, furnaces, hours: round1(plan.furnaceHours / furnaces), blocks: copies * building.blocks, gatherHours: round1(copies * building.gatherHours), meetsTarget: want <= MAX_FURNACE_MODULES };
  }).sort((a, b) => Number(b.meetsTarget) - Number(a.meetsTarget) || a.blocks - b.blocks || a.copies - b.copies);
}

export interface FurnaceLineInput {
  readonly project: Pick<Project, 'instances' | 'site'>;
  readonly overview: Pick<SiteOverview, 'sections'>;
  readonly option: FurnaceLineOption;
  /** First free X beside the existing build (world.bounds.maxExclusive[0] + 1); 0 for an empty project. */
  readonly besideX: number;
  /** The building's version: with it, copies of a chainable module (connectors) are linked to each other. */
  readonly version?: AssetVersion;
  /** Fixed section id (tests). */
  readonly sectionId?: string;
}

export interface FurnaceLinePlacement {
  readonly operation: Operation;
  readonly sectionId: string;
  /** Sections that now wait for the furnace line (only with a build program). */
  readonly waiting: readonly string[];
  /** Connector links between neighbouring copies. */
  readonly links: number;
  /** Where the furnace section sits in the build order (0-based). */
  readonly index: number;
}

/**
 * One undoable batch: N copies in a row beside the build, a section „Ofenstraße“ with exactly these copies placed
 * before the first section that still needs smelted items, and – when the project has a build program – a
 * dependency from it to every section that needs smelting. Existing sections and their members stay as they are.
 */
export function furnaceLineOperation(input: FurnaceLineInput): FurnaceLinePlacement {
  const { option, project } = input, b = option.building;
  const count = project.instances.filter(i => i.assetVersionId === b.versionId).length;
  const instances = Array.from({ length: option.copies }, (_, k) => newInstance({
    assetVersionId: b.versionId, name: `${b.name} ${count + k + 1}`,
    transform: { position: [input.besideX - b.minX + k * b.width, 0, 0], quarterTurns: 0, mirrorX: false },
  }));
  const site: SitePlan = siteOf(project);
  const smelting = new Set(input.overview.sections.filter(s => s.id && s.smelts > 0).map(s => s.id));
  const first = site.sections.findIndex(s => smelting.has(s.id));
  const index = first < 0 ? 0 : first;
  const sectionId = input.sectionId ?? `sec_ofen_${instances[0]!.id.slice(-8)}`;
  const added = addSection(site, FURNACE_SECTION_NAME, instances.map(i => ({ instanceId: i.id })), sectionId);
  const section = added.sections.at(-1)!;
  let next: SitePlan = { ...added, sections: [...site.sections.slice(0, index), section, ...site.sections.slice(index)] };
  const waiting: string[] = [];
  if (site.program) for (const s of site.sections) if (smelting.has(s.id)) { next = addDependency(next, sectionId, s.id, 'braucht geschmolzene Items'); waiting.push(s.id); }
  const links = input.version && option.copies > 1
    ? unlinkedMates({ instances, links: [] } as unknown as Project, new Map([[b.versionId, input.version]])).map(m => ({ kind: 'link.add' as const, link: { id: newId('link'), a: m.a, b: m.b } }))
    : [];
  const label = `${option.copies > 1 ? `${option.copies}× ` : ''}${b.name} für die Öfen eingeplant`;
  return {
    operation: { kind: 'batch', label, operations: [...instances.map(instance => ({ kind: 'instance.add' as const, instance })), ...links, siteOperation(next, label)] },
    sectionId, waiting, index, links: links.length,
  };
}
