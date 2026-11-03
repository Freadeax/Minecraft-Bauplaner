import { analyzeVersion, createBuildingLibrary, createCommunityLibrary, createSampleLibrary, latestReleaseId, packVersion } from '../../domain/src/index.js';
import type { Asset, AssetVersion, BuildingMetrics } from '../../domain/src/index.js';
import type { PackedVersionRecord, StoredVersionRecord } from '../../domain/src/versionStorage.js';

/**
 * Mitgelieferter Katalog als fertige Datei (PERF-05).
 *
 * Der erste Start eines neuen App-Stands hat bisher alle mitgelieferten Gebäude im
 * Worker erzeugt (Generatoren, Hashes, Kennwerte): auf einem schnellen Rechner rund
 * 5 s, auf einem langsamen deutlich mehr – und das nach jeder Veröffentlichung neu,
 * weil der Katalogschlüssel jede Kernänderung erfasst. Dieselbe Rechnung läuft jetzt
 * einmal beim Bauen der Seite (`scripts/build_catalog_snapshot.mjs`); der Browser lädt
 * das Ergebnis als eine Datei und rechnet nur noch, wenn sie fehlt oder nicht passt.
 *
 * Die Datei gilt nur für genau einen Katalogschlüssel (`__CATALOG_KEY__`, Fingerabdruck
 * des Kerncodes): gleicher Schlüssel = gleicher Code = gleiche Geometrie, Hashes und
 * Kennwerte. Jede Abweichung, jeder Lese- oder Formatfehler heißt: selbst erzeugen wie
 * bisher. Der Start hängt also nie von der Datei ab.
 */
export const CATALOG_SNAPSHOT_FORMAT = 'bp-catalog-snapshot-1';

/** Der mitgelieferte Katalog: Beispielmodule, Gebäude, feste Bibliotheksbeiträge. */
export interface CatalogShipmentParts {
  readonly assets: readonly Asset[];
  readonly versions: readonly AssetVersion[];
}

/** Erzeugt den mitgelieferten Katalog, genau wie der Bibliotheksstart ihn braucht (Reihenfolge: Beispiele, Gebäude, Beiträge). */
export async function buildShippedCatalog(onProgress?: (step: string, fraction: number) => void, onFailed?: (id: string, reason: string) => void): Promise<CatalogShipmentParts> {
  const samples = await createSampleLibrary();
  const buildings = await createBuildingLibrary((done, total) => onProgress?.('Mitgelieferte Gebäude erzeugen', done / total));
  const community = await createCommunityLibrary(undefined, (done, total) => onProgress?.('Bibliotheksbeiträge lesen', done / total));
  for (const f of community.failed) onFailed?.(f.id, f.reason);
  return { assets: [...samples.assets, ...buildings.assets, ...community.assets], versions: [...samples.versions, ...buildings.versions, ...community.versions] };
}

/** Kennwerte der jeweils neuesten Freigabe jedes Assets, nach Versions-id. */
export function shipmentMetrics(shipment: CatalogShipmentParts): [string, BuildingMetrics][] {
  const versions = new Map(shipment.versions.map(v => [v.id, v]));
  const metrics: [string, BuildingMetrics][] = [];
  for (const asset of shipment.assets) {
    const version = versions.get(latestReleaseId(asset, versions) ?? '');
    if (version) metrics.push([version.id, analyzeVersion(version)]);
  }
  return metrics;
}

interface SnapshotVersion extends Omit<PackedVersionRecord, 'packedCells'> {
  readonly packedCells: { readonly encoding: PackedVersionRecord['packedCells']['encoding']; readonly count: number; readonly offset: number; readonly length: number };
}
/** Dateiform: JSON-Kopf; die gepackten Blockbytes aller Versionen liegen hintereinander in `cells` (Base64). */
export interface CatalogSnapshotFile {
  readonly format: typeof CATALOG_SNAPSHOT_FORMAT;
  readonly key: string;
  readonly assets: readonly Asset[];
  readonly versions: readonly (AssetVersion | SnapshotVersion)[];
  readonly metrics: readonly (readonly [string, BuildingMetrics])[];
  readonly cells: string;
}

/** Schreibt die Datei (Bauzeit). `toBase64` kommt vom Aufrufer (Node: Buffer, Browser: btoa). */
export function writeCatalogSnapshot(key: string, shipment: CatalogShipmentParts, metrics: readonly (readonly [string, BuildingMetrics])[], toBase64: (bytes: Uint8Array) => string): CatalogSnapshotFile {
  const chunks: Uint8Array[] = [];
  let offset = 0;
  const versions = shipment.versions.map(v => {
    const stored = packVersion(v);
    if (!('packedCells' in stored)) return stored;
    const { encoding, count, bytes } = stored.packedCells;
    chunks.push(bytes);
    const record: SnapshotVersion = { ...stored, packedCells: { encoding, count, offset, length: bytes.length } };
    offset += bytes.length;
    return record;
  });
  const all = new Uint8Array(offset);
  let at = 0;
  for (const c of chunks) { all.set(c, at); at += c.length; }
  return { format: CATALOG_SNAPSHOT_FORMAT, key, assets: shipment.assets, versions, metrics, cells: toBase64(all) };
}

/** Was der Bibliotheksstart aus einer passenden Datei übernimmt: dieselbe Form wie der Katalogspeicher. */
export interface CatalogSnapshot {
  readonly key: string;
  readonly assets: readonly Asset[];
  readonly versions: readonly StoredVersionRecord[];
  readonly metrics: readonly (readonly [string, BuildingMetrics])[];
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Liest die Datei; null bei anderem Schlüssel, anderem Format oder kaputtem Aufbau.
 * Die Versionen kommen in Speicherform zurück (eigene Bytes je Version), damit der
 * Start sie ohne erneutes Packen ablegen kann. Inhaltlich geprüft wird das Ergebnis
 * dort wie der Katalogspeicher (`fromCache` in libraryJob.ts): jede Version entpackt,
 * jede Asset-Referenz aufgelöst, jeder Fehler = selbst erzeugen.
 */
export function readCatalogSnapshot(raw: unknown, key: string, fromBase64: (text: string) => Uint8Array): CatalogSnapshot | null {
  if (!key || !isObj(raw) || raw.format !== CATALOG_SNAPSHOT_FORMAT || raw.key !== key) return null;
  if (!Array.isArray(raw.assets) || !Array.isArray(raw.versions) || !Array.isArray(raw.metrics) || typeof raw.cells !== 'string') return null;
  try {
    const bytes = fromBase64(raw.cells);
    const versions: StoredVersionRecord[] = raw.versions.map((r: unknown) => {
      if (!isObj(r) || !isObj(r.packedCells)) return r as AssetVersion;
      const { offset, length, encoding, count } = r.packedCells;
      if (typeof offset !== 'number' || typeof length !== 'number' || offset < 0 || length < 0 || offset + length > bytes.length) throw new Error('Blockbytes außerhalb der Datei');
      // Eigene Kopie je Version: die Puffer werden später einzeln an die Seite übergeben.
      return { ...r, packedCells: { encoding, count, bytes: bytes.slice(offset, offset + length) } } as unknown as PackedVersionRecord;
    });
    const metrics = raw.metrics.filter((e: unknown): e is [string, BuildingMetrics] => Array.isArray(e) && typeof e[0] === 'string' && isObj(e[1]));
    return { key, assets: raw.assets as Asset[], versions, metrics };
  } catch {
    return null;
  }
}
