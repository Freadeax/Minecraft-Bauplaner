import type { Cell, VoxelPayload } from '../../voxel/src/types.js';
import { packCells, unpackCells, PACKED_CELLS_ENCODING, PackedCellsError } from '../../voxel/src/packedCells.js';
import type { PackedCells } from '../../voxel/src/packedCells.js';
import type { AssetVersion } from './types.js';
import { DomainError } from './types.js';

/**
 * Storage form of an AssetVersion (STORE-03). The domain always works with the
 * plain `AssetVersion`; only stores (IndexedDB, backup files) see this form.
 * `payload.cells` moves into `packedCells` (binary in IndexedDB, Base64 in a
 * backup); id, payloadHash and every other field stay byte-identical, so content
 * addresses do not change and `verifyAssetVersion` still checks the decoded
 * version. A version whose cells cannot be packed exactly stays plain.
 */
export type StoredPayload = Omit<VoxelPayload, 'cells'>;
export interface PackedVersionRecord extends Omit<AssetVersion, 'payload'> {
  readonly payload: StoredPayload;
  readonly packedCells: PackedCells;
}
export interface PackedVersionFileRecord extends Omit<AssetVersion, 'payload'> {
  readonly payload: StoredPayload;
  readonly packedCells: { readonly encoding: typeof PACKED_CELLS_ENCODING; readonly count: number; readonly base64: string };
}
export type StoredVersionRecord = AssetVersion | PackedVersionRecord;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** True when the record carries packed cells (IndexedDB or backup form). */
export const isPackedVersionRecord = (raw: unknown): boolean => isObj(raw) && isObj(raw.packedCells);

/** Packs the cell list; returns the version unchanged when packing would not be exact. */
export function packVersion(version: AssetVersion): StoredVersionRecord {
  // Records that do not look like a complete version stay as they are; their own checks report them.
  const p = (version as { payload?: unknown }).payload;
  if (!isObj(p) || !Array.isArray(p.cells) || !isObj(p.bounds) || !Array.isArray(p.bounds.min) || !Array.isArray(p.bounds.maxExclusive)) return version;
  const packed = packCells(version.payload);
  if (!packed) return version;
  const { cells: _cells, ...payload } = version.payload;
  return { ...version, payload, packedCells: packed };
}

function decode(raw: Record<string, unknown>, cells: () => Cell[]): AssetVersion {
  const { packedCells: _p, ...rest } = raw;
  if (!isObj(rest.payload) || 'cells' in rest.payload) throw new DomainError('STORAGE', `Version ${String(raw.id)}: gepackte Version enthält zusätzlich eine Zellliste`);
  try {
    return { ...rest, payload: { ...rest.payload, cells: cells() } } as unknown as AssetVersion;
  } catch (e) {
    if (e instanceof PackedCellsError) throw new DomainError('STORAGE', `Version ${String(raw.id)}: ${e.message}`);
    throw e;
  }
}

/** Inverse of {@link packVersion}. Plain records pass through; malformed packed data throws DomainError('STORAGE'). */
export function unpackVersion(raw: unknown): AssetVersion {
  if (!isPackedVersionRecord(raw)) return raw as AssetVersion;
  const r = raw as Record<string, unknown> & { packedCells: PackedCells; payload: StoredPayload };
  return decode(r, () => unpackCells(r.payload.bounds, r.packedCells));
}

/**
 * Like {@link unpackVersion}, but a damaged packed record does not make the
 * whole library unreadable: it comes back with an empty cell list. Its payload
 * hash then no longer matches, so the data check reports it as damaged
 * (VERSION_HASH) instead of the app failing to start.
 */
export function unpackVersionOrDamaged(raw: unknown): AssetVersion {
  try { return unpackVersion(raw); }
  catch (e) {
    if (!(e instanceof DomainError) || e.code !== 'STORAGE' || !isPackedVersionRecord(raw)) throw e;
    const { packedCells: _p, ...rest } = raw as Record<string, unknown> & { payload: StoredPayload };
    return { ...rest, payload: { ...rest.payload, cells: [] } } as unknown as AssetVersion;
  }
}

/** Backup form: packed cells as Base64 text. */
export function packVersionForFile(version: AssetVersion, toBase64: (bytes: Uint8Array) => string): AssetVersion | PackedVersionFileRecord {
  const stored = packVersion(version);
  if (!('packedCells' in stored)) return stored;
  const { encoding, count, bytes } = stored.packedCells;
  return { ...stored, packedCells: { encoding, count, base64: toBase64(bytes) } };
}

export function unpackVersionFromFile(raw: unknown, fromBase64: (text: string) => Uint8Array): AssetVersion {
  if (!isPackedVersionRecord(raw)) return raw as AssetVersion;
  const r = raw as Record<string, unknown> & { packedCells: Record<string, unknown>; payload: StoredPayload };
  const p = r.packedCells;
  if (typeof p.base64 !== 'string') throw new DomainError('BACKUP', `Version ${String(r.id)}: gepackte Blockdaten fehlen`);
  return decode(r, () => unpackCells(r.payload.bounds, { encoding: p.encoding as typeof PACKED_CELLS_ENCODING, count: p.count as number, bytes: fromBase64(p.base64 as string) }));
}

/** Rough sizes for the system page: plain JSON cell list vs. packed bytes. */
export function cellStorageEstimate(versions: readonly AssetVersion[]): { readonly cells: number; readonly plainBytes: number; readonly packedBytes: number; readonly unpackable: number } {
  let cells = 0, plainBytes = 0, packedBytes = 0, unpackable = 0;
  for (const v of versions) {
    cells += v.payload.cells.length;
    const plain = JSON.stringify(v.payload.cells).length;
    plainBytes += plain;
    const p = packCells(v.payload);
    if (p) packedBytes += p.bytes.length; else { unpackable++; packedBytes += plain; }
  }
  return { cells, plainBytes, packedBytes, unpackable };
}
