import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRecipes, emptySite, checkSite, setRecipePrefs, recipeOptionsOf } from '../../../dist/domain/src/index.js';

const base = (r, id) => r.base.find(b => b.itemId === `minecraft:${id}`)?.count ?? 0;

test('MAT-02-S03: a chosen sort replaces the automatic tag member', () => {
  const items = [{ itemId: 'minecraft:chest', count: 8 }];
  const auto = resolveRecipes(items);
  const t = auto.tagChoices.find(c => c.tag === '#planks');
  assert.equal(t.reason, 'fallback'); assert.equal(t.chosen, 'minecraft:oak_planks');
  assert.ok(t.members.includes('minecraft:spruce_planks'));
  const spruce = resolveRecipes(items, { prefs: { tags: { '#planks': 'spruce_planks' } } });
  const c = spruce.tagChoices.find(x => x.tag === '#planks');
  assert.deepEqual([c.reason, c.chosen], ['chosen', 'minecraft:spruce_planks']);
  assert.equal(base(spruce, 'spruce_log'), 16, '8 chests × 8 planks = 64 planks = 16 logs');
  assert.equal(base(spruce, 'oak_log'), 0);
  assert.ok(spruce.notes.some(n => /spruce_planks von dir gewählt/.test(n)));
  // A member outside the tag is ignored.
  assert.equal(resolveRecipes(items, { prefs: { tags: { '#planks': 'stone' } } }).tagChoices.find(x => x.tag === '#planks').reason, 'fallback');
});

test('MAT-02-S03: chosen fuel and fuel gathered with the raw materials (fixed point for charcoal)', () => {
  const items = [{ itemId: 'minecraft:stone_bricks', count: 640 }];
  const kelp = resolveRecipes(items, { prefs: { fuel: 'dried_kelp_block' } });
  assert.equal(kelp.fuel.chosen.itemId, 'minecraft:dried_kelp_block');
  assert.equal(kelp.fuel.inBase, false);
  const coal = resolveRecipes(items, { prefs: { fuel: 'coal', fuelInBase: true } });
  assert.equal(coal.fuel.inBase, true);
  assert.equal(base(coal, 'coal'), 80, '640 smelts / 8 per coal');
  const charcoal = resolveRecipes(items, { prefs: { fuel: 'charcoal', fuelInBase: true } });
  // Charcoal is smelted itself: n charcoal must cover 640 + n smelts → n = ceil((640 + n) / 8) → 92.
  assert.equal(charcoal.fuel.smelts, 640 + 92);
  assert.equal(charcoal.fuel.chosen.count, 92);
  assert.ok(charcoal.steps.some(s => s.itemId === 'minecraft:charcoal' && s.produced >= 92));
  // A fuel without a source (lava bucket) is shown but not added.
  const lava = resolveRecipes(items, { prefs: { fuel: 'lava_bucket', fuelInBase: true } });
  assert.equal(lava.fuel.inBase, false); assert.equal(lava.complete, true);
});

test('MAT-02-S03: choices live in the site plan and are validated', () => {
  let site = setRecipePrefs(emptySite(), { tag: '#planks', item: 'birch_planks' });
  site = setRecipePrefs(site, { fuel: 'charcoal', fuelInBase: true });
  assert.deepEqual(site.recipePrefs, { tags: { '#planks': 'minecraft:birch_planks' }, fuel: 'minecraft:charcoal', fuelInBase: true });
  assert.doesNotThrow(() => checkSite(structuredClone(site)));
  assert.deepEqual(recipeOptionsOf(site).prefs, site.recipePrefs);
  assert.throws(() => checkSite({ ...site, recipePrefs: { tags: { '#planks': 'minecraft:stone' } } }), /gehört nicht zu/);
  assert.throws(() => checkSite({ ...site, recipePrefs: { fuel: 'minecraft:stone' } }), /kein Brennstoff/);
  const back = setRecipePrefs(setRecipePrefs(site, { tag: '#planks', item: null }), { fuel: null, fuelInBase: false });
  assert.equal(back.recipePrefs, undefined, 'all automatic again = field removed');
});
