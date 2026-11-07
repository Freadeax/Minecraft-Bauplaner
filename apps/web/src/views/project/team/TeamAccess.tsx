import { useState } from 'react';
import { checkPassword, deriveSignKey, MIN_PASSWORD, openTeamAccess, peekTeamAccess, restoreTeamAccess, retrustAfterRekey, sealTeamAccess, teamAccessFileName, teamAccessOf } from '../../../../../../packages/domain/src/index.js';
import type { RoomTeam, TeamEventBody, TeamState } from '../../../../../../packages/domain/src/index.js';
import { download, errorText } from '../../../app/ui';
import { allRoomEvents, leaderKeysOf, rotateKey, serviceStatus, setRoomIdentity } from './roomClient';
import type { ProjectSession } from '../session';

/**
 * BACKUP-03 (docs/architecture/team/TEAM_ACCESS.md): the keys of the Team-Raum are not in project or full backups.
 * Here the access is saved on its own, sealed with a password, and opened again (new browser, after a restore).
 * The Bauleitung can change the admin key when an older backup with keys may have been passed on.
 */
export function TeamAccessSave({ session, team, onMessage }: { session: ProjectSession; team: RoomTeam; onMessage(m: string): void }) {
  const [pw, setPw] = useState(''), [pw2, setPw2] = useState(''), [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      if (pw !== pw2) throw new Error('Die beiden Passwörter sind verschieden.');
      checkPassword(pw);
      const access = teamAccessOf({ name: session.project.name, site: { ...session.project.site!, team } });
      download(teamAccessFileName(access), await sealTeamAccess(access, pw), 'application/json');
      setPw(''); setPw2('');
      onMessage(`Team-Zugang verschlüsselt gespeichert (${access.adminKey ? 'mit Verwaltungsschlüssel' : 'nur Einladung'}). Datei und Passwort getrennt aufbewahren; ohne Passwort lässt sie sich nicht öffnen.`);
    } catch (e) { onMessage(errorText(e)); } finally { setBusy(false); }
  };
  return <details className="team-access" data-testid="team-access-save">
    <summary>Team-Zugang sichern (verschlüsselt)</summary>
    <p className="muted">Projekt- und Gesamtsicherungen enthalten keine Schlüssel des Team-Raums. Wer den Zugang auf einem anderen Gerät oder nach einer Wiederherstellung braucht, speichert ihn hier getrennt, mit Passwort verschlüsselt{team.live?.adminKey ? '. Diese Datei enthält den Verwaltungsschlüssel: nicht weitergeben' : ''}.</p>
    <div className="team-inline">
      <label>Passwort<input type="password" autoComplete="new-password" value={pw} minLength={MIN_PASSWORD} onChange={e => setPw(e.target.value)} aria-label="Passwort für den Team-Zugang" /></label>
      <label>Wiederholen<input type="password" autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} aria-label="Passwort wiederholen" /></label>
      <button disabled={busy || pw.length < MIN_PASSWORD} onClick={() => void save()}>Team-Zugang herunterladen</button>
    </div>
    <small className="muted">Mindestens {MIN_PASSWORD} Zeichen. Verschlüsselt mit AES-GCM, Schlüssel aus dem Passwort (PBKDF2, 600 000 Runden).</small>
  </details>;
}

/** Opens a sealed access file for a project that is not live (yet) in this browser. */
export function TeamAccessOpen({ team, saveLive, newDevice, onMessage }: { team: TeamState; saveLive(next: RoomTeam): void; newDevice(): string; onMessage(m: string): void }) {
  const [file, setFile] = useState<{ name: string; text: string; teamName: string } | null>(null), [pw, setPw] = useState(''), [busy, setBusy] = useState(false);
  const pick = async (f: File | undefined) => {
    if (!f) return;
    try {
      if (f.size > 64 * 1024) throw new Error('Das ist keine Team-Zugang-Datei (zu groß).');
      const text = await f.text(), head = peekTeamAccess(text);
      if (head.teamId !== team.teamId) throw new Error(`Diese Datei gehört zum Team „${head.teamName || head.teamId}“, nicht zu „${team.name}“.`);
      setFile({ name: f.name, text, teamName: head.teamName });
    } catch (e) { setFile(null); onMessage(errorText(e)); }
  };
  const open = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const access = await openTeamAccess(file.text, pw);
      saveLive(restoreTeamAccess(team, access, newDevice()));
      setPw(''); setFile(null);
      onMessage(`Team-Zugang wiederhergestellt${access.adminKey ? ' (mit Verwaltungsschlüssel)' : ''}. Der Planer verbindet sich mit dem Team-Raum und gleicht alles ab.`);
    } catch (e) { onMessage(errorText(e)); } finally { setBusy(false); }
  };
  return <details className="team-access" data-testid="team-access-open">
    <summary>Team-Zugang aus Datei wiederherstellen</summary>
    <p className="muted">Nach einer Wiederherstellung aus einer Sicherung ist das Team nicht mehr live: Sicherungen enthalten keine Schlüssel. Mit der verschlüsselten Team-Zugang-Datei und ihrem Passwort geht es im selben Raum weiter.</p>
    <div className="team-inline">
      <label>Datei<input type="file" accept=".json,application/json" onChange={e => void pick(e.target.files?.[0])} aria-label="Team-Zugang-Datei" /></label>
      <label>Passwort<input type="password" autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} aria-label="Passwort des Team-Zugangs" /></label>
      <button className="primary" disabled={busy || !file || !pw} onClick={() => void open()}>Zugang öffnen</button>
    </div>
    {file && <small className="muted">„{file.name}“ · Team „{file.teamName}“</small>}
  </details>;
}

/**
 * Change of the admin key (only the planner that holds it). The signing key of the Bauleitung changes with it, so
 * the server needs a fresh confirmation of the room's past, signed with the new key: up to the first event the
 * server had refused under the old key (retrustAfterRekey), never further.
 */
export function AdminKeyChange({ team, saveLive, leaderEvent, founderHere, onDone, onMessage }: {
  team: RoomTeam; saveLive(next: RoomTeam): void; leaderEvent(body: TeamEventBody): void; founderHere: boolean; onDone(): void; onMessage(m: string): void;
}) {
  const [busy, setBusy] = useState(false);
  const live = team.live;
  if (!live?.adminKey) return null;
  const change = async () => {
    const ok = window.confirm('Verwaltungsschlüssel wechseln: Der alte Schlüssel gilt danach nirgends mehr (auch nicht in alten Sicherungen oder Team-Zugang-Dateien). Andere Browser mit dem alten Verwaltungsschlüssel verlieren die Verwaltung. Der Server bekommt den neuen Unterschriftsschlüssel beim nächsten Verbinden. Fortfahren?');
    if (!ok) return;
    setBusy(true);
    try {
      const status = await serviceStatus(live.url).catch(() => null);
      if (!status?.features?.includes('admin-rotate')) throw new Error('Dieser Team-Raum-Dienst kann den Verwaltungsschlüssel noch nicht wechseln (zu alte Version). Bis dahin hilft ein neuer Raum: „Live trennen“ und neu live schalten.');
      // Read the past with the old key before it stops working.
      const events = await allRoomEvents(live);
      const plan = await retrustAfterRekey(events, team, await deriveSignKey(live.adminKey!), (await leaderKeysOf(live.adminKey!)).pub);
      const keys = await rotateKey(live, 'admin');
      if (!keys.adminKey) throw new Error('Der Team-Raum hat keinen neuen Schlüssel geschickt.');
      const next = { ...live, adminKey: keys.adminKey };
      // TEAM-SEC-01: the room learns the new public key (Planer, Mod and Server check signatures with it).
      const identity = live.identity?.founder ? await setRoomIdentity(next, { founder: team.founder, leaderKey: (await leaderKeysOf(keys.adminKey)).pub }) : undefined;
      saveLive({ ...team, live: { ...next, ...(identity && { identity }) } });
      if (founderHere) leaderEvent({ kind: 'team.trust', upTo: String(plan.upTo) });
      onDone();
      onMessage(`Verwaltungsschlüssel gewechselt. Der alte gilt nicht mehr.${founderHere ? ` Bisheriger Stand für den Server neu bestätigt (bis Nr. ${plan.upTo}${plan.firstRefused ? `; ab Nr. ${plan.firstRefused.seq} lag ein abgewiesenes Ereignis, das abgewiesen bleibt` : ''}).` : ''}${plan.lostSigned ? ` ${plan.lostSigned} spätere unterschriebene Änderung(en) bitte noch einmal setzen.` : ''} Neuen Team-Zugang sichern und „Mein Spiel verbinden“ einmal neu drücken, damit die Mod den neuen Unterschriftsschlüssel hat.`);
    } catch (e) { onMessage(errorText(e)); } finally { setBusy(false); }
  };
  return <button disabled={busy} className="secondary" data-testid="admin-key-change" title="Nach einer weitergegebenen älteren Sicherung: der alte Verwaltungsschlüssel wird ungültig." onClick={() => void change()}>Verwaltungsschlüssel wechseln</button>;
}
