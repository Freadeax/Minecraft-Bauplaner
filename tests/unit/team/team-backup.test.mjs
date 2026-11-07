// OPS-04 Sicherung und Wiederherstellung des Team-Raums (docs/architecture/team/TEAM_BACKUP.md): room core and vault
// core of services/team-room together with the planner's sync core – a restored room loses nothing, because every
// planner offers its own steps again; deleted rooms come back with their old links; retention stays within the free plan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RoomCore, MemoryStore, RoomError, BACKUP_FORMAT, LIMITS } from '../../../services/team-room/src/core.js';
import { VaultCore, backupInto, pruneBackups, packSnapshot, unpackSnapshot, RETENTION } from '../../../services/team-room/src/vault.js';
import { createTeam, teamEvent, goLive, joinLive, appendLocal, nextBatch, confirm, ingest, afterRestore, checkLive } from '../../../dist/domain/src/index.js';

let clock = Date.parse('2026-11-06T20:00:00Z');
const t = () => new Date(clock += 60_000).toISOString();

function sync(room, team) {
  let batch;
  while ((batch = nextBatch(team))) team = confirm(team, room.append(batch, team.live.adminKey ? 'admin' : 'member')).team;
  let feed;
  do { feed = room.since(team.live.cursor); team = ingest(team, feed).team; } while (feed.more);
  return team;
}
const ids = team => team.events.map(e => e.id).sort();
const roomIds = room => room.since('', LIMITS.page).events.map(e => e.id).sort();

async function liveTeam() {
  const room = new RoomCore(new MemoryStore());
  let lead = createTeam({ name: 'Burg', founder: 'bld_phil', teamId: 'team_bk1', at: '2026-11-06T19:00:00Z' });
  const keys = await room.create({ room: 'r_backup01', teamId: lead.teamId, name: lead.name });
  lead = goLive(lead, { url: 'https://bauplaner-team.example.workers.dev', room: keys.room, key: keys.memberKey, adminKey: keys.adminKey, serverKey: keys.serverKey }, 'dev_lead01');
  lead = appendLocal(lead, [teamEvent('bld_phil', { kind: 'section.claim', section: 'sec_a' }, t())]);
  lead = sync(room, lead);
  let anna = joinLive(createTeam({ name: 'Burg', founder: 'bld_phil', teamId: lead.teamId, at: lead.createdAt }), { url: lead.live.url, room: keys.room, key: keys.memberKey }, 'dev_anna01');
  anna = sync(room, anna);
  return { room, keys, lead, anna };
}

test('backup: snapshot holds events, header, plans and documents; pack/unpack round-trips', async () => {
  const { room } = await liveTeam();
  room.setHeader({ teamId: 'team_bk1', sections: [] });
  const plan = new TextEncoder().encode('plan'.repeat(1000));
  const { sha256 } = await import('../../../services/team-room/src/core.js');
  await room.putPlan(await sha256(plan), plan);
  await room.putDoc('weltplan', JSON.stringify({ markers: [1, 2] }), { by: 'bld_phil' });
  const snap = await room.snapshot('2026-11-06T21:00:00Z');
  assert.equal(snap.head.format, BACKUP_FORMAT);
  assert.equal(snap.head.events, snap.events.length);
  assert.equal(snap.head.plans.length, 1);
  assert.ok(snap.head.docs.weltplan && snap.blobs.has(snap.head.docs.weltplan.sha256));
  assert.ok(snap.head.room.admin && snap.head.room.member, 'key hashes go along (a deleted room keeps its links)');
  const back = await unpackSnapshot(await packSnapshot(snap));
  assert.deepEqual(back.head, snap.head); assert.deepEqual(back.events, snap.events);
  await assert.rejects(() => unpackSnapshot(new Uint8Array([1, 2, 3])), /lässt sich nicht lesen/);
});

test('restore: earlier state comes back, numbers continue above everything handed out, planners offer their steps again – nothing lost', async () => {
  let { room, lead, anna } = await liveTeam();
  const vault = new VaultCore(new MemoryStore());
  const b1 = await backupInto(vault, await room.snapshot(), 'auto', '2026-11-06T21:00:00Z');
  assert.equal(b1.events, 1);

  // After the backup: both keep working (these steps are not in the backup).
  lead = sync(room, appendLocal(lead, [teamEvent('bld_phil', { kind: 'note.add', noteId: 'n1', text: 'Kies fehlt', tag: 'material' }, t())]));
  anna = sync(room, appendLocal(anna, [teamEvent('bld_anna', { kind: 'section.claim', section: 'sec_b' }, t())]));
  lead = sync(room, lead);
  assert.equal(roomIds(room).length, 3);
  const topBefore = Number(room.info().cursor);

  // The Bauleitung restores the backup (e.g. after a broken import).
  const before = await backupInto(vault, await room.snapshot(), 'vor-wiederherstellung', '2026-11-06T21:30:00Z');
  const data = await vault.get(b1.id);
  const r = room.restore(data, { keepKeys: true, floorBefore: vault.floor() });
  assert.equal(r.events, 1);
  assert.equal(roomIds(room).length, 1, 'room is back at the backup');
  assert.equal(Number(room.info().cursor), topBefore, 'cursor never goes back: no client skips a new event');
  assert.ok(room.info().epoch, 'restore mark');
  assert.equal(room.since(String(topBefore)).reset, undefined, 'a cursor from before the restore is still valid');

  // A third planner writes right after the restore; its event gets a number above every old cursor.
  const ack = room.append({ batch: 'b_after', events: [teamEvent('bld_ben', { kind: 'note.add', noteId: 'n2', text: 'Bin da', tag: 'info' }, t())] });
  assert.ok(Number(ack.cursor) > topBefore);
  assert.equal(room.since(String(topBefore)).events.length, 1, 'old cursor sees the new event');

  // The planners reconnect, see the new epoch and offer their steps again.
  const epoch = room.info().epoch;
  lead = afterRestore(lead, epoch); anna = afterRestore(anna, epoch);
  assert.ok(lead.live.pending.length >= 2 && !lead.live.bases);
  assert.equal(afterRestore(lead, epoch), lead, 'same mark: nothing to do');
  lead = sync(room, lead); anna = sync(room, anna); lead = sync(room, lead);
  assert.equal(roomIds(room).length, 4, 'all steps are back in the room');
  assert.deepEqual(ids(lead), roomIds(room)); assert.deepEqual(ids(anna), roomIds(room));
  assert.ok(checkLive(lead.live).epoch === epoch);
  assert.equal(before.reason, 'vor-wiederherstellung');
});

test('restore: guards and subjects follow the restored log; old batch answers are forgotten', async () => {
  let { room, lead } = await liveTeam();
  const vault = new VaultCore(new MemoryStore());
  const b = await backupInto(vault, await room.snapshot(), 'manuell');
  room.append({ batch: 'b_x', events: [teamEvent('bld_anna', { kind: 'section.release', section: 'sec_a' }, t())] });
  room.restore(await vault.get(b.id), { keepKeys: true });
  // The release is gone after the restore: a guarded step of Philipp on sec_a built on the old cursor is accepted.
  const step = teamEvent('bld_phil', { kind: 'section.done', section: 'sec_a' }, t());
  const a = room.append({ batch: 'b_x', events: [step], guards: { [step.id]: '1' } });
  assert.deepEqual(a.accepted, [step.id], 'same batch id as before the restore is a new batch now');
  assert.equal(a.stale, undefined);
  lead = sync(room, lead);
  assert.ok(lead.events.some(e => e.id === step.id));
});

test('deleted room: comes back from the vault with the keys of the backup', async () => {
  const { room, keys } = await liveTeam();
  const vault = new VaultCore(new MemoryStore());
  const last = await backupInto(vault, await room.snapshot(), 'loeschen');
  const top = Number(room.info().cursor);
  vault.markDeleted('2026-11-06T22:00:00Z');
  room.store.wipe(); room._floor = undefined;
  assert.equal(room.created, false);
  await assert.rejects(() => room.auth(keys.memberKey), /gibt es nicht/);
  const { sha256 } = await import('../../../services/team-room/src/core.js');
  assert.equal(vault.adminHash(), await sha256(keys.adminKey), 'admin key of the newest backup authorizes the restore');
  room.restore(await vault.get(last.id), { keepKeys: false, floorBefore: vault.floor() });
  vault.markRestored();
  assert.equal(await room.auth(keys.memberKey), 'member', 'old invitation link works again');
  assert.equal(await room.auth(keys.adminKey, 'admin'), 'admin');
  assert.ok(Number(room.info().cursor) >= top);
  assert.equal(vault.deletedAt(), undefined);
  assert.equal(vault.expired(Date.parse('2027-12-01T00:00:00Z')), false);
  vault.markDeleted('2026-11-06T22:00:00Z');
  assert.equal(vault.expired(Date.parse('2026-12-01T00:00:00Z')), false);
  assert.equal(vault.expired(Date.parse('2027-02-05T00:00:00Z')), true, `${RETENTION.deletedKeepDays} days later the vault goes too`);
  vault.wipe();
  assert.equal(vault.list().length, 0);
});

test('vault: blobs stored once, checksums checked, broken backups refused', async () => {
  const { room } = await liveTeam();
  const vault = new VaultCore(new MemoryStore());
  const plan = new TextEncoder().encode('x'.repeat(2.5 * 1024 * 1024));
  const { sha256 } = await import('../../../services/team-room/src/core.js');
  const sha = await sha256(plan);
  await room.putPlan(sha, plan);
  const a = await backupInto(vault, await room.snapshot(), 'auto', '2026-11-06T20:00:00Z');
  assert.deepEqual(vault.missing([sha]), []);
  const b = await backupInto(vault, await room.snapshot(), 'auto', '2026-11-06T21:00:00Z');
  assert.deepEqual(a.blobs, b.blobs);
  assert.equal(vault.store.plans.get(`blob:${sha}`).length, 3, 'one copy in 1 MB pieces');
  await assert.rejects(() => vault.putBlob(sha, new Uint8Array([1])), /Prüfsumme/);
  // Damage the stored backup: restore refuses instead of loading garbage.
  vault.store.plans.set(`data:${b.id}`, [new Uint8Array([0x1f, 0x8b, 0, 0])]);
  await assert.rejects(() => vault.get(b.id), /beschädigt/);
  await assert.rejects(() => vault.get('bk_gibtsnicht'), /gibt es nicht/);
  assert.throws(() => room.restore({ head: { format: 'x' }, events: [], blobs: new Map() }), RoomError);
  const good = await vault.get(a.id);
  assert.throws(() => room.restore({ ...good, blobs: new Map() }), /fehlt/);
});

test('retention: last 48 h all, then one per day for 30 days, marked ones 30 days, newest always; unused blobs go', async () => {
  const now = Date.parse('2026-11-30T12:00:00Z'), h = 3_600_000;
  const list = [];
  for (let i = 0; i < 24 * 40; i += 1) list.push({ id: `a${i}`, at: new Date(now - i * h).toISOString(), reason: 'auto' });
  list.push({ id: 'm_new', at: new Date(now - 5 * 24 * h).toISOString(), reason: 'manuell' });
  list.push({ id: 'm_old', at: new Date(now - 45 * 24 * h).toISOString(), reason: 'manuell' });
  const drop = new Set(pruneBackups(list, now));
  const kept = list.filter(b => !drop.has(b.id));
  assert.ok(kept.some(b => b.id === 'a0'));
  assert.equal(kept.filter(b => b.reason === 'auto' && now - Date.parse(b.at) <= 48 * h).length, 49, 'every one of the last 48 hours');
  const older = kept.filter(b => b.reason === 'auto' && now - Date.parse(b.at) > 48 * h);
  assert.equal(new Set(older.map(b => b.at.slice(0, 10))).size, older.length, 'older: one per day');
  assert.ok(older.every(b => now - Date.parse(b.at) <= 30 * 24 * h));
  assert.ok(kept.some(b => b.id === 'm_new') && !kept.some(b => b.id === 'm_old'));
  assert.ok(kept.length <= RETENTION.max);
  assert.deepEqual(pruneBackups([{ id: 'only', at: '2020-01-01T00:00:00Z', reason: 'auto' }], now), [], 'the newest stays, however old');

  // In the vault: dropping a backup drops blobs only it used.
  const { room } = await liveTeam();
  const vault = new VaultCore(new MemoryStore());
  const { sha256 } = await import('../../../services/team-room/src/core.js');
  const p1 = new TextEncoder().encode('alt'), s1 = await sha256(p1);
  await room.putPlan(s1, p1);
  await backupInto(vault, await room.snapshot(), 'auto', '2026-10-01T10:00:00Z');
  const p2 = new TextEncoder().encode('neu'), s2 = await sha256(p2);
  await room.putPlan(s2, p2);
  room.store.deletePlan(s1); room.store.setMeta('plans', [s2]);
  await backupInto(vault, await room.snapshot(), 'auto', '2026-11-30T10:00:00Z');
  assert.equal(vault.list().length, 1, 'October backup dropped');
  assert.deepEqual(vault.missing([s1, s2]), [s1], 'its plan went with it, the shared one stayed');
});
