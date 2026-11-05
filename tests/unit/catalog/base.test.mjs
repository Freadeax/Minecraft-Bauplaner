import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_FUNCTIONS, BASE_TEMPLATES, affinity, analyzeSplit, baseIntoProject, buildBasePlan, checkRequirements, createBaseProject, createBuildingLibrary, createProject, defaultZones,
  detectFunction, enchantingPower, extractParts, extractRest, farmlandHydration, isWaterCell, layoutBase, normalizeBaseChoices, pathNetworkPayload, previewBase, resolveProject, splitProject, undo, execute, EMPTY_HISTORY, applyOperation,
  blockCounts, zoneKeyFor, RESERVE_ID,
} from '../../../dist/domain/src/index.js';
import { createPayload } from '../../../dist/voxel/src/index.js';

const buildings = await createBuildingLibrary();
const versions = new Map(buildings.versions.map(v => [v.id, v]));
const lib = { assets: buildings.assets, versions };
const assetIds = new Set(buildings.assets.map(a => a.id));
const payloadOf = id => { const a = buildings.assets.find(x => x.id === id); return versions.get(a.versionIds[0]).payload; };

test('every base function names real catalog buildings, a phase, hints and a colour', () => {
  assert.equal(new Set(BASE_FUNCTIONS.map(f => f.id)).size, BASE_FUNCTIONS.length);
  for (const f of BASE_FUNCTIONS) {
    for (const m of f.members) assert.ok(assetIds.has(m.assetId), `${f.id}: ${m.assetId}`);
    for (const id of f.alternatives) assert.ok(assetIds.has(id), `${f.id}: Alternative ${id}`);
    assert.ok([1, 2, 3, 4].includes(f.phase));
    assert.match(f.color, /^#[0-9a-f]{6}$/);
    if (!f.members.length) assert.ok(f.reserve, `${f.id} braucht einen Bauplatz`);
  }
  for (const t of BASE_TEMPLATES) for (const z of t.zones) assert.ok(BASE_FUNCTIONS.some(f => f.id === z), `${t.id}: ${z}`);
  assert.equal(affinity('lager', 'schmiede'), affinity('schmiede', 'lager'));
  assert.ok(affinity('xpfarm', 'platz') < 0);
});

test('requirements are checked on the real blocks: enchanting power, hydration, workstations', () => {
  const tower = enchantingPower(payloadOf('bld_zaubererturm'));
  assert.equal(tower.tables, 1);
  assert.equal(tower.power, 15, 'Zaubererturm reaches level 30');
  const room = enchantingPower(payloadOf('bld_verzauberungsraum'));
  assert.ok(room.tables >= 1);
  const field = farmlandHydration(payloadOf('bld_acker_weizen'));
  assert.equal(field.farmland, 80); assert.equal(field.wet, 80);
  const dry = createPayload({ schemaVersion: 1, profileId: 'p', bounds: { min: [0, 0, 0], maxExclusive: [12, 2, 1] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0],
    palette: [{ id: 'minecraft:farmland', properties: { moisture: '0' } }, { id: 'minecraft:water', properties: { level: '0' } }],
    cells: [...Array(11).keys()].map(x => ({ position: [x + 1, 0, 0], kind: 'block', paletteIndex: 0 })).concat([{ position: [0, 0, 0], kind: 'block', paletteIndex: 1 }]), blockEntities: [] });
  const h = farmlandHydration(dry);
  assert.equal(h.farmland, 11); assert.equal(h.wet, 4, 'only within 4 blocks');
  const forge = checkRequirements('schmiede', { payloads: [payloadOf('bld_schmiede')] });
  assert.ok(forge.find(r => r.id === 'amboss').status === 'ok');
  const trade = checkRequirements('handel', { payloads: [payloadOf('bld_hof_handelsscheune')] });
  assert.ok(trade.find(r => r.id === 'arbeit').status === 'ok');
  const harbour = checkRequirements('hafen', { payloads: [], atWater: false });
  assert.equal(harbour.find(r => r.id === 'wasser').status, 'warn');
  const reserved = checkRequirements('xpfarm', { payloads: [], reserved: true });
  assert.ok(reserved.every(r => r.status === 'info'));
  // Detection from counts.
  assert.equal(detectFunction(blockCounts([payloadOf('bld_zaubererturm')])).id, 'verzauberung');
  assert.equal(detectFunction(blockCounts([payloadOf('bld_schmiede')])).id, 'schmiede');
  assert.equal(detectFunction(blockCounts([payloadOf('bld_lagerhaus')])).id, 'lager');
  assert.equal(detectFunction(blockCounts([payloadOf('bld_acker_weizen')]), new Map(), true).id, 'getreidefarm');
  assert.equal(detectFunction(blockCounts([payloadOf('bld_weg_gerade')]), new Map(), true).id, 'wege');
});

test('choices are validated', () => {
  assert.throws(() => normalizeBaseChoices({ template: 'nix' }), /Vorlage/);
  assert.throws(() => normalizeBaseChoices({ zones: [{ key: 'a', fn: 'lager' }, { key: 'a', fn: 'kueche' }] }), /doppelt/);
  assert.throws(() => normalizeBaseChoices({ zones: [{ key: 'g', fn: 'getreidefarm', counts: { Acker: 99 } }] }), /Acker 0–12/);
  assert.throws(() => normalizeBaseChoices({ pathWidth: 9 }), /Wegbreite/);
  assert.throws(() => normalizeBaseChoices({ water: 'oben' }), /Wasserseite/);
  const z = defaultZones(BASE_TEMPLATES[0]);
  assert.equal(zoneKeyFor(z, 'wohnen'), 'wohnen');
  assert.equal(zoneKeyFor([...z, { key: 'wohnen', fn: 'wohnen' }], 'wohnen'), 'wohnen-2');
});

for (const t of BASE_TEMPLATES) test(`template ${t.id}: layout without conflicts, every zone routed, harbour in the water, farms towards the water`, async () => {
  const layout = layoutBase(lib, { template: t.id });
  assert.deepEqual(layout.blockers, []);
  assert.deepEqual(layout.warnings, []);
  const zones = layout.zones.filter(z => z.enabled);
  assert.equal(zones.length, t.zones.length);
  assert.ok(zones.every(z => z.routed), 'alle Zonen am Weg');
  assert.ok(layout.paths.length > 50);
  assert.ok(layout.lamps.length > 3);
  const plaza = zones.find(z => z.fn.id === 'platz');
  // Zones never overlap and keep clearance from each other.
  for (let i = 0; i < zones.length; i++) for (let j = i + 1; j < zones.length; j++) {
    const a = zones[i].rect, b = zones[j].rect;
    const gap = Math.max(b.x0 - a.x1, a.x0 - b.x1, b.z0 - a.z1, a.z0 - b.z1);
    assert.ok(gap >= layout.choices.pathWidth + 2 * layout.choices.spacing, `${zones[i].name} / ${zones[j].name}: ${gap}`);
  }
  // Paths never run through a footprint.
  const feet = layout.placements.map(p => p.footprint);
  for (const [x, z] of layout.paths) assert.ok(!feet.some(f => x >= f.x0 && x < f.x1 && z >= f.z0 && z < f.z1), `Weg durch Gebäude bei ${x},${z}`);
  if (t.water !== 'keine') {
    assert.ok(layout.water);
    const harbour = zones.find(z => z.fn.id === 'hafen');
    if (harbour) {
      assert.equal(harbour.atWater, true);
      const piers = harbour.members.filter(m => m.water);
      assert.ok(piers.length >= 2);
      for (const m of piers) { const f = m.footprint; const far = t.water === 'sued' ? f.z1 - 1 : t.water === 'nord' ? f.z0 : t.water === 'ost' ? f.x1 - 1 : f.x0; assert.ok(isWaterCell(layout.water, t.water === 'sued' || t.water === 'nord' ? f.x0 : far, t.water === 'sued' || t.water === 'nord' ? far : f.z0), `${m.role} im Wasser`); }
    }
    for (const [x, z] of layout.paths) assert.ok(!isWaterCell(layout.water, x, z), 'Weg nie im Wasser');
    // Land buildings are never in the water.
    for (const z of zones) for (const m of z.members) if (!m.water && m.footprint) for (const [x, zz] of [[m.footprint.x0, m.footprint.z0], [m.footprint.x1 - 1, m.footprint.z1 - 1]]) assert.ok(!isWaterCell(layout.water, x, zz), `${z.name}: ${m.role} an Land`);
  }
  // Mob farm away from the plaza, storage near the forge.
  const dist = (a, b) => Math.hypot((a.x0 + a.x1 - b.x0 - b.x1) / 2, (a.z0 + a.z1 - b.z0 - b.z1) / 2);
  const xp = zones.find(z => z.fn.id === 'xpfarm'), lager = zones.find(z => z.fn.id === 'lager'), schmiede = zones.find(z => z.fn.id === 'schmiede');
  if (xp) assert.ok(zones.filter(z => z !== xp && !z.fn.coast).every(z => dist(xp.rect, plaza.rect) >= dist(z.rect, plaza.rect) - 1), 'XP-Farm am weitesten vom Platz (Hinterland)');
  if (lager && schmiede) assert.ok(dist(lager.rect, schmiede.rect) < 40);
  // Deterministic and conflict free.
  assert.deepEqual(layoutBase(lib, { template: t.id }).paths, layout.paths);
  const plan = await buildBasePlan(layout);
  const preview = previewBase(plan, { versions });
  assert.equal(preview.conflicts.length, 0);
  assert.deepEqual(preview.spacing.filter(s => s.kind === 'overlap'), []);
  assert.equal(preview.links.filter(l => l.state !== 'ok').length, 0);
});

test('zones: off, swapped main building, counts, reserved plot, water side, extra zone', async () => {
  const base = defaultZones(BASE_TEMPLATES[0]);
  const zones = base.map(z => z.fn === 'tierfarm' ? { ...z, off: true } : z.fn === 'lager' ? { ...z, main: 'bld_kueste_hafenspeicher' } : z.fn === 'getreidefarm' ? { ...z, counts: { Acker: 2, Windmühle: 0 } } : z.fn === 'verzauberung' ? { ...z, main: RESERVE_ID } : z);
  zones.push({ key: zoneKeyFor(zones, 'wohnen'), fn: 'wohnen', name: 'Haus von Philipp' });
  const layout = layoutBase(lib, { zones, water: 'nord', pathWidth: 2, spacing: 3, pathStyle: 'stein', lights: false });
  const on = layout.zones.filter(z => z.enabled);
  assert.ok(!on.some(z => z.fn.id === 'tierfarm'));
  assert.equal(on.find(z => z.fn.id === 'lager').members[0].assetId, 'bld_kueste_hafenspeicher');
  assert.equal(on.find(z => z.fn.id === 'getreidefarm').members.filter(m => m.footprint).length, 2);
  const magic = on.find(z => z.fn.id === 'verzauberung');
  assert.ok(magic.reserved); assert.deepEqual(magic.members, []); assert.ok(magic.rect);
  assert.equal(on.find(z => z.name === 'Haus von Philipp').fn.id, 'wohnen');
  assert.equal(layout.water.side, 'nord');
  assert.equal(layout.lamps.length, 0);
  assert.deepEqual(layout.warnings, []);
  const net = pathNetworkPayload(layout);
  assert.ok(net.payload.palette.some(s => s.id === 'minecraft:stone_bricks'));
  assert.ok(!net.payload.palette.some(s => s.id === 'minecraft:lantern'));
  // Harbour without water is left out with a problem note.
  const dry = layoutBase(lib, { template: 'kuestenbasis', water: 'keine' });
  const h = dry.zones.find(z => z.fn.id === 'hafen');
  assert.equal(h.enabled, false); assert.match(h.problems[0], /Wasserseite/);
  assert.deepEqual(dry.blockers, []);
});

test('adoption: project with phases and path network, insertion with undo and stale check', async () => {
  const layout = layoutBase(lib, { template: 'starterbasis' });
  const plan = await buildBasePlan(layout, { name: 'Test' });
  assert.ok(plan.network);
  assert.equal(plan.network.version.source.format, 'base-plan');
  const preview = previewBase(plan, { versions });
  const project = createBaseProject(plan, preview, { name: 'Meine Basis' });
  assert.equal(project.instances.length, layout.placements.length + 1);
  assert.deepEqual(project.site.sections.map(s => s.name), ['Wege & Platz', 'Phase 1: Ankommen & Versorgen', 'Phase 2: Handwerk & Tiere']);
  assert.ok(project.site.sections[0].members.length >= 2, 'Wegenetz und Platz zuerst');
  const all = new Map(versions); all.set(plan.network.version.id, plan.network.version);
  assert.equal(resolveProject(project, all).conflicts.length, 0);
  // Insert into an existing project.
  let target = createProject({ name: 'Ziel' });
  const pv = previewBase(plan, { base: target, versions, offset: [0, 0] });
  const op = baseIntoProject(plan, pv, target);
  const h = execute(target, EMPTY_HISTORY, op);
  assert.equal(h.project.instances.length, layout.placements.length + 1);
  assert.equal(undo(h.project, h.history).project.instances.length, 0);
  target = applyOperation(target, { kind: 'instance.add', instance: { ...h.project.instances[0], id: 'inst_x' } }).project;
  assert.throws(() => baseIntoProject(plan, pv, target), /seit der Vorschau geändert/);
});

// ---------------------------------------------------------------------------
// Herauslösen

function worldWithGround(world) {
  const pal = [...world.palette];
  const find = (id, properties) => { let i = pal.findIndex(p => p.id === id && JSON.stringify(p.properties) === JSON.stringify(properties)); if (i < 0) { i = pal.length; pal.push({ id, properties }); } return i; };
  const g = find('minecraft:grass_block', { snowy: 'false' }), d = find('minecraft:dirt', {});
  const occ = new Set(world.cells.filter(c => c.position[1] === 0).map(c => `${c.position[0]},${c.position[2]}`));
  const cells = [...world.cells];
  for (let x = world.bounds.min[0]; x < world.bounds.maxExclusive[0]; x++) for (let z = world.bounds.min[2]; z < world.bounds.maxExclusive[2]; z++) {
    if (!occ.has(`${x},${z}`)) cells.push({ position: [x, 0, z], kind: 'block', paletteIndex: g });
    cells.push({ position: [x, -1, z], kind: 'block', paletteIndex: d });
  }
  return createPayload({ ...world, palette: pal, cells, bounds: { min: [world.bounds.min[0], -1, world.bounds.min[2]], maxExclusive: world.bounds.maxExclusive } });
}

test('split: a whole base on grass is cut into its buildings, fields and the path network', async () => {
  const layout = layoutBase(lib, { template: 'starterbasis' });
  const plan = await buildBasePlan(layout);
  const world = worldWithGround(previewBase(plan, { versions }).resolution.world);
  const t0 = performance.now();
  const a = analyzeSplit(world);
  assert.ok(performance.now() - t0 < 2000);
  const buildingsFound = a.parts.filter(p => p.kind === 'building'), areas = a.parts.filter(p => p.kind === 'area');
  const tall = layout.placements.filter(p => p.version.payload.bounds.maxExclusive[1] >= 5).length;
  assert.ok(buildingsFound.length >= tall - 2 && buildingsFound.length <= tall + 2, `${buildingsFound.length} Gebäude für ${tall} hohe Bauteile`);
  assert.ok(areas.filter(p => p.fn === 'getreidefarm').length >= 3, 'Felder erkannt');
  assert.ok(areas.some(p => p.fn === 'wege' && p.blocks > 200), 'Wegenetz als eine Fläche');
  assert.ok(buildingsFound.some(p => p.fn === 'schmiede') && buildingsFound.some(p => p.fn === 'lager') && buildingsFound.some(p => p.fn === 'kueche'));
  assert.ok(a.restBlocks < world.cells.length * 0.01, 'kaum Reste');
  for (const p of a.parts) { assert.ok(p.blocks > 0); assert.ok(p.box.maxExclusive.every((n, i) => n > p.box.min[i])); }
  // Extraction: no natural ground, right size, source untouched; with ground one layer below.
  const forgeFoot = layout.placements.find(p => p.name === 'Schmiede').footprint;
  const forge = buildingsFound.find(p => p.fn === 'schmiede' && p.box.min[0] === forgeFoot.x0 && p.box.min[2] === forgeFoot.z0);
  assert.ok(forge, 'Schmiede an ihrer Stelle erkannt');
  const ex = extractParts(world, a, [forge.id]);
  assert.deepEqual(ex.payload.bounds.min, [0, 0, 0]);
  assert.ok(!ex.payload.palette.some(s => s.id === 'minecraft:grass_block' || s.id === 'minecraft:dirt'));
  const expected = payloadOf('bld_schmiede').cells.filter(c => c.kind === 'block').length;
  const got = ex.payload.cells.filter(c => c.kind === 'block').length;
  assert.ok(got >= expected * 0.95 && got <= expected * 1.1, `Schmiede nahezu vollständig: ${got} von ${expected}`);
  const withGround = extractParts(world, a, [forge.id], { ground: 'mit', foundation: 1 });
  assert.ok(withGround.payload.palette.some(s => s.id === 'minecraft:dirt'));
  assert.equal(withGround.payload.bounds.maxExclusive[1], ex.payload.bounds.maxExclusive[1] + 1);
  assert.equal(world.cells.filter(c => c.kind === 'block').length, a.natureBlocks + a.parts.reduce((n, p) => n + p.blocks, 0) + a.restBlocks);
  // Two parts merged keep their relative position.
  const two = extractParts(world, a, [buildingsFound[0].id, buildingsFound[1].id]);
  assert.equal(two.part.id, `${buildingsFound[0].id}+${buildingsFound[1].id}`);
  assert.ok(two.payload.cells.length >= buildingsFound[0].blocks + buildingsFound[1].blocks);
  // Rest = ground + whatever was not taken.
  const rest = extractRest(world, a, a.parts.map(p => p.id));
  assert.ok(rest.cells.length >= a.natureBlocks);
  assert.ok(rest.cells.length < a.natureBlocks + a.restBlocks + 1);
  assert.throws(() => extractParts(world, a, ['teil-999']), /gibt es nicht/);
  assert.throws(() => analyzeSplit(world, { coreHeight: 0 }), /coreHeight/);
});

test('split project: instances at their original place, sections rest → areas → buildings', async () => {
  const layout = layoutBase(lib, { template: 'starterbasis' });
  const plan = await buildBasePlan(layout);
  const world = worldWithGround(previewBase(plan, { versions }).resolution.world);
  const a = analyzeSplit(world);
  const { addAssetVersion, createAsset } = await import('../../../dist/domain/src/index.js');
  const parts = [];
  for (const p of a.parts.slice(0, 4)) {
    const ex = extractParts(world, a, [p.id]);
    const asset = createAsset({ name: p.name, provenance: { author: 't', source: 't', license: 't' } });
    const { version } = await addAssetVersion(asset, { payload: ex.payload, label: '1.0', source: { format: 'crop' } });
    parts.push({ version, name: p.name, kind: p.kind, at: ex.at });
  }
  const rest = extractRest(world, a, a.parts.slice(0, 4).map(p => p.id));
  const ra = createAsset({ name: 'Rest', provenance: { author: 't', source: 't', license: 't' } });
  const { version: rv } = await addAssetVersion(ra, { payload: rest, label: '1.0', source: { format: 'crop' } });
  parts.unshift({ version: rv, name: 'Gelände & Rest', kind: 'rest', at: rest.bounds.min });
  const project = splitProject({ name: 'Aufgeteilt', profileId: world.profileId, source: world, parts });
  const vs = new Map(parts.map(p => [p.version.id, p.version]));
  const r = resolveProject(project, vs);
  assert.equal(r.conflicts.length, 0, 'Teile überlappen sich nicht');
  // Every block of the split project is a block of the source at the same relative position.
  const src = new Set(world.cells.filter(c => c.kind === 'block').map(c => `${c.position[0] - world.bounds.min[0]},${c.position[1] - world.bounds.min[1]},${c.position[2] - world.bounds.min[2]}:${world.palette[c.paletteIndex].id}`));
  let n = 0;
  for (const placed of r.placed) for (const c of placed.payload.cells) if (c.kind === 'block') { n++; assert.ok(src.has(`${c.position.join(',')}:${placed.payload.palette[c.paletteIndex].id}`), `Block ${c.position} am alten Platz`); }
  assert.ok(n > 1000);
  assert.deepEqual(project.site.sections.map(s => s.name), ['Gelände & Rest', 'Wege, Felder & Flächen', 'Gebäude'].filter(name => name !== 'Wege, Felder & Flächen' || parts.some(p => p.kind === 'area')));
});
