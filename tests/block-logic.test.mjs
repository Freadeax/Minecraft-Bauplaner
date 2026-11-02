import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createPayload, factBlockIds, blockFacts, stateFacts, completeState, inTag, hasClass, itemOf, stackOfItem, settleState, survives, supportNeed, falls, step, connectFamily,
  BLOCK_FACTS_DATA_VERSION, BLOCK_FACTS_PROFILE, vanillaBlockIds,
} from '../dist/voxel/src/index.js';
import { defaultProperties as reportDefaults, DEFAULT_STATES_REPORT_SHA256 } from '../dist/formats/src/defaultStates.js';
import { BLOCK_FACTS_REPORT_SHA256 } from '../dist/voxel/src/blockFacts.js';
import {
  checkPlacement, settlePayload, changedKeys, itemsForCell, stackSizeOf, buildGuide, assertGuideAcyclic, phaseOf, hangsOnly,
  createAsset, addAssetVersion, createProject, applyOperation, newInstance, resolveProject, createDraft, settleEdit, applyEdit, cellAt,
} from '../dist/domain/src/index.js';

const mc = (id, properties = {}) => ({ id: `minecraft:${id}`, properties });
const parse = s => { const m = /^([^[]+)(?:\[(.*)\])?$/.exec(s); return { id: m[1], properties: Object.fromEntries((m[2] ?? '').split(',').filter(Boolean).map(kv => kv.split('='))) }; };
const str = st => { const k = Object.keys(st.properties).sort(); return k.length ? `${st.id}[${k.map(x => `${x}=${st.properties[x]}`).join(',')}]` : st.id; };
const world = entries => { const m = new Map(entries.map(([p, s]) => [p.join(','), s])); return p => m.get(p.join(',')); };

/** Payload from a list of [position, state]; bounds from the cells. */
function payload(cells, extra = []) {
  const palette = [], index = new Map();
  const pi = s => { const k = str(s); if (!index.has(k)) { index.set(k, palette.length); palette.push(s); } return index.get(k); };
  const all = [...cells.map(([p, s]) => ({ position: p, kind: 'block', paletteIndex: pi(s) })), ...extra.map(([p, kind]) => kind === 'air' ? { position: p, kind, paletteIndex: pi(mc('air')) } : { position: p, kind })];
  const min = [0, 1, 2].map(i => Math.min(...all.map(c => c.position[i]))), max = [0, 1, 2].map(i => Math.max(...all.map(c => c.position[i])) + 1);
  return createPayload({ schemaVersion: 1, profileId: 'java-26.3', bounds: { min, maxExclusive: max }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette, cells: all, blockEntities: [] });
}

test('block facts: every 26.3 block from the server report, defaults identical to the default-state table', () => {
  const ids = factBlockIds();
  assert.equal(ids.length, 1286);
  assert.equal(BLOCK_FACTS_DATA_VERSION, 5023);
  assert.equal(BLOCK_FACTS_PROFILE, 'java-26.3');
  assert.equal(BLOCK_FACTS_REPORT_SHA256, DEFAULT_STATES_REPORT_SHA256, 'same official report as WORLD-IMPORT-01');
  for (const id of ids) {
    const b = blockFacts(id), report = reportDefaults(id);
    if (report) assert.deepEqual({ ...b.defaults }, { ...report }, id);
    else assert.deepEqual(b.defaults, {}, id);
    for (const [k, v] of Object.entries(b.defaults)) assert.ok(b.properties[k].includes(v), `${id} ${k}`);
  }
  // The VIEW-02 registry knows every block (plus two legacy entity ids).
  const reg = new Set(vanillaBlockIds());
  for (const id of ids) assert.ok(reg.has(id), id);
  // Complete property values where the old registry only saw samples.
  assert.deepEqual([...blockFacts('oak_leaves').properties.distance], ['1', '2', '3', '4', '5', '6', '7']);
  assert.deepEqual([...blockFacts('oak_sapling').properties.stage], ['0', '1']);
  assert.equal(blockFacts('minecraft:redstone_wire').stateCount, 1296);
  assert.deepEqual(completeState(mc('oak_stairs', { facing: 'east' })).properties, { facing: 'east', half: 'bottom', shape: 'straight', waterlogged: 'false' });
  assert.equal(completeState(mc('oak_stairs', { facing: 'up' })), undefined);
});

test('block facts: sturdy faces, support, falling, items and stack sizes as in the game', () => {
  const f = s => stateFacts(s);
  assert.ok(f(mc('stone')).sturdy('up') && f(mc('stone')).sturdy('north', 'center') && f(mc('stone')).fullCube);
  assert.ok(!f(mc('oak_leaves')).sturdy('up'), 'leaves have no support face');
  assert.ok(f(mc('glass')).sturdy('up'));
  const bottomSlab = f(mc('oak_slab', { type: 'bottom' })), topSlab = f(mc('oak_slab', { type: 'top' }));
  assert.ok(bottomSlab.sturdy('down') && !bottomSlab.sturdy('up') && topSlab.sturdy('up') && !topSlab.sturdy('down'));
  assert.ok(f(mc('oak_fence')).sturdy('up', 'center') && !f(mc('oak_fence')).sturdy('up', 'full'));
  assert.deepEqual(f(mc('torch')).supportDirs, ['down']);
  assert.equal(f(mc('torch')).support.down.predicate, 'center');
  assert.deepEqual(f(mc('wall_torch', { facing: 'north' })).supportDirs, ['south']);
  assert.deepEqual(f(mc('lantern', { hanging: 'true' })).supportDirs, ['up']);
  assert.deepEqual(f(mc('ladder', { facing: 'east' })).supportDirs, ['west']);
  assert.equal(f(mc('poppy')).grounds.tag, 'supports_vegetation');
  assert.equal(f(mc('wheat', { age: '0' })).grounds.tag, 'supports_crops');
  assert.ok(inTag('farmland', 'supports_crops'));
  assert.ok(f(mc('stone')).survivesAlone && !f(mc('torch')).survivesAlone);
  assert.equal(f(mc('glowstone')).light, 15);
  assert.equal(f(mc('oak_stairs', { waterlogged: 'true' })).fluid, 'minecraft:water');
  assert.ok(hasClass('sand', 'FallingBlock') && hasClass('white_concrete_powder', 'FallingBlock') && hasClass('damaged_anvil', 'FallingBlock') && !hasClass('scaffolding', 'FallingBlock'));
  assert.ok(blockFacts('suspicious_sand').falls && blockFacts('pointed_dripstone').falls && !blockFacts('scaffolding').falls);
  assert.equal(itemOf('wall_torch'), 'minecraft:torch');
  assert.equal(itemOf('redstone_wire'), 'minecraft:redstone');
  assert.equal(itemOf('fire'), null);
  assert.equal(stackOfItem('minecraft:oak_sign'), 16);
  assert.equal(stackOfItem('minecraft:red_bed'), 1);
  assert.equal(stackOfItem('minecraft:oak_door'), 64);
  assert.ok(inTag('oak_fence', 'wooden_fences') && !inTag('nether_brick_fence', 'wooden_fences') && inTag('cobblestone_wall', 'walls'));
  assert.equal(supportNeed(mc('stone')).kind, 'none');
});

test('connections and support: every vector computed by the real 26.3 server is reproduced', () => {
  const data = JSON.parse(readFileSync(new URL('../fixtures/blocks/block-vectors-26.3.json', import.meta.url), 'utf8'));
  assert.ok(data.count >= 3000);
  const families = new Map();
  for (const v of data.vectors) {
    const entries = Object.entries(v.n).map(([k, s]) => { let p = [0, 0, 0]; for (const d of k.split('+')) p = step(p, d); return [p, parse(s)]; });
    const look = world(entries), c = parse(v.center);
    const n = families.get(v.family) ?? 0; families.set(v.family, n + 1);
    if (v.family === 'survive') assert.equal(survives(c, [0, 0, 0], look).survives, v.survives, `${v.center} ${JSON.stringify(v.n)}`);
    else assert.equal(str(settleState(c, [0, 0, 0], look)), v.result, `${v.center} ${JSON.stringify(v.n)}`);
  }
  for (const f of ['oak_fence', 'nether_brick_fence', 'cobblestone_wall', 'glass_pane', 'iron_bars', 'oak_stairs', 'oak_fence_gate', 'grass_block', 'survive']) assert.ok(families.get(f) > 50, f);
});

test('support with water and stacking: sugar cane, cactus, scaffolding', () => {
  const cane = mc('sugar_cane', { age: '0' });
  assert.equal(survives(cane, [0, 1, 0], world([[[0, 0, 0], mc('sand')]])).survives, false, 'no water next to the sand');
  assert.equal(survives(cane, [0, 1, 0], world([[[0, 0, 0], mc('sand')], [[1, 0, 0], mc('water', { level: '0' })]])).survives, true);
  assert.equal(survives(cane, [0, 2, 0], world([[[0, 1, 0], cane]])).survives, true, 'on sugar cane');
  const cactus = mc('cactus', { age: '0' });
  assert.equal(survives(cactus, [0, 1, 0], world([[[0, 0, 0], mc('sand')]])).survives, true);
  assert.equal(survives(cactus, [0, 1, 0], world([[[0, 0, 0], mc('sand')], [[1, 1, 0], mc('stone')]])).survives, false, 'solid neighbour breaks a cactus');
  const sc = d => mc('scaffolding', { bottom: 'false', distance: String(d), waterlogged: 'false' });
  assert.equal(survives(sc(1), [1, 1, 0], world([[[0, 1, 0], sc(0)]])).survives, true);
  assert.equal(survives(sc(7), [1, 1, 0], world([])).survives, false);
});

test('placement check: floating torch, sand over air, missing door half, unconnected fences, buckets', () => {
  const pl = payload([
    [[0, 0, 0], mc('stone')], [[1, 0, 0], mc('stone')], [[2, 0, 0], mc('stone')],
    [[0, 1, 0], mc('torch')], // on stone: fine
    [[1, 2, 0], mc('torch')], // above air inside the plan: breaks
    [[2, 2, 0], mc('sand')], // above air: falls
    [[0, 1, 1], mc('oak_door', { half: 'lower', facing: 'north' })], // upper half missing (cell above is planned air)
    [[1, 1, 1], mc('oak_fence')], [[2, 1, 1], mc('oak_fence')], // planned without connection
    [[0, 1, 2], mc('water', { level: '0' })], [[1, 1, 2], mc('oak_slab', { type: 'bottom', waterlogged: 'true' })],
  ], [[[1, 1, 0], 'air'], [[2, 1, 0], 'air'], [[0, 2, 1], 'air']]);
  const r = checkPlacement(pl);
  const at = (kind, p) => r.issues.find(i => i.kind === kind && i.position.join() === p.join());
  assert.ok(at('unsupported', [1, 2, 0]), 'floating torch');
  assert.ok(!r.issues.some(i => i.position.join() === '0,1,0'), 'torch on stone holds');
  assert.ok(at('falls', [2, 2, 0]));
  assert.ok(at('half', [0, 1, 1]));
  const fence = at('connection', [1, 1, 1]);
  assert.equal(fence.expected.properties.east, 'true');
  assert.match(fence.note, /east=true/);
  assert.deepEqual(r.aids.map(a => [a.itemId, a.count]).sort(), [['minecraft:water_bucket', 1], ['minecraft:water_bucket', 1]]);
  // Cells outside the selection are surroundings, not errors.
  const loose = checkPlacement(payload([[[0, 5, 0], mc('torch')], [[3, 5, 0], mc('gravel')]]));
  assert.equal(loose.counts.unsupported + loose.counts.falls, 0);
  assert.equal(loose.dependsOnSurroundings, 2);
});

test('settle: fences, walls, panes and stair corners take the game state; idempotent; geometry unchanged', () => {
  const pl = payload([
    [[0, 0, 0], mc('oak_fence')], [[1, 0, 0], mc('oak_fence')], [[2, 0, 0], mc('stone')],
    [[0, 0, 2], mc('cobblestone_wall')], [[1, 0, 2], mc('cobblestone_wall')], [[2, 0, 2], mc('cobblestone_wall')], [[1, 1, 2], mc('stone')], [[2, 1, 2], mc('cobblestone_wall')],
    [[0, 0, 4], mc('glass_pane')], [[0, 0, 5], mc('glass_pane')],
    [[4, 0, 0], mc('oak_stairs', { facing: 'north' })], [[4, 0, -1], mc('oak_stairs', { facing: 'west' })],
  ]);
  const r = settlePayload(pl);
  const look = cellAtPayload(r.payload);
  assert.deepEqual(pick(look([0, 0, 0]), 'east', 'west'), { east: 'true', west: 'false' });
  assert.deepEqual(pick(look([1, 0, 0]), 'east', 'west'), { east: 'true', west: 'true' }, 'fence connects to stone');
  // Middle wall under a full block: straight, sides tall, no post. End wall under a wall post: post raised, the side under the upper wall's arm is tall.
  assert.deepEqual(pick(look([1, 0, 2]), 'east', 'west', 'up'), { east: 'tall', west: 'tall', up: 'false' });
  assert.deepEqual(pick(look([2, 0, 2]), 'west', 'up'), { west: 'tall', up: 'true' });
  assert.deepEqual(pick(look([0, 0, 2]), 'east', 'up'), { east: 'low', up: 'true' });
  assert.deepEqual(pick(look([0, 0, 4]), 'south', 'north'), { south: 'true', north: 'false' });
  assert.equal(look([4, 0, 0]).properties.shape, 'outer_left');
  assert.equal(r.payload.cells.length, pl.cells.length);
  assert.ok(r.changed >= 8);
  assert.equal(settlePayload(r.payload).changed, 0, 'second run changes nothing');
  assert.equal(checkPlacement(r.payload).counts.connection, 0);
});
const pick = (s, ...keys) => Object.fromEntries(keys.map(k => [k, s.properties[k]]));
function cellAtPayload(p) { const m = new Map(p.cells.filter(c => c.kind === 'block').map(c => [c.position.join(), p.palette[c.paletteIndex]])); return pos => m.get(pos.join()); }

test('editor: „Wie im Spiel verbinden“ is one undoable edit and respects the selection', () => {
  const base = payload([[[0, 0, 0], mc('oak_fence')], [[1, 0, 0], mc('oak_fence')], [[5, 0, 0], mc('oak_fence')], [[6, 0, 0], mc('oak_fence')]]);
  const draft = createDraft(base, 'java-26.3');
  const all = settleEdit(draft);
  assert.equal(all.changes.length, 4);
  const part = settleEdit(draft, { a: [0, 0, 0], b: [1, 0, 0] });
  assert.equal(part.changes.length, 2);
  const { draft: next, inverse } = applyEdit(draft, all);
  assert.equal(cellAt(next, [0, 0, 0]).state.properties.east, 'true');
  assert.equal(settleEdit(next), null);
  assert.equal(inverse.changes.length, 4);
});

test('build guide: phases from the game facts, hanging blocks after the layer that holds them', async () => {
  assert.equal(phaseOf(mc('oak_door', { half: 'lower' })), 'attached', 'doors need a block below');
  assert.equal(phaseOf(mc('white_carpet')), 'attached');
  assert.equal(phaseOf(mc('cinnabar')), 'structure');
  assert.equal(phaseOf(mc('suspicious_sand')), 'gravity');
  assert.equal(phaseOf(mc('scaffolding')), 'attached');
  assert.ok(hangsOnly(mc('lantern', { hanging: 'true' })) && !hangsOnly(mc('lantern', { hanging: 'false' })) && hangsOnly(mc('oak_hanging_sign')));
  // Room: floor y0, posts y1–y2, ceiling y3, lantern hanging from the ceiling at y2, a torch on the floor.
  const cells = [];
  for (let x = 0; x < 3; x++) for (let z = 0; z < 3; z++) { cells.push([[x, 0, z], mc('stone')]); cells.push([[x, 3, z], mc('oak_planks')]); }
  cells.push([[0, 1, 0], mc('oak_log')], [[0, 2, 0], mc('oak_log')], [[1, 2, 1], mc('lantern', { hanging: 'true' })], [[2, 1, 2], mc('torch')]);
  const pl = payload(cells);
  const provenance = { author: 'Test', source: 'synthetisch', license: '' };
  const { version } = await addAssetVersion(createAsset({ id: 'raum', name: 'Raum', provenance }), { payload: pl, source: { format: 'voxel-json' } });
  const project = applyOperation(createProject({ name: 'Raum' }), { kind: 'instance.add', instance: newInstance({ assetVersionId: version.id, name: 'Raum', transform: { position: [0, 0, 0], quarterTurns: 0, mirrorX: false } }) }).project;
  const resolution = resolveProject(project, new Map([[version.id, version]]));
  const guide = buildGuide(project, resolution);
  assertGuideAcyclic(guide);
  const hanging = guide.steps.find(s => s.phase === 'hanging');
  const ceiling = guide.steps.find(s => s.y === 3 && s.phase === 'structure');
  assert.ok(hanging && ceiling);
  assert.equal(hanging.y, 2);
  assert.ok(hanging.order > ceiling.order, 'lantern after the ceiling it hangs from');
  assert.ok(hanging.prerequisites.includes(ceiling.id));
  assert.ok(hanging.notes.some(n => /Hängt an dem Block darüber/.test(n)));
  const torch = guide.steps.find(s => s.phase === 'attached' && s.y === 1);
  assert.ok(torch.prerequisites.some(id => guide.byId.get(id).y === 0));
});

test('materials: items from the game facts, real stack sizes', () => {
  const r = itemsForCell(mc('cinnabar'), [0, 0, 0], () => undefined);
  assert.equal(r.yields[0].confidence, 'catalog');
  assert.equal(r.yields[0].itemId, 'minecraft:cinnabar');
  assert.equal(itemsForCell(mc('wall_torch', { facing: 'north' }), [0, 0, 0], () => undefined).yields[0].itemId, 'minecraft:torch');
  assert.equal(stackSizeOf('minecraft:oak_hanging_sign'), 16);
  assert.equal(stackSizeOf('minecraft:white_banner'), 16);
  assert.equal(stackSizeOf('minecraft:stone'), 64);
  assert.equal(stackSizeOf('minecraft:ender_pearl'), 16, 'non-block items keep the rule table');
  assert.ok(changedKeys(mc('oak_fence'), mc('oak_fence', { east: 'false' })).length === 0, 'missing value = default');
  assert.equal(connectFamily('minecraft:copper_bars'), 'pane');
  assert.equal(falls(mc('sand'), [0, 1, 0], world([[[0, 0, 0], mc('short_grass')]])), true, 'replaceable plants let sand through');
});
