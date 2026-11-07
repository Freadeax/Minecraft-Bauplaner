/**
 * GAME-06 (docs/architecture/team/SIGNED_EVENTS.md): signed team events of the Bauleitung.
 *
 * Only the planner that created the room holds its admin key. From it, it derives the signing key
 * `base64url(HMAC-SHA-256(adminKey, "bauplaner-leitung/v1"))` and signs every event it sends in the
 * founder's name: `sig = base64url(HMAC-SHA-256(signKey, "bauplaner-team-event/v1\n" + teamId + "\n" + canonical(event without sig)))`.
 * The server plugin gets the signing key once (link parameter `l`, through the mod or a signed control
 * message), never the admin key. Members and the room never see it, so nobody with only the invitation can
 * write role changes, protection settings or anything else "as the Bauleitung" that the server accepts.
 * `EventSig.java` (mod core, also in the plugin) computes the same; both tests share a vector.
 * Signing is deterministic: a resent event keeps its signature and the room answers "known".
 */
import type { TeamEvent } from './team.js';

export const SIGN_KEY_INFO = 'bauplaner-leitung/v1';
export const SIGN_CONTEXT = 'bauplaner-team-event/v1';
export const SIGN_KEY = /^[A-Za-z0-9_-]{43}$/;

/** Canonical JSON: keys sorted (UTF-16 order), no spaces – the same as `canonical` in the team room (core.js). */
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  // Keys with undefined are left out, as JSON.stringify does when the event is sent.
  if (v && typeof v === 'object') return `{${Object.keys(v).filter(k => (v as Record<string, unknown>)[k] !== undefined).sort().map(k => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(v) ?? 'null';
}

const b64url = (bytes: Uint8Array): string => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

async function hmac(key: string, text: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(text))));
}

/** Signing key of the Bauleitung from the room's admin key (only the founder's planner has it). */
export const deriveSignKey = (adminKey: string): Promise<string> => hmac(adminKey, SIGN_KEY_INFO);

const withoutSig = (e: TeamEvent): Record<string, unknown> => { const { sig: _s, ...rest } = e as unknown as Record<string, unknown>; return rest; };

export const signatureOf = (signKey: string, teamId: string, event: TeamEvent): Promise<string> =>
  hmac(signKey, `${SIGN_CONTEXT}\n${teamId}\n${canonical(withoutSig(event))}`);

export async function signEvent<T extends TeamEvent>(signKey: string, teamId: string, event: T): Promise<T> {
  return { ...(withoutSig(event) as T), sig: await signatureOf(signKey, teamId, event) };
}

export async function verifyEvent(signKey: string, teamId: string, event: TeamEvent): Promise<boolean> {
  const sig = (event as unknown as { sig?: unknown }).sig;
  return typeof sig === 'string' && SIGN_KEY.test(sig) && sig === await signatureOf(signKey, teamId, event);
}

/**
 * Signs the events of a batch the founder wrote (by === founder). Events by other members stay as they are:
 * the Bauleitung does not vouch for what others wrote, even when it passes their events on (team package).
 */
export async function signBatch<T extends TeamEvent>(signKey: string | undefined, team: { readonly teamId: string; readonly founder: string }, events: readonly T[]): Promise<T[]> {
  if (!signKey) return [...events];
  return Promise.all(events.map(async e => {
    if (e.by !== team.founder) return e;
    const signed = await signEvent(signKey, team.teamId, e);
    // The room takes events up to 4 KB; one that only fits unsigned goes unsigned (the server then treats it as unchecked).
    return new TextEncoder().encode(JSON.stringify(signed)).length > 4096 ? e : signed;
  }));
}

// ------------------------------------------------------------------ TEAM-SEC-01: Ed25519 statt HMAC
// docs/architecture/team/TEAM_IDENTITY.md §4. With the HMAC key above, whoever can check a signature can also make one –
// the Paper plugin had to hold it. Now the Bauleitung signs with an Ed25519 key derived from the admin key; everybody
// else (planners, mods, the plugin, the room) gets only the public key and can check but never sign.
// A signature is 86 characters (64 bytes base64url), an old HMAC signature 43 – both live in `sig`.

export const LEADER_SEED_INFO = 'bauplaner-leitung/ed25519/v1';
export const LEADER_CONTEXT = 'bauplaner-team-event/v2';
export const LEADER_SIG = /^[A-Za-z0-9_-]{86}$/;
export const LEADER_KEY = /^[A-Za-z0-9_-]{43}$/;
const PKCS8_ED25519 = [0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20];

const unb64url = (s: string): Uint8Array => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

/** 32-byte Ed25519 seed of the Bauleitung (base64url), derived from the admin key; never leaves the Bauleitung's devices. */
export const deriveLeaderSeed = (adminKey: string): Promise<string> => hmac(adminKey, LEADER_SEED_INFO);

async function privateKey(seed: string, extractable = false): Promise<CryptoKey> {
  const raw = unb64url(seed);
  if (raw.length !== 32) throw new Error('Schlüssel der Bauleitung ungültig');
  return crypto.subtle.importKey('pkcs8', new Uint8Array([...PKCS8_ED25519, ...raw]) as BufferSource, { name: 'Ed25519' }, extractable, ['sign']);
}

/** Public key (32 bytes base64url) to a seed: what the room, the members and the server plugin get. */
export async function leaderPublicKey(seed: string): Promise<string> {
  const jwk = await crypto.subtle.exportKey('jwk', await privateKey(seed, true));
  if (typeof jwk.x !== 'string') throw new Error('Ed25519 wird von diesem Browser nicht unterstützt');
  return jwk.x;
}

const leaderText = (teamId: string, event: TeamEvent) => new TextEncoder().encode(`${LEADER_CONTEXT}\n${teamId}\n${canonical(withoutSig(event))}`);

export async function signLeaderEvent<T extends TeamEvent>(seed: string, teamId: string, event: T): Promise<T> {
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'Ed25519' }, await privateKey(seed), leaderText(teamId, event) as BufferSource));
  return { ...(withoutSig(event) as T), sig: b64url(sig) };
}

const publicKeys = new Map<string, Promise<CryptoKey>>();
/** Whether the event carries a valid Ed25519 signature of the Bauleitung's public key. */
export async function verifyLeaderEvent(publicKey: string | null | undefined, teamId: string, event: TeamEvent): Promise<boolean> {
  const sig = (event as unknown as { sig?: unknown }).sig;
  if (!publicKey || !LEADER_KEY.test(publicKey) || typeof sig !== 'string' || !LEADER_SIG.test(sig)) return false;
  try {
    let key = publicKeys.get(publicKey);
    if (!key) publicKeys.set(publicKey, key = crypto.subtle.importKey('raw', unb64url(publicKey) as BufferSource, { name: 'Ed25519' }, false, ['verify']));
    return await crypto.subtle.verify({ name: 'Ed25519' }, await key, unb64url(sig) as BufferSource, leaderText(teamId, event) as BufferSource);
  } catch { return false; }
}

/** Like {@link signBatch}, with the Ed25519 key: only the founder's events, only what still fits into 4 KB. */
export async function signLeaderBatch<T extends TeamEvent>(seed: string | undefined, team: { readonly teamId: string; readonly founder: string }, events: readonly T[]): Promise<T[]> {
  if (!seed) return [...events];
  return Promise.all(events.map(async e => {
    if (e.by !== team.founder) return e;
    const signed = await signLeaderEvent(seed, team.teamId, e);
    return new TextEncoder().encode(JSON.stringify(signed)).length > 4096 ? e : signed;
  }));
}
