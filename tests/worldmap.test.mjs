import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyOperation, createProject, execute, undo, newInstance, resolveProject, createSampleLibrary, buildGuide, tickSteps, describeOperation,
  createBackup, readBackup, checkProjectRecord, buildLiveMapUrl, readLiveMapMarkerFile,
  checkWorldPlacement, createPlacement, worldOf, worldOperation, toWorld, chunkOf, regionOf, suggestPlacement, buildWorldMap, topViews,
  placementsJson, mapMarkers, liveMapPositionOf, footprintNeighbours, DIMENSIONS, PLACEMENT_GAP, DEFAULT_WORLD_Y, TERRAIN_NOTE,
} from '../dist/domain/src/index.js';

const lib = await createSampleLibrary();
const versions = new Map(lib.versions.map(v => [v.id, v]));
const latest = id => lib.versions.find(v => v.assetId === id).id;
const at = (assetId, name, position, quarterTurns = 0) => newInstance({ assetVersionId: latest(assetId), name, transform: { position, quarterTurns, mirrorX: false } });
const run = (project, op) => applyOperation(project, op).project;
const build = (name, ...instances) => run(createProject({ name, id: `p_${name}` }), { kind: 'batch', label: 't', operations: instances.map(instance => ({ kind: 'instance.add', instance })) });
const place = (project, origin, dimension) => run(project, worldOperation(createPlacement(origin, dimension)));
const key = p => p.join(',');

test('placement validation, undoable world.set and backup roundtrip', async () => {
  const p = build('Turm', at('sample_tower', 'Turm', [0, 0, 0]));
  assert.equal(worldOf(p), null);
  const placement = createPlacement([-120, 63, 4500], 'minecraft:overworld', 'Nordufer');
  const r = execute(p, { undo: [], redo: [] }, worldOperation(placement, 'Auf die Karte gesetzt'));
  assert.deepEqual(r.project.world.origin, [-120, 63, 4500]);
  assert.equal(r.history.undo[0].label, 'Auf die Karte gesetzt');
  assert.equal(describeOperation(worldOperation(null)), 'Von der Weltkarte genommen');
  assert.equal(undo(r.project, r.history).project.world, undefined, 'undo removes a placement that did not exist');
  const moved = run(r.project, worldOperation({ ...placement, origin: [0, 64, 0] }));
  assert.deepEqual(applyOperation(moved, { kind: 'world.set', world: placement }).inverse.world.origin, [0, 64, 0], 'inverse restores the previous origin');

  for (const [bad, message] of [
    [{ ...placement, origin: [0.5, 0, 0] }, /X muss/], [{ ...placement, origin: [30_000_000, 0, 0] }, /X muss/],
    [{ ...placement, origin: [0, 5000, 0] }, /Y muss/], [{ ...placement, origin: [0, 0] }, /X, Y und Z/],
    [{ ...placement, dimension: 'Oberwelt' }, /Dimension/], [{ ...placement, schemaVersion: 2 }, /Schemaversion/],
    [{ ...placement, hidden: 'nein' }, /ausgeblendet/], [{ ...placement, note: 'x'.repeat(301) }, /Notiz/],
  ]) assert.throws(() => checkWorldPlacement(bad), message);
  assert.throws(() => applyOperation(p, { kind: 'world.set', world: { ...placement, dimension: '' } }), /Dimension/);
  checkWorldPlacement({ ...placement, dimension: 'twilightforest:twilight_forest' });

  const backup = await readBackup(JSON.stringify(await createBackup({ projects: [r.project], assets: lib.assets, versions, getOriginal: async () => null }, 'project', [r.project.id])));
  assert.deepEqual(backup.projects[0].world, r.project.world);
  assert.throws(() => checkProjectRecord({ ...r.project, world: { ...placement, origin: [0, 0, 'z'] } }), /Weltlage/);
});

test('world coordinate = project coordinate + origin for every drawn cell', () => {
  const p = place(build('Burg', at('sample_tower', 'Turm', [0, 0, 0]), at('sample_wall', 'Mauer', [4, 0, 1])), [-37, 70, 1203]);
  const map = buildWorldMap([p], versions);
  const world = resolveProject(p, versions).world;
  const expected = new Set(world.cells.filter(c => c.kind === 'block').map(c => key(toWorld(c.position, [-37, 70, 1203]))));
  assert.equal(map.cells.length, expected.size);
  for (const c of map.cells) assert.ok(expected.has(key(c.position)), `cell ${key(c.position)} is a translated plan cell`);
  const e = map.entries[0];
  assert.deepEqual(e.worldBounds.min, toWorld(world.bounds.min, [-37, 70, 1203]));
  assert.deepEqual(map.bounds, e.worldBounds);
  assert.equal(e.blocks, map.cells.length);
  // Palette states survive the merge exactly.
  for (const c of map.cells) assert.equal(typeof map.palette[c.paletteIndex].id, 'string');
  assert.deepEqual(new Set(map.palette.map(s => s.id)), new Set(world.cells.filter(c => c.kind === 'block').map(c => world.palette[c.paletteIndex].id)));
  assert.equal(chunkOf(-37), -3); assert.equal(chunkOf(15), 0); assert.equal(chunkOf(16), 1); assert.equal(regionOf(-1), -1); assert.equal(regionOf(1203), 2);
  assert.match(TERRAIN_NOTE, /ungeprüft/);
});

test('dimensions, unplaced projects, hidden and empty entries', () => {
  const a = place(build('A', at('sample_tower', 'T', [0, 0, 0])), [0, 64, 0]);
  const b = place(build('B', at('sample_tower', 'T', [0, 0, 0])), [0, 64, 0], 'minecraft:the_nether');
  const c = build('C', at('sample_wall', 'M', [0, 0, 0]));
  const empty = place(createProject({ name: 'Leer', id: 'p_leer' }), [100, 64, 0]);
  const hidden = run(place(build('H', at('sample_tower', 'T', [0, 0, 0])), [50, 64, 0]), worldOperation({ ...createPlacement([50, 64, 0]), hidden: true }));
  const map = buildWorldMap([a, b, c, empty, hidden], versions);
  assert.deepEqual(map.entries.map(e => [e.name, e.skipped ?? 'drawn']), [['A', 'drawn'], ['Leer', 'empty'], ['H', 'hidden']]);
  assert.deepEqual(map.elsewhere, { 'minecraft:the_nether': 1 });
  assert.deepEqual(map.unplaced.map(u => u.name), ['C']);
  assert.ok(map.unplaced[0].localBounds, 'unplaced projects carry their size for the placement suggestion');
  assert.ok(map.owner.every(i => i === 0));
  const nether = buildWorldMap([a, b, c], versions, { dimension: 'minecraft:the_nether' });
  assert.deepEqual(nether.entries.map(e => e.name), ['B']);
  assert.equal(buildWorldMap([hidden], versions, { showHidden: true }).entries[0].skipped, undefined);
  assert.equal(DIMENSIONS.length, 3);
});

test('collisions between projects are voxel exact and never resolved', () => {
  const t = () => at('sample_tower', 'T', [0, 0, 0]);
  const a = place(build('A', t()), [0, 64, 0]);
  const same = place(build('Gleich', t()), [0, 64, 0]);
  const shifted = place(build('Versetzt', t()), [2, 64, 0]);
  const apart = place(build('Weit', t()), [100, 64, 100]);
  const map = buildWorldMap([a, same, shifted, apart], versions);
  const pair = (x, y) => map.collisions.find(c => c.a === `p_${x}` && c.b === `p_${y}`);
  const world = resolveProject(a, versions).world;
  assert.equal(pair('A', 'Gleich').cells, 0);
  assert.equal(pair('A', 'Gleich').identical, world.cells.length, 'identical plans overlap in every cell without a collision');
  assert.ok(pair('A', 'Versetzt').cells > 0);
  assert.equal(pair('A', 'Weit'), undefined, 'AABB pre-filter skips distant projects');
  // Hand count for the shifted pair: compare both translated footprints cell by cell.
  const footprint = o => new Map(world.cells.map(c => [key(toWorld(c.position, o)), c.kind === 'block' ? JSON.stringify(world.palette[c.paletteIndex]) : c.kind]));
  const fa = footprint([0, 64, 0]), fb = footprint([2, 64, 0]);
  let differ = 0, identical = 0;
  for (const [k, v] of fa) if (fb.has(k)) { if (fb.get(k) === v && v !== 'erase') identical++; else differ++; }
  assert.equal(pair('A', 'Versetzt').cells, differ);
  assert.equal(pair('A', 'Versetzt').identical, identical);
  const s = pair('A', 'Versetzt').sample;
  assert.ok(fa.has(key(s)) && fb.has(key(s)) && fa.get(key(s)) !== fb.get(key(s)), 'sample is a differing cell');
  // Both plans keep all their cells: nothing is decided by order.
  assert.equal(map.cells.filter((_, i) => map.owner[i] === 0).length, map.entries[0].blocks);
  assert.equal(map.cells.filter((_, i) => map.owner[i] === 2).length, map.entries[2].blocks);
  assert.deepEqual(footprintNeighbours(map, map.entries[0].worldBounds, 'p_A').map(e => e.name), ['Gleich', 'Versetzt']);
});

test('per-cell progress follows ticked guide steps', () => {
  let p = place(build('Fortschritt', at('sample_tower', 'T', [0, 0, 0])), [10, 64, 10]);
  const guide = buildGuide(p, resolveProject(p, versions));
  const first = guide.steps.filter(s => s.layer === 0);
  p = run(p, tickSteps(first, 'Erdgeschoss'));
  const map = buildWorldMap([p], versions), e = map.entries[0];
  assert.equal(e.stepsDone, first.length);
  assert.ok(e.share > 0 && e.share < 1);
  const done = new Set(first.flatMap(s => s.positions).map(pos => key(toWorld(pos, [10, 64, 10]))));
  map.cells.forEach((c, i) => assert.equal(map.progress[i], done.has(key(c.position)) ? 1 : 0, key(c.position)));
  // A changed geometry turns the ticked steps into "review".
  const changed = run(p, { kind: 'instance.transform', instanceId: p.instances[0].id, transform: { position: [0, 0, 0], quarterTurns: 1, mirrorX: false } });
  const after = buildWorldMap([changed], versions);
  assert.equal(after.entries[0].stepsReview, first.length);
  assert.equal(after.entries[0].stepsDone, 0);
  assert.ok(after.progress.includes(2) && !after.progress.includes(1));
});

test('display budget, suggestion, top view and determinism', () => {
  const a = place(build('A', at('sample_tower', 'T', [0, 0, 0])), [0, 64, 0]);
  const b = place(build('B', at('sample_tower', 'T', [0, 0, 0])), [40, 64, 0]);
  const blocks = buildWorldMap([a], versions).cells.length;
  const limited = buildWorldMap([a, b], versions, { maxCells: blocks + 1 });
  assert.deepEqual(limited.entries.map(e => e.skipped ?? 'drawn'), ['drawn', 'limit'], 'a project over budget is listed, never cut');
  assert.equal(limited.cells.length, blocks);

  const local = resolveProject(a, versions).world.bounds;
  assert.deepEqual(suggestPlacement([], local), [-local.min[0], DEFAULT_WORLD_Y - local.min[1], -local.min[2]]);
  const map = buildWorldMap([a, b], versions);
  const s = suggestPlacement(map.entries.map(e => e.worldBounds), local);
  const east = Math.max(...map.entries.map(e => e.worldBounds.maxExclusive[0]));
  assert.equal((s[0] + local.min[0]) % 16, 0, 'chunk aligned');
  assert.ok(s[0] + local.min[0] >= east + PLACEMENT_GAP);
  assert.equal(s[2] + local.min[2], Math.min(...map.entries.map(e => e.worldBounds.min[2])));

  const views = topViews(map);
  assert.equal(views.length, 2);
  for (const v of views) {
    const highest = new Map();
    map.cells.forEach((c, i) => { if (map.owner[i] !== v.entry) return; const k = `${c.position[0]},${c.position[2]}`; highest.set(k, Math.max(highest.get(k) ?? -Infinity, c.position[1])); });
    let filled = 0;
    for (let z = 0; z < v.depth; z++) for (let x = 0; x < v.width; x++) {
      const t = v.top[x + z * v.width]; if (t < 0) continue; filled++;
      const c = map.cells[t];
      assert.equal(c.position[1], highest.get(`${c.position[0]},${c.position[2]}`));
      assert.deepEqual([c.position[0], c.position[2]], [v.min[0] + x, v.min[1] + z]);
    }
    assert.equal(filled, [...highest.keys()].length);
  }
  assert.deepEqual(JSON.parse(placementsJson(map)).projects.map(p => p.id), ['p_A', 'p_B']);
  const again = buildWorldMap([a, b], versions);
  assert.deepEqual(again.cells, map.cells); assert.deepEqual(again.owner, map.owner); assert.deepEqual(again.collisions, map.collisions);
});

test('live map markers and links use the shared adapter', () => {
  const p = place(build('Burg', at('sample_tower', 'T', [0, 0, 0])), [-120, 63, 4500]);
  const map = buildWorldMap([p], versions);
  const pos = liveMapPositionOf(map.entries[0], 'world');
  const b = map.entries[0].worldBounds;
  assert.deepEqual([pos.x, pos.y, pos.z], [Math.floor((b.min[0] + b.maxExclusive[0]) / 2), b.maxExclusive[1], Math.floor((b.min[2] + b.maxExclusive[2]) / 2)]);
  const file = mapMarkers(map, 'world');
  assert.deepEqual(readLiveMapMarkerFile(JSON.parse(JSON.stringify(file))), file);
  assert.equal(file.markers[0].position.dimension, 'minecraft:overworld');
  const url = buildLiveMapUrl({ name: 'Server', urlTemplate: 'https://karte.example/#{world}:{x}:{y}:{z}:120:0:0.9:0:0:perspective' }, pos);
  assert.equal(url, `https://karte.example/#world:${pos.x}:${pos.y}:${pos.z}:120:0:0.9:0:0:perspective`);
});

test('live map links copied from the address bar become checked templates', async () => {
  const { liveMapTemplateFromLink, checkLiveMapTarget } = await import('../dist/domain/src/index.js');
  const pos = { x: -120, y: 80, z: 4500, world: 'world', dimension: 'minecraft:overworld' };
  const blue = liveMapTemplateFromLink('https://map.example.net/#overworld:12:64:-30:150:0.22:0.93:0:0:perspective');
  assert.equal(blue.kind, 'bluemap'); assert.equal(blue.world, 'overworld');
  assert.equal(blue.template, 'https://map.example.net/#{world}:{x}:{y}:{z}:150:0.22:0.93:0:0:perspective');
  checkLiveMapTarget({ name: 'BlueMap', urlTemplate: blue.template });
  assert.equal(buildLiveMapUrl({ name: 'B', urlTemplate: blue.template }, { ...pos, world: blue.world }), 'https://map.example.net/#overworld:-120:80:4500:150:0.22:0.93:0:0:perspective');
  const dyn = liveMapTemplateFromLink('http://mc.example.org:8123/?worldname=world&mapname=flat&zoom=6&x=10&y=64&z=-5');
  assert.equal(dyn.kind, 'dynmap');
  assert.equal(buildLiveMapUrl({ name: 'D', urlTemplate: dyn.template }, pos), 'http://mc.example.org:8123/?worldname=world&mapname=flat&zoom=6&x=-120&y=80&z=4500');
  const pl3x = liveMapTemplateFromLink('https://pl3x.example/?world=world&renderer=basic&zoom=3&x=0&z=0');
  assert.equal(pl3x.kind, 'world-x-z');
  assert.equal(buildLiveMapUrl({ name: 'P', urlTemplate: pl3x.template }, pos), 'https://pl3x.example/?world=world&renderer=basic&zoom=3&x=-120&z=4500');
  for (const bad of ['', 'ftp://x/?world=a&x=1&z=2', 'https://u:p@x.example/?world=a&x=1&z=2', 'https://x.example/', 'https://x.example/#world:1:2', 'https://x.example/?world=a&x=eins&z=2'])
    assert.equal(liveMapTemplateFromLink(bad), null, bad);
});
