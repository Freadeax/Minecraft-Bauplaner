import { Suspense, useEffect, useMemo, useRef } from 'react';
import { href } from '../../app/router';
import { projectTabs } from './tabs';
import { projectTabGroups } from './tabNames';
import { useProjectSession } from './session';
import type { ProjectSession } from './session';
import { useApp } from '../../app/context';
import { Icon, tabIcon } from '../../app/icons';
import { useDocumentTitle } from '../../app/Shell';
import { useProjectBackupState } from '../../app/backupStatus';
import { appendEvents, findUpdates, siteOf, summarizeUpdates, teamContextOf, teamView } from '../../../../../packages/domain/src/index.js';
import type { RoomTeam, TeamState } from '../../../../../packages/domain/src/index.js';
import { TeamRoomContext, useTeamRoom } from './team/roomClient';
import { TeamLiveChip, TeamNews } from './team/TeamLiveBar';
import type { Project } from '../../../../../packages/domain/src/index.js';
import type { Repository } from '../../app/repository';
import { StorageWarning } from '../../app/StorageWarning';
import '../../styles/backup.css';
import './updates.css';
import '../../styles/navGroups.css';

const saveLabel = { saved: 'In diesem Browser gespeichert', saving: 'speichert …', error: 'Speichern fehlgeschlagen', conflict: 'Konflikt mit anderem Tab' } as const;

export function ProjectView({ projectId, tab }: { projectId: string; tab: string }) {
  const { repo } = useApp();
  const { session, loadError } = useProjectSession(projectId);
  const active = projectTabs.find(t => t.id === tab);
  const tabBar = useRef<HTMLElement>(null);
  // Schmale Bildschirme: aktiven Bereich in der waagerecht scrollbaren Leiste sichtbar halten.
  useEffect(() => {
    const bar = tabBar.current, link = bar?.querySelector<HTMLElement>('[aria-current=page]');
    if (bar && link && bar.scrollWidth > bar.clientWidth) bar.scrollLeft = link.offsetLeft - (bar.clientWidth - link.offsetWidth) / 2;
  }, [tab, session !== null]);
  // Team live (COOP-07): one room connection per open project; incoming events are stored without an undo step.
  const sessionRef = useRef(session); sessionRef.current = session;
  const team = session?.project.site?.team as RoomTeam | undefined;
  // "Gerade da": my section in progress (first one), shown to the others.
  const mySection = useMemo(() => {
    if (!team?.live || !team.self || !session) return undefined;
    return teamView(team, teamContextOf(siteOf(session.project))).sections.find(s => s.owner === team.self && s.status === 'vergeben')?.sectionId;
  }, [team?.events, team?.self, !!team?.live]); // eslint-disable-line react-hooks/exhaustive-deps
  // The room hook works on the team of the last render. A step made locally in the meantime (e.g. the Bauleitung's
  // automatic team.trust right after connecting) is in the stored project but not in `next`: keep it instead of
  // overwriting it, the hook's outbox then sends it like any own step.
  const renderedTeam = useRef(team); renderedTeam.current = team;
  const room = useTeamRoom(team, team?.self, next => {
    const s = sessionRef.current; if (!s) return;
    s.replace(p => {
      const site = siteOf(p), cur = site.team as RoomTeam | undefined;
      if (cur?.teamId !== next.teamId) return p;
      const known = new Set([...(renderedTeam.current?.events ?? []), ...next.events].map(e => e.id));
      const local = cur.events.filter(e => !known.has(e.id));
      const team = local.length ? { ...next, ...appendEvents(next as TeamState, local), live: next.live } as RoomTeam : next;
      return { ...p, site: { ...site, team: team as TeamState } };
    });
  }, mySection);
  useDocumentTitle(session ? `${session.project.name}${active && active.id !== 'editor' ? ` · ${active.label}` : ''}` : 'Projekt');
  if (loadError) return <div className="page"><div className="notice warning" role="alert"><strong>Projekt nicht geladen</strong><p>{loadError}</p><a href="#/">Zur Projektzentrale</a></div></div>;
  if (!session) return <div className="loading" role="status">Projekt wird geladen …</div>;
  return <TeamRoomContext.Provider value={room}><div className="page project-page" data-computation-state={session.computationState} data-team-live={team?.live ? (room.connected ? 'live' : 'offline') : undefined}>
    <header className="project-head">
      <div className="project-title">
        <nav className="crumbs" aria-label="Pfad"><a className="crumb" href="#/">Projekte</a><span aria-hidden="true">›</span><span aria-current="page">{session.project.name}</span></nav>
        <h1 className="page-title">{session.project.name}<button type="button" className="text-button project-rename" aria-label="Projekt umbenennen" title="Projekt umbenennen"
          onClick={() => rename(session)}>✎</button></h1>
        <BackupChip repo={repo} project={session.project} /><UpdateChip project={session.project} projectId={projectId} /><TeamLiveChip project={session.project} /><StorageWarning />
      </div>
      <span className={`save-state ${session.saveState}`} role="status" title={session.saveError || 'Gespeichert wird in diesem Browser (IndexedDB). Eine Kopie außerhalb gibt es nur als Sicherungsdatei.'}>
        {repo.kind === 'memory' && session.saveState === 'saved' ? 'nur in dieser Sitzung' : saveLabel[session.saveState]}</span>
      <nav className="tabs tab-groups" aria-label="Projektbereiche" ref={tabBar}>{projectTabGroups.map((g, i) =>
        <div key={g.id} className="tab-group" role="group" aria-label={`Schritt ${i + 1}: ${g.label}`} title={g.hint} data-group={g.id}
          data-active={active?.group === g.id ? '' : undefined}>
          <span className="tab-group-label" aria-hidden="true"><b>{i + 1}</b>{g.label}</span>
          {projectTabs.filter(t => t.group === g.id).map(t =>
            <a key={t.id} href={href({ view: 'project', projectId, tab: t.id })} title={t.hint} aria-current={t.id === tab ? 'page' : undefined}><Icon name={tabIcon(t.id)} size={16} />{t.label}</a>)}
        </div>)}</nav>
      {active && <p className="tab-hint" data-tab-hint={active.id}>{active.hint}</p>}
    </header>
    {session.computationState !== 'ready' && <section className={`notice ${session.computationState === 'error' ? 'warning' : ''}`}
      aria-label="Projektberechnung" role={session.computationState === 'error' ? 'alert' : 'status'}>
      <strong>{session.computationState === 'pending' ? 'Projekt wird berechnet …' : session.computationState === 'cancelled' ? 'Projektberechnung abgebrochen' : 'Projekt konnte nicht berechnet werden'}</strong>
      {session.computationError && <p>{session.computationError}</p>}
      {session.computationState === 'pending' ? <button onClick={session.cancelComputation}>Berechnung abbrechen</button>
        : <button onClick={session.retryComputation}>Neu berechnen</button>}
    </section>}
    {(session.saveState === 'conflict' || session.saveState === 'error') && <div className="notice warning" role="alert">
      <strong>{session.saveState === 'conflict' ? 'Gespeicherter Stand wurde zwischenzeitlich geändert.' : 'Speichern fehlgeschlagen.'}</strong>
      <p>{session.saveError} Deine letzte Änderung ist nur in diesem Tab sichtbar und nicht gespeichert.</p>
      <button onClick={() => void session.reload()}>Gespeicherten Stand laden</button></div>}
    {active ? <Suspense key={active.id} fallback={<div className="loading" role="status" data-page-loading="">Bereich wird geladen …</div>}><active.component session={session} /></Suspense> : <div className="notice" role="alert">Unbekannter Projektbereich „{tab}“.</div>}
    <TeamNews project={session.project} />
  </div></TeamRoomContext.Provider>;
}

/** START-02: Projekt umbenennen (eigener Rückgängig-Schritt, Speichern wie jede andere Änderung). */
function rename(session: ProjectSession) {
  const next = window.prompt('Neuer Projektname', session.project.name);
  if (next === null || next.trim() === session.project.name) return;
  const error = session.execute({ kind: 'project.rename', name: next });
  if (error) window.alert(error);
}

const day = (iso: string) => new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
/** PRIV-01: Zeitpunkt der letzten Sicherungsdatei direkt am Projekt. */
const chipText = (state: 'never' | 'changed' | 'current', at?: string) => state === 'never' ? 'noch keine Sicherungsdatei'
  : state === 'changed' ? `seit Sicherungsdatei vom ${day(at!)} geändert` : `Sicherungsdatei vom ${day(at!)}`;

/** Sicherungsstand of this project (BACKUP-02): links to the Projektzentrale, never claims a copy outside the browser. */
function BackupChip({ repo, project }: { repo: Repository; project: Project }) {
  const line = useProjectBackupState(repo, project);
  if (!line) return null;
  const title = line.receipt ? `Zuletzt in „${line.receipt.fileName}“ (${new Date(line.receipt.at).toLocaleString('de-DE')}). Ob die Datei außerhalb dieses Browsers liegt, kann das Build Studio nicht prüfen.` : 'In keiner Sicherungsdatei dieses Browsers enthalten.';
  return <a className={`backup-chip ${line.state}`} href="#/" data-backup-state={line.state} title={title}>{line.receipt ? chipText(line.state, line.receipt.at) : chipText('never')}</a>;
}

/** Neue Versionen (UPDATE-01): shown only when an update is available; links to the Updates tab. */
function UpdateChip({ project, projectId }: { project: Project; projectId: string }) {
  const { library } = useApp();
  const summary = useMemo(() => summarizeUpdates(findUpdates(project, library)), [project, library]);
  if (!summary.available) return null;
  return <a className="update-head-chip" href={href({ view: 'project', projectId, tab: 'updates' })} data-updates={summary.available}
    title="Neue Bauteilversionen in der Bibliothek. Nichts wird automatisch umgestellt.">{summary.available === 1 ? '1 Update verfügbar' : `${summary.available} Updates verfügbar`}</a>;
}
