// FLOW-01 Durchgängiger Bauablauf (07.11.2026), Abnahmeprojekt Hafen: Großprojekt „Große Hafenstadt“ (große Pläne, Wege,
// Wasser, mehrere Gebäude) vom Plan über Nachweis je Schritt, Materialbilanz, Materialtausch mit Vorschau bis zu
// Geländeschnitt und Erdbewegung an einer Küste mit Wasser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyOperation, buildGrossprojektPlan, columnBases, commitProjectEdit, createBuildingLibrary, createGrossprojektProject, createPlacement, createSurvey,
  detectMaterials, earthworkMap, estimateEarthwork, evaluateProgress, grossprojektById, ledgerToCsv, materialLedger, materialTargets, middleLine, planColumns,
  planGrossprojekt, previewGrossprojekt, previewProjectSwap, proofCounts, setStock, siteOf, siteOperation, stepProof, STEP_PROOF_LABEL, terrainSection,
  tickConfirmed, tickStep, tickSteps, worldOperation,
} from '../../../dist/domain/src/index.js';
import { computeProject } from '../../../dist/application/src/projectComputation.js';

const buildings = await createBuildingLibrary();
const versions = new Map(buildings.versions.map(v => [v.id, v]));
const lib = { assets: buildings.assets, versions };
const plan = await buildGrossprojektPlan(planGrossprojekt(grossprojektById('gp_hafenstadt'), lib, {}));
const preview = previewGrossprojekt(plan);
if (plan.network) versions.set(plan.network.version.id, plan.network.version);
const assets = plan.network ? [...buildings.assets, plan.network.asset] : buildings.assets;
const harbor = createGrossprojektProject(plan, preview, { name: 'Hafen Abnahme' });
const compute = project => computeProject({ project, versions });
const base = compute(harbor);

test('Hafen: großes Projekt mit Wegen, mehreren Gebäuden und Bauabschnitten', () => {
  assert.ok(harbor.instances.length >= 10, `${harbor.instances.length} Instanzen`);
  assert.ok(siteOf(harbor).sections.length >= 3);
  assert.ok(base.guide.steps.length > 100);
  assert.ok(base.materials.totals.items > 10_000, `${base.materials.totals.items} Bauitems`);
});

test('Nachweis je Schritt: manuell, im Spiel bestätigt, nach Planänderung neu prüfen, im Spiel abweichend', () => {
  const [a, b, c] = base.guide.steps;
  const ready = new Set(base.site.progress.ready);
  assert.equal(stepProof(a, undefined, ready.has(a.id)), 'ready');
  assert.equal(stepProof(b, undefined, false), 'open');
  assert.equal(stepProof(a, undefined, false, 'confirmed'), 'confirmed-open');
  const manual = applyOperation(harbor, tickStep(a, '2026-11-07T10:00:00.000Z')).project;
  assert.equal(manual.progress[a.id].source, undefined);
  assert.equal(stepProof(a, manual.progress[a.id], false), 'manual');
  assert.equal(stepProof(a, manual.progress[a.id], false, 'confirmed'), 'game', 'Aufnahme bestätigt den Haken');
  assert.equal(stepProof(a, manual.progress[a.id], false, 'deviating'), 'contradicted');
  const viaGame = applyOperation(manual, tickSteps([b], 'Spiel', '2026-11-07T10:00:00.000Z', 'game')).project;
  assert.equal(viaGame.progress[b.id].source, 'game');
  assert.equal(stepProof(b, viaGame.progress[b.id], false), 'game');
  // tickConfirmed marks its ticks as game proof.
  const check = { steps: new Map([[c.id, { status: 'confirmed', ok: c.positions.length, total: c.positions.length }]]), deviations: new Map() };
  const op = tickConfirmed(base.guide, check, () => 'open', '2026-11-07T10:00:00.000Z');
  assert.ok(op.operations.every(o => o.progress.source === 'game'));
  // Changed plan geometry → recheck.
  assert.equal(stepProof({ geometryHash: 'anders' }, manual.progress[a.id], false), 'recheck');
  const counts = proofCounts(base.guide, viaGame.progress, ready, null);
  assert.equal(counts.manual, 1); assert.equal(counts.game, 1);
  assert.equal(Object.keys(STEP_PROOF_LABEL).reduce((n, k) => n + counts[k], 0), base.guide.steps.length);
});

test('Materialbilanz: Gesamtbedarf = verbaut + offen, offen = reserviert + zu beschaffen, Lager in Bau-Reihenfolge', () => {
  const first = siteOf(harbor).sections[0];
  const firstSteps = base.guide.steps.filter(s => base.site.plan.sections[0].steps.includes(s)).slice(0, 3);
  let project = applyOperation(harbor, tickSteps(firstSteps, 'Haken', '2026-11-07T10:00:00.000Z')).project;
  const top = base.materials.items[0];
  project = applyOperation(project, siteOperation(setStock(siteOf(project), top.itemId, 100_000), 'Lager')).project;
  project = applyOperation(project, siteOperation(setStock(siteOf(project), 'minecraft:nautilus_shell', 3), 'Lager')).project;
  const r = compute(project);
  const ledger = materialLedger(r.materials, r.site.plan, siteOf(project).stock);
  assert.equal(ledger.current?.id, first.id);
  for (const l of ledger.lines) {
    if (l.total) assert.equal(l.built + l.open, l.total, `${l.itemId}: verbaut + offen`);
    assert.equal(l.reserved + l.procure, l.open, `${l.itemId}: reserviert + beschaffen`);
    assert.ok(l.reservedNow <= l.reserved && l.procureNow <= l.procure);
    assert.equal(l.free, Math.max(0, l.stock - l.reserved));
  }
  const t = ledger.lines.find(l => l.itemId === top.itemId);
  assert.equal(t.procure, 0); assert.equal(t.reserved, t.open); assert.ok(t.free > 0);
  const shell = ledger.lines.find(l => l.itemId === 'minecraft:nautilus_shell');
  assert.deepEqual([shell.total, shell.stock, shell.free], [0, 3, 3], 'Lager ohne Bedarf ist frei');
  assert.ok(ledger.totals.built > 0, 'abgehakte Schritte zählen als verbaut');
  assert.equal(ledger.totals.open, r.site.plan.totals.itemsNeeded);
  assert.match(ledgerToCsv(ledger).split('\r\n')[0], /^Item;Gesamtbedarf;Verbaut;Offen;Lager;Reserviert/);
});

test('Materialtausch mit Vorschau: Instanzen, Blockwechsel, Mehr-/Minderbedarf, abgehakte Schritte werden neu prüfen', async () => {
  const world = base.resolution.world;
  const used = detectMaterials(world, { scoped: true });
  const wood = used.find(u => u.set.kind === 'holz');
  assert.ok(wood, 'Hafen enthält Holz');
  const target = materialTargets(wood.set).find(m => m.id !== wood.set.id);
  const swaps = [{ from: wood.set.id, to: target.id, forms: wood.forms }];
  // Tick every step, then preview.
  const ticked = applyOperation(harbor, tickSteps(base.guide.steps, 'alles', '2026-11-07T10:00:00.000Z')).project;
  const status = id => ticked.progress[id] ? 'done' : 'open';
  const stock = { [`minecraft:${target.forms.planks}`]: 10 };
  const p = previewProjectSwap({ resolution: base.resolution, guide: base.guide, status, swaps, stock });
  assert.ok(p.replaced > 0 && p.instances.length >= 2, `${p.replaced} Zellen in ${p.instances.length} Instanzen`);
  assert.equal(p.instances.reduce((n, i) => n + i.cells, 0), p.replaced);
  assert.equal(p.transitions.reduce((n, t) => n + t.count, 0), p.replaced);
  assert.ok(p.transitions.every(t => t.from.includes(wood.set.forms.planks?.split('_')[0] ?? '') || t.from !== t.to));
  const more = p.items.filter(i => i.delta > 0), less = p.items.filter(i => i.delta < 0);
  assert.ok(more.length && less.length, 'neues Holz mehr, altes weniger');
  const planks = p.items.find(i => i.itemId === `minecraft:${target.forms.planks}`);
  if (planks) assert.equal(planks.shortfall, Math.max(0, planks.delta - 10));
  assert.ok(p.recheck.length > 0 && p.recheck.length === p.stepsTouched, 'alle betroffenen Schritte waren abgehakt');
  // Restricting to one instance changes only that instance.
  const only = p.instances[0].id;
  const one = previewProjectSwap({ resolution: base.resolution, guide: base.guide, status, swaps, instanceId: only });
  assert.deepEqual(one.instances.map(i => i.id), [only]);
  assert.ok(one.replaced < p.replaced);
  // Commit through the same path as the Blöcke tab: the touched ticks become „prüfbedürftig“, nothing else.
  const c = await commitProjectEdit(ticked, base.resolution, assets, one.draft, { loose: 'new', newName: 'x' });
  const v = new Map(versions); for (const x of c.versions) v.set(x.id, x);
  const after = applyOperation(ticked, c.operation).project;
  const r = computeProject({ project: after, versions: v });
  const review = r.guide.steps.filter(s => r.site.progress.status.get(s.id) === 'review').map(s => s.id).sort();
  assert.deepEqual(review, one.recheck.map(s => s.id).sort());
  assert.equal(r.materials.items.find(i => i.itemId === one.items[0].itemId)?.count ?? 0, one.items[0].after);
});

test('Geländeschnitt an der Küste: Wassertiefe, Abtrag, Unterbau und Kollisionen wie die Erdarbeiten der Weltkarte; Live getrennt', () => {
  const world = base.resolution.world, b = world.bounds;
  const placement = createPlacement([1000, 64, 2000]);
  const wx0 = b.min[0] + 1000 - 8, wz0 = b.min[2] + 2000 - 8, w = b.maxExclusive[0] - b.min[0] + 16, l = b.maxExclusive[2] - b.min[2] + 16;
  const midZ = wz0 + Math.floor(l / 2);
  // North half land sloping up (hill reaches into the plan), south half sea floor at 58 with water up to 62.
  const ids = ['?', 'minecraft:grass_block', 'minecraft:water'];
  const n = w * l, ground = new Int16Array(n), surface = new Int16Array(n), gb = new Uint16Array(n).fill(1), sb = new Uint16Array(n);
  for (let z = 0; z < l; z++) for (let x = 0; x < w; x++) {
    const i = x + z * w, wz = wz0 + z;
    if (wz >= midZ) { ground[i] = 58; surface[i] = 62; sb[i] = 2; } else { ground[i] = 63 + (x % 7 === 0 ? 2 : 0); surface[i] = ground[i]; sb[i] = 1; }
  }
  const survey = createSurvey({ minX: wx0, minZ: wz0, width: w, length: l, ground, surface, groundBlock: gb, surfaceBlock: sb, ids }, { dimension: 'minecraft:overworld', readAt: '2026-11-07T00:00:00.000Z' });
  const cols = planColumns(world, placement);
  const map = earthworkMap(survey, cols, { margin: 4 });
  const ref = estimateEarthwork(columnBases(world.cells, placement.origin), survey);
  assert.equal(map.totals.cut, ref.cut); assert.equal(map.totals.fill, ref.fill);
  assert.equal(map.totals.collisions, ref.buried); assert.equal(map.totals.wet, ref.water);
  assert.equal(map.totals.planned, ref.columns); assert.equal(map.totals.maxWater, 4);
  assert.ok(map.totals.collisions > 0, 'Hügelspalten ragen in den Plan');
  // A north-south section crosses land and sea.
  const line = middleLine(map, 'z');
  const s = terrainSection(map, 'z', line);
  assert.equal(s.columns.length, map.length);
  assert.ok(s.columns.some(c => c.fluid && c.water === 4) && s.columns.some(c => !c.fluid));
  assert.ok(s.yMin <= 56 && s.yMax >= 62);
  // Live terrain is compared, never merged: one dug column shows as changed, the stored survey stays the same.
  const g2 = ground.slice(), s2 = surface.slice(); g2[10 + 10 * w] -= 3; s2[10 + 10 * w] -= 3;
  const live = createSurvey({ minX: wx0, minZ: wz0, width: w, length: l, ground: g2, surface: s2, groundBlock: gb, surfaceBlock: sb, ids }, { dimension: 'minecraft:overworld', readAt: '2026-11-07T12:00:00.000Z', source: 'mod' });
  const withLive = earthworkMap(survey, cols, { margin: 4, live });
  assert.equal(withLive.totals.changed, 1);
  assert.equal(withLive.totals.cut, map.totals.cut, 'Zahlen bleiben auf der Aufnahme');
  // Section x through the sea: every planned column there stands in water.
  const sea = terrainSection(map, 'x', midZ + 3);
  assert.ok(sea.columns.filter(c => c.plan).every(c => c.wet || c.plan.low > 63));
  // Placement moves with the world placement.
  const moved = planColumns(world, { ...placement, origin: [1001, 64, 2000] });
  assert.equal(moved.size, cols.size);
  assert.ok(applyOperation(harbor, worldOperation(placement)).project.world);
});
