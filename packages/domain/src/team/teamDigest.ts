/**
 * COOP-11 „Verlauf verdichten“ (docs/architecture/team/TEAMBAU.md §19). The team log only grows: every
 * Baunachweis, every chest booking, every hopper move and every yield report is one event, and a long
 * build reaches the limit of 20 000 events. The Bauleitung can compact the log up to a cutoff:
 *
 * - Measurements (build.tally, contribution, store.move/check/seal/yield) up to the cutoff are replaced by
 *   `team.digest` events with the sums – per member and section, per member, per chest, per yield store.
 * - Snapshots (store.count, store.seen, section.seen) keep only the newest per chest or section.
 * - Closed notes (note.add + note.resolve up to the cutoff) are listed in the digest and leave the log.
 * - Rejected events up to the cutoff leave the log (they never had an effect).
 * - Members, roles, sections, handovers, plan releases, chest definitions and acknowledgements stay as
 *   they are, so rights and the section history do not change.
 *
 * The digest sorts directly after the cutoff event, so the fold applies it at exactly the place where the
 * replaced events were. A merge with an older copy of the log leaves the replaced events out again
 * (team.ts `coveredByDigest`), so compacting is safe while copies are still around. The result is checked
 * before it is returned: the visible state with the digest must equal the state without it.
 */
import { canonicalJson } from '../core/hash.js';
import { DomainError } from '../core/types.js';
import { checkTeamEvent, compareEvents, coveredByDigest, digestInfo, foldTeam } from './team.js';
import type { DigestBody, DigestChest, DigestMember, DigestTally, DigestYield, FoldRaw, ItemCount, ItemDelta, TeamContext, TeamEvent, TeamState, TeamView } from './team.js';

/** Characters per digest part; the team room takes events up to 4 KB. */
export const DIGEST_PART_CHARS = 3600;
/** Lines per list in one digest row (the event check allows 64). */
const LINES = 48;
/** A hopper booking that comes more than this after the previous one starts a new running period (as in productionPlan). */
const GAP_MS = 5 * 60_000;

export interface CompactionPlan {
  /** The compacted log (replaces site.team; local fields stay). */
  readonly team: TeamState;
  readonly cutoff: { readonly at: string; readonly id: string };
  readonly eventsBefore: number;
  readonly eventsAfter: number;
  /** Measurements, older snapshots and closed notes the digest replaces. */
  readonly replaced: number;
  /** Rejected events up to the cutoff that were dropped. */
  readonly rejectedDropped: number;
  readonly parts: number;
  readonly bytesBefore: number;
  readonly bytesAfter: number;
}

export interface CompactionOptions {
  /** Everything strictly before this time is compacted (default: 14 days before now). */
  readonly before: string;
  /** Builder id of the Bauleitung who compacts. */
  readonly by: string;
  readonly now?: string;
  /** Run tag (tests); random otherwise. */
  readonly run?: string;
}

const sumInto = (m: Map<string, number>, item: string, n: number) => { const v = (m.get(item) ?? 0) + n; if (v === 0) m.delete(item); else m.set(item, v); };
const lines = (m: ReadonlyMap<string, number> | undefined): ItemCount[] => [...(m ?? [])].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([item, count]) => ({ item, count }));
const deltas = (m: ReadonlyMap<string, number> | null | undefined): ItemDelta[] => [...(m ?? [])].filter(([, n]) => n !== 0).sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([item, delta]) => ({ item, delta }));
const chunks = <T>(list: readonly T[], n = LINES): T[][] => { const out: T[][] = []; for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n)); return out; };
const randomRun = () => Array.from(crypto.getRandomValues(new Uint8Array(4)), b => (b % 36).toString(36)).join('') + Date.now().toString(36).slice(-2);
const size = (team: TeamState) => JSON.stringify(team.events).length;

/** Rows of the digest from the raw fold state at the cutoff. */
function digestRows(raw: FoldRaw, team: TeamState, cutoff: { at: string; id: string }): { tallies: DigestTally[]; members: DigestMember[]; chests: DigestChest[]; yields: DigestYield[]; notes: string[] } {
  // Baunachweis per member and section.
  const tallyAgg = new Map<string, { member: string; section: string; placed: number; broken: number; blocks: Map<string, number>; from: string; until: string }>();
  for (const t of raw.tallies) {
    const key = `${t.by} ${t.section}`;
    let a = tallyAgg.get(key);
    if (!a) tallyAgg.set(key, a = { member: t.by, section: t.section, placed: 0, broken: 0, blocks: new Map(), from: t.from, until: t.until });
    a.placed += t.placed; a.broken += t.broken;
    for (const l of t.blocks ?? []) sumInto(a.blocks, l.item, l.count);
    if (t.from < a.from) a.from = t.from;
    if (t.until > a.until) a.until = t.until;
  }
  const tallies: DigestTally[] = [];
  for (const a of [...tallyAgg.values()].sort((x, y) => (x.member + x.section < y.member + y.section ? -1 : 1))) {
    const parts = chunks(lines(a.blocks));
    (parts.length ? parts : [[]]).forEach((blocks, i) => tallies.push({ member: a.member, section: a.section, placed: i ? 0 : a.placed, broken: i ? 0 : a.broken,
      ...(blocks.length && { blocks }), from: a.from, until: a.until }));
  }

  // Contributions and bookings per member.
  const members: DigestMember[] = [];
  const ids = [...new Set([...raw.blocks.keys(), ...raw.items.keys(), ...raw.stored.keys(), ...raw.taken.keys(), ...raw.lastActive.keys()])].sort();
  for (const member of ids) {
    const items = chunks(lines(raw.items.get(member))), stored = chunks(lines(raw.stored.get(member))), taken = chunks(lines(raw.taken.get(member)));
    const n = Math.max(1, items.length, stored.length, taken.length);
    for (let i = 0; i < n; i++) {
      const blocks = i ? 0 : raw.blocks.get(member) ?? 0, last = i ? undefined : raw.lastActive.get(member);
      const row: DigestMember = { member, ...(blocks && { blocks }), ...(items[i]?.length && { items: items[i] }), ...(stored[i]?.length && { stored: stored[i] }),
        ...(taken[i]?.length && { taken: taken[i] }), ...(last && { last }) };
      if (Object.keys(row).length > 1) members.push(row);
    }
  }

  // Store chests: state at the cutoff, plus the hopper running time for the Produktion.
  const hopperTimes = new Map<string, number[]>();
  const previous = digestInfo(team);
  const prevHopper = new Map<string, { seconds: number; bookings: number; from: string; until: string }>();
  for (const e of team.events) {
    if (compareEvents(e, cutoff) > 0) break;
    if (e.kind === 'team.digest' && previous?.ids.has(e.id)) {
      for (const r of (e as unknown as DigestBody).chests ?? []) if (r.hopper) {
        const p = prevHopper.get(r.chest);
        prevHopper.set(r.chest, p ? { seconds: p.seconds + r.hopper.seconds, bookings: p.bookings + r.hopper.bookings, from: p.from < r.hopper.from ? p.from : r.hopper.from, until: p.until > r.hopper.until ? p.until : r.hopper.until } : r.hopper);
      }
      continue;
    }
    if (previous && coveredByDigest(e, previous)) continue;
    const r = e as unknown as { kind: string; chest?: string; via?: string; in?: unknown[] };
    if (r.kind === 'store.move' && r.via === 'trichter' && r.in?.length && r.chest) {
      const t = Date.parse(e.at);
      if (Number.isFinite(t)) { let l = hopperTimes.get(r.chest); if (!l) hopperTimes.set(r.chest, l = []); l.push(t); }
    }
  }
  const chests: DigestChest[] = [];
  for (const [chest, c] of [...raw.chests].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const times = (hopperTimes.get(chest) ?? []).sort((a, b) => a - b);
    let ms = times.length ? 1000 : 0;
    for (let i = 1; i < times.length; i++) { const gap = times[i]! - times[i - 1]!; ms += gap <= GAP_MS ? gap : 1000; }
    const prev = prevHopper.get(chest);
    const hopper = times.length || prev ? {
      seconds: Math.round(ms / 1000) + (prev?.seconds ?? 0), bookings: times.length + (prev?.bookings ?? 0),
      from: [prev?.from, times.length ? new Date(times[0]!).toISOString() : undefined].filter((x): x is string => !!x).sort()[0]!,
      until: [prev?.until, times.length ? new Date(times.at(-1)!).toISOString() : undefined].filter((x): x is string => !!x).sort().at(-1)!,
    } : undefined;
    const expected = chunks(deltas(c.expected)), deviation = chunks(deltas(c.deviation)), yieldIn = chunks(lines(c.yieldIn));
    const moves: { who: string; in?: ItemCount[]; out?: ItemCount[] }[] = [];
    for (const who of [...new Set([...c.movedIn.keys(), ...c.movedOut.keys()])].sort()) {
      const ins = chunks(lines(c.movedIn.get(who))), outs = chunks(lines(c.movedOut.get(who)));
      for (let i = 0; i < Math.max(ins.length, outs.length); i++) moves.push({ who, ...(ins[i]?.length && { in: ins[i] }), ...(outs[i]?.length && { out: outs[i] }) });
    }
    const moveRows = chunks(moves, 8);
    const n = Math.max(1, expected.length, deviation.length, yieldIn.length, moveRows.length);
    for (let i = 0; i < n; i++) {
      chests.push({ chest,
        ...(i === 0 && { head: { status: c.status, expected: c.expected !== null, ...(c.checkedAt && { checkedAt: c.checkedAt }), ...(c.sealedBy && { sealedBy: c.sealedBy, sealedAt: c.sealedAt! }) } }),
        ...(expected[i]?.length && { expected: expected[i] }), ...(deviation[i]?.length && { deviation: deviation[i] }),
        ...(moveRows[i]?.length && { moves: moveRows[i] }), ...(yieldIn[i]?.length && { yieldIn: yieldIn[i] }),
        ...(i === 0 && c.yieldMinutes && { yieldMinutes: c.yieldMinutes }), ...(i === 0 && hopper && { hopper }) });
    }
  }

  // Yield periods per store and farm.
  const yAgg = new Map<string, { chest: string; farm?: string; items: Map<string, number>; minutes: number; from: string; until: string; periods: number }>();
  for (const y of raw.yields) {
    const key = `${y.chest} ${y.farm ?? ''}`;
    let a = yAgg.get(key);
    if (!a) yAgg.set(key, a = { chest: y.chest, ...(y.farm && { farm: y.farm }), items: new Map(), minutes: 0, from: y.from, until: y.until, periods: 0 });
    for (const [item, n] of Object.entries(y.items)) sumInto(a.items, item, n);
    a.minutes += y.minutes; a.periods++;
    if (y.from < a.from) a.from = y.from;
    if (y.until > a.until) a.until = y.until;
  }
  const yields: DigestYield[] = [];
  for (const a of yAgg.values()) {
    const parts = chunks(lines(a.items));
    parts.forEach((items, i) => yields.push({ chest: a.chest, ...(a.farm && { farm: a.farm }), items, minutes: i ? 0 : a.minutes, from: a.from, until: a.until, periods: i ? 1 : a.periods }));
  }

  // Closed notes (and those an earlier digest closed: their events may still come back from old copies).
  const notes = new Set(previous?.notes ?? []);
  for (const [id, n] of raw.notes) if (n.resolved) notes.add(id);
  return { tallies, members, chests, yields, notes: [...notes].sort() };
}

/** Packs the rows into parts below DIGEST_PART_CHARS. */
function pack(rows: ReturnType<typeof digestRows>, base: Omit<DigestBody, 'part' | 'parts'>): DigestBody[] {
  const parts: Record<string, unknown[]>[] = [];
  let cur: Record<string, unknown[]> = {};
  const probe = (p: Record<string, unknown[]>) => JSON.stringify({ id: 'x'.repeat(60), at: '2026-01-01T00:00:00.000Z', by: 'x'.repeat(40), origin: 'planer', kind: 'team.digest', ...base, part: 998, parts: 999, ...p }).length;
  const add = (key: string, row: unknown) => {
    const next = { ...cur, [key]: [...(cur[key] ?? []), row] };
    if (Object.keys(cur).length && (probe(next) > DIGEST_PART_CHARS || next[key]!.length > 400)) { parts.push(cur); cur = { [key]: [row] }; }
    else cur = next;
    if (probe(cur) > DIGEST_PART_CHARS) throw new DomainError('DIGEST', `Eine Zeile der Verdichtung ist zu groß (${key}).`);
  };
  for (const r of rows.tallies) add('tallies', r);
  for (const r of rows.members) add('members', r);
  for (const r of rows.chests) add('chests', r);
  for (const r of rows.yields) add('yields', r);
  for (const r of rows.notes) add('notes', r);
  parts.push(cur);
  if (parts.length > 999) throw new DomainError('DIGEST', 'Die Verdichtung wäre zu groß. Bitte einen früheren Stichtag wählen.');
  return parts.map((p, part) => ({ ...base, part, parts: parts.length, ...p }) as DigestBody);
}

/** What must not change by compacting (the visible state without history, rejections and closed notes). */
export function digestProjection(v: TeamView): string {
  const yields = new Map<string, { items: Record<string, number>; minutes: number }>();
  for (const y of v.yields) {
    const k = `${y.chest} ${y.farm ?? ''}`;
    const a = yields.get(k) ?? { items: {}, minutes: 0 };
    for (const [i, n] of Object.entries(y.items)) a.items[i] = (a.items[i] ?? 0) + n;
    a.minutes += y.minutes; yields.set(k, a);
  }
  return canonicalJson({
    members: v.members.map(({ lastActive: _l, ...m }) => m), sections: v.sections, notes: v.notes.filter(n => !n.resolved), gather: v.gather, delivered: v.delivered,
    release: v.release, releases: v.releases, stores: v.stores, stock: v.stock, stockSeen: v.stockSeen, placedBlocks: v.placedBlocks, tallySpan: v.tallySpan,
    acknowledged: [...v.acknowledged].sort(), conflicts: v.conflicts.length, yields: [...yields].sort((a, b) => (a[0] < b[0] ? -1 : 1)),
  });
}

/** Latest event strictly before `before` whose id leaves room for the digest suffix. */
function cutoffBefore(events: readonly TeamEvent[], before: string): TeamEvent | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]!;
    if (e.at < before && e.id.length <= 50 && /^[A-Za-z0-9_.:-]+$/.test(e.id)) return e;
  }
  return null;
}

/**
 * Plans the compaction of everything before `before`. Throws a DomainError with a readable reason when
 * there is nothing to compact, the author is not Bauleitung at the cutoff or the check fails.
 */
export function compactTeam(team: TeamState, ctx: TeamContext, opts: CompactionOptions): CompactionPlan {
  const cut = cutoffBefore(team.events, opts.before);
  if (!cut) throw new DomainError('DIGEST', 'Vor diesem Tag gibt es nichts zu verdichten.');
  const cutoff = { at: cut.at, id: cut.id };
  const old = digestInfo(team);
  if (old && compareEvents(cutoff, old) <= 0) throw new DomainError('DIGEST', `Der Verlauf ist schon bis ${old.at.slice(0, 10)} verdichtet.`);
  let raw: FoldRaw | null = null;
  foldTeam(team, ctx, { until: cutoff, capture: r => { raw = r; } });
  const rows = digestRows(raw!, team, cutoff);
  const run = opts.run ?? randomRun();
  const made = opts.now ?? new Date().toISOString();
  // Count first with a provisional digest, then write the real number into every part.
  const draft = (covered: number): TeamEvent[] => pack(rows, { cutoff: cut.id, run, made, covered }).map(body =>
    checkTeamEvent({ id: `${cut.id}.${run}.${String(body.part).padStart(3, '0')}`, at: cut.at, by: opts.by, origin: 'planer', kind: 'team.digest', ...body }));
  const rejectedIds = new Set(raw!.rejected.map(r => r.event.id));
  const build = (digest: TeamEvent[]) => {
    const all = [...team.events, ...digest].sort(compareEvents);
    const dg = digestInfo({ founder: team.founder, events: all });
    if (!dg || dg.run !== run) throw new DomainError('DIGEST', 'Verdichten kann nur, wer zum Stichtag Bauleitung war.');
    const events = all.filter(e => !coveredByDigest(e, dg) && !(rejectedIds.has(e.id) && compareEvents(e, cutoff) <= 0));
    return { events, replaced: all.filter(e => coveredByDigest(e, dg)).length };
  };
  const first = build(draft(0));
  const covered = team.events.length - first.events.length + draft(0).length;
  const digest = draft(covered);
  const { events, replaced } = build(digest);
  const next: TeamState = { ...team, events };
  if (digestProjection(foldTeam(next, ctx)) !== digestProjection(foldTeam(team, ctx)))
    throw new DomainError('DIGEST', 'Verdichten abgebrochen: der Teamstand wäre danach anders. Bitte einen Fehlerbericht schicken.');
  const kept = new Set(events.map(e => e.id));
  const rejectedDropped = team.events.filter(e => rejectedIds.has(e.id) && !kept.has(e.id) && compareEvents(e, cutoff) <= 0).length;
  return { team: next, cutoff, eventsBefore: team.events.length, eventsAfter: events.length, replaced, rejectedDropped, parts: digest.length, bytesBefore: size(team), bytesAfter: size(next) };
}

/** Default cutoff: midnight (UTC) `days` days before now. */
export function compactBefore(days: number, now: string = new Date().toISOString()): string {
  const d = new Date(Date.parse(now) - Math.max(0, days) * 86_400_000);
  return `${d.toISOString().slice(0, 10)}T00:00:00.000Z`;
}
