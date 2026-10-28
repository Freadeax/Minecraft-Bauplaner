import { noise } from '../build/plot.js';

/**
 * Stilpaletten der Generatoren (B13): one coherent material set per building
 * style. Generators never pick blocks themselves, they ask the palette for a
 * role (wall, corner, roof stairs …), so every generator speaks every style.
 * Every id here exists in Java Edition with the forms used (stairs, slab,
 * wall); the tests check that all of them have a catalogue item and recipe.
 */
export interface Trim { readonly full: string; readonly stairs: string; readonly slab: string; readonly wall: string | null }

export interface Style {
  readonly key: string;
  readonly label: string;
  /** Label without the material hint, for generated names. */
  readonly short: string;
  /** Catalogue facet values (catalog.ts FACETS). */
  readonly stil: readonly string[];
  readonly biom: readonly string[];
  /** Main wall block. */
  readonly wall: string;
  /** Corner posts and pillars; logs are placed upright. */
  readonly corner: string;
  /** Foundation, plinth and bridge piers. */
  readonly base: Trim;
  /** Wall trim: window sills, arches, railings, parapets. */
  readonly trim: Trim;
  readonly roof: Trim;
  readonly floor: string;
  /** Wood key for doors, trapdoors, fences, ladders' neighbours (oak, spruce …). */
  readonly wood: string;
  /** Horizontal beams (timber framing, bridge stringers); logs get an axis. */
  readonly beam: string;
  readonly window: string;
  readonly light: string;
  readonly bed: string;
  /** Weathering: block → aged variants picked by deterministic noise. */
  readonly aged: Readonly<Record<string, readonly string[]>>;
  /** Flat roofs suit this style better than pitched ones. */
  readonly flat?: boolean;
}

const trim = (full: string, form: string, wall: string | null = `${form}_wall`): Trim => ({ full, stairs: `${form}_stairs`, slab: `${form}_slab`, wall });

const STYLE_DEFS: readonly Omit<Style, 'short'>[] = [
  { key: 'mittelalter', label: 'Mittelalter (Stein)', stil: ['mittelalterlich'], biom: ['ebene', 'wald', 'gebirge'],
    wall: 'stone_bricks', corner: 'cobblestone', base: trim('cobblestone', 'cobblestone'), trim: trim('stone_bricks', 'stone_brick'),
    roof: trim('dark_oak_planks', 'dark_oak', null), floor: 'spruce_planks', wood: 'spruce', beam: 'spruce_log', window: 'glass_pane', light: 'lantern', bed: 'red',
    aged: { stone_bricks: ['mossy_stone_bricks', 'cracked_stone_bricks'], cobblestone: ['mossy_cobblestone'] } },
  { key: 'fachwerk', label: 'Fachwerk', stil: ['mittelalterlich', 'rustikal'], biom: ['ebene', 'wald'],
    wall: 'white_terracotta', corner: 'dark_oak_log', base: trim('cobblestone', 'cobblestone'), trim: trim('cobblestone', 'cobblestone'),
    roof: trim('spruce_planks', 'spruce', null), floor: 'oak_planks', wood: 'dark_oak', beam: 'dark_oak_log', window: 'glass_pane', light: 'lantern', bed: 'red',
    aged: { cobblestone: ['mossy_cobblestone'] } },
  { key: 'nordisch', label: 'Nordisch (Fichte)', stil: ['nordisch', 'rustikal'], biom: ['taiga', 'schnee'],
    wall: 'spruce_planks', corner: 'spruce_log', base: trim('cobbled_deepslate', 'cobbled_deepslate'), trim: trim('cobbled_deepslate', 'cobbled_deepslate'),
    roof: trim('deepslate_tiles', 'deepslate_tile'), floor: 'spruce_planks', wood: 'spruce', beam: 'stripped_spruce_log', window: 'glass_pane', light: 'lantern', bed: 'blue',
    aged: { cobbled_deepslate: ['deepslate_bricks', 'cracked_deepslate_bricks'] } },
  { key: 'wueste', label: 'Wüste (Sandstein)', stil: ['wuestenstil'], biom: ['wueste', 'savanne'],
    wall: 'smooth_sandstone', corner: 'cut_sandstone', base: trim('sandstone', 'sandstone'), trim: trim('sandstone', 'sandstone'),
    roof: trim('cut_sandstone', 'smooth_sandstone', null), floor: 'acacia_planks', wood: 'acacia', beam: 'stripped_acacia_log', window: 'glass_pane', light: 'lantern', bed: 'orange',
    aged: { smooth_sandstone: ['sandstone'], sandstone: ['smooth_sandstone'] }, flat: true },
  { key: 'fernost', label: 'Fernost (Kirsche)', stil: ['fernoestlich'], biom: ['kirschhain', 'gebirge'],
    wall: 'cherry_planks', corner: 'stripped_dark_oak_log', base: trim('stone_bricks', 'stone_brick'), trim: trim('mud_bricks', 'mud_brick'),
    roof: trim('deepslate_tiles', 'deepslate_tile'), floor: 'dark_oak_planks', wood: 'cherry', beam: 'stripped_cherry_log', window: 'glass_pane', light: 'lantern', bed: 'pink',
    aged: { stone_bricks: ['mossy_stone_bricks'] } },
  { key: 'modern', label: 'Modern (Beton)', stil: ['modern'], biom: ['ueberall'],
    wall: 'white_concrete', corner: 'light_gray_concrete', base: trim('smooth_quartz', 'smooth_quartz', null), trim: trim('quartz_block', 'quartz', null),
    roof: trim('smooth_quartz', 'smooth_quartz', null), floor: 'birch_planks', wood: 'birch', beam: 'light_gray_concrete', window: 'glass_pane', light: 'lantern', bed: 'light_gray',
    aged: {}, flat: true },
  { key: 'antik', label: 'Antik (Quarz)', stil: ['antik', 'klassisch'], biom: ['ueberall'],
    wall: 'quartz_block', corner: 'quartz_pillar', base: trim('smooth_quartz', 'smooth_quartz', null), trim: trim('quartz_block', 'quartz', null),
    roof: trim('bricks', 'brick'), floor: 'smooth_quartz', wood: 'birch', beam: 'quartz_pillar', window: 'glass_pane', light: 'lantern', bed: 'white',
    aged: {} },
  { key: 'nether', label: 'Nether (Netherziegel)', stil: ['nether', 'fantasy'], biom: ['nether'],
    wall: 'nether_bricks', corner: 'red_nether_bricks', base: trim('polished_blackstone', 'polished_blackstone'), trim: trim('nether_bricks', 'nether_brick'),
    roof: trim('crimson_planks', 'crimson', null), floor: 'crimson_planks', wood: 'crimson', beam: 'crimson_stem', window: 'iron_bars', light: 'soul_lantern', bed: 'red',
    aged: { nether_bricks: ['cracked_nether_bricks'], polished_blackstone: ['blackstone'] } },
];
export const STYLES: readonly Style[] = STYLE_DEFS.map(s => ({ ...s, short: s.label.replace(/ \(.*\)$/, '') }));
export const STYLE_OPTIONS = STYLES.map(s => ({ value: s.key, label: s.label }));
export function styleOf(key: string): Style {
  const s = STYLES.find(x => x.key === key);
  if (!s) throw new Error(`Stil ${key} unbekannt`);
  return s;
}

/** Upright pillars and beams need an axis; everything else has no properties. */
export const isAxial = (id: string): boolean => /(_log|_stem|_wood|_hyphae|_pillar|basalt)$/.test(id);

/**
 * Picks an aged variant for `id` at a position: `percent` of the cells change,
 * decided by deterministic noise mixed with `seed` (no Math.random).
 */
export function aged(style: Style, id: string, percent: number, seed: number, x: number, y: number, z: number): string {
  const options = style.aged[id];
  if (!options?.length || percent <= 0) return id;
  const n = noise(x + seed * 31, y + seed * 17, z + seed * 7);
  if (n >= percent / 100) return id;
  return options[Math.floor(noise(z + seed, x, y + seed) * options.length)]!;
}
