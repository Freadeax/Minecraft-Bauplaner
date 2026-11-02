import { createBuildingLibrary, createSampleLibrary, updateAssetMeta } from '../../../../packages/domain/src/index.js';
import type { Repository } from '../../../../packages/application/src/repository.js';
import { MemoryRepository } from '../../../../packages/application/src/memoryRepository.js';
import { AssetRevisionConflictError } from '../../../../packages/application/src/repository.js';
import { catalogCandidates, planCatalogDelivery } from '../../../../packages/application/src/catalogSync.js';
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
  const libs = shipment ? [shipment] : await Promise.all([createSampleLibrary(), createBuildingLibrary()]);
  const shipped = libs.flatMap(l => l.assets), versions = libs.flatMap(l => l.versions);
  const assets = shipped.filter(a => !stored.has(a.id));
  const current = new Map(stored);
  for (const a of shipped) {
    const s = stored.get(a.id);
    if (s?.demo && (s.description !== a.description || s.tags.join('|') !== a.tags.join('|'))) current.set(a.id, updateAssetMeta(s, { description: a.description, tags: a.tags }));
  }
  const candidates = catalogCandidates(current, { assets: shipped, versions });
  const delivery = candidates.length
    ? await planCatalogDelivery(current, new Map((await repo.listVersions()).map(v => [v.id, v])), { assets: shipped, versions })
    : { assets: [], versions: [] };
  for (const a of delivery.assets) current.set(a.id, a);
  const changed = [...current.values()].filter(a => a !== stored.get(a.id));
  if (assets.length || changed.length) {
    try {
      await repo.applyBatch({ assets: [...assets, ...changed], versions: [...versions.filter(v => assets.some(a => a.id === v.assetId)), ...delivery.versions] });
    } catch (e) {
      // Two tabs may seed the same catalogue concurrently. Re-read, preserving
      // the current archive state and version list instead of retrying stale data.
      if (e instanceof AssetRevisionConflictError && attempt < 2) return seedSamples(repo, attempt + 1, shipment);
      throw e;
    }
  }
}

/**
 * IndexedDB when available; otherwise a clearly labelled session store. A
 * database from a newer app version is an error, never silently replaced.
 */
export async function openRepository(): Promise<Repository> {
  let repo: Repository;
  try {
    const { openIdbRepository } = await import('./idbRepository');
    repo = await openIdbRepository();
  } catch (e) {
    if (e instanceof Error && (e.name === 'StorageNewerError' || e.name === 'StorageMigrationError')) throw e;
    repo = new MemoryRepository(`Dauerhafter Browserspeicher nicht verfügbar (${e instanceof Error ? e.message : String(e)}). Projekte gelten nur für diese Sitzung – bitte Sicherungen herunterladen.`);
  }
  await seedSamples(repo);
  return repo;
}
