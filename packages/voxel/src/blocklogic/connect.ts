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

export type ConnectFamily = 'fence' | 'wall' | 'pane' | 'stairs' | 'gate' | 'snowy' | 'mushroom' | 'chest' | 'path' | 'wire';
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
  if (hasClass(i, 'ChestBlock')) return 'chest';
  if (i === 'minecraft:redstone_wire') return 'wire';
  if (hasClass(i, 'PathBlock') || hasClass(i, 'FarmlandBlock')) return 'path';
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

/** Blocks that send a redstone signal (isSignalSource): redstone dust connects to them from every side. */
const SIGNAL_SOURCE = /^minecraft:(lever|[a-z_]*_button|redstone_(wall_)?torch|redstone_block|comparator|daylight_detector|detector_rail|[a-z_]*_pressure_plate|tripwire_hook|trapped_chest|target|lectern|lightning_rod|[a-z_]*sculk_sensor|jukebox|creaking_heart)$/;
const conductor = (s: BlockState | undefined): boolean => !isAir(s) && !!stateFacts(s!)?.occludes;
/** RedStoneWireBlock.shouldConnectTo. */
function dustConnectsTo(n: BlockState | undefined, dir: Dir | null): boolean {
  if (isAir(n)) return false;
  const i = id(n!), facing = prop(n!, 'facing') as Dir | undefined;
  if (i === 'minecraft:redstone_wire') return true;
  if (i === 'minecraft:repeater') return dir !== null && (facing === dir || facing === OPPOSITE[dir]);
  if (i === 'minecraft:observer') return dir === facing;
  return dir !== null && SIGNAL_SOURCE.test(i);
}
/** RedStoneWireBlock.getConnectingSide for one horizontal side. */
function dustSide(position: Vec3, dir: Dir, lookup: StateLookup): 'up' | 'side' | 'none' {
  const np = step(position, dir), n = lookup(np);
  if (!conductor(lookup(step(position, 'up')))) {
    const canHold = !isAir(n) && (sturdy(n, 'up') || id(n!) === 'minecraft:hopper');
    if (canHold && dustConnectsTo(lookup(step(np, 'up')), null)) return sturdy(n, OPPOSITE[dir]) ? 'up' : 'side';
  }
  return !dustConnectsTo(n, dir) && (conductor(n) || !dustConnectsTo(lookup(step(np, 'down')), null)) ? 'none' : 'side';
}
/** RedStoneWireBlock.getConnectionState: connections from the neighbours; a single line continues straight, nothing connected = cross. */
function settleWire(state: BlockState, position: Vec3, lookup: StateLookup): BlockState {
  const p: Record<string, string> = { ...state.properties };
  const wasDot = HORIZONTAL.every(d => (state.properties[d] ?? 'none') === 'none');
  for (const d of HORIZONTAL) p[d] = dustSide(position, d, lookup);
  const on = (d: Dir) => p[d] !== 'none';
  if (wasDot && HORIZONTAL.every(d => !on(d))) return { id: state.id, properties: p };
  const noNS = !on('north') && !on('south'), noEW = !on('east') && !on('west');
  if (!on('west') && noNS) p.west = 'side';
  if (!on('east') && noNS) p.east = 'side';
  if (!on('north') && noEW) p.north = 'side';
  if (!on('south') && noEW) p.south = 'side';
  return { id: state.id, properties: p };
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
    case 'wire': return settleWire(state, position, lookup);
    case 'chest': {
      // ChestBlock.updateShape: a half of a double chest whose other half is not a chest of the same
      // kind becomes single; a single chest joins a neighbour half that points at it (same facing).
      const facing = (prop(state, 'facing') ?? 'north') as Dir, type = prop(state, 'type') ?? 'single';
      const towards = (s: BlockState): Dir | null => {
        const t = prop(s, 'type'), f = (prop(s, 'facing') ?? 'north') as Dir;
        return t === 'left' ? CLOCKWISE[f]! : t === 'right' ? COUNTER_CLOCKWISE[f]! : null;
      };
      if (type === 'single') {
        for (const d of HORIZONTAL) {
          const n = at(d);
          if (n && id(n) === id(state) && prop(n, 'type') !== 'single' && prop(n, 'facing') === facing && towards(n) === OPPOSITE[d]) {
            p.type = prop(n, 'type') === 'left' ? 'right' : 'left';
            break;
          }
        }
      } else {
        const d = towards(state)!, n = at(d);
        if (!n || id(n) !== id(state)) p.type = 'single';
      }
      break;
    }
    case 'path': {
      // Dirt path and farmland turn into dirt under a solid block (fence gates excepted).
      const a = at('up');
      if (a && !isAir(a) && stateFacts(a)?.solid && !hasClass(id(a), 'FenceGateBlock')) return { id: 'minecraft:dirt', properties: {} };
      return state;
    }
    case 'mushroom': for (const d of ['down', 'up', ...HORIZONTAL] as Dir[]) { const n = at(d); if (n && id(n) === id(state)) p[d] = 'false'; } break;
  }
  return { id: state.id, properties: p };
}
