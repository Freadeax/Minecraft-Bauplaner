import { useMemo, useState } from 'react';
import {
  activateBaseline, addAbsence, addBuilder, addDependency, addMilestone, assignSection, builderText, clearBaseline, removeAbsence, removeBaseline, renameBaseline, moveMilestone, MILESTONE_STATUS_LABEL, paceOf, planProgramWithMaterial, programIssues, programOf, setBaseline,
  PROGRAM_PRESET_LABEL, programText, removeBuilder, removeDependency, removeMilestone, SECTION_STATE_LABEL, setProgramSettings, siteOf, siteOperation,
  suggestDependencies, suggestProgram, updateBuilder, updateMilestone, UNASSIGNED,
  accountText, builderAccounts, setProgram, teamContextOf, teamIntoProgram, teamView,
} from '../../../../../packages/domain/src/index.js';
import type { AccountReport, BuilderAccount, Builder, BuilderLoad, DependencySuggestion, ProductionReport, ProgramPlan, ProgramPreset, ScheduledSection, SitePlan } from '../../../../../packages/domain/src/index.js';
import { download, errorText, formatNumber, localToday } from '../../app/ui';
import { isResolved } from './session';
import type { ProjectSession } from './session';
import { ProjectOrder } from './ProjectOrder';
import { useRoomConnection } from './team/roomClient';
import '../../styles/planning.css';

const pct = (a: number, b: number): number => b ? Math.round(a / b * 100) : 0;
const deDate = (iso: string | null | undefined): string => iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : '';
const days = (n: number): string => `${n} Bautag${n === 1 ? '' : 'e'}`;
const today = localToday;
const fileStem = (name: string): string => name.replace(/[^\p{L}\p{N}_-]+/gu, '_');
const slipText = (n: number | null | undefined): string => n === null || n === undefined ? '' : n === 0 ? 'wie im Basisplan' : n > 0 ? `${days(n)} später als im Basisplan` : `${days(-n)} früher als im Basisplan`;
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
  const scheduled = useMemo(() => overview ? planProgramWithMaterial(site, overview, paceOf(site), today()) : null, [site, overview]);
  const plan = scheduled?.plan ?? null, readiness = scheduled?.readiness ?? null;
  const suggestions = useMemo(() => guide ? suggestDependencies(site, project, guide) : [], [site, project, guide]);
  const issues = useMemo(() => programIssues(site), [site]);
  const room = useRoomConnection();
  const team = site.team;
  const view = useMemo(() => team ? teamView(team, teamContextOf(site)) : null, [team, site]);
  const accounts = useMemo(() => plan ? builderAccounts(plan, view, room.presence) : null, [plan, view, room.presence]);

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
        <small>{plan.sessions > 0 && plan.endDate ? `${days(plan.sessions)} ab ${deDate(plan.from)} · ${plan.sessionsPerWeek} Bautage je Woche` : plan.sessions > 0 ? 'Ohne Startdatum nur Bautage; Datum unter „Einstellungen“' : 'Alle Abschnitte abgehakt'} · {formatNumber(overview.totals.blocksDone)} von {formatNumber(overview.totals.blocks)} Blöcken</small></div>
      <div className="site-kpi"><span className="panel-kicker">NÄCHSTER MEILENSTEIN</span><strong className="site-current">{next ? next.name : plan.milestones.length ? '✓ Alle erreicht' : '–'}</strong>
        <small>{next ? `${MILESTONE_STATUS_LABEL[next.status]}${next.due ? ` · bis ${deDate(next.due)}` : ''}${next.endDate ? ` · voraussichtlich ${deDate(next.endDate)}` : next.end ? ` · Bautag ${next.end}` : ''}` : 'Meilensteine unten anlegen'}</small></div>
      <div className="site-kpi"><span className="panel-kicker">BAULEUTE</span><strong>{plan.builders.length || '–'}</strong>
        <small>{plan.builders.length ? plan.builders.map(b => `${b.name} ${days(b.sessions)}`).join(' · ') : 'Ein Spieler mit Projekt-Bautempo'}</small></div>
      <div className="site-kpi"><span className="panel-kicker">KRITISCHER PFAD</span><strong>{plan.criticalPath.length}</strong>
        <small>{plan.criticalPath.length ? `Abschnitte ohne Puffer: ${plan.criticalPath.map(id => name.get(id)).join(', ')}` : 'Nichts offen'}</small></div>
      {plan.baseline && <div className="site-kpi prog-slip-kpi"><span className="panel-kicker">BASISPLAN {plan.baseline.name ? `„${plan.baseline.name.toUpperCase()}“ ` : ''}VOM {deDate(plan.baseline.at)}</span>
        <strong className={plan.baseline.slip && plan.baseline.slip > 0 ? 'warn-text' : ''}>{plan.baseline.slip === null ? (plan.sessions === 0 ? '✓ Fertig' : '–') : plan.baseline.slip === 0 ? '± 0' : `${plan.baseline.slip > 0 ? '+' : '−'}${days(Math.abs(plan.baseline.slip))}`}</strong>
        <small>{plan.baseline.end ? `Ende geplant ${deDate(plan.baseline.end)}${plan.endDate ? `, jetzt ${deDate(plan.endDate)}` : ''}` : 'Basisplan ohne offenes Ende'}</small></div>}
      {readiness && <MaterialKpi readiness={readiness} plan={plan} projectId={project.id} />}
    </header>
    {message && <div className="notice warning" role="alert">{message}<button onClick={() => setMessage('')}>OK</button></div>}
    {issues.length > 0 && <div className="notice warning" role="status"><strong>Plan prüfen</strong><ul>{issues.map(i => <li key={i.message}>{i.message}</li>)}</ul></div>}

    <Timeline plan={plan} />
    <Milestones plan={plan} site={site} save={save} />
    <Dependencies site={site} plan={plan} suggestions={suggestions} save={save} />
    <ProjectOrder project={project} site={site} save={save} />
    <Builders plan={plan} site={site} save={save} title={title} accounts={accounts} />
    {accounts && (accounts.hasTeam || accounts.strangers.length > 0) && <TeamIntoPlanning site={site} view={view} report={accounts} save={save} projectId={project.id} undo={session.undo} />}
    <section className="site-block prog-settings" aria-label="Einstellungen">
      <div className="site-head"><h3>Einstellungen <small>Startdatum, Bautage je Woche, Material und Basisplan</small></h3>
        <button onClick={() => download(`Bauprogramm_${fileStem(title)}.txt`, programText(plan, site, title), 'text/plain')}>Bauprogramm als Text</button></div>
      <div className="prog-settings-row">
        <label>Erster Bautag<input type="date" value={program.start ?? ''} aria-label="Startdatum" onChange={e => save(setProgramSettings(site, { start: e.target.value || null }), e.target.value ? `Start ${deDate(e.target.value)}` : 'Startdatum entfernt')} /></label>
        <label>Bautage je Woche<select value={program.sessionsPerWeek ?? 7} aria-label="Bautage je Woche" onChange={e => save(setProgramSettings(site, { sessionsPerWeek: Number(e.target.value) }), `${e.target.value} Bautage je Woche`)}>
          {[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n}{n < 7 ? ` (${['Mo', 'Mo–Di', 'Mo–Mi', 'Mo–Do', 'Mo–Fr', 'Mo–Sa'][n - 1]})` : ' (jeden Tag)'}</option>)}</select></label>
        <small className="muted">Projekt-Bautempo ({paceOf(site).blocksPerSession} Blöcke je Bautag) stellst du im Reiter „Bauen“ ein; Bauleute können ein eigenes Tempo haben.</small>
      </div>
      <div className="prog-settings-row">
        <label className="raw-toggle prog-check"><input type="checkbox" checked={!!program.waitForMaterial} aria-label="Auf Material warten"
          onChange={e => save(setProgramSettings(site, { waitForMaterial: e.target.checked }), e.target.checked ? 'Planung wartet auf Material' : 'Planung ohne Material')} />
          Abschnitte erst beginnen, wenn ihr Material da ist</label>
        <small className="muted">Rechnet mit Farmen und Sammelzeit aus dem Reiter <a href={`#/projekt/${project.id}/produktion`}>Produktion</a>; ein Spieltag zählt als ein Bautag.</small>
      </div>
      <Baselines plan={plan} site={site} save={save} />
    </section>
    <ul className="materials-notes">{plan.notes.map(n => <li key={n}>{n}</li>)}</ul>
  </section>;
}

/** Schedule as bars over building days: one row per section, grouped by lane (builder). */
function Timeline({ plan }: { plan: ProgramPlan }) {
  const total = Math.max(1, plan.sessions, ...plan.sections.map(s => s.baseline?.end ?? 0));
  const lanes = [...plan.builders.map(b => ({ id: b.id, name: b.name })), ...(plan.sections.some(s => s.builderIds.length === 0) ? [{ id: UNASSIGNED, name: plan.builders.length ? 'Nicht zugewiesen' : 'Bau-Reihenfolge' }] : [])];
  const ticks = total <= 14 ? [...Array(total).keys()] : [...Array(Math.min(12, total)).keys()].map(i => Math.round(i * total / Math.min(12, total)));
  const cal = (i: number): string => plan.start ? deDate(plan.sections.flatMap(s => s.startDate && s.start === i ? [s.startDate] : [])[0] ?? null) || `Tag ${i + 1}` : `Tag ${i + 1}`;
  return <section className="site-block prog-timeline" aria-label="Zeitplan">
    <div className="site-head"><h3>Zeitplan <small>Balken = Bautage je Abschnitt · rot umrandet = kritischer Pfad · ◆ Meilenstein{plan.waitForMaterial ? ' · schraffiert = wartet auf Material' : ''}{plan.baseline ? ' · Linie = Basisplan' : ''}</small></h3></div>
    {plan.sessions === 0 ? <p className="muted">Alle Abschnitte sind abgehakt.</p> : <div className="prog-gantt" role="table" aria-label="Balkenplan">
      <div className="prog-axis" role="row"><span className="prog-lane-label" /><div className="prog-track">{ticks.map(i => <span key={i} className="prog-tick" style={{ left: `${i / total * 100}%` }}>{cal(i)}</span>)}</div></div>
      {lanes.map(lane => {
        const rows = plan.sections.filter(s => s.sessions > 0 && (lane.id === UNASSIGNED ? s.builderIds.length === 0 : s.builderIds.includes(lane.id)));
        if (!rows.length) return <div key={lane.id} className="prog-row" role="row"><span className="prog-lane-label">{lane.name}</span><div className="prog-track"><span className="muted prog-empty">keine offenen Abschnitte</span></div></div>;
        return rows.map((s, i) => <div key={`${lane.id}/${s.id}`} className="prog-row" role="row">
          <span className="prog-lane-label">{i === 0 ? lane.name : ''}</span>
          <div className="prog-track">
            {s.baseline && s.baseline.end > 0 && <span className="prog-baseline" style={{ left: `${Math.max(0, s.baseline.start) / total * 100}%`, width: `${Math.max(1, s.baseline.end - Math.max(0, s.baseline.start)) / total * 100}%` }} title={`Basisplan: ${s.name}${s.slip !== undefined ? ` · ${slipText(s.slip)}` : ''}`} />}
            {!!s.materialWait && <span className="prog-wait" style={{ left: `${(s.start - s.materialWait) / total * 100}%`, width: `${s.materialWait / total * 100}%` }} title={`${s.name} wartet ${days(s.materialWait)} auf Material`} aria-label={`${s.name} wartet auf Material`} />}
            <span className={`prog-bar${s.critical ? ' critical' : ''}${s.state === 'blocked' ? ' blocked' : ''}`} style={{ left: `${s.start / total * 100}%`, width: `${Math.max(1.5, s.sessions / total * 100)}%` }}
              title={`${s.name}: ${whenText(s)} · ${days(s.sessions)} · ${SECTION_STATE_LABEL[s.state]}${s.waitingFor.length ? ` · wartet auf ${s.waitingFor.length} Abschnitt(e)` : ''}${s.materialWait ? ` · ${days(s.materialWait)} auf Material warten` : ''}${s.absent ? ` · ${days(s.absent)} Abwesenheit` : ''}${s.slip !== undefined ? ` · ${slipText(s.slip)}` : ''}`}>
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
            <small>{m.due ? `Termin ${deDate(m.due)}` : 'kein Termin'}{m.status !== 'done' && (m.endDate ? ` · voraussichtlich ${deDate(m.endDate)}` : m.end ? ` · voraussichtlich Bautag ${m.end}` : '')} · {m.done} / {m.steps} Schritte{m.itemsMissing ? ` · ${formatNumber(m.itemsMissing)} Bauitems fehlen` : ''}{m.gatherHours ? ` · ${m.gatherHours} h sammeln` : ''}</small>
            {m.baselineEnd && m.status !== 'done' && <small className={m.slip && m.slip > 0 ? 'warn-text' : ''}>Basisplan {deDate(m.baselineEnd)}{m.slip !== undefined ? ` · ${slipText(m.slip)}` : ''}</small>}</span>
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

function Builders({ plan, site, save, title, accounts }: { plan: ProgramPlan; site: SitePlan; save: Save; title: string; accounts: AccountReport | null }) {
  const program = programOf(site);
  const [name, setName] = useState(''), [pace, setPace] = useState('');
  const [copied, setCopied] = useState('');
  const toggle = (sectionId: string, builderId: string, on: boolean) => {
    const current = program.assignments[sectionId] ?? [];
    save(assignSection(site, sectionId, on ? [...current, builderId] : current.filter(b => b !== builderId)), `${site.sections.find(s => s.id === sectionId)?.name}: ${on ? 'zugewiesen' : 'Zuweisung entfernt'}`);
  };
  const sheet = async (b: BuilderLoad) => {
    const account = accounts?.accounts.find(a => a.id === b.id);
    const text = [builderText(plan, site, b.id, title), ...(account && accounts?.hasTeam ? accountText(account) : [])].join('\n');
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
      <ul className="prog-builder-list">{plan.builders.map(b => { const account = accounts?.accounts.find(a => a.id === b.id); return <li key={b.id} className="prog-builder" data-builder={b.id}>
        <div className="prog-builder-head"><strong>{b.name}</strong>{account && <LiveBadge account={account} site={site} />}
          <label className="site-depth">Tempo <input type="number" className="site-stock" min={16} max={100000} defaultValue={b.blocksPerSession} key={`${b.id}:${b.blocksPerSession}`} aria-label={`Blöcke je Bautag von ${b.name}`}
            onBlur={e => { const n = Math.floor(Number(e.target.value)); if (n !== b.blocksPerSession) save(updateBuilder(site, b.id, { blocksPerSession: n >= 16 ? n : null }), `Bautempo von „${b.name}“`); }}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} /> Blöcke/Tag</label>
          <label className="site-depth">dabei an <select value={program.builders.find(x => x.id === b.id)?.share ?? 100} aria-label={`Anteil der Bautage von ${b.name}`}
            onChange={e => save(updateBuilder(site, b.id, { share: Number(e.target.value) }), `„${b.name}“ an ${e.target.value} % der Bautage`)}>
            {[100, 75, 50, 25, 10].map(n => <option key={n} value={n}>{n} %</option>)}</select> der Bautage</label>
          <button onClick={() => void sheet(b)}>{copied === b.id ? 'Kopiert ✓' : 'Bauzettel kopieren'}</button>
          <button onClick={() => save(removeBuilder(site, b.id), `„${b.name}“ entfernt`)} aria-label={`${b.name} entfernen`}>✕</button></div>
        <Absences builder={program.builders.find(x => x.id === b.id)!} site={site} save={save} hasStart={!!program.start} />
        <small>{b.sectionIds.length} Abschnitt{b.sectionIds.length === 1 ? '' : 'e'} · {days(b.sessions)} · {formatNumber(b.blocksDone)} / {formatNumber(b.blocks)} Blöcke{b.nextId ? ` · als Nächstes „${site.sections.find(s => s.id === b.nextId)?.name}“` : ''}{b.gatherHours ? ` · ${b.gatherHours} h sammeln` : ''}{b.items.length ? ` · ${b.items.length} Items fehlen` : ''}</small>
        {account && accounts?.hasTeam && <AccountDetails account={account} />}
      </li>; })}</ul>
      <div className="table-wrap"><table className="materials-table prog-matrix" aria-label="Zuweisung">
        <thead><tr><th>Abschnitt</th>{plan.builders.map(b => <th key={b.id}>{b.name}</th>)}<th>Plan</th></tr></thead>
        <tbody>{plan.sections.map(s => <tr key={s.id} className={s.state === 'done' ? 'done' : ''}><td>{s.name}<small>{SECTION_STATE_LABEL[s.state]}{s.waitingFor.length ? ` · wartet auf ${s.waitingFor.map(id => site.sections.find(x => x.id === id)?.name).join(', ')}` : ''}</small></td>
          {plan.builders.map(b => <td key={b.id} className="num"><input type="checkbox" checked={s.builderIds.includes(b.id)} aria-label={`${s.name}: ${b.name}`} onChange={e => toggle(s.id, b.id, e.target.checked)} /></td>)}
          <td className="num">{whenText(s)}{s.critical && <small className="warn-text">kritisch</small>}{s.absent ? <small>davon {days(s.absent)} abwesend</small> : null}</td></tr>)}</tbody>
      </table></div></>}
  </section>;
}

const short = (id: string): string => id.replace(/^minecraft:/, '');

/** PROJ-05: live in the Team-Raum (game before planer) or away according to the team. */
function LiveBadge({ account, site }: { account: BuilderAccount; site: SitePlan }) {
  if (account.live) {
    const section = account.live.section ? site.sections.find(s => s.id === account.live!.section)?.name : undefined;
    return <span className={`badge ${account.live.where === 'spiel' ? 'done' : 'open'}`} data-live={account.live.where}
      title="Live im Team-Raum">● {account.live.where === 'spiel' ? `im Spiel${account.live.player ? ` als ${account.live.player}` : ''}` : 'im Planer'}{section ? ` · ${section}` : ''}</span>;
  }
  if (account.away) return <span className="badge warn" title={account.away.note}>abwesend{account.away.until ? ` bis ${deDate(account.away.until)}` : ''}</span>;
  return null;
}

/**
 * PROJ-05: Bauleute-Konto. What this builder still needs for the assigned sections, what they promised
 * to gather, what they brought into and took out of the team stores. Derived from the team log only.
 */
function AccountDetails({ account }: { account: BuilderAccount }) {
  const t = account.totals;
  if (!account.lines.length) return <small className="prog-account-empty">Konto: nichts offen, keine Buchungen.</small>;
  return <details className="prog-account" data-account={account.id}>
    <summary>Konto · {t.open ? <span className="warn-text">{formatNumber(t.open)} ohne Zusage</span> : t.missing ? 'alles zugesagt' : 'nichts offen'}
      {' · '}zugesagt {formatNumber(t.claimed)} · eingebracht {formatNumber(t.brought)} · entnommen {formatNumber(t.taken)}
      {' · '}Saldo <strong className={account.balance < 0 ? 'warn-text' : ''}>{account.balance > 0 ? '+' : ''}{formatNumber(account.balance)}</strong>
      {account.placed ? ` · ${formatNumber(account.placed)} Blöcke gesetzt` : ''}</summary>
    <div className="table-wrap"><table className="materials-table prog-account-table" aria-label={`Konto von ${account.name}`}>
      <thead><tr><th>Item</th><th className="num">fehlt</th><th className="num">zugesagt</th><th className="num">andere</th><th className="num">ohne Zusage</th><th className="num">eingebracht</th><th className="num">entnommen</th></tr></thead>
      <tbody>{account.lines.map(l => <tr key={l.itemId} className={l.open ? 'warn' : ''}><td>{short(l.itemId)}</td>
        <td className="num">{l.missing ? formatNumber(l.missing) : '–'}</td><td className="num">{l.claimed ? formatNumber(l.claimed) : '–'}</td>
        <td className="num">{l.claimedByOthers ? formatNumber(l.claimedByOthers) : '–'}</td><td className="num">{l.open ? <strong className="warn-text">{formatNumber(l.open)}</strong> : '–'}</td>
        <td className="num">{l.brought ? formatNumber(l.brought) : '–'}</td><td className="num">{l.taken ? formatNumber(l.taken) : '–'}</td></tr>)}</tbody>
    </table></div>
    <small className="muted">„Fehlt“ zählt die offenen Abschnitte dieser Bauleute nach dem Lager der Baustelle; Zusagen, Einbringen und Entnahmen kommen aus dem Teamprotokoll (Sammelzusagen, Beiträge, Lagerkisten).</small>
  </details>;
}

/**
 * PROJ-05: Bauleute aus dem Spiel. Team members (also those who joined from the game) that are not in
 * the planning yet, live players, and items nobody promised. One click takes the team into the plan.
 */
function TeamIntoPlanning({ site, view, report, save, projectId, undo }: { site: SitePlan; view: ReturnType<typeof teamView> | null; report: AccountReport; save: Save; projectId: string; undo(): void }) {
  const program = programOf(site);
  const [taken, setTaken] = useState('');
  const sync = view ? teamIntoProgram(program, view, today()) : null;
  const changes = sync ? sync.added + sync.linked + sync.assigned + sync.absences : 0;
  const take = () => {
    if (!sync) return;
    save(setProgram(site, { ...program, builders: sync.builders, assignments: sync.assignments }),
      `Team übernommen: ${sync.added} Bauleute neu, ${sync.linked} Minecraft-Namen, ${sync.assigned} Zuweisungen${sync.absences ? `, ${sync.absences} Abwesenheiten` : ''}`);
    setTaken(`${sync.added} Bauleute neu, ${sync.linked} Minecraft-Namen ergänzt, ${sync.assigned} Zuweisungen geändert${sync.absences ? `, ${sync.absences} Abwesenheiten` : ''}`);
  };
  const teamHref = `#/projekt/${projectId}/team`;
  return <section className="site-block prog-team" aria-label="Bauleute aus dem Team">
    <div className="site-head"><h3>Bauleute aus dem Spiel <small>Mitspieler, Zusagen und Lager aus dem Team</small></h3>
      {sync && <button onClick={take} disabled={!changes} className={changes ? 'primary' : ''}>{changes ? `Team übernehmen (${changes})` : 'Planung entspricht dem Team'}</button>}</div>
    {taken && <p className="notice" role="status">Aus dem Team übernommen: {taken}. <button type="button" className="secondary" onClick={() => { undo(); setTaken(''); }}>Rückgängig</button></p>}
    {report.candidates.length > 0 && <div className="notice" role="status"><strong>Noch nicht in der Planung</strong>
      <ul className="prog-candidates">{report.candidates.map(c => <li key={c.id}>{c.name}{c.player ? ` (${c.player})` : ''}{c.live ? <span className="badge done">● live</span> : null}{c.sections ? <small> · {c.sections} Abschnitt{c.sections === 1 ? '' : 'e'} im Team</small> : null}</li>)}</ul>
      <small>„Team übernehmen“ legt sie als Bauleute an, ergänzt Minecraft-Namen, übernimmt die Abschnitte aus dem Team und „abwesend bis“.</small></div>}
    {report.strangers.length > 0 && <p className="muted" role="status">Im Spiel, aber nicht im Team: {report.strangers.map(s => s.player ?? s.member).join(', ')}. Sie erscheinen hier, sobald sie über die <a href={teamHref}>Einladung im Reiter Team</a> beitreten.</p>}
    {report.unclaimed.length > 0 ? <div className="prog-unclaimed"><strong>Noch ohne Sammelzusage</strong>
      <ul>{report.unclaimed.slice(0, 12).map(u => <li key={u.itemId}>{short(u.itemId)}: {formatNumber(u.open)} <small>für {u.builders.map(id => report.accounts.find(a => a.id === id)?.name ?? id).join(', ')}</small></li>)}</ul>
      {report.unclaimed.length > 12 && <small>und {report.unclaimed.length - 12} weitere Sorten.</small>}
      <small className="muted"> Zusagen gibt man im Reiter <a href={teamHref}>Team</a> unter „Beiträge und Sammeln“ ab.</small></div>
      : report.hasTeam && report.accounts.some(a => a.totals.missing) ? <p className="muted">Für alle fehlenden Items gibt es eine Sammelzusage.</p> : null}
  </section>;
}

/**
 * Basispläne (PROJ-02/PROJ-03): the active baseline and the earlier ones. A new baseline keeps the old
 * one in the history (up to eight), so slip can be read against the first plan and against later ones.
 */
function Baselines({ plan, site, save }: { plan: ProgramPlan; site: SitePlan; save: Save }) {
  const program = programOf(site);
  const [label, setLabel] = useState('');
  const take = () => { save(() => setBaseline(site, plan, today(), label), program.baseline ? 'Neuer Basisplan festgehalten' : 'Basisplan festgehalten'); setLabel(''); };
  const slip = (n: number | null) => n === null ? '–' : n === 0 ? '± 0' : `${n > 0 ? '+' : '−'}${days(Math.abs(n))}`;
  return <div className="prog-baselines" role="group" aria-label="Basispläne">
    <div className="prog-settings-row">
      {program.baseline && <span>Basisplan {program.baseline.name ? <strong>„{program.baseline.name}“ </strong> : ''}vom <strong>{deDate(program.baseline.at)}</strong>{program.baseline.end ? ` · Ende ${deDate(program.baseline.end)}` : ''}</span>}
      <input value={label} onChange={e => setLabel(e.target.value)} maxLength={60} placeholder="Name, z. B. Vor den Ferien" aria-label="Name des neuen Basisplans" />
      <button onClick={take} disabled={!program.start || plan.sessions === 0}>{program.baseline ? 'Neuen Basisplan festhalten' : 'Basisplan festhalten'}</button>
      {program.baseline && <button onClick={() => { const n = window.prompt('Name des Basisplans', program.baseline?.name ?? ''); if (n !== null) save(renameBaseline(site, -1, n), 'Basisplan umbenannt'); }}>Umbenennen</button>}
      {program.baseline && <button onClick={() => save(clearBaseline(site), 'Basisplan verworfen')}>Basisplan verwerfen</button>}
      <small className="muted">{program.start ? 'Hält die heutigen Termine fest; der Plan zeigt dann, wie weit jeder Abschnitt und Meilenstein davon abweicht. Ein neuer Basisplan behält den alten zum Vergleich.' : 'Ein Basisplan braucht ein Startdatum.'}</small>
    </div>
    {plan.baselines.length > 0 && <div className="table-wrap"><table className="materials-table prog-baseline-table" aria-label="Frühere Basispläne">
      <thead><tr><th>Früherer Basisplan</th><th>Ende damals</th><th>Heute gegenüber damals</th><th /></tr></thead>
      <tbody>{plan.baselines.map((b, i) => <tr key={`${b.at}-${i}`}>
        <td>{b.name ? `„${b.name}“ · ` : ''}{deDate(b.at)}<small>{b.sections} Abschnitte</small></td>
        <td>{b.end ? deDate(b.end) : 'alles fertig'}</td>
        <td className={b.slip && b.slip > 0 ? 'warn-text' : ''}>{slip(b.slip)}</td>
        <td><button onClick={() => save(() => activateBaseline(site, i), 'Früheren Basisplan aktiviert')}>Vergleichen</button>
          <button onClick={() => save(removeBaseline(site, i), 'Früheren Basisplan entfernt')} aria-label={`Basisplan vom ${deDate(b.at)} entfernen`}>✕</button></td></tr>)}</tbody>
    </table></div>}
  </div>;
}

/** Abwesenheiten (PROJ-03): periods a builder does not build; the schedule moves their sections. */
function Absences({ builder, site, save, hasStart }: { builder: Builder; site: SitePlan; save: Save; hasStart: boolean }) {
  const [from, setFrom] = useState(''), [to, setTo] = useState(''), [note, setNote] = useState('');
  const list = builder.absences ?? [];
  return <div className="prog-absences" role="group" aria-label={`Abwesenheiten von ${builder.name}`}>
    {list.length > 0 && <ul>{list.map((a, i) => <li key={`${a.from}-${i}`}><span>abwesend {a.from === a.to ? deDate(a.from) : `${deDate(a.from)} – ${deDate(a.to)}`}{a.note ? ` · ${a.note}` : ''}</span>
      <button onClick={() => save(removeAbsence(site, builder.id, i), `Abwesenheit von „${builder.name}“ entfernt`)} aria-label={`Abwesenheit ${deDate(a.from)} von ${builder.name} entfernen`}>✕</button></li>)}</ul>}
    <form className="site-add" onSubmit={e => { e.preventDefault(); if (from) { save(() => addAbsence(site, builder.id, from, to || from, note), `„${builder.name}“ abwesend ab ${deDate(from)}`); setFrom(''); setTo(''); setNote(''); } }}>
      <input type="date" value={from} onChange={e => setFrom(e.target.value)} aria-label={`Abwesend von (${builder.name})`} />
      <input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} aria-label={`Abwesend bis (${builder.name})`} />
      <input value={note} onChange={e => setNote(e.target.value)} maxLength={80} placeholder="Grund (optional)" aria-label={`Grund der Abwesenheit von ${builder.name}`} />
      <button type="submit" disabled={!from}>+ Abwesend</button>
    </form>
    {list.length > 0 && !hasStart && <small className="muted">Abwesenheiten wirken erst mit einem Startdatum.</small>}
  </div>;
}

/** Material readiness from Produktion when the plan waits for it (PROJ-02). */
function MaterialKpi({ readiness, plan, projectId }: { readiness: ProductionReport; plan: ProgramPlan; projectId: string }) {
  const waiting = plan.sections.filter(s => (s.materialWait ?? 0) > 0), t = readiness.totals;
  return <div className="site-kpi prog-material-kpi"><span className="panel-kicker">MATERIAL · AUS PRODUKTION</span>
    <strong>{t.readyDays === null ? 'offen' : t.readyDays === 0 ? '✓ beisammen' : `in ${formatNumber(t.readyDays)} Spieltagen`}</strong>
    <small>{waiting.length ? `${waiting.length} Abschnitt${waiting.length === 1 ? ' wartet' : 'e warten'} zusammen ${days(waiting.reduce((n, s) => n + (s.materialWait ?? 0), 0))}` : 'Kein Abschnitt wartet auf Material'}
      {plan.materialUnknown.length ? ` · ${plan.materialUnknown.length} ohne Richtwert` : ''} · <a href={`#/projekt/${projectId}/produktion`}>Farmen & Engpässe</a></small></div>;
}
