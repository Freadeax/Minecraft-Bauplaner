import { useRef, useState } from 'react';
import { MAX_BACKUP_BYTES, readBackup, receiptForHash } from '../../../../packages/domain/src/index.js';
import type { BackupFile, BackupStatus, CoverageLine } from '../../../../packages/domain/src/index.js';
import { recordBackupReceipt, snooze, snoozedUntil } from '../app/backupStatus';
import type { BackupStatusState } from '../app/backupStatus';
import { useApp } from '../app/context';
import { errorText } from '../app/ui';
import '../backup.css';

const when = (iso: string) => new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
const stateLabel: Record<CoverageLine['state'], string> = { never: 'noch nie gesichert', changed: 'seit Sicherung geändert', current: 'gesichert' };
const kindLabel: Record<CoverageLine['kind'], string> = { project: 'Projekt', asset: 'Bauteil', collection: 'Sammlung', template: 'Vorlage' };

/** Banner on top of the Projektzentrale when a backup is due (can be postponed for a day in this browser). */
export function BackupReminder({ status, onBackupAll, busy }: { status: BackupStatus | null; onBackupAll(): void; busy: boolean }) {
  const [hiddenUntil, setHiddenUntil] = useState(snoozedUntil);
  if (!status || status.level !== 'due' || hiddenUntil > Date.now()) return null;
  // A labelled region, not role=status: the page keeps one live status line for action results.
  return <section className="notice warning backup-reminder" aria-label="Sicherungserinnerung">
    <strong>{status.headline}</strong>
    <p>{status.details[0]}</p>
    <p className="muted">{status.disclaimer}</p>
    <div className="button-row"><button className="primary" onClick={onBackupAll} disabled={busy}>Gesamtsicherung herunterladen</button>
      <a className="button-link secondary" href="#sicherungsstand" onClick={e => { e.preventDefault(); document.getElementById('sicherungsstand')?.scrollIntoView({ block: 'start' }); }}>Details</a>
      <button onClick={() => { snooze(); setHiddenUntil(snoozedUntil()); }}>Morgen erinnern</button></div>
  </section>;
}

/**
 * Sicherungsstand (BACKUP-02-S01): what changed since the last backup file,
 * receipts history and "Sicherung prüfen" (reads a file, verifies the
 * checksum, writes nothing except the receipt).
 */
export function BackupStatusPanel({ state, onBackupProject, busy }: { state: BackupStatusState; onBackupProject(id: string): void; busy: boolean }) {
  const { repo } = useApp();
  const { status, ledger, error } = state;
  const [message, setMessage] = useState('');
  const [showAll, setShowAll] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const verify = async (file: File) => {
    setMessage('');
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('Sicherungsdatei ist zu groß');
      const text = await file.text();
      await readBackup(text); // verifies format, checksum, versions and originals; throws on any mismatch
      const parsed = JSON.parse(text) as BackupFile;
      const known = receiptForHash(ledger, parsed.contentSha256);
      const failed = await recordBackupReceipt(repo, parsed, 'verified', file.name);
      setMessage(failed ?? `„${file.name}“ ist lesbar und unversehrt (Prüfsumme stimmt). ${known ? `Es ist die Datei vom ${when(known.at)}.` : 'Diese Datei wurde nicht in diesem Browser erzeugt; ihr Inhalt zählt ab jetzt als gesichert.'} Es wurde nichts wiederhergestellt.`);
    } catch (e) { setMessage(`Prüfung fehlgeschlagen – „${file.name}“ ist keine gültige oder eine beschädigte Sicherung: ${errorText(e)}`); }
    finally { if (input.current) input.current.value = ''; }
  };
  if (error) return <section className="backup-status" id="sicherungsstand" aria-label="Sicherungsstand"><div className="notice warning" role="alert">Sicherungsstand nicht lesbar: {error}</div></section>;
  if (!status) return <section className="backup-status" id="sicherungsstand" aria-label="Sicherungsstand"><p className="muted" role="status">Sicherungsstand wird berechnet …</p></section>;
  const lines = showAll ? status.lines : status.pending;
  const receipts = [...ledger.receipts].reverse().slice(0, 8);
  return <section className={`backup-status level-${status.level}`} id="sicherungsstand" aria-label="Sicherungsstand">
    <header><span className="panel-kicker">SICHERUNGSSTAND</span><strong data-level={status.level}>{status.headline}</strong></header>
    {status.details.length > 0 && <ul className="backup-details">{status.details.map(d => <li key={d}>{d}</li>)}</ul>}
    <p className="muted backup-disclaimer">{status.disclaimer}</p>
    {status.lines.length > 0 && <>
      <label className="raw-toggle"><input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} /> auch gesicherte Einträge zeigen</label>
      {lines.length > 0 && <div className="table-wrap"><table className="materials-table backup-lines">
        <thead><tr><th>Eintrag</th><th>Stand</th><th>Zuletzt enthalten in</th><th /></tr></thead>
        <tbody>{lines.map(l => <tr key={`${l.kind}:${l.id}`} className={`cov-${l.state}`}>
          <td>{l.name}<small>{kindLabel[l.kind]}</small></td>
          <td><em className={`badge cov-${l.state}`}>{stateLabel[l.state]}</em>{l.changedAt && l.state !== 'current' && <small>geändert {when(l.changedAt)}</small>}</td>
          <td>{l.receipt ? <>{l.receipt.fileName}<small>{l.receipt.kind === 'verified' ? 'eingelesen' : 'erzeugt'} {when(l.receipt.at)}</small></> : '–'}</td>
          <td>{l.kind === 'project' && l.state !== 'current' && <button onClick={() => onBackupProject(l.id)} disabled={busy}>Sichern</button>}</td>
        </tr>)}</tbody></table></div>}
    </>}
    <div className="button-row">
      <label className="backup-verify">Sicherung prüfen …<input ref={input} type="file" accept=".json,application/json" aria-label="Sicherungsdatei prüfen"
        onChange={e => { const f = e.target.files?.[0]; if (f) void verify(f); }} /></label>
    </div>
    {message && <div className="notice" role="status">{message}</div>}
    {receipts.length > 0 && <details className="backup-history"><summary>Verlauf ({ledger.receipts.length})</summary>
      <ol>{receipts.map(r => <li key={r.id}><strong>{r.kind === 'verified' ? 'Eingelesen und geprüft' : 'Datei erzeugt'}</strong> · {when(r.at)} · {r.fileName}
        <small>{r.scope === 'all' ? 'alles' : 'Projekt'} · {r.projects.length} Projekt(e){r.assets.length ? ` · ${r.assets.length} eigene Bauteile` : ''}{r.collections.length || r.templates.length ? ` · ${r.collections.length} Sammlungen · ${r.templates.length} Vorlagen` : ''} · Prüfsumme {r.contentSha256.slice(0, 12)}…</small></li>)}</ol>
    </details>}
  </section>;
}
