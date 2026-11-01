// Viewer geometry, camera and flight maths (B6). The web modules are plain
// TypeScript without runtime imports, loaded via Node's type stripping.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPayload } from '../dist/voxel/src/index.js';
import { createProject, execute, EMPTY_HISTORY, newInstance, resolveProject, inspectCell, addAssetVersion, createAsset } from '../dist/domain/src/index.js';
import { VIEWS, frameBounds, orthoZoom, boundsRadius } from '../apps/web/src/viewer/camera.ts';
import { flightStep, lookDirection, yawPitch, clampPitch, PITCH_LIMIT } from '../apps/web/src/viewer/flight.ts';

const block = (x, y, z, kind = 'block') => kind === 'erase' ? { position: [x, y, z], kind } : { position: [x, y, z], kind, paletteIndex: 0 };
const close = (a, b, eps = 1e-9) => a.every((v, i) => Math.abs(v - b[i]) < eps);

// Block faces and culling moved to the block mesh: tests/blocks.test.mjs.

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

test('preview colours: 26.3 texture averages, shapes share their material, unknown ids stay stable', async () => {
  const { stateColor } = await import('../apps/web/src/colors.ts');
  const c = id => stateColor(`minecraft:${id}`);
  assert.equal(c('oak_slab'), c('oak_planks'));
  assert.notEqual(c('oak_door'), c('oak_planks'), 'doors have their own texture');
  assert.equal(c('stone_brick_stairs'), c('stone_bricks'));
  assert.equal(c('stone_brick_wall'), c('stone_bricks'));
  assert.equal(c('glass_pane'), c('glass'));
  assert.equal(c('polished_andesite_slab'), c('polished_andesite'));
  assert.equal(c('waxed_cut_copper'), c('cut_copper'));
  assert.notEqual(c('spruce_log'), c('spruce_planks'), 'bark differs from planks');
  assert.equal(c('light_blue_wool'), c('light_blue_carpet'));
  assert.notEqual(c('light_blue_wool'), c('blue_wool'), 'light_blue is not matched as blue');
  assert.notEqual(c('red_wool'), c('red_terracotta'));
  assert.equal(c('red_sandstone_stairs'), c('red_sandstone'));
  assert.notEqual(c('red_sandstone'), c('red_wool'), 'red_sandstone is a material, not a dyed block');
  assert.notEqual(c('dark_oak_planks'), c('oak_planks'), 'dark_oak is not matched as oak');
  const { faceColors } = await import('../apps/web/src/colors.ts');
  assert.notEqual(faceColors('minecraft:grass_block').top, faceColors('minecraft:grass_block').side, 'top and side differ');
  assert.equal(stateColor('mymod:oak_planks'), stateColor('mymod:oak_planks'), 'mod ids hash deterministically');
  assert.notEqual(stateColor('mymod:oak_planks'), c('oak_planks'), 'mod namespaces do not borrow vanilla colours');
  for (const id of ['oak_slab', 'glass_pane', 'cyan_bed', 'mystery_thing']) assert.match(c(id), /^#[0-9a-f]{6}$/);
});
