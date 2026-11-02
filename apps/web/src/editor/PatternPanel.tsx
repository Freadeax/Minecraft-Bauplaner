import { useMemo } from 'react';
import { GRADIENT_AXIS_LABEL, PATTERN_KIND_LABEL, PATTERN_PRESETS, patternAt, sameSlot } from '../../../../packages/domain/src/index.js';
import type { CellSlot, GradientAxis, Pattern, PatternAxis, PatternKind, PatternValue } from '../../../../packages/domain/src/index.js';
import { brushColor, brushLabel, stateText } from './BlockPalette';

/**
 * Muster-Pinsel (EDIT-03): editable state of the pattern panel. The domain
 * pattern is derived from it with `toPattern`; in "Einzelblock" mode (or
 * without entries) the plain brush is used, exactly as before.
 */
export interface PatternState {
  readonly kind: PatternKind;
  readonly entries: readonly { readonly value: PatternValue; readonly weight: number }[];
  readonly gradientAxis: GradientAxis;
  readonly stripeAxis: PatternAxis;
  readonly blend: number;
  readonly seed: number;
  readonly size: number;
  readonly width: number;
  readonly reverse: boolean;
}
export const INITIAL_PATTERN: PatternState = { kind: 'single', entries: [], gradientAxis: 'y', stripeAxis: 'x', blend: 0.5, seed: 1, size: 1, width: 1, reverse: false };

export function toPattern(s: PatternState, brush: CellSlot): Pattern {
  if (s.kind === 'single' || !s.entries.length) return { kind: 'single', value: brush };
  const values = s.entries.map(e => e.value);
  switch (s.kind) {
    case 'mix': return { kind: 'mix', seed: s.seed, entries: s.entries };
    case 'gradient': return { kind: 'gradient', stops: values, axis: s.gradientAxis, blend: s.blend, seed: s.seed, reverse: s.reverse };
    case 'checker': return { kind: 'checker', entries: values, size: s.size };
    case 'stripes': return { kind: 'stripes', entries: values, axis: s.stripeAxis, width: s.width };
  }
}
/** Pattern state from a preset (entries with their weights). */
export function fromPattern(p: Pattern, base: PatternState): PatternState {
  switch (p.kind) {
    case 'single': return { ...base, kind: 'single', entries: [] };
    case 'mix': return { ...base, kind: 'mix', entries: p.entries, seed: p.seed };
    case 'gradient': return { ...base, kind: 'gradient', entries: p.stops.map(value => ({ value, weight: 1 })), gradientAxis: p.axis, blend: p.blend, seed: p.seed, reverse: !!p.reverse };
    case 'checker': return { ...base, kind: 'checker', entries: p.entries.map(value => ({ value, weight: 1 })), size: p.size };
    case 'stripes': return { ...base, kind: 'stripes', entries: p.entries.map(value => ({ value, weight: 1 })), stripeAxis: p.axis, width: p.width };
  }
}
export const patternActive = (s: PatternState) => s.kind !== 'single' && s.entries.length > 0;
export const valueLabel = (v: PatternValue) => v === 'keep' ? 'Lücke (Block bleibt)' : brushLabel(v);
export const valueColor = (v: PatternValue) => v === 'keep' ? 'transparent' : brushColor(v);
const valueKey = (v: PatternValue) => v === 'keep' ? 'keep' : !v ? 'null' : v.kind === 'block' ? stateText(v.state) : v.kind;

/** Panel under the brush: mode, entries with weights/order, presets, axis, blend and a sample strip. */
export function PatternPanel({ state, onChange, brush }: { state: PatternState; onChange: (s: PatternState) => void; brush: CellSlot }) {
  const set = (patch: Partial<PatternState>) => onChange({ ...state, ...patch });
  const entries = state.entries;
  const add = (value: PatternValue) => {
    if (state.kind !== 'gradient' && entries.some(e => value !== 'keep' && e.value !== 'keep' && sameSlot(e.value, value))) return;
    set({ entries: [...entries, { value, weight: state.kind === 'mix' ? (value === 'keep' ? 3 : 1) : 1 }], ...(state.kind === 'single' && { kind: 'mix' as const }) });
  };
  const move = (i: number, d: number) => { const next = [...entries], j = i + d; if (j < 0 || j >= next.length) return; [next[i], next[j]] = [next[j]!, next[i]!]; set({ entries: next }); };
  const total = entries.reduce((s, e) => s + e.weight, 0) || 1;
  // Sample strip: 24 × 6 cells of the pattern in the X/Y plane (gradients along their axis).
  const sample = useMemo(() => {
    if (!patternActive(state)) return null;
    const p = toPattern(state, brush), rows: PatternValue[][] = [];
    const extent = { min: [0, 0, 0] as const, max: [23, 5, 23] as const };
    for (let y = 5; y >= 0; y--) {
      const row: PatternValue[] = [];
      for (let x = 0; x < 24; x++) {
        const pos: [number, number, number] = state.kind === 'gradient' && state.gradientAxis !== 'y' ? [x, y, state.gradientAxis === 'z' ? x : y * 4] : [x, state.kind === 'gradient' ? Math.round(y * 23 / 5) : y, 0];
        try { row.push(patternAt(p, pos, { min: [...extent.min], max: [...extent.max] })); } catch { row.push('keep'); }
      }
      rows.push(row);
    }
    return rows;
  }, [state, brush]);

  return <section className="pattern-panel" aria-label="Muster-Pinsel">
    <span className="panel-kicker">MUSTER</span>
    <div className="seg pattern-kinds" role="radiogroup" aria-label="Musterart">
      {(Object.keys(PATTERN_KIND_LABEL) as PatternKind[]).map(k => <button key={k} role="radio" aria-checked={state.kind === k} onClick={() => set({ kind: k })}>{PATTERN_KIND_LABEL[k]}</button>)}
    </div>
    <label>Vorlage<select value="" onChange={e => { const p = PATTERN_PRESETS.find(x => x.id === e.target.value); if (p) onChange(fromPattern(p.pattern, state)); }} aria-label="Mustervorlage">
      <option value="">– Mustervorlage wählen –</option>
      {PATTERN_PRESETS.map(p => <option key={p.id} value={p.id} title={p.hint}>{p.label}</option>)}
    </select></label>
    {state.kind !== 'single' && <>
      <ul className="pattern-entries" aria-label="Mustereinträge">
        {entries.map((e, i) => <li key={`${valueKey(e.value)}-${i}`}>
          <span className={`swatch small${e.value === 'keep' ? ' keep' : ''}`} style={{ background: valueColor(e.value) }} aria-hidden="true" />
          <span className="entry-name" title={e.value !== 'keep' && e.value?.kind === 'block' ? stateText(e.value.state) : valueLabel(e.value)}>{valueLabel(e.value)}</span>
          {state.kind === 'mix' && <input type="number" min={0} max={100} value={e.weight} aria-label={`Gewicht ${valueLabel(e.value)}`} title={`${Math.round(e.weight / total * 100)} %`}
            onChange={ev => set({ entries: entries.map((x, j) => j === i ? { ...x, weight: Math.max(0, Math.min(100, Number(ev.target.value) || 0)) } : x) })} />}
          {state.kind !== 'mix' && <><button onClick={() => move(i, -1)} disabled={i === 0} aria-label={`${valueLabel(e.value)} nach vorn`}>↑</button><button onClick={() => move(i, 1)} disabled={i === entries.length - 1} aria-label={`${valueLabel(e.value)} nach hinten`}>↓</button></>}
          <button onClick={() => set({ entries: entries.filter((_, j) => j !== i) })} aria-label={`${valueLabel(e.value)} entfernen`}>✕</button>
        </li>)}
      </ul>
      <div className="button-grid">
        <button onClick={() => add(brush)} title="Den aktuellen Pinsel (Block aus der Palette) als Eintrag aufnehmen">+ Pinsel</button>
        <button onClick={() => add('keep')} title="Lücke: an diesen Stellen bleibt der vorhandene Block (zum Verwittern beim Ersetzen)">+ Lücke</button>
      </div>
      {!entries.length && <p className="muted small">Block in der Palette wählen, dann „+ Pinsel“. Ohne Einträge malt der einfache Pinsel.</p>}
      {state.kind === 'gradient' && <>
        <label>Richtung<select value={state.gradientAxis} onChange={e => set({ gradientAxis: e.target.value as GradientAxis })} aria-label="Verlaufsrichtung">
          {(Object.keys(GRADIENT_AXIS_LABEL) as GradientAxis[]).map(a => <option key={a} value={a}>{GRADIENT_AXIS_LABEL[a]}</option>)}</select></label>
        <label>Übergang weich ({Math.round(state.blend * 100)} %)<input type="range" min={0} max={1} step={0.1} value={state.blend} onChange={e => set({ blend: Number(e.target.value) })} aria-label="Übergang" /></label>
        <label className="check"><input type="checkbox" checked={state.reverse} onChange={e => set({ reverse: e.target.checked })} /> umkehren</label>
      </>}
      {state.kind === 'checker' && <label>Feldgröße<input type="number" min={1} max={64} value={state.size} onChange={e => set({ size: Math.max(1, Math.min(64, Math.trunc(Number(e.target.value)) || 1)) })} aria-label="Feldgröße" /></label>}
      {state.kind === 'stripes' && <div className="sel-range">
        <label>Richtung<select value={state.stripeAxis} onChange={e => set({ stripeAxis: e.target.value as PatternAxis })} aria-label="Streifenrichtung">
          <option value="x">quer zu X</option><option value="y">waagrecht (Y)</option><option value="z">quer zu Z</option></select></label>
        <label>Breite<input type="number" min={1} max={64} value={state.width} onChange={e => set({ width: Math.max(1, Math.min(64, Math.trunc(Number(e.target.value)) || 1)) })} aria-label="Streifenbreite" /></label>
      </div>}
      {(state.kind === 'mix' || state.kind === 'gradient') && <button onClick={() => set({ seed: (state.seed * 1103515245 + 12345) % 2147483647 || 1 })} title="Andere, aber wieder feste Verteilung">🎲 Neu würfeln</button>}
      {sample && <div className="pattern-sample" aria-label="Mustervorschau" role="img">
        {sample.map((row, y) => <div key={y}>{row.map((v, x) => <span key={x} style={{ background: valueColor(v) }} className={v === 'keep' ? 'keep' : ''} />)}</div>)}
      </div>}
    </>}
  </section>;
}
