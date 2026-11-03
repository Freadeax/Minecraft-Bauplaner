// Team live (COOP-07): room core of services/team-room and the sync core of the planner together –
// two browsers and a server go live through one room without any file (docs/architecture/TEAM_LIVE.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RoomCore, MemoryStore, RoomError, checkEventShape, LIMITS } from '../services/team-room/src/core.js';
import {
  createTeam, teamEvent, teamView, goLive, joinLive, appendLocal, nextBatch, confirm, ingest, roomStatus, inviteLink, serverLink, readInvite, shareable, checkLive, retryDelay, buildTeamPackage,
} from '../dist/domain/src/index.js';

const ctx = { sections: [{ id: 'sec_a', name: 'Fundament' }, { id: 'sec_b', name: 'Rohbau' }], builders: [] };
let clock = Date.parse('2026-11-03T20:00:00Z');
const t = () => new Date(clock += 60_000).toISOString();

/** Runs one sync round of a client against a room core: send outbox, read feed. */
function sync(room, team) {
  let batch;
  while ((batch = nextBatch(team))) {
    const answer = room.append(batch);
    team = confirm(team, answer).team;
  }
  let feed;
  do { feed = room.since(team.live.cursor); team = ingest(team, feed).team; } while (feed.more);
  return team;
}

test('room: create, keys, form check, idempotent batches, feed with cursor and reset', async () => {
  const room = new RoomCore(new MemoryStore());
  await assert.rejects(() => room.auth('x'), RoomError);
  const keys = await room.create({ room: 'r_test01', teamId: 'team_1', name: 'Burg' });
  assert.equal(await room.auth(keys.memberKey), 'member');
  assert.equal(await room.auth(keys.adminKey, 'admin'), 'admin');
  await assert.rejects(() => room.auth(keys.memberKey, 'admin'), /Bauleitung/);
  await assert.rejects(() => room.auth('falsch'), /passt nicht/);
  const e1 = teamEvent('bld_a', { kind: 'section.claim', section: 'sec_a' }, t());
  const a1 = room.append({ batch: 'b1', events: [e1, { id: 'x', at: 'nie', by: 'a', kind: 'note.add', origin: 'planer' }] });
  assert.deepEqual(a1.accepted, [e1.id]); assert.equal(a1.rejected[0].reason, 'Ereigniszeit ungültig');
  assert.deepEqual(room.append({ batch: 'b1', events: [] }).accepted, [e1.id], 'repeated batch = same answer');
  const a2 = room.append({ batch: 'b2', events: [e1, { ...e1, section: 'sec_b' }] });
  assert.deepEqual(a2.known, [e1.id]); assert.match(a2.rejected[0].reason, /anderem Inhalt/);
  assert.deepEqual(room.since('').events.map(e => e.id), [e1.id]);
  assert.equal(room.since('1').events.length, 0);
  assert.equal(room.since('99').reset, true, 'unknown cursor → reset, from the start');
  assert.match(checkEventShape({ ...e1, text: 'x'.repeat(5000) }), /4 KB/);
  const { memberKey } = await room.rotate();
  await assert.rejects(() => room.auth(keys.memberKey), /passt nicht/);
  assert.equal(await room.auth(memberKey), 'member');
});

test('live without files: Bauleitung goes live, helper joins by link, server writes, all see the same state; offline work catches up', async () => {
  const room = new RoomCore(new MemoryStore());
  let lead = createTeam({ name: 'Burg', founder: 'bld_phil', teamId: 'team_live1', at: '2026-11-03T19:00:00Z' });
  lead = appendLocal(lead, [teamEvent('bld_phil', { kind: 'plan.release', revisionId: 'rev_1', revisionNumber: 1, summary: 'Start' }, t())]);
  const keys = await room.create({ room: 'r_live01', teamId: lead.teamId, name: lead.name });
  lead = goLive(lead, { url: 'https://bauplaner-team.example.workers.dev/', room: keys.room, key: keys.memberKey, adminKey: keys.adminKey, serverKey: keys.serverKey }, 'dev_lead01');
  assert.equal(lead.live.pending.length, 1, 'whole log goes up once');
  lead = sync(room, lead);
  assert.equal(lead.live.pending.length, 0);

  // Invitation link carries everything; packages never carry the key.
  const link = inviteLink('https://freadeax.github.io/Minecraft-Bauplaner/#/projekt/x/team', lead.live);
  assert.match(link, /^https:\/\/freadeax\.github\.io\/Minecraft-Bauplaner\/#\/team\/beitreten\?/);
  const inv = readInvite(link);
  assert.deepEqual(inv, { url: 'https://bauplaner-team.example.workers.dev', room: keys.room, key: keys.memberKey, kind: 'member' });
  assert.equal(readInvite(serverLink('https://x.example/#/a', lead.live, keys.serverKey)).kind, 'server');
  const pkg = await buildTeamPackage(lead, { member: 'bld_phil', name: 'Philipp' });
  assert.ok(!('live' in pkg.team) && !JSON.stringify(pkg).includes(keys.memberKey), 'no key in a package');
  assert.ok(!('live' in shareable(lead)));

  let anna = joinLive(createTeam({ name: 'Burg', founder: 'bld_phil', teamId: lead.teamId, at: lead.createdAt }), inv, 'dev_anna01');
  anna = sync(room, anna);
  assert.equal(teamView(anna, ctx).release.revisionNumber, 1, 'helper sees the release without any file');
  anna = appendLocal(anna, [teamEvent('bld_anna', { kind: 'member.join', member: 'bld_anna', name: 'Anna', player: 'Anna_MC' }, t()),
    teamEvent('bld_anna', { kind: 'section.claim', section: 'sec_a' }, t())]);
  assert.equal(nextBatch(anna).events.length, 2, 'one step = one batch');
  assert.equal(roomStatus(anna, true).state, 'waiting');
  anna = sync(room, anna);
  assert.equal(roomStatus(anna, true).state, 'live');

  // Server (plugin uplink) writes a measurement.
  const tally = teamEvent('bld_anna', { kind: 'build.tally', section: 'sec_a', placed: 64, broken: 0, from: t(), until: t() }, t(), 'server');
  assert.match(room.append({ batch: 'fake1', events: [tally] }, 'member').rejected[0].reason, /Nur der Server/, 'helpers cannot fake server measurements');
  assert.equal(await room.auth(keys.serverKey), 'server');
  await assert.rejects(() => room.auth(keys.serverKey, 'admin'), RoomError);
  room.append({ batch: 'srv1', events: [tally] }, 'server');

  // Lead was offline and took the same section later; also a note. Both sides converge.
  lead = appendLocal(lead, [teamEvent('bld_phil', { kind: 'section.claim', section: 'sec_a' }, t()), teamEvent('bld_phil', { kind: 'note.add', noteId: 'n1', text: 'Tor 3 breit', tag: 'info' }, t())]);
  assert.equal(roomStatus(lead, false).state, 'offline'); assert.equal(roomStatus(lead, false).pending, 2);
  lead = sync(room, lead); anna = sync(room, anna);
  const vl = teamView(lead, ctx), va = teamView(anna, ctx);
  assert.equal(vl.sections.find(s => s.sectionId === 'sec_a').owner, 'bld_anna');
  assert.deepEqual(va.sections, vl.sections);
  assert.equal(va.notes.length, 1);
  assert.equal(vl.members.find(m => m.id === 'bld_anna').placed, 64, 'server measurement live in the planner');
  assert.equal(vl.conflicts.length, 1, 'late claim is a visible hint, as offline');
  assert.equal(lead.events.length, anna.events.length);
});

test('lost answer: resending the same batch books nothing twice; big logs page through', async () => {
  const room = new RoomCore(new MemoryStore());
  const keys = await room.create({ room: 'r_page01', teamId: 'team_p', name: 'P' });
  let team = goLive(createTeam({ name: 'P', founder: 'bld_a', teamId: 'team_p' }), { url: 'https://x.example', room: keys.room, key: keys.memberKey }, 'dev_aaaa01');
  const many = Array.from({ length: 450 }, (_, i) => teamEvent('bld_a', { kind: 'note.add', noteId: `n${i}`, text: `Notiz ${i}`, tag: 'info' }, t()));
  team = appendLocal(team, many);
  const b = nextBatch(team);
  assert.equal(b.events.length, LIMITS.batch);
  room.append(b); // answer lost
  const again = room.append(b);
  assert.equal(again.accepted.length, LIMITS.batch);
  team = sync(room, team);
  assert.equal(room.store.count(), 450);
  let reader = joinLive(createTeam({ name: 'P', founder: 'bld_a', teamId: 'team_p' }), { url: 'https://x.example', room: keys.room, key: keys.memberKey }, 'dev_bbbb01');
  reader = sync(room, reader);
  assert.equal(reader.events.length, 450);
  assert.equal(retryDelay(0), 5000); assert.equal(retryDelay(10), 60000);
  assert.throws(() => checkLive({ ...reader.live, url: 'http://server.example' }), /https/);
});
