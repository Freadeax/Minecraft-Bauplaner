import { canonicalJson } from '../../domain/src/core/hash.js';
import { addAssetVersion, updateAssetMeta } from '../../domain/src/catalog/library.js';
import type { Asset, AssetVersion } from '../../domain/src/core/types.js';

/**
 * Delivery of changed shipped buildings (UPDATE-01). The app ships every
 * catalogue building as one version. When the shipped geometry or connectors
 * of an already stored demo asset differ from every catalogue version stored
 * for it, the new geometry is appended as the next version ("2.0", "3.0", …).
 * Nothing is replaced or removed and no project is switched: projects keep
 * their fixed versions and see the new one in their "Updates" tab.
 */
export interface CatalogShipment { readonly assets: readonly Asset[]; readonly versions: readonly AssetVersion[] }
export interface CatalogDelivery {
  /** Stored assets with the new version id appended (CAS base = stored revision). */
  readonly assets: readonly Asset[];
  readonly versions: readonly AssetVersion[];
  /** Asset id → label of the delivered version. */
  readonly delivered: ReadonlyMap<string, string>;
}

const sameContent = (a: Pick<AssetVersion, 'payloadHash' | 'connectors'>, b: Pick<AssetVersion, 'payloadHash' | 'connectors'>): boolean =>
  a.payloadHash === b.payloadHash && canonicalJson(a.connectors) === canonicalJson(b.connectors);

/** Shipped versions whose id is not among the stored asset's versions: the only case that needs stored versions. */
export function catalogCandidates(stored: ReadonlyMap<string, Asset>, shipped: CatalogShipment): AssetVersion[] {
  return shipped.versions.filter(v => {
    const s = stored.get(v.assetId);
    return !!s?.demo && !s.versionIds.includes(v.id);
  });
}

/** Next free "N.0" label after every label already used by the asset. */
export function nextReleaseLabel(asset: Asset, versions: ReadonlyMap<string, AssetVersion>): string {
  const labels = new Set(asset.versionIds.map(id => versions.get(id)?.label).filter((l): l is string => !!l));
  let n = Math.max(asset.versionIds.length, ...[...labels].map(l => /^(\d+)\.0$/.exec(l)?.[1]).filter(Boolean).map(Number)) + 1;
  while (labels.has(`${n}.0`)) n++;
  return `${n}.0`;
}

/**
 * Plans the delivery. `storedVersions` must contain the versions of every
 * candidate asset. A geometry that is already stored as a catalogue version
 * (source "demo") is not delivered again, so returning to an older catalogue
 * state does not create duplicates either.
 */
export async function planCatalogDelivery(stored: ReadonlyMap<string, Asset>, storedVersions: ReadonlyMap<string, AssetVersion>, shipped: CatalogShipment): Promise<CatalogDelivery> {
  const assets: Asset[] = [], versions: AssetVersion[] = [], delivered = new Map<string, string>();
  for (const v of catalogCandidates(stored, shipped)) {
    const asset = stored.get(v.assetId)!;
    const known = asset.versionIds.map(id => storedVersions.get(id)).some(s => s && s.source.format === 'demo' && sameContent(s, v));
    if (known) continue;
    const label = nextReleaseLabel(asset, storedVersions);
    const r = await addAssetVersion(asset, { payload: v.payload, label, connectors: v.connectors, source: { format: 'demo' } });
    assets.push(r.asset); versions.push(r.version); delivered.set(asset.id, label);
  }
  return { assets, versions, delivered };
}

export interface SeedPlan {
  /** New shipped assets, demo assets with refreshed metadata and assets with a delivered version (CAS base = stored revision). */
  readonly assets: readonly Asset[];
  /** Versions of the new assets plus delivered versions. */
  readonly versions: readonly AssetVersion[];
}

/**
 * What seeding the shipped catalogue writes (B9, UPDATE-01, PERF-04-S05): every
 * shipped asset that is not stored yet with its versions, shipped metadata
 * (description, tags) for stored demo assets, and delivered new geometry.
 * Never overwrites user assets, archive state or version lists. Stored
 * versions are only read when a delivery candidate exists. Empty plan = nothing to write.
 * Shared by the page (`seedSamples`) and the start in the background worker.
 */
export async function planSeed(stored: ReadonlyMap<string, Asset>, storedVersions: () => Promise<ReadonlyMap<string, AssetVersion>>, shipments: readonly CatalogShipment[]): Promise<SeedPlan> {
  const shipped = shipments.flatMap(l => l.assets), versions = shipments.flatMap(l => l.versions);
  const added = shipped.filter(a => !stored.has(a.id));
  const current = new Map(stored);
  for (const a of shipped) {
    const s = stored.get(a.id);
    if (s?.demo && (s.description !== a.description || s.tags.join('|') !== a.tags.join('|'))) current.set(a.id, updateAssetMeta(s, { description: a.description, tags: a.tags }));
  }
  const shipment = { assets: shipped, versions };
  const delivery = catalogCandidates(current, shipment).length ? await planCatalogDelivery(current, await storedVersions(), shipment) : { assets: [], versions: [] };
  for (const a of delivery.assets) current.set(a.id, a);
  const changed = [...current.values()].filter(a => a !== stored.get(a.id));
  if (!added.length && !changed.length) return { assets: [], versions: [] };
  return { assets: [...added, ...changed], versions: [...versions.filter(v => added.some(a => a.id === v.assetId)), ...delivery.versions] };
}
