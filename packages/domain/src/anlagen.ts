import type { Transform } from '../../voxel/src/types.js';
import { BUILD_THEMES } from './buildThemes.js';
import { resolveProject } from './compose.js';
import type { Resolution, VoxelConflict } from './compose.js';
import { checkLinks, placementBounds, unlinkedMates } from './connectors.js';
import type { LinkStatus } from './connectors.js';
import { ENSEMBLES } from './ensembles.js';
import { newId } from './hash.js';
import { applyOperation, createProject } from './project.js';
import type { Operation } from './project.js';
import { SAMPLE_PROFILE } from './samples.js';
import { addSection, checkSite, siteOf } from './site.js';
import type { SitePlan } from './site.js';
import { latestReleaseId } from './updateState.js';
import { entranceOf, facesSide, turnsToFace } from './entrance.js';
import type { Entrance, Side } from './entrance.js';
import { DomainError } from './types.js';
import type { Asset, AssetVersion, ConnectorLink, Instance, Project } from './types.js';

/**
 * Bauwelt-Anlagen (BUILD-05): a Bauwelt becomes a plannable site. An Anlage
 * is a curated plan of districts (Bereiche) along a main path. Every slot
 * pins one AssetVersion by its label; districts may embed a shipped ensemble
 * with its curated relative layout. The layout itself is computed from the
 * real footprints of the pinned versions, so spacing stays correct when a
 * slot is swapped.
 *
 * Nothing here writes anything: `planAnlage` and `previewAnlage` are pure and
 * produce a draft project that is only resolved for the preview (real voxel
 * conflicts via the composer, AABB footprints only as pre-filter and spacing
 * hint, connector links via `checkLinks`). A project is created or changed only
 * by `createAnlageProject` / `anlageIntoProject`, which the UI calls on an
 * explicit button press.
 */

export const ANLAGE_SCHEMA_VERSION = 1;
/** Pinned label of every shipped building version. */
export const SHIPPED_LABEL = '1.0';
export const MIN_SPACING = 0;
export const MAX_SPACING = 12;
export const MAX_SHIFT = 128;
/** Default maximum width of one district row before it wraps. */
export const DEFAULT_ROW_WIDTH = 64;

export type AnlageSide = 'nord' | 'sued';
export type AnlagePathKind = 'weg' | 'strasse';

export interface AnlageSlot {
  /** Unique within the Anlage (used for swaps, turns and tests). */
  readonly key: string;
  readonly assetId: string;
  /** Pinned version label; default {@link SHIPPED_LABEL}. */
  readonly pin?: string;
  readonly turns?: 0 | 1 | 2 | 3;
  /** What the slot is for (shown in the plan, used as instance name suffix). */
  readonly role?: string;
}

export interface AnlageDistrict {
  readonly id: string;
  readonly name: string;
  /** One sentence: what this district does in the Anlage. */
  readonly purpose: string;
  readonly side: AnlageSide;
  /** Shipped ensemble placed first, as one unit with its curated layout. */
  readonly ensemble?: string;
  readonly slots: readonly AnlageSlot[];
  /** Gap inside the district; default the Anlage spacing (e.g. 0 for row houses). */
  readonly gap?: number;
  readonly rowWidth?: number;
}

export interface Anlage {
  readonly id: string;
  /** Bauwelt (BUILD_THEMES id) this Anlage belongs to. */
  readonly themeId: string;
  readonly name: string;
  readonly description: string;
  /** Main path along +x built from chained path modules; null = no path. */
  readonly path: AnlagePathKind | null;
  /** Curated (recommended) gap between buildings and to the path, in blocks. */
  readonly spacing: number;
  /** Build order = district order (after the path). */
  readonly districts: readonly AnlageDistrict[];
}

const s = (key: string, id: string, role?: string, turns?: 0 | 1 | 2 | 3): AnlageSlot => ({ key, assetId: `bld_${id}`, ...(role && { role }), ...(turns && { turns }) });
const d = (id: string, name: string, side: AnlageSide, purpose: string, slots: readonly AnlageSlot[], extra: Partial<Pick<AnlageDistrict, 'ensemble' | 'gap' | 'rowWidth'>> = {}): AnlageDistrict =>
  ({ id, name, side, purpose, slots, ...extra });

export const ANLAGEN: readonly Anlage[] = [
  { id: 'anl_kueste', themeId: 'kueste', name: 'Hafenstadt an der Küste', path: 'weg', spacing: 3,
    description: 'Eine Promenade verbindet Küstendorf, Hafenbetrieb, Fischmarkt und Wohnhäuser. Der Weg ist das Rückgrat; die Wasserlinie prüfst du im Gelände.',
    districts: [
      d('dorf', 'Küstendorf', 'sued', 'Erster Anlaufpunkt mit Leuchtturm, Steg und Fischerhütte.', [], { ensemble: 'ens_kuestendorf' }),
      d('hafen', 'Hafenbetrieb', 'sued', 'Boote bauen, lagern und warten.', [s('k_boot', 'kueste_bootshaus', 'Bootshaus'), s('k_werft', 'kueste_werft', 'Werft'), s('k_speicher', 'kueste_hafenspeicher', 'Speicher')]),
      d('markt', 'Fischmarkt & Promenade', 'nord', 'Handel und Treffpunkt an der Promenade.', [s('k_markt', 'kueste_fischmarkt', 'Markt'), s('k_bar', 'kueste_strandbar', 'Strandbar'), s('k_rettung', 'kueste_rettungsturm', 'Rettungsturm')]),
      d('wohnen', 'Wohnen am Wasser', 'nord', 'Kleine Wohnhäuser in zweiter Reihe.', [s('k_haus1', 'fischerhuette', 'Haus'), s('k_haus2', 'strandhaus', 'Haus'), s('k_haus3', 'fischerhuette', 'Haus'), s('k_haus4', 'strandhaus', 'Haus')]),
    ] },
  { id: 'anl_mittelalter', themeId: 'mittelalter', name: 'Marktstadt mit Burg', path: 'weg', spacing: 3,
    description: 'Marktdorf und Burghof liegen sich an der Hauptgasse gegenüber; Stadthäuser und Kirchbezirk wachsen in eigenen Abschnitten dazu.',
    districts: [
      d('markt', 'Marktdorf', 'nord', 'Treffpunkt, Handel und Werkstätten um den Brunnenplatz.', [], { ensemble: 'ens_marktdorf' }),
      d('burg', 'Burghof', 'sued', 'Befestigter Kern mit Torhaus, Bergfried und Türmen.', [], { ensemble: 'ens_burg' }),
      d('stadt', 'Stadthäuser', 'sued', 'Wohnen an der Hauptgasse.', [s('m_haus1', 'stadthaus', 'Stadthaus'), s('m_haus2', 'stadthaus_kirsche', 'Stadthaus'), s('m_haus3', 'stadthaus_lehm', 'Stadthaus'), s('m_haus4', 'fachwerkhaus', 'Fachwerkhaus'), s('m_taverne', 'taverne', 'Taverne')], { gap: 2 }),
      d('kirche', 'Kirchbezirk', 'nord', 'Kathedrale mit Glockenturm und Friedhof als Wahrzeichen.', [s('m_kathedrale', 'kathedrale', 'Kathedrale'), s('m_glocke', 'epoche_glockenturm', 'Glockenturm'), s('m_friedhof', 'friedhof', 'Friedhof')]),
    ] },
  { id: 'anl_moderne', themeId: 'moderne', name: 'Stadtquartier', path: 'strasse', spacing: 2,
    description: 'Reihenhauszeile, Zentrum, öffentliche Gebäude und Hochhäuser entlang einer Stadtstraße mit Gehwegen.',
    districts: [
      d('reihe', 'Reihenhauszeile', 'nord', 'Vier Reihenhäuser ohne Abstand, wie im Gebäudetipp beschrieben.', [s('s_rh1', 'stadt_reihenhaus_weiss', 'Reihenhaus'), s('s_rh2', 'stadt_reihenhaus_gelb', 'Reihenhaus'), s('s_rh3', 'stadt_reihenhaus_hellblau', 'Reihenhaus'), s('s_rh4', 'stadt_reihenhaus_rosa', 'Reihenhaus')], { gap: 0 }),
      d('zentrum', 'Zentrum', 'sued', 'Platz, Café, Bäckerei und Einkauf.', [s('s_platz', 'stadt_platz', 'Platz'), s('s_cafe', 'stadt_cafe', 'Café'), s('s_baecker', 'stadt_baeckerei', 'Bäckerei'), s('s_kiosk', 'stadt_kiosk', 'Kiosk'), s('s_markt', 'stadt_supermarkt', 'Supermarkt')]),
      d('amt', 'Öffentliche Gebäude', 'nord', 'Schule, Bibliothek, Ärztehaus und Wachen.', [s('s_schule', 'stadt_schule', 'Schule'), s('s_bib', 'stadt_bibliothek', 'Bibliothek'), s('s_arzt', 'stadt_aerztehaus', 'Ärztehaus'), s('s_feuer', 'stadt_feuerwache', 'Feuerwache'), s('s_polizei', 'stadt_polizeiwache', 'Polizeiwache')]),
      d('hoch', 'Wohnen & Spielen', 'sued', 'Hochhaus, Wohnblock, Villen und Spielplatz.', [s('s_hoch', 'stadt_hochhaus', 'Hochhaus'), s('s_block', 'stadt_wohnblock', 'Wohnblock'), s('s_wuerfel', 'wuerfelhaus', 'Würfelhaus'), s('s_villa', 'villa', 'Villa'), s('s_spiel', 'garten_spielplatz', 'Spielplatz')]),
    ] },
  { id: 'anl_gebirge', themeId: 'gebirge', name: 'Nordische Bergsiedlung', path: 'weg', spacing: 3,
    description: 'Langhäuser als Mittelpunkt, Chalets und Hütten am Weg, Weiden und eine Palisade. Terrassen und Hanglage plant die Anlage nicht; das Gelände bleibt ungeprüft.',
    districts: [
      d('halle', 'Langhäuser', 'nord', 'Gemeinschaftshallen als Ortsmitte.', [s('g_lang1', 'langhaus', 'Langhaus'), s('g_lang2', 'langhaus_birke', 'Langhaus'), s('g_lang3', 'langhaus_mangrove', 'Langhaus')]),
      d('wohnen', 'Chalets & Hütten', 'sued', 'Wohnhäuser entlang des Wegs.', [s('g_chalet1', 'chalet', 'Chalet'), s('g_chalet2', 'chalet_dunkelwald', 'Chalet'), s('g_huette1', 'blockhuette', 'Hütte'), s('g_huette2', 'blockhuette', 'Hütte')]),
      d('weide', 'Weiden & Beeren', 'nord', 'Versorgung mit Wolle und Nahrung.', [s('g_schafe', 'hof_schafweide', 'Schafweide'), s('g_beeren', 'hof_suessbeeren', 'Süßbeeren')]),
      d('wehr', 'Palisade', 'sued', 'Tor und Türme am Ortsrand.', [s('g_turm1', 'palisade_turm', 'Turm'), s('g_tor', 'palisade_tor', 'Tor'), s('g_turm2', 'palisade_turm', 'Turm')], { gap: 1 }),
    ] },
  { id: 'anl_fantasy', themeId: 'fantasy', name: 'Magisches Tal', path: 'weg', spacing: 4,
    description: 'Zauberwald mit Akademie, eine Reihe Wahrzeichen, ein Pilzdorf und Naturkulissen bilden ein zusammenhängendes Tal.',
    districts: [
      d('wald', 'Zauberwald', 'nord', 'Akademie, Kristallturm und Waldbewohner.', [], { ensemble: 'ens_zauberwald' }),
      d('wahrzeichen', 'Wahrzeichen', 'sued', 'Blickpunkte, die das Tal von weitem erkennbar machen.', [s('f_maerchen', 'fantasy_maerchenturm', 'Märchenturm'), s('f_spirale', 'spiralturm', 'Spiralturm'), s('f_drache', 'fantasy_drachenstatue', 'Drachenstatue')]),
      d('dorf', 'Pilzdorf', 'sued', 'Wohnen zwischen Riesenpilzen.', [s('f_pilz', 'pilzhaus', 'Pilzhaus'), s('f_erd', 'erdhaus', 'Erdhaus'), s('f_baum', 'baumhaus_gross', 'Baumhaus'), s('f_rot', 'riesenpilz_rot', 'Riesenpilz'), s('f_braun', 'riesenpilz_braun', 'Riesenpilz')]),
      d('natur', 'Naturkulisse', 'nord', 'Wasserfall, Trauerweide und Steinkreis als Landschaft.', [s('f_fall', 'natur_wasserfall', 'Wasserfall'), s('f_weide', 'natur_trauerweide', 'Trauerweide'), s('f_kreis', 'steinkreis', 'Steinkreis')]),
    ] },
  { id: 'anl_nether', themeId: 'nether', name: 'Nether-Stützpunkt', path: null, spacing: 3,
    description: 'Ankunft am Portal, der Stützpunkt aus dem Ensemble, Versorgung und Befestigung. Kein Weg-Baukasten: Wege im Nether planst du selbst.',
    districts: [
      d('ankunft', 'Ankunft', 'nord', 'Portal mit Basis und Licht.', [s('n_portal', 'netherportal', 'Portal'), s('n_basis', 'netherbasis', 'Basis'), s('n_licht1', 'laterne_seele', 'Laterne'), s('n_licht2', 'laterne_seele', 'Laterne')], { gap: 2 }),
      d('posten', 'Stützpunkt', 'sued', 'Knotenpunkt mit Eisbahnen und Tauschstation.', [], { ensemble: 'ens_netherposten' }),
      d('versorgung', 'Versorgung', 'nord', 'Netherwarzen und Braustube.', [s('n_warze', 'hof_netherwarze', 'Netherwarzen'), s('n_brau', 'braustube', 'Braustube')]),
      d('wehr', 'Befestigung', 'nord', 'Türme und Festungsbrücke.', [s('n_turm', 'rundturm_schwarzstein', 'Rundturm'), s('n_bruecke', 'dim_festungsbruecke', 'Festungsbrücke'), s('n_berg', 'bergfried_schwarzstein', 'Bergfried')]),
    ] },
  { id: 'anl_landleben', themeId: 'landleben', name: 'Dorf mit Hof', path: 'weg', spacing: 3,
    description: 'Bauernhof, Dorfhäuser, Handwerkerzeile und Tierställe am Dorfweg; jede Gruppe ist ein eigener Bauabschnitt.',
    districts: [
      d('hof', 'Bauernhof', 'nord', 'Hofstelle mit Äckern und Windmühle.', [], { ensemble: 'ens_bauernhof' }),
      d('dorf', 'Dorfhäuser', 'sued', 'Wohnen am Dorfweg.', [s('l_haus1', 'starterhaus_oak', 'Haus'), s('l_haus2', 'starterhaus_birch', 'Haus'), s('l_haus3', 'starterhaus_spruce', 'Haus'), s('l_bauer', 'bauernhaus_kirsche', 'Bauernhaus'), s('l_rund', 'rundhuette', 'Rundhütte')]),
      d('handwerk', 'Handwerkerzeile', 'sued', 'Werkstätten mit Arbeitsblöcken für Dorfbewohner.', [s('l_w1', 'werkstatt_bauer', 'Werkstatt'), s('l_w2', 'werkstatt_schaefer', 'Werkstatt'), s('l_w3', 'werkstatt_fischer', 'Werkstatt'), s('l_w4', 'werkstatt_metzger', 'Werkstatt'), s('l_w5', 'werkstatt_gerber', 'Werkstatt')], { gap: 2 }),
      d('tiere', 'Tierställe', 'nord', 'Ställe und Imkerei hinter dem Hof.', [s('l_kuh', 'hof_kuhstall', 'Kuhstall'), s('l_schwein', 'hof_schweinestall', 'Schweinestall'), s('l_hase', 'hof_kaninchenstall', 'Kaninchenstall'), s('l_imker', 'hof_imkerei', 'Imkerei')]),
    ] },
  { id: 'anl_technik', themeId: 'technik', name: 'Technik- und Farmhof', path: 'strasse', spacing: 3,
    description: 'Modulstrecke, Bahnanschluss, Farmen und Steuerpulte entlang einer Erschließungsstraße. Redstone-Funktion prüfst du in deiner Spielversion.',
    districts: [
      d('module', 'Modulstrecke', 'nord', 'Schmelzen, Sortieren und Aufzüge aus dem Technikhof.', [], { ensemble: 'ens_technikhof' }),
      d('bahn', 'Bahnanschluss', 'sued', 'Bahnhof mit Lok und Tunnelportal.', [s('t_bahnhof', 'bahnhof', 'Bahnhof'), s('t_lok', 'fahrzeug_dampflok', 'Lok'), s('t_tunnel', 'tunnelportal', 'Tunnelportal')]),
      d('farmen', 'Farmen', 'sued', 'Automatische Farmen für Grundstoffe.', [s('t_eisen', 'eisenfarm', 'Eisenfarm'), s('t_kaktus', 'kaktusfarm', 'Kaktusfarm'), s('t_huhn', 'huehnerfarm', 'Hühnerfarm'), s('t_kuerbis', 'kuerbis_modul', 'Kürbismodul'), s('t_melone', 'melonen_modul', 'Melonenmodul')], { gap: 2 }),
      d('steuer', 'Steuerung & Licht', 'nord', 'Leuchtfeuer, Pult, Lagerwand und Ofenstraße.', [s('t_feuer', 'leuchtfeuer', 'Leuchtfeuer'), s('t_pult', 'technik_lampenpult', 'Lampenpult'), s('t_lager', 'technik_lagerwand', 'Lagerwand'), s('t_ofen', 'technik_ofenstrasse', 'Ofenstraße')], { gap: 2 }),
    ] },
  { id: 'anl_fernost', themeId: 'fernost', name: 'Fernöstlicher Gartenbezirk', path: 'weg', spacing: 4,
    description: 'Tempelbezirk und Kirschblütengarten an einem ruhigen Weg, am Eingang Torii und Schrein. Wasserläufe und Höhen prüfst du im Gelände.',
    districts: [
      d('tor', 'Eingang', 'nord', 'Torii und Schrein als Auftakt.', [s('o_torii', 'torii', 'Torii'), s('o_schrein', 'schrein', 'Schrein')]),
      d('tempel', 'Tempelbezirk', 'nord', 'Pagode, Teehaus und Gärten.', [], { ensemble: 'ens_tempelbezirk' }),
      d('garten', 'Kirschblütengarten', 'sued', 'Wohnhaus mit Zen-Garten und Teich.', [], { ensemble: 'ens_japangarten' }),
    ] },
  { id: 'anl_wuestenhandel', themeId: 'wuestenhandel', name: 'Oasen-Handelsweg', path: 'weg', spacing: 4,
    description: 'Ein Handelsweg vom Wüstenfort über die Oasenstadt bis zu den Wahrzeichen. Schatten, Wasser und Fundamente prüfst du im Gelände.',
    districts: [
      d('fort', 'Wüstenfort', 'nord', 'Befestigter Außenposten am Anfang des Wegs.', [], { ensemble: 'ens_wuestenposten' }),
      d('stadt', 'Oasenstadt', 'sued', 'Rathaus und Wohnhäuser als Rastplatz.', [s('w_rathaus', 'rathaus_wueste', 'Rathaus'), s('w_lehm1', 'lehmhaus', 'Lehmhaus'), s('w_haus', 'wuestenhaus', 'Wüstenhaus'), s('w_lehm2', 'lehmhaus', 'Lehmhaus')]),
      d('wahrzeichen', 'Wahrzeichen', 'nord', 'Pyramide und Turm als Wegmarken am Ende.', [s('w_pyramide', 'wuestenpyramide', 'Pyramide'), s('w_turm', 'rundturm_sandstein', 'Rundturm')]),
    ] },
  { id: 'anl_endposten', themeId: 'endposten', name: 'End-Außenposten', path: null, spacing: 4,
    description: 'Ankunftsplattform mit Brücke, Befestigung und Chorusgarten. Kein Weg-Baukasten; Fortbewegung und Rückweg planst du selbst.',
    districts: [
      d('ankunft', 'Ankunft', 'nord', 'Plattform und Brücke als Startpunkt.', [s('e_platt', 'endplattform', 'Plattform'), s('e_bruecke', 'dim_end_bruecke', 'Brücke')]),
      d('posten', 'Befestigung', 'sued', 'Bergfried und Turm.', [s('e_berg', 'bergfried_endstein', 'Bergfried'), s('e_turm', 'dim_end_turm', 'Turm')]),
      d('garten', 'Chorusgarten', 'nord', 'Garten und Kathedrale als Ziel.', [s('e_garten', 'dim_chorus_garten', 'Chorusgarten'), s('e_kathedrale', 'kathedrale_endstein', 'Kathedrale')]),
    ] },
];

/** Path modules of the main path (shipped, with path_joint connectors). */
export const PATH_MODULES: Readonly<Record<AnlagePathKind, { readonly assetId: string; readonly label: string; readonly endAssetId?: string }>> = {
  weg: { assetId: 'bld_weg_gerade', label: 'Weg', endAssetId: 'bld_weg_wendeplatz' },
  strasse: { assetId: 'bld_stadt_strasse_gerade', label: 'Straße' },
};

export const anlageById = (id: string): Anlage | undefined => ANLAGEN.find(a => a.id === id);
export const anlageForTheme = (themeId: string): Anlage | undefined => ANLAGEN.find(a => a.themeId === themeId);
export const themeOfAnlage = (a: Pick<Anlage, 'themeId'>) => BUILD_THEMES.find(t => t.id === a.themeId);

// ---------------------------------------------------------------------------
// Choices (user configuration of a plan; never stored on the Anlage itself)

export interface AnlageChoices {
  /** Districts left out. */
  readonly off?: readonly string[];
  /** Slot key → other asset id (uses that asset's latest version). */
  readonly swaps?: Readonly<Record<string, string>>;
  /** Slot key → quarter turns (replaces the curated value). */
  readonly turns?: Readonly<Record<string, 0 | 1 | 2 | 3>>;
  /** Gap between buildings and to the path; default the curated spacing. */
  readonly spacing?: number;
  /** District id → [dx, dz] shift of the district (may create real conflicts). */
  readonly shifts?: Readonly<Record<string, readonly [number, number]>>;
  /** Build the main path (default true when the Anlage has one). */
  readonly path?: boolean;
  /** Turn single buildings so their entrance faces the main path (default true; manual turns win). */
  readonly doors?: boolean;
}

const fail = (message: string): never => { throw new DomainError('ANLAGE', `Anlage: ${message}`); };

/** Validates and normalises choices against an Anlage (unknown keys are refused, numbers clamped to integers in range). */
export function normalizeChoices(anlage: Anlage, raw: AnlageChoices = {}): Required<AnlageChoices> {
  const districts = new Set(anlage.districts.map(x => x.id));
  const slots = new Set(anlage.districts.flatMap(x => x.slots.map(sl => sl.key)));
  const off = [...new Set(raw.off ?? [])];
  for (const id of off) if (!districts.has(id)) fail(`Bereich ${id} gibt es nicht`);
  const swaps: Record<string, string> = {}, turns: Record<string, 0 | 1 | 2 | 3> = {}, shifts: Record<string, readonly [number, number]> = {};
  for (const [k, v] of Object.entries(raw.swaps ?? {})) { if (!slots.has(k)) fail(`Platz ${k} gibt es nicht`); if (typeof v !== 'string' || !v) fail(`Platz ${k}: Bauteil fehlt`); swaps[k] = v; }
  for (const [k, v] of Object.entries(raw.turns ?? {})) { if (!slots.has(k)) fail(`Platz ${k} gibt es nicht`); if (![0, 1, 2, 3].includes(v)) fail(`Platz ${k}: Drehung 0–3`); turns[k] = v; }
  for (const [k, v] of Object.entries(raw.shifts ?? {})) {
    if (!districts.has(k)) fail(`Bereich ${k} gibt es nicht`);
    if (!Array.isArray(v) || v.length !== 2 || !v.every(n => Number.isInteger(n) && Math.abs(n) <= MAX_SHIFT)) fail(`Bereich ${k}: Verschiebung je Achse ganzzahlig bis ±${MAX_SHIFT}`);
    if (v[0] || v[1]) shifts[k] = [v[0], v[1]];
  }
  const spacing = raw.spacing ?? anlage.spacing;
  if (!Number.isInteger(spacing) || spacing < MIN_SPACING || spacing > MAX_SPACING) fail(`Abstand muss ${MIN_SPACING}–${MAX_SPACING} Blöcke sein`);
  return { off, swaps, turns, spacing, shifts, path: anlage.path !== null && raw.path !== false, doors: raw.doors !== false };
}

// ---------------------------------------------------------------------------
// Version pins

export interface AnlageLibrary {
  readonly assets: readonly Asset[];
  readonly versions: ReadonlyMap<string, AssetVersion>;
}

export type SlotStatus = 'ok' | 'missing-asset' | 'missing-version' | 'archived';
export interface SlotState {
  readonly key: string;
  readonly districtId: string;
  /** Ensemble id when the slot comes from an embedded ensemble. */
  readonly ensembleId?: string;
  readonly assetId: string;
  readonly curatedAssetId: string;
  readonly swapped: boolean;
  readonly role: string;
  readonly turns: 0 | 1 | 2 | 3;
  readonly status: SlotStatus;
  /** Pinned version (null when missing). */
  readonly version: AssetVersion | null;
  readonly pin: string;
  /** Label of a newer version of the same asset; the plan keeps the pin. */
  readonly newer?: string;
  /** Where `turns` comes from: a manual turn, the entrance rule (door to the path) or the curated value. */
  readonly turnSource: 'manual' | 'door' | 'curated';
  /** Entrance found in the pinned version (null: no door or gate, or missing version). */
  readonly entrance: Entrance | null;
  /** Entrance faces the main path side after `turns`; null without entrance or ensemble member. */
  readonly facesPath: boolean | null;
}

function lookup(lib: AnlageLibrary) {
  const assets = new Map(lib.assets.map(a => [a.id, a]));
  const versionOf = (asset: Asset, label: string | null): AssetVersion | undefined => {
    if (label === null) return lib.versions.get(latestReleaseId(asset, lib.versions) ?? '');
    for (const id of asset.versionIds) { const v = lib.versions.get(id); if (v?.label === label) return v; }
    return undefined;
  };
  return { assets, versionOf };
}

function slotState(lib: ReturnType<typeof lookup>, base: { key: string; districtId: string; ensembleId?: string; assetId: string; pin: string; role: string; turns: 0 | 1 | 2 | 3 }, swap: string | undefined): SlotState {
  const assetId = swap ?? base.assetId;
  const asset = lib.assets.get(assetId);
  const common = { key: base.key, districtId: base.districtId, ...(base.ensembleId && { ensembleId: base.ensembleId }), assetId, curatedAssetId: base.assetId, swapped: !!swap && swap !== base.assetId, role: base.role, turns: base.turns,
    turnSource: 'curated' as const, entrance: null, facesPath: null };
  if (!asset) return { ...common, status: 'missing-asset', version: null, pin: base.pin };
  // A swapped slot pins the version that is current when the swap is made.
  const version = swap && swap !== base.assetId ? lib.versionOf(asset, null) : lib.versionOf(asset, base.pin);
  if (!version) return { ...common, status: 'missing-version', version: null, pin: base.pin };
  const latest = lib.versionOf(asset, null);
  return { ...common, status: asset.archived ? 'archived' : 'ok', version, pin: version.label, ...(latest && latest.id !== version.id && { newer: latest.label }) };
}

// ---------------------------------------------------------------------------
// Layout

export interface Footprint { readonly x0: number; readonly z0: number; readonly x1: number; readonly z1: number }
export interface AnlagePlacement {
  readonly key: string;
  readonly districtId: string | null;
  /** Embedded ensemble: its curated relative layout is kept, spacing is not checked inside it. */
  readonly ensembleId?: string;
  readonly kind: 'building' | 'path';
  readonly name: string;
  readonly version: AssetVersion;
  readonly transform: Transform;
  /** XZ footprint after the transform (max exclusive). */
  readonly footprint: Footprint;
}
export interface DistrictLayout {
  readonly id: string;
  readonly name: string;
  readonly side: AnlageSide;
  readonly enabled: boolean;
  readonly footprint: Footprint | null;
  readonly placements: number;
}
export interface AnlagePlan {
  readonly anlage: Anlage;
  readonly choices: Required<AnlageChoices>;
  readonly slots: readonly SlotState[];
  readonly placements: readonly AnlagePlacement[];
  readonly districts: readonly DistrictLayout[];
  /** Width of the path lane along z (0 without path). */
  readonly lane: number;
  readonly extent: Footprint | null;
  /** Reasons why the plan cannot be adopted (missing pinned versions in enabled districts, missing path module). */
  readonly blockers: readonly string[];
}

const ORIGIN: Transform = { position: [0, 0, 0], quarterTurns: 0, mirrorX: false };
const turned = (t: 0 | 1 | 2 | 3): Transform => ({ ...ORIGIN, quarterTurns: t });
const footOf = (version: AssetVersion, t: Transform): Footprint => {
  const b = placementBounds(version, t);
  return { x0: b.min[0], z0: b.min[2], x1: b.maxExclusive[0], z1: b.maxExclusive[2] };
};
/** Transform that puts the rotated version's minimum corner at (x, 0, z). */
function at(version: AssetVersion, turns: 0 | 1 | 2 | 3, x: number, z: number): Transform {
  const b = placementBounds(version, turned(turns));
  return { position: [x - b.min[0], -b.min[1], z - b.min[2]], quarterTurns: turns, mirrorX: false };
}
const union = (fs: readonly Footprint[]): Footprint | null => fs.length
  ? { x0: Math.min(...fs.map(f => f.x0)), z0: Math.min(...fs.map(f => f.z0)), x1: Math.max(...fs.map(f => f.x1)), z1: Math.max(...fs.map(f => f.z1)) } : null;

interface Unit { readonly w: number; readonly d: number; readonly parts: readonly { slot: SlotState; dx: number; dz: number }[] }

/**
 * Plans an Anlage: resolves pins and swaps, then lays districts out along the
 * main path (+x). North districts grow towards −z, south districts towards +z;
 * each side has its own cursor, districts are separated by twice the spacing.
 * Inside a district units (an embedded ensemble or one slot) fill rows up to
 * the row width. Pure and deterministic.
 */
export function planAnlage(anlage: Anlage, library: AnlageLibrary, rawChoices: AnlageChoices = {}): AnlagePlan {
  const choices = normalizeChoices(anlage, rawChoices);
  const lib = lookup(library);
  const blockers: string[] = [];
  const slots: SlotState[] = [];
  const pathSpec = anlage.path ? PATH_MODULES[anlage.path] : null;
  const pathVersion = pathSpec && choices.path ? lib.assets.get(pathSpec.assetId) && lib.versionOf(lib.assets.get(pathSpec.assetId)!, SHIPPED_LABEL) : undefined;
  if (pathSpec && choices.path && !pathVersion) blockers.push(`Wegmodul ${pathSpec.assetId} (Version ${SHIPPED_LABEL}) fehlt`);
  const pathWidth = pathVersion ? footOf(pathVersion, ORIGIN) : null;
  const lane = pathWidth ? pathWidth.z1 - pathWidth.z0 : 0;
  const gapOf = (district: AnlageDistrict) => Math.min(district.gap ?? choices.spacing, choices.spacing);
  const cursor: Record<AnlageSide, number> = { nord: 0, sued: 0 };
  const placements: AnlagePlacement[] = [];
  const layouts: DistrictLayout[] = [];
  const nameCount = new Map<string, number>();
  const nameFor = (slot: SlotState) => {
    const base = `${slot.role}`;
    const n = (nameCount.get(base) ?? 0) + 1; nameCount.set(base, n);
    return n > 1 ? `${base} ${n}` : base;
  };

  for (const district of anlage.districts) {
    const enabled = !choices.off.includes(district.id);
    // Slot states (also for disabled districts, so the UI can show them).
    const units: Unit[] = [];
    const states: SlotState[] = [];
    if (district.ensemble) {
      const ensemble = ENSEMBLES.find(e => e.id === district.ensemble);
      if (!ensemble) fail(`Ensemble ${district.ensemble} gibt es nicht`);
      const parts: { slot: SlotState; dx: number; dz: number }[] = [];
      ensemble!.members.forEach((m, i) => {
        const slot = slotState(lib, { key: `${district.id}.${ensemble!.id}.${i + 1}`, districtId: district.id, ensembleId: ensemble!.id, assetId: m.assetId, pin: SHIPPED_LABEL,
          role: library.assets.find(a => a.id === m.assetId)?.name ?? m.assetId, turns: m.turns ?? 0 }, undefined);
        states.push(slot);
        parts.push({ slot, dx: m.at[0], dz: m.at[1] });
      });
      const ok = parts.filter(p => p.slot.version);
      const f = union(ok.map(p => { const b = footOf(p.slot.version!, turned(p.slot.turns)); return { x0: p.dx, z0: p.dz, x1: p.dx + b.x1 - b.x0, z1: p.dz + b.z1 - b.z0 }; }));
      if (f) units.push({ w: f.x1 - f.x0, d: f.z1 - f.z0, parts: ok.map(p => ({ ...p, dx: p.dx - f.x0, dz: p.dz - f.z0 })) });
    }
    for (const sl of district.slots) {
      const manual = choices.turns[sl.key];
      let slot = slotState(lib, { key: sl.key, districtId: district.id, assetId: sl.assetId, pin: sl.pin ?? SHIPPED_LABEL, role: sl.role ?? sl.assetId, turns: manual ?? sl.turns ?? 0 }, choices.swaps[sl.key]);
      if (slot.version) {
        // Door to the path: north districts face +z (south), south districts −z (north).
        const entrance = entranceOf(slot.version.payload), want: Side = district.side === 'nord' ? 'south' : 'north';
        const auto = choices.doors && manual === undefined && anlage.path !== null ? turnsToFace(entrance, want) : null;
        const turns = auto ?? slot.turns;
        slot = { ...slot, turns, entrance, turnSource: manual !== undefined ? 'manual' : auto !== null ? 'door' : 'curated', facesPath: anlage.path !== null ? facesSide(entrance, turns, want) : null };
      }
      states.push(slot);
      if (slot.version) { const b = footOf(slot.version, turned(slot.turns)); units.push({ w: b.x1 - b.x0, d: b.z1 - b.z0, parts: [{ slot, dx: 0, dz: 0 }] }); }
    }
    slots.push(...states);
    if (!enabled) { layouts.push({ id: district.id, name: district.name, side: district.side, enabled, footprint: null, placements: 0 }); continue; }
    for (const st of states) if (!st.version) blockers.push(`${district.name}: ${st.role} – ${st.status === 'missing-asset' ? `Bauteil ${st.assetId} fehlt` : `Version ${st.pin} von ${st.assetId} fehlt`}`);

    // Rows: units left to right, wrap at row width; rows grow away from the path.
    const gap = gapOf(district), rowWidth = district.rowWidth ?? DEFAULT_ROW_WIDTH;
    const [sx, sz] = choices.shifts[district.id] ?? [0, 0];
    const x0 = cursor[district.side];
    let x = x0, rowDepth = 0, rowOffset = 0, maxX = x0;
    const own: AnlagePlacement[] = [];
    for (const unit of units) {
      if (x > x0 && x + unit.w > x0 + rowWidth) { rowOffset += rowDepth + gap; x = x0; rowDepth = 0; }
      // North: the unit's south edge faces the path; south: its north edge does.
      const z = district.side === 'sued' ? lane + choices.spacing + rowOffset : -choices.spacing - rowOffset - unit.d;
      for (const p of unit.parts) {
        const v = p.slot.version!, t = at(v, p.slot.turns, x + p.dx + sx, z + p.dz + sz);
        own.push({ key: p.slot.key, districtId: district.id, ...(p.slot.ensembleId && { ensembleId: p.slot.ensembleId }), kind: 'building', name: nameFor(p.slot), version: v, transform: t, footprint: footOf(v, t) });
      }
      x += unit.w + gap; rowDepth = Math.max(rowDepth, unit.d); maxX = Math.max(maxX, x - gap);
    }
    placements.push(...own);
    layouts.push({ id: district.id, name: district.name, side: district.side, enabled, footprint: union(own.map(p => p.footprint)), placements: own.length });
    cursor[district.side] = maxX + 2 * choices.spacing;
  }

  // Main path: straight modules chained along +x so their connectors mate exactly.
  if (pathVersion && pathSpec) {
    const buildingExtent = union(placements.map(p => p.footprint));
    const piece = footOf(pathVersion, ORIGIN), len = piece.x1 - piece.x0;
    const from = Math.min(0, buildingExtent?.x0 ?? 0), to = Math.max(len, buildingExtent?.x1 ?? len);
    const count = Math.max(1, Math.ceil((to - from) / len));
    for (let i = 0; i < count; i++) {
      const t = at(pathVersion, 0, from + i * len, 0);
      placements.push({ key: `weg.${i + 1}`, districtId: null, kind: 'path', name: `${pathSpec.label} ${i + 1}`, version: pathVersion, transform: t, footprint: footOf(pathVersion, t) });
    }
    const endAsset = pathSpec.endAssetId ? lib.assets.get(pathSpec.endAssetId) : undefined;
    const endVersion = endAsset ? lib.versionOf(endAsset, SHIPPED_LABEL) : undefined;
    if (endVersion) {
      const e = footOf(endVersion, ORIGIN);
      const t = at(endVersion, 0, from + count * len, Math.round((lane - (e.z1 - e.z0)) / 2));
      placements.push({ key: 'weg.ende', districtId: null, kind: 'path', name: `${pathSpec.label}: Wendeplatz`, version: endVersion, transform: t, footprint: footOf(endVersion, t) });
    }
  }
  return { anlage, choices, slots, placements, districts: layouts, lane, extent: union(placements.map(p => p.footprint)), blockers };
}

// ---------------------------------------------------------------------------
// Draft project and preview

/** Instance ids are derived from the slot key so previews are reproducible. */
const instanceIdOf = (key: string) => `inst_anl_${key.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;

export interface AnlageDraft {
  readonly instances: readonly Instance[];
  readonly links: readonly ConnectorLink[];
  /** Build sections: path first, then districts in plan order. */
  readonly sections: readonly { readonly name: string; readonly note: string; readonly instanceIds: readonly string[] }[];
}

/**
 * Instances, mating links and build sections of a plan, shifted by `offset`
 * (x, z) and per placement key by `heights` (y, e.g. terraces from
 * fitAnlageToTerrain; path modules share one height so their joints still mate).
 */
export function draftAnlage(plan: AnlagePlan, offset: readonly [number, number] = [0, 0], ids: (key: string) => string = instanceIdOf, heights?: ReadonlyMap<string, number>): AnlageDraft {
  const instances = plan.placements.map((p): Instance => ({ id: ids(p.key), assetVersionId: p.version.id, name: p.name, override: false,
    transform: { ...p.transform, position: [p.transform.position[0] + offset[0], p.transform.position[1] + (heights?.get(p.key) ?? 0), p.transform.position[2] + offset[1]] } }));
  const versions = new Map(plan.placements.map(p => [p.version.id, p.version]));
  const probe = { ...createProject({ name: 'Anlage' }), instances };
  const links = unlinkedMates(probe, versions).map((m, i): ConnectorLink => ({ id: `link_anl_${i + 1}`, a: m.a, b: m.b }));
  const byKey = new Map(plan.placements.map((p, i) => [p.key, instances[i]!.id]));
  const sections: { name: string; note: string; instanceIds: string[] }[] = [];
  const paths = plan.placements.filter(p => p.kind === 'path').map(p => byKey.get(p.key)!);
  if (paths.length) sections.push({ name: `${plan.anlage.name}: Hauptweg`, note: 'Zuerst bauen: Bezugslinie für alle Bereiche.', instanceIds: paths });
  for (const district of plan.anlage.districts) {
    const ids = plan.placements.filter(p => p.districtId === district.id).map(p => byKey.get(p.key)!);
    if (ids.length) sections.push({ name: district.name, note: district.purpose, instanceIds: ids });
  }
  return { instances, links, sections };
}

export interface SpacingIssue {
  readonly a: string;
  readonly b: string;
  /** Free blocks between the footprints (negative = footprints overlap). */
  readonly gap: number;
  readonly kind: 'overlap' | 'tight';
}
export interface AnlagePreview {
  readonly plan: AnlagePlan;
  /** Project resolved for the preview (base project + draft). Never stored. */
  readonly project: Project;
  readonly draft: AnlageDraft;
  readonly resolution: Resolution;
  /** Voxel conflicts involving at least one instance of the Anlage. */
  readonly conflicts: readonly VoxelConflict[];
  /** Conflicts between the Anlage and existing buildings of the base project. */
  readonly conflictsWithBase: number;
  readonly spacing: readonly SpacingIssue[];
  readonly links: readonly LinkStatus[];
  /** Instance id → display name (for conflict lists). */
  readonly names: ReadonlyMap<string, string>;
  /** Blocks of the Anlage per district id ('' = path). */
  readonly blocks: ReadonlyMap<string, number>;
  /** Geometry/site fingerprint of the base project at preview time (stale check on adoption). */
  readonly baseFingerprint: string;
}

const fingerprint = (p: Pick<Project, 'instances' | 'links' | 'site'>): string => JSON.stringify([p.instances, p.links, p.site ?? null]);

const gapBetween = (a: Footprint, b: Footprint): number => {
  const dx = Math.max(b.x0 - a.x1, a.x0 - b.x1), dz = Math.max(b.z0 - a.z1, a.z0 - b.z1);
  // Overlap on both axes → negative overlap depth; otherwise the larger separation.
  return dx < 0 && dz < 0 ? Math.max(dx, dz) : Math.max(dx, dz);
};

/**
 * Preview: resolves base project + draft with the composer (real voxel
 * conflicts), checks the stored links and the footprint spacing (AABB, only a
 * hint). `base` is an existing project the Anlage would be added to; `offset`
 * shifts the whole Anlage.
 */
export function previewAnlage(plan: AnlagePlan, input: { base?: Project; offset?: readonly [number, number]; versions?: ReadonlyMap<string, AssetVersion>; heights?: ReadonlyMap<string, number> } = {}): AnlagePreview {
  const offset = input.offset ?? [0, 0];
  if (!offset.every(n => Number.isInteger(n) && Math.abs(n) <= 30_000_000)) fail('Versatz muss ganzzahlig sein');
  for (const [k, y] of input.heights ?? []) if (!Number.isInteger(y) || Math.abs(y) > 4096) fail(`Höhe für ${k} muss ganzzahlig sein`);
  const draft = draftAnlage(plan, offset, instanceIdOf, input.heights);
  const base = input.base ?? createProject({ name: plan.anlage.name, description: plan.anlage.description, profileId: SAMPLE_PROFILE });
  const taken = new Set(base.instances.map(i => i.id));
  if (draft.instances.some(i => taken.has(i.id))) fail('Die Anlage ist in diesem Projekt bereits enthalten (gleiche Instanz-IDs)');
  const project: Project = { ...base, instances: [...base.instances, ...draft.instances], links: [...base.links, ...draft.links] };
  const versions = new Map(input.versions ?? []);
  for (const p of plan.placements) versions.set(p.version.id, p.version);
  const resolution = resolveProject(project, versions);
  const own = new Set(draft.instances.map(i => i.id));
  const conflicts = resolution.conflicts.filter(c => c.instanceIds.some(id => own.has(id)));
  const conflictsWithBase = conflicts.filter(c => c.instanceIds.some(id => !own.has(id))).length;
  const names = new Map(project.instances.map(i => [i.id, i.name]));
  // Spacing: every pair of Anlage footprints except path–path (modules are meant to touch).
  const spacing: SpacingIssue[] = [];
  const min = plan.choices.spacing;
  const fp = plan.placements.map(p => ({ p, f: { x0: p.footprint.x0 + offset[0], z0: p.footprint.z0 + offset[1], x1: p.footprint.x1 + offset[0], z1: p.footprint.z1 + offset[1] } }));
  const gapIn = new Map(plan.anlage.districts.map(x => [x.id, Math.min(x.gap ?? min, min)]));
  for (let i = 0; i < fp.length; i++) for (let j = i + 1; j < fp.length; j++) {
    const a = fp[i]!, b = fp[j]!;
    if (a.p.kind === 'path' && b.p.kind === 'path') continue;
    if (a.p.ensembleId && a.p.ensembleId === b.p.ensembleId && a.p.districtId === b.p.districtId) continue;
    const sameDistrict = a.p.districtId !== null && a.p.districtId === b.p.districtId;
    const want = sameDistrict ? gapIn.get(a.p.districtId!)! : min;
    const gap = gapBetween(a.f, b.f);
    if (gap < 0) spacing.push({ a: a.p.name, b: b.p.name, gap, kind: 'overlap' });
    else if (gap < want) spacing.push({ a: a.p.name, b: b.p.name, gap, kind: 'tight' });
  }
  const blocks = new Map<string, number>();
  const byId = new Map(plan.placements.map((p, i) => [draft.instances[i]!.id, p]));
  for (const placed of resolution.placed) {
    const p = byId.get(placed.instance.id);
    if (!p) continue;
    let n = 0;
    for (const c of placed.payload.cells) if (c.kind === 'block') n++;
    blocks.set(p.districtId ?? '', (blocks.get(p.districtId ?? '') ?? 0) + n);
  }
  const links = checkLinks(project, versions).filter(l => own.has(l.link.a.instanceId) || own.has(l.link.b.instanceId));
  return { plan, project, draft, resolution, conflicts, conflictsWithBase, spacing, links, names, blocks, baseFingerprint: fingerprint(base) };
}

// ---------------------------------------------------------------------------
// Explicit adoption

function sitePlanWith(site: SitePlan, draft: AnlageDraft, ids: ReadonlyMap<string, string>): SitePlan {
  let next = site;
  for (const sec of draft.sections) {
    next = addSection(next, sec.name.slice(0, 80), sec.instanceIds.map(id => ({ instanceId: ids.get(id)! })));
    const added = next.sections.at(-1)!;
    next = { ...next, sections: next.sections.map(x => x === added ? { ...x, note: sec.note.slice(0, 500) } : x) };
  }
  return checkSite(next);
}

/** Fresh instance/link ids (adoption) so the same Anlage can be adopted more than once. */
function freshDraft(draft: AnlageDraft): { instances: Instance[]; links: ConnectorLink[]; ids: Map<string, string> } {
  const ids = new Map(draft.instances.map(i => [i.id, newId('inst')]));
  return {
    ids,
    instances: draft.instances.map(i => ({ ...i, id: ids.get(i.id)!, transform: structuredClone(i.transform) })),
    links: draft.links.map(l => ({ id: newId('link'), a: { ...l.a, instanceId: ids.get(l.a.instanceId)! }, b: { ...l.b, instanceId: ids.get(l.b.instanceId)! } })),
  };
}

function assertAdoptable(preview: AnlagePreview, acceptConflicts: boolean): void {
  if (preview.plan.blockers.length) fail(`nicht übernehmbar – ${preview.plan.blockers.join('; ')}`);
  if (!preview.draft.instances.length) fail('kein Bereich ausgewählt');
  if (preview.conflicts.length && !acceptConflicts) fail(`${preview.conflicts.length} Voxelkonflikt(e); Übernahme nur nach ausdrücklicher Bestätigung`);
}

/**
 * New project from a preview: instances with the pinned versions, mating
 * links, one build section per district (path first). Refuses blockers and,
 * unless confirmed, voxel conflicts.
 */
export function createAnlageProject(preview: AnlagePreview, input: { name?: string; profileId?: string; acceptConflicts?: boolean } = {}): Project {
  assertAdoptable(preview, input.acceptConflicts ?? false);
  const { anlage } = preview.plan;
  const off = preview.plan.choices.off.length ? ` Ohne: ${anlage.districts.filter(x => preview.plan.choices.off.includes(x.id)).map(x => x.name).join(', ')}.` : '';
  let project = createProject({ name: (input.name?.trim() || anlage.name).slice(0, 120), profileId: input.profileId ?? SAMPLE_PROFILE,
    description: `Aus der Bauwelt-Anlage „${anlage.name}“ angelegt (Abstand ${preview.plan.choices.spacing}).${off} ${anlage.description}`.slice(0, 2000) });
  const fresh = freshDraft(preview.draft);
  const operations: Operation[] = [
    ...fresh.instances.map(instance => ({ kind: 'instance.add' as const, instance })),
    ...fresh.links.map(link => ({ kind: 'link.add' as const, link })),
    { kind: 'site.set', site: sitePlanWith(siteOf(project), preview.draft, fresh.ids), label: 'Bauabschnitte der Anlage' },
  ];
  project = applyOperation(project, { kind: 'batch', label: `Anlage „${anlage.name}“ übernommen`, operations }).project;
  return project;
}

/**
 * One undoable operation adding the previewed Anlage to its base project
 * (instances, links, build sections appended after the existing ones).
 */
export function anlageIntoProject(preview: AnlagePreview, base: Project, input: { acceptConflicts?: boolean } = {}): Operation {
  assertAdoptable(preview, input.acceptConflicts ?? false);
  if (preview.baseFingerprint !== fingerprint(base) || preview.project.id !== base.id)
    fail('Das Projekt wurde seit der Vorschau geändert; bitte Vorschau neu berechnen');
  const fresh = freshDraft(preview.draft);
  return { kind: 'batch', label: `Anlage „${preview.plan.anlage.name}“ eingefügt`, operations: [
    ...fresh.instances.map(instance => ({ kind: 'instance.add' as const, instance })),
    ...fresh.links.map(link => ({ kind: 'link.add' as const, link })),
    { kind: 'site.set', site: sitePlanWith(siteOf(base), preview.draft, fresh.ids), label: 'Bauabschnitte der Anlage' },
  ] };
}

/** Offset that places the Anlage beside the base project's existing footprint (east, with the spacing as gap). */
export function besideOffset(plan: AnlagePlan, base: Pick<Resolution, 'world'> | null): [number, number] {
  const world = base?.world;
  if (!world || !plan.extent) return [0, 0];
  return [world.bounds.maxExclusive[0] + Math.max(plan.choices.spacing, 1) * 2 - plan.extent.x0, 0];
}

// ---------------------------------------------------------------------------
// Swap candidates

export interface SwapCandidate { readonly assetId: string; readonly name: string; readonly reason: 'variante' | 'bauwelt' }

/**
 * Candidates for a slot: other variants of the same family first, then
 * buildings of the Bauwelt with the same category. Never the slot's asset,
 * never archived or path modules.
 */
export function swapCandidates(entries: readonly { readonly asset: Pick<Asset, 'id' | 'name' | 'archived'>; readonly family?: string; readonly facets: Readonly<Record<string, readonly string[]>> }[], anlage: Anlage, slot: SlotState, limit = 16): SwapCandidate[] {
  const theme = themeOfAnlage(anlage);
  const current = entries.find(e => e.asset.id === slot.curatedAssetId);
  const out: SwapCandidate[] = [];
  const seen = new Set([slot.assetId]);
  const push = (e: typeof entries[number], reason: SwapCandidate['reason']) => { if (!seen.has(e.asset.id) && !e.asset.archived) { seen.add(e.asset.id); out.push({ assetId: e.asset.id, name: e.asset.name, reason }); } };
  if (slot.assetId !== slot.curatedAssetId && current) push(current, 'variante');
  if (current?.family) for (const e of entries) if (e.family === current.family) push(e, 'variante');
  const kategorie = new Set(current?.facets.kategorie ?? []);
  if (theme && kategorie.size) for (const e of entries) {
    const facets = theme.facets as Readonly<Record<string, readonly string[] | undefined>>;
    const inTheme = Object.entries(facets).every(([k, vs]) => !vs?.length || vs.some(v => e.facets[k]?.includes(v)));
    if (inTheme && e.facets.kategorie?.some(k => kategorie.has(k)) && e.facets.kategorie?.every(k => k !== 'infrastruktur')) push(e, 'bauwelt');
  }
  return out.slice(0, limit);
}

/** Pinned version ids of a plan (for tests and the "feste Versionen" list). */
export const pinnedVersionIdsOf = (plan: AnlagePlan): string[] => [...new Set(plan.placements.map(p => p.version.id))];
