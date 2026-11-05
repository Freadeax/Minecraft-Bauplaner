import { BLOCK_FACTS_VERSION, FACT_BLOCKS, FACT_CLASSES, FACT_STATES, FACT_SUPPORT, FACT_TABLES, FACT_TAGS } from '../blockFacts.js';
import type { BlockState, Vec3 } from '../types.js';

/**
 * Blockfakten 26.3 (BLOCK-01): what the real game code says about every vanilla block
 * state, read once from the generated table `blockFacts.ts` (see scripts/gen/gen_block_facts.mjs).
 * Complete property lists with defaults, sturdy faces, support needs, replaceability,
 * light, fluids, items and stack sizes. Pure data access, no rules beyond lookup.
 */
export const BLOCK_FACTS_PROFILE = `java-${BLOCK_FACTS_VERSION}`;

export type Dir = 'down' | 'up' | 'north' | 'south' | 'west' | 'east';
export const DIRS: readonly Dir[] = ['down', 'up', 'north', 'south', 'west', 'east'];
export const HORIZONTAL: readonly Dir[] = ['north', 'east', 'south', 'west'];
export const OFFSET: Readonly<Record<Dir, Vec3>> = { down: [0, -1, 0], up: [0, 1, 0], north: [0, 0, -1], south: [0, 0, 1], west: [-1, 0, 0], east: [1, 0, 0] };
export const OPPOSITE: Readonly<Record<Dir, Dir>> = { down: 'up', up: 'down', north: 'south', south: 'north', west: 'east', east: 'west' };
/** Clockwise seen from above (north → east → south → west). */
export const CLOCKWISE: Readonly<Record<string, Dir>> = { north: 'east', east: 'south', south: 'west', west: 'north' };
export const COUNTER_CLOCKWISE: Readonly<Record<string, Dir>> = { north: 'west', west: 'south', south: 'east', east: 'north' };
export const axisOf = (d: Dir): 'x' | 'y' | 'z' => d === 'east' || d === 'west' ? 'x' : d === 'up' || d === 'down' ? 'y' : 'z';
export const step = (p: Vec3, d: Dir, n = 1): Vec3 => { const o = OFFSET[d]; return [p[0] + o[0] * n, p[1] + o[1] * n, p[2] + o[2] * n]; };

/** Minecraft support types for a face: full face, a centre post, or a rigid (rail-capable) top. */
export type SupportKind = 'full' | 'center' | 'rigid';
/** How a neighbour must look to hold a block: a support type on the touching face, any non-air block or a legacy "solid" block. */
export type SupportPredicate = SupportKind | 'nonair' | 'solid';
export interface StateMatcher { readonly id: string; readonly combos: readonly Readonly<Record<string, string>>[] | null }
export interface SupportRule { readonly predicate: SupportPredicate; readonly plus: readonly StateMatcher[]; readonly minus: readonly StateMatcher[] }
export interface GroundRule {
  /** Vanilla tag whose members hold the block (exact for the tested candidates), else null. */
  readonly tag: string | null;
  /** Explicit blocks (when no tag fits) – bare ids. */
  readonly ids: readonly string[];
  /** The block also holds on itself (cactus, sugar cane, bamboo, upper door half …). */
  readonly self: boolean;
}

export interface StateFacts {
  /** Face is sturdy for the support type (Block.isFaceSturdy). */
  sturdy(face: Dir, kind?: SupportKind): boolean;
  /** Collision shape is a full block. */
  readonly fullCube: boolean;
  /** canSurvive with nothing around it. */
  readonly survivesAlone: boolean;
  /** Directions where one stone block is enough to hold it. */
  readonly supportDirs: readonly Dir[];
  /** What the neighbour in a support direction must offer. */
  readonly support: Readonly<Partial<Record<Dir, SupportRule>>>;
  /** Ground blocks (below) that hold it when no stone direction does (plants, crops …). */
  readonly grounds: GroundRule | null;
  /** Ground blocks that hold it only with water next to the ground (sugar cane). */
  readonly groundsWithWater: GroundRule | null;
  /** Blocks above that hold it (hanging plants). */
  readonly hangsFrom: GroundRule | null;
  /** Further grounds that hold it only in darkness (mushrooms: light level below 13). */
  readonly groundsInDark: GroundRule | null;
  /** Can be replaced by placing another block (short grass, snow layer, water …). */
  readonly replaceable: boolean;
  readonly light: number;
  /** Fluid id of the state (water, flowing_water, lava) or '' – waterlogged blocks report water. */
  readonly fluid: string;
  readonly occludes: boolean;
  /** Legacy "solid" flag (BlockState.isSolid). */
  readonly solid: boolean;
  /** Bottom face of the collision shape covers the wall post / side test areas (for walls below it). */
  readonly wallCover: { readonly post: boolean; readonly north: boolean; readonly south: boolean; readonly west: boolean; readonly east: boolean } | null;
}

export interface BlockFacts {
  readonly id: string;
  /** Relevant game classes, most specific first (FenceBlock, StairBlock, FallingBlock …). */
  readonly classes: readonly string[];
  /** Item that places this block (asItem) or null when there is none (fire, portals, wall-only variants map to their item). */
  readonly item: string | null;
  /** Stack size of that item (0 when there is no item). */
  readonly stack: number;
  /** Destroy time (−1 unbreakable). */
  readonly hardness: number;
  /** The right tool is needed for a drop. */
  readonly needsTool: boolean;
  /** Falls like sand when unsupported (Fallable). */
  readonly falls: boolean;
  /** All property values in game order. */
  readonly properties: Readonly<Record<string, readonly string[]>>;
  readonly defaults: Readonly<Record<string, string>>;
  readonly stateCount: number;
}

interface ParsedBlock extends BlockFacts { readonly keys: readonly string[]; readonly table: readonly number[] }

const DIR_LETTER: Readonly<Record<string, Dir>> = { d: 'down', u: 'up', n: 'north', s: 'south', w: 'west', e: 'east' };
const ns = (id: string): string => id.includes(':') ? id : `minecraft:${id}`;
const bare = (id: string): string => id.startsWith('minecraft:') ? id.slice(10) : id;

function parseMatchers(list: string): StateMatcher[] {
  if (!list) return [];
  return list.split(';').filter(Boolean).map(item => {
    const brace = item.indexOf('{');
    if (brace < 0) return { id: ns(item), combos: null };
    const combos = item.slice(brace + 1, -1).split('|').map(c => Object.fromEntries(c.split(',').filter(Boolean).map(kv => kv.split('=') as [string, string])));
    return { id: ns(item.slice(0, brace)), combos };
  });
}
const SUPPORT = FACT_SUPPORT.split('\n').map(parseRule);
function parseRule(text: string): SupportRule {
  const m = /^([a-z]+)(?:\+([^-]*))?(?:-(.*))?$/.exec(text);
  if (!m) throw new Error(`Stützregel unlesbar: ${text}`);
  return { predicate: m[1] as SupportPredicate, plus: parseMatchers(m[2] ?? ''), minus: parseMatchers(m[3] ?? '') };
}
function parseGround(spec: string): GroundRule | null {
  if (!spec) return null;
  let tag: string | null = null, self = false; const ids: string[] = [];
  for (const part of spec.split(';')) {
    if (part === '=') self = true;
    else if (part.startsWith('#')) tag = part.slice(1);
    else if (part) ids.push(part);
  }
  return { tag, ids, self };
}

const STATE_FACTS: StateFacts[] = FACT_STATES.split('\n').map(line => {
  const [st, full, alone, dirs, repl, light, fluid, flags, wc, how, on, onWater, under, onDark] = line.split('~') as string[];
  const mask = parseInt(st!, 36), dirBits = Number(dirs), cover = Number(wc), f = Number(flags);
  const support: Partial<Record<Dir, SupportRule>> = {};
  for (const part of (how ?? '').split('&').filter(Boolean)) {
    const d = DIR_LETTER[part[0]!]!, rest = part.slice(1);
    support[d] = rest.startsWith('@') ? SUPPORT[Number(rest.slice(1))]! : parseRule(rest);
  }
  const kinds: SupportKind[] = ['full', 'center', 'rigid'];
  return Object.freeze({
    sturdy: (face: Dir, kind: SupportKind = 'full') => (mask & (1 << (kinds.indexOf(kind) * 6 + DIRS.indexOf(face)))) !== 0,
    fullCube: full === '1', survivesAlone: alone === '1', supportDirs: DIRS.filter((_, i) => dirBits & (1 << i)), support,
    grounds: parseGround(on ?? ''), groundsWithWater: parseGround(onWater ?? ''), hangsFrom: parseGround(under ?? ''), groundsInDark: parseGround(onDark ?? ''),
    replaceable: repl === '1', light: Number(light), fluid: fluid ? ns(fluid) : '', occludes: (f & 1) !== 0, solid: (f & 2) !== 0,
    wallCover: cover < 0 ? null : { post: !!(cover & 1), north: !!(cover & 2), south: !!(cover & 4), west: !!(cover & 8), east: !!(cover & 16) },
  });
});
const TABLES = FACT_TABLES.split('\n').map(l => l.split(',').map(x => parseInt(x, 36)));

let blocks: Map<string, ParsedBlock> | null = null;
function table(): Map<string, ParsedBlock> {
  if (blocks) return blocks;
  const map = new Map<string, ParsedBlock>();
  for (const line of FACT_BLOCKS.split('\n')) {
    const [name, cls, item, stack, hardness, flags, props, keys, tab] = line.split('|') as string[];
    const properties: Record<string, readonly string[]> = {}, defaults: Record<string, string> = {};
    for (const spec of (props ?? '').split(';').filter(Boolean)) {
      const [k, rest] = spec.split('=') as [string, string];
      const [values, def] = rest.split(':') as [string, string | undefined];
      const v = values.split(',');
      properties[k] = Object.freeze(v); defaults[k] = def ?? v[0]!;
    }
    const id = ns(name!);
    const tableIdx = tab!.startsWith('@') ? TABLES[Number(tab!.slice(1))]! : [parseInt(tab!, 36)];
    map.set(id, Object.freeze({
      id, classes: Object.freeze(cls ? cls.split(',').map(i => FACT_CLASSES[Number(i)]!) : []),
      item: item === '-' ? null : ns(item || name!), stack: item === '-' ? 0 : stack ? Number(stack) : 64, hardness: Number(hardness),
      needsTool: (Number(flags) & 1) !== 0, falls: (Number(flags) & 2) !== 0,
      properties: Object.freeze(properties), defaults: Object.freeze(defaults),
      stateCount: Object.values(properties).reduce((n, v) => n * v.length, 1),
      keys: keys ? keys.split(',') : [], table: tableIdx,
    }));
  }
  return blocks = map;
}

let tags: Map<string, ReadonlySet<string>> | null = null;
function tagTable(): Map<string, ReadonlySet<string>> {
  if (tags) return tags;
  const map = new Map<string, ReadonlySet<string>>();
  for (const line of FACT_TAGS.split('\n')) { const [tag, members] = line.split('|') as [string, string]; map.set(tag, new Set(members.split(',').map(ns))); }
  return tags = map;
}

/** Facts of a vanilla block id (namespaced or bare); undefined for mod/unknown ids. */
export function blockFacts(id: string): BlockFacts | undefined { return table().get(ns(id)); }
export function factBlockIds(): readonly string[] { return [...table().keys()]; }
export const isFactBlock = (id: string): boolean => table().has(ns(id));
export const hasClass = (id: string, cls: string): boolean => table().get(ns(id))?.classes.includes(cls) ?? false;
/** Membership in a selected vanilla block tag (see FACT_TAGS), e.g. `fences`, `walls`, `supports_vegetation`. */
export const inTag = (id: string, tag: string): boolean => tagTable().get(tag.replace(/^#?(minecraft:)?/, ''))?.has(ns(id)) ?? false;
export const tagMembers = (tag: string): readonly string[] => [...(tagTable().get(tag.replace(/^#?(minecraft:)?/, '')) ?? [])];
export const knownTags = (): readonly string[] => [...tagTable().keys()];

/** Complete state: missing properties take the game default, unknown values are rejected (undefined). */
export function completeState(state: BlockState): BlockState | undefined {
  const b = table().get(ns(state.id));
  if (!b) return undefined;
  const properties: Record<string, string> = {};
  for (const [k, values] of Object.entries(b.properties)) {
    const v = state.properties[k] ?? b.defaults[k]!;
    if (!values.includes(v)) return undefined;
    properties[k] = v;
  }
  return { id: b.id, properties };
}

/** Facts of one block state (missing properties = defaults). Undefined for mod blocks or invalid values. */
export function stateFacts(state: BlockState): StateFacts | undefined {
  const b = table().get(ns(state.id));
  if (!b) return undefined;
  let index = 0;
  for (const k of b.keys) {
    const values = b.properties[k]!, v = state.properties[k] ?? b.defaults[k]!, i = values.indexOf(v);
    if (i < 0) return undefined;
    index = index * values.length + i;
  }
  return STATE_FACTS[b.table[index]!];
}

/** Does a neighbour state match one of the matchers (block id, optionally restricted property combinations)? */
export function matches(state: BlockState, list: readonly StateMatcher[]): boolean {
  const id = ns(state.id), b = table().get(id);
  return list.some(m => m.id === id && (!m.combos || m.combos.some(c => Object.entries(c).every(([k, v]) => (state.properties[k] ?? b?.defaults[k]) === v))));
}

/** Item that places the block (asItem), or null. Stack size 0 means no item. */
export const itemOf = (id: string): string | null => table().get(ns(id))?.item ?? null;
/** Stack size of a block's own item, by item id (block items only; undefined for other items). */
let stacks: Map<string, number> | null = null;
export function stackOfItem(itemId: string): number | undefined {
  if (!stacks) { stacks = new Map(); for (const x of table().values()) if (x.item && !stacks.has(x.item)) stacks.set(x.item, x.stack); }
  return stacks.get(ns(itemId));
}
export { bare as bareId, ns as namespacedId };
