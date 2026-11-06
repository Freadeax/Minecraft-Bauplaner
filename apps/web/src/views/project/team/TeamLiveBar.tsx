import { useEffect, useMemo } from 'react';
import { describeEvent, roomStatus, siteOf, teamContextOf, teamView } from '../../../../../../packages/domain/src/index.js';
import type { Project, RoomTeam } from '../../../../../../packages/domain/src/index.js';
import { href } from '../../../app/router';
import { useRoomConnection } from './roomClient';
import '../../../styles/team.css';

const NEWS_MS = 9000;

/**
 * Team live in every tab (COOP-09, TEAM_LIVE.md §11): a status chip in the project head and short notes when
 * someone else takes, reports or confirms something. Clicking a note opens the Team tab.
 */
export function TeamLiveChip({ project }: { project: Project }) {
  const room = useRoomConnection();
  const team = project.site?.team as RoomTeam | undefined;
  if (!team?.live) return null;
  const status = roomStatus(team, room.connected);
  const others = room.presence.filter(p => p.device !== team.live!.device).length;
  if (status.state === 'off') return null;
  const text = status.state === 'live' ? `Team live${others ? ` · ${others} da` : ''}` : status.state === 'waiting' ? `Team sendet ${status.pending} …`
    : `Team offline${status.pending ? ` · ${status.pending} warten` : ''}`;
  return <a className={`team-live-chip ${status.state}`} href={href({ view: 'project', projectId: project.id, tab: 'team' })} data-team-live={status.state}
    title={room.error || 'Team-Raum: Schritte aller erscheinen hier sofort.'}>● {text}</a>;
}

export function TeamNews({ project }: { project: Project }) {
  const room = useRoomConnection();
  const team = project.site?.team;
  const site = siteOf(project);
  const ctx = useMemo(() => teamContextOf(site), [site]);
  const names = useMemo(() => team ? new Map(teamView(team, ctx).members.map(m => [m.id, m.name])) : new Map<string, string>(), [team, ctx]);
  const newest = room.news.at(-1)?.key;
  useEffect(() => {
    if (!newest) return;
    const t = setTimeout(() => room.dismiss(newest), NEWS_MS);
    return () => clearTimeout(t);
  }, [newest]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = room.news.slice(-3);
  if (!team || (!shown.length && !room.rejected.length && !room.stale.length)) return null;
  const lastStale = room.stale.at(-1);
  return <section className="team-news" aria-label="Neues im Team" aria-live="polite">
    {shown.map(n => <div key={n.key} className="team-news-item">
      <a href={href({ view: 'project', projectId: project.id, tab: 'team' })}>{describeEvent(n.event, ctx, names)}</a>
      <button className="link-button" aria-label="Meldung schließen" onClick={() => room.dismiss(n.key)}>×</button></div>)}
    {room.rejected.length > 0 && <div className="team-news-item warning" role="alert">
      <span>{room.rejected.length === 1 ? 'Eine Meldung' : `${room.rejected.length} Meldungen`} hat der Team-Raum nicht angenommen: {room.rejected.at(-1)!.reason}</span>
      <button className="link-button" aria-label="Hinweis schließen" onClick={room.clearRejected}>×</button></div>}
    {lastStale && <div className="team-news-item warning" role="alert" data-testid="team-stale">
      <span>Nicht übernommen, weil {names.get(lastStale.by) ?? 'jemand anderes'} schneller war: {describeEvent(lastStale.event, ctx, names)}. Der Stand der anderen gilt{room.stale.length > 1 ? ` (${room.stale.length} Schritte)` : ''}.</span>
      <button className="link-button" aria-label="Hinweis schließen" onClick={room.clearStale}>×</button></div>}
  </section>;
}
