import { countBlocks } from '../../voxel/src/analysis.js';
import { transformBlockState } from '../../voxel/src/states.js';
import type { BlockState, VoxelPayload } from '../../voxel/src/types.js';
import { phaseOf } from './guide.js';
import { computeMaterials } from './materials.js';
import type { Resolution } from './compose.js';
import type { Asset, AssetVersion, Connector, Project } from './types.js';

/**
 * Gebäudekatalog (B9): building suggestions over the asset library.
 *
 * Two kinds of values, never mixed:
 *  - Angaben (declared): category, style, biome, function. Stored as facet tags
 *    "<key>:<value>" on the Asset, so persistence, backup and search keep
 *    working without a schema change. They are statements, not measurements.
 *  - Kennwerte (computed): everything derived from the immutable version
 *    payload with the shared voxel/material/guide/state rules. Heuristics
 *    (difficulty, build time) state their formula and are labelled as such.
 */
export const CATALOG_VERSION = 'gebaeudekatalog-v2';

// ------------------------------------------------------------------ facets

export type FacetKey = 'kategorie' | 'stil' | 'biom' | 'funktion';
export type BuildingFacets = Readonly<Partial<Record<FacetKey, readonly string[]>>>;

export interface FacetDefinition {
  readonly key: FacetKey;
  readonly label: string;
  /** Single choice in the editor (still stored as a list). */
  readonly single: boolean;
  readonly values: Readonly<Record<string, string>>;
}

export const FACETS: readonly FacetDefinition[] = [
  { key: 'kategorie', label: 'Kategorie', single: true, values: {
    wohnhaus: 'Wohnhaus', landwirtschaft: 'Landwirtschaft', handwerk: 'Handwerk', handel: 'Handel', sakral: 'Sakralbau',
    befestigung: 'Befestigung', infrastruktur: 'Infrastruktur', wahrzeichen: 'Wahrzeichen', dekoration: 'Dekoration',
    statue: 'Statue', farm: 'Farm (automatisch)', redstone: 'Redstone-Technik', landschaft: 'Landschaft & Bäume', basis: 'Basis',
    magie: 'Magie & Verzauberung', fahrzeug: 'Schiffe & Fahrzeuge', garten: 'Garten & Park' } },
  { key: 'stil', label: 'Stil', single: false, values: {
    mittelalterlich: 'Mittelalterlich', rustikal: 'Rustikal', modern: 'Modern', wuestenstil: 'Wüstenstil', nordisch: 'Nordisch',
    klassisch: 'Klassisch', kuestenstil: 'Küstenstil', fernoestlich: 'Fernöstlich', fantasy: 'Fantasy', antik: 'Antik',
    industriell: 'Industriell', tropisch: 'Tropisch', nether: 'Nether-Stil', end: 'End-Stil', technisch: 'Technisch (Redstone)' } },
  { key: 'biom', label: 'Biom', single: false, values: {
    ueberall: 'Überall passend', ebene: 'Ebene', wald: 'Wald', taiga: 'Taiga', gebirge: 'Gebirge', wueste: 'Wüste',
    savanne: 'Savanne', dschungel: 'Dschungel', schnee: 'Schnee', kueste: 'Küste', sumpf: 'Sumpf', ozean: 'Ozean',
    kirschhain: 'Kirschhain', pilzinsel: 'Pilzinsel', badlands: 'Tafelberge', hoehle: 'Höhle & Untergrund', nether: 'Nether', end: 'End' } },
  { key: 'funktion', label: 'Funktion', single: false, values: {
    wohnen: 'Wohnen', lagern: 'Lagern', handwerk: 'Handwerk', landwirtschaft: 'Anbau', tierhaltung: 'Tierhaltung', handel: 'Handel',
    verteidigung: 'Verteidigung', aussicht: 'Aussicht', orientierung: 'Orientierung', versammlung: 'Versammlung',
    wasserquelle: 'Wasserquelle', verbindung: 'Verbindung', deko: 'Dekoration', ressourcen: 'Ressourcen (Farm)', transport: 'Transport',
    verzaubern: 'Verzaubern', schmelzen: 'Schmelzen', sortieren: 'Sortieren', beleuchtung: 'Beleuchtung', reisen: 'Reisen & Portale',
    unterhaltung: 'Unterhaltung', handelsplatz: 'Dorfbewohner-Handel' } },
];
const FACET_KEYS = FACETS.map(f => f.key);
const facetDef = (key: FacetKey): FacetDefinition => FACETS.find(f => f.key === key)!;

/** Display label of a facet value; unknown (user typed) values are shown as written. */
export function facetLabel(key: FacetKey, value: string): string { return facetDef(key).values[value] ?? value; }

/** Facet tags for an asset, sorted and de-duplicated. */
export function facetTags(facets: BuildingFacets): string[] {
  const tags = FACET_KEYS.flatMap(k => (facets[k] ?? []).map(v => `${k}:${v.trim().toLowerCase()}`).filter(t => !t.endsWith(':')));
  return [...new Set(tags)].sort();
}

/** Declared facets parsed from tags. Tags without a known prefix stay plain tags. */
export function facetsOf(asset: Pick<Asset, 'tags'>): Record<FacetKey, string[]> {
  const out: Record<FacetKey, string[]> = { kategorie: [], stil: [], biom: [], funktion: [] };
  for (const tag of asset.tags) {
    const i = tag.indexOf(':'), key = tag.slice(0, i) as FacetKey;
    if (i > 0 && FACET_KEYS.includes(key)) out[key].push(tag.slice(i + 1));
  }
  return out;
}
/** Variant family tag "familie:<id>": buildings that differ only in material or detail. */
export const FAMILY_PREFIX = 'familie:';
export function familyOf(asset: Pick<Asset, 'tags'>): string | undefined {
  return asset.tags.find(t => t.startsWith(FAMILY_PREFIX))?.slice(FAMILY_PREFIX.length);
}
/** Derived variant tag "basis:<assetId>": the asset was made from that building (Materialvariante, B12). */
export const BASIS_PREFIX = 'basis:';
export function basisOf(asset: Pick<Asset, 'tags'>): string | undefined {
  return asset.tags.find(t => t.startsWith(BASIS_PREFIX))?.slice(BASIS_PREFIX.length);
}
const structural = (t: string) => t.startsWith(FAMILY_PREFIX) || t.startsWith(BASIS_PREFIX);
export function plainTags(asset: Pick<Asset, 'tags'>): string[] {
  return asset.tags.filter(t => { const i = t.indexOf(':'); return i <= 0 || !(FACET_KEYS.includes(t.slice(0, i) as FacetKey) || structural(t)); });
}
/** Replaces the facet tags of a tag list and keeps plain tags, the family and the basis tag. */
export function withFacets(tags: readonly string[], facets: BuildingFacets): string[] {
  return [...new Set([...plainTags({ tags }), ...tags.filter(structural), ...facetTags(facets)])].sort();
}
/**
 * All entries that are variants of one another: the variant family plus
 * material variants derived from any member (basis tag) and their base.
 * The entry itself is included; order follows the given entries.
 */
export function variantGroup<E extends { readonly asset: Pick<Asset, 'id' | 'tags'>; readonly family?: string }>(entry: E, entries: readonly E[]): E[] {
  const ids = new Set([entry.asset.id]);
  const families = new Set(entry.family ? [entry.family] : []);
  for (let changed = true; changed;) {
    changed = false;
    for (const e of entries) {
      if (ids.has(e.asset.id)) continue;
      const basis = basisOf(e.asset);
      const self = entries.find(x => ids.has(x.asset.id) && basisOf(x.asset) === e.asset.id);
      if ((e.family && families.has(e.family)) || (basis && ids.has(basis)) || self) {
        ids.add(e.asset.id); if (e.family) families.add(e.family); changed = true;
      }
    }
  }
  return entries.filter(e => ids.has(e.asset.id));
}

// ------------------------------------------------------------------ play stage

/**
 * Spielphase: from which point of a survival game the materials are realistic.
 * Computed from block ids with explicit rules (latest matching stage wins);
 * a statement about material access, not about building skill.
 */
export type Stage = 'start' | 'frueh' | 'mitte' | 'spaet';
export const STAGES: readonly Stage[] = ['start', 'frueh', 'mitte', 'spaet'];
export const STAGE_LABEL: Readonly<Record<Stage, string>> = { start: 'Erster Tag', frueh: 'Frühes Spiel', mitte: 'Mittleres Spiel', spaet: 'Spätes Spiel' };
export const STAGE_HINT: Readonly<Record<Stage, string>> = {
  start: 'Holz, Erde, Stein, Sand – mit Holz- und Steinwerkzeug erreichbar.',
  frueh: 'Ofen, Eisen, Glas, Ziegel, Wolle, Laternen – nach den ersten Höhlen und Schafen.',
  mitte: 'Diamantwerkzeug, Obsidian, Nether-Blöcke, Redstone-Technik, Beton, Kupfer, Ozeanblöcke.',
  spaet: 'Endblöcke, Leuchtfeuer, Netherit, Edelblöcke in Mengen.',
};
export const STAGE_RULES: readonly { readonly stage: Stage; readonly label: string; readonly pattern: RegExp }[] = [
  { stage: 'spaet', label: 'End-Blöcke', pattern: /^(purpur_.*|end_stone.*|end_rod|chorus_.*|shulker_box|.*_shulker_box|dragon_.*)$/ },
  { stage: 'spaet', label: 'Leuchtfeuer, Netherit, Edelsteinblöcke', pattern: /^(beacon|netherite_block|diamond_block|emerald_block|conduit|ancient_debris)$/ },
  { stage: 'mitte', label: 'Obsidian & Verzaubern', pattern: /^(obsidian|crying_obsidian|enchanting_table|ender_chest)$/ },
  { stage: 'mitte', label: 'Nether-Blöcke', pattern: /^(nether_.*|red_nether_.*|.*blackstone.*|basalt|polished_basalt|soul_.*|glowstone|quartz.*|smooth_quartz.*|chiseled_quartz.*|crimson_.*|warped_.*|shroomlight|magma_block|netherrack)$/ },
  { stage: 'mitte', label: 'Redstone-Technik', pattern: /^(observer|repeater|comparator|piston|sticky_piston|redstone_lamp|redstone_block|dispenser|dropper|daylight_detector|powered_rail|detector_rail|activator_rail)$/ },
  { stage: 'mitte', label: 'Ozean, Beton, Kupfer, Tiefenschiefer', pattern: /^(prismarine.*|dark_prismarine.*|sea_lantern|.*_concrete|.*copper.*|lightning_rod|.*deepslate.*|tuff.*|polished_tuff.*|amethyst_block|calcite)$/ },
  { stage: 'mitte', label: 'Gold, Bienen, Ton in Mengen', pattern: /^(gold_block|beehive|honey_block|.*glazed_terracotta)$/ },
  { stage: 'frueh', label: 'Eisen, Ofen, Glas', pattern: /^(iron_.*|anvil|hopper|rail|chain|lantern|cauldron|water_cauldron|blast_furnace|smithing_table|.*glass.*|.*_bed|furnace|smoker|lectern|bookshelf|stonecutter|grindstone)$/ },
  { stage: 'frueh', label: 'Gebrannte & gefärbte Blöcke', pattern: /^(bricks?.*|brick_.*|.*_wool|.*_carpet|.*terracotta|smooth_stone.*|stone_brick.*|stone_bricks|.*stone_bricks|chiseled_stone_bricks|cracked_stone_bricks|.*_banner|.*_candle|candle|mud_bricks|mud_brick.*|packed_mud|redstone_torch|redstone_wire|lever|.*_button|.*pressure_plate)$/ },
];
const RANK: Readonly<Record<Stage, number>> = { start: 0, frueh: 1, mitte: 2, spaet: 3 };
export const stageIndex = (s: Stage): number => RANK[s];
/** Stage of a single block id (namespace optional). */
export function stageOf(id: string): Stage {
  const name = id.includes(':') ? id.slice(id.indexOf(':') + 1) : id;
  let best: Stage = 'start';
  for (const r of STAGE_RULES) if (RANK[r.stage] > RANK[best] && r.pattern.test(name)) best = r.stage;
  return best;
}
/** Stage of a building and the rule labels that decided it. */
export function progressionOf(blockCounts: Readonly<Record<string, number>>): { readonly stage: Stage; readonly reasons: readonly string[] } {
  let stage: Stage = 'start';
  for (const id of Object.keys(blockCounts)) { const s = stageOf(id); if (RANK[s] > RANK[stage]) stage = s; }
  const reasons = new Set<string>();
  for (const id of Object.keys(blockCounts).sort()) {
    if (stageOf(id) !== stage) continue;
    const name = id.slice(id.indexOf(':') + 1);
    const rule = STAGE_RULES.find(r => r.stage === stage && r.pattern.test(name));
    if (rule) reasons.add(`${rule.label} (${name})`);
  }
  return { stage, reasons: [...reasons].slice(0, 6) };
}

// ------------------------------------------------------------------ analysis

export type MaterialGroup = 'holz' | 'stein' | 'glas' | 'beton' | 'wolle' | 'natur' | 'licht' | 'funktion' | 'metall' | 'fluessig' | 'schnee' | 'sonstiges';
export const MATERIAL_GROUP_LABEL: Readonly<Record<MaterialGroup, string>> = {
  holz: 'Holz', stein: 'Stein & Ziegel', glas: 'Glas', beton: 'Beton & Keramik', wolle: 'Wolle & Teppich', natur: 'Erde & Pflanzen',
  licht: 'Lichtquellen', funktion: 'Arbeits- & Lagerblöcke', metall: 'Metall', fluessig: 'Flüssigkeit', schnee: 'Schnee & Eis', sonstiges: 'Sonstiges',
};

const WOOD = /^(oak|spruce|birch|jungle|acacia|dark_oak|mangrove|cherry|pale_oak|bamboo|crimson|warped|stripped_)/;
/** Light emission by block id (Vanilla Java values); `lit` states only when lit. */
const LIGHT: Readonly<Record<string, number>> = {
  torch: 14, wall_torch: 14, soul_torch: 10, soul_wall_torch: 10, lantern: 15, soul_lantern: 10, glowstone: 15, sea_lantern: 15,
  shroomlight: 15, jack_o_lantern: 15, end_rod: 14, beacon: 15, conduit: 15, ochre_froglight: 15, verdant_froglight: 15, pearlescent_froglight: 15,
  campfire: 15, soul_campfire: 10, redstone_lamp: 15, furnace: 13, smoker: 13, blast_furnace: 13, redstone_torch: 7, redstone_wall_torch: 7, glow_lichen: 7,
};
const FUNCTION_BLOCKS = /^(chest|trapped_chest|barrel|crafting_table|furnace|blast_furnace|smoker|anvil|chipped_anvil|damaged_anvil|smithing_table|grindstone|stonecutter|loom|lectern|cartography_table|fletching_table|brewing_stand|enchanting_table|composter|cauldron|water_cauldron|bookshelf|chiseled_bookshelf|hopper|jukebox|note_block|bell|.*_bed|.*shulker_box)$/;

export function materialGroupOf(id: string): MaterialGroup {
  const name = id.startsWith('minecraft:') ? id.slice(10) : id;
  if (!id.startsWith('minecraft:')) return 'sonstiges';
  if (name === 'water' || name === 'lava' || name === 'bubble_column') return 'fluessig';
  if (Object.hasOwn(LIGHT, name) && !/^(furnace|smoker|blast_furnace)$/.test(name) || /candle$/.test(name)) return 'licht';
  if (FUNCTION_BLOCKS.test(name)) return 'funktion';
  if (/glass/.test(name)) return 'glas';
  if (/(_wool|_carpet)$/.test(name)) return 'wolle';
  if (/(concrete|terracotta)/.test(name)) return 'beton';
  if (/^(snow|snow_block|ice|packed_ice|blue_ice|powder_snow)$/.test(name)) return 'schnee';
  if (/(iron|chain|copper|lightning_rod|gold_block|anvil)/.test(name)) return 'metall';
  if (/(leaves|grass|dirt|farmland|podzol|mud$|sand$|gravel|clay$|wheat|carrots|potatoes|beetroots|cactus|sugar_cane|hay_block|melon|pumpkin|potted_|flower|fern|moss|_sapling|vine|tulip|poppy|dandelion)/.test(name)) return 'natur';
  if (WOOD.test(name) || /(_planks|_log|_wood|_door|_trapdoor|_fence|_fence_gate|_sign|ladder|scaffolding)$/.test(name)) return 'holz';
  if (/(stone|cobble|brick|andesite|diorite|granite|deepslate|tuff|blackstone|basalt|sandstone|quartz|prismarine|purpur|calcite|obsidian|end_stone|netherrack)/.test(name)) return 'stein';
  return 'sonstiges';
}

/** Villager job site blocks → profession (Java). */
const WORKSTATIONS: Readonly<Record<string, string>> = {
  blast_furnace: 'Rüstungsschmied', smoker: 'Metzger', cartography_table: 'Kartograf', brewing_stand: 'Geistlicher', composter: 'Bauer',
  barrel: 'Fischer', fletching_table: 'Pfeilmacher', cauldron: 'Gerber', water_cauldron: 'Gerber', lava_cauldron: 'Gerber', lectern: 'Bibliothekar',
  stonecutter: 'Steinmetz', loom: 'Schäfer', smithing_table: 'Werkzeugschmied', grindstone: 'Waffenschmied',
};
/** Storage slots per container block. */
const STORAGE: Readonly<Record<string, number>> = { chest: 27, trapped_chest: 27, barrel: 27, hopper: 5, dispenser: 9, dropper: 9 };

export interface Factor { readonly label: string; readonly points: number }

export interface BuildingMetrics {
  readonly catalogVersion: string;
  readonly versionId: string;
  readonly profileId: string;
  /** Width (x) × height (y) × depth (z) of the version bounds. */
  readonly size: readonly [number, number, number];
  readonly volume: number;
  /** Distinct (x, z) columns that hold at least one block. */
  readonly footprint: number;
  readonly sizeClass: 'klein' | 'mittel' | 'gross' | 'riesig';
  /** Scope by placed blocks, the common schematic-library size scale (XS … XL). */
  readonly blockClass: BlockClass;
  /** DataVersion stored in the imported file, if known ("gespeichert in"). */
  readonly dataVersion?: number;
  readonly blocks: number;
  readonly air: number;
  readonly erase: number;
  /** Placed blocks / bounding volume. */
  readonly fillRatio: number;
  readonly layers: number;
  readonly distinctStates: number;
  readonly distinctBlocks: number;
  /** Most used block ids, descending; share relative to placed blocks. */
  readonly topBlocks: readonly { readonly id: string; readonly count: number; readonly share: number }[];
  readonly groups: readonly { readonly group: MaterialGroup; readonly count: number; readonly share: number }[];
  /** Placed blocks per id; used for material similarity. */
  readonly blockCounts: Readonly<Record<string, number>>;
  readonly items: { readonly total: number; readonly lines: number; readonly slots: number; readonly shulkerBoxes: number; readonly complete: boolean; readonly assumed: number; readonly unresolved: number };
  readonly phases: { readonly structure: number; readonly gravity: number; readonly attached: number; readonly liquid: number };
  /** Cells whose placement needs a specific view direction (see needsOrientation). */
  readonly oriented: number;
  readonly transform: { readonly rotatable: boolean; readonly mirrorable: boolean; readonly unresolvedStates: readonly string[] };
  readonly beds: number;
  readonly doors: number;
  readonly windows: number;
  readonly lightSources: number;
  /** Sum of light levels of all sources; a rough brightness figure, no light simulation. */
  readonly lightSum: number;
  readonly storageSlots: number;
  readonly workstations: readonly { readonly id: string; readonly profession: string; readonly count: number }[];
  readonly connectors: readonly { readonly id: string; readonly type: string; readonly profile: string }[];
  readonly blockEntities: number;
  readonly modNamespaces: readonly string[];
  readonly difficulty: { readonly level: 1 | 2 | 3 | 4 | 5; readonly label: string; readonly factors: readonly Factor[] };
  readonly buildTime: { readonly minutes: number; readonly assumptions: string };
  /** Spielphase derived from block ids (see STAGE_RULES). */
  readonly progression: { readonly stage: Stage; readonly reasons: readonly string[] };
}

const DIFFICULTY_LABEL = ['', 'Sehr leicht', 'Leicht', 'Mittel', 'Anspruchsvoll', 'Experte'] as const;
/** Build time assumptions (survival, materials at hand, no terrain work). */
export const BUILD_TIME_MODEL = { secondsPerBlock: 1.2, secondsPerOriented: 1.5, secondsPerAir: 0.4, secondsPerLayer: 12 } as const;

/**
 * A placement needs care when the player must look in a specific direction:
 * any facing/rotation/hinge/orientation, horizontal axes, upper halves of stairs
 * and trapdoors, top slabs. Upright logs and bottom slabs are the default.
 */
export function needsOrientation(p: Readonly<Record<string, string>>): boolean {
  return p.facing !== undefined || p.rotation !== undefined || p.hinge !== undefined || p.orientation !== undefined
    || (p.axis !== undefined && p.axis !== 'y') || p.half === 'top' || p.type === 'top';
}

const nameOf = (id: string): string => id.startsWith('minecraft:') ? id.slice(10) : id;
const round = (n: number, digits = 3): number => Math.round(n * 10 ** digits) / 10 ** digits;

export type BlockClass = 'xs' | 's' | 'm' | 'l' | 'xl';
export const BLOCK_CLASS_LABEL: Readonly<Record<BlockClass, string>> = { xs: 'XS (< 500 Blöcke)', s: 'S (< 2 000)', m: 'M (< 10 000)', l: 'L (< 50 000)', xl: 'XL (≥ 50 000)' };
export function blockClassOf(blocks: number): BlockClass {
  return blocks < 500 ? 'xs' : blocks < 2000 ? 's' : blocks < 10_000 ? 'm' : blocks < 50_000 ? 'l' : 'xl';
}
export function sizeClassOf(footprint: number): BuildingMetrics['sizeClass'] {
  return footprint <= 25 ? 'klein' : footprint <= 100 ? 'mittel' : footprint <= 400 ? 'gross' : 'riesig';
}
export const SIZE_CLASS_LABEL: Readonly<Record<BuildingMetrics['sizeClass'], string>> = { klein: 'Klein (≤ 25 m²)', mittel: 'Mittel (≤ 100 m²)', gross: 'Groß (≤ 400 m²)', riesig: 'Riesig (> 400 m²)' };

function difficultyOf(m: { blocks: number; distinctStates: number; oriented: number; height: number; gravity: number; liquid: number; attached: number }): BuildingMetrics['difficulty'] {
  const factors: Factor[] = [];
  const add = (label: string, points: number) => { if (points) factors.push({ label, points }); };
  add(`${m.blocks} Blöcke`, m.blocks < 100 ? 0 : m.blocks < 300 ? 1 : m.blocks < 800 ? 2 : m.blocks < 2000 ? 3 : 4);
  add(`${m.distinctStates} verschiedene Zustände`, m.distinctStates >= 30 ? 2 : m.distinctStates >= 15 ? 1 : 0);
  const share = m.blocks ? m.oriented / m.blocks : 0;
  add(`${Math.round(share * 100)} % ausgerichtete Blöcke`, share >= 0.3 ? 2 : share >= 0.12 ? 1 : 0);
  add(`Höhe ${m.height} (Gerüst nötig)`, m.height >= 12 ? 1 : 0);
  add('Flüssigkeiten oder Schwerkraftblöcke', m.liquid + m.gravity > 0 ? 1 : 0);
  add('angebrachte Blöcke (Fackeln, Leitern …)', m.attached >= 10 ? 1 : 0);
  const raw = factors.reduce((s, f) => s + f.points, 0);
  const level = Math.min(5, 1 + Math.floor(raw / 2)) as 1 | 2 | 3 | 4 | 5;
  return { level, label: DIFFICULTY_LABEL[level], factors };
}

/**
 * Computes all metrics of one immutable version. Pure and deterministic; the
 * same version id always yields the same metrics (callers may cache by id).
 */
export function analyzeVersion(version: Pick<AssetVersion, 'id' | 'payload' | 'connectors'> & { readonly source?: AssetVersion['source'] }): BuildingMetrics {
  const payload: VoxelPayload = version.payload;
  const counted = countBlocks(payload);
  const [w, h, d] = payload.bounds.maxExclusive.map((n, i) => n - payload.bounds.min[i]!) as [number, number, number];
  const columns = new Set<string>(), ys = new Set<number>();
  const blockCounts: Record<string, number> = {}, groupCounts = new Map<MaterialGroup, number>();
  const phases = { structure: 0, gravity: 0, attached: 0, liquid: 0 };
  let oriented = 0, beds = 0, doors = 0, windows = 0, lightSources = 0, lightSum = 0, storageSlots = 0;
  const work = new Map<string, number>();
  const states = new Map<number, BlockState>();
  for (const cell of payload.cells) {
    if (cell.kind !== 'block') continue;
    const state = payload.palette[cell.paletteIndex]!, name = nameOf(state.id), p = state.properties;
    states.set(cell.paletteIndex, state);
    columns.add(`${cell.position[0]},${cell.position[2]}`); ys.add(cell.position[1]);
    blockCounts[state.id] = (blockCounts[state.id] ?? 0) + 1;
    const group = materialGroupOf(state.id); groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1);
    phases[phaseOf(state)]++;
    if (needsOrientation(p)) oriented++;
    if (name.endsWith('_bed') && p.part === 'foot') beds++;
    if (name.endsWith('_door') && p.half === 'lower') doors++;
    if (/glass/.test(name)) windows++;
    const light = LIGHT[name];
    if (light !== undefined && (p.lit === undefined || p.lit === 'true') && !(name === 'redstone_lamp' && p.lit !== 'true')) { lightSources++; lightSum += light; }
    else if (/candle$/.test(name) && p.lit === 'true') { lightSources++; lightSum += 3 * Number(p.candles ?? 1); }
    if (STORAGE[name]) storageSlots += STORAGE[name]!;
    if (WORKSTATIONS[name]) work.set(name, (work.get(name) ?? 0) + 1);
  }
  const blocks = counted.blocks;
  const share = (n: number) => blocks ? round(n / blocks) : 0;
  const topBlocks = Object.entries(blockCounts).sort(([a, x], [b, y]) => y - x || (a < b ? -1 : 1)).slice(0, 12).map(([id, count]) => ({ id, count, share: share(count) }));
  const groups = [...groupCounts.entries()].sort(([a, x], [b, y]) => y - x || (a < b ? -1 : 1)).map(([group, count]) => ({ group, count, share: share(count) }));

  const report = computeMaterials(payload);
  // One quarter turn and one mirror cover every discrete transform (B7 rules compose).
  const unresolvedStates = new Set<string>();
  let rotUnresolved = false, mirUnresolved = false;
  for (const state of states.values()) {
    const rot = transformBlockState(state, { position: [0, 0, 0], quarterTurns: 1, mirrorX: false }).resolved;
    const mir = transformBlockState(state, { position: [0, 0, 0], quarterTurns: 0, mirrorX: true }).resolved;
    if (!rot) rotUnresolved = true;
    if (!mir) mirUnresolved = true;
    if (!rot || !mir) unresolvedStates.add(state.id);
  }
  const mods = [...new Set([...states.values()].map(s => s.id.split(':')[0]!).filter(ns => ns !== 'minecraft'))].sort();
  const footprint = columns.size;
  const m = BUILD_TIME_MODEL;
  const seconds = blocks * m.secondsPerBlock + oriented * m.secondsPerOriented + counted.air * m.secondsPerAir + ys.size * m.secondsPerLayer;
  return {
    catalogVersion: CATALOG_VERSION, versionId: version.id, profileId: payload.profileId,
    size: [w, h, d], volume: w * h * d, footprint, sizeClass: sizeClassOf(footprint), blockClass: blockClassOf(blocks),
    ...(version.source?.dataVersion !== undefined && { dataVersion: version.source.dataVersion }),
    blocks, air: counted.air, erase: counted.erase, fillRatio: w * h * d ? round(blocks / (w * h * d)) : 0, layers: ys.size,
    distinctStates: counted.states.length, distinctBlocks: Object.keys(blockCounts).length, topBlocks, groups, blockCounts,
    items: { total: report.totals.items, lines: report.items.length, slots: report.totals.slots, shulkerBoxes: report.totals.shulkerBoxes, complete: report.complete,
      assumed: report.items.filter(i => i.confidence === 'assumed').length, unresolved: report.unresolved.reduce((s, u) => s + u.count, 0) },
    phases, oriented,
    transform: { rotatable: !rotUnresolved, mirrorable: !mirUnresolved, unresolvedStates: [...unresolvedStates].sort() },
    beds, doors, windows, lightSources, lightSum, storageSlots,
    workstations: [...work.entries()].sort(([a], [b]) => a < b ? -1 : 1).map(([id, count]) => ({ id: `minecraft:${id}`, profession: WORKSTATIONS[id]!, count })),
    connectors: version.connectors.map(c => ({ id: c.id, type: c.type, profile: c.profile })),
    blockEntities: payload.blockEntities.length, modNamespaces: mods,
    difficulty: difficultyOf({ blocks, distinctStates: counted.states.length, oriented, height: h, ...phases }),
    progression: progressionOf(blockCounts),
    buildTime: { minutes: Math.max(1, Math.round(seconds / 60)),
      assumptions: `Schätzung: ${m.secondsPerBlock} s je Block, +${m.secondsPerOriented} s je ausgerichtetem Block, ${m.secondsPerAir} s je freizuräumender Luftzelle, ${m.secondsPerLayer} s je Schicht; Überlebensmodus, Material griffbereit, ohne Geländearbeit und Materialbeschaffung.` },
  };
}

// ------------------------------------------------------------------ entries and queries

export interface CatalogEntry {
  readonly asset: Asset;
  readonly version: AssetVersion;
  readonly facets: Readonly<Record<FacetKey, readonly string[]>>;
  readonly tags: readonly string[];
  readonly metrics: BuildingMetrics;
  /** Variant family id from the "familie:" tag. */
  readonly family?: string;
}

/**
 * One entry per asset with its latest version. Assets whose latest version is
 * missing are skipped and reported in `missing` (never shown as empty success).
 */
export function buildCatalog(assets: readonly Asset[], versions: ReadonlyMap<string, AssetVersion>, cache?: Map<string, BuildingMetrics>): { entries: CatalogEntry[]; missing: Asset[] } {
  const entries: CatalogEntry[] = [], missing: Asset[] = [];
  for (const asset of assets) {
    const version = versions.get(asset.versionIds.at(-1) ?? '');
    if (!version) { missing.push(asset); continue; }
    let metrics = cache?.get(version.id);
    if (!metrics) { metrics = analyzeVersion(version); cache?.set(version.id, metrics); }
    const family = familyOf(asset);
    entries.push({ asset, version, facets: facetsOf(asset), tags: plainTags(asset), metrics, ...(family && { family }) });
  }
  return { entries, missing };
}

export type SortKey = 'name' | 'blocks' | 'footprint' | 'height' | 'difficulty' | 'buildTime' | 'items' | 'stage' | 'newest' | 'match';
export const SORT_LABEL: Readonly<Record<SortKey, string>> = {
  match: 'Passend zum Projekt', name: 'Name', blocks: 'Blockanzahl', footprint: 'Grundfläche', height: 'Höhe',
  difficulty: 'Schwierigkeit', buildTime: 'Bauzeit (Schätzung)', items: 'Bauitems', stage: 'Spielphase', newest: 'Zuletzt geändert',
};

export interface Plot { readonly width: number; readonly depth: number; readonly height?: number; readonly allowRotation: boolean }

export interface CatalogQuery {
  readonly text?: string;
  readonly facets?: BuildingFacets;
  readonly tags?: readonly string[];
  readonly sizeClasses?: readonly BuildingMetrics['sizeClass'][];
  readonly blockClasses?: readonly BlockClass[];
  /** Only vanilla namespaces (no mod blocks). */
  readonly vanillaOnly?: boolean;
  readonly difficultyMax?: number;
  readonly difficultyMin?: number;
  readonly maxBlocks?: number;
  readonly maxBuildMinutes?: number;
  /** Building site: fits when width/depth (optionally swapped by a quarter turn) and height fit. */
  readonly plot?: Plot;
  readonly origin?: 'alle' | 'beispiele' | 'eigene';
  readonly onlyComplete?: boolean;
  readonly withConnectors?: boolean;
  readonly connectorType?: string;
  readonly withBeds?: boolean;
  /** Only buildings reachable up to this play stage. */
  readonly stageMax?: Stage;
  /** Show one entry per variant family (the first after sorting). */
  readonly collapseFamilies?: boolean;
  readonly includeArchived?: boolean;
  readonly sort?: SortKey;
  readonly descending?: boolean;
}

export function fitsPlot(metrics: Pick<BuildingMetrics, 'size'>, plot: Plot): boolean {
  const [w, h, d] = metrics.size;
  if (plot.height !== undefined && h > plot.height) return false;
  return (w <= plot.width && d <= plot.depth) || (plot.allowRotation && d <= plot.width && w <= plot.depth);
}

function searchText(e: CatalogEntry): string {
  const facetWords = FACET_KEYS.flatMap(k => e.facets[k].flatMap(v => [v, facetLabel(k, v)]));
  return [e.asset.name, e.asset.description, ...e.tags, ...facetWords, e.family ?? '', STAGE_LABEL[e.metrics.progression.stage], e.asset.provenance.author, e.asset.provenance.source,
    ...e.metrics.topBlocks.map(b => nameOf(b.id).replace(/_/g, ' ')), ...e.metrics.workstations.map(w => w.profession)].join(' ').toLowerCase();
}

/** Matches all filters except the facet `except` (used for facet counts). */
function matches(e: CatalogEntry, q: CatalogQuery, except?: FacetKey): boolean {
  const m = e.metrics;
  if (!q.includeArchived && e.asset.archived) return false;
  if (q.origin === 'beispiele' && !e.asset.demo) return false;
  if (q.origin === 'eigene' && e.asset.demo) return false;
  for (const key of FACET_KEYS) {
    const wanted = q.facets?.[key] ?? [];
    if (key === except || !wanted.length) continue;
    // Within one facet any value matches (OR); "überall" satisfies every biome.
    const have = e.facets[key];
    if (!wanted.some(v => have.includes(v) || (key === 'biom' && have.includes('ueberall')))) return false;
  }
  if ((q.tags ?? []).some(t => !e.tags.includes(t.toLowerCase()))) return false;
  if (q.sizeClasses?.length && !q.sizeClasses.includes(m.sizeClass)) return false;
  if (q.difficultyMax !== undefined && m.difficulty.level > q.difficultyMax) return false;
  if (q.difficultyMin !== undefined && m.difficulty.level < q.difficultyMin) return false;
  if (q.maxBlocks !== undefined && m.blocks > q.maxBlocks) return false;
  if (q.maxBuildMinutes !== undefined && m.buildTime.minutes > q.maxBuildMinutes) return false;
  if (q.plot && !fitsPlot(m, q.plot)) return false;
  if (q.blockClasses?.length && !q.blockClasses.includes(m.blockClass)) return false;
  if (q.vanillaOnly && m.modNamespaces.length) return false;
  if (q.onlyComplete && !m.items.complete) return false;
  if (q.withConnectors && !m.connectors.length) return false;
  if (q.connectorType && !m.connectors.some(c => c.type === q.connectorType)) return false;
  if (q.withBeds && !m.beds) return false;
  if (q.stageMax && RANK[m.progression.stage] > RANK[q.stageMax]) return false;
  const words = (q.text ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length) { const text = searchText(e); if (!words.every(w => text.includes(w))) return false; }
  return true;
}

const SORT_VALUE: Readonly<Record<Exclude<SortKey, 'name' | 'match' | 'newest'>, (e: CatalogEntry) => number>> = {
  blocks: e => e.metrics.blocks, footprint: e => e.metrics.footprint, height: e => e.metrics.size[1],
  difficulty: e => e.metrics.difficulty.level, buildTime: e => e.metrics.buildTime.minutes, items: e => e.metrics.items.total,
  stage: e => RANK[e.metrics.progression.stage],
};

/**
 * Deterministic filter and sort. `scores` (from suggestForProject) is required
 * for sort "match"; ties always fall back to name, then id.
 */
export function queryCatalog(entries: readonly CatalogEntry[], q: CatalogQuery, scores?: ReadonlyMap<string, number>): CatalogEntry[] {
  const byName = (a: CatalogEntry, b: CatalogEntry) => a.asset.name.localeCompare(b.asset.name, 'de') || (a.asset.id < b.asset.id ? -1 : a.asset.id > b.asset.id ? 1 : 0);
  const sort = q.sort ?? 'name', dir = q.descending ? -1 : 1;
  const cmp = (a: CatalogEntry, b: CatalogEntry): number => {
    if (sort === 'name') return dir * byName(a, b);
    // Best match first, always; the direction toggle does not apply.
    if (sort === 'match') return (scores?.get(b.asset.id) ?? 0) - (scores?.get(a.asset.id) ?? 0) || byName(a, b);
    if (sort === 'newest') return dir * (a.asset.updatedAt < b.asset.updatedAt ? 1 : a.asset.updatedAt > b.asset.updatedAt ? -1 : 0) || byName(a, b);
    const f = SORT_VALUE[sort];
    return dir * (f(a) - f(b)) || byName(a, b);
  };
  const sorted = entries.filter(e => matches(e, q)).sort(cmp);
  if (!q.collapseFamilies) return sorted;
  const seen = new Set<string>();
  return sorted.filter(e => !e.family || (seen.has(e.family) ? false : (seen.add(e.family), true)));
}

/** Members of each variant family among the given entries (for "+N Varianten"). */
export function familyMembers(entries: readonly CatalogEntry[]): Map<string, CatalogEntry[]> {
  const out = new Map<string, CatalogEntry[]>();
  for (const e of entries) if (e.family) out.set(e.family, [...(out.get(e.family) ?? []), e]);
  return out;
}

/** Number of entries per facet value under all other active filters. */
export function facetCounts(entries: readonly CatalogEntry[], q: CatalogQuery): Record<FacetKey, Record<string, number>> {
  const out = { kategorie: {}, stil: {}, biom: {}, funktion: {} } as Record<FacetKey, Record<string, number>>;
  for (const key of FACET_KEYS) for (const e of entries) {
    if (!matches(e, q, key)) continue;
    for (const v of e.facets[key]) out[key][v] = (out[key][v] ?? 0) + 1;
  }
  return out;
}

// ------------------------------------------------------------------ suggestions

/** Overlap of two block distributions: Σ min(shareA, shareB), 0 … 1. */
export function materialOverlap(a: Readonly<Record<string, number>>, b: Readonly<Record<string, number>>): number {
  const ta = Object.values(a).reduce((s, n) => s + n, 0), tb = Object.values(b).reduce((s, n) => s + n, 0);
  if (!ta || !tb) return 0;
  let sum = 0;
  for (const [id, n] of Object.entries(a)) if (b[id]) sum += Math.min(n / ta, b[id]! / tb);
  return round(sum);
}

export interface ProjectContext {
  readonly projectId: string;
  readonly profileId: string;
  readonly empty: boolean;
  /** Placed blocks per id in the resolved world. */
  readonly blockCounts: Readonly<Record<string, number>>;
  /** Asset id → number of instances. */
  readonly used: Readonly<Record<string, number>>;
  /** Weighted declared facets of the used assets (per instance). */
  readonly facetWeights: Readonly<Record<FacetKey, Readonly<Record<string, number>>>>;
  /** "type|profile" of connectors that still have free capacity. */
  readonly openConnectors: readonly string[];
}

const connectorKey = (c: Pick<Connector, 'type' | 'profile'>): string => `${c.type}|${c.profile}`;

export function projectContext(project: Project, resolution: Pick<Resolution, 'world'> | null, versions: ReadonlyMap<string, AssetVersion>, assets: readonly Asset[]): ProjectContext {
  const byId = new Map(assets.map(a => [a.id, a]));
  const blockCounts: Record<string, number> = {};
  const world = resolution?.world;
  if (world) for (const c of world.cells) if (c.kind === 'block') { const id = world.palette[c.paletteIndex]!.id; blockCounts[id] = (blockCounts[id] ?? 0) + 1; }
  const used: Record<string, number> = {};
  const facetWeights = { kategorie: {}, stil: {}, biom: {}, funktion: {} } as Record<FacetKey, Record<string, number>>;
  const linkCount = new Map<string, number>();
  for (const l of project.links) for (const r of [l.a, l.b]) linkCount.set(`${r.instanceId}/${r.connectorId}`, (linkCount.get(`${r.instanceId}/${r.connectorId}`) ?? 0) + 1);
  const open = new Set<string>();
  for (const instance of project.instances) {
    const version = versions.get(instance.assetVersionId);
    if (!version) continue;
    used[version.assetId] = (used[version.assetId] ?? 0) + 1;
    const asset = byId.get(version.assetId);
    if (asset) { const f = facetsOf(asset); for (const k of FACET_KEYS) for (const v of f[k]) facetWeights[k][v] = (facetWeights[k][v] ?? 0) + 1; }
    for (const c of version.connectors) if ((linkCount.get(`${instance.id}/${c.id}`) ?? 0) < (c.maxLinks ?? 1)) open.add(connectorKey(c));
  }
  return { projectId: project.id, profileId: project.profileId, empty: project.instances.length === 0, blockCounts, used, facetWeights, openConnectors: [...open].sort() };
}

export interface Suggestion { readonly assetId: string; readonly score: number; readonly reasons: readonly Factor[]; readonly notes: readonly string[] }

/** Share (0 … 1) of the project's instances whose declared facet includes one of `values`. */
function facetShare(ctx: ProjectContext, key: FacetKey, values: readonly string[]): number {
  const total = Object.values(ctx.used).reduce((s, n) => s + n, 0);
  if (!total || !values.length) return 0;
  return Math.min(1, Math.max(0, ...values.map(v => (ctx.facetWeights[key][v] ?? 0) / total)));
}

/**
 * Explains why each entry fits the project. Points (max. 100):
 * Materialähnlichkeit 35, gleicher Stil 20, passendes Biom 15, freier
 * passender Anschluss 15, neue Kategorie 10, gleiches Profil 5; bereits
 * verwendet −10. Every point is listed as a reason; nothing is hidden.
 */
export function suggestForProject(entries: readonly CatalogEntry[], ctx: ProjectContext): Suggestion[] {
  const usedCategories = new Set(Object.keys(ctx.facetWeights.kategorie));
  return entries.map(e => {
    const reasons: Factor[] = [], notes: string[] = [];
    const add = (label: string, points: number) => { if (points) reasons.push({ label, points: Math.round(points) }); };
    const overlap = materialOverlap(e.metrics.blockCounts, ctx.blockCounts);
    add(`Materialähnlichkeit ${Math.round(overlap * 100)} %`, 35 * overlap);
    const stil = facetShare(ctx, 'stil', e.facets.stil);
    add(`Stil wie ${Math.round(stil * 100)} % der Projektbauteile`, 20 * stil);
    // "Überall passend" on either side matches every biome.
    const biom = e.facets.biom.includes('ueberall') ? (ctx.empty ? 0 : 1) : Math.min(1, facetShare(ctx, 'biom', e.facets.biom) + facetShare(ctx, 'biom', ['ueberall']));
    add(`Biom passt zu ${Math.round(biom * 100)} % der Projektbauteile`, 15 * biom);
    const mates = e.metrics.connectors.filter(c => ctx.openConnectors.includes(connectorKey(c)));
    if (mates.length) add(`Freier Anschluss passt (${[...new Set(mates.map(c => c.type))].join(', ')})`, 15);
    if (!ctx.empty && e.facets.kategorie.length && !e.facets.kategorie.some(k => usedCategories.has(k))) add('Ergänzt eine neue Kategorie', 10);
    if (e.version.payload.profileId === ctx.profileId) add('Gleiches Versionsprofil', 5);
    else notes.push(`Profil ${e.version.payload.profileId} weicht vom Projektprofil ${ctx.profileId} ab`);
    const usedCount = ctx.used[e.asset.id] ?? 0;
    if (usedCount) { add(`Bereits ${usedCount}× im Projekt`, -10); }
    if (ctx.empty) notes.push('Projekt enthält noch keine Bauteile: nur Profil und Angaben bewertet');
    if (!e.metrics.items.complete) notes.push('Materialliste unvollständig (Annahmen oder ungelöste Zustände)');
    const score = Math.max(0, Math.min(100, reasons.reduce((s, r) => s + r.points, 0)));
    return { assetId: e.asset.id, score, reasons, notes };
  }).sort((a, b) => b.score - a.score || (a.assetId < b.assetId ? -1 : 1));
}

export interface Similar { readonly entry: CatalogEntry; readonly score: number; readonly reasons: readonly string[] }

/** Similar buildings: material 50, category 20, style 20, biome 10. */
export function similarEntries(target: CatalogEntry, entries: readonly CatalogEntry[], limit = 4): Similar[] {
  const shared = (k: FacetKey) => target.facets[k].filter(v => v !== 'ueberall');
  return entries.filter(e => e.asset.id !== target.asset.id && !e.asset.archived).map(e => {
    const reasons: string[] = [];
    const overlap = materialOverlap(target.metrics.blockCounts, e.metrics.blockCounts);
    let score = 50 * overlap;
    if (overlap >= 0.1) reasons.push(`${Math.round(overlap * 100)} % gleiche Materialien`);
    const same = (k: FacetKey, points: number) => {
      const hit = shared(k).filter(v => e.facets[k].includes(v));
      if (hit.length) { score += points; reasons.push(hit.map(v => facetLabel(k, v)).join(', ')); }
    };
    same('kategorie', 20); same('stil', 20); same('biom', 10);
    return { entry: e, score: Math.round(score), reasons };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score || a.entry.asset.name.localeCompare(b.entry.asset.name, 'de')).slice(0, limit);
}
