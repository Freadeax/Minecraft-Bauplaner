// Produktion (PROD-01…04): farm catalogue, record, harvest log, coverage, readiness, suggestions, furnaces, logistics, AFK spot, connections.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyOperation, createProject, execute, undo, newInstance, resolveProject, createSampleLibrary, buildGuide, evaluateProgress, BUILDING_SPECS,
  createBackup, readBackup, checkProjectRecord, emptySite, checkSite, siteOperation, planSite, pruneSite, DEFAULT_PACE, gatherRuleFor, addSection,
  FARM_TYPES, FARM_GROUPS, farmType, farmTypesFor, farmTypesForBuilding, flowFor, emptyProduction, productionOf, checkProduction,
  addFarm, updateFarm, removeFarm, setProductionSettings, logHarvest, removeHarvest, MAX_FARMS,
  inRange, afkCoverage, bestAfkSpot, farmStatuses, netFuelSmelts, analyzeProduction, detectFarms, guessFarmType, dimensionOf, worldDimensionOf,
  farmsOnMap, splitGathering, productionText, SUGGESTION_TARGET_DAYS,
} from '../dist/domain/src/index.js';

const rule = id => gatherRuleFor(id);
/** Minimal site overview: one gather line per [itemId, missing] in each section. */
function overview(sections) {
  return {
    sections: sections.map(([id, lines, extra = {}]) => ({
      id, name: id || 'Gesamt', steps: [], done: 0, review: 0, open: 1, blocks: 0, blocksDone: 0, ready: [],
      items: extra.items ?? [], gather: lines.map(([itemId, missing, kind = 'raw']) => ({ itemId, kind, need: missing, fromStock: 0, missing, rule: kind === 'unknown' ? null : rule(itemId), hours: null, slots: 1 })),
      gatherHours: 0, unplannable: 0, unresolvedCells: 0, complete: false, smelts: extra.smelts ?? 0, cookTicks: extra.cookTicks ?? 0,
    })),
    totals: {}, currentId: null, notes: [],
  };
}
const ow = (x, y, z) => ({ x, y, z, dimension: 'Oberwelt' });

test('farm catalogue: unique ids, groups, outputs and catalogue buildings exist', () => {
  const ids = new Set(FARM_TYPES.map(t => t.id));
  assert.equal(ids.size, FARM_TYPES.length);
  assert.ok(FARM_TYPES.length >= 30);
  const specIds = new Set(BUILDING_SPECS.map(s => s.id));
  for (const t of FARM_TYPES) {
    assert.match(t.id, /^[a-z]+$/, `${t.id} ascii`);
    assert.ok(FARM_GROUPS.includes(t.group), t.id);
    assert.ok(t.outputs.length && t.outputs.every(o => o.item.startsWith('minecraft:') && o.perHour > 0), t.id);
    assert.ok(t.basis && t.needs.length, `${t.id} explains its rate`);
    if (t.buildingId) assert.ok(specIds.has(t.buildingId), `${t.id}: ${t.buildingId} is a catalogue building`);
  }
  assert.equal(farmTypesForBuilding('bld_eisenfarm')[0].id, 'eisen');
  assert.ok(farmTypesFor('raw_iron').some(t => t.id === 'eisen'), 'iron ingots cover raw iron');
  assert.equal(flowFor(farmType('eisen'), 'minecraft:raw_iron').item, 'minecraft:iron_ingot');
  assert.ok(farmTypesFor('oak_log').some(t => t.id === 'baum'));
});

test('record: validation, edits, undo via site.set, backup round trip', async () => {
  let site = addFarm(emptySite(), { type: 'zuckerrohr', units: 3 }, 'f1');
  assert.equal(productionOf(site).farms[0].name, 'Zuckerrohr-Farm (Beobachter)');
  assert.deepEqual(productionOf(emptySite()), emptyProduction());
  site = updateFarm(site, 'f1', { state: 'laeuft', at: ow(10, 64, 10), note: ' an der Küste ', name: ' Rohr ' });
  const f = productionOf(site).farms[0];
  assert.equal(f.name, 'Rohr'); assert.equal(f.note, 'an der Küste'); assert.equal(f.state, 'laeuft');
  site = updateFarm(site, 'f1', { note: ' ', at: null });
  assert.equal('note' in productionOf(site).farms[0], false); assert.equal('at' in productionOf(site).farms[0], false);
  assert.throws(() => addFarm(emptySite(), { type: 'zauberfarm' }), /unbekannt/);
  assert.throws(() => updateFarm(site, 'f1', { units: 0 }), /Anzahl/);
  assert.throws(() => updateFarm(site, 'nope', { units: 2 }), /existiert nicht/);
  assert.throws(() => checkProduction({ ...emptyProduction(), simulationDistance: 64 }), /Simulationsdistanz/);
  assert.throws(() => checkSite({ ...emptySite(), production: { ...emptyProduction(), schemaVersion: 9 } }), /Schemaversion/);
  let many = emptySite();
  for (let i = 0; i < MAX_FARMS; i++) many = addFarm(many, { type: 'kaktus' }, `k${i}`);
  assert.throws(() => addFarm(many, { type: 'kaktus' }, 'k-last'), /höchstens/);
  site = setProductionSettings(site, { gatherHoursPerDay: 2.1, afkHoursPerDay: 6, simulationDistance: 12, afk: ow(0, 70, 0) });
  assert.equal(productionOf(site).gatherHoursPerDay, 2); assert.equal(productionOf(site).simulationDistance, 12); assert.deepEqual(productionOf(site).afk, ow(0, 70, 0));
  assert.equal('afk' in productionOf(setProductionSettings(site, { afk: null })), false);

  const project = createProject({ name: 'P' });
  const r = execute(project, { undo: [], redo: [] }, siteOperation(site, 'Farm angelegt'));
  assert.equal(r.project.site.production.farms.length, 1);
  assert.equal(undo(r.project, r.history).project.site, undefined);
  const lib = await createSampleLibrary();
  const file = await createBackup({ projects: [r.project], assets: lib.assets, versions: new Map(lib.versions.map(v => [v.id, v])), getOriginal: async () => null }, 'project', [r.project.id]);
  const back = await readBackup(JSON.stringify(file));
  assert.deepEqual(back.projects[0].site.production, r.project.site.production);
  const broken = structuredClone(r.project);
  broken.site.production.farms[0].units = -2;
  assert.throws(() => checkProjectRecord(broken), /Anzahl/);
});

test('harvest log: adds to stock in one step, measured rate replaces the guide value, removal takes it back', () => {
  let site = addFarm(emptySite(), { type: 'zuckerrohr', units: 2, state: 'laeuft' }, 'f1');
  site = setProductionSettings(site, { gatherHoursPerDay: 2, afkHoursPerDay: 0 });
  let st = farmStatuses(productionOf(site))[0];
  assert.equal(st.rates[0].source, 'Richtwert'); assert.equal(st.rates[0].perHour, 66); assert.equal(st.rates[0].perDay, 132);
  site = logHarvest(site, { farmId: 'f1', itemId: 'sugar_cane', count: 90, hours: 0.5, day: '2026-11-04' }, 'h1');
  assert.equal(site.stock['minecraft:sugar_cane'], 90);
  assert.equal(farmStatuses(productionOf(site))[0].rates[0].source, 'Richtwert', 'under one logged hour the guide value stays');
  site = logHarvest(site, { farmId: 'f1', itemId: 'minecraft:sugar_cane', count: 60, hours: 1, day: '2026-11-05' }, 'h2');
  st = farmStatuses(productionOf(site))[0];
  assert.equal(st.rates[0].source, 'gemessen'); assert.equal(st.rates[0].perHour, 100); assert.equal(st.rates[0].measuredHours, 1.5);
  assert.equal(site.stock['minecraft:sugar_cane'], 150);
  assert.throws(() => logHarvest(site, { farmId: 'f1', itemId: 'sugar_cane', count: 1, hours: 1, day: '4.11.' }), /JJJJ-MM-TT/);
  assert.throws(() => logHarvest(site, { farmId: 'zz', itemId: 'sugar_cane', count: 1, hours: 1, day: '2026-11-04' }), /existiert nicht/);
  site = removeHarvest(site, 'h1');
  assert.equal(site.stock['minecraft:sugar_cane'], 60);
  site = removeFarm(site, 'f1');
  assert.equal(productionOf(site).log.length, 0, 'removing a farm removes its log'); assert.equal(site.stock['minecraft:sugar_cane'], 60, 'stock stays');
});

test('ranges and AFK spot: random ticks, mob distance, simulation distance, dimensions', () => {
  const crop = farmType('zuckerrohr'), mob = farmType('mobfarm'), iron = farmType('eisen');
  assert.equal(inRange(crop, ow(100, 64, 0), ow(0, 64, 0), 10).ok, true);
  assert.match(inRange(crop, ow(140, 64, 0), ow(0, 64, 0), 10).reason, /128/);
  assert.match(inRange(mob, ow(10, 64, 0), ow(0, 64, 0), 10).reason, /zu nah/);
  assert.equal(inRange(mob, ow(0, 64, 40), ow(0, 64, 0), 10).ok, true);
  assert.match(inRange(iron, ow(200, 64, 0), ow(0, 64, 0), 10).reason, /Simulationsdistanz/);
  assert.equal(inRange(iron, ow(200, 64, 0), ow(0, 64, 0), 16).ok, true);
  assert.match(inRange(iron, { ...ow(0, 64, 0), dimension: 'Nether' }, ow(0, 64, 0), 10).reason, /Dimension/);

  let site = emptySite();
  site = addFarm(site, { type: 'zuckerrohr', state: 'laeuft', at: ow(0, 64, 0) }, 'a');
  site = addFarm(site, { type: 'eisen', state: 'laeuft', at: ow(120, 64, 0) }, 'b');
  site = addFarm(site, { type: 'mobfarm', state: 'plan', at: ow(60, 64, 0) }, 'c');
  site = addFarm(site, { type: 'weizen', state: 'laeuft', at: ow(5000, 64, 0) }, 'd'); // semi-automatic: not part of the AFK analysis
  site = addFarm(site, { type: 'zuckerrohr', state: 'aus', at: ow(9000, 64, 0) }, 'e');
  const best = bestAfkSpot(productionOf(site));
  assert.deepEqual([...best.covered].sort(), ['a', 'b', 'c'], 'one spot covers all three automatic farms');
  assert.ok(best.spot.y > 64, 'lifted away from the mob farm');
  const there = afkCoverage(productionOf(site), ow(0, 64, 0));
  assert.ok(there.missed.some(m => m.farmId === 'c' && /zu nah|24/.test(m.reason)) || there.covered.includes('c'));
  assert.equal(bestAfkSpot(productionOf(emptySite())), null);
});

test('coverage: farms vs hand, greedy balance, bottleneck and readiness per section with schedule', () => {
  let site = setProductionSettings(emptySite(), { gatherHoursPerDay: 0.5, afkHoursPerDay: 0 });
  site = addFarm(site, { type: 'zuckerrohr', units: 4, state: 'laeuft' }, 'zr'); // 132 h⁻¹ · 0.5 h = 66/day
  site = addFarm(site, { type: 'eisen', units: 2, state: 'laeuft' }, 'fe');      // 300 ingots/h · 0.5 h = 150/day, covers raw iron
  const lines1 = [['minecraft:sugar_cane', 132], ['minecraft:cobblestone', 1800], ['minecraft:raw_iron', 150]];
  const ov = overview([['s1', lines1], ['s2', [['minecraft:sugar_cane', 66], ['minecraft:diamond', 8], ['minecraft:beacon', 1, 'unknown']]]]);
  const schedule = [{ id: 's1', start: 0, startDate: null, state: 'ready' }, { id: 's2', start: 6, startDate: null, state: 'open' }];
  const r = analyzeProduction({ site, overview: ov, pace: DEFAULT_PACE, schedule });
  const by = id => r.coverage.find(c => c.itemId === `minecraft:${id}`);
  assert.equal(by('sugar_cane').way, 'farm'); assert.equal(by('sugar_cane').farmDays, 3);
  assert.equal(by('raw_iron').way, 'farm'); assert.deepEqual(by('raw_iron').farmIds, ['fe']); assert.equal(by('raw_iron').farmDays, 1);
  assert.equal(by('cobblestone').way, 'hand'); assert.equal(by('cobblestone').handHours, 2);
  assert.equal(by('beacon').way, 'offen');
  assert.equal(r.totals.handHours, 3); assert.equal(r.totals.handDays, 6); assert.equal(r.totals.farmDays, 3);
  assert.equal(r.totals.readyDays, null, 'an item without a rate keeps the end open');
  assert.equal(r.totals.bottleneck.itemId, 'minecraft:cobblestone', 'hand work dominates');
  const [a, b] = r.sections;
  assert.equal(a.readyDay, 4, 's1: 2 h cobblestone at 0.5 h/day'); assert.equal(a.bottleneck, 'minecraft:cobblestone'); assert.equal(a.late, true, 'building starts on day 0');
  assert.equal(b.readyDay, null); assert.deepEqual(b.unknown, ['minecraft:beacon']);

  // Without the beacon: s2 is ready after 6 days (diamonds wait behind the cobblestone), the program starts it on day 6.
  const r2 = analyzeProduction({ site, overview: overview([['s1', lines1], ['s2', [['minecraft:sugar_cane', 66], ['minecraft:diamond', 8]]]]), pace: DEFAULT_PACE, schedule });
  assert.equal(r2.sections[1].readyDay, 6); assert.equal(r2.sections[1].late, false);
  assert.equal(r2.totals.readyDays, 6); assert.equal(r2.totals.late, 1);

  // Greedy: with more hand time the small cane farm is slower than gathering by hand → moved to the hand queue.
  const fast = analyzeProduction({ site: setProductionSettings(site, { gatherHoursPerDay: 4 }), overview: overview([['s', [['minecraft:sugar_cane', 6600]]]]), pace: DEFAULT_PACE });
  assert.equal(fast.coverage[0].way, 'hand', '12.5 farm days vs 4.1 hand days');
  // Semi-automatic farm raises the hand rate.
  const cob = analyzeProduction({ site: addFarm(site, { type: 'bruchstein', state: 'laeuft' }, 'cg'), overview: overview([['s', [['minecraft:cobblestone', 1800]]]]), pace: DEFAULT_PACE });
  assert.equal(cob.coverage[0].handBy, 'Farm'); assert.equal(cob.coverage[0].handHours, 1.5);
});

test('suggestions: amortisation from build cost, units for the target, planned flag', () => {
  const site = setProductionSettings(emptySite(), { gatherHoursPerDay: 2, afkHoursPerDay: 2 });
  const ov = overview([['s', [['minecraft:sugar_cane', 4000], ['minecraft:bone', 300], ['minecraft:string', 100]]]]);
  const costs = new Map([['bld_zuckerrohr_modul', { blocks: 500, gatherHours: 1 }]]);
  const r = analyzeProduction({ site: addFarm(site, { type: 'mobfarm' }, 'plan'), overview: ov, pace: DEFAULT_PACE, farmCosts: costs });
  const cane = r.suggestions.find(s => s.type.id === 'zuckerrohr');
  assert.equal(cane.savedHours, 10, '4000 cane by hand at 400/h');
  assert.equal(cane.units, Math.ceil(4000 / (33 * 4 * SUGGESTION_TARGET_DAYS)));
  assert.equal(cane.buildHours, 2 * cane.units);
  assert.equal(cane.verdict, cane.savedHours >= cane.buildHours ? 'lohnt' : cane.savedHours >= cane.buildHours / 2 ? 'knapp' : 'lohnt nicht');
  const mob = r.suggestions.find(s => s.type.id === 'mobfarm');
  assert.equal(mob.items.length, 2, 'one mob farm covers bones and string'); assert.equal(mob.planned, true);
  assert.equal(mob.costSource, 'Richtwert'); assert.equal(mob.savedHours, 5); assert.equal(mob.buildHours, 8); assert.equal(mob.verdict, 'knapp');
  assert.equal(cane.costSource, 'Bauplan');
  const tiny = analyzeProduction({ site, overview: overview([['s', [['minecraft:coal', 28]]]]), pace: DEFAULT_PACE });
  assert.equal(tiny.suggestions.length, 0, 'a farm for a quarter hour of coal is noise');
  assert.ok(!r.suggestions.some(s => s.type.id === 'eisen'), 'only farms for demanded items');
});

test('furnaces, fuel farms (kelp net), storage and logistics', () => {
  let site = setProductionSettings(emptySite(), { gatherHoursPerDay: 2, afkHoursPerDay: 6 });
  site = addFarm(site, { type: 'seetang', units: 2, state: 'laeuft' }, 'kelp'); // 240/h * 8h = 1920 kelp/day
  site = addFarm(site, { type: 'mobfarm', units: 4, state: 'laeuft' }, 'mob');
  const ov = overview([['s', [], { smelts: 720, cookTicks: 720 * 200, items: [{ itemId: 'minecraft:stone_bricks', need: 640, fromStock: 0, missing: 640, assumed: false }, { itemId: 'minecraft:oak_door', need: 4, fromStock: 0, missing: 4, assumed: false }] }]]);
  const r = analyzeProduction({ site, overview: ov, pace: DEFAULT_PACE });
  assert.equal(r.furnaces.furnaceHours, 2); assert.deepEqual(r.furnaces.furnacesFor.map(f => f.furnaces), [2, 1, 1, 1]);
  assert.ok(r.furnaces.fuel.some(f => f.itemId === 'minecraft:coal' && f.count === 90));
  assert.equal(netFuelSmelts('kelp'), 1.22); assert.equal(netFuelSmelts('coal'), 8); assert.equal(netFuelSmelts('stone'), 0);
  assert.equal(r.furnaces.farmFuelSmeltsPerDay, Math.round(1920 * 1.22 * 10) / 10);
  assert.ok(r.furnaces.farmFuelDays < 1);
  assert.deepEqual(r.storage[0], { id: 's', name: 's', slots: 10 + 1, doubleChests: 1, shulkers: 1, trips: 1 });
  const mob = r.farms.find(f => f.farm.id === 'mob');
  assert.equal(mob.logistics.itemsPerHour, 4 * 540); assert.equal(mob.logistics.fullWithinDay, true);
  assert.ok(mob.issues.some(i => /Doppeltruhe/.test(i)));
  assert.ok(r.sorterItems.includes('minecraft:kelp') && r.sorterItems.includes('minecraft:bone'));
});

test('inputs: bartering and trading need supply from other farms', () => {
  let site = setProductionSettings(emptySite(), { gatherHoursPerDay: 1, afkHoursPerDay: 0 });
  site = addFarm(site, { type: 'piglin', state: 'laeuft' }, 'p');
  let st = farmStatuses(productionOf(site)).find(f => f.farm.id === 'p');
  assert.equal(st.inputs[0].perDay, 300); assert.match(st.issues[0], /gold_ingot/);
  site = addFarm(site, { type: 'gold', units: 2, state: 'laeuft' }, 'g');
  st = farmStatuses(productionOf(site)).find(f => f.farm.id === 'p');
  assert.equal(st.inputs[0].suppliedPerDay, 500); assert.equal(st.issues.length, 0);
});

test('connections: farms in the project, world plan points, gathering split, text', () => {
  const prod = productionOf(addFarm(emptySite(), { type: 'eisen', instanceId: 'i2' }, 'f'));
  const det = detectFarms(prod, [
    { id: 'i1', name: 'Turm', assetId: 'sample_tower', built: 1 },
    { id: 'i2', name: 'Eisenfarm', assetId: 'bld_eisenfarm', built: 1 },
    { id: 'i3', name: 'Kaktus', assetId: 'bld_kaktusfarm', built: 0.4 },
  ]);
  assert.deepEqual(det.map(d => [d.instanceId, d.type.id, d.farmId, d.suggested]), [['i2', 'eisen', 'f', 'laeuft'], ['i3', 'kaktus', null, 'bau']]);

  assert.equal(guessFarmType('Eisenfarm Nord').id, 'eisen');
  assert.equal(guessFarmType('Kürbisse').id, 'kuerbis');
  assert.equal(guessFarmType('Treffpunkt'), null);
  assert.equal(dimensionOf('minecraft:the_nether'), 'Nether'); assert.equal(worldDimensionOf('Ende'), 'minecraft:the_end');
  const items = [
    { kind: 'point', id: 'p1', type: 'farm', name: 'Goldfarm', note: '', dimension: 'minecraft:the_nether', x: 10, y: 128, z: -5 },
    { kind: 'point', id: 'p2', type: 'lager', name: 'Lager', note: '', dimension: 'minecraft:overworld', x: 0, y: 64, z: 0 },
  ];
  const map = farmsOnMap(prod, items);
  assert.equal(map.length, 1); assert.equal(map[0].type.id, 'gold'); assert.equal(map[0].at.dimension, 'Nether'); assert.equal(map[0].farmId, null);

  const coverage = [
    { itemId: 'minecraft:quartz', way: 'hand', handHours: 3, missing: 900, dimension: 'Nether', activity: 'Abbauen' },
    { itemId: 'minecraft:glowstone_dust', way: 'hand', handHours: 1, missing: 250, dimension: 'Nether', activity: 'Abbauen' },
    { itemId: 'minecraft:cobblestone', way: 'hand', handHours: 2, missing: 1800, activity: 'Abbauen' },
    { itemId: 'minecraft:oak_log', way: 'hand', handHours: 1.5, missing: 375, activity: 'Holzfällen' },
    { itemId: 'minecraft:sugar_cane', way: 'farm', handHours: 1, missing: 400, activity: 'x' },
  ];
  const split = splitGathering(coverage, [{ id: 'a', name: 'Philipp' }, { id: 'b', name: 'Mia' }]);
  assert.deepEqual(split.map(s => s.hours), [4, 3.5]);
  assert.equal(split[0].jobs[0].label, 'Nether-Tour'); assert.equal(split[0].jobs[0].items.length, 2);
  assert.deepEqual(splitGathering(coverage, []), []);

  const r = analyzeProduction({ site: emptySite(), overview: overview([['s', [['minecraft:cobblestone', 600]]]]), pace: DEFAULT_PACE });
  const text = productionText(r, 'Burg', split);
  assert.match(text, /Produktion – Burg/); assert.match(text, /Sammelaufträge/); assert.match(text, /Philipp \(4 h\)/);
});

test('integration: planSite feeds the analysis, smelts per section, pruning keeps farms', async () => {
  const lib = await createSampleLibrary(), versions = new Map(lib.versions.map(v => [v.id, v]));
  const latest = id => lib.versions.find(v => v.assetId === id).id;
  const inst = newInstance({ assetVersionId: latest('sample_tower'), name: 'Turm', transform: { position: [0, 0, 0], quarterTurns: 0, mirrorX: false } });
  const project = applyOperation(createProject({ name: 'B' }), { kind: 'instance.add', instance: inst }).project;
  const resolution = resolveProject(project, versions), guide = buildGuide(project, resolution);
  let site = addSection(emptySite(), 'Turm', [{ instanceId: inst.id }], 's');
  site = addFarm(site, { type: 'bruchstein', state: 'laeuft', instanceId: inst.id }, 'cg');
  const plan = planSite(site, guide, evaluateProgress(guide, project.progress), resolution);
  assert.equal(typeof plan.sections[0].smelts, 'number');
  const r = analyzeProduction({ site, overview: plan, pace: DEFAULT_PACE });
  assert.equal(r.totals.missing, plan.sections.reduce((n, s) => n + s.gather.reduce((m, g) => m + g.missing, 0), 0), 'demand = missing of the gathering plan');
  const pruned = pruneSite(site, { instances: [] });
  assert.equal(productionOf(pruned).farms.length, 1); assert.equal('instanceId' in productionOf(pruned).farms[0], false);
});
