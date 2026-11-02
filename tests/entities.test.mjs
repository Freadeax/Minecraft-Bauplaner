import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createPayload, transformPayload, PAINTING_VARIANTS, entityAnchor, entityCells, entityFacing, entityKind, entityItems, entityEquipment, entityExportData,
  hangingPosition, makePainting, makeItemFrame, makeArmorStand, transformEntity, transformDirection, entityYaw, blockEntityContent, hasContent, componentText,
  paintingInfo, importEntity,
} from '../dist/voxel/src/index.js';
import { readNbt, importLitematic, normalizeLitematic, buildLitematic, buildSchemV3, normalizeSchem } from '../dist/formats/src/index.js';
import {
  createAsset, addAssetVersion, createProject, applyOperation, newInstance, resolveProject, buildGuide, computeMaterials, materialsToCsv, canonicalJson,
  createDraft, applyEdit, executeEdit, undoEdit, redoEdit, materializeDraft, summarizeDraft, EMPTY_DRAFT_HISTORY, sha256Hex,
} from '../dist/domain/src/index.js';

const s = value => ({ type: 'string', value }), b = value => ({ type: 'byte', value }), i = value => ({ type: 'int', value }), f = value => ({ type: 'float', value: Math.fround(value) });
const compound = value => ({ type: 'compound', value });
const list = (elementType, value) => ({ type: 'list', elementType, value });
const item = (id, count = 1) => compound({ id: s(id), count: i(count) });
const STONE = { id: 'minecraft:stone', properties: {} }, CHEST = { id: 'minecraft:chest', properties: { facing: 'north', type: 'single', waterlogged: 'false' } };
const FACINGS = ['north', 'east', 'south', 'west'];

/** 5×4×5 room: stone floor, stone wall along z = 0, a chest, a sign; entities hang on the wall and stand on the floor. */
function room(entities) {
  const palette = [STONE, CHEST, { id: 'minecraft:oak_sign', properties: { rotation: '0', waterlogged: 'false' } }], cells = [];
  for (let x = 0; x < 5; x++) for (let z = 0; z < 5; z++) cells.push({ position: [x, 0, z], kind: 'block', paletteIndex: 0 });
  for (let x = 0; x < 5; x++) for (let y = 1; y < 4; y++) cells.push({ position: [x, y, 0], kind: 'block', paletteIndex: 0 });
  cells.push({ position: [4, 1, 4], kind: 'block', paletteIndex: 1 }, { position: [0, 1, 4], kind: 'block', paletteIndex: 2 });
  const blockEntities = [
    { position: [4, 1, 4], data: compound({ id: s('minecraft:chest'), Items: list('compound', [compound({ Slot: b(0), id: s('minecraft:bread'), count: i(12) }), compound({ Slot: b(5), id: s('minecraft:torch'), Count: b(3) })]) }) },
    { position: [0, 1, 4], data: compound({ id: s('minecraft:sign'), front_text: compound({ messages: list('string', [s('"Willkommen"'), s('{"text":"im ","extra":[{"text":"Haus"}]}'), s('""'), s('""')]) }), back_text: compound({ messages: list('string', [s('""'), s('""'), s('""'), s('""')]) }) }) },
  ];
  return createPayload({ schemaVersion: 1, profileId: 'java:test', bounds: { min: [0, 0, 0], maxExclusive: [5, 4, 5] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette, cells, blockEntities, ...(entities && { entities }) });
}
const furnished = () => [
  makePainting([1, 2, 1], 'south', 'minecraft:sea'),
  makeItemFrame([3, 2, 1], 'south', 'minecraft:diamond_sword'),
  makeArmorStand([2, 1, 3], 'north', { head: 'minecraft:iron_helmet', chest: 'minecraft:iron_chestplate' }, { arms: true }),
];

test('anchor and position are inverse for every painting size and facing, also mirrored and rotated', () => {
  for (const [variant, [w, h]] of Object.entries(PAINTING_VARIANTS)) for (const facing of FACINGS) {
    const e = makePainting([10, 64, -7], facing, variant);
    assert.deepEqual(entityAnchor(e), [10, 64, -7], `${variant} ${facing}`);
    assert.equal(paintingInfo(e).width, w); assert.equal(paintingInfo(e).height, h);
    assert.equal(entityCells(e).length, w * h);
    assert.ok(entityCells(e).some(c => c.join() === '10,64,-7'));
  }
  for (const facing of [...FACINGS, 'up', 'down']) assert.deepEqual(entityAnchor(makeItemFrame([0, 5, 0], facing, null)), [0, 5, 0]);
  assert.deepEqual(entityAnchor(makeArmorStand([3, 1, 2], 'east')), [3, 1, 2]);
  assert.throws(() => makePainting([0, 0, 0], 'up', 'kebab'), /Wänden/);
});

test('Minecraft hanging geometry: a 2×1 painting facing east at block_pos (1,0,1) sits at (1.03125, 0.5, 1.0)', () => {
  // Same numbers as the real-world fixture (HangingEntity: centre − facing·0.46875 + counter-clockwise·0.5 for even widths).
  assert.deepEqual(hangingPosition('painting', [1, 0, 1], 'east', [2, 1]), [1.03125, 0.5, 1]);
  assert.deepEqual(hangingPosition('item_frame', [0, 0, 2], 'south'), [0.5, 0.5, 2.03125]);
});

test('transform: four quarter turns are the identity; facing and yaw follow transformDirection; mirroring flips item rotation', () => {
  const t = q => ({ position: [0, 0, 0], quarterTurns: q, mirrorX: false });
  for (const e of furnished()) {
    let cur = e;
    for (let k = 0; k < 4; k++) cur = transformEntity(cur, [0, 0, 0], t(1)).entity;
    assert.deepEqual(cur.position.map(n => Math.round(n * 1e9) / 1e9), e.position.map(n => Math.round(n * 1e9) / 1e9));
    assert.equal(entityFacing(cur), entityFacing(e));
    assert.ok(Math.abs(((entityYaw(cur) - entityYaw(e)) % 360 + 360) % 360) < 1e-6 || Math.abs((((entityYaw(cur) - entityYaw(e)) % 360) + 360) % 360 - 360) < 1e-6);
  }
  const [painting, frame, stand] = furnished();
  for (const q of [1, 2, 3]) {
    const p = transformEntity(painting, [0, 0, 0], t(q)).entity;
    assert.equal(entityFacing(p), transformDirection('south', t(q)));
    // The anchor moves like a cell and the painting stays attached: anchor of the result = transformed anchor ± its width shift.
    const s2 = transformEntity(stand, [0, 0, 0], t(q)).entity, dir = transformDirection('north', t(q));
    const yaw = entityYaw(s2), expected = { south: 0, west: 90, north: 180, east: -90 }[dir];
    assert.ok(Math.abs((((yaw - expected) % 360) + 540) % 360 - 180) < 1e-3, `yaw ${yaw} for ${dir}`);
  }
  const rotated = compound({ ...frame.data.value, ItemRotation: b(3) });
  const m = transformEntity({ ...frame, data: rotated }, [0, 0, 0], { position: [0, 0, 0], quarterTurns: 0, mirrorX: true });
  assert.equal(m.entity.data.value.ItemRotation.value, 5); assert.ok(m.resolved);
  const floor = makeItemFrame([0, 1, 0], 'up', 'minecraft:map');
  const r = transformEntity(floor, [0, 0, 0], t(1));
  assert.equal(r.resolved, false, 'item rotation in a lying frame is not claimed');
});

test('payload contract: optional entities, validated, hash unchanged without them, transformed with the payload', async () => {
  const plain = room(), withE = room(furnished());
  assert.equal('entities' in plain, false);
  assert.equal(await sha256Hex(canonicalJson(plain)), await sha256Hex(canonicalJson(room())));
  assert.equal(withE.entities.length, 3);
  const bad = (entities, re) => assert.throws(() => room(entities), re);
  bad([{ position: [NaN, 0, 0], data: compound({ id: s('minecraft:painting') }) }], /endliche/);
  bad([{ position: [50, 0, 0], data: compound({ id: s('minecraft:painting') }) }], /Auswahlgrenzen/);
  bad([{ position: [1, 1, 1], data: compound({ variant: s('kebab') }) }], /id/);
  bad([{ position: [1, 1, 1], data: s('x') }], /Compound/);
  bad([{ position: [1, 1, 1], data: compound({ id: s('minecraft:painting') }), extra: 1 }], /unbekanntes Feld/);
  const r = transformPayload(withE, { position: [10, 0, 0], quarterTurns: 1, mirrorX: false });
  assert.equal(r.payload.entities.length, 3); assert.ok(!r.issues.some(x => x.code === 'UNRESOLVED_ENTITY'));
  assert.equal(entityFacing(r.payload.entities[0]), 'west');
});

test('block entity content: sign text (JSON, literal, old Text1–4), container items, banner patterns (old and new)', () => {
  const p = room();
  const chest = blockEntityContent(p.blockEntities[0].data);
  assert.deepEqual(chest.items.map(x => [x.id, x.count, x.slot]), [['minecraft:bread', 12, 0], ['minecraft:torch', 3, 5]]);
  const sign = blockEntityContent(p.blockEntities[1].data);
  assert.deepEqual(sign.sign.front, ['Willkommen', 'im Haus', '', '']); assert.ok(hasContent(sign));
  assert.equal(componentText(s('Schlicht')), 'Schlicht');
  const old = blockEntityContent(compound({ id: s('minecraft:sign'), Text1: s('{"text":"Alt"}'), Text2: s('""') }));
  assert.equal(old.sign.front[0], 'Alt');
  const banner = blockEntityContent(compound({ id: s('minecraft:banner'), patterns: list('compound', [compound({ pattern: s('minecraft:stripe_top'), color: s('red') })]) }));
  assert.deepEqual(banner.patterns, [{ pattern: 'stripe_top', color: 'red' }]);
  const legacy = blockEntityContent(compound({ id: s('minecraft:banner'), Patterns: list('compound', [compound({ Pattern: s('ts'), Color: i(14) })]) }));
  assert.deepEqual(legacy.patterns, [{ pattern: 'ts', color: 'red' }]);
  // Sponge entries keep the tile under Data.
  const sponge = blockEntityContent(compound({ Id: s('minecraft:barrel'), Pos: { type: 'intArray', value: [0, 0, 0] }, Data: compound({ Items: list('compound', [compound({ Slot: b(1), id: s('minecraft:apple'), count: i(2) })]) }) }));
  assert.equal(sponge.id, 'minecraft:barrel'); assert.equal(sponge.items[0].id, 'minecraft:apple');
  assert.equal(hasContent(blockEntityContent(compound({ id: s('minecraft:chest') }))), false);
});

test('entity items: placement item counts as build item, shown/worn items and container contents are listed separately', () => {
  const [painting, frame, stand] = furnished();
  assert.deepEqual(entityItems(painting), { placement: 'minecraft:painting', contents: [] });
  assert.equal(entityItems(frame).contents[0].id, 'minecraft:diamond_sword');
  assert.deepEqual(Object.keys(entityEquipment(stand)).sort(), ['chest', 'head']);
  const old = { position: [0, 0, 0], data: compound({ id: s('minecraft:armor_stand'), ArmorItems: list('compound', [compound({}), compound({}), item('minecraft:golden_chestplate'), compound({ id: s('minecraft:carved_pumpkin'), Count: b(1) })]), HandItems: list('compound', [item('minecraft:torch'), compound({})]) }) };
  assert.deepEqual(Object.fromEntries(Object.entries(entityEquipment(old)).map(([k, v]) => [k, v.id])), { chest: 'minecraft:golden_chestplate', head: 'minecraft:carved_pumpkin', mainhand: 'minecraft:torch' });
  const mob = { position: [1, 1, 1], data: compound({ id: s('minecraft:villager') }) };
  const report = computeMaterials(room([...furnished(), mob]));
  const line = id => report.items.find(l => l.itemId === id);
  assert.equal(line('minecraft:painting').count, 1); assert.equal(line('minecraft:item_frame').count, 1); assert.equal(line('minecraft:armor_stand').count, 1);
  assert.equal(line('minecraft:painting').sources[0].rule, 'entity');
  assert.equal(report.entities, 4);
  const content = id => report.contents.find(c => c.itemId === id);
  assert.equal(content('minecraft:diamond_sword').places[0].label, 'Rahmen');
  assert.equal(content('minecraft:iron_helmet').places[0].label, 'Rüstungsständer');
  assert.equal(content('minecraft:bread').count, 12); assert.equal(content('minecraft:bread').places[0].label, 'Truhe');
  assert.ok(!report.items.some(l => l.itemId === 'minecraft:bread'), 'contents are not build items');
  assert.equal(report.unresolved.find(u => u.reason === 'mob').state.id, 'minecraft:villager');
  assert.match(materialsToCsv(report), /Inhalt;minecraft:bread;12/);
  // Instance scopes count only entities given explicitly.
  assert.equal(computeMaterials(room(furnished()), { include: () => true }).entities, 0);
});

async function project(payload, transform = { position: [0, 0, 0], quarterTurns: 0, mirrorX: false }) {
  const { version } = await addAssetVersion(createAsset({ id: 'raum', name: 'Raum', provenance: { author: 'Test', source: 'synthetisch', license: '' } }), { payload, source: { format: 'voxel-json' } });
  const inst = newInstance({ assetVersionId: version.id, name: 'Raum', transform });
  const p = applyOperation(createProject({ name: 'E' }), { kind: 'instance.add', instance: inst }).project;
  return { p, inst, versions: new Map([[version.id, version]]) };
}

test('projects: placed instances carry their entities into the world; guide ends with an „Ausstattung“ step', async () => {
  const { p, inst, versions } = await project(room(furnished()), { position: [20, 0, 0], quarterTurns: 1, mirrorX: false });
  const r = resolveProject(p, versions);
  assert.equal(r.world.entities.length, 3);
  assert.ok(r.world.entities.every(e => e.position[0] >= 15));
  const guide = buildGuide(p, r);
  const last = guide.steps.at(-1);
  assert.equal(last.phase, 'furnish'); assert.equal(last.id, `${inst.id}~furnish`); assert.equal(last.order, guide.steps.length);
  assert.equal(last.positions.length, 0);
  assert.equal(last.furnish.filter(x => x.kind === 'entity').length, 3);
  assert.deepEqual(last.furnish.filter(x => x.kind === 'content').map(x => x.label).sort(), ['Schild beschriften', 'Truhe füllen']);
  assert.ok(last.prerequisites.length > 0 && last.prerequisites.every(id => guide.byId.get(id).order < last.order));
  assert.equal(new Set(guide.steps.map(s => s.id)).size, guide.steps.length);
  // Without entities or contents there is no extra step.
  const bare = await project(createPayload({ schemaVersion: 1, profileId: 'java:test', bounds: { min: [0, 0, 0], maxExclusive: [1, 1, 1] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette: [STONE], cells: [{ position: [0, 0, 0], kind: 'block', paletteIndex: 0 }], blockEntities: [] }));
  assert.ok(!buildGuide(bare.p, resolveProject(bare.p, bare.versions)).steps.some(st => st.phase === 'furnish'));
});

test('exports: Litematic and Schem v3 write the entities with relative Pos/TileX and read them back unchanged', () => {
  const world = room(furnished());
  const lit = buildLitematic(world, { dataVersion: 4500, anchor: 'project-origin', unselected: 'air' });
  const region = Object.values(lit.nbt.tag.value.Regions.value)[0].value;
  assert.equal(region.Entities.value.length, 3); assert.equal(lit.report.freeEntities, 3);
  const painting = region.Entities.value[0].value;
  assert.deepEqual(painting.Pos.value.map(x => x.value), world.entities[0].position);
  assert.deepEqual([painting.TileX.value, painting.TileY.value, painting.TileZ.value], [1, 2, 1]);
  assert.deepEqual(painting.block_pos.value, [1, 2, 1]);
  const back = normalizeLitematic(lit.nbt);
  assert.deepEqual(back.payload.entities.map(e => [e.position, canonicalJson(e.data)]), world.entities.map(e => [e.position, canonicalJson(e.data)]));
  const sch = buildSchemV3(world, { dataVersion: 4500, anchor: 'min-corner', unselected: 'air' });
  const ents = sch.nbt.tag.value.Schematic.value.Entities.value;
  assert.equal(ents.length, 3); assert.equal(ents[0].value.Id.value, 'minecraft:painting'); assert.equal(ents[0].value.Data.value.id.value, 'minecraft:painting');
  const again = normalizeSchem(sch.nbt);
  assert.deepEqual(again.payload.entities.map(e => [e.position, canonicalJson(e.data)]), world.entities.map(e => [e.position, canonicalJson(e.data)]));
  // Exports without entities stay as before.
  assert.equal(Object.values(buildLitematic(room(), { dataVersion: 4500, anchor: 'min-corner', unselected: 'air' }).nbt.tag.value.Regions.value)[0].value.Entities.value.length, 0);
  assert.equal('Entities' in buildSchemV3(room(), { dataVersion: 4500, anchor: 'min-corner', unselected: 'air' }).nbt.tag.value.Schematic.value, false);
});

test('real-world fixture: entities land in their Minecraft cells and survive a Litematic round trip', async () => {
  const raw = Buffer.from(readFileSync(new URL('../fixtures/litematic/realworld.nbt.hex', import.meta.url), 'utf8').replace(/\s/g, ''), 'hex');
  const r = await importLitematic(Uint8Array.from(raw).buffer);
  const [painting, frame] = r.payload.entities;
  assert.equal(entityKind(painting), 'painting'); assert.equal(entityFacing(painting), 'east'); assert.deepEqual(entityAnchor(painting), [1, 0, 1]);
  assert.equal(entityKind(frame), 'item_frame'); assert.equal(entityFacing(frame), 'south'); assert.deepEqual(entityAnchor(frame), [0, 0, 2]);
  const out = buildLitematic(r.payload, { dataVersion: r.dataVersion, anchor: 'min-corner', unselected: 'air' });
  const back = normalizeLitematic(out.nbt);
  assert.deepEqual(back.payload.entities, r.payload.entities);
  const exported = entityExportData(painting, [0, 0, 0]);
  assert.deepEqual([exported.TileX.value, exported.TileY.value, exported.TileZ.value], [1, 0, 1]);
});

test('Werkstatt draft: entity edits are undoable, saved with the version and counted as a change', () => {
  const base = room();
  let draft = createDraft(base), history = EMPTY_DRAFT_HISTORY;
  const painting = makePainting([2, 2, 1], 'south', 'minecraft:kebab');
  const r = executeEdit(draft, history, { label: 'Gemälde', changes: [], entities: [painting] });
  assert.equal(r.changed, 1); draft = r.draft; history = r.history;
  assert.equal(summarizeDraft(draft).entities, 1);
  assert.deepEqual(materializeDraft(draft).entities, [painting]);
  const u = undoEdit(draft, history);
  assert.equal(u.draft.entities.length, 0); assert.equal(summarizeDraft(u.draft).entities, 0);
  assert.equal('entities' in materializeDraft(u.draft), false);
  const again = redoEdit(u.draft, u.history);
  assert.deepEqual(again.draft.entities, [painting]);
  assert.equal(applyEdit(again.draft, { label: 'x', changes: [], entities: [painting] }).changed, 0, 'same list is a no-op');
  // Cell edits keep the entity list.
  const cell = applyEdit(again.draft, { label: 'Stein', changes: [{ position: [2, 3, 3], value: { kind: 'block', state: STONE } }] });
  assert.deepEqual(cell.draft.entities, [painting]);
});

test('import keeps unknown entity data and strips only position fields', () => {
  const data = compound({ id: s('minecraft:armor_stand'), Pos: list('double', [{ type: 'double', value: 1 }, { type: 'double', value: 2 }, { type: 'double', value: 3 }]), CustomName: s('"Wache"'), Rotation: list('float', [f(45), f(0)]), UUID: { type: 'intArray', value: [1, 2, 3, 4] } });
  const e = importEntity(data, [1, 2, 3]);
  assert.deepEqual(Object.keys(e.data.value).sort(), ['CustomName', 'Rotation', 'UUID', 'id']);
});
