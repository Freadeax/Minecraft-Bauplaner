import { analyzeVersion, checkAssetRecord, latestReleaseId, packVersion, unpackVersion, unpackVersionOrDamaged } from '../../../../packages/domain/src/index.js';
import type { Asset, AssetVersion, BuildingMetrics } from '../../../../packages/domain/src/index.js';
import type { StoredVersionRecord } from '../../../../packages/domain/src/data/versionStorage.js';
import { planSeed } from '../../../../packages/application/src/catalogSync.js';
import { buildShippedCatalog, readCatalogSnapshot } from '../../../../packages/application/src/catalogSnapshot.js';
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
  /** Fingerprint of the app's core code (`__CATALOG_KEY__`); empty = no catalogue cache (dev server, Node). */
  readonly catalogKey?: string;
  /** The stored catalogue cache, unchecked; used only when its key equals `catalogKey`. */
  readonly cache?: unknown;
  /**
   * Address of the catalogue file built with the page (PERF-05, `assets/catalog-<key>.json`).
   * Read only when the stored cache does not match; any failure means building as before.
   */
  readonly snapshotUrl?: string;
}

/**
 * Catalogue cache (PERF-04-S07), one record in the `meta` store: the shipped
 * catalogue as the worker built it for one app version (cells packed) and the
 * catalogue metrics by version id. Shipped geometry and metrics depend only on
 * the core code, which `key` fingerprints, so a matching cache gives exactly
 * what building would give; any other key, or a damaged record, means build again.
 */
export interface CatalogCache {
  readonly key: string;
  readonly assets: readonly Asset[];
  readonly versions: readonly StoredVersionRecord[];
  readonly metrics: readonly (readonly [string, BuildingMetrics])[];
}
export interface LibraryJobOutput {
  /** Assets to write (CAS base = the stored revision the page sent). */
  readonly assets: readonly Asset[];
  /** Versions to write, in storage form (cells packed when exact). */
  readonly versions: readonly StoredVersionRecord[];
  /** Catalogue metrics by version id for the latest release of every asset after seeding. */
  readonly metrics: readonly (readonly [string, BuildingMetrics])[];
  /** Where the shipped catalogue came from: stored cache, catalogue file of the page (PERF-05) or built here. */
  readonly source: 'cache' | 'snapshot' | 'built';
  /** New cache record to store, when the key is set and anything was (re)computed. */
  readonly cache?: CatalogCache;
}

/** The shipped catalogue and known metrics from a matching cache, or null (other app version, damaged record). */
function fromCache(input: Pick<LibraryJobInput, 'catalogKey' | 'cache'>): { shipment: { assets: Asset[]; versions: AssetVersion[] }; records: StoredVersionRecord[]; metrics: Map<string, BuildingMetrics> } | null {
  const c = input.cache as Partial<CatalogCache> | null | undefined;
  if (!input.catalogKey || !c || typeof c !== 'object' || c.key !== input.catalogKey || !Array.isArray(c.assets) || !Array.isArray(c.versions) || !Array.isArray(c.metrics)) return null;
  try {
    const versions = c.versions.map(unpackVersion);
    const assets = c.assets.map(checkAssetRecord);
    const ids = new Set(versions.map(v => v.id));
    if (!versions.every(v => typeof v.id === 'string' && Array.isArray(v.payload?.cells)) || !assets.every(a => a.versionIds.every(id => ids.has(id)))) return null;
    const metrics = new Map<string, BuildingMetrics>();
    for (const entry of c.metrics) if (Array.isArray(entry) && typeof entry[0] === 'string' && entry[1] && typeof entry[1] === 'object') metrics.set(entry[0], entry[1]);
    return { shipment: { assets, versions }, records: [...c.versions], metrics };
  } catch { return null; }
}

/** Base64 to bytes; the native decoder where the browser has one. */
function fromBase64(text: string): Uint8Array {
  const native = (Uint8Array as unknown as { fromBase64?: (t: string) => Uint8Array }).fromBase64;
  if (native) return native(text);
  const bin = atob(text), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** How long the catalogue file may take before the worker builds the catalogue itself. */
const SNAPSHOT_TIMEOUT_MS = 20_000;

/** The catalogue file of the page as a cache record, or null (missing, other key, damaged, slow): then build as before. */
async function loadSnapshot(url: string, key: string): Promise<unknown> {
  const abort = new AbortController(), timer = setTimeout(() => abort.abort(), SNAPSHOT_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: abort.signal, cache: 'no-cache' });
    if (!res.ok) { console.warn(`Katalogdatei nicht geladen (${res.status}), Katalog wird erzeugt.`); return null; }
    const snapshot = readCatalogSnapshot(await res.json(), key, fromBase64);
    if (!snapshot) console.warn('Katalogdatei passt nicht zu diesem App-Stand, Katalog wird erzeugt.');
    return snapshot;
  } catch (e) {
    console.warn('Katalogdatei nicht lesbar, Katalog wird erzeugt:', e);
    return null;
  } finally { clearTimeout(timer); }
}

export async function libraryJob(input: LibraryJobInput, ctx: JobContext): Promise<LibraryJobOutput> {
  ctx.progress('Gespeicherten Katalog prüfen', 0);
  let cached = fromCache(input), fromSnapshot = false;
  if (!cached && input.catalogKey && input.snapshotUrl) {
    ctx.progress('Mitgelieferten Katalog laden', 0);
    cached = fromCache({ catalogKey: input.catalogKey, cache: await loadSnapshot(input.snapshotUrl, input.catalogKey) });
    fromSnapshot = !!cached;
  }
  let shipment: { assets: readonly Asset[]; versions: readonly AssetVersion[] }, shippedRecords: StoredVersionRecord[] | null = null;
  if (cached) { shipment = cached.shipment; shippedRecords = cached.records; }
  else {
    ctx.progress('Mitgelieferte Gebäude erzeugen', 0);
    // Fixed contributions (LIB-06) are checked again in there; a broken one is left out and named in the console, never stops the start.
    shipment = await buildShippedCatalog(
      (step, fraction) => ctx.progress(step, step === 'Bibliotheksbeiträge lesen' ? 0.5 + 0.05 * fraction : 0.5 * fraction),
      (id, reason) => console.warn(`Bibliotheksbeitrag ${id} nicht geladen: ${reason}`));
  }
  ctx.progress('Gespeicherte Versionen lesen', 0.55);
  const stored = new Map(input.assets.map(raw => { const a = checkAssetRecord(raw); return [a.id, a] as const; }));
  const versions = new Map<string, AssetVersion>();
  input.records.forEach((raw, i) => {
    const v = unpackVersionOrDamaged(raw);
    versions.set(v.id, v);
    ctx.progress('Gespeicherte Versionen lesen', 0.55 + 0.1 * (i + 1) / input.records.length);
  });
  ctx.progress('Katalog abgleichen', 0.65);
  const plan = await planSeed(stored, async () => versions, [shipment]);
  const assets = new Map(stored);
  for (const a of plan.assets) assets.set(a.id, a);
  for (const v of plan.versions) versions.set(v.id, v);
  const known = cached?.metrics ?? new Map<string, BuildingMetrics>();
  const metrics: [string, BuildingMetrics][] = [];
  let done = 0, computed = 0;
  for (const asset of assets.values()) {
    const version = versions.get(latestReleaseId(asset, versions) ?? '');
    if (version) {
      let m = known.get(version.id);
      if (!m) { m = analyzeVersion(version); computed++; }
      metrics.push([version.id, m]);
    }
    ctx.progress('Kennwerte für den Katalog berechnen', 0.7 + 0.25 * ++done / assets.size);
  }
  ctx.progress('Übergabe vorbereiten', 0.95);
  // A catalogue from the page's file is stored as the cache, so the next start reads it locally.
  const wantCache = !!input.catalogKey && (!cached || computed > 0 || fromSnapshot);
  if (wantCache && !shippedRecords) shippedRecords = shipment.versions.map(packVersion);
  // Versions of new shipped assets reuse the packed shipment record; delivered versions are packed here.
  const byId = new Map((shippedRecords ?? []).map(r => [r.id, r]));
  const packed = plan.versions.map(v => byId.get(v.id) ?? packVersion(v));
  const cache: CatalogCache | undefined = wantCache ? { key: input.catalogKey!, assets: shipment.assets, versions: shippedRecords!, metrics } : undefined;
  const buffers = new Set<ArrayBuffer>();
  for (const r of [...packed, ...(cache?.versions ?? [])]) if ('packedCells' in r) buffers.add(r.packedCells.bytes.buffer as ArrayBuffer);
  ctx.transfer([...buffers]);
  return { assets: plan.assets, versions: packed, metrics, source: fromSnapshot ? 'snapshot' : cached ? 'cache' : 'built', ...(cache && { cache }) };
}
