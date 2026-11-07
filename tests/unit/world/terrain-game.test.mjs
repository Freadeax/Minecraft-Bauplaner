// Spielprüfstand Gelände, Basisplaner, Großprojekte (TERRAIN-03/05, BASE-01, GROSS-01; 07.11.2026): Regeln, die der echte
// Paper-26.3-Server bei scripts/mod/test_game_placement.sh gelaende basis grossprojekte grossprojekteGelaende zeigte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BUILDING_SPECS, GROSSPROJEKTE, NO_WATER, WATER_RIM_BLOCK, addScatterPreset, applyPlanLandscape, buildBasePlan, buildGrossprojektPlan, createBuildingLibrary, createSurvey,
  designFromSurvey, designPayload, fitAnlageToTerrain, flatSurvey, gradeFootprints, groundFits, grossprojektById, landscapeRims, layPath, layoutBase, openWaterEdges,
  planGrossprojekt, previewBase, previewGrossprojekt, scatterCells, scatterLayers, withoutNetwork, EMPTY_SCATTER, applyBrush,
} from '../../../dist/domain/src/index.js';
import { isSeam } from '../../../scripts/mod/game_placement.mjs';

const buildings = await createBuildingLibrary();
const lib = { assets: buildings.assets, versions: new Map(buildings.versions.map(v => [v.id, v])) };
const ids = ['?', 'minecraft:grass_block', 'minecraft:water'];
function surveyOf(area, h, water = () => false, sea = 0) {
  const n = area.width * area.length;
  const ground = new Int16Array(n), surface = new Int16Array(n), gb = new Uint16Array(n).fill(1), sb = new Uint16Array(n);
  for (let z = 0; z < area.length; z++) for (let x = 0; x < area.width; x++) {
    const i = x + z * area.width, wx = area.minX + x, wz = area.minZ + z, g = h(wx, wz);
    ground[i] = g;
    if (water(wx, wz)) { surface[i] = sea; sb[i] = 2; } else { surface[i] = g; sb[i] = 1; }
  }
  return createSurvey({ ...area, ground, surface, groundBlock: gb, surfaceBlock: sb, ids }, { dimension: 'minecraft:overworld', readAt: '2026-11-07T00:00:00.000Z' });
}
const stateAt = (r, x, y, z) => {
  const c = r.payload.cells.find(c => c.position[0] === x - r.origin[0] && c.position[1] === y - r.origin[1] && c.position[2] === z - r.origin[2]);
  return c && r.payload.palette[c.paletteIndex];
};

test('Geländebauteil wie im Spiel: Treppen einer Wegkurve mit Innenecke, Pfad unter einer Stufe wird Erde, Mauergeländer ohne Pfosten in der Mitte', () => {
  const slope = surveyOf({ minX: 0, minZ: 0, width: 40, length: 9 }, x => 64 + Math.floor(x / 2));
  const d = designFromSurvey(slope, { kind: 'flat', y: 0 });
  layPath(d, [[2, 1], [20, 7], [37, 2]], { width: 5, style: 'pfad', steps: 'stairs' });
  const r = designPayload(slope, d, 'test');
  const states = r.payload.cells.map(c => r.payload.palette[c.paletteIndex]);
  assert.ok(states.some(s => /_stairs$/.test(s.id) && /^(inner|outer)_/.test(s.properties.shape)), 'eine Treppe der Kurve hat ihre Eckform');
  // No trampled path directly under a stair or slab of the path (the game turns it into dirt).
  const byPos = new Map(r.payload.cells.map(c => [c.position.join(','), r.payload.palette[c.paletteIndex]]));
  for (const [k, s] of byPos) {
    if (s.id !== 'minecraft:dirt_path') continue;
    const [x, y, z] = k.split(',').map(Number), up = byPos.get(`${x},${y + 1},${z}`);
    assert.ok(!up || !/_(stairs|slab)$/.test(up.id), `Pfad unter ${up?.id} bei ${k}`);
  }
  // Bridge with a wall railing over a brook: the straight railing has no posts between its ends.
  const brook = surveyOf({ minX: 0, minZ: 0, width: 14, length: 30 }, (x, z) => z >= 11 && z <= 18 ? 61 : 64, (x, z) => z >= 11 && z <= 18, 63);
  const b = designFromSurvey(brook, { kind: 'flat', y: 0 });
  layPath(b, [[6, 1], [6, 28]], { width: 3, style: 'kiesweg', material: 'bruchstein', water: 'bridge' });
  const rb = designPayload(brook, b, 'test');
  const walls = rb.payload.cells.map(c => [c.position, rb.payload.palette[c.paletteIndex]]).filter(([, s]) => s.id === 'minecraft:cobblestone_wall');
  assert.ok(walls.length >= 10);
  const mids = walls.filter(([p]) => walls.some(([q]) => q[0] === p[0] && q[2] === p[2] - 1) && walls.some(([q]) => q[0] === p[0] && q[2] === p[2] + 1));
  assert.ok(mids.length > 0 && mids.every(([, s]) => s.properties.up === 'false'), 'Geländer ohne Pfosten in der Mitte');
});

test('Streu-Ebene: Felsen aus Bruchstein auf Geröll ergeben ein gültiges Bauteil; Pilze nur auf Podsol und Myzel', () => {
  const s = flatSurvey({ minX: 0, minZ: 0, width: 32, length: 32 }, 64, 'minecraft:overworld');
  const d = designFromSurvey(s, { kind: 'flat', y: 0 });
  applyBrush(d, 16, 16, { tool: 'paint', radius: 30, strength: 1, falloff: 'hard', style: 'geroell' });
  d.scatter = addScatterPreset(d.scatter ?? EMPTY_SCATTER, 'nadelwald').plan;
  scatterLayers(d, { base: s });
  const cells = scatterCells(d, { base: s }).cells;
  assert.ok(cells.some(c => c.id === 'minecraft:cobblestone' || c.state?.id === 'minecraft:cobblestone'));
  assert.doesNotThrow(() => designPayload(s, d, 'test', undefined, cells), 'gleicher Zustand einmal in der Palette');
  assert.equal(groundFits('mushroom', 'minecraft:podzol'), true);
  assert.equal(groundFits('mushroom', 'minecraft:mycelium'), true);
  assert.equal(groundFits('mushroom', 'minecraft:grass_block'), false);
  assert.equal(groundFits('mushroom', 'minecraft:moss_block'), false);
});

test('Bauplätze einebnen: der erste Ring um den Bauplatz liegt auf Bauplatzhöhe, keine Erde an der Wand', () => {
  const s = surveyOf({ minX: 0, minZ: 0, width: 30, length: 30 }, x => 60 + x);
  const d = designFromSurvey(s, { kind: 'flat', y: 0 });
  const bases = [];
  for (let z = 10; z < 16; z++) for (let x = 10; x < 16; x++) bases.push({ x, z, y: 70 });
  gradeFootprints(d, bases, 3);
  const h = (x, z) => d.height[x + z * d.width];
  for (let z = 10; z < 16; z++) { assert.equal(h(16, z), 69, 'Ring hangaufwärts'); assert.equal(h(9, z), 69, 'Ring hangabwärts'); }
  assert.ok(h(17, 12) > 69 && h(17, 12) < s.ground[17 + 12 * 30], 'dahinter angeglichen');
});

test('Basis am Ufer: Stege stehen im Wasser (Deck über dem Spiegel), werden nicht eingeebnet, Laternen nie am steilen Hang', async () => {
  const layout = layoutBase(lib, { template: 'kuestenbasis' });
  const plan = await buildBasePlan(layout);
  const piers = plan.placements.filter(p => p.inWater);
  assert.ok(piers.length >= 3 && piers.every(p => p.key.includes('steg')), 'Stege sind Wasserbauten');
  const e = layout.extent, origin = [500, 64, 300], m = 12;
  const wet = (x, z) => layout.water && (layout.water.side === 'sued' ? z - origin[2] >= layout.water.line : false);
  const survey = surveyOf({ minX: origin[0] + e.x0 - m, minZ: origin[2] + e.z0 - m, width: e.x1 - e.x0 + 2 * m, length: e.z1 - e.z0 + 2 * m },
    (x, z) => wet(x, z) ? 58 : 63 + Math.round(4 * Math.sin((x - origin[0]) / 9)), wet, 62);
  const bare = withoutNetwork(plan);
  const fit = fitAnlageToTerrain(bare, { survey, origin, mode: 'terrassen' });
  for (const p of piers) {
    const pay = p.version.payload, deck = Math.min(...pay.cells.filter(c => pay.palette[c.paletteIndex].id === 'minecraft:spruce_planks').map(c => c.position[1]));
    assert.equal(origin[1] + (fit.heights.get(p.key) ?? 0) + deck, 63, `${p.key}: Deck einen Block über dem Wasserspiegel 62`);
  }
  const d = designFromSurvey(survey, { kind: 'flat', y: 0 });
  const r = applyPlanLandscape(d, bare, { origin, offset: [0, 0], heights: fit.heights, network: { cells: layout.paths, lamps: layout.lamps, style: 'pfad' }, steps: 'stairs', water: 'bridge', grade: 3, quay: true });
  assert.ok(!r.wet.some(w => w.key.includes('steg')), 'Stege gelten nicht als Bauten im Wasser');
  const idx = (x, z) => (x - d.minX) + (z - d.minZ) * d.width;
  for (const p of piers) {
    const f = p.footprint, cx = origin[0] + Math.floor((f.x0 + f.x1) / 2), cz = origin[2] + Math.floor((f.z0 + f.z1) / 2);
    if (wet(cx, cz)) assert.notEqual(d.water[idx(cx, cz)], NO_WATER, `${p.key}: Wasser unter dem Steg bleibt`);
  }
  for (const [x, y, z] of r.lamps) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) assert.ok(d.height[idx(x + dx, z + dz)] < y + 2, 'kein Boden am Laternenzaun');
});

test('Offene Wasserkanten: Mühlbach, Fischteich, Wassergraben bekommen im Großprojekt Randsteine, sonst kein Wasser über den Planrand eines Gebäudes', async () => {
  const leaks = new Map();
  for (const gp of GROSSPROJEKTE) {
    const plan = await buildGrossprojektPlan(planGrossprojekt(gp, lib));
    const preview = previewGrossprojekt(plan);
    assert.equal(preview.resolution.conflicts.length, 0, `${gp.id}: Randsteine ohne Konflikt`);
    assert.deepEqual(openWaterEdges(preview.resolution), [], `${gp.id}: keine offene Wasserkante mehr`);
    const net = plan.placements.find(p => p.key === 'strassen');
    leaks.set(gp.id, net.version.payload.cells.filter(c => net.version.payload.palette[c.paletteIndex].id === WATER_RIM_BLOCK).length);
  }
  assert.ok(leaks.get('gp_marktstadt') > 0, 'Wassermühle der Marktstadt');
  // The flat base with the closed boathouse has none, on terrain the lamp part takes the rims.
  const plan = await buildBasePlan(layoutBase(lib, { template: 'kuestenbasis' }));
  assert.deepEqual(openWaterEdges(previewBase(plan).resolution), []);
  const gp = await buildGrossprojektPlan(planGrossprojekt(grossprojektById('gp_marktstadt'), lib));
  const rims = landscapeRims(gp, { origin: [0, 64, 0], offset: [0, 0] });
  assert.ok(rims.length > 0 && rims.every(([, y]) => y >= 64));
  const boathouse = BUILDING_SPECS.find(s => s.id === 'bld_kueste_bootshaus').payload();
  const zmax = boathouse.bounds.maxExclusive[2] - 1;
  assert.ok(!boathouse.cells.some(c => c.position[2] === zmax && boathouse.palette[c.paletteIndex].id === 'minecraft:water'), 'Bootshausbecken mit Schwelle');
});

test('Bericht: Verbindung zum Nachbarbauteil ist eine Naht, im selben Bauteil ein Fehler', () => {
  const parts = { '0,0,0': 'haus', '0,0,-1': 'gelaende', '1,0,0': 'haus' };
  const d = { p: [0, 0, 0], want: 'minecraft:oak_fence[east=false,north=false,south=false,waterlogged=false,west=false]', got: 'minecraft:oak_fence[east=false,north=true,south=false,waterlogged=false,west=false]' };
  assert.equal(isSeam(d, parts), true);
  assert.equal(isSeam({ ...d, got: d.got.replace('east=false', 'east=true') }, parts), false);
  assert.equal(isSeam(d, null), false);
});
