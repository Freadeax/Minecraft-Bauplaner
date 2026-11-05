import { useCallback, useEffect, useRef, useState } from 'react';
import {
  describeEvent, LIVE_FEATURE_TEAM, liveCan, mergeTeam, siteOf, siteOperation, teamContextOf, teamLinkProblem, teamLinkState, teamLinkText, teamServerFile, teamView, serverFarms, productionOf
} from '../../../../../packages/domain/src/index.js';
import type { LiveHello, LiveTeam, TeamEvent, TeamMerge, TeamState, TeamView } from '../../../../../packages/domain/src/index.js';
import { errorText } from '../../app/ui';
import { LiveError, liveApi, readLiveSettings } from '../map/liveClient';
import type { ProjectSession } from './session';
import { control, currentPairedServer } from '../mod/serverClient';

const AUTO_KEY = 'bauplaner.team.autoabgleich';
const AUTO_MS = 15_000;

interface Pending { readonly source: 'Spiel' | 'Server'; readonly merge: TeamMerge; readonly issues: readonly string[]; readonly ack: readonly string[] }

/**
 * „Mit Spiel abgleichen“ (COOP-03, docs/architecture/TEAMBAU.md §7): the team view goes to the Bauplaner mod
 * on this computer (POST /v1/team), so the game shows sections, owners and the own task. What the player
 * reported in the game comes back as events of „Ich bin“ and is merged like a team package (preview, one
 * undoable step, then acknowledged). With the Paper plugin and the team channel allowed in the game, the
 * mod also relays events of all players (pull) and the Bauleitung can put the plan state on the server (push).
 */
export function TeamLive({ session, team, view, onMessage }: { session: ProjectSession; team: TeamState; view: TeamView; onMessage(m: string): void }) {
  const { project, computation } = session;
  const site = siteOf(project);
  const ctx = teamContextOf(site);
  const [hello, setHello] = useState<LiveHello | null>(null);
  const [info, setInfo] = useState<LiveTeam | null>(null);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  /** Last merge written by this block: offered for undo right here (Ctrl+Z works only in the editor). */
  const [applied, setApplied] = useState<string | null>(null);
  const [auto, setAuto] = useState(() => { try { return localStorage.getItem(AUTO_KEY) === '1'; } catch { return false; } });
  const latest = useRef({ team, view });
  latest.current = { team, view };
  const me = team.self ? view.members.find(m => m.id === team.self) ?? null : null;
  const leads = me?.role === 'leitung';

  const connection = async (): Promise<{ port: number; token: string; hello: LiveHello } | null> => {
    const s = readLiveSettings();
    let h: LiveHello;
    try { h = await liveApi.hello(s.port); } catch (e) { setHello(null); setProblem(`${errorText(e)} Minecraft mit der Bauplaner-Mod starten und im Menü „Spiel“ auf „Verbinden“ drücken.`); return null; }
    setHello(h);
    if (!s.token) { setProblem('Die Website ist noch nicht mit dem Spiel verbunden: im Menü „Spiel“ auf „Mit dem Spiel verbinden“ drücken und im Spiel „Planer zulassen“ klicken.'); return null; }
    if (!liveCan(h, LIVE_FEATURE_TEAM)) { setProblem(`Die Mod ${h.mod.version} kennt den Teambau noch nicht – Mod 0.10.0 oder neuer von der Seite „Mod“ installieren.`); return null; }
    return { port: s.port, token: s.token, hello: h };
  };

  /** Merge preview of incoming events; `apply` true writes them at once (automatic sync). */
  const consider = (source: Pending['source'], events: readonly TeamEvent[], ack: readonly string[], apply: boolean): Pending | null => {
    const { team: t } = latest.current;
    if (!events.length) return null;
    const merge = mergeTeam(t, { ...t, events });
    const before = teamView(t, ctx), after = teamView(merge.team, ctx);
    const issues = [...after.conflicts.filter(c => !before.conflicts.some(b => b.text === c.text)).map(c => c.text),
      ...after.rejected.filter(r => !before.rejected.some(b => b.event.id === r.event.id)).map(r => `nicht übernommen: ${r.reason}`)];
    const p: Pending = { source, merge, issues, ack };
    // Nothing new (a lost acknowledgement, a second sync): acknowledge at once, no preview.
    if (apply || !merge.added.length) { write(p); return null; }
    return p;
  };

  const write = (p: Pending) => {
    const { team: t } = latest.current;
    if (p.merge.added.length) {
      const merged: TeamState = t.self !== undefined ? { ...p.merge.team, self: t.self } : p.merge.team;
      const label = `${p.source}: ${p.merge.added.length} Meldung${p.merge.added.length === 1 ? '' : 'en'} übernommen`;
      const e = session.execute(siteOperation({ ...siteOf(session.project), team: merged }, label));
      if (e) throw new Error(e);
      setApplied(label);
    }
    if (p.ack.length) {
      const s = readLiveSettings();
      if (s.token) void liveApi.teamAck(s.port, s.token, p.ack).catch(() => undefined);
    }
  };

  const sync = useCallback(async (automatic: boolean) => {
    const c = await connection();
    if (!c) return;
    const { team: t, view: v } = latest.current;
    const sent = await liveApi.teamPush(c.port, c.token, teamLinkState(t, v, ctx, { ...(project.world && { dimension: project.world.dimension }) }));
    const i = await liveApi.team(c.port, c.token);
    setInfo(i);
    setProblem('');
    const own = i.outbox.filter(e => !t.self || e.by === t.self);
    const p = consider('Spiel', own, i.outbox.map(e => e.id), automatic);
    if (p) setPending(p);
    if (automatic && i.way === 'live') await fromServer(c, true);
    if (!automatic) onMessage(`Teamstand ans Spiel geschickt (${sent.sections} Abschnitte${sent.inPlan ? `, ${sent.inPlan} im eingeblendeten Plan erkannt` : ''}). ${i.wayText}`
      + (own.length ? ` ${own.length} Meldung${own.length === 1 ? '' : 'en'} aus dem Spiel ${p ? 'zur Prüfung unten' : 'schon bekannt oder übernommen'}.` : ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.world, ctx]);

  const fromServer = async (c: { port: number; token: string }, automatic: boolean) => {
    const { team: t } = latest.current;
    const serverEvents = t.events.filter(e => e.origin === 'server');
    let since = serverEvents.length ? serverEvents[serverEvents.length - 1]!.id : undefined;
    const all: TeamEvent[] = [];
    for (let page = 0; page < 10; page++) {
      const r = await liveApi.teamPull(c.port, c.token, t.teamId, since);
      all.push(...r.events);
      if (!r.more || !r.events.length) break;
      since = r.events[r.events.length - 1]!.id;
    }
    const p = consider('Server', all, [], automatic);
    if (p) setPending(p);
    else if (!automatic) onMessage(all.length ? 'Alle Meldungen vom Server sind schon bekannt.' : 'Der Server hat keine neuen Meldungen.');
  };

  const run = (work: () => Promise<void>) => async () => {
    setBusy(true);
    try { await work(); } catch (e) {
      const text = errorText(e);
      const code = e instanceof LiveError ? teamLinkProblem(text) : null;
      onMessage(code ? teamLinkText(text) : text);
    } finally { setBusy(false); }
  };

  const pull = run(async () => { const c = await connection(); if (c) await fromServer(c, false); });
  const toServer = run(async () => {
    const c = await connection();
    if (!c) return;
    if (!project.world) throw new Error('Für den Server muss das Projekt auf der Weltkarte platziert sein (Ursprung und Dimension).');
    const guide = computation?.guide;
    if (!guide) throw new Error('Die Bauanleitung ist noch nicht berechnet.');
    const file = teamServerFile({ team, view, projectName: project.name, sections: site.sections, steps: guide.steps, origin: project.world.origin as [number, number, number], dimension: project.world.dimension, turns: project.world.turns ?? 0, mirror: project.world.mirror === true, farms: serverFarms(productionOf(site)) });
    // LINK-04: a server paired with this browser takes the plan as a signed control message (no leader role
    // in the plugin's team needed, nothing typed); otherwise the older push via the mod (plugin checks the role).
    const paired = await currentPairedServer();
    if (paired) {
      const answer = await control(paired.link, paired.pairing, 'team', { file });
      onMessage(`Planstand und Teamprotokoll liegen auf „${paired.pairing.name}“: ${typeof answer.text === 'string' ? answer.text : 'übernommen'}`);
      return;
    }
    const text = await liveApi.teamServer(c.port, c.token, file);
    onMessage(`Planstand und Teamprotokoll liegen auf dem Server: ${text}`);
  });

  useEffect(() => {
    try { localStorage.setItem(AUTO_KEY, auto ? '1' : '0'); } catch { /* private window */ }
    if (!auto) return;
    let stop = false;
    const tick = () => { if (!stop) void sync(true).catch(e => setProblem(errorText(e))); };
    tick();
    const id = setInterval(tick, AUTO_MS);
    return () => { stop = true; clearInterval(id); };
  }, [auto, sync]);

  const names = new Map((pending ? teamView(pending.merge.team, ctx) : view).members.map(m => [m.id, m.name]));

  return <div role="region" className="team-block team-live" aria-label="Mit Spiel abgleichen">
    <div className="team-block-head"><h3>Mit Spiel abgleichen <small>Bauplaner-Mod auf diesem PC{hello ? ` · Mod ${hello.mod.version}` : ''}</small></h3>
      <label className="team-check"><input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} /> automatisch alle 15 s</label></div>
    <p className="muted">Das Spiel zeigt dann Abschnitte in der Farbe ihres Inhabers, deinen Auftrag mit Fortschritt und Notizen am Bau. Was du im Spiel mit <code>/bauplaner team nehmen</code>, <code>fertig</code>, <code>notiz</code> oder <code>geliefert</code> meldest, kommt hierher zurück.{!me && ' Wähle oben, wer du bist – in deinem Namen meldet die Mod.'}</p>
    <div className="team-buttons">
      <button disabled={busy} onClick={() => void run(() => sync(false))()}>Jetzt abgleichen</button>
      <button disabled={busy || info?.way !== 'live'} className="secondary" onClick={() => void pull()} title={info?.way === 'live' ? '' : 'Nur wenn im Spiel der Teamkanal zum Server-Plugin steht'}>Meldungen vom Server holen</button>
      {leads && <button disabled={busy || info?.way !== 'live'} className="secondary" onClick={() => void toServer()}>Planstand auf den Server legen</button>}
    </div>
    {problem && <p className="notice warning" role="status">{problem}</p>}
    {info && <ul className="team-live-info">
      <li><strong>Server:</strong> {info.wayText}</li>
      {info.server && <li><strong>Vom Server:</strong> Team „{info.server.name}“{info.server.revision !== undefined ? `, Planstand ${info.server.revision}` : ''}{info.server.stores ? `, ${info.server.stores} Lagerkisten` : ''}{info.server.teamId !== team.teamId ? ' – ein anderes Team als dieses Projekt!' : ''}</li>}
      {info.waiting > 0 && <li>{info.waiting} Meldung{info.waiting === 1 ? '' : 'en'} warten im Spiel auf Abgleich.</li>}
      {info.rejections.slice(-3).map((r, i) => <li key={i} className="bad">Abgelehnt: {r}</li>)}
      {info.lastError && <li className="muted">Mod meldet: {info.lastError}</li>}
    </ul>}
    {applied && !pending && <p className="notice" role="status">{applied}. <button type="button" className="secondary" onClick={() => { session.undo(); setApplied(null); }}>Rückgängig</button></p>}
    {pending && <div className="team-preview" role="region" aria-label="Vorschau Abgleich">
      <h4>Aus dem {pending.source}: {pending.merge.added.length} neue Meldung{pending.merge.added.length === 1 ? '' : 'en'}{pending.merge.known ? `, ${pending.merge.known} schon bekannt` : ''}</h4>
      <ul>
        {pending.merge.added.slice(0, 8).map(e => <li key={e.id} className="muted">{describeEvent(e, ctx, names)}</li>)}
        {pending.merge.added.length > 8 && <li className="muted">… und {pending.merge.added.length - 8} weitere</li>}
        {pending.issues.map((t, i) => <li key={i} className="warn">{t}</li>)}
      </ul>
      <div className="team-buttons"><button disabled={busy} onClick={() => { try { write(pending); onMessage(`${pending.merge.added.length} Meldung${pending.merge.added.length === 1 ? '' : 'en'} übernommen.`); setPending(null); } catch (e) { onMessage(errorText(e)); } }}>Übernehmen</button>
        <button className="secondary" onClick={() => setPending(null)}>Später</button></div>
    </div>}
  </div>;
}
