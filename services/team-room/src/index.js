// Cloudflare Worker + Durable Object for the Team-Raum (COOP-07, docs/architecture/TEAM_LIVE.md).
// One Durable Object per room (SQLite storage), WebSocket hibernation for live pushes and presence.
// Deploy: see services/team-room/README.md (Philipp's Cloudflare account; Claude does not deploy).
import { DurableObject } from 'cloudflare:workers';
import { RoomCore, RoomError, ControlRelay, checkControl, cleanPresence, randomKey, LIMITS, PROTOCOL, VERSION } from './core.js';

const ALLOWED_ORIGINS = ['https://freadeax.github.io', 'http://127.0.0.1', 'http://localhost'];

function cors(request, env) {
  const origin = request.headers.get('Origin') ?? '';
  const extra = (env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const ok = [...ALLOWED_ORIGINS, ...extra].some(o => origin === o || origin.startsWith(`${o}:`));
  return { 'Access-Control-Allow-Origin': ok ? origin : ALLOWED_ORIGINS[0], 'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
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
      if (parts[0] !== 'v1') return json({ protocol: PROTOCOL, version: VERSION, hint: 'Team-Raum des Minecraft-Bauplaners. Siehe docs/architecture/TEAM_LIVE.md.' }, 200, h);
      if (parts.length === 2 && parts[1] === 'rooms' && request.method === 'POST') {
        const room = `r_${randomKey(12)}`;
        const stub = env.ROOMS.get(env.ROOMS.idFromName(room));
        return withCors(await stub.fetch(new Request(`https://room/create?room=${room}`, { method: 'POST', body: request.body, headers: request.headers })), h);
      }
      if (parts[1] === 'rooms' && parts[2] && /^r_[A-Za-z0-9_-]{6,40}$/.test(parts[2])) {
        const stub = env.ROOMS.get(env.ROOMS.idFromName(parts[2]));
        const inner = new URL(`https://room/${parts.slice(3).join('/')}`);
        inner.search = url.search;
        const response = await stub.fetch(new Request(inner, request));
        return response.webSocket ? response : withCors(response, h);
      }
      return json({ error: 'nicht-gefunden', message: 'Unbekannte Adresse.' }, 404, h);
    } catch (e) {
      return json({ error: 'fehler', message: String(e?.message ?? e) }, 500, h);
    }
  },
};

function withCors(response, h) {
  const r = new Response(response.body, response);
  for (const [k, v] of Object.entries(h)) r.headers.set(k, v);
  return r;
}

/** Durable Object storage with the MemoryStore interface (core.js). */
class SqlStore {
  constructor(sql) {
    this.sql = sql;
    sql.exec(`CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS events (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS batches (b TEXT PRIMARY KEY, answer TEXT NOT NULL, seq INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS plans (sha TEXT NOT NULL, idx INTEGER NOT NULL, data BLOB NOT NULL, PRIMARY KEY (sha, idx));`);
  }
  one(q, ...a) { const r = this.sql.exec(q, ...a).toArray(); return r[0]; }
  getMeta(k) { const r = this.one('SELECT v FROM meta WHERE k = ?', k); return r ? JSON.parse(r.v) : undefined; }
  setMeta(k, v) { this.sql.exec('INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v', k, JSON.stringify(v)); }
  count() { return this.one('SELECT COUNT(*) AS n FROM events').n; }
  eventById(id) { return this.one('SELECT seq, id, json FROM events WHERE id = ?', id); }
  appendEvent(id, json) { this.sql.exec('INSERT INTO events (id, json) VALUES (?, ?)', id, json); return this.lastSeq(); }
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
}

export class TeamRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.core = new RoomCore(new SqlStore(ctx.storage.sql));
    this.relay = new ControlRelay();
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/+/, '');
    try {
      if (path === 'create' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        return json(await this.core.create({ room: url.searchParams.get('room'), teamId: body.teamId, name: body.name }), 201);
      }
      if (path === 'live') {
        if (request.headers.get('Upgrade') !== 'websocket') return json({ error: 'websocket', message: 'Nur WebSocket.' }, 426);
        this.core.info();
        const pair = new WebSocketPair();
        // Authentication happens with the first message (browsers cannot set headers on WebSockets).
        this.ctx.acceptWebSocket(pair[1]);
        pair[1].serializeAttachment({ authed: false });
        return new Response(null, { status: 101, webSocket: pair[0] });
      }
      if (path === '' && request.method === 'GET') { await this.core.auth(bearer(request)); return json({ ...this.core.info(), serverOnline: !!this.serverSocket() }, 200); }
      // LINK-05: a signed control message for the Paper plugin; any room key may send, the plugin decides.
      if (path === 'control' && request.method === 'POST') {
        await this.core.auth(bearer(request));
        const message = checkControl(await request.json());
        const ws = this.serverSocket();
        if (!ws) throw new RoomError(409, 'server-offline', 'Der Server ist gerade nicht mit dem Team-Raum verbunden (Server aus oder Raum dort nicht verbunden).');
        return json(await this.relay.ask(frame => ws.send(JSON.stringify(frame)), message), 200);
      }
      if (path === 'events' && request.method === 'POST') {
        const role = await this.core.auth(bearer(request));
        const body = await request.json();
        const answer = this.core.append(body, role);
        if (answer.added?.length) this.broadcast({ type: 'events', events: answer.added, cursor: answer.cursor });
        const { added: _a, ...out } = answer;
        return json(out, 200);
      }
      if (path === 'events' && request.method === 'GET') {
        await this.core.auth(bearer(request));
        return json(this.core.since(url.searchParams.get('after') ?? '', url.searchParams.get('limit')), 200);
      }
      if (path === 'header') {
        if (request.method === 'PUT') { await this.core.auth(bearer(request), 'admin'); this.core.setHeader(await request.json()); this.broadcast({ type: 'header' }); return json({ ok: true }, 200); }
        await this.core.auth(bearer(request)); return json(this.core.getHeader(), 200);
      }
      if (path.startsWith('plan/')) {
        const sha = path.slice(5);
        if (request.method === 'PUT') { await this.core.auth(bearer(request), 'admin'); await this.core.putPlan(sha, new Uint8Array(await request.arrayBuffer())); this.broadcast({ type: 'plan', sha }); return json({ ok: true }, 200); }
        await this.core.auth(bearer(request));
        return new Response(this.core.getPlan(sha), { status: 200, headers: { 'Content-Type': 'application/gzip' } });
      }
      // LINK-07: recordings from the players' mods (no server file needed).
      if (path === 'scans' && request.method === 'GET') { await this.core.auth(bearer(request)); return json({ scans: this.core.scans() }, 200); }
      if (path.startsWith('scans/')) {
        const id = path.slice(6);
        if (request.method === 'PUT') {
          await this.core.auth(bearer(request));
          const meta = await this.core.putScan(id, await request.arrayBuffer(), { file: url.searchParams.get('file'), projectId: url.searchParams.get('project'), revision: url.searchParams.get('revision'), by: url.searchParams.get('by') });
          this.broadcast({ type: 'scan', scan: meta });
          return json(meta, 200);
        }
        await this.core.auth(bearer(request));
        return new Response(this.core.getScan(id), { status: 200, headers: { 'Content-Type': 'application/octet-stream' } });
      }
      if (path === 'rotate' && request.method === 'POST') {
        await this.core.auth(bearer(request), 'admin');
        const who = url.searchParams.get('wer') === 'server' ? 'server' : 'member';
        const r = await this.core.rotate(who); this.closeRole(who); return json(r, 200);
      }
      return json({ error: 'nicht-gefunden', message: 'Unbekannte Adresse.' }, 404);
    } catch (e) {
      if (e instanceof RoomError) return json({ error: e.code, message: e.message }, e.status);
      if (e instanceof SyntaxError) return json({ error: 'json', message: 'Kein gültiges JSON.' }, 400);
      throw e;
    }
  }

  async webSocketMessage(ws, raw) {
    let msg;
    try { msg = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw)); } catch { return ws.send(JSON.stringify({ type: 'error', error: 'json' })); }
    const att = ws.deserializeAttachment() ?? {};
    try {
      if (msg.type === 'hello') {
        const role = await this.core.auth(msg.key);
        const presence = cleanPresence(msg);
        ws.serializeAttachment({ authed: true, role, presence });
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
        ws.send(JSON.stringify({ type: 'appended', ...out }));
        if (added?.length) this.broadcast({ type: 'events', events: added, cursor: answer.cursor });
        return;
      }
      if (msg.type === 'presence') { ws.serializeAttachment({ ...att, presence: cleanPresence({ ...att.presence, ...msg, member: att.presence.member, device: att.presence.device }) }); this.sendPresence(); return; }
      if (msg.type === 'ping') return ws.send(JSON.stringify({ type: 'pong' }));
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

  webSocketClose() { this.sendPresence(); }
  webSocketError() { this.sendPresence(); }

  /** The newest live connection of the Paper plugin (server key), or null. */
  serverSocket() {
    const all = this.ctx.getWebSockets().filter(ws => { const a = ws.deserializeAttachment(); return a?.authed && a.role === 'server'; });
    return all.length ? all[all.length - 1] : null;
  }

  broadcast(msg) {
    const text = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) if (ws.deserializeAttachment()?.authed) { try { ws.send(text); } catch { /* closed */ } }
  }
  sendPresence() {
    const list = this.ctx.getWebSockets().map(ws => ws.deserializeAttachment()).filter(a => a?.authed && a.presence).map(a => a.presence);
    this.broadcast({ type: 'presence', members: list });
  }
  closeRole(role) {
    for (const ws of this.ctx.getWebSockets()) if (ws.deserializeAttachment()?.role === role) ws.close(4403, 'schluessel-erneuert');
  }
}
