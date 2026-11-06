import test from 'node:test';
import assert from 'node:assert/strict';
import { createSampleLibrary, packVersion, unpackVersion, unpackVersionLazily, cellCount, verifyAssetVersion } from '../../../dist/domain/src/index.js';
import { canonicalJson } from '../../../dist/domain/src/core/hash.js';

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

// ARCH-02/PERF-02 follow-up: compact runtime form. Only a bounded set of lazily loaded cell lists stays unpacked.
test('cell lists read longest ago go back to their packed bytes over the budget and unpack identically', async () => {
  const { lazyCellsStatus, setLazyCellBudget } = await import('../../../dist/domain/src/index.js');
  const all = [...library.versions];
  assert.ok(all.length >= 3);
  const lazy = all.map(v => unpackVersionLazily(packVersion(v)));
  const largest = Math.max(...all.map(v => v.payload.cells.length));
  const before = setLazyCellBudget(largest, 0); // room for one list, no protection time
  try {
    const start = lazyCellsStatus();
    const first = lazy[0].payload.cells;
    for (const v of lazy.slice(1)) void v.payload.cells;
    const after = lazyCellsStatus();
    assert.ok(after.packedBack >= start.packedBack + all.length - 1, JSON.stringify({ start, after })); // earlier tests may have left lists
    assert.equal(after.versions, 1);
    assert.equal(after.cells, all[all.length - 1].payload.cells.length, 'only the last read list stays');
    assert.equal(cellCount(lazy[0]), all[0].payload.cells.length, 'packed back: count from the bytes again');
    // Saving a packed-back version reuses its stored bytes instead of packing again.
    const stored0 = packVersion(lazy[0]);
    assert.equal('cells' in stored0.payload, false);
    assert.deepEqual(unpackVersion(stored0), all[0]);
    const again = lazy[0].payload.cells;
    assert.notEqual(again, first, 'new list after unpacking again');
    assert.deepEqual(again, first, 'same cells, same order');
    assert.equal(canonicalJson(lazy[0].payload), canonicalJson(all[0].payload));
    if (typeof verifyAssetVersion === 'function') await verifyAssetVersion(lazy[0]);
    // Repeated reads of the most recent list do not move anything.
    const status = lazyCellsStatus();
    for (let i = 0; i < 1000; i++) void lazy[0].payload.cells.length;
    assert.equal(lazyCellsStatus().packedBack, status.packedBack);
  } finally { setLazyCellBudget(before.cells, before.keepMs); }
});

test('lists read within the protection time are never packed back, even over the budget', async () => {
  const { lazyCellsStatus, setLazyCellBudget } = await import('../../../dist/domain/src/index.js');
  const lazy = [...library.versions].map(v => unpackVersionLazily(packVersion(v)));
  const before = setLazyCellBudget(1, 60_000);
  try {
    const lists = lazy.map(v => v.payload.cells);
    const s = lazyCellsStatus();
    lazy.forEach((v, i) => assert.equal(v.payload.cells, lists[i], 'still the same list'));
    assert.equal(lazyCellsStatus().packedBack, s.packedBack);
  } finally { setLazyCellBudget(before.cells, before.keepMs); }
});
