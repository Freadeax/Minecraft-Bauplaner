import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { createPayload, scanExportSafety, sanitizeForExport, exportSafetyLines } from '../../../dist/voxel/src/index.js';
import { writeSchemV3, writeLitematic, readNbt } from '../../../dist/formats/src/index.js';

// RELEASE-01 sicherer Exportmodus: Befehle und Betreiberblöcke werden immer gemeldet und auf Wunsch entfernt.
const S = (id, properties = {}) => ({ id, properties });
const str = value => ({ type: 'string', value });
const comp = value => ({ type: 'compound', value });
const list = (elementType, value) => ({ type: 'list', elementType, value });

function riskyWorld() {
  return createPayload({
    schemaVersion: 1, profileId: 'java:dataversion-3955:registry-unverified',
    bounds: { min: [0, 0, 0], maxExclusive: [7, 1, 1] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0],
    palette: [S('minecraft:stone'), S('minecraft:command_block', { conditional: 'false', facing: 'up' }), S('minecraft:oak_sign', { rotation: '0', waterlogged: 'false' }),
      S('minecraft:spawner'), S('minecraft:structure_block', { mode: 'load' }), S('minecraft:chest', { facing: 'north', type: 'single', waterlogged: 'false' }), S('minecraft:lectern', { facing: 'north', has_book: 'true', powered: 'false' })],
    cells: [0, 1, 2, 3, 4, 5, 6].map(i => ({ position: [i, 0, 0], kind: 'block', paletteIndex: i })),
    blockEntities: [
      { position: [1, 0, 0], data: comp({ id: str('minecraft:command_block'), Command: str('op @a') }) },
      // 1.21.5+ sign text: click_event as NBT, plus an older JSON line.
      { position: [2, 0, 0], data: comp({ id: str('minecraft:sign'), front_text: comp({ messages: list('string', [
        str('{"text":"Klick","clickEvent":{"action":"run_command","value":"/give @s diamond"}}'), str('"zwei"'), str('"drei"'), str('"vier"')]) }),
        back_text: comp({ messages: list('compound', [comp({ text: str('Hinten'), click_event: comp({ action: str('run_command'), command: str('kill @e') }) })]) }) }) },
      { position: [3, 0, 0], data: comp({ id: str('minecraft:mob_spawner'), SpawnData: comp({ entity: comp({ id: str('minecraft:wither') }) }) }) },
      { position: [4, 0, 0], data: comp({ id: str('minecraft:structure_block'), mode: str('LOAD'), name: str('x:y') }) },
      { position: [5, 0, 0], data: comp({ id: str('minecraft:chest'), Items: list('compound', [
        comp({ Slot: { type: 'byte', value: 0 }, id: str('minecraft:command_block'), count: { type: 'int', value: 1 } }),
        comp({ Slot: { type: 'byte', value: 1 }, id: str('minecraft:bread'), count: { type: 'int', value: 3 } })]) }) },
      { position: [6, 0, 0], data: comp({ id: str('minecraft:lectern'), Book: comp({ id: str('minecraft:written_book'), components: comp({ 'minecraft:written_book_content': comp({
        pages: list('string', [str('{"text":"Seite","clickEvent":{"action":"run_command","value":"/op me"}}')]) }) }) }) }) },
    ],
    entities: [
      { position: [0.5, 0, 0.5], data: comp({ id: str('minecraft:command_block_minecart'), Command: str('say hi') }) },
      { position: [3.5, 0, 0.5], data: comp({ id: str('minecraft:armor_stand') }) },
    ],
  });
}

test('scan reports every command and operator-only part without changing the plan', () => {
  const world = riskyWorld();
  const r = scanExportSafety(world);
  assert.deepEqual(r.counts, { command_block: 1, command_minecart: 1, click_command: 3, command_item: 1, spawner: 1, structure_block: 1 });
  assert.equal(r.total, 8);
  const cmd = r.findings.find(f => f.kind === 'command_block');
  assert.deepEqual(cmd.position, [1, 0, 0]);
  assert.equal(cmd.detail, 'op @a');
  assert.ok(r.findings.some(f => f.kind === 'click_command' && f.detail === '/give @s diamond'));
  assert.ok(r.findings.some(f => f.kind === 'click_command' && f.detail === 'kill @e'));
  assert.match(exportSafetyLines(r, false)[0], /1× Befehlsblock.*Sicherer Modus/);
});

test('safe mode removes commands, keeps sign text, bread and the armor stand', () => {
  const { world, report } = sanitizeForExport(riskyWorld());
  assert.equal(report.total, 8);
  const ids = world.cells.map(c => world.palette[c.paletteIndex].id);
  assert.deepEqual(ids, ['minecraft:stone', 'minecraft:oak_sign', 'minecraft:spawner', 'minecraft:chest', 'minecraft:lectern']);
  const be = Object.fromEntries(world.blockEntities.map(e => [e.position[0], e.data.value]));
  assert.equal(be[1], undefined, 'Befehlsblockdaten entfernt');
  assert.equal(be[3], undefined, 'Spawner-Inhalt entfernt');
  assert.equal(be[4], undefined, 'Strukturblock entfernt');
  const front = be[2].front_text.value.messages.value[0].value;
  assert.deepEqual(JSON.parse(front), { text: 'Klick' });
  const back = be[2].back_text.value.messages.value[0].value;
  assert.equal(back.text.value, 'Hinten');
  assert.equal(back.click_event, undefined);
  assert.deepEqual(be[5].Items.value.map(i => i.value.id.value), ['minecraft:bread']);
  assert.doesNotMatch(JSON.stringify(be[6]), /run_command/);
  assert.deepEqual(world.entities.map(e => e.data.value.id.value), ['minecraft:armor_stand']);
  // The cleaned plan has nothing left to report.
  assert.equal(scanExportSafety(world).total, 0);
});

test('a plan without commands passes through unchanged', () => {
  const world = createPayload({ schemaVersion: 1, profileId: 'p', bounds: { min: [0, 0, 0], maxExclusive: [1, 1, 1] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0],
    palette: [S('minecraft:stone')], cells: [{ position: [0, 0, 0], kind: 'block', paletteIndex: 0 }], blockEntities: [] });
  const out = sanitizeForExport(world);
  assert.equal(out.world, world);
  assert.equal(out.report.total, 0);
  assert.deepEqual(exportSafetyLines(out.report, true), []);
});

test('safe Schem and Litematic files carry no command data', async () => {
  const { world } = sanitizeForExport(riskyWorld());
  const opts = { dataVersion: 3955, anchor: 'min-corner', unselected: 'air' };
  for (const out of [await writeSchemV3(world, opts), await writeLitematic(world, { ...opts, regionName: 'Test' })]) {
    const text = JSON.stringify(readNbt(gunzipSync(out.bytes)));
    for (const bad of ['command_block', 'run_command', 'structure_block', 'wither', 'op @a']) assert.ok(!text.includes(bad), `${bad} steht noch in der Datei`);
    assert.ok(text.includes('minecraft:bread') && text.includes('Hinten'));
  }
  // Without safe mode the command block stays in the file (nothing is altered silently).
  const raw = JSON.stringify(readNbt(gunzipSync((await writeSchemV3(riskyWorld(), opts)).bytes)));
  assert.ok(raw.includes('minecraft:command_block') && raw.includes('op @a'));
});
