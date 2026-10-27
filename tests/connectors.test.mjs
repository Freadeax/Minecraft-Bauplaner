import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSampleLibrary, createProject, execute, undo, newInstance, EMPTY_HISTORY, resolveProject, sampleWallPayload,
  createAsset, addAssetVersion, handednessFits, nearestSnap, placementBounds,
  validateConnectors, transformConnector, connectorsMate, checkLinks, findSnapCandidates, snapOperation, linkOperation, unlinkedMates, suggestConnector, faceOf,
} from '../dist/domain/src/index.js';

const lib = await createSampleLibrary();
const versions = new Map(lib.versions.map(v => [v.id, v]));
const byAsset = id => lib.versions.find(v => v.assetId === id);
const tower = byAsset('sample_tower'), wall = byAsset('sample_wall'), gate = byAsset('sample_gate');
const T = (position, quarterTurns = 0, mirrorX = false) => ({ position, quarterTurns, mirrorX });
const place = (version, transform, name = version.assetId) => newInstance({ assetVersionId: version.id, name, transform });
function build(...instances) {
  let p = createProject({ name: 'Snap' }), h = EMPTY_HISTORY;
  for (const instance of instances) ({ project: p, history: h } = execute(p, h, { kind: 'instance.add', instance }));
  return { project: p, history: h };
}
const conn = (over = {}) => ({ id: 'c', position: [6, 0, 1], normal: [1, 0, 0], up: [0, 1, 0], type: 'wall_joint', profile: 'wall_2x5', ...over });

test('sample connectors are valid and lie on their faces', () => {
  for (const v of lib.versions) assert.deepEqual(validateConnectors(v.payload, v.connectors), [], v.assetId);
});

test('validation rejects off-face, outside, non-axis and parallel up vectors; warns on empty anchor', () => {
  const p = sampleWallPayload();
  const codes = c => validateConnectors(p, [conn(c)]).map(i => `${i.severity}:${i.code}`);
  assert.deepEqual(codes({}), []);
  assert.deepEqual(codes({ position: [5, 0, 1] }), ['error:OFF_FACE']);
  assert.deepEqual(codes({ position: [6, 9, 1] }), ['error:OUTSIDE_FACE']);
  assert.deepEqual(codes({ normal: [1, 1, 0] }), ['error:NORMAL']);
  assert.deepEqual(codes({ up: [1, 0, 0] }), ['error:UP']);
  assert.deepEqual(codes({ up: [0, 2, 0] }), ['error:UP']);
  // Top face at y=5: merlons only at even x, so x=6 edge touches x=5 (empty top) but z=0..1 — cell (5,4,*) is empty.
  assert.deepEqual(codes({ id: 'top', position: [6, 5, 1], normal: [0, 1, 0], up: [0, 0, -1] }), ['warning:NO_BLOCK']);
  assert.deepEqual(codes({ id: 'top', position: [5, 5, 1], normal: [0, 1, 0], up: [0, 0, -1] }), [], 'touches merlon at x=4');
  assert.equal(validateConnectors(p, [conn(), conn()])[0].code, 'SHAPE');
});

test('connector transform: four quarter turns are identity, double mirror is identity, normals rotate with the cells', () => {
  const c = conn();
  let r = c;
  for (let i = 0; i < 4; i++) r = transformConnector(r, [0, 0, 0], T([0, 0, 0], 1));
  assert.deepEqual([r.position, r.normal, r.up], [c.position, c.normal, c.up]);
  const m = transformConnector(transformConnector(c, [0, 0, 0], T([0, 0, 0], 0, true)), [0, 0, 0], T([0, 0, 0], 0, true));
  assert.deepEqual([m.position, m.normal, m.up], [c.position, c.normal, c.up]);
  // Independent expectation: +X turned by 90° (x,z)→(−z,x) points to +Z (south).
  const q = transformConnector(c, [0, 0, 0], T([10, 0, 0], 1));
  assert.deepEqual(q.normal, [0, 0, 1]); assert.equal(faceOf(q.normal), 'south');
  assert.deepEqual(q.position, [9, 0, 6]); assert.deepEqual(q.up, [0, 1, 0]);
  assert.deepEqual(transformConnector(c, [0, 0, 0], T([0, 0, 0], 0, true)).normal, [-1, 0, 0]);
});

test('mating requires equal type/profile, equal anchor, opposite normals and equal up', () => {
  const a = conn(), b = conn({ normal: [-1, 0, 0] });
  assert.ok(connectorsMate(a, b));
  assert.ok(!connectorsMate(a, { ...b, profile: 'wall_2x9' }));
  assert.ok(!connectorsMate(a, { ...b, type: 'road' }));
  assert.ok(!connectorsMate(a, { ...b, normal: [1, 0, 0] }));
  assert.ok(!connectorsMate(a, { ...b, up: [0, -1, 0] }));
  assert.ok(!connectorsMate(a, { ...b, position: [6, 1, 1] }));
});

test('snap of a wall to the tower east joint is deterministic, on grid and conflict free', () => {
  const t = place(tower, T([0, 0, 0]));
  const { project } = build(t);
  const q = { project, versions, version: wall, reference: [4, 0, 1] };
  const list = findSnapCandidates(q);
  assert.deepEqual(findSnapCandidates(q), list, 'same input ⇒ same order');
  assert.ok(list.length > 0);
  for (const c of list) assert.ok(c.transform.position.every(Number.isInteger));
  // Every free tower face yields placements; the best one is conflict free and nearest the reference.
  const best = list[0];
  assert.equal(best.conflicts, 0);
  assert.equal(best.target.connectorId, 'east');
  assert.deepEqual(best.transform, T([4, 0, 1], 0), 'wall west joint lands on tower east [4,0,2]');
  assert.equal(best.connectorId, 'west');
  assert.ok(list.every((c, i) => i === 0 || list[i - 1].conflicts <= c.conflicts));
  // Without mirror only proper rotations are offered; with mirror both appear.
  assert.ok(list.every(c => !c.transform.mirrorX));
  assert.ok(findSnapCandidates({ ...q, allowMirror: true }).some(c => c.transform.mirrorX));
});

test('snapping a new wall creates instance and link in one undoable operation; result composes conflict free', () => {
  const t = place(tower, T([0, 0, 0]));
  let { project, history } = build(t);
  const best = findSnapCandidates({ project, versions, version: wall, reference: [10, 0, 0] })[0];
  const op = snapOperation(project, versions, best, { newInstance: place(wall, T([0, 0, 0]), 'Mauer') });
  ({ project, history } = execute(project, history, op));
  assert.equal(project.instances.length, 2); assert.equal(project.links.length, 1);
  assert.deepEqual(checkLinks(project, versions).map(s => s.state), ['ok']);
  const r = resolveProject(project, versions);
  assert.equal(r.conflicts.length, 0); assert.deepEqual(r.exportBlockers, []);
  // Usage limit: the tower east joint is now taken, so a second wall cannot use it.
  const again = findSnapCandidates({ project, versions, version: wall, targetInstanceIds: [t.id] });
  assert.ok(again.every(c => c.target.connectorId !== 'east'));
  ({ project } = undo(project, history));
  assert.equal(project.instances.length, 1); assert.equal(project.links.length, 0);
});

test('moving a linked instance drops the broken link and links new mates; stale candidates are refused', () => {
  const t = place(tower, T([0, 0, 0])), w = place(wall, T([4, 0, 1]), 'Mauer');
  let { project, history } = build(t, w);
  ({ project, history } = execute(project, history, linkOperation(project, versions, { instanceId: w.id, connectorId: 'west' }, { instanceId: t.id, connectorId: 'east' })));
  assert.throws(() => linkOperation(project, versions, { instanceId: w.id, connectorId: 'east' }, { instanceId: t.id, connectorId: 'west' }), /nicht möglich/);
  const north = findSnapCandidates({ project, versions, version: wall, instanceId: w.id, targetInstanceIds: [t.id] }).find(c => c.target.connectorId === 'north' && c.conflicts === 0);
  assert.ok(north, 'wall can dock to the north joint');
  assert.equal(Math.abs(north.transform.quarterTurns % 2), 1, 'needs a quarter turn');
  const op = snapOperation(project, versions, north, { instanceId: w.id });
  ({ project, history } = execute(project, history, op));
  assert.equal(project.links.length, 1);
  assert.equal(project.links[0].b.connectorId, 'north');
  assert.deepEqual(checkLinks(project, versions).map(s => s.state), ['ok']);
  // A plain move breaks the link; checkLinks reports it.
  ({ project } = execute(project, history, { kind: 'instance.transform', instanceId: w.id, transform: T([20, 0, 20]) }));
  assert.deepEqual(checkLinks(project, versions).map(s => s.state), ['misaligned']);
  assert.throws(() => snapOperation(project, versions, { ...north, pairs: [{ connectorId: 'west', target: { instanceId: t.id, connectorId: 'west' } }] }, { instanceId: w.id }), /veraltet/);
});

test('a gate between two towers mates both joints at once and reports conflicts for overlapping placements', () => {
  const a = place(tower, T([0, 0, 0]), 'A'), b = place(tower, T([10, 0, 0]), 'B');
  const { project } = build(a, b);
  const list = findSnapCandidates({ project, versions, version: gate, reference: [4, 0, 1] });
  const both = list[0];
  assert.deepEqual(both.transform, T([4, 0, 1]));
  assert.equal(both.conflicts, 0);
  assert.equal(both.pairs.length, 2, 'west→A.east and east→B.west');
  const tight = build(a, place(tower, T([8, 0, 0]), 'C')).project;
  const crowded = findSnapCandidates({ project: tight, versions, version: gate, reference: [4, 0, 1] });
  assert.ok(crowded.some(c => c.conflicts > 0), 'placements into the other tower are listed as conflicting, not hidden');
  assert.equal(crowded[0].conflicts, 0, 'conflict-free placements rank first');
  const mates = unlinkedMates(build(a, b, place(gate, T([4, 0, 1]))).project, versions);
  assert.equal(mates.length, 2);
});

test('suggested connectors sit at the bottom face centre and validate', () => {
  const p = sampleWallPayload();
  const c = suggestConnector(p, 'east', { id: 'e', type: 'wall_joint', profile: 'wall_2x5' });
  assert.deepEqual([c.position, c.normal, c.up], [[6, 0, 1], [1, 0, 0], [0, 1, 0]]);
  const top = suggestConnector(p, 'up', { id: 'u', type: 'deck', profile: 'p' });
  assert.deepEqual([top.position, top.up], [[3, 5, 1], [0, 0, -1]]);
  assert.deepEqual(validateConnectors(p, [c]), []);
});

test('handedness: mirroring flips it, left mates only right, so a 180° turn of an asymmetric wall no longer fits but its mirror does', async () => {
  const l = conn({ handedness: 'left' }), r = conn({ normal: [-1, 0, 0], handedness: 'right' });
  assert.ok(connectorsMate(l, r));
  assert.ok(!connectorsMate(l, { ...r, handedness: 'left' }), 'left does not mate left');
  assert.ok(!connectorsMate(l, conn({ normal: [-1, 0, 0] })), 'asymmetric does not mate symmetric');
  assert.ok(handednessFits(conn(), conn()), 'symmetric mates symmetric');
  assert.equal(transformConnector(l, [0, 0, 0], T([0, 0, 0], 0, true)).handedness, 'right');
  assert.equal(transformConnector(l, [0, 0, 0], T([0, 0, 0], 2)).handedness, 'left', 'rotation keeps handedness');
  const twice = transformConnector(transformConnector(l, [0, 0, 0], T([0, 0, 0], 0, true)), [0, 0, 0], T([0, 0, 0], 0, true));
  assert.equal(twice.handedness, 'left', 'double mirror is identity');
  assert.throws(() => validateConnectors(sampleWallPayload(), [conn({ handedness: 'up' })]).forEach(i => { if (i.code === 'SHAPE') throw new Error(i.message); }), /handedness/);

  // Wall with a walkway on one side: west joint "right", east joint "left" (same world side seen from outside).
  const asset = createAsset({ id: 'walkway', name: 'Wehrgang', provenance: { author: 'Test', source: 'synthetisch', license: '' } });
  const { version: handed } = await addAssetVersion(asset, { payload: sampleWallPayload(), source: { format: 'demo' },
    connectors: [conn({ id: 'west', position: [0, 0, 1], normal: [-1, 0, 0], handedness: 'right' }), conn({ id: 'east', handedness: 'left' })] });
  const map = new Map([...versions, [handed.id, handed]]);
  const a = place(handed, T([0, 0, 0]), 'A');
  const { project } = build(a);
  const fits = findSnapCandidates({ project, versions: map, version: handed, allowMirror: true })
    .filter(c => c.target.connectorId === 'east').map(c => `${c.connectorId}|${c.transform.quarterTurns}|${c.transform.mirrorX}`).sort();
  assert.deepEqual(fits, ['east|0|true', 'west|0|false'], 'straight continuation or mirrored copy; the 180° turn would put the walkway on the other side');
  const symmetric = findSnapCandidates({ project: build(place(wall, T([0, 0, 0]))).project, versions, version: wall, allowMirror: true })
    .filter(c => c.target.connectorId === 'east').length;
  assert.equal(symmetric, 4, 'symmetric profile: all four fitting orientations stay possible');
});

test('drag-to-snap: nearest candidate within reach, conflict-free first, orientation kept on ties, nothing out of reach', () => {
  const t = (position, quarterTurns = 0, mirrorX = false) => ({ position, quarterTurns, mirrorX });
  const cand = (key, position, extra = {}) => ({ key, transform: t(position, extra.q ?? 0, extra.m ?? false), conflicts: extra.conflicts ?? 0 });
  const list = [cand('far', [10, 0, 0]), cand('near-conflict', [1, 0, 0], { conflicts: 3 }), cand('two', [2, 0, 0]), cand('two-turned', [2, 0, 0], { q: 1 }), cand('one-turned', [0, 0, 1], { q: 1 })];
  const current = t([0, 0, 0]);
  assert.equal(nearestSnap(list, [0, 0, 0], current).key, 'one-turned', 'nearest conflict-free wins even if it turns');
  assert.equal(nearestSnap(list.filter(c => c.key !== 'one-turned'), [0, 0, 0], current).key, 'two', 'same distance: keeps orientation');
  assert.equal(nearestSnap([list[1]], [0, 0, 0], current).key, 'near-conflict', 'conflicting snap is still offered when it is the only one');
  assert.equal(nearestSnap(list, [20, 0, 0], current), null, 'out of reach: plain move');
  assert.equal(nearestSnap(list, [7, 0, 0], current, 3).key, 'far');

  // Real geometry: wall dragged near the tower's east face snaps flush to it.
  const tw = place(tower, T([0, 0, 0]), 'Turm'), wa = place(wall, T([9, 0, 1]), 'Mauer');
  const { project } = build(tw, wa);
  const candidates = findSnapCandidates({ project, versions, version: wall, instanceId: wa.id, limit: 500 });
  const pick = nearestSnap(candidates, [5, 0, 1], wa.transform);
  assert.deepEqual(pick.transform, T([4, 0, 1]), 'west joint of the wall on the tower east joint');
  assert.equal(pick.conflicts, 0);
  const b = placementBounds(wall, pick.transform);
  assert.deepEqual([b.min, b.maxExclusive], [[4, 0, 1], [10, 5, 3]]);
});
