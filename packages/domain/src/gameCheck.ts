import type { WorldScan } from '../../voxel/src/observation.js';
import { UNLOADED_STATE } from '../../voxel/src/observation.js';
import type { BlockState, Vec3, VoxelPayload } from '../../voxel/src/types.js';
import { positionKey } from './compose.js';
import type { Guide, GuideStep, StepStatus } from './guide.js';
import { tickSteps } from './guide.js';
import type { Operation } from './project.js';
import { dataVersionFromProfile } from './revisionExport.js';
import type { BlueprintRevision, Project } from './types.js';
import { placeToWorld } from './worldmap.js';
import type { WorldPlacement } from './worldmap.js';

/**
 * In-game check (B8 · P6-01, docs/architecture/MOD_BRIDGE.md). Compares a world
 * recording cell by cell with the resolved plan and maps every result onto the
 * guide step that owns the cell. The mod only records; this is the single place
 * that decides what counts as built. Manual ticks are never changed here.
 */

/** ok · state: same block, other construction properties · missing: air · wrong: other block · remove: block where air/erase is planned · unknown: not recorded. */
export type CellVerdict = 'ok' | 'state' | 'missing' | 'wrong' | 'remove' | 'unknown';
/** confirmed: every cell ok · deviating: any wrong/state/remove · partial: some ok · unchecked: nothing ok and nothing deviating. */
export type GameStepStatus = 'confirmed' | 'partial' | 'deviating' | 'unchecked';

export const GAME_STATUS_LABEL: Readonly<Record<GameStepStatus, string>> = {
  confirmed: 'im Spiel bestätigt', partial: 'im Spiel teilweise', deviating: 'im Spiel abweichend', unchecked: 'im Spiel nicht geprüft',
};
export const VERDICT_LABEL: Readonly<Record<CellVerdict, string>> = {
  ok: 'korrekt', state: 'falsch ausgerichtet/Zustand', missing: 'fehlt', wrong: 'falscher Block', remove: 'noch abbauen', unknown: 'nicht aufgenommen',
};

export type VerdictCounts = { readonly [K in CellVerdict]: number };

export interface StepCheck extends VerdictCounts {
  readonly stepId: string;
  readonly geometryHash: string;
  readonly total: number;
  readonly status: GameStepStatus;
}

export interface CellDeviation {
  readonly position: Vec3;
  readonly verdict: Exclude<CellVerdict, 'ok'>;
  /** Planned state text, `Luft` for air/erase cells. */
  readonly expected: string;
  /** Recorded state text; null when not recorded. */
  readonly actual: string | null;
  readonly stepId: string;
}

export interface GameCheck {
  readonly steps: ReadonlyMap<string, StepCheck>;
  /** positionKey → deviation for every cell that is not ok. */
  readonly deviations: ReadonlyMap<string, CellDeviation>;
  readonly totals: VerdictCounts & { readonly cells: number; readonly blocks: number; readonly blocksOk: number };
  /** Plan cells outside the recorded box (counted as unknown). */
  readonly outside: number;
  /** Project coordinate of the recording's local 0/0/0. */
  readonly alignment: Vec3;
  readonly notes: readonly string[];
}

const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const GLOBAL_IGNORED = ['powered', 'power', 'open', 'occupied', 'triggered', 'extended', 'enabled', 'in_wall', 'attached', 'disarmed', 'instrument',
  'has_book', 'has_record', 'has_bottle_0', 'has_bottle_1', 'has_bottle_2', 'snowy', 'age', 'stage', 'moisture'];
const CONNECTIONS = ['north', 'east', 'south', 'west', 'up', 'down'];
const CONNECTING_NAMES = new Set(['iron_bars', 'glass_pane', 'chorus_plant', 'tripwire', 'redstone_wire', 'mushroom_stem']);
const CONNECTING_SUFFIX = ['_fence', '_pane', '_wall', '_mushroom_block'];
const LIT_DERIVED = new Set(['furnace', 'blast_furnace', 'smoker', 'redstone_lamp', 'redstone_torch', 'redstone_wall_torch', 'redstone_ore', 'deepslate_redstone_ore']);

/**
 * Properties of a vanilla block that the game derives from neighbours or operation
 * and that therefore are no building mistake. Explicit list (see MOD_BRIDGE.md);
 * mod namespaces compare every property.
 */
export function ignoredProperties(id: string): ReadonlySet<string> {
  if (!id.startsWith('minecraft:')) return new Set();
  const name = id.slice('minecraft:'.length);
  const out = new Set(GLOBAL_IGNORED);
  if (CONNECTING_NAMES.has(name) || CONNECTING_SUFFIX.some(s => name.endsWith(s))) for (const k of CONNECTIONS) out.add(k);
  if (name.endsWith('_leaves')) { out.add('distance'); out.add('persistent'); }
  if (name === 'scaffolding') { out.add('distance'); out.add('bottom'); }
  if (name.endsWith('_stairs')) out.add('shape');
  if (name === 'chest' || name === 'trapped_chest') out.add('type');
  if (LIT_DERIVED.has(name)) out.add('lit');
  if (name === 'redstone_wire') out.add('power');
  return out;
}

export function stateText(state: BlockState): string {
  const props = Object.entries(state.properties).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`);
  return props.length ? `${state.id}[${props.join(',')}]` : state.id;
}

/** Verdict for one planned block. Properties the plan leaves out are free. */
export function compareBlock(expected: BlockState, actual: BlockState): Exclude<CellVerdict, 'remove'> {
  if (actual.id === UNLOADED_STATE) return 'unknown';
  if (AIR.has(actual.id)) return AIR.has(expected.id) ? 'ok' : 'missing';
  if (actual.id !== expected.id) return 'wrong';
  const ignored = ignoredProperties(expected.id);
  for (const [k, v] of Object.entries(expected.properties)) if (!ignored.has(k) && actual.properties[k] !== v) return 'state';
  return 'ok';
}

export interface ScanTarget {
  /** Revision named by the recording; null for foreign recordings (use the selected basis). */
  readonly revision: BlueprintRevision | null;
  /** Alignment taken from the recording's metadata; null ⇒ must be chosen manually. */
  readonly projectMin: Vec3 | null;
  readonly notes: readonly string[];
}

/** Checks that a recording belongs to this project and names an existing revision. Returns an error text otherwise. */
export function scanTarget(project: Project, scan: WorldScan): ScanTarget | { error: string } {
  const notes: string[] = [];
  const profileDv = dataVersionFromProfile(project.profileId);
  if (profileDv && profileDv !== scan.dataVersion) notes.push(`Aufnahme aus DataVersion ${scan.dataVersion}, Projektprofil ${profileDv}: Blockzustände werden nicht umgewandelt.`);
  if (!scan.meta) return { revision: null, projectMin: null, notes };
  if (scan.meta.projectId !== project.id) return { error: `Die Aufnahme gehört zu einem anderen Projekt (${scan.meta.projectId}).` };
  const revision = project.revisions.find(r => r.id === scan.meta!.revisionId);
  if (!revision) return { error: `Revision ${scan.meta.revisionNumber} (${scan.meta.revisionId}) existiert in diesem Projekt nicht.` };
  if (scan.meta.unloaded) notes.push(`${scan.meta.unloaded} Zellen lagen in nicht geladenen Chunks und gelten als „nicht aufgenommen“.`);
  return { revision, projectMin: scan.meta.projectMin, notes };
}

function zero(): Record<CellVerdict, number> { return { ok: 0, state: 0, missing: 0, wrong: 0, remove: 0, unknown: 0 }; }

function stepStatus(c: VerdictCounts, total: number): GameStepStatus {
  if (c.ok === total) return 'confirmed';
  if (c.wrong || c.state || c.remove) return 'deviating';
  return c.ok ? 'partial' : 'unchecked';
}

/**
 * Compares the planned world with a recording aligned so that recording cell
 * (0,0,0) lies on `alignment` in project coordinates. Cells the plan does not
 * select are ignored; plan cells outside the recording are unknown.
 */
export function checkScan(guide: Guide, world: VoxelPayload, scan: WorldScan, alignment: Vec3, notes: readonly string[] = []): GameCheck {
  const stepOf = new Map<string, GuideStep>();
  for (const s of guide.steps) for (const p of s.positions) stepOf.set(positionKey(p), s);
  const perStep = new Map<string, Record<CellVerdict, number>>();
  const totals = zero();
  const deviations = new Map<string, CellDeviation>();
  const [W, H, L] = scan.size;
  let outside = 0, blocks = 0, blocksOk = 0;
  for (const cell of world.cells) {
    const key = positionKey(cell.position);
    const step = stepOf.get(key);
    if (!step) continue; // every world cell has a step (guide contract); defensive only
    const x = cell.position[0] - alignment[0], y = cell.position[1] - alignment[1], z = cell.position[2] - alignment[2];
    const inside = x >= 0 && y >= 0 && z >= 0 && x < W && y < H && z < L;
    const actual = inside ? scan.palette[scan.data[x + z * W + y * W * L]!]! : null;
    if (!inside) outside++;
    let verdict: CellVerdict;
    const expected = cell.kind === 'erase' ? null : world.palette[cell.paletteIndex]!;
    if (!actual || actual.id === UNLOADED_STATE) verdict = 'unknown';
    else if (cell.kind === 'block') verdict = compareBlock(expected!, actual);
    else verdict = AIR.has(actual.id) ? 'ok' : 'remove';
    if (cell.kind === 'block') { blocks++; if (verdict === 'ok') blocksOk++; }
    totals[verdict]++;
    const counts = perStep.get(step.id) ?? (perStep.set(step.id, zero()), perStep.get(step.id)!);
    counts[verdict]++;
    if (verdict !== 'ok') deviations.set(key, {
      position: cell.position, verdict, stepId: step.id,
      expected: cell.kind === 'block' ? stateText(expected!) : 'Luft',
      actual: actual && actual.id !== UNLOADED_STATE ? stateText(actual) : null,
    });
  }
  const steps = new Map<string, StepCheck>();
  for (const s of guide.steps) {
    const c = perStep.get(s.id) ?? zero();
    const total = Object.values(c).reduce((a, b) => a + b, 0);
    steps.set(s.id, { stepId: s.id, geometryHash: s.geometryHash, total, ...c, status: stepStatus(c, total) });
  }
  const allNotes = [...notes];
  if (outside) allNotes.push(`${outside} Planzellen liegen außerhalb der Aufnahme und gelten als „nicht aufgenommen“.`);
  return { steps, deviations, totals: { ...totals, cells: world.cells.length, blocks, blocksOk }, outside, alignment, notes: allNotes };
}

/** Steps the recording confirms but that are not ticked (or need review). */
export function confirmedUnticked(guide: Guide, check: GameCheck, status: (id: string) => StepStatus): GuideStep[] {
  return guide.steps.filter(s => check.steps.get(s.id)?.status === 'confirmed' && status(s.id) !== 'done');
}

/** Ticked steps the recording contradicts (deviating, or blocks missing). */
export function tickedButNotBuilt(guide: Guide, check: GameCheck, status: (id: string) => StepStatus): GuideStep[] {
  return guide.steps.filter(s => {
    const c = check.steps.get(s.id);
    return status(s.id) === 'done' && !!c && (c.status === 'deviating' || c.missing > 0);
  });
}

/** Explicit, undoable transfer of confirmed steps into manual ticks. */
export function tickConfirmed(guide: Guide, check: GameCheck, status: (id: string) => StepStatus, at?: string): Operation | null {
  const steps = confirmedUnticked(guide, check, status);
  return tickSteps(steps, `${steps.length} im Spiel bestätigte Schritte abgehakt`, at);
}

/** One height of the plan in a game check (MAP-05): every planned cell at this Y, by verdict. */
export interface LayerProgress extends VerdictCounts {
  readonly y: number;
  readonly total: number;
  /** ok / total, 0 for an empty layer. */
  readonly share: number;
}

/** Progress per height, bottom up; the ok count is what the check did not list as a deviation. */
export function layerProgress(world: Pick<VoxelPayload, 'cells'>, check: Pick<GameCheck, 'deviations'>): LayerProgress[] {
  const byY = new Map<number, Record<CellVerdict, number> & { total: number }>();
  const row = (y: number) => byY.get(y) ?? (byY.set(y, { ...zero(), total: 0 }), byY.get(y)!);
  for (const c of world.cells) { const r = row(c.position[1]); r.total++; r.ok++; }
  for (const d of check.deviations.values()) { const r = row(d.position[1]); r.ok--; r[d.verdict]++; }
  return [...byY.entries()].sort((a, b) => a[0] - b[0]).map(([y, r]) => ({ y, ...r, share: r.total ? r.ok / r.total : 0 }));
}

/** Steps of a check by game status (for a short summary line). */
export function stepStatusCounts(check: Pick<GameCheck, 'steps'>): Readonly<Record<GameStepStatus, number>> {
  const out: Record<GameStepStatus, number> = { confirmed: 0, partial: 0, deviating: 0, unchecked: 0 };
  for (const s of check.steps.values()) if (s.total) out[s.status]++;
  return out;
}

/** Map overlay of a check: per column the most urgent deviation (wrong > state > remove > missing), with its height range. */
export interface DeviationColumn { readonly x: number; readonly z: number; readonly verdict: Exclude<CellVerdict, 'ok' | 'unknown'>; readonly count: number; readonly minY: number; readonly maxY: number }
const URGENCY: Readonly<Record<Exclude<CellVerdict, 'ok' | 'unknown'>, number>> = { wrong: 4, state: 3, remove: 2, missing: 1 };

/**
 * Deviations as world columns: project position + `origin` (where the project stands on the map).
 * `layer` limits to one project height. Unknown cells are left out: they are not a building error.
 */
export function deviationColumns(check: Pick<GameCheck, 'deviations'>, origin: Vec3 | Pick<WorldPlacement, 'origin' | 'turns' | 'mirror'>, layer: number | null = null): DeviationColumn[] {
  const pl = Array.isArray(origin) ? { origin: origin as Vec3 } : origin as Pick<WorldPlacement, 'origin' | 'turns' | 'mirror'>;
  const cols = new Map<string, { x: number; z: number; verdict: DeviationColumn['verdict']; count: number; minY: number; maxY: number }>();
  for (const d of check.deviations.values()) {
    if (d.verdict === 'unknown' || (layer !== null && d.position[1] !== layer)) continue;
    const [x, y, z] = placeToWorld(d.position, pl), k = `${x},${z}`;
    const c = cols.get(k);
    if (!c) { cols.set(k, { x, z, verdict: d.verdict, count: 1, minY: y, maxY: y }); continue; }
    c.count++; c.minY = Math.min(c.minY, y); c.maxY = Math.max(c.maxY, y);
    if (URGENCY[d.verdict] > URGENCY[c.verdict]) c.verdict = d.verdict;
  }
  return [...cols.values()];
}
