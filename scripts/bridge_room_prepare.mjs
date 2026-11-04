// LINK-07 game test helper: creates a team room on a running team-room service (npx wrangler dev), puts a
// two-section team header in and adds the member „Tom“ – like the Bauleitung's planer does with „Live schalten“.
// Writes <dir>/room.json {url, room, key (member), member, teamName, adminKey}; the Fabric game test connects the
// mod with it (no server, no plugin) and bridge_gametest.mjs verify checks the room afterwards.
//   node scripts/bridge_room_prepare.mjs <dir> <room service url>
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [dir, base] = process.argv.slice(2);
if (!dir || !base) throw new Error('usage: bridge_room_prepare.mjs <dir> <room service url>');
const url = base.replace(/\/+$/, '');
const call = async (path, init = {}) => {
  const r = await fetch(`${url}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init.headers } });
  const body = await r.json();
  if (!r.ok) throw new Error(`${path}: ${r.status} ${JSON.stringify(body)}`);
  return body;
};
const created = await call('/v1/rooms', { method: 'POST', body: JSON.stringify({ teamId: 'team_spieltest', name: 'Spieltest-Team' }) });
const auth = { Authorization: `Bearer ${created.adminKey}` };
await call(`/v1/rooms/${created.room}/header`, { method: 'PUT', headers: auth, body: JSON.stringify({
  format: 'minecraft-bauplaner-team-server', formatVersion: 1, teamId: 'team_spieltest', name: 'Spieltest-Team', founder: 'mem_lea', dimension: 'minecraft:overworld',
  members: [{ id: 'mem_lea', name: 'Lea' }],
  sections: [{ id: 'sec_turm', name: 'Turm', boxes: [[0, -64, 0, 9, 0, 9]] }, { id: 'sec_mauer', name: 'Mauer', boxes: [[10, -64, 0, 30, 0, 4]] }], events: [] }) });
await call(`/v1/rooms/${created.room}/events`, { method: 'POST', headers: auth, body: JSON.stringify({ batch: 'join', events: [
  { id: 'tev_join_tom', at: new Date().toISOString(), by: 'mem_lea', origin: 'planer', kind: 'member.join', member: 'mem_tom', name: 'Tom' }] }) });
writeFileSync(join(dir, 'room.json'), JSON.stringify({ url, room: created.room, key: created.memberKey, member: 'mem_tom', memberName: 'Tom', teamName: 'Spieltest-Team', adminKey: created.adminKey }));
console.log(`Team-Raum ${created.room} für den Spieltest angelegt.`);
