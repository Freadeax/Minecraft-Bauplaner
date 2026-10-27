import type { Asset, AssetVersion, OriginalFile, Project } from '../../../../packages/domain/src/index.js';
import { checkAssetRecord, checkProjectRecord, checkSchemaVersion, DOMAIN_SCHEMA_VERSION } from '../../../../packages/domain/src/index.js';
import { RevisionConflictError } from './repository';
import type { Repository, StorageBatch, StorageChange, StorageInfo } from './repository';

/**
 * IndexedDB implementation of the storage boundary (P2-01, B3).
 *
 * Stores: projects, assets, versions (key id), originals (key sha256, bytes as
 * Blob) and meta. Every write runs in one readwrite transaction; the promise
 * resolves only on `complete`, so a quota or revision error aborts the whole
 * transaction. Other tabs learn about changes via BroadcastChannel; actual
 * conflicts are still decided by baseRevision inside the transaction.
 */
export const DB_NAME = 'minecraft-bauplaner';
/** Bump together with a new entry in MIGRATIONS. */
export const DB_VERSION = 1;
const STORES = ['projects', 'assets', 'versions', 'originals', 'meta'] as const;
type StoreName = typeof STORES[number];

/** Migration n upgrades a database from version n-1 to n. Never edit a released step. */
const MIGRATIONS: Record<number, (db: IDBDatabase) => void> = {
  1: db => {
    db.createObjectStore('projects', { keyPath: 'id' });
    db.createObjectStore('assets', { keyPath: 'id' });
    db.createObjectStore('versions', { keyPath: 'id' });
    db.createObjectStore('originals', { keyPath: 'sha256' });
    db.createObjectStore('meta', { keyPath: 'key' });
  },
};

interface StoredOriginal { readonly sha256: string; readonly fileName: string; readonly mediaType: string; readonly size: number; readonly createdAt: string; readonly blob: Blob }

export class StorageNewerError extends Error {
  constructor() {
    super('Die lokalen Daten wurden von einer neueren Version des Bauplaners gespeichert. Bitte die Seite neu laden, damit die aktuelle Version startet; ältere Versionen ändern diese Daten nicht.');
    this.name = 'StorageNewerError';
  }
}

/** Translates DOMException names into actionable German messages. */
export function storageErrorText(e: unknown): string {
  const name = e instanceof DOMException || e instanceof Error ? e.name : '';
  if (name === 'QuotaExceededError') return 'Browserspeicher voll – nichts wurde gespeichert. Bitte Sicherung herunterladen und Platz schaffen (alte Projekte/Originale löschen).';
  if (name === 'InvalidStateError') return 'Der Browserspeicher wurde geschlossen (z. B. Update in einem anderen Tab). Bitte Seite neu laden.';
  if (name === 'UnknownError') return 'Der Browser meldet einen internen Speicherfehler. Bitte Seite neu laden und Sicherung prüfen.';
  return e instanceof Error ? e.message : String(e);
}

const req = <T>(r: IDBRequest<T>) => new Promise<T>((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });

export function openIdbRepository(factory: IDBFactory | undefined = globalThis.indexedDB): Promise<IdbRepository> {
  if (!factory) return Promise.reject(new Error('IndexedDB fehlt in diesem Browser'));
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try { request = factory.open(DB_NAME, DB_VERSION); } catch (e) { reject(e); return; }
    request.onupgradeneeded = event => {
      const db = request.result;
      for (let v = event.oldVersion + 1; v <= DB_VERSION; v++) MIGRATIONS[v]!(db);
      request.transaction!.objectStore('meta').put({ key: 'schema', dbVersion: DB_VERSION, domainSchemaVersion: DOMAIN_SCHEMA_VERSION, migratedAt: new Date().toISOString() });
    };
    request.onblocked = () => reject(new Error('Ein anderer Tab hält eine ältere Datenbankversion offen. Bitte andere Bauplaner-Tabs schließen und neu laden.'));
    request.onerror = () => {
      const err = request.error;
      if (err?.name === 'VersionError') { const e = new StorageNewerError(); reject(e); return; }
      reject(err ?? new Error('IndexedDB konnte nicht geöffnet werden'));
    };
    request.onsuccess = () => resolve(new IdbRepository(request.result));
  });
}

export class IdbRepository implements Repository {
  readonly kind = 'indexeddb' as const;
  private readonly channel: BroadcastChannel | null;
  private readonly listeners = new Set<(c: StorageChange) => void>();
  private closedReason = '';

  constructor(private readonly db: IDBDatabase) {
    // A newer tab wants to upgrade: release the database and tell the user.
    db.onversionchange = () => { db.close(); this.closedReason = 'Eine neuere Version des Bauplaners wurde in einem anderen Tab geöffnet. Bitte diese Seite neu laden.'; this.emit({ kind: 'projects' }); };
    this.channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(DB_NAME) : null;
    if (this.channel) this.channel.onmessage = (e: MessageEvent<StorageChange>) => this.emit(e.data);
  }

  private emit(change: StorageChange) { for (const l of this.listeners) l(change); }
  private announce(change: StorageChange) { this.channel?.postMessage(change); }

  /** Runs `body` in one transaction and resolves after commit with its result. */
  private run<T>(stores: readonly StoreName[], mode: IDBTransactionMode, body: (tx: IDBTransaction) => Promise<T> | T): Promise<T> {
    if (this.closedReason) return Promise.reject(new Error(this.closedReason));
    return new Promise<T>((resolve, reject) => {
      let tx: IDBTransaction;
      try { tx = this.db.transaction(stores, mode); } catch (e) { reject(new Error(storageErrorText(e))); return; }
      let result: T, failure: unknown = null;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(failure ?? new Error(storageErrorText(tx.error)));
      Promise.resolve().then(() => body(tx)).then(r => { result = r; }, e => { failure = e; try { tx.abort(); } catch { /* already finished */ } });
    });
  }

  private async all<T>(store: StoreName): Promise<T[]> {
    return this.run([store], 'readonly', tx => req(tx.objectStore(store).getAll() as IDBRequest<T[]>));
  }

  async listProjects() { return (await this.all<unknown>('projects')).map(checkProjectRecord); }
  async getProject(id: string) {
    const raw = await this.run(['projects'], 'readonly', tx => req(tx.objectStore('projects').get(id)));
    return raw === undefined ? null : checkProjectRecord(raw);
  }

  async saveProject(project: Project, baseRevision: number) {
    const [saved] = await this.applyBatch({ projects: [{ project, baseRevision }] });
    return saved!;
  }

  async deleteProject(id: string) {
    await this.run(['projects'], 'readwrite', tx => req(tx.objectStore('projects').delete(id)));
    this.announce({ kind: 'projects', projectIds: [id] });
  }

  async listAssets() { return (await this.all<unknown>('assets')).map(checkAssetRecord); }
  async saveAsset(asset: Asset) { await this.applyBatch({ assets: [asset] }); }
  async listVersions() {
    const list = await this.all<AssetVersion>('versions');
    for (const v of list) checkSchemaVersion('Version', v);
    return list;
  }
  async saveVersion(version: AssetVersion) { await this.applyBatch({ versions: [version] }); }

  async getOriginal(sha256: string): Promise<OriginalFile | null> {
    const raw = await this.run(['originals'], 'readonly', tx => req(tx.objectStore('originals').get(sha256) as IDBRequest<StoredOriginal | undefined>));
    if (!raw) return null;
    const { blob, ...meta } = raw;
    return { ...meta, bytes: new Uint8Array(await blob.arrayBuffer()) };
  }
  async listOriginalHashes() {
    return (await this.run(['originals'], 'readonly', tx => req(tx.objectStore('originals').getAllKeys()))).map(String);
  }

  async applyBatch(batch: StorageBatch): Promise<Project[]> {
    const stores = new Set<StoreName>();
    if (batch.projects?.length) stores.add('projects');
    if (batch.assets?.length) stores.add('assets');
    if (batch.versions?.length) stores.add('versions');
    if (batch.originals?.length) stores.add('originals');
    if (!stores.size) return [];
    const saved = await this.run([...stores], 'readwrite', async tx => {
      const versions = tx.objectStore.bind(tx, 'versions'), projects = tx.objectStore.bind(tx, 'projects');
      // Reads first, all inside this transaction: decisions and writes see the same snapshot.
      const [existingVersions, storedProjects] = await Promise.all([
        Promise.all((batch.versions ?? []).map(v => req(versions().get(v.id) as IDBRequest<AssetVersion | undefined>))),
        Promise.all((batch.projects ?? []).map(p => req(projects().get(p.project.id) as IDBRequest<Project | undefined>))),
      ]);
      (batch.versions ?? []).forEach((v, i) => {
        const e = existingVersions[i];
        if (e && e.payloadHash !== v.payloadHash) throw new Error(`Version ${v.id} existiert mit anderem Inhalt; Versionen sind unveränderlich.`);
        if (!e) versions().put(v);
      });
      for (const a of batch.assets ?? []) tx.objectStore('assets').put(a);
      for (const o of batch.originals ?? []) {
        const { bytes, ...meta } = o;
        tx.objectStore('originals').put({ ...meta, blob: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: o.mediaType }) } satisfies StoredOriginal);
      }
      return (batch.projects ?? []).map(({ project, baseRevision }, i) => {
        const stored = storedProjects[i]?.revision ?? 0;
        if (stored !== baseRevision) throw new RevisionConflictError(stored, baseRevision);
        const next: Project = { ...project, revision: baseRevision + 1 };
        projects().put(next);
        return next;
      });
    });
    if (saved.length) this.announce({ kind: 'projects', projectIds: saved.map(p => p.id) });
    if (batch.assets?.length || batch.versions?.length) this.announce({ kind: 'library' });
    return saved;
  }

  subscribe(listener: (change: StorageChange) => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  async storageInfo(): Promise<StorageInfo> {
    const s = navigator.storage;
    if (!s) return {};
    const [estimate, persisted] = await Promise.all([s.estimate?.().catch(() => undefined), s.persisted?.().catch(() => undefined)]);
    return { ...(estimate?.usage !== undefined && { usage: estimate.usage }), ...(estimate?.quota !== undefined && { quota: estimate.quota }), ...(persisted !== undefined && { persisted }) };
  }
  async requestPersistence() { return (await navigator.storage?.persist?.().catch(() => false)) ?? false; }
}
