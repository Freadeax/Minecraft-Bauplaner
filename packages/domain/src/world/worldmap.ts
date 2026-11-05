import type { BlockState, Bounds, Cell, Vec3, VoxelPayload } from '../../../voxel/src/types.js';
import { stateKey } from '../../../voxel/src/validation.js';
import { transformBlockState } from '../../../voxel/src/states.js';
import { positionKey, resolveProject } from '../core/compose.js';
import { buildGuide, evaluateProgress } from '../building/guide.js';
import { createLiveMapMarkerFile } from './livemap.js';
import type { LiveMapMarker, LiveMapMarkerFile, LiveMapPosition } from './livemap.js';
import type { StepStatus } from '../building/guide.js';
import type { Operation } from '../core/project.js';
import { DomainError } from '../core/types.js';
import type { AssetVersion, Project } from '../core/types.js';

/**
 * Weltkarte (B15). Every project may carry one optional placement in a
 * Minecraft world (`project.world`): a dimension and an integer origin.
 * World coordinate = project coordinate + origin, for every cell, so the
 * map, the build guide and a schem export describe the same blocks.
 *
 * The map itself is a derived view: each placed project is resolved with the
 * shared composition core (resolveProject), translated by its origin and
 * merged into one list of cells for display. Nothing here decides voxel
 * conflicts a second way; overlaps *between* projects are only reported
 * (MapCollision), never resolved. The merged cells are display data, not a
 * blueprint, and are never exported. The map knows only planned blocks: the
 * terrain at a placement is never read, so the foundation stays unchecked
 * (TERRAIN_NOTE).
 */

export const TERRAIN_NOTE = 'Gelände ungeprüft: Die Karte kennt nur geplante Blöcke, nicht das Gelände der Welt.';

export const WORLD_SCHEMA_VERSION = 1;
/** Vanilla world border limit for X/Z. */
export const WORLD_XZ_LIMIT = 29_999_984;
/** Widest Y range a (data pack) dimension may have. */
export const WORLD_Y_MIN = -2032;
export const WORLD_Y_MAX = 2031;
/** Default height for a new placement: just above sea level in the overworld. */
export const DEFAULT_WORLD_Y = 64;
/** Gap in blocks between automatically placed projects. */
export const PLACEMENT_GAP = 8;
/** Display budget for the merged map; projects beyond it are listed but not drawn. */
export const MAP_MAX_CELLS = 1_500_000;

export interface Dimension { readonly id: string; readonly label: string }
export const DIMENSIONS: readonly Dimension[] = [
  { id: 'minecraft:overworld', label: 'Oberwelt' },
  { id: 'minecraft:the_nether', label: 'Nether' },
  { id: 'minecraft:the_end', label: 'Ende' },
];
export const dimensionLabel = (id: string): string => DIMENSIONS.find(d => d.id === id)?.label ?? id;
const DIMENSION_ID = /^[a-z0-9_.-]{1,64}:[a-z0-9_./-]{1,128}$/;

export interface WorldPlacement {
  readonly schemaVersion: 1;
  /** Integer offset added to every project coordinate. */
  readonly origin: Vec3;
  /** Namespaced dimension id, e.g. "minecraft:overworld"; modded dimensions are allowed. */
  readonly dimension: string;
  /** Hidden projects keep their placement but are not drawn. */
  readonly hidden: boolean;
  /** Free text, e.g. "Nordufer, neben dem Dorf". */
  readonly note: string;
  /**
   * MAP-07: quarter turns clockwise seen from above around project 0/0/0, exactly like the mod's
   * Placement (mirror X first, then (x,z) → (−z,x) per turn, on block positions). Missing = 0.
   */
  readonly turns?: 1 | 2 | 3;
  /** MAP-07: mirror of the project X axis before turning; missing = not mirrored. */
  readonly mirror?: true;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const fail = (message: string): never => { throw new DomainError('INVALID', `Weltlage: ${message}`); };
const intIn = (v: unknown, min: number, max: number, what: string): number => {
  if (!Number.isInteger(v) || (v as number) < min || (v as number) > max) fail(`${what} muss eine ganze Zahl von ${min} bis ${max} sein`);
  return v as number;
};

/** Validates a placement (operation input and backup restore). */
export function checkWorldPlacement(raw: unknown): WorldPlacement {
  if (!isObj(raw)) return fail('kein Objekt');
  if (raw.schemaVersion !== WORLD_SCHEMA_VERSION) fail(`unbekannte Schemaversion ${String(raw.schemaVersion)}`);
  if (!Array.isArray(raw.origin) || raw.origin.length !== 3) fail('Ursprung braucht X, Y und Z');
  const o = raw.origin as unknown[];
  intIn(o[0], -WORLD_XZ_LIMIT, WORLD_XZ_LIMIT, 'X'); intIn(o[1], WORLD_Y_MIN, WORLD_Y_MAX, 'Y'); intIn(o[2], -WORLD_XZ_LIMIT, WORLD_XZ_LIMIT, 'Z');
  if (typeof raw.dimension !== 'string' || !DIMENSION_ID.test(raw.dimension)) fail('Dimension muss eine ID wie minecraft:overworld sein');
  if (typeof raw.hidden !== 'boolean') fail('„ausgeblendet“ muss wahr oder falsch sein');
  if (typeof raw.note !== 'string' || raw.note.length > 300) fail('Notiz höchstens 300 Zeichen');
  if (raw.turns !== undefined && raw.turns !== 1 && raw.turns !== 2 && raw.turns !== 3) fail('Drehung muss 1, 2 oder 3 Vierteldrehungen sein (ungedreht: Feld weglassen)');
  if (raw.mirror !== undefined && raw.mirror !== true) fail('Spiegelung muss wahr sein (ungespiegelt: Feld weglassen)');
  return raw as unknown as WorldPlacement;
}

export function createPlacement(origin: Vec3, dimension = DIMENSIONS[0]!.id, note = ''): WorldPlacement {
  return checkWorldPlacement({ schemaVersion: WORLD_SCHEMA_VERSION, origin: [...origin], dimension, hidden: false, note });
}

export function worldOf(project: Pick<Project, 'world'>): WorldPlacement | null { return project.world ?? null; }

/** Undoable operation; null removes the placement. */
export function worldOperation(world: WorldPlacement | null, label?: string): Operation {
  return { kind: 'world.set', world: world && checkWorldPlacement(world), ...(label !== undefined && { label }) };
}

export const toWorld = (p: Vec3, origin: Vec3): Vec3 => [p[0] + origin[0], p[1] + origin[1], p[2] + origin[2]];
export const translateBounds = (b: Bounds, origin: Vec3): Bounds => ({ min: toWorld(b.min, origin), maxExclusive: toWorld(b.maxExclusive, origin) });

// ------------------------------------------------------------------ turned placements (MAP-07)

export type PlacementTurns = 0 | 1 | 2 | 3;
/** Turn and mirror of a placement (or of a mod hologram); the anchor is not part of it. */
export interface PlacementTurn { readonly turns: PlacementTurns; readonly mirror: boolean }
type Turnable = Pick<WorldPlacement, 'turns' | 'mirror'>;
export const turnOf = (p: Turnable | null | undefined): PlacementTurn => ({ turns: (p?.turns ?? 0) as PlacementTurns, mirror: p?.mirror === true });
export const isTurned = (p: Turnable | null | undefined): boolean => !!p && (!!p.turns || p.mirror === true);
export const sameTurn = (a: PlacementTurn, b: PlacementTurn): boolean => (((a.turns % 4) + 4) % 4) === (((b.turns % 4) + 4) % 4) && a.mirror === b.mirror;
export const TURN_LABEL: Readonly<Record<PlacementTurns, string>> = { 0: 'ungedreht', 1: '90° im Uhrzeigersinn', 2: '180°', 3: '90° gegen den Uhrzeigersinn' };
export const turnLabel = (t: PlacementTurn): string => t.turns === 0 && !t.mirror ? 'ungedreht' : `${t.mirror ? 'gespiegelt' : ''}${t.mirror && t.turns ? ', ' : ''}${t.turns ? TURN_LABEL[t.turns] : ''}`;

/** Project block position → turned position around project 0/0/0 (no anchor), like Placement.toWorld in the mod. */
export function turnVector(p: Vec3, t: PlacementTurn): Vec3 {
  let x = t.mirror ? -p[0] : p[0], z = p[2];
  for (let i = 0; i < t.turns; i++) { const k = x; x = -z; z = k; }
  return [x === 0 ? 0 : x, p[1], z === 0 ? 0 : z];
}
/** Inverse of turnVector. */
export function unturnVector(p: Vec3, t: PlacementTurn): Vec3 {
  let x = p[0], z = p[2];
  for (let i = 0; i < t.turns; i++) { const k = x; x = z; z = -k; }
  if (t.mirror) x = -x;
  return [x === 0 ? 0 : x, p[1], z === 0 ? 0 : z];
}
/** World block of a project block. */
export const placeToWorld = (p: Vec3, pl: Pick<WorldPlacement, 'origin' | 'turns' | 'mirror'>): Vec3 => toWorld(isTurned(pl) ? turnVector(p, turnOf(pl)) : p, pl.origin);
/** Project block of a world block (inverse of placeToWorld). */
export const worldToProject = (w: Vec3, pl: Pick<WorldPlacement, 'origin' | 'turns' | 'mirror'>): Vec3 => {
  const r: Vec3 = [w[0] - pl.origin[0], w[1] - pl.origin[1], w[2] - pl.origin[2]];
  return isTurned(pl) ? unturnVector(r, turnOf(pl)) : r;
};
/** Bounds of turned blocks (cell boxes, not points). */
export function turnBounds(b: Bounds, t: PlacementTurn): Bounds {
  if (!t.turns && !t.mirror) return b;
  const a = turnVector(b.min, t), c = turnVector([b.maxExclusive[0] - 1, b.maxExclusive[1] - 1, b.maxExclusive[2] - 1], t);
  return { min: [Math.min(a[0], c[0]), b.min[1], Math.min(a[2], c[2])], maxExclusive: [Math.max(a[0], c[0]) + 1, b.maxExclusive[1], Math.max(a[2], c[2]) + 1] };
}
/** World bounds of a project's bounds at a (possibly turned) placement. */
export const placedBounds = (b: Bounds, pl: Pick<WorldPlacement, 'origin' | 'turns' | 'mirror'>): Bounds => translateBounds(turnBounds(b, turnOf(pl)), pl.origin);
/** Block state as it stands in the world (same rules as the voxel core and the mod; unknown families stay as they are). */
export function turnState(state: BlockState, t: PlacementTurn): BlockState {
  if (!t.turns && !t.mirror) return state;
  return transformBlockState(state, { position: [0, 0, 0], quarterTurns: t.turns, mirrorX: t.mirror }).state;
}
/**
 * The payload turned around project 0/0/0 (positions, states, block entity positions, bounds), so code that
 * adds the origin to project positions (terrain check, landscape, earthwork) works unchanged for a turned placement.
 * Display/analysis data only; never exported.
 */
export function turnPayload(payload: VoxelPayload, t: PlacementTurn): VoxelPayload {
  if (!t.turns && !t.mirror) return payload;
  return {
    ...payload,
    palette: payload.palette.map(s => turnState(s, t)),
    cells: payload.cells.map(c => ({ ...c, position: turnVector(c.position, t) })),
    blockEntities: payload.blockEntities.map(e => ({ ...e, position: turnVector(e.position, t) })),
    bounds: turnBounds(payload.bounds, t),
  };
}
/** Same placement with another turn/mirror; fields are left out for 0/false so old copies compare equal. */
export function withTurn(pl: WorldPlacement, t: PlacementTurn): WorldPlacement {
  const { turns: _t, mirror: _m, ...rest } = pl;
  const turns = (((t.turns % 4) + 4) % 4) as PlacementTurns;
  return checkWorldPlacement({ ...rest, ...(turns && { turns }), ...(t.mirror && { mirror: true }) });
}
/**
 * Turns (by quarter turns, ±) and/or mirrors a placed project in place: the north-west corner of its
 * footprint stays where it is, the anchor moves. `local` are the project's own bounds.
 */
export function turnInPlace(pl: WorldPlacement, local: Bounds | null, how: { turns?: number; mirror?: boolean }): WorldPlacement {
  const t = turnOf(pl);
  // Mirroring a turned placement in world X: mirror first in project space, so the turn has to change sign.
  const next: PlacementTurn = how.mirror ? { turns: ((4 - t.turns) % 4) as PlacementTurns, mirror: !t.mirror } : { turns: ((t.turns + (how.turns ?? 0)) % 4 + 4) % 4 as PlacementTurns, mirror: t.mirror };
  const turned = withTurn(pl, next);
  if (!local) return turned;
  const before = placedBounds(local, pl), after = placedBounds(local, turned);
  return checkWorldPlacement({ ...turned, origin: [pl.origin[0] + before.min[0] - after.min[0], pl.origin[1], pl.origin[2] + before.min[2] - after.min[2]] });
}
/** Chunk (16×16 columns) and region (32×32 chunks) of a world X or Z. */
export const chunkOf = (n: number): number => Math.floor(n / 16);
export const regionOf = (n: number): number => Math.floor(n / 512);

const overlaps = (a: Bounds, b: Bounds): boolean => [0, 1, 2].every(i => a.min[i]! < b.maxExclusive[i]! && b.min[i]! < a.maxExclusive[i]!);
const overlapsXZ = (a: Bounds, b: Bounds): boolean => [0, 2].every(i => a.min[i]! < b.maxExclusive[i]! && b.min[i]! < a.maxExclusive[i]!);

/**
 * Origin for a project that is not placed yet: east of everything already
 * placed in the dimension, with a gap, aligned to a chunk border so the new
 * site starts on a chunk edge. `local` are the project's own bounds.
 */
export function suggestPlacement(placed: readonly Bounds[], local: Bounds | null): Vec3 {
  const l = local ?? { min: [0, 0, 0], maxExclusive: [1, 1, 1] };
  const y = DEFAULT_WORLD_Y - l.min[1];
  if (!placed.length) return [-l.min[0], y, -l.min[2]];
  let east = -Infinity, north = Infinity;
  for (const b of placed) { east = Math.max(east, b.maxExclusive[0]); north = Math.min(north, b.min[2]); }
  const x = Math.ceil((east + PLACEMENT_GAP) / 16) * 16;
  return [x - l.min[0], y, north - l.min[2]];
}

// ------------------------------------------------------------------ map view

/** Per cell: 0 open, 1 done (ticked, unchanged), 2 review (ticked, geometry changed since). */
export type CellProgress = 0 | 1 | 2;
const PROGRESS_CODE: Readonly<Record<StepStatus, CellProgress>> = { open: 0, done: 1, review: 2 };

export type MapSkip = 'hidden' | 'empty' | 'limit' | 'error';
export const MAP_SKIP_LABEL: Readonly<Record<MapSkip, string>> = {
  hidden: 'ausgeblendet', empty: 'ohne Bauteile', limit: 'über dem Anzeigebudget', error: 'nicht auflösbar',
};

export interface MapEntry {
  /** Index into `entries`; also the value stored per cell in `owner`. */
  readonly index: number;
  readonly projectId: string;
  readonly name: string;
  readonly placement: WorldPlacement;
  /** Bounds of the resolved plan in project coordinates; null without blocks. */
  readonly localBounds: Bounds | null;
  /** Same bounds in world coordinates. */
  readonly worldBounds: Bounds | null;
  /** Visible block cells (no air, no delete cells). */
  readonly blocks: number;
  readonly steps: number;
  readonly stepsDone: number;
  readonly stepsReview: number;
  /** Ticked blocks (done only) / all guide blocks, 0–1. */
  readonly share: number;
  /** Unresolved voxel conflicts inside the project. */
  readonly conflicts: number;
  /** Set when the project is listed but not drawn. */
  readonly skipped?: MapSkip;
  readonly error?: string;
}

export interface MapCollision {
  readonly a: string;
  readonly b: string;
  /** World cells where both plans differ (block vs block, block vs required air, …). */
  readonly cells: number;
  /** Cells where both plans want exactly the same. */
  readonly identical: number;
  /** First differing world cell (lowest Y, then Z, then X). */
  readonly sample: Vec3 | null;
}

export interface WorldMapView {
  readonly dimension: string;
  readonly entries: readonly MapEntry[];
  /** Projects without placement (any dimension). */
  readonly unplaced: readonly { readonly projectId: string; readonly name: string; readonly localBounds: Bounds | null }[];
  /** Placed projects per other dimension (for the dimension switch). */
  readonly elsewhere: Readonly<Record<string, number>>;
  /** Visible block cells of all drawn projects in world coordinates. */
  readonly cells: readonly Cell[];
  readonly palette: readonly BlockState[];
  /** Entry index per cell. */
  readonly owner: Uint16Array;
  /** CellProgress per cell. */
  readonly progress: Uint8Array;
  /** Union of drawn world bounds; null when nothing is drawn. */
  readonly bounds: Bounds | null;
  readonly collisions: readonly MapCollision[];
}

export interface WorldMapOptions {
  readonly dimension?: string;
  readonly maxCells?: number;
  /** Include hidden projects anyway (e.g. while the list shows them). */
  readonly showHidden?: boolean;
}

/**
 * Builds the map of one dimension. Deterministic: projects in the given
 * order, cells in project resolution order. Projects that would exceed the
 * display budget are listed with skipped='limit' instead of being cut.
 */
export function buildWorldMap(projects: readonly Project[], versions: ReadonlyMap<string, AssetVersion>, options: WorldMapOptions = {}): WorldMapView {
  const dimension = options.dimension ?? DIMENSIONS[0]!.id, maxCells = options.maxCells ?? MAP_MAX_CELLS;
  const entries: MapEntry[] = [], unplaced: WorldMapView['unplaced'][number][] = [], elsewhere: Record<string, number> = {};
  const cells: Cell[] = [], owner: number[] = [], progress: number[] = [];
  const palette: BlockState[] = [], paletteIndex = new Map<string, number>();
  // Per drawn entry: world cells (incl. required air) for the collision check.
  const footprints: { entry: number; bounds: Bounds; world: VoxelPayload; placement: WorldPlacement }[] = [];

  for (const project of projects) {
    const placement = worldOf(project);
    if (!placement) {
      let localBounds: Bounds | null = null;
      try { localBounds = resolveProject(project, versions).world?.bounds ?? null; } catch { /* listed without size */ }
      unplaced.push({ projectId: project.id, name: project.name, localBounds });
      continue;
    }
    if (placement.dimension !== dimension) { elsewhere[placement.dimension] = (elsewhere[placement.dimension] ?? 0) + 1; continue; }
    const index = entries.length;
    const base = { index, projectId: project.id, name: project.name, placement };
    let resolution;
    try { resolution = resolveProject(project, versions); }
    catch (e) {
      entries.push({ ...base, localBounds: null, worldBounds: null, blocks: 0, steps: 0, stepsDone: 0, stepsReview: 0, share: 0, conflicts: 0, skipped: 'error', error: e instanceof Error ? e.message : String(e) });
      continue;
    }
    const world = resolution.world;
    const guide = buildGuide(project, resolution), status = evaluateProgress(guide, project.progress);
    const blocks = world ? world.cells.reduce((n, c) => n + (c.kind === 'block' ? 1 : 0), 0) : 0;
    const localBounds = world?.bounds ?? null;
    const summary = {
      ...base, localBounds, worldBounds: localBounds && placedBounds(localBounds, placement), blocks,
      steps: guide.steps.length, stepsDone: status.done, stepsReview: status.review,
      share: guide.totals.blocks ? status.blocksDone / guide.totals.blocks : 0, conflicts: resolution.conflicts.length,
    };
    if (!world || !blocks) { entries.push({ ...summary, skipped: 'empty' }); continue; }
    // Hidden projects are not drawn but still take part in the collision check.
    if (placement.hidden && !options.showHidden) { entries.push({ ...summary, skipped: 'hidden' }); footprints.push({ entry: index, bounds: summary.worldBounds!, world, placement }); continue; }
    if (cells.length + blocks > maxCells || index > 0xfffe) { entries.push({ ...summary, skipped: 'limit' }); continue; }
    entries.push(summary);

    const stepOf = new Map<string, CellProgress>();
    for (const step of guide.steps) {
      const code = PROGRESS_CODE[status.status.get(step.id) ?? 'open'];
      for (const p of step.positions) stepOf.set(positionKey(p), code);
    }
    const turn = turnOf(placement), turnedStates = world.palette.map(st => turnState(st, turn));
    for (const cell of world.cells) {
      if (cell.kind !== 'block') continue;
      const state = turnedStates[cell.paletteIndex]!, sk = stateKey(state);
      let pi = paletteIndex.get(sk);
      if (pi === undefined) { pi = palette.length; palette.push(state); paletteIndex.set(sk, pi); }
      cells.push({ position: placeToWorld(cell.position, placement), kind: 'block', paletteIndex: pi });
      owner.push(index); progress.push(stepOf.get(positionKey(cell.position)) ?? 0);
    }
    footprints.push({ entry: index, bounds: summary.worldBounds!, world, placement });
  }

  // Collisions between drawn projects: AABB pre-filter, then per voxel (incl. required air and delete cells).
  const keyed = new Map<number, Map<string, string>>();
  const cellsOf = (f: typeof footprints[number]): Map<string, string> => {
    let m = keyed.get(f.entry);
    if (!m) {
      m = new Map();
      const turn = turnOf(f.placement);
      for (const c of f.world.cells) m.set(positionKey(placeToWorld(c.position, f.placement)), c.kind === 'erase' ? '!erase' : c.kind === 'air' ? '!air' : stateKey(turnState(f.world.palette[c.paletteIndex]!, turn)));
      keyed.set(f.entry, m);
    }
    return m;
  };
  const collisions: MapCollision[] = [];
  for (let i = 0; i < footprints.length; i++) for (let j = i + 1; j < footprints.length; j++) {
    const a = footprints[i]!, b = footprints[j]!;
    if (!overlaps(a.bounds, b.bounds)) continue;
    const ca = cellsOf(a), cb = cellsOf(b), [small, large] = ca.size <= cb.size ? [ca, cb] : [cb, ca];
    let differ = 0, same = 0, sample: Vec3 | null = null;
    for (const [key, value] of small) {
      const other = large.get(key); if (other === undefined) continue;
      if (other === value && value !== '!erase') { same++; continue; }
      differ++;
      const p = key.split(',').map(Number) as unknown as Vec3;
      if (!sample || p[1] < sample[1] || (p[1] === sample[1] && (p[2] < sample[2] || (p[2] === sample[2] && p[0] < sample[0])))) sample = p;
    }
    if (differ || same) collisions.push({ a: entries[a.entry]!.projectId, b: entries[b.entry]!.projectId, cells: differ, identical: same, sample });
  }

  let bounds: Bounds | null = null;
  for (const e of entries) if (!e.skipped && e.worldBounds) bounds = bounds ? union(bounds, e.worldBounds) : e.worldBounds;
  return { dimension, entries, unplaced, elsewhere, cells, palette, owner: Uint16Array.from(owner), progress: Uint8Array.from(progress), bounds, collisions };
}

function union(a: Bounds, b: Bounds): Bounds {
  return {
    min: [Math.min(a.min[0], b.min[0]), Math.min(a.min[1], b.min[1]), Math.min(a.min[2], b.min[2])],
    maxExclusive: [Math.max(a.maxExclusive[0], b.maxExclusive[0]), Math.max(a.maxExclusive[1], b.maxExclusive[1]), Math.max(a.maxExclusive[2], b.maxExclusive[2])],
  };
}

/** Projects whose X/Z footprint touches `b` (e.g. to warn before placing). */
export function footprintNeighbours(map: WorldMapView, b: Bounds, exceptProjectId?: string): MapEntry[] {
  return map.entries.filter(e => e.projectId !== exceptProjectId && e.worldBounds && overlapsXZ(e.worldBounds, b));
}

/**
 * Top-down height map of one entry for the 2D overview: per X/Z column the
 * highest visible block. Columns are indexed `x + z·width` relative to the
 * entry's world bounds; -1 marks an empty column.
 */
export interface TopView {
  readonly entry: number;
  readonly min: readonly [x: number, z: number];
  readonly width: number;
  readonly depth: number;
  /** Cell index into `map.cells` of the top block per column, or -1. */
  readonly top: Int32Array;
}

export function topViews(map: WorldMapView): TopView[] {
  const views = new Map<number, { min: [number, number]; width: number; depth: number; top: Int32Array }>();
  for (const e of map.entries) if (!e.skipped && e.worldBounds) {
    const b = e.worldBounds, width = b.maxExclusive[0] - b.min[0], depth = b.maxExclusive[2] - b.min[2];
    views.set(e.index, { min: [b.min[0], b.min[2]], width, depth, top: new Int32Array(width * depth).fill(-1) });
  }
  map.cells.forEach((cell, i) => {
    const v = views.get(map.owner[i]!); if (!v) return;
    const k = (cell.position[0] - v.min[0]) + (cell.position[2] - v.min[1]) * v.width, prev = v.top[k]!;
    if (prev < 0 || map.cells[prev]!.position[1] < cell.position[1]) v.top[k] = i;
  });
  return [...views].map(([entry, v]) => ({ entry, ...v }));
}

/** Plain JSON list of the placements of one map (for sharing, the game bridge or a server's map plugin). */
export function placementsJson(map: WorldMapView): string {
  return JSON.stringify({
    format: 'bauplaner-weltkarte', version: 1, dimension: map.dimension,
    projects: map.entries.filter(e => e.worldBounds).map(e => ({
      id: e.projectId, name: e.name, origin: e.placement.origin, note: e.placement.note,
      ...(isTurned(e.placement) && { turns: e.placement.turns ?? 0, mirror: e.placement.mirror === true }),
      min: e.worldBounds!.min, maxExclusive: e.worldBounds!.maxExclusive, blocks: e.blocks,
      stepsDone: e.stepsDone, steps: e.steps, share: Math.round(e.share * 1000) / 1000,
    })),
  }, null, 2);
}

/**
 * Point a live map should show for an entry: the centre of its footprint,
 * on top of the plan. `world` is the map's own world name (e.g. "world").
 */
export function liveMapPositionOf(entry: MapEntry, world: string): LiveMapPosition | null {
  const b = entry.worldBounds; if (!b) return null;
  return { x: Math.floor((b.min[0] + b.maxExclusive[0]) / 2), y: b.maxExclusive[1], z: Math.floor((b.min[2] + b.maxExclusive[2]) / 2), world, dimension: entry.placement.dimension };
}

/** Marker file (livemap.ts interchange) with one marker per placed project. */
export function mapMarkers(map: WorldMapView, world: string): LiveMapMarkerFile {
  const markers: LiveMapMarker[] = [];
  for (const e of map.entries) {
    const position = liveMapPositionOf(e, world);
    if (position) markers.push({ id: e.projectId, label: e.name.slice(0, 120), position });
  }
  return createLiveMapMarkerFile(markers);
}

export type LiveMapLinkKind = 'bluemap' | 'dynmap' | 'world-x-z';
export interface LiveMapLinkTemplate {
  readonly kind: LiveMapLinkKind;
  /** URL template for livemap.ts with {world}/{x}/{y}/{z} placeholders. */
  readonly template: string;
  /** World/map name found in the link. */
  readonly world: string;
}

const numeric = (v: string | undefined): boolean => v !== undefined && /^-?\d+(\.\d+)?$/.test(v);

/**
 * Turns a link copied from a live map's address bar into a URL template, so
 * the operator never has to type placeholders. Recognised shapes (taken from
 * the providers' own web app sources, see WORLDMAP.md):
 *  - BlueMap: `#<map>:<x>:<y>:<z>:<distance>:<rotation>:<angle>:<tilt>:<ortho>:<mode>`
 *  - Dynmap: query `worldname`, `x`, `y`, `z`
 *  - query `world`, `x`, `z` (Pl3xMap and similar)
 * Everything else of the link (server, path, zoom, camera) is kept as is.
 * Returns null for any other link; nothing is fetched.
 */
export function liveMapTemplateFromLink(link: string): LiveMapLinkTemplate | null {
  let url: URL;
  try { url = new URL(link.trim()); } catch { return null; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:' || url.username || url.password) return null;
  const base = `${url.origin}${url.pathname}`;
  const hash = url.hash.slice(1), parts = hash.split(':');
  if (parts.length === 10 && parts[0] && numeric(parts[1]) && numeric(parts[2]) && numeric(parts[3])) {
    const world = decodeURIComponent(parts[0]);
    return { kind: 'bluemap', world, template: `${base}${url.search}#{world}:{x}:{y}:{z}:${parts.slice(4).join(':')}` };
  }
  const params = [...url.searchParams];
  const get = (k: string) => url.searchParams.get(k) ?? undefined;
  const worldKey = get('worldname') !== undefined ? 'worldname' : get('world') !== undefined ? 'world' : null;
  if (!worldKey || !numeric(get('x')) || !numeric(get('z'))) return null;
  const token: Record<string, string> = { [worldKey]: '{world}', x: '{x}', z: '{z}', ...(numeric(get('y')) && { y: '{y}' }) };
  const query = params.map(([k, v]) => `${encodeURIComponent(k)}=${token[k] ?? encodeURIComponent(v)}`).join('&');
  return { kind: worldKey === 'worldname' ? 'dynmap' : 'world-x-z', world: get(worldKey)!, template: `${base}?${query}${url.hash}` };
}
