import { useCallback, useEffect, useRef, useState } from 'react';
import { groupBody,
  LIVE_DEFAULT_PORT, LIVE_FEATURE_PLAYERS, LIVE_TOKEN_HEADER, chunkColumns, chunkQuery, liveBaseUrl, liveCan, marksBody, originAllowed, planUploadQuery,
  readLiveBox, readLiveChunks, readLiveHello, readLiveKnown, readLiveTerrain, readLivePairing, readLiveGameMarks, readLivePlayers, readLiveStatus, readLiveTeam, readLiveTeamPull, readServerClaim, readServerInfo, wantedChunks,
} from '../../../../../packages/domain/src/index.js';
import type { ControlMessage, ServerInfo, ServerPairing } from '../../../../../packages/domain/src/index.js';
import type { LiveBox, LiveKnown, LiveTerrain } from '../../../../../packages/domain/src/index.js';
import type { LiveChunkColumns, LiveGameMark, LiveHello, LivePlacement, LivePlayers, LiveStatus, LiveTeam, LiveTeamPull, TeamLinkState, TeamServerFile, WorldItem } from '../../../../../packages/domain/src/index.js';
import { MODEL_MAX_FILE_BYTES } from '../../../../../packages/voxel/src/sizeLimits.js';

/**
 * Website side of the live link (MAP-03, docs/architecture/team/LIVE_LINK.md): talks
 * to the Build Studio mod on this computer (http://127.0.0.1:<port>), never to a
 * server. The pairing key stays in this browser only (localStorage); the mod
 * accepts it only from this website's origin.
 */

const KEY = 'bauplaner.spielverbindung';
export interface LiveSettings { readonly port: number; readonly token: string | null; readonly auto: boolean }
const DEFAULTS: LiveSettings = { port: LIVE_DEFAULT_PORT, token: null, auto: true };

/** Port and pairing key of this browser (also for pages without the live hook, e.g. the team tab). */
export const readLiveSettings = (): LiveSettings => readSettings();

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
/** Stores a new mod key (pairing by click from another page, LINK-03). */
export function writeLiveToken(token: string): void { writeSettings({ ...readSettings(), token, auto: true }); }

export class LiveError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = 'LiveError'; }
}

/** One request to the mod. Network failures become a readable LiveError with status 0. */
async function call(port: number, path: string, init: RequestInit & { token?: string | null; timeoutMs?: number } = {}): Promise<unknown> {
  const res = await request(port, path, init);
  let body: unknown = null;
  try { body = await res.json(); } catch { /* empty */ }
  return body;
}

async function request(port: number, path: string, init: RequestInit & { token?: string | null; timeoutMs?: number } = {}): Promise<Response> {
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
      : 'Keine Verbindung zur Mod. Läuft Minecraft mit der Build-Studio-Mod 0.5 oder neuer, und hat der Browser den Zugriff auf Geräte im lokalen Netzwerk erlaubt?', 0);
  } finally { clearTimeout(timer); }
  if (!res.ok) {
    let body: unknown = null;
    try { body = await res.json(); } catch { /* empty */ }
    const msg = body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string' ? (body as { error: string }).error : `Fehler ${res.status}`;
    throw new LiveError(msg, res.status);
  }
  return res;
}

/** Largest Baustand file the page accepts (same bound as imported recordings). */
const MAX_SCAN_BYTES = MODEL_MAX_FILE_BYTES;

export const liveApi = {
  hello: async (port: number): Promise<LiveHello> => readLiveHello(await call(port, '/v1/hello', { timeoutMs: 2500 })),
  /** LINK-03 (feature `pairask`): ask to pair; the player clicks „Planer zulassen“ in the game. */
  pairAsk: async (port: number, device: string): Promise<string> => {
    const r = await call(port, '/v1/pair/ask', { method: 'POST', body: JSON.stringify({ device }), headers: { 'Content-Type': 'application/json' } }) as { request?: unknown } | null;
    if (typeof r?.request !== 'string') throw new LiveError('Die Mod hat die Anfrage nicht angenommen.', 500);
    return r.request;
  },
  /** State of a pairing request: waiting, ok (with the key, once), denied or expired. */
  pairAskState: async (port: number, request: string): Promise<{ state: string; token: string | null }> => {
    const r = await call(port, `/v1/pair/ask?request=${encodeURIComponent(request)}`, { timeoutMs: 4000 }) as { state?: unknown; token?: unknown } | null;
    return { state: typeof r?.state === 'string' ? r.state : 'expired', token: typeof r?.token === 'string' && /^[A-Za-z0-9_-]{24,128}$/.test(r.token) ? r.token : null };
  },
  /** Server plugin behind the game (feature `server`): way, identity, whether this player may pair it. */
  server: async (port: number, token: string): Promise<ServerInfo> => readServerInfo(await call(port, '/v1/server', { token, timeoutMs: 12000 })),
  /** Pair the server with this browser; the plugin checks that the player is operator. */
  serverClaim: async (port: number, token: string, device: string): Promise<ServerPairing> =>
    readServerClaim(await call(port, '/v1/server/claim', { method: 'POST', token, body: JSON.stringify({ device }), headers: { 'Content-Type': 'application/json' }, timeoutMs: 20000 })),
  /** A signed control message; the answer is the plugin's (status, text, error). */
  serverControl: async (port: number, token: string, message: ControlMessage): Promise<Record<string, unknown>> => {
    const r = await call(port, '/v1/server/control', { method: 'POST', token, body: JSON.stringify(message), headers: { 'Content-Type': 'application/json' }, timeoutMs: 35000 });
    return r && typeof r === 'object' ? r as Record<string, unknown> : {};
  },
  /** LINK-07 (feature `room`): the team room the game uses without a server file (never the key). */
  room: async (port: number, token: string): Promise<Record<string, unknown>> => {
    const r = await call(port, '/v1/room', { token, timeoutMs: 4000 });
    return r && typeof r === 'object' ? r as Record<string, unknown> : {};
  },
  /** Connects the game with a team room ({url, room, key, member, …}) or disconnects it ({off: true}). */
  roomSet: async (port: number, token: string, body: Readonly<Record<string, unknown>>): Promise<string> => {
    const r = await call(port, '/v1/room', { method: 'POST', token, body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' }, timeoutMs: 8000 }) as { text?: unknown } | null;
    return typeof r?.text === 'string' ? r.text : 'Erledigt.';
  },
  pair: async (port: number, code: string): Promise<string> =>
    readLivePairing(await call(port, '/v1/pair', { method: 'POST', body: JSON.stringify({ code }), headers: { 'Content-Type': 'application/json' } })),
  status: async (port: number, token: string): Promise<LiveStatus> => readLiveStatus(await call(port, '/v1/status', { token, timeoutMs: 4000 })),
  chunks: async (port: number, token: string, list: readonly (readonly [number, number])[]) =>
    readLiveChunks(await call(port, `/v1/chunks?c=${encodeURIComponent(chunkQuery(list))}`, { token, timeoutMs: 8000 })),
  /** TERRAIN-04 (feature `terrain`): loaded or remembered chunks with biomes; without the feature `/v1/chunks` (loaded only). */
  terrain: async (port: number, token: string, list: readonly (readonly [number, number])[], legacy = false): Promise<LiveTerrain> =>
    readLiveTerrain(await call(port, `/v1/${legacy ? 'chunks' : 'terrain'}?c=${encodeURIComponent(chunkQuery(list))}`, { token, timeoutMs: 15000 }), legacy),
  /** Which chunks of a chunk rectangle `x0,z0,x1,z1` the Geländegedächtnis holds. */
  terrainKnown: async (port: number, token: string, area: string): Promise<LiveKnown> =>
    readLiveKnown(await call(port, `/v1/terrain/known?a=${encodeURIComponent(area)}`, { token, timeoutMs: 6000 })),
  /** TERRAIN-04 (feature `box`): every block of a world box (query from `boxQuery`). */
  box: async (port: number, token: string, box: string): Promise<LiveBox> =>
    readLiveBox(await call(port, `/v1/box?b=${encodeURIComponent(box)}`, { token, timeoutMs: 90000 })),
  plan: async (port: number, token: string, fileName: string, placement: LivePlacement, bytes: Uint8Array, timeoutMs = 20000): Promise<string> => {
    const r = await call(port, `/v1/plan?${planUploadQuery(fileName, placement)}`, { method: 'POST', token, body: bytes as Uint8Array<ArrayBuffer>, headers: { 'Content-Type': 'application/octet-stream' }, timeoutMs });
    return r && typeof r === 'object' && typeof (r as { message?: unknown }).message === 'string' ? (r as { message: string }).message : 'Plan im Spiel platziert.';
  },
  placement: async (port: number, token: string, p: LivePlacement): Promise<void> => { await call(port, '/v1/placement', { method: 'POST', token, body: JSON.stringify(p), headers: { 'Content-Type': 'application/json' } }); },
  marks: async (port: number, token: string, dimension: string, items: readonly WorldItem[]): Promise<number> => {
    const r = await call(port, '/v1/marks', { method: 'POST', token, body: JSON.stringify(marksBody(dimension, items)), headers: { 'Content-Type': 'application/json' } });
    const n = r && typeof r === 'object' ? (r as { marks?: unknown }).marks : null;
    return typeof n === 'number' ? n : items.length;
  },
  /** Baustand of the hologram (mod 0.7.1+): the whole plan box as `bauplaner-scan` file, in plan coordinates. */
  scan: async (port: number, token: string): Promise<{ fileName: string; bytes: Uint8Array }> => {
    const res = await request(port, '/v1/scan', { token, timeoutMs: 120000 });
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_SCAN_BYTES) throw new LiveError(`Der Baustand aus dem Spiel ist leer oder zu groß (höchstens ${MAX_SCAN_BYTES / 1_000_000} MB).`, 413);
    const name = res.headers.get('X-Bauplaner-File') ?? '';
    return { fileName: /^[A-Za-z0-9._-]{1,120}\.schem$/.test(name) ? name : `baustand_${Date.now()}.schem`, bytes };
  },
  /** Build section shown in the game (1-based, 0 = all); mod 0.7.0+. */
  section: async (port: number, token: string, section: number): Promise<void> => { await call(port, '/v1/section', { method: 'POST', token, body: JSON.stringify({ section }), headers: { 'Content-Type': 'application/json' } }); },
  /** GAME-07-S11 (feature `groups`): limit the hologram to one Weltplan group, null = all. */
  group: async (port: number, token: string, group: string | null): Promise<void> => { await call(port, '/v1/group', { method: 'POST', token, body: JSON.stringify(groupBody(group)), headers: { 'Content-Type': 'application/json' } }); },
  unpair: async (port: number, token: string): Promise<void> => { await call(port, '/v1/unpair', { method: 'POST', token, body: '{}', headers: { 'Content-Type': 'application/json' } }); },
  /** Other players the client sees (feature `players`, protocol 2). */
  players: async (port: number, token: string): Promise<LivePlayers> => readLivePlayers(await call(port, '/v1/players', { token, timeoutMs: 4000 })),
  /** Protocol 3 (feature `marks3`, mod 0.13.0): points set in the game, waiting for the Weltplan. */
  gameMarks: async (port: number, token: string): Promise<LiveGameMark[]> => readLiveGameMarks(await call(port, '/v1/marks/game', { token, timeoutMs: 4000 })),
  /** The Weltplan holds these game points now; the game forgets them. */
  gameMarksAck: async (port: number, token: string, ids: readonly string[]): Promise<void> => { await call(port, '/v1/marks/game/ack', { method: 'POST', token, body: JSON.stringify({ ids }), headers: { 'Content-Type': 'application/json' } }); },
  /** Teambau (feature `team`, mod 0.10.0): the team view for the game. */
  teamPush: async (port: number, token: string, state: TeamLinkState): Promise<{ inPlan: number; sections: number }> => {
    const r = await call(port, '/v1/team', { method: 'POST', token, body: JSON.stringify(state), headers: { 'Content-Type': 'application/json' } }) as { inPlan?: unknown; sections?: unknown } | null;
    return { inPlan: typeof r?.inPlan === 'number' ? r.inPlan : 0, sections: typeof r?.sections === 'number' ? r.sections : state.sections.length };
  },
  /** Link to the server plugin and own actions from the game. */
  team: async (port: number, token: string): Promise<LiveTeam> => readLiveTeam(await call(port, '/v1/team', { token, timeoutMs: 4000 })),
  /** The planner merged these events from the game. */
  teamAck: async (port: number, token: string, ids: readonly string[]): Promise<void> => { await call(port, '/v1/team/ack', { method: 'POST', token, body: JSON.stringify({ ids }), headers: { 'Content-Type': 'application/json' } }); },
  /** Events of the server plugin (only with the team channel live). */
  teamPull: async (port: number, token: string, teamId: string, since?: string): Promise<LiveTeamPull> =>
    readLiveTeamPull(await call(port, `/v1/team/pull?teamId=${encodeURIComponent(teamId)}${since ? `&since=${encodeURIComponent(since)}` : ''}`, { token, timeoutMs: 20000 })),
  /** Team server file to the plugin (Bauleitung). */
  teamServer: async (port: number, token: string, file: TeamServerFile): Promise<string> => {
    const r = await call(port, '/v1/team/push', { method: 'POST', token, body: JSON.stringify({ file }), headers: { 'Content-Type': 'application/json' }, timeoutMs: 30000 }) as { text?: unknown } | null;
    return typeof r?.text === 'string' ? r.text : 'Planstand auf dem Server.';
  },
};

export type LivePhase = 'off' | 'searching' | 'unpaired' | 'asking' | 'connected' | 'lost';
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
  /** Other players (feature `players`), refreshed every other poll; empty for mods without it. */
  readonly others: LivePlayers | null;
  readonly originProblem: string;
  /** The browser has refused access to this computer's local services ("lokales Netzwerk" blocked). */
  readonly accessDenied: boolean;
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
/** After „Verbinden“ the page keeps looking this long, so the player can type the command in game afterwards. */
const SEARCH_MS = 3 * 60_000, SEARCH_EVERY_MS = 2000;

/** Chrome's permission for local services (named differently across versions); null when unknown. */
async function localAccessState(): Promise<PermissionState | null> {
  if (typeof navigator === 'undefined' || !navigator.permissions) return null;
  for (const name of ['local-network-access', 'loopback-network', 'local-network']) {
    try { return (await navigator.permissions.query({ name } as unknown as PermissionDescriptor)).state; } catch { /* unknown name */ }
  }
  return null;
}
export const LIVE_NOT_FOUND = 'Die Mod meldet sich nicht. Läuft Minecraft mit der Build-Studio-Mod? Ab Mod 0.12 ist die Verbindung von selbst an; bei älteren Mods im Spiel /bauplaner verbinden eingeben. Dann hier erneut „Verbinden“.';
/** Name of this browser for the question in the game („Der Planer (…) möchte sich verbinden“). */
export function deviceName(): string {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /iPad|iPhone/.test(ua) ? 'iPad/iPhone' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Android/.test(ua) ? 'Android' : /Linux/.test(ua) ? 'Linux' : '';
  return os ? `${browser} · ${os}` : browser;
}
const ASK_EVERY_MS = 1500;
export const LIVE_BLOCKED = 'Der Browser blockiert den Zugriff auf die Mod auf diesem PC. Links in der Adresszeile auf das Symbol neben der Adresse klicken → Website-Einstellungen → „Lokales Netzwerk“ bzw. „Geräte im lokalen Netzwerk“ auf „Zulassen“ stellen, Seite neu laden.';

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
  const [others, setOthers] = useState<LivePlayers | null>(null);
  const helloRef = useRef<LiveHello | null>(null);
  const live = useRef(settings); live.current = settings;
  const originProblem = typeof location !== 'undefined' && !originAllowed(location.origin)
    ? `Diese Seite (${location.origin}) darf die Mod nicht abfragen. Nutze https://freadeax.github.io/Minecraft-Bauplaner/, https://bauplaner.pages.dev/Minecraft-Bauplaner/ oder eine lokale Kopie auf localhost.` : '';

  const update = useCallback((next: LiveSettings) => { setSettings(next); live.current = next; writeSettings(next); }, []);

  const search = useRef(0);
  /** Waits for „Planer zulassen“ in the game (up to the mod's three minutes). */
  const askPairing = async (id: number) => {
    setPhase('asking');
    let request: string;
    try { request = await liveApi.pairAsk(live.current.port, deviceName()); }
    catch (e) { if (id === search.current) { setPhase('unpaired'); setError(e instanceof Error ? e.message : String(e)); } return; }
    for (;;) {
      await new Promise(r => setTimeout(r, ASK_EVERY_MS));
      if (id !== search.current) return;
      let answer: { state: string; token: string | null };
      try { answer = await liveApi.pairAskState(live.current.port, request); }
      catch { continue; }
      if (id !== search.current) return;
      if (answer.state === 'ok' && answer.token) {
        update({ ...live.current, token: answer.token, auto: true });
        try { setStatus(await liveApi.status(live.current.port, answer.token)); } catch { /* the poll below retries */ }
        setPhase('connected'); setError('');
        return;
      }
      if (answer.state === 'denied') { setPhase('off'); setError('Im Spiel abgelehnt. Erneut „Verbinden“ drücken, wenn du doch verbinden willst.'); return; }
      if (answer.state !== 'waiting') { setPhase('off'); setError('Im Spiel wurde nicht rechtzeitig „Planer zulassen“ geklickt. Erneut „Verbinden“ drücken.'); return; }
    }
  };
  const [accessDenied, setAccessDenied] = useState(false);
  const connect = useCallback(async () => {
    const id = ++search.current, until = Date.now() + SEARCH_MS;
    setError(''); setPhase('searching'); setAccessDenied(false);
    for (;;) {
      try {
        const h = await liveApi.hello(live.current.port);
        if (id !== search.current) return;
        setHello(h); setError('');
        if (!live.current.token) {
          // LINK-03: newer mods ask the player in the game; no code to type.
          if (liveCan(h, 'pairask')) { await askPairing(id); return; }
          setPhase('unpaired'); return;
        }
        setStatus(await liveApi.status(live.current.port, live.current.token));
        setPhase('connected');
        return;
      } catch (e) {
        if (id !== search.current) return;
        if (e instanceof LiveError && e.status === 401) { update({ ...live.current, token: null }); setPhase('unpaired'); setError('Die Kopplung gilt nicht mehr. Bitte neu koppeln.'); return; }
        if (!(e instanceof LiveError) || e.status !== 0) { setPhase('off'); setError(e instanceof Error ? e.message : String(e)); return; }
        const denied = (await localAccessState()) === 'denied';
        if (id !== search.current) return;
        if (denied) { setAccessDenied(true); setPhase('off'); setError(LIVE_BLOCKED); return; }
        if (Date.now() > until) { setPhase('off'); setError(LIVE_NOT_FOUND); return; }
        await new Promise(r => setTimeout(r, SEARCH_EVERY_MS));
        if (id !== search.current) return;
      }
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
    search.current++;
    update({ ...live.current, token: null, auto: false });
    setPhase('off'); setError(''); setStatus(null); setHello(null);
    if (t) try { await liveApi.unpair(live.current.port, t); } catch { /* mod closed: the key is forgotten here anyway */ }
  }, [update]);

  // Poll while connected; on failure keep the last state and show "lost", retry slower.
  useEffect(() => {
    if (phase !== 'connected' && phase !== 'lost') return;
    let stop = false, timer = 0, n = 0;
    const tick = async () => {
      const t = live.current.token;
      if (!t) { setPhase('unpaired'); return; }
      try {
        const s = await liveApi.status(live.current.port, t);
        if (stop) return;
        setStatus(s); setPhase('connected'); setError('');
        if (liveCan(helloRef.current, LIVE_FEATURE_PLAYERS) && n++ % 2 === 0) {
          try { const o = await liveApi.players(live.current.port, t); if (!stop) setOthers(o); } catch { /* optional: keep the last list */ }
        }
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

  helloRef.current = hello;
  return {
    settings, phase, hello, status, error, trail, chunks: chunks.current, chunkVersion, others: phase === 'connected' || phase === 'lost' ? others : null, originProblem, accessDenied,
    setPort: port => update({ ...live.current, port }), setAuto: auto => update({ ...live.current, auto }),
    connect, pair, disconnect, loadTerrain, token: () => live.current.token,
  };
}
