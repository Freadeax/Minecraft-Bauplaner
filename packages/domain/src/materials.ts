import { stateKey } from '../../voxel/src/validation.js';
import type { BlockState, Cell, Vec3, VoxelPayload } from '../../voxel/src/types.js';
import { positionKey } from './compose.js';
import type { Resolution } from './compose.js';

/**
 * Material requirements (P1-04a, R-017). Three strictly separated layers:
 *  1. placed block states – exact cell counts from the resolved world payload,
 *  2. build items – what a player has to hold to place those states,
 *  3. storage – stacks, inventory slots and shulker boxes for the items.
 * Raw materials (crafting trees) are deliberately not derived here.
 *
 * Item rules come from an explicit Vanilla Java catalogue. Nothing is guessed
 * silently: every state without a catalogue rule falls back to "item id =
 * block id" and is flagged as an assumption; liquids, mod blocks and states
 * without an obtainable item stay unresolved and make the report incomplete.
 */
export const MATERIAL_CATALOG_VERSION = 'vanilla-java-items-v1';
export const SHULKER_SLOTS = 27;

export type ItemRule =
  | 'direct'          // item id = block id, listed family
  | 'renamed'         // block id differs from item id (redstone_wire → redstone)
  | 'wall-variant'    // wall_torch, *_wall_sign, *_wall_banner, … → standing item
  | 'multiblock'      // door, bed, tall plant: one item for both halves
  | 'slab'            // double slab = two items
  | 'count'           // candles, sea pickles, snow layers, eggs, petals: n items per cell
  | 'composite'       // potted plant, candle cake: several items per cell
  | 'derived'         // obtained by working another block (farmland ← dirt)
  | 'assumed';        // no catalogue rule; item id = block id assumed

export type Confidence = 'catalog' | 'assumed';
export type UnresolvedReason = 'liquid' | 'mod-namespace' | 'no-item' | 'creative-only' | 'invalid-state';

export interface StateCount { readonly state: BlockState; readonly key: string; readonly count: number }

export interface ItemSource {
  readonly state: BlockState;
  readonly key: string;
  /** Placed cells of this state that contributed. */
  readonly cells: number;
  /** Items contributed by those cells. */
  readonly items: number;
  readonly rule: ItemRule;
  readonly confidence: Confidence;
  readonly note?: string;
}

export interface ItemLine {
  readonly itemId: string;
  readonly count: number;
  readonly stackSize: 1 | 16 | 64;
  readonly fullStacks: number;
  readonly remainder: number;
  /** Inventory slots needed (= ceil(count / stackSize)). */
  readonly slots: number;
  /** Shulker boxes cannot be stored inside shulker boxes. */
  readonly packable: boolean;
  /** 'assumed' when at least one source relies on an assumption. */
  readonly confidence: Confidence;
  readonly sources: readonly ItemSource[];
}

export interface UnresolvedLine {
  readonly state: BlockState;
  readonly key: string;
  readonly count: number;
  readonly reason: UnresolvedReason;
  readonly message: string;
}

export interface MaterialTotals {
  readonly items: number;
  readonly slots: number;
  /** Shulker boxes needed for all packable items. */
  readonly shulkerBoxes: number;
  /** Slots of unpackable items (shulker boxes themselves), carried separately. */
  readonly unpackableSlots: number;
}

export interface MaterialReport {
  readonly catalogVersion: string;
  readonly profileId: string | null;
  readonly scope: MaterialScope;
  readonly placed: { readonly blocks: number; readonly air: number; readonly erase: number; readonly states: readonly StateCount[] };
  readonly items: readonly ItemLine[];
  readonly unresolved: readonly UnresolvedLine[];
  readonly totals: MaterialTotals;
  /** Global assumptions and limits shown with the report. */
  readonly notes: readonly string[];
  /** Cells that additionally hold water (waterlogged=true); water is never counted as an item. */
  readonly waterlogged: number;
  /** Block entities with stored contents (Items); container contents are not counted. */
  readonly containersWithContents: number;
  /** Unresolved voxel conflicts: counts use the preview choice and are provisional. */
  readonly conflicts: number;
  /** True only without conflicts, unresolved states and assumptions. */
  readonly complete: boolean;
}

export type MaterialScope = { readonly kind: 'project' } | { readonly kind: 'instance'; readonly instanceId: string; readonly name: string };

// ---------------------------------------------------------------------------
// Catalogue (Vanilla Java). Ids without namespace prefix.

const RENAMED: Readonly<Record<string, string>> = {
  redstone_wire: 'redstone', tripwire: 'string', cocoa: 'cocoa_beans',
  carrots: 'carrot', potatoes: 'potato', beetroots: 'beetroot_seeds', wheat: 'wheat_seeds',
  melon_stem: 'melon_seeds', attached_melon_stem: 'melon_seeds', pumpkin_stem: 'pumpkin_seeds', attached_pumpkin_stem: 'pumpkin_seeds',
  sweet_berry_bush: 'sweet_berries', torchflower_crop: 'torchflower_seeds', cave_vines: 'glow_berries', cave_vines_plant: 'glow_berries',
  kelp_plant: 'kelp', bamboo_sapling: 'bamboo', twisting_vines_plant: 'twisting_vines', weeping_vines_plant: 'weeping_vines',
  big_dripleaf_stem: 'big_dripleaf', powder_snow: 'powder_snow_bucket',
};
const DERIVED: Readonly<Record<string, readonly [string, string]>> = {
  farmland: ['dirt', 'Ackerboden: Erde mit Hacke bearbeiten'],
  dirt_path: ['dirt', 'Trampelpfad: Erde mit Schaufel bearbeiten'],
  tall_seagrass: ['seagrass', 'Hohes Seegras: Seegras mit Knochenmehl wachsen lassen'],
};
const NO_ITEM: Readonly<Record<string, string>> = {
  fire: 'Feuer wird mit Feuerzeug entzündet, kein Bauitem', soul_fire: 'Seelenfeuer wird entzündet, kein Bauitem',
  nether_portal: 'Netherportal entsteht durch Entzünden des Rahmens', end_portal: 'Endportal entsteht durch Augen im Rahmen', end_gateway: 'Endtransitportal ist nicht platzierbar',
  frosted_ice: 'Brüchiges Eis entsteht nur durch Eisläufer', moving_piston: 'Bewegter Kolbenblock ist ein Übergangszustand',
  air: 'Luftzustand als Block gespeichert', cave_air: 'Luftzustand als Block gespeichert', void_air: 'Luftzustand als Block gespeichert',
};
const CREATIVE_ONLY = new Set(['barrier', 'light', 'structure_block', 'structure_void', 'jigsaw', 'command_block', 'chain_command_block', 'repeating_command_block',
  'bedrock', 'end_portal_frame', 'reinforced_deepslate', 'budding_amethyst', 'spawner', 'trial_spawner', 'vault', 'petrified_oak_slab', 'test_block', 'test_instance_block']);
const LIQUIDS = new Set(['water', 'lava', 'bubble_column']);
/** Two-cell plants and similar with property half=lower|upper. */
const HALF_PAIRS: Readonly<Record<string, string>> = {
  sunflower: 'sunflower', lilac: 'lilac', rose_bush: 'rose_bush', peony: 'peony', tall_grass: 'tall_grass', large_fern: 'large_fern',
  pitcher_plant: 'pitcher_plant', small_dripleaf: 'small_dripleaf', pitcher_crop: 'pitcher_pod',
};
/** Blocks that carry n items in one cell. [property, max] */
const COUNTED: Readonly<Record<string, readonly [string, number]>> = {
  sea_pickle: ['pickles', 4], snow: ['layers', 8], turtle_egg: ['eggs', 4], pink_petals: ['flower_amount', 4],
  wildflowers: ['flower_amount', 4], leaf_litter: ['segment_amount', 4],
};
const COLORS = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
const DIRECT_FAMILY = /(_planks|_log|_wood|_stem|_hyphae|_stairs|_fence|_fence_gate|_wool|_carpet|_concrete|_concrete_powder|_terracotta|_stained_glass|_stained_glass_pane|_bricks|_wall|_ore|_leaves|_sapling|_button|_pressure_plate|_trapdoor|_block|_tiles|_lantern|_bars|_chain|_shulker_box|_banner|_sign|_hanging_sign|_head|_skull|_torch|_bed|_door|_candle|_coral|_coral_fan|_coral_block|_glass|_pillar|_slab|_ice)$/;
const DIRECT = new Set(['stone', 'granite', 'diorite', 'andesite', 'deepslate', 'cobbled_deepslate', 'tuff', 'calcite', 'cobblestone', 'mossy_cobblestone', 'dirt', 'coarse_dirt', 'rooted_dirt',
  'grass_block', 'podzol', 'mycelium', 'mud', 'clay', 'sand', 'red_sand', 'gravel', 'sandstone', 'red_sandstone', 'smooth_sandstone', 'chiseled_sandstone', 'cut_sandstone', 'glass', 'glass_pane',
  'terracotta', 'obsidian', 'crying_obsidian', 'netherrack', 'soul_sand', 'soul_soil', 'basalt', 'smooth_basalt', 'blackstone', 'end_stone', 'purpur_block', 'prismarine', 'dark_prismarine', 'sea_lantern',
  'glowstone', 'shroomlight', 'torch', 'soul_torch', 'redstone_torch', 'lantern', 'soul_lantern', 'ladder', 'scaffolding', 'chest', 'trapped_chest', 'barrel', 'crafting_table', 'furnace', 'blast_furnace',
  'smoker', 'anvil', 'chipped_anvil', 'damaged_anvil', 'bookshelf', 'chiseled_bookshelf', 'lectern', 'cauldron', 'composter', 'hopper', 'dropper', 'dispenser', 'observer', 'piston', 'sticky_piston', 'lever',
  'rail', 'powered_rail', 'detector_rail', 'activator_rail', 'repeater', 'comparator', 'target', 'tnt', 'note_block', 'jukebox', 'beacon', 'conduit', 'bell', 'campfire', 'soul_campfire', 'iron_bars',
  'chain', 'ice', 'packed_ice', 'blue_ice', 'snow_block', 'pumpkin', 'carved_pumpkin', 'jack_o_lantern', 'melon', 'hay_block', 'cactus', 'sugar_cane', 'bamboo', 'vine', 'lily_pad', 'kelp', 'seagrass',
  'short_grass', 'fern', 'dead_bush', 'dandelion', 'poppy', 'blue_orchid', 'allium', 'azure_bluet', 'red_tulip', 'orange_tulip', 'white_tulip', 'pink_tulip', 'oxeye_daisy', 'cornflower',
  'lily_of_the_valley', 'wither_rose', 'torchflower', 'brown_mushroom', 'red_mushroom', 'moss_carpet', 'flower_pot', 'cake', 'candle', 'sponge', 'wet_sponge', 'quartz_block', 'smooth_quartz', 'smooth_stone',
  'mud_bricks', 'packed_mud', 'cobweb', 'end_rod', 'lightning_rod', 'enchanting_table', 'brewing_stand', 'grindstone', 'stonecutter', 'loom', 'cartography_table', 'fletching_table', 'smithing_table',
  'decorated_pot', 'big_dripleaf', 'spore_blossom', 'azalea', 'flowering_azalea', 'glow_lichen', 'sculk', 'sculk_vein', 'sculk_sensor', 'sculk_shrieker', 'sculk_catalyst', 'amethyst_cluster']);

const UNPACKABLE = /(^|_)shulker_box$/;

function stackSizeOf(itemId: string): 1 | 16 | 64 {
  const id = itemId.replace(/^minecraft:/, '');
  if (/(^|_)bed$/.test(id) || UNPACKABLE.test(id) || id === 'cake' || /_bucket$/.test(id) || id === 'decorated_pot') return 1;
  if (/_sign$/.test(id) || /_banner$/.test(id) || id === 'snowball' || id === 'egg' || id === 'ender_pearl' || id === 'honey_bottle' || id === 'armor_stand') return 16;
  return 64;
}

/** Bed facing → offset from foot to head. */
const FACING: Readonly<Record<string, Vec3>> = { north: [0, 0, -1], south: [0, 0, 1], west: [-1, 0, 0], east: [1, 0, 0] };
const add = (a: Vec3, b: Vec3, sign = 1): Vec3 => [a[0] + sign * b[0], a[1] + sign * b[1], a[2] + sign * b[2]];

interface Yield { readonly itemId: string; readonly items: number; readonly rule: ItemRule; readonly confidence: Confidence; readonly note?: string }
type CellResult = { readonly yields: readonly Yield[] } | { readonly unresolved: UnresolvedReason; readonly message: string };
type Lookup = (position: Vec3) => BlockState | undefined;

const mc = (id: string): string => `minecraft:${id}`;
const one = (itemId: string, rule: ItemRule, confidence: Confidence = 'catalog', items = 1, note?: string): Yield =>
  ({ itemId: mc(itemId), items, rule, confidence, ...(note !== undefined && { note }) });

/**
 * Item rule for one placed cell. `at` looks up the selected world for the
 * partner half of multi-block objects, so each object yields exactly one item
 * even when both halves are present; a lone half still yields one item.
 */
export function itemsForCell(state: BlockState, position: Vec3, at: Lookup): CellResult {
  const colon = state.id.indexOf(':');
  if (colon < 0 || state.id.slice(0, colon) !== 'minecraft') return { unresolved: 'mod-namespace', message: 'Mod-/Fremd-Namespace: keine Itemregel im Vanilla-Katalog' };
  const id = state.id.slice(colon + 1), p = state.properties;
  if (LIQUIDS.has(id)) return { unresolved: 'liquid', message: id === 'bubble_column' ? 'Blasensäule: Wasser plus Seelensand/Magmablock, Flüssigkeit nicht als Item gezählt' : 'Flüssigkeit: Eimer und Quellen nicht automatisch berechnet' };
  if (NO_ITEM[id]) return { unresolved: 'no-item', message: NO_ITEM[id]! };
  if (CREATIVE_ONLY.has(id) || id.startsWith('infested_')) return { unresolved: 'creative-only', message: 'Nur im Kreativmodus oder gar nicht als Item erhältlich' };

  // Multi-block objects: the lower half / foot carries the item.
  if (id.endsWith('_door') || HALF_PAIRS[id]) {
    const item = HALF_PAIRS[id] ?? id;
    if (p.half === 'lower') return { yields: [one(item, 'multiblock')] };
    if (p.half === 'upper') {
      const below = at(add(position, [0, -1, 0]));
      return below && below.id === state.id && below.properties.half === 'lower'
        ? { yields: [one(item, 'multiblock', 'catalog', 0)] }
        : { yields: [one(item, 'multiblock', 'catalog', 1, 'obere Hälfte ohne untere im Bereich')] };
    }
    return { unresolved: 'invalid-state', message: 'Zweiteiliger Block ohne gültiges half=lower|upper' };
  }
  if (id.endsWith('_bed')) {
    const facing = FACING[p.facing ?? ''];
    if (!facing || (p.part !== 'head' && p.part !== 'foot')) return { unresolved: 'invalid-state', message: 'Bett ohne gültiges part/facing' };
    if (p.part === 'foot') return { yields: [one(id, 'multiblock')] };
    const foot = at(add(position, facing, -1));
    return foot && foot.id === state.id && foot.properties.part === 'foot' && foot.properties.facing === p.facing
      ? { yields: [one(id, 'multiblock', 'catalog', 0)] }
      : { yields: [one(id, 'multiblock', 'catalog', 1, 'Kopfteil ohne Fußteil im Bereich')] };
  }
  if (id === 'piston_head') return { yields: [] }; // part of the piston below/behind; the piston yields the item

  if (id.endsWith('_slab')) {
    if (p.type === 'double') return { yields: [one(id, 'slab', 'catalog', 2)] };
    if (p.type === 'top' || p.type === 'bottom') return { yields: [one(id, 'slab')] };
    return { yields: [one(id, 'slab', 'assumed', 1, 'Stufe ohne type-Property: eine Stufe angenommen')] };
  }
  const counted = COUNTED[id] ?? (id === 'candle' || id.endsWith('_candle') ? ['candles', 4] as const : undefined);
  if (counted) {
    const n = Number(p[counted[0]]);
    if (!Number.isInteger(n) || n < 1 || n > counted[1]) return { unresolved: 'invalid-state', message: `${counted[0]} fehlt oder liegt außerhalb 1–${counted[1]}` };
    return { yields: [one(id, 'count', 'catalog', n)] };
  }
  if (id === 'candle_cake' || id.endsWith('_candle_cake')) {
    return { yields: [one('cake', 'composite'), one(id.replace(/_cake$/, ''), 'composite')] };
  }
  if (id.startsWith('potted_')) {
    const rest = id.slice('potted_'.length), plant = rest.endsWith('azalea_bush') ? rest.replace(/_bush$/, '') : rest;
    return { yields: [one('flower_pot', 'composite'), one(plant, 'composite', 'catalog', 1, 'Topfpflanze: Blumentopf plus Pflanze')] };
  }
  // Wall-mounted variants are placed with the standing item.
  const wall = /^(.*?)_?wall_(torch|sign|hanging_sign|banner|head|skull|fan)$/.exec(id);
  if (wall && (wall[2] !== 'fan' || wall[1]!.endsWith('coral'))) {
    const base = wall[1] ? `${wall[1]}_${wall[2]}` : wall[2]!;
    return { yields: [one(base, 'wall-variant')] };
  }
  if (RENAMED[id]) return { yields: [one(RENAMED[id]!, 'renamed')] };
  if (DERIVED[id]) return { yields: [one(DERIVED[id]![0], 'derived', 'assumed', 1, DERIVED[id]![1])] };
  if (id === 'cake' && p.bites && p.bites !== '0') return { yields: [one('cake', 'direct', 'catalog', 1, 'angeschnittener Kuchen: ganzer Kuchen nötig')] };
  if (DIRECT.has(id) || DIRECT_FAMILY.test(id) || COLORS.some(c => id === `${c}_wool`)) return { yields: [one(id, 'direct')] };
  return { yields: [one(id, 'assumed', 'assumed', 1, 'keine Katalogregel: Item-ID = Block-ID angenommen')] };
}

/**
 * Computes the material report for selected cells of a resolved world payload.
 * `include` limits the cells (e.g. one instance); partner halves are only
 * looked up among included cells.
 */
export function computeMaterials(world: VoxelPayload | null, options: { scope?: MaterialScope; include?: (cell: Cell) => boolean; conflicts?: number } = {}): MaterialReport {
  const scope = options.scope ?? { kind: 'project' };
  const cells = world ? (options.include ? world.cells.filter(options.include) : world.cells) : [];
  const states = new Map<string, { state: BlockState; count: number }>();
  const byPosition = new Map<string, BlockState>();
  let blocks = 0, air = 0, erase = 0, waterlogged = 0;
  for (const cell of cells) {
    if (cell.kind === 'erase') { erase++; continue; }
    if (cell.kind === 'air') { air++; continue; }
    const state = world!.palette[cell.paletteIndex]!, key = stateKey(state);
    blocks++;
    byPosition.set(positionKey(cell.position), state);
    const s = states.get(key);
    if (s) s.count++; else states.set(key, { state, count: 1 });
    if (state.properties.waterlogged === 'true') waterlogged++;
  }
  const at: Lookup = (position) => byPosition.get(positionKey(position));
  const items = new Map<string, { count: number; sources: Map<string, ItemSource & { cells: number; items: number }> }>();
  const unresolved = new Map<string, UnresolvedLine>();
  for (const cell of cells) {
    if (cell.kind !== 'block') continue;
    const state = world!.palette[cell.paletteIndex]!, key = stateKey(state), r = itemsForCell(state, cell.position, at);
    if ('unresolved' in r) {
      const u = unresolved.get(key);
      unresolved.set(key, u ? { ...u, count: u.count + 1 } : { state, key, count: 1, reason: r.unresolved, message: r.message });
      continue;
    }
    for (const y of r.yields) {
      let line = items.get(y.itemId);
      if (!line) items.set(y.itemId, line = { count: 0, sources: new Map() });
      line.count += y.items;
      const sourceKey = `${key}|${y.rule}|${y.note ?? ''}`, src = line.sources.get(sourceKey);
      if (src) { src.cells++; src.items += y.items; }
      else line.sources.set(sourceKey, { state, key, cells: 1, items: y.items, rule: y.rule, confidence: y.confidence, ...(y.note !== undefined && { note: y.note }) });
    }
  }
  const itemLines: ItemLine[] = [...items.entries()].filter(([, l]) => l.count > 0).map(([itemId, l]): ItemLine => {
    const stackSize = stackSizeOf(itemId), sources = [...l.sources.values()].sort((a, b) => b.items - a.items || (a.key < b.key ? -1 : 1));
    return { itemId, count: l.count, stackSize, fullStacks: Math.floor(l.count / stackSize), remainder: l.count % stackSize, slots: Math.ceil(l.count / stackSize),
      packable: !UNPACKABLE.test(itemId), confidence: sources.some(s => s.confidence === 'assumed') ? 'assumed' : 'catalog', sources };
  }).sort((a, b) => b.count - a.count || (a.itemId < b.itemId ? -1 : 1));
  const unresolvedLines = [...unresolved.values()].sort((a, b) => b.count - a.count || (a.key < b.key ? -1 : 1));
  const packableSlots = itemLines.filter(l => l.packable).reduce((s, l) => s + l.slots, 0);
  const totals: MaterialTotals = {
    items: itemLines.reduce((s, l) => s + l.count, 0),
    slots: itemLines.reduce((s, l) => s + l.slots, 0),
    shulkerBoxes: Math.ceil(packableSlots / SHULKER_SLOTS),
    unpackableSlots: itemLines.filter(l => !l.packable).reduce((s, l) => s + l.slots, 0),
  };
  const containersWithContents = world ? world.blockEntities.filter(e => (!options.include || byPosition.has(positionKey(e.position))) &&
    e.data.type === 'compound' && e.data.value.Items !== undefined).length : 0;
  const conflicts = options.conflicts ?? 0;
  const assumed = itemLines.some(l => l.confidence === 'assumed');
  const notes: string[] = [`Itemregeln aus ${MATERIAL_CATALOG_VERSION} (Vanilla Java), nicht gegen eine exakte Spielversion geprüft.`,
    'Rohstoffe und Rezepte werden nicht abgeleitet; Werkzeuge (Hacke, Schaufel, Feuerzeug) sind nicht enthalten.'];
  if (conflicts) notes.push(`${conflicts} ungeklärte Voxelkonflikte: Mengen folgen der Vorschauwahl und sind vorläufig.`);
  if (waterlogged) notes.push(`${waterlogged} wassergeflutete Blöcke brauchen zusätzlich Wasser (nicht gezählt).`);
  if (containersWithContents) notes.push(`${containersWithContents} Behälter mit gespeichertem Inhalt: Inhalt nicht im Bedarf enthalten.`);
  if (erase) notes.push(`${erase} Löschzellen: vorhandene Blöcke dort abbauen (kein Itembedarf).`);
  if (totals.unpackableSlots) notes.push('Shulkerkisten lassen sich nicht in Shulkerkisten lagern und sind separat ausgewiesen.');
  return {
    catalogVersion: MATERIAL_CATALOG_VERSION, profileId: world?.profileId ?? null, scope,
    placed: { blocks, air, erase, states: [...states.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, v]) => ({ state: v.state, key, count: v.count })) },
    items: itemLines, unresolved: unresolvedLines, totals, notes, waterlogged, containersWithContents, conflicts,
    complete: blocks > 0 && conflicts === 0 && unresolvedLines.length === 0 && !assumed,
  };
}

/**
 * Report for a resolved project or one instance of it. Quantities always come
 * from `resolution.world`; an instance scope counts the cells whose owner is
 * that instance, so per-instance reports add up to the project report.
 */
export function materialsForResolution(resolution: Resolution, scope: MaterialScope = { kind: 'project' }): MaterialReport {
  const conflicts = resolution.conflicts.length;
  if (scope.kind === 'project') return computeMaterials(resolution.world, { scope, conflicts });
  const include = (cell: Cell): boolean => resolution.owners.get(positionKey(cell.position))?.[0] === scope.instanceId;
  const own = resolution.conflicts.filter(c => c.instanceIds.includes(scope.instanceId)).length;
  return computeMaterials(resolution.world, { scope, include, conflicts: own });
}

/** "3 × 64 + 12" style storage text. */
export function formatStacks(line: Pick<ItemLine, 'fullStacks' | 'remainder' | 'stackSize'>): string {
  if (!line.fullStacks) return `${line.remainder}`;
  return `${line.fullStacks} × ${line.stackSize}${line.remainder ? ` + ${line.remainder}` : ''}`;
}

/** Semicolon separated list (German spreadsheet default) with explicit status columns. */
export function materialsToCsv(report: MaterialReport): string {
  const q = (s: string | number): string => typeof s === 'number' ? String(s) : /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  const rows: (string | number)[][] = [['Typ', 'ID', 'Menge', 'Stapelgröße', 'Stacks', 'Slots', 'Status', 'Hinweis']];
  for (const l of report.items) rows.push(['Item', l.itemId, l.count, l.stackSize, formatStacks(l), l.slots, l.confidence === 'assumed' ? 'Annahme' : 'Katalog',
    [...new Set(l.sources.map(s => s.note).filter(Boolean))].join(' | ')]);
  for (const u of report.unresolved) rows.push(['Ungelöst', u.state.id, u.count, '', '', '', u.reason, u.message]);
  rows.push(['Summe', '', report.totals.items, '', '', report.totals.slots, report.complete ? 'vollständig' : 'unvollständig', `${report.totals.shulkerBoxes} Shulkerkisten`]);
  return rows.map(r => r.map(q).join(';')).join('\n') + '\n';
}
