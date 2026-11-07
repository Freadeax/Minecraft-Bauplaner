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
