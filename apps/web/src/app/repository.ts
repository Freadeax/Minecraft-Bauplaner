import { createBuildingLibrary, createSampleLibrary, updateAssetMeta } from '../../../../packages/domain/src/index.js';
import type { Repository } from '../../../../packages/application/src/repository.js';
import { MemoryRepository } from '../../../../packages/application/src/memoryRepository.js';
import { AssetRevisionConflictError } from '../../../../packages/application/src/repository.js';
export type { Repository, StorageBatch, StorageChange, StorageInfo } from '../../../../packages/application/src/repository.js';
export { RevisionConflictError, AssetRevisionConflictError } from '../../../../packages/application/src/repository.js';
export { MemoryRepository } from '../../../../packages/application/src/memoryRepository.js';

/**
 * Adds the synthetic sample modules and building suggestions (B9) once; never
 * overwrites user assets. Shipped demo assets that are already stored only get
 * their catalogue metadata (description, tags) refreshed; versions, archive
 * state and ids stay untouched, so projects keep their versions.
 */
export async function seedSamples(repo: Repository, attempt = 0): Promise<void> {
  const stored = new Map((await repo.listAssets()).map(a => [a.id, a]));
  const [samples, buildings] = await Promise.all([createSampleLibrary(), createBuildingLibrary()]);
  const shipped = [...samples.assets, ...buildings.assets], versions = [...samples.versions, ...buildings.versions];
  const assets = shipped.filter(a => !stored.has(a.id));
  const refreshed = shipped.flatMap(a => {
    const s = stored.get(a.id);
    return s?.demo && (s.description !== a.description || s.tags.join('|') !== a.tags.join('|')) ? [updateAssetMeta(s, { description: a.description, tags: a.tags })] : [];
  });
  if (assets.length || refreshed.length) {
    try { await repo.applyBatch({ assets: [...assets, ...refreshed], versions: versions.filter(v => assets.some(a => a.id === v.assetId)) }); }
    catch (e) {
      // Two tabs may seed the same catalogue concurrently. Re-read, preserving
      // the current archive state and version list instead of retrying stale data.
      if (e instanceof AssetRevisionConflictError && attempt < 2) return seedSamples(repo, attempt + 1);
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
