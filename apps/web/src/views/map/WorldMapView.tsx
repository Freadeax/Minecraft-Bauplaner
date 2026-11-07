import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EARTHWORK_NOTE, MAP_MAX_CELLS, columnAt, columnBases, compareHologram, describeOperation, estimateEarthwork, hologramProject, itemsOf, liveShare, liveSurvey,
  moveItem, newWorldItemId, originFromPlayer, siteFromCorners, snapSiteToChunks, surveyCovers, surveyDisplayCells, suggestDataVersion,
  alignToGround, duplicateItems, insertPathVertex, itemsInRect, joinPaths, mirrorItem, movePathVertex, removeItemsOp, removePathVertex, reversePath,
  rotateItem, selectionBounds, selectionPivot, splitPath, updateItemsOp,
  layerNames, marksForMod, routePath, setLayerOp, setGroupOp, setLockedOp, withGroupMates, splitLocked, groupSummary, groupNames, LIVE_FEATURE_GROUPS, trailToPath, pointTypeLabel, checkPlanForMod, LIVE_PLAN_EXPORT,
  gameMarksToItems, liveCan, LIVE_FEATURE_MARKS3, GAME_MARKS_LAYER,
  isTurned, livePlacementOf, placedBounds, sameTurn, turnInPlace, turnLabel, turnOf, withTurn,
} from '../../../../../packages/domain/src/index.js';
import type { EarthworkEstimate, LiveGameMark, Operation, Project, TerrainSurvey, WorldItem, WorldPath, WorldPlanOp, WorldPointType, Polyline } from '../../../../../packages/domain/src/index.js';
import { prepareRevisionExport } from '../../../../../packages/application/src/index.js';
import { projectLinks, projectStartCheck, projectSuccessors } from '../../../../../packages/domain/src/planning/projectOrder.js';
import {
  DIMENSIONS, MAP_SKIP_LABEL, TERRAIN_NOTE, chunkOf, dimensionLabel, footprintNeighbours, suggestPlacement, topViews, translateBounds, worldOperation, createPlacement,
} from '../../../../../packages/domain/src/world/worldmap.js';
import type { MapEntry, WorldMapView as MapData, WorldPlacement } from '../../../../../packages/domain/src/world/worldmap.js';
import type { Bounds, Cell, VoxelPayload } from '../../../../../packages/voxel/src/index.js';
import { useApp } from '../../app/context';
import { href } from '../../app/router';
import { errorText, formatNumber } from '../../app/ui';
import { mix, stateColor } from '../../colors';
import { Viewer } from '../../Viewer';
import type { Mark } from '../../viewer/types';
import { OverviewMap } from './OverviewMap';
import type { MapDraft, MapHit, MapTool, MapVertex, PlanLayer } from './OverviewMap';
import { LiveGamePanel } from './LiveGamePanel';
import { GameProgressPanel, useGameProgress } from './GameProgress';
import { liveApi, useLiveGame } from './liveClient';
import { hasServerPairing } from '../mod/serverClient';
import { chooseServerAnchor, uploadPlanToServer } from '../mod/planUpload';
import { PlanItemEditor, PlanToolbar } from './PlanPanel';
import { useWorldPlan } from './useWorldPlan';
import { useMapHistory } from './useMapHistory';
import type { MapChange, MapStep } from './useMapHistory';
import { GroupToggles, LayerToggles, MapContextMenu, ObjectList, SelectionBar, useHiddenGroups, useHiddenLayers, useLayers } from './Builder';
import type { MenuEntry } from './Builder';
import { chunkImage } from './terrainLayer';
import { areaAround, storeSurvey } from '../world/surveys';
import { PlacementForm } from './PlacementForm';
import { LiveMapPanel, LiveMapLink, liveMapUrlAt } from './LiveMapPanel';
import { useLiveMapSettings, useSavedLiveMaps } from './liveMapConfig';
import { useWorldShare } from './useWorldShare';
import { WorldSharePanel } from './WorldSharePanel';
import { computeMap } from './transport';
import { projectTerrain, projectTerrainDimension } from '../world/designs';
import '../../styles/map.css';

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
  // MAP-04: several projects and Weltplan entries can be selected; the last one is the primary (details, editor).
  const [selection, setSelection] = useState<readonly MapHit[]>(initial.projectId ? [{ kind: 'project', id: initial.projectId }] : []);
  const primary = selection.at(-1) ?? null;
  const selected = primary?.kind === 'project' ? primary.id : null;
  const setSelected = useCallback((id: string | null) => setSelection(id ? [{ kind: 'project', id }] : []), []);
  const [showHidden, setShowHidden] = useState(false);
  const [mode, setMode] = useState<ColorMode>('block');
  const [map, setMap] = useState<MapData | null>(null);
  const [mapError, setMapError] = useState('');
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState('');
  const [noticeUndo, setNoticeUndo] = useState(false);
  const [frame3d, setFrame3d] = useState<{ bounds: Bounds; seq: number } | null>(null);
  const [frame2d, setFrame2d] = useState<{ projectId: string | null; seq: number; bounds?: Bounds | null } | null>(null);
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
  // MAP-03: planning tools and the live game.
  const game = useLiveGame();
  const [tool, setTool] = useState<MapTool>('select');
  const selectedItem = primary?.kind === 'item' ? primary.id : null;
  const [layers, setLayers] = useLayers();
  // MAP-06: named layers (hidden ones are remembered per browser).
  const [hiddenNames, setHiddenNames] = useHiddenLayers();
  // GAME-07-S11: named groups (hidden ones are remembered per browser).
  const [hiddenGroups, setHiddenGroups] = useHiddenGroups();
  const [menu, setMenu] = useState<{ at: { x: number; y: number }; hit: MapHit | null; vertex: MapVertex | null; column: readonly [number, number] } | null>(null);
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

  // MAP-04: one undo history for Weltplan entries and project placements.
  const wp = useWorldPlan(repo);
  const onHistoryError = useCallback((m: string) => { setNotice(m); setNoticeUndo(false); void load(); }, [load]);
  const history = useMapHistory({ repo, commitPlan: wp.commit, epoch: wp.epoch, onSaved: load, onError: onHistoryError });
  /** Runs a change; on success shows `message` with a „Rückgängig“ button. */
  const change = useCallback(async (c: MapChange, message?: string): Promise<boolean> => {
    const ok = await history.run(c);
    if (ok) { setNotice(message ?? `${c.label}.`); setNoticeUndo(true); }
    return ok;
  }, [history]);
  const save = useCallback(async (p: Project, op: Operation): Promise<boolean> => {
    const ok = await change({ label: `${describeOperation(op)}: „${p.name}“`, steps: [{ kind: 'project', projectId: p.id, op }] });
    if (ok) setPreview(null);
    return ok;
  }, [change]);
  const undo = useCallback(async () => {
    const label = await history.undo();
    if (label) { setNotice(`Rückgängig gemacht: ${label}.`); setNoticeUndo(false); }
  }, [history]);
  const redo = useCallback(async () => {
    const label = await history.redo();
    if (label) { setNotice(`Wiederholt: ${label}.`); setNoticeUndo(false); }
  }, [history]);
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
  // WORLD-SHARE-01: Weltplan, map markers and server web maps over the Team-Raum.
  const [savedMaps, setSavedMaps] = useSavedLiveMaps();
  const share = useWorldShare({ projects, items: wp.plan.items, loaded: wp.loaded, map, dimension, replace: wp.replace, savedMaps, setSavedMaps, live, setLive });
  // The editor shows one entry; with several selected the selection bar takes over.
  const item = selection.length === 1 ? items.find(i => i.id === selectedItem) ?? null : null;
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
  // MAP-05: Baustand of the hologram project from the game (mod 0.7.1+).
  const progress = useGameProgress(game, holoProject, dimension);
  // Following the player also follows them into another dimension.
  useEffect(() => { if (follow && player && player.dimension !== dimension) { setDimension(player.dimension); setSelected(null); } }, [follow, player?.dimension]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------ MAP-04: Weltbuilder (selection and editing)
  const names = useMemo(() => layerNames(items), [items]);
  const groups = useMemo(() => groupNames(items), [items]);
  const groupInfo = useMemo(() => groupSummary(items), [items]);
  const visibleItems = useMemo(() => items.filter(i => layers[i.kind] && !(i.layer && hiddenNames.has(i.layer)) && !(i.group && hiddenGroups.has(i.group))), [items, layers, hiddenNames, hiddenGroups]);
  const selItemIds = useMemo(() => new Set(selection.filter(h => h.kind === 'item').map(h => h.id)), [selection]);
  const selItems = useMemo(() => visibleItems.filter(i => selItemIds.has(i.id)), [visibleItems, selItemIds]);
  const selProjectIds = useMemo(() => new Set(selection.filter(h => h.kind === 'project').map(h => h.id)), [selection]);
  /** Selected projects placed in this dimension (only those can be moved or taken off the map here). */
  const selProjects = useMemo(() => layers.projects ? (projects ?? []).filter(p => selProjectIds.has(p.id) && p.world?.dimension === dimension) : [], [projects, selProjectIds, dimension, layers.projects]);
  const selectionCount = selItems.length + selProjects.length;
  const visibleSelection = useMemo(() => new Set(selItems.map(i => i.id)), [selItems]);
  const visibleProjects = useMemo(() => new Set(selProjects.map(p => p.id)), [selProjects]);

  const pick = useCallback((hit: MapHit | null, add = false) => {
    if (!add) {
      // GAME-07-S11: a click on a grouped entry selects the whole group; a second click on it (group already selected) only the entry.
      if (hit?.kind === 'item') {
        const mates = withGroupMates(visibleItems, hit.id);
        if (mates.length > 1) {
          setSelection(cur => {
            const same = cur.length === mates.length && mates.every(id => cur.some(h => h.kind === 'item' && h.id === id));
            return same ? [hit] : mates.map(id => ({ kind: 'item' as const, id }));
          });
          return;
        }
      }
      setSelection(hit ? [hit] : []); return;
    }
    if (!hit) return;
    // Toggle: a selected hit leaves the selection, a new one becomes the primary.
    setSelection(cur => cur.some(h => h.kind === hit.kind && h.id === hit.id) ? cur.filter(h => !(h.kind === hit.kind && h.id === hit.id)) : [...cur, hit]);
  }, [visibleItems]);
  const selectAll = useCallback(() => {
    const hits: MapHit[] = [...(layers.projects ? (map?.entries ?? []).filter(e => !e.skipped).map(e => ({ kind: 'project' as const, id: e.projectId })) : []), ...visibleItems.map(i => ({ kind: 'item' as const, id: i.id }))];
    setSelection(hits);
    setNotice(hits.length ? `${hits.length} auf der Karte ausgewählt.` : 'Hier gibt es nichts auszuwählen.'); setNoticeUndo(false);
  }, [map, visibleItems, layers.projects]);
  const boxSelect = useCallback((rect: [number, number, number, number], inside: readonly string[], add: boolean) => {
    const hits: MapHit[] = [...inside.map(id => ({ kind: 'project' as const, id })), ...itemsInRect(visibleItems, rect).map(i => ({ kind: 'item' as const, id: i.id }))];
    setSelection(cur => {
      if (!add) return hits;
      const has = (h: MapHit) => cur.some(c => c.kind === h.kind && c.id === h.id);
      return [...cur, ...hits.filter(h => !has(h))];
    });
  }, [visibleItems]);
  const frameItems = useCallback((list: readonly WorldItem[], extra: readonly Project[] = []) => {
    const b = selectionBounds(list);
    const boxes = [...(b ? [b] : []), ...extra.flatMap(p => { const e = map?.entries.find(x => x.projectId === p.id)?.worldBounds; return e ? [[e.min[0], e.min[2], e.maxExclusive[0], e.maxExclusive[2]] as const] : []; })];
    if (!boxes.length) return;
    const r = [Math.min(...boxes.map(x => x[0])), Math.min(...boxes.map(x => x[1])), Math.max(...boxes.map(x => x[2])), Math.max(...boxes.map(x => x[3]))];
    setFrame2d({ projectId: null, seq: ++seq.current, bounds: { min: [r[0]!, 0, r[1]!], maxExclusive: [r[2]!, 1, r[3]!] } });
  }, [map]);

  const planStep = (op: WorldPlanOp | null): MapStep[] => op ? [{ kind: 'plan', op }] : [];
  /** GAME-07-S11: locked entries keep their place and shape; say so once instead of failing the whole step. */
  const lockedNote = (locked: readonly WorldItem[], what: string): string => locked.length
    ? ` ${locked.length === 1 ? `„${locked[0]!.name}“ ist gesperrt und bleibt` : `${locked.length} gesperrte Einträge bleiben`} ${what} (entsperren mit 🔓 in der Auswahlleiste).` : '';
  const openSel = useMemo(() => splitLocked(selItems), [selItems]);
  /** Moves everything selected (entries and placed projects) by whole blocks, as one step. */
  const moveSelection = useCallback((dx: number, dz: number) => {
    if (!dx && !dz) return;
    const { open, locked } = openSel;
    if (!open.length && !selProjects.length) { setNotice(lockedNote(locked, 'stehen').trim()); setNoticeUndo(false); return; }
    const steps: MapStep[] = [
      ...planStep(updateItemsOp(open, open.map(i => moveItem(i, dx, dz)), 'Verschoben')),
      ...selProjects.map(p => ({ kind: 'project' as const, projectId: p.id, op: worldOperation({ ...p.world!, origin: [p.world!.origin[0] + dx, p.world!.origin[1], p.world!.origin[2] + dz] }, 'Auf der Karte verschoben') })),
    ];
    const what = selectionCount === 1 ? `„${selItems[0]?.name ?? selProjects[0]?.name}“` : `${selectionCount} Objekte`;
    void change({ label: `${what} um ${dx} / ${dz} verschoben`, steps }, locked.length ? `${what} verschoben.${lockedNote(locked, 'stehen')}` : undefined);
  }, [selItems, openSel, selProjects, selectionCount, change]); // eslint-disable-line react-hooks/exhaustive-deps
  const deleteHits = useCallback((wantIds: readonly string[], placed: readonly Project[]) => {
    const { open, locked } = splitLocked(wp.plan.items.filter(i => wantIds.includes(i.id)));
    const itemIds = open.map(i => i.id);
    if (!itemIds.length && !placed.length) { if (locked.length) { setNotice(lockedNote(locked, 'erhalten').trim()); setNoticeUndo(false); } return; }
    const op = removeItemsOp(wp.plan, itemIds);
    const removed = open;
    const steps: MapStep[] = [...planStep(op), ...placed.filter(p => p.world).map(p => ({ kind: 'project' as const, projectId: p.id, op: worldOperation(null, 'Von der Karte genommen') }))];
    if (!steps.length) return;
    const parts = [removed.length === 1 ? `„${removed[0]!.name}“ gelöscht` : removed.length ? `${removed.length} Einträge gelöscht` : '',
      placed.length === 1 ? `„${placed[0]!.name}“ von der Karte genommen` : placed.length ? `${placed.length} Projekte von der Karte genommen` : ''].filter(Boolean);
    const label = parts.join(', ');
    void change({ label, steps }, `${label}.${placed.length ? ' Die Projekte selbst bleiben erhalten (unter „Noch nicht platziert“).' : ''} Rückgängig mit Strg+Z.${lockedNote(locked, 'erhalten')}`).then(ok => {
      if (ok) setSelection(cur => cur.filter(h => h.kind === 'item' ? !itemIds.includes(h.id) : !placed.some(p => p.id === h.id)));
    });
  }, [wp.plan, change]); // eslint-disable-line react-hooks/exhaustive-deps
  const deleteSelection = useCallback(() => deleteHits(selItems.map(i => i.id), selProjects), [deleteHits, selItems, selProjects]);
  const duplicateSelection = useCallback(() => {
    if (!selItems.length) { setNotice('Projekte lassen sich hier nicht duplizieren – ein Projekt hat genau eine Lage. Lege in der Projektzentrale eine Kopie an.'); setNoticeUndo(false); return; }
    try {
      const copies = duplicateItems(selItems, { existing: wp.plan.items.length });
      void change({ label: copies.length === 1 ? `„${copies[0]!.name}“ angelegt` : `${copies.length} Kopien angelegt`, steps: [{ kind: 'plan', op: { kind: 'batch', label: 'Dupliziert', ops: copies.map(item => ({ kind: 'add' as const, item })) } }] },
        `${copies.length === 1 ? `„${copies[0]!.name}“` : `${copies.length} Kopien`} östlich daneben angelegt${selProjects.length ? ' (Projekte nicht mitkopiert)' : ''}.`)
        .then(ok => { if (ok) { setSelection(copies.map(c => ({ kind: 'item' as const, id: c.id }))); frameItems([...selItems, ...copies]); } });
    } catch (e) { setNotice(errorText(e)); setNoticeUndo(false); }
  }, [selItems, selProjects.length, wp.plan.items.length, change, frameItems]);
  const transformSelection = useCallback((how: { turns: number } | { axis: 'x' | 'z' }) => {
    if (!selItems.length && !selProjects.length) return;
    const label = 'turns' in how ? `Gedreht (${how.turns > 0 ? '90° im Uhrzeigersinn' : '90° gegen den Uhrzeigersinn'})` : how.axis === 'x' ? 'Ost-West gespiegelt' : 'Nord-Süd gespiegelt';
    try {
      const steps: MapChange['steps'][number][] = [];
      const { open, locked } = openSel;
      if (open.length) {
        const pivot = selectionPivot(open);
        const next = open.map(i => 'turns' in how ? rotateItem(i, pivot, how.turns) : mirrorItem(i, pivot, how.axis));
        const op = updateItemsOp(open, next, label);
        if (op) steps.push({ kind: 'plan', op });
      }
      if (!steps.length && locked.length && !selProjects.length) { setNotice(lockedNote(locked, 'wie sie sind').trim()); setNoticeUndo(false); return; }
      // MAP-07: projects turn in place (north-west corner of the footprint stays); Nord-Süd = Ost-West + 180°.
      for (const p of selProjects) {
        const local = map?.entries.find(e => e.projectId === p.id)?.localBounds ?? null;
        const w = 'turns' in how ? turnInPlace(p.world!, local, { turns: how.turns })
          : how.axis === 'x' ? turnInPlace(p.world!, local, { mirror: true }) : turnInPlace(turnInPlace(p.world!, local, { mirror: true }), local, { turns: 2 });
        steps.push({ kind: 'project', projectId: p.id, op: worldOperation(w, label) });
      }
      if (steps.length) void change({ label, steps }, `${label}${selProjects.length ? ' – Projekte drehen sich auf der Weltkarte um ihre Nordwestecke; „Ins Spiel senden“ setzt das Hologramm genauso gedreht' : ''}.${lockedNote(locked, 'wie sie sind')}`);
    } catch (e) { setNotice(errorText(e)); setNoticeUndo(false); }
  }, [selItems, openSel, selProjects, map, change]); // eslint-disable-line react-hooks/exhaustive-deps

  const editPath = useCallback((path: Polyline, next: Polyline | readonly [WorldPath, WorldPath], label: string) => {
    try {
      const ops: WorldPlanOp[] = Array.isArray(next) ? [{ kind: 'update', item: next[0] }, { kind: 'add', item: next[1] }] : [{ kind: 'update', item: next as Polyline }];
      void change({ label: `${label}: „${path.name}“`, steps: [{ kind: 'plan', op: { kind: 'batch', label, ops } }] }).then(ok => {
        if (ok && Array.isArray(next)) setSelection([{ kind: 'item', id: next[1].id }]);
      });
    } catch (e) { setNotice(errorText(e)); setNoticeUndo(false); }
  }, [change]);
  const pathOp = (fn: () => Polyline | readonly [WorldPath, WorldPath]): Polyline | readonly [WorldPath, WorldPath] | null => {
    try { return fn(); } catch (e) { setNotice(errorText(e)); setNoticeUndo(false); return null; }
  };
  const onVertex = useCallback((pathId: string, index: number, to: readonly [number, number], insert: boolean) => {
    const path = items.find((i): i is Polyline => i.id === pathId && (i.kind === 'path' || i.kind === 'zone')); if (!path) return;
    if (path.locked) { setNotice(`„${path.name}“ ist gesperrt – erst entsperren, dann Ecken ändern.`); setNoticeUndo(false); return; }
    const next = pathOp(() => insert ? insertPathVertex(path, index, to) : movePathVertex(path, index, to));
    if (next) editPath(path, next, `${path.kind === 'zone' ? 'Zonenecke' : 'Wegecke'} ${insert ? 'eingefügt' : 'verschoben'}`);
  }, [items, editPath]); // eslint-disable-line react-hooks/exhaustive-deps
  const twoPaths = selItems.length === 2 && selItems.every(i => i.kind === 'path') && !selProjects.length ? selItems as WorldPath[] : null;
  const joinable = useMemo(() => { if (!twoPaths) return null; try { return joinPaths(twoPaths[0]!, twoPaths[1]!); } catch { return null; } }, [twoPaths]);
  const joinSelected = () => {
    if (!twoPaths || !joinable) return;
    void change({ label: `Wege „${twoPaths[0]!.name}“ und „${twoPaths[1]!.name}“ verbunden`, steps: [{ kind: 'plan', op: { kind: 'batch', label: 'Wege verbunden', ops: [{ kind: 'update', item: joinable }, { kind: 'remove', id: twoPaths[1]!.id }] } }] })
      .then(ok => ok && setSelection([{ kind: 'item', id: joinable.id }]));
  };
  const alignSelection = useCallback(() => {
    const r = alignToGround(openSel.open, groundAt);
    const op = updateItemsOp(openSel.open, r.items, 'Ans Gelände ausgerichtet');
    if (!op) { setNotice(r.unknown ? 'Unter der Auswahl ist kein Gelände bekannt. Lade Gelände aus dem Spiel oder lege eine Geländeaufnahme an.' : 'Die Höhen passen schon zum Gelände.'); setNoticeUndo(false); return; }
    void change({ label: 'Ans Gelände ausgerichtet', steps: [{ kind: 'plan', op }] }, `${r.aligned} ${r.aligned === 1 ? 'Eintrag' : 'Einträge'} auf die Geländehöhe gesetzt${r.unknown ? `, bei ${r.unknown} ist kein Gelände bekannt` : ''}.${selProjects.length ? ' Projekte passt du im Detailfeld mit „Höhe ans Gelände anpassen“ an.' : ''}`);
  }, [openSel, selProjects.length, groundAt, change]);
  const canAlign = selItems.some(i => i.kind !== 'path' && i.kind !== 'zone');
  /** MAP-06: put the selected entries into a named layer (or take them out). */
  const assignLayer = useCallback((name: string) => {
    const op = setLayerOp(selItems, name);
    if (!op) return;
    void change({ label: op.kind === 'batch' ? op.label : 'Ebene geändert', steps: [{ kind: 'plan', op }] }, name ? `${selItems.length} ${selItems.length === 1 ? 'Eintrag' : 'Einträge'} in Ebene „${name}“ gelegt.` : `${selItems.length} ${selItems.length === 1 ? 'Eintrag' : 'Einträge'} aus der Ebene genommen.`)
      .then(ok => { if (ok && name && hiddenNames.has(name)) { const h = new Set(hiddenNames); h.delete(name); setHiddenNames(h); } });
  }, [selItems, change, hiddenNames, setHiddenNames]);
  /** GAME-07-S11: put the selected entries into a named group (or take them out). */
  const assignGroup = useCallback((name: string) => {
    let op: WorldPlanOp | null;
    try { op = setGroupOp(selItems, name); } catch (e) { setNotice(errorText(e)); setNoticeUndo(false); return; }
    if (!op) return;
    const n = `${selItems.length} ${selItems.length === 1 ? 'Eintrag' : 'Einträge'}`;
    void change({ label: op.kind === 'batch' ? op.label : 'Gruppe geändert', steps: [{ kind: 'plan', op }] }, name ? `${n} in Gruppe „${name}“. Ein Klick wählt jetzt die ganze Gruppe, ein zweiter nur den Eintrag.` : `${n} aus der Gruppe genommen.`)
      .then(ok => { if (ok && name && hiddenGroups.has(name)) { const h = new Set(hiddenGroups); h.delete(name); setHiddenGroups(h); } });
  }, [selItems, change, hiddenGroups, setHiddenGroups]);
  const selectionGroup = selItems.length ? (selItems.every(i => (i.group ?? '') === (selItems[0]!.group ?? '')) ? selItems[0]!.group ?? '' : null) : null;
  /** GAME-07-S11: lock or unlock the selected entries (one step). */
  const lockSelection = useCallback((locked: boolean) => {
    const op = setLockedOp(selItems, locked);
    if (!op) return;
    void change({ label: op.kind === 'batch' ? op.label : 'Sperre geändert', steps: [{ kind: 'plan', op }] },
      locked ? `${op.kind === 'batch' ? op.label : 'Gesperrt'}. Gesperrte Einträge lassen sich nicht verschieben, umformen oder löschen; im Hologramm der Mod ist der Plan dort grau.` : `${op.kind === 'batch' ? op.label : 'Entsperrt'}.`);
  }, [selItems, change]);
  const selectGroup = useCallback((name: string) => {
    const ids = visibleItems.filter(i => i.group === name).map(i => ({ kind: 'item' as const, id: i.id }));
    setSelection(ids);
    if (!ids.length) { setNotice(`Gruppe „${name}“ ist ausgeblendet.`); setNoticeUndo(false); }
  }, [visibleItems]);
  const selectionLayer = selItems.length ? (selItems.every(i => (i.layer ?? '') === (selItems[0]!.layer ?? '')) ? selItems[0]!.layer ?? '' : null) : null;
  /** MAP-06: re-route a path over the known terrain between its corners. */
  const routeSelected = useCallback((path: WorldPath) => {
    const r = routePath(path, groundAt, { unknownCost: null });
    if (!r) { setNotice('Keine Route gefunden: Unter dem Weg ist kein Gelände bekannt oder Stufen sind zu steil. Lade Gelände aus dem Spiel oder lege eine Geländeaufnahme an.'); setNoticeUndo(false); return; }
    void change({ label: `Route übers Gelände: „${path.name}“`, steps: [{ kind: 'plan', op: { kind: 'update', item: r.path } }] },
      `„${path.name}“ über das Gelände geführt (${r.path.points.length} Ecken${r.failed ? `, ${r.failed} von ${r.legs} Abschnitten ohne Route – gerade belassen` : ''}).`);
  }, [groundAt, change]);

  /** Adds a new entry (drawn, from the menu or from the game); switches its layer on and selects it. */
  const addItem = useCallback((next: WorldItem, message?: string) => {
    if (!layers[next.kind]) setLayers({ ...layers, [next.kind]: true });
    void change({ label: `${next.name} angelegt`, steps: [{ kind: 'plan', op: { kind: 'add', item: next } }] }, message ?? `${next.name} angelegt.`).then(ok => {
      if (!ok) return;
      setSelection([{ kind: 'item', id: next.id }]); setTool('select');
    });
  }, [change, layers, setLayers]);
  const countOf = (kind: WorldItem['kind']) => items.filter(i => i.kind === kind).length + 1;
  /** A point at a column; height from the ground, else from the player, else 64. */
  const addPoint = useCallback((x: number, z: number, type: WorldPointType = 'ziel', opts: { y?: number; name?: string } = {}) => {
    const g = groundAt(x, z);
    const y = opts.y ?? (g ? g.y + 1 : player && player.dimension === dimension ? Math.floor(player.y) : 64);
    const name = opts.name ?? (type === 'ziel' ? `Punkt ${countOf('point')}` : `${pointTypeLabel(type)} ${items.filter(i => i.kind === 'point' && i.type === type).length + 1}`);
    addItem({ kind: 'point', id: newWorldItemId('point'), name, note: '', dimension, type, x, y, z }, `${name} angelegt${opts.y === undefined && !g ? ' (Höhe geschätzt: kein Gelände bekannt)' : ''}.`);
  }, [items, dimension, groundAt, player, addItem]); // eslint-disable-line react-hooks/exhaustive-deps
  const draw = useCallback((d: MapDraft) => {
    if (d.kind === 'site') {
      const rect = d.snap ? snapSiteToChunks(siteFromCorners(d.a, d.b)) : siteFromCorners(d.a, d.b);
      const g = groundAt(rect.minX + Math.floor(rect.width / 2), rect.minZ + Math.floor(rect.length / 2));
      addItem({ kind: 'site', id: newWorldItemId('site'), name: `Bauplatz ${countOf('site')}`, note: '', dimension, ...rect, y: g ? g.y + 1 : null, projectId: null });
    } else if (d.kind === 'path') {
      addItem({ kind: 'path', id: newWorldItemId('path'), name: `Weg ${countOf('path')}`, note: '', dimension, style: 'weg', width: 3, points: d.points.map(p => [p[0], p[1]] as const) });
    } else if (d.kind === 'zone') {
      addItem({ kind: 'zone', id: newWorldItemId('zone'), name: `Zone ${countOf('zone')}`, note: '', dimension, category: 'sonstiges', points: d.points.map(p => [p[0], p[1]] as const) });
    } else addPoint(d.x, d.z);
  }, [items, dimension, groundAt, addItem, addPoint]); // eslint-disable-line react-hooks/exhaustive-deps
  /** MAP-06: a point where the player stands and the trail of the last minutes as a path. */
  const pointAtPlayer = () => { if (player) addPoint(Math.floor(player.x), Math.floor(player.z), 'anker', { y: Math.floor(player.y), name: `${player.name || 'Ich'} ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` }); };
  const trailAsPath = () => {
    if (!player || player.dimension !== dimension) return;
    const path = trailToPath(game.trail, { kind: 'path', id: newWorldItemId('path'), name: `Spur ${countOf('path')}`, note: `Spur von ${player.name || 'mir'} aus dem Spiel`, dimension, style: 'weg', width: 1 });
    if (!path) { setNotice('Die Spur ist noch zu kurz – laufe ein paar Blöcke, dann noch einmal.'); setNoticeUndo(false); return; }
    addItem(path, `„${path.name}“ aus deiner Spur angelegt (${path.points.length} Ecken).`);
  };

  const openMenu = useCallback((hit: MapHit | null, at: { x: number; y: number }, vertex: MapVertex | null, column: readonly [number, number]) => {
    // Right click on something unselected selects it first (like a file manager).
    if (hit && !selection.some(h => h.kind === hit.kind && h.id === hit.id)) setSelection([hit]);
    setMenu({ at, hit, vertex, column });
  }, [selection]);
  /** MAP-06: distance from the player in the game to the middle of the selection. */
  const playerDistance = useMemo(() => {
    if (!player || player.dimension !== dimension || !selectionCount) return null;
    const b = selectionBounds(selItems), boxes = [...(b ? [b] : []), ...selProjects.flatMap(p => { const e = map?.entries.find(x => x.projectId === p.id)?.worldBounds; return e ? [[e.min[0], e.min[2], e.maxExclusive[0], e.maxExclusive[2]] as const] : []; })];
    if (!boxes.length) return null;
    const cx = (Math.min(...boxes.map(x => x[0])) + Math.max(...boxes.map(x => x[2]))) / 2, cz = (Math.min(...boxes.map(x => x[1])) + Math.max(...boxes.map(x => x[3]))) / 2;
    const dx = cx - player.x, dz = cz - player.z, d = Math.hypot(dx, dz);
    const dir = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'][((Math.round(Math.atan2(dx, -dz) / (Math.PI / 4)) % 8) + 8) % 8];
    return `${formatNumber(Math.round(d))} Blöcke von dir (${dir})`;
  }, [player, dimension, selectionCount, selItems, selProjects, map]);
  const order = useMemo(() => projects ? projectLinks(projects) : [], [projects]);
  const planLayer: PlanLayer = {
    order,
    items: visibleItems, selection: visibleSelection, selectedProjects: visibleProjects, hideProjects: !layers.projects,
    tool, onTool: setTool, onPick: pick, onBox: boxSelect, onMove: moveSelection, onNudge: moveSelection, onContext: openMenu, onVertex, onDraw: draw, follow, groundAt, tiles,
    player: player && player.dimension === dimension ? { x: player.x, z: player.z, yaw: player.yaw, name: player.name } : null,
    trail: player && player.dimension === dimension ? game.trail : [],
    others: game.others && game.others.dimension === dimension ? game.others.players.filter(o => o.name !== player?.name) : [],
    hologram: holo && holo.placement.dimension === dimension ? { box: [holo.box[0], holo.box[2], holo.box[3], holo.box[5]], matches: holoMatch === 'same',
      label: `Hologramm ${holo.name} · ${Math.round(liveShare(holo).share * 100)} % im Spiel` } : null,
    deviations: progress.columns,
  };
  // Keyboard of the Weltbuilder while no text field has the focus:
  // Strg+Z/Strg+Y, Entf/Rücktaste löschen, Strg+D duplizieren, Strg+A alles, R drehen, Escape hebt die Auswahl auf.
  const keys = useRef({ undo, redo, deleteSelection, duplicateSelection, selectAll, transformSelection, selectionCount, menu: !!menu });
  keys.current = { undo, redo, deleteSelection, duplicateSelection, selectAll, transformSelection, selectionCount, menu: !!menu };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.defaultPrevented || keys.current.menu || target?.closest('input, textarea, select, [contenteditable=true], dialog, [role=dialog]')) return;
      // Only on the map page itself (body or inside it), not while another control like a button group handles keys.
      if (target && target !== document.body && !target.closest('.map-page')) return;
      const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey, k2 = keys.current;
      if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); void k2.undo(); }
      else if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); void k2.redo(); }
      else if (mod && k === 'a' && target?.closest('.overview, .builder-objects, .map-list')) { e.preventDefault(); k2.selectAll(); }
      else if (!k2.selectionCount) return;
      else if ((e.key === 'Delete' || e.key === 'Backspace') && !mod && !e.altKey) {
        // Not while a path is being drawn (Rücktaste takes back its last corner there).
        if (document.querySelector('.overview-canvas')?.getAttribute('data-draft')) return;
        e.preventDefault(); k2.deleteSelection();
      }
      else if (mod && k === 'd') { e.preventDefault(); k2.duplicateSelection(); }
      else if (k === 'r' && !mod && !e.altKey) { e.preventDefault(); k2.transformSelection({ turns: e.shiftKey ? -1 : 1 }); }
      else if (e.key === 'Escape') { e.preventDefault(); setSelection([]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
  // MAP-05: Weltplan follows into the game by itself while switched on (a short pause after each change).
  const [autoMarks, setAutoMarksState] = useState(() => { try { return localStorage.getItem('bauplaner.weltplan.abgleich') === 'an'; } catch { return false; } });
  const setAutoMarks = (on: boolean) => { setAutoMarksState(on); try { localStorage.setItem('bauplaner.weltplan.abgleich', on ? 'an' : 'aus'); } catch { /* private window */ } };
  const marksSent = useRef<string>('');
  // The game object changes with every poll; the timer must only restart when the Weltplan changes.
  const gameRef = useRef(game); gameRef.current = game;
  // MAP-06: an older mod (without `marks2`) gets only the entries it understands; the panel says what stays here.
  const marksOut = useMemo(() => marksForMod(items, game.hello), [items, game.hello]);
  const marksSkipped = marksOut.skipped ? `${marksOut.skipped} ${marksOut.skipped === 1 ? 'Eintrag bleibt' : 'Einträge bleiben'} nur auf der Karte (${marksOut.skippedKinds.join(', ')}): Diese Mod kennt sie noch nicht – eine neuere Mod mit „marks2“ zeigt sie im Spiel.` : null;
  useEffect(() => {
    if (!autoMarks || !connected) return;
    const key = `${dimension}|${JSON.stringify(marksOut.items)}`;
    if (key === marksSent.current) return;
    const t = setTimeout(() => {
      const g = gameRef.current, token = g.token(); if (!token) return;
      void liveApi.marks(g.settings.port, token, dimension, marksOut.items).then(() => { marksSent.current = key; }, e => setNotice(`Weltplan nicht abgeglichen: ${errorText(e)}`));
    }, 1500);
    return () => clearTimeout(t);
  }, [autoMarks, connected, marksOut, dimension]);
  /** Moves the hologram in the game so that the project origin stands on this column (rotation kept). */
  const moveHologramTo = async (x: number, z: number) => {
    const t = game.token(); if (!t || !holo) return;
    const g = groundAt(x, z), y = g ? g.y + 1 : holo.placement.y;
    try {
      await liveApi.placement(game.settings.port, t, { ...holo.placement, dimension, x, y, z });
      setNotice(`Hologramm „${holo.name}“ im Spiel nach X ${x} · Y ${y} · Z ${z} gesetzt${g ? '' : ' (Höhe beibehalten: kein Gelände bekannt)'}. Lage auf der Karte mit „Lage aus dem Spiel übernehmen“ nachziehen.`);
    } catch (e) { setNotice(errorText(e)); }
  };
  // GAME-08 protocol 3: points set in the game wait in the mod until the Weltplan takes them.
  const [gameMarks, setGameMarks] = useState<readonly LiveGameMark[]>([]);
  const [adopting, setAdopting] = useState(false);
  const marks3 = connected && liveCan(game.hello, LIVE_FEATURE_MARKS3);
  useEffect(() => {
    if (!marks3) { setGameMarks([]); return; }
    let stop = false;
    const poll = () => {
      const g = gameRef.current, t = g.token(); if (!t) return;
      void liveApi.gameMarks(g.settings.port, t).then(m => { if (!stop) setGameMarks(cur => cur.length === m.length && cur.every((x, i) => x.id === m[i]!.id) ? cur : m); }, () => { /* next poll */ });
    };
    poll();
    const timer = setInterval(poll, 5000);
    return () => { stop = true; clearInterval(timer); };
  }, [marks3]);
  const adoptGameMarks = async () => {
    const t = game.token(); if (!t || !gameMarks.length) return;
    setAdopting(true);
    try {
      const { items: fresh, ack } = gameMarksToItems(gameMarks, wp.plan.items);
      if (fresh.length) {
        const label = fresh.length === 1 ? `„${fresh[0]!.name}“ aus dem Spiel übernommen` : `${fresh.length} Markierungen aus dem Spiel übernommen`;
        const ok = await change({ label, steps: [{ kind: 'plan', op: { kind: 'batch', label: 'Aus dem Spiel', ops: fresh.map(item => ({ kind: 'add' as const, item })) } }] },
          `${label} (Ebene „${GAME_MARKS_LAYER}“).`);
        if (!ok) return;
      }
      await liveApi.gameMarksAck(game.settings.port, t, ack);
      setGameMarks([]);
      if (!fresh.length) setNotice('Diese Markierungen stehen schon im Weltplan; das Spiel hat sie jetzt abgehakt.');
      const first = fresh[0];
      if (first && first.dimension !== dimension) setDimension(first.dimension);
    } catch (e) { setNotice(`Markierungen nicht übernommen: ${errorText(e)}`); }
    finally { setAdopting(false); }
  };
  const sendMarks = async () => {
    const t = game.token(); if (!t) return;
    setSending('marks');
    try { const n = await liveApi.marks(game.settings.port, t, dimension, marksOut.items); setNotice(`${n} Weltplan-Einträge (${dimensionLabel(dimension)}) im Spiel als Markierungen eingeblendet${marksOut.skipped ? `, ${marksOut.skipped} kann diese Mod nicht zeigen (${marksOut.skippedKinds.join(', ')})` : ''}.`); }
    catch (e) { setNotice(errorText(e)); }
    finally { setSending(''); }
  };
  /** Plan of a project as .schem to the mod and place it exactly where the map has it. */
  const sendToGame = async (p: Project) => {
    const t = game.token(); if (!t || !p.world) return;
    setSending(p.id);
    try {
      const dv = suggestDataVersion(p, library.versions).dataVersion ?? 5023;
      const prepared = await prepareRevisionExport(p, library.versions, { ...LIVE_PLAN_EXPORT, dataVersion: dv });
      if (prepared.created) await repo.saveProject(prepared.project, p.revision);
      const w = p.world, out = prepared.output;
      // SIZE-01: does the plan fit what this mod can load? Big plans get a hint and a longer timeout.
      const report = out.report as { volume: number; counts: { blocks: number } };
      const fit = checkPlanForMod(game.hello, { volume: report.volume, cells: report.counts.blocks, bytes: out.bytes.length });
      if (!fit.ok) { setNotice(fit.message); if (prepared.created) await load(); return; }
      if (fit.message) setNotice(`Sende „${p.name}“ (${(out.bytes.length / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB) … ${fit.message}`);
      const msg = await liveApi.plan(game.settings.port, t, out.fileName, livePlacementOf(w), out.bytes, fit.timeoutMs);
      setNotice(`${msg} Revision ${out.revision.number}.${fit.message ? ` ${fit.message}` : ''}`);
      if (prepared.created) await load();
    } catch (e) { setNotice(errorText(e)); }
    finally { setSending(''); }
  };
  /** LINK-06: the same revision export straight onto the paired server, anchored at the map position (LINK-02 S04: shared with „Bauen“). */
  const sendToServer = async (p: Project) => {
    if (!p.world) return;
    if (isTurned(p.world)) { setNotice(`„${p.name}“ liegt auf der Weltkarte ${turnLabel(turnOf(p.world))}. Das Server-Plugin legt Pläne nur ungedreht ab – über „Ins Spiel senden“ (Mod) geht es gedreht, oder die Drehung auf der Karte zurücksetzen.`); setNoticeUndo(false); return; }
    setSending(`server:${p.id}`);
    try {
      const r = await uploadPlanToServer(p, library.versions, chooseServerAnchor(p));
      if (r.frozen) await repo.saveProject(r.frozen, p.revision);
      setNotice(r.text);
      if (r.frozen) await load();
    } catch (e) { setNotice(errorText(e)); }
    finally { setSending(''); }
  };
  const adoptHologram = async () => {
    if (!holo || !holoProject) return;
    const pl = holo.placement;
    // MAP-07: the map takes the hologram's turn and mirror as well (same rule as the mod's Placement).
    const turned = withTurn({ ...(holoProject.world ?? createPlacement([pl.x, pl.y, pl.z], pl.dimension)), origin: [pl.x, pl.y, pl.z], dimension: pl.dimension }, { turns: (((pl.turns % 4) + 4) % 4) as 0 | 1 | 2 | 3, mirror: pl.mirror });
    if (await save(holoProject, worldOperation(turned, 'Lage aus dem Spiel übernommen'))) {
      setDimension(pl.dimension); setSelected(holoProject.id); setFrame2d({ projectId: holoProject.id, seq: ++seq.current });
    }
  };
  const placeAtPlayer = async (p: Project) => {
    if (!player) return;
    const origin = originFromPlayer(player);
    // Build height of 26.3 (−64 … 319): a player falling through the void must not become the project's origin.
    if (origin[1] < -64 || origin[1] > 319) { setNotice(`Du stehst bei Y ${origin[1]} außerhalb der Bauhöhe (−64 bis 319) – erst auf festen Boden stellen.`); setNoticeUndo(false); return; }
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

  // Context menu (right click / long press) for what is selected, or for the empty map.
  const menuPath = menu?.vertex ? items.find((i): i is Polyline => i.id === menu.vertex!.pathId && (i.kind === 'path' || i.kind === 'zone')) ?? null : null;
  const menuProject = menu?.hit?.kind === 'project' ? projects?.find(p => p.id === menu.hit!.id) ?? null : null;
  const menuTitle = !menu?.hit && !selectionCount ? `X ${menu?.column[0]} · Z ${menu?.column[1]}`
    : selectionCount > 1 ? `${selectionCount} gewählt` : selItems[0]?.name ?? selProjects[0]?.name ?? menuProject?.name ?? 'Auswahl';
  const menuGround = menu ? groundAt(menu.column[0], menu.column[1]) : null;
  const menuLiveUrl = menu ? liveMapUrlAt(live, dimension, menu.column[0], menuGround?.y ?? 64, menu.column[1]) : null;
  const menuEntries: (MenuEntry | null)[] = !menu ? [] : !menu.hit && !selectionCount ? [
    { label: 'Bauplatz hier zeichnen', onClick: () => setTool('site') },
    { label: 'Weg hier beginnen', onClick: () => setTool('path') },
    { label: 'Zone hier beginnen', onClick: () => setTool('zone') },
    { label: 'Punkt hier setzen', onClick: () => addPoint(menu.column[0], menu.column[1]) },
    { label: '📝 Notiz hier setzen', onClick: () => addPoint(menu.column[0], menu.column[1], 'notiz') },
    { label: '⚠ Gefahr hier markieren', onClick: () => addPoint(menu.column[0], menu.column[1], 'gefahr') },
    null,
    { label: 'Alles auswählen (Strg+A)', onClick: selectAll },
    { label: 'Messen ab hier', onClick: () => setTool('measure') },
    ...(connected && holo ? [null, { label: `Hologramm „${holo.name}“ hierher setzen`, onClick: () => void moveHologramTo(menu.column[0], menu.column[1]) }] : []),
    ...(menuLiveUrl ? [null, { label: `Diese Stelle auf ${live.name || 'der Live-Karte'} zeigen ↗`, onClick: () => window.open(menuLiveUrl, '_blank', 'noopener,noreferrer') }] : []),
  ] : [
    ...(menuPath && menu.vertex ? [
      { label: `${menuPath.kind === 'zone' ? 'Zonenecke' : 'Wegecke'} löschen`, onClick: () => { const n = pathOp(() => removePathVertex(menuPath, menu.vertex!.index)); if (n) editPath(menuPath, n, `${menuPath.kind === 'zone' ? 'Zonenecke' : 'Wegecke'} gelöscht`); }, disabled: menuPath.points.length <= (menuPath.kind === 'zone' ? 3 : 2), hint: menuPath.points.length <= (menuPath.kind === 'zone' ? 3 : 2) ? (menuPath.kind === 'zone' ? 'Eine Zone braucht mindestens drei Ecken.' : 'Ein Weg braucht mindestens zwei Ecken.') : undefined },
      ...(menuPath.kind === 'path' ? [{ label: 'Weg an dieser Ecke teilen', onClick: () => { const n = pathOp(() => splitPath(menuPath, menu.vertex!.index)); if (n) editPath(menuPath, n, 'Weg geteilt'); }, disabled: menu.vertex.index === 0 || menu.vertex.index === menuPath.points.length - 1 }] : []),
      null,
    ] : []),
    ...(selItems.length === 1 && selItems[0]!.kind === 'path' && !menu.vertex ? [
      { label: 'Wegrichtung umkehren', onClick: () => editPath(selItems[0] as WorldPath, reversePath(selItems[0] as WorldPath), 'Weg umgekehrt') },
      { label: '⤳ Route übers Gelände', onClick: () => routeSelected(selItems[0] as WorldPath) },
    ] : []),
    ...(joinable ? [{ label: 'Wege verbinden', onClick: joinSelected }] : []),
    ...(selProjects.length === 1 && !selItems.length ? [
      { label: '✈ Hinfliegen', onClick: () => fly(selProjects[0]!.id) },
      { label: 'Im Editor öffnen', onClick: () => { location.hash = href({ view: 'project', projectId: selProjects[0]!.id, tab: 'editor' }); } },
      ...(connected && selProjects[0]!.world ? [{ label: '▶ Ins Spiel senden', onClick: () => void sendToGame(selProjects[0]!) }] : []),
    ] : []),
    ...(selItems.length ? [{ label: '⧉ Duplizieren (Strg+D)', onClick: duplicateSelection }] : []),
    ...(selItems.length ? [openSel.locked.length === selItems.length
      ? { label: '🔓 Entsperren', onClick: () => lockSelection(false) }
      : { label: '🔒 Sperren', onClick: () => lockSelection(true), hint: 'Nicht verschieben, umformen oder löschen; im Hologramm grau.' }] : []),
    ...(selItems.length === 1 && selItems[0]!.group ? [{ label: `Ganze Gruppe „${selItems[0]!.group}“ wählen`, onClick: () => selectGroup(selItems[0]!.group!) }] : []),
    ...(selItems.length || selProjects.length ? [
      { label: '↻ Drehen 90° (R)', onClick: () => transformSelection({ turns: 1 }) },
      { label: '↺ Drehen −90° (Umschalt+R)', onClick: () => transformSelection({ turns: -1 }) },
      { label: '⇋ Ost-West spiegeln', onClick: () => transformSelection({ axis: 'x' }) },
      { label: '⇅ Nord-Süd spiegeln', onClick: () => transformSelection({ axis: 'z' }) },
    ] : []),
    ...(selItems.length && canAlign ? [{ label: '⛰ Ans Gelände ausrichten', onClick: alignSelection }] : []),
    { label: 'Auf der Karte zeigen', onClick: () => frameItems(selItems, selProjects) },
    null,
    { label: selItems.length && !selProjects.length ? '🗑 Löschen (Entf)' : !selItems.length ? '🗑 Von der Karte nehmen (Entf)' : '🗑 Löschen / von der Karte nehmen (Entf)', onClick: deleteSelection, danger: true },
  ];

  // Preview of an edited placement: outline + neighbours whose footprint it touches.
  const previewBounds = preview && entry?.localBounds && preview.dimension === dimension ? placedBounds(entry.localBounds, preview) : null;
  const previewHits = previewBounds && map ? footprintNeighbours(map, previewBounds, selected ?? undefined) : [];

  if (loadError) return <div className="page"><div className="notice warning" role="alert"><strong>Projekte nicht geladen</strong><p>{loadError}</p></div></div>;
  const drawn = map?.entries.filter(e => !e.skipped) ?? [];
  const otherDims = map ? Object.entries(map.elsewhere) : [];
  const dims = [...DIMENSIONS.map(d => d.id), ...otherDims.map(([d]) => d).filter(d => !DIMENSIONS.some(x => x.id === d))];
  const collisionsOf = (id: string) => map?.collisions.filter(c => c.cells && (c.a === id || c.b === id)) ?? [];
  // Earthwork estimate of the selected project on the first survey that covers its footprint (own survey first).
  const estimate = useMemo((): { survey: TerrainSurvey; own: boolean; result: EarthworkEstimate; shift: number } | null => {
    if (!map || !entry?.worldBounds || entry.skipped || !project?.world) return null;
    if (preview && !sameTurn(turnOf(preview), turnOf(project.world))) return null; // a turned preview has another footprint
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
        <p className="map-lead">Plane hier deine Welt: Projekte setzen und ziehen, Bauplätze, Wege, Zonen und Punkte zeichnen, in Ebenen ordnen, messen. Mit der Build-Studio-Mod siehst du dich selbst und das echte Gelände live auf der Karte, führst Wege übers Gelände und schickst Pläne direkt ins Spiel.</p></div>
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
    {notice && <div className="notice" role="status">{notice} {noticeUndo && history.canUndo && <button className="text-button" onClick={() => void undo()}>Rückgängig</button>}</div>}
    {mapError && <div className="notice warning" role="alert"><strong>Karte nicht berechnet</strong><p>{mapError}</p></div>}

    <div className="map-layout">
      <aside className="map-list" aria-label="Projekte auf der Karte">
        <h2>Auf der Karte <small>{map ? map.entries.length : '…'}</small></h2>
        {map && !map.entries.length && <p className="muted">In dieser Dimension liegt noch kein Projekt. Platziere eines aus „Noch nicht platziert“, oder zeichne zuerst einen Bauplatz.</p>}
        <ul>{map?.entries.map(e => <EntryCard key={e.projectId} entry={e} selected={selProjectIds.has(e.projectId)} collisions={collisionsOf(e.projectId).length}
          onSelect={add => { pick({ kind: 'project', id: e.projectId }, add); if (!add) setFrame2d({ projectId: e.projectId, seq: ++seq.current }); }} onFly={() => fly(e.projectId)}
          onRemove={() => { const p = projects?.find(x => x.id === e.projectId); if (p) deleteHits([], [p]); }} />)}</ul>
        {map && map.unplaced.length > 0 && <>
          <h2>Noch nicht platziert <small>{map.unplaced.length}</small></h2>
          <ul className="map-unplaced">{map.unplaced.map(u => <li key={u.projectId}>
            <span>{u.name}{u.localBounds ? <small> · {u.localBounds.maxExclusive[0] - u.localBounds.min[0]}×{u.localBounds.maxExclusive[2] - u.localBounds.min[2]} Blöcke</small> : <small> · leer</small>}</span>
            <button className="secondary" onClick={() => void placeSuggested(u.projectId)} title={`Östlich der vorhandenen Projekte in ${dimensionLabel(dimension)} platzieren, chunkbündig`}>Platzieren</button>
            {connected && player && <button className="secondary" onClick={() => { const p = projects?.find(x => x.id === u.projectId); if (p) void placeAtPlayer(p); }} title="Setzt den Projektursprung auf den Block, auf dem du im Spiel stehst.">Wo ich stehe</button>}
          </li>)}</ul></>}
        {projects && !projects.length && <p className="muted">Noch keine Projekte. <a href="#/">Projekt anlegen</a></p>}
        <h2>Weltplan <small>{items.length}</small></h2>
        <ObjectList items={visibleItems} selection={visibleSelection} onSelect={pick} layerNames={names} groupNames={groups}
          onDelete={id => deleteHits([id], [])} onFrame={id => { const it = items.find(i => i.id === id); if (it) { setSelection([{ kind: 'item', id }]); frameItems([it]); } }}
          onSelectAll={ids => setSelection(ids.map(id => ({ kind: 'item' as const, id })))} />
        {visibleItems.length < items.length && <p className="muted small">{items.length - visibleItems.length} Einträge in ausgeblendeten Ebenen.{hiddenNames.size ? <> <button className="text-button" onClick={() => setHiddenNames(new Set())}>Benannte Ebenen zeigen</button></> : null}</p>}
      </aside>

      <section className="map-main">
        <LiveGamePanel game={game} actions={{
          follow, onFollow: setFollow, terrainBusy, onLoadTerrain: () => void loadTerrainHere(), chunkCount: liveChunks?.size ?? 0,
          onShowPlayer: () => { if (player) { setDimension(player.dimension); setFollow(true); document.querySelector('.overview-canvas')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } },
          onSendMarks: connected && sending !== 'marks' ? () => void sendMarks() : null,
          marksInfo: `${items.length} Einträge in ${dimensionLabel(dimension)}${status?.marks ? ` · im Spiel: ${status.marks}` : ''}`,
          hologramProject: holoProject, hologramMatch: holoMatch,
          onAdoptHologram: holoMatch && holoMatch !== 'same' ? () => void adoptHologram() : null,
          autoMarks, onAutoMarks: setAutoMarks, marksSkipped,
          gameMarks: marks3 ? { count: gameMarks.length, names: gameMarks.slice(0, 4).map(m => m.name).join(', ') + (gameMarks.length > 4 ? ' …' : ''), onAdopt: adopting ? null : () => void adoptGameMarks() } : null,
          onPointAtPlayer: connected && player ? pointAtPlayer : null, onTrailToPath: connected && player && game.trail.length > 1 ? trailAsPath : null,
          onSection: connected ? n => { const t = game.token(); if (t) void liveApi.section(game.settings.port, t, n).then(() => setNotice(n ? `Im Spiel wird nur Abschnitt „${holo?.sections[n - 1]?.name ?? n}“ gezeigt.` : 'Im Spiel wird wieder der ganze Plan gezeigt.'), e => setNotice(errorText(e))); } : null,
          groups: liveCan(game.hello, LIVE_FEATURE_GROUPS) ? { names: groups, onGroup: connected ? g => { const t = game.token(); if (t) void liveApi.group(game.settings.port, t, g).then(() => setNotice(g ? `Im Spiel zeigt das Hologramm nur noch Gruppe „${g}“. Erst „Weltplan ins Spiel senden“, wenn die Gruppe neu ist.` : 'Im Spiel wird wieder der ganze Plan gezeigt.'), e => setNotice(errorText(e))); } : null } : null,
          progress: holoProject ? <GameProgressPanel progress={progress} modVersion={game.hello?.mod.version ?? null}
            onTick={op => void save(holoProject, op)} /> : null,
        }} />
        <PlanToolbar tool={tool} onTool={setTool} canUndo={history.canUndo} canRedo={history.canRedo} onUndo={() => void undo()} onRedo={() => void redo()} />
        <LayerToggles layers={layers} onChange={l => { setLayers(l); setSelection(cur => cur.filter(h => h.kind === 'project' ? l.projects : (() => { const it = items.find(i => i.id === h.id); return !it || l[it.kind]; })())); }}
          counts={{ projects: map?.entries.length ?? 0, site: items.filter(i => i.kind === 'site').length, path: items.filter(i => i.kind === 'path').length, point: items.filter(i => i.kind === 'point').length, zone: items.filter(i => i.kind === 'zone').length }}
          names={names} hidden={hiddenNames} nameCounts={new Map(names.map(n => [n, items.filter(i => i.layer === n).length]))}
          onHidden={h => { setHiddenNames(h); setSelection(cur => cur.filter(x => { if (x.kind !== 'item') return true; const it = items.find(i => i.id === x.id); return !it?.layer || !h.has(it.layer); })); }} />
        <GroupToggles groups={groupInfo} hidden={hiddenGroups} onSelect={selectGroup}
          onHidden={h => { setHiddenGroups(h); setSelection(cur => cur.filter(x => { if (x.kind !== 'item') return true; const it = items.find(i => i.id === x.id); return !it?.group || !h.has(it.group); })); }} />
        {selectionCount > 0 && <SelectionBar items={selItems.length} projects={selProjects.length} actions={{
          onDelete: deleteSelection, onDuplicate: selItems.length ? duplicateSelection : null,
          onRotate: selItems.length || selProjects.length ? turns => transformSelection({ turns }) : null, onMirror: selItems.length || selProjects.length ? axis => transformSelection({ axis }) : null,
          onAlign: canAlign ? alignSelection : null, onFrame: () => frameItems(selItems, selProjects), onClear: () => setSelection([]),
          layers: selItems.length ? { names, current: selectionLayer, onPick: assignLayer } : null, playerDistance,
          groups: selItems.length ? { names: groups, current: selectionGroup, onPick: assignGroup } : null,
          lock: selItems.length ? { locked: openSel.locked.length, total: selItems.length, onLock: lockSelection } : null,
        }} />}
        {wp.error && <div className="notice warning" role="alert">{wp.error}</div>}
        <div className={`map-panels${payload ? '' : ' no-3d'}`}>
          {map ? <OverviewMap map={map} tops={tops} colorOf={baseColor} selected={selected} onSelect={setSelected} onFly={fly} frame={frame2d}
            preview={previewBounds ? { bounds: previewBounds, conflict: previewHits.length > 0 } : null} terrain={terrain} boundsOf={surveyBounds} plan={planLayer} />
            : <div className="overview"><div className="loading" role="status">Karte wird berechnet …</div></div>}
          <div className="map-3d">
            {payload ? <Viewer payload={payload} cells={payload.cells} onSelect={onPick} markFor={markFor} frameRequest={frame3d}
              focus={entry?.worldBounds && !entry.skipped ? entry.worldBounds : null}
              ghost={previewBounds ? { bounds: { min: previewBounds.min, maxExclusive: previewBounds.maxExclusive }, tone: previewHits.length ? 'conflict' : 'snap' } : null} />
              : <div className="scene map-3d-empty"><div className="viewer-loading" role="status">{busy ? 'Karte wird berechnet …' : '3D-Ansicht erscheint, sobald ein Projekt mit Bauteilen auf der Karte liegt.'}</div></div>}
            {busy && map && <div className="map-busy" role="status">aktualisiert …</div>}
          </div>
        </div>
        {mode === 'progress' && <p className="map-legend"><i style={{ background: PROGRESS_COLOR[1] }} /> abgehakt <i style={{ background: PROGRESS_COLOR[2] }} /> abgehakt, aber seitdem geändert <i style={{ background: mix('#c7d4d5', PROGRESS_COLOR[0], 0.7) }} /> offen · aus den Haken der Bauanleitung, keine Messung im Spiel</p>}
        {hover && map && hover.kind !== 'erase' && <p className="map-hover">Block <b>X {hover.position[0]} · Y {hover.position[1]} · Z {hover.position[2]}</b> · Chunk {chunkOf(hover.position[0])}, {chunkOf(hover.position[2])} · {map.palette[hover.paletteIndex]?.id}</p>}

        {menu && <MapContextMenu at={menu.at} title={menuTitle} entries={menuEntries} onClose={() => setMenu(null)} />}
        {item && <PlanItemEditor key={item.id} item={item} projects={projects ?? []} onClose={() => setSelection([])}
          onSave={next => void change({ label: `„${next.name}“ geändert`, steps: [{ kind: 'plan', op: { kind: 'update', item: next } }] }, `„${next.name}“ gespeichert.`)}
          onRemove={() => deleteHits([item.id], [])}
          actions={siteActions(item)} layerNames={names} groundAt={groundAt} onRoute={routeSelected} />}
        {entry && project && <section className="map-detail" aria-label={`Details zu ${entry.name}`}>
          <header><h2>{entry.name}</h2>
            <div className="button-row">
              <button className="primary" disabled={!!entry.skipped && !surveys.has(entry.projectId)} onClick={() => fly(entry.projectId)}>✈ Hinfliegen</button>
              <a href={href({ view: 'project', projectId: entry.projectId, tab: 'editor' })}>Im Editor öffnen</a>
              <a href={href({ view: 'project', projectId: entry.projectId, tab: 'bauen' })}>Bauanleitung</a>
              <LiveMapLink settings={live} entry={entry} />
            </div></header>
          {!connected && project.world && hasServerPairing() && <div className="button-row map-game-actions">
            <button className="secondary" disabled={!!sending || entry.blocks === 0} onClick={() => void sendToServer(project)}
              title="Legt den aktuellen Stand als Plan auf den gekoppelten Server und speichert dort den Anker an dieser Lage – ohne Datei und ohne Befehl.">{sending === `server:${project.id}` ? 'Wird übertragen …' : '⇪ Auf den Server legen'}</button>
          </div>}
          {connected && <div className="button-row map-game-actions">
            <button className="primary" disabled={!!sending || entry.blocks === 0} onClick={() => void sendToGame(project)}
              title="Exportiert den aktuellen Stand als Revision (.schem) und blendet ihn im Spiel genau an dieser Lage als Hologramm ein.">{sending === project.id ? 'Wird gesendet …' : '▶ Ins Spiel senden'}</button>
            {hasServerPairing() && <button className="secondary" disabled={!!sending || entry.blocks === 0} onClick={() => void sendToServer(project)}
              title="Legt den aktuellen Stand als Plan auf den gekoppelten Server und speichert dort den Anker an dieser Lage – ohne Datei und ohne Befehl.">{sending === `server:${project.id}` ? 'Wird übertragen …' : '⇪ Auf den Server legen'}</button>}
            <button className="secondary" disabled={!player} onClick={() => void placeAtPlayer(project)} title="Setzt den Projektursprung auf den Block, auf dem du im Spiel stehst.">Hier platzieren, wo ich stehe</button>
            {holoProject?.id === project.id && holoMatch && holoMatch !== 'same' && <span className="warn-text small">Im Spiel: {holoMatch === 'moved' ? 'an anderer Stelle' : holoMatch === 'turned' ? 'gedreht/gespiegelt' : 'andere Dimension'}</span>}
          </div>}
          <Facts entry={entry} />
          <ProjectOrderFacts project={project} projects={projects ?? []} />
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

        <WorldSharePanel share={share} />
        <LiveMapPanel settings={live} onChange={setLive} map={map} dimension={dimension} items={wp.plan.items} saved={savedMaps} setSaved={setSavedMaps} shared={!!share.room}
          onImportPoints={(points, label) => change({ label, steps: [{ kind: 'plan', op: { kind: 'batch', label, ops: points.map(item => ({ kind: 'add' as const, item })) } }] })} />
      </section>
    </div>
  </div>;
}

/** PROJ-04: which projects come before and after this one; edited in the project's Planung. */
function ProjectOrderFacts({ project, projects }: { project: Project; projects: readonly Project[] }) {
  const check = projectStartCheck(project, projects), next = projectSuccessors(project.id, projects);
  if (!check.predecessors.length && !next.length) return null;
  const de = (iso: string | null) => iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : '';
  return <div className="map-order" aria-label="Reihenfolge">
    {check.predecessors.length > 0 && <p>Erst nach {check.predecessors.map((p, i) => <span key={p.projectId}>{i ? ', ' : ''}<b>{p.name}</b>{p.end ? ` (${p.source === 'done' ? 'fertig' : `bis ${de(p.end)}`})` : ''}</span>)}
      {check.tooEarly && <em className="warn-text"> · Start liegt davor</em>}</p>}
    {next.length > 0 && <p>Danach: {next.map(n => n.name).join(', ')}</p>}
    <a href={href({ view: 'project', projectId: project.id, tab: 'planung' })}>Reihenfolge in der Planung ändern</a>
  </div>;
}

function EntryCard({ entry, selected, collisions, onSelect, onFly, onRemove }: { entry: MapEntry; selected: boolean; collisions: number; onSelect: (add: boolean) => void; onFly: () => void; onRemove: () => void }) {
  const o = entry.placement.origin;
  return <li className={`map-entry${selected ? ' selected' : ''}${entry.skipped ? ' skipped' : ''}`}>
    <button className="map-entry-main" aria-pressed={selected} onClick={e => onSelect(e.shiftKey || e.ctrlKey || e.metaKey)} onDoubleClick={onFly}>
      <b>{entry.name}</b>
      <small>X {o[0]} · Y {o[1]} · Z {o[2]}{isTurned(entry.placement) ? ` · ${turnLabel(turnOf(entry.placement))}` : ''}{entry.skipped ? ` · ${MAP_SKIP_LABEL[entry.skipped]}` : ''}</small>
      <span className="map-progress" aria-label={`Fortschritt ${pct(entry.share)}`}><span style={{ width: `${Math.round(entry.share * 100)}%` }} /></span>
      <small>{entry.stepsDone}/{entry.steps} Schritte · {pct(entry.share)}{entry.stepsReview ? ` · ${entry.stepsReview} prüfen` : ''}{collisions ? <em> · {collisions}× Überschneidung</em> : null}</small>
    </button>
    <button className="map-entry-fly" disabled={!!entry.skipped} onClick={onFly} aria-label={`Zu ${entry.name} fliegen`} title="Hinfliegen">✈</button>
    <button className="map-entry-fly danger-item" onClick={onRemove} aria-label={`„${entry.name}“ von der Karte nehmen`} title="Von der Karte nehmen – das Projekt bleibt erhalten (Rückgängig mit Strg+Z)">🗑</button>
  </li>;
}

function Facts({ entry }: { entry: MapEntry }) {
  const b = entry.worldBounds;
  return <dl className="map-facts">
    <div><dt>Ursprung</dt><dd>X {entry.placement.origin[0]} · Y {entry.placement.origin[1]} · Z {entry.placement.origin[2]}</dd></div>
    {isTurned(entry.placement) && <div><dt>Drehung</dt><dd data-turn={`${entry.placement.turns ?? 0}${entry.placement.mirror ? 'm' : ''}`}>{turnLabel(turnOf(entry.placement))} (um den Ursprung, wie das Hologramm der Mod)</dd></div>}
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
