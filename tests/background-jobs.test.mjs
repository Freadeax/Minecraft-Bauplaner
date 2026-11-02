// PERF-04: background jobs – lossless cell transport, sealing contracts, caches and the job client.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  adoptPayload, cellsToColumns, checkColumns, columnsToCells, copyColumns, createPayload, emptyColumns, fillColumns, hydratePayload, payloadToTransport,
  packCells, sealTransportedPayload,
} from '../dist/voxel/src/index.js';
import { isSealedPayload, isSealedPayload as sealed } from '../dist/voxel/src/validation.js';
import { addAssetVersion, createAsset, cropPayload, packVersion, payloadHash, rememberPackedCells, rememberPayloadHash, validateConnectors } from '../dist/domain/src/index.js';
import { buildSectionMesh } from '../apps/web/src/blockmodels/mesh.ts';
import { fallbackRenderer } from '../apps/web/src/blockmodels/renderers.ts';
import { rendererFromSnapshot, snapshotRenderer } from '../apps/web/src/blockmodels/snapshot.ts';
import { exportModel } from '../apps/web/src/export3d/build.ts';
import * as formats from '../dist/formats/src/index.js';
import { isAbort, runJob, setJobWorkerFactory } from '../apps/web/src/jobs/client.ts';

const palette = [
  { id: 'minecraft:stone', properties: {} }, { id: 'minecraft:oak_stairs', properties: { facing: 'east', half: 'bottom', shape: 'straight', waterlogged: 'false' } },
  { id: 'minecraft:glass', properties: {} }, { id: 'minecraft:lantern', properties: { hanging: 'false', waterlogged: 'false' } }, { id: 'minecraft:air', properties: {} },
];
/** Hand-made structure with all three cell kinds, negative coordinates and a block entity. */
function sample() {
  const cells = [];
  for (let x = -3; x < 4; x++) for (let y = 0; y < 5; y++) for (let z = -2; z < 3; z++) {
    if ((x + y + z) % 7 === 0) continue;
    const k = (x * 3 + y * 5 + z * 7 + 100) % 11;
    cells.push(k === 0 ? { position: [x, y, z], kind: 'erase' } : k === 1 ? { position: [x, y, z], kind: 'air', paletteIndex: 4 } : { position: [x, y, z], kind: 'block', paletteIndex: k % 4 });
  }
  return createPayload({ schemaVersion: 1, profileId: 'java-26.3', bounds: { min: [-3, 0, -2], maxExclusive: [4, 5, 3] }, pivot: [0, 0, 0], sourceOrigin: [10, 64, -5],
    palette, cells, blockEntities: [{ position: [-3, 0, -2].map((v, i) => cells.find(c => c.kind === 'block').position[i]), data: { type: 'compound', value: { id: { type: 'string', value: 'minecraft:sign' } } } }] });
}

test('cell columns carry every cell exactly; the hydrated payload hashes identically and is sealed', async () => {
  const p = sample();
  const t = payloadToTransport(p);
  assert.equal(t.columns.count, p.cells.length);
  // Independent check of the column contents against the cell list.
  p.cells.forEach((c, i) => {
    assert.equal(t.columns.kinds[i], c.kind === 'erase' ? 0 : c.kind === 'air' ? 1 : 2);
    assert.equal(t.columns.palette[i], c.kind === 'erase' ? -1 : c.paletteIndex);
    assert.deepEqual([...t.columns.xyz.subarray(i * 3, i * 3 + 3)], [...c.position]);
  });
  let pauses = 0; const seen = [];
  const back = await hydratePayload(structuredClone(t), { slice: 1000, pause: async () => { pauses++; }, onProgress: f => seen.push(f) });
  assert.deepEqual(back, p);
  assert.equal(await payloadHash(back), await payloadHash(createPayload(JSON.parse(JSON.stringify(p)))));
  assert.ok(isSealedPayload(back) && Object.isFrozen(back.cells[0]) && Object.isFrozen(back.cells[0].position) && Object.isFrozen(back.palette));
  assert.equal(seen.at(-1), 1);
  assert.equal(pauses, Math.ceil(p.cells.length / 1000) - 1);
  // Slicing into a reused output gives the same cells.
  const out = new Array(t.columns.count);
  columnsToCells(t.columns, out, 0, 10); columnsToCells(t.columns, out, 10);
  assert.deepEqual(out, [...p.cells]);
  const filled = emptyColumns(p.cells.length); fillColumns(p.cells, filled, 0, 5); fillColumns(p.cells, filled, 5);
  assert.deepEqual(filled, cellsToColumns(p.cells));
  const copy = copyColumns(t.columns); assert.notEqual(copy.xyz.buffer, t.columns.xyz.buffer); assert.deepEqual(copy, t.columns);
});

test('damaged columns and over-limit seals are refused, aborts stop hydration', async () => {
  const t = payloadToTransport(sample());
  assert.throws(() => checkColumns({ ...t.columns, count: t.columns.count + 1 }), /unvollständig/);
  assert.throws(() => checkColumns({ ...t.columns, xyz: new Float64Array(t.columns.count * 3) }), /unvollständig/);
  const bad = { ...t.columns, kinds: Uint8Array.from(t.columns.kinds, () => 7) };
  assert.throws(() => columnsToCells(bad, new Array(bad.count)), /unbekannte Zellart/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(hydratePayload(t, { signal: controller.signal }), e => e.name === 'AbortError');
  const head = t.head, cells = new Array(t.columns.count); columnsToCells(t.columns, cells);
  assert.throws(() => sealTransportedPayload({ ...head, cells }, { maxCells: 3 }), /Zellenlimit/);
});

test('createPayload returns a sealed payload unchanged; unsealed input is still copied and validated', () => {
  const p = sample();
  assert.equal(createPayload(p), p, 'sealed with default limits → no copy');
  assert.notEqual(createPayload(p, { maxCells: 100_000 }), undefined);
  assert.throws(() => createPayload(p, { maxCells: 5 }), /Zellenlimit|maxCells|cells/i, 'stricter limits are checked again');
  const plain = JSON.parse(JSON.stringify(p));
  const copy = createPayload(plain);
  assert.notEqual(copy, plain); assert.ok(!Object.isFrozen(plain), 'the caller’s object is never frozen');
});

test('cropPayload adopts fresh cells only for sealed sources and keeps the result identical', async () => {
  const p = sample();
  const region = { min: [-1, 1, -1], maxExclusive: [3, 4, 2] };
  const fromSealed = cropPayload(p, region);
  const plain = JSON.parse(JSON.stringify(p));
  const fromPlain = cropPayload(plain, region);
  assert.deepEqual(fromSealed, fromPlain);
  assert.ok(sealed(fromSealed) && sealed(fromPlain));
  assert.ok(!Object.isFrozen(plain.palette), 'a plain source keeps unfrozen parts');
  assert.equal(await payloadHash(fromSealed), await payloadHash(fromPlain));
});

test('remembered hash and packed cells are used only for sealed payloads and match the real values', async () => {
  const p = sample();
  const real = await payloadHash(createPayload(JSON.parse(JSON.stringify(p))));
  const fresh = adoptPayload(JSON.parse(JSON.stringify(p)));
  rememberPayloadHash(fresh, 'f'.repeat(64));
  assert.equal(await payloadHash(fresh), 'f'.repeat(64), 'a remembered worker hash is used');
  const plain = JSON.parse(JSON.stringify(p));
  rememberPayloadHash(plain, 'f'.repeat(64));
  assert.equal(await payloadHash(plain), real, 'never for a payload that could still change');
  rememberPayloadHash(p, 'nonsense');
  assert.equal(await payloadHash(p), real, 'malformed hashes are ignored');
  const asset = createAsset({ name: 'Test', provenance: { author: '', source: '', license: '' } });
  const { version } = await addAssetVersion(asset, { payload: p, source: { format: 'voxel-json' } });
  const packed = packCells(p);
  const twin = adoptPayload(JSON.parse(JSON.stringify(p)));
  rememberPackedCells(twin, packed);
  assert.deepEqual(packVersion({ ...version, payload: twin }).packedCells, packVersion(version).packedCells);
});

test('validateConnectors finds touching blocks exactly as before, without per-block keys', () => {
  const p = sample();
  const block = p.cells.find(c => c.kind === 'block' && c.position[0] === 3);
  const face = { id: 'ost', type: 'tür', profile: 'p', position: [4, block.position[1], block.position[2]], normal: [1, 0, 0], up: [0, 1, 0] };
  const issues = validateConnectors(p, [face]);
  assert.ok(!issues.some(i => i.code === 'NO_BLOCK'), 'the block at x = 3 touches the east face');
  const lonely = { ...face, id: 'leer', position: [4, 4, 2] };
  const others = validateConnectors(createPayload({ ...p, cells: p.cells.filter(c => !(c.position[0] === 3 && c.position[1] >= 3 && c.position[2] >= 1)), blockEntities: [] }), [lonely]);
  assert.deepEqual(others.map(i => i.code), ['NO_BLOCK']);
  assert.deepEqual(validateConnectors(p, []), []);
});

test('a renderer snapshot meshes byte-identically to the live renderer', () => {
  const p = sample();
  const live = fallbackRenderer();
  const lookup = s => ({ rect: s === '#' ? [0, 0, 0.5, 0.5] : [0.5, 0.5, 1, 1], layer: s === '#' ? 0 : 1 });
  const snap = structuredClone(snapshotRenderer(live, lookup, p.palette));
  const { renderer, sprites } = rendererFromSnapshot(snap, p.palette);
  const marks = c => c.position[0] === 0 ? { color: '#ff0000', amount: 0.5 } : null;
  const a = buildSectionMesh(p.cells, p.palette, live, lookup, [0, 0, 0], marks);
  const b = buildSectionMesh(p.cells, p.palette, renderer, sprites, [0, 0, 0], marks);
  assert.equal(a.sections.length, b.sections.length);
  a.sections.forEach((s, i) => {
    assert.equal(s.hash, b.sections[i].hash);
    for (const layer of ['solid', 'translucent']) for (const k of ['positions', 'uvs', 'colors', 'marks', 'light', 'indices', 'quadCells']) assert.deepEqual(b.sections[i][layer][k], s[layer][k], `${layer}.${k}`);
  });
  assert.deepEqual(b.spawn, a.spawn);
  assert.throws(() => renderer.block({ id: 'minecraft:dirt', properties: {} }), /fehlt in der Ansichtskopie/);
});

test('mesh progress reports rise to the end; section reuse needs only key, hash and face counts', () => {
  const p = sample();
  const seen = [];
  const first = buildSectionMesh(p.cells, p.palette, fallbackRenderer(), () => ({ rect: [0, 0, 1, 1], layer: 0 }), [0, 0, 0], undefined, { progress: f => seen.push(f) });
  assert.equal(seen[0], 0); assert.ok(seen.includes(0.35));
  assert.deepEqual(seen, [...seen].sort((x, y) => x - y));
  const light = first.sections.map(s => ({ key: s.key, hash: s.hash, solid: { quads: s.solid.quads }, translucent: { quads: s.translucent.quads } }));
  const again = buildSectionMesh(p.cells, p.palette, fallbackRenderer(), () => ({ rect: [0, 0, 1, 1], layer: 0 }), [0, 0, 0], undefined, {}, light);
  assert.equal(again.reused, first.sections.length); assert.equal(again.built, 0); assert.equal(again.quads, first.quads);
});

test('3D export reports its steps in order and the file is unchanged by the progress hook', async () => {
  const p = sample();
  const req = { format: 'stl', kind: 'print', name: 'Probe', cells: p.cells, palette: p.palette, blockSize: 4,
    view: { renderer: fallbackRenderer(), sprites: () => ({ rect: [0, 0, 1, 1], layer: 0 }), textured: false, place: 'center', bake: true },
    print: { detail: 2, smallParts: true, fill: true, hollow: 1, minPart: 8, maxColors: 0 } };
  const steps = [];
  const a = await exportModel(formats, { ...req, progress: (s, f) => steps.push([s, f]) });
  const b = await exportModel(formats, req);
  assert.deepEqual(a.file.bytes, b.file.bytes);
  assert.deepEqual(steps.map(s => s[0]), ['Druckgitter füllen', 'Innenräume füllen', 'Aushöhlen', 'Kleine lose Teile entfernen', 'Kanten- und Eckberührungen verbinden', 'Teile zählen', 'Hülle bauen', 'Eckpunkte verschweißen', 'Druckprüfung (wasserdicht)', 'Datei schreiben']);
  assert.deepEqual(steps.map(s => s[1]), [...steps.map(s => s[1])].sort((x, y) => x - y));
});

/** Fake worker: answers like heavy.worker.ts, scripted per test. */
function fakeWorker(script) {
  const w = { onmessage: null, onerror: null, onmessageerror: null, terminated: false, transferred: null,
    postMessage(message, transfer) { w.transferred = transfer; queueMicrotask(() => script(message, data => w.onmessage?.({ data }), w)); },
    terminate() { w.terminated = true; } };
  return w;
}

test('job client: progress, result, worker errors and foreign answers', async () => {
  const workers = [];
  setJobWorkerFactory(() => { const w = fakeWorker((m, send) => {
    send({ type: 'progress', id: m.id + 100, step: 'fremd', fraction: 0.5 });
    send({ type: 'progress', id: m.id, step: 'Schritt', fraction: 0.5 });
    if (m.input.fail) send({ type: 'error', id: m.id, message: 'Kaputt', code: m.input.fail });
    else send({ type: 'done', id: m.id, result: { echo: m.input.value, kind: m.kind } });
  }); workers.push(w); return w; });
  const seen = [];
  const buffer = new ArrayBuffer(8);
  const out = await runJob('import', { value: 7 }, { onProgress: p => seen.push(p), transfer: [buffer] });
  assert.deepEqual(out, { echo: 7, kind: 'import' });
  assert.deepEqual(seen, [{ step: 'Schritt', fraction: 0.5 }], 'progress of another job id is ignored');
  assert.deepEqual(workers[0].transferred, [buffer]);
  assert.ok(workers[0].terminated, 'one worker per job, closed afterwards');
  await assert.rejects(runJob('import', { fail: 'LIMIT' }), e => e.name === 'JobError' && e.message === 'Kaputt');
  await assert.rejects(runJob('import', { fail: 'TIMEOUT' }), e => e.name === 'TimeoutError');
});

test('job client: abort terminates the worker at once, timeouts and crashes give readable errors', async () => {
  let last;
  setJobWorkerFactory(() => (last = fakeWorker(() => { /* never answers */ })));
  const controller = new AbortController();
  const running = runJob('mesh', {}, { signal: controller.signal });
  controller.abort();
  await assert.rejects(running, e => isAbort(e));
  assert.ok(last.terminated);
  const pre = new AbortController(); pre.abort();
  await assert.rejects(runJob('mesh', {}, { signal: pre.signal }), e => isAbort(e));
  await assert.rejects(runJob('mesh', {}, { timeoutMs: 20 }), e => e.name === 'TimeoutError' && /Minuten/.test(e.message));
  assert.ok(last.terminated);
  setJobWorkerFactory(() => (last = fakeWorker((m, send, w) => w.onerror?.({ message: 'out of memory', preventDefault() {} }))));
  await assert.rejects(runJob('mesh', {}), e => e.name === 'JobError' && /abgestürzt: out of memory/.test(e.message));
  setJobWorkerFactory(() => { throw new Error('kein Worker'); });
  await assert.rejects(runJob('mesh', {}), e => /konnte nicht starten: kein Worker/.test(e.message));
});
