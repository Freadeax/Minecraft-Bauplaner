import { DomainError } from './types.js';
import { stackSizeOf } from './materials.js';
import type { MaterialReport } from './materials.js';

/**
 * Raw materials and crafting trees (rest of R-017, B1-R). Builds on the build
 * items of `materials.ts`: every item line is expanded through an explicit
 * Vanilla Java recipe catalogue down to gathered raw materials.
 *
 * Rules:
 *  - one recipe per item, chosen deterministically (stonecutter preferred when
 *    `method` is 'stonecutter', otherwise crafting/smelting);
 *  - items are processed consumers-first (topological order), so all demand of
 *    an intermediate is known before its crafts are rounded up – leftovers of
 *    one rounding (e.g. planks for sticks) are shared, never counted twice;
 *  - tag ingredients (“any planks”) take the matching variant that already
 *    occurs in the tree, otherwise a documented default;
 *  - items without recipe and without raw-material entry stay visible as
 *    'unknown'; nothing is guessed silently. Fuel and tools are reported
 *    separately and never mixed into the raw materials.
 */
export const RECIPE_CATALOG_VERSION = 'vanilla-java-recipes-v1';

export type Station = 'crafting' | 'stonecutter' | 'smelting' | 'tool' | 'water';
export type RecipeMethod = 'stonecutter' | 'crafting';

export interface Ingredient { readonly item: string; readonly count: number }
export interface Recipe {
  readonly id: string;
  /** Output item id with namespace. */
  readonly output: string;
  /** Items produced per operation. */
  readonly count: number;
  /** Ingredients per operation; tag ingredients start with '#'. */
  readonly inputs: readonly Ingredient[];
  readonly station: Station;
  readonly note?: string;
}
export interface TagDefinition { readonly label: string; readonly members: readonly string[]; readonly fallback: string }

export type BaseKind = 'raw' | 'stock' | 'unknown';
export interface BaseLine {
  readonly itemId: string;
  readonly count: number;
  /** raw = gathered (source given), stock = marked as already available, unknown = neither recipe nor raw entry. */
  readonly kind: BaseKind;
  readonly source?: string;
  readonly stackSize: 1 | 16 | 64;
  readonly fullStacks: number;
  readonly remainder: number;
  readonly slots: number;
  /** Directly requested build items among the count (rest feeds recipes). */
  readonly direct: number;
}
export interface RecipeStep {
  readonly recipe: Recipe;
  readonly itemId: string;
  /** Operations (crafts, smelts, cuts). */
  readonly operations: number;
  readonly produced: number;
  readonly needed: number;
  readonly surplus: number;
  /** Ingredients consumed in total, tags resolved. */
  readonly inputs: readonly Ingredient[];
  /** True when the item is itself a build item (not only an intermediate). */
  readonly buildItem: boolean;
}
export interface TagChoice { readonly tag: string; readonly label: string; readonly chosen: string; readonly reason: 'tree' | 'fallback'; readonly count: number }
export interface RecipeReport {
  readonly catalogVersion: string;
  readonly method: RecipeMethod;
  /** Raw materials, stocked items and unknowns, sorted by count. */
  readonly base: readonly BaseLine[];
  /** Work steps in build order: ingredients are always produced before use. */
  readonly steps: readonly RecipeStep[];
  readonly surplus: readonly Ingredient[];
  /** Operations per station. */
  readonly stations: Readonly<Record<Station, number>>;
  /** Smelting operations and coal needed for them (8 per coal); not part of `base`. */
  readonly fuel: { readonly smelts: number; readonly coal: number };
  readonly tagChoices: readonly TagChoice[];
  readonly totals: { readonly raw: number; readonly stock: number; readonly unknown: number; readonly slots: number };
  readonly notes: readonly string[];
  /** True when every item reached a raw material or stock entry. */
  readonly complete: boolean;
}
export interface RecipeOptions {
  readonly method?: RecipeMethod;
  /** Items treated as available (not expanded further). Ids with or without namespace. */
  readonly stock?: Iterable<string>;
}

// ---------------------------------------------------------------------------
// Catalogue. Ids without namespace while building; '#name' for tags.

const COLORS = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
const WOODS = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak', 'mangrove', 'cherry', 'pale_oak'];
const STEMS = ['crimson', 'warped'];

const TAG_DEFS: Readonly<Record<string, TagDefinition>> = {
  planks: { label: 'beliebige Planken', members: [...WOODS, ...STEMS, 'bamboo'].map(w => `${w}_planks`), fallback: 'oak_planks' },
  logs: { label: 'beliebige Stämme', members: [...WOODS.map(w => `${w}_log`), ...STEMS.map(w => `${w}_stem`)], fallback: 'oak_log' },
  wooden_slabs: { label: 'beliebige Holzstufen', members: [...WOODS, ...STEMS, 'bamboo'].map(w => `${w}_slab`), fallback: 'oak_slab' },
  coals: { label: 'Kohle oder Holzkohle', members: ['coal', 'charcoal'], fallback: 'coal' },
  stone_crafting: { label: 'Bruchstein, Bruchtiefenschiefer oder Schwarzstein', members: ['cobblestone', 'cobbled_deepslate', 'blackstone'], fallback: 'cobblestone' },
  soul_base: { label: 'Seelensand oder Seelenerde', members: ['soul_sand', 'soul_soil'], fallback: 'soul_soil' },
};

const recipes: Recipe[] = [];
const ns = (id: string): string => id.startsWith('#') || id.includes(':') ? id : `minecraft:${id}`;
function add(station: Station, output: string, count: number, inputs: Record<string, number>, note?: string): void {
  const id = `${station}:${output}${recipes.some(r => r.id === `${station}:${output}`) ? `#${recipes.length}` : ''}`;
  recipes.push({ id, output: ns(output), count, station, inputs: Object.entries(inputs).map(([item, n]) => ({ item: ns(item), count: n })), ...(note !== undefined && { note }) });
}
const craft = (output: string, count: number, inputs: Record<string, number>, note?: string): void => add('crafting', output, count, inputs, note);
const cut = (output: string, count: number, input: string): void => add('stonecutter', output, count, { [input]: 1 });
const smelt = (output: string, input: string, note?: string): void => add('smelting', output, 1, { [input]: 1 }, note);
const tool = (output: string, input: string, note: string): void => add('tool', output, 1, { [input]: 1 }, note);

// Wood families.
function woodFamily(w: string, log: string, wood: string | null, planksPerLog = 4): void {
  const planks = `${w}_planks`;
  craft(planks, planksPerLog, { [log]: 1 }, wood ? 'auch aus Holz/entrindeten Varianten' : undefined);
  if (wood) {
    craft(wood, 3, { [log]: 4 });
    tool(`stripped_${log}`, log, 'mit Axt entrinden');
    tool(`stripped_${wood}`, wood, 'mit Axt entrinden');
  }
  craft(`${w}_stairs`, 4, { [planks]: 6 });
  craft(`${w}_slab`, 6, { [planks]: 3 });
  craft(`${w}_fence`, 3, { [planks]: 4, stick: 2 });
  craft(`${w}_fence_gate`, 1, { [planks]: 2, stick: 4 });
  craft(`${w}_door`, 3, { [planks]: 6 });
  craft(`${w}_trapdoor`, 2, { [planks]: 6 });
  craft(`${w}_button`, 1, { [planks]: 1 });
  craft(`${w}_pressure_plate`, 1, { [planks]: 2 });
  craft(`${w}_sign`, 3, { [planks]: 6, stick: 1 });
  craft(`${w}_hanging_sign`, 6, { [`stripped_${log}`]: 6, chain: 2 });
  craft(`${w}_shelf`, 6, { [`stripped_${log}`]: 6 });
}
for (const w of WOODS) woodFamily(w, `${w}_log`, `${w}_wood`);
for (const w of STEMS) woodFamily(w, `${w}_stem`, `${w}_hyphae`);
craft('bamboo_block', 1, { bamboo: 9 });
tool('stripped_bamboo_block', 'bamboo_block', 'mit Axt entrinden');
woodFamily('bamboo', 'bamboo_block', null, 2);
craft('bamboo_mosaic', 1, { bamboo_slab: 2 });
craft('stick', 4, { '#planks': 2 });

// Stone families: [base block, name prefix, has wall, has stairs].
const STONE: readonly (readonly [string, string, boolean, boolean])[] = [
  ['cobblestone', 'cobblestone', true, true], ['mossy_cobblestone', 'mossy_cobblestone', true, true], ['stone', 'stone', false, true],
  ['smooth_stone', 'smooth_stone', false, false], ['stone_bricks', 'stone_brick', true, true], ['mossy_stone_bricks', 'mossy_stone_brick', true, true],
  ['granite', 'granite', true, true], ['polished_granite', 'polished_granite', false, true], ['diorite', 'diorite', true, true],
  ['polished_diorite', 'polished_diorite', false, true], ['andesite', 'andesite', true, true], ['polished_andesite', 'polished_andesite', false, true],
  ['cobbled_deepslate', 'cobbled_deepslate', true, true], ['polished_deepslate', 'polished_deepslate', true, true],
  ['deepslate_bricks', 'deepslate_brick', true, true], ['deepslate_tiles', 'deepslate_tile', true, true],
  ['sandstone', 'sandstone', true, true], ['smooth_sandstone', 'smooth_sandstone', false, true], ['cut_sandstone', 'cut_sandstone', false, false],
  ['red_sandstone', 'red_sandstone', true, true], ['smooth_red_sandstone', 'smooth_red_sandstone', false, true], ['cut_red_sandstone', 'cut_red_sandstone', false, false],
  ['bricks', 'brick', true, true], ['mud_bricks', 'mud_brick', true, true], ['nether_bricks', 'nether_brick', true, true],
  ['red_nether_bricks', 'red_nether_brick', true, true], ['blackstone', 'blackstone', true, true], ['polished_blackstone', 'polished_blackstone', true, true],
  ['polished_blackstone_bricks', 'polished_blackstone_brick', true, true], ['end_stone_bricks', 'end_stone_brick', true, true],
  ['purpur_block', 'purpur', false, true], ['quartz_block', 'quartz', false, true], ['smooth_quartz', 'smooth_quartz', false, true],
  ['prismarine', 'prismarine', true, true], ['prismarine_bricks', 'prismarine_brick', false, true], ['dark_prismarine', 'dark_prismarine', false, true],
  ['tuff', 'tuff', true, true], ['polished_tuff', 'polished_tuff', true, true], ['tuff_bricks', 'tuff_brick', true, true],
  ['cut_copper', 'cut_copper', false, true],
];
for (const [base, prefix, wall, stairs] of STONE) {
  if (stairs) { craft(`${prefix}_stairs`, 4, { [base]: 6 }); cut(`${prefix}_stairs`, 1, base); }
  craft(`${prefix}_slab`, 6, { [base]: 3 }); cut(`${prefix}_slab`, 2, base);
  if (wall) { craft(`${prefix}_wall`, 6, { [base]: 6 }); cut(`${prefix}_wall`, 1, base); }
}
/** Block → block conversions: 2×2 crafting (4 → n) and, where m > 0, stonecutter (1 → m). */
const POLISH: readonly (readonly [string, string, number, number])[] = [
  ['stone_bricks', 'stone', 4, 1], ['polished_granite', 'granite', 4, 1], ['polished_diorite', 'diorite', 4, 1], ['polished_andesite', 'andesite', 4, 1],
  ['polished_deepslate', 'cobbled_deepslate', 4, 1], ['deepslate_bricks', 'polished_deepslate', 4, 1], ['deepslate_tiles', 'deepslate_bricks', 4, 1],
  ['cut_sandstone', 'sandstone', 4, 1], ['cut_red_sandstone', 'red_sandstone', 4, 1], ['polished_blackstone', 'blackstone', 4, 1],
  ['polished_blackstone_bricks', 'polished_blackstone', 4, 1], ['end_stone_bricks', 'end_stone', 4, 1], ['polished_basalt', 'basalt', 4, 1],
  ['polished_tuff', 'tuff', 4, 1], ['tuff_bricks', 'polished_tuff', 4, 1], ['cut_copper', 'copper_block', 4, 4], ['mud_bricks', 'packed_mud', 4, 0],
];
for (const [out, from, crafted, cutCount] of POLISH) { craft(out, crafted, { [from]: 4 }); if (cutCount) cut(out, cutCount, from); }
const CHISELED: readonly (readonly [string, string, string])[] = [
  ['chiseled_stone_bricks', 'stone_brick_slab', 'stone_bricks'], ['chiseled_sandstone', 'sandstone_slab', 'sandstone'],
  ['chiseled_red_sandstone', 'red_sandstone_slab', 'red_sandstone'], ['chiseled_polished_blackstone', 'polished_blackstone_slab', 'polished_blackstone'],
  ['chiseled_quartz_block', 'quartz_slab', 'quartz_block'], ['chiseled_deepslate', 'cobbled_deepslate_slab', 'cobbled_deepslate'],
  ['chiseled_tuff', 'tuff_slab', 'tuff'], ['chiseled_tuff_bricks', 'tuff_brick_slab', 'tuff_bricks'], ['chiseled_nether_bricks', 'nether_brick_slab', 'nether_bricks'],
];
for (const [out, slab, block] of CHISELED) { craft(out, 1, { [slab]: 2 }); cut(out, 1, block); }
craft('quartz_pillar', 2, { quartz_block: 2 }); cut('quartz_pillar', 1, 'quartz_block');
craft('purpur_pillar', 1, { purpur_slab: 2 }); cut('purpur_pillar', 1, 'purpur_block');
craft('quartz_bricks', 1, { quartz_block: 4 }); cut('quartz_bricks', 1, 'quartz_block');
craft('stone_button', 1, { stone: 1 }); craft('stone_pressure_plate', 1, { stone: 2 });
craft('polished_blackstone_button', 1, { polished_blackstone: 1 }); craft('polished_blackstone_pressure_plate', 1, { polished_blackstone: 2 });

// Smelting.
for (const [out, from] of [['stone', 'cobblestone'], ['smooth_stone', 'stone'], ['deepslate', 'cobbled_deepslate'], ['glass', 'sand'], ['smooth_sandstone', 'sandstone'],
  ['smooth_red_sandstone', 'red_sandstone'], ['smooth_quartz', 'quartz_block'], ['smooth_basalt', 'basalt'], ['brick', 'clay_ball'], ['nether_brick', 'netherrack'],
  ['terracotta', 'clay'], ['cracked_stone_bricks', 'stone_bricks'], ['cracked_deepslate_bricks', 'deepslate_bricks'], ['cracked_deepslate_tiles', 'deepslate_tiles'],
  ['cracked_nether_bricks', 'nether_bricks'], ['cracked_polished_blackstone_bricks', 'polished_blackstone_bricks'], ['iron_ingot', 'raw_iron'], ['gold_ingot', 'raw_gold'],
  ['copper_ingot', 'raw_copper'], ['popped_chorus_fruit', 'chorus_fruit'], ['dried_kelp', 'kelp'], ['green_dye', 'cactus'], ['sponge', 'wet_sponge'],
  ['charcoal', '#logs']] as const) smelt(out, from);

// Colours.
craft('bone_meal', 3, { bone: 1 });
craft('white_dye', 1, { bone_meal: 1 }); craft('black_dye', 1, { ink_sac: 1 }); craft('blue_dye', 1, { lapis_lazuli: 1 }); craft('brown_dye', 1, { cocoa_beans: 1 });
craft('red_dye', 1, { poppy: 1 }); craft('yellow_dye', 1, { dandelion: 1 });
craft('orange_dye', 2, { red_dye: 1, yellow_dye: 1 }); craft('light_blue_dye', 2, { blue_dye: 1, white_dye: 1 }); craft('pink_dye', 2, { red_dye: 1, white_dye: 1 });
craft('lime_dye', 2, { green_dye: 1, white_dye: 1 }); craft('gray_dye', 2, { black_dye: 1, white_dye: 1 }); craft('light_gray_dye', 2, { gray_dye: 1, white_dye: 1 });
craft('cyan_dye', 2, { blue_dye: 1, green_dye: 1 }); craft('purple_dye', 2, { blue_dye: 1, red_dye: 1 }); craft('magenta_dye', 2, { purple_dye: 1, pink_dye: 1 });
for (const c of COLORS) {
  const dye = `${c}_dye`;
  if (c !== 'white') craft(`${c}_wool`, 1, { white_wool: 1, [dye]: 1 });
  craft(`${c}_carpet`, 3, { [`${c}_wool`]: 2 });
  craft(`${c}_bed`, 1, { [`${c}_wool`]: 3, '#planks': 3 });
  craft(`${c}_banner`, 1, { [`${c}_wool`]: 6, stick: 1 });
  craft(`${c}_concrete_powder`, 8, { sand: 4, gravel: 4, [dye]: 1 });
  add('water', `${c}_concrete`, 1, { [`${c}_concrete_powder`]: 1 }, 'Trockenbeton mit Wasser aushärten');
  craft(`${c}_terracotta`, 8, { terracotta: 8, [dye]: 1 });
  smelt(`${c}_glazed_terracotta`, `${c}_terracotta`);
  craft(`${c}_stained_glass`, 8, { glass: 8, [dye]: 1 });
  craft(`${c}_stained_glass_pane`, 16, { [`${c}_stained_glass`]: 6 });
  craft(`${c}_candle`, 1, { candle: 1, [dye]: 1 });
  craft(`${c}_shulker_box`, 1, { shulker_box: 1, [dye]: 1 });
}

// Blocks from items, utility blocks, redstone, light.
for (const [block, item] of [['iron_block', 'iron_ingot'], ['gold_block', 'gold_ingot'], ['copper_block', 'copper_ingot'], ['diamond_block', 'diamond'], ['emerald_block', 'emerald'],
  ['lapis_block', 'lapis_lazuli'], ['redstone_block', 'redstone'], ['coal_block', 'coal'], ['hay_block', 'wheat'], ['dried_kelp_block', 'dried_kelp'],
  ['packed_ice', 'ice'], ['blue_ice', 'packed_ice'], ['bone_block', 'bone_meal'], ['slime_block', 'slime_ball'], ['raw_iron_block', 'raw_iron']] as const) craft(block, 1, { [item]: 9 });
for (const [block, item] of [['glowstone', 'glowstone_dust'], ['clay', 'clay_ball'], ['bricks', 'brick'], ['nether_bricks', 'nether_brick'], ['quartz_block', 'quartz'],
  ['snow_block', 'snowball'], ['prismarine', 'prismarine_shard'], ['amethyst_block', 'amethyst_shard'], ['sandstone', 'sand'], ['red_sandstone', 'red_sand'],
  ['honeycomb_block', 'honeycomb']] as const) craft(block, 1, { [item]: 4 });
craft('purpur_block', 4, { popped_chorus_fruit: 4 });
craft('prismarine_bricks', 1, { prismarine_shard: 9 }); craft('dark_prismarine', 1, { prismarine_shard: 8, black_dye: 1 });
craft('sea_lantern', 1, { prismarine_shard: 4, prismarine_crystals: 5 });
craft('red_nether_bricks', 1, { nether_brick: 2, nether_wart: 2 }); craft('nether_brick_fence', 6, { nether_bricks: 4, nether_brick: 2 });
craft('mossy_cobblestone', 1, { cobblestone: 1, vine: 1 }, 'alternativ Moosblock statt Ranke');
craft('mossy_stone_bricks', 1, { stone_bricks: 1, vine: 1 }, 'alternativ Moosblock statt Ranke');
craft('moss_carpet', 3, { moss_block: 2 }); craft('coarse_dirt', 4, { dirt: 2, gravel: 2 });
add('water', 'mud', 1, { dirt: 1 }, 'Erde mit Wasserflasche befeuchten');
craft('packed_mud', 1, { mud: 1, wheat: 1 });
craft('snow', 6, { snow_block: 3 });
craft('glass_pane', 16, { glass: 6 }); craft('iron_bars', 16, { iron_ingot: 6 });
craft('iron_nugget', 9, { iron_ingot: 1 }); craft('gold_nugget', 9, { gold_ingot: 1 });
craft('chain', 1, { iron_nugget: 2, iron_ingot: 1 }); craft('iron_chain', 1, { iron_nugget: 2, iron_ingot: 1 });
craft('iron_door', 3, { iron_ingot: 6 }); craft('iron_trapdoor', 1, { iron_ingot: 4 });
craft('heavy_weighted_pressure_plate', 1, { iron_ingot: 2 }); craft('light_weighted_pressure_plate', 1, { gold_ingot: 2 });
craft('torch', 4, { '#coals': 1, stick: 1 }); craft('soul_torch', 4, { '#coals': 1, stick: 1, '#soul_base': 1 }); craft('redstone_torch', 1, { redstone: 1, stick: 1 });
craft('lantern', 1, { torch: 1, iron_nugget: 8 }); craft('soul_lantern', 1, { soul_torch: 1, iron_nugget: 8 });
craft('campfire', 1, { stick: 3, '#coals': 1, '#logs': 3 }); craft('soul_campfire', 1, { stick: 3, '#soul_base': 1, '#logs': 3 });
craft('jack_o_lantern', 1, { carved_pumpkin: 1, torch: 1 }); tool('carved_pumpkin', 'pumpkin', 'Kürbis mit Schere schnitzen (4 Samen fallen ab)');
craft('end_rod', 4, { blaze_rod: 1, popped_chorus_fruit: 1 }); craft('lightning_rod', 1, { copper_ingot: 3 });
craft('candle', 1, { string: 1, honeycomb: 1 });
craft('ladder', 3, { stick: 7 }); craft('scaffolding', 6, { bamboo: 6, string: 1 });
craft('crafting_table', 1, { '#planks': 4 }); craft('chest', 1, { '#planks': 8 }); craft('barrel', 1, { '#planks': 6, '#wooden_slabs': 2 });
craft('tripwire_hook', 2, { iron_ingot: 1, stick: 1, '#planks': 1 }); craft('trapped_chest', 1, { chest: 1, tripwire_hook: 1 });
craft('paper', 3, { sugar_cane: 3 }); craft('book', 1, { paper: 3, leather: 1 });
craft('bookshelf', 1, { '#planks': 6, book: 3 }); craft('chiseled_bookshelf', 1, { '#planks': 6, '#wooden_slabs': 3 });
craft('lectern', 1, { '#wooden_slabs': 4, bookshelf: 1 }); craft('composter', 1, { '#wooden_slabs': 7 });
craft('furnace', 1, { '#stone_crafting': 8 }); craft('smoker', 1, { furnace: 1, '#logs': 4 }); craft('blast_furnace', 1, { iron_ingot: 5, furnace: 1, smooth_stone: 3 });
craft('hopper', 1, { iron_ingot: 5, chest: 1 }); craft('cauldron', 1, { iron_ingot: 7 }); craft('anvil', 1, { iron_block: 3, iron_ingot: 4 });
craft('stonecutter', 1, { iron_ingot: 1, stone: 3 }); craft('grindstone', 1, { stick: 2, stone_slab: 1, '#planks': 2 });
craft('loom', 1, { '#planks': 2, string: 2 }); craft('smithing_table', 1, { iron_ingot: 2, '#planks': 4 }); craft('fletching_table', 1, { flint: 2, '#planks': 4 });
craft('cartography_table', 1, { paper: 2, '#planks': 4 }); craft('jukebox', 1, { '#planks': 8, diamond: 1 }); craft('note_block', 1, { '#planks': 8, redstone: 1 });
craft('flower_pot', 1, { brick: 3 }); craft('decorated_pot', 1, { brick: 4 });
craft('enchanting_table', 1, { book: 1, diamond: 2, obsidian: 4 }); craft('brewing_stand', 1, { blaze_rod: 1, '#stone_crafting': 3 });
craft('lever', 1, { stick: 1, cobblestone: 1 }); craft('rail', 16, { iron_ingot: 6, stick: 1 });
craft('powered_rail', 6, { gold_ingot: 6, stick: 1, redstone: 1 }); craft('detector_rail', 6, { iron_ingot: 6, stone_pressure_plate: 1, redstone: 1 });
craft('activator_rail', 6, { iron_ingot: 6, stick: 2, redstone_torch: 1 });
craft('piston', 1, { '#planks': 3, cobblestone: 4, iron_ingot: 1, redstone: 1 }); craft('sticky_piston', 1, { piston: 1, slime_ball: 1 });
craft('observer', 1, { cobblestone: 6, redstone: 2, quartz: 1 }); craft('dropper', 1, { cobblestone: 7, redstone: 1 });
craft('bow', 1, { stick: 3, string: 3 }); craft('dispenser', 1, { cobblestone: 7, bow: 1, redstone: 1 });
craft('repeater', 1, { redstone_torch: 2, redstone: 1, stone: 3 }); craft('comparator', 1, { redstone_torch: 3, quartz: 1, stone: 3 });
craft('daylight_detector', 1, { glass: 3, quartz: 3, '#wooden_slabs': 3 }); craft('target', 1, { redstone: 4, hay_block: 1 });
craft('tnt', 1, { gunpowder: 5, sand: 4 }); craft('redstone_lamp', 1, { redstone: 4, glowstone: 1 });
craft('tinted_glass', 2, { glass: 1, amethyst_shard: 4 }); craft('honey_block', 1, { honey_bottle: 4 }); craft('beehive', 1, { '#planks': 6, honeycomb: 3 });
craft('lodestone', 1, { chiseled_stone_bricks: 8, iron_ingot: 1 }); craft('respawn_anchor', 1, { crying_obsidian: 6, glowstone: 3 });
craft('crafter', 1, { iron_ingot: 5, crafting_table: 1, redstone: 2, dropper: 1 }); craft('calibrated_sculk_sensor', 1, { amethyst_shard: 3, sculk_sensor: 1 }); craft('shulker_box', 1, { shulker_shell: 2, chest: 1 });
craft('cake', 1, { milk_bucket: 3, sugar: 2, egg: 1, wheat: 3 }); craft('sugar', 1, { sugar_cane: 1 });

// Copper: oxidation stages and waxing of every craftable copper block.
craft('copper_grate', 4, { copper_block: 4 }); cut('copper_grate', 4, 'copper_block');
craft('chiseled_copper', 1, { cut_copper_slab: 2 }); cut('chiseled_copper', 4, 'copper_block');
craft('copper_bulb', 4, { copper_block: 3, blaze_rod: 1, redstone: 1 }); craft('copper_door', 3, { copper_ingot: 6 }); craft('copper_trapdoor', 1, { copper_ingot: 4 });
for (const base of ['copper_block', 'cut_copper', 'cut_copper_stairs', 'cut_copper_slab', 'chiseled_copper', 'copper_grate', 'copper_bulb', 'copper_door', 'copper_trapdoor']) {
  const stage = (s: string): string => base === 'copper_block' ? (s ? `${s}_copper` : base) : s ? `${s}_${base}` : base;
  let prev = base;
  for (const s of ['exposed', 'weathered', 'oxidized']) { tool(stage(s), prev, 'oxidieren lassen (Zeit) oder Zwischenstufe mit Axt abschaben'); prev = stage(s); }
  for (const s of ['', 'exposed', 'weathered', 'oxidized']) craft(`waxed_${stage(s)}`, 1, { [stage(s)]: 1, honeycomb: 1 });
}

/** Gathered raw materials and how they are obtained. */
const RAW: Readonly<Record<string, string>> = {};
const raw = (source: string, ids: readonly string[]): void => { for (const id of ids) (RAW as Record<string, string>)[id] = source; };
raw('Abbau', ['cobblestone', 'cobbled_deepslate', 'granite', 'diorite', 'andesite', 'tuff', 'calcite', 'dripstone_block', 'pointed_dripstone', 'dirt', 'sand', 'red_sand', 'gravel',
  'clay_ball', 'netherrack', 'blackstone', 'basalt', 'soul_sand', 'soul_soil', 'end_stone', 'obsidian', 'crying_obsidian', 'magma_block', 'coal', 'raw_iron', 'raw_gold', 'raw_copper',
  'redstone', 'lapis_lazuli', 'diamond', 'emerald', 'quartz', 'amethyst_shard', 'glowstone_dust', 'flint', 'gilded_blackstone', 'ancient_debris', 'rooted_dirt']);
raw('Abbau mit Behutsamkeit', ['bee_nest', 'creaking_heart', 'grass_block', 'mycelium', 'podzol', 'ice', 'amethyst_cluster', 'sculk', 'sculk_vein', 'sculk_sensor', 'sculk_catalyst', 'sculk_shrieker']);
raw('Holzfällen', [...WOODS.map(w => `${w}_log`), ...STEMS.map(w => `${w}_stem`), 'bamboo']);
raw('Pflanzen sammeln/anbauen', ['sugar_cane', 'cactus', 'kelp', 'vine', 'wheat', 'pumpkin', 'melon', 'cocoa_beans', 'nether_wart', 'chorus_fruit', 'sweet_berries', 'glow_berries',
  'poppy', 'dandelion', 'blue_orchid', 'allium', 'azure_bluet', 'red_tulip', 'orange_tulip', 'white_tulip', 'pink_tulip', 'oxeye_daisy', 'cornflower', 'lily_of_the_valley', 'torchflower',
  'wither_rose', 'sunflower', 'lilac', 'rose_bush', 'peony', 'pitcher_plant', 'brown_mushroom', 'red_mushroom', 'lily_pad', 'moss_block', 'azalea', 'flowering_azalea', 'spore_blossom',
  'big_dripleaf', 'small_dripleaf', 'glow_lichen', 'hanging_roots', 'mangrove_roots', 'muddy_mangrove_roots', 'pink_petals', 'wildflowers', 'leaf_litter', 'carrot', 'potato', 'beetroot_seeds',
  'wheat_seeds', 'melon_seeds', 'pumpkin_seeds', 'torchflower_seeds', 'pitcher_pod', 'sea_pickle', 'crimson_fungus', 'warped_fungus', 'crimson_roots', 'warped_roots', 'nether_sprouts',
  'twisting_vines', 'weeping_vines', 'shroomlight', 'nether_wart_block', 'warped_wart_block', 'brown_mushroom_block', 'red_mushroom_block', 'mushroom_stem', 'dead_bush', 'bush', 'firefly_bush',
  'cactus_flower', 'short_dry_grass', 'tall_dry_grass', 'chorus_flower', 'open_eyeblossom', 'closed_eyeblossom', 'pale_hanging_moss', 'resin_clump']);
raw('Mit Schere sammeln', ['short_grass', 'tall_grass', 'fern', 'large_fern', 'seagrass', 'cobweb', 'white_wool']);
raw('Mob-Drop/Tiere', ['string', 'leather', 'bone', 'ink_sac', 'glow_ink_sac', 'slime_ball', 'gunpowder', 'feather', 'blaze_rod', 'shulker_shell', 'prismarine_shard', 'prismarine_crystals',
  'snowball', 'egg', 'honeycomb', 'honey_bottle', 'turtle_egg', 'sniffer_egg', 'milk_bucket', 'wet_sponge']);
raw('Mob-Drop/Tiere', ['ochre_froglight', 'verdant_froglight', 'pearlescent_froglight']);
raw('Fund/Handel', ['dried_ghast', 'bell', 'heavy_core', 'dragon_head', 'conduit', 'beacon', 'trial_key', 'ominous_trial_key']);
const RAW_PATTERNS: readonly (readonly [RegExp, string])[] = [
  [/_leaves$/, 'Mit Schere sammeln'], [/_sapling$|_propagule$/, 'Pflanzen sammeln/anbauen'], [/_coral(_block|_fan)?$/, 'Abbau mit Behutsamkeit'],
  [/_ore$/, 'Abbau mit Behutsamkeit'], [/_(head|skull)$/, 'Mob-Drop/Tiere'],
];

/** Frozen catalogue (namespaced ids). */
export const RECIPES: readonly Recipe[] = Object.freeze(recipes.map(r => Object.freeze(r)));
export const RECIPE_TAGS: Readonly<Record<string, TagDefinition>> = Object.freeze(Object.fromEntries(Object.entries(TAG_DEFS).map(([k, t]) =>
  [`#${k}`, { label: t.label, members: t.members.map(ns), fallback: ns(t.fallback) }])));
const BY_OUTPUT = new Map<string, Recipe[]>();
for (const r of RECIPES) { const list = BY_OUTPUT.get(r.output); if (list) list.push(r); else BY_OUTPUT.set(r.output, [r]); }

/** Raw-material source of an item, if it is gathered rather than crafted. */
export function rawSource(itemId: string): string | undefined {
  const id = itemId.replace(/^minecraft:/, '');
  if (!itemId.startsWith('minecraft:') && itemId.includes(':')) return undefined;
  return RAW[id] ?? RAW_PATTERNS.find(([re]) => re.test(id))?.[1];
}

/** Recipes producing an item (namespaced id). */
export const recipesFor = (itemId: string): readonly Recipe[] => BY_OUTPUT.get(ns(itemId)) ?? [];

/**
 * Recipe used for an item under a method, or null when the item is a raw
 * material, in stock or not in the catalogue. Raw status wins over a recipe
 * (white wool is sheared, not crafted from string); blocks that can also be
 * mined with silk touch (stone, glass) are crafted unless marked as stock.
 */
export function chooseRecipe(itemId: string, method: RecipeMethod = 'stonecutter', stock: ReadonlySet<string> = new Set()): Recipe | null {
  const id = ns(itemId);
  if (stock.has(id)) return null;
  const candidates = BY_OUTPUT.get(id);
  if (!candidates || rawSource(id) !== undefined) return null;
  const cutter = candidates.find(r => r.station === 'stonecutter'), other = candidates.find(r => r.station !== 'stonecutter');
  return (method === 'stonecutter' ? cutter ?? other : other ?? cutter) ?? null;
}

const nsSet = (ids: Iterable<string> | undefined): Set<string> => new Set([...(ids ?? [])].map(ns));

/**
 * Expands build items into raw materials. `items` are build item lines
 * (typically `MaterialReport.items`); counts of the same id are added up.
 */
export function resolveRecipes(items: readonly { readonly itemId: string; readonly count: number }[], options: RecipeOptions = {}): RecipeReport {
  const method = options.method ?? 'stonecutter', stock = nsSet(options.stock);
  const roots = new Map<string, number>();
  for (const l of items) if (l.count > 0) roots.set(ns(l.itemId), (roots.get(ns(l.itemId)) ?? 0) + l.count);
  const rootOrder = [...roots.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([id]) => id);

  // 1. Tag choices: explore the tree; a tag takes the first member met in discovery order.
  const tagChoice = new Map<string, { chosen: string; reason: 'tree' | 'fallback' }>();
  const inputsOf = (id: string): Ingredient[] => {
    const r = chooseRecipe(id, method, stock);
    return r ? r.inputs.map(i => i.item.startsWith('#') ? { item: tagChoice.get(i.item)?.chosen ?? i.item, count: i.count } : i) : [];
  };
  for (;;) {
    const seen: string[] = [], seenSet = new Set<string>(), pendingTags: string[] = [];
    const visit = (id: string): void => {
      if (id.startsWith('#')) { if (!pendingTags.includes(id)) pendingTags.push(id); return; }
      if (seenSet.has(id)) return;
      seenSet.add(id); seen.push(id);
      for (const i of inputsOf(id)) visit(i.item);
    };
    rootOrder.forEach(visit);
    if (!pendingTags.length) break;
    for (const tag of pendingTags) {
      const def = RECIPE_TAGS[tag];
      if (!def) throw new DomainError('recipe-tag', `Unbekannter Rezept-Tag ${tag}`);
      const found = seen.find(id => def.members.includes(id));
      tagChoice.set(tag, found ? { chosen: found, reason: 'tree' } : { chosen: def.fallback, reason: 'fallback' });
    }
  }

  // 2. Topological order (inputs before consumers), cycles are catalogue errors.
  const order: string[] = [], state = new Map<string, 1 | 2>();
  const dfs = (id: string, path: string[]): void => {
    const s = state.get(id);
    if (s === 2) return;
    if (s === 1) throw new DomainError('recipe-cycle', `Rezeptzyklus: ${[...path, id].join(' → ')}`);
    state.set(id, 1);
    for (const i of inputsOf(id)) dfs(i.item, [...path, id]);
    state.set(id, 2); order.push(id);
  };
  rootOrder.forEach(id => dfs(id, []));

  // 3. Demand, consumers first.
  const demand = new Map<string, number>(roots);
  const tagUse = new Map<string, number>();
  const steps: RecipeStep[] = [];
  const base: { itemId: string; count: number; kind: BaseKind; source?: string }[] = [];
  for (const id of [...order].reverse()) {
    const need = demand.get(id) ?? 0;
    if (need <= 0) continue;
    const recipe = chooseRecipe(id, method, stock);
    if (!recipe) {
      const source = rawSource(id);
      base.push({ itemId: id, count: need, kind: stock.has(id) ? 'stock' : source ? 'raw' : 'unknown', ...(source !== undefined && !stock.has(id) && { source }) });
      continue;
    }
    const operations = Math.ceil(need / recipe.count), produced = operations * recipe.count;
    const inputs = recipe.inputs.map(i => {
      const item = i.item.startsWith('#') ? tagChoice.get(i.item)!.chosen : i.item, count = i.count * operations;
      if (i.item.startsWith('#')) tagUse.set(i.item, (tagUse.get(i.item) ?? 0) + count);
      demand.set(item, (demand.get(item) ?? 0) + count);
      return { item, count };
    });
    steps.push({ recipe, itemId: id, operations, produced, needed: need, surplus: produced - need, inputs, buildItem: roots.has(id) });
  }
  steps.reverse();

  const baseLines: BaseLine[] = base.map(b => {
    const stackSize = stackSizeOf(b.itemId);
    return { ...b, stackSize, fullStacks: Math.floor(b.count / stackSize), remainder: b.count % stackSize, slots: Math.ceil(b.count / stackSize), direct: Math.min(b.count, roots.get(b.itemId) ?? 0) };
  }).sort((a, b) => b.count - a.count || (a.itemId < b.itemId ? -1 : 1));
  const stations: Record<Station, number> = { crafting: 0, stonecutter: 0, smelting: 0, tool: 0, water: 0 };
  for (const s of steps) stations[s.recipe.station] += s.operations;
  const surplus = steps.filter(s => s.surplus > 0).map(s => ({ item: s.itemId, count: s.surplus })).sort((a, b) => b.count - a.count || (a.item < b.item ? -1 : 1));
  const tagChoices: TagChoice[] = [...tagChoice.entries()].filter(([tag]) => tagUse.has(tag)).map(([tag, c]) => ({ tag, label: RECIPE_TAGS[tag]!.label, chosen: c.chosen, reason: c.reason, count: tagUse.get(tag)! }));
  const sum = (kind: BaseKind): number => baseLines.filter(l => l.kind === kind).reduce((s, l) => s + l.count, 0);
  const fuel = { smelts: stations.smelting, coal: Math.ceil(stations.smelting / 8) };
  const unknown = baseLines.filter(l => l.kind === 'unknown');

  const notes = [`Rezepte aus ${RECIPE_CATALOG_VERSION} (Vanilla Java), nicht gegen eine exakte Spielversion geprüft; je Item genau ein Rezept, ${method === 'stonecutter' ? 'Steinsäge bevorzugt' : 'Werkbank bevorzugt'}.`,
    'Überschüsse aus dem Aufrunden werden innerhalb des Baums geteilt und als Rest ausgewiesen.',
    'Werkzeuge (Axt, Schere, Spitzhacke mit Behutsamkeit) und Arbeitsblöcke sind nicht im Rohstoffbedarf enthalten.'];
  if (fuel.smelts) notes.push(`${fuel.smelts} Schmelzvorgänge brauchen Brennstoff, z. B. ${fuel.coal} Kohle (8 Vorgänge je Kohle) – nicht in den Rohstoffen enthalten.`);
  if (stations.water) notes.push(`${stations.water} Vorgänge mit Wasser (Beton aushärten, Schlamm) – Wasser nicht gezählt.`);
  for (const t of tagChoices) notes.push(`${t.label}: ${t.chosen.replace(/^minecraft:/, '')} ${t.reason === 'tree' ? 'gewählt, weil diese Sorte schon im Bedarf vorkommt' : 'als Standard angenommen – jede andere Sorte geht ebenso'}.`);
  if (unknown.length) notes.push(`${unknown.length} Items ohne Rezept und ohne Rohstoffeintrag im Katalog: als Grundbedarf aufgeführt und markiert.`);
  if (stock.size) notes.push(`${stock.size} Items als vorhanden markiert und nicht weiter aufgelöst.`);

  return {
    catalogVersion: RECIPE_CATALOG_VERSION, method, base: baseLines, steps, surplus, stations, fuel, tagChoices,
    totals: { raw: sum('raw'), stock: sum('stock'), unknown: sum('unknown'), slots: baseLines.reduce((s, l) => s + l.slots, 0) },
    notes, complete: unknown.length === 0,
  };
}

/** Raw materials for the build items of a material report (unresolved states are not part of it). */
export function recipesForMaterials(report: MaterialReport, options: RecipeOptions = {}): RecipeReport {
  return resolveRecipes(report.items, options);
}

/** Every recipe input must be producible or a tag; the catalogue graph must be acyclic. Throws otherwise. */
export function assertRecipeCatalog(): { recipes: number; outputs: number } {
  for (const r of RECIPES) {
    if (!(r.count > 0) || !r.inputs.length || r.inputs.some(i => !(i.count > 0))) throw new DomainError('recipe-invalid', `Ungültiges Rezept ${r.id}`);
    for (const i of r.inputs) if (i.item.startsWith('#') && !RECIPE_TAGS[i.item]) throw new DomainError('recipe-tag', `Unbekannter Tag ${i.item} in ${r.id}`);
  }
  // Every output must resolve without cycles under both methods.
  for (const method of ['stonecutter', 'crafting'] as const) resolveRecipes([...BY_OUTPUT.keys()].map(itemId => ({ itemId, count: 1 })), { method });
  return { recipes: RECIPES.length, outputs: BY_OUTPUT.size };
}

/** Semicolon separated list: raw materials, steps, surplus. */
export function recipesToCsv(report: RecipeReport): string {
  const q = (s: string | number): string => typeof s === 'number' ? String(s) : /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  const short = (id: string): string => id.replace(/^minecraft:/, '');
  const kind: Record<BaseKind, string> = { raw: 'Rohstoff', stock: 'vorhanden', unknown: 'unbekannt' };
  const rows: (string | number)[][] = [['Typ', 'ID', 'Menge', 'Vorgänge', 'Station', 'Zutaten', 'Hinweis']];
  for (const b of report.base) rows.push([kind[b.kind], short(b.itemId), b.count, '', '', '', b.source ?? '']);
  for (const s of report.steps) rows.push(['Schritt', short(s.itemId), s.produced, s.operations, s.recipe.station, s.inputs.map(i => `${i.count} ${short(i.item)}`).join(' + '),
    [s.surplus ? `Rest ${s.surplus}` : '', s.recipe.note ?? ''].filter(Boolean).join(' | ')]);
  rows.push(['Brennstoff', 'coal', report.fuel.coal, report.fuel.smelts, 'smelting', '', 'nicht in den Rohstoffen enthalten']);
  return rows.map(r => r.map(q).join(';')).join('\n') + '\n';
}
