// TEAM-02 (docs/architecture/team/TEAM_LIVE.md §13): concurrent changes in the Team-Raum – revision check per subject,
// repeated and half-failed batches, rooms from before TEAM-02, reconnect timings and the checked team undo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RoomCore, MemoryStore, GUARDED_KINDS as ROOM_GUARDED, subjectsOf as roomSubjects } from '../../../services/team-room/src/core.js';
import {
  createTeam, teamEvent, teamView, goLive, joinLive, appendLocal, nextBatch, confirm, ingest, GUARDED_KINDS, subjectsOf, reconnectDelay, linkDead, LINK_TIMING,
  teamUndo, undoableSteps, trackOutbox, appendEvents, laterThan,
} from '../../../dist/domain/src/index.js';

const ctx = { sections: [{ id: 'sec_a', name: 'Fundament' }, { id: 'sec_b', name: 'Rohbau' }], builders: [] };
let clock = Date.parse('2026-11-06T18:00:00Z');
const t = () => new Date(clock += 60_000).toISOString();

/** Sends the outbox; returns the team and the stale steps. */
function send(room, team) {
  let batch; const stale = [];
  while ((batch = nextBatch(team))) { const c = confirm(team, room.append(batch, team.live.adminKey ? 'admin' : 'member')); team = c.team; stale.push(...c.stale); }
  return { team, stale };
}
function read(room, team) {
  let feed;
  do { feed = room.since(team.live.cursor); team = ingest(team, feed).team; } while (feed.more);
  return team;
}
const sync = (room, team) => read(room, send(room, team).team);
/** A local step like the planner's act(): appended with a time after everything known, outbox tracked. */
const step = (team, by, body) => trackOutbox(team, appendEvents(team, [teamEvent(by, body, laterThan(team, t()))]));
const owner = (team, s = 'sec_a') => teamView(team, ctx).sections.find(x => x.sectionId === s)?.owner ?? null;

/** Lead with Anna (helfer) and Ben (helfer), all three live in one room. */
async function threeLive() {
  const room = new RoomCore(new MemoryStore());
  let lead = createTeam({ name: 'Burg', founder: 'bld_phil', teamId: 'team_c', at: '2026-11-06T17:00:00Z' });
  lead = appendEvents(lead, ['anna', 'ben'].map(n => teamEvent(`bld_${n}`, { kind: 'member.join', member: `bld_${n}`, name: n }, t())));
  lead = appendEvents(lead, ['anna', 'ben'].map(n => teamEvent('bld_phil', { kind: 'member.role', member: `bld_${n}`, role: 'helfer' }, t())));
  const keys = await room.create({ room: 'r_conc01', teamId: lead.teamId, name: lead.name });
  lead = sync(room, goLive(lead, { url: 'https://x.example', room: keys.room, key: keys.memberKey, adminKey: keys.adminKey }, 'dev_lead01'));
  const join = (self, device) => sync(room, joinLive({ ...createTeam({ name: 'Burg', founder: 'bld_phil', teamId: lead.teamId, at: lead.createdAt }), self }, { url: 'https://x.example', room: keys.room, key: keys.memberKey }, device));
  return { room, keys, lead, anna: join('bld_anna', 'dev_anna01'), ben: join('bld_ben', 'dev_ben001') };
}

test('room and planner guard the same kinds and subjects', () => {
  assert.deepEqual([...ROOM_GUARDED], [...GUARDED_KINDS]);
  const samples = [
    teamEvent('a', { kind: 'section.assign', section: 'sec_a', member: 'b' }), teamEvent('a', { kind: 'member.role', member: 'b', role: 'meister' }),
    teamEvent('a', { kind: 'note.resolve', noteId: 'n1' }), teamEvent('a', { kind: 'store.config', chest: 'c1', section: 'sec_b' }),
    teamEvent('a', { kind: 'section.seen', section: 'sec_a', placed: 1, total: 2 }), teamEvent('a', { kind: 'note.add', noteId: 'n2', text: 'x', tag: 'info' }),
  ];
  for (const e of samples) assert.deepEqual(roomSubjects(e), subjectsOf(e), e.kind);
  assert.deepEqual(subjectsOf(samples[0]), ['section:sec_a'], 'the assigned member is a target, not the subject');
  assert.deepEqual(subjectsOf(samples[3]), ['section:sec_b', 'chest:c1']);
  assert.deepEqual(subjectsOf(samples[4]), [], 'observations stay unguarded');
});

test('two helpers take the same section at the same time: the first wins, the second step is refused as stale and leaves the log', async () => {
  let { room, lead, anna, ben } = await threeLive();
  anna = step(anna, 'bld_anna', { kind: 'section.claim', section: 'sec_a' });
  ben = step(ben, 'bld_ben', { kind: 'section.claim', section: 'sec_a' });
  assert.ok(nextBatch(ben).guards, 'own deciding step carries its read cursor');
  anna = sync(room, anna);
  const r = send(room, ben);
  assert.equal(r.stale.length, 1); assert.equal(r.stale[0].by, 'bld_anna'); assert.equal(r.stale[0].subject, 'section:sec_a');
  assert.equal(r.stale[0].event.kind, 'section.claim', 'the hint knows which step it was');
  ben = read(room, r.team);
  lead = sync(room, lead);
  for (const x of [lead, anna, ben]) { assert.equal(owner(x), 'bld_anna'); assert.equal(teamView(x, ctx).conflicts.length, 0); }
  assert.equal(ben.live.pending.length, 0); assert.ok(!ben.live.bases, 'bases leave with the outbox');
  assert.deepEqual(ben.events.map(e => e.id), anna.events.map(e => e.id), 'all three hold the same log');

  // Ben read Anna's claim first – now his step is based on it and goes through (no false alarm).
  ben = step(ben, 'bld_ben', { kind: 'section.claim', section: 'sec_b' });
  ben = sync(room, ben);
  assert.equal(owner(ben, 'sec_b'), 'bld_ben');
});

test('own steps never block each other; steps on other subjects and unguarded observations pass', async () => {
  let { room, anna, ben } = await threeLive();
  anna = step(anna, 'bld_anna', { kind: 'section.claim', section: 'sec_a' });
  anna = step(anna, 'bld_anna', { kind: 'section.done', section: 'sec_a' });
  ben = step(ben, 'bld_ben', { kind: 'section.claim', section: 'sec_b' });
  ben = appendLocal(ben, [teamEvent('bld_ben', { kind: 'section.seen', section: 'sec_a', placed: 3, total: 9 }, t())]);
  const before = room.store.count();
  assert.equal(send(room, anna).stale.length, 0);
  const r = send(room, ben);
  assert.equal(r.stale.length, 0, 'other section and observation are not refused');
  assert.equal(room.store.count(), before + 4);
});

test('the mod writes without guards (old clients unchanged), but a planner step based on an older state is refused', async () => {
  let { room, lead, anna } = await threeLive();
  anna = sync(room, step(anna, 'bld_anna', { kind: 'section.claim', section: 'sec_a' }));
  lead = sync(room, lead);
  // Anna's mod releases the section (no guards, like RoomClient.java) – always accepted.
  const fromMod = teamEvent('bld_anna', { kind: 'section.release', section: 'sec_a' }, t());
  const a = room.append({ batch: 'mod_1', events: [fromMod] });
  assert.deepEqual(a.accepted, [fromMod.id]); assert.equal(a.stale, undefined, 'answer for old clients unchanged');
  // The lead had not seen it and assigns the section to Ben: stale.
  lead = step(lead, 'bld_phil', { kind: 'section.assign', section: 'sec_a', member: 'bld_ben' });
  const r = send(room, lead);
  assert.equal(r.stale.length, 1); assert.equal(r.stale[0].by, 'bld_anna');
  lead = read(room, r.team);
  assert.equal(owner(lead), null, 'the lead sees the release instead of a state no one else has');
});

test('repeated batch after a lost answer and a batch failing halfway: nothing twice, nothing half', async () => {
  let { room, anna } = await threeLive();
  anna = step(anna, 'bld_anna', { kind: 'section.claim', section: 'sec_a' });
  anna = appendLocal(anna, [teamEvent('bld_anna', { kind: 'note.add', noteId: 'n1', text: 'Tor', tag: 'info' }, t())]);
  const b = nextBatch(anna), before = room.store.count();
  const first = room.append(b); // answer lost
  const again = room.append(b);
  assert.equal(again.repeated, true); assert.deepEqual(again.accepted, first.accepted);
  assert.equal(room.store.count(), before + 2);
  // Same events in a new batch (other device of Anna, or the batch answer was dropped from memory): known, not new.
  assert.deepEqual(room.append({ ...b, batch: 'b_other' }).known.length, 2);

  // A storage error after the first event: the transaction leaves no half batch, the retry books both.
  const store = room.store, append = store.appendEvent.bind(store);
  let n = 0; store.appendEvent = (id, json) => { if (++n === 2) throw new Error('Speicher weg'); return append(id, json); };
  const two = [teamEvent('bld_anna', { kind: 'note.add', noteId: 'n2', text: 'a', tag: 'info' }, t()), teamEvent('bld_anna', { kind: 'note.add', noteId: 'n3', text: 'b', tag: 'info' }, t())];
  const count = store.count();
  assert.throws(() => room.append({ batch: 'b_half', events: two }), /Speicher weg/);
  assert.equal(store.count(), count, 'nothing of the failed batch stays');
  assert.equal(store.getBatch('b_half'), undefined, 'and no answer is remembered for it');
  store.appendEvent = append;
  assert.equal(room.append({ batch: 'b_half', events: two }).accepted.length, 2);
});

test('rooms from before TEAM-02 learn their subjects from the stored events', async () => {
  const { room, keys } = await threeLive();
  const claim = teamEvent('bld_anna', { kind: 'section.claim', section: 'sec_a' }, t());
  room.store.appendEvent(claim.id, JSON.stringify(claim)); // written by an old room version: no subject row
  room.store.subjects.clear(); room.store.setMeta('subjects', undefined);
  const late = teamEvent('bld_ben', { kind: 'section.claim', section: 'sec_a' }, t());
  const a = room.append({ batch: 'b_old', events: [late], guards: { [late.id]: '0' } });
  assert.equal(a.stale?.[0]?.by, 'bld_anna');
  assert.ok(keys.room);
  // Guards with a cursor this room never had (e.g. after a reset) are no check at all.
  const other = teamEvent('bld_ben', { kind: 'section.claim', section: 'sec_b' }, t());
  assert.deepEqual(room.append({ batch: 'b_reset', events: [other], guards: { [other.id]: '999999' } }).accepted, [other.id]);
  assert.throws(() => room.append({ batch: 'b_bad', events: [], guards: [1] }), /Revisionsprüfung/);
});

test('reconnect: spread pause, first try fast, dead line detected', () => {
  assert.equal(reconnectDelay(0, () => 0.5), 1000);
  assert.equal(reconnectDelay(1, () => 0.5), 5000);
  assert.equal(reconnectDelay(9, () => 0.5), 60000);
  assert.equal(reconnectDelay(1, () => 0), 3750); assert.equal(reconnectDelay(1, () => 1), 6250);
  const spread = new Set(Array.from({ length: 20 }, () => reconnectDelay(3)));
  assert.ok(spread.size > 5, 'browsers do not all knock at the same second');
  assert.equal(linkDead(0, LINK_TIMING.deadMs), false); assert.equal(linkDead(0, LINK_TIMING.deadMs + 1), true);
  assert.ok(LINK_TIMING.pingMs * 2 < LINK_TIMING.deadMs, 'two pings fit before the line counts as dead');
});

test('team undo: checked counter steps – own step, nobody decided after it, passes rights and the room', async () => {
  let { room, lead, anna, ben } = await threeLive();
  anna = sync(room, step(anna, 'bld_anna', { kind: 'section.claim', section: 'sec_a' }));
  const claim = anna.events.at(-1);
  const u = teamUndo(anna, ctx, claim.id, 'bld_anna');
  assert.equal(u.ok, true); assert.deepEqual(u.body, { kind: 'section.release', section: 'sec_a' });
  assert.equal(teamUndo(anna, ctx, claim.id, 'bld_ben').ok, false, 'only the author');
  anna = sync(room, step(anna, 'bld_anna', u.body));
  ben = sync(room, ben);
  assert.equal(owner(ben), null, 'the counter step reached the others');
  assert.equal(teamUndo(anna, ctx, claim.id, 'bld_anna').ok, false, 'an undone step is not undone twice');

  // Release undone → claim again; assign undone → previous owner back.
  const release = anna.events.at(-1);
  assert.deepEqual(teamUndo(anna, ctx, release.id, 'bld_anna').body, { kind: 'section.claim', section: 'sec_a' });
  ben = sync(room, step(ben, 'bld_ben', { kind: 'section.claim', section: 'sec_a' }));
  anna = read(room, anna);
  const blocked = teamUndo(anna, ctx, release.id, 'bld_anna');
  assert.equal(blocked.ok, false); assert.match(blocked.reason, /jemand anderes/, 'would overwrite Ben');

  lead = sync(room, lead);
  lead = sync(room, step(lead, 'bld_phil', { kind: 'section.assign', section: 'sec_a', member: 'bld_anna' }));
  const assign = lead.events.at(-1);
  assert.deepEqual(teamUndo(lead, ctx, assign.id, 'bld_phil').body, { kind: 'section.assign', section: 'sec_a', member: 'bld_ben' });

  // Race in the last second: Anna (now owner) releases while the lead undoes the assignment – the room keeps Anna's step.
  anna = read(room, anna);
  anna = sync(room, step(anna, 'bld_anna', { kind: 'section.release', section: 'sec_a' }));
  const undo = teamUndo(lead, ctx, assign.id, 'bld_phil');
  assert.equal(undo.ok, true, 'locally it still looks fine');
  const r = send(room, step(lead, 'bld_phil', undo.body));
  assert.equal(r.stale.length, 1, 'the room refuses the counter step');
  lead = read(room, r.team);
  assert.equal(owner(lead), null);
});

test('team undo: notes, gathering, roles and kinds without counterpart', async () => {
  let { lead } = await threeLive();
  lead = step(lead, 'bld_phil', { kind: 'note.add', noteId: 'n9', text: 'Falsche Notiz', tag: 'info' });
  lead = step(lead, 'bld_phil', { kind: 'gather.claim', item: 'minecraft:oak_log', count: 64 });
  lead = step(lead, 'bld_phil', { kind: 'member.role', member: 'bld_ben', role: 'meister' });
  lead = step(lead, 'bld_phil', { kind: 'plan.release', revisionId: 'rev_1', revisionNumber: 1, summary: 'x' });
  const steps = undoableSteps(lead, ctx, 'bld_phil', 4);
  assert.deepEqual(steps.map(s => s.event.kind), ['plan.release', 'member.role', 'gather.claim', 'note.add']);
  assert.equal(steps[0].ok, false); assert.match(steps[0].reason, /neue Freigabe/);
  assert.deepEqual(steps[1].body, { kind: 'member.role', member: 'bld_ben', role: 'helfer' });
  assert.deepEqual(steps[2].body, { kind: 'gather.claim', item: 'minecraft:oak_log', count: 0 });
  assert.deepEqual(steps[3].body, { kind: 'note.resolve', noteId: 'n9', text: 'zurückgenommen' });
  const server = teamEvent('bld_phil', { kind: 'build.tally', section: 'sec_a', placed: 1, broken: 0, from: t(), until: t() }, t(), 'server');
  lead = appendEvents(lead, [server]);
  assert.equal(teamUndo(lead, ctx, server.id, 'bld_phil').ok, false);
  assert.equal(teamUndo(lead, ctx, 'gibt-es-nicht', 'bld_phil'), null);
});
