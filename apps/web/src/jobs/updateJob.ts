import { columnBuffers, packCells, payloadToTransport } from '../../../../packages/voxel/src/index.js';
import type { PackedCells, PayloadTransport } from '../../../../packages/voxel/src/index.js';
import { prepareUpdate } from '../../../../packages/domain/src/index.js';
import type { Asset, AssetVersion, InstanceUpdatePlan, Operation, PatchPolicy, Project, UpdateChoice, UpdatePlan } from '../../../../packages/domain/src/index.js';
import { receivePayload } from './diffJob';
import type { JobContext } from './protocol';

/**
 * Consequences of a version switch (UPDATE-01 `prepareUpdate`) in the
 * background (PERF-04): rebasing local edits, both project resolutions,
 * build guides, progress, links and materials. Payloads travel as cell
 * columns; the result names versions by id (the page has them) and only new
 * rebased versions come back with their cells.
 */
export interface VersionTransport { readonly version: Omit<AssetVersion, 'payload'>; readonly payload: PayloadTransport }
export interface UpdateJobInput {
  readonly project: Project;
  readonly assets: readonly Asset[];
  readonly versions: readonly VersionTransport[];
  readonly choices: readonly UpdateChoice[];
  readonly policy: PatchPolicy;
}
/** An instance plan with versions by id, the per-cell diff list left out and the rebase payload taken from `to`. */
export interface InstancePlanRef extends Omit<InstanceUpdatePlan, 'asset' | 'from' | 'to' | 'target' | 'geometry' | 'rebase'> {
  readonly assetId: string; readonly fromId: string; readonly toId: string; readonly targetId: string;
  readonly geometry: Omit<InstanceUpdatePlan['geometry'], 'cells'>;
  readonly rebase: Omit<NonNullable<InstanceUpdatePlan['rebase']>, 'payload'> | null;
}
export interface UpdateJobOutput {
  readonly plan: Omit<UpdatePlan, 'instances'> & { readonly instances: readonly InstancePlanRef[] };
  readonly assets: readonly Asset[];
  readonly versions: readonly (VersionTransport & { readonly packed: PackedCells | null })[];
  readonly operation: Operation;
  readonly after: Project;
}

export async function updateJob(input: UpdateJobInput, ctx: JobContext): Promise<UpdateJobOutput> {
  ctx.progress('Versionen übernehmen', 0.05);
  const versions = new Map<string, AssetVersion>();
  input.versions.forEach((t, i) => {
    versions.set(t.version.id, { ...t.version, payload: receivePayload(t.payload) } as AssetVersion);
    ctx.progress('Versionen übernehmen', 0.05 + 0.2 * (i + 1) / input.versions.length);
  });
  ctx.progress('Folgen berechnen: Geometrie, Bauplan, Verbindungen, Materialien', 0.3);
  const r = await prepareUpdate(input.project, { assets: input.assets, versions }, input.choices, { policy: input.policy });
  ctx.progress('Ergebnis vorbereiten', 0.9);
  const instances = r.plan.instances.map((p): InstancePlanRef => {
    const { asset, from, to, target, geometry, rebase, ...rest } = p;
    const { cells: _cells, ...g } = geometry;
    return { ...rest, assetId: asset.id, fromId: from.id, toId: to.id, targetId: target.id, geometry: g, rebase: rebase ? (({ payload: _p, ...x }) => x)(rebase) : null };
  });
  const transfer: ArrayBuffer[] = [];
  const out = r.versions.map(v => {
    const { payload, ...version } = v;
    const t = payloadToTransport(payload), packed = packCells(payload);
    transfer.push(...columnBuffers(t.columns), ...(packed ? [packed.bytes.buffer as ArrayBuffer] : []));
    return { version, payload: t, packed };
  });
  ctx.transfer(transfer);
  return { plan: { ...r.plan, instances }, assets: r.assets, versions: out, operation: r.operation, after: r.after };
}
