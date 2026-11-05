// Team-Raum client (COOP-07, docs/architecture/TEAM_LIVE.md): HTTP calls and the live connection.
// The sync logic itself is pure (packages/domain/src/teamSync.ts); this file only moves bytes.
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { confirm, ingest, nextBatch, retryDelay, trackOutbox } from '../../../../../packages/domain/src/index.js';
import type { AppendAnswer, Batch, FeedAnswer, RoomTeam, TeamEvent, TeamLive } from '../../../../../packages/domain/src/index.js';

const URL_KEY = 'bauplaner.teamraum.adresse';
/** Team-Raum of the project (Cloudflare worker bauplaner-team, services/team-room); own rooms can be entered instead. */
export const DEFAULT_ROOM_URL = 'https://bauplaner-team.team-room.workers.dev';
export const readRoomUrl = (): string => { try { return localStorage.getItem(URL_KEY) || DEFAULT_ROOM_URL; } catch { return DEFAULT_ROOM_URL; } };
export const saveRoomUrl = (url: string) => { try { localStorage.setItem(URL_KEY, url.trim().replace(/\/+$/, '')); } catch { /* private mode */ } };

export class RoomError extends Error { constructor(readonly status: number, readonly code: string, message: string) { super(message); } }

async function call<T>(base: string, path: string, init: RequestInit & { key?: string } = {}): Promise<T> {
  const { key, ...rest } = init;
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

export const createRoom = (base: string, teamId: string, name: string) =>
  call<{ room: string; adminKey: string; memberKey: string; serverKey: string }>(base, '/v1/rooms', { method: 'POST', body: JSON.stringify({ teamId, name }) });
export const roomInfo = (live: Pick<TeamLive, 'url' | 'room' | 'key'>) => call<{ teamId: string; name: string; events: number; header: boolean }>(live.url, `/v1/rooms/${live.room}`, { key: live.key });
export const postBatch = (live: TeamLive, batch: Batch) => call<AppendAnswer>(live.url, `/v1/rooms/${live.room}/events`, { method: 'POST', body: JSON.stringify(batch), key: live.key });
export const getFeed = (live: TeamLive) => call<FeedAnswer>(live.url, `/v1/rooms/${live.room}/events?after=${encodeURIComponent(live.cursor)}`, { key: live.key });
export const putHeader = (live: TeamLive, header: unknown) => call<{ ok: true }>(live.url, `/v1/rooms/${live.room}/header`, { method: 'PUT', body: JSON.stringify(header), key: live.adminKey ?? live.key });
/** New invitation key (who = member) or server key (who = server); only with the admin key. Old links stop working. */
export const rotateKey = (live: TeamLive, who: 'member' | 'server') => call<{ memberKey?: string; serverKey?: string }>(live.url, `/v1/rooms/${live.room}/rotate?wer=${who}`, { method: 'POST', key: live.adminKey ?? live.key });
export const getHeader = <T>(live: Pick<TeamLive, 'url' | 'room' | 'key'>) => call<T>(live.url, `/v1/rooms/${live.room}/header`, { key: live.key });

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource));
  return [...d].map(b => b.toString(16).padStart(2, '0')).join('');
}
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
  if (await sha256Hex(gz) !== sha) throw new RoomError(0, 'pruefsumme', 'Planstand aus dem Team-Raum ist beschädigt.');
  return await new Response(new Blob([gz as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
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
  /** Recordings in the room, newest first (LINK-07). */
  readonly scans: readonly RoomScan[];
  /** Asks the connected games for a fresh recording; the answer (how many games got it) comes as `asked`. */
  askScan(projectId?: string): boolean;
  readonly asked?: { readonly games: number; readonly message?: string; readonly at: number };
  fetchScan(id: string): Promise<Uint8Array>;
}
export const NO_ROOM: RoomConnection = { connected: false, presence: [], error: '', planSha: '', news: [], dismiss: () => undefined, rejected: [], clearRejected: () => undefined,
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
  const [presence, setPresence] = useState<readonly Presence[]>([]);
  const [scans, setScans] = useState<readonly RoomScan[]>([]);
  const [asked, setAsked] = useState<RoomConnection['asked']>();
  const [error, setError] = useState('');
  const latest = useRef(team); latest.current = team;
  const saveRef = useRef(save); saveRef.current = save;
  const ws = useRef<WebSocket | null>(null);
  const sending = useRef<string | null>(null);
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
    const batch = nextBatch(t); if (!batch || sending.current === batch.batch) return;
    const socket = ws.current;
    if (socket?.readyState === WebSocket.OPEN) { sending.current = batch.batch; socket.send(JSON.stringify({ type: 'append', ...batch })); return; }
    sending.current = batch.batch;
    void postBatch(t.live, batch).then(a => { sending.current = null; const cur = latest.current; if (cur) { const c = confirm(cur, a); noteRejected(c.rejected); apply(c.team); flush(); } })
      .catch(e => { sending.current = null; setError(e instanceof Error ? e.message : String(e)); });
  };

  // Outbox changes (own actions) → send.
  const pendingKey = live?.pending.join(',') ?? '';
  useEffect(() => { if (pendingKey) flush(); }, [pendingKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!roomKey || !latest.current?.live) return;
    // One poll loop and one reconnect timer at most: every failed WebSocket used to start another poll chain,
    // so a blocked WebSocket multiplied the HTTP requests with each retry.
    let stopped = false, failures = 0, polling = false;
    let openTimer: ReturnType<typeof setTimeout> | undefined, pollTimer: ReturnType<typeof setTimeout> | undefined;
    const schedulePoll = (ms: number) => { clearTimeout(pollTimer); pollTimer = setTimeout(() => { void poll(); }, ms); };
    const poll = async () => {
      const t = latest.current; if (stopped || !t?.live || polling) return;
      polling = true; clearTimeout(pollTimer);
      try {
        let feed: FeedAnswer, cur = t;
        const added: TeamEvent[] = [];
        do { feed = await getFeed(cur.live!); const r = ingest(cur, feed); cur = r.team; added.push(...r.added); } while (feed.more && !stopped);
        if (cur !== t) apply(cur);
        noteNews(added); caughtUp.current = true;
        flush(); setError(''); failures = 0;
        if (!planSha.current) readHeader();
      } catch (e) { failures++; setError(e instanceof Error ? e.message : String(e)); }
      finally { polling = false; }
      if (!stopped && ws.current?.readyState !== WebSocket.OPEN) schedulePoll(retryDelay(failures));
    };
    const open = () => {
      const t = latest.current; if (stopped || !t?.live) return;
      let socket: WebSocket;
      try { socket = new WebSocket(`${t.live.url.replace(/^http/, 'ws')}/v1/rooms/${t.live.room}/live`); } catch { void poll(); return; }
      ws.current = socket;
      socket.onopen = () => socket.send(JSON.stringify({ type: 'hello', key: t.live!.key, member: me ?? '?', device: t.live!.device, where: 'planer', ...(sectionRef.current && { section: sectionRef.current }), after: latest.current?.live?.cursor ?? '' }));
      socket.onmessage = m => {
        let d: { type: string } & Record<string, unknown>;
        try { d = JSON.parse(String(m.data)); } catch { return; }
        const cur = latest.current; if (!cur?.live) return;
        if (d.type === 'welcome') { clearTimeout(pollTimer); setConnected(true); setError(''); failures = 0; caughtUp.current = false; flush(); if (d.header) readHeader(); void getScans(cur.live).then(setScans).catch(() => undefined); }
        else if (d.type === 'scan' && d.scan && typeof d.scan === 'object') { const sc = d.scan as RoomScan; setScans(l => [sc, ...l.filter(x => x.id !== sc.id)].slice(0, 12)); }
        else if (d.type === 'asked') setAsked({ games: Number(d.games) || 0, ...(typeof d.message === 'string' && { message: d.message }), at: Date.now() });
        else if (d.type === 'header' || d.type === 'plan') readHeader();
        else if (d.type === 'events') {
          const feed = d as unknown as FeedAnswer, r = ingest(cur, feed);
          if (r.added.length || r.team.live?.cursor !== cur.live.cursor) apply(r.team);
          noteNews(r.added);
          if (!feed.more) caughtUp.current = true;
        }
        else if (d.type === 'appended') { sending.current = null; const c = confirm(cur, d as unknown as AppendAnswer); noteRejected(c.rejected); apply(c.team); flush(); }
        else if (d.type === 'presence') setPresence((d.members as Presence[]) ?? []);
        else if (d.type === 'error') { sending.current = null; setError(String(d.message ?? d.error)); }
      };
      socket.onclose = ev => {
        ws.current = null; setConnected(false); setPresence([]); sending.current = null;
        if (stopped) return;
        if (ev.code === 4401 || ev.code === 4403) { setError('Der Team-Raum kennt diesen Schlüssel nicht mehr. Bitte die Bauleitung um einen neuen Einladungslink.'); return; }
        failures++; void poll();
        clearTimeout(openTimer); openTimer = setTimeout(open, retryDelay(failures));
      };
    };
    open();
    const onOnline = () => { if (!ws.current) { failures = 0; clearTimeout(openTimer); open(); } };
    window.addEventListener('online', onOnline);
    return () => { stopped = true; clearTimeout(openTimer); clearTimeout(pollTimer); window.removeEventListener('online', onOnline); ws.current?.close(); ws.current = null; setConnected(false); };
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
    news, dismiss, rejected, clearRejected: () => setRejected([]), scans, askScan, ...(asked && { asked }), fetchScan };
}

/** The connection of the open project (mounted once in ProjectView, so live works in every tab). */
export const TeamRoomContext = createContext<RoomConnection>(NO_ROOM);
export const useRoomConnection = () => useContext(TeamRoomContext);
