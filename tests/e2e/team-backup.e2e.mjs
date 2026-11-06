// Browser check of OPS-04 Sicherung und Wiederherstellung (docs/architecture/team/TEAM_BACKUP.md): the Bauleitung
// sees the state of the Team-Raum, backs it up by hand, restores an earlier state – and the planner offers the steps
// made after that backup again by itself, so nothing is lost; then it deletes the room and brings it back with the
// old link. The room is the real room and vault core (services/team-room/src/core.js, vault.js) behind Playwright's
// network routing, with the routes of the Cloudflare worker (index.js). Run after `npm run build`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSampleProject } from './start.mjs';
import { RoomCore, MemoryStore, RoomError, cleanPresence, randomKey, sha256 } from '../../services/team-room/src/core.js';
import { VaultCore, backupInto, REASONS, RETENTION } from '../../services/team-room/src/vault.js';
import { teamEvent } from '../../dist/domain/src/index.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4389, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`, ROOM = 'https://sicherung.test';
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

/** The worker's routes incl. OPS-04 (status, backups, restore, delete) on RoomCore + VaultCore. */
function fakeService() {
  const rooms = new Map(), vaults = new Map(), sockets = new Set();
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type, If-Match', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' };
  const broadcast = (id, msg) => { for (const s of sockets) if (s.room === id && s.authed) s.ws.send(JSON.stringify(msg)); };
  const closeAll = (id, code) => { for (const s of [...sockets]) if (s.room === id) { sockets.delete(s); s.ws.close({ code }); } };
  const ops = new Map();
  const backup = async (id, reason) => { const meta = await backupInto(vaults.get(id), await rooms.get(id).snapshot(), reason); ops.set(id, { ...ops.get(id), lastBackup: meta }); return meta; };
  const authAdmin = async (id, key) => {
    const core = rooms.get(id);
    if (core.created) { await core.auth(key, 'admin'); return true; }
    if (await sha256(key) !== vaults.get(id).adminHash()) throw new RoomError(401, 'schluessel-falsch', 'Der Verwaltungsschlüssel passt nicht.');
    return false;
  };
  const http = async route => {
    const req = route.request(), url = new URL(req.url()), parts = url.pathname.split('/').filter(Boolean);
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const json = (body, status = 200) => route.fulfill({ status, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const key = (req.headers().authorization ?? '').replace(/^Bearer\s+/i, '');
    try {
      if (parts.join('/') === 'v1/status') return json({ ok: true, protocol: 'team-room', version: 1, features: ['guards', 'docs', 'scans', 'control', 'backups'], retention: RETENTION });
      if (parts.join('/') === 'v1/rooms' && req.method() === 'POST') {
        const id = `r_${randomKey(9)}`;
        rooms.set(id, new RoomCore(new MemoryStore())); vaults.set(id, new VaultCore(new MemoryStore()));
        const body = req.postDataJSON();
        return json(await rooms.get(id).create({ room: id, teamId: body.teamId, name: body.name }), 201);
      }
      const id = parts[2], core = rooms.get(id), vault = vaults.get(id);
      if (!core) return json({ error: 'raum-fehlt', message: 'Diesen Team-Raum gibt es nicht (mehr).' }, 404);
      const rest = parts.slice(3).join('/');
      // ---- OPS-04
      if (rest === 'status') {
        const exists = await authAdmin(id, key);
        const list = vault.list();
        if (!exists) return json({ deleted: true, deletedAt: vault.deletedAt(), restorableUntil: new Date(Date.parse(vault.deletedAt()) + 90 * 86_400_000).toISOString(), backups: list.length, lastBackup: list[0] ?? null });
        return json({ ...core.info(), connections: [...sockets].filter(s => s.room === id && s.authed).length, lastActivity: new Date().toISOString(), lastBackup: ops.get(id)?.lastBackup ?? null,
          backups: list.length, unsaved: core.stateKey() !== list[0]?.stateKey && !list.length, nextAlarm: null, deleteAfter: new Date(Date.now() + 365 * 86_400_000).toISOString(), error: null, limits: { events: 20000 }, bytes: 4096 });
      }
      if (rest === 'backups' && req.method() === 'GET') { await authAdmin(id, key); return json({ backups: vault.list(), reasons: REASONS }); }
      if (rest === 'backups' && req.method() === 'POST') { await core.auth(key, 'admin'); return json(await backup(id, 'manuell'), 201); }
      if (rest === 'restore' && req.method() === 'POST') {
        const exists = await authAdmin(id, key);
        const before = exists ? await backup(id, 'vor-wiederherstellung') : null;
        const r = core.restore(await vault.get(req.postDataJSON().backup), { keepKeys: exists, floorBefore: vault.floor() });
        vault.markRestored();
        closeAll(id, 4012);
        return json({ ok: true, ...r, keys: exists ? 'unveraendert' : 'aus-sicherung', ...(before && { before: before.id }) });
      }
      if (rest === '' && req.method() === 'DELETE') {
        await core.auth(key, 'admin');
        if (url.searchParams.get('bestaetigen') !== id) return json({ error: 'bestaetigen' }, 400);
        const meta = await backup(id, 'loeschen');
        vault.markDeleted();
        closeAll(id, 4404);
        core.store.wipe(); core._floor = undefined;
        return json({ deleted: true, backup: meta.id, restorableUntil: new Date(Date.now() + 90 * 86_400_000).toISOString() });
      }
      // ---- the rest of the room (as in team-room.e2e.mjs)
      if (rest === '') { await core.auth(key); return json(core.info()); }
      if (rest === 'events' && req.method() === 'POST') {
        const role = await core.auth(key);
        const { added, ...out } = core.append(req.postDataJSON(), role);
        if (added.length) broadcast(id, { type: 'events', events: added, cursor: out.cursor });
        return json(out);
      }
      if (rest === 'events') { await core.auth(key); return json(core.since(url.searchParams.get('after') ?? '')); }
      if (rest === 'header' && req.method() === 'PUT') { await core.auth(key, 'admin'); core.setHeader(req.postDataJSON()); return json({ ok: true }); }
      if (rest === 'header') { await core.auth(key); return json(core.getHeader()); }
      if (rest.startsWith('plan/') && req.method() === 'PUT') { await core.auth(key, 'admin'); await core.putPlan(rest.slice(5), new Uint8Array(req.postDataBuffer())); return json({ ok: true }); }
      if (rest.startsWith('plan/')) { await core.auth(key); return route.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'application/gzip' }, body: Buffer.from(core.getPlan(rest.slice(5))) }); }
      if (rest === 'scans') { await core.auth(key); return json({ scans: core.scans() }); }
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
          if (added.length) broadcast(id, { type: 'events', events: added, cursor: out.cursor });
        }
      } catch (e) { ws.send(JSON.stringify({ type: 'error', error: e.code ?? 'fehler', message: e.message })); if (e.status === 401 || e.status === 404) ws.close({ code: 4401 }); }
    });
    ws.onClose(() => sockets.delete(s));
  };
  return { rooms, http, live, broadcast };
}

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Team-Raum sichern, wiederherstellen ohne Verlust, löschen und zurückholen (${viewport.width}px)`, async () => {
    const fake = fakeService();
    const context = await browser.newContext({ viewport });
    await context.route(`${ROOM}/**`, fake.http);
    await context.routeWebSocket(/^wss:\/\/sicherung\.test\//, fake.live);
    const p = await context.newPage();
    p.setDefaultTimeout(15_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/clipboard|Failed to load resource|WebSocket/i.test(m.text())) errors.push(m.text()); });
    p.on('dialog', d => void d.accept());

    await p.goto(BASE);
    await openSampleProject(p);
    await p.waitForURL(/#\/projekt\//);
    await p.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link', { name: 'Team' }).click();
    await p.getByPlaceholder('Dein Name').fill('Philipp');
    await p.getByRole('button', { name: 'Team gründen' }).click();
    const liveBlock = p.getByRole('region', { name: 'Team live' });
    await liveBlock.getByLabel('Adresse des Team-Raums').fill(ROOM);
    await liveBlock.getByRole('button', { name: 'Live schalten' }).click();
    await liveBlock.locator('[data-state=live]').waitFor();
    const [roomId, core] = [...fake.rooms.entries()][0];

    // ---- Zustand und Sicherung von Hand.
    const panel = liveBlock.getByTestId('team-backup');
    await panel.locator('summary').first().click();
    await panel.getByTestId('backup-service').filter({ hasText: /^erreichbar$/ }).waitFor();
    await panel.getByTestId('backup-last').filter({ hasText: 'noch keine' }).waitFor();
    await panel.getByRole('button', { name: 'Jetzt sichern' }).click();
    await p.getByText(/Team-Raum gesichert \(\d+ Schritte/).first().waitFor();
    await panel.getByRole('list', { name: 'Sicherungen' }).getByText('von Hand').waitFor();
    const inBackup = core.since('').events.length;

    // ---- After the backup someone else adds a step; the planner of the Bauleitung gets it live.
    const note = teamEvent('bld_anna', { kind: 'note.add', noteId: 'n_nach', text: 'Nach der Sicherung', tag: 'info' });
    const { added, ...out } = core.append({ batch: 'b_anna', events: [note] }, 'member');
    fake.broadcast(roomId, { type: 'events', events: added, cursor: out.cursor });
    await p.waitForTimeout(800);

    // ---- Restore the backup: the step is gone in the room for a moment, the planner hands it in again by itself.
    await panel.getByRole('list', { name: 'Sicherungen' }).locator('li').filter({ hasText: 'von Hand' }).getByRole('button', { name: 'Wiederherstellen' }).click();
    await p.getByText(/Team-Raum wiederhergestellt/).first().waitFor();
    await liveBlock.locator('[data-state=live]').waitFor();
    await p.waitForFunction(() => true);
    for (let i = 0; i < 50 && !core.since('').events.some(e => e.id === note.id); i++) await p.waitForTimeout(200);
    assert.ok(core.since('').events.some(e => e.id === note.id), 'step made after the backup is back in the room');
    assert.equal(core.since('').events.length, inBackup + 1);
    await panel.getByRole('button', { name: 'Aktualisieren' }).click();
    await panel.getByRole('list', { name: 'Sicherungen' }).getByText('vor einer Wiederherstellung').waitFor();

    // ---- Delete the room, then bring it back with the old keys.
    await panel.locator('details.team-emergency > summary').click();
    await panel.getByRole('button', { name: 'Team-Raum löschen' }).click();
    await p.getByText(/Team-Raum gelöscht\. Zurückholen geht bis/).first().waitFor();
    await liveBlock.getByRole('alert').filter({ hasText: 'wurde gelöscht' }).waitFor();
    await panel.getByTestId('backup-room').filter({ hasText: 'gelöscht' }).waitFor();
    await panel.getByRole('list', { name: 'Sicherungen' }).locator('li').filter({ hasText: 'vor dem Löschen' }).getByRole('button', { name: 'Wiederherstellen' }).click();
    await p.getByText(/Die Einladungslinks von damals gelten wieder/).first().waitFor();
    assert.equal(core.created, true);
    await p.reload();
    await p.getByRole('region', { name: 'Team live' }).locator('[data-state=live]').waitFor();

    // Mobile width: nothing sticks out of the panel.
    if (viewport.width < 500) {
      await p.getByRole('region', { name: 'Team live' }).getByTestId('team-backup').locator('summary').first().click();
      const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(over <= 1, `no horizontal scroll (${over}px)`);
    }
    assert.deepEqual(errors, []);
    await context.close();
  });
}
