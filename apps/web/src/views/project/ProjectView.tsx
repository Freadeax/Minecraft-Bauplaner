import { href } from '../../app/router';
import { projectTabs } from './tabs';
import { useProjectSession } from './session';
import { useApp } from '../../app/context';

const saveLabel = { saved: 'gespeichert', saving: 'speichert …', error: 'Speichern fehlgeschlagen', conflict: 'Konflikt mit anderem Tab' } as const;

export function ProjectView({ projectId, tab }: { projectId: string; tab: string }) {
  const { repo } = useApp();
  const { session, loadError } = useProjectSession(projectId);
  if (loadError) return <div className="page"><div className="notice warning" role="alert"><strong>Projekt nicht geladen</strong><p>{loadError}</p><a href="#/">Zur Projektzentrale</a></div></div>;
  if (!session) return <div className="loading" role="status">Projekt wird geladen …</div>;
  const active = projectTabs.find(t => t.id === tab);
  return <div className="page project-page">
    <header className="project-head">
      <div><a className="crumb" href="#/">Projekte</a><h1 className="page-title">{session.project.name}</h1></div>
      <nav className="tabs" aria-label="Projektbereiche">{projectTabs.map(t =>
        <a key={t.id} href={href({ view: 'project', projectId, tab: t.id })} aria-current={t.id === tab ? 'page' : undefined}>{t.label}</a>)}</nav>
      <span className={`save-state ${session.saveState}`} role="status" title={session.saveError}>
        {saveLabel[session.saveState]}{repo.kind === 'memory' && ' · nur diese Sitzung'}</span>
    </header>
    {(session.saveState === 'conflict' || session.saveState === 'error') && <div className="notice warning" role="alert">
      <strong>{session.saveState === 'conflict' ? 'Gespeicherter Stand wurde zwischenzeitlich geändert.' : 'Speichern fehlgeschlagen.'}</strong>
      <p>{session.saveError} Deine letzte Änderung ist nur in diesem Tab sichtbar und nicht gespeichert.</p>
      <button onClick={() => void session.reload()}>Gespeicherten Stand laden</button></div>}
    {active ? <active.component session={session} /> : <div className="notice" role="alert">Unbekannter Projektbereich „{tab}“.</div>}
  </div>;
}
