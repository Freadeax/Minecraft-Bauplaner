import type { Bounds, Vec3 } from '../../voxel/src/types.js';
import { positionKey } from './compose.js';
import type { Resolution } from './compose.js';
import { connectorsMate, linkUsage, placedConnectors } from './connectors.js';
import type { GuideProgress, GuideStep, Guide, StepStatus } from './guide.js';
import { newId } from './hash.js';
import { materialsForParts, stackSizeOf } from './materials.js';
import type { ItemLine, MaterialReport } from './materials.js';
import type { Operation } from './project.js';
import { rawSource, resolveRecipes } from './recipes.js';
import type { RecipeMethod } from './recipes.js';
import { DomainError } from './types.js';
import type { AssetVersion, Connector, Project } from './types.js';

/**
 * Construction site planning (B14). Everything a builder decides about the
 * *site* rather than the geometry lives in one optional, versioned record on
 * the project (`project.site`):
 *
 *  - user defined build sections (Bauabschnitte) in the order they are built,
 *    each a list of instances, optionally limited to a layer range;
 *  - stock: items already gathered (counts) and items marked "vorhanden" in
 *    the recipe tree (not crafted further);
 *  - free-space reservations in front of connectors.
 *
 * Derived views (section progress, gathering/farm plan per section, overview)
 * are pure functions over guide, progress and site. Geometry, step ids,
 * material and recipe rules come from guide.ts / materials.ts / recipes.ts;
 * nothing here counts blocks a second way. Gathering rates are visible
 * assumptions (Richtwerte), never measurements.
 */

export const SITE_SCHEMA_VERSION = 1;
/** Default depth of the free space kept in front of an unlinked connector. */
export const DEFAULT_RESERVATION_DEPTH = 3;
export const MAX_RESERVATION_DEPTH = 32;
const MAX_SECTIONS = 64;

export interface SectionMember {
  readonly instanceId: string;
  /** Inclusive layer range relative to the instance's lowest layer (0 = bottom); absent = open end. */
  readonly fromLayer?: number;
  readonly toLayer?: number;
}

export interface SiteSection {
  readonly id: string;
  readonly name: string;
  readonly note?: string;
  readonly members: readonly SectionMember[];
}

export interface ReservationSetting {
  /** Cells in front of the connector, along its normal; 0 = no reservation. */
  readonly depth: number;
  /** Cross-section override; default from a profile suffix "_<w>x<h>" or "_<w>". */
  readonly width?: number;
  readonly height?: number;
}

export interface SitePlan {
  readonly schemaVersion: 1;
  /** Build order of the sections; a step belongs to the first section that matches it. */
  readonly sections: readonly SiteSection[];
  /** Gathered items by namespaced id (build items, intermediates or raw materials). */
  readonly stock: Readonly<Record<string, number>>;
  /** Items marked "vorhanden" in the recipe tree: counted as available, not expanded further. */
  readonly resolvedStock: readonly string[];
  readonly recipeMethod: RecipeMethod;
  readonly reservations: {
    readonly defaultDepth: number;
    /** Key `${instanceId}/${connectorId}`. */
    readonly overrides: Readonly<Record<string, ReservationSetting>>;
  };
}

export function emptySite(): SitePlan {
  return { schemaVersion: 1, sections: [], stock: {}, resolvedStock: [], recipeMethod: 'stonecutter', reservations: { defaultDepth: DEFAULT_RESERVATION_DEPTH, overrides: {} } };
}

/** The project's site plan or the empty default (older projects have none). */
export const siteOf = (project: Pick<Project, 'site'>): SitePlan => project.site ?? emptySite();

const ns = (id: string): string => id.includes(':') ? id : `minecraft:${id}`;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const fail = (message: string): never => { throw new DomainError('SITE', `Baustellenplan: ${message}`); };
const intIn = (v: unknown, min: number, max: number, what: string): number => {
  if (!Number.isInteger(v) || (v as number) < min || (v as number) > max) fail(`${what} muss eine ganze Zahl von ${min} bis ${max} sein`);
  return v as number;
};
const text = (v: unknown, max: number, what: string): string => {
  if (typeof v !== 'string' || !v.trim() || v.length > max) fail(`${what} braucht 1–${max} Zeichen`);
  return v as string;
};

/** Structural validation (records from storage, backups and operations). Throws DomainError 'SITE'. */
export function checkSite(raw: unknown): SitePlan {
  if (!isObj(raw)) return fail('kein Objekt');
  if (raw.schemaVersion !== SITE_SCHEMA_VERSION) fail(`unbekannte Schemaversion ${String(raw.schemaVersion)}`);
  if (!Array.isArray(raw.sections) || raw.sections.length > MAX_SECTIONS) fail(`höchstens ${MAX_SECTIONS} Bauabschnitte`);
  const ids = new Set<string>();
  for (const s of raw.sections as unknown[]) {
    if (!isObj(s)) return fail('Bauabschnitt ist kein Objekt');
    const id = text(s.id, 64, 'Abschnitts-ID'), name = text(s.name, 80, 'Abschnittsname');
    if (ids.has(id)) fail(`Abschnitts-ID ${id} doppelt`);
    ids.add(id);
    if (s.note !== undefined && (typeof s.note !== 'string' || s.note.length > 500)) fail(`Notiz von „${name}“ zu lang`);
    if (!Array.isArray(s.members)) fail(`„${name}“ hat keine Mitgliederliste`);
    for (const m of s.members as unknown[]) {
      if (!isObj(m) || typeof m.instanceId !== 'string' || !m.instanceId) return fail(`„${name}“: ungültiges Mitglied`);
      const from = m.fromLayer === undefined ? 0 : intIn(m.fromLayer, 0, 4096, `„${name}“: Startschicht`);
      if (m.toLayer !== undefined && intIn(m.toLayer, 0, 4096, `„${name}“: Endschicht`) < from) fail(`„${name}“: Endschicht liegt unter der Startschicht`);
    }
  }
  if (!isObj(raw.stock)) fail('Lagerbestand fehlt');
  for (const [id, n] of Object.entries(raw.stock as Record<string, unknown>)) { text(id, 128, 'Item-ID'); intIn(n, 0, 1e9, `Bestand ${id}`); }
  if (!Array.isArray(raw.resolvedStock) || raw.resolvedStock.some(i => typeof i !== 'string' || !i)) fail('Liste „vorhanden“ ungültig');
  if (raw.recipeMethod !== 'stonecutter' && raw.recipeMethod !== 'crafting') fail('Rezeptweg muss stonecutter oder crafting sein');
  const r = raw.reservations;
  if (!isObj(r) || !isObj(r.overrides)) return fail('Freiraum-Einstellungen fehlen');
  intIn(r.defaultDepth, 0, MAX_RESERVATION_DEPTH, 'Standard-Freiraumtiefe');
  for (const [key, o] of Object.entries(r.overrides)) {
    if (!/^[^/]+\/.+$/.test(key) || !isObj(o)) fail(`Freiraum ${key} ungültig`);
    const v = o as Record<string, unknown>;
    intIn(v.depth, 0, MAX_RESERVATION_DEPTH, `Freiraumtiefe ${key}`);
    if (v.width !== undefined) intIn(v.width, 1, 64, `Freiraumbreite ${key}`);
    if (v.height !== undefined) intIn(v.height, 1, 64, `Freiraumhöhe ${key}`);
  }
  return raw as unknown as SitePlan;
}

/** Undoable replacement of the whole site plan (inverse restores the previous record). */
export function siteOperation(next: SitePlan, label: string): Operation {
  return { kind: 'site.set', site: checkSite(structuredClone(next)), label };
}

// ---------------------------------------------------------------------------
// Edits (pure: SitePlan → SitePlan). Wrap the result with `siteOperation`.

export function addSection(site: SitePlan, name: string, members: readonly SectionMember[] = [], id = newId('sec')): SitePlan {
  return { ...site, sections: [...site.sections, { id, name: name.trim(), members: [...members] }] };
}
export function updateSection(site: SitePlan, id: string, patch: { name?: string; note?: string; members?: readonly SectionMember[] }): SitePlan {
  if (!site.sections.some(s => s.id === id)) fail(`Abschnitt ${id} existiert nicht`);
  return { ...site, sections: site.sections.map(s => {
    if (s.id !== id) return s;
    const next: { -readonly [K in keyof SiteSection]: SiteSection[K] } = { ...s, ...(patch.name !== undefined && { name: patch.name.trim() }), ...(patch.members !== undefined && { members: [...patch.members] }) };
    if (patch.note !== undefined) { if (patch.note.trim()) next.note = patch.note.trim(); else delete next.note; }
    return next;
  }) };
}
export function removeSection(site: SitePlan, id: string): SitePlan {
  return { ...site, sections: site.sections.filter(s => s.id !== id) };
}
/** Moves a section one place earlier (-1) or later (+1) in the build order. */
export function moveSection(site: SitePlan, id: string, delta: -1 | 1): SitePlan {
  const i = site.sections.findIndex(s => s.id === id), j = i + delta;
  if (i < 0 || j < 0 || j >= site.sections.length) return site;
  const sections = [...site.sections]; [sections[i], sections[j]] = [sections[j]!, sections[i]!];
  return { ...site, sections };
}
/** Sets the gathered count of an item (0 removes the entry). */
export function setStock(site: SitePlan, itemId: string, count: number): SitePlan {
  const stock = { ...site.stock }, id = ns(itemId), n = Math.max(0, Math.floor(count));
  if (n) stock[id] = n; else delete stock[id];
  return { ...site, stock };
}
/** Toggles the recipe-tree mark "vorhanden" of an item. */
export function toggleResolvedStock(site: SitePlan, itemId: string): SitePlan {
  const id = ns(itemId), has = site.resolvedStock.includes(id);
  return { ...site, resolvedStock: has ? site.resolvedStock.filter(i => i !== id) : [...site.resolvedStock, id].sort() };
}
export const reservationKey = (instanceId: string, connectorId: string): string => `${instanceId}/${connectorId}`;
export function setReservation(site: SitePlan, instanceId: string, connectorId: string, setting: ReservationSetting | null): SitePlan {
  const overrides = { ...site.reservations.overrides }, key = reservationKey(instanceId, connectorId);
  if (setting) overrides[key] = setting; else delete overrides[key];
  return { ...site, reservations: { ...site.reservations, overrides } };
}
/** Drops members and reservations of instances that no longer exist. */
export function pruneSite(site: SitePlan, project: Pick<Project, 'instances'>): SitePlan {
  const ids = new Set(project.instances.map(i => i.id));
  return {
    ...site,
    sections: site.sections.map(s => ({ ...s, members: s.members.filter(m => ids.has(m.instanceId)) })),
    reservations: { ...site.reservations, overrides: Object.fromEntries(Object.entries(site.reservations.overrides).filter(([k]) => ids.has(k.split('/')[0]!))) },
  };
}

// ---------------------------------------------------------------------------
// Sections and steps

const memberMatches = (m: SectionMember, step: Pick<GuideStep, 'instanceId' | 'layer'>): boolean =>
  m.instanceId === step.instanceId && step.layer >= (m.fromLayer ?? 0) && step.layer <= (m.toLayer ?? Infinity);

/** Section id a step belongs to (first match in build order), or null. */
export function sectionOfStep(site: SitePlan, step: Pick<GuideStep, 'instanceId' | 'layer'>): string | null {
  return site.sections.find(s => s.members.some(m => memberMatches(m, step)))?.id ?? null;
}

export type SectionPreset = 'instances' | 'storeys';
export const SECTION_PRESET_LABEL: Readonly<Record<SectionPreset, string>> = {
  instances: 'Je Bauteil ein Abschnitt', storeys: 'Fundament · Rohbau · Dach über alle Bauteile',
};

/**
 * Starting points the user can edit: one section per instance (project order),
 * or storeys across all instances – bottom layer = foundation, the top quarter
 * of each instance (at least one layer, if it has three or more) = roof.
 */
export function suggestSections(project: Pick<Project, 'instances'>, guide: Guide, preset: SectionPreset, makeId: () => string = () => newId('sec')): SiteSection[] {
  if (preset === 'instances') return project.instances.map(i => ({ id: makeId(), name: i.name, members: [{ instanceId: i.id }] }));
  const top = new Map<string, number>();
  for (const s of guide.steps) top.set(s.instanceId, Math.max(top.get(s.instanceId) ?? 0, s.layer));
  const found: SectionMember[] = [], shell: SectionMember[] = [], roof: SectionMember[] = [];
  for (const inst of project.instances) {
    const t = top.get(inst.id);
    if (t === undefined) continue;
    found.push({ instanceId: inst.id, fromLayer: 0, toLayer: 0 });
    if (t === 0) continue;
    const roofFrom = t >= 3 ? Math.max(2, Math.ceil(t * 0.75)) : t + 1;
    if (roofFrom > 1) shell.push({ instanceId: inst.id, fromLayer: 1, toLayer: Math.min(t, roofFrom - 1) });
    if (roofFrom <= t) roof.push({ instanceId: inst.id, fromLayer: roofFrom });
  }
  return [
    { id: makeId(), name: 'Fundament', members: found }, { id: makeId(), name: 'Rohbau', members: shell }, { id: makeId(), name: 'Dach und Abschluss', members: roof },
  ].filter(s => s.members.length);
}

export interface SectionIssue { readonly sectionId: string | null; readonly kind: 'orphan' | 'overlap' | 'order' | 'empty'; readonly message: string }

/**
 * Plan checks: members of removed instances, layers claimed by several
 * sections (first wins), empty sections, and steps whose prerequisites lie in
 * a section scheduled later (the build order would need a support that is not
 * built yet).
 */
export function checkSections(site: SitePlan, project: Pick<Project, 'instances'>, guide: Guide): SectionIssue[] {
  const issues: SectionIssue[] = [], ids = new Set(project.instances.map(i => i.id));
  const name = new Map(site.sections.map(s => [s.id, s.name])), rank = new Map(site.sections.map((s, i) => [s.id, i]));
  for (const s of site.sections) {
    const orphans = s.members.filter(m => !ids.has(m.instanceId)).length;
    if (orphans) issues.push({ sectionId: s.id, kind: 'orphan', message: `„${s.name}“ verweist auf ${orphans} entfernte${orphans === 1 ? 's Bauteil' : ' Bauteile'}.` });
  }
  const sectionOf = new Map<string, string | null>(), stepCount = new Map<string, number>();
  const overlaps = new Map<string, Set<string>>();
  for (const step of guide.steps) {
    const matches = site.sections.filter(s => s.members.some(m => memberMatches(m, step)));
    sectionOf.set(step.id, matches[0]?.id ?? null);
    if (matches[0]) stepCount.set(matches[0].id, (stepCount.get(matches[0].id) ?? 0) + 1);
    for (const later of matches.slice(1)) (overlaps.get(later.id) ?? (overlaps.set(later.id, new Set()), overlaps.get(later.id)!)).add(matches[0]!.id);
  }
  for (const [id, first] of overlaps) issues.push({ sectionId: id, kind: 'overlap',
    message: `„${name.get(id)}“ überschneidet sich mit ${[...first].map(f => `„${name.get(f)}“`).join(', ')}; die Schichten zählen zum früheren Abschnitt.` });
  for (const s of site.sections) if (!stepCount.get(s.id) && !overlaps.has(s.id) && !s.members.every(m => !ids.has(m.instanceId)) && s.members.length)
    issues.push({ sectionId: s.id, kind: 'empty', message: `„${s.name}“ enthält keine Bauschritte (Schichtbereich leer?).` });
  const order = new Map<string, { later: string; count: number }>();
  for (const step of guide.steps) {
    const own = sectionOf.get(step.id);
    for (const p of step.prerequisites) {
      const other = sectionOf.get(p);
      const ownRank = own == null ? Infinity : rank.get(own)!, otherRank = other == null ? Infinity : rank.get(other)!;
      if (otherRank > ownRank) {
        const key = `${own}>${other}`, e = order.get(key);
        order.set(key, { later: other ?? '', count: (e?.count ?? 0) + 1 });
      }
    }
  }
  for (const [key, { later, count }] of order) {
    const own = key.split('>')[0]!;
    issues.push({ sectionId: own, kind: 'order', message: `„${name.get(own)}“ braucht ${count} Vorarbeit${count === 1 ? '' : 'en'} aus ${later ? `„${name.get(later)}“, der erst später kommt` : 'Schritten ohne Abschnitt'} (z. B. Stütze darunter).` });
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Gathering (Sammel-/Farmplan)

export interface GatherRule {
  readonly activity: string;
  readonly tool: string;
  /** Rough items per hour for one player; null = cannot be planned (finds, trades). Always an assumption. */
  readonly perHour: number | null;
  readonly farm?: string;
  /** Catalogue building (asset id) that produces the item. */
  readonly buildingId?: string;
  readonly dimension?: 'Nether' | 'Ende';
}

const BY_SOURCE: Readonly<Record<string, GatherRule>> = {
  'Abbau': { activity: 'Abbauen', tool: 'Spitzhacke', perHour: 600 },
  'Abbau mit Behutsamkeit': { activity: 'Abbauen mit Behutsamkeit', tool: 'Spitzhacke/Werkzeug mit Behutsamkeit', perHour: 300 },
  'Holzfällen': { activity: 'Holzfällen', tool: 'Axt', perHour: 250, farm: 'Baumfarm mit Setzlingen', buildingId: 'bld_baumfarm' },
  'Pflanzen sammeln/anbauen': { activity: 'Sammeln/Anbauen', tool: 'Hand, Hacke', perHour: 200 },
  'Mit Schere sammeln': { activity: 'Scheren', tool: 'Schere', perHour: 300 },
  'Mob-Drop/Tiere': { activity: 'Mobs/Tiere', tool: 'Schwert', perHour: 60 },
  'Fund/Handel': { activity: 'Fund oder Handel', tool: '–', perHour: null },
};
const BY_ITEM: Readonly<Record<string, Partial<GatherRule>>> = {
  cobblestone: { perHour: 900, farm: 'Bruchsteingenerator (Lava + Wasser)' },
  cobbled_deepslate: { perHour: 500 },
  dirt: { tool: 'Schaufel', perHour: 1000 }, sand: { tool: 'Schaufel', perHour: 1000 }, red_sand: { tool: 'Schaufel', perHour: 900 }, gravel: { tool: 'Schaufel', perHour: 900 },
  clay_ball: { tool: 'Schaufel', perHour: 600 },
  coal: { perHour: 120 }, raw_iron: { perHour: 80, farm: 'Eisenfarm (Golems)', buildingId: 'bld_eisenfarm' }, raw_copper: { perHour: 200 }, raw_gold: { perHour: 40 },
  redstone: { perHour: 200 }, lapis_lazuli: { perHour: 150 }, diamond: { perHour: 8 }, emerald: { perHour: 4, farm: 'Handel mit Dorfbewohnern' }, ancient_debris: { perHour: 4, dimension: 'Nether' },
  netherrack: { perHour: 1500, dimension: 'Nether' }, blackstone: { dimension: 'Nether' }, basalt: { dimension: 'Nether' }, soul_sand: { tool: 'Schaufel', dimension: 'Nether' },
  soul_soil: { tool: 'Schaufel', dimension: 'Nether' }, quartz: { perHour: 300, dimension: 'Nether' }, glowstone_dust: { perHour: 250, dimension: 'Nether' },
  magma_block: { dimension: 'Nether' }, gilded_blackstone: { perHour: 20, dimension: 'Nether' }, end_stone: { perHour: 800, dimension: 'Ende' }, obsidian: { perHour: 60, tool: 'Diamant-Spitzhacke' },
  crying_obsidian: { perHour: 20, dimension: 'Nether' }, amethyst_shard: { perHour: 150 },
  sugar_cane: { perHour: 400, farm: 'Zuckerrohrfarm', buildingId: 'bld_zuckerrohr_modul' }, cactus: { perHour: 300, farm: 'Kaktusfarm', buildingId: 'bld_kaktusfarm' },
  pumpkin: { perHour: 250, farm: 'Kürbisfarm', buildingId: 'bld_kuerbis_modul' }, melon: { perHour: 250, farm: 'Melonenfarm', buildingId: 'bld_melonen_modul' },
  brown_mushroom: { farm: 'Pilzfarm', buildingId: 'bld_pilzfarm' }, red_mushroom: { farm: 'Pilzfarm', buildingId: 'bld_pilzfarm' },
  honeycomb: { perHour: 40, tool: 'Schere', farm: 'Bienenhaus', buildingId: 'bld_bienenhaus' }, honey_bottle: { perHour: 30, farm: 'Bienenhaus', buildingId: 'bld_bienenhaus' },
  egg: { perHour: 60, farm: 'Hühnerfarm', buildingId: 'bld_huehnerfarm' }, feather: { perHour: 60, farm: 'Hühnerfarm', buildingId: 'bld_huehnerfarm' },
  leather: { perHour: 60, farm: 'Kuhweide', buildingId: 'bld_tierweide' }, white_wool: { perHour: 200, farm: 'Schafweide', buildingId: 'bld_tierweide' },
  kelp: { perHour: 500, farm: 'Seetangfarm' }, bamboo: { perHour: 600, farm: 'Bambusfarm' }, wheat: { perHour: 300, farm: 'Weizenfeld' },
  string: { perHour: 80, farm: 'Spinnen-/Mobfarm' }, bone: { perHour: 80, farm: 'Mobfarm' }, gunpowder: { perHour: 60, farm: 'Mobfarm (Creeper)' },
  slime_ball: { perHour: 40, farm: 'Schleimfarm' }, blaze_rod: { perHour: 60, farm: 'Lohenfarm', dimension: 'Nether' }, ender_pearl: { perHour: 40, farm: 'Endermanfarm', dimension: 'Ende' },
  shulker_shell: { perHour: 10, dimension: 'Ende' }, nether_wart: { perHour: 200, dimension: 'Nether', farm: 'Netherwarzenbeet' },
  prismarine_shard: { perHour: 80, farm: 'Wächterfarm' }, prismarine_crystals: { perHour: 40, farm: 'Wächterfarm' },
};

/** Gathering rule of a raw item, or null for items without a raw source. */
export function gatherRuleFor(itemId: string): GatherRule | null {
  const source = rawSource(itemId);
  if (source === undefined) return null;
  const base = BY_SOURCE[source] ?? { activity: source, tool: '–', perHour: null };
  return { ...base, ...BY_ITEM[itemId.replace(/^minecraft:/, '')] };
}
/** Catalogue building ids referenced by gather rules (for tests and links). */
export const GATHER_BUILDING_IDS: readonly string[] = [...new Set([...Object.values(BY_SOURCE), ...Object.values(BY_ITEM)].map(r => r.buildingId).filter((b): b is string => !!b))].sort();

export interface GatherLine {
  readonly itemId: string;
  readonly kind: 'raw' | 'unknown' | 'resolved' | 'fuel';
  /** Needed for the open steps of the section. */
  readonly need: number;
  /** Covered by stock left over after earlier sections. */
  readonly fromStock: number;
  readonly missing: number;
  readonly rule: GatherRule | null;
  /** missing / perHour, rounded to 0.1; null when no rate is known. */
  readonly hours: number | null;
  readonly slots: number;
}

export interface BuildItemLine { readonly itemId: string; readonly need: number; readonly fromStock: number; readonly missing: number; readonly assumed: boolean }

export interface SectionPlan {
  /** Section id, or '' for steps outside every section ("Ohne Abschnitt"). */
  readonly id: string;
  readonly name: string;
  readonly note?: string;
  readonly steps: readonly GuideStep[];
  readonly done: number;
  readonly review: number;
  readonly open: number;
  readonly blocks: number;
  readonly blocksDone: number;
  /** Open steps whose prerequisites are done. */
  readonly ready: readonly string[];
  /** Build items for the steps not done yet. */
  readonly items: readonly BuildItemLine[];
  /** Raw materials still to gather for the missing build items. */
  readonly gather: readonly GatherLine[];
  readonly gatherHours: number;
  /** Lines without a rate (finds, unknown items). */
  readonly unplannable: number;
  readonly unresolvedCells: number;
  readonly complete: boolean;
}

export interface SiteOverview {
  readonly sections: readonly SectionPlan[];
  readonly totals: {
    readonly steps: number; readonly done: number; readonly review: number; readonly blocks: number; readonly blocksDone: number;
    readonly itemsNeeded: number; readonly itemsCovered: number; readonly gatherHours: number;
  };
  /** First section with open steps (the one being built). */
  readonly currentId: string | null;
  readonly notes: readonly string[];
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * Section progress and gathering plan. Demand per section = build items of
 * its steps that are not done (ticked steps are already placed, so their
 * items are no longer in storage). Stock is consumed in build order: first by
 * build items, the rest as raw materials; recipes run only for the missing
 * build items, so stocked items are never gathered twice.
 */
export function planSite(site: SitePlan, guide: Guide, progress: GuideProgress, resolution: Pick<Resolution, 'world'>): SiteOverview {
  const status = (id: string): StepStatus => progress.status.get(id) ?? 'open';
  const groups = new Map<string, GuideStep[]>(site.sections.map(s => [s.id, []]));
  const rest: GuideStep[] = [];
  for (const step of guide.steps) { const id = sectionOfStep(site, step); (id ? groups.get(id)! : rest).push(step); }
  const meta = [...site.sections.map(s => ({ id: s.id, name: s.name, note: s.note, steps: groups.get(s.id)! })),
    ...(rest.length ? [{ id: '', name: site.sections.length ? 'Ohne Abschnitt' : 'Gesamtes Projekt', note: undefined, steps: rest }] : [])];

  const world = resolution.world;
  const openParts = meta.map(m => ({ id: m.id || '~rest', positions: m.steps.filter(s => status(s.id) !== 'done').flatMap(s => s.positions), conflicts: m.steps.reduce((n, s) => n + s.conflicts, 0) }));
  const reports: Map<string, MaterialReport> = world ? materialsForParts(world, openParts) : new Map();
  const stock = new Map(Object.entries(site.stock).map(([k, v]) => [ns(k), v]));
  const take = (id: string, need: number): number => { const have = stock.get(id) ?? 0, n = Math.min(have, need); if (n) stock.set(id, have - n); return n; };
  const resolved = new Set(site.resolvedStock.map(ns));

  const sections: SectionPlan[] = meta.map(m => {
    const report = reports.get(m.id || '~rest');
    let done = 0, review = 0, blocks = 0, blocksDone = 0;
    for (const s of m.steps) { const st = status(s.id); blocks += s.blocks; if (st === 'done') { done++; blocksDone += s.blocks; } else if (st === 'review') review++; }
    const items: BuildItemLine[] = (report?.items ?? []).map((l: ItemLine) => {
      const fromStock = take(l.itemId, l.count);
      return { itemId: l.itemId, need: l.count, fromStock, missing: l.count - fromStock, assumed: l.confidence === 'assumed' };
    });
    const missingItems = items.filter(i => i.missing > 0).map(i => ({ itemId: i.itemId, count: i.missing }));
    const recipes = missingItems.length ? resolveRecipes(missingItems, { method: site.recipeMethod, stock: resolved }) : null;
    const raw = new Map<string, { need: number; kind: GatherLine['kind'] }>();
    for (const b of recipes?.base ?? []) raw.set(b.itemId, { need: b.count, kind: b.kind === 'stock' ? 'resolved' : b.kind });
    if (recipes?.fuel.coal) {
      const coal = raw.get('minecraft:coal');
      if (coal) coal.need += recipes.fuel.coal; else raw.set('minecraft:coal', { need: recipes.fuel.coal, kind: 'fuel' });
    }
    const gather: GatherLine[] = [...raw.entries()].map(([itemId, r]) => {
      const fromStock = r.kind === 'resolved' ? r.need : take(itemId, r.need), missing = r.need - fromStock;
      const rule = r.kind === 'unknown' ? null : gatherRuleFor(itemId);
      const hours = missing && rule?.perHour ? round1(missing / rule.perHour) : missing ? null : 0;
      return { itemId, kind: r.kind, need: r.need, fromStock, missing, rule, hours, slots: Math.ceil(missing / stackSizeOf(itemId)) };
    }).sort((a, b) => b.missing - a.missing || (a.itemId < b.itemId ? -1 : 1));
    const open = m.steps.length - done - review;
    return {
      id: m.id, name: m.name, ...(m.note !== undefined && { note: m.note }), steps: m.steps, done, review, open, blocks, blocksDone,
      ready: progress.ready.filter(id => m.steps.some(s => s.id === id)), items, gather,
      gatherHours: round1(gather.reduce((h, g) => h + (g.hours ?? 0), 0)), unplannable: gather.filter(g => g.missing > 0 && g.hours === null).length,
      unresolvedCells: report?.unresolved.reduce((n, u) => n + u.count, 0) ?? 0,
      complete: m.steps.length > 0 && done === m.steps.length,
    };
  });

  const totals = sections.reduce((t, s) => ({
    steps: t.steps + s.steps.length, done: t.done + s.done, review: t.review + s.review, blocks: t.blocks + s.blocks, blocksDone: t.blocksDone + s.blocksDone,
    itemsNeeded: t.itemsNeeded + s.items.reduce((n, i) => n + i.need, 0), itemsCovered: t.itemsCovered + s.items.reduce((n, i) => n + i.fromStock, 0),
    gatherHours: round1(t.gatherHours + s.gatherHours),
  }), { steps: 0, done: 0, review: 0, blocks: 0, blocksDone: 0, itemsNeeded: 0, itemsCovered: 0, gatherHours: 0 });
  const notes = [
    'Sammelzeiten sind Richtwerte für einen Spieler ohne Verzauberungen und ohne Laufwege – Annahmen, keine Messung.',
    'Bedarf zählt nur Schritte, die noch nicht abgehakt sind; der Lagerbestand wird in Bauabschnitt-Reihenfolge verbraucht.',
  ];
  if (sections.some(s => s.unresolvedCells)) notes.push('Blockzustände ohne Itemregel (z. B. Flüssigkeiten, Modblöcke) fehlen im Sammelplan; siehe Tab „Material“.');
  if (site.resolvedStock.length) notes.push(`${site.resolvedStock.length} Items sind im Rezeptbaum als „vorhanden“ markiert und werden nicht gesammelt.`);
  return { sections, totals, currentId: sections.find(s => s.open + s.review > 0)?.id ?? null, notes };
}

// ---------------------------------------------------------------------------
// Free-space reservations at connectors

/** docked = a matching connector of another instance sits exactly there, but no link is stored yet. */
export type ReservationState = 'free' | 'linked' | 'docked' | 'blocked' | 'off';
export const RESERVATION_STATE_LABEL: Readonly<Record<ReservationState, string>> = { free: 'frei', linked: 'verbunden', docked: 'angedockt', blocked: 'verbaut', off: 'aus' };

export interface Reservation {
  readonly key: string;
  readonly instanceId: string;
  readonly instanceName: string;
  readonly connector: Connector;
  /** Connector in project coordinates. */
  readonly world: Connector;
  readonly depth: number;
  readonly width: number;
  readonly height: number;
  readonly source: 'profile' | 'default' | 'override';
  readonly state: ReservationState;
  /** Kept-free cells in world coordinates (empty when linked or off). */
  readonly cells: readonly Vec3[];
  readonly bounds: Bounds | null;
  /** Docked partner (instance name) when state is 'docked'. */
  readonly dockedWith?: string;
  /** Placed blocks inside the zone, with the instance that owns them. */
  readonly blockedBy: readonly { readonly position: Vec3; readonly instanceId: string; readonly instanceName: string }[];
}

/** Cross-section from a profile name: "wall_2x5" → 2 wide, 5 high; "weg_4" → 4 wide, 3 high (walking clearance). */
export function profileSize(profile: string): { width: number; height: number } | null {
  const m = /_(\d{1,2})(?:x(\d{1,2}))?$/.exec(profile);
  if (!m) return null;
  const width = Number(m[1]), height = m[2] ? Number(m[2]) : 3;
  return width > 0 && height > 0 ? { width, height } : null;
}

/** Cells in front of a project-space connector: `depth` along the normal, `width` centred across, `height` along up. */
export function reservationCells(c: Connector, depth: number, width: number, height: number): Vec3[] {
  const axis = (v: Vec3): number => v.findIndex(n => n !== 0);
  const a = axis(c.normal), u = axis(c.up), s = [0, 1, 2].find(i => i !== a && i !== u)!;
  const sign = c.normal[a]!, upSign = c.up[u]!, start = c.position[s]! - Math.floor(width / 2);
  const cells: Vec3[] = [];
  for (let d = 0; d < depth; d++) for (let h = 0; h < height; h++) for (let w = 0; w < width; w++) {
    const p = [0, 0, 0];
    p[a] = sign > 0 ? c.position[a]! + d : c.position[a]! - 1 - d;
    p[u] = upSign > 0 ? c.position[u]! + h : c.position[u]! - 1 - h;
    p[s] = start + w;
    cells.push(p as unknown as Vec3);
  }
  return cells;
}

/**
 * Free space that must stay clear in front of every connector that is not
 * linked yet, so a later module can still be attached. Linked connectors are
 * reported as such (their space is used by the partner); a connector whose
 * mate already sits exactly in place without a stored link is 'docked' (link
 * it in the editor). Blocked = a placed block of any instance lies inside the zone.
 */
export function reservationsFor(project: Pick<Project, 'instances' | 'links'>, versions: ReadonlyMap<string, AssetVersion>, site: SitePlan, resolution: Pick<Resolution, 'world' | 'owners'>): Reservation[] {
  const usage = linkUsage(project.links);
  const names = new Map(project.instances.map(i => [i.id, i.name]));
  const blocks = new Map<string, Vec3>();
  if (resolution.world) for (const c of resolution.world.cells) if (c.kind === 'block') blocks.set(positionKey(c.position), c.position);
  const placed = project.instances.flatMap(inst => { const v = versions.get(inst.assetVersionId); return v ? placedConnectors(inst, v) : []; });
  const out: Reservation[] = [];
  for (const inst of project.instances) {
    for (const pc of placed.filter(p => p.instanceId === inst.id)) {
      const key = reservationKey(inst.id, pc.connector.id), o = site.reservations.overrides[key], fromProfile = profileSize(pc.connector.profile);
      const depth = o?.depth ?? site.reservations.defaultDepth;
      const width = o?.width ?? fromProfile?.width ?? 2, height = o?.height ?? fromProfile?.height ?? 3;
      const linked = (usage.get(`${inst.id}\u0000${pc.connector.id}`) ?? 0) > 0;
      const mate = linked ? undefined : placed.find(o => o.instanceId !== inst.id && connectorsMate(pc.world, o.world));
      const state0: ReservationState = linked ? 'linked' : mate ? 'docked' : depth === 0 ? 'off' : 'free';
      const cells = state0 === 'free' ? reservationCells(pc.world, depth, width, height) : [];
      const blockedBy = cells.filter(p => blocks.has(positionKey(p))).map(position => {
        const owner = resolution.owners.get(positionKey(position))?.[0] ?? '';
        return { position, instanceId: owner, instanceName: names.get(owner) ?? owner };
      });
      let bounds: Bounds | null = null;
      if (cells.length) {
        const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
        for (const p of cells) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i]!, p[i]!); max[i] = Math.max(max[i]!, p[i]! + 1); }
        bounds = { min: min as unknown as Vec3, maxExclusive: max as unknown as Vec3 };
      }
      out.push({ key, instanceId: inst.id, instanceName: inst.name, connector: pc.connector, world: pc.world, depth, width, height,
        source: o ? 'override' : fromProfile ? 'profile' : 'default', state: blockedBy.length ? 'blocked' : state0, cells, bounds, blockedBy,
        ...(mate && { dockedWith: names.get(mate.instanceId) ?? mate.instanceId }) });
    }
  }
  return out;
}
