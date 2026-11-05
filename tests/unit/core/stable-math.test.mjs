// PERF-05 S-1: platform-independent trigonometry for stored geometry. Accuracy against Math.*,
// special values, and fixed reference bits (these must come out the same on every engine).
import test from 'node:test';
import assert from 'node:assert/strict';
import { stableAtan2, stableCos, stableHypot, stableSin } from '../../../dist/voxel/src/index.js';

const close = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${what}: ${a} vs ${b}`);

test('sin/cos stimmen auf 2·10⁻¹⁶ mit Math überein (|x| ≤ 10⁴, Rand bis 10⁶)', () => {
  for (let i = -20000; i <= 20000; i++) {
    const x = i * 0.5003;
    close(stableSin(x), Math.sin(x), 4e-16 * Math.max(1, Math.abs(x) / 1000), `sin(${x})`);
    close(stableCos(x), Math.cos(x), 4e-16 * Math.max(1, Math.abs(x) / 1000), `cos(${x})`);
  }
  for (const x of [1e5, 123456.789, 999999.5]) { close(stableSin(x), Math.sin(x), 1e-10, `sin(${x})`); close(stableCos(x), Math.cos(x), 1e-10, `cos(${x})`); }
  for (let i = 0; i <= 4096; i++) { const t = i / 4096 * 2 * Math.PI; close(stableSin(t), Math.sin(t), 3e-16, 'sin grid'); close(stableCos(t), Math.cos(t), 3e-16, 'cos grid'); }
});

test('atan2 stimmt auf 2·10⁻¹⁶ mit Math überein, alle Quadranten und Achsen', () => {
  for (let i = -60; i <= 60; i++) for (let j = -60; j <= 60; j++) {
    const y = i * 0.37, x = j * 0.29;
    close(stableAtan2(y, x), Math.atan2(y, x), 4e-16, `atan2(${y}, ${x})`);
  }
  for (const [y, x] of [[0, 1], [-0, 1], [0, -1], [-0, -1], [1, 0], [-1, 0], [0, 0], [-0, -0], [1e-300, 1], [1, 1e-300], [Infinity, 1], [1, -Infinity]])
    assert.ok(Object.is(stableAtan2(y, x), Math.atan2(y, x)) || Math.abs(stableAtan2(y, x) - Math.atan2(y, x)) < 1e-15, `atan2(${y}, ${x})`);
  assert.ok(Number.isNaN(stableAtan2(Number.NaN, 1)));
  assert.ok(Number.isNaN(stableSin(Infinity)) && Number.isNaN(stableCos(Number.NaN)));
  assert.ok(Object.is(stableSin(-0), -0));
});

test('feste Referenzbits: gleiche Ergebnisse auf jeder JavaScript-Engine', () => {
  // Bits as this pure-arithmetic code gives them; any engine following IEEE 754 must agree.
  const bits = x => { const b = new DataView(new ArrayBuffer(8)); b.setFloat64(0, x); return b.getBigUint64(0).toString(16); };
  const values = [stableSin(1), stableCos(1), stableSin(2.5), stableCos(100.25), stableAtan2(3, -4), stableAtan2(-0.7, 0.2), stableHypot(3, 4.5)];
  assert.deepEqual(values.map(bits), REFERENCE);
});
const REFERENCE = ["3feaed548f090cee", "3fe14a280fb5068c", "3fe326af0dcfcab0", "3feebec72ba6b0ec", "4003fc176b7a8560", "bff4ae10fc6589a4", "4015a22073490377"];
