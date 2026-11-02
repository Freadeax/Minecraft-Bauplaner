import type { BlockState, Vec3 } from '../types.js';
import { HORIZONTAL, OPPOSITE, blockFacts, hasClass, inTag, matches, namespacedId, stateFacts, step } from './facts.js';
import type { Dir, GroundRule, StateFacts, SupportRule } from './facts.js';
import type { StateLookup } from './connect.js';

/**
 * Halt und Stütze wie im Spiel (BLOCK-01): whether a block state stays where it is
 * (Block.canSurvive), what it needs, and whether it falls (FallingBlock). Built only on
 * the generated facts, which the probe read from the real server; the special cases
 * below (cactus, sugar cane, chorus) are game rules that look at more than one block.
 */

/** Members of #minecraft:jungle_logs in 26.3 (cocoa holds only there). */
const JUNGLE_LOGS: ReadonlySet<string> = new Set(['minecraft:jungle_log', 'minecraft:jungle_wood', 'minecraft:stripped_jungle_log', 'minecraft:stripped_jungle_wood']);
const isAir = (s: BlockState | undefined): boolean => !s || /^minecraft:(air|cave_air|void_air)$/.test(namespacedId(s.id));
const id = (s: BlockState): string => namespacedId(s.id);

/** Neighbour `n` in direction `d` satisfies a support rule. Mod blocks count as support (assumed). */
export function satisfiesSupport(rule: SupportRule, n: BlockState | undefined, d: Dir): boolean {
  if (isAir(n)) return false;
  if (matches(n!, rule.minus)) return false;
  if (matches(n!, rule.plus)) return true;
  const f = stateFacts(n!);
  if (!f) return !blockFacts(n!.id);
  switch (rule.predicate) {
    case 'nonair': return true;
    case 'solid': return f.solid;
    default: return f.sturdy(OPPOSITE[d], rule.predicate);
  }
}
function groundMatches(rule: GroundRule | null, ground: BlockState | undefined, self: BlockState): boolean {
  if (!rule || isAir(ground)) return false;
  const g = id(ground!);
  if (rule.self && g === id(self)) return true;
  if (rule.tag && inTag(g, rule.tag)) return true;
  // "water" stands for any water source cell, also a waterlogged block (LilyPadBlock.mayPlaceOn).
  if (rule.ids.includes('water') && stateFacts(ground!)?.fluid === 'minecraft:water') return true;
  return rule.ids.some(x => namespacedId(x) === g);
}
const hasWater = (s: BlockState | undefined): boolean => !!s && (stateFacts(s)?.fluid ?? '').endsWith('water') || (!!s && id(s) === 'minecraft:frosted_ice');

/** Needs of a state in words of the game, for notes and checks. */
export type SupportNeed =
  | { readonly kind: 'none' }
  | { readonly kind: 'face'; readonly dirs: readonly Dir[] }
  | { readonly kind: 'ground'; readonly rule: GroundRule; readonly water: boolean }
  | { readonly kind: 'hang'; readonly rule: GroundRule }
  | { readonly kind: 'unknown' };

export function supportNeed(state: BlockState): SupportNeed {
  const f = stateFacts(state);
  if (!f) return { kind: 'unknown' };
  if (f.survivesAlone) return { kind: 'none' };
  if (id(state) === 'minecraft:cocoa' && HORIZONTAL.includes(state.properties.facing as Dir)) return { kind: 'face', dirs: [state.properties.facing as Dir] };
  if (f.supportDirs.length) return { kind: 'face', dirs: f.supportDirs };
  if (f.grounds) return { kind: 'ground', rule: f.grounds, water: false };
  if (f.groundsWithWater) return { kind: 'ground', rule: f.groundsWithWater, water: true };
  if (f.hangsFrom) return { kind: 'hang', rule: f.hangsFrom };
  return { kind: 'unknown' };
}

export interface SurviveResult {
  readonly survives: boolean;
  /** Directions of the cells that hold the block (empty when it holds alone or does not hold). */
  readonly heldBy: readonly Dir[];
  /** Mod block or a neighbour outside the vanilla facts was assumed to be fine. */
  readonly assumed: boolean;
}

/** canSurvive at `position`, judged from the neighbours in `lookup`. */
export function survives(state: BlockState, position: Vec3, lookup: StateLookup): SurviveResult {
  const f = stateFacts(state);
  if (!f) return { survives: true, heldBy: [], assumed: true };
  const at = (d: Dir) => lookup(step(position, d));
  const special = specialSurvive(state, f, position, lookup);
  if (special) return special;
  if (f.survivesAlone) return { survives: true, heldBy: [], assumed: false };
  const heldBy: Dir[] = [];
  let assumed = false;
  for (const d of f.supportDirs) {
    const n = at(d);
    if (n && !stateFacts(n) && !isAir(n)) assumed = true;
    if (satisfiesSupport(f.support[d] ?? { predicate: 'full', plus: [], minus: [] }, n, d)) heldBy.push(d);
  }
  if (heldBy.length) return { survives: true, heldBy, assumed };
  if (groundMatches(f.grounds, at('down'), state)) return { survives: true, heldBy: ['down'], assumed: false };
  if (f.groundsWithWater && groundMatches(f.groundsWithWater, at('down'), state)) {
    const below = step(position, 'down');
    if (HORIZONTAL.some(d => hasWater(lookup(step(below, d))))) return { survives: true, heldBy: ['down'], assumed: false };
  }
  if (groundMatches(f.hangsFrom, at('up'), state)) return { survives: true, heldBy: ['up'], assumed: false };
  // Light depends on the finished build and the time of day: in the dark the game lets mushrooms grow on these grounds too.
  if (groundMatches(f.groundsInDark, at('down'), state)) return { survives: true, heldBy: ['down'], assumed: true };
  return { survives: false, heldBy: [], assumed };
}

/** Game rules that look at more than the one supporting block. */
function specialSurvive(state: BlockState, f: StateFacts, position: Vec3, lookup: StateLookup): SurviveResult | null {
  const i = id(state);
  if (hasClass(i, 'CactusBlock')) {
    // A cactus breaks next to any solid block or lava (CactusBlock.canSurvive).
    for (const d of HORIZONTAL) {
      const n = lookup(step(position, d));
      if (n && (stateFacts(n)?.solid || (stateFacts(n)?.fluid ?? '').endsWith('lava'))) return { survives: false, heldBy: [], assumed: false };
    }
    return groundMatches(f.grounds, lookup(step(position, 'down')), state) ? { survives: true, heldBy: ['down'], assumed: false } : { survives: false, heldBy: [], assumed: false };
  }
  if (hasClass(i, 'SugarCaneBlock')) {
    const below = lookup(step(position, 'down'));
    if (below && id(below) === i) return { survives: true, heldBy: ['down'], assumed: false };
    if (!groundMatches(f.groundsWithWater ?? f.grounds, below, state)) return { survives: false, heldBy: [], assumed: false };
    const b = step(position, 'down');
    return HORIZONTAL.some(d => hasWater(lookup(step(b, d)))) ? { survives: true, heldBy: ['down'], assumed: false } : { survives: false, heldBy: [], assumed: false };
  }
  if (i === 'minecraft:vine') {
    // VineBlock.canSurvive: at least one face stays – a face holds on a sturdy full neighbour, a side face also under a vine with that face.
    const heldBy: Dir[] = [];
    const above = lookup(step(position, 'up'));
    for (const d of ['up', ...HORIZONTAL] as Dir[]) {
      if (state.properties[d] !== 'true') continue;
      const n = lookup(step(position, d));
      if (n && (f.support[d] ? satisfiesSupport(f.support[d]!, n, d) : stateFacts(n)?.sturdy(OPPOSITE[d]))) heldBy.push(d);
      else if (d !== 'up' && above && id(above) === i && above.properties[d] === 'true') heldBy.push('up');
    }
    return { survives: heldBy.length > 0, heldBy: [...new Set(heldBy)], assumed: false };
  }
  if (i === 'minecraft:cocoa') {
    // CocoaBlock.canSurvive: the block in `facing` is in #jungle_logs. The probe tested support with stone only,
    // so the facts know no support for cocoa; the tag members are fixed in 26.3 (BLOCK-02).
    const d = state.properties.facing as Dir | undefined;
    const n = d && HORIZONTAL.includes(d) ? lookup(step(position, d)) : undefined;
    const ok = !!n && JUNGLE_LOGS.has(id(n));
    return { survives: ok, heldBy: ok ? [d!] : [], assumed: false };
  }
  if (i === 'minecraft:scaffolding') {
    // ScaffoldingBlock.getDistance: 0 on a sturdy top, the value of scaffolding below, else nearest side + 1; breaks at 7.
    const below = lookup(step(position, 'down'));
    const dist = (s: BlockState | undefined) => Number(s?.properties.distance ?? 7);
    let d = below && id(below) === i ? dist(below) : below && stateFacts(below)?.sturdy('up') ? 0 : 7;
    for (const h of HORIZONTAL) { const n = lookup(step(position, h)); if (n && id(n) === i) d = Math.min(d, dist(n) + 1); }
    return { survives: d < 7, heldBy: d < 7 ? ['down'] : [], assumed: false };
  }
  return null;
}

/** FallingBlock.isFree: the cell below lets a falling block through. */
export function letsFallThrough(below: BlockState | undefined): boolean {
  if (isAir(below)) return true;
  const f = stateFacts(below!);
  if (!f) return false;
  return f.replaceable || inTag(id(below!), 'fire') || hasClass(id(below!), 'LiquidBlock');
}

/** The block falls (sand, suspicious sand, gravel, concrete powder, anvils, dragon egg …) when the cell below lets it through. */
export function falls(state: BlockState, position: Vec3, lookup: StateLookup): boolean {
  if (!fallingState(state)) return false;
  return letsFallThrough(lookup(step(position, 'down')));
}
/** Falls like sand (Fallable and needs no support – pointed dripstone is Fallable but hangs/stands on support). */
export const fallingState = (state: BlockState): boolean => !!blockFacts(state.id)?.falls && !!stateFacts(state)?.survivesAlone;
