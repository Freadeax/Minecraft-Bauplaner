import type { GuideProgress, Guide } from './guide.js';
import { canonicalJson, newId, quickHash } from './hash.js';
import type { Operation } from './project.js';
import { sectionOfStep } from './sectionMembership.js';
import type { SitePlan, SiteSection } from './site.js';
import { DomainError } from './types.js';
import type { AssetVersion, ConnectorLink, Instance, Project, StepProgress } from './types.js';

/**
 * Abschnittsstände (BACKUP-02-S02). A build section can be frozen: the
 * snapshot keeps its definition, full copies of the member instances (fixed,
 * immutable asset versions and discrete transforms), the links between them
 * and every guide step that belonged to the section with its geometry hash and
 * tick state. That is enough to reproduce the section geometry later, compare
 * it with the current plan and find it again after the section was edited or
 * removed.
 *
 * Nothing changes a frozen section silently: snapshots are never rewritten,
 * every difference to the current state is reported (`compareSnapshot`), and
 * going back is an explicit, previewed and undoable operation
 * (`planSnapshotRestore`). Snapshots live in `project.site.snapshots`, so they
 * travel with project backups.
 */

export const MAX_SNAPSHOTS = 200;
const MAX_SNAPSHOT_STEPS = 20_000;

export interface SnapshotStep {
  readonly id: string;
  readonly instanceId: string;
  readonly layer: number;
  readonly geometryHash: string;
  readonly blocks: number;
  /** Tick state when frozen (manual progress, never an in-game measurement). */
  readonly status: 'open' | 'done' | 'review';
}

export interface SectionSnapshot {
  readonly id: string;
  readonly sectionId: string;
  /** 1-based, per section, never reused. */
  readonly number: number;
  readonly label: string;
  readonly createdAt: string;
  /** Section definition at freeze time (name, note, members). */
  readonly section: SiteSection;
  /** Position of the section in the build order at freeze time (0-based). */
  readonly order: number;
  /** Full copies of the member instances. */
  readonly instances: readonly Instance[];
  /** Links whose both ends are member instances. */
  readonly links: readonly ConnectorLink[];
  readonly steps: readonly SnapshotStep[];
  readonly totals: { readonly steps: number; readonly done: number; readonly review: number; readonly blocks: number; readonly blocksDone: number };
  /** Change detector over members, placements and step geometry (not over names or ticks). */
  readonly fingerprint: string;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const fail = (message: string): never => { throw new DomainError('SITE', `Abschnittsstand: ${message}`); };
const str = (v: unknown, max: number, what: string): string => {
  if (typeof v !== 'string' || !v || v.length > max) fail(`${what} ungültig`);
  return v as string;
};
const int = (v: unknown, min: number, what: string): number => {
  if (!Number.isInteger(v) || (v as number) < min) fail(`${what} ungültig`);
  return v as number;
};

const placementKey = (i: Instance) => canonicalJson({ v: i.assetVersionId, t: i.transform, o: i.override });

/** Fingerprint over what decides the section geometry: members, placements, steps. */
export function snapshotFingerprint(section: Pick<SiteSection, 'members'>, instances: readonly Instance[], steps: readonly Pick<SnapshotStep, 'id' | 'geometryHash'>[]): string {
  const members = section.members.map(m => [m.instanceId, m.fromLayer ?? 0, m.toLayer ?? null]);
  const placed = [...instances].sort((a, b) => a.id < b.id ? -1 : 1).map(i => [i.id, placementKey(i)]);
  return quickHash(canonicalJson({ members, placed, steps: steps.map(s => [s.id, s.geometryHash]) }));
}

/** Structural validation of stored snapshots (called by checkSite). */
export function checkSnapshots(raw: unknown): readonly SectionSnapshot[] {
  if (!Array.isArray(raw) || raw.length > MAX_SNAPSHOTS) return fail(`höchstens ${MAX_SNAPSHOTS} Abschnittsstände`);
  const ids = new Set<string>(), numbers = new Set<string>();
  for (const s of raw as unknown[]) {
    if (!isObj(s)) return fail('kein Objekt');
    const id = str(s.id, 64, 'ID'), sectionId = str(s.sectionId, 64, 'Abschnitts-ID');
    if (ids.has(id)) fail(`ID ${id} doppelt`);
    ids.add(id);
    const number = int(s.number, 1, 'Nummer'), key = `${sectionId}#${number}`;
    if (numbers.has(key)) fail(`Nummer ${number} für Abschnitt ${sectionId} doppelt`);
    numbers.add(key);
    if (typeof s.label !== 'string' || s.label.length > 200) fail('Bezeichnung zu lang');
    if (typeof s.createdAt !== 'string' || Number.isNaN(Date.parse(s.createdAt))) fail('Zeitpunkt ungültig');
    int(s.order, 0, 'Reihenfolge');
    const sec = s.section;
    if (!isObj(sec) || sec.id !== sectionId || typeof sec.name !== 'string' || !Array.isArray(sec.members)) fail('Abschnittsdefinition ungültig');
    if (!Array.isArray(s.instances) || !Array.isArray(s.links) || !Array.isArray(s.steps) || s.steps.length > MAX_SNAPSHOT_STEPS) fail('Inhalt ungültig');
    for (const i of s.instances as unknown[]) {
      if (!isObj(i) || typeof i.id !== 'string' || typeof i.assetVersionId !== 'string' || typeof i.name !== 'string' || typeof i.override !== 'boolean' || !isObj(i.transform)) fail('Bauteilkopie ungültig');
      const t = (i as { transform: Record<string, unknown> }).transform;
      if (!Array.isArray(t.position) || t.position.length !== 3 || !t.position.every(Number.isInteger) || ![0, 1, 2, 3].includes(t.quarterTurns as number) || typeof t.mirrorX !== 'boolean') fail('Platzierung ungültig');
    }
    for (const l of s.links as unknown[]) if (!isObj(l) || typeof l.id !== 'string' || !isObj(l.a) || !isObj(l.b)) fail('Verbindung ungültig');
    for (const st of s.steps as unknown[]) {
      if (!isObj(st) || typeof st.id !== 'string' || typeof st.instanceId !== 'string' || typeof st.geometryHash !== 'string' || !['open', 'done', 'review'].includes(st.status as string)) fail('Schritt ungültig');
      int((st as Record<string, unknown>).layer, 0, 'Schicht'); int((st as Record<string, unknown>).blocks, 0, 'Blockzahl');
    }
    const t = s.totals;
    if (!isObj(t) || !['steps', 'done', 'review', 'blocks', 'blocksDone'].every(k => Number.isInteger(t[k]) && (t[k] as number) >= 0)) fail('Summen ungültig');
    str(s.fingerprint, 64, 'Fingerabdruck');
  }
  return raw as SectionSnapshot[];
}

export const snapshotsOf = (site: Pick<SitePlan, 'snapshots'>, sectionId?: string): readonly SectionSnapshot[] =>
  (site.snapshots ?? []).filter(s => sectionId === undefined || s.sectionId === sectionId);
export const latestSnapshot = (site: Pick<SitePlan, 'snapshots'>, sectionId: string): SectionSnapshot | null =>
  snapshotsOf(site, sectionId).reduce<SectionSnapshot | null>((best, s) => !best || s.number > best.number ? s : best, null);

/** Steps that belong to a section under the current plan (first matching section wins). */
const stepsOfSection = (site: SitePlan, guide: Guide, sectionId: string) => guide.steps.filter(s => sectionOfStep(site, s) === sectionId);

export interface FreezeInput {
  readonly site: SitePlan;
  readonly project: Pick<Project, 'instances' | 'links'>;
  readonly guide: Guide;
  readonly progress: GuideProgress;
  readonly sectionId: string;
  readonly label: string;
  readonly at?: string;
  readonly id?: string;
}

/** Freezes the current state of one section. Returns the new site plan and the snapshot. */
export function freezeSection(input: FreezeInput): { site: SitePlan; snapshot: SectionSnapshot } {
  const { site, project, guide, progress, sectionId } = input;
  const order = site.sections.findIndex(s => s.id === sectionId), section = site.sections[order];
  if (!section) return fail(`Abschnitt ${sectionId} existiert nicht`);
  if ((site.snapshots?.length ?? 0) >= MAX_SNAPSHOTS) fail(`höchstens ${MAX_SNAPSHOTS} Stände je Projekt; bitte alte Stände löschen`);
  const memberIds = new Set(section.members.map(m => m.instanceId));
  const instances = project.instances.filter(i => memberIds.has(i.id)).map(i => structuredClone(i) as Instance);
  if (!instances.length) fail(`„${section.name}“ enthält keine vorhandenen Bauteile`);
  const steps: SnapshotStep[] = stepsOfSection(site, guide, sectionId).map(s => ({
    id: s.id, instanceId: s.instanceId, layer: s.layer, geometryHash: s.geometryHash, blocks: s.blocks, status: progress.status.get(s.id) ?? 'open',
  }));
  if (!steps.length) fail(`„${section.name}“ enthält keine Bauschritte`);
  const links = project.links.filter(l => memberIds.has(l.a.instanceId) && memberIds.has(l.b.instanceId)).map(l => structuredClone(l) as ConnectorLink);
  const totals = steps.reduce((t, s) => ({ steps: t.steps + 1, done: t.done + (s.status === 'done' ? 1 : 0), review: t.review + (s.status === 'review' ? 1 : 0),
    blocks: t.blocks + s.blocks, blocksDone: t.blocksDone + (s.status === 'done' ? s.blocks : 0) }), { steps: 0, done: 0, review: 0, blocks: 0, blocksDone: 0 });
  const number = Math.max(0, ...snapshotsOf(site, sectionId).map(s => s.number)) + 1;
  const snapshot: SectionSnapshot = {
    id: input.id ?? newId('snap'), sectionId, number, label: input.label.trim().slice(0, 200), createdAt: input.at ?? new Date().toISOString(),
    section: structuredClone(section) as SiteSection, order, instances, links, steps, totals,
    fingerprint: snapshotFingerprint(section, instances, steps),
  };
  return { site: { ...site, snapshots: [...(site.snapshots ?? []), snapshot] }, snapshot };
}

/** Removes one snapshot (explicit user action, undoable via site.set). */
export function deleteSnapshot(site: SitePlan, snapshotId: string): SitePlan {
  if (!snapshotsOf(site).some(s => s.id === snapshotId)) fail('Stand existiert nicht');
  const snapshots = snapshotsOf(site).filter(s => s.id !== snapshotId);
  const next: { -readonly [K in keyof SitePlan]: SitePlan[K] } = { ...site, snapshots };
  if (!snapshots.length) delete next.snapshots;
  return next;
}

export type SnapshotChangeKind = 'section-removed' | 'renamed' | 'note' | 'members' | 'instance-removed' | 'instance-version' | 'instance-transform' | 'instance-override' | 'steps-added' | 'steps-removed' | 'steps-geometry' | 'links';
export interface SnapshotChange { readonly kind: SnapshotChangeKind; readonly message: string; readonly instanceId?: string }

export interface SnapshotComparison {
  readonly snapshot: SectionSnapshot;
  /** same = geometry and membership identical (names, notes and ticks may differ). */
  readonly state: 'same' | 'changed' | 'section-removed';
  readonly changes: readonly SnapshotChange[];
  /** Cosmetic differences (name, note) that do not change the geometry. */
  readonly cosmetic: readonly SnapshotChange[];
  /** Progress since the freeze (manual ticks), shown separately from changes. */
  readonly progress: { readonly doneThen: number; readonly doneNow: number; readonly blocksDoneThen: number; readonly blocksDoneNow: number; readonly reviewNow: number };
  readonly fingerprintNow: string | null;
}

const transformText = (i: Instance) => `Position ${i.transform.position.join('/')}, ${i.transform.quarterTurns * 90}°${i.transform.mirrorX ? ', gespiegelt' : ''}`;

/** Compares a snapshot with the current plan. Every geometric difference is listed, nothing is hidden. */
export function compareSnapshot(snapshot: SectionSnapshot, input: Omit<FreezeInput, 'sectionId' | 'label' | 'at' | 'id'>): SnapshotComparison {
  const { site, project, guide, progress } = input;
  const current = site.sections.find(s => s.id === snapshot.sectionId);
  const changes: SnapshotChange[] = [], cosmetic: SnapshotChange[] = [];
  const thenName = snapshot.section.name;
  if (!current) {
    return { snapshot, state: 'section-removed', changes: [{ kind: 'section-removed', message: `Der Abschnitt „${thenName}“ wurde aus dem Plan entfernt. Der Stand bleibt erhalten und kann wiederhergestellt werden.` }],
      cosmetic, progress: { doneThen: snapshot.totals.done, doneNow: 0, blocksDoneThen: snapshot.totals.blocksDone, blocksDoneNow: 0, reviewNow: 0 }, fingerprintNow: null };
  }
  if (current.name !== thenName) cosmetic.push({ kind: 'renamed', message: `Umbenannt: „${thenName}“ → „${current.name}“.` });
  if ((current.note ?? '') !== (snapshot.section.note ?? '')) cosmetic.push({ kind: 'note', message: 'Notiz geändert.' });
  const memberKey = (m: SiteSection['members'][number]) => `${m.instanceId}:${m.fromLayer ?? 0}:${m.toLayer ?? '∞'}`;
  if (canonicalJson(current.members.map(memberKey).sort()) !== canonicalJson(snapshot.section.members.map(memberKey).sort()))
    changes.push({ kind: 'members', message: `Bauteile oder Schichtbereiche des Abschnitts geändert (damals ${snapshot.section.members.length}, jetzt ${current.members.length} Einträge).` });
  const now = new Map(project.instances.map(i => [i.id, i]));
  for (const then of snapshot.instances) {
    const i = now.get(then.id);
    if (!i) { changes.push({ kind: 'instance-removed', instanceId: then.id, message: `Bauteil „${then.name}“ ist nicht mehr im Projekt.` }); continue; }
    if (i.assetVersionId !== then.assetVersionId) changes.push({ kind: 'instance-version', instanceId: then.id, message: `„${i.name}“ nutzt eine andere Bauteilversion (${then.assetVersionId} → ${i.assetVersionId}).` });
    if (canonicalJson(i.transform) !== canonicalJson(then.transform)) changes.push({ kind: 'instance-transform', instanceId: then.id, message: `„${i.name}“ wurde verschoben oder gedreht (${transformText(then)} → ${transformText(i)}).` });
    if (i.override !== then.override) changes.push({ kind: 'instance-override', instanceId: then.id, message: `„${i.name}“: Vorrang bei Überschneidungen ${i.override ? 'eingeschaltet' : 'ausgeschaltet'}.` });
  }
  const memberIds = new Set(snapshot.instances.map(i => i.id));
  const linksNow = project.links.filter(l => memberIds.has(l.a.instanceId) && memberIds.has(l.b.instanceId)).map(l => l.id).sort();
  if (canonicalJson(linksNow) !== canonicalJson(snapshot.links.map(l => l.id).sort())) changes.push({ kind: 'links', message: 'Verbindungen zwischen den Bauteilen des Abschnitts geändert.' });
  const stepsNow = stepsOfSection(site, guide, snapshot.sectionId);
  const nowById = new Map(stepsNow.map(s => [s.id, s])), thenById = new Map(snapshot.steps.map(s => [s.id, s]));
  const added = stepsNow.filter(s => !thenById.has(s.id)).length, removed = snapshot.steps.filter(s => !nowById.has(s.id)).length;
  const geometry = snapshot.steps.filter(s => { const n = nowById.get(s.id); return n && n.geometryHash !== s.geometryHash; }).length;
  if (added) changes.push({ kind: 'steps-added', message: `${added} Bauschritt${added === 1 ? '' : 'e'} neu im Abschnitt.` });
  if (removed) changes.push({ kind: 'steps-removed', message: `${removed} Bauschritt${removed === 1 ? '' : 'e'} nicht mehr im Abschnitt.` });
  if (geometry) changes.push({ kind: 'steps-geometry', message: `${geometry} Bauschritt${geometry === 1 ? ' hat' : 'e haben'} andere Blöcke als im Stand.` });
  let doneNow = 0, blocksDoneNow = 0, reviewNow = 0;
  for (const s of stepsNow) { const st = progress.status.get(s.id) ?? 'open'; if (st === 'done') { doneNow++; blocksDoneNow += s.blocks; } else if (st === 'review') reviewNow++; }
  const fingerprintNow = snapshotFingerprint(current, project.instances.filter(i => current.members.some(m => m.instanceId === i.id)), stepsNow);
  // The fingerprint catches anything the itemised checks above might not name.
  if (!changes.length && fingerprintNow !== snapshot.fingerprint) changes.push({ kind: 'steps-geometry', message: 'Geometrie des Abschnitts weicht vom Stand ab.' });
  return { snapshot, state: changes.length ? 'changed' : 'same', changes, cosmetic,
    progress: { doneThen: snapshot.totals.done, doneNow, blocksDoneThen: snapshot.totals.blocksDone, blocksDoneNow, reviewNow }, fingerprintNow };
}

export interface SnapshotRestorePlan {
  /** Undoable batch; null when nothing needs to change or the restore is blocked. */
  readonly operation: Operation | null;
  /** What the restore will do, one line per action. */
  readonly actions: readonly string[];
  /** Reasons the restore cannot run (e.g. an asset version is missing locally). */
  readonly blocked: readonly string[];
  /** Effects outside the section the user should know about. */
  readonly warnings: readonly string[];
}

/**
 * Plans going back to a snapshot: section definition (name, note, members;
 * re-inserted at its old position when it was removed), member instances back
 * to their frozen version, transform and override, removed member instances
 * and their links re-added. Ticks are not touched. Other instances and
 * sections stay as they are; when a member instance is also used by other
 * sections, that is listed as a warning.
 */
export function planSnapshotRestore(snapshot: SectionSnapshot, site: SitePlan, project: Pick<Project, 'instances' | 'links'>, versions: ReadonlyMap<string, AssetVersion>): SnapshotRestorePlan {
  const actions: string[] = [], blocked: string[] = [], warnings: string[] = [], ops: Operation[] = [];
  const now = new Map(project.instances.map(i => [i.id, i]));
  for (const then of snapshot.instances) {
    if (!versions.has(then.assetVersionId)) { blocked.push(`Bauteilversion ${then.assetVersionId} von „${then.name}“ fehlt lokal (Sicherung wiederherstellen).`); continue; }
    const i = now.get(then.id);
    if (!i) {
      ops.push({ kind: 'instance.add', instance: structuredClone(then) as Instance });
      actions.push(`„${then.name}“ wieder einfügen (${transformText(then)}).`);
      continue;
    }
    if (i.assetVersionId !== then.assetVersionId || i.override !== then.override) {
      ops.push({ kind: 'instance.update', instanceId: i.id, assetVersionId: then.assetVersionId, override: then.override });
      actions.push(`„${i.name}“ zurück auf ${i.assetVersionId !== then.assetVersionId ? `Version ${then.assetVersionId}` : ''}${i.assetVersionId !== then.assetVersionId && i.override !== then.override ? ' und ' : ''}${i.override !== then.override ? `Vorrang ${then.override ? 'an' : 'aus'}` : ''}.`);
    }
    if (canonicalJson(i.transform) !== canonicalJson(then.transform)) {
      ops.push({ kind: 'instance.transform', instanceId: i.id, transform: structuredClone(then.transform) });
      actions.push(`„${i.name}“ zurück an ${transformText(then)}.`);
    }
  }
  const linkIds = new Set(project.links.map(l => l.id)), afterIds = new Set([...project.instances.map(i => i.id), ...snapshot.instances.map(i => i.id)]);
  for (const l of snapshot.links) if (!linkIds.has(l.id) && afterIds.has(l.a.instanceId) && afterIds.has(l.b.instanceId)) {
    ops.push({ kind: 'link.add', link: structuredClone(l) as ConnectorLink });
    actions.push('Verbindung zwischen den Bauteilen wiederherstellen.');
  }
  const index = site.sections.findIndex(s => s.id === snapshot.sectionId), current = site.sections[index];
  const definitionChanged = !current || canonicalJson(current) !== canonicalJson(snapshot.section);
  if (definitionChanged) {
    const sections = [...site.sections];
    if (current) sections[index] = structuredClone(snapshot.section) as SiteSection;
    else sections.splice(Math.min(snapshot.order, sections.length), 0, structuredClone(snapshot.section) as SiteSection);
    ops.push({ kind: 'site.set', site: { ...site, sections }, label: `Abschnitt „${snapshot.section.name}“ auf Stand ${snapshot.number}` });
    actions.push(current ? `Abschnittsdefinition (Name, Notiz, Bauteile, Schichten) auf Stand ${snapshot.number}.` : `Abschnitt „${snapshot.section.name}“ an Position ${Math.min(snapshot.order, sections.length - 1) + 1} wieder anlegen.`);
  }
  const memberIds = new Set(snapshot.instances.map(i => i.id));
  const shared = site.sections.filter(s => s.id !== snapshot.sectionId && s.members.some(m => memberIds.has(m.instanceId)));
  if (shared.length && ops.some(o => o.kind !== 'site.set')) warnings.push(`Die Bauteile gehören auch zu ${shared.map(s => `„${s.name}“`).join(', ')}; deren Schritte ändern sich mit.`);
  if (ops.some(o => o.kind !== 'site.set')) warnings.push('Abgehakte Schritte bleiben, wie sie sind; Schritte mit anderer Geometrie werden als prüfbedürftig angezeigt.');
  if (blocked.length) return { operation: null, actions, blocked, warnings };
  return { operation: ops.length ? { kind: 'batch', label: `„${snapshot.section.name}“ auf Stand ${snapshot.number} zurückgesetzt`, operations: ops } : null, actions, blocked, warnings };
}

/**
 * Contents of a stand as a separate project (reproducible copy for building,
 * export or comparison): the frozen instances and links, one section, and the
 * ticks of steps that were done when frozen. Geometry hashes stay, so a step
 * whose blocks differ in the copy (e.g. a conflict with an instance outside
 * the section no longer applies) shows up as prüfbedürftig, never as silently done.
 */
export function snapshotProjectContent(snapshot: SectionSnapshot): { instances: Instance[]; links: ConnectorLink[]; site: SitePlan; progress: Record<string, StepProgress> } {
  const progress: Record<string, StepProgress> = {};
  for (const s of snapshot.steps) if (s.status === 'done') progress[s.id] = { status: 'done', geometryHash: s.geometryHash, at: snapshot.createdAt };
  return {
    instances: snapshot.instances.map(i => structuredClone(i) as Instance),
    links: snapshot.links.map(l => structuredClone(l) as ConnectorLink),
    site: { schemaVersion: 1, sections: [structuredClone(snapshot.section) as SiteSection], stock: {}, resolvedStock: [], recipeMethod: 'stonecutter', reservations: { defaultDepth: 3, overrides: {} } },
    progress,
  };
}
