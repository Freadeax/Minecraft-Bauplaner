import { noise } from '../build/plot.js';
import { pick } from '../build/style.js';
import type { Look, Mix } from '../build/style.js';

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
  /**
   * LIB-05 Baustil: material mixes per role (always applied, independent of
   * weathering) and the wood of eaves, verge boards, brackets and shutters.
   */
  readonly mix: { readonly wall: Mix; readonly base: Mix; readonly roof: Mix };
  readonly trimWood: string;
  readonly shutterWood: string;
  /** Shutters and flower boxes suit the style. */
  readonly shutters: boolean;
}

const trim = (full: string, form: string, wall: string | null = `${form}_wall`): Trim => ({ full, stairs: `${form}_stairs`, slab: `${form}_slab`, wall });

const STYLE_DEFS: readonly Omit<Style, 'short'>[] = [
  { key: 'mittelalter', label: 'Mittelalter (Stein)', stil: ['mittelalterlich'], biom: ['ebene', 'wald', 'gebirge'],
    wall: 'stone_bricks', corner: 'cobblestone', base: trim('cobblestone', 'cobblestone'), trim: trim('stone_bricks', 'stone_brick'),
    roof: trim('dark_oak_planks', 'dark_oak', null), floor: 'spruce_planks', wood: 'spruce', beam: 'stripped_spruce_log', window: 'glass_pane', light: 'lantern', bed: 'red',
    aged: { stone_bricks: ['mossy_stone_bricks', 'cracked_stone_bricks'], cobblestone: ['mossy_cobblestone'] },
    mix: { wall: [['stone_bricks', 10], ['mossy_stone_bricks', 2], ['cracked_stone_bricks', 2], ['andesite', 2], ['cobblestone', 1]],
      base: [['cobblestone', 6], ['mossy_cobblestone', 2], ['andesite', 2], ['stone', 1]], roof: [['dark_oak_planks', 1]] },
    trimWood: 'spruce', shutterWood: 'spruce', shutters: true },
  { key: 'fachwerk', label: 'Fachwerk', stil: ['mittelalterlich', 'rustikal'], biom: ['ebene', 'wald'],
    wall: 'calcite', corner: 'stripped_spruce_log', base: trim('stone_bricks', 'stone_brick'), trim: trim('stone_bricks', 'stone_brick'),
    roof: trim('deepslate_tiles', 'deepslate_tile'), floor: 'spruce_planks', wood: 'spruce', beam: 'stripped_spruce_log', window: 'glass_pane', light: 'lantern', bed: 'red',
    aged: { stone_bricks: ['mossy_stone_bricks', 'cracked_stone_bricks'] },
    mix: { wall: [['calcite', 6], ['white_concrete', 2], ['diorite', 2]],
      base: [['stone_bricks', 10], ['mossy_stone_bricks', 3], ['cracked_stone_bricks', 2], ['andesite', 2], ['cobblestone', 1]], roof: [['deepslate_tiles', 5], ['cracked_deepslate_tiles', 1]] },
    trimWood: 'dark_oak', shutterWood: 'spruce', shutters: true },
  { key: 'nordisch', label: 'Nordisch (Fichte)', stil: ['nordisch', 'rustikal'], biom: ['taiga', 'schnee'],
    wall: 'spruce_planks', corner: 'spruce_log', base: trim('cobbled_deepslate', 'cobbled_deepslate'), trim: trim('cobbled_deepslate', 'cobbled_deepslate'),
    roof: trim('deepslate_tiles', 'deepslate_tile'), floor: 'spruce_planks', wood: 'spruce', beam: 'stripped_spruce_log', window: 'glass_pane', light: 'lantern', bed: 'blue',
    aged: { cobbled_deepslate: ['deepslate_bricks', 'cracked_deepslate_bricks'] },
    mix: { wall: [['spruce_planks', 6], ['stripped_spruce_wood', 1]], base: [['cobbled_deepslate', 6], ['deepslate_bricks', 3], ['cracked_deepslate_bricks', 1], ['deepslate_tiles', 1]],
      roof: [['deepslate_tiles', 4], ['cobbled_deepslate', 1]] },
    trimWood: 'dark_oak', shutterWood: 'spruce', shutters: true },
  { key: 'wueste', label: 'Wüste (Sandstein)', stil: ['wuestenstil'], biom: ['wueste', 'savanne'],
    wall: 'smooth_sandstone', corner: 'cut_sandstone', base: trim('sandstone', 'sandstone'), trim: trim('sandstone', 'sandstone'),
    roof: trim('cut_sandstone', 'smooth_sandstone', null), floor: 'acacia_planks', wood: 'acacia', beam: 'stripped_acacia_log', window: 'glass_pane', light: 'lantern', bed: 'orange',
    aged: { smooth_sandstone: ['sandstone'], sandstone: ['smooth_sandstone'] }, flat: true,
    mix: { wall: [['smooth_sandstone', 8], ['sandstone', 1]], base: [['sandstone', 5], ['smooth_sandstone', 2], ['cut_sandstone', 1]], roof: [['cut_sandstone', 1]] },
    trimWood: 'acacia', shutterWood: 'acacia', shutters: false },
  { key: 'fernost', label: 'Fernost (Kirsche)', stil: ['fernoestlich'], biom: ['kirschhain', 'gebirge'],
    wall: 'cherry_planks', corner: 'stripped_dark_oak_log', base: trim('stone_bricks', 'stone_brick'), trim: trim('mud_bricks', 'mud_brick'),
    roof: trim('deepslate_tiles', 'deepslate_tile'), floor: 'dark_oak_planks', wood: 'cherry', beam: 'stripped_cherry_log', window: 'glass_pane', light: 'lantern', bed: 'pink',
    aged: { stone_bricks: ['mossy_stone_bricks'] },
    mix: { wall: [['cherry_planks', 5], ['birch_planks', 1]], base: [['stone_bricks', 6], ['mossy_stone_bricks', 2], ['andesite', 1]], roof: [['deepslate_tiles', 1]] },
    trimWood: 'dark_oak', shutterWood: 'cherry', shutters: true },
  { key: 'modern', label: 'Modern (Beton)', stil: ['modern'], biom: ['ueberall'],
    wall: 'white_concrete', corner: 'light_gray_concrete', base: trim('smooth_quartz', 'smooth_quartz', null), trim: trim('quartz_block', 'quartz', null),
    roof: trim('smooth_quartz', 'smooth_quartz', null), floor: 'birch_planks', wood: 'birch', beam: 'light_gray_concrete', window: 'glass_pane', light: 'lantern', bed: 'light_gray',
    aged: {}, flat: true,
    mix: { wall: [['white_concrete', 1]], base: [['smooth_quartz', 1]], roof: [['smooth_quartz', 1]] },
    trimWood: 'birch', shutterWood: 'birch', shutters: false },
  { key: 'antik', label: 'Antik (Quarz)', stil: ['antik', 'klassisch'], biom: ['ueberall'],
    wall: 'quartz_block', corner: 'quartz_pillar', base: trim('smooth_quartz', 'smooth_quartz', null), trim: trim('quartz_block', 'quartz', null),
    roof: trim('bricks', 'brick'), floor: 'smooth_quartz', wood: 'birch', beam: 'quartz_pillar', window: 'glass_pane', light: 'lantern', bed: 'white',
    aged: {},
    mix: { wall: [['quartz_block', 6], ['quartz_bricks', 2], ['smooth_quartz', 1]], base: [['smooth_quartz', 3], ['polished_diorite', 1]], roof: [['bricks', 4], ['granite', 1]] },
    trimWood: 'spruce', shutterWood: 'birch', shutters: false },
  { key: 'nether', label: 'Nether (Netherziegel)', stil: ['nether', 'fantasy'], biom: ['nether'],
    wall: 'nether_bricks', corner: 'red_nether_bricks', base: trim('polished_blackstone', 'polished_blackstone'), trim: trim('nether_bricks', 'nether_brick'),
    roof: trim('crimson_planks', 'crimson', null), floor: 'crimson_planks', wood: 'crimson', beam: 'crimson_stem', window: 'iron_bars', light: 'soul_lantern', bed: 'red',
    aged: { nether_bricks: ['cracked_nether_bricks'], polished_blackstone: ['blackstone'] },
    mix: { wall: [['nether_bricks', 6], ['cracked_nether_bricks', 1], ['chiseled_nether_bricks', 1]], base: [['polished_blackstone', 4], ['blackstone', 2], ['polished_blackstone_bricks', 2]], roof: [['crimson_planks', 1]] },
    trimWood: 'crimson', shutterWood: 'crimson', shutters: false },
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

/** Block of a role mix at a cell (LIB-05); `seed` is the generator's variant. */
export const mixed = (mix: Mix, seed: number, x: number, y: number, z: number): string => pick(mix, x, y, z, seed);

/** The style as a look of the shared design kit (build/style.ts). */
export function lookOfStyle(s: Style): Look {
  return {
    key: s.key, label: s.label, base: s.mix.base, baseStairs: s.base.stairs, baseSlab: s.base.slab, baseWall: s.base.wall ?? s.trim.wall ?? `${s.wood}_fence`,
    wall: s.mix.wall, frame: s.beam, roof: s.mix.roof, roofStairs: s.roof.stairs, roofSlab: s.roof.slab,
    trim: s.trimWood, shutter: s.shutterWood, door: s.wood, floor: s.floor, window: s.window, light: s.light,
  };
}
