/**
 * BACKUP-03 (docs/architecture/team/TEAM_ACCESS.md): the keys of a Team-Raum never travel in a normal backup.
 *
 * A project in live mode carries `site.team.live` with the invitation key, and for the Bauleitung also the admin
 * key and the server key. Project and full backups are meant to be copied around (USB stick, cloud folder, another
 * browser), so they are written without that block. Whoever needs the access again (new browser, reinstalled
 * device) takes the separate „Team-Zugang“: the same fields, sealed with a password (PBKDF2-SHA-256 + AES-GCM).
 *
 * After a key may have leaked (an old backup was passed on), the Bauleitung changes the admin key (room route
 * `rotate?wer=admin`). The signing key of GAME-06 is derived from it, so the server needs a new confirmation of the
 * room's past: `retrustAfterRekey` finds how far the old signatures and rules carried, the planner signs a new
 * `team.trust` with the new key up to that point.
 * Pure functions (WebCrypto only); the page does storage and requests.
 */
import { DomainError } from '../core/types.js';
import type { Project } from '../core/types.js';
import { checkLive, goLive } from './teamSync.js';
import type { RoomTeam, TeamLive } from './teamSync.js';
import type { TeamEvent, TeamState } from './team.js';
import { teamKindNeed } from './team.js';
import { verifyEvent } from './eventSig.js';

/** True when the project holds keys of a Team-Raum (live mode). */
export function hasTeamAccess(project: Pick<Project, 'site'>): boolean {
  return !!(project.site?.team as RoomTeam | undefined)?.live;
}

/** Names of the keys a project holds, for notes („Einladung, Verwaltung, Server“). */
export function teamAccessKinds(project: Pick<Project, 'site'>): string[] {
  const live = (project.site?.team as RoomTeam | undefined)?.live;
  if (!live) return [];
  return ['Einladung', ...(live.adminKey ? ['Verwaltung'] : []), ...(live.serverKey ? ['Server'] : [])];
}

/** The project without the Team-Raum block (keys, read position, outbox). Everything else stays untouched. */
export function withoutTeamAccess<P extends Pick<Project, 'site'>>(project: P): P {
  const team = project.site?.team as RoomTeam | undefined;
  if (!team?.live) return project;
  const { live: _l, ...rest } = team;
  return { ...project, site: { ...project.site!, team: rest as TeamState } };
}

/**
 * Restore: the local project keeps its own access when the incoming record has none (a key-free backup must not
 * throw a working room connection away). An incoming access (older backups) is used only when the local one is missing.
 */
export function keepTeamAccess<P extends Pick<Project, 'site'>>(incoming: P, local: Pick<Project, 'site'> | undefined): P {
  const localLive = (local?.site?.team as RoomTeam | undefined)?.live;
  const inTeam = incoming.site?.team as RoomTeam | undefined;
  if (!localLive || !inTeam || inTeam.live) return incoming;
  if ((local!.site!.team as TeamState).teamId !== inTeam.teamId) return incoming;
  return { ...incoming, site: { ...incoming.site!, team: { ...inTeam, live: localLive } } };
}

// ---------------------------------------------------------------------------------------------------------------
// Sealed „Team-Zugang“ file

export const TEAM_ACCESS_FORMAT = 'lmnt-team-zugang';
export const TEAM_ACCESS_VERSION = 1;
/** PBKDF2 rounds written into new files (OWASP 2023 for PBKDF2-HMAC-SHA-256). */
export const TEAM_ACCESS_ITERATIONS = 600_000;
const MIN_ITERATIONS = 100_000, MAX_ITERATIONS = 5_000_000;
export const MIN_PASSWORD = 10;
const MAX_FILE = 64 * 1024;

/** What the sealed file holds: enough to go live again in the same room with the same rights. */
export interface TeamAccess {
  readonly teamId: string;
  readonly teamName: string;
  readonly projectName: string;
  readonly createdAt: string;
  readonly url: string;
  readonly room: string;
  readonly key: string;
  readonly adminKey?: string;
  readonly serverKey?: string;
}

const fail = (m: string): never => { throw new DomainError('INVALID', `Team-Zugang: ${m}`); };
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = (bytes: Uint8Array): string => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); };
const unb64 = (text: unknown, what: string): Uint8Array => {
  if (typeof text !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(text)) return fail(`${what} fehlt`);
  const s = atob(text), out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
};
/** Header fields bound into the encryption (changing them breaks the seal). */
const aad = (iterations: number, teamId: string) => enc.encode(`${TEAM_ACCESS_FORMAT}/${TEAM_ACCESS_VERSION}\n${iterations}\n${teamId}`);

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/** The access of a live project, or an error when it has none. */
export function teamAccessOf(project: Pick<Project, 'name' | 'site'>, now = new Date()): TeamAccess {
  const team = project.site?.team as RoomTeam | undefined;
  if (!team?.live) return fail('dieses Projekt ist mit keinem Team-Raum verbunden');
  const l = team.live;
  return { teamId: team.teamId, teamName: team.name, projectName: project.name, createdAt: now.toISOString(), url: l.url, room: l.room, key: l.key,
    ...(l.adminKey && { adminKey: l.adminKey }), ...(l.serverKey && { serverKey: l.serverKey }) };
}

export function checkPassword(password: string): void {
  if (password.trim().length < MIN_PASSWORD) fail(`Passwort braucht mindestens ${MIN_PASSWORD} Zeichen`);
}

/** Seals the access with a password; the text is the file content. */
export async function sealTeamAccess(access: TeamAccess, password: string, iterations = TEAM_ACCESS_ITERATIONS): Promise<string> {
  checkPassword(password);
  if (iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) fail('Rundenzahl ungültig');
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, iterations);
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource, additionalData: aad(iterations, access.teamId) as BufferSource }, key, enc.encode(JSON.stringify(access))));
  return JSON.stringify({
    format: TEAM_ACCESS_FORMAT, version: TEAM_ACCESS_VERSION, teamId: access.teamId, teamName: access.teamName, createdAt: access.createdAt,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt: b64(salt) }, cipher: { name: 'AES-GCM', iv: b64(iv) }, data: b64(data),
  }, null, 1);
}

/** Header of a sealed file (readable without the password: team name, date). */
export function peekTeamAccess(text: string): { readonly teamId: string; readonly teamName: string; readonly createdAt: string } {
  const raw = parse(text);
  return { teamId: raw.teamId as string, teamName: String(raw.teamName ?? ''), createdAt: String(raw.createdAt ?? '') };
}

function parse(text: string): Record<string, unknown> {
  if (text.length > MAX_FILE) fail('Datei ist zu groß');
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return fail('keine gültige Datei'); }
  if (typeof raw !== 'object' || raw === null || (raw as Record<string, unknown>).format !== TEAM_ACCESS_FORMAT) return fail('das ist keine Team-Zugang-Datei');
  const r = raw as Record<string, unknown>;
  if (r.version !== TEAM_ACCESS_VERSION) fail(`Version ${String(r.version)} wird nicht unterstützt`);
  if (typeof r.teamId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(r.teamId)) fail('Team-ID ungültig');
  return r;
}

/** Opens a sealed file; a wrong password and a changed file give the same error (AES-GCM checks both). */
export async function openTeamAccess(text: string, password: string): Promise<TeamAccess> {
  const r = parse(text);
  const kdf = r.kdf as Record<string, unknown> | undefined, cipher = r.cipher as Record<string, unknown> | undefined;
  if (!kdf || kdf.name !== 'PBKDF2' || kdf.hash !== 'SHA-256' || !cipher || cipher.name !== 'AES-GCM') return fail('Verfahren unbekannt');
  const iterations = kdf.iterations;
  if (typeof iterations !== 'number' || !Number.isInteger(iterations) || iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) return fail('Rundenzahl ungültig');
  const salt = unb64(kdf.salt, 'Salz'), iv = unb64(cipher.iv, 'Startwert'), data = unb64(r.data, 'Inhalt');
  if (salt.length < 16 || iv.length !== 12) fail('Kopfdaten ungültig');
  let plain: Uint8Array;
  try {
    const key = await deriveKey(password, salt, iterations);
    plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource, additionalData: aad(iterations, r.teamId as string) as BufferSource }, key, data as BufferSource));
  } catch { return fail('Passwort falsch oder Datei verändert'); }
  let a: Record<string, unknown>;
  try { a = JSON.parse(dec.decode(plain)) as Record<string, unknown>; } catch { return fail('Inhalt unlesbar'); }
  if (a.teamId !== r.teamId) fail('Team-ID passt nicht zum Inhalt');
  // Same rules as a stored live block.
  checkLive({ url: a.url, room: a.room, key: a.key, ...(a.adminKey !== undefined && { adminKey: a.adminKey }), ...(a.serverKey !== undefined && { serverKey: a.serverKey }), cursor: '', pending: [], device: 'dev_check' });
  return {
    teamId: a.teamId as string, teamName: String(a.teamName ?? '').slice(0, 120), projectName: String(a.projectName ?? '').slice(0, 120), createdAt: String(a.createdAt ?? ''),
    url: a.url as string, room: a.room as string, key: a.key as string,
    ...(typeof a.adminKey === 'string' && { adminKey: a.adminKey }), ...(typeof a.serverKey === 'string' && { serverKey: a.serverKey }),
  };
}

/**
 * Puts the team of a project back into the room of the access. The whole own log goes into the outbox (the room
 * answers „known“ for what it has), the read position starts at the beginning: nothing is lost in either direction.
 */
export function restoreTeamAccess(team: TeamState, access: TeamAccess, device: string): RoomTeam {
  if (team.teamId !== access.teamId) fail(`die Datei gehört zum Team „${access.teamName || access.teamId}“, nicht zu „${team.name}“`);
  const { live: _l, ...plain } = team as RoomTeam;
  return goLive(plain, { url: access.url, room: access.room, key: access.key, ...(access.adminKey && { adminKey: access.adminKey }), ...(access.serverKey && { serverKey: access.serverKey }) }, device);
}

/** File name of the sealed access. */
export function teamAccessFileName(access: Pick<TeamAccess, 'teamName' | 'createdAt'>): string {
  const slug = access.teamName.normalize('NFKD').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 40) || 'team';
  return `team-zugang-${slug}-${access.createdAt.slice(0, 10)}.lmnt-zugang.json`;
}

// ---------------------------------------------------------------------------------------------------------------
// Admin key change: how much of the room's past the new signing key may confirm

/** A room event with its arrival number. */
export interface SeqEvent { readonly seq: number; readonly event: TeamEvent }

export interface Retrust {
  /** Arrival number for the new `team.trust` (everything up to it passes the server unchanged). */
  readonly upTo: number;
  /** Arrival number the old signatures had confirmed (-1 = none). */
  readonly oldUpTo: number;
  /** First event after the old confirmation the server had refused, if any (it stays refused). */
  readonly firstRefused?: { readonly seq: number; readonly id: string; readonly reason: string };
  /** Events after `upTo` with a signature of the old key: the server will not take them any more. */
  readonly lostSigned: number;
}

const str = (e: TeamEvent, k: string): string | undefined => { const v = (e as unknown as Record<string, unknown>)[k]; return typeof v === 'string' ? v : undefined; };

/**
 * Replays the filter of the server plugin (EventTrust.java) over the room's events with the old signing key. The
 * new confirmation reaches up to the last event before the first one the server refused: the change of key never
 * lets a refused forgery in, and everything the server took stays taken.
 */
export async function retrustAfterRekey(events: readonly SeqEvent[], team: Pick<TeamState, 'teamId' | 'founder'>, oldSignKey: string): Promise<Retrust> {
  const list = [...events].sort((a, b) => a.seq - b.seq);
  const valid = new Map<string, boolean>();
  const signed = async (e: TeamEvent) => { let v = valid.get(e.id); if (v === undefined) valid.set(e.id, v = await verifyEvent(oldSignKey, team.teamId, e)); return v; };
  let oldUpTo = -1;
  for (const { event: e } of list) {
    if (e.kind !== 'team.trust' || e.by !== team.founder || !await signed(e)) continue;
    const n = str(e, 'upTo');
    if (n && /^\d{1,15}$/.test(n)) oldUpTo = Math.max(oldUpTo, Number(n));
  }
  const last = list.length ? list[list.length - 1]!.seq : 0;
  // Without an old confirmation the server did not filter yet: the whole past counts, as at the first connection.
  if (oldUpTo < 0) return { upTo: last, oldUpTo, lostSigned: 0 };
  const players = new Map<string, string>(), memberOf = new Map<string, string>();
  let firstRefused: Retrust['firstRefused'];
  for (const { seq, event: e } of list) {
    const reason = await refusal(e, seq);
    if (reason) { firstRefused = { seq, id: e.id, reason }; break; }
    const player = str(e, 'player'), member = str(e, 'member');
    if (player && member && (e.kind === 'member.player' || e.kind === 'member.join')) {
      const old = players.get(member);
      if (old) memberOf.delete(old.toLowerCase());
      players.set(member, player); memberOf.set(player.toLowerCase(), member);
    }
  }
  const upTo = firstRefused ? firstRefused.seq - 1 : last;
  let lostSigned = 0;
  for (const { seq, event: e } of list) if (seq > upTo && 'sig' in e && await signed(e)) lostSigned++;
  return { upTo: Math.max(upTo, oldUpTo), oldUpTo, ...(firstRefused && { firstRefused }), lostSigned };

  async function refusal(e: TeamEvent, seq: number): Promise<string | null> {
    if (str(e, 'origin') === 'server') return null;
    if ('sig' in e) return await signed(e) ? null : 'Unterschrift passt nicht';
    if (seq <= oldUpTo) return null;
    if (e.by === team.founder) return 'im Namen der Bauleitung ohne Unterschrift';
    if (teamKindNeed(e.kind) === 'leitung') return 'nur für die Bauleitung, ohne Unterschrift';
    const player = str(e, 'player'), member = str(e, 'member');
    if (player && member && (e.kind === 'member.player' || e.kind === 'member.join')) {
      const bound = players.get(member);
      if (bound && bound.toLowerCase() !== player.toLowerCase()) return 'Spielername schon vergeben';
      const other = memberOf.get(player.toLowerCase());
      if (other && other !== member) return 'Spieler gehört schon zu einem anderen Mitglied';
    }
    return null;
  }
}

/** The room's pages as numbered events: a page ends at `cursor`, its events are the numbers right before it. */
export function numberPage(events: readonly TeamEvent[], cursor: string): SeqEvent[] {
  const end = Number(cursor);
  if (!Number.isSafeInteger(end)) fail('Lesestand des Raums ungültig');
  return events.map((event, i) => ({ seq: end - (events.length - 1 - i), event }));
}

export type { TeamLive };
