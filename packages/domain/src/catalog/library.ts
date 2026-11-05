import { adoptPayload, createPayload, isSealedPayload, validatePayload } from '../../../voxel/src/validation.js';
import { assertVec3 } from '../../../voxel/src/validation.js';
import type { Bounds, VoxelPayload } from '../../../voxel/src/types.js';
import { canonicalJson, newId, sha256Hex } from '../core/hash.js';
import { DomainError } from '../core/types.js';
import type { Asset, AssetVersion, AssetVersionSource, Connector, Provenance } from '../core/types.js';

const now = (): string => new Date().toISOString();

function text(value: unknown, field: string, max = 200, required = false): string {
  if (typeof value !== 'string' || value.length > max) throw new DomainError('INVALID', `${field}: Text bis ${max} Zeichen erwartet`);
  if (required && !value.trim()) throw new DomainError('INVALID', `${field}: Angabe erforderlich`);
  return value.trim();
}

export interface NewAssetInput {
  readonly name: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly provenance: Provenance;
  readonly demo?: boolean;
  readonly id?: string;
}

export function createAsset(input: NewAssetInput): Asset {
  const tags = [...new Set((input.tags ?? []).map(t => text(t, 'Tag', 40).toLowerCase()).filter(Boolean))].sort();
  const at = now();
  return Object.freeze({
    schemaVersion: 1, id: input.id ?? newId('asset'), revision: 0, name: text(input.name, 'Name', 120, true),
    description: text(input.description ?? '', 'Beschreibung', 2000), tags: Object.freeze(tags),
    provenance: Object.freeze({
      author: text(input.provenance.author, 'Autor', 120), source: text(input.provenance.source, 'Herkunft', 300),
      license: text(input.provenance.license, 'Nutzungsrechte', 300) || 'ungeklärt',
    }),
    archived: false, demo: input.demo ?? false, versionIds: Object.freeze([]), createdAt: at, updatedAt: at,
  });
}

/** Structural connector check. Geometric rules (face, orientation) belong to connectors.ts. */
export function checkConnectorShape(connectors: readonly Connector[]): void {
  const ids = new Set<string>();
  connectors.forEach((c, i) => {
    const path = `connectors[${i}]`;
    text(c.id, `${path}.id`, 60, true); text(c.type, `${path}.type`, 60, true); text(c.profile, `${path}.profile`, 60, true);
    if (ids.has(c.id)) throw new DomainError('INVALID', `${path}: doppelte Anschluss-ID ${c.id}`);
    ids.add(c.id);
    assertVec3(c.position, `${path}.position`); assertVec3(c.normal, `${path}.normal`); assertVec3(c.up, `${path}.up`);
    if (c.maxLinks !== undefined && (!Number.isSafeInteger(c.maxLinks) || c.maxLinks < 1)) throw new DomainError('INVALID', `${path}.maxLinks: positive Ganzzahl erwartet`);
    if (c.handedness !== undefined && c.handedness !== 'left' && c.handedness !== 'right') throw new DomainError('INVALID', `${path}.handedness: left oder right erwartet`);
  });
}

/**
 * `canonicalJson(payload)` with a fast path for the usual cell shapes (SIZE-01: the generic walk sorted the
 * keys of a million cell objects and took 4 s per saved version). Gives exactly the same text, so stored
 * payload hashes and version ids stay valid; any other cell shape goes through canonicalJson.
 */
export function canonicalPayloadJson(payload: VoxelPayload): string {
  const keys = Object.keys(payload).filter(k => (payload as unknown as Record<string, unknown>)[k] !== undefined).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}:${k === 'cells' && Array.isArray(payload.cells) ? `[${payload.cells.map(cellJson).join(',')}]` : canonicalJson((payload as unknown as Record<string, unknown>)[k])}`).join(',')}}`;
}
function cellJson(cell: unknown): string {
  const c = cell as { kind?: unknown; paletteIndex?: unknown; position?: unknown } | null;
  if (c && typeof c === 'object' && !Array.isArray(c)) {
    let n = 0;
    for (const key in c) { n++; if (key !== 'kind' && key !== 'paletteIndex' && key !== 'position') { n = -1; break; } }
    const p = c.position;
    if (n > 0 && Array.isArray(p) && p.length === 3 && Number.isSafeInteger(p[0]) && Number.isSafeInteger(p[1]) && Number.isSafeInteger(p[2])) {
      const at = `"position":[${p[0]},${p[1]},${p[2]}]}`;
      if (n === 2 && c.kind === 'erase') return `{"kind":"erase",${at}`;
      if (n === 3 && (c.kind === 'block' || c.kind === 'air') && Number.isSafeInteger(c.paletteIndex)) return `{"kind":"${c.kind}","paletteIndex":${c.paletteIndex as number},${at}`;
    }
  }
  return canonicalJson(cell);
}

/** Hashes of sealed (immutable) payloads; the canonical JSON of a million cells takes seconds. */
const hashes = new WeakMap<VoxelPayload, string>();

export async function payloadHash(payload: VoxelPayload): Promise<string> {
  const known = hashes.get(payload);
  if (known !== undefined) return known;
  const hash = await sha256Hex(canonicalPayloadJson(payload));
  if (isSealedPayload(payload)) hashes.set(payload, hash);
  return hash;
}

/**
 * Records the hash a worker computed for the same sealed payload (PERF-04:
 * the worker hashes the identical cells it handed over). Ignored for payloads
 * that are not sealed, because those could still change.
 */
export function rememberPayloadHash(payload: VoxelPayload, hash: string): void {
  if (isSealedPayload(payload) && /^[0-9a-f]{64}$/.test(hash)) hashes.set(payload, hash);
}

async function versionId(assetId: string, label: string, hash: string, connectors: readonly Connector[]): Promise<string> {
  return `av_${(await sha256Hex(canonicalJson({ assetId, label, payloadHash: hash, connectors }))).slice(0, 32)}`;
}

export interface NewVersionInput {
  readonly payload: VoxelPayload;
  readonly label?: string;
  readonly connectors?: readonly Connector[];
  readonly source: AssetVersionSource;
}

/** Creates an immutable version and returns the asset with the version appended. */
export async function addAssetVersion(asset: Asset, input: NewVersionInput): Promise<{ asset: Asset; version: AssetVersion }> {
  const payload = createPayload(input.payload);
  const connectors = structuredClone([...(input.connectors ?? [])]);
  checkConnectorShape(connectors);
  const label = text(input.label ?? `${asset.versionIds.length + 1}.0`, 'Versionsbezeichnung', 40, true);
  const hash = await payloadHash(payload);
  const id = await versionId(asset.id, label, hash, connectors);
  if (asset.versionIds.includes(id)) throw new DomainError('DUPLICATE', 'Diese Version existiert bereits');
  const version: AssetVersion = deepFreeze({
    schemaVersion: 1, id, assetId: asset.id, label, payloadHash: hash, payload, connectors,
    source: structuredClone(input.source), createdAt: now(),
  });
  return { asset: Object.freeze({ ...asset, versionIds: Object.freeze([...asset.versionIds, id]), updatedAt: now() }), version };
}

/** Recomputes payload hash and id; used before trusting stored or restored data. */
export async function verifyAssetVersion(version: AssetVersion): Promise<void> {
  validatePayload(version.payload);
  checkConnectorShape(version.connectors);
  const hash = await payloadHash(version.payload);
  if (hash !== version.payloadHash) throw new DomainError('HASH', `Version ${version.id}: Payload-Hash stimmt nicht`);
  if (await versionId(version.assetId, version.label, hash, version.connectors) !== version.id) throw new DomainError('HASH', `Version ${version.id}: Kennung stimmt nicht mit Inhalt überein`);
}

export function updateAssetMeta(asset: Asset, patch: Partial<Pick<NewAssetInput, 'name' | 'description' | 'tags' | 'provenance'>> & { archived?: boolean }): Asset {
  const next = createAsset({ ...asset, ...patch, id: asset.id, demo: asset.demo, provenance: patch.provenance ?? asset.provenance });
  return Object.freeze({ ...next, revision: asset.revision ?? 0, versionIds: asset.versionIds, createdAt: asset.createdAt, archived: patch.archived ?? asset.archived });
}

/**
 * Cuts an explicit integer region out of a payload and moves its minimum to the
 * origin. The source payload is unchanged ("Bereich auswählen → Asset speichern").
 */
export function cropPayload(payload: VoxelPayload, region: Bounds): VoxelPayload {
  validatePayload(payload);
  assertVec3(region.min, 'region.min'); assertVec3(region.maxExclusive, 'region.maxExclusive');
  const min = region.min.map((n, i) => Math.max(n, payload.bounds.min[i]!)) as [number, number, number];
  const max = region.maxExclusive.map((n, i) => Math.min(n, payload.bounds.maxExclusive[i]!)) as [number, number, number];
  if (min.some((n, i) => n >= max[i]!)) throw new DomainError('INVALID', 'Auswahlbereich liegt außerhalb des Bauwerks oder ist leer');
  const inside = (p: readonly number[]): boolean => p.every((n, i) => n >= min[i]! && n < max[i]!);
  const shift = (p: readonly number[]): [number, number, number] => [p[0]! - min[0], p[1]! - min[1], p[2]! - min[2]];
  const cells = payload.cells.filter(c => inside(c.position));
  if (!cells.length) throw new DomainError('EMPTY', 'Der Auswahlbereich enthält keine ausgewählten Zellen');
  // Fresh cell objects; when the source is sealed its shared parts are frozen already, so adopt instead of
  // copying a possibly huge list again (PERF-04). Otherwise copy as before, never freezing the caller's objects.
  return (isSealedPayload(payload) ? adoptPayload : createPayload)({
    ...payload,
    bounds: { min: [0, 0, 0], maxExclusive: shift(max) }, pivot: [0, 0, 0],
    sourceOrigin: payload.sourceOrigin.map((n, i) => n + min[i]!),
    cells: cells.map(c => ({ ...c, position: shift(c.position) })),
    blockEntities: payload.blockEntities.filter(e => inside(e.position)).map(e => ({ ...e, position: shift(e.position) })),
  });
}

export interface AssetQuery { readonly text?: string; readonly tags?: readonly string[]; readonly includeArchived?: boolean }

/** Deterministic local search over name, description, tags and provenance. */
export function searchAssets(assets: readonly Asset[], query: AssetQuery): Asset[] {
  const words = (query.text ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  return assets.filter(a => (query.includeArchived || !a.archived)
    && (query.tags ?? []).every(t => a.tags.includes(t.toLowerCase()))
    && words.every(w => [a.name, a.description, ...a.tags, a.provenance.author, a.provenance.source].join(' ').toLowerCase().includes(w)))
    .sort((a, b) => a.name.localeCompare(b.name, 'de') || (a.id < b.id ? -1 : 1));
}

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze); Object.freeze(value);
  }
  return value;
}
