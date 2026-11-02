import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { dimensionLabel, PHASE_LABEL, reworkList, REWORK_ACTION, runCoords, runLabel, stepRunsIn, VERDICT_LABEL } from '../../../../../../packages/domain/src/index.js';
import type { BuildAnchor, BuildSession, CellLookup, GameCheck, Guide, GuideStep, StepRun } from '../../../../../../packages/domain/src/index.js';
import type { VoxelPayload } from '../../../../../../packages/voxel/src/index.js';
import { formatNumber } from '../../../app/ui';
import { stateColor } from '../../../colors';
import type { PrintTarget } from './common';
import { shortItem } from './PackList';
import { FurnishList } from '../FurnishList';

const GRID_MAX = 40;

/**
 * Bauzettel for printing (A4, black on white). Rendered into <body> next to the
 * app; print CSS hides the app while it is mounted, on screen it is hidden.
 * The tab shows a banner to print again or close it.
 */
export function PrintSheet({ target, title, sessions, guide, game, world, lookup, anchor }: {
  target: PrintTarget; title: string; sessions: readonly BuildSession[]; guide: Guide; game: GameCheck | null;
  world: VoxelPayload; lookup: CellLookup; anchor: BuildAnchor;
}) {
  useEffect(() => {
    document.body.classList.add('printing-sheet');
    // Stays mounted after the dialog (headless browsers fire afterprint at once); the screen banner closes it.
    const frame = requestAnimationFrame(() => { try { window.print(); } catch { /* print unavailable */ } });
    return () => { cancelAnimationFrame(frame); document.body.classList.remove('printing-sheet'); };
  }, [target]);
  const session = target.kind === 'day' ? sessions.find(s => s.index === target.index) ?? null : null;
  const o = anchor.origin;
  const head = <header className="ps-head">
    <h1>{title}</h1>
    <p>{session ? `Bautag ${session.index} · ${session.steps.length} Schritte · ${formatNumber(session.work)} Blöcke · Y ${session.minY}–${session.maxY}` : 'Nacharbeit laut Spielaufnahme'} · gedruckt {new Date().toLocaleDateString('de-DE')}</p>
    <p>{o ? <>Anker (Projekt 0/0/0) = Welt <b>X {o[0]} · Y {o[1]} · Z {o[2]}</b> ({dimensionLabel(anchor.dimension!)}). Koordinaten unten in Weltkoordinaten, klein relativ zum Anker.</>
      : 'Weltlage nicht gesetzt: Koordinaten relativ zum Anker (Projekt 0/0/0).'} Norden = −Z, Osten = +X.</p>
  </header>;
  return createPortal(<div className="print-sheet" aria-hidden="true">
    {head}
    {session && <DaySheet session={session} world={world} lookup={lookup} anchor={anchor} />}
    {target.kind === 'rework' && game && <ReworkSheet guide={guide} game={game} anchor={anchor} />}
  </div>, document.body);
}

function DaySheet({ session, world, lookup, anchor }: { session: BuildSession; world: VoxelPayload; lookup: CellLookup; anchor: BuildAnchor }) {
  const runs = useMemo(() => new Map(session.steps.map(s => [s.id, stepRunsIn(s, world, lookup)])), [session, world, lookup]);
  return <>
    <section className="ps-pack"><h2>Packliste ({session.pack.totals.boxes} Shulkerkisten)</h2>
      <ul>{session.pack.boxes.map(b => <li key={b.index}><span className="ps-box" />Kiste {b.index} (ab Schritt {b.fromStep}): {b.items.map(i => `${formatNumber(i.count)}× ${shortItem(i.itemId)}`).join(', ')}</li>)}
        {session.pack.loose.map(l => <li key={l.itemId}><span className="ps-box" />lose: {l.count}× {shortItem(l.itemId)}</li>)}</ul>
      {session.pack.totals.missing > 0 && <p>Noch besorgen: {session.pack.lines.filter(l => l.missing).map(l => `${formatNumber(l.missing)}× ${shortItem(l.itemId)}`).join(', ')}</p>}
    </section>
    {session.steps.map(s => <StepSheet key={s.id} step={s} runs={runs.get(s.id)!} anchor={anchor} />)}
  </>;
}

function StepSheet({ step, runs, anchor }: { step: GuideStep; runs: readonly StepRun[]; anchor: BuildAnchor }) {
  const w = step.bounds.maxExclusive[0] - step.bounds.min[0], h = step.bounds.maxExclusive[2] - step.bounds.min[2];
  return <section className="ps-step">
    <h2><span className="ps-box" />Schritt {step.order} · {PHASE_LABEL[step.phase]} · {step.sectionName} · Y {step.y}{anchor.origin ? ` (Welt-Y ${step.y + anchor.origin[1]})` : ''}</h2>
    <p className="ps-check">{step.check}</p>
    <div className="ps-cols">
      <table><thead><tr><th /><th>Wo</th><th>Block</th><th>Anz.</th></tr></thead>
        <tbody>{runs.map(r => { const c = runCoords(r, anchor);
          return <tr key={`${r.x0},${r.z0},${r.key}`}><td><span className="ps-box" /></td><td>{c.abs ?? c.rel}{c.abs && <small><br />Anker {c.rel}</small>}</td><td>{runLabel(r)}</td><td>{r.count}</td></tr>; })}</tbody></table>
      {w <= GRID_MAX && h <= GRID_MAX && <svg className="ps-grid" viewBox={`-1.5 -1.5 ${w + 2} ${h + 2}`} role="img" aria-label={`Schichtplan Schritt ${step.order}`}>
        <text x={w / 2} y={-0.5} className="ps-axis">N ↑ · X {step.bounds.min[0]}…{step.bounds.maxExclusive[0] - 1}</text>
        <text x={-0.4} y={h / 2} className="ps-axis" transform={`rotate(-90 -0.4 ${h / 2})`}>Z {step.bounds.min[2]}…{step.bounds.maxExclusive[2] - 1}</text>
        {runs.map(r => <rect key={`${r.x0},${r.z0},${r.key}`} x={r.x0 - step.bounds.min[0]} y={r.z0 - step.bounds.min[2]} width={r.x1 - r.x0 + 1} height={r.z1 - r.z0 + 1}
          fill={r.state ? stateColor(r.state.id) : r.kind === 'erase' ? '#ffffff' : '#eeeeee'} stroke="#000" strokeWidth={0.05} />)}
      </svg>}
    </div>
    <FurnishList step={step} print />
    {step.notes.length > 0 && <ul className="ps-notes">{step.notes.map(n => <li key={n}>{n}</li>)}</ul>}
  </section>;
}

function ReworkSheet({ guide, game, anchor }: { guide: Guide; game: GameCheck; anchor: BuildAnchor }) {
  const groups = useMemo(() => reworkList(game, guide), [game, guide]);
  return <>{groups.map(g => <section key={g.step.id} className="ps-step"><h2>Schritt {g.step.order} · {PHASE_LABEL[g.step.phase]} · {g.step.sectionName} · Y {g.step.y}</h2>
    <table><thead><tr><th /><th>Wo</th><th>Was</th><th>Geplant</th><th>Im Spiel</th></tr></thead><tbody>{g.items.map(i => {
      const c = runCoords({ x0: i.position[0], x1: i.position[0], z0: i.position[2], z1: i.position[2], y: i.position[1] }, anchor);
      return <tr key={i.position.join(',')}><td><span className="ps-box" /></td><td>{c.abs ?? c.rel}</td><td>{REWORK_ACTION[i.verdict]} ({VERDICT_LABEL[i.verdict]})</td><td>{i.expected}</td><td>{i.actual ?? '–'}</td></tr>;
    })}</tbody></table></section>)}</>;
}
