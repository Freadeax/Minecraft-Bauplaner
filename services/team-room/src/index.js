// Cloudflare Worker + Durable Object for the Team-Raum (COOP-07, docs/architecture/team/TEAM_LIVE.md).
// One Durable Object per room (SQLite storage), WebSocket hibernation for live pushes and presence.
// Deploy: see services/team-room/README.md (`npx wrangler deploy` with CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID).
import { DurableObject } from 'cloudflare:workers';
import { RoomCore, RoomError, ControlRelay, checkControl, cleanPresence, randomKey, sha256, LIMITS, PROTOCOL, VERSION, PING, PONG } from './core.js';
import { VaultCore, backupInto, RETENTION, REASONS, DAY_MS } from './vault.js';
// P1 Härtung 07.11.2026 (TEAM_LIVE.md §15): sizes before parsing, Herkunft, limits for creation, requests, connections.
import { ABUSE, ALLOWED_ORIGINS, Buckets, clientAddress, countCreation, originAllowed, readBytes, readJson, readText, tooMany } from './guard.js';

// bauplaner.pages.dev: zweite Adresse auf Cloudflare Pages (PERF-06, docs/architecture/betrieb/OFFLINE.md).
function cors(request, env) {
  const origin = request.headers.get('Origin') ?? '';
  const ok = !!origin && originAllowed(origin, env.ALLOWED_ORIGINS);
  return { 'Access-Control-Allow-Origin': ok ? origin : ALLOWED_ORIGINS[0], 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, If-Match', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
}
const json = (data, status, headers) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });
const bearer = request => (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');

export default {
  async fetch(request, env) {
    const h = cors(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    try {
      if (parts[0] !== 'v1') return json({ protocol: PROTOCOL, version: VERSION, hint: 'Team-Raum von LMNT — Build Studio. Siehe docs/architecture/team/TEAM_LIVE.md.' }, 200, h);
      // OPS-04: public state of the service (no room data; the planner's Zustand line and the smoke test read it).
      if (parts.length === 2 && parts[1] === 'status') return json({ ok: true, protocol: PROTOCOL, version: VERSION, at: new Date().toISOString(),
        features: ['guards', 'docs', 'scans', 'control', 'backups', 'admin-rotate'], retention: RETENTION, deployment: env.CF_VERSION_METADATA?.id ?? null }, 200, { ...h, 'Cache-Control': 'no-store' });
      if (parts.length === 2 && parts[1] === 'rooms' && request.method === 'POST') {
        // Creating is open to everyone (no account) – so it is limited per address and for the whole service.
        if (!originAllowed(request.headers.get('Origin'), env.ALLOWED_ORIGINS)) return json({ error: 'herkunft', message: 'Räume legt nur der Planer an.' }, 403, h);
        const body = await readBytes(request, ABUSE.body.create);
        const gate = await allowCreation(env, clientAddress(request));
        if (!gate.ok) return json({ error: 'zu-viele', message: 'Zu viele neue Team-Räume von diesem Anschluss – bitte später erneut versuchen.' }, 429, { ...h, 'Retry-After': String(gate.retryAfter) });
        const room = `r_${randomKey(12)}`;
        const stub = env.ROOMS.get(env.ROOMS.idFromName(room));
        return withCors(await stub.fetch(new Request(`https://room/create?room=${room}`, { method: 'POST', body, headers: { 'Content-Type': 'application/json' } })), h);
      }
      if (parts[1] === 'rooms' && parts[2] && /^r_[A-Za-z0-9_-]{6,40}$/.test(parts[2])) {
        // `create` is internal (only the creation route above, with its limits, may reach it).
        if (parts[3] === 'create') return json({ error: 'nicht-gefunden', message: 'Unbekannte Adresse.' }, 404, h);
        const stub = env.ROOMS.get(env.ROOMS.idFromName(parts[2]));
        const inner = new URL(`https://room/${parts.slice(3).join('/')}`);
        inner.search = url.search;
        const forwarded = new Request(inner, request);
        forwarded.headers.set('X-Team-Room', parts[2]);
        const response = await stub.fetch(forwarded);
        return response.webSocket ? response : withCors(response, h);
      }
      return json({ error: 'nicht-gefunden', message: 'Unbekannte Adresse.' }, 404, h);
    } catch (e) {
      if (e instanceof RoomError) return json({ error: e.code, message: e.message }, e.status, h);
      return json({ error: 'fehler', message: String(e?.message ?? e) }, 500, h);
    }
  },
};

/** Room creation through the gates: one per address and one for the whole service (RoomGate). */
async function allowCreation(env, address) {
  if (!env.GATES) return { ok: true };
  const gate = name => env.GATES.get(env.GATES.idFromName(name));
  const mine = await gate(`adresse:${address}`).count({ perHour: ABUSE.create.perHour, perDay: ABUSE.create.perDay });
  if (!mine.ok) return mine;
  return gate('alle').count({ perHour: ABUSE.create.allPerDay, perDay: ABUSE.create.allPerDay });
}

function withCors(response, h) {
  const r = new Response(response.body, response);
  for (const [k, v] of Object.entries(h)) r.headers.set(k, v);
  return r;
}

/** Durable Object storage with the MemoryStore interface (core.js). */
class SqlStore {
  constructor(sql, storage) {
    this.sql = sql; this.storage = storage;
    sql.exec(`CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS events (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS batches (b TEXT PRIMARY KEY, answer TEXT NOT NULL, seq INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS plans (sha TEXT NOT NULL, idx INTEGER NOT NULL, data BLOB NOT NULL, PRIMARY KEY (sha, idx));
      CREATE TABLE IF NOT EXISTS subjects (s TEXT PRIMARY KEY, seq INTEGER NOT NULL, by TEXT NOT NULL);`);
  }
  /** TEAM-02: a batch is stored all or nothing. */
  transaction(fn) { return this.storage?.transactionSync ? this.storage.transactionSync(fn) : fn(); }
  getSubject(s) { return this.one('SELECT seq, by FROM subjects WHERE s = ?', s); }
  setSubject(s, seq, by) { this.sql.exec('INSERT INTO subjects (s, seq, by) VALUES (?, ?, ?) ON CONFLICT(s) DO UPDATE SET seq = excluded.seq, by = excluded.by', s, seq, by); }
  one(q, ...a) { const r = this.sql.exec(q, ...a).toArray(); return r[0]; }
  getMeta(k) { const r = this.one('SELECT v FROM meta WHERE k = ?', k); return r ? JSON.parse(r.v) : undefined; }
  setMeta(k, v) { this.sql.exec('INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v', k, JSON.stringify(v)); }
  count() { return this.one('SELECT COUNT(*) AS n FROM events').n; }
  eventById(id) { return this.one('SELECT seq, id, json FROM events WHERE id = ?', id); }
  appendEvent(id, json, seq) {
    if (seq === undefined) this.sql.exec('INSERT INTO events (id, json) VALUES (?, ?)', id, json);
    else this.sql.exec('INSERT INTO events (seq, id, json) VALUES (?, ?, ?)', seq, id, json);
    return this.lastSeq();
  }
  since(seq, limit) { return this.sql.exec('SELECT seq, id, json FROM events WHERE seq > ? ORDER BY seq LIMIT ?', seq, limit).toArray(); }
  lastSeq() { return this.one('SELECT COALESCE(MAX(seq), 0) AS s FROM events').s; }
  getBatch(b) { const r = this.one('SELECT answer FROM batches WHERE b = ?', b); return r ? JSON.parse(r.answer) : undefined; }
  setBatch(b, answer) {
    const { added: _a, ...stored } = answer;
    this.sql.exec('INSERT OR REPLACE INTO batches (b, answer, seq) VALUES (?, ?, ?)', b, JSON.stringify(stored), this.lastSeq());
    this.sql.exec('DELETE FROM batches WHERE b NOT IN (SELECT b FROM batches ORDER BY seq DESC LIMIT ?)', LIMITS.batchesKept);
  }
  putPlan(sha, chunks) { this.deletePlan(sha); chunks.forEach((c, i) => this.sql.exec('INSERT INTO plans (sha, idx, data) VALUES (?, ?, ?)', sha, i, c)); }
  getPlan(sha) { const rows = this.sql.exec('SELECT data FROM plans WHERE sha = ? ORDER BY idx', sha).toArray(); return rows.length ? rows.map(r => r.data) : undefined; }
  deletePlan(sha) { this.sql.exec('DELETE FROM plans WHERE sha = ?', sha); }
  // OPS-04
  deleteMeta(k) { this.sql.exec('DELETE FROM meta WHERE k = ?', k); }
  metaKeys() { return this.sql.exec('SELECT k FROM meta').toArray().map(r => r.k); }
  replaceEvents(rows) { this.sql.exec('DELETE FROM events'); for (const [seq, id, json] of rows) this.sql.exec('INSERT INTO events (seq, id, json) VALUES (?, ?, ?)', seq, id, json); }
  clearSubjects() { this.sql.exec('DELETE FROM subjects'); }
  clearBatches() { this.sql.exec('DELETE FROM batches'); }
  /** Empties every table (room deleted); the tables stay, so the same object can be restored at once. */
  wipe() { for (const t of ['meta', 'events', 'batches', 'plans', 'subjects']) this.sql.exec(`DELETE FROM ${t}`); }
  size() { try { return this.storage?.sql?.databaseSize ?? this.sql.databaseSize; } catch { return undefined; } }
}

export class TeamRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.store = new SqlStore(ctx.storage.sql, ctx.storage);
    this.core = new RoomCore(this.store);
    this.relay = new ControlRelay();
    this.requests = new Buckets(ABUSE.requests);
    this.connects = new Buckets(ABUSE.connects);
    this.messages = new Buckets(ABUSE.messages);
    // Mod and plugin send a ping every 30 s; answering it must not wake the room from hibernation.
    try { this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(PING, PONG)); } catch { /* older runtime: webSocketMessage answers */ }
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/+/, '');
    this.roomName = request.headers.get('X-Team-Room') ?? this.roomName;
    const address = clientAddress(request);
    try {
      if (path !== 'live' && path !== 'create' && !this.requests.take(address)) throw tooMany('Zu viele Anfragen an diesen Team-Raum – kurz warten.', this.requests.retryAfter(address));
      const ops = await this.opsRoute(path, request, url);
      if (ops) return ops;
      if (path === 'create' && request.method === 'POST') {
        const body = await readJson(request, ABUSE.body.create, { empty: true }).catch(e => { if (e instanceof RoomError) throw e; return {}; });
        return json(await this.core.create({ room: url.searchParams.get('room'), teamId: body.teamId, name: body.name }), 201);
      }
      if (path === 'live') {
        if (request.headers.get('Upgrade') !== 'websocket') return json({ error: 'websocket', message: 'Nur WebSocket.' }, 426);
        this.core.info();
        // Browsers always send their Origin: only the planner's own pages may open a live connection. Mod and plugin send none.
        if (!originAllowed(request.headers.get('Origin'), this.env.ALLOWED_ORIGINS)) return json({ error: 'herkunft', message: 'Diese Seite darf sich nicht mit dem Team-Raum verbinden.' }, 403);
        const open = this.ctx.getWebSockets();
        if (open.length >= ABUSE.socketsPerRoom) return json({ error: 'raum-voll', message: `Der Team-Raum hat schon ${ABUSE.socketsPerRoom} Verbindungen.` }, 503, { 'Retry-After': '30' });
        if (open.filter(ws => ws.deserializeAttachment()?.addr === address).length >= ABUSE.socketsPerAddress || !this.connects.take(address))
          throw tooMany('Zu viele Verbindungen von diesem Anschluss – kurz warten.', 10);
        const pair = new WebSocketPair();
        // Authentication happens with the first message (browsers cannot set headers on WebSockets); without a valid
        // hello within ABUSE.helloMs the connection is closed.
        this.ctx.acceptWebSocket(pair[1]);
        pair[1].serializeAttachment({ authed: false, openedAt: Date.now(), addr: address });
        // The socket object of this request goes stale once it is answered; the sweep looks the sockets up again.
        setTimeout(() => this.sweepUnauthed(), ABUSE.helloMs + 50);
        return new Response(null, { status: 101, webSocket: pair[0] });
      }
      if (path === '' && request.method === 'GET') { await this.authed(request); return json({ ...this.core.info(), serverOnline: !!this.serverSocket() }, 200); }
      // LINK-05: a signed control message for the Paper plugin; any room key may send, the plugin decides.
      if (path === 'control' && request.method === 'POST') {
        await this.authed(request);
        const message = checkControl(await readJson(request, ABUSE.body.control));
        const ws = this.serverSocket();
        if (!ws) throw new RoomError(409, 'server-offline', 'Der Server ist gerade nicht mit dem Team-Raum verbunden (Server aus oder Raum dort nicht verbunden).');
        return json(await this.relay.ask(frame => ws.send(JSON.stringify(frame)), message), 200);
      }
      if (path === 'events' && request.method === 'POST') {
        const role = await this.authed(request);
        const body = await readJson(request, ABUSE.body.events);
        const answer = this.core.append(body, role);
        if (answer.added?.length) { this.broadcast({ type: 'events', events: answer.added, cursor: answer.cursor }); await this.changed(); }
        const { added: _a, ...out } = answer;
        return json(out, 200);
      }
      if (path === 'events' && request.method === 'GET') {
        await this.authed(request);
        return json(this.core.since(url.searchParams.get('after') ?? '', url.searchParams.get('limit')), 200);
      }
      if (path === 'header') {
        if (request.method === 'PUT') { await this.authed(request, 'admin'); this.core.setHeader(await readJson(request, ABUSE.body.header)); this.broadcast({ type: 'header' }); await this.changed(); return json({ ok: true }, 200); }
        await this.authed(request); return json(this.core.getHeader(), 200);
      }
      if (path.startsWith('plan/')) {
        const sha = path.slice(5);
        if (request.method === 'PUT') { await this.authed(request, 'admin'); await this.core.putPlan(sha, await readBytes(request, ABUSE.body.plan)); this.broadcast({ type: 'plan', sha }); await this.changed(); return json({ ok: true }, 200); }
        await this.authed(request);
        return new Response(this.core.getPlan(sha), { status: 200, headers: { 'Content-Type': 'application/gzip' } });
      }
      // LINK-07: recordings from the players' mods (no server file needed).
      if (path === 'scans' && request.method === 'GET') { await this.authed(request); return json({ scans: this.core.scans() }, 200); }
      if (path.startsWith('scans/')) {
        const id = path.slice(6);
        if (request.method === 'PUT') {
          await this.authed(request);
          const meta = await this.core.putScan(id, (await readBytes(request, ABUSE.body.scan)).buffer, { file: url.searchParams.get('file'), projectId: url.searchParams.get('project'), revision: url.searchParams.get('revision'), by: url.searchParams.get('by') });
          this.broadcast({ type: 'scan', scan: meta });
          return json(meta, 200);
        }
        await this.authed(request);
        return new Response(this.core.getScan(id), { status: 200, headers: { 'Content-Type': 'application/octet-stream' } });
      }
      // WORLD-SHARE-01: shared documents (Weltplan with markers, list of server web maps).
      if (path === 'docs' && request.method === 'GET') { await this.authed(request); return json({ docs: this.core.docs() }, 200); }
      if (path.startsWith('doc/')) {
        const name = path.slice(4);
        if (request.method === 'PUT') {
          const role = await this.authed(request);
          const meta = await this.core.putDoc(name, await readText(request, ABUSE.body.doc), { by: url.searchParams.get('by'), ifMatch: request.headers.get('If-Match')?.replace(/"/g, '') }, role);
          this.broadcast({ type: 'doc', name, rev: meta.rev, by: meta.by, at: meta.at });
          await this.changed();
          return json(meta, 200);
        }
        await this.authed(request);
        return new Response(this.core.getDoc(name, url.searchParams.get('known')), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
      }
      if (path === 'rotate' && request.method === 'POST') {
        await this.authed(request, 'admin');
        const wer = url.searchParams.get('wer'), who = wer === 'server' || wer === 'admin' ? wer : 'member';
        const r = await this.core.rotate(who); this.closeRole(who); await this.changed(); return json(r, 200);
      }
      return json({ error: 'nicht-gefunden', message: 'Unbekannte Adresse.' }, 404);
    } catch (e) {
      if (e instanceof RoomError) return json({ error: e.code, message: e.message }, e.status, e.retryAfter ? { 'Retry-After': String(e.retryAfter) } : undefined);
      if (e instanceof SyntaxError) return json({ error: 'json', message: 'Kein gültiges JSON.' }, 400);
      throw e;
    }
  }

  /**
   * Checks the key of a request; only then the use counts as activity that pushes the deletion of an unused room
   * back (P1 Härtung: anonymous requests – wrong key, no key – never keep a room alive).
   */
  async authed(request, need) {
    const role = await this.core.auth(bearer(request), need);
    await this.activity();
    return role;
  }

  // ------------------------------------------------------------ OPS-04: Sicherung, Wiederherstellung, Aufbewahrung
  // docs/architecture/team/TEAM_BACKUP.md. Backups go into the room's vault (Durable Object RoomVault, own storage).

  vault(name = this.store.getMeta('room')?.room ?? this.roomName) {
    if (!name) throw new RoomError(404, 'raum-fehlt', 'Diesen Team-Raum gibt es nicht (mehr).');
    return this.env.VAULTS.get(this.env.VAULTS.idFromName(name));
  }
  ops() { return this.store.getMeta('ops') ?? {}; }
  setOps(patch) { this.store.setMeta('ops', { ...this.ops(), ...patch }); }
  idleUntil() { const o = this.ops(); return (Date.parse(o.lastActivity ?? this.store.getMeta('room')?.createdAt ?? '') || Date.now()) + RETENTION.idleDays * DAY_MS; }

  /** Something worth a backup changed: an automatic backup follows after a quiet quarter hour, at most once an hour. */
  async changed() {
    // BACKUP_DELAY_MS / BACKUP_EVERY_MS only for local probes (`wrangler dev --var BACKUP_DELAY_MS:2000`); never set in production.
    const delay = Number(this.env.BACKUP_DELAY_MS) || RETENTION.autoDelayMs, every = Number(this.env.BACKUP_EVERY_MS) || RETENTION.autoEveryMs;
    const at = Math.max(Date.now() + delay, (Date.parse(this.ops().lastBackupAt ?? '') || 0) + every);
    const cur = await this.ctx.storage.getAlarm();
    if (cur === null || cur > at) await this.ctx.storage.setAlarm(at);
  }
  /** Someone used the room today (written once a day): pushes the deletion of unused rooms back. */
  async activity() {
    const now = new Date().toISOString();
    if (this.ops().activeDay === now.slice(0, 10)) return;
    this.setOps({ activeDay: now.slice(0, 10), lastActivity: now });
    if (await this.ctx.storage.getAlarm() === null) await this.ctx.storage.setAlarm(this.idleUntil());
  }
  async backup(reason) {
    const snap = await this.core.snapshot();
    const meta = await backupInto(this.vault(), snap, reason);
    this.setOps({ lastBackupAt: meta.at, backupKey: snap.head.stateKey, lastBackup: meta, error: null });
    return meta;
  }
  async alarm() {
    if (!this.core.created) return;
    if (this.core.stateKey() !== this.ops().backupKey) {
      try { await this.backup('auto'); } catch (e) {
        this.setOps({ error: { at: new Date().toISOString(), message: String(e?.message ?? e).slice(0, 300) } });
        await this.ctx.storage.setAlarm(Date.now() + (Number(this.env.BACKUP_EVERY_MS) || RETENTION.autoEveryMs));
        return;
      }
    }
    if (Date.now() >= this.idleUntil()) { await this.deleteRoom('inaktiv'); return; }
    await this.ctx.storage.setAlarm(this.idleUntil());
  }
  /** Last backup, then the room is emptied; the vault keeps the backups RETENTION.deletedKeepDays for a restore. */
  async deleteRoom(reason) {
    const meta = await this.backup(reason);
    const purgeAt = await this.vault().markDeleted();
    for (const ws of this.ctx.getWebSockets()) { try { ws.close(4404, 'raum-geloescht'); } catch { /* closed */ } }
    this.store.wipe();
    this.core._floor = undefined;
    await this.ctx.storage.deleteAlarm();
    return { deleted: true, backup: meta.id, restorableUntil: new Date(purgeAt).toISOString() };
  }
  /** Admin of the room – or, when the room is gone, the admin key of its newest backup. */
  async authAdmin(request) {
    const key = bearer(request);
    if (this.core.created) { await this.core.auth(key, 'admin'); await this.activity(); return true; }
    const hash = this.roomName ? await this.vault().adminHash() : undefined;
    if (!hash) throw new RoomError(404, 'raum-fehlt', 'Diesen Team-Raum gibt es nicht (mehr), und es gibt keine Sicherung von ihm.');
    if (!key || await sha256(key) !== hash) throw new RoomError(401, 'schluessel-falsch', 'Der Verwaltungsschlüssel passt nicht.');
    return false;
  }

  /** Routes of OPS-04; null for every other path. */
  async opsRoute(path, request, url) {
    if (path === 'status' && request.method === 'GET') {
      const exists = await this.authAdmin(request);
      const backups = await this.vault().list();
      if (!exists) { const deletedAt = await this.vault().deletedAt(); return json({ deleted: true, deletedAt, restorableUntil: deletedAt ? new Date(Date.parse(deletedAt) + RETENTION.deletedKeepDays * DAY_MS).toISOString() : null, backups: backups.length, lastBackup: backups[0] ?? null }, 200); }
      const o = this.ops(), alarm = await this.ctx.storage.getAlarm();
      return json({ ...this.core.info(), serverOnline: !!this.serverSocket(), connections: this.ctx.getWebSockets().filter(ws => ws.deserializeAttachment()?.authed).length,
        lastActivity: o.lastActivity ?? null, lastBackup: o.lastBackup ?? backups[0] ?? null, backups: backups.length, unsaved: this.core.stateKey() !== o.backupKey,
        nextAlarm: alarm ? new Date(alarm).toISOString() : null, deleteAfter: new Date(this.idleUntil()).toISOString(), error: o.error ?? null,
        limits: { events: LIMITS.events }, bytes: this.store.size() ?? null, retention: RETENTION }, 200);
    }
    if (path === 'backups' && request.method === 'GET') { await this.authAdmin(request); return json({ backups: await this.vault().list(), reasons: REASONS }, 200); }
    if (path === 'backups' && request.method === 'POST') {
      await this.authed(request, 'admin');
      const last = Date.parse(this.ops().lastBackupAt ?? '') || 0;
      if (Date.now() - last < RETENTION.manualEveryMs) throw new RoomError(429, 'sicherung-zu-oft', 'Gerade eben gesichert – bitte eine Minute warten.');
      return json(await this.backup('manuell'), 201);
    }
    if (path === 'restore' && request.method === 'POST') {
      const exists = await this.authAdmin(request);
      const body = await readJson(request, ABUSE.body.small);
      if (typeof body?.backup !== 'string' || !/^bk_[A-Za-z0-9_-]{4,40}$/.test(body.backup)) throw new RoomError(400, 'sicherung-id', 'Welche Sicherung? (backup fehlt)');
      const vault = this.vault();
      const before = exists ? await this.backup('vor-wiederherstellung') : null;
      const { head, events } = await vault.getData(body.backup);
      const blobs = new Map();
      for (const sha of [...head.plans, ...Object.values(head.docs ?? {}).map(d => d.sha256)]) blobs.set(sha, await vault.getBlob(sha));
      // A room lost without its last backup may have handed out up to LIMITS.events more numbers than any backup knew.
      const floorBefore = (await vault.floor()) + (exists || await vault.deletedAt() ? 0 : LIMITS.events);
      const r = this.core.restore({ head, events, blobs }, { keepKeys: exists, floorBefore });
      await vault.markRestored();
      this.setOps({ backupKey: '', restoredAt: new Date().toISOString(), restoredFrom: body.backup });
      await this.activity(); await this.changed();
      for (const ws of this.ctx.getWebSockets()) { try { ws.close(4012, 'wiederhergestellt'); } catch { /* closed */ } }
      return json({ ok: true, ...r, from: body.backup, keys: exists ? 'unveraendert' : 'aus-sicherung', ...(before && { before: before.id }) }, 200);
    }
    if (path === '' && request.method === 'DELETE') {
      await this.authed(request, 'admin');
      if (url.searchParams.get('bestaetigen') !== this.store.getMeta('room').room) throw new RoomError(400, 'bestaetigen', 'Zum Löschen die Raum-ID als ?bestaetigen= mitschicken.');
      return json(await this.deleteRoom('loeschen'), 200);
    }
    return null;
  }

  async webSocketMessage(ws, raw) {
    const att = ws.deserializeAttachment() ?? {};
    // P1 Härtung: size, login time and pace are checked before a message is even parsed.
    const size = typeof raw === 'string' ? raw.length : raw.byteLength;
    if (size > ABUSE.messageBytes) { ws.send(JSON.stringify({ type: 'error', error: 'zu-gross', message: 'Nachricht größer als 1 MB.' })); return ws.close(4413, 'zu-gross'); }
    if (!att.authed) {
      if (att.openedAt && Date.now() - att.openedAt > ABUSE.helloMs) return ws.close(4408, 'anmeldung-fehlt');
      const tries = (att.tries ?? 0) + 1;
      if (tries > ABUSE.preAuthMessages) return ws.close(4401, 'schluessel-fehlt');
      ws.serializeAttachment({ ...att, tries });
    } else if (!this.messages.take(ws)) {
      return ws.send(JSON.stringify({ type: 'error', error: 'zu-schnell', message: 'Zu viele Nachrichten – kurz warten.' }));
    }
    let msg;
    try { msg = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw)); } catch { return ws.send(JSON.stringify({ type: 'error', error: 'json' })); }
    try {
      if (msg.type === 'hello') {
        const role = await this.core.auth(msg.key);
        const presence = cleanPresence(msg, undefined, role);
        ws.serializeAttachment({ authed: true, role, presence, ...(att.addr && { addr: att.addr }) });
        await this.activity();
        ws.send(JSON.stringify({ type: 'welcome', ...this.core.info() }));
        let feed;
        let after = msg.after ?? '';
        do { feed = this.core.since(after); ws.send(JSON.stringify({ type: 'events', ...feed })); after = feed.cursor; } while (feed.more);
        this.sendPresence();
        return;
      }
      if (!att.authed) return ws.send(JSON.stringify({ type: 'error', error: 'schluessel-fehlt', message: 'Zuerst hello mit Schlüssel senden.' }));
      if (msg.type === 'append') {
        const answer = this.core.append(msg, att.role);
        const { added, ...out } = answer;
        ws.send(JSON.stringify({ type: 'appended', batch: msg.batch, ...out }));
        if (added?.length) { this.broadcast({ type: 'events', events: added, cursor: answer.cursor }); await this.changed(); }
        return;
      }
      if (msg.type === 'presence') { ws.serializeAttachment({ ...att, presence: cleanPresence({ ...att.presence, ...msg, member: att.presence.member, device: att.presence.device, since: att.presence.since }, undefined, att.role) }); this.sendPresence(); return; }
      if (msg.type === 'ping') return ws.send(PONG); // only when the runtime has no auto response
      // LINK-07: the planner asks the games for a fresh recording of a project; only passed on, never stored.
      if (msg.type === 'ask' && msg.what === 'scan') {
        const out = JSON.stringify({ type: 'ask', what: 'scan', from: att.presence?.member ?? '?', ...(typeof msg.projectId === 'string' && { projectId: msg.projectId.slice(0, 64) }), ...(typeof msg.id === 'string' && { id: msg.id.slice(0, 64) }) });
        // One ask per socket every 10 s: each ask makes the games read their chunks.
        const now = Date.now();
        if (now - (att.askedAt ?? 0) < 10_000) return ws.send(JSON.stringify({ type: 'asked', games: 0, error: 'zu-oft', message: 'Bitte 10 Sekunden zwischen zwei Anforderungen warten.' }));
        ws.serializeAttachment({ ...att, askedAt: now });
        let games = 0;
        for (const other of this.ctx.getWebSockets()) { const a = other.deserializeAttachment(); if (other !== ws && a?.authed && a.presence?.where === 'spiel') { try { other.send(out); games++; } catch { /* closed */ } } }
        ws.send(JSON.stringify({ type: 'asked', games }));
        return;
      }
      if (msg.type === 'control.answer' && att.role === 'server') { this.relay.answer(String(msg.id ?? ''), msg.answer); return; }
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', error: e.code ?? 'fehler', message: e.message }));
      if (e instanceof RoomError && (e.status === 401 || e.status === 404)) ws.close(4401, e.code);
    }
  }

  /**
   * A connection ended. The closing socket can still be listed by getWebSockets() here, so it is left out of the
   * presence explicitly; closing it from this side completes the close handshake (otherwise the other side sees 1006).
   */
  webSocketClose(ws, code) {
    try { ws.close(code >= 1000 && code < 5000 && code !== 1005 && code !== 1006 && code !== 1015 ? code : 1000, 'tschüss'); } catch { /* already closed */ }
    this.sendPresence(ws);
  }
  webSocketError(ws) { this.sendPresence(ws); }

  /** Closes every connection that has not said hello with a valid key within ABUSE.helloMs (P1 Härtung). */
  sweepUnauthed(now = Date.now()) {
    for (const ws of this.ctx.getWebSockets()) {
      const a = ws.deserializeAttachment();
      if (a && !a.authed && now - (a.openedAt ?? 0) >= ABUSE.helloMs) { try { ws.send(JSON.stringify({ type: 'error', error: 'anmeldung-fehlt', message: 'Ohne Anmeldung (hello mit Schlüssel) wird die Verbindung geschlossen.' })); ws.close(4408, 'anmeldung-fehlt'); } catch { /* closed */ } }
    }
  }

  /** The newest live connection of the Paper plugin (server key), or null. */
  serverSocket() {
    const all = this.ctx.getWebSockets().filter(ws => { const a = ws.deserializeAttachment(); return a?.authed && a.role === 'server'; });
    return all.length ? all[all.length - 1] : null;
  }

  broadcast(msg, except) {
    const text = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) if (ws !== except && ws.deserializeAttachment()?.authed) { try { ws.send(text); } catch { /* closed */ } }
  }
  /** @param gone a socket that is closing and must not count as present */
  sendPresence(gone) {
    const list = this.ctx.getWebSockets().filter(ws => ws !== gone).map(ws => ws.deserializeAttachment()).filter(a => a?.authed && a.presence).map(a => a.presence);
    this.broadcast({ type: 'presence', members: list }, gone);
  }
  closeRole(role) {
    for (const ws of this.ctx.getWebSockets()) if (ws.deserializeAttachment()?.role === role) ws.close(4403, 'schluessel-erneuert');
  }
}

/**
 * P1 Härtung (07.11.2026): counts room creations of one address (or of the whole service, name `alle`) in fixed
 * hour and day windows. Only the stateless Worker calls it (RPC); there is no public route into a gate.
 */
export class RoomGate extends DurableObject {
  async count(limits) {
    const now = Date.now();
    const r = countCreation(await this.ctx.storage.get('w'), now, limits);
    await this.ctx.storage.put('w', r.state);
    // Forget the address a day after its last creation.
    await this.ctx.storage.setAlarm(now + 2 * 86_400_000);
    return { ok: r.ok, ...(r.retryAfter && { retryAfter: r.retryAfter }) };
  }
  async alarm() { await this.ctx.storage.deleteAll(); }
}

/**
 * OPS-04: the vault of one room (docs/architecture/team/TEAM_BACKUP.md) – own Durable Object, own SQLite storage.
 * Only the room's Durable Object talks to it (RPC); there is no public route into a vault.
 */
export class RoomVault extends DurableObject {
  constructor(ctx, env) { super(ctx, env); this.core = new VaultCore(new SqlStore(ctx.storage.sql, ctx.storage)); }
  list() { return this.core.list(); }
  missing(shas) { return this.core.missing(shas); }
  putBlob(sha, bytes) { return this.core.putBlob(sha, new Uint8Array(bytes)); }
  put(args) { return this.core.put({ ...args, data: new Uint8Array(args.data) }); }
  async getData(id) { const { head, events } = await this.core.get(id, { withBlobs: false }); return { head, events }; }
  getBlob(sha) { return this.core.getBlob(sha); }
  adminHash() { return this.core.adminHash(); }
  floor() { return this.core.floor(); }
  deletedAt() { return this.core.deletedAt() ?? null; }
  async markDeleted() { const purgeAt = this.core.markDeleted(); await this.ctx.storage.setAlarm(purgeAt); return purgeAt; }
  async markRestored() { this.core.markRestored(); await this.ctx.storage.deleteAlarm(); }
  async alarm() { if (this.core.expired()) this.core.wipe(); }
}
