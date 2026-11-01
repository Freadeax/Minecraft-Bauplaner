import { createPayload, stateKey } from '../../voxel/src/validation.js';
import { stateRuleFor } from '../../voxel/src/states.js';
import type { BlockState, Cell, VoxelPayload } from '../../voxel/src/types.js';

/**
 * Materialvarianten (B12): a building in another wood, stone or colour by
 * swapping whole material sets form by form (planks → planks, stairs → stairs).
 * Properties stay as they are, so orientation and shape are kept exactly; the
 * forms of one kind share their property schema in Java Edition. A form the
 * target set does not have (a wall in polished andesite, leaves of crimson)
 * is not invented: the block stays unchanged and is reported as unresolved.
 */
export type MaterialKind = 'holz' | 'stein' | 'farbe' | 'glas' | 'beton' | 'terrakotta';
export interface MaterialSet {
  readonly id: string;
  readonly label: string;
  readonly kind: MaterialKind;
  /** Form name → block id without namespace. */
  readonly forms: Readonly<Record<string, string>>;
}
export const MATERIAL_KIND_LABEL: Readonly<Record<MaterialKind, string>> = { holz: 'Holz', stein: 'Stein', farbe: 'Farbe', glas: 'Glas', beton: 'Beton', terrakotta: 'Terrakotta' };

const WOOD_FORMS = ['planks', 'stairs', 'slab', 'fence', 'fence_gate', 'door', 'trapdoor', 'button', 'pressure_plate', 'sign', 'wall_sign', 'hanging_sign', 'wall_hanging_sign'] as const;
function wood(key: string, label: string, opts: { log?: string; wood?: string; leaves?: boolean; sapling?: string | null } = {}): MaterialSet {
  const log = opts.log ?? `${key}_log`, woodBlock = opts.wood ?? `${key}_wood`;
  const forms: Record<string, string> = { log, stripped_log: `stripped_${log}` };
  if (opts.wood !== '') { forms.wood = woodBlock; forms.stripped_wood = `stripped_${woodBlock}`; }
  for (const f of WOOD_FORMS) forms[f] = `${key}_${f}`;
  if (opts.leaves !== false) forms.leaves = `${key}_leaves`;
  if (opts.sapling !== null) forms.sapling = opts.sapling ?? `${key}_sapling`;
  return { id: key, label, kind: 'holz', forms };
}
const WOODS: readonly MaterialSet[] = [
  wood('oak', 'Eiche'), wood('spruce', 'Fichte'), wood('birch', 'Birke'), wood('jungle', 'Tropenholz'), wood('acacia', 'Akazie'),
  wood('dark_oak', 'Schwarzeiche'), wood('mangrove', 'Mangrove', { sapling: null }), wood('cherry', 'Kirsche'), wood('pale_oak', 'Blasseiche'),
  wood('crimson', 'Karmesin', { log: 'crimson_stem', wood: 'crimson_hyphae', leaves: false, sapling: null }),
  wood('warped', 'Wirrholz', { log: 'warped_stem', wood: 'warped_hyphae', leaves: false, sapling: null }),
  wood('bamboo', 'Bambus', { log: 'bamboo_block', wood: '', leaves: false, sapling: null }),
];

/** [id, label, block, stairs, slab, wall]; null = form does not exist in the game. */
const STONE_TABLE: readonly (readonly [string, string, string, string | null, string | null, string | null])[] = [
  ['cobblestone', 'Bruchstein', 'cobblestone', 'cobblestone_stairs', 'cobblestone_slab', 'cobblestone_wall'],
  ['mossy_cobblestone', 'Bemooster Bruchstein', 'mossy_cobblestone', 'mossy_cobblestone_stairs', 'mossy_cobblestone_slab', 'mossy_cobblestone_wall'],
  ['stone', 'Stein', 'stone', 'stone_stairs', 'stone_slab', null],
  ['stone_bricks', 'Steinziegel', 'stone_bricks', 'stone_brick_stairs', 'stone_brick_slab', 'stone_brick_wall'],
  ['mossy_stone_bricks', 'Bemooste Steinziegel', 'mossy_stone_bricks', 'mossy_stone_brick_stairs', 'mossy_stone_brick_slab', 'mossy_stone_brick_wall'],
  ['andesite', 'Andesit', 'andesite', 'andesite_stairs', 'andesite_slab', 'andesite_wall'],
  ['polished_andesite', 'Polierter Andesit', 'polished_andesite', 'polished_andesite_stairs', 'polished_andesite_slab', null],
  ['cobbled_deepslate', 'Bruchtiefenschiefer', 'cobbled_deepslate', 'cobbled_deepslate_stairs', 'cobbled_deepslate_slab', 'cobbled_deepslate_wall'],
  ['polished_deepslate', 'Polierter Tiefenschiefer', 'polished_deepslate', 'polished_deepslate_stairs', 'polished_deepslate_slab', 'polished_deepslate_wall'],
  ['deepslate_bricks', 'Tiefenschieferziegel', 'deepslate_bricks', 'deepslate_brick_stairs', 'deepslate_brick_slab', 'deepslate_brick_wall'],
  ['deepslate_tiles', 'Tiefenschieferfliesen', 'deepslate_tiles', 'deepslate_tile_stairs', 'deepslate_tile_slab', 'deepslate_tile_wall'],
  ['bricks', 'Ziegel', 'bricks', 'brick_stairs', 'brick_slab', 'brick_wall'],
  ['mud_bricks', 'Lehmziegel', 'mud_bricks', 'mud_brick_stairs', 'mud_brick_slab', 'mud_brick_wall'],
  ['sandstone', 'Sandstein', 'sandstone', 'sandstone_stairs', 'sandstone_slab', 'sandstone_wall'],
  ['smooth_sandstone', 'Glatter Sandstein', 'smooth_sandstone', 'smooth_sandstone_stairs', 'smooth_sandstone_slab', null],
  ['red_sandstone', 'Roter Sandstein', 'red_sandstone', 'red_sandstone_stairs', 'red_sandstone_slab', 'red_sandstone_wall'],
  ['blackstone', 'Schwarzstein', 'blackstone', 'blackstone_stairs', 'blackstone_slab', 'blackstone_wall'],
  ['polished_blackstone_bricks', 'Polierte Schwarzsteinziegel', 'polished_blackstone_bricks', 'polished_blackstone_brick_stairs', 'polished_blackstone_brick_slab', 'polished_blackstone_brick_wall'],
  ['nether_bricks', 'Netherziegel', 'nether_bricks', 'nether_brick_stairs', 'nether_brick_slab', 'nether_brick_wall'],
  ['red_nether_bricks', 'Rote Netherziegel', 'red_nether_bricks', 'red_nether_brick_stairs', 'red_nether_brick_slab', 'red_nether_brick_wall'],
  ['end_stone_bricks', 'Endsteinziegel', 'end_stone_bricks', 'end_stone_brick_stairs', 'end_stone_brick_slab', 'end_stone_brick_wall'],
  ['tuff_bricks', 'Tuffziegel', 'tuff_bricks', 'tuff_brick_stairs', 'tuff_brick_slab', 'tuff_brick_wall'],
  ['polished_tuff', 'Polierter Tuff', 'polished_tuff', 'polished_tuff_stairs', 'polished_tuff_slab', 'polished_tuff_wall'],
  ['prismarine_bricks', 'Prismarinziegel', 'prismarine_bricks', 'prismarine_brick_stairs', 'prismarine_brick_slab', null],
  ['quartz', 'Quarz', 'quartz_block', 'quartz_stairs', 'quartz_slab', null],
];
const STONES: readonly MaterialSet[] = STONE_TABLE.map(([id, label, block, stairs, slab, wall]) => ({
  id, label, kind: 'stein',
  forms: Object.fromEntries(([['block', block], ['stairs', stairs], ['slab', slab], ['wall', wall]] as [string, string | null][]).filter((e): e is [string, string] => e[1] !== null)),
}));

const DYES: readonly (readonly [string, string])[] = [
  ['white', 'Weiß'], ['light_gray', 'Hellgrau'], ['gray', 'Grau'], ['black', 'Schwarz'], ['brown', 'Braun'], ['red', 'Rot'], ['orange', 'Orange'], ['yellow', 'Gelb'],
  ['lime', 'Hellgrün'], ['green', 'Grün'], ['cyan', 'Türkis'], ['light_blue', 'Hellblau'], ['blue', 'Blau'], ['purple', 'Violett'], ['magenta', 'Magenta'], ['pink', 'Rosa'],
];
const DYE_FORMS = ['wool', 'carpet', 'concrete', 'concrete_powder', 'terracotta', 'glazed_terracotta', 'stained_glass', 'stained_glass_pane', 'bed', 'banner', 'wall_banner', 'candle', 'shulker_box'] as const;
const COLOURS: readonly MaterialSet[] = DYES.map(([id, label]) => ({ id: `farbe_${id}`, label, kind: 'farbe', forms: Object.fromEntries(DYE_FORMS.map(f => [f, `${id}_${f}`])) }));

/** Scoped families are additive: legacy colour swaps and generated version hashes stay stable. */
export const SCOPED_MATERIAL_SETS: readonly MaterialSet[] = [
  { id: 'glas_klar', label: 'Klarglas', kind: 'glas', forms: { stained_glass: 'glass', stained_glass_pane: 'glass_pane' } },
  ...DYES.map(([id, label]): MaterialSet => ({ id: `glas_${id}`, label: `Glas · ${label}`, kind: 'glas', forms: { stained_glass: `${id}_stained_glass`, stained_glass_pane: `${id}_stained_glass_pane` } })),
  ...DYES.map(([id, label]): MaterialSet => ({ id: `beton_${id}`, label: `Beton · ${label}`, kind: 'beton', forms: { concrete: `${id}_concrete`, concrete_powder: `${id}_concrete_powder` } })),
  { id: 'terrakotta_natur', label: 'Terrakotta · Natur', kind: 'terrakotta', forms: { terracotta: 'terracotta' } },
  ...DYES.map(([id, label]): MaterialSet => ({ id: `terrakotta_${id}`, label: `Terrakotta · ${label}`, kind: 'terrakotta', forms: { terracotta: `${id}_terracotta`, glazed_terracotta: `${id}_glazed_terracotta` } })),
];
const SCOPED_BY_ID = new Map(SCOPED_MATERIAL_SETS.map(s => [s.id, s]));
const SCOPED_MEMBER = new Map<string, { set: MaterialSet; form: string }>();
for (const set of SCOPED_MATERIAL_SETS) for (const [form, id] of Object.entries(set.forms)) SCOPED_MEMBER.set(id, { set, form });

export const MATERIAL_SETS: readonly MaterialSet[] = [...WOODS, ...STONES, ...COLOURS];
const SET_BY_ID = new Map(MATERIAL_SETS.map(s => [s.id, s]));
/** Block id (no namespace) → its set and form. Built once; ids are unique across sets (tested). */
const MEMBER = new Map<string, { set: MaterialSet; form: string }>();
for (const set of MATERIAL_SETS) for (const [form, id] of Object.entries(set.forms)) if (!MEMBER.has(id)) MEMBER.set(id, { set, form });

export function materialSet(id: string): MaterialSet | undefined { return SCOPED_BY_ID.get(id) ?? SET_BY_ID.get(id); }
const bare = (id: string) => id.startsWith('minecraft:') ? id.slice(10) : id;
/** Material set and form of a block id, if it belongs to one. */
export function materialOf(blockId: string): { set: MaterialSet; form: string } | undefined { return MEMBER.get(bare(blockId)); }

/** Specific families for UI; does not change legacy materialOf semantics. */
export function scopedMaterialOf(blockId: string): { set: MaterialSet; form: string } | undefined {
  return SCOPED_MEMBER.get(bare(blockId)) ?? materialOf(blockId);
}
export function materialTargets(from: MaterialSet): readonly MaterialSet[] {
  return [...MATERIAL_SETS, ...SCOPED_MATERIAL_SETS].filter(set => set.kind === from.kind);
}

export interface MaterialUse { readonly set: MaterialSet; readonly blocks: number; readonly forms: readonly string[] }
/** Material sets used by a payload with their block counts, most used first. */
export function detectMaterials(payload: Pick<VoxelPayload, 'cells' | 'palette'>, options: { readonly scoped?: boolean } = {}): MaterialUse[] {
  const uses = new Map<string, { set: MaterialSet; blocks: number; forms: Set<string> }>();
  for (const c of payload.cells) {
    if (c.kind !== 'block') continue;
    const m = (options.scoped ? scopedMaterialOf : materialOf)(payload.palette[c.paletteIndex]!.id);
    if (!m) continue;
    const u = uses.get(m.set.id) ?? { set: m.set, blocks: 0, forms: new Set<string>() };
    u.blocks++; u.forms.add(m.form); uses.set(m.set.id, u);
  }
  return [...uses.values()].map(u => ({ set: u.set, blocks: u.blocks, forms: [...u.forms].sort() })).sort((a, b) => b.blocks - a.blocks || (a.set.id < b.set.id ? -1 : 1));
}

export interface MaterialSwap { readonly from: string; readonly to: string; /** Optional restriction for the visible forms; absent retains legacy whole-set behaviour. */ readonly forms?: readonly string[] }
export interface SwapResult {
  readonly payload: VoxelPayload;
  /** Cells whose block id changed. */
  readonly replaced: number;
  /** Blocks kept because the target set lacks the form. */
  readonly unresolved: readonly { readonly id: string; readonly form: string; readonly target: string; readonly count: number }[];
}

/**
 * Applies all swaps at once (no chains: oak→spruce and spruce→oak exchange the
 * two woods). Swaps must stay within one material kind. The palette is rebuilt
 * so states that become equal merge; cells, air, erase and block entities keep
 * their positions.
 */
export function swapMaterials(payload: VoxelPayload, swaps: readonly MaterialSwap[]): SwapResult {
  const seen = new Set<string>();
  const sources = new Map<string, { from: MaterialSet; to: MaterialSet; form: string }>();
  for (const s of swaps) {
    const from = materialSet(s.from), to = materialSet(s.to);
    if (!from || !to) throw new Error(`Unbekannter Materialsatz: ${!from ? s.from : s.to}`);
    if (from.kind !== to.kind) throw new Error(`${from.label} (${MATERIAL_KIND_LABEL[from.kind]}) lässt sich nicht gegen ${to.label} (${MATERIAL_KIND_LABEL[to.kind]}) tauschen`);
    if (seen.has(from.id)) throw new Error(`${from.label} ist doppelt als Quelle angegeben`);
    seen.add(from.id);
    if (s.forms?.some(form => !Object.hasOwn(from.forms, form))) throw new Error(`Unbekannte Quellform in ${from.label}`);
    if (from.id === to.id) continue;
    for (const [form, id] of Object.entries(from.forms)) {
      if (s.forms && !s.forms.includes(form)) continue;
      const key = `minecraft:${id}`;
      if (sources.has(key)) throw new Error(`Überlappende Materialsätze für ${key}`);
      sources.set(key, { from, to, form });
    }
  }
  const missing = new Map<string, { id: string; form: string; target: string; count: number }>();
  const mapped: (BlockState | null)[] = payload.palette.map(state => {
    const m = sources.get(state.id);
    if (!m) return null;
    const target = m.to.forms[m.form];
    if (!target) { missing.set(state.id, { id: state.id, form: m.form, target: m.to.label, count: 0 }); return null; }
    const targetId = `minecraft:${target}`;
    if (targetId === state.id) return null;
    const sourceRule = stateRuleFor(state.id), targetRule = stateRuleFor(targetId);
    const schemas = [sourceRule?.schema ?? {}, targetRule?.schema ?? {}];
    const keys = Object.keys(state.properties);
    for (const schema of schemas) {
      if (keys.length !== Object.keys(schema).length || keys.some(k => !schema[k]?.includes(state.properties[k]!)))
        throw new Error(`Eigenschaften von ${state.id} sind für ${targetId} nicht sicher übertragbar`);
    }
    return { id: targetId, properties: state.properties };
  });
  const changedPositions = new Set(payload.cells.filter(c => c.kind === 'block' && mapped[c.paletteIndex]).map(c => c.position.join(',')));
  if (payload.blockEntities.some(e => changedPositions.has(e.position.join(','))))
    throw new Error('Materialtausch an BlockEntity-Zellen benötigt einen geprüften NBT-Adapter; Original bleibt unverändert');
  const palette: BlockState[] = [], index = new Map<string, number>();
  const remap = payload.palette.map((state, i) => {
    const next = mapped[i] ?? state, key = stateKey(next);
    let j = index.get(key);
    if (j === undefined) { j = palette.length; palette.push(next); index.set(key, j); }
    return j;
  });
  let replaced = 0;
  const cells: Cell[] = payload.cells.map(c => {
    if (c.kind === 'erase') return c;
    if (mapped[c.paletteIndex]) replaced++;
    else { const miss = missing.get(payload.palette[c.paletteIndex]!.id); if (miss && c.kind === 'block') miss.count++; }
    return { ...c, paletteIndex: remap[c.paletteIndex]! };
  });
  const result = createPayload({ ...payload, palette, cells });
  return { payload: result, replaced, unresolved: [...missing.values()].filter(m => m.count > 0).sort((a, b) => b.count - a.count) };
}

/** Short German name of a swap list, e.g. "Fichte · Tiefenschieferziegel". */
export function swapLabel(swaps: readonly MaterialSwap[]): string {
  return swaps.filter(s => s.from !== s.to).map(s => materialSet(s.to)?.label ?? s.to).join(' · ');
}
