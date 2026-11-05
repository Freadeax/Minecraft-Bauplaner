import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyOperation, createProject, newInstance, resolveProject, createSampleLibrary, buildGuide, evaluateProgress, tickSteps, materialsForParts, materialsForResolution,
  emptySite, checkSite, addSection, setStock, setPace, siteOperation, createPlacement, worldOperation, positionKey,
  anchorOf, anchorFromScan, sameAnchor, worldPos, cellLookup, stepRuns, stepRunsIn, runLabel, runCoords, stepText, packSteps, stockMap, packText,
  DEFAULT_PACE, checkPace, paceOf, stepWork, planSessions, progressByDay, sessionText, reworkList, gameCounts,
} from '../../../dist/domain/src/index.js';

import { stackSizeOf } from '../../../dist/domain/src/materials/materials.js';
const lib = await createSampleLibrary();
const versions = new Map(lib.versions.map(v => [v.id, v]));
const latest = id => lib.versions.find(v => v.assetId === id).id;
const at = (assetVersionId, name, position) => newInstance({ assetVersionId, name, transform: { position, quarterTurns: 0, mirrorX: false } });
const withInstances = (...instances) => applyOperation(createProject({ name: 'Bauführung' }), { kind: 'batch', label: 't', operations: instances.map(instance => ({ kind: 'instance.add', instance })) }).project;
const burg = () => withInstances(at(latest('sample_tower'), 'Turm West', [0, 0, 0]), at(latest('sample_wall'), 'Mauer', [4, 0, 1]), at(latest('sample_tower'), 'Turm Ost', [10, 0, 0]));
function derive(project) {
  const resolution = resolveProject(project, versions), guide = buildGuide(project, resolution);
  const reports = materialsForParts(resolution.world, guide.steps.map(s => ({ id: s.id, positions: s.positions, conflicts: s.conflicts })));
  return { resolution, guide, reports, progress: evaluateProgress(guide, project.progress) };
}

test('runs cover every cell of a step exactly once with the planned state', () => {
  const { resolution, guide } = derive(burg());
  const world = resolution.world, lookup = cellLookup(world);
  for (const step of guide.steps) {
    const runs = stepRunsIn(step, world, lookup);
    const seen = new Map();
    for (const r of runs) {
      assert.ok(r.x0 <= r.x1 && r.z0 <= r.z1);
      assert.equal(r.count, (r.x1 - r.x0 + 1) * (r.z1 - r.z0 + 1));
      for (let x = r.x0; x <= r.x1; x++) for (let z = r.z0; z <= r.z1; z++) {
        const key = positionKey([x, step.y, z]);
        assert.ok(!seen.has(key), `cell ${key} twice in ${step.id}`);
        seen.set(key, r);
      }
    }
    assert.equal(seen.size, step.positions.length, `${step.id}: runs cover all cells`);
    for (const p of step.positions) {
      const cell = lookup(p), r = seen.get(positionKey(p));
      assert.ok(r, `${positionKey(p)} covered`);
      assert.equal(r.kind, cell.kind);
      if (cell.kind === 'block') assert.deepEqual(r.state, world.palette[cell.paletteIndex]);
    }
    // Sorted north→south, west→east.
    for (let i = 1; i < runs.length; i++) assert.ok(runs[i - 1].z0 < runs[i].z0 || (runs[i - 1].z0 === runs[i].z0 && runs[i - 1].x0 < runs[i].x0));
  }
});

test('runs merge equal rows into rectangles and split by state', () => {
  // 3×2 floor of stone with one oak plank in the middle of the second row.
  const palette = [{ id: 'minecraft:stone', properties: {} }, { id: 'minecraft:oak_planks', properties: {} }, { id: 'minecraft:oak_stairs', properties: { facing: 'north', half: 'bottom', shape: 'straight', waterlogged: 'false' } }];
  const cells = [];
  for (const z of [0, 1, 2]) for (const x of [0, 1, 2]) cells.push({ position: [x, 5, z], kind: 'block', paletteIndex: z === 2 && x === 1 ? 1 : 0 });
  cells.push({ position: [3, 5, 0], kind: 'erase' });
  const world = { bounds: { min: [0, 5, 0], maxExclusive: [4, 6, 3] }, palette, cells, blockEntities: [] };
  const positions = cells.map(c => c.position).sort((a, b) => a[2] - b[2] || a[0] - b[0]);
  const runs = stepRunsIn({ positions, y: 5 }, world);
  assert.deepEqual(runs.map(r => [r.x0, r.x1, r.z0, r.z1, r.kind, r.count]), [
    [0, 2, 0, 0, 'block', 3], [3, 3, 0, 0, 'erase', 1], [0, 2, 1, 1, 'block', 3], [0, 0, 2, 2, 'block', 1], [1, 1, 2, 2, 'block', 1], [2, 2, 2, 2, 'block', 1],
  ]);
  // Without the erase cell row 0 and row 1 are identical and merge.
  const merged = stepRunsIn({ positions: positions.filter(p => p[0] < 3), y: 5 }, world);
  assert.deepEqual(merged[0], { ...merged[0], x0: 0, x1: 2, z0: 0, z1: 1, count: 6 });
  assert.equal(runLabel({ kind: 'block', state: palette[2] }), 'oak_stairs [facing=north, half=bottom, shape=straight, waterlogged=false]');
  assert.equal(runLabel({ kind: 'erase', state: null }), 'abbauen');
  assert.throws(() => stepRuns({ positions: [[9, 9, 9]], y: 9 }, cellLookup(world)), /fehlt/);
});

test('anchor: relative coordinates are project coordinates, world = + placement origin; scan anchor', () => {
  let p = burg();
  assert.deepEqual(anchorOf(p), { origin: null, dimension: null });
  const run = { x0: 1, x1: 4, z0: 2, z1: 2, y: 0 };
  assert.deepEqual(runCoords(run, anchorOf(p)), { rel: 'X 1…4 · Y 0 · Z 2', abs: null });
  p = applyOperation(p, worldOperation(createPlacement([100, 64, -200]))).project;
  const anchor = anchorOf(p);
  assert.deepEqual(anchor, { origin: [100, 64, -200], dimension: 'minecraft:overworld' });
  assert.deepEqual(runCoords(run, anchor), { rel: 'X 1…4 · Y 0 · Z 2', abs: 'X 101…104 · Y 64 · Z -198' });
  assert.deepEqual(worldPos([1, 2, 3], anchor), [101, 66, -197]);
  const fromScan = anchorFromScan({ projectId: 'p', revisionId: 'r', revisionNumber: 1, projectMin: [0, 0, 0], worldAnchor: [100, 64, -200], dimension: 'minecraft:overworld' });
  assert.ok(sameAnchor(anchor, fromScan));
  assert.ok(!sameAnchor(anchor, { origin: [100, 65, -200], dimension: 'minecraft:overworld' }));
  assert.equal(anchorFromScan({ projectId: 'p', revisionId: 'r', revisionNumber: 1, projectMin: [0, 0, 0] }), null);
  assert.equal(anchorFromScan(null), null);
});

test('pack list: totals equal the step items, boxes of 27 slots in order of first use, stock consumed', () => {
  const { guide, reports, resolution } = derive(burg());
  const pack = packSteps(guide.steps, reports);
  const all = materialsForResolution(resolution);
  // Same item totals as the material tab (steps add up to the project).
  assert.deepEqual(Object.fromEntries(pack.lines.map(l => [l.itemId, l.count])), Object.fromEntries(all.items.map(l => [l.itemId, l.count])));
  for (const l of pack.lines) assert.equal(l.slots, Math.ceil(l.count / stackSizeOf(l.itemId)));
  const slotCount = pack.boxes.reduce((n, b) => n + b.slots.length, 0);
  assert.equal(slotCount, pack.totals.slots - pack.totals.looseSlots);
  assert.equal(pack.totals.boxes, Math.ceil(slotCount / 27));
  for (const b of pack.boxes) {
    assert.ok(b.slots.length <= 27);
    for (const s of b.slots) assert.ok(s.count > 0 && s.count <= stackSizeOf(s.itemId));
  }
  for (let i = 1; i < pack.lines.length; i++) assert.ok(pack.lines[i - 1].firstStep <= pack.lines[i].firstStep, 'lines in order of first use');
  for (let i = 1; i < pack.boxes.length; i++) assert.ok(pack.boxes[i - 1].fromStep <= pack.boxes[i].fromStep);
  // Stock: consumed in place, never more than needed.
  const first = pack.lines[0];
  const stock = new Map([[first.itemId, first.count + 5]]);
  const withStock = packSteps(guide.steps, reports, stock);
  assert.equal(withStock.lines[0].fromStock, first.count);
  assert.equal(withStock.lines[0].missing, 0);
  assert.equal(stock.get(first.itemId), 5);
  assert.match(packText(pack), /\[ \] Kiste 1 \(ab Schritt \d+\)/);
});

test('pace: validation, persisted in the site plan, undoable', () => {
  assert.deepEqual(paceOf(emptySite()), DEFAULT_PACE);
  assert.throws(() => checkPace({ blocksPerSession: 5, boxesPerSession: 2 }), /Blöcke je Bautag/);
  assert.throws(() => checkPace({ blocksPerSession: 500, boxesPerSession: 28 }), /Shulkerkisten/);
  assert.throws(() => checkSite({ ...emptySite(), pace: { blocksPerSession: 1.5, boxesPerSession: 1 } }), /Blöcke je Bautag/);
  const site = setPace(emptySite(), { blocksPerSession: 200, boxesPerSession: 1 });
  assert.deepEqual(paceOf(site), { blocksPerSession: 200, boxesPerSession: 1 });
  assert.equal('pace' in setPace(site, null), false);
  const p = applyOperation(burg(), siteOperation(site, 'Bautempo')).project;
  assert.deepEqual(p.site.pace, { blocksPerSession: 200, boxesPerSession: 1 });
});

test('sessions: every open step exactly once, budget respected, site order, stock across days', () => {
  const p = burg(), { guide, reports, progress } = derive(p);
  const pace = { blocksPerSession: 40, boxesPerSession: 1 };
  const plan = planSessions(guide, progress, emptySite(), reports, pace);
  const ids = plan.sessions.flatMap(s => s.steps.map(x => x.id));
  assert.deepEqual([...ids].sort(), guide.steps.map(s => s.id).sort(), 'every step once');
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(plan.sessions.length > 1);
  for (const s of plan.sessions) {
    assert.equal(s.work, s.steps.reduce((n, x) => n + stepWork(x), 0));
    if (!s.oversized) { assert.ok(s.work <= pace.blocksPerSession, `day ${s.index} within block budget`); assert.ok(s.pack.totals.slots - s.pack.totals.looseSlots <= 27); }
    else assert.equal(s.steps.length, 1);
  }
  // Without sections: guide order.
  assert.deepEqual(ids, [...guide.steps].sort((a, b) => a.order - b.order).map(s => s.id));
  // Done steps are left out.
  const ticked = applyOperation(p, tickSteps(guide.steps.slice(0, 3), 't')).project;
  const d2 = derive(ticked);
  const plan2 = planSessions(d2.guide, d2.progress, emptySite(), d2.reports, pace);
  assert.equal(plan2.openSteps, guide.steps.length - 3);
  assert.ok(!plan2.sessions.some(s => s.steps.some(x => guide.steps.slice(0, 3).some(t => t.id === x.id))));
  // Sections reorder: the east tower first.
  const east = p.instances[2];
  const site = addSection(emptySite(), 'Ostturm zuerst', [{ instanceId: east.id }], 'e');
  const plan3 = planSessions(guide, progress, site, reports, { blocksPerSession: 100000, boxesPerSession: 27 });
  const order3 = plan3.sessions.flatMap(s => s.steps);
  const lastEast = order3.findLastIndex(s => s.instanceId === east.id), firstOther = order3.findIndex(s => s.instanceId !== east.id);
  assert.ok(lastEast < firstOther, 'section steps come first');
  assert.equal(plan3.sessions[0].sections[0], 'Ostturm zuerst');
  // Stock is consumed day by day, not twice.
  const item = plan.sessions[0].pack.lines[0];
  const stocked = setStock(emptySite(), item.itemId, 1_000_000);
  const plan4 = planSessions(guide, progress, stocked, reports, pace);
  const totalFromStock = plan4.sessions.reduce((n, s) => n + (s.pack.lines.find(l => l.itemId === item.itemId)?.fromStock ?? 0), 0);
  const totalNeed = plan4.sessions.reduce((n, s) => n + (s.pack.lines.find(l => l.itemId === item.itemId)?.count ?? 0), 0);
  assert.equal(totalFromStock, totalNeed);
  assert.equal(stockMap(stocked).get(item.itemId), 1_000_000, 'site stock itself unchanged');
  // A step larger than the budget forms its own oversized day.
  const tiny = planSessions(guide, progress, emptySite(), reports, { blocksPerSession: 10, boxesPerSession: 1 }); // below the UI minimum on purpose: steps here have ≤ 16 blocks
  assert.ok(tiny.sessions.some(s => s.oversized));
  assert.ok(tiny.notes.some(n => /größer als das Tagesbudget/.test(n)));
});

test('progress by day: from tick times of existing, unchanged steps', () => {
  const p = burg(), { guide } = derive(p);
  let q = applyOperation(p, tickSteps(guide.steps.slice(0, 2), 'a', '2026-11-01T10:00:00.000Z')).project;
  q = applyOperation(q, tickSteps(guide.steps.slice(2, 5), 'b', '2026-11-02T09:00:00.000Z')).project;
  q = { ...q, progress: { ...q.progress, 'gone~L0~structure': { status: 'done', geometryHash: 'x', at: '2026-11-02T09:00:00.000Z' } } };
  const days = progressByDay(q.progress, guide);
  assert.deepEqual(days.map(d => [d.day, d.steps]), [['2026-11-02', 3], ['2026-11-01', 2]]);
  assert.equal(days[1].blocks, guide.steps.slice(0, 2).reduce((n, s) => n + stepWork(s), 0));
  assert.deepEqual(progressByDay(q.progress, guide, () => 'heute').map(d => d.steps), [5]);
});

test('text sheets name anchor, pack list, steps and runs', () => {
  const p = applyOperation(burg(), worldOperation(createPlacement([1000, 70, 50]))).project;
  const { guide, reports, progress, resolution } = derive(p);
  const plan = planSessions(guide, progress, emptySite(), reports, { blocksPerSession: 60, boxesPerSession: 2 });
  const text = sessionText(plan.sessions[0], resolution.world, anchorOf(p), 'Burg');
  assert.match(text, /^Burg\nBautag 1:/);
  assert.match(text, /Anker \(Projekt 0\/0\/0\) = Welt X 1000 · Y 70 · Z 50/);
  assert.match(text, /Packliste:\n {2}\[ \] Kiste 1/);
  const step = plan.sessions[0].steps[0];
  assert.match(text, new RegExp(`Schritt ${step.order} · `));
  const one = stepText(step, stepRunsIn(step, resolution.world), anchorOf(p));
  assert.match(one, /\[ \] X \d+(…\d+)? · Y 7\d · Z \d+(…\d+)? \(Anker X/);
});

test('rework list and game counts from a recording', () => {
  const { guide } = derive(burg());
  const [a, b, c] = guide.steps;
  const dev = (pos, verdict, stepId) => [positionKey(pos), { position: pos, verdict, expected: 'minecraft:stone', actual: verdict === 'missing' ? 'minecraft:air' : verdict === 'unknown' ? null : 'minecraft:dirt', stepId }];
  const game = {
    steps: new Map([[a.id, { status: 'confirmed' }], [b.id, { status: 'deviating' }], [c.id, { status: 'partial' }]]),
    deviations: new Map([dev([2, 0, 1], 'wrong', b.id), dev([1, 0, 1], 'missing', b.id), dev([0, 0, 0], 'unknown', c.id), dev([5, 0, 0], 'unknown', b.id)]),
  };
  const list = reworkList(game, guide);
  assert.equal(list.length, 1, 'steps with only unknown cells are no rework');
  assert.equal(list[0].step.id, b.id);
  assert.deepEqual(list[0].items.map(i => i.verdict), ['missing', 'wrong'], 'sorted Z then X');
  assert.equal(list[0].unknown, 1);
  assert.deepEqual(gameCounts(guide.steps.slice(0, 4), game), { confirmed: 1, partial: 1, deviating: 1, unchecked: 1 });
});
