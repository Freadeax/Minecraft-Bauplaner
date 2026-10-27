import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPayload, countBlocks } from '../dist/voxel/src/index.js';
import {
  createAsset, addAssetVersion, createProject, applyOperation, execute, undo, newInstance, resolveProject, createSampleLibrary, positionKey,
  buildGuide, evaluateProgress, tickStep, untickStep, tickSteps, assertGuideAcyclic, phaseOf, EMPTY_HISTORY,
} from '../dist/domain/src/index.js';

const provenance = { author: 'Test', source: 'synthetisch', license: '' };
const lib = await createSampleLibrary();
const versions = new Map(lib.versions.map(v => [v.id, v]));
const latest = id => lib.versions.find(v => v.assetId === id).id;
const at = (assetVersionId, name, position, quarterTurns = 0) => newInstance({ assetVersionId, name, transform: { position, quarterTurns, mirrorX: false } });
const withInstances = (...instances) => applyOperation(createProject({ name: 'Guide' }), { kind: 'batch', label: 't', operations: instances.map(instance => ({ kind: 'instance.add', instance })) }).project;

function burgmauer() {
  const tower = latest('sample_tower'), wall = latest('sample_wall'), gate = latest('sample_gate');
  return withInstances(at(tower, 'Turm West', [0, 0, 0]), at(wall, 'Mauer 1', [4, 0, 1]), at(gate, 'Tor', [10, 0, 1]), at(wall, 'Mauer 2', [16, 0, 1]), at(tower, 'Turm Ost', [22, 0, 0]));
}

/**
 * Hand-built column (x = 0..2, z = 0), placed at Y 10:
 *   y0: stone stone stone
 *   y1: sand  stone wall_torch(facing east, attached to the stone at x=1)
 *   y2: water erase mymod:thing
 */
async function handBuilt() {
  const palette = [
    { id: 'minecraft:stone', properties: {} }, { id: 'minecraft:sand', properties: {} },
    { id: 'minecraft:wall_torch', properties: { facing: 'east' } }, { id: 'minecraft:water', properties: { level: '0' } }, { id: 'mymod:thing', properties: {} },
  ];
  const b = (x, y, paletteIndex) => ({ position: [x, y, 0], kind: 'block', paletteIndex });
  const payload = createPayload({ schemaVersion: 1, profileId: 'java:registry-unverified', bounds: { min: [0, 0, 0], maxExclusive: [3, 3, 1] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette,
    cells: [b(0, 0, 0), b(1, 0, 0), b(2, 0, 0), b(0, 1, 1), b(1, 1, 0), b(2, 1, 2), b(0, 2, 3), { position: [1, 2, 0], kind: 'erase' }, b(2, 2, 4)], blockEntities: [] });
  const { version } = await addAssetVersion(createAsset({ id: 'hand', name: 'Säule', provenance }), { payload, source: { format: 'voxel-json' } });
  return version;
}

test('phases follow explicit vanilla rules; mod blocks stay structure', () => {
  const p = id => phaseOf({ id, properties: {} });
  assert.equal(p('minecraft:stone_bricks'), 'structure');
  assert.equal(p('minecraft:gravel'), 'gravity'); assert.equal(p('minecraft:lime_concrete_powder'), 'gravity'); assert.equal(p('minecraft:damaged_anvil'), 'gravity');
  assert.equal(p('minecraft:wall_torch'), 'attached'); assert.equal(p('minecraft:oak_wall_sign'), 'attached'); assert.equal(p('minecraft:stone_button'), 'attached'); assert.equal(p('minecraft:white_carpet'), 'attached');
  assert.equal(p('minecraft:water'), 'liquid'); assert.equal(p('minecraft:lava'), 'liquid');
  assert.equal(p('create:water_wheel'), 'structure'); assert.equal(p('minecraft:oak_fence'), 'structure');
});

test('hand-built column: order, layers, prerequisites and notes match the hand-derived expectation', async () => {
  const version = await handBuilt();
  const inst = at(version.id, 'Säule', [5, 10, 0]);
  const project = withInstances(inst);
  const r = resolveProject(project, new Map([[version.id, version]]));
  const guide = buildGuide(project, r);
  const id = (layer, phase) => `${inst.id}~L${layer}~${phase}`;
  const expected = [id(0, 'structure'), id(1, 'structure'), id(1, 'gravity'), id(1, 'attached'), id(2, 'clear'), id(2, 'structure'), id(2, 'liquid')];
  assert.deepEqual(guide.steps.map(s => s.id), expected);
  assert.deepEqual(guide.steps.map(s => s.order), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(guide.steps.map(s => s.y), [10, 11, 11, 11, 12, 12, 12]);
  const pre = Object.fromEntries(guide.steps.map(s => [s.id, s.prerequisites]));
  assert.deepEqual(pre[id(0, 'structure')], []);
  assert.deepEqual(pre[id(1, 'structure')], [id(0, 'structure')]);
  assert.deepEqual(pre[id(1, 'gravity')], [id(0, 'structure'), id(1, 'structure')]);
  assert.deepEqual(pre[id(1, 'attached')], [id(0, 'structure'), id(1, 'structure'), id(1, 'gravity')]);
  assert.deepEqual(pre[id(2, 'clear')], [id(1, 'structure'), id(1, 'gravity'), id(1, 'attached')]);
  assert.deepEqual(pre[id(2, 'structure')], [id(1, 'structure'), id(1, 'gravity'), id(1, 'attached'), id(2, 'clear')]);
  assert.deepEqual(pre[id(2, 'liquid')], [id(1, 'structure'), id(1, 'gravity'), id(1, 'attached'), id(2, 'clear'), id(2, 'structure')]);
  const s0 = guide.byId.get(id(0, 'structure'));
  assert.deepEqual(s0.bounds, { min: [5, 10, 0], maxExclusive: [8, 11, 1] });
  assert.deepEqual(s0.positions, [[5, 10, 0], [6, 10, 0], [7, 10, 0]]);
  assert.deepEqual(s0.materials.map(m => [m.state.id, m.count]), [['minecraft:stone', 3]]);
  assert.match(s0.check, /Y 10, X 5…7, Z 0…0: genau 3 Blöcke/);
  const torch = guide.byId.get(id(1, 'attached'));
  assert.deepEqual(torch.materials[0].state, { id: 'minecraft:wall_torch', properties: { facing: 'east' } }, 'full state incl. orientation is kept');
  assert.equal(guide.byId.get(id(2, 'clear')).erase, 1);
  assert.match(guide.byId.get(id(2, 'structure')).notes.join(' '), /mymod:thing/);
  assert.match(guide.byId.get(id(2, 'liquid')).notes.join(' '), /Flüssigkeiten zuletzt/);
  assert.deepEqual(guide.totals, { blocks: 8, air: 0, erase: 1 });
  assertGuideAcyclic(guide);
});

test('Burgmauer: every world cell in exactly one step, totals equal the world count, prerequisites earlier', () => {
  const project = burgmauer();
  const r = resolveProject(project, versions);
  const guide = buildGuide(project, r);
  const seen = new Set();
  for (const s of guide.steps) for (const pos of s.positions) { const k = positionKey(pos); assert.ok(!seen.has(k), `doppelt ${k}`); seen.add(k); }
  assert.equal(seen.size, r.world.cells.length);
  assert.equal(guide.totals.blocks, countBlocks(r.world).blocks);
  for (const s of guide.steps) for (const p of s.prerequisites) assert.ok(guide.byId.get(p).order < s.order, `${p} vor ${s.id}`);
  for (let i = 1; i < guide.steps.length; i++) assert.ok(guide.steps[i - 1].y <= guide.steps[i].y, 'no liquids here, so Y rises monotonically');
  assert.equal(new Set(guide.steps.map(s => s.instanceId)).size, 5);
  assert.deepEqual(guide.warnings, []);
  assertGuideAcyclic(guide);
  const wallY1 = guide.steps.find(s => s.sectionName === 'Mauer 1' && s.y === 1);
  assert.ok(wallY1.prerequisites.includes(guide.steps.find(s => s.sectionName === 'Mauer 1' && s.y === 0).id));
});

test('building is deterministic: same project gives identical ids, order and hashes', () => {
  const project = burgmauer();
  const a = buildGuide(project, resolveProject(project, versions)), b = buildGuide(project, resolveProject(project, versions));
  assert.deepEqual(a.steps.map(s => [s.id, s.order, s.geometryHash]), b.steps.map(s => [s.id, s.order, s.geometryHash]));
});

test('manual ticks: ready list, moved geometry ⇒ prüfbedürftig with stable ids, removed section ⇒ orphaned', () => {
  let project = burgmauer();
  let guide = buildGuide(project, resolveProject(project, versions));
  assert.equal(evaluateProgress(guide, project.progress).ready.length, 5, 'one ground layer per section is ready');
  const first = guide.steps[0];
  project = applyOperation(project, tickStep(first, '2026-10-27T00:00:00.000Z')).project;
  let prog = evaluateProgress(guide, project.progress);
  assert.equal(prog.status.get(first.id), 'done'); assert.equal(prog.done, 1); assert.equal(prog.blocksDone, first.blocks);
  assert.ok(!prog.ready.includes(first.id));
  const next = guide.steps.find(s => s.instanceId === first.instanceId && s.layer === 1);
  assert.ok(prog.ready.includes(next.id), 'next layer of the same section is ready');

  const other = guide.steps.find(s => s.instanceId !== first.instanceId);
  project = applyOperation(project, tickStep(other)).project;
  const moved = project.instances.find(i => i.id === first.instanceId);
  project = applyOperation(project, { kind: 'instance.transform', instanceId: moved.id, transform: { ...moved.transform, position: [moved.transform.position[0], 0, moved.transform.position[2] - 6] } }).project;
  guide = buildGuide(project, resolveProject(project, versions));
  prog = evaluateProgress(guide, project.progress);
  assert.ok(guide.byId.has(first.id), 'step id survives a move');
  assert.equal(prog.status.get(first.id), 'review');
  assert.equal(prog.status.get(other.id), 'done', 'untouched section keeps its tick');
  assert.ok(!prog.ready.includes(next.id), 'a step waiting on a review step is not ready');
  project = applyOperation(project, tickStep(guide.byId.get(first.id))).project;
  assert.equal(evaluateProgress(guide, project.progress).status.get(first.id), 'done', 're-confirmed against new geometry');

  project = applyOperation(project, { kind: 'instance.remove', instanceId: other.instanceId }).project;
  guide = buildGuide(project, resolveProject(project, versions));
  prog = evaluateProgress(guide, project.progress);
  assert.deepEqual(prog.orphaned, [other.id]);
  project = applyOperation(project, untickStep(other.id)).project;
  assert.deepEqual(evaluateProgress(guide, project.progress).orphaned, []);
});

test('rotation in place changes geometry hashes of the affected section only', () => {
  let project = burgmauer();
  const before = buildGuide(project, resolveProject(project, versions));
  const tower = project.instances[4];
  project = applyOperation(project, { kind: 'instance.transform', instanceId: tower.id, transform: { ...tower.transform, quarterTurns: 2 } }).project;
  const after = buildGuide(project, resolveProject(project, versions));
  for (const s of after.steps) {
    const old = before.byId.get(s.id);
    if (s.instanceId !== tower.id) assert.equal(s.geometryHash, old.geometryHash);
  }
  const changed = after.steps.filter(s => s.instanceId === tower.id && s.geometryHash !== before.byId.get(s.id).geometryHash);
  assert.ok(changed.length > 0, 'rotated tower changes at least one layer');
});

test('batch tick is one undoable operation', () => {
  const project = burgmauer();
  const guide = buildGuide(project, resolveProject(project, versions));
  const layer0 = guide.steps.filter(s => s.y === 0);
  const r = execute(project, EMPTY_HISTORY, tickSteps(layer0, 'Schicht Y 0 abgehakt'));
  assert.equal(Object.keys(r.project.progress).length, layer0.length);
  assert.equal(r.history.undo.at(-1).label, 'Schicht Y 0 abgehakt');
  const u = undo(r.project, r.history);
  assert.deepEqual(u.project.progress, {});
  assert.equal(tickSteps([], 'x'), null);
});

test('unresolved conflicts are counted per step and reported as warnings', async () => {
  const mk = async (id, block) => (await addAssetVersion(createAsset({ id, name: id, provenance }), { payload: createPayload({ schemaVersion: 1, profileId: 'java:registry-unverified',
    bounds: { min: [0, 0, 0], maxExclusive: [1, 1, 1] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette: [{ id: block, properties: {} }], cells: [{ position: [0, 0, 0], kind: 'block', paletteIndex: 0 }], blockEntities: [] }),
  source: { format: 'voxel-json' } })).version;
  const a = await mk('a', 'minecraft:stone'), b = await mk('b', 'minecraft:dirt');
  const project = withInstances(at(a.id, 'A', [0, 0, 0]), at(b.id, 'B', [0, 0, 0]));
  const guide = buildGuide(project, resolveProject(project, new Map([[a.id, a], [b.id, b]])));
  assert.equal(guide.steps.length, 1);
  assert.equal(guide.steps[0].conflicts, 1);
  assert.match(guide.steps[0].notes[0], /ungeklärtem Voxelkonflikt/);
  assert.match(guide.warnings.join(), /ungeklärte Voxelkonflikte/);
});

test('empty project gives no steps; acyclic check rejects cycles and unknown ids', () => {
  const project = createProject({ name: 'Leer' });
  const guide = buildGuide(project, resolveProject(project, versions));
  assert.deepEqual(guide.steps, []); assert.deepEqual(guide.warnings, []);
  const s = (id, prerequisites) => ({ id, prerequisites });
  const cyc = { steps: [s('a', ['b']), s('b', ['a'])] }; cyc.byId = new Map(cyc.steps.map(x => [x.id, x]));
  assert.throws(() => assertGuideAcyclic(cyc), /Zyklus/);
  const unk = { steps: [s('a', ['z'])] }; unk.byId = new Map(unk.steps.map(x => [x.id, x]));
  assert.throws(() => assertGuideAcyclic(unk), /Unbekannter Schritt/);
});
