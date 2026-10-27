// Viewer geometry, camera and flight maths (B6). The web modules are plain
// TypeScript without runtime imports, loaded via Node's type stripping.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPayload } from '../dist/voxel/src/index.js';
import { createProject, execute, EMPTY_HISTORY, newInstance, resolveProject, inspectCell, addAssetVersion, createAsset } from '../dist/domain/src/index.js';
import { buildFaces } from '../apps/web/src/viewer/faces.ts';
import { VIEWS, frameBounds, orthoZoom, boundsRadius } from '../apps/web/src/viewer/camera.ts';
import { flightStep, lookDirection, yawPitch, clampPitch, PITCH_LIMIT } from '../apps/web/src/viewer/flight.ts';

const block = (x, y, z, kind = 'block') => kind === 'erase' ? { position: [x, y, z], kind } : { position: [x, y, z], kind, paletteIndex: 0 };
const grey = () => [0.5, 0.5, 0.5];
const cube = n => { const c = []; for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) c.push(block(x, y, z)); return c; };
const close = (a, b, eps = 1e-9) => a.every((v, i) => Math.abs(v - b[i]) < eps);

test('faces: only faces towards empty cells are emitted', () => {
  assert.equal(buildFaces([block(0, 0, 0)], grey, [0, 0, 0]).quads, 6);
  assert.equal(buildFaces([block(0, 0, 0), block(1, 0, 0)], grey, [0, 0, 0]).quads, 10, 'shared face removed on both sides');
  assert.equal(buildFaces([block(0, 0, 0), block(0, 0, 1, 'air'), block(0, 1, 0, 'erase')], grey, [0, 0, 0]).quads, 6, 'air and erase never hide a face');
  assert.equal(buildFaces([block(0, 0, 0), block(2, 0, 0)], grey, [0, 0, 0]).quads, 12, 'gap keeps both inner faces');
  const empty = buildFaces([], grey, [0, 0, 0]);
  assert.equal(empty.quads, 0); assert.equal(empty.positions.length, 0);
});

test('faces: filled n³ cube keeps only its hull (measurement for 27³ = 19 683 blocks)', () => {
  const cells = cube(27), t0 = performance.now(), m = buildFaces(cells, grey, [13, 13, 13]), ms = performance.now() - t0;
  assert.equal(m.blocks, 19683); assert.equal(m.quads, 6 * 27 * 27); assert.equal(m.naiveQuads, 6 * 19683);
  assert.equal(m.indices.length, m.quads * 6); assert.equal(m.positions.length, m.quads * 12);
  console.log(`# 27³: ${m.quads} Flächen statt ${m.naiveQuads} (${(100 - m.quads / m.naiveQuads * 100).toFixed(1)} % weniger), ${ms.toFixed(1)} ms`);
  assert.ok(ms < 2000, `mesh build took ${ms} ms`);
});

test('faces: winding faces outwards, quads map back to their cells, origin offsets vertices', () => {
  const cells = [block(5, 7, -3), block(-200, 64, 9000)];
  const m = buildFaces(cells, c => c.position[0] > 0 ? [1, 0, 0] : [0, 0, 1], [5, 7, -3]);
  assert.equal(m.quads, 12);
  for (let q = 0; q < m.quads; q++) {
    const p = i => [...m.positions.slice((m.indices[q * 6 + i]) * 3, (m.indices[q * 6 + i]) * 3 + 3)];
    const [a, b, c] = [p(0), p(1), p(2)];
    const u = b.map((v, i) => v - a[i]), v = c.map((w, i) => w - a[i]);
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const normal = [...m.normals.slice(m.indices[q * 6] * 3, m.indices[q * 6] * 3 + 3)];
    assert.ok(close(n.map(x => Math.sign(x)), normal), `quad ${q} winding ${n} vs ${normal}`);
    const cell = cells[m.quadCells[q]];
    // Every vertex lies on the cell's unit box (relative to the origin).
    for (let k = 0; k < 4; k++) for (let i = 0; i < 3; i++) {
      const rel = m.positions[(q * 4 + k) * 3 + i] + [5, 7, -3][i] - cell.position[i];
      assert.ok(rel === 0 || rel === 1, `vertex outside cell ${cell.position}`);
    }
    assert.deepEqual([...m.colors.slice(q * 12, q * 12 + 3)], cell.position[0] > 0 ? [1, 0, 0] : [0, 0, 1]);
  }
  assert.deepEqual([...m.positions.slice(0, 3)].map(Math.abs).every(v => v <= 1), true, 'local block near the origin stays small');
});

test('camera: presets are unit vectors, framing fits the bounding sphere', () => {
  assert.deepEqual(VIEWS.map(v => v.id), ['iso', 'top', 'north', 'east', 'south', 'west']);
  for (const v of VIEWS) assert.ok(Math.abs(Math.hypot(...v.direction) - 1) < 1e-9, v.id);
  assert.deepEqual(VIEWS.find(v => v.id === 'north').direction, [0, 0, -1], 'north is −Z');
  const b = { min: [-7, 0, -5], maxExclusive: [8, 11, 10] };
  for (const aspect of [0.5, 1, 2.4]) {
    const f = frameBounds(b, [0, 0, 1], 38, aspect);
    const vfov = 38 * Math.PI / 180, hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    assert.ok(f.distance * Math.sin(Math.min(vfov, hfov) / 2) >= f.radius, `aspect ${aspect}`);
    assert.deepEqual(f.target, [0.5, 5.5, 2.5]);
    assert.ok(close(f.position, [0.5, 5.5, 2.5 + f.distance]));
    const zoom = orthoZoom(b, 50, aspect);
    assert.ok(50 * Math.min(1, aspect) / zoom >= boundsRadius(b), 'ortho half extent covers the radius');
  }
});

test('flight: Minecraft-like movement, normalised diagonals, look round trip', () => {
  assert.ok(close(flightStep([0, 0, 0], 0, { forward: 1, right: 0, up: 0 }, 10, 0.5), [0, 0, -5]), 'yaw 0 flies north (−Z)');
  assert.ok(close(flightStep([0, 0, 0], 0, { forward: 0, right: 1, up: 0 }, 10, 1), [10, 0, 0]), 'right is east');
  assert.ok(close(flightStep([0, 0, 0], Math.PI / 2, { forward: 1, right: 0, up: 0 }, 10, 1), [-10, 0, 0]), 'turned left faces west');
  const d = flightStep([1, 2, 3], 0.3, { forward: 1, right: 1, up: 1 }, 6, 1);
  assert.ok(Math.abs(Math.hypot(d[0] - 1, d[1] - 2, d[2] - 3) - 6) < 1e-9, 'diagonal not faster');
  assert.deepEqual(flightStep([1, 2, 3], 1, { forward: 0, right: 0, up: 0 }, 6, 1), [1, 2, 3]);
  for (const [yaw, pitch] of [[0, 0], [1.2, -0.4], [-2.5, 1.1], [3, 0.2]]) {
    const r = yawPitch(lookDirection(yaw, pitch));
    assert.ok(Math.abs(r.yaw - yaw) < 1e-9 && Math.abs(r.pitch - pitch) < 1e-9, `${yaw}/${pitch}`);
  }
  assert.equal(clampPitch(5), PITCH_LIMIT); assert.equal(yawPitch([0, -1, 0]).pitch, -PITCH_LIMIT);
});

test('inspectCell: world → local coordinate through rotation and mirror, conflicts named', async () => {
  const payload = (id) => createPayload({ schemaVersion: 1, profileId: 'java:registry-unverified', bounds: { min: [0, 0, 0], maxExclusive: [2, 1, 3] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0],
    palette: [{ id, properties: {} }], cells: [block(0, 0, 0), block(1, 0, 0), block(1, 0, 2)], blockEntities: [] });
  const asset = createAsset({ name: 'L', provenance: { author: 't', source: 't', license: '' } });
  const { version } = await addAssetVersion(asset, { payload: payload('minecraft:stone'), source: { format: 'demo' } });
  const other = (await addAssetVersion(createAsset({ name: 'M', provenance: { author: 't', source: 't', license: '' } }), { payload: payload('minecraft:dirt'), source: { format: 'demo' } })).version;
  const inst = (v, name, position, quarterTurns, mirrorX) => newInstance({ assetVersionId: v.id, name, transform: { position, quarterTurns, mirrorX } });
  let p = createProject({ name: 'I' }), h = EMPTY_HISTORY;
  const a = inst(version, 'gedreht', [10, 0, 0], 1, false), b = inst(version, 'gespiegelt', [20, 0, 0], 1, true), c = inst(other, 'konflikt', [10, 0, 0], 1, false);
  for (const instance of [a, b, c]) ({ project: p, history: h } = execute(p, h, { kind: 'instance.add', instance }));
  const r = resolveProject(p, new Map([[version.id, version], [other.id, other]]));
  // Independent hand calculation: centre (1.5,0.5,2.5) → rotate [x,z]→[−z,x] → (−2.5,0.5,1.5) + (10,0,0) ⇒ cell (7,0,1).
  const rotated = inspectCell(r, [7, 0, 1]);
  assert.deepEqual(rotated.sources.map(s => [s.instanceName, s.local]), [['gedreht', [1, 0, 2]], ['konflikt', [1, 0, 2]]]);
  assert.equal(rotated.conflict?.kind, 'state'); assert.equal(rotated.state.id, 'minecraft:stone');
  // Mirror first: (−1.5,0.5,2.5) → (−2.5,0.5,−1.5) + (20,0,0) ⇒ cell (17,0,−2).
  const mirrored = inspectCell(r, [17, 0, -2]);
  assert.deepEqual(mirrored.sources.map(s => [s.instanceName, s.local]), [['gespiegelt', [1, 0, 2]]]);
  assert.equal(mirrored.conflict, undefined);
  const nothing = inspectCell(r, [0, 50, 0]);
  assert.equal(nothing.cell, undefined); assert.deepEqual(nothing.sources, []);
});
