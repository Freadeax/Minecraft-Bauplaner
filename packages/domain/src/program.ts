import type { Guide } from './guide.js';
import { newId } from './hash.js';
import { sectionOfStep } from './sectionMembership.js';
import type { PaceSetting } from './buildRun.js';
import type { BuildItemLine, GatherLine, SectionPlan, SitePlan, SiteOverview } from './site.js';
import { DomainError } from './types.js';
import type { Project } from './types.js';

/**
 * Projektplanung (PROJ-01). Large projects need more than an ordered list of
 * build sections: milestones with target dates, dependencies between sections
 * ("the keep after the curtain wall"), several builders working in parallel,
 * and a schedule that says when each section and milestone will be reached.
 *
 * Everything the planner decides lives in one optional record
 * `project.site.program` (`BuildProgram`). It only references sections of the
 * same site plan by id, so it travels with `site.set` operations (undo, backups,
 * data check) and needs no new plan-graph role. Derived views (`planProgram`)
 * are pure functions over the site overview that the project computation
 * already produces; no geometry, step or material rule is counted a second
 * way. Dates are projections from the pace settings – visible assumptions,
 * never measurements.
 */

export const PROGRAM_SCHEMA_VERSION = 1;
export const MAX_BUILDERS = 32;
export const MAX_MILESTONES = 64;
export const MAX_DEPENDENCIES = 1024;
export const DEFAULT_SESSIONS_PER_WEEK = 7;

export interface Builder {
  readonly id: string;
  readonly name: string;
  /** Blocks per building day of this builder; absent = project pace (site.pace). */
  readonly blocksPerSession?: number;
  readonly note?: string;
  /** Minecraft name (Teambau, COOP-01): links the builder to the player on the server. */
  readonly player?: string;
  /** Share of the building days this builder takes part in, 10–100 % (PROJ-02); absent = 100. */
  readonly share?: number;
  /** PROJ-03: days without building (holidays, exams), inclusive, sorted by start. Only with a start date. */
  readonly absences?: readonly Absence[];
}

/** A period a builder does not build (PROJ-03), `YYYY-MM-DD` inclusive. */
export interface Absence {
  readonly from: string;
  readonly to: string;
  readonly note?: string;
}
export const MAX_ABSENCES = 24;
export const MAX_BASELINES = 8;

export interface Milestone {
  readonly id: string;
  readonly name: string;
  readonly note?: string;
  /** Target date `YYYY-MM-DD`; absent = no date. */
  readonly due?: string;
  /** Sections that must be complete; order irrelevant. */
  readonly sectionIds: readonly string[];
}

/** `after` may only start when `before` is complete. */
export interface Dependency {
  readonly before: string;
  readonly after: string;
  readonly note?: string;
}

export interface BuildProgram {
  readonly schemaVersion: 1;
  readonly builders: readonly Builder[];
  readonly milestones: readonly Milestone[];
  readonly dependencies: readonly Dependency[];
  /** Section id → builder ids working on it (several = they share the section). */
  readonly assignments: Readonly<Record<string, readonly string[]>>;
  /** First building day `YYYY-MM-DD`; absent = schedule in building days only. */
  readonly start?: string;
  /** Building days per week (1–7); n < 7 uses the first n weekdays Monday…Sunday. Absent = 7. */
  readonly sessionsPerWeek?: number;
  /** PROJ-02: a section starts only when its material is there (readiness from Produktion). */
  readonly waitForMaterial?: true;
  /** PROJ-02: frozen schedule to compare the current projection with (needs a start date). */
  readonly baseline?: Baseline;
  /** PROJ-03: earlier baselines, newest first (at most MAX_BASELINES); the active one is `baseline`. */
  readonly baselines?: readonly Baseline[];
  /** PROJ-04: other projects this project starts after (e.g. „erst nach dem Lager“). Absent = none. */
  readonly after?: readonly ProjectAfter[];
}

/** PROJ-04: a project that has to be finished before this one starts. */
export interface ProjectAfter {
  readonly projectId: string;
  readonly note?: string;
}
export const MAX_PROJECT_AFTER = 16;

/** Frozen dates of a schedule (PROJ-02). Dates only, so it stays comparable when the plan is recomputed from today. */
export interface Baseline {
  /** Day the baseline was taken. */
  readonly at: string;
  /** PROJ-03: optional name, e.g. „Vor den Ferien“. */
  readonly name?: string;
  /** Last building day of the whole plan; absent = everything was done. */
  readonly end?: string;
  /** Section id → first and last building day. Done sections are not recorded. */
  readonly sections: Readonly<Record<string, { readonly start: string; readonly end: string }>>;
  /** Milestone id → last building day. */
  readonly milestones: Readonly<Record<string, string>>;
}

export function emptyProgram(): BuildProgram {
  return { schemaVersion: 1, builders: [], milestones: [], dependencies: [], assignments: {} };
}
/** The site's program or the empty default. */
export const programOf = (site: Pick<SitePlan, 'program'>): BuildProgram => site.program ?? emptyProgram();

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const fail = (message: string): never => { throw new DomainError('SITE', `Projektplan: ${message}`); };
const text = (v: unknown, max: number, what: string): string => {
  if (typeof v !== 'string' || !v.trim() || v.length > max) fail(`${what} braucht 1–${max} Zeichen`);
  return v as string;
};
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
/** Parses `YYYY-MM-DD` to days since the epoch (UTC) or null. */
export function parseDay(s: string | undefined): number | null {
  if (!s) return null;
  const m = DATE.exec(s);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(t);
  if (d.getUTCFullYear() !== Number(m[1]) || d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCDate() !== Number(m[3])) return null;
  return Math.round(t / 86_400_000);
}
export const dayText = (day: number): string => new Date(day * 86_400_000).toISOString().slice(0, 10);
const checkDate = (v: unknown, what: string): string => {
  if (typeof v !== 'string' || parseDay(v) === null) fail(`${what} muss ein Datum JJJJ-MM-TT sein`);
  return v as string;
};

/** Returns a cycle (section ids, first = last) or null. */
export function dependencyCycle(dependencies: readonly Pick<Dependency, 'before' | 'after'>[]): string[] | null {
  const next = new Map<string, string[]>();
  for (const d of dependencies) (next.get(d.before) ?? (next.set(d.before, []), next.get(d.before)!)).push(d.after);
  const state = new Map<string, 1 | 2>(), stack: string[] = [];
  const visit = (id: string): string[] | null => {
    state.set(id, 1); stack.push(id);
    for (const to of next.get(id) ?? []) {
      const s = state.get(to);
      if (s === 1) return [...stack.slice(stack.indexOf(to)), to];
      if (!s) { const c = visit(to); if (c) return c; }
    }
    stack.pop(); state.set(id, 2);
    return null;
  };
  for (const id of next.keys()) if (!state.has(id)) { const c = visit(id); if (c) return c; }
  return null;
}

/** Structural validation (records from storage, backups and operations). Throws DomainError 'SITE'. */
export function checkProgram(raw: unknown): BuildProgram {
  if (!isObj(raw)) return fail('kein Objekt');
  if (raw.schemaVersion !== PROGRAM_SCHEMA_VERSION) fail(`unbekannte Schemaversion ${String(raw.schemaVersion)}`);
  if (!Array.isArray(raw.builders) || raw.builders.length > MAX_BUILDERS) fail(`höchstens ${MAX_BUILDERS} Bauleute`);
  const builderIds = new Set<string>();
  for (const b of raw.builders as unknown[]) {
    if (!isObj(b)) return fail('Bauleute-Eintrag ist kein Objekt');
    const id = text(b.id, 64, 'Bauleute-ID'), name = text(b.name, 60, 'Name');
    if (builderIds.has(id)) fail(`Bauleute-ID ${id} doppelt`);
    builderIds.add(id);
    if (b.blocksPerSession !== undefined && (!Number.isInteger(b.blocksPerSession) || (b.blocksPerSession as number) < 16 || (b.blocksPerSession as number) > 100_000)) fail(`Bautempo von „${name}“ muss eine ganze Zahl von 16 bis 100000 sein`);
    if (b.note !== undefined && (typeof b.note !== 'string' || b.note.length > 300)) fail(`Notiz von „${name}“ zu lang`);
    if (b.player !== undefined && (typeof b.player !== 'string' || !/^[.*]?[A-Za-z0-9_]{2,16}$/.test(b.player))) fail(`Minecraft-Name von „${name}“ ungültig`);
    if (b.share !== undefined && (!Number.isInteger(b.share) || (b.share as number) < 10 || (b.share as number) > 99)) fail(`Anteil der Bautage von „${name}“ muss 10 bis 99 % sein`);
    if (b.absences !== undefined) checkAbsences(b.absences, name);
  }
  if (!Array.isArray(raw.milestones) || raw.milestones.length > MAX_MILESTONES) fail(`höchstens ${MAX_MILESTONES} Meilensteine`);
  const milestoneIds = new Set<string>();
  for (const m of raw.milestones as unknown[]) {
    if (!isObj(m)) return fail('Meilenstein ist kein Objekt');
    const id = text(m.id, 64, 'Meilenstein-ID'), name = text(m.name, 80, 'Meilensteinname');
    if (milestoneIds.has(id)) fail(`Meilenstein-ID ${id} doppelt`);
    milestoneIds.add(id);
    if (m.note !== undefined && (typeof m.note !== 'string' || m.note.length > 500)) fail(`Notiz von „${name}“ zu lang`);
    if (m.due !== undefined) checkDate(m.due, `Termin von „${name}“`);
    if (!Array.isArray(m.sectionIds) || m.sectionIds.some(s => typeof s !== 'string' || !s)) fail(`„${name}“: Abschnittsliste ungültig`);
    if (new Set(m.sectionIds as string[]).size !== (m.sectionIds as string[]).length) fail(`„${name}“: Abschnitt doppelt zugeordnet`);
  }
  if (!Array.isArray(raw.dependencies) || raw.dependencies.length > MAX_DEPENDENCIES) fail(`höchstens ${MAX_DEPENDENCIES} Abhängigkeiten`);
  const seen = new Set<string>();
  for (const d of raw.dependencies as unknown[]) {
    if (!isObj(d) || typeof d.before !== 'string' || !d.before || typeof d.after !== 'string' || !d.after) return fail('Abhängigkeit ungültig');
    if (d.before === d.after) fail('ein Abschnitt kann nicht von sich selbst abhängen');
    const key = `${d.before}>${d.after}`;
    if (seen.has(key)) fail('Abhängigkeit doppelt');
    seen.add(key);
    if (d.note !== undefined && (typeof d.note !== 'string' || d.note.length > 200)) fail('Abhängigkeitsnotiz zu lang');
  }
  const cycle = dependencyCycle(raw.dependencies as Dependency[]);
  if (cycle) fail(`Abhängigkeiten bilden einen Kreis (${cycle.join(' → ')})`);
  if (!isObj(raw.assignments)) fail('Zuweisungen fehlen');
  for (const [sectionId, ids] of Object.entries(raw.assignments as Record<string, unknown>)) {
    if (!sectionId || !Array.isArray(ids) || ids.some(i => typeof i !== 'string' || !builderIds.has(i))) fail(`Zuweisung für Abschnitt ${sectionId} nennt unbekannte Bauleute`);
    if (new Set(ids as string[]).size !== (ids as string[]).length) fail(`Zuweisung für Abschnitt ${sectionId} doppelt`);
  }
  if (raw.start !== undefined) checkDate(raw.start, 'Startdatum');
  if (raw.sessionsPerWeek !== undefined && (!Number.isInteger(raw.sessionsPerWeek) || (raw.sessionsPerWeek as number) < 1 || (raw.sessionsPerWeek as number) > 7)) fail('Bautage je Woche müssen 1 bis 7 sein');
  if (raw.waitForMaterial !== undefined && raw.waitForMaterial !== true) fail('„Auf Material warten“ ist ungültig');
  if (raw.baseline !== undefined) checkBaseline(raw.baseline);
  if (raw.baselines !== undefined) {
    if (!Array.isArray(raw.baselines) || raw.baselines.length > MAX_BASELINES) fail(`höchstens ${MAX_BASELINES} frühere Basispläne`);
    for (const b of raw.baselines as unknown[]) checkBaseline(b);
  }
  if (raw.after !== undefined) {
    if (!Array.isArray(raw.after) || !raw.after.length || raw.after.length > MAX_PROJECT_AFTER) fail(`1 bis ${MAX_PROJECT_AFTER} vorherige Projekte`);
    const ids = new Set<string>();
    for (const a of raw.after as unknown[]) {
      if (!isObj(a) || typeof a.projectId !== 'string' || !a.projectId || a.projectId.length > 128) return fail('vorheriges Projekt ungültig');
      if (ids.has(a.projectId)) fail('vorheriges Projekt doppelt');
      ids.add(a.projectId);
      if (Object.keys(a).some(k => k !== 'projectId' && k !== 'note')) fail('vorheriges Projekt: unbekannte Felder');
      if (a.note !== undefined && (typeof a.note !== 'string' || a.note.length > 200)) fail('Notiz zum vorherigen Projekt zu lang');
    }
  }
  return raw as unknown as BuildProgram;
}

function checkAbsences(raw: unknown, name: string): void {
  if (!Array.isArray(raw) || raw.length > MAX_ABSENCES) return void fail(`„${name}“: höchstens ${MAX_ABSENCES} Abwesenheiten`);
  let last = -Infinity;
  for (const a of raw as unknown[]) {
    if (!isObj(a)) return void fail(`„${name}“: Abwesenheit ungültig`);
    const from = parseDay(checkDate(a.from, `Abwesenheit von „${name}“: Beginn`))!, to = parseDay(checkDate(a.to, `Abwesenheit von „${name}“: Ende`))!;
    if (from > to) fail(`Abwesenheit von „${name}“ endet vor ihrem Beginn`);
    if (to - from > 366) fail(`Abwesenheit von „${name}“ ist länger als ein Jahr`);
    if (from < last) fail(`Abwesenheiten von „${name}“ sind nicht nach Beginn geordnet`);
    last = from;
    if (a.note !== undefined && (typeof a.note !== 'string' || a.note.length > 80)) fail(`Notiz einer Abwesenheit von „${name}“ zu lang`);
  }
}

const MAX_BASELINE_ENTRIES = 4096;
function checkBaseline(raw: unknown): void {
  if (!isObj(raw)) return void fail('Basisplan ist kein Objekt');
  checkDate(raw.at, 'Datum des Basisplans');
  if (raw.name !== undefined && (typeof raw.name !== 'string' || !raw.name.trim() || raw.name.length > 60)) fail('Name des Basisplans braucht 1–60 Zeichen');
  if (raw.end !== undefined) checkDate(raw.end, 'Ende des Basisplans');
  if (!isObj(raw.sections) || Object.keys(raw.sections).length > MAX_BASELINE_ENTRIES) fail('Basisplan: Abschnitte ungültig');
  for (const v of Object.values(raw.sections as Record<string, unknown>)) {
    if (!isObj(v)) return void fail('Basisplan: Abschnitt ungültig');
    const a = parseDay(checkDate(v.start, 'Basisplan: Abschnittsbeginn')), b = parseDay(checkDate(v.end, 'Basisplan: Abschnittsende'));
    if (a! > b!) fail('Basisplan: Abschnitt endet vor seinem Beginn');
  }
  if (!isObj(raw.milestones) || Object.keys(raw.milestones).length > MAX_MILESTONES) fail('Basisplan: Meilensteine ungültig');
  for (const v of Object.values(raw.milestones as Record<string, unknown>)) checkDate(v, 'Basisplan: Meilensteintermin');
}

// ---------------------------------------------------------------------------
// Edits (pure: SitePlan → SitePlan). Wrap the result with `siteOperation`.

const withProgram = (site: SitePlan, program: BuildProgram | null): SitePlan => {
  const { program: _old, ...rest } = site;
  void _old;
  return program ? { ...rest, program } : rest;
};
/** Replaces the whole program; null removes it. */
export function setProgram(site: SitePlan, program: BuildProgram | null): SitePlan {
  return withProgram(site, program ? checkProgram(structuredClone(program)) : null);
}
const edit = (site: SitePlan, f: (p: BuildProgram) => BuildProgram): SitePlan => { const p = programOf(site), next = f(p); return next === p && site.program ? site : withProgram(site, next); };

/** PROJ-04: this project starts only after `projectId` is finished. Self links are refused; cycles across projects are checked in projectOrder.ts. */
export function addProjectAfter(site: SitePlan, ownId: string, projectId: string, note?: string): SitePlan {
  if (projectId === ownId) fail('ein Projekt kann nicht nach sich selbst kommen');
  return edit(site, p => {
    const list = p.after ?? [];
    if (list.some(a => a.projectId === projectId)) fail('dieses Projekt ist schon eingetragen');
    if (list.length >= MAX_PROJECT_AFTER) fail(`höchstens ${MAX_PROJECT_AFTER} vorherige Projekte`);
    return { ...p, after: [...list, { projectId, ...(note?.trim() && { note: note.trim().slice(0, 200) }) }] };
  });
}
export function removeProjectAfter(site: SitePlan, projectId: string): SitePlan {
  return edit(site, p => {
    const list = (p.after ?? []).filter(a => a.projectId !== projectId);
    const next: { -readonly [K in keyof BuildProgram]: BuildProgram[K] } = { ...p };
    if (list.length) next.after = list; else delete next.after;
    return next;
  });
}

export function addBuilder(site: SitePlan, name: string, blocksPerSession?: number, id = newId('bld')): SitePlan {
  return edit(site, p => ({ ...p, builders: [...p.builders, { id, name: name.trim(), ...(blocksPerSession !== undefined && { blocksPerSession }) }] }));
}
export function updateBuilder(site: SitePlan, id: string, patch: { name?: string; blocksPerSession?: number | null; note?: string; player?: string | null; share?: number | null }): SitePlan {
  return edit(site, p => {
    if (!p.builders.some(b => b.id === id)) fail(`Bauleute-Eintrag ${id} existiert nicht`);
    return { ...p, builders: p.builders.map(b => {
      if (b.id !== id) return b;
      const next: { -readonly [K in keyof Builder]: Builder[K] } = { ...b, ...(patch.name !== undefined && { name: patch.name.trim() }) };
      if (patch.blocksPerSession !== undefined) { if (patch.blocksPerSession === null) delete next.blocksPerSession; else next.blocksPerSession = patch.blocksPerSession; }
      if (patch.note !== undefined) { if (patch.note.trim()) next.note = patch.note.trim(); else delete next.note; }
      if (patch.player !== undefined) { if (patch.player?.trim()) next.player = patch.player.trim(); else delete next.player; }
      if (patch.share !== undefined) {
        if (patch.share === null || patch.share >= 100) delete next.share;
        else if (!Number.isInteger(patch.share) || patch.share < 10) fail('Anteil der Bautage muss 10 bis 100 % sein');
        else next.share = patch.share;
      }
      return next;
    }) };
  });
}
/** Removes a builder and every assignment to it. */
export function removeBuilder(site: SitePlan, id: string): SitePlan {
  return edit(site, p => ({ ...p, builders: p.builders.filter(b => b.id !== id),
    assignments: Object.fromEntries(Object.entries(p.assignments).map(([s, ids]) => [s, ids.filter(b => b !== id)]).filter(([, ids]) => (ids as string[]).length)) }));
}
/** PROJ-03: adds an absence (inclusive dates); overlapping or adjacent ones of the same builder are joined. */
export function addAbsence(site: SitePlan, builderId: string, from: string, to: string, note?: string): SitePlan {
  return edit(site, p => {
    const b = p.builders.find(x => x.id === builderId);
    if (!b) return fail(`Bauleute-Eintrag ${builderId} existiert nicht`);
    const a = parseDay(checkDate(from, 'Beginn der Abwesenheit'))!, z = parseDay(checkDate(to, 'Ende der Abwesenheit'))!;
    if (a > z) fail('Die Abwesenheit endet vor ihrem Beginn');
    const clean = note?.trim().slice(0, 80);
    const list = [...(b.absences ?? []), { from, to, ...(clean && { note: clean }) }].sort((x, y) => x.from.localeCompare(y.from));
    const joined: Absence[] = [];
    for (const x of list) {
      const prev = joined.at(-1);
      if (prev && parseDay(x.from)! <= parseDay(prev.to)! + 1) {
        const note2 = [prev.note, x.note].filter(Boolean).join(' · ').slice(0, 80);
        joined[joined.length - 1] = { from: prev.from, to: x.to > prev.to ? x.to : prev.to, ...(note2 && { note: note2 }) };
      } else joined.push(x);
    }
    checkAbsences(joined, b.name);
    return { ...p, builders: p.builders.map(x => x.id === builderId ? { ...x, absences: joined } : x) };
  });
}
/** PROJ-03: removes the absence at `index` of a builder. */
export function removeAbsence(site: SitePlan, builderId: string, index: number): SitePlan {
  return edit(site, p => ({ ...p, builders: p.builders.map(b => {
    if (b.id !== builderId || !b.absences?.[index]) return b;
    const rest = b.absences.filter((_, i) => i !== index);
    const { absences: _a, ...without } = b; void _a;
    return rest.length ? { ...b, absences: rest } : without;
  }) }));
}
/** True when the builder does not build on that day (days since the epoch). */
export function absentOn(builder: Pick<Builder, 'absences'>, day: number): boolean {
  for (const a of builder.absences ?? []) { const f = parseDay(a.from)!, t = parseDay(a.to)!; if (day >= f && day <= t) return true; }
  return false;
}

/** Sets who builds a section (empty = unassigned). */
export function assignSection(site: SitePlan, sectionId: string, builderIds: readonly string[]): SitePlan {
  return edit(site, p => {
    const ids = [...new Set(builderIds)].filter(id => p.builders.some(b => b.id === id));
    const assignments = { ...p.assignments };
    if (ids.length) assignments[sectionId] = ids; else delete assignments[sectionId];
    return { ...p, assignments };
  });
}
export function addMilestone(site: SitePlan, name: string, sectionIds: readonly string[] = [], due?: string, id = newId('ms')): SitePlan {
  return edit(site, p => ({ ...p, milestones: [...p.milestones, { id, name: name.trim(), sectionIds: [...new Set(sectionIds)], ...(due && { due }) }] }));
}
export function updateMilestone(site: SitePlan, id: string, patch: { name?: string; note?: string; due?: string | null; sectionIds?: readonly string[] }): SitePlan {
  return edit(site, p => {
    if (!p.milestones.some(m => m.id === id)) fail(`Meilenstein ${id} existiert nicht`);
    return { ...p, milestones: p.milestones.map(m => {
      if (m.id !== id) return m;
      const next: { -readonly [K in keyof Milestone]: Milestone[K] } = { ...m, ...(patch.name !== undefined && { name: patch.name.trim() }), ...(patch.sectionIds !== undefined && { sectionIds: [...new Set(patch.sectionIds)] }) };
      if (patch.note !== undefined) { if (patch.note.trim()) next.note = patch.note.trim(); else delete next.note; }
      if (patch.due !== undefined) { if (patch.due) next.due = patch.due; else delete next.due; }
      return next;
    }) };
  });
}
export function removeMilestone(site: SitePlan, id: string): SitePlan {
  return edit(site, p => ({ ...p, milestones: p.milestones.filter(m => m.id !== id) }));
}
/** Moves a milestone one place earlier (-1) or later (+1). */
export function moveMilestone(site: SitePlan, id: string, delta: -1 | 1): SitePlan {
  return edit(site, p => {
    const i = p.milestones.findIndex(m => m.id === id), j = i + delta;
    if (i < 0 || j < 0 || j >= p.milestones.length) return p;
    const milestones = [...p.milestones]; [milestones[i], milestones[j]] = [milestones[j]!, milestones[i]!];
    return { ...p, milestones };
  });
}
/** Adds „after erst nach before“; rejects self references, duplicates and cycles with a readable message. */
export function addDependency(site: SitePlan, before: string, after: string, note?: string): SitePlan {
  return edit(site, p => {
    if (before === after) fail('ein Abschnitt kann nicht von sich selbst abhängen');
    if (p.dependencies.some(d => d.before === before && d.after === after)) return p;
    const dependencies = [...p.dependencies, { before, after, ...(note?.trim() && { note: note.trim() }) }];
    const cycle = dependencyCycle(dependencies);
    if (cycle) {
      const name = new Map(site.sections.map(s => [s.id, s.name]));
      fail(`das ergäbe einen Kreis: ${cycle.map(id => `„${name.get(id) ?? id}“`).join(' → ')}`);
    }
    return { ...p, dependencies };
  });
}
export function removeDependency(site: SitePlan, before: string, after: string): SitePlan {
  return edit(site, p => ({ ...p, dependencies: p.dependencies.filter(d => !(d.before === before && d.after === after)) }));
}
export function setProgramSettings(site: SitePlan, patch: { start?: string | null; sessionsPerWeek?: number | null; waitForMaterial?: boolean }): SitePlan {
  return edit(site, p => {
    const next: { -readonly [K in keyof BuildProgram]: BuildProgram[K] } = { ...p };
    if (patch.waitForMaterial !== undefined) { if (patch.waitForMaterial) next.waitForMaterial = true; else delete next.waitForMaterial; }
    if (patch.start !== undefined) { if (patch.start) next.start = checkDate(patch.start, 'Startdatum'); else delete next.start; }
    if (patch.sessionsPerWeek !== undefined) { if (patch.sessionsPerWeek === null || patch.sessionsPerWeek === DEFAULT_SESSIONS_PER_WEEK) delete next.sessionsPerWeek; else next.sessionsPerWeek = patch.sessionsPerWeek; }
    return next;
  });
}
/** Drops references to sections that no longer exist (used by removeSection/pruneSite). */
export function pruneProgram(program: BuildProgram, sectionIds: ReadonlySet<string>): BuildProgram {
  return {
    ...program,
    milestones: program.milestones.map(m => ({ ...m, sectionIds: m.sectionIds.filter(id => sectionIds.has(id)) })),
    dependencies: program.dependencies.filter(d => sectionIds.has(d.before) && sectionIds.has(d.after)),
    assignments: Object.fromEntries(Object.entries(program.assignments).filter(([id]) => sectionIds.has(id))),
    ...(program.baseline && { baseline: { ...program.baseline, sections: Object.fromEntries(Object.entries(program.baseline.sections).filter(([id]) => sectionIds.has(id))) } }),
    ...(program.baselines && { baselines: program.baselines.map(b => ({ ...b, sections: Object.fromEntries(Object.entries(b.sections).filter(([id]) => sectionIds.has(id))) })) }),
  };
}

/**
 * Freezes the dates of a computed plan as baseline (PROJ-02). Needs a start
 * date, because only dates stay comparable when later plans start from today.
 */
export function setBaseline(site: SitePlan, plan: ProgramPlan, today: string, name?: string): SitePlan {
  if (!plan.start) fail('ein Basisplan braucht ein Startdatum (Einstellungen)');
  checkDate(today, 'Datum');
  const sections: Record<string, { start: string; end: string }> = {};
  for (const s of plan.sections) if (s.sessions > 0 && s.startDate && s.endDate) sections[s.id] = { start: s.startDate, end: s.endDate };
  const milestones: Record<string, string> = {};
  for (const m of plan.milestones) if (m.status !== 'done' && m.endDate) milestones[m.id] = m.endDate;
  const label = name?.trim().slice(0, 60);
  // PROJ-03: the previous baseline is kept as history (newest first).
  return edit(site, p => withBaselines({ ...p, baseline: { at: today, ...(label && { name: label }), ...(plan.endDate && { end: plan.endDate }), sections, milestones } },
    p.baseline ? [p.baseline, ...(p.baselines ?? [])] : p.baselines ?? []));
}
/** Drops the active baseline; the newest earlier one (if any) becomes active. */
export function clearBaseline(site: SitePlan): SitePlan {
  return edit(site, p => {
    if (!p.baseline) return p;
    const { baseline: _b, baselines: _h, ...rest } = p; void _b; void _h;
    const [next, ...older] = p.baselines ?? [];
    return withBaselines(next ? { ...rest, baseline: next } : rest, older);
  });
}
/** PROJ-03: makes an earlier baseline (index in `baselines`) the active one; the active one goes into the history. */
export function activateBaseline(site: SitePlan, index: number): SitePlan {
  return edit(site, p => {
    const pick = p.baselines?.[index];
    if (!pick || !p.baseline) return fail('Diesen früheren Basisplan gibt es nicht');
    return withBaselines({ ...p, baseline: pick }, [p.baseline, ...p.baselines!.filter((_, i) => i !== index)]);
  });
}
/** PROJ-03: removes an earlier baseline from the history. */
export function removeBaseline(site: SitePlan, index: number): SitePlan {
  return edit(site, p => p.baselines?.[index] ? withBaselines(p, p.baselines.filter((_, i) => i !== index)) : p);
}
/** PROJ-03: renames the active baseline (index -1) or an earlier one. */
export function renameBaseline(site: SitePlan, index: number, name: string): SitePlan {
  const label = name.trim().slice(0, 60);
  const named = (b: Baseline): Baseline => { const { name: _n, ...rest } = b; void _n; return label ? { ...rest, name: label } : rest; };
  return edit(site, p => {
    if (index < 0) return p.baseline ? { ...p, baseline: named(p.baseline) } : p;
    return p.baselines?.[index] ? { ...p, baselines: p.baselines.map((b, i) => i === index ? named(b) : b) } : p;
  });
}
const withBaselines = (p: BuildProgram, history: readonly Baseline[]): BuildProgram => {
  const { baselines: _old, ...rest } = p; void _old;
  return history.length ? { ...rest, baselines: history.slice(0, MAX_BASELINES) } : rest;
};

// ---------------------------------------------------------------------------
// Checks and suggestions

export interface ProgramIssue { readonly kind: 'dangling' | 'order' | 'empty' | 'unassigned'; readonly message: string; readonly milestoneId?: string; readonly sectionId?: string }

/** Plan checks: references to removed sections, dependencies against the build order, milestones without sections. */
export function programIssues(site: SitePlan): ProgramIssue[] {
  const program = programOf(site), issues: ProgramIssue[] = [];
  const name = new Map(site.sections.map(s => [s.id, s.name])), rank = new Map(site.sections.map((s, i) => [s.id, i]));
  for (const m of program.milestones) {
    const missing = m.sectionIds.filter(id => !name.has(id)).length;
    if (missing) issues.push({ kind: 'dangling', milestoneId: m.id, message: `Meilenstein „${m.name}“ verweist auf ${missing} entfernte${missing === 1 ? 'n Abschnitt' : ' Abschnitte'}.` });
    if (!m.sectionIds.length) issues.push({ kind: 'empty', milestoneId: m.id, message: `Meilenstein „${m.name}“ hat keine Abschnitte.` });
  }
  for (const d of program.dependencies) {
    if (!name.has(d.before) || !name.has(d.after)) { issues.push({ kind: 'dangling', message: 'Eine Abhängigkeit verweist auf einen entfernten Abschnitt.' }); continue; }
    if (rank.get(d.before)! > rank.get(d.after)!) issues.push({ kind: 'order', sectionId: d.after, message: `„${name.get(d.after)}“ soll erst nach „${name.get(d.before)}“ gebaut werden, steht in der Bau-Reihenfolge aber davor.` });
  }
  for (const id of Object.keys(program.assignments)) if (!name.has(id)) issues.push({ kind: 'dangling', message: 'Eine Zuweisung verweist auf einen entfernten Abschnitt.' });
  if (program.builders.length > 1) {
    const unassigned = site.sections.filter(s => !program.assignments[s.id]?.length);
    if (unassigned.length) issues.push({ kind: 'unassigned', message: `${unassigned.length} Abschnitt${unassigned.length === 1 ? ' ist' : 'e sind'} niemandem zugewiesen (zählen als eigene Spur mit Projekt-Bautempo).` });
  }
  return issues;
}

export interface DependencySuggestion {
  readonly before: string;
  readonly after: string;
  readonly kind: 'geometry' | 'connector';
  readonly count: number;
  readonly reason: string;
}

/**
 * Dependencies the geometry implies: steps of one section that need a
 * prerequisite step (support, hanging block …) in another section, and
 * connector links between instances of two sections (earlier section first).
 * Existing dependencies and pairs that would form a cycle are left out.
 */
export function suggestDependencies(site: SitePlan, project: Pick<Project, 'instances' | 'links'>, guide: Guide): DependencySuggestion[] {
  const program = programOf(site), name = new Map(site.sections.map(s => [s.id, s.name])), rank = new Map(site.sections.map((s, i) => [s.id, i]));
  const sectionOf = new Map<string, string | null>();
  for (const step of guide.steps) sectionOf.set(step.id, sectionOfStep(site, step));
  const found = new Map<string, DependencySuggestion>();
  const add = (before: string, after: string, kind: DependencySuggestion['kind']) => {
    const key = `${before}>${after}`, e = found.get(key);
    if (e) found.set(key, { ...e, count: e.count + 1 });
    else found.set(key, { before, after, kind, count: 1, reason: '' });
  };
  for (const step of guide.steps) {
    const own = sectionOf.get(step.id);
    if (!own) continue;
    for (const p of step.prerequisites) { const other = sectionOf.get(p); if (other && other !== own) add(other, own, 'geometry'); }
  }
  const instSection = new Map<string, string>();
  for (const s of site.sections) for (const m of s.members) if (!instSection.has(m.instanceId)) instSection.set(m.instanceId, s.id);
  for (const l of project.links) {
    const a = instSection.get(l.a.instanceId), b = instSection.get(l.b.instanceId);
    if (!a || !b || a === b) continue;
    const [before, after] = rank.get(a)! <= rank.get(b)! ? [a, b] : [b, a];
    if (!found.has(`${before}>${after}`)) add(before, after, 'connector');
  }
  const existing = new Set(program.dependencies.map(d => `${d.before}>${d.after}`));
  const result: DependencySuggestion[] = [];
  let deps = [...program.dependencies];
  for (const s of [...found.values()].sort((a, b) => rank.get(a.before)! - rank.get(b.before)! || rank.get(a.after)! - rank.get(b.after)!)) {
    if (existing.has(`${s.before}>${s.after}`)) continue;
    if (dependencyCycle([...deps, s])) continue;
    deps = [...deps, s];
    result.push({ ...s, reason: s.kind === 'geometry'
      ? `${s.count} Schritt${s.count === 1 ? '' : 'e'} in „${name.get(s.after)}“ brauch${s.count === 1 ? 't' : 'en'} Vorarbeit aus „${name.get(s.before)}“ (z. B. Stütze darunter).`
      : `Anschluss zwischen „${name.get(s.before)}“ und „${name.get(s.after)}“ – in Bau-Reihenfolge.` });
  }
  return result;
}

export type ProgramPreset = 'phases' | 'chain' | 'stages';
export const PROGRAM_PRESET_LABEL: Readonly<Record<ProgramPreset, string>> = {
  phases: 'Meilensteine aus Abschnittsnamen (Phase 1, 2 …)', chain: 'Strenge Reihenfolge: jeder Abschnitt nach dem vorigen', stages: 'Etappen: vier Meilensteine über die Bau-Reihenfolge',
};
const PHASE = /^(?:bau)?(?:phase|stufe|etappe|abschnitt)\s*(\d+)\b/i;

/**
 * Starting point for the program of a large project. `phases`: sections named
 * „Phase N …“ become milestone N (sections before the first phase – ways,
 * squares – become „Erschließung“), each phase depends on all sections of the
 * previous one. `chain`: every section depends on the previous one, one
 * milestone per section. `stages`: four milestones over the build order,
 * stages depend on each other. Existing builders and assignments are kept;
 * milestones and dependencies are replaced.
 */
export function suggestProgram(site: SitePlan, preset: ProgramPreset = 'phases', makeId: () => string = () => newId('ms')): SitePlan {
  const program = programOf(site), sections = site.sections;
  if (!sections.length) return site;
  const groups: { name: string; ids: string[] }[] = [];
  if (preset === 'phases') {
    const lead: string[] = [], byPhase = new Map<number, string[]>();
    for (const s of sections) {
      const m = PHASE.exec(s.name.trim());
      if (m) (byPhase.get(Number(m[1])) ?? (byPhase.set(Number(m[1]), []), byPhase.get(Number(m[1]))!)).push(s.id);
      else if (!byPhase.size) lead.push(s.id);
      else { const last = [...byPhase.keys()].at(-1)!; byPhase.get(last)!.push(s.id); }
    }
    if (!byPhase.size) return suggestProgram(site, sections.length <= 6 ? 'chain' : 'stages', makeId);
    if (lead.length) groups.push({ name: 'Erschließung', ids: lead });
    for (const [n, ids] of [...byPhase.entries()].sort((a, b) => a[0] - b[0])) groups.push({ name: `Phase ${n}`, ids });
  } else if (preset === 'chain') {
    for (const s of sections) groups.push({ name: s.name, ids: [s.id] });
  } else {
    const n = Math.min(4, sections.length), size = Math.ceil(sections.length / n);
    for (let i = 0; i < sections.length; i += size) groups.push({ name: `Etappe ${groups.length + 1}`, ids: sections.slice(i, i + size).map(s => s.id) });
  }
  const dependencies: Dependency[] = [];
  for (let g = 1; g < groups.length; g++) for (const before of groups[g - 1]!.ids) for (const after of groups[g]!.ids) dependencies.push({ before, after });
  const milestones: Milestone[] = groups.map(g => ({ id: makeId(), name: g.name, sectionIds: g.ids }));
  return withProgram(site, { ...program, milestones, dependencies: dependencies.slice(0, MAX_DEPENDENCIES) });
}

// ---------------------------------------------------------------------------
// Schedule

export type SectionState = 'done' | 'ready' | 'blocked' | 'open';
export const SECTION_STATE_LABEL: Readonly<Record<SectionState, string>> = { done: 'fertig', ready: 'bereit', blocked: 'wartet', open: 'in Arbeit' };

export interface ScheduledSection {
  readonly id: string;
  readonly name: string;
  readonly builderIds: readonly string[];
  readonly blocks: number;
  readonly blocksDone: number;
  /** Blocks still to place. */
  readonly openWork: number;
  /** Building days needed at the combined pace of the assigned builders. */
  readonly sessions: number;
  /** 0-based building day index; end exclusive. Done sections have start = end = 0. */
  readonly start: number;
  readonly end: number;
  readonly startDate: string | null;
  readonly endDate: string | null;
  /** Unfinished sections this one waits for. */
  readonly waitingFor: readonly string[];
  readonly state: SectionState;
  /** No slack: a delay here delays the whole project. */
  readonly critical: boolean;
  readonly milestoneIds: readonly string[];
  /** PROJ-02, only when the plan waits for material: building day from which the material is there (null = items without rate). */
  readonly materialDay?: number | null;
  /** Building days the start moved because the material was not there yet. */
  readonly materialWait?: number;
  /** PROJ-02: position in the baseline (building-day indices of this plan, may be negative) and the slip of the end in building days. */
  readonly baseline?: { readonly start: number; readonly end: number };
  readonly slip?: number;
  /** PROJ-03: building days lost because the assigned builders are away (later start, days with nobody there). */
  readonly absent?: number;
}

export interface BuilderLoad {
  readonly id: string;
  readonly name: string;
  readonly blocksPerSession: number;
  readonly sectionIds: readonly string[];
  readonly sessions: number;
  readonly blocks: number;
  readonly blocksDone: number;
  /** First assigned section that is ready and not done. */
  readonly nextId: string | null;
  /** Build items still missing for the assigned sections. */
  readonly items: readonly BuildItemLine[];
  readonly gather: readonly GatherLine[];
  readonly gatherHours: number;
}

export type MilestoneStatus = 'done' | 'ok' | 'late' | 'open';
export const MILESTONE_STATUS_LABEL: Readonly<Record<MilestoneStatus, string>> = { done: 'erreicht', ok: 'im Plan', late: 'verspätet', open: 'offen' };

export interface MilestoneState {
  readonly id: string;
  readonly name: string;
  readonly note?: string;
  readonly due?: string;
  readonly sectionIds: readonly string[];
  readonly blocks: number;
  readonly blocksDone: number;
  readonly steps: number;
  readonly done: number;
  /** Building day on which the last section ends (exclusive); 0 when complete. */
  readonly end: number;
  readonly endDate: string | null;
  readonly status: MilestoneStatus;
  readonly itemsNeeded: number;
  readonly itemsMissing: number;
  readonly gatherHours: number;
  /** PROJ-02: end in the baseline and slip against it in building days (positive = later). */
  readonly baselineEnd?: string;
  readonly slip?: number;
}

export interface ProgramPlan {
  readonly sections: readonly ScheduledSection[];
  readonly builders: readonly BuilderLoad[];
  readonly milestones: readonly MilestoneState[];
  /** Total building days until the last section ends. */
  readonly sessions: number;
  readonly endDate: string | null;
  readonly criticalPath: readonly string[];
  readonly start: string | null;
  /** First building day of the remaining work: the start date, or the next building day from today once the start lies in the past. */
  readonly from: string | null;
  readonly sessionsPerWeek: number;
  readonly notes: readonly string[];
  /** PROJ-02: sections start only when their material is there. */
  readonly waitForMaterial: boolean;
  /** Sections whose material contains items without rate (cannot wait for them). */
  readonly materialUnknown: readonly string[];
  /** PROJ-02: comparison with the frozen baseline. */
  readonly baseline: { readonly at: string; readonly name?: string; readonly end: string | null; readonly slip: number | null } | null;
  /** PROJ-03: earlier baselines with their end and the slip of today's projection against them, newest first. */
  readonly baselines: readonly { readonly at: string; readonly name?: string; readonly end: string | null; readonly slip: number | null; readonly sections: number }[];
}

/** Options of planProgram that come from other modules. */
export interface ProgramOptions {
  /** Section id → play days from today until its material is there (Produktion, `analyzeProduction().sections[].readyDay`). Used when the program waits for material. */
  readonly materialDays?: ReadonlyMap<string, number | null>;
}

const allowedWeekdays = (sessionsPerWeek: number): Set<number> => new Set([1, 2, 3, 4, 5, 6, 0].slice(0, Math.max(1, Math.min(7, sessionsPerWeek))));
const weekday = (day: number): number => (((day + 4) % 7) + 7) % 7; // epoch day 0 = Thursday (4)
const MAX_SPAN_DAYS = 20 * 366;

/** Signed number of building days from `from` to `to` (`to` − `from`, counting [from, to)); null for invalid dates or spans over 20 years. */
export function buildingDaysBetween(from: string, to: string, sessionsPerWeek: number): number | null {
  const a = parseDay(from), b = parseDay(to);
  if (a === null || b === null || Math.abs(b - a) > MAX_SPAN_DAYS) return null;
  const allowed = allowedWeekdays(sessionsPerWeek), lo = Math.min(a, b), hi = Math.max(a, b);
  let n = 0;
  for (let d = lo; d < hi; d++) if (allowed.has(weekday(d))) n++;
  return b >= a ? n : -n;
}

export const UNASSIGNED = '';
const round1 = (n: number): number => Math.round(n * 10) / 10;

/** Calendar for building days: day index → date, honouring the building days per week. */
export function sessionCalendar(start: string | undefined, sessionsPerWeek: number): (session: number) => string | null {
  const day0 = parseDay(start);
  if (day0 === null) return () => null;
  // Monday … Sunday; the first n weekdays are building days.
  const allowed = allowedWeekdays(sessionsPerWeek);
  const cache: number[] = [];
  return (session: number): string => {
    if (session < 0) session = 0;
    let day = cache.length ? cache[cache.length - 1]! + 1 : day0;
    while (cache.length <= session) {
      if (allowed.has(weekday(day))) cache.push(day);
      day++;
    }
    return dayText(cache[session]!);
  };
}

/** Topological order of the sections: dependencies first, build order as tie-break. */
export function sectionOrder(site: SitePlan): string[] {
  const program = programOf(site), ids = site.sections.map(s => s.id), rank = new Map(ids.map((id, i) => [id, i]));
  const indeg = new Map(ids.map(id => [id, 0])), next = new Map<string, string[]>();
  for (const d of program.dependencies) {
    if (!rank.has(d.before) || !rank.has(d.after)) continue;
    indeg.set(d.after, indeg.get(d.after)! + 1);
    (next.get(d.before) ?? (next.set(d.before, []), next.get(d.before)!)).push(d.after);
  }
  const ready = ids.filter(id => !indeg.get(id)), out: string[] = [];
  while (ready.length) {
    ready.sort((a, b) => rank.get(a)! - rank.get(b)!);
    const id = ready.shift()!; out.push(id);
    for (const to of next.get(id) ?? []) { indeg.set(to, indeg.get(to)! - 1); if (!indeg.get(to)) ready.push(to); }
  }
  return out;
}

/**
 * Schedule over building days. Sections run in dependency order (build order as
 * tie-break); each builder is one lane that works on one section at a time, a
 * section assigned to several builders uses their combined pace and occupies
 * every one of them. Unassigned sections share one lane at the project pace.
 * The critical path is the chain without slack through dependency and lane
 * edges. Dates follow the start date and the building days per week; they are
 * projections from the pace settings, never measurements.
 */
export function planProgram(site: SitePlan, overview: SiteOverview, pace: PaceSetting, today?: string, options: ProgramOptions = {}): ProgramPlan {
  const program = programOf(site), plans = new Map(overview.sections.map(s => [s.id, s]));
  const material = program.waitForMaterial ? options.materialDays ?? null : null;
  const sectionIds = new Set(site.sections.map(s => s.id));
  const order = sectionOrder(site);
  const deps = new Map<string, string[]>(), succ = new Map<string, string[]>();
  for (const d of program.dependencies) {
    if (!sectionIds.has(d.before) || !sectionIds.has(d.after)) continue;
    (deps.get(d.after) ?? (deps.set(d.after, []), deps.get(d.after)!)).push(d.before);
    (succ.get(d.before) ?? (succ.set(d.before, []), succ.get(d.before)!)).push(d.after);
  }
  // A builder who takes part in only part of the building days builds proportionally less per day (PROJ-02).
  const rateOf = (b: Builder): number => Math.max(1, Math.round((b.blocksPerSession ?? pace.blocksPerSession) * (b.share ?? 100) / 100));
  const builderById = new Map(program.builders.map(b => [b.id, b]));
  const free = new Map<string, number>([[UNASSIGNED, 0], ...program.builders.map((b): [string, number] => [b.id, 0])]);
  const laneLast = new Map<string, string>();
  const laneNext = new Map<string, string[]>();
  const scheduled = new Map<string, Omit<ScheduledSection, 'critical' | 'startDate' | 'endDate' | 'milestoneIds'>>();
  const milestoneOf = new Map<string, string[]>();
  for (const m of program.milestones) for (const id of m.sectionIds) (milestoneOf.get(id) ?? (milestoneOf.set(id, []), milestoneOf.get(id)!)).push(m.id);
  const perWeek = program.sessionsPerWeek ?? DEFAULT_SESSIONS_PER_WEEK;
  // Remaining work starts at the start date, or today once the start date lies in the past.
  const startDay = parseDay(program.start), todayDay0 = parseDay(today);
  const fromDate = program.start ? (startDay !== null && todayDay0 !== null && todayDay0 > startDay ? today! : program.start) : undefined;
  const calendar = sessionCalendar(fromDate, perWeek);
  // PROJ-03: absences need dates; without a start date they are ignored (note below).
  const withAbsences = !!fromDate && program.builders.some(b => b.absences?.length);
  const dayAt = (i: number): number => parseDay(calendar(i) ?? undefined)!;

  for (const id of order) {
    const p = plans.get(id), name = site.sections.find(s => s.id === id)!.name;
    const blocks = p?.blocks ?? 0, blocksDone = p?.blocksDone ?? 0, openWork = Math.max(0, blocks - blocksDone);
    const complete = p?.complete ?? false;
    const builderIds = (program.assignments[id] ?? []).filter(b => builderById.has(b));
    const lanes = builderIds.length ? builderIds : [UNASSIGNED];
    const rate = builderIds.length ? builderIds.reduce((n, b) => n + rateOf(builderById.get(b)!), 0) : pace.blocksPerSession;
    const waitingFor = (deps.get(id) ?? []).filter(d => scheduled.get(d)?.state !== 'done');
    if (complete || !openWork) {
      scheduled.set(id, { id, name, builderIds, blocks, blocksDone, openWork: 0, sessions: 0, start: 0, end: 0, waitingFor: [], state: 'done' });
      continue;
    }
    const sessions = Math.max(1, Math.ceil(openWork / rate));
    const earliest = Math.max(0, ...(deps.get(id) ?? []).map(d => scheduled.get(d)!.end));
    const withoutMaterial = Math.max(earliest, ...lanes.map(l => free.get(l)!));
    // Material ready after x play days → the section can start on building day ceil(x) (one play day = one building day).
    const raw = material ? material.get(id) : undefined;
    const materialDay = raw === undefined ? undefined : raw === null ? null : Math.ceil(raw - 0.05);
    let start = Math.max(withoutMaterial, materialDay ?? 0), end = start + sessions, absent = 0;
    if (withAbsences && builderIds.some(b => builderById.get(b)!.absences?.length)) {
      // Day by day: only present builders build; the section starts on the first day someone is there.
      const present = (i: number) => builderIds.filter(b => !absentOn(builderById.get(b)!, dayAt(i)));
      const planned = start;
      let guard = 0;
      while (!present(start).length && guard++ < MAX_SPAN_DAYS) start++;
      absent = start - planned;
      let built = 0, i = start;
      while (built < openWork && guard++ < MAX_SPAN_DAYS) {
        const here = present(i);
        if (here.length) built += here.reduce((n, b) => n + rateOf(builderById.get(b)!), 0); else absent++;
        i++;
      }
      end = Math.max(i, start + 1);
    }
    for (const l of lanes) {
      free.set(l, end);
      const prev = laneLast.get(l);
      if (prev) (laneNext.get(prev) ?? (laneNext.set(prev, []), laneNext.get(prev)!)).push(id);
      laneLast.set(l, id);
    }
    const state: SectionState = waitingFor.length ? 'blocked' : blocksDone > 0 || (p?.done ?? 0) > 0 ? 'open' : 'ready';
    scheduled.set(id, { id, name, builderIds, blocks, blocksDone, openWork, sessions: end - start, start, end, waitingFor, state,
      ...(materialDay !== undefined && { materialDay, materialWait: Math.max(0, (materialDay ?? 0) - withoutMaterial) }), ...(absent > 0 && { absent }) });
  }
  const total = Math.max(0, ...[...scheduled.values()].map(s => s.end));
  // Latest start without delaying the end, backwards over dependency and lane successors.
  const latest = new Map<string, number>();
  for (const id of [...order].reverse()) {
    const s = scheduled.get(id)!;
    const followers = [...new Set([...(succ.get(id) ?? []), ...(laneNext.get(id) ?? [])])].map(f => scheduled.get(f)!).filter(f => f.sessions > 0);
    const ls = followers.length ? Math.min(...followers.map(f => latest.get(f.id)!)) - s.sessions : total - s.sessions;
    latest.set(id, ls);
  }
  const from = calendar(0);
  const dateOfEnd = (end: number): string | null => end > 0 ? calendar(end - 1) : null;
  const index = (date: string): number | null => from ? buildingDaysBetween(from, date, perWeek) : null;
  const base = from ? program.baseline : undefined;
  const sections: ScheduledSection[] = order.map(id => {
    const s = scheduled.get(id)!, endDate = s.sessions ? dateOfEnd(s.end) : null, b = base?.sections[id];
    const bStart = b ? index(b.start) : null, bEnd = b ? index(b.end) : null, slip = b && endDate ? buildingDaysBetween(b.end, endDate, perWeek) : null;
    return { ...s, critical: s.sessions > 0 && latest.get(id)! <= s.start, startDate: s.sessions ? calendar(s.start) : null, endDate, milestoneIds: milestoneOf.get(id) ?? [],
      ...(bStart !== null && bEnd !== null && { baseline: { start: bStart, end: bEnd + 1 } }), ...(slip !== null && s.sessions > 0 && { slip }) };
  });
  const criticalPath = sections.filter(s => s.critical).map(s => s.id);

  const merge = <T extends { itemId: string }>(lists: readonly (readonly T[])[], sum: (a: T, b: T) => T): T[] => {
    const m = new Map<string, T>();
    for (const l of lists) for (const x of l) { const e = m.get(x.itemId); m.set(x.itemId, e ? sum(e, x) : x); }
    return [...m.values()];
  };
  const sumItem = (a: BuildItemLine, b: BuildItemLine): BuildItemLine => ({ itemId: a.itemId, need: a.need + b.need, fromStock: a.fromStock + b.fromStock, missing: a.missing + b.missing, assumed: a.assumed || b.assumed });
  const sumGather = (a: GatherLine, b: GatherLine): GatherLine => ({ ...a, need: a.need + b.need, fromStock: a.fromStock + b.fromStock, missing: a.missing + b.missing,
    hours: a.hours === null || b.hours === null ? (a.hours ?? b.hours) : round1(a.hours + b.hours), slots: a.slots + b.slots });
  const builders: BuilderLoad[] = program.builders.map(b => {
    const own = sections.filter(s => s.builderIds.includes(b.id)), plansOwn = own.map(s => plans.get(s.id)).filter((p): p is SectionPlan => !!p && !p.complete);
    const gather = merge(plansOwn.map(p => p.gather), sumGather).filter(g => g.missing > 0).sort((x, y) => y.missing - x.missing);
    return { id: b.id, name: b.name, blocksPerSession: rateOf(b), sectionIds: own.map(s => s.id), sessions: own.reduce((n, s) => n + s.sessions, 0),
      blocks: own.reduce((n, s) => n + s.blocks, 0), blocksDone: own.reduce((n, s) => n + s.blocksDone, 0), nextId: own.find(s => s.state === 'ready' || s.state === 'open')?.id ?? null,
      items: merge(plansOwn.map(p => p.items), sumItem).filter(i => i.missing > 0).sort((x, y) => y.missing - x.missing), gather, gatherHours: round1(gather.reduce((h, g) => h + (g.hours ?? 0), 0)) };
  });
  const todayDay = parseDay(today);
  const milestones: MilestoneState[] = program.milestones.map(m => {
    const own = m.sectionIds.map(id => sections.find(s => s.id === id)).filter((s): s is ScheduledSection => !!s);
    const plansOwn = own.map(s => plans.get(s.id)).filter((p): p is SectionPlan => !!p);
    const end = Math.max(0, ...own.map(s => s.end)), endDate = dateOfEnd(end), complete = own.length > 0 && own.every(s => s.state === 'done');
    const dueDay = parseDay(m.due), endDay = parseDay(endDate ?? undefined);
    const status: MilestoneStatus = complete ? 'done' : dueDay === null ? 'open'
      : endDay !== null ? (endDay <= dueDay ? 'ok' : 'late') : todayDay !== null && todayDay > dueDay ? 'late' : 'open';
    const items = plansOwn.flatMap(p => p.complete ? [] : p.items);
    return { id: m.id, name: m.name, ...(m.note !== undefined && { note: m.note }), ...(m.due !== undefined && { due: m.due }), sectionIds: m.sectionIds,
      blocks: own.reduce((n, s) => n + s.blocks, 0), blocksDone: own.reduce((n, s) => n + s.blocksDone, 0),
      steps: plansOwn.reduce((n, p) => n + p.steps.length, 0), done: plansOwn.reduce((n, p) => n + p.done, 0), end, endDate, status,
      itemsNeeded: items.reduce((n, i) => n + i.need, 0), itemsMissing: items.reduce((n, i) => n + i.missing, 0), gatherHours: round1(plansOwn.reduce((h, p) => h + (p.complete ? 0 : p.gatherHours), 0)),
      ...baselineOf(base?.milestones[m.id], complete ? null : endDate, perWeek) };
  });
  const notes = ['Bautage sind Projektionen aus dem Bautempo (Blöcke je Bautag) und dem Restbedarf der Abschnitte – Annahmen, keine Messung.'];
  if (!program.start) notes.push('Ohne Startdatum zählt der Zeitplan nur Bautage; ein Datum im Abschnitt „Einstellungen“ ergibt Kalendertage.');
  if (sections.some(s => s.builderIds.length === 0 && s.sessions > 0) && program.builders.length) notes.push('Nicht zugewiesene Abschnitte laufen nacheinander in einer eigenen Spur mit dem Projekt-Bautempo.');
  if (fromDate && fromDate !== program.start) notes.push('Das Startdatum liegt in der Vergangenheit: die offene Arbeit beginnt am nächsten Bautag ab heute.');
  if (program.builders.some(b => b.share !== undefined)) notes.push('Bauleute mit Anteil unter 100 % bauen anteilig weniger je Bautag (Tempo × Anteil).');
  if (program.builders.some(b => b.absences?.length)) notes.push(withAbsences ? 'Abwesenheiten sind eingerechnet: an diesen Tagen baut nur, wer da ist; ein Abschnitt beginnt, sobald einer seiner Bauleute da ist.' : 'Abwesenheiten wirken erst mit einem Startdatum (Einstellungen).');
  const materialUnknown = material ? sections.filter(s => s.sessions > 0 && s.materialDay === null).map(s => s.id) : [];
  if (program.waitForMaterial && !material) notes.push('„Auf Material warten“ ist an, aber ohne Produktionsauswertung – der Zeitplan rechnet ohne Material.');
  if (material) notes.push('Abschnitte beginnen erst, wenn ihr Material beisammen ist (Deckung aus dem Reiter „Produktion“: Farmen, Sammelzeit je Tag); ein Spieltag zählt als ein Bautag.');
  if (materialUnknown.length) notes.push(`${materialUnknown.length} Abschnitt${materialUnknown.length === 1 ? ' enthält' : 'e enthalten'} Items ohne Sammel-Richtwert – dort kann der Plan nicht auf Material warten.`);
  const endDate = dateOfEnd(total);
  const compare = (b: Baseline) => ({ at: b.at, ...(b.name && { name: b.name }), end: b.end ?? null, slip: b.end && endDate ? buildingDaysBetween(b.end, endDate, perWeek) : null });
  const baseline = base ? compare(base) : null;
  const baselines = (from ? program.baselines ?? [] : []).map(b => ({ ...compare(b), sections: Object.keys(b.sections).length }));
  return { sections, builders, milestones, sessions: total, endDate, criticalPath, start: program.start ?? null, from, sessionsPerWeek: perWeek, notes,
    waitForMaterial: !!material, materialUnknown, baseline, baselines };
}

const baselineOf = (baseEnd: string | undefined, endDate: string | null, perWeek: number): { baselineEnd?: string; slip?: number } => {
  if (!baseEnd) return {};
  const slip = endDate ? buildingDaysBetween(baseEnd, endDate, perWeek) : null;
  return { baselineEnd: baseEnd, ...(slip !== null && { slip }) };
};

// ---------------------------------------------------------------------------
// Text output

const short = (id: string): string => id.replace(/^minecraft:/, '');
const deDate = (iso: string | null): string => iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : '';
const when = (s: Pick<ScheduledSection, 'start' | 'end' | 'startDate' | 'endDate' | 'sessions'>): string =>
  s.sessions === 0 ? 'fertig' : s.startDate ? `${deDate(s.startDate)} – ${deDate(s.endDate)} (${s.sessions} Bautag${s.sessions === 1 ? '' : 'e'})` : `Bautag ${s.start + 1}–${s.end} (${s.sessions})`;

/** The whole program as plain text to share with the team. */
export function programText(plan: ProgramPlan, site: SitePlan, title: string): string {
  const program = programOf(site), name = new Map(site.sections.map(s => [s.id, s.name])), builder = new Map(plan.builders.map(b => [b.id, b.name]));
  const lines = [`Bauprogramm: ${title}`, `Dauer: ${plan.sessions} Bautag${plan.sessions === 1 ? '' : 'e'}${plan.endDate ? ` · Ende ${deDate(plan.endDate)}` : ''}${plan.start ? ` · Start ${deDate(plan.start)} · ${plan.sessionsPerWeek} Bautage je Woche` : ''}`, ''];
  if (plan.milestones.length) {
    lines.push('Meilensteine');
    for (const m of plan.milestones) lines.push(`- ${m.name}${m.due ? ` (bis ${deDate(m.due)})` : ''}: ${MILESTONE_STATUS_LABEL[m.status]}${m.status !== 'done' && m.endDate ? `, voraussichtlich ${deDate(m.endDate)}` : m.status !== 'done' && m.end ? `, Bautag ${m.end}` : ''} · ${m.done}/${m.steps} Schritte · ${m.blocksDone}/${m.blocks} Blöcke${m.itemsMissing ? ` · ${m.itemsMissing} Bauitems fehlen` : ''}`);
    lines.push('');
  }
  lines.push('Abschnitte in Planreihenfolge');
  for (const s of plan.sections) lines.push(`- ${s.name}: ${when(s)}${s.builderIds.length ? ` · ${s.builderIds.map(b => builder.get(b) ?? b).join(', ')}` : ''}${s.waitingFor.length ? ` · wartet auf ${s.waitingFor.map(w => name.get(w) ?? w).join(', ')}` : ''}${s.critical ? ' · kritisch' : ''}`);
  if (program.dependencies.length) {
    lines.push('', 'Abhängigkeiten');
    for (const d of program.dependencies) lines.push(`- ${name.get(d.after) ?? d.after} erst nach ${name.get(d.before) ?? d.before}${d.note ? ` (${d.note})` : ''}`);
  }
  if (plan.builders.length) {
    lines.push('', 'Bauleute');
    for (const b of plan.builders) lines.push(`- ${b.name}: ${b.sectionIds.length} Abschnitt${b.sectionIds.length === 1 ? '' : 'e'}, ${b.sessions} Bautag${b.sessions === 1 ? '' : 'e'}, ${b.blocksDone}/${b.blocks} Blöcke${b.nextId ? ` · als Nächstes ${name.get(b.nextId)}` : ''}`);
  }
  lines.push('', ...plan.notes.map(n => `Hinweis: ${n}`));
  return lines.join('\n');
}

/** Personal sheet for one builder: their sections in order, missing items and gathering. */
export function builderText(plan: ProgramPlan, site: SitePlan, builderId: string, title: string): string {
  const b = plan.builders.find(x => x.id === builderId);
  if (!b) throw new DomainError('NOT_FOUND', 'Bauleute-Eintrag existiert nicht');
  const name = new Map(site.sections.map(s => [s.id, s.name]));
  const lines = [`Bauzettel für ${b.name} – ${title}`, `${b.sessions} Bautag${b.sessions === 1 ? '' : 'e'} bei ${b.blocksPerSession} Blöcken je Bautag · ${b.blocksDone}/${b.blocks} Blöcke gebaut`, ''];
  lines.push('Deine Abschnitte');
  for (const id of b.sectionIds) { const s = plan.sections.find(x => x.id === id)!; lines.push(`- ${s.name}: ${when(s)} · ${SECTION_STATE_LABEL[s.state]}${s.waitingFor.length ? ` (wartet auf ${s.waitingFor.map(w => name.get(w) ?? w).join(', ')})` : ''}`); }
  if (b.items.length) { lines.push('', 'Noch fehlende Bauitems'); for (const i of b.items) lines.push(`- ${short(i.itemId)}: ${i.missing}${i.assumed ? ' (Annahme)' : ''}`); }
  if (b.gather.length) { lines.push('', `Sammeln (Richtwert ${b.gatherHours} h)`); for (const g of b.gather) lines.push(`- ${short(g.itemId)}: ${g.missing}${g.rule ? ` · ${g.rule.activity}` : ''}${g.hours !== null ? ` · ${g.hours} h` : ''}`); }
  return lines.join('\n');
}

/** Cheap summary without geometry (project cards): milestone count and the next dated milestone. */
export function programSummary(site: Pick<SitePlan, 'program'>, today?: string): { milestones: number; builders: number; next: Milestone | null } {
  const p = programOf(site), day = parseDay(today);
  const dated = p.milestones.filter(m => m.due && (day === null || parseDay(m.due)! >= day)).sort((a, b) => a.due!.localeCompare(b.due!));
  return { milestones: p.milestones.length, builders: p.builders.length, next: dated[0] ?? p.milestones[0] ?? null };
}
