import { BLOCK_FACTS_DATA_VERSION, BLOCK_FACTS_REPORT_SHA256, BLOCK_FACTS_SERVER_SHA1, BLOCK_FACTS_VERSION } from './blockFacts.js';
import { blockFacts } from './blocklogic/facts.js';
import { PROFILE_COUNTS, PROFILE_DATA_VERSION, PROFILE_FUELS, PROFILE_ITEMS, PROFILE_ITEM_TAGS, PROFILE_SERVER_SHA1, PROFILE_SOURCES, PROFILE_VERSION } from './profileData.js';
import type { BlockState } from './types.js';

/**
 * Das verbindliche Java-Versionsprofil (PROFILE-01). One profile, one origin: every block, property,
 * item, item tag, recipe (domain/profileRecipes.ts) and fuel comes from the same official server jar,
 * documented with SHA-1/SHA-256 in `profileData.ts` and `blockFacts.ts`. Regeneration and sources:
 * docs/architecture/VERSION_PROFILE.md.
 *
 * Rule: a DataVersion number is only a label of the file format. It never claims compatibility on its
 * own; `checkProfileStates` checks the content (ids, property names and values) against the profile.
 */
export const JAVA_PROFILE_ID = `java-${PROFILE_VERSION}`;

export interface VersionProfile {
  readonly id: string;
  readonly edition: 'java';
  readonly version: string;
  readonly dataVersion: number;
  readonly serverJarSha1: string;
  readonly sources: Readonly<Record<keyof typeof PROFILE_SOURCES, string>>;
  readonly counts: typeof PROFILE_COUNTS;
}

export const JAVA_PROFILE: VersionProfile = Object.freeze({
  id: JAVA_PROFILE_ID, edition: 'java', version: PROFILE_VERSION, dataVersion: PROFILE_DATA_VERSION,
  serverJarSha1: PROFILE_SERVER_SHA1, sources: Object.freeze({ ...PROFILE_SOURCES }), counts: PROFILE_COUNTS,
});

/** Throws when the block facts (BLOCK-01) and the profile were not derived from the same server jar. */
export function assertProfileConsistent(): VersionProfile {
  const problems: string[] = [];
  if (BLOCK_FACTS_VERSION !== PROFILE_VERSION) problems.push(`Blockfakten ${BLOCK_FACTS_VERSION} ≠ Profil ${PROFILE_VERSION}`);
  if (BLOCK_FACTS_DATA_VERSION !== PROFILE_DATA_VERSION) problems.push(`DataVersion ${BLOCK_FACTS_DATA_VERSION} ≠ ${PROFILE_DATA_VERSION}`);
  if (BLOCK_FACTS_SERVER_SHA1 !== PROFILE_SERVER_SHA1) problems.push('Blockfakten und Profil stammen aus verschiedenen server.jar');
  if (BLOCK_FACTS_REPORT_SHA256 !== PROFILE_SOURCES.blocksReport) problems.push('Blockbericht-Hash weicht ab');
  if (problems.length) throw new Error(`Versionsprofil uneinheitlich: ${problems.join('; ')}`);
  return JAVA_PROFILE;
}

const ns = (id: string): string => id.includes(':') ? id : `minecraft:${id}`;
const bare = (id: string): string => id.startsWith('minecraft:') ? id.slice(10) : id;

let itemSet: ReadonlySet<string> | null = null;
const items = (): ReadonlySet<string> => itemSet ??= new Set(PROFILE_ITEMS.split('\n'));
/** True for item ids of the profile (namespaced or bare). Mod namespaces are never profile items. */
export const isProfileItem = (id: string): boolean => (!id.includes(':') || id.startsWith('minecraft:')) && items().has(bare(id));
export const profileItemIds = (): readonly string[] => [...items()].map(ns);

let tagMap: ReadonlyMap<string, readonly string[]> | null = null;
function tags(): ReadonlyMap<string, readonly string[]> {
  if (tagMap) return tagMap;
  const m = new Map<string, readonly string[]>();
  for (const line of PROFILE_ITEM_TAGS.split('\n')) { const [t, members] = line.split('|') as [string, string]; m.set(t, Object.freeze(members.split(',').map(ns))); }
  return tagMap = m;
}
/** Members of an item tag used by profile recipes (`#planks`, `minecraft:logs` …); undefined for tags outside the profile table. */
export const profileItemTag = (tag: string): readonly string[] | undefined => tags().get(tag.replace(/^#?(minecraft:)?/, ''));
export const profileItemTagNames = (): readonly string[] => [...tags().keys()];

export interface FuelFacts {
  readonly itemId: string;
  /** Burn ticks in a furnace and in a fast block (blast furnace, smoker). */
  readonly burnTicks: number;
  readonly burnTicksFast: number;
  readonly speed: number;
  readonly speedFast: number;
}
let fuelMap: ReadonlyMap<string, FuelFacts> | null = null;
function fuelTable(): ReadonlyMap<string, FuelFacts> {
  if (fuelMap) return fuelMap;
  const m = new Map<string, FuelFacts>();
  for (const line of PROFILE_FUELS.split('\n')) {
    const [id, n, f, sn, sf] = line.split('|') as [string, string, string, string, string];
    m.set(ns(id), Object.freeze({ itemId: ns(id), burnTicks: Number(n), burnTicksFast: Number(f), speed: Number(sn), speedFast: Number(sf) }));
  }
  return fuelMap = m;
}
/** Fuel facts of an item (cooking_fuel component); undefined when it does not burn. */
export const fuelOf = (itemId: string): FuelFacts | undefined => fuelTable().get(ns(itemId));
export const profileFuels = (): readonly FuelFacts[] => [...fuelTable().values()];
/** Cooking operations one fuel item powers for a recipe of `cookTicks` (default 200) – the same in fast blocks. */
export function smeltsPerFuel(itemId: string, cookTicks = 200, fast = false): number {
  const f = fuelOf(itemId);
  if (!f) return 0;
  return fast ? (f.burnTicksFast * f.speedFast) / cookTicks : (f.burnTicks * f.speed) / cookTicks;
}

// ---------------------------------------------------------------------------
// Profile check of block states.

export type ProfileStatus =
  /** Every state is a valid state of the profile and the file names the profile's DataVersion. */
  | 'passt'
  /** Every state is valid in the profile, but the file comes from another (or no) DataVersion: nothing is converted. */
  | 'zustaende-passen'
  /** At least one vanilla id or property is unknown to the profile or a value is invalid. */
  | 'abweichend';

export interface ProfileStateIssue {
  readonly state: BlockState;
  readonly reason: 'unknown-block' | 'unknown-property' | 'invalid-value';
  readonly property?: string;
  readonly message: string;
}

export interface ProfileCheck {
  readonly profileId: string;
  readonly status: ProfileStatus;
  readonly checkedStates: number;
  /** DataVersion of the source; null when the source does not name one. */
  readonly dataVersion: number | null;
  readonly dataVersionMatches: boolean;
  /** States of other namespaces (mods): kept as they are, not part of the profile and not counted as issues. */
  readonly foreign: readonly BlockState[];
  /** States whose properties were incomplete; the game fills them with its defaults. */
  readonly incomplete: number;
  readonly issues: readonly ProfileStateIssue[];
  readonly summary: string;
}

const stateLabel = (s: BlockState): string => {
  const keys = Object.keys(s.properties).sort();
  return keys.length ? `${bare(s.id)}[${keys.map(k => `${k}=${s.properties[k]}`).join(',')}]` : bare(s.id);
};

/**
 * Checks block states against the profile. The verdict follows the content: a matching DataVersion
 * with an unknown block is still 'abweichend', and a foreign DataVersion with only valid states is
 * 'zustaende-passen' (usable as is, but not converted). Air is a valid state like any other.
 */
export function checkProfileStates(states: Iterable<BlockState>, dataVersion: number | null = null): ProfileCheck {
  const issues: ProfileStateIssue[] = [], foreign: BlockState[] = [];
  let checked = 0, incomplete = 0;
  const seen = new Set<string>();
  for (const s of states) {
    const key = stateLabel(s) + (s.id.includes(':') ? `@${s.id.split(':')[0]}` : '');
    if (seen.has(key)) continue;
    seen.add(key); checked++;
    if (s.id.includes(':') && !s.id.startsWith('minecraft:')) { foreign.push(s); continue; }
    const b = blockFacts(s.id);
    if (!b) { issues.push({ state: s, reason: 'unknown-block', message: `${bare(s.id)} gibt es in Java ${PROFILE_VERSION} nicht.` }); continue; }
    let bad = false;
    for (const [k, v] of Object.entries(s.properties)) {
      const values = b.properties[k];
      if (!values) { issues.push({ state: s, reason: 'unknown-property', property: k, message: `${stateLabel(s)}: Eigenschaft „${k}“ gibt es in ${PROFILE_VERSION} nicht.` }); bad = true; }
      else if (!values.includes(v)) { issues.push({ state: s, reason: 'invalid-value', property: k, message: `${stateLabel(s)}: „${k}=${v}“ ist in ${PROFILE_VERSION} ungültig (erlaubt: ${values.join(', ')}).` }); bad = true; }
    }
    if (!bad && Object.keys(b.properties).some(k => s.properties[k] === undefined)) incomplete++;
  }
  const dataVersionMatches = dataVersion === PROFILE_DATA_VERSION;
  const status: ProfileStatus = issues.length ? 'abweichend' : dataVersionMatches ? 'passt' : 'zustaende-passen';
  const dv = dataVersion === null ? 'ohne DataVersion' : dataVersionMatches ? `DataVersion ${dataVersion} wie das Profil` : `DataVersion ${dataVersion} (Profil: ${PROFILE_DATA_VERSION})`;
  const summary = status === 'passt'
    ? `Alle ${checked} Blockzustände gibt es so in Java ${PROFILE_VERSION}; ${dv}.`
    : status === 'zustaende-passen'
      ? `Alle ${checked} Blockzustände sind in Java ${PROFILE_VERSION} gültig; Datei ${dv} – Zustände werden nicht umgewandelt.`
      : `${issues.length} ${issues.length === 1 ? 'Abweichung' : 'Abweichungen'} zu Java ${PROFILE_VERSION} bei ${checked} Blockzuständen; ${dv}. Die DataVersion allein sagt nichts über die Verträglichkeit.`;
  return { profileId: JAVA_PROFILE_ID, status, checkedStates: checked, dataVersion, dataVersionMatches, foreign, incomplete, issues, summary: foreign.length ? `${summary} ${foreign.length} Zustände aus anderen Namensräumen (Mods) bleiben unverändert.` : summary };
}

/** DataVersion named in a payload profile id such as `java:dataversion-3465:registry-unverified` or `java-26.3`. */
export function dataVersionOfProfileId(profileId: string): number | null {
  if (profileId === JAVA_PROFILE_ID) return PROFILE_DATA_VERSION;
  const m = /(?:^|:)dataversion-(\d{1,10})(?::|$)/.exec(profileId);
  const n = m ? Number(m[1]) : NaN;
  return Number.isSafeInteger(n) && n > 0 && n <= 2_147_483_647 ? n : null;
}

/** Profile check of a payload's palette (cells that use them), DataVersion from its profile id. */
export function checkPayloadProfile(payload: { readonly profileId: string; readonly palette: readonly BlockState[] }): ProfileCheck {
  return checkProfileStates(payload.palette, dataVersionOfProfileId(payload.profileId));
}
