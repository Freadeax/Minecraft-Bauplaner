// Browser check of Team live (COOP-07, docs/architecture/team/TEAM_LIVE.md): the Bauleitung switches the team live,
// a helper joins by link in another browser – no file anywhere – and both see each other's steps within
// seconds; the server writes a measurement; a new plan release reaches the helper and is taken over.
// The room is the real room core (services/team-room/src/core.js) behind Playwright's network routing,
// with the same HTTP and WebSocket protocol as the Cloudflare worker. Run after `npm run build`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject } from './start.mjs';
import { RoomCore, MemoryStore, RoomError, cleanPresence, randomKey } from '../../services/team-room/src/core.js';
import { teamEvent, buildWorldShareDoc, mapShapes } from '../../dist/domain/src/index.js';
import { writeNbt } from '../../dist/formats/src/index.js';
import { gzipSync } from 'node:zlib';
import { startModSimulator } from './modSimulator.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4318, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
// TEAM_ROOM_URL=https://bauplaner-team.team-room.workers.dev runs the same check against the real deployed service.
const REAL = process.env.TEAM_ROOM_URL?.replace(/\/+$/, '');
const ROOM = REAL ?? 'https://raum.test';
let server, browser, mod;
const MOD_PORT = 47741, MOD_TOKEN = 'simteamroom0123456789abcdefghij';

before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  mod = await startModSimulator(MOD_PORT, { protocol: 2, features: ['scan', 'marks2', 'players', 'bigplans', 'team', 'pairask', 'server', 'marks3', 'room', 'roomserver', 'roomsign', 'roomsign2'] });
  mod.state.tokens.add(MOD_TOKEN);
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); await mod?.close(); server?.kill(); });

/** The worker's routes (services/team-room/src/index.js) on top of RoomCore, for Playwright routing. */
function fakeRooms() {
  const rooms = new Map(), sockets = new Set();
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type, If-Match', 'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS' };
  const broadcast = (id, msg) => { for (const s of sockets) if (s.room === id && s.authed) s.ws.send(JSON.stringify(msg)); };
  const presence = id => broadcast(id, { type: 'presence', members: [...sockets].filter(s => s.room === id && s.authed).map(s => s.presence) });
  const http = async route => {
    const req = route.request(), url = new URL(req.url()), parts = url.pathname.split('/').filter(Boolean);
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const json = (body, status = 200) => route.fulfill({ status, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const key = (req.headers().authorization ?? '').replace(/^Bearer\s+/i, '');
    try {
      if (parts.join('/') === 'v1/rooms' && req.method() === 'POST') {
        const id = `r_${randomKey(9)}`, core = new RoomCore(new MemoryStore());
        rooms.set(id, core);
        const body = req.postDataJSON();
        return json(await core.create({ room: id, teamId: body.teamId, name: body.name, founder: body.founder, leaderKey: body.leaderKey }), 201);
      }
      const core = rooms.get(parts[2]);
      if (!core) return json({ error: 'raum-fehlt', message: 'Diesen Team-Raum gibt es nicht (mehr).' }, 404);
      const rest = parts.slice(3).join('/');
      if (rest === '') { await core.auth(key); return json(core.info()); }
      // TEAM-SEC-01: own keys and the room's identity, as in the worker.
      if (rest === 'join' && req.method() === 'POST') {
        if ((await core.session(key)).role !== 'member') return json({ error: 'nur-einladung' }, 400);
        return json(await core.join(req.postDataJSON()), 201);
      }
      if (rest === 'keys' && req.method() === 'POST') return json(await core.addKey(await core.session(key), req.postDataJSON() ?? {}), 201);
      if (rest === 'keys' && req.method() === 'GET') return json({ keys: core.listKeys(await core.session(key)) });
      if (rest.startsWith('keys/') && req.method() === 'DELETE') {
        const out = core.revokeKey(await core.session(key), rest.slice(5));
        for (const s of sockets) if (s.room === parts[2] && s.session?.keyId === out.revoked) s.ws.close({ code: 4403, reason: 'schluessel-widerrufen' });
        return json(out);
      }
      if (rest === 'identity' && req.method() === 'POST') { await core.auth(key, 'admin'); return json(core.setIdentity(req.postDataJSON())); }
      if (rest === 'events' && req.method() === 'POST') {
        const { added, seqs, ...out } = core.append(req.postDataJSON(), await core.session(key));
        if (added.length) broadcast(parts[2], { type: 'events', events: added, seqs, cursor: out.cursor });
        return json(out);
      }
      if (rest === 'events') { await core.auth(key); return json(core.since(url.searchParams.get('after') ?? '')); }
      if (rest === 'header' && req.method() === 'PUT') { await core.auth(key, 'admin'); core.setHeader(req.postDataJSON()); broadcast(parts[2], { type: 'header' }); return json({ ok: true }); }
      if (rest === 'header') { await core.auth(key); return json(core.getHeader()); }
      if (rest.startsWith('plan/') && req.method() === 'PUT') { await core.auth(key, 'admin'); await core.putPlan(rest.slice(5), new Uint8Array(req.postDataBuffer())); return json({ ok: true }); }
      if (rest.startsWith('plan/')) { await core.auth(key); return route.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'application/gzip' }, body: Buffer.from(core.getPlan(rest.slice(5))) }); }
      if (rest === 'scans') { await core.auth(key); return json({ scans: core.scans() }); }
      if (rest.startsWith('scans/') && req.method() === 'PUT') {
        await core.auth(key);
        const meta = await core.putScan(rest.slice(6), new Uint8Array(req.postDataBuffer()), { file: url.searchParams.get('file'), projectId: url.searchParams.get('project'), revision: url.searchParams.get('revision'), by: url.searchParams.get('by') });
        broadcast(parts[2], { type: 'scan', scan: meta });
        return json(meta);
      }
      if (rest.startsWith('scans/')) { await core.auth(key); return route.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'application/octet-stream' }, body: Buffer.from(core.getScan(rest.slice(6))) }); }
      // WORLD-SHARE-01: shared documents (Weltplan, server web maps).
      if (rest.startsWith('doc/') && req.method() === 'PUT') {
        const role = await core.auth(key);
        const meta = await core.putDoc(rest.slice(4), req.postData(), { by: url.searchParams.get('by'), ifMatch: req.headers()['if-match'] }, role);
        broadcast(parts[2], { type: 'doc', name: meta.name, rev: meta.rev, by: meta.by });
        return json(meta);
      }
      if (rest.startsWith('doc/')) { await core.auth(key); return route.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: core.getDoc(rest.slice(4), url.searchParams.get('known')) }); }
      if (rest === 'rotate' && req.method() === 'POST') {
        await core.auth(key, 'admin');
        const who = url.searchParams.get('wer') === 'server' ? 'server' : 'member', out = await core.rotate(who);
        for (const s of sockets) if (s.room === parts[2] && s.role === who) s.ws.close({ code: 4403, reason: 'schluessel-erneuert' });
        return json(out);
      }
      return json({ error: 'nicht-gefunden' }, 404);
    } catch (e) {
      if (e instanceof RoomError) return json({ error: e.code, message: e.message }, e.status);
      throw e;
    }
  };
  const live = ws => {
    const id = new URL(ws.url()).pathname.split('/')[3], core = rooms.get(id);
    const s = { ws, room: id, authed: false, role: 'member', presence: null };
    sockets.add(s);
    ws.onMessage(async raw => {
      const msg = JSON.parse(String(raw));
      try {
        if (msg.type === 'hello') {
          s.session = await core.session(msg.key); s.role = s.session.role; s.authed = true; s.presence = cleanPresence(s.session.member ? { ...msg, member: s.session.member } : msg);
          ws.send(JSON.stringify({ type: 'welcome', ...core.info() }));
          let feed, after = msg.after ?? '';
          do { feed = core.since(after); ws.send(JSON.stringify({ type: 'events', ...feed })); after = feed.cursor; } while (feed.more);
          presence(id);
        } else if (msg.type === 'append' && s.authed) {
          const { added, seqs, ...out } = core.append(msg, s.session);
          ws.send(JSON.stringify({ type: 'appended', ...out }));
          if (added.length) broadcast(id, { type: 'events', events: added, seqs, cursor: out.cursor });
        } else if (msg.type === 'presence' && s.authed) { s.presence = cleanPresence({ ...s.presence, ...msg, member: s.presence.member, device: s.presence.device }); presence(id); }
        else if (msg.type === 'ask' && msg.what === 'scan' && s.authed) {
          let games = 0;
          for (const o of sockets) if (o !== s && o.room === id && o.authed && o.presence?.where === 'spiel') { o.ws.send(JSON.stringify({ type: 'ask', what: 'scan', from: s.presence.member, ...(msg.projectId && { projectId: msg.projectId }) })); games++; }
          ws.send(JSON.stringify({ type: 'asked', games }));
        }
      } catch (e) { ws.send(JSON.stringify({ type: 'error', error: e.code ?? 'fehler', message: e.message })); if (e.status === 401) ws.close({ code: 4401 }); }
    });
    ws.onClose(() => { sockets.delete(s); presence(id); });
  };
  /**
   * A player's game in the room (LINK-07, the mod's RoomClient): presence with position, and on „Aufnahme anfordern“
   * it records and puts the file into the room – what the real mod does with its loaded chunks.
   */
  const game = async (id, key, member, player, pos, scanBytes) => {
    const core = rooms.get(id), asks = [];
    const s = { room: id, authed: true, role: await core.auth(key), presence: cleanPresence({ member, device: 'dev_spiel0001', where: 'spiel', player, pos }), ws: { send: async raw => {
      const msg = JSON.parse(raw);
      if (msg.type !== 'ask') return;
      asks.push(msg);
      const meta = await core.putScan(`scan_${randomKey(8)}`, scanBytes, { file: 'anna-baustand.schem', projectId: msg.projectId, by: member });
      broadcast(id, { type: 'scan', scan: meta });
    }, close: () => {} } };
    sockets.add(s); presence(id);
    return { asks, leave: () => { sockets.delete(s); presence(id); } };
  };
  return { rooms, http, live, broadcast, game };
}

/** Smallest valid recording (Sponge v3, one stone block, no plan metadata). */
const tinyScan = () => new Uint8Array(gzipSync(writeNbt({ name: '', tag: { type: 'compound', value: { Schematic: { type: 'compound', value: {
  Version: { type: 'int', value: 3 }, DataVersion: { type: 'int', value: 4189 }, Width: { type: 'short', value: 1 }, Height: { type: 'short', value: 1 }, Length: { type: 'short', value: 1 },
  Blocks: { type: 'compound', value: { Palette: { type: 'compound', value: { 'minecraft:stone': { type: 'int', value: 0 } } }, Data: { type: 'byteArray', value: [0] } } },
} } } } })));

const fake = fakeRooms();
/** Room access for the assertions: the fake core, or HTTP against the real service. */
function remote(id, memberKey, serverKey) {
  if (!REAL) {
    const core = fake.rooms.get(id);
    return {
      header: async () => core.getHeader(),
      events: async () => core.since('').events,
      // who: 'member' (invitation), 'server', or a member's own key (TEAM-SEC-01).
      append: async (who, batch) => { const { added, seqs, ...out } = core.append(batch, who === 'member' || who === 'server' ? who : await core.session(who)); if (added.length) fake.broadcast(id, { type: 'events', events: added, seqs, cursor: out.cursor }); return out; },
    };
  }
  const call = async (path, key, init = {}) => (await fetch(`${REAL}/v1/rooms/${id}${path}`, { ...init, headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } })).json();
  const r = {
    memberKey,
    header: () => call('/header', r.memberKey),
    events: async () => { let all = [], cursor = '', page; do { page = await call(`/events?after=${cursor}`, r.memberKey); all = all.concat(page.events); cursor = page.cursor; } while (page.more); return all; },
    append: (who, batch) => call('/events', who === 'server' ? serverKey : who === 'member' ? r.memberKey : who, { method: 'POST', body: JSON.stringify(batch) }),
  };
  return r;
}
async function page(viewport) {
  const context = await browser.newContext({ viewport });
  if (!REAL) {
    await context.route(`${ROOM}/**`, fake.http);
    await context.routeWebSocket(/^wss:\/\/raum\.test\//, fake.live);
  }
  const p = await context.newPage();
  p.setDefaultTimeout(15_000);
  const errors = [], answers = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/clipboard|Failed to load resource/i.test(m.text())) errors.push(m.text()); });
  p.on('dialog', d => void d.accept(answers.shift() ?? ''));
  return { p, errors, answers };
}
const teamTab = p => p.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name: 'Team' }).click();
const section = (p, name) => p.getByRole('region', { name: 'Abschnitte' }).locator('.team-sections > li').filter({ has: p.locator('strong', { hasText: new RegExp(`^${name}`) }) });
const liveBlock = p => p.getByRole('region', { name: 'Team live' });

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Team live: Einladungslink statt Datei, Schritte live bei allen, Server misst, neuer Planstand (${viewport.width}px)`, async () => {
    const A = await page(viewport), B = await page(viewport);
    const a = A.p, b = B.p;

    // ---- Bauleitung: three sections, team, release, live.
    await a.goto(BASE);
    await openSampleProject(a);
    await a.waitForURL(/#\/projekt\//);
    await a.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name: 'Baustelle' }).click();
    await a.getByRole('region', { name: 'Baustelle' }).getByRole('button', { name: /Fundament · Rohbau · Dach/ }).click();
    await a.locator('.site-section').nth(2).waitFor();
    await teamTab(a);
    await a.getByPlaceholder('Dein Name').fill('Philipp');
    await a.getByRole('button', { name: 'Team gründen' }).click();
    A.answers.push('Erster Stand');
    await a.getByRole('button', { name: 'Aktuellen Plan freigeben' }).click();
    await a.getByText('Planstand 1 gilt').waitFor();
    assert.equal(await liveBlock(a).getByLabel('Adresse des Team-Raums').inputValue(), 'https://bauplaner-team.team-room.workers.dev', 'the project room is preset');
    await liveBlock(a).getByLabel('Adresse des Team-Raums').fill(ROOM);
    await liveBlock(a).getByRole('button', { name: 'Live schalten' }).click();
    await liveBlock(a).locator('[data-state=live]').waitFor();
    const link = await liveBlock(a).getByLabel('Einladungslink').inputValue();
    assert.match(link, new RegExp(`#/team/beitreten\\?raum=${encodeURIComponent(ROOM).replace(/\./g, '\\.')}&id=r_[\\w-]+&k=[\\w-]+$`));
    // LINK-11: the server link is only the emergency way (closed block); normal is the hand-over through the mod.
    await liveBlock(a).getByTestId('server-room').filter({ hasText: 'verbindet sich von selbst' }).waitFor();
    await liveBlock(a).locator('details.team-emergency > summary').click();
    await liveBlock(a).getByRole('button', { name: 'Link für den Server' }).click();
    // GAME-06: the link carries the Bauleitung's signing key (derived in the browser, a moment later).
    let serverLink = '';
    for (let i = 0; i < 40 && !/&p=/.test(serverLink); i++) { serverLink = await liveBlock(a).getByLabel('Link für den Server').inputValue(); if (!/&p=/.test(serverLink)) await a.waitForTimeout(100); }
    // TEAM-SEC-01: the server link carries only the Bauleitung's public key (p), never a key that can sign.
    assert.match(serverLink, /&s=[\w-]+&p=[\w-]{43}$/);
    const leaderKey = new URLSearchParams(serverLink.split('?')[1]).get('p');
    const q = new URLSearchParams(link.split('?')[1]), roomId = q.get('id');
    const room = remote(roomId, q.get('k'), new URLSearchParams(serverLink.split('?')[1]).get('s'));
    const header = await room.header();
    assert.ok(header.plan.sha, 'plan snapshot in the room');
    assert.equal(header.sections.length, 3, 'header carries the sections for the plugin');

    // ---- Helper: opens the link, nothing else.
    await b.goto(link);
    await b.getByRole('heading', { name: /Team „.+“ beitreten/ }).waitFor();
    await b.getByRole('button', { name: 'Beitreten und Plan laden' }).click();
    await b.waitForURL(/\/team$/);
    await b.getByText('Planstand 1 gilt').waitFor();
    await liveBlock(b).locator('[data-state=live]').waitFor();
    await b.getByPlaceholder('Ich bin neu: Name').fill('Anna');
    await b.getByRole('button', { name: 'Beitreten' }).click();
    await section(b, 'Fundament').getByRole('button', { name: 'Übernehmen' }).click();

    // ---- LINK-07: Anna connects her Minecraft with the room – the mod talks to the room itself, no server file.
    mod.state.room = null;
    await b.evaluate(([port, token]) => localStorage.setItem('bauplaner.spielverbindung', JSON.stringify({ port, token, auto: false })), [MOD_PORT, MOD_TOKEN]);
    await liveBlock(b).getByRole('button', { name: 'Mein Spiel verbinden' }).click();
    await b.getByText('Spiel mit dem Team-Raum verbunden.').first().waitFor();
    const handed = mod.state.room;
    // FALLBACK-01 status of my own game, shown next to the button.
    await liveBlock(b).getByTestId('game-room').filter({ hasText: 'Mein Spiel: live' }).waitFor();
    mod.state.room = { ...mod.state.room, mode: 'http', pendingReports: 2 };
    await liveBlock(b).getByTestId('game-room').getByRole('button', { name: 'Neu prüfen' }).click();
    await liveBlock(b).getByTestId('game-room').filter({ hasText: 'über HTTP (Ausweichweg) · 2 Meldungen warten' }).waitFor();
    mod.state.room = { ...mod.state.room, mode: 'ws', pendingReports: 0 };
    assert.equal(handed.url, ROOM); assert.equal(handed.room, roomId); assert.notEqual(handed.key, q.get('k'), 'TEAM-SEC-01: ein eigener Geräteschlüssel, nie die Einladung, der Admin- oder Serverschlüssel');
    if (!REAL) { const sb = await fake.rooms.get(roomId).session(handed.key); assert.equal(sb.role, 'person'); assert.equal(sb.member, handed.member); }
    assert.equal(handed.serverKey, undefined, 'a helper never gets the server key');
    assert.equal(handed.memberName, 'Anna'); assert.match(handed.member, /^bld_/);

    // ---- Bauleitung sees it live, without reading anything in.
    await section(a, 'Fundament').locator('.team-owner', { hasText: 'Anna' }).waitFor();
    // COOP-08: news in every tab, status chip in the head, presence with the section.
    await a.getByRole('region', { name: 'Neues im Team' }).getByText(/Anna.*Fundament/).waitFor();
    await a.locator('.project-head [data-team-live=live]').waitFor();
    await liveBlock(a).getByRole('list', { name: 'Gerade da' }).getByText(/Fundament/).waitFor();
    await a.getByRole('region', { name: 'Mitglieder' }).getByText('Anna').first().waitFor();
    await liveBlock(a).getByRole('list', { name: 'Gerade da' }).getByText('Anna').waitFor();
    if (!REAL) {
      // ---- LINK-07: Anna's game in the room – position for the others, recording by click, no server plugin.
      const anna = await fake.game(roomId, q.get('k'), handed.member, 'AnnaMC', { x: 12, y: 64, z: -3, dim: 'minecraft:overworld' }, tinyScan());
      await liveBlock(a).getByTestId('presence-pos').filter({ hasText: 'AnnaMC bei 12 64 -3' }).waitFor();
      // COOP-10: where she stands relative to the sections.
      const where = liveBlock(a).getByTestId('presence-where').filter({ hasText: /steht in „|Blöcke von „|weit weg|nicht auf der Baustelle/ });
      await where.waitFor(); console.log('# presence-where:', await where.textContent());
      await a.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name: 'Bauen' }).click();
      await a.getByTestId('room-scans').getByText('Ein Spiel im Team-Raum').waitFor();
      await a.getByRole('button', { name: '⇩ Aufnahme im Spiel anfordern' }).click();
      await a.getByRole('status').filter({ hasText: /Aufnahme aus dem Team-Raum geladen: anna-baustand\.schem/ }).waitFor();
      assert.equal(anna.asks.length, 1); assert.match(anna.asks[0].projectId, /^prj_|^[\w-]+$/);
      await a.getByLabel('Aufnahme im Team-Raum').waitFor();
      anna.leave();
      await teamTab(a);
    }
    // In another tab: the chip and the news stay.
    await a.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name: 'Baustelle' }).click();
    await a.locator('.project-head [data-team-live=live]').waitFor();
    await teamTab(a);
    await section(a, 'Dach').getByRole('button', { name: 'Übernehmen' }).click();
    await section(b, 'Dach').locator('.team-owner', { hasText: 'Philipp' }).waitFor();

    // ---- LINK-11: the Bauleitung's game also gets the server key, so the mod hands the room to the server plugin itself.
    const annaRoom = mod.state.room;
    await a.evaluate(([port, token]) => localStorage.setItem('bauplaner.spielverbindung', JSON.stringify({ port, token, auto: false })), [MOD_PORT, MOD_TOKEN]);
    await liveBlock(a).getByRole('button', { name: 'Mein Spiel verbinden' }).click();
    await a.getByText(/verbindet die Mod den Server von selbst mit dem Team-Raum/).first().waitFor();
    assert.equal(mod.state.room.serverKey, new URLSearchParams(serverLink.split('?')[1]).get('s'), 'Bauleitung: server key for the hand-over');
    assert.equal(mod.state.room.leaderKey, leaderKey, 'TEAM-SEC-01: the Bauleitung\'s game gets the public key …');
    assert.match(mod.state.room.leaderSeed, /^[\w-]{43}$/, '… and its Ed25519 seed (never the admin key)');
    assert.equal(mod.state.room.signKey, undefined, 'no HMAC key any more');
    assert.equal(handed.leaderSeed, undefined, 'a helper never gets the seed');
    assert.notEqual(mod.state.room.key, q.get('k'), 'the Bauleitung\'s game has its own device key too');
    if (!REAL) assert.equal((await fake.rooms.get(roomId).session(mod.state.room.key)).member, mod.state.room.member);
    mod.state.room = annaRoom;

    // ---- GAME-06: the Bauleitung confirmed the past by itself and sets the section protection – both signed.
    await liveBlock(a).getByLabel('Schutzstufe').selectOption('sperren');
    await liveBlock(a).getByLabel('Freie Abschnitte').selectOption('team');
    await liveBlock(b).getByTestId('protect-state').filter({ hasText: 'Eingestellt: Bauen verhindern, freie Abschnitte nur fürs Team.' }).waitFor();
    {
      // The confirmation is appended on its own after the first signed step; give it a moment to reach the room.
      let signed = [];
      for (let i = 0; i < 50; i++) {
        signed = await room.events();
        if (signed.some(e => e.kind === 'team.trust') && signed.filter(e => e.kind === 'team.protect').length >= 2) break;
        await a.waitForTimeout(200);
      }
      const trust = signed.filter(e => e.kind === 'team.trust'), protect = signed.filter(e => e.kind === 'team.protect');
      assert.equal(trust.length, 1, 'one confirmation per room');
      assert.equal(protect.length, 2);
      for (const e of [...trust, ...protect]) assert.match(e.sig ?? '', /^[\w-]{86}$/, `${e.kind} signed (Ed25519, TEAM-SEC-01)`);
      assert.ok(signed.filter(e => e.kind === 'section.claim' && e.sig === undefined).length >= 1, 'a helper\'s events stay unsigned');
      assert.equal(protect.at(-1).free, 'team');
    }

    // ---- Server measures (plugin with server key); a helper key cannot fake it.
    const logged = await room.events();
    const anna = logged.find(e => e.kind === 'member.join' && e.name === 'Anna').member;
    const fundament = logged.find(e => e.kind === 'section.claim' && e.by === anna).section;
    const now = new Date().toISOString();
    const tally = teamEvent(anna, { kind: 'build.tally', section: fundament, placed: 77, broken: 0, from: now, until: now }, now, 'server');
    assert.equal((await room.append('member', { batch: `b_fake${Date.now()}`, events: [tally] })).rejected.length, 1);
    assert.deepEqual((await room.append('server', { batch: `b_srv${Date.now()}`, events: [tally] })).accepted, [tally.id]);
    await a.getByRole('region', { name: 'Baunachweis und Lager' }).getByText('77').first().waitFor();
    await b.getByRole('region', { name: 'Baunachweis und Lager' }).getByText('77').first().waitFor();
    // ---- Client first (COOP-10): a player's mod reports the build state with her own device key, unverified.
    const sighting = teamEvent(anna, { kind: 'section.seen', section: fundament, placed: 72, total: 100, missing: [{ item: 'minecraft:stone', count: 28 }] }, new Date().toISOString());
    assert.equal((await room.append('member', { batch: `b_seen_inv${Date.now()}`, events: [sighting] })).rejected.length, 1, 'TEAM-SEC-01: not in Anna\'s name with the invitation');
    assert.deepEqual((await room.append(handed.key, { batch: `b_seen${Date.now()}`, events: [sighting] })).accepted, [sighting.id]);
    await a.getByRole('region', { name: 'Baunachweis und Lager' }).locator('[data-seen]', { hasText: 'laut Spiel 72 %' }).waitFor();
    await b.getByRole('region', { name: 'Baunachweis und Lager' }).locator('[data-seen]', { hasText: 'ungeprüft' }).waitFor();

    // ---- New release: goes into the room by itself, the helper takes it over with one click.
    A.answers.push('Zweiter Stand');
    await a.getByRole('button', { name: 'Aktuellen Plan freigeben' }).click();
    await a.getByText('Planstand 2 gilt').waitFor();
    await b.getByText('Planstand 2 gilt').waitFor();
    const take = liveBlock(b).getByRole('button', { name: 'Planstand übernehmen' });
    await take.waitFor();
    await take.click();
    await b.getByText(/Planstand 2 aus dem Team-Raum übernommen/).waitFor();
    await liveBlock(b).getByRole('button', { name: 'Planstand übernehmen' }).waitFor({ state: 'detached' });
    await section(b, 'Dach').locator('.team-owner', { hasText: 'Philipp' }).waitFor();

    // ---- COOP-08: the Bauleitung renews the invitation – the old link lets nobody new in. TEAM-SEC-01: Anna has her own
    // key and stays; the Bauleitung locks her out by revoking her keys, the new link lets her back in.
    await liveBlock(a).getByRole('button', { name: 'Einladung erneuern' }).click();
    const fresh = await liveBlock(a).getByLabel('Einladungslink').inputValue();
    assert.notEqual(fresh, link);
    await b.waitForTimeout(1000);
    assert.equal(await liveBlock(b).locator('[data-state=live]').count(), 1, 'Anna stays with her own key');
    const revoked = await a.evaluate(async ([base, id, member]) => {
      const live = await new Promise(res => { const r = indexedDB.open('minecraft-bauplaner'); r.onsuccess = () => { const all = r.result.transaction('projects').objectStore('projects').getAll(); all.onsuccess = () => res(all.result.map(p => p.site?.team?.live).find(l => l?.room === id)); }; });
      const auth = { Authorization: `Bearer ${live.adminKey}` };
      const keys = (await (await fetch(`${base}/v1/rooms/${id}/keys`, { headers: auth })).json()).keys.filter(k => k.member === member);
      for (const k of keys) await fetch(`${base}/v1/rooms/${id}/keys/${k.id}`, { method: 'DELETE', headers: auth });
      return keys.length;
    }, [REAL ?? ROOM, roomId, handed.member]);
    assert.ok(revoked >= 1, 'Anna\'s keys revoked');
    await liveBlock(b).getByText(/kennt diesen Schlüssel nicht mehr/).waitFor();
    await b.goto(fresh);
    await b.getByRole('button', { name: 'Beitreten und Plan laden' }).click();
    await b.waitForURL(/\/team$/);
    await liveBlock(b).locator('[data-state=live]').waitFor();
    room.memberKey = new URLSearchParams(fresh.split('?')[1]).get('k');

    // ---- Survives a reload: still live, nothing waiting, same log on both sides.
    await b.reload();
    await liveBlock(b).locator('[data-state=live]').waitFor();
    await a.waitForTimeout(500);
    const total = (await room.events()).length;
    const countA = Number((await a.locator('.team-head small').first().innerText()).match(/(\d+) Ereignisse/)[1]);
    const countB = Number((await b.locator('.team-head small').first().innerText()).match(/(\d+) Ereignisse/)[1]);
    assert.equal(countA, countB, 'both browsers hold the same log');
    assert.equal(countA, total, 'room holds the same log');
    if (!REAL && viewport.width > 1000) {
      // ---- WORLD-SHARE-01: the Weltplan of the team over the room – no file, both directions, locks kept.
      await a.goto(`${BASE}#/karte`); await b.goto(`${BASE}#/karte`);
      for (const x of [a, b]) {
        await x.locator('.map-page[data-map-state=ready]').waitFor({ timeout: 20_000 });
        await x.getByRole('region', { name: 'Weltplan im Team' }).getByText(/live über den Team-Raum · Stand/).waitFor({ timeout: 30_000 });
      }
      const OW = 'minecraft:overworld';
      const markt = { kind: 'site', id: 'site_markt', name: 'Marktplatz', note: '', dimension: OW, minX: 0, minZ: 0, width: 16, length: 12, y: null, projectId: null, group: 'Dorf', locked: true };
      const core = fake.rooms.get(roomId);
      await core.putDoc('weltplan', JSON.stringify(buildWorldShareDoc([markt], { [OW]: mapShapes(null, [markt], OW) }, 'bld_lea')), { by: 'bld_lea', ifMatch: String(core.docMeta('weltplan')?.rev ?? 0) });
      for (const x of [a, b]) await x.locator('.plan-row', { hasText: 'Marktplatz' }).locator('[aria-label=gesperrt]').waitFor({ timeout: 30_000 });
      // Anna adds two points (here: from a marker file); they reach Philipp and the room, the locked site stays.
      const panel = b.locator('.live-panel');
      await panel.getByText('Server-Webkarte verknüpfen').click();
      await panel.getByText('Erweitert: Vorlage, Kartennamen, Einbetten, Export').click();
      await panel.getByText('Notfall ohne Team-Raum oder Plugin: Dateien').click();
      const markers = { schemaVersion: 1, format: 'bauplaner-world-markers', coordinateSystem: 'minecraft-blocks', markers: [
        { id: 'a', label: 'Brunnen', position: { x: 4, y: 64, z: 4, world: 'world', dimension: OW } },
        { id: 'b', label: 'Mine', position: { x: -30, y: 12, z: 50, world: 'world', dimension: OW } }] };
      await b.locator('.live-fallback').getByLabel('Markerdatei als Punkte laden').setInputFiles({ name: 'm.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(markers)) });
      await a.locator('.plan-row', { hasText: 'Brunnen' }).waitFor({ timeout: 30_000 });
      await a.locator('.plan-row', { hasText: 'Mine' }).waitFor();
      await a.locator('.plan-row', { hasText: 'Marktplatz' }).waitFor();
      const shared = JSON.parse(core.getDoc('weltplan')).doc;
      assert.deepEqual(shared.items.map(i => i.name).sort(), ['Brunnen', 'Marktplatz', 'Mine']);
      assert.ok(shared.shapes[OW].some(x => x.group === 'punkte' && x.label === 'Brunnen'), 'markers for the server plugin come along');
      assert.equal(shared.items.find(i => i.id === 'site_markt').locked, true, 'lock kept');
    }
    assert.deepEqual(A.errors, []); assert.deepEqual(B.errors, []);
  });
}
