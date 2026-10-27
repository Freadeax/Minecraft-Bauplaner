import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Cell } from '../../../../packages/voxel/src/index.js';
import { canvasFallback, newFallbackCamera } from '../canvasFallback';
import type { FallbackHandle } from '../canvasFallback';
import { blockColors } from '../colors';
import { VIEWS } from './camera';
import type { ViewName } from './camera';
import { SPEED_STEPS } from './flight';
import type { Rgb } from './faces';
import { SceneController } from './sceneController';
import type { MeshStats, ViewerState } from './sceneController';
import type { ViewerProps } from './types';

const defaultColor = (cell: Cell): string => cell.kind === 'erase' ? '#d35f5f' : blockColors[cell.paletteIndex % blockColors.length]!;
const PAD: readonly (readonly [code: string, label: string, name: string])[] = [
  ['KeyQ', '⤓', 'Abwärts'], ['KeyW', '▲', 'Vorwärts'], ['Space', '⤒', 'Aufwärts'],
  ['KeyA', '◀', 'Links'], ['KeyS', '▼', 'Rückwärts'], ['KeyD', '▶', 'Rechts'],
];
const fmt = (n: number) => n.toLocaleString('de-DE');

export default function ThreeViewer({ payload, cells, onSelect, colorFor, focus = null, drag = null, ghost = null }: ViewerProps) {
  const host = useRef<HTMLDivElement>(null), canvasHost = useRef<HTMLDivElement>(null);
  const controller = useRef<SceneController | null>(null);
  const fallback = useRef<FallbackHandle | null>(null), fallbackCamera = useRef(newFallbackCamera());
  const select = useRef(onSelect); select.current = onSelect;
  const [software, setSoftware] = useState(false);
  const [lost, setLost] = useState(false);
  const [state, setState] = useState<ViewerState>({ mode: 'orbit', projection: 'perspective', view: 'iso', speed: 8 });
  const [hover, setHover] = useState<Cell | null>(null);
  const [stats, setStats] = useState<MeshStats | null>(null);

  useEffect(() => {
    const el = canvasHost.current; if (!el) return;
    try {
      const c = new SceneController(el, {
        pick: cell => { c.mark(cell); select.current(cell); },
        hover: setHover, state: setState, lost: () => setLost(true),
      });
      controller.current = c; setSoftware(false);
      return () => { controller.current = null; c.dispose(); };
    } catch { setSoftware(true); return undefined; }
  }, []);

  useEffect(() => {
    const color = colorFor ?? defaultColor;
    const c = controller.current;
    if (c) {
      const cache = new Map<string, Rgb>(), tmp = new THREE.Color();
      const rgb = (cell: Cell): Rgb => {
        const hex = color(cell); let v = cache.get(hex);
        if (!v) { tmp.setStyle(hex); v = [tmp.r, tmp.g, tmp.b]; cache.set(hex, v); }
        return v;
      };
      const first = stats === null;
      setStats(c.setCells(cells, payload.bounds, rgb));
      if (first) c.resetSpeed();
      return;
    }
    if (!software || !canvasHost.current) return;
    fallback.current = canvasFallback(canvasHost.current, payload, cells, cell => select.current(cell), color, fallbackCamera.current);
    return () => { fallback.current?.dispose(); fallback.current = null; };
  }, [payload, cells, colorFor, software]);

  useEffect(() => { controller.current?.setFocusTarget(focus); }, [focus]);
  useEffect(() => { controller.current?.setDragHandler(drag); }, [drag]);
  useEffect(() => { controller.current?.setGhost(ghost?.bounds ?? null, ghost?.tone); }, [ghost]);
  // A new structure (other payload) clears the block marker.
  useEffect(() => { controller.current?.mark(null); setHover(null); }, [payload]);

  const setView = (v: ViewName) => { controller.current?.setView(v); fallback.current?.setView(v); };
  const doFocus = () => {
    if (controller.current) controller.current.focusSelection();
    else fallback.current?.focus(focus ?? payload.bounds);
  };
  const flying = state.mode === 'flight';
  const press = (code: string, down: boolean) => controller.current?.setFlightKey(code, down);
  const hovered = hover && hover.kind !== 'erase' ? payload.palette[hover.paletteIndex] : null;

  return <div className={`scene${flying ? ' flying' : ''}`} ref={host}>
    <div className="canvas-host" ref={canvasHost} tabIndex={0} aria-label="3D-Ansicht (fokussierbar für Tastatursteuerung)"
      data-mode={software ? 'software' : state.mode} data-projection={state.projection} data-view={state.view ?? ''}
      data-faces={stats?.quads ?? ''} data-blocks={stats?.blocks ?? ''} data-build-ms={stats ? stats.buildMs.toFixed(1) : ''} />
    <div className="viewer-tools" role="toolbar" aria-label="Ansicht">
      <div className="seg" role="group" aria-label="Blickrichtung">
        {VIEWS.map(v => <button key={v.id} title={`${v.title} (${v.key})`} aria-label={v.title} aria-pressed={state.view === v.id && !flying} onClick={() => setView(v.id)}>{v.label}</button>)}
      </div>
      {!software && <button title="Parallelprojektion ohne Perspektive (O)" aria-label="Parallelprojektion" aria-pressed={state.projection === 'orthographic'}
        onClick={() => controller.current?.setProjection(state.projection === 'perspective' ? 'orthographic' : 'perspective')}>⊞ <span>Ortho</span></button>}
      {!software && <button title="Freier Flug (V), Esc beendet" aria-label="Freier Flug" aria-pressed={flying} onClick={() => controller.current?.setFlight(!flying)}>✈ <span>Flug</span></button>}
      <button title={focus ? 'Auswahl fokussieren (F)' : 'Ganzes Bauwerk einpassen (F)'} aria-label={focus ? 'Auswahl fokussieren' : 'Ganzes Bauwerk einpassen'} onClick={doFocus}>◎ <span>{focus ? 'Auswahl' : 'Einpassen'}</span></button>
    </div>
    <div className="viewer-hud" aria-hidden="true">
      {hovered && hover ? <span><b>X {hover.position[0]} · Y {hover.position[1]} · Z {hover.position[2]}</b> {hovered.id}</span>
        : stats && !software ? <span>{fmt(stats.quads)} Flächen · {fmt(stats.blocks)} Blöcke</span> : null}
      {flying && <span className="hint">WASD bewegen · Leertaste/Shift hoch/runter · Ziehen: umsehen · Mausrad: Tempo {state.speed} B/s · Esc</span>}
    </div>
    {flying && <div className="flight-pad" role="group" aria-label="Flugsteuerung">
      {PAD.map(([code, label, name]) => <button key={code} aria-label={name} title={name}
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); press(code, true); }}
        onPointerUp={() => press(code, false)} onPointerCancel={() => press(code, false)} onLostPointerCapture={() => press(code, false)}
        onContextMenu={e => e.preventDefault()}>{label}</button>)}
      <label className="speed">Tempo<select value={state.speed} onChange={e => controller.current?.setSpeed(Number(e.target.value))}>
        {SPEED_STEPS.map(s => <option key={s} value={s}>{s} B/s</option>)}</select></label>
      <button className="end" onClick={() => controller.current?.setFlight(false)}>✕ Flug beenden</button>
    </div>}
    {software && <div className="render-mode" role="status">Isometrische Ersatzansicht · WebGL hier nicht verfügbar</div>}
    {lost && <div className="render-mode" role="alert">Die Grafikverbindung wurde unterbrochen. Bitte die Seite neu laden.</div>}
  </div>;
}
