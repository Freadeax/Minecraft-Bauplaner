import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LIVE_DEFAULT_PORT, LIVE_TOKEN_HEADER, chunkColumns, chunkQuery, liveBaseUrl, marksBody, originAllowed, planUploadQuery,
  readLiveChunks, readLiveHello, readLivePairing, readLiveStatus, wantedChunks,
} from '../../../../../packages/domain/src/index.js';
import type { LiveChunkColumns, LiveHello, LivePlacement, LiveStatus, WorldItem } from '../../../../../packages/domain/src/index.js';

/**
 * Website side of the live link (MAP-03, docs/architecture/LIVE_LINK.md): talks
 * to the Bauplaner mod on this computer (http://127.0.0.1:<port>), never to a
 * server. The pairing key stays in this browser only (localStorage); the mod
 * accepts it only from this website's origin.
 */

const KEY = 'bauplaner.spielverbindung';
export interface LiveSettings { readonly port: number; readonly token: string | null; readonly auto: boolean }
const DEFAULTS: LiveSettings = { port: LIVE_DEFAULT_PORT, token: null, auto: true };

function readSettings(): LiveSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<LiveSettings> | null;
    if (!raw || typeof raw !== 'object') return DEFAULTS;
    const port = Number.isInteger(raw.port) && raw.port! >= 1024 && raw.port! <= 65535 ? raw.port! : LIVE_DEFAULT_PORT;
    const token = typeof raw.token === 'string' && /^[A-Za-z0-9_-]{24,128}$/.test(raw.token) ? raw.token : null;
    return { port, token, auto: raw.auto !== false };
  } catch { return DEFAULTS; }
}
function writeSettings(s: LiveSettings): void { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private window: only this tab */ } }

export class LiveError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = 'LiveError'; }
}

/** One request to the mod. Network failures become a readable LiveError with status 0. */
async function call(port: number, path: string, init: RequestInit & { token?: string | null; timeoutMs?: number } = {}): Promise<unknown> {
  const { token, timeoutMs = 6000, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (token) headers.set(LIVE_TOKEN_HEADER, token);
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${liveBaseUrl(port)}${path}`, { ...rest, headers, signal: ctrl.signal, cache: 'no-store', mode: 'cors', credentials: 'omit',
      // Chrome (Local Network Access): the mod is on this computer, i.e. the "loopback" address space.
      // "local" would not match 127.0.0.1 and makes Chrome refuse the request.
      ...({ targetAddressSpace: 'loopback' } as object) });
  } catch (e) {
    throw new LiveError(ctrl.signal.aborted ? 'Die Mod antwortet nicht (Zeitüberschreitung).'
      : 'Keine Verbindung zur Mod. Läuft Minecraft mit der Bauplaner-Mod 0.5 oder neuer, und hat der Browser den Zugriff auf Geräte im lokalen Netzwerk erlaubt?', 0);
  } finally { clearTimeout(timer); }
  let body: unknown = null;
  try { body = await res.json(); } catch { /* empty */ }
  if (!res.ok) {
    const msg = body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string' ? (body as { error: string }).error : `Fehler ${res.status}`;
    throw new LiveError(msg, res.status);
  }
  return body;
}

export const liveApi = {
  hello: async (port: number): Promise<LiveHello> => readLiveHello(await call(port, '/v1/hello', { timeoutMs: 2500 })),
  pair: async (port: number, code: string): Promise<string> =>
    readLivePairing(await call(port, '/v1/pair', { method: 'POST', body: JSON.stringify({ code }), headers: { 'Content-Type': 'application/json' } })),
  status: async (port: number, token: string): Promise<LiveStatus> => readLiveStatus(await call(port, '/v1/status', { token, timeoutMs: 4000 })),
  chunks: async (port: number, token: string, list: readonly (readonly [number, number])[]) =>
    readLiveChunks(await call(port, `/v1/chunks?c=${encodeURIComponent(chunkQuery(list))}`, { token, timeoutMs: 8000 })),
  plan: async (port: number, token: string, fileName: string, placement: LivePlacement, bytes: Uint8Array): Promise<string> => {
    const r = await call(port, `/v1/plan?${planUploadQuery(fileName, placement)}`, { method: 'POST', token, body: bytes as Uint8Array<ArrayBuffer>, headers: { 'Content-Type': 'application/octet-stream' }, timeoutMs: 20000 });
    return r && typeof r === 'object' && typeof (r as { message?: unknown }).message === 'string' ? (r as { message: string }).message : 'Plan im Spiel platziert.';
  },
  placement: async (port: number, token: string, p: LivePlacement): Promise<void> => { await call(port, '/v1/placement', { method: 'POST', token, body: JSON.stringify(p), headers: { 'Content-Type': 'application/json' } }); },
  marks: async (port: number, token: string, dimension: string, items: readonly WorldItem[]): Promise<number> => {
    const r = await call(port, '/v1/marks', { method: 'POST', token, body: JSON.stringify(marksBody(dimension, items)), headers: { 'Content-Type': 'application/json' } });
    const n = r && typeof r === 'object' ? (r as { marks?: unknown }).marks : null;
    return typeof n === 'number' ? n : items.length;
  },
  unpair: async (port: number, token: string): Promise<void> => { await call(port, '/v1/unpair', { method: 'POST', token, body: '{}', headers: { 'Content-Type': 'application/json' } }); },
};

export type LivePhase = 'off' | 'searching' | 'unpaired' | 'connected' | 'lost';
export interface TrailPoint { readonly x: number; readonly z: number; readonly at: number }

export interface LiveGame {
  readonly settings: LiveSettings;
  readonly phase: LivePhase;
  readonly hello: LiveHello | null;
  readonly status: LiveStatus | null;
  readonly error: string;
  /** Last ~10 minutes of the player's way, per dimension of the current status. */
  readonly trail: readonly TrailPoint[];
  /** Classified chunks per dimension, "cx,cz" → columns. */
  readonly chunks: ReadonlyMap<string, ReadonlyMap<string, LiveChunkColumns>>;
  readonly chunkVersion: number;
  readonly originProblem: string;
  setPort(port: number): void;
  setAuto(auto: boolean): void;
  connect(): Promise<void>;
  pair(code: string): Promise<void>;
  disconnect(): Promise<void>;
  /** Read chunks around a block position (nearest first, at most `radius` chunks). */
  loadTerrain(x: number, z: number, radius: number): Promise<{ read: number; missing: number }>;
  token(): string | null;
}

const POLL_MS = 1000, TRAIL_MS = 10 * 60_000, CHUNK_MAX_AGE = 60_000;

/** State of the game connection for the map; polls the mod about once a second while connected. */
export function useLiveGame(): LiveGame {
  const [settings, setSettings] = useState<LiveSettings>(readSettings);
  const [phase, setPhase] = useState<LivePhase>('off');
  const [hello, setHello] = useState<LiveHello | null>(null);
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [error, setError] = useState('');
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const chunks = useRef(new Map<string, Map<string, LiveChunkColumns>>());
  const [chunkVersion, setChunkVersion] = useState(0);
  const live = useRef(settings); live.current = settings;
  const originProblem = typeof location !== 'undefined' && !originAllowed(location.origin)
    ? `Diese Seite (${location.origin}) darf die Mod nicht abfragen. Nutze https://freadeax.github.io/Minecraft-Bauplaner/ oder eine lokale Kopie auf localhost.` : '';

  const update = useCallback((next: LiveSettings) => { setSettings(next); live.current = next; writeSettings(next); }, []);

  const connect = useCallback(async () => {
    setError(''); setPhase('searching');
    try {
      const h = await liveApi.hello(live.current.port);
      setHello(h);
      if (!live.current.token) { setPhase('unpaired'); return; }
      setStatus(await liveApi.status(live.current.port, live.current.token));
      setPhase('connected');
    } catch (e) {
      if (e instanceof LiveError && e.status === 401) { update({ ...live.current, token: null }); setPhase('unpaired'); setError('Die Kopplung gilt nicht mehr. Bitte neu koppeln.'); return; }
      setPhase('off'); setError(e instanceof Error ? e.message : String(e));
    }
  }, [update]);

  const pair = useCallback(async (code: string) => {
    setError('');
    try {
      const token = await liveApi.pair(live.current.port, code.replace(/\s+/g, ''));
      update({ ...live.current, token });
      setStatus(await liveApi.status(live.current.port, token));
      setPhase('connected');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }, [update]);

  const disconnect = useCallback(async () => {
    const t = live.current.token;
    update({ ...live.current, token: null, auto: false });
    setPhase('off'); setStatus(null); setHello(null);
    if (t) try { await liveApi.unpair(live.current.port, t); } catch { /* mod closed: the key is forgotten here anyway */ }
  }, [update]);

  // Poll while connected; on failure keep the last state and show "lost", retry slower.
  useEffect(() => {
    if (phase !== 'connected' && phase !== 'lost') return;
    let stop = false, timer = 0;
    const tick = async () => {
      const t = live.current.token;
      if (!t) { setPhase('unpaired'); return; }
      try {
        const s = await liveApi.status(live.current.port, t);
        if (stop) return;
        setStatus(s); setPhase('connected'); setError('');
        if (s.player) {
          const now = Date.now(), p = s.player;
          setTrail(old => {
            const last = old.at(-1);
            if (last && Math.hypot(last.x - p.x, last.z - p.z) < 1.5) return old;
            return [...old.filter(q => now - q.at < TRAIL_MS), { x: p.x, z: p.z, at: now }].slice(-600);
          });
        }
      } catch (e) {
        if (stop) return;
        if (e instanceof LiveError && e.status === 401) { update({ ...live.current, token: null }); setPhase('unpaired'); setError('Die Mod kennt diese Kopplung nicht mehr (z. B. „/bauplaner verbinden aus“). Bitte neu koppeln.'); return; }
        setPhase('lost'); setError(e instanceof Error ? e.message : String(e));
      }
      if (!stop) timer = window.setTimeout(tick, phase === 'lost' ? POLL_MS * 4 : POLL_MS);
    };
    timer = window.setTimeout(tick, POLL_MS);
    return () => { stop = true; clearTimeout(timer); };
  }, [phase, update]);

  // Reconnect on page load when a key is stored (quietly: no error when the game is not running).
  useEffect(() => {
    if (!settings.auto || !settings.token || originProblem) return;
    void (async () => {
      try { const h = await liveApi.hello(live.current.port); setHello(h); setStatus(await liveApi.status(live.current.port, live.current.token!)); setPhase('connected'); }
      catch (e) { if (e instanceof LiveError && e.status === 401) { update({ ...live.current, token: null }); setPhase('unpaired'); } }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTerrain = useCallback(async (x: number, z: number, radius: number) => {
    const t = live.current.token, dimension = status?.player?.dimension;
    if (!t || !dimension) throw new LiveError('Nicht mit dem Spiel verbunden.', 0);
    let cache = chunks.current.get(dimension);
    if (!cache) { cache = new Map(); chunks.current.set(dimension, cache); }
    const known = new Map([...cache].map(([k, c]) => [k, c.at] as const));
    let read = 0, missing = 0;
    for (let round = 0; round < 8; round++) {
      const want = wantedChunks(x, z, radius, known, Date.now(), CHUNK_MAX_AGE);
      if (!want.length) break;
      const answer = await liveApi.chunks(live.current.port, t, want);
      if (answer.dimension !== dimension) break;
      const now = Date.now();
      for (const c of chunkColumns(answer, now)) { cache.set(`${c.x},${c.z}`, c); known.set(`${c.x},${c.z}`, now); read++; }
      // Not loaded in the client: remember as asked, so the next round asks others.
      for (const [mx, mz] of answer.missing) { known.set(`${mx},${mz}`, now); missing++; }
    }
    setChunkVersion(v => v + 1);
    return { read, missing };
  }, [status?.player?.dimension]);

  return {
    settings, phase, hello, status, error, trail, chunks: chunks.current, chunkVersion, originProblem,
    setPort: port => update({ ...live.current, port }), setAuto: auto => update({ ...live.current, auto }),
    connect, pair, disconnect, loadTerrain, token: () => live.current.token,
  };
}
