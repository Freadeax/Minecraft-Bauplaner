// Ofenstraße in die Planung (PROD-03-Folge, Block 7): furnace buildings from the catalogue, options per target time,
// one undoable batch with copies beside the build, own section before the first smelting section, dependencies, links.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createBuildingLibrary, createProject, applyOperation, execute, undo, newInstance, resolveProject, checkLinks, siteOf, addSection, emptySite,
  addBuilder, programOf, furnaceBuildingOf, furnaceLineOptions, furnaceLineOperation, FURNACE_LINE_BUILDINGS, MAX_FURNACE_MODULES, FURNACE_SECTION_NAME,
} from '../../../dist/domain/src/index.js';

const lib = await createBuildingLibrary();
const versions = new Map(lib.versions.map(v => [v.id, v]));
const latest = id => { const a = lib.assets.find(x => x.id === id); return versions.get(a.versionIds.at(-1)); };
const building = id => { const v = latest(id), a = lib.assets.find(x => x.id === id); return furnaceBuildingOf({ assetId: id, versionId: v.id, name: a.name, payload: v.payload }); };

test('furnace buildings: furnaces counted from the payload, cost like the farm suggestions', () => {
  const [line, module] = FURNACE_LINE_BUILDINGS.map(building);
  assert.equal(line.furnaces, 6); assert.equal(module.furnaces, 3);
  assert.ok(line.blocks > module.blocks && module.blocks > 0);
  assert.ok(line.gatherHours > 0 && module.width === 3);
  assert.equal(furnaceBuildingOf({ assetId: 'x', versionId: 'x', name: 'Turm', payload: latest('bld_technik_lagerwand').payload }), null, 'no furnace → no furnace building');
});

test('options: copies for the target time, cheapest first, capped', () => {
  const list = FURNACE_LINE_BUILDINGS.map(building);
  const two = furnaceLineOptions({ furnaceHours: 20 }, list, 2); // 10 furnaces
  const byId = new Map(two.map(o => [o.building.assetId, o]));
  assert.equal(byId.get('bld_technik_ofenstrasse').copies, 2); assert.equal(byId.get('bld_technik_ofenstrasse').furnaces, 12);
  assert.equal(byId.get('bld_schmelz_modul').copies, 4); assert.equal(byId.get('bld_schmelz_modul').hours, 1.7);
  assert.ok(two.every(o => o.hours <= 2 && o.meetsTarget));
  assert.ok(two[0].blocks <= two[1].blocks, 'fewest blocks first');
  const huge = furnaceLineOptions({ furnaceHours: 1000 }, list, 1);
  assert.ok(huge.every(o => o.copies === MAX_FURNACE_MODULES));
  assert.equal(huge.find(o => o.building.assetId === 'bld_schmelz_modul').meetsTarget, false);
  assert.ok(huge[0].meetsTarget || huge.every(o => !o.meetsTarget));
  assert.deepEqual(furnaceLineOptions({ furnaceHours: 0 }, list, 2), []);
});

test('operation: copies beside the build, section before the first smelting section, waits in the program, one undo', () => {
  const tower = latest('bld_technik_lagerwand');
  const a = newInstance({ assetVersionId: tower.id, name: 'Lager', transform: { position: [0, 0, 0], quarterTurns: 0, mirrorX: false } });
  const b = newInstance({ assetVersionId: tower.id, name: 'Halle', transform: { position: [20, 0, 0], quarterTurns: 0, mirrorX: false } });
  let site = addSection(addSection(emptySite(), 'Lager', [{ instanceId: a.id }], 's1'), 'Halle', [{ instanceId: b.id }], 's2');
  site = addBuilder(site, 'Anna', undefined, 'anna');
  let project = applyOperation(createProject({ name: 'Ofen' }), { kind: 'batch', label: 'x', operations: [{ kind: 'instance.add', instance: a }, { kind: 'instance.add', instance: b }, { kind: 'site.set', site, label: 's' }] }).project;
  const overview = { sections: [{ id: 's1', smelts: 0 }, { id: 's2', smelts: 400 }, { id: '', smelts: 50 }] };
  const module = building('bld_schmelz_modul');
  const option = furnaceLineOptions({ furnaceHours: 10 }, [module], 2)[0];
  assert.equal(option.copies, 2);
  const besideX = resolveProject(project, versions).world.bounds.maxExclusive[0] + 1;
  const placed = furnaceLineOperation({ project, overview, option, besideX, version: latest('bld_schmelz_modul'), sectionId: 'ofen' });
  assert.equal(placed.index, 1); assert.deepEqual(placed.waiting, ['s2']); assert.equal(placed.links, 1, 'neighbouring modules are linked');
  const before = project;
  const done = execute(project, { undo: [], redo: [] }, placed.operation);
  project = done.project;
  const s = siteOf(project);
  assert.deepEqual(s.sections.map(x => x.name), ['Lager', FURNACE_SECTION_NAME, 'Halle']);
  assert.equal(s.sections[1].members.length, 2);
  assert.deepEqual(programOf(s).dependencies.map(d => [d.before, d.after]), [['ofen', 's2']]);
  const added = project.instances.filter(i => i.assetVersionId === module.versionId);
  assert.deepEqual(added.map(i => i.name), ['Schmelzofen-Modul 1', 'Schmelzofen-Modul 2']);
  assert.deepEqual(added.map(i => i.transform.position[0]), [besideX, besideX + 3]);
  const resolved = resolveProject(project, versions);
  assert.equal(resolved.conflicts.length, 0, 'no overlap with the existing build');
  assert.ok(checkLinks(project, versions).every(l => l.state === 'ok'));
  const back = undo(project, done.history);
  assert.equal(before.instances.length, 2);
  assert.equal(back.project.instances.length, 2); assert.deepEqual(siteOf(back.project).sections.map(x => x.id), ['s1', 's2']);
});

test('operation without program and without smelting sections: section first, no dependencies', () => {
  const project = createProject({ name: 'Leer' });
  const line = building('bld_technik_ofenstrasse');
  const placed = furnaceLineOperation({ project, overview: { sections: [{ id: '', smelts: 120 }] }, option: furnaceLineOptions({ furnaceHours: 3 }, [line], 4)[0], besideX: 0 });
  assert.equal(placed.index, 0); assert.deepEqual(placed.waiting, []); assert.equal(placed.links, 0);
  const next = applyOperation(project, placed.operation).project;
  assert.equal(siteOf(next).sections[0].name, FURNACE_SECTION_NAME); assert.equal(siteOf(next).program, undefined);
});
