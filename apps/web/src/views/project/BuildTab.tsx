import { useCallback, useEffect, useMemo, useState } from 'react';
import { selectLayers } from '../../../../../packages/voxel/src/index.js';
import type { BlockState, Cell } from '../../../../../packages/voxel/src/index.js';
import { buildGuide, checkScan, confirmedUnticked, evaluateProgress, formatStacks, materialsForParts, PHASE_LABEL, positionKey, resolveProject, scanTarget, sectionOfStep, siteOf, tickConfirmed, tickedButNotBuilt, tickStep, tickSteps, untickStep, untickSteps, VERDICT_LABEL } from '../../../../../packages/domain/src/index.js';
import type { CellDeviation, GameCheck, Guide, GuideStep, MaterialReport, Resolution, StepStatus } from '../../../../../packages/domain/src/index.js';
import type { Vec3 } from '../../../../../packages/voxel/src/index.js';
import { useApp } from '../../app/context';
import { errorText, formatNumber } from '../../app/ui';
import { mix, stateColor } from '../../colors';
import { Viewer } from '../../Viewer';
import { GAME_BADGE, GameCheckPanel, gameStatusText } from './GameCheckPanel';
import type { LoadedScan } from './GameCheckPanel';
import { isResolved } from './session';
import type { ProjectSession } from './session';

type Filter = 'all' | 'todo' | 'review';
const STATUS_LABEL: Readonly<Record<StepStatus, string>> = { open: 'offen', done: 'abgehakt', review: 'prüfbedürftig' };
const DIM = '#16303c', DONE = '#3f6b5c', MAX_GRID = 96;

function stateText(state: BlockState): string {
  const props = Object.entries(state.properties).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`);
  return props.length ? `${state.id}[${props.join(',')}]` : state.id;
}
const shortId = (id: string): string => id.replace(/^minecraft:/, '');
const stepTitle = (s: GuideStep): string => `${PHASE_LABEL[s.phase]} · ${s.sectionName} · Y ${s.y}`;

/** Build guide: layer steps per section, manual ticks bound to geometry, mobile friendly. */
export function BuildTab({ session }: { session: ProjectSession }) {
  const { library } = useApp();
  const { project } = session;
  const [basis, setBasis] = useState<string>('working');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [show3d, setShow3d] = useState(false);
  const [message, setMessage] = useState('');
  const [scan, setScan] = useState<LoadedScan | null>(null);
  const [manualAlign, setManualAlign] = useState<Vec3 | null>(null);

  const revision = basis === 'working' ? null : project.revisions.find(r => r.id === basis) ?? null;
  const source = useMemo<{ resolution: Resolution; guide: Guide } | { error: string }>(() => {
    try {
      const resolution = revision ? resolveProject({ ...project, instances: revision.instances }, library.versions) : session.resolution;
      if (!isResolved(resolution)) return { error: resolution.error };
      return { resolution, guide: buildGuide(revision ?? project, resolution) };
    } catch (e) { return { error: errorText(e) }; }
    // Progress changes must not rebuild the guide; geometry comes from instances only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, session.resolution, project.instances, library.versions]);

  const guide = 'guide' in source ? source.guide : null;
  const progress = useMemo(() => guide ? evaluateProgress(guide, project.progress) : null, [guide, project.progress]);
  const ready = useMemo(() => new Set(progress?.ready ?? []), [progress]);
  const status = useCallback((id: string): StepStatus => progress?.status.get(id) ?? 'open', [progress]);

  // In-game check (B8): the recording names its revision; the guide of that revision is the basis.
  const target = useMemo(() => scan ? scanTarget(project, scan) : null, [scan, project]);
  const targetError = target && 'error' in target ? target.error : '';
  const scanRevision = target && !('error' in target) ? target.revision : null;
  const world = 'resolution' in source ? source.resolution.world : null;
  const alignment: Vec3 | null = target && !('error' in target) ? target.projectMin ?? manualAlign ?? world?.bounds.min ?? null : null;
  const basisMismatch = !!scanRevision && basis !== scanRevision.id;
  const game = useMemo<GameCheck | null>(() => {
    if (!scan || !guide || !world || !alignment || !target || 'error' in target || basisMismatch) return null;
    return checkScan(guide, world, scan, alignment, target.notes);
  }, [scan, guide, world, alignment, target, basisMismatch]);
  // Build items per step (B1 rules); partner halves are looked up in the whole world so steps add up to the material tab.
  const stepItems = useMemo(() => guide && world ? materialsForParts(world, guide.steps) : null, [guide, world]);
  const loadScan = (s: LoadedScan) => {
    setScan(s); setManualAlign(null);
    const t = scanTarget(project, s);
    if (!('error' in t) && t.revision) { setBasis(t.revision.id); setSelectedId(null); }
  };

  // Build sections of the site plan (B14): optional filter of the step list.
  const site = siteOf(project);
  const [sectionId, setSectionId] = useState('');
  const inSection = useCallback((s: GuideStep) => !sectionId || (sectionId === '~' ? sectionOfStep(site, s) === null : sectionOfStep(site, s) === sectionId), [site, sectionId]);
  const visibleSteps = useMemo(() => guide?.steps.filter(s => inSection(s) && (filter === 'all' || (filter === 'review' ? status(s.id) === 'review' : status(s.id) !== 'done'))) ?? [], [guide, filter, status, inSection]);
  const step = guide?.byId.get(selectedId ?? '') ?? guide?.steps.find(s => ready.has(s.id)) ?? guide?.steps.find(s => status(s.id) !== 'done') ?? guide?.steps[0] ?? null;
  useEffect(() => { if (step && step.id !== selectedId) setSelectedId(step.id); }, [step, selectedId]);

  const run = (op: Parameters<ProjectSession['execute']>[0] | null) => { if (op) setMessage(session.execute(op)); };
  const nextOpen = (after: GuideStep) => guide!.steps.find(s => s.order > after.order && status(s.id) !== 'done') ?? guide!.steps.find(s => status(s.id) !== 'done');
  const tick = (s: GuideStep) => {
    run(tickStep(s));
    const next = guide!.steps.find(n => n.order > s.order && status(n.id) !== 'done');
    if (next) setSelectedId(next.id);
  };

  if (!guide || !progress) return <section className="build" aria-label="Bauanleitung"><div className="notice warning" role="alert"><strong>Bauanleitung nicht verfügbar</strong><p>{'error' in source ? source.error : ''}</p></div></section>;
  if (!guide.steps.length) return <section className="build" aria-label="Bauanleitung"><div className="notice">Noch nichts zu bauen. Füge im <a href={`#/projekt/${project.id}/editor`}>Editor</a> Bauteile ein.</div></section>;

  const total = guide.steps.length, pct = guide.totals.blocks ? Math.round(progress.blocksDone / guide.totals.blocks * 100) : 0;
  const byLayer = new Map<number, GuideStep[]>();
  for (const s of visibleSteps) (byLayer.get(s.y) ?? (byLayer.set(s.y, []), byLayer.get(s.y)!)).push(s);
  const layerSteps = step ? guide.steps.filter(s => s.y === step.y && s.phase !== 'liquid') : [];
  const reviewSteps = guide.steps.filter(s => status(s.id) === 'review');
  const layerOpen = step ? guide.steps.filter(s => s.y === step.y && status(s.id) !== 'done') : [];
  const layerItems = step && world ? { y: step.y, steps: layerOpen.length, report: materialsForParts(world, [{ id: 'layer', positions: layerOpen.flatMap(s => s.positions) }]).get('layer')! } : null;

  return <section className="build" aria-label="Bauanleitung">
    <header className="build-head">
      <div className="build-progress">
        <span className="panel-kicker">FORTSCHRITT · MANUELL ABGEHAKT</span>
        <strong>{progress.done} / {total} Schritte</strong>
        <div className="build-bar" role="progressbar" aria-label="Gesetzte Blöcke laut Haken" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><span style={{ width: `${pct}%` }} /></div>
        <small>{formatNumber(progress.blocksDone)} von {formatNumber(guide.totals.blocks)} Blöcken ({pct} %){progress.review > 0 && <> · <em className="badge review">{progress.review} prüfbedürftig</em></>}</small>
      </div>
      <label className="build-basis">Grundlage
        <select value={basis} onChange={e => { setBasis(e.target.value); setSelectedId(null); }}>
          <option value="working">Aktueller Arbeitsstand</option>
          {project.revisions.map(r => <option key={r.id} value={r.id}>Revision {r.number}{r.comment ? ` – ${r.comment}` : ''}</option>)}
        </select>
      </label>
      <p className="muted build-honesty">Haken sind manuelle Angaben, keine Messung im Spiel. Ändert sich die Geometrie eines Schritts, wird sein Haken „prüfbedürftig“.</p>
    </header>

    {guide.warnings.length > 0 && <div className="notice warning build-wide" role="alert"><strong>Plan noch nicht endgültig</strong><ul>{guide.warnings.map(w => <li key={w}>{w}</li>)}</ul></div>}
    {reviewSteps.length > 0 && <div className="notice warning build-wide" role="status">
      <strong>{reviewSteps.length} abgehakte Schritte wurden seit dem Haken geändert.</strong> Bitte im Spiel nachsehen und erneut bestätigen oder den Haken entfernen.
      <div className="button-row"><button onClick={() => setFilter('review')}>Nur prüfbedürftige zeigen</button>
        <button onClick={() => run(untickSteps(reviewSteps.map(s => s.id), 'Prüfbedürftige Haken entfernt'))}>Alle diese Haken entfernen</button></div></div>}
    {progress.orphaned.length > 0 && <div className="notice build-wide" role="status">
      {progress.orphaned.length} gespeicherte Haken gehören zu Schritten, die es nicht mehr gibt (Bauteil entfernt oder Schicht leer).
      <button onClick={() => run(untickSteps(progress.orphaned, 'Verwaiste Haken entfernt'))}>Verwaiste Haken entfernen</button></div>}
    <GameCheckPanel scan={scan} check={game} targetError={targetError || (basisMismatch ? `Die Aufnahme gehört zu Revision ${scanRevision!.number}. Wähle diese Grundlage, um den Abgleich zu sehen.` : '')}
      revisionNumber={scanRevision?.number ?? null} alignment={alignment} manual={!!scan && !scanRevision && !targetError} onAlignment={setManualAlign}
      onLoad={loadScan} onClear={() => setScan(null)} onSelect={setSelectedId}
      confirmable={game ? confirmedUnticked(guide, game, status) : []} contradicted={game ? tickedButNotBuilt(guide, game, status) : []}
      onTickConfirmed={() => game && run(tickConfirmed(guide, game, status))} />
    {message && <div className="notice warning build-wide" role="alert">{message}<button onClick={() => setMessage('')}>OK</button></div>}

    <aside className="build-list" aria-label="Schritte">
      <div className="chips" role="group" aria-label="Filter">
        {(['all', 'todo', 'review'] as const).map(f => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === 'all' ? 'Alle' : f === 'todo' ? 'Nicht erledigt' : 'Prüfbedürftig'}</button>)}
      </div>
      {site.sections.length > 0 && <label className="build-section-filter">Bauabschnitt
        <select value={sectionId} onChange={e => setSectionId(e.target.value)} aria-label="Bauabschnitt filtern">
          <option value="">Alle Abschnitte</option>
          {site.sections.map((s, i) => <option key={s.id} value={s.id}>{i + 1}. {s.name}</option>)}
          <option value="~">Ohne Abschnitt</option>
        </select></label>}
      {visibleSteps.length === 0 && <p className="muted">Keine Schritte in diesem Filter.</p>}
      {[...byLayer.entries()].map(([y, steps]) => <div key={y} className="build-layer">
        <span className="panel-kicker">SCHICHT Y {y}</span>
        <ol className="step-list">{steps.map(s => {
          const st = status(s.id), g = game?.steps.get(s.id);
          return <li key={s.id}><button aria-current={s.id === step?.id ? 'step' : undefined} className={`step-item ${st}`} onClick={() => setSelectedId(s.id)}>
            <span className="step-no">{s.order}</span>
            <span><strong>{PHASE_LABEL[s.phase]}</strong><small>{s.sectionName} · {s.blocks ? `${formatNumber(s.blocks)} Blöcke` : `${s.air + s.erase} Zellen`}</small></span>
            <span className="step-badges"><em className={`badge ${st}`}>{st === 'open' && ready.has(s.id) ? 'bereit' : STATUS_LABEL[st]}</em>
              {g && <em className={`badge game ${GAME_BADGE[g.status]}`}>{gameStatusText(g.status, g.ok, g.total)}</em>}</span>
          </button></li>;
        })}</ol>
      </div>)}
    </aside>

    {step && <StepDetail step={step} guide={guide} status={status} game={game} ready={ready.has(step.id)} world={source && 'resolution' in source ? source.resolution : null}
      items={stepItems?.get(step.id) ?? null} layerItems={layerItems}
      show3d={show3d} setShow3d={setShow3d} onSelect={setSelectedId}
      onTick={() => tick(step)} onUntick={() => run(untickStep(step.id))}
      onNext={() => { const n = nextOpen(step); if (n) setSelectedId(n.id); }}
      onPrev={() => { const p = guide.steps[step.order - 2]; if (p) setSelectedId(p.id); }}
      onTickLayer={() => run(tickSteps(layerSteps.filter(s => status(s.id) !== 'done'), `Schicht Y ${step.y} abgehakt`))} />}
  </section>;
}

interface DetailProps {
  step: GuideStep; guide: Guide; status: (id: string) => StepStatus; game: GameCheck | null; ready: boolean; world: Resolution | null;
  items: MaterialReport | null; layerItems: { y: number; steps: number; report: MaterialReport } | null;
  show3d: boolean; setShow3d(v: boolean): void; onSelect(id: string): void;
  onTick(): void; onUntick(): void; onNext(): void; onPrev(): void; onTickLayer(): void;
}

function StepDetail({ step, guide, status, game, ready, world, items, layerItems, show3d, setShow3d, onSelect, onTick, onUntick, onNext, onPrev, onTickLayer }: DetailProps) {
  const st = status(step.id);
  const waiting = step.prerequisites.filter(p => status(p) !== 'done');
  const g = game?.steps.get(step.id);
  const deviations = useMemo(() => game ? [...game.deviations.values()].filter(d => d.stepId === step.id) : [], [game, step.id]);
  return <article className="build-step" aria-label={`Schritt ${step.order}`}>
    <header>
      <span className="panel-kicker">SCHRITT {step.order} VON {guide.steps.length}</span>
      <h2>{stepTitle(step)}</h2>
      <p className="build-check">{step.check}</p>
      <em className={`badge ${st}`}>{STATUS_LABEL[st]}{st === 'open' && ready ? ' · bereit' : ''}</em>
    </header>
    {g && <div className={`game-step ${g.status}`} role="status"><strong>{gameStatusText(g.status, g.ok, g.total)}</strong>
      {deviations.length > 0 && <ul>{deviations.slice(0, 8).map(d => <li key={d.position.join(',')}>X {d.position[0]} · Y {d.position[1]} · Z {d.position[2]}: {VERDICT_LABEL[d.verdict]}
        {d.verdict !== 'unknown' && <> – geplant <code>{d.expected}</code>{d.actual && <>, im Spiel <code>{d.actual}</code></>}</>}</li>)}
        {deviations.length > 8 && <li>… und {deviations.length - 8} weitere (rot umrandet im Schichtplan)</li>}</ul>}</div>}
    {st === 'review' && <p className="notice warning" role="status">Die Geometrie dieses Schritts hat sich seit dem Haken geändert. Im Spiel prüfen, dann erneut bestätigen.</p>}
    {waiting.length > 0 && st !== 'done' && <div className="build-wait"><strong>Vorher erledigen ({waiting.length}):</strong>
      <ul>{waiting.slice(0, 6).map(id => { const p = guide.byId.get(id)!; return <li key={id}><button className="link-button" onClick={() => onSelect(id)}>{p.order}. {stepTitle(p)}</button> – {STATUS_LABEL[status(id)]}</li>; })}
        {waiting.length > 6 && <li>… und {waiting.length - 6} weitere</li>}</ul></div>}
    <div className="build-actions">
      <button onClick={onPrev} disabled={step.order === 1} aria-label="Vorheriger Schritt">←</button>
      {st === 'done' ? <button onClick={onUntick}>Haken entfernen</button>
        : <button className="primary" onClick={onTick}>{st === 'review' ? '✓ Erneut bestätigen' : '✓ Abhaken'}</button>}
      {st === 'review' && <button onClick={onUntick}>Haken entfernen</button>}
      <button onClick={onNext} aria-label="Nächster offener Schritt">Weiter →</button>
    </div>

    {step.materials.length > 0 && <table className="build-materials"><caption>Gesetzte Blockzustände in diesem Schritt</caption>
      <thead><tr><th>Block</th><th>Anzahl</th></tr></thead>
      <tbody>{step.materials.map(m => <tr key={m.key}><td><i style={{ background: stateColor(m.state.id) }} aria-hidden="true" /><code>{stateText(m.state)}</code></td><td>{formatNumber(m.count)}</td></tr>)}</tbody></table>}
    {items && <StepItems report={items} />}
    {(step.air > 0 || step.erase > 0) && <p className="muted">{step.air > 0 && `${step.air} Zellen ausdrücklich Luft (freihalten). `}{step.erase > 0 && `${step.erase} Zellen abbauen/löschen.`}</p>}
    {step.notes.length > 0 && <ul className="build-notes">{step.notes.map(n => <li key={n}>{n}</li>)}</ul>}

    {world?.world && <LayerPlan step={step} guide={guide} status={status} resolution={world} deviations={game?.deviations ?? null} />}
    <div className="button-row">
      <button onClick={onTickLayer}>Ganze Schicht Y {step.y} abhaken</button>
      <button aria-pressed={show3d} onClick={() => setShow3d(!show3d)}>3D-Ansicht {show3d ? 'ausblenden' : 'zeigen'}</button>
    </div>
    {layerItems && <details className="build-pack">
      <summary>Packliste Schicht Y {layerItems.y} · {layerItems.steps ? `${layerItems.steps} offene Schritte, ${formatNumber(layerItems.report.totals.items)} Items in ${formatNumber(layerItems.report.totals.slots)} Plätzen` : 'alles abgehakt'}</summary>
      {layerItems.steps > 0 ? <StepItems report={layerItems.report} caption={`Noch zu setzen in Schicht Y ${layerItems.y}`} storage /> : <p className="muted">Alle Schritte dieser Schicht sind abgehakt.</p>}
    </details>}
    {show3d && world?.world && <Step3d step={step} guide={guide} status={status} resolution={world} />}
    <p className="hash" title="Änderungserkennung, kein Integritätsnachweis">Schritt-ID {step.id} · Geometrie {step.geometryHash}</p>
  </article>;
}

/** Build items of a step or layer (rules and assumptions from the material tab). */
function StepItems({ report, caption = 'Benötigte Bauitems', storage = false }: { report: MaterialReport; caption?: string; storage?: boolean }) {
  if (!report.items.length && !report.unresolved.length) return null;
  return <>
    <table className="build-materials build-items"><caption>{caption}</caption>
      <thead><tr><th>Item</th><th>Stacks</th><th>Menge</th></tr></thead>
      <tbody>{report.items.map(l => <tr key={l.itemId} className={l.confidence === 'assumed' ? 'assumed' : undefined}>
        <td><i style={{ background: stateColor(l.itemId) }} aria-hidden="true" /><code>{shortId(l.itemId)}</code>
          {l.confidence === 'assumed' && <em className="badge review" title={[...new Set(l.sources.map(s => s.note).filter(Boolean))].join(' · ')}>Annahme</em>}</td>
        <td>{formatStacks(l)}</td><td>{formatNumber(l.count)}</td></tr>)}</tbody>
    </table>
    {report.unresolved.length > 0 && <p className="muted build-unresolved">Ohne Itemzuordnung: {report.unresolved.map(u => `${shortId(u.state.id)} × ${u.count} (${u.message})`).join(' · ')}</p>}
    {storage && <p className="muted">{formatNumber(report.totals.slots)} Inventarplätze · {formatNumber(report.totals.shulkerBoxes)} Shulkerkisten{report.totals.unpackableSlots ? ` + ${report.totals.unpackableSlots} lose` : ''}{report.conflicts ? ' · vorläufig wegen Voxelkonflikten' : ''}</p>}
  </>;
}

/** Top-down plan of the step's layer: current step bright, rest of the layer dimmed, coordinates on both axes. */
function LayerPlan({ step, guide, status, resolution, deviations }: { step: GuideStep; guide: Guide; status: (id: string) => StepStatus; resolution: Resolution; deviations: ReadonlyMap<string, CellDeviation> | null }) {
  const world = resolution.world!;
  const { cells, region } = useMemo(() => {
    const own = new Set(step.positions.map(positionKey));
    const stepOf = new Map<string, GuideStep>();
    for (const s of guide.steps) if (s.y === step.y) for (const p of s.positions) stepOf.set(positionKey(p), s);
    let min = [world.bounds.min[0], world.bounds.min[2]], max = [world.bounds.maxExclusive[0], world.bounds.maxExclusive[2]];
    if (max[0]! - min[0]! > MAX_GRID || max[1]! - min[1]! > MAX_GRID) {
      min = [step.bounds.min[0] - 2, step.bounds.min[2] - 2]; max = [Math.min(step.bounds.maxExclusive[0] + 2, min[0]! + MAX_GRID), Math.min(step.bounds.maxExclusive[2] + 2, min[1]! + MAX_GRID)];
    }
    const out: { x: number; z: number; fill: string; label: string; own: boolean; dev: string }[] = [];
    for (const c of world.cells) {
      const [x, y, z] = c.position;
      if (y !== step.y || x < min[0]! || x >= max[0]! || z < min[1]! || z >= max[1]!) continue;
      const key = positionKey(c.position), s = stepOf.get(key);
      const state = c.kind === 'erase' ? null : world.palette[c.paletteIndex]!;
      const base = c.kind === 'block' ? stateColor(state!.id) : c.kind === 'erase' ? '#d35f5f' : '#2a4552';
      const mine = own.has(key);
      const fill = mine ? base : s && status(s.id) === 'done' ? mix(base, DONE, 0.6) : mix(base, DIM, 0.7);
      const dev = deviations?.get(key);
      out.push({ x, z, fill, own: mine, dev: dev ? `dev ${dev.verdict}` : '', label: `X ${x} · Y ${y} · Z ${z}: ${c.kind === 'erase' ? 'löschen' : c.kind === 'air' ? 'Luft' : stateText(state!)}${s ? ` (Schritt ${s.order})` : ''}${dev ? ` · im Spiel: ${VERDICT_LABEL[dev.verdict]}${dev.actual ? ` (${dev.actual})` : ''}` : ''}` });
    }
    return { cells: out, region: { min, max } };
  }, [step, guide, status, world, deviations]);
  const w = region.max[0]! - region.min[0]!, h = region.max[1]! - region.min[1]!;
  const tickEvery = Math.max(1, Math.ceil(Math.max(w, h) / 12));
  return <figure className="layer-plan">
    <figcaption>Draufsicht Schicht Y {step.y} · Norden oben (−Z), Osten rechts (+X)</figcaption>
    <svg viewBox={`-2 -2 ${w + 3} ${h + 3}`} role="img" aria-label={`Schichtplan Y ${step.y} mit ${step.positions.length} Zellen dieses Schritts`}>
      {Array.from({ length: w }, (_, i) => i % tickEvery === 0 && <text key={`x${i}`} x={i + 0.5} y={-0.6} className="axis">{region.min[0]! + i}</text>)}
      {Array.from({ length: h }, (_, i) => i % tickEvery === 0 && <text key={`z${i}`} x={-0.6} y={i + 0.75} className="axis end">{region.min[1]! + i}</text>)}
      <rect x={0} y={0} width={w} height={h} className="plan-bg" />
      {cells.map(c => <rect key={`${c.x},${c.z}`} x={c.x - region.min[0]!} y={c.z - region.min[1]!} width={0.94} height={0.94} fill={c.fill} className={[c.own ? 'own' : '', c.dev].filter(Boolean).join(' ') || undefined}><title>{c.label}</title></rect>)}
    </svg>
  </figure>;
}

function Step3d({ step, guide, status, resolution }: { step: GuideStep; guide: Guide; status: (id: string) => StepStatus; resolution: Resolution }) {
  const world = resolution.world!;
  const visible = useMemo(() => selectLayers(world, 'y', world.bounds.min[1], step.y + 1), [world, step.y]);
  const own = useMemo(() => new Set(step.positions.map(positionKey)), [step]);
  const doneKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const s of guide.steps) if (status(s.id) === 'done') for (const p of s.positions) keys.add(positionKey(p));
    return keys;
  }, [guide, status]);
  const colorFor = useCallback((cell: Cell) => {
    const key = positionKey(cell.position), base = cell.kind === 'erase' ? '#d35f5f' : stateColor(world.palette[cell.paletteIndex]!.id);
    return own.has(key) ? base : mix(base, doneKeys.has(key) ? DONE : DIM, 0.6);
  }, [own, doneKeys, world]);
  const noop = useCallback(() => {}, []);
  return <div className="build-3d"><Viewer payload={world} cells={visible.cells} onSelect={noop} colorFor={colorFor} /></div>;
}
