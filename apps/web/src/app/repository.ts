import type { Asset, AssetVersion, Project } from '../../../../packages/domain/src/index.js';
import { createSampleLibrary } from '../../../../packages/domain/src/index.js';

/**
 * Storage boundary of the web app. Every implementation must:
 * - save projects only when `baseRevision` equals the stored revision and then
 *   store revision+1 (otherwise throw RevisionConflictError, never overwrite);
 * - treat AssetVersions as immutable (same id ⇒ identical content, no update);
 * - report failures as thrown errors, never as silent success.
 * `kind` tells the UI whether data survives a reload.
 */
export interface Repository {
  readonly kind: 'memory' | 'indexeddb';
  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  /** Returns the stored project with its new revision. */
  saveProject(project: Project, baseRevision: number): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  listAssets(): Promise<Asset[]>;
  saveAsset(asset: Asset): Promise<void>;
  listVersions(): Promise<AssetVersion[]>;
  saveVersion(version: AssetVersion): Promise<void>;
}

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
}

/** Adds the synthetic sample modules once; never overwrites user assets. */
export async function seedSamples(repo: Repository): Promise<void> {
  const existing = new Set((await repo.listAssets()).map(a => a.id));
  const samples = await createSampleLibrary();
  for (const version of samples.versions) if (!existing.has(version.assetId)) await repo.saveVersion(version);
  for (const asset of samples.assets) if (!existing.has(asset.id)) await repo.saveAsset(asset);
}

export async function openRepository(): Promise<Repository> {
  const repo = new MemoryRepository();
  await seedSamples(repo);
  return repo;
}
