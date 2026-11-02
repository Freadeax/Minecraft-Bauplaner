// Geländegestaltung: Höhen formen, Oberflächen malen, Wasser, Wege, Übergabe an Anlagen, Weltkarte und Bauteile (TERRAIN-02).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NO_WATER, SURVEY_UNKNOWN, applyBrush, applyOperation, autoPaint, buildRestore, checkIntegrity, checkProjectRecord, cloneDesign, columnAt, compareDesign, createBackup, createPlacement,
  createProject, createSurvey, decodeDesign, describeOperation, designFile, designFromSurvey, designPayload, designedSurvey, encodeDesign, estimateEarthwork, execute, EMPTY_HISTORY,
  flatSurvey, floodWater, gradeFootprints, layPath, pathLine, planRestore, readBackup, resetToBase, slopeAt, strokePoints, surveyFile, undo,
} from '../dist/domain/src/index.js';
import { validatePayload } from '../dist/voxel/src/index.js';

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
const SHA = 'a'.repeat(64);
const at = (d, x, z) => (x - d.minX) + (z - d.minZ) * d.width;
const h = (d, x, z) => d.height[at(d, x, z)];
const topId = (d, x, z) => d.ids[d.top[at(d, x, z)]];

test('design starts as the base: heights, top, filler, water; unknown columns stay unknown; flat base without survey', () => {
  const s = surveyOf({ minX: 10, minZ: 20, width: 6, length: 5 }, (x, z) => x === 15 && z === 24 ? null : 60 + (x - 10), (x, z) => x === 10 && z === 20);
  const d = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  assert.equal(h(d, 12, 21), 62);
  assert.equal(topId(d, 12, 21), 'minecraft:grass_block');
  assert.equal(d.ids[d.fill[at(d, 12, 21)]], 'minecraft:dirt');
  assert.equal(d.water[at(d, 10, 20)], 62);
  assert.equal(d.water[at(d, 11, 20)], NO_WATER);
  assert.equal(h(d, 15, 24), SURVEY_UNKNOWN);
  const st = compareDesign(s, d);
  assert.equal(st.changed, 0); assert.equal(st.known, 29); assert.deepEqual(st.materials, []);
  assert.equal(designPayload(s, d, 'test'), null);
  const flat = flatSurvey({ minX: 0, minZ: 0, width: 4, length: 4 }, 70, 'minecraft:overworld');
  const fd = designFromSurvey(flat, { kind: 'flat', y: 70 });
  assert.ok(fd.height.every(v => v === 70));
});

test('brushes: raise/lower with falloff, flatten to a target, smooth, terraces, soften cliffs, unknown never touched, world limits', () => {
  const s = surveyOf({ minX: 0, minZ: 0, width: 21, length: 21 }, (x, z) => x === 0 && z === 0 ? null : 64);
  const d = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  // Hard brush: every column within the radius goes up by exactly the strength.
  applyBrush(d, 10, 10, { tool: 'raise', radius: 3, strength: 4, falloff: 'hard' });
  assert.equal(h(d, 10, 10), 68); assert.equal(h(d, 13, 10), 68); assert.equal(h(d, 14, 10), 64); assert.equal(h(d, 12, 12), 68);
  // Soft brush: full in the centre, less at the rim.
  const soft = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  applyBrush(soft, 10, 10, { tool: 'raise', radius: 4, strength: 8, falloff: 'soft' });
  assert.equal(h(soft, 10, 10), 72);
  assert.ok(h(soft, 13, 10) > 64 && h(soft, 13, 10) < 72, `rim ${h(soft, 13, 10)}`);
  // Lower and flatten.
  applyBrush(d, 10, 10, { tool: 'lower', radius: 0, strength: 10, falloff: 'hard' });
  assert.equal(h(d, 10, 10), 58);
  applyBrush(d, 10, 10, { tool: 'flatten', radius: 5, strength: 1, falloff: 'hard', target: 66 });
  for (const [x, z] of [[10, 10], [13, 10], [6, 8]]) assert.equal(h(d, x, z), 66);
  // Smooth pulls a spike towards its neighbours.
  const sp = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  sp.height[at(sp, 5, 5)] = 82;
  applyBrush(sp, 5, 5, { tool: 'smooth', radius: 0, strength: 1, falloff: 'hard' });
  assert.equal(h(sp, 5, 5), 66);
  // Terraces snap to multiples of the step.
  const tr = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  tr.height[at(tr, 4, 4)] = 66; tr.height[at(tr, 5, 4)] = 70;
  applyBrush(tr, 4, 4, { tool: 'terrace', radius: 2, strength: 1, falloff: 'hard', step: 8 });
  assert.equal(h(tr, 4, 4), 64); assert.equal(h(tr, 5, 4), 72);
  // Soften: a 10-block cliff becomes steps of at most two.
  const cl = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  for (let z = 0; z < 21; z++) for (let x = 11; x < 21; x++) if (h(cl, x, z) !== SURVEY_UNKNOWN) cl.height[at(cl, x, z)] = 74;
  applyBrush(cl, 12, 10, { tool: 'soften', radius: 6, strength: 2, falloff: 'hard' });
  assert.ok(slopeAt(cl, 11, 10) <= 2, `slope ${slopeAt(cl, 11, 10)}`);
  // Unknown column untouched, limits clamp.
  applyBrush(d, 0, 0, { tool: 'raise', radius: 2, strength: 4, falloff: 'hard' });
  assert.equal(h(d, 0, 0), SURVEY_UNKNOWN);
  applyBrush(d, 20, 20, { tool: 'raise', radius: 0, strength: 32, falloff: 'hard' });
  for (let k = 0; k < 10; k++) applyBrush(d, 20, 20, { tool: 'raise', radius: 0, strength: 32, falloff: 'hard' });
  assert.equal(h(d, 20, 20), 319);
  // Strokes cover the line with overlapping dabs.
  assert.deepEqual(strokePoints(0, 0, 4, 0, 2), [[1, 0], [2, 0], [3, 0], [4, 0]]);
});

test('paint: styles are deterministic per column, filters by height/slope/water, paths are marked', () => {
  const s = surveyOf({ minX: 0, minZ: 0, width: 12, length: 12 }, x => 60 + (x >= 6 ? 6 : 0));
  const a = designFromSurvey(s, { kind: 'survey', sha256: SHA }), b = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  for (const d of [a, b]) applyBrush(d, 6, 6, { tool: 'paint', radius: 6, strength: 1, falloff: 'hard', style: 'wald' });
  assert.deepEqual([...a.top].map(i => a.ids[i]), [...b.top].map(i => b.ids[i]));
  const kinds = new Set([...a.top].map(i => a.ids[i]));
  assert.ok(kinds.has('minecraft:podzol') && kinds.has('minecraft:coarse_dirt'), [...kinds].join());
  // Only steep columns become rock.
  const f = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  applyBrush(f, 6, 6, { tool: 'paint', radius: 8, strength: 1, falloff: 'hard', style: 'fels', filter: { minSlope: 3 } });
  assert.ok(['minecraft:stone', 'minecraft:andesite', 'minecraft:cobblestone'].includes(topId(f, 5, 6)));
  assert.equal(topId(f, 2, 6), 'minecraft:grass_block');
  assert.equal(topId(f, 9, 6), 'minecraft:grass_block');
  // Only above Y 62.
  const g = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  applyBrush(g, 6, 6, { tool: 'paint', radius: 8, strength: 1, falloff: 'hard', style: 'schnee', filter: { minY: 62 } });
  assert.equal(topId(g, 9, 6), 'minecraft:snow_block'); assert.equal(topId(g, 2, 6), 'minecraft:grass_block');
  // A path style marks the columns.
  applyBrush(g, 2, 2, { tool: 'paint', radius: 0, strength: 1, falloff: 'hard', style: 'kiesweg' });
  assert.equal(g.path[at(g, 2, 2)], 1); assert.equal(topId(g, 2, 2), 'minecraft:gravel');
});

test('water: bucket fill stays in the basin, reports open edges and blocks; drain and raising remove it', () => {
  // Basin 3×3 at Y 60 inside a rim at 64; outside the rim the ground is 58 (open towards the edge).
  const s = surveyOf({ minX: 0, minZ: 0, width: 9, length: 9 }, (x, z) => x >= 3 && x <= 5 && z >= 3 && z <= 5 ? 60 : x >= 2 && x <= 6 && z >= 2 && z <= 6 ? 64 : 58);
  const d = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  const r = floodWater(d, 4, 4, 63);
  assert.deepEqual(r, { filled: 9, blocks: 27, reachedEdge: false });
  assert.equal(d.water[at(d, 4, 4)], 63); assert.equal(d.water[at(d, 2, 2)], NO_WATER); assert.equal(d.water[at(d, 0, 0)], NO_WATER);
  // Above the rim the water would run out: everything below 65 is filled and the edge is reported.
  const open = floodWater(cloneDesign(d), 4, 4, 65);
  assert.equal(open.reachedEdge, true); assert.equal(open.filled, 81);
  // Start above the level: nothing.
  assert.equal(floodWater(d, 2, 2, 63).filled, 0);
  // Water blocks in the comparison and the payload.
  const st = compareDesign(s, d);
  assert.equal(st.water, 27); assert.equal(st.changed, 9);
  // Raising ground above the water removes it; drain brush removes it.
  applyBrush(d, 3, 3, { tool: 'raise', radius: 0, strength: 4, falloff: 'hard' });
  assert.equal(d.water[at(d, 3, 3)], NO_WATER);
  applyBrush(d, 4, 4, { tool: 'drain', radius: 0, strength: 1, falloff: 'hard' });
  assert.equal(d.water[at(d, 4, 4)], NO_WATER);
  assert.throws(() => floodWater(d, 4, 4, 400), /Wasserspiegel/);
});

test('paths: 4-connected centre line, slope limited to one block per step, levelled across the width, causeway over water', () => {
  assert.deepEqual(pathLine([[0, 0], [2, 2]]), [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]]);
  // Hill rising 2 blocks per column along x; a water column at x = 3.
  const s = surveyOf({ minX: 0, minZ: 0, width: 30, length: 9 }, x => 60 + Math.min(20, 2 * Math.max(0, x - 10)), x => x === 3);
  const d = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  const r = layPath(d, [[0, 4], [29, 4]], { width: 3, style: 'pfad' });
  assert.equal(r.length, 30); assert.equal(r.columns, 90);
  assert.ok(r.steps > 0 && r.rise <= 29);
  for (let x = 1; x < 30; x++) assert.ok(Math.abs(h(d, x, 4) - h(d, x - 1, 4)) <= 1, `step at ${x}`);
  for (let x = 0; x < 30; x++) { assert.equal(h(d, x, 3), h(d, x, 4)); assert.equal(h(d, x, 5), h(d, x, 4)); assert.equal(d.path[at(d, x, 5)], 1); }
  assert.equal(d.path[at(d, 5, 2)], 0);
  // Causeway: the water column under the path is dry and at least at the old water surface.
  assert.equal(d.water[at(d, 3, 4)], NO_WATER); assert.ok(h(d, 3, 4) >= 61);
  assert.equal(r.causeway, 3);
  assert.ok(r.cut > 0 && r.fill > 0);
  assert.throws(() => layPath(d, [[0, 0], [3, 0]], { width: 1, style: 'wiese' }), /kein Wegbelag/);
});

test('auto paint: rock on slopes, snow above a height, beach next to water, paths kept', () => {
  const s = surveyOf({ minX: 0, minZ: 0, width: 20, length: 6 }, x => x < 7 ? 60 : x < 12 ? 60 + (x - 6) * 4 : 100, x => x < 2);
  const d = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  d.path[at(d, 15, 3)] = 1;
  const n = autoPaint(d, { steep: 3, snowY: 90, beach: 2, rest: 'wiese' });
  assert.ok(n > 0);
  assert.equal(topId(d, 0, 3), 'minecraft:sand');
  assert.equal(topId(d, 3, 3), 'minecraft:sand');
  assert.equal(topId(d, 4, 3), 'minecraft:grass_block');
  assert.ok(['minecraft:stone', 'minecraft:andesite', 'minecraft:cobblestone'].includes(topId(d, 8, 3)));
  assert.equal(topId(d, 17, 3), 'minecraft:snow_block');
  assert.equal(topId(d, 15, 3), 'minecraft:grass_block');
});

test('grading under buildings: ground one below each lowest block, blended margin, water removed; earthwork afterwards zero', () => {
  const s = surveyOf({ minX: 100, minZ: 100, width: 30, length: 30 }, (x, z) => 60 + Math.floor((x - 100) / 3) + (z % 2));
  const d = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  const bases = [];
  for (let z = 110; z < 116; z++) for (let x = 110; x < 118; x++) bases.push({ x, z, y: 66 });
  const before = estimateEarthwork(bases, s);
  assert.ok(before.cut > 0 || before.fill > 0);
  const r = gradeFootprints(d, [...bases, { x: 0, z: 0, y: 70 }], 4);
  assert.equal(r.outside, 1); assert.equal(r.graded > 0, true); assert.ok(r.blended > 0);
  for (const b of bases) assert.equal(h(d, b.x, b.z), 65);
  const after = estimateEarthwork(bases, designedSurvey(s, d));
  assert.equal(after.cut, 0); assert.equal(after.fill, 0); assert.equal(after.hanging, 0); assert.equal(after.carried, bases.length);
  // The blend ring sits between the site and the untouched terrain.
  const ring = h(d, 109, 112), far = h(d, 104, 112);
  assert.equal(far, s.ground[at(d, 104, 112)]);
  assert.ok(Math.abs(ring - 65) < Math.abs(s.ground[at(d, 109, 112)] - 65) || ring === 65);
});

test('blocks: filler and top for fill, explicit air for cut and old plants, water, palette with game states; matches the comparison', () => {
  const s = surveyOf({ minX: 0, minZ: 0, width: 5, length: 1 }, () => 64, x => x === 4);
  const d = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  d.height[0] = 67;                       // +3: dirt 65, 66, grass 67
  d.height[1] = 62;                       // -2: air 63, 64, grass at 62
  applyBrush(d, 2, 0, { tool: 'paint', radius: 0, strength: 1, falloff: 'hard', style: 'strand' }); // repaint only: sand at 64
  applyBrush(d, 4, 0, { tool: 'drain', radius: 0, strength: 1, falloff: 'hard' });                  // water 65, 66 → air
  const st = compareDesign(s, d);
  assert.equal(st.changed, 4); assert.equal(st.raised, 1); assert.equal(st.lowered, 1); assert.equal(st.repainted, 1); assert.equal(st.drained, 1);
  assert.equal(st.cut, 2); assert.equal(st.fill, 3);
  const out = designPayload(s, d, 'test');
  validatePayload(out.payload);
  assert.deepEqual(out.origin, [0, 62, 0]);
  const cells = out.payload.cells.map(c => [c.position[0], c.position[1] + 62, c.kind, out.payload.palette[c.paletteIndex].id]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  assert.deepEqual(cells, [
    [0, 65, 'block', 'minecraft:dirt'], [0, 66, 'block', 'minecraft:dirt'], [0, 67, 'block', 'minecraft:grass_block'],
    [1, 62, 'block', 'minecraft:grass_block'], [1, 63, 'air', 'minecraft:air'], [1, 64, 'air', 'minecraft:air'],
    [2, 64, 'block', 'minecraft:sand'],
    [4, 65, 'air', 'minecraft:air'], [4, 66, 'air', 'minecraft:air'],
  ]);
  assert.equal(out.blocks, 5); assert.equal(out.air, 4);
  assert.deepEqual(out.payload.palette.find(p => p.id === 'minecraft:grass_block').properties, { snowy: 'false' });
  assert.deepEqual(st.materials, [{ id: 'minecraft:dirt', count: 2 }, { id: 'minecraft:grass_block', count: 2 }, { id: 'minecraft:sand', count: 1 }]);
  // Water from the design: blocks with level 0.
  floodWater(d, 4, 0, 66);
  const w = designPayload(s, d, 'test');
  assert.deepEqual(w.payload.palette.find(p => p.id === 'minecraft:water').properties, { level: '0' });
});

test('designed survey: world map and Anlagen read the planned terrain; unchanged columns keep the measured surface', () => {
  const s = surveyOf({ minX: 0, minZ: 0, width: 4, length: 4 }, () => 64, (x, z) => x === 3 && z === 3);
  const d = designFromSurvey(s, { kind: 'survey', sha256: SHA });
  d.height[at(d, 1, 1)] = 70;
  d.water[at(d, 0, 3)] = 66;
  const p = designedSurvey(s, d);
  assert.deepEqual(columnAt(p, 1, 1), { ground: 70, surface: 70, groundId: 'minecraft:grass_block', surfaceId: 'minecraft:grass_block', fluid: false });
  assert.equal(columnAt(p, 0, 3).fluid, true); assert.equal(columnAt(p, 0, 3).surface, 66);
  assert.deepEqual(columnAt(p, 3, 3), columnAt(s, 3, 3));
  assert.deepEqual(columnAt(p, 2, 2), columnAt(s, 2, 2));
  resetToBase(d, s);
  assert.equal(compareDesign(s, d).changed, 0);
  assert.throws(() => designedSurvey(surveyOf({ minX: 1, minZ: 0, width: 4, length: 4 }, () => 64), d), /verschiedene Bereiche/);
});

test('design file: exact round trip, stable address; terrainDesign.set undoable, in backups with its base, reported when missing', async () => {
  const s = surveyOf({ minX: 0, minZ: 0, width: 6, length: 6 }, () => 64);
  const { original: surveyOriginal, reference: surveyRef } = await surveyFile(s, 'Bauplatz');
  const d = designFromSurvey(s, { kind: 'survey', sha256: surveyRef.sha256 });
  applyBrush(d, 2, 2, { tool: 'raise', radius: 1, strength: 3, falloff: 'hard' });
  layPath(d, [[0, 5], [5, 5]], { width: 1, style: 'pflaster' });
  floodWater(d, 5, 0, 64); // nothing (ground at 64)
  const back = decodeDesign(encodeDesign(d));
  for (const k of ['height', 'top', 'fill', 'water', 'path']) assert.deepEqual(back[k], d[k], k);
  assert.deepEqual(back.ids, d.ids); assert.deepEqual(back.base, d.base);
  const a = await designFile(d, s, 'Bauplatz'), b = await designFile(back, s, 'Bauplatz');
  assert.equal(a.original.sha256, b.original.sha256);
  assert.equal(a.reference.changed, 15);
  assert.equal(a.original.mediaType, 'application/x-bauplaner-terrain-design');
  const bytes = encodeDesign(d); bytes[0] = 0;
  assert.throws(() => decodeDesign(bytes), /keine Bauplaner-Geländegestaltung/);
  assert.throws(() => decodeDesign(encodeDesign(d).slice(0, -1)), /Datengröße/);

  let project = createProject({ name: 'Bauplatz' });
  project = applyOperation(project, { kind: 'world.set', world: createPlacement([0, 65, 0]) }).project;
  project = applyOperation(project, { kind: 'terrain.set', terrain: surveyRef }).project;
  const r = execute(project, EMPTY_HISTORY, { kind: 'terrainDesign.set', design: a.reference, label: 'Geländegestaltung gespeichert' });
  assert.equal(r.project.terrainDesign.sha256, a.reference.sha256);
  assert.equal(describeOperation({ kind: 'terrainDesign.set', design: null }), 'Geländegestaltung entfernt');
  assert.equal(undo(r.project, r.history).project.terrainDesign, undefined);
  assert.throws(() => applyOperation(project, { kind: 'terrainDesign.set', design: { ...a.reference, base: { kind: 'flat', y: 99999 } } }), /Grundlage/);
  checkProjectRecord(r.project);
  assert.throws(() => checkProjectRecord({ ...r.project, terrainDesign: { ...a.reference, changed: -1 } }), /geänderter Spalten/);

  // Backup: the design and the survey it was made on, even after the project's survey was renewed elsewhere.
  const renewed = { ...r.project, terrain: undefined };
  const originals = new Map([[surveyOriginal.sha256, surveyOriginal], [a.original.sha256, a.original]]);
  const source = { projects: [renewed], assets: [], versions: new Map(), getOriginal: async sha => originals.get(sha) ?? null };
  const backup = await readBackup(JSON.stringify(await createBackup(source, 'all')));
  assert.deepEqual(backup.originals.map(o => o.sha256).sort(), [...originals.keys()].sort());
  assert.deepEqual(backup.missingOriginals, []);
  const plan = planRestore(backup, { projects: [], assets: [], versions: new Map(), originalHashes: new Set() });
  assert.equal(buildRestore(plan).originals.length, 2);
  const report = await checkIntegrity({ projects: [r.project], assets: [], versions: [], originalHashes: [surveyOriginal.sha256] });
  assert.ok(report.findings.some(f => f.code === 'ORIGINAL_MISSING' && /Geländegestaltung/.test(f.message)));
  assert.ok(!report.findings.some(f => /Geländeaufnahme unter/.test(f.message)));
});
