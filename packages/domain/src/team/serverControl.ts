/**
 * Server link without commands (LINK-01/04, docs/architecture/team/AUTO_LINK.md): the planner pairs once with the
 * Bauplaner plugin on a Paper server and from then on sends signed control messages instead of commands
 * (settings, team, team room, plans). The mod on this computer and later the team room only pass them on.
 *
 * Signature: base64url(HMAC-SHA-256(key, owner + "\n" + seq + "\n" + body)), the same as `LinkCore.sign` in
 * the plugin. `body` is the exact JSON text that is signed; it names the server, so a message for one server
 * is useless on another. `seq` grows per owner (milliseconds), so a recorded message cannot be replayed.
 */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const fail = (m: string): never => { throw new Error(`Server-Kopplung: ${m}`); };
const text = (v: unknown, what: string, max: number): string => typeof v === 'string' && v.length <= max ? v : fail(`${what} fehlt oder ist zu lang`);

export const SERVER_OPS = ['status', 'config', 'team', 'room', 'plan', 'scan', 'rename', 'invite', 'forget'] as const;
export type ServerOp = typeof SERVER_OPS[number];

/** What the mod says about the way to the server (GET /v1/server). */
export type ServerWay = 'none' | 'no_plugin' | 'ask' | 'waiting' | 'live' | 'off';
export interface ServerIdentity {
  readonly serverId: string; readonly name: string; readonly paired: boolean; readonly canClaim: boolean;
  readonly plugin: string; readonly minecraft: string;
}
export interface ServerInfo { readonly way: ServerWay; readonly wayText: string; readonly allowed: boolean; readonly server: ServerIdentity | null; readonly error: string | null }

/** Team room the server is connected to: the second way for control messages (LINK-05), e.g. from an iPad without mod. */
export interface ServerRoom { readonly url: string; readonly room: string; readonly key: string }
/** This browser's pairing with one server (kept in localStorage by the web app). */
export interface ServerPairing { readonly serverId: string; readonly name: string; readonly owner: string; readonly key: string; readonly seq: number; readonly at: string; readonly room?: ServerRoom }

export interface ServerSetting {
  readonly key: string; readonly kind: 'bool' | 'int' | 'choice'; readonly label: string;
  readonly min?: number; readonly max?: number; readonly choices?: readonly string[]; readonly restart?: boolean;
}
export interface ServerStatus {
  readonly serverId: string; readonly name: string; readonly plugin: string; readonly minecraft: string;
  readonly owners: readonly { readonly id: string; readonly name: string; readonly created: string; readonly by: string }[];
  readonly settings: Readonly<Record<string, boolean | number | string>>;
  readonly schema: readonly ServerSetting[];
  readonly teams: readonly { readonly teamId: string; readonly name: string; readonly events: number; readonly sections: number }[];
  readonly rooms: readonly string[]; readonly plans: readonly string[]; readonly worlds: readonly string[]; readonly online: number;
}

const WAYS: readonly ServerWay[] = ['none', 'no_plugin', 'ask', 'waiting', 'live', 'off'];
const ID = /^srv_[A-Za-z0-9_-]{6,40}$/, OWNER = /^own_[A-Za-z0-9_-]{4,40}$/, KEY = /^[A-Za-z0-9_-]{32,64}$/;

function readIdentity(raw: unknown): ServerIdentity {
  const s = isObj(raw) ? raw : fail('Serverangaben fehlen');
  const serverId = text(s.serverId, 'Server-ID', 60);
  if (!ID.test(serverId)) fail('Server-ID ungültig');
  return { serverId, name: text(s.name, 'Servername', 80), paired: s.paired === true, canClaim: s.canClaim === true,
    plugin: typeof s.plugin === 'string' ? s.plugin.slice(0, 40) : '', minecraft: typeof s.minecraft === 'string' ? s.minecraft.slice(0, 40) : '' };
}

export function readServerInfo(raw: unknown): ServerInfo {
  const r = isObj(raw) ? raw : fail('Antwort ist kein Objekt');
  const way = WAYS.includes(r.link as ServerWay) ? r.link as ServerWay : 'none';
  return { way, wayText: typeof r.linkText === 'string' ? r.linkText.slice(0, 200) : '', allowed: r.allowed === true,
    server: r.server == null ? null : readIdentity(r.server), error: typeof r.error === 'string' ? r.error.slice(0, 400) : null };
}

/** Answer of POST /v1/server/claim: the owner key, handed out once. */
export function readServerClaim(raw: unknown, now = new Date()): ServerPairing {
  const r = isObj(raw) ? raw : fail('Antwort ist kein Objekt');
  const id = readIdentity(r);
  const owner = text(r.owner, 'Geräte-ID', 60), key = text(r.key, 'Schlüssel', 80);
  if (!OWNER.test(owner) || !KEY.test(key)) fail('Schlüssel ungültig');
  return { serverId: id.serverId, name: id.name, owner, key, seq: 0, at: now.toISOString() };
}

const strings = (v: unknown, max: number): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, max).map(x => x.slice(0, 200)) : [];

export function readServerStatus(raw: unknown): ServerStatus {
  const r = isObj(raw) ? raw : fail('Status ist kein Objekt');
  const id = readIdentity({ ...r, paired: true });
  const settings: Record<string, boolean | number | string> = {};
  if (isObj(r.settings)) for (const [k, v] of Object.entries(r.settings)) if (typeof v === 'boolean' || typeof v === 'number' || typeof v === 'string') settings[k] = v;
  const schema: ServerSetting[] = [];
  if (Array.isArray(r.schema)) for (const s of r.schema.slice(0, 64)) {
    if (!isObj(s) || typeof s.key !== 'string' || typeof s.label !== 'string' || !['bool', 'int', 'choice'].includes(s.kind as string)) continue;
    schema.push({ key: s.key, kind: s.kind as ServerSetting['kind'], label: s.label,
      ...(typeof s.min === 'number' && { min: s.min }), ...(typeof s.max === 'number' && { max: s.max }),
      ...(Array.isArray(s.choices) && { choices: strings(s.choices, 16) }), ...(s.restart === true && { restart: true }) });
  }
  const owners = Array.isArray(r.owners) ? r.owners.filter(isObj).slice(0, 16).map(o => ({ id: String(o.id ?? ''), name: String(o.name ?? ''), created: String(o.created ?? ''), by: String(o.by ?? '') })) : [];
  const teams = Array.isArray(r.teams) ? r.teams.filter(isObj).slice(0, 64).map(t => ({ teamId: String(t.teamId ?? ''), name: String(t.name ?? ''),
    events: typeof t.events === 'number' ? t.events : 0, sections: typeof t.sections === 'number' ? t.sections : 0 })) : [];
  return { serverId: id.serverId, name: id.name, plugin: id.plugin, minecraft: id.minecraft, owners, settings, schema, teams,
    rooms: strings(r.rooms, 32), plans: strings(r.plans, 500), worlds: strings(r.worlds, 32), online: typeof r.online === 'number' ? r.online : 0 };
}

/** The next sequence number: milliseconds, but always above the last one used. */
export function nextSeq(pairing: ServerPairing, now = Date.now()): number { return Math.max(Math.floor(now), pairing.seq + 1); }

/** The exact JSON text that is signed: the server, the operation and its fields. */
export function controlBody(serverId: string, op: ServerOp, fields: Readonly<Record<string, unknown>> = {}): string {
  if (!SERVER_OPS.includes(op)) fail(`Unbekannte Steueraktion ${op}`);
  return JSON.stringify({ ...fields, server: serverId, op });
}

const b64url = (bytes: Uint8Array): string => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/** HMAC-SHA-256 signature as the plugin checks it (WebCrypto; works in browsers and Node 20+). */
export async function signControl(key: string, owner: string, seq: number, body: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(`${owner}\n${seq}\n${body}`))));
}

export interface ControlMessage { readonly owner: string; readonly seq: number; readonly body: string; readonly sig: string }

/** A signed control message and the pairing with the used sequence number (store it before sending). */
export async function controlMessage(pairing: ServerPairing, op: ServerOp, fields: Readonly<Record<string, unknown>> = {}, now = Date.now()): Promise<{ message: ControlMessage; pairing: ServerPairing }> {
  const seq = nextSeq(pairing, now);
  const body = controlBody(pairing.serverId, op, fields);
  return { message: { owner: pairing.owner, seq, body, sig: await signControl(pairing.key, pairing.owner, seq, body) }, pairing: { ...pairing, seq } };
}

/** Checks changed settings against the schema before sending (the plugin checks again). */
export function settingsProblem(schema: readonly ServerSetting[], set: Readonly<Record<string, unknown>>): string | null {
  for (const [k, v] of Object.entries(set)) {
    const s = schema.find(x => x.key === k);
    if (!s) return `Unbekannte Einstellung ${k}`;
    if (s.kind === 'bool' && typeof v !== 'boolean') return `${s.label}: ja oder nein`;
    if (s.kind === 'int' && (typeof v !== 'number' || !Number.isInteger(v) || (s.min !== undefined && v < s.min) || (s.max !== undefined && v > s.max))) return `${s.label}: ganze Zahl ${s.min ?? ''} bis ${s.max ?? ''}`;
    if (s.kind === 'choice' && (typeof v !== 'string' || !(s.choices ?? []).includes(v))) return `${s.label}: ${(s.choices ?? []).join(', ')}`;
  }
  return null;
}

/** Plain-language state of the way to the server, for the page. */
export const SERVER_WAY_TEXT: Readonly<Record<ServerWay, string>> = {
  none: 'Das Spiel ist mit keinem Server verbunden (Einzelspieler oder Hauptmenü).',
  no_plugin: 'Auf diesem Server läuft kein Bauplaner-Plugin.',
  ask: 'Der Server hat das Bauplaner-Plugin. Im Spiel J drücken und „Teambau erlauben“ klicken.',
  waiting: 'Verbinde mit dem Plugin …',
  live: 'Verbunden mit dem Bauplaner-Plugin.',
  off: 'Der Teamkanal ist für diesen Server im Spiel ausgeschaltet (J → Befehle & Status → „Teambau erlauben“).',
};

// ---------------------------------------------------------------- another device (LINK-05)

const ROOM_URL = /^https?:\/\/[^\s/?#]+(\/[^\s?#]*)?$/, ROOM_ID = /^r_[A-Za-z0-9_-]{6,40}$/, ROOM_KEY = /^[A-Za-z0-9_-]{16,64}$/;

/** Checks a team room reference (null when missing or invalid). */
export function readServerRoom(raw: unknown): ServerRoom | null {
  if (!isObj(raw)) return null;
  const { url, room, key } = raw;
  if (typeof url !== 'string' || typeof room !== 'string' || typeof key !== 'string') return null;
  const clean = url.replace(/\/+$/, '');
  return ROOM_URL.test(clean) && ROOM_ID.test(room) && ROOM_KEY.test(key) ? { url: clean, room, key } : null;
}

const toB64url = (text: string): string => b64url(new TextEncoder().encode(text));
const fromB64url = (s: string): string => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
};

/**
 * Link that hands a second owner key (made by the plugin with `invite`) to another own device, e.g. the iPad:
 * `#/mod?geraet=…`. The key stays in the fragment (never sent to a web server); with the team room the
 * device can control the server without the mod. Only for own devices – whoever has the link controls the server.
 */
export function deviceInviteLink(pageBase: string, p: Pick<ServerPairing, 'serverId' | 'name' | 'owner' | 'key'> & { room?: ServerRoom | undefined }): string {
  const data = { s: p.serverId, n: p.name, o: p.owner, k: p.key, ...(p.room && { r: p.room }) };
  return `${pageBase.replace(/#.*$/, '')}#/mod?geraet=${toB64url(JSON.stringify(data))}`;
}

export function readDeviceInvite(linkOrSearch: string, now = new Date()): ServerPairing {
  const hashPart = linkOrSearch.includes('#') ? linkOrSearch.slice(linkOrSearch.indexOf('#') + 1) : linkOrSearch;
  const q = new URLSearchParams(hashPart.includes('?') ? hashPart.slice(hashPart.indexOf('?') + 1) : hashPart);
  const raw = q.get('geraet') ?? fail('Freigabe fehlt im Link');
  let d: unknown;
  try { d = JSON.parse(fromB64url(raw)); } catch { return fail('Freigabe-Link ist beschädigt'); }
  const r = isObj(d) ? d : fail('Freigabe-Link ist beschädigt');
  const id = readIdentity({ serverId: r.s, name: r.n });
  const owner = text(r.o, 'Geräte-ID', 60), key = text(r.k, 'Schlüssel', 80);
  if (!OWNER.test(owner) || !KEY.test(key)) fail('Schlüssel ungültig');
  const room = readServerRoom(r.r);
  return { serverId: id.serverId, name: id.name, owner, key, seq: 0, at: now.toISOString(), ...(room && { room }) };
}
