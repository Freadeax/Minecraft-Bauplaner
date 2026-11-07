import type { BackupFile } from './backup.js';
import type { Collection, LibraryTemplate } from '../catalog/collections.js';
import { canonicalJson, newId, sha256Hex } from '../core/hash.js';
import { DomainError } from '../core/types.js';
import type { Asset, Project } from '../core/types.js';
import { withoutTeamAccess } from '../team/teamAccessBasics.js';

/**
 * Sicherungsstand (BACKUP-02-S01). The app records a receipt for every backup
 * file it produced (download started), for every backup file the user opened
 * again whose checksum matched (verified, e.g. before a restore). Comparing the
 * newest receipts with the current data tells which projects and own library
 * records changed since they were last written to a file.
 *
 * Honesty rules: a receipt proves only that this browser produced or read a
 * file with that content hash. The app never claims the file reached the
 * download folder, a second device or a cloud; the texts say so. Fingerprints
 * ignore the storage revision (`revision`), so a restored record with the same
 * content counts as covered.
 */

export const BACKUP_LEDGER_SCHEMA = 1;
export const MAX_BACKUP_RECEIPTS = 40;
/** Changes older than this are "due" for a backup. */
export const BACKUP_REMIND_AFTER_DAYS = 7;
const DAY = 86_400_000;

export type BackupReceiptKind = 'download' | 'verified';
export interface ReceiptEntry { readonly id: string; readonly name: string; readonly fingerprint: string }

export interface BackupReceipt {
  readonly id: string;
  readonly kind: BackupReceiptKind;
  /** When this browser recorded the receipt. */
  readonly at: string;
  /** createdAt of the backup file. */
  readonly fileCreatedAt: string;
  readonly fileName: string;
  readonly scope: 'project' | 'all';
  readonly formatVersion: number;
  readonly contentSha256: string;
  readonly projects: readonly ReceiptEntry[];
  /** Own (non-demo) assets contained in the file. */
  readonly assets: readonly ReceiptEntry[];
  readonly collections: readonly ReceiptEntry[];
  readonly templates: readonly ReceiptEntry[];
  readonly missingOriginals: number;
}

export interface BackupLedger { readonly schemaVersion: 1; readonly receipts: readonly BackupReceipt[] }
export const emptyLedger = (): BackupLedger => ({ schemaVersion: 1, receipts: [] });

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const fail = (m: string): never => { throw new DomainError('BACKUP_LEDGER', `Sicherungsprotokoll: ${m}`); };

/** Validation of the stored ledger; a damaged ledger is reported, never silently replaced. */
export function checkBackupLedger(raw: unknown): BackupLedger {
  if (!isObj(raw) || raw.schemaVersion !== BACKUP_LEDGER_SCHEMA || !Array.isArray(raw.receipts)) return fail('unbekanntes Format');
  for (const r of raw.receipts as unknown[]) {
    if (!isObj(r) || typeof r.id !== 'string' || !['download', 'verified'].includes(r.kind as string)) fail('Eintrag ungültig');
    const e = r as Record<string, unknown>;
    for (const k of ['at', 'fileCreatedAt']) if (typeof e[k] !== 'string' || Number.isNaN(Date.parse(e[k] as string))) fail(`Zeitpunkt ${k} ungültig`);
    if (typeof e.fileName !== 'string' || (e.scope !== 'project' && e.scope !== 'all') || typeof e.contentSha256 !== 'string' || !Number.isInteger(e.formatVersion) || !Number.isInteger(e.missingOriginals)) fail('Eintrag unvollständig');
    for (const k of ['projects', 'assets', 'collections', 'templates']) {
      if (!Array.isArray(e[k]) || !(e[k] as unknown[]).every(x => isObj(x) && typeof x.id === 'string' && typeof x.name === 'string' && typeof x.fingerprint === 'string')) fail(`Liste ${k} ungültig`);
    }
  }
  return raw as unknown as BackupLedger;
}

/** Content fingerprint of a stored record, independent of its storage revision. */
export async function recordFingerprint(record: object): Promise<string> {
  // BACKUP-03: backups hold no Team-Raum block; its read position moves all the time and is no change of the plan.
  const { revision: _revision, ...rest } = withoutTeamAccess(record as Pick<Project, 'site'>) as Record<string, unknown>;
  return sha256Hex(canonicalJson(rest));
}

const entries = async <T extends { id: string; name: string }>(list: readonly T[]): Promise<ReceiptEntry[]> =>
  Promise.all(list.map(async r => ({ id: r.id, name: r.name, fingerprint: await recordFingerprint(r) })));

/** Receipt for a backup file (written or read back). Fingerprints come from the file content itself. */
export async function receiptForBackup(file: BackupFile, kind: BackupReceiptKind, fileName: string, at = new Date().toISOString(), id = newId('bkp')): Promise<BackupReceipt> {
  return {
    id, kind, at, fileCreatedAt: file.createdAt, fileName, scope: file.scope, formatVersion: file.formatVersion, contentSha256: file.contentSha256,
    projects: await entries(file.projects), assets: await entries(file.assets.filter(a => !a.demo)),
    collections: await entries(file.collections ?? []), templates: await entries(file.templates ?? []), missingOriginals: file.missingOriginals.length,
  };
}

/** Appends a receipt, keeping the newest MAX_BACKUP_RECEIPTS (oldest dropped first). */
export function addReceipt(ledger: BackupLedger, receipt: BackupReceipt): BackupLedger {
  const receipts = [...ledger.receipts, receipt].sort((a, b) => a.at.localeCompare(b.at));
  return { schemaVersion: 1, receipts: receipts.slice(-MAX_BACKUP_RECEIPTS) };
}

export type CoverageState = 'never' | 'changed' | 'current';
export interface CoverageLine {
  readonly id: string;
  readonly name: string;
  readonly kind: 'project' | 'asset' | 'collection' | 'template';
  readonly state: CoverageState;
  /** Newest receipt containing this record. */
  readonly receipt: BackupReceipt | null;
  /** When the record changed locally (projects: updatedAt), if known. */
  readonly changedAt?: string;
}

export interface BackupStatus {
  readonly level: 'ok' | 'hint' | 'due';
  readonly headline: string;
  readonly details: readonly string[];
  /** Always shown: what a receipt does and does not prove. */
  readonly disclaimer: string;
  readonly lastDownload: BackupReceipt | null;
  readonly lastFull: BackupReceipt | null;
  readonly lastVerified: BackupReceipt | null;
  readonly lines: readonly CoverageLine[];
  readonly pending: readonly CoverageLine[];
  /** Projects in the newest full backup that no longer exist locally (information, not an error). */
  readonly removedSinceFull: readonly ReceiptEntry[];
  /** Whole days since the oldest uncovered change (or since the last backup), null when nothing is pending. */
  readonly pendingDays: number | null;
}

export interface CurrentData {
  readonly projects: readonly Project[];
  readonly assets: readonly Asset[];
  readonly collections: readonly Collection[];
  readonly templates: readonly LibraryTemplate[];
}

export const BACKUP_DISCLAIMER = 'Das Build Studio weiß nur, dass dieser Browser eine Sicherungsdatei erzeugt oder wieder eingelesen hat. Ob sie in deinem Download-Ordner, auf einem zweiten Gerät oder in einer Cloud liegt, kann er nicht prüfen – eine Kopie außerhalb dieses Browsers gibt es nur, wenn du die Datei selbst dorthin legst.';

const fmt = (iso: string) => new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Compares current data with the receipts. A record is "current" when the
 * newest receipt that contains it has the same fingerprint, "changed" when it
 * differs and "never" when no receipt contains it. Shipped demo assets are not
 * user data and never count.
 */
export async function compareWithBackups(ledger: BackupLedger, data: CurrentData, now = new Date()): Promise<BackupStatus> {
  const receipts = [...ledger.receipts].sort((a, b) => b.at.localeCompare(a.at));
  const newest = (kind: CoverageLine['kind'], id: string) => receipts.find(r => listOf(r, kind).some(e => e.id === id)) ?? null;
  const lines: CoverageLine[] = [];
  const add = async (kind: CoverageLine['kind'], records: readonly { id: string; name: string; updatedAt?: string }[]) => {
    for (const rec of records) {
      const receipt = newest(kind, rec.id), entry = receipt && listOf(receipt, kind).find(e => e.id === rec.id);
      const state: CoverageState = !entry ? 'never' : entry.fingerprint === await recordFingerprint(rec) ? 'current' : 'changed';
      lines.push({ id: rec.id, name: rec.name, kind, state, receipt, ...(rec.updatedAt !== undefined && { changedAt: rec.updatedAt }) });
    }
  };
  await add('project', data.projects);
  await add('asset', data.assets.filter(a => !a.demo));
  await add('collection', data.collections);
  await add('template', data.templates);
  const pending = lines.filter(l => l.state !== 'current');
  const lastDownload = receipts.find(r => r.kind === 'download') ?? null, lastFull = receipts.find(r => r.scope === 'all') ?? null;
  const lastVerified = receipts.find(r => r.kind === 'verified') ?? null;
  const localProjects = new Set(data.projects.map(p => p.id));
  const removedSinceFull = (lastFull?.projects ?? []).filter(p => !localProjects.has(p.id));

  // Age of the oldest pending change: project updatedAt where known, otherwise the receipt time / last backup.
  const since = pending.map(l => l.changedAt ?? l.receipt?.at ?? lastDownload?.at).filter((t): t is string => !!t).sort()[0];
  const pendingDays = pending.length ? since ? Math.max(0, Math.floor((now.getTime() - Date.parse(since)) / DAY)) : null : null;
  const hasData = data.projects.length > 0 || lines.some(l => l.kind !== 'project');
  const level: BackupStatus['level'] = !pending.length ? 'ok'
    : !receipts.length && hasData ? 'due'
    : (pendingDays ?? BACKUP_REMIND_AFTER_DAYS) >= BACKUP_REMIND_AFTER_DAYS || pending.some(l => l.state === 'never' && l.kind === 'project') ? 'due' : 'hint';

  const details: string[] = [];
  const projectsPending = pending.filter(l => l.kind === 'project'), libraryPending = pending.filter(l => l.kind !== 'project');
  if (projectsPending.length) details.push(`${plural(projectsPending.length, 'Projekt', 'Projekte')} seit der letzten Sicherung geändert oder neu: ${projectsPending.slice(0, 5).map(l => `„${l.name}“`).join(', ')}${projectsPending.length > 5 ? ' …' : ''}.`);
  if (libraryPending.length) details.push(`${plural(libraryPending.length, 'eigener Bibliothekseintrag', 'eigene Bibliothekseinträge')} (Bauteile, Sammlungen, Vorlagen) noch nicht in einer Gesamtsicherung.`);
  if (lastDownload) details.push(`Letzte Sicherungsdatei erzeugt am ${fmt(lastDownload.at)} („${lastDownload.fileName}“, ${lastDownload.scope === 'all' ? 'alles' : 'einzelnes Projekt'}).`);
  if (lastVerified) details.push(`Zuletzt wieder eingelesen und Prüfsumme bestätigt am ${fmt(lastVerified.at)} („${lastVerified.fileName}“).`);
  else if (lastDownload) details.push('Noch keine Sicherungsdatei wieder eingelesen. Tipp: „Sicherung prüfen“ öffnet die Datei, vergleicht die Prüfsumme und schreibt nichts.');
  if (lastDownload && lastDownload.missingOriginals > 0) details.push(`In der letzten Sicherung fehlten ${plural(lastDownload.missingOriginals, 'Originaldatei', 'Originaldateien')}, die lokal nicht vorhanden waren.`);
  if (removedSinceFull.length) details.push(`${plural(removedSinceFull.length, 'Projekt', 'Projekte')} aus der letzten Gesamtsicherung gibt es lokal nicht mehr; die Datei enthält ${removedSinceFull.length === 1 ? 'es' : 'sie'} weiterhin.`);
  const headline = level === 'ok' ? (receipts.length ? 'Alles seit der letzten Sicherung unverändert.' : 'Noch nichts zu sichern.')
    : !receipts.length ? 'Noch nie gesichert – bitte eine Sicherungsdatei herunterladen.'
    : level === 'due' ? `Sicherung fällig: ${plural(pending.length, 'Änderung', 'Änderungen')} noch in keiner Sicherungsdatei${pendingDays !== null ? `, älteste seit ${plural(pendingDays, 'Tag', 'Tagen')}` : ''}.`
    : `${plural(pending.length, 'Änderung', 'Änderungen')} seit der letzten Sicherung.`;
  return { level, headline, details, disclaimer: BACKUP_DISCLAIMER, lastDownload, lastFull, lastVerified, lines, pending, removedSinceFull, pendingDays };
}

function listOf(r: BackupReceipt, kind: CoverageLine['kind']): readonly ReceiptEntry[] {
  return kind === 'project' ? r.projects : kind === 'asset' ? r.assets : kind === 'collection' ? r.collections : r.templates;
}

/** Finds the receipt of a file the user opened again (same content hash). */
export const receiptForHash = (ledger: BackupLedger, contentSha256: string): BackupReceipt | null =>
  [...ledger.receipts].reverse().find(r => r.contentSha256 === contentSha256 && r.kind === 'download') ?? null;
