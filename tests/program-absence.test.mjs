// PROJ-03: Abwesenheiten je Bauleute nach Datum im Zeitplan, mehrere Basispläne, Abwesenheit aus dem Team.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyOperation, createProject, newInstance, resolveProject, createSampleLibrary, buildGuide, evaluateProgress, planSite, DEFAULT_PACE,
  emptySite, addSection, removeSection, checkProgram, emptyProgram, programOf, addBuilder, assignSection, setProgramSettings, planProgram,
  setBaseline, clearBaseline, addAbsence, removeAbsence, absentOn, activateBaseline, removeBaseline, renameBaseline, parseDay, MAX_BASELINES,
  createTeam, appendEvents, teamEvent, teamView, teamIntoProgram, siteOf, checkSite,
} from '../dist/domain/src/index.js';

const lib = await createSampleLibrary();
const versions = new Map(lib.versions.map(v => [v.id, v]));
const latest = id => lib.versions.find(v => v.assetId === id).id;
const at = (assetVersionId, name, position) => newInstance({ assetVersionId, name, transform: { position, quarterTurns: 0, mirrorX: false } });
const withInstances = (...instances) => applyOperation(createProject({ name: 'Burg' }), { kind: 'batch', label: 't', operations: instances.map(instance => ({ kind: 'instance.add', instance })) }).project;
const burg = () => withInstances(at(latest('sample_tower'), 'Turm West', [0, 0, 0]), at(latest('sample_wall'), 'Mauer', [4, 0, 1]), at(latest('sample_tower'), 'Turm Ost', [10, 0, 0]));
function overviewOf(project, site) {
  const resolution = resolveProject(project, versions), guide = buildGuide(project, resolution);
  return planSite(site, guide, evaluateProgress(guide, project.progress), resolution);
}
function perInstance(p) {
  let site = emptySite();
  p.instances.forEach((i, n) => { site = addSection(site, i.name, [{ instanceId: i.id }], `s${n}`); });
  return site;
}
/** Two builders (Anna on s0 and s1, Ben on s2), 7 building days a week from Monday 2026-11-02, slow pace so sections take several days. */
function setup() {
  const p = burg(), base = perInstance(p);
  let site = addBuilder(base, 'Anna', 16, 'a');
  site = addBuilder(site, 'Ben', 16, 'b');
  site = assignSection(assignSection(assignSection(site, 's0', ['a']), 's1', ['a']), 's2', ['b']);
  site = setProgramSettings(site, { start: '2026-11-02' });
  return { p, site, overview: overviewOf(p, site) };
}

test('absences: validation, joining, removing', () => {
  const { site } = setup();
  let s = addAbsence(site, 'a', '2026-11-05', '2026-11-08', 'Urlaub');
  s = addAbsence(s, 'a', '2026-11-09', '2026-11-10'); // adjacent → joined
  s = addAbsence(s, 'a', '2026-11-20', '2026-11-20');
  const list = programOf(s).builders.find(b => b.id === 'a').absences;
  assert.deepEqual(list.map(a => [a.from, a.to]), [['2026-11-05', '2026-11-10'], ['2026-11-20', '2026-11-20']]);
  assert.equal(list[0].note, 'Urlaub');
  assert.ok(absentOn({ absences: list }, parseDay('2026-11-07')));
  assert.ok(!absentOn({ absences: list }, parseDay('2026-11-11')));
  assert.throws(() => addAbsence(site, 'a', '2026-11-10', '2026-11-01'), /vor ihrem Beginn/);
  assert.throws(() => addAbsence(site, 'x', '2026-11-10', '2026-11-11'), /existiert nicht/);
  assert.throws(() => checkProgram({ ...emptyProgram(), builders: [{ id: 'a', name: 'A', absences: [{ from: '2026-11-10', to: '2026-11-11' }, { from: '2026-11-01', to: '2026-11-02' }] }] }), /geordnet/);
  assert.throws(() => checkProgram({ ...emptyProgram(), builders: [{ id: 'a', name: 'A', absences: [{ from: '2026-01-01', to: '2027-06-01' }] }] }), /länger als ein Jahr/);
  const removed = removeAbsence(s, 'a', 0);
  assert.equal(programOf(removed).builders.find(b => b.id === 'a').absences.length, 1);
  assert.equal('absences' in programOf(removeAbsence(removed, 'a', 0)).builders.find(b => b.id === 'a'), false);
  assert.ok(checkProgram(programOf(s)));
});

test('the schedule moves around absences; other lanes are unaffected; without start date it is ignored', () => {
  const { site, overview } = setup();
  const before = planProgram(site, overview, DEFAULT_PACE, '2026-11-01');
  const s0 = before.sections.find(s => s.id === 's0');
  assert.ok(s0.sessions >= 2, 'slow enough to span days');
  // Anna is away on the first two days: s0 starts two days later, ends two days later.
  const away = addAbsence(site, 'a', '2026-11-02', '2026-11-03', 'Klausur');
  const plan = planProgram(away, overview, DEFAULT_PACE, '2026-11-01');
  const a0 = plan.sections.find(s => s.id === 's0');
  assert.equal(a0.startDate, '2026-11-04');
  assert.equal(a0.start, s0.start + 2);
  assert.equal(a0.end, s0.end + 2);
  assert.equal(a0.absent, 2);
  assert.deepEqual(plan.sections.find(s => s.id === 's2').startDate, before.sections.find(s => s.id === 's2').startDate, 'Ben builds as before');
  assert.match(plan.notes.join(' '), /Abwesenheiten sind eingerechnet/);
  // A gap in the middle of a section stretches it.
  const mid = addAbsence(site, 'a', '2026-11-03', '2026-11-03');
  const m0 = planProgram(mid, overview, DEFAULT_PACE, '2026-11-01').sections.find(s => s.id === 's0');
  assert.equal(m0.end, s0.end + 1);
  assert.equal(m0.absent, 1);
  // Shared section: when one builder is away the other keeps building (slower, but no full stop).
  const shared = addAbsence(assignSection(site, 's0', ['a', 'b']), 'a', '2026-11-02', '2026-11-30');
  const sh = planProgram(shared, overview, DEFAULT_PACE, '2026-11-01').sections.find(s => s.id === 's0');
  assert.equal(sh.startDate, '2026-11-02');
  assert.ok(!sh.absent);
  // Without a start date absences do nothing (note says so).
  const noStart = setProgramSettings(away, { start: null });
  const ns = planProgram(noStart, overview, DEFAULT_PACE, '2026-11-01');
  assert.equal(ns.sections.find(s => s.id === 's0').start, s0.start);
  assert.match(ns.notes.join(' '), /erst mit einem Startdatum/);
  // Without any absence the plan is exactly the old one.
  assert.deepEqual(planProgram(site, overview, DEFAULT_PACE, '2026-11-01').sections.map(s => [s.start, s.end]), before.sections.map(s => [s.start, s.end]));
});

test('baseline history: keep, compare, activate, rename, remove, prune', () => {
  const { site, overview } = setup();
  const plan1 = planProgram(site, overview, DEFAULT_PACE, '2026-11-01');
  let s = setBaseline(site, plan1, '2026-11-01', 'Erster Plan');
  const slower = addAbsence(s, 'a', '2026-11-02', '2026-11-06');
  const plan2 = planProgram(slower, overview, DEFAULT_PACE, '2026-11-01');
  s = setBaseline(slower, plan2, '2026-11-03', 'Nach der Klausur');
  const p = programOf(s);
  assert.equal(p.baseline.name, 'Nach der Klausur');
  assert.equal(p.baselines.length, 1);
  assert.equal(p.baselines[0].name, 'Erster Plan');
  const now = planProgram(s, overview, DEFAULT_PACE, '2026-11-01');
  assert.equal(now.baseline.slip, 0);
  assert.equal(now.baselines.length, 1);
  assert.ok(now.baselines[0].slip > 0, 'later than the first plan');
  // Compare against the first plan.
  const act = activateBaseline(s, 0);
  assert.equal(programOf(act).baseline.name, 'Erster Plan');
  assert.equal(programOf(act).baselines[0].name, 'Nach der Klausur');
  assert.equal(programOf(renameBaseline(act, -1, 'Start')).baseline.name, 'Start');
  assert.equal(programOf(renameBaseline(act, 0, '')).baselines[0].name, undefined);
  assert.equal(programOf(removeBaseline(act, 0)).baselines, undefined);
  // Discarding the active one brings the previous one back.
  assert.equal(programOf(clearBaseline(s)).baseline.name, 'Erster Plan');
  assert.equal(programOf(clearBaseline(clearBaseline(s))).baseline, undefined);
  // At most MAX_BASELINES earlier ones.
  let many = site;
  for (let i = 0; i < MAX_BASELINES + 3; i++) many = setBaseline(many, plan1, `2026-11-${String(i + 1).padStart(2, '0')}`);
  assert.equal(programOf(many).baselines.length, MAX_BASELINES);
  assert.ok(checkProgram(programOf(many)));
  // Removing a section prunes it from every baseline.
  const pruned = removeSection(s, 's0');
  assert.ok(!('s0' in programOf(pruned).baseline.sections));
  assert.ok(programOf(pruned).baselines.every(b => !('s0' in b.sections)));
  assert.ok(checkSite(pruned));
});

test('team: „abwesend bis“ becomes an absence from today when the team goes into the planning', () => {
  const { site } = setup();
  let team = createTeam({ name: 'T', founder: 'a', teamId: 'team_abs00001', at: '2026-11-01T08:00:00Z' });
  team = appendEvents(team, [teamEvent('b', { kind: 'member.away', member: 'b', until: '2026-11-12', note: 'Urlaub' }, '2026-11-02T08:00:00Z')]);
  const ctx = { sections: siteOf({ site }).sections.map(s => ({ id: s.id, name: s.name })), builders: programOf(site).builders };
  const view = teamView(team, ctx);
  const r = teamIntoProgram(programOf(site), view, '2026-11-04');
  assert.equal(r.absences, 1);
  assert.deepEqual(r.builders.find(b => b.id === 'b').absences, [{ from: '2026-11-04', to: '2026-11-12', note: 'Urlaub' }]);
  assert.ok(checkProgram({ ...programOf(site), builders: r.builders, assignments: r.assignments }));
  // A second time adds nothing.
  const again = teamIntoProgram({ ...programOf(site), builders: r.builders }, view, '2026-11-05');
  assert.equal(again.absences, 0);
  // Past absences are not taken.
  assert.equal(teamIntoProgram(programOf(site), view, '2026-11-20').absences, 0);
});
