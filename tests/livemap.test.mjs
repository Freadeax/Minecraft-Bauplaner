import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLiveMapUrl, checkLiveMapTarget, createLiveMapMarkerFile } from '../dist/domain/src/livemap.js';

const pos = { x: -42, y: 64, z: 128, world: 'Meine Welt', dimension: 'minecraft:overworld' };
const target = template => ({ name: 'Eigene Livekarte', urlTemplate: template });

test('configured map template preserves signed block coordinates and encodes names in path/query/hash', () => {
  const url = new URL(buildLiveMapUrl(target('https://maps.example.test/map/{world}?x={x}&y={y}&z={z}#dimension={dimension}'), pos));
  assert.equal(url.pathname, '/map/Meine%20Welt');
  assert.deepEqual([...url.searchParams], [['x', '-42'], ['y', '64'], ['z', '128']]);
  assert.equal(url.hash, '#dimension=minecraft%3Aoverworld');
  assert.equal(buildLiveMapUrl(target('http://localhost:8123/?x={x}&z={z}&x2={x}'), pos), 'http://localhost:8123/?x=-42&z=128&x2=-42');
});

test('untrusted world names stay inside one URL component instead of adding parameters, paths or fragments', () => {
  const tricky = { ...pos, world: 'A/B?x=900&z=123#evil', dimension: '命名空間:世界 + test' };
  const url = new URL(buildLiveMapUrl(target('https://maps.example.test/{world}?dimension={dimension}&x={x}'), tricky));
  assert.equal(url.pathname, '/A%2FB%3Fx%3D900%26z%3D123%23evil');
  assert.equal(url.searchParams.get('dimension'), tricky.dimension);
  assert.equal(url.searchParams.get('x'), '-42');
  assert.equal(url.searchParams.get('z'), null); assert.equal(url.hash, '');
});

test('rejects credentials, dynamic origins, unsafe schemes and malformed/unknown placeholders', () => {
  for (const template of [
    'javascript:alert({x})', 'data:text/html,{world}', '//maps.example.test/?x={x}',
    'https://name:password@maps.example.test/?x={x}', 'https://name@maps.example.test/?x={x}', 'https://@maps.example.test/?x={x}',
    'https://{world}.example.test/?x={x}', 'https://maps.example.test:{x}/',
    'https://maps.example.test/?x={latitude}', 'https://maps.example.test/?x={{x}}',
    'https://maps.example.test/?x={x', 'https://maps.example.test/',
    ' https://maps.example.test/?x={x}', 'https://maps.example.test/\\{world}',
  ]) assert.throws(() => checkLiveMapTarget(target(template)), { name: 'DomainError' }, template);
});

test('rejects fractional, unsafe or nonfinite coordinates and malformed world identifiers', () => {
  const t = target('https://maps.example.test/?x={x}&z={z}');
  for (const n of [0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '123'])
    for (const axis of ['x', 'y', 'z']) assert.throws(() => buildLiveMapUrl(t, { ...pos, [axis]: n }), /Blockkoordinate/);
  for (const field of ['world', 'dimension'])
    for (const s of ['', '   ', 'x\n', '\ud800', '.', '..']) assert.throws(() => buildLiveMapUrl(t, { ...pos, [field]: s }), { name: 'DomainError' });
  assert.doesNotThrow(() => buildLiveMapUrl(t, { ...pos, x: Number.MIN_SAFE_INTEGER, z: Number.MAX_SAFE_INTEGER }));
});

test('marker export is explicit Bauplaner JSON, snapshots input and detects duplicate identities', () => {
  const input = [{ id: 'p1', label: 'Hafen', position: { ...pos } }];
  const file = createLiveMapMarkerFile(input);
  assert.deepEqual(JSON.parse(JSON.stringify(file)), {
    schemaVersion: 1, format: 'bauplaner-world-markers', coordinateSystem: 'minecraft-blocks', markers: input,
  });
  input[0].position.x = 900; input[0].label = 'Geändert';
  assert.equal(file.markers[0].position.x, -42); assert.equal(file.markers[0].label, 'Hafen');
  assert.throws(() => createLiveMapMarkerFile([input[0], input[0]]), /Doppelte/);
  assert.throws(() => createLiveMapMarkerFile([{ id: 'p', label: '', position: pos }]), /Markername/);
  assert.deepEqual(createLiveMapMarkerFile([]).markers, []);
});
