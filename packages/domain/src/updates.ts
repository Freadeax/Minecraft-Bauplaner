import { diffPayloads } from '../../voxel/src/diff.js';
import type { PayloadDiff } from '../../voxel/src/diff.js';
import { createPayload, stateKey } from '../../voxel/src/validation.js';
import type { BlockState, Cell, NbtTag, Vec3, VoxelPayload } from '../../voxel/src/types.js';
import { resolveProject } from './compose.js';
import type { Resolution } from './compose.js';
import { checkLinks } from './connectors.js';
import type { LinkState } from './connectors.js';
import { buildGuide, evaluateProgress } from './guide.js';
import type { StepStatus } from './guide.js';
import { canonicalJson, newId } from './hash.js';
import { addAssetVersion, deepFreeze, payloadHash } from './library.js';
import { applyOperation } from './project.js';
import type { Operation } from './project.js';
import { sectionOfStep } from './sectionMembership.js';
import { DomainError } from './types.js';
import { MAX_UPDATE_LOG, UPDATE_KIND_LABEL, checkUpdates, updatesOf } from './updateState.js';
import type { FrozenPin, PatchPolicy, UpdateKind, UpdateRecord, UpdateState } from './updateState.js';
import type { Asset, AssetVersion, Connector, Instance, Project } from './types.js';

/**
 * Kontrollierte Versionsupdates (UPDATE-01). An instance always references one
 * fixed AssetVersion; nothing here changes a project on its own. The module
 * finds newer versions, explains the consequences of a switch before it
 * happens (geometry, materials, connectors and links, build steps, sections,
 * voxel conflicts) and turns an explicit decision into ONE undoable project
 * operation. Local block changes made in a project (versions with
 * `source.localTo`) are carried onto the new version as a patch; where the new
 * version changed the same cell, the user decides which side wins.
 * Freezing pins an instance so no update is offered; the update log keeps the
 * previous version of every switch, so returning is always possible.
 */
export { UPDATES_SCHEMA_VERSION, MAX_UPDATE_LOG, UPDATE_KIND_LABEL, emptyUpdates, updatesOf, checkUpdates, updateLogVersionIds, latestReleaseId } from './updateState.js';
export type { FrozenPin, UpdateKind, UpdateRecord, UpdateState, PatchPolicy } from './updateState.js';
const NOTE_MAX = 300;

/** Drops pins of instances that no longer exist (the log stays complete). */
export function pruneUpdates(state: UpdateState, project: Pick<Project, 'instances'>): UpdateState {
  const ids = new Set(project.instances.map(i => i.id));
  return { ...state, frozen: Object.fromEntries(Object.entries(state.frozen).filter(([id]) => ids.has(id))) };
}

export function updatesOperation(next: UpdateState, label: string): Operation {
  return { kind: 'updates.set', updates: checkUpdates(next), label };
}

// ---------------------------------------------------------------------------
// Lineage: which versions count as updates

export interface UpdateLibrary { readonly assets: readonly Asset[]; readonly versions: ReadonlyMap<string, AssetVersion> }

/** A version created by a block edit inside a project (EDIT-02), not a library release. */
export const isLocalPatch = (v: Pick<AssetVersion, 'source'>): boolean => v.source.localTo !== undefined;

/**
 * Follows `editedFrom` through local patches to the library version the
 * local changes started from. `chain` lists the patch versions, newest first.
 */
export function patchBase(version: AssetVersion, versions: ReadonlyMap<string, AssetVersion>): { base: AssetVersion | null; chain: readonly AssetVersion[] } {
  const chain: AssetVersion[] = [];
  let v: AssetVersion | undefined = version;
  const seen = new Set<string>();
  while (v && isLocalPatch(v)) {
    if (seen.has(v.id)) return { base: null, chain };
    seen.add(v.id); chain.push(v);
    v = v.source.editedFrom ? versions.get(v.source.editedFrom) : undefined;
  }
  return { base: v ?? null, chain };
}

export type InstanceUpdateStatus = 'current' | 'available' | 'frozen' | 'missing';
export const UPDATE_STATUS_LABEL: Readonly<Record<InstanceUpdateStatus, string>> = {
  current: 'aktuell', available: 'Update verfügbar', frozen: 'eingefroren', missing: 'Version fehlt',
};

export interface InstanceUpdateInfo {
  readonly instance: Instance;
  readonly asset: Asset | null;
  readonly current: AssetVersion | null;
  /** Library version the instance stands on (the current version, or the start of its local patch). */
  readonly base: AssetVersion | null;
  /** The current version carries local block changes of a project. */
  readonly local: boolean;
  /** Library versions after `base`, oldest first. */
  readonly newer: readonly AssetVersion[];
  /** Library versions before `base`, oldest first (for switching back). */
  readonly older: readonly AssetVersion[];
  readonly frozen: FrozenPin | null;
  readonly status: InstanceUpdateStatus;
}

/** Update state of every instance, in project order. Never changes anything. */
export function findUpdates(project: Pick<Project, 'instances' | 'updates'>, library: UpdateLibrary): InstanceUpdateInfo[] {
  const assets = new Map(library.assets.map(a => [a.id, a]));
  const state = updatesOf(project);
  return project.instances.map((instance): InstanceUpdateInfo => {
    const current = library.versions.get(instance.assetVersionId) ?? null;
    const frozen = state.frozen[instance.id] ?? null;
    const asset = current ? assets.get(current.assetId) ?? null : null;
    if (!current || !asset) return { instance, asset, current, base: null, local: false, newer: [], older: [], frozen, status: 'missing' };
    const { base } = patchBase(current, library.versions);
    const releases = asset.versionIds.map(id => library.versions.get(id)).filter((v): v is AssetVersion => !!v && !isLocalPatch(v));
    const at = base ? releases.findIndex(v => v.id === base.id) : -1;
    const newer = at < 0 ? [] : releases.slice(at + 1), older = at < 0 ? [] : releases.slice(0, at);
    const status: InstanceUpdateStatus = frozen ? 'frozen' : newer.length ? 'available' : 'current';
    return { instance, asset, current, base, local: isLocalPatch(current), newer, older, frozen, status };
  });
}

export interface UpdateSummary { readonly available: number; readonly frozen: number; readonly local: number; readonly missing: number; readonly assets: number }
export function summarizeUpdates(infos: readonly InstanceUpdateInfo[]): UpdateSummary {
  const available = infos.filter(i => i.status === 'available');
  return {
    available: available.length, frozen: infos.filter(i => i.status === 'frozen').length, local: infos.filter(i => i.local).length,
    missing: infos.filter(i => i.status === 'missing').length, assets: new Set(available.map(i => i.asset!.id)).size,
  };
}

// ---------------------------------------------------------------------------
// Local patches

export const PATCH_POLICY_LABEL: Readonly<Record<PatchPolicy, string>> = {
  local: 'Eigene Änderung behalten', upstream: 'Neue Version übernehmen',
};

/** One selected cell, pivot-relative so placement is unchanged by bounds growth. */
export interface PatchCell { readonly kind: 'block' | 'air' | 'erase'; readonly state: BlockState | null; readonly entity: NbtTag | null }
export interface PatchConflict {
  /** Relative to the payload pivot. */
  readonly position: Vec3;
  readonly base: PatchCell | null;
  readonly local: PatchCell | null;
  readonly upstream: PatchCell | null;
}
export interface RebaseResult {
  /** New geometry; null when the result would be empty. */
  readonly payload: VoxelPayload | null;
  /** Cells the local patch changes against its base. */
  readonly patchCells: number;
  /** Patch cells written onto the new version. */
  readonly applied: number;
  /** Patch cells the new version already contains identically. */
  readonly already: number;
  /** Cells changed on both sides differently, sorted y, z, x. */
  readonly conflicts: readonly PatchConflict[];
}

const cellKey = (v: PatchCell | null): string => v === null ? '-' : `${v.kind}|${v.state ? stateKey(v.state) : ''}|${v.entity ? canonicalJson(v.entity) : ''}`;
const posKey = (p: Vec3): string => `${p[0]},${p[1]},${p[2]}`;

function cellMap(payload: VoxelPayload): Map<string, { p: Vec3; v: PatchCell }> {
  const [px, py, pz] = payload.pivot;
  const entities = new Map(payload.blockEntities.map(e => [posKey(e.position), e.data]));
  const out = new Map<string, { p: Vec3; v: PatchCell }>();
  for (const c of payload.cells) {
    const p: Vec3 = [c.position[0] - px, c.position[1] - py, c.position[2] - pz];
    const v: PatchCell = c.kind === 'erase' ? { kind: 'erase', state: null, entity: null }
      : { kind: c.kind, state: payload.palette[c.paletteIndex]!, entity: c.kind === 'block' ? entities.get(posKey(c.position)) ?? null : null };
    out.set(posKey(p), { p, v });
  }
  return out;
}

/**
 * Three-way merge of a local patch: the changes `local` made against `base`
 * are written onto `upstream`. A cell the new version left as in `base` takes
 * the local value; a cell the new version changed in the same way counts as
 * already present; a cell both sides changed differently is a conflict that
 * `policy` decides. Coordinates are relative to each payload's pivot, which is
 * the point instances are placed by.
 */
export function rebasePatch(base: VoxelPayload, local: VoxelPayload, upstream: VoxelPayload, policy: PatchPolicy): RebaseResult {
  const b = cellMap(base), l = cellMap(local), u = cellMap(upstream);
  const result = new Map(u);
  const conflicts: PatchConflict[] = [];
  let patchCells = 0, applied = 0, already = 0;
  for (const key of new Set([...b.keys(), ...l.keys()])) {
    const bv = b.get(key)?.v ?? null, lv = l.get(key)?.v ?? null;
    if (cellKey(bv) === cellKey(lv)) continue;
    patchCells++;
    const p = (l.get(key) ?? b.get(key))!.p;
    const uv = u.get(key)?.v ?? null;
    const write = () => { if (lv) result.set(key, { p, v: lv }); else result.delete(key); applied++; };
    if (cellKey(uv) === cellKey(lv)) { already++; continue; }
    if (cellKey(uv) === cellKey(bv)) { write(); continue; }
    conflicts.push({ position: p, base: bv, local: lv, upstream: uv });
    if (policy === 'local') write();
  }
  conflicts.sort((x, y) => x.position[1] - y.position[1] || x.position[2] - y.position[2] || x.position[0] - y.position[0]);
  return { payload: buildPayload(upstream, [...result.values()]), patchCells, applied, already, conflicts };
}

function buildPayload(like: VoxelPayload, entries: readonly { p: Vec3; v: PatchCell }[]): VoxelPayload | null {
  if (!entries.length) return null;
  const [px, py, pz] = like.pivot;
  const sorted = [...entries].sort((a, b) => a.p[1] - b.p[1] || a.p[2] - b.p[2] || a.p[0] - b.p[0]);
  const palette: BlockState[] = [], index = new Map<string, number>();
  const at = (s: BlockState): number => {
    const k = stateKey(s); let i = index.get(k);
    if (i === undefined) { i = palette.length; palette.push({ id: s.id, properties: { ...s.properties } }); index.set(k, i); }
    return i;
  };
  const min = [...like.bounds.min] as [number, number, number], max = [...like.bounds.maxExclusive] as [number, number, number];
  const cells: Cell[] = [], blockEntities: { position: Vec3; data: NbtTag }[] = [];
  for (const { p, v } of sorted) {
    const position: Vec3 = [p[0] + px, p[1] + py, p[2] + pz];
    for (const i of [0, 1, 2] as const) { min[i] = Math.min(min[i], position[i]); max[i] = Math.max(max[i], position[i] + 1); }
    if (v.kind === 'erase') cells.push({ position, kind: 'erase' });
    else {
      cells.push({ position, kind: v.kind, paletteIndex: at(v.state!) });
      if (v.entity) blockEntities.push({ position, data: v.entity });
    }
  }
  return createPayload({ schemaVersion: 1, profileId: like.profileId, bounds: { min, maxExclusive: max }, pivot: like.pivot, sourceOrigin: like.sourceOrigin, palette, cells, blockEntities });
}

/** Label of a rebased local version, e.g. "2.0 + lokal". */
export const localLabel = (target: Pick<AssetVersion, 'label'>): string => `${target.label} + lokal`.slice(0, 40);

// ---------------------------------------------------------------------------
// Comparison helpers

/**
 * Cell diff of two versions aligned at their pivots (the placement point), not
 * at their minimum corner: an extension on the west side is then reported as
 * added cells instead of shifting the whole building.
 */
export function diffVersions(a: VoxelPayload, b: VoxelPayload): PayloadDiff {
  return diffPayloads(...pivotAligned(a, b));
}

/** Both payloads with bounds widened to the same box around their pivots (cells unchanged), for pivot-aligned comparisons and previews. */
export function pivotAligned(a: VoxelPayload, b: VoxelPayload): [VoxelPayload, VoxelPayload] {
  const rel = (p: VoxelPayload, i: 0 | 1 | 2) => [p.bounds.min[i] - p.pivot[i], p.bounds.maxExclusive[i] - p.pivot[i]] as const;
  const lo = ([0, 1, 2] as const).map(i => Math.min(rel(a, i)[0], rel(b, i)[0])), hi = ([0, 1, 2] as const).map(i => Math.max(rel(a, i)[1], rel(b, i)[1]));
  const widen = (p: VoxelPayload): VoxelPayload => createPayload({ ...p, bounds: {
    min: [lo[0]! + p.pivot[0], lo[1]! + p.pivot[1], lo[2]! + p.pivot[2]], maxExclusive: [hi[0]! + p.pivot[0], hi[1]! + p.pivot[1], hi[2]! + p.pivot[2]] } });
  return [widen(a), widen(b)];
}

export type ConnectorChangeKind = 'added' | 'removed' | 'moved' | 'retyped';
export interface ConnectorChange { readonly id: string; readonly kind: ConnectorChangeKind; readonly before: Connector | null; readonly after: Connector | null }
export const CONNECTOR_CHANGE_LABEL: Readonly<Record<ConnectorChangeKind, string>> = { added: 'neu', removed: 'entfällt', moved: 'verschoben', retyped: 'Typ/Profil geändert' };

/** Connector changes by id, positions compared relative to the pivots. */
export function diffConnectors(a: Pick<AssetVersion, 'connectors' | 'payload'>, b: Pick<AssetVersion, 'connectors' | 'payload'>): ConnectorChange[] {
  const rel = (c: Connector, v: Pick<AssetVersion, 'payload'>) => [c.position[0] - v.payload.pivot[0], c.position[1] - v.payload.pivot[1], c.position[2] - v.payload.pivot[2], ...c.normal, ...c.up].join(',');
  const before = new Map(a.connectors.map(c => [c.id, c])), after = new Map(b.connectors.map(c => [c.id, c]));
  const out: ConnectorChange[] = [];
  for (const [id, c] of before) {
    const n = after.get(id);
    if (!n) out.push({ id, kind: 'removed', before: c, after: null });
    else if (c.type !== n.type || c.profile !== n.profile || (c.handedness ?? '') !== (n.handedness ?? '') || (c.maxLinks ?? 1) !== (n.maxLinks ?? 1)) out.push({ id, kind: 'retyped', before: c, after: n });
    else if (rel(c, a) !== rel(n, b)) out.push({ id, kind: 'moved', before: c, after: n });
  }
  for (const [id, c] of after) if (!before.has(id)) out.push({ id, kind: 'added', before: null, after: c });
  return out.sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
}

function blockTally(world: VoxelPayload | null): Map<string, number> {
  const out = new Map<string, number>();
  if (!world) return out;
  for (const c of world.cells) if (c.kind === 'block') { const id = world.palette[c.paletteIndex]!.id; out.set(id, (out.get(id) ?? 0) + 1); }
  return out;
}

// ---------------------------------------------------------------------------
// Update plan

export interface UpdateChoice {
  readonly instanceId: string;
  /** Library version to switch to (for a local patch: the version the patch is carried onto). */
  readonly targetVersionId: string;
  /** Carry local block changes over (default true when the instance has some). */
  readonly keepLocal?: boolean;
}

export interface InstanceUpdatePlan {
  readonly instanceId: string;
  readonly instanceName: string;
  readonly asset: Asset;
  readonly from: AssetVersion;
  /** Version the instance will reference: the target, or a new rebased local version. */
  readonly to: AssetVersion;
  readonly target: AssetVersion;
  readonly kind: UpdateKind;
  readonly geometry: PayloadDiff;
  readonly connectors: readonly ConnectorChange[];
  readonly rebase: RebaseResult | null;
}

export interface LinkChange { readonly linkId: string; readonly label: string; readonly before: LinkState; readonly after: LinkState }
export interface StepChange { readonly stepId: string; readonly label: string; readonly section: string | null; readonly before: StepStatus; readonly after: StepStatus | 'entfällt' }
export interface MaterialChange { readonly id: string; readonly before: number; readonly after: number }

export interface UpdatePlan {
  readonly instances: readonly InstanceUpdatePlan[];
  /** Project-wide block counts by id, largest change first; unchanged omitted. */
  readonly materials: readonly MaterialChange[];
  readonly blocksBefore: number;
  readonly blocksAfter: number;
  /** Links whose state changes; links that stop fitting are removed by the operation. */
  readonly links: readonly LinkChange[];
  readonly removedLinkIds: readonly string[];
  /** Ticked build steps whose status changes (done → review or gone). */
  readonly steps: readonly StepChange[];
  /** Steps that only exist after the update (new layers or phases), still open. */
  readonly openedSteps: number;
  /** Section names that contain affected ticked steps. */
  readonly sections: readonly string[];
  readonly conflictsBefore: number;
  readonly conflictsAfter: number;
  /** Instance names involved in conflicts that only exist after the update. */
  readonly newConflictsWith: readonly string[];
  readonly exportBlockersBefore: readonly string[];
  readonly exportBlockersAfter: readonly string[];
  /** Plain sentences for things the user must know before deciding. */
  readonly warnings: readonly string[];
}

export interface PreparedUpdate {
  readonly plan: UpdatePlan;
  /** New immutable rebased versions and their assets, to be stored before `operation` runs. */
  readonly assets: readonly Asset[];
  readonly versions: readonly AssetVersion[];
  /** One batch: instance updates, removal of broken links, log entry. */
  readonly operation: Operation;
  /** The project after the operation (for previews; not stored). */
  readonly after: Project;
}

export interface PrepareOptions {
  readonly policy?: PatchPolicy;
  readonly at?: string;
  /** Resolution of the current project when already computed. */
  readonly before?: Resolution;
}

const linkLabel = (project: Project, l: Project['links'][number]): string => {
  const name = (id: string) => project.instances.find(i => i.id === id)?.name ?? id;
  return `${name(l.a.instanceId)} · ${l.a.connectorId} ↔ ${name(l.b.instanceId)} · ${l.b.connectorId}`;
};

/**
 * Builds the complete consequences of the chosen switches. Pure apart from
 * hashing new rebased versions; storing and executing stay with the caller.
 * Frozen instances are refused: unfreeze first, that is a separate decision.
 */
export async function prepareUpdate(project: Project, library: UpdateLibrary, choices: readonly UpdateChoice[], options: PrepareOptions = {}): Promise<PreparedUpdate> {
  if (!choices.length) throw new DomainError('INVALID', 'Keine Instanz für das Update gewählt');
  const policy = options.policy ?? 'local', at = options.at ?? new Date().toISOString();
  const state = updatesOf(project);
  const infos = new Map(findUpdates(project, library).map(i => [i.instance.id, i]));
  const assetsOut = new Map<string, Asset>(), versionsOut: AssetVersion[] = [];
  const rebased = new Map<string, AssetVersion>();
  const versions = new Map(library.versions);
  const plans: InstanceUpdatePlan[] = [];
  const seen = new Set<string>();
  for (const choice of choices) {
    if (seen.has(choice.instanceId)) throw new DomainError('DUPLICATE', 'Instanz doppelt gewählt');
    seen.add(choice.instanceId);
    const info = infos.get(choice.instanceId);
    if (!info) throw new DomainError('NOT_FOUND', `Instanz ${choice.instanceId} existiert nicht`);
    if (info.frozen) throw new DomainError('FROZEN', `${info.instance.name} ist eingefroren. Erst freigeben, dann aktualisieren.`);
    if (!info.current || !info.asset) throw new DomainError('NOT_FOUND', `${info.instance.name}: aktuelle Version fehlt in der Bibliothek`);
    const target = library.versions.get(choice.targetVersionId);
    if (!target || target.assetId !== info.asset.id) throw new DomainError('INVALID', `${info.instance.name}: Zielversion gehört nicht zu diesem Bauteil`);
    let to = target, rebase: RebaseResult | null = null;
    const keepLocal = choice.keepLocal ?? true;
    if (info.local && keepLocal && !isLocalPatch(target)) {
      if (!info.base) throw new DomainError('NOT_FOUND', `${info.instance.name}: Ausgangsversion der lokalen Änderung fehlt`);
      if (target.id !== info.base.id) {
        rebase = rebasePatch(info.base.payload, info.current.payload, target.payload, policy);
        if (!rebase.payload) throw new DomainError('EMPTY', `${info.instance.name}: Ergebnis wäre leer`);
        const cacheKey = `${info.current.id}>${target.id}>${policy}`;
        const cached = rebased.get(cacheKey);
        if (cached) to = cached;
        else {
          const asset = assetsOut.get(info.asset.id) ?? info.asset;
          // The same rebase may already be stored (identical label and content): reuse it.
          const hash = await payloadHash(rebase.payload);
          const existing = asset.versionIds.map(id => versions.get(id)).find(v => v && v.label === localLabel(target) && v.payloadHash === hash
            && v.source.editedFrom === target.id && canonicalJson(v.connectors) === canonicalJson(target.connectors));
          if (existing) to = existing;
          else {
            const r = await addAssetVersion(asset, { payload: rebase.payload, label: localLabel(target), connectors: target.connectors,
              source: { format: 'editor', editedFrom: target.id, localTo: info.current.source.localTo ?? project.id } });
            assetsOut.set(asset.id, r.asset); versionsOut.push(r.version); versions.set(r.version.id, r.version); to = r.version;
          }
          rebased.set(cacheKey, to);
        }
      }
    }
    if (to.id === info.current.id) throw new DomainError('INVALID', `${info.instance.name} steht bereits auf ${to.label}`);
    const lastReturn = [...state.log].reverse().find(e => e.instanceId === info.instance.id);
    const kind: UpdateKind = lastReturn && lastReturn.fromVersionId === to.id ? 'return' : info.newer.some(v => v.id === target.id) ? 'update' : 'switch';
    plans.push({ instanceId: info.instance.id, instanceName: info.instance.name, asset: assetsOut.get(info.asset.id) ?? info.asset, from: info.current, to, target, kind,
      geometry: diffVersions(info.current.payload, to.payload), connectors: diffConnectors(info.current, to), rebase });
  }
  // Project consequences: one batch with every switch, then compare.
  const switches: Operation[] = plans.map(p => ({ kind: 'instance.update', instanceId: p.instanceId, assetVersionId: p.to.id }));
  const switched = applyOperation(project, { kind: 'batch', label: 'Vorschau', operations: switches }).project;
  const linksBefore = new Map(checkLinks(project, versions).map(s => [s.link.id, s.state]));
  const linksAfterAll = checkLinks(switched, versions);
  const links: LinkChange[] = [], removedLinkIds: string[] = [];
  for (const s of linksAfterAll) {
    const before = linksBefore.get(s.link.id) ?? 'ok';
    if (before === s.state) continue;
    links.push({ linkId: s.link.id, label: linkLabel(project, s.link), before, after: s.state });
    if (before === 'ok') removedLinkIds.push(s.link.id);
  }
  const before = options.before ?? resolveProject(project, versions);
  const after = resolveProject(switched, versions);
  const gBefore = buildGuide(project, before), gAfter = buildGuide(switched, after);
  const pBefore = evaluateProgress(gBefore, project.progress), pAfter = evaluateProgress(gAfter, project.progress);
  const steps: StepChange[] = [];
  const sections = new Set<string>();
  const site = project.site;
  for (const step of gBefore.steps) {
    const was = pBefore.status.get(step.id);
    if (was !== 'done' && was !== 'review') continue;
    const now = pAfter.status.get(step.id) ?? 'entfällt';
    if (now === was) continue;
    const sectionId = site ? sectionOfStep(site, step) : null;
    const section = sectionId ? site!.sections.find(s => s.id === sectionId)?.name ?? null : null;
    if (section) sections.add(section);
    steps.push({ stepId: step.id, label: `${step.sectionName} · Ebene ${step.layer + 1}`, section, before: was, after: now });
  }
  const tb = blockTally(before.world), ta = blockTally(after.world);
  const materials = [...new Set([...tb.keys(), ...ta.keys()])].map(id => ({ id, before: tb.get(id) ?? 0, after: ta.get(id) ?? 0 }))
    .filter(m => m.before !== m.after).sort((x, y) => Math.abs(y.after - y.before) - Math.abs(x.after - x.before) || (x.id < y.id ? -1 : 1));
  const key = (c: { position: Vec3 }) => posKey(c.position);
  const oldConflicts = new Set(before.conflicts.map(key));
  const names = new Set<string>();
  for (const c of after.conflicts) if (!oldConflicts.has(key(c))) for (const id of c.instanceIds) {
    const n = switched.instances.find(i => i.id === id)?.name; if (n) names.add(n);
  }
  const warnings: string[] = [];
  for (const p of plans) {
    if (p.rebase?.conflicts.length) warnings.push(`${p.instanceName}: ${p.rebase.conflicts.length} Zelle(n) wurden lokal und in ${p.target.label} unterschiedlich geändert – entschieden: ${PATCH_POLICY_LABEL[policy]}.`);
    if (p.from.payload.profileId !== p.to.payload.profileId) warnings.push(`${p.instanceName}: Versionsprofil wechselt von ${p.from.payload.profileId} zu ${p.to.payload.profileId}.`);
    if (p.asset.archived) warnings.push(`${p.asset.name} ist archiviert.`);
  }
  if (removedLinkIds.length) warnings.push(`${removedLinkIds.length} Verbindung(en) passen danach nicht mehr und werden gelöst.`);
  const reservations = site ? Object.keys(site.reservations.overrides).filter(k => {
    const [inst, conn] = k.split('/');
    const p = plans.find(x => x.instanceId === inst);
    return !!p && !p.to.connectors.some(c => c.id === conn);
  }) : [];
  if (reservations.length) warnings.push(`${reservations.length} Freiraum-Einstellung(en) der Baustelle gehören zu Anschlüssen, die es danach nicht mehr gibt.`);

  const records: UpdateRecord[] = plans.map(p => ({
    id: newId('upd'), at, kind: p.kind, instanceId: p.instanceId, instanceName: p.instanceName, assetId: p.asset.id,
    fromVersionId: p.from.id, toVersionId: p.to.id, fromLabel: p.from.label, toLabel: p.to.label,
    ...(p.rebase && { patch: { cells: p.rebase.patchCells, conflicts: p.rebase.conflicts.length, policy } }),
    removedLinks: removedLinkIds.filter(id => { const l = project.links.find(x => x.id === id)!; return l.a.instanceId === p.instanceId || l.b.instanceId === p.instanceId; }).length,
  }));
  const nextState: UpdateState = { ...state, log: [...state.log, ...records].slice(-MAX_UPDATE_LOG) };
  const label = plans.length === 1 ? `${UPDATE_KIND_LABEL[plans[0]!.kind]}: ${plans[0]!.instanceName} ${plans[0]!.from.label} → ${plans[0]!.to.label}` : `Update: ${plans.length} Instanzen`;
  const operation: Operation = { kind: 'batch', label, operations: [
    ...removedLinkIds.map(linkId => ({ kind: 'link.remove' as const, linkId })),
    ...switches,
    updatesOperation(nextState, 'Updateverlauf'),
  ] };
  const plan: UpdatePlan = deepFreeze({
    instances: plans, materials, blocksBefore: [...tb.values()].reduce((a, b) => a + b, 0), blocksAfter: [...ta.values()].reduce((a, b) => a + b, 0),
    links, removedLinkIds, steps, openedSteps: gAfter.steps.filter(s => !gBefore.byId.has(s.id)).length, sections: [...sections], conflictsBefore: before.conflicts.length, conflictsAfter: after.conflicts.length,
    newConflictsWith: [...names].sort(), exportBlockersBefore: before.exportBlockers, exportBlockersAfter: after.exportBlockers, warnings,
  });
  return { plan, assets: [...assetsOut.values()], versions: versionsOut, operation, after: applyOperation(project, operation).project };
}

// ---------------------------------------------------------------------------
// Freeze / return

/** Pins instances on their current version; frozen instances are never offered an update. */
export function freezeOperation(project: Project, instanceIds: readonly string[], note = '', at = new Date().toISOString()): Operation {
  const state = updatesOf(project), frozen = { ...state.frozen };
  const text = note.trim().slice(0, NOTE_MAX);
  let n = 0;
  for (const id of instanceIds) {
    const inst = project.instances.find(i => i.id === id);
    if (!inst) throw new DomainError('NOT_FOUND', `Instanz ${id} existiert nicht`);
    if (frozen[id]) continue;
    frozen[id] = { versionId: inst.assetVersionId, at, note: text }; n++;
  }
  if (!n) throw new DomainError('INVALID', 'Alle gewählten Instanzen sind bereits eingefroren');
  return updatesOperation(pruneUpdates({ ...state, frozen }, project), n === 1 ? 'Version eingefroren' : `${n} Versionen eingefroren`);
}

export function unfreezeOperation(project: Project, instanceIds: readonly string[]): Operation {
  const state = updatesOf(project), frozen = { ...state.frozen };
  let n = 0;
  for (const id of instanceIds) if (frozen[id]) { delete frozen[id]; n++; }
  if (!n) throw new DomainError('INVALID', 'Keine der gewählten Instanzen ist eingefroren');
  return updatesOperation({ ...state, frozen }, n === 1 ? 'Einfrierung aufgehoben' : `${n} Einfrierungen aufgehoben`);
}

/**
 * The choice that returns an instance to the version before its last switch.
 * null when there is nothing to return to (no log entry, instance changed
 * since, or the old version is no longer in the library).
 */
export function returnChoice(project: Pick<Project, 'instances' | 'updates'>, library: UpdateLibrary, instanceId: string): UpdateChoice | null {
  const inst = project.instances.find(i => i.id === instanceId);
  if (!inst) return null;
  const last = [...updatesOf(project).log].reverse().find(e => e.instanceId === instanceId);
  if (!last || last.toVersionId !== inst.assetVersionId || !library.versions.has(last.fromVersionId)) return null;
  // Returning restores the old version exactly, local changes included: no rebase.
  return { instanceId, targetVersionId: last.fromVersionId, keepLocal: false };
}
