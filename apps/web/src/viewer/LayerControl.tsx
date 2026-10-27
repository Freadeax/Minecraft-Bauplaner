import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { selectLayers } from '../../../../packages/voxel/src/index.js';
import type { VoxelPayload } from '../../../../packages/voxel/src/index.js';

export type LayerAxis = 'x' | 'y' | 'z';
export type LayerMode = 'all' | 'range' | 'single';
export interface LayerState { readonly axis: LayerAxis; readonly mode: LayerMode; readonly from: number; readonly to: number }

const AXIS = { x: 0, y: 1, z: 2 } as const;
const MODES: readonly (readonly [LayerMode, string])[] = [['all', 'Alles'], ['range', 'Bereich'], ['single', 'Einzeln']];

/** Inclusive layer range clamped to the payload; `from ≤ to` always holds. */
export function layerRange(payload: VoxelPayload, s: LayerState): readonly [number, number] {
  const i = AXIS[s.axis], lo = payload.bounds.min[i]!, hi = payload.bounds.maxExclusive[i]! - 1;
  const clamp = (n: number) => Math.max(lo, Math.min(hi, n));
  const to = clamp(s.to), from = s.mode === 'single' ? to : Math.min(clamp(s.from), to);
  return [from, to];
}

/** View-only layer filter (whole / range / single layer on X, Y or Z). Counts never use the filtered payload. */
export function useLayerFilter(payload: VoxelPayload | null): { visible: VoxelPayload | null; control: ReactElement | null; state: LayerState } {
  const [state, setState] = useState<LayerState>({ axis: 'y', mode: 'all', from: -Infinity, to: Infinity });
  const range = payload ? layerRange(payload, state) : null;
  const visible = useMemo(() => {
    if (!payload || !range || state.mode === 'all') return payload;
    return selectLayers(payload, state.axis, range[0], range[1] + 1);
  }, [payload, state.mode, state.axis, range?.[0], range?.[1]]);
  if (!payload || !range) return { visible, control: null, state };
  const i = AXIS[state.axis], lo = payload.bounds.min[i]!, hi = payload.bounds.maxExclusive[i]! - 1;
  const axisName = state.axis.toUpperCase();
  const set = (patch: Partial<LayerState>) => setState(s => ({ ...s, ...patch }));
  const control = <div className="layer-control" role="group" aria-label="Schichtfilter">
    <div className="seg" role="group" aria-label="Schichtachse">{(['x', 'y', 'z'] as const).map(a =>
      <button key={a} aria-pressed={state.axis === a} onClick={() => setState({ axis: a, mode: state.mode, from: -Infinity, to: Infinity })}>{a.toUpperCase()}</button>)}</div>
    <div className="seg" role="group" aria-label="Schichtmodus">{MODES.map(([m, label]) =>
      <button key={m} aria-pressed={state.mode === m} onClick={() => set({ mode: m, from: range[0], to: range[1] })}>{label}</button>)}</div>
    {state.mode === 'range' && <label>{axisName} von {range[0]}<input type="range" min={lo} max={hi} value={range[0]} aria-label={`${axisName}-Schicht von`}
      onChange={e => { const n = Number(e.target.value); set({ from: n, to: Math.max(n, range[1]) }); }} /></label>}
    {state.mode !== 'all' && <label>{state.mode === 'range' ? `bis ${range[1]}` : `${axisName} = ${range[1]}`}<input type="range" min={lo} max={hi} value={range[1]}
      aria-label={state.mode === 'range' ? `${axisName}-Schicht bis` : `${axisName}-Schicht`}
      onChange={e => { const n = Number(e.target.value); set({ to: n, from: Math.min(range[0], n) }); }} /></label>}
    {state.mode !== 'all' && <span className="seg"><button aria-label="Schicht tiefer" disabled={range[1] <= lo || (state.mode === 'range' && range[0] <= lo)}
      onClick={() => set({ from: range[0] - 1, to: range[1] - 1 })}>−</button><button aria-label="Schicht höher" disabled={range[1] >= hi}
      onClick={() => set({ from: Math.min(range[0] + 1, hi), to: range[1] + 1 })}>＋</button></span>}
  </div>;
  return { visible, control, state };
}
