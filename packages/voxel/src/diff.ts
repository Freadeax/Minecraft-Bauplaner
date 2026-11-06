import { connectFamily } from './blocklogic/connect.js';
import type { ConnectFamily } from './blocklogic/connect.js';
import { blockEntityContent, blockEntityTile } from './entities.js';
import type { BlockState, Cell, NbtTag, Vec3, VoxelPayload } from './types.js';
import { createPayload, stateKey, validatePayload } from './validation.js';

/**
 * Cell-by-cell comparison of two structures (Bauversionen B12, DIFF-01). Both payloads are
 * aligned at their bounds minimum; on top of that the comparison looks for one shift of the
 * whole of B that explains the change better (DIFF-01-S02): a building that was only moved
 * then shows „verschoben um …“ and no changed cells, while real geometry changes stay changes.
 * A cell is occupied when it holds a selected block that is not air; explicit air, erase and
 * unselected cells are empty. Changes are classified as added, removed, material (other block
 * id), state (same id, other properties, e.g. a rotated stair) or content (same state, other
 * block entity data such as chest items or sign text, DIFF-01-S03). The comparison is exact
 * and deterministic: no tolerance, no mesh, the inputs are never changed.
 */
export type DiffKind = 'same' | 'added' | 'removed' | 'material' | 'state' | 'content';
export interface DiffCell {
  /** Position in the comparison frame: A aligned at its minimum, B moved back by `shift`, both normalised to ≥ 0. */
  readonly position: Vec3;
  readonly kind: DiffKind;
  readonly before: BlockState | null;
  readonly after: BlockState | null;
  /** state: the property keys that differ. */
  readonly changedProperties?: readonly string[];
  /** state: every differing property follows from the neighbours (connections, stair corners) – the game sets it itself. */
  readonly derived?: boolean;
  /** content: what differs in the block entity (Inhalt, Schild, Banner, Name, Daten). */
  readonly contentChanges?: readonly string[];
}
export interface BlockDelta { readonly id: string; readonly before: number; readonly after: number }
export interface DiffShift {
  /** Offset of B against A after minimum alignment (B's cell at p is compared with A's cell at p + offset). [0,0,0] = no shift. */
  readonly offset: Vec3;
  /** True when the shift was applied; false when detection was switched off or found nothing better. */
  readonly applied: boolean;
  /** Changed cells the plain minimum alignment would report (only when a shift was applied). */
  readonly changedWithout: number;
  /** True when B is A moved by `offset` and nothing else changed. */
  readonly pure: boolean;
}
export interface DiffFollowUps {
  /** State changes that only follow from neighbours (fence/wall/pane connections, stair shapes, gates in walls, snowy, mushroom faces). */
  readonly derivedStates: number;
  /** Cells with content changes, per what changed. */
  readonly content: Readonly<Record<string, number>>;
  /** Relative Y layers (comparison frame) that hold added, removed, material, real state or content changes: the build steps of these layers need a look. */
  readonly layers: readonly number[];
}
export interface PayloadDiff {
  /** Extent of the union of both aligned payloads. */
  readonly size: Vec3;
  readonly counts: Readonly<Record<DiffKind, number>>;
  /** Number of occupied cells in A and B. */
  readonly blocksBefore: number;
  readonly blocksAfter: number;
  /** Every occupied cell of A or B, sorted y, z, x. */
  readonly cells: readonly DiffCell[];
  /** Block counts by id (properties ignored), largest absolute change first; unchanged ids omitted. */
  readonly blocks: readonly BlockDelta[];
  readonly shift: DiffShift;
  readonly followUps: DiffFollowUps;
}
export interface DiffOptions {
  /** 'auto' (default) looks for a whole-structure shift; 'fixed' keeps the plain minimum alignment. */
  readonly align?: 'auto' | 'fixed';
}

const EMPTY_IDS = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
/** True for cells that hold a visible block. */
export function isOccupied(payload: Pick<VoxelPayload, 'palette'>, cell: Cell): boolean {
  return cell.kind === 'block' && !EMPTY_IDS.has(payload.palette[cell.paletteIndex]?.id ?? 'minecraft:air');
}

// Packed position keys: relative coordinates stay within ±8192 (4096 per axis is the payload limit).
const R = 16384, H = 8192;
const pack = (x: number, y: number, z: number): number => ((x + H) * R + (y + H)) * R + (z + H);

interface Side {
  readonly pos: Int32Array; // x, y, z per occupied cell, relative to the bounds minimum
  readonly key: Int32Array; // global state key id per occupied cell
  readonly state: BlockState[];
  readonly at: Map<number, number>; // packed position → cell index
  readonly nbt: Map<number, NbtTag>; // packed position → block entity data
  readonly min: Vec3;
  readonly max: Vec3; // occupied extent (inclusive), [0,0,0]/[-1,-1,-1] when empty
}

function side(payload: VoxelPayload, keyIds: Map<string, number>): Side {
  const [mx, my, mz] = payload.bounds.min;
  const paletteKey = payload.palette.map(s => {
    const k = stateKey(s); let id = keyIds.get(k);
    if (id === undefined) { id = keyIds.size; keyIds.set(k, id); }
    return id;
  });
  const pos: number[] = [], key: number[] = [], state: BlockState[] = [];
  const at = new Map<number, number>();
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const c of payload.cells) {
    if (c.kind !== 'block' || !isOccupied(payload, c)) continue;
    const x = c.position[0] - mx, y = c.position[1] - my, z = c.position[2] - mz;
    const p = pack(x, y, z);
    const existing = at.get(p);
    const i = existing ?? state.length;
    if (existing === undefined) { pos.push(x, y, z); at.set(p, i); state.push(payload.palette[c.paletteIndex]!); key.push(paletteKey[c.paletteIndex]!); }
    else { state[i] = payload.palette[c.paletteIndex]!; key[i] = paletteKey[c.paletteIndex]!; }
    const v = [x, y, z];
    for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k]!, v[k]!); hi[k] = Math.max(hi[k]!, v[k]!); }
  }
  const nbt = new Map<number, NbtTag>();
  for (const e of payload.blockEntities) nbt.set(pack(e.position[0] - mx, e.position[1] - my, e.position[2] - mz), e.data);
  const empty = state.length === 0;
  return { pos: Int32Array.from(pos), key: Int32Array.from(key), state, at, nbt,
    min: (empty ? [0, 0, 0] : lo) as unknown as Vec3, max: (empty ? [-1, -1, -1] : hi) as unknown as Vec3 };
}

// ---------------------------------------------------------------------------
// Shift detection (DIFF-01-S02)

/** Score of an offset: cells occupied on both sides plus cells with the same state (a material swap keeps the geometry score). */
function score(a: Side, b: Side, o: Vec3): number {
  let s = 0;
  for (let i = 0; i < b.key.length; i++) {
    const j = a.at.get(pack(b.pos[3 * i]! + o[0], b.pos[3 * i + 1]! + o[1], b.pos[3 * i + 2]! + o[2]));
    if (j !== undefined) s += a.key[j] === b.key[i] ? 2 : 1;
  }
  return s;
}

const MIN_CELLS_FOR_SHIFT = 8;
/** Pairs of rare states that vote for offsets (bounded so 4 million cells stay cheap). */
const MAX_VOTES = 4096;

function candidates(a: Side, b: Side): Vec3[] {
  const out: Vec3[] = [];
  const seen = new Set<string>();
  const add = (o: Vec3) => { const k = o.join(','); if (!seen.has(k) && o.every(v => Math.abs(v) < H / 2)) { seen.add(k); out.push(o); } };
  // Occupied extents aligned per axis at their low or high side (8 combinations).
  for (let m = 0; m < 8; m++) add([0, 1, 2].map(k => (m >> k) & 1 ? a.max[k]! - b.max[k]! : a.min[k]! - b.min[k]!) as unknown as Vec3);
  // Votes from rare states: a state that occurs few times on both sides pins the offset.
  const where = (s: Side) => {
    const m = new Map<number, number[]>();
    for (let i = 0; i < s.key.length; i++) { const l = m.get(s.key[i]!); if (l) { if (l.length <= 8) l.push(i); } else m.set(s.key[i]!, [i]); }
    return m;
  };
  const wa = where(a), wb = where(b);
  const rare = [...wa].filter(([k, l]) => l.length <= 8 && (wb.get(k)?.length ?? 9) <= 8)
    .map(([k, l]) => ({ k, la: l, lb: wb.get(k)! })).sort((p, q) => p.la.length * p.lb.length - q.la.length * q.lb.length || p.k - q.k);
  const votes = new Map<string, { o: Vec3; n: number }>();
  let cast = 0;
  for (const r of rare) {
    for (const i of r.la) for (const j of r.lb) {
      const o: Vec3 = [a.pos[3 * i]! - b.pos[3 * j]!, a.pos[3 * i + 1]! - b.pos[3 * j + 1]!, a.pos[3 * i + 2]! - b.pos[3 * j + 2]!];
      const k = o.join(','), v = votes.get(k);
      if (v) v.n++; else votes.set(k, { o, n: 1 });
      cast++;
    }
    if (cast >= MAX_VOTES) break;
  }
  const top = [...votes.values()].sort((p, q) => q.n - p.n || (p.o.join(',') < q.o.join(',') ? -1 : 1)).slice(0, 4);
  for (const t of top) add(t.o);
  return out;
}

function detectShift(a: Side, b: Side): { offset: Vec3; better: boolean } {
  const zero: Vec3 = [0, 0, 0];
  const smaller = Math.min(a.key.length, b.key.length);
  if (smaller < MIN_CELLS_FOR_SHIFT) return { offset: zero, better: false };
  const base = score(a, b, zero);
  if (base === 2 * smaller) return { offset: zero, better: false }; // already everything matches
  let best = zero, bestScore = base;
  const list = candidates(a, b);
  for (const o of a.key.length + b.key.length > 1_000_000 ? list.slice(0, 4).concat(list.slice(-4)) : list) {
    if (o[0] === 0 && o[1] === 0 && o[2] === 0) continue;
    const s = score(a, b, o);
    if (s > bestScore) { best = o; bestScore = s; }
  }
  // A shift must explain clearly more than the plain alignment (at least 5 % of the smaller side).
  const better = bestScore >= base + Math.max(2, Math.ceil(0.05 * 2 * smaller));
  return { offset: better ? best : zero, better };
}

// ---------------------------------------------------------------------------
// Block entity content (DIFF-01-S03)

/** Fields that only say where the entry is: they move with a shift and are not content. */
const OWN_POSITION = new Set(['x', 'y', 'z', 'Pos', 'keepPacked']);
function canonical(t: NbtTag): string {
  switch (t.type) {
    case 'compound': return `{${Object.keys(t.value).sort().map(k => `${JSON.stringify(k)}:${canonical(t.value[k]!)}`).join(',')}}`;
    case 'list': return `[${t.elementType};${t.value.map(canonical).join(',')}]`;
    default: return `${t.type}:${JSON.stringify(t.value)}`;
  }
}
function tileKey(data: NbtTag | undefined): string {
  if (!data) return '';
  const tile = blockEntityTile(data);
  const kept: Record<string, NbtTag> = {};
  // Empty compounds/lists are the game's defaults (26.3 saves `components: {}` with every block entity, see the export
  // check in the real game): absent and empty mean the same.
  const empty = (t: NbtTag) => (t.type === 'compound' && Object.keys(t.value).length === 0) || (t.type === 'list' && t.value.length === 0);
  for (const k of Object.keys(tile)) if (!OWN_POSITION.has(k) && !empty(tile[k]!)) kept[k] = tile[k]!;
  return Object.keys(kept).length === 0 || (Object.keys(kept).length === 1 && kept.id) ? '' : canonical({ type: 'compound', value: kept });
}
function contentChanges(x: NbtTag | undefined, y: NbtTag | undefined): string[] {
  const empty = { id: '', items: [] };
  const p = x ? blockEntityContent(x) : empty, q = y ? blockEntityContent(y) : empty;
  const out: string[] = [];
  const items = (c: typeof p) => JSON.stringify([...c.items].map(i => [String(i.slot ?? ''), i.id, i.count]).sort());
  if (items(p) !== items(q)) out.push('Inhalt');
  if (JSON.stringify(('sign' in p && p.sign) || null) !== JSON.stringify(('sign' in q && q.sign) || null)) out.push('Schild');
  if (JSON.stringify(('patterns' in p && p.patterns) || null) !== JSON.stringify(('patterns' in q && q.patterns) || null)) out.push('Banner');
  if ((('name' in p && p.name) || '') !== (('name' in q && q.name) || '')) out.push('Name');
  return out.length ? out : ['Daten'];
}

// ---------------------------------------------------------------------------
// State changes that follow from neighbours

const DERIVED: Readonly<Record<ConnectFamily, ReadonlySet<string>>> = {
  fence: new Set(['north', 'east', 'south', 'west']),
  pane: new Set(['north', 'east', 'south', 'west']),
  wall: new Set(['north', 'east', 'south', 'west', 'up']),
  stairs: new Set(['shape']),
  gate: new Set(['in_wall']),
  snowy: new Set(['snowy']),
  mushroom: new Set(['down', 'up', 'north', 'east', 'south', 'west']),
  chest: new Set(['type']),
  path: new Set(),
  wire: new Set(['north', 'east', 'south', 'west']),
};
function changedProperties(p: BlockState, q: BlockState): string[] {
  const keys = new Set([...Object.keys(p.properties), ...Object.keys(q.properties)]);
  return [...keys].filter(k => p.properties[k] !== q.properties[k]).sort();
}

// ---------------------------------------------------------------------------

export function diffPayloads(a: VoxelPayload, b: VoxelPayload, options: DiffOptions = {}): PayloadDiff {
  validatePayload(a); validatePayload(b);
  const keyIds = new Map<string, number>();
  const A = side(a, keyIds), B = side(b, keyIds);
  const detected = options.align === 'fixed' ? { offset: [0, 0, 0] as Vec3, better: false } : detectShift(A, B);
  const o = detected.offset;
  // Comparison frame: A as is, B moved by o; normalised to ≥ 0 over both sides and both bounds.
  const sizeA = [0, 1, 2].map(i => a.bounds.maxExclusive[i]! - a.bounds.min[i]!), sizeB = [0, 1, 2].map(i => b.bounds.maxExclusive[i]! - b.bounds.min[i]!);
  const lo = [0, 1, 2].map(i => Math.min(0, o[i]!)), hi = [0, 1, 2].map(i => Math.max(sizeA[i]!, sizeB[i]! + o[i]!));
  const rel = (x: number, y: number, z: number): Vec3 => [x - lo[0]!, y - lo[1]!, z - lo[2]!];

  const counts: Record<DiffKind, number> = { same: 0, added: 0, removed: 0, material: 0, state: 0, content: 0 };
  const cells: DiffCell[] = [];
  const byId = new Map<string, { before: number; after: number }>();
  const tally = (id: string, s: 'before' | 'after') => { const t = byId.get(id) ?? { before: 0, after: 0 }; t[s]++; byId.set(id, t); };
  const content: Record<string, number> = {};
  const layers = new Set<number>();
  let derivedStates = 0;
  const matchedB = new Uint8Array(B.key.length);
  for (let i = 0; i < A.key.length; i++) {
    const x = A.pos[3 * i]!, y = A.pos[3 * i + 1]!, z = A.pos[3 * i + 2]!;
    const before = A.state[i]!;
    tally(before.id, 'before');
    const pa = pack(x, y, z), pb = pack(x - o[0], y - o[1], z - o[2]);
    const j = B.at.get(pb);
    const position = rel(x, y, z);
    if (j === undefined) { counts.removed++; layers.add(position[1]); cells.push({ position, kind: 'removed', before, after: null }); continue; }
    matchedB[j] = 1;
    const after = B.state[j]!;
    if (before.id !== after.id) { counts.material++; layers.add(position[1]); cells.push({ position, kind: 'material', before, after }); continue; }
    if (A.key[i] !== B.key[j]) {
      const changed = changedProperties(before, after);
      const family = connectFamily(before.id);
      const derived = !!family && changed.every(k => DERIVED[family].has(k));
      counts.state++;
      if (derived) derivedStates++; else layers.add(position[1]);
      cells.push({ position, kind: 'state', before, after, changedProperties: changed, derived });
      continue;
    }
    const na = A.nbt.get(pa), nb = B.nbt.get(pb);
    if ((na || nb) && tileKey(na) !== tileKey(nb)) {
      const what = contentChanges(na, nb);
      for (const w of what) content[w] = (content[w] ?? 0) + 1;
      counts.content++; layers.add(position[1]);
      cells.push({ position, kind: 'content', before, after, contentChanges: what });
      continue;
    }
    counts.same++;
    cells.push({ position, kind: 'same', before, after });
  }
  for (let j = 0; j < B.key.length; j++) {
    const after = B.state[j]!;
    tally(after.id, 'after');
    if (matchedB[j]) continue;
    const position = rel(B.pos[3 * j]! + o[0], B.pos[3 * j + 1]! + o[1], B.pos[3 * j + 2]! + o[2]);
    counts.added++; layers.add(position[1]);
    cells.push({ position, kind: 'added', before: null, after });
  }
  cells.sort((p, q) => p.position[1] - q.position[1] || p.position[2] - q.position[2] || p.position[0] - q.position[0]);
  const size = [0, 1, 2].map(i => hi[i]! - lo[i]!) as unknown as Vec3;
  const blocks = [...byId].filter(([, t]) => t.before !== t.after).map(([id, t]) => ({ id, ...t }))
    .sort((p, q) => Math.abs(q.after - q.before) - Math.abs(p.after - p.before) || (p.id < q.id ? -1 : p.id > q.id ? 1 : 0));
  const changed = counts.added + counts.removed + counts.material + counts.state + counts.content;
  let changedWithout = 0;
  if (detected.better) {
    const plain = diffPayloads(a, b, { align: 'fixed' }).counts;
    changedWithout = plain.added + plain.removed + plain.material + plain.state + plain.content;
  }
  return {
    size, counts, blocksBefore: A.key.length, blocksAfter: B.key.length, cells, blocks,
    shift: { offset: o, applied: detected.better, changedWithout, pure: detected.better && changed === 0 },
    followUps: { derivedStates, content, layers: [...layers].sort((p, q) => p - q) },
  };
}

/** Number of cells that differ in a diff (every kind except 'same'). */
export const changedCells = (d: Pick<PayloadDiff, 'counts'>): number => d.counts.added + d.counts.removed + d.counts.material + d.counts.state + d.counts.content;

/**
 * The union of a diff as one payload for previews: B's state where it exists,
 * otherwise A's (removed cells). `kinds[i]` is the change kind of `cells[i]`.
 */
export function diffAsPayload(diff: PayloadDiff, profileId: string): { payload: VoxelPayload; kinds: readonly DiffKind[] } {
  const palette: BlockState[] = [], index = new Map<string, number>();
  const cells: Cell[] = [], kinds: DiffKind[] = [];
  for (const c of diff.cells) {
    const state = c.after ?? c.before!;
    const key = stateKey(state);
    let i = index.get(key);
    if (i === undefined) { i = palette.length; palette.push(state); index.set(key, i); }
    cells.push({ position: c.position, kind: 'block', paletteIndex: i });
    kinds.push(c.kind);
  }
  const max: Vec3 = [Math.max(1, diff.size[0]), Math.max(1, diff.size[1]), Math.max(1, diff.size[2])];
  const payload = createPayload({ schemaVersion: 1, profileId, bounds: { min: [0, 0, 0], maxExclusive: max }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0],
    palette, cells, blockEntities: [] });
  return { payload, kinds };
}
