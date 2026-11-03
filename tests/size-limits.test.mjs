import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessSize, createPayload, formatCount, MODEL_MAX_CELLS, MODEL_MAX_VOLUME, LEGACY_MOD_MAX_VOLUME, SIZE_LARGE_CELLS, SIZE_HUGE_CELLS, DEFAULT_LIMITS,
} from '../dist/voxel/src/index.js';
import { importSchemV3, writeSchemV3, SCHEM_LIMITS, SCHEM_EXPORT_LIMITS, LITEMATIC_LIMITS, SCAN_LIMITS, EXCERPT_PAYLOAD_LIMITS } from '../dist/formats/src/index.js';
import {
  applyEdit, createDraft, executeEdit, EMPTY_DRAFT_HISTORY, HISTORY_MAX_CELLS, MAX_DRAFT_CELLS, MAX_EDIT_CELLS, trimHistory, checkPlanForMod, LIVE_FEATURE_BIGPLANS, LIVE_MAX_PLAN_BYTES,
} from '../dist/domain/src/index.js';
import { sectionRuns } from '../dist/application/src/index.js';

const ab = u8 => u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
const STONE = { id: 'minecraft:stone', properties: {} }, PLANKS = { id: 'minecraft:oak_planks', properties: {} };

test('SIZE-01: one set of limits for import, editor, export, recordings and the mod link', () => {
  assert.equal(MODEL_MAX_CELLS, 4_000_000);
  assert.equal(MODEL_MAX_VOLUME, 16_777_216);
  assert.equal(DEFAULT_LIMITS.maxCells, MODEL_MAX_CELLS, 'Voxelvertrag');
  assert.equal(SCHEM_LIMITS.maxVolume, MODEL_MAX_VOLUME, 'Schem-Import (vorher 250 000)');
  assert.equal(SCHEM_LIMITS.maxDimension, 4096, 'Schem je Achse (vorher 256)');
  assert.equal(LITEMATIC_LIMITS.maxCells, MODEL_MAX_CELLS, 'Litematic (vorher 1 Mio.)');
  assert.equal(LITEMATIC_LIMITS.maxDimension, 4096);
  assert.equal(SCHEM_EXPORT_LIMITS.maxVolume, MODEL_MAX_VOLUME, 'Export (vorher 4 Mio.)');
  assert.equal(SCAN_LIMITS.maxVolume, MODEL_MAX_VOLUME, 'Aufnahmen (vorher 4 Mio.)');
  assert.equal(EXCERPT_PAYLOAD_LIMITS.maxCells, MODEL_MAX_CELLS, 'Weltausschnitt (vorher 250 000)');
  assert.equal(MAX_DRAFT_CELLS, MODEL_MAX_CELLS, 'Werkstatt (vorher 400 000)');
  assert.equal(MAX_EDIT_CELLS, 1_000_000, 'ein Werkstattschritt (vorher 250 000)');
  assert.equal(LIVE_MAX_PLAN_BYTES, 64_000_000, 'Mod-Übertragung (vorher 16 MiB)');
});

test('SIZE-01: size levels are hints, only the hard limit is „zu groß“', () => {
  assert.equal(assessSize(80_000).level, 'normal');
  assert.equal(assessSize(80_000).message, '');
  assert.equal(assessSize(SIZE_LARGE_CELLS).level, 'gross');
  assert.equal(assessSize(SIZE_HUGE_CELLS, 9_000_000).level, 'sehr-gross');
  assert.match(assessSize(SIZE_HUGE_CELLS).message, /Bauabschnitten/);
  assert.equal(assessSize(MODEL_MAX_CELLS + 1).level, 'zu-gross');
  assert.equal(assessSize(1000, MODEL_MAX_VOLUME + 1).level, 'zu-gross');
  assert.match(assessSize(1000, MODEL_MAX_VOLUME + 1).message, /teilen/);
  assert.equal(formatCount(1_234_567), '1,2 Mio.');
  assert.equal(formatCount(250_000), '250.000');
});

test('SIZE-01: a Schem far beyond the old 250 000 box imports its blocks, air stays unselected', async () => {
  // 600 × 12 × 600 = 4.3 million cells box (the old import stopped at 250 000, the old export at 4 million).
  const W = 600, H = 12, L = 600, cells = [];
  for (let z = 0; z < L; z += 3) for (let x = 0; x < W; x += 3) for (let y = 0; y < H; y += 4) cells.push({ position: [x, y, z], kind: 'block', paletteIndex: (x + z) % 2 });
  const world = createPayload({ schemaVersion: 1, profileId: 'java:26.3', bounds: { min: [0, 0, 0], maxExclusive: [W, H, L] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette: [STONE, PLANKS], cells, blockEntities: [] });
  const out = await writeSchemV3(world, { dataVersion: 5023, anchor: 'project-origin', unselected: 'air' });
  assert.ok(out.report.volume > LEGACY_MOD_MAX_VOLUME, 'größer als die alte Exportgrenze');
  const back = await importSchemV3(ab(out.bytes));
  assert.equal(back.payload.cells.length, cells.length, 'nur Blöcke übernommen');
  assert.ok(back.payload.cells.every(c => c.kind === 'block'));
  assert.deepEqual(back.payload.bounds.maxExclusive, [W, H, L]);
  assert.ok(back.warnings.some(w => /nur die .* Blöcke/.test(w)), back.warnings.join(' | '));
  assert.ok(Object.isFrozen(back.payload.cells) && Object.isFrozen(back.payload.cells[0]), 'versiegelt ohne Kopie');
  // Small files keep explicit air as before.
  const small = createPayload({ schemaVersion: 1, profileId: 'java:26.3', bounds: { min: [0, 0, 0], maxExclusive: [3, 1, 1] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette: [STONE], cells: [{ position: [0, 0, 0], kind: 'block', paletteIndex: 0 }], blockEntities: [] });
  const s = await importSchemV3(ab((await writeSchemV3(small, { dataVersion: 5023, anchor: 'project-origin', unselected: 'air' })).bytes));
  assert.equal(s.payload.cells.filter(c => c.kind === 'air').length, 2);
});

test('SIZE-01: section runs cover the box and stay tiny', () => {
  const cells = new Uint8Array(5_000_000);
  cells.fill(1, 0, 2_000_000); cells.fill(2, 3_000_000);
  const runs = sectionRuns(cells);
  assert.deepEqual(runs, [2_000_000, 1, 1_000_000, 0, 2_000_000, 2]);
  assert.deepEqual(sectionRuns(new Uint8Array(0)), []);
});

test('SIZE-01: big edits are linear, undo keeps a cell budget', () => {
  const draft = createDraft(null, 'java:26.3');
  // 300 000 cells in one step: the old limit was 250 000 and building the inverse was quadratic.
  const changes = [];
  for (let i = 0; i < 300_000; i++) changes.push({ position: [i % 100, Math.floor(i / 10_000), Math.floor(i / 100) % 100], value: { kind: 'block', state: STONE } });
  const t = Date.now();
  const r = applyEdit(draft, { label: 'Füllen', changes });
  assert.ok(Date.now() - t < 10_000, `${Date.now() - t} ms`);
  assert.equal(r.changed, 300_000);
  assert.deepEqual(r.inverse.changes[0].position, changes.at(-1).position, 'Umkehrung in umgekehrter Reihenfolge');
  // History budget: the newest step always stays, older ones go once the budget is used up.
  const big = n => ({ label: 'x', forward: { label: 'x', changes: new Array(n).fill(0) }, inverse: { label: 'x', changes: new Array(n).fill(0) } });
  const kept = trimHistory([big(HISTORY_MAX_CELLS / 2), big(HISTORY_MAX_CELLS / 4), big(HISTORY_MAX_CELLS / 4)]);
  assert.equal(kept.length, 2);
  assert.equal(trimHistory([big(HISTORY_MAX_CELLS)]).length, 1, 'ein einzelner großer Schritt bleibt');
  const h = executeEdit(draft, EMPTY_DRAFT_HISTORY, { label: 'Füllen', changes: changes.slice(0, 10) });
  assert.equal(h.history.undo.length, 1);
});

test('SIZE-01: the website checks a plan against what the connected mod can load', () => {
  const old = { app: 'bauplaner-mod', protocol: 2, mod: { version: '0.8.0', loader: 'fabric', minecraft: '26.3' }, pairing: false, features: ['scan', 'marks2', 'players'] };
  const neu = { ...old, mod: { ...old.mod, version: '0.9.0' }, features: [...old.features, LIVE_FEATURE_BIGPLANS] };
  const small = { volume: 1_300_000, cells: 60_000, bytes: 300_000 };
  assert.deepEqual([checkPlanForMod(old, small).ok, checkPlanForMod(old, small).message], [true, '']);
  const big = { volume: 9_000_000, cells: 2_000_000, bytes: 20_000_000 };
  const refused = checkPlanForMod(old, big);
  assert.equal(refused.ok, false);
  assert.match(refused.message, /0\.9\.0/);
  const ok = checkPlanForMod(neu, big);
  assert.equal(ok.ok, true);
  assert.match(ok.message, /Großer Plan/);
  assert.ok(ok.timeoutMs > 20_000, 'längere Wartezeit für große Dateien');
  assert.equal(checkPlanForMod(neu, { ...big, volume: MODEL_MAX_VOLUME + 1 }).ok, false);
  assert.equal(checkPlanForMod(neu, { ...big, bytes: 65_000_000 }).ok, false);
});
