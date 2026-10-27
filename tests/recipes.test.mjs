import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveRecipes, recipesForMaterials, chooseRecipe, recipesFor, rawSource, assertRecipeCatalog, recipesToCsv, RECIPES, RECIPE_TAGS,
  computeMaterials, materialsForResolution, createProject, execute, newInstance, resolveProject, createSampleLibrary, createBuildingLibrary, EMPTY_HISTORY,
} from '../dist/domain/src/index.js';

const mc = id => `minecraft:${id}`;
const req = entries => Object.entries(entries).map(([id, count]) => ({ itemId: mc(id), count }));
const baseOf = r => Object.fromEntries(r.base.map(b => [b.itemId.replace('minecraft:', ''), b.count]));
const step = (r, id) => r.steps.find(s => s.itemId === mc(id));

/** Every item demanded (directly or by a step) must equal what a step needs or the base line holds. */
function assertBalanced(r, roots) {
  const demand = new Map(roots.map(l => [l.itemId, l.count]));
  for (const s of r.steps) for (const i of s.inputs) demand.set(i.item, (demand.get(i.item) ?? 0) + i.count);
  const covered = new Map([...r.base.map(b => [b.itemId, b.count]), ...r.steps.map(s => [s.itemId, s.needed])]);
  assert.deepEqual([...demand.entries()].sort(), [...covered.entries()].sort());
  for (const s of r.steps) {
    assert.equal(s.produced, s.operations * s.recipe.count);
    assert.ok(s.produced >= s.needed && s.produced - s.needed < s.recipe.count, `${s.itemId}: minimal rounding`);
    assert.equal(s.surplus, s.produced - s.needed);
  }
  // build order: every ingredient produced by a step appears before its consumer
  const pos = new Map(r.steps.map((s, i) => [s.itemId, i]));
  for (const [i, s] of r.steps.entries()) for (const input of s.inputs) if (pos.has(input.item)) assert.ok(pos.get(input.item) < i, `${input.item} before ${s.itemId}`);
}

test('catalogue: valid, acyclic for both methods, tags resolvable', () => {
  const { recipes, outputs } = assertRecipeCatalog();
  assert.equal(recipes, RECIPES.length);
  assert.ok(outputs > 600, `${outputs} outputs`);
  for (const [tag, def] of Object.entries(RECIPE_TAGS)) {
    assert.ok(def.members.includes(def.fallback), `${tag} fallback is a member`);
    for (const m of def.members) assert.ok(recipesFor(m).length || rawSource(m), `${tag}: ${m} obtainable`);
  }
  // no recipe input is a dead end
  for (const r of RECIPES) for (const i of r.inputs) if (!i.item.startsWith('#')) assert.ok(recipesFor(i.item).length || rawSource(i.item), `${r.id}: ${i.item}`);
});

test('hand-counted tree: stairs, torches, wall, beds and lanterns', () => {
  const roots = req({ spruce_stairs: 100, torch: 20, stone_brick_wall: 30, red_bed: 2, lantern: 3 });
  const r = resolveRecipes(roots);
  // planks: 25 crafts × 6 (stairs) + 2 crafts × 2 (8 sticks for 23 torches = 6 crafts) + 2 beds × 3 = 150 + 4 + 6 = 160 → 40 logs
  assert.deepEqual(baseOf(r), { spruce_log: 40, cobblestone: 30, coal: 6, poppy: 6, white_wool: 6, raw_iron: 3 });
  assert.deepEqual([step(r, 'spruce_planks').operations, step(r, 'torch').needed, step(r, 'torch').operations, step(r, 'stick').produced], [40, 23, 6, 8]);
  assert.equal(step(r, 'stone_brick_wall').recipe.station, 'stonecutter');
  assert.equal(step(r, 'stone').recipe.station, 'smelting');
  assert.deepEqual(r.surplus.map(s => [s.item.replace('minecraft:', ''), s.count]), [['iron_nugget', 3], ['stick', 2], ['torch', 1]]);
  assert.deepEqual(r.fuel, { smelts: 33, coal: 5 });
  assert.deepEqual(r.tagChoices.map(t => [t.tag, t.chosen, t.reason, t.count]),
    [['#coals', mc('coal'), 'fallback', 6], ['#planks', mc('spruce_planks'), 'tree', 10]]);
  assert.ok(step(r, 'torch').buildItem && !step(r, 'stick').buildItem);
  assert.equal(r.base.find(b => b.itemId === mc('spruce_log')).direct, 0);
  assert.ok(r.complete);
  assertBalanced(r, roots);
});

test('rounding is shared across the tree, not per build item', () => {
  // 6 + 1 + 2 = 9 planks → 3 logs (per item it would be 2 + 1 + 1 = 4)
  const r = resolveRecipes(req({ oak_stairs: 4, oak_button: 1, oak_pressure_plate: 1 }));
  assert.equal(baseOf(r).oak_log, 3);
  assert.deepEqual(r.surplus, [{ item: mc('oak_planks'), count: 3 }]);
});

test('stonecutter vs. crafting method', () => {
  const roots = req({ stone_brick_stairs: 4 });
  const cutter = resolveRecipes(roots), crafting = resolveRecipes(roots, { method: 'crafting' });
  assert.equal(cutter.method, 'stonecutter');
  assert.deepEqual(baseOf(cutter), { cobblestone: 4 });
  // crafting: 6 stone bricks → 2 crafts × 4 = 8 bricks from 8 stone; 2 bricks left
  assert.deepEqual(baseOf(crafting), { cobblestone: 8 });
  assert.deepEqual(crafting.surplus, [{ item: mc('stone_bricks'), count: 2 }]);
  assert.equal(chooseRecipe(mc('oak_stairs'), 'stonecutter').station, 'crafting', 'wood has no stonecutter recipe');
  assertBalanced(crafting, roots);
});

test('tags: variant from the tree, else documented default', () => {
  const alone = resolveRecipes(req({ chest: 2 }));
  assert.deepEqual(baseOf(alone), { oak_log: 4 });
  assert.equal(alone.tagChoices[0].reason, 'fallback');
  assert.ok(alone.notes.some(n => n.includes('oak_planks als Standard angenommen')));
  const birch = resolveRecipes(req({ chest: 2, birch_slab: 6 }));
  assert.deepEqual(baseOf(birch), { birch_log: 5 }, '16 + 3 = 19 planks → 5 logs');
  assert.deepEqual([birch.tagChoices[0].chosen, birch.tagChoices[0].reason], [mc('birch_planks'), 'tree']);
  // a slab tag picks the slab already demanded
  const barrel = resolveRecipes(req({ barrel: 1, spruce_slab: 6 }));
  assert.equal(barrel.tagChoices.find(t => t.tag === '#wooden_slabs').chosen, mc('spruce_slab'));
});

test('raw status, stock and unknown items', () => {
  const wool = resolveRecipes(req({ red_wool: 2, white_wool: 1 }));
  assert.deepEqual(baseOf(wool), { white_wool: 3, poppy: 2 });
  assert.equal(wool.base.find(b => b.itemId === mc('white_wool')).direct, 1);
  assert.equal(rawSource(mc('white_wool')), 'Mit Schere sammeln');
  assert.equal(rawSource(mc('oak_leaves')), 'Mit Schere sammeln');
  assert.equal(rawSource('othermod:thing'), undefined);

  const stocked = resolveRecipes(req({ stone_bricks: 8 }), { stock: ['stone'] });
  assert.deepEqual(stocked.base.map(b => [b.itemId, b.count, b.kind]), [[mc('stone'), 8, 'stock']]);
  assert.equal(stocked.totals.stock, 8);
  assert.equal(resolveRecipes(req({ stone_bricks: 8 }), { stock: [mc('stone_bricks')] }).steps.length, 0);

  const unknown = resolveRecipes([{ itemId: mc('chipped_anvil'), count: 1 }, { itemId: 'othermod:gear', count: 2 }, { itemId: mc('glass'), count: 9 }]);
  assert.deepEqual(unknown.base.map(b => [b.itemId, b.kind]), [[mc('sand'), 'raw'], ['othermod:gear', 'unknown'], [mc('chipped_anvil'), 'unknown']]);
  assert.equal(unknown.totals.unknown, 3);
  assert.equal(unknown.complete, false);
  assert.deepEqual(unknown.fuel, { smelts: 9, coal: 2 });
});

test('colours, concrete and water steps', () => {
  const r = resolveRecipes(req({ lime_concrete: 64, magenta_stained_glass: 8 }));
  // 64 powder = 8 crafts → 32 sand, 32 gravel, 8 lime dye = 4 crafts → 4 green (cactus) + 4 white (bone meal ← 2 bones)
  // magenta dye 1 ← purple + pink (1 craft) ← blue+red, red+white; 8 glass ← 8 sand
  assert.deepEqual(baseOf(r), { sand: 40, gravel: 32, cactus: 4, bone: 2, lapis_lazuli: 1, poppy: 2 });
  assert.equal(r.stations.water, 64);
  assert.equal(step(r, 'white_dye').needed, 5);
  assert.ok(r.notes.some(n => n.includes('64 Vorgänge mit Wasser')));
  assertBalanced(r, req({ lime_concrete: 64, magenta_stained_glass: 8 }));
});

test('copper: oxidation stages and wax', () => {
  const r = resolveRecipes(req({ waxed_exposed_cut_copper_stairs: 4 }));
  // stonecutter: 4 stairs ← 4 cut copper ← 1 copper block (1 → 4) ← 9 ingots ← 9 raw copper; 4 oxidation steps, 4 honeycomb
  assert.deepEqual(baseOf(r), { raw_copper: 9, honeycomb: 4 });
  assert.equal(r.stations.tool, 4);
  assert.ok(step(r, 'exposed_cut_copper_stairs').recipe.note.includes('oxidieren'));
});

test('sample project and all shipped buildings resolve completely', async () => {
  const lib = await createSampleLibrary();
  let project = createProject({ name: 'Rezepte' }), history = EMPTY_HISTORY;
  for (const [i, v] of lib.versions.entries()) {
    const instance = newInstance({ assetVersionId: v.id, name: v.assetId, transform: { position: [i * 30, 0, 0], quarterTurns: 0, mirrorX: false } });
    ({ project, history } = execute(project, history, { kind: 'instance.add', instance }));
  }
  const versions = new Map(lib.versions.map(v => [v.id, v]));
  const materials = materialsForResolution(resolveProject(project, versions));
  assert.ok(materials.complete && materials.items.length >= 4);
  const r = recipesForMaterials(materials);
  assert.ok(r.complete);
  assert.ok(r.base.every(b => b.kind === 'raw' && b.source));
  assertBalanced(r, materials.items);

  const buildings = await createBuildingLibrary();
  for (const v of buildings.versions) {
    const m = computeMaterials(v.payload), rr = recipesForMaterials(m);
    assert.deepEqual(rr.base.filter(b => b.kind === 'unknown').map(b => b.itemId), [], v.assetId);
    assertBalanced(rr, m.items);
    assert.deepEqual(rr, recipesForMaterials(m), 'deterministic');
  }
});

test('CSV lists raw materials, steps and fuel', () => {
  const csv = recipesToCsv(resolveRecipes(req({ torch: 4 })));
  const lines = csv.trim().split('\n');
  assert.equal(lines[0], 'Typ;ID;Menge;Vorgänge;Station;Zutaten;Hinweis');
  assert.ok(lines.includes('Rohstoff;oak_log;1;;;;Holzfällen'));
  assert.ok(lines.includes('Schritt;stick;4;1;crafting;2 oak_planks;Rest 3'));
  assert.ok(lines.includes('Schritt;oak_planks;4;1;crafting;1 oak_log;Rest 2 | auch aus Holz/entrindeten Varianten'));
  assert.equal(lines.at(-1), 'Brennstoff;coal;0;0;smelting;;nicht in den Rohstoffen enthalten');
});
