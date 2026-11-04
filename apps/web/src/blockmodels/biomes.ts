/**
 * Biome colours of grass, foliage and water (GFX-02), as Minecraft Java 26.x
 * computes them for the biome's temperature and downfall (colormap) or sets
 * them as fixed overrides (swamp, badlands, cherry grove, pale garden …).
 * The mesh stores which colour class a face uses (`tintClass` in tint.ts) and
 * keeps the plains colour baked in; the shader multiplies with the ratio
 * biome / plains, so changing the biome never rebuilds geometry.
 * Spruce and birch leaves, lily pads and stems keep their fixed colours as in
 * the game. Dark forest grass is the averaged value the game shows.
 */
export type TintClass = 0 | 1 | 2 | 3;
/** 1 grass, 2 foliage, 3 water (0 = untinted). */
export const TINT_GRASS = 1, TINT_FOLIAGE = 2, TINT_WATER = 3;

export interface Biome {
  readonly id: string;
  readonly label: string;
  readonly grass: string;
  readonly foliage: string;
  readonly water: string;
}

export const BIOMES: readonly Biome[] = [
  { id: 'plains', label: 'Ebene', grass: '#91bd59', foliage: '#77ab2f', water: '#3f76e4' },
  { id: 'forest', label: 'Wald', grass: '#79c05a', foliage: '#59ae30', water: '#3f76e4' },
  { id: 'birch_forest', label: 'Birkenwald', grass: '#88bb67', foliage: '#6ba941', water: '#3f76e4' },
  { id: 'dark_forest', label: 'Dunkler Wald', grass: '#507a32', foliage: '#59ae30', water: '#3f76e4' },
  { id: 'jungle', label: 'Dschungel', grass: '#59c93c', foliage: '#30bb0b', water: '#3f76e4' },
  { id: 'taiga', label: 'Taiga', grass: '#86b783', foliage: '#68a464', water: '#3d57d6' },
  { id: 'snowy_plains', label: 'Verschneite Ebene', grass: '#80b497', foliage: '#60a17b', water: '#3d57d6' },
  { id: 'meadow', label: 'Wiese (Berge)', grass: '#83bb6d', foliage: '#63a948', water: '#0e4ecf' },
  { id: 'cherry_grove', label: 'Kirschblütenhain', grass: '#b6db61', foliage: '#b6db61', water: '#5db7ef' },
  { id: 'savanna', label: 'Savanne', grass: '#bfb755', foliage: '#aea42a', water: '#3f76e4' },
  { id: 'badlands', label: 'Tafelberge', grass: '#90814d', foliage: '#9e814d', water: '#3f76e4' },
  { id: 'swamp', label: 'Sumpf', grass: '#6a7039', foliage: '#6a7039', water: '#617b64' },
  { id: 'mangrove_swamp', label: 'Mangrovensumpf', grass: '#6a7039', foliage: '#8db127', water: '#3a7a6a' },
  { id: 'pale_garden', label: 'Blasser Garten', grass: '#778272', foliage: '#878d76', water: '#76889d' },
  { id: 'mushroom_fields', label: 'Pilzland', grass: '#55c93f', foliage: '#2bbb0f', water: '#3f76e4' },
  { id: 'warm_ocean', label: 'Warmer Ozean', grass: '#8eb971', foliage: '#71a74d', water: '#43d5ee' },
  { id: 'cold_ocean', label: 'Kalter Ozean', grass: '#8eb971', foliage: '#71a74d', water: '#3d57d6' },
];
export const DEFAULT_BIOME = 'plains';
export const biomeById = (id: string): Biome => BIOMES.find(b => b.id === id) ?? BIOMES[0]!;

const rgb = (hex: string): [number, number, number] => {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/**
 * Per tint class (index 0..3) the factor that turns the baked plains colour
 * into the biome colour; class 0 stays 1. 12 numbers for a vec3[4] uniform.
 */
export function biomeFactors(id: string): Float32Array {
  const plains = BIOMES[0]!, b = biomeById(id), out = new Float32Array(12);
  out.set([1, 1, 1], 0);
  const pairs: readonly (readonly [string, string])[] = [[b.grass, plains.grass], [b.foliage, plains.foliage], [b.water, plains.water]];
  pairs.forEach(([to, from], i) => {
    const t = rgb(to), f = rgb(from);
    out.set([t[0] / f[0], t[1] / f[1], t[2] / f[2]], (i + 1) * 3);
  });
  return out;
}
