import type { Asset, AssetVersion, BackupLedger, BackupReceipt, Collection, LibraryTemplate, OriginalFile, Project, WorldPlan } from '../../../../packages/domain/src/index.js';
import { checkWorldPlan, DOMAIN_SCHEMA_VERSION, emptyWorldPlan } from '../../../../packages/domain/src/index.js';
import { packVersion, unpackVersion, unpackVersionOrDamaged } from '../../../../packages/domain/src/index.js';
import { RevisionConflictError, WorldPlanConflictError } from './repository';
import type { Repository, StorageBatch, StorageChange, StorageInfo } from './repository';

/**
 * IndexedDB implementation of the storage boundary (P2-01, B3).
 *
 * Stores: projects, assets, versions (key id, cells packed – STORE-03), originals (key sha256, bytes as
 * ArrayBuffer; older entries hold a Blob) and meta. Every write runs in one readwrite transaction; the promise
 * resolves only on `complete`, so a quota or revision error aborts the whole
 * transaction. Other tabs learn about changes via BroadcastChannel; actual
 * conflicts are still decided by baseRevision inside the transaction.
 */
export const DB_NAME = 'minecraft-bauplaner';
/** Bump together with a new entry in MIGRATIONS. */
export const DB_VERSION = 4;
/** Record checks, loaded on first use (O-9): they carry the site, team, planning and production modules. */
type Checks = typeof import('./recordChecks');
let loadedChecks: Checks | null = null, pendingChecks: Promise<Checks> | null = null;
export function loadChecks(): Promise<Checks> {
  pendingChecks ??= import('./recordChecks').then(m => (loadedChecks = m), e => { pendingChecks = null; throw e; });
  return pendingChecks;
}
/** Marks an upgrade that needs the record checks before they were loaded; the open is retried after loading. */
const NEED_CHECKS = new Error('Prüfungen werden geladen');

const STORES = ['projects', 'assets', 'versions', 'originals', 'meta', 'collections', 'templates'] as const;
type StoreName = typeof STORES[number];

/** Migration n upgrades a database from version n-1 to n. Never edit a released step. */
const MIGRATIONS: Record<number, (db: IDBDatabase, tx: IDBTransaction, fail: (error: unknown) => void) => void> = {
  1: db => {
    db.createObjectStore('projects', { keyPath: 'id' });
    db.createObjectStore('assets', { keyPath: 'id' });
    db.createObjectStore('versions', { keyPath: 'id' });
    db.createObjectStore('originals', { keyPath: 'sha256' });
    db.createObjectStore('meta', { keyPath: 'key' });
  },
  2: (_db, tx, fail) => {
    const request = tx.objectStore('assets').openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      try {
        if (!loadedChecks) throw NEED_CHECKS;
        const asset = loadedChecks.checkAssetRecord(cursor.value);
        loadedChecks.assetRevision(asset);
        if (asset.revision === undefined) cursor.update({ ...asset, revision: 1 });
        cursor.continue();
      } catch (error) { fail(error); }
    };
  },
  // LIB-02/LIB-03: own collections and templates; additive, existing stores unchanged.
  3: db => {
    db.createObjectStore('collections', { keyPath: 'id' });
    db.createObjectStore('templates', { keyPath: 'id' });
  },
  // STORE-03: version cells as packed byte stream (versionStorage.ts). id, payloadHash and all
  // other fields stay unchanged; a version that cannot be packed exactly stays plain.
  4: (_db, tx, fail) => {
    const request = tx.objectStore('versions').openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      try {
        // Only plain schema-1 versions are packed; anything else stays untouched for the read checks to report.
        const version = cursor.value as AssetVersion;
        const stored = version?.schemaVersion === 1 ? packVersion(unpackVersion(version)) : version;
        if (stored !== version) cursor.update(stored);
        cursor.continue();
      } catch (error) { fail(error); }
    };
  },
};

interface StoredOriginal { readonly sha256: string; readonly fileName: string; readonly mediaType: string; readonly size: number; readonly createdAt: string;
  /** Since Block 5 (06.11.2026): WebKit cannot store Blobs in private windows (UnknownError), plain bytes work everywhere. */
  readonly bytes?: ArrayBuffer;
  /** Entries written before Block 5. */
  readonly blob?: Blob }

export class StorageNewerError extends Error {
  constructor() {
    super('Die lokalen Daten wurden von einer neueren Version des Build Studios gespeichert. Bitte die Seite neu laden, damit die aktuelle Version startet; ältere Versionen ändern diese Daten nicht.');
    this.name = 'StorageNewerError';
  }
}

export class StorageMigrationError extends Error {
  constructor(cause: unknown) {
    super(`Lokale Bauteildaten konnten nicht sicher aktualisiert werden. Die bisherige Datenbank bleibt unverändert. Bitte Sicherung prüfen: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'StorageMigrationError';
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

export async function openIdbRepository(factory: IDBFactory | undefined = globalThis.indexedDB): Promise<IdbRepository> {
  if (!factory) throw new Error('IndexedDB fehlt in diesem Browser');
  void loadChecks().catch(() => undefined); // in parallel; the first read awaits it
  try { return await openOnce(factory); } catch (e) {
    if (e !== NEED_CHECKS) throw e;
    await loadChecks();
    return openOnce(factory);
  }
}

function openOnce(factory: IDBFactory): Promise<IdbRepository> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    let upgradeFailure: unknown = null, needChecks = false;
    let blocked = false;
    try { request = factory.open(DB_NAME, DB_VERSION); } catch (e) { reject(e); return; }
    request.onupgradeneeded = event => {
      const db = request.result, tx = request.transaction!;
      const fail = (error: unknown) => {
        if (error === NEED_CHECKS) needChecks = true; else upgradeFailure = new StorageMigrationError(error);
        try { tx.abort(); } catch { /* already aborted */ }
      };
      try {
        for (let v = event.oldVersion + 1; v <= DB_VERSION; v++) MIGRATIONS[v]!(db, tx, fail);
        tx.objectStore('meta').put({ key: 'schema', dbVersion: DB_VERSION, domainSchemaVersion: DOMAIN_SCHEMA_VERSION, migratedAt: new Date().toISOString() });
      } catch (error) { fail(error); }
    };
    request.onblocked = () => { blocked = true; reject(new Error('Ein anderer Tab hält eine ältere Datenbankversion offen. Bitte andere Build-Studio-Tabs schließen und neu laden.')); };
    request.onerror = () => {
      if (upgradeFailure) { reject(upgradeFailure); return; }
      if (needChecks) { reject(NEED_CHECKS); return; }
      const err = request.error;
      if (err?.name === 'VersionError') { const e = new StorageNewerError(); reject(e); return; }
      reject(err ?? new Error('IndexedDB konnte nicht geöffnet werden'));
    };
    request.onsuccess = () => { if (blocked) { request.result.close(); return; } resolve(new IdbRepository(request.result)); };
  });
}

export class IdbRepository implements Repository {
  readonly kind = 'indexeddb' as const;
  private readonly channel: BroadcastChannel | null;
  private readonly listeners = new Set<(c: StorageChange) => void>();
  private closedReason = '';

  constructor(private readonly db: IDBDatabase) {
    // A newer tab wants to upgrade: release the database and tell the user.
    db.onversionchange = () => { db.close(); this.closedReason = 'Eine neuere Version des Build Studios wurde in einem anderen Tab geöffnet. Bitte diese Seite neu laden.'; this.emit({ kind: 'projects' }); this.emit({ kind: 'library' }); this.emit({ kind: 'userLibrary' }); };
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
      // Block 5: WebKit reports a failed put as transaction error without a later abort event; reject here so a save never hangs.
      tx.onerror = event => { const target = event.target as IDBRequest | null; reject(failure ?? new Error(storageErrorText(target?.error ?? tx.error))); };
      Promise.resolve().then(() => body(tx)).then(r => { result = r; }, e => { failure = e; try { tx.abort(); } catch { /* already finished */ } });
    });
  }

  private async all<T>(store: StoreName): Promise<T[]> {
    return this.run([store], 'readonly', tx => req(tx.objectStore(store).getAll() as IDBRequest<T[]>));
  }

  async listProjects() { const [c, raw] = await Promise.all([loadChecks(), this.all<unknown>('projects')]); return raw.map(c.checkProjectRecord); }
  async getProject(id: string) {
    const [c, raw] = await Promise.all([loadChecks(), this.run(['projects'], 'readonly', tx => req(tx.objectStore('projects').get(id)))]);
    return raw === undefined ? null : c.checkProjectRecord(raw);
  }

  async saveProject(project: Project, baseRevision: number) {
    const [saved] = await this.applyBatch({ projects: [{ project, baseRevision }] });
    return saved!;
  }

  async deleteProject(id: string) {
    await this.run(['projects'], 'readwrite', tx => req(tx.objectStore('projects').delete(id)));
    this.announce({ kind: 'projects', projectIds: [id] });
  }

  async listAssets() { const [c, raw] = await Promise.all([loadChecks(), this.all<unknown>('assets')]); return raw.map(c.checkAssetRecord); }
  async saveAsset(asset: Asset) { await this.applyBatch({ assets: [asset] }); }
  async listVersions() {
    const [c, raw] = await Promise.all([loadChecks(), this.all<unknown>('versions')]);
    const list = raw.map(unpackVersionOrDamaged);
    for (const v of list) c.checkSchemaVersion('Version', v);
    return list;
  }
  /** Raw records, cells still packed (PERF-04-S05): the library start unpacks them in slices and hands them to the worker. */
  async listVersionRecords() { return this.all<unknown>('versions'); }
  // PERF-04-S07: the catalogue cache lives in the existing `meta` store (key 'catalogCache'); no schema migration needed.
  async getCatalogCache(): Promise<unknown> {
    const raw = await this.run(['meta'], 'readonly', tx => req(tx.objectStore('meta').get('catalogCache')));
    return (raw as { cache?: unknown } | undefined)?.cache;
  }
  async saveCatalogCache(cache: unknown): Promise<void> {
    await this.run(['meta'], 'readwrite', tx => { tx.objectStore('meta').put({ key: 'catalogCache', cache }); });
  }
  async saveVersion(version: AssetVersion) { await this.applyBatch({ versions: [version] }); }

  async listCollections(): Promise<Collection[]> { const [c, raw] = await Promise.all([loadChecks(), this.all<unknown>('collections')]); return raw.map(c.checkCollectionRecord); }
  async listTemplates(): Promise<LibraryTemplate[]> { const [c, raw] = await Promise.all([loadChecks(), this.all<unknown>('templates')]); return raw.map(c.checkTemplateRecord); }

  // BACKUP-02: receipts live in the existing `meta` store (key 'backupLedger'); no schema migration needed.
  async getBackupLedger(): Promise<BackupLedger> {
    const [c, raw] = await Promise.all([loadChecks(), this.run(['meta'], 'readonly', tx => req(tx.objectStore('meta').get('backupLedger')))]);
    return raw === undefined ? c.emptyLedger() : c.checkBackupLedger((raw as { ledger: unknown }).ledger);
  }
  async recordBackup(receipt: BackupReceipt): Promise<BackupLedger> {
    const { addReceipt, checkBackupLedger, emptyLedger } = await loadChecks();
    const ledger = await this.run(['meta'], 'readwrite', async tx => {
      const store = tx.objectStore('meta'), raw = await req(store.get('backupLedger'));
      const next = addReceipt(raw === undefined ? emptyLedger() : checkBackupLedger((raw as { ledger: unknown }).ledger), receipt);
      store.put({ key: 'backupLedger', ledger: next });
      return next;
    });
    this.announce({ kind: 'backups' });
    return ledger;
  }

  // MAP-03: the Weltplan is one record in the existing `meta` store (key 'worldPlan'); no schema migration needed.
  async getWorldPlan(): Promise<WorldPlan> {
    const raw = await this.run(['meta'], 'readonly', tx => req(tx.objectStore('meta').get('worldPlan')));
    return raw === undefined ? emptyWorldPlan() : checkWorldPlan((raw as { plan: unknown }).plan);
  }
  async saveWorldPlan(plan: WorldPlan, baseRevision: number): Promise<WorldPlan> {
    const next = checkWorldPlan({ ...structuredClone(plan), revision: baseRevision + 1, updatedAt: new Date().toISOString() });
    await this.run(['meta'], 'readwrite', async tx => {
      const store = tx.objectStore('meta'), raw = await req(store.get('worldPlan'));
      const stored = raw === undefined ? 0 : checkWorldPlan((raw as { plan: unknown }).plan).revision;
      if (stored !== baseRevision) throw new WorldPlanConflictError(stored, baseRevision);
      store.put({ key: 'worldPlan', plan: next });
    });
    this.announce({ kind: 'worldPlan' });
    return next;
  }

  async getOriginal(sha256: string): Promise<OriginalFile | null> {
    const raw = await this.run(['originals'], 'readonly', tx => req(tx.objectStore('originals').get(sha256) as IDBRequest<StoredOriginal | undefined>));
    if (!raw) return null;
    const { blob, bytes, ...meta } = raw;
    return { ...meta, bytes: new Uint8Array(bytes ?? (blob ? await blob.arrayBuffer() : new ArrayBuffer(0))) };
  }
  async listOriginalHashes() {
    return (await this.run(['originals'], 'readonly', tx => req(tx.objectStore('originals').getAllKeys()))).map(String);
  }

  async applyBatch(input: StorageBatch): Promise<Project[]> {
    // Snapshot before async reads; callers cannot change the expected revision mid-transaction.
    // Versions are packed first (PERF-04): cloning the packed form is cheap, cloning a million cells is not,
    // and a packed form a worker already made for these cells is reused instead of packing again.
    const { checkStorageBatch, LibraryRecordConflictError, nextAssetRevision, nextLibraryRevision } = await loadChecks();
    const batch = structuredClone(input.versions?.length ? { ...input, versions: input.versions.map(v => packVersion(v) as unknown as AssetVersion) } : input);
    checkStorageBatch(batch);
    const stores = new Set<StoreName>();
    if (batch.projects?.length) stores.add('projects');
    if (batch.assets?.length) stores.add('assets');
    if (batch.versions?.length) stores.add('versions');
    if (batch.originals?.length) stores.add('originals');
    if (batch.collections?.length || batch.removeCollections?.length) stores.add('collections');
    if (batch.templates?.length || batch.removeTemplates?.length) stores.add('templates');
    if (!stores.size) return [];
    const saved = await this.run([...stores], 'readwrite', async tx => {
      const versions = tx.objectStore.bind(tx, 'versions'), projects = tx.objectStore.bind(tx, 'projects');
      // All CAS reads and validation precede every write in this same readwrite transaction.
      const read = <T>(store: StoreName, ids: readonly string[]) => Promise.all(ids.map(id => req(tx.objectStore(store).get(id) as IDBRequest<T | undefined>)));
      const [existingVersions, storedProjects, storedAssets, storedCollections, storedTemplates, removedCollections, removedTemplates] = await Promise.all([
        Promise.all((batch.versions ?? []).map(v => req(versions().get(v.id) as IDBRequest<AssetVersion | undefined>))),
        Promise.all((batch.projects ?? []).map(p => req(projects().get(p.project.id) as IDBRequest<Project | undefined>))),
        Promise.all((batch.assets ?? []).map(a => req(tx.objectStore('assets').get(a.id) as IDBRequest<Asset | undefined>))),
        read<Collection>('collections', (batch.collections ?? []).map(c => c.id)),
        read<LibraryTemplate>('templates', (batch.templates ?? []).map(t => t.id)),
        read<Collection>('collections', (batch.removeCollections ?? []).map(c => c.id)),
        read<LibraryTemplate>('templates', (batch.removeTemplates ?? []).map(t => t.id)),
      ]);
      (batch.versions ?? []).forEach((v, i) => {
        const e = existingVersions[i];
        if (e && e.payloadHash !== v.payloadHash) throw new Error(`Version ${v.id} existiert mit anderem Inhalt; Versionen sind unveränderlich.`);
      });
      const nextAssets = (batch.assets ?? []).map((asset, i) => nextAssetRevision(asset, storedAssets[i]));
      const nextProjects = (batch.projects ?? []).map(({ project, baseRevision }, i) => {
        const stored = storedProjects[i]?.revision ?? 0;
        if (stored !== baseRevision) throw new RevisionConflictError(stored, baseRevision);
        return { ...project, revision: baseRevision + 1 };
      });
      const nextCollections = (batch.collections ?? []).map((c, i) => nextLibraryRevision('collection', c, storedCollections[i]));
      const nextTemplates = (batch.templates ?? []).map((t, i) => nextLibraryRevision('template', t, storedTemplates[i]));
      (batch.removeCollections ?? []).forEach((ref, i) => { const stored = removedCollections[i]?.revision ?? 0; if (stored !== ref.revision) throw new LibraryRecordConflictError('collection', ref.id, stored, ref.revision); });
      (batch.removeTemplates ?? []).forEach((ref, i) => { const stored = removedTemplates[i]?.revision ?? 0; if (stored !== ref.revision) throw new LibraryRecordConflictError('template', ref.id, stored, ref.revision); });
      (batch.versions ?? []).forEach((v, i) => { if (!existingVersions[i]) versions().put(packVersion(v)); });
      for (const c of nextCollections) tx.objectStore('collections').put(c);
      for (const t of nextTemplates) tx.objectStore('templates').put(t);
      for (const ref of batch.removeCollections ?? []) tx.objectStore('collections').delete(ref.id);
      for (const ref of batch.removeTemplates ?? []) tx.objectStore('templates').delete(ref.id);
      for (const a of nextAssets) tx.objectStore('assets').put(a);
      for (const o of batch.originals ?? []) {
        const { bytes, ...meta } = o;
        tx.objectStore('originals').put({ ...meta, bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer } satisfies StoredOriginal);
      }
      for (const project of nextProjects) projects().put(project);
      return nextProjects;
    });
    if (saved.length) this.announce({ kind: 'projects', projectIds: saved.map(p => p.id) });
    if (batch.assets?.length || batch.versions?.length) this.announce({ kind: 'library' });
    if (batch.collections?.length || batch.templates?.length || batch.removeCollections?.length || batch.removeTemplates?.length) this.announce({ kind: 'userLibrary' });
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
