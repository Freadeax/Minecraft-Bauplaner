import type { Asset, AssetVersion, OriginalFile, Project } from '../../../../packages/domain/src/index.js';
import { createSampleLibrary } from '../../../../packages/domain/src/index.js';

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

/** Session-only store; data is lost on reload and the UI must say so. */
export class MemoryRepository implements Repository {
  readonly kind = 'memory' as const;
  private projects = new Map<string, Project>();
  private assets = new Map<string, Asset>();
  private versions = new Map<string, AssetVersion>();
  private originals = new Map<string, OriginalFile>();
  constructor(readonly notice?: string) {}
  async listProjects() { return [...this.projects.values()]; }
  async getProject(id: string) { return this.projects.get(id) ?? null; }
  async saveProject(project: Project, baseRevision: number) {
    const stored = this.projects.get(project.id);
    if ((stored?.revision ?? 0) !== baseRevision) throw new RevisionConflictError(stored?.revision ?? 0, baseRevision);
    const next = { ...project, revision: baseRevision + 1 };
    this.projects.set(project.id, next);
    return next;
  }
  async deleteProject(id: string) { this.projects.delete(id); }
  async listAssets() { return [...this.assets.values()]; }
  async saveAsset(asset: Asset) { this.assets.set(asset.id, asset); }
  async listVersions() { return [...this.versions.values()]; }
  async saveVersion(version: AssetVersion) {
    const existing = this.versions.get(version.id);
    if (existing && existing.payloadHash !== version.payloadHash) throw new Error(`Version ${version.id} existiert mit anderem Inhalt`);
    this.versions.set(version.id, version);
  }
  async getOriginal(sha256: string) { return this.originals.get(sha256) ?? null; }
  async listOriginalHashes() { return [...this.originals.keys()]; }
  async applyBatch(batch: StorageBatch) {
    // Validate everything first, then write: same all-or-nothing contract as IndexedDB.
    for (const v of batch.versions ?? []) { const e = this.versions.get(v.id); if (e && e.payloadHash !== v.payloadHash) throw new Error(`Version ${v.id} existiert mit anderem Inhalt`); }
    for (const { project, baseRevision } of batch.projects ?? []) {
      const stored = this.projects.get(project.id)?.revision ?? 0;
      if (stored !== baseRevision) throw new RevisionConflictError(stored, baseRevision);
    }
    for (const v of batch.versions ?? []) this.versions.set(v.id, v);
    for (const a of batch.assets ?? []) this.assets.set(a.id, a);
    for (const o of batch.originals ?? []) this.originals.set(o.sha256, o);
    return (batch.projects ?? []).map(({ project, baseRevision }) => {
      const next = { ...project, revision: baseRevision + 1 };
      this.projects.set(project.id, next);
      return next;
    });
  }
  subscribe() { return () => {}; }
  async storageInfo(): Promise<StorageInfo> { return {}; }
  async requestPersistence() { return false; }
}

/** Adds the synthetic sample modules once; never overwrites user assets. */
export async function seedSamples(repo: Repository): Promise<void> {
  const existing = new Set((await repo.listAssets()).map(a => a.id));
  const samples = await createSampleLibrary();
  const assets = samples.assets.filter(a => !existing.has(a.id));
  if (assets.length) await repo.applyBatch({ assets, versions: samples.versions.filter(v => !existing.has(v.assetId)) });
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
    if (e instanceof Error && e.name === 'StorageNewerError') throw e;
    repo = new MemoryRepository(`Dauerhafter Browserspeicher nicht verfügbar (${e instanceof Error ? e.message : String(e)}). Projekte gelten nur für diese Sitzung – bitte Sicherungen herunterladen.`);
  }
  await seedSamples(repo);
  return repo;
}
