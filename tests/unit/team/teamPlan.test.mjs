import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTeam, teamEvent, appendEvents, teamView, emptySite, splitSection, sectionWork, suggestTeamAssignment, teamSchedule, teamMaterials, sectionNeeds,
  packingText, teamProgress, teamIssues, releaseChanges, rightsMatrix, calendarAfter, checkSite,
} from '../../../dist/domain/src/index.js';

// A synthetic guide: tower (instance "turm", 8 layers, 100 blocks each), wall (instance "mauer", 4 layers, 50 each),
// gate (instance "tor", 2 layers, 30 each). Each layer rests on the layer below (prerequisite).
function guideOf(spec, hashSalt = {}) {
  const steps = [];
  let order = 0;
  for (const [instanceId, layers, blocks] of spec) {
    for (let layer = 0; layer < layers; layer++) {
      const id = `${instanceId}/${layer}/structure`;
      steps.push({ id, order: ++order, instanceId, layer, blocks, erase: 0, prerequisites: layer ? [`${instanceId}/${layer - 1}/structure`] : [],
        geometryHash: `h-${id}-${hashSalt[id] ?? 0}`, positions: [], materials: [], y: layer, phase: 'structure', sectionName: instanceId });
    }
  }
  return { steps, byId: new Map(steps.map(s => [s.id, s])), warnings: [], totals: { blocks: steps.reduce((n, s) => n + s.blocks, 0), air: 0, erase: 0 } };
}
const SPEC = [['turm', 8, 100], ['mauer', 4, 50], ['tor', 2, 30]];
const site0 = () => ({ ...emptySite(), sections: [
  { id: 'sec_fund', name: 'Fundament', members: [{ instanceId: 'turm', fromLayer: 0, toLayer: 0 }, { instanceId: 'mauer', fromLayer: 0, toLayer: 0 }, { instanceId: 'tor', fromLayer: 0, toLayer: 0 }] },
  { id: 'sec_bau', name: 'Rohbau', members: [{ instanceId: 'turm', fromLayer: 1 }, { instanceId: 'mauer', fromLayer: 1 }, { instanceId: 'tor', fromLayer: 1 }] },
] });
const noProgress = { status: new Map() };
const ids = () => { let n = 0; return () => `sec_new${++n}`; };

let clock = Date.parse('2026-11-03T10:00:00Z');
const t = (min = 1) => new Date(clock += min * 60_000).toISOString();
const ev = (by, body, at = t()) => teamEvent(by, body, at);
const team0 = () => appendEvents(createTeam({ name: 'Burg', founder: 'bld_phil', teamId: 'team_plan0001', at: '2026-11-03T09:00:00Z' }), [
  ev('bld_phil', { kind: 'member.join', member: 'bld_phil', name: 'Philipp' }),
  ev('bld_anna', { kind: 'member.join', member: 'bld_anna', name: 'Anna' }),
  ev('bld_ben', { kind: 'member.join', member: 'bld_ben', name: 'Ben' }),
]);
const ctxOf = site => ({ sections: site.sections.map(s => ({ id: s.id, name: s.name })), builders: [] });

test('split by layers: balanced, keeps first id, coverage identical, open ends kept', () => {
  const guide = guideOf(SPEC), site = site0();
  const r = splitSection(site, guide, { sectionId: 'sec_bau', parts: 3, mode: 'layers', makeId: ids() });
  checkSite(r.site);
  assert.equal(r.mode, 'layers');
  assert.equal(r.site.sections.length, 4);
  assert.equal(r.site.sections[1].id, 'sec_bau', 'first package keeps the section id');
  assert.deepEqual(r.site.sections.map(s => s.name), ['Fundament', 'Rohbau · Teil 1/3', 'Rohbau · Teil 2/3', 'Rohbau · Teil 3/3']);
  // every step of the old section lands in exactly one package, nothing else moves
  const before = sectionWork(site, guide, noProgress), after = sectionWork(r.site, guide, noProgress);
  assert.equal(after[0].work, before[0].work);
  assert.equal(after.slice(1).reduce((n, w) => n + w.work, 0), before[1].work);
  assert.ok(r.balance < 1.35, `balanced (${r.balance})`);
  // the last package touching an instance keeps the open end (later layers stay covered)
  const last = r.site.sections.at(-1);
  assert.ok(last.members.some(m => m.toLayer === undefined));
  // layer packages rest on each other
  assert.deepEqual(after[2].dependsOn.includes('sec_bau'), true);
});

test('split by instances: whole parts, independent packages; refuses too few steps and too many sections', () => {
  const guide = guideOf(SPEC), site = site0();
  const r = splitSection(site, guide, { sectionId: 'sec_bau', parts: 2, mode: 'instances', makeId: ids() });
  assert.equal(r.mode, 'instances');
  const parts = r.site.sections.slice(1);
  assert.equal(parts.length, 2);
  for (const p of parts) for (const m of p.members) assert.equal(m.toLayer, undefined, 'whole instance');
  const names = parts.map(p => p.members.map(m => m.instanceId).sort().join('+')).sort();
  assert.deepEqual(names, ['mauer+tor', 'turm'], 'largest part alone, the others together');
  const w = sectionWork(r.site, guide, noProgress);
  assert.deepEqual(w[2].dependsOn, ['sec_fund'], 'side-by-side packages only rest on the foundation');
  // auto picks instances when there are enough of them
  assert.equal(splitSection(site, guide, { sectionId: 'sec_bau', parts: 3, makeId: ids() }).mode, 'instances');
  assert.equal(splitSection(site, guide, { sectionId: 'sec_bau', parts: 5, makeId: ids() }).mode, 'layers');
  assert.throws(() => splitSection(site, guideOf([['turm', 1, 10]]), { sectionId: 'sec_fund', parts: 2, makeId: ids() }), /zu wenig/);
  const full = { ...site, sections: [...site.sections, ...Array.from({ length: 61 }, (_, i) => ({ id: `x${i}`, name: `x${i}`, members: [] }))] };
  assert.throws(() => splitSection(full, guide, { sectionId: 'sec_bau', parts: 4, mode: 'layers', makeId: ids() }), /Höchstens 64/);
});

test('assignment proposal: least load, chains stay with one builder, away and guests skipped, owned sections untouched', () => {
  const guide = guideOf(SPEC);
  const site = splitSection(site0(), guide, { sectionId: 'sec_bau', parts: 3, mode: 'layers', makeId: ids() }).site;
  const team = appendEvents(team0(), [ev('bld_ben', { kind: 'section.claim', section: 'sec_fund' }), ev('bld_gast', { kind: 'member.join', member: 'bld_gast', name: 'Gast' }),
    ev('bld_phil', { kind: 'member.role', member: 'bld_gast', role: 'gast' })]);
  const view = teamView(team, ctxOf(site));
  // Philipp is away (view gets away from the member, injected here like the team fold does)
  const viewAway = { ...view, members: view.members.map(m => m.id === 'bld_phil' ? { ...m, away: { until: '2026-11-10' } } : m) };
  const work = sectionWork(site, guide, noProgress);
  const p = suggestTeamAssignment({ view: viewAway, work, today: '2026-11-03T12:00:00Z' });
  assert.ok(!p.some(x => x.sectionId === 'sec_fund'), 'owned section stays');
  assert.ok(!p.some(x => x.member === 'bld_phil' || x.member === 'bld_gast'));
  assert.equal(p.length, 3);
  // Anna has no load and takes the first package; the following layer packages rest on it and stay with her unless she becomes much busier
  assert.equal(p[0].member, 'bld_anna');
  assert.ok(p.every(x => typeof x.reason === 'string' && x.reason));
  const p2 = suggestTeamAssignment({ view, work, today: '2026-11-03T12:00:00Z' });
  assert.ok(p2.some(x => x.member === 'bld_phil'), 'present Bauleitung builds too');
});

test('schedule: parallel lanes, dependencies wait, absence shifts, critical path, calendar', () => {
  const guide = guideOf(SPEC);
  const site = splitSection(site0(), guide, { sectionId: 'sec_bau', parts: 2, mode: 'instances', makeId: ids() }).site;
  const team = appendEvents(team0(), [
    ev('bld_phil', { kind: 'section.assign', section: 'sec_fund', member: 'bld_anna' }),
    ev('bld_phil', { kind: 'section.assign', section: site.sections[1].id, member: 'bld_anna' }),
    ev('bld_phil', { kind: 'section.assign', section: site.sections[2].id, member: 'bld_ben' }),
  ]);
  const view = teamView(team, ctxOf(site));
  const work = sectionWork(site, guide, noProgress);
  const pace = { blocksPerSession: 100, boxesPerSession: 3 };
  const s = teamSchedule({ view, work, pace, today: '2026-11-03T10:00:00Z', sessionsPerWeek: 7 });
  const item = id => s.items.find(i => i.sectionId === id);
  assert.equal(item('sec_fund').start, 0);
  assert.equal(item('sec_fund').end, 1.8, 'foundation 180 blocks at 100 per day');
  assert.equal(item(site.sections[2].id).start, 1.8, 'Ben waits for the foundation');
  assert.equal(item(site.sections[2].id).waitsFor, 'sec_fund');
  assert.equal(s.solo, 10.6, '180 + 880 open blocks');
  assert.ok(s.makespan < s.solo, 'parallel is faster');
  assert.deepEqual(s.critical.slice(0, 1), ['sec_fund']);
  assert.equal(s.finish, calendarAfter('2026-11-03', s.makespan, 7));
  // Ben away until 2026-11-06: his lane starts after the absence (4 days at 7 per week)
  const away = { ...view, members: view.members.map(m => m.id === 'bld_ben' ? { ...m, away: { until: '2026-11-06' } } : m) };
  const s2 = teamSchedule({ view: away, work, pace, today: '2026-11-03T10:00:00Z', sessionsPerWeek: 7 });
  assert.equal(s2.items.find(i => i.sectionId === site.sections[2].id).start, 4);
  // reported sections count as done
  const done = teamView(appendEvents(team, [ev('bld_anna', { kind: 'section.done', section: 'sec_fund' })]), ctxOf(site));
  assert.equal(teamSchedule({ view: done, work, pace, today: '2026-11-03T10:00:00Z' }).items.find(i => i.sectionId === 'sec_fund').work, 0);
});

test('material per member: open need after stock, gathering and deliveries cover, free sections under „noch niemand“', () => {
  const view = teamView(appendEvents(team0(), [
    ev('bld_anna', { kind: 'section.claim', section: 'sec_fund' }),
    ev('bld_ben', { kind: 'gather.claim', item: 'minecraft:stone_bricks', count: 100 }),
    ev('bld_ben', { kind: 'contribution', items: [{ item: 'minecraft:stone_bricks', count: 50 }] }),
  ]), ctxOf(site0()));
  const overview = { sections: [
    { id: 'sec_fund', name: 'Fundament', items: [{ itemId: 'minecraft:stone_bricks', need: 300, fromStock: 64, missing: 236, assumed: false }] },
    { id: 'sec_bau', name: 'Rohbau', items: [{ itemId: 'minecraft:stone_bricks', need: 500, fromStock: 0, missing: 500, assumed: false }, { itemId: 'minecraft:oak_planks', need: 40, fromStock: 0, missing: 40, assumed: false }] },
  ] };
  const m = teamMaterials({ overview, view });
  const bricks = m.items.find(i => i.item === 'minecraft:stone_bricks');
  assert.deepEqual({ need: bricks.need, missing: bricks.missing, gathering: bricks.gathering, delivered: bricks.delivered, uncovered: bricks.uncovered },
    { need: 800, missing: 736, gathering: 100, delivered: 50, uncovered: 586 });
  const anna = m.members.find(x => x.member === 'bld_anna');
  assert.deepEqual(anna.sections, ['sec_fund']);
  assert.equal(anna.items[0].missing, 236);
  const nobody = m.members.at(-1);
  assert.equal(nobody.member, null);
  assert.equal(nobody.items.length, 2);
  const text = packingText(anna, id => id === 'sec_fund' ? 'Fundament' : id);
  assert.match(text, /Packliste Anna: Fundament/);
  assert.match(text, /stone_bricks: 4 St\. \+ 44 \(fehlt noch 236\)/);
});

test('section needs over all steps, first-match rule, sorted and limited', () => {
  const guide = guideOf([['turm', 2, 10]]);
  const site = { ...emptySite(), sections: [{ id: 'a', name: 'A', members: [{ instanceId: 'turm', toLayer: 0 }] }, { id: 'b', name: 'B', members: [{ instanceId: 'turm' }] }] };
  const mats = new Map([['turm/0/structure', { items: [{ itemId: 'minecraft:stone', count: 10 }] }], ['turm/1/structure', { items: [{ itemId: 'minecraft:stone', count: 4 }, { itemId: 'minecraft:glass', count: 6 }] }]]);
  const n = sectionNeeds(site, guide, mats);
  assert.deepEqual(n.sections.get('a'), [{ item: 'minecraft:stone', count: 10 }]);
  assert.deepEqual(n.sections.get('b'), [{ item: 'minecraft:glass', count: 6 }, { item: 'minecraft:stone', count: 4 }]);
  assert.deepEqual(n.total, [{ item: 'minecraft:stone', count: 14 }, { item: 'minecraft:glass', count: 6 }]);
});

test('progress board and hints: stale report, ticks vs reports, waiting, plan change, orphan', () => {
  const guide = guideOf(SPEC), site = site0();
  const team = appendEvents(team0(), [
    ev('bld_anna', { kind: 'section.claim', section: 'sec_fund' }, '2026-11-03T15:00:00Z'),
    ev('bld_anna', { kind: 'section.done', section: 'sec_fund' }, '2026-11-03T15:30:00Z'),
    ev('bld_ben', { kind: 'section.claim', section: 'sec_bau' }, '2026-11-05T12:00:00Z'),
    ev('bld_ben', { kind: 'section.claim', section: 'sec_weg' }, '2026-11-05T12:01:00Z'),
  ].sort((a, b) => a.at < b.at ? -1 : 1));
  const view = teamView(team, ctxOf(site));
  const work = sectionWork(site, guide, { status: new Map([['turm/0/structure', 'done']]) });
  const p = teamProgress({ view, work, now: '2026-11-06T10:00:00Z', changed: new Set(['sec_fund']) });
  assert.deepEqual(p.board.gemeldet, ['sec_fund']);
  assert.deepEqual(p.board.vergeben, ['sec_bau']);
  const kinds = p.attention.map(a => a.kind).sort();
  assert.deepEqual(kinds, ['orphan', 'plan-changed', 'reported-not-ticked', 'stale-report'], 'reported foundation counts as finished: no waiting');
  assert.equal(p.totals.work, 180 + 880);
  assert.equal(p.totals.workDone, 100);
  assert.equal(p.members.find(m => m.member === 'bld_anna').reported, 180);
  // all ticked but not reported
  const ticked = new Map(guide.steps.filter(s => s.layer >= 1).map(s => [s.id, 'done']));
  const p2 = teamProgress({ view, work: sectionWork(site, guide, { status: ticked }), now: '2026-11-05T13:00:00Z' });
  assert.ok(p2.attention.some(a => a.kind === 'ticked-not-reported' && a.sectionId === 'sec_bau'));
  // foundation taken by nobody: the Rohbau owner waits for it (a foundation in work is no hint)
  const inWork = teamView({ ...team, events: team.events.filter(e => e.kind !== 'section.done') }, ctxOf(site));
  assert.ok(!teamProgress({ view: inWork, work, now: '2026-11-05T13:00:00Z' }).attention.some(a => a.kind === 'waiting'));
  const early = teamView({ ...team, events: team.events.filter(e => e.kind !== 'section.done' && !(e.kind === 'section.claim' && e.section === 'sec_fund')) }, ctxOf(site));
  const p3 = teamProgress({ view: early, work, now: '2026-11-05T13:00:00Z' });
  assert.ok(p3.attention.some(a => a.kind === 'waiting' && a.sectionId === 'sec_bau' && /Fundament/.test(a.text)));
});

test('issues: double claim offers reassign or keep, rejected guest gets a role fix', () => {
  const site = site0(), ctx = ctxOf(site);
  const team = appendEvents(team0(), [
    ev('bld_anna', { kind: 'section.claim', section: 'sec_bau' }),
    ev('bld_ben', { kind: 'section.claim', section: 'sec_bau' }),
    ev('bld_phil', { kind: 'section.assign', section: 'sec_bau', member: 'bld_ben' }),
    ev('bld_neu', { kind: 'section.claim', section: 'sec_fund' }),
  ]);
  const view = teamView(team, ctx);
  const issues = teamIssues(team, ctx, view);
  const claim = issues.find(i => i.kind === 'conflict' && i.event.kind === 'section.claim');
  assert.deepEqual(claim.fixes.map(f => f.label), ['Bei Ben lassen']);
  const assign = issues.find(i => i.event.kind === 'section.assign');
  assert.deepEqual(assign.fixes.map(f => f.label), ['Zurück an Anna', 'Bei Ben lassen']);
  assert.deepEqual(assign.fixes[0].body, { kind: 'section.assign', section: 'sec_bau', member: 'bld_anna' });
  const rejected = issues.find(i => i.kind === 'rejected');
  assert.equal(rejected.event.by, 'bld_neu');
  assert.ok(rejected.fixes.some(f => f.body.kind === 'issue.ack'));
  assert.equal(teamIssues(team, ctx, view, new Set(issues.map(i => i.event.id))).length, 0, 'acknowledged issues disappear');
});

test('release changes by section: changed, added and removed steps; reported sections need review', () => {
  const site = site0();
  const released = guideOf([['turm', 8, 100], ['mauer', 4, 50]]);
  const current = guideOf([['turm', 7, 100], ['mauer', 4, 50], ['tor', 2, 30]], { 'turm/0/structure': 1, 'mauer/2/structure': 1 });
  const view = teamView(appendEvents(team0(), [ev('bld_anna', { kind: 'section.done', section: 'sec_fund' })]), ctxOf(site));
  const c = releaseChanges({ site, released, current, view });
  const fund = c.find(x => x.sectionId === 'sec_fund'), bau = c.find(x => x.sectionId === 'sec_bau');
  assert.deepEqual([fund.changed, fund.added, fund.removed, fund.review], [1, 1, 0, true]);
  assert.deepEqual([bau.changed, bau.added, bau.removed, bau.review], [1, 1, 1, false]);
  assert.equal(releaseChanges({ site, released, current: released, view }).length, 0);
});

test('rights matrix follows canTeam', () => {
  const m = rightsMatrix();
  const row = a => m.find(r => r.action === a).roles;
  assert.deepEqual(row('section.claim'), { leitung: true, meister: true, helfer: true, gast: false });
  assert.deepEqual(row('plan.release'), { leitung: true, meister: false, helfer: false, gast: false });
  assert.deepEqual(row('note.add'), { leitung: true, meister: true, helfer: true, gast: true });
});

test('handover: offer, accept, decline, rights; another section event cancels the offer', () => {
  const ctx = ctxOf(site0());
  const sec = (v, id) => v.sections.find(s => s.sectionId === id);
  let team = appendEvents(team0(), [ev('bld_anna', { kind: 'section.claim', section: 'sec_bau' })]);
  // Ben cannot hand over Anna's section; a guest cannot receive one
  team = appendEvents(team, [ev('bld_ben', { kind: 'section.handover', section: 'sec_bau', member: 'bld_ben' }),
    ev('bld_phil', { kind: 'member.join', member: 'bld_zoe', name: 'Zoe' }), ev('bld_phil', { kind: 'member.role', member: 'bld_zoe', role: 'gast' }),
    ev('bld_anna', { kind: 'section.handover', section: 'sec_bau', member: 'bld_zoe' })]);
  let v = teamView(team, ctx);
  assert.equal(v.rejected.length, 2);
  assert.equal(sec(v, 'sec_bau').offer, undefined);
  // Anna offers to Ben with a note; until Ben accepts, Anna stays owner; a third person cannot accept
  team = appendEvents(team, [ev('bld_anna', { kind: 'section.handover', section: 'sec_bau', member: 'bld_ben', note: 'bis Schicht 4' }),
    ev('bld_phil', { kind: 'section.accept', section: 'sec_bau' })]);
  v = teamView(team, ctx);
  assert.equal(sec(v, 'sec_bau').owner, 'bld_anna');
  assert.deepEqual({ to: sec(v, 'sec_bau').offer.to, by: sec(v, 'sec_bau').offer.by }, { to: 'bld_ben', by: 'bld_anna' });
  assert.equal(v.rejected.length, 3);
  team = appendEvents(team, [ev('bld_ben', { kind: 'section.accept', section: 'sec_bau' })]);
  v = teamView(team, ctx);
  assert.equal(sec(v, 'sec_bau').owner, 'bld_ben');
  assert.equal(sec(v, 'sec_bau').status, 'vergeben');
  assert.equal(sec(v, 'sec_bau').note, 'bis Schicht 4', 'the handover note travels with the section');
  assert.equal(sec(v, 'sec_bau').offer, undefined);
  assert.match(sec(v, 'sec_bau').history.at(-1).text, /Übergabe angenommen \(von Anna\)/);
  // offer withdrawn by the offerer, and an offer overtaken by an assignment
  team = appendEvents(team, [ev('bld_ben', { kind: 'section.handover', section: 'sec_bau', member: 'bld_anna' }), ev('bld_ben', { kind: 'section.decline', section: 'sec_bau' })]);
  assert.equal(sec(teamView(team, ctx), 'sec_bau').offer, undefined);
  team = appendEvents(team, [ev('bld_ben', { kind: 'section.handover', section: 'sec_bau', member: 'bld_anna' }), ev('bld_phil', { kind: 'section.assign', section: 'sec_bau', member: 'bld_phil' }),
    ev('bld_anna', { kind: 'section.accept', section: 'sec_bau' })]);
  v = teamView(team, ctx);
  assert.equal(sec(v, 'sec_bau').owner, 'bld_phil');
  assert.match(v.rejected.at(-1).reason, /kein Übergabeangebot/);
  // a reported section is not handed over
  team = appendEvents(team, [ev('bld_phil', { kind: 'section.done', section: 'sec_bau' }), ev('bld_phil', { kind: 'section.handover', section: 'sec_bau', member: 'bld_anna' })]);
  assert.match(teamView(team, ctx).rejected.at(-1).reason, /fertig gemeldet/);
});

test('absence and acknowledged hints; merging is order independent with the new kinds', () => {
  const ctx = ctxOf(site0());
  const a = [ev('bld_anna', { kind: 'member.away', member: 'bld_anna', until: '2026-11-20', note: 'Urlaub' }), ev('bld_ben', { kind: 'member.away', member: 'bld_anna' })];
  const b = [ev('bld_anna', { kind: 'section.claim', section: 'sec_fund' }), ev('bld_ben', { kind: 'section.claim', section: 'sec_fund' })];
  const c = [ev('bld_phil', { kind: 'issue.ack', events: [b[1].id] }), ev('bld_anna', { kind: 'issue.ack', events: [b[1].id] })];
  const all = [...a, ...b, ...c], base = team0();
  const one = teamView(appendEvents(base, all), ctx), two = teamView(appendEvents(appendEvents(base, [...c].reverse()), [...b, ...a].reverse()), ctx);
  assert.deepEqual(one, two);
  assert.deepEqual(one.members.find(m => m.id === 'bld_anna').away, { until: '2026-11-20', note: 'Urlaub' });
  assert.equal(one.rejected.filter(r => r.event.kind === 'member.away').length, 1, 'Ben may not set Anna back');
  assert.equal(one.rejected.filter(r => r.event.kind === 'issue.ack').length, 1, 'helpers do not acknowledge');
  assert.deepEqual(one.acknowledged, [b[1].id]);
  assert.equal(teamIssues(appendEvents(base, all), ctx, one).filter(i => i.event.id === b[1].id).length, 0, 'acknowledged double claim is hidden');
  const back = teamView(appendEvents(team0(), [...a.slice(0, 1), ev('bld_anna', { kind: 'member.away', member: 'bld_anna' })]), ctx);
  assert.equal(back.members.find(m => m.id === 'bld_anna').away, undefined);
  assert.throws(() => teamEvent('bld_anna', { kind: 'member.away', member: 'bld_anna', until: '20.11.2026' }), /Datum ungültig/);
  assert.throws(() => teamEvent('bld_anna', { kind: 'issue.ack', events: [] }), /Hinweise ungültig/);
});

test('server file carries the material need per section and in total', async () => {
  const { teamServerFile } = await import('../../../dist/domain/src/index.js');
  const team = team0(), site = site0();
  const view = teamView(team, ctxOf(site));
  const needs = { sections: new Map([['sec_fund', [{ item: 'minecraft:stone', count: 20 }]]]), total: [{ item: 'minecraft:stone', count: 20 }] };
  const file = teamServerFile({ team, view, projectName: 'Burg', sections: site.sections, steps: [], origin: [0, 64, 0], dimension: 'minecraft:overworld', needs });
  assert.deepEqual(file.sections[0].need, [{ item: 'minecraft:stone', count: 20 }]);
  assert.equal(file.sections[1].need, undefined);
  assert.deepEqual(file.need, [{ item: 'minecraft:stone', count: 20 }]);
  assert.equal(teamServerFile({ team, view, projectName: 'Burg', sections: site.sections, steps: [], origin: [0, 64, 0], dimension: 'minecraft:overworld' }).need, undefined);
});
