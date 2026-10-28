import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyOperation, createProject, execute, undo, newInstance, resolveProject, createSampleLibrary, buildGuide, evaluateProgress, tickSteps,
  createBackup, readBackup, checkProjectRecord, BUILDING_SPECS, materialsForResolution, resolveRecipes,
  emptySite, siteOf, checkSite, siteOperation, addSection, updateSection, removeSection, moveSection, setStock, toggleResolvedStock, setReservation, pruneSite,
  sectionOfStep, suggestSections, checkSections, gatherRuleFor, GATHER_BUILDING_IDS, planSite, profileSize, reservationCells, reservationsFor, linkOperation, unlinkedMates,
} from '../dist/domain/src/index.js';

const lib = await createSampleLibrary();
const versions = new Map(lib.versions.map(v => [v.id, v]));
const latest = id => lib.versions.find(v => v.assetId === id).id;
const at = (assetVersionId, name, position) => newInstance({ assetVersionId, name, transform: { position, quarterTurns: 0, mirrorX: false } });
const withInstances = (...instances) => applyOperation(createProject({ name: 'Baustelle' }), { kind: 'batch', label: 't', operations: instances.map(instance => ({ kind: 'instance.add', instance })) }).project;
let n = 0;
const ids = () => `sec_${++n}`;

function burg() {
  return withInstances(at(latest('sample_tower'), 'Turm West', [0, 0, 0]), at(latest('sample_wall'), 'Mauer', [4, 0, 1]), at(latest('sample_tower'), 'Turm Ost', [10, 0, 0]));
}
function derive(project) {
  const resolution = resolveProject(project, versions), guide = buildGuide(project, resolution);
  return { resolution, guide, progress: evaluateProgress(guide, project.progress) };
}
const run = (project, op) => applyOperation(project, op).project;

test('empty default, validation and undoable site.set operation', () => {
  const p = burg();
  assert.equal(p.site, undefined);
  assert.deepEqual(siteOf(p), emptySite());
  let site = addSection(emptySite(), 'Türme', [{ instanceId: p.instances[0].id }], 's1');
  const r = execute(p, { undo: [], redo: [] }, siteOperation(site, 'Abschnitt angelegt'));
  assert.equal(r.project.site.sections[0].name, 'Türme');
  assert.equal(r.history.undo[0].label, 'Abschnitt angelegt');
  const back = undo(r.project, r.history);
  assert.equal(back.project.site, undefined, 'undo removes a site that did not exist before');
  assert.throws(() => checkSite({ ...emptySite(), schemaVersion: 2 }), /Schemaversion/);
  assert.throws(() => checkSite(addSection(addSection(emptySite(), 'A', [], 'x'), 'B', [], 'x')), /doppelt/);
  assert.throws(() => checkSite({ ...emptySite(), stock: { 'minecraft:stone': -1 } }), /Bestand/);
  assert.throws(() => checkSite(addSection(emptySite(), 'A', [{ instanceId: 'i', fromLayer: 3, toLayer: 1 }])), /Endschicht/);
  assert.throws(() => applyOperation(p, { kind: 'site.set', site: { ...emptySite(), recipeMethod: 'magic' } }), /Rezeptweg/);
  site = updateSection(site, 's1', { name: ' Ecktürme ', note: 'zuerst' });
  assert.equal(site.sections[0].name, 'Ecktürme'); assert.equal(site.sections[0].note, 'zuerst');
  site = updateSection(site, 's1', { note: '  ' });
  assert.equal('note' in site.sections[0], false);
});

test('sections: first match wins, layer ranges, presets and plan checks', () => {
  const p = burg(), { guide } = derive(p);
  const [west, wall, east] = p.instances;
  let site = addSection(emptySite(), 'Fundament', [{ instanceId: west.id, toLayer: 0 }, { instanceId: east.id, toLayer: 0 }], 'f');
  site = addSection(site, 'Türme', [{ instanceId: west.id }, { instanceId: east.id }], 't');
  const ground = guide.steps.find(s => s.instanceId === west.id && s.layer === 0), upper = guide.steps.find(s => s.instanceId === west.id && s.layer === 3);
  assert.equal(sectionOfStep(site, ground), 'f');
  assert.equal(sectionOfStep(site, upper), 't');
  assert.equal(sectionOfStep(site, guide.steps.find(s => s.instanceId === wall.id)), null);
  const issues = checkSections(site, p, guide);
  assert.ok(issues.some(i => i.kind === 'overlap' && i.sectionId === 't'), 'Türme overlaps Fundament at layer 0');

  // Reversed order: the towers (upper layers) need the foundation that now comes later.
  const upperFirst = updateSection(site, 't', { members: [{ instanceId: west.id, fromLayer: 1 }, { instanceId: east.id, fromLayer: 1 }] });
  assert.deepEqual(checkSections(upperFirst, p, guide), []);
  const reversed = moveSection(upperFirst, 't', -1);
  assert.deepEqual(reversed.sections.map(s => s.id), ['t', 'f']);
  assert.ok(checkSections(reversed, p, guide).some(i => i.kind === 'order' && i.sectionId === 't'));
  assert.equal(moveSection(site, 'f', -1), site, 'moving beyond the start is a no-op');

  const storeys = suggestSections(p, guide, 'storeys', ids);
  assert.deepEqual(storeys.map(s => s.name), ['Fundament', 'Rohbau', 'Dach und Abschluss']);
  const storeySite = { ...emptySite(), sections: storeys };
  checkSite(storeySite);
  assert.ok(guide.steps.every(s => sectionOfStep(storeySite, s) !== null), 'storeys cover every step');
  assert.deepEqual(checkSections(storeySite, p, guide).filter(i => i.kind !== 'order'), []);
  const perInstance = suggestSections(p, guide, 'instances', ids);
  assert.deepEqual(perInstance.map(s => s.name), ['Turm West', 'Mauer', 'Turm Ost']);

  // Removing an instance leaves an orphan reference until pruned.
  const without = run(p, { kind: 'instance.remove', instanceId: east.id });
  assert.ok(checkSections(site, without, derive(without).guide).some(i => i.kind === 'orphan'));
  const pruned = pruneSite(setReservation(site, east.id, 'west', { depth: 5 }), without);
  assert.ok(pruned.sections.every(s => s.members.every(m => m.instanceId !== east.id)));
  assert.deepEqual(pruned.reservations.overrides, {});
  assert.equal(removeSection(site, 'f').sections.length, 1);
});

test('plan: section progress adds up to the guide, stock is consumed in build order', () => {
  const p = burg(), { guide, resolution } = derive(p);
  const site = { ...emptySite(), sections: suggestSections(p, guide, 'instances', ids) };
  let plan = planSite(site, guide, evaluateProgress(guide, {}), resolution);
  assert.equal(plan.sections.length, 3);
  assert.equal(plan.totals.steps, guide.steps.length);
  assert.equal(plan.totals.blocks, guide.totals.blocks);
  const project = materialsForResolution(resolution);
  const sum = new Map();
  for (const s of plan.sections) for (const i of s.items) sum.set(i.itemId, (sum.get(i.itemId) ?? 0) + i.need);
  assert.deepEqual(Object.fromEntries([...sum].sort()), Object.fromEntries(project.items.map(l => [l.itemId, l.count]).sort()), 'section demand adds up to the material tab');
  assert.equal(plan.currentId, site.sections[0].id);

  // Stock: enough stone bricks for the first section only.
  const firstNeed = plan.sections[0].items.find(i => i.itemId === 'minecraft:stone_bricks').need;
  const stocked = setStock(site, 'stone_bricks', firstNeed + 1);
  plan = planSite(stocked, guide, evaluateProgress(guide, {}), resolution);
  const first = plan.sections[0].items.find(i => i.itemId === 'minecraft:stone_bricks'), second = plan.sections[1].items.find(i => i.itemId === 'minecraft:stone_bricks');
  assert.equal(first.missing, 0);
  assert.equal(second.fromStock, 1, 'the leftover goes to the next section');
  assert.equal(plan.totals.itemsCovered, firstNeed + 1);

  // Ticked steps no longer need material.
  const towerSteps = guide.steps.filter(s => sectionOfStep(site, s) === site.sections[0].id);
  const ticked = run(p, tickSteps(towerSteps, 'Turm fertig'));
  plan = planSite(site, guide, evaluateProgress(guide, ticked.progress), resolution);
  assert.equal(plan.sections[0].complete, true);
  assert.equal(plan.sections[0].items.length, 0);
  assert.equal(plan.sections[0].gatherHours, 0);
  assert.equal(plan.currentId, site.sections[1].id);
  assert.equal(plan.totals.done, towerSteps.length);
});

test('gathering plan follows the recipe tree, marks and fuel', () => {
  const p = burg(), { guide, resolution } = derive(p);
  const site = emptySite();
  const plan = planSite(site, guide, evaluateProgress(guide, {}), resolution);
  assert.equal(plan.sections.length, 1);
  assert.equal(plan.sections[0].name, 'Gesamtes Projekt');
  const items = plan.sections[0].items.map(i => ({ itemId: i.itemId, count: i.need }));
  const recipes = resolveRecipes(items, { method: 'stonecutter' });
  for (const b of recipes.base.filter(b => b.kind === 'raw')) {
    const line = plan.sections[0].gather.find(g => g.itemId === b.itemId);
    assert.ok(line, `${b.itemId} in gathering plan`);
    assert.ok(line.need >= b.count);
  }
  const cobble = plan.sections[0].gather.find(g => g.itemId === 'minecraft:cobblestone');
  assert.equal(cobble.rule.farm, 'Bruchsteingenerator (Lava + Wasser)');
  assert.equal(cobble.hours, Math.round(cobble.missing / 900 * 10) / 10);
  // Stone bricks need smelting (cobblestone → stone): coal for fuel is planned.
  assert.ok(plan.sections[0].gather.some(g => g.itemId === 'minecraft:coal'));

  // Marking stone bricks "vorhanden" removes their tree from gathering.
  const marked = planSite(toggleResolvedStock(site, 'stone_bricks'), guide, evaluateProgress(guide, {}), resolution);
  const mark = marked.sections[0].gather.find(g => g.itemId === 'minecraft:stone_bricks');
  assert.equal(mark.kind, 'resolved'); assert.equal(mark.missing, 0);
  assert.ok(marked.sections[0].gatherHours < plan.sections[0].gatherHours);
  assert.deepEqual(toggleResolvedStock(toggleResolvedStock(site, 'oak_log'), 'minecraft:oak_log').resolvedStock, []);
});

test('gather rules: every source has a rule and farm buildings exist in the catalogue', () => {
  const specIds = new Set(BUILDING_SPECS.map(s => s.id));
  for (const id of GATHER_BUILDING_IDS) assert.ok(specIds.has(id), `${id} is a catalogue building`);
  assert.equal(gatherRuleFor('minecraft:oak_planks'), null, 'crafted items have no gather rule');
  assert.equal(gatherRuleFor('minecraft:oak_log').buildingId, 'bld_baumfarm');
  assert.equal(gatherRuleFor('minecraft:beacon').perHour, null);
  assert.equal(gatherRuleFor('minecraft:netherrack').dimension, 'Nether');
});

test('reservations: profile size, geometry, blocked and linked connectors', () => {
  assert.deepEqual(profileSize('wall_2x5'), { width: 2, height: 5 });
  assert.deepEqual(profileSize('weg_4'), { width: 4, height: 3 });
  assert.equal(profileSize('frei'), null);
  const east = { id: 'e', position: [4, 0, 2], normal: [1, 0, 0], up: [0, 1, 0], type: 't', profile: 'p_2x2' };
  assert.deepEqual(reservationCells(east, 2, 2, 1).map(p => p.join(',')).sort(), ['4,0,1', '4,0,2', '5,0,1', '5,0,2']);
  const west = { ...east, position: [0, 0, 2], normal: [-1, 0, 0] };
  assert.deepEqual(reservationCells(west, 1, 2, 1).map(p => p.join(',')).sort(), ['-1,0,1', '-1,0,2']);

  // A lone tower: four free reservations of 2×5×3 cells each.
  const tower = withInstances(at(latest('sample_tower'), 'Turm', [0, 0, 0]));
  let res = reservationsFor(tower, versions, emptySite(), resolveProject(tower, versions));
  assert.equal(res.length, 4);
  assert.ok(res.every(r => r.state === 'free' && r.cells.length === 2 * 5 * 3 && r.source === 'profile'));

  // A tower placed 1 block east covers the east joint's reserved space.
  const crowded = withInstances(at(latest('sample_tower'), 'Turm', [0, 0, 0]), at(latest('sample_tower'), 'Nachbar', [5, 0, 0]));
  res = reservationsFor(crowded, versions, emptySite(), resolveProject(crowded, versions));
  const blocked = res.filter(r => r.state === 'blocked');
  assert.ok(blocked.some(r => r.instanceName === 'Turm' && r.blockedBy.every(b => b.instanceName === 'Nachbar')));
  // Depth 1 keeps only the gap: free again.
  const shallow = setReservation(emptySite(), crowded.instances[0].id, blocked.find(r => r.instanceName === 'Turm').connector.id, { depth: 1 });
  res = reservationsFor(crowded, versions, shallow, resolveProject(crowded, versions));
  assert.equal(res.find(r => r.instanceName === 'Turm' && r.source === 'override').state, 'free');
  const off = { ...emptySite(), reservations: { defaultDepth: 0, overrides: {} } };
  assert.ok(reservationsFor(crowded, versions, off, resolveProject(crowded, versions)).every(r => r.state === 'off'));

  // Unlinked but mating neighbours are docked, not blocked.
  let p = burg();
  res = reservationsFor(p, versions, emptySite(), resolveProject(p, versions));
  assert.ok(res.filter(r => r.state === 'docked').length >= 4);
  assert.equal(res.find(r => r.state === 'docked' && r.instanceName === 'Turm West').dockedWith, 'Mauer');
  // Linked connectors are reported as linked, not checked.
  for (const m of unlinkedMates(p, versions)) p = run(p, linkOperation(p, versions, m.a, m.b));
  assert.ok(p.links.length >= 2);
  res = reservationsFor(p, versions, emptySite(), resolveProject(p, versions));
  assert.ok(res.filter(r => r.state === 'linked').length >= 4);
  assert.ok(!res.some(r => r.state === 'blocked'), 'the burg keeps its outer joints free');
});

test('backup carries the site plan and rejects a broken one', async () => {
  let p = burg();
  p = run(p, siteOperation(setStock(addSection(emptySite(), 'A', [{ instanceId: p.instances[0].id }], 'a'), 'cobblestone', 64), 'x'));
  const file = await createBackup({ projects: [p], assets: lib.assets, versions, getOriginal: async () => null }, 'project', [p.id]);
  const read = await readBackup(JSON.stringify(file));
  assert.deepEqual(read.projects[0].site, p.site);
  const broken = structuredClone(p);
  broken.site.stock['minecraft:cobblestone'] = 1.5;
  assert.throws(() => checkProjectRecord(broken), /Bestand/);
  assert.doesNotThrow(() => checkProjectRecord(burg()), 'projects without site stay valid');
});
