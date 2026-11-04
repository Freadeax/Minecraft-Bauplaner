import { controlMessage, liveCan, readServerRoom } from '../../../../../packages/domain/src/index.js';
import type { LiveHello, ServerInfo, ServerOp, ServerPairing, ServerRoom } from '../../../../../packages/domain/src/index.js';
import { LiveError, deviceName, liveApi, readLiveSettings, writeLiveToken } from '../map/liveClient';
import { MODEL_MAX_FILE_BYTES } from '../../../../../packages/voxel/src/sizeLimits.js';

/**
 * Server link of this browser (LINK-04, docs/architecture/AUTO_LINK.md). The owner key of each paired server
 * stays in this browser (localStorage) like the mod key; control messages are signed here and go through the
 * mod on this computer to the plugin. Nothing here types or sends a server command.
 */

const KEY = 'bauplaner.server.kopplungen';
const ID = /^srv_[A-Za-z0-9_-]{6,40}$/;

export function readPairings(): Record<string, ServerPairing> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out: Record<string, ServerPairing> = {};
    for (const [id, p] of Object.entries(raw as Record<string, Partial<ServerPairing>>)) {
      if (!ID.test(id) || !p || typeof p.owner !== 'string' || typeof p.key !== 'string' || typeof p.name !== 'string') continue;
      const room = readServerRoom(p.room);
      out[id] = { serverId: id, name: p.name, owner: p.owner, key: p.key, seq: typeof p.seq === 'number' ? p.seq : 0, at: typeof p.at === 'string' ? p.at : '', ...(room && { room }) };
    }
    return out;
  } catch { return {}; }
}

export function savePairing(p: ServerPairing): void {
  const all = readPairings();
  all[p.serverId] = p;
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* private window: only for this tab */ }
}

/**
 * Stores the used sequence number without losing what another page stored meanwhile (the team room, a higher
 * number from another tab): the stored record wins except for the number.
 */
function storeUsed(next: ServerPairing): ServerPairing {
  const stored = readPairings()[next.serverId];
  const merged: ServerPairing = stored && stored.owner === next.owner ? { ...next, ...stored, seq: Math.max(stored.seq, next.seq) } : next;
  savePairing(merged);
  return merged;
}

export function forgetPairing(serverId: string): void {
  const all = readPairings();
  delete all[serverId];
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* ignore */ }
}

export interface GameLink { readonly port: number; readonly token: string; readonly hello: LiveHello }

/** The paired mod on this computer, or why not (LiveError: status 0 = not running, 401 = not paired). */
export async function gameLink(): Promise<GameLink> {
  const s = readLiveSettings();
  const hello = await liveApi.hello(s.port);
  if (!s.token) throw new LiveError('Die Website ist noch nicht mit dem Spiel verbunden.', 401);
  if (!liveCan(hello, 'server')) throw new LiveError(`Die Mod ${hello.mod.version} kann den Server noch nicht ohne Befehle einrichten – Mod 0.12.0 oder neuer installieren.`, 426);
  return { port: s.port, token: s.token, hello };
}

/**
 * Pairs this browser with the mod by click (LINK-03): asks, then waits until the player clicks
 * „Planer zulassen“ in the game. `onWaiting` is called once the question is shown in the game.
 */
export async function pairWithGame(onWaiting: () => void, cancelled: () => boolean = () => false): Promise<void> {
  const s = readLiveSettings();
  const hello = await liveApi.hello(s.port);
  if (!liveCan(hello, 'pairask')) throw new LiveError('Diese Mod-Version fragt noch nicht im Spiel nach. Auf der Weltkarte unter „Spiel“ mit Code koppeln oder Mod 0.12.0 installieren.', 426);
  const request = await liveApi.pairAsk(s.port, deviceName());
  onWaiting();
  for (;;) {
    await new Promise(r => setTimeout(r, 1500));
    if (cancelled()) return;
    const a = await liveApi.pairAskState(s.port, request).catch(() => ({ state: 'waiting', token: null }));
    if (a.state === 'ok' && a.token) { writeLiveToken(a.token); return; }
    if (a.state === 'denied') throw new LiveError('Im Spiel abgelehnt.', 403);
    if (a.state !== 'waiting') throw new LiveError('Im Spiel wurde nicht rechtzeitig „Planer zulassen“ geklickt.', 408);
  }
}

export async function serverInfo(link: GameLink): Promise<ServerInfo> { return liveApi.server(link.port, link.token); }

/** Pairs the server behind the game with this browser (the plugin checks that the player is operator). */
export async function claimServer(link: GameLink): Promise<ServerPairing> {
  const p = await liveApi.serverClaim(link.port, link.token, `Planer · ${deviceName()}`);
  savePairing(p);
  return p;
}

/** Signs and sends one control message; the used sequence number is stored before sending. */
export async function control(link: GameLink, pairing: ServerPairing, op: ServerOp, fields: Readonly<Record<string, unknown>> = {}): Promise<Record<string, unknown>> {
  const stored = readPairings()[pairing.serverId];
  const { message, pairing: next } = await controlMessage(stored && stored.owner === pairing.owner ? stored : pairing, op, fields);
  storeUsed(next);
  const answer = await liveApi.serverControl(link.port, link.token, message);
  if (typeof answer.error === 'string') throw new LiveError(answer.error, 409);
  return answer;
}

/** Remembers the team room a paired server is connected to (second way, LINK-05). */
export function rememberRoom(serverId: string, room: ServerRoom): void {
  const p = readPairings()[serverId];
  if (p) savePairing({ ...p, room });
}

async function roomCall(room: ServerRoom, path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  let r: Response;
  try {
    r = await fetch(`${room.url}/v1/rooms/${room.room}${path}`, { ...init, headers: { Authorization: `Bearer ${room.key}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) } });
  } catch { throw new LiveError('Team-Raum nicht erreichbar (offline oder Adresse falsch).', 0); }
  const body = await r.json().catch(() => ({})) as Record<string, unknown>;
  if (!r.ok) throw new LiveError(typeof body.message === 'string' ? body.message : `Team-Raum antwortet mit ${r.status}.`, r.status);
  return body;
}

/** Whether the Paper plugin is connected to the team room right now. */
export async function roomServerOnline(room: ServerRoom): Promise<boolean> { return (await roomCall(room, '')).serverOnline === true; }

/** One signed control message through the team room (no mod needed, e.g. on the iPad). */
export async function controlViaRoom(pairing: ServerPairing, op: ServerOp, fields: Readonly<Record<string, unknown>> = {}): Promise<Record<string, unknown>> {
  if (!pairing.room) throw new LiveError('Dieser Server ist mit keinem Team-Raum verbunden.', 409);
  const stored = readPairings()[pairing.serverId];
  const { message, pairing: next } = await controlMessage(stored && stored.owner === pairing.owner ? stored : pairing, op, fields);
  storeUsed(next);
  const answer = await roomCall(pairing.room, '/control', { method: 'POST', body: JSON.stringify(message) });
  if (typeof answer.error === 'string') throw new LiveError(answer.error, 409);
  return answer;
}

/**
 * The paired server the game is on right now, for other pages (team tab, team room): null when the game is not
 * connected, has no plugin or this browser is not paired with that server.
 */
export async function currentPairedServer(): Promise<{ link: GameLink; info: ServerInfo; pairing: ServerPairing } | null> {
  try {
    const link = await gameLink();
    const info = await serverInfo(link);
    const pairing = info.server ? readPairings()[info.server.serverId] : undefined;
    return info.way === 'live' && pairing ? { link, info, pairing } : null;
  } catch { return null; }
}

/** Largest plan the plugin takes per control message (ServerLink.MAX_PLAN_BYTES) and what fits through the team room (1 MB message, base64). */
export const PLAN_LIMIT_MOD = 4 * 1024 * 1024;
export const PLAN_LIMIT_ROOM = 700 * 1024;

const toBase64 = (bytes: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

/**
 * A paired server this browser can reach right now: through the mod when the game is on that server,
 * otherwise through the team room of a paired server (LINK-05). Null when neither works.
 */
export async function reachableServer(): Promise<{ pairing: ServerPairing; via: 'mod' | 'room'; send: (op: ServerOp, fields?: Readonly<Record<string, unknown>>) => Promise<Record<string, unknown>> } | null> {
  const viaMod = await currentPairedServer();
  if (viaMod) return { pairing: viaMod.pairing, via: 'mod', send: (op, fields) => control(viaMod.link, viaMod.pairing, op, fields) };
  for (const p of Object.values(readPairings())) {
    if (!p.room) continue;
    try { if (await roomServerOnline(p.room)) return { pairing: p, via: 'room', send: (op, fields) => controlViaRoom(p, op, fields) }; } catch { /* try the next */ }
  }
  return null;
}

/**
 * LINK-06: puts a plan (.schem) on the paired server and, with a placement, stores its anchor there – no file
 * copy, no command. Returns the plugin's answer text.
 */
export async function planToServer(fileName: string, bytes: Uint8Array, placement?: { dimension: string; origin: readonly [number, number, number] }): Promise<string> {
  const target = await reachableServer();
  if (!target) throw new LiveError('Kein gekoppelter Server erreichbar. Auf der Seite „Spiel“ den Server koppeln (Minecraft mit Mod auf dem Server) oder ihn im Projekt mit dem Team-Raum verbinden.', 409);
  const limit = target.via === 'mod' ? PLAN_LIMIT_MOD : PLAN_LIMIT_ROOM;
  if (bytes.length > limit) throw new LiveError(`Der Plan ist ${(bytes.length / 1024 / 1024).toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB groß; ${target.via === 'mod' ? 'über die Mod' : 'über den Team-Raum'} gehen höchstens ${(limit / 1024 / 1024).toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB.${target.via === 'room' ? ' Mit Minecraft auf dem Server geht es über die Mod (bis 4 MB).' : ''}`, 413);
  const answer = await target.send('plan', { name: fileName, data: toBase64(bytes), ...(placement && { dimension: placement.dimension, anchor: [...placement.origin] }) });
  return `„${target.pairing.name}“${target.via === 'room' ? ' (über den Team-Raum)' : ''}: ${typeof answer.text === 'string' ? answer.text : 'Plan übernommen.'}`;
}

/** Whether this browser is paired with any server (to offer server actions at all). */
export const hasServerPairing = (): boolean => Object.keys(readPairings()).length > 0;

// ------------------------------------------------------------------ LINK-06 S02: recording from the server

export interface ServerPlanInfo { readonly file: string; readonly name: string; readonly projectId?: string; readonly revision: number; readonly cells: number; readonly anchor?: readonly [number, number, number]; readonly dimension?: string }
export interface ServerScanFile { readonly file: string; readonly bytes?: number; readonly at: string }
export interface ServerScanState {
  readonly plans: readonly ServerPlanInfo[];
  readonly scans: readonly ServerScanFile[];
  readonly running?: { readonly plan: string; readonly percent: number; readonly by: string; readonly phase: 'chunks' | 'lesen' | 'schreiben' };
  readonly last?: { readonly plan: string; readonly file?: string; readonly error?: string; readonly summary?: string; readonly at: string };
  readonly text?: string;
}
export interface ServerRecording { readonly fileName: string; readonly bytes: Uint8Array; readonly server: string; readonly via: 'mod' | 'room'; readonly summary: string }

const fromBase64 = (s: string): Uint8Array => { const bin = atob(s); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; };
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
type Send = (op: ServerOp, fields?: Readonly<Record<string, unknown>>) => Promise<Record<string, unknown>>;

/** File name prefix of the plugin's recordings of a plan (ScanJob.fileName without the time). */
export function scanPrefix(plan: Pick<ServerPlanInfo, 'name' | 'revision'>): string {
  let base = plan.name.replace(/ · Revision \d+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  if (!base) base = 'projekt';
  return `${base.slice(0, 40)}_r${plan.revision}_`;
}

/** The newest plan of a project on the server that has an anchor (the world map stores both). */
export function serverPlanFor(state: ServerScanState, projectId: string): ServerPlanInfo | null {
  return [...state.plans].filter(p => p.projectId === projectId && p.anchor).sort((a, b) => b.revision - a.revision)[0] ?? null;
}

async function needServer() {
  const target = await reachableServer();
  if (!target) throw new LiveError('Kein gekoppelter Server erreichbar. Auf der Seite „Spiel“ den Server koppeln (Minecraft mit Mod auf dem Server) oder ihn mit dem Team-Raum verbinden.', 409);
  const send: Send = async (op, fields) => {
    try { return await target.send(op, fields); }
    catch (e) {
      // Plugin 0.12.0 knows no recording by click yet.
      if (e instanceof LiveError && /^Unbekannte Steueraktion/.test(e.message)) throw new LiveError(`Das Bauplaner-Plugin auf „${target.pairing.name}“ ist zu alt für Aufnahmen per Klick – Plugin 0.13.0 oder neuer installieren.`, 426);
      throw e;
    }
  };
  return { ...target, send };
}

async function fetchScan(send: Send, file: string, onProgress: (text: string) => void, cancelled: () => boolean): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  let offset = 0, size = Infinity;
  while (offset < size) {
    if (cancelled()) throw new LiveError('Abgebrochen.', 499);
    const a = await send('scan', { do: 'fetch', file, offset });
    const data = fromBase64(String(a.data ?? ''));
    size = Number(a.size);
    if (!Number.isFinite(size) || size > MODEL_MAX_FILE_BYTES) throw new LiveError('Die Aufnahme auf dem Server ist zu groß für den Planer.', 413);
    if (!data.length && offset < size) throw new LiveError('Der Server hat einen leeren Teil geschickt.', 502);
    parts.push(data); offset += data.length;
    onProgress(`Aufnahme wird geholt … ${Math.floor(offset / Math.max(1, size) * 100)} %`);
  }
  const out = new Uint8Array(offset);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

/** What the paired server has: plans with anchor, recordings, a running recording. */
export async function serverScans(): Promise<{ state: ServerScanState; server: string; via: 'mod' | 'room' }> {
  const target = await needServer();
  return { state: await target.send('scan', { do: 'list' }) as unknown as ServerScanState, server: target.pairing.name, via: target.via };
}

/**
 * Records the build state of a project on the paired server (instead of `/bp scan`) and fetches the file.
 * The plan with its anchor must be on the server (world map „Auf den Server legen“). Never changes the world.
 */
export async function recordOnServer(projectId: string, onProgress: (text: string) => void, cancelled: () => boolean = () => false): Promise<ServerRecording> {
  const target = await needServer();
  const send = target.send;
  const list = await send('scan', { do: 'list' }) as unknown as ServerScanState;
  const plan = serverPlanFor(list, projectId);
  if (!plan) throw new LiveError(`Auf „${target.pairing.name}“ liegt noch kein Plan dieses Projekts mit Anker. Auf der Weltkarte zuerst „⇪ Auf den Server legen“.`, 404);
  const before = list.last?.at;
  const started = await send('scan', { do: 'start', plan: plan.file }) as unknown as ServerScanState;
  onProgress(started.text ?? 'Aufnahme gestartet …');
  const deadline = Date.now() + 15 * 60_000;
  for (;;) {
    await sleep(target.via === 'room' ? 1500 : 800);
    if (cancelled()) { await send('scan', { do: 'cancel' }).catch(() => undefined); throw new LiveError('Aufnahme abgebrochen.', 499); }
    if (Date.now() > deadline) throw new LiveError('Die Aufnahme dauert ungewöhnlich lange. Später mit „Letzte Aufnahme holen“ abholen.', 504);
    const s = await send('scan', { do: 'list' }) as unknown as ServerScanState;
    if (s.running) { onProgress(`Server liest den Bau … ${s.running.percent} %${s.running.phase === 'chunks' ? ' (Chunks vorbereiten)' : s.running.phase === 'schreiben' ? ' (Datei schreiben)' : ''}`); continue; }
    const last = s.last;
    if (!last || last.at === before || last.plan !== plan.file) throw new LiveError('Die Aufnahme ist auf dem Server verschwunden (abgebrochen oder Server neu gestartet).', 410);
    if (last.error || !last.file) throw new LiveError(last.error ?? 'Aufnahme fehlgeschlagen.', 500);
    const bytes = await fetchScan(send, last.file, onProgress, cancelled);
    return { fileName: last.file, bytes, server: target.pairing.name, via: target.via, summary: last.summary ?? '' };
  }
}

/** Fetches the newest recording of a project that is already on the server. */
export async function latestServerRecording(projectId: string, onProgress: (text: string) => void, cancelled: () => boolean = () => false): Promise<ServerRecording> {
  const target = await needServer();
  const send = target.send;
  const list = await send('scan', { do: 'list' }) as unknown as ServerScanState;
  const plans = list.plans.filter(p => p.projectId === projectId);
  const prefixes = plans.map(scanPrefix);
  const scan = list.scans.find(s => prefixes.some(p => s.file.startsWith(p)));
  if (!scan) throw new LiveError(`Auf „${target.pairing.name}“ gibt es noch keine Aufnahme dieses Projekts.`, 404);
  const bytes = await fetchScan(send, scan.file, onProgress, cancelled);
  return { fileName: scan.file, bytes, server: target.pairing.name, via: target.via, summary: '' };
}
