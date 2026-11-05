import type { Vec3, VoxelPayload } from '../../../voxel/src/types.js';
import { transformDirection } from '../../../voxel/src/states.js';
import type { Direction } from '../../../voxel/src/states.js';

/**
 * Entrance of a building (TERRAIN-01, "Türen zum Weg"): the outer side of the
 * footprint on which the main door lies. Doors are found in the version's own
 * blocks (lower door half; without doors fence gates), so the result follows
 * the real geometry instead of a curated flag.
 *
 * Rule, in this order:
 *  1. only the lowest storey with a door counts (balcony and upper doors are ignored),
 *  2. the door closest to the footprint edge is the entrance; its side is that edge,
 *  3. ties between sides stay open and are resolved by the caller (fewest turns).
 *
 * The door's `facing` property is not used: its meaning differs between door
 * placements in the catalog, while the nearest edge is unambiguous.
 */

export type Side = 'north' | 'east' | 'south' | 'west';
export const SIDE_LABEL: Readonly<Record<Side, string>> = { north: 'Norden', east: 'Osten', south: 'Süden', west: 'Westen' };

export interface Entrance {
  /** Candidate sides (more than one when doors are equally close to two edges). */
  readonly sides: readonly Side[];
  /** Door cell (payload coordinates) of the first candidate. */
  readonly door: Vec3;
  readonly kind: 'door' | 'gate';
  /** Blocks between the door and the footprint edge. */
  readonly depth: number;
}

const SIDES: readonly Side[] = ['north', 'south', 'west', 'east'];
const cache = new WeakMap<VoxelPayload, Entrance | null>();

/** Entrance of a payload in its own (untransformed) coordinates; null without doors or gates. */
export function entranceOf(payload: VoxelPayload): Entrance | null {
  const hit = cache.get(payload);
  if (hit !== undefined) return hit;
  const found = find(payload, id => id.endsWith('_door'), 'door') ?? find(payload, id => id.endsWith('_fence_gate'), 'gate');
  cache.set(payload, found);
  return found;
}

function find(payload: VoxelPayload, match: (id: string) => boolean, kind: Entrance['kind']): Entrance | null {
  const b = payload.bounds;
  const doors: Vec3[] = [];
  for (const c of payload.cells) {
    if (c.kind !== 'block') continue;
    const s = payload.palette[c.paletteIndex]!;
    if (!match(s.id) || s.properties.half === 'upper') continue;
    doors.push(c.position);
  }
  if (!doors.length) return null;
  const lowest = Math.min(...doors.map(d => d[1]));
  // Doors of the lowest storey: a door two blocks higher is already another floor.
  const ground = doors.filter(d => d[1] <= lowest + 1);
  let best = Infinity;
  const hits: { side: Side; door: Vec3 }[] = [];
  for (const d of ground) {
    const dist: Record<Side, number> = { north: d[2] - b.min[2], south: b.maxExclusive[2] - 1 - d[2], west: d[0] - b.min[0], east: b.maxExclusive[0] - 1 - d[0] };
    for (const side of SIDES) {
      if (dist[side] < best) { best = dist[side]; hits.length = 0; }
      if (dist[side] === best) hits.push({ side, door: d });
    }
  }
  const sides = SIDES.filter(s => hits.some(h => h.side === s));
  return { sides, door: hits[0]!.door, kind, depth: best };
}

/** Side after a placement turn (no mirror). */
export function turnedSide(side: Side, turns: 0 | 1 | 2 | 3): Side {
  return transformDirection(side as Direction, { position: [0, 0, 0], quarterTurns: turns, mirrorX: false }) as Side;
}

/** Turn preference when several turns fit: none, a quarter either way, then half. */
const TURN_ORDER: readonly (0 | 1 | 2 | 3)[] = [0, 1, 3, 2];

/**
 * Quarter turns that make the entrance face `want`; among equally close doors
 * the one needing the smallest turn wins. Null without an entrance.
 */
export function turnsToFace(entrance: Entrance | null, want: Side): 0 | 1 | 2 | 3 | null {
  if (!entrance) return null;
  for (const t of TURN_ORDER) if (entrance.sides.some(s => turnedSide(s, t) === want)) return t;
  return null;
}

/** Whether the entrance faces `want` after `turns`. */
export function facesSide(entrance: Entrance | null, turns: 0 | 1 | 2 | 3, want: Side): boolean | null {
  if (!entrance) return null;
  return entrance.sides.some(s => turnedSide(s, turns) === want);
}
