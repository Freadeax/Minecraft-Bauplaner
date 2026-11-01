import type { Asset, AssetVersion, OriginalFile, Project } from '../../domain/src/index.js';
import { checkStorageBatch, nextAssetRevision } from './assetConcurrency.js';
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
  async listProjects() { return structuredClone([...this.projects.values()]); }
  async getProject(id: string) { return structuredClone(this.projects.get(id) ?? null); }
  async saveProject(project: Project, baseRevision: number) {
    const [saved] = await this.applyBatch({ projects: [{ project, baseRevision }] });
    return saved!;
  }
  async deleteProject(id: string) { this.projects.delete(id); }
  async listAssets() { return structuredClone([...this.assets.values()]); }
  async saveAsset(asset: Asset) { await this.applyBatch({ assets: [asset] }); }
  async listVersions() { return structuredClone([...this.versions.values()]); }
  async saveVersion(version: AssetVersion) {
    await this.applyBatch({ versions: [version] });
  }
  async getOriginal(sha256: string) { return structuredClone(this.originals.get(sha256) ?? null); }
  async listOriginalHashes() { return [...this.originals.keys()]; }
  async applyBatch(input: StorageBatch) {
    // Match IndexedDB's structured-copy boundary; callers cannot edit stored revisions through aliases.
    const batch = structuredClone(input);
    checkStorageBatch(batch);
    const assets = (batch.assets ?? []).map(asset => nextAssetRevision(asset, this.assets.get(asset.id)));
    // Validate everything first, then write: same all-or-nothing contract as IndexedDB.
    for (const v of batch.versions ?? []) { const e = this.versions.get(v.id); if (e && e.payloadHash !== v.payloadHash) throw new Error(`Version ${v.id} existiert mit anderem Inhalt`); }
    for (const { project, baseRevision } of batch.projects ?? []) {
      const stored = this.projects.get(project.id)?.revision ?? 0;
      if (stored !== baseRevision) throw new RevisionConflictError(stored, baseRevision);
    }
    for (const v of batch.versions ?? []) if (!this.versions.has(v.id)) this.versions.set(v.id, v);
    for (const a of assets) this.assets.set(a.id, a);
    for (const o of batch.originals ?? []) this.originals.set(o.sha256, o);
    const saved = (batch.projects ?? []).map(({ project, baseRevision }) => {
      const next = { ...project, revision: baseRevision + 1 };
      this.projects.set(project.id, next);
      return next;
    });
    return structuredClone(saved);
  }
  subscribe() { return () => {}; }
  async storageInfo(): Promise<StorageInfo> { return {}; }
  async requestPersistence() { return false; }
}

