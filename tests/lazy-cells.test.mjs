import test from 'node:test';
import assert from 'node:assert/strict';
import { createSampleLibrary, packVersion, unpackVersion, unpackVersionLazily, cellCount, verifyAssetVersion } from '../dist/domain/src/index.js';
import { canonicalJson } from '../dist/domain/src/hash.js';

// PERF-05-S08: packed versions unpack their cells on first read, with the same result as unpacking at once.
const library = await createSampleLibrary();
const version = [...library.versions].sort((a, b) => b.payload.cells.length - a.payload.cells.length)[0];

test('lazy cells equal eager cells in every view', async () => {
  const stored = packVersion(version);
  assert.ok('packedCells' in stored);
  const eager = unpackVersion(stored), lazy = unpackVersionLazily(stored);
  assert.equal(cellCount(lazy), version.payload.cells.length, 'Anzahl ohne Entpacken');
  assert.deepEqual(Object.keys(lazy.payload), Object.keys(eager.payload), 'gleiche Schlüsselreihenfolge');
  assert.equal(JSON.stringify(lazy), JSON.stringify(eager));
  assert.equal(canonicalJson(lazy.payload), canonicalJson(version.payload));
  assert.deepEqual(structuredClone(lazy), eager);
  assert.deepEqual({ ...lazy.payload }, eager.payload);
  assert.equal(lazy.payload.cells, lazy.payload.cells, 'einmal entpackt, dann dieselbe Liste');
  if (typeof verifyAssetVersion === 'function') await verifyAssetVersion(lazy);
});

test('saving an untouched lazy version reuses its bytes', () => {
  const stored = packVersion(version), lazy = unpackVersionLazily(stored);
  const again = packVersion(lazy);
  assert.equal(again.packedCells, stored.packedCells, 'keine neue Packung');
  assert.equal('cells' in again.payload, false);
  assert.deepEqual(again, stored);
  // after reading the cells the normal path packs them again – same bytes
  void lazy.payload.cells.length;
  assert.deepEqual(packVersion(lazy).packedCells.bytes, stored.packedCells.bytes);
});

test('damaged bytes give an empty list on first read, broken heads fail at once', () => {
  const stored = packVersion(version);
  const broken = { ...stored, packedCells: { ...stored.packedCells, bytes: stored.packedCells.bytes.slice(0, 3) } };
  const warn = console.warn; console.warn = () => {};
  try { assert.deepEqual(unpackVersionLazily(broken).payload.cells, []); } finally { console.warn = warn; }
  assert.throws(() => unpackVersionLazily({ ...stored, payload: { ...stored.payload, cells: [] } }), /zusätzlich eine Zellliste/);
  assert.deepEqual(unpackVersionLazily({ ...stored, packedCells: { ...stored.packedCells, encoding: 'x' } }).payload.cells, []);
  assert.equal(unpackVersionLazily(version), version, 'ungepackte Versionen bleiben, wie sie sind');
});
