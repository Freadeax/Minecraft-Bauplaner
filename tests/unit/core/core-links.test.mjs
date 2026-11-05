// CORE-04: Verbindungen zwischen Planer-Kernmodulen – Projektreihenfolge im Verweisgraphen, Datencheck und sauberes Löschen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addProjectAfter, applyWorldPlanOp, buildPlanGraph, checkIntegrity, createProject, emptySite, emptyWorldPlan, programOf, projectEdges,
  projectRemoval, whereUsed } from '../../../dist/domain/src/index.js';

const named = (name, site) => ({ ...createProject({ name }), ...(site && { site }) });

test('erst nach: Verweis im Planmodell, nicht erforderlich, mit Notiz', () => {
  const lager = named('Lager');
  const burg = named('Burg', addProjectAfter(emptySite(), 'burg', lager.id, 'Material zuerst'));
  const edges = projectEdges(burg).filter(e => e.role === 'project-after');
  assert.deepEqual(edges.map(e => [e.to.kind, e.to.id, e.required, e.detail]), [['project', lager.id, false, 'Material zuerst']]);
  const graph = buildPlanGraph({ projects: [lager, burg], assets: [], versions: [] });
  assert.equal(graph.dangling.length, 0);
  assert.deepEqual(whereUsed(graph, { kind: 'project', id: lager.id }).map(g => [g.from.id, g.roles]), [[burg.id, ['project-after']]]);
  assert.equal(projectEdges(named('Ohne Baustelle')).length, 0, 'Projekt ohne Baustellenplan hat keine Verweise');
});

test('Datencheck meldet gelöschten Vorgänger nur als Hinweis', async () => {
  const burg = named('Burg', addProjectAfter(emptySite(), 'burg', 'weg-geloescht'));
  const report = await checkIntegrity({ projects: [burg], assets: [], versions: [], originalHashes: [] });
  const f = report.findings.filter(x => x.code === 'DANGLING_REFERENCE');
  assert.equal(f.length, 1);
  assert.equal(f[0].severity, 'info');
  assert.match(f[0].message, /Planung/);
  assert.equal(report.ok, true);
});

test('Löschen räumt Nachfolger und Bauplätze auf', () => {
  const lager = named('Lager');
  const burg = { ...named('Burg', addProjectAfter(addProjectAfter(emptySite(), 'burg', lager.id), 'burg', 'andere')), revision: 3 };
  const fremd = named('Fremd');
  const site = (id, projectId) => ({ kind: 'site', id, name: `Platz ${id}`, note: '', dimension: 'minecraft:overworld', minX: 0, minZ: 0, width: 8, length: 8, y: null, projectId });
  let plan = emptyWorldPlan();
  plan = applyWorldPlanOp(plan, { kind: 'batch', label: 'x', ops: [{ kind: 'add', item: site('a', lager.id) }, { kind: 'add', item: site('b', fremd.id) }] }).plan;

  const r = projectRemoval(lager.id, [lager, burg, fremd], plan);
  assert.deepEqual(r.successors, [{ id: burg.id, name: 'Burg' }]);
  assert.deepEqual(r.sites, [{ id: 'a', name: 'Platz a' }]);
  assert.equal(r.projects.length, 1);
  assert.equal(r.projects[0].revision, 3, 'gespeicherte Revision bleibt CAS-Basis');
  assert.deepEqual(programOf(r.projects[0].site).after, [{ projectId: 'andere' }], 'nur der Verweis auf das gelöschte Projekt fällt weg');
  const next = applyWorldPlanOp(plan, r.worldPlanOp).plan;
  assert.deepEqual(next.items.map(i => [i.id, i.projectId]), [['a', null], ['b', fremd.id]]);

  const none = projectRemoval(fremd.id, [lager, fremd]);
  assert.deepEqual([none.successors, none.sites, none.projects, none.worldPlanOp], [[], [], [], null]);
});

test('Rückgängig/Wiederholen behalten live empfangene Teamereignisse', async () => {
  const { execute, undoKeepingTeam, redoKeepingTeam, undo, EMPTY_HISTORY, siteOf, createTeam } = await import('../../../dist/domain/src/index.js');
  const teamA = createTeam({ name: 'Burg am See', founder: 'bld_phil', teamId: 'team_test0001', at: '2026-11-03T09:00:00Z' });
  const teamB = { ...teamA, events: [...teamA.events, ...teamA.events.map(e => ({ ...e, id: `${e.id}x` }))] };
  let p = { ...createProject({ name: 'Burg' }), site: { ...emptySite(), team: teamA } };
  // 1) a normal site edit (no team change), 2) a team event arrives without undo step
  let r = execute(p, EMPTY_HISTORY, { kind: 'site.set', site: { ...siteOf(p), sections: [] } });
  assert.equal(r.history.undo[0].team, undefined);
  const live = { ...r.project, site: { ...r.project.site, team: teamB } };
  assert.equal(undo(live, r.history).project.site.team.events.length, teamA.events.length, 'altes undo würde Ereignis b verlieren');
  const u = undoKeepingTeam(live, r.history);
  assert.deepEqual(u.project.site.team, teamB);
  assert.deepEqual(redoKeepingTeam(u.project, u.history).project.site.team, teamB);
  // An imported team file is an undoable step of its own.
  const imp = execute(p, EMPTY_HISTORY, { kind: 'site.set', site: { ...siteOf(p), team: teamB } });
  assert.equal(imp.history.undo[0].team, true);
  const back = undoKeepingTeam(imp.project, imp.history);
  assert.deepEqual(back.project.site.team, teamA);
  assert.deepEqual(redoKeepingTeam(back.project, back.history).project.site.team, teamB);
});
