import type { BlockState, VoxelPayload } from '../../voxel/src/types.js';
import { entityId } from '../../voxel/src/entities.js';

/**
 * Funktionen einer Survival-Basis (BASE-01). A base like a coastal settlement
 * with storage hall, forge, enchanting tower, farms and harbour is planned as
 * zones, each with one function. A function knows
 *
 *  - what it is for and in which build phase it usually comes,
 *  - where it wants to lie (near the plaza, at the water, away from it),
 *  - which shipped buildings fit (first = default, the rest are alternatives),
 *  - which game requirements its buildings must meet (enchanting power 15,
 *    hydrated farmland, workstations, storage …) – checked on the real blocks.
 *
 * The same block signatures recognise functions in imported models
 * (`detectFunction`, used when single buildings are pulled out of a large
 * model). Pure data and pure checks; nothing here changes anything.
 */

export type BaseFunctionId = 'platz' | 'lager' | 'kueche' | 'halle' | 'wohnen' | 'schmiede' | 'waffenkammer' | 'verzauberung' | 'xpfarm'
  | 'getreidefarm' | 'tierfarm' | 'hafen' | 'handel';
export type BasePhase = 1 | 2 | 3 | 4;

export const BASE_PHASES: Readonly<Record<BasePhase, { readonly name: string; readonly note: string }>> = {
  1: { name: 'Ankommen & Versorgen', note: 'Wege, Platz, Lager, Küche und das erste Feld: alles, was die ersten Spieltage trägt.' },
  2: { name: 'Handwerk & Tiere', note: 'Schmiede für Werkzeuge, Tierfarm für Leder und Wolle, Gemeinschaftshalle als Treffpunkt.' },
  3: { name: 'Handel & Hafen', note: 'Dorfbewohner-Handel, Hafen für Erkundung und Fischerei, Waffenkammer für die Ausrüstung.' },
  4: { name: 'Magie & Erfahrung', note: 'Verzauberungsturm und XP-Farm: braucht Bücherregale, Lapis und einen gefundenen Spawner oder eine Mobfarm.' },
};

export interface BaseMember {
  readonly assetId: string;
  readonly role: string;
  /** Default count (fields, piers); the user may change it up to `maxCount`. */
  readonly count?: number;
  readonly maxCount?: number;
  /** Harbour: members that stand in the water (piers) form the water row. */
  readonly water?: boolean;
}

export interface BaseFunction {
  readonly id: BaseFunctionId;
  readonly name: string;
  readonly purpose: string;
  readonly phase: BasePhase;
  /** 0 (anywhere) … 3 (directly at the plaza). */
  readonly central: number;
  /** 'muss': the zone lies at the shore (harbour); 'gern': prefers the water side. */
  readonly coast?: 'muss' | 'gern';
  /** Keep away from the plaza (mob farms: noise, darkness, spawning). */
  readonly apart?: boolean;
  /** Shipped buildings; the first member is the main building (door to the path). */
  readonly members: readonly BaseMember[];
  /** Alternatives for the main building (catalog ids). */
  readonly alternatives: readonly string[];
  /** Plot kept free when no building is chosen (w × d blocks), e.g. a mob farm around a spawner found in game. */
  readonly reserve?: readonly [number, number];
  readonly gap?: number;
  readonly rowWidth?: number;
  /** Map colour of the zone. */
  readonly color: string;
  readonly hints: readonly string[];
}

const m = (id: string, role: string, extra: Partial<BaseMember> = {}): BaseMember => ({ assetId: `bld_${id}`, role, ...extra });
const ids = (...list: string[]) => list.map(id => `bld_${id}`);

export const BASE_FUNCTIONS: readonly BaseFunction[] = [
  { id: 'platz', name: 'Dorfplatz', phase: 1, central: 3, color: '#cfd6dc', members: [m('dorfplatz', 'Dorfplatz')], alternatives: ids('stadt_platz', 'springbrunnen', 'dorfbrunnen', 'lagerfeuer'),
    purpose: 'Mittelpunkt mit Brunnen: alle Wege führen hierher, die Gemeinschaftshalle liegt daneben.', hints: ['Glocke am Platz ruft bei Überfällen alle Dorfbewohner ins Haus.'] },
  { id: 'lager', name: 'Lager', phase: 1, central: 2, color: '#e3c59a', members: [m('lagerhaus', 'Lagerhaus')], alternatives: ids('kueste_hafenspeicher', 'untergrund_lager', 'technik_lagerwand', 'scheune'),
    purpose: 'Zentrale Lagerhalle: kurze Wege von Hafen, Schmiede und Küche.', hints: ['Eine Doppeltruhe fasst 54 Stapel; Fässer lassen sich auch unter Blöcken öffnen.', 'Sortieranlage mit Trichtern spart später viel Zeit.'] },
  { id: 'kueche', name: 'Küche', phase: 1, central: 2, color: '#f0a3c8', members: [m('stadt_baeckerei', 'Küche')], alternatives: ids('raum_bauernkueche', 'taverne', 'raum_moderne_kueche', 'kueste_fischmarkt'),
    purpose: 'Räucherofen, Lagerfeuer und Vorräte zwischen Feldern, Tierfarm und Halle.', hints: ['Räucherofen gart doppelt so schnell wie ein Ofen.', 'Komposter neben der Küche macht aus Resten Knochenmehl für die Felder.'] },
  { id: 'halle', name: 'Gemeinschaftshalle', phase: 2, central: 3, color: '#c9b6ff', members: [m('langhaus', 'Gemeinschaftshalle')], alternatives: ids('taverne', 'meister_gildehaus', 'rathaus', 'untergrund_zwergenhalle', 'meister_markthalle'),
    purpose: 'Treffpunkt und Festsaal am Dorfplatz.', hints: ['Betten in der Halle setzen den Wiedereinstiegspunkt für alle Mitspieler.'] },
  { id: 'wohnen', name: 'Wohnhaus', phase: 1, central: 1, color: '#a6dd8b', members: [m('bauernhaus', 'Wohnhaus')], alternatives: ids('starterhaus_oak', 'fachwerkhaus', 'chalet', 'stadthaus', 'strandhaus', 'blockhuette'),
    purpose: 'Wohnen mit Bett und eigener Truhe.', hints: [] },
  { id: 'schmiede', name: 'Schmiede', phase: 2, central: 1, color: '#ffb98a', members: [m('schmiede', 'Schmiede')], alternatives: ids('werkstatt_werkzeugschmied', 'werkstatt_waffenschmied', 'werkstatt_ruestungsschmied', 'technik_ofenstrasse'),
    purpose: 'Amboss, Schmiedetisch und Hochofen neben dem Lager.', hints: ['Hochofen schmilzt Erze doppelt so schnell.', 'Schmiedetisch für Netheritaufwertung und Rüstungsbesätze.'] },
  { id: 'waffenkammer', name: 'Waffenkammer', phase: 3, central: 1, color: '#ff8f8f', members: [m('epoche_kaserne', 'Waffenkammer')], alternatives: ids('raum_waffenkammer', 'werkstatt_waffenschmied', 'werkstatt_ruestungsschmied', 'torhaus'),
    purpose: 'Rüstungsständer und Truhen für die Ausrüstung, nahe der Schmiede.', hints: ['Rüstungsständer zeigen jede Garnitur auf einen Blick.'] },
  { id: 'verzauberung', name: 'Verzauberungsturm', phase: 4, central: 0, color: '#b48cff', members: [m('zaubererturm', 'Verzauberungsturm')], alternatives: ids('verzauberungsraum', 'meister_alchemistenturm', 'werkstatt_bibliothekar', 'fantasy_kristallturm', 'spiralturm'),
    purpose: 'Zaubertisch mit 15 wirksamen Bücherregalen, Amboss für Bücher.', hints: ['Zwischen Zaubertisch und Regal muss die Zwischenreihe frei sein (Luft, Teppich und Schnee sind erlaubt).'] },
  { id: 'xpfarm', name: 'XP-Farm', phase: 4, central: 0, apart: true, color: '#7a6cff', members: [], alternatives: ids('eisenfarm', 'hof_zuchthaus'), reserve: [17, 17],
    purpose: 'Mobfarm um einen gefundenen Spawner oder als dunkle Plattform: abseits, damit keine Mobs im Dorf spawnen.', hints: [
      'Bauplatz wird freigehalten: Lage und Größe hängen vom Spawner ab, den du im Spiel findest.', 'Sammelstelle mit Trichter und Truhe, Schlagstelle auf Halbstufenhöhe.'] },
  { id: 'getreidefarm', name: 'Getreidefarm', phase: 1, central: 0, coast: 'gern', color: '#d8d16a', gap: 1, rowWidth: 36,
    members: [m('acker_weizen', 'Acker', { count: 4, maxCount: 12 }), m('windmuehle', 'Windmühle', { count: 1, maxCount: 1 })], alternatives: ids('acker_weizen', 'kuerbis_modul', 'melonen_modul', 'zuckerrohr_modul', 'gewaechshaus'),
    purpose: 'Bewässerte Äcker mit Mühle; nahe Küche und Wasser.', hints: ['Ackerboden bleibt feucht, wenn Wasser höchstens 4 Blöcke entfernt auf gleicher Höhe oder eine darüber liegt.', 'Pflanzen brauchen Licht 9 oder mehr zum Wachsen.'] },
  { id: 'tierfarm', name: 'Tierfarm', phase: 2, central: 0, coast: 'gern', color: '#9ed6a0', gap: 2, rowWidth: 34,
    members: [m('hof_kuhstall', 'Kuhstall'), m('hof_schafweide', 'Schafweide'), m('hof_schweinestall', 'Schweinestall'), m('huehnerfarm', 'Hühnerfarm')], alternatives: ids('hof_kuhstall', 'tierweide', 'hof_pferdestall', 'hof_kaninchenstall', 'bienenhaus'),
    purpose: 'Gehege für Kühe, Schafe, Schweine und Hühner neben den Feldern.', hints: ['Zaun ist 1,5 Blöcke hoch: Tiere springen nicht hinüber.', 'Weizen für Kühe und Schafe, Karotten für Schweine, Samen für Hühner.'] },
  { id: 'hafen', name: 'Hafen', phase: 3, central: 0, coast: 'muss', color: '#7fd6e0', gap: 2, rowWidth: 40,
    members: [m('kueste_bootshaus', 'Bootshaus'), m('hafenkran', 'Hafenkran', { count: 1, maxCount: 1 }), m('hafensteg', 'Steg', { count: 3, maxCount: 6, water: true })], alternatives: ids('kueste_bootshaus', 'kueste_werft', 'kueste_hafenspeicher', 'kueste_fischmarkt'),
    purpose: 'Stege ins Wasser, Bootshaus und Kran am Ufer; kurzer Weg zum Lager.', hints: ['Stege reichen ins Wasser; das Ufer prüfst du auf der Geländeaufnahme.'] },
  { id: 'handel', name: 'Händlerviertel', phase: 3, central: 1, color: '#9fc4ff', members: [m('hof_handelsscheune', 'Handelshaus')], alternatives: ids('handelshalle', 'hof_zuchthaus', 'meister_markthalle', 'kueste_fischmarkt'),
    purpose: 'Dorfbewohner mit Arbeitsblöcken und Betten, gut erreichbar am Ortseingang.', hints: ['Jeder Dorfbewohner braucht einen eigenen Arbeitsblock und ein Bett.', 'Handelspreise sinken nach einer Heilung von Zombie-Dorfbewohnern.'] },
];

export const baseFunctionById = (id: string): BaseFunction | undefined => BASE_FUNCTIONS.find(f => f.id === id);

/** How strongly two functions want to be close (symmetric; negative = keep apart). */
const AFFINITY: readonly (readonly [BaseFunctionId, BaseFunctionId, number])[] = [
  ['lager', 'schmiede', 3], ['lager', 'kueche', 2], ['lager', 'hafen', 2], ['lager', 'handel', 2], ['lager', 'waffenkammer', 1], ['lager', 'platz', 1],
  ['schmiede', 'waffenkammer', 3], ['schmiede', 'verzauberung', 1],
  ['kueche', 'halle', 3], ['kueche', 'getreidefarm', 3], ['kueche', 'tierfarm', 2], ['getreidefarm', 'tierfarm', 2],
  ['verzauberung', 'xpfarm', 2], ['halle', 'platz', 3], ['handel', 'platz', 2], ['wohnen', 'platz', 1], ['wohnen', 'halle', 1], ['handel', 'hafen', 1],
  ['xpfarm', 'platz', -2], ['xpfarm', 'wohnen', -2], ['xpfarm', 'halle', -1],
];
export function affinity(a: BaseFunctionId, b: BaseFunctionId): number {
  for (const [x, y, w] of AFFINITY) if ((x === a && y === b) || (x === b && y === a)) return w;
  return 0;
}

// ---------------------------------------------------------------------------
// Requirements on real blocks

export type RequirementStatus = 'ok' | 'warn' | 'info';
export interface Requirement {
  readonly id: string;
  readonly label: string;
  readonly status: RequirementStatus;
  /** Measured value, e.g. "12 von 15". */
  readonly value: string;
  readonly hint?: string;
}

const strip = (id: string) => id.startsWith('minecraft:') ? id.slice(10) : id;
/** Block counts by id without namespace (only block cells). */
export function blockCounts(payloads: readonly VoxelPayload[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const p of payloads) {
    const names = p.palette.map(s => strip(s.id));
    for (const c of p.cells) if (c.kind === 'block') { const n = names[c.paletteIndex]!; out.set(n, (out.get(n) ?? 0) + 1); }
  }
  return out;
}
export function entityCounts(payloads: readonly VoxelPayload[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const p of payloads) for (const e of p.entities ?? []) { const n = strip(entityId(e)); out.set(n, (out.get(n) ?? 0) + 1); }
  return out;
}
const sum = (counts: ReadonlyMap<string, number>, test: (id: string) => boolean): number => { let n = 0; for (const [k, v] of counts) if (test(k)) n += v; return n; };
const any = (counts: ReadonlyMap<string, number>, ...list: string[]) => sum(counts, k => list.includes(k));

const TRANSMITTER = (id: string | undefined) => id === undefined || id === 'air' || id === 'cave_air' || id === 'void_air' || id.endsWith('_carpet') || id === 'snow' || id === 'short_grass' || id === 'light';
/**
 * Enchanting power of the best enchanting table (vanilla rule since 1.18:
 * bookshelves on the ring two blocks away, one or two layers, the block
 * halfway in between must be a transmitter such as air or carpet). Max 15.
 */
export function enchantingPower(payload: VoxelPayload): { tables: number; power: number; shelves: number } {
  const names = payload.palette.map((s: BlockState) => strip(s.id));
  const tables: (readonly number[])[] = [];
  for (const c of payload.cells) if (c.kind === 'block' && names[c.paletteIndex] === 'enchanting_table') tables.push(c.position);
  if (!tables.length) return { tables: 0, power: 0, shelves: 0 };
  const near = new Map<string, string>();
  for (const c of payload.cells) {
    if (c.kind !== 'block') continue;
    const [x, y, z] = c.position;
    if (tables.some(t => Math.abs(x - t[0]!) <= 2 && Math.abs(z - t[2]!) <= 2 && y - t[1]! >= 0 && y - t[1]! <= 1)) near.set(`${x},${y},${z}`, names[c.paletteIndex]!);
  }
  let best = 0, shelvesBest = 0;
  for (const t of tables) {
    let power = 0, shelves = 0;
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
      if (Math.abs(dx) !== 2 && Math.abs(dz) !== 2) continue;
      for (let dy = 0; dy <= 1; dy++) {
        const id = near.get(`${t[0]! + dx},${t[1]! + dy},${t[2]! + dz}`);
        if (id !== 'bookshelf' && id !== 'chiseled_bookshelf') continue;
        shelves++;
        // Java int division truncates: ±2 → ±1, ±1 → 0.
        const mid = near.get(`${t[0]! + Math.trunc(dx / 2)},${t[1]! + dy},${t[2]! + Math.trunc(dz / 2)}`);
        if (id === 'bookshelf' && TRANSMITTER(mid)) power++;
      }
    }
    if (power > best || (power === best && shelves > shelvesBest)) { best = power; shelvesBest = shelves; }
  }
  return { tables: tables.length, power: Math.min(15, best), shelves: shelvesBest };
}

/** Farmland and how much of it is hydrated (water within 4 blocks horizontally, same level or one above). */
export function farmlandHydration(payload: VoxelPayload): { farmland: number; wet: number } {
  const names = payload.palette.map((s: BlockState) => strip(s.id));
  const wetState = payload.palette.map(s => strip(s.id) === 'water' || s.properties.waterlogged === 'true');
  const farmland: (readonly number[])[] = [];
  const water = new Set<string>();
  for (const c of payload.cells) {
    if (c.kind !== 'block') continue;
    if (names[c.paletteIndex] === 'farmland') farmland.push(c.position);
    else if (wetState[c.paletteIndex]) water.add(c.position.join(','));
  }
  if (!farmland.length) return { farmland: 0, wet: 0 };
  let wet = 0;
  const near = (f: readonly number[]) => {
    for (let dy = 0; dy <= 1; dy++) for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) if (water.has(`${f[0]! + dx},${f[1]! + dy},${f[2]! + dz}`)) return true;
    return false;
  };
  for (const f of farmland) if (near(f)) wet++;
  return { farmland: farmland.length, wet };
}

const WORKSTATIONS: Readonly<Record<string, string>> = {
  lectern: 'Bibliothekar', cartography_table: 'Kartograf', fletching_table: 'Pfeilmacher', smithing_table: 'Werkzeugschmied', grindstone: 'Waffenschmied',
  blast_furnace: 'Rüstungsschmied', loom: 'Schäfer', brewing_stand: 'Geistlicher', cauldron: 'Gerber', composter: 'Bauer', barrel: 'Fischer', smoker: 'Metzger', stonecutter: 'Steinmetz',
};
const STORAGE = (k: string) => k === 'chest' || k === 'trapped_chest' || k === 'barrel' || k.endsWith('shulker_box');
const ANVIL = (k: string) => k === 'anvil' || k === 'chipped_anvil' || k === 'damaged_anvil';
const BED = (k: string) => k.endsWith('_bed');
const SEAT = (k: string) => k.endsWith('_stairs') || k.endsWith('_slab');
const LIGHT = (k: string) => /(^|_)(lantern|torch|campfire|glowstone|sea_lantern|shroomlight|froglight|lamp)$/.test(k) || k === 'lantern' || k === 'soul_lantern' || k.endsWith('_candle') || k === 'candle';
const CROPS = (k: string) => ['wheat', 'carrots', 'potatoes', 'beetroots', 'pumpkin_stem', 'melon_stem', 'sugar_cane', 'cocoa', 'sweet_berry_bush', 'torchflower_crop', 'pitcher_crop'].includes(k);
const FENCE = (k: string) => k.endsWith('_fence') || k.endsWith('_wall');

const req = (id: string, label: string, ok: boolean | null, value: string, hint?: string): Requirement =>
  ({ id, label, status: ok === null ? 'info' : ok ? 'ok' : 'warn', value, ...(hint && { hint }) });

export interface RequirementInput {
  readonly payloads: readonly VoxelPayload[];
  /** Zone lies at the water (planner) – harbour check. */
  readonly atWater?: boolean | null;
  /** Reserved plot instead of a building. */
  readonly reserved?: boolean;
}

/** Game requirements of a function, checked on the blocks of its buildings. */
export function checkRequirements(fn: BaseFunctionId, input: RequirementInput): Requirement[] {
  const counts = blockCounts(input.payloads), ents = entityCounts(input.payloads);
  const storage = sum(counts, STORAGE);
  const out: Requirement[] = [];
  if (input.reserved) out.push(req('platz', 'Bauplatz freigehalten', null, 'kein Gebäude gewählt', 'Gebäude im Spiel nach dem Fundort planen oder hier ein Bauteil wählen.'));
  switch (fn) {
    case 'platz':
      out.push(req('licht', 'Beleuchtet', sum(counts, LIGHT) >= 2, `${sum(counts, LIGHT)} Lichtquellen`));
      out.push(req('glocke', 'Glocke', counts.has('bell') ? true : null, counts.has('bell') ? 'vorhanden' : 'keine', 'Optional: ruft bei Überfällen alle ins Haus.'));
      break;
    case 'lager':
      out.push(req('speicher', 'Lagerplatz', storage >= 16, `${storage} Truhen/Fässer ≈ ${storage * 27} Stapel`, 'Ziel für den Anfang: 16 Behälter (≈ 432 Stapel).'));
      out.push(req('werkbank', 'Werkbank', counts.has('crafting_table'), counts.has('crafting_table') ? 'vorhanden' : 'fehlt'));
      out.push(req('sortierer', 'Sortieranlage', counts.has('hopper') ? true : null, counts.has('hopper') ? `${counts.get('hopper')} Trichter` : 'keine', 'Optional: Trichter-Sortierer nachrüsten.'));
      break;
    case 'kueche': {
      const cook = any(counts, 'smoker', 'furnace', 'campfire', 'soul_campfire');
      out.push(req('kochen', 'Kochstelle', cook > 0, cook ? `${any(counts, 'smoker')} Räucherofen, ${any(counts, 'furnace')} Ofen, ${any(counts, 'campfire', 'soul_campfire')} Lagerfeuer` : 'fehlt'));
      out.push(req('vorrat', 'Vorratsbehälter', storage >= 2, `${storage}`));
      out.push(req('kompost', 'Komposter', counts.has('composter') ? true : null, counts.has('composter') ? 'vorhanden' : 'keiner', 'Optional: Reste zu Knochenmehl.'));
      break;
    }
    case 'halle': {
      // Seats: stairs and slabs on the floor layers only (roof stairs do not count).
      let seats = 0;
      for (const p of input.payloads) {
        const names = p.palette.map(s => strip(s.id));
        let floor = Infinity;
        for (const c of p.cells) if (c.kind === 'block' && c.position[1] < floor) floor = c.position[1];
        for (const c of p.cells) if (c.kind === 'block' && c.position[1] <= floor + 2 && SEAT(names[c.paletteIndex]!)) seats++;
      }
      out.push(req('plaetze', 'Sitzplätze (Treppen/Stufen)', seats >= 8, `${seats}`));
      out.push(req('licht', 'Licht', sum(counts, LIGHT) >= 4, `${sum(counts, LIGHT)} Lichtquellen`, 'Innen Licht 8 oder mehr: dort spawnen keine Monster.'));
      out.push(req('betten', 'Betten', sum(counts, BED) > 0 ? true : null, `${sum(counts, BED)}`, 'Optional: gemeinsamer Wiedereinstiegspunkt.'));
      break;
    }
    case 'wohnen':
      out.push(req('bett', 'Bett', sum(counts, BED) > 0, `${sum(counts, BED)}`));
      out.push(req('truhe', 'Truhe', storage > 0, `${storage}`));
      break;
    case 'schmiede': {
      out.push(req('amboss', 'Amboss', sum(counts, ANVIL) > 0, sum(counts, ANVIL) ? 'vorhanden' : 'fehlt'));
      out.push(req('schmiedetisch', 'Schmiedetisch', counts.has('smithing_table'), counts.has('smithing_table') ? 'vorhanden' : 'fehlt', 'Für Netherit und Rüstungsbesätze.'));
      const ovens = any(counts, 'blast_furnace', 'furnace');
      out.push(req('ofen', 'Hochofen/Ofen', ovens > 0, `${any(counts, 'blast_furnace')} Hochofen, ${any(counts, 'furnace')} Ofen`));
      out.push(req('schleifstein', 'Schleifstein', counts.has('grindstone') ? true : null, counts.has('grindstone') ? 'vorhanden' : 'keiner', 'Optional: Verzauberungen entfernen, Werkzeug reparieren.'));
      break;
    }
    case 'waffenkammer': {
      const stands = ents.get('armor_stand') ?? 0, frames = (ents.get('item_frame') ?? 0) + (ents.get('glow_item_frame') ?? 0);
      out.push(req('staender', 'Rüstungsständer/Rahmen', stands + frames > 0 ? true : null, `${stands} Ständer, ${frames} Rahmen`, 'Ständer und Rahmen stellst du im Spiel auf, wenn das Bauteil keine mitbringt.'));
      out.push(req('truhen', 'Truhen für Ausrüstung', storage >= 2, `${storage}`));
      break;
    }
    case 'verzauberung': {
      const p = input.payloads.map(enchantingPower).reduce((a, b) => b.power > a.power ? b : a, { tables: 0, power: 0, shelves: 0 });
      const tables = input.payloads.reduce((n, pl) => n + enchantingPower(pl).tables, 0);
      out.push(req('tisch', 'Zaubertisch', tables > 0, tables ? `${tables}` : 'fehlt'));
      out.push(req('stufe', 'Verzauberungsstufe 30', p.power >= 15, `${p.power} von 15 Regalen wirksam${p.shelves > p.power ? ` (${p.shelves - p.power} verdeckt)` : ''}`,
        'Regale im Ring zwei Blöcke um den Tisch, Zwischenreihe frei.'));
      out.push(req('amboss', 'Amboss für Bücher', sum(counts, ANVIL) > 0 ? true : null, sum(counts, ANVIL) ? 'vorhanden' : 'keiner', 'Optional: Bücher auf Werkzeuge übertragen.'));
      break;
    }
    case 'xpfarm': {
      const spawner = counts.get('spawner') ?? 0;
      out.push(req('spawner', 'Spawner oder Mobplattform', spawner > 0 ? true : null, spawner ? `${spawner} Spawner` : 'im Spiel suchen', 'Spawner gibt es in Verliesen, Minen und Festungen.'));
      out.push(req('sammeln', 'Sammelstelle', counts.has('hopper') ? true : null, counts.has('hopper') ? `${counts.get('hopper')} Trichter` : 'keine'));
      break;
    }
    case 'getreidefarm': {
      const h = input.payloads.map(farmlandHydration).reduce((a, b) => ({ farmland: a.farmland + b.farmland, wet: a.wet + b.wet }), { farmland: 0, wet: 0 });
      const crops = sum(counts, CROPS);
      out.push(req('acker', 'Ackerfläche', h.farmland >= 64, `${h.farmland} Ackerboden`, 'Ziel: 64 Felder versorgen zwei Spieler mit Brot.'));
      out.push(req('wasser', 'Bewässert', h.farmland > 0 && h.wet === h.farmland, h.farmland ? `${h.wet} von ${h.farmland}` : '–', 'Wasser höchstens 4 Blöcke entfernt, gleiche Höhe oder eine darüber.'));
      out.push(req('ernte', 'Ernte je Durchgang', null, crops ? `≈ ${crops} Weizen ≈ ${Math.floor(crops / 3)} Brot` : 'nichts gepflanzt'));
      break;
    }
    case 'tierfarm': {
      const fence = sum(counts, FENCE), gates = sum(counts, k => k.endsWith('_fence_gate'));
      out.push(req('gehege', 'Gehege mit Zaun', fence >= 20, `${fence} Zaun-/Mauerblöcke`));
      out.push(req('tor', 'Tore', gates > 0, `${gates}`));
      out.push(req('futter', 'Futterlager', counts.has('hay_block') || storage > 0 ? true : null, `${counts.get('hay_block') ?? 0} Heuballen, ${storage} Behälter`));
      break;
    }
    case 'hafen':
      out.push(req('wasser', 'Am Wasser', input.atWater ?? null, input.atWater === true ? 'Stege reichen ins Wasser' : input.atWater === false ? 'keine Wasserseite gewählt' : 'ungeprüft'));
      out.push(req('lager', 'Ablage am Steg', storage > 0 ? true : null, `${storage} Behälter`));
      break;
    case 'handel': {
      const stations = Object.entries(WORKSTATIONS).filter(([k]) => counts.has(k));
      const beds = sum(counts, BED), jobs = stations.reduce((n, [k]) => n + counts.get(k)!, 0);
      out.push(req('arbeit', 'Arbeitsblöcke', jobs >= 3, jobs ? `${jobs}: ${stations.map(([, v]) => v).join(', ')}` : 'keine'));
      out.push(req('betten', 'Betten je Dorfbewohner', beds >= jobs && beds > 0, `${beds} Betten für ${jobs} Berufe`));
      break;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Recognising functions in imported models

export interface FunctionGuess { readonly id: BaseFunctionId | 'wege' | null; readonly name: string; readonly reason: string }

/**
 * Function of a cut-out part from its blocks: enchanting table → tower,
 * anvil → forge, many containers → storage, farmland → field, fences → pens,
 * mostly path blocks → paths. Low confidence results return `id: null`.
 */
export function detectFunction(counts: ReadonlyMap<string, number>, entities: ReadonlyMap<string, number> = new Map(), flat = false): FunctionGuess {
  const total = [...counts.values()].reduce((a, b) => a + b, 0) || 1;
  const storage = sum(counts, STORAGE), farmland = counts.get('farmland') ?? 0, fence = sum(counts, k => k.endsWith('_fence')), crops = sum(counts, CROPS);
  const pathBlocks = any(counts, 'dirt_path', 'gravel', 'coarse_dirt', 'cobblestone', 'mossy_cobblestone', 'stone_bricks', 'polished_andesite', 'packed_mud', 'mud_bricks');
  const water = counts.get('water') ?? 0;
  if (counts.has('enchanting_table')) return { id: 'verzauberung', name: 'Verzauberungsturm', reason: 'Zaubertisch' };
  if (counts.has('spawner')) return { id: 'xpfarm', name: 'XP-Farm', reason: 'Spawner' };
  if (farmland + crops > total * 0.25) return { id: 'getreidefarm', name: flat ? 'Feld' : 'Getreidefarm', reason: `${farmland} Ackerboden` };
  if (sum(counts, ANVIL) > 0 || counts.has('smithing_table') || counts.has('blast_furnace')) return { id: 'schmiede', name: 'Schmiede', reason: 'Amboss/Schmiedetisch/Hochofen' };
  if ((entities.get('armor_stand') ?? 0) >= 2) return { id: 'waffenkammer', name: 'Waffenkammer', reason: 'Rüstungsständer' };
  const stations = Object.keys(WORKSTATIONS).filter(k => counts.has(k) && k !== 'barrel' && k !== 'composter');
  if (stations.length >= 3) return { id: 'handel', name: 'Händlerhaus', reason: `${stations.length} Arbeitsblöcke` };
  if (storage >= 12) return { id: 'lager', name: 'Lager', reason: `${storage} Truhen/Fässer` };
  if (counts.has('smoker') || (counts.has('campfire') && storage > 0)) return { id: 'kueche', name: 'Küche', reason: 'Räucherofen/Kochstelle' };
  if (flat && fence > total * 0.15) return { id: 'tierfarm', name: 'Gehege', reason: `${fence} Zaunblöcke` };
  if (flat && water > total * 0.2) return { id: 'hafen', name: 'Steg/Wasser', reason: 'viel Wasser' };
  if (flat && pathBlocks > total * 0.5) return { id: 'wege', name: 'Wege & Plätze', reason: 'Wegblöcke' };
  if (sum(counts, BED) >= 4 && sum(counts, SEAT) >= 8) return { id: 'halle', name: 'Halle', reason: 'viele Betten und Sitzplätze' };
  if (sum(counts, BED) > 0) return { id: 'wohnen', name: 'Wohnhaus', reason: 'Bett' };
  return { id: null, name: flat ? 'Fläche' : 'Gebäude', reason: '' };
}
