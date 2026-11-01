import { positionKey, resolveProject } from '../../domain/src/compose.js';
import type { Resolution } from '../../domain/src/compose.js';
import { buildGuide, evaluateProgress } from '../../domain/src/guide.js';
import type { Guide, GuideProgress } from '../../domain/src/guide.js';
import { computeMaterials, materialsForParts, materialsForResolution, SHULKER_SLOTS } from '../../domain/src/materials.js';
import type { ItemLine, ItemSource, MaterialReport, UnresolvedLine } from '../../domain/src/materials.js';
import { checkSections, planSite, reservationsFor, siteOf } from '../../domain/src/site.js';
import type { Reservation, SectionIssue, SiteOverview } from '../../domain/src/site.js';
import type { Cell } from '../../voxel/src/types.js';
import type { AssetVersion, BlueprintRevision, Project } from '../../domain/src/types.js';

export interface ComputeInput {
  readonly project: Project;
  readonly versions: ReadonlyMap<string, AssetVersion>;
  /** Frozen geometry when viewing a historical revision; stored project is never changed. */
  readonly basis?: BlueprintRevision;
}
export interface ProjectComputation {
  readonly resolution: Resolution;
  readonly guide: Guide;
  readonly materials: MaterialReport;
  readonly stepMaterials: ReadonlyMap<string, MaterialReport>;
  readonly instanceMaterials: ReadonlyMap<string, MaterialReport>;
  readonly site: { readonly progress: GuideProgress; readonly plan: SiteOverview; readonly issues: readonly SectionIssue[]; readonly reservations: readonly Reservation[] };
}

/** Framework/transport-free composition over the existing shared calculation rules. */
export function computeProject(input: ComputeInput): ProjectComputation {
  const project = input.basis ? { ...input.project, instances: input.basis.instances, links: input.basis.links } : input.project;
  const resolution = resolveProject(project, input.versions);
  const guide = buildGuide(input.basis ?? project, resolution);
  const materials = materialsForResolution(resolution);
  const stepMaterials = resolution.world ? materialsForParts(resolution.world, guide.steps.map(step => ({ id: step.id, positions: step.positions, conflicts: step.conflicts }))) : new Map<string, MaterialReport>();
  // Partition ownership once instead of filtering the whole world for each instance.
  const cellsByInstance = new Map<string, Cell[]>();
  for (const cell of resolution.world?.cells ?? []) {
    const owner = resolution.owners.get(positionKey(cell.position))?.[0];
    if (!owner) continue;
    let cells = cellsByInstance.get(owner);
    if (!cells) cellsByInstance.set(owner, cells = []);
    cells.push(cell);
  }
  const conflictsByInstance = new Map<string, number>();
  for (const conflict of resolution.conflicts) for (const owner of conflict.instanceIds) conflictsByInstance.set(owner, (conflictsByInstance.get(owner) ?? 0) + 1);
  const instanceMaterials = new Map(project.instances.map(instance => [instance.id, computeMaterials(resolution.world, {
    scope: { kind: 'instance', instanceId: instance.id, name: instance.name }, cells: cellsByInstance.get(instance.id) ?? [],
    // Supplied include enables the core's matching container-content scope; cells already select the partition.
    include: () => true, conflicts: conflictsByInstance.get(instance.id) ?? 0,
  })]));
  const sitePlan = siteOf(project), progress = evaluateProgress(guide, project.progress);
  const site = { progress, plan: planSite(sitePlan, guide, progress, resolution), issues: checkSections(sitePlan, project, guide), reservations: reservationsFor(project, input.versions, sitePlan, resolution) };
  return { resolution, guide, materials, stepMaterials, instanceMaterials, site };
}


export type BuildItemSummary = Pick<MaterialReport, 'items' | 'unresolved' | 'totals' | 'conflicts'>;

/** Merge already-counted disjoint steps of one world; never scans voxels or repeats item rules. */
export function mergeBuildItems(reports: readonly BuildItemSummary[]): BuildItemSummary {
  const items = new Map<string, { line: ItemLine; count: number; assumed: boolean; sources: Map<string, ItemSource> }>();
  const unresolved = new Map<string, UnresolvedLine>();
  let conflicts = 0;
  for (const report of reports) {
    conflicts += report.conflicts;
    for (const line of report.items) {
      let entry = items.get(line.itemId);
      if (!entry) {
        entry = { line, count: 0, assumed: false, sources: new Map() };
        items.set(line.itemId, entry);
      }
      if (entry.line.stackSize !== line.stackSize || entry.line.packable !== line.packable)
        throw new Error(`Widersprüchliche Stapelregeln für ${line.itemId}`);
      entry.count += line.count;
      entry.assumed ||= line.confidence === 'assumed';
      for (const source of line.sources) {
        const key = `${source.key}|${source.rule}|${source.note ?? ''}`, previous = entry.sources.get(key);
        entry.sources.set(key, previous ? { ...previous, cells: previous.cells + source.cells, items: previous.items + source.items,
          confidence: previous.confidence === 'assumed' || source.confidence === 'assumed' ? 'assumed' : 'catalog' } : { ...source });
      }
    }
    for (const line of report.unresolved) {
      const key = `${line.key}|${line.reason}|${line.message}`, previous = unresolved.get(key);
      unresolved.set(key, previous ? { ...previous, count: previous.count + line.count } : { ...line });
    }
  }
  const lines: ItemLine[] = [...items.values()].map(({ line, count, assumed, sources }): ItemLine => ({
    ...line, count, confidence: assumed ? 'assumed' : 'catalog', fullStacks: Math.floor(count / line.stackSize), remainder: count % line.stackSize,
    slots: Math.ceil(count / line.stackSize), sources: [...sources.values()].sort((a, b) => b.items - a.items || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)),
  })).sort((a, b) => b.count - a.count || (a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0));
  return { items: lines, unresolved: [...unresolved.values()].sort((a, b) => b.count - a.count || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)), conflicts,
    totals: { items: lines.reduce((n, l) => n + l.count, 0), slots: lines.reduce((n, l) => n + l.slots, 0),
      shulkerBoxes: Math.ceil(lines.filter(l => l.packable).reduce((n, l) => n + l.slots, 0) / SHULKER_SLOTS),
      unpackableSlots: lines.filter(l => !l.packable).reduce((n, l) => n + l.slots, 0) },
  };
}
