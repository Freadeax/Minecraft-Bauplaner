// MAP-06: measuring with several points, height profiles and routes over the terrain of the world map.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { measureSummary, measureText, lineColumns, pathProfile, routeOverTerrain, routePath, simplifyLine, trailToPath } from '../../../dist/domain/src/index.js';

const OW = 'minecraft:overworld';
// Terrain: a ridge of height 70 along x = 10 (walls), flat 64 elsewhere, a gate at z = 5 (height 65), water for z < 0.
const ground = (x, z) => {
  if (x > 40 || x < -5 || z > 40 || z < -5) return null;
  if (z < 0) return { y: 63, id: 'minecraft:water' };
  if (x === 10) return z === 5 ? { y: 65, id: 'minecraft:stone' } : { y: 70, id: 'minecraft:stone' };
  return { y: 64, id: 'minecraft:grass_block' };
};

test('Messen: Luftlinie, zu Fuß, Höhe, Fläche über mehrere Punkte', () => {
  const two = measureSummary([[0, 0], [3, 4]], ground);
  assert.equal(two.length, 5); assert.equal(two.walk, 7); assert.equal(two.dx, 3); assert.equal(two.area, null);
  assert.match(measureText([[0, 0], [3, 4]], ground), /^5 Blöcke Luftlinie · 7 zu Fuß \(ΔX 3, ΔZ 4\) · Höhe 64 → 64 \(\+0\) · 0,6 Blöcke im Nether$/);
  const square = measureSummary([[0, 0], [10, 0], [10, 10], [0, 10]], ground);
  assert.equal(square.area, 100); assert.equal(square.length, 30); assert.equal(square.corners, 4);
  assert.match(measureText([[0, 0], [10, 0], [10, 10], [0, 10]], ground), /4 Punkte.*Fläche ≈ 100 Blöcke²/);
  const hill = measureSummary([[0, 5], [10, 5], [20, 5]], ground);
  assert.equal(hill.climb, 1); assert.equal(hill.descent, 1);
  assert.match(measureText([[0, 5], [10, 5], [20, 5]], ground), /↑1 ↓1/);
  assert.equal(measureSummary([[50, 50], [60, 60]], ground).climb, null);
  assert.equal(measureText([[1, 1]]), '');
});

test('Höhenprofil eines Wegs: Spalten in Laufreihenfolge, Anstieg, steile Stufen, Wasser, unbekannt', () => {
  assert.deepEqual(lineColumns([[0, 0], [2, 1]]), [[0, 0], [1, 0], [1, 1], [2, 1]]);
  const p = pathProfile([[5, 2], [15, 2]], ground);
  assert.equal(p.columns, 11); assert.equal(p.known, 11); assert.equal(p.yMax, 70);
  assert.equal(p.climb, 6); assert.equal(p.descent, 6); assert.equal(p.maxStep, 6); assert.equal(p.steep, 2);
  const w = pathProfile([[0, -3], [0, 3]], ground);
  assert.equal(w.water, 3);
  const u = pathProfile([[38, 0], [44, 0]], ground);
  assert.equal(u.unknown, 4); assert.equal(u.known, 3);
});

test('Route über das Gelände: durch das Tor statt über die Mauer, Wasser gemieden, vier-verbunden', () => {
  const r = routeOverTerrain([2, 12], [18, 12], ground);
  assert.ok(r, 'Route gefunden');
  assert.ok(r.columns.some(c => c[0] === 10 && c[1] === 5), 'läuft durch das Tor bei z = 5');
  assert.ok(r.columns.every(c => ground(c[0], c[1]).y <= 65), 'nie über die Mauer');
  for (let i = 1; i < r.columns.length; i++) assert.equal(Math.abs(r.columns[i][0] - r.columns[i - 1][0]) + Math.abs(r.columns[i][1] - r.columns[i - 1][1]), 1);
  assert.ok(r.points.length < r.columns.length && r.points.length <= 256);
  assert.deepEqual(r.points[0], [2, 12]); assert.deepEqual(r.points.at(-1), [18, 12]);
  // Flat ground: the route is as short as walking.
  const flat = routeOverTerrain([20, 20], [30, 25], ground);
  assert.equal(flat.columns.length, 16);
  // Water is crossed only when the detour is longer than the penalty.
  const wet = routeOverTerrain([20, -1], [30, -1], ground);
  assert.ok(wet.columns.some(c => c[1] >= 0), 'weicht aufs Land aus');
  // Unknown ground stops the route unless allowed with a cost.
  assert.equal(routeOverTerrain([20, 20], [60, 20], ground), null);
  assert.ok(routeOverTerrain([20, 20], [44, 20], ground, { unknownCost: 3 }));
  // A wall without gate: no route (steps of 6 are not allowed), with maxStep 6 it climbs.
  const walled = (x, z) => (x > 40 || x < -5 || z > 40 || z < -5) ? null : x === 10 ? { y: 70 } : { y: 64 };
  assert.equal(routeOverTerrain([2, 12], [18, 12], walled), null);
  assert.ok(routeOverTerrain([2, 12], [18, 12], walled, { maxStep: 6 }));
});

test('Weg neu führen, Linien vereinfachen, Spur als Weg', () => {
  const path = { kind: 'path', id: 'p', name: 'Weg', note: '', dimension: OW, style: 'weg', width: 3, points: [[2, 12], [18, 12], [18, 30]] };
  const r = routePath(path, ground);
  assert.equal(r.legs, 2); assert.equal(r.failed, 0);
  assert.deepEqual(r.path.points[0], [2, 12]); assert.deepEqual(r.path.points.at(-1), [18, 30]);
  assert.ok(r.path.points.some(p => p[0] === 10 && p[1] === 5) || r.path.points.some(p => p[1] < 12), 'Umweg über das Tor bleibt als Ecke');
  assert.equal(routePath({ ...path, points: [[20, 20], [60, 20]] }, ground), null);
  const half = routePath({ ...path, points: [[20, 20], [60, 20], [60, 30]] }, ground);
  assert.equal(half, null);
  assert.deepEqual(simplifyLine([[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]]), [[0, 0], [2, 0], [2, 2]]);
  const stairs = Array.from({ length: 600 }, (_, i) => [Math.floor(i / 2), Math.ceil(i / 2)]);
  assert.ok(simplifyLine(stairs, 256).length <= 256);
  const trail = Array.from({ length: 50 }, (_, i) => ({ x: 0.3 + i * 0.4, z: 10.5 }));
  const t = trailToPath(trail, { kind: 'path', id: 't', name: 'Spur', note: '', dimension: OW, style: 'weg', width: 1 });
  assert.deepEqual(t.points, [[0, 10], [19, 10]]);
  assert.equal(trailToPath([{ x: 1, z: 1 }], { kind: 'path', id: 't', name: 'Spur', note: '', dimension: OW, style: 'weg', width: 1 }), null);
});
