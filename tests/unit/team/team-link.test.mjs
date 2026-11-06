import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTeam, teamEvent, appendEvents, mergeTeam, teamView, teamLinkState, readLiveTeam, readLiveTeamPull, teamLinkProblem, teamLinkText, TEAM_LINK_WAY_TEXT, LIVE_FEATURE_TEAM,
} from '../../../dist/domain/src/index.js';

// COOP-03: planner ↔ Build Studio mod (docs/architecture/team/TEAMBAU.md §7).
const ctx = {
  sections: [{ id: 'sec_a', name: 'Fundament' }, { id: 'sec_b', name: 'Rohbau' }, { id: 'sec_c', name: 'Dach' }],
  builders: [{ id: 'bld_phil', name: 'Philipp' }, { id: 'bld_anna', name: 'Anna' }],
};
const base = () => createTeam({ name: 'Burg am See', founder: 'bld_phil', teamId: 'team_link0001', at: '2026-11-03T09:00:00Z' });

test('team link state: sections numbered in build order, owners, open notes, me', () => {
  let team = appendEvents(base(), [
    teamEvent('bld_phil', { kind: 'member.player', member: 'bld_anna', player: 'AnnaBaut' }, '2026-11-03T09:01:00Z'),
    teamEvent('bld_anna', { kind: 'section.claim', section: 'sec_b' }, '2026-11-03T09:02:00Z'),
    teamEvent('bld_anna', { kind: 'note.add', noteId: 'n1', text: 'Holz fehlt', tag: 'material', section: 'sec_b' }, '2026-11-03T09:03:00Z'),
    teamEvent('bld_anna', { kind: 'note.add', noteId: 'n2', text: 'erledigt', tag: 'info' }, '2026-11-03T09:04:00Z'),
    teamEvent('bld_anna', { kind: 'note.resolve', noteId: 'n2' }, '2026-11-03T09:05:00Z'),
  ]);
  team = { ...team, self: 'bld_anna' };
  const s = teamLinkState(team, teamView(team, ctx), ctx, { dimension: 'minecraft:overworld', at: '2026-11-03T10:00:00Z' });
  assert.equal(s.teamId, 'team_link0001');
  assert.equal(s.me, 'bld_anna');
  assert.equal(s.dimension, 'minecraft:overworld');
  assert.deepEqual(s.sections.map(x => [x.nr, x.id, x.status, x.owner ?? null]), [[1, 'sec_a', 'frei', null], [2, 'sec_b', 'vergeben', 'bld_anna'], [3, 'sec_c', 'frei', null]]);
  assert.equal(s.members.find(m => m.id === 'bld_anna').player, 'AnnaBaut');
  assert.equal(s.members.find(m => m.id === 'bld_phil').role, 'leitung');
  assert.deepEqual(s.notes.map(n => n.id), ['n1'], 'resolved notes stay out of the game');
  assert.equal(LIVE_FEATURE_TEAM, 'team');
});

test('reading the mod: outbox events merge as planner events, malformed ones are dropped', () => {
  const claim = { id: 'tev_mabcdefghijklmno', at: '2026-11-03T10:01:00Z', by: 'bld_anna', origin: 'planer', kind: 'section.claim', section: 'sec_a' };
  const live = readLiveTeam({ link: 'live', allowed: true, outbox: [claim, { id: 'x', kind: 'section.claim' }], waiting: 2, rejections: ['Abschnitt 1 ist schon vergeben', 7],
    server: { teamId: 'team_link0001', name: 'Burg am See', revision: 3, stores: 4 }, shown: { teamId: 'team_link0001', name: 'Burg am See', source: 'server', sections: 3 } });
  assert.equal(live.way, 'live');
  assert.equal(live.wayText, TEAM_LINK_WAY_TEXT.live);
  assert.deepEqual(live.outbox.map(e => e.id), [claim.id]);
  assert.equal(live.waiting, 2);
  assert.deepEqual(live.rejections, ['Abschnitt 1 ist schon vergeben']);
  assert.equal(live.server.stores, 4);
  assert.equal(live.shown.source, 'server');
  const merge = mergeTeam(base(), { ...base(), events: live.outbox });
  assert.equal(merge.added.length, 1);
  assert.equal(teamView(merge.team, ctx).sections.find(x => x.sectionId === 'sec_a').owner, 'bld_anna');
  assert.equal(mergeTeam(merge.team, { ...base(), events: live.outbox }).added.length, 0, 'resending is harmless');
  assert.equal(readLiveTeam({ link: 'quatsch' }).way, 'none');
  assert.throws(() => readLiveTeam(null));
});

test('server pull and error codes', () => {
  const ev = { id: 'tev_s1', at: '2026-11-03T10:02:00Z', by: 'bld_anna', origin: 'server', kind: 'section.done', section: 'sec_a' };
  const p = readLiveTeamPull({ teamId: 'team_link0001', name: 'Burg', events: [ev], more: true, total: 9 });
  assert.equal(p.events.length, 1);
  assert.equal(p.more, true);
  assert.throws(() => readLiveTeamPull({ teamId: 'team_link0001', events: [{ ...ev, origin: 'woanders' }] }));
  assert.equal(teamLinkProblem('team-plugin-fehlt: Der Server hat kein Plugin'), 'team-plugin-fehlt');
  assert.equal(teamLinkProblem('team-nicht-erlaubt: …'), 'team-nicht-erlaubt');
  assert.equal(teamLinkProblem('Zeitüberschreitung'), null);
  assert.equal(teamLinkText('team-plugin-fehlt: Der Server hat kein Plugin'), 'Der Server hat kein Plugin');
});
