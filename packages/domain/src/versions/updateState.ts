import { DomainError } from '../core/types.js';
import type { Asset, AssetVersion, Project } from '../core/types.js';

/**
 * Stored part of UPDATE-01 (pins and update log) without dependencies on the
 * project operations, so project.ts and backup.ts can validate it. Logic in
 * updates.ts.
 */
export type PatchPolicy = 'local' | 'upstream';
export const UPDATES_SCHEMA_VERSION = 1;
export const MAX_UPDATE_LOG = 200;
export const NOTE_MAX = 300;

export interface FrozenPin {
  /** Version the instance was pinned on. */
  readonly versionId: string;
  readonly at: string;
  readonly note: string;
}

export type UpdateKind = 'update' | 'return' | 'switch';
export const UPDATE_KIND_LABEL: Readonly<Record<UpdateKind, string>> = { update: 'Update', return: 'Zurückgekehrt', switch: 'Version gewechselt' };

export interface UpdateRecord {
  readonly id: string;
  readonly at: string;
  readonly kind: UpdateKind;
  readonly instanceId: string;
  readonly instanceName: string;
  readonly assetId: string;
  readonly fromVersionId: string;
  readonly toVersionId: string;
  readonly fromLabel: string;
  readonly toLabel: string;
  /** Local patch carried over: number of patched cells and how conflicts were decided. */
  readonly patch?: { readonly cells: number; readonly conflicts: number; readonly policy: PatchPolicy };
  /** Links removed because their connector no longer fits. */
  readonly removedLinks: number;
}

export interface UpdateState {
  readonly schemaVersion: 1;
  /** instanceId → pin. */
  readonly frozen: Readonly<Record<string, FrozenPin>>;
  /** Oldest first, at most MAX_UPDATE_LOG entries. */
  readonly log: readonly UpdateRecord[];
}

export const emptyUpdates = (): UpdateState => ({ schemaVersion: 1, frozen: {}, log: [] });
export const updatesOf = (project: Pick<Project, 'updates'>): UpdateState => project.updates ?? emptyUpdates();

const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const isTime = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v));
const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 200;
const bad = (what: string): never => { throw new DomainError('INVALID', `Updatestand: ${what}`); };

/** Structural check for stored, restored or incoming update state. */
export function checkUpdates(raw: unknown): UpdateState {
  if (!isObj(raw) || raw.schemaVersion !== UPDATES_SCHEMA_VERSION) bad('unbekanntes Schema');
  const r = raw as Record<string, unknown>;
  if (!isObj(r.frozen)) bad('Einfrierliste fehlt');
  for (const [id, pin] of Object.entries(r.frozen as Record<string, unknown>)) {
    if (!isId(id) || !isObj(pin) || !isId(pin.versionId) || !isTime(pin.at) || typeof pin.note !== 'string' || pin.note.length > NOTE_MAX) bad(`ungültige Einfrierung ${id}`);
  }
  if (!Array.isArray(r.log) || r.log.length > MAX_UPDATE_LOG) bad('Verlauf fehlt oder ist zu lang');
  const ids = new Set<string>();
  for (const raw of r.log as unknown[]) {
    if (!isObj(raw)) bad('ungültiger Verlaufseintrag');
    const e = raw as Record<string, unknown>;
    if ( !isId(e.id) || ids.has(e.id) || !isTime(e.at) || !Object.hasOwn(UPDATE_KIND_LABEL, e.kind as string)
      || !isId(e.instanceId) || typeof e.instanceName !== 'string' || !isId(e.assetId) || !isId(e.fromVersionId) || !isId(e.toVersionId)
      || typeof e.fromLabel !== 'string' || typeof e.toLabel !== 'string' || !Number.isSafeInteger(e.removedLinks) || (e.removedLinks as number) < 0) bad('ungültiger Verlaufseintrag');
    if (e.patch !== undefined) {
      const p = e.patch;
      if (!isObj(p) || !Number.isSafeInteger(p.cells) || !Number.isSafeInteger(p.conflicts) || (p.policy !== 'local' && p.policy !== 'upstream')) bad('ungültige Patchangabe');
    }
    ids.add(e.id as string);
  }
  return raw as unknown as UpdateState;
}


/** Version ids the update log can return to (kept in backups like revision versions). */
export function updateLogVersionIds(project: Pick<Project, 'updates'>): Set<string> {
  const out = new Set<string>();
  for (const e of updatesOf(project).log) { out.add(e.fromVersionId); out.add(e.toVersionId); }
  return out;
}


/**
 * Newest library release of an asset: the last stored version that is not a
 * local block change of some project (`source.localTo`). Used wherever "the
 * current version of a building" is meant (new instances, catalogue, Anlagen),
 * so a local change in one project never becomes the default elsewhere.
 * Falls back to the last version when every stored version is local.
 */
export function latestReleaseId(asset: Pick<Asset, 'versionIds'>, versions: ReadonlyMap<string, Pick<AssetVersion, 'source'>>): string | undefined {
  for (let i = asset.versionIds.length - 1; i >= 0; i--) {
    const v = versions.get(asset.versionIds[i]!);
    if (v && v.source.localTo === undefined) return asset.versionIds[i];
  }
  return asset.versionIds.at(-1);
}
