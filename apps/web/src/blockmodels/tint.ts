/**
 * Biome and state tints for faces with a tintindex, as Minecraft's block
 * colour providers apply them. Meshes bake the plains colours (grass #91bd59,
 * foliage #77ab2f, water #3f76e4); the chosen biome is applied in the shader
 * (biomes.ts, GFX-02).
 * Blocks without a colour provider stay untinted even if a model face carries
 * a tintindex.
 */
import { TINT_FOLIAGE, TINT_GRASS, TINT_WATER } from './biomes.ts';
import type { TintClass } from './biomes.ts';

const GRASS = '#91bd59', FOLIAGE = '#77ab2f', WATER = '#3f76e4', DRY_FOLIAGE = '#a8865a';
/** Blocks whose tint follows the biome (GFX-02), by colour class. */
const BIOME_TINTED: Readonly<Record<string, TintClass>> = {
  grass_block: TINT_GRASS, short_grass: TINT_GRASS, tall_grass: TINT_GRASS, fern: TINT_GRASS, large_fern: TINT_GRASS, potted_fern: TINT_GRASS,
  sugar_cane: TINT_GRASS, bush: TINT_GRASS, pink_petals: TINT_GRASS, wildflowers: TINT_GRASS,
  oak_leaves: TINT_FOLIAGE, jungle_leaves: TINT_FOLIAGE, acacia_leaves: TINT_FOLIAGE, dark_oak_leaves: TINT_FOLIAGE, mangrove_leaves: TINT_FOLIAGE, vine: TINT_FOLIAGE,
  water: TINT_WATER, bubble_column: TINT_WATER, water_cauldron: TINT_WATER,
};
const CLASS_COLOUR = ['', GRASS, FOLIAGE, WATER] as const;
const FIXED: Readonly<Record<string, string>> = {
  ...Object.fromEntries(Object.entries(BIOME_TINTED).map(([k, c]) => [k, CLASS_COLOUR[c]])),
  spruce_leaves: '#619961', birch_leaves: '#80a755', leaf_litter: DRY_FOLIAGE, lily_pad: '#208030',
  attached_melon_stem: '#e0c71c', attached_pumpkin_stem: '#e0c71c',
};

/**
 * Biome colour class of a face (0 = none): faces with a tintindex of a
 * biome-tinted block, and – for the own shapes whose average colours already
 * contain the plains tint – the whole block, but only the top of a grass block.
 */
export function tintClass(id: string, tintindex: number, ownShapeFace?: string | null): TintClass {
  const name = id.startsWith('minecraft:') ? id.slice(10) : id;
  const c = BIOME_TINTED[name];
  if (!c) return 0;
  if (tintindex >= 0) return c;
  if (ownShapeFace === undefined) return 0;
  return name === 'grass_block' && ownShapeFace !== 'up' ? 0 : c;
}

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
