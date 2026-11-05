// GFX-02: biome colours per face class (shader factors), glowing light sources and
// full-bright blocks, beacon beams (pyramid, glass colours, blocking) with section reuse.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BIOMES, biomeFactors, biomeById } from '../../../apps/web/src/blockmodels/biomes.ts';
import { traceBeam, beamColour, fullBright } from '../../../apps/web/src/blockmodels/beacon.ts';
import { tintClass, tintColor } from '../../../apps/web/src/blockmodels/tint.ts';
import { BEAM_ABOVE, buildBlockMesh, buildSectionMesh } from '../../../apps/web/src/blockmodels/mesh.ts';
import { fallbackRenderer, packRenderer } from '../../../apps/web/src/blockmodels/renderers.ts';
import { parseGraphics, DEFAULT_GRAPHICS } from '../../../apps/web/src/blockmodels/graphics.ts';
import { snapshotRenderer, rendererFromSnapshot } from '../../../apps/web/src/blockmodels/snapshot.ts';

const state = (id, properties = {}) => ({ id: `minecraft:${id}`, properties });
const block = (x, y, z, paletteIndex = 0) => ({ position: [x, y, z], kind: 'block', paletteIndex });
const slot = () => ({ rect: [0, 0, 1, 1], layer: 0 });
const r = fallbackRenderer();

test('biome factors turn the baked plains colours into the biome colours', () => {
  const plains = biomeFactors('plains');
  assert.ok([...plains].every(v => Math.abs(v - 1) < 1e-6), 'plains keeps every colour');
  const swamp = biomeById('swamp'), f = biomeFactors('swamp');
  const hex = h => [1, 3, 5].map(i => Number.parseInt(h.slice(i, i + 2), 16) / 255);
  const [pg, sg] = [hex(BIOMES[0].grass), hex(swamp.grass)];
  for (let c = 0; c < 3; c++) assert.ok(Math.abs(pg[c] * f[3 + c] - sg[c]) < 1e-6, 'grass factor × plains = swamp grass');
  assert.deepEqual([...f.slice(0, 3)], [1, 1, 1], 'class 0 untouched');
  assert.equal(biomeById('nope').id, 'plains');
  assert.equal(new Set(BIOMES.map(b => b.id)).size, BIOMES.length, 'unique ids');
});

test('tint classes: grass, foliage, water by tintindex; own shapes tint the grass block top only; fixed leaves stay', () => {
  assert.equal(tintClass('minecraft:grass_block', 0), 1);
  assert.equal(tintClass('minecraft:oak_leaves', 0), 2);
  assert.equal(tintClass('minecraft:water', 0), 3);
  assert.equal(tintClass('minecraft:spruce_leaves', 0), 0, 'spruce has a fixed colour in every biome');
  assert.equal(tintClass('minecraft:grass_block', -1), 0, 'no tintindex and not an own shape: untinted');
  assert.equal(tintClass('minecraft:grass_block', -1, 'up'), 1);
  assert.equal(tintClass('minecraft:grass_block', -1, 'north'), 0, 'side of the own shape is mostly dirt');
  assert.equal(tintClass('minecraft:short_grass', -1, 'north'), 1);
  assert.equal(tintColor('minecraft:grass_block', {}, 0), '#91bd59', 'baked tint is still plains');
  // Mesh with own shapes: grass block top carries class 1 per vertex, its sides 0, stone 0.
  const palette = [state('grass_block', { snowy: 'false' }), state('stone')];
  const m = buildBlockMesh([block(0, 0, 0, 0), block(2, 0, 0, 1)], palette, r, slot, [0, 0, 0]);
  assert.equal(m.solid.tints.length, m.solid.quads * 4);
  const classes = new Map();
  for (let q = 0; q < m.solid.quads; q++) {
    const cell = m.solid.quadCells[q], up = m.solid.positions[q * 12 + 1] > 0.99 && m.solid.positions[q * 12 + 4] > 0.99 && m.solid.positions[q * 12 + 7] > 0.99;
    classes.set(`${cell}:${up}`, m.solid.tints[q * 4]);
  }
  assert.equal(classes.get('0:true'), 1, 'grass top');
  assert.equal(classes.get('0:false'), 0, 'grass sides/bottom');
  assert.equal(classes.get('1:true'), 0, 'stone');
});

test('light sources glow with their own level, emissive blocks are full-bright even in the dark', () => {
  assert.equal(fullBright('minecraft:magma_block'), true);
  assert.equal(fullBright('minecraft:sculk_sensor', { sculk_sensor_phase: 'inactive' }), false);
  assert.equal(fullBright('minecraft:sculk_sensor', { sculk_sensor_phase: 'active' }), true);
  // A magma block inside a closed stone box: its faces read block light 1 although its own light (3) is low.
  const palette = [state('stone'), state('magma_block'), state('glowstone')];
  const cells = [];
  for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) for (let z = -2; z <= 2; z++) {
    const shell = Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) === 2;
    if (shell) cells.push(block(x, y, z, 0));
  }
  cells.push(block(0, 0, 0, 1), block(1, -1, 1, 2));
  const m = buildBlockMesh(cells, palette, r, slot, [0, 0, 0]);
  const minBlockLight = cell => { let v = 1; for (let q = 0; q < m.solid.quads; q++) if (m.solid.quadCells[q] === cell) for (let k = 0; k < 4; k++) v = Math.min(v, m.solid.light[q * 16 + k * 4 + 2]); return v; };
  assert.equal(minBlockLight(cells.length - 2), 1, 'magma full-bright');
  assert.equal(minBlockLight(cells.length - 1), 1, 'glowstone faces at least its own level 15');
});

test('beacon beam: pyramid levels, glass colours, opaque blocks stop it, bedrock does not', () => {
  const world = new Map();
  const put = (x, y, z, id, opaque = true) => world.set(`${x},${y},${z}`, { id: `minecraft:${id}`, opaque });
  const at = (x, y, z) => world.get(`${x},${y},${z}`) ?? null;
  assert.equal(traceBeam(0, 1, 0, 20, at).level, 0, 'no pyramid');
  for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) put(x, 0, z, x === 0 ? 'iron_block' : 'gold_block');
  let b = traceBeam(0, 1, 0, 20, at);
  assert.equal(b.level, 1); assert.equal(b.active, true);
  assert.deepEqual(b.segments, [{ from: 2, to: 20, rgb: [1, 1, 1] }]);
  put(0, 5, 0, 'red_stained_glass', false); put(0, 8, 0, 'blue_stained_glass_pane', false);
  b = traceBeam(0, 1, 0, 20, at);
  assert.equal(b.segments.length, 3);
  assert.deepEqual(b.segments[1].rgb, beamColour('minecraft:red_stained_glass'), 'first glass sets the colour');
  const red = beamColour('minecraft:red_stained_glass'), blue = beamColour('minecraft:blue_stained_glass');
  assert.deepEqual(b.segments[2].rgb, red.map((v, i) => (v + blue[i]) / 2), 'further glass mixes half and half');
  put(0, 12, 0, 'bedrock');
  assert.equal(traceBeam(0, 1, 0, 20, at).active, true, 'bedrock lets the beam through');
  put(0, 14, 0, 'stone');
  b = traceBeam(0, 1, 0, 20, at);
  assert.equal(b.active, false); assert.equal(b.blockedAt, 14);
  world.delete('0,14,0');
  for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) put(x, -1, z, 'diamond_block');
  assert.equal(traceBeam(0, 1, 0, 20, at).level, 2);
});

/** Beacon on a 3×3 iron pyramid, optional glass above and a roof at `roofY`. */
function beaconScene({ glass = null, roofY = null } = {}) {
  const palette = [state('iron_block'), state('beacon'), state('red_stained_glass'), state('stone')];
  const cells = [];
  for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) cells.push(block(x, 0, z, 0));
  cells.push(block(0, 1, 0, 1));
  if (glass !== null) cells.push(block(0, glass, 0, 2));
  if (roofY !== null) cells.push(block(0, roofY, 0, 3));
  return { palette, cells };
}

test('beacon beam in the mesh: full-bright column above the model, blocked by a roof, counted', () => {
  const free = beaconScene();
  const m = buildBlockMesh(free.cells, free.palette, r, slot, [0, 0, 0]);
  assert.deepEqual(m.beacons, { total: 1, active: 1 });
  const beamQuads = [];
  for (let q = 0; q < m.translucent.quads; q++) if (m.translucent.quadCells[q] === 9) beamQuads.push(q);
  assert.equal(beamQuads.length, 4, 'four sides of one white segment');
  let top = -Infinity;
  for (const q of beamQuads) for (let k = 0; k < 4; k++) {
    top = Math.max(top, m.translucent.positions[q * 12 + k * 3 + 1]);
    for (let c = 0; c < 4; c++) assert.equal(m.translucent.light[q * 16 + k * 4 + c], 1, 'full-bright');
  }
  assert.equal(top, 1 + 1 + BEAM_ABOVE, 'beam ends BEAM_ABOVE blocks over the highest block');
  const blocked = beaconScene({ roofY: 6 });
  const mb = buildBlockMesh(blocked.cells, blocked.palette, r, slot, [0, 0, 0]);
  assert.deepEqual(mb.beacons, { total: 1, active: 0 });
  assert.equal(mb.translucent.quads, 0);
  const tinted = beaconScene({ glass: 4 });
  const mt = buildBlockMesh(tinted.cells, tinted.palette, r, slot, [0, 0, 0]);
  const colours = new Set();
  for (let q = 0; q < mt.translucent.quads; q++) if (mt.translucent.quadCells[q] === 9) colours.add([...mt.translucent.colors.slice(q * 12, q * 12 + 3)].map(v => v.toFixed(3)).join());
  assert.equal(colours.size, 2, 'white below the glass, red above');
});

test('sections: a roof far above the beacon rebuilds the beacon section; incremental equals a fresh build', () => {
  const base = beaconScene();
  const first = buildSectionMesh(base.cells, base.palette, r, slot, [0, 0, 0]);
  const roofed = beaconScene({ roofY: 70 });
  const next = buildSectionMesh(roofed.cells, roofed.palette, r, slot, [0, 0, 0], undefined, {}, first.sections);
  const fresh = buildSectionMesh(roofed.cells, roofed.palette, r, slot, [0, 0, 0]);
  assert.equal(next.beacons.active, 0);
  const beaconSection = next.sections.find(s => s.key === '0,0,0');
  assert.notEqual(beaconSection, first.sections.find(s => s.key === '0,0,0'), 'beacon section rebuilt although the roof is in another section');
  assert.deepEqual(next.sections.map(s => s.hash).sort(), fresh.sections.map(s => s.hash).sort());
  assert.equal(next.quads, fresh.quads);
});

test('render snapshot always carries the colour tile (beams with textured renderers)', () => {
  const source = { blockstate: () => null, model: () => null, texture: () => null };
  const renderer = { ...packRenderer(source, 'test'), block: () => ({ quads: [], kind: 'pack' }) };
  const sprites = s => ({ rect: [0, 0, 1, 1], layer: s === '#' ? 0 : 1 });
  const snap = snapshotRenderer(renderer, sprites, [state('stone')]);
  assert.ok(snap.sprites.some(([k]) => k === '#'));
  assert.doesNotThrow(() => rendererFromSnapshot(snap, [state('stone')]).sprites('#'));
});

test('graphics settings keep a valid biome', () => {
  assert.equal(DEFAULT_GRAPHICS.biome, 'plains');
  assert.equal(parseGraphics({ biome: 'swamp' }).biome, 'swamp');
  assert.equal(parseGraphics({ biome: 'mars' }).biome, 'plains');
  assert.equal(parseGraphics({}).biome, 'plains');
});

test('progressive GPU upload: nearest sections first, old meshes stay until replaced, small updates at once', async () => {
  const THREE = await import('three');
  const { BlockObject, UPLOAD, sectionBytes } = await import('../../../apps/web/src/blockmodels/threeMesh.ts');
  const mat = new THREE.MeshBasicMaterial();
  const materials = { solid: mat, translucent: mat, depth: mat };
  // A long row of stone: one section per 32 blocks along X, each with plenty of faces.
  const palette = [state('stone')];
  const cells = [];
  for (let x = 0; x < 32 * 6; x++) for (let y = 0; y < 32; y += 2) for (let z = 0; z < 32; z += 2) cells.push(block(x, y, z));
  const mesh = buildSectionMesh(cells, palette, r, slot, [0, 0, 0]);
  assert.equal(mesh.sections.length, 6);
  const total = mesh.sections.reduce((n, s) => n + sectionBytes(s), 0);
  const small = new BlockObject(mesh.sections, cells, materials);
  assert.equal(small.pending, 0, 'not progressive: everything at once');
  const obj = new BlockObject(mesh.sections, cells, materials, { progressive: true });
  assert.ok(total > UPLOAD.start, 'scene larger than one frame budget');
  assert.ok(obj.pending > 0, `queued (${(total / 1048576).toFixed(1)} MB > budget)`);
  assert.equal(obj.group.children.length, 0, 'nothing installed before the first frame');
  obj.uploadStep([32 * 6, 0, 0]);
  const first = obj.group.children.map(m => m.userData.section.key);
  assert.ok(first.includes('5,0,0'), 'section nearest to the camera comes first');
  assert.ok(!first.includes('0,0,0'), 'far section waits');
  let frames = 1;
  while (obj.pending) { obj.uploadStep([32 * 6, 0, 0]); obj.reportFrame(5); frames++; }
  assert.equal(obj.uploadFrames, frames);
  assert.equal(new Set(obj.group.children.map(m => m.userData.section.key)).size, 6);
  assert.ok(obj.uploadBudget > UPLOAD.start, 'fast frames raise the budget');
  // Edit far away: the old mesh of the changed section stays visible until its replacement is installed.
  const edited = [...cells, block(1, 1, 1)];
  const next = buildSectionMesh(edited, palette, r, slot, [0, 0, 0], undefined, {}, mesh.sections);
  assert.equal(next.built, 1);
  obj.update(next.sections);
  assert.equal(new Set(obj.group.children.map(m => m.userData.section.key)).size, 6, 'no hole while uploading');
  obj.reportFrame(100); obj.reportFrame(100);
  assert.ok(obj.uploadBudget < UPLOAD.max);
  // Removing all sections but one drops the others at once.
  obj.update(next.sections.slice(0, 1));
  assert.equal(new Set(obj.group.children.map(m => m.userData.section.key)).size, 1);
  obj.dispose();
});
