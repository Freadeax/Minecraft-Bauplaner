// Gelände und Wege (TERRAIN-03): Aufschütten/Abtragen, Rampe, Wegstufen als Treppen oder Halbstufen, Brücken mit Geländer, Datei mit Wegstufen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NO_WATER, PATH_DECK, PATH_DECK_RAIL, PATH_MATERIALS, PATH_SLAB, PATH_STAIR, SURVEY_UNKNOWN, applyBrush, cloneDesign, compareDesign, createSurvey, decodeDesign,
  designFromSurvey, designPayload, designedSurvey, encodeDesign, hasPieces, layPath, layRamp, pathPieceCells, resetToBase,
} from '../../../dist/domain/src/index.js';
import { completeState, validatePayload } from '../../../dist/voxel/src/index.js';

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
    { dimension: 'minecraft:overworld', readAt: '2026-11-04T12:00:00.000Z' });
}
const SHA = 'b'.repeat(64);
const at = (d, x, z) => (x - d.minX) + (z - d.minZ) * d.width;
const h = (d, x, z) => d.height[at(d, x, z)];
const cellsAt = (cells, x, y, z) => cells.filter(c => c.x === x && c.y === y && c.z === z);

test('Aufschütten fills only hollows up to the target, Abtragen only cuts what stands above', () => {
  // Hollow at x 2..4 (Y 56), hill at x 8..10 (Y 68), elsewhere Y 62.
  const s = surveyOf({ minX: 0, minZ: 0, width: 14, length: 5 }, x => x >= 2 && x <= 4 ? 56 : x >= 8 && x <= 10 ? 68 : 62);
  const d = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  const filled = applyBrush(d, 6, 2, { tool: 'fillUp', radius: 6, strength: 1, falloff: 'hard', target: 62 });
  assert.equal(filled, 15, 'only the 3×5 hollow is filled');
  assert.equal(h(d, 3, 2), 62); assert.equal(h(d, 9, 2), 68, 'the hill stays');
  const cut = applyBrush(d, 6, 2, { tool: 'cut', radius: 6, strength: 1, falloff: 'hard', target: 62 });
  assert.equal(cut, 15, 'only the hill is cut');
  assert.equal(h(d, 9, 2), 62); assert.equal(h(d, 0, 2), 62);
  // Without a target the height where the stroke starts is used; a soft edge fills partly.
  const e = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  applyBrush(e, 5, 2, { tool: 'fillUp', radius: 3, strength: 1, falloff: 'soft' });
  assert.ok(h(e, 4, 2) > 56 && h(e, 4, 2) <= 62);
  assert.equal(h(e, 9, 2), 68);
  // Unknown columns are never touched.
  const u = designFromSurvey(surveyOf({ minX: 0, minZ: 0, width: 4, length: 1 }, x => x === 1 ? null : 50), { kind: 'survey', sha256: SHA });
  applyBrush(u, 0, 0, { tool: 'fillUp', radius: 4, strength: 1, falloff: 'hard', target: 60 });
  assert.equal(u.height[1], SURVEY_UNKNOWN); assert.equal(u.height[0], 60);
});

test('Rampe: even slope from start to end height, exact width, soft margin, unknown ends need a height', () => {
  const s = surveyOf({ minX: 0, minZ: 0, width: 30, length: 15 }, () => 60);
  const d = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  const r = layRamp(d, [5, 7], [25, 7], { width: 3, fromY: 60, toY: 70, margin: 2 });
  assert.equal(r.length, 20); assert.equal(r.fromY, 60); assert.equal(r.toY, 70);
  assert.equal(h(d, 5, 7), 60); assert.equal(h(d, 25, 7), 70); assert.equal(h(d, 15, 7), 65);
  for (let x = 6; x <= 25; x++) { const step = h(d, x, 7) - h(d, x - 1, 7); assert.ok(step === 0 || step === 1, `even slope at ${x}`); }
  for (let x = 5; x <= 25; x++) { assert.equal(h(d, x, 6), h(d, x, 7)); assert.equal(h(d, x, 8), h(d, x, 7)); }
  // Margin: between ramp and terrain, never above the ramp.
  assert.ok(h(d, 20, 9) > 60 && h(d, 20, 9) < h(d, 20, 8));
  assert.equal(h(d, 20, 12), 60, 'beyond the margin nothing changes');
  assert.ok(r.columns >= 63 && r.blended > 0 && r.fill > 0 && r.cut === 0);
  // Heights from the terrain when not given.
  const e = designFromSurvey(surveyOf({ minX: 0, minZ: 0, width: 20, length: 5 }, x => 60 + (x >= 15 ? 6 : 0)), { kind: 'survey', sha256: SHA });
  const auto = layRamp(e, [2, 2], [17, 2], { width: 1, margin: 0 });
  assert.equal(auto.fromY, 60); assert.equal(auto.toY, 66);
  const unknown = designFromSurvey(surveyOf({ minX: 0, minZ: 0, width: 10, length: 3 }, x => x === 9 ? null : 60), { kind: 'survey', sha256: SHA });
  assert.throws(() => layRamp(unknown, [0, 1], [9, 1], { width: 1 }), /unbekanntem Gelände/);
  assert.equal(layRamp(unknown, [0, 1], [9, 1], { width: 1, toY: 64, margin: 0 }).toY, 64);
  assert.equal(unknown.height[9 + 10], SURVEY_UNKNOWN);
});

test('Wegstufen: a stair on every one-block rise, facing up the path, across the width; blocks with valid states', () => {
  // Terrain rising one block every two columns from x = 10 on (a gentle hill), path along z = 4.
  const s = surveyOf({ minX: 0, minZ: 0, width: 30, length: 9 }, x => 60 + Math.max(0, Math.floor((x - 10) / 2)));
  const d = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  const r = layPath(d, [[0, 4], [29, 4]], { width: 3, style: 'steinweg', steps: 'stairs' });
  assert.ok(r.steps > 0);
  assert.equal(r.open, 0, 'every rise has its stair');
  assert.equal(r.stairs, r.steps * 3, 'one stair per rise and column of the width');
  const pieces = pathPieceCells(d);
  assert.equal(pieces.length, r.stairs);
  for (const c of pieces) {
    assert.equal(c.id, 'minecraft:stone_brick_stairs', 'Steinweg → Steinziegel');
    assert.equal(c.state.properties.facing, 'east', 'rises towards +x');
    assert.equal(c.state.properties.half, 'bottom');
    const gx = c.x, gz = c.z;
    assert.equal(c.y, h(d, gx, gz) + 1, 'on top of the lower column');
    assert.equal(h(d, gx + 1, gz), h(d, gx, gz) + 1, 'the next column is one higher');
  }
  // Laid the other way round: still facing up the hill.
  const back = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  layPath(back, [[29, 4], [0, 4]], { width: 1, style: 'pflaster', steps: 'stairs' });
  const bp = pathPieceCells(back);
  assert.ok(bp.length > 0 && bp.every(c => c.state.properties.facing === 'east' && c.id === 'minecraft:cobblestone_stairs'));
  // Own material; payload contains the stairs and is valid.
  const own = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  layPath(own, [[0, 4], [29, 4]], { width: 1, style: 'pfad', steps: 'stairs', material: 'eiche' });
  const blocks = designPayload(s, own, 'vanilla-java-26.3');
  validatePayload(blocks.payload);
  const stairState = blocks.payload.palette.find(p => p.id === 'minecraft:oak_stairs');
  assert.ok(stairState && stairState.properties.facing === 'east' && stairState.properties.waterlogged === 'false');
  const st = compareDesign(s, own);
  assert.equal(st.stairs, pathPieceCells(own).length);
  assert.ok(st.materials.some(m => m.id === 'minecraft:oak_stairs' && m.count === st.stairs));
  // Without steps the report names the open rises.
  const none = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  const rn = layPath(none, [[0, 4], [29, 4]], { width: 1, style: 'pfad' });
  assert.equal(rn.open, rn.steps); assert.equal(rn.stairs, 0); assert.equal(hasPieces(none), false);
});

test('Halbstufen, and pieces that no longer fit after later brush strokes are dropped', () => {
  const s = surveyOf({ minX: 0, minZ: 0, width: 20, length: 5 }, x => 60 + (x >= 10 ? 1 : 0));
  const d = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  const r = layPath(d, [[0, 2], [19, 2]], { width: 1, style: 'kiesweg', steps: 'slabs' });
  assert.equal(r.slabs, 1); assert.equal(r.open, 0);
  const slab = pathPieceCells(d);
  assert.equal(slab.length, 1);
  assert.deepEqual([slab[0].x, slab[0].y, slab[0].z, slab[0].id, slab[0].state.properties.type], [9, 61, 2, 'minecraft:cobblestone_slab', 'bottom']);
  assert.equal(d.path[at(d, 9, 2)], PATH_SLAB);
  // Raising the upper neighbour by 2: the slab leads nowhere and is left out (the column keeps its code).
  const raised = cloneDesign(d);
  applyBrush(raised, 10, 2, { tool: 'raise', radius: 0, strength: 2, falloff: 'hard' });
  assert.equal(pathPieceCells(raised).length, 0);
  // Changing the slab column itself removes the piece; painting it as meadow ends the path.
  const lowered = cloneDesign(d);
  applyBrush(lowered, 9, 2, { tool: 'lower', radius: 0, strength: 1, falloff: 'hard' });
  assert.equal(lowered.path[at(lowered, 9, 2)], 1); assert.equal(lowered.step[at(lowered, 9, 2)], 0);
  const painted = cloneDesign(d);
  applyBrush(painted, 9, 2, { tool: 'paint', radius: 0, strength: 1, falloff: 'hard', style: 'wiese' });
  assert.equal(painted.path[at(painted, 9, 2)], 0); assert.equal(painted.step[at(painted, 9, 2)], 0);
  // A path style keeps it.
  const repainted = cloneDesign(d);
  applyBrush(repainted, 9, 2, { tool: 'paint', radius: 0, strength: 1, falloff: 'hard', style: 'pflaster' });
  assert.equal(repainted.path[at(repainted, 9, 2)], PATH_SLAB);
  // Reset clears everything.
  resetToBase(repainted, s);
  assert.equal(hasPieces(repainted), false);
});

test('Brücke: deck one block over the water, railings on the open sides, water and bed untouched, map shows the deck', () => {
  // River x 10..14 (bed Y 58, water surface Y 60), banks at Y 61.
  const river = x => x >= 10 && x <= 14;
  const s = surveyOf({ minX: 0, minZ: 0, width: 25, length: 9 }, x => river(x) ? 58 : 61, river);
  const d = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  const r = layPath(d, [[2, 4], [22, 4]], { width: 3, style: 'pfad', water: 'bridge', steps: 'stairs' });
  assert.equal(r.bridge, 15); assert.equal(r.causeway, 0);
  assert.equal(r.rails, 10, 'both long sides of the deck');
  for (let x = 10; x <= 14; x++) {
    for (const z of [3, 4, 5]) { assert.equal(d.water[at(d, x, z)], 60); assert.equal(h(d, x, z), 58); }
    assert.equal(d.path[at(d, x, 4)], PATH_DECK);
    assert.equal(d.path[at(d, x, 3)], PATH_DECK_RAIL); assert.equal(d.path[at(d, x, 5)], PATH_DECK_RAIL);
  }
  // Banks stay at deck height: no stairs needed.
  assert.equal(h(d, 9, 4), 61); assert.equal(r.stairs, 0); assert.equal(r.open, 0);
  const cells = pathPieceCells(d);
  assert.equal(cellsAt(cells, 12, 61, 4)[0].id, 'minecraft:spruce_planks');
  const rail = cellsAt(cells, 12, 62, 3)[0];
  assert.equal(rail.id, 'minecraft:spruce_fence');
  assert.equal(rail.state.properties.east, 'true'); assert.equal(rail.state.properties.west, 'true'); assert.equal(rail.state.properties.south, 'false');
  assert.equal(cellsAt(cells, 10, 62, 3)[0].state.properties.west, 'false', 'the railing ends at the bank');
  // Payload: deck and railings, no air or water changes in the river.
  const blocks = designPayload(s, d, 'vanilla-java-26.3');
  validatePayload(blocks.payload);
  const st = compareDesign(s, d);
  assert.equal(st.deck, 15); assert.equal(st.water, 0); assert.equal(st.drained, 0);
  assert.equal(st.materials.find(m => m.id === 'minecraft:spruce_planks').count, 15);
  assert.equal(st.materials.find(m => m.id === 'minecraft:spruce_fence').count, 10);
  // Planned survey: the deck is the surface, the ground is the river bed.
  const planned = designedSurvey(s, d);
  const i = at(d, 12, 4);
  assert.equal(planned.surface[i], 61); assert.equal(planned.ids[planned.surfaceBlock[i]], 'minecraft:spruce_planks'); assert.equal(planned.ground[i], 58);
  // Stone bridge with walls.
  const stone = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  layPath(stone, [[2, 4], [22, 4]], { width: 3, style: 'steinweg', water: 'bridge' });
  const wall = cellsAt(pathPieceCells(stone), 12, 62, 3)[0];
  assert.equal(wall.id, 'minecraft:stone_brick_wall'); assert.equal(wall.state.properties.east, 'low'); assert.equal(wall.state.properties.up, 'true');
  // Draining the river removes the deck; the causeway default stays as before.
  applyBrush(d, 12, 4, { tool: 'drain', radius: 0, strength: 1, falloff: 'hard' });
  assert.equal(d.path[at(d, 12, 4)], 0);
  const dam = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  assert.equal(layPath(dam, [[2, 4], [22, 4]], { width: 3, style: 'pfad' }).causeway, 15);
  assert.equal(hasPieces(dam), false);
});

test('Brücke with high banks: stairs lead down onto the deck', () => {
  // Banks at Y 63, water surface 60 → deck 61; the path descends with stairs.
  const river = x => x >= 12 && x <= 16;
  const s = surveyOf({ minX: 0, minZ: 0, width: 30, length: 5 }, x => river(x) ? 58 : 63, river);
  const d = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  const r = layPath(d, [[0, 2], [29, 2]], { width: 1, style: 'pflaster', water: 'bridge', steps: 'stairs' });
  assert.equal(r.bridge, 5);
  assert.equal(r.open, 0);
  assert.equal(r.stairs, 4, 'two steps down on each side');
  const west = pathPieceCells(d).filter(c => c.x < 12 && c.id.endsWith('_stairs'));
  assert.ok(west.every(c => c.state.properties.facing === 'west'), 'west bank: rising away from the river');
});

test('file: pieces survive the round trip, files without pieces keep the old layout, broken pieces are refused', () => {
  const s = surveyOf({ minX: 0, minZ: 0, width: 20, length: 5 }, x => 60 + (x >= 10 ? 1 : 0), x => x === 4);
  const d = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  const plain = encodeDesign(d);
  assert.ok(decodeDesign(plain).step.every(v => v === 0));
  const n = d.width * d.length;
  layPath(d, [[0, 2], [19, 2]], { width: 1, style: 'pfad', steps: 'stairs', water: 'bridge' });
  assert.ok(hasPieces(d));
  const bytes = encodeDesign(d), back = decodeDesign(bytes);
  assert.equal(bytes.length - plain.length >= n * 2, true);
  assert.deepEqual([...back.path], [...d.path]); assert.deepEqual([...back.step], [...d.step]);
  assert.deepEqual(pathPieceCells(back), pathPieceCells(d));
  assert.equal(back.path[at(back, 9, 2)], PATH_STAIR + 1);
  assert.equal(back.path[at(back, 4, 2)], PATH_DECK_RAIL);
  // A stair code without a block is refused.
  const bad = cloneDesign(d); bad.step[at(bad, 9, 2)] = 0;
  assert.throws(() => decodeDesign(encodeDesign(bad)), /Wegstufe/);
});

test('every path material is a real 26.3 block with stairs, slab, deck and railing', () => {
  assert.ok(PATH_MATERIALS.length >= 8);
  for (const m of PATH_MATERIALS) for (const id of [m.stairs, m.slab, m.deck, m.rail]) assert.ok(completeState({ id, properties: {} }), `${m.id}: ${id}`);
  assert.equal(NO_WATER, -32768);
});
