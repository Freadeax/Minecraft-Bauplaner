export const blockColors = ['#c7d4d5','#b58452','#895e39','#7cc3b4','#8e9ca9'];

/**
 * Approximate preview colours; not Minecraft textures. Exact ids first, then
 * material families: dye colours (wool, concrete, terracotta, glass, beds …),
 * wood types (planks, bark, leaves) and stone/metal materials, each also for
 * their shapes (stairs, slabs, walls, fences, panes, doors …). Unknown ids get a
 * stable hashed colour.
 */
const known: Record<string, string> = {
  'minecraft:stone': '#9a9d9f', 'minecraft:cobblestone': '#7d7f80', 'minecraft:stone_bricks': '#a3a6a8', 'minecraft:mossy_stone_bricks': '#7f9670',
  'minecraft:oak_planks': '#b58452', 'minecraft:oak_log': '#895e39', 'minecraft:oak_fence': '#a77a4b', 'minecraft:oak_stairs': '#b07d4c',
  'minecraft:spruce_planks': '#7a5a36', 'minecraft:glass': '#bfe3ea', 'minecraft:water': '#3f76e4', 'minecraft:lava': '#e4682a',
  'minecraft:sand': '#dbcf9c', 'minecraft:dirt': '#87623f', 'minecraft:grass_block': '#6d9b45', 'minecraft:barrel': '#8a6340',
};

/** Longest names first so light_blue wins over blue. */
const DYES: readonly (readonly [string, string])[] = ([
  ['white', '#e9ecec'], ['orange', '#f07613'], ['magenta', '#bd44b3'], ['light_blue', '#3aafd9'], ['yellow', '#f8c527'], ['lime', '#70b919'],
  ['pink', '#ed8dac'], ['gray', '#3e4447'], ['light_gray', '#8e8e86'], ['cyan', '#158991'], ['purple', '#792aac'], ['blue', '#35399d'],
  ['brown', '#724728'], ['green', '#546d1b'], ['red', '#a12722'], ['black', '#1d1d21'],
] as [string, string][]).sort((a, b) => b[0].length - a[0].length);

/** [planks, bark, leaves] per wood type; longest names first (dark_oak, pale_oak before oak). */
const WOODS: readonly (readonly [string, string, string, string])[] = ([
  ['oak', '#b58452', '#6d5533', '#4f7f32'], ['spruce', '#7a5a36', '#3a2611', '#3d5e3d'], ['birch', '#c8b77a', '#d8d7d2', '#80a755'],
  ['jungle', '#a07350', '#56461d', '#45812b'], ['acacia', '#a85a32', '#686158', '#5c8a2a'], ['dark_oak', '#4f3218', '#3c2e1a', '#3f6a22'],
  ['mangrove', '#773633', '#54433a', '#5d8a2e'], ['cherry', '#e3b3ad', '#36202a', '#e8a7c5'], ['bamboo', '#c2ad51', '#7f9a32', '#6b8f2e'],
  ['crimson', '#6a344b', '#5c1a1e', '#7b0000'], ['warped', '#2b6963', '#3a3a4d', '#167e86'], ['pale_oak', '#e4d9d5', '#5a5150', '#8a9289'],
  ['azalea', '#b58452', '#6d5533', '#5e7a2e'], ['flowering_azalea', '#b58452', '#6d5533', '#6f7a3a'],
] as [string, string, string, string][]).sort((a, b) => b[0].length - a[0].length);

/** Materials by stem (singular, without _block): stone_brick covers stone_bricks, stone_brick_stairs, … */
const MATERIALS: Readonly<Record<string, string>> = {
  stone: '#9a9d9f', cobblestone: '#7d7f80', stone_brick: '#a3a6a8', mossy_stone_brick: '#7f9670', mossy_cobblestone: '#6e7660',
  cracked_stone_brick: '#959799', chiseled_stone_brick: '#9c9ea0', smooth_stone: '#a7a9ab', andesite: '#888889', polished_andesite: '#848685',
  granite: '#956756', polished_granite: '#9a6a59', diorite: '#bcbcbc', polished_diorite: '#c0c1c2', deepslate: '#505052', cobbled_deepslate: '#4d4d50',
  polished_deepslate: '#48484a', deepslate_brick: '#46464a', deepslate_tile: '#363637', tuff: '#6c6d66', polished_tuff: '#626660', tuff_brick: '#62635c',
  calcite: '#dfe0dc', sandstone: '#d8cb9b', smooth_sandstone: '#dccf9f', cut_sandstone: '#d9cc9e', chiseled_sandstone: '#d5c896',
  red_sandstone: '#ba631d', smooth_red_sandstone: '#b5621f', cut_red_sandstone: '#bd6620', brick: '#966153', mud_brick: '#89674f', packed_mud: '#8e6b50', mud: '#3c393d',
  quartz: '#ebe5de', smooth_quartz: '#ece6df', chiseled_quartz: '#e7e2da', quartz_brick: '#eae4dc', quartz_pillar: '#ebe6e0',
  purpur: '#a97ca9', purpur_pillar: '#ab7fab', prismarine: '#63a397', prismarine_brick: '#63ab9e', dark_prismarine: '#335b4b',
  nether_brick: '#2c161a', red_nether_brick: '#450709', blackstone: '#2a2329', polished_blackstone: '#353038', polished_blackstone_brick: '#302a31',
  end_stone: '#dbde9e', end_stone_brick: '#dadd9e', obsidian: '#0f0a18', crying_obsidian: '#200a3c', glass: '#bfe3ea', tinted_glass: '#2c2731', terracotta: '#985e43',
  copper: '#c06c50', cut_copper: '#bf6a50', exposed_copper: '#a1806a', exposed_cut_copper: '#9a7965', weathered_copper: '#6c9f6b', weathered_cut_copper: '#6d9f6b',
  oxidized_copper: '#52a285', oxidized_cut_copper: '#4f9a80', iron: '#d8d8d8', gold: '#f6d03d', diamond: '#62ede4', emerald: '#2acb57', lapis: '#1f438c',
  redstone: '#af1805', coal: '#101010', netherite: '#423d3f', amethyst: '#8562c4', netherrack: '#622626', glowstone: '#ab8654', sea_lantern: '#acc8be',
  snow: '#f9fefe', ice: '#91b7fd', packed_ice: '#8db4fa', blue_ice: '#74a8fd', hay: '#a68b0c', gravel: '#837f7e', coarse_dirt: '#77553b', podzol: '#5a3f1c',
  mycelium: '#6f6264', clay: '#a0a6b3', moss: '#596e2d', pale_moss: '#6b7069', farmland: '#5d3a1f', dirt_path: '#94793f', rooted_dirt: '#90684c',
  melon: '#6f9118', pumpkin: '#c37419', carved_pumpkin: '#b66617', jack_o_lantern: '#d38a26', bookshelf: '#755f3c', crafting_table: '#7d5a36', furnace: '#6e6e6e',
  blast_furnace: '#5f5f60', smoker: '#55493a', chest: '#a2732e', trapped_chest: '#a2732e', iron_bar: '#8a8b88', lantern: '#695c4c', torch: '#ffd36b', wall_torch: '#ffd36b',
  ladder: '#a1814b', glass_pane: '#bfe3ea', bone: '#d1cdb4', magma: '#8e3f1f', slime: '#6fc05b', honey: '#f8b82a', resin: '#d96b1c', resin_brick: '#ce5e1a',
  rail: '#8a7c66', powered_rail: '#b49a3c', detector_rail: '#7d6a5a', activator_rail: '#8c5a4a', hopper: '#4b4b4e', redstone_wire: '#c41a0b',
  repeater: '#b3aca6', comparator: '#b3aca6', redstone_lamp: '#8f5f36', observer: '#5e5e5e', piston: '#a28b62', sticky_piston: '#8fa060', lever: '#7a6a55',
  red_mushroom: '#b62121', brown_mushroom: '#946f50', mushroom_stem: '#cbc4b9', shroomlight: '#f19646', cactus: '#5a8a2c', sugar_cane: '#94c065',
  lily_pad: '#2a7a2a', beehive: '#b88a45', composter: '#7a5a30', barrel: '#86643a', target: '#e4d3c0', note_block: '#6a4b35', beacon: '#7fe3e0',
  dripstone: '#866b5c', basalt: '#4c4c52', smooth_basalt: '#48484d', polished_basalt: '#58585c', soul_sand: '#513e32', soul_soil: '#4b3a2f',
};
const SHAPES = ['_fence_gate', '_pressure_plate', '_hanging_sign', '_wall_sign', '_stairs', '_slab', '_wall', '_fence', '_button', '_pane', '_trapdoor', '_door', '_sign'];

function hashed(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hue = h % 360, s = 0.35, l = 0.58;
  const f = (n: number) => { const k = (n + hue / 30) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0'); };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const DYED = new Set(['wool', 'carpet', 'concrete', 'concrete_powder', 'terracotta', 'glazed_terracotta', 'stained_glass', 'stained_glass_pane', 'bed', 'banner', 'wall_banner',
  'candle', 'candle_cake', 'shulker_box']);

function dyeColor(name: string): string | null {
  const dye = DYES.find(([d]) => name.startsWith(`${d}_`));
  if (!dye) return null;
  const rest = name.slice(dye[0].length + 1);
  if (!DYED.has(rest)) return null; // red_sandstone, brown_mushroom, … are materials, not dyed blocks
  if (rest === 'terracotta') return mix(dye[1], '#985e43', 0.45);
  if (rest.startsWith('stained_glass')) return mix(dye[1], '#ffffff', 0.35);
  if (rest === 'concrete_powder') return mix(dye[1], '#ffffff', 0.15);
  return dye[1];
}

function woodColor(name: string): string | null {
  const stripped = name.startsWith('stripped_'), bare = stripped ? name.slice('stripped_'.length) : name;
  const wood = WOODS.find(([w]) => bare.startsWith(`${w}_`));
  if (!wood) return null;
  const rest = bare.slice(wood[0].length + 1);
  if (rest === 'leaves') return wood[3];
  if (!stripped && /^(log|wood|stem|hyphae|block)$/.test(rest)) return wood[2];
  return wood[1];
}

function materialColor(name: string): string | null {
  const shape = SHAPES.find(s => name.endsWith(s));
  const stem = shape ? name.slice(0, -shape.length) : name;
  for (const c of [stem, stem.replace(/s$/, ''), stem.replace(/_block$/, ''), stem.replace(/_bricks$/, '_brick'), stem.replace(/_tiles$/, '_tile')]) if (MATERIALS[c]) return MATERIALS[c]!;
  return null;
}

export function stateColor(id: string): string {
  const hit = known[id];
  if (hit) return hit;
  const colon = id.indexOf(':');
  if (colon < 0 || id.slice(0, colon) === 'minecraft') {
    const name = id.slice(colon + 1).replace(/^waxed_/, '');
    const family = dyeColor(name) ?? woodColor(name) ?? materialColor(name);
    if (family) return family;
  }
  return hashed(id);
}

/** Mixes a hex colour towards another (t=0 → a, t=1 → b). */
export function mix(a: string, b: string, t: number): string {
  const pa = Number.parseInt(a.slice(1), 16), pb = Number.parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t).toString(16).padStart(2, '0');
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}
