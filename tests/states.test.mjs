import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transformBlockState, transformPayload, createPayload, stateCatalog, stateRuleFor, STATE_CATALOG_PROFILE } from '../dist/voxel/src/index.js';

// Independent helpers: everything below is derived from plain vector geometry,
// not from the catalogue implementation.
const T = (quarterTurns, mirrorX = false) => ({ position: [0, 0, 0], quarterTurns, mirrorX });
const ALL_T = [0, 1, 2, 3].flatMap(q => [T(q), T(q, true)]);
const V = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] }; // (x, z)
const name = v => Object.keys(V).find(k => V[k][0] === v[0] && V[k][1] === v[1]);
function geo([x, z], t) { if (t.mirrorX) x = -x; for (let i = 0; i < t.quarterTurns; i++) [x, z] = [-z, x]; return [x + 0, z + 0]; }
const cw = ([x, z]) => [-z + 0, x + 0], ccw = ([x, z]) => [z + 0, -x + 0];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const mc = (id, properties) => ({ id: `minecraft:${id}`, properties });
const run = (state, t) => transformBlockState(state, t);
const props = (state, t) => { const r = run(state, t); assert.equal(r.resolved, true, `${state.id} ${JSON.stringify(state.properties)} ${JSON.stringify(t)}`); return r.state.properties; };
function* combos(schema) {
  const keys = Object.keys(schema);
  function* rec(i, acc) { if (i === keys.length) { yield { ...acc }; return; } for (const v of schema[keys[i]]) yield* rec(i + 1, { ...acc, [keys[i]]: v }); }
  yield* rec(0, {});
}
const compose = (a, b) => T((((b.mirrorX ? -a.quarterTurns : a.quarterTurns) + b.quarterTurns) % 4 + 4) % 4, a.mirrorX !== b.mirrorX);
const representative = rule => mc(rule.ids[0].slice(10), {});

test('catalogue covers the required vanilla families with unique minecraft IDs', () => {
  const catalog = stateCatalog(), seen = new Set();
  for (const rule of catalog) for (const id of rule.ids) { assert.match(id, /^minecraft:[a-z0-9_]+$/); assert.ok(!seen.has(id), id); seen.add(id); }
  for (const id of ['oak_stairs', 'cut_copper_stairs', 'oak_log', 'stripped_warped_hyphae', 'quartz_pillar', 'barrel', 'observer', 'oak_door', 'iron_trapdoor',
    'waxed_oxidized_copper_door', 'oak_fence', 'glass_pane', 'iron_bars', 'cobblestone_wall', 'rail', 'powered_rail', 'red_bed', 'oak_sign', 'oak_wall_sign',
    'oak_hanging_sign', 'white_banner', 'black_wall_banner', 'player_head', 'creeper_wall_head', 'chest', 'stone_slab', 'water', 'crafter'])
    assert.ok(stateRuleFor(`minecraft:${id}`), id);
  assert.ok(seen.size > 500, `${seen.size} IDs`);
  assert.equal(stateRuleFor('minecraft:sunflower'), undefined);
  assert.match(STATE_CATALOG_PROFILE, /1\.21/);
});

test('concrete orientations match hand-derived expectations', () => {
  const cases = [
    // [state, transform, expected properties subset]
    [mc('oak_stairs', { facing: 'north', half: 'top', shape: 'outer_left', waterlogged: 'false' }), T(1), { facing: 'east', shape: 'outer_left', half: 'top' }],
    [mc('oak_stairs', { facing: 'east', half: 'bottom', shape: 'inner_right', waterlogged: 'false' }), T(0, true), { facing: 'west', shape: 'inner_left' }],
    [mc('oak_stairs', { facing: 'north', half: 'bottom', shape: 'outer_right', waterlogged: 'true' }), T(0, true), { facing: 'north', shape: 'outer_left', waterlogged: 'true' }],
    [mc('spruce_log', { axis: 'x' }), T(1), { axis: 'z' }], [mc('spruce_log', { axis: 'z' }), T(3), { axis: 'x' }],
    [mc('spruce_log', { axis: 'y' }), T(1, true), { axis: 'y' }], [mc('spruce_log', { axis: 'x' }), T(2, true), { axis: 'x' }],
    [mc('nether_portal', { axis: 'x' }), T(1), { axis: 'z' }],
    [mc('observer', { facing: 'up', powered: 'false' }), T(1, true), { facing: 'up' }],
    [mc('dispenser', { facing: 'west', triggered: 'false' }), T(1), { facing: 'north' }],
    [mc('hopper', { enabled: 'true', facing: 'east' }), T(0, true), { facing: 'west' }],
    [mc('oak_door', { facing: 'south', half: 'upper', hinge: 'left', open: 'true', powered: 'false' }), T(1), { facing: 'west', hinge: 'left', half: 'upper', open: 'true' }],
    [mc('oak_door', { facing: 'north', half: 'lower', hinge: 'left', open: 'false', powered: 'false' }), T(0, true), { facing: 'north', hinge: 'right' }],
    [mc('oak_trapdoor', { facing: 'east', half: 'top', open: 'true', powered: 'false', waterlogged: 'false' }), T(2), { facing: 'west', half: 'top' }],
    [mc('oak_fence', { north: 'true', east: 'true', south: 'false', west: 'false', waterlogged: 'false' }), T(1), { north: 'false', east: 'true', south: 'true', west: 'false' }],
    [mc('stone_brick_wall', { north: 'tall', east: 'low', south: 'none', west: 'none', up: 'true', waterlogged: 'false' }), T(0, true), { north: 'tall', east: 'none', west: 'low', up: 'true' }],
    [mc('redstone_wire', { north: 'up', east: 'side', south: 'none', west: 'none', power: '7' }), T(3), { west: 'up', north: 'side', east: 'none', south: 'none', power: '7' }],
    [mc('rail', { shape: 'ascending_north', waterlogged: 'false' }), T(1), { shape: 'ascending_east' }],
    [mc('rail', { shape: 'north_east', waterlogged: 'false' }), T(1), { shape: 'south_east' }],
    [mc('rail', { shape: 'north_east', waterlogged: 'false' }), T(0, true), { shape: 'north_west' }],
    [mc('rail', { shape: 'south_west', waterlogged: 'false' }), T(2), { shape: 'north_east' }],
    [mc('powered_rail', { shape: 'north_south', powered: 'true', waterlogged: 'false' }), T(3), { shape: 'east_west', powered: 'true' }],
    [mc('red_bed', { facing: 'north', occupied: 'false', part: 'head' }), T(1, true), { facing: 'east', part: 'head' }],
    // rotation: 0 = south, 4 = west, 8 = north, 12 = east
    [mc('oak_sign', { rotation: '0', waterlogged: 'false' }), T(1), { rotation: '4' }],
    [mc('oak_sign', { rotation: '14', waterlogged: 'false' }), T(1), { rotation: '2' }],
    [mc('white_banner', { rotation: '4' }), T(0, true), { rotation: '12' }],
    [mc('white_banner', { rotation: '1' }), T(0, true), { rotation: '15' }],
    [mc('player_head', { powered: 'false', rotation: '8' }), T(0, true), { rotation: '8' }],
    [mc('oak_hanging_sign', { attached: 'false', rotation: '12', waterlogged: 'false' }), T(3), { rotation: '8', attached: 'false' }],
    [mc('oak_wall_sign', { facing: 'east', waterlogged: 'false' }), T(1), { facing: 'south' }],
    [mc('zombie_wall_head', { facing: 'west', powered: 'false' }), T(0, true), { facing: 'east' }],
    [mc('chest', { facing: 'north', type: 'left', waterlogged: 'false' }), T(0, true), { facing: 'north', type: 'right' }],
    [mc('chest', { facing: 'north', type: 'left', waterlogged: 'false' }), T(1), { facing: 'east', type: 'left' }],
    [mc('lever', { face: 'ceiling', facing: 'south', powered: 'true' }), T(1), { face: 'ceiling', facing: 'west' }],
    [mc('crafter', { crafting: 'false', orientation: 'north_up', triggered: 'false' }), T(1), { orientation: 'east_up' }],
    [mc('jigsaw', { orientation: 'down_east' }), T(0, true), { orientation: 'down_west' }],
    [mc('vine', { east: 'true', north: 'false', south: 'false', up: 'true', west: 'false' }), T(1), { south: 'true', east: 'false', up: 'true' }],
    [mc('oak_slab', { type: 'top', waterlogged: 'true' }), T(3, true), { type: 'top', waterlogged: 'true' }],
  ];
  for (const [state, t, expected] of cases) {
    const p = props(state, t);
    for (const [k, v] of Object.entries(expected)) assert.equal(p[k], v, `${state.id} ${JSON.stringify(state.properties)} ${JSON.stringify(t)} → ${k}`);
    assert.deepEqual(Object.keys(p).sort(), Object.keys(state.properties).sort());
  }
});

test('every catalogue state: four quarter turns and a double mirror are the identity, results stay in schema', () => {
  let checked = 0;
  for (const rule of stateCatalog()) for (const id of rule.ids) for (const properties of combos(rule.schema)) {
    const state = { id, properties };
    if (run(state, T(1)).resolved) {
      let s = state; for (let i = 0; i < 4; i++) s = run(s, T(1)).state;
      assert.deepEqual(s, state, `${id} 4×90°`);
    }
    for (const t of ALL_T) {
      const r = run(state, t);
      if (!r.resolved) { assert.equal(r.reason, 'unrepresentable', id); assert.deepEqual(r.state, state); continue; }
      for (const [k, v] of Object.entries(r.state.properties)) assert.ok(rule.schema[k].includes(v), `${id} ${k}=${v}`);
    }
    const once = run(state, T(0, true));
    if (once.resolved) assert.deepEqual(run(once.state, T(0, true)).state, state, `${id} mirror²`);
    checked++;
  }
  assert.ok(checked > 20000, `${checked} states`);
});

test('state transforms form the same group action as the geometry (composition)', () => {
  for (const rule of stateCatalog()) {
    const id = representative(rule).id;
    for (const properties of combos(rule.schema)) for (const a of ALL_T) for (const b of ALL_T) {
      const state = { id, properties }, step = run(state, a);
      if (!step.resolved) continue;
      const twice = run(step.state, b), direct = run(state, compose(a, b));
      assert.equal(twice.resolved, direct.resolved, id);
      if (direct.resolved) assert.deepEqual(twice.state, direct.state, `${id} ${JSON.stringify(properties)} ${JSON.stringify(a)}∘${JSON.stringify(b)}`);
    }
  }
});

test('independent geometric models: facing, rotation, stairs, doors, chests, rails, connections', () => {
  for (const t of ALL_T) {
    for (const f of Object.keys(V)) {
      const F = V[f], expectedF = name(geo(F, t));
      // stairs: occupied upper quadrants; left = counter-clockwise of facing
      const quadrants = (facing, shape) => {
        const Fv = V[facing], L = ccw(Fv), all = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        const back = all.filter(q => dot(q, Fv) > 0);
        const side = s => s === 'left' ? (q => dot(q, L) > 0) : (q => dot(q, L) < 0);
        if (shape === 'straight') return back;
        const [kind, hand] = shape.split('_');
        return kind === 'outer' ? back.filter(side(hand)) : [...back, ...all.filter(q => dot(q, Fv) < 0 && side(hand)(q))];
      };
      const key = qs => qs.map(q => q.join(',')).sort().join(' ');
      for (const shape of ['straight', 'inner_left', 'inner_right', 'outer_left', 'outer_right']) {
        const p = props(mc('stone_stairs', { facing: f, half: 'bottom', shape, waterlogged: 'false' }), t);
        assert.equal(key(quadrants(p.facing, p.shape)), key(quadrants(f, shape).map(q => geo(q, t))), `stairs ${f} ${shape} ${JSON.stringify(t)}`);
      }
      // doors: hinge corner = panel side (behind facing) plus left/right
      for (const hinge of ['left', 'right']) {
        const corner = (facing, h) => { const Fv = V[facing], L = ccw(Fv), s = h === 'left' ? 1 : -1; return [-Fv[0] + s * L[0] + 0, -Fv[1] + s * L[1] + 0]; };
        const p = props(mc('iron_door', { facing: f, half: 'lower', hinge, open: 'false', powered: 'false' }), t);
        assert.deepEqual(corner(p.facing, p.hinge), geo(corner(f, hinge), t), `door ${f} ${hinge}`);
      }
      // double chest partner: left ⇒ clockwise neighbour, right ⇒ counter-clockwise
      for (const type of ['left', 'right']) {
        const partner = (facing, ty) => (ty === 'left' ? cw : ccw)(V[facing]);
        const p = props(mc('trapped_chest', { facing: f, type, waterlogged: 'false' }), t);
        assert.deepEqual(partner(p.facing, p.type), geo(partner(f, type), t), `chest ${f} ${type}`);
      }
      assert.equal(props(mc('white_bed', { facing: f, occupied: 'false', part: 'foot' }), t).facing, expectedF);
      assert.equal(props(mc('barrel', { facing: f, open: 'false' }), t).facing, expectedF);
    }
    // rotation 0..15 as angle vectors
    for (let r = 0; r < 16; r++) {
      const vec = n => [-Math.sin(n * Math.PI / 8), Math.cos(n * Math.PI / 8)];
      const out = Number(props(mc('oak_sign', { rotation: String(r), waterlogged: 'false' }), t).rotation), want = geo(vec(r), t), got = vec(out);
      assert.ok(Math.abs(got[0] - want[0]) < 1e-9 && Math.abs(got[1] - want[1]) < 1e-9, `rotation ${r} ${JSON.stringify(t)} → ${out}`);
    }
    // rails as end points (+ raised end)
    const ends = shape => shape.startsWith('ascending_') ? [`^${shape.slice(10)}`] : shape.split('_');
    for (const shape of ['north_south', 'east_west', 'ascending_east', 'ascending_west', 'ascending_north', 'ascending_south', 'south_east', 'south_west', 'north_west', 'north_east']) {
      const out = props(mc('rail', { shape, waterlogged: 'false' }), t).shape;
      const moved = ends(shape).map(e => e.startsWith('^') ? `^${name(geo(V[e.slice(1)], t))}` : name(geo(V[e], t)));
      assert.deepEqual(ends(out).sort(), moved.sort(), `rail ${shape}`);
    }
    // connection arms
    const arms = { north: 'true', east: 'false', south: 'false', west: 'true', waterlogged: 'false' };
    const out = props(mc('glass_pane', arms), t);
    const moved = Object.keys(V).filter(d => arms[d] === 'true').map(d => name(geo(V[d], t))).sort();
    assert.deepEqual(Object.keys(V).filter(d => out[d] === 'true').sort(), moved);
  }
});

test('unknown, mismatching and unrepresentable states stay unresolved and unchanged', () => {
  const cases = [
    [mc('sunflower', { half: 'lower' }), 'unknown-block'],
    [{ id: 'example:machine', properties: { facing: 'north' } }, 'unknown-block'],
    [{ id: 'example:plain', properties: {} }, 'unknown-block'],
    [mc('oak_stairs', { facing: 'north', half: 'bottom', shape: 'straight' }), 'schema-mismatch'],
    [mc('oak_stairs', { facing: 'up', half: 'bottom', shape: 'straight', waterlogged: 'false' }), 'schema-mismatch'],
    [mc('oak_log', { axis: 'x', extra: 'y' }), 'schema-mismatch'],
    [mc('powered_rail', { shape: 'north_east', powered: 'false', waterlogged: 'false' }), 'schema-mismatch'],
    [mc('hopper', { enabled: 'true', facing: 'up' }), 'schema-mismatch'],
    [mc('oak_sign', { rotation: '16', waterlogged: 'false' }), 'schema-mismatch'],
    [mc('oak_door', {}), 'schema-mismatch'],
  ];
  for (const [state, reason] of cases) {
    const r = run(state, T(1, true));
    assert.equal(r.resolved, false, state.id); assert.equal(r.reason, reason, state.id); assert.deepEqual(r.state, state);
  }
  const glazed = mc('red_glazed_terracotta', { facing: 'north' });
  assert.deepEqual(props(glazed, T(1)), { facing: 'east' });
  const mirrored = run(glazed, T(1, true));
  assert.equal(mirrored.resolved, false); assert.equal(mirrored.reason, 'unrepresentable');
  // identity never needs a rule
  assert.equal(run({ id: 'example:machine', properties: { facing: 'north' } }, T(0)).resolved, true);
  assert.equal(run(mc('stone', {}), T(3, true)).resolved, true);
});

test('payload transform reports catalogue reasons per palette entry', () => {
  const payload = createPayload({ schemaVersion: 1, profileId: 'test:states', bounds: { min: [0, 0, 0], maxExclusive: [3, 1, 1] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0],
    palette: [mc('oak_stairs', { facing: 'north', half: 'bottom', shape: 'straight', waterlogged: 'false' }), mc('lime_glazed_terracotta', { facing: 'south' }), mc('oak_log', { axis: 'q' })],
    cells: [0, 1, 2].map(i => ({ position: [i, 0, 0], kind: 'block', paletteIndex: i })), blockEntities: [] });
  const r = transformPayload(payload, T(1, true));
  assert.equal(r.semanticsResolved, false);
  assert.deepEqual(r.issues.map(i => i.path), ['palette[1]', 'palette[2]']);
  assert.match(r.issues[0].message, /nicht als Blockzustand darstellbar/);
  assert.match(r.issues[1].message, /passen nicht exakt/);
  assert.equal(r.payload.palette[0].properties.facing, 'east');
  assert.ok(transformPayload(payload, T(2)).issues.length === 1);
});
