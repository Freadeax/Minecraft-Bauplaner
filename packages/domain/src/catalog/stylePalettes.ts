import type { VoxelPayload } from '../../../voxel/src/types.js';
import { detectMaterials, materialSet, swapMaterials } from '../materials/variants.js';
import type { MaterialKind, MaterialSwap, MaterialUse, SwapResult } from '../materials/variants.js';

/**
 * Baustil-Paletten (LIB-07): eine Palette legt für einen ganzen Baustil fest,
 * welches Holz, welcher Stein, welche Farbe, welches Glas, welcher Beton und
 * welche Terrakotta verwendet werden. Sie ist wiederverwendbar: dieselbe
 * Palette macht aus jedem Gebäude eine Materialvariante im selben Stil, so
 * passen Häuser einer Siedlung zusammen.
 *
 * Zuordnung: Im Gebäude wird je Materialart der meistverwendete Satz zur
 * Hauptrolle, bei Holz und Stein der zweithäufigste zum Akzent. Getauscht wird
 * Form für Form mit swapMaterials (B12), Ausrichtung und Form jedes Blocks
 * bleiben exakt. Fehlt dem Zielsatz eine Form, bleibt der Block und wird
 * gemeldet, nie erfunden.
 */
export type PaletteRole = 'holz_haupt' | 'holz_akzent' | 'stein_haupt' | 'stein_akzent' | 'farbe' | 'glas' | 'beton' | 'terrakotta';
export const PALETTE_ROLES: readonly PaletteRole[] = ['holz_haupt', 'holz_akzent', 'stein_haupt', 'stein_akzent', 'farbe', 'glas', 'beton', 'terrakotta'];
export const PALETTE_ROLE_LABEL: Readonly<Record<PaletteRole, string>> = {
  holz_haupt: 'Holz (Haupt)', holz_akzent: 'Holz (Akzent)', stein_haupt: 'Stein (Haupt)', stein_akzent: 'Stein (Akzent)',
  farbe: 'Farbe (Wolle, Teppich, Banner)', glas: 'Glas', beton: 'Beton', terrakotta: 'Terrakotta',
};
/** Materialart, aus der eine Rolle ihren Satz wählt. */
export const PALETTE_ROLE_KIND: Readonly<Record<PaletteRole, MaterialKind>> = {
  holz_haupt: 'holz', holz_akzent: 'holz', stein_haupt: 'stein', stein_akzent: 'stein', farbe: 'farbe', glas: 'glas', beton: 'beton', terrakotta: 'terrakotta',
};

export type PaletteRoles = Readonly<Partial<Record<PaletteRole, string>>>;
export interface StylePalette {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Rolle → Materialsatz-Id (materials/variants.ts). Fehlende Rollen bleiben im Gebäude, wie sie sind. */
  readonly roles: PaletteRoles;
}

/** Mitgelieferte Paletten; Namen und Zusammenstellung eigene Auswahl aus Vanilla-Blöcken. */
export const STYLE_PALETTES: readonly StylePalette[] = [
  { id: 'pal_fachwerk', name: 'Fachwerk & Bruchstein', description: 'Mittelalterliche Marktstadt: dunkles Fachwerk, Fichte, Bruchsteinsockel und Steinziegel.',
    roles: { holz_haupt: 'dark_oak', holz_akzent: 'spruce', stein_haupt: 'cobblestone', stein_akzent: 'stone_bricks', farbe: 'farbe_red', glas: 'glas_klar' } },
  { id: 'pal_nordisch', name: 'Nordische Bergsiedlung', description: 'Fichte und Schwarzeiche auf Tiefenschiefer, kühle Grautöne für Taiga und Gebirge.',
    roles: { holz_haupt: 'spruce', holz_akzent: 'dark_oak', stein_haupt: 'cobbled_deepslate', stein_akzent: 'deepslate_bricks', farbe: 'farbe_gray', glas: 'glas_klar' } },
  { id: 'pal_mediterran', name: 'Mediterrane Küste', description: 'Helle Birke, glatter Sandstein und Ziegeldächer in Orange, dazu weiße Stoffe.',
    roles: { holz_haupt: 'birch', holz_akzent: 'jungle', stein_haupt: 'smooth_sandstone', stein_akzent: 'bricks', farbe: 'farbe_white', glas: 'glas_klar', terrakotta: 'terrakotta_orange' } },
  { id: 'pal_wueste', name: 'Wüstenhandel', description: 'Akazie und Sandstein mit Lehmziegel-Akzenten, warme Farben für Oasen und Basare.',
    roles: { holz_haupt: 'acacia', holz_akzent: 'jungle', stein_haupt: 'sandstone', stein_akzent: 'mud_bricks', farbe: 'farbe_orange', terrakotta: 'terrakotta_natur' } },
  { id: 'pal_kirschgarten', name: 'Kirschgarten', description: 'Fernöstlicher Garten: Kirschholz, Schwarzeiche, bemooste Steinziegel und rote Stoffe.',
    roles: { holz_haupt: 'cherry', holz_akzent: 'dark_oak', stein_haupt: 'stone_bricks', stein_akzent: 'mossy_stone_bricks', farbe: 'farbe_red', glas: 'glas_klar' } },
  { id: 'pal_modern', name: 'Moderne Stadt', description: 'Blasseiche und Birke, Quarz und polierter Andesit, weißer Beton und getöntes Glas.',
    roles: { holz_haupt: 'pale_oak', holz_akzent: 'birch', stein_haupt: 'quartz', stein_akzent: 'polished_andesite', farbe: 'farbe_light_gray', glas: 'glas_light_gray', beton: 'beton_white' } },
  { id: 'pal_zwergen', name: 'Zwergenhalle', description: 'Untergrund und Bergwerk: Tiefenschieferziegel, Fliesen, Schwarzeiche und warmes Orange.',
    roles: { holz_haupt: 'dark_oak', holz_akzent: 'spruce', stein_haupt: 'deepslate_bricks', stein_akzent: 'deepslate_tiles', farbe: 'farbe_orange', glas: 'glas_klar' } },
  { id: 'pal_nether', name: 'Nether-Außenposten', description: 'Karmesin- und Wirrholz, Schwarzsteinziegel und Netherziegel, rotes Glas.',
    roles: { holz_haupt: 'crimson', holz_akzent: 'warped', stein_haupt: 'polished_blackstone_bricks', stein_akzent: 'nether_bricks', farbe: 'farbe_red', glas: 'glas_red' } },
];
export const stylePalette = (id: string): StylePalette | undefined => STYLE_PALETTES.find(p => p.id === id);

/** Prüft eine Palette: jede Rolle nennt einen vorhandenen Satz der passenden Art. Gibt Fehlertexte zurück (leer = gültig). */
export function paletteProblems(roles: PaletteRoles): string[] {
  const out: string[] = [];
  if (!roles || typeof roles !== 'object' || Array.isArray(roles)) return ['Palette: Rollen fehlen'];
  for (const [role, setId] of Object.entries(roles)) {
    if (!PALETTE_ROLES.includes(role as PaletteRole)) { out.push(`Unbekannte Rolle ${role}`); continue; }
    const set = typeof setId === 'string' ? materialSet(setId) : undefined;
    if (!set) out.push(`${PALETTE_ROLE_LABEL[role as PaletteRole]}: unbekannter Materialsatz ${String(setId)}`);
    else if (set.kind !== PALETTE_ROLE_KIND[role as PaletteRole]) out.push(`${PALETTE_ROLE_LABEL[role as PaletteRole]}: ${set.label} ist kein ${PALETTE_ROLE_KIND[role as PaletteRole]}`);
  }
  if (!Object.keys(roles).length) out.push('Palette: mindestens eine Rolle festlegen');
  return out;
}

export interface RoleAssignment { readonly role: PaletteRole; readonly use: MaterialUse; readonly target: string | undefined }

/** Welche Materialien eines Gebäudes welche Rolle spielen (meistverwendet = Haupt, zweites Holz/Stein = Akzent). */
export function paletteRolesOf(payload: Pick<VoxelPayload, 'cells' | 'palette'>, roles: PaletteRoles = {}): RoleAssignment[] {
  const uses = detectMaterials(payload, { scoped: true });
  const out: RoleAssignment[] = [];
  const byKind = new Map<MaterialKind, MaterialUse[]>();
  for (const u of uses) byKind.set(u.set.kind, [...(byKind.get(u.set.kind) ?? []), u]);
  for (const role of PALETTE_ROLES) {
    const kind = PALETTE_ROLE_KIND[role], list = byKind.get(kind) ?? [];
    const use = role.endsWith('_akzent') ? list[1] : list[0];
    if (use) out.push({ role, use, target: roles[role] });
  }
  return out;
}

/** Tauschliste einer Palette für ein Gebäude; Rollen ohne Ziel oder mit gleichem Satz entfallen. */
export function paletteSwaps(payload: Pick<VoxelPayload, 'cells' | 'palette'>, roles: PaletteRoles): MaterialSwap[] {
  return paletteRolesOf(payload, roles).filter(a => a.target && a.target !== a.use.set.id).map(a => ({ from: a.use.set.id, to: a.target!, forms: a.use.forms }));
}

export interface PaletteResult extends SwapResult {
  readonly swaps: readonly MaterialSwap[];
  /** Tausche, die das Original schützen würde (z. B. Banner mit Muster ohne geprüften NBT-Adapter), mit Grund. */
  readonly skipped: readonly { readonly swap: MaterialSwap; readonly reason: string }[];
}
/**
 * Wendet eine Palette an. Ein Tausch, den swapMaterials ablehnt (Blockinhalt ohne geprüften Adapter, nicht
 * übertragbare Eigenschaften), wird ausgelassen und gemeldet; der Rest gilt. Ohne nötigen Tausch kommt `null`.
 */
export function applyPalette(payload: VoxelPayload, roles: PaletteRoles): PaletteResult | null {
  const problems = paletteProblems(roles);
  if (problems.length) throw new Error(problems.join('; '));
  const wanted = paletteSwaps(payload, roles), swaps: MaterialSwap[] = [], skipped: { swap: MaterialSwap; reason: string }[] = [];
  for (const swap of wanted) {
    try { swapMaterials(payload, [swap]); swaps.push(swap); } catch (e) { skipped.push({ swap, reason: e instanceof Error ? e.message : String(e) }); }
  }
  return swaps.length ? { ...swapMaterials(payload, swaps), swaps, skipped } : null;
}

/** Palette aus einem Gebäude ablesen: seine Haupt- und Akzentmaterialien werden zu den Rollen einer neuen Palette. */
export function paletteFromPayload(payload: Pick<VoxelPayload, 'cells' | 'palette'>): PaletteRoles {
  const roles: Partial<Record<PaletteRole, string>> = {};
  for (const a of paletteRolesOf(payload)) roles[a.role] = a.use.set.id;
  return roles;
}
