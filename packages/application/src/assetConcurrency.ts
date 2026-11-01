import { checkAssetRecord } from '../../domain/src/backup.js';
import { checkLibraryBatch } from '../../domain/src/collections.js';
import type { Asset } from '../../domain/src/types.js';
import type { StorageBatch } from './repository.js';
import { AssetRevisionConflictError } from './repository.js';

/** Legacy records without the additive revision field have base zero. Never coerce malformed values. */
export function assetRevision(asset: Pick<Asset, 'revision'>): number {
  const revision = asset.revision === undefined ? 0 : asset.revision;
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error('Ungültige Assetrevision: erwartet wird eine nichtnegative sichere Ganzzahl.');
  return revision;
}

/** Reject duplicate operations before reading or changing any store. */
export function checkAssetBatch(assets: readonly Asset[]): void {
  const ids = new Set<string>();
  for (const asset of assets) {
    checkAssetRecord(asset);
    if (ids.has(asset.id)) throw new Error(`Bauteil ${asset.id} kommt doppelt in derselben Speichertransaktion vor.`);
    ids.add(asset.id);
    const base = assetRevision(asset);
    if (base === Number.MAX_SAFE_INTEGER) throw new Error(`Assetrevision von ${asset.id} kann nicht weiter erhöht werden.`);
  }
}

/** CAS decision only; the storage adapter applies the result atomically with all related writes. */
export function nextAssetRevision(asset: Asset, stored: Asset | undefined): Asset {
  const base = assetRevision(asset), current = stored === undefined ? 0 : assetRevision(stored);
  if (base !== current) throw new AssetRevisionConflictError(asset.id, current, base);
  if (base === Number.MAX_SAFE_INTEGER) throw new Error(`Assetrevision von ${asset.id} kann nicht weiter erhöht werden.`);
  return { ...asset, revision: base + 1 };
}

/** A transaction must not make multiple decisions against the same old row. */
export function checkStorageBatch(batch: StorageBatch): void {
  checkAssetBatch(batch.assets ?? []);
  const unique = (ids: readonly string[], label: string) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) throw new Error(`${label} ${id} kommt doppelt in derselben Speichertransaktion vor.`);
      seen.add(id);
    }
  };
  unique((batch.versions ?? []).map(v => v.id), 'Version');
  unique((batch.projects ?? []).map(p => p.project.id), 'Projekt');
  unique((batch.originals ?? []).map(o => o.sha256), 'Original');
  checkLibraryBatch(batch.collections ?? [], batch.templates ?? []);
  unique([...(batch.collections ?? []), ...(batch.removeCollections ?? [])].map(c => c.id), 'Sammlung');
  unique([...(batch.templates ?? []), ...(batch.removeTemplates ?? [])].map(t => t.id), 'Vorlage');
}
