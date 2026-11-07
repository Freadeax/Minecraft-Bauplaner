// Probe of the abuse protection of a running Team-Raum (P1 Härtung 07.11.2026, docs/architecture/team/TEAM_LIVE.md §15):
// `node scripts/team/team_room_abuse_smoke.mjs <base-url>` – against `npx wrangler dev` in services/team-room or the
// deployed worker. Creates one room. Checks: foreign browser pages are refused, `create` is not reachable through a
// room, bodies over the limit are refused before parsing, a connection without hello is closed, wrong messages
// before hello end the connection, and too big WebSocket messages are refused.
// With ABUSE_CREATE_PROBE=1 it also creates rooms until the limit answers 429 (only locally: it uses up the hour).
import assert from 'node:assert/strict';
import http from 'node:http';
import https from 'node:https';
const base = (process.argv[2] ?? 'http://127.0.0.1:8787').replace(/\/+$/, '');
const call = async (path, init = {}, key) => {
  const r = await fetch(base + path, { ...init, headers: { 'Content-Type': 'application/json', ...(key && { Authorization: `Bearer ${key}` }), ...init.headers } });
  const text = await r.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: r.status, body, headers: r.headers };
};
const ok = (label) => console.log(`✓ ${label}`);

const evil = await call('/v1/rooms', { method: 'POST', headers: { Origin: 'https://boese.example' }, body: JSON.stringify({ teamId: 'team_abuse', name: 'x' }) });
assert.equal(evil.status, 403, JSON.stringify(evil.body)); ok('fremde Seite legt keinen Raum an (403)');

const big = await call('/v1/rooms', { method: 'POST', body: JSON.stringify({ teamId: 'team_abuse', name: 'x'.repeat(10_000) }) });
assert.equal(big.status, 413, JSON.stringify(big.body)); ok('zu großer Anlege-Body (413)');

const created = await call('/v1/rooms', { method: 'POST', body: JSON.stringify({ teamId: 'team_abuse', name: 'Missbrauchsprobe' }) });
assert.equal(created.status, 201, JSON.stringify(created.body));
const { room, memberKey, adminKey } = created.body;
ok(`Raum ${room} angelegt`);

const inner = await call(`/v1/rooms/r_selbstgewaehlt01/create?room=r_selbstgewaehlt01`, { method: 'POST', body: JSON.stringify({ teamId: 'team_x' }) });
assert.equal(inner.status, 404, JSON.stringify(inner.body)); ok('create ist über einen Raum nicht erreichbar (404)');

const huge = await call(`/v1/rooms/${room}/events`, { method: 'POST', body: JSON.stringify({ batch: 'b1', events: [], pad: 'x'.repeat(1_200_000) }) }, memberKey);
assert.equal(huge.status, 413, JSON.stringify(huge.body)); ok('Ereignis-Body über 1 MB vor dem Parsen abgelehnt (413)');
const declared = await fetch(`${base}/v1/rooms/${room}/header`, { method: 'PUT', headers: { Authorization: `Bearer ${adminKey}`, 'Content-Type': 'application/json' },
  body: new ReadableStream({ start(c) { for (let i = 0; i < 3; i++) c.enqueue(new Uint8Array(512 * 1024).fill(32)); c.close(); } }), duplex: 'half' });
assert.equal(declared.status, 413); ok('gestreamter Body ohne Längenangabe beim Lesen abgebrochen (413)');
const unauth = await call(`/v1/rooms/${room}/plan/${'0'.repeat(64)}`, { method: 'PUT', body: 'x' }, 'falsch');
assert.equal(unauth.status, 401); ok('ohne Schlüssel kein Upload (401)');

const wsUrl = `${base.replace(/^http/, 'ws')}/v1/rooms/${room}/live`;
const upgradeStatus = origin => new Promise((resolve, reject) => {
  const u = new URL(wsUrl.replace(/^ws/, 'http'));
  const req = (u.protocol === 'https:' ? https : http).request(u, { headers: { Upgrade: 'websocket', Connection: 'Upgrade', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==', Origin: origin } });
  req.on('upgrade', (res, socket) => { socket.destroy(); resolve(res.statusCode); });
  req.on('response', res => { res.resume(); resolve(res.statusCode); });
  req.on('error', reject);
  req.end();
});
const upgrade = { status: await upgradeStatus('https://boese.example') };
assert.equal(await upgradeStatus('https://freadeax.github.io'), 101, 'Planer-Seite darf verbinden');
assert.equal(upgrade.status, 403); ok('WebSocket von fremder Seite abgelehnt (403)');

/** Resolves when the room ends the connection: close event, or its last word `anmeldung-fehlt` (local wrangler dev keeps TCP open). */
const closed = (send) => new Promise((resolve, reject) => {
  const ws = new WebSocket(wsUrl);
  const started = Date.now();
  ws.onopen = () => send?.(ws);
  ws.onmessage = m => { try { if (JSON.parse(m.data).error === 'anmeldung-fehlt') resolve({ code: 4408, ms: Date.now() - started }); } catch { /* not JSON */ } };
  ws.onclose = e => resolve({ code: e.code, ms: Date.now() - started });
  ws.onerror = () => {};
  setTimeout(() => reject(new Error('Verbindung wurde nicht geschlossen')), 20_000);
});
const silent = await closed();
assert.equal(silent.code, 4408, `Code ${silent.code}`); assert.ok(silent.ms >= 9000 && silent.ms < 15_000, `${silent.ms} ms`);
ok(`Verbindung ohne Anmeldung nach ${(silent.ms / 1000).toFixed(1)} s geschlossen (4408)`);
const noisy = await closed(ws => { for (let i = 0; i < 5; i++) ws.send(JSON.stringify({ type: 'append', batch: `b${i}`, events: [] })); });
assert.equal(noisy.code, 4401, `Code ${noisy.code}`); ok('Nachrichten vor der Anmeldung beenden die Verbindung (4401)');
const wrong = await closed(ws => ws.send(JSON.stringify({ type: 'hello', key: 'falsch' })));
assert.equal(wrong.code, 4401); ok('falscher Schlüssel beendet die Verbindung (4401)');
const flood = await closed(ws => { ws.send(JSON.stringify({ type: 'hello', key: memberKey, member: 'probe', device: 'dev_probe', where: 'planer', after: '' }));
  setTimeout(() => ws.send('x'.repeat(1_100_000)), 500); });
assert.equal(flood.code, 4413, `Code ${flood.code}`); ok('WebSocket-Nachricht über 1 MB abgelehnt (4413)');

if (process.env.ABUSE_CREATE_PROBE === '1') {
  let n = 0, last;
  do { last = await call('/v1/rooms', { method: 'POST', body: JSON.stringify({ teamId: 'team_abuse', name: `Flut ${n}` }) }); n++; } while (last.status === 201 && n < 100);
  assert.equal(last.status, 429, JSON.stringify(last.body)); assert.ok(Number(last.headers.get('Retry-After')) > 0);
  ok(`Raumerstellung nach ${n - 1} weiteren Räumen begrenzt (429, Retry-After ${last.headers.get('Retry-After')} s)`);
}
console.log('Missbrauchsschutz in Ordnung.');
