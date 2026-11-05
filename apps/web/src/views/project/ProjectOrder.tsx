import { useEffect, useMemo, useState } from 'react';
import { addProjectAfter, MAX_PROJECT_AFTER, programOf, projectAfterProblem, projectStartCheck, projectSuccessors, removeProjectAfter, setProgramSettings } from '../../../../../packages/domain/src/index.js';
import type { OrderProject, Project, SitePlan } from '../../../../../packages/domain/src/index.js';
import { useApp } from '../../app/context';

const deDate = (iso: string | null | undefined): string => iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : '';

/** All projects of this browser, refreshed when another tab or view saves one. */
function useOrderProjects(): OrderProject[] | null {
  const { repo } = useApp();
  const [projects, setProjects] = useState<OrderProject[] | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => void repo.listProjects().then(list => { if (alive) setProjects(list.map(p => ({ id: p.id, name: p.name, ...(p.site && { site: p.site }) }))); }).catch(() => undefined);
    load();
    const off = repo.subscribe(c => { if (c.kind === 'projects') load(); });
    return () => { alive = false; off(); };
  }, [repo]);
  return projects;
}

/**
 * Reihenfolge zwischen Projekten (PROJ-04): „dieses Projekt erst nach …“.
 * The predecessors' agreed ends come from their active baseline; a start date
 * before that is flagged with a one-click fix.
 */
export function ProjectOrder({ project, site, save }: { project: Project; site: SitePlan; save: (next: SitePlan | (() => SitePlan), label: string) => void }) {
  const stored = useOrderProjects();
  const [pick, setPick] = useState(''), [note, setNote] = useState('');
  // The open project from the session (newest, unsaved edits included) replaces its stored copy.
  const projects = useMemo(() => stored ? [...stored.filter(p => p.id !== project.id), { id: project.id, name: project.name, site }] : null, [stored, project.id, project.name, site]);
  const self = { id: project.id, name: project.name, site };
  const check = useMemo(() => projects ? projectStartCheck(self, projects) : null, [projects, site]); // eslint-disable-line react-hooks/exhaustive-deps
  const successors = useMemo(() => projects ? projectSuccessors(project.id, projects) : [], [projects, project.id]);
  if (!projects || !check) return null;
  const program = programOf(site), listed = new Set((program.after ?? []).map(a => a.projectId));
  const candidates = projects.filter(p => p.id !== project.id && !listed.has(p.id)).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const problem = pick ? projectAfterProblem(projects, project.id, pick) : null;
  const nameOf = (id: string) => projects.find(p => p.id === id)?.name ?? id;
  const setStart = (iso: string) => save(setProgramSettings(site, { start: iso }), `Start ${deDate(iso)} (nach den vorherigen Projekten)`);

  return <section className="site-block prog-order" aria-label="Reihenfolge der Projekte">
    <div className="site-head"><h3>Reihenfolge der Projekte <small>„{project.name}“ beginnt erst, wenn andere Projekte fertig sind</small></h3>
      {candidates.length > 0 && (program.after?.length ?? 0) < MAX_PROJECT_AFTER && <form className="site-add" onSubmit={e => {
        e.preventDefault(); if (!pick || problem) return;
        save(() => addProjectAfter(site, project.id, pick, note), `Erst nach „${nameOf(pick)}“`); setPick(''); setNote('');
      }}>
        <span className="muted">erst nach</span>
        <select value={pick} onChange={e => setPick(e.target.value)} aria-label="Projekt, das vorher fertig sein muss"><option value="">Projekt …</option>{candidates.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <input value={note} maxLength={200} onChange={e => setNote(e.target.value)} placeholder="Grund (optional)" aria-label="Grund für die Reihenfolge" />
        <button type="submit" disabled={!pick || !!problem}>+ Erst nach</button>
      </form>}
    </div>
    {problem && <p className="field-error" role="alert">{problem}</p>}
    {!check.predecessors.length ? <p className="muted">Wartet auf kein anderes Projekt.{candidates.length ? '' : ' (Es gibt noch keine anderen Projekte.)'}</p>
      : <ul className="prog-dep-list">{check.predecessors.map(p => <li key={p.projectId}>
        erst nach <strong>{p.name}</strong>{p.note && <small> · {p.note}</small>}
        <span className={`badge ${p.source === 'done' ? 'done' : p.source === 'baseline' ? 'warn' : 'open'}`}>
          {p.source === 'baseline' ? `fertig bis ${deDate(p.end)}` : p.source === 'done' ? `fertig seit ${deDate(p.end)}` : p.source === 'missing' ? 'gelöscht' : 'Ende offen'}</span>
        {p.source !== 'missing' && <a href={`#/projekt/${p.projectId}/planung`}>Planung öffnen</a>}
        <button onClick={() => save(removeProjectAfter(site, p.projectId), `Reihenfolge nach „${p.name}“ entfernt`)} aria-label={`Erst nach ${p.name} entfernen`}>✕</button></li>)}</ul>}
    {check.tooEarly && check.earliestStart && <div className="notice warning" role="alert">
      Der Start am {deDate(program.start)} liegt vor dem Ende der vorherigen Projekte. Frühester Start: <b>{deDate(check.earliestStart)}</b>.
      <button onClick={() => setStart(check.earliestStart!)}>Start auf {deDate(check.earliestStart)} setzen</button></div>}
    {!program.start && check.earliestStart && <p className="muted">Frühester Start nach den vorherigen Projekten: {deDate(check.earliestStart)}. <button className="secondary" onClick={() => setStart(check.earliestStart!)}>Als Startdatum übernehmen</button></p>}
    {check.unknown > 0 && <p className="muted small">Ein Ende ist nur bekannt, wenn das vorherige Projekt in seiner Planung einen Basisplan festhält.</p>}
    {successors.length > 0 && <p className="muted">Danach kommen: {successors.map(s => <a key={s.id} href={`#/projekt/${s.id}/planung`}>{s.name}</a>).reduce<React.ReactNode[]>((acc, el, i) => i ? [...acc, ', ', el] : [el], [])}.</p>}
  </section>;
}
