// PROJ-02: Planung ↔ Produktion (Material abwarten), Zeitplan ab heute, Basisplan mit Verzug, Anteil der Bautage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyOperation, createProject, newInstance, resolveProject, createSampleLibrary, buildGuide, evaluateProgress, planSite, DEFAULT_PACE,
  emptySite, siteOf, checkSite, addSection, removeSection, checkProgram, emptyProgram, programOf, addBuilder, updateBuilder, assignSection, addMilestone,
  addDependency, setProgramSettings, planProgram, sessionCalendar, buildingDaysBetween, setBaseline, clearBaseline, materialDaysOf, planProgramWithMaterial,
  analyzeProduction, setProductionSettings, createBackup, readBackup, siteOperation,
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

test('building days between dates honour the week and are signed', () => {
  assert.equal(buildingDaysBetween('2026-11-02', '2026-11-09', 7), 7);
  assert.equal(buildingDaysBetween('2026-11-02', '2026-11-09', 5), 5, 'Mon–Fri');
  assert.equal(buildingDaysBetween('2026-11-09', '2026-11-02', 5), -5);
  assert.equal(buildingDaysBetween('2026-11-07', '2026-11-09', 5), 0, 'weekend only');
  assert.equal(buildingDaysBetween('2026-11-02', '2026-11-02', 3), 0);
  assert.equal(buildingDaysBetween('2026-11-02', 'morgen', 7), null);
  assert.equal(buildingDaysBetween('2000-01-01', '2090-01-01', 7), null, 'bounded span');
});

test('share of building days: validation, undoable edit, slower lane', () => {
  const p = burg(), overview = overviewOf(p, perInstance(p));
  let site = addBuilder(perInstance(p), 'Anna', 100, 'a');
  site = assignSection(site, 's0', ['a']);
  const full = planProgram(site, overview, DEFAULT_PACE).sections.find(s => s.id === 's0');
  const half = updateBuilder(site, 'a', { share: 50 });
  assert.equal(programOf(half).builders[0].share, 50);
  const slow = planProgram(half, overview, DEFAULT_PACE).sections.find(s => s.id === 's0');
  assert.equal(slow.sessions, Math.ceil(full.openWork / 50), 'half the days → half the pace');
  assert.equal('share' in programOf(updateBuilder(half, 'a', { share: 100 })).builders[0], false, '100 % is the default');
  assert.equal('share' in programOf(updateBuilder(half, 'a', { share: null })).builders[0], false);
  assert.throws(() => updateBuilder(site, 'a', { share: 5 }), /10 bis 100/);
  assert.throws(() => checkProgram({ ...emptyProgram(), builders: [{ id: 'a', name: 'A', share: 120 }] }), /10 bis 99/);
  assert.match(planProgram(half, overview, DEFAULT_PACE).notes.join(' '), /Anteil unter 100 %/);
});

test('start date in the past: remaining work starts today, dates stay on building days', () => {
  const p = burg(), overview = overviewOf(p, perInstance(p));
  const site = setProgramSettings(perInstance(p), { start: '2026-10-01', sessionsPerWeek: 5 });
  const plan = planProgram(site, overview, DEFAULT_PACE, '2026-11-07'); // a Saturday
  assert.equal(plan.start, '2026-10-01');
  assert.equal(plan.from, '2026-11-09', 'next Monday');
  assert.equal(plan.sections[0].startDate, '2026-11-09');
  assert.equal(plan.endDate, sessionCalendar('2026-11-09', 5)(plan.sessions - 1));
  assert.match(plan.notes.join(' '), /Vergangenheit/);
  const future = planProgram(setProgramSettings(site, { start: '2026-12-01' }), overview, DEFAULT_PACE, '2026-11-07');
  assert.equal(future.from, '2026-12-01');
  assert.doesNotMatch(future.notes.join(' '), /Vergangenheit/);
  assert.equal(planProgram(perInstance(p), overview, DEFAULT_PACE, '2026-11-07').from, null, 'no start date → building days only');
});

test('baseline: frozen dates, slip of plan, sections and milestones, prune, backup, undo-able clear', async () => {
  const p = burg();
  let site = perInstance(p);
  const overview = overviewOf(p, site);
  site = addBuilder(site, 'Anna', 200, 'a');
  for (const id of ['s0', 's1', 's2']) site = assignSection(site, id, ['a']);
  site = addMilestone(site, 'Alles', ['s0', 's1', 's2'], undefined, 'm1');
  site = setProgramSettings(site, { start: '2026-11-09', sessionsPerWeek: 7 });
  assert.throws(() => setBaseline(setProgramSettings(site, { start: null }), planProgram(setProgramSettings(site, { start: null }), overview, DEFAULT_PACE), '2026-11-04'), /Startdatum/);
  const plan = planProgram(site, overview, DEFAULT_PACE, '2026-11-04');
  site = setBaseline(site, plan, '2026-11-04');
  const b = programOf(site).baseline;
  assert.equal(b.at, '2026-11-04'); assert.equal(b.end, plan.endDate);
  assert.deepEqual(Object.keys(b.sections), ['s0', 's1', 's2']); assert.equal(b.milestones.m1, plan.endDate);
  assert.doesNotThrow(() => checkSite(site));
  const same = planProgram(site, overview, DEFAULT_PACE, '2026-11-04');
  assert.equal(same.baseline.slip, 0);
  assert.ok(same.sections.every(s => s.slip === 0 && s.baseline.start === s.start && s.baseline.end === s.end));
  assert.equal(same.milestones[0].slip, 0); assert.equal(same.milestones[0].baselineEnd, plan.endDate);
  // Anna gets slower: everything ends later than the baseline.
  const slower = planProgram(updateBuilder(site, 'a', { blocksPerSession: 50 }), overview, DEFAULT_PACE, '2026-11-04');
  assert.ok(slower.baseline.slip > 0, `slip ${slower.baseline.slip}`);
  assert.equal(slower.baseline.slip, buildingDaysBetween(b.end, slower.endDate, 7));
  assert.ok(slower.sections.at(-1).slip > 0); assert.equal(slower.milestones[0].slip, slower.baseline.slip);
  // Starting later (today after the start) shows as slip too.
  const later = planProgram(site, overview, DEFAULT_PACE, '2026-11-12');
  assert.equal(later.baseline.slip, 3, 'three building days later');
  assert.equal(later.sections[0].baseline.start, -3, 'baseline bar lies before today');
  // Removing a section prunes it from the baseline; backups keep the baseline; clear removes it.
  assert.deepEqual(Object.keys(programOf(removeSection(site, 's1')).baseline.sections), ['s0', 's2']);
  const project = applyOperation(p, siteOperation(site, 'Basisplan')).project;
  const file = await createBackup({ projects: [project], assets: lib.assets, versions, getOriginal: async () => null }, 'project', [project.id]);
  assert.deepEqual((await readBackup(JSON.stringify(file))).projects[0].site.program.baseline, b);
  assert.equal('baseline' in programOf(clearBaseline(site)), false);
  const cleared = clearBaseline(site);
  assert.equal(clearBaseline(cleared), cleared, 'no-op stays the same object');
  assert.throws(() => checkProgram({ ...emptyProgram(), baseline: { at: '2026-11-04', sections: { s0: { start: '2026-11-10', end: '2026-11-09' } }, milestones: {} } }), /vor seinem Beginn/);
  assert.throws(() => checkProgram({ ...emptyProgram(), baseline: { at: 'gestern', sections: {}, milestones: {} } }), /Datum/);
});

test('wait for material: sections start when the production readiness says the material is there', () => {
  const p = burg();
  let site = perInstance(p);
  const overview = overviewOf(p, site);
  site = addDependency(site, 's0', 's2');
  site = setProductionSettings(site, { gatherHoursPerDay: 0.5 });
  const plain = planProgram(site, overview, DEFAULT_PACE);
  const readiness = analyzeProduction({ site, overview, pace: DEFAULT_PACE });
  const days = materialDaysOf(readiness);
  assert.ok([...days.values()].some(d => d > 1), 'material takes more than a day with little gathering time');
  // Switch on: off by default, option is ignored while off.
  assert.deepEqual(planProgram(site, overview, DEFAULT_PACE, undefined, { materialDays: days }).sections, plain.sections);
  const on = setProgramSettings(site, { waitForMaterial: true });
  assert.equal(programOf(on).waitForMaterial, true);
  assert.equal('waitForMaterial' in programOf(setProgramSettings(on, { waitForMaterial: false })), false);
  assert.throws(() => checkProgram({ ...emptyProgram(), waitForMaterial: 'ja' }), /Material/);
  const { plan, readiness: r } = planProgramWithMaterial(on, overview, DEFAULT_PACE);
  assert.ok(r, 'readiness is returned');
  assert.equal(plan.waitForMaterial, true);
  for (const s of plan.sections.filter(s => s.sessions > 0)) {
    const d = days.get(s.id);
    if (d !== null) assert.ok(s.start >= Math.ceil(d - 0.05), `${s.name} starts after its material (${s.start} ≥ ${d})`);
    assert.equal(s.materialDay, d === null ? null : Math.ceil(d - 0.05));
  }
  assert.ok(plan.sections.some(s => s.materialWait > 0), 'at least one section waits for material');
  assert.ok(plan.sessions > plain.sessions, 'the plan gets longer');
  assert.match(plan.notes.join(' '), /Material beisammen/);
  // Production compared with the waiting schedule: nothing is late any more.
  const late = analyzeProduction({ site: on, overview, pace: DEFAULT_PACE, schedule: plan.sections }).sections.filter(s => s.late);
  assert.deepEqual(late, []);
  assert.ok(analyzeProduction({ site, overview, pace: DEFAULT_PACE, schedule: plain.sections }).sections.some(s => s.late), 'without waiting, material comes too late');
  // Off → same as planProgram.
  assert.deepEqual(planProgramWithMaterial(site, overview, DEFAULT_PACE).plan, plain);
  assert.equal(planProgramWithMaterial(site, overview, DEFAULT_PACE).readiness, null);
  // On without production data passed in: notes say so, schedule unchanged.
  assert.match(planProgram(on, overview, DEFAULT_PACE).notes.join(' '), /ohne Produktionsauswertung/);
});

test('older programs stay valid and unchanged', () => {
  const p = burg(), overview = overviewOf(p, perInstance(p));
  let site = addBuilder(perInstance(p), 'Anna', 100, 'a');
  site = setProgramSettings(site, { start: '2026-11-09' });
  const plan = planProgram(site, overview, DEFAULT_PACE, '2026-11-04');
  assert.equal(plan.from, '2026-11-09'); assert.equal(plan.baseline, null); assert.equal(plan.waitForMaterial, false);
  assert.ok(plan.sections.every(s => !('materialDay' in s) && !('baseline' in s) && !('slip' in s)));
  assert.doesNotThrow(() => checkSite(siteOf({ ...p, site })));
});
