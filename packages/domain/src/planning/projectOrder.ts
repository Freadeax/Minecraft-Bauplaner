import { dayText, parseDay, programOf, removeProjectAfter } from './program.js';
import { applyOperation } from '../core/project.js';
import { siteOf } from '../building/site.js';
import type { Project } from '../core/types.js';
import type { WorldPlan, WorldPlanOp, WorldSite } from '../world/worldPlan.js';

/**
 * PROJ-04: order between projects („erst das Lager, dann die Burg“). Each
 * project keeps its own predecessors in `site.program.after`, so they travel
 * with the project (backup, undo, team package). Here the cross-project view:
 * links, cycles, levels and what a predecessor's agreed end means for the start.
 */
export type OrderProject = Pick<Project, 'id' | 'name' | 'site'>;
export interface ProjectLink { readonly before: string; readonly after: string; readonly note?: string }

/** Links between existing projects; references to deleted projects are left out. */
export function projectLinks(projects: readonly OrderProject[]): ProjectLink[] {
  const ids = new Set(projects.map(p => p.id)), out: ProjectLink[] = [];
  for (const p of projects) for (const a of programOf(siteOf(p)).after ?? [])
    if (ids.has(a.projectId) && a.projectId !== p.id) out.push({ before: a.projectId, after: p.id, ...(a.note && { note: a.note }) });
  return out;
}

/** A cycle as project ids (first = last), or null. `extra` is a link about to be added. */
export function projectCycle(links: readonly ProjectLink[], extra?: Pick<ProjectLink, 'before' | 'after'>): string[] | null {
  const next = new Map<string, string[]>();
  for (const l of extra ? [...links, extra] : links) next.set(l.before, [...(next.get(l.before) ?? []), l.after]);
  const state = new Map<string, 1 | 2>(), stack: string[] = [];
  const visit = (id: string): string[] | null => {
    state.set(id, 1); stack.push(id);
    for (const n of next.get(id) ?? []) {
      if (state.get(n) === 1) return [...stack.slice(stack.indexOf(n)), n];
      if (!state.has(n)) { const c = visit(n); if (c) return c; }
    }
    state.set(id, 2); stack.pop(); return null;
  };
  for (const id of next.keys()) if (!state.has(id)) { const c = visit(id); if (c) return c; }
  return null;
}

/** Why `ownId` cannot start after `beforeId`, or null when it can. */
export function projectAfterProblem(projects: readonly OrderProject[], ownId: string, beforeId: string): string | null {
  if (ownId === beforeId) return 'Ein Projekt kann nicht nach sich selbst kommen.';
  const name = new Map(projects.map(p => [p.id, p.name]));
  if (!name.has(beforeId)) return 'Dieses Projekt gibt es nicht mehr.';
  const links = projectLinks(projects);
  if (links.some(l => l.before === beforeId && l.after === ownId)) return `„${name.get(ownId)}“ kommt schon nach „${name.get(beforeId)}“.`;
  const cycle = projectCycle(links, { before: beforeId, after: ownId });
  return cycle ? `Das ergäbe einen Kreis: ${cycle.map(id => `„${name.get(id) ?? id}“`).join(' → ')}.` : null;
}

/** Level per project: 0 = waits for nothing, n = longest chain of predecessors. Projects in a cycle get no level. */
export function projectLevels(projects: readonly OrderProject[]): Map<string, number> {
  const links = projectLinks(projects), prev = new Map<string, string[]>();
  for (const l of links) prev.set(l.after, [...(prev.get(l.after) ?? []), l.before]);
  const level = new Map<string, number>(), busy = new Set<string>();
  const of = (id: string): number | null => {
    if (level.has(id)) return level.get(id)!;
    if (busy.has(id)) return null;
    busy.add(id);
    let l = 0;
    for (const b of prev.get(id) ?? []) { const x = of(b); if (x === null) { busy.delete(id); return null; } l = Math.max(l, x + 1); }
    busy.delete(id); level.set(id, l); return l;
  };
  for (const p of projects) of(p.id);
  return level;
}

export interface PredecessorState {
  readonly projectId: string;
  readonly name: string;
  readonly note?: string;
  /** Agreed last building day (active baseline of the predecessor); null = unknown. */
  readonly end: string | null;
  /** baseline: end from its baseline · done: its baseline had nothing open · unknown: no baseline · missing: project deleted. */
  readonly source: 'baseline' | 'done' | 'unknown' | 'missing';
}
export interface ProjectStartCheck {
  readonly predecessors: readonly PredecessorState[];
  /** Day after the latest known predecessor end; null when nothing is known. */
  readonly earliestStart: string | null;
  /** The project's start date lies before `earliestStart`. */
  readonly tooEarly: boolean;
  /** Predecessors without an agreed end. */
  readonly unknown: number;
}

/** What the predecessors' agreed ends mean for this project's start date. */
export function projectStartCheck(project: OrderProject, projects: readonly OrderProject[]): ProjectStartCheck {
  const byId = new Map(projects.map(p => [p.id, p])), program = programOf(siteOf(project));
  const predecessors: PredecessorState[] = (program.after ?? []).map(a => {
    const other = byId.get(a.projectId), note = a.note ? { note: a.note } : {};
    if (!other) return { projectId: a.projectId, name: 'gelöschtes Projekt', ...note, end: null, source: 'missing' as const };
    const base = programOf(siteOf(other)).baseline;
    if (!base) return { projectId: other.id, name: other.name, ...note, end: null, source: 'unknown' as const };
    return base.end ? { projectId: other.id, name: other.name, ...note, end: base.end, source: 'baseline' as const }
      : { projectId: other.id, name: other.name, ...note, end: base.at, source: 'done' as const };
  });
  let latest: number | null = null;
  for (const p of predecessors) if (p.end) { const d = parseDay(p.end)!; latest = latest === null ? d : Math.max(latest, d); }
  const earliestStart = latest === null ? null : dayText(latest + 1), start = parseDay(program.start);
  return { predecessors, earliestStart, tooEarly: earliestStart !== null && start !== null && start < parseDay(earliestStart)!,
    unknown: predecessors.filter(p => p.source === 'unknown').length };
}

/** Projects that wait for `projectId` (direct successors), with names. */
export function projectSuccessors(projectId: string, projects: readonly OrderProject[]): { id: string; name: string }[] {
  return projects.filter(p => (programOf(siteOf(p)).after ?? []).some(a => a.projectId === projectId)).map(p => ({ id: p.id, name: p.name }));
}

/**
 * What deleting a project leaves behind and how to tidy it (Projektzentrale):
 * successors that wait for it (`site.program.after`) and world-map sites built
 * with it. `projects` are the successors with the link removed (save with their
 * stored revision), `worldPlanOp` turns those sites into free sites. Nothing is
 * deleted here; the caller deletes the project and then saves both.
 */
export interface ProjectRemoval {
  readonly successors: readonly { readonly id: string; readonly name: string }[];
  readonly sites: readonly { readonly id: string; readonly name: string }[];
  readonly projects: readonly Project[];
  readonly worldPlanOp: WorldPlanOp | null;
}
export function projectRemoval(projectId: string, projects: readonly Project[], worldPlan?: Pick<WorldPlan, 'items'>): ProjectRemoval {
  const waiting = projects.filter(p => p.id !== projectId && (programOf(siteOf(p)).after ?? []).some(a => a.projectId === projectId));
  const sites = (worldPlan?.items ?? []).filter((i): i is WorldSite => i.kind === 'site' && i.projectId === projectId);
  return {
    successors: waiting.map(p => ({ id: p.id, name: p.name })),
    sites: sites.map(s => ({ id: s.id, name: s.name })),
    projects: waiting.map(p => applyOperation(p, { kind: 'site.set', site: removeProjectAfter(siteOf(p), projectId), label: 'Reihenfolge: gelöschtes Projekt entfernt' }).project),
    worldPlanOp: sites.length ? { kind: 'batch', label: sites.length === 1 ? `Bauplatz „${sites[0]!.name}“ freigegeben` : `${sites.length} Bauplätze freigegeben`, ops: sites.map(s => ({ kind: 'update' as const, item: { ...s, projectId: null } })) } : null,
  };
}
