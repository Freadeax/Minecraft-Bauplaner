import { controlMessage, liveCan, readServerRoom } from '../../../../../packages/domain/src/index.js';
import type { LiveHello, ServerInfo, ServerOp, ServerPairing, ServerRoom } from '../../../../../packages/domain/src/index.js';
import { LiveError, deviceName, liveApi, readLiveSettings, writeLiveToken } from '../map/liveClient';

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
