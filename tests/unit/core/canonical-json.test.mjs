// PERF-05: canonicalJson was rewritten for speed; its output must stay byte for byte
// the same as the former form, because payload hashes and version ids are built from it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalJson } from '../../../dist/domain/src/index.js';

/** The former implementation (until 03.11.2026), kept here as the reference. */
function reference(value) {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Nicht-endliche Zahl ist nicht kanonisch darstellbar');
    if (value === undefined) throw new Error('undefined ist nicht kanonisch darstellbar');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(reference).join(',')}]`;
  const entries = Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${reference(v)}`).join(',')}}`;
}

function random(seed) { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32; }
const KEYS = ['a', 'b', 'Z', 'ä', 'é', '10', '2', '', 'key"quote', 'line\nbreak', '\u{1F600}', 'zz', '_'];

function sample(rnd, depth) {
  const r = rnd();
  if (depth > 3 || r < 0.35) {
    const p = rnd();
    if (p < 0.2) return Math.round((rnd() - 0.5) * 1e6) / (rnd() < 0.5 ? 1 : 7);
    if (p < 0.35) return rnd() < 0.5;
    if (p < 0.45) return null;
    if (p < 0.5) return -0;
    return KEYS[Math.floor(rnd() * KEYS.length)] + 'ü"\\\t';
  }
  if (r < 0.6) return Array.from({ length: Math.floor(rnd() * 5) }, () => sample(rnd, depth + 1));
  const o = {};
  for (let i = Math.floor(rnd() * 6); i > 0; i--) o[KEYS[Math.floor(rnd() * KEYS.length)]] = rnd() < 0.15 ? undefined : sample(rnd, depth + 1);
  return o;
}

test('canonicalJson gleicht der bisherigen Darstellung Byte für Byte (2000 Zufallswerte)', () => {
  const rnd = random(20261103);
  for (let i = 0; i < 2000; i++) {
    const v = sample(rnd, 0);
    assert.equal(canonicalJson(v), reference(v));
  }
});

test('canonicalJson: Sonderfälle wie bisher', () => {
  for (const v of [{}, [], '', 0, -0, [null], { b: 1, a: { d: [1, { c: undefined, b: 2 }] } }, new Date(0), new Uint8Array([3, 1, 2, 10, 11]), { 10: 'x', 9: 'y', a: 'z' }])
    assert.equal(canonicalJson(v), reference(v));
  assert.throws(() => canonicalJson(Number.NaN), /Nicht-endliche/);
  assert.throws(() => canonicalJson({ a: [Infinity] }), /Nicht-endliche/);
  assert.throws(() => canonicalJson(undefined), /undefined/);
  assert.throws(() => canonicalJson([undefined]), /undefined/);
});
