import { useMemo, useState } from 'react';
import {
  addBuilder, addDependency, addMilestone, assignSection, builderText, moveMilestone, MILESTONE_STATUS_LABEL, paceOf, planProgram, programIssues, programOf,
  PROGRAM_PRESET_LABEL, programText, removeBuilder, removeDependency, removeMilestone, SECTION_STATE_LABEL, setProgramSettings, siteOf, siteOperation,
  suggestDependencies, suggestProgram, updateBuilder, updateMilestone, UNASSIGNED,
} from '../../../../../packages/domain/src/index.js';
import type { BuilderLoad, DependencySuggestion, ProgramPlan, ProgramPreset, ScheduledSection, SitePlan } from '../../../../../packages/domain/src/index.js';
import { download, errorText, formatNumber } from '../../app/ui';
import { isResolved } from './session';
import type { ProjectSession } from './session';
import '../../planning.css';

const pct = (a: number, b: number): number => b ? Math.round(a / b * 100) : 0;
const deDate = (iso: string | null | undefined): string => iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : '';
const days = (n: number): string => `${n} Bautag${n === 1 ? '' : 'e'}`;
const today = (): string => new Date().toISOString().slice(0, 10);
const fileStem = (name: string): string => name.replace(/[^\p{L}\p{N}_-]+/gu, '_');
const whenText = (s: Pick<ScheduledSection, 'sessions' | 'start' | 'end' | 'startDate' | 'endDate'>): string =>
  s.sessions === 0 ? 'fertig' : s.startDate ? `${deDate(s.startDate)} – ${deDate(s.endDate)}` : `Bautag ${s.start + 1}–${s.end}`;

/** Applies a site change as one undo step; a thunk lets domain validation errors (e.g. cycles) show as a message. */
type Save = (next: SitePlan | (() => SitePlan), label: string) => void;

/**
 * Projektplanung (PROJ-01): milestones with dates, dependencies between build
 * sections, builders with assignments, a schedule over building days and the
 * critical path. All rules live in domain `program.ts`; this tab edits
 * `project.site.program` only through undoable site operations.
 */
export function PlanningTab({ session }: { session: ProjectSession }) {
  const { project, resolution, computation } = session;
  const site = siteOf(project), program = programOf(site);
  const [message, setMessage] = useState('');
  const save: Save = (next, label) => { try { setMessage(session.execute(siteOperation(typeof next === 'function' ? next() : next, label))); } catch (e) { setMessage(errorText(e)); } };
  const overview = computation?.site.plan ?? null, guide = computation?.guide ?? null;
  const plan = useMemo(() => overview ? planProgram(site, overview, paceOf(site), today()) : null, [site, overview]);
  const suggestions = useMemo(() => guide ? suggestDependencies(site, project, guide) : [], [site, project, guide]);
  const issues = useMemo(() => programIssues(site), [site]);

  if (session.computationState !== 'ready') return <section className="planning" aria-label="Planung"><p role="status">{session.computationState === 'pending' ? 'Planung wird neu berechnet.' : session.computationState === 'cancelled' ? 'Planungsberechnung abgebrochen.' : 'Planung nicht verfügbar.'}</p></section>;
  if (!isResolved(resolution)) return <section className="planning" aria-label="Planung"><div className="notice warning" role="alert"><strong>Planung nicht verfügbar</strong><p>{resolution.error}</p></div></section>;
  if (!plan || !overview) return <section className="planning" aria-label="Planung"><p role="alert">Der Projektplan konnte nicht erstellt werden.</p></section>;
  if (!site.sections.length) return <section className="planning" aria-label="Planung"><div className="notice">Die Planung baut auf Bauabschnitten auf. Lege zuerst unter <a href={`#/projekt/${project.id}/baustelle`}>Baustelle</a> Abschnitte an (oder übernimm dort einen Vorschlag); danach kannst du hier Meilensteine, Abhängigkeiten und Bauleute planen.</div></section>;

  const name = new Map(site.sections.map(s => [s.id, s.name]));
  const next = plan.milestones.find(m => m.status !== 'done') ?? null;
  const title = project.name;
  return <section className="planning" aria-label="Planung">
    <header className="prog-overview" aria-label="Planungsübersicht">
      <div className="site-kpi wide"><span className="panel-kicker">VORAUSSICHTLICHE DAUER · PROJEKTION</span>
        <strong>{plan.sessions === 0 ? '✓ Fertig' : plan.endDate ? `bis ${deDate(plan.endDate)}` : days(plan.sessions)}</strong>
        <small>{plan.sessions > 0 && plan.endDate ? `${days(plan.sessions)} ab ${deDate(plan.start)} · ${plan.sessionsPerWeek} Bautage je Woche` : plan.sessions > 0 ? 'Ohne Startdatum nur Bautage; Datum unter „Einstellungen“' : 'Alle Abschnitte abgehakt'} · {formatNumber(overview.totals.blocksDone)} von {formatNumber(overview.totals.blocks)} Blöcken</small></div>
      <div className="site-kpi"><span className="panel-kicker">NÄCHSTER MEILENSTEIN</span><strong className="site-current">{next ? next.name : plan.milestones.length ? '✓ Alle erreicht' : '–'}</strong>
        <small>{next ? `${MILESTONE_STATUS_LABEL[next.status]}${next.due ? ` · bis ${deDate(next.due)}` : ''}${next.endDate ? ` · voraussichtlich ${deDate(next.endDate)}` : next.end ? ` · Bautag ${next.end}` : ''}` : 'Meilensteine unten anlegen'}</small></div>
      <div className="site-kpi"><span className="panel-kicker">BAULEUTE</span><strong>{plan.builders.length || '–'}</strong>
        <small>{plan.builders.length ? plan.builders.map(b => `${b.name} ${days(b.sessions)}`).join(' · ') : 'Ein Spieler mit Projekt-Bautempo'}</small></div>
      <div className="site-kpi"><span className="panel-kicker">KRITISCHER PFAD</span><strong>{plan.criticalPath.length}</strong>
        <small>{plan.criticalPath.length ? `Abschnitte ohne Puffer: ${plan.criticalPath.map(id => name.get(id)).join(', ')}` : 'Nichts offen'}</small></div>
    </header>
    {message && <div className="notice warning" role="alert">{message}<button onClick={() => setMessage('')}>OK</button></div>}
    {issues.length > 0 && <div className="notice warning" role="status"><strong>Plan prüfen</strong><ul>{issues.map(i => <li key={i.message}>{i.message}</li>)}</ul></div>}

    <Timeline plan={plan} />
    <Milestones plan={plan} site={site} save={save} />
    <Dependencies site={site} plan={plan} suggestions={suggestions} save={save} />
    <Builders plan={plan} site={site} save={save} title={title} />
    <section className="site-block prog-settings" aria-label="Einstellungen">
      <div className="site-head"><h3>Einstellungen <small>Startdatum und Bautage je Woche</small></h3>
        <button onClick={() => download(`Bauprogramm_${fileStem(title)}.txt`, programText(plan, site, title), 'text/plain')}>Bauprogramm als Text</button></div>
      <div className="prog-settings-row">
        <label>Erster Bautag<input type="date" value={program.start ?? ''} aria-label="Startdatum" onChange={e => save(setProgramSettings(site, { start: e.target.value || null }), e.target.value ? `Start ${deDate(e.target.value)}` : 'Startdatum entfernt')} /></label>
        <label>Bautage je Woche<select value={program.sessionsPerWeek ?? 7} aria-label="Bautage je Woche" onChange={e => save(setProgramSettings(site, { sessionsPerWeek: Number(e.target.value) }), `${e.target.value} Bautage je Woche`)}>
          {[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n}{n < 7 ? ` (${['Mo', 'Mo–Di', 'Mo–Mi', 'Mo–Do', 'Mo–Fr', 'Mo–Sa'][n - 1]})` : ' (jeden Tag)'}</option>)}</select></label>
        <small className="muted">Projekt-Bautempo ({paceOf(site).blocksPerSession} Blöcke je Bautag) stellst du im Reiter „Bauen“ ein; Bauleute können ein eigenes Tempo haben.</small>
      </div>
    </section>
    <ul className="materials-notes">{plan.notes.map(n => <li key={n}>{n}</li>)}</ul>
  </section>;
}

/** Schedule as bars over building days: one row per section, grouped by lane (builder). */
function Timeline({ plan }: { plan: ProgramPlan }) {
  const total = Math.max(1, plan.sessions);
  const lanes = [...plan.builders.map(b => ({ id: b.id, name: b.name })), ...(plan.sections.some(s => s.builderIds.length === 0) ? [{ id: UNASSIGNED, name: plan.builders.length ? 'Nicht zugewiesen' : 'Bau-Reihenfolge' }] : [])];
  const ticks = total <= 14 ? [...Array(total).keys()] : [...Array(Math.min(12, total)).keys()].map(i => Math.round(i * total / Math.min(12, total)));
  const cal = (i: number): string => plan.start ? deDate(plan.sections.flatMap(s => s.startDate && s.start === i ? [s.startDate] : [])[0] ?? null) || `Tag ${i + 1}` : `Tag ${i + 1}`;
  return <section className="site-block prog-timeline" aria-label="Zeitplan">
    <div className="site-head"><h3>Zeitplan <small>Balken = Bautage je Abschnitt · rot umrandet = kritischer Pfad · ◆ Meilenstein</small></h3></div>
    {plan.sessions === 0 ? <p className="muted">Alle Abschnitte sind abgehakt.</p> : <div className="prog-gantt" role="table" aria-label="Balkenplan">
      <div className="prog-axis" role="row"><span className="prog-lane-label" /><div className="prog-track">{ticks.map(i => <span key={i} className="prog-tick" style={{ left: `${i / total * 100}%` }}>{cal(i)}</span>)}</div></div>
      {lanes.map(lane => {
        const rows = plan.sections.filter(s => s.sessions > 0 && (lane.id === UNASSIGNED ? s.builderIds.length === 0 : s.builderIds.includes(lane.id)));
        if (!rows.length) return <div key={lane.id} className="prog-row" role="row"><span className="prog-lane-label">{lane.name}</span><div className="prog-track"><span className="muted prog-empty">keine offenen Abschnitte</span></div></div>;
        return rows.map((s, i) => <div key={`${lane.id}/${s.id}`} className="prog-row" role="row">
          <span className="prog-lane-label">{i === 0 ? lane.name : ''}</span>
          <div className="prog-track">
            <span className={`prog-bar${s.critical ? ' critical' : ''}${s.state === 'blocked' ? ' blocked' : ''}`} style={{ left: `${s.start / total * 100}%`, width: `${Math.max(1.5, s.sessions / total * 100)}%` }}
              title={`${s.name}: ${whenText(s)} · ${days(s.sessions)} · ${SECTION_STATE_LABEL[s.state]}${s.waitingFor.length ? ` · wartet auf ${s.waitingFor.length} Abschnitt(e)` : ''}`}>
              <span className="prog-bar-text">{s.name}</span></span>
            {plan.milestones.filter(m => m.status !== 'done' && m.end === s.end && m.sectionIds.includes(s.id) && m.sectionIds.every(id => plan.sections.find(x => x.id === id)!.end <= s.end)).slice(0, 1)
              .map(m => <span key={m.id} className={`prog-milestone ${m.status}`} style={{ left: `${m.end / total * 100}%` }} title={`Meilenstein ${m.name}: ${MILESTONE_STATUS_LABEL[m.status]}`}>◆</span>)}
          </div>
        </div>);
      })}
    </div>}
  </section>;
}

function Milestones({ plan, site, save }: { plan: ProgramPlan; site: SitePlan; save: Save }) {
  const program = programOf(site);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState(''), [due, setDue] = useState('');
  const [confirmPreset, setConfirmPreset] = useState(false);
  const preset = (p: ProgramPreset) => { save(suggestProgram(site, p), `Projektplan: ${PROGRAM_PRESET_LABEL[p]}`); setConfirmPreset(false); };
  return <section className="site-block prog-milestones" aria-label="Meilensteine">
    <div className="site-head"><h3>Meilensteine <small>Gruppen von Abschnitten mit Zieltermin</small></h3>
      <form className="site-add" onSubmit={e => { e.preventDefault(); if (name.trim()) { save(addMilestone(site, name, [], due || undefined), `Meilenstein „${name.trim()}“ angelegt`); setName(''); setDue(''); } }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Neuer Meilenstein, z. B. Rohbau fertig" aria-label="Name des neuen Meilensteins" maxLength={80} />
        <input type="date" value={due} onChange={e => setDue(e.target.value)} aria-label="Termin des neuen Meilensteins" />
        <button type="submit" disabled={!name.trim()}>+ Meilenstein</button>
      </form>
    </div>
    <div className="notice site-presets">Vorschlag aus den Bauabschnitten (ersetzt Meilensteine und Abhängigkeiten, Bauleute bleiben):
      {(Object.keys(PROGRAM_PRESET_LABEL) as ProgramPreset[]).map(p => <button key={p} onClick={() => (program.milestones.length || program.dependencies.length) && !confirmPreset ? setConfirmPreset(true) : preset(p)}>{PROGRAM_PRESET_LABEL[p]}</button>)}
      {confirmPreset && <span className="warn-text">Bestehende Meilensteine und Abhängigkeiten werden ersetzt (rückgängig möglich) – Vorschlag noch einmal anklicken. <button onClick={() => setConfirmPreset(false)}>Abbrechen</button></span>}
    </div>
    {!plan.milestones.length && <p className="muted">Noch keine Meilensteine.</p>}
    <ol className="prog-list">{plan.milestones.map((m, index) => {
      const def = program.milestones.find(d => d.id === m.id)!;
      return <li key={m.id} className={`prog-item status-${m.status}`}>
        <div className="prog-item-main">
          <span className="site-no">{m.status === 'done' ? '✓' : index + 1}</span>
          <span className="site-section-text"><strong>{m.name} <span className={`badge ms-${m.status}`}>{MILESTONE_STATUS_LABEL[m.status]}</span></strong>
            <small>{m.sectionIds.length ? m.sectionIds.map(id => site.sections.find(s => s.id === id)?.name ?? '?').join(', ') : 'keine Abschnitte'}{m.note && ` · ${m.note}`}</small>
            <small>{m.due ? `Termin ${deDate(m.due)}` : 'kein Termin'}{m.status !== 'done' && (m.endDate ? ` · voraussichtlich ${deDate(m.endDate)}` : m.end ? ` · voraussichtlich Bautag ${m.end}` : '')} · {m.done} / {m.steps} Schritte{m.itemsMissing ? ` · ${formatNumber(m.itemsMissing)} Bauitems fehlen` : ''}{m.gatherHours ? ` · ${m.gatherHours} h sammeln` : ''}</small></span>
          <span className="site-section-meta"><div className="site-bar" role="progressbar" aria-label={`Fortschritt ${m.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct(m.blocksDone, m.blocks)}><span style={{ width: `${pct(m.blocksDone, m.blocks)}%` }} /></div><small>{pct(m.blocksDone, m.blocks)} % der Blöcke</small></span>
        </div>
        <div className="site-section-tools">
          <button onClick={() => save(moveMilestone(site, m.id, -1), `„${m.name}“ nach oben`)} disabled={index === 0} aria-label={`${m.name} nach oben`}>↑</button>
          <button onClick={() => save(moveMilestone(site, m.id, 1), `„${m.name}“ nach unten`)} disabled={index === plan.milestones.length - 1} aria-label={`${m.name} nach unten`}>↓</button>
          <button onClick={() => setEditing(editing === m.id ? null : m.id)} aria-expanded={editing === m.id}>Bearbeiten</button>
          <button onClick={() => save(removeMilestone(site, m.id), `Meilenstein „${m.name}“ entfernt`)} aria-label={`${m.name} entfernen`}>✕</button>
        </div>
        {editing === m.id && <MilestoneEditor site={site} milestone={def} save={save} onClose={() => setEditing(null)} />}
      </li>;
    })}</ol>
  </section>;
}

function MilestoneEditor({ site, milestone, save, onClose }: { site: SitePlan; milestone: { id: string; name: string; note?: string; due?: string; sectionIds: readonly string[] }; save: Save; onClose(): void }) {
  const [name, setName] = useState(milestone.name), [note, setNote] = useState(milestone.note ?? ''), [due, setDue] = useState(milestone.due ?? '');
  const [ids, setIds] = useState<string[]>([...milestone.sectionIds]);
  return <form className="site-editor" aria-label={`Meilenstein ${milestone.name} bearbeiten`} onSubmit={e => { e.preventDefault(); save(updateMilestone(site, milestone.id, { name, note, due: due || null, sectionIds: ids }), `Meilenstein „${name.trim() || milestone.name}“ geändert`); onClose(); }}>
    <label>Name<input value={name} onChange={e => setName(e.target.value)} maxLength={80} required /></label>
    <label>Termin<input type="date" value={due} onChange={e => setDue(e.target.value)} /></label>
    <label>Notiz<input value={note} onChange={e => setNote(e.target.value)} maxLength={500} placeholder="z. B. vor dem Servertreffen" /></label>
    <fieldset><legend>Abschnitte</legend>
      {site.sections.map(s => <label key={s.id} className="raw-toggle"><input type="checkbox" checked={ids.includes(s.id)} onChange={e => setIds(e.target.checked ? [...ids, s.id] : ids.filter(i => i !== s.id))} /> {s.name}</label>)}
    </fieldset>
    <div className="button-row"><button type="submit" className="primary">Übernehmen</button><button type="button" onClick={onClose}>Abbrechen</button></div>
  </form>;
}

function Dependencies({ site, plan, suggestions, save }: { site: SitePlan; plan: ProgramPlan; suggestions: readonly DependencySuggestion[]; save: Save }) {
  const program = programOf(site), name = (id: string) => site.sections.find(s => s.id === id)?.name ?? id;
  const [before, setBefore] = useState(''), [after, setAfter] = useState('');
  const acceptAll = () => { let next = site; for (const s of suggestions) next = addDependency(next, s.before, s.after); save(next, `${suggestions.length} Abhängigkeiten übernommen`); };
  return <section className="site-block prog-deps" aria-label="Abhängigkeiten">
    <div className="site-head"><h3>Abhängigkeiten <small>„B erst nach A“ – ein Abschnitt beginnt erst, wenn der andere abgehakt ist</small></h3>
      <form className="site-add" onSubmit={e => { e.preventDefault(); if (before && after) { save(() => addDependency(site, before, after), `„${name(after)}“ erst nach „${name(before)}“`); setBefore(''); setAfter(''); } }}>
        <select value={after} onChange={e => setAfter(e.target.value)} aria-label="Abschnitt, der wartet"><option value="">Abschnitt …</option>{site.sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <span className="muted">erst nach</span>
        <select value={before} onChange={e => setBefore(e.target.value)} aria-label="Abschnitt, der vorher fertig sein muss"><option value="">Abschnitt …</option>{site.sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <button type="submit" disabled={!before || !after || before === after}>+ Abhängigkeit</button>
      </form>
    </div>
    {suggestions.length > 0 && <div className="notice prog-suggestions" role="status"><strong>Vorschläge aus Geometrie und Anschlüssen</strong>
      <ul>{suggestions.map(s => <li key={`${s.before}>${s.after}`}>{s.reason} <button onClick={() => save(addDependency(site, s.before, s.after), `„${name(s.after)}“ erst nach „${name(s.before)}“`)}>Übernehmen</button></li>)}</ul>
      {suggestions.length > 1 && <button onClick={acceptAll}>Alle {suggestions.length} übernehmen</button>}</div>}
    {!program.dependencies.length ? <p className="muted">Keine Abhängigkeiten – alle Abschnitte dürfen parallel gebaut werden, nur die Bau-Reihenfolge ordnet sie.</p>
      : <ul className="prog-dep-list">{program.dependencies.map(d => {
        const s = plan.sections.find(x => x.id === d.after), done = plan.sections.find(x => x.id === d.before)?.state === 'done';
        return <li key={`${d.before}>${d.after}`}><strong>{name(d.after)}</strong> erst nach <strong>{name(d.before)}</strong>{d.note && <small> · {d.note}</small>}
          <span className={`badge ${done ? 'done' : s?.state === 'blocked' ? 'open' : 'warn'}`}>{done ? 'erfüllt' : 'wartet'}</span>
          <button onClick={() => save(removeDependency(site, d.before, d.after), 'Abhängigkeit entfernt')} aria-label={`Abhängigkeit ${name(d.after)} nach ${name(d.before)} entfernen`}>✕</button></li>;
      })}</ul>}
  </section>;
}

function Builders({ plan, site, save, title }: { plan: ProgramPlan; site: SitePlan; save: Save; title: string }) {
  const program = programOf(site);
  const [name, setName] = useState(''), [pace, setPace] = useState('');
  const [copied, setCopied] = useState('');
  const toggle = (sectionId: string, builderId: string, on: boolean) => {
    const current = program.assignments[sectionId] ?? [];
    save(assignSection(site, sectionId, on ? [...current, builderId] : current.filter(b => b !== builderId)), `${site.sections.find(s => s.id === sectionId)?.name}: ${on ? 'zugewiesen' : 'Zuweisung entfernt'}`);
  };
  const sheet = async (b: BuilderLoad) => {
    const text = builderText(plan, site, b.id, title);
    try { await navigator.clipboard.writeText(text); setCopied(b.id); setTimeout(() => setCopied(''), 2000); } catch { download(`Bauzettel_${fileStem(b.name)}.txt`, text, 'text/plain'); }
  };
  return <section className="site-block prog-builders" aria-label="Bauleute">
    <div className="site-head"><h3>Bauleute <small>wer baut welchen Abschnitt · mehrere je Abschnitt teilen sich die Arbeit</small></h3>
      <form className="site-add" onSubmit={e => { e.preventDefault(); if (name.trim()) { save(addBuilder(site, name, pace ? Number(pace) : undefined), `„${name.trim()}“ als Bauleute aufgenommen`); setName(''); setPace(''); } }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name, z. B. Anna" aria-label="Name der neuen Bauleute" maxLength={60} />
        <input type="number" min={16} max={100000} value={pace} onChange={e => setPace(e.target.value)} placeholder={`${paceOf(site).blocksPerSession} Blöcke/Tag`} aria-label="Blöcke je Bautag der neuen Bauleute" className="prog-pace" />
        <button type="submit" disabled={!name.trim()}>+ Bauleute</button>
      </form>
    </div>
    {!program.builders.length ? <p className="muted">Noch niemand eingetragen – der Zeitplan rechnet mit einem Spieler und dem Projekt-Bautempo.</p> : <>
      <ul className="prog-builder-list">{plan.builders.map(b => <li key={b.id} className="prog-builder">
        <div className="prog-builder-head"><strong>{b.name}</strong>
          <label className="site-depth">Tempo <input type="number" className="site-stock" min={16} max={100000} defaultValue={b.blocksPerSession} key={`${b.id}:${b.blocksPerSession}`} aria-label={`Blöcke je Bautag von ${b.name}`}
            onBlur={e => { const n = Math.floor(Number(e.target.value)); if (n !== b.blocksPerSession) save(updateBuilder(site, b.id, { blocksPerSession: n >= 16 ? n : null }), `Bautempo von „${b.name}“`); }}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} /> Blöcke/Tag</label>
          <button onClick={() => void sheet(b)}>{copied === b.id ? 'Kopiert ✓' : 'Bauzettel kopieren'}</button>
          <button onClick={() => save(removeBuilder(site, b.id), `„${b.name}“ entfernt`)} aria-label={`${b.name} entfernen`}>✕</button></div>
        <small>{b.sectionIds.length} Abschnitt{b.sectionIds.length === 1 ? '' : 'e'} · {days(b.sessions)} · {formatNumber(b.blocksDone)} / {formatNumber(b.blocks)} Blöcke{b.nextId ? ` · als Nächstes „${site.sections.find(s => s.id === b.nextId)?.name}“` : ''}{b.gatherHours ? ` · ${b.gatherHours} h sammeln` : ''}{b.items.length ? ` · ${b.items.length} Items fehlen` : ''}</small>
      </li>)}</ul>
      <div className="table-wrap"><table className="materials-table prog-matrix" aria-label="Zuweisung">
        <thead><tr><th>Abschnitt</th>{plan.builders.map(b => <th key={b.id}>{b.name}</th>)}<th>Plan</th></tr></thead>
        <tbody>{plan.sections.map(s => <tr key={s.id} className={s.state === 'done' ? 'done' : ''}><td>{s.name}<small>{SECTION_STATE_LABEL[s.state]}{s.waitingFor.length ? ` · wartet auf ${s.waitingFor.map(id => site.sections.find(x => x.id === id)?.name).join(', ')}` : ''}</small></td>
          {plan.builders.map(b => <td key={b.id} className="num"><input type="checkbox" checked={s.builderIds.includes(b.id)} aria-label={`${s.name}: ${b.name}`} onChange={e => toggle(s.id, b.id, e.target.checked)} /></td>)}
          <td className="num">{whenText(s)}{s.critical && <small className="warn-text">kritisch</small>}</td></tr>)}</tbody>
      </table></div></>}
  </section>;
}

