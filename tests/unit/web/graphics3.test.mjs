// GFX-03: large scenes – translucent sorting spread over frames, exact early-out picking
// (also on sorted water and glass), sections on screen first when uploading.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { BlockObject, SORT, sortQuads } from '../../../apps/web/src/blockmodels/threeMesh.ts';
import { buildSectionMesh } from '../../../apps/web/src/blockmodels/mesh.ts';
import { fallbackRenderer } from '../../../apps/web/src/blockmodels/renderers.ts';

const state = (id, properties = {}) => ({ id: `minecraft:${id}`, properties });
const block = (x, y, z, paletteIndex = 0) => ({ position: [x, y, z], kind: 'block', paletteIndex });
const slot = () => ({ rect: [0, 0, 1, 1], layer: 0 });
const r = fallbackRenderer();
const mat = new THREE.MeshBasicMaterial();
const materials = { solid: mat, translucent: mat, depth: mat };
const palette = [state('stone'), state('glass')];

/** Stone floor with glass pillars over `n` × `n` sections. */
function field(n) {
  const cells = [];
  for (let x = 0; x < 32 * n; x++) for (let z = 0; z < 32 * n; z++) {
    cells.push(block(x, 0, z));
    if (x % 3 === 0 && z % 3 === 0) for (let y = 1; y < 6; y++) cells.push(block(x, y, z, 1));
  }
  return { cells, mesh: buildSectionMesh(cells, palette, r, slot, [0, 0, 0]) };
}

test('sortQuads: far quads first, same order as a plain distance sort', () => {
  const quads = 2000, positions = new Float32Array(quads * 12);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let q = 0; q < quads; q++) {
    const c = [rnd() * 200, rnd() * 50, rnd() * 200];
    [[0, 0], [1, 0], [1, 1], [0, 1]].forEach(([a, b], k) => positions.set([c[0] + a, c[1] + b, c[2]], (q * 4 + k) * 3));
  }
  const eye = [-10, 30, 90], out = new Uint32Array(quads * 6);
  sortQuads(positions, quads, eye, out);
  const dist = q => { let s = 0; for (let a = 0; a < 3; a++) { let m = 0; for (let k = 0; k < 4; k++) m += positions[(q * 4 + k) * 3 + a]; s += (m / 4 - eye[a]) ** 2; } return Math.sqrt(s); };
  for (let i = 1; i < quads; i++) assert.ok(dist(out[i * 6] / 4) <= dist(out[(i - 1) * 6] / 4) + 1 / 64, `order at ${i}`);
  assert.deepEqual([...new Set(Array.from({ length: quads }, (_, i) => out[i * 6] / 4))].length, quads, 'every quad once');
});

test('picking: same nearest hit as testing every mesh, and the right cell on sorted glass', () => {
  const { cells, mesh } = field(3);
  const obj = new BlockObject(mesh.sections, cells, materials);
  obj.sortTranslucent(new THREE.Vector3(-40, 30, -40));
  const meshes = obj.group.children;
  let seed = 3; const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  for (let i = 0; i < 200; i++) {
    const o = new THREE.Vector3(rnd() * 140 - 20, 20 + rnd() * 30, rnd() * 140 - 20);
    const dir = new THREE.Vector3(rnd() * 96, rnd() * 4, rnd() * 96).sub(o).normalize();
    const ray = new THREE.Raycaster(o, dir);
    const all = ray.intersectObjects(meshes, false)[0];
    const hit = obj.pickFace(ray);
    assert.equal(hit === null, all === undefined, 'hit or miss alike');
    if (!hit) continue;
    // The picked cell contains the hit point (sorted index buffers must not shift the cell).
    const p = all.point;
    assert.ok(hit.cell.position.every((v, a) => p.getComponent(a) >= v - 1e-3 && p.getComponent(a) <= v + 1 + 1e-3), `cell ${hit.cell.position} holds ${p.toArray()}`);
  }
  // Straight down onto a pillar: the top glass block, not another quad of the sorted list.
  const down = new THREE.Raycaster(new THREE.Vector3(30.5, 40, 30.5), new THREE.Vector3(0, -1, 0));
  assert.deepEqual(obj.pickFace(down).cell.position, [30, 5, 30]);
  obj.dispose();
});

test('sortStep: within the quad budget per frame, sections on screen first, re-sort only after the eye moved', () => {
  const { cells, mesh } = field(3);
  const obj = new BlockObject(mesh.sections, cells, materials);
  const perSection = mesh.sections[0].translucent.quads;
  assert.ok(perSection > 0);
  const eye = new THREE.Vector3(48, 20, 48);
  // Only section 2,0,2 is "on screen".
  const inView = c => c[0] > 64 && c[2] > 64;
  const before = obj.group.children.filter(m => m.userData.section.key === '2,0,2' && m.renderOrder >= 1).map(m => m.geometry.getIndex().array.slice());
  assert.equal(obj.sortStep(eye, inView, perSection), true, 'one section per frame, more waiting');
  const after = obj.group.children.filter(m => m.userData.section.key === '2,0,2' && m.renderOrder >= 1).map(m => m.geometry.getIndex().array);
  assert.notDeepEqual(after[0], before[0], 'the visible section was sorted first');
  let frames = 1;
  while (obj.sortStep(eye, inView, perSection)) frames++;
  assert.equal(frames + 1, mesh.sections.filter(s => s.translucent.quads).length, 'one section per frame until all are sorted');
  assert.equal(obj.sortStep(eye, inView), false, 'nothing due while the eye rests');
  eye.x += SORT.near / 2;
  assert.equal(obj.sortStep(eye, inView), false, 'a small step sorts nothing');
  eye.x += 40;
  obj.sortStep(eye, inView, perSection);
  assert.equal(obj.sortStep(eye, inView, 1e9), false, 'a big step sorts again, then rests');
  obj.dispose();
});

test('upload: sections on screen before nearer ones off screen', () => {
  const { cells, mesh } = field(3);
  const obj = new BlockObject(mesh.sections, cells, materials, { progressive: true });
  obj.update([]); // start empty, then queue all sections with a tiny budget
  obj.reportFrame(100); obj.reportFrame(100); obj.reportFrame(100); obj.reportFrame(100);
  obj.update(mesh.sections);
  assert.ok(obj.pending > 1, 'scene larger than the smallest frame budget');
  obj.uploadStep([0, 0, 0], c => c[0] > 64 && c[2] > 64);
  const first = obj.group.children.map(m => m.userData.section.key);
  assert.ok(first.includes('2,0,2'), `on-screen section first (${first})`);
  assert.ok(!first.includes('0,0,0'), 'nearest but off screen waits');
  obj.dispose();
});
