import { useCallback, useEffect, useRef, useState } from 'react';
import { compareWithBackups, emptyLedger, receiptForBackup } from '../../../../packages/domain/src/index.js';
import type { BackupFile, BackupLedger, BackupReceiptKind, BackupStatus, CurrentData, Project } from '../../../../packages/domain/src/index.js';
import type { Repository } from './repository';

/**
 * Sicherungsstand in the browser (BACKUP-02-S01). Receipts are stored in the
 * repository (IndexedDB `meta`); comparisons are recomputed from the stored
 * data whenever projects, the library or the receipts change, in this tab
 * (window event) or another (BroadcastChannel via repo.subscribe).
 */
const EVENT = 'bauplaner:backups';
const announce = () => window.dispatchEvent(new CustomEvent(EVENT));

/** Records a receipt for a backup file and notifies all views. Never throws: a failed record is returned as text. */
export async function recordBackupReceipt(repo: Repository, file: BackupFile, kind: BackupReceiptKind, fileName: string): Promise<string | null> {
  try { await repo.recordBackup(await receiptForBackup(file, kind, fileName)); announce(); return null; }
  catch (e) { return `Sicherungsprotokoll nicht gespeichert: ${e instanceof Error ? e.message : String(e)}`; }
}

export interface BackupStatusState {
  readonly status: BackupStatus | null;
  readonly ledger: BackupLedger;
  readonly error: string;
  reload(): Promise<void>;
}

function useLedgerRefresh(repo: Repository, reload: () => void, kinds: readonly string[]) {
  const latest = useRef(reload); latest.current = reload;
  useEffect(() => {
    const local = () => latest.current();
    window.addEventListener(EVENT, local);
    const off = repo.subscribe(c => { if (kinds.includes(c.kind)) latest.current(); });
    return () => { window.removeEventListener(EVENT, local); off(); };
  }, [repo, kinds.join('|')]);
}

const ALL_KINDS = ['projects', 'library', 'userLibrary', 'backups'];

/** Status over all local data (Projektzentrale). */
export function useBackupStatus(repo: Repository): BackupStatusState {
  const [state, setState] = useState<{ status: BackupStatus | null; ledger: BackupLedger; error: string }>({ status: null, ledger: emptyLedger(), error: '' });
  const reload = useCallback(async () => {
    try {
      const [ledger, projects, assets, collections, templates] = await Promise.all([repo.getBackupLedger(), repo.listProjects(), repo.listAssets(), repo.listCollections(), repo.listTemplates()]);
      const data: CurrentData = { projects, assets, collections, templates };
      setState({ status: await compareWithBackups(ledger, data), ledger, error: '' });
    } catch (e) { setState(s => ({ ...s, error: e instanceof Error ? e.message : String(e) })); }
  }, [repo]);
  useEffect(() => { void reload(); }, [reload]);
  useLedgerRefresh(repo, () => void reload(), ALL_KINDS);
  return { ...state, reload };
}

/** Coverage of one open project (project header); recomputed when the stored project changes. */
export function useProjectBackupState(repo: Repository, project: Project): BackupStatus['lines'][number] | null {
  const [line, setLine] = useState<BackupStatus['lines'][number] | null>(null);
  const [tick, setTick] = useState(0);
  useLedgerRefresh(repo, () => setTick(t => t + 1), ['backups']);
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      void repo.getBackupLedger().then(ledger => compareWithBackups(ledger, { projects: [project], assets: [], collections: [], templates: [] }))
        .then(s => { if (alive) setLine(s.lines[0] ?? null); }).catch(() => { if (alive) setLine(null); });
    }, 400);
    return () => { alive = false; clearTimeout(timer); };
  }, [repo, project, tick]);
  return line;
}

/** "Später erinnern" for the due banner: a per-browser view preference, not data. */
const SNOOZE_KEY = 'bauplaner.sicherung.spaeter';
export function snoozedUntil(): number {
  try { const v = Number(localStorage.getItem(SNOOZE_KEY)); return Number.isFinite(v) ? v : 0; } catch { return 0; }
}
export function snooze(hours = 24): void {
  try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + hours * 3_600_000)); } catch { /* session only */ }
}
