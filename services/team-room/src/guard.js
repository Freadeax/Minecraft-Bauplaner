// Team-Raum: Schutz gegen Missbrauch (P1 Härtung 07.11.2026, docs/architecture/team/TEAM_LIVE.md §15).
// Pure logic without Cloudflare APIs, so the Node tests check the same code the Worker runs: body sizes before
// parsing, Herkunft (Origin) of browsers, rate limits for room creation, requests, connections and messages.
import { RoomError, LIMITS, CONTROL } from './core.js';

/** Fixed planner addresses; more via ALLOWED_ORIGINS in wrangler.toml. Local addresses with any port. */
export const ALLOWED_ORIGINS = Object.freeze(['https://freadeax.github.io', 'https://bauplaner.pages.dev', 'http://127.0.0.1', 'http://localhost']);

export const ABUSE = Object.freeze({
  /** Largest request body per route, enforced while reading – before any JSON parsing. */
  body: Object.freeze({
    create: 4 * 1024,
    // 200 events × 4 KB plus the batch frame.
    events: 1024 * 1024,
    header: 1024 * 1024 + 64 * 1024,
    plan: LIMITS.planBytes,
    scan: LIMITS.scanBytes,
    doc: LIMITS.docBytes,
    control: CONTROL.bytes + 16 * 1024,
    small: 4 * 1024,
    // TEAM-SEC-01: founder, public key and up to 200 member roles.
    identity: 32 * 1024,
  }),
  /** One WebSocket message (an append frame carries at most one batch). */
  messageBytes: 1024 * 1024,
  /** A connection has this long to say hello with a valid key, then it is closed. */
  helloMs: 10_000,
  /** Messages before hello that are answered; one more closes the connection. */
  preAuthMessages: 3,
  /** Open connections of one room, and of one address in one room. */
  socketsPerRoom: 64,
  socketsPerAddress: 16,
  /** Token buckets: `burst` at once, refilled by `perSecond`. */
  requests: Object.freeze({ burst: 300, perSecond: 5 }),
  messages: Object.freeze({ burst: 120, perSecond: 10 }),
  /** New WebSocket connections per address and room (reconnect storms). */
  connects: Object.freeze({ burst: 30, perSecond: 0.5 }),
  /** Room creation per address and for the whole service. */
  create: Object.freeze({ perHour: 20, perDay: 60, allPerDay: 2000 }),
});

/**
 * True for an allowed browser origin. Requests without Origin (Mod, Paper plugin, scripts) are no browser page;
 * the key alone decides for them.
 */
export function originAllowed(origin, extra = '') {
  if (!origin) return true;
  const list = [...ALLOWED_ORIGINS, ...String(extra).split(',').map(s => s.trim()).filter(Boolean)];
  return list.some(o => origin === o || (origin.startsWith(`${o}:`) && /^\d{1,5}$/.test(origin.slice(o.length + 1))));
}

/** The client address for limits: IPv4 as is, IPv6 by its /64 network (one connection usually owns a whole /64). */
export function clientAddress(request) {
  const ip = request.headers.get('CF-Connecting-IP') ?? request.headers.get('X-Real-IP') ?? '';
  if (!ip) return 'unbekannt';
  if (ip.includes(':')) return `${ip.toLowerCase().split(':').slice(0, 4).join(':')}::/64`;
  return ip;
}

const mb = n => n >= 1024 * 1024 ? `${Math.round(n / 1024 / 1024)} MB` : `${Math.round(n / 1024)} KB`;

/**
 * Reads a request body and stops at the first byte over `max` – a declared Content-Length over the limit is refused
 * before reading at all. Answers 413 `zu-gross`.
 */
export async function readBytes(request, max) {
  const declared = request.headers.get('Content-Length');
  const tooBig = () => new RoomError(413, 'zu-gross', `Anfrage größer als ${mb(max)}.`);
  if (declared !== null && declared !== '' && !(Number(declared) <= max)) throw tooBig();
  if (!request.body) return new Uint8Array(0);
  const reader = request.body.getReader(), chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) { reader.cancel().catch(() => {}); throw tooBig(); }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.byteLength; }
  return out;
}
export const readText = async (request, max) => new TextDecoder().decode(await readBytes(request, max));
/** JSON body; an empty body is `{}` where `empty` allows it, a broken one throws SyntaxError (answered with 400). */
export async function readJson(request, max, { empty = false } = {}) {
  const text = await readText(request, max);
  if (!text.trim() && empty) return {};
  return JSON.parse(text);
}

/**
 * Token buckets by key, in memory of one room (they start full again when the room wakes from hibernation – the
 * limits are for floods, not for accounting). The map is pruned so it never grows without bound.
 */
export class Buckets {
  constructor({ burst, perSecond }, maxKeys = 4096) { this.burst = burst; this.perSecond = perSecond; this.maxKeys = maxKeys; this.map = new Map(); }
  /** Takes one token; false (and nothing taken) when the bucket is empty. */
  take(key, now = Date.now(), cost = 1) {
    let b = this.map.get(key);
    if (!b) {
      if (this.map.size >= this.maxKeys) this.prune(now);
      b = { tokens: this.burst, at: now };
      this.map.set(key, b);
    }
    b.tokens = Math.min(this.burst, b.tokens + ((now - b.at) / 1000) * this.perSecond);
    b.at = now;
    if (b.tokens < cost) return false;
    b.tokens -= cost;
    return true;
  }
  /** Seconds until one token is back (for Retry-After). */
  retryAfter(key) { const b = this.map.get(key); return b ? Math.max(1, Math.ceil((1 - b.tokens) / this.perSecond)) : 1; }
  prune(now = Date.now()) {
    for (const [k, b] of this.map) if (b.tokens + ((now - b.at) / 1000) * this.perSecond >= this.burst) this.map.delete(k);
    while (this.map.size >= this.maxKeys) this.map.delete(this.map.keys().next().value);
  }
}

/**
 * Room creation counted in fixed windows (hour and day) – the state lives in the Durable Object `RoomGate`, one per
 * address plus one for the whole service. Returns the new state and whether this creation is allowed.
 */
export function countCreation(state, now, { perHour, perDay }) {
  const hour = Math.floor(now / 3_600_000), day = Math.floor(now / 86_400_000);
  const s = { hour, day, inHour: state?.hour === hour ? state.inHour : 0, inDay: state?.day === day ? state.inDay : 0 };
  if (s.inHour >= perHour || s.inDay >= perDay) {
    const retry = s.inDay >= perDay ? (day + 1) * 86_400_000 - now : (hour + 1) * 3_600_000 - now;
    return { ok: false, state: s, retryAfter: Math.max(1, Math.ceil(retry / 1000)) };
  }
  return { ok: true, state: { ...s, inHour: s.inHour + 1, inDay: s.inDay + 1 } };
}

export const tooMany = (message, retryAfter) => Object.assign(new RoomError(429, 'zu-viele', message), { retryAfter });
