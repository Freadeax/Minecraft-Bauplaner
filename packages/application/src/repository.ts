import type { Asset, AssetVersion, OriginalFile, Project } from '../../domain/src/index.js';

/**
 * Storage boundary of the web app. Every implementation must:
 * - save projects only when `baseRevision` equals the stored revision and then
 *   store revision+1 (otherwise throw RevisionConflictError, never overwrite);
 * - treat AssetVersions as immutable (same id ⇒ identical content, no update);
 * - report failures as thrown errors, never as silent success.
 * - store original files unchanged, addressed by SHA-256;
 * - apply a StorageBatch atomically: all records or none.
 * `kind` tells the UI whether data survives a reload; `notice` explains a
 * fallback (e.g. IndexedDB blocked) and must be shown.
 */
export interface Repository {
  readonly kind: 'memory' | 'indexeddb';
  readonly notice?: string | undefined;
  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  /** Returns the stored project with its new revision. */
  saveProject(project: Project, baseRevision: number): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  listAssets(): Promise<Asset[]>;
  saveAsset(asset: Asset): Promise<void>;
  listVersions(): Promise<AssetVersion[]>;
  saveVersion(version: AssetVersion): Promise<void>;
  getOriginal(sha256: string): Promise<OriginalFile | null>;
  listOriginalHashes(): Promise<string[]>;
  /** Writes everything in one transaction; any failure (revision, immutability, quota) writes nothing. */
  applyBatch(batch: StorageBatch): Promise<Project[]>;
  /** Called when another tab changed stored data. Returns an unsubscribe function. */
  subscribe(listener: (change: StorageChange) => void): () => void;
  /** Usage/quota and whether the browser granted persistent storage, if known. */
  storageInfo(): Promise<StorageInfo>;
  /** Asks the browser not to evict data under storage pressure. */
  requestPersistence(): Promise<boolean>;
}

export interface StorageBatch {
  readonly assets?: readonly Asset[];
  readonly versions?: readonly AssetVersion[];
  readonly originals?: readonly OriginalFile[];
  /** baseRevision 0 = project must not exist yet. Stored revision becomes baseRevision + 1. */
  readonly projects?: readonly { readonly project: Project; readonly baseRevision: number }[];
}
export interface StorageChange { readonly kind: 'projects' | 'library'; readonly projectIds?: readonly string[] }
export interface StorageInfo { readonly usage?: number; readonly quota?: number; readonly persisted?: boolean }

export class RevisionConflictError extends Error {
  constructor(readonly stored: number, readonly base: number) {
    super(`Das Projekt wurde zwischenzeitlich anderswo gespeichert (Revision ${stored}, Basis ${base}). Bitte neu laden.`);
    this.name = 'RevisionConflictError';
  }
}

