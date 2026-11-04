// Browser check of Team live (COOP-07, docs/architecture/TEAM_LIVE.md): the Bauleitung switches the team live,
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
import { teamEvent } from '../../dist/domain/src/index.js';
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
  mod = await startModSimulator(MOD_PORT, { protocol: 2, features: ['scan', 'marks2', 'players', 'bigplans', 'team', 'pairask', 'server', 'marks3', 'room'] });
  mod.state.tokens.add(MOD_TOKEN);
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); await mod?.close(); server?.kill(); });

/** The worker's routes (services/team-room/src/index.js) on top of RoomCore, for Playwright routing. */
function fakeRooms() {
  const rooms = new Map(), sockets = new Set();
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS' };
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
        return json(await core.create({ room: id, teamId: body.teamId, name: body.name }), 201);
      }
      const core = rooms.get(parts[2]);
      if (!core) return json({ error: 'raum-fehlt', message: 'Diesen Team-Raum gibt es nicht (mehr).' }, 404);
      const rest = parts.slice(3).join('/');
      if (rest === '') { await core.auth(key); return json(core.info()); }
      if (rest === 'events' && req.method() === 'POST') {
        const role = await core.auth(key);
        const { added, ...out } = core.append(req.postDataJSON(), role);
        if (added.length) broadcast(parts[2], { type: 'events', events: added, cursor: out.cursor });
        return json(out);
      }
      if (rest === 'events') { await core.auth(key); return json(core.since(url.searchParams.get('after') ?? '')); }
      if (rest === 'header' && req.method() === 'PUT') { await core.auth(key, 'admin'); core.setHeader(req.postDataJSON()); broadcast(parts[2], { type: 'header' }); return json({ ok: true }); }
      if (rest === 'header') { await core.auth(key); return json(core.getHeader()); }
      if (rest.startsWith('plan/') && req.method() === 'PUT') { await core.auth(key, 'admin'); await core.putPlan(rest.slice(5), new Uint8Array(req.postDataBuffer())); return json({ ok: true }); }
      if (rest.startsWith('plan/')) { await core.auth(key); return route.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'application/gzip' }, body: Buffer.from(core.getPlan(rest.slice(5))) }); }
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
          s.role = await core.auth(msg.key); s.authed = true; s.presence = cleanPresence(msg);
          ws.send(JSON.stringify({ type: 'welcome', ...core.info() }));
          let feed, after = msg.after ?? '';
          do { feed = core.since(after); ws.send(JSON.stringify({ type: 'events', ...feed })); after = feed.cursor; } while (feed.more);
          presence(id);
        } else if (msg.type === 'append' && s.authed) {
          const { added, ...out } = core.append(msg, s.role);
          ws.send(JSON.stringify({ type: 'appended', ...out }));
          if (added.length) broadcast(id, { type: 'events', events: added, cursor: out.cursor });
        } else if (msg.type === 'presence' && s.authed) { s.presence = cleanPresence({ ...s.presence, ...msg, member: s.presence.member, device: s.presence.device }); presence(id); }
      } catch (e) { ws.send(JSON.stringify({ type: 'error', error: e.code ?? 'fehler', message: e.message })); if (e.status === 401) ws.close({ code: 4401 }); }
    });
    ws.onClose(() => { sockets.delete(s); presence(id); });
  };
  return { rooms, http, live, broadcast };
}

const fake = fakeRooms();
/** Room access for the assertions: the fake core, or HTTP against the real service. */
function remote(id, memberKey, serverKey) {
  if (!REAL) {
    const core = fake.rooms.get(id);
    return {
      header: async () => core.getHeader(),
      events: async () => core.since('').events,
      append: async (role, batch) => { const { added, ...out } = core.append(batch, role); if (added.length) fake.broadcast(id, { type: 'events', events: added, cursor: out.cursor }); return out; },
    };
  }
  const call = async (path, key, init = {}) => (await fetch(`${REAL}/v1/rooms/${id}${path}`, { ...init, headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } })).json();
  const r = {
    memberKey,
    header: () => call('/header', r.memberKey),
    events: async () => { let all = [], cursor = '', page; do { page = await call(`/events?after=${cursor}`, r.memberKey); all = all.concat(page.events); cursor = page.cursor; } while (page.more); return all; },
    append: (role, batch) => call('/events', role === 'server' ? serverKey : r.memberKey, { method: 'POST', body: JSON.stringify(batch) }),
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
    await liveBlock(a).getByRole('button', { name: 'Link für den Server' }).click();
    const serverLink = await liveBlock(a).getByLabel('Link für den Server').inputValue();
    assert.match(serverLink, /&s=[\w-]+$/);
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
    assert.equal(handed.url, ROOM); assert.equal(handed.room, roomId); assert.equal(handed.key, q.get('k'), 'Mitgliedsschlüssel, nie der Admin- oder Serverschlüssel');
    assert.equal(handed.memberName, 'Anna'); assert.match(handed.member, /^bld_/);

    // ---- Bauleitung sees it live, without reading anything in.
    await section(a, 'Fundament').locator('.team-owner', { hasText: 'Anna' }).waitFor();
    // COOP-08: news in every tab, status chip in the head, presence with the section.
    await a.getByRole('region', { name: 'Neues im Team' }).getByText(/Anna.*Fundament/).waitFor();
    await a.locator('.project-head [data-team-live=live]').waitFor();
    await liveBlock(a).getByRole('list', { name: 'Gerade da' }).getByText(/Fundament/).waitFor();
    await a.getByRole('region', { name: 'Mitglieder' }).getByText('Anna').first().waitFor();
    await liveBlock(a).getByRole('list', { name: 'Gerade da' }).getByText('Anna').waitFor();
    // In another tab: the chip and the news stay.
    await a.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name: 'Baustelle' }).click();
    await a.locator('.project-head [data-team-live=live]').waitFor();
    await teamTab(a);
    await section(a, 'Dach').getByRole('button', { name: 'Übernehmen' }).click();
    await section(b, 'Dach').locator('.team-owner', { hasText: 'Philipp' }).waitFor();

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

    // ---- COOP-08: the Bauleitung renews the invitation – the old key is locked out, the new link lets Anna back in.
    await liveBlock(a).getByRole('button', { name: 'Einladung erneuern' }).click();
    const fresh = await liveBlock(a).getByLabel('Einladungslink').inputValue();
    assert.notEqual(fresh, link);
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
    assert.deepEqual(A.errors, []); assert.deepEqual(B.errors, []);
  });
}
