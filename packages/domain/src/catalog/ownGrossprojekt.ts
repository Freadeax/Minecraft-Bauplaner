import { ENSEMBLES } from './ensembles.js';
import { latestReleaseId } from '../versions/updateState.js';
import { DomainError } from '../core/types.js';
import type { Asset, AssetVersion } from '../core/types.js';
import type { Collection, CollectionItem } from './collections.js';
import type { Grossprojekt, GrossprojektUnit, Quartier, StreetStyle } from './grossprojekte.js';

/**
 * Eigene Großprojekte aus Sammlungen (GROSS-01-S08). A collection becomes a
 * town plan without writing a data file: the collection's own buildings form
 * the first quarter (split into quarters of QUARTER_SLOTS), every sub-folder
 * becomes one more quarter with everything inside it (nested folders
 * included), each quarter is one build phase in collection order. Asset items
 * become slots pinned to their pinned or newest version, shipped ensembles
 * stay ensembles; own templates, missing or archived entries are listed as
 * skipped. The result is a normal Großprojekt (flag `own`), so layout, street
 * network, terrain, preview and adoption work unchanged. Pure.
 */

export const OWN_GP_ROUTE_PREFIX = 'sammlung-';
/** Slots per quarter before the collection's own buildings are split. */
export const QUARTER_SLOTS = 8;
/** Most quarters an own Großprojekt gets (grid ≤ 16 per side). */
export const MAX_OWN_QUARTERS = 24;

export interface OwnGrossprojektInput {
  /** All collections (for sub-folders). */
  readonly all: readonly Collection[];
  readonly assets: readonly Asset[];
  readonly versions: ReadonlyMap<string, AssetVersion>;
  readonly streetStyle?: StreetStyle;
}

export interface OwnGrossprojekt {
  readonly gp: Grossprojekt;
  /** Entries that could not become a slot or ensemble (with the reason). */
  readonly skipped: readonly string[];
}

const fail = (message: string): never => { throw new DomainError('GROSSPROJEKT', `Eigenes Großprojekt: ${message}`); };
const slug = (id: string) => id.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60) || 'x';
export const ownGrossprojektRoute = (collectionId: string) => `${OWN_GP_ROUTE_PREFIX}${collectionId}`;

/** Items of a folder and all folders below it (depth first, in name order), never twice. */
function deepItems(all: readonly Collection[], root: Collection): CollectionItem[] {
  const out: CollectionItem[] = [], seen = new Set<string>();
  const walk = (c: Collection, depth: number) => {
    if (seen.has(c.id) || depth > 8) return;
    seen.add(c.id);
    out.push(...c.items);
    for (const child of children(all, c.id)) walk(child, depth + 1);
  };
  walk(root, 0);
  return out;
}
const children = (all: readonly Collection[], id: string) => all.filter(c => c.parentId === id && !c.archived).sort((a, b) => a.name.localeCompare(b.name, 'de') || (a.id < b.id ? -1 : 1));

/** Builds an own Großprojekt from a collection. Throws when nothing in it can be placed. */
export function grossprojektFromCollection(collection: Collection, input: OwnGrossprojektInput): OwnGrossprojekt {
  const assets = new Map(input.assets.map(a => [a.id, a]));
  const skipped: string[] = [];
  let key = 0;
  const unitsOf = (items: readonly CollectionItem[]): GrossprojektUnit[] => {
    const out: GrossprojektUnit[] = [], used = new Set<string>();
    for (const item of items) {
      if (item.kind === 'template') { skipped.push(`Vorlage ${item.templateId}: eigene Vorlagen werden als Projekt übernommen, nicht als Platz`); continue; }
      if (item.kind === 'ensemble') {
        if (!ENSEMBLES.some(e => e.id === item.ensembleId)) { skipped.push(`Ensemble ${item.ensembleId} gibt es nicht`); continue; }
        if (used.has(`e:${item.ensembleId}`)) continue;
        used.add(`e:${item.ensembleId}`);
        out.push({ kind: 'ensemble', key: `s${++key}`, ensembleId: item.ensembleId });
        continue;
      }
      const asset = assets.get(item.assetId);
      if (!asset) { skipped.push(`${item.assetId}: Bauteil fehlt in der Bibliothek`); continue; }
      if (asset.archived) { skipped.push(`${asset.name}: archiviert`); continue; }
      const versionId = item.versionId && asset.versionIds.includes(item.versionId) ? item.versionId : latestReleaseId(asset, input.versions);
      const version = versionId ? input.versions.get(versionId) : undefined;
      if (!version) { skipped.push(`${asset.name}: keine Version vorhanden`); continue; }
      if (used.has(`a:${asset.id}:${version.id}`)) continue;
      used.add(`a:${asset.id}:${version.id}`);
      out.push({ kind: 'slot', key: `s${++key}`, assetId: asset.id, pin: version.label });
    }
    return out;
  };
  const groups: { name: string; purpose: string; units: GrossprojektUnit[] }[] = [];
  const own = unitsOf(collection.items);
  for (let i = 0; i < own.length; i += QUARTER_SLOTS) {
    const part = Math.floor(i / QUARTER_SLOTS) + 1, parts = Math.ceil(own.length / QUARTER_SLOTS);
    groups.push({ name: parts > 1 ? `${collection.name} ${part}` : collection.name, purpose: `Gebäude direkt in der Sammlung „${collection.name}“${parts > 1 ? ` (Teil ${part} von ${parts})` : ''}.`, units: own.slice(i, i + QUARTER_SLOTS) });
  }
  for (const child of children(input.all, collection.id)) {
    const units = unitsOf(deepItems(input.all, child));
    if (units.length) groups.push({ name: child.name, purpose: child.description.trim() || `Alles aus dem Ordner „${child.name}“.`, units });
    else skipped.push(`Ordner ${child.name}: keine Gebäude`);
  }
  if (!groups.length) fail(`„${collection.name}“ enthält keine Gebäude oder Ensembles`);
  if (groups.length > MAX_OWN_QUARTERS) { skipped.push(`${groups.length - MAX_OWN_QUARTERS} Quartiere über ${MAX_OWN_QUARTERS} ausgelassen`); groups.length = MAX_OWN_QUARTERS; }
  const cols = Math.ceil(Math.sqrt(groups.length));
  const ids = new Set<string>();
  const quartiere: Quartier[] = groups.map((g, i) => {
    let id = `q_${slug(g.name)}`.slice(0, 40);
    for (let n = 2; ids.has(id); n++) id = `q_${slug(g.name)}_${n}`.slice(0, 44);
    ids.add(id);
    return { id, name: g.name.slice(0, 80), purpose: g.purpose.slice(0, 300), kind: 'bauten', cell: [i % cols, Math.floor(i / cols)] as const, units: g.units };
  });
  const units = quartiere.reduce((n, q) => n + q.units.length, 0);
  const gp: Grossprojekt = {
    id: `gp_sammlung_${slug(collection.id)}`, own: true,
    name: collection.name.slice(0, 120),
    description: (collection.description.trim() || `Eigenes Großprojekt aus der Sammlung „${collection.name}“: ${quartiere.length} Quartier${quartiere.length === 1 ? '' : 'e'} mit ${units} Plätzen, je Quartier eine Bauphase.`).slice(0, 600),
    tags: ['eigenes-grossprojekt', 'sammlung'],
    streets: { style: input.streetStyle ?? 'kies', width: 3, lamps: true },
    spacing: 3,
    quartiere,
    phasen: quartiere.map((q, i) => ({ id: `p${i + 1}`, name: q.name, note: `Quartier „${q.name}“ aus der Sammlung.`, quartiere: [q.id] })),
  };
  return { gp, skipped };
}
