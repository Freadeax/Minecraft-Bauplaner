import type { Vec3, VoxelPayload } from '../../../voxel/src/types.js';
import type { BuildingFacets } from '../catalog.js';
import type { Connector } from '../types.js';

/** A link to the idea behind a design (own implementation, no copied schematic). */
export interface Inspiration { readonly label: string; readonly url: string }

export interface BuildingSpec {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly facets: BuildingFacets;
  readonly tags: readonly string[];
  readonly payload: () => VoxelPayload;
  readonly connectors?: readonly Connector[];
  /** Variant family: buildings of one family differ only in material or detail. */
  readonly family?: { readonly id: string; readonly label: string; readonly variant: string };
  /** Short build tips in German, shown on the building sheet. */
  readonly tips?: readonly string[];
  readonly inspiration?: readonly Inspiration[];
  /** Block ids the material catalogue leaves unresolved on purpose (liquids); tested. */
  readonly gaps?: readonly string[];
  /** Block ids counted as "assumed" in the material catalogue; tested. */
  readonly assumed?: readonly string[];
}

export const joint = (id: string, position: Vec3, normal: Vec3, type: string, profile: string): Connector => ({ id, position, normal, up: [0, 1, 0], type, profile });
/** Shared path connector of bridge, jetty and the path kit: a 4-wide deck end. */
export const PATH_PROFILE = 'weg_4';
export const WIKI = (page: string, label: string): Inspiration => ({ label: `Minecraft Wiki: ${label}`, url: `https://minecraft.wiki/w/${page}` });

export interface WoodPalette {
  readonly key: string;
  readonly label: string;
  readonly log: string;
  readonly stripped: string;
  readonly biome: readonly string[];
  readonly bed: string;
  /** Block for foundations and accents that fits the wood. */
  readonly accent: string;
}
export const WOOD_PALETTES: readonly WoodPalette[] = [
  { key: 'oak', label: 'Eiche', log: 'oak_log', stripped: 'stripped_oak_log', biome: ['ebene', 'wald'], bed: 'red', accent: 'cobblestone' },
  { key: 'spruce', label: 'Fichte', log: 'spruce_log', stripped: 'stripped_spruce_log', biome: ['taiga', 'schnee'], bed: 'blue', accent: 'stone_bricks' },
  { key: 'birch', label: 'Birke', log: 'birch_log', stripped: 'stripped_birch_log', biome: ['wald', 'ebene'], bed: 'yellow', accent: 'polished_andesite' },
  { key: 'jungle', label: 'Tropenholz', log: 'jungle_log', stripped: 'stripped_jungle_log', biome: ['dschungel'], bed: 'lime', accent: 'mossy_cobblestone' },
  { key: 'acacia', label: 'Akazie', log: 'acacia_log', stripped: 'stripped_acacia_log', biome: ['savanne'], bed: 'orange', accent: 'terracotta' },
  { key: 'dark_oak', label: 'Schwarzeiche', log: 'dark_oak_log', stripped: 'stripped_dark_oak_log', biome: ['wald'], bed: 'brown', accent: 'deepslate_bricks' },
  { key: 'mangrove', label: 'Mangrove', log: 'mangrove_log', stripped: 'stripped_mangrove_log', biome: ['sumpf'], bed: 'green', accent: 'mud_bricks' },
  { key: 'cherry', label: 'Kirsche', log: 'cherry_log', stripped: 'stripped_cherry_log', biome: ['kirschhain'], bed: 'pink', accent: 'calcite' },
];
