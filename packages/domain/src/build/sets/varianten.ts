import type { BuildingFacets } from '../../catalog.js';
import { MATERIAL_SETS, swapMaterials } from '../../variants.js';
import type { MaterialSwap } from '../../variants.js';
import type { BuildingSpec } from '../spec.js';

/**
 * Materialfamilien (B12): shipped buildings in other woods and stones, made
 * with the same material swap the library offers for own buildings. The base
 * building joins the family as "Original"; every variant keeps form and
 * orientation of each block. Tests require that no swap leaves a form unresolved.
 */
interface VariantDef {
  readonly suffix: string;
  readonly label: string;
  readonly swaps: readonly MaterialSwap[];
  /** Facets that change with the material (e.g. biome of a sandstone tower). */
  readonly facets?: Partial<BuildingFacets>;
  readonly tags?: readonly string[];
}
interface FamilyDef { readonly base: string; readonly id: string; readonly label: string; readonly original: string; readonly variants: readonly VariantDef[] }

export const MATERIAL_FAMILIES: readonly FamilyDef[] = [
  { base: 'bld_rundturm', id: 'rundturm', label: 'Rundturm', original: 'Steinziegel', variants: [
    { suffix: 'tiefenschiefer', label: 'Tiefenschiefer', swaps: [{ from: 'stone_bricks', to: 'deepslate_bricks' }, { from: 'cobblestone', to: 'cobbled_deepslate' }, { from: 'spruce', to: 'dark_oak' }],
      facets: { biom: ['gebirge', 'hoehle', 'ueberall'] } },
    { suffix: 'schwarzstein', label: 'Schwarzstein', swaps: [{ from: 'stone_bricks', to: 'polished_blackstone_bricks' }, { from: 'cobblestone', to: 'blackstone' }, { from: 'spruce', to: 'crimson' }],
      facets: { stil: ['mittelalterlich', 'nether'], biom: ['nether'] } },
    { suffix: 'sandstein', label: 'Sandstein', swaps: [{ from: 'stone_bricks', to: 'sandstone' }, { from: 'cobblestone', to: 'red_sandstone' }, { from: 'spruce', to: 'acacia' }],
      facets: { stil: ['mittelalterlich', 'wuestenstil'], biom: ['wueste', 'savanne', 'badlands'] } },
  ] },
  { base: 'bld_stadthaus', id: 'stadthaus', label: 'Stadthaus', original: 'Backstein', variants: [
    { suffix: 'lehm', label: 'Lehmziegel', swaps: [{ from: 'bricks', to: 'mud_bricks' }, { from: 'dark_oak', to: 'acacia' }],
      facets: { biom: ['savanne', 'wueste', 'sumpf'] } },
    { suffix: 'tiefenschiefer', label: 'Tiefenschiefer', swaps: [{ from: 'bricks', to: 'deepslate_bricks' }, { from: 'dark_oak', to: 'spruce' }, { from: 'stone_bricks', to: 'polished_deepslate' }],
      facets: { biom: ['taiga', 'gebirge', 'schnee'] } },
    { suffix: 'kirsche', label: 'Kirsche', swaps: [{ from: 'bricks', to: 'quartz' }, { from: 'dark_oak', to: 'cherry' }],
      facets: { biom: ['kirschhain', 'ebene'] } },
  ] },
  { base: 'bld_bauernhaus', id: 'bauernhaus', label: 'Bauernhaus', original: 'Fichte', variants: [
    { suffix: 'schwarzeiche', label: 'Schwarzeiche', swaps: [{ from: 'spruce', to: 'dark_oak' }, { from: 'oak', to: 'spruce' }, { from: 'cobblestone', to: 'stone_bricks' }],
      facets: { biom: ['wald', 'ebene'] } },
    { suffix: 'akazie', label: 'Akazie', swaps: [{ from: 'spruce', to: 'acacia' }, { from: 'oak', to: 'jungle' }, { from: 'cobblestone', to: 'sandstone' }],
      facets: { biom: ['savanne', 'wueste'] } },
    { suffix: 'kirsche', label: 'Kirsche', swaps: [{ from: 'spruce', to: 'cherry' }, { from: 'oak', to: 'birch' }, { from: 'cobblestone', to: 'andesite' }],
      facets: { biom: ['kirschhain', 'ebene'] } },
  ] },
  { base: 'bld_bergfried', id: 'bergfried', label: 'Bergfried', original: 'Steinziegel', variants: [
    { suffix: 'tiefenschiefer', label: 'Tiefenschiefer', swaps: [{ from: 'stone_bricks', to: 'deepslate_bricks' }, { from: 'spruce', to: 'dark_oak' }, { from: 'polished_andesite', to: 'polished_deepslate' }],
      facets: { biom: ['gebirge', 'ueberall'] } },
    { suffix: 'schwarzstein', label: 'Schwarzstein', swaps: [{ from: 'stone_bricks', to: 'polished_blackstone_bricks' }, { from: 'spruce', to: 'warped' }, { from: 'polished_andesite', to: 'blackstone' }],
      facets: { stil: ['mittelalterlich', 'nether'], biom: ['nether'] } },
    { suffix: 'endstein', label: 'Endstein', swaps: [{ from: 'stone_bricks', to: 'end_stone_bricks' }, { from: 'spruce', to: 'pale_oak' }, { from: 'polished_andesite', to: 'quartz' }],
      facets: { stil: ['mittelalterlich', 'end'], biom: ['end'] } },
  ] },
  { base: 'bld_windmuehle', id: 'windmuehle', label: 'Windmühle', original: 'Bruchstein', variants: [
    { suffix: 'birke', label: 'Birke & Andesit', swaps: [{ from: 'cobblestone', to: 'andesite' }, { from: 'spruce', to: 'birch' }, { from: 'dark_oak', to: 'spruce' }],
      facets: { biom: ['ebene', 'wald'] } },
    { suffix: 'sandstein', label: 'Akazie & Sandstein', swaps: [{ from: 'cobblestone', to: 'sandstone' }, { from: 'spruce', to: 'acacia' }, { from: 'dark_oak', to: 'jungle' }],
      facets: { biom: ['wueste', 'savanne'] } },
  ] },
  // Katalog v3: Biom-Stile bestehender Gebäude und Holzfamilien der Raummodule.
  { base: 'bld_taverne', id: 'taverne', label: 'Taverne', original: 'Fichte & Steinziegel', variants: [
    { suffix: 'savanne', label: 'Savanne', swaps: [{ from: 'spruce', to: 'acacia' }, { from: 'dark_oak', to: 'jungle' }, { from: 'stone_bricks', to: 'sandstone' }, { from: 'cobblestone', to: 'red_sandstone' }],
      facets: { stil: ['mittelalterlich', 'wuestenstil'], biom: ['savanne', 'wueste'] } },
    { suffix: 'kirschhain', label: 'Kirschhain', swaps: [{ from: 'spruce', to: 'cherry' }, { from: 'dark_oak', to: 'birch' }, { from: 'stone_bricks', to: 'polished_andesite' }, { from: 'cobblestone', to: 'andesite' }],
      facets: { stil: ['mittelalterlich', 'fernoestlich'], biom: ['kirschhain'] } },
    { suffix: 'sumpf', label: 'Sumpf', swaps: [{ from: 'spruce', to: 'mangrove' }, { from: 'dark_oak', to: 'spruce' }, { from: 'stone_bricks', to: 'mud_bricks' }, { from: 'cobblestone', to: 'mossy_cobblestone' }],
      facets: { stil: ['mittelalterlich', 'rustikal'], biom: ['sumpf'] } },
  ] },
  { base: 'bld_rathaus', id: 'rathaus', label: 'Rathaus', original: 'Steinziegel', variants: [
    { suffix: 'wueste', label: 'Wüste', swaps: [{ from: 'stone_bricks', to: 'sandstone' }, { from: 'deepslate_tiles', to: 'red_sandstone' }, { from: 'polished_andesite', to: 'smooth_sandstone' }, { from: 'spruce', to: 'acacia' }],
      facets: { stil: ['klassisch', 'wuestenstil'], biom: ['wueste', 'savanne', 'badlands'] } },
    { suffix: 'tuff', label: 'Tuff', swaps: [{ from: 'stone_bricks', to: 'tuff_bricks' }, { from: 'deepslate_tiles', to: 'deepslate_bricks' }, { from: 'polished_andesite', to: 'polished_tuff' }, { from: 'spruce', to: 'dark_oak' }],
      facets: { biom: ['gebirge', 'hoehle', 'ueberall'] } },
  ] },
  { base: 'bld_kathedrale', id: 'kathedrale', label: 'Kathedrale', original: 'Steinziegel', variants: [
    { suffix: 'sandstein', label: 'Sandstein', swaps: [{ from: 'stone_bricks', to: 'sandstone' }, { from: 'deepslate_tiles', to: 'red_sandstone' }, { from: 'polished_andesite', to: 'smooth_sandstone' }, { from: 'spruce', to: 'acacia' }],
      facets: { biom: ['wueste', 'savanne', 'badlands'] } },
    { suffix: 'schwarzstein', label: 'Schwarzstein', swaps: [{ from: 'stone_bricks', to: 'polished_blackstone_bricks' }, { from: 'deepslate_tiles', to: 'nether_bricks' }, { from: 'polished_andesite', to: 'blackstone' }, { from: 'spruce', to: 'crimson' }],
      facets: { stil: ['mittelalterlich', 'nether'], biom: ['nether'] } },
    { suffix: 'endstein', label: 'Endstein', swaps: [{ from: 'stone_bricks', to: 'end_stone_bricks' }, { from: 'deepslate_tiles', to: 'prismarine_bricks' }, { from: 'polished_andesite', to: 'quartz' }, { from: 'spruce', to: 'pale_oak' }],
      facets: { stil: ['fantasy', 'end'], biom: ['end'] } },
  ] },
  { base: 'bld_uhrturm', id: 'uhrturm', label: 'Uhrturm', original: 'Steinziegel & Ziegel', variants: [
    { suffix: 'lehm', label: 'Lehmziegel', swaps: [{ from: 'stone_bricks', to: 'mud_bricks' }, { from: 'bricks', to: 'red_sandstone' }],
      facets: { biom: ['wueste', 'savanne', 'sumpf'] } },
    { suffix: 'tiefenschiefer', label: 'Tiefenschiefer', swaps: [{ from: 'stone_bricks', to: 'deepslate_bricks' }, { from: 'bricks', to: 'polished_deepslate' }],
      facets: { biom: ['gebirge', 'schnee', 'taiga'] } },
  ] },
  { base: 'bld_chalet', id: 'chalet', label: 'Berg-Chalet', original: 'Fichte', variants: [
    { suffix: 'dunkelwald', label: 'Dunkelwald', swaps: [{ from: 'spruce', to: 'dark_oak' }, { from: 'stone_bricks', to: 'deepslate_bricks' }, { from: 'cobblestone', to: 'cobbled_deepslate' }],
      facets: { biom: ['wald'] } },
    { suffix: 'blasseiche', label: 'Blasseiche', swaps: [{ from: 'spruce', to: 'pale_oak' }, { from: 'stone_bricks', to: 'polished_tuff' }, { from: 'cobblestone', to: 'andesite' }],
      facets: { stil: ['nordisch', 'fantasy'], biom: ['wald', 'schnee'] } },
  ] },
  { base: 'bld_langhaus', id: 'langhaus', label: 'Wikinger-Langhaus', original: 'Fichte & Schwarzeiche', variants: [
    { suffix: 'birke', label: 'Birke', swaps: [{ from: 'spruce', to: 'birch' }, { from: 'dark_oak', to: 'oak' }, { from: 'cobblestone', to: 'andesite' }],
      facets: { biom: ['wald', 'ebene', 'kueste'] } },
    { suffix: 'mangrove', label: 'Mangrove', swaps: [{ from: 'spruce', to: 'mangrove' }, { from: 'dark_oak', to: 'spruce' }, { from: 'cobblestone', to: 'mud_bricks' }],
      facets: { biom: ['sumpf', 'kueste'] } },
  ] },
  { base: 'bld_raum_schlafzimmer', id: 'schlafzimmer', label: 'Schlafzimmer', original: 'Eiche', variants: [
    { suffix: 'fichte', label: 'Fichte', swaps: [{ from: 'oak', to: 'spruce' }], facets: { stil: ['rustikal', 'nordisch'] } },
    { suffix: 'birke', label: 'Birke', swaps: [{ from: 'oak', to: 'birch' }], facets: { stil: ['klassisch', 'modern'] } },
    { suffix: 'kirsche', label: 'Kirsche', swaps: [{ from: 'oak', to: 'cherry' }], facets: { stil: ['klassisch', 'fernoestlich'] } },
    { suffix: 'schwarzeiche', label: 'Schwarzeiche', swaps: [{ from: 'oak', to: 'dark_oak' }], facets: { stil: ['klassisch', 'viktorianisch'] } },
  ] },
  { base: 'bld_raum_kaminzimmer', id: 'kaminzimmer', label: 'Kaminzimmer', original: 'Fichte', variants: [
    { suffix: 'kirsche', label: 'Kirsche', swaps: [{ from: 'spruce', to: 'cherry' }, { from: 'stone_bricks', to: 'polished_andesite' }], facets: { stil: ['klassisch'] } },
    { suffix: 'schwarzeiche', label: 'Schwarzeiche', swaps: [{ from: 'spruce', to: 'dark_oak' }, { from: 'stone_bricks', to: 'deepslate_bricks' }], facets: { stil: ['viktorianisch', 'rustikal'] } },
  ] },
];
/** Existing shipped buildings that join a family defined elsewhere. */
const JOIN: Readonly<Record<string, NonNullable<BuildingSpec['family']>>> = {
  bld_leuchtfeuer: { id: 'leuchtfeuer', label: 'Leuchtfeuer', variant: 'Stufe 4' },
};

const label = (id: string) => MATERIAL_SETS.find(m => m.id === id)?.label ?? id;

/** Adds the family to each base, appends the generated variants right after their base. */
export function withMaterialFamilies(specs: readonly BuildingSpec[]): BuildingSpec[] {
  const out: BuildingSpec[] = [];
  for (const spec of specs) {
    const fam = MATERIAL_FAMILIES.find(f => f.base === spec.id);
    if (JOIN[spec.id]) { out.push({ ...spec, family: JOIN[spec.id]! }); continue; }
    if (!fam) { out.push(spec); continue; }
    if (spec.family) throw new Error(`${spec.id} gehört schon zur Familie ${spec.family.id}`);
    out.push({ ...spec, family: { id: fam.id, label: fam.label, variant: fam.original } });
    for (const v of fam.variants) out.push({
      ...spec,
      id: `${spec.id}_${v.suffix}`,
      name: `${spec.name} (${v.label})`,
      description: `${spec.description} Materialvariante: ${v.swaps.map(s => `${label(s.from)} → ${label(s.to)}`).join(', ')}.`,
      payload: () => swapMaterials(spec.payload(), v.swaps).payload,
      facets: { ...spec.facets, ...v.facets },
      tags: [...spec.tags, ...(v.tags ?? [])],
      family: { id: fam.id, label: fam.label, variant: v.label },
      tips: [...(spec.tips ?? []), 'Erzeugt mit dem Materialtausch der Bibliothek: Form und Ausrichtung jedes Blocks sind wie im Original.'],
    });
  }
  return out;
}

/** Swap list of a generated variant (tests check that no form stays unresolved). */
export function variantSwaps(id: string): readonly MaterialSwap[] | undefined {
  for (const f of MATERIAL_FAMILIES) for (const v of f.variants) if (`${f.base}_${v.suffix}` === id) return v.swaps;
  return undefined;
}
