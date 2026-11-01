import { BLOCK_REGISTRY_VERSION, vanillaBlockIds, vanillaBlockProperties } from '../../../voxel/src/blockRegistry.js';
import { stateRuleFor } from '../../../voxel/src/states.js';
import type { BlockState } from '../../../voxel/src/types.js';
import type { PropertySchema } from './tools.js';

/**
 * Blockpalette des Editors (EDIT-02): a thin layer over the shared block
 * registry (VIEW-02, `voxel/src/blockRegistry.ts`). It adds what the editor
 * needs and the registry does not carry: complete property schemas (registry
 * values united with the exact B7 rule schema and a small table of properties
 * that never change the model, e.g. waterlogged/powered), default values,
 * German search names and palette categories. No second block list.
 *
 * Defaults follow the game where known; leaves default to persistent=true so
 * planned leaves do not decay. Properties missing from a state are filled by
 * the game on paste, so an incomplete schema never produces an invalid state.
 */
export const BLOCK_PALETTE_VERSION = `${BLOCK_REGISTRY_VERSION}+editor-1`;

const BOOL = ['true', 'false'] as const;
const has = (id: string, ...parts: string[]) => parts.some(p => id.includes(p));
const ends = (id: string, ...parts: string[]) => parts.some(p => id.endsWith(p));

/** Properties without model influence (absent from blockstate files), by block id pattern. */
function hiddenProperties(name: string): Record<string, readonly string[]> {
  const out: Record<string, readonly string[]> = {};
  const water = ends(name, '_stairs', '_slab', '_fence', '_wall', '_pane', '_trapdoor', '_sign', '_hanging_sign', 'iron_bars', '_bars', 'chain', 'lantern', 'ladder',
    'chest', 'conduit', 'scaffolding', 'lightning_rod', 'pointed_dripstone', '_cluster', '_bud', 'glow_lichen', 'sculk_vein', 'hanging_roots', 'mangrove_roots',
    'mangrove_propagule', 'dripleaf', '_grate', 'heavy_core', 'decorated_pot', 'light', '_leaves', 'campfire', 'barrier', '_coral', '_coral_fan', '_coral_wall_fan',
    'sea_pickle', 'candle', 'copper_golem_statue', '_shelf', 'resin_clump', 'dried_ghast', 'rail');
  if (water && !ends(name, 'froglight', 'sea_lantern', 'jack_o_lantern', 'weighted_pressure_plate')) out.waterlogged = BOOL;
  if (ends(name, '_door', '_trapdoor', '_fence_gate')) out.powered = BOOL;
  if (name === 'dispenser' || name === 'dropper') out.triggered = BOOL;
  if (name === 'hopper') out.enabled = BOOL;
  if (name === 'note_block') {
    out.instrument = ['harp', 'basedrum', 'snare', 'hat', 'bass', 'flute', 'bell', 'guitar', 'chime', 'xylophone', 'iron_xylophone', 'cow_bell', 'didgeridoo', 'bit', 'banjo', 'pling',
      'zombie', 'skeleton', 'creeper', 'dragon', 'wither_skeleton', 'piglin', 'custom_head', 'trumpet', 'trumpet_exposed', 'trumpet_weathered', 'trumpet_oxidized'];
    out.note = Array.from({ length: 25 }, (_, i) => String(i)); out.powered = BOOL;
  }
  if (ends(name, '_leaves')) { out.distance = ['1', '2', '3', '4', '5', '6', '7']; out.persistent = BOOL; }
  if (ends(name, '_sapling') || name === 'mangrove_propagule') out.stage = ['0', '1'];
  if (name === 'redstone_wire') out.power = Array.from({ length: 16 }, (_, i) => String(i));
  if (name === 'campfire' || name === 'soul_campfire') out.signal_fire = BOOL;
  if (name === 'scaffolding') { out.distance = ['0', '1', '2', '3', '4', '5', '6', '7']; out.bottom = BOOL; }
  if (name === 'tnt') out.unstable = BOOL;
  if (name === 'jukebox') out.has_record = BOOL;
  return out;
}

const SCHEMA_CACHE = new Map<string, PropertySchema>();
const bare = (id: string) => id.startsWith('minecraft:') ? id.slice(10) : id;
const full = (id: string) => id.includes(':') ? id : `minecraft:${id}`;

/**
 * Property schema for the editor: B7 rule schema when one exists (it is
 * exact), otherwise registry values completed (booleans get both values)
 * plus known hidden properties. Empty object for blocks without properties;
 * undefined for ids outside the registry (mod blocks: free text only).
 */
export function blockSchema(id: string): PropertySchema | undefined {
  const key = full(id);
  const cached = SCHEMA_CACHE.get(key);
  if (cached) return cached;
  const rule = stateRuleFor(key)?.schema;
  const reg = vanillaBlockProperties(key);
  if (!rule && !reg) return undefined;
  const out: Record<string, readonly string[]> = {};
  for (const [k, values] of Object.entries(reg ?? {})) {
    const v = [...values];
    out[k] = v.every(x => x === 'true' || x === 'false') ? BOOL : v;
  }
  for (const [k, values] of Object.entries(hiddenProperties(bare(key)))) out[k] = out[k] ? [...new Set([...values, ...out[k]!])] : values;
  if (rule) for (const k of Object.keys(out)) if (!rule[k]) delete out[k];
  if (rule) Object.assign(out, rule);
  const sorted = Object.fromEntries(Object.keys(out).sort().map(k => [k, out[k]!]));
  SCHEMA_CACHE.set(key, Object.freeze(sorted));
  return sorted;
}

const DEFAULT_BY_NAME: Readonly<Record<string, readonly string[]>> = {
  facing: ['north', 'down'], half: ['bottom', 'lower'], type: ['bottom', 'single', 'normal', 'floor'], shape: ['straight', 'north_south'], axis: ['y'],
  hinge: ['left'], part: ['foot', 'head'], face: ['wall'], attachment: ['floor'], persistent: ['true'], distance: ['7'], instrument: ['harp'],
  mode: ['compare', 'save', 'starting'], orientation: ['north_up'], sculk_sensor_phase: ['inactive'], tilt: ['none'], thickness: ['tip'], vertical_direction: ['up'],
  trial_spawner_state: ['inactive'], vault_state: ['inactive'], creaking_heart_state: ['uprooted'], leaves: ['none'], tip: ['true'], bottom: ['false'],
};

/** Default property values for a block (game default where known, else false/none/lowest). */
export function defaultProperties(id: string): Record<string, string> {
  const schema = blockSchema(id) ?? {};
  const out: Record<string, string> = {};
  for (const [k, values] of Object.entries(schema)) {
    const preferred = (DEFAULT_BY_NAME[k] ?? []).find(v => values.includes(v));
    out[k] = preferred ?? (values.includes('false') ? 'false' : values.includes('none') ? 'none' : [...values].sort((a, b) => Number(a) - Number(b) || (a < b ? -1 : 1))[0]!);
  }
  return out;
}

export function defaultState(id: string): BlockState { return { id: full(id), properties: defaultProperties(id) }; }

/** Every property in the schema and every value allowed (mod blocks: anything non-empty). */
export function checkProperties(state: BlockState): string[] {
  const schema = blockSchema(state.id);
  if (!schema) return [];
  const issues: string[] = [];
  for (const [k, v] of Object.entries(state.properties)) {
    if (!schema[k]) issues.push(`${k} gibt es bei ${state.id} nicht`);
    else if (!schema[k]!.includes(v)) issues.push(`${k}=${v} ist nicht erlaubt (${schema[k]!.join(', ')})`);
  }
  return issues;
}

// ------------------------------------------------------------------ names and categories

/** English id word → German. Covers materials and forms; unknown words stay as they are. */
const WORDS: Readonly<Record<string, string>> = {
  oak: 'Eiche', spruce: 'Fichte', birch: 'Birke', jungle: 'Tropen', acacia: 'Akazie', dark: 'Dunkel', mangrove: 'Mangrove', cherry: 'Kirsch', pale: 'Blass',
  crimson: 'Karmesin', warped: 'Wirr', bamboo: 'Bambus', azalea: 'Azalee', planks: 'Bretter', log: 'Stamm', wood: 'Holz', stripped: 'entrindet', leaves: 'Laub',
  sapling: 'Setzling', stem: 'Stiel', hyphae: 'Hyphen', stairs: 'Treppe', slab: 'Stufe', wall: 'Wand', fence: 'Zaun', gate: 'Tor', door: 'Tür', trapdoor: 'Falltür',
  button: 'Knopf', pressure: 'Druck', plate: 'Platte', sign: 'Schild', hanging: 'Hänge', pane: 'Scheibe', glass: 'Glas', stained: 'gefärbt', stone: 'Stein',
  cobblestone: 'Bruchstein', mossy: 'bemoost', bricks: 'Ziegel', brick: 'Ziegel', cracked: 'rissig', chiseled: 'gemeißelt', smooth: 'glatt', polished: 'poliert',
  cut: 'geschnitten', granite: 'Granit', diorite: 'Diorit', andesite: 'Andesit', deepslate: 'Tiefenschiefer', cobbled: 'Bruch', tiles: 'Fliesen', tile: 'Fliese',
  tuff: 'Tuff', calcite: 'Kalzit', sandstone: 'Sandstein', sand: 'Sand', red: 'Rot', gravel: 'Kies', dirt: 'Erde', grass: 'Gras', block: 'Block', mud: 'Schlamm',
  packed: 'fest', clay: 'Ton', terracotta: 'Keramik', glazed: 'glasiert', concrete: 'Beton', powder: 'Pulver', wool: 'Wolle', carpet: 'Teppich', bed: 'Bett',
  banner: 'Banner', candle: 'Kerze', shulker: 'Shulker', box: 'Kiste', white: 'Weiß', orange: 'Orange', magenta: 'Magenta', light: 'Hell', blue: 'Blau', yellow: 'Gelb',
  lime: 'Hellgrün', pink: 'Rosa', gray: 'Grau', cyan: 'Türkis', purple: 'Violett', brown: 'Braun', green: 'Grün', black: 'Schwarz', ore: 'Erz', iron: 'Eisen',
  gold: 'Gold', copper: 'Kupfer', diamond: 'Diamant', emerald: 'Smaragd', coal: 'Kohle', lapis: 'Lapis', redstone: 'Redstone', quartz: 'Quarz', netherite: 'Netherit',
  raw: 'Roh', exposed: 'angelaufen', weathered: 'verwittert', oxidized: 'oxidiert', waxed: 'gewachst', grate: 'Gitter', bulb: 'Leuchte', bars: 'Gitter', chain: 'Kette',
  lantern: 'Laterne', soul: 'Seelen', torch: 'Fackel', lamp: 'Lampe', glowstone: 'Leuchtstein', sea: 'See', froglight: 'Froschlicht', end: 'End', rod: 'Stab',
  nether: 'Nether', blackstone: 'Schwarzstein', basalt: 'Basalt', obsidian: 'Obsidian', crying: 'weinend', prismarine: 'Prismarin', purpur: 'Purpur', pillar: 'Säule',
  chest: 'Truhe', barrel: 'Fass', furnace: 'Ofen', blast: 'Schmelz', smoker: 'Räucherofen', crafting: 'Werk', table: 'Tisch', anvil: 'Amboss', lectern: 'Lesepult',
  bookshelf: 'Bücherregal', ladder: 'Leiter', scaffolding: 'Gerüst', rail: 'Schiene', powered: 'Antriebs', detector: 'Sensor', activator: 'Aktivierungs', hopper: 'Trichter',
  piston: 'Kolben', sticky: 'klebrig', observer: 'Beobachter', dispenser: 'Werfer', dropper: 'Spender', lever: 'Hebel', repeater: 'Verstärker', comparator: 'Komparator',
  wire: 'Leitung', water: 'Wasser', lava: 'Lava', ice: 'Eis', snow: 'Schnee', flower: 'Blume', pot: 'Topf', potted: 'getopft', vine: 'Ranke', vines: 'Ranken',
  mushroom: 'Pilz', moss: 'Moos', coral: 'Koralle', fan: 'Fächer', dead: 'abgestorben', kelp: 'Seetang', cactus: 'Kaktus', pumpkin: 'Kürbis', melon: 'Melone',
  hay: 'Heu', bale: 'Ballen', honey: 'Honig', honeycomb: 'Honigwaben', slime: 'Schleim', sponge: 'Schwamm', wet: 'nass', tall: 'hoch', short: 'kurz', fern: 'Farn',
  head: 'Kopf', skull: 'Schädel', campfire: 'Lagerfeuer', bell: 'Glocke', beacon: 'Leuchtfeuer', cauldron: 'Kessel', composter: 'Komposter', loom: 'Webstuhl',
  grindstone: 'Schleifstein', stonecutter: 'Steinsäge', cartography: 'Kartografie', fletching: 'Bogner', smithing: 'Schmiede', enchanting: 'Zauber', brewing: 'Brau',
  stand: 'Stand', shelf: 'Regal', amethyst: 'Amethyst', cluster: 'Haufen', dripstone: 'Tropfstein', pointed: 'spitz', sculk: 'Sculk', resin: 'Harz', target: 'Zielblock',
  tnt: 'TNT', bone: 'Knochen', farmland: 'Ackerboden', path: 'Pfad', podzol: 'Podsol', mycelium: 'Myzel', rooted: 'durchwurzelt', roots: 'Wurzeln', infested: 'befallen',
  note: 'Noten', budding: 'knospend', large: 'groß', medium: 'mittel', small: 'klein', bud: 'Knospe', heavy: 'schwer', core: 'Kern', egg: 'Ei',
  catalyst: 'Katalysator', debris: 'Schrott', ancient: 'antik', crop: 'Pflanze', cake: 'Kuchen', cobweb: 'Spinnennetz', magma: 'Magma', bedrock: 'Grundgestein', air: 'Luft', cave: 'Höhlen', void: 'Leere', barrier: 'Barriere', structure: 'Konstruktions', command: 'Befehls', jigsaw: 'Verbund', crafter: 'Werker',
};

/** Readable German name built from the id words, e.g. "Treppe · Eiche" for oak_stairs. Always shown together with the id. */
export function blockLabel(id: string): string {
  const words = bare(id).split('_');
  const de = words.map(w => WORDS[w] ?? w);
  if (de.length === 1) return de[0]!.charAt(0).toUpperCase() + de[0]!.slice(1);
  // "<material>_block" reads as one German compound: Amethystblock, Goldblock.
  if (words.at(-1) === 'block') return `${de.slice(0, -1).join(' ')}block`.replace(/^./, c => c.toUpperCase());
  // Last word is usually the form (stairs, slab, planks…): put it first.
  const head = de.at(-1)!, rest = de.slice(0, -1).join(' ');
  return `${head.charAt(0).toUpperCase()}${head.slice(1)} · ${rest}`;
}

export type BlockCategory = 'bau' | 'holz' | 'formen' | 'farbe' | 'natur' | 'redstone' | 'funktion' | 'licht' | 'deko' | 'technik';
export const BLOCK_CATEGORY_LABEL: Readonly<Record<BlockCategory, string>> = {
  bau: 'Stein und Baublöcke', holz: 'Holz', formen: 'Treppen, Stufen, Zäune', farbe: 'Farbige Blöcke', natur: 'Natur und Pflanzen', redstone: 'Redstone',
  funktion: 'Funktionsblöcke', licht: 'Licht', deko: 'Dekoration', technik: 'Technisch',
};
const COLOURS = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
const WOODS = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak', 'mangrove', 'cherry', 'pale_oak', 'crimson', 'warped', 'bamboo'];

export function blockCategory(id: string): BlockCategory {
  const n = bare(id);
  if (has(n, 'command_block', 'structure_', 'jigsaw', 'barrier', 'light') && /^(command_block|chain_command_block|repeating_command_block|structure_block|structure_void|jigsaw|barrier|light|test_block|test_instance_block)$/.test(n)) return 'technik';
  if (/^(air|cave_air|void_air|moving_piston|piston_head|bubble_column|end_portal|end_gateway|nether_portal|fire|soul_fire|frosted_ice)$/.test(n)) return 'technik';
  if (ends(n, '_stairs', '_slab', '_wall', '_fence', '_fence_gate', '_door', '_trapdoor', '_pane', 'iron_bars') && !has(n, 'wall_sign', 'wall_banner', 'wall_torch', 'wall_head', 'wall_skull', 'wall_fan', 'wall_hanging_sign')) return 'formen';
  if (has(n, 'redstone', 'repeater', 'comparator', 'piston', 'observer', 'dispenser', 'dropper', 'hopper', 'lever', '_button', 'pressure_plate', 'rail', 'tripwire',
    'daylight_detector', 'target', 'tnt', 'sculk_sensor', 'note_block', 'crafter', 'lightning_rod', 'copper_bulb') && !has(n, 'redstone_ore', 'redstone_block')) return 'redstone';
  if (has(n, 'torch', 'lantern', 'glowstone', 'sea_lantern', 'froglight', 'shroomlight', 'end_rod', 'candle', 'campfire', 'redstone_lamp', 'jack_o_lantern', 'beacon', 'conduit')) return 'licht';
  if (COLOURS.some(c => n.startsWith(`${c}_`)) && has(n, 'wool', 'carpet', 'concrete', 'terracotta', 'stained_glass', 'bed', 'banner', 'shulker_box')) return 'farbe';
  if (n === 'terracotta' || n === 'glass' || n === 'tinted_glass') return 'farbe';
  if (has(n, 'chest', 'barrel', 'furnace', 'smoker', 'crafting_table', 'anvil', 'lectern', 'enchanting', 'brewing', 'cauldron', 'composter', 'loom', 'grindstone',
    'stonecutter', 'cartography', 'fletching', 'smithing', 'bell', 'jukebox', 'beehive', 'bee_nest', 'respawn_anchor', 'lodestone', 'spawner', 'vault', 'ender_chest', 'shulker_box', 'decorated_pot', 'crafter')) return 'funktion';
  if (has(n, 'sign', 'banner', 'head', 'skull', 'flower_pot', 'potted_', 'bookshelf', 'ladder', 'scaffolding', 'chain', 'carpet', 'painting', 'shelf', 'pot', 'statue')) return 'deko';
  if (WOODS.some(w => n.startsWith(`${w}_`) || n.startsWith(`stripped_${w}_`)) && !has(n, 'leaves', 'sapling', 'propagule')) return 'holz';
  if (has(n, 'leaves', 'sapling', 'grass', 'fern', 'flower', 'tulip', 'orchid', 'allium', 'bluet', 'daisy', 'dandelion', 'poppy', 'rose', 'lilac', 'peony', 'sunflower',
    'mushroom', 'vine', 'moss', 'kelp', 'seagrass', 'coral', 'cactus', 'sugar_cane', 'bamboo', 'wheat', 'carrots', 'potatoes', 'beetroots', 'melon', 'pumpkin', 'dirt',
    'podzol', 'mycelium', 'farmland', 'snow', 'ice', 'water', 'lava', 'sand', 'gravel', 'clay', 'mud', 'roots', 'dripleaf', 'azalea', 'lily', 'sweet_berry', 'cocoa',
    'nether_wart', 'chorus', 'spore', 'bush', 'petals', 'propagule', 'hay', 'honey', 'slime', 'sponge', 'nylium', 'wart', 'fungus', 'eyeblossom', 'cactus_flower', 'leaf_litter')) return 'natur';
  return 'bau';
}

export interface PaletteEntry {
  readonly id: string;
  readonly label: string;
  readonly category: BlockCategory;
  /** Lower-case search text: id words, German words. */
  readonly search: string;
}

let ENTRIES: readonly PaletteEntry[] | null = null;
/** All registry blocks, sorted by category then label (air variants excluded; air is its own brush). */
export function paletteEntries(): readonly PaletteEntry[] {
  if (ENTRIES) return ENTRIES;
  const order = Object.keys(BLOCK_CATEGORY_LABEL);
  ENTRIES = Object.freeze(vanillaBlockIds()
    .filter(id => !/^minecraft:(air|cave_air|void_air)$/.test(full(id)))
    .map(id => {
      const label = blockLabel(id), n = bare(id);
      return { id: full(id), label, category: blockCategory(id), search: `${n} ${n.replaceAll('_', ' ')} ${label}`.toLowerCase() };
    })
    .sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.label.localeCompare(b.label, 'de') || (a.id < b.id ? -1 : 1)));
  return ENTRIES;
}

/** Search in id and German name; every word must match. Exact id/word hits first. */
export function searchPalette(query: string, category?: BlockCategory | null): PaletteEntry[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = paletteEntries().filter(e => (!category || e.category === category) && words.every(w => e.search.includes(w)));
  if (!words.length) return hits;
  const score = (e: PaletteEntry) => (bare(e.id) === words.join('_') ? 0 : bare(e.id).startsWith(words[0]!) ? 1 : 2);
  return hits.map((e, i) => ({ e, i, s: score(e) })).sort((a, b) => a.s - b.s || a.e.id.length - b.e.id.length || a.i - b.i).map(x => x.e);
}
