// Spielprüfung der Planer-Exporte (Roadmap-Block 1: FORMAT-01, FORMAT-02, NBT-01, ENTITY-01, DIFF-01, MAT-04,
// PROFILE-01). Wird von scripts/mod/test_exports_ingame.sh um den Fabric-Clientspieltest in
// mods/bauplaner-bridge/export-check-26.3 herum aufgerufen:
//   prepare <dir>  Planer baut den Prüfbau (Truhen, Doppeltruhe, Fass, Schilder, Strukturblock, gedrehte Bauteile,
//                  Gemälde, Rahmen, Rüstungsständer) und eine Kupferzeile, exportiert ungedreht, gedreht, gespiegelt
//                  und als Kupfervariante (.litematic und .schem) und schreibt job.json für Lauf 1
//   between <dir>  liest die im Spiel mit WorldEdit (//schem save) und Litematica gespeicherten Dateien, vergleicht
//                  sie mit dem Plan, übernimmt sie als Bauteil, exportiert sie wieder und schreibt job.json für Lauf 2
//   verify <dir>   vergleicht alle Abzüge aus dem Spiel Block für Block, BlockEntity für BlockEntity und Entity für
//                  Entity mit dem Plan und mit der Drehung/Spiegelung des Spiels selbst; schreibt bericht.json/.md
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { importStructure, readCompressedNbt, LITEMATIC_LIMITS, parseBlockState } from '../../dist/formats/src/index.js';
import { exportRevisionSchem } from '../../dist/application/src/index.js';
import {
  createAsset, addAssetVersion, createProject, applyOperation, newInstance, resolveProject, freezeRevision, swapMaterials,
} from '../../dist/domain/src/index.js';
import { copperMatrix, COPPER_STAGES } from '../../dist/domain/src/materials/copper.js';
import {
  createPayload, blockFacts, factBlockIds, blockEntityContent, blockEntityTile, hasContent, isHanging, makePainting, makeItemFrame, makeArmorStand, importEntity, entityKind,
  entityFacing, entityItems, entityEquipment, paintingInfo, entityYaw, diffPayloads, checkPayloadProfile, profileItemIds,
} from '../../dist/voxel/src/index.js';
import { PROFILE_BLOCK_ENTITY_TYPES, PROFILE_DATA_VERSION } from '../../dist/voxel/src/profileData.js';

const [mode, dir] = process.argv.slice(2);
if (!['prepare', 'between', 'verify'].includes(mode) || !dir) throw new Error('usage: export_check.mjs prepare|between|verify <dir>');
/** DataVersion of Minecraft 26.3. */
const DATA_VERSION = 5023;
/** Ground of the superflat test world is y = -61: sites (and the player for WorldEdit) stand on it. */
const Y = -60, MARGIN = 2;
const PROV = { author: 'Exportprüfung', source: 'scripts/mod/export_check.mjs', license: 'Testdaten' };

// ------------------------------------------------------------------ NBT helpers
const s = value => ({ type: 'string', value }), b = value => ({ type: 'byte', value }), i = value => ({ type: 'int', value });
const compound = value => ({ type: 'compound', value });
const list = (elementType, value) => ({ type: 'list', elementType, value });
const mc = (id, properties = {}) => ({ id: `minecraft:${id}`, properties });
const ab = buf => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const add = (a, b2) => a.map((v, k) => v + b2[k]);
const read = name => JSON.parse(readFileSync(join(dir, name), 'utf8'));
const write = (name, value) => writeFileSync(join(dir, name), JSON.stringify(value, null, 1));

/** Full state key with every property (missing ones from the profile defaults), sorted. */
function stateKey(st) {
  const defaults = blockFacts(st.id)?.defaults ?? {};
  const props = { ...defaults, ...st.properties };
  const keys = Object.keys(props).sort();
  return st.id + (keys.length ? `[${keys.map(k => `${k}=${props[k]}`).join(',')}]` : '');
}

// ------------------------------------------------------------------ test builds
/**
 * Prüfbau 7×5×7 (x, y, z): floor, back wall at z = 0, inside everything whose data or direction an export can break.
 * With `structureBlock` false the structure block is left out: the planner refuses to mirror it (NBT-01-S03).
 */
function testBuild(structureBlock = true) {
  const palette = [], cells = [], blockEntities = [];
  const put = (pos, state, data) => {
    let k = palette.findIndex(p => p.id === state.id && JSON.stringify(p.properties) === JSON.stringify(state.properties));
    if (k < 0) { palette.push(state); k = palette.length - 1; }
    cells.push({ position: pos, kind: 'block', paletteIndex: k });
    if (data) blockEntities.push({ position: pos, data });
  };
  for (let x = 0; x < 7; x++) for (let z = 0; z < 7; z++) put([x, 0, z], mc('stone_bricks'));
  for (let x = 0; x < 7; x++) for (let y = 1; y < 5; y++) put([x, y, 0], mc('stone'));
  const items = entries => list('compound', entries.map(([slot, id, count, components]) => compound({ Slot: b(slot), id: s(`minecraft:${id}`), count: i(count), ...(components && { components: compound(components) }) })));
  // WERK-09 (Block B): a named chest with an enchanted sword – name and enchantments must survive every export.
  const sword = { 'minecraft:enchantments': compound({ 'minecraft:sharpness': i(3), 'minecraft:unbreaking': i(2) }) };
  // Rotated parts and blocks that hang on the wall.
  put([1, 1, 1], mc('oak_stairs', { facing: 'east', half: 'bottom', shape: 'straight', waterlogged: 'false' }));
  put([2, 1, 1], mc('oak_log', { axis: 'x' }));
  put([3, 1, 2], mc('oak_door', { facing: 'south', half: 'lower', hinge: 'left', open: 'false', powered: 'false' }));
  put([3, 2, 2], mc('oak_door', { facing: 'south', half: 'upper', hinge: 'left', open: 'false', powered: 'false' }));
  put([4, 1, 2], mc('repeater', { delay: '3', facing: 'west', locked: 'false', powered: 'false' }));
  put([5, 1, 2], mc('rail', { shape: 'north_east', waterlogged: 'false' }));
  put([1, 2, 1], mc('lever', { face: 'wall', facing: 'south', powered: 'false' }));
  put([2, 2, 1], mc('wall_torch', { facing: 'south' }));
  put([5, 2, 1], mc('oak_wall_sign', { facing: 'south', waterlogged: 'false' }), compound({ id: s('minecraft:sign'),
    front_text: compound({ messages: list('string', [s('"Willkommen"'), s('"im Prüfbau"'), s('""'), s('""')]), color: s('black'), has_glowing_text: b(0) }),
    back_text: compound({ messages: list('string', [s('"Rückseite"'), s('""'), s('""'), s('""')]), color: s('black'), has_glowing_text: b(0) }), is_waxed: b(0) }));
  put([6, 1, 3], mc('oak_sign', { rotation: '4', waterlogged: 'false' }), compound({ id: s('minecraft:sign'),
    front_text: compound({ messages: list('string', [s('"Osten"'), s('""'), s('""'), s('""')]), color: s('blue'), has_glowing_text: b(1) }),
    back_text: compound({ messages: list('string', [s('""'), s('""'), s('""'), s('"Westen"')]), color: s('black'), has_glowing_text: b(0) }), is_waxed: b(1) }));
  // Containers: single chest, double chest (left half connects clockwise of its facing), barrel.
  put([1, 1, 5], mc('chest', { facing: 'north', type: 'single', waterlogged: 'false' }), compound({ id: s('minecraft:chest'), CustomName: s('Vorräte'), Items: items([[0, 'bread', 12], [1, 'diamond_sword', 1, sword], [5, 'torch', 3], [26, 'oak_planks', 64]]) }));
  put([3, 1, 5], mc('chest', { facing: 'north', type: 'left', waterlogged: 'false' }), compound({ id: s('minecraft:chest'), Items: items([[0, 'iron_ingot', 7]]) }));
  put([4, 1, 5], mc('chest', { facing: 'north', type: 'right', waterlogged: 'false' }), compound({ id: s('minecraft:chest'), Items: items([[13, 'emerald', 2]]) }));
  put([5, 1, 5], mc('barrel', { facing: 'up', open: 'false' }), compound({ id: s('minecraft:barrel'), Items: items([[4, 'apple', 9]]) }));
  if (structureBlock) {
    put([0, 1, 3], mc('structure_block', { mode: 'save' }), compound({ id: s('minecraft:structure_block'), name: s('bauplaner:pruefbau'), author: s('Exportprüfung'), metadata: s(''),
      posX: i(1), posY: i(0), posZ: i(-2), sizeX: i(3), sizeY: i(2), sizeZ: i(2), rotation: s('NONE'), mirror: s('NONE'), mode: s('SAVE'),
      ignoreEntities: b(1), strict: b(0), powered: b(0), showair: b(0), showboundingbox: b(1), integrity: { type: 'float', value: 1 }, seed: { type: 'long', value: '0' } }));
  }
  const entities = [
    makePainting([4, 3, 1], 'south', 'minecraft:sea'),
    makeItemFrame([6, 2, 1], 'south', 'minecraft:diamond_sword'),
    makeArmorStand([2, 1, 4], 'north', { head: 'minecraft:iron_helmet', chest: 'minecraft:iron_chestplate' }, { arms: true }),
  ];
  return createPayload({ schemaVersion: 1, profileId: 'java-26.3', bounds: { min: [0, 0, 0], maxExclusive: [7, 5, 7] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0],
    palette, cells, blockEntities, entities });
}

/** One block of every copper family of the profile in a row on a floor (doors two high, one free cell between, so bars and
 * chains have nothing to connect to), unaffected and unwaxed. */
function copperRow() {
  const families = copperMatrix().families;
  const palette = [mc('stone')], cells = [];
  families.forEach((f, k) => {
    const x = 2 * k;
    cells.push({ position: [x, 0, 0], kind: 'block', paletteIndex: 0 });
    const props = { ...(blockFacts(f.form)?.defaults ?? {}) };
    if ('half' in props && f.form.endsWith('_door')) {
      palette.push(mc(f.form, { ...props, half: 'lower' }), mc(f.form, { ...props, half: 'upper' }));
      cells.push({ position: [x, 1, 0], kind: 'block', paletteIndex: palette.length - 2 }, { position: [x, 2, 0], kind: 'block', paletteIndex: palette.length - 1 });
    } else {
      palette.push(mc(f.form, props));
      cells.push({ position: [x, 1, 0], kind: 'block', paletteIndex: palette.length - 1 });
    }
  });
  return createPayload({ schemaVersion: 1, profileId: 'java-26.3', bounds: { min: [0, 0, 0], maxExclusive: [2 * families.length - 1, 3, 1] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0],
    palette, cells, blockEntities: [] });
}

// ------------------------------------------------------------------ planner side
async function versionOf(id, payload) {
  const { version } = await addAssetVersion(createAsset({ id, name: id, provenance: PROV }), { payload, source: { format: 'voxel-json' } });
  return version;
}
/** Project with the given instances, frozen once; exports .litematic and .schem with the project origin as anchor. */
async function exportProject(name, placed, versions) {
  const instances = placed.map(([version, transform], k) => newInstance({ assetVersionId: version.id, name: `${name} ${k + 1}`, transform }));
  const built = applyOperation(createProject({ name }), { kind: 'batch', label: 't', operations: instances.map(instance => ({ kind: 'instance.add', instance })) }).project;
  const { project, revision } = freezeRevision(built, name);
  const resolution = resolveProject({ ...project, instances: revision.instances }, versions);
  const files = {};
  for (const format of ['litematic', 'schem']) {
    const out = await exportRevisionSchem(project, revision.id, versions, { dataVersion: DATA_VERSION, anchor: 'project-origin', unselected: 'air', format });
    files[format] = `${name}.${format}`;
    writeFileSync(join(dir, files[format]), out.bytes);
  }
  return { name, files, world: resolution.world };
}
const T = (position, quarterTurns = 0, mirrorX = false) => ({ position, quarterTurns, mirrorX });

/** Plan cell model relative to the box minimum: state key per position, block entities, entities. */
function planModel(world) {
  const min = world.bounds.min, size = world.bounds.maxExclusive.map((v, k) => v - min[k]);
  const cells = new Map();
  for (const c of world.cells) if (c.kind !== 'erase') cells.set(c.position.map((v, k) => v - min[k]).join(','), c.kind === 'air' ? 'minecraft:air' : stateKey(world.palette[c.paletteIndex]));
  const bes = new Map(world.blockEntities.map(e => [e.position.map((v, k) => v - min[k]).join(','), e.data]));
  const entities = (world.entities ?? []).map(e => ({ ...e, position: e.position.map((v, k) => v - min[k]) }));
  return { size, cells, bes, entities };
}
const boxOf = (site, world) => {
  const min = add(site, world.bounds.min), max = add(site, world.bounds.maxExclusive).map(v => v - 1);
  return { min, max };
};
const grow = ({ min, max }, m) => ({ min: min.map(v => v - m), max: max.map(v => v + m) });

// ------------------------------------------------------------------ game dumps
async function readDump(name) {
  if (!existsSync(join(dir, `${name}.nbt`))) throw new Error(`Abzug ${name}.nbt fehlt (Spielschritt nicht gelaufen)`);
  const bytes = readFileSync(join(dir, `${name}.nbt`));
  const { sourceNbt } = await readCompressedNbt(ab(bytes), LITEMATIC_LIMITS);
  const root = sourceNbt.tag.value;
  const min = root.Min.value, size = root.Size.value, palette = root.Palette.value.map(t => t.value), blocks = root.Blocks.value;
  const cells = new Map();
  let n = 0;
  for (let y = 0; y < size[1]; y++) for (let z = 0; z < size[2]; z++) for (let x = 0; x < size[0]; x++) cells.set(`${x},${y},${z}`, stateKey(parseBlockState(palette[blocks[n++]])));
  const bes = new Map(root.BlockEntities.value.map(t => [t.value.Pos.value.join(','), t.value.Data]));
  const entities = root.Entities.value.map(t => {
    const pos = t.value.Pos.value.map(v => Number(v.value));
    return importEntity(t, pos.map((v, k) => v - min[k]));
  });
  return { min, size, cells, bes, entities };
}
/** Plain text summary of what counts in a block entity (items, sign text, name, structure block fields). */
function beSummary(data) {
  const c = blockEntityContent(data);
  const t = blockEntityTile(data);
  const raw = k => t[k] === undefined ? undefined : (typeof t[k].value === 'bigint' ? String(t[k].value) : t[k].value);
  const structure = c.id === 'minecraft:structure_block'
    ? Object.fromEntries(['mode', 'name', 'posX', 'posY', 'posZ', 'sizeX', 'sizeY', 'sizeZ', 'rotation', 'mirror'].map(k => [k, raw(k)])) : undefined;
  const sign = c.sign && { ...c.sign, colors: ['front_text', 'back_text'].map(k => t[k]?.value?.color?.value ?? 'black'), glow: ['front_text', 'back_text'].map(k => Number(t[k]?.value?.has_glowing_text?.value ?? 0)) };
  // Item components that matter (WERK-09: enchantments, custom names), per slot.
  const plain = tag => !tag || typeof tag !== 'object' ? tag : tag.type === 'compound' ? Object.fromEntries(Object.entries(tag.value).map(([k, v]) => [k, plain(v)]))
    : tag.type === 'list' ? tag.value.map(plain) : typeof tag.value === 'bigint' ? String(tag.value) : tag.value;
  const parts = (plain(t.Items) ?? []).filter(e => e?.components && (e.components['minecraft:enchantments'] || e.components['minecraft:custom_name']))
    .map(e => ({ slot: e.Slot, enchantments: e.components['minecraft:enchantments'], customName: e.components['minecraft:custom_name'] })).sort((a, b2) => a.slot - b2.slot);
  return JSON.stringify({ id: c.id, items: [...c.items].sort((a, b2) => String(a.slot).localeCompare(String(b2.slot))), sign, name: c.name, structure, ...(parts.length && { components: parts }) });
}
const round = v => Math.round(v * 1000) / 1000;
function entitySummary(e, { paintingPos = true } = {}) {
  // Hanging entities: the facing decides, their saved yaw is not always rewritten by the game (vanilla turns keep it).
  return JSON.stringify({ kind: entityKind(e), pos: !paintingPos && entityKind(e) === 'painting' ? undefined : e.position.map(round), facing: entityFacing(e), yaw: isHanging(entityKind(e)) ? undefined : round(((entityYaw(e) % 360) + 360) % 360),
    variant: entityKind(e) === 'painting' ? paintingInfo(e).variant : undefined, items: entityItems(e).contents.map(x => `${x.id}×${x.count}`).sort(), equipment: Object.keys(entityEquipment(e)).sort() });
}

/**
 * Compares a game dump with an expected model (both relative to the box minimum). `offset` is where the expected
 * box starts inside the dump (the margin); `skipStructure` ignores structure block fields (vanilla turns do not
 * rewrite them). Returns a list of findings, empty = identical.
 */
function compare(label, dump, expected, offset = [0, 0, 0], { skipStructure = false, spill = true, paintingPos = true } = {}) {
  const findings = [];
  const at = key => add(key.split(',').map(Number), offset).join(',');
  for (const [key, want] of expected.cells) {
    const got = dump.cells.get(at(key));
    if (got !== want) findings.push(`${label}: Block ${key}: Spiel ${got}, Plan ${want}`);
  }
  if (spill) for (const [key, got] of dump.cells) {
    const p = key.split(',').map(Number), inner = p.map((v, k) => v - offset[k]);
    if (inner.every((v, k) => v >= 0 && v < expected.size[k])) continue;
    if (inner[1] < 0) continue; // the ground under the build
    if (got !== 'minecraft:air') findings.push(`${label}: Block außerhalb des Plans bei ${inner.join(',')}: ${got}`);
  }
  for (const [key, data] of expected.bes) {
    const got = dump.bes.get(at(key));
    if (!got) { findings.push(`${label}: BlockEntity ${key} fehlt im Spiel`); continue; }
    let want = beSummary(data), have = beSummary(got);
    if (skipStructure) { want = JSON.stringify({ ...JSON.parse(want), structure: undefined }); have = JSON.stringify({ ...JSON.parse(have), structure: undefined }); }
    if (want !== have) findings.push(`${label}: BlockEntity ${key}: Spiel ${have}, Plan ${want}`);
  }
  for (const [key, data] of dump.bes) {
    const inner = key.split(',').map((v, k) => Number(v) - offset[k]).join(',');
    // Blocks such as copper chests get an empty block entity from the game itself; only content without a plan counts.
    if (!expected.bes.has(inner) && hasContent(blockEntityContent(data))) findings.push(`${label}: BlockEntity mit Inhalt im Spiel ohne Plan bei ${inner}: ${beSummary(data)}`);
  }
  const shifted = e => ({ ...e, position: e.position.map((v, k) => v - offset[k]) });
  const want = expected.entities.map(e => entitySummary(e, { paintingPos })).sort(), have = dump.entities.map(shifted).map(e => entitySummary(e, { paintingPos })).sort();
  if (JSON.stringify(want) !== JSON.stringify(have)) findings.push(`${label}: Entities: Spiel ${JSON.stringify(have)}, Plan ${JSON.stringify(want)}`);
  return findings;
}

// ------------------------------------------------------------------ prepare
if (mode === 'prepare') {
  const versions = new Map();
  const full = await versionOf('pruefbau', testBuild(true)), plain = await versionOf('pruefbau_ohne_strukturblock', testBuild(false));
  const copper = copperRow();
  const waxed = swapMaterials(copper, [{ from: 'kupfer_unaffected', to: 'kupfer_weathered_gewachst' }]).payload;
  const bare = swapMaterials(copper, [{ from: 'kupfer_unaffected', to: 'kupfer_exposed' }]).payload;
  const cw = await versionOf('kupfer_gewachst', waxed), ce = await versionOf('kupfer_angelaufen', bare);
  for (const v of [full, plain, cw, ce]) versions.set(v.id, v);
  // Mirroring the structure block is unresolved (NBT-01-S03): the planner must refuse that export.
  let mirrorBlocked = false;
  try { await exportProject('gesperrt', [[full, T([2, 0, 3], 0, true)]], versions); } catch (e) { mirrorBlocked = /exportierbar|EXPORT_BLOCKED/.test(`${e.code} ${e.message}`); }
  const projects = [
    await exportProject('p0_ungedreht', [[full, T([2, 0, 3])]], versions),
    await exportProject('p1_gedreht', [[full, T([9, 0, 2], 1)]], versions),
    await exportProject('p2_gespiegelt', [[plain, T([8, 0, 1], 0, true)]], versions),
    await exportProject('p3_ohne_strukturblock', [[plain, T([1, 0, 1])]], versions),
    await exportProject('kupfer', [[cw, T([0, 0, 0])], [ce, T([0, 0, 2])]], versions),
  ];
  const sites = {}, steps = [], plans = {};
  const column = k => k * 32;
  projects.forEach((p, k) => {
    const lit = [column(k), Y, 0], we = [column(k), Y, 40];
    sites[p.name] = { litematica: lit, worldedit: we };
    plans[p.name] = { world: p.world, files: p.files };
    for (const [tool, site] of [['litematica', lit], ['worldedit', we]]) {
      const box = grow(boxOf(site, p.world), MARGIN);
      steps.push({ op: 'load', min: box.min.map(v => v - 16), max: box.max.map(v => v + 16) });
      steps.push({ op: tool, name: `${tool}_${p.name}`, file: p.files[tool === 'litematica' ? 'litematic' : 'schem'], at: site });
      steps.push({ op: 'dump', name: `${tool}_${p.name}`, ...box });
    }
  });
  // The game's own turn and mirror of the unturned pastes (StructureTemplate): ground truth for NBT-01 and ENTITY-01.
  const p0 = projects[0], p3 = projects[3];
  const v1 = [column(0), Y, 80], v2 = [column(3), Y, 80];
  for (const [name, from, site, rotation, mirror] of [['vanilla_gedreht', [p0, sites.p0_ungedreht.litematica], v1, 'CLOCKWISE_90', 'NONE'], ['vanilla_gespiegelt', [p3, sites.p3_ohne_strukturblock.litematica], v2, 'NONE', 'FRONT_BACK']]) {
    const src = boxOf(from[1], from[0].world);
    steps.push({ op: 'load', min: site.map(v => v - 24), max: site.map(v => v + 24) });
    steps.push({ op: 'vanilla', name, min: src.min, size: src.max.map((v, k) => v - src.min[k] + 1), to: site, rotation, mirror, dump: name });
  }
  // FORMAT-01/02: save what Litematica pasted with WorldEdit (standing on the site = //copy origin) and with Litematica.
  const s0 = sites.p0_ungedreht.litematica, b0 = boxOf(s0, p0.world);
  steps.push({ op: 'wesave', name: 'we_rundlauf', min: b0.min, max: b0.max, at: s0 });
  steps.push({ op: 'litsave', name: 'lit_rundlauf', min: b0.min, max: b0.max, origin: s0 });
  // DIFF-01: change the chest and the sign of the WorldEdit paste in the game, save with a selection two blocks wider at -x.
  const w0 = sites.p0_ungedreht.worldedit, bw = boxOf(w0, p0.world);
  const local = p => add(bw.min, p).join(' ');
  steps.push({ op: 'command', commands: [
    `item replace block ${local([1, 1, 5])} container.0 with minecraft:diamond 5`,
    `data merge block ${local([5, 2, 1])} {front_text:{messages:["Geändert","im Spiel","",""]}}`,
  ] });
  steps.push({ op: 'wesave', name: 'we_geaendert', min: add(bw.min, [-2, 0, 0]), max: bw.max, at: w0 });
  // MAT-04: waxed copper must stay as it is under fast random ticks, unwaxed copper ages.
  const kb = grow(boxOf(sites.kupfer.litematica, projects[4].world), MARGIN);
  steps.push({ op: 'command', commands: ['gamerule random_tick_speed 1000'] }, { op: 'wait', ticks: 600 }, { op: 'command', commands: ['gamerule random_tick_speed 3'] });
  steps.push({ op: 'dump', name: 'kupfer_nach_ticks', ...kb });
  steps.push({ op: 'registry' });
  steps.push({ op: 'screenshot', name: 'gedreht', at: add(sites.p1_gedreht.litematica, [3, 2, -6]), look: add(sites.p1_gedreht.litematica, [5, 1, 4]) });
  write('job.json', { steps });
  write('plan.json', { sites, plans: Object.fromEntries(Object.entries(plans).map(([k, v]) => [k, { files: v.files }])), mirrorBlocked, v1, v2, w0, s0, column: 32 });
  // Plans are rebuilt in verify from the same deterministic builds; keep the resolved worlds for exact comparison.
  writeFileSync(join(dir, 'worlds.json'), JSON.stringify(Object.fromEntries(projects.map(p => [p.name, p.world])), (k, v) => typeof v === 'bigint' ? { $bigint: String(v) } : v));
  console.log(`Exportprüfung vorbereitet: ${projects.length} Projekte, ${steps.length} Spielschritte, Spiegeln mit Strukturblock gesperrt: ${mirrorBlocked}.`);
}

const loadWorlds = () => JSON.parse(readFileSync(join(dir, 'worlds.json'), 'utf8'), (k, v) => v && typeof v === 'object' && '$bigint' in v ? BigInt(v.$bigint) : v);

/** Imported structure (schem or litematic) as a model relative to its box minimum, with the offset of that minimum. */
async function importModel(file) {
  const imp = await importStructure(ab(readFileSync(join(dir, file))));
  const r = imp.result;
  return { format: imp.format, result: r, model: planModel(r.payload) };
}

// ------------------------------------------------------------------ between (after run 1)
if (mode === 'between') {
  const plan = read('plan.json'), worlds = loadWorlds();
  const report = existsSync(join(dir, 'bericht.json')) ? read('bericht.json') : {};
  const p0 = planModel(worlds.p0_ungedreht);
  const steps = [];
  report.rundlauf = {};
  const versions = new Map();
  let k = 0;
  for (const [file, label] of [['we_rundlauf.schem', 'WorldEdit'], ['lit_rundlauf.litematic', 'Litematica']]) {
    assert.ok(existsSync(join(dir, file)), `${label} hat ${file} nicht gespeichert`);
    const { format, result, model } = await importModel(file);
    const findings = compare(`${label}-Datei`, { ...model, min: [0, 0, 0] }, p0, [0, 0, 0], { spill: false });
    // The file must place the build where it stood: WorldEdit origin = player on the site, so Offset = plan box minimum.
    const offset = result.offset;
    const profile = checkPayloadProfile(result.payload);
    report.rundlauf[label] = { file, format, dataVersion: result.dataVersion, offset, weOffset: result.weOffset ?? null, findings, profile: profile.status, warnings: result.warnings ?? [] };
    // Take the file over as a building and export it again, placed at its file offset.
    const v = await versionOf(`rundlauf_${format}`, result.payload);
    versions.set(v.id, v);
    const out = await exportProject(`rundlauf_${format}`, [[v, T(offset)]], versions);
    const site = [plan.column * (6 + k), Y, 0];
    const box = grow(boxOf(site, out.world), MARGIN);
    steps.push({ op: 'load', min: box.min.map(x => x - 16), max: box.max.map(x => x + 16) });
    const tool = format === 'schem' ? 'worldedit' : 'litematica';
    steps.push({ op: tool, name: `zurueck_${format}`, file: out.files[format], at: site });
    steps.push({ op: 'dump', name: `zurueck_${format}`, ...box });
    report.rundlauf[label].site = site;
    report.rundlauf[label].world = `rundlauf_${format}`;
    worlds[`rundlauf_${format}`] = out.world;
    k++;
  }
  // FORMAT-01: the existing round trip tool on the real WorldEdit file.
  const tool = spawnSync(process.execPath, ['scripts/checks/check_schem_roundtrip.mjs', join(dir, 'we_rundlauf.schem'), '--json'], { encoding: 'utf8' });
  report.rundlauf.WorldEdit.werkzeug = { exit: tool.status, out: tool.stdout.trim().slice(0, 4000), err: tool.stderr.trim().slice(0, 1000) };
  write('job2.json', { steps });
  write('bericht.json', report);
  writeFileSync(join(dir, 'worlds.json'), JSON.stringify(worlds, (key, v) => typeof v === 'bigint' ? { $bigint: String(v) } : v));
  console.log(`Rückweg vorbereitet: ${Object.entries(report.rundlauf).map(([l, r]) => `${l} ${r.findings.length} Abweichungen`).join(', ')}.`);
}

// ------------------------------------------------------------------ verify (after run 2)
if (mode === 'verify') {
  const plan = read('plan.json'), worlds = loadWorlds(), report = read('bericht.json');
  const result = read('result.json'), result2 = existsSync(join(dir, 'result2.json')) ? read('result2.json') : { steps: [] };
  const checks = [];
  const check = (id, title, findings, extra = {}) => checks.push({ id, title, ok: findings.length === 0, findings, ...extra });
  const m = [MARGIN, MARGIN, MARGIN];
  const outcome = name => [...result.steps, ...result2.steps].find(st => st.name === name)?.outcome;

  // Pastes of every export with both tools.
  for (const name of Object.keys(plan.sites)) {
    const expected = planModel(worlds[name]);
    for (const tool of ['litematica', 'worldedit']) {
      const label = `${tool === 'litematica' ? 'Litematica' : 'WorldEdit'} ${name}`;
      const o = outcome(`${tool}_${name}`);
      const findings = tool === 'litematica' && o !== 'ok' ? [`${label}: ${o}`] : compare(label, await readDump(`${tool}_${name}`), expected, m);
      check(`${tool}:${name}`, label, findings);
    }
  }
  // The game's own turn / mirror against the planner's.
  for (const [name, project] of [['vanilla_gedreht', 'p1_gedreht'], ['vanilla_gespiegelt', 'p2_gespiegelt']]) {
    const dump = await readDump(name);
    // StructureTemplate keeps structure block fields as they are and puts even-sized paintings at the block that contains
    // their turned Pos (one block off, the same rounding Litematica did): both are compared elsewhere, not against vanilla.
    check(`vanilla:${name}`, `Spiel dreht/spiegelt selbst (${name}) = Planer ${project}`, compare(`Vanilla ${name}`, dump, planModel(worlds[project]), [0, 0, 0], { skipStructure: true, spill: false, paintingPos: false }));
  }
  // NBT-01-S03: the turned structure block saves the same blocks as the unturned one (game coordinates, independent maths).
  {
    const d0 = await readDump('litematica_p0_ungedreht'), d1 = await readDump('litematica_p1_gedreht');
    const sb = d => { for (const [key, data] of d.bes) if (blockEntityContent(data).id === 'minecraft:structure_block') return { at: key.split(',').map(Number), t: data.value }; return null; };
    const area = (d, x) => { const at = add(d.min, x.at), p = ['posX', 'posY', 'posZ'].map(k => x.t[k].value), sz = ['sizeX', 'sizeY', 'sizeZ'].map(k => x.t[k].value); const a = add(at, p); return { min: a, max: add(a, sz).map(v => v - 1) }; };
    const findings = [];
    const a = sb(d0), c = sb(d1);
    if (!a || !c) findings.push('Strukturblock fehlt in einem Abzug');
    else {
      const A = area(d0, a), C = area(d1, c);
      // Clockwise quarter turn of the whole build (box minimum to box minimum), as StructureTemplate does it.
      const rot = p => { const r = p.map((v, k) => v - d0.min[k]); return [d0.size[2] - 1 - r[2], r[1], r[0]]; };
      const corners = [A.min, A.max].map(rot);
      const wantMin = corners[0].map((v, k) => Math.min(v, corners[1][k])), wantMax = corners[0].map((v, k) => Math.max(v, corners[1][k]));
      const haveMin = C.min.map((v, k) => v - d1.min[k]), haveMax = C.max.map((v, k) => v - d1.min[k]);
      // d0 and d1 both carry the margin; the rotation above works on the margin box, which is square in x/z.
      if (wantMin.join() !== haveMin.join() || wantMax.join() !== haveMax.join()) findings.push(`Speicherbereich gedreht ${haveMin}..${haveMax}, erwartet ${wantMin}..${wantMax}`);
      if (a.t.mode.value !== c.t.mode.value) findings.push('Modus geändert');
    }
    check('nbt01:strukturblock', 'Gedrehter Strukturblock speichert denselben Bereich', findings);
  }
  check('nbt01:spiegeln-gesperrt', 'Spiegeln mit Strukturblock wird vom Planer gesperrt', plan.mirrorBlocked ? [] : ['Export mit gespiegeltem Strukturblock wurde nicht gesperrt']);
  // FORMAT-01/02: real WorldEdit and Litematica files, read by the planner, and their re-exports pasted in the game.
  const p0Min = worlds.p0_ungedreht.bounds.min;
  for (const [label, r] of Object.entries(report.rundlauf)) {
    const f = [...r.findings];
    if (r.offset.join() !== p0Min.join()) f.push(`${label}-Datei: Offset ${r.offset}, erwartet ${p0Min} (Stelle des Originals)`);
    if (r.dataVersion !== DATA_VERSION) f.push(`${label}-Datei: DataVersion ${r.dataVersion}, erwartet ${DATA_VERSION}`);
    if (r.profile !== 'passt') f.push(`${label}-Datei: Profilprüfung ${r.profile}`);
    if (label === 'WorldEdit' && r.werkzeug.exit !== 0) f.push(`format:check-schem Exit ${r.werkzeug.exit}: ${r.werkzeug.out.slice(0, 300)} ${r.werkzeug.err.slice(0, 300)}`);
    check(`datei:${label}`, `Echte ${label}-Datei im Planer`, f, { offset: r.offset, weOffset: r.weOffset, dataVersion: r.dataVersion });
    const format = label === 'WorldEdit' ? 'schem' : 'litematic';
    const o = outcome(`zurueck_${format}`);
    // The re-export must sit exactly where the original stood relative to its site (same offset).
    check(`zurueck:${label}`, `${label}-Datei übernommen, wieder exportiert und im Spiel eingefügt`,
      format === 'litematic' && o !== 'ok' ? [`${o}`] : existsSync(join(dir, `zurueck_${format}.nbt`))
        ? compare(`Rückweg ${label}`, await readDump(`zurueck_${format}`), planModel(worlds.p0_ungedreht), m) : [`Abzug zurueck_${format}.nbt fehlt`]);
  }
  // DIFF-01: game-made change in a wider WorldEdit selection: shift found, only the two contents changed.
  {
    const original = planModel(worlds.p0_ungedreht);
    const changed = await importStructure(ab(readFileSync(join(dir, 'we_geaendert.schem'))));
    const base = worlds.p0_ungedreht;
    const a = createPayload({ ...base, cells: base.cells, blockEntities: base.blockEntities });
    const d = diffPayloads(a, changed.result.payload);
    const f = [];
    if (!d.shift.applied) f.push(`Verschiebung nicht erkannt (Versatz ${d.shift.offset})`);
    for (const kind of ['added', 'removed', 'material', 'state']) if (d.counts[kind]) f.push(`${d.counts[kind]} × ${kind}`);
    const content = d.counts.content ?? 0;
    if (content !== 2) f.push(`Inhaltsänderungen ${content}, erwartet 2 (Truhe, Schild)`);
    check('diff01:verschoben', 'Vergleich: im Spiel geänderter, verschoben gespeicherter Stand', f, { shift: d.shift, counts: d.counts, followUps: d.followUps, blocks: original.cells.size });
  }
  // MAT-04: copper matrix = the game's weathering and waxing maps; waxed copper unchanged under random ticks.
  const reg = read('registry.json');
  {
    const f = [], next = new Map(reg.weathering), wax = new Map(reg.waxing);
    const ns = id => `minecraft:${id}`;
    const matrix = copperMatrix();
    for (const fam of matrix.families) COPPER_STAGES.forEach((st, k) => {
      if (k < 3 && next.get(ns(fam.ids[st])) !== ns(fam.ids[COPPER_STAGES[k + 1]])) f.push(`${fam.ids[st]} altert im Spiel zu ${next.get(ns(fam.ids[st]))}, Planer: ${fam.ids[COPPER_STAGES[k + 1]]}`);
      if (wax.get(ns(fam.ids[st])) !== ns(fam.waxed[st])) f.push(`${fam.ids[st]} gewachst im Spiel ${wax.get(ns(fam.ids[st]))}, Planer: ${fam.waxed[st]}`);
    });
    const known = new Set(matrix.families.flatMap(fam => COPPER_STAGES.map(st => ns(fam.ids[st]))));
    const missing = [...new Set([...next.keys(), ...wax.keys()])].filter(id => !known.has(id));
    const unexplained = missing.filter(id => !matrix.incomplete.some(x => ns(x.id) === id));
    if (unexplained.length) f.push(`Kupferblöcke des Spiels fehlen in der Matrix: ${unexplained.join(', ')}`);
    check('mat04:matrix', 'Kupfermatrix = Alterung und Wachs des Spiels', f, { families: matrix.families.length, gameWeathering: next.size, gameWaxing: wax.size, notInMatrix: missing });
    const before = planModel(worlds.kupfer), after = await readDump('kupfer_nach_ticks');
    const g = [];
    let aged = 0, unwaxed = 0;
    for (const [key, want] of before.cells) {
      const got = after.cells.get(add(key.split(',').map(Number), m).join(','));
      const isWaxed = /minecraft:waxed_/.test(want);
      if (isWaxed && got !== want) g.push(`gewachst ${key}: ${want} → ${got}`);
      if (!isWaxed && /copper|lightning_rod/.test(want)) { unwaxed++; if (got !== want) aged++; }
    }
    if (unwaxed && aged === 0) g.push('kein ungewachster Kupferblock ist gealtert (Zufallsticks wirkungslos?)');
    check('mat04:wachs', 'Gewachstes Kupfer bleibt unter schnellen Zufallsticks gleich, ungewachstes altert', g, { unwaxed, aged });
  }
  // PROFILE-01: the planner's profile = registries of the running game.
  {
    const f = [];
    const gameBlocks = Object.keys(reg.blocks).sort(), planBlocks = factBlockIds().map(id => id.includes(':') ? id : `minecraft:${id}`).sort();
    const onlyGame = gameBlocks.filter(id => !planBlocks.includes(id)), onlyPlan = planBlocks.filter(id => !gameBlocks.includes(id));
    if (onlyGame.length || onlyPlan.length) f.push(`Blöcke nur im Spiel: ${onlyGame.slice(0, 20)}; nur im Profil: ${onlyPlan.slice(0, 20)}`);
    let propDiff = 0;
    for (const id of gameBlocks) {
      const facts = blockFacts(id); if (!facts) continue;
      const want = JSON.stringify(Object.fromEntries(Object.entries(reg.blocks[id].properties).map(([k, v]) => [k, [...v].sort()]).sort()));
      const have = JSON.stringify(Object.fromEntries(Object.entries(facts.properties).map(([k, v]) => [k, [...v].sort()]).sort()));
      if (want !== have) { propDiff++; if (propDiff <= 10) f.push(`${id}: Zustände Spiel ${want}, Profil ${have}`); }
      if (stateKey(parseBlockState(reg.blocks[id].default)) !== stateKey({ id, properties: facts.defaults ?? {} })) { propDiff++; if (propDiff <= 10) f.push(`${id}: Grundzustand Spiel ${reg.blocks[id].default}`); }
    }
    const items = profileItemIds().map(id => id.includes(':') ? id : `minecraft:${id}`).sort();
    const onlyGameItems = reg.items.filter(id => !items.includes(id)), onlyPlanItems = items.filter(id => !reg.items.includes(id));
    if (onlyGameItems.length || onlyPlanItems.length) f.push(`Items nur im Spiel: ${onlyGameItems.slice(0, 20)}; nur im Profil: ${onlyPlanItems.slice(0, 20)}`);
    const bet = PROFILE_BLOCK_ENTITY_TYPES.map(id => `minecraft:${id}`).sort();
    if (JSON.stringify(bet) !== JSON.stringify([...reg.blockEntityTypes].sort())) f.push(`BlockEntity-Typen: Spiel ${reg.blockEntityTypes.length}, Profil ${bet.length}`);
    if (reg.dataVersion !== PROFILE_DATA_VERSION) f.push(`DataVersion Spiel ${reg.dataVersion}, Profil ${PROFILE_DATA_VERSION}`);
    check('profile01:register', 'Versionsprofil = Register des laufenden Spiels', f, { gameVersion: reg.gameVersion, dataVersion: reg.dataVersion, blocks: gameBlocks.length, items: reg.items.length, blockEntityTypes: reg.blockEntityTypes.length });
  }
  const failed = checks.filter(c => !c.ok);
  report.checks = checks;
  report.summary = { total: checks.length, ok: checks.length - failed.length, failed: failed.length, at: new Date().toISOString(), gameVersion: reg.gameVersion };
  write('bericht.json', report);
  const md = ['# Exportprüfung im Spiel', '', `Minecraft ${reg.gameVersion} (DataVersion ${reg.dataVersion}), Litematica und WorldEdit im echten Client. ${checks.length - failed.length}/${checks.length} Prüfungen bestanden.`, '',
    '| Prüfung | Ergebnis |', '|---|---|', ...checks.map(c => `| ${c.title} | ${c.ok ? 'bestanden' : `**${c.findings.length} Abweichungen**: ${c.findings.slice(0, 3).join('; ').replace(/\|/g, '/')}`} |`)].join('\n');
  writeFileSync(join(dir, 'bericht.md'), md + '\n');
  for (const c of checks) console.log(`${c.ok ? '✓' : '✗'} ${c.title}${c.ok ? '' : `\n    ${c.findings.slice(0, 8).join('\n    ')}`}`);
  if (failed.length) { console.error(`${failed.length} von ${checks.length} Prüfungen mit Abweichungen.`); process.exit(1); }
  console.log(`Exportprüfung bestanden: ${checks.length} Prüfungen.`);
}
