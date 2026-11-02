import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { formatStacks, GAME_STATUS_LABEL, PHASE_LABEL } from '../../../../../../packages/domain/src/index.js';
import type { BuildAnchor, CellLookup, GameCheck, Guide, GuideStep, MaterialReport, StepStatus } from '../../../../../../packages/domain/src/index.js';
import type { VoxelPayload } from '../../../../../../packages/voxel/src/index.js';
import { formatNumber } from '../../../app/ui';
import { shortItem } from './PackList';
import { StepRows, useStepRuns } from './StepRows';
import { FurnishList } from '../FurnishList';

const ROWS_KEY = 'bauplaner.focusRows';
type WakeLock = { release(): Promise<void>; addEventListener(type: 'release', cb: () => void): void };

function loadRows(key: string): Set<number> {
  try { const raw = sessionStorage.getItem(ROWS_KEY); const all = raw ? JSON.parse(raw) as Record<string, number[]> : {}; return new Set(all[key] ?? []); } catch { return new Set(); }
}
function saveRows(key: string, rows: Set<number>): void {
  try { const raw = sessionStorage.getItem(ROWS_KEY); const all = raw ? JSON.parse(raw) as Record<string, number[]> : {}; all[key] = [...rows]; sessionStorage.setItem(ROWS_KEY, JSON.stringify(all)); } catch { /* private mode */ }
}

interface Props {
  step: GuideStep; guide: Guide; status(id: string): StepStatus; ready: boolean; position: { index: number; total: number; day: number | null };
  game: GameCheck | null; anchor: BuildAnchor; world: VoxelPayload; lookup: CellLookup; items: MaterialReport | null;
  today: { blocks: number; goal: number };
  onTick(): void; onUntick(): void; onPrev(): void; onNext(): void; onExit(): void; onSelect(id: string): void;
}

/**
 * Handy-Baumodus: one step at a time, large rows with local row checkboxes,
 * items of the step, one big tick button. Row checkboxes are a reading aid in
 * this browser tab only; only „Abhaken“ changes the project.
 */
export function BuildFocus(p: Props) {
  const { step } = p;
  const runs = useStepRuns(step, p.world, p.lookup);
  const rowKey = `${step.id}@${step.geometryHash}`;
  const [rows, setRows] = useState<Set<number>>(() => loadRows(rowKey));
  useEffect(() => setRows(loadRows(rowKey)), [rowKey]);
  const toggle = (i: number) => setRows(prev => { const next = new Set(prev); if (next.has(i)) next.delete(i); else next.add(i); saveRows(rowKey, next); return next; });
  const wake = useWakeLock();
  const st = p.status(step.id), g = p.game?.steps.get(step.id);
  const waiting = step.prerequisites.filter(id => p.status(id) !== 'done');
  const pct = Math.min(100, Math.round(p.today.blocks / p.today.goal * 100));
  const o = p.anchor.origin;
  return <section className="focus build-wide" aria-label="Baumodus">
    <header className="focus-head">
      <button onClick={p.onExit}>← Schrittliste</button>
      <div className="focus-today" title="Heute abgehakte Blöcke im Verhältnis zum Tagesziel">
        <small>Heute {formatNumber(p.today.blocks)} / {formatNumber(p.today.goal)}</small>
        <div className="build-bar" role="progressbar" aria-label="Tagesziel" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><span style={{ width: `${pct}%` }} /></div>
      </div>
      {wake.supported && <button aria-pressed={wake.active} onClick={wake.toggle}>{wake.active ? 'Bildschirm bleibt an' : 'Bildschirm anlassen'}</button>}
    </header>
    <div className="focus-card">
      <span className="panel-kicker">SCHRITT {step.order} · {p.position.index + 1} VON {p.position.total} OFFENEN{p.position.day ? ` · BAUTAG ${p.position.day}` : ''}</span>
      <h2>{PHASE_LABEL[step.phase]} · Y {step.y}{o ? <small> Welt-Y {step.y + o[1]}</small> : null}</h2>
      <p className="focus-section">{step.sectionName}</p>
      <div className="focus-badges">
        <em className={`badge ${st}`}>{st === 'done' ? 'abgehakt' : st === 'review' ? 'prüfbedürftig' : p.ready ? 'bereit' : 'offen'}</em>
        {g && <em className={`badge game ${g.status === 'confirmed' ? 'ok' : g.status === 'deviating' ? 'danger' : 'open'}`}>{GAME_STATUS_LABEL[g.status]}</em>}
      </div>
      <p className="build-check">{step.check}</p>
      {waiting.length > 0 && st !== 'done' && <p className="build-wait">Vorher: {waiting.slice(0, 3).map(id => { const w = p.guide.byId.get(id)!;
        return <button key={id} className="link-button" onClick={() => p.onSelect(id)}>Schritt {w.order}</button>; }).reduce<ReactNode[]>((a, b, i) => i ? [...a, ', ', b] : [b], [])}{waiting.length > 3 ? ` und ${waiting.length - 3} weitere` : ''}</p>}
      {p.items && p.items.items.length > 0 && <ul className="focus-items" aria-label="Bauitems dieses Schritts">{p.items.items.map(l => <li key={l.itemId}><code>{shortItem(l.itemId)}</code><span>{formatNumber(l.count)}{l.count > l.stackSize ? ` · ${formatStacks(l)}` : ''}</span></li>)}</ul>}
      <FurnishList step={step} />
      <StepRows runs={runs} anchor={p.anchor} big checked={rows} onToggle={toggle} />
      {runs.length > 0 && <p className="muted">{rows.size} von {runs.length} Reihen als gesetzt markiert (nur Lesehilfe in diesem Tab).</p>}
      {step.notes.length > 0 && <ul className="build-notes">{step.notes.map(n => <li key={n}>{n}</li>)}</ul>}
    </div>
    <div className="focus-actions">
      <button onClick={p.onPrev} aria-label="Vorheriger Schritt">←</button>
      {st === 'done' ? <button onClick={p.onUntick}>Haken entfernen</button>
        : <button className="primary" onClick={p.onTick}>{st === 'review' ? '✓ Erneut bestätigen & weiter' : '✓ Abhaken & weiter'}</button>}
      <button onClick={p.onNext} aria-label="Nächster Schritt">→</button>
    </div>
  </section>;
}

/** Screen Wake Lock where the browser offers it (keeps the phone awake next to the game). */
function useWakeLock(): { supported: boolean; active: boolean; toggle(): void } {
  const nav = typeof navigator !== 'undefined' ? navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<WakeLock> } } : null;
  const supported = !!nav?.wakeLock;
  const lock = useRef<WakeLock | null>(null);
  const [active, setActive] = useState(false);
  const release = useCallback(() => { void lock.current?.release().catch(() => undefined); lock.current = null; setActive(false); }, []);
  useEffect(() => release, [release]);
  const toggle = () => {
    if (active) { release(); return; }
    void nav?.wakeLock?.request('screen').then(l => { lock.current = l; setActive(true); l.addEventListener('release', () => setActive(false)); }).catch(() => setActive(false));
  };
  return { supported, active, toggle };
}
