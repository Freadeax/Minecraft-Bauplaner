// COOP-11 „Verlauf verdichten“: digest of measurements, snapshots and closed notes; equal state, merge safety, room size.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTeam, teamEvent, appendEvents, mergeTeam, teamView, checkTeam, checkTeamEvent, compactTeam, compactBefore, digestInfo, digestProjection, effectiveEvents,
  DIGEST_PART_CHARS, MAX_TEAM_EVENTS, chestYield, teamChests,
} from '../dist/domain/src/index.js';

const ctx = {
  sections: [{ id: 'sec_a', name: 'Fundament' }, { id: 'sec_b', name: 'Rohbau' }],
  builders: [{ id: 'bld_phil', name: 'Philipp' }, { id: 'bld_anna', name: 'Anna' }, { id: 'bld_ben', name: 'Ben' }],
};
let clock;
const t = (min = 1) => new Date(clock += min * 60_000).toISOString();
const ev = (by, body, at = t()) => teamEvent(by, body, at);
const srv = (by, body, at = t()) => teamEvent(by, body, at, 'server');
const base = () => { clock = Date.parse('2026-10-01T08:00:00Z'); return createTeam({ name: 'Burg', founder: 'bld_phil', teamId: 'team_digest01', at: '2026-10-01T07:00:00Z' }); };

/** A busy month: tallies, chests with counts and moves, hoppers, yields, notes, mod sightings, a rejected event. */
function busy() {
  let team = base();
  const out = [
    ev('bld_phil', { kind: 'member.role', member: 'bld_anna', role: 'meister' }),
    ev('bld_anna', { kind: 'section.claim', section: 'sec_a' }),
    ev('bld_ben', { kind: 'section.claim', section: 'sec_b' }),
    srv('bld_phil', { kind: 'store.chest', chest: 'lager1', name: 'Hauptlager', pos: [10, 64, 10], dimension: 'minecraft:overworld' }),
    srv('bld_phil', { kind: 'store.chest', chest: 'farm1', name: 'Kakteen', pos: [40, 64, 10], dimension: 'minecraft:overworld' }),
    ev('bld_phil', { kind: 'store.config', chest: 'farm1', purpose: 'ertrag', farm: 'farm_kaktus' }),
    ev('bld_ben', { kind: 'section.claim', section: 'sec_a' }), // conflict, stays
    ev('bld_fremd', { kind: 'section.claim', section: 'sec_b' }), // rejected
  ];
  for (let day = 0; day < 20; day++) {
    out.push(srv('bld_anna', { kind: 'build.tally', section: 'sec_a', placed: 100 + day, broken: day % 3, blocks: [{ item: 'minecraft:stone', count: 60 + day }, { item: `minecraft:oak_planks`, count: 40 }], from: t(0), until: t(5) }));
    out.push(srv('bld_ben', { kind: 'build.tally', section: 'sec_b', placed: 50, broken: 1, blocks: [{ item: 'minecraft:glass', count: 50 }], from: t(0), until: t(5) }));
    out.push(srv('bld_anna', { kind: 'store.count', chest: 'lager1', items: [{ item: 'minecraft:stone', count: 1000 - day * 10 }, { item: 'minecraft:torch', count: 64 }] }));
    out.push(srv('bld_ben', { kind: 'store.move', chest: 'lager1', via: 'spieler', out: [{ item: 'minecraft:stone', count: 10 }] }));
    out.push(srv('bld_ben', { kind: 'store.move', chest: 'farm1', via: 'trichter', in: [{ item: 'minecraft:cactus', count: 12 }] }, t(1)));
    out.push(srv('bld_ben', { kind: 'store.move', chest: 'farm1', via: 'trichter', in: [{ item: 'minecraft:cactus', count: 12 }] }, t(1)));
    out.push(srv('bld_phil', { kind: 'store.yield', chest: 'farm1', farm: 'farm_kaktus', items: [{ item: 'minecraft:cactus', count: 240 }], from: t(0), until: t(60), minutes: 60 }));
    out.push(ev('bld_anna', { kind: 'section.seen', section: 'sec_a', placed: 100 * day, total: 5000 }));
    out.push(ev('bld_ben', { kind: 'store.seen', chest: 'lager1', items: [{ item: 'minecraft:stone', count: 990 - day * 10 }] }));
    out.push(ev('bld_anna', { kind: 'contribution', section: 'sec_a', blocks: 20, items: [{ item: 'minecraft:stone', count: 5 }] }));
    out.push(ev('bld_ben', { kind: 'note.add', noteId: `n${day}`, text: `Frage ${day}`, tag: 'frage' }));
    if (day % 2 === 0) out.push(ev('bld_anna', { kind: 'note.resolve', noteId: `n${day}` }));
    if (day === 5) out.push(srv('bld_phil', { kind: 'store.check', chest: 'lager1', status: 'abweichend', diff: [{ item: 'minecraft:torch', delta: -3 }] }));
    if (day === 8) out.push(srv('bld_anna', { kind: 'store.seal', chest: 'lager1', sha256: 'a'.repeat(64) }));
    if (day === 12) out.push(srv('bld_phil', { kind: 'store.check', chest: 'lager1', status: 'abweichend', diff: [{ item: 'minecraft:stone', delta: 4 }] }));
    clock += 86_400_000;
  }
  team = appendEvents(team, out);
  return team;
}

test('compacting keeps the visible state and shrinks the log', () => {
  const team = busy();
  const before = compactBefore(5, new Date(clock).toISOString());
  const plan = compactTeam(team, ctx, { before, by: 'bld_phil', run: 'run1' });
  assert.ok(plan.eventsAfter < plan.eventsBefore / 2, `${plan.eventsBefore} → ${plan.eventsAfter}`);
  assert.ok(plan.bytesAfter < plan.bytesBefore / 2);
  assert.equal(plan.rejectedDropped, 1);
  assert.equal(digestProjection(teamView(plan.team, ctx)), digestProjection(teamView(team, ctx)));
  const v = teamView(plan.team, ctx), v0 = teamView(team, ctx);
  assert.equal(v.members.find(m => m.id === 'bld_anna').placed, v0.members.find(m => m.id === 'bld_anna').placed);
  assert.deepEqual(v.stores.find(s => s.id === 'lager1').deviation, v0.stores.find(s => s.id === 'lager1').deviation);
  assert.equal(v.conflicts.length, v0.conflicts.length, 'section conflicts stay');
  assert.equal(v.rejected.length, 0, 'old rejections are gone');
  assert.ok(v.notes.every(n => !n.resolved || n.resolved.at > plan.cutoff.at), 'closed notes before the cutoff are gone');
  assert.ok(checkTeam(plan.team));
  for (const e of plan.team.events) if (e.kind === 'team.digest') {
    assert.ok(JSON.stringify(e).length <= 4096, 'every part fits into the team room');
    assert.equal(e.at, plan.cutoff.at);
  }
  // Events after the cutoff are untouched.
  const after = team.events.filter(e => e.at > before).map(e => e.id);
  const kept = new Set(plan.team.events.map(e => e.id));
  assert.ok(after.every(id => kept.has(id)));
});

test('the Produktion keeps yield and hopper rates after compacting', () => {
  const team = busy();
  const plan = compactTeam(team, ctx, { before: compactBefore(5, new Date(clock).toISOString()), by: 'bld_phil', run: 'run2' });
  const a = chestYield(team, 'farm1', 'farm_kaktus'), b = chestYield(plan.team, 'farm1', 'farm_kaktus');
  assert.equal(b.basis, 'server');
  assert.deepEqual(b.items, a.items);
  assert.equal(b.hours, a.hours);
  assert.deepEqual(teamChests(plan.team).find(c => c.id === 'farm1').hopperIn, teamChests(team).find(c => c.id === 'farm1').hopperIn);
});

test('hopper estimate survives without yield reports', () => {
  let team = base();
  team = appendEvents(team, [srv('bld_phil', { kind: 'store.chest', chest: 'h1', name: 'Trichter', pos: [0, 64, 0], dimension: 'minecraft:overworld' })]);
  const moves = [];
  for (let i = 0; i < 40; i++) moves.push(srv('bld_phil', { kind: 'store.move', chest: 'h1', via: 'trichter', in: [{ item: 'minecraft:kelp', count: 3 }] }, t(1)));
  clock += 20 * 86_400_000;
  moves.push(ev('bld_phil', { kind: 'note.add', noteId: 'x', text: 'später', tag: 'info' }));
  team = appendEvents(team, moves);
  const plan = compactTeam(team, ctx, { before: compactBefore(5, new Date(clock).toISOString()), by: 'bld_phil', run: 'run3' });
  const a = chestYield(team, 'h1'), b = chestYield(plan.team, 'h1');
  assert.equal(b.basis, 'trichter');
  assert.deepEqual(b.items, a.items);
  assert.ok(Math.abs(b.hours - a.hours) < 0.02, `${a.hours} ≈ ${b.hours}`);
});

test('merging an old copy does not bring replaced events back and counts nothing twice', () => {
  const team = busy();
  const plan = compactTeam(team, ctx, { before: compactBefore(5, new Date(clock).toISOString()), by: 'bld_phil', run: 'run4' });
  const m1 = mergeTeam(plan.team, team), m2 = mergeTeam(team, plan.team);
  // Rejected events come back from the old copy (they are not part of the digest) but stay without effect.
  assert.equal(m1.team.events.length, plan.team.events.length + plan.rejectedDropped);
  assert.deepEqual(m1.team.events.map(e => e.id), m2.team.events.map(e => e.id), 'commutative');
  assert.ok(m1.pruned > 0);
  assert.equal(digestProjection(teamView(m2.team, ctx)), digestProjection(teamView(team, ctx)));
  // Idempotent.
  assert.equal(mergeTeam(m1.team, m1.team).team.events.length, m1.team.events.length);
  // An old copy that only has some of the events (a member who was away) adds nothing old either.
  const partial = { ...team, events: team.events.filter((_, i) => i % 3 === 0) };
  assert.ok(mergeTeam(plan.team, partial).team.events.length <= plan.team.events.length + plan.rejectedDropped);
});

test('the fold ignores replaced events even when they are still in the log', () => {
  const team = busy();
  const plan = compactTeam(team, ctx, { before: compactBefore(5, new Date(clock).toISOString()), by: 'bld_phil', run: 'run5' });
  const digest = plan.team.events.filter(e => e.kind === 'team.digest');
  const unpruned = { ...team, events: [...team.events, ...digest].sort((a, b) => a.at < b.at ? -1 : a.at > b.at ? 1 : a.id < b.id ? -1 : 1) };
  assert.equal(digestProjection(teamView(unpruned, ctx)), digestProjection(teamView(team, ctx)));
  assert.equal(effectiveEvents(unpruned).length, plan.team.events.length + plan.rejectedDropped);
});

test('compacting twice builds on the first digest', () => {
  const team = busy();
  const now = new Date(clock).toISOString();
  const p1 = compactTeam(team, ctx, { before: compactBefore(12, now), by: 'bld_phil', run: 'runa' });
  const p2 = compactTeam(p1.team, ctx, { before: compactBefore(3, now), by: 'bld_phil', run: 'runb' });
  assert.equal(digestInfo(p2.team).run, 'runb');
  assert.ok(p2.team.events.every(e => e.kind !== 'team.digest' || e.id.includes('.runb.')), 'the older digest is replaced');
  assert.equal(digestProjection(teamView(p2.team, ctx)), digestProjection(teamView(team, ctx)));
  // A device that only got the first digest merges the second: same state.
  const m = mergeTeam(p1.team, p2.team);
  assert.equal(digestProjection(teamView(m.team, ctx)), digestProjection(teamView(team, ctx)));
  assert.throws(() => compactTeam(p2.team, ctx, { before: compactBefore(12, now), by: 'bld_phil' }), /schon bis/);
});

test('only a Bauleitung at the cutoff can compact; a forged or incomplete digest has no effect', () => {
  const team = busy();
  const before = compactBefore(5, new Date(clock).toISOString());
  assert.throws(() => compactTeam(team, ctx, { before, by: 'bld_anna' }), /Bauleitung/);
  const plan = compactTeam(team, ctx, { before, by: 'bld_phil', run: 'run6' });
  const digest = plan.team.events.filter(e => e.kind === 'team.digest');
  // Same digest written by a Baumeister: not in force, nothing is skipped.
  const forged = digest.map(e => ({ ...e, by: 'bld_anna', id: e.id.replace('.run6.', '.fake.'), run: 'fake' }));
  const withForged = mergeTeam(team, { ...team, events: forged }).team;
  assert.equal(digestInfo(withForged), null);
  assert.equal(digestProjection(teamView(withForged, ctx)), digestProjection(teamView(team, ctx)));
  // Only some parts arrived (room sync in progress): not in force yet.
  if (digest.length > 1) {
    const half = mergeTeam(team, { ...team, events: digest.slice(0, 1) }).team;
    assert.equal(digestInfo(half), null);
    assert.equal(half.events.length, team.events.length + 1);
  }
});

test('digest events are checked like every event', () => {
  const team = busy();
  const plan = compactTeam(team, ctx, { before: compactBefore(5, new Date(clock).toISOString()), by: 'bld_phil', run: 'run7' });
  const d = plan.team.events.find(e => e.kind === 'team.digest');
  assert.ok(checkTeamEvent(d));
  assert.throws(() => checkTeamEvent({ ...d, part: 5, parts: 2 }), /Teil/);
  assert.throws(() => checkTeamEvent({ ...d, run: 'X!' }), /Lauf/);
  assert.throws(() => checkTeamEvent({ ...d, tallies: [{ member: 'a', section: 'b', placed: -1, broken: 0, from: d.at, until: d.at }] }), /gesetzt/);
  assert.ok(DIGEST_PART_CHARS < 4096);
});

test('nothing to compact and a full log', () => {
  const team = busy();
  assert.throws(() => compactTeam(team, ctx, { before: '2020-01-01T00:00:00.000Z', by: 'bld_phil' }), /nichts zu verdichten/);
  assert.ok(MAX_TEAM_EVENTS >= 20_000);
});

test('team live: the digest goes into the outbox, replaced pending events leave it', async () => {
  const { goLive, trackOutbox, nextBatch } = await import('../dist/domain/src/index.js');
  const team = busy();
  const live = goLive(team, { url: 'https://room.example.net', room: 'room_digest1', key: 'k'.repeat(24) }, 'dev_digest01');
  const plan = compactTeam(live, ctx, { before: compactBefore(5, new Date(clock).toISOString()), by: 'bld_phil', run: 'run8' });
  const next = trackOutbox(live, plan.team);
  const ids = new Set(next.events.map(e => e.id));
  assert.ok(next.live.pending.every(id => ids.has(id)), 'no pending id without its event');
  assert.ok(next.events.filter(e => e.kind === 'team.digest').every(e => next.live.pending.includes(e.id)), 'all digest parts are pending');
  assert.ok(nextBatch(next).events.length > 0);
  assert.equal(next.live.url, 'https://room.example.net', 'local fields stay');
});
