// EDIT-06: editing chest/sign contents keeps unknown NBT, writes the 26.3 format and round-trips through the readers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  editableContent, slotLabel, readContainer, checkContainer, withContainer, readSign, checkSign, withSign, blockEntityContent, CONTAINER_SLOTS,
} from '../../../dist/voxel/src/index.js';
import { createDraft, executeEdit, EMPTY_DRAFT_HISTORY, materializeDraft, setCells, cellAt } from '../../../dist/domain/src/index.js';

const s = value => ({ type: 'string', value }), b = value => ({ type: 'byte', value }), i = value => ({ type: 'int', value });
const compound = value => ({ type: 'compound', value });

test('editableContent knows containers and signs from the profile', () => {
  assert.deepEqual(editableContent('minecraft:chest'), { kind: 'container', type: 'minecraft:chest', slots: 27 });
  assert.deepEqual(editableContent('minecraft:red_shulker_box'), { kind: 'container', type: 'minecraft:shulker_box', slots: 27 });
  assert.equal(editableContent('minecraft:hopper').slots, 5);
  assert.equal(editableContent('minecraft:blast_furnace').slots, 3);
  assert.equal(editableContent('minecraft:oak_sign').kind, 'sign');
  assert.equal(editableContent('minecraft:spruce_wall_hanging_sign').type, 'minecraft:hanging_sign');
  assert.equal(editableContent('minecraft:stone'), null);
  assert.equal(editableContent('minecraft:ender_chest'), null, 'Endertruhe hat keinen eigenen Inhalt');
  assert.equal(slotLabel('minecraft:furnace', 1), 'Brennstoff');
  assert.equal(slotLabel('minecraft:chest', 0), 'Platz 1');
  assert.ok(Object.values(CONTAINER_SLOTS).every(n => n > 0));
});

test('withContainer writes Items with Slot/id/count, keeps components and other fields', () => {
  const old = compound({
    id: s('minecraft:chest'), LootTable: s('minecraft:chests/village'), Lock: s('x'),
    Items: { type: 'list', elementType: 'compound', value: [
      compound({ Slot: b(0), id: s('minecraft:diamond_sword'), count: i(1), components: compound({ 'minecraft:damage': i(5) }) }),
      compound({ Slot: b(4), id: s('minecraft:bread'), Count: b(3) }),
    ] },
  });
  assert.deepEqual(readContainer(old), { items: [{ slot: 0, id: 'minecraft:diamond_sword', count: 1, from: 0 }, { slot: 4, id: 'minecraft:bread', count: 3, from: 4 }], name: '' });
  const next = withContainer(old, 'minecraft:chest', { items: [{ slot: 0, id: 'minecraft:diamond_sword', count: 1 }, { slot: 4, id: 'torch', count: 16 }, { slot: 26, id: 'minecraft:bread', count: 64 }], name: 'Vorrat' });
  const t = next.value;
  assert.equal(t.LootTable.value, 'minecraft:chests/village');
  assert.equal(t.Lock.value, 'x');
  assert.equal(t.CustomName.value, 'Vorrat');
  const items = t.Items.value.map(c => c.value);
  assert.equal(items.length, 3);
  assert.deepEqual(items[0].components, compound({ 'minecraft:damage': i(5) }), 'unveränderter Platz behält Komponenten');
  assert.deepEqual(items[1], { Slot: b(4), id: s('minecraft:torch'), count: i(16) }, 'neuer Gegenstand ohne alte Felder');
  assert.equal(items[2].Slot.value, 26);
  const content = blockEntityContent(next);
  assert.equal(content.name, 'Vorrat');
  assert.deepEqual(content.items.map(x => [x.slot, x.id, x.count]), [[0, 'minecraft:diamond_sword', 1], [4, 'minecraft:torch', 16], [26, 'minecraft:bread', 64]]);
  // Emptying removes Items and the name.
  const empty = withContainer(next, 'minecraft:chest', { items: [], name: '' });
  assert.equal(empty.value.Items, undefined);
  assert.equal(empty.value.CustomName, undefined);
  assert.equal(empty.value.LootTable.value, 'minecraft:chests/village');
});

test('withContainer creates a new tile and keeps the Sponge wrapper', () => {
  const fresh = withContainer(undefined, 'minecraft:barrel', { items: [{ slot: 2, id: 'minecraft:cobblestone', count: 64 }], name: '' });
  assert.equal(fresh.value.id.value, 'minecraft:barrel');
  const sponge = compound({ Id: s('minecraft:hopper'), Pos: { type: 'intArray', value: [1, 2, 3] }, Data: compound({ TransferCooldown: i(0) }) });
  const next = withContainer(sponge, 'minecraft:hopper', { items: [{ slot: 4, id: 'minecraft:iron_ingot', count: 2 }], name: '' });
  assert.equal(next.value.Id.value, 'minecraft:hopper');
  assert.equal(next.value.Data.value.TransferCooldown.value, 0);
  assert.equal(next.value.Data.value.Items.value.length, 1);
});

test('checkContainer rejects unknown items, wrong slots, duplicates and bad counts', () => {
  assert.deepEqual(checkContainer('minecraft:hopper', { items: [{ slot: 0, id: 'minecraft:torch', count: 1 }], name: '' }), []);
  const p = checkContainer('minecraft:hopper', { items: [
    { slot: 5, id: 'minecraft:torch', count: 1 }, { slot: 0, id: 'minecraft:no_such_item', count: 1 },
    { slot: 1, id: 'minecraft:torch', count: 0 }, { slot: 1, id: 'minecraft:torch', count: 1 },
  ], name: '' });
  assert.equal(p.length, 4, p.join(' | '));
  assert.throws(() => withContainer(undefined, 'minecraft:hopper', { items: [{ slot: 9, id: 'minecraft:torch', count: 1 }], name: '' }), /Plätze/);
  assert.throws(() => withContainer(undefined, 'minecraft:stone', { items: [], name: '' }), /kein Behälter/);
});

test('withSign writes both sides, keeps the back colour and replaces the old Text1..4 format', () => {
  const old = compound({ id: s('minecraft:sign'), Text1: s('{"text":"Alt"}'), Text2: s('""'), Color: s('blue') });
  const r = readSign(old);
  assert.deepEqual(r.front, ['Alt', '', '', '']);
  assert.equal(r.color, 'blue');
  const next = withSign(old, 'minecraft:oak_sign', { ...r, front: ['Taverne', 'zum', 'Creeper', ''], back: ['Geöffnet', '', '', ''], glowing: true, waxed: true });
  const t = next.value;
  assert.equal(t.Text1, undefined); assert.equal(t.Color, undefined);
  assert.deepEqual(t.front_text.value.messages.value.map(m => m.value), ['Taverne', 'zum', 'Creeper', '']);
  assert.equal(t.front_text.value.color.value, 'blue');
  assert.equal(t.front_text.value.has_glowing_text.value, 1);
  assert.equal(t.back_text.value.color.value, 'black');
  assert.equal(t.is_waxed.value, 1);
  const content = blockEntityContent(next);
  assert.deepEqual(content.sign.front, ['Taverne', 'zum', 'Creeper', '']);
  assert.deepEqual(content.sign.back, ['Geöffnet', '', '', '']);
  assert.deepEqual(readSign(next), { front: ['Taverne', 'zum', 'Creeper', ''], back: ['Geöffnet', '', '', ''], waxed: true, color: 'blue', glowing: true });
  // Unknown fields on a side survive.
  const tagged = compound({ id: s('minecraft:hanging_sign'), front_text: compound({ messages: { type: 'list', elementType: 'string', value: [s('a'), s(''), s(''), s('')] }, color: s('red'), has_glowing_text: b(0), extra: s('keep') }) });
  const t2 = withSign(tagged, 'minecraft:oak_hanging_sign', { ...readSign(tagged), front: ['b', '', '', ''] }).value;
  assert.equal(t2.front_text.value.extra.value, 'keep');
  assert.equal(t2.front_text.value.color.value, 'red');
  assert.deepEqual(checkSign({ front: ['', '', '', ''], back: ['', '', '', ''], waxed: false, color: 'rainbow', glowing: false }).length, 1);
});

test('a content edit is one undoable cell change and lands in the materialized payload', () => {
  const draft = createDraft(null, 'java-26.3');
  const chest = { id: 'minecraft:chest', properties: { facing: 'north', type: 'single', waterlogged: 'false' } };
  let run = executeEdit(draft, EMPTY_DRAFT_HISTORY, setCells([[0, 0, 0]], { kind: 'block', state: chest }, 'Setzen'));
  const entity = withContainer(undefined, 'minecraft:chest', { items: [{ slot: 0, id: 'minecraft:apple', count: 5 }], name: '' });
  run = executeEdit(run.draft, run.history, setCells([[0, 0, 0]], { kind: 'block', state: chest, entity }, 'Inhalt Truhe'));
  assert.deepEqual(cellAt(run.draft, [0, 0, 0]).entity, entity);
  const payload = materializeDraft(run.draft);
  assert.equal(payload.blockEntities.length, 1);
  assert.deepEqual(blockEntityContent(payload.blockEntities[0].data).items.map(x => x.id), ['minecraft:apple']);
});

test('CORE-04: verschobener Gegenstand behält Verzauberung, unveränderter Name und Schildzeilen bleiben formatiert', () => {
  const sword = compound({ Slot: b(0), id: s('minecraft:diamond_sword'), count: i(1), components: compound({ 'minecraft:damage': i(5) }) });
  const fancyName = compound({ text: s('Schatz'), color: s('gold') });
  const old = compound({ id: s('minecraft:chest'), CustomName: fancyName, Items: { type: 'list', elementType: 'compound', value: [sword] } });
  const read = readContainer(old);
  // Move the sword from slot 0 to slot 1, keep the name.
  const moved = withContainer(old, 'minecraft:chest', { items: read.items.map(it => ({ ...it, slot: 1 })), name: read.name });
  const item = moved.value.Items.value[0].value;
  assert.equal(item.Slot.value, 1);
  assert.deepEqual(item.components, sword.value.components, 'Komponenten wandern mit');
  assert.deepEqual(moved.value.CustomName, fancyName, 'unveränderter Name bleibt formatiert');
  const renamed = withContainer(old, 'minecraft:chest', { items: read.items, name: 'Neu' });
  assert.deepEqual(renamed.value.CustomName, s('Neu'));

  const red = compound({ text: s('Taverne'), color: s('red') });
  const sign = compound({ id: s('minecraft:sign'),
    front_text: compound({ messages: { type: 'list', elementType: 'compound', value: [red, compound({ text: s('') }), compound({ text: s('') }), compound({ text: s('') })] },
      filtered_messages: { type: 'list', elementType: 'compound', value: [red] }, color: s('black'), has_glowing_text: b(0) }) });
  const r = readSign(sign);
  assert.equal(r.front[0], 'Taverne');
  const waxed = withSign(sign, 'minecraft:oak_sign', { ...r, waxed: true });
  assert.deepEqual(waxed.value.front_text.value.messages.value[0], red, 'nur Wachs geändert: Zeile bleibt rot');
  assert.ok(waxed.value.front_text.value.filtered_messages, 'unverändert: gefilterter Text bleibt');
  const edited = withSign(sign, 'minecraft:oak_sign', { ...r, front: ['Taverne', 'zum Creeper', '', ''] });
  const lines = edited.value.front_text.value.messages;
  assert.equal(lines.elementType, 'compound');
  assert.deepEqual(lines.value[0], red);
  assert.deepEqual(lines.value[1], compound({ text: s('zum Creeper') }));
  assert.equal(edited.value.front_text.value.filtered_messages, undefined, 'geänderte Seite: veralteter gefilterter Text fällt weg');
});
