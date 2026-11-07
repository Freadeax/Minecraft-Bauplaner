import type { BuildingMetrics, CatalogEntry, Factor, Plot } from './catalog.js';
import { PRUEFSTAND } from './pruefstand.js';
import { checkProfileStates, dataVersionOfProfileId, JAVA_PROFILE_ID } from '../../../voxel/src/profile.js';
import { PROFILE_VERSION } from '../../../voxel/src/profileData.js';
import type { BlockState } from '../../../voxel/src/types.js';

/**
 * Vergleichswerte der Bibliothek (LIB-07): Werte, die jede Karte, der Vergleich
 * und die Filter gleich zeigen. Alles wird aus den vorhandenen Kennwerten
 * (BuildingMetrics) und dem Inhalts-Hash der Version abgeleitet, nichts wird
 * gespeichert. So bleiben zwischengespeicherte Kataloge ohne Umbau gültig.
 */

// ------------------------------------------------------------------ Survival-Aufwand

export type EffortLevel = 1 | 2 | 3 | 4 | 5;
export const EFFORT_LABEL: Readonly<Record<EffortLevel, string>> = { 1: 'Gering', 2: 'Überschaubar', 3: 'Mittel', 4: 'Hoch', 5: 'Sehr hoch' };
/** Grenzen der Sammelmenge (Bauitems) für 0 … 4 Punkte. */
export const EFFORT_ITEM_STEPS: readonly number[] = [300, 1500, 6000, 20000];

export interface SurvivalEffort {
  readonly level: EffortLevel;
  readonly label: string;
  readonly factors: readonly Factor[];
  /** Formel in einem Satz, für den Hinweis an Karte und Vergleich. */
  readonly formula: string;
}

/**
 * Wie viel Sammelarbeit ein Bau im Überlebensmodus kostet (Heuristik):
 * Sammelmenge (Bauitems laut Materialliste) plus Spielphase der seltensten
 * Materialien. Bauzeit und Schwierigkeit stehen getrennt; hier zählt nur, was
 * man vorher beschaffen muss.
 */
export function survivalEffort(m: Pick<BuildingMetrics, 'items' | 'progression'>): SurvivalEffort {
  const factors: Factor[] = [];
  const total = m.items.total;
  const amount = EFFORT_ITEM_STEPS.filter(step => total >= step).length;
  if (amount) factors.push({ label: `${total.toLocaleString('de-DE')} Bauitems sammeln`, points: amount });
  const stage = m.progression.stage, phase = stage === 'spaet' ? 2 : stage === 'mitte' ? 1 : 0;
  if (phase) factors.push({ label: `Material ab ${stage === 'spaet' ? 'Spätes Spiel' : 'Mittleres Spiel'}`, points: phase });
  const level = Math.min(5, 1 + amount + phase) as EffortLevel;
  return {
    level, label: EFFORT_LABEL[level], factors,
    formula: `Heuristik: 1 + Sammelmenge (ab ${EFFORT_ITEM_STEPS.map(n => n.toLocaleString('de-DE')).join(' / ')} Bauitems je +1) + Spielphase (Mittleres Spiel +1, Spätes Spiel +2), höchstens 5.`,
  };
}

// ------------------------------------------------------------------ Minecraft-Profil und Mods

/**
 * Passt ein Plan zum Minecraft-Profil des Planers (Java 26.3)? Geprüft wird der Inhalt: jeder
 * Blockzustand muss es so in 26.3 geben (checkProfileStates). Die Profilkennung der Datei
 * (z. B. eine alte DataVersion) allein entscheidet nichts. Schlüssel für Filter: JAVA_PROFILE_ID
 * (passt) oder "abweichend".
 */
export interface ProfileFit { readonly key: string; readonly label: string; readonly detail: string; readonly fits: boolean }
const fitCache = new WeakMap<object, ProfileFit>();
export function profileFit(payload: { readonly profileId: string; readonly palette: readonly BlockState[] }): ProfileFit {
  const hit = fitCache.get(payload);
  if (hit) return hit;
  const check = checkProfileStates(payload.palette, dataVersionOfProfileId(payload.profileId));
  const fits = check.status !== 'abweichend';
  const fit: ProfileFit = fits
    ? { key: JAVA_PROFILE_ID, label: `Java ${PROFILE_VERSION}`, detail: check.summary, fits }
    : { key: 'abweichend', label: `≠ Java ${PROFILE_VERSION}`, detail: check.summary, fits };
  fitCache.set(payload, fit);
  return fit;
}
export const profileFitLabel = (key: string): string => key === JAVA_PROFILE_ID ? `Java ${PROFILE_VERSION}` : key === 'abweichend' ? `weicht von Java ${PROFILE_VERSION} ab` : profileLabel(key);

/** "java-26.3" → "Java 26.3"; unbekannte Kennungen bleiben, wie sie sind. */
export function profileLabel(profileId: string): string {
  const m = /^java-(.+)$/.exec(profileId);
  return m ? `Java ${m[1]}` : profileId;
}

/** Benötigte Mods einer Version: Namensräume außer minecraft. Leer = reines Vanilla. */
export function requiredMods(m: Pick<BuildingMetrics, 'modNamespaces'>): readonly string[] { return m.modNamespaces; }

/** Passt, wenn jeder benötigte Mod in `available` steht (leere Liste = nur Vanilla). */
export function modsAvailable(m: Pick<BuildingMetrics, 'modNamespaces'>, available: readonly string[]): boolean {
  return m.modNamespaces.every(ns => available.includes(ns));
}

// ------------------------------------------------------------------ Grundstücksgrößen

export interface PlotPreset { readonly id: string; readonly label: string; readonly hint: string; readonly plot: Plot }
/** Feste Grundstücke für die Schnellwahl; Chunk = 16 × 16 Blöcke. Drehen ist erlaubt. */
export const PLOT_PRESETS: readonly PlotPreset[] = [
  { id: '8', label: '8 × 8', hint: 'kleines Grundstück, halber Chunk', plot: { width: 8, depth: 8, allowRotation: true } },
  { id: '16', label: '16 × 16', hint: 'ein Chunk', plot: { width: 16, depth: 16, allowRotation: true } },
  { id: '24', label: '24 × 24', hint: 'Stadtgrundstück', plot: { width: 24, depth: 24, allowRotation: true } },
  { id: '32', label: '32 × 32', hint: '2 × 2 Chunks', plot: { width: 32, depth: 32, allowRotation: true } },
  { id: '48', label: '48 × 48', hint: '3 × 3 Chunks', plot: { width: 48, depth: 48, allowRotation: true } },
  { id: '64', label: '64 × 64', hint: '4 × 4 Chunks', plot: { width: 64, depth: 64, allowRotation: true } },
];
/** Die Schnellwahl, der ein Bauplatz entspricht (ohne Höhenlimit), sonst undefined. */
export function plotPresetOf(plot: Plot | undefined): PlotPreset | undefined {
  if (!plot || plot.height !== undefined || !plot.allowRotation) return undefined;
  return PLOT_PRESETS.find(p => p.plot.width === plot.width && p.plot.depth === plot.depth);
}
/** Kleinste Schnellwahl, auf die ein Bau passt (Breite/Tiefe, drehbar), sonst undefined (größer als 64 × 64). */
export function smallestPlot(m: Pick<BuildingMetrics, 'size'>): PlotPreset | undefined {
  const [w, , d] = m.size, long = Math.max(w, d), short = Math.min(w, d);
  return PLOT_PRESETS.find(p => long <= Math.max(p.plot.width, p.plot.depth) && short <= Math.min(p.plot.width, p.plot.depth));
}

// ------------------------------------------------------------------ Prüfstand

/**
 * Stand einer Version auf dem Spielprüfstand (BLOCK-02, scripts/mod/test_game_placement.sh):
 *  - spiel: genau dieser Inhalt (Inhalts-Hash) stand im echten Server und blieb unverändert
 *  - hinweis: im Spiel geprüft, nur harmlose Hinweise (Nähte, Wasserspiel)
 *  - abweichung: das Spiel hat beim letzten Lauf etwas verändert
 *  - neu: der Bau wurde geprüft, hat sich seitdem aber geändert (neuer Lauf nötig)
 *  - offen: nicht auf dem Prüfstand (eigene Bauteile, Importe, Beiträge nach dem letzten Lauf)
 */
export type CheckState = 'spiel' | 'hinweis' | 'abweichung' | 'neu' | 'offen';
export const CHECK_LABEL: Readonly<Record<CheckState, string>> = {
  spiel: 'Im Spiel geprüft', hinweis: 'Im Spiel geprüft', abweichung: 'Abweichung im Spiel', neu: 'Neu prüfen', offen: 'Nicht geprüft',
};
export interface CheckStatus { readonly state: CheckState; readonly label: string; readonly detail: string }

export interface PruefstandRecord {
  readonly format: 'bauplaner/pruefstand-v1';
  readonly checkedAt: string;
  readonly server: string;
  readonly plans: number;
  /** Asset-Id → [ersten 16 Zeichen des Inhalts-Hashs, Ergebnis]. */
  readonly buildings: Readonly<Record<string, readonly [string, 'ok' | 'hinweis' | 'abweichung']>>;
  /** Generator-Id → geprüfte Fälle und davon ohne Abweichung. */
  readonly generators: Readonly<Record<string, { readonly cases: number; readonly ok: number }>>;
}

const HASH_LEN = 16;
/** "2026-11-07" → "07.11.2026". */
export const deDate = (iso: string): string => /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('.') : iso;
const hashIndex = new WeakMap<PruefstandRecord, Map<string, 'ok' | 'hinweis' | 'abweichung'>>();
function byHash(record: PruefstandRecord): Map<string, 'ok' | 'hinweis' | 'abweichung'> {
  let index = hashIndex.get(record);
  if (!index) { index = new Map(Object.values(record.buildings).map(([h, r]) => [h, r])); hashIndex.set(record, index); }
  return index;
}

/** Prüfstand einer Version. `record` nur für Tests; Standard ist der eingecheckte letzte Lauf. */
export function checkStatus(entry: { readonly asset: { readonly id: string }; readonly version: { readonly payloadHash: string } }, record: PruefstandRecord = PRUEFSTAND): CheckStatus {
  const hash = entry.version.payloadHash.slice(0, HASH_LEN);
  const own = record.buildings[entry.asset.id];
  // Gleicher Inhalt unter anderer Id (z. B. eine Kopie eines mitgelieferten Gebäudes) gilt ebenso.
  const result = own && own[0] === hash ? own[1] : byHash(record).get(hash);
  const where = `${record.server}, Lauf vom ${deDate(record.checkedAt)}`;
  if (result === 'ok') return { state: 'spiel', label: CHECK_LABEL.spiel, detail: `Genau dieser Stand stand im echten Spiel und blieb Block für Block unverändert (${where}).` };
  if (result === 'hinweis') return { state: 'hinweis', label: CHECK_LABEL.hinweis, detail: `Im echten Spiel unverändert, mit harmlosen Hinweisen wie Nähten oder Wasserspiel (${where}).` };
  if (result === 'abweichung') return { state: 'abweichung', label: CHECK_LABEL.abweichung, detail: `Beim letzten Lauf hat das Spiel Blöcke verändert (${where}). Bericht: scripts/mod/test_game_placement.sh.` };
  if (own) return { state: 'neu', label: CHECK_LABEL.neu, detail: `Der Bau hat sich seit dem letzten Lauf geändert (${where}); die neue Fassung ist noch nicht im Spiel geprüft.` };
  return { state: 'offen', label: CHECK_LABEL.offen, detail: 'Nicht auf dem Spielprüfstand. Die Blockregeln des Planers gelten trotzdem; im Spiel geprüft werden die mitgelieferten Gebäude und Generatoren.' };
}
export const isGameChecked = (s: CheckStatus): boolean => s.state === 'spiel' || s.state === 'hinweis';

/** Generator auf dem Prüfstand: wie viele Fälle (Standard, Vorlagen, Stile, Zufall, Grenzwerte) im Spiel standen. */
export function generatorCheck(generatorId: string, record: PruefstandRecord = PRUEFSTAND): { readonly cases: number; readonly ok: number; readonly label: string; readonly detail: string } | undefined {
  const g = record.generators[generatorId];
  if (!g) return undefined;
  return { ...g, label: g.ok === g.cases ? `${g.cases} Fälle im Spiel geprüft` : `${g.cases - g.ok} von ${g.cases} Fällen weichen ab`,
    detail: `Standard, Vorlagen, Stile, Zufallswürfe und Grenzwerte im echten Spiel (${record.server}, Lauf vom ${deDate(record.checkedAt)}).` };
}
export function pruefstandInfo(record: PruefstandRecord = PRUEFSTAND): { readonly checkedAt: string; readonly server: string; readonly plans: number } {
  return { checkedAt: deDate(record.checkedAt), server: record.server, plans: record.plans };
}

// ------------------------------------------------------------------ eine Zeile je Karte

export interface CompareFacts {
  readonly footprint: string;
  readonly height: string;
  readonly material: string;
  readonly effort: SurvivalEffort;
  readonly profile: string;
  readonly profileFit: ProfileFit;
  readonly mods: readonly string[];
  readonly check: CheckStatus;
  readonly plot: PlotPreset | undefined;
}
/** Die fünf Vergleichswerte jeder Karte (Grundfläche, Höhe, Materialaufwand, Profil, Prüfstand) in einem Rutsch. */
export function compareFacts(entry: Pick<CatalogEntry, 'asset' | 'version' | 'metrics'>): CompareFacts {
  const m = entry.metrics, [w, h, d] = m.size;
  return {
    footprint: `${w} × ${d}`,
    height: `${h} hoch`,
    material: `${m.items.total.toLocaleString('de-DE')} Items`,
    effort: survivalEffort(m),
    profile: profileFit(entry.version.payload).label,
    profileFit: profileFit(entry.version.payload),
    mods: requiredMods(m),
    check: checkStatus(entry),
    plot: smallestPlot(m),
  };
}


// ------------------------------------------------------------------ Ensembles

export interface GroupFacts {
  /** Umfassendes Rechteck Breite × Tiefe der Aufstellung. */
  readonly size: readonly [number, number, number];
  readonly items: number;
  readonly shulkerBoxes: number;
  readonly effort: SurvivalEffort;
  readonly profiles: readonly string[];
  readonly mods: readonly string[];
  /** Mitglieder, deren genauer Stand im Spiel geprüft ist, von allen. */
  readonly checked: number;
  readonly members: number;
  readonly plot: PlotPreset | undefined;
}
/**
 * Vergleichswerte einer Gruppe (Ensemble): Rechteck aus Lage und Größe der Mitglieder
 * (gedrehte Mitglieder tauschen Breite und Tiefe), Material und Aufwand als Summe, Prüfstand
 * als Anteil. Fehlende Mitglieder ergeben undefined (nie halbe Werte).
 */
export function groupFacts(members: readonly { readonly at: readonly [number, number]; readonly y?: number; readonly turns?: number; readonly assetId: string }[],
  entryOf: (assetId: string) => Pick<CatalogEntry, 'asset' | 'version' | 'metrics'> | undefined): GroupFacts | undefined {
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity, top = -Infinity, bottom = Infinity, items = 0, shulkers = 0, checked = 0;
  let stage: BuildingMetrics['progression']['stage'] = 'start';
  const order = ['start', 'frueh', 'mitte', 'spaet'] as const;
  const profiles = new Set<string>(), mods = new Set<string>();
  for (const mb of members) {
    const e = entryOf(mb.assetId);
    if (!e) return undefined;
    const [w, h, d] = e.metrics.size, odd = (mb.turns ?? 0) % 2 !== 0;
    const sx = odd ? d : w, sz = odd ? w : d;
    minX = Math.min(minX, mb.at[0]); minZ = Math.min(minZ, mb.at[1]); maxX = Math.max(maxX, mb.at[0] + sx); maxZ = Math.max(maxZ, mb.at[1] + sz);
    top = Math.max(top, (mb.y ?? 0) + h); bottom = Math.min(bottom, mb.y ?? 0);
    items += e.metrics.items.total; shulkers += e.metrics.items.shulkerBoxes;
    if (order.indexOf(e.metrics.progression.stage) > order.indexOf(stage)) stage = e.metrics.progression.stage;
    profiles.add(profileFit(e.version.payload).label); for (const ns of e.metrics.modNamespaces) mods.add(ns);
    if (isGameChecked(checkStatus(e))) checked++;
  }
  if (!members.length) return undefined;
  const size = [maxX - minX, top - bottom, maxZ - minZ] as const;
  return { size, items, shulkerBoxes: shulkers, effort: survivalEffort({ items: { total: items } as BuildingMetrics['items'], progression: { stage, reasons: [] } }),
    profiles: [...profiles].sort(), mods: [...mods].sort(), checked, members: members.length, plot: smallestPlot({ size }) };
}
