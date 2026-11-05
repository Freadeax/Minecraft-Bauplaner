// Smoke test of a running Team-Raum (COOP-07): `node scripts/team/team_room_smoke.mjs <base-url>`, e.g. against
// `npx wrangler dev` in services/team-room (http://127.0.0.1:8787) or Philipp's deployed worker.
// Creates a room, appends over HTTP, two WebSockets see each other's events and presence, plan and header round-trip.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const base = (process.argv[2] ?? 'http://127.0.0.1:8787').replace(/\/+$/, '');
const call = async (path, init = {}, key) => {
  const r = await fetch(base + path, { ...init, headers: { 'Content-Type': 'application/json', ...(key && { Authorization: `Bearer ${key}` }), ...init.headers } });
  const text = await r.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: r.status, body };
};
const ev = (id, by, kind, extra = {}) => ({ id, at: new Date(Date.now() + Number(id.replace(/\D/g, '') || 0)).toISOString(), by, origin: 'planer', kind, ...extra });

const created = await call('/v1/rooms', { method: 'POST', body: JSON.stringify({ teamId: 'team_smoke', name: 'Rauchtest' }) });
assert.equal(created.status, 201, JSON.stringify(created.body));
const { room, adminKey, memberKey, serverKey } = created.body;
assert.equal((await call(`/v1/rooms/${room}`, {}, 'falsch')).status, 401);
assert.equal((await call(`/v1/rooms/${room}`, {}, memberKey)).body.teamId, 'team_smoke');

const open = (who) => new Promise((resolve, reject) => {
  const ws = new WebSocket(`${base.replace(/^http/, 'ws')}/v1/rooms/${room}/live`);
  const seen = []; const presence = [];
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.type === 'events') seen.push(...d.events.map(e => e.id)); if (d.type === 'presence') presence.push(d.members); if (d.type === 'welcome') resolve({ ws, seen, presence }); };
  ws.onerror = reject;
  ws.onopen = () => ws.send(JSON.stringify({ type: 'hello', key: memberKey, member: who, device: `dev_${who}`, where: 'planer', after: '' }));
});
const a = await open('anna'), b = await open('ben');
const app = await call(`/v1/rooms/${room}/events`, { method: 'POST', body: JSON.stringify({ batch: 'b_smoke1', events: [ev('e1', 'anna', 'section.claim', { section: 's1' })] }) }, memberKey);
assert.deepEqual(app.body.accepted, ['e1']);
const srv = { ...ev('e9', 'anna', 'build.tally', { section: 's1', placed: 3, broken: 0, from: new Date().toISOString(), until: new Date().toISOString() }), origin: 'server' };
assert.equal((await call(`/v1/rooms/${room}/events`, { method: 'POST', body: JSON.stringify({ batch: 'b_fake', events: [srv] }) }, memberKey)).body.rejected.length, 1, 'member key cannot write server events');
assert.deepEqual((await call(`/v1/rooms/${room}/events`, { method: 'POST', body: JSON.stringify({ batch: 'b_srv', events: [srv] }) }, serverKey)).body.accepted, ['e9']);
a.ws.send(JSON.stringify({ type: 'append', batch: 'b_smoke2', events: [ev('e2', 'anna', 'note.add', { noteId: 'n1', text: 'live!', tag: 'info' })] }));
await new Promise(r => setTimeout(r, 800));
assert.ok(b.seen.includes('e1') && b.seen.includes('e2'), `Ben sieht live: ${b.seen}`);
assert.ok(b.presence.at(-1).length === 2, 'zwei anwesend');
const feed = await call(`/v1/rooms/${room}/events?after=1`, {}, memberKey);
assert.deepEqual(feed.body.events.map(e => e.id), ['e9', 'e2']);
const plan = new TextEncoder().encode('plan'.repeat(300000));
const sha = createHash('sha256').update(plan).digest('hex');
assert.equal((await fetch(`${base}/v1/rooms/${room}/plan/${sha}`, { method: 'PUT', body: plan, headers: { Authorization: `Bearer ${memberKey}` } })).status, 403, 'nur Bauleitung lädt Plan');
assert.equal((await fetch(`${base}/v1/rooms/${room}/plan/${sha}`, { method: 'PUT', body: plan, headers: { Authorization: `Bearer ${adminKey}` } })).status, 200);
const back = new Uint8Array(await (await fetch(`${base}/v1/rooms/${room}/plan/${sha}`, { headers: { Authorization: `Bearer ${memberKey}` } })).arrayBuffer());
assert.equal(createHash('sha256').update(back).digest('hex'), sha);
assert.equal((await call(`/v1/rooms/${room}/header`, { method: 'PUT', body: JSON.stringify({ teamId: 'team_smoke', sections: [] }) }, adminKey)).status, 200);
assert.equal((await call(`/v1/rooms/${room}/header`, {}, memberKey)).body.teamId, 'team_smoke');
a.ws.close(); b.ws.close();
console.log(`Team-Raum ${base}: Raum ${room}, Anhängen, Live-Push an zweite Verbindung, Anwesenheit, Planstand ${plan.length} Bytes, Kopfdaten – in Ordnung.`);
