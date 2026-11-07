import { useEffect, useMemo, useRef, useState } from 'react';
import { entityLabel } from '../../../../packages/voxel/src/index.js';
import type { Cell } from '../../../../packages/voxel/src/index.js';
import { cellYRange, withEntities } from '../blockmodels/entityScene';
import { useRenderKit } from '../blockmodels/assets';
import { useGraphics } from '../blockmodels/graphics';
import { openTextureDialog } from '../blockmodels/TexturePanel';
import { canvasFallback, newFallbackCamera } from '../canvasFallback';
import type { FallbackHandle } from '../canvasFallback';
import { mix, stateColor } from '../colors';
import { VIEWS } from './camera';
import type { ViewName } from './camera';
import { SPEED_STEPS } from './flight';
import { GraphicsMenu } from './GraphicsMenu';
import { SceneController } from './sceneController';
import type { MeshStats, PickHit, PointerMods, ViewerState } from './sceneController';
import type { ViewerProps } from './types';
import { buildSectionMeshInBackground, meshInBackground } from './backgroundMesh';
import { isAbort } from '../jobs/client';
import { JobStatus } from '../jobs/JobStatus';
import type { JobProgress } from '../jobs/protocol';

const PAD: readonly (readonly [code: string, label: string, name: string])[] = [
  ['KeyQ', '⤓', 'Abwärts'], ['KeyW', '▲', 'Vorwärts'], ['Space', '⤒', 'Aufwärts'],
  ['KeyA', '◀', 'Links'], ['KeyS', '▼', 'Rückwärts'], ['KeyD', '▶', 'Rechts'],
];
const fmt = (n: number) => n.toLocaleString('de-DE');

export default function ThreeViewer({ payload, cells, onSelect, markFor, focus = null, drag = null, ghost = null, frameRequest = null, entities, onSelectEntity, build = null, preview = null }: ViewerProps) {
  const kit = useRenderKit();
  const graphics = useGraphics();
  const host = useRef<HTMLDivElement>(null), canvasHost = useRef<HTMLDivElement>(null);
  const controller = useRef<SceneController | null>(null);
  const fallback = useRef<FallbackHandle | null>(null), fallbackCamera = useRef(newFallbackCamera());
  // Free entities become extra cells with their own shapes (ENTITY-01); by default they follow the visible layers.
  const scene = useMemo(() => {
    const list = entities === undefined ? payload.entities : entities ?? undefined;
    const range = entities === undefined && list?.length ? cellYRange(cells) : null;
    return withEntities(cells, payload.palette, list, range ? a => a[1] >= range[0] && a[1] <= range[1] : undefined);
  }, [cells, payload, entities]);
  const sceneRef = useRef(scene); sceneRef.current = scene;
  const markScene = useMemo(() => markFor && scene.count ? (c: Cell) => scene.entityOf(c) ? null : markFor(c) : markFor, [markFor, scene]);
  const pickEntity = useRef(onSelectEntity); pickEntity.current = onSelectEntity;
  const select = useRef(onSelect);
  select.current = (cell: Cell | null, hit?: PickHit | null, mods?: PointerMods) => {
    const e = cell ? sceneRef.current.entityOf(cell) : undefined;
    if (e) { onSelect(null); pickEntity.current?.(e); return; }
    pickEntity.current?.(null); onSelect(cell, hit, mods);
  };
  const [software, setSoftware] = useState(false);
  const [lost, setLost] = useState(false);
  const [state, setState] = useState<ViewerState>({ mode: 'orbit', projection: 'perspective', view: 'iso', speed: 8 });
  const [hover, setHover] = useState<Cell | null>(null);
  const [stats, setStats] = useState<MeshStats | null>(null);
  /** Background build of the 3D view in progress (PERF-04). */
  const [busy, setBusy] = useState<JobProgress | null>(null);

  useEffect(() => {
    const el = canvasHost.current; if (!el) return;
    try {
      const c = new SceneController(el, {
        pick: (cell, hit, mods) => { c.mark(cell); select.current(cell, hit, mods); },
        hover: setHover, state: setState, lost: () => setLost(true),
      });
      controller.current = c; setSoftware(false);
      // Test hook for the game-screenshot comparison (scripts/checks/compare_game_shot.mjs), only with this switch.
      try { if (localStorage.getItem('bauplaner.test.pose') === '1') Object.defineProperty(el, 'bauplanerPose', { configurable: true, value: c.setPose.bind(c) }); } catch { /* no storage */ }
      c.setGraphics(graphics);
      return () => { controller.current = null; c.dispose(); };
    } catch { setSoftware(true); return undefined; }
  }, []);

  useEffect(() => {
    const c = controller.current;
    if (c) {
      const first = stats === null;
      if (!meshInBackground(scene.cells.length)) {
        setBusy(null);
        setStats(c.setCells(scene.cells, payload.bounds, scene.palette, kit, markScene));
        if (first) c.resetSpeed();
        return;
      }
      // Large models (PERF-04): faces, occlusion and light are computed in the background; the page stays usable
      // and the previous geometry stays visible until the new one is ready.
      const controllerAbort = new AbortController(), started = performance.now();
      const plan = c.planCells(payload.bounds, kit);
      setBusy({ step: 'Blöcke vorbereiten', fraction: 0 });
      buildSectionMeshInBackground(scene.cells, scene.palette, kit, plan.origin, markScene, plan.previous, {
        signal: controllerAbort.signal, onProgress: p => { if (!controllerAbort.signal.aborted) setBusy(p); },
      }).then(built => {
        if (controllerAbort.signal.aborted || controller.current !== c) return;
        setStats(c.applyCells(plan, built, scene.cells, started));
        if (first) c.resetSpeed();
        setBusy(null);
      }, e => {
        if (controllerAbort.signal.aborted || isAbort(e) || controller.current !== c) return;
        // The worker failed (memory, old browser): build here as before rather than showing nothing.
        setBusy({ step: 'Hintergrund nicht verfügbar – Ansicht wird direkt berechnet', fraction: null });
        setTimeout(() => {
          if (controllerAbort.signal.aborted || controller.current !== c) return;
          setStats(c.setCells(scene.cells, payload.bounds, scene.palette, kit, markScene));
          if (first) c.resetSpeed();
          setBusy(null);
        }, 30);
      });
      return () => controllerAbort.abort();
    }
    if (!software || !canvasHost.current) return;
    // Software view: flat colours, marks mixed in.
    const color = (cell: Cell) => {
      if (cell.kind === 'erase') return '#d35f5f';
      const base = stateColor(payload.palette[cell.paletteIndex]?.id ?? ''), m = markFor?.(cell);
      return m ? mix(base, m.color, m.amount) : base;
    };
    fallback.current = canvasFallback(canvasHost.current, payload, cells, cell => select.current(cell), color, fallbackCamera.current);
    return () => { fallback.current?.dispose(); fallback.current = null; };
  }, [payload, cells, markFor, software, kit, scene, markScene]);

  useEffect(() => { controller.current?.setGraphics(graphics); }, [graphics]);
  useEffect(() => { controller.current?.setFocusTarget(focus); }, [focus]);
  useEffect(() => { if (frameRequest) { controller.current?.focus(frameRequest.bounds); fallback.current?.focus(frameRequest.bounds); } }, [frameRequest]);
  useEffect(() => { controller.current?.setDragHandler(drag); }, [drag]);
  useEffect(() => { controller.current?.setGhost(ghost?.bounds ?? null, ghost?.tone); }, [ghost, stats]);
  useEffect(() => { controller.current?.setBuildHandler(build); }, [build]);
  // After a geometry change too: the origin of the scene may have moved.
  useEffect(() => { controller.current?.setPreview(preview); }, [preview, stats]);
  // A new structure (other payload) clears the block marker.
  useEffect(() => { controller.current?.mark(null); setHover(null); }, [payload]);

  const setView = (v: ViewName) => { controller.current?.setView(v); fallback.current?.setView(v); };
  const doFocus = () => {
    if (controller.current) controller.current.focusSelection();
    else fallback.current?.focus(focus ?? payload.bounds);
  };
  const flying = state.mode === 'flight';
  const press = (code: string, down: boolean) => controller.current?.setFlightKey(code, down);
  const hoveredEntity = hover ? scene.entityOf(hover) : undefined;
  const hovered = hover && hover.kind !== 'erase' && !hoveredEntity ? payload.palette[hover.paletteIndex] : null;

  return <div className={`scene${flying ? ' flying' : ''}`} ref={host}>
    <div className="canvas-host" ref={canvasHost} tabIndex={0} aria-label="3D-Ansicht (fokussierbar für Tastatursteuerung)"
      data-mode={software ? 'software' : state.mode} data-projection={state.projection} data-view={state.view ?? ''}
      data-faces={stats?.quads ?? ''} data-spawn-day={stats?.spawnDay ?? ''} data-spawn-night={stats?.spawnNight ?? ''} data-beacons={stats ? `${stats.beacons.active}/${stats.beacons.total}` : ''} data-blocks={stats ? stats.blocks - scene.count : ''} data-entities={scene.count} data-build-ms={stats ? stats.buildMs.toFixed(1) : ''} data-mesh={busy ? 'pending' : stats ? 'ready' : ''} />
    <div className="viewer-tools" role="toolbar" aria-label="Ansicht">
      <div className="seg" role="group" aria-label="Blickrichtung">
        {VIEWS.map(v => <button key={v.id} title={`${v.title} (${v.key})`} aria-label={v.title} aria-pressed={state.view === v.id && !flying} onClick={() => setView(v.id)}>{v.label}</button>)}
      </div>
      {!software && <button title="Parallelprojektion ohne Perspektive (O)" aria-label="Parallelprojektion" aria-pressed={state.projection === 'orthographic'}
        onClick={() => controller.current?.setProjection(state.projection === 'perspective' ? 'orthographic' : 'perspective')}>⊞ <span>Ortho</span></button>}
      {!software && <button title="Freier Flug (V), Esc beendet" aria-label="Freier Flug" aria-pressed={flying} onClick={() => controller.current?.setFlight(!flying)}>✈ <span>Flug</span></button>}
      {!software && <GraphicsMenu stats={stats} />}
      <button title={focus ? 'Auswahl fokussieren (F)' : 'Ganzes Bauwerk einpassen (F)'} aria-label={focus ? 'Auswahl fokussieren' : 'Ganzes Bauwerk einpassen'} onClick={doFocus}>◎ <span>{focus ? 'Auswahl' : 'Einpassen'}</span></button>
    </div>
    <div className="viewer-hud" aria-hidden="true">
      {hoveredEntity && hover ? <span><b>X {hover.position[0]} · Y {hover.position[1]} · Z {hover.position[2]}</b> {entityLabel(hoveredEntity)}</span>
        : hovered && hover ? <span><b>X {hover.position[0]} · Y {hover.position[1]} · Z {hover.position[2]}</b> {hovered.id}</span>
        : stats && !software ? <span>{fmt(stats.quads)} Flächen · {fmt(stats.blocks - scene.count)} Blöcke{scene.count ? ` · ${fmt(scene.count)} Entities` : ''}</span> : null}
      {graphics.spawn && stats && stats.spawnDay !== null && !software && <span className="spawn-hud">
        Spawnflächen: <b className="spawn-day">{fmt(stats.spawnDay)}</b> tagsüber · <b className="spawn-night">{fmt(stats.spawnNight ?? 0)}</b> nachts</span>}
      {flying && <span className="hint">WASD bewegen · Leertaste/Shift hoch/runter · Ziehen: umsehen · Mausrad: Tempo {state.speed} B/s · Esc</span>}
    </div>
    {flying && <div className="flight-pad" role="group" aria-label="Flugsteuerung">
      {PAD.map(([code, label, name]) => <button key={code} aria-label={name} title={name}
        onPointerDown={e => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ } press(code, true); }}
        onPointerUp={() => press(code, false)} onPointerCancel={() => press(code, false)} onLostPointerCapture={() => press(code, false)}
        onContextMenu={e => e.preventDefault()}>{label}</button>)}
      <label className="speed">Tempo<select value={state.speed} onChange={e => controller.current?.setSpeed(Number(e.target.value))}>
        {SPEED_STEPS.map(s => <option key={s} value={s}>{s} B/s</option>)}</select></label>
      <button className="end" onClick={() => controller.current?.setFlight(false)}>✕ Flug beenden</button>
    </div>}
    {busy && !software && <JobStatus className="viewer-busy" title={stats ? '3D-Ansicht wird aktualisiert' : '3D-Ansicht wird berechnet'} progress={busy} />}
    {software && <div className="render-mode" role="status">Isometrische Ersatzansicht · WebGL hier nicht verfügbar</div>}
    {!software && !kit.textured && <button type="button" className="texture-hint" onClick={openTextureDialog}
      title="Blockformen sind eigene Nachbildungen in Durchschnittsfarben. Originaltexturen aus deiner Minecraft-Version laden.">▦ Originaltexturen laden</button>}
    {lost && <div className="render-mode" role="alert">Die Grafikverbindung wurde unterbrochen. Bitte die Seite neu laden.</div>}
  </div>;
}
