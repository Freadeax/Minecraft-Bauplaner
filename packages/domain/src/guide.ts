import { stateKey } from '../../voxel/src/validation.js';
import type { BlockState, Bounds, Vec3 } from '../../voxel/src/types.js';
import { positionKey } from './compose.js';
import type { Resolution } from './compose.js';
import { canonicalJson, quickHash } from './hash.js';
import type { Operation } from './project.js';
import { DomainError } from './types.js';
import type { Project, StepProgress } from './types.js';

/**
 * Build guide (P3-02). Steps are derived from the resolved world only, so the
 * guide, materials and export share one geometry. A step is the cells of one
 * section (instance) in one Y layer and one build phase. Progress is manual
 * ("abgehakt") and bound to the geometry hash of the step at tick time; a
 * mismatch makes it "prüfbedürftig". Nothing here is measured in the game.
 */

/** Build order inside a layer; liquids are placed after every solid step. */
export type StepPhase = 'clear' | 'structure' | 'gravity' | 'attached' | 'liquid';
export const PHASE_ORDER: readonly StepPhase[] = ['clear', 'structure', 'gravity', 'attached', 'liquid'];
export const PHASE_LABEL: Readonly<Record<StepPhase, string>> = {
  clear: 'Freiräumen', structure: 'Grundblöcke', gravity: 'Schwerkraftblöcke', attached: 'Angebrachte Blöcke', liquid: 'Flüssigkeiten',
};

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
  'flower_pot', 'cocoa', 'snow', 'candle', 'sea_pickle', 'end_rod', 'chain', 'bell']);
const ATTACHED_SUFFIX = ['_button', '_pressure_plate', '_carpet', '_sign', '_banner', '_sapling', '_trapdoor', '_coral_fan', '_wall_fan', '_head', '_skull', '_candle', '_torch'];

/** Vanilla build phase of a block state. Mod blocks stay in the structure phase with a visible note. */
export function phaseOf(state: BlockState): Exclude<StepPhase, 'clear'> {
  const [ns, name = ''] = state.id.includes(':') ? state.id.split(':', 2) as [string, string] : ['minecraft', state.id];
  if (ns !== 'minecraft') return 'structure';
  if (LIQUID.has(name)) return 'liquid';
  if (GRAVITY.has(name) || name.endsWith('_concrete_powder')) return 'gravity';
  if (ATTACHED.has(name) || ATTACHED_SUFFIX.some(s => name.endsWith(s)) || name === 'moss_carpet') return 'attached';
  return 'structure';
}

interface Draft {
  instanceId: string; sectionName: string; instanceIndex: number; phase: StepPhase; y: number; layer: number;
  positions: Vec3[]; states: Map<string, { state: BlockState; count: number }>; hashCells: string[];
  blocks: number; air: number; erase: number; blockEntities: number; conflicts: number; mods: Set<string>; waterlogged: number;
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
export function buildGuide(project: Pick<Project, 'instances'>, resolution: Resolution): Guide {
  const world = resolution.world;
  const warnings = [...resolution.exportBlockers.filter(b => b !== 'Projekt enthält keine Bauteile')];
  if (!world) return { steps: [], byId: new Map(), warnings, totals: { blocks: 0, air: 0, erase: 0 } };
  const instanceIndex = new Map(project.instances.map((inst, i) => [inst.id, i]));
  const baseY = new Map(resolution.placed.map(p => [p.instance.id, p.payload.bounds.min[1]]));
  const conflictKeys = new Set(resolution.conflicts.map(c => positionKey(c.position)));
  const entities = new Map(world.blockEntities.map(e => [positionKey(e.position), e]));
  const drafts = new Map<string, Draft>(), cellStep = new Map<number, string>();
  // Numeric cell index inside the world bounds (−1 outside): far cheaper than string keys for large worlds.
  const { min: wMin, maxExclusive: wMax } = world.bounds;
  const sx = wMax[0] - wMin[0], sy = wMax[1] - wMin[1];
  const cellIndex = (x: number, y: number, z: number): number =>
    x < wMin[0] || y < wMin[1] || z < wMin[2] || x >= wMax[0] || y >= wMax[1] || z >= wMax[2] ? -1 : (x - wMin[0]) + sx * ((y - wMin[1]) + sy * (z - wMin[2]));
  const phaseByPalette = world.palette.map(phaseOf);
  let last: Draft | undefined, lastId = '';

  for (const cell of world.cells) {
    const key = positionKey(cell.position), owner = resolution.owners.get(key)?.[0];
    if (owner === undefined || !instanceIndex.has(owner)) throw new DomainError('GUIDE', `Zelle ${key} hat keine Instanz`);
    const state = cell.kind === 'erase' ? null : world.palette[cell.paletteIndex]!;
    const phase: StepPhase = cell.kind === 'block' ? phaseByPalette[cell.paletteIndex]! : 'clear';
    const y = cell.position[1], layer = y - (baseY.get(owner) ?? y);
    // Cells come sorted by Y, so consecutive cells usually belong to the same step.
    const id = last && last.instanceId === owner && last.layer === layer && last.phase === phase ? lastId : draftKey(owner, layer, phase);
    let d = id === lastId ? last : drafts.get(id);
    if (!d) {
      const inst = project.instances[instanceIndex.get(owner)!]!;
      d = { instanceId: owner, sectionName: inst.name, instanceIndex: instanceIndex.get(owner)!, phase, y, layer, positions: [], states: new Map(), hashCells: [],
        blocks: 0, air: 0, erase: 0, blockEntities: 0, conflicts: 0, mods: new Set(), waterlogged: 0 };
      drafts.set(id, d);
    }
    last = d; lastId = id;
    d.positions.push(cell.position); cellStep.set(cellIndex(cell.position[0], cell.position[1], cell.position[2]), id);
    if (conflictKeys.has(key)) d.conflicts++;
    const entity = entities.get(key);
    if (cell.kind === 'erase') d.erase++;
    else if (cell.kind === 'air') d.air++;
    else {
      d.blocks++;
      const sk = stateKey(state!), m = d.states.get(sk);
      if (m) m.count++; else d.states.set(sk, { state: state!, count: 1 });
      if (!state!.id.startsWith('minecraft:')) d.mods.add(state!.id);
      if (state!.properties.waterlogged === 'true') d.waterlogged++;
      if (entity) d.blockEntities++;
    }
    // Same text as canonicalJson([x, y, z, kind, stateKey | null, entityData | null]), built directly: this runs per world cell.
    const [x, y0, z] = cell.position;
    d.hashCells.push(`[${x},${y0},${z},${JSON.stringify(cell.kind)},${state ? JSON.stringify(stateKey(state)) : 'null'},${entity ? canonicalJson(entity.data) : 'null'}]`);
  }

  const sorted = [...drafts.entries()].sort(([, a], [, b]) => {
    const la = a.phase === 'liquid' ? 1 : 0, lb = b.phase === 'liquid' ? 1 : 0;
    return la - lb || a.y - b.y || rank(a.phase) - rank(b.phase) || a.instanceIndex - b.instanceIndex;
  });
  const order = new Map(sorted.map(([id], i) => [id, i + 1]));
  // Per section: ordered list of layers with solid (non-liquid, non-clear) steps.
  const sectionLayers = new Map<string, Map<number, string[]>>();
  for (const [id, d] of sorted) if (d.phase !== 'liquid' && d.phase !== 'clear') {
    const layers = sectionLayers.get(d.instanceId) ?? new Map<number, string[]>(); sectionLayers.set(d.instanceId, layers);
    (layers.get(d.layer) ?? (layers.set(d.layer, []), layers.get(d.layer)!)).push(id);
  }
  const solidAt = (id: string | undefined): boolean => !!id && !['clear', 'liquid'].includes(drafts.get(id)!.phase);

  const steps: GuideStep[] = [];
  for (const [id, d] of sorted) {
    const pre = new Set<string>();
    const layers = sectionLayers.get(d.instanceId);
    const lowerLayers = layers ? [...layers.keys()].filter(l => l < d.layer) : [];
    if (lowerLayers.length) for (const s of layers!.get(Math.max(...lowerLayers))!) pre.add(s);
    for (const p of PHASE_ORDER.slice(0, rank(d.phase))) { const same = draftKey(d.instanceId, d.layer, p); if (drafts.has(same) && p !== 'liquid') pre.add(same); }
    for (const [x, y, z] of d.positions) {
      const below = cellStep.get(cellIndex(x, y - 1, z));
      if (d.phase !== 'clear' && solidAt(below)) pre.add(below!);
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

    const positions = [...d.positions].sort((a, b) => a[2] - b[2] || a[0] - b[0]);
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
    if (d.phase === 'liquid') notes.push('Flüssigkeiten zuletzt, wenn die Umrandung steht; Quellblöcke einzeln setzen.');
    if (d.waterlogged) notes.push(`${d.waterlogged} Blöcke sind wassergeflutet (waterlogged=true): nach dem Setzen Wasser einfüllen.`);
    if (d.blockEntities) notes.push(`${d.blockEntities} Blöcke mit Inhalt/NBT (z. B. Truhen, Schilder): Inhalt wird beim Bauen von Hand nicht übernommen.`);
    if (d.mods.size) notes.push(`Mod-Blöcke ohne bekannte Bauregel: ${[...d.mods].sort().join(', ')}.`);
    steps.push({
      id, order: order.get(id)!, instanceId: d.instanceId, sectionName: d.sectionName, phase: d.phase, y: d.y, layer: d.layer,
      bounds: { min, maxExclusive: max }, positions, materials, blocks: d.blocks, air: d.air, erase: d.erase, blockEntities: d.blockEntities,
      conflicts: d.conflicts, prerequisites, geometryHash: quickHash(`[${JSON.stringify(d.phase)},[${d.hashCells.join(',')}]]`), check, notes,
    });
  }
  const totals = steps.reduce((t, s) => ({ blocks: t.blocks + s.blocks, air: t.air + s.air, erase: t.erase + s.erase }), { blocks: 0, air: 0, erase: 0 });
  return { steps, byId: new Map(steps.map(s => [s.id, s])), warnings, totals };
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
