import { adoptPayload, stateKey } from '../../voxel/src/validation.js';
import { transformPayload } from '../../voxel/src/transforms.js';
import type { BlockEntity, BlockState, Bounds, Cell, Limits, Vec3, VoxelPayload } from '../../voxel/src/types.js';
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
  readonly code: 'UNRESOLVED_BLOCK_STATE' | 'UNRESOLVED_BLOCK_ENTITY' | 'MISSING_VERSION' | 'PROFILE_MISMATCH';
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
  const slots = new Map<string, Slot>();
  let duplicates = 0;
  for (const p of placed) {
    const entities = new Map(p.payload.blockEntities.map(e => [positionKey(e.position), e]));
    for (const cell of p.payload.cells) {
      const key = positionKey(cell.position), state = cell.kind === 'erase' ? null : p.payload.palette[cell.paletteIndex]!, entity = entities.get(key);
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
  for (const [key, slot] of slots) owners.set(key, slot.conflict?.resolvedBy ? [slot.conflict.resolvedBy, ...slot.owners.filter(o => o !== slot.conflict!.resolvedBy)] : slot.owners);
  let world: VoxelPayload | null = null;
  if (slots.size) {
    const palette: BlockState[] = [], index = new Map<string, number>();
    const cells: Cell[] = [], blockEntities: BlockEntity[] = [];
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (const p of placed) for (const i of [0, 1, 2]) {
      min[i] = Math.min(min[i]!, p.payload.bounds.min[i]!); max[i] = Math.max(max[i]!, p.payload.bounds.maxExclusive[i]!);
    }
    const sorted = [...slots.values()].sort((a, b) => a.cell.position[1] - b.cell.position[1] || a.cell.position[2] - b.cell.position[2] || a.cell.position[0] - b.cell.position[0]);
    for (const slot of sorted) {
      if (slot.cell.kind === 'erase') { cells.push({ position: slot.cell.position, kind: 'erase' }); continue; }
      const key = stateKey(slot.state!);
      let paletteIndex = index.get(key);
      if (paletteIndex === undefined) { paletteIndex = palette.length; palette.push(slot.state!); index.set(key, paletteIndex); }
      cells.push({ position: slot.cell.position, kind: slot.cell.kind, paletteIndex });
      if (slot.entity && slot.cell.kind === 'block') blockEntities.push({ position: slot.cell.position, data: slot.entity.data });
    }
    try {
      // Cells are built above; states and entity data come from frozen version payloads.
      world = adoptPayload({ schemaVersion: 1, profileId: project.profileId, bounds: { min, maxExclusive: max }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette, cells, blockEntities }, limits);
    } catch (e) {
      throw new DomainError('LIMIT', `Zusammengesetztes Projekt überschreitet die Grenzen: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  const exportBlockers: string[] = [];
  if (conflicts.length) exportBlockers.push(`${conflicts.length} ungeklärte Voxelkonflikte`);
  const missing = issues.filter(i => i.code === 'MISSING_VERSION').length;
  if (missing) exportBlockers.push(`${missing} fehlende Bauteilversionen`);
  const unresolved = issues.filter(i => i.code === 'UNRESOLVED_BLOCK_STATE' || i.code === 'UNRESOLVED_BLOCK_ENTITY').length;
  if (unresolved) exportBlockers.push(`${unresolved} ungelöste Zustands-/NBT-Transformationen`);
  if (!world) exportBlockers.push('Projekt enthält keine Bauteile');
  return { world, placed, owners, conflicts, overridden, duplicates, boundsOverlaps, issues, exportBlockers };
}
