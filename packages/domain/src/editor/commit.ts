import { transformBlockState } from '../../../voxel/src/states.js';
import { transformCellPosition } from '../../../voxel/src/transforms.js';
import { transformVector } from '../../../voxel/src/states.js';
import type { Transform, Vec3, VoxelPayload } from '../../../voxel/src/types.js';
import type { Resolution } from '../core/compose.js';
import { validateConnectors } from '../core/connectors.js';
import { addAssetVersion, createAsset } from '../catalog/library.js';
import { newInstance } from '../core/project.js';
import type { Operation } from '../core/project.js';
import { DomainError } from '../core/types.js';
import type { Asset, AssetVersion, Instance, Project, Provenance } from '../core/types.js';
import { applyEdit, createDraft, keyPos, materializeDraft, posKey } from './draft.js';
import type { CellChange, CellSlot, CellValue, Draft } from './draft.js';

/**
 * Speichern des Blockeditors (EDIT-02). Nothing is overwritten: a module edit
 * appends a new immutable version to its asset; a project edit appends one new
 * version per touched instance and switches those instances with a single
 * invertible batch operation (undo returns to the old versions, which stay in
 * the library). Coordinates go through the shared transform core only.
 */
export const EDITOR_PROVENANCE: Provenance = Object.freeze({ author: 'eigener Entwurf', source: 'Blockeditor', license: 'eigene Arbeit' });

export interface CommitWarning { readonly code: 'CONNECTOR' | 'STATE_UNRESOLVED' | 'INSTANCE_EMPTY' | 'NO_SOURCE'; readonly message: string }

export interface VersionCommit {
  readonly asset: Asset;
  readonly version: AssetVersion;
  readonly warnings: readonly CommitWarning[];
}

function connectorWarnings(payload: VoxelPayload, version: AssetVersion | null): CommitWarning[] {
  if (!version?.connectors.length) return [];
  return validateConnectors(payload, version.connectors).map(i => ({ code: 'CONNECTOR' as const, message: `Anschluss ${i.connectorId}: ${i.message}` }));
}

/**
 * Saves a module draft as the next version of `asset`. `from` is the version
 * the draft started from (its connectors are kept and re-validated against the
 * new bounds). Throws EMPTY when the model has no cells left.
 */
export async function commitDraftAsVersion(draft: Draft, asset: Asset, from: AssetVersion | null, opts: { label?: string } = {}): Promise<VersionCommit> {
  const payload = materializeDraft(draft);
  if (!payload) throw new DomainError('EMPTY', 'Das Modell enthält keine Zellen mehr; leere Versionen werden nicht gespeichert.');
  const r = await addAssetVersion(asset, {
    payload, ...(opts.label !== undefined && { label: opts.label }), connectors: from?.connectors ?? [],
    source: { format: 'editor', ...(from && { editedFrom: from.id }) },
  });
  return { ...r, warnings: connectorWarnings(payload, from) };
}

/** Creates a new asset from a draft built from scratch (or saved as a copy). */
export async function commitDraftAsNewAsset(draft: Draft, input: { name: string; description?: string; tags?: readonly string[]; from?: AssetVersion | null }): Promise<VersionCommit> {
  const asset = createAsset({ name: input.name, description: input.description ?? '', tags: [...(input.tags ?? []), 'eigenbau'], provenance: EDITOR_PROVENANCE });
  return commitDraftAsVersion(draft, asset, input.from ?? null, { label: '1.0' });
}

// ------------------------------------------------------------------ project

/** Inverse of a discrete transform's rotation part (the 8 transforms form a group). */
export function inverseRotation(t: Pick<Transform, 'quarterTurns' | 'mirrorX'>): Transform {
  const full: Transform = { position: [0, 0, 0], quarterTurns: t.quarterTurns, mirrorX: t.mirrorX };
  for (const mirrorX of [false, true]) for (const q of [0, 1, 2, 3] as const) {
    const inv: Transform = { position: [0, 0, 0], quarterTurns: q, mirrorX };
    if (([[1, 0, 0], [0, 0, 1]] as const).every(v => transformVector(transformVector(v, full), inv).every((n, i) => n === v[i]))) return inv;
  }
  throw new DomainError('INVALID', 'Transformation ohne Inverse');
}

/**
 * Local cell of an instance version payload that the instance transform puts
 * at `world`. Computed through the inverse rotation and confirmed with the
 * forward rule (`transformCellPosition`), so both directions agree.
 */
export function localCell(world: Vec3, pivot: Vec3, t: Transform): Vec3 {
  const inv = inverseRotation(t);
  const c = transformVector([world[0] + 0.5 - t.position[0], world[1] + 0.5 - t.position[1], world[2] + 0.5 - t.position[2]], inv);
  const local: Vec3 = [Math.floor(c[0] + pivot[0]), Math.floor(c[1] + pivot[1]), Math.floor(c[2] + pivot[2])];
  const back = transformCellPosition(local, pivot, t);
  if (back.some((n, i) => n !== world[i])) throw new DomainError('INVALID', `Zelle ${world.join(',')} lässt sich nicht eindeutig zurückrechnen`);
  return local;
}

function localValue(value: CellSlot, t: Transform, warn: Set<string>): CellSlot {
  if (value?.kind !== 'block') return value;
  const r = transformBlockState(value.state, inverseRotation(t));
  if (!r.resolved) warn.add(value.state.id);
  const v: CellValue = value.entity ? { kind: 'block', state: r.state, entity: value.entity } : { kind: 'block', state: r.state };
  return v;
}

export interface ProjectEditTarget {
  /** Where new blocks in empty space go: an existing instance id, or 'new' for a fresh "Eigene Blöcke" module. */
  readonly loose: string | 'new';
  /** Name of the new module when `loose` is 'new'. */
  readonly newName?: string;
}

export interface InstanceEditPlan { readonly instanceId: string; readonly instanceName: string; readonly changes: CellChange[] }
export interface ProjectEditPlan {
  readonly perInstance: readonly InstanceEditPlan[];
  /** World positions with no owning instance that go to a new module. */
  readonly loose: readonly CellChange[];
  readonly warnings: readonly CommitWarning[];
}

/**
 * Routes a world draft (base = resolution.world) to the instances. A changed
 * or removed cell goes to every instance contributing that cell (so identical
 * overlaps stay consistent and conflicts disappear); a cell in empty space goes
 * to the chosen target instance or to a new module.
 */
export function planProjectEdit(resolution: Resolution, draft: Draft, target: ProjectEditTarget): ProjectEditPlan {
  const placed = new Map(resolution.placed.map(p => [p.instance.id, p]));
  const per = new Map<string, InstanceEditPlan>(), loose: CellChange[] = [], unresolved = new Set<string>(), warnings: CommitWarning[] = [];
  const push = (instanceId: string, world: Vec3, value: CellSlot) => {
    const p = placed.get(instanceId);
    if (!p) throw new DomainError('NOT_FOUND', `Instanz ${instanceId} ist nicht platziert`);
    const t = p.instance.transform, pivot = p.version.payload.pivot;
    let plan = per.get(instanceId);
    if (!plan) { plan = { instanceId, instanceName: p.instance.name, changes: [] }; per.set(instanceId, plan); }
    plan.changes.push({ position: localCell(world, pivot, t), value: localValue(value, t, unresolved) });
  };
  for (const [k, value] of draft.overlay) {
    const world = keyPos(k), owners = resolution.owners.get(posKey(world)) ?? [];
    if (owners.length) for (const id of owners) push(id, world, value);
    else if (!value) continue;
    else if (target.loose !== 'new') push(target.loose, world, value);
    else loose.push({ position: world, value });
  }
  for (const id of [...unresolved].sort()) warnings.push({ code: 'STATE_UNRESOLVED', message: `${id}: keine Drehregel; Zustand wurde unverändert in die gedrehte Instanz übernommen.` });
  return { perInstance: [...per.values()], loose, warnings };
}

export interface ProjectCommit {
  readonly assets: readonly Asset[];
  readonly versions: readonly AssetVersion[];
  /** Single undoable project operation; null when nothing changed. */
  readonly operation: Operation | null;
  readonly warnings: readonly CommitWarning[];
}

/**
 * Builds the new versions and the project operation for a world draft. The
 * caller stores assets/versions first (they are immutable) and then executes
 * the operation through the project session, which records undo.
 */
export async function commitProjectEdit(project: Project, resolution: Resolution, assets: readonly Asset[], draft: Draft, target: ProjectEditTarget): Promise<ProjectCommit> {
  const plan = planProjectEdit(resolution, draft, target);
  const assetById = new Map(assets.map(a => [a.id, a]));
  const placed = new Map(resolution.placed.map(p => [p.instance.id, p]));
  const outAssets = new Map<string, Asset>(), versions: AssetVersion[] = [], ops: Operation[] = [], warnings: CommitWarning[] = [...plan.warnings];
  for (const step of plan.perInstance) {
    const p = placed.get(step.instanceId)!, version = p.version;
    const asset = outAssets.get(version.assetId) ?? assetById.get(version.assetId);
    if (!asset) throw new DomainError('NOT_FOUND', `Bauteil zu ${step.instanceName} fehlt in der Bibliothek`);
    const local = applyEdit(createDraft(version.payload), { label: 'Projekt', changes: step.changes }).draft;
    if (!local.overlay.size) continue;
    const payload = materializeDraft(local);
    if (!payload) {
      warnings.push({ code: 'INSTANCE_EMPTY', message: `${step.instanceName}: alle Zellen entfernt, die Instanz wird aus dem Projekt genommen.` });
      ops.push({ kind: 'instance.remove', instanceId: step.instanceId });
      continue;
    }
    const r = await addAssetVersion(asset, { payload, connectors: version.connectors, source: { format: 'editor', editedFrom: version.id, localTo: project.id } });
    outAssets.set(asset.id, r.asset); versions.push(r.version);
    warnings.push(...connectorWarnings(payload, version).map(w => ({ ...w, message: `${step.instanceName}: ${w.message}` })));
    ops.push({ kind: 'instance.update', instanceId: step.instanceId, assetVersionId: r.version.id });
  }
  if (plan.loose.length) {
    const d = applyEdit(createDraft(null, resolution.world?.profileId ?? project.profileId), { label: 'Eigene Blöcke', changes: plan.loose }).draft;
    const payload = materializeDraft(d);
    if (payload) {
      const name = (target.newName ?? '').trim() || `Eigene Blöcke · ${project.name}`.slice(0, 120);
      const r = await addAssetVersion(createAsset({ name, description: `Im Blockeditor von „${project.name}“ gesetzte Blöcke.`, tags: ['eigenbau'], provenance: EDITOR_PROVENANCE }),
        { payload, label: '1.0', source: { format: 'editor' } });
      outAssets.set(r.asset.id, r.asset); versions.push(r.version);
      // Pivot = bounds.min and position = pivot place every cell at its world coordinate.
      const instance: Instance = newInstance({ assetVersionId: r.version.id, name, transform: { position: payload.pivot, quarterTurns: 0, mirrorX: false } });
      ops.push({ kind: 'instance.add', instance });
    }
  }
  return { assets: [...outAssets.values()], versions, operation: ops.length ? { kind: 'batch', label: 'Blöcke bearbeitet', operations: ops } : null, warnings };
}
