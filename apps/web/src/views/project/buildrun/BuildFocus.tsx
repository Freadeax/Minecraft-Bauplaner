import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { formatStacks, GAME_STATUS_LABEL, PHASE_LABEL, STEP_PROOF_LABEL, STEP_PROOF_MARK } from '../../../../../../packages/domain/src/index.js';
import type { BuildAnchor, CellLookup, GameCheck, Guide, GuideStep, MaterialReport, SectionPlan, StepProof, StepStatus } from '../../../../../../packages/domain/src/index.js';
import type { VoxelPayload } from '../../../../../../packages/voxel/src/index.js';
import { formatNumber } from '../../../app/ui';
import { shortItem } from './PackList';
import { StepRows, useStepRuns } from './StepRows';
import { FurnishList } from '../FurnishList';
import { LayerPlan } from './LayerPlan';

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
  /** FLOW-01: Nachweis des Schritts und Packliste seines Bauabschnitts (offene Schritte, Lager in Bau-Reihenfolge). */
  proof: StepProof; section: SectionPlan | null;
  /** Läuft als eigenes Fenster neben dem Spiel (Zweitbildschirm/Tablet). */
  secondScreen: boolean; onSecondScreen(): void;
  onTick(): void; onUntick(): void; onPrev(): void; onNext(): void; onExit(): void; onSelect(id: string): void;
}

/**
 * Baumodus (BUILD-06, FLOW-01) für Handy, Tablet und Zweitbildschirm: ein Schritt groß, daneben der große
 * Schichtplan, Bauitems als Chips, Reihen mit Kästchen (nur Lesehilfe in diesem Tab, `sessionStorage`), die
 * Packliste des Bauabschnitts und eine große Schaltfläche „Abhaken & weiter“ in Bautag-Reihenfolge.
 * Tastatur: ← / → blättern, Leertaste oder Enter hakt ab. Nur „Abhaken“ ändert das Projekt.
 */
export function BuildFocus(p: Props) {
  const { step } = p;
  const runs = useStepRuns(step, p.world, p.lookup);
  const rowKey = `${step.id}@${step.geometryHash}`;
  const [rows, setRows] = useState<Set<number>>(() => loadRows(rowKey));
  useEffect(() => setRows(loadRows(rowKey)), [rowKey]);
  const toggle = (i: number) => setRows(prev => { const next = new Set(prev); if (next.has(i)) next.delete(i); else next.add(i); saveRows(rowKey, next); return next; });
  const wake = useWakeLock();
  const root = useRef<HTMLElement | null>(null);
  const full = useFullscreen(root);
  const st = p.status(step.id), g = p.game?.steps.get(step.id);
  const waiting = step.prerequisites.filter(id => p.status(id) !== 'done');
  const pct = Math.min(100, Math.round(p.today.blocks / p.today.goal * 100));
  const o = p.anchor.origin;
  // Keyboard for a second screen or a tablet with keyboard: ←/→ and Space/Enter, never while typing.
  const keys = useRef(p); keys.current = p;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.altKey || e.ctrlKey || e.metaKey || (t && (t.closest('input, select, textarea, [contenteditable=true]') || (t.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter'))))) return;
      const k = keys.current;
      if (e.key === 'ArrowRight') { e.preventDefault(); k.onNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); k.onPrev(); }
      else if ((e.key === ' ' || e.key === 'Enter') && k.status(k.step.id) !== 'done') { e.preventDefault(); k.onTick(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const pack = p.section ? p.section.items.filter(i => i.need > 0) : [];
  return <section ref={root} className={`focus build-wide${p.secondScreen ? ' second-screen' : ''}`} aria-label="Baumodus">
    <header className="focus-head">
      <button onClick={p.onExit}>← Schrittliste</button>
      <div className="focus-today" title="Heute abgehakte Blöcke im Verhältnis zum Tagesziel">
        <small>Heute {formatNumber(p.today.blocks)} / {formatNumber(p.today.goal)}</small>
        <div className="build-bar" role="progressbar" aria-label="Tagesziel" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><span style={{ width: `${pct}%` }} /></div>
      </div>
      {wake.supported && <button aria-pressed={wake.active} onClick={wake.toggle}>{wake.active ? 'Bildschirm bleibt an' : 'Bildschirm anlassen'}</button>}
      {full.supported && <button aria-pressed={full.active} onClick={full.toggle}>{full.active ? 'Vollbild beenden' : 'Vollbild'}</button>}
      {!p.secondScreen && <button onClick={p.onSecondScreen} title="Öffnet den Baumodus in einem eigenen Fenster für den zweiten Bildschirm. Haken erscheinen in beiden Fenstern.">Zweitbildschirm</button>}
    </header>
    <div className="focus-body">
      {p.world && <div className="focus-plan"><LayerPlan step={step} guide={p.guide} status={p.status} resolution={{ world: p.world }} deviations={p.game?.deviations ?? null} big /></div>}
      <div className="focus-main">
        <div className="focus-card">
          <span className="panel-kicker">SCHRITT {step.order} · {p.position.index + 1} VON {p.position.total} OFFENEN{p.position.day ? ` · BAUTAG ${p.position.day}` : ''}</span>
          <h2>{PHASE_LABEL[step.phase]} · Y {step.y}{o ? <small> Welt-Y {step.y + o[1]}</small> : null}</h2>
          <p className="focus-section">{step.sectionName}</p>
          <div className="focus-badges">
            <em className={`badge proof ${p.proof}`} data-proof={p.proof}>{STEP_PROOF_MARK[p.proof]} {STEP_PROOF_LABEL[p.proof]}</em>
            {g && <em className={`badge game ${g.status === 'confirmed' ? 'ok' : g.status === 'deviating' ? 'danger' : 'open'}`}>{GAME_STATUS_LABEL[g.status]}</em>}
          </div>
          <p className="build-check">{step.check}</p>
          {waiting.length > 0 && st !== 'done' && <p className="build-wait">Vorher: {waiting.slice(0, 3).map(id => { const w = p.guide.byId.get(id)!;
            return <button key={id} className="link-button" onClick={() => p.onSelect(id)}>Schritt {w.order}</button>; }).reduce<ReactNode[]>((a, b, i) => i ? [...a, ', ', b] : [b], [])}{waiting.length > 3 ? ` und ${waiting.length - 3} weitere` : ''}</p>}
          {p.items && p.items.items.length > 0 && <ul className="focus-items" aria-label="Bauitems dieses Schritts">{p.items.items.map(l => <li key={l.itemId}><code>{shortItem(l.itemId)}</code><span>{formatNumber(l.count)}{l.count > l.stackSize ? ` · ${formatStacks(l)}` : ''}</span></li>)}</ul>}
          <FurnishList step={step} />
          <StepRows runs={runs} anchor={p.anchor} big checked={rows} onToggle={toggle} />
          {step.notes.length > 0 && <ul className="build-notes">{step.notes.map(n => <li key={n}>{n}</li>)}</ul>}
          {runs.length > 0 && <p className="muted">{rows.size} von {runs.length} Reihen als gesetzt markiert (nur Lesehilfe in diesem Tab).</p>}
        </div>
        {p.section && <details className="focus-pack" open={!!p.secondScreen || undefined} data-testid="focus-pack">
          <summary>Packliste Abschnitt „{p.section.name}“ <small>{p.section.open + p.section.review} offene Schritte · {formatNumber(pack.reduce((n, i) => n + i.need, 0))} Items</small></summary>
          {pack.length === 0 ? <p className="muted">Alles in diesem Abschnitt ist abgehakt.</p> : <table className="build-materials focus-pack-table">
            <thead><tr><th>Item</th><th className="num">Bedarf</th><th className="num">aus Lager</th><th className="num">besorgen</th></tr></thead>
            <tbody>{pack.map(i => <tr key={i.itemId}><td><code>{shortItem(i.itemId)}</code>{i.assumed && <em className="badge review">Annahme</em>}</td>
              <td className="num">{formatNumber(i.need)}</td><td className="num">{formatNumber(i.fromStock)}</td><td className={`num${i.missing ? ' bad' : ''}`}>{formatNumber(i.missing)}</td></tr>)}</tbody>
          </table>}
        </details>}
      </div>
    </div>
    <div className="focus-actions">
      <button onClick={p.onPrev} aria-label="Vorheriger Schritt" title="Vorheriger Schritt (←)">←</button>
      {st === 'done' ? <button onClick={p.onUntick}>Haken entfernen</button>
        : <button className="primary" onClick={p.onTick} title="Leertaste">{st === 'review' ? '✓ Erneut bestätigen & weiter' : '✓ Abhaken & weiter'}</button>}
      <button onClick={p.onNext} aria-label="Nächster Schritt" title="Nächster Schritt (→)">→</button>
    </div>
  </section>;
}

/** Vollbild für den Baumodus (Fullscreen API), wo der Browser sie anbietet. */
function useFullscreen(root: { current: HTMLElement | null }): { supported: boolean; active: boolean; toggle(): void } {
  const supported = typeof document !== 'undefined' && !!document.fullscreenEnabled;
  const [active, setActive] = useState(false);
  useEffect(() => {
    const on = () => setActive(document.fullscreenElement === root.current && !!root.current);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, [root]);
  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void root.current?.requestFullscreen().catch(() => undefined);
  };
  return { supported, active, toggle };
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
