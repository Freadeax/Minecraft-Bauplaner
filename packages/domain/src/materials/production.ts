import { newId } from '../core/hash.js';
import { DomainError } from '../core/types.js';
import type { SitePlan } from '../building/site.js';

/**
 * Production (PROD-01): which farms a project relies on and what they really
 * yield. One optional, versioned record on the site plan
 * (`project.site.production`), changed only through `site.set`:
 *
 *  - farms: a farm type from FARM_TYPES, how many units (modules, cells,
 *    traders) it has, its state, optionally the project instance that is the
 *    farm and its place in the world;
 *  - a harvest log: what was taken out of which farm after how many loaded
 *    hours. Logged harvests are added to the site stock in the same operation
 *    and replace the guide value (Richtwert) by a measured rate;
 *  - the player's time budget (gathering hours and AFK hours per day) and the
 *    server's simulation distance for the AFK analysis.
 *
 * Rates in FARM_TYPES are visible assumptions for common, simple designs –
 * never measurements. Analysis (coverage, bottlenecks, readiness, furnaces,
 * logistics, AFK spot) lives in productionPlan.ts.
 */

export const PRODUCTION_SCHEMA_VERSION = 1;
export const MAX_FARMS = 64;
export const MAX_HARVESTS = 2000;
export const MAX_UNITS = 256;
export const DEFAULT_GATHER_HOURS_PER_DAY = 1.5;
export const DEFAULT_AFK_HOURS_PER_DAY = 0;
export const DEFAULT_SIMULATION_DISTANCE = 10;

export type FarmMode = 'auto' | 'halb';
export const FARM_MODE_LABEL: Readonly<Record<FarmMode, string>> = { auto: 'läuft nebenbei', halb: 'braucht Spielerzeit' };
/**
 * What keeps a farm running near a player:
 * zufall = random ticks (plants) in simulated chunks within 128 blocks;
 * mob = mob spawning, player 24–128 blocks away;
 * sim = entities/block entities in simulated chunks (villagers, furnaces).
 */
export type FarmRange = 'zufall' | 'mob' | 'sim';
export const FARM_RANGE_LABEL: Readonly<Record<FarmRange, string>> = {
  zufall: 'Zufallsticks: Spieler höchstens 128 Blöcke entfernt, Chunk simuliert',
  mob: 'Mob-Spawning: Spieler 24–128 Blöcke entfernt',
  sim: 'Simulierte Chunks: innerhalb der Simulationsdistanz',
};
export type FarmGroup = 'Pflanzen' | 'Tiere' | 'Mobs' | 'Handel & Tausch' | 'Gestein & Flüssiges' | 'Nether & Ende';
export type Dimension = 'Oberwelt' | 'Nether' | 'Ende';

export interface FarmFlow {
  readonly item: string;
  /** Items per hour for ONE unit while the farm runs (auto) or is worked (halb). */
  readonly perHour: number;
  /** Raw items this output replaces 1:1 in the gathering plan (iron ingot covers raw iron). */
  readonly covers?: readonly string[];
}

export interface FarmType {
  readonly id: string;
  readonly name: string;
  readonly group: FarmGroup;
  /** What one unit is, e.g. „Modul (10 Pflanzen)“. */
  readonly unit: string;
  readonly mode: FarmMode;
  readonly range: FarmRange;
  readonly dimension: Dimension;
  readonly outputs: readonly FarmFlow[];
  /** Consumed per hour and unit (bartering eats gold, traders eat paper). */
  readonly inputs?: readonly FarmFlow[];
  /** Catalogue building that is (or contains) this farm. */
  readonly buildingId?: string;
  /** Richtwert of the hours to gather and build one unit when there is no catalogue building to count. */
  readonly effortHours?: number;
  /** Conditions in plain words. */
  readonly needs: readonly string[];
  /** Where the rate comes from and how much designs vary. */
  readonly basis: string;
}

const mc = (id: string): string => id.includes(':') ? id : `minecraft:${id}`;
const out = (item: string, perHour: number, covers?: readonly string[]): FarmFlow => ({ item: mc(item), perHour, ...(covers && { covers: covers.map(mc) }) });
const T = (t: Omit<FarmType, 'outputs' | 'inputs'> & { outputs: readonly FarmFlow[]; inputs?: readonly FarmFlow[] }): FarmType => t;

const CROP = 'Zufallsticks: Wachstum nur in simulierten Chunks; Richtwert für bewässerten Boden bei Licht ≥ 9.';

/** Farm types with guide rates (Richtwerte). Ordered by group for the picker. */
export const FARM_TYPES: readonly FarmType[] = [
  // Pflanzen
  T({ id: 'zuckerrohr', name: 'Zuckerrohr-Farm (Beobachter)', group: 'Pflanzen', unit: 'Modul mit 10 Pflanzen', mode: 'auto', range: 'zufall', dimension: 'Oberwelt',
    outputs: [out('sugar_cane', 33)], buildingId: 'bld_zuckerrohr_modul', needs: ['Wasser neben dem Sand', 'Trichterkette zur Truhe'],
    basis: `Ein Wachstumsschritt je ~16 Zufallsticks ≈ 3,3 Rohr je Pflanze und Stunde. ${CROP}` }),
  T({ id: 'kaktus', name: 'Kaktusfarm (passiv)', group: 'Pflanzen', unit: 'Feld mit 13 Kakteen', mode: 'auto', range: 'zufall', dimension: 'Oberwelt',
    outputs: [out('cactus', 40)], buildingId: 'bld_kaktusfarm', needs: ['Zaun oder Block neben der Wuchshöhe', 'Wasserlauf zur Trichterleiste'],
    basis: `≈ 3 Kakteen je Pflanze und Stunde. ${CROP}` }),
  T({ id: 'kuerbis', name: 'Kürbis-Farm (Kolben)', group: 'Pflanzen', unit: 'Modul mit 6 Stängeln', mode: 'auto', range: 'zufall', dimension: 'Oberwelt',
    outputs: [out('pumpkin', 30)], buildingId: 'bld_kuerbis_modul', needs: ['Freier Fruchtplatz neben jedem Stängel', 'Beobachter + Kolben'],
    basis: `≈ 5 Früchte je Stängel und Stunde. ${CROP}` }),
  T({ id: 'melone', name: 'Melonen-Farm (Kolben)', group: 'Pflanzen', unit: 'Modul mit 6 Stängeln', mode: 'auto', range: 'zufall', dimension: 'Oberwelt',
    outputs: [out('melon_slice', 150)], buildingId: 'bld_melonen_modul', needs: ['Freier Fruchtplatz neben jedem Stängel', 'Beobachter + Kolben'],
    basis: `≈ 5 Melonen je Stängel und Stunde, je 3–7 Scheiben (Mittel 5). ${CROP}` }),
  T({ id: 'bambus', name: 'Bambusfarm', group: 'Pflanzen', unit: 'Reihe mit 10 Stauden', mode: 'auto', range: 'zufall', dimension: 'Oberwelt',
    outputs: [out('bamboo', 220)], buildingId: 'bld_hof_bambusfarm', needs: ['Beobachter + Kolben über der 2. Höhe oder Handernte'],
    basis: `Bambus wächst schnell bis 12–16 Blöcke ≈ 22 je Staude und Stunde. ${CROP}` }),
  T({ id: 'seetang', name: 'Seetangfarm', group: 'Pflanzen', unit: 'Reihe mit 10 Pflanzen', mode: 'auto', range: 'zufall', dimension: 'Oberwelt',
    outputs: [out('kelp', 120)], buildingId: 'bld_hof_seetangfarm', needs: ['Wassersäule über dem Sand', 'Beobachter + Kolben, Wasserstrom zum Trichter'],
    basis: `≈ 12 Seetang je Pflanze und Stunde (14 % Wachstum je Zufallstick). ${CROP}` }),
  T({ id: 'weizen', name: 'Weizenacker 9×9', group: 'Pflanzen', unit: 'Feld 9×9 (80 Pflanzen)', mode: 'halb', range: 'zufall', dimension: 'Oberwelt',
    outputs: [out('wheat', 160), out('wheat_seeds', 200)], buildingId: 'bld_acker_weizen', needs: ['Ernte und Nachsaat von Hand oder Dorfbewohner-Bauer'],
    basis: `Reife nach ~30 Min.; Rate = Ernte von zwei reifen Feldern je Stunde Arbeit. ${CROP}` }),
  T({ id: 'karotten', name: 'Karottenacker 9×9', group: 'Pflanzen', unit: 'Feld 9×9 (80 Pflanzen)', mode: 'halb', range: 'zufall', dimension: 'Oberwelt',
    outputs: [out('carrot', 400)], buildingId: 'bld_acker_karotten', needs: ['Ernte und Nachsaat von Hand'], basis: `Je Pflanze 2–5 Karotten. ${CROP}` }),
  T({ id: 'kartoffeln', name: 'Kartoffelacker 9×9', group: 'Pflanzen', unit: 'Feld 9×9 (80 Pflanzen)', mode: 'halb', range: 'zufall', dimension: 'Oberwelt',
    outputs: [out('potato', 400)], buildingId: 'bld_acker_kartoffeln', needs: ['Ernte und Nachsaat von Hand'], basis: `Je Pflanze 2–5 Kartoffeln. ${CROP}` }),
  T({ id: 'baum', name: 'Baumfarm mit Knochenmehl', group: 'Pflanzen', unit: 'Raster mit 9 Setzlingen', mode: 'halb', range: 'zufall', dimension: 'Oberwelt',
    outputs: [out('birch_log', 600, ['oak_log', 'spruce_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'cherry_log', 'mangrove_log', 'pale_oak_log'])],
    buildingId: 'bld_baumfarm', needs: ['Axt (Effizienz hilft stark)', 'Knochenmehl beschleunigt'],
    basis: 'Handernte im Raster ohne Suchwege; zählt für jede Holzart, die du dort pflanzt (Birke im Katalogbau).' }),
  T({ id: 'pilze', name: 'Pilzfarm (dunkel)', group: 'Pflanzen', unit: 'Kammer', mode: 'halb', range: 'zufall', dimension: 'Oberwelt',
    outputs: [out('brown_mushroom', 60), out('red_mushroom', 60)], buildingId: 'bld_pilzfarm', needs: ['Licht unter 13', 'Myzel oder Podsol'],
    basis: 'Ausbreitung per Zufallstick; Rate gilt fürs Absammeln.' }),
  T({ id: 'netherwarze', name: 'Netherwarzen-Beet', group: 'Pflanzen', unit: 'Beet mit 20 Pflanzen', mode: 'halb', range: 'zufall', dimension: 'Oberwelt',
    outputs: [out('nether_wart', 120)], buildingId: 'bld_hof_netherwarze', needs: ['Seelensand', 'Ernte von Hand'],
    basis: 'Langsam (4 Stufen, 10 % je Zufallstick); 2–4 Warzen je reifer Pflanze.' }),
  // Tiere
  T({ id: 'huehner', name: 'Hühnerfarm (Eier)', group: 'Tiere', unit: 'Stall mit 10 Hühnern', mode: 'auto', range: 'sim', dimension: 'Oberwelt',
    outputs: [out('egg', 80)], buildingId: 'bld_huehnerfarm', needs: ['Trichter unter den Hühnern'], basis: 'Ein Ei je Huhn alle 5–10 Minuten.' }),
  T({ id: 'wolle', name: 'Wollfarm (Spender mit Schere)', group: 'Tiere', unit: '10 Schafe', mode: 'auto', range: 'sim', dimension: 'Oberwelt',
    outputs: [out('white_wool', 90)], buildingId: 'bld_hof_schafweide', needs: ['Gras zum Nachwachsen', 'Beobachter am Grasblock, Spender mit Schere'],
    basis: '1–3 Wolle je Schur, Nachwachsen nach dem Grasfressen. Gefärbte Schafe liefern farbige Wolle.' }),
  T({ id: 'kuehe', name: 'Kuhfarm (Zucht und Ernte)', group: 'Tiere', unit: '20 Kühe', mode: 'halb', range: 'sim', dimension: 'Oberwelt',
    outputs: [out('leather', 40), out('beef', 50)], buildingId: 'bld_hof_kuhstall', needs: ['Weizen zum Züchten'], inputs: [out('wheat', 30)],
    basis: 'Zucht alle 5 Minuten, 0–2 Leder je Kuh.' }),
  T({ id: 'bienen', name: 'Bienenhaus', group: 'Tiere', unit: '4 Bienenstöcke', mode: 'halb', range: 'sim', dimension: 'Oberwelt',
    outputs: [out('honeycomb', 12), out('honey_bottle', 8)], buildingId: 'bld_bienenhaus', needs: ['Blumen in der Nähe', 'Lagerfeuer unter dem Stock'],
    basis: 'Ein Stock ist nach etwa 5 Bestäubungsflügen voll (3 Waben oder 1 Flasche).' }),
  // Mobs
  T({ id: 'mobfarm', effortHours: 8, name: 'Mobfarm (dunkle Spawnplattformen)', group: 'Mobs', unit: 'Turm mit 4 Ebenen', mode: 'auto', range: 'mob', dimension: 'Oberwelt',
    outputs: [out('bone', 150), out('arrow', 120), out('rotten_flesh', 150), out('string', 60), out('gunpowder', 60)],
    needs: ['Lichtstufe 0 auf den Plattformen', 'AFK-Platz 24–128 Blöcke entfernt, am besten über dem Ozean', 'Wenig andere dunkle Höhlen in der Nähe'],
    basis: 'Stark abhängig von Höhe und Umgebung; Richtwert für einen Turm über dem Meer.' }),
  T({ id: 'schleim', effortHours: 5, name: 'Schleimfarm (Schleimchunk)', group: 'Mobs', unit: 'Plattformen in einem Schleimchunk', mode: 'auto', range: 'mob', dimension: 'Oberwelt',
    outputs: [out('slime_ball', 100)], needs: ['Schleimchunk unter Y 40', 'AFK-Platz 24–128 Blöcke entfernt'], basis: 'Richtwert für mehrere Ebenen in einem Chunk.' }),
  T({ id: 'hexen', effortHours: 6, name: 'Hexenfarm (Hexenhütte)', group: 'Mobs', unit: 'Hütte', mode: 'auto', range: 'mob', dimension: 'Oberwelt',
    outputs: [out('redstone', 120), out('glowstone_dust', 120), out('sugar', 120), out('gunpowder', 60), out('glass_bottle', 60)],
    needs: ['Hexenhütte im Sumpf', 'AFK-Platz 24–128 Blöcke entfernt'], basis: 'Spawnt nur im Bereich der Hütte; Richtwert für eine Hütte.' }),
  T({ id: 'eisen', name: 'Eisenfarm (Golems)', group: 'Mobs', unit: 'Zelle mit 3 Dorfbewohnern', mode: 'auto', range: 'sim', dimension: 'Oberwelt',
    outputs: [out('iron_ingot', 150, ['raw_iron']), out('poppy', 30)], buildingId: 'bld_eisenfarm',
    needs: ['Drei Dorfbewohner mit Betten und Arbeitsblöcken', 'Zombie als Angstauslöser (Namensschild)', 'Spieler in Simulationsdistanz'],
    basis: 'Ein Golem je Zelle alle ~2 Minuten, 3–5 Barren. Ersetzt Roheisen und dessen Schmelzvorgänge.' }),
  T({ id: 'raid', effortHours: 20, name: 'Überfall-Farm (Plünderer)', group: 'Mobs', unit: 'Anlage', mode: 'auto', range: 'mob', dimension: 'Oberwelt',
    outputs: [out('emerald', 800), out('totem_of_undying', 30), out('redstone', 200)], needs: ['Außenposten', 'Schlechtes Omen', 'großer Bauaufwand'],
    basis: 'Sehr designabhängig; Richtwert für eine einfache Anlage.' }),
  // Handel & Tausch
  T({ id: 'bibliothekar', name: 'Handel: Bibliothekar kauft Papier', group: 'Handel & Tausch', unit: 'Händler', mode: 'halb', range: 'sim', dimension: 'Oberwelt',
    outputs: [out('emerald', 40)], inputs: [out('sugar_cane', 960)], buildingId: 'bld_hof_handelsscheune',
    needs: ['Händler mit Papierhandel', 'Zuckerrohr → Papier (1:1)'], basis: '24 Papier je Smaragd, Handel füllt sich zweimal täglich auf; Richtwert bei mehreren Händlern im Wechsel.' }),
  T({ id: 'steinmetz', name: 'Handel: Steinmetz', group: 'Handel & Tausch', unit: 'Händler', mode: 'halb', range: 'sim', dimension: 'Oberwelt',
    outputs: [out('quartz_block', 30), out('terracotta', 60)], inputs: [out('emerald', 30)], buildingId: 'bld_hof_handelsscheune',
    needs: ['Steinmetz Meister-Stufe', 'Smaragde'], basis: 'Tauscht Smaragde gegen Baublöcke – spart Netherquarz und Lehm.' }),
  T({ id: 'piglin', name: 'Piglin-Tauschstation', group: 'Handel & Tausch', unit: 'Station mit 1 Piglin', mode: 'auto', range: 'sim', dimension: 'Nether',
    outputs: [out('obsidian', 25), out('ender_pearl', 12), out('string', 45), out('quartz', 50), out('soul_sand', 50), out('blackstone', 100), out('gravel', 100), out('crying_obsidian', 25)],
    inputs: [out('gold_ingot', 300)], buildingId: 'bld_dim_piglin_tausch', needs: ['Goldbarren', 'Piglin mit Namensschild (in der Oberwelt zombifiziert er – im Nether halten)'],
    basis: 'Ein Tausch alle 6 Sekunden; Mengen nach Tauschwahrscheinlichkeit. Im Nether betreiben.' }),
  // Gestein & Flüssiges
  T({ id: 'bruchstein', effortHours: 0.3, name: 'Bruchsteingenerator', group: 'Gestein & Flüssiges', unit: 'Generator', mode: 'halb', range: 'sim', dimension: 'Oberwelt',
    outputs: [out('cobblestone', 1200)], needs: ['Lava und Wasser', 'Effizienz-Spitzhacke'], basis: 'Abbau ohne Laufwege; mit Effizienz V deutlich mehr.' }),
  T({ id: 'stein', effortHours: 0.5, name: 'Steingenerator (Stein ohne Ofen)', group: 'Gestein & Flüssiges', unit: 'Generator', mode: 'halb', range: 'sim', dimension: 'Oberwelt',
    outputs: [out('stone', 900)], needs: ['Lava fließt auf Wasser', 'Behutsamkeit für Stein'], basis: 'Spart den Ofen für glatten Stein und Ziegel.' }),
  T({ id: 'basalt', effortHours: 1, name: 'Basaltgenerator', group: 'Gestein & Flüssiges', unit: 'Generator', mode: 'halb', range: 'sim', dimension: 'Oberwelt',
    outputs: [out('basalt', 1000)], needs: ['Seelenerde unter, Blaueis neben der Lava'], basis: 'Abbau ohne Laufwege.' }),
  T({ id: 'lava', effortHours: 2, name: 'Lavafarm (Tropfstein)', group: 'Gestein & Flüssiges', unit: '10 Kessel', mode: 'auto', range: 'zufall', dimension: 'Oberwelt',
    outputs: [out('lava_bucket', 20)], needs: ['Lavaquelle über Tropfstein über Kessel'], basis: '≈ 2 Eimer je Kessel und Stunde; bester Brennstoff (100 Schmelzvorgänge).' }),
  // Nether & Ende
  T({ id: 'gold', effortHours: 15, name: 'Goldfarm (Zombifizierte Piglins)', group: 'Nether & Ende', unit: 'Anlage', mode: 'auto', range: 'mob', dimension: 'Nether',
    outputs: [out('gold_ingot', 250, ['raw_gold']), out('gold_nugget', 900), out('rotten_flesh', 1200)], needs: ['Nether-Dach oder Netherwüste', 'AFK-Platz 24–128 Blöcke entfernt'],
    basis: 'Barren gerechnet aus Nuggets (9:1); stark designabhängig.' }),
  T({ id: 'lohen', effortHours: 3, name: 'Lohenfarm (Spawner)', group: 'Nether & Ende', unit: 'Spawner', mode: 'auto', range: 'mob', dimension: 'Nether',
    outputs: [out('blaze_rod', 250)], needs: ['Lohen-Spawner in einer Netherfestung', 'Spieler höchstens 16 Blöcke vom Spawner'], basis: 'Richtwert mit Tötungskammer.' }),
  T({ id: 'wither', effortHours: 10, name: 'Witherskelett-Farm', group: 'Nether & Ende', unit: 'Anlage', mode: 'auto', range: 'mob', dimension: 'Nether',
    outputs: [out('coal', 80), out('bone', 150), out('wither_skeleton_skull', 3)], needs: ['Netherfestung', 'Spawnflächen freigelegt'], basis: 'Einzige automatische Kohlequelle; Richtwert.' }),
  T({ id: 'quarz', effortHours: 0, name: 'Quarzabbau (Nether)', group: 'Nether & Ende', unit: 'Spieler', mode: 'halb', range: 'sim', dimension: 'Nether',
    outputs: [out('quartz', 400)], needs: ['Spitzhacke mit Glück'], basis: 'Abbau mit Glück III in einem Erzband.' }),
  T({ id: 'enderman', effortHours: 8, name: 'Endermanfarm', group: 'Nether & Ende', unit: 'Anlage', mode: 'auto', range: 'mob', dimension: 'Ende',
    outputs: [out('ender_pearl', 600)], needs: ['Plattform außerhalb der Hauptinsel', 'Endermite oder Fallhöhe'], basis: 'Richtwert für eine Standardplattform.' }),
  T({ id: 'waechter', effortHours: 40, name: 'Wächterfarm (Ozeanmonument)', group: 'Nether & Ende', unit: 'Anlage', mode: 'auto', range: 'mob', dimension: 'Oberwelt',
    outputs: [out('prismarine_shard', 1200), out('prismarine_crystals', 400)], needs: ['Ozeanmonument trockengelegt', 'großer Bauaufwand'],
    basis: 'Stark designabhängig.' }),
];

const TYPE_BY_ID = new Map(FARM_TYPES.map(t => [t.id, t]));
export const farmType = (id: string): FarmType | undefined => TYPE_BY_ID.get(id);
export const FARM_GROUPS: readonly FarmGroup[] = ['Pflanzen', 'Tiere', 'Mobs', 'Handel & Tausch', 'Gestein & Flüssiges', 'Nether & Ende'];
/** Farm types whose catalogue building is `assetId` (instances of catalogue buildings keep the building id as asset id). */
export const farmTypesForBuilding = (assetId: string): FarmType[] => FARM_TYPES.filter(t => t.buildingId === assetId);
/** Farm types that produce or cover `itemId`. */
export function farmTypesFor(itemId: string): FarmType[] {
  const id = mc(itemId);
  return FARM_TYPES.filter(t => t.outputs.some(o => o.item === id || o.covers?.includes(id)));
}
/** Output of a type for `itemId` (direct or covering). */
export function flowFor(type: FarmType, itemId: string): FarmFlow | undefined {
  const id = mc(itemId);
  return type.outputs.find(o => o.item === id) ?? type.outputs.find(o => o.covers?.includes(id));
}

// ---------------------------------------------------------------------------
// Record

export type FarmState = 'plan' | 'bau' | 'laeuft' | 'aus';
export const FARM_STATE_LABEL: Readonly<Record<FarmState, string>> = { plan: 'geplant', bau: 'im Bau', laeuft: 'läuft', aus: 'stillgelegt' };
const STATES: readonly FarmState[] = ['plan', 'bau', 'laeuft', 'aus'];
const DIMENSIONS: readonly Dimension[] = ['Oberwelt', 'Nether', 'Ende'];

export interface FarmPlace { readonly x: number; readonly y: number; readonly z: number; readonly dimension: Dimension }

export interface FarmEntry {
  readonly id: string;
  readonly type: string;
  readonly name: string;
  readonly units: number;
  readonly state: FarmState;
  /** Project instance that is this farm (built in this project). */
  readonly instanceId?: string;
  /** World plan point the farm was taken from. */
  readonly pointId?: string;
  readonly at?: FarmPlace;
  readonly note?: string;
  /** Team storage chest the farm's hoppers fill (PROD-05): its hopper bookings give the measured rate. */
  readonly chest?: string;
}

export interface HarvestEntry {
  readonly id: string;
  /** Day of the harvest, YYYY-MM-DD. */
  readonly day: string;
  readonly farmId: string;
  readonly itemId: string;
  readonly count: number;
  /** Loaded/worked hours since the previous harvest of this farm (for the measured rate). */
  readonly hours: number;
}

export interface ProductionPlan {
  readonly schemaVersion: 1;
  readonly farms: readonly FarmEntry[];
  readonly log: readonly HarvestEntry[];
  /** Hours per day the player spends gathering and farming (hand work, semi-automatic farms). */
  readonly gatherHoursPerDay: number;
  /** Extra hours per day the player stays AFK near the farms (automatic farms keep running). */
  readonly afkHoursPerDay: number;
  /** Server simulation distance in chunks (Paper/Vanilla default 10). */
  readonly simulationDistance: number;
  /** Chosen AFK spot; absent = not decided. */
  readonly afk?: FarmPlace;
}

export function emptyProduction(): ProductionPlan {
  return { schemaVersion: 1, farms: [], log: [], gatherHoursPerDay: DEFAULT_GATHER_HOURS_PER_DAY, afkHoursPerDay: DEFAULT_AFK_HOURS_PER_DAY, simulationDistance: DEFAULT_SIMULATION_DISTANCE };
}
export const productionOf = (site: Pick<SitePlan, 'production'>): ProductionPlan => site.production ?? emptyProduction();
/** Farms for the Paper plugin's team file (COOP-08): id, name and output items, so a yield store can name its farm. */
export function serverFarms(production: ProductionPlan): { id: string; name: string; items: string[] }[] {
  return production.farms.slice(0, 200).map(f => ({ id: f.id, name: f.name.slice(0, 60), items: (farmType(f.type)?.outputs ?? []).map(o => o.item).slice(0, 16) }));
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const fail = (message: string): never => { throw new DomainError('SITE', `Produktion: ${message}`); };
const text = (v: unknown, max: number, what: string): string => {
  if (typeof v !== 'string' || !v.trim() || v.length > max || /[\u0000-\u001f\u007f]/.test(v)) fail(`${what} braucht 1–${max} Zeichen`);
  return v as string;
};
const num = (v: unknown, min: number, max: number, what: string, integer = false): number => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isInteger(v))) fail(`${what} muss ${integer ? 'eine ganze Zahl' : 'eine Zahl'} von ${min} bis ${max} sein`);
  return v as number;
};
function checkPlace(v: unknown, what: string): void {
  if (!isObj(v)) return fail(`${what}: Ort ungültig`);
  num(v.x, -30_000_000, 30_000_000, `${what}: x`, true); num(v.y, -2048, 2048, `${what}: y`, true); num(v.z, -30_000_000, 30_000_000, `${what}: z`, true);
  if (!DIMENSIONS.includes(v.dimension as Dimension)) fail(`${what}: Dimension ${String(v.dimension)} unbekannt`);
}

/** Structural validation of `site.production`. Throws DomainError 'SITE'. */
export function checkProduction(raw: unknown): ProductionPlan {
  if (!isObj(raw)) return fail('kein Objekt');
  if (raw.schemaVersion !== PRODUCTION_SCHEMA_VERSION) fail(`unbekannte Schemaversion ${String(raw.schemaVersion)}`);
  if (!Array.isArray(raw.farms) || raw.farms.length > MAX_FARMS) fail(`höchstens ${MAX_FARMS} Farmen`);
  const ids = new Set<string>();
  for (const f of raw.farms as unknown[]) {
    if (!isObj(f)) return fail('Farm ist kein Objekt');
    const id = text(f.id, 64, 'Farm-ID'), name = text(f.name, 80, 'Farmname');
    if (ids.has(id)) fail(`Farm-ID ${id} doppelt`);
    ids.add(id);
    if (typeof f.type !== 'string' || !TYPE_BY_ID.has(f.type)) fail(`„${name}“: Farmart ${String(f.type)} unbekannt`);
    num(f.units, 1, MAX_UNITS, `„${name}“: Anzahl`, true);
    if (!STATES.includes(f.state as FarmState)) fail(`„${name}“: Zustand ${String(f.state)} unbekannt`);
    if (f.instanceId !== undefined) text(f.instanceId, 128, `„${name}“: Bauteil`);
    if (f.chest !== undefined) text(f.chest, 128, `„${name}“: Sammeltruhe`);
    if (f.pointId !== undefined) text(f.pointId, 128, `„${name}“: Kartenpunkt`);
    if (f.at !== undefined) checkPlace(f.at, `„${name}“`);
    if (f.note !== undefined && (typeof f.note !== 'string' || f.note.length > 500)) fail(`„${name}“: Notiz zu lang`);
  }
  if (!Array.isArray(raw.log) || raw.log.length > MAX_HARVESTS) fail(`Ertragsbuch: höchstens ${MAX_HARVESTS} Einträge`);
  const logIds = new Set<string>();
  for (const h of raw.log as unknown[]) {
    if (!isObj(h)) return fail('Ernte ist kein Objekt');
    const id = text(h.id, 64, 'Ernte-ID');
    if (logIds.has(id)) fail(`Ernte-ID ${id} doppelt`);
    logIds.add(id);
    if (typeof h.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(h.day) || !Number.isFinite(Date.parse(`${h.day}T00:00:00Z`))) fail(`Ernte ${id}: Tag muss JJJJ-MM-TT sein`);
    if (typeof h.farmId !== 'string' || !ids.has(h.farmId)) fail(`Ernte ${id}: Farm ${String(h.farmId)} gibt es nicht`);
    text(h.itemId, 128, `Ernte ${id}: Item`);
    num(h.count, 1, 1e7, `Ernte ${id}: Menge`, true);
    num(h.hours, 0.1, 10_000, `Ernte ${id}: Laufzeit`);
  }
  num(raw.gatherHoursPerDay, 0, 24, 'Sammelstunden je Tag');
  num(raw.afkHoursPerDay, 0, 24, 'AFK-Stunden je Tag');
  num(raw.simulationDistance, 2, 32, 'Simulationsdistanz', true);
  if (raw.afk !== undefined) checkPlace(raw.afk, 'AFK-Platz');
  return raw as unknown as ProductionPlan;
}

// ---------------------------------------------------------------------------
// Edits (pure SitePlan → SitePlan; wrap with siteOperation)

const withProduction = (site: SitePlan, production: ProductionPlan): SitePlan => ({ ...site, production: checkProduction(structuredClone(production)) });
const findFarm = (p: ProductionPlan, id: string): FarmEntry => p.farms.find(f => f.id === id) ?? fail(`Farm ${id} existiert nicht`);

export interface FarmDraft { type: string; name?: string; units?: number; state?: FarmState; instanceId?: string; pointId?: string; at?: FarmPlace; note?: string; chest?: string }

export function addFarm(site: SitePlan, draft: FarmDraft, id = newId('farm')): SitePlan {
  const p = productionOf(site), type = farmType(draft.type) ?? fail(`Farmart ${draft.type} unbekannt`);
  const entry: FarmEntry = {
    id, type: type.id, name: (draft.name ?? type.name).trim().slice(0, 80) || type.name, units: draft.units ?? 1, state: draft.state ?? 'plan',
    ...(draft.instanceId && { instanceId: draft.instanceId }), ...(draft.pointId && { pointId: draft.pointId }), ...(draft.at && { at: draft.at }),
    ...(draft.note?.trim() && { note: draft.note.trim() }), ...(draft.chest && { chest: draft.chest }),
  };
  return withProduction(site, { ...p, farms: [...p.farms, entry] });
}

export function updateFarm(site: SitePlan, id: string, patch: { name?: string; units?: number; state?: FarmState; note?: string; at?: FarmPlace | null; instanceId?: string | null; chest?: string | null }): SitePlan {
  const p = productionOf(site);
  findFarm(p, id);
  return withProduction(site, { ...p, farms: p.farms.map(f => {
    if (f.id !== id) return f;
    const next: { -readonly [K in keyof FarmEntry]: FarmEntry[K] } = { ...f };
    if (patch.name !== undefined) next.name = patch.name.trim();
    if (patch.units !== undefined) next.units = patch.units;
    if (patch.state !== undefined) next.state = patch.state;
    if (patch.note !== undefined) { if (patch.note.trim()) next.note = patch.note.trim(); else delete next.note; }
    if (patch.at !== undefined) { if (patch.at) next.at = patch.at; else delete next.at; }
    if (patch.instanceId !== undefined) { if (patch.instanceId) next.instanceId = patch.instanceId; else delete next.instanceId; }
    if (patch.chest !== undefined) { if (patch.chest) next.chest = patch.chest; else delete next.chest; }
    return next;
  }) });
}

/** Removes a farm and its harvest log entries (the stock they added stays). */
export function removeFarm(site: SitePlan, id: string): SitePlan {
  const p = productionOf(site);
  return withProduction(site, { ...p, farms: p.farms.filter(f => f.id !== id), log: p.log.filter(h => h.farmId !== id) });
}

export function setProductionSettings(site: SitePlan, patch: { gatherHoursPerDay?: number; afkHoursPerDay?: number; simulationDistance?: number; afk?: FarmPlace | null }): SitePlan {
  const p = productionOf(site);
  const { afk: _afk, ...rest } = p;
  void _afk;
  const afk = patch.afk === undefined ? p.afk : patch.afk ?? undefined;
  return withProduction(site, {
    ...rest, ...(afk && { afk }),
    ...(patch.gatherHoursPerDay !== undefined && { gatherHoursPerDay: Math.round(patch.gatherHoursPerDay * 4) / 4 }),
    ...(patch.afkHoursPerDay !== undefined && { afkHoursPerDay: Math.round(patch.afkHoursPerDay * 4) / 4 }),
    ...(patch.simulationDistance !== undefined && { simulationDistance: patch.simulationDistance }),
  });
}

/**
 * Logs a harvest and adds it to the site stock in one step, so an undo
 * removes both. `hours` = loaded (auto) or worked (halb) hours since the last
 * harvest of this farm.
 */
export function logHarvest(site: SitePlan, h: { farmId: string; itemId: string; count: number; hours: number; day: string }, id = newId('hv')): SitePlan {
  const p = productionOf(site);
  findFarm(p, h.farmId);
  const itemId = mc(h.itemId), count = Math.floor(h.count);
  const next = withProduction(site, { ...p, log: [...p.log, { id, day: h.day, farmId: h.farmId, itemId, count, hours: Math.round(h.hours * 10) / 10 }] });
  return { ...next, stock: { ...next.stock, [itemId]: (next.stock[itemId] ?? 0) + count } };
}

/** Removes a log entry; with `fromStock` the logged amount is taken out of the stock again (never below 0). */
export function removeHarvest(site: SitePlan, id: string, fromStock = true): SitePlan {
  const p = productionOf(site), h = p.log.find(e => e.id === id) ?? fail(`Ernte ${id} existiert nicht`);
  const next = withProduction(site, { ...p, log: p.log.filter(e => e.id !== id) });
  if (!fromStock) return next;
  const stock = { ...next.stock }, left = Math.max(0, (stock[h.itemId] ?? 0) - h.count);
  if (left) stock[h.itemId] = left; else delete stock[h.itemId];
  return { ...next, stock };
}

/** Drops instance links to instances that no longer exist (the farms stay). */
export function pruneProduction(production: ProductionPlan, instanceIds: ReadonlySet<string>): ProductionPlan {
  return { ...production, farms: production.farms.map(f => {
    if (!f.instanceId || instanceIds.has(f.instanceId)) return f;
    const { instanceId: _i, ...rest } = f;
    void _i;
    return rest;
  }) };
}
