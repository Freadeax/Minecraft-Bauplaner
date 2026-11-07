import { addAssetVersion, BASIS_PREFIX, createAsset, FAMILY_PREFIX, materialSet, STYLE_PALETTES } from '../../../../../packages/domain/src/index.js';
import type { Asset, AssetVersion, LibraryTemplate, MaterialSwap, PaletteRoles } from '../../../../../packages/domain/src/index.js';
import type { VoxelPayload } from '../../../../../packages/voxel/src/index.js';

/**
 * Gemeinsame Bausteine für Materialvarianten und Baustil-Paletten (LIB-07): eine Variante ist
 * ein neues Bauteil mit Verweis auf seine Basis (Tag basis:<id>), Familie bleibt erhalten.
 */
export interface PaletteChoice {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly roles: PaletteRoles;
  /** Eigene Palette (Vorlage), sonst mitgeliefert. */
  readonly own?: LibraryTemplate;
}

/** Mitgelieferte und eigene (nicht archivierte) Paletten, eigene zuerst. */
export function paletteChoices(templates: readonly LibraryTemplate[]): PaletteChoice[] {
  const own = templates.filter(t => t.body.kind === 'palette' && !t.archived).sort((a, b) => a.name.localeCompare(b.name, 'de'))
    .map(t => ({ id: t.id, name: t.name, description: t.description, roles: t.body.kind === 'palette' ? t.body.roles : {}, own: t }));
  return [...own, ...STYLE_PALETTES];
}

const setLabel = (id: string) => materialSet(id)?.label ?? id;

/** Neues Variantenbauteil aus einer getauschten Payload. */
export async function variantAsset(base: Asset, latest: AssetVersion, payload: VoxelPayload, swaps: readonly MaterialSwap[], input: { name: string; family?: string | undefined; palette?: string }) {
  const keep = base.tags.filter(t => !t.startsWith(BASIS_PREFIX) && !t.startsWith(FAMILY_PREFIX));
  const how = swaps.map(s => `${setLabel(s.from)} → ${setLabel(s.to)} (Formen: ${s.forms?.join(', ') ?? 'alle'})`).join(', ');
  const created = createAsset({
    name: input.name.slice(0, 120),
    tags: [...keep, `${BASIS_PREFIX}${base.id}`, ...(input.family ? [`${FAMILY_PREFIX}${input.family}`] : [])],
    description: `${input.palette ? `Baustil-Palette „${input.palette}“ auf` : 'Materialvariante von'} „${base.name}“ (v${latest.label}): ${how}. Form und Ausrichtung jedes Blocks unverändert.`,
    provenance: { ...base.provenance, source: `abgeleitet von „${base.name}“ (${input.palette ? `Baustil-Palette ${input.palette}` : 'Materialtausch'} im Build Studio)` },
  });
  return addAssetVersion(created, { payload, label: '1.0', connectors: latest.connectors, source: { format: 'variant' } });
}
