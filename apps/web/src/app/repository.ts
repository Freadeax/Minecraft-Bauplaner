import type { Repository } from '../../../../packages/application/src/repository.js';
import { MemoryRepository } from '../../../../packages/application/src/memoryRepository.js';
import { AssetRevisionConflictError } from '../../../../packages/application/src/repository.js';
import { planSeed } from '../../../../packages/application/src/catalogSync.js';
import type { CatalogShipment } from '../../../../packages/application/src/catalogSync.js';
export type { Repository, StorageBatch, StorageChange, StorageInfo } from '../../../../packages/application/src/repository.js';
export { RevisionConflictError, AssetRevisionConflictError, WorldPlanConflictError } from '../../../../packages/application/src/repository.js';
export { MemoryRepository } from '../../../../packages/application/src/memoryRepository.js';

/**
 * Adds the synthetic sample modules and building suggestions (B9) once; never
 * overwrites user assets. Shipped demo assets that are already stored only get
 * their catalogue metadata (description, tags) refreshed. When the shipped
 * geometry of a stored building changed, it is appended as a new version
 * (UPDATE-01, catalogSync.ts); existing versions, archive state and ids stay
 * untouched, so projects keep their versions until the user updates them.
 */
export async function seedSamples(repo: Repository, attempt = 0, shipment?: CatalogShipment): Promise<void> {
  const stored = new Map((await repo.listAssets()).map(a => [a.id, a]));
  // Only the fallback without worker builds here; loaded on demand so the page bundle does not carry every building set (PERF-05).
  const libs = shipment ? [shipment] : [await (await import('../../../../packages/application/src/catalogSnapshot.js')).buildShippedCatalog()];
  const plan = await planSeed(stored, async () => new Map((await repo.listVersions()).map(v => [v.id, v])), libs);
  if (!plan.assets.length && !plan.versions.length) return;
  try {
    await repo.applyBatch(plan);
  } catch (e) {
    // Two tabs may seed the same catalogue concurrently. Re-read, preserving
    // the current archive state and version list instead of retrying stale data.
    if (e instanceof AssetRevisionConflictError && attempt < 2) return seedSamples(repo, attempt + 1, shipment);
    throw e;
  }
}

/**
 * IndexedDB when available; otherwise a clearly labelled session store. A
 * database from a newer app version is an error, never silently replaced.
 * `seed: false` leaves seeding the shipped catalogue to the caller (the app
 * start does it in the background worker, PERF-04-S05).
 */
export async function openRepository({ seed = true }: { readonly seed?: boolean } = {}): Promise<Repository> {
  let repo: Repository;
  try {
    const { openIdbRepository } = await import('./idbRepository');
    repo = await openIdbRepository();
  } catch (e) {
    if (e instanceof Error && (e.name === 'StorageNewerError' || e.name === 'StorageMigrationError')) throw e;
    repo = new MemoryRepository(`Dauerhafter Browserspeicher nicht verfügbar (${e instanceof Error ? e.message : String(e)}). Projekte gelten nur für diese Sitzung – bitte Sicherungen herunterladen.`);
  }
  if (seed) await seedSamples(repo);
  return repo;
}
