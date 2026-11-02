import type { Asset, AssetVersion, BackupLedger, BackupReceipt, Collection, LibraryTemplate, OriginalFile, Project, WorldPlan } from '../../domain/src/index.js';

/**
 * Storage boundary of the web app. Every implementation must:
 * - save projects only when `baseRevision` equals the stored revision and then
 *   store revision+1 (otherwise throw RevisionConflictError, never overwrite);
 * - save assets using incoming asset.revision (legacy absent = 0) as CAS base,
 *   increment once on success; conflicting asset batches write nothing;
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
  /** Incoming revision is the expected stored base; reload after saving to obtain the incremented revision. */
  saveAsset(asset: Asset): Promise<void>;
  listVersions(): Promise<AssetVersion[]>;
  /**
   * Optional (PERF-04-S05): the stored version records as they are, cells still
   * packed (see `unpackVersionOrDamaged`). Cheap to read and to hand to a
   * worker; the caller unpacks and checks them itself.
   */
  listVersionRecords?(): Promise<unknown[]>;
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
  /** Own collections and folders (LIB-02). */
  listCollections(): Promise<Collection[]>;
  /** Own ensemble and generator templates (LIB-03). */
  listTemplates(): Promise<LibraryTemplate[]>;
  /** Receipts of backup files this browser produced or read back (BACKUP-02). Empty ledger when none. */
  getBackupLedger(): Promise<BackupLedger>;
  /** Appends one receipt atomically (read-modify-write in one transaction) and returns the new ledger. */
  recordBackup(receipt: BackupReceipt): Promise<BackupLedger>;
  /** Weltplan (MAP-03): sites, paths and points of the world map. Empty plan (revision 0) when none is stored. */
  getWorldPlan(): Promise<WorldPlan>;
  /** Saves when the stored revision equals `baseRevision`; returns the plan with revision + 1. */
  saveWorldPlan(plan: WorldPlan, baseRevision: number): Promise<WorldPlan>;
}

export interface StorageBatch {
  /** Each incoming revision is an expected CAS base; duplicate asset IDs are rejected. */
  readonly assets?: readonly Asset[];
  readonly versions?: readonly AssetVersion[];
  readonly originals?: readonly OriginalFile[];
  /** baseRevision 0 = project must not exist yet. Stored revision becomes baseRevision + 1. */
  readonly projects?: readonly { readonly project: Project; readonly baseRevision: number }[];
  /** Same CAS contract as assets: incoming revision = expected stored base (0 = new). */
  readonly collections?: readonly Collection[];
  readonly templates?: readonly LibraryTemplate[];
  /** Deletes only when the stored revision equals `revision`; otherwise the whole batch fails. */
  readonly removeCollections?: readonly LibraryRecordRef[];
  readonly removeTemplates?: readonly LibraryRecordRef[];
}
export interface LibraryRecordRef { readonly id: string; readonly revision: number }
/** `userLibrary`: own collections or templates changed (LIB-02/LIB-03). `backups`: a backup receipt was recorded (BACKUP-02). */
export interface StorageChange { readonly kind: 'projects' | 'library' | 'userLibrary' | 'backups' | 'worldPlan'; readonly projectIds?: readonly string[] }
export interface StorageInfo { readonly usage?: number; readonly quota?: number; readonly persisted?: boolean }

export class RevisionConflictError extends Error {
  constructor(readonly stored: number, readonly base: number) {
    super(`Das Projekt wurde zwischenzeitlich anderswo gespeichert (Revision ${stored}, Basis ${base}). Bitte neu laden.`);
    this.name = 'RevisionConflictError';
  }
}

export class WorldPlanConflictError extends Error {
  constructor(readonly stored: number, readonly base: number) {
    super(`Der Weltplan wurde zwischenzeitlich anderswo gespeichert (Revision ${stored}, Basis ${base}). Die Karte lädt den gespeicherten Stand; bitte die Änderung erneut ausführen.`);
    this.name = 'WorldPlanConflictError';
  }
}

export class AssetRevisionConflictError extends Error {
  constructor(readonly assetId: string, readonly stored: number, readonly base: number) {
    super(`Das Bauteil „${assetId}“ wurde zwischenzeitlich anderswo gespeichert (Revision ${stored}, Basis ${base}). Bitte die Bibliothek neu laden und die Änderung erneut ausführen; nichts wurde überschrieben.`);
    this.name = 'AssetRevisionConflictError';
  }
}
