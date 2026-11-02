import { useEffect, useMemo, useRef } from 'react';
import { href } from '../../app/router';
import { projectTabs } from './tabs';
import { useProjectSession } from './session';
import { useApp } from '../../app/context';
import { Icon, tabIcon } from '../../app/icons';
import { useDocumentTitle } from '../../app/Shell';
import { useProjectBackupState } from '../../app/backupStatus';
import { findUpdates, summarizeUpdates } from '../../../../../packages/domain/src/index.js';
import type { Project } from '../../../../../packages/domain/src/index.js';
import type { Repository } from '../../app/repository';
import '../../backup.css';
import './updates.css';

const saveLabel = { saved: 'gespeichert', saving: 'speichert …', error: 'Speichern fehlgeschlagen', conflict: 'Konflikt mit anderem Tab' } as const;

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
  useDocumentTitle(session ? `${session.project.name}${active && active.id !== 'editor' ? ` · ${active.label}` : ''}` : 'Projekt');
  if (loadError) return <div className="page"><div className="notice warning" role="alert"><strong>Projekt nicht geladen</strong><p>{loadError}</p><a href="#/">Zur Projektzentrale</a></div></div>;
  if (!session) return <div className="loading" role="status">Projekt wird geladen …</div>;
  return <div className="page project-page" data-computation-state={session.computationState}>
    <header className="project-head">
      <div className="project-title">
        <nav className="crumbs" aria-label="Pfad"><a className="crumb" href="#/">Projekte</a><span aria-hidden="true">›</span><span aria-current="page">{session.project.name}</span></nav>
        <h1 className="page-title">{session.project.name}</h1>
        <BackupChip repo={repo} project={session.project} /><UpdateChip project={session.project} projectId={projectId} />
      </div>
      <span className={`save-state ${session.saveState}`} role="status" title={session.saveError}>
        {saveLabel[session.saveState]}{repo.kind === 'memory' && ' · nur diese Sitzung'}</span>
      <nav className="tabs" aria-label="Projektbereiche" ref={tabBar}>{projectTabs.map(t =>
        <a key={t.id} href={href({ view: 'project', projectId, tab: t.id })} aria-current={t.id === tab ? 'page' : undefined}><Icon name={tabIcon(t.id)} size={16} />{t.label}</a>)}</nav>
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
    {active ? <active.component session={session} /> : <div className="notice" role="alert">Unbekannter Projektbereich „{tab}“.</div>}
  </div>;
}

const chipText = { never: 'noch nie gesichert', changed: 'seit Sicherung geändert', current: 'gesichert' } as const;

/** Sicherungsstand of this project (BACKUP-02): links to the Projektzentrale, never claims a copy outside the browser. */
function BackupChip({ repo, project }: { repo: Repository; project: Project }) {
  const line = useProjectBackupState(repo, project);
  if (!line) return null;
  const title = line.receipt ? `Zuletzt in „${line.receipt.fileName}“ (${new Date(line.receipt.at).toLocaleString('de-DE')}). Ob die Datei außerhalb dieses Browsers liegt, kann der Bauplaner nicht prüfen.` : 'In keiner Sicherungsdatei dieses Browsers enthalten.';
  return <a className={`backup-chip ${line.state}`} href="#/" data-backup-state={line.state} title={title}>{chipText[line.state]}</a>;
}

/** Neue Versionen (UPDATE-01): shown only when an update is available; links to the Updates tab. */
function UpdateChip({ project, projectId }: { project: Project; projectId: string }) {
  const { library } = useApp();
  const summary = useMemo(() => summarizeUpdates(findUpdates(project, library)), [project, library]);
  if (!summary.available) return null;
  return <a className="update-head-chip" href={href({ view: 'project', projectId, tab: 'updates' })} data-updates={summary.available}
    title="Neue Bauteilversionen in der Bibliothek. Nichts wird automatisch umgestellt.">{summary.available === 1 ? '1 Update verfügbar' : `${summary.available} Updates verfügbar`}</a>;
}
