import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { applyOperation, describeOperation } from '../../../../../packages/domain/src/index.js';
import type { Operation, Project } from '../../../../../packages/domain/src/index.js';
import {
  DIMENSIONS, MAP_SKIP_LABEL, TERRAIN_NOTE, chunkOf, dimensionLabel, footprintNeighbours, suggestPlacement, topViews, translateBounds, worldOperation, createPlacement,
} from '../../../../../packages/domain/src/worldmap.js';
import type { MapEntry, WorldMapView as MapData, WorldPlacement } from '../../../../../packages/domain/src/worldmap.js';
import type { Bounds, Cell, VoxelPayload } from '../../../../../packages/voxel/src/index.js';
import { useApp } from '../../app/context';
import { href } from '../../app/router';
import { RevisionConflictError } from '../../app/repository';
import { errorText, formatNumber } from '../../app/ui';
import { mix, stateColor } from '../../colors';
import { Viewer } from '../../Viewer';
import type { Mark } from '../../viewer/types';
import { OverviewMap } from './OverviewMap';
import { PlacementForm } from './PlacementForm';
import { LiveMapPanel, LiveMapLink } from './LiveMapPanel';
import { useLiveMapSettings } from './liveMapConfig';
import { computeMap } from './transport';
import '../../map.css';

export type ColorMode = 'block' | 'project' | 'progress';
const COLOR_MODES: readonly (readonly [ColorMode, string])[] = [['block', 'Blöcke'], ['project', 'Projekte'], ['progress', 'Fortschritt']];
const PROJECT_HUES = ['#5ff0b0', '#f2b84b', '#7ab8ff', '#ff8fa3', '#c79bff', '#8fe36a', '#ffd36e', '#5fd7e8', '#ff9f68', '#b5c7d3'];
const PROGRESS_COLOR = ['#7b8a91', '#3ddc84', '#f2b84b'] as const;
const pct = (n: number) => `${Math.round(n * 100)} %`;

interface Params { projectId: string | null; dimension: string }
function readParams(search?: string): Params {
  const q = new URLSearchParams(search ?? '');
  return { projectId: q.get('projekt'), dimension: q.get('dim') ?? DIMENSIONS[0]!.id };
}
function writeParams(p: Params): void {
  const q = new URLSearchParams();
  if (p.projectId) q.set('projekt', p.projectId);
  if (p.dimension !== DIMENSIONS[0]!.id) q.set('dim', p.dimension);
  const next = href({ view: 'map', ...(q.size && { search: q.toString() }) });
  // Replace instead of push: selecting on the map must not flood the history or reset scrolling.
  if (window.location.hash !== next) history.replaceState(null, '', next);
}

/** Weltkarte (MAP-01): all placed projects of one dimension, as top view and walkable 3D scene. */
export function WorldMapView({ search }: { search?: string | undefined }) {
  const { repo, library } = useApp();
  const initial = useMemo(() => readParams(search), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [dimension, setDimension] = useState(initial.dimension);
  const [selected, setSelected] = useState<string | null>(initial.projectId);
  const [showHidden, setShowHidden] = useState(false);
  const [mode, setMode] = useState<ColorMode>('block');
  const [map, setMap] = useState<MapData | null>(null);
  const [mapError, setMapError] = useState('');
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState('');
  const [lastUndo, setLastUndo] = useState<{ projectId: string; op: Operation; label: string } | null>(null);
  const [frame3d, setFrame3d] = useState<{ bounds: Bounds; seq: number } | null>(null);
  const [frame2d, setFrame2d] = useState<{ projectId: string | null; seq: number } | null>(null);
  const [preview, setPreview] = useState<WorldPlacement | null>(null);
  const [hover, setHover] = useState<Cell | null>(null);
  const [tour, setTour] = useState(false);
  const [live, setLive] = useLiveMapSettings();
  const seq = useRef(0);

  const load = useCallback(async () => {
    try { setProjects((await repo.listProjects()).sort((a, b) => a.name.localeCompare(b.name, 'de') || a.id.localeCompare(b.id))); setLoadError(''); }
    catch (e) { setLoadError(errorText(e)); }
  }, [repo]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => repo.subscribe(c => { if (c.kind === 'projects') void load(); }), [repo, load]);

  useEffect(() => {
    if (!projects) return;
    setBusy(true);
    return computeMap(projects, library.versions, dimension, showHidden, result => {
      setBusy(false);
      if ('error' in result) { setMapError(result.error); return; }
      setMapError(''); setMap(result.map);
    });
  }, [projects, library.versions, dimension, showHidden]);

  useEffect(() => { writeParams({ projectId: selected, dimension }); }, [selected, dimension]);

  const entry = map?.entries.find(e => e.projectId === selected) ?? null;
  const project = projects?.find(p => p.id === selected) ?? null;

  // Cell → owner index for colouring and picking (the viewer hands back cell objects).
  const ownerOf = useMemo(() => {
    const m = new Map<Cell, number>();
    map?.cells.forEach((c, i) => m.set(c, i));
    return m;
  }, [map]);
  const baseColor = useCallback((i: number): string => {
    if (!map) return '#888888';
    const cell = map.cells[i]!;
    if (mode === 'project') return PROJECT_HUES[map.owner[i]! % PROJECT_HUES.length]!;
    const block = cell.kind === 'erase' ? '#d35f5f' : stateColor(map.palette[cell.paletteIndex]!.id);
    if (mode === 'progress') return map.progress[i] === 0 ? mix(block, PROGRESS_COLOR[0], 0.7) : PROGRESS_COLOR[map.progress[i]!]!;
    return block;
  }, [map, mode]);
  const selectedIndex = entry && !entry.skipped ? entry.index : -1;
  // 3D keeps the real block shapes; colour modes only tint (Mark) and other projects are dimmed while one is selected.
  const markFor = useCallback((cell: Cell): Mark | null => {
    const i = ownerOf.get(cell); if (i === undefined || !map) return null;
    if (selectedIndex >= 0 && map.owner[i] !== selectedIndex) return { color: '#22323a', amount: 0.5 };
    if (mode === 'project') return { color: PROJECT_HUES[map.owner[i]! % PROJECT_HUES.length]!, amount: 0.6 };
    if (mode === 'progress') return { color: PROGRESS_COLOR[map.progress[i]!]!, amount: map.progress[i] === 0 ? 0.55 : 0.65 };
    return null;
  }, [ownerOf, selectedIndex, map, mode]);
  const tops = useMemo(() => map ? topViews(map) : [], [map]);
  const payload = useMemo<VoxelPayload | null>(() => map?.bounds ? {
    schemaVersion: 1, profileId: 'weltkarte:anzeige', bounds: map.bounds, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette: map.palette, cells: map.cells, blockEntities: [],
  } : null, [map]);

  const fly = useCallback((projectId: string) => {
    const e = map?.entries.find(x => x.projectId === projectId);
    setSelected(projectId);
    if (e?.worldBounds && !e.skipped) setFrame3d({ bounds: e.worldBounds, seq: ++seq.current });
    setFrame2d({ projectId, seq: ++seq.current });
  }, [map]);
  const onPick = useCallback((cell: Cell | null) => {
    setHover(cell);
    const i = cell ? ownerOf.get(cell) : undefined;
    if (i !== undefined && map) setSelected(map.entries[map.owner[i]!]!.projectId);
  }, [ownerOf, map]);

  // Rundflug: frame each drawn project in turn.
  useEffect(() => {
    if (!tour || !map) return;
    const drawn = map.entries.filter(e => !e.skipped && e.worldBounds);
    if (!drawn.length) { setTour(false); return; }
    let i = Math.max(0, drawn.findIndex(e => e.projectId === selected));
    const step = () => { const e = drawn[i % drawn.length]!; i++; fly(e.projectId); };
    step();
    const t = setInterval(step, 5000);
    return () => clearInterval(t);
  }, [tour, map]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(async (p: Project, op: Operation): Promise<boolean> => {
    try {
      const { project: next, inverse } = applyOperation(p, op);
      await repo.saveProject(next, p.revision);
      setLastUndo({ projectId: p.id, op: inverse, label: describeOperation(op) });
      setNotice(`${describeOperation(op)}: „${p.name}“.`);
      setPreview(null);
      await load();
      return true;
    } catch (e) {
      setNotice(e instanceof RevisionConflictError ? 'Das Projekt wurde inzwischen in einem anderen Tab geändert. Die Karte zeigt jetzt den gespeicherten Stand.' : errorText(e));
      await load();
      return false;
    }
  }, [repo, load]);
  const undoLast = async () => {
    if (!lastUndo) return;
    const p = projects?.find(x => x.id === lastUndo.projectId);
    if (!p) { setLastUndo(null); return; }
    const ok = await save(p, lastUndo.op);
    if (ok) { setLastUndo(null); setNotice(`Rückgängig gemacht: ${lastUndo.label}.`); }
  };
  const placeSuggested = async (projectId: string) => {
    const p = projects?.find(x => x.id === projectId), u = map?.unplaced.find(x => x.projectId === projectId);
    if (!p || !map) return;
    const placed = map.entries.flatMap(e => e.worldBounds ? [e.worldBounds] : []);
    const origin = suggestPlacement(placed, u?.localBounds ?? null);
    if (await save(p, worldOperation(createPlacement(origin, dimension), 'Auf die Weltkarte gesetzt'))) {
      setSelected(projectId);
      if (u?.localBounds) { const b = translateBounds(u.localBounds, origin); setFrame3d({ bounds: b, seq: ++seq.current }); }
      setFrame2d({ projectId, seq: ++seq.current });
    }
  };

  // Preview of an edited placement: outline + neighbours whose footprint it touches.
  const previewBounds = preview && entry?.localBounds && preview.dimension === dimension ? translateBounds(entry.localBounds, preview.origin) : null;
  const previewHits = previewBounds && map ? footprintNeighbours(map, previewBounds, selected ?? undefined) : [];

  if (loadError) return <div className="page"><div className="notice warning" role="alert"><strong>Projekte nicht geladen</strong><p>{loadError}</p></div></div>;
  const drawn = map?.entries.filter(e => !e.skipped) ?? [];
  const otherDims = map ? Object.entries(map.elsewhere) : [];
  const dims = [...DIMENSIONS.map(d => d.id), ...otherDims.map(([d]) => d).filter(d => !DIMENSIONS.some(x => x.id === d))];
  const collisionsOf = (id: string) => map?.collisions.filter(c => c.cells && (c.a === id || c.b === id)) ?? [];

  return <div className="page map-page" data-map-state={busy ? 'busy' : map ? 'ready' : 'empty'} data-map-cells={map?.cells.length ?? ''}>
    <header className="map-head">
      <div><h1 className="page-title">Weltkarte</h1>
        <p className="map-lead">Alle Projekte an ihren Weltkoordinaten. Fliege frei darüber, prüfe Abstände und Überschneidungen und sieh, was schon gebaut ist.</p></div>
      <div className="map-controls">
        <div className="seg" role="group" aria-label="Dimension">
          {dims.map(d => <button key={d} aria-pressed={dimension === d} onClick={() => { setDimension(d); setSelected(null); }}>
            {dimensionLabel(d)}{map?.elsewhere[d] ? <small> · {map.elsewhere[d]}</small> : null}</button>)}
        </div>
        <div className="seg" role="group" aria-label="Färbung">
          {COLOR_MODES.map(([m, label]) => <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>{label}</button>)}
        </div>
        <label className="chip-check"><input type="checkbox" checked={showHidden} onChange={e => setShowHidden(e.target.checked)} /> Ausgeblendete zeigen</label>
        <button className="secondary" aria-pressed={tour} disabled={!drawn.length} onClick={() => setTour(t => !t)}>{tour ? '■ Rundflug beenden' : '▶ Rundflug'}</button>
      </div>
    </header>
    <p className="map-terrain" role="note">{TERRAIN_NOTE} Lage, Höhe und Abstände prüfst du im Spiel oder auf eurer Live-Karte.</p>
    {notice && <div className="notice" role="status">{notice} {lastUndo && <button className="text-button" onClick={() => void undoLast()}>Rückgängig</button>}</div>}
    {mapError && <div className="notice warning" role="alert"><strong>Karte nicht berechnet</strong><p>{mapError}</p></div>}

    <div className="map-layout">
      <aside className="map-list" aria-label="Projekte auf der Karte">
        <h2>Auf der Karte <small>{map ? map.entries.length : '…'}</small></h2>
        {map && !map.entries.length && <p className="muted">In dieser Dimension liegt noch kein Projekt. Setze unten eines auf die Karte.</p>}
        <ul>{map?.entries.map(e => <EntryCard key={e.projectId} entry={e} selected={selected === e.projectId} collisions={collisionsOf(e.projectId).length}
          onSelect={() => { setSelected(e.projectId); setFrame2d({ projectId: e.projectId, seq: ++seq.current }); }} onFly={() => fly(e.projectId)} />)}</ul>
        {map && map.unplaced.length > 0 && <>
          <h2>Noch nicht platziert <small>{map.unplaced.length}</small></h2>
          <ul className="map-unplaced">{map.unplaced.map(u => <li key={u.projectId}>
            <span>{u.name}{u.localBounds ? <small> · {u.localBounds.maxExclusive[0] - u.localBounds.min[0]}×{u.localBounds.maxExclusive[2] - u.localBounds.min[2]} Blöcke</small> : <small> · leer</small>}</span>
            <button className="secondary" onClick={() => void placeSuggested(u.projectId)} title={`Östlich der vorhandenen Projekte in ${dimensionLabel(dimension)} platzieren, chunkbündig`}>Platzieren</button>
          </li>)}</ul></>}
        {projects && !projects.length && <p className="muted">Noch keine Projekte. <a href="#/">Projekt anlegen</a></p>}
      </aside>

      <section className="map-main">
        <div className="map-panels">
          {map ? <OverviewMap map={map} tops={tops} colorOf={baseColor} selected={selected} onSelect={setSelected} onFly={fly} frame={frame2d}
            preview={previewBounds ? { bounds: previewBounds, conflict: previewHits.length > 0 } : null} />
            : <div className="overview"><div className="loading" role="status">Karte wird berechnet …</div></div>}
          <div className="map-3d">
            {payload ? <Viewer payload={payload} cells={payload.cells} onSelect={onPick} markFor={markFor} frameRequest={frame3d}
              focus={entry?.worldBounds && !entry.skipped ? entry.worldBounds : null}
              ghost={previewBounds ? { bounds: { min: previewBounds.min, maxExclusive: previewBounds.maxExclusive }, tone: previewHits.length ? 'conflict' : 'snap' } : null} />
              : <div className="scene"><div className="viewer-loading" role="status">{busy ? 'Karte wird berechnet …' : 'Noch nichts zu zeigen: Platziere ein Projekt mit Bauteilen.'}</div></div>}
            {busy && map && <div className="map-busy" role="status">aktualisiert …</div>}
          </div>
        </div>
        {mode === 'progress' && <p className="map-legend"><i style={{ background: PROGRESS_COLOR[1] }} /> abgehakt <i style={{ background: PROGRESS_COLOR[2] }} /> abgehakt, aber seitdem geändert <i style={{ background: mix('#c7d4d5', PROGRESS_COLOR[0], 0.7) }} /> offen · aus den Haken der Bauanleitung, keine Messung im Spiel</p>}
        {hover && map && hover.kind !== 'erase' && <p className="map-hover">Block <b>X {hover.position[0]} · Y {hover.position[1]} · Z {hover.position[2]}</b> · Chunk {chunkOf(hover.position[0])}, {chunkOf(hover.position[2])} · {map.palette[hover.paletteIndex]?.id}</p>}

        {entry && project && <section className="map-detail" aria-label={`Details zu ${entry.name}`}>
          <header><h2>{entry.name}</h2>
            <div className="button-row">
              <button className="primary" disabled={!!entry.skipped} onClick={() => fly(entry.projectId)}>✈ Hinfliegen</button>
              <a href={href({ view: 'project', projectId: entry.projectId, tab: 'editor' })}>Im Editor öffnen</a>
              <a href={href({ view: 'project', projectId: entry.projectId, tab: 'bauen' })}>Bauanleitung</a>
              <LiveMapLink settings={live} entry={entry} />
            </div></header>
          <Facts entry={entry} />
          {entry.skipped && <p className="notice">Nicht gezeichnet: {MAP_SKIP_LABEL[entry.skipped]}{entry.error ? ` (${entry.error})` : ''}.</p>}
          {collisionsOf(entry.projectId).map(c => {
            const other = c.a === entry.projectId ? c.b : c.a, name = map?.entries.find(e => e.projectId === other)?.name ?? other;
            return <p key={other} className="notice warning" role="alert">Überschneidung mit „{name}“: {formatNumber(c.cells)} Blöcke widersprechen sich{c.sample ? `, z. B. bei X ${c.sample[0]} · Y ${c.sample[1]} · Z ${c.sample[2]}` : ''}. Die Karte entscheidet das nicht – verschiebe eines der Projekte.</p>;
          })}
          <PlacementForm key={`${project.id}:${project.revision}`} placement={project.world ?? null} onPreview={setPreview}
            neighbours={previewHits.map(e => e.name)} onSave={next => save(project, worldOperation(next))} onRemove={() => save(project, worldOperation(null))} />
        </section>}
        {!entry && project && <p className="muted">„{project.name}“ liegt in einer anderen Dimension oder ist nicht platziert.</p>}

        <LiveMapPanel settings={live} onChange={setLive} map={map} dimension={dimension} />
      </section>
    </div>
  </div>;
}

function EntryCard({ entry, selected, collisions, onSelect, onFly }: { entry: MapEntry; selected: boolean; collisions: number; onSelect: () => void; onFly: () => void }) {
  const o = entry.placement.origin;
  return <li className={`map-entry${selected ? ' selected' : ''}${entry.skipped ? ' skipped' : ''}`}>
    <button className="map-entry-main" aria-pressed={selected} onClick={onSelect} onDoubleClick={onFly}>
      <b>{entry.name}</b>
      <small>X {o[0]} · Y {o[1]} · Z {o[2]}{entry.skipped ? ` · ${MAP_SKIP_LABEL[entry.skipped]}` : ''}</small>
      <span className="map-progress" aria-label={`Fortschritt ${pct(entry.share)}`}><span style={{ width: `${Math.round(entry.share * 100)}%` }} /></span>
      <small>{entry.stepsDone}/{entry.steps} Schritte · {pct(entry.share)}{entry.stepsReview ? ` · ${entry.stepsReview} prüfen` : ''}{collisions ? <em> · {collisions}× Überschneidung</em> : null}</small>
    </button>
    <button className="map-entry-fly" disabled={!!entry.skipped} onClick={onFly} aria-label={`Zu ${entry.name} fliegen`} title="Hinfliegen">✈</button>
  </li>;
}

function Facts({ entry }: { entry: MapEntry }) {
  const b = entry.worldBounds;
  return <dl className="map-facts">
    <div><dt>Ursprung</dt><dd>X {entry.placement.origin[0]} · Y {entry.placement.origin[1]} · Z {entry.placement.origin[2]}</dd></div>
    {b && <div><dt>Bauplatz (Nordwestecke unten)</dt><dd>X {b.min[0]} · Y {b.min[1]} · Z {b.min[2]}</dd></div>}
    {b && <div><dt>Bis (Südostecke oben)</dt><dd>X {b.maxExclusive[0] - 1} · Y {b.maxExclusive[1] - 1} · Z {b.maxExclusive[2] - 1}</dd></div>}
    {b && <div><dt>Größe</dt><dd>{b.maxExclusive[0] - b.min[0]} × {b.maxExclusive[2] - b.min[2]} Blöcke, {b.maxExclusive[1] - b.min[1]} hoch</dd></div>}
    {b && <div><dt>Chunks</dt><dd>{chunkOf(b.min[0])},{chunkOf(b.min[2])} bis {chunkOf(b.maxExclusive[0] - 1)},{chunkOf(b.maxExclusive[2] - 1)}</dd></div>}
    <div><dt>Blöcke</dt><dd>{formatNumber(entry.blocks)}</dd></div>
    <div><dt>Fortschritt</dt><dd>{entry.stepsDone} von {entry.steps} Schritten ({pct(entry.share)} der Blöcke abgehakt)</dd></div>
    {entry.conflicts > 0 && <div><dt>Interne Konflikte</dt><dd>{entry.conflicts} ungeklärt (im Editor lösen)</dd></div>}
    {entry.placement.note && <div><dt>Notiz</dt><dd>{entry.placement.note}</dd></div>}
  </dl>;
}
