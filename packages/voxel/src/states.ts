import type { BlockState, Transform, Vec3 } from './types.js';
import { assertVec3 } from './validation.js';

/**
 * Explicit vanilla block-state rule catalogue for discrete instance transforms
 * (optional local X mirror, then 0–3 clockwise Y quarter turns, see VOXEL_CONTRACT).
 *
 * Every rule names its exact block IDs and its exact property schema. A state is
 * only resolved when its ID is listed and its properties match the schema exactly;
 * there is no guessing from property names. Everything else stays unresolved.
 */
export const STATE_CATALOG_PROFILE = 'java-vanilla-1.21.4-manual';

export function checkTransform(t: Transform): void {
  assertVec3(t.position, 'transform.position');
  if (![0,1,2,3].includes(t.quarterTurns) || typeof t.mirrorX !== 'boolean') throw new Error('Ungültige diskrete Transformation');
}
/** The single orientation rule of the voxel core: mirror x, then rotate (x,z)→(−z,x). */
export function transformVector(v: Vec3, t: Transform): Vec3 {
  let [x,y,z] = v;
  if (t.mirrorX) x = -x;
  for (let i = 0; i < t.quarterTurns; i++) [x,z] = [-z,x];
  return [x === 0 ? 0 : x, y, z === 0 ? 0 : z];
}

export type Direction = 'north' | 'east' | 'south' | 'west' | 'up' | 'down';
export const DIRECTION_VECTORS: Readonly<Record<Direction, Vec3>> = Object.freeze({
  north: [0,0,-1], east: [1,0,0], south: [0,0,1], west: [-1,0,0], up: [0,1,0], down: [0,-1,0],
});
const ALL_DIRECTIONS = Object.keys(DIRECTION_VECTORS) as Direction[];
const HORIZONTAL: readonly Direction[] = ['north','east','south','west'];
export function transformDirection(name: Direction, t: Transform): Direction {
  const v = transformVector(DIRECTION_VECTORS[name], t);
  return ALL_DIRECTIONS.find(d => DIRECTION_VECTORS[d].every((n,i) => n === v[i]))!;
}
const dir = (value: string, t: Transform) => transformDirection(value as Direction, t);
/** `rotation` 0–15: 0 = south, clockwise in 22.5° steps (4 = west, 8 = north, 12 = east). */
function rotation16(value: string, t: Transform): string {
  let r = Number(value);
  if (t.mirrorX) r = (16 - r) % 16;
  return String((r + 4 * t.quarterTurns) % 16);
}
const swapLeftRight = (value: string) => value.replace(/left|right/, m => m === 'left' ? 'right' : 'left');

// ---------------------------------------------------------------- schema values
const BOOL = ['true','false'] as const;
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => String(from + i));
const FACING4 = HORIZONTAL;
const FACING6 = ALL_DIRECTIONS;
const STAIR_SHAPES = ['straight','inner_left','inner_right','outer_left','outer_right'];
const RAIL_STRAIGHT = ['north_south','east_west','ascending_east','ascending_west','ascending_north','ascending_south'];
const RAIL_ALL = [...RAIL_STRAIGHT,'south_east','south_west','north_west','north_east'];
const WALL_SIDE = ['none','low','tall'];
const WIRE_SIDE = ['none','side','up'];
const FACE = ['floor','wall','ceiling'];
const ORIENTATIONS = ['down_east','down_north','down_south','down_west','up_east','up_north','up_south','up_west','west_up','east_up','north_up','south_up'];

// ---------------------------------------------------------------- explicit IDs
const COLORS = ['white','orange','magenta','light_blue','yellow','lime','pink','gray','light_gray','cyan','purple','blue','brown','green','red','black'];
const TREE_WOODS = ['oak','spruce','birch','jungle','acacia','dark_oak','mangrove','cherry','pale_oak'];
const NETHER_WOODS = ['crimson','warped'];
const WOODS = [...TREE_WOODS,'bamboo',...NETHER_WOODS];
const COPPER = ['','exposed_','weathered_','oxidized_'].flatMap(s => [s, `waxed_${s}`]);
const STONE_STAIR_SLAB = ['stone','cobblestone','mossy_cobblestone','stone_brick','mossy_stone_brick','granite','polished_granite',
  'diorite','polished_diorite','andesite','polished_andesite','cobbled_deepslate','polished_deepslate','deepslate_brick','deepslate_tile',
  'brick','mud_brick','sandstone','smooth_sandstone','red_sandstone','smooth_red_sandstone','prismarine','prismarine_brick',
  'dark_prismarine','nether_brick','red_nether_brick','quartz','smooth_quartz','purpur','end_stone_brick','blackstone',
  'polished_blackstone','polished_blackstone_brick','tuff','polished_tuff','tuff_brick','resin_brick','bamboo_mosaic',
  ...COPPER.map(c => `${c}cut_copper`)];
const WALL_MATERIALS = ['cobblestone','mossy_cobblestone','brick','prismarine','red_sandstone','mossy_stone_brick','granite','stone_brick',
  'mud_brick','nether_brick','andesite','red_nether_brick','sandstone','end_stone_brick','diorite','blackstone','polished_blackstone',
  'polished_blackstone_brick','cobbled_deepslate','polished_deepslate','deepslate_brick','deepslate_tile','tuff','polished_tuff',
  'tuff_brick','resin_brick'];
const ids = (...names: readonly string[]) => names.map(n => `minecraft:${n}`);
const each = (list: readonly string[], f: (s: string) => string) => list.map(f);

type Schema = Readonly<Record<string, readonly string[]>>;
type Props = Readonly<Record<string, string>>;
/** Returns the transformed properties or null when the transform cannot be represented. */
type Apply = (p: Props, t: Transform) => Record<string, string> | null;
export interface StateRule {
  readonly family: string;
  readonly ids: readonly string[];
  readonly schema: Schema;
  readonly apply: Apply;
  readonly note?: string;
}

const same: Apply = p => ({ ...p });
const mapProps = (names: readonly string[], f: (v: string, t: Transform) => string): Apply => (p, t) => {
  const next = { ...p };
  for (const n of names) next[n] = f(p[n]!, t);
  return next;
};
const facing = mapProps(['facing'], dir);
/** Properties named after directions (fence arms, vine faces …) move with their direction. */
const permuteSides = (sides: readonly Direction[]): Apply => (p, t) => {
  const next = { ...p };
  for (const side of sides) next[transformDirection(side, t)] = p[side]!;
  return next;
};
const facingThenSwap = (property: string): Apply => (p, t) => {
  const next = facing(p, t)!;
  if (t.mirrorX) next[property] = swapLeftRight(p[property]!);
  return next;
};
const rail: Apply = (p, t) => {
  const shape = p.shape!, next = { ...p };
  if (shape.startsWith('ascending_')) next.shape = `ascending_${dir(shape.slice(10), t)}`;
  else {
    const ends = shape.split('_').map(d => dir(d, t));
    next.shape = ends.includes('east') && ends.includes('west') ? 'east_west'
      : ends.includes('north') && ends.includes('south') ? 'north_south'
      : `${ends.find(d => d === 'north' || d === 'south')}_${ends.find(d => d === 'east' || d === 'west')}`;
  }
  return next;
};
const orientation: Apply = (p, t) => {
  const [front, top] = p.orientation!.split('_') as [Direction, Direction];
  return { ...p, orientation: `${transformDirection(front, t)}_${transformDirection(top, t)}` };
};
const axis = (values: readonly string[]): Apply => (p, t) => {
  const next = { ...p };
  if (t.quarterTurns % 2 && p.axis !== 'y') next.axis = p.axis === 'x' ? 'z' : 'x';
  return values.includes(next.axis!) ? next : null;
};

const RULES: readonly StateRule[] = [
  { family: 'Stämme und Säulen (axis)', schema: { axis: ['x','y','z'] }, apply: axis(['x','y','z']), ids: ids(
    ...TREE_WOODS.flatMap(w => [`${w}_log`, `${w}_wood`, `stripped_${w}_log`, `stripped_${w}_wood`]),
    ...NETHER_WOODS.flatMap(w => [`${w}_stem`, `${w}_hyphae`, `stripped_${w}_stem`, `stripped_${w}_hyphae`]),
    'bamboo_block','stripped_bamboo_block','basalt','polished_basalt','quartz_pillar','purpur_pillar','hay_block','bone_block',
    'deepslate','infested_deepslate','muddy_mangrove_roots','ochre_froglight','verdant_froglight','pearlescent_froglight') },
  { family: 'Kette (axis)', ids: ids('chain'), schema: { axis: ['x','y','z'], waterlogged: BOOL }, apply: axis(['x','y','z']) },
  { family: 'Netherportal (axis x/z)', ids: ids('nether_portal'), schema: { axis: ['x','z'] }, apply: axis(['x','z']) },

  { family: 'Treppen', ids: ids(...each([...WOODS, ...STONE_STAIR_SLAB], m => `${m}_stairs`)),
    schema: { facing: FACING4, half: ['top','bottom'], shape: STAIR_SHAPES, waterlogged: BOOL }, apply: facingThenSwap('shape'),
    note: 'Spiegelung vertauscht links/rechts auch bei Blickrichtung parallel zur Spiegelebene (geometrisch korrekt; Vanilla-mirror() lässt diesen Fall unverändert).' },
  { family: 'Türen', ids: ids(...each(WOODS, w => `${w}_door`), 'iron_door', ...each(COPPER, c => `${c}copper_door`)),
    schema: { facing: FACING4, half: ['upper','lower'], hinge: ['left','right'], open: BOOL, powered: BOOL }, apply: facingThenSwap('hinge') },
  { family: 'Falltüren', ids: ids(...each(WOODS, w => `${w}_trapdoor`), 'iron_trapdoor', ...each(COPPER, c => `${c}copper_trapdoor`)),
    schema: { facing: FACING4, half: ['top','bottom'], open: BOOL, powered: BOOL, waterlogged: BOOL }, apply: facing },
  { family: 'Zauntore', ids: ids(...each(WOODS, w => `${w}_fence_gate`)),
    schema: { facing: FACING4, in_wall: BOOL, open: BOOL, powered: BOOL }, apply: facing },
  { family: 'Zäune, Scheiben, Gitter', ids: ids(...each(WOODS, w => `${w}_fence`), 'nether_brick_fence', 'glass_pane',
    ...each(COLORS, c => `${c}_stained_glass_pane`), 'iron_bars'),
    schema: { north: BOOL, east: BOOL, south: BOOL, west: BOOL, waterlogged: BOOL }, apply: permuteSides(HORIZONTAL) },
  { family: 'Mauern', ids: ids(...each(WALL_MATERIALS, m => `${m}_wall`)),
    schema: { north: WALL_SIDE, east: WALL_SIDE, south: WALL_SIDE, west: WALL_SIDE, up: BOOL, waterlogged: BOOL }, apply: permuteSides(HORIZONTAL) },
  { family: 'Schienen', ids: ids('rail'), schema: { shape: RAIL_ALL, waterlogged: BOOL }, apply: rail },
  { family: 'Antriebs-/Sensor-/Aktivierungsschienen', ids: ids('powered_rail','detector_rail','activator_rail'),
    schema: { shape: RAIL_STRAIGHT, powered: BOOL, waterlogged: BOOL }, apply: rail },
  { family: 'Betten', ids: ids(...each(COLORS, c => `${c}_bed`)), schema: { facing: FACING4, occupied: BOOL, part: ['head','foot'] }, apply: facing },

  { family: 'Schilder stehend (rotation)', ids: ids(...each(WOODS, w => `${w}_sign`)),
    schema: { rotation: range(0,15), waterlogged: BOOL }, apply: mapProps(['rotation'], rotation16) },
  { family: 'Hängeschilder (rotation)', ids: ids(...each(WOODS, w => `${w}_hanging_sign`)),
    schema: { attached: BOOL, rotation: range(0,15), waterlogged: BOOL }, apply: mapProps(['rotation'], rotation16) },
  { family: 'Banner stehend (rotation)', ids: ids(...each(COLORS, c => `${c}_banner`)), schema: { rotation: range(0,15) }, apply: mapProps(['rotation'], rotation16) },
  { family: 'Köpfe stehend (rotation)', ids: ids('skeleton_skull','wither_skeleton_skull','zombie_head','player_head','creeper_head','dragon_head','piglin_head'),
    schema: { powered: BOOL, rotation: range(0,15) }, apply: mapProps(['rotation'], rotation16) },
  { family: 'Wandschilder', ids: ids(...each(WOODS, w => `${w}_wall_sign`), ...each(WOODS, w => `${w}_wall_hanging_sign`)),
    schema: { facing: FACING4, waterlogged: BOOL }, apply: facing },
  { family: 'Wandbanner', ids: ids(...each(COLORS, c => `${c}_wall_banner`)), schema: { facing: FACING4 }, apply: facing },
  { family: 'Wandköpfe', ids: ids('skeleton_wall_skull','wither_skeleton_wall_skull','zombie_wall_head','player_wall_head','creeper_wall_head','dragon_wall_head','piglin_wall_head'),
    schema: { facing: FACING4, powered: BOOL }, apply: facing },

  { family: 'facing (6 Richtungen): Fass', ids: ids('barrel'), schema: { facing: FACING6, open: BOOL }, apply: facing },
  { family: 'facing (6 Richtungen): Werfer/Spender', ids: ids('dispenser','dropper'), schema: { facing: FACING6, triggered: BOOL }, apply: facing },
  { family: 'facing (6 Richtungen): Beobachter', ids: ids('observer'), schema: { facing: FACING6, powered: BOOL }, apply: facing },
  { family: 'facing (6 Richtungen): Kolben', ids: ids('piston','sticky_piston'), schema: { extended: BOOL, facing: FACING6 }, apply: facing },
  { family: 'facing (6 Richtungen): Kolbenkopf', ids: ids('piston_head'), schema: { facing: FACING6, short: BOOL, type: ['normal','sticky'] }, apply: facing },
  { family: 'facing (6 Richtungen)', ids: ids('end_rod','shulker_box',...each(COLORS, c => `${c}_shulker_box`)), schema: { facing: FACING6 }, apply: facing },
  { family: 'facing (6 Richtungen): Befehlsblöcke', ids: ids('command_block','chain_command_block','repeating_command_block'),
    schema: { conditional: BOOL, facing: FACING6 }, apply: facing },
  { family: 'facing (6 Richtungen): Blitzableiter', ids: ids('lightning_rod'), schema: { facing: FACING6, powered: BOOL, waterlogged: BOOL }, apply: facing },
  { family: 'facing (6 Richtungen): Amethyst', ids: ids('amethyst_cluster','large_amethyst_bud','medium_amethyst_bud','small_amethyst_bud'),
    schema: { facing: FACING6, waterlogged: BOOL }, apply: facing },
  { family: 'Trichter', ids: ids('hopper'), schema: { enabled: BOOL, facing: ['down','north','south','west','east'] }, apply: facing },
  { family: 'Werkbank-Orientierung (Crafter)', ids: ids('crafter'), schema: { crafting: BOOL, orientation: ORIENTATIONS, triggered: BOOL }, apply: orientation },
  { family: 'Verbundblock-Orientierung', ids: ids('jigsaw'), schema: { orientation: ORIENTATIONS }, apply: orientation },

  { family: 'facing (horizontal)', ids: ids('carved_pumpkin','jack_o_lantern','loom','stonecutter','anvil','chipped_anvil','damaged_anvil',
    'wall_torch','soul_wall_torch','attached_pumpkin_stem','attached_melon_stem'), schema: { facing: FACING4 }, apply: facing },
  { family: 'Glasierte Keramik', ids: ids(...each(COLORS, c => `${c}_glazed_terracotta`)), schema: { facing: FACING4 },
    apply: (p, t) => t.mirrorX ? null : facing(p, t), note: 'Muster ist chiral: Drehen gelöst, Spiegeln nicht darstellbar und daher ungelöst.' },
  { family: 'Öfen', ids: ids('furnace','blast_furnace','smoker'), schema: { facing: FACING4, lit: BOOL }, apply: facing },
  { family: 'Redstone-Wandfackel', ids: ids('redstone_wall_torch'), schema: { facing: FACING4, lit: BOOL }, apply: facing },
  { family: 'Truhen', ids: ids('chest','trapped_chest'), schema: { facing: FACING4, type: ['single','left','right'], waterlogged: BOOL }, apply: facingThenSwap('type') },
  { family: 'Endertruhe, Leiter', ids: ids('ender_chest','ladder'), schema: { facing: FACING4, waterlogged: BOOL }, apply: facing },
  { family: 'Bienenstock', ids: ids('beehive','bee_nest'), schema: { facing: FACING4, honey_level: range(0,5) }, apply: facing },
  { family: 'Lesepult', ids: ids('lectern'), schema: { facing: FACING4, has_book: BOOL, powered: BOOL }, apply: facing },
  { family: 'Verstärker', ids: ids('repeater'), schema: { delay: range(1,4), facing: FACING4, locked: BOOL, powered: BOOL }, apply: facing },
  { family: 'Komparator', ids: ids('comparator'), schema: { facing: FACING4, mode: ['compare','subtract'], powered: BOOL }, apply: facing },
  { family: 'Lagerfeuer', ids: ids('campfire','soul_campfire'), schema: { facing: FACING4, lit: BOOL, signal_fire: BOOL, waterlogged: BOOL }, apply: facing },
  { family: 'Knöpfe und Hebel (face/facing)', ids: ids(...each(WOODS, w => `${w}_button`), 'stone_button', 'polished_blackstone_button', 'lever'),
    schema: { face: FACE, facing: FACING4, powered: BOOL }, apply: facing },
  { family: 'Schleifstein', ids: ids('grindstone'), schema: { face: FACE, facing: FACING4 }, apply: facing },
  { family: 'Stolperdrahthaken', ids: ids('tripwire_hook'), schema: { attached: BOOL, facing: FACING4, powered: BOOL }, apply: facing },
  { family: 'Großes Tropfblatt', ids: ids('big_dripleaf'), schema: { facing: FACING4, tilt: ['none','unstable','partial','full'], waterlogged: BOOL }, apply: facing },
  { family: 'Tropfblatt', ids: ids('big_dripleaf_stem'), schema: { facing: FACING4, waterlogged: BOOL }, apply: facing },
  { family: 'Kleines Tropfblatt', ids: ids('small_dripleaf'), schema: { facing: FACING4, half: ['upper','lower'], waterlogged: BOOL }, apply: facing },

  { family: 'Ranken', ids: ids('vine'), schema: { east: BOOL, north: BOOL, south: BOOL, up: BOOL, west: BOOL }, apply: permuteSides(HORIZONTAL) },
  { family: 'Mehrseitige Beläge', ids: ids('glow_lichen','sculk_vein'),
    schema: { down: BOOL, east: BOOL, north: BOOL, south: BOOL, up: BOOL, west: BOOL, waterlogged: BOOL }, apply: permuteSides(HORIZONTAL) },
  { family: 'Pilzblöcke, Chorus', ids: ids('brown_mushroom_block','red_mushroom_block','mushroom_stem','chorus_plant'),
    schema: { down: BOOL, east: BOOL, north: BOOL, south: BOOL, up: BOOL, west: BOOL }, apply: permuteSides(HORIZONTAL) },
  { family: 'Redstone-Leitung', ids: ids('redstone_wire'),
    schema: { east: WIRE_SIDE, north: WIRE_SIDE, power: range(0,15), south: WIRE_SIDE, west: WIRE_SIDE }, apply: permuteSides(HORIZONTAL) },
  { family: 'Stolperdraht', ids: ids('tripwire'),
    schema: { attached: BOOL, disarmed: BOOL, east: BOOL, north: BOOL, powered: BOOL, south: BOOL, west: BOOL }, apply: permuteSides(HORIZONTAL) },
  { family: 'Feuer', ids: ids('fire'), schema: { age: range(0,15), east: BOOL, north: BOOL, south: BOOL, up: BOOL, west: BOOL }, apply: permuteSides(HORIZONTAL) },

  // Properties present, but none of them depends on horizontal orientation.
  { family: 'ausrichtungsfrei: Stufen', ids: ids(...each([...WOODS, ...STONE_STAIR_SLAB, 'smooth_stone','cut_sandstone','cut_red_sandstone','petrified_oak'], m => `${m}_slab`)),
    schema: { type: ['top','bottom','double'], waterlogged: BOOL }, apply: same },
  { family: 'ausrichtungsfrei: Laub', ids: ids(...each(TREE_WOODS, w => `${w}_leaves`), 'azalea_leaves', 'flowering_azalea_leaves'),
    schema: { distance: range(1,7), persistent: BOOL, waterlogged: BOOL }, apply: same },
  { family: 'ausrichtungsfrei: Flüssigkeiten', ids: ids('water','lava'), schema: { level: range(0,15) }, apply: same },
  { family: 'ausrichtungsfrei: Schnee', ids: ids('snow'), schema: { layers: range(1,8) }, apply: same },
  { family: 'ausrichtungsfrei: bedeckbarer Boden', ids: ids('grass_block','podzol','mycelium'), schema: { snowy: BOOL }, apply: same },
  { family: 'ausrichtungsfrei: Ackerboden', ids: ids('farmland'), schema: { moisture: range(0,7) }, apply: same },
  { family: 'ausrichtungsfrei: Feldfrüchte', ids: ids('wheat','carrots','potatoes'), schema: { age: range(0,7) }, apply: same },
  { family: 'ausrichtungsfrei: Rote Bete', ids: ids('beetroots'), schema: { age: range(0,3) }, apply: same },
  { family: 'ausrichtungsfrei: Kaktus, Zuckerrohr', ids: ids('cactus','sugar_cane'), schema: { age: range(0,15) }, apply: same },
  { family: 'ausrichtungsfrei: Setzlinge', ids: ids(...each(TREE_WOODS.filter(w => w !== 'mangrove'), w => `${w}_sapling`)), schema: { stage: ['0','1'] }, apply: same },
  { family: 'ausrichtungsfrei: hohe Pflanzen', ids: ids('tall_grass','large_fern','lilac','rose_bush','peony'), schema: { half: ['upper','lower'] }, apply: same },
  { family: 'ausrichtungsfrei: Kerzen', ids: ids('candle', ...each(COLORS, c => `${c}_candle`)), schema: { candles: range(1,4), lit: BOOL, waterlogged: BOOL }, apply: same },
  { family: 'ausrichtungsfrei: Seegurken', ids: ids('sea_pickle'), schema: { pickles: range(1,4), waterlogged: BOOL }, apply: same },
  { family: 'ausrichtungsfrei: Laternen', ids: ids('lantern','soul_lantern'), schema: { hanging: BOOL, waterlogged: BOOL }, apply: same },
  { family: 'ausrichtungsfrei: Druckplatten', ids: ids(...each(WOODS, w => `${w}_pressure_plate`), 'stone_pressure_plate', 'polished_blackstone_pressure_plate'),
    schema: { powered: BOOL }, apply: same },
  { family: 'ausrichtungsfrei: Wägeplatten', ids: ids('light_weighted_pressure_plate','heavy_weighted_pressure_plate'), schema: { power: range(0,15) }, apply: same },
  { family: 'ausrichtungsfrei: leuchtend', ids: ids('redstone_torch','redstone_lamp','redstone_ore','deepslate_redstone_ore'), schema: { lit: BOOL }, apply: same },
  { family: 'ausrichtungsfrei: TNT', ids: ids('tnt'), schema: { unstable: BOOL }, apply: same },
  { family: 'ausrichtungsfrei: Kessel', ids: ids('water_cauldron','powder_snow_cauldron'), schema: { level: range(1,3) }, apply: same },
  { family: 'ausrichtungsfrei: Gerüst', ids: ids('scaffolding'), schema: { bottom: BOOL, distance: range(0,7), waterlogged: BOOL }, apply: same },
  { family: 'ausrichtungsfrei: Tropfstein', ids: ids('pointed_dripstone'),
    schema: { thickness: ['tip_merge','tip','frustum','middle','base'], vertical_direction: ['up','down'], waterlogged: BOOL }, apply: same },
];

const BY_ID: ReadonlyMap<string, StateRule> = (() => {
  const map = new Map<string, StateRule>();
  for (const rule of RULES) for (const id of rule.ids) {
    if (map.has(id)) throw new Error(`Zustandskatalog: ${id} doppelt (${map.get(id)!.family} / ${rule.family})`);
    map.set(id, Object.freeze(rule));
  }
  return map;
})();

/** Read-only catalogue view for documentation, tests and UI. */
export function stateCatalog(): readonly StateRule[] { return RULES; }
export function stateRuleFor(id: string): StateRule | undefined { return BY_ID.get(id); }

function matches(p: Props, schema: Schema): boolean {
  const keys = Object.keys(p);
  return keys.length === Object.keys(schema).length && keys.every(k => Object.hasOwn(schema, k) && schema[k]!.includes(p[k]!));
}

export type StateUnresolvedReason = 'unknown-block' | 'schema-mismatch' | 'unrepresentable';
export interface StateTransformResult {
  readonly state: BlockState;
  readonly resolved: boolean;
  /** Catalogue family that handled the state, if any. */
  readonly family?: string;
  readonly reason?: StateUnresolvedReason;
}
export function transformBlockState(state: BlockState, t: Transform): StateTransformResult {
  checkTransform(t);
  if (!t.mirrorX && t.quarterTurns === 0) return { state, resolved: true };
  const p = state.properties;
  const rule = BY_ID.get(state.id);
  if (rule) {
    if (!matches(p, rule.schema)) return { state, resolved: false, family: rule.family, reason: 'schema-mismatch' };
    const next = rule.apply(p, t);
    if (!next) return { state, resolved: false, family: rule.family, reason: 'unrepresentable' };
    return { state: { id: state.id, properties: next }, resolved: true, family: rule.family };
  }
  // Vanilla stores every orientation in block-state properties, so a vanilla
  // state without properties is orientation-free. Mod namespaces stay unresolved.
  if (state.id.startsWith('minecraft:') && Object.keys(p).length === 0) return { state, resolved: true, family: 'ausrichtungsfrei ohne Properties' };
  return { state, resolved: false, reason: 'unknown-block' };
}
