import type { Transform } from '../../voxel/src/types.js';
import { canonicalJson, newId } from './hash.js';
import { deepFreeze } from './library.js';
import { applyOperation, checkTransform, createProject, newInstance } from './project.js';
import { memberTransform } from './ensembles.js';
import type { Ensemble } from './ensembles.js';
import { SAMPLE_PROFILE } from './samples.js';
import { DomainError } from './types.js';
import type { Asset, AssetVersion, ConnectorLink, GeneratorSource, Project } from './types.js';

/**
 * Eigene Sammlungen und Vorlagen (LIB-02, LIB-03, Block B17).
 *
 * A collection is a user folder inside the one library: it only references
 * catalogue entries (assets, optionally pinned to one version), shipped
 * ensembles and own templates. Folders nest through `parentId`; a free-text
 * `category` groups top-level folders. Collections never copy geometry.
 *
 * A template is a reusable starting point the user saved: an own ensemble
 * (members pinned to fixed AssetVersions with a discrete transform, plus the
 * connector links between them) or a generator setting (generator id, its
 * algorithm version and normalised parameters). Taking a template over into a
 * project copies its members; editing the template later therefore never
 * touches a project created from it. Every edit keeps the previous state in a
 * bounded history, so it can be restored.
 *
 * Records are JSON-safe, carry `schemaVersion` and an optimistic storage
 * `revision` with the same contract as assets: the incoming revision is the
 * expected stored base, storage writes base + 1 or rejects the whole batch.
 */
export const LIBRARY_RECORD_SCHEMA = 1;
export const MAX_COLLECTION_DEPTH = 4;
export const MAX_COLLECTION_ITEMS = 2000;
export const MAX_TEMPLATE_MEMBERS = 500;
export const MAX_TEMPLATE_HISTORY = 20;

export type CollectionItem =
  /** A catalogue entry. Without versionId it follows the newest version; with it, that exact version is kept. */
  | { readonly kind: 'asset'; readonly assetId: string; readonly versionId?: string; readonly note?: string; readonly addedAt: string }
  | { readonly kind: 'ensemble'; readonly ensembleId: string; readonly note?: string; readonly addedAt: string }
  | { readonly kind: 'template'; readonly templateId: string; readonly note?: string; readonly addedAt: string };
export type CollectionItemKind = CollectionItem['kind'];

export interface Collection {
  readonly schemaVersion: 1;
  readonly id: string;
  /** Optimistic storage revision (0 = not stored yet). */
  readonly revision: number;
  readonly name: string;
  readonly description: string;
  /** Own category, free text; empty = "Ohne Kategorie". */
  readonly category: string;
  /** Parent folder; null = top level. A missing parent is shown at top level, never dropped. */
  readonly parentId: string | null;
  readonly items: readonly CollectionItem[];
  readonly archived: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TemplateMember {
  /** Stable id inside the template; links refer to it. */
  readonly id: string;
  readonly name: string;
  /** Fixed version, never "latest". */
  readonly assetVersionId: string;
  readonly transform: Transform;
  readonly override: boolean;
}
export type TemplateBody =
  /** Links use ConnectorLink with member ids in `instanceId`. */
  | { readonly kind: 'ensemble'; readonly members: readonly TemplateMember[]; readonly links: readonly ConnectorLink[] }
  | { readonly kind: 'generator'; readonly source: GeneratorSource };
export type TemplateKind = TemplateBody['kind'];

export type TemplateOrigin =
  | { readonly kind: 'project'; readonly projectId: string; readonly projectName: string }
  | { readonly kind: 'ensemble'; readonly ensembleId: string }
  | { readonly kind: 'generator'; readonly generatorId: string }
  | { readonly kind: 'template'; readonly templateId: string };

/** Earlier state of a template, newest last. */
export interface TemplateSnapshot {
  readonly number: number;
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly body: TemplateBody;
  readonly savedAt: string;
}

export interface LibraryTemplate {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly revision: number;
  /** Content state number, +1 per edit or restore (independent of storage revision). */
  readonly number: number;
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly body: TemplateBody;
  readonly origin?: TemplateOrigin;
  readonly history: readonly TemplateSnapshot[];
  readonly archived: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

const now = (): string => new Date().toISOString();
const fail = (message: string): never => { throw new DomainError('LIBRARY', message); };
const name120 = (raw: string, what: string): string => {
  const n = raw.trim();
  if (!n || n.length > 120) fail(`${what}: Name mit 1–120 Zeichen erforderlich`);
  return n;
};
const text = (raw: string | undefined, max: number, what: string): string => {
  const t = (raw ?? '').trim();
  if (t.length > max) fail(`${what}: höchstens ${max} Zeichen`);
  return t;
};
const cleanTags = (tags: readonly string[]): string[] => {
  const out = [...new Set(tags.map(t => t.trim()).filter(Boolean))];
  if (out.some(t => t.length > 40) || out.length > 40) fail('Tags: höchstens 40 Tags mit je 40 Zeichen');
  return out;
};

// ---------------------------------------------------------------------------
// Collections

export function createCollection(input: { name: string; description?: string; category?: string; parentId?: string | null; id?: string }): Collection {
  const at = now();
  return deepFreeze({
    schemaVersion: 1, id: input.id ?? newId('col'), revision: 0, name: name120(input.name, 'Sammlung'),
    description: text(input.description, 2000, 'Beschreibung'), category: text(input.category, 60, 'Kategorie'),
    parentId: input.parentId ?? null, items: [], archived: false, createdAt: at, updatedAt: at,
  });
}

export function updateCollection(c: Collection, patch: { name?: string; description?: string; category?: string; archived?: boolean }): Collection {
  return deepFreeze({
    ...c,
    ...(patch.name !== undefined && { name: name120(patch.name, 'Sammlung') }),
    ...(patch.description !== undefined && { description: text(patch.description, 2000, 'Beschreibung') }),
    ...(patch.category !== undefined && { category: text(patch.category, 60, 'Kategorie') }),
    ...(patch.archived !== undefined && { archived: patch.archived }),
    updatedAt: now(),
  });
}

/** Identity of an item inside one collection (an asset can appear once per pinned version). */
export function itemKey(item: CollectionItem): string {
  switch (item.kind) {
    case 'asset': return `asset:${item.assetId}@${item.versionId ?? '*'}`;
    case 'ensemble': return `ensemble:${item.ensembleId}`;
    case 'template': return `template:${item.templateId}`;
  }
}

type NewItem =
  | { readonly kind: 'asset'; readonly assetId: string; readonly versionId?: string; readonly note?: string }
  | { readonly kind: 'ensemble'; readonly ensembleId: string; readonly note?: string }
  | { readonly kind: 'template'; readonly templateId: string; readonly note?: string };

export function hasItem(c: Collection, item: NewItem): boolean {
  const key = itemKey({ ...item, addedAt: '' } as CollectionItem);
  return c.items.some(i => itemKey(i) === key);
}

/** Adds an item at the end; an item that is already there is left unchanged (returns the same record). */
export function addToCollection(c: Collection, item: NewItem): Collection {
  const full = { ...item, ...(item.note !== undefined && { note: text(item.note, 300, 'Notiz') }), addedAt: now() } as CollectionItem;
  checkItem(full, 'Sammlungseintrag');
  if (c.items.some(i => itemKey(i) === itemKey(full))) return c;
  if (c.items.length >= MAX_COLLECTION_ITEMS) fail(`Sammlung „${c.name}“: höchstens ${MAX_COLLECTION_ITEMS} Einträge`);
  return deepFreeze({ ...c, items: [...c.items, full], updatedAt: now() });
}

export function removeFromCollection(c: Collection, key: string): Collection {
  if (!c.items.some(i => itemKey(i) === key)) return c;
  return deepFreeze({ ...c, items: c.items.filter(i => itemKey(i) !== key), updatedAt: now() });
}

/** Moves an item by `delta` places (clamped). */
export function moveCollectionItem(c: Collection, key: string, delta: number): Collection {
  const from = c.items.findIndex(i => itemKey(i) === key);
  if (from < 0) return c;
  const to = Math.max(0, Math.min(c.items.length - 1, from + delta));
  if (to === from) return c;
  const items = [...c.items];
  const [moved] = items.splice(from, 1);
  items.splice(to, 0, moved!);
  return deepFreeze({ ...c, items, updatedAt: now() });
}

/** Changes the note of an item; empty text removes it. */
export function setItemNote(c: Collection, key: string, note: string): Collection {
  const clean = text(note, 300, 'Notiz');
  return deepFreeze({ ...c, items: c.items.map(i => {
    if (itemKey(i) !== key) return i;
    const { note: _old, ...rest } = i;
    return (clean ? { ...rest, note: clean } : rest) as CollectionItem;
  }), updatedAt: now() });
}

/**
 * Pins an asset item to a version (or releases the pin with null). The pinned
 * id must be one of the asset's versions. Fails when the target key exists.
 */
export function pinItemVersion(c: Collection, key: string, versionId: string | null, asset: Pick<Asset, 'id' | 'versionIds'>): Collection {
  const item = c.items.find(i => itemKey(i) === key);
  if (!item || item.kind !== 'asset' || item.assetId !== asset.id) return fail('Eintrag gehört nicht zu diesem Bauteil');
  if (versionId !== null && !asset.versionIds.includes(versionId)) fail('Version gehört nicht zu diesem Bauteil');
  const { versionId: _old, ...rest } = item;
  const next: CollectionItem = versionId === null ? rest : { ...rest, versionId };
  if (itemKey(next) !== key && c.items.some(i => itemKey(i) === itemKey(next))) fail('Diese Version ist bereits in der Sammlung');
  return deepFreeze({ ...c, items: c.items.map(i => itemKey(i) === key ? next : i), updatedAt: now() });
}

/** Ancestors of a collection, nearest first; stops at missing parents and cycles. */
export function ancestorsOf(all: readonly Collection[], id: string): Collection[] {
  const byId = new Map(all.map(c => [c.id, c])), out: Collection[] = [], seen = new Set([id]);
  let parent = byId.get(id)?.parentId ?? null;
  while (parent && !seen.has(parent)) {
    const p = byId.get(parent);
    if (!p) break;
    out.push(p); seen.add(parent); parent = p.parentId;
  }
  return out;
}

const subtreeHeight = (all: readonly Collection[], id: string): number => {
  const kids = all.filter(c => c.parentId === id && c.id !== id);
  return kids.length ? 1 + Math.max(...kids.map(k => subtreeHeight(all.filter(c => c.id !== id), k.id))) : 0;
};

/** Why a collection cannot move below `parentId`, or null when it can. */
export function moveProblem(all: readonly Collection[], id: string, parentId: string | null): string | null {
  if (parentId === null) return null;
  if (parentId === id) return 'Eine Sammlung kann nicht in sich selbst liegen.';
  if (!all.some(c => c.id === parentId)) return 'Zielordner gibt es nicht.';
  if (id && ancestorsOf(all, parentId).some(a => a.id === id)) return 'Eine Sammlung kann nicht in ihren eigenen Unterordner verschoben werden.';
  const depth = ancestorsOf(all, parentId).length + 2 + (id ? subtreeHeight(all, id) : 0);
  if (depth > MAX_COLLECTION_DEPTH) return `Höchstens ${MAX_COLLECTION_DEPTH} Ordnerebenen.`;
  return null;
}

export function moveCollection(all: readonly Collection[], c: Collection, parentId: string | null): Collection {
  const problem = moveProblem(all, c.id, parentId);
  if (problem) fail(problem);
  return c.parentId === parentId ? c : deepFreeze({ ...c, parentId, updatedAt: now() });
}

/**
 * Deleting a folder never deletes its contents implicitly: direct children
 * move up to the deleted folder's parent. Returns the children to store.
 */
export function collectionDeletion(all: readonly Collection[], id: string): { readonly children: readonly Collection[] } {
  const target = all.find(c => c.id === id);
  if (!target) return { children: [] };
  const at = now();
  return { children: all.filter(c => c.parentId === id && c.id !== id).map(c => deepFreeze({ ...c, parentId: target.parentId, updatedAt: at })) };
}

export interface CollectionNode {
  readonly collection: Collection;
  readonly depth: number;
  readonly children: readonly CollectionNode[];
  /** Items in this folder and all sub-folders (unique keys). */
  readonly totalItems: number;
}

const byName = (a: Collection, b: Collection) => a.name.localeCompare(b.name, 'de') || (a.id < b.id ? -1 : 1);

/**
 * Folder tree sorted by name. Records with a missing parent or a parent cycle
 * become top-level entries, so damaged data stays visible.
 */
export function collectionTree(all: readonly Collection[], options: { includeArchived?: boolean } = {}): CollectionNode[] {
  const list = options.includeArchived ? [...all] : all.filter(c => !c.archived);
  const ids = new Set(list.map(c => c.id));
  const rootOf = (c: Collection) => !c.parentId || !ids.has(c.parentId) || ancestorsOf(list, c.id).length === 0 || inCycle(list, c);
  const build = (c: Collection, depth: number, seen: Set<string>): CollectionNode => {
    const next = new Set(seen).add(c.id);
    const children = list.filter(k => k.parentId === c.id && !next.has(k.id) && !rootOf(k)).sort(byName).map(k => build(k, depth + 1, next));
    const keys = new Set(c.items.map(itemKey));
    for (const ch of children) for (const k of allKeys(ch)) keys.add(k);
    return { collection: c, depth, children, totalItems: keys.size };
  };
  return list.filter(rootOf).sort(byName).map(c => build(c, 0, new Set()));
}
function inCycle(all: readonly Collection[], c: Collection): boolean {
  const byId = new Map(all.map(x => [x.id, x])), seen = new Set<string>();
  let cur: Collection | undefined = c;
  while (cur?.parentId) {
    if (seen.has(cur.id)) return true;
    seen.add(cur.id); cur = byId.get(cur.parentId);
    if (cur?.id === c.id) return true;
  }
  return false;
}
function allKeys(node: CollectionNode): string[] {
  return [...node.collection.items.map(itemKey), ...node.children.flatMap(allKeys)];
}

/** Flat list in tree order (for selects), with depth. */
export function flattenTree(nodes: readonly CollectionNode[]): CollectionNode[] {
  return nodes.flatMap(n => [n, ...flattenTree(n.children)]);
}

/** Top-level folders grouped by category, categories sorted, "" (ohne Kategorie) last. */
export function groupByCategory(nodes: readonly CollectionNode[]): { readonly category: string; readonly nodes: readonly CollectionNode[] }[] {
  const groups = new Map<string, CollectionNode[]>();
  for (const n of nodes) { const k = n.collection.category; groups.set(k, [...(groups.get(k) ?? []), n]); }
  return [...groups].sort(([a], [b]) => (a === '') !== (b === '') ? (a === '' ? 1 : -1) : a.localeCompare(b, 'de')).map(([category, list]) => ({ category, nodes: list }));
}

/** Own categories in use, sorted. */
export function collectionCategories(all: readonly Collection[]): string[] {
  return [...new Set(all.map(c => c.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'));
}

export type ItemState = 'ok' | 'missing' | 'version-missing' | 'archived';
export interface ResolvedItem {
  readonly item: CollectionItem;
  readonly key: string;
  readonly state: ItemState;
  readonly label: string;
  /** Version shown for an asset item: the pinned one or the newest. */
  readonly version?: AssetVersion;
  readonly asset?: Asset;
  readonly template?: LibraryTemplate;
  readonly ensemble?: Ensemble;
  /** A pinned version that is no longer the newest one. */
  readonly outdated?: boolean;
}

export interface LibraryLookup {
  readonly assets: readonly Asset[];
  readonly versions: ReadonlyMap<string, AssetVersion>;
  readonly templates: readonly LibraryTemplate[];
  readonly ensembles: readonly Ensemble[];
}

/** Items with what they currently point to; dangling references are reported, never removed. */
export function resolveCollection(c: Collection, lookup: LibraryLookup): ResolvedItem[] {
  const assets = new Map(lookup.assets.map(a => [a.id, a]));
  const templates = new Map(lookup.templates.map(t => [t.id, t]));
  const ensembles = new Map(lookup.ensembles.map(e => [e.id, e]));
  return c.items.map((item): ResolvedItem => {
    const key = itemKey(item);
    if (item.kind === 'asset') {
      const asset = assets.get(item.assetId);
      if (!asset) return { item, key, state: 'missing', label: item.assetId };
      const latest = lookup.versions.get(asset.versionIds.at(-1) ?? '');
      if (item.versionId) {
        const pinned = asset.versionIds.includes(item.versionId) ? lookup.versions.get(item.versionId) : undefined;
        if (!pinned) return { item, key, state: 'version-missing', label: asset.name, asset, ...(latest && { version: latest }) };
        return { item, key, state: asset.archived ? 'archived' : 'ok', label: `${asset.name} · v${pinned.label}`, asset, version: pinned, outdated: pinned.id !== latest?.id };
      }
      if (!latest) return { item, key, state: 'version-missing', label: asset.name, asset };
      return { item, key, state: asset.archived ? 'archived' : 'ok', label: asset.name, asset, version: latest };
    }
    if (item.kind === 'ensemble') {
      const ensemble = ensembles.get(item.ensembleId);
      return ensemble ? { item, key, state: 'ok', label: ensemble.name, ensemble } : { item, key, state: 'missing', label: item.ensembleId };
    }
    const template = templates.get(item.templateId);
    return template ? { item, key, state: template.archived ? 'archived' : 'ok', label: template.name, template } : { item, key, state: 'missing', label: item.templateId };
  });
}

/** Collections that contain an asset, ensemble or template (any version for assets). */
export function collectionsWith(all: readonly Collection[], ref: { kind: 'asset'; assetId: string } | { kind: 'ensemble'; ensembleId: string } | { kind: 'template'; templateId: string }): Collection[] {
  return all.filter(c => c.items.some(i => i.kind === ref.kind && (
    (i.kind === 'asset' && ref.kind === 'asset' && i.assetId === ref.assetId) ||
    (i.kind === 'ensemble' && ref.kind === 'ensemble' && i.ensembleId === ref.ensembleId) ||
    (i.kind === 'template' && ref.kind === 'template' && i.templateId === ref.templateId))));
}

/** Asset ids in a collection and, optionally, its sub-folders (for the catalogue filter). */
export function assetIdsIn(all: readonly Collection[], id: string, deep = true): Set<string> {
  const out = new Set<string>(), seen = new Set<string>();
  const walk = (cid: string) => {
    if (seen.has(cid)) return;
    seen.add(cid);
    const c = all.find(x => x.id === cid);
    if (!c) return;
    for (const i of c.items) if (i.kind === 'asset') out.add(i.assetId);
    if (deep) for (const k of all) if (k.parentId === cid) walk(k.id);
  };
  walk(id);
  return out;
}

/** Version ids that collections pin explicitly (kept in backups). */
export function pinnedVersionIds(all: readonly Collection[]): Set<string> {
  return new Set(all.flatMap(c => c.items.flatMap(i => i.kind === 'asset' && i.versionId ? [i.versionId] : [])));
}

// ---------------------------------------------------------------------------
// Templates

function checkBody(body: TemplateBody): void {
  if (body.kind === 'generator') {
    const s = body.source;
    if (!s || typeof s.id !== 'string' || !s.id || !Number.isSafeInteger(s.version) || s.version < 1 || typeof s.params !== 'object' || s.params === null || Array.isArray(s.params))
      fail('Generatorvorlage: Generator, Algorithmusversion und Parameter erforderlich');
    for (const [k, v] of Object.entries(s.params)) if (!['number', 'string', 'boolean'].includes(typeof v) || (typeof v === 'number' && !Number.isFinite(v))) fail(`Generatorvorlage: Parameter ${k} ungültig`);
    return;
  }
  if (body.kind !== 'ensemble' || !Array.isArray(body.members) || !Array.isArray(body.links)) return fail('Vorlage: unbekannte Art');
  if (!body.members.length) fail('Ensemblevorlage: mindestens ein Bauteil erforderlich');
  if (body.members.length > MAX_TEMPLATE_MEMBERS) fail(`Ensemblevorlage: höchstens ${MAX_TEMPLATE_MEMBERS} Bauteile`);
  const ids = new Set<string>();
  for (const m of body.members) {
    if (!m || typeof m.id !== 'string' || !m.id || ids.has(m.id)) fail('Ensemblevorlage: fehlende oder doppelte Bauteil-ID');
    ids.add(m.id);
    if (typeof m.name !== 'string' || !m.name.trim() || m.name.length > 120) fail('Ensemblevorlage: Bauteilname mit 1–120 Zeichen erforderlich');
    if (typeof m.assetVersionId !== 'string' || !m.assetVersionId) fail(`Ensemblevorlage: ${m.name} ohne feste Version`);
    if (typeof m.override !== 'boolean') fail(`Ensemblevorlage: ${m.name} ohne Override-Angabe`);
    try { checkTransform(m.transform); } catch (e) { fail(`Ensemblevorlage: ${m.name}: ${e instanceof Error ? e.message : String(e)}`); }
  }
  const linkIds = new Set<string>();
  for (const l of body.links) {
    if (!l || typeof l.id !== 'string' || linkIds.has(l.id) || !ids.has(l.a?.instanceId) || !ids.has(l.b?.instanceId) || typeof l.a.connectorId !== 'string' || typeof l.b.connectorId !== 'string')
      fail('Ensemblevorlage: Verbindung verweist auf fehlendes Bauteil');
    linkIds.add(l.id);
  }
}

export function createTemplate(input: { name: string; description?: string; tags?: readonly string[]; body: TemplateBody; origin?: TemplateOrigin; id?: string }): LibraryTemplate {
  checkBody(input.body);
  const at = now();
  return deepFreeze({
    schemaVersion: 1, id: input.id ?? newId('tpl'), revision: 0, number: 1, name: name120(input.name, 'Vorlage'),
    description: text(input.description, 2000, 'Beschreibung'), tags: cleanTags(input.tags ?? []), body: structuredClone(input.body),
    ...(input.origin && { origin: structuredClone(input.origin) }), history: [], archived: false, createdAt: at, updatedAt: at,
  });
}

const snapshotOf = (t: LibraryTemplate): TemplateSnapshot => ({ number: t.number, name: t.name, description: t.description, tags: t.tags, body: t.body, savedAt: t.updatedAt });
const sameContent = (t: Pick<LibraryTemplate, 'name' | 'description' | 'tags' | 'body'>, u: Pick<LibraryTemplate, 'name' | 'description' | 'tags' | 'body'>) =>
  canonicalJson([t.name, t.description, t.tags, t.body]) === canonicalJson([u.name, u.description, u.tags, u.body]);

/**
 * Edits name, description, tags or body. The previous state goes into the
 * history (bounded, oldest dropped first); an edit without change returns the
 * same record. Projects created earlier are copies and stay unchanged.
 */
export function editTemplate(t: LibraryTemplate, patch: { name?: string; description?: string; tags?: readonly string[]; body?: TemplateBody }): LibraryTemplate {
  if (patch.body) checkBody(patch.body);
  const next = {
    name: patch.name !== undefined ? name120(patch.name, 'Vorlage') : t.name,
    description: patch.description !== undefined ? text(patch.description, 2000, 'Beschreibung') : t.description,
    tags: patch.tags !== undefined ? cleanTags(patch.tags) : t.tags,
    body: patch.body ? structuredClone(patch.body) : t.body,
  };
  if (sameContent(t, next)) return t;
  return deepFreeze({ ...t, ...next, number: t.number + 1, history: [...t.history, snapshotOf(t)].slice(-MAX_TEMPLATE_HISTORY), updatedAt: now() });
}

/** Makes an earlier state current again; the current state is kept in the history too. */
export function restoreTemplateSnapshot(t: LibraryTemplate, number: number): LibraryTemplate {
  const snap = t.history.find(s => s.number === number);
  if (!snap) return fail(`Vorlage „${t.name}“: Stand ${number} ist nicht mehr gespeichert`);
  if (sameContent(t, snap)) return t;
  return deepFreeze({ ...t, name: snap.name, description: snap.description, tags: snap.tags, body: snap.body, number: t.number + 1,
    history: [...t.history, snapshotOf(t)].slice(-MAX_TEMPLATE_HISTORY), updatedAt: now() });
}

export function archiveTemplate(t: LibraryTemplate, archived: boolean): LibraryTemplate {
  return t.archived === archived ? t : deepFreeze({ ...t, archived, updatedAt: now() });
}

/** Independent copy with a fresh id, number 1 and empty history. */
export function duplicateTemplate(t: LibraryTemplate, name = `${t.name} (Kopie)`): LibraryTemplate {
  return createTemplate({ name: name.slice(0, 120), description: t.description, tags: t.tags, body: t.body, origin: { kind: 'template', templateId: t.id } });
}

/** Version ids an ensemble template depends on (current state and history). */
export function templateVersionIds(t: LibraryTemplate): Set<string> {
  const out = new Set<string>();
  for (const body of [t.body, ...t.history.map(s => s.body)]) if (body.kind === 'ensemble') for (const m of body.members) out.add(m.assetVersionId);
  return out;
}

/** Versions an ensemble template needs that are not stored (generator templates need none). */
export function missingTemplateVersions(t: LibraryTemplate, versions: ReadonlyMap<string, AssetVersion>): string[] {
  return t.body.kind === 'ensemble' ? [...new Set(t.body.members.map(m => m.assetVersionId).filter(id => !versions.has(id)))] : [];
}

/** Members re-numbered m1…mN with links remapped; instance ids from a project are not kept in templates. */
function normaliseMembers(members: readonly TemplateMember[], links: readonly ConnectorLink[]): { members: TemplateMember[]; links: ConnectorLink[] } {
  const map = new Map(members.map((m, i) => [m.id, `m${i + 1}`]));
  return {
    members: members.map(m => ({ ...structuredClone(m), id: map.get(m.id)! })),
    links: links.flatMap((l, i) => map.has(l.a.instanceId) && map.has(l.b.instanceId)
      ? [{ id: `l${i + 1}`, a: { instanceId: map.get(l.a.instanceId)!, connectorId: l.a.connectorId }, b: { instanceId: map.get(l.b.instanceId)!, connectorId: l.b.connectorId } }] : []),
  };
}

/** Body of a project's current instances, versions pinned as used. */
export function templateBodyFromProject(project: Project): TemplateBody {
  if (!project.instances.length) fail(`Projekt „${project.name}“ hat keine Bauteile`);
  return { kind: 'ensemble', ...normaliseMembers(project.instances.map(i => ({ id: i.id, name: i.name, assetVersionId: i.assetVersionId, transform: i.transform, override: i.override })), project.links) };
}

export function templateFromProject(project: Project, input: { name?: string; description?: string; tags?: readonly string[] } = {}): LibraryTemplate {
  return createTemplate({ name: input.name?.trim() || project.name, description: input.description ?? project.description, tags: input.tags ?? [],
    body: templateBodyFromProject(project), origin: { kind: 'project', projectId: project.id, projectName: project.name } });
}

/** Shipped ensemble as own template: each member pinned to the version available now. */
export function templateFromEnsemble(ensemble: Ensemble, byAsset: ReadonlyMap<string, AssetVersion>, names: ReadonlyMap<string, string> = new Map(), input: { name?: string } = {}): LibraryTemplate {
  const missing = [...new Set(ensemble.members.map(m => m.assetId).filter(id => !byAsset.has(id)))];
  if (missing.length) fail(`Ensemble ${ensemble.name}: Bauteile fehlen (${missing.join(', ')})`);
  const counts = new Map<string, number>();
  const members = ensemble.members.map((m, i): TemplateMember => {
    const v = byAsset.get(m.assetId)!, n = (counts.get(m.assetId) ?? 0) + 1;
    counts.set(m.assetId, n);
    const base = names.get(m.assetId) ?? m.assetId;
    return { id: `m${i + 1}`, name: n > 1 ? `${base} ${n}` : base, assetVersionId: v.id, transform: memberTransform(m, v), override: false };
  });
  return createTemplate({ name: input.name?.trim() || `${ensemble.name} (eigene Vorlage)`, description: ensemble.description, tags: ensemble.tags,
    body: { kind: 'ensemble', members, links: [] }, origin: { kind: 'ensemble', ensembleId: ensemble.id } });
}

export function templateFromGenerator(source: GeneratorSource, input: { name: string; description?: string; tags?: readonly string[] }): LibraryTemplate {
  return createTemplate({ name: input.name, description: input.description ?? '', tags: input.tags ?? [],
    body: { kind: 'generator', source: { id: source.id, version: source.version, params: { ...source.params } } }, origin: { kind: 'generator', generatorId: source.id } });
}

/**
 * New project from an ensemble template: fresh instance and link ids, the
 * pinned versions unchanged. Throws (nothing created) when a version is
 * missing. The project is a copy: later template edits do not reach it.
 */
export function createTemplateProject(t: LibraryTemplate, versions: ReadonlyMap<string, AssetVersion>, input: { name?: string; profileId?: string } = {}): Project {
  if (t.body.kind !== 'ensemble') return fail(`Vorlage „${t.name}“ ist eine Generatorvorlage; sie wird im Generator geöffnet`);
  const missing = missingTemplateVersions(t, versions);
  if (missing.length) fail(`Vorlage „${t.name}“: ${missing.length} feste Version(en) fehlen im Speicher (${missing.join(', ')})`);
  let project = createProject({ name: (input.name?.trim() || t.name).slice(0, 120), description: `Aus Vorlage „${t.name}“ (Stand ${t.number}) angelegt.${t.description ? ` ${t.description}` : ''}`.slice(0, 2000),
    profileId: input.profileId ?? SAMPLE_PROFILE });
  const ids = new Map<string, string>();
  for (const m of t.body.members) {
    const instance = newInstance({ assetVersionId: m.assetVersionId, name: m.name, transform: structuredClone(m.transform), override: m.override });
    ids.set(m.id, instance.id);
    project = applyOperation(project, { kind: 'instance.add', instance }).project;
  }
  for (const l of t.body.links) {
    const link: ConnectorLink = { id: newId('link'), a: { instanceId: ids.get(l.a.instanceId)!, connectorId: l.a.connectorId }, b: { instanceId: ids.get(l.b.instanceId)!, connectorId: l.b.connectorId } };
    project = applyOperation(project, { kind: 'link.add', link }).project;
  }
  return project;
}

/** Short summary for cards. */
export function describeTemplate(t: Pick<LibraryTemplate, 'body'>): string {
  return t.body.kind === 'ensemble'
    ? `${t.body.members.length} Bauteil${t.body.members.length === 1 ? '' : 'e'}${t.body.links.length ? ` · ${t.body.links.length} Verbindung${t.body.links.length === 1 ? '' : 'en'}` : ''}`
    : `Generator ${t.body.source.id} v${t.body.source.version}`;
}

// ---------------------------------------------------------------------------
// Record validation (storage and backup) and revisions

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const recordFail = (message: string): never => { throw new DomainError('BACKUP', message); };
const str = (v: unknown, what: string, max?: number, required = false): string => {
  if (typeof v !== 'string' || (max !== undefined && v.length > max) || (required && !v.trim())) recordFail(`${what}: ${required ? 'nichtleerer ' : ''}Text${max !== undefined ? ` bis ${max} Zeichen` : ''} erwartet`);
  return v as string;
};
const time = (v: unknown, what: string) => { if (!Number.isFinite(Date.parse(str(v, what, 64, true)))) recordFail(`${what}: gültiger Zeitpunkt erwartet`); };
const revision = (v: unknown, what: string) => { if (!Number.isSafeInteger(v) || (v as number) < 0) recordFail(`${what}: ungültige Speicherrevision`); };
function schema(kind: string, raw: Record<string, unknown>) {
  if (raw.schemaVersion === LIBRARY_RECORD_SCHEMA) return;
  if (typeof raw.schemaVersion === 'number' && raw.schemaVersion > LIBRARY_RECORD_SCHEMA) throw new DomainError('SCHEMA_NEWER', `${kind} stammt aus einer neueren App-Version (Schema ${raw.schemaVersion}). Bitte die App aktualisieren.`);
  recordFail(`${kind} hat ein unbekanntes Schema (${String(raw.schemaVersion)}).`);
}

function checkItem(raw: unknown, where: string): void {
  if (!isObj(raw)) return recordFail(`${where}: Eintrag ist kein Objekt`);
  time(raw.addedAt, `${where}: Zeitpunkt`);
  if (raw.note !== undefined) str(raw.note, `${where}: Notiz`, 300);
  if (raw.kind === 'asset') { str(raw.assetId, `${where}: Bauteil-ID`, 200, true); if (raw.versionId !== undefined) str(raw.versionId, `${where}: Versions-ID`, 200, true); }
  else if (raw.kind === 'ensemble') str(raw.ensembleId, `${where}: Ensemble-ID`, 200, true);
  else if (raw.kind === 'template') str(raw.templateId, `${where}: Vorlagen-ID`, 200, true);
  else recordFail(`${where}: unbekannte Eintragsart ${String(raw.kind)}`);
}

/** Structural check of a stored or restored collection, without normalising it. */
export function checkCollectionRecord(raw: unknown): Collection {
  if (!isObj(raw)) return recordFail('Sammlung ist kein Objekt');
  schema('Sammlung', raw);
  const where = `Sammlung „${str(raw.name, 'Sammlungsname', 120, true)}“`;
  str(raw.id, `${where}: ID`, 200, true); revision(raw.revision, where);
  str(raw.description, `${where}: Beschreibung`, 2000); str(raw.category, `${where}: Kategorie`, 60);
  if (raw.parentId !== null) str(raw.parentId, `${where}: Ordner`, 200, true);
  if (raw.parentId === raw.id) recordFail(`${where}: liegt in sich selbst`);
  if (typeof raw.archived !== 'boolean') recordFail(`${where}: Archivkennzeichen fehlt`);
  time(raw.createdAt, `${where}: Erstellzeit`); time(raw.updatedAt, `${where}: Änderungszeit`);
  if (!Array.isArray(raw.items) || raw.items.length > MAX_COLLECTION_ITEMS) recordFail(`${where}: Eintragsliste fehlt oder ist zu lang`);
  const keys = new Set<string>();
  for (const item of raw.items as unknown[]) {
    checkItem(item, where);
    const key = itemKey(item as CollectionItem);
    if (keys.has(key)) recordFail(`${where}: doppelter Eintrag ${key}`);
    keys.add(key);
  }
  return raw as unknown as Collection;
}

function checkBodyRecord(raw: unknown, where: string): void {
  if (!isObj(raw)) return recordFail(`${where}: Inhalt fehlt`);
  try { checkBody(raw as unknown as TemplateBody); } catch (e) { recordFail(`${where}: ${e instanceof Error ? e.message : String(e)}`); }
}

export function checkTemplateRecord(raw: unknown): LibraryTemplate {
  if (!isObj(raw)) return recordFail('Vorlage ist kein Objekt');
  schema('Vorlage', raw);
  const where = `Vorlage „${str(raw.name, 'Vorlagenname', 120, true)}“`;
  str(raw.id, `${where}: ID`, 200, true); revision(raw.revision, where);
  if (!Number.isSafeInteger(raw.number) || (raw.number as number) < 1) recordFail(`${where}: ungültige Standnummer`);
  str(raw.description, `${where}: Beschreibung`, 2000);
  if (!Array.isArray(raw.tags) || raw.tags.some(t => typeof t !== 'string' || !t.trim() || t.length > 40) || new Set(raw.tags).size !== raw.tags.length) recordFail(`${where}: ungültige Tags`);
  checkBodyRecord(raw.body, where);
  if (raw.origin !== undefined && (!isObj(raw.origin) || !['project', 'ensemble', 'generator', 'template'].includes(raw.origin.kind as string))) recordFail(`${where}: ungültige Herkunft`);
  if (typeof raw.archived !== 'boolean') recordFail(`${where}: Archivkennzeichen fehlt`);
  time(raw.createdAt, `${where}: Erstellzeit`); time(raw.updatedAt, `${where}: Änderungszeit`);
  if (!Array.isArray(raw.history) || raw.history.length > MAX_TEMPLATE_HISTORY) recordFail(`${where}: Verlauf fehlt oder ist zu lang`);
  const numbers = new Set<number>();
  for (const s of raw.history as unknown[]) {
    if (!isObj(s) || !Number.isSafeInteger(s.number) || (s.number as number) >= (raw.number as number) || numbers.has(s.number as number)) recordFail(`${where}: ungültiger Verlaufseintrag`);
    const snap = s as Record<string, unknown>;
    numbers.add(snap.number as number);
    str(snap.name, `${where}: Verlaufsname`, 120, true); str(snap.description, `${where}: Verlaufsbeschreibung`, 2000);
    if (!Array.isArray(snap.tags)) recordFail(`${where}: Verlaufstags fehlen`);
    time(snap.savedAt, `${where}: Verlaufszeit`);
    checkBodyRecord(snap.body, `${where}, Stand ${String(snap.number)}`);
  }
  return raw as unknown as LibraryTemplate;
}

export class LibraryRecordConflictError extends Error {
  constructor(readonly kind: 'collection' | 'template', readonly recordId: string, readonly stored: number, readonly base: number) {
    super(`${kind === 'collection' ? 'Die Sammlung' : 'Die Vorlage'} „${recordId}“ wurde zwischenzeitlich anderswo gespeichert (Revision ${stored}, Basis ${base}). Bitte neu laden und die Änderung erneut ausführen; nichts wurde überschrieben.`);
    this.name = 'LibraryRecordConflictError';
  }
}

/** CAS decision for collections and templates (same contract as assets): incoming revision = expected stored base. */
export function nextLibraryRevision<T extends Collection | LibraryTemplate>(kind: 'collection' | 'template', record: T, stored: { readonly revision: number } | undefined): T {
  const base = record.revision, current = stored?.revision ?? 0;
  if (base !== current) throw new LibraryRecordConflictError(kind, record.id, current, base);
  if (base >= Number.MAX_SAFE_INTEGER) throw new Error(`Revision von ${record.id} kann nicht weiter erhöht werden.`);
  return { ...record, revision: base + 1 };
}

/** Rejects malformed records and duplicate ids before any store is read or changed. */
export function checkLibraryBatch(collections: readonly Collection[], templates: readonly LibraryTemplate[]): void {
  const unique = (ids: readonly string[], label: string) => {
    const seen = new Set<string>();
    for (const id of ids) { if (seen.has(id)) throw new Error(`${label} ${id} kommt doppelt in derselben Speichertransaktion vor.`); seen.add(id); }
  };
  collections.forEach(checkCollectionRecord); templates.forEach(checkTemplateRecord);
  unique(collections.map(c => c.id), 'Sammlung'); unique(templates.map(t => t.id), 'Vorlage');
}

/** Content equality ignoring storage revision (restore planning). */
export function sameLibraryRecord(a: Collection | LibraryTemplate, b: Collection | LibraryTemplate): boolean {
  return canonicalJson({ ...a, revision: 0 }) === canonicalJson({ ...b, revision: 0 });
}
