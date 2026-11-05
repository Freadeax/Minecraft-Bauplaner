// Blockdarstellung: ZIP reader, model baking, own shapes, block mesh. The web
// modules are plain TypeScript, loaded via Node's type stripping. Texture
// sources are synthetic (tests/helpers/minipack.mjs), never Mojang files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { vanillaBlockIds, vanillaBlockProperties, BLOCK_REGISTRY_VERSION, stateRuleFor } from '../../../dist/voxel/src/index.js';
import { readZip, zipEntries, ZipError } from '../../../apps/web/src/blockmodels/zip.ts';
import { Bakery, coversFace, selectVariants } from '../../../apps/web/src/blockmodels/model.ts';
import { extractArchive, packSource, referencedSprites } from '../../../apps/web/src/blockmodels/pack.ts';
import { fallbackRenderer, packRenderer } from '../../../apps/web/src/blockmodels/renderers.ts';
import { buildBlockMesh } from '../../../apps/web/src/blockmodels/mesh.ts';
import { tintColor } from '../../../apps/web/src/blockmodels/tint.ts';
import { blockLook } from '../../../apps/web/src/blockmodels/colors26.ts';
import { makeZip, miniPackFiles, miniPackZip } from '../../helpers/minipack.mjs';

const slot = () => ({ rect: [0, 0, 1, 1], layer: 0 });
const block = (x, y, z, paletteIndex = 0, kind = 'block') => kind === 'block' ? { position: [x, y, z], kind, paletteIndex } : { position: [x, y, z], kind };
const state = (id, properties = {}) => ({ id: `minecraft:${id}`, properties });
const cube = n => { const c = []; for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) c.push(block(x, y, z)); return c; };
const stone = [state('stone')];

async function miniPack() {
  const files = new Map();
  await extractArchive(miniPackZip(), files);
  return files;
}

test('zip: stored and deflated entries, filter, limits and broken archives', async () => {
  for (const deflate of [false, true]) {
    const zip = makeZip([['a.txt', 'hallo'], ['dir/b.json', '{"x":1}'], ['c.bin', new Uint8Array(3000).fill(7)]], { deflate });
    assert.deepEqual(zipEntries(zip).map(e => e.name), ['a.txt', 'dir/b.json', 'c.bin']);
    const got = await readZip(zip, n => n !== 'a.txt');
    assert.deepEqual([...got.keys()], ['dir/b.json', 'c.bin']);
    assert.equal(new TextDecoder().decode(got.get('dir/b.json')), '{"x":1}');
    assert.equal(got.get('c.bin').length, 3000);
  }
  const zip = makeZip([['big', new Uint8Array(5000)]]);
  await assert.rejects(readZip(zip, () => true, { maxArchiveBytes: 1e6, maxExtractedBytes: 1000, maxEntryBytes: 1e6, maxEntries: 10 }), ZipError);
  await assert.rejects(readZip(zip, () => true, { maxArchiveBytes: 1e6, maxExtractedBytes: 1e6, maxEntryBytes: 100, maxEntries: 10 }), ZipError);
  assert.throws(() => zipEntries(new Uint8Array(100)), /Keine ZIP/);
  assert.throws(() => zipEntries(zip, { maxArchiveBytes: 10, maxExtractedBytes: 1, maxEntryBytes: 1, maxEntries: 1 }), /größer/);
});

test('pack: only blockstates, block models and referenced textures are kept', async () => {
  const files = await miniPack();
  const names = [...files.keys()];
  assert.ok(names.includes('assets/minecraft/blockstates/stone.json'));
  assert.ok(names.includes('assets/minecraft/textures/block/oak_planks.png'));
  assert.ok(!names.some(n => n.includes('/models/item/')), 'item models skipped');
  assert.ok(!names.includes('assets/minecraft/textures/block/unused.png'), 'unreferenced textures skipped');
  assert.ok(referencedSprites(files).has('minecraft:block/stone'));
  assert.equal(names.length, miniPackFiles().length - 2);
});

test('model: variants, parents, texture variables, multipart OR and uvlock', async () => {
  const bakery = new Bakery(packSource(await miniPack()));
  const s = bakery.bake('minecraft:stone', {});
  assert.equal(s.kind, 'pack'); assert.equal(s.quads.length, 6);
  assert.ok(s.quads.every(q => q.sprite === 'minecraft:block/stone' && q.cull && coversFace(q, q.cull)));
  assert.equal(s.particle, 'minecraft:block/stone');

  const bottom = bakery.bake('minecraft:oak_slab', { type: 'bottom', waterlogged: 'false' });
  const ys = q => q.pos.filter((_, i) => i % 3 === 1);
  assert.ok(bottom.quads.every(q => Math.max(...ys(q)) <= 0.5), 'bottom slab lies in the lower half');
  assert.ok(!bottom.quads.find(q => q.cull === 'up'), 'top face of a bottom slab is never culled');
  const top = bakery.bake('minecraft:oak_slab', { type: 'top', waterlogged: 'false' });
  assert.ok(top.quads.every(q => Math.min(...ys(q)) >= 0.5), 'child elements replace the parent ones');
  assert.equal(bakery.bake('minecraft:oak_slab', { type: 'double', waterlogged: 'false' }).quads.length, 6);

  const post = bakery.bake('minecraft:oak_fence', { north: 'false', east: 'false', south: 'false', west: 'false' });
  const north = bakery.bake('minecraft:oak_fence', { north: 'true', east: 'false', south: 'false', west: 'false' });
  const west = bakery.bake('minecraft:oak_fence', { north: 'false', east: 'false', south: 'false', west: 'true' });
  assert.equal(post.quads.length, 6); assert.equal(north.quads.length, 11); assert.equal(west.quads.length, 11, 'OR condition');
  const turned = west.quads.find(q => q.cull === 'east');
  assert.ok(turned, 'side rotated by y=90 culls towards east');
  assert.ok(turned.pos.filter((_, i) => i % 3 === 0).every(x => Math.abs(x - 1) < 1e-6));

  assert.equal(bakery.bake('minecraft:not_in_pack', {}).kind, 'missing');
  assert.deepEqual(selectVariants({ variants: { 'type=top': { model: 'x' } } }, { type: 'bottom' }).matched, false);
});

test('model: face textures without # read as variables (heavy_core)', () => {
  const files = new Map(Object.entries({
    'assets/minecraft/blockstates/heavy_core.json': '{"variants":{"":{"model":"block/heavy_core"}}}',
    'assets/minecraft/models/block/heavy_core.json': '{"textures":{"all":"block/heavy_core"},"elements":[{"from":[4,0,4],"to":[12,8,12],"faces":{"up":{"texture":"all"}}}]}',
  }).map(([k, v]) => [k, new TextEncoder().encode(v)]));
  const b = new Bakery(packSource(files)).bake('minecraft:heavy_core', {});
  assert.equal(b.quads[0].sprite, 'minecraft:block/heavy_core');
});

test('own shapes: every 26.3 block yields geometry, shapes follow block states', () => {
  assert.equal(BLOCK_REGISTRY_VERSION, 'java-26.3');
  assert.ok(vanillaBlockIds().length > 1250, 'complete 26.3 block list');
  const r = fallbackRenderer(), empty = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air', 'minecraft:light', 'minecraft:barrier', 'minecraft:structure_void', 'minecraft:moving_piston']);
  const missing = [];
  for (const id of vanillaBlockIds()) {
    const props = Object.fromEntries(Object.entries(vanillaBlockProperties(id) ?? {}).map(([k, v]) => [k, v[0]]));
    const b = r.block({ id, properties: props });
    if (!b.quads.length && !empty.has(id)) missing.push(id);
    // Standing banners reach into the cell above, wall banners hang into the one below.
    for (const q of b.quads) assert.ok(q.pos.every((v, i) => v >= (i % 3 === 1 ? -1.01 : -0.51) && v <= (i % 3 === 1 ? 2.01 : 1.51)), `${id} stays near its cell`);
  }
  assert.deepEqual(missing, []);
  const height = s => Math.max(...r.block(s).quads.flatMap(q => q.pos.filter((_, i) => i % 3 === 1)));
  assert.equal(height(state('oak_slab', { type: 'bottom', waterlogged: 'false' })), 0.5);
  assert.equal(height(state('stone')), 1);
  const stairs = d => r.block(state('oak_stairs', { facing: d, half: 'bottom', shape: 'straight', waterlogged: 'false' })).quads;
  assert.notDeepEqual(stairs('north').map(q => q.pos), stairs('south').map(q => q.pos), 'stairs turn with facing');
  assert.ok(r.block(state('poppy')).quads.every(q => !q.cull), 'plants never cull');
  assert.equal(r.block({ id: 'mymod:thing', properties: {} }).quads.length, 6, 'mod blocks stay cubes');
});

test('tint: grass, foliage, water and redstone power', () => {
  assert.match(tintColor('minecraft:grass_block', {}, 0), /^#[0-9a-f]{6}$/);
  assert.match(tintColor('minecraft:oak_leaves', {}, 0), /^#[0-9a-f]{6}$/);
  assert.notEqual(tintColor('minecraft:redstone_wire', { power: '0' }, 0), tintColor('minecraft:redstone_wire', { power: '15' }, 0));
  assert.equal(tintColor('minecraft:stone', {}, 0), null);
});

test('mesh: only faces towards open cells are emitted', () => {
  const r = fallbackRenderer(), m = cells => buildBlockMesh(cells, stone, r, slot, [0, 0, 0]);
  assert.equal(m([block(0, 0, 0)]).quads, 6);
  assert.equal(m([block(0, 0, 0), block(1, 0, 0)]).quads, 10, 'shared face removed on both sides');
  assert.equal(m([block(0, 0, 0), block(0, 0, 1, 0, 'air'), block(0, 1, 0, 0, 'erase')]).quads, 6, 'air and erase never hide a face');
  assert.equal(m([block(0, 0, 0), block(2, 0, 0)]).quads, 12, 'gap keeps both inner faces');
  assert.equal(m([]).quads, 0);
  // A bottom slab does not hide the block below its open top, but hides the block face beneath it.
  const slab = [state('stone'), state('oak_slab', { type: 'bottom', waterlogged: 'false' })];
  const above = buildBlockMesh([block(0, 0, 0), block(0, 1, 0, 1)], slab, r, slot, [0, 0, 0]);
  assert.equal(above.quads, 5 + 5, 'slab bottom covers the stone top');
  const below = buildBlockMesh([block(0, 1, 0), block(0, 0, 0, 1)], slab, r, slot, [0, 0, 0]);
  assert.equal(below.quads, 6 + 6, 'open slab top keeps the stone bottom');
  const glass = [state('glass')];
  assert.equal(buildBlockMesh([block(0, 0, 0), block(1, 0, 0)], glass, r, slot, [0, 0, 0]).quads, 10, 'equal glass blocks hide shared faces');
});

test('mesh: n³ cube keeps only its hull (27³ = 19 683 blocks), cells and marks map back', () => {
  const cells = cube(27), t0 = performance.now(), m = buildBlockMesh(cells, stone, fallbackRenderer(), slot, [13, 13, 13]), ms = performance.now() - t0;
  assert.equal(m.blocks, 19683); assert.equal(m.quads, 6 * 27 * 27); assert.equal(m.naiveQuads, 6 * 19683);
  assert.equal(m.solid.indices.length, m.solid.quads * 6); assert.equal(m.solid.positions.length, m.solid.quads * 12);
  console.log(`# 27³: ${m.quads} Flächen statt ${m.naiveQuads}, ${ms.toFixed(1)} ms`);
  assert.ok(ms < 3000, `mesh build took ${ms} ms`);
  const two = [block(5, 7, -3), block(-200, 64, 9000)];
  const marked = buildBlockMesh(two, stone, fallbackRenderer(), slot, [5, 7, -3], c => c.position[0] > 0 ? { color: '#ff0000', amount: 0.5 } : null);
  for (let q = 0; q < marked.solid.quads; q++) {
    const cell = two[marked.solid.quadCells[q]];
    for (let k = 0; k < 4; k++) for (let i = 0; i < 3; i++) {
      const rel = marked.solid.positions[(q * 4 + k) * 3 + i] + [5, 7, -3][i] - cell.position[i];
      assert.ok(rel > -1e-6 && rel < 1 + 1e-6, `vertex outside cell ${cell.position}`);
    }
    assert.deepEqual([...marked.solid.marks.slice(q * 16, q * 16 + 4)], cell.position[0] > 0 ? [1, 0, 0, 0.5] : [0, 0, 0, 0]);
  }
});

test('pack renderer: textured quads, liquids and entity blocks, mesh layers', async () => {
  const r = packRenderer(packSource(await miniPack()), 'test');
  assert.equal(r.textured, true);
  assert.equal(r.block(state('stone')).quads[0].sprite, 'minecraft:block/stone');
  assert.ok(r.block(state('water', { level: '0' })).quads.length > 0);
  assert.ok(r.block(state('chest', { facing: 'north', type: 'single', waterlogged: 'false' })).quads.length > 0, 'entity blocks fall back to own shapes');
  const lookup = s => ({ rect: [0, 0, 1, 1], layer: s.includes('water') ? 2 : 0 });
  const mesh = buildBlockMesh([block(0, 0, 0), block(2, 0, 0, 1)], [state('stone'), state('water', { level: '0' })], r, lookup, [0, 0, 0]);
  assert.equal(mesh.solid.quads, 6); assert.ok(mesh.translucent.quads > 0, 'water goes to the translucent layer');
});

test('every orienting 26.3 block has a state rule', () => {
  const orienting = /^(facing|axis|rotation|half|hinge|shape|north|east|south|west|attachment|face|orientation|type|connection|side_chain|hanging)$/;
  const without = vanillaBlockIds().filter(id => Object.keys(vanillaBlockProperties(id) ?? {}).some(k => orienting.test(k)) && !stateRuleFor(id));
  assert.deepEqual(without, []);
});

// The 26.3 "all blocks" litematic is a third-party file and not part of the
// repository; the import is checked when a local copy is provided.
const ALL_BLOCKS = process.env.BAUPLANER_ALL_BLOCKS;
test('litematic with every 26.3 block imports and meshes (optional local file)', { skip: !ALL_BLOCKS || !existsSync(ALL_BLOCKS) }, async () => {
  const { importLitematic } = await import('../../../dist/formats/src/index.js');
  const { payload } = await importLitematic(new Uint8Array(readFileSync(ALL_BLOCKS)));
  const ids = new Set(payload.palette.map(s => s.id));
  const known = vanillaBlockIds().filter(id => ids.has(id)).length;
  console.log(`# Litematic: ${payload.cells.length} Zellen, ${ids.size} Block-IDs, ${known} davon im 26.3-Register`);
  assert.ok(ids.size > 1000);
  const mesh = buildBlockMesh(payload.cells, payload.palette, fallbackRenderer(), slot, [0, 0, 0]);
  assert.ok(mesh.quads > 0);
});

test('renamed ids from older Litematic files keep their look (chain → iron_chain, grass → short_grass)', () => {
  assert.equal(blockLook('iron_chain'), blockLook('chain'));
  assert.equal(blockLook('short_grass'), blockLook('grass'));
  assert.ok(blockLook('chain')); assert.equal(blockLook('no_such_block'), undefined);
});
