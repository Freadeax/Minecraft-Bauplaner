// OPS-04 Probe für Sicherung und Wiederherstellung eines laufenden Team-Raums (docs/architecture/team/TEAM_BACKUP.md):
// `node scripts/team/team_room_backup_smoke.mjs <base-url>`, z. B. gegen `npx wrangler dev` in services/team-room
// (http://127.0.0.1:8787) oder den ausgerollten Dienst. Legt einen Wegwerf-Raum an, sichert, ändert, stellt wieder her,
// prüft Live-Verbindung (Trennung 4012, neue Marke), löscht den Raum, holt ihn mit dem alten Schlüssel zurück und löscht
// ihn am Ende wieder (bleibt 90 Tage im Tresor, dann weg).
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const base = (process.argv[2] ?? 'http://127.0.0.1:8787').replace(/\/+$/, '');
const call = async (path, init = {}, key) => {
  const r = await fetch(base + path, { ...init, headers: { 'Content-Type': 'application/json', ...(key && { Authorization: `Bearer ${key}` }), ...init.headers } });
  const text = await r.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: r.status, body };
};
let n = 0;
const ev = (by, kind, extra = {}) => ({ id: `tev_bk${Date.now().toString(36)}${++n}`, at: new Date(Date.now() + n).toISOString(), by, origin: 'planer', kind, ...extra });
const post = (room, key, events) => call(`/v1/rooms/${room}/events`, { method: 'POST', body: JSON.stringify({ batch: `b_${Date.now().toString(36)}${++n}`, events }) }, key);

const status = await call('/v1/status');
assert.equal(status.status, 200); assert.ok(status.body.features.includes('backups'), 'Dienst kann Sicherungen');

const created = await call('/v1/rooms', { method: 'POST', body: JSON.stringify({ teamId: 'team_bksmoke', name: 'Sicherungsprobe' }) });
assert.equal(created.status, 201);
const { room, adminKey, memberKey } = created.body;
const first = [ev('bld_a', 'section.claim', { section: 's1' }), ev('bld_a', 'note.add', { noteId: 'n1', text: 'vor der Sicherung', tag: 'info' })];
assert.deepEqual((await post(room, memberKey, first)).body.accepted.length, 2);
const plan = new TextEncoder().encode('plan'.repeat(400_000));
const sha = createHash('sha256').update(plan).digest('hex');
assert.equal((await fetch(`${base}/v1/rooms/${room}/plan/${sha}`, { method: 'PUT', body: plan, headers: { Authorization: `Bearer ${adminKey}` } })).status, 200);
assert.equal((await call(`/v1/rooms/${room}/doc/weltplan?by=bld_a`, { method: 'PUT', body: JSON.stringify({ markers: ['a'] }) }, memberKey)).status, 200);

// Rechte: nur die Bauleitung sieht und macht Sicherungen.
assert.equal((await call(`/v1/rooms/${room}/backups`, {}, memberKey)).status, 403);
assert.equal((await call(`/v1/rooms/${room}/status`, {}, memberKey)).status, 403);
const st0 = await call(`/v1/rooms/${room}/status`, {}, adminKey);
assert.equal(st0.status, 200); assert.equal(st0.body.unsaved, true); assert.ok(st0.body.nextAlarm, 'automatische Sicherung ist geplant');

const b1 = await call(`/v1/rooms/${room}/backups`, { method: 'POST' }, adminKey);
assert.equal(b1.status, 201, JSON.stringify(b1.body)); assert.equal(b1.body.events, 2); assert.equal(b1.body.plans, 1);
assert.equal((await call(`/v1/rooms/${room}/backups`, { method: 'POST' }, adminKey)).status, 429, 'höchstens eine Sicherung je Minute von Hand');
assert.equal((await call(`/v1/rooms/${room}/status`, {}, adminKey)).body.unsaved, false);

// Danach: neue Schritte, Plan überschrieben, Dokument geändert.
await post(room, memberKey, [ev('bld_b', 'note.add', { noteId: 'n2', text: 'nach der Sicherung', tag: 'info' })]);
assert.equal((await call(`/v1/rooms/${room}/doc/weltplan?by=bld_a`, { method: 'PUT', body: JSON.stringify({ markers: ['a', 'b'] }) }, memberKey)).status, 200);
const topBefore = Number((await call(`/v1/rooms/${room}`, {}, memberKey)).body.cursor);

// Eine Live-Verbindung erlebt die Wiederherstellung: Trennung mit 4012, beim Wiederverbinden neue Marke.
const ws = new WebSocket(`${base.replace(/^http/, 'ws')}/v1/rooms/${room}/live`);
const closed = new Promise(resolve => { ws.onclose = e => resolve(e.code); });
await new Promise((resolve, reject) => { ws.onerror = reject; ws.onmessage = m => { if (JSON.parse(m.data).type === 'welcome') resolve(); }; ws.onopen = () => ws.send(JSON.stringify({ type: 'hello', key: memberKey, member: 'bld_a', device: 'dev_bksmoke', where: 'planer', after: '' })); });

const restored = await call(`/v1/rooms/${room}/restore`, { method: 'POST', body: JSON.stringify({ backup: b1.body.id }) }, adminKey);
assert.equal(restored.status, 200, JSON.stringify(restored.body));
assert.equal(restored.body.events, 2); assert.equal(restored.body.keys, 'unveraendert'); assert.ok(restored.body.before, 'Stand vor der Wiederherstellung gesichert');
assert.equal(await closed, 4012, 'Live-Verbindungen werden zum Neuverbinden getrennt');
const info = (await call(`/v1/rooms/${room}`, {}, memberKey)).body;
assert.equal(info.events, 2); assert.equal(info.epoch, restored.body.epoch); assert.ok(Number(info.cursor) >= topBefore, 'Lesestand geht nie zurück');
assert.deepEqual((await call(`/v1/rooms/${room}/doc/weltplan`, {}, memberKey)).body.doc.markers, ['a'], 'Dokument auf Sicherungsstand');
const planBack = new Uint8Array(await (await fetch(`${base}/v1/rooms/${room}/plan/${sha}`, { headers: { Authorization: `Bearer ${memberKey}` } })).arrayBuffer());
assert.equal(createHash('sha256').update(planBack).digest('hex'), sha, 'Planstand unversehrt');
const after = await post(room, memberKey, [ev('bld_c', 'note.add', { noteId: 'n3', text: 'nach der Wiederherstellung', tag: 'info' })]);
assert.ok(Number(after.body.cursor) > topBefore, 'neue Schritte bekommen Nummern über allen alten');
const list = (await call(`/v1/rooms/${room}/backups`, {}, adminKey)).body.backups;
assert.deepEqual(list.map(b => b.reason).sort(), ['manuell', 'vor-wiederherstellung']);

// Automatische Sicherung (nur wenn der Dienst mit kurzen Zeiten läuft: wrangler dev --var BACKUP_DELAY_MS:2000 --var BACKUP_EVERY_MS:2000).
if (process.env.BACKUP_ALARM_WAIT_MS) {
  await new Promise(r => setTimeout(r, Number(process.env.BACKUP_ALARM_WAIT_MS)));
  const st = (await call(`/v1/rooms/${room}/status`, {}, adminKey)).body;
  assert.equal(st.lastBackup?.reason, 'auto', `automatische Sicherung gelaufen: ${JSON.stringify(st.lastBackup)}`);
  assert.equal(st.unsaved, false); assert.equal(st.lastBackup.events, 3);
  assert.ok(Date.parse(st.nextAlarm) > Date.now() + 300 * 86_400_000, 'danach wartet der Raum auf das Löschdatum (ein Jahr ohne Nutzung)');
  console.log('Automatische Sicherung per Alarm: in Ordnung.');
}

// Löschen und zurückholen.
assert.equal((await call(`/v1/rooms/${room}`, { method: 'DELETE' }, adminKey)).status, 400, 'Löschen nur mit Bestätigung');
const del = await call(`/v1/rooms/${room}?bestaetigen=${room}`, { method: 'DELETE' }, adminKey);
assert.equal(del.status, 200, JSON.stringify(del.body)); assert.ok(del.body.restorableUntil);
assert.equal((await call(`/v1/rooms/${room}`, {}, memberKey)).status, 404, 'Raum weg');
assert.equal((await call(`/v1/rooms/${room}/status`, {}, 'falsch')).status, 401);
const gone = await call(`/v1/rooms/${room}/status`, {}, adminKey);
assert.equal(gone.body.deleted, true); assert.equal(gone.body.lastBackup.reason, 'loeschen');
const back = await call(`/v1/rooms/${room}/restore`, { method: 'POST', body: JSON.stringify({ backup: gone.body.lastBackup.id }) }, adminKey);
assert.equal(back.status, 200, JSON.stringify(back.body)); assert.equal(back.body.keys, 'aus-sicherung'); assert.equal(back.body.events, 3);
assert.equal((await call(`/v1/rooms/${room}`, {}, memberKey)).body.events, 3, 'alter Einladungslink geht wieder');

// Aufräumen: Wegwerf-Raum wieder löschen.
assert.equal((await call(`/v1/rooms/${room}?bestaetigen=${room}`, { method: 'DELETE' }, adminKey)).status, 200);
console.log(`Team-Raum ${base}: Sicherung, Rechte, Wiederherstellung mit Live-Trennung und fortlaufenden Nummern, Löschen und Zurückholen mit altem Link – in Ordnung (Raum ${room}).`);
