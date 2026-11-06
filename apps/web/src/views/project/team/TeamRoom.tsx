import { useEffect, useMemo, useRef, useState } from 'react';
import { goLive, headerFingerprint, inviteLink, leaveLive, readBackup, readTeamPackage, roomStatus, serverLink, siteOf, teamContextOf, teamView, whereInPlan } from '../../../../../../packages/domain/src/index.js';
import type { RoomTeam, TeamState, TeamView } from '../../../../../../packages/domain/src/index.js';
import { useApp } from '../../../app/context';
import { errorText } from '../../../app/ui';
import { createRoom, getPlan, putHeader, putPlan, readRoomUrl, rotateKey, saveRoomUrl, useRoomConnection } from './roomClient';
import type { ProjectSession } from '../session';
import { TeamBackup } from './TeamBackup';
import { roomHeader, takePlan, teamPackageText } from './teamTransfer';
import { control, currentPairedServer, gameLeaveRoom, gameRoomState, gameToRoom, reachableServer, rememberRoom } from '../../mod/serverClient';

const UPLOADED_KEY = (room: string) => `bauplaner.teamraum.plan.${room}`;
const HEADER_KEY = (room: string) => `bauplaner.teamraum.kopf.${room}`;
const read = (k: string) => { try { return localStorage.getItem(k) ?? ''; } catch { return ''; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };
export const newDeviceId = () => `dev_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
const pageBase = () => window.location.href.replace(/#.*$/, '');
const WHERE = { planer: 'im Planer', spiel: 'im Spiel', server: 'Server' } as const;

async function copyText(text: string): Promise<boolean> { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } }

/**
 * Team live (COOP-07, docs/architecture/team/TEAM_LIVE.md): the Bauleitung switches the team live in a Team-Raum,
 * shares one invitation link and the server link for the plugin; afterwards every step of everyone appears
 * for all within seconds, and a new plan release reaches the others without any file.
 */
export function TeamRoom({ session, team, view, onMessage }: { session: ProjectSession; team: TeamState; view: TeamView; onMessage(m: string): void }) {
  const { repo, library, reloadLibrary } = useApp();
  const room = useRoomConnection();
  const live = (team as RoomTeam).live;
  const me = team.self ? view.members.find(m => m.id === team.self) ?? null : null;
  const leads = me?.role === 'leitung';
  const [url, setUrl] = useState(readRoomUrl);
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState<'' | 'invite' | 'server'>('');
  const run = async (work: () => Promise<void>) => { setBusy(true); try { await work(); } catch (e) { onMessage(errorText(e)); } finally { setBusy(false); } };
  const names = new Map(view.members.map(m => [m.id, m.name]));
  // COOP-10 + FALLBACK-01: what my own game says about its team room (asked once, after each connect/disconnect).
  const [game, setGame] = useState<Record<string, unknown> | null>(null);
  const askGame = () => { void gameRoomState().then(setGame); };
  useEffect(() => { if (live) askGame(); }, [live?.room]); // eslint-disable-line react-hooks/exhaustive-deps
  // COOP-10: section boxes in world coordinates (as the plugin gets them), only while someone reports a position.
  const anyPos = room.presence.some(p => p.where === 'spiel' && p.pos);
  const boxes = useMemo(() => { if (!anyPos) return null; try { return roomHeader(session, team); } catch { return null; } },
    [anyPos, session.project, session.computation, team]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveLive = (next: RoomTeam) => session.replace(p => ({ ...p, site: { ...siteOf(p), team: next as TeamState } }));

  const uploadPlan = async (t: RoomTeam, quiet = false) => {
    if (!t.live?.adminKey) return;
    const text = await teamPackageText(session.project, t, { member: me?.id ?? t.founder, name: me?.name ?? 'Bauleitung' }, true, { repo, library });
    const sha = await putPlan(t.live, text);
    const release = teamView(t, teamContextOf(siteOf(session.project))).release;
    const h = roomHeader(session, t, { sha, at: new Date().toISOString(), bytes: text.length,
      ...(release && { revisionNumber: release.revisionNumber, revisionId: release.revisionId }) });
    await putHeader(t.live, h);
    write(HEADER_KEY(t.live.room), headerFingerprint(h));
    write(UPLOADED_KEY(t.live.room), release?.revisionId ?? sha);
    if (!quiet) onMessage(`Planstand${release ? ` ${release.revisionNumber}` : ''} liegt im Team-Raum. Alle mit dem Link bekommen ihn ohne Datei.`);
  };

  const goOnline = () => run(async () => {
    const base = url.trim().replace(/\/+$/, '');
    if (!/^https:\/\//.test(base) && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base)) throw new Error('Die Adresse des Team-Raums muss mit https:// beginnen.');
    saveRoomUrl(base);
    const keys = await createRoom(base, team.teamId, team.name);
    const next = goLive(team, { url: base, room: keys.room, key: keys.memberKey, adminKey: keys.adminKey, serverKey: keys.serverKey }, newDeviceId());
    saveLive(next);
    await uploadPlan(next, true);
    setShown('invite');
    onMessage('Das Team ist live. Schick den Einladungslink an die anderen (Discord, Chat); für den Server gibt es einen eigenen Link.');
  });

  // A new release of the Bauleitung goes into the room by itself (plan snapshot + header for the plugin).
  const releaseId = view.release?.revisionId ?? '';
  const uploading = useRef('');
  useEffect(() => {
    if (!live?.adminKey || !room.connected || !releaseId || uploading.current === releaseId) return;
    if (read(UPLOADED_KEY(live.room)) === releaseId) return;
    if (!session.project.revisions.some(r => r.id === releaseId)) return;
    uploading.current = releaseId;
    void uploadPlan(team as RoomTeam, true).then(() => onMessage(`Planstand ${view.release?.revisionNumber} automatisch in den Team-Raum gestellt.`)).catch(e => { uploading.current = ''; onMessage(errorText(e)); });
  }, [releaseId, room.connected, live?.adminKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // LINK-11: sections, boxes, need and world placement reach the server without a release and without a file.
  // The Bauleitung's planner puts the header again (with the current plan snapshot) whenever that part changes.
  const header = useMemo(() => { if (!live?.adminKey) return null; try { return roomHeader(session, team); } catch { return null; } },
    [live?.adminKey, session.project, session.computation, team]); // eslint-disable-line react-hooks/exhaustive-deps
  const fingerprint = header ? headerFingerprint(header) : '';
  useEffect(() => {
    if (!live?.adminKey || !room.connected || !header || !room.planSha) return;
    if (read(HEADER_KEY(live.room)) === fingerprint) return;
    const timer = window.setTimeout(() => {
      void putHeader(live, { ...header, plan: { sha: room.planSha, at: new Date().toISOString(), bytes: 0, ...(room.planNumber !== undefined && { revisionNumber: room.planNumber }), ...(room.planRevision && { revisionId: room.planRevision }) } })
        .then(() => write(HEADER_KEY(live.room), fingerprint)).catch(() => undefined);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [fingerprint, room.connected, room.planSha, live?.adminKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // LINK-11: the server plugin joins the room by itself – through a paired server (mod or another room) once per
  // visit, otherwise through the Bauleitung's own game on the server (gameToRoom with the server key, link.room).
  const serverHere = room.presence.some(p => p.where === 'server');
  const autoServer = useRef('');
  useEffect(() => {
    if (!leads || !live?.serverKey || !room.connected || serverHere || autoServer.current === live.room) return;
    autoServer.current = live.room;
    const link = serverLink(pageBase(), live, live.serverKey);
    void reachableServer().then(async s => {
      if (!s) return;
      const answer = await s.send('room', { link });
      if (s.via === 'mod') rememberRoom(s.pairing.serverId, { url: live.url, room: live.room, key: live.key });
      onMessage(`„${s.pairing.name}“ hat sich selbst mit dem Team-Raum verbunden${typeof answer.text === 'string' ? `: ${answer.text}` : '.'}`);
    }).catch(() => { autoServer.current = ''; });
  }, [leads, live?.serverKey, live?.room, room.connected, serverHere]); // eslint-disable-line react-hooks/exhaustive-deps

  // Helpers: the release came live, the matching plan is in the room – take it over with one click.
  const planMissing = !!releaseId && !session.project.revisions.some(r => r.id === releaseId);
  // The room may still hold the previous snapshot for a moment: only the snapshot of this release counts.
  const planReady = !!room.planSha && room.planRevision === releaseId;
  const takeOver = () => run(async () => {
    if (!live || !planReady) throw new Error('Der Planstand dieser Freigabe liegt noch nicht im Team-Raum.');
    const pkg = await readTeamPackage(await getPlan(live, room.planSha));
    if (!pkg.backup) throw new Error('Der Planstand im Team-Raum enthält keinen Plan.');
    const p = (await readBackup(pkg.backup)).projects[0];
    if (!p) throw new Error('Der Planstand im Team-Raum ist leer.');
    const copyName = await takePlan(session, p, pkg.backup, room.planNumber ?? view.release?.revisionNumber ?? 0, team, { repo, reloadLibrary });
    onMessage(`Planstand ${room.planNumber ?? ''} aus dem Team-Raum übernommen. Dein vorheriger Stand liegt als Projekt „${copyName}“ in der Projektliste.`);
  });

  // Lock someone out (COOP-09): a new key makes all old links invalid; open connections with it are closed by the room.
  const renew = (who: 'member' | 'server') => run(async () => {
    if (!live?.adminKey) return;
    const ok = window.confirm(who === 'member'
      ? 'Neue Einladung: Alle bisherigen Einladungslinks werden ungültig, auch für Mitspieler, die schon drin sind. Wer weiter mitbauen soll, bekommt den neuen Link. Fortfahren?'
      : 'Neuer Server-Link: Der Server verliert die Verbindung, bis er mit dem neuen Link (oder über „Server mit dem Raum verbinden“) wieder verbunden ist. Fortfahren?');
    if (!ok) return;
    const keys = await rotateKey(live, who);
    const cur = team as RoomTeam;
    const next = { ...cur, live: { ...cur.live!, ...(keys.memberKey && { key: keys.memberKey }), ...(keys.serverKey && { serverKey: keys.serverKey }) } } as RoomTeam;
    saveLive(next);
    setShown(who === 'member' ? 'invite' : 'server');
    onMessage(who === 'member' ? 'Neue Einladung erstellt. Die alten Links gelten nicht mehr – den neuen an alle schicken, die weiter mitbauen.' : 'Neuer Server-Link erstellt. Den Server damit neu verbinden.');
  });

  if (!live) return <div className="team-block team-room" role="region" aria-label="Team live">
    <div className="team-block-head"><h3>Team live <small>ohne Dateien</small></h3><span className="team-live-state off">aus</span></div>
    <p>Im Team-Raum sieht jeder jeden Schritt der anderen sofort: Abschnitte, Fertigmeldungen, Notizen, Lieferungen und die Messungen des Servers. Neue Planstände kommen ohne Datei an. Wer offline baut, holt beim nächsten Verbinden alles nach.</p>
    {leads ? <>
      <div className="team-inline"><label className="grow">Adresse des Team-Raums<input value={url} placeholder="https://bauplaner-team.….workers.dev" onChange={e => setUrl(e.target.value)} aria-label="Adresse des Team-Raums" /></label>
        <button className="primary" disabled={busy || !url.trim()} onClick={() => void goOnline()}>Live schalten</button></div>
      <small className="muted">Voreingestellt ist der Team-Raum des Build Studios. Einen eigenen kannst du einrichten (services/team-room/README.md) und hier eintragen; die Adresse merkt sich dieser Browser.</small>
    </> : <p className="muted">Die Bauleitung schaltet das Team live und schickt dir einen Einladungslink. Bis dahin geht der Austausch über Teampaket und Meldecode unten.</p>}
  </div>;

  const status = roomStatus(team as RoomTeam, room.connected);
  const sectionNames = teamContextOf(siteOf(session.project)).sections;
  const standsIn = (p: { pos?: { x: number; y: number; z: number; dim: string } }) => {
    if (!p.pos || !boxes) return '';
    const w = whereInPlan(boxes.sections, boxes.dimension, p.pos);
    if (!w) return ' · nicht auf der Baustelle';
    const name = sectionNames.find(s => s.id === w.section)?.name ?? 'Abschnitt';
    return w.inside ? ` · steht in „${name}“` : w.distance <= 64 ? ` · ${w.distance} Blöcke von „${name}“` : ' · weit weg von der Baustelle';
  };
  const label = status.state === 'live' ? 'live' : status.state === 'waiting' ? `sendet ${status.pending} …` : status.state === 'offline' ? `offline${status.pending ? ` · ${status.pending} warten` : ''}` : 'aus';
  const invite = inviteLink(pageBase(), live);
  const server = live.serverKey ? serverLink(pageBase(), live, live.serverKey) : '';
  return <div className="team-block team-room" role="region" aria-label="Team live">
    <div className="team-block-head"><h3>Team live <small>{live.url.replace(/^https?:\/\//, '')}</small></h3>
      <span className={`team-live-state ${status.state}`} role="status" data-state={status.state}>● {label}</span></div>
    {room.error && <p className="notice warning" role="alert">{room.error}</p>}
    {status.state === 'offline' && <p className="muted">Ohne Verbindung arbeitest du normal weiter; alles wird beim nächsten Verbinden nachgeholt{status.lastContact ? ` (zuletzt verbunden ${new Date(status.lastContact).toLocaleString('de-DE')})` : ''}.</p>}
    <h4>Gerade da</h4>
    {room.presence.length ? <ul className="team-presence" aria-label="Gerade da">{room.presence.map(p =>
      <li key={p.device}><strong>{p.member === 'server' ? 'Server' : names.get(p.member) ?? 'Unbekannt'}</strong> {WHERE[p.where]}{p.section ? ` · ${teamContextOf(siteOf(session.project)).sections.find(s => s.id === p.section)?.name ?? ''}` : ''}{p.device === live.device ? ' (du)' : ''}
        {p.where === 'spiel' && p.pos && <span className="muted" data-testid="presence-pos"> · {p.player ? `${p.player} ` : ''}bei {p.pos.x} {p.pos.y} {p.pos.z}{p.pos.dim !== 'minecraft:overworld' ? ` (${p.pos.dim.replace('minecraft:', '')})` : ''}</span>}
        {p.where === 'spiel' && p.pos && <span className="muted" data-testid="presence-where">{standsIn(p)}</span>}</li>)}</ul>
      : <p className="muted">{room.connected ? 'Nur du.' : 'Keine Verbindung.'}</p>}
    {planMissing && <div className="notice" role="status"><strong>Neuer Planstand {view.release?.revisionNumber} freigegeben</strong>
      <p>Die Bauleitung hat einen neuen Plan freigegeben. Dein bisheriger Stand bleibt als Kopie erhalten.</p>
      <button className="primary" disabled={busy || !planReady} onClick={() => void takeOver()}>{planReady ? 'Planstand übernehmen' : 'Planstand kommt gleich …'}</button></div>}
    {game && <p className={`team-game-room ${gameLine(game, live.room).warn ? 'warn' : ''}`} data-testid="game-room" role="status">{gameLine(game, live.room).text} <button className="link-button" onClick={askGame}>Neu prüfen</button></p>}
    <p className={`team-server-room ${serverHere ? 'on' : ''}`} data-testid="server-room" role="status">{serverHere
      ? 'Server-Plugin: ● im Team-Raum – bekommt Abschnitte, Lagerkisten und Abschnittsschutz live aus Planer und Mods.'
      : leads ? 'Server-Plugin (freiwillig): noch nicht im Raum. Es verbindet sich von selbst, sobald du nach „Mein Spiel verbinden“ als Bauleitung (OP) auf dem Server mit Build-Studio-Plugin bist – oder sofort, wenn der Server gekoppelt ist. Nichts herunterladen, nichts einfügen.'
      : 'Server-Plugin (freiwillig): nicht im Raum. Die Bauleitung verbindet es mit ihrem Spiel.'}</p>
    <div className="team-buttons">
      <button className="primary" disabled={busy || !me} title={me ? 'Die Build-Studio-Mod in deinem Minecraft spricht dann selbst mit diesem Raum: Abschnitte, Meldungen und Notizen live im Spiel – ohne Plugin und ohne Datei auf dem Server.' : 'Zuerst oben „Ich bin“ wählen.'}
        onClick={() => void run(async () => { onMessage(await gameToRoom({ url: live.url, room: live.room, key: live.key }, { id: me!.id, name: me!.name }, team.name, leads && live.adminKey ? live.serverKey : undefined)); askGame(); })}>Mein Spiel verbinden</button>
      <button disabled={busy} className="secondary" title="Die Mod in deinem Minecraft trennt sich vom Team-Raum." onClick={() => void run(async () => { onMessage(await gameLeaveRoom()); askGame(); })}>Spiel trennen</button>
      <button disabled={busy} onClick={() => setShown(shown === 'invite' ? '' : 'invite')}>Einladungslink</button>
      {server && <button disabled={busy} title="Der gekoppelte Server verbindet sich selbst mit diesem Raum (LINK-04). Ohne Kopplung: Link für den Server." onClick={() => void run(async () => {
        const paired = await currentPairedServer();
        if (!paired) { setShown('server'); throw new Error('Kein gekoppelter Server erreichbar. Im Menü „Spiel“ unter „Spiel und Server verbinden“ den Server koppeln (Minecraft mit Mod muss laufen) – oder den Link unten nutzen.'); }
        const answer = await control(paired.link, paired.pairing, 'room', { link: server });
        // From now on the server can also be controlled through this room (e.g. from the iPad, LINK-05).
        rememberRoom(paired.pairing.serverId, { url: live.url, room: live.room, key: live.key });
        onMessage(typeof answer.text === 'string' ? `„${paired.pairing.name}“: ${answer.text}` : 'Server verbunden.');
      })}>Server mit dem Raum verbinden</button>}
      {live.adminKey && <button disabled={busy} onClick={() => void run(() => uploadPlan(team as RoomTeam))}>Plan in den Raum stellen</button>}
      <button disabled={busy} onClick={() => { saveLive(leaveLive(team as RoomTeam) as RoomTeam); onMessage('Live-Verbindung in diesem Browser getrennt. Der Team-Raum und die anderen bleiben unberührt.'); }}>Live trennen</button>
      {live.adminKey && <button disabled={busy} className="secondary" onClick={() => void renew('member')}>Einladung erneuern</button>}
      {live.adminKey && live.serverKey && <button disabled={busy} className="secondary" onClick={() => void renew('server')}>Server-Link erneuern</button>}
    </div>
    {shown && <div className="team-shown">
      <p>{shown === 'invite' ? 'Diesen Link an alle Mitspieler schicken. Wer ihn öffnet, bekommt Plan und Teamstand und ist sofort live dabei.'
        : <>Einfacher geht es mit „Server mit dem Raum verbinden“, wenn der Server gekoppelt ist. Koppeln geht im Menü „Spiel“ mit einem Klick (als OP mit der Mod im Spiel). Nur ohne Kopplung: auf dem Server <code>/bauplaner team verbinden &lt;Link&gt;</code> eingeben (Konsole oder OP). Nicht weitergeben: Mit diesem Link schreibt man Messungen als Server.</>}</p>
      <textarea readOnly rows={2} value={shown === 'invite' ? invite : server} aria-label={shown === 'invite' ? 'Einladungslink' : 'Link für den Server'} onFocus={e => e.currentTarget.select()} />
      <button onClick={() => void copyText(shown === 'invite' ? invite : server).then(ok => onMessage(ok ? 'Link kopiert.' : 'Kopieren nicht möglich – bitte den Link markieren und kopieren.'))}>Kopieren</button>
    </div>}
    {server && <details className="team-emergency"><summary>Notfall: Server ohne Mod verbinden</summary>
      <p className="muted">Nur wenn weder die Mod noch eine Kopplung gehen: Link für den Server anzeigen und auf dem Server <code>/bauplaner team verbinden &lt;Link&gt;</code> eingeben.</p>
      <button disabled={busy} className="secondary" onClick={() => setShown(shown === 'server' ? '' : 'server')}>Link für den Server</button></details>}
    {live.adminKey && <TeamBackup live={live} onMessage={onMessage} onRestored={() => { uploading.current = ''; }} />}
  </div>;
}

const MODE: Record<string, string> = { ws: 'live', http: 'über HTTP (Ausweichweg)', off: 'ohne Verbindung' };
/** One line about my game's team room (FALLBACK-01 fields; older mods send only status/statusText). */
export function gameLine(g: Record<string, unknown>, room: string): { text: string; warn: boolean } {
  if (!g.connected) return { text: 'Mein Spiel: mit keinem Team-Raum verbunden.', warn: false };
  if (typeof g.room === 'string' && g.room !== room) return { text: 'Mein Spiel ist mit einem anderen Team-Raum verbunden. „Mein Spiel verbinden“ stellt es auf diesen um.', warn: true };
  const mode = typeof g.mode === 'string' ? MODE[g.mode] ?? g.mode : typeof g.statusText === 'string' ? g.statusText : 'verbunden';
  const age = typeof g.syncedAt === 'string' ? Math.round((Date.now() - Date.parse(g.syncedAt)) / 60_000) : NaN;
  const pending = typeof g.pendingReports === 'number' ? g.pendingReports : 0;
  return { text: `Mein Spiel: ${mode}${Number.isFinite(age) && age >= 1 ? ` · Stand vor ${age} min` : ''}${pending ? ` · ${pending} Meldung${pending === 1 ? '' : 'en'} warten` : ''}.`,
    warn: g.mode === 'off' || pending > 0 };
}
