import { useCallback, useEffect, useRef, useState } from 'react';
import { SERVER_WAY_TEXT, deviceInviteLink, readDeviceInvite, readServerStatus, settingsProblem } from '../../../../../packages/domain/src/index.js';
import type { ServerInfo, ServerOp, ServerPairing, ServerStatus } from '../../../../../packages/domain/src/index.js';
import { errorText } from '../../app/ui';
import { LiveError } from '../map/liveClient';
import { claimServer, control, controlViaRoom, forgetPairing, gameLink, pairWithGame, readPairings, roomServerOnline, savePairing, serverInfo } from './serverClient';
import type { GameLink } from './serverClient';

type View =
  | { kind: 'loading' }
  | { kind: 'no-mod'; text: string }
  | { kind: 'unpaired' }
  | { kind: 'asking' }
  | { kind: 'old-mod'; text: string }
  | { kind: 'game'; link: GameLink; info: ServerInfo };

const REFRESH_MS = 5000;

/** How control messages travel: through the mod on this PC or through the team room (LINK-05, no mod needed). */
type Way = { kind: 'mod'; link: GameLink } | { kind: 'room' };
const send = (way: Way, p: ServerPairing, op: ServerOp, fields: Readonly<Record<string, unknown>> = {}) =>
  way.kind === 'mod' ? control(way.link, p, op, fields) : controlViaRoom(p, op, fields);

/**
 * „Server ohne Befehle“ (LINK-04, docs/architecture/team/AUTO_LINK.md): finds the mod on this computer by itself,
 * pairs by a click in the game, shows the server plugin behind the game, pairs the server with one click and
 * changes its settings. Every change is a signed control message; nobody types a command on the server.
 */
export function ServerPanel({ search }: { search?: string | undefined } = {}) {
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [pairing, setPairing] = useState<ServerPairing | null>(null);
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [draft, setDraft] = useState<Record<string, boolean | number | string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [problem, setProblem] = useState('');
  const [roomPick, setRoomPick] = useState('');
  const [roomOnline, setRoomOnline] = useState<boolean | null>(null);
  const [invite, setInvite] = useState('');
  const [pairingsVersion, setPairingsVersion] = useState(0);
  const asking = useRef(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  // A link from another own device (`#/mod?geraet=…`): store the pairing, then drop the key from the address bar.
  useEffect(() => {
    if (!search || !new URLSearchParams(search).has('geraet')) return;
    try {
      const p = readDeviceInvite(search);
      savePairing(p);
      setPairingsVersion(v => v + 1);
      setRoomPick(p.room ? p.serverId : '');
      setMessage(`Dieses Gerät steuert jetzt „${p.name}“${p.room ? ' – auch ohne Mod über den Team-Raum' : ''}.`);
    } catch (e) { setProblem(errorText(e)); }
    try { history.replaceState(null, '', '#/mod'); } catch { /* ignore */ }
  }, [search]);

  const refresh = useCallback(async () => {
    if (asking.current) return;
    try {
      const link = await gameLink();
      const info = await serverInfo(link);
      if (!alive.current) return;
      setView({ kind: 'game', link, info });
      const p = info.server ? readPairings()[info.server.serverId] ?? null : null;
      setPairing(old => (old?.serverId === p?.serverId && old?.owner === p?.owner ? old : p));
    } catch (e) {
      if (!alive.current) return;
      if (e instanceof LiveError && e.status === 401) setView({ kind: 'unpaired' });
      else if (e instanceof LiveError && e.status === 426) setView({ kind: 'old-mod', text: e.message });
      else setView({ kind: 'no-mod', text: errorText(e) });
    }
  }, []);

  useEffect(() => {
    void refresh();
    const t = window.setInterval(() => { if (!document.hidden) void refresh(); }, REFRESH_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const game = view.kind === 'game' ? view : null;
  const live = game?.info.way === 'live' ? game.info.server : null;
  // Paired servers with a team room: controllable without the mod (iPad, other PC).
  const roomPairings = Object.values(readPairings()).filter(p => p.room);
  void pairingsVersion;
  const roomPairing = !live ? roomPairings.find(p => p.serverId === roomPick) ?? null : null;
  const way: Way | null = live && pairing && game ? { kind: 'mod', link: game.link } : roomPairing ? { kind: 'room' } : null;
  const active = live && pairing ? pairing : roomPairing;

  // Status of a paired server: once after pairing and after every change (each read is a signed message).
  const loadStatus = useCallback(async (w: Way, p: ServerPairing) => {
    try {
      const s = readServerStatus(await send(w, p, 'status'));
      if (!alive.current) return;
      setStatus(s); setDraft({}); setProblem('');
      setPairing(readPairings()[p.serverId] ?? p);
    } catch (e) {
      if (!alive.current) return;
      setStatus(null);
      setProblem(errorText(e));
      if (/nicht \(mehr\) gekoppelt/.test(errorText(e))) { forgetPairing(p.serverId); setPairing(null); setRoomPick(''); setPairingsVersion(v => v + 1); }
    }
  }, []);
  const statusFor = useRef('');
  const wayKind = way?.kind ?? '';
  useEffect(() => {
    if (!way || !active || (way.kind === 'mod' && active.serverId !== live?.serverId)) { if (!active) setStatus(null); return; }
    const k = wayKind + active.serverId + active.owner;
    if (statusFor.current === k) return;
    statusFor.current = k;
    setStatus(null); setInvite('');
    if (way.kind === 'room' && active.room) {
      void roomServerOnline(active.room).then(on => {
        if (!alive.current) return;
        setRoomOnline(on);
        if (on) void loadStatus(way, active);
        else setProblem('Der Server ist gerade nicht mit dem Team-Raum verbunden (Server aus oder Raum dort getrennt).');
      }, e => { if (alive.current) { setRoomOnline(false); setProblem(errorText(e)); } });
    } else void loadStatus(way, active);
  }, [way, wayKind, active, live?.serverId, loadStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (what: () => Promise<string | void>) => {
    setBusy(true); setMessage(''); setProblem('');
    try { const m = await what(); if (m) setMessage(m); }
    catch (e) { setProblem(errorText(e)); }
    finally { if (alive.current) setBusy(false); }
  };

  const connectGame = () => act(async () => {
    asking.current = true;
    try { await pairWithGame(() => setView({ kind: 'asking' }), () => !alive.current); }
    finally { asking.current = false; }
    await refresh();
    return 'Mit dem Spiel verbunden.';
  });

  const claim = () => act(async () => {
    if (!game) return;
    const p = await claimServer(game.link);
    statusFor.current = '';
    setPairing(p);
    return `Server „${p.name}“ ist mit diesem Browser gekoppelt. Du kannst ihn jetzt hier einstellen.`;
  });

  const save = () => act(async () => {
    if (!way || !active || !status) return;
    const set = Object.fromEntries(Object.entries(draft).filter(([k, v]) => status.settings[k] !== v));
    if (!Object.keys(set).length) return 'Nichts geändert.';
    const bad = settingsProblem(status.schema, set);
    if (bad) throw new Error(bad);
    const answer = await send(way, active, 'config', { set });
    setStatus(readServerStatus(answer)); setDraft({});
    return typeof answer.text === 'string' ? answer.text : 'Gespeichert.';
  });

  const forget = (owner: string) => act(async () => {
    if (!way || !active) return;
    const self = owner === active.owner;
    const answer = await send(way, active, 'forget', { owner });
    if (self) { forgetPairing(active.serverId); setPairing(null); setRoomPick(''); setPairingsVersion(v => v + 1); setStatus(null); statusFor.current = ''; }
    else setStatus(readServerStatus(answer));
    return typeof answer.text === 'string' ? answer.text : 'Entfernt.';
  });

  const rename = (name: string) => act(async () => {
    if (!way || !active || !name.trim()) return;
    const answer = await send(way, active, 'rename', { name: name.trim() });
    setStatus(readServerStatus(answer));
    return typeof answer.text === 'string' ? answer.text : 'Umbenannt.';
  });

  /** A second owner key for another own device (iPad): handed over as a link, never shown in clear text. */
  const inviteDevice = (name: string) => act(async () => {
    if (!way || !active || !name.trim()) return;
    const answer = await send(way, active, 'invite', { name: name.trim() });
    if (typeof answer.owner !== 'string' || typeof answer.key !== 'string') throw new Error('Der Server hat keine Freigabe geschickt.');
    const fresh = readPairings()[active.serverId] ?? active;
    setInvite(deviceInviteLink(location.href, { serverId: active.serverId, name: status?.name ?? active.name, owner: answer.owner, key: answer.key, room: fresh.room }));
    if (status) setStatus({ ...status, owners: [...status.owners, { id: answer.owner, name: name.trim(), created: '', by: '' }] });
    return `Freigabe für „${name.trim()}“ erstellt. Den Link nur auf deinem eigenen Gerät öffnen.`;
  });

  const value = (key: string) => key in draft ? draft[key] : status?.settings[key];
  const changed = status ? Object.entries(draft).filter(([k, v]) => status.settings[k] !== v).length : 0;

  return <section className="system-card system-wide server-panel" aria-labelledby="server-link" data-server-view={view.kind} data-server-way={game?.info.way ?? ''}>
    <h2 id="server-link">Spiel und Server verbinden – ohne Befehle</h2>
    <p className="muted">Der Planer findet die Mod auf diesem PC selbst. Du bestätigst einmal im Spiel, koppelst den Server mit einem Klick und stellst ihn dann hier ein. Auf dem Server tippt niemand etwas.</p>

    <ol className="server-steps">
      <li data-done={view.kind === 'game'}>
        <b>Spiel</b>{' '}
        {view.kind === 'loading' && <span className="muted">suche die Mod …</span>}
        {view.kind === 'no-mod' && <span className="muted">Minecraft mit der Build-Studio-Mod läuft gerade nicht auf diesem PC (oder der Browser blockiert den Zugriff auf Geräte im lokalen Netzwerk). Die Mod gibt es oben auf dieser Seite.</span>}
        {view.kind === 'old-mod' && <span className="warn-text">{view.text}</span>}
        {view.kind === 'unpaired' && <><span>Mod gefunden. </span><button className="primary" disabled={busy} onClick={() => void connectGame()}>Mit dem Spiel verbinden</button></>}
        {view.kind === 'asking' && <b className="warn-text" role="status">Jetzt im Spiel J drücken und „Planer zulassen“ klicken.</b>}
        {game && <span className="ok-text">verbunden · Mod {game.link.hello.mod.version} ({game.link.hello.mod.loader})</span>}
      </li>
      <li data-done={!!live}>
        <b>Server</b>{' '}
        {!game ? <span className="muted">kommt nach dem Spiel</span>
          : live ? <span className="ok-text">„{live.name}“ · Build-Studio-Plugin {live.plugin} · Minecraft {live.minecraft}</span>
          : <span className={game.info.way === 'ask' ? 'warn-text' : 'muted'}>{SERVER_WAY_TEXT[game.info.way]}{game.info.way === 'no_plugin' && <> Das Plugin gibt es auf dieser Seite unter „Für einen Server“; es kommt einmal in den Ordner <code>plugins</code>.</>}</span>}
        {game?.info.error && <span className="field-error"> {game.info.error}</span>}
      </li>
      <li data-done={!!(live && pairing)}>
        <b>Kopplung</b>{' '}
        {!live ? <span className="muted">kommt nach dem Server</span>
          : pairing ? <span className="ok-text">dieser Browser steuert den Server</span>
          : live.canClaim ? <button className="primary" disabled={busy} onClick={() => void claim()}>Server koppeln</button>
          : <span className="muted">Koppeln darf nur ein Operator (OP) des Servers. {live.paired ? 'Der Server ist schon mit einem anderen Planer gekoppelt.' : ''}</span>}
      </li>
    </ol>

    {!live && roomPairings.length > 0 && <div className="server-room" data-server-room={roomPairing ? (roomOnline === null ? 'pruefe' : roomOnline ? 'live' : 'offline') : ''}>
      <h3>Ohne Mod über den Team-Raum</h3>
      <p className="muted">Gekoppelte Server, die mit einem Team-Raum verbunden sind, lassen sich auch von hier aus einstellen – ohne laufendes Minecraft, zum Beispiel vom iPad.</p>
      <div className="button-row">{roomPairings.map(p => <button key={p.serverId} className={p.serverId === roomPick ? 'primary' : 'secondary'} aria-pressed={p.serverId === roomPick} disabled={busy}
        onClick={() => { statusFor.current = ''; setRoomOnline(null); setProblem(''); setRoomPick(p.serverId === roomPick ? '' : p.serverId); }}>„{p.name}“ einstellen</button>)}</div>
      {roomPairing && roomOnline === null && <p className="muted" role="status">Frage den Server über den Team-Raum …</p>}
    </div>}

    {way && active && status && <div className="server-settings" data-server-way-used={way.kind}>
      <h3>Einstellungen von „{status.name}“{way.kind === 'room' && <small className="muted"> · über den Team-Raum</small>}</h3>
      <div className="server-form">
        {status.schema.map(s => <label key={s.key} className={s.kind === 'bool' ? 'check-inline' : ''}>
          {s.kind === 'bool'
            ? <><input type="checkbox" checked={value(s.key) === true} onChange={e => setDraft(d => ({ ...d, [s.key]: e.target.checked }))} /> {s.label}</>
            : <>{s.label}{s.kind === 'choice'
              ? <select value={String(value(s.key) ?? '')} onChange={e => setDraft(d => ({ ...d, [s.key]: e.target.value }))}>{(s.choices ?? []).map(c => <option key={c} value={c}>{c}</option>)}</select>
              : <input type="number" min={s.min} max={s.max} value={String(value(s.key) ?? '')} onChange={e => setDraft(d => ({ ...d, [s.key]: Number(e.target.value) }))} />}</>}
          {s.restart && <small className="muted"> (wirkt nach Neustart)</small>}
        </label>)}
      </div>
      <div className="button-row">
        <button className="primary" disabled={busy || !changed} onClick={() => void save()}>{changed ? `${changed} Änderung${changed === 1 ? '' : 'en'} übernehmen` : 'Übernehmen'}</button>
        <button className="secondary" disabled={busy} onClick={() => void loadStatus(way, active)}>Neu laden</button>
      </div>

      <dl className="map-facts">
        <div><dt>Teams</dt><dd>{status.teams.length ? status.teams.map(t => `${t.name} (${t.sections} Abschnitte, ${t.events} Ereignisse)`).join(' · ') : 'noch keins'} – ein Team kommt im Projekt im Reiter „Team“ mit „Planstand auf den Server legen“ auf den Server.</dd></div>
        <div><dt>Team-Raum</dt><dd>{status.rooms.join(' · ') || 'nicht verbunden'} – der Server verbindet sich selbst, sobald im Projekt unter „Team live“ die Bauleitung ihr Spiel verbunden hat und hier mit der Mod spielt (oder per „Server mit dem Raum verbinden“).</dd></div>
        <div><dt>Pläne</dt><dd>{status.plans.length ? status.plans.join(', ') : 'keine'}</dd></div>
        <div><dt>Gekoppelte Geräte</dt><dd>{status.owners.map(o => <span key={o.id} className="server-owner">{o.name}{o.id === active.owner ? ' (dieses Gerät)' : ''}{o.by ? `, gekoppelt von ${o.by}` : ''} <button className="text-button" disabled={busy} onClick={() => void forget(o.id)}>{o.id === active.owner ? 'trennen' : 'entfernen'}</button></span>)}</dd></div>
      </dl>
      <details><summary>Weiteres Gerät freigeben (z. B. iPad)</summary>
        <p className="muted">Das andere Gerät bekommt einen eigenen Schlüssel und kann den Server danach ohne Mod über den Team-Raum einstellen{active.room ? '' : ' (dafür den Server vorher im Projekt unter „Team live“ mit dem Raum verbinden)'}. Du kannst es hier jederzeit wieder entfernen.</p>
        <form className="button-row" onSubmit={e => { e.preventDefault(); void inviteDevice(new FormData(e.currentTarget).get('device') as string); }}>
          <input name="device" defaultValue="iPad" maxLength={40} aria-label="Name des Geräts" />
          <button className="secondary" disabled={busy}>Freigabe-Link erstellen</button>
        </form>
        {invite && <div className="server-invite">
          <p className="warn-text">Nur auf deinem eigenen Gerät öffnen – wer diesen Link hat, kann den Server einstellen.</p>
          <div className="button-row"><input readOnly value={invite} aria-label="Freigabe-Link" onFocus={e => e.currentTarget.select()} />
            <button className="secondary" onClick={() => { void navigator.clipboard?.writeText(invite).then(() => setMessage('Link kopiert.'), () => setMessage('Kopieren nicht möglich – Link markieren und kopieren.')); }}>Kopieren</button></div>
        </div>}
      </details>
      <details><summary>Server umbenennen</summary>
        <form className="button-row" onSubmit={e => { e.preventDefault(); void rename(new FormData(e.currentTarget).get('name') as string); }}>
          <input name="name" defaultValue={status.name} maxLength={60} aria-label="Servername" />
          <button className="secondary" disabled={busy}>Umbenennen</button>
        </form>
      </details>
    </div>}

    {message && <p className="ok-text" role="status">{message}</p>}
    {problem && <p className="field-error" role="alert">{problem}</p>}
  </section>;
}
