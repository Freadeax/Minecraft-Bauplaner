// Projektplanung (PROJ-01): milestones, dependencies, builders, schedule, text output, backups.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyOperation, createProject, execute, undo, newInstance, resolveProject, createSampleLibrary, buildGuide, evaluateProgress, tickSteps,
  createBackup, readBackup, checkProjectRecord, planSite, DEFAULT_PACE, linkOperation, unlinkedMates,
  emptySite, siteOf, checkSite, siteOperation, addSection, removeSection,
  emptyProgram, programOf, parseDay, dayText, dependencyCycle, checkProgram, setProgram, addBuilder, updateBuilder, removeBuilder, assignSection,
  addMilestone, updateMilestone, removeMilestone, moveMilestone, addDependency, removeDependency, setProgramSettings, pruneProgram, programIssues,
  suggestDependencies, suggestProgram, sessionCalendar, sectionOrder, planProgram, programText, builderText, programSummary, MAX_DEPENDENCIES,
} from '../dist/domain/src/index.js';

const lib = await createSampleLibrary();
const versions = new Map(lib.versions.map(v => [v.id, v]));
const latest = id => lib.versions.find(v => v.assetId === id).id;
const at = (assetVersionId, name, position) => newInstance({ assetVersionId, name, transform: { position, quarterTurns: 0, mirrorX: false } });
const withInstances = (...instances) => applyOperation(createProject({ name: 'Großprojekt' }), { kind: 'batch', label: 't', operations: instances.map(instance => ({ kind: 'instance.add', instance })) }).project;
const burg = () => withInstances(at(latest('sample_tower'), 'Turm West', [0, 0, 0]), at(latest('sample_wall'), 'Mauer', [4, 0, 1]), at(latest('sample_tower'), 'Turm Ost', [10, 0, 0]));
const run = (project, op) => applyOperation(project, op).project;
function derive(project) {
  const resolution = resolveProject(project, versions), guide = buildGuide(project, resolution);
  const progress = evaluateProgress(guide, project.progress);
  return { resolution, guide, progress, overview: planSite(siteOf(project), guide, progress, resolution) };
}
/** Site with one section per instance (ids s0…s2) in project order. */
function perInstance(p) {
  let site = emptySite();
  p.instances.forEach((i, n) => { site = addSection(site, i.name, [{ instanceId: i.id }], `s${n}`); });
  return site;
}

test('validation: schema, cycles, self references, duplicates, unknown builders, dates', () => {
  assert.deepEqual(programOf(emptySite()), emptyProgram());
  assert.throws(() => checkProgram({ ...emptyProgram(), schemaVersion: 2 }), /Schemaversion/);
  assert.throws(() => checkProgram({ ...emptyProgram(), dependencies: [{ before: 'a', after: 'a' }] }), /sich selbst/);
  assert.throws(() => checkProgram({ ...emptyProgram(), dependencies: [{ before: 'a', after: 'b' }, { before: 'a', after: 'b' }] }), /doppelt/);
  assert.throws(() => checkProgram({ ...emptyProgram(), dependencies: [{ before: 'a', after: 'b' }, { before: 'b', after: 'c' }, { before: 'c', after: 'a' }] }), /Kreis \(a → b → c → a\)/);
  assert.throws(() => checkProgram({ ...emptyProgram(), assignments: { s1: ['ghost'] } }), /unbekannte Bauleute/);
  assert.throws(() => checkProgram({ ...emptyProgram(), milestones: [{ id: 'm', name: 'Tor', sectionIds: [], due: '2026-02-30' }] }), /Datum/);
  assert.throws(() => checkProgram({ ...emptyProgram(), start: '06.11.2026' }), /Datum/);
  assert.throws(() => checkProgram({ ...emptyProgram(), sessionsPerWeek: 8 }), /Bautage je Woche/);
  assert.throws(() => checkProgram({ ...emptyProgram(), builders: [{ id: 'b', name: 'Anna', blocksPerSession: 5 }] }), /Bautempo/);
  assert.throws(() => checkProgram({ ...emptyProgram(), milestones: [{ id: 'm', name: 'Tor', sectionIds: ['a', 'a'] }] }), /doppelt zugeordnet/);
  assert.equal(dependencyCycle([{ before: 'a', after: 'b' }, { before: 'b', after: 'c' }]), null);
  assert.equal(parseDay('2026-11-06'), 20763); assert.equal(dayText(20763), '2026-11-06'); assert.equal(parseDay('2026-13-01'), null);
  // The site validation runs the program validation.
  assert.throws(() => checkSite({ ...emptySite(), program: { ...emptyProgram(), schemaVersion: 2 } }), /Projektplan/);
});

test('edits are pure, undoable through site.set and prune with the section', () => {
  const p = burg();
  let site = perInstance(p);
  site = addBuilder(site, 'Anna', 2000, 'b1');
  site = addBuilder(site, ' Ben ', undefined, 'b2');
  assert.equal(programOf(site).builders[1].name, 'Ben');
  site = updateBuilder(site, 'b2', { name: 'Benno', blocksPerSession: 800, note: 'abends' });
  site = updateBuilder(site, 'b2', { blocksPerSession: null, note: ' ' });
  assert.deepEqual(programOf(site).builders[1], { id: 'b2', name: 'Benno' });
  assert.throws(() => updateBuilder(site, 'nope', { name: 'x' }), /existiert nicht/);
  site = assignSection(site, 's0', ['b1', 'b1', 'ghost']);
  assert.deepEqual(programOf(site).assignments, { s0: ['b1'] });
  site = assignSection(site, 's1', ['b1', 'b2']);
  site = removeBuilder(site, 'b1');
  assert.deepEqual(programOf(site).assignments, { s1: ['b2'] }, 'assignments of a removed builder disappear');
  site = addMilestone(site, 'Rohbau', ['s0', 's1', 's0'], '2026-11-20', 'm1');
  site = addMilestone(site, 'Fertig', ['s2'], undefined, 'm2');
  assert.deepEqual(programOf(site).milestones[0].sectionIds, ['s0', 's1']);
  site = updateMilestone(site, 'm1', { name: 'Rohbau West', due: null, note: 'vor dem Winter' });
  assert.equal(programOf(site).milestones[0].due, undefined); assert.equal(programOf(site).milestones[0].note, 'vor dem Winter');
  site = moveMilestone(site, 'm2', -1);
  assert.deepEqual(programOf(site).milestones.map(m => m.id), ['m2', 'm1']);
  assert.equal(moveMilestone(site, 'm2', -1), site, 'cannot move past the start');
  site = addDependency(site, 's0', 's1');
  site = addDependency(site, 's1', 's2', ' Mauer zuerst ');
  assert.equal(addDependency(site, 's0', 's1'), site, 'duplicates are ignored');
  assert.throws(() => addDependency(site, 's2', 's0'), /Kreis: „Turm West“ → „Mauer“ → „Turm Ost“ → „Turm West“/);
  assert.throws(() => addDependency(site, 's2', 's2'), /sich selbst/);
  assert.equal(programOf(site).dependencies[1].note, 'Mauer zuerst');
  site = removeDependency(site, 's0', 's1');
  assert.equal(programOf(site).dependencies.length, 1);
  site = setProgramSettings(site, { start: '2026-11-06', sessionsPerWeek: 5 });
  site = setProgramSettings(site, { sessionsPerWeek: 7 });
  assert.equal(programOf(site).sessionsPerWeek, undefined, 'default is not stored');
  assert.throws(() => setProgramSettings(site, { start: 'morgen' }), /Datum/);

  // Through the project: one undo step, inverse restores the previous record.
  const r = execute(p, { undo: [], redo: [] }, siteOperation(site, 'Projektplan'));
  assert.equal(r.project.site.program.builders[0].name, 'Benno');
  assert.equal(undo(r.project, r.history).project.site, undefined);
  assert.throws(() => applyOperation(p, { kind: 'site.set', site: { ...site, program: { ...programOf(site), dependencies: [{ before: 's1', after: 's1' }] } } }), /sich selbst/);

  // Removing a section drops its milestone membership, dependencies and assignment.
  const pruned = removeSection(site, 's1');
  assert.deepEqual(programOf(pruned).dependencies, []);
  assert.deepEqual(programOf(pruned).milestones.find(m => m.id === 'm1').sectionIds, ['s0']);
  assert.deepEqual(programOf(pruned).assignments, {});
  assert.deepEqual(pruneProgram(programOf(site), new Set(['s2'])).milestones.map(m => m.sectionIds), [['s2'], []]);
  assert.equal(setProgram(site, null).program, undefined);
  assert.throws(() => setProgram(site, { ...programOf(site), builders: 'x' }), /Bauleute/);
});

test('issues: dangling references, dependencies against the build order, unassigned sections', () => {
  const p = burg();
  let site = perInstance(p);
  site = addMilestone(site, 'Leer', [], undefined, 'm0');
  site = addMilestone(site, 'Alt', ['s0', 'gone'], undefined, 'm1');
  site = addDependency(site, 's2', 's0');
  site = { ...site, program: { ...programOf(site), dependencies: [...programOf(site).dependencies, { before: 'gone', after: 's1' }], assignments: { gone: [] } } };
  const kinds = programIssues(site).map(i => i.kind);
  assert.deepEqual(kinds.sort(), ['dangling', 'dangling', 'dangling', 'empty', 'order']);
  assert.match(programIssues(site).find(i => i.kind === 'order').message, /„Turm West“ soll erst nach „Turm Ost“/);
  site = addBuilder(addBuilder(perInstance(p), 'A', undefined, 'a'), 'B', undefined, 'b');
  assert.match(programIssues(site)[0].message, /3 Abschnitte sind niemandem zugewiesen/);
  assert.deepEqual(programIssues(addBuilder(perInstance(p), 'A')), [], 'one builder needs no assignments');
});

test('dependency suggestions come from geometry (support) and connectors, never form cycles', () => {
  let p = burg();
  for (const m of unlinkedMates(p, versions)) p = run(p, linkOperation(p, versions, m.a, m.b));
  assert.ok(p.links.length >= 1, 'sample tower and wall dock');
  const { guide } = derive(p);
  const [west, wall, east] = p.instances;
  // Foundation layer of both towers in one section, the rest of the towers in another, the wall alone.
  let site = addSection(emptySite(), 'Fundament', [{ instanceId: west.id, toLayer: 0 }, { instanceId: east.id, toLayer: 0 }], 'f');
  site = addSection(site, 'Mauer', [{ instanceId: wall.id }], 'w');
  site = addSection(site, 'Türme', [{ instanceId: west.id }, { instanceId: east.id }], 't');
  const s = suggestDependencies(site, p, guide);
  const geo = s.find(x => x.before === 'f' && x.after === 't');
  assert.ok(geo && geo.kind === 'geometry' && geo.count > 0, 'towers need their foundation');
  assert.match(geo.reason, /Vorarbeit aus „Fundament“/);
  const con = s.filter(x => x.kind === 'connector');
  assert.ok(con.some(x => x.after === 'w' || x.before === 'w'), 'the wall is linked to a tower');
  for (const x of con) assert.ok(site.sections.findIndex(y => y.id === x.before) < site.sections.findIndex(y => y.id === x.after), 'connector suggestions follow the build order');
  // Accepting all suggestions is valid; afterwards nothing is suggested again.
  let next = site;
  for (const x of s) next = addDependency(next, x.before, x.after);
  assert.doesNotThrow(() => checkProgram(programOf(next)));
  assert.deepEqual(suggestDependencies(next, p, guide), []);
  // A reversed manual dependency blocks the contradicting suggestion instead of creating a cycle.
  const reversed = addDependency(site, 't', 'f');
  assert.ok(!suggestDependencies(reversed, p, guide).some(x => x.before === 'f' && x.after === 't'));
});

test('program presets: phases from section names, strict chain, stages', () => {
  const p = burg();
  let site = emptySite();
  for (const [i, name] of ['Straßen & Plätze', 'Phase 1: Dorfplatz', 'Phase 1: Lager', 'Phase 2 – Hafen', 'Bauphase 3 Magie'].entries()) site = addSection(site, name, [{ instanceId: p.instances[0].id }], `s${i}`);
  site = addBuilder(site, 'Anna', undefined, 'b1');
  site = assignSection(site, 's1', ['b1']);
  let n = 0;
  const phased = suggestProgram(site, 'phases', () => `m${++n}`);
  const pr = programOf(phased);
  assert.deepEqual(pr.milestones.map(m => [m.name, m.sectionIds]), [['Erschließung', ['s0']], ['Phase 1', ['s1', 's2']], ['Phase 2', ['s3']], ['Phase 3', ['s4']]]);
  assert.deepEqual(pr.dependencies, [{ before: 's0', after: 's1' }, { before: 's0', after: 's2' }, { before: 's1', after: 's3' }, { before: 's2', after: 's3' }, { before: 's3', after: 's4' }]);
  assert.deepEqual(pr.assignments, { s1: ['b1'] }, 'builders and assignments stay');
  assert.equal(pr.builders.length, 1);
  assert.doesNotThrow(() => checkProgram(pr));
  const chain = programOf(suggestProgram(perInstance(p), 'chain'));
  assert.deepEqual(chain.milestones.map(m => m.name), ['Turm West', 'Mauer', 'Turm Ost']);
  assert.deepEqual(chain.dependencies, [{ before: 's0', after: 's1' }, { before: 's1', after: 's2' }]);
  assert.deepEqual(programOf(suggestProgram(perInstance(p), 'phases')).dependencies, chain.dependencies, 'without phase names a small project falls back to the chain');
  let big = emptySite();
  for (let i = 0; i < 10; i++) big = addSection(big, `Haus ${i + 1}`, [], `h${i}`);
  const stages = programOf(suggestProgram(big, 'stages'));
  assert.deepEqual(stages.milestones.map(m => [m.name, m.sectionIds.length]), [['Etappe 1', 3], ['Etappe 2', 3], ['Etappe 3', 3], ['Etappe 4', 1]]);
  assert.equal(stages.dependencies.length, 9 + 9 + 3);
  assert.ok(stages.dependencies.length <= MAX_DEPENDENCIES);
  assert.deepEqual(suggestProgram(emptySite()), emptySite());
});

test('calendar: building days per week map to dates, weekends skipped with five days', () => {
  const all = sessionCalendar('2026-11-06', 7);
  assert.deepEqual([0, 1, 2].map(all), ['2026-11-06', '2026-11-07', '2026-11-08']);
  const five = sessionCalendar('2026-11-06', 5); // Friday
  assert.deepEqual([0, 1, 2, 5].map(five), ['2026-11-06', '2026-11-09', '2026-11-10', '2026-11-13']);
  const two = sessionCalendar('2026-11-04', 2); // Wednesday → next Monday, Tuesday
  assert.deepEqual([0, 1, 2].map(two), ['2026-11-09', '2026-11-10', '2026-11-16']);
  assert.equal(sessionCalendar(undefined, 7)(3), null);
});

test('schedule: lanes per builder, dependencies, critical path, milestones, dates and done sections', () => {
  const p = burg();
  let site = perInstance(p);
  const base = derive({ ...p, site });
  const blocks = Object.fromEntries(base.overview.sections.map(s => [s.id, s.blocks]));
  assert.ok(blocks.s0 > 0 && blocks.s1 > 0 && blocks.s2 > 0);
  site = addBuilder(site, 'Anna', 100, 'a');
  site = addBuilder(site, 'Ben', 50, 'b');
  site = assignSection(site, 's0', ['a']);
  site = assignSection(site, 's1', ['b']);
  site = assignSection(site, 's2', ['a', 'b']);
  site = addDependency(site, 's0', 's2');
  site = addMilestone(site, 'Westturm', ['s0'], '2026-11-30', 'm1');
  site = addMilestone(site, 'Alles', ['s0', 's1', 's2'], '2026-11-06', 'm2');
  site = addMilestone(site, 'Offen', ['s1'], undefined, 'm3');
  site = setProgramSettings(site, { start: '2026-11-06', sessionsPerWeek: 5 });
  const plan = planProgram(site, base.overview, DEFAULT_PACE, '2026-11-03');
  const by = Object.fromEntries(plan.sections.map(s => [s.id, s]));
  assert.deepEqual(sectionOrder(site), ['s0', 's1', 's2']);
  assert.equal(by.s0.sessions, Math.ceil(blocks.s0 / 100)); assert.equal(by.s0.start, 0);
  assert.equal(by.s1.sessions, Math.ceil(blocks.s1 / 50)); assert.equal(by.s1.start, 0, 'Ben starts in parallel');
  assert.equal(by.s2.sessions, Math.ceil(blocks.s2 / 150), 'combined pace');
  assert.equal(by.s2.start, Math.max(by.s0.end, by.s1.end), 'waits for the dependency and for both builders');
  assert.deepEqual(by.s2.waitingFor, ['s0']); assert.equal(by.s2.state, 'blocked'); assert.equal(by.s0.state, 'ready');
  assert.equal(plan.sessions, by.s2.end);
  assert.ok(by.s2.critical, 'the last section is critical');
  assert.equal(by.s0.critical, by.s0.end >= by.s1.end); assert.equal(by.s1.critical, by.s1.end >= by.s0.end);
  assert.equal(by.s0.startDate, '2026-11-06');
  assert.equal(by.s0.endDate, sessionCalendar('2026-11-06', 5)(by.s0.end - 1));
  assert.equal(plan.endDate, sessionCalendar('2026-11-06', 5)(plan.sessions - 1));
  const ms = Object.fromEntries(plan.milestones.map(m => [m.id, m]));
  assert.equal(ms.m1.status, 'ok'); assert.equal(ms.m1.endDate, by.s0.endDate);
  assert.equal(ms.m2.status, 'late', 'everything on the first day is not reachable');
  assert.equal(ms.m3.status, 'open');
  assert.equal(ms.m2.blocks, blocks.s0 + blocks.s1 + blocks.s2);
  assert.ok(ms.m2.itemsNeeded > 0 && ms.m2.itemsMissing === ms.m2.itemsNeeded, 'nothing in stock yet');
  const anna = plan.builders.find(b => b.id === 'a'), ben = plan.builders.find(b => b.id === 'b');
  assert.deepEqual(anna.sectionIds, ['s0', 's2']); assert.equal(anna.sessions, by.s0.sessions + by.s2.sessions); assert.equal(anna.nextId, 's0');
  assert.equal(ben.blocksPerSession, 50); assert.ok(ben.items.length > 0 && ben.gather.length > 0);
  assert.ok(anna.items.some(i => i.missing > 0));
  const text = programText(plan, site, 'Burg');
  assert.match(text, /Meilensteine\n- Westturm \(bis 30\.11\.2026\): im Plan/);
  assert.match(text, /- Turm Ost: .*Anna, Ben · wartet auf Turm West · kritisch/);
  assert.match(text, /Turm Ost erst nach Turm West/);
  const sheet = builderText(plan, site, 'b', 'Burg');
  assert.match(sheet, /Bauzettel für Ben/); assert.match(sheet, /Noch fehlende Bauitems/); assert.match(sheet, /Sammeln/);
  assert.throws(() => builderText(plan, site, 'x', 'Burg'), /existiert nicht/);
  assert.deepEqual(programSummary(site, '2026-11-03'), { milestones: 3, builders: 2, next: programOf(site).milestones[1] });
  assert.equal(programSummary(site, '2026-12-01').next.id, 'm1', 'past dates fall back to the first milestone');

  // Ticking the west tower completes its section: it needs no days, the milestone is reached, the dependency is released.
  const towerSteps = base.guide.steps.filter(s => s.instanceId === p.instances[0].id);
  const done = run({ ...p, site }, tickSteps(towerSteps, 'Turm fertig'));
  const after = planProgram(site, derive(done).overview, DEFAULT_PACE);
  const a2 = Object.fromEntries(after.sections.map(s => [s.id, s]));
  assert.equal(a2.s0.state, 'done'); assert.equal(a2.s0.sessions, 0); assert.equal(a2.s0.startDate, null);
  assert.equal(after.milestones[0].status, 'done');
  assert.deepEqual(a2.s2.waitingFor, []); assert.equal(a2.s2.state, 'ready');
  assert.equal(a2.s2.start, a2.s1.end, "now only Ben's lane holds it back");
  assert.ok(after.sessions <= plan.sessions);
  assert.equal(after.builders.find(b => b.id === 'a').nextId, 's2');
  assert.match(programText(after, site, 'Burg'), /- Turm West: fertig/);

  // Without builders every section runs in one lane at the project pace, in build order.
  const plain = planProgram(perInstance(p), base.overview, { ...DEFAULT_PACE, blocksPerSession: 20 });
  const q = plain.sections;
  assert.equal(q[1].start, q[0].end); assert.equal(q[2].start, q[1].end);
  assert.ok(q.every(s => s.critical), 'a single lane is all critical');
  assert.deepEqual(plain.builders, []); assert.equal(plain.endDate, null);
  assert.ok(plain.notes.some(n => /Startdatum/.test(n)));
  // Deterministic.
  assert.deepEqual(planProgram(site, base.overview, DEFAULT_PACE, '2026-11-03'), plan);
});

test('backup carries the program and rejects a broken one', async () => {
  let p = burg();
  let site = addBuilder(perInstance(p), 'Anna', undefined, 'a');
  site = addMilestone(site, 'Tor', ['s1'], '2026-12-24', 'm');
  p = run(p, siteOperation(site, 'Projektplan'));
  const file = await createBackup({ projects: [p], assets: lib.assets, versions, getOriginal: async () => null }, 'project', [p.id]);
  const read = await readBackup(JSON.stringify(file));
  assert.deepEqual(read.projects[0].site.program, p.site.program);
  const broken = structuredClone(p);
  broken.site.program.dependencies = [{ before: 's1', after: 's1' }];
  assert.throws(() => checkProjectRecord(broken), /Projektplan/);
});

test('a Großprojekt from the library gets milestones per phase, streets first, and a schedule over the real catalogue', async () => {
  const { createBuildingLibrary, buildGrossprojektPlan, planGrossprojekt, previewGrossprojekt, createGrossprojektProject, grossprojektById } = await import('../dist/domain/src/index.js');
  const buildings = await createBuildingLibrary();
  const vmap = new Map(buildings.versions.map(v => [v.id, v]));
  const plan = await buildGrossprojektPlan(planGrossprojekt(grossprojektById('gp_innenstadt'), { assets: buildings.assets, versions: vmap }, {}));
  const project = createGrossprojektProject(plan, previewGrossprojekt(plan));
  for (const v of [plan.network?.version].filter(Boolean)) vmap.set(v.id, v);
  const site = siteOf(project);
  const phased = suggestProgram(site, 'phases');
  const program = programOf(phased);
  const phases = site.sections.filter(s => /^Phase \d/.test(s.name));
  assert.ok(phases.length >= 3);
  assert.equal(program.milestones[0].name, 'Erschließung', 'streets and squares first');
  assert.equal(program.milestones.length, new Set(phases.map(s => /^Phase (\d+)/.exec(s.name)[1])).size + 1);
  assert.doesNotThrow(() => checkSite(phased));
  const p = run(project, siteOperation(phased, 'Projektplan'));
  const { overview } = (() => { const resolution = resolveProject(p, vmap), guide = buildGuide(p, resolution), progress = evaluateProgress(guide, p.progress); return { overview: planSite(siteOf(p), guide, progress, resolution) }; })();
  const sched = planProgram(siteOf(p), overview, DEFAULT_PACE);
  assert.ok(sched.sessions > 0);
  const first = sched.sections.find(s => s.id === program.milestones[0].sectionIds[0]);
  assert.equal(first.start, 0);
  for (const s of sched.sections.filter(x => x.id !== first.id && x.sessions > 0)) assert.ok(s.start >= first.end, `${s.name} after the streets`);
  assert.ok(sched.criticalPath.length >= program.milestones.length, 'critical path runs through every phase');
});
