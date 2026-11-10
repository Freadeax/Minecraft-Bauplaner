// Team-Raum client (COOP-07, docs/architecture/team/TEAM_LIVE.md): HTTP calls and the live connection.
// The sync logic itself is pure (packages/domain/src/team/teamSync.ts); this file only moves bytes.
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { LINK_TIMING, MAX_BACKUP_BYTES, afterRestore, gunzipCapped, appendLocal, confirm, deriveLeaderSeed, deriveSignKey, ingest, leaderPublicKey, linkDead, nextBatch, numberPage, reconnectDelay, retryDelay, screenFeed, signLeaderBatch, teamEvent, teamView, trackOutbox, upgradeTrust, verifyEvent } from '../../../../../../packages/domain/src/index.js';
import type { AppendAnswer, Batch, FeedAnswer, RoomIdentity, RoomTeam, SeqEvent, StaleStep, TeamEvent, TeamLive, TeamRole } from '../../../../../../packages/domain/src/index.js';

const URL_KEY = 'bauplaner.teamraum.adresse';
/** Window event: the room was restored from a backup in this browser, so the live link reconnects at once. */
export const ROOM_RESTORED = 'bauplaner:team-raum-zurueck';
export { DEFAULT_ROOM_URL } from './roomAddress';
import { DEFAULT_ROOM_URL, ROOM_URL_REFUSED, roomUrlAllowed } from './roomAddress';
export { LOCAL_ROOM, roomUrlAllowed, ROOM_URL_REFUSED } from './roomAddress';
/** Throws when a stored or invited room lies elsewhere (old invitation, backup from a self-hosted room). */
export function assertRoomUrl(url: string): void { if (!roomUrlAllowed(url)) throw new RoomError(0, 'raum-adresse', ROOM_URL_REFUSED); }
export const readRoomUrl = (): string => { try { const u = localStorage.getItem(URL_KEY); return u && roomUrlAllowed(u) ? u : DEFAULT_ROOM_URL; } catch { return DEFAULT_ROOM_URL; } };
export const saveRoomUrl = (url: string) => { try { localStorage.setItem(URL_KEY, url.trim().replace(/\/+$/, '')); } catch { /* private mode */ } };

export class RoomError extends Error { constructor(readonly status: number, readonly code: string, message: string) { super(message); } }

async function call<T>(base: string, path: string, init: RequestInit & { key?: string } = {}): Promise<T> {
  const { key, ...rest } = init;
  assertRoomUrl(base);
  let response: Response;
  try {
    response = await fetch(`${base.replace(/\/+$/, '')}${path}`, { ...rest, headers: { ...(rest.body && typeof rest.body === 'string' && { 'Content-Type': 'application/json' }), ...(key && { Authorization: `Bearer ${key}` }), ...rest.headers } });
  } catch { throw new RoomError(0, 'netz', 'Team-Raum nicht erreichbar (offline oder Adresse falsch).'); }
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string; message?: string };
    throw new RoomError(response.status, body.error ?? 'fehler', body.message ?? `Team-Raum antwortet mit ${response.status}.`);
  }
  const type = response.headers.get('Content-Type') ?? '';
  return (type.includes('json') ? await response.json() : new Uint8Array(await response.arrayBuffer())) as T;
}

/** TEAM-SEC-01: a new room knows its founder and the Bauleitung's public key from the start (strict: own keys only). */
export const createRoom = (base: string, teamId: string, name: string, founder?: string, leaderKey?: string) =>
  call<{ room: string; adminKey: string; memberKey: string; serverKey: string }>(base, '/v1/rooms', { method: 'POST', body: JSON.stringify({ teamId, name, ...(founder && { founder }), ...(leaderKey && { leaderKey }) }) });
/** The key this browser writes and connects with: the Bauleitung its admin key (it is the founder), everybody else its own key. */
export const writeKey = (live: Pick<TeamLive, 'key' | 'adminKey'>): string => live.adminKey ?? live.key;
export const roomInfo = (live: Pick<TeamLive, 'url' | 'room' | 'key' | 'adminKey'>) => call<{ teamId: string; name: string; events: number; header: boolean; cursor: string; identity?: RoomIdentity }>(live.url, `/v1/rooms/${live.room}`, { key: writeKey(live) });
export const postBatch = (live: TeamLive, batch: Batch) => call<AppendAnswer>(live.url, `/v1/rooms/${live.room}/events`, { method: 'POST', body: JSON.stringify(batch), key: writeKey(live) });

// TEAM-SEC-01 (docs/architecture/team/TEAM_IDENTITY.md): own keys per member.
export interface RoomKey { readonly id: string; readonly member: string; readonly label: string; readonly createdAt: string; readonly lastUsed: string | null; readonly pending: boolean; readonly role: TeamRole }
type KeyRoom = Pick<TeamLive, 'url' | 'room' | 'key' | 'adminKey'>;
/** With the invitation: an own key bound to `member`. */
export const joinRoom = (live: Pick<TeamLive, 'url' | 'room' | 'key'>, member: string, label = 'Planer') =>
  call<{ member: string; key: string; keyId: string; role: TeamRole; pending: boolean }>(live.url, `/v1/rooms/${live.room}/join`, { method: 'POST', body: JSON.stringify({ member, label }), key: live.key });
/** Another device key for oneself (the game); the Bauleitung with its admin key. */
export const addRoomKey = (live: KeyRoom, label: string) => call<{ member: string; key: string; keyId: string }>(live.url, `/v1/rooms/${live.room}/keys`, { method: 'POST', body: JSON.stringify({ label }), key: writeKey(live) });
export const listRoomKeys = (live: KeyRoom) => call<{ keys: RoomKey[] }>(live.url, `/v1/rooms/${live.room}/keys`, { key: writeKey(live) }).then(r => r.keys);
export const revokeRoomKey = (live: KeyRoom, keyId: string) => call<{ ok: true; revoked: string; member: string }>(live.url, `/v1/rooms/${live.room}/keys/${encodeURIComponent(keyId)}`, { method: 'DELETE', key: writeKey(live) });
export const approveMember = (live: KeyRoom, member: string) => call<{ ok: true; member: string; role: TeamRole }>(live.url, `/v1/rooms/${live.room}/members/${encodeURIComponent(member)}/approve`, { method: 'POST', key: writeKey(live) });
export const setRoomIdentity = (live: KeyRoom, body: { founder?: string; roles?: Record<string, TeamRole>; leaderKey?: string; strict?: boolean }) =>
  call<RoomIdentity>(live.url, `/v1/rooms/${live.room}/identity`, { method: 'POST', body: JSON.stringify(body), key: live.adminKey ?? '' });
export const getFeed = (live: TeamLive) => call<FeedAnswer>(live.url, `/v1/rooms/${live.room}/events?after=${encodeURIComponent(live.cursor)}`, { key: live.key });
export const putHeader = (live: TeamLive, header: unknown) => call<{ ok: true }>(live.url, `/v1/rooms/${live.room}/header`, { method: 'PUT', body: JSON.stringify(header), key: live.adminKey ?? live.key });
/** New invitation key (who = member) or server key (who = server); only with the admin key. Old links stop working. */
export const rotateKey = (live: TeamLive, who: 'member' | 'server' | 'admin') => call<{ memberKey?: string; serverKey?: string; adminKey?: string }>(live.url, `/v1/rooms/${live.room}/rotate?wer=${who}`, { method: 'POST', key: live.adminKey ?? live.key });
/** BACKUP-03: every event of the room with its arrival number (pages of 500, numbered like the server plugin does). */
export async function allRoomEvents(live: TeamLive): Promise<SeqEvent[]> {
  const out: SeqEvent[] = [];
  let after = '';
  for (let page = 0; page < 200; page++) {
    const a = await call<FeedAnswer>(live.url, `/v1/rooms/${live.room}/events?after=${encodeURIComponent(after)}&limit=500`, { key: live.adminKey ?? live.key });
    out.push(...numberPage(a.events as TeamEvent[], a.cursor));
    if (!a.more || a.cursor === after) return out;
    after = a.cursor;
  }
  return out;
}
export const getHeader = <T>(live: Pick<TeamLive, 'url' | 'room' | 'key'>) => call<T>(live.url, `/v1/rooms/${live.room}/header`, { key: live.key });

// OPS-04: Sicherung und Wiederherstellung (docs/architecture/team/TEAM_BACKUP.md); everything with the admin key.
export interface RoomBackup { readonly id: string; readonly at: string; readonly reason: string; readonly events: number; readonly cursor: string; readonly bytes: number; readonly name: string; readonly header: boolean; readonly plans: number; readonly docs: readonly string[] }
export interface RoomState {
  readonly deleted?: boolean; readonly deletedAt?: string; readonly restorableUntil?: string | null;
  readonly events?: number; readonly cursor?: string; readonly epoch?: string; readonly connections?: number; readonly serverOnline?: boolean;
  readonly lastActivity?: string | null; readonly lastBackup?: RoomBackup | null; readonly backups: number; readonly unsaved?: boolean;
  readonly nextAlarm?: string | null; readonly deleteAfter?: string; readonly error?: { readonly at: string; readonly message: string } | null;
  readonly limits?: { readonly events: number }; readonly bytes?: number | null;
}
type AdminRoom = Pick<TeamLive, 'url' | 'room'> & { readonly adminKey?: string };
const adminOf = (live: AdminRoom) => { if (!live.adminKey) throw new RoomError(403, 'nur-bauleitung', 'Das darf nur die Bauleitung (Verwaltungsschlüssel fehlt in diesem Browser).'); return live.adminKey; };
export const getRoomState = (live: AdminRoom) => call<RoomState>(live.url, `/v1/rooms/${live.room}/status`, { key: adminOf(live) });
export const listBackups = (live: AdminRoom) => call<{ backups: RoomBackup[]; reasons: Record<string, string> }>(live.url, `/v1/rooms/${live.room}/backups`, { key: adminOf(live) });
export const makeBackup = (live: AdminRoom) => call<RoomBackup>(live.url, `/v1/rooms/${live.room}/backups`, { method: 'POST', key: adminOf(live) });
export const restoreBackup = (live: AdminRoom, backup: string) => call<{ ok: true; epoch: string; events: number; cursor: string; keys: 'unveraendert' | 'aus-sicherung'; before?: string }>(live.url, `/v1/rooms/${live.room}/restore`, { method: 'POST', body: JSON.stringify({ backup }), key: adminOf(live) });
export const deleteRoom = (live: AdminRoom) => call<{ deleted: true; backup: string; restorableUntil: string }>(live.url, `/v1/rooms/${live.room}?bestaetigen=${encodeURIComponent(live.room)}`, { method: 'DELETE', key: adminOf(live) });
export const serviceStatus = (url: string) => call<{ ok: boolean; version: number; features?: string[]; deployment?: { id?: string } | string | null }>(url, '/v1/status');
/** Old HMAC signing key of the Bauleitung (GAME-06): only to check its old signatures when a room is upgraded. */
const signKeys = new Map<string, Promise<string>>();
export const signKeyOf = (adminKey: string): Promise<string> => { let k = signKeys.get(adminKey); if (!k) signKeys.set(adminKey, k = deriveSignKey(adminKey)); return k; };
/** TEAM-SEC-01: Ed25519 key of the Bauleitung (seed private, public key for everybody else), once per admin key. */
const seeds = new Map<string, Promise<{ seed: string; pub: string }>>();
export const leaderKeysOf = (adminKey: string): Promise<{ seed: string; pub: string }> => {
  let k = seeds.get(adminKey);
  if (!k) seeds.set(adminKey, k = deriveLeaderSeed(adminKey).then(async seed => ({ seed, pub: await leaderPublicKey(seed) })));
  return k;
};
/** The batch as it goes to the room: the founder's events signed (Ed25519) when this planner holds the admin key. */
export async function signedBatch(team: RoomTeam, batch: Batch): Promise<Batch> {
  if (!team.live?.adminKey) return batch;
  let seed: string;
  try { seed = (await leaderKeysOf(team.live.adminKey)).seed; } catch { return batch; } // browser without Ed25519: unsigned, the room still checks the author
  return { ...batch, events: await signLeaderBatch(seed, team, batch.events) };
}

/** Every event of the room with its arrival number (for the upgrade confirmation). */
async function allRows(live: TeamLive): Promise<{ event: unknown; seq: string }[]> {
  const rows: { event: unknown; seq: string }[] = [];
  let after = '', feed: FeedAnswer;
  do {
    feed = await call<FeedAnswer>(live.url, `/v1/rooms/${live.room}/events?after=${encodeURIComponent(after)}`, { key: writeKey(live) });
    feed.events.forEach((event, i) => rows.push({ event, seq: feed.seqs?.[i] ?? '' }));
    after = feed.cursor;
  } while (feed.more);
  return rows;
}

/**
 * TEAM-SEC-01: makes this browser's connection to the room personal and learns what the room checks. Returns the team
 * with the updated live part (or the same team). Bauleitung: an old room learns founder, roles and public key, and the
 * Bauleitung confirms the room's past with a signed team.trust (forged steps in its name excepted). Member: the shared
 * invitation is swapped for an own key. Rooms of an older service (no identity) stay as they were.
 */
export async function secureRoom(team: RoomTeam, me: string | undefined): Promise<{ team: RoomTeam; message?: string }> {
  const live = team.live;
  if (!live) return { team };
  if (!live.adminKey && !live.personal) {
    if (!me) { try { return { team: await withIdentity(team) }; } catch { return { team }; } }
    try {
      const r = await joinRoom(live, me);
      team = { ...team, live: { ...live, key: r.key, personal: true } };
      return { team: await withIdentity(team), ...(r.pending && { message: 'Dein persönlicher Schlüssel wartet noch auf die Bestätigung der Bauleitung – bis dahin hast du im Raum Helferrechte.' }) };
    } catch (e) {
      if (e instanceof RoomError && e.status === 404) return { team }; // service before TEAM-SEC-01
      if (e instanceof RoomError && e.code === 'mitglied-vergeben') return { team, message: 'Für dich gibt es im Team-Raum schon einen persönlichen Schlüssel (anderes Gerät?). Bitte die Bauleitung, den alten unter „Zugänge“ zu widerrufen, dann hier neu verbinden.' };
      throw e;
    }
  }
  team = await withIdentity(team);
  const id = team.live!.identity;
  if (!live.adminKey || !id) return { team };
  const { pub } = await leaderKeysOf(live.adminKey);
  if (id.founder === team.founder && id.leaderKey === pub) return { team };
  // The Bauleitung upgrades its room (or, after „Verwaltungsschlüssel wechseln“, hands over its new public key).
  const firstTime = !id.founder;
  const rows = await allRows(team.live!);
  const trust = firstTime ? await upgradeTrust(team, rows, await signKeyOf(live.adminKey), (k, teamId, e) => verifyEvent(k, teamId, e)) : null;
  const skip = new Set(trust?.except ?? []);
  const roles: Record<string, TeamRole> = {};
  for (const m of teamView({ ...team, events: team.events.filter(e => !skip.has(e.id)) }, { sections: [], builders: [] }).members) if (m.id !== team.founder) roles[m.id] = m.role;
  const identity = await setRoomIdentity(team.live!, { founder: team.founder, leaderKey: pub, ...(firstTime && { roles }) });
  team = { ...team, live: { ...team.live!, identity } };
  if (trust) {
    const body = { kind: 'team.trust' as const, upTo: trust.upTo, ...(trust.except.length && { except: trust.except }) };
    team = appendLocal(team, [teamEvent(team.founder, body)]);
    return { team, message: trust.except.length ? `Team-Raum abgesichert: ${trust.except.length} Schritt(e) im Namen der Bauleitung ohne gültige Unterschrift werden nicht mehr übernommen.` : 'Team-Raum abgesichert: ab jetzt prüft der Raum, wer etwas schreibt.' };
  }
  return { team };
}
async function withIdentity(team: RoomTeam): Promise<RoomTeam> {
  const info = await roomInfo(team.live!);
  return info.identity ? { ...team, live: { ...team.live!, identity: info.identity } } : team;
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource));
  return [...d].map(b => b.toString(16).padStart(2, '0')).join('');
}
/** As the room stores them (core.js LIMITS.planBytes) and at most one backup plus team data unpacked (P1 Härtung). */
const PLAN_GZ_BYTES = 25 * 1024 * 1024, PLAN_JSON_BYTES = MAX_BACKUP_BYTES + 10_000_000;
/** Uploads a plan snapshot (a team package with plan, gzip) and returns its SHA-256. */
export async function putPlan(live: TeamLive, text: string): Promise<string> {
  const raw = new TextEncoder().encode(text);
  const gz = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
  const sha = await sha256Hex(gz);
  await call(live.url, `/v1/rooms/${live.room}/plan/${sha}`, { method: 'PUT', body: gz as BodyInit, key: live.adminKey ?? live.key, headers: { 'Content-Type': 'application/gzip' } });
  return sha;
}
export async function getPlan(live: Pick<TeamLive, 'url' | 'room' | 'key'>, sha: string): Promise<string> {
  const gz = await call<Uint8Array>(live.url, `/v1/rooms/${live.room}/plan/${sha}`, { key: live.key });
  if (gz.byteLength > PLAN_GZ_BYTES) throw new RoomError(0, 'plan-groesse', 'Planstand aus dem Team-Raum ist größer als 25 MB.');
  if (await sha256Hex(gz) !== sha) throw new RoomError(0, 'pruefsumme', 'Planstand aus dem Team-Raum ist beschädigt.');
  return new TextDecoder().decode(await gunzipCapped(gz, PLAN_JSON_BYTES));
}

/** Block position a game reports for the live map (LINK-07). */
export interface RoomPos { readonly x: number; readonly y: number; readonly z: number; readonly dim: string; readonly yaw?: number; readonly at: string }
export interface Presence { readonly member: string; readonly device: string; readonly where: 'planer' | 'spiel' | 'server'; readonly section?: string; readonly since: string; readonly player?: string; readonly pos?: RoomPos }
/** A recording a game put into the room (LINK-07, „Aufnahme anfordern“ or /bauplaner team aufnahme). */
export interface RoomScan { readonly id: string; readonly file: string; readonly bytes: number; readonly at: string; readonly projectId?: string; readonly revision?: number; readonly by?: string; readonly sha256: string }
export const getScans = (live: Pick<TeamLive, 'url' | 'room' | 'key'>) => call<{ scans: RoomScan[] }>(live.url, `/v1/rooms/${live.room}/scans`, { key: live.key }).then(r => r.scans);
export const getScan = (live: Pick<TeamLive, 'url' | 'room' | 'key'>, id: string) => call<Uint8Array>(live.url, `/v1/rooms/${live.room}/scans/${encodeURIComponent(id)}`, { key: live.key });
export interface RoomConnection {
  readonly connected: boolean; readonly presence: readonly Presence[]; readonly error: string;
  /** Plan snapshot announced in the room header (sha), re-read on every header push. */
  readonly planSha: string; readonly planNumber?: number; readonly planRevision?: string;
  /** Steps of the others that came in while this project is open (newest last, at most 20). */
  readonly news: readonly { readonly key: string; readonly event: TeamEvent }[];
  dismiss(key?: string): void;
  /** Own events the room refused (form, size, server-only), with the reason. */
  readonly rejected: readonly { readonly id: string; readonly reason: string }[];
  clearRejected(): void;
  /** TEAM-02: own steps the room did not take because someone else decided about the same thing first. */
  readonly stale: readonly (StaleStep & { readonly event: TeamEvent })[];
  clearStale(): void;
  /** Recordings in the room, newest first (LINK-07). */
  readonly scans: readonly RoomScan[];
  /** Asks the connected games for a fresh recording; the answer (how many games got it) comes as `asked`. */
  askScan(projectId?: string): boolean;
  readonly asked?: { readonly games: number; readonly message?: string; readonly at: number };
  fetchScan(id: string): Promise<Uint8Array>;
}
export const NO_ROOM: RoomConnection = { connected: false, presence: [], error: '', planSha: '', news: [], dismiss: () => undefined, rejected: [], clearRejected: () => undefined, stale: [], clearStale: () => undefined,
  scans: [], askScan: () => false, fetchScan: () => Promise.reject(new Error('Kein Team-Raum verbunden.')) };

/**
 * Keeps a live team in sync while the tab is open: WebSocket with the room (push of new events and
 * presence), the outbox goes up as batches, and without WebSocket an HTTP poll with growing pause.
 * `save` stores the merged team without an undo step (incoming events are not the user's actions).
 */
export function useTeamRoom(team: RoomTeam | undefined, me: string | undefined, save: (t: RoomTeam) => void, section?: string): RoomConnection {
  const [connected, setConnected] = useState(false);
  const [news, setNews] = useState<readonly { readonly key: string; readonly event: TeamEvent }[]>([]);
  const [rejected, setRejected] = useState<readonly { readonly id: string; readonly reason: string }[]>([]);
  const meRef = useRef(me); meRef.current = me;
  const sectionRef = useRef(section); sectionRef.current = section;
  /** Only pushes count as news, not the catch-up after connecting (that would flood the screen). */
  const caughtUp = useRef(false);
  const noteNews = (added: readonly TeamEvent[]) => {
    if (!caughtUp.current) return;
    const others = added.filter(e => e.by !== meRef.current);
    if (others.length) setNews(n => [...n, ...others.map(e => ({ key: e.id, event: e }))].slice(-20));
  };
  const noteRejected = (r: AppendAnswer['rejected']) => { if (r.length) setRejected(x => [...x, ...r].slice(-50)); };
  const [stale, setStale] = useState<RoomConnection['stale']>([]);
  /** Result of an append (HTTP or WebSocket): outbox out, stale steps out of the log, hints for both. */
  const takeAnswer = (a: AppendAnswer) => {
    const cur = latest.current; if (!cur) return;
    const c = confirm(cur, a);
    noteRejected(c.rejected);
    if (c.stale.length) setStale(x => [...x, ...c.stale].slice(-20));
    apply(c.team);
  };
  const [presence, setPresence] = useState<readonly Presence[]>([]);
  const [scans, setScans] = useState<readonly RoomScan[]>([]);
  const [asked, setAsked] = useState<RoomConnection['asked']>();
  const [error, setError] = useState('');
  const latest = useRef(team); latest.current = team;
  const saveRef = useRef(save); saveRef.current = save;
  const ws = useRef<WebSocket | null>(null);
  const sending = useRef<string | null>(null);
  /** TEAM-02: an append over the WebSocket without answer is repeated (same batch id, the room books it once). */
  const answerTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [plan, setPlan] = useState<{ sha: string; number?: number; revision?: string }>({ sha: '' });
  /** For the poll loop, which lives across renders and must see the current plan, not the first one. */
  const planSha = useRef(''); planSha.current = plan.sha;
  const live = team?.live;
  const roomKey = live ? `${live.url}|${live.room}|${live.key}` : '';

  // Baseline for the outbox: whatever reaches the log through any local path (an action, an import,
  // „Mit Spiel abgleichen“) and is new against the last known state goes into the outbox.
  const baseline = useRef<RoomTeam | undefined>(team);
  const apply = (next: RoomTeam) => { latest.current = next; baseline.current = next; saveRef.current(next); };
  useEffect(() => {
    const t = team;
    if (!t?.live || baseline.current?.teamId !== t.teamId) { baseline.current = t; return; }
    const next = trackOutbox(baseline.current, t);
    baseline.current = next;
    if (next !== t) { latest.current = next; saveRef.current(next); }
  }, [team?.events]); // eslint-disable-line react-hooks/exhaustive-deps

  const readHeader = () => {
    const t = latest.current; if (!t?.live) return;
    void getHeader<{ plan?: { sha: string; revisionNumber?: number; revisionId?: string } }>(t.live).then(h => setPlan({ sha: h.plan?.sha ?? '',
      ...(h.plan?.revisionNumber !== undefined && { number: h.plan.revisionNumber }), ...(h.plan?.revisionId && { revision: h.plan.revisionId }) }))
      .catch(() => setPlan({ sha: '' }));
  };
  const flush = () => {
    const t = latest.current; if (!t?.live) return;
    // TEAM-SEC-01: a strict room takes nothing with the shared invitation – own steps wait until this browser has its own key.
    // Steps of others (e.g. from the plan package when joining) are the room's already – they leave the outbox, else the
    // bar would show „sendet …“ forever.
    if (!t.live.adminKey && !t.live.personal && t.live.identity?.strict) {
      const by = new Map(t.events.map(e => [e.id, e.by]));
      const own = t.live.pending.filter(id => !!t.self && by.get(id) === t.self);
      if (own.length !== t.live.pending.length) apply({ ...t, live: { ...t.live, pending: own } });
      return;
    }
    const plain = nextBatch(t); if (!plain || sending.current === plain.batch) return;
    sending.current = plain.batch;
    // GAME-06: the founder's planner signs its own events (deterministic, so a resend stays "known" in the room).
    void signedBatch(t, plain).then(batch => {
      const socket = ws.current, cur = latest.current;
      if (!cur?.live) { sending.current = null; return; }
      if (socket?.readyState === WebSocket.OPEN) {
        clearTimeout(answerTimer.current);
        answerTimer.current = setTimeout(() => { if (sending.current === batch.batch) { sending.current = null; flush(); } }, LINK_TIMING.answerMs);
        try { socket.send(JSON.stringify({ type: 'append', ...batch })); } catch { sending.current = null; }
        return;
      }
      return postBatch(cur.live, batch).then(a => { sending.current = null; takeAnswer(a); flush(); });
    }).catch(e => { sending.current = null; setError(e instanceof Error ? e.message : String(e)); });
  };

  // Outbox changes (own actions) → send.
  const pendingKey = live?.pending.join(',') ?? '';
  useEffect(() => { if (pendingKey) flush(); }, [pendingKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!roomKey || !latest.current?.live) return;
    // One poll loop and one reconnect timer at most: every failed WebSocket used to start another poll chain,
    // so a blocked WebSocket multiplied the HTTP requests with each retry.
    let stopped = false, failures = 0, polling = false, deleted = false, screening: Promise<void> = Promise.resolve();
    let openTimer: ReturnType<typeof setTimeout> | undefined, pollTimer: ReturnType<typeof setTimeout> | undefined;
    const schedulePoll = (ms: number) => { clearTimeout(pollTimer); pollTimer = setTimeout(() => { void poll(); }, ms); };
    const poll = async () => {
      const t = latest.current; if (stopped || !t?.live || polling) return;
      polling = true; clearTimeout(pollTimer);
      try {
        let feed: FeedAnswer, cur = t;
        const added: TeamEvent[] = [];
        do { feed = await getFeed(cur.live!); const r = ingest(cur, feed, undefined, await screenFeed(cur, feed)); cur = r.team; added.push(...r.added); } while (feed.more && !stopped);
        if (cur !== t) apply(cur);
        noteNews(added); caughtUp.current = true;
        flush(); setError(''); failures = 0;
        if (!planSha.current) readHeader();
      } catch (e) { failures++; setError(e instanceof Error ? e.message : String(e)); }
      finally { polling = false; }
      if (!stopped && ws.current?.readyState !== WebSocket.OPEN) schedulePoll(retryDelay(failures));
    };
    // TEAM-02: clean reconnect. Every socket gets an open timeout and a heartbeat; a socket that went quiet (laptop lid,
    // Wi-Fi gone without a close) is dropped by the planner itself. Reconnects come with a spread pause, and coming
    // back to the tab or online tries at once. A dropped socket never fires twice: `drop` detaches it first.
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    const drop = (socket: WebSocket, code?: number) => {
      if (ws.current !== socket) return;
      socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
      try { socket.close(); } catch { /* already closed */ }
      ws.current = null; clearInterval(heartbeat); clearTimeout(answerTimer.current);
      setConnected(false); setPresence([]); sending.current = null;
      if (stopped) return;
      if (code === 4401 || code === 4403) { setError('Der Team-Raum kennt diesen Schlüssel nicht mehr. Bitte die Bauleitung um einen neuen Einladungslink.'); return; }
      // OPS-04: room deleted by the Bauleitung (or after a long time unused); it can bring it back from a backup.
      if (code === 4404) {
        setError('Der Team-Raum wurde gelöscht. Die Bauleitung kann ihn unter „Sicherung und Zustand“ aus der letzten Sicherung zurückholen.');
        deleted = true;
        clearTimeout(openTimer); openTimer = setTimeout(open, 60_000); // comes back by itself once it is restored
        return;
      }
      // OPS-04: the room was restored from a backup – reconnect at once; the welcome tells the new mark.
      if (code === 4012) failures = 0;
      failures++; void poll();
      clearTimeout(openTimer); openTimer = setTimeout(open, reconnectDelay(failures - 1));
    };
    const open = () => {
      const t = latest.current; if (stopped || !t?.live || ws.current) return;
      let socket: WebSocket;
      if (!roomUrlAllowed(t.live.url)) { setError(ROOM_URL_REFUSED); return; }
      try { socket = new WebSocket(`${t.live.url.replace(/^http/, 'ws')}/v1/rooms/${t.live.room}/live`); } catch { void poll(); return; }
      ws.current = socket;
      let heard = Date.now();
      const opening = setTimeout(() => { if (socket.readyState !== WebSocket.OPEN) drop(socket); }, LINK_TIMING.openMs);
      socket.onopen = () => {
        clearTimeout(opening); heard = Date.now();
        socket.send(JSON.stringify({ type: 'hello', key: writeKey(t.live!), member: me ?? '?', device: t.live!.device, where: 'planer', ...(sectionRef.current && { section: sectionRef.current }), after: latest.current?.live?.cursor ?? '' }));
        clearInterval(heartbeat);
        heartbeat = setInterval(() => {
          if (linkDead(heard, Date.now())) { drop(socket); return; }
          try { socket.send('{"type":"ping"}'); } catch { drop(socket); }
        }, LINK_TIMING.pingMs);
      };
      socket.onmessage = m => {
        heard = Date.now();
        let d: { type: string } & Record<string, unknown>;
        try { d = JSON.parse(String(m.data)); } catch { return; }
        const cur = latest.current; if (!cur?.live) return;
        if (d.type === 'welcome') {
          // OPS-04: restored room → offer own steps again (the room answers „known“ for what it has).
          const restored = afterRestore(cur, typeof d.epoch === 'string' ? d.epoch : undefined);
          if (restored !== cur) apply(restored);
          clearTimeout(pollTimer); setConnected(true); setError(''); failures = 0; caughtUp.current = false; sending.current = null; flush(); if (d.header) readHeader(); void getScans(cur.live).then(setScans).catch(() => undefined); }
        else if (d.type === 'scan' && d.scan && typeof d.scan === 'object') { const sc = d.scan as RoomScan; setScans(l => [sc, ...l.filter(x => x.id !== sc.id)].slice(0, 12)); }
        else if (d.type === 'asked') setAsked({ games: Number(d.games) || 0, ...(typeof d.message === 'string' && { message: d.message }), at: Date.now() });
        else if (d.type === 'header' || d.type === 'plan') readHeader();
        else if (d.type === 'events') {
          // TEAM-SEC-01: checked in arrival order (the check is asynchronous), every step on the newest state.
          const feed = d as unknown as FeedAnswer;
          screening = screening.then(async () => {
            const now = latest.current; if (!now?.live || stopped) return;
            const r = ingest(now, feed, undefined, await screenFeed(now, feed));
            if (r.added.length || r.team.live?.cursor !== now.live.cursor || r.team.live?.held !== now.live.held) apply(r.team);
            noteNews(r.added);
            if (!feed.more) caughtUp.current = true;
          }).catch(e => setError(e instanceof Error ? e.message : String(e)));
        }
        else if (d.type === 'appended') {
          if (typeof d.batch !== 'string' || d.batch === sending.current) { sending.current = null; clearTimeout(answerTimer.current); }
          takeAnswer(d as unknown as AppendAnswer); flush();
        }
        else if (d.type === 'presence') setPresence((d.members as Presence[]) ?? []);
        else if (d.type === 'error') { sending.current = null; clearTimeout(answerTimer.current); setError(String(d.message ?? d.error)); }
      };
      socket.onclose = ev => { clearTimeout(opening); drop(socket, ev.code); };
    };
    // TEAM-SEC-01: first make the connection personal (own key, room upgrade by the Bauleitung), then connect.
    const startKey = latest.current.live.key, base = latest.current;
    void secureRoom(base, meRef.current).then(r => {
      if (stopped) return;
      // Only take over what secureRoom changed (key, identity, its team.trust): steps written meanwhile stay.
      const cur = latest.current;
      if (r.team !== base && r.team.live && cur?.live) {
        const known = new Set(base.events.map(e => e.id));
        const { key, personal, identity } = r.team.live;
        const next: RoomTeam = { ...cur, live: { ...cur.live, key, ...(personal !== undefined && { personal }), ...(identity && { identity }) } };
        const own = r.team.events.filter(e => !known.has(e.id));
        apply(own.length ? appendLocal(next, own) : next);
      }
      if (r.message) setError(r.message);
      if (r.team.live?.key === startKey) open(); // a new own key restarts this effect with it
    }).catch(e => { if (!stopped) { setError(e instanceof Error ? e.message : String(e)); open(); } });
    const now = () => { if (stopped) return; if (!ws.current) { failures = 0; clearTimeout(openTimer); open(); } else void poll(); };
    const onVisible = () => { if (document.visibilityState === 'visible') now(); };
    // Wi-Fi off: the browser knows at once, so the socket goes right away instead of after the 70 s heartbeat –
    // the bar shows „offline · N warten“ and new steps wait in the outbox instead of going into a dead socket.
    const gone = () => { if (ws.current) drop(ws.current); };
    window.addEventListener('online', now);
    window.addEventListener('offline', gone);
    // Block B (TEAMBAU-31): the Bauleitung just restored the room in this browser – reconnect at once instead of waiting.
    // Only for a deleted room (waiting a minute); a live socket gets the room's own 4012 close and reconnects by itself.
    const back = () => { if (!stopped && deleted && !ws.current) { deleted = false; failures = 0; clearTimeout(openTimer); open(); } };
    window.addEventListener(ROOM_RESTORED, back);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true; clearTimeout(openTimer); clearTimeout(pollTimer); clearInterval(heartbeat); clearTimeout(answerTimer.current);
      window.removeEventListener('online', now); window.removeEventListener('offline', gone); window.removeEventListener(ROOM_RESTORED, back); document.removeEventListener('visibilitychange', onVisible);
      const socket = ws.current; ws.current = null;
      if (socket) { socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null; try { socket.close(); } catch { /* closed */ } }
      setConnected(false);
    };
  }, [roomKey, me]); // eslint-disable-line react-hooks/exhaustive-deps

  // Where I am: my section in progress goes to the others' "Gerade da" whenever it changes.
  useEffect(() => {
    const socket = ws.current;
    if (connected && socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'presence', where: 'planer', ...(section ? { section } : { section: '' }) }));
  }, [section, connected]);
  const dismiss = (key?: string) => setNews(n => key ? n.filter(x => x.key !== key) : []);
  const askScan = (projectId?: string) => {
    const socket = ws.current;
    if (!connected || socket?.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ type: 'ask', what: 'scan', ...(projectId && { projectId }) }));
    return true;
  };
  const fetchScan = (id: string) => { const t = latest.current; return t?.live ? getScan(t.live, id) : Promise.reject(new Error('Kein Team-Raum verbunden.')); };
  return { connected, presence, error, planSha: plan.sha, ...(plan.number !== undefined && { planNumber: plan.number }), ...(plan.revision && { planRevision: plan.revision }),
    news, dismiss, rejected, clearRejected: () => setRejected([]), stale, clearStale: () => setStale([]), scans, askScan, ...(asked && { asked }), fetchScan };
}

/** The connection of the open project (mounted once in ProjectView, so live works in every tab). */
export const TeamRoomContext = createContext<RoomConnection>(NO_ROOM);
export const useRoomConnection = () => useContext(TeamRoomContext);
