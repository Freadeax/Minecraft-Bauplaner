import { checkSchemaVersion, isPackedVersionRecord, packVersion, rememberPackedCells, unpackVersion, unpackVersionOrDamaged } from '../../../../packages/domain/src/index.js';
import type { Asset, AssetVersion } from '../../../../packages/domain/src/index.js';
import { AssetRevisionConflictError, seedSamples } from '../app/repository';
import type { Repository } from '../app/repository';
import { catalogMetrics } from '../app/metricsCache';
import { pause, runJob, workersAvailable } from './client';
import type { JobOptions } from './client';
import type { JobProgress } from './protocol';
import type { LibraryJobOutput } from './libraryJob';

/** Set by Vite at build time (vite.config.mjs): fingerprint of the core code; empty on the dev server. */
declare const __CATALOG_KEY__: string | undefined;

/**
 * App start of the library (PERF-04-S05). The shipped catalogue is built, the
 * delivery planned and the catalogue metrics computed in the background
 * worker (`libraryJob`); the page only writes the seed plan and unpacks
 * the stored versions in slices, so the start screen keeps drawing and
 * reacting while a large library loads. Without workers, or when the worker
 * fails, the page seeds itself as before: the app always starts.
 */
export interface LoadedLibrary {
  readonly assets: readonly Asset[];
  readonly versions: ReadonlyMap<string, AssetVersion>;
}

/** Cells unpacked between two pauses of the page. */
const SLICE_CELLS = 150_000;

/** Reads assets and versions; packed records are unpacked one by one with pauses in between. */
export async function loadLibrary(repo: Repository, onProgress?: (progress: JobProgress) => void): Promise<LoadedLibrary> {
  const [assets, records] = await Promise.all([repo.listAssets(), repo.listVersionRecords ? repo.listVersionRecords() : repo.listVersions()]);
  const versions = new Map<string, AssetVersion>();
  let since = 0;
  for (let i = 0; i < records.length; i++) {
    const v = unpackVersionOrDamaged(records[i]);
    checkSchemaVersion('Version', v);
    versions.set(v.id, v);
    since += v.payload.cells.length;
    if (since >= SLICE_CELLS && i + 1 < records.length) {
      since = 0;
      onProgress?.({ step: 'Bibliothek zusammensetzen', fraction: 0.95 + 0.05 * (i + 1) / records.length });
      await pause();
    }
  }
  return { assets, versions };
}

/** Seeds the shipped catalogue through the worker and adopts its catalogue metrics. */
async function seedInBackground(repo: Repository, options: Pick<JobOptions, 'onProgress' | 'signal'>, attempt = 0): Promise<void> {
  const catalogKey = typeof __CATALOG_KEY__ === 'string' ? __CATALOG_KEY__ : '';
  const [assets, records, cache] = await Promise.all([
    repo.listAssets(), repo.listVersionRecords ? repo.listVersionRecords() : repo.listVersions().then(l => l.map(packVersion)),
    // A cache that cannot be read only costs one rebuild.
    catalogKey && repo.getCatalogCache ? repo.getCatalogCache().catch(() => undefined) : undefined,
  ]);
  const out = await runJob('library', { assets, records, ...(catalogKey && { catalogKey }), ...(cache !== undefined && { cache }) }, {
    ...options,
    // The worker computes up to 95 %, the page then writes and unpacks.
    onProgress: p => options.onProgress?.({ step: p.step, fraction: p.fraction === null ? null : p.fraction * 0.95 }),
  });
  for (const [id, metrics] of out.metrics) catalogMetrics.set(id, metrics);
  markStart(out.source);
  if (out.assets.length || out.versions.length) await writePlan(repo, out, options, attempt);
  if (out.cache && repo.saveCatalogCache) await repo.saveCatalogCache(out.cache).catch(e => console.warn('Katalogspeicher nicht geschrieben:', e));
}

/** Test hook and diagnosis: where the shipped catalogue of this start came from (`cache`, `built`, `direct`). */
function markStart(source: string): void {
  try { document.documentElement.dataset.libraryStart = source; } catch { /* no document (Node) */ }
}

async function writePlan(repo: Repository, out: { assets: LibraryJobOutput['assets']; versions: LibraryJobOutput['versions'] }, options: Pick<JobOptions, 'onProgress' | 'signal'>, attempt: number): Promise<void> {
  options.onProgress?.({ step: 'Neue Katalogeinträge speichern', fraction: 0.95 });
  const versions = out.versions.map(record => {
    const v = unpackVersion(record);
    if (isPackedVersionRecord(record)) {
      // The worker packed exactly these cells: storing reuses its bytes instead of packing again.
      Object.freeze(v.payload.cells);
      rememberPackedCells(v.payload, (record as { packedCells: Parameters<typeof rememberPackedCells>[1] }).packedCells);
    }
    return v;
  });
  try {
    await repo.applyBatch({ assets: out.assets, versions });
  } catch (e) {
    // Another tab seeded at the same time: start over from what is stored now.
    if (e instanceof AssetRevisionConflictError && attempt < 2) return seedInBackground(repo, options, attempt + 1);
    throw e;
  }
}

/** The whole library start: seed (worker or page) and load. */
export async function startLibrary(repo: Repository, options: Pick<JobOptions, 'onProgress' | 'signal'> = {}): Promise<LoadedLibrary> {
  if (!workersAvailable()) { await seedSamples(repo); markStart('direct'); return loadLibrary(repo, options.onProgress); }
  try {
    await seedInBackground(repo, options);
  } catch (e) {
    // A broken worker must never keep the app from starting: seed on the page as before.
    console.warn('Bibliotheksstart im Hintergrund fehlgeschlagen, lade direkt:', e);
    options.onProgress?.({ step: 'Mitgelieferte Gebäude erzeugen (direkt)', fraction: null });
    await pause();
    await seedSamples(repo);
    markStart('direct');
  }
  return loadLibrary(repo, options.onProgress);
}
