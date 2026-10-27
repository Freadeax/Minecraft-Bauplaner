import { useCallback, useEffect, useState } from 'react';
import { applyOperation, createProject, newInstance } from '../../../../packages/domain/src/index.js';
import type { Instance, Project } from '../../../../packages/domain/src/index.js';
import { useApp } from '../app/context';
import { href, navigate } from '../app/router';
import { Cube, errorText } from '../app/ui';

/** Projektzentrale: local projects with revision, size and storage status. */
export function ProjectsView() {
  const { repo, library } = useApp();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    try { setProjects((await repo.listProjects()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))); }
    catch (e) { setMessage(errorText(e)); }
  }, [repo]);
  useEffect(() => { void load(); }, [load]);

  const create = async (project: Project) => {
    try { await repo.saveProject(project, 0); navigate({ view: 'project', projectId: project.id, tab: 'editor' }); }
    catch (e) { setMessage(`Projekt nicht gespeichert: ${errorText(e)}`); }
  };
  const createEmpty = () => {
    try { void create(createProject({ name: name || 'Neues Projekt' })); } catch (e) { setMessage(errorText(e)); }
  };
  const createSample = () => {
    const version = (assetId: string) => library.assets.find(a => a.id === assetId)?.versionIds.at(-1);
    const tower = version('sample_tower'), wall = version('sample_wall'), gate = version('sample_gate');
    if (!tower || !wall || !gate) { setMessage('Beispielbauteile fehlen in der Bibliothek.'); return; }
    const at = (assetVersionId: string, name: string, x: number, z: number, quarterTurns: 0 | 1 | 2 | 3 = 0): Instance =>
      newInstance({ assetVersionId, name, transform: { position: [x, 0, z], quarterTurns, mirrorX: false } });
    // Positions follow the sample connectors: tower east face (4,0,2) ↔ wall west joint (0,0,1).
    const instances = [at(tower, 'Turm West', 0, 0), at(wall, 'Mauer 1', 4, 1), at(gate, 'Tor', 10, 1), at(wall, 'Mauer 2', 16, 1), at(tower, 'Turm Ost', 22, 0)];
    let project = createProject({ name: 'Burgmauer (Beispiel)', description: 'Beispielprojekt aus den synthetischen Bibliotheksbauteilen.' });
    project = applyOperation(project, { kind: 'batch', label: 'Beispiel', operations: instances.map(instance => ({ kind: 'instance.add' as const, instance })) }).project;
    void create(project);
  };
  const remove = async (project: Project) => {
    if (!window.confirm(`Projekt „${project.name}“ endgültig löschen? Bibliotheksbauteile bleiben erhalten.`)) return;
    try { await repo.deleteProject(project.id); await load(); } catch (e) { setMessage(errorText(e)); }
  };

  return <div className="page">
    <section className="intro"><div><span className="eyebrow">PROJEKTZENTRALE</span><h1>Große Ideen.<br /><em>Block für Block.</em></h1>
      <p>Setze gespeicherte Bauteile zu Projekten zusammen, prüfe Überschneidungen Block für Block und plane den Nachbau. Alles läuft lokal in deinem Browser.</p></div>
      <div className="intro-aside"><div className="local-badge"><span className="pulse" /> {repo.kind === 'memory' ? 'Nur für diese Sitzung gespeichert' : 'Lokal in diesem Browser gespeichert'}</div>
        <p>Keine Anmeldung. Kein Welt-Upload.<br />{repo.kind === 'memory' ? 'Nach dem Neuladen sind Projekte weg – dauerhafte Speicherung folgt.' : 'Browserdaten sind keine Cloudsicherung.'}</p></div></section>
    <section className="card-grid" aria-label="Projekte">
      <form className="card new-card" onSubmit={e => { e.preventDefault(); createEmpty(); }}>
        <span className="panel-kicker">NEUES PROJEKT</span>
        <label>Name<input value={name} maxLength={120} onChange={e => setName(e.target.value)} placeholder="z. B. Hafenviertel" /></label>
        <button className="primary" type="submit">＋ Leeres Projekt anlegen</button>
        <button className="secondary" type="button" onClick={createSample}>Beispielprojekt „Burgmauer“</button>
        <a className="text-button" href="#/betrachter">Nur eine Datei ansehen →</a>
      </form>
      {projects === null ? <p className="muted">Projekte werden geladen …</p> : projects.map(p => <article className="card" key={p.id}>
        <div className="project-icon"><Cube /></div>
        <h2><a href={href({ view: 'project', projectId: p.id, tab: 'editor' })}>{p.name}</a></h2>
        {p.description && <p className="muted">{p.description}</p>}
        <dl className="stats"><div><dt>Instanzen</dt><dd>{p.instances.length}</dd></div><div><dt>Freigegebene Revisionen</dt><dd>{p.revisions.length}</dd></div>
          <div><dt>Profil</dt><dd>{p.profileId}</dd></div><div><dt>Zuletzt geändert</dt><dd>{new Date(p.updatedAt).toLocaleString('de-DE')}</dd></div></dl>
        <div className="button-row"><a className="primary" href={href({ view: 'project', projectId: p.id, tab: 'editor' })}>Öffnen</a><button className="danger" onClick={() => void remove(p)}>Löschen</button></div>
      </article>)}
    </section>
    {message && <div className="notice warning" role="alert">{message}</div>}
  </div>;
}
