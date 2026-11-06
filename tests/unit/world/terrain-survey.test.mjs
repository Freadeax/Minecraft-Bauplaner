// Geländeaufnahmen, Anlagen auf Gelände und Türen zum Weg (TERRAIN-01).
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { python } from '../../../scripts/dev/python.mjs';
import { bytesRegionSource, collectWorldFiles, terrainColumns, sampleWorld } from '../../../dist/formats/src/index.js';
import {
  ANLAGEN, SURFACE_SKIP_IDS, SURVEY_UNKNOWN, applyOperation, anlageById, anlageIntoProject, buildRestore, checkIntegrity, checkProjectRecord, checkTerrainReference, columnAt, columnBases,
  createBackup, createBuildingLibrary, createPlacement, createProject, createSurvey, decodeSurvey, describeOperation, encodeSurvey, entranceOf, estimateEarthwork, execute, EMPTY_HISTORY,
  facesSide, findTerrainSpot, fitAnlageToTerrain, isGroundId, planAnlage, planRestore, previewAnlage, readBackup, resolveProject, surveyDisplayCells, surveyFile, surveyStats, turnedSide, turnsToFace, undo,
} from '../../../dist/domain/src/index.js';
import { createPayload } from '../../../dist/voxel/src/index.js';

/** Payload from [{position, state}] (palette and bounds derived). */
function payloadOf(list) {
  const palette = [], key = st => JSON.stringify(st), index = new Map();
  const cells = list.map(c => { let i = index.get(key(c.state)); if (i === undefined) { i = palette.length; palette.push(c.state); index.set(key(c.state), i); } return { position: c.position, kind: 'block', paletteIndex: i }; });
  const min = [0, 1, 2].map(k => Math.min(...list.map(c => c.position[k]))), max = [0, 1, 2].map(k => Math.max(...list.map(c => c.position[k])) + 1);
  return createPayload({ schemaVersion: 1, profileId: 'test', bounds: { min, maxExclusive: max }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette, cells, blockEntities: [] });
}

const buildings = await createBuildingLibrary();
const versions = new Map(buildings.versions.map(v => [v.id, v]));
const lib = { assets: buildings.assets, versions };

/** Survey from a height function h(x, z) (null = unknown), grass on top; `water` columns get two blocks of water. */
function surveyOf(area, h, water = () => false) {
  const n = area.width * area.length;
  const ground = new Int16Array(n), surface = new Int16Array(n), gb = new Uint16Array(n), sb = new Uint16Array(n);
  for (let z = 0; z < area.length; z++) for (let x = 0; x < area.width; x++) {
    const i = x + z * area.width, wx = area.minX + x, wz = area.minZ + z, g = h(wx, wz);
    if (g === null) { ground[i] = SURVEY_UNKNOWN; surface[i] = SURVEY_UNKNOWN; continue; }
    ground[i] = g; gb[i] = 1;
    if (water(wx, wz)) { surface[i] = g + 2; sb[i] = 2; } else { surface[i] = g; sb[i] = 1; }
  }
  return createSurvey({ ...area, ground, surface, groundBlock: gb, surfaceBlock: sb, ids: ['?', 'minecraft:grass_block', 'minecraft:water'] },
    { dimension: 'minecraft:overworld', readAt: '2026-11-02T06:00:00.000Z' });
}

test('terrain columns from real region data match the hand-built hillside (ground, surface, water, tree, plants, unknown)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'bauplaner-terrain-'));
  const r = spawnSync(python, ['-I', '-X', 'utf8', fileURLToPath(new URL('../../../scripts/fixtures/make_terrain_fixture.py', import.meta.url)), dir], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const expected = JSON.parse(readFileSync(join(dir, 'terrain-expected.json'), 'utf8'));
  const files = collectWorldFiles([bytesRegionSource('r.2.0.mca', new Uint8Array(readFileSync(join(dir, 'r.2.0.mca'))))]).files;
  // One chunk row more to the south than the fixture has: those columns must stay unknown.
  const area = { ...expected.area, length: expected.area.length + 16 };
  const c = await terrainColumns(files, area, { isGround: isGroundId, skip: SURFACE_SKIP_IDS });
  for (const e of expected.columns) {
    const i = (e.x - area.minX) + (e.z - area.minZ) * area.width;
    assert.equal(c.ground[i], e.ground, `Boden ${e.x}/${e.z}`);
    assert.equal(c.ids[c.groundBlock[i]], 'minecraft:grass_block');
    assert.equal(c.surface[i], e.surface, `Oberfläche ${e.x}/${e.z}`);
    assert.equal(c.ids[c.surfaceBlock[i]], e.surfaceId, `Oberflächenblock ${e.x}/${e.z}`);
  }
  for (let z = 80; z < 96; z++) for (let x = 0; x < area.width; x++) assert.equal(c.surface[x + z * area.width], SURVEY_UNKNOWN);
  // Independent cross-check of a strip against the dense 3D sample of the same files.
  const strip = { min: [1056, 40, 16], maxExclusive: [1064, 90, 24] };
  const sample = await sampleWorld(files, strip);
  for (let z = 16; z < 24; z++) for (let x = 1056; x < 1064; x++) {
    let top = null;
    for (let y = 89; y >= 40 && top === null; y--) { const id = sample.palette[sample.data[(x - 1056) + (z - 16) * 8 + (y - 40) * 64]].id; if (isGroundId(id)) top = y; }
    assert.equal(c.ground[(x - area.minX) + z * area.width], top, `Querprüfung ${x}/${z}`);
  }
  // As a survey: stored, re-read, same content address.
  const s = createSurvey(c, { dimension: 'minecraft:overworld', readAt: '2026-11-02T06:00:00.000Z', regions: ['r.2.0.mca'] });
  const stats = surveyStats(s);
  assert.equal(stats.known, expected.columns.length);
  assert.deepEqual(stats.groundRange, [62, 83]);
  const col = columnAt(s, 1027, 50);
  assert.equal(col.fluid, true); assert.equal(col.ground, 62); assert.equal(col.surface, 64);
  assert.equal(columnAt(s, 1027, 85), null, "unbekannt bleibt unbekannt");
});

test('survey file: exact round trip, stable content address, damaged files are refused', async () => {
  const s = surveyOf({ minX: -7, minZ: 3, width: 9, length: 5 }, (x, z) => (x === 0 && z === 4 ? null : 60 + x - z), (x) => x === -7);
  const bytes = encodeSurvey(s), back = decodeSurvey(bytes);
  for (const k of ['surface', 'surfaceBlock', 'ground', 'groundBlock']) assert.deepEqual([...back[k]], [...s[k]], k);
  for (const k of ['minX', 'minZ', 'width', 'length', 'dimension', 'readAt']) assert.equal(back[k], s[k]);
  assert.deepEqual(back.ids, s.ids);
  const a = await surveyFile(s, 'Hang'), b = await surveyFile(back, 'Hang');
  assert.equal(a.reference.sha256, b.reference.sha256);
  assert.equal(a.original.mediaType, 'application/x-bauplaner-terrain');
  assert.equal(a.reference.known, 44);
  assert.throws(() => decodeSurvey(bytes.subarray(0, bytes.length - 2)), /Datengröße/);
  const bad = bytes.slice(); bad[0] = 0; assert.throws(() => decodeSurvey(bad), /keine Build-Studio-Geländedatei/);
  assert.throws(() => createSurvey({ minX: 0, minZ: 0, width: 600, length: 1, ground: new Int16Array(600), surface: new Int16Array(600), groundBlock: new Uint16Array(600), surfaceBlock: new Uint16Array(600), ids: ['?'] }, { dimension: 'minecraft:overworld' }), /Breite und Länge/);
  assert.throws(() => checkTerrainReference({ ...a.reference, sha256: 'x' }), /Hash/);
  assert.throws(() => checkTerrainReference({ ...a.reference, groundRange: [5, 1] }), /Höhenbereich/);
});

test('terrain.set is undoable, kept in backups with its original and reported when the original is missing', async () => {
  const s = surveyOf({ minX: 0, minZ: 0, width: 4, length: 4 }, () => 64);
  const { original, reference } = await surveyFile(s, 'Bauplatz');
  let project = createProject({ name: 'Bauplatz' });
  project = applyOperation(project, { kind: 'world.set', world: createPlacement([0, 65, 0]) }).project;
  const r = execute(project, EMPTY_HISTORY, { kind: 'terrain.set', terrain: reference, label: 'Geländeaufnahme gespeichert' });
  assert.equal(r.project.terrain.sha256, reference.sha256);
  assert.equal(describeOperation({ kind: 'terrain.set', terrain: null }), 'Geländeaufnahme entfernt');
  assert.equal(undo(r.project, r.history).project.terrain, undefined);
  assert.throws(() => applyOperation(project, { kind: 'terrain.set', terrain: { ...reference, schemaVersion: 2 } }), /Schemaversion/);
  checkProjectRecord(r.project);
  const source = { projects: [r.project], assets: [], versions: new Map(), getOriginal: async sha => sha === original.sha256 ? original : null };
  const backup = await readBackup(JSON.stringify(await createBackup(source, 'all')));
  assert.equal(backup.originals.length, 1);
  assert.deepEqual(decodeSurvey(backup.originals[0].bytes).ground, s.ground);
  assert.deepEqual(backup.missingOriginals, []);
  const plan = planRestore(backup, { projects: [], assets: [], versions: new Map(), originalHashes: new Set() });
  assert.equal(buildRestore(plan).originals.length, 1);
  const report = await checkIntegrity({ projects: [r.project], assets: [], versions: [], originalHashes: [] });
  assert.ok(report.findings.some(f => f.code === 'ORIGINAL_MISSING' && /Geländeaufnahme/.test(f.message)));
  assert.throws(() => checkProjectRecord({ ...r.project, terrain: { ...reference, area: { ...reference.area, width: 0 } } }), /Breite/);
});

test('earthwork estimate against hand counts: carried, hanging with fill, buried with cut, water, unknown, suggestion', () => {
  // Ground 64 everywhere, a 2-deep dip at x=2, a hill (66) at x=3, water at x=4, unknown at x=5.
  const s = surveyOf({ minX: 0, minZ: 0, width: 6, length: 1 }, x => x === 5 ? null : x === 2 ? 62 : x === 3 ? 66 : 64, x => x === 4);
  // Base layer at y 65 for x 0–4, plus an overhang column at x=5? no: x=5 unknown; x 0 has its lowest block higher (balcony, y 67).
  const cols = [{ x: 0, z: 0, y: 67 }, { x: 1, z: 0, y: 65 }, { x: 2, z: 0, y: 65 }, { x: 3, z: 0, y: 65 }, { x: 4, z: 0, y: 65 }, { x: 5, z: 0, y: 65 }];
  const e = estimateEarthwork(cols, s);
  assert.equal(e.baseY, 65);
  assert.equal(e.unknown, 1);
  assert.equal(e.carried, 2, 'x1 and x4 stand on ground 64');
  assert.equal(e.hanging, 1); assert.equal(e.fill, 2); assert.equal(e.maxGap, 2);
  assert.equal(e.buried, 1); assert.equal(e.cut, 2, 'hill 66 reaches two blocks into y 65');
  assert.equal(e.water, 1);
  assert.deepEqual(e.ground, { min: 62, max: 66, median: 64 });
  assert.equal(e.suggestedShift, 0);
  assert.equal(estimateEarthwork(cols.map(c => ({ ...c, y: c.y + 3 })), s).suggestedShift, -3);
  // columnBases: lowest block per column, shifted.
  assert.deepEqual(columnBases([{ position: [0, 3, 0], kind: 'block' }, { position: [0, 1, 0], kind: 'block' }, { position: [1, 0, 0], kind: 'air' }], [10, 0, 0]), [{ x: 10, z: 0, y: 1 }]);
});

test('display cells: one top block per known column, skirts down slopes, planned blocks win', () => {
  const s = surveyOf({ minX: 0, minZ: 0, width: 3, length: 1 }, x => x === 2 ? null : 64 + 3 * x);
  const d = surveyDisplayCells([s], { maxCells: 100, skirt: 4 });
  const cells = []; for (let i = 0; i < d.count; i++) cells.push([...d.cells.subarray(i * 4, i * 4 + 3)].join(','));
  assert.deepEqual(cells.sort(), ['0,64,0', '1,65,0', '1,66,0', '1,67,0'].sort(), 'column 1 is skirted down to above its lower neighbour');
  const occupied = surveyDisplayCells([s], { maxCells: 100, occupied: (x, y) => x === 1 && y === 67 });
  assert.equal(occupied.count, 3);
  assert.equal(surveyDisplayCells([s], { maxCells: 2 }).skipped, 1, 'over budget: left out, not cut');
});

test('entrance rule: lowest storey, nearest edge, fewest turns; turns follow the voxel core', () => {
  const door = (x, y, z) => [{ position: [x, y, z], state: { id: 'minecraft:oak_door', properties: { facing: 'south', half: 'lower', hinge: 'left', open: 'false', powered: 'false' } } },
    { position: [x, y + 1, z], state: { id: 'minecraft:oak_door', properties: { facing: 'south', half: 'upper', hinge: 'left', open: 'false', powered: 'false' } } }];
  const wall = [];
  for (let x = 0; x < 7; x++) for (let z = 0; z < 5; z++) wall.push({ position: [x, 0, z], state: { id: 'minecraft:stone', properties: {} } });
  const house = payloadOf([...wall, ...door(3, 1, 0), ...door(6, 5, 2)]);
  const e = entranceOf(house);
  assert.deepEqual(e.sides, ['north'], 'upper door at the east edge is another storey');
  assert.equal(e.kind, 'door'); assert.equal(e.depth, 0);
  assert.equal(turnsToFace(e, 'north'), 0);
  assert.equal(turnsToFace(e, 'south'), 2);
  const t = turnsToFace(e, 'east');
  assert.equal(turnedSide('north', t), 'east');
  assert.equal(facesSide(e, t, 'east'), true);
  const both = payloadOf([...wall, ...door(3, 1, 0), ...door(3, 1, 4)]);
  assert.deepEqual(entranceOf(both).sides, ['north', 'south']);
  assert.equal(turnsToFace(entranceOf(both), 'south'), 0, 'a door already facing the path needs no turn');
  const gate = payloadOf([...wall, { position: [0, 1, 2], state: { id: 'minecraft:oak_fence_gate', properties: { facing: 'west', in_wall: 'false', open: 'false', powered: 'false' } } }]);
  assert.deepEqual(entranceOf(gate).sides, ['west']); assert.equal(entranceOf(gate).kind, 'gate');
  assert.equal(entranceOf(payloadOf(wall)), null);
});

test('doors to the path: every catalog building with a door faces the main path; manual turns and the switch win', () => {
  let withDoor = 0, turned = 0;
  for (const a of ANLAGEN) {
    const plan = planAnlage(a, lib);
    for (const slot of plan.slots) {
      if (!a.path || slot.ensembleId) { assert.equal(slot.facesPath, null); continue; }
      if (!slot.entrance) { assert.equal(slot.facesPath, null); assert.notEqual(slot.turnSource, 'door'); continue; }
      withDoor++;
      assert.equal(slot.facesPath, true, `${a.id}/${slot.key}: Eingang zum Weg`);
      if (slot.turnSource === 'door' && slot.turns) turned++;
    }
  }
  assert.ok(withDoor >= 60, `${withDoor} Gebäude mit Tür`);
  assert.ok(turned >= 20, `${turned} automatisch gedreht`);
  const a = anlageById('anl_mittelalter');
  const off = planAnlage(a, lib, { doors: false });
  assert.ok(off.slots.every(sl => sl.turnSource !== 'door'));
  const kath = off.slots.find(sl => sl.key === 'm_kathedrale');
  assert.equal(kath.facesPath, false, 'without the rule the cathedral (north of the path) shows its door away from the path');
  const manual = planAnlage(a, lib, { turns: { m_kathedrale: 1 } }).slots.find(sl => sl.key === 'm_kathedrale');
  assert.equal(manual.turnSource, 'manual'); assert.equal(manual.turns, 1); assert.equal(manual.facesPath, false);
  assert.equal(planAnlage(anlageById('anl_nether'), lib).slots.every(sl => sl.facesPath === null), true, 'without a path there is nothing to face');
});

/** Hillside 260 × 200 at world -40/-90: ground rises 1 per 6 blocks eastwards; a flat plateau at 64 for x ≥ 120. */
const hill = surveyOf({ minX: -40, minZ: -90, width: 360, length: 200 }, x => x >= 120 ? 64 : 40 + Math.floor((x + 40) / 6));

test('Anlage on a hillside: terraces per unit on the median ground, one level for the path, links still mate, adoption keeps heights', () => {
  const plan = planAnlage(anlageById('anl_landleben'), lib);
  const origin = [0, 50, 0];
  const fit = fitAnlageToTerrain(plan, { survey: hill, origin, offset: [0, 0], mode: 'terrassen' });
  assert.equal(fit.complete, true);
  const path = fit.units.find(u => u.kind === 'path');
  const pathKeys = plan.placements.filter(p => p.kind === 'path').map(p => p.key);
  assert.deepEqual([...new Set(pathKeys.map(k => fit.heights.get(k)))].length, 1, 'all path modules share one height');
  for (const u of fit.units) {
    const g = u.estimate.ground;
    assert.ok(g, u.name);
    // Base layer one above the median ground of the unit's own footprint.
    assert.equal(u.estimate.suggestedShift, 0, `${u.name}: sits on its median ground`);
    if (u.kind !== 'path') assert.equal(u.stepToPath, u.baseY - path.baseY);
  }
  assert.ok(fit.totals.fill > 0 && fit.totals.cut > 0, 'a hillside needs fill and cut');
  assert.ok(fit.notes.some(n => /Treppe oder Rampe/.test(n)));
  // Preview with the heights: still no voxel conflicts, all path joints mate.
  const base = applyOperation(createProject({ name: 'Hang' }), { kind: 'world.set', world: createPlacement(origin) }).project;
  const preview = previewAnlage(plan, { base, offset: [0, 0], versions, heights: fit.heights });
  assert.equal(preview.conflicts.length, 0);
  assert.ok(preview.links.length > 0 && preview.links.every(l => l.state === 'ok'), 'Wegmodule verbunden');
  plan.placements.forEach((p, i) => assert.equal(preview.draft.instances[i].transform.position[1], p.transform.position[1] + fit.heights.get(p.key), p.key));
  const placed = applyOperation(base, anlageIntoProject(preview, base)).project;
  assert.deepEqual(placed.instances.map(i => i.transform.position[1]).sort((a, b) => a - b), preview.draft.instances.map(i => i.transform.position[1]).sort((a, b) => a - b));
  // One building by hand: its lowest block sits one above the median ground under it.
  const world = resolveProject(placed, versions).world;
  const house = fit.units.find(u => u.kind === 'building');
  const idx = plan.placements.findIndex(p => p.key === house.keys[0]);
  const own = resolveProject({ ...placed, instances: [placed.instances.find(i => i.name === plan.placements[idx].name)] }, versions).world;
  const cols = columnBases(own.cells, origin);
  const g = cols.map(c => columnAt(hill, c.x, c.z).ground).sort((a, b) => a - b);
  assert.equal(Math.min(...cols.map(c => c.y)), g[Math.floor(g.length / 2)] + 1);
  assert.ok(world.cells.length > 0);
  // One level: every unit gets the path's level.
  const flat = fitAnlageToTerrain(plan, { survey: hill, origin, offset: [0, 0], mode: 'eben' });
  assert.equal(new Set(flat.units.map(u => u.baseY)).size, 1);
  assert.ok(flat.totals.fill + flat.totals.cut > fit.totals.fill + fit.totals.cut, 'terraces need less earthwork than one level on a slope');
  // Outside the survey: unknown, planned height kept.
  const far = fitAnlageToTerrain(plan, { survey: hill, origin: [5000, 50, 0], offset: [0, 0] });
  assert.equal(far.complete, false); assert.ok([...far.heights.values()].every(v => v === 0));
});

test('flattest spot: the search moves the Anlage onto the plateau and stays inside the survey', () => {
  const plan = planAnlage(anlageById('anl_landleben'), lib);
  const origin = [0, 50, 0];
  const spot = findTerrainSpot(plan, { survey: hill, origin, mode: 'eben' });
  assert.ok(spot);
  assert.equal(spot.fit.totals.unknown, 0);
  assert.equal(spot.fit.totals.fill + spot.fit.totals.cut, 0, 'the plateau is flat');
  assert.ok(plan.extent.x0 + spot.offset[0] + origin[0] >= 120, 'on the plateau');
  const e = plan.extent;
  assert.ok(e.x0 + spot.offset[0] >= hill.minX && e.x1 + spot.offset[0] <= hill.minX + hill.width);
  assert.ok(e.z0 + spot.offset[1] >= hill.minZ && e.z1 + spot.offset[1] <= hill.minZ + hill.length);
  const tiny = surveyOf({ minX: 0, minZ: 0, width: 16, length: 16 }, () => 64);
  assert.equal(findTerrainSpot(plan, { survey: tiny, origin }), null, 'Anlage larger than the survey');
});
