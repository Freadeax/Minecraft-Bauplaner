import { cellOwnersOf, resolveProject } from '../../domain/src/core/compose.js';
import type { Resolution } from '../../domain/src/core/compose.js';
import { buildGuide, evaluateProgress, stepCellIndices } from '../../domain/src/building/guide.js';
import { canonicalJson } from '../../domain/src/core/hash.js';
import type { Guide, GuideProgress } from '../../domain/src/building/guide.js';
import { computeMaterials, materialsForParts, materialsForResolution, SHULKER_SLOTS } from '../../domain/src/materials/materials.js';
import type { ItemLine, ItemSource, MaterialReport, UnresolvedLine } from '../../domain/src/materials/materials.js';
import { checkSections, planSite, reservationsFor, siteOf } from '../../domain/src/building/site.js';
import type { Reservation, SectionIssue, SiteOverview } from '../../domain/src/building/site.js';
import type { Cell } from '../../voxel/src/types.js';
import type { AssetVersion, BlueprintRevision, Project } from '../../domain/src/core/types.js';

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

/** Everything that depends only on the placed geometry: instances, project profile and the versions they use. */
export type ProjectGeometry = Omit<ProjectComputation, 'site'>;
/** What the geometry part may read from a project (PERF-02-S03): the type is the invalidation contract. */
export type GeometrySource = Pick<Project, 'instances' | 'profileId'>;

/** Framework/transport-free composition over the existing shared calculation rules. */
export function computeProject(input: ComputeInput): ProjectComputation {
  const project = effectiveProject(input);
  const geometry = computeGeometry(project, input.versions);
  return { ...geometry, site: computeSite(project, input.versions, geometry) };
}

/** The project as computed: a historical basis replaces instances and links, everything else stays current. */
function effectiveProject(input: ComputeInput): Project {
  return input.basis ? { ...input.project, instances: input.basis.instances, links: input.basis.links } : input.project;
}

/** Resolution, guide and material reports; reads nothing of the project but `GeometrySource`. */
export function computeGeometry(project: GeometrySource, versions: ReadonlyMap<string, AssetVersion>): ProjectGeometry {
  const resolution = resolveProject(project, versions);
  const guide = buildGuide(project, resolution);
  const materials = materialsForResolution(resolution);
  const stepMaterials = resolution.world ? materialsForParts(resolution.world, guide.steps.map(step => {
    const cellIndices = stepCellIndices(step, resolution.world!);
    return { id: step.id, positions: step.positions, conflicts: step.conflicts, ...(cellIndices && { cellIndices }) };
  })) : new Map<string, MaterialReport>();
  // Partition ownership once instead of filtering the whole world for each instance.
  const cellsByInstance = new Map<string, Cell[]>();
  const ownerOf = cellOwnersOf(resolution), worldCells = resolution.world?.cells ?? [];
  for (let i = 0; i < worldCells.length; i++) {
    const cell = worldCells[i]!, owner = ownerOf(i, cell);
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
  return { resolution, guide, materials, stepMaterials, instanceMaterials };
}

/** Progress, site plan, section checks and reservations on top of a computed geometry: cheap, may run on the page. */
export function computeSite(project: Project, versions: ReadonlyMap<string, AssetVersion>, geometry: ProjectGeometry): ProjectComputation['site'] {
  const { guide, resolution } = geometry;
  const sitePlan = siteOf(project), progress = evaluateProgress(guide, project.progress);
  return { progress, plan: planSite(sitePlan, guide, progress, resolution), issues: checkSections(sitePlan, project, guide), reservations: reservationsFor(project, versions, sitePlan, resolution) };
}

/**
 * Selective recomputation (PERF-02-S03): when two inputs place the same geometry, the earlier geometry is
 * reused and only the site part is computed again (progress ticks, site plan, names of the project).
 *
 * Invalidation is complete by construction: `computeGeometry` can only read `GeometrySource` and the
 * versions its instances name, and this check compares exactly those – profile, every instance field
 * (canonical JSON) and every used version (same object, or same id, payload hash and all other fields).
 */
export function sameGeometry(a: ComputeInput, b: ComputeInput): boolean {
  const pa = effectiveProject(a), pb = effectiveProject(b);
  if (pa.profileId !== pb.profileId) return false;
  if (pa.instances !== pb.instances && canonicalJson(pa.instances) !== canonicalJson(pb.instances)) return false;
  for (const instance of pa.instances) {
    const va = a.versions.get(instance.assetVersionId), vb = b.versions.get(instance.assetVersionId);
    if (va === vb) continue;
    if (!va || !vb || va.id !== vb.id || va.payloadHash !== vb.payloadHash || canonicalJson({ ...va, payload: null }) !== canonicalJson({ ...vb, payload: null })) return false;
  }
  return true;
}

/** The new input's result from an earlier one with the same geometry; null when the geometry differs. */
export function recomputeSite(input: ComputeInput, previous: { readonly input: ComputeInput; readonly result: ProjectComputation }): ProjectComputation | null {
  if (!sameGeometry(previous.input, input)) return null;
  const { site: _site, ...geometry } = previous.result;
  return { ...geometry, site: computeSite(effectiveProject(input), input.versions, geometry) };
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
