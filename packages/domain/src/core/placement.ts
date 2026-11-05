import { adoptPayload, stateKey } from '../../../voxel/src/validation.js';
import type { BlockState, Cell, VoxelPayload, Vec3 } from '../../../voxel/src/types.js';
import {
  BLOCK_FACTS_PROFILE, HORIZONTAL, blockFacts, completeState, connectFamily, falls, hasClass, isFactBlock, settleState, stateFacts, step, supportNeed, survives,
} from '../../../voxel/src/blocklogic/index.js';
import type { Dir, StateLookup, SupportNeed } from '../../../voxel/src/blocklogic/index.js';

/**
 * Platzierprüfung (BLOCK-01): reads a plan the way the game will treat it.
 *  - Verbindungen: fences, walls, panes, stairs corners … get the state the game derives.
 *  - Halt: blocks that break without their support (torches, doors, plants, lanterns …).
 *  - Schwerkraft: sand, gravel, concrete powder, anvils fall into free cells.
 *  - Paare: doors, beds and double plants need both halves.
 *  - Hilfsmittel: water/lava buckets for sources and waterlogged blocks.
 * Cells missing from the selection are "Umgebung": they may hold a block in the real
 * world, so a missing support there is reported separately, never as an error.
 */

export type PlacementKind = 'connection' | 'unsupported' | 'falls' | 'half' | 'invalid-state';
export const PLACEMENT_LABEL: Readonly<Record<PlacementKind, string>> = {
  connection: 'Verbindung anders als im Spiel', unsupported: 'Ohne Halt – bricht ab', falls: 'Fällt herunter', half: 'Zweite Hälfte fehlt', 'invalid-state': 'Ungültiger Zustand',
};

export interface PlacementIssue {
  readonly kind: PlacementKind;
  readonly position: Vec3;
  readonly state: BlockState;
  /** For connection issues: the state the game will show. */
  readonly expected?: BlockState;
  readonly note: string;
}
export interface PlacementAid { readonly itemId: string; readonly count: number; readonly reason: string }
export interface PlacementReport {
  readonly profile: string;
  /** Block cells looked at. */
  readonly blocks: number;
  readonly issues: readonly PlacementIssue[];
  /** Issues per kind (not truncated). */
  readonly counts: Readonly<Record<PlacementKind, number>>;
  /** Issues beyond `maxIssues` that are only counted. */
  readonly truncated: number;
  /** Blocks whose support lies outside the selection (Umgebung) – fine if the world holds them. */
  readonly dependsOnSurroundings: number;
  /** Mod/unknown blocks without game facts (not checked). */
  readonly unknownBlocks: number;
  readonly aids: readonly PlacementAid[];
}

/** Cell index of a payload: block state, 'air' for air/erase, undefined outside the selection. */
export function payloadLookup(payload: VoxelPayload): { readonly state: StateLookup; readonly selected: (p: Vec3) => boolean; readonly cell: (p: Vec3) => Cell | undefined } {
  const { min, maxExclusive: max } = payload.bounds;
  const sx = max[0] - min[0], sy = max[1] - min[1];
  const index = new Map<number, Cell>();
  const at = (x: number, y: number, z: number): number => (x - min[0]) + sx * ((y - min[1]) + sy * (z - min[2]));
  const inside = ([x, y, z]: Vec3) => x >= min[0] && y >= min[1] && z >= min[2] && x < max[0] && y < max[1] && z < max[2];
  for (const c of payload.cells) index.set(at(c.position[0], c.position[1], c.position[2]), c);
  const cell = (p: Vec3): Cell | undefined => inside(p) ? index.get(at(p[0], p[1], p[2])) : undefined;
  return {
    cell,
    selected: p => !!cell(p),
    state: p => { const c = cell(p); return c && c.kind === 'block' ? payload.palette[c.paletteIndex] : undefined; },
  };
}

const HALF_PARTNER = (s: BlockState): Dir | null => {
  const id = s.id;
  if (hasClass(id, 'DoorBlock') || hasClass(id, 'DoublePlantBlock') || hasClass(id, 'TallSeagrassBlock')) return s.properties.half === 'upper' ? 'down' : s.properties.half === 'lower' ? 'up' : null;
  if (hasClass(id, 'BedBlock')) {
    const f = s.properties.facing as Dir | undefined;
    if (!f || !HORIZONTAL.includes(f)) return null;
    return s.properties.part === 'foot' ? f : ({ north: 'south', south: 'north', east: 'west', west: 'east' } as Record<string, Dir>)[f]!;
  }
  return null;
};

/** Words for what a block needs, for notes. */
export function needText(need: SupportNeed): string {
  const where: Readonly<Record<Dir, string>> = { down: 'darunter', up: 'darüber', north: 'im Norden', south: 'im Süden', west: 'im Westen', east: 'im Osten' };
  switch (need.kind) {
    case 'none': return 'hält allein';
    case 'face': return `braucht einen tragenden Block ${need.dirs.map(d => where[d]).join(' oder ')}`;
    case 'ground': return `braucht Boden aus ${need.rule.tag ? `#${need.rule.tag}` : need.rule.ids.join(', ')}${need.rule.self ? ' oder denselben Block' : ''}${need.water ? ' mit Wasser daneben' : ''}`;
    case 'hang': return `hängt an ${need.rule.tag ? `#${need.rule.tag}` : need.rule.ids.join(', ')}${need.rule.self ? ' oder demselben Block' : ''}`;
    default: return 'Halt unbekannt';
  }
}

export interface PlacementOptions {
  readonly maxIssues?: number;
  /**
   * The plan owns its space (catalogue buildings, generators): empty cells at or above
   * the base layer are air, not Umgebung. Only the ground below the base stays open.
   */
  readonly ownSpace?: boolean;
}

export function checkPlacement(payload: VoxelPayload, options: PlacementOptions = {}): PlacementReport {
  const max = options.maxIssues ?? 400;
  const look = payloadLookup(payload);
  const baseY = payload.bounds.min[1];
  const selected = options.ownSpace ? (p: Vec3): boolean => p[1] >= baseY : look.selected;
  const issues: PlacementIssue[] = [];
  const counts: Record<PlacementKind, number> = { connection: 0, unsupported: 0, falls: 0, half: 0, 'invalid-state': 0 };
  let blocks = 0, surroundings = 0, unknown = 0, truncated = 0, water = 0, lava = 0, waterlogged = 0;
  const push = (i: PlacementIssue) => { counts[i.kind]++; if (issues.length < max) issues.push(i); else truncated++; };
  for (const c of payload.cells) {
    if (c.kind !== 'block') continue;
    const state = payload.palette[c.paletteIndex]!, p = c.position;
    blocks++;
    if (!isFactBlock(state.id)) { unknown++; continue; }
    if (!completeState(state)) { push({ kind: 'invalid-state', position: p, state, note: 'Property-Wert gibt es in 26.3 nicht – das Spiel setzt den Standardwert.' }); continue; }
    const f = stateFacts(state)!;
    if (state.id === 'minecraft:water') { if (state.properties.level === undefined || state.properties.level === '0') water++; }
    else if (state.id === 'minecraft:lava') { if (state.properties.level === undefined || state.properties.level === '0') lava++; }
    else if (state.properties.waterlogged === 'true') waterlogged++;
    if (connectFamily(state.id)) {
      const settled = settleState(state, p, look.state);
      if (changedKeys(state, settled).length) {
        push({ kind: 'connection', position: p, state, expected: settled, note: connectionNote(state, settled) });
      }
    }
    if (falls(state, p, look.state)) {
      const below = step(p, 'down');
      if (selected(below)) push({ kind: 'falls', position: p, state, note: 'Darunter ist frei: fällt beim Setzen herunter. Einen Block darunter planen oder ein nicht fallendes Material nehmen.' });
      else surroundings++;
    }
    if (!f.survivesAlone) {
      const r = survives(state, p, look.state);
      if (!r.survives) {
        const need = supportNeed(state);
        const dirs: Dir[] = need.kind === 'face' ? [...need.dirs] : need.kind === 'hang' ? ['up'] : ['down'];
        if (dirs.some(d => !selected(step(p, d)))) surroundings++;
        else push({ kind: 'unsupported', position: p, state, note: `Bricht im Spiel ab: ${needText(need)}.` });
      }
    }
    const partner = HALF_PARTNER(state);
    if (partner) {
      const q = step(p, partner), other = look.state(q);
      if (!other || other.id !== state.id) {
        if (selected(q)) push({ kind: 'half', position: p, state, note: hasClass(state.id, 'BedBlock') ? 'Bett ohne zweites Teil – das Spiel setzt beide Teile zusammen.' : 'Zweiteiliger Block ohne zweite Hälfte – im Spiel entstehen immer beide.' });
        else surroundings++;
      }
    }
  }
  const aids: PlacementAid[] = [];
  if (water) aids.push({ itemId: 'minecraft:water_bucket', count: water, reason: `${water} Wasserquellen (jede Quelle einzeln, zwei Eimer erzeugen eine unendliche Quelle)` });
  if (waterlogged) aids.push({ itemId: 'minecraft:water_bucket', count: waterlogged, reason: `${waterlogged} wassergeflutete Blöcke (waterlogged=true): nach dem Setzen Wasser hineingießen` });
  if (lava) aids.push({ itemId: 'minecraft:lava_bucket', count: lava, reason: `${lava} Lavaquellen` });
  return { profile: BLOCK_FACTS_PROFILE, blocks, issues, counts, truncated, dependsOnSurroundings: surroundings, unknownBlocks: unknown, aids };
}

/** Properties the settled state sets differently (missing planned values count as the game default). */
export function changedKeys(from: BlockState, to: BlockState): string[] {
  const d = blockFacts(from.id)?.defaults ?? {};
  return Object.keys(to.properties).filter(k => (from.properties[k] ?? d[k]) !== to.properties[k]);
}
function connectionNote(from: BlockState, to: BlockState): string {
  const diff = changedKeys(from, to);
  return `Im Spiel: ${diff.map(k => `${k}=${to.properties[k]}`).join(', ')} (geplant: ${diff.map(k => `${k}=${from.properties[k] ?? blockFacts(from.id)?.defaults[k]}`).join(', ')}).`;
}

export interface SettleResult {
  readonly payload: VoxelPayload;
  /** Cells whose state changed to the game-derived one. */
  readonly changed: number;
  readonly samples: readonly { readonly position: Vec3; readonly from: BlockState; readonly to: BlockState }[];
}

/**
 * Applies the game's connection rules to every connecting block: stairs first (their
 * shape changes the faces fences see), then walls top-down (a wall's post depends on
 * the wall above), then fences, panes, gates and the rest. Geometry is not changed;
 * returns the same payload object when nothing changes.
 */
export function settlePayload(payload: VoxelPayload): SettleResult {
  const look = payloadLookup(payload);
  const current = new Map<string, BlockState>();
  const key = (p: Vec3) => `${p[0]},${p[1]},${p[2]}`;
  const lookup: StateLookup = p => current.get(key(p)) ?? look.state(p);
  const order = (s: BlockState): number => { const f = connectFamily(s.id); return f === 'stairs' ? 0 : f === 'wall' ? 1 : f ? 2 : 3; };
  const cells = payload.cells.filter(c => c.kind === 'block' && connectFamily(payload.palette[c.paletteIndex]!.id))
    .sort((a, b) => order(payload.palette[(a as { paletteIndex: number }).paletteIndex]!) - order(payload.palette[(b as { paletteIndex: number }).paletteIndex]!) || b.position[1] - a.position[1]);
  const samples: { position: Vec3; from: BlockState; to: BlockState }[] = [];
  for (const c of cells) {
    if (c.kind !== 'block') continue;
    const from = payload.palette[c.paletteIndex]!;
    const to = settleState(from, c.position, lookup);
    if (changedKeys(from, to).length) { current.set(key(c.position), to); if (samples.length < 50) samples.push({ position: c.position, from, to }); }
  }
  if (!current.size) return { payload, changed: 0, samples };
  const palette = [...payload.palette], byKey = new Map(palette.map((s, i) => [stateKey(s), i]));
  const newCells = payload.cells.map(c => {
    const s = c.kind === 'block' ? current.get(key(c.position)) : undefined;
    if (!s) return c;
    const k = stateKey(s);
    let i = byKey.get(k);
    if (i === undefined) { i = palette.length; palette.push(s); byKey.set(k, i); }
    return { position: c.position, kind: 'block' as const, paletteIndex: i };
  });
  // Drop palette entries that are no longer used, keep the order of the rest.
  const used = new Set(newCells.flatMap(c => c.kind === 'erase' ? [] : [c.paletteIndex]));
  const remap = new Map<number, number>(), finalPalette: BlockState[] = [];
  palette.forEach((s, i) => { if (used.has(i)) { remap.set(i, finalPalette.length); finalPalette.push(s); } });
  const cellsOut = newCells.map(c => c.kind === 'erase' ? c : { ...c, paletteIndex: remap.get(c.paletteIndex)! });
  return { payload: adoptPayload({ ...payload, palette: finalPalette, cells: cellsOut }), changed: current.size, samples };
}
