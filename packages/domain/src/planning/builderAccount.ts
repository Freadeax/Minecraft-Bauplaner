/**
 * PROJ-05: Bauleute-Konto – Lagerbuchungen je Bauleute in der Projektplanung, ohne Server.
 *
 * Joins the schedule (`planProgram`, what each builder still needs for the assigned sections) with
 * the team log (`teamView`: deliveries, chest bookings, gathering promises) and, optionally, the live
 * presence of the Team-Raum. Everything is derived; nothing is stored. Member ids are builder ids
 * (teamIntoProgram keeps them equal), so the join is by id.
 */
import type { ProgramPlan } from './program.js';
import type { TeamView } from '../team/team.js';

/** One item of a builder's account. All counts are items, never stacks. */
export interface AccountLine {
  readonly itemId: string;
  /** Still missing for the builder's open sections (after the site stock). */
  readonly missing: number;
  /** Promised by this builder (gather.claim). */
  readonly claimed: number;
  /** Promised by other team members for the same item. */
  readonly claimedByOthers: number;
  /** Missing minus all promises (never below 0): nobody has said they bring it yet. */
  readonly open: number;
  /** Delivered (contribution) plus booked into team chests by this builder. */
  readonly brought: number;
  /** Taken out of team chests by this builder. */
  readonly taken: number;
}

export interface BuilderPresence {
  readonly where: 'planer' | 'spiel' | 'server';
  readonly section?: string;
  readonly player?: string;
  readonly since: string;
}

export interface BuilderAccount {
  readonly id: string;
  readonly name: string;
  /** Builder is known in the team log (joined or founder). */
  readonly inTeam: boolean;
  readonly player?: string;
  /** Live in the Team-Raum right now; the game wins over the planer when both are open. */
  readonly live?: BuilderPresence;
  readonly away?: { readonly until?: string; readonly note?: string };
  /** Lines sorted: open first (most open), then the rest by name. Items only booked (no need) come last. */
  readonly lines: readonly AccountLine[];
  readonly totals: { readonly missing: number; readonly claimed: number; readonly open: number; readonly brought: number; readonly taken: number };
  /** Brought minus taken over all items (positive = the builder put more into the team stores than they took). */
  readonly balance: number;
  /** Blocks placed in section boxes (Baunachweis), 0 without plugin/mod numbers. */
  readonly placed: number;
}

/** Team members not (yet) in the planning: candidates for „Bauleute aus dem Spiel“. */
export interface AccountCandidate {
  readonly id: string;
  readonly name: string;
  readonly player?: string;
  readonly live: boolean;
  readonly sections: number;
}

export interface AccountReport {
  readonly accounts: readonly BuilderAccount[];
  /** Items still missing for assigned sections that nobody promised; largest open count over the builders (shared sections count once). */
  readonly unclaimed: readonly { readonly itemId: string; readonly open: number; readonly builders: readonly string[] }[];
  readonly candidates: readonly AccountCandidate[];
  /** Live players in the game whose member id is not in the planning nor in the team (seen only through the room). */
  readonly strangers: readonly { readonly member: string; readonly player?: string }[];
  /** Without team: the accounts only show the need. */
  readonly hasTeam: boolean;
}

/** Live presence entry as the Team-Raum sends it (roomClient `Presence`). */
export interface RoomPresence { readonly member: string; readonly where: 'planer' | 'spiel' | 'server'; readonly section?: string; readonly player?: string; readonly since: string }

const ns = (id: string): string => id.includes(':') ? id : `minecraft:${id}`;
const add = (m: Map<string, number>, id: string, n: number) => { if (n > 0) m.set(ns(id), (m.get(ns(id)) ?? 0) + n); };
const sum = (m: ReadonlyMap<string, number>): number => [...m.values()].reduce((a, b) => a + b, 0);

/** Best presence of one member: game before planer, newest first. The server key never counts as a builder. */
function presenceOf(list: readonly RoomPresence[], member: string): BuilderPresence | undefined {
  const own = list.filter(p => p.member === member && p.where !== 'server')
    .sort((a, b) => (a.where === 'spiel' ? 0 : 1) - (b.where === 'spiel' ? 0 : 1) || b.since.localeCompare(a.since));
  const p = own[0];
  return p ? { where: p.where, since: p.since, ...(p.section && { section: p.section }), ...(p.player && { player: p.player }) } : undefined;
}

export function builderAccounts(plan: Pick<ProgramPlan, 'builders'>, view: TeamView | null, presence: readonly RoomPresence[] = []): AccountReport {
  const members = new Map((view?.members ?? []).map(m => [m.id, m]));
  const claims = new Map<string, Map<string, number>>(); // member → item → count
  for (const g of view?.gather ?? []) { let m = claims.get(g.member); if (!m) claims.set(g.member, m = new Map()); add(m, g.item, g.count); }
  const claimTotal = new Map<string, number>();
  for (const m of claims.values()) for (const [item, n] of m) claimTotal.set(item, (claimTotal.get(item) ?? 0) + n);

  const unclaimed = new Map<string, { open: number; builders: string[] }>();
  const accounts: BuilderAccount[] = plan.builders.map(b => {
    const member = members.get(b.id);
    const own = claims.get(b.id) ?? new Map<string, number>();
    const brought = new Map<string, number>(), taken = new Map<string, number>();
    for (const [item, n] of Object.entries(member?.items ?? {})) add(brought, item, n);
    for (const [item, n] of Object.entries(member?.stored ?? {})) add(brought, item, n);
    for (const [item, n] of Object.entries(member?.taken ?? {})) add(taken, item, n);
    const missing = new Map<string, number>();
    for (const i of b.items) add(missing, i.itemId, i.missing);
    const ids = new Set([...missing.keys(), ...own.keys(), ...brought.keys(), ...taken.keys()]);
    const lines: AccountLine[] = [...ids].map(itemId => {
      const need = missing.get(itemId) ?? 0, mine = own.get(itemId) ?? 0, others = Math.max(0, (claimTotal.get(itemId) ?? 0) - mine);
      return { itemId, missing: need, claimed: mine, claimedByOthers: others, open: Math.max(0, need - mine - others), brought: brought.get(itemId) ?? 0, taken: taken.get(itemId) ?? 0 };
    }).sort((x, y) => y.open - x.open || (y.missing ? 1 : 0) - (x.missing ? 1 : 0) || x.itemId.localeCompare(y.itemId));
    for (const l of lines) if (l.open > 0) {
      const u = unclaimed.get(l.itemId) ?? { open: 0, builders: [] };
      u.open = Math.max(u.open, l.open); u.builders.push(b.id); unclaimed.set(l.itemId, u);
    }
    const live = presenceOf(presence, b.id);
    const tot = (f: (l: AccountLine) => number) => lines.reduce((n, l) => n + f(l), 0);
    return { id: b.id, name: b.name, inTeam: !!member, ...((member?.player) && { player: member.player }),
      ...(live && { live }), ...(member?.away && { away: member.away }), lines,
      totals: { missing: tot(l => l.missing), claimed: tot(l => l.claimed), open: tot(l => l.open), brought: sum(brought), taken: sum(taken) },
      balance: sum(brought) - sum(taken), placed: member?.tally === false ? 0 : member?.placed ?? 0 };
  });

  const planned = new Set(plan.builders.map(b => b.id));
  const candidates: AccountCandidate[] = (view?.members ?? [])
    .filter(m => !planned.has(m.id) && !(m.role === 'gast' && !m.sections.length))
    .map(m => ({ id: m.id, name: m.name, ...(m.player && { player: m.player }), live: !!presenceOf(presence, m.id), sections: m.sections.length }))
    .sort((a, b) => Number(b.live) - Number(a.live) || a.name.localeCompare(b.name));
  const strangerMap = new Map<string, { member: string; player?: string }>();
  for (const p of presence) if (p.where === 'spiel' && !planned.has(p.member) && !members.has(p.member)) strangerMap.set(p.member, { member: p.member, ...(p.player && { player: p.player }) });
  return {
    accounts,
    unclaimed: [...unclaimed].map(([itemId, u]) => ({ itemId, ...u })).sort((a, b) => b.open - a.open || a.itemId.localeCompare(b.itemId)),
    candidates, strangers: [...strangerMap.values()], hasTeam: !!view,
  };
}

const short = (id: string): string => id.replace(/^minecraft:/, '');

/** Text block for the Bauzettel: what the builder promised, brought and still has to organise. */
export function accountText(account: BuilderAccount): string[] {
  const lines: string[] = [];
  const open = account.lines.filter(l => l.open > 0), promised = account.lines.filter(l => l.claimed > 0), booked = account.lines.filter(l => l.brought || l.taken);
  if (open.length) { lines.push('', 'Noch ohne Zusage (niemand im Team bringt es bisher)'); for (const l of open) lines.push(`- ${short(l.itemId)}: ${l.open}`); }
  if (promised.length) { lines.push('', 'Deine Sammelzusagen'); for (const l of promised) lines.push(`- ${short(l.itemId)}: ${l.claimed}${l.missing ? ` (für deine Abschnitte fehlen ${l.missing})` : ''}`); }
  if (booked.length) {
    lines.push('', `Deine Lagerbuchungen (eingebracht ${account.totals.brought}, entnommen ${account.totals.taken}, Saldo ${account.balance > 0 ? '+' : ''}${account.balance})`);
    for (const l of booked) lines.push(`- ${short(l.itemId)}: +${l.brought}${l.taken ? ` / −${l.taken}` : ''}`);
  }
  return lines;
}
