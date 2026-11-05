// Basisplaner auf Gelände (TERRAIN-03-S06): Wasserseite und Uferlinie aus der Geländeaufnahme.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createBuildingLibrary, createSurvey, fitBaseShore, layoutBase, shoreSides, suggestWaterSide, SURVEY_UNKNOWN } from '../dist/domain/src/index.js';

const buildings = await createBuildingLibrary();
const lib = { assets: buildings.assets, versions: new Map(buildings.versions.map(v => [v.id, v])) };
const ORIGIN = [1000, 64, -2000];

/** Survey around a layout extent (plus a margin) with grass at y 63 and water where `water(x, z)` (world). */
function surveyAround(layout, water, { margin = 90, known = () => true } = {}) {
  const e = layout.extent;
  const area = { minX: ORIGIN[0] + e.x0 - margin, minZ: ORIGIN[2] + e.z0 - margin, width: e.x1 - e.x0 + 2 * margin, length: e.z1 - e.z0 + 2 * margin };
  const n = area.width * area.length;
  const ground = new Int16Array(n), surface = new Int16Array(n), gb = new Uint16Array(n), sb = new Uint16Array(n);
  for (let z = 0; z < area.length; z++) for (let x = 0; x < area.width; x++) {
    const i = x + z * area.width, wx = area.minX + x, wz = area.minZ + z;
    if (!known(wx, wz)) { ground[i] = SURVEY_UNKNOWN; surface[i] = SURVEY_UNKNOWN; continue; }
    if (water(wx, wz)) { ground[i] = 58; gb[i] = 1; surface[i] = 62; sb[i] = 2; } else { ground[i] = 63; gb[i] = 1; surface[i] = 63; sb[i] = 1; }
  }
  return createSurvey({ ...area, ground, surface, groundBlock: gb, surfaceBlock: sb, ids: ['?', 'minecraft:grass_block', 'minecraft:water'] },
    { dimension: 'minecraft:overworld', readAt: '2026-11-05T10:00:00.000Z' });
}
const worldLine = (layout, offset = [0, 0]) => layout.water.line + (layout.water.side === 'nord' || layout.water.side === 'sued' ? ORIGIN[2] + offset[1] : ORIGIN[0] + offset[0]);
/** World water test for a straight coast `d` blocks seaward of the planned line. */
function coast(layout, d, offset = [0, 0]) {
  const l = worldLine(layout, offset);
  switch (layout.water.side) {
    case 'sued': return (x, z) => z >= l + d;
    case 'nord': return (x, z) => z <= l - d;
    case 'ost': return (x, z) => x >= l + d;
    case 'west': return (x, z) => x <= l - d;
  }
}

test('coast exactly on the planned shore: side found, no shift, piers in water, houses dry – for all four sides', () => {
  for (const side of ['sued', 'nord', 'ost', 'west']) {
    const layout = layoutBase(lib, { template: 'kuestenbasis', water: side });
    assert.equal(layout.water.side, side);
    const fit = fitBaseShore(layout, { survey: surveyAround(layout, coast(layout, 0)), origin: ORIGIN });
    assert.equal(fit.suggested, side, `${side}: ${fit.reason}`);
    assert.equal(fit.plannedLine, worldLine(layout));
    assert.equal(fit.realLine, fit.plannedLine, side);
    assert.deepEqual(fit.shift, [0, 0]);
    assert.equal(fit.rows.found, fit.rows.searched);
    assert.equal(fit.now.wet, 0, `${side}: Gebäude im Wasser`);
    assert.equal(fit.now.dry, 0, `${side}: Stege an Land`);
    assert.ok(fit.now.known > 0);
  }
});

test('real coast further out: shift onto the shore along the water axis, piers dry before and wet after', () => {
  for (const [side, d] of [['sued', 7], ['west', 5], ['nord', -4]]) {
    const layout = layoutBase(lib, { template: 'kuestenbasis', water: side });
    const fit = fitBaseShore(layout, { survey: surveyAround(layout, coast(layout, d)), origin: ORIGIN });
    const signed = side === 'sued' || side === 'ost' ? d : -d;
    assert.equal(fit.realLine - fit.plannedLine, signed, side);
    assert.deepEqual(fit.shift, side === 'sued' || side === 'nord' ? [0, signed] : [signed, 0]);
    if (d > 0) { assert.ok(fit.now.dry > 0, `${side}: Stege stehen vorher an Land`); assert.equal(fit.now.wet, 0); }
    else assert.ok(fit.now.wet > 0, `${side}: Ufergebäude stehen vorher im Wasser`);
    assert.equal(fit.shifted.dry, 0, side); assert.equal(fit.shifted.wet, 0, side);
    // Applying the shift as offset gives a fit without further shift.
    const again = fitBaseShore(layout, { survey: surveyAround(layout, coast(layout, d)), origin: ORIGIN, offset: fit.shift });
    assert.deepEqual(again.shift, [0, 0]);
    assert.equal(again.now.dry + again.now.wet, 0);
  }
});

test('too far away: no shift, a note instead; coast missing: note', () => {
  const layout = layoutBase(lib, { template: 'kuestenbasis', water: 'sued' });
  const far = fitBaseShore(layout, { survey: surveyAround(layout, coast(layout, 60)), origin: ORIGIN });
  assert.deepEqual(far.shift, [0, 0]);
  assert.ok(far.notes.some(n => /an anderer Stelle/.test(n)), far.notes.join(' | '));
  const dry = fitBaseShore(layout, { survey: surveyAround(layout, () => false), origin: ORIGIN });
  assert.equal(dry.realLine, null);
  assert.equal(dry.suggested, 'keine');
  assert.ok(dry.notes.some(n => /kein Wasser gefunden/.test(n)));
  assert.ok(dry.notes.some(n => /kein Wasser/.test(n)));
});

test('inland layout: water beside it is suggested, nothing beside it means „keine“', () => {
  const layout = layoutBase(lib, { template: 'starterbasis', water: 'keine' });
  assert.equal(layout.water, null);
  const e = layout.extent, east = ORIGIN[0] + e.x1 + 2;
  const fit = fitBaseShore(layout, { survey: surveyAround(layout, x => x >= east), origin: ORIGIN });
  assert.equal(fit.suggested, 'ost', fit.reason);
  assert.ok(fit.notes.some(n => /Osten/.test(n)));
  assert.equal(fitBaseShore(layout, { survey: surveyAround(layout, () => false), origin: ORIGIN }).suggested, 'keine');
});

test('unclear pictures are not decided: water on two sides, too little water, survey too small', () => {
  const layout = layoutBase(lib, { template: 'starterbasis', water: 'keine' });
  const e = layout.extent, east = ORIGIN[0] + e.x1, west = ORIGIN[0] + e.x0 - 1;
  const both = fitBaseShore(layout, { survey: surveyAround(layout, x => x >= east || x <= west), origin: ORIGIN });
  assert.equal(both.suggested, null);
  assert.match(both.reason, /mehreren Seiten/);
  // A narrow creek (two blocks) east: water in every row, but no coast.
  const creek = fitBaseShore(layout, { survey: surveyAround(layout, x => x === east + 3 || x === east + 4), origin: ORIGIN });
  assert.equal(creek.suggested, null);
  assert.match(creek.reason, /Bach oder Teich/);
  // Open water only beside a third of the base: not decided either.
  const z0 = ORIGIN[2] + e.z0, third = Math.floor((e.z1 - e.z0) / 3);
  const bay = fitBaseShore(layout, { survey: surveyAround(layout, (x, z) => x >= east && z < z0 + third), origin: ORIGIN });
  assert.equal(bay.suggested, null);
  assert.match(bay.reason, /stellenweise/);
  // A coast 28 blocks away is still found, with its distance.
  const far = fitBaseShore(layout, { survey: surveyAround(layout, x => x >= east + 28), origin: ORIGIN });
  assert.equal(far.suggested, 'ost');
  assert.match(far.reason, /28 Blöcke hinter der Basis/);
  const blind = fitBaseShore(layout, { survey: surveyAround(layout, () => false, { known: (x, z) => x >= ORIGIN[0] + e.x0 && x < ORIGIN[0] + e.x1 && z >= ORIGIN[2] + e.z0 && z < ORIGIN[2] + e.z1 }), origin: ORIGIN });
  assert.equal(blind.suggested, null);
  assert.match(blind.reason, /reicht nicht/);
});

test('sides count rows across the base; water running out of the survey is open; bad input is refused', () => {
  const layout = layoutBase(lib, { template: 'starterbasis', water: 'keine' });
  const s = surveyAround(layout, () => true);
  const e = layout.extent;
  const sides = shoreSides(s, { x0: ORIGIN[0] + e.x0, x1: ORIGIN[0] + e.x1, z0: ORIGIN[2] + e.z0, z1: ORIGIN[2] + e.z1 });
  assert.deepEqual(sides.map(x => x.side), ['nord', 'ost', 'sued', 'west']);
  assert.deepEqual(sides.map(x => x.rows), [e.x1 - e.x0, e.z1 - e.z0, e.x1 - e.x0, e.z1 - e.z0]);
  for (const x of sides) { assert.equal(x.share, 1); assert.equal(x.open, x.rows); assert.equal(x.distance, 0); }
  // Only 3 water columns before the survey ends: still open water.
  const edge = surveyAround(layout, x => x >= ORIGIN[0] + e.x1 + 87, { margin: 90 });
  const east = shoreSides(edge, { x0: ORIGIN[0] + e.x0 + 30, x1: ORIGIN[0] + e.x1, z0: ORIGIN[2] + e.z0, z1: ORIGIN[2] + e.z1 })[1];
  assert.equal(east.open, 0, 'zu weit für die Suche');
  const near = shoreSides(edge, { x0: ORIGIN[0] + e.x0, x1: ORIGIN[0] + e.x1 + 30, z0: ORIGIN[2] + e.z0, z1: ORIGIN[2] + e.z1 })[1];
  assert.equal(near.open, near.rows);
  assert.equal(near.distance, 57);
  assert.equal(suggestWaterSide([]).side, null);
  assert.throws(() => fitBaseShore(layout, { survey: s, origin: ORIGIN, offset: [0.5, 0] }), /ganzzahlig/);
});
