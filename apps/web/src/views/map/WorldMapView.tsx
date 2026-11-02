import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EARTHWORK_NOTE, MAP_MAX_CELLS, applyOperation, columnAt, columnBases, compareHologram, describeOperation, estimateEarthwork, hologramProject, itemsOf, liveShare, liveSurvey,
  moveItem, newWorldItemId, originFromPlayer, siteFromCorners, snapSiteToChunks, surveyCovers, surveyDisplayCells, suggestDataVersion,
} from '../../../../../packages/domain/src/index.js';
import type { EarthworkEstimate, Operation, Project, TerrainSurvey, WorldItem } from '../../../../../packages/domain/src/index.js';
import { prepareRevisionExport } from '../../../../../packages/application/src/index.js';
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
import type { MapDraft, MapHit, MapTool, PlanLayer } from './OverviewMap';
import { LiveGamePanel } from './LiveGamePanel';
import { liveApi, useLiveGame } from './liveClient';
import { PlanItemEditor, PlanList, PlanToolbar } from './PlanPanel';
import { useWorldPlan } from './useWorldPlan';
import { chunkImage } from './terrainLayer';
import { areaAround, storeSurvey } from '../world/surveys';
import { PlacementForm } from './PlacementForm';
import { LiveMapPanel, LiveMapLink } from './LiveMapPanel';
import { useLiveMapSettings } from './liveMapConfig';
import { computeMap } from './transport';
import { projectTerrain, projectTerrainDimension } from '../world/designs';
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
  const [surveys, setSurveys] = useState<ReadonlyMap<string, TerrainSurvey>>(new Map());
  const [surveyErrors, setSurveyErrors] = useState<readonly string[]>([]);
  const [showTerrain, setShowTerrain] = useState(true);
  // Geplantes Gelände (TERRAIN-02) statt der Aufnahme, wo ein Projekt eine Gestaltung hat.
  const [planned, setPlanned] = useState(true);
  const [plannedCount, setPlannedCount] = useState(0);
  const seq = useRef(0);
  // MAP-03: Weltplan, planning tools and the live game.
  const wp = useWorldPlan(repo);
  const game = useLiveGame();
  const [tool, setTool] = useState<MapTool>('select');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [follow, setFollow] = useState(false);
  const [terrainBusy, setTerrainBusy] = useState(false);
  const [sending, setSending] = useState('');

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

  // Geländeaufnahmen (TERRAIN-01) of the projects in this dimension, loaded from the original store.
  useEffect(() => {
    if (!projects) return;
    const source = planned ? 'planned' as const : 'measured' as const;
    const withTerrain = projects.filter(p => (p.terrain || p.terrainDesign) && projectTerrainDimension(p, source) === dimension && p.world?.dimension === dimension);
    let live = true;
    void Promise.allSettled(withTerrain.map(p => projectTerrain(repo, p, source)!)).then(results => {
      if (!live) return;
      const next = new Map<string, TerrainSurvey>(), errors: string[] = [];
      results.forEach((r, i) => { if (r.status === 'fulfilled') next.set(withTerrain[i]!.id, r.value); else errors.push(`${withTerrain[i]!.name}: ${errorText(r.reason)}`); });
      setSurveys(next); setSurveyErrors(errors);
      setPlannedCount(withTerrain.filter((p, i) => results[i]!.status === 'fulfilled' && p.terrainDesign && (planned || !p.terrain)).length);
    });
    return () => { live = false; };
  }, [projects, dimension, repo, planned]);
  const hasDesigns = !!projects?.some(p => p.terrainDesign && p.terrain && p.world?.dimension === dimension);
  const terrain = useMemo(() => showTerrain ? [...surveys.values()] : [], [surveys, showTerrain]);

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
  // Terrain cells join the 3D scene as display data; planned blocks win where both stand.
  const ground = useMemo(() => {
    if (!map || !terrain.length) return null;
    const occupied = new Set<string>();
    for (const c of map.cells) if (terrain.some(s => surveyCovers(s, c.position[0], c.position[2], c.position[0] + 1, c.position[2] + 1))) occupied.add(`${c.position[0]},${c.position[1]},${c.position[2]}`);
    return surveyDisplayCells(terrain, { maxCells: MAP_MAX_CELLS - map.cells.length, occupied: (x, y, z) => occupied.has(`${x},${y},${z}`) });
  }, [map, terrain]);
  const payload = useMemo<VoxelPayload | null>(() => {
    if (!map) return null;
    if (!ground?.count) return map.bounds ? { schemaVersion: 1, profileId: 'weltkarte:anzeige', bounds: map.bounds, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette: map.palette, cells: map.cells, blockEntities: [] } : null;
    const offset = map.palette.length, cells: Cell[] = [...map.cells];
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    if (map.bounds) for (let k = 0; k < 3; k++) { min[k] = map.bounds.min[k]!; max[k] = map.bounds.maxExclusive[k]!; }
    for (let i = 0; i < ground.count; i++) {
      const position: [number, number, number] = [ground.cells[i * 4]!, ground.cells[i * 4 + 1]!, ground.cells[i * 4 + 2]!];
      cells.push({ position, kind: 'block', paletteIndex: offset + ground.cells[i * 4 + 3]! });
      for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k]!, position[k]!); max[k] = Math.max(max[k]!, position[k]! + 1); }
    }
    return { schemaVersion: 1, profileId: 'weltkarte:anzeige', bounds: { min: min as [number, number, number], maxExclusive: max as [number, number, number] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0],
      palette: [...map.palette, ...ground.ids.map(id => ({ id, properties: {} }))], cells, blockEntities: [] };
  }, [map, ground]);
  /** Survey area as bounds, for framing projects without blocks (an empty building site). */
  const surveyBounds = useCallback((projectId: string): Bounds | null => {
    const s = surveys.get(projectId); if (!s) return null;
    const p = projects?.find(x => x.id === projectId), y = p?.world?.origin[1] ?? 64;
    return { min: [s.minX, y - 8, s.minZ], maxExclusive: [s.minX + s.width, y + 8, s.minZ + s.length] };
  }, [surveys, projects]);

  const fly = useCallback((projectId: string) => {
    const e = map?.entries.find(x => x.projectId === projectId);
    setSelected(projectId);
    const b = e?.worldBounds && !e.skipped ? e.worldBounds : surveyBounds(projectId);
    if (b) setFrame3d({ bounds: b, seq: ++seq.current });
    setFrame2d({ projectId, seq: ++seq.current });
  }, [map, surveyBounds]);
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

  // ------------------------------------------------------------ MAP-03: Weltplan and live game
  const items = useMemo(() => itemsOf(wp.plan, dimension), [wp.plan, dimension]);
  const item = items.find(i => i.id === selectedItem) ?? null;
  const status = game.status, player = status?.player ?? null;
  const liveChunks = game.chunks.get(dimension);
  const tiles = useMemo(() => {
    if (!liveChunks?.size) return [];
    let lo = Infinity, hi = -Infinity;
    for (const c of liveChunks.values()) for (const col of c.columns) if (col) { lo = Math.min(lo, col.surface); hi = Math.max(hi, col.surface); }
    return [...liveChunks.values()].map(c => ({ x: c.x, z: c.z, img: chunkImage(c, lo, hi) }));
  }, [liveChunks, game.chunkVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const groundAt = useCallback((x: number, z: number) => {
    const col = liveChunks?.get(`${Math.floor(x / 16)},${Math.floor(z / 16)}`)?.columns[((z & 15) << 4) | (x & 15)];
    if (col) return { y: col.surface, id: col.surfaceId, live: true };
    for (const sv of terrain) { const c = columnAt(sv, x, z); if (c) return { y: c.surface, id: c.surfaceId, live: false }; }
    return null;
  }, [liveChunks, terrain, game.chunkVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const holo = status?.hologram ?? null;
  const holoProject = holo && projects ? hologramProject(holo, projects) : null;
  const holoMatch = holo && holoProject ? compareHologram(holo, holoProject) : null;
  // Following the player also follows them into another dimension.
  useEffect(() => { if (follow && player && player.dimension !== dimension) { setDimension(player.dimension); setSelected(null); } }, [follow, player?.dimension]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = useCallback((hit: MapHit | null) => {
    if (hit?.kind === 'item') { setSelectedItem(hit.id); setSelected(null); }
    else { setSelectedItem(null); setSelected(hit?.id ?? null); }
  }, []);
  const moveHit = useCallback((hit: MapHit, dx: number, dz: number) => {
    if (hit.kind === 'item') {
      const it = items.find(i => i.id === hit.id); if (!it) return;
      void wp.apply({ kind: 'update', item: moveItem(it, dx, dz) }).then(ok => ok && setNotice(`„${it.name}“ um ${dx} / ${dz} verschoben.`));
      return;
    }
    const p = projects?.find(x => x.id === hit.id); if (!p?.world) return;
    const o = p.world.origin;
    void save(p, worldOperation({ ...p.world, origin: [o[0] + dx, o[1], o[2] + dz] }, 'Auf der Karte verschoben'));
  }, [items, wp, projects, save]);
  const draw = useCallback((d: MapDraft) => {
    const n = (kind: WorldItem['kind']) => items.filter(i => i.kind === kind).length + 1;
    let next: WorldItem;
    if (d.kind === 'site') {
      const rect = d.snap ? snapSiteToChunks(siteFromCorners(d.a, d.b)) : siteFromCorners(d.a, d.b);
      const g = groundAt(rect.minX + Math.floor(rect.width / 2), rect.minZ + Math.floor(rect.length / 2));
      next = { kind: 'site', id: newWorldItemId('site'), name: `Bauplatz ${n('site')}`, note: '', dimension, ...rect, y: g ? g.y + 1 : null, projectId: null };
    } else if (d.kind === 'path') {
      next = { kind: 'path', id: newWorldItemId('path'), name: `Weg ${n('path')}`, note: '', dimension, style: 'weg', width: 3, points: d.points.map(p => [p[0], p[1]] as const) };
    } else {
      const g = groundAt(d.x, d.z);
      const y = g ? g.y + 1 : player && player.dimension === dimension ? Math.floor(player.y) : 64;
      next = { kind: 'point', id: newWorldItemId('point'), name: `Punkt ${n('point')}`, note: '', dimension, type: 'ziel', x: d.x, y, z: d.z };
    }
    void wp.apply({ kind: 'add', item: next }).then(ok => {
      if (!ok) return;
      setSelectedItem(next.id); setSelected(null); setTool('select');
      setNotice(`${next.name} angelegt${next.kind === 'point' && !groundAt(next.x, next.z) ? ' (Höhe geschätzt: kein Gelände bekannt)' : ''}.`);
    });
  }, [items, dimension, groundAt, player, wp]);
  const planLayer: PlanLayer = {
    items, selectedItem, tool, onTool: setTool, onPick: pick, onMove: moveHit, onDraw: draw, follow, groundAt, tiles,
    player: player && player.dimension === dimension ? { x: player.x, z: player.z, yaw: player.yaw, name: player.name } : null,
    trail: player && player.dimension === dimension ? game.trail : [],
    hologram: holo && holo.placement.dimension === dimension ? { box: [holo.box[0], holo.box[2], holo.box[3], holo.box[5]], matches: holoMatch === 'same',
      label: `Hologramm ${holo.name} · ${Math.round(liveShare(holo).share * 100)} % im Spiel` } : null,
  };
  // Ctrl+Z / Ctrl+Y for the Weltplan while no text field has the focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || (e.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable=true]')) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey && wp.canUndo) { e.preventDefault(); void wp.undo(); }
      else if ((k === 'y' || (k === 'z' && e.shiftKey)) && wp.canRedo) { e.preventDefault(); void wp.redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [wp]);

  const connected = game.phase === 'connected';
  const loadTerrainHere = async () => {
    if (!player) return;
    setTerrainBusy(true);
    try {
      const r = await game.loadTerrain(player.x, player.z, 10);
      if (player.dimension !== dimension) setDimension(player.dimension);
      setNotice(`${r.read} Chunks aus dem Spiel gelesen${r.missing ? `, ${r.missing} sind im Spiel gerade nicht geladen` : ''}.`);
    } catch (e) { setNotice(errorText(e)); }
    finally { setTerrainBusy(false); }
  };
  const sendMarks = async () => {
    const t = game.token(); if (!t) return;
    setSending('marks');
    try { const n = await liveApi.marks(game.settings.port, t, dimension, items); setNotice(`${n} Weltplan-Einträge (${dimensionLabel(dimension)}) im Spiel als Markierungen eingeblendet.`); }
    catch (e) { setNotice(errorText(e)); }
    finally { setSending(''); }
  };
  /** Plan of a project as .schem to the mod and place it exactly where the map has it. */
  const sendToGame = async (p: Project) => {
    const t = game.token(); if (!t || !p.world) return;
    setSending(p.id);
    try {
      const dv = suggestDataVersion(p, library.versions).dataVersion ?? 5023;
      const prepared = await prepareRevisionExport(p, library.versions, { format: 'schem', dataVersion: dv, anchor: 'project-origin', unselected: 'structure_void' });
      if (prepared.created) await repo.saveProject(prepared.project, p.revision);
      const w = p.world, out = prepared.output;
      const msg = await liveApi.plan(game.settings.port, t, out.fileName, { dimension: w.dimension, x: w.origin[0], y: w.origin[1], z: w.origin[2], turns: 0, mirror: false }, out.bytes);
      setNotice(`${msg} Revision ${out.revision.number}.`);
      if (prepared.created) await load();
    } catch (e) { setNotice(errorText(e)); }
    finally { setSending(''); }
  };
  const adoptHologram = async () => {
    if (!holo || !holoProject) return;
    if (holo.placement.turns || holo.placement.mirror) { setNotice('Das Hologramm ist im Spiel gedreht oder gespiegelt. Die Weltkarte plant Projekte ungedreht – drehe das Projekt im Editor oder setze das Hologramm im Spiel zurück.'); return; }
    const pl = holo.placement;
    if (await save(holoProject, worldOperation({ ...(holoProject.world ?? createPlacement([pl.x, pl.y, pl.z], pl.dimension)), origin: [pl.x, pl.y, pl.z], dimension: pl.dimension }, 'Lage aus dem Spiel übernommen'))) {
      setDimension(pl.dimension); setSelected(holoProject.id); setFrame2d({ projectId: holoProject.id, seq: ++seq.current });
    }
  };
  const placeAtPlayer = async (p: Project) => {
    if (!player) return;
    const origin = originFromPlayer(player);
    if (await save(p, worldOperation({ ...(p.world ?? createPlacement(origin, player.dimension)), origin, dimension: player.dimension }, 'An die Spielerposition gesetzt'))) {
      setDimension(player.dimension); setFrame2d({ projectId: p.id, seq: ++seq.current });
    }
  };
  /** Site actions: put its project there; keep the live terrain under it as the project's survey. */
  const siteActions = (it: WorldItem) => {
    if (it.kind !== 'site') return null;
    const p = it.projectId ? projects?.find(x => x.id === it.projectId) ?? null : null;
    const covered = liveChunks && [...liveChunks.values()].some(c => c.x * 16 < it.minX + it.width && c.x * 16 + 16 > it.minX && c.z * 16 < it.minZ + it.length && c.z * 16 + 16 > it.minZ);
    return <>
      {p && <button className="secondary" onClick={() => {
        const origin: [number, number, number] = [it.minX, it.y ?? p.world?.origin[1] ?? 64, it.minZ];
        void save(p, worldOperation({ ...(p.world ?? createPlacement(origin, it.dimension)), origin, dimension: it.dimension }, `Auf Bauplatz „${it.name}“ gesetzt`)).then(ok => ok && setFrame2d({ projectId: p.id, seq: ++seq.current }));
      }} title="Setzt den Projektursprung auf die Nordwestecke des Bauplatzes (Höhe des Bauplatzes).">„{p.name}“ hierher setzen</button>}
      {p && covered && <button className="secondary" onClick={() => void (async () => {
        try {
          const area = areaAround(it.minX, it.minZ, it.minX + it.width, it.minZ + it.length, 8);
          const sv = liveSurvey(area, it.dimension, (cx, cz) => liveChunks!.get(`${cx},${cz}`));
          const ref = await storeSurvey(repo, sv, `Gelände ${it.name} (aus dem Spiel)`);
          await save(p, { kind: 'terrain.set', terrain: ref, label: 'Geländeaufnahme aus dem Spiel' });
        } catch (e) { setNotice(errorText(e)); }
      })()} title="Speichert die oberste Schicht, die die Mod geliefert hat, als Geländeaufnahme des Projekts (Reiter „Gelände“).">Gelände aus dem Spiel ins Projekt</button>}
      {!p && <span className="muted small">Wähle oben ein Projekt für diesen Bauplatz, dann kannst du es hierher setzen.</span>}
    </>;
  };

  // Preview of an edited placement: outline + neighbours whose footprint it touches.
  const previewBounds = preview && entry?.localBounds && preview.dimension === dimension ? translateBounds(entry.localBounds, preview.origin) : null;
  const previewHits = previewBounds && map ? footprintNeighbours(map, previewBounds, selected ?? undefined) : [];

  if (loadError) return <div className="page"><div className="notice warning" role="alert"><strong>Projekte nicht geladen</strong><p>{loadError}</p></div></div>;
  const drawn = map?.entries.filter(e => !e.skipped) ?? [];
  const otherDims = map ? Object.entries(map.elsewhere) : [];
  const dims = [...DIMENSIONS.map(d => d.id), ...otherDims.map(([d]) => d).filter(d => !DIMENSIONS.some(x => x.id === d))];
  const collisionsOf = (id: string) => map?.collisions.filter(c => c.cells && (c.a === id || c.b === id)) ?? [];
  // Earthwork estimate of the selected project on the first survey that covers its footprint (own survey first).
  const estimate = useMemo((): { survey: TerrainSurvey; own: boolean; result: EarthworkEstimate; shift: number } | null => {
    if (!map || !entry?.worldBounds || entry.skipped || !project?.world) return null;
    const b = entry.worldBounds;
    const dy = preview && preview.dimension === dimension ? [preview.origin[0] - project.world.origin[0], preview.origin[1] - project.world.origin[1], preview.origin[2] - project.world.origin[2]] as const : [0, 0, 0] as const;
    const own = surveys.get(entry.projectId);
    const candidates = [...(own ? [own] : []), ...[...surveys.values()].filter(s => s !== own)];
    const survey = candidates.find(s => surveyCovers(s, b.min[0] + dy[0], b.min[2] + dy[2], b.maxExclusive[0] + dy[0], b.maxExclusive[2] + dy[2]))
      ?? candidates.find(s => surveyCovers(s, b.min[0] + dy[0], b.min[2] + dy[2], b.min[0] + dy[0] + 1, b.min[2] + dy[2] + 1));
    if (!survey) return null;
    const cells = map.cells.filter((_, i) => map.owner[i] === entry.index);
    return { survey, own: survey === own, result: estimateEarthwork(columnBases(cells, dy), survey), shift: dy[1] };
  }, [map, entry, project, surveys, preview, dimension]);

  return <div className="page map-page" data-map-state={busy ? 'busy' : map ? 'ready' : 'empty'} data-map-cells={map?.cells.length ?? ''} data-terrain-cells={ground?.count ?? 0}>
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
        {surveys.size > 0 && <label className="chip-check"><input type="checkbox" checked={showTerrain} onChange={e => setShowTerrain(e.target.checked)} /> Gelände ({surveys.size})</label>}
        {hasDesigns && <label className="chip-check" title="Projekte mit Geländegestaltung (Reiter „Landschaft“) zeigen das geplante statt des aufgenommenen Geländes."><input type="checkbox" checked={planned} onChange={e => setPlanned(e.target.checked)} /> geplantes Gelände</label>}
        <button className="secondary" aria-pressed={tour} disabled={!drawn.length} onClick={() => setTour(t => !t)}>{tour ? '■ Rundflug beenden' : '▶ Rundflug'}</button>
      </div>
    </header>
    <p className="map-terrain" role="note">{surveys.size ? <>Gelände aus {surveys.size} Geländeaufnahme{surveys.size === 1 ? '' : 'n'} (gestrichelt umrandet){plannedCount > 0 && <>, davon {plannedCount} als geplantes Gelände aus dem Reiter „Landschaft“</>}; außerhalb bleibt es ungeprüft. Aufnehmen im Projektreiter „Gelände“ oder als Bauplatz im <a href="#/welt">Weltimport</a>.</>
      : <>{TERRAIN_NOTE} Lage, Höhe und Abstände prüfst du im Spiel oder auf eurer Live-Karte. Echtes Gelände zeigt die Karte, sobald ein Projekt eine Geländeaufnahme hat (Reiter „Gelände“ oder Bauplatz im <a href="#/welt">Weltimport</a>).</>}</p>
    {surveyErrors.length > 0 && <div className="notice warning" role="alert">Geländeaufnahme nicht geladen: {surveyErrors.join(' · ')}</div>}
    {ground && ground.skipped > 0 && <p className="notice" role="status">{ground.skipped} Geländeaufnahme(n) in 3D nicht gezeigt: Anzeigebudget erreicht. Die Draufsicht zeigt sie weiter.</p>}
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
            {connected && player && <button className="secondary" onClick={() => { const p = projects?.find(x => x.id === u.projectId); if (p) void placeAtPlayer(p); }} title="Setzt den Projektursprung auf den Block, auf dem du im Spiel stehst.">Wo ich stehe</button>}
          </li>)}</ul></>}
        {projects && !projects.length && <p className="muted">Noch keine Projekte. <a href="#/">Projekt anlegen</a></p>}
        <h2>Weltplan <small>{items.length}</small></h2>
        <PlanList items={items} selected={selectedItem} onSelect={id => { setSelectedItem(id); setSelected(null); }} />
      </aside>

      <section className="map-main">
        <PlanToolbar tool={tool} onTool={setTool} canUndo={wp.canUndo} canRedo={wp.canRedo} onUndo={() => void wp.undo()} onRedo={() => void wp.redo()} />
        {wp.error && <div className="notice warning" role="alert">{wp.error}</div>}
        <div className="map-panels">
          {map ? <OverviewMap map={map} tops={tops} colorOf={baseColor} selected={selected} onSelect={setSelected} onFly={fly} frame={frame2d}
            preview={previewBounds ? { bounds: previewBounds, conflict: previewHits.length > 0 } : null} terrain={terrain} boundsOf={surveyBounds} plan={planLayer} />
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

        {item && <PlanItemEditor key={item.id} item={item} projects={projects ?? []} onClose={() => setSelectedItem(null)}
          onSave={next => void wp.apply({ kind: 'update', item: next }).then(ok => ok && setNotice(`„${next.name}“ gespeichert.`))}
          onRemove={() => void wp.apply({ kind: 'remove', id: item.id }).then(ok => { if (ok) { setSelectedItem(null); setNotice(`„${item.name}“ entfernt. Rückgängig mit ↶ oder Strg+Z.`); } })}
          actions={siteActions(item)} />}
        <LiveGamePanel game={game} actions={{
          follow, onFollow: setFollow, terrainBusy, onLoadTerrain: () => void loadTerrainHere(), chunkCount: liveChunks?.size ?? 0,
          onShowPlayer: () => { if (player) { setDimension(player.dimension); setFollow(true); } },
          onSendMarks: connected && sending !== 'marks' ? () => void sendMarks() : null,
          marksInfo: `${items.length} Einträge in ${dimensionLabel(dimension)}${status?.marks ? ` · im Spiel: ${status.marks}` : ''}`,
          hologramProject: holoProject, hologramMatch: holoMatch,
          onAdoptHologram: holoMatch && holoMatch !== 'same' && holoMatch !== 'turned' ? () => void adoptHologram() : null,
        }} />
        {entry && project && <section className="map-detail" aria-label={`Details zu ${entry.name}`}>
          <header><h2>{entry.name}</h2>
            <div className="button-row">
              <button className="primary" disabled={!!entry.skipped && !surveys.has(entry.projectId)} onClick={() => fly(entry.projectId)}>✈ Hinfliegen</button>
              <a href={href({ view: 'project', projectId: entry.projectId, tab: 'editor' })}>Im Editor öffnen</a>
              <a href={href({ view: 'project', projectId: entry.projectId, tab: 'bauen' })}>Bauanleitung</a>
              <LiveMapLink settings={live} entry={entry} />
            </div></header>
          {connected && <div className="button-row map-game-actions">
            <button className="primary" disabled={!!sending || entry.blocks === 0} onClick={() => void sendToGame(project)}
              title="Exportiert den aktuellen Stand als Revision (.schem) und blendet ihn im Spiel genau an dieser Lage als Hologramm ein.">{sending === project.id ? 'Wird gesendet …' : '▶ Ins Spiel senden'}</button>
            <button className="secondary" disabled={!player} onClick={() => void placeAtPlayer(project)} title="Setzt den Projektursprung auf den Block, auf dem du im Spiel stehst.">Hier platzieren, wo ich stehe</button>
            {holoProject?.id === project.id && holoMatch && holoMatch !== 'same' && <span className="warn-text small">Im Spiel: {holoMatch === 'moved' ? 'an anderer Stelle' : holoMatch === 'turned' ? 'gedreht/gespiegelt' : 'andere Dimension'}</span>}
          </div>}
          <Facts entry={entry} />
          {entry.skipped && <p className="notice">Nicht gezeichnet: {MAP_SKIP_LABEL[entry.skipped]}{entry.error ? ` (${entry.error})` : ''}.</p>}
          {estimate && <TerrainEstimate estimate={estimate} preview={!!preview} onApply={estimate.result.suggestedShift && !preview ? () => {
            const w = project.world!;
            void save(project, worldOperation({ ...w, origin: [w.origin[0], w.origin[1] + estimate.result.suggestedShift!, w.origin[2]] }, 'Höhe ans Gelände angepasst'));
          } : null} />}
          {!estimate && entry.worldBounds && !entry.skipped && surveys.size > 0 && <p className="muted small">Keine Geländeaufnahme unter diesem Projekt.</p>}
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

function TerrainEstimate({ estimate, preview, onApply }: { estimate: { survey: TerrainSurvey; own: boolean; result: EarthworkEstimate; shift: number }; preview: boolean; onApply: (() => void) | null }) {
  const r = estimate.result;
  const ok = !r.hanging && !r.buried && !r.water && !r.unknown;
  return <section className="map-terrain-estimate" aria-label="Gelände unter dem Projekt" data-testid="map-terrain-estimate">
    <h3>Gelände {preview ? 'an der neuen Lage' : 'unter dem Projekt'} <small>{estimate.own ? 'eigene Geländeaufnahme' : 'Geländeaufnahme eines Nachbarprojekts'}</small></h3>
    <p className={ok ? 'ok-text' : 'warn-text'}>{ok ? 'Fundament liegt laut Höhenkarte überall auf, kein Gelände im Weg.'
      : [r.hanging && `${r.hanging} Fundamentspalten hängen (${formatNumber(r.fill)} Blöcke Unterbau, bis ${r.maxGap} tief)`, r.buried && `${r.buried} Spalten im Boden (${formatNumber(r.cut)} Blöcke abtragen)`,
        r.water && `${r.water} Spalten im Wasser`, r.unknown && `${r.unknown} Spalten unbekannt`].filter(Boolean).join(' · ')}</p>
    {r.ground && <p>Boden im Grundriss Y {r.ground.min} … {r.ground.max} (Median {r.ground.median}); unterste Bauschicht Y {r.baseY}.
      {r.suggestedShift ? <> Vorschlag: {r.suggestedShift > 0 ? `${r.suggestedShift} höher` : `${-r.suggestedShift} tiefer`}. {onApply && <button type="button" className="secondary" onClick={onApply}>Höhe ans Gelände anpassen</button>}</> : null}</p>}
    <p className="muted small">{EARTHWORK_NOTE}</p>
  </section>;
}
