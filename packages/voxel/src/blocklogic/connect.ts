import type { BlockState, Vec3 } from '../types.js';
import { CLOCKWISE, COUNTER_CLOCKWISE, HORIZONTAL, OPPOSITE, axisOf, blockFacts, hasClass, inTag, namespacedId, stateFacts, step } from './facts.js';
import type { Dir } from './facts.js';

/**
 * Verbindungslogik wie im Spiel (BLOCK-01). Minecraft does not store connections the
 * builder chooses: fences, walls, panes, bars, stairs corners, gates in walls, snowy
 * grass and mushroom block faces follow from the neighbours (updateShape). This module
 * reproduces those rules on top of the generated block facts, so a plan shows – and
 * exports – the state the game will create. Checked against vectors computed by the
 * real 26.3 server (fixtures/blocks/block-vectors-26.3.json).
 */

/** Neighbour lookup: undefined means air or outside the plan. */
export type StateLookup = (position: Vec3) => BlockState | undefined;

const isAir = (s: BlockState | undefined): boolean => !s || /^minecraft:(air|cave_air|void_air)$/.test(namespacedId(s.id));
const id = (s: BlockState): string => namespacedId(s.id);
const prop = (s: BlockState, k: string): string | undefined => s.properties[k] ?? blockFacts(s.id)?.defaults[k];
/** Mod blocks are treated as full, sturdy blocks (the common case) – the result is marked as assumed by callers. */
function sturdy(s: BlockState | undefined, face: Dir): boolean {
  if (isAir(s)) return false;
  const f = stateFacts(s!);
  return f ? f.sturdy(face, 'full') : !blockFacts(s!.id);
}

/** Blocks that never connect by their solid side (FenceBlock/WallBlock/IronBarsBlock.isExceptionForConnection). */
export function isConnectionException(s: BlockState): boolean {
  const i = id(s);
  return hasClass(i, 'LeavesBlock') || inTag(i, 'shulker_boxes') || /^minecraft:(barrier|carved_pumpkin|jack_o_lantern|melon|pumpkin)$/.test(i);
}
const gateAligned = (n: BlockState, dir: Dir): boolean => hasClass(id(n), 'FenceGateBlock') && axisOf((prop(n, 'facing') ?? 'north') as Dir) === axisOf(CLOCKWISE[dir]!);

export type ConnectFamily = 'fence' | 'wall' | 'pane' | 'stairs' | 'gate' | 'snowy' | 'mushroom';
/** Which connection rule a block follows, or null. */
export function connectFamily(blockId: string): ConnectFamily | null {
  const i = namespacedId(blockId);
  if (hasClass(i, 'FenceBlock')) return 'fence';
  if (hasClass(i, 'WallBlock')) return 'wall';
  if (hasClass(i, 'IronBarsBlock')) return 'pane';
  if (hasClass(i, 'StairBlock')) return 'stairs';
  if (hasClass(i, 'FenceGateBlock')) return 'gate';
  if (hasClass(i, 'SnowyBlock')) return 'snowy';
  if (hasClass(i, 'HugeMushroomBlock')) return 'mushroom';
  return null;
}

/** Does a fence connect towards `dir` with neighbour `n`? */
export function fenceConnects(self: BlockState, n: BlockState | undefined, dir: Dir): boolean {
  if (isAir(n)) return false;
  const sameFence = inTag(id(n!), 'fences') && inTag(id(n!), 'wooden_fences') === inTag(id(self), 'wooden_fences');
  return (!isConnectionException(n!) && sturdy(n, OPPOSITE[dir])) || sameFence || gateAligned(n!, dir);
}
export function paneConnects(n: BlockState | undefined, dir: Dir): boolean {
  if (isAir(n)) return false;
  return (!isConnectionException(n!) && sturdy(n, OPPOSITE[dir])) || hasClass(id(n!), 'IronBarsBlock') || inTag(id(n!), 'walls');
}
export function wallConnects(n: BlockState | undefined, dir: Dir): boolean {
  if (isAir(n)) return false;
  return inTag(id(n!), 'walls') || (!isConnectionException(n!) && sturdy(n, OPPOSITE[dir])) || hasClass(id(n!), 'IronBarsBlock') || gateAligned(n!, dir);
}

function settleWall(state: BlockState, at: (d: Dir) => BlockState | undefined): BlockState {
  const above = at('up');
  const cover = above && !isAir(above) ? stateFacts(above)?.wallCover ?? null : null;
  const props: Record<string, string> = { ...state.properties };
  const side: Record<string, string> = {};
  for (const d of HORIZONTAL) {
    side[d] = wallConnects(at(d), d) ? (cover?.[d as 'north'] ? 'tall' : 'low') : 'none';
    props[d] = side[d]!;
  }
  props.up = String(raisePost(side, above, cover?.post ?? false));
  return { id: state.id, properties: props };
}
function raisePost(side: Readonly<Record<string, string>>, above: BlockState | undefined, coverPost: boolean): boolean {
  if (above && hasClass(id(above), 'WallBlock') && prop(above, 'up') === 'true') return true;
  const none = (d: string) => side[d] === 'none';
  if ((none('north') && none('south') && none('west') && none('east')) || none('north') !== none('south') || none('west') !== none('east')) return true;
  if ((side.north === 'tall' && side.south === 'tall') || (side.east === 'tall' && side.west === 'tall')) return false;
  return (!!above && inTag(id(above), 'wall_post_override')) || coverPost;
}

const isStairs = (s: BlockState | undefined): s is BlockState => !!s && hasClass(id(s), 'StairBlock');
function stairsShape(state: BlockState, lookup: StateLookup, position: Vec3): string {
  const facing = (prop(state, 'facing') ?? 'north') as Dir, half = prop(state, 'half');
  const canTakeShape = (face: Dir): boolean => {
    const n = lookup(step(position, face));
    return !isStairs(n) || prop(n, 'facing') !== facing || prop(n, 'half') !== half;
  };
  const front = lookup(step(position, facing));
  if (isStairs(front) && prop(front, 'half') === half) {
    const f2 = prop(front, 'facing') as Dir;
    if (axisOf(f2) !== axisOf(facing) && canTakeShape(OPPOSITE[f2])) return f2 === COUNTER_CLOCKWISE[facing] ? 'outer_left' : 'outer_right';
  }
  const back = lookup(step(position, OPPOSITE[facing]));
  if (isStairs(back) && prop(back, 'half') === half) {
    const f3 = prop(back, 'facing') as Dir;
    if (axisOf(f3) !== axisOf(facing) && canTakeShape(f3)) return f3 === COUNTER_CLOCKWISE[facing] ? 'inner_left' : 'inner_right';
  }
  return 'straight';
}

/**
 * The state the game produces for `state` at `position` from its neighbours, for blocks
 * whose connections are derived (see ConnectFamily). Other blocks are returned unchanged.
 * Neighbours are taken as they are (not settled themselves), exactly like updateShape.
 */
export function settleState(state: BlockState, position: Vec3, lookup: StateLookup): BlockState {
  const family = connectFamily(state.id);
  if (!family) return state;
  const at = (d: Dir) => lookup(step(position, d));
  const p: Record<string, string> = { ...state.properties };
  switch (family) {
    case 'fence': for (const d of HORIZONTAL) p[d] = String(fenceConnects(state, at(d), d)); break;
    case 'pane': for (const d of HORIZONTAL) p[d] = String(paneConnects(at(d), d)); break;
    case 'wall': return settleWall(state, at);
    case 'stairs': p.shape = stairsShape(state, lookup, position); break;
    case 'gate': {
      const facing = (prop(state, 'facing') ?? 'north') as Dir, side = CLOCKWISE[facing]!;
      const wall = (s: BlockState | undefined) => !!s && inTag(id(s), 'walls');
      p.in_wall = String(wall(at(side)) || wall(at(OPPOSITE[side])));
      break;
    }
    case 'snowy': { const a = at('up'); p.snowy = String(!!a && inTag(id(a), 'snow')); break; }
    case 'mushroom': for (const d of ['down', 'up', ...HORIZONTAL] as Dir[]) { const n = at(d); if (n && id(n) === id(state)) p[d] = 'false'; } break;
  }
  return { id: state.id, properties: p };
}
