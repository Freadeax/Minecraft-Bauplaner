import { paletteKeys } from '../../../voxel/src/validation.js';
import { blockFacts, stateFacts, step as stepDir, supportNeed, survives } from '../../../voxel/src/blocklogic/index.js';
import type { Dir } from '../../../voxel/src/blocklogic/index.js';
import type { BlockState, Bounds, Vec3, VoxelPayload } from '../../../voxel/src/types.js';
import { blockEntityContent, entityAnchor, entityItems, entityLabel, hasContent, sortedEntities } from '../../../voxel/src/entities.js';
import type { ItemStack } from '../../../voxel/src/entities.js';
import { cellIndexer, containerLabel } from '../materials/materials.js';
import { cellOwnersOf, positionKey } from '../core/compose.js';
import type { Resolution } from '../core/compose.js';
import { canonicalJson, QuickHasher, quickHash } from '../core/hash.js';
import type { Operation } from '../core/project.js';
import { DomainError } from '../core/types.js';
import type { Project, StepProgress } from '../core/types.js';

/**
 * Build guide (P3-02). Steps are derived from the resolved world only, so the
 * guide, materials and export share one geometry. A step is the cells of one
 * section (instance) in one Y layer and one build phase. Progress is manual
 * ("abgehakt") and bound to the geometry hash of the step at tick time; a
 * mismatch makes it "prüfbedürftig". Nothing here is measured in the game.
 */

/**
 * Build order inside a layer; liquids are placed after every solid step. Hanging blocks
 * (lanterns on chains, hanging signs, vines …) are held only from above, so their step
 * follows the layer above them (BLOCK-01).
 */
export type StepPhase = 'clear' | 'structure' | 'gravity' | 'attached' | 'hanging' | 'liquid' | 'furnish';
export const PHASE_ORDER: readonly StepPhase[] = ['clear', 'structure', 'gravity', 'attached', 'hanging', 'liquid', 'furnish'];
export const PHASE_LABEL: Readonly<Record<StepPhase, string>> = {
  clear: 'Freiräumen', structure: 'Grundblöcke', gravity: 'Schwerkraftblöcke', attached: 'Angebrachte Blöcke', hanging: 'Hängende Blöcke', liquid: 'Flüssigkeiten',
  furnish: 'Ausstattung',
};

/** One thing to put up or fill in the „Ausstattung“ step (ENTITY-01). */
export interface FurnishItem {
  /** 'entity': painting, frame, armor stand …; 'content': fill a container, write a sign, dye a banner. */
  readonly kind: 'entity' | 'content';
  readonly label: string;
  /** Anchor cell (entities) or block position (contents), world coordinates. */
  readonly position: Vec3;
  /** Item that places the entity; null for contents and mobs. */
  readonly placement: string | null;
  /** Items to put in, on or into it. */
  readonly items: readonly ItemStack[];
  /** Sign lines or banner patterns as text. */
  readonly text?: readonly string[];
}

export interface StepMaterial {
  readonly state: BlockState;
  /** stateKey of the placed state; item conversion belongs to the materials block. */
  readonly key: string;
  readonly count: number;
}

export interface GuideStep {
  /** Stable across moves: section (instance) id, layer index inside the instance and phase. */
  readonly id: string;
  /** 1-based position in the recommended order. */
  readonly order: number;
  readonly instanceId: string;
  readonly sectionName: string;
  readonly phase: StepPhase;
  /** World Y of this layer. */
  readonly y: number;
  /** Layer index relative to the instance's lowest transformed layer (0 = bottom). */
  readonly layer: number;
  /** Bounds of the cells in this step (world coordinates, maxExclusive). */
  readonly bounds: Bounds;
  /** Cells of this step, sorted by Z then X. */
  readonly positions: readonly Vec3[];
  readonly materials: readonly StepMaterial[];
  readonly blocks: number;
  /** Explicit air cells that must stay or become empty. */
  readonly air: number;
  /** Explicit delete cells (remove whatever is there). */
  readonly erase: number;
  readonly blockEntities: number;
  /** Cells whose voxel conflict is unresolved; the step shows only the preview choice. */
  readonly conflicts: number;
  /** Step ids that should be finished first. Always earlier in `order`, so the graph has no cycles. */
  readonly prerequisites: readonly string[];
  /** Change detector over phase, positions, states and block entity data (not an integrity proof). */
  readonly geometryHash: string;
  /** Visible check criterion for the builder. */
  readonly check: string;
  readonly notes: readonly string[];
  /** Only in „Ausstattung“ steps: entities to put up and contents to fill in. Such steps have no block positions. */
  readonly furnish?: readonly FurnishItem[];
}

export interface Guide {
  readonly steps: readonly GuideStep[];
  readonly byId: ReadonlyMap<string, GuideStep>;
  /** Copied from the resolution: building is possible, but the plan is not final while any remain. */
  readonly warnings: readonly string[];
  readonly totals: { readonly blocks: number; readonly air: number; readonly erase: number };
}

const GRAVITY = new Set(['sand', 'red_sand', 'gravel', 'suspicious_sand', 'suspicious_gravel', 'anvil', 'chipped_anvil', 'damaged_anvil', 'dragon_egg', 'pointed_dripstone', 'scaffolding']);
const LIQUID = new Set(['water', 'lava', 'bubble_column']);
const ATTACHED = new Set(['torch', 'wall_torch', 'soul_torch', 'soul_wall_torch', 'redstone_torch', 'redstone_wall_torch', 'ladder', 'lever', 'rail', 'powered_rail',
  'detector_rail', 'activator_rail', 'redstone_wire', 'repeater', 'comparator', 'tripwire_hook', 'tripwire', 'lantern', 'soul_lantern', 'vine', 'glow_lichen',
  'flower_pot', 'cocoa', 'snow', 'candle', 'sea_pickle', 'end_rod', 'chain', 'iron_chain', 'bell']);
const ATTACHED_SUFFIX = ['_button', '_pressure_plate', '_carpet', '_sign', '_banner', '_sapling', '_trapdoor', '_coral_fan', '_wall_fan', '_head', '_skull', '_candle', '_torch'];

/**
 * Vanilla build phase of a block state, from the game facts (BLOCK-01): liquids,
 * falling blocks (Fallable and holding alone: sand, suspicious sand, anvils …), blocks that need support (canSurvive fails alone:
 * torches, doors, carpets, plants, rails …) and the rest. Hanging blocks count as
 * attached here; the guide separates them by their actual support. Mod blocks stay
 * in the structure phase with a visible note.
 */
export function phaseOf(state: BlockState): Exclude<StepPhase, 'clear' | 'hanging' | 'furnish'> {
  const [ns, name = ''] = state.id.includes(':') ? state.id.split(':', 2) as [string, string] : ['minecraft', state.id];
  if (ns !== 'minecraft') return 'structure';
  if (LIQUID.has(name)) return 'liquid';
  const b = blockFacts(state.id), f = b && stateFacts(state);
  if (!b || !f) {
    // Ids outside the 26.3 facts (older names): previous name rules.
    if (GRAVITY.has(name) || name.endsWith('_concrete_powder')) return 'gravity';
    if (ATTACHED.has(name) || ATTACHED_SUFFIX.some(s => name.endsWith(s)) || name === 'moss_carpet') return 'attached';
    return 'structure';
  }
  if (b.classes.includes('LiquidBlock')) return 'liquid';
  if (b.falls && f.survivesAlone) return 'gravity';
  if (!f.survivesAlone) return 'attached';
  return 'structure';
}
/** Held only from above (lantern hanging=true, hanging signs, weeping vines …) by the game facts. */
export function hangsOnly(state: BlockState): boolean {
  const need = supportNeed(state);
  return need.kind === 'hang' || (need.kind === 'face' && need.dirs.length === 1 && need.dirs[0] === 'up');
}

interface Draft {
  instanceId: string; sectionName: string; instanceIndex: number; phase: StepPhase; y: number; layer: number;
  positions: Vec3[]; cells: number[]; states: Map<string, { state: BlockState; count: number }>; hash: QuickHasher; hashed: number;
  blocks: number; air: number; erase: number; blockEntities: number; conflicts: number; mods: Set<string>; waterlogged: number;
  /** Cells of attached/hanging/gravity blocks that do not hold in the plan (BLOCK-01). */
  loose: number; sortY: number;
}

const rank = (p: StepPhase): number => PHASE_ORDER.indexOf(p);
const draftKey = (instanceId: string, layer: number, phase: StepPhase): string => `${instanceId}~L${layer}~${phase}`;

/**
 * Derives ordered build steps from a resolution. Order: non-liquid steps by
 * (Y, phase, section order), then liquid steps by (Y, section order).
 * Prerequisites: steps directly below (support), earlier phases of the same
 * section and layer, the section's previous layer, horizontal neighbours for
 * attached blocks, and for liquids the section's topmost solid layer.
 */
/**
 * Cell index → one of few values (a step id, a block state). For boxes up to 32 million cells an Int32Array
 * instead of a Map with an entry per cell (SIZE-01: a million cells took seconds to insert).
 */
function denseMap<T>(volume: number): { get(i: number): T | undefined; set(i: number, v: T): void; has(i: number): boolean } {
  if (volume > 33_554_432) {
    const m = new Map<number, T>();
    return { get: i => m.get(i), set: (i, v) => { m.set(i, v); }, has: i => m.has(i) };
  }
  const slot = new Int32Array(volume), values: T[] = [], ids = new Map<T, number>();
  return {
    get: i => { const k = i < 0 ? 0 : slot[i]!; return k ? values[k - 1] : undefined; },
    set: (i, v) => { if (i < 0) return; let k = ids.get(v); if (k === undefined) { values.push(v); ids.set(v, k = values.length); } slot[i] = k; },
    has: i => i >= 0 && slot[i] !== 0,
  };
}

export function buildGuide(project: Pick<Project, 'instances'>, resolution: Resolution): Guide {
  const world = resolution.world;
  const warnings = [...resolution.exportBlockers.filter(b => b !== 'Projekt enthält keine Bauteile')];
  if (!world) return { steps: [], byId: new Map(), warnings, totals: { blocks: 0, air: 0, erase: 0 } };
  const instanceIndex = new Map(project.instances.map((inst, i) => [inst.id, i]));
  const baseY = new Map(resolution.placed.map(p => [p.instance.id, p.payload.bounds.min[1]]));

  const drafts = new Map<string, Draft>();
  // Numeric cell index inside the world bounds (−1 outside): far cheaper than string keys for large worlds.
  const { min: wMin, maxExclusive: wMax } = world.bounds;
  const sx = wMax[0] - wMin[0], sy = wMax[1] - wMin[1];
  const cellIndex = (x: number, y: number, z: number): number =>
    x < wMin[0] || y < wMin[1] || z < wMin[2] || x >= wMax[0] || y >= wMax[1] || z >= wMax[2] ? -1 : (x - wMin[0]) + sx * ((y - wMin[1]) + sy * (z - wMin[2]));
  const ix = (p: Vec3): number => cellIndex(p[0], p[1], p[2]);
  const conflictKeys = new Set(resolution.conflicts.map(c => ix(c.position)));
  const entities = new Map(world.blockEntities.map(e => [ix(e.position), e]));
  const ownerOf = cellOwnersOf(resolution);
  // Per palette entry once instead of per cell (SIZE-01: a million cells).
  const keyByPalette = paletteKeys(world.palette), jsonKeyByPalette = keyByPalette.map(k => JSON.stringify(k));
  const modByPalette = world.palette.map(st => !st.id.startsWith('minecraft:')), wetByPalette = world.palette.map(st => st.properties.waterlogged === 'true');
  const phaseByPalette: StepPhase[] = world.palette.map(st => { const p = phaseOf(st); return p === 'attached' && hangsOnly(st) ? 'hanging' : p; });
  const volume = sx * sy * (wMax[2] - wMin[2]);
  const cellStep = denseMap<string>(volume), worldState = denseMap<BlockState>(volume);
  const stateAt = (p: Vec3): BlockState | undefined => worldState.get(cellIndex(p[0], p[1], p[2]));
  for (const c of world.cells) if (c.kind === 'block') worldState.set(cellIndex(c.position[0], c.position[1], c.position[2]), world.palette[c.paletteIndex]!);
  let last: Draft | undefined, lastId = '';

  for (let ci = 0; ci < world.cells.length; ci++) {
    const cell = world.cells[ci]!, owner = ownerOf(ci, cell), key = ix(cell.position);
    if (owner === undefined || !instanceIndex.has(owner)) throw new DomainError('GUIDE', `Zelle ${positionKey(cell.position)} hat keine Instanz`);
    const state = cell.kind === 'erase' ? null : world.palette[cell.paletteIndex]!;
    const phase: StepPhase = cell.kind === 'block' ? phaseByPalette[cell.paletteIndex]! : 'clear';
    const y = cell.position[1], layer = y - (baseY.get(owner) ?? y);
    // Cells come sorted by Y, so consecutive cells usually belong to the same step.
    const id = last && last.instanceId === owner && last.layer === layer && last.phase === phase ? lastId : draftKey(owner, layer, phase);
    let d = id === lastId ? last : drafts.get(id);
    if (!d) {
      const inst = project.instances[instanceIndex.get(owner)!]!;
      d = { instanceId: owner, sectionName: inst.name, instanceIndex: instanceIndex.get(owner)!, phase, y, layer, positions: [], cells: [], states: new Map(), hash: new QuickHasher().add(`[${JSON.stringify(phase)},[`), hashed: 0,
        blocks: 0, air: 0, erase: 0, blockEntities: 0, conflicts: 0, mods: new Set(), waterlogged: 0, loose: 0, sortY: y };
      drafts.set(id, d);
    }
    last = d; lastId = id;
    d.positions.push(cell.position); d.cells.push(ci); cellStep.set(key, id);
    if (conflictKeys.has(key)) d.conflicts++;
    const entity = entities.get(key);
    if (cell.kind === 'erase') d.erase++;
    else if (cell.kind === 'air') d.air++;
    else {
      d.blocks++;
      const sk = keyByPalette[cell.paletteIndex]!, m = d.states.get(sk);
      if (m) m.count++; else d.states.set(sk, { state: state!, count: 1 });
      if (modByPalette[cell.paletteIndex]) d.mods.add(state!.id);
      if (wetByPalette[cell.paletteIndex]) d.waterlogged++;
      if (entity) d.blockEntities++;
    }
    // Same text as canonicalJson([x, y, z, kind, stateKey | null, entityData | null]), built directly: this runs per world cell.
    const [x, y0, z] = cell.position;
    d.hash.add(`${d.hashed++ ? ',' : ''}[${x},${y0},${z},${JSON.stringify(cell.kind)},${cell.kind !== 'erase' ? jsonKeyByPalette[cell.paletteIndex] : 'null'},${entity ? canonicalJson(entity.data) : 'null'}]`);
  }

  // Hanging steps follow the layer that holds them: the top of their hanging chain + 1, and
  // a hanging layer never comes before the hanging layer above it (top-down).
  const hangingAt = (x: number, y: number, z: number): boolean => { const id = cellStep.get(cellIndex(x, y, z)); return !!id && drafts.get(id)!.phase === 'hanging'; };
  const bySection = new Map<string, Draft[]>();
  for (const d of drafts.values()) if (d.phase === 'hanging') (bySection.get(d.instanceId) ?? bySection.set(d.instanceId, []).get(d.instanceId)!).push(d);
  for (const list of bySection.values()) {
    list.sort((a, b) => b.y - a.y);
    let above = -Infinity;
    for (const d of list) {
      let top = d.y;
      for (const [x, y, z] of d.positions) { let t = y; while (hangingAt(x, t + 1, z)) t++; top = Math.max(top, t); }
      d.sortY = Math.max(top + 1, above);
      above = d.sortY;
    }
  }
  const sorted = [...drafts.entries()].sort(([, a], [, b]) => {
    const la = a.phase === 'liquid' ? 1 : 0, lb = b.phase === 'liquid' ? 1 : 0;
    return la - lb || a.sortY - b.sortY || rank(a.phase) - rank(b.phase) || b.y - a.y || a.instanceIndex - b.instanceIndex;
  });
  const order = new Map(sorted.map(([id], i) => [id, i + 1]));
  // Per section: ordered list of layers with solid (non-liquid, non-clear) steps.
  const sectionLayers = new Map<string, Map<number, string[]>>();
  for (const [id, d] of sorted) if (d.phase !== 'liquid' && d.phase !== 'clear' && d.phase !== 'hanging') {
    const layers = sectionLayers.get(d.instanceId) ?? new Map<number, string[]>(); sectionLayers.set(d.instanceId, layers);
    (layers.get(d.layer) ?? (layers.set(d.layer, []), layers.get(d.layer)!)).push(id);
  }
  const solidAt = (id: string | undefined): boolean => !!id && !['clear', 'liquid', 'hanging'].includes(drafts.get(id)!.phase);

  const steps: GuideStep[] = [];
  for (const [id, d] of sorted) {
    const pre = new Set<string>();
    const layers = sectionLayers.get(d.instanceId);
    const lowerLayers = layers ? [...layers.keys()].filter(l => l < d.layer) : [];
    if (lowerLayers.length) for (const s of layers!.get(Math.max(...lowerLayers))!) pre.add(s);
    for (const p of PHASE_ORDER.slice(0, rank(d.phase))) { const same = draftKey(d.instanceId, d.layer, p); if (drafts.has(same) && p !== 'liquid') pre.add(same); }
    for (const [x, y, z] of d.positions) {
      const below = cellStep.get(cellIndex(x, y - 1, z));
      if (d.phase !== 'clear' && d.phase !== 'hanging' && solidAt(below)) pre.add(below!);
      if (d.phase === 'attached' || d.phase === 'hanging' || d.phase === 'gravity') {
        // The cells that actually hold this block in the game (BLOCK-01).
        const st = stateAt([x, y, z]);
        if (st) {
          const r = survives(st, [x, y, z], stateAt);
          if (!r.survives && d.phase !== 'gravity') d.loose++;
          for (const dir of r.heldBy as Dir[]) { const [hx, hy, hz] = stepDir([x, y, z], dir); const h = cellStep.get(cellIndex(hx, hy, hz)); if (h && h !== id && order.get(h)! < order.get(id)!) pre.add(h); }
          if (d.phase === 'gravity') { const b = stateAt([x, y - 1, z]); if (!b && cellStep.has(cellIndex(x, y - 1, z))) d.loose++; }
        }
      }
      if (d.phase === 'attached' || d.phase === 'liquid') for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const n = cellStep.get(cellIndex(x + dx, y, z + dz));
        if (n && ['structure', 'gravity'].includes(drafts.get(n)!.phase)) pre.add(n);
      }
    }
    if (d.phase === 'liquid') {
      if (layers?.size) for (const s of layers.get(Math.max(...layers.keys()))!) pre.add(s);
      const lowerLiquid = sorted.filter(([, o]) => o.phase === 'liquid' && o.instanceId === d.instanceId && o.layer < d.layer).at(-1);
      if (lowerLiquid) pre.add(lowerLiquid[0]);
    }
    pre.delete(id);
    const prerequisites = [...pre].sort((a, b) => order.get(a)! - order.get(b)!);
    if (prerequisites.some(p => order.get(p)! >= order.get(id)!)) throw new DomainError('GUIDE', `Schritt ${id} hätte eine zyklische Voraussetzung`);

    // Sorted as world cell indices (stable, same order as sorting the positions) so the transport needs no lookup.
    const wc = world.cells, cellOrder = d.cells.slice().sort((a, b) => { const p = wc[a]!.position, q = wc[b]!.position; return p[2] - q[2] || p[0] - q[0]; });
    const positions = cellOrder.map(i => wc[i]!.position);
    const min: [number, number, number] = [Infinity, d.y, Infinity], max: [number, number, number] = [-Infinity, d.y + 1, -Infinity];
    for (const [x, , z] of positions) { min[0] = Math.min(min[0], x); min[2] = Math.min(min[2], z); max[0] = Math.max(max[0], x + 1); max[2] = Math.max(max[2], z + 1); }
    const materials = [...d.states.entries()].map(([key, m]) => ({ state: m.state, key, count: m.count }))
      .sort((a, b) => b.count - a.count || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    const area = `X ${min[0]}…${max[0] - 1}, Z ${min[2]}…${max[2] - 1}`;
    const check = d.phase === 'clear'
      ? `Schicht Y ${d.y}, ${area}: ${d.air + d.erase} Zellen sind leer${d.erase ? ` (${d.erase} ausdrücklich abbauen)` : ''}.`
      : `Schicht Y ${d.y}, ${area}: genau ${d.blocks} Blöcke in ${materials.length} Zuständen gesetzt, Ausrichtung laut Liste.`;
    const notes: string[] = [];
    if (d.conflicts) notes.push(`${d.conflicts} Zellen mit ungeklärtem Voxelkonflikt – nur Vorschauwahl, vor dem Bauen im Editor klären.`);
    if (d.phase === 'gravity') notes.push('Fällt ohne Stütze: erst bauen, wenn die Zelle darunter belegt ist.');
    if (d.phase === 'attached') notes.push('Braucht einen tragenden Nachbarblock: erst nach den Grundblöcken dieser Schicht setzen.');
    if (d.phase === 'hanging') notes.push('Hängt an dem Block darüber: erst setzen, wenn die Schicht darüber steht; von oben nach unten arbeiten.');
    if (d.loose) notes.push(d.phase === 'gravity' ? `${d.loose} Blöcke stehen über einer freien Zelle und fallen herunter – darunter zuerst stützen.` : `${d.loose} Blöcke haben im Plan keinen Halt und brechen im Spiel ab (Platzierprüfung).`);
    if (d.phase === 'liquid') notes.push('Flüssigkeiten zuletzt, wenn die Umrandung steht; Quellblöcke einzeln setzen.');
    if (d.waterlogged) notes.push(`${d.waterlogged} Blöcke sind wassergeflutet (waterlogged=true): nach dem Setzen Wasser einfüllen.`);
    if (d.blockEntities) notes.push(`${d.blockEntities} Blöcke mit Inhalt/NBT (z. B. Truhen, Schilder): Inhalt wird beim Bauen von Hand nicht übernommen.`);
    if (d.mods.size) notes.push(`Mod-Blöcke ohne bekannte Bauregel: ${[...d.mods].sort().join(', ')}.`);
    steps.push({
      id, order: order.get(id)!, instanceId: d.instanceId, sectionName: d.sectionName, phase: d.phase, y: d.y, layer: d.layer,
      bounds: { min, maxExclusive: max }, positions, materials, blocks: d.blocks, air: d.air, erase: d.erase, blockEntities: d.blockEntities,
      conflicts: d.conflicts, prerequisites, geometryHash: d.hash.add(']]').digest(), check, notes,
    });
    stepCells.set(steps[steps.length - 1]!, { world, cells: Int32Array.from(cellOrder) });
  }
  steps.push(...furnishSteps(project, resolution, steps, sectionLayers));
  const totals = steps.reduce((t, s) => ({ blocks: t.blocks + s.blocks, air: t.air + s.air, erase: t.erase + s.erase }), { blocks: 0, air: 0, erase: 0 });
  return { steps, byId: new Map(steps.map(s => [s.id, s])), warnings, totals };
}

const stepCells = new WeakMap<GuideStep, { readonly world: VoxelPayload; readonly cells: Int32Array }>();
/**
 * Indices into `world.cells` of a step's positions, in `positions` order – only for steps that `buildGuide`
 * made from exactly this world in this thread (PERF-02); otherwise undefined and callers look the cells up.
 */
export function stepCellIndices(step: GuideStep, world: VoxelPayload): Int32Array | undefined {
  const known = stepCells.get(step);
  return known && known.world === world ? known.cells : undefined;
}

/**
 * „Ausstattung“ per section, after all its blocks: free entities (paintings, frames, armor stands) and block
 * entities with content (containers, signs, banners). Prerequisites: the section's topmost solid layer and
 * every step holding a cell next to an entity. No block positions, so scans and layer views ignore it.
 */
function furnishSteps(project: Pick<Project, 'instances'>, resolution: Resolution, built: readonly GuideStep[], sectionLayers: ReadonlyMap<string, ReadonlyMap<number, string[]>>): GuideStep[] {
  const world = resolution.world!;
  // Built only when a section has something to furnish (SIZE-01: a million positions otherwise).
  let steps: Map<number | string, GuideStep> | null = null;
  const index = cellIndexer(world);
  const stepAt = { get: (p: Vec3): GuideStep | undefined => {
    if (!steps) { steps = new Map(); for (const st of built) for (const q of st.positions) steps.set(index(q), st); }
    return steps.get(index(p));
  } };
  // Owner of each block entity's cell, worked out once from the world order instead of a positionKey lookup per
  // instance and block entity (which would also build the whole owner map, see OwnerIndex).
  const ownerOf = cellOwnersOf(resolution);
  let beOwners: (string | undefined)[] | null = null;
  const blockEntityOwner = (k: number): string | undefined => {
    if (!beOwners) {
      const at = new Map<number | string, number[]>();
      world.blockEntities.forEach((be, j) => { const key = index(be.position), list = at.get(key); if (list) list.push(j); else at.set(key, [j]); });
      beOwners = new Array<string | undefined>(world.blockEntities.length);
      if (at.size) world.cells.forEach((c, i) => { const list = at.get(index(c.position)); if (list) for (const j of list) beOwners![j] = ownerOf(i, c); });
    }
    return beOwners[k];
  };
  const out: GuideStep[] = [];
  let order = built.length;
  project.instances.forEach(inst => {
    const placed = resolution.placed.find(p => p.instance.id === inst.id);
    if (!placed) return;
    const furnish: FurnishItem[] = [];
    const pre = new Set<string>();
    for (const e of sortedEntities(placed.payload.entities ?? [])) {
      const r = entityItems(e), a = entityAnchor(e);
      furnish.push({ kind: 'entity', label: entityLabel(e), position: a, placement: r.placement, items: r.contents });
      for (const [dx, dy, dz] of [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const) {
        const st = stepAt.get([a[0] + dx, a[1] + dy, a[2] + dz]);
        if (st && st.instanceId === inst.id && st.phase !== 'clear') pre.add(st.id);
      }
    }
    for (let k = 0; k < world.blockEntities.length; k++) {
      const be = world.blockEntities[k]!;
      if (blockEntityOwner(k) !== inst.id) continue;
      const c = blockEntityContent(be.data);
      if (!hasContent(c)) continue;
      const text = [...(c.sign ? [...c.sign.front, ...c.sign.back].filter(l => l.trim()) : []), ...(c.patterns ?? []).map(p => `${p.color} ${p.pattern}`)];
      const what = c.sign ? 'Schild beschriften' : c.patterns?.length ? 'Banner gestalten' : `${containerLabel(c.id)} füllen`;
      furnish.push({ kind: 'content', label: `${what}${c.name ? ` „${c.name}“` : ''}`, position: be.position, placement: null, items: c.items, ...(text.length && { text }) });
      const st = stepAt.get(be.position); if (st) pre.add(st.id);
    }
    if (!furnish.length) return;
    const layers = sectionLayers.get(inst.id);
    if (layers?.size) for (const id of layers.get(Math.max(...layers.keys()))!) pre.add(id);
    const id = `${inst.id}~furnish`;
    const ys = furnish.map(f => f.position[1]);
    const min: [number, number, number] = [Infinity, Infinity, Infinity], max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
    for (const f of furnish) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i]!, f.position[i]!); max[i] = Math.max(max[i]!, f.position[i]! + 1); }
    const entities = furnish.filter(f => f.kind === 'entity').length, contents = furnish.length - entities;
    const notes: string[] = [];
    if (entities) notes.push('Gemälde und Rahmen hängen an der Wand hinter ihrer Zelle; Rüstungsständer stehen auf dem Block darunter. Erst aufstellen, wenn diese Blöcke stehen.');
    if (furnish.some(f => f.kind === 'entity' && !f.placement)) notes.push('Lebewesen ohne Bauitem: per Spawnei, Zucht oder Befehl.');
    if (contents) notes.push('Inhalte (Truhen, Schilder, Banner) überträgt keine Bauhilfe automatisch; von Hand einräumen bzw. beschriften.');
    out.push({
      id, order: ++order, instanceId: inst.id, sectionName: inst.name, phase: 'furnish', y: Math.min(...ys), layer: Math.min(...ys) - placed.payload.bounds.min[1],
      bounds: { min, maxExclusive: max }, positions: [], materials: [], blocks: 0, air: 0, erase: 0, blockEntities: contents, conflicts: 0,
      prerequisites: [...pre].sort((a, b) => built.find(s => s.id === a)!.order - built.find(s => s.id === b)!.order),
      geometryHash: quickHash(canonicalJson(['furnish', (placed.payload.entities ?? []).map(e => [e.position, e.data]), furnish.map(f => [f.kind, f.position, f.label, f.items, f.text ?? null])])),
      check: `${entities ? `${entities} Ausstattungsstücke aufgestellt` : ''}${entities && contents ? ', ' : ''}${contents ? `${contents} Inhalte eingeräumt/beschriftet` : ''} – laut Liste.`,
      notes, furnish,
    });
  });
  return out;
}

/** open: not ticked · done: ticked, geometry unchanged · review: ticked, geometry changed since. */
export type StepStatus = 'open' | 'done' | 'review';

export interface GuideProgress {
  readonly status: ReadonlyMap<string, StepStatus>;
  readonly done: number;
  readonly review: number;
  readonly open: number;
  /** Ticked blocks (done only) relative to all blocks of the guide. */
  readonly blocksDone: number;
  /** Open steps whose prerequisites are all done (not review): what to build next. */
  readonly ready: readonly string[];
  /** Progress entries without a step in the current guide (section removed or layer gone). */
  readonly orphaned: readonly string[];
}

export function evaluateProgress(guide: Guide, progress: Readonly<Record<string, StepProgress>>): GuideProgress {
  const status = new Map<string, StepStatus>();
  let done = 0, review = 0, blocksDone = 0;
  for (const s of guide.steps) {
    const p = progress[s.id];
    const st: StepStatus = !p ? 'open' : p.geometryHash === s.geometryHash ? 'done' : 'review';
    status.set(s.id, st);
    if (st === 'done') { done++; blocksDone += s.blocks; } else if (st === 'review') review++;
  }
  const ready = guide.steps.filter(s => status.get(s.id) === 'open' && s.prerequisites.every(p => status.get(p) === 'done')).map(s => s.id);
  const orphaned = Object.keys(progress).filter(id => !guide.byId.has(id)).sort();
  return { status, done, review, open: guide.steps.length - done - review, blocksDone, ready, orphaned };
}

/** Manual tick (or re-confirmation after review) bound to the current geometry. */
export function tickStep(step: GuideStep, at = new Date().toISOString()): Operation {
  return { kind: 'progress.set', stepId: step.id, progress: { status: 'done', geometryHash: step.geometryHash, at } };
}

export function untickStep(stepId: string): Operation {
  return { kind: 'progress.set', stepId, progress: null };
}

/** One undoable batch; null when nothing would change. */
export function tickSteps(steps: readonly GuideStep[], label: string, at = new Date().toISOString()): Operation | null {
  return steps.length ? { kind: 'batch', label, operations: steps.map(s => tickStep(s, at)) } : null;
}

export function untickSteps(stepIds: readonly string[], label: string): Operation | null {
  return stepIds.length ? { kind: 'batch', label, operations: stepIds.map(untickStep) } : null;
}

/** Throws when prerequisites reference unknown steps or form a cycle (defensive check for stored or merged guides). */
export function assertGuideAcyclic(guide: Guide): void {
  const state = new Map<string, 1 | 2>();
  const visit = (id: string, path: string[]): void => {
    const s = state.get(id);
    if (s === 2) return;
    if (s === 1) throw new DomainError('GUIDE', `Zyklus in den Voraussetzungen: ${[...path, id].join(' → ')}`);
    const step = guide.byId.get(id);
    if (!step) throw new DomainError('GUIDE', `Unbekannter Schritt ${id}`);
    state.set(id, 1);
    for (const p of step.prerequisites) visit(p, [...path, id]);
    state.set(id, 2);
  };
  for (const s of guide.steps) visit(s.id, []);
}
