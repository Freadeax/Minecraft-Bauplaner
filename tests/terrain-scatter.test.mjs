// Streu-Ebene: Natur-Bauteile nach Stil, Hang, Höhe, Ufer und Dichte auf der Geländegestaltung verteilen (TERRAIN-02-S06).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BUILTIN_SCATTER_PARTS, NO_WATER, SCATTER_PRESETS, SURVEY_UNKNOWN, addScatterItem, addScatterPreset, applyBrush, checkScatterPlan, clearScatterLayer, cloneDesign, createSurvey,
  decodeDesign, designFile, designFromSurvey, designPayload, encodeDesign, floodWater, groundFits, layPath, newScatterLayer, plannedSurvey, putScatterLayer, removeScatterItems,
  removeScatterLayer, scatterCells, scatterLayers, stencilScatterPart,
} from '../dist/domain/src/index.js';
import { createPayload, validatePayload } from '../dist/voxel/src/index.js';

function surveyOf(area, h, opts = {}) {
  const n = area.width * area.length;
  const ground = new Int16Array(n), surface = new Int16Array(n), gb = new Uint16Array(n), sb = new Uint16Array(n);
  for (let z = 0; z < area.length; z++) for (let x = 0; x < area.width; x++) {
    const i = x + z * area.width, wx = area.minX + x, wz = area.minZ + z, g = h(wx, wz);
    if (g === null) { ground[i] = SURVEY_UNKNOWN; surface[i] = SURVEY_UNKNOWN; continue; }
    ground[i] = g; gb[i] = 1;
    if (opts.water?.(wx, wz)) { surface[i] = g + 2; sb[i] = 2; }
    else if (opts.tree?.(wx, wz)) { surface[i] = g + 6; sb[i] = 3; }
    else { surface[i] = g; sb[i] = 1; }
  }
  return createSurvey({ ...area, ground, surface, groundBlock: gb, surfaceBlock: sb, ids: ['?', 'minecraft:grass_block', 'minecraft:water', 'minecraft:oak_leaves'] },
    { dimension: 'minecraft:overworld', readAt: '2026-11-02T06:00:00.000Z' });
}
const SHA = 'b'.repeat(64);
const AREA = { minX: 100, minZ: -40, width: 64, length: 64 };
const flat = () => surveyOf(AREA, () => 64);
const ref = id => ({ kind: 'builtin', id });
const withLayer = (d, input) => { const l = newScatterLayer(d.scatter ?? { layers: [], items: [] }, input); putScatterLayer(d, l); return l; };
const keyOf = c => `${c.x},${c.y},${c.z}`;

test('built-in parts: every state exists in 26.3, leaves persist, trees stand on their trunk', () => {
  assert.ok(BUILTIN_SCATTER_PARTS.length >= 12);
  for (const part of BUILTIN_SCATTER_PARTS) for (let v = 0; v < part.variants; v++) {
    const cells = part.cells(v);
    assert.ok(cells.length > 0, part.label);
    const keys = new Set(cells.map(c => `${c.dx},${c.dy},${c.dz}`));
    assert.equal(keys.size, cells.length, `${part.label} v${v}: doppelte Zellen`);
    for (const c of cells) {
      assert.match(c.state.id, /^minecraft:[a-z_]+$/);
      if (c.state.id.endsWith('_leaves')) assert.equal(c.state.properties.persistent, 'true');
      if (!c.embed) assert.ok(c.dy >= 0, `${part.label}: nur Felsen stecken im Boden`);
    }
    if (part.group === 'baum') assert.ok(cells.some(c => c.dx === 0 && c.dy === 0 && c.dz === 0 && c.state.id.endsWith('_log')), `${part.label}: Stamm am Anker`);
  }
  assert.equal(groundFits('tree', 'minecraft:snow_block'), true);
  assert.equal(groundFits('plant', 'minecraft:snow_block'), false);
  assert.equal(groundFits('sand', 'minecraft:sand'), true);
  assert.equal(groundFits('plant', 'minecraft:sand'), false);
  assert.equal(groundFits('any', 'minecraft:water'), false);
});

test('scatter is deterministic, follows density and spacing; another seed gives another placement', () => {
  const s = flat(), d = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  const layer = withLayer(d, { part: ref('eiche'), density: 10, spacing: 5, maxSlope: null });
  const a = scatterLayers(d, { base: s });
  const again = cloneDesign(designFromSurvey(s, { kind: 'survey', sha256: SHA }));
  putScatterLayer(again, layer);
  const b = scatterLayers(again, { base: s });
  assert.deepEqual(a.plan.items, b.plan.items);
  const n = a.placed.get(layer.id);
  // 4096 columns · 10/1000 ≈ 41 candidates before thinning; crowns (5 × 5) keep many apart.
  assert.ok(n >= 10 && n <= 45, `${n} Eichen`);
  for (const p of a.plan.items) for (const q of a.plan.items) if (p !== q) assert.ok(Math.max(Math.abs(p.x - q.x), Math.abs(p.z - q.z)) >= 5);
  const cells = scatterCells(d, { base: s });
  assert.equal(cells.placed, n);
  assert.equal(new Set(cells.cells.map(keyOf)).size, cells.cells.length, 'Teile überschneiden sich nie');
  putScatterLayer(again, { ...layer, seed: layer.seed + 1 });
  const c = scatterLayers(again, { base: s });
  assert.notDeepEqual(c.plan.items, a.plan.items);
});

test('rules: surface style like a biome, slope, height, shore; water, paths, buildings and existing trees stay free', () => {
  // West half grass (y 64), east half a slope rising one block per column; a pond in the south-west; old trees in the north-east corner.
  const pond = (x, z) => x >= 104 && x < 112 && z >= 10 && z < 18;
  const s = surveyOf(AREA, (x, z) => pond(x, z) ? 62 : x < 132 ? 64 : 64 + (x - 132), { water: (x, z) => x >= 104 && x < 112 && z >= 10 && z < 18, tree: (x, z) => x >= 150 && z < -30 });
  const d = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  applyBrush(d, 112, -24, { tool: 'paint', radius: 6, strength: 1, falloff: 'hard', style: 'fels' });
  layPath(d, [[100, 0], [131, 0]], { width: 1, style: 'kiesweg' });
  const rock = withLayer(d, { part: ref('fels'), density: 300, spacing: 2, styles: ['fels'], maxSlope: null, buildingGap: 0 });
  const flat0 = withLayer(d, { part: ref('blumen'), density: 400, spacing: 1, styles: ['wiese'], maxSlope: 0, maxY: 64 });
  const reed = withLayer(d, { part: ref('schilf'), density: 1000, spacing: 1, shore: 1 });
  const buildings = [];
  for (let x = 120; x < 124; x++) for (let z = 20; z < 24; z++) buildings.push([x, z]);
  const run = scatterLayers(d, { base: s, buildingColumns: buildings });
  const at = it => (it.x - d.minX) + (it.z - d.minZ) * d.width;
  const items = run.plan.items;
  assert.ok(items.some(i => i.layer === rock.id) && items.some(i => i.layer === flat0.id) && items.some(i => i.layer === reed.id));
  for (const it of items) {
    const i = at(it);
    assert.equal(d.water[i], NO_WATER, 'nie im Wasser');
    assert.equal(d.path[i], 0, 'nie auf dem Weg');
    if (it.layer === rock.id) assert.ok(['minecraft:stone', 'minecraft:andesite', 'minecraft:cobblestone'].includes(d.ids[d.top[i]]));
    if (it.layer === flat0.id) { assert.equal(d.ids[d.top[i]], 'minecraft:grass_block'); assert.ok(it.x < 132, 'Blumen nur in der Ebene (Hang 0, bis Y 64)'); }
    if (it.layer === reed.id) assert.ok(it.x >= 103 && it.x <= 112 && it.z >= 9 && it.z <= 18, `Zuckerrohr am Teich: ${it.x},${it.z}`);
    if (it.layer !== rock.id) assert.ok(!(it.x >= 119 && it.x <= 124 && it.z >= 19 && it.z <= 24), 'Abstand zu Bauten');
    assert.ok(!(it.x >= 150 && it.z < -30), 'bestehende Bäume bleiben frei');
  }
  assert.ok(run.missed.get('style') > 0 && run.missed.get('slope') > 0);
});

test('hand edits: add with reason, remove by radius, scattering again keeps manual items; layers can be cleared and removed', () => {
  const s = flat(), d = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  applyBrush(d, 130, -10, { tool: 'lower', radius: 2, strength: 2, falloff: 'hard' });
  assert.ok(floodWater(d, 130, -10, 64).filled > 0);
  const ctx = { base: s };
  const tree = withLayer(d, { part: ref('eiche'), density: 0, spacing: 5 });
  assert.equal(addScatterItem(d, ctx, tree.id, 130, -10), 'water');
  assert.equal(addScatterItem(d, ctx, tree.id, 110, -30), null);
  assert.equal(addScatterItem(d, ctx, tree.id, 111, -30), 'overlap');
  assert.equal(addScatterItem(d, ctx, tree.id, 100, -40), 'outside', 'Krone ragt aus der Gestaltung');
  putScatterLayer(d, { ...tree, density: 15 });
  scatterLayers(d, ctx);
  assert.ok(d.scatter.items.some(i => i.manual && i.x === 110 && i.z === -30));
  assert.ok(d.scatter.items.length > 1);
  const before = d.scatter.items.length;
  assert.equal(removeScatterItems(d, 110, -30, 0), 1);
  assert.equal(d.scatter.items.length, before - 1);
  assert.equal(clearScatterLayer(d, tree.id), before - 1);
  removeScatterLayer(d, tree.id);
  assert.deepEqual(d.scatter, { layers: [], items: [] });
});

test('items follow the planned ground; items that no longer fit are dropped and counted', () => {
  const s = flat(), d = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  const l = withLayer(d, { part: ref('fichte'), density: 0, spacing: 4 });
  assert.equal(addScatterItem(d, { base: s }, l.id, 120, -20), null);
  const y0 = Math.min(...scatterCells(d, { base: s }).cells.map(c => c.y));
  assert.equal(y0, 65);
  applyBrush(d, 120, -20, { tool: 'raise', radius: 3, strength: 3, falloff: 'hard' });
  const raised = scatterCells(d, { base: s });
  assert.equal(Math.min(...raised.cells.map(c => c.y)), 68, 'Stamm steht auf dem angehobenen Boden');
  applyBrush(d, 120, -20, { tool: 'lower', radius: 6, strength: 6, falloff: 'hard' });
  floodWater(d, 120, -20, 64);
  const wet = scatterCells(d, { base: s });
  assert.equal(wet.placed, 0);
  assert.equal(wet.dropped.get('water'), 1);
});

test('blocks: scatter goes into the terrain Bauteil (rocks replace the top block), valid payload, materials; planned survey shows crowns', () => {
  const s = flat(), d = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  const tree = withLayer(d, { part: ref('eiche'), density: 0 });
  const rock = withLayer(d, { part: ref('fels'), density: 0, maxSlope: null });
  assert.equal(addScatterItem(d, { base: s }, tree.id, 110, -30), null);
  assert.equal(addScatterItem(d, { base: s }, rock.id, 140, 0), null);
  assert.equal(designPayload(s, d, 'test'), null, 'ohne Extra-Zellen bleibt das Gelände unverändert');
  const sc = scatterCells(d, { base: s });
  const blocks = designPayload(s, d, 'test', undefined, sc.cells);
  assert.ok(blocks);
  validatePayload(blocks.payload);
  assert.equal(blocks.blocks, sc.cells.length);
  const states = blocks.payload.palette;
  assert.ok(states.some(p => p.id === 'minecraft:oak_leaves' && p.properties.persistent === 'true'));
  assert.ok(states.some(p => p.id === 'minecraft:oak_log' && p.properties.axis === 'y'));
  assert.ok(sc.cells.some(c => c.y === 64 && c.x >= 138 && c.x <= 142), 'Fels sitzt im Boden (ersetzt Gras)');
  assert.ok(sc.materials.find(m => m.id === 'minecraft:oak_leaves').count > 20);
  const planned = plannedSurvey(s, d);
  const i = (110 - d.minX) + (-30 - d.minZ) * d.width;
  assert.ok(planned.surface[i] >= 69, `Krone auf der Karte: ${planned.surface[i]}`);
  assert.equal(planned.ground[i], 64, 'Boden bleibt der Boden');
  // Skip leaves planned buildings alone.
  const blocked = designPayload(s, d, 'test', (x, y, z) => x === 110 && z === -30, sc.cells);
  assert.ok(blocked.skipped > 0);
});

test('presets add layers; file keeps the plan exactly; invalid plans are refused', () => {
  const s = surveyOf(AREA, (x, z) => 64 + Math.floor(Math.abs(x - 132) / 6));
  const d = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  applyBrush(d, 132, -8, { tool: 'paint', radius: 40, strength: 1, falloff: 'hard', style: 'wald' });
  assert.ok(SCATTER_PRESETS.length >= 6);
  d.scatter = addScatterPreset({ layers: [], items: [] }, 'mischwald').plan;
  assert.equal(d.scatter.layers.length, 4);
  const run = scatterLayers(d, { base: s });
  assert.ok(run.plan.items.length > 30, `${run.plan.items.length} Teile`);
  const back = decodeDesign(encodeDesign(d));
  assert.deepEqual(back.scatter, d.scatter);
  assert.deepEqual(scatterCells(back, { base: s }).cells, scatterCells(d, { base: s }).cells);
  const plain = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  assert.equal(decodeDesign(encodeDesign(plain)).scatter, undefined, 'ältere Dateien ohne Streu-Ebene bleiben gleich');
  assert.throws(() => checkScatterPlan({ layers: [], items: [{ layer: 'x', x: 0, z: 0, rot: 0, variant: 0 }] }), /Ebene/);
  assert.throws(() => checkScatterPlan({ layers: [{ ...d.scatter.layers[0], density: -1 }], items: [] }), /Dichte/);
  assert.throws(() => checkScatterPlan({ layers: [d.scatter.layers[0], d.scatter.layers[0]], items: [] }), /doppelte/);
  return designFile(d, s, 'Wald').then(f => assert.ok(f.original.size > 0));
});

test('own Schablone as part: bottom on the ground, turned with its block states, air not placed; cactus keeps its sides free', () => {
  const payload = createPayload({ schemaVersion: 1, profileId: 'test', bounds: { min: [0, 0, 0], maxExclusive: [1, 2, 3] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0],
    palette: [{ id: 'minecraft:stone_brick_stairs', properties: { facing: 'north', half: 'bottom', shape: 'straight', waterlogged: 'false' } }, { id: 'minecraft:air', properties: {} }],
    cells: [{ position: [0, 0, 0], kind: 'block', paletteIndex: 0 }, { position: [0, 1, 0], kind: 'air', paletteIndex: 1 }, { position: [0, 0, 2], kind: 'block', paletteIndex: 0 }], blockEntities: [] });
  const ref = { kind: 'stencil', assetId: 'asset_1', versionId: 'ver_1', label: 'Stufen' };
  const part = stencilScatterPart(ref, payload);
  assert.equal(part.cells(0).length, 2);
  assert.deepEqual(part.cells(0).map(c => [c.dx, c.dy, c.dz]), [[0, 0, -1], [0, 0, 1]]);
  const s = flat(), d = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  const resolve = r => r.kind === 'stencil' ? part : undefined;
  const l = newScatterLayer({ layers: [], items: [] }, { part: ref, density: 0 }, resolve);
  putScatterLayer(d, l);
  assert.equal(addScatterItem(d, { base: s, resolve }, l.id, 120, -10), null);
  const it = d.scatter.items[0];
  const cells = scatterCells(d, { base: s, resolve }).cells;
  assert.equal(cells.length, 2);
  assert.ok(cells.every(c => c.y === 65));
  const facing = { 0: 'north', 1: 'east', 2: 'south', 3: 'west' }[it.rot];
  assert.ok(cells.every(c => c.state.properties.facing === facing), `gedreht um ${it.rot}: ${cells[0].state.properties.facing}`);
  // Cactus next to another cactus or a higher column does not fit.
  const sand = surveyOf(AREA, (x, z) => x === 131 && z === 0 ? 66 : 64);
  const ds = designFromSurvey(sand, { kind: 'survey', sha256: SHA });
  applyBrush(ds, 130, 0, { tool: 'paint', radius: 8, strength: 1, falloff: 'hard', style: 'wueste' });
  const c = withLayer(ds, { part: { kind: 'builtin', id: 'kaktus' }, density: 0, spacing: 1 });
  assert.equal(addScatterItem(ds, { base: sand }, c.id, 130, 0), 'blocked');
  assert.equal(addScatterItem(ds, { base: sand }, c.id, 126, 0), null);
  assert.equal(addScatterItem(ds, { base: sand }, c.id, 127, 0), 'overlap');
});
