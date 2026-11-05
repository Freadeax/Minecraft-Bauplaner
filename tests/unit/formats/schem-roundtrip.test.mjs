import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { writeNbt, importSchemV3 } from '../../../dist/formats/src/index.js';

// A file laid out the way WorldEdit 7 writes Sponge v3 (FORMAT-01-S02): Offset = absolute minimum of the
// copied region, Metadata.WEOffset = minimum relative to the player's copy position, palette text with
// properties in registry (not sorted) order, BlockEntities with Id/Pos/Data, an entity with Pos relative to the box.
const i = v => ({ type: 'int', value: v }), sh = v => ({ type: 'short', value: v }), s = v => ({ type: 'string', value: v });
const c = value => ({ type: 'compound', value }), l = (elementType, value) => ({ type: 'list', elementType, value });
function worldEditLike() {
  const palette = { 'minecraft:air': 0, 'minecraft:stone': 1, 'minecraft:oak_stairs[half=bottom,facing=east,waterlogged=false,shape=straight]': 2, 'minecraft:chest[waterlogged=false,type=single,facing=north]': 3 };
  const W = 3, H = 2, L = 2, data = [];
  for (let y = 0; y < H; y++) for (let z = 0; z < L; z++) for (let x = 0; x < W; x++) data.push(y === 0 ? (x === 2 ? 2 : 1) : (x === 1 && z === 1 ? 3 : 0));
  const tag = c({ Schematic: c({
    Version: i(3), DataVersion: i(5023),
    Metadata: c({ WEOffsetX: i(-1), WEOffsetY: i(0), WEOffsetZ: i(-2), Date: { type: 'long', value: '1793750000000' } }),
    Width: sh(W), Height: sh(H), Length: sh(L), Offset: { type: 'intArray', value: [1200, 64, -300] },
    Blocks: c({ Palette: c(Object.fromEntries(Object.entries(palette).map(([k, v]) => [k, i(v)]))), Data: { type: 'byteArray', value: data },
      BlockEntities: l('compound', [c({ Id: s('minecraft:chest'), Pos: { type: 'intArray', value: [1, 1, 1] },
        Data: c({ Items: l('compound', [c({ Slot: { type: 'byte', value: 0 }, id: s('minecraft:bread'), count: i(5) })]), CustomName: s('"Vorrat"') }) })]) }),
    Entities: l('compound', [c({ Id: s('minecraft:armor_stand'), Pos: { type: 'list', elementType: 'double', value: [{ type: 'double', value: 0.5 }, { type: 'double', value: 1 }, { type: 'double', value: 0.5 }] },
      Data: c({ id: s('minecraft:armor_stand'), Rotation: l('float', [{ type: 'float', value: 90 }, { type: 'float', value: 0 }]) }) })]),
  }) });
  return gzipSync(writeNbt({ name: '', tag }));
}

test('FORMAT-01: WorldEdit layout keeps WEOffset and survives import → export → import', async () => {
  const bytes = worldEditLike();
  const r = await importSchemV3(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  assert.deepEqual(r.offset, [1200, 64, -300]);
  assert.deepEqual(r.weOffset, [-1, 0, -2]);
  assert.ok(r.warnings.some(w => /WorldEdit-Einfügepunkt: Kopierposition 1 \/ 0 \/ 2/.test(w)));
  const dir = mkdtempSync(join(tmpdir(), 'we-')), file = join(dir, 'we.schem'), out = join(dir, 'out.schem');
  writeFileSync(file, bytes);
  const run = spawnSync(process.execPath, ['scripts/checks/check_schem_roundtrip.mjs', file, '--out', out, '--json'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  const rep = JSON.parse(run.stdout);
  assert.equal(rep.equal, true);
  assert.deepEqual([rep.cells, rep.blockEntities, rep.entities], [12, 1, 1]);
  assert.equal(rep.verifierOriginal, 'gültig'); assert.equal(rep.verifierExport, 'gültig');
  assert.equal(rep.notes.length, 1, 'the planner export moves the WorldEdit paste point – reported, not hidden');
  assert.match(rep.notes[0], /WEOffset\) -1,0,-2 → 1200,64,-300/);
});

test('FORMAT-01: the checker reports a broken file as a reading error', () => {
  const dir = mkdtempSync(join(tmpdir(), 'we-')), file = join(dir, 'kaputt.schem');
  writeFileSync(file, gzipSync(Buffer.from([10, 0, 0, 0])));
  const run = spawnSync(process.execPath, ['scripts/checks/check_schem_roundtrip.mjs', file], { encoding: 'utf8' });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /Import fehlgeschlagen/);
});
