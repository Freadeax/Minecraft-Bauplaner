import type { BlockState, Cell, Vec3, VoxelPayload } from '../../../voxel/src/types.js';
import type { ScanMeta } from '../../../voxel/src/observation.js';
import { stateKey } from '../../../voxel/src/validation.js';
import type { CellDeviation, CellVerdict, GameCheck, GameStepStatus } from './gameCheck.js';
import type { Guide, GuideProgress, GuideStep } from './guide.js';
import { PHASE_LABEL } from './guide.js';
import { SHULKER_SLOTS } from '../materials/materials.js';
import type { MaterialReport } from '../materials/materials.js';
import { sectionOfStep } from './sectionMembership.js';
import type { SitePlan } from './site.js';
import { DomainError } from '../core/types.js';
import type { Project, StepProgress } from '../core/types.js';

/**
 * Bauführung im Spiel (BUILD-06, docs/architecture/BUILD_RUN.md). Turns the
 * build guide into instructions a player can follow at the keyboard:
 *
 *  - Schichtführung: the cells of a step as rows/rectangles of equal blocks
 *    with coordinates relative to the anchor (= project coordinates; the game
 *    bridge anchor is the world position of project 0/0/0) and, when the
 *    project has a world placement, in world coordinates as shown by F3;
 *  - Packliste: build items of a list of steps packed into shulker boxes in
 *    the order they are first needed, stock consumed in build order;
 *  - Bautage (Tagesziele): open steps in site order split by a block and box
 *    budget, plus the history of ticks per day;
 *  - Nacharbeit: deviations of an in-game recording grouped per step.
 *
 * Everything is derived from buildGuide, the per-step material reports
 * (materialsForParts) and gameCheck. Nothing here places, counts or compares
 * blocks a second way, and no tick is ever set implicitly.
 */

// ---------------------------------------------------------------------------
// Anchor

export interface BuildAnchor {
  /** World coordinate of project 0/0/0; null = project not placed, only relative coordinates. */
  readonly origin: Vec3 | null;
  readonly dimension: string | null;
  /** MAP-07: turn of the world placement (missing = ungedreht); relative coordinates stay project coordinates. */
  readonly turns?: number;
  readonly mirror?: boolean;
}

export function anchorOf(project: Pick<Project, 'world'>): BuildAnchor {
  const w = project.world;
  return w ? { origin: w.origin, dimension: w.dimension, ...(w.turns && { turns: w.turns }), ...(w.mirror && { mirror: true }) } : { origin: null, dimension: null };
}

/** Anchor written by the game bridge into a recording (`WorldAnchor`, `Dimension`); null when the recording has none. */
export function anchorFromScan(meta: ScanMeta | null | undefined): BuildAnchor | null {
  if (!meta?.worldAnchor) return null;
  return { origin: meta.worldAnchor, dimension: meta.dimension ?? null };
}

export const sameAnchor = (a: BuildAnchor, b: BuildAnchor): boolean =>
  !!a.origin && !!b.origin && a.origin.every((v, i) => v === b.origin![i]) && (a.dimension ?? '') === (b.dimension ?? '');

const turnXZ = (x: number, z: number, anchor: BuildAnchor): [number, number] => {
  if (anchor.mirror) x = -x;
  for (let i = 0; i < ((((anchor.turns ?? 0) % 4) + 4) % 4); i++) { const k = x; x = -z; z = k; }
  return [x, z];
};
export const worldPos = (p: Vec3, anchor: BuildAnchor): Vec3 | null => {
  if (!anchor.origin) return null;
  const [x, z] = turnXZ(p[0], p[2], anchor);
  return [x + anchor.origin[0], p[1] + anchor.origin[1], z + anchor.origin[2]];
};

// ---------------------------------------------------------------------------
// Schichtführung (rows and rectangles of equal cells)

export type CellLookup = (p: Vec3) => Cell | undefined;

/** Numeric index over the world's cells, built once per world. */
export function cellLookup(world: VoxelPayload): CellLookup {
  const { min, maxExclusive: max } = world.bounds;
  const sx = max[0] - min[0], sy = max[1] - min[1];
  const index = new Map<number, Cell>();
  const at = (x: number, y: number, z: number): number => (x - min[0]) + sx * ((y - min[1]) + sy * (z - min[2]));
  for (const c of world.cells) index.set(at(c.position[0], c.position[1], c.position[2]), c);
  return ([x, y, z]) => x < min[0] || y < min[1] || z < min[2] || x >= max[0] || y >= max[1] || z >= max[2] ? undefined : index.get(at(x, y, z));
}

export type RunKind = 'block' | 'air' | 'erase';

/** Rectangle of equal cells in one layer: X x0…x1, Z z0…z1 (inclusive, project coordinates). */
export interface StepRun {
  readonly x0: number; readonly x1: number;
  readonly z0: number; readonly z1: number;
  readonly y: number;
  readonly kind: RunKind;
  /** stateKey for blocks, 'air'/'erase' otherwise. */
  readonly key: string;
  readonly state: BlockState | null;
  readonly count: number;
}

/**
 * The step's cells as rectangles: equal neighbours along X form a run, rows
 * with identical runs on consecutive Z merge. Sorted north to south (Z), then
 * west to east (X), so the list reads like the top-down plan.
 */
export function stepRuns(step: Pick<GuideStep, 'positions' | 'y'>, lookup: CellLookup): StepRun[] {
  type Row = { z: number; runs: { x0: number; x1: number; kind: RunKind; key: string; state: BlockState | null }[] };
  const rows: Row[] = [];
  for (const p of step.positions) {
    const cell = lookup(p);
    if (!cell) throw new DomainError('GUIDE', `Zelle ${p.join(',')} fehlt in der Welt`);
    const kind: RunKind = cell.kind;
    const z = p[2], x = p[0];
    let row = rows.at(-1);
    if (!row || row.z !== z) { row = { z, runs: [] }; rows.push(row); }
    const key = cell.kind === 'block' ? `#${cell.paletteIndex}` : cell.kind;
    const last = row.runs.at(-1);
    if (last && last.key === key && last.x1 === x - 1) last.x1 = x;
    else row.runs.push({ x0: x, x1: x, kind, key, state: null });
  }
  // Merge rows with identical runs on consecutive Z.
  const rects: { x0: number; x1: number; z0: number; z1: number; kind: RunKind; key: string }[] = [];
  let open: { sig: string; z: number; items: typeof rects } | null = null;
  for (const row of rows) {
    const sig = row.runs.map(r => `${r.x0}:${r.x1}:${r.key}`).join('|');
    if (open && open.sig === sig && open.z === row.z - 1) { for (const r of open.items) r.z1 = row.z; open.z = row.z; continue; }
    const items = row.runs.map(r => ({ x0: r.x0, x1: r.x1, z0: row.z, z1: row.z, kind: r.kind, key: r.key }));
    rects.push(...items);
    open = { sig, z: row.z, items };
  }
  return rects.sort((a, b) => a.z0 - b.z0 || a.x0 - b.x0).map(r => ({ ...r, y: step.y, count: (r.x1 - r.x0 + 1) * (r.z1 - r.z0 + 1), state: null }));
}

/** stepRuns with resolved block states (`key` = stateKey). */
export function stepRunsIn(step: Pick<GuideStep, 'positions' | 'y'>, world: VoxelPayload, lookup: CellLookup = cellLookup(world)): StepRun[] {
  return stepRuns(step, lookup).map(r => {
    if (r.kind !== 'block') return r;
    const state = world.palette[Number(r.key.slice(1))]!;
    return { ...r, state, key: stateKey(state) };
  });
}

const span = (a: number, b: number): string => a === b ? `${a}` : `${a}…${b}`;

/** Block label for a run: id without `minecraft:` plus the properties that matter when placing. */
export function runLabel(run: Pick<StepRun, 'kind' | 'state'>): string {
  if (run.kind === 'air') return 'Luft (freihalten)';
  if (run.kind === 'erase') return 'abbauen';
  const s = run.state!;
  const props = Object.entries(s.properties).filter(([k]) => PLACEMENT_PROPS.has(k)).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`);
  const id = s.id.replace(/^minecraft:/, '');
  return props.length ? `${id} [${props.join(', ')}]` : id;
}
const PLACEMENT_PROPS = new Set(['facing', 'half', 'type', 'axis', 'rotation', 'hinge', 'part', 'face', 'attachment', 'shape', 'waterlogged', 'orientation', 'vertical_direction', 'thickness']);

/** Coordinates of a run, relative to the anchor and (if placed) in world coordinates. */
export function runCoords(run: Pick<StepRun, 'x0' | 'x1' | 'z0' | 'z1' | 'y'>, anchor: BuildAnchor): { rel: string; abs: string | null } {
  const rel = `X ${span(run.x0, run.x1)} · Y ${run.y} · Z ${span(run.z0, run.z1)}`;
  const o = anchor.origin;
  if (!o) return { rel, abs: null };
  const [ax, az] = turnXZ(run.x0, run.z0, anchor), [bx, bz] = turnXZ(run.x1, run.z1, anchor);
  return { rel, abs: `X ${span(Math.min(ax, bx) + o[0], Math.max(ax, bx) + o[0])} · Y ${run.y + o[1]} · Z ${span(Math.min(az, bz) + o[2], Math.max(az, bz) + o[2])}` };
}

/** Plain text for one step (print sheet, copy to phone). */
export function stepText(step: GuideStep, runs: readonly StepRun[], anchor: BuildAnchor): string {
  const lines = [`Schritt ${step.order} · ${PHASE_LABEL[step.phase]} · ${step.sectionName} · Y ${step.y}${anchor.origin ? ` (Welt-Y ${step.y + anchor.origin[1]})` : ''}`, `  Prüfen: ${step.check}`];
  for (const r of runs) {
    const c = runCoords(r, anchor);
    lines.push(`  [ ] ${c.abs ?? c.rel}${c.abs ? ` (Anker ${c.rel})` : ''}: ${r.count}× ${runLabel(r)}`);
  }
  for (const n of step.notes) lines.push(`  Hinweis: ${n}`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Packliste (shulker boxes in order of first use)

export interface PackLine {
  readonly itemId: string;
  readonly count: number;
  readonly stackSize: number;
  readonly packable: boolean;
  readonly assumed: boolean;
  /** Order number of the first step that needs the item. */
  readonly firstStep: number;
  /** Taken from the site stock (consumed in build order). */
  readonly fromStock: number;
  /** Still to gather or craft. */
  readonly missing: number;
  readonly slots: number;
}

export interface PackSlot { readonly itemId: string; readonly count: number }

export interface PackBox {
  /** 1-based. */
  readonly index: number;
  readonly slots: readonly PackSlot[];
  /** Same items merged, for the label. */
  readonly items: readonly { readonly itemId: string; readonly count: number; readonly slots: number }[];
  /** First step that needs anything from this box. */
  readonly fromStep: number;
}

export interface PackPlan {
  readonly lines: readonly PackLine[];
  readonly boxes: readonly PackBox[];
  /** Items that cannot go into a shulker box (shulker boxes themselves). */
  readonly loose: readonly PackLine[];
  readonly unresolved: readonly { readonly label: string; readonly count: number }[];
  readonly totals: { readonly items: number; readonly slots: number; readonly boxes: number; readonly looseSlots: number; readonly missing: number; readonly fromStock: number };
  /** Some counts use the preview choice of unresolved voxel conflicts or assumptions. */
  readonly provisional: boolean;
}

/**
 * Build items of the given steps (in build order) packed into shulker boxes.
 * `stock` is consumed in place (pass a copy to keep the caller's map), so a
 * caller can plan several days or sections in sequence.
 */
export function packSteps(steps: readonly GuideStep[], reports: ReadonlyMap<string, MaterialReport>, stock?: Map<string, number>): PackPlan {
  const acc = new Map<string, { itemId: string; count: number; stackSize: number; packable: boolean; assumed: boolean; firstStep: number }>();
  const unresolved = new Map<string, number>();
  let provisional = false;
  for (const step of [...steps].sort((a, b) => a.order - b.order)) {
    const r = reports.get(step.id);
    if (!r) continue;
    if (r.conflicts) provisional = true;
    for (const l of r.items) {
      const e = acc.get(l.itemId);
      if (e) { e.count += l.count; e.assumed ||= l.confidence === 'assumed'; }
      else acc.set(l.itemId, { itemId: l.itemId, count: l.count, stackSize: l.stackSize, packable: l.packable, assumed: l.confidence === 'assumed', firstStep: step.order });
      if (l.confidence === 'assumed') provisional = true;
    }
    for (const u of r.unresolved) { const label = u.state.id.replace(/^minecraft:/, ''); unresolved.set(label, (unresolved.get(label) ?? 0) + u.count); }
  }
  const lines: PackLine[] = [...acc.values()].sort((a, b) => a.firstStep - b.firstStep || b.count - a.count || (a.itemId < b.itemId ? -1 : 1)).map(e => {
    const have = stock?.get(e.itemId) ?? 0, fromStock = Math.min(have, e.count);
    if (stock && fromStock) stock.set(e.itemId, have - fromStock);
    return { ...e, fromStock, missing: e.count - fromStock, slots: Math.ceil(e.count / e.stackSize) };
  });
  const slots: PackSlot[] = [];
  for (const l of lines) if (l.packable) {
    for (let left = l.count; left > 0; left -= l.stackSize) slots.push({ itemId: l.itemId, count: Math.min(left, l.stackSize) });
  }
  const boxes: PackBox[] = [];
  for (let i = 0; i < slots.length; i += SHULKER_SLOTS) {
    const content = slots.slice(i, i + SHULKER_SLOTS);
    const items = new Map<string, { itemId: string; count: number; slots: number }>();
    for (const s of content) { const e = items.get(s.itemId); if (e) { e.count += s.count; e.slots++; } else items.set(s.itemId, { itemId: s.itemId, count: s.count, slots: 1 }); }
    const fromStep = Math.min(...[...items.keys()].map(id => acc.get(id)!.firstStep));
    boxes.push({ index: boxes.length + 1, slots: content, items: [...items.values()], fromStep });
  }
  const loose = lines.filter(l => !l.packable);
  return {
    lines, boxes, loose, unresolved: [...unresolved.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    totals: {
      items: lines.reduce((n, l) => n + l.count, 0), slots: lines.reduce((n, l) => n + l.slots, 0), boxes: boxes.length,
      looseSlots: loose.reduce((n, l) => n + l.slots, 0), missing: lines.reduce((n, l) => n + l.missing, 0), fromStock: lines.reduce((n, l) => n + l.fromStock, 0),
    },
    provisional,
  };
}

export const stockMap = (site: Pick<SitePlan, 'stock'>): Map<string, number> =>
  new Map(Object.entries(site.stock).map(([k, v]) => [k.includes(':') ? k : `minecraft:${k}`, v]));

/** Plain text pack list (print sheet). */
export function packText(pack: PackPlan): string {
  const short = (id: string): string => id.replace(/^minecraft:/, '');
  const out: string[] = [];
  for (const b of pack.boxes) out.push(`  [ ] Kiste ${b.index} (ab Schritt ${b.fromStep}): ${b.items.map(i => `${i.count}× ${short(i.itemId)}`).join(', ')}`);
  for (const l of pack.loose) out.push(`  [ ] lose: ${l.count}× ${short(l.itemId)}`);
  if (pack.unresolved.length) out.push(`  Ohne Item: ${pack.unresolved.map(u => `${u.count}× ${u.label}`).join(', ')}`);
  return out.join('\n');
}

// ---------------------------------------------------------------------------
// Bautage (daily goals)

export interface PaceSetting {
  /** Blocks (placed + removed cells) per building day. */
  readonly blocksPerSession: number;
  /** Shulker boxes the player takes along per building day (27 slots each). */
  readonly boxesPerSession: number;
}
export const DEFAULT_PACE: PaceSetting = { blocksPerSession: 1500, boxesPerSession: 3 };
export const PACE_LIMITS = { blocks: [16, 100_000], boxes: [1, 27] } as const;

export function checkPace(raw: unknown): PaceSetting {
  const o = raw as Record<string, unknown> | null;
  const int = (v: unknown, [a, b]: readonly [number, number], what: string): number => {
    if (!Number.isInteger(v) || (v as number) < a || (v as number) > b) throw new DomainError('SITE', `Baustellenplan: ${what} muss eine ganze Zahl von ${a} bis ${b} sein`);
    return v as number;
  };
  if (typeof o !== 'object' || o === null || Array.isArray(o)) throw new DomainError('SITE', 'Baustellenplan: Bautempo ist kein Objekt');
  int(o.blocksPerSession, PACE_LIMITS.blocks, 'Blöcke je Bautag');
  int(o.boxesPerSession, PACE_LIMITS.boxes, 'Shulkerkisten je Bautag');
  return o as unknown as PaceSetting;
}

export const paceOf = (site: Pick<SitePlan, 'pace'>): PaceSetting => site.pace ?? DEFAULT_PACE;

/** Work of a step for the day budget: placed blocks plus cells to break. */
export const stepWork = (s: Pick<GuideStep, 'blocks' | 'erase'>): number => s.blocks + s.erase;

export interface BuildSession {
  /** 1-based building day. */
  readonly index: number;
  readonly steps: readonly GuideStep[];
  readonly work: number;
  readonly blocks: number;
  readonly minY: number;
  readonly maxY: number;
  /** Section names in the order they appear. */
  readonly sections: readonly string[];
  readonly pack: PackPlan;
  /** A single step larger than the budget (cannot be split, the step is the smallest unit). */
  readonly oversized: boolean;
}

export interface SessionPlan {
  readonly sessions: readonly BuildSession[];
  readonly pace: PaceSetting;
  readonly openSteps: number;
  readonly openWork: number;
  readonly notes: readonly string[];
}

/**
 * Open steps (not done; review counts as open) in site order – sections in
 * their order, steps without section last, inside by guide order – split into
 * building days. A day ends before the step that would exceed the block
 * budget or the slot budget (boxes × 27). Stock is consumed day by day.
 */
export function planSessions(guide: Guide, progress: Pick<GuideProgress, 'status'>, site: SitePlan, reports: ReadonlyMap<string, MaterialReport>, pace: PaceSetting = paceOf(site)): SessionPlan {
  const sectionRank = new Map(site.sections.map((s, i) => [s.id, i]));
  const rank = (s: GuideStep): number => { const id = sectionOfStep(site, s); return id === null ? site.sections.length : sectionRank.get(id)!; };
  const open = guide.steps.filter(s => progress.status.get(s.id) !== 'done').sort((a, b) => rank(a) - rank(b) || a.order - b.order);
  const slotBudget = pace.boxesPerSession * SHULKER_SLOTS;
  const groups: GuideStep[][] = [];
  let cur: GuideStep[] = [], work = 0;
  const counts = new Map<string, { count: number; stack: number; packable: boolean }>();
  let slots = 0;
  const slotsWith = (step: GuideStep): number => {
    let n = slots;
    for (const l of reports.get(step.id)?.items ?? []) {
      if (!l.packable) continue;
      const e = counts.get(l.itemId);
      const before = e ? Math.ceil(e.count / e.stack) : 0, after = Math.ceil(((e?.count ?? 0) + l.count) / l.stackSize);
      n += after - before;
    }
    return n;
  };
  const add = (step: GuideStep): void => {
    cur.push(step); work += stepWork(step);
    slots = slotsWith(step);
    for (const l of reports.get(step.id)?.items ?? []) if (l.packable) {
      const e = counts.get(l.itemId);
      if (e) e.count += l.count; else counts.set(l.itemId, { count: l.count, stack: l.stackSize, packable: true });
    }
  };
  for (const step of open) {
    if (cur.length && (work + stepWork(step) > pace.blocksPerSession || slotsWith(step) > slotBudget)) {
      groups.push(cur); cur = []; work = 0; slots = 0; counts.clear();
    }
    add(step);
  }
  if (cur.length) groups.push(cur);
  const stock = stockMap(site);
  const sessions = groups.map((steps, i): BuildSession => {
    const w = steps.reduce((n, s) => n + stepWork(s), 0);
    const pack = packSteps(steps, reports, stock);
    return {
      index: i + 1, steps, work: w, blocks: steps.reduce((n, s) => n + s.blocks, 0),
      minY: Math.min(...steps.map(s => s.y)), maxY: Math.max(...steps.map(s => s.y)),
      sections: [...new Set(steps.map(s => sectionNameOf(site, s)))], pack,
      oversized: steps.length === 1 && (w > pace.blocksPerSession || pack.totals.slots - pack.totals.looseSlots > slotBudget),
    };
  });
  const notes = ['Bautage sind eine Planungshilfe nach deinem Bautempo, keine Messung. Ein Schritt wird nie geteilt.'];
  if (sessions.some(s => s.oversized)) notes.push('Mindestens ein Schritt ist größer als das Tagesbudget und bildet allein einen Bautag.');
  if (site.sections.length) notes.push('Reihenfolge: Bauabschnitte wie auf der Baustelle geplant, darin die Reihenfolge der Bauanleitung.');
  if (Object.keys(site.stock).length) notes.push('Der Lagerbestand wird Tag für Tag in Bau-Reihenfolge verbraucht („aus dem Lager“).');
  return { sessions, pace, openSteps: open.length, openWork: open.reduce((n, s) => n + stepWork(s), 0), notes };
}

function sectionNameOf(site: SitePlan, step: GuideStep): string {
  const id = sectionOfStep(site, step);
  return id === null ? (site.sections.length ? 'Ohne Abschnitt' : step.sectionName) : site.sections.find(s => s.id === id)!.name;
}

export interface DayProgress { readonly day: string; readonly steps: number; readonly blocks: number }

/**
 * Ticks per calendar day (newest first), from the tick time of steps that
 * still exist. `dayOf` maps the ISO time to a day key (default: UTC date;
 * the UI passes the local date).
 */
export function progressByDay(progress: Readonly<Record<string, StepProgress>>, guide: Pick<Guide, 'byId'>, dayOf: (iso: string) => string = iso => iso.slice(0, 10)): DayProgress[] {
  const days = new Map<string, { steps: number; blocks: number }>();
  for (const [id, p] of Object.entries(progress)) {
    const step = guide.byId.get(id);
    if (!step || p.geometryHash !== step.geometryHash || !p.at) continue;
    const day = dayOf(p.at), d = days.get(day) ?? { steps: 0, blocks: 0 };
    d.steps++; d.blocks += stepWork(step); days.set(day, d);
  }
  return [...days.entries()].map(([day, d]) => ({ day, ...d })).sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
}

/** Plain text sheet for one building day. */
export function sessionText(session: BuildSession, world: VoxelPayload, anchor: BuildAnchor, title: string): string {
  const lookup = cellLookup(world);
  const head = [title, `Bautag ${session.index}: ${session.steps.length} Schritte, ${session.work} Blöcke, Y ${span(session.minY, session.maxY)}`,
    anchor.origin ? `Anker (Projekt 0/0/0) = Welt X ${anchor.origin[0]} · Y ${anchor.origin[1]} · Z ${anchor.origin[2]}${anchor.dimension ? ` (${anchor.dimension})` : ''}${anchor.turns || anchor.mirror ? `, Projekt ${anchor.mirror ? 'gespiegelt' : ''}${anchor.mirror && anchor.turns ? ' und ' : ''}${anchor.turns ? `um ${anchor.turns * 90}° im Uhrzeigersinn gedreht` : ''}` : ''}` : 'Koordinaten relativ zum Anker (Projekt 0/0/0); Weltlage nicht gesetzt.',
    '', 'Packliste:', packText(session.pack), ''];
  return [...head, ...session.steps.map(s => stepText(s, stepRunsIn(s, world, lookup), anchor))].join('\n');
}

// ---------------------------------------------------------------------------
// Spielfortschritt: rework list and per-day game state

export interface ReworkItem {
  readonly position: Vec3;
  readonly verdict: Exclude<CellVerdict, 'ok' | 'unknown'>;
  readonly expected: string;
  readonly actual: string | null;
}

export interface ReworkGroup {
  readonly step: GuideStep;
  readonly items: readonly ReworkItem[];
  /** Cells of the step outside the recording or in unloaded chunks. */
  readonly unknown: number;
}

export const REWORK_ACTION: Readonly<Record<ReworkItem['verdict'], string>> = {
  missing: 'setzen', wrong: 'ersetzen', state: 'neu ausrichten', remove: 'abbauen',
};

/** Deviations of a recording as a work list in build order; unknown cells are only counted. */
export function reworkList(game: GameCheck, guide: Guide): ReworkGroup[] {
  const by = new Map<string, { items: ReworkItem[]; unknown: number }>();
  for (const d of game.deviations.values() as Iterable<CellDeviation>) {
    const g = by.get(d.stepId) ?? (by.set(d.stepId, { items: [], unknown: 0 }), by.get(d.stepId)!);
    if (d.verdict === 'unknown') g.unknown++;
    else g.items.push({ position: d.position, verdict: d.verdict, expected: d.expected, actual: d.actual });
  }
  return [...by.entries()].flatMap(([id, g]) => {
    const step = guide.byId.get(id);
    if (!step || !g.items.length) return [];
    const items = g.items.sort((a, b) => a.position[2] - b.position[2] || a.position[0] - b.position[0]);
    return [{ step, items, unknown: g.unknown }];
  }).sort((a, b) => a.step.order - b.step.order);
}

export type GameCounts = Readonly<Record<GameStepStatus, number>>;

/** In-game status of a list of steps (e.g. one building day). Steps without recording data count as unchecked. */
export function gameCounts(steps: readonly GuideStep[], game: GameCheck): GameCounts {
  const out = { confirmed: 0, partial: 0, deviating: 0, unchecked: 0 };
  for (const s of steps) out[game.steps.get(s.id)?.status ?? 'unchecked']++;
  return out;
}
