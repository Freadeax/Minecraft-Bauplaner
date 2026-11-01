/**
 * Biome and state tints for faces with a tintindex, as Minecraft's block
 * colour providers apply them. The planner has no biome, so the plains
 * colours are used (grass #91bd59, foliage #77ab2f, water #3f76e4).
 * Blocks without a colour provider stay untinted even if a model face carries
 * a tintindex.
 */
const GRASS = '#91bd59', FOLIAGE = '#77ab2f', WATER = '#3f76e4', DRY_FOLIAGE = '#a8865a';
const FIXED: Readonly<Record<string, string>> = {
  grass_block: GRASS, short_grass: GRASS, tall_grass: GRASS, fern: GRASS, large_fern: GRASS, potted_fern: GRASS, sugar_cane: GRASS,
  bush: GRASS, pink_petals: GRASS, wildflowers: GRASS,
  oak_leaves: FOLIAGE, jungle_leaves: FOLIAGE, acacia_leaves: FOLIAGE, dark_oak_leaves: FOLIAGE, mangrove_leaves: FOLIAGE, vine: FOLIAGE,
  spruce_leaves: '#619961', birch_leaves: '#80a755', leaf_litter: DRY_FOLIAGE, lily_pad: '#208030',
  water: WATER, bubble_column: WATER, water_cauldron: WATER, attached_melon_stem: '#e0c71c', attached_pumpkin_stem: '#e0c71c',
};

const hex = (r: number, g: number, b: number) => `#${[r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;

/** Tint colour for a face of `id` with the given tintindex; null = untinted. */
export function tintColor(id: string, props: Readonly<Record<string, string>>, tintindex: number): string | null {
  if (tintindex < 0) return null;
  const name = id.startsWith('minecraft:') ? id.slice(10) : id;
  if (name === 'redstone_wire') {
    const f = Number(props.power ?? 0) / 15;
    return hex(255 * (f * 0.6 + (f > 0 ? 0.4 : 0.3)), 255 * Math.max(0, f * f * 0.7 - 0.5), 255 * Math.max(0, f * f * 0.6 - 0.7));
  }
  if (name === 'melon_stem' || name === 'pumpkin_stem') {
    const age = Number(props.age ?? 7);
    return hex(age * 32, 255 - age * 8, age * 4);
  }
  return FIXED[name] ?? null;
}
