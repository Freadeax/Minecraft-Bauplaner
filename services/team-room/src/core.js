// Team-Raum (COOP-07, docs/architecture/team/TEAM_LIVE.md §4): the room logic without Cloudflare APIs, so the
// same code runs in the Durable Object and in the Node tests. The room is deliberately dumb: it checks
// form and size of events, keeps them in arrival order and hands them out after a cursor. Rights,
// conflicts and the meaning of events stay in the fold of every participant (packages/domain/src/team/team.ts).

export const PROTOCOL = 'team-room';
export const VERSION = 1;
export const LIMITS = Object.freeze({ events: 20_000, eventBytes: 4096, batch: 200, page: 500, planBytes: 25 * 1024 * 1024, planChunk: 1024 * 1024, batchesKept: 2000, scanBytes: 8 * 1024 * 1024, scansKept: 12, docBytes: 4 * 1024 * 1024 });

/**
 * WORLD-SHARE-01: shared documents of the team that are no events – the Weltplan with its map markers
 * (`weltplan`) and the list of server web maps (`karten`). The room keeps the newest version of each, counts
 * a revision up and tells every connection; the content stays as sent (the room never interprets it).
 */
export const DOC_NAMES = Object.freeze(['weltplan', 'karten']);

const ID = /^[A-Za-z0-9_.:-]{1,64}$/;

/**
 * TEAM-02 (docs/architecture/team/TEAM_LIVE.md §13): kinds that decide about one subject – a section, a chest, a note
 * or a member. The room remembers who changed each subject last (arrival number and author). A writer that sends a
 * guard (the room cursor it had seen when the step was made) gets its event back as „stale“ instead of accepted,
 * when someone else changed the same subject after that cursor: nobody overwrites a decision they never saw.
 * Observations (section.seen, store.seen), measurements and notes added stay unguarded. Mirrors teamSync.ts.
 */
export const GUARDED_KINDS = Object.freeze(['section.claim', 'section.assign', 'section.release', 'section.done', 'section.verify',
  'section.handover', 'section.accept', 'section.decline', 'note.resolve', 'member.role', 'member.away', 'store.config', 'store.chest', 'store.seal']);
const GUARDED = new Set(GUARDED_KINDS);

/** Subject keys of a guarded event (`section:<id>`, `chest:<id>`, `note:<id>`, `member:<id>`); [] for all other kinds. */
export function subjectsOf(e) {
  if (!e || !GUARDED.has(e.kind)) return [];
  const out = [];
  const add = (prefix, v) => { if (typeof v === 'string' && v) out.push(`${prefix}:${v.slice(0, 64)}`); };
  if (e.kind.startsWith('member.')) add('member', e.member);
  add('section', e.section); add('chest', e.chest); add('note', e.noteId);
  return out;
}
const KIND = /^[a-z][a-z0-9.]{1,39}$/;

/** A guard cursor as number; null (no check) when missing or not a cursor of this room (e.g. after a reset). */
function baseOf(v, last) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isSafeInteger(n) && n >= 0 && n <= last ? n : null;
}

/** OPS-04: format name of a room backup (docs/architecture/team/TEAM_BACKUP.md). */
export const BACKUP_FORMAT = 'bauplaner-team-room-backup';
const joinChunks = chunks => { const total = chunks.reduce((n, c) => n + c.byteLength, 0), out = new Uint8Array(total); let o = 0; for (const c of chunks) { out.set(new Uint8Array(c), o); o += c.byteLength; } return out; };
const chunked = bytes => { const out = []; for (let i = 0; i < bytes.byteLength; i += LIMITS.planChunk) out.push(bytes.slice(i, i + LIMITS.planChunk)); return out.length ? out : [new Uint8Array(0)]; };

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
  constructor() { this.meta = new Map(); this.rows = []; this.byId = new Map(); this.batches = new Map(); this.plans = new Map(); this.subjects = new Map(); }
  /** All or nothing, like transactionSync of the Durable Object: a failure in the middle leaves no half batch. */
  transaction(fn) {
    const rows = this.rows.length, subjects = new Map(this.subjects), meta = new Map(this.meta);
    try { return fn(); } catch (e) {
      for (const r of this.rows.splice(rows)) this.byId.delete(r.id);
      this.subjects = subjects; this.meta = meta;
      throw e;
    }
  }
  getSubject(s) { return this.subjects.get(s); }
  setSubject(s, seq, by) { this.subjects.set(s, { seq, by }); }
  getMeta(k) { return this.meta.has(k) ? structuredClone(this.meta.get(k)) : undefined; }
  setMeta(k, v) { this.meta.set(k, structuredClone(v)); }
  count() { return this.rows.length; }
  eventById(id) { return this.byId.get(id); }
  /** @param seq explicit arrival number (OPS-04: after a restore numbers continue above every number handed out before) */
  appendEvent(id, json, seq = this.lastSeq() + 1) { const row = { seq, id, json }; this.rows.push(row); this.byId.set(id, row); return seq; }
  since(seq, limit) { return this.rows.filter(r => r.seq > seq).slice(0, limit); }
  lastSeq() { return this.rows.length ? this.rows[this.rows.length - 1].seq : 0; }
  getBatch(b) { return this.batches.get(b); }
  setBatch(b, answer) { this.batches.set(b, answer); if (this.batches.size > LIMITS.batchesKept) this.batches.delete(this.batches.keys().next().value); }
  putPlan(sha, chunks) { this.plans.set(sha, chunks); }
  getPlan(sha) { return this.plans.get(sha); }
  planShas() { return [...this.plans.keys()]; }
  deletePlan(sha) { this.plans.delete(sha); }
  // OPS-04 (Sicherung/Wiederherstellung, docs/architecture/team/TEAM_BACKUP.md)
  deleteMeta(k) { this.meta.delete(k); }
  metaKeys() { return [...this.meta.keys()]; }
  replaceEvents(rows) { this.rows = rows.map(([seq, id, json]) => ({ seq, id, json })); this.byId = new Map(this.rows.map(r => [r.id, r])); }
  clearSubjects() { this.subjects = new Map(); }
  clearBatches() { this.batches = new Map(); }
  wipe() { this.meta = new Map(); this.rows = []; this.byId = new Map(); this.batches = new Map(); this.plans = new Map(); this.subjects = new Map(); }
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
    const docs = {};
    for (const n of DOC_NAMES) { const d = this.store.getMeta(`doc:${n}`); if (d) docs[n] = d.rev; }
    const epoch = this.store.getMeta('epoch');
    return { protocol: PROTOCOL, version: VERSION, room: r.room, teamId: r.teamId, name: r.name, createdAt: r.createdAt, events: this.store.count(), cursor: String(this.top()), header: !!this.store.getMeta('header'), docs, guards: true, backups: true, ...(epoch && { epoch }) };
  }

  /**
   * OPS-04: the highest arrival number ever handed out. After a restore the room holds fewer events than before; new
   * events continue above every number a client may still hold as cursor (`floor`), so nobody skips an event.
   */
  top() {
    const last = this.store.lastSeq();
    if (this._floor === undefined) this._floor = Number(this.store.getMeta('floor') ?? 0);
    return Math.max(last, this._floor);
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

  /**
   * Appends a batch. Repeating the same batch id returns the first answer unchanged (a lost answer is simply asked
   * again). TEAM-02: `guards` maps event ids to the room cursor the writer had read when it made the step; such an
   * event comes back in `stale` when another author changed one of its subjects after that cursor. The whole batch
   * is one transaction: an error in the middle stores nothing, the writer repeats it.
   */
  append({ batch, events, guards }, role = 'member') {
    if (typeof batch !== 'string' || !ID.test(batch)) throw new RoomError(400, 'stapel-id', 'Stapel-ID ungültig.');
    const known = this.store.getBatch(batch);
    if (known) return { ...known, repeated: true };
    if (!Array.isArray(events) || events.length > LIMITS.batch) throw new RoomError(400, 'stapel-groesse', `Höchstens ${LIMITS.batch} Ereignisse je Stapel.`);
    if (guards !== undefined && (typeof guards !== 'object' || guards === null || Array.isArray(guards) || Object.keys(guards).length > LIMITS.batch))
      throw new RoomError(400, 'stapel-pruefung', 'Revisionsprüfung ungültig (guards: Ereignis-ID → Cursor).');
    const run = () => {
      this.ensureSubjects();
      const last = this.top();
      const answer = { cursor: '', accepted: [], known: [], rejected: [], stale: [] };
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
        const subjects = subjectsOf(e);
        const base = guards ? baseOf(guards[e.id], last) : null;
        if (base !== null) {
          const clash = subjects.map(s => ({ s, w: this.store.getSubject(s) })).find(({ w }) => w && w.seq > base && w.by !== e.by);
          if (clash) { answer.stale.push({ id: e.id, subject: clash.s, by: clash.w.by, seq: String(clash.w.seq) }); continue; }
        }
        if (this.store.count() >= LIMITS.events) { answer.rejected.push({ id: e.id, reason: `Der Raum ist voll (${LIMITS.events} Ereignisse).` }); continue; }
        const seq = this.store.appendEvent(e.id, JSON.stringify(e), this.top() + 1);
        for (const s of subjects) this.store.setSubject(s, seq, e.by);
        answer.accepted.push(e.id); added.push(e);
      }
      answer.cursor = String(this.top());
      if (!answer.stale.length) delete answer.stale;
      this.store.setBatch(batch, answer);
      return { ...answer, added };
    };
    return this.store.transaction ? this.store.transaction(run) : run();
  }

  /** Rooms from before TEAM-02 learn their subjects once from the stored events (at most 20 000 rows). */
  ensureSubjects() {
    if (this.store.getMeta('subjects') === 1) return;
    let after = 0, rows;
    do {
      rows = this.store.since(after, LIMITS.page);
      for (const r of rows) { const e = JSON.parse(r.json); for (const s of subjectsOf(e)) this.store.setSubject(s, r.seq, e.by); after = r.seq; }
    } while (rows.length === LIMITS.page);
    this.store.setMeta('subjects', 1);
  }

  /** Events after a cursor in arrival order; an unknown or future cursor answers with reset. */
  since(cursor, limit = LIMITS.page) {
    const last = this.top();
    const n = cursor === '' || cursor === undefined || cursor === null ? 0 : Number(cursor);
    const reset = !Number.isSafeInteger(n) || n < 0 || n > last;
    const from = reset ? 0 : n;
    const rows = this.store.since(from, Math.max(1, Math.min(LIMITS.page, Number(limit) || LIMITS.page)));
    const cursorOut = rows.length ? String(rows[rows.length - 1].seq) : String(from);
    return { events: rows.map(r => JSON.parse(r.json)), cursor: cursorOut, more: rows.length ? rows[rows.length - 1].seq < this.store.lastSeq() : false, ...(reset && { reset: true }) };
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

  /**
   * LINK-07: a recording made by a player's mod (loaded chunks around the player, no server involved). Any room
   * key may store one; the room keeps the newest twelve. The meta is what the planner lists, the bytes stay as sent.
   */
  async putScan(id, bytes, { file, projectId, revision, by }) {
    if (!/^[A-Za-z0-9_-]{6,64}$/.test(id)) throw new RoomError(400, 'aufnahme-id', 'Aufnahme-ID ungültig.');
    if (!bytes.byteLength || bytes.byteLength > LIMITS.scanBytes) throw new RoomError(413, 'aufnahme-groesse', 'Aufnahme fehlt oder ist größer als 8 MB.');
    const head = new Uint8Array(bytes.slice(0, 2));
    if (head[0] !== 0x1f || head[1] !== 0x8b) throw new RoomError(400, 'aufnahme-format', 'Die Aufnahme ist keine gzip-komprimierte .schem-Datei.');
    const clean = (v, n) => typeof v === 'string' && v ? v.slice(0, n) : undefined;
    const meta = { id, file: (clean(file, 120) ?? `${id}.schem`).replace(/[^A-Za-z0-9._-]+/g, '-'), bytes: bytes.byteLength, at: new Date().toISOString(),
      ...(clean(projectId, 64) && { projectId: clean(projectId, 64) }), ...(Number.isSafeInteger(Number(revision)) && revision !== undefined && revision !== null && revision !== '' && { revision: Number(revision) }),
      ...(clean(by, 64) && { by: clean(by, 64) }), sha256: await sha256(new Uint8Array(bytes)) };
    const chunks = [];
    for (let i = 0; i < bytes.byteLength; i += LIMITS.planChunk) chunks.push(bytes.slice(i, i + LIMITS.planChunk));
    this.store.putPlan(`scan:${id}`, chunks);
    const list = (this.store.getMeta('scans') ?? []).filter(s => s.id !== id).concat(meta);
    while (list.length > LIMITS.scansKept) this.store.deletePlan(`scan:${list.shift().id}`);
    this.store.setMeta('scans', list);
    return meta;
  }
  scans() { return [...(this.store.getMeta('scans') ?? [])].reverse(); }
  getScan(id) {
    if (!(this.store.getMeta('scans') ?? []).some(s => s.id === id)) throw new RoomError(404, 'aufnahme-fehlt', 'Diese Aufnahme hat der Raum nicht (mehr).');
    return this.getPlanChunks(`scan:${id}`);
  }
  getPlanChunks(key) {
    const chunks = this.store.getPlan(key);
    if (!chunks) throw new RoomError(404, 'aufnahme-fehlt', 'Diese Aufnahme hat der Raum nicht (mehr).');
    const total = chunks.reduce((n, c) => n + c.byteLength, 0), out = new Uint8Array(total);
    let o = 0; for (const c of chunks) { out.set(new Uint8Array(c), o); o += c.byteLength; }
    return out;
  }

  /**
   * WORLD-SHARE-01: stores a new version of a shared document. Planner keys (member, admin) write, the server
   * key only reads. `ifMatch` (the revision the writer built on) turns a lost race into 409, so nobody
   * overwrites a newer state unseen; without it the newest write wins.
   */
  async putDoc(name, text, { by, ifMatch } = {}, role = 'member') {
    if (!DOC_NAMES.includes(name)) throw new RoomError(404, 'dokument-name', `Unbekanntes Dokument (erlaubt: ${DOC_NAMES.join(', ')}).`);
    if (role === 'server') throw new RoomError(403, 'nur-lesen', 'Der Server liest geteilte Dokumente nur.');
    const bytes = new TextEncoder().encode(text);
    if (!bytes.byteLength || bytes.byteLength > LIMITS.docBytes) throw new RoomError(413, 'dokument-groesse', 'Dokument fehlt oder ist größer als 4 MB.');
    let body;
    try { body = JSON.parse(text); } catch { throw new RoomError(400, 'json', 'Kein gültiges JSON.'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new RoomError(400, 'dokument-form', 'Ein Dokument ist ein JSON-Objekt.');
    const old = this.store.getMeta(`doc:${name}`);
    const have = old?.rev ?? 0;
    if (ifMatch !== undefined && ifMatch !== null && ifMatch !== '' && Number(ifMatch) !== have)
      throw new RoomError(409, 'dokument-veraltet', `Inzwischen hat jemand anderes eine neuere Fassung gespeichert (Stand ${have}).`);
    const meta = { name, rev: have + 1, at: new Date().toISOString(), by: typeof by === 'string' && ID.test(by) ? by : '?', bytes: bytes.byteLength, sha256: await sha256(bytes) };
    const chunks = [];
    for (let i = 0; i < bytes.byteLength; i += LIMITS.planChunk) chunks.push(bytes.slice(i, i + LIMITS.planChunk));
    this.store.putPlan(`doc:${name}`, chunks);
    this.store.setMeta(`doc:${name}`, meta);
    return meta;
  }
  docMeta(name) {
    if (!DOC_NAMES.includes(name)) throw new RoomError(404, 'dokument-name', `Unbekanntes Dokument (erlaubt: ${DOC_NAMES.join(', ')}).`);
    return this.store.getMeta(`doc:${name}`) ?? null;
  }
  /**
   * The document as answer text `{name, rev, at, by, bytes, sha256, doc}`; with `known` equal to the stored
   * revision only `{name, rev, unchanged: true}` (cheap polling). 404 while nobody has shared it yet.
   */
  getDoc(name, known) {
    const meta = this.docMeta(name);
    if (!meta) throw new RoomError(404, 'dokument-fehlt', 'Dieses Dokument hat noch niemand im Team geteilt.');
    if (known !== undefined && known !== null && known !== '' && Number(known) === meta.rev) return JSON.stringify({ name, rev: meta.rev, unchanged: true });
    const text = new TextDecoder().decode(this.getPlanChunks(`doc:${name}`));
    return `${JSON.stringify(meta).slice(0, -1)},"doc":${text}}`;
  }
  docs() { return DOC_NAMES.map(n => this.store.getMeta(`doc:${n}`)).filter(Boolean); }

  // ------------------------------------------------------------ OPS-04: Sicherung und Wiederherstellung
  // docs/architecture/team/TEAM_BACKUP.md. The room writes a copy of itself into a separate Durable Object (the
  // vault, services/team-room/src/vault.js); scans (recordings) are left out – a game records them again in seconds.

  /** A short key of everything a backup holds; equal keys = nothing changed since that backup. */
  stateKey() {
    const r = this.store.getMeta('room'), h = this.store.getMeta('header');
    return [this.top(), this.store.count(), h?.updatedAt ?? '', (this.store.getMeta('plans') ?? []).join(','),
      DOC_NAMES.map(n => this.store.getMeta(`doc:${n}`)?.rev ?? 0).join(','), r ? `${r.member}.${r.server}.${r.admin}`.slice(0, 200) : '', this.store.getMeta('epoch') ?? ''].join('|');
  }

  /**
   * The whole room as backup: `head` (small JSON, also the listing), `events` ([seq, id, json] rows) and `blobs`
   * (plan snapshots and shared documents by SHA-256). Key hashes go along so a deleted room comes back with its links.
   */
  async snapshot(now = new Date().toISOString()) {
    const room = this.store.getMeta('room');
    if (!room) throw new RoomError(404, 'raum-fehlt', 'Diesen Team-Raum gibt es nicht (mehr).');
    const events = [];
    let after = 0, rows;
    do { rows = this.store.since(after, 5000); for (const r of rows) { events.push([r.seq, r.id, r.json]); after = r.seq; } } while (rows.length === 5000);
    const blobs = new Map();
    const plans = (this.store.getMeta('plans') ?? []).filter(sha => { const c = this.store.getPlan(sha); if (c) blobs.set(sha, joinChunks(c)); return !!c; });
    const docs = {};
    for (const n of DOC_NAMES) {
      const meta = this.store.getMeta(`doc:${n}`), c = meta && this.store.getPlan(`doc:${n}`);
      if (meta && c) { blobs.set(meta.sha256, joinChunks(c)); docs[n] = meta; }
    }
    const header = this.store.getMeta('header');
    const head = { format: BACKUP_FORMAT, version: 1, at: now, room, floor: this.top(), cursor: String(this.top()), events: events.length,
      ...(header && { header }), plans, docs, ...(this.store.getMeta('epoch') && { epoch: this.store.getMeta('epoch') }), stateKey: this.stateKey() };
    return { head, events, blobs };
  }

  /**
   * Replaces the room's content with a backup. `keepKeys` (the room still exists) keeps today's keys, so the current
   * links keep working; otherwise the keys of the backup come back. Arrival numbers stay those of the backup and new
   * events continue above everything handed out before (`floor`), so a client's cursor never skips an event. A new
   * `epoch` tells every planner to offer its own events again (they hold the steps made after the backup).
   */
  restore({ head, events, blobs }, { keepKeys = false, epoch = randomKey(9), floorBefore = 0 } = {}) {
    if (head?.format !== BACKUP_FORMAT || head.version !== 1) throw new RoomError(400, 'sicherung-format', 'Das ist keine Sicherung eines Team-Raums.');
    if (!Array.isArray(events) || events.length !== head.events) throw new RoomError(400, 'sicherung-unvollstaendig', 'Die Sicherung ist unvollständig.');
    for (const sha of [...head.plans, ...Object.values(head.docs ?? {}).map(d => d.sha256)])
      if (!blobs.has(sha)) throw new RoomError(400, 'sicherung-unvollstaendig', 'Ein Planstand oder Dokument der Sicherung fehlt.');
    const current = this.store.getMeta('room');
    const run = () => {
      const floor = Math.max(this.created ? this.top() : 0, Number(floorBefore) || 0, Number(head.floor) || 0);
      for (const sha of this.store.getMeta('plans') ?? []) this.store.deletePlan(sha);
      for (const n of DOC_NAMES) { this.store.deletePlan(`doc:${n}`); this.store.deleteMeta(`doc:${n}`); }
      this.store.replaceEvents(events);
      this.store.clearSubjects(); this.store.clearBatches(); this.store.deleteMeta('subjects');
      this.store.setMeta('room', keepKeys && current ? { ...head.room, admin: current.admin, member: current.member, server: current.server } : head.room);
      if (head.header) this.store.setMeta('header', head.header); else this.store.deleteMeta('header');
      for (const sha of head.plans) this.store.putPlan(sha, chunked(blobs.get(sha)));
      this.store.setMeta('plans', head.plans);
      for (const [n, meta] of Object.entries(head.docs ?? {})) if (DOC_NAMES.includes(n)) { this.store.putPlan(`doc:${n}`, chunked(blobs.get(meta.sha256))); this.store.setMeta(`doc:${n}`, meta); }
      this.store.setMeta('floor', floor); this._floor = floor;
      this.store.setMeta('epoch', epoch);
      this.ensureSubjects();
    };
    this._floor = undefined;
    this.store.transaction ? this.store.transaction(run) : run();
    return { epoch, events: events.length, cursor: String(this.top()) };
  }

  /**
   * New invitation key (who = 'member'), new server key (who = 'server') or new admin key (who = 'admin', BACKUP-03: after
   * a key may have leaked, e.g. in an old backup); old connections with it are closed by the caller. The vault keeps
   * the hashes of the time of each backup; a restore into an existing room never changes its keys.
   */
  async rotate(who = 'member') {
    const r = this.store.getMeta('room'), key = randomKey();
    if (who === 'server') { this.store.setMeta('room', { ...r, server: await sha256(key) }); return { serverKey: key }; }
    if (who === 'admin') { this.store.setMeta('room', { ...r, admin: await sha256(key), adminChangedAt: new Date().toISOString() }); return { adminKey: key }; }
    this.store.setMeta('room', { ...r, member: await sha256(key) });
    return { memberKey: key };
  }
}

/**
 * Server control through the room (LINK-05, docs/architecture/team/AUTO_LINK.md): the room passes a control message
 * signed in the planner on to the Paper plugin connected with the server key and the answer back. The room knows
 * no owner key and checks only the form; the plugin checks signature, sequence number and server.
 */
/** Keep-alive frames: the Durable Object answers them without waking up (setWebSocketAutoResponse). */
export const PING = '{"type":"ping"}', PONG = '{"type":"pong"}';

export const CONTROL = Object.freeze({ bytes: 1024 * 1024, timeoutMs: 20_000, pending: 16 });
export function checkControl(m) {
  const bad = why => { throw new RoomError(400, 'steuerung', `Steuernachricht ungültig: ${why}.`); };
  if (!m || typeof m !== 'object') bad('kein Objekt');
  if (typeof m.owner !== 'string' || !/^own_[A-Za-z0-9_-]{4,40}$/.test(m.owner)) bad('Geräte-ID');
  if (!Number.isSafeInteger(m.seq) || m.seq <= 0) bad('Nummer');
  if (typeof m.body !== 'string' || !m.body.length) bad('Inhalt fehlt');
  if (m.body.length > CONTROL.bytes) throw new RoomError(413, 'steuerung-groesse', 'Steuernachricht größer als 1 MB.');
  if (typeof m.sig !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(m.sig)) bad('Unterschrift');
  return { owner: m.owner, seq: m.seq, body: m.body, sig: m.sig };
}

/** Open control requests waiting for the plugin's answer (in memory: the room stays awake while a request waits). */
export class ControlRelay {
  constructor(timeoutMs = CONTROL.timeoutMs) { this.timeoutMs = timeoutMs; this.open = new Map(); this.n = 0; }
  /** Sends with `send(frame)` and resolves with the plugin's answer; 504 when it does not come in time. */
  ask(send, message) {
    if (this.open.size >= CONTROL.pending) throw new RoomError(429, 'steuerung-voll', 'Zu viele offene Steuernachrichten – kurz warten.');
    const id = `c${++this.n}_${randomKey(6)}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.open.delete(id); reject(new RoomError(504, 'server-antwortet-nicht', 'Der Server hat nicht rechtzeitig geantwortet.')); }, this.timeoutMs);
      this.open.set(id, answer => { clearTimeout(timer); resolve(answer); });
      try { send({ type: 'control', id, ...message }); } catch (e) { clearTimeout(timer); this.open.delete(id); reject(e); }
    });
  }
  /** The plugin's answer; false for unknown or late ids. */
  answer(id, answer) {
    const done = this.open.get(id);
    if (!done) return false;
    this.open.delete(id);
    done(answer && typeof answer === 'object' && !Array.isArray(answer) ? answer : { error: 'Leere Antwort vom Server.' });
    return true;
  }
}

/**
 * Presence of one connection (TEAM_LIVE.md §4): flüchtig, nie im Protokoll. With `role`, only the server key may
 * appear as „server“ (a member could otherwise pretend the Minecraft server were online), and the server key
 * always does.
 */
export function cleanPresence(p, now = new Date().toISOString(), role) {
  let where = ['planer', 'spiel', 'server'].includes(p?.where) ? p.where : 'planer';
  if (role === 'server') where = 'server';
  else if (role && where === 'server') where = 'planer';
  return { member: typeof p?.member === 'string' ? p.member.slice(0, 64) : '?', device: typeof p?.device === 'string' ? p.device.slice(0, 64) : '?', where,
    ...(typeof p?.section === 'string' && { section: p.section.slice(0, 64) }), since: typeof p?.since === 'string' ? p.since.slice(0, 40) : now,
    ...(where === 'spiel' && cleanPos(p?.pos) && { pos: cleanPos(p.pos) }),
    ...(where === 'spiel' && typeof p?.player === 'string' && /^[A-Za-z0-9_]{1,16}$/.test(p.player) && { player: p.player }) };
}

/** LINK-07: position of a player in the game for the live map ({x, y, z, dim, yaw?}); null when not usable. */
export function cleanPos(pos) {
  if (!pos || typeof pos !== 'object') return null;
  const n = v => Number.isFinite(v) && Math.abs(v) <= 30_000_000 ? Math.round(v) : null;
  const x = n(pos.x), y = n(pos.y), z = n(pos.z);
  if (x === null || y === null || z === null || Math.abs(y) > 4096) return null;
  const dim = typeof pos.dim === 'string' && /^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(pos.dim) && pos.dim.length <= 64 ? pos.dim : 'minecraft:overworld';
  return { x, y, z, dim, ...(Number.isFinite(pos.yaw) && { yaw: Math.round(((pos.yaw % 360) + 360) % 360) }), at: new Date().toISOString() };
}
