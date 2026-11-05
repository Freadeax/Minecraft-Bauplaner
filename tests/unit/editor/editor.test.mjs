import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPayload, stateRuleFor, transformCellPosition, transformBlockState } from '../../../dist/voxel/src/index.js';
import {
  createDraft, cellAt, applyEdit, executeEdit, undoEdit, redoEdit, EMPTY_DRAFT_HISTORY, materializeDraft, summarizeDraft, blockValue, AIR_VALUE,
  boxEdit, sphereEdit, cylinderEdit, lineEdit, replaceEdit, countMatches, floodEdit, rotateCellEdit, copyBox, transformClipboard, pasteEdit, moveBoxEdit, draftBounds, setCells,
  commitDraftAsVersion, commitDraftAsNewAsset, localCell, inverseRotation, planProjectEdit, commitProjectEdit,
  createAsset, addAssetVersion, createProject, execute, undo, EMPTY_HISTORY, newInstance, resolveProject, positionKey, MAX_EDIT_CELLS, groupOperation,
} from '../../../dist/domain/src/index.js';

const P = 'mc-java-26.3';
const st = (id, properties = {}) => ({ id: `minecraft:${id}`, properties });
const B = (id, properties) => blockValue(st(id, properties));
const payload = (palette, cells, size = [3, 3, 3], min = [0, 0, 0]) => createPayload({ schemaVersion: 1, profileId: P, bounds: { min, maxExclusive: min.map((m, i) => m + size[i]) },
  pivot: min, sourceOrigin: [0, 0, 0], palette, cells, blockEntities: [] });
const at = (x, y, z, i) => ({ position: [x, y, z], kind: 'block', paletteIndex: i });
const box = (a, b) => ({ a, b });
const run = (draft, edit) => applyEdit(draft, edit).draft;
const count = (edit) => edit.changes.length;
const schemaOf = id => stateRuleFor(id)?.schema;

test('draft: overlay, exact inverse, undo/redo and no-op edits', () => {
  const base = payload([st('stone')], [at(0, 0, 0, 0), at(1, 0, 0, 0)]);
  let d = createDraft(base), h = EMPTY_DRAFT_HISTORY;
  ({ draft: d, history: h } = executeEdit(d, h, setCells([[0, 0, 0], [2, 0, 0]], B('oak_planks'), 'Setzen')));
  assert.equal(cellAt(d, [0, 0, 0]).state.id, 'minecraft:oak_planks');
  assert.equal(cellAt(d, [2, 0, 0]).state.id, 'minecraft:oak_planks');
  assert.deepEqual(summarizeDraft(d), { added: 1, removed: 0, changed: 1, entities: 0 });
  const noop = executeEdit(d, h, setCells([[0, 0, 0]], B('oak_planks'), 'Nochmal'));
  assert.equal(noop.changed, 0); assert.equal(noop.history.undo.length, 1, 'no-op is not recorded');
  ({ draft: d, history: h } = executeEdit(d, h, setCells([[1, 0, 0]], null, 'Abbauen')));
  assert.equal(cellAt(d, [1, 0, 0]), null);
  ({ draft: d, history: h } = undoEdit(d, h)); ({ draft: d, history: h } = undoEdit(d, h));
  assert.equal(d.overlay.size, 0, 'undo back to base leaves an empty overlay');
  assert.equal(undoEdit(d, h), null);
  ({ draft: d, history: h } = redoEdit(d, h));
  assert.equal(cellAt(d, [2, 0, 0]).state.id, 'minecraft:oak_planks');
  // Writing the base value again removes the overlay entry.
  d = run(d, setCells([[0, 0, 0]], B('stone'), 'zurück'));
  assert.equal(d.overlay.has('0,0,0'), false);
  assert.throws(() => applyEdit(d, setCells([[0, 0, 0]], B('air'), 'x')), /Luft/);
});

test('materialize: deterministic palette, growing bounds, kept pivot, entities and air/erase', () => {
  const base = createPayload({ schemaVersion: 1, profileId: P, bounds: { min: [0, 0, 0], maxExclusive: [2, 1, 1] }, pivot: [1, 0, 0], sourceOrigin: [5, 6, 7],
    palette: [st('chest', { facing: 'north', type: 'single', waterlogged: 'false' })], cells: [at(0, 0, 0, 0)],
    blockEntities: [{ position: [0, 0, 0], data: { type: 'compound', value: { id: { type: 'string', value: 'minecraft:chest' } } } }] });
  let d = createDraft(base);
  d = run(d, setCells([[-2, 3, 0]], B('stone'), 'a'));
  d = run(d, setCells([[1, 0, 0]], AIR_VALUE, 'b'));
  d = run(d, setCells([[1, 1, 0]], { kind: 'erase' }, 'c'));
  const p = materializeDraft(d);
  assert.deepEqual(p.bounds, { min: [-2, 0, 0], maxExclusive: [2, 4, 1] });
  assert.deepEqual(p.pivot, [1, 0, 0]); assert.deepEqual(p.sourceOrigin, [5, 6, 7]);
  assert.equal(p.blockEntities.length, 1, 'chest entity survives');
  assert.deepEqual(p.cells.map(c => c.kind), ['block', 'air', 'erase', 'block']);
  // Same model in another edit order ⇒ identical payload.
  let e = createDraft(base);
  e = run(e, setCells([[1, 1, 0]], { kind: 'erase' }, 'c'));
  e = run(e, setCells([[1, 0, 0]], AIR_VALUE, 'b'));
  e = run(e, setCells([[-2, 3, 0]], B('stone'), 'a'));
  assert.deepEqual(materializeDraft(e), p);
  assert.equal(materializeDraft(run(createDraft(base), setCells([[0, 0, 0]], null, 'weg'))), null);
});

test('box shapes, sphere, cylinder and line have hand-counted sizes', () => {
  const b = box([0, 0, 0], [2, 2, 2]), v = B('stone');
  assert.equal(count(boxEdit(b, 'fill', v)), 27);
  assert.equal(count(boxEdit(b, 'hollow', v)), 26);
  assert.equal(count(boxEdit(b, 'hollow', v, AIR_VALUE)), 27, 'inner value written too');
  assert.equal(count(boxEdit(b, 'walls', v)), 24);
  assert.equal(count(boxEdit(b, 'frame', v)), 20);
  assert.equal(count(boxEdit(b, 'floor', v)), 18);
  assert.equal(count(boxEdit(box([4, 0, 4], [0, 0, 0]), 'fill', v)), 25, 'corners in any order');
  assert.equal(count(sphereEdit([0, 0, 0], 1, v)), 19);
  assert.equal(count(sphereEdit([0, 0, 0], 1, v, { hollow: true })), 18);
  assert.equal(count(sphereEdit([0, 0, 0], 1, v, { half: 'upper' })), 14, 'y≥0: 9 + 5');
  assert.equal(count(cylinderEdit([0, 0, 0], 1, 2, v)), 18);
  assert.equal(count(cylinderEdit([0, 0, 0], 1, 2, v, { hollow: true })), 16);
  assert.deepEqual(lineEdit([0, 0, 0], [3, 1, 0], v).changes.map(c => c.position), [[0, 0, 0], [1, 0, 0], [2, 1, 0], [3, 1, 0]]);
  assert.throws(() => boxEdit(box([0, 0, 0], [1000, 1000, 1000]), 'fill', v), /höchstens/);
  assert.ok(MAX_EDIT_CELLS >= 100_000);
});

test('replace keeps compatible properties and block entities only for the same id', () => {
  const base = payload([st('oak_stairs', { facing: 'east', half: 'top', shape: 'straight', waterlogged: 'false' }), st('oak_planks')], [at(0, 0, 0, 0), at(1, 0, 0, 1), at(2, 0, 0, 1)]);
  let d = createDraft(base);
  assert.equal(countMatches(d, { id: 'minecraft:oak_planks' }), 2);
  d = run(d, replaceEdit(d, { from: { id: 'minecraft:oak_stairs' }, to: B('stone_brick_stairs', { facing: 'north', half: 'bottom', shape: 'straight', waterlogged: 'false' }) }, schemaOf));
  assert.deepEqual(cellAt(d, [0, 0, 0]).state.properties, { facing: 'east', half: 'top', shape: 'straight', waterlogged: 'false' });
  d = run(d, replaceEdit(d, { from: { id: 'minecraft:oak_planks' }, to: B('spruce_planks'), box: box([2, 0, 0], [2, 0, 0]) }, schemaOf));
  assert.equal(cellAt(d, [1, 0, 0]).state.id, 'minecraft:oak_planks');
  assert.equal(cellAt(d, [2, 0, 0]).state.id, 'minecraft:spruce_planks');
  const strict = replaceEdit(d, { from: { id: 'minecraft:stone_brick_stairs' }, to: B('stone_brick_stairs', { facing: 'west', half: 'bottom', shape: 'straight', waterlogged: 'false' }), keepProperties: false });
  assert.equal(strict.changes[0].value.state.properties.facing, 'west');
});

test('flood fill stays in its plane and needs a limit box in empty space', () => {
  const cells = [];
  for (let x = 0; x < 3; x++) for (let z = 0; z < 3; z++) for (let y = 0; y < 2; y++) cells.push(at(x, y, z, 0));
  const d = createDraft(payload([st('dirt')], cells));
  assert.equal(count(floodEdit(d, [1, 0, 1], B('grass_block'), { plane: 'y' })), 9);
  assert.equal(count(floodEdit(d, [1, 0, 1], B('grass_block'))), 18);
  assert.throws(() => floodEdit(createDraft(null, P), [0, 0, 0], B('stone')), /Begrenzung/);
  assert.equal(count(floodEdit(createDraft(null, P), [0, 0, 0], B('stone'), { plane: 'y', limitBox: box([0, 0, 0], [3, 0, 3]) })), 16);
});

test('rotate a single block with the shared state rules; unknown blocks stay', () => {
  const d = createDraft(payload([st('oak_stairs', { facing: 'north', half: 'bottom', shape: 'straight', waterlogged: 'false' }), { id: 'mymod:thing', properties: { dir: 'n' } }], [at(0, 0, 0, 0), at(1, 0, 0, 1)]));
  const r = rotateCellEdit(d, [0, 0, 0], { quarterTurns: 1, mirrorX: false });
  assert.equal(r.resolved, true); assert.equal(r.edit.changes[0].value.state.properties.facing, 'east');
  const u = rotateCellEdit(d, [1, 0, 0], { quarterTurns: 1, mirrorX: false });
  assert.equal(u.resolved, false); assert.equal(u.edit.changes.length, 0);
  assert.equal(rotateCellEdit(d, [2, 0, 0], { quarterTurns: 1, mirrorX: false }).resolved, false);
});

test('clipboard: copy, rotate, mirror, paste and move as one step', () => {
  const stair = st('oak_stairs', { facing: 'north', half: 'bottom', shape: 'straight', waterlogged: 'false' });
  const d = createDraft(payload([st('stone'), stair], [at(0, 0, 0, 0), at(1, 0, 0, 1)]));
  const clip = copyBox(d, box([0, 0, 0], [1, 0, 0]));
  assert.deepEqual(clip.size, [2, 1, 1]);
  const r = transformClipboard(clip, { quarterTurns: 1, mirrorX: false });
  assert.deepEqual(r.clip.size, [1, 1, 2]);
  const byOffset = Object.fromEntries(r.clip.cells.map(c => [c.offset.join(','), c.value.state]));
  assert.equal(byOffset['0,0,0'].id, 'minecraft:stone');
  assert.equal(byOffset['0,0,1'].properties.facing, 'east');
  // Four quarter turns and a double mirror are the identity.
  let c4 = clip; for (let i = 0; i < 4; i++) c4 = transformClipboard(c4, { quarterTurns: 1, mirrorX: false }).clip;
  assert.deepEqual(c4, clip);
  assert.deepEqual(transformClipboard(transformClipboard(clip, { quarterTurns: 0, mirrorX: true }).clip, { quarterTurns: 0, mirrorX: true }).clip, clip);
  const pasted = run(d, pasteEdit(clip, [5, 0, 0]));
  assert.equal(cellAt(pasted, [6, 0, 0]).state.id, 'minecraft:oak_stairs');
  const moved = run(d, moveBoxEdit(d, box([0, 0, 0], [1, 0, 0]), [0, 2, 0]).edit);
  assert.equal(cellAt(moved, [0, 0, 0]), null);
  assert.equal(cellAt(moved, [1, 2, 0]).state.id, 'minecraft:oak_stairs');
  assert.deepEqual(draftBounds(moved), { min: [0, 2, 0], maxExclusive: [2, 3, 1] });
});

test('save as new version: base unchanged, lineage kept, same content ⇒ same payload hash', async () => {
  const base = payload([st('stone')], [at(0, 0, 0, 0)]);
  const { asset, version } = await addAssetVersion(createAsset({ name: 'Mauer', provenance: { author: 'a', source: 'b', license: 'c' } }), { payload: base, source: { format: 'demo' } });
  const d = run(createDraft(version.payload), setCells([[0, 1, 0]], B('stone_bricks'), 'x'));
  const r = await commitDraftAsVersion(d, asset, version);
  assert.equal(r.asset.versionIds.length, 2);
  assert.equal(r.version.source.format, 'editor'); assert.equal(r.version.source.editedFrom, version.id);
  assert.equal(version.payload.cells.length, 1, 'stored version untouched');
  const again = await commitDraftAsVersion(run(createDraft(version.payload), setCells([[0, 1, 0]], B('stone_bricks'), 'y')), asset, version);
  assert.equal(again.version.payloadHash, r.version.payloadHash);
  const fresh = await commitDraftAsNewAsset(run(createDraft(null, P), boxEdit(box([0, 0, 0], [1, 1, 1]), 'fill', B('stone'))), { name: 'Neu' });
  assert.equal(fresh.version.payload.cells.length, 8); assert.ok(fresh.asset.tags.includes('eigenbau'));
  await assert.rejects(commitDraftAsVersion(run(createDraft(base), setCells([[0, 0, 0]], null, 'weg')), asset, version), /keine Zellen/);
});

test('localCell inverts every discrete transform consistently with the forward rule', () => {
  for (const mirrorX of [false, true]) for (const q of [0, 1, 2, 3]) {
    const t = { position: [7, -3, 2], quarterTurns: q, mirrorX }, pivot = [1, 0, 2];
    assert.ok(inverseRotation(t));
    for (const local of [[0, 0, 0], [3, 2, 1], [-4, 5, 9]]) {
      const world = transformCellPosition(local, pivot, t);
      assert.deepEqual(localCell(world, pivot, t), local, `q=${q} m=${mirrorX} ${local}`);
    }
  }
});

test('project edit: routed to rotated instances, new blocks become a module, one undo step', async () => {
  const stair = st('oak_stairs', { facing: 'north', half: 'bottom', shape: 'straight', waterlogged: 'false' });
  const base = payload([st('stone'), stair], [at(0, 0, 0, 0), at(1, 0, 0, 0), at(2, 0, 0, 1)], [3, 1, 1]);
  const { asset, version } = await addAssetVersion(createAsset({ name: 'Reihe', provenance: { author: 'a', source: 'b', license: 'c' } }), { payload: base, source: { format: 'demo' } });
  let project = createProject({ name: 'P', profileId: P }), history = EMPTY_HISTORY;
  const inst = newInstance({ assetVersionId: version.id, name: 'Reihe gedreht', transform: { position: [10, 0, 10], quarterTurns: 1, mirrorX: false } });
  ({ project, history } = execute(project, history, { kind: 'instance.add', instance: inst }));
  let versions = new Map([[version.id, version]]);
  const res = resolveProject(project, versions);
  const worldStair = res.world.cells.find(c => res.world.palette[c.paletteIndex].id === 'minecraft:oak_stairs').position;
  assert.equal(res.world.palette.find(s => s.id === 'minecraft:oak_stairs').properties.facing, 'east', 'turned once');
  // In world space: turn the stair to face south, remove one stone, and place a new block in empty space.
  const worldStone = res.world.cells.find(c => res.world.palette[c.paletteIndex].id === 'minecraft:stone' && positionKey(c.position) !== positionKey(worldStair)).position;
  let d = createDraft(res.world);
  d = run(d, setCells([worldStair], B('oak_stairs', { facing: 'south', half: 'bottom', shape: 'straight', waterlogged: 'false' }), 'drehen'));
  d = run(d, setCells([worldStone], null, 'weg'));
  d = run(d, setCells([[0, 5, 0]], B('glowstone'), 'neu'));
  const plan = planProjectEdit(res, d, { loose: 'new' });
  assert.equal(plan.perInstance.length, 1); assert.equal(plan.loose.length, 1);
  const local = plan.perInstance[0].changes.find(c => c.value);
  assert.deepEqual(local.position, [2, 0, 0]); assert.equal(local.value.state.properties.facing, 'east', 'south in world = east before the quarter turn');
  const c = await commitProjectEdit(project, res, [asset], d, { loose: 'new', newName: 'Lampen' });
  assert.equal(c.versions.length, 2); assert.equal(c.operation.kind, 'batch');
  versions = new Map([...versions, ...c.versions.map(v => [v.id, v])]);
  const before = project;
  ({ project, history } = execute(project, history, c.operation));
  const after = resolveProject(project, versions);
  const value = p => { const cell = after.world.cells.find(x => positionKey(x.position) === positionKey(p)); return cell && after.world.palette[cell.paletteIndex]; };
  assert.equal(value(worldStair).properties.facing, 'south');
  assert.equal(value(worldStone), undefined);
  assert.equal(value([0, 5, 0]).id, 'minecraft:glowstone');
  assert.equal(project.instances.find(i => i.id === inst.id).assetVersionId, c.versions[0].id);
  assert.equal(project.instances.at(-1).name, 'Lampen');
  ({ project } = undo(project, history));
  assert.deepEqual(project.instances, before.instances, 'one undo returns to the old versions');
  // Placing into an existing instance instead of a new module.
  const into = planProjectEdit(res, run(createDraft(res.world), setCells([[10, 1, 10]], B('stone'), 'x')), { loose: inst.id });
  assert.equal(into.loose.length, 0); assert.equal(into.perInstance[0].changes.length, 1);
});

test('group operations (EDIT-01): rotate/mirror keep the arrangement exactly, everything or nothing, one undo step', async () => {
  const stair = st('oak_stairs', { facing: 'north', half: 'bottom', shape: 'straight', waterlogged: 'false' });
  const base = payload([st('stone'), stair], [at(0, 0, 0, 0), at(1, 0, 0, 0), at(2, 0, 0, 1), at(0, 1, 1, 0)], [3, 2, 2]);
  const { version } = await addAssetVersion(createAsset({ name: 'G', provenance: { author: 'a', source: 'b', license: 'c' } }), { payload: base, source: { format: 'demo' } });
  const versions = new Map([[version.id, version]]);
  let project = createProject({ name: 'Gruppe', profileId: P }), history = EMPTY_HISTORY;
  const a = newInstance({ assetVersionId: version.id, name: 'a', transform: { position: [0, 0, 0], quarterTurns: 0, mirrorX: false } });
  const b = newInstance({ assetVersionId: version.id, name: 'b', transform: { position: [6, 0, 2], quarterTurns: 1, mirrorX: true } });
  for (const instance of [a, b]) ({ project, history } = execute(project, history, { kind: 'instance.add', instance }));
  const world = p => new Map(resolveProject(p, versions).world.cells.map(c => [positionKey(c.position), resolveProject(p, versions).world.palette[c.paletteIndex]]));
  const before = world(project), centre = [3, 0, 1];
  for (const [action, t] of [[{ kind: 'rotate', turns: 1 }, { position: [0, 0, 0], quarterTurns: 1, mirrorX: false }], [{ kind: 'mirror' }, { position: [0, 0, 0], quarterTurns: 0, mirrorX: true }]]) {
    const op = groupOperation(project, [a.id, b.id], action, centre);
    const after = world(execute(project, history, op).project);
    assert.equal(after.size, before.size);
    // Expected: every world cell centre turned about the group centre (shared rule), state turned with B7.
    for (const [k, s] of before) {
      const p = k.split(',').map(Number);
      const moved = transformCellPosition(p, centre, { ...t, position: centre });
      const got = after.get(positionKey(moved));
      assert.ok(got, `${action.kind}: ${k} → ${moved}`);
      assert.equal(got.id, s.id);
      assert.deepEqual(got.properties, transformBlockState(s, t).state.properties, `${action.kind}: state at ${k}`);
    }
  }
  // Four group rotations are the identity.
  let p4 = project; for (let i = 0; i < 4; i++) p4 = execute(p4, EMPTY_HISTORY, groupOperation(p4, [a.id, b.id], { kind: 'rotate', turns: 1 }, centre)).project;
  assert.deepEqual(p4.instances.map(i => i.transform), project.instances.map(i => i.transform));
  // Duplicate + remove are single undo steps; an unknown member aborts everything.
  const dup = execute(project, history, groupOperation(project, [a.id, b.id], { kind: 'duplicate', delta: [0, 0, 10] }));
  assert.equal(dup.project.instances.length, 4);
  assert.equal(undo(dup.project, dup.history).project.instances.length, 2);
  assert.throws(() => groupOperation(project, [a.id, 'gibt-es-nicht'], { kind: 'remove' }), /existiert nicht/);
  const removed = execute(project, history, groupOperation(project, [a.id, b.id], { kind: 'remove' }));
  assert.equal(removed.project.instances.length, 0);
  assert.equal(undo(removed.project, removed.history).project.instances.length, 2);
});
