import { checkWorldItem, newWorldItemId } from '../world/worldPlan.js';
import type { WorldItem, WorldPlan } from '../world/worldPlan.js';
import { assertAssetRecordFields, validateOriginalManifest } from './recordValidation.js';
import type { Asset, AssetVersion, Instance, Project } from '../core/types.js';
import { DOMAIN_SCHEMA_VERSION, DomainError } from '../core/types.js';
import { canonicalJson, newId, sha256Hex } from '../core/hash.js';
import { checkTransform } from '../core/project.js';
import { deepFreeze, verifyAssetVersion } from '../catalog/library.js';
import { checkSite } from '../building/site.js';
import { checkWorldPlacement } from '../world/worldmap.js';
import { checkUpdates } from '../versions/updateState.js';
import { projectVersionIds } from './planGraph.js';
import { checkTerrainReference } from '../world/terrainSurvey.js';
import { packVersionForFile, unpackVersionFromFile } from './versionStorage.js';
import { checkTerrainDesignReference } from '../world/terrainDesign.js';

/** Original files a project refers to: game recordings, the terrain survey (TERRAIN-01), the terrain design and the survey it was made on (TERRAIN-02). */
const projectOriginals = (p: Pick<Project, 'scanHistory' | 'terrain' | 'terrainDesign'>): string[] => [...new Set([...(p.scanHistory ?? []).map(s => s.sha256), ...(p.terrain ? [p.terrain.sha256] : []),
  ...(p.terrainDesign ? [p.terrainDesign.sha256, ...(p.terrainDesign.base.kind === 'survey' ? [p.terrainDesign.base.sha256] : [])] : [])])];
import { checkCollectionRecord, checkTemplateRecord, pinnedVersionIds, sameLibraryRecord, templateVersionIds } from '../catalog/collections.js';
import type { Collection, LibraryTemplate } from '../catalog/collections.js';

/**
 * Persistence and backup contract (P2-01, R-023/R-024). Pure and storage
 * independent: the web repository stores these records, backups move them
 * between browsers. Nothing here overwrites data; restore produces an explicit
 * plan that the caller confirms and writes atomically.
 */

/** Unchanged bytes of an imported file, addressed by their SHA-256. */
export interface OriginalFile {
  readonly sha256: string;
  readonly fileName: string;
  readonly mediaType: string;
  readonly size: number;
  readonly createdAt: string;
  readonly bytes: Uint8Array;
}

export const BACKUP_FORMAT = 'minecraft-bauplaner-backup';
export const BACKUP_FORMAT_VERSION = 1;
/**
 * Format 2 (LIB-02/LIB-03) adds own collections and templates. It is written
 * only when such records are contained, so backups without them stay format 1
 * and older app versions can still read them. Format 1 files remain valid.
 */
export const BACKUP_FORMAT_VERSION_LIBRARY = 2;
/**
 * Format 3 (STORE-03) is a storage container around format 1 or 2: version
 * cells are packed (`packedCells`, Base64) and `baseFormatVersion` names the
 * logical format. `contentSha256` is computed over the unpacked logical content
 * exactly as in the base format, so a receipt and the checksum stay the same
 * whether a file was written packed or plain. Written by {@link serializeBackup}.
 */
export const BACKUP_FORMAT_VERSION_PACKED = 3;
/** Upper bound for a backup file read in the browser. */
export const MAX_BACKUP_BYTES = 100_000_000;

interface BackupOriginal { readonly sha256: string; readonly fileName: string; readonly mediaType: string; readonly size: number; readonly createdAt: string; readonly base64: string }
interface BackupContent {
  readonly projects: readonly Project[];
  readonly assets: readonly Asset[];
  readonly versions: readonly AssetVersion[];
  readonly originals: readonly BackupOriginal[];
  /** Format 2 only. */
  readonly collections?: readonly Collection[];
  readonly templates?: readonly LibraryTemplate[];
  /** Format 2 only, and only when the Weltplan has entries (MAP-03); joins the content hash only when present. */
  readonly worldPlanItems?: readonly WorldItem[];
}
export interface BackupFile extends BackupContent {
  readonly format: typeof BACKUP_FORMAT;
  readonly formatVersion: number;
  readonly schemaVersion: number;
  readonly createdAt: string;
  readonly scope: 'project' | 'all';
  /** Originals referenced by versions that were not available locally. */
  readonly missingOriginals: readonly string[];
  /** SHA-256 over the canonical JSON of projects, assets, versions and originals. */
  readonly contentSha256: string;
}

/** Verified, decoded backup content ready for planning. */
export interface Backup {
  readonly createdAt: string;
  readonly scope: 'project' | 'all';
  readonly projects: readonly Project[];
  readonly assets: readonly Asset[];
  readonly versions: readonly AssetVersion[];
  readonly originals: readonly OriginalFile[];
  readonly missingOriginals: readonly string[];
  readonly collections: readonly Collection[];
  readonly templates: readonly LibraryTemplate[];
  /** Weltplan entries (sites, paths, points) of a full backup; empty when none. */
  readonly worldPlanItems: readonly WorldItem[];
}

/** Rejects records written by a newer app and unknown old schemas. */
export function checkSchemaVersion(kind: string, record: { readonly schemaVersion?: unknown }): void {
  const v = record.schemaVersion;
  if (v === DOMAIN_SCHEMA_VERSION) return;
  if (typeof v === 'number' && v > DOMAIN_SCHEMA_VERSION) throw new DomainError('SCHEMA_NEWER', `${kind} stammt aus einer neueren App-Version (Schema ${v}). Bitte die App aktualisieren.`);
  throw new DomainError('SCHEMA', `${kind} hat ein unbekanntes Schema (${String(v)}).`);
}

/** Version ids an instance list and its frozen revisions depend on. */
export function referencedVersionIds(project: Project): Set<string> {
  // Required references of the reference graph (planGraph.ts): instances, frozen revisions and
  // versions an update can return to (UPDATE-01). History references are added by createBackup.
  return projectVersionIds(project, true);
}

export function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export function fromBase64(text: string): Uint8Array {
  let s: string;
  try { s = atob(text); } catch { throw new DomainError('BACKUP', 'Originaldatei ist nicht gültig Base64-kodiert'); }
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

// Format 1 hashes exactly the four original lists; the library lists join the hash only when present (format 2).
const contentHash = (c: BackupContent) => sha256Hex(canonicalJson({ projects: c.projects, assets: c.assets, versions: c.versions, originals: c.originals,
  ...(c.collections !== undefined && { collections: c.collections }), ...(c.templates !== undefined && { templates: c.templates }),
  ...(c.worldPlanItems !== undefined && { worldPlanItems: c.worldPlanItems }) }));
const byId = <T extends { id: string }>(a: T, b: T) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

export interface BackupSource {
  readonly projects: readonly Project[];
  readonly assets: readonly Asset[];
  readonly versions: ReadonlyMap<string, AssetVersion>;
  /** Looks up stored originals; missing ones are listed, not invented. */
  getOriginal(sha256: string): Promise<OriginalFile | null>;
  /** Own collections and templates; included in full backups (scope "all"). */
  readonly collections?: readonly Collection[];
  readonly templates?: readonly LibraryTemplate[];
  /** Weltplan (MAP-03); its entries join full backups. */
  readonly worldPlan?: WorldPlan;
}

/**
 * Builds a self-contained backup: every version a project or revision uses,
 * all versions of those assets (so asset histories stay complete) and their
 * original files. Each version is verified before it is written; a damaged
 * local record aborts the backup instead of being exported.
 */
export async function createBackup(source: BackupSource, scope: 'project' | 'all', projectIds?: readonly string[]): Promise<BackupFile> {
  const projects = scope === 'all' ? [...source.projects] : source.projects.filter(p => projectIds?.includes(p.id));
  if (scope === 'project' && projects.length !== (projectIds?.length ?? 0)) throw new DomainError('BACKUP', 'Zu sichernde Projekte nicht gefunden');
  const assetIds = new Set<string>(scope === 'all' ? source.assets.filter(a => !a.demo).map(a => a.id) : []);
  for (const p of projects) for (const id of referencedVersionIds(p)) {
    const v = source.versions.get(id);
    if (!v) throw new DomainError('BACKUP', `Projekt „${p.name}“ verweist auf fehlende Version ${id}; Sicherung wäre unvollständig`);
    assetIds.add(v.assetId);
  }
  // History references (section snapshots, frozen pins): included when stored, never a reason to fail.
  for (const p of projects) for (const id of projectVersionIds(p)) { const v = source.versions.get(id); if (v) assetIds.add(v.assetId); }
  // Full backups keep own collections and templates with every version they pin (also of shipped assets).
  const collections = scope === 'all' ? [...(source.collections ?? [])].sort(byId) : [];
  const templates = scope === 'all' ? [...(source.templates ?? [])].sort(byId) : [];
  const pinned = new Set([...pinnedVersionIds(collections), ...templates.flatMap(t => [...templateVersionIds(t)])]);
  for (const id of pinned) {
    const v = source.versions.get(id);
    if (v) assetIds.add(v.assetId);
    else if (templates.some(t => t.body.kind === 'ensemble' && t.body.members.some(m => m.assetVersionId === id))) throw new DomainError('BACKUP', `Eine Vorlage verweist auf fehlende Version ${id}; Sicherung wäre unvollständig`);
  }
  const assets = source.assets.filter(a => assetIds.has(a.id));
  if (assets.length !== assetIds.size) throw new DomainError('BACKUP', 'Ein verwendetes Bauteil fehlt in der Bibliothek');
  const versions: AssetVersion[] = [];
  for (const a of assets) for (const id of a.versionIds) {
    const v = source.versions.get(id);
    if (!v) throw new DomainError('BACKUP', `Bauteil „${a.name}“: Version ${id} fehlt lokal`);
    await verifyAssetVersion(v);
    versions.push(v);
  }
  const originals: BackupOriginal[] = [], missing: string[] = [];
  for (const sha of new Set([...versions.flatMap(v => v.source.originalSha256 ? [v.source.originalSha256] : []), ...projects.flatMap(projectOriginals)])) {
    const o = await source.getOriginal(sha);
    if (!o) { missing.push(sha); continue; }
    if (await sha256Hex(o.bytes) !== sha) throw new DomainError('BACKUP', `Gespeicherte Originaldatei ${o.fileName} ist beschädigt`);
    originals.push({ sha256: sha, fileName: o.fileName, mediaType: o.mediaType, size: o.size, createdAt: o.createdAt, base64: toBase64(o.bytes) });
  }
  const worldPlanItems = scope === 'all' ? [...(source.worldPlan?.items ?? [])].sort(byId) : [];
  const library = collections.length || templates.length || worldPlanItems.length;
  const content: BackupContent = { projects: [...projects].sort(byId), assets: [...assets].sort(byId), versions: versions.sort(byId), originals: originals.sort((a, b) => a.sha256 < b.sha256 ? -1 : 1),
    ...(library && { collections, templates }), ...(worldPlanItems.length > 0 && { worldPlanItems }) };
  return {
    format: BACKUP_FORMAT, formatVersion: library ? BACKUP_FORMAT_VERSION_LIBRARY : BACKUP_FORMAT_VERSION, schemaVersion: DOMAIN_SCHEMA_VERSION, createdAt: new Date().toISOString(), scope,
    ...content, missingOriginals: missing.sort(), contentSha256: await contentHash(content),
  };
}

/**
 * Text of a backup file. Versions are packed (format 3) whenever that is exact;
 * otherwise, or for a file without versions, the logical file is written as is.
 */
export function serializeBackup(file: BackupFile): string {
  const versions = file.versions.map(v => packVersionForFile(v, toBase64));
  if (!versions.some(v => 'packedCells' in v)) return JSON.stringify(file);
  return JSON.stringify({ ...file, formatVersion: BACKUP_FORMAT_VERSION_PACKED, baseFormatVersion: file.formatVersion, versions });
}

/** Turns a format 3 container back into its logical base format; other formats pass through. */
function unpackBackupContainer(raw: Record<string, unknown>): Record<string, unknown> {
  if (raw.formatVersion !== BACKUP_FORMAT_VERSION_PACKED) return raw;
  const base = raw.baseFormatVersion;
  if (base !== BACKUP_FORMAT_VERSION && base !== BACKUP_FORMAT_VERSION_LIBRARY) throw new DomainError('BACKUP', `Gepackte Sicherung nennt unbekanntes Grundformat ${String(base)}`);
  const { baseFormatVersion: _b, ...rest } = raw;
  return { ...rest, formatVersion: base, versions: arr(raw.versions, 'Versionen').map(v => unpackVersionFromFile(v, fromBase64)) };
}

export function backupFileName(file: BackupFile): string {
  const day = file.createdAt.slice(0, 10);
  const name = file.scope === 'project' && file.projects.length === 1 ? file.projects[0]!.name : 'alle-projekte';
  const slug = name.normalize('NFKD').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 60) || 'projekt';
  return `bauplaner-${slug}-${day}.bauplaner.json`;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, what: string): string => { if (typeof v !== 'string') throw new DomainError('BACKUP', `${what} fehlt oder ist kein Text`); return v; };
const arr = (v: unknown, what: string): unknown[] => { if (!Array.isArray(v)) throw new DomainError('BACKUP', `${what} fehlt oder ist keine Liste`); return v; };

function checkInstances(list: unknown, where: string): void {
  const seen = new Set<string>();
  for (const raw of arr(list, `${where}: Instanzen`)) {
    if (!isObj(raw)) throw new DomainError('BACKUP', `${where}: ungültige Instanz`);
    const id = str(raw.id, `${where}: Instanz-ID`);
    if (seen.has(id)) throw new DomainError('BACKUP', `${where}: doppelte Instanz ${id}`);
    seen.add(id); str(raw.name, `${where}: Instanzname`); str(raw.assetVersionId, `${where}: Versionsbezug`);
    if (typeof raw.override !== 'boolean') throw new DomainError('BACKUP', `${where}: Override-Angabe fehlt`);
    try { checkTransform((raw as unknown as Instance).transform); }
    catch (e) { throw new DomainError('BACKUP', `${where}: ${e instanceof Error ? e.message : String(e)}`); }
  }
}

/** Structural check of a project record from outside (backup or old storage). */
export function checkProjectRecord(raw: unknown): Project {
  if (!isObj(raw)) throw new DomainError('BACKUP', 'Projekt ist kein Objekt');
  checkSchemaVersion('Projekt', raw);
  const where = `Projekt „${str(raw.name, 'Projektname')}“`;
  str(raw.id, `${where}: ID`); str(raw.description, `${where}: Beschreibung`); str(raw.profileId, `${where}: Profil`);
  str(raw.createdAt, `${where}: Erstellzeit`); str(raw.updatedAt, `${where}: Änderungszeit`);
  if (!Number.isInteger(raw.revision) || (raw.revision as number) < 0) throw new DomainError('BACKUP', `${where}: ungültige Speicherrevision`);
  checkInstances(raw.instances, where);
  const instanceIds = new Set((raw.instances as Instance[]).map(i => i.id));
  for (const l of arr(raw.links, `${where}: Verbindungen`)) {
    if (!isObj(l) || !isObj(l.a) || !isObj(l.b) || !instanceIds.has(l.a.instanceId as string) || !instanceIds.has(l.b.instanceId as string))
      throw new DomainError('BACKUP', `${where}: Verbindung verweist auf fehlende Instanz`);
  }
  if (!isObj(raw.progress)) throw new DomainError('BACKUP', `${where}: Fortschritt fehlt`);
  if (raw.site !== undefined) checkSite(raw.site);
  if (raw.world !== undefined) {
    try { checkWorldPlacement(raw.world); }
    catch (e) { throw new DomainError('BACKUP', `${where}: ${e instanceof Error ? e.message : String(e)}`); }
  }
  if (raw.updates !== undefined) {
    try { checkUpdates(raw.updates); }
    catch (e) { throw new DomainError('BACKUP', `${where}: ${e instanceof Error ? e.message : String(e)}`); }
  }
  if (raw.terrain !== undefined) {
    try { checkTerrainReference(raw.terrain); }
    catch (e) { throw new DomainError('BACKUP', `${where}: ${e instanceof Error ? e.message : String(e)}`); }
  }
  if (raw.terrainDesign !== undefined) {
    try { checkTerrainDesignReference(raw.terrainDesign); }
    catch (e) { throw new DomainError('BACKUP', `${where}: ${e instanceof Error ? e.message : String(e)}`); }
  }
  if (raw.scanHistory !== undefined) {
    const hashes = new Set<string>();
    const revisionIds = new Set(arr(raw.revisions, `${where}: Revisionen`).map(r => isObj(r) ? r.id : undefined));
    for (const s of arr(raw.scanHistory, `${where}: Spielaufnahmen`)) {
      if (!isObj(s) || typeof s.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(s.sha256) || hashes.has(s.sha256))
        throw new DomainError('BACKUP', `${where}: ungültiger oder doppelter Aufnahmehash`);
      hashes.add(s.sha256);
      const fileName = str(s.fileName, `${where}: Aufnahmedateiname`);
      if (!fileName.trim() || fileName.length > 255 || /[\x00-\x1f]/.test(fileName)) throw new DomainError('BACKUP', `${where}: ungültiger Aufnahmedateiname`);
      const at = str(s.importedAt, `${where}: Aufnahmeimportzeit`);
      if (!Number.isFinite(Date.parse(at))) throw new DomainError('BACKUP', `${where}: ungültige Aufnahmeimportzeit`);
      if (s.revisionId !== null && (typeof s.revisionId !== 'string' || !revisionIds.has(s.revisionId)))
        throw new DomainError('BACKUP', `${where}: Aufnahme verweist auf unbekannte Revision`);
      if (!Array.isArray(s.alignment) || s.alignment.length !== 3 || !s.alignment.every(n => Number.isSafeInteger(n)))
        throw new DomainError('BACKUP', `${where}: ungültige Aufnahmeausrichtung`);
    }
  }
  for (const r of arr(raw.revisions, `${where}: Revisionen`)) {
    if (!isObj(r) || !Number.isInteger(r.number)) throw new DomainError('BACKUP', `${where}: ungültige Revision`);
    checkInstances(r.instances, `${where}, Revision ${String(r.number)}`); arr(r.links, `${where}: Revisionsverbindungen`);
  }
  return raw as unknown as Project;
}

export function checkAssetRecord(raw: unknown): Asset {
  if (!isObj(raw)) throw new DomainError('BACKUP', 'Bauteil ist kein Objekt');
  checkSchemaVersion('Bauteil', raw);
  assertAssetRecordFields(raw);
  return raw as unknown as Asset;
}

/**
 * Parses and fully verifies a backup: format and schema, overall content
 * hash, every version's content address, every original's SHA-256 and
 * completeness (each referenced version and asset is contained).
 */
export async function readBackup(text: string): Promise<Backup> {
  if (text.length > MAX_BACKUP_BYTES) throw new DomainError('BACKUP', 'Sicherungsdatei ist zu groß');
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new DomainError('BACKUP', 'Keine gültige Sicherungsdatei (kein JSON)'); }
  if (!isObj(raw) || raw.format !== BACKUP_FORMAT) throw new DomainError('BACKUP', 'Keine Minecraft-Bauplaner-Sicherung');
  raw = unpackBackupContainer(raw);
  if (!isObj(raw)) throw new DomainError('BACKUP', 'Keine Minecraft-Bauplaner-Sicherung');
  if (raw.formatVersion !== BACKUP_FORMAT_VERSION && raw.formatVersion !== BACKUP_FORMAT_VERSION_LIBRARY) {
    throw new DomainError(typeof raw.formatVersion === 'number' && raw.formatVersion > BACKUP_FORMAT_VERSION_PACKED ? 'SCHEMA_NEWER' : 'BACKUP',
      `Sicherungsformat ${String(raw.formatVersion)} wird nicht unterstützt (erwartet ${BACKUP_FORMAT_VERSION} bis ${BACKUP_FORMAT_VERSION_PACKED})`);
  }
  const withLibrary = raw.formatVersion === BACKUP_FORMAT_VERSION_LIBRARY;
  if (!withLibrary && (raw.collections !== undefined || raw.templates !== undefined || raw.worldPlanItems !== undefined)) throw new DomainError('BACKUP', 'Sicherungsformat 1 darf keine Sammlungen, Vorlagen oder Weltplan-Einträge enthalten');
  checkSchemaVersion('Sicherung', raw);
  const content: BackupContent = {
    projects: arr(raw.projects, 'Projekte') as Project[], assets: arr(raw.assets, 'Bauteile') as Asset[],
    versions: arr(raw.versions, 'Versionen') as AssetVersion[], originals: arr(raw.originals, 'Originaldateien') as BackupOriginal[],
    ...(withLibrary && { collections: arr(raw.collections, 'Sammlungen') as Collection[], templates: arr(raw.templates, 'Vorlagen') as LibraryTemplate[] }),
    ...(withLibrary && raw.worldPlanItems !== undefined && { worldPlanItems: arr(raw.worldPlanItems, 'Weltplan') as WorldItem[] }),
  };
  if (await contentHash(content) !== raw.contentSha256) throw new DomainError('BACKUP', 'Prüfsumme der Sicherung stimmt nicht – Datei beschädigt oder verändert');
  const projects = content.projects.map(checkProjectRecord), assets = content.assets.map(checkAssetRecord);
  const collections = (content.collections ?? []).map(checkCollectionRecord), templates = (content.templates ?? []).map(checkTemplateRecord);
  const worldPlanItems = (content.worldPlanItems ?? []).map(checkWorldItem);
  for (const [label, list] of [['Sammlung', collections], ['Vorlage', templates], ['Weltplan-Eintrag', worldPlanItems]] as const) {
    const seen = new Set<string>();
    for (const r of list) { if (seen.has(r.id)) throw new DomainError('BACKUP', `${label} ${r.id} doppelt enthalten`); seen.add(r.id); }
  }
  const versions = new Map<string, AssetVersion>();
  for (const v of content.versions) {
    if (!isObj(v)) throw new DomainError('BACKUP', 'Version ist kein Objekt');
    checkSchemaVersion('Version', v);
    await verifyAssetVersion(v);
    versions.set(v.id, v);
  }
  const assetById = new Map(assets.map(a => [a.id, a]));
  for (const a of assets) for (const id of a.versionIds) if (!versions.has(id)) throw new DomainError('BACKUP', `Unvollständig: Version ${id} von „${a.name}“ fehlt`);
  for (const v of versions.values()) if (!assetById.get(v.assetId)?.versionIds.includes(v.id)) throw new DomainError('BACKUP', `Unvollständig: Version ${v.id} gehört zu keinem enthaltenen Bauteil`);
  for (const p of projects) for (const id of referencedVersionIds(p)) if (!versions.has(id)) throw new DomainError('BACKUP', `Unvollständig: Projekt „${p.name}“ verweist auf fehlende Version ${id}`);
  for (const t of templates) for (const id of templateVersionIds(t)) if (!versions.has(id)) throw new DomainError('BACKUP', `Unvollständig: Vorlage „${t.name}“ verweist auf fehlende Version ${id}`);
  const ids = new Set<string>();
  for (const p of projects) { if (ids.has(p.id)) throw new DomainError('BACKUP', `Projekt ${p.id} doppelt enthalten`); ids.add(p.id); }
  const originals: OriginalFile[] = [];
  for (const o of content.originals) {
    if (!isObj(o)) throw new DomainError('BACKUP', 'Originaldatei ist kein Objekt');
    const bytes = fromBase64(str(o.base64, 'Originaldaten'));
    if (await sha256Hex(bytes) !== o.sha256 || bytes.length !== o.size) throw new DomainError('BACKUP', `Originaldatei ${String(o.fileName)} ist beschädigt (SHA-256 abweichend)`);
    originals.push({ sha256: o.sha256, fileName: str(o.fileName, 'Dateiname'), mediaType: str(o.mediaType, 'Medientyp'), size: o.size, createdAt: str(o.createdAt, 'Zeit'), bytes });
  }
  const missingOriginals = validateOriginalManifest([...versions.values()].flatMap(v => v.source.originalSha256 ? [v.source.originalSha256] : []).concat(projects.flatMap(projectOriginals)), originals, raw.missingOriginals ?? []);
  // Byte arrays cannot be frozen; records around them are.
  return Object.freeze({ createdAt: str(raw.createdAt, 'Sicherungszeit'), scope: raw.scope === 'project' ? 'project' as const : 'all' as const,
    projects: deepFreeze(projects), assets: deepFreeze(assets), versions: deepFreeze([...versions.values()]),
    originals: Object.freeze(originals.map(o => Object.freeze(o))), missingOriginals: deepFreeze(missingOriginals),
    collections: deepFreeze(collections), templates: deepFreeze(templates), worldPlanItems: deepFreeze(worldPlanItems) });
}

/** What the target store already holds. */
export interface RestoreTarget {
  readonly projects: readonly Project[];
  readonly assets: readonly Asset[];
  readonly versionIds: ReadonlySet<string>;
  readonly originalHashes: ReadonlySet<string>;
  readonly collections?: readonly Collection[];
  readonly templates?: readonly LibraryTemplate[];
  readonly worldPlanItems?: readonly WorldItem[];
}

export type ProjectChoice = 'copy' | 'replace' | 'skip';
export interface ProjectPlan {
  readonly project: Project;
  /** new: id unknown locally; same: identical content stored; differs: local project with same id differs. */
  readonly status: 'new' | 'same' | 'differs';
  readonly local?: Project;
}
export interface AssetPlan {
  readonly asset: Asset;
  readonly status: 'new' | 'same' | 'merge';
  /** Versions added to an existing local asset (merge keeps local name, tags, provenance). */
  readonly addedVersionIds: readonly string[];
  readonly local?: Asset;
}
/** Own collection or template from a backup: new, identical, or differing from a local record with the same id. */
export interface LibraryRecordPlan<T> { readonly record: T; readonly status: 'new' | 'same' | 'differs'; readonly local?: T }
export interface RestorePlan {
  readonly backup: Backup;
  readonly projects: readonly ProjectPlan[];
  readonly assets: readonly AssetPlan[];
  readonly newVersions: readonly AssetVersion[];
  readonly newOriginals: readonly OriginalFile[];
  readonly collections: readonly LibraryRecordPlan<Collection>[];
  readonly templates: readonly LibraryRecordPlan<LibraryTemplate>[];
  readonly worldPlanItems: readonly LibraryRecordPlan<WorldItem>[];
}

/** Content equality ignoring storage revision and save time. */
function sameProject(a: Project, b: Project): boolean {
  const strip = (p: Project) => canonicalJson({ ...p, revision: 0, updatedAt: '' });
  return strip(a) === strip(b);
}

export function planRestore(backup: Backup, target: RestoreTarget): RestorePlan {
  const localProjects = new Map(target.projects.map(p => [p.id, p]));
  const localAssets = new Map(target.assets.map(a => [a.id, a]));
  const projects = backup.projects.map((project): ProjectPlan => {
    const local = localProjects.get(project.id);
    if (!local) return { project, status: 'new' };
    return { project, status: sameProject(local, project) ? 'same' : 'differs', local };
  });
  const assets = backup.assets.map((asset): AssetPlan => {
    const local = localAssets.get(asset.id);
    if (!local) return { asset, status: 'new', addedVersionIds: asset.versionIds };
    const added = asset.versionIds.filter(id => !local.versionIds.includes(id));
    return { asset, local, addedVersionIds: added, status: added.length === 0 && canonicalJson({ ...local, revision: 0 }) === canonicalJson({ ...asset, revision: 0 }) ? 'same' : 'merge' };
  });
  const planRecords = <T extends Collection | LibraryTemplate>(list: readonly T[], local: readonly T[] = []): LibraryRecordPlan<T>[] => {
    const byLocal = new Map(local.map(r => [r.id, r]));
    return list.map(record => { const l = byLocal.get(record.id); return !l ? { record, status: 'new' } : { record, local: l, status: sameLibraryRecord(l, record) ? 'same' : 'differs' }; });
  };
  return Object.freeze({ backup, projects: Object.freeze(projects), assets: Object.freeze(assets),
    collections: Object.freeze(planRecords(backup.collections, target.collections)), templates: Object.freeze(planRecords(backup.templates, target.templates)),
    worldPlanItems: Object.freeze(backup.worldPlanItems.map((record): LibraryRecordPlan<WorldItem> => {
      const local = target.worldPlanItems?.find(i => i.id === record.id);
      return !local ? { record, status: 'new' } : { record, local, status: canonicalJson(local) === canonicalJson(record) ? 'same' : 'differs' };
    })),
    newVersions: backup.versions.filter(v => !target.versionIds.has(v.id)),
    newOriginals: backup.originals.filter(o => !target.originalHashes.has(o.sha256)) });
}

/** Records to write in one atomic storage transaction. */
export interface RestoreWrite {
  readonly assets: readonly Asset[];
  readonly versions: readonly AssetVersion[];
  readonly originals: readonly OriginalFile[];
  /** baseRevision 0 = must not exist yet; otherwise the local revision being replaced. */
  readonly projects: readonly { readonly project: Project; readonly baseRevision: number }[];
  /** New records (revision 0); a differing local record is never replaced, the backup state is added as a copy. */
  readonly collections: readonly Collection[];
  readonly templates: readonly LibraryTemplate[];
  /** Weltplan entries to add (new ones, and copies of differing ones under a new id); local entries are never replaced. */
  readonly worldPlanItems: readonly WorldItem[];
  readonly summary: readonly string[];
}

/**
 * Turns a plan plus explicit per-project choices into writes. Default for a
 * differing project is "copy": the backup is stored under a new id and the
 * local project stays untouched. "replace" carries the local revision as
 * baseRevision, so a concurrent change in another tab still aborts the write.
 */
export function buildRestore(plan: RestorePlan, choices: Readonly<Record<string, ProjectChoice>> = {}): RestoreWrite {
  const summary: string[] = [], projects: { project: Project; baseRevision: number }[] = [];
  const stamp = new Date().toLocaleDateString('de-DE');
  for (const p of plan.projects) {
    if (p.status === 'same') { summary.push(`„${p.project.name}“ ist bereits identisch vorhanden – übersprungen.`); continue; }
    if (p.status === 'new') { projects.push({ project: p.project, baseRevision: 0 }); summary.push(`„${p.project.name}“ wird neu angelegt.`); continue; }
    const choice = choices[p.project.id] ?? 'copy';
    if (choice === 'skip') summary.push(`„${p.project.name}“: lokale Fassung bleibt, Sicherung übersprungen.`);
    else if (choice === 'replace') { projects.push({ project: p.project, baseRevision: p.local!.revision }); summary.push(`„${p.project.name}“: lokale Fassung wird ausdrücklich durch die Sicherung ersetzt.`); }
    else {
      const name = `${p.project.name} (Wiederhergestellt ${stamp})`.slice(0, 120);
      projects.push({ project: { ...p.project, id: newId('project'), name }, baseRevision: 0 });
      summary.push(`„${p.project.name}“ unterscheidet sich lokal – als Kopie „${name}“ angelegt, Original unverändert.`);
    }
  }
  const assets: Asset[] = [];
  for (const a of plan.assets) {
    if (a.status === 'new') { assets.push({ ...a.asset, revision: 0 }); summary.push(`Bauteil „${a.asset.name}“ neu (${a.asset.versionIds.length} Version(en)).`); }
    else if (a.status === 'merge') {
      if (a.addedVersionIds.length) assets.push({ ...a.local!, versionIds: [...a.local!.versionIds, ...a.addedVersionIds] });
      summary.push(`Bauteil „${a.local!.name}“: lokale Angaben behalten${a.addedVersionIds.length ? `, ${a.addedVersionIds.length} fehlende Version(en) ergänzt` : ''}.`);
    }
  }
  const collections: Collection[] = [], templates: LibraryTemplate[] = [];
  const copyName = (n: string) => `${n} (Wiederhergestellt ${stamp})`.slice(0, 120);
  for (const c of plan.collections) {
    if (c.status === 'same') continue;
    if (c.status === 'new') { collections.push({ ...c.record, revision: 0 }); summary.push(`Sammlung „${c.record.name}“ neu.`); continue; }
    const name = copyName(c.record.name);
    collections.push({ ...c.record, id: newId('col'), name, revision: 0 });
    summary.push(`Sammlung „${c.record.name}“ unterscheidet sich lokal – als Kopie „${name}“ angelegt, lokale Fassung unverändert.`);
  }
  for (const t of plan.templates) {
    if (t.status === 'same') continue;
    if (t.status === 'new') { templates.push({ ...t.record, revision: 0 }); summary.push(`Vorlage „${t.record.name}“ neu.`); continue; }
    const name = copyName(t.record.name);
    templates.push({ ...t.record, id: newId('tpl'), name, revision: 0 });
    summary.push(`Vorlage „${t.record.name}“ unterscheidet sich lokal – als Kopie „${name}“ angelegt, lokale Fassung unverändert.`);
  }
  const worldPlanItems: WorldItem[] = [];
  for (const w of plan.worldPlanItems ?? []) {
    if (w.status === 'same') continue;
    if (w.status === 'new') { worldPlanItems.push(w.record); continue; }
    worldPlanItems.push({ ...w.record, id: newWorldItemId(w.record.kind), name: copyName(w.record.name) });
  }
  if (worldPlanItems.length) summary.push(`Weltplan: ${worldPlanItems.length} Eintrag/Einträge ergänzt (Bauplätze, Wege, Punkte; lokale Einträge unverändert).`);
  const sameRecords = [...plan.collections, ...plan.templates].filter(r => r.status === 'same').length;
  if (sameRecords) summary.push(`${sameRecords} Sammlung(en)/Vorlage(n) bereits identisch vorhanden – übersprungen.`);
  if (plan.newOriginals.length) summary.push(`${plan.newOriginals.length} Originaldatei(en) ergänzt.`);
  if (plan.backup.missingOriginals.length) summary.push(`${plan.backup.missingOriginals.length} Originaldatei(en) waren schon bei der Sicherung nicht vorhanden.`);
  return { assets, versions: plan.newVersions, originals: plan.newOriginals, projects, collections, templates, worldPlanItems, summary };
}
