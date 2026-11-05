import { blockFacts, factBlockIds } from '../../../voxel/src/blocklogic/index.js';
import { JAVA_PROFILE_ID } from '../../../voxel/src/profile.js';

/**
 * Kupfer mit Oxidation und Wachs (MAT-04). The state matrix is read from the version profile, not typed
 * by hand: every block whose game class is a Weathering* class oxidizes; its four stages and the waxed
 * twin of each stage form one family. A family enters the matrix only when all eight blocks exist in the
 * profile and the waxed ones do not oxidize – an incomplete family is never offered as compatible.
 *
 * Stages follow the game (WeatheringCopper.WeatherState): unaffected → exposed → weathered → oxidized.
 * Properties are identical across the eight blocks of a family (checked), so a swap keeps every state.
 */
export type CopperStage = 'unaffected' | 'exposed' | 'weathered' | 'oxidized';
export const COPPER_STAGES: readonly CopperStage[] = ['unaffected', 'exposed', 'weathered', 'oxidized'];
export const COPPER_STAGE_LABEL: Readonly<Record<CopperStage, string>> = { unaffected: 'Kupfer', exposed: 'Angelaufen', weathered: 'Verwittert', oxidized: 'Oxidiert' };

export interface CopperFamily {
  /** Form key: id of the unaffected, unwaxed block without namespace (copper_block, cut_copper_stairs, lightning_rod …). */
  readonly form: string;
  /** Game class that oxidizes (profile evidence). */
  readonly gameClass: string;
  /** Block ids (no namespace) by stage, unwaxed and waxed. */
  readonly ids: Readonly<Record<CopperStage, string>>;
  readonly waxed: Readonly<Record<CopperStage, string>>;
}
export interface CopperMatrix {
  readonly profileId: string;
  readonly families: readonly CopperFamily[];
  /** Weathering blocks that did not form a complete family (never offered). */
  readonly incomplete: readonly { readonly id: string; readonly reason: string }[];
}

const bare = (id: string): string => id.replace(/^minecraft:/, '');
/** Name of a stage: copper_block → exposed_copper, others get the stage as prefix. */
export function stageId(form: string, stage: CopperStage): string {
  if (stage === 'unaffected') return form;
  return form === 'copper_block' ? `${stage}_copper` : `${stage}_${form}`;
}
const sameProperties = (a: string, b: string): boolean => {
  const pa = blockFacts(a)?.properties, pb = blockFacts(b)?.properties;
  return !!pa && !!pb && JSON.stringify(Object.keys(pa).sort().map(k => [k, [...pa[k]!].sort()])) === JSON.stringify(Object.keys(pb).sort().map(k => [k, [...pb[k]!].sort()]));
};

let cached: CopperMatrix | null = null;
export function copperMatrix(): CopperMatrix {
  if (cached) return cached;
  const weathering = factBlockIds().filter(id => blockFacts(id)!.classes.some(c => c.startsWith('Weathering')));
  const stagePrefix = /^(exposed|weathered|oxidized)_/;
  const bases = weathering.map(bare).filter(id => !stagePrefix.test(id)).sort();
  const families: CopperFamily[] = [], incomplete: { id: string; reason: string }[] = [], used = new Set<string>();
  for (const form of bases) {
    const gameClass = blockFacts(form)!.classes.find(c => c.startsWith('Weathering'))!;
    const ids = Object.fromEntries(COPPER_STAGES.map(s => [s, stageId(form, s)])) as Record<CopperStage, string>;
    const waxed = Object.fromEntries(COPPER_STAGES.map(s => [s, `waxed_${s === 'unaffected' && form === 'copper_block' ? 'copper_block' : ids[s]}`])) as Record<CopperStage, string>;
    const problems: string[] = [];
    for (const s of COPPER_STAGES) {
      const f = blockFacts(ids[s]);
      if (!f) problems.push(`${ids[s]} fehlt im Profil`);
      else if (!f.classes.includes(gameClass)) problems.push(`${ids[s]} oxidiert nicht wie ${form}`);
      const w = blockFacts(waxed[s]);
      if (!w) problems.push(`${waxed[s]} fehlt im Profil`);
      else if (w.classes.some(c => c.startsWith('Weathering'))) problems.push(`${waxed[s]} oxidiert trotz Wachs`);
      if (f && w && (!sameProperties(form, ids[s]) || !sameProperties(form, waxed[s]))) problems.push(`${ids[s]}/${waxed[s]}: andere Eigenschaften`);
    }
    for (const s of COPPER_STAGES) used.add(ids[s]);
    if (problems.length) { incomplete.push({ id: form, reason: problems.join('; ') }); continue; }
    families.push(Object.freeze({ form, gameClass, ids: Object.freeze(ids), waxed: Object.freeze(waxed) }));
  }
  for (const id of weathering.map(bare)) if (!used.has(id)) incomplete.push({ id, reason: 'keiner Kupferfamilie zuzuordnen' });
  return cached = Object.freeze({ profileId: JAVA_PROFILE_ID, families: Object.freeze(families), incomplete: Object.freeze(incomplete) });
}

/** Family, stage and wax of a copper block id; undefined for anything else. */
export function copperVariant(blockId: string): { family: CopperFamily; stage: CopperStage; waxed: boolean } | undefined {
  const id = bare(blockId);
  for (const family of copperMatrix().families) for (const stage of COPPER_STAGES) {
    if (family.ids[stage] === id) return { family, stage, waxed: false };
    if (family.waxed[stage] === id) return { family, stage, waxed: true };
  }
  return undefined;
}
