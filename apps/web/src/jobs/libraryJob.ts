import { analyzeVersion, checkAssetRecord, createBuildingLibrary, createSampleLibrary, latestReleaseId, packVersion, unpackVersionOrDamaged } from '../../../../packages/domain/src/index.js';
import type { Asset, AssetVersion, BuildingMetrics } from '../../../../packages/domain/src/index.js';
import type { StoredVersionRecord } from '../../../../packages/domain/src/versionStorage.js';
import { planSeed } from '../../../../packages/application/src/catalogSync.js';
import type { JobContext } from './protocol';

/**
 * The library part of the app start in the background (PERF-04-S05). Before,
 * the page built all shipped buildings (hashing every one), planned the
 * catalogue delivery and analysed every latest version for the catalogue
 * on the main thread: several seconds without input or drawing, longer with
 * large own buildings. Here the worker
 * - builds the shipped catalogue (samples and buildings),
 * - unpacks the stored records it was given (cells packed, cheap to copy),
 * - plans what seeding writes (`planSeed`, the same function as `seedSamples`),
 * - computes the catalogue metrics of every asset's latest release.
 * The page writes the plan itself (revision checks stay in one place) and
 * only adopts the metrics; versions are immutable, so metrics by id never go stale.
 */
export interface LibraryJobInput {
  readonly assets: readonly unknown[];
  /** Stored version records as IndexedDB holds them (cells packed). */
  readonly records: readonly unknown[];
}
export interface LibraryJobOutput {
  /** Assets to write (CAS base = the stored revision the page sent). */
  readonly assets: readonly Asset[];
  /** Versions to write, in storage form (cells packed when exact). */
  readonly versions: readonly StoredVersionRecord[];
  /** Catalogue metrics by version id for the latest release of every asset after seeding. */
  readonly metrics: readonly (readonly [string, BuildingMetrics])[];
}

export async function libraryJob(input: LibraryJobInput, ctx: JobContext): Promise<LibraryJobOutput> {
  ctx.progress('Mitgelieferte Gebäude erzeugen', 0);
  const samples = await createSampleLibrary();
  const buildings = await createBuildingLibrary((done, total) => ctx.progress('Mitgelieferte Gebäude erzeugen', 0.55 * done / total));
  ctx.progress('Gespeicherte Versionen lesen', 0.55);
  const stored = new Map(input.assets.map(raw => { const a = checkAssetRecord(raw); return [a.id, a] as const; }));
  const versions = new Map<string, AssetVersion>();
  input.records.forEach((raw, i) => {
    const v = unpackVersionOrDamaged(raw);
    versions.set(v.id, v);
    ctx.progress('Gespeicherte Versionen lesen', 0.55 + 0.1 * (i + 1) / input.records.length);
  });
  ctx.progress('Katalog abgleichen', 0.65);
  const plan = await planSeed(stored, async () => versions, [samples, buildings]);
  const assets = new Map(stored);
  for (const a of plan.assets) assets.set(a.id, a);
  for (const v of plan.versions) versions.set(v.id, v);
  const metrics: [string, BuildingMetrics][] = [];
  let done = 0;
  for (const asset of assets.values()) {
    const version = versions.get(latestReleaseId(asset, versions) ?? '');
    if (version) metrics.push([version.id, analyzeVersion(version)]);
    ctx.progress('Kennwerte für den Katalog berechnen', 0.7 + 0.25 * ++done / assets.size);
  }
  ctx.progress('Übergabe vorbereiten', 0.95);
  const packed = plan.versions.map(packVersion);
  ctx.transfer(packed.flatMap(r => 'packedCells' in r ? [r.packedCells.bytes.buffer as ArrayBuffer] : []));
  return { assets: plan.assets, versions: packed, metrics };
}
