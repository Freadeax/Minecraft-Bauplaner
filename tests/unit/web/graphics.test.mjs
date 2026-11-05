// GFX-01: Minecraft light (emission, propagation, smooth light, ambient occlusion),
// spawn check, sectioned mesh with reuse, translucent sorting and graphics settings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emission, dampening, propagateLight, spawnPassable } from '../../../apps/web/src/blockmodels/light.ts';
import { AO_LEVELS, SECTION, buildBlockMesh, buildSectionMesh } from '../../../apps/web/src/blockmodels/mesh.ts';
import { fallbackRenderer } from '../../../apps/web/src/blockmodels/renderers.ts';
import { parseGraphics, sunDirection, DEFAULT_GRAPHICS } from '../../../apps/web/src/blockmodels/graphics.ts';

const state = (id, properties = {}) => ({ id: `minecraft:${id}`, properties });
const block = (x, y, z, paletteIndex = 0) => ({ position: [x, y, z], kind: 'block', paletteIndex });
const slot = () => ({ rect: [0, 0, 1, 1], layer: 0 });
const r = fallbackRenderer();

test('light emission follows Minecraft (fixed, lit, candles, pickles, respawn anchor, light block)', () => {
  assert.equal(emission('minecraft:torch'), 14);
  assert.equal(emission('minecraft:wall_torch'), 14);
  assert.equal(emission('minecraft:lantern'), 15);
  assert.equal(emission('minecraft:soul_lantern'), 10);
  assert.equal(emission('minecraft:glowstone'), 15);
  assert.equal(emission('minecraft:stone'), 0);
  assert.equal(emission('minecraft:furnace'), 0, 'furnace is unlit by default');
  assert.equal(emission('minecraft:furnace', { lit: 'true' }), 13);
  assert.equal(emission('minecraft:redstone_torch'), 7, 'redstone torch is lit by default');
  assert.equal(emission('minecraft:redstone_torch', { lit: 'false' }), 0);
  assert.equal(emission('minecraft:campfire', { lit: 'false' }), 0);
  assert.equal(emission('minecraft:white_candle', { lit: 'true', candles: '3' }), 9);
  assert.equal(emission('minecraft:sea_pickle', { pickles: '4', waterlogged: 'true' }), 15);
  assert.equal(emission('minecraft:sea_pickle', { pickles: '4', waterlogged: 'false' }), 0);
  assert.equal(emission('minecraft:respawn_anchor', { charges: '2' }), 7);
  assert.equal(emission('minecraft:light', { level: '9' }), 9);
  assert.equal(emission('minecraft:waxed_exposed_copper_bulb', { lit: 'true' }), 12);
  assert.equal(emission('minecraft:cave_vines', { berries: 'true' }), 14);
  assert.equal(dampening('minecraft:water'), 1); assert.equal(dampening('minecraft:oak_leaves'), 1); assert.equal(dampening('minecraft:glass'), 0);
  assert.equal(spawnPassable('minecraft:short_grass'), true); assert.equal(spawnPassable('minecraft:rail'), false);
  assert.equal(spawnPassable('minecraft:snow', { layers: '1' }), true); assert.equal(spawnPassable('minecraft:snow', { layers: '3' }), false);
});

/** Grid helper: values per cell index ((x*sy)+y)*sz+z; v=1 opaque stone, v=2 torch, v=3 water. */
function grid(sx, sy, sz, fill) {
  const g = new Int32Array(sx * sy * sz);
  for (let x = 0; x < sx; x++) for (let y = 0; y < sy; y++) for (let z = 0; z < sz; z++) g[(x * sy + y) * sz + z] = fill(x, y, z);
  return g;
}
const opaque = Uint8Array.from([0, 1, 0, 0]), damp = Uint8Array.from([0, 15, 0, 1]), emit = Uint8Array.from([0, 0, 14, 0]);
const idx = (sy, sz) => (x, y, z) => (x * sy + y) * sz + z;

test('light propagation: torch falls off by one per step, walls stop it, sky falls straight down', () => {
  const n = 31, at = idx(n, n);
  const torch = propagateLight(grid(n, n, n, (x, y, z) => x === 15 && y === 15 && z === 15 ? 2 : 0), n, n, n, opaque, damp, emit);
  assert.equal(torch.block[at(15, 15, 15)], 14);
  assert.equal(torch.block[at(16, 15, 15)], 13);
  assert.equal(torch.block[at(18, 17, 15)], 9, 'Manhattan distance 5');
  assert.equal(torch.block[at(29, 15, 15)], 0);
  assert.ok(torch.sky.every(v => v === 15), 'no roof: full sky everywhere');
  // Closed stone box 9³ with a hollow 7³ inside: no sky light inside, a torch lights the inside only.
  const b = 11, atb = idx(b, b);
  const box = (x, y, z) => x >= 1 && x <= 9 && y >= 1 && y <= 9 && z >= 1 && z <= 9 && (x === 1 || x === 9 || y === 1 || y === 9 || z === 1 || z === 9);
  const closed = propagateLight(grid(b, b, b, (x, y, z) => box(x, y, z) ? 1 : x === 5 && y === 2 && z === 5 ? 2 : 0), b, b, b, opaque, damp, emit);
  assert.equal(closed.sky[atb(5, 5, 5)], 0, 'no sky light in a closed room');
  assert.equal(closed.block[atb(5, 3, 5)], 13);
  assert.equal(closed.block[atb(0, 2, 5)], 0, 'the wall blocks torch light');
  // Water dampens light from above by one per block.
  const w = 3, atw = idx(6, w);
  const water = propagateLight(grid(w, 6, w, (x, y) => y <= 3 && y >= 1 ? 3 : 0), w, 6, w, opaque, damp, emit);
  assert.equal(water.sky[atw(1, 3, 1)], 14); assert.equal(water.sky[atw(1, 1, 1)], 12);
  // A window: one opening in the roof lets light into the box.
  const open = propagateLight(grid(b, b, b, (x, y, z) => box(x, y, z) && !(x === 5 && y === 9 && z === 5) ? 1 : 0), b, b, b, opaque, damp, emit);
  assert.equal(open.sky[atb(5, 5, 5)], 15, 'straight below the hole');
  assert.equal(open.sky[atb(6, 5, 5)], 14, 'one step aside');
});

test('ambient occlusion: corners next to full blocks get darker, open faces stay bright', () => {
  const stone = [state('stone')];
  const single = buildBlockMesh([block(0, 0, 0)], stone, r, slot, [0, 0, 0]);
  for (let v = 0; v < single.solid.quads * 4; v++) assert.equal(single.solid.light[v * 4 + 1], 1, 'lone cube: no occlusion');
  // Floor of 3×3 with a cube on the middle: the floor top touching the cube is occluded on two vertices.
  const cells = [];
  for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) cells.push(block(x, 0, z));
  cells.push(block(0, 1, 0));
  const m = buildBlockMesh(cells, stone, r, slot, [0, 0, 0]);
  const top = [];
  for (let q = 0; q < m.solid.quads; q++) {
    const c = cells[m.solid.quadCells[q]];
    if (c.position[1] !== 0 || c.position[0] !== 1 || c.position[2] !== 0) continue;
    const ys = [0, 1, 2, 3].map(k => m.solid.positions[(q * 4 + k) * 3 + 1]);
    if (ys.every(y => y === 1)) top.push([0, 1, 2, 3].map(k => m.solid.light[(q * 4 + k) * 4 + 1]));
  }
  assert.equal(top.length, 1, 'top face of the floor block east of the cube');
  assert.deepEqual(top[0].slice().sort(), [Math.fround(AO_LEVELS[2]), Math.fround(AO_LEVELS[2]), 1, 1], 'two vertices touch the cube');
  const noAo = buildBlockMesh(cells, stone, r, slot, [0, 0, 0], undefined, { ao: false });
  assert.ok([...Array(noAo.solid.quads * 4).keys()].every(v => noAo.solid.light[v * 4 + 1] === 1), 'switchable');
});

/** Hollow stone room 7×5×7 (outer), floor at y=0, optional torch in the middle of the floor. */
function room(withTorch) {
  const palette = [state('stone'), state('torch')], cells = [];
  for (let x = 0; x < 7; x++) for (let y = 0; y < 5; y++) for (let z = 0; z < 7; z++)
    if (x === 0 || x === 6 || y === 0 || y === 4 || z === 0 || z === 6) cells.push(block(x, y, z));
  if (withTorch) cells.push(block(3, 1, 3, 1));
  return { palette, cells };
}

test('smooth light per vertex: a closed room is dark, a torch lights it; face brightness kept separately', () => {
  const dark = room(false), m = buildBlockMesh(dark.cells, dark.palette, r, slot, [0, 0, 0]);
  assert.equal(m.lit, true);
  let inner = 0, outer = 0;
  for (let q = 0; q < m.solid.quads; q++) for (let k = 0; k < 4; k++) {
    const p = [0, 1, 2].map(i => m.solid.positions[(q * 4 + k) * 3 + i]), sky = m.solid.light[(q * 4 + k) * 4 + 3];
    const inside = p.every((v, i) => v >= 1 && v <= (i === 1 ? 4 : 6));
    if (inside) { inner++; assert.equal(sky, 0, `inner vertex ${p} has no sky light`); } else if (p[1] === 5) { outer++; assert.equal(sky, 1); }
  }
  assert.ok(inner > 0 && outer > 0);
  const shades = new Set(); for (let v = 0; v < m.solid.quads * 4; v++) shades.add(m.solid.light[v * 4]);
  assert.deepEqual([...shades].sort(), [0.5, 0.6, 0.8, 1].map(Math.fround), 'Minecraft face brightness per direction');
  const lit = room(true), t = buildBlockMesh(lit.cells, lit.palette, r, slot, [0, 0, 0]);
  let max = 0; for (let v = 0; v < t.solid.quads * 4; v++) max = Math.max(max, t.solid.light[v * 4 + 2]);
  assert.ok(max > 0.8, `torch light reaches the walls (${max})`);
});

test('spawn check: dark floor spawns by day, torch-lit floor not, open roof only at night', () => {
  const dark = room(false), m = buildBlockMesh(dark.cells, dark.palette, r, slot, [0, 0, 0]);
  const at = new Map(); for (let i = 0; i < m.spawn.count; i++) at.set([0, 1, 2].map(k => m.spawn.positions[i * 3 + k]).join(','), m.spawn.when[i]);
  assert.equal(at.get('3,1,3'), 1, 'inside the dark room: also by day');
  assert.equal(at.get('3,5,3'), 2, 'on the roof under open sky: only at night');
  assert.equal(at.size, 25 + 49, 'inner floor 5×5 (3 high) and roof 7×7');
  const lit = room(true), t = buildBlockMesh(lit.cells, lit.palette, r, slot, [0, 0, 0]);
  const inside = [];
  for (let i = 0; i < t.spawn.count; i++) if (t.spawn.positions[i * 3 + 1] === 1) inside.push(i);
  assert.equal(inside.length, 0, 'a torch lights the whole 5×5 floor');
  // Low ceiling: one free cell is not enough to spawn.
  const low = [];
  for (let x = 0; x < 3; x++) for (let z = 0; z < 3; z++) { low.push(block(x, 0, z)); low.push(block(x, 2, z)); }
  const lm = buildBlockMesh(low, [state('stone')], r, slot, [0, 0, 0]);
  for (let i = 0; i < lm.spawn.count; i++) assert.notEqual(lm.spawn.positions[i * 3 + 1], 1, 'no spawn under a 1-high ceiling');
  // Glass and leaves are no spawn floor.
  const glass = buildBlockMesh([block(0, 0, 0), block(1, 0, 0, 1)], [state('glass'), state('oak_leaves')], r, slot, [0, 0, 0]);
  assert.equal(glass.spawn.count, 0);
});

/** 70×12×40 terrain with houses: spans several 32³ sections. */
function town() {
  const palette = [state('stone'), state('oak_planks'), state('glass'), state('lantern', { hanging: 'false', waterlogged: 'false' })], cells = [];
  for (let x = 0; x < 70; x++) for (let z = 0; z < 40; z++) {
    cells.push(block(x, 0, z));
    if ((x % 12 < 7) && (z % 12 < 7) && (x % 12 === 0 || x % 12 === 6 || z % 12 === 0 || z % 12 === 6)) for (let y = 1; y < 5; y++) cells.push(block(x, y, z, y === 2 ? 2 : 1));
  }
  cells.push(block(3, 1, 3, 3));
  return { palette, cells };
}
const sum = s => s.sections.reduce((n, x) => n + x.solid.quads + x.translucent.quads, 0);

test('sections: same quads as one mesh, unchanged input reuses everything, an edit rebuilds few sections', () => {
  const { palette, cells } = town();
  const whole = buildBlockMesh(cells, palette, r, slot, [0, 0, 0]);
  const a = buildSectionMesh(cells, palette, r, slot, [0, 0, 0]);
  assert.equal(a.quads, whole.quads); assert.equal(sum(a), whole.quads);
  assert.ok(a.sections.length >= 3, `${a.sections.length} sections`);
  for (const s of a.sections) {
    const min = s.min;
    for (let q = 0; q < s.solid.quads; q++) {
      const c = s.cells[s.solid.quadCells[q]];
      for (let i = 0; i < 3; i++) assert.ok(c.position[i] >= min[i] && c.position[i] < min[i] + SECTION, 'cell inside its section');
    }
  }
  const same = buildSectionMesh(cells.slice().reverse(), palette, r, slot, [0, 0, 0], undefined, {}, a.sections);
  assert.equal(same.built, 0, 'cell order does not matter'); assert.equal(same.reused, a.sections.length);
  // Edit far from the lantern in the last section: replace one wall plank by stone.
  const i = cells.findIndex(c => c.position[0] === 66 && c.position[1] === 3 && c.position[2] === 0);
  const edited = cells.slice(); edited[i] = { ...edited[i], paletteIndex: 0 };
  const b = buildSectionMesh(edited, palette, r, slot, [0, 0, 0], undefined, {}, a.sections);
  assert.ok(b.built >= 1 && b.built < a.sections.length, `built ${b.built} of ${a.sections.length}`);
  const fresh = buildSectionMesh(edited, palette, r, slot, [0, 0, 0]);
  const key = s => s.sections.map(x => `${x.key}:${x.hash}:${x.solid.quads}`).sort().join('|');
  assert.equal(key(b), key(fresh), 'incremental result equals a fresh build');
  // A mark changes only its section; another origin rebuilds everything.
  const mark = c => c === edited[i] ? { color: '#ff0000', amount: 0.5 } : null;
  const marked = buildSectionMesh(edited, palette, r, slot, [0, 0, 0], mark, {}, b.sections);
  assert.equal(marked.built, 1);
  const moved = buildSectionMesh(edited, palette, r, slot, [1, 0, 0], undefined, {}, b.sections);
  assert.equal(moved.reused, 0);
  // Light reaching into a neighbour section rebuilds it too: a torch at a section border.
  const torch = [...cells, block(31, 1, 20, 3)];
  const lit = buildSectionMesh(torch, palette, r, slot, [0, 0, 0], undefined, {}, a.sections);
  assert.ok(lit.built >= 2, 'both sides of the border relit');
  assert.equal(key(lit), key(buildSectionMesh(torch, palette, r, slot, [0, 0, 0])));
});

test('graphics settings: defaults, validation and sun path', () => {
  assert.deepEqual(parseGraphics(null), DEFAULT_GRAPHICS);
  assert.deepEqual(parseGraphics({ mode: 'night', ao: false, hour: 99, spawn: true, quality: 'nope' }), { ...DEFAULT_GRAPHICS, mode: 'night', ao: false, hour: 18, spawn: true });
  assert.equal(parseGraphics({ mode: 'disco' }).mode, 'day');
  const rise = sunDirection(6), noon = sunDirection(12), set = sunDirection(18);
  assert.ok(rise[0] > 0.8 && set[0] < -0.8, 'east at sunrise, west at sunset');
  assert.ok(noon[1] > 0.9 && Math.abs(noon[0]) < 1e-9, 'high at noon');
  for (const d of [rise, noon, set]) assert.ok(Math.abs(Math.hypot(...d) - 1) < 1e-9);
});

test('translucent quads are drawn back to front from the eye', async () => {
  const { sortQuads } = await import('../../../apps/web/src/blockmodels/threeMesh.ts');
  // Three unit quads at z = 0, 5, 10.
  const positions = new Float32Array(3 * 12);
  [0, 5, 10].forEach((z, q) => [[0, 0], [1, 0], [1, 1], [0, 1]].forEach(([x, y], k) => positions.set([x, y, z], (q * 4 + k) * 3)));
  const out = new Uint32Array(18);
  sortQuads(positions, 3, [0, 0, 20], out);
  assert.deepEqual([out[0], out[6], out[12]], [0, 4, 8], 'eye at z=20: z=0 first, z=10 last');
  sortQuads(positions, 3, [0, 0, -20], out);
  assert.deepEqual([out[0], out[6], out[12]], [8, 4, 0]);
  assert.deepEqual([...out.slice(0, 6)], [8, 9, 10, 8, 10, 11], 'two triangles per quad');
});
