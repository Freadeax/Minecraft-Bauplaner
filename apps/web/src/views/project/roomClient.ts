// Team-Raum client (COOP-07, docs/architecture/TEAM_LIVE.md): HTTP calls and the live connection.
// The sync logic itself is pure (packages/domain/src/teamSync.ts); this file only moves bytes.
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { confirm, ingest, nextBatch, retryDelay, trackOutbox } from '../../../../../packages/domain/src/index.js';
import type { AppendAnswer, Batch, FeedAnswer, RoomTeam, TeamLive } from '../../../../../packages/domain/src/index.js';

const URL_KEY = 'bauplaner.teamraum.adresse';
export const readRoomUrl = (): string => { try { return localStorage.getItem(URL_KEY) ?? ''; } catch { return ''; } };
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

export interface Presence { readonly member: string; readonly device: string; readonly where: 'planer' | 'spiel' | 'server'; readonly section?: string; readonly since: string }
export interface RoomConnection {
  readonly connected: boolean; readonly presence: readonly Presence[]; readonly error: string;
  /** Plan snapshot announced in the room header (sha), re-read on every header push. */
  readonly planSha: string; readonly planNumber?: number;
  /** Tells the others where I am (the Team tab passes my current section). */
  announce(section?: string): void;
}
export const NO_ROOM: RoomConnection = { connected: false, presence: [], error: '', planSha: '', announce: () => undefined };

/**
 * Keeps a live team in sync while the tab is open: WebSocket with the room (push of new events and
 * presence), the outbox goes up as batches, and without WebSocket an HTTP poll with growing pause.
 * `save` stores the merged team without an undo step (incoming events are not the user's actions).
 */
export function useTeamRoom(team: RoomTeam | undefined, me: string | undefined, save: (t: RoomTeam) => void): RoomConnection {
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<readonly Presence[]>([]);
  const [error, setError] = useState('');
  const latest = useRef(team); latest.current = team;
  const saveRef = useRef(save); saveRef.current = save;
  const ws = useRef<WebSocket | null>(null);
  const sending = useRef<string | null>(null);
  const [plan, setPlan] = useState<{ sha: string; number?: number }>({ sha: '' });
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
    void getHeader<{ plan?: { sha: string; revisionNumber?: number } }>(t.live).then(h => setPlan({ sha: h.plan?.sha ?? '', ...(h.plan?.revisionNumber !== undefined && { number: h.plan.revisionNumber }) }))
      .catch(() => setPlan({ sha: '' }));
  };
  const flush = () => {
    const t = latest.current; if (!t?.live) return;
    const batch = nextBatch(t); if (!batch || sending.current === batch.batch) return;
    const socket = ws.current;
    if (socket?.readyState === WebSocket.OPEN) { sending.current = batch.batch; socket.send(JSON.stringify({ type: 'append', ...batch })); return; }
    sending.current = batch.batch;
    void postBatch(t.live, batch).then(a => { sending.current = null; const cur = latest.current; if (cur) { apply(confirm(cur, a).team); flush(); } })
      .catch(e => { sending.current = null; setError(e instanceof Error ? e.message : String(e)); });
  };

  // Outbox changes (own actions) → send.
  const pendingKey = live?.pending.join(',') ?? '';
  useEffect(() => { if (pendingKey) flush(); }, [pendingKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!roomKey || !latest.current?.live) return;
    let stopped = false, failures = 0, timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      const t = latest.current; if (stopped || !t?.live) return;
      try {
        let feed: FeedAnswer, cur = t;
        do { feed = await getFeed(cur.live!); cur = ingest(cur, feed).team; } while (feed.more && !stopped);
        if (cur !== t) apply(cur);
        flush(); setError(''); failures = 0;
        if (!plan.sha) readHeader();
      } catch (e) { failures++; setError(e instanceof Error ? e.message : String(e)); }
      if (!stopped && ws.current?.readyState !== WebSocket.OPEN) timer = setTimeout(() => { void poll(); }, retryDelay(failures));
    };
    const open = () => {
      const t = latest.current; if (stopped || !t?.live) return;
      let socket: WebSocket;
      try { socket = new WebSocket(`${t.live.url.replace(/^http/, 'ws')}/v1/rooms/${t.live.room}/live`); } catch { void poll(); return; }
      ws.current = socket;
      socket.onopen = () => socket.send(JSON.stringify({ type: 'hello', key: t.live!.key, member: me ?? '?', device: t.live!.device, where: 'planer', after: latest.current?.live?.cursor ?? '' }));
      socket.onmessage = m => {
        let d: { type: string } & Record<string, unknown>;
        try { d = JSON.parse(String(m.data)); } catch { return; }
        const cur = latest.current; if (!cur?.live) return;
        if (d.type === 'welcome') { setConnected(true); setError(''); failures = 0; flush(); if (d.header) readHeader(); }
        else if (d.type === 'header' || d.type === 'plan') readHeader();
        else if (d.type === 'events') { const r = ingest(cur, d as unknown as FeedAnswer); if (r.added.length || r.team.live?.cursor !== cur.live.cursor) apply(r.team); }
        else if (d.type === 'appended') { sending.current = null; apply(confirm(cur, d as unknown as AppendAnswer).team); flush(); }
        else if (d.type === 'presence') setPresence((d.members as Presence[]) ?? []);
        else if (d.type === 'error') { sending.current = null; setError(String(d.message ?? d.error)); }
      };
      socket.onclose = ev => {
        ws.current = null; setConnected(false); setPresence([]); sending.current = null;
        if (stopped) return;
        if (ev.code === 4401 || ev.code === 4403) { setError('Der Team-Raum kennt diesen Schlüssel nicht mehr. Bitte die Bauleitung um einen neuen Einladungslink.'); return; }
        failures++; void poll();
        timer = setTimeout(open, retryDelay(failures));
      };
    };
    open();
    const onOnline = () => { if (!ws.current) { failures = 0; open(); } };
    window.addEventListener('online', onOnline);
    return () => { stopped = true; clearTimeout(timer); window.removeEventListener('online', onOnline); ws.current?.close(); ws.current = null; setConnected(false); };
  }, [roomKey, me]); // eslint-disable-line react-hooks/exhaustive-deps

  const announce = (section?: string) => {
    const socket = ws.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'presence', where: 'planer', ...(section && { section }) }));
  };
  return { connected, presence, error, planSha: plan.sha, ...(plan.number !== undefined && { planNumber: plan.number }), announce };
}

/** The connection of the open project (mounted once in ProjectView, so live works in every tab). */
export const TeamRoomContext = createContext<RoomConnection>(NO_ROOM);
export const useRoomConnection = () => useContext(TeamRoomContext);
