import { hydratePayload } from '../../../../packages/voxel/src/index.js';
import { columnBuffers } from '../../../../packages/voxel/src/index.js';
import { deepFreeze, prepareUpdate, rememberPackedCells, rememberPayloadHash } from '../../../../packages/domain/src/index.js';
import type { AssetVersion, PreparedUpdate, PrepareOptions, Project, UpdateChoice, UpdateLibrary } from '../../../../packages/domain/src/index.js';
import { backgroundFrom, pause, runJob, workersAvailable } from './client';
import type { JobOptions } from './client';
import { transportInSlices } from './transport';
import type { VersionTransport } from './updateJob';

/** From this many cells in the involved versions the update preview is computed in the background. */
export const BACKGROUND_UPDATE_CELLS = 100_000;

/** Versions the preview needs: every version of the project's assets and the edit chains behind them. */
function involved(project: Project, library: UpdateLibrary): AssetVersion[] {
  const assets = new Map(library.assets.map(a => [a.id, a]));
  const out = new Map<string, AssetVersion>(), seenAssets = new Set<string>();
  const queue = project.instances.map(i => i.assetVersionId);
  while (queue.length) {
    const id = queue.pop()!;
    const v = out.has(id) ? undefined : library.versions.get(id);
    if (!v) continue;
    out.set(id, v);
    if (v.source.editedFrom) queue.push(v.source.editedFrom);
    if (!seenAssets.has(v.assetId)) { seenAssets.add(v.assetId); queue.push(...(assets.get(v.assetId)?.versionIds ?? [])); }
  }
  return [...out.values()];
}

/**
 * `prepareUpdate` in the background worker for large projects (PERF-04), with
 * the same result shape: versions by id are taken from `library`, new rebased
 * versions are rebuilt here in slices. Small projects compute right here.
 */
export async function prepareUpdateInBackground(project: Project, library: UpdateLibrary, choices: readonly UpdateChoice[], options: PrepareOptions,
  job: Pick<JobOptions, 'signal' | 'onProgress'> = {}): Promise<PreparedUpdate> {
  const versions = involved(project, library);
  const cells = versions.reduce((n, v) => n + v.payload.cells.length, 0);
  if (!workersAvailable() || cells < backgroundFrom(BACKGROUND_UPDATE_CELLS)) return prepareUpdate(project, library, choices, options);
  const sent: VersionTransport[] = [];
  for (const v of versions) { const { payload, ...version } = v; sent.push({ version, payload: await transportInSlices(payload, job.signal) }); }
  const assetIds = new Set(versions.map(v => v.assetId));
  const out = await runJob('update', {
    project, assets: library.assets.filter(a => assetIds.has(a.id)), versions: sent, choices, policy: options.policy ?? 'local',
  }, { ...job, transfer: sent.flatMap(t => columnBuffers(t.payload.columns)) });
  const fresh = new Map<string, AssetVersion>();
  for (const t of out.versions) {
    const payload = await hydratePayload(t.payload, { pause, ...(job.signal && { signal: job.signal }) });
    rememberPayloadHash(payload, t.version.payloadHash);
    if (t.packed) rememberPackedCells(payload, t.packed);
    fresh.set(t.version.id, deepFreeze({ ...t.version, payload } as AssetVersion));
  }
  const version = (id: string): AssetVersion => {
    const v = fresh.get(id) ?? library.versions.get(id);
    if (!v) throw new Error(`Version ${id} fehlt für die Update-Vorschau.`);
    return v;
  };
  const assets = new Map([...library.assets, ...out.assets].map(a => [a.id, a]));
  const instances = out.plan.instances.map(p => {
    const { assetId, fromId, toId, targetId, geometry, rebase, ...rest } = p;
    const to = version(toId);
    return { ...rest, asset: assets.get(assetId)!, from: version(fromId), to, target: version(targetId),
      // The per-cell list stays in the worker; previews compute their own comparison.
      geometry: { ...geometry, cells: [] }, rebase: rebase ? { ...rebase, payload: to.payload } : null };
  });
  return { plan: deepFreeze({ ...out.plan, instances }), assets: out.assets, versions: [...fresh.values()], operation: out.operation, after: out.after };
}
