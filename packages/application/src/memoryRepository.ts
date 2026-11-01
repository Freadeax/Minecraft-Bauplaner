import type { Asset, AssetVersion, OriginalFile, Project } from '../../domain/src/index.js';
import { RevisionConflictError } from './repository.js';
import type { Repository, StorageBatch, StorageInfo } from './repository.js';

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

