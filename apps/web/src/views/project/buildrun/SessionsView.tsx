import { useMemo, useState } from 'react';
import {
  gameCounts, GAME_STATUS_LABEL, packSteps, PACE_LIMITS, PHASE_LABEL, progressByDay, REWORK_ACTION, reworkList, runCoords, sectionOfStep, sessionText,
  setPace, siteOf, siteOperation, stockMap, tickSteps, VERDICT_LABEL,
} from '../../../../../../packages/domain/src/index.js';
import type { BuildAnchor, BuildSession, GameCheck, Guide, GuideProgress, MaterialReport, Operation, Project, SessionPlan } from '../../../../../../packages/domain/src/index.js';
import type { VoxelPayload } from '../../../../../../packages/voxel/src/index.js';
import { download, formatNumber } from '../../../app/ui';
import { dayLabel, fileStem, localDay } from './common';
import type { PrintTarget } from './common';
import { PackList } from './PackList';

interface Props {
  project: Project; guide: Guide; progress: GuideProgress; plan: SessionPlan; reports: ReadonlyMap<string, MaterialReport>;
  game: GameCheck | null; anchor: BuildAnchor; world: VoxelPayload;
  execute(op: Operation): string; onSelectStep(id: string): void; onPrint(target: PrintTarget): void; onFocus(stepId: string): void;
}

/** Bautage (Tagesziele), Shulker-Packlisten je Tag und Abschnitt, Spielfortschritt und Nacharbeit (BUILD-06). */
export function SessionsView(p: Props) {
  const { project, guide, plan } = p;
  const site = siteOf(project);
  const [message, setMessage] = useState('');
  const [openDay, setOpenDay] = useState(1);
  const run = (op: Operation | null) => { if (op) setMessage(p.execute(op)); };
  const days = useMemo(() => progressByDay(project.progress, guide, localDay), [project.progress, guide]);
  const today = localDay(new Date());
  const doneToday = days.find(d => d.day === today);
  const goal = plan.pace.blocksPerSession, todayPct = Math.min(100, Math.round((doneToday?.blocks ?? 0) / goal * 100));
  const rework = useMemo(() => p.game ? reworkList(p.game, guide) : [], [p.game, guide]);
  const sectionPacks = useMemo(() => {
    if (!site.sections.length) return [];
    const stock = stockMap(site);
    const open = guide.steps.filter(s => p.progress.status.get(s.id) !== 'done');
    return [...site.sections.map(s => ({ id: s.id, name: s.name })), { id: '', name: 'Ohne Abschnitt' }].map(sec => {
      const steps = open.filter(s => (sectionOfStep(site, s) ?? '') === sec.id);
      return { ...sec, steps: steps.length, pack: packSteps(steps, p.reports, stock) };
    }).filter(s => s.steps > 0);
  }, [site, guide, p.progress, p.reports]);

  const savePace = (blocks: number, boxes: number) => {
    const b = Math.max(PACE_LIMITS.blocks[0], Math.min(PACE_LIMITS.blocks[1], Math.trunc(blocks) || plan.pace.blocksPerSession));
    const x = Math.max(PACE_LIMITS.boxes[0], Math.min(PACE_LIMITS.boxes[1], Math.trunc(boxes) || plan.pace.boxesPerSession));
    if (b === plan.pace.blocksPerSession && x === plan.pace.boxesPerSession) return;
    run(siteOperation(setPace(site, { blocksPerSession: b, boxesPerSession: x }), 'Bautempo geändert'));
  };

  return <div className="sessions build-wide" aria-label="Bautage und Packlisten">
    <section className="sessions-top">
      <div className="build-progress today">
        <span className="panel-kicker">HEUTE · {dayLabel(today)} · LAUT HAKEN</span>
        <strong>{formatNumber(doneToday?.blocks ?? 0)} / {formatNumber(goal)} Blöcke</strong>
        <div className="build-bar" role="progressbar" aria-label="Tagesziel" aria-valuemin={0} aria-valuemax={100} aria-valuenow={todayPct}><span style={{ width: `${todayPct}%` }} /></div>
        <small>{doneToday ? `${doneToday.steps} Schritte heute abgehakt` : 'Heute noch nichts abgehakt'}{days.filter(d => d.day !== today).slice(0, 3).map(d => ` · ${dayLabel(d.day)}: ${formatNumber(d.blocks)}`).join('')}</small>
      </div>
      <form className="pace-form" aria-label="Bautempo" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); savePace(Number(f.get('blocks')), Number(f.get('boxes'))); }}>
        <label>Blöcke je Bautag<input name="blocks" type="number" min={PACE_LIMITS.blocks[0]} max={PACE_LIMITS.blocks[1]} defaultValue={plan.pace.blocksPerSession} key={`b${plan.pace.blocksPerSession}`} /></label>
        <label>Shulkerkisten je Tour<input name="boxes" type="number" min={PACE_LIMITS.boxes[0]} max={PACE_LIMITS.boxes[1]} defaultValue={plan.pace.boxesPerSession} key={`x${plan.pace.boxesPerSession}`} /></label>
        <button type="submit">Bautempo speichern</button>
      </form>
      <p className="muted sessions-note">{plan.openSteps ? `${plan.openSteps} offene Schritte mit ${formatNumber(plan.openWork)} Blöcken ergeben ${plan.sessions.length} Bautage.` : 'Alle Schritte sind abgehakt.'} {plan.notes.join(' ')}</p>
    </section>
    {message && <div className="notice warning" role="alert">{message}<button onClick={() => setMessage('')}>OK</button></div>}

    {rework.length > 0 && <section className="rework" aria-label="Nacharbeit aus Spielaufnahme">
      <div className="site-head"><h3>Nacharbeit laut Spielaufnahme <small>{rework.reduce((n, g) => n + g.items.length, 0)} Zellen in {rework.length} Schritten</small></h3>
        <button onClick={() => p.onPrint({ kind: 'rework' })}>Nacharbeit drucken</button></div>
      <ol className="rework-list">{rework.slice(0, 30).map(g => <li key={g.step.id}>
        <button className="link-button" onClick={() => p.onSelectStep(g.step.id)}>Schritt {g.step.order} · {PHASE_LABEL[g.step.phase]} · {g.step.sectionName} · Y {g.step.y}</button>
        <ul>{g.items.slice(0, 12).map(i => { const c = runCoords({ x0: i.position[0], x1: i.position[0], z0: i.position[2], z1: i.position[2], y: i.position[1] }, p.anchor);
          return <li key={i.position.join(',')} className={`v-${i.verdict}`}><strong>{REWORK_ACTION[i.verdict]}</strong> {c.abs ?? c.rel}{c.abs && <small> (Anker {c.rel})</small>}: {VERDICT_LABEL[i.verdict]} – geplant <code>{i.expected}</code>{i.actual && <>, im Spiel <code>{i.actual}</code></>}</li>; })}
          {g.items.length > 12 && <li>… und {g.items.length - 12} weitere</li>}
          {g.unknown > 0 && <li className="muted">{g.unknown} Zellen nicht aufgenommen</li>}</ul>
      </li>)}{rework.length > 30 && <li>… und {rework.length - 30} weitere Schritte</li>}</ol>
    </section>}

    <ol className="session-list">{plan.sessions.map(s => <SessionCard key={s.index} s={s} {...p} open={openDay === s.index} onToggle={() => setOpenDay(openDay === s.index ? 0 : s.index)} run={run} />)}</ol>

    {sectionPacks.length > 0 && <section className="section-packs" aria-label="Packliste je Bauabschnitt">
      <h3>Packliste je Bauabschnitt <small>offene Schritte, Lager in Abschnitt-Reihenfolge verbraucht</small></h3>
      {sectionPacks.map(s => <details key={s.id || '~'}><summary><strong>{s.name}</strong> · {s.steps} offene Schritte · {formatNumber(s.pack.totals.boxes)} Kisten · {formatNumber(s.pack.totals.items)} Items{s.pack.totals.missing ? ` · ${formatNumber(s.pack.totals.missing)} besorgen` : ''}</summary>
        <PackList pack={s.pack} /></details>)}
    </section>}
  </div>;
}

function SessionCard({ s, open, onToggle, run, ...p }: Props & { s: BuildSession; open: boolean; onToggle(): void; run(op: Operation | null): void }) {
  const counts = p.game ? gameCounts(s.steps, p.game) : null;
  const confirmable = p.game ? s.steps.filter(x => p.game!.steps.get(x.id)?.status === 'confirmed' && p.progress.status.get(x.id) !== 'done') : [];
  const review = s.steps.filter(x => p.progress.status.get(x.id) === 'review').length;
  return <li className={`session${open ? ' open' : ''}`} data-day={s.index}>
    <button className="session-head" aria-expanded={open} onClick={onToggle}>
      <span className="site-no">{s.index}</span>
      <span className="session-title"><strong>Bautag {s.index}{s.index === 1 ? ' · als Nächstes' : ''}</strong>
        <small>{s.steps.length} Schritte · {formatNumber(s.work)} Blöcke · Y {s.minY === s.maxY ? s.minY : `${s.minY}–${s.maxY}`}{p.anchor.origin ? ` (Welt-Y ${s.minY + p.anchor.origin[1]}${s.maxY !== s.minY ? `–${s.maxY + p.anchor.origin[1]}` : ''})` : ''} · {s.pack.totals.boxes} Kisten · {s.sections.join(', ')}</small></span>
      <span className="step-badges">{s.oversized && <em className="badge review">größer als Tagesziel</em>}{review > 0 && <em className="badge review">{review} prüfbedürftig</em>}
        {counts && counts.confirmed > 0 && <em className="badge game ok">{counts.confirmed} im Spiel bestätigt</em>}</span>
    </button>
    {open && <div className="session-body">
      <div className="button-row">
        <button className="primary" onClick={() => p.onFocus(s.steps[0]!.id)}>Im Baumodus starten</button>
        <button onClick={() => p.onPrint({ kind: 'day', index: s.index })}>Bauzettel drucken</button>
        <button onClick={() => download(`${fileStem(p.project.name)}_Bautag_${s.index}.txt`, sessionText(s, p.world, p.anchor, `${p.project.name} – Bauzettel`), 'text/plain;charset=utf-8')}>Als Text herunterladen</button>
      </div>
      {counts && <div className="session-game" role="status">
        <span>Im Spiel: {(['confirmed', 'partial', 'deviating', 'unchecked'] as const).filter(k => counts[k]).map(k => `${counts[k]} ${GAME_STATUS_LABEL[k].replace(/^im Spiel /, '')}`).join(' · ')}</span>
        <button disabled={!confirmable.length} onClick={() => run(tickSteps(confirmable, `Bautag ${s.index}: ${confirmable.length} im Spiel bestätigte Schritte abgehakt`))}>
          {confirmable.length ? `${confirmable.length} bestätigte Schritte dieses Tages abhaken` : 'Keine bestätigten offenen Schritte'}</button>
      </div>}
      <div className="session-grid">
        <section><h4>Schritte</h4><ul className="session-steps">{s.steps.map(x => { const g = p.game?.steps.get(x.id);
          return <li key={x.id}><button className="link-button" onClick={() => p.onSelectStep(x.id)}>{x.order}. {PHASE_LABEL[x.phase]} · {x.sectionName} · Y {x.y}</button>
            <small> {formatNumber(x.blocks || x.erase)} {x.blocks ? 'Blöcke' : 'Zellen'}{g ? ` · ${GAME_STATUS_LABEL[g.status]}` : ''}</small></li>; })}</ul></section>
        <section><h4>Shulker-Packliste</h4><PackList pack={s.pack} /></section>
      </div>
    </div>}
  </li>;
}
