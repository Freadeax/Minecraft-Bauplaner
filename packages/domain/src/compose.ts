import { adoptPayload, stateKey } from '../../voxel/src/validation.js';
import { transformPayload } from '../../voxel/src/transforms.js';
import type { BlockEntity, BlockState, Bounds, Cell, FreeEntity, Limits, Vec3, VoxelPayload } from '../../voxel/src/types.js';
import { canonicalJson } from './hash.js';
import { DomainError } from './types.js';
import type { AssetVersion, Instance, Project } from './types.js';

export const positionKey = (p: Vec3): string => `${p[0]},${p[1]},${p[2]}`;

export interface PlacedInstance {
  readonly instance: Instance;
  readonly version: AssetVersion;
  /** Version payload after the instance transform, in project coordinates. */
  readonly payload: VoxelPayload;
  readonly semanticsResolved: boolean;
}

export type ConflictKind = 'state' | 'air-vs-block' | 'erase-vs-block' | 'block-entity';

export interface VoxelConflict {
  readonly position: Vec3;
  readonly kind: ConflictKind;
  /** Contributing instances in project order. */
  readonly instanceIds: readonly string[];
  /** Instance whose cell is used; for unresolved conflicts this is only the preview choice. */
  readonly previewInstanceId: string;
  /** Set when an explicit override instance decided the cell. */
  readonly resolvedBy?: string;
}

export interface CompositionIssue {
  readonly instanceId: string;
  readonly code: 'UNRESOLVED_BLOCK_STATE' | 'UNRESOLVED_BLOCK_ENTITY' | 'UNRESOLVED_ENTITY' | 'MISSING_VERSION' | 'PROFILE_MISMATCH';
  readonly message: string;
}

export interface Resolution {
  /** Resolved project payload; null when nothing is placed. */
  readonly world: VoxelPayload | null;
  readonly placed: readonly PlacedInstance[];
  /** positionKey → instance ids contributing to that world cell (first = owner). */
  readonly owners: ReadonlyMap<string, readonly string[]>;
  readonly conflicts: readonly VoxelConflict[];
  readonly overridden: readonly VoxelConflict[];
  /** Identical overlapping cells, counted once in the world payload. */
  readonly duplicates: number;
  /** Pairs whose bounds overlap (AABB pre-filter result, not itself a conflict). */
  readonly boundsOverlaps: readonly (readonly [string, string])[];
  readonly issues: readonly CompositionIssue[];
  /** Human readable reasons why a buildable export must be refused. Empty ⇒ geometrically exportable. */
  readonly exportBlockers: readonly string[];
}

interface Slot {
  cell: Cell;
  state: BlockState | null;
  entity: BlockEntity | undefined;
  owners: string[];
  override: boolean;
  conflict?: { kind: ConflictKind; ids: string[]; resolvedBy?: string };
}

const overlaps = (a: Bounds, b: Bounds): boolean => [0, 1, 2].every(i => a.min[i]! < b.maxExclusive[i]! && b.min[i]! < a.maxExclusive[i]!);

function conflictKind(a: Slot, cell: Cell, state: BlockState | null, entity: BlockEntity | undefined): ConflictKind | 'duplicate' {
  if (a.cell.kind !== cell.kind) {
    if (a.cell.kind === 'erase' || cell.kind === 'erase') return 'erase-vs-block';
    return 'air-vs-block';
  }
  if (cell.kind === 'erase') return 'duplicate';
  if (stateKey(a.state!) !== stateKey(state!)) return 'state';
  if (a.entity && entity && canonicalJson(a.entity.data) !== canonicalJson(entity.data)) return 'block-entity';
  return 'duplicate';
}

/** Map-like slot store over a dense cell index; iterates in insertion order like a Map. */
function denseSlots(volume: number): { get(k: number | string): Slot | undefined; set(k: number | string, v: Slot): void; values(): Iterable<Slot>; readonly size: number; sorted(): Slot[] } {
  const at = new Int32Array(volume), list: Slot[] = [];
  return {
    get: k => { const i = at[k as number]!; return i ? list[i - 1] : undefined; },
    set: (k, v) => { const i = at[k as number]!; if (i) list[i - 1] = v; else { list.push(v); at[k as number] = list.length; } },
    values: () => list,
    get size() { return list.length; },
    // The cell key orders by y, then z, then x – the world order – so walking the index needs no sort.
    sorted: () => { const out: Slot[] = []; for (let i = 0; i < at.length; i++) { const k = at[i]!; if (k) out.push(list[k - 1]!); } return out; },
  };
}

const cellOwnerTable = new WeakMap<VoxelPayload, readonly string[]>();
/**
 * Owner of each world cell, in the order of `world.cells` (same as `owners.get(positionKey(cell.position))[0]`).
 * Only known for a world built in this thread by `resolveProject`; callers fall back to `owners` otherwise.
 */
export function cellOwnersOf(resolution: Pick<Resolution, 'world' | 'owners'>): (i: number, cell: Cell) => string | undefined {
  const table = resolution.world ? cellOwnerTable.get(resolution.world) : undefined;
  return table ? i => table[i] : (_i, cell) => resolution.owners.get(positionKey(cell.position))?.[0];
}

/**
 * Resolves a project into one world payload. Overlaps are checked per voxel; the
 * AABB result is reported only as a pre-filter. Nothing is decided silently by
 * order: a differing overlap is a conflict unless exactly one side carries an
 * explicit override. Material counts must use `world`, which counts every
 * world cell once.
 */
export function resolveProject(project: Project, versions: ReadonlyMap<string, AssetVersion>, limits: Partial<Limits> = {}): Resolution {
  const placed: PlacedInstance[] = [], issues: CompositionIssue[] = [];
  for (const instance of project.instances) {
    const version = versions.get(instance.assetVersionId);
    if (!version) { issues.push({ instanceId: instance.id, code: 'MISSING_VERSION', message: `${instance.name}: Bauteilversion ${instance.assetVersionId} fehlt` }); continue; }
    const r = transformPayload(version.payload, instance.transform);
    for (const issue of r.issues) issues.push({ instanceId: instance.id, code: issue.code, message: `${instance.name}: ${issue.message}` });
    if (version.payload.profileId !== project.profileId) issues.push({ instanceId: instance.id, code: 'PROFILE_MISMATCH', message: `${instance.name}: Profil ${version.payload.profileId} weicht vom Projektprofil ${project.profileId} ab` });
    placed.push({ instance, version, payload: r.payload, semanticsResolved: r.semanticsResolved });
  }
  const boundsOverlaps: [string, string][] = [];
  for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++)
    if (overlaps(placed[i]!.payload.bounds, placed[j]!.payload.bounds)) boundsOverlaps.push([placed[i]!.instance.id, placed[j]!.instance.id]);
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const p of placed) for (const i of [0, 1, 2]) {
    min[i] = Math.min(min[i]!, p.payload.bounds.min[i]!); max[i] = Math.max(max[i]!, p.payload.bounds.maxExclusive[i]!);
  }
  const sx = max[0]! - min[0]!, sy = max[1]! - min[1]!, sz = max[2]! - min[2]!;
  // Bounds are integer validated by transformPayload. A numeric index is unique only
  // when every intermediate integer fits exactly; sparse far-apart projects can
  // exceed this range even though each individual payload is valid.
  const numericIndex = placed.length > 0 && BigInt(sx) * BigInt(sy) * BigInt(sz) <= BigInt(Number.MAX_SAFE_INTEGER);
  const cellKey: (p: Vec3) => number | string = numericIndex
    ? p => (p[0] - min[0]!) + sx * ((p[2] - min[2]!) + sz * (p[1] - min[1]!))
    : positionKey;
  // A world box up to 32 million cells indexes its slots with an Int32Array instead of a Map entry per cell
  // (SIZE-01: inserting a million cells into a Map took seconds); larger or sparse projects keep the Map.
  const volume = sx * sy * sz;
  const slots = numericIndex && volume <= 33_554_432 ? denseSlots(volume) : new Map<number | string, Slot>();
  let duplicates = 0;
  for (const p of placed) {
    const entities = new Map(p.payload.blockEntities.map(e => [cellKey(e.position), e]));
    for (const cell of p.payload.cells) {
      const key = cellKey(cell.position), state = cell.kind === 'erase' ? null : p.payload.palette[cell.paletteIndex]!, entity = entities.get(key);
      const slot = slots.get(key);
      if (!slot) { slots.set(key, { cell, state, entity, owners: [p.instance.id], override: p.instance.override }); continue; }
      slot.owners.push(p.instance.id);
      const kind = conflictKind(slot, cell, state, entity);
      if (kind === 'duplicate') { duplicates++; slot.entity ??= entity; continue; }
      const ids = slot.conflict ? [...slot.conflict.ids, p.instance.id] : [...slot.owners];
      if (p.instance.override && !slot.override && (!slot.conflict || slot.conflict.resolvedBy)) {
        Object.assign(slot, { cell, state, entity, override: true });
        slot.conflict = { kind, ids, resolvedBy: p.instance.id };
      } else if (!p.instance.override && slot.override && (!slot.conflict || slot.conflict.resolvedBy)) {
        slot.conflict = { kind, ids, resolvedBy: slot.conflict?.resolvedBy ?? slot.owners[0]! };
      } else {
        slot.conflict = { kind: slot.conflict?.kind ?? kind, ids };
      }
    }
  }
  const conflicts: VoxelConflict[] = [], overridden: VoxelConflict[] = [];
  for (const slot of slots.values()) if (slot.conflict) {
    const winner = slot.conflict.resolvedBy ?? slot.owners[0]!;
    const c: VoxelConflict = { position: slot.cell.position, kind: slot.conflict.kind, instanceIds: slot.conflict.ids, previewInstanceId: winner,
      ...(slot.conflict.resolvedBy !== undefined && { resolvedBy: slot.conflict.resolvedBy }) };
    (slot.conflict.resolvedBy ? overridden : conflicts).push(c);
  }
  const owners = new Map<string, string[]>();
  // One shared owner list per instance for the usual case (one owner, no conflict): far less memory and
  // copying when the result goes from the worker to the page (SIZE-01).
  const single = new Map<string, string[]>();
  const ownersOf = (slot: Slot): string[] => {
    if (slot.conflict?.resolvedBy) return [slot.conflict.resolvedBy, ...slot.owners.filter(o => o !== slot.conflict!.resolvedBy)];
    if (slot.owners.length !== 1) return slot.owners;
    const id = slot.owners[0]!;
    let list = single.get(id);
    if (!list) single.set(id, list = [id]);
    return list;
  };
  for (const slot of slots.values()) owners.set(positionKey(slot.cell.position), slot.owners = ownersOf(slot));
  let world: VoxelPayload | null = null;
  if (slots.size) {
    const palette: BlockState[] = [], index = new Map<string, number>();
    const cells: Cell[] = [], blockEntities: BlockEntity[] = [], cellOwners: string[] = [];
    const sorted = 'sorted' in slots ? slots.sorted()
      : [...slots.values()].sort((a, b) => a.cell.position[1] - b.cell.position[1] || a.cell.position[2] - b.cell.position[2] || a.cell.position[0] - b.cell.position[0]);
    for (const slot of sorted) {
      cellOwners.push(slot.owners[0]!);
      if (slot.cell.kind === 'erase') { cells.push({ position: slot.cell.position, kind: 'erase' }); continue; }
      const key = stateKey(slot.state!);
      let paletteIndex = index.get(key);
      if (paletteIndex === undefined) { paletteIndex = palette.length; palette.push(slot.state!); index.set(key, paletteIndex); }
      cells.push({ position: slot.cell.position, kind: slot.cell.kind, paletteIndex });
      if (slot.entity && slot.cell.kind === 'block') blockEntities.push({ position: slot.cell.position, data: slot.entity.data });
    }
    // Free entities of every placed instance (paintings, frames, armor stands); identical copies count once.
    const entities: FreeEntity[] = [], seenEntities = new Set<string>();
    for (const p of placed) for (const e of p.payload.entities ?? []) {
      const key = canonicalJson(e);
      if (seenEntities.has(key)) { duplicates++; continue; }
      seenEntities.add(key); entities.push(e);
    }
    try {
      // Cells are built above; states and entity data come from frozen version payloads.
      world = adoptPayload({ schemaVersion: 1, profileId: project.profileId, bounds: { min, maxExclusive: max }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette, cells, blockEntities, ...(entities.length && { entities }) }, limits);
      cellOwnerTable.set(world, cellOwners);
    } catch (e) {
      throw new DomainError('LIMIT', `Zusammengesetztes Projekt überschreitet die Grenzen: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  const exportBlockers: string[] = [];
  if (conflicts.length) exportBlockers.push(`${conflicts.length} ungeklärte Voxelkonflikte`);
  const missing = issues.filter(i => i.code === 'MISSING_VERSION').length;
  if (missing) exportBlockers.push(`${missing} fehlende Bauteilversionen`);
  const unresolved = issues.filter(i => i.code === 'UNRESOLVED_BLOCK_STATE' || i.code === 'UNRESOLVED_BLOCK_ENTITY' || i.code === 'UNRESOLVED_ENTITY').length;
  if (unresolved) exportBlockers.push(`${unresolved} ungelöste Zustands-/NBT-Transformationen`);
  if (!world) exportBlockers.push('Projekt enthält keine Bauteile');
  return { world, placed, owners, conflicts, overridden, duplicates, boundsOverlaps, issues, exportBlockers };
}
