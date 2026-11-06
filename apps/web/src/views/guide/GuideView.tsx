import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../app/context';
import { Icon } from '../../app/icons';
import { GuideArt } from './GuideArt';
import { doneKey, GUIDE_ORDER, GUIDE_PATHS, GUIDE_TERMS, guidePath, guideSearch, NEED_LABEL, parseDone, parseGuideSearch, pathProgress, stepLink } from './guideSteps';
import type { GuidePath } from './guideSteps';
import './guide.css';

const DONE_KEY = 'bauplaner.anleitung.erledigt';
const readDone = () => { try { return parseDone(localStorage.getItem(DONE_KEY)); } catch { return new Set<string>(); } };

interface ProjectChoice { readonly id: string; readonly name: string }

/**
 * GUIDE-01 „Wie geh ich es an?“ (#/anleitung[?weg=<id>&schritt=<n>]): Wege nach Ziel, jeder Schritt mit
 * Grafik, einem kurzen Satz und einem Knopf direkt an die Stelle im Planer. Erledigt-Haken bleiben nur in
 * diesem Browser (Komfort, keine Projektdaten).
 */
export function GuideView({ search }: { search?: string | undefined }) {
  const { repo } = useApp();
  const wish = parseGuideSearch(search);
  const [pathId, setPathId] = useState(wish.path ?? GUIDE_ORDER[0]!);
  const [focus, setFocus] = useState<number | null>(wish.step ?? null);
  const [done, setDone] = useState(readDone);
  const [projects, setProjects] = useState<readonly ProjectChoice[] | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  // Links in a project follow the hash: another guide link (?weg=…) switches the path without a reload.
  useEffect(() => { if (wish.path) { setPathId(wish.path); setFocus(wish.step ?? null); } }, [wish.path, wish.step]);
  useEffect(() => {
    let alive = true;
    const load = () => repo.listProjects().then(list => {
      if (!alive) return;
      const sorted = [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(p => ({ id: p.id, name: p.name }));
      setProjects(sorted);
      setProjectId(current => current && sorted.some(p => p.id === current) ? current : sorted[0]?.id ?? null);
    }, () => { if (alive) setProjects([]); });
    void load();
    const off = repo.subscribe(c => { if (c.kind === 'projects') void load(); });
    return () => { alive = false; off(); };
  }, [repo]);

  const path = guidePath(pathId) ?? GUIDE_PATHS[0]!;
  const ordered = useMemo(() => GUIDE_ORDER.map(id => guidePath(id)).filter((p): p is GuidePath => !!p), []);
  const progress = pathProgress(path, done);
  const firstOpen = path.steps.findIndex(s => !done.has(doneKey(path.id, s.id)));
  const current = focus ?? (firstOpen < 0 ? null : firstOpen + 1);
  const nextPath = ordered[ordered.findIndex(p => p.id === path.id) + 1];

  const remember = (next: Set<string>) => {
    setDone(next);
    try { localStorage.setItem(DONE_KEY, JSON.stringify([...next])); } catch { /* private mode: only for this visit */ }
  };
  const toggle = (stepId: string) => {
    const next = new Set(done), key = doneKey(path.id, stepId);
    if (next.has(key)) next.delete(key); else next.add(key);
    remember(next);
    setFocus(null);
  };
  const choose = (id: string, step?: number) => {
    setPathId(id); setFocus(step ?? null);
    // Shareable address without a hashchange (which would scroll to the top).
    history.replaceState(null, '', `#/anleitung?${guideSearch(id, step)}`);
  };
  const resetPath = () => remember(new Set([...done].filter(k => !k.startsWith(`${path.id}/`))));

  return <div className="page guide-page">
    <div className="page-head"><div><span className="eyebrow">ANLEITUNG</span><h1 className="page-title">Wie geh ich es an?</h1>
      <p className="muted">Such dir aus, was du vorhast. Jeder Schritt ist ein Bild und ein Satz, der Knopf bringt dich genau an die richtige Stelle.</p></div></div>

    <nav className="guide-paths" aria-label="Was hast du vor?">
      {ordered.map((p, i) => {
        const pr = pathProgress(p, done);
        return <button key={p.id} type="button" className="guide-path" aria-pressed={p.id === path.id} onClick={() => choose(p.id)} data-path={p.id}>
          <span className="guide-path-nr" aria-hidden="true">{i + 1}</span>
          <span className="guide-path-icon"><Icon name={p.icon} size={22} /></span>
          <b>{p.title}</b>
          <span className="guide-path-goal">{p.goal}</span>
          <span className="guide-path-meta">{p.needs.map(n => NEED_LABEL[n]).join(' · ')} · ca. {p.minutes} Min.</span>
          <span className="guide-meter" role="progressbar" aria-label={`${p.title}: erledigt`} aria-valuemin={0} aria-valuemax={pr.total} aria-valuenow={pr.done}>
            <span style={{ width: `${Math.round(pr.done / pr.total * 100)}%` }} /></span>
        </button>;
      })}
    </nav>

    <section className="guide-run" aria-labelledby="guide-title">
      <header className="guide-run-head">
        <div><h2 id="guide-title">{path.title}</h2><p className="muted">{path.goal}</p></div>
        <div className="guide-run-tools">
          {projects && projects.length > 0 && <label className="guide-project">Links führen in
            <select value={projectId ?? ''} onChange={e => setProjectId(e.target.value)}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></label>}
          {projects && projects.length === 0 && <p className="muted small">Noch kein Projekt: Schritt „Projekt anlegen“ im ersten Weg legt eins an.</p>}
          <span className="guide-count" role="status">{progress.done} von {progress.total} erledigt</span>
        </div>
      </header>

      <ol className="guide-steps">
        {path.steps.map((s, i) => {
          const link = stepLink(s, projectId);
          const isDone = done.has(doneKey(path.id, s.id));
          return <li key={s.id} className="guide-step" data-step={s.id} data-done={isDone} aria-current={current === i + 1 ? 'step' : undefined}>
            <GuideArt scene={s.scene} icon={s.icon} keyCap={s.key} step={i + 1} />
            <div className="guide-step-body">
              <h3>{s.title}</h3>
              <p>{s.text}</p>
              <div className="guide-step-actions">
                {link.href ? <a className={current === i + 1 ? 'primary button-link' : 'secondary button-link'} href={link.href}
                  onClick={s.target.kind === 'path' ? e => { e.preventDefault(); choose(s.target.kind === 'path' ? s.target.path : path.id); } : undefined}>
                  {link.label} <Icon name="arrow" size={15} /></a>
                  : <span className="guide-ingame"><Icon name="game" size={15} /> {link.label}</span>}
                <label className="guide-done"><input type="checkbox" checked={isDone} onChange={() => toggle(s.id)} /> erledigt</label>
              </div>
              {link.note && <p className="muted small">{link.note}</p>}
            </div>
          </li>;
        })}
      </ol>

      <div className="guide-run-foot">
        {progress.done === progress.total && <p className="guide-finished" role="status"><Icon name="check" size={18} /> Geschafft! {nextPath ? 'Weiter geht es mit dem nächsten Weg.' : 'Du kennst jetzt alle Wege.'}</p>}
        <div className="button-row">
          {nextPath && <button type="button" className={progress.done === progress.total ? 'primary' : 'secondary'} onClick={() => choose(nextPath.id)}>Nächster Weg: {nextPath.title} <Icon name="arrow" size={15} /></button>}
          {progress.done > 0 && <button type="button" className="text-button" onClick={resetPath}>Haken dieses Wegs zurücksetzen</button>}
        </div>
      </div>
    </section>

    <section className="guide-terms" aria-labelledby="guide-terms">
      <h2 id="guide-terms">Wörter kurz erklärt</h2>
      <dl>{GUIDE_TERMS.map(t => <div key={t.term}><dt>{t.term}</dt><dd>{t.text}</dd></div>)}</dl>
      <p className="muted small">Mehr Hilfe: Strg+K öffnet die Schnellsuche für jede Seite, die <a href="#/mod">Seite „Spiel“</a> erklärt die Mod je Launcher, die <a href="#/testphase">Testphase</a> nimmt Fehlermeldungen an.</p>
    </section>
  </div>;
}
