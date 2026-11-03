import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, RECIPE_TAGS, RECIPE_CATALOG_VERSION, resolveRecipes, recipesFor, rawSource, chooseRecipe, recipeAlternatives, fuelBalance, profileRecipes, profileRecipesFor,
  matchProfileRecipe, unknownRecipeItems, computeMaterials } from '../dist/domain/src/index.js';
import { createPayload, factBlockIds, itemOf, profileItemTag } from '../dist/voxel/src/index.js';

const tags = t => RECIPE_TAGS[t]?.members;

test('MAT-02: every crafting, stonecutter and smelting recipe of the catalogue is a recipe of the profile', () => {
  assert.match(RECIPE_CATALOG_VERSION, /java-26\.3$/);
  assert.equal(profileRecipes().length, 1696);
  const stationRecipes = RECIPES.filter(r => ['crafting', 'stonecutter', 'smelting'].includes(r.station));
  const unmatched = stationRecipes.filter(r => !matchProfileRecipe(r, tags)).map(r => r.id);
  assert.deepEqual(unmatched, []);
  for (const r of stationRecipes) assert.ok(r.profileFile, r.id);
  // Every item id the catalogue names exists in the profile (26.3 renamed chain → iron_chain).
  assert.deepEqual([...new Set(RECIPES.flatMap(unknownRecipeItems))], []);
  // Tool and water steps are game mechanics without recipe file; their items are profile items too.
  assert.ok(RECIPES.some(r => r.station === 'tool') && RECIPES.filter(r => r.station === 'tool' || r.station === 'water').every(r => !r.profileFile));
});

test('MAT-02: fixes found by the profile check', () => {
  assert.equal(chooseRecipe('minecraft:quartz_bricks', 'crafting').count, 4);
  assert.deepEqual(chooseRecipe('minecraft:oak_hanging_sign').inputs.map(i => i.item).sort(), ['minecraft:iron_chain', 'minecraft:stripped_oak_log']);
  assert.equal(recipesFor('minecraft:chain').length, 0);
  // Nether stems burn neither as fuel nor into charcoal.
  const charcoal = chooseRecipe('minecraft:charcoal');
  assert.ok(!RECIPE_TAGS[charcoal.inputs[0].item].members.includes('minecraft:crimson_stem'));
  assert.deepEqual([...RECIPE_TAGS[charcoal.inputs[0].item].members].sort(), [...profileItemTag('logs_that_burn')].filter(i => i.endsWith('_log') && !i.includes('stripped')).sort());
});

test('MAT-02: every block item reaches a recipe, a raw source or is named as a game-only block', () => {
  const items = [...new Set(factBlockIds().map(itemOf).filter(Boolean))];
  const open = items.filter(i => !recipesFor(i).length && rawSource(i) === undefined);
  // What remains has no survival recipe in 26.3 (creative/technical blocks, infested stone, anvil damage, ores of the world …).
  for (const id of open) assert.equal(profileRecipesFor(id).length, 0, `${id} hat ein Profilrezept`);
  assert.ok(items.length - open.length > 1100, `${items.length - open.length} aufgelöst`);
  // Profile recipes fill catalogue gaps: poplar is a catalogue wood now, concrete slabs come from the profile.
  assert.equal(chooseRecipe('minecraft:poplar_planks').source, 'catalog');
  const slab = chooseRecipe('minecraft:white_concrete_slab', 'stonecutter');
  assert.equal(slab.source, 'profile');
  assert.equal(slab.station, 'stonecutter');
  assert.deepEqual(slab.inputs, [{ item: 'minecraft:white_concrete', count: 1 }]);
});

test('MAT-02: alternatives, multiblock objects and remainder balance', () => {
  // Doors: 2 cells → 1 item; 3 doors per craft.
  const door = createPayload({ schemaVersion: 1, profileId: 'test', bounds: { min: [0, 0, 0], maxExclusive: [1, 2, 1] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0],
    palette: [{ id: 'minecraft:oak_door', properties: { facing: 'north', half: 'lower', hinge: 'left', open: 'false', powered: 'false' } },
      { id: 'minecraft:oak_door', properties: { facing: 'north', half: 'upper', hinge: 'left', open: 'false', powered: 'false' } }],
    cells: [{ position: [0, 0, 0], kind: 'block', paletteIndex: 0 }, { position: [0, 1, 0], kind: 'block', paletteIndex: 1 }], blockEntities: [] });
  const report = computeMaterials(door);
  assert.deepEqual(report.items.map(i => [i.itemId, i.count]), [['minecraft:oak_door', 1]]);
  const r = resolveRecipes(report.items);
  const step = r.steps.find(s => s.itemId === 'minecraft:oak_door');
  assert.deepEqual([step.operations, step.produced, step.surplus], [1, 3, 2]);
  assert.deepEqual(r.surplus.find(s => s.item === 'minecraft:oak_door'), { item: 'minecraft:oak_door', count: 2 });
  // Alternatives: stone bricks can be cut; torches accept charcoal (one recipe, both listed in its ingredient).
  const bricks = resolveRecipes([{ itemId: 'minecraft:stone_bricks', count: 4 }], { method: 'crafting' });
  assert.ok(bricks.steps.find(s => s.itemId === 'minecraft:stone_bricks').alternatives.some(a => a.station === 'stonecutter'));
  assert.ok(recipeAlternatives('minecraft:white_wool').length > 0, 'dyeing other wool is an alternative');
});

test('MAT-02: fuel balance from profile burn times', () => {
  const f = fuelBalance(200 * 100, 100);
  assert.equal(f.coal, 13);
  const by = Object.fromEntries(f.options.map(o => [o.itemId.slice(10), o]));
  assert.equal(by.coal_block.count, 2);
  assert.equal(by.lava_bucket.count, 1);
  assert.equal(by.blaze_rod.smeltsEach, 12);
  assert.equal(by.dried_kelp_block.smeltsEach, 20.005, 'the game burns dried kelp blocks for 4001 ticks');
  const glass = resolveRecipes([{ itemId: 'minecraft:glass', count: 64 }]);
  assert.deepEqual([glass.fuel.smelts, glass.fuel.ticks, glass.fuel.coal], [64, 12800, 8]);
  assert.match(glass.notes.join(' '), /8 Vorgänge je Kohle laut Profil/);
  assert.deepEqual(fuelBalance(0, 0).options, []);
});
