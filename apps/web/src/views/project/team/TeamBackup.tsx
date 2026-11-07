import { useEffect, useState } from 'react';
import type { RoomTeam } from '../../../../../../packages/domain/src/index.js';
import { errorText } from '../../../app/ui';
import { deleteRoom, getRoomState, listBackups, makeBackup, restoreBackup, ROOM_RESTORED, serviceStatus } from './roomClient';
import type { RoomBackup, RoomState } from './roomClient';

const when = (iso?: string | null) => iso ? new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : '–';
const size = (n?: number | null) => n === undefined || n === null ? '' : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
const REASON: Record<string, string> = { auto: 'automatisch', manuell: 'von Hand', 'vor-wiederherstellung': 'vor einer Wiederherstellung', loeschen: 'vor dem Löschen', inaktiv: 'vor dem Löschen (lange unbenutzt)' };

/**
 * OPS-04 (docs/architecture/team/TEAM_BACKUP.md): Sicherung, Wiederherstellung und Zustand des Team-Raums für die
 * Bauleitung. Der Raum sichert sich selbst (kostenlos, eigener Speicher bei Cloudflare); hier sieht man den Stand,
 * sichert von Hand und holt einen früheren Stand oder einen gelöschten Raum zurück – alles online, ohne Datei.
 */
export function TeamBackup({ live, onMessage, onRestored }: { live: NonNullable<RoomTeam['live']>; onMessage(m: string): void; onRestored(): void }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<RoomState | null>(null);
  const [backups, setBackups] = useState<readonly RoomBackup[]>([]);
  const [service, setService] = useState<string>('');
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setProblem('');
    void serviceStatus(live.url).then(s => setService(s.features?.includes('backups') ? 'erreichbar' : 'erreichbar (ältere Version ohne Sicherungen)')).catch(() => setService('nicht erreichbar'));
    try {
      const [st, list] = await Promise.all([getRoomState(live), listBackups(live)]);
      setState(st); setBackups(list.backups);
    } catch (e) {
      setState(null); setBackups([]);
      const code = (e as { code?: string }).code;
      setProblem(code === 'nicht-gefunden' ? 'Dieser Team-Raum kann noch keine Sicherungen (er läuft in einer älteren Version).' : errorText(e));
    }
  };
  useEffect(() => { if (open) void load(); }, [open, live.room, live.adminKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (work: () => Promise<void>) => { setBusy(true); try { await work(); } catch (e) { onMessage(errorText(e)); } finally { setBusy(false); void load(); } };
  const backupNow = () => run(async () => { const b = await makeBackup(live); onMessage(`Team-Raum gesichert (${b.events} Schritte, ${size(b.bytes)}).`); });
  const restore = (b: RoomBackup) => run(async () => {
    const ok = window.confirm(`Team-Raum auf den Stand vom ${when(b.at)} zurücksetzen?\n\nVorher wird der jetzige Stand gesichert. Alle Planer im Team reichen danach ihre eigenen Schritte selbst nach, nichts geht verloren. Die Einladungslinks bleiben gültig.`);
    if (!ok) return;
    const r = await restoreBackup(live, b.id);
    onRestored();
    window.dispatchEvent(new Event(ROOM_RESTORED));
    onMessage(`Team-Raum wiederhergestellt (${r.events} Schritte aus der Sicherung).${r.keys === 'aus-sicherung' ? ' Die Einladungslinks von damals gelten wieder.' : ''} Die Planer im Team reichen fehlende Schritte selbst nach.`);
  });
  const remove = () => run(async () => {
    if (!window.confirm('Team-Raum löschen? Alle verlieren die Live-Verbindung. Vorher wird gesichert; 90 Tage lang kannst du ihn hier zurückholen.')) return;
    const r = await deleteRoom(live);
    onMessage(`Team-Raum gelöscht. Zurückholen geht bis ${when(r.restorableUntil)} hier unter „Sicherung und Zustand“.`);
  });

  const s = state;
  return <details className="team-backup" open={open} onToggle={e => setOpen(e.currentTarget.open)} data-testid="team-backup">
    <summary>Sicherung und Zustand</summary>
    <p className="muted">Der Team-Raum sichert sich selbst: nach jeder Änderung höchstens stündlich, in einem eigenen Speicher bei Cloudflare (kostenlos). Aufbewahrt werden alle Sicherungen der letzten 48 Stunden, danach eine je Tag für 30 Tage. Ein Raum, den ein Jahr lang niemand öffnet, wird nach einer letzten Sicherung gelöscht und bleibt 90 Tage zurückholbar.</p>
    {problem && <p className="notice warning" role="alert">{problem}</p>}
    {open && <dl className="team-backup-state" aria-label="Zustand des Team-Raums">
      <dt>Dienst</dt><dd data-testid="backup-service">{service || '…'}</dd>
      {s?.deleted ? <>
        <dt>Raum</dt><dd data-testid="backup-room"><strong>gelöscht</strong> am {when(s.deletedAt)} · zurückholbar bis {when(s.restorableUntil)}</dd>
      </> : s ? <>
        <dt>Raum</dt><dd data-testid="backup-room">{s.events} von {s.limits?.events ?? 20000} Schritten{s.bytes ? ` · ${size(s.bytes)}` : ''} · {s.connections ?? 0} verbunden{s.serverOnline ? ' · Server da' : ''}</dd>
        <dt>Letzte Sicherung</dt><dd data-testid="backup-last">{s.lastBackup ? `${when(s.lastBackup.at)} (${REASON[s.lastBackup.reason] ?? s.lastBackup.reason})` : 'noch keine'}{s.unsaved ? ` · neue Änderungen werden ${s.nextAlarm ? `um ${new Date(s.nextAlarm).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` : 'bald'} gesichert` : ' · alles gesichert'}</dd>
        <dt>Aufbewahrung</dt><dd>{s.backups} Sicherung{s.backups === 1 ? '' : 'en'} · zuletzt benutzt {when(s.lastActivity)} · wird ohne Nutzung gelöscht am {when(s.deleteAfter)}</dd>
        {s.error && <><dt>Fehler</dt><dd className="warn" role="alert">Automatische Sicherung am {when(s.error.at)} gescheitert: {s.error.message}</dd></>}
      </> : null}
    </dl>}
    {s?.deleted && <p className="notice" role="status">Der Raum ist gelöscht. Wähle unten eine Sicherung und „Wiederherstellen“ – danach gelten die alten Einladungslinks wieder.</p>}
    <div className="team-buttons">
      {s && !s.deleted && <button disabled={busy} onClick={() => void backupNow()}>Jetzt sichern</button>}
      <button disabled={busy} className="secondary" onClick={() => void load()}>Aktualisieren</button>
    </div>
    {backups.length > 0 && <ul className="team-backup-list" aria-label="Sicherungen">{backups.map((b, i) =>
      <li key={b.id}><span><strong>{when(b.at)}</strong> · {REASON[b.reason] ?? b.reason} · {b.events} Schritte{b.plans ? ` · ${b.plans} Planstand${b.plans === 1 ? '' : 'stände'}` : ''}{b.docs.length ? ` · ${b.docs.join(', ')}` : ''} · {size(b.bytes)}{i === 0 ? ' · neueste' : ''}</span>
        <button disabled={busy} className="secondary" onClick={() => void restore(b)}>Wiederherstellen</button></li>)}</ul>}
    {s && !s.deleted && <details className="team-emergency"><summary>Raum löschen</summary>
      <p className="muted">Löscht den Team-Raum für alle. Vorher wird gesichert; 90 Tage lang kann die Bauleitung ihn hier zurückholen. Die Projekte in den Planern bleiben unberührt.</p>
      <button disabled={busy} className="danger" onClick={() => void remove()}>Team-Raum löschen</button></details>}
  </details>;
}
