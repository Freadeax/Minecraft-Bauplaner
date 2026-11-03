import { columnBuffers, columnsToCells, checkColumns, payloadToTransport } from '../../voxel/src/cellColumns.js';
import type { PayloadTransport } from '../../voxel/src/cellColumns.js';
import { sealTransportedPayload } from '../../voxel/src/validation.js';
import { transformPayload } from '../../voxel/src/transforms.js';
import type { Cell, Vec3, VoxelPayload } from '../../voxel/src/types.js';
import { rememberPayloadHash } from '../../domain/src/library.js';
import type { PlacedInstance } from '../../domain/src/compose.js';
import type { GuideStep } from '../../domain/src/guide.js';
import type { SectionPlan } from '../../domain/src/site.js';
import type { AssetVersion, Instance } from '../../domain/src/types.js';
import type { ComputeInput, ProjectComputation } from './projectComputation.js';

/**
 * Wire form of the project computation between the page and its worker (SIZE-01).
 *
 * A structured clone of a model with a million cells took seconds on each side (Olympus, 953 000
 * blocks: 4 s to send the version, 12 s to send the result back). Cells travel as typed-array
 * columns instead, which are transferred without copying; guide steps name their cells by index into
 * the world; placed payloads are not sent back at all, the page derives them from its own sealed
 * versions with the same transform. Only the page and worker of this application use this form, and
 * both sides validated the payloads before (see `sealTransportedPayload`).
 */
export interface WireVersion extends Omit<AssetVersion, 'payload'> { readonly payload: null; readonly transport: PayloadTransport }
export interface WireInput extends Omit<ComputeInput, 'versions'> { readonly versions: ReadonlyMap<string, WireVersion> }

interface WireStep extends Omit<GuideStep, 'positions'> { readonly positions: null; readonly cellIndex: Int32Array }
interface WirePlaced { readonly instance: Instance; readonly versionId: string; readonly semanticsResolved: boolean }
export interface WireResult {
  readonly wire: 1;
  readonly world: PayloadTransport | null;
  readonly resolution: Omit<ProjectComputation['resolution'], 'world' | 'placed'> & { readonly placed: readonly WirePlaced[] };
  readonly guide: Omit<ProjectComputation['guide'], 'steps' | 'byId'> & { readonly steps: readonly (WireStep | GuideStep)[] };
  readonly materials: ProjectComputation['materials'];
  readonly stepMaterials: ProjectComputation['stepMaterials'];
  readonly instanceMaterials: ProjectComputation['instanceMaterials'];
  readonly site: Omit<ProjectComputation['site'], 'plan'> & { readonly plan: Omit<ProjectComputation['site']['plan'], 'sections'> & { readonly sections: readonly (Omit<SectionPlan, 'steps'> & { readonly stepIds: readonly string[] })[] } };
}

function hydrate(t: PayloadTransport): VoxelPayload {
  checkColumns(t.columns);
  const cells: Cell[] = new Array(t.columns.count);
  columnsToCells(t.columns, cells);
  return sealTransportedPayload({ ...t.head, cells } as VoxelPayload, t.limits);
}

/** Page side: versions as columns; the buffers go in the transfer list. */
export function encodeComputeInput(input: ComputeInput): { readonly input: WireInput; readonly transfer: ArrayBuffer[] } {
  const transfer: ArrayBuffer[] = [];
  const versions = new Map<string, WireVersion>();
  for (const [id, version] of input.versions) {
    const transport = payloadToTransport(version.payload);
    transfer.push(...columnBuffers(transport.columns));
    versions.set(id, { ...version, payload: null, transport });
  }
  return { input: { ...input, versions }, transfer };
}

/** Worker side: sealed payloads again (the page validated them), with their known hash. */
export function decodeComputeInput(input: WireInput | ComputeInput): ComputeInput {
  const versions = new Map<string, AssetVersion>();
  for (const [id, v] of input.versions) {
    if (v.payload) { versions.set(id, v as AssetVersion); continue; }
    const { transport, ...rest } = v as WireVersion;
    const payload = hydrate(transport);
    rememberPayloadHash(payload, rest.payloadHash);
    versions.set(id, { ...rest, payload });
  }
  return { ...input, versions };
}

/** Worker side: the result without object-per-cell copies. */
export function encodeComputeResult(result: ProjectComputation): { readonly result: WireResult; readonly transfer: ArrayBuffer[] } {
  const { resolution, guide, site } = result, transfer: ArrayBuffer[] = [];
  const world = resolution.world ? payloadToTransport(resolution.world) : null;
  if (world) transfer.push(...columnBuffers(world.columns));
  const at = new Map<Vec3, number>();
  resolution.world?.cells.forEach((c, i) => at.set(c.position, i));
  const steps = guide.steps.map((step): WireStep | GuideStep => {
    const cellIndex = new Int32Array(step.positions.length);
    for (let i = 0; i < step.positions.length; i++) {
      const k = at.get(step.positions[i]!);
      if (k === undefined) return step; // not a world cell object: send as it is
      cellIndex[i] = k;
    }
    transfer.push(cellIndex.buffer as ArrayBuffer);
    const { positions: _positions, ...rest } = step;
    return { ...rest, positions: null, cellIndex };
  });
  const placed = resolution.placed.map(p => ({ instance: p.instance, versionId: p.version.id, semanticsResolved: p.semanticsResolved }));
  const sections = site.plan.sections.map(({ steps: sectionSteps, ...rest }) => ({ ...rest, stepIds: sectionSteps.map(s => s.id) }));
  const { world: _world, placed: _placed, ...resolutionRest } = resolution;
  const { steps: _steps, byId: _byId, ...guideRest } = guide;
  return {
    result: {
      wire: 1, world, resolution: { ...resolutionRest, placed }, guide: { ...guideRest, steps },
      materials: result.materials, stepMaterials: result.stepMaterials, instanceMaterials: result.instanceMaterials,
      site: { ...site, plan: { ...site.plan, sections } },
    },
    transfer,
  };
}

export const isWireResult = (value: unknown): value is WireResult => typeof value === 'object' && value !== null && (value as { wire?: unknown }).wire === 1;

/** Page side: the full computation, with placed payloads derived from the page's own versions. */
export function decodeComputeResult(wire: WireResult, versions: ReadonlyMap<string, AssetVersion>): ProjectComputation {
  const world = wire.world ? hydrate(wire.world) : null;
  const steps: GuideStep[] = wire.guide.steps.map(step => {
    if (step.positions) return step as GuideStep;
    const { cellIndex, ...rest } = step as WireStep;
    const positions: Vec3[] = new Array(cellIndex.length);
    for (let i = 0; i < cellIndex.length; i++) {
      const cell = world?.cells[cellIndex[i]!];
      if (!cell) throw new Error('Berechnungsergebnis passt nicht zur Welt.');
      positions[i] = cell.position;
    }
    return { ...rest, positions };
  });
  const byId = new Map(steps.map(s => [s.id, s]));
  const placed: PlacedInstance[] = wire.resolution.placed.map(p => {
    const version = versions.get(p.versionId);
    if (!version) throw new Error(`Bauteilversion ${p.versionId} fehlt auf der Seite.`);
    return { instance: p.instance, version, payload: transformPayload(version.payload, p.instance.transform).payload, semanticsResolved: p.semanticsResolved };
  });
  const sections: SectionPlan[] = wire.site.plan.sections.map(({ stepIds, ...rest }) => ({ ...rest, steps: stepIds.map(id => byId.get(id)!).filter(Boolean) }));
  return {
    resolution: { ...wire.resolution, world, placed },
    guide: { ...wire.guide, steps, byId },
    materials: wire.materials, stepMaterials: wire.stepMaterials, instanceMaterials: wire.instanceMaterials,
    site: { ...wire.site, plan: { ...wire.site.plan, sections } },
  };
}
