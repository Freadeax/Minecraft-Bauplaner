import test from 'node:test';
import assert from 'node:assert/strict';
import {
  JAVA_PROFILE, JAVA_PROFILE_ID, assertProfileConsistent, isProfileItem, profileItemIds, profileItemTag, fuelOf, smeltsPerFuel,
  checkProfileStates, checkPayloadProfile, dataVersionOfProfileId, vanillaBlockIds, vanillaBlockProperties, blockFacts, factBlockIds, itemOf,
  BLOCK_FACTS_REPORT_SHA256, BLOCK_FACTS_SERVER_SHA1,
} from '../dist/voxel/src/index.js';

const mc = (id, properties = {}) => ({ id: `minecraft:${id}`, properties });

test('profile: one documented origin for blocks, items, tags, recipes and fuels', () => {
  const p = assertProfileConsistent();
  assert.equal(p, JAVA_PROFILE);
  assert.equal(JAVA_PROFILE_ID, 'java-26.3');
  assert.equal(p.dataVersion, 5023);
  // Same server jar and the same block report as the block logic (BLOCK-01).
  assert.equal(p.serverJarSha1, BLOCK_FACTS_SERVER_SHA1);
  assert.equal(p.sources.blocksReport, BLOCK_FACTS_REPORT_SHA256);
  for (const [k, v] of Object.entries(p.sources)) assert.match(v, /^[0-9a-f]{64}$/, k);
  assert.equal(p.counts.blocks, 1286);
  assert.equal(p.counts.items, 1658);
  assert.equal(profileItemIds().length, p.counts.items);
});

test('profile: block registry is the server report – complete values, no entity ids', () => {
  assert.deepEqual([...vanillaBlockIds()], [...factBlockIds()].sort());
  // Values the old client-file registry did not know.
  assert.deepEqual([...vanillaBlockProperties('minecraft:oak_leaves').distance], ['1', '2', '3', '4', '5', '6', '7']);
  assert.deepEqual([...vanillaBlockProperties('minecraft:oak_sapling').stage], ['0', '1']);
  assert.deepEqual([...vanillaBlockProperties('minecraft:oak_wall_sign').waterlogged], ['true', 'false']);
  assert.ok(vanillaBlockProperties('minecraft:bamboo').leaves.includes('none'));
  assert.equal(vanillaBlockProperties('minecraft:item_frame'), undefined, 'item frames are entities');
  assert.equal(vanillaBlockProperties('create:shaft'), undefined);
});

test('profile: every block item is a profile item; mod ids are not', () => {
  for (const id of factBlockIds()) { const item = itemOf(id); if (item) assert.ok(isProfileItem(item), `${id} → ${item}`); }
  assert.ok(isProfileItem('minecraft:honeycomb') && isProfileItem('stick'));
  assert.ok(!isProfileItem('minecraft:redstone_wire'), 'a block without own item');
  assert.ok(!isProfileItem('create:stick'));
  assert.deepEqual([...profileItemTag('#minecraft:coals')], ['minecraft:charcoal', 'minecraft:coal']);
  assert.ok(profileItemTag('planks').includes('minecraft:oak_planks'));
});

test('profile: fuels from the cooking_fuel component – 8 smelts per coal in every furnace', () => {
  assert.equal(fuelOf('coal').burnTicks, 1600);
  assert.equal(smeltsPerFuel('coal'), 8);
  assert.equal(smeltsPerFuel('coal', 200, true), 8, 'blast furnace: half the burn time at double speed');
  assert.equal(smeltsPerFuel('minecraft:coal_block'), 80);
  assert.equal(smeltsPerFuel('lava_bucket'), 100);
  assert.equal(smeltsPerFuel('oak_planks'), 1.5);
  assert.equal(smeltsPerFuel('stone'), 0);
  assert.equal(fuelOf('minecraft:stone'), undefined);
});

test('profile check: DataVersion alone never claims compatibility', () => {
  const good = [mc('stone'), mc('oak_stairs', { facing: 'east', half: 'bottom', shape: 'straight', waterlogged: 'false' }), mc('air')];
  const ok = checkProfileStates(good, 5023);
  assert.equal(ok.status, 'passt');
  assert.equal(ok.checkedStates, 3);
  // Same DataVersion, but an id and a value the profile does not know.
  const bad = checkProfileStates([...good, mc('grass'), mc('oak_stairs', { facing: 'up' }), mc('stone', { lit: 'true' })], 5023);
  assert.equal(bad.status, 'abweichend');
  assert.deepEqual(bad.issues.map(i => i.reason), ['unknown-block', 'invalid-value', 'unknown-property']);
  assert.match(bad.summary, /DataVersion allein/);
  // Older file with valid states: usable, not converted, not "passt".
  const old = checkProfileStates(good, 3465);
  assert.equal(old.status, 'zustaende-passen');
  assert.match(old.summary, /nicht umgewandelt/);
  assert.equal(checkProfileStates(good, null).status, 'zustaende-passen');
  // Mod blocks stay visible and are not issues.
  const mod = checkProfileStates([mc('stone'), { id: 'create:shaft', properties: { axis: 'y' } }], 5023);
  assert.equal(mod.status, 'passt');
  assert.equal(mod.foreign.length, 1);
  // Incomplete states are filled by the game.
  assert.equal(checkProfileStates([mc('oak_stairs', { facing: 'east' })], 5023).incomplete, 1);
});

test('profile check of payloads reads the DataVersion from the profile id', () => {
  assert.equal(dataVersionOfProfileId('java:dataversion-3465:registry-unverified'), 3465);
  assert.equal(dataVersionOfProfileId('java-26.3'), 5023);
  assert.equal(dataVersionOfProfileId('java:registry-unverified'), null);
  const r = checkPayloadProfile({ profileId: 'java:dataversion-5023:registry-unverified', palette: [mc('stone')] });
  assert.equal(r.status, 'passt');
  assert.ok(blockFacts('minecraft:stone'));
});
