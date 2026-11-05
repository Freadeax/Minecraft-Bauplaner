import test from 'node:test';
import assert from 'node:assert/strict';
import { createPayload, blockFacts } from '../../../dist/voxel/src/index.js';
import { swapMaterials, computeMaterials, resolveRecipes, chooseRecipe } from '../../../dist/domain/src/index.js';
import { copperMatrix, copperVariant, stageId, COPPER_STAGES } from '../../../dist/domain/src/materials/copper.js';
import { SCOPED_MATERIAL_SETS, scopedMaterialOf, materialTargets } from '../../../dist/domain/src/materials/variants.js';

const mc = (id, properties = {}) => ({ id: `minecraft:${id}`, properties });
function one(state, blockEntities = []) {
  return createPayload({ schemaVersion: 1, profileId: 'test', bounds: { min: [0, 0, 0], maxExclusive: [1, 1, 1] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0],
    palette: [state], cells: [{ position: [0, 0, 0], kind: 'block', paletteIndex: 0 }], blockEntities });
}

test('MAT-04: copper matrix from the profile – 15 complete families, 4 stages, waxed twins', () => {
  const m = copperMatrix();
  assert.equal(m.profileId, 'java-26.3');
  assert.deepEqual(m.incomplete, []);
  assert.equal(m.families.length, 15);
  for (const f of m.families) for (const s of COPPER_STAGES) {
    assert.ok(blockFacts(f.ids[s]).classes.includes(f.gameClass), `${f.ids[s]} oxidiert`);
    assert.ok(!blockFacts(f.waxed[s]).classes.some(c => c.startsWith('Weathering')), `${f.waxed[s]} oxidiert nicht`);
  }
  assert.equal(stageId('copper_block', 'exposed'), 'exposed_copper');
  assert.equal(stageId('lightning_rod', 'oxidized'), 'oxidized_lightning_rod');
  assert.deepEqual(copperVariant('minecraft:waxed_weathered_cut_copper_stairs'), { family: m.families.find(f => f.form === 'cut_copper_stairs'), stage: 'weathered', waxed: true });
  assert.equal(copperVariant('minecraft:waxed_copper_block').stage, 'unaffected');
  assert.equal(copperVariant('minecraft:iron_block'), undefined);
});

test('MAT-04: swapping stage and wax keeps every property; complete sets only', () => {
  const sets = SCOPED_MATERIAL_SETS.filter(s => s.kind === 'kupfer');
  assert.equal(sets.length, 8);
  for (const s of sets) assert.equal(Object.keys(s.forms).length, 15, s.id);
  const stairs = mc('cut_copper_stairs', { facing: 'east', half: 'top', shape: 'outer_left', waterlogged: 'true' });
  const from = scopedMaterialOf(stairs.id).set;
  assert.equal(from.id, 'kupfer_unaffected');
  assert.ok(materialTargets(from).every(t => t.kind === 'kupfer'));
  const r = swapMaterials(one(stairs), [{ from: 'kupfer_unaffected', to: 'kupfer_oxidized_gewachst' }]);
  assert.equal(r.replaced, 1);
  assert.deepEqual(r.payload.palette[0], mc('waxed_oxidized_cut_copper_stairs', stairs.properties));
  // A copper chest keeps its inventory: same block entity type (chest) at every stage.
  const chestData = { type: 'compound', value: { id: { type: 'string', value: 'minecraft:chest' }, Items: { type: 'list', elementType: 'compound', value: [] } } };
  const chest = one(mc('copper_chest', { facing: 'north', type: 'single', waterlogged: 'false' }), [{ position: [0, 0, 0], data: chestData }]);
  const c = swapMaterials(chest, [{ from: 'kupfer_unaffected', to: 'kupfer_weathered' }]);
  assert.equal(c.payload.palette[0].id, 'minecraft:weathered_copper_chest');
  assert.deepEqual(c.payload.blockEntities[0].data, chestData);
  // The bulb keeps lit/powered, the golem statue its pose.
  const bulb = swapMaterials(one(mc('copper_bulb', { lit: 'true', powered: 'false' })), [{ from: 'kupfer_unaffected', to: 'kupfer_exposed_gewachst' }]);
  assert.deepEqual(bulb.payload.palette[0], mc('waxed_exposed_copper_bulb', { lit: 'true', powered: 'false' }));
});

test('MAT-04: materials and recipes for oxidized and waxed copper', () => {
  const m = computeMaterials(one(mc('waxed_weathered_copper_lantern', { hanging: 'false', waterlogged: 'false' })));
  assert.deepEqual(m.items.map(i => [i.itemId, i.confidence]), [['minecraft:waxed_weathered_copper_lantern', 'catalog']]);
  const r = resolveRecipes(m.items);
  assert.ok(r.complete, r.base.filter(b => b.kind === 'unknown').map(b => b.itemId).join());
  const ids = r.steps.map(s => s.itemId);
  for (const id of ['minecraft:copper_lantern', 'minecraft:exposed_copper_lantern', 'minecraft:weathered_copper_lantern', 'minecraft:waxed_weathered_copper_lantern']) assert.ok(ids.includes(id), id);
  assert.equal(chooseRecipe('minecraft:exposed_copper_lantern').station, 'tool');
  assert.equal(chooseRecipe('minecraft:waxed_oxidized_lightning_rod').profileFile, 'waxed_oxidized_lightning_rod_from_honeycomb');
});
