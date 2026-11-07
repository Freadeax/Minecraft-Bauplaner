// Pläne auf geplantem Gelände (TERRAIN-03-S08, GROSS-01-S08): Basis-Wegenetz und Straßen als Landschaftsweg, Bauplätze eingeebnet, Kaimauern, Laternen auf dem Gelände; echte Küstenlinie; eigene Großprojekte aus Sammlungen.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NO_WATER, PATH_DIRS, addToCollection, applyPlanLandscape, buildBasePlan, buildGrossprojektPlan, createBuildingLibrary, createCollection, createSurvey, designFromSurvey,
  fitAnlageToTerrain, grossprojektById, grossprojektFromCollection, isNetworkPlacement, lampPostPart, layoutBase, planGrossprojekt, placementColumns, previewBase, previewGrossprojekt,
  realShoreMap, validateGrossprojekt, withoutNetwork, NETWORK_SURFACE,
} from '../../../dist/domain/src/index.js';

const buildings = await createBuildingLibrary();
const lib = { assets: buildings.assets, versions: new Map(buildings.versions.map(v => [v.id, v])) };
const ORIGIN = [500, 64, 300];

function surveyAround(extent, h, water = () => false, margin = 40) {
  const area = { minX: ORIGIN[0] + extent.x0 - margin, minZ: ORIGIN[2] + extent.z0 - margin, width: extent.x1 - extent.x0 + 2 * margin, length: extent.z1 - extent.z0 + 2 * margin };
  const n = area.width * area.length;
  const ground = new Int16Array(n), surface = new Int16Array(n), gb = new Uint16Array(n), sb = new Uint16Array(n);
  for (let z = 0; z < area.length; z++) for (let x = 0; x < area.width; x++) {
    const i = x + z * area.width, wx = area.minX + x, wz = area.minZ + z, g = h(wx, wz);
    ground[i] = g; gb[i] = 1;
    if (water(wx, wz)) { surface[i] = g + 3; sb[i] = 2; } else { surface[i] = g; sb[i] = 1; }
  }
  return createSurvey({ ...area, ground, surface, groundBlock: gb, surfaceBlock: sb, ids: ['?', 'minecraft:grass_block', 'minecraft:water'] },
    { dimension: 'minecraft:overworld', readAt: '2026-11-06T09:00:00.000Z' });
}
const idx = (d, x, z) => (x - d.minX) + (z - d.minZ) * d.width;

test('base on a slope: network as landscape path, sites levelled under every building, lamps on the planned ground', async () => {
  const layout = layoutBase(lib, { template: 'starterbasis' });
  const plan = await buildBasePlan(layout);
  // A hill rising 1 per 3 blocks to the east.
  const survey = surveyAround(layout.extent, x => 60 + Math.floor((x - ORIGIN[0]) / 3));
  const bare = withoutNetwork(plan);
  assert.equal(bare.placements.length, plan.placements.length - 1);
  assert.ok(!bare.placements.some(isNetworkPlacement));
  const fit = fitAnlageToTerrain(bare, { survey, origin: ORIGIN, mode: 'terrassen' });
  const d = designFromSurvey(survey, { kind: 'flat', y: 0 });
  const r = applyPlanLandscape(d, bare, { origin: ORIGIN, offset: [0, 0], heights: fit.heights, network: { cells: layout.paths, lamps: layout.lamps, style: NETWORK_SURFACE[layout.choices.pathStyle] }, steps: 'stairs', water: 'bridge', grade: 3 });
  assert.equal(r.path.columns, layout.paths.length);
  assert.ok(r.path.stairs > 0, 'the slope needs stairs');
  // Neighbouring path columns differ by at most one block.
  const set = new Set(layout.paths.map(([x, z]) => `${x + ORIGIN[0]},${z + ORIGIN[2]}`));
  for (const k of set) { const [x, z] = k.split(',').map(Number); for (const [dx, dz] of PATH_DIRS) if (set.has(`${x + dx},${z + dz}`)) assert.ok(Math.abs(d.height[idx(d, x, z)] - d.height[idx(d, x + dx, z + dz)]) <= 1); }
  // Every building column stands on ground exactly one below its lowest block; under an overhang (lowest block above the base layer) the ground stays at the base.
  for (const p of bare.placements) {
    const cols = placementColumns(p, ORIGIN, [0, 0]), base = Math.min(...cols.map(c => c.y)), dy = fit.heights.get(p.key) ?? 0;
    for (const c of cols) assert.equal(d.height[idx(d, c.x, c.z)], (c.y > base + 1 ? base : c.y) + dy - 1, p.key);
  }
  assert.ok(r.grade.graded > 0);
  assert.equal(r.lamps.length + r.lampsDropped, layout.lamps.length);
  for (const [x, y, z] of r.lamps) assert.equal(y, d.height[idx(d, x, z)]);
  // The lamp part: posts one above the ground, its placement in plan coordinates; the plan with it previews without conflict.
  const lamps = await lampPostPart(r.lamps, { origin: ORIGIN, offset: [0, 0], key: 'wegenetz', name: 'Test' });
  assert.ok(lamps && lamps.placement.area && lamps.placement.kind === 'path');
  assert.equal(lamps.version.payload.cells.length, r.lamps.length * 3);
  const minY = Math.min(...r.lamps.map(l => l[1]));
  assert.equal(lamps.placement.transform.position[1], minY + 1 - ORIGIN[1]);
  const adopted = { ...bare, placements: [...bare.placements, lamps.placement], network: { asset: lamps.asset, version: lamps.version } };
  const preview = previewBase(adopted, { versions: lib.versions, heights: fit.heights });
  assert.equal(preview.conflicts.length, 0);
  assert.equal(await lampPostPart([], { origin: ORIGIN, offset: [0, 0], key: 'x', name: 'x' }), null);
});

test('Großprojekt at the water: streets bridge the creek, sites in the water are reclaimed with quay walls, wet quarters reported', async () => {
  const gp = grossprojektById('gp_marktstadt');
  const layout = planGrossprojekt(gp, lib);
  const plan = await buildGrossprojektPlan(layout);
  const e = layout.extent;
  // A creek 6 wide across the middle (north–south), elsewhere flat at 62.
  const mid = ORIGIN[0] + Math.floor((e.x0 + e.x1) / 2);
  const wet = (x) => x >= mid && x < mid + 6;
  const survey = surveyAround(e, x => wet(x) ? 57 : 62, wet);
  const bare = withoutNetwork(plan);
  const fit = fitAnlageToTerrain(bare, { survey, origin: ORIGIN, mode: 'eben' });
  const d = designFromSurvey(survey, { kind: 'flat', y: 0 });
  const r = applyPlanLandscape(d, bare, { origin: ORIGIN, offset: [0, 0], heights: fit.heights, network: { cells: layout.streets.cells, lamps: layout.streets.lamps, style: NETWORK_SURFACE[layout.streets.style] },
    water: 'bridge', grade: 3, quay: true });
  assert.ok(r.path.bridge > 0, 'streets crossing the creek become bridges');
  assert.ok(r.path.rails > 0);
  assert.ok(r.wet.length > 0, 'the creek runs under some buildings');
  assert.ok(r.reclaimed > 0, 'sites in the water are reclaimed');
  assert.ok(r.quay > 0, 'the new water edge gets a quay wall');
  for (const w of r.wet) for (const c of placementColumns(bare.placements.find(p => p.key === w.key), ORIGIN, [0, 0])) assert.equal(d.water[idx(d, c.x, c.z)], NO_WATER);
  // Flat streets part and landscape streets never both: the adopted plan has no network placement.
  assert.ok(!bare.placements.some(isNetworkPlacement));
  const preview = previewGrossprojekt({ ...bare, network: null }, { versions: lib.versions, heights: fit.heights });
  assert.equal(preview.conflicts.length, 0);
});

test('real coastline of the survey as runs in plan coordinates', () => {
  const extent = { x0: 0, z0: 0, x1: 20, z1: 10 };
  const survey = surveyAround(extent, () => 60, (x, z) => z - ORIGIN[2] >= 6 && x - ORIGIN[0] < 15, 5);
  const m = realShoreMap(survey, extent, { origin: ORIGIN });
  assert.equal(m.water, 15 * 4);
  assert.equal(m.known, 200);
  assert.deepEqual(m.runs[0], [0, 6, 15]);
  const shifted = realShoreMap(survey, extent, { origin: ORIGIN, offset: [0, -2] });
  assert.deepEqual(shifted.runs[0], [0, 8, 15], 'offset moves the plan, the water stays');
});

test('own Großprojekt from a collection: own buildings first, every sub-folder a quarter and a phase, templates skipped, plans without conflicts', async () => {
  const ids = buildings.assets.filter(a => a.id.startsWith('bld_')).slice(0, 12).map(a => a.id);
  let root = createCollection({ name: 'Meine Stadt', id: 'col_test_stadt' });
  for (const id of ids.slice(0, 10)) root = addToCollection(root, { kind: 'asset', assetId: id });
  root = addToCollection(root, { kind: 'template', templateId: 'tpl_x' });
  root = addToCollection(root, { kind: 'asset', assetId: 'fehlt_123' });
  let child = createCollection({ name: 'Hafen', parentId: root.id, id: 'col_test_hafen' });
  child = addToCollection(child, { kind: 'asset', assetId: ids[10] });
  let grand = createCollection({ name: 'Kai', parentId: child.id, id: 'col_test_kai' });
  grand = addToCollection(grand, { kind: 'asset', assetId: ids[11] });
  const empty = createCollection({ name: 'Leer', parentId: root.id, id: 'col_test_leer' });
  const all = [root, child, grand, empty];
  const { gp, skipped } = grossprojektFromCollection(root, { all, assets: lib.assets, versions: lib.versions });
  validateGrossprojekt(gp);
  assert.ok(gp.own);
  assert.deepEqual(gp.quartiere.map(q => q.name), ['Meine Stadt 1', 'Meine Stadt 2', 'Hafen']);
  assert.deepEqual(gp.quartiere.map(q => q.units.length), [8, 2, 2], 'sub-folder takes its nested folder along');
  assert.equal(gp.phasen.length, 3);
  assert.equal(skipped.length, 3, skipped.join(' | '));
  const layout = planGrossprojekt(gp, lib);
  assert.equal(layout.blockers.length, 0);
  assert.equal(layout.placements.filter(p => p.kind === 'building').length, 12);
  const plan = await buildGrossprojektPlan(layout);
  assert.equal(previewGrossprojekt(plan, { versions: lib.versions }).conflicts.length, 0);
  assert.throws(() => grossprojektFromCollection(empty, { all, assets: lib.assets, versions: lib.versions }), /keine Gebäude/);
  // Curated projects still need catalogue ids.
  assert.throws(() => validateGrossprojekt({ ...gp, own: false, quartiere: [{ ...gp.quartiere[0], units: [{ kind: 'slot', key: 'k', assetId: 'asset_own' }] }], phasen: [{ id: 'p', name: 'P', note: '', quartiere: [gp.quartiere[0].id] }] }), /bld_/);
});
