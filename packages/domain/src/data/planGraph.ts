import type { Asset, AssetVersion, Project } from '../core/types.js';
import type { Collection, LibraryTemplate } from '../catalog/collections.js';
import { updatesOf } from '../versions/updateState.js';
import { programOf } from '../planning/program.js';
import { siteOf } from '../building/site.js';

/**
 * Verweisgraph des Planers (ARCH-02).
 *
 * One place that knows every reference between stored records: which project,
 * template, collection or version points at which asset, version, project or
 * original file, and why (role). Library, workshop, construction site, world
 * map, backups and the data check all ask this module instead of collecting
 * ids themselves, so a new reference (e.g. section snapshots) is added once and
 * is then known everywhere.
 *
 * `required` separates references without which the record cannot be shown or
 * exported (instances, revisions, update log, template members) from history
 * and convenience references (section snapshots, frozen pins, edit origin,
 * collection entries): those may dangle; the data check reports them as
 * warnings or hints, restoring a backup never fails because of them.
 *
 * Pure and read-only; nothing here repairs or deletes.
 */

export type PlanNodeKind = 'project' | 'asset' | 'version' | 'original' | 'collection' | 'template';
export interface PlanNodeRef { readonly kind: PlanNodeKind; readonly id: string }

export type PlanRole =
  | 'instance' | 'revision' | 'update-log' | 'pin' | 'section-snapshot' | 'scan' | 'terrain' | 'terrain-design'
  | 'version-list' | 'version-asset' | 'original-file' | 'edited-from' | 'local-to'
  | 'collection-asset' | 'collection-version' | 'collection-template' | 'collection-parent'
  | 'template-member' | 'project-after';

export interface PlanEdge {
  readonly from: PlanNodeRef;
  readonly to: PlanNodeRef;
  readonly role: PlanRole;
  readonly required: boolean;
  /** Short context, e.g. instance name, revision number or section snapshot label. */
  readonly detail?: string;
}

export const PLAN_ROLE_LABEL: Readonly<Record<PlanRole, string>> = {
  instance: 'platzierte Instanz', revision: 'eingefrorene Revision', 'update-log': 'Updateverlauf', pin: 'eingefrorene Version',
  'section-snapshot': 'Abschnittsstand', scan: 'Spielaufnahme', terrain: 'Geländeaufnahme', 'terrain-design': 'Geländegestaltung',
  'version-list': 'Versionsliste', 'version-asset': 'gehört zu Bauteil', 'original-file': 'Originaldatei', 'edited-from': 'bearbeitet aus', 'local-to': 'lokale Änderung in Projekt',
  'collection-asset': 'Sammlungseintrag', 'collection-version': 'Sammlung mit fester Version', 'collection-template': 'Vorlage in Sammlung', 'collection-parent': 'übergeordneter Ordner',
  'template-member': 'Vorlagenmitglied', 'project-after': 'beginnt erst nach',
};

export const PLAN_KIND_LABEL: Readonly<Record<PlanNodeKind, string>> = {
  project: 'Projekt', asset: 'Bauteil', version: 'Bauteilversion', original: 'Originaldatei', collection: 'Sammlung', template: 'Vorlage',
};

const edge = (from: PlanNodeRef, kind: PlanNodeKind, id: string, role: PlanRole, required: boolean, detail?: string): PlanEdge =>
  ({ from, to: { kind, id }, role, required, ...(detail !== undefined && { detail }) });

/** Every outgoing reference of a project. */
export function projectEdges(project: Project): PlanEdge[] {
  const from: PlanNodeRef = { kind: 'project', id: project.id }, out: PlanEdge[] = [];
  for (const i of project.instances) out.push(edge(from, 'version', i.assetVersionId, 'instance', true, i.name));
  for (const r of project.revisions) for (const i of r.instances) out.push(edge(from, 'version', i.assetVersionId, 'revision', true, `Revision ${r.number}`));
  const updates = updatesOf(project);
  for (const e of updates.log) {
    out.push(edge(from, 'version', e.fromVersionId, 'update-log', true, e.instanceName));
    out.push(edge(from, 'version', e.toVersionId, 'update-log', true, e.instanceName));
  }
  for (const [instanceId, pin] of Object.entries(updates.frozen)) out.push(edge(from, 'version', pin.versionId, 'pin', false, project.instances.find(i => i.id === instanceId)?.name ?? instanceId));
  for (const s of project.site?.snapshots ?? []) for (const i of s.instances) out.push(edge(from, 'version', i.assetVersionId, 'section-snapshot', false, `${s.section.name} · Stand ${s.number}`));
  for (const s of project.scanHistory ?? []) out.push(edge(from, 'original', s.sha256, 'scan', false, s.fileName));
  if (project.terrain) out.push(edge(from, 'original', project.terrain.sha256, 'terrain', false, project.terrain.fileName));
  // Geländegestaltung (TERRAIN-02) and the survey it was made on.
  const design = project.terrainDesign;
  if (design) {
    out.push(edge(from, 'original', design.sha256, 'terrain-design', false, design.fileName));
    if (design.base.kind === 'survey' && design.base.sha256 !== project.terrain?.sha256) out.push(edge(from, 'original', design.base.sha256, 'terrain', false, 'Grundlage der Geländegestaltung'));
  }
  // PROJ-04: order between projects (site.program.after). Planning only, so it may dangle.
  if (project.site) for (const a of programOf(siteOf(project)).after ?? []) out.push(edge(from, 'project', a.projectId, 'project-after', false, a.note));
  return out;
}

export function assetEdges(asset: Asset): PlanEdge[] {
  const from: PlanNodeRef = { kind: 'asset', id: asset.id };
  return asset.versionIds.map(id => edge(from, 'version', id, 'version-list', true));
}

export function versionEdges(version: AssetVersion): PlanEdge[] {
  const from: PlanNodeRef = { kind: 'version', id: version.id }, s = version.source;
  const out = [edge(from, 'asset', version.assetId, 'version-asset', true, version.label)];
  if (s.originalSha256) out.push(edge(from, 'original', s.originalSha256, 'original-file', false, s.fileName));
  if (s.editedFrom) out.push(edge(from, 'version', s.editedFrom, 'edited-from', false));
  if (s.localTo) out.push(edge(from, 'project', s.localTo, 'local-to', false));
  return out;
}

export function collectionEdges(collection: Collection): PlanEdge[] {
  const from: PlanNodeRef = { kind: 'collection', id: collection.id }, out: PlanEdge[] = [];
  if (collection.parentId) out.push(edge(from, 'collection', collection.parentId, 'collection-parent', false));
  for (const i of collection.items) {
    if (i.kind === 'asset') {
      out.push(edge(from, 'asset', i.assetId, 'collection-asset', false));
      if (i.versionId) out.push(edge(from, 'version', i.versionId, 'collection-version', false));
    } else if (i.kind === 'template') out.push(edge(from, 'template', i.templateId, 'collection-template', false));
    // Shipped ensembles are code, not stored records; resolveCollection reports unknown ones.
  }
  return out;
}

export function templateEdges(template: LibraryTemplate): PlanEdge[] {
  const from: PlanNodeRef = { kind: 'template', id: template.id }, out: PlanEdge[] = [];
  const seen = new Set<string>();
  // Current body: required (taking the template over needs it). History: may dangle.
  for (const [body, required, detail] of [[template.body, true, 'aktueller Stand'] as const, ...template.history.map(h => [h.body, false, `Stand ${h.number}`] as const)]) {
    if (body.kind !== 'ensemble') continue;
    for (const m of body.members) {
      const key = `${m.assetVersionId}|${m.id}|${String(required)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(edge(from, 'version', m.assetVersionId, 'template-member', required, `${m.name} (${detail})`));
    }
  }
  return out;
}

export interface PlanSource {
  readonly projects: readonly Project[];
  readonly assets: readonly Asset[];
  readonly versions: readonly AssetVersion[];
  readonly collections?: readonly Collection[];
  readonly templates?: readonly LibraryTemplate[];
  readonly originalHashes?: readonly string[];
}

export interface PlanGraph {
  readonly edges: readonly PlanEdge[];
  /** Number of stored records per kind (originals only when hashes were given). */
  readonly counts: Readonly<Record<PlanNodeKind, number>>;
  /** References whose target is not stored. Originals are only checked when hashes were given. */
  readonly dangling: readonly PlanEdge[];
  has(ref: PlanNodeRef): boolean;
  /** Incoming references of a record (who uses it), in source order. */
  usedBy(ref: PlanNodeRef): readonly PlanEdge[];
  /** Outgoing references of a record. */
  usesOf(ref: PlanNodeRef): readonly PlanEdge[];
}

const key = (r: PlanNodeRef) => `${r.kind}:${r.id}`;

export function buildPlanGraph(source: PlanSource): PlanGraph {
  const present = new Set<string>();
  const mark = (kind: PlanNodeKind, ids: Iterable<string>) => { for (const id of ids) present.add(`${kind}:${id}`); };
  mark('project', source.projects.map(p => p.id));
  mark('asset', source.assets.map(a => a.id));
  mark('version', source.versions.map(v => v.id));
  mark('collection', (source.collections ?? []).map(c => c.id));
  mark('template', (source.templates ?? []).map(t => t.id));
  if (source.originalHashes) mark('original', source.originalHashes);

  const edges: PlanEdge[] = [
    ...source.projects.flatMap(projectEdges), ...source.assets.flatMap(assetEdges), ...source.versions.flatMap(versionEdges),
    ...(source.collections ?? []).flatMap(collectionEdges), ...(source.templates ?? []).flatMap(templateEdges),
  ];
  const incoming = new Map<string, PlanEdge[]>(), outgoing = new Map<string, PlanEdge[]>();
  for (const e of edges) {
    const t = key(e.to), f = key(e.from);
    (incoming.get(t) ?? incoming.set(t, []).get(t)!).push(e);
    (outgoing.get(f) ?? outgoing.set(f, []).get(f)!).push(e);
  }
  const checkOriginals = source.originalHashes !== undefined;
  const dangling = edges.filter(e => !present.has(key(e.to)) && (e.to.kind !== 'original' || checkOriginals));
  return {
    edges, dangling,
    counts: {
      project: source.projects.length, asset: source.assets.length, version: source.versions.length,
      original: source.originalHashes?.length ?? 0, collection: source.collections?.length ?? 0, template: source.templates?.length ?? 0,
    },
    has: ref => present.has(key(ref)),
    usedBy: ref => incoming.get(key(ref)) ?? [],
    usesOf: ref => outgoing.get(key(ref)) ?? [],
  };
}

/** Distinct version ids a project refers to; `requiredOnly` keeps the set restore insists on. */
export function projectVersionIds(project: Project, requiredOnly = false): Set<string> {
  return new Set(projectEdges(project).filter(e => e.to.kind === 'version' && (!requiredOnly || e.required)).map(e => e.to.id));
}

export interface UsageGroup {
  readonly from: PlanNodeRef;
  readonly roles: readonly PlanRole[];
  readonly details: readonly string[];
}

/**
 * Who uses a record, grouped per using record (e.g. one entry per project with
 * all its roles). Versions of an asset are followed when `ref` is an asset, so
 * "Wo wird dieses Bauteil verwendet?" also finds projects that pin an old version.
 * The asset's own version list and the version→asset back reference are left out.
 */
export function whereUsed(graph: PlanGraph, ref: PlanNodeRef): UsageGroup[] {
  const targets: PlanNodeRef[] = [ref];
  if (ref.kind === 'asset') for (const e of graph.usesOf(ref)) if (e.role === 'version-list') targets.push(e.to);
  const groups = new Map<string, { from: PlanNodeRef; roles: Set<PlanRole>; details: Set<string> }>();
  for (const t of targets) for (const e of graph.usedBy(t)) {
    if (e.role === 'version-list' || e.role === 'version-asset') continue;
    if (e.from.kind === 'version' && e.role === 'edited-from' && ref.kind === 'asset' && targets.some(x => x.id === e.from.id)) continue;
    const k = key(e.from);
    const g = groups.get(k) ?? groups.set(k, { from: e.from, roles: new Set(), details: new Set() }).get(k)!;
    g.roles.add(e.role);
    if (e.detail) g.details.add(e.detail);
  }
  const order: Record<PlanNodeKind, number> = { project: 0, template: 1, collection: 2, version: 3, asset: 4, original: 5 };
  return [...groups.values()].sort((a, b) => order[a.from.kind] - order[b.from.kind] || (a.from.id < b.from.id ? -1 : 1))
    .map(g => ({ from: g.from, roles: [...g.roles], details: [...g.details] }));
}
