import { useMemo, useState } from 'react';
import {
  appendEvents, authorize, buildGuide, canTeam, laterThan, newId, packingText, paceOf, releaseChanges, resolveRevision, rightsMatrix, SECTION_TEAM_STATUS_LABEL, sectionWork,
  splitSection, SPLIT_MODE_LABEL, suggestTeamAssignment, TEAM_ROLE_LABEL, TEAM_ROLES, teamEvent, teamIssues, teamMaterials, teamProgress, teamSchedule,
} from '../../../../../../packages/domain/src/index.js';
import type {
  AssignmentProposal, SectionChange, SectionWork, SitePlan, SplitMode, TeamContext, TeamEventBody, TeamIssue, TeamRole, TeamState, TeamView,
} from '../../../../../../packages/domain/src/index.js';
import { useApp } from '../../../app/context';
import { errorText, formatNumber, localToday } from '../../../app/ui';
import type { ProjectSession } from '../session';
import '../../../styles/teamplan.css';

/**
 * Teamplanung (COOP-06, docs/architecture/team/TEAMBAU.md §18): planning a big build with several
 * players on top of the team log. Areas: Planung (work packages, assignment, schedule, material),
 * Fortschritt (board, members, hints, plan changes since the release) and Rechte & Übergabe.
 * Every change is a team event or a site edit through the undoable `site.set`.
 */

export type TeamArea = 'bauen' | 'planung' | 'fortschritt' | 'rechte';
export const TEAM_AREAS: readonly (readonly [TeamArea, string])[] = [['bauen', 'Bauen'], ['planung', 'Planung'], ['fortschritt', 'Fortschritt'], ['rechte', 'Rechte & Übergabe']];

type Member = TeamView['members'][number];
type SectionState = TeamView['sections'][number];

export interface TeamPlanProps {
  readonly session: ProjectSession;
  readonly site: SitePlan;
  readonly team: TeamState;
  readonly view: TeamView;
  readonly ctx: TeamContext;
  readonly me: Member | null;
  readonly role: TeamRole;
  saveTeam(t: TeamState, label: string): boolean;
  saveSite(next: SitePlan, label: string): boolean;
  setMessage(m: string): void;
}

const short = (id: string) => id.replace(/^minecraft:/, '');
const days = (n: number) => `${formatNumber(Math.round(n * 10) / 10)} Bautag${Math.round(n * 10) === 10 ? '' : 'e'}`;
const pct = (a: number, b: number) => b ? Math.round(a / b * 100) : 0;
const dateDe = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
// Calendar day for schedules and away checks is the local one; progress ages compare instants.
const today = localToday;
const now = () => new Date().toISOString();

async function copy(text: string): Promise<boolean> { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } }

/** Writes several events of `me` in one undoable step; stops at the first that is not allowed. */
function useActMany(p: TeamPlanProps) {
  return (bodies: readonly TeamEventBody[], label: string): boolean => {
    if (!p.me) { p.setMessage('Bitte zuerst oben wählen, wer du bist.'); return false; }
    let t = p.team;
    for (const body of bodies) {
      const ok = authorize(t, p.ctx, p.me.id, body);
      if (!ok.ok) { p.setMessage(ok.reason); return false; }
      t = appendEvents(t, [teamEvent(p.me.id, body, laterThan(t))]);
    }
    return p.saveTeam(t, label);
  };
}

export function TeamAreaNav({ area, onArea, counts }: { area: TeamArea; onArea(a: TeamArea): void; counts?: Partial<Record<TeamArea, number>> }) {
  return <nav className="team-areas" aria-label="Teambereiche">
    {TEAM_AREAS.map(([id, label]) => <button key={id} aria-current={area === id ? 'page' : undefined} className={area === id ? 'active' : undefined} onClick={() => onArea(id)}>
      {label}{counts?.[id] ? <span className="team-badge">{counts[id]}</span> : null}</button>)}
  </nav>;
}

// ---------------------------------------------------------------- Planung

export function TeamPlanning(p: TeamPlanProps) {
  const { session, site, view } = p;
  const computation = session.computation;
  const work = useMemo(() => computation ? sectionWork(site, computation.guide, computation.site.progress) : [], [site, computation]);
  const [members, setMembers] = useState<string[] | null>(null);
  const proposal = useMemo(() => suggestTeamAssignment({ view, work, today: today(), ...(members && { members }) }), [view, work, members]);
  if (!computation) return <div className="team-block"><p className="muted">Die Bauanleitung wird noch berechnet …</p></div>;
  if (!site.sections.length) return <div className="team-block"><h3>Planung</h3><p className="muted">Noch keine Bauabschnitte. Im Reiter <a href={`#/projekt/${session.project.id}/baustelle`}>Baustelle</a> anlegen, dann hier in Arbeitspakete teilen und verteilen.</p></div>;
  return <>
    <WorkPackages {...p} work={work} />
    <Assignment {...p} work={work} proposal={proposal} members={members} setMembers={setMembers} />
    <Schedule {...p} work={work} proposal={proposal} />
    <Material {...p} proposal={proposal} />
  </>;
}

function WorkPackages(p: TeamPlanProps & { work: readonly SectionWork[] }) {
  const { site, view, session, work } = p;
  const [sectionId, setSectionId] = useState('');
  const [parts, setParts] = useState(3);
  const [mode, setMode] = useState<SplitMode>('auto');
  const leitung = canTeam(p.role, 'plan.release');
  const max = Math.max(1, ...work.map(w => w.work));
  const names = useMemo(() => new Map(session.project.instances.map(i => [i.id, i.name])), [session.project.instances]);
  const chosen = sectionId || [...work].sort((a, b) => b.openWork - a.openWork)[0]?.id || '';
  const state = view.sections.find(s => s.sectionId === chosen);
  const preview = useMemo(() => {
    if (!chosen || !session.computation) return null;
    try { return { ok: splitSection(site, session.computation.guide, { sectionId: chosen, parts, mode, instanceNames: names, makeId: () => newId('sec') }) }; }
    catch (e) { return { error: errorText(e) }; }
  }, [chosen, parts, mode, site, session.computation, names]);
  const blocked = state && (state.status === 'gemeldet' || state.status === 'bestaetigt');
  const apply = () => {
    if (!preview || !('ok' in preview) || !preview.ok) return;
    const name = site.sections.find(s => s.id === chosen)?.name ?? 'Abschnitt';
    if (p.saveSite(preview.ok.site, `„${name}“ in ${preview.ok.parts.length} Arbeitspakete geteilt`))
      p.setMessage(`„${name}“ ist jetzt ${preview.ok.parts.length} Arbeitspakete. ${!view.release ? '' : (p.team as { live?: unknown }).live ? 'Gib den Plan danach neu frei („Aktuellen Plan freigeben“): Erst mit dem neuen Planstand kennen die anderen die Pakete, er kommt über den Team-Raum zu ihnen.' : 'Danach den Plan neu freigeben und das Teampaket mit Plan schicken, damit alle dieselben Pakete sehen.'}`);
  };
  return <div role="region" className="team-block" aria-label="Arbeitspakete">
    <div className="team-block-head"><h3>Arbeitspakete <small>große Abschnitte so teilen, dass mehrere gleichzeitig bauen</small></h3></div>
    <ol className="team-work">{work.map(w => {
      const s = view.sections.find(x => x.sectionId === w.id);
      return <li key={w.id} className={w.id === chosen ? 'chosen' : undefined}>
        <button className="link-button" onClick={() => setSectionId(w.id)} aria-pressed={w.id === chosen}>{w.name}</button>
        <span className="team-bar wide" title={`${formatNumber(w.work)} Blöcke`}><span style={{ width: `${pct(w.work, max)}%` }} /></span>
        <small>{formatNumber(w.work)} Blöcke · {w.steps} Schritte{w.openWork < w.work ? ` · ${pct(w.work - w.openWork, w.work)} % abgehakt` : ''}</small>
        <span className={`team-status st-${s?.status ?? 'frei'}`}>{SECTION_TEAM_STATUS_LABEL[s?.status ?? 'frei']}</span>
      </li>;
    })}</ol>
    {chosen && <div className="team-split">
      <div className="team-inline">
        <label>Teilen in <input type="number" min={2} max={16} value={parts} aria-label="Anzahl Arbeitspakete" onChange={e => setParts(Math.max(2, Math.min(16, Number(e.target.value) || 2)))} /> Pakete</label>
        <select aria-label="Teilungsart" value={mode} onChange={e => setMode(e.target.value as SplitMode)}>{(['auto', 'layers', 'instances'] as const).map(m => <option key={m} value={m}>{SPLIT_MODE_LABEL[m]}</option>)}</select>
      </div>
      {preview && 'error' in preview && <p className="muted">{preview.error}</p>}
      {preview && 'ok' in preview && preview.ok && <>
        <ul className="team-list">{preview.ok.parts.map(part => <li key={part.id}><strong>{part.name}</strong><small>{part.range}</small><span className="team-actions"><small>{formatNumber(part.work)} Blöcke · {part.steps} Schritte</small></span></li>)}</ul>
        <small className="muted">{preview.ok.mode === 'layers' ? 'Schichtpakete bauen aufeinander auf: Paket 2 beginnt, wenn darunter genug steht.' : 'Bauteilpakete sind unabhängig und können gleichzeitig gebaut werden.'}
          {' '}Größtes Paket {Math.round(preview.ok.balance * 100)} % eines gleichen Anteils. Das erste Paket behält Inhaber, Verlauf und Abschnittsstände.</small>
        <div className="team-buttons">
          <button disabled={!leitung || !!blocked} onClick={apply}>In {preview.ok.parts.length} Pakete teilen</button>
          {!leitung && <small className="muted">Teilen ändert den Plan – das macht die Bauleitung.</small>}
          {blocked && <small className="muted">Gemeldete oder bestätigte Abschnitte werden nicht mehr geteilt.</small>}
        </div>
      </>}
    </div>}
  </div>;
}

function Assignment(p: TeamPlanProps & { work: readonly SectionWork[]; proposal: readonly AssignmentProposal[]; members: string[] | null; setMembers(m: string[] | null): void }) {
  const { view, proposal, work } = p;
  const actMany = useActMany(p);
  const [skip, setSkip] = useState<ReadonlySet<string>>(new Set());
  const builders = (view.members as readonly Member[]).filter(m => canTeam(m.role, 'section.claim'));
  const chosen = p.members ?? builders.map(m => m.id);
  const name = (id: string) => view.members.find(m => m.id === id)?.name ?? id;
  const sname = (id: string) => work.find(w => w.id === id)?.name ?? id;
  const rows = proposal.filter(r => !skip.has(r.sectionId));
  const meister = canTeam(p.role, 'section.assign');
  return <div role="region" className="team-block" aria-label="Zuteilung">
    <div className="team-block-head"><h3>Zuteilung <small>Vorschlag für freie Abschnitte nach offener Arbeit</small></h3></div>
    <div className="team-chips" role="group" aria-label="Wer baut mit">{builders.map(m => {
      const on = chosen.includes(m.id);
      return <label key={m.id} className={`team-chip-toggle${on ? ' on' : ''}`}><input type="checkbox" checked={on}
        onChange={() => p.setMembers(on ? chosen.filter(x => x !== m.id) : [...chosen, m.id])} />{m.name}{m.away ? ' (abwesend)' : ''}</label>;
    })}</div>
    {proposal.length ? <table className="team-table"><thead><tr><th /><th>Abschnitt</th><th>an</th><th>warum</th></tr></thead><tbody>
      {proposal.map(r => <tr key={r.sectionId}><td><input type="checkbox" aria-label={`${sname(r.sectionId)} übernehmen`} checked={!skip.has(r.sectionId)}
        onChange={() => { const n = new Set(skip); if (n.has(r.sectionId)) n.delete(r.sectionId); else n.add(r.sectionId); setSkip(n); }} /></td>
        <td>{sname(r.sectionId)}</td><td><strong>{name(r.member)}</strong></td><td className="muted">{r.reason}</td></tr>)}
    </tbody></table> : <p className="muted">Keine freien Abschnitte mit offener Arbeit – oder niemand ausgewählt, der bauen darf und anwesend ist.</p>}
    {proposal.length > 0 && <div className="team-buttons">
      <button disabled={!meister || !rows.length} onClick={() => { if (actMany(rows.map(r => ({ kind: 'section.assign', section: r.sectionId, member: r.member })), `${rows.length} Abschnitte zugewiesen`)) setSkip(new Set()); }}>
        {rows.length} Zuweisung{rows.length === 1 ? '' : 'en'} übernehmen</button>
      {!meister && <small className="muted">Zuweisen dürfen Baumeister und Bauleitung; du kannst freie Abschnitte unter „Bauen“ selbst übernehmen.</small>}
    </div>}
  </div>;
}

function Schedule(p: TeamPlanProps & { work: readonly SectionWork[]; proposal: readonly AssignmentProposal[] }) {
  const { site, view, work, proposal } = p;
  const [perWeek, setPerWeek] = useState(3);
  const [withProposal, setWithProposal] = useState(true);
  const pace = paceOf(site);
  const plan = useMemo(() => teamSchedule({ view, work, pace, today: today(), sessionsPerWeek: perWeek, ...(withProposal && { proposal }) }), [view, work, pace, perWeek, withProposal, proposal]);
  const span = Math.max(plan.makespan, 0.01);
  const critical = new Set(plan.critical);
  const sname = (id: string) => work.find(w => w.id === id)?.name ?? id;
  const mname = (id: string) => p.view.members.find(m => m.id === id)?.name ?? id;
  return <div role="region" className="team-block" aria-label="Zeitplan">
    <div className="team-block-head"><h3>Zeitplan <small>parallel nach Bautempo</small></h3>
      <div className="team-inline">
        <label className="team-check">Bautage je Woche <input type="number" min={1} max={7} value={perWeek} aria-label="Bautage je Woche" onChange={e => setPerWeek(Math.max(1, Math.min(7, Number(e.target.value) || 1)))} /></label>
        {proposal.length > 0 && <label className="team-check"><input type="checkbox" checked={withProposal} onChange={e => setWithProposal(e.target.checked)} /> mit Zuteilungsvorschlag</label>}
      </div></div>
    <p className="team-summary"><strong>{plan.makespan ? `Fertig in ${days(plan.makespan)}` : 'Nichts mehr offen'}</strong>
      {plan.makespan > 0 && <> · etwa bis {dateDe(plan.finish)} · allein wären es {days(plan.solo)}</>}</p>
    {plan.makespan > 0 && <div className="team-gantt" role="table" aria-label="Zeitplan je Mitglied">
      {plan.lanes.filter(l => l.items.some(i => i.work > 0)).map(lane => <div key={lane.member ?? '-'} className="team-lane" role="row">
        <span className="team-lane-name" role="rowheader">{lane.name}{lane.awayDays > 0 ? <small> · ab Tag {Math.ceil(lane.awayDays)}</small> : lane.awayDays === -1 ? <small> · abwesend</small> : null}</span>
        <span className="team-lane-track" role="cell">{lane.items.filter(i => i.work > 0).map(i => <span key={i.sectionId}
          className={`team-gbar${critical.has(i.sectionId) ? ' critical' : ''}${lane.member === null ? ' free' : ''}`}
          style={{ left: `${i.start / span * 100}%`, width: `max(3px, ${(i.end - i.start) / span * 100}%)` }}
          title={`${i.name}: Tag ${formatNumber(i.start)}–${formatNumber(i.end)}${i.crew?.length ? `, mit ${i.crew.map(mname).join(', ')}` : ''}${i.waitsFor ? `, wartet auf „${sname(i.waitsFor)}“` : ''}`}>{i.name}{i.crew?.length ? ` +${i.crew.length}` : ''}</span>)}</span>
        <small role="cell">{days(lane.end)}</small>
      </div>)}
    </div>}
    {plan.critical.length > 0 && plan.makespan > 0 && <p className="muted">Entscheidend für das Ende: {plan.critical.map(sname).join(' → ')}.</p>}
    {plan.items.some(i => i.waitsFor) && <ul className="team-hints">{plan.items.filter(i => i.waitsFor).map(i => <li key={i.sectionId}>„{i.name}“ wartet bis Tag {formatNumber(i.start)} auf „{sname(i.waitsFor!)}“.</li>)}</ul>}
    <small className="muted">{plan.notes.join(' ')} Bautempo im Reiter <a href={`#/projekt/${p.session.project.id}/bauen`}>Bauen</a> einstellen.</small>
  </div>;
}

function Material(p: TeamPlanProps & { proposal: readonly AssignmentProposal[] }) {
  const { view, session, ctx } = p;
  const overview = session.computation?.site.plan;
  const actMany = useActMany(p);
  const [all, setAll] = useState(false);
  const m = useMemo(() => overview ? teamMaterials({ overview, view, proposal: p.proposal }) : null, [overview, view, p.proposal]);
  if (!m) return null;
  const sname = (id: string) => ctx.sections.find(s => s.id === id)?.name ?? id;
  const lines = all ? m.items : m.items.filter(i => i.missing > 0).slice(0, 25);
  const canGather = !!p.me && canTeam(p.role, 'gather.claim');
  return <div role="region" className="team-block" aria-label="Material im Team">
    <div className="team-block-head"><h3>Material im Team <small>offener Bedarf nach Lager, Sammelaufträgen und gemeldeten Lieferungen</small></h3>
      <label className="team-check"><input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)} /> alle Items</label></div>
    {lines.length ? <div className="team-scroll"><table className="team-table team-mat"><thead><tr><th>Item</th><th>Bedarf</th><th>Lager</th><th>fehlt</th><th>wird gesammelt</th><th>geliefert</th><th>ohne Sammler</th><th /></tr></thead>
      <tbody>{lines.map(l => <tr key={l.item}><td>{short(l.item)}</td><td>{formatNumber(l.need)}</td><td>{formatNumber(l.fromStock)}</td><td>{formatNumber(l.missing)}</td>
        <td>{l.gathering ? formatNumber(l.gathering) : '–'}</td><td>{l.delivered ? formatNumber(l.delivered) : '–'}</td><td className={l.uncovered ? 'bad' : undefined}>{l.uncovered ? formatNumber(l.uncovered) : '✓'}</td>
        <td>{canGather && l.uncovered > 0 && <button className="secondary" onClick={() => actMany([{ kind: 'gather.claim', item: l.item, count: l.uncovered + (view.gather.find(g => g.member === p.me!.id && g.item === l.item)?.count ?? 0) }], `Ich sammle ${short(l.item)}`)}>Ich sammle</button>}</td></tr>)}</tbody></table></div>
      : <p className="muted">Für die offenen Schritte fehlt nichts – alles ist im Lager oder abgehakt.</p>}
    <h4>Je Mitglied</h4>
    <div className="team-cards">{m.members.filter(x => x.items.length).map(x => <div key={x.member ?? '-'} className="team-card">
      <strong>{x.name}</strong><small>{x.sections.map(sname).join(', ')}</small>
      <ul>{x.items.slice(0, 6).map(l => <li key={l.item}>{short(l.item)}: {formatNumber(l.need)}{l.missing ? <span className="bad"> (fehlt {formatNumber(l.missing)})</span> : null}</li>)}
        {x.items.length > 6 && <li className="muted">… {x.items.length - 6} weitere</li>}</ul>
      <small>≈ {x.slots} Plätze · {Math.ceil(x.slots / 27)} Shulkerkiste{Math.ceil(x.slots / 27) === 1 ? '' : 'n'}</small>
      <button className="secondary" onClick={() => { void copy(packingText(x, sname)).then(ok => p.setMessage(ok ? `Packliste von ${x.name} kopiert.` : packingText(x, sname))); }}>Packliste kopieren</button>
    </div>)}</div>
    <small className="muted">Gemeldete Lieferungen zählen erst zum Lager, wenn die Bauleitung sie im Reiter „Baustelle“ einträgt (eine Lagerquelle).</small>
  </div>;
}

// ---------------------------------------------------------------- Fortschritt

export function TeamProgressArea(p: TeamPlanProps) {
  const { session, site, view, team, ctx } = p;
  const { library } = useApp();
  const computation = session.computation;
  const actMany = useActMany(p);
  const work = useMemo(() => computation ? sectionWork(site, computation.guide, computation.site.progress) : [], [site, computation]);
  const [changes, setChanges] = useState<{ number: number; list: readonly SectionChange[] } | null>(null);
  const changed = useMemo(() => new Set((changes?.list ?? []).filter(c => c.sectionId).map(c => c.sectionId!)), [changes]);
  const prog = useMemo(() => teamProgress({ view, work, now: now(), changed }), [view, work, changed]);
  const meister = canTeam(p.role, 'section.verify');
  const sname = (id: string) => ctx.sections.find(s => s.id === id)?.name ?? 'entfernter Abschnitt';
  const name = (id?: string | null) => id ? view.members.find(m => m.id === id)?.name ?? id : '–';
  const compare = () => {
    const rel = view.release;
    if (!rel || !computation) return;
    const revision = session.project.revisions.find(r => r.id === rel.revisionId);
    if (!revision) { p.setMessage(`Planstand ${rel.revisionNumber} liegt in diesem Browser nicht vor (Teampaket mit Plan einlesen).`); return; }
    try {
      const resolution = resolveRevision(session.project, revision, library.versions);
      const released = buildGuide(revision, resolution);
      setChanges({ number: rel.revisionNumber, list: releaseChanges({ site, released, current: computation.guide, view }) });
    } catch (e) { p.setMessage(errorText(e)); }
  };
  const t = prog.totals;
  const quick = (a: (typeof prog.attention)[number]) => {
    const s = view.sections.find(x => x.sectionId === a.sectionId);
    if (!s || !p.me) return null;
    const label = sname(a.sectionId);
    if ((a.kind === 'stale-report' || a.kind === 'reported-not-ticked') && meister && s.status === 'gemeldet')
      return <><button onClick={() => actMany([{ kind: 'section.verify', section: a.sectionId, ok: true }], `„${label}“ bestätigt`)}>Bestätigen</button>
        <button className="secondary" onClick={() => { const note = window.prompt('Was muss nachgearbeitet werden?', ''); if (note !== null) actMany([{ kind: 'section.verify', section: a.sectionId, ok: false, ...(note.trim() && { note: note.trim().slice(0, 300) }) }], `„${label}“: Nacharbeit`); }}>Nacharbeit</button></>;
    if (a.kind === 'plan-changed' && meister) return <button className="secondary" onClick={() => actMany([{ kind: 'section.verify', section: a.sectionId, ok: false, note: `Plan geändert seit Planstand ${changes?.number ?? ''}`.trim() }], `„${label}“: Nacharbeit nach Planänderung`)}>Nacharbeit verlangen</button>;
    if (a.kind === 'ticked-not-reported' && s.owner === p.me.id) return <button onClick={() => actMany([{ kind: 'section.done', section: a.sectionId }], `„${label}“ fertig gemeldet`)}>Fertig melden</button>;
    if ((a.kind === 'idle-owner' || a.kind === 'away-owner') && canTeam(p.role, 'section.assign')) return <button className="secondary" onClick={() => actMany([{ kind: 'section.release', section: a.sectionId }], `„${label}“ freigegeben`)}>Freigeben</button>;
    return null;
  };
  return <>
    <div role="region" className="team-block" aria-label="Gesamtfortschritt">
      <div className="team-block-head"><h3>Fortschritt <small>{t.confirmed} von {t.sections} Abschnitten bestätigt</small></h3></div>
      <div className="team-stack" aria-label={`${pct(t.workDone, t.work)} % abgehakt, ${pct(t.reportedWork, t.work)} % gemeldet, ${pct(t.confirmedWork, t.work)} % bestätigt`}>
        <span className="ticked" style={{ width: `${pct(t.workDone, t.work)}%` }} /><span className="reported" style={{ width: `${pct(t.reportedWork, t.work)}%` }} /><span className="confirmed" style={{ width: `${pct(t.confirmedWork, t.work)}%` }} />
      </div>
      <p className="team-legend"><span className="ticked">abgehakt {pct(t.workDone, t.work)} %</span><span className="reported">fertig gemeldet {pct(t.reportedWork, t.work)} %</span><span className="confirmed">bestätigt {pct(t.confirmedWork, t.work)} %</span>
        <small className="muted">Drei getrennte Aussagen: Haken in der Bauanleitung (dieser Browser), Meldung im Team, Bestätigung durch Baumeister oder Bauleitung.</small></p>
      <div className="team-board">{(['frei', 'vergeben', 'nacharbeit', 'gemeldet', 'bestaetigt'] as const).map(st => <div key={st} className="team-col" role="list" aria-label={SECTION_TEAM_STATUS_LABEL[st]}>
        <h4><span className={`team-status st-${st}`}>{SECTION_TEAM_STATUS_LABEL[st]}</span> <small>{prog.board[st].length}</small></h4>
        {prog.board[st].map(id => { const w = work.find(x => x.id === id), s = view.sections.find(x => x.sectionId === id) as SectionState | undefined;
          return <div key={id} role="listitem" className={`team-tile${changed.has(id) ? ' changed' : ''}`}><strong>{sname(id)}</strong><small>{name(s?.owner)}{s?.crew?.length ? ` + ${s.crew.map(c => name(c)).join(', ')}` : ''}{w ? ` · ${formatNumber(w.work)} Bl.` : ''}</small>
            {w && w.work > 0 && <span className="team-bar"><span style={{ width: `${pct(w.work - w.openWork, w.work)}%` }} /></span>}
            {s?.offer && <small className="muted">Übergabe an {name(s.offer.to)} angeboten</small>}</div>; })}
      </div>)}</div>
    </div>
    <div className="team-columns">
      <div role="region" className="team-block" aria-label="Fortschritt je Mitglied">
        <h3>Je Mitglied</h3>
        <table className="team-table"><thead><tr><th>Name</th><th>Abschnitte</th><th>abgehakt</th><th>gemeldet</th><th>bestätigt</th></tr></thead>
          <tbody>{prog.members.map(m => <tr key={m.member}><td><strong>{m.name}</strong>{m.away && <small className="muted"> · abwesend{m.away.until ? ` bis ${dateDe(m.away.until)}` : ''}</small>}</td><td>{m.sections}</td>
            <td><span className="team-bar" title={`${formatNumber(m.workDone)} von ${formatNumber(m.work)} Blöcken`}><span style={{ width: `${pct(m.workDone, m.work)}%` }} /></span></td>
            <td>{m.work ? `${pct(m.reported, m.work)} %` : '–'}</td><td>{m.work ? `${pct(m.confirmed, m.work)} %` : '–'}</td></tr>)}</tbody></table>
      </div>
      <div role="region" className="team-block" aria-label="Achtung">
        <h3>Achtung <small>{prog.attention.length ? `${prog.attention.length} Punkt${prog.attention.length === 1 ? '' : 'e'}` : 'nichts offen'}</small></h3>
        {prog.attention.length ? <ul className="team-list">{prog.attention.map((a, i) => <li key={`${a.kind}${a.sectionId}${i}`}><span>{a.text}</span><span className="team-actions">{quick(a)}</span></li>)}</ul>
          : <p className="muted">Keine liegengebliebenen Meldungen, keine verwaisten oder wartenden Abschnitte.</p>}
      </div>
    </div>
    <div role="region" className="team-block" aria-label="Planänderungen">
      <div className="team-block-head"><h3>Änderungen seit der Freigabe</h3>
        {view.release && <button className="secondary" disabled={!computation} onClick={compare}>Mit Planstand {view.release.revisionNumber} vergleichen</button>}</div>
      {!view.release && <p className="muted">Noch kein Planstand freigegeben – unter „Bauen“ gibt die Bauleitung den Plan frei.</p>}
      {changes && (changes.list.length ? <table className="team-table"><thead><tr><th>Abschnitt</th><th>geändert</th><th>neu</th><th>entfallen</th><th>Blöcke</th><th>Status</th></tr></thead>
        <tbody>{changes.list.map(c => <tr key={c.sectionId ?? '-'} className={c.review ? 'warn' : undefined}><td>{c.name}</td><td>{c.changed}</td><td>{c.added}</td><td>{c.removed}</td><td>{formatNumber(c.work)}</td>
          <td>{SECTION_TEAM_STATUS_LABEL[c.status]}{c.review ? ' · Nacharbeit prüfen' : ''}</td></tr>)}</tbody></table>
        : <p>Der aktuelle Plan entspricht Planstand {changes.number}.</p>)}
      <small className="muted">Verglichen werden die Bauschritte (Schicht und Phase je Bauteil). Status ändert sich nie von selbst – Nacharbeit verlangt die Bauleitung.</small>
    </div>
    {team.events.length === 0 && <p className="muted">Noch keine Teamereignisse.</p>}
  </>;
}

// ---------------------------------------------------------------- Rechte & Übergabe

export function TeamRightsArea(p: TeamPlanProps) {
  const { view, ctx, me } = p;
  const actMany = useActMany(p);
  const rows = useMemo(() => rightsMatrix(), []);
  const name = (id?: string | null) => id ? view.members.find(m => m.id === id)?.name ?? id : '–';
  const sname = (id: string) => ctx.sections.find(s => s.id === id)?.name ?? 'entfernter Abschnitt';
  const sections = view.sections as readonly SectionState[];
  const mine = me ? sections.filter(s => s.owner === me.id && (s.status === 'vergeben' || s.status === 'nacharbeit') && !s.orphan) : [];
  const offersForMe = me ? sections.filter(s => s.offer?.to === me.id) : [];
  const myOffers = me ? sections.filter(s => s.offer && (s.offer.by === me.id || s.owner === me.id) && s.offer.to !== me.id) : [];
  const others = (view.members as readonly Member[]).filter(m => m.id !== me?.id && canTeam(m.role, 'section.claim'));
  const [until, setUntil] = useState(''), [note, setNote] = useState(''), [heir, setHeir] = useState('');
  const meAway = (me as Member | null)?.away;
  return <>
    <div role="region" className="team-block" aria-label="Übergabe">
      <h3>Übergabe <small>Abschnitt an jemand anderen geben – der andere nimmt an</small></h3>
      {!me && <p className="muted">Bitte oben wählen, wer du bist.</p>}
      {offersForMe.length > 0 && <><h4>Für dich angeboten</h4><ul className="team-list">{offersForMe.map(s => <li key={s.sectionId}><strong>{sname(s.sectionId)}</strong><small>von {name(s.offer!.by)}{s.owner ? ` (Inhaber ${name(s.owner)})` : ''}</small>
        <span className="team-actions"><button onClick={() => actMany([{ kind: 'section.accept', section: s.sectionId }], `„${sname(s.sectionId)}“ übernommen`)}>Annehmen</button>
          <button className="secondary" onClick={() => actMany([{ kind: 'section.decline', section: s.sectionId }], `Übergabe „${sname(s.sectionId)}“ abgelehnt`)}>Ablehnen</button></span></li>)}</ul></>}
      {mine.length > 0 && <><h4>Meine Abschnitte</h4><ul className="team-list">{mine.map(s => <li key={s.sectionId}><strong>{sname(s.sectionId)}</strong>
        {s.offer ? <small>angeboten an {name(s.offer.to)}</small> : null}
        <span className="team-actions">{!s.offer && <select aria-label={`„${sname(s.sectionId)}“ übergeben an`} value="" onChange={e => { const to = e.target.value; if (!to) return;
          const n = window.prompt(`Notiz für ${name(to)} (optional, z. B. wo du aufgehört hast):`, ''); if (n === null) return;
          actMany([{ kind: 'section.handover', section: s.sectionId, member: to, ...(n.trim() && { note: n.trim().slice(0, 300) }) }], `Übergabe „${sname(s.sectionId)}“ angeboten`); }}>
          <option value="">übergeben an …</option>{others.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>}</span></li>)}</ul></>}
      {myOffers.length > 0 && <><h4>Offene Angebote</h4><ul className="team-list">{myOffers.map(s => <li key={s.sectionId}><strong>{sname(s.sectionId)}</strong><small>an {name(s.offer!.to)} seit {new Date(s.offer!.at).toLocaleDateString('de-DE')}</small>
        <span className="team-actions"><button className="secondary" onClick={() => actMany([{ kind: 'section.decline', section: s.sectionId }], 'Angebot zurückgezogen')}>Zurückziehen</button></span></li>)}</ul></>}
      {me && !mine.length && !offersForMe.length && !myOffers.length && <p className="muted">Du hast gerade keine Abschnitte in Arbeit und keine offenen Angebote.</p>}
      <small className="muted">Bis zur Annahme bleibt der Abschnitt beim bisherigen Inhaber. Baumeister können auch direkt zuweisen.</small>
    </div>
    <div className="team-columns">
      <div role="region" className="team-block" aria-label="Abwesenheit">
        <h3>Abwesenheit</h3>
        {me && (meAway ? <p>Du bist als abwesend eingetragen{meAway.until ? ` bis ${dateDe(meAway.until)}` : ''}{meAway.note ? ` (${meAway.note})` : ''}.
          <button className="secondary" onClick={() => actMany([{ kind: 'member.away', member: me.id }], 'Wieder da')}>Ich bin wieder da</button></p>
          : <form className="team-inline" onSubmit={e => { e.preventDefault(); actMany([{ kind: 'member.away', member: me.id, ...(until && { until }), ...(note.trim() && { note: note.trim().slice(0, 120) }) }], 'Abwesenheit eingetragen'); setUntil(''); setNote(''); }}>
            <label className="team-check">bis <input type="date" value={until} aria-label="abwesend bis" onChange={e => setUntil(e.target.value)} /></label>
            <input className="grow" placeholder="Grund (optional, z. B. Urlaub)" value={note} maxLength={120} onChange={e => setNote(e.target.value)} />
            <button>Abwesend eintragen</button></form>)}
        <small className="muted">Abwesende bekommen keine Zuteilungsvorschläge; ihre Abschnitte erscheinen unter „Fortschritt → Achtung“ zum Übergeben, und der Zeitplan rechnet ab ihrer Rückkehr.</small>
        {(view.members as readonly Member[]).some(m => m.away) && <ul className="team-hints">{(view.members as readonly Member[]).filter(m => m.away).map(m => <li key={m.id}>{m.name}: abwesend{m.away!.until ? ` bis ${dateDe(m.away!.until)}` : ''}{m.away!.note ? ` · ${m.away!.note}` : ''}</li>)}</ul>}
      </div>
      <div role="region" className="team-block" aria-label="Bauleitung übergeben">
        <h3>Bauleitung übergeben</h3>
        {p.role === 'leitung' ? <>
          <p className="muted">Die neue Bauleitung darf danach alles; du wirst Baumeister. Es bleibt immer mindestens eine Bauleitung.</p>
          <div className="team-inline"><select aria-label="Neue Bauleitung" value={heir} onChange={e => setHeir(e.target.value)}><option value="">an …</option>
            {view.members.filter(m => m.id !== me?.id && m.role !== 'leitung').map(m => <option key={m.id} value={m.id}>{m.name} ({TEAM_ROLE_LABEL[m.role]})</option>)}</select>
            <button disabled={!heir} onClick={() => { if (me && heir && window.confirm(`${name(heir)} wird Bauleitung, du wirst Baumeister. Fortfahren?`) &&
              actMany([{ kind: 'member.role', member: heir, role: 'leitung' }, { kind: 'member.role', member: me.id, role: 'meister' }], `Bauleitung an ${name(heir)} übergeben`)) setHeir(''); }}>Übergeben</button>
            <button className="secondary" disabled={!heir} onClick={() => { if (heir && actMany([{ kind: 'member.role', member: heir, role: 'leitung' }], `${name(heir)} ist zusätzlich Bauleitung`)) setHeir(''); }}>Zusätzlich Bauleitung</button></div>
          <small className="muted">Mit Team live erfahren es alle sofort, auch Mods und Server-Plugin. Mit Paper-Plugin gilt zusätzlich die Berechtigung <code>bauplaner.team.leitung</code>.</small>
        </> : <p className="muted">Nur die Bauleitung kann die Bauleitung übergeben. Aktuell: {view.members.filter(m => m.role === 'leitung').map(m => m.name).join(', ')}.</p>}
      </div>
    </div>
    <div role="region" className="team-block" aria-label="Rechte">
      <h3>Wer darf was</h3>
      <div className="team-scroll"><table className="team-table team-rights"><thead><tr><th /> {TEAM_ROLES.map(r => <th key={r}>{TEAM_ROLE_LABEL[r]}</th>)}</tr></thead>
        <tbody>{rows.map(r => <tr key={r.action}><td>{r.label}{r.extra && <small className="muted"> ({r.extra})</small>}</td>{TEAM_ROLES.map(role => <td key={role} aria-label={r.roles[role] ? 'ja' : 'nein'}>{r.roles[role] ? '✓' : '–'}</td>)}</tr>)}</tbody></table></div>
      <small className="muted">Rechte prüft der Planer bei jedem Ereignis mit der Rolle zum Zeitpunkt des Ereignisses. Im Dateiaustausch sind sie eine Ordnungshilfe; verbindlich prüft sie das Paper-Plugin mit der echten Spieler-UUID.</small>
    </div>
  </>;
}

// ---------------------------------------------------------------- issues with fixes

export function TeamIssues(p: TeamPlanProps) {
  const { team, ctx, view } = p;
  const actMany = useActMany(p);
  const issues = useMemo(() => teamIssues(team, ctx, view), [team, ctx, view]);
  if (!issues.length) return null;
  const conflicts = issues.filter(i => i.kind === 'conflict').length, rejected = issues.length - conflicts;
  const allowed = (i: TeamIssue['fixes'][number]) => canTeam(p.role, i.needs);
  return <details className="team-block team-issues" open={issues.length <= 3}>
    <summary>{conflicts} Hinweis{conflicts === 1 ? '' : 'e'} · {rejected} nicht übernommene Ereignis{rejected === 1 ? '' : 'se'}</summary>
    <ul>{issues.map(i => <li key={i.event.id} className={i.kind === 'rejected' ? 'bad' : undefined}><span>{i.text}</span>
      {p.me && <span className="team-actions">{i.fixes.filter(allowed).map(f => <button key={f.label} className={f.body.kind === 'issue.ack' ? 'secondary' : undefined}
        onClick={() => actMany([f.body], f.label)}>{f.label}</button>)}</span>}</li>)}</ul>
    <small className="muted">Nichts wird gelöscht: abgelehnte Ereignisse bleiben im Protokoll, wirken aber nicht. Jede Lösung ist selbst ein Teamereignis und reist mit dem nächsten Paket zu allen.</small>
  </details>;
}
