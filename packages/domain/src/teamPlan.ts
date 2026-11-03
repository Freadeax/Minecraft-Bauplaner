import type { PaceSetting } from './buildRun.js';
import { stepWork } from './buildRun.js';
import type { Guide, GuideProgress, GuideStep } from './guide.js';
import type { MaterialReport } from './materials.js';
import { memberMatches, sectionOfStep } from './sectionMembership.js';
import type { SectionMember, SiteOverview, SitePlan, SiteSection } from './site.js';
import { canTeam, TEAM_ROLES } from './team.js';
import type { ItemCount, SectionTeamStatus, TeamAction, TeamContext, TeamEvent, TeamEventBody, TeamRole, TeamState, TeamView } from './team.js';
import { teamView } from './team.js';
import { DomainError } from './types.js';

/**
 * Teamplanung (COOP-06, docs/architecture/TEAMBAU.md §18). Pure helpers on top of the team log
 * (team.ts) and the site plan (site.ts) for planning a big build with several players:
 *
 *  - work packages: split one section into team-sized parts (by layers or by building parts);
 *  - section work and dependencies from the guide (open blocks, prerequisites);
 *  - an assignment proposal and a parallel schedule per member (building days, waiting times,
 *    critical path, absences);
 *  - material per section and per member (open need, stock, being gathered, reported deliveries);
 *  - a progress board with "Achtung" hints (stale reports, idle owners, ticks vs. reports …);
 *  - fixes for merge conflicts and rejected events as ready-made team events;
 *  - plan-release comparison per section (which steps changed since the released plan);
 *  - the rights matrix.
 *
 * Nothing here writes: results are proposals the interface turns into team events or site edits.
 * Times are planning aids from the building pace, never measurements.
 */

const MAX_SECTIONS = 64;
const DAY = 86_400_000;
const isoDay = (iso: string): string => iso.slice(0, 10);
const daysBetween = (from: string, to: string): number => Math.floor((Date.parse(to) - Date.parse(from)) / DAY);

// ---------------------------------------------------------------- work packages

export type SplitMode = 'layers' | 'instances' | 'auto';
export const SPLIT_MODE_LABEL: Readonly<Record<SplitMode, string>> = {
  auto: 'automatisch', layers: 'nach Schichten (übereinander)', instances: 'nach Bauteilen (nebeneinander)',
};

export interface WorkPackage {
  readonly id: string;
  readonly name: string;
  readonly members: readonly SectionMember[];
  /** Work (placed + removed cells) of all steps of the part. */
  readonly work: number;
  readonly steps: number;
  /** Readable range, e.g. "Bergfried Schicht 0–7, Torhaus". */
  readonly range: string;
}

export interface SplitResult {
  readonly site: SitePlan;
  readonly parts: readonly WorkPackage[];
  /** The mode actually used (auto resolves to layers or instances). */
  readonly mode: Exclude<SplitMode, 'auto'>;
  /** Largest part relative to the ideal share (1 = perfectly even). */
  readonly balance: number;
}

interface Unit { readonly memberIndex: number; readonly instanceId: string; readonly layer: number; readonly work: number; readonly steps: number }

/** Steps of a section (first-match rule) grouped into (member, layer) units in build order. */
function sectionUnits(site: Pick<SitePlan, 'sections'>, guide: Guide, section: SiteSection): Unit[] {
  const units = new Map<string, { memberIndex: number; instanceId: string; layer: number; work: number; steps: number }>();
  for (const step of guide.steps) {
    if (sectionOfStep(site, step) !== section.id) continue;
    const memberIndex = section.members.findIndex(m => memberMatches(m, step));
    if (memberIndex < 0) continue;
    const key = `${memberIndex}\u0000${step.layer}`;
    const u = units.get(key);
    if (u) { u.work += stepWork(step); u.steps++; } else units.set(key, { memberIndex, instanceId: step.instanceId, layer: step.layer, work: stepWork(step), steps: 1 });
  }
  return [...units.values()].sort((a, b) => a.memberIndex - b.memberIndex || a.layer - b.layer);
}

/** Cuts a unit sequence into `parts` contiguous chunks with balanced work (cut where the running sum is closest to k·total/parts). */
function cutContiguous(units: readonly Unit[], parts: number): Unit[][] {
  const total = units.reduce((n, u) => n + u.work, 0);
  const chunks: Unit[][] = [];
  let cur: Unit[] = [], sum = 0;
  for (let i = 0; i < units.length; i++) {
    const u = units[i]!;
    const left = units.length - i, needed = parts - chunks.length - 1;
    const target = total * (chunks.length + 1) / parts;
    // close the current chunk before u when that lands nearer to the target, or when the rest is needed for the remaining chunks
    if (cur.length && needed > 0 && (left <= needed || Math.abs(sum - target) <= Math.abs(sum + u.work - target))) { chunks.push(cur); cur = []; }
    cur.push(u); sum += u.work;
  }
  if (cur.length) chunks.push(cur);
  return chunks;
}

/** Instances into `parts` bins, largest first into the lightest bin (LPT); bins keep build order inside. */
function packInstances(units: readonly Unit[], parts: number): Unit[][] {
  const byMember = new Map<number, Unit[]>();
  for (const u of units) { let l = byMember.get(u.memberIndex); if (!l) byMember.set(u.memberIndex, l = []); l.push(u); }
  const groups = [...byMember.values()].map(l => ({ units: l, work: l.reduce((n, u) => n + u.work, 0), first: l[0]!.memberIndex }));
  const bins: { units: Unit[]; work: number }[] = Array.from({ length: Math.min(parts, groups.length) }, () => ({ units: [], work: 0 }));
  for (const g of [...groups].sort((a, b) => b.work - a.work || a.first - b.first)) {
    const bin = bins.reduce((best, b) => b.work < best.work ? b : best, bins[0]!);
    bin.units.push(...g.units); bin.work += g.work;
  }
  return bins.filter(b => b.units.length).map(b => b.units.sort((x, y) => x.memberIndex - y.memberIndex || x.layer - y.layer))
    .sort((a, b) => a[0]!.memberIndex - b[0]!.memberIndex);
}

/** Members of a chunk; ranges keep the original open ends so later layers stay covered. */
function chunkMembers(section: SiteSection, chunks: readonly Unit[][], index: number): SectionMember[] {
  const chunk = chunks[index]!;
  const out: SectionMember[] = [];
  const touching = [...new Set(chunk.map(u => u.memberIndex))];
  for (const mi of touching) {
    const m = section.members[mi]!;
    const layers = chunk.filter(u => u.memberIndex === mi).map(u => u.layer);
    const firstChunk = chunks.findIndex(c => c.some(u => u.memberIndex === mi));
    const lastChunk = chunks.length - 1 - [...chunks].reverse().findIndex(c => c.some(u => u.memberIndex === mi));
    const from = index === firstChunk ? m.fromLayer : Math.min(...layers);
    const to = index === lastChunk ? m.toLayer : Math.max(...layers);
    out.push({ instanceId: m.instanceId, ...(from !== undefined && from > 0 && { fromLayer: from }), ...(to !== undefined && { toLayer: to }) });
  }
  return out;
}

const rangeText = (members: readonly SectionMember[], names: ReadonlyMap<string, string>): string => members.map(m => {
  const n = names.get(m.instanceId) ?? 'Bauteil';
  if (m.fromLayer === undefined && m.toLayer === undefined) return n;
  return `${n} Schicht ${m.fromLayer ?? 0}–${m.toLayer ?? 'oben'}`;
}).join(', ');

/**
 * Splits one section into `parts` work packages that replace it at the same place in the build
 * order. The first package keeps the section id (owner, history, snapshots stay with it); the
 * others get new ids. Layer splits run bottom-up, so a later package rests on an earlier one;
 * instance splits are independent and can be built at the same time.
 */
export function splitSection(site: SitePlan, guide: Guide, input: {
  sectionId: string; parts: number; mode?: SplitMode; instanceNames?: ReadonlyMap<string, string>; makeId: () => string;
}): SplitResult {
  const section = site.sections.find(s => s.id === input.sectionId);
  if (!section) throw new DomainError('SITE', 'Abschnitt nicht gefunden.');
  const parts = Math.floor(input.parts);
  if (!(parts >= 2 && parts <= 16)) throw new DomainError('SITE', 'Ein Abschnitt lässt sich in 2 bis 16 Arbeitspakete teilen.');
  const units = sectionUnits(site, guide, section);
  if (units.length < 2) throw new DomainError('SITE', `„${section.name}“ hat zu wenig Bauschritte zum Teilen.`);
  const instances = new Set(units.map(u => u.memberIndex)).size;
  const mode: Exclude<SplitMode, 'auto'> = input.mode === 'layers' || input.mode === 'instances' ? input.mode : instances >= parts ? 'instances' : 'layers';
  if (mode === 'instances' && instances < 2) throw new DomainError('SITE', `„${section.name}“ besteht aus einem Bauteil; bitte nach Schichten teilen.`);
  const chunks = mode === 'instances' ? packInstances(units, parts) : cutContiguous(units, parts);
  if (chunks.length < 2) throw new DomainError('SITE', `„${section.name}“ lässt sich so nicht teilen.`);
  if (site.sections.length - 1 + chunks.length > MAX_SECTIONS) throw new DomainError('SITE', `Höchstens ${MAX_SECTIONS} Bauabschnitte; bitte weniger Teile wählen.`);
  const names = input.instanceNames ?? new Map<string, string>();
  const total = units.reduce((n, u) => n + u.work, 0);
  const packages: WorkPackage[] = chunks.map((chunk, i) => {
    const members = chunkMembers(section, chunks, i);
    return { id: i === 0 ? section.id : input.makeId(), name: `${section.name.slice(0, 66)} · Teil ${i + 1}/${chunks.length}`, members,
      work: chunk.reduce((n, u) => n + u.work, 0), steps: chunk.reduce((n, u) => n + u.steps, 0), range: rangeText(members, names) };
  });
  const replaced: SiteSection[] = packages.map((p, i) => ({ id: p.id, name: p.name, members: p.members,
    ...(i === 0 && section.note !== undefined && { note: section.note }) }));
  const at = site.sections.indexOf(section);
  const sections = [...site.sections.slice(0, at), ...replaced, ...site.sections.slice(at + 1)];
  const ideal = total / chunks.length;
  return { site: { ...site, sections }, parts: packages, mode, balance: ideal ? Math.max(...packages.map(p => p.work)) / ideal : 1 };
}

// ---------------------------------------------------------------- section work and dependencies

export interface SectionWork {
  readonly id: string;
  readonly name: string;
  readonly index: number;
  /** Work of all steps and of the steps not ticked yet. */
  readonly work: number;
  readonly openWork: number;
  readonly blocks: number;
  readonly blocksDone: number;
  readonly steps: number;
  readonly doneSteps: number;
  /** Earlier sections holding prerequisites of this one (a support below, a wall before the roof …). */
  readonly dependsOn: readonly string[];
  /** Later sections holding prerequisites: the build order is off (checkSections reports it as well). */
  readonly dependsOnLater: readonly string[];
}

export function sectionWork(site: Pick<SitePlan, 'sections'>, guide: Guide, progress: Pick<GuideProgress, 'status'>): SectionWork[] {
  const sectionOf = new Map<string, string | null>();
  for (const step of guide.steps) sectionOf.set(step.id, sectionOfStep(site, step));
  const rank = new Map(site.sections.map((s, i) => [s.id, i]));
  const acc = new Map(site.sections.map(s => [s.id, { work: 0, openWork: 0, blocks: 0, blocksDone: 0, steps: 0, doneSteps: 0, deps: new Set<string>() }]));
  for (const step of guide.steps) {
    const id = sectionOf.get(step.id);
    const a = id ? acc.get(id) : undefined;
    if (!a) continue;
    const done = progress.status.get(step.id) === 'done', w = stepWork(step);
    a.work += w; a.blocks += step.blocks; a.steps++;
    if (done) { a.blocksDone += step.blocks; a.doneSteps++; } else a.openWork += w;
    for (const p of step.prerequisites) { const other = sectionOf.get(p); if (other && other !== id) a.deps.add(other); }
  }
  return site.sections.map((s, index) => {
    const a = acc.get(s.id)!;
    const deps = [...a.deps].sort((x, y) => rank.get(x)! - rank.get(y)!);
    return { id: s.id, name: s.name, index, work: a.work, openWork: a.openWork, blocks: a.blocks, blocksDone: a.blocksDone, steps: a.steps, doneSteps: a.doneSteps,
      dependsOn: deps.filter(d => rank.get(d)! < index), dependsOnLater: deps.filter(d => rank.get(d)! > index) };
  });
}

// ---------------------------------------------------------------- availability

/** Away on a given day (YYYY-MM-DD): the member's `away.until` lies on or after that day. */
export const isAway = (m: { readonly away?: { readonly until?: string } }, day: string): boolean => !!m.away && (!m.away.until || m.away.until >= day);

type MemberLike = TeamView['members'][number];

// ---------------------------------------------------------------- assignment proposal

export interface AssignmentProposal {
  readonly sectionId: string;
  readonly member: string;
  readonly reason: string;
}

/**
 * Proposes owners for free sections: members who may build (Helfer and up, not away today),
 * least open work first; a package resting on a package of the same member stays with that
 * member when this does not make the member much busier than the others (no waiting for a
 * stranger's wall). Sections that are owned, reported or confirmed are never touched.
 */
export function suggestTeamAssignment(input: { view: TeamView; work: readonly SectionWork[]; today: string; members?: readonly string[] }): AssignmentProposal[] {
  const day = isoDay(input.today);
  const pool = (input.view.members as readonly MemberLike[]).filter(m => canTeam(m.role, 'section.claim') && !isAway(m, day) && (!input.members || input.members.includes(m.id)));
  if (!pool.length) return [];
  const load = new Map(pool.map(m => [m.id, 0]));
  const state = new Map(input.view.sections.map(s => [s.sectionId, s]));
  const owner = new Map<string, string>();
  for (const w of input.work) {
    const s = state.get(w.id);
    if (s?.owner) { owner.set(w.id, s.owner); if (load.has(s.owner) && s.status !== 'bestaetigt' && s.status !== 'gemeldet') load.set(s.owner, load.get(s.owner)! + w.openWork); }
  }
  const out: AssignmentProposal[] = [];
  const nameOf = new Map(pool.map(m => [m.id, m.name]));
  for (const w of input.work) {
    const s = state.get(w.id);
    if (s && (s.status !== 'frei' || s.orphan)) continue;
    if (w.openWork === 0) continue;
    const least = [...load.entries()].sort((a, b) => a[1] - b[1] || nameOf.get(a[0])!.localeCompare(nameOf.get(b[0])!, 'de'))[0]!;
    const chain = w.dependsOn.map(d => owner.get(d)).filter((m): m is string => !!m && load.has(m)).at(-1);
    let pick = least[0], reason = 'am wenigsten offene Arbeit';
    if (chain && chain !== pick && load.get(chain)! <= least[1] + w.openWork * 0.5) { pick = chain; reason = `baut auf „${input.work.find(x => owner.get(x.id) === chain && w.dependsOn.includes(x.id))?.name ?? 'Vorarbeit'}“ auf`; }
    else if (chain === pick) reason = 'baut auf eigener Vorarbeit auf';
    owner.set(w.id, pick); load.set(pick, load.get(pick)! + w.openWork);
    out.push({ sectionId: w.id, member: pick, reason });
  }
  return out;
}

// ---------------------------------------------------------------- schedule

export interface ScheduleItem {
  readonly sectionId: string;
  readonly name: string;
  /** Owner, or null for a free section (planned as if someone free took it). */
  readonly member: string | null;
  /** In building days from today (fractional). */
  readonly start: number;
  readonly end: number;
  readonly work: number;
  readonly status: SectionTeamStatus;
  /** Section whose end decides the start (dependency), when the member is waiting for it. */
  readonly waitsFor?: string;
}
export interface ScheduleLane { readonly member: string | null; readonly name: string; readonly items: readonly ScheduleItem[]; readonly end: number; readonly work: number; readonly awayDays: number }
export interface TeamSchedule {
  readonly lanes: readonly ScheduleLane[];
  readonly items: readonly ScheduleItem[];
  /** Building days until everything open is built (parallel). */
  readonly makespan: number;
  /** One player alone would need this many building days. */
  readonly solo: number;
  /** Section ids of the chain that decides the end. */
  readonly critical: readonly string[];
  /** Expected end as calendar day, from `sessionsPerWeek`. */
  readonly finish: string;
  readonly sessionsPerWeek: number;
  readonly notes: readonly string[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Calendar day after `sessions` building days at `perWeek` building days per week. */
export function calendarAfter(today: string, sessions: number, perWeek: number): string {
  const days = Math.ceil(sessions / perWeek * 7);
  return new Date(Date.parse(`${isoDay(today)}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
}

/**
 * Parallel schedule: every member builds their sections in build order at the building pace
 * (site.pace, blocks per building day); a section starts when its owner is free and all earlier
 * sections it rests on are finished. Free sections are planned as if a free player took them at
 * once (shows the waiting time if nobody does). Absent members start after their absence.
 * Reported and confirmed sections and fully ticked steps count as done.
 */
export function teamSchedule(input: { view: TeamView; work: readonly SectionWork[]; pace: PaceSetting; today: string; sessionsPerWeek?: number; proposal?: readonly AssignmentProposal[] }): TeamSchedule {
  const perWeek = Math.min(7, Math.max(1, Math.round(input.sessionsPerWeek ?? 3)));
  const rate = input.pace.blocksPerSession;
  const day = isoDay(input.today);
  const state = new Map(input.view.sections.map(s => [s.sectionId, s]));
  const proposed = new Map((input.proposal ?? []).map(p => [p.sectionId, p.member]));
  const members = input.view.members as readonly MemberLike[];
  const awayDays = (id: string): number => {
    const m = members.find(x => x.id === id);
    if (!m?.away || !isAway(m, day)) return 0;
    if (!m.away.until) return Infinity;
    return Math.max(0, daysBetween(`${day}T00:00:00Z`, `${m.away.until}T00:00:00Z`) + 1) * perWeek / 7;
  };
  const free = new Map<string, number>();
  const ends = new Map<string, { end: number; by: 'lane' | 'dep' | 'none'; prev?: string }>();
  const items: ScheduleItem[] = [];
  const laneLast = new Map<string, string>();
  for (const w of input.work) {
    const s = state.get(w.id);
    const status: SectionTeamStatus = s?.status ?? 'frei';
    const member = s?.owner ?? proposed.get(w.id) ?? null;
    const doneish = status === 'gemeldet' || status === 'bestaetigt';
    const work = doneish ? 0 : w.openWork;
    const depEnd = w.dependsOn.reduce<{ end: number; id?: string }>((best, d) => { const e = ends.get(d)?.end ?? 0; return e > best.end ? { end: e, id: d } : best; }, { end: 0 });
    let laneFree = 0;
    if (member !== null) {
      if (!free.has(member)) { const a = awayDays(member); free.set(member, Number.isFinite(a) ? a : 0); }
      laneFree = work ? free.get(member)! : 0;
    }
    const start = Math.max(laneFree, depEnd.end);
    const end = start + work / rate;
    const by = work === 0 ? 'none' : depEnd.end > laneFree ? 'dep' : 'lane';
    ends.set(w.id, { end, by, ...(by === 'dep' ? { prev: depEnd.id! } : by === 'lane' && member && laneLast.has(member) ? { prev: laneLast.get(member)! } : {}) });
    if (member !== null && work) { free.set(member, end); laneLast.set(member, w.id); }
    items.push({ sectionId: w.id, name: w.name, member, start: round2(start), end: round2(end), work, status,
      ...(depEnd.id && depEnd.end > laneFree && work > 0 && { waitsFor: depEnd.id }) });
  }
  const makespan = round2(Math.max(0, ...[...ends.values()].map(e => e.end)));
  const critical: string[] = [];
  let cur = [...ends.entries()].filter(([, e]) => round2(e.end) === makespan && makespan > 0).map(([id]) => id).at(-1);
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) { seen.add(cur); critical.unshift(cur); cur = ends.get(cur)?.prev; }
  const laneIds = [...new Set(items.map(i => i.member))];
  const nameOf = (id: string | null) => id === null ? 'noch niemand' : members.find(m => m.id === id)?.name ?? id;
  const lanes: ScheduleLane[] = laneIds.map(id => {
    const own = items.filter(i => i.member === id);
    return { member: id, name: nameOf(id), items: own, end: round2(Math.max(0, ...own.map(i => i.end))), work: own.reduce((n, i) => n + i.work, 0),
      awayDays: id ? (Number.isFinite(awayDays(id)) ? round2(awayDays(id)) : -1) : 0 };
  }).sort((a, b) => (a.member === null ? 1 : 0) - (b.member === null ? 1 : 0) || b.work - a.work);
  const solo = round2(items.reduce((n, i) => n + i.work, 0) / rate);
  const notes = [`Zeitplan nach Bautempo ${rate} Blöcke je Bautag und ${perWeek} Bautagen je Woche – eine Planungshilfe, keine Messung.`];
  if (items.some(i => i.member === null && i.work > 0)) notes.push('Freie Abschnitte sind so geplant, als ob sie sofort jemand übernimmt.');
  if (lanes.some(l => l.awayDays === -1)) notes.push('Mindestens ein Mitglied ist ohne Enddatum abwesend; seine Abschnitte sind ab heute geplant.');
  if (input.work.some(w => w.dependsOnLater.length)) notes.push('Einige Abschnitte brauchen Vorarbeit aus später geplanten Abschnitten (Reihenfolge im Reiter „Baustelle“ prüfen).');
  return { lanes, items, makespan, solo, critical, finish: calendarAfter(day, makespan, perWeek), sessionsPerWeek: perWeek, notes };
}

// ---------------------------------------------------------------- material per section and member

export interface TeamItemLine {
  readonly item: string;
  /** Build items still needed for the open steps (after stock, consumed in build order). */
  readonly missing: number;
  readonly need: number;
  readonly fromStock: number;
  /** Taken over as gather order (`gather.claim`) by anyone. */
  readonly gathering: number;
  /** Reported deliveries (not yet in the Bauleitung's stock). */
  readonly delivered: number;
  /** Missing minus gathering and delivered: nobody takes care of it yet. */
  readonly uncovered: number;
}
export interface MemberMaterial {
  readonly member: string | null;
  readonly name: string;
  readonly sections: readonly string[];
  readonly items: readonly { readonly item: string; readonly need: number; readonly missing: number }[];
  readonly slots: number;
  readonly gathering: readonly ItemCount[];
  readonly delivered: Readonly<Record<string, number>>;
}
export interface TeamMaterials {
  readonly items: readonly TeamItemLine[];
  readonly members: readonly MemberMaterial[];
}

/**
 * Material of the team: what the open steps still need (planSite: stock consumed in build order),
 * which part of it is being gathered or was reported as delivered, and what each member needs for
 * their own sections (free sections as "noch niemand"). Reported deliveries stay separate from the
 * stock until the Bauleitung books them (LAGER-01: one inventory source).
 */
export function teamMaterials(input: { overview: SiteOverview; view: TeamView; proposal?: readonly AssignmentProposal[] }): TeamMaterials {
  const state = new Map(input.view.sections.map(s => [s.sectionId, s]));
  const proposed = new Map((input.proposal ?? []).map(p => [p.sectionId, p.member]));
  const gathering = new Map<string, number>();
  for (const g of input.view.gather) gathering.set(g.item, (gathering.get(g.item) ?? 0) + g.count);
  const totals = new Map<string, { need: number; fromStock: number; missing: number }>();
  const byMember = new Map<string | null, { sections: string[]; items: Map<string, { need: number; missing: number }>; slots: number }>();
  for (const sec of input.overview.sections) {
    if (!sec.id) continue;
    const st = state.get(sec.id);
    if (st?.status === 'bestaetigt' || st?.status === 'gemeldet') continue;
    const member = st?.owner ?? proposed.get(sec.id) ?? null;
    let m = byMember.get(member); if (!m) byMember.set(member, m = { sections: [], items: new Map(), slots: 0 });
    m.sections.push(sec.id);
    for (const l of sec.items) {
      const t = totals.get(l.itemId) ?? { need: 0, fromStock: 0, missing: 0 };
      t.need += l.need; t.fromStock += l.fromStock; t.missing += l.missing; totals.set(l.itemId, t);
      const mi = m.items.get(l.itemId) ?? { need: 0, missing: 0 };
      mi.need += l.need; mi.missing += l.missing; m.items.set(l.itemId, mi);
    }
  }
  const items: TeamItemLine[] = [...totals.entries()].map(([item, t]) => {
    const g = gathering.get(item) ?? 0, d = input.view.delivered[item] ?? 0;
    return { item, ...t, gathering: g, delivered: d, uncovered: Math.max(0, t.missing - g - d) };
  }).sort((a, b) => b.uncovered - a.uncovered || b.missing - a.missing || (a.item < b.item ? -1 : 1));
  const memberName = (id: string | null) => id === null ? 'noch niemand' : input.view.members.find(m => m.id === id)?.name ?? id;
  const members: MemberMaterial[] = [...byMember.entries()].map(([id, m]) => {
    const list = [...m.items.entries()].map(([item, v]) => ({ item, ...v })).sort((a, b) => b.missing - a.missing || b.need - a.need);
    const mem = id ? input.view.members.find(x => x.id === id) : undefined;
    return { member: id, name: memberName(id), sections: m.sections, items: list, slots: list.reduce((n, l) => n + Math.ceil(l.need / 64), 0),
      gathering: input.view.gather.filter(g => g.member === id).map(g => ({ item: g.item, count: g.count })), delivered: mem?.items ?? {} };
  }).sort((a, b) => (a.member === null ? 1 : 0) - (b.member === null ? 1 : 0) || a.name.localeCompare(b.name, 'de'));
  return { items, members };
}

/** Full need of build items per section over all its steps (independent of ticks): for the server file and the store comparison. */
export function sectionNeeds(site: Pick<SitePlan, 'sections'>, guide: Guide, stepMaterials: ReadonlyMap<string, MaterialReport>, limit = 256): { sections: Map<string, ItemCount[]>; total: ItemCount[] } {
  const per = new Map<string, Map<string, number>>(site.sections.map(s => [s.id, new Map()]));
  const total = new Map<string, number>();
  for (const step of guide.steps) {
    const id = sectionOfStep(site, step);
    const m = id ? per.get(id) : undefined;
    for (const l of stepMaterials.get(step.id)?.items ?? []) {
      if (m) m.set(l.itemId, (m.get(l.itemId) ?? 0) + l.count);
      total.set(l.itemId, (total.get(l.itemId) ?? 0) + l.count);
    }
  }
  const list = (m: Map<string, number>) => [...m.entries()].map(([item, count]) => ({ item, count })).sort((a, b) => b.count - a.count || (a.item < b.item ? -1 : 1)).slice(0, limit);
  return { sections: new Map([...per.entries()].map(([id, m]) => [id, list(m)])), total: list(total) };
}

/** Packing list for one member as chat text (stacks, shulker boxes). */
export function packingText(m: MemberMaterial, sectionName: (id: string) => string): string {
  const stacks = (n: number) => { const s = Math.floor(n / 64), r = n % 64; return s ? `${s} St.${r ? ` + ${r}` : ''}` : `${r}`; };
  const lines = [`Packliste ${m.name}: ${m.sections.map(sectionName).join(', ') || '–'}`];
  for (const l of m.items.filter(x => x.missing > 0 || x.need > 0)) lines.push(`- ${l.item.replace(/^minecraft:/, '')}: ${stacks(l.need)}${l.missing ? ` (fehlt noch ${l.missing})` : ' (im Lager)'}`);
  lines.push(`≈ ${m.slots} Plätze, ${Math.ceil(m.slots / 27)} Shulkerkiste${Math.ceil(m.slots / 27) === 1 ? '' : 'n'}`);
  return lines.join('\n');
}

// ---------------------------------------------------------------- progress board and hints

export interface TeamAttention {
  readonly kind: 'stale-report' | 'idle-owner' | 'ticked-not-reported' | 'reported-not-ticked' | 'away-owner' | 'open-offer' | 'waiting' | 'plan-changed' | 'orphan';
  readonly sectionId: string;
  readonly member?: string;
  readonly text: string;
}
export interface MemberProgress {
  readonly member: string;
  readonly name: string;
  readonly role: TeamRole;
  readonly sections: number;
  readonly work: number;
  readonly workDone: number;
  readonly reported: number;
  readonly confirmed: number;
  readonly away?: { readonly until?: string; readonly note?: string };
}
export interface TeamProgress {
  readonly board: Readonly<Record<SectionTeamStatus, readonly string[]>>;
  readonly members: readonly MemberProgress[];
  readonly totals: { readonly work: number; readonly workDone: number; readonly reportedWork: number; readonly confirmedWork: number; readonly sections: number; readonly confirmed: number };
  readonly attention: readonly TeamAttention[];
}

/**
 * Progress board: sections by team status with work, per member done/reported/confirmed work
 * (from the ticks of the guide, the team's statement and the leaders' confirmation – three
 * statements kept apart), and hints that need someone: reports waiting for a check, owners idle
 * for a week, ticked sections nobody reported, reports without ticks, absent owners, open
 * handovers, sections resting on a foundation nobody has taken, and plan changes since the release.
 */
export function teamProgress(input: { view: TeamView; work: readonly SectionWork[]; now: string; changed?: ReadonlySet<string>; staleDays?: number; idleDays?: number }): TeamProgress {
  const stale = input.staleDays ?? 2, idle = input.idleDays ?? 7, today = isoDay(input.now);
  const work = new Map(input.work.map(w => [w.id, w]));
  const board: Record<SectionTeamStatus, string[]> = { frei: [], vergeben: [], nacharbeit: [], gemeldet: [], bestaetigt: [] };
  const members = input.view.members as readonly MemberLike[];
  const name = (id?: string | null) => id ? members.find(m => m.id === id)?.name ?? id : 'niemand';
  const sname = (id: string) => work.get(id)?.name ?? 'entfernter Abschnitt';
  const attention: TeamAttention[] = [];
  let total = 0, done = 0, reported = 0, confirmed = 0;
  const per = new Map<string, { sections: number; work: number; workDone: number; reported: number; confirmed: number }>();
  for (const s of input.view.sections) {
    const w = work.get(s.sectionId);
    if (s.orphan) { if (s.status !== 'frei' || s.owner) attention.push({ kind: 'orphan', sectionId: s.sectionId, text: `Ein Abschnitt aus dem Teamprotokoll fehlt im Plan (${s.owner ? `Inhaber ${name(s.owner)}` : 'ohne Inhaber'}). Gilt ein anderer Planstand?` }); continue; }
    board[s.status].push(s.sectionId);
    if (!w) continue;
    total += w.work; done += w.work - w.openWork;
    if (s.status === 'gemeldet' || s.status === 'bestaetigt') reported += w.work;
    if (s.status === 'bestaetigt') confirmed += w.work;
    if (s.owner) {
      const p = per.get(s.owner) ?? { sections: 0, work: 0, workDone: 0, reported: 0, confirmed: 0 };
      p.sections++; p.work += w.work; p.workDone += w.work - w.openWork;
      if (s.status === 'gemeldet' || s.status === 'bestaetigt') p.reported += w.work;
      if (s.status === 'bestaetigt') p.confirmed += w.work;
      per.set(s.owner, p);
    }
    const last = s.history.at(-1);
    const owner = s.owner ? members.find(m => m.id === s.owner) : undefined;
    if (s.status === 'gemeldet' && last && daysBetween(last.at, input.now) >= stale)
      attention.push({ kind: 'stale-report', sectionId: s.sectionId, ...(s.doneBy && { member: s.doneBy }), text: `„${sname(s.sectionId)}“ wartet seit ${daysBetween(last.at, input.now)} Tagen auf die Prüfung.` });
    if ((s.status === 'vergeben' || s.status === 'nacharbeit') && owner) {
      if (isAway(owner, today)) attention.push({ kind: 'away-owner', sectionId: s.sectionId, member: owner.id, text: `${owner.name} ist abwesend${owner.away?.until ? ` bis ${owner.away.until}` : ''} und hat „${sname(s.sectionId)}“. Übergeben?` });
      else if (owner.lastActive && daysBetween(owner.lastActive, input.now) >= idle)
        attention.push({ kind: 'idle-owner', sectionId: s.sectionId, member: owner.id, text: `${owner.name} war seit ${daysBetween(owner.lastActive, input.now)} Tagen nicht aktiv und hat „${sname(s.sectionId)}“. Nachfragen oder freigeben?` });
      if (w.steps > 0 && w.openWork === 0 && w.work > 0) attention.push({ kind: 'ticked-not-reported', sectionId: s.sectionId, member: owner.id, text: `„${sname(s.sectionId)}“ ist in der Bauanleitung ganz abgehakt, aber noch nicht fertig gemeldet.` });
    }
    if (s.status === 'gemeldet' && w.work > 0 && (w.work - w.openWork) / w.work < 0.9)
      attention.push({ kind: 'reported-not-ticked', sectionId: s.sectionId, ...(s.doneBy && { member: s.doneBy }), text: `„${sname(s.sectionId)}“ ist fertig gemeldet, in der Bauanleitung aber erst zu ${Math.round((w.work - w.openWork) / w.work * 100)} % abgehakt.` });
    const offer = s.offer;
    if (offer && daysBetween(offer.at, input.now) >= stale) attention.push({ kind: 'open-offer', sectionId: s.sectionId, member: offer.to, text: `Übergabe von „${sname(s.sectionId)}“ an ${name(offer.to)} ist seit ${daysBetween(offer.at, input.now)} Tagen offen.` });
    if ((s.status === 'vergeben' || s.status === 'frei') && w.openWork > 0) {
      // only actionable waits: the foundation is open and nobody has it
      const waiting = w.dependsOn.filter(d => { const ds = input.view.sections.find(x => x.sectionId === d); const dw = work.get(d); return dw && dw.openWork > 0 && (!ds || ds.status === 'frei'); });
      if (waiting.length && s.owner) attention.push({ kind: 'waiting', sectionId: s.sectionId, member: s.owner, text: `„${sname(s.sectionId)}“ (${name(s.owner)}) baut auf ${waiting.map(d => `„${sname(d)}“`).join(', ')} auf, das noch niemand übernommen hat.` });
    }
    if (input.changed?.has(s.sectionId) && (s.status === 'gemeldet' || s.status === 'bestaetigt'))
      attention.push({ kind: 'plan-changed', sectionId: s.sectionId, ...(s.owner && { member: s.owner }), text: `„${sname(s.sectionId)}“ ist ${s.status === 'bestaetigt' ? 'bestätigt' : 'fertig gemeldet'}, hat sich seit dem freigegebenen Planstand aber geändert: Nacharbeit prüfen.` });
  }
  const memberList: MemberProgress[] = members.filter(m => per.has(m.id) || m.role !== 'gast').map(m => {
    const p = per.get(m.id) ?? { sections: 0, work: 0, workDone: 0, reported: 0, confirmed: 0 };
    return { member: m.id, name: m.name, role: m.role, ...p, ...(m.away && { away: m.away }) };
  });
  return { board, members: memberList, totals: { work: total, workDone: done, reportedWork: reported, confirmedWork: confirmed,
    sections: input.view.sections.filter(s => !s.orphan).length, confirmed: board.bestaetigt.length }, attention };
}

// ---------------------------------------------------------------- conflict fixes

export interface TeamFix {
  readonly label: string;
  readonly body: TeamEventBody;
  /** Event kind whose right the fixer needs. */
  readonly needs: TeamAction;
}
export interface TeamIssue {
  readonly kind: 'conflict' | 'rejected';
  readonly event: TeamEvent;
  readonly text: string;
  readonly fixes: readonly TeamFix[];
}

const ackFix = (eventId: string, label = 'So lassen (als erledigt markieren)'): TeamFix => ({ label, body: { kind: 'issue.ack', events: [eventId] }, needs: 'issue.ack' });

/**
 * Open hints and rejected events with ready-made fixes. Every fix is an ordinary team event
 * (assign, verify, role, acknowledge), so it is checked, merged and undone like everything else.
 * The section owner just before the event is derived by folding the log up to that event.
 */
export function teamIssues(team: TeamState, ctx: TeamContext, view: TeamView, acknowledged: ReadonlySet<string> = new Set(view.acknowledged)): TeamIssue[] {
  const index = new Map(team.events.map((e, i) => [e.id, i]));
  const before = (e: TeamEvent) => teamView({ ...team, events: team.events.slice(0, index.get(e.id) ?? 0) }, ctx);
  const name = (id?: string | null) => id ? view.members.find(m => m.id === id)?.name ?? id : 'niemand';
  const known = new Set(view.members.map(m => m.id));
  const out: TeamIssue[] = [];
  for (const c of view.conflicts) {
    if (acknowledged.has(c.event.id)) continue;
    const e = c.event as TeamEvent & { section?: string; member?: string };
    const fixes: TeamFix[] = [];
    if (e.kind === 'section.claim' && e.section) {
      const s = view.sections.find(x => x.sectionId === e.section);
      if (s?.owner && s.owner !== e.by && known.has(e.by) && s.status !== 'bestaetigt') fixes.push({ label: `An ${name(e.by)} umweisen`, body: { kind: 'section.assign', section: e.section, member: e.by }, needs: 'section.assign' });
      fixes.push(ackFix(e.id, `Bei ${name(s?.owner)} lassen`));
    } else if (e.kind === 'section.assign' && e.section) {
      const prev = before(e).sections.find(x => x.sectionId === e.section)?.owner;
      const s = view.sections.find(x => x.sectionId === e.section);
      if (prev && prev !== s?.owner && s?.status !== 'bestaetigt') fixes.push({ label: `Zurück an ${name(prev)}`, body: { kind: 'section.assign', section: e.section, member: prev }, needs: 'section.assign' });
      fixes.push(ackFix(e.id, `Bei ${name(s?.owner)} lassen`));
    } else if (e.kind === 'section.done' && e.section) {
      const s = view.sections.find(x => x.sectionId === e.section);
      if (s?.status === 'gemeldet') fixes.push({ label: 'Prüfen und bestätigen', body: { kind: 'section.verify', section: e.section, ok: true }, needs: 'section.verify' });
      if (s?.owner !== e.by && known.has(e.by) && s?.status !== 'bestaetigt') fixes.push({ label: `${name(e.by)} als Inhaber eintragen`, body: { kind: 'section.assign', section: e.section, member: e.by }, needs: 'section.assign' });
      fixes.push(ackFix(e.id));
    } else fixes.push(ackFix(e.id));
    out.push({ kind: 'conflict', event: c.event, text: c.text, fixes });
  }
  for (const r of view.rejected) {
    if (acknowledged.has(r.event.id)) continue;
    const e = r.event as TeamEvent & { section?: string };
    const fixes: TeamFix[] = [];
    const roleThen = before(e).members.find(m => m.id === e.by)?.role ?? 'gast';
    const roleNow = view.members.find(m => m.id === e.by)?.role;
    if (roleThen === 'gast' && known.has(e.by) && roleNow === 'gast') fixes.push({ label: `${name(e.by)} zum Helfer machen`, body: { kind: 'member.role', member: e.by, role: 'helfer' }, needs: 'member.role' });
    if (e.kind === 'section.claim' && e.section && known.has(e.by)) {
      const s = view.sections.find(x => x.sectionId === e.section);
      if (s && s.status === 'frei') fixes.push({ label: `„${ctx.sections.find(x => x.id === e.section)?.name ?? 'Abschnitt'}“ an ${name(e.by)} zuweisen`, body: { kind: 'section.assign', section: e.section, member: e.by }, needs: 'section.assign' });
    }
    fixes.push(ackFix(e.id, 'Gesehen (ausblenden)'));
    out.push({ kind: 'rejected', event: r.event, text: r.reason, fixes });
  }
  return out;
}

// ---------------------------------------------------------------- plan release comparison

export interface SectionChange {
  readonly sectionId: string | null;
  readonly name: string;
  readonly changed: number;
  readonly added: number;
  readonly removed: number;
  /** Work of the changed, added and removed steps (after for changed/added, before for removed). */
  readonly work: number;
  readonly status: SectionTeamStatus;
  /** Reported or confirmed and changed: the Bauleitung should check for rework. */
  readonly review: boolean;
}

/**
 * Steps that differ between the released plan and the current one, by section. Steps are matched
 * by their stable id (instance, layer, phase) and compared by geometry hash; a step of the
 * released plan belongs to the section that would hold it today. Nothing changes status by
 * itself – the Bauleitung decides (TEAMBAU §10).
 */
export function releaseChanges(input: { site: Pick<SitePlan, 'sections'>; released: Pick<Guide, 'steps'>; current: Pick<Guide, 'steps'>; view: TeamView }): SectionChange[] {
  const old = new Map(input.released.steps.map(s => [s.id, s]));
  const now = new Map(input.current.steps.map(s => [s.id, s]));
  const acc = new Map<string | null, { changed: number; added: number; removed: number; work: number }>();
  const bump = (step: Pick<GuideStep, 'instanceId' | 'layer'>, key: 'changed' | 'added' | 'removed', w: number) => {
    const id = sectionOfStep(input.site, step);
    const a = acc.get(id) ?? { changed: 0, added: 0, removed: 0, work: 0 };
    a[key]++; a.work += w; acc.set(id, a);
  };
  for (const [id, s] of now) { const o = old.get(id); if (!o) bump(s, 'added', stepWork(s)); else if (o.geometryHash !== s.geometryHash) bump(s, 'changed', stepWork(s)); }
  for (const [id, o] of old) if (!now.has(id)) bump(o, 'removed', stepWork(o));
  const order = new Map(input.site.sections.map((s, i) => [s.id, i]));
  return [...acc.entries()].map(([id, a]) => {
    const st = id ? input.view.sections.find(s => s.sectionId === id)?.status ?? 'frei' : 'frei';
    return { sectionId: id, name: id ? input.site.sections.find(s => s.id === id)?.name ?? 'Abschnitt' : 'Ohne Abschnitt', ...a, status: st,
      review: st === 'gemeldet' || st === 'bestaetigt' };
  }).sort((a, b) => (a.sectionId === null ? 1e9 : order.get(a.sectionId) ?? 1e9) - (b.sectionId === null ? 1e9 : order.get(b.sectionId) ?? 1e9));
}

// ---------------------------------------------------------------- rights

export interface RightRow { readonly action: TeamAction; readonly label: string; readonly roles: Readonly<Record<TeamRole, boolean>>; readonly extra?: string }
const RIGHT_LABEL: readonly (readonly [TeamAction, string, string?])[] = [
  ['note.add', 'Notizen schreiben'],
  ['section.claim', 'Freie Abschnitte übernehmen'],
  ['section.done', 'Fertig melden'],
  ['contribution', 'Beiträge und Lieferungen melden'],
  ['gather.claim', 'Sammelaufträge übernehmen'],
  ['section.release', 'Abschnitt abgeben', 'den eigenen; fremde ab Baumeister'],
  ['note.resolve', 'Notizen schließen', 'die eigenen; fremde ab Baumeister'],
  ['section.handover', 'Abschnitt übergeben (der andere nimmt an)', 'den eigenen; fremde ab Baumeister'],
  ['member.away', 'Abwesenheit eintragen', 'für sich selbst; für andere die Bauleitung'],
  ['issue.ack', 'Hinweise als erledigt markieren'],
  ['section.assign', 'Abschnitte zuweisen und umweisen'],
  ['section.verify', 'Meldungen bestätigen oder Nacharbeit verlangen'],
  ['member.role', 'Rollen vergeben'],
  ['plan.release', 'Planstand freigeben'],
];
export function rightsMatrix(extra: readonly (readonly [TeamAction, string, string?])[] = []): RightRow[] {
  return [...RIGHT_LABEL, ...extra].map(([action, label, note]) => ({ action, label, roles: Object.fromEntries(TEAM_ROLES.map(r => [r, canTeam(r, action)])) as Record<TeamRole, boolean>,
    ...(note && { extra: note }) }));
}
