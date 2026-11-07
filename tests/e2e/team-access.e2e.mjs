// Browser check of BACKUP-03 (docs/architecture/team/TEAM_ACCESS.md): a live project's project and full backups hold no
// key of the Team-Raum; the access is saved separately, sealed with a password; the Bauleitung changes the admin key
// (the old one is refused, the server gets a new signed confirmation); a browser without the access goes live again
// with the sealed file. The room is the real room core (services/team-room/src/core.js) behind Playwright's network
// routing, with the routes of the Cloudflare worker. Run after `npm run build`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject, openStorage } from './start.mjs';
import { RoomCore, MemoryStore, RoomError, cleanPresence, randomKey } from '../../services/team-room/src/core.js';
import { deriveSignKey, verifyEvent } from '../../dist/domain/src/index.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4397, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`, ROOM = 'https://zugang.test';
let server, browser;

before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.kill(); });

function fakeService() {
  const rooms = new Map(), keys = new Map(), sockets = new Set();
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type, If-Match', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' };
  const broadcast = (id, msg) => { for (const s of sockets) if (s.room === id && s.authed) s.ws.send(JSON.stringify(msg)); };
  const http = async route => {
    const req = route.request(), url = new URL(req.url()), parts = url.pathname.split('/').filter(Boolean);
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const json = (body, status = 200) => route.fulfill({ status, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const key = (req.headers().authorization ?? '').replace(/^Bearer\s+/i, '');
    try {
      if (parts.join('/') === 'v1/status') return json({ ok: true, protocol: 'team-room', version: 1, features: ['guards', 'docs', 'scans', 'control', 'backups', 'admin-rotate'] });
      if (parts.join('/') === 'v1/rooms' && req.method() === 'POST') {
        const id = `r_${randomKey(9)}`, core = new RoomCore(new MemoryStore());
        rooms.set(id, core);
        const body = req.postDataJSON(), made = await core.create({ room: id, teamId: body.teamId, name: body.name });
        keys.set(id, made);
        return json(made, 201);
      }
      const id = parts[2], core = rooms.get(id);
      if (!core) return json({ error: 'raum-fehlt', message: 'Diesen Team-Raum gibt es nicht (mehr).' }, 404);
      const rest = parts.slice(3).join('/');
      if (rest === '') { await core.auth(key); return json(core.info()); }
      if (rest === 'rotate' && req.method() === 'POST') {
        await core.auth(key, 'admin');
        const wer = url.searchParams.get('wer');
        return json(await core.rotate(wer === 'server' || wer === 'admin' ? wer : 'member'));
      }
      if (rest === 'events' && req.method() === 'POST') {
        const role = await core.auth(key);
        const { added, ...out } = core.append(req.postDataJSON(), role);
        if (added?.length) broadcast(id, { type: 'events', events: added, cursor: out.cursor });
        return json(out);
      }
      if (rest === 'events') { await core.auth(key); return json(core.since(url.searchParams.get('after') ?? '', url.searchParams.get('limit'))); }
      if (rest === 'header' && req.method() === 'PUT') { await core.auth(key, 'admin'); core.setHeader(req.postDataJSON()); return json({ ok: true }); }
      if (rest === 'header') { await core.auth(key); return json(core.getHeader()); }
      if (rest.startsWith('plan/') && req.method() === 'PUT') { await core.auth(key, 'admin'); await core.putPlan(rest.slice(5), new Uint8Array(req.postDataBuffer())); return json({ ok: true }); }
      if (rest.startsWith('plan/')) { await core.auth(key); return route.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'application/gzip' }, body: Buffer.from(core.getPlan(rest.slice(5))) }); }
      if (rest === 'scans') { await core.auth(key); return json({ scans: core.scans() }); }
      if (rest === 'status' || rest === 'backups') { await core.auth(key, 'admin'); return json({ ...core.info(), backups: [], reasons: {} }); }
      return json({ error: 'nicht-gefunden', message: 'Unbekannte Adresse.' }, 404);
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
        } else if (msg.type === 'append' && s.authed) {
          const { added, ...out } = core.append(msg, s.role);
          ws.send(JSON.stringify({ type: 'appended', batch: msg.batch, ...out }));
          if (added?.length) broadcast(id, { type: 'events', events: added, cursor: out.cursor });
        }
      } catch (e) { ws.send(JSON.stringify({ type: 'error', error: e.code ?? 'fehler', message: e.message })); if (e.status === 401 || e.status === 404) ws.close({ code: 4401 }); }
    });
    ws.onClose(() => sockets.delete(s));
  };
  return { rooms, keys, http, live };
}

const text = async download => readFile(await download.path(), 'utf8');

test('Sicherungen ohne Team-Schlüssel, Team-Zugang verschlüsselt, Verwaltungsschlüssel wechseln', async () => {
  const fake = fakeService();
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
  await context.route(`${ROOM}/**`, fake.http);
  await context.routeWebSocket(/^wss:\/\/zugang\.test\//, fake.live);
  const p = await context.newPage();
  p.setDefaultTimeout(15_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/clipboard|Failed to load resource|WebSocket/i.test(m.text())) errors.push(m.text()); });
  p.on('dialog', d => void d.accept());

  await p.goto(BASE);
  await openSampleProject(p);
  await p.waitForURL(/#\/projekt\//);
  const projectUrl = p.url();
  await p.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name: 'Team' }).click();
  await p.getByPlaceholder('Dein Name').fill('Philipp');
  await p.getByRole('button', { name: 'Team gründen' }).click();
  const liveBlock = p.getByRole('region', { name: 'Team live' });
  await liveBlock.getByLabel('Adresse des Team-Raums').fill(ROOM);
  await liveBlock.getByRole('button', { name: 'Live schalten' }).click();
  await liveBlock.locator('[data-state=live]').waitFor();
  const [roomId, core] = [...fake.rooms.entries()][0], keys = fake.keys.get(roomId);
  for (let i = 0; i < 50 && !core.since('').events.some(e => e.kind === 'team.trust'); i++) await p.waitForTimeout(200);
  const secrets = [keys.memberKey, keys.adminKey, keys.serverKey];

  // ---- Project and full backup: no key of the room in the file.
  await p.goto(`${BASE}#/`);
  await openStorage(p);
  const [full] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Alles sichern' }).click()]);
  const fullText = await text(full);
  for (const k of secrets) assert.equal(fullText.includes(k), false, 'full backup holds no room key');
  assert.match(fullText, /team_/, 'the team log itself is in the backup');
  await p.getByText(/Zugangsschlüssel des Team-Raums sind nicht enthalten/).first().waitFor();
  const [one] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Sichern', exact: true }).first().click()]);
  const oneText = await text(one);
  for (const k of secrets) assert.equal(oneText.includes(k), false, 'project backup holds no room key');

  // ---- Change the admin key: the old one is refused, the server gets a confirmation signed with the new one.
  await p.goto(projectUrl);
  await p.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name: 'Team' }).click();
  await liveBlock.locator('[data-state=live]').waitFor();
  await liveBlock.getByTestId('admin-key-change').click();
  await p.getByText(/Verwaltungsschlüssel gewechselt\. Der alte gilt nicht mehr\./).first().waitFor();
  await assert.rejects(() => core.auth(keys.adminKey, 'admin'), /passt nicht/);
  let trusts = [];
  for (let i = 0; i < 50 && trusts.length < 2; i++) { trusts = core.since('').events.filter(e => e.kind === 'team.trust'); if (trusts.length < 2) await p.waitForTimeout(200); }
  assert.equal(trusts.length, 2, 'a second team.trust after the change');
  const stored = await p.evaluate(() => new Promise((res, rej) => { const r = indexedDB.open('minecraft-bauplaner'); r.onerror = () => rej(r.error); r.onsuccess = () => { const tx = r.result.transaction('projects'); const all = tx.objectStore('projects').getAll(); all.onsuccess = () => res(all.result.map(x => x.site?.team?.live?.adminKey).filter(Boolean)); }; }));
  assert.equal(stored.length, 1);
  const newAdmin = stored[0];
  assert.notEqual(newAdmin, keys.adminKey);
  assert.equal(await core.auth(newAdmin, 'admin'), 'admin');
  assert.equal(await verifyEvent(await deriveSignKey(newAdmin), trusts[1].teamId ?? core.info().teamId, trusts[1]), true, 'signed with the new key');
  assert.equal(await verifyEvent(await deriveSignKey(keys.adminKey), core.info().teamId, trusts[1]), false);

  // ---- Save the access sealed with a password, go offline in this browser, come back with the file.
  const save = liveBlock.getByTestId('team-access-save');
  await save.locator('summary').click();
  await save.getByLabel('Passwort für den Team-Zugang').fill('Burgmauer-Zugang');
  await save.getByLabel('Passwort wiederholen').fill('Burgmauer-Zugang');
  const [sealed] = await Promise.all([p.waitForEvent('download'), save.getByRole('button', { name: 'Team-Zugang herunterladen' }).click()]);
  assert.match(sealed.suggestedFilename(), /^team-zugang-.*\.lmnt-zugang\.json$/);
  const sealedText = await text(sealed);
  for (const k of [keys.memberKey, newAdmin, keys.serverKey]) assert.equal(sealedText.includes(k), false, 'keys only encrypted');
  await liveBlock.getByRole('button', { name: 'Live trennen' }).click();
  const open = liveBlock.getByTestId('team-access-open');
  await open.locator('summary').click();
  await open.getByLabel('Team-Zugang-Datei').setInputFiles({ name: sealed.suggestedFilename(), mimeType: 'application/json', buffer: Buffer.from(sealedText) });
  await open.getByLabel('Passwort des Team-Zugangs').fill('falsches Passwort');
  await open.getByRole('button', { name: 'Zugang öffnen' }).click();
  await p.getByText(/Passwort falsch oder Datei verändert/).first().waitFor();
  await open.getByLabel('Passwort des Team-Zugangs').fill('Burgmauer-Zugang');
  await open.getByRole('button', { name: 'Zugang öffnen' }).click();
  await p.getByText(/Team-Zugang wiederhergestellt \(mit Verwaltungsschlüssel\)/).first().waitFor();
  await liveBlock.locator('[data-state=live]').waitFor();
  await liveBlock.getByRole('button', { name: 'Plan in den Raum stellen' }).waitFor();

  assert.deepEqual(errors, []);
  await context.close();
});
