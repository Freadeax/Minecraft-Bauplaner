import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPayload, diffPayloads, diffAsPayload, stateRuleFor, transformPayload } from '../dist/voxel/src/index.js';
import { MATERIAL_SETS, materialOf, detectMaterials, swapMaterials, swapLabel, BUILDING_SPECS, computeMaterials } from '../dist/domain/src/index.js';

const P = 'mc-java-26.3';
const st = (id, properties = {}) => ({ id: `minecraft:${id}`, properties });
const payload = (palette, cells, size = [3, 3, 3], min = [0, 0, 0]) => createPayload({ schemaVersion: 1, profileId: P, bounds: { min, maxExclusive: min.map((m, i) => m + size[i]) },
  pivot: min, sourceOrigin: [0, 0, 0], palette, cells, blockEntities: [] });
const at = (x, y, z, i, kind = 'block') => ({ position: [x, y, z], kind, paletteIndex: i });

test('diff: hand-counted added, removed, material and state changes', () => {
  const stairsN = st('oak_stairs', { facing: 'north', half: 'bottom', shape: 'straight', waterlogged: 'false' });
  const stairsE = st('oak_stairs', { facing: 'east', half: 'bottom', shape: 'straight', waterlogged: 'false' });
  const a = payload([st('stone'), st('oak_planks'), stairsN, st('air')], [at(0, 0, 0, 0), at(1, 0, 0, 1), at(2, 0, 0, 2), at(0, 1, 0, 0), at(1, 1, 0, 3, 'air')]);
  // Same structure shifted by +10 in x: alignment at bounds minimum, so nothing counts as moved.
  const b = payload([st('stone'), st('spruce_planks'), stairsE], [at(10, 0, 0, 0), at(11, 0, 0, 1), at(12, 0, 0, 2), at(10, 2, 0, 0)], [3, 3, 3], [10, 0, 0]);
  const d = diffPayloads(a, b);
  assert.deepEqual(d.counts, { same: 1, added: 1, removed: 1, material: 1, state: 1 });
  assert.equal(d.blocksBefore, 4); assert.equal(d.blocksAfter, 4);
  assert.deepEqual(d.blocks.map(x => [x.id, x.before, x.after]), [['minecraft:oak_planks', 1, 0], ['minecraft:spruce_planks', 0, 1]]);
  assert.deepEqual(d.cells.map(c => `${c.position.join(',')}:${c.kind}`), ['0,0,0:same', '1,0,0:material', '2,0,0:state', '0,1,0:removed', '0,2,0:added']);
  const u = diffAsPayload(d, P);
  assert.equal(u.payload.cells.length, 5);
  assert.deepEqual(u.kinds, ['same', 'material', 'state', 'removed', 'added']);
  assert.equal(u.payload.palette[u.payload.cells[3].paletteIndex].id, 'minecraft:stone', 'removed cells keep the state of A');
});

test('diff: identical payloads and a rotated copy', () => {
  const a = payload([st('stone'), st('oak_log', { axis: 'x' })], [at(0, 0, 0, 0), at(1, 0, 0, 1), at(2, 0, 0, 1)], [3, 1, 1]);
  assert.deepEqual(diffPayloads(a, a).counts, { same: 3, added: 0, removed: 0, material: 0, state: 0 });
  const r = transformPayload(a, { position: [0, 0, 0], quarterTurns: 1, mirrorX: false }).payload;
  const d = diffPayloads(a, r);
  assert.equal(d.counts.same + d.counts.state + d.counts.material + d.counts.removed, 3);
  assert.equal(d.blocksAfter, 3);
  assert.ok(d.counts.added > 0, 'a quarter turn moves the row onto the z axis');
});

test('material sets: unique ids, kinds share property schemas', () => {
  const seen = new Map();
  for (const s of MATERIAL_SETS) for (const id of Object.values(s.forms)) {
    assert.ok(!seen.has(id), `${id} in ${s.id} und ${seen.get(id)}`); seen.set(id, s.id);
    assert.match(id, /^[a-z0-9_]+$/);
  }
  // Every form that has a state rule in one set has the same schema in every other set of that kind.
  for (const kind of ['holz', 'stein', 'farbe']) {
    const sets = MATERIAL_SETS.filter(s => s.kind === kind);
    const forms = new Set(sets.flatMap(s => Object.keys(s.forms)));
    for (const form of forms) {
      const schemas = sets.filter(s => s.forms[form]).map(s => [s.id, stateRuleFor(`minecraft:${s.forms[form]}`)?.schema]);
      const known = schemas.filter(([, x]) => x);
      for (const [id, schema] of known) assert.deepEqual(schema, known[0][1], `${kind}/${form}: ${id} weicht von ${known[0][0]} ab`);
    }
  }
  assert.equal(materialOf('minecraft:spruce_stairs').set.id, 'spruce');
  assert.equal(materialOf('minecraft:stone_brick_wall').form, 'wall');
  assert.equal(materialOf('minecraft:red_bed').set.id, 'farbe_red');
  assert.equal(materialOf('minecraft:dirt'), undefined);
});

test('swap: forms, properties, merged palette, unresolved forms kept', () => {
  const stairs = { facing: 'west', half: 'top', shape: 'inner_left', waterlogged: 'false' };
  const a = payload([st('oak_planks'), st('oak_stairs', stairs), st('cobblestone_wall', { east: 'low', north: 'none', south: 'none', up: 'true', waterlogged: 'false', west: 'low' }),
    st('spruce_planks'), st('cobblestone'), st('dirt'), st('air')],
  [at(0, 0, 0, 0), at(1, 0, 0, 1), at(2, 0, 0, 2), at(0, 1, 0, 3), at(1, 1, 0, 4), at(2, 1, 0, 5), at(0, 2, 0, 6, 'air'), { position: [1, 2, 0], kind: 'erase' }]);
  const r = swapMaterials(a, [{ from: 'oak', to: 'spruce' }, { from: 'cobblestone', to: 'polished_andesite' }]);
  const ids = r.payload.cells.map(c => c.kind === 'erase' ? 'erase' : r.payload.palette[c.paletteIndex].id.slice(10));
  assert.deepEqual(ids, ['spruce_planks', 'spruce_stairs', 'cobblestone_wall', 'spruce_planks', 'polished_andesite', 'dirt', 'air', 'erase']);
  assert.deepEqual(r.payload.palette[r.payload.cells[1].paletteIndex].properties, stairs);
  assert.equal(r.payload.cells[0].paletteIndex, r.payload.cells[3].paletteIndex, 'equal states merge');
  assert.equal(r.replaced, 3);
  assert.deepEqual(r.unresolved, [{ id: 'minecraft:cobblestone_wall', form: 'wall', target: 'Polierter Andesit', count: 1 }]);
  assert.equal(swapLabel([{ from: 'oak', to: 'spruce' }, { from: 'cobblestone', to: 'cobblestone' }]), 'Fichte');
  // Exchange without chains.
  const x = swapMaterials(a, [{ from: 'oak', to: 'spruce' }, { from: 'spruce', to: 'oak' }]);
  assert.equal(x.payload.palette[x.payload.cells[0].paletteIndex].id, 'minecraft:spruce_planks');
  assert.equal(x.payload.palette[x.payload.cells[3].paletteIndex].id, 'minecraft:oak_planks');
  assert.throws(() => swapMaterials(a, [{ from: 'oak', to: 'stone' }]), /lässt sich nicht/);
  assert.throws(() => swapMaterials(a, [{ from: 'oak', to: 'gold' }]), /Unbekannt/);
  assert.equal(diffPayloads(a, r.payload).counts.material, 3);
});

test('detect and swap every shipped building into every wood without breaking the material catalogue', () => {
  let checked = 0;
  for (const spec of BUILDING_SPECS) {
    const p = spec.payload();
    const woods = detectMaterials(p).filter(u => u.set.kind === 'holz');
    if (!woods.length) continue;
    for (const to of ['spruce', 'cherry', 'crimson']) {
      const r = swapMaterials(p, woods.map(u => ({ from: u.set.id, to })));
      assert.equal(r.payload.cells.length, p.cells.length);
      const open = rep => rep.unresolved.reduce((s, l) => s + l.count, 0);
      const before = computeMaterials(p), after = computeMaterials(r.payload);
      assert.ok(open(after) <= open(before), `${spec.id} → ${to}: ${after.unresolved.map(l => l.state.id).join(', ')} ungelöst`);
      checked++;
    }
  }
  assert.ok(checked > 100, `${checked} Varianten geprüft`);
});

import { MATERIAL_FAMILIES, variantSwaps } from '../dist/domain/src/build/sets/varianten.js';
import { buildCatalog, createBuildingLibrary, variantGroup, BASIS_PREFIX, plainTags, withFacets } from '../dist/domain/src/index.js';

test('shipped material families: every swap resolves, variants differ only in material', () => {
  const byId = new Map(BUILDING_SPECS.map(s => [s.id, s]));
  let variants = 0;
  for (const f of MATERIAL_FAMILIES) {
    const base = byId.get(f.base);
    assert.equal(base.family.id, f.id, `${f.base} trägt die Familie`);
    assert.equal(base.family.variant, f.original);
    for (const v of f.variants) {
      const id = `${f.base}_${v.suffix}`, spec = byId.get(id);
      assert.ok(spec, id); variants++;
      const r = swapMaterials(base.payload(), variantSwaps(id));
      assert.deepEqual(r.unresolved, [], `${id}: alle Formen vorhanden`);
      const d = diffPayloads(base.payload(), spec.payload());
      assert.equal(d.counts.added + d.counts.removed + d.counts.state, 0, `${id}: nur Material getauscht`);
      assert.ok(d.counts.material > 0, `${id}: wirklich anders`);
    }
  }
  assert.ok(variants >= 14, `${variants} Materialvarianten`);
  assert.ok(BUILDING_SPECS.length >= 174, `${BUILDING_SPECS.length} Gebäude`);
});

test('enchanting room: exactly 15 bookshelves at distance two, air at distance one', () => {
  const p = BUILDING_SPECS.find(s => s.id === 'bld_verzauberungsraum').payload();
  const at = new Map(p.cells.map(c => [c.position.join(','), c.kind === 'erase' ? 'erase' : p.palette[c.paletteIndex].id]));
  const table = p.cells.find(c => c.kind === 'block' && p.palette[c.paletteIndex].id === 'minecraft:enchanting_table').position;
  let shelves = 0;
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (const dy of [0, 1]) {
    const key = [table[0] + dx, table[1] + dy, table[2] + dz].join(',');
    const ring = Math.max(Math.abs(dx), Math.abs(dz));
    if (ring === 2 && at.get(key) === 'minecraft:bookshelf') shelves++;
    if (ring === 1) assert.equal(at.get(key), 'minecraft:air', `Luft bei ${key}`);
  }
  assert.equal(shelves, 15);
});

test('variant group: family members, derived variants and their basis', async () => {
  const lib = await createBuildingLibrary();
  const versions = new Map(lib.versions.map(v => [v.id, v]));
  const own = { ...lib.assets.find(a => a.id === 'bld_wachturm'), id: 'own_turm', demo: false, tags: ['turm', `${BASIS_PREFIX}bld_wachturm`] };
  const { entries } = buildCatalog([...lib.assets, own], versions);
  const e = id => entries.find(x => x.asset.id === id);
  assert.deepEqual(variantGroup(e('bld_wachturm'), entries).map(x => x.asset.id).sort(), ['bld_wachturm', 'own_turm']);
  assert.deepEqual(variantGroup(e('own_turm'), entries).map(x => x.asset.id).sort(), ['bld_wachturm', 'own_turm']);
  assert.equal(variantGroup(e('bld_rundturm'), entries).length, 4);
  assert.deepEqual(plainTags(own), ['turm'], 'basis tag is structural');
  assert.ok(withFacets(own.tags, { kategorie: ['befestigung'], stil: [], biom: [], funktion: [] }).includes(`${BASIS_PREFIX}bld_wachturm`));
});
