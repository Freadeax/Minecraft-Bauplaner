// MAP-07: gedrehte und gespiegelte Projektlagen auf der Weltkarte – dieselbe Regel wie Placement.java der Mod.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyOperation, createProject, newInstance, createSampleLibrary, resolveProject, buildWorldMap, createPlacement, worldOperation, checkWorldPlacement,
  turnVector, unturnVector, placeToWorld, worldToProject, turnBounds, placedBounds, turnState, turnPayload, withTurn, turnInPlace, turnOf, isTurned, turnLabel,
  compareHologram, livePlacementOf, planUploadQuery, deviationColumns, anchorOf, worldPos, runCoords, terrainBox, teamServerFile, createTeam, teamView, placementsJson,
} from '../../../dist/domain/src/index.js';

const lib = await createSampleLibrary();
const versions = new Map(lib.versions.map(v => [v.id, v]));
const latest = id => lib.versions.find(v => v.assetId === id).id;
const at = (assetId, name, position) => newInstance({ assetVersionId: latest(assetId), name, transform: { position, quarterTurns: 0, mirrorX: false } });
const run = (project, op) => applyOperation(project, op).project;
const build = (name, ...instances) => run(createProject({ name, id: `p_${name}` }), { kind: 'batch', label: 't', operations: instances.map(instance => ({ kind: 'instance.add', instance })) });
const ALL = [0, 1, 2, 3].flatMap(turns => [false, true].map(mirror => ({ turns, mirror })));

/** The mod's Placement.toWorld, written out once more as the reference. */
function modToWorld(px, py, pz, { x, y, z, turns, mirror }) {
  let rx = mirror ? -px : px, rz = pz;
  for (let i = 0; i < turns; i++) { const t = rx; rx = -rz; rz = t; }
  return [x + rx, y + py, z + rz];
}

test('Drehregel wie die Mod: Vektoren, Umkehrung, Grenzen', () => {
  assert.deepEqual(turnVector([1, 0, 0], { turns: 1, mirror: false }), [0, 0, 1], 'Osten → Süden bei einer Drehung im Uhrzeigersinn');
  assert.deepEqual(turnVector([0, 0, -1], { turns: 1, mirror: false }), [1, 0, 0], 'Norden → Osten');
  assert.deepEqual(turnVector([2, 5, 0], { turns: 0, mirror: true }), [-2, 5, 0]);
  const pts = [[0, 0, 0], [3, 1, -2], [-4, 7, 9], [1, -3, 1]];
  for (const t of ALL) for (const p of pts) {
    const anchor = { x: 100, y: 64, z: -20, ...t };
    assert.deepEqual(placeToWorld(p, { origin: [100, 64, -20], ...(t.turns && { turns: t.turns }), ...(t.mirror && { mirror: true }) }), modToWorld(...p, anchor));
    assert.deepEqual(unturnVector(turnVector(p, t), t), p);
    assert.deepEqual(worldToProject(placeToWorld(p, { origin: [5, 6, 7], turns: t.turns || undefined, mirror: t.mirror || undefined }), { origin: [5, 6, 7], turns: t.turns || undefined, mirror: t.mirror || undefined }), p);
  }
  // Bounds of turned cells = turned bounds.
  const b = { min: [-1, 0, 2], maxExclusive: [3, 4, 5] };
  for (const t of ALL) {
    const cells = [];
    for (let x = -1; x < 3; x++) for (let z = 2; z < 5; z++) cells.push(turnVector([x, 0, z], t));
    const tb = turnBounds(b, t);
    assert.deepEqual([tb.min[0], tb.min[2], tb.maxExclusive[0], tb.maxExclusive[2]],
      [Math.min(...cells.map(c => c[0])), Math.min(...cells.map(c => c[2])), Math.max(...cells.map(c => c[0])) + 1, Math.max(...cells.map(c => c[2])) + 1], JSON.stringify(t));
    assert.deepEqual([tb.min[1], tb.maxExclusive[1]], [0, 4]);
  }
  assert.equal(turnLabel({ turns: 0, mirror: false }), 'ungedreht');
  assert.equal(turnLabel({ turns: 1, mirror: true }), 'gespiegelt, 90° im Uhrzeigersinn');
});

test('Weltlage: Prüfung, withTurn lässt 0/false weg, Drehen an Ort und Stelle', () => {
  const p = createPlacement([10, 64, 20]);
  assert.throws(() => checkWorldPlacement({ ...p, turns: 0 }), /Drehung/);
  assert.throws(() => checkWorldPlacement({ ...p, turns: 4 }), /Drehung/);
  assert.throws(() => checkWorldPlacement({ ...p, mirror: false }), /Spiegelung/);
  assert.deepEqual(checkWorldPlacement({ ...p, turns: 3, mirror: true }).turns, 3);
  assert.equal(JSON.stringify(withTurn(withTurn(p, { turns: 1, mirror: true }), { turns: 0, mirror: false })), JSON.stringify(p), 'zurückgedreht = alte Lage, Feld für Feld');
  assert.equal(isTurned(p), false);
  // In place: the north-west corner of the footprint stays; four turns or two mirrors bring the placement back.
  const local = { min: [0, 0, 0], maxExclusive: [5, 8, 3] };
  let q = p;
  for (let i = 1; i <= 4; i++) {
    q = turnInPlace(q, local, { turns: 1 });
    const b = placedBounds(local, q);
    assert.deepEqual([b.min[0], b.min[2]], [10, 20], `Nordwestecke bleibt nach ${i} Drehungen`);
    assert.deepEqual([b.maxExclusive[0] - b.min[0], b.maxExclusive[2] - b.min[2]], i % 2 ? [3, 5] : [5, 3]);
  }
  assert.equal(JSON.stringify(q), JSON.stringify(p));
  const m = turnInPlace(turnInPlace(p, local, { turns: 1 }), local, { mirror: true });
  assert.deepEqual(turnOf(m), { turns: 3, mirror: true });
  // Mirroring in the world swaps east and west of what stands there.
  const w = turnInPlace(p, local, { turns: 1 }), b0 = placedBounds(local, w), b1 = placedBounds(local, m);
  assert.deepEqual(b0, b1, 'gleiche Fläche');
  const east = placeToWorld([4, 0, 0], w), mirrored = placeToWorld([4, 0, 0], m);
  assert.equal(mirrored[0], b0.min[0] + b0.maxExclusive[0] - 1 - east[0]);
  assert.equal(mirrored[2], east[2]);
  assert.equal(JSON.stringify(turnInPlace(turnInPlace(p, local, { mirror: true }), local, { mirror: true })), JSON.stringify(p));
});

test('Weltkarte zeichnet gedrehte Projekte mit gedrehten Blockzuständen und erkennt Überschneidungen', () => {
  const tower = build('Turm', at('sample_tower', 'Turm', [0, 0, 0]));
  const world = resolveProject(tower, versions).world;
  const plain = run(tower, worldOperation(createPlacement([100, 64, 0])));
  const turned = run(tower, worldOperation(withTurn(createPlacement([100, 64, 0]), { turns: 1, mirror: false })));
  const a = buildWorldMap([plain], versions), b = buildWorldMap([turned], versions);
  assert.equal(a.cells.length, b.cells.length);
  const t = { turns: 1, mirror: false };
  assert.deepEqual(b.entries[0].worldBounds, placedBounds(world.bounds, turned.world));
  const want = new Set(world.cells.filter(c => c.kind === 'block').map(c => placeToWorld(c.position, turned.world).join(',')));
  assert.ok(b.cells.every(c => want.has(c.position.join(','))), 'jede Zelle an der gedrehten Stelle');
  // Directional states turn with the placement (same rule as the voxel core and the mod).
  const facing = world.palette.find(s => s.properties.facing === 'north');
  if (facing) assert.ok(b.palette.some(s => s.id === facing.id && s.properties.facing === 'east'), 'nach Norden wird nach Osten');
  assert.equal(turnState({ id: 'minecraft:oak_stairs', properties: { facing: 'north', half: 'bottom', shape: 'straight', waterlogged: 'false' } }, t).properties.facing, 'east');
  // turnPayload: the same cells for code that only adds the origin.
  const tp = turnPayload(world, t);
  assert.deepEqual(tp.bounds, turnBounds(world.bounds, t));
  assert.equal(tp.cells.length, world.cells.length);
  // A turned and an unturned copy at the same anchor overlap; turned back they are identical.
  const other = build('Turm2', at('sample_tower', 'Turm', [0, 0, 0]));
  const both = buildWorldMap([turned, run(other, worldOperation(createPlacement([100, 64, 0])))], versions);
  assert.equal(both.collisions.length, 1);
  const same = buildWorldMap([plain, run(other, worldOperation(createPlacement([100, 64, 0])))], versions);
  assert.equal(same.collisions[0].cells, 0, 'ungedreht gleich');
  assert.match(placementsJson(b), /"turns": 1/);
  assert.doesNotMatch(placementsJson(a), /"turns"/);
});

test('Mod und Server: Hologramm-Vergleich, Plan mit Drehung, Teamdatei mit gedrehten Abschnittsboxen', () => {
  const holo = { planFile: 'turm.schem', name: 'Turm', projectId: 'p', revisionNumber: 1, placement: { dimension: 'minecraft:overworld', x: 100, y: 64, z: -20, turns: 1, mirror: true }, visible: true, box: [0, 0, 0, 1, 1, 1], counts: { ok: 0, state: 0, missing: 0, wrong: 0, unknown: 0 }, total: 0 };
  const plain = { world: createPlacement([100, 64, -20]) };
  assert.equal(compareHologram(holo, plain), 'turned');
  const turned = { world: withTurn(plain.world, { turns: 1, mirror: true }) };
  assert.equal(compareHologram(holo, turned), 'same');
  assert.equal(compareHologram({ ...holo, placement: { ...holo.placement, turns: 5 } }, turned), 'same', 'Mod normalisiert Drehungen modulo 4');
  assert.equal(compareHologram({ ...holo, placement: { ...holo.placement, x: 0 } }, turned), 'moved');
  assert.deepEqual(livePlacementOf(turned.world), { dimension: 'minecraft:overworld', x: 100, y: 64, z: -20, turns: 1, mirror: true });
  assert.match(planUploadQuery('turm.schem', livePlacementOf(turned.world)), /turns=1&mirror=true/);

  const team = createTeam({ name: 'T', founder: 'a', teamId: 'team_turn0001', at: '2026-11-01T08:00:00Z' });
  const sections = [{ id: 's1', name: 'Turm', members: [{ instanceId: 'i1' }] }];
  const steps = [{ instanceId: 'i1', layer: 0, bounds: { min: [0, 0, 0], maxExclusive: [4, 1, 2] } }];
  const ctx = { sections: [{ id: 's1', name: 'Turm' }], builders: [] };
  const file = teamServerFile({ team, view: teamView(team, ctx), projectName: 'P', sections, steps, origin: [100, 64, -20], dimension: 'minecraft:overworld', turns: 1 });
  // Cells x 0..3, z 0..1 turned once: x' = −z ∈ [−1, 0], z' = x ∈ [0, 3].
  assert.deepEqual(file.sections[0].boxes[0], [99, 64, -20, 100, 64, -17]);
  const flat = teamServerFile({ team, view: teamView(team, ctx), projectName: 'P', sections, steps, origin: [100, 64, -20], dimension: 'minecraft:overworld' });
  assert.deepEqual(flat.sections[0].boxes[0], [100, 64, -20, 103, 64, -19], 'ungedreht wie bisher');
});

test('Baustand, Bauführung und Geländebox rechnen mit der Drehung', () => {
  const placement = withTurn(createPlacement([100, 64, -20]), { turns: 2, mirror: false });
  const check = { deviations: new Map([['3,0,1', { position: [3, 0, 1], verdict: 'missing' }]]) };
  assert.deepEqual(deviationColumns(check, placement).map(c => [c.x, c.z]), [[97, -21]]);
  assert.deepEqual(deviationColumns(check, [100, 64, -20]).map(c => [c.x, c.z]), [[103, -19]], 'Vektor wie bisher');
  const anchor = anchorOf({ world: placement });
  assert.equal(anchor.turns, 2);
  assert.deepEqual(worldPos([3, 0, 1], anchor), [97, 64, -21]);
  assert.equal(runCoords({ x0: 0, x1: 3, z0: 1, z1: 1, y: 0 }, anchor).abs, 'X 97…100 · Y 64 · Z -21');
  assert.equal(runCoords({ x0: 0, x1: 3, z0: 1, z1: 1, y: 0 }, anchorOf({ world: createPlacement([100, 64, -20]) })).abs, 'X 100…103 · Y 64 · Z -19');
  const box = terrainBox({ min: [0, 0, 0], maxExclusive: [4, 5, 2] }, placement, 8);
  assert.deepEqual(box, { min: [97, 56, -21], maxExclusive: [101, 69, -19] });
  assert.deepEqual(terrainBox({ min: [0, 0, 0], maxExclusive: [4, 5, 2] }, [100, 64, -20], 8), { min: [100, 56, -20], maxExclusive: [104, 69, -18] });
});
