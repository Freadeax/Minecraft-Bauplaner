// Gelände-Werkzeuge auf dem Projektgelände (TERRAIN-05): Verwittern, Formstempel, Fluss, Maske für alle Pinsel.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NO_WATER, SURVEY_UNKNOWN, applyBrush, carveRiver, cloneDesign, designFromSurvey, erodeTerrain, flatSurvey, footprintMask, maskCount, stampShape,
} from '../../../dist/domain/src/index.js';

const at = (d, x, z) => (x - d.minX) + (z - d.minZ) * d.width;
const h = (d, x, z) => d.height[at(d, x, z)];
const sum = d => { let s = 0; for (const v of d.height) if (v !== SURVEY_UNKNOWN) s += v; return s; };
const flat = (w, l, y = 64, minX = 0, minZ = 0) => designFromSurvey(flatSurvey({ minX, minZ, width: w, length: l }, y, 'minecraft:overworld'), { kind: 'flat', y });
const maxStep = d => {
  let m = 0;
  for (let z = 0; z < d.length; z++) for (let x = 0; x < d.width; x++) {
    const a = d.height[x + z * d.width], ok = v => v !== SURVEY_UNKNOWN && a !== SURVEY_UNKNOWN;
    if (x + 1 < d.width && ok(d.height[x + 1 + z * d.width])) m = Math.max(m, Math.abs(a - d.height[x + 1 + z * d.width]));
    if (z + 1 < d.length && ok(d.height[x + (z + 1) * d.width])) m = Math.max(m, Math.abs(a - d.height[x + (z + 1) * d.width]));
  }
  return m;
};

test('Verwittern: a cliff crumbles to the slope limit, volume stays, protected and unknown columns stay, deterministic', () => {
  const d = flat(24, 8, 60);
  for (let z = 0; z < 8; z++) for (let x = 12; x < 24; x++) d.height[x + z * 24] = 72;
  d.height[at(d, 23, 7)] = SURVEY_UNKNOWN;
  const before = sum(d), twin = cloneDesign(d);
  const r = erodeTerrain(d, { passes: 32, talus: 2 });
  assert.ok(r.columns > 0 && r.moved > 0);
  assert.equal(sum(d), before, 'earth only moves, it does not vanish');
  assert.ok(maxStep(d) <= 4, `steps ${maxStep(d)}`);
  assert.equal(h(d, 23, 7), SURVEY_UNKNOWN);
  erodeTerrain(twin, { passes: 32, talus: 2 });
  assert.deepEqual(Array.from(twin.height), Array.from(d.height), 'same input, same result');
  // Protected columns (a building site) do not move.
  const p = flat(24, 8, 60);
  for (let z = 0; z < 8; z++) for (let x = 12; x < 24; x++) p.height[x + z * 24] = 72;
  const mask = new Uint8Array(24 * 8); for (let z = 0; z < 8; z++) mask[12 + z * 24] = 1;
  erodeTerrain(p, { passes: 32, talus: 1, protect: mask });
  for (let z = 0; z < 8; z++) assert.equal(h(p, 12, z), 72);
});

test('Verwittern: only inside the brush circle; water and path columns stay; rain washes gullies and keeps the volume', () => {
  const d = flat(40, 40, 60);
  for (let z = 0; z < 40; z++) for (let x = 0; x < 40; x++) d.height[x + z * 40] = 60 + Math.max(0, 20 - x);
  d.water[at(d, 30, 30)] = 63; d.path[at(d, 5, 5)] = 1;
  const before = sum(d);
  erodeTerrain(d, { passes: 4, talus: 1, region: { x: 10, z: 10, radius: 4 } });
  assert.equal(h(d, 30, 5), 60, 'outside the circle nothing moves');
  assert.equal(h(d, 5, 5), 75, 'path column kept');
  assert.equal(sum(d), before);
  const rainy = flat(40, 40, 60);
  for (let z = 0; z < 40; z++) for (let x = 0; x < 40; x++) rainy.height[x + z * 40] = 60 + Math.max(0, 40 - 2 * x);
  const b2 = sum(rainy);
  const r = erodeTerrain(rainy, { passes: 1, talus: 8, rain: 3 });
  assert.ok(r.gullies > 0, 'droplets washed earth away');
  assert.equal(sum(rainy), b2, 'rain moves earth downhill, volume stays');
  assert.equal(rainy.water[at(rainy, 30, 30)], NO_WATER);
});

test('Formstempel: hill, mountain, crater, hollow and plateau; unknown stays; report counts cut and fill', () => {
  const hill = flat(41, 41, 64, -20, -20);
  const r = stampShape(hill, 0, 0, { shape: 'huegel', radius: 10, height: 12 });
  assert.equal(h(hill, 0, 0), 76); assert.equal(h(hill, 15, 0), 64); assert.ok(h(hill, 6, 0) > 64 && h(hill, 6, 0) < 76);
  assert.equal(r.peakY, 76); assert.ok(r.fill > 0 && r.cut === 0);

  const hollow = flat(41, 41, 64, -20, -20);
  stampShape(hollow, 0, 0, { shape: 'mulde', radius: 8, height: 6 });
  assert.equal(h(hollow, 0, 0), 58);

  const crater = flat(41, 41, 64, -20, -20);
  stampShape(crater, 0, 0, { shape: 'krater', radius: 12, height: 10 });
  assert.equal(h(crater, 0, 0), 57, 'bowl in the middle');
  const rim = Math.max(...[9, 10].map(x => h(crater, x, 0)));
  assert.ok(rim > 64, `rim ${rim}`);

  const mountain = flat(61, 61, 64, -30, -30);
  const m = stampShape(mountain, 0, 0, { shape: 'berg', radius: 24, height: 40 });
  assert.ok(m.peakY >= 64 + 30 && m.peakY <= 64 + 48, `peak ${m.peakY}`);
  const twin = flat(61, 61, 64, -30, -30); stampShape(twin, 0, 0, { shape: 'berg', radius: 24, height: 40 });
  assert.deepEqual(Array.from(twin.height), Array.from(mountain.height));

  const plateau = flat(41, 41, 64, -20, -20);
  plateau.height[at(plateau, 3, 0)] = 80; plateau.height[at(plateau, 0, 5)] = SURVEY_UNKNOWN;
  stampShape(plateau, 0, 0, { shape: 'plateau', radius: 10, height: 6 });
  assert.equal(h(plateau, 0, 0), 70); assert.equal(h(plateau, 2, 0), 70); assert.equal(h(plateau, 3, 0), 70, 'higher ground inside is levelled too');
  assert.equal(h(plateau, 0, 5), SURVEY_UNKNOWN);
  assert.throws(() => stampShape(plateau, 0, 5, { shape: 'plateau', radius: 4, height: 3 }), /unbekanntem Gelände/);
});

test('Fluss: water never rises downstream, bed below the water, banks slope or embank, path pieces cleared, bed painted', () => {
  // Ground falls from west (Y 80) to east (Y 60); a hump at x=20 must not dam the river.
  const d = flat(48, 21, 60, 0, -10);
  for (let z = 0; z < 21; z++) for (let x = 0; x < 48; x++) d.height[x + z * 48] = 80 - Math.floor(x * 20 / 47) + (x === 20 ? 6 : 0);
  d.path[at(d, 30, 0)] = 2; d.step[at(d, 30, 0)] = 1;
  const r = carveRiver(d, [[1, 0], [46, 0]], { width: 5, depth: 3, bank: 3, bed: 'kies' });
  assert.ok(r.fromY >= r.toY, 'never rises downstream');
  let prev = Infinity;
  for (let x = 1; x <= 46; x++) {
    const w = d.water[at(d, x, 0)];
    assert.notEqual(w, NO_WATER, `water at ${x}`);
    assert.ok(w <= prev, `level at ${x} rises: ${w} > ${prev}`); prev = w;
    assert.ok(h(d, x, 0) <= w - 3, `bed at ${x}`);
    assert.ok(h(d, x, 2) <= w - 1, `edge bed at ${x}`);
  }
  assert.equal(d.path[at(d, 30, 0)], 0); assert.equal(d.step[at(d, 30, 0)], 0);
  assert.ok(['minecraft:gravel', 'minecraft:stone', 'minecraft:cobblestone'].includes(d.ids[d.top[at(d, 10, 0)]]));
  assert.ok(r.columns >= 46 * 5 && r.water > 0 && r.cut > 0);
  // Banks: ground beside the water is never lower than the water next to it.
  for (let x = 2; x <= 45; x++) assert.ok(h(d, x, 3) >= d.water[at(d, x, 0)], `bank at ${x}`);

  const low = flat(30, 15, 62, 0, 0);
  const e = carveRiver(low, [[2, 7], [27, 7]], { width: 3, depth: 2, bank: 2, startY: 64 });
  assert.equal(e.fromY, 62, 'water never above the lowest ground beside it');
  assert.throws(() => carveRiver(low, [[2, 7]], { width: 3, depth: 2 }), /zwei Punkte/);
});

test('Maske: buildings protected for every brush, height/slope filters now apply to shaping too', () => {
  const d = flat(20, 20, 64);
  const mask = footprintMask(d, [{ x: 10, z: 10, y: 64 }], 1);
  assert.equal(maskCount(mask), 9);
  applyBrush(d, 10, 10, { tool: 'raise', radius: 4, strength: 5, falloff: 'hard', protect: mask });
  assert.equal(h(d, 10, 10), 64); assert.equal(h(d, 11, 11), 64); assert.equal(h(d, 13, 10), 69);
  stampShape(d, 10, 10, { shape: 'mulde', radius: 5, height: 4, protect: mask });
  assert.equal(h(d, 10, 10), 64);
  // Filter: lower only above Y 66.
  const f = flat(20, 20, 64);
  for (let x = 0; x < 10; x++) for (let z = 0; z < 20; z++) f.height[x + z * 20] = 70;
  applyBrush(f, 10, 10, { tool: 'lower', radius: 6, strength: 3, falloff: 'hard', filter: { minY: 66 } });
  assert.equal(h(f, 8, 10), 67); assert.equal(h(f, 12, 10), 64);
});
