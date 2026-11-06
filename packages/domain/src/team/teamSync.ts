/**
 * Team live (COOP-07, docs/architecture/team/TEAM_LIVE.md): the transport-neutral sync core. A team that is
 * "live" remembers the room it belongs to, how far it has read the room (cursor) and which of its own
 * events the room has not confirmed yet (outbox). Every transport – the hosted team room, the Paper
 * plugin as hub or the mod's `/v1/team` – only has to offer "append a batch" and "events after a
 * cursor"; merging stays the union by id of team.ts, so order of arrival never matters.
 * Pure functions; the page does the requests.
 */
import { DomainError } from '../core/types.js';
import { checkTeamEvent, compareEvents, mergeTeam } from './team.js';
import type { TeamEvent, TeamState } from './team.js';

export const ROOM_PROTOCOL = 'team-room';
export const ROOM_PROTOCOL_VERSION = 1;
/** Events per append request (TEAM_LIVE.md §4). */
export const MAX_BATCH = 200;

/** Local only (like `self`): never in a team package, a server file or the room. */
export interface TeamLive {
  /** Base URL of the room service, e.g. https://bauplaner-team.example.workers.dev */
  readonly url: string;
  readonly room: string;
  /** Invitation key (memberKey); the admin key is kept separately by the Bauleitung. */
  readonly key: string;
  /** Opaque read position of the transport ('' = from the start): arrival number in the room, last event id at the mod/plugin. */
  readonly cursor: string;
  /** Own events not yet confirmed by the room, in log order. */
  readonly pending: readonly string[];
  /** Device id for presence (random, per browser). */
  readonly device: string;
  readonly lastContact?: string;
  readonly adminKey?: string;
  /** Key for the Paper plugin (only the Bauleitung keeps it, for the server link). */
  readonly serverKey?: string;
  /**
   * TEAM-02: revision check. For own deciding steps (GUARDED_KINDS) the cursor this browser had read when the step
   * was made; it goes with the batch, and the room refuses the step as „stale“ when someone else changed the same
   * subject after that.
   */
  readonly bases?: Readonly<Record<string, string>>;
}
export type RoomTeam = TeamState & { readonly live?: TeamLive };

/**
 * TEAM-02 (TEAM_LIVE.md §13): kinds that decide about one subject; the room checks them against stale writes.
 * Same list as GUARDED_KINDS in services/team-room/src/core.js (a test keeps both equal).
 */
export const GUARDED_KINDS: readonly string[] = ['section.claim', 'section.assign', 'section.release', 'section.done', 'section.verify',
  'section.handover', 'section.accept', 'section.decline', 'note.resolve', 'member.role', 'member.away', 'store.config', 'store.chest', 'store.seal'];
const GUARDED = new Set(GUARDED_KINDS);
/** Subject keys of a deciding event, like subjectsOf in the room. */
export function subjectsOf(e: TeamEvent): string[] {
  if (!GUARDED.has(e.kind)) return [];
  const r = e as unknown as Record<string, unknown>, out: string[] = [];
  const add = (prefix: string, v: unknown) => { if (typeof v === 'string' && v) out.push(`${prefix}:${v.slice(0, 64)}`); };
  if (e.kind.startsWith('member.')) add('member', r.member);
  add('section', r.section); add('chest', r.chest); add('note', r.noteId);
  return out;
}

const fail = (m: string): never => { throw new DomainError('INVALID', `Team live: ${m}`); };
const ROOM_ID = /^[A-Za-z0-9_-]{6,64}$/;
const KEY = /^[A-Za-z0-9_-]{16,128}$/;

export function checkLive(raw: unknown): TeamLive {
  if (typeof raw !== 'object' || raw === null) return fail('kein Objekt');
  const r = raw as Record<string, unknown>;
  if (typeof r.url !== 'string' || !/^https:\/\/[^\s/]+(\/[^\s]*)?$/.test(r.url) && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/[^\s]*)?$/.test(r.url)) fail('Adresse muss https sein');
  if (typeof r.room !== 'string' || !ROOM_ID.test(r.room)) fail('Raum-ID ungültig');
  if (typeof r.key !== 'string' || !KEY.test(r.key)) fail('Schlüssel ungültig');
  if (r.adminKey !== undefined && (typeof r.adminKey !== 'string' || !KEY.test(r.adminKey))) fail('Verwaltungsschlüssel ungültig');
  if (r.serverKey !== undefined && (typeof r.serverKey !== 'string' || !KEY.test(r.serverKey))) fail('Serverschlüssel ungültig');
  if (typeof r.cursor !== 'string' || r.cursor.length > 80) fail('Cursor ungültig');
  if (!Array.isArray(r.pending) || r.pending.length > 20_000 || r.pending.some(p => typeof p !== 'string')) fail('Postausgang ungültig');
  if (typeof r.device !== 'string' || !ROOM_ID.test(r.device)) fail('Geräte-ID ungültig');
  if (r.bases !== undefined && (typeof r.bases !== 'object' || r.bases === null || Array.isArray(r.bases)
    || Object.values(r.bases as object).some(v => typeof v !== 'string' || v.length > 80))) fail('Revisionsstände ungültig');
  return raw as TeamLive;
}

/** Removes local fields before anything leaves the browser. */
export function shareable<T extends RoomTeam>(team: T): Omit<T, 'live' | 'self'> {
  const { live: _l, self: _s, ...rest } = team;
  return rest;
}

/** Puts a team into live mode; all events so far are in the outbox (the room takes the whole log once). */
export function goLive(team: TeamState, room: { url: string; room: string; key: string; adminKey?: string; serverKey?: string }, device: string): RoomTeam {
  const live: TeamLive = { url: room.url.replace(/\/+$/, ''), room: room.room, key: room.key, ...(room.adminKey && { adminKey: room.adminKey }), ...(room.serverKey && { serverKey: room.serverKey }), cursor: '', pending: team.events.map(e => e.id), device };
  return { ...team, live: checkLive(live) };
}

/** Joining by invitation: nothing of one's own is pending yet. */
export function joinLive(team: TeamState, room: { url: string; room: string; key: string }, device: string): RoomTeam {
  return { ...team, live: checkLive({ url: room.url.replace(/\/+$/, ''), room: room.room, key: room.key, cursor: '', pending: [], device }) };
}

export function leaveLive(team: RoomTeam): TeamState { const { live: _l, ...rest } = team; return rest; }

/** Appends own events; in live mode they also go into the outbox. One call = one batch for the room. */
export function appendLocal(team: RoomTeam, events: readonly TeamEvent[]): RoomTeam {
  const merged = mergeTeam(team, { ...team, events }).team as RoomTeam;
  if (!team.live) return merged;
  const fresh = events.filter(e => !team.live!.pending.includes(e.id));
  const pending = [...team.live.pending, ...fresh.map(e => e.id)];
  return { ...merged, live: withBases({ ...team.live, pending: present(merged, pending) }, fresh, team.self) };
}

/** Records the read cursor for own deciding steps; drops bases of events that left the outbox. */
function withBases(live: TeamLive, fresh: readonly TeamEvent[], self: string | undefined): TeamLive {
  const bases: Record<string, string> = {};
  const keep = new Set(live.pending);
  for (const [id, b] of Object.entries(live.bases ?? {})) if (keep.has(id)) bases[id] = b;
  for (const e of fresh) if (self && e.by === self && GUARDED.has(e.kind) && keep.has(e.id) && !(e.id in bases)) bases[e.id] = live.cursor || '0';
  const { bases: _old, ...rest } = live;
  return Object.keys(bases).length ? { ...rest, bases } : rest;
}

/** COOP-11: pending ids of events a digest replaced are dropped (the digest itself goes out instead). */
function present(team: TeamState, pending: readonly string[]): string[] {
  const ids = new Set(team.events.map(e => e.id));
  return pending.filter(id => ids.has(id));
}

/**
 * Outbox after any local change (a planner action, an import, a merged package): every event that is
 * new compared with the previous state goes into the outbox, so all existing ways of writing events
 * become live without knowing about the room. Events that came from the room are never new here,
 * because `ingest` stores them before the next local change.
 */
export function trackOutbox(previous: TeamState | undefined, next: RoomTeam): RoomTeam {
  if (!next.live) return next;
  const before = new Set((previous?.events ?? []).map(e => e.id)), queued = new Set(next.live.pending);
  const freshEvents = next.events.filter(e => !before.has(e.id) && !queued.has(e.id));
  const pending = present(next, [...next.live.pending, ...freshEvents.map(e => e.id)]);
  return pending.length !== next.live.pending.length || freshEvents.length ? { ...next, live: withBases({ ...next.live, pending }, freshEvents, next.self) } : next;
}

export interface Batch {
  readonly batch: string;
  readonly events: readonly TeamEvent[];
  /** TEAM-02: event id → room cursor read when the step was made (only own deciding steps). */
  readonly guards?: Readonly<Record<string, string>>;
}

/**
 * Next batch to send: the oldest pending events, at most MAX_BATCH. The batch id is derived from the
 * event ids, so a repeated send after a lost answer is recognised by the room as the same batch.
 */
export function nextBatch(team: RoomTeam, max = MAX_BATCH): Batch | null {
  if (!team.live?.pending.length) return null;
  const byId = new Map(team.events.map(e => [e.id, e]));
  const events = team.live.pending.map(id => byId.get(id)).filter((e): e is TeamEvent => !!e).slice(0, max);
  if (!events.length) return null;
  const guards: Record<string, string> = {};
  for (const e of events) { const b = team.live.bases?.[e.id]; if (b !== undefined) guards[e.id] = b; }
  return { batch: `b_${hash(events.map(e => e.id).join(','))}`, events, ...(Object.keys(guards).length && { guards }) };
}

/** Room answer to an append. */
export interface AppendAnswer {
  readonly cursor: string;
  readonly accepted: readonly string[];
  readonly known: readonly string[];
  readonly rejected: readonly { readonly id: string; readonly reason: string }[];
  /** TEAM-02: own steps the room did not take because someone else changed the subject meanwhile. */
  readonly stale?: readonly StaleStep[];
}
export interface StaleStep { readonly id: string; readonly subject: string; readonly by: string; readonly seq: string }

/**
 * Takes confirmed and rejected events out of the outbox. Rejected ones stay in the log (visible) but are not resent.
 * TEAM-02: stale steps never reached anyone, so they leave the local log as well – this browser then shows what the
 * other person decided (it arrives with the feed) instead of a state nobody else has. They come back as `stale`
 * with the event, for the hint „Anna war schneller“.
 */
export function confirm(team: RoomTeam, answer: AppendAnswer, now = new Date().toISOString()): { team: RoomTeam; rejected: AppendAnswer['rejected']; stale: readonly (StaleStep & { readonly event: TeamEvent })[] } {
  if (!team.live) return { team, rejected: [], stale: [] };
  const staleIds = new Set((answer.stale ?? []).map(s => s.id));
  const done = new Set([...answer.accepted, ...answer.known, ...answer.rejected.map(r => r.id), ...staleIds]);
  const byId = new Map(team.events.map(e => [e.id, e]));
  const stale = (answer.stale ?? []).flatMap(s => { const event = byId.get(s.id); return event ? [{ ...s, event }] : []; });
  const events = staleIds.size ? team.events.filter(e => !staleIds.has(e.id)) : team.events;
  const live = withBases({ ...team.live, pending: team.live.pending.filter(id => !done.has(id)), lastContact: now }, [], team.self);
  return { team: { ...team, events, live }, rejected: answer.rejected, stale };
}

/** Room answer to "events after cursor" (also the shape of a live push). */
export interface FeedAnswer {
  readonly events: readonly unknown[];
  /** Position after these events; empty keeps the old one. */
  readonly cursor: string;
  readonly more?: boolean;
  /** The transport did not know our cursor: read again from the start (union makes it harmless). */
  readonly reset?: boolean;
}

/**
 * Takes events from the room into the local log. Cursor only moves forward. Events with the same id
 * and a different content are reported (the local one is kept, as in mergeTeam).
 */
export function ingest(team: RoomTeam, feed: FeedAnswer, now = new Date().toISOString()): { team: RoomTeam; added: readonly TeamEvent[]; clashes: number; invalid: number } {
  const valid: TeamEvent[] = [];
  let invalid = 0;
  for (const raw of feed.events) { try { valid.push(checkTeamEvent(raw)); } catch { invalid++; } }
  const m = mergeTeam(team, { ...team, events: valid.sort(compareEvents) });
  const live = team.live ? { ...team.live, cursor: feed.reset && !feed.cursor ? '' : feed.cursor || team.live.cursor, lastContact: now, pending: present(m.team, team.live.pending) } : undefined;
  return { team: { ...(m.team as RoomTeam), ...(live && { live }) }, added: m.added, clashes: m.clashes.length, invalid };
}

export type RoomStatus = { readonly state: 'off' } | { readonly state: 'live' | 'waiting' | 'offline'; readonly pending: number; readonly lastContact?: string };

/** Status line: live (connected, nothing waiting), waiting (connected, outbox not empty), offline. */
export function roomStatus(team: RoomTeam, connected: boolean): RoomStatus {
  if (!team.live) return { state: 'off' };
  const pending = team.live.pending.length;
  const base = { pending, ...(team.live.lastContact && { lastContact: team.live.lastContact }) };
  return { state: !connected ? 'offline' : pending ? 'waiting' : 'live', ...base };
}

/** Next poll delay when the push channel is down: 5 s doubling to 60 s. */
export const retryDelay = (failures: number): number => Math.min(60_000, 5_000 * 2 ** Math.max(0, Math.min(failures, 4)));

/**
 * TEAM-02: reconnect pause with ±25 % spread, so that after a room update not every browser knocks at the same second.
 * The first try after a drop comes after about one second; then like retryDelay.
 */
export const reconnectDelay = (failures: number, random: () => number = Math.random): number =>
  Math.round((failures <= 0 ? 1_000 : retryDelay(failures - 1)) * (0.75 + 0.5 * Math.min(1, Math.max(0, random()))));

/**
 * TEAM-02: timings of a clean live connection. The planner pings every `pingMs` (the room answers without waking up);
 * hearing nothing for `deadMs` means the line is dead (laptop lid, lost Wi-Fi without a close) and the planner
 * reconnects. A WebSocket that does not open within `openMs` and an append without answer after `answerMs` are
 * given up and repeated (same batch id, so the room never books twice).
 */
export const LINK_TIMING = Object.freeze({ pingMs: 25_000, deadMs: 70_000, openMs: 15_000, answerMs: 15_000 });
export function linkDead(lastHeard: number, now: number, timing: { readonly deadMs: number } = LINK_TIMING): boolean { return now - lastHeard > timing.deadMs; }

// ---------------------------------------------------------------- invitation link

/** `#/team/beitreten?raum=<url>&id=<room>&k=<key>` – the key lives in the fragment, never in a request. */
export function inviteLink(pageBase: string, live: Pick<TeamLive, 'url' | 'room' | 'key'>): string {
  const q = new URLSearchParams({ raum: live.url, id: live.room, k: live.key });
  return `${pageBase.replace(/#.*$/, '')}#/team/beitreten?${q.toString()}`;
}
/** Link for the Paper plugin (`/bauplaner team verbinden <Link>`): same shape, the server key as `s`. */
export function serverLink(pageBase: string, live: Pick<TeamLive, 'url' | 'room'>, serverKey: string): string {
  const q = new URLSearchParams({ raum: live.url, id: live.room, s: serverKey });
  return `${pageBase.replace(/#.*$/, '')}#/team/beitreten?${q.toString()}`;
}
export interface Invite { readonly url: string; readonly room: string; readonly key: string; readonly kind: 'member' | 'server' }
export function readInvite(link: string): Invite {
  const hashPart = link.includes('#') ? link.slice(link.indexOf('#') + 1) : link;
  const q = new URLSearchParams(hashPart.includes('?') ? hashPart.slice(hashPart.indexOf('?') + 1) : hashPart);
  const server = q.get('s');
  const url = q.get('raum') ?? '', room = q.get('id') ?? '', key = server ?? q.get('k') ?? '';
  const live = checkLive({ url, room, key, cursor: '', pending: [], device: 'dev_check' });
  return { url: live.url, room: live.room, key: live.key, kind: server ? 'server' : 'member' };
}

// FNV-1a 64 as hex: stable batch ids without crypto (not a security feature).
function hash(text: string): string {
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < text.length; i++) { h ^= BigInt(text.charCodeAt(i)); h = (h * 0x100000001b3n) & 0xffffffffffffffffn; }
  return h.toString(16).padStart(16, '0');
}
