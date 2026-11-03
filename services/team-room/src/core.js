// Team-Raum (COOP-07, docs/architecture/TEAM_LIVE.md §4): the room logic without Cloudflare APIs, so the
// same code runs in the Durable Object and in the Node tests. The room is deliberately dumb: it checks
// form and size of events, keeps them in arrival order and hands them out after a cursor. Rights,
// conflicts and the meaning of events stay in the fold of every participant (packages/domain/src/team.ts).

export const PROTOCOL = 'team-room';
export const VERSION = 1;
export const LIMITS = Object.freeze({ events: 20_000, eventBytes: 4096, batch: 200, page: 500, planBytes: 25 * 1024 * 1024, planChunk: 1024 * 1024, batchesKept: 2000 });

const ID = /^[A-Za-z0-9_.:-]{1,64}$/;
const KIND = /^[a-z][a-z0-9.]{1,39}$/;

export class RoomError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

/** Form check of one event, mirrors the header part of checkTeamEvent (team.ts); the room never interprets it. */
export function checkEventShape(e) {
  if (typeof e !== 'object' || e === null || Array.isArray(e)) return 'Ereignis ist kein Objekt';
  if (typeof e.id !== 'string' || !ID.test(e.id)) return 'Ereignis-ID ungültig';
  if (typeof e.at !== 'string' || e.at.length > 40 || !Number.isFinite(Date.parse(e.at))) return 'Ereigniszeit ungültig';
  if (typeof e.by !== 'string' || !ID.test(e.by)) return 'Urheber ungültig';
  if (typeof e.kind !== 'string' || !KIND.test(e.kind)) return 'Ereignisart ungültig';
  if (e.origin !== 'planer' && e.origin !== 'server') return 'Herkunft muss planer oder server sein';
  if (new TextEncoder().encode(JSON.stringify(e)).length > LIMITS.eventBytes) return 'Ereignis ist größer als 4 KB';
  return null;
}

/** Canonical JSON (sorted keys) to compare two events with the same id. */
export function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
  return JSON.stringify(v);
}

export async function sha256(text) {
  const bytes = typeof text === 'string' ? new TextEncoder().encode(text) : text;
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...d].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function randomKey(bytes = 24) {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * In-memory store; the Durable Object uses SqlStore with the same methods.
 * meta: small JSON values; events: arrival-ordered rows {seq, id, json}; batches: answers by batch id; plan chunks.
 */
export class MemoryStore {
  constructor() { this.meta = new Map(); this.rows = []; this.byId = new Map(); this.batches = new Map(); this.plans = new Map(); }
  getMeta(k) { return this.meta.has(k) ? structuredClone(this.meta.get(k)) : undefined; }
  setMeta(k, v) { this.meta.set(k, structuredClone(v)); }
  count() { return this.rows.length; }
  eventById(id) { return this.byId.get(id); }
  appendEvent(id, json) { const seq = this.rows.length + 1; const row = { seq, id, json }; this.rows.push(row); this.byId.set(id, row); return seq; }
  since(seq, limit) { return this.rows.filter(r => r.seq > seq).slice(0, limit); }
  lastSeq() { return this.rows.length ? this.rows[this.rows.length - 1].seq : 0; }
  getBatch(b) { return this.batches.get(b); }
  setBatch(b, answer) { this.batches.set(b, answer); if (this.batches.size > LIMITS.batchesKept) this.batches.delete(this.batches.keys().next().value); }
  putPlan(sha, chunks) { this.plans.set(sha, chunks); }
  getPlan(sha) { return this.plans.get(sha); }
  planShas() { return [...this.plans.keys()]; }
  deletePlan(sha) { this.plans.delete(sha); }
}

export class RoomCore {
  /** @param {MemoryStore} store */
  constructor(store) { this.store = store; }

  get created() { return !!this.store.getMeta('room'); }

  /** Creates the room once; returns the keys (only now in clear text). */
  async create({ room, teamId, name }) {
    if (this.created) throw new RoomError(409, 'raum-vorhanden', 'Diesen Raum gibt es schon.');
    if (typeof teamId !== 'string' || !ID.test(teamId)) throw new RoomError(400, 'team-id', 'Team-ID ungültig.');
    const adminKey = randomKey(), memberKey = randomKey(), serverKey = randomKey();
    this.store.setMeta('room', { room, teamId, name: String(name ?? 'Team').slice(0, 120), createdAt: new Date().toISOString(),
      admin: await sha256(adminKey), member: await sha256(memberKey), server: await sha256(serverKey) });
    return { room, teamId, adminKey, memberKey, serverKey };
  }

  info() {
    const r = this.store.getMeta('room');
    if (!r) throw new RoomError(404, 'raum-fehlt', 'Diesen Team-Raum gibt es nicht (mehr).');
    return { protocol: PROTOCOL, version: VERSION, room: r.room, teamId: r.teamId, name: r.name, createdAt: r.createdAt, events: this.store.count(), cursor: String(this.store.lastSeq()), header: !!this.store.getMeta('header') };
  }

  /**
   * 'admin' | 'server' | 'member'; throws 401/403. The server key (Paper plugin) may write events with
   * origin "server" (build.tally, store.count); it is no admin. The admin key may do everything.
   */
  async auth(key, need = 'member') {
    const r = this.store.getMeta('room');
    if (!r) throw new RoomError(404, 'raum-fehlt', 'Diesen Team-Raum gibt es nicht (mehr).');
    if (typeof key !== 'string' || !key) throw new RoomError(401, 'schluessel-fehlt', 'Schlüssel fehlt.');
    const h = await sha256(key);
    if (h === r.admin) return 'admin';
    if (r.server && h === r.server && need !== 'admin') return 'server';
    if (h === r.member && need === 'member') return 'member';
    throw new RoomError(h === r.member ? 403 : 401, h === r.member ? 'nur-bauleitung' : 'schluessel-falsch', h === r.member ? 'Das darf nur die Bauleitung.' : 'Der Schlüssel passt nicht (Einladung erneuert?).');
  }

  /** Appends a batch. Repeating the same batch id returns the first answer unchanged. */
  append({ batch, events }, role = 'member') {
    if (typeof batch !== 'string' || !ID.test(batch)) throw new RoomError(400, 'stapel-id', 'Stapel-ID ungültig.');
    const known = this.store.getBatch(batch);
    if (known) return known;
    if (!Array.isArray(events) || events.length > LIMITS.batch) throw new RoomError(400, 'stapel-groesse', `Höchstens ${LIMITS.batch} Ereignisse je Stapel.`);
    const answer = { cursor: '', accepted: [], known: [], rejected: [] };
    const added = [];
    for (const e of events) {
      const problem = checkEventShape(e);
      const id = typeof e?.id === 'string' ? e.id.slice(0, 64) : '?';
      if (problem) { answer.rejected.push({ id, reason: problem }); continue; }
      if (e.origin === 'server' && role !== 'server') { answer.rejected.push({ id, reason: 'Nur der Server (Serverschlüssel) schreibt Ereignisse mit Herkunft „server“.' }); continue; }
      const row = this.store.eventById(e.id);
      if (row) {
        if (canonical(JSON.parse(row.json)) === canonical(e)) answer.known.push(e.id);
        else answer.rejected.push({ id: e.id, reason: 'Gleiche ID mit anderem Inhalt – das Ereignis im Raum bleibt.' });
        continue;
      }
      if (this.store.count() >= LIMITS.events) { answer.rejected.push({ id: e.id, reason: `Der Raum ist voll (${LIMITS.events} Ereignisse).` }); continue; }
      const json = JSON.stringify(e);
      this.store.appendEvent(e.id, json);
      answer.accepted.push(e.id); added.push(e);
    }
    answer.cursor = String(this.store.lastSeq());
    this.store.setBatch(batch, answer);
    return { ...answer, added };
  }

  /** Events after a cursor in arrival order; an unknown or future cursor answers with reset. */
  since(cursor, limit = LIMITS.page) {
    const last = this.store.lastSeq();
    const n = cursor === '' || cursor === undefined || cursor === null ? 0 : Number(cursor);
    const reset = !Number.isSafeInteger(n) || n < 0 || n > last;
    const from = reset ? 0 : n;
    const rows = this.store.since(from, Math.max(1, Math.min(LIMITS.page, Number(limit) || LIMITS.page)));
    const cursorOut = rows.length ? String(rows[rows.length - 1].seq) : String(from);
    return { events: rows.map(r => JSON.parse(r.json)), cursor: cursorOut, more: rows.length ? rows[rows.length - 1].seq < last : false, ...(reset && { reset: true }) };
  }

  setHeader(header) {
    const text = JSON.stringify(header);
    if (text.length > 1024 * 1024) throw new RoomError(413, 'kopf-groesse', 'Kopfdaten größer als 1 MB.');
    const r = this.store.getMeta('room');
    if (header?.teamId !== undefined && header.teamId !== r.teamId) throw new RoomError(400, 'team-id', 'Kopfdaten gehören zu einem anderen Team.');
    this.store.setMeta('header', { ...header, updatedAt: new Date().toISOString() });
  }
  getHeader() { const h = this.store.getMeta('header'); if (!h) throw new RoomError(404, 'kopf-fehlt', 'Die Bauleitung hat noch keinen Planstand für den Server hochgeladen.'); return h; }

  /** Stores a plan snapshot (gzip backup) under its SHA-256; keeps the newest three. */
  async putPlan(sha, bytes) {
    if (!/^[a-f0-9]{64}$/.test(sha)) throw new RoomError(400, 'plan-id', 'Plan-ID muss SHA-256 sein.');
    if (bytes.byteLength > LIMITS.planBytes) throw new RoomError(413, 'plan-groesse', 'Planstand größer als 25 MB.');
    if (await sha256(bytes) !== sha) throw new RoomError(400, 'plan-pruefsumme', 'Prüfsumme des Planstands stimmt nicht.');
    const chunks = [];
    for (let i = 0; i < bytes.byteLength; i += LIMITS.planChunk) chunks.push(bytes.slice(i, i + LIMITS.planChunk));
    this.store.putPlan(sha, chunks);
    const order = (this.store.getMeta('plans') ?? []).filter(s => s !== sha).concat(sha);
    while (order.length > 3) this.store.deletePlan(order.shift());
    this.store.setMeta('plans', order);
  }
  getPlan(sha) {
    const chunks = this.store.getPlan(sha);
    if (!chunks) throw new RoomError(404, 'plan-fehlt', 'Diesen Planstand hat der Raum nicht (mehr).');
    const total = chunks.reduce((n, c) => n + c.byteLength, 0), out = new Uint8Array(total);
    let o = 0; for (const c of chunks) { out.set(new Uint8Array(c), o); o += c.byteLength; }
    return out;
  }

  /** New invitation key (who = 'member') or new server key (who = 'server'); old connections with it are closed by the caller. */
  async rotate(who = 'member') {
    const r = this.store.getMeta('room'), key = randomKey();
    if (who === 'server') { this.store.setMeta('room', { ...r, server: await sha256(key) }); return { serverKey: key }; }
    this.store.setMeta('room', { ...r, member: await sha256(key) });
    return { memberKey: key };
  }
}

/** Presence of one connection (TEAM_LIVE.md §4): flüchtig, nie im Protokoll. */
export function cleanPresence(p, now = new Date().toISOString()) {
  const where = ['planer', 'spiel', 'server'].includes(p?.where) ? p.where : 'planer';
  return { member: typeof p?.member === 'string' ? p.member.slice(0, 64) : '?', device: typeof p?.device === 'string' ? p.device.slice(0, 64) : '?', where,
    ...(typeof p?.section === 'string' && { section: p.section.slice(0, 64) }), since: typeof p?.since === 'string' ? p.since.slice(0, 40) : now };
}
