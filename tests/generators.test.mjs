import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transformBlockState, stateRuleFor, validatePayload } from '../dist/voxel/src/index.js';
import {
  GENERATORS, GENERATOR_TAG, runGenerator, presetValues, createGeneratedAsset, addGeneratedVersion, generatorSourceOf, checkReproducible, normalizeParams, defaultsOf,
  rollParams, describeParams, STYLES, computeMaterials, recipesForMaterials, validateConnectors, analyzeVersion, buildCatalog, facetsOf, createProject,
  applyOperation, newInstance, resolveProject, buildGuide, COMPOUNDS, transformConnector, createCompoundProject, assertGuideAcyclic, findSnapCandidates, createBuildingLibrary, createSampleLibrary, verifyAssetVersion, createBackup, readBackup,
} from '../dist/domain/src/index.js';

const T0 = { position: [0, 0, 0], quarterTurns: 0, mirrorX: false };
const gen = id => GENERATORS.find(g => g.id === id);

/** Defaults, every preset, every style and a deterministic sample of rolled parameter sets per generator. */
function cases() {
  const out = [];
  for (const g of GENERATORS) {
    out.push([g.id, 'Standard', defaultsOf(g.params)]);
    for (const p of g.presets) out.push([g.id, `Vorlage ${p.id}`, presetValues(g.id, p.id)]);
    for (const s of STYLES) out.push([g.id, `Stil ${s.key}`, { ...defaultsOf(g.params), stil: s.key, verwitterung: 30 }]);
    for (let seed = 1; seed <= 25; seed++) out.push([g.id, `Würfel ${seed}`, rollParams(g.params, seed * 7919)]);
    // Extremes of every integer range.
    for (const end of ['min', 'max']) out.push([g.id, `alle ${end}`, Object.fromEntries(g.params.map(d => [d.key, d.type === 'int' ? d[end] : d.default]))]);
  }
  return out;
}
const CASES = cases();

test('generator declarations: unique ids, sane parameters, presets within range', () => {
  assert.deepEqual(GENERATORS.map(g => g.id), ['haus', 'turm', 'mauer', 'bruecke', 'dach', 'treppenhaus', 'kirche', 'hafen', 'torhaus', 'windmuehle', 'brunnen', 'arena']);
  for (const g of GENERATORS) {
    assert.ok(Number.isInteger(g.version) && g.version >= 1);
    assert.equal(new Set(g.params.map(p => p.key)).size, g.params.length, `${g.id}: Parameter eindeutig`);
    for (const d of g.params) {
      if (d.type === 'int') assert.ok(d.min <= d.default && d.default <= d.max && (d.default - d.min) % (d.step ?? 1) === 0, `${g.id}.${d.key}`);
      if (d.type === 'choice') assert.ok(d.options.some(o => o.value === d.default), `${g.id}.${d.key}`);
      if (d.when) assert.ok(g.params.some(o => o.key === d.when.key), `${g.id}.${d.key}: when verweist auf vorhandenen Parameter`);
    }
    assert.ok(g.presets.length >= 5, `${g.id}: Vorlagen`);
    for (const p of g.presets) assert.deepEqual(normalizeParams(g.params, p.values).issues, [], `${g.id}/${p.id}: Vorlage ohne Korrektur`);
  }
});

test('parameters are normalised visibly: clamp, step, unknown choice, unknown key, booleans', () => {
  const { values, issues } = normalizeParams(gen('mauer').params, { laenge: 500, hoehe: '3', staerke: 2.6, krone: 'turm', foo: 1, wehrgang: 'false', verwitterung: 12 });
  assert.equal(values.laenge, 64); assert.equal(values.hoehe, 3); assert.equal(values.staerke, 3); assert.equal(values.krone, 'zinnen'); assert.equal(values.wehrgang, false);
  assert.equal(values.verwitterung, 10, 'Schritt 5');
  assert.deepEqual(Object.keys(values), gen('mauer').params.map(p => p.key), 'Deklarationsreihenfolge');
  assert.deepEqual(issues.map(i => i.key).sort(), ['foo', 'krone', 'laenge', 'staerke', 'verwitterung']);
  assert.ok(issues.every(i => i.message.length > 5));
  assert.equal(normalizeParams(gen('mauer').params, { laenge: 'abc' }).values.laenge, 12);
  assert.deepEqual(rollParams(gen('turm').params, 42), rollParams(gen('turm').params, 42), 'Würfeln deterministisch');
  assert.equal(rollParams(gen('turm').params, 42, { stil: 'nether' }).stil, 'nether', 'feste Werte bleiben');
  assert.match(describeParams(gen('turm').params, defaultsOf(gen('turm').params)), /Turmhöhe 14 Blöcke/);
});

test('every generated building is valid, deterministic and inside its declared size', async () => {
  for (const [id, label, values] of CASES) {
    const a = runGenerator(id, values), b = runGenerator(id, values);
    validatePayload(a.payload);
    assert.deepEqual(a.issues, [], `${id} ${label}: Eingabe war schon normalisiert`);
    assert.deepEqual(a.payload, b.payload, `${id} ${label}: deterministisch`);
    assert.ok(a.payload.cells.some(c => c.kind === 'block'), `${id} ${label}: nicht leer`);
    const [sx, , sz] = a.payload.bounds.maxExclusive;
    for (const c of a.payload.cells) assert.ok(c.position[0] < sx && c.position[2] < sz && c.position.every(n => n >= 0));
    assert.ok(a.name.length > 3 && a.description.length > 10);
    assert.equal(a.facets.kategorie.length, 1);
  }
});

test('every generated state is in the B7 catalogue: four turns and double mirror are the identity', () => {
  const seen = new Map();
  for (const [id, label, values] of CASES) for (const s of runGenerator(id, values).payload.palette) seen.set(JSON.stringify(s), `${id} ${label}`);
  for (const [json, where] of seen) {
    const state = JSON.parse(json);
    if (state.id === 'minecraft:air') continue;
    const props = Object.keys(state.properties);
    if (props.length) {
      const rule = stateRuleFor(state.id);
      assert.ok(rule, `${where}: ${state.id} hat Properties, aber keine B7-Regel`);
      assert.deepEqual(props.sort(), Object.keys(rule.schema).sort(), `${where}: ${state.id} Schema exakt`);
    }
    let s = state;
    for (let i = 0; i < 4; i++) { const r = transformBlockState(s, { ...T0, quarterTurns: 1 }); assert.ok(r.resolved, `${where}: ${state.id} drehbar`); s = r.state; }
    assert.deepEqual(s, state);
    const m1 = transformBlockState(state, { ...T0, mirrorX: true }), m2 = transformBlockState(m1.state, { ...T0, mirrorX: true });
    assert.ok(m1.resolved && m2.resolved); assert.deepEqual(m2.state, state);
  }
});

test('materials and recipes: no unresolved, assumed or recipe-less items in any style', () => {
  for (const [id, label, values] of CASES) {
    const payload = runGenerator(id, values).payload, m = computeMaterials(payload);
    // Only the well carries water, and only when asked; liquids are reported, never counted silently.
    const liquids = id === 'brunnen' && values.wasser !== false ? ['minecraft:water'] : [];
    assert.deepEqual([...new Set(m.unresolved.map(u => u.state.id))].filter(x => !liquids.includes(x)), [], `${id} ${label}: ungelöst`);
    assert.ok(m.unresolved.every(u => u.reason === 'liquid'), `${id} ${label}: nur Flüssigkeiten offen`);
    assert.deepEqual(m.items.filter(i => i.confidence === 'assumed').map(i => i.itemId), [], `${id} ${label}: angenommen`);
    const r = recipesForMaterials(m);
    assert.deepEqual(r.base.filter(b => b.kind === 'unknown').map(b => b.itemId), [], `${id} ${label}: kein Rezept`);
  }
});

test('connectors are valid boundary anchors with size-dependent profiles', () => {
  for (const [id, label, values] of CASES) {
    const run = runGenerator(id, values);
    assert.deepEqual(validateConnectors(run.payload, run.connectors).filter(i => i.severity === 'error'), [], `${id} ${label}`);
  }
  const wall = runGenerator('mauer', { laenge: 6, hoehe: 4, staerke: 2, krone: 'zinnen' });
  assert.deepEqual(wall.connectors.map(c => c.profile), ['wall_2x5', 'wall_2x5'], 'passt zu den Beispielmauern');
  const bridge = runGenerator('bruecke', { breite: 4 });
  assert.deepEqual(bridge.connectors.map(c => c.profile), ['weg_4', 'weg_4'], 'passt zum Wege-Baukasten');
  assert.equal(runGenerator('bruecke', { breite: 6 }).connectors[0].profile, 'weg_6');
  assert.deepEqual(runGenerator('turm', {}).connectors, [], 'ohne Anschlüsse nur auf Wunsch');
  assert.equal(runGenerator('turm', { anschluesse: true, mauerStaerke: 3, mauerHoehe: 9 }).connectors.length, 4);
});

test('a generated tower and wall of the same section snap together without voxel conflicts', async () => {
  const tower = runGenerator('turm', { form: 'rund', radius: 4, hoehe: 14, anschluesse: true, mauerStaerke: 3, mauerHoehe: 9 });
  const wall = runGenerator('mauer', { laenge: 10, hoehe: 8, staerke: 3, krone: 'zinnen' });
  assert.equal(wall.connectors[0].profile, tower.connectors[0].profile);
  const t = await createGeneratedAsset(tower), w = await createGeneratedAsset(wall);
  const versions = new Map([[t.version.id, t.version], [w.version.id, w.version]]);
  let p = createProject({ name: 'Burg' });
  const ti = newInstance({ assetVersionId: t.version.id, name: 'Turm' });
  p = applyOperation(p, { kind: 'instance.add', instance: ti }).project;
  const wi = newInstance({ assetVersionId: w.version.id, name: 'Mauer', transform: { position: [30, 0, 30], quarterTurns: 0, mirrorX: false } });
  p = applyOperation(p, { kind: 'instance.add', instance: wi }).project;
  const candidates = findSnapCandidates({ project: p, versions, version: w.version, instanceId: wi.id });
  const east = candidates.find(c => c.target.connectorId === 'east' && c.connectorId === 'west' && c.conflicts === 0);
  assert.ok(east, `Andockvorschlag Turm-Ost ↔ Mauer-West: ${JSON.stringify(candidates.map(c => [c.target.connectorId, c.connectorId, c.conflicts]))}`);
  assert.equal(candidates.length, 8, 'jede Mauerseite an jede Turmseite');
});

test('generated buildings resolve alone and give an acyclic build guide; facets are tagged', async () => {
  for (const g of GENERATORS) for (const preset of g.presets) {
    const run = runGenerator(g.id, presetValues(g.id, preset.id));
    const { asset, version } = await createGeneratedAsset(run);
    await verifyAssetVersion(version);
    assert.ok(!asset.demo && asset.tags.includes(GENERATOR_TAG) && asset.tags.includes(`generator:${g.id}`));
    assert.deepEqual(facetsOf(asset).kategorie, run.facets.kategorie);
    let p = createProject({ name: g.id });
    p = applyOperation(p, { kind: 'instance.add', instance: newInstance({ assetVersionId: version.id, name: g.id }) }).project;
    const r = resolveProject(p, new Map([[version.id, version]]));
    assert.equal(r.conflicts.length, 0); assert.deepEqual(r.exportBlockers, [], `${g.id}/${preset.id}`);
    const guide = buildGuide(p, r); assertGuideAcyclic(guide);
    const metrics = analyzeVersion(version);
    assert.equal(guide.totals.blocks, metrics.blocks);
    assert.ok(metrics.transform.rotatable && metrics.transform.mirrorable, `${g.id}/${preset.id}: drehbar`);
  }
});

test('versions store the parameters, rebuild identically, and new parameters make a new version', async () => {
  const run = runGenerator('haus', { breite: 11, geschosse: 3 });
  const first = await createGeneratedAsset(run, { name: 'Mein Haus', author: 'Philipp' });
  assert.equal(first.asset.name, 'Mein Haus'); assert.equal(first.asset.provenance.author, 'Philipp');
  assert.equal(first.version.source.format, 'generator');
  assert.deepEqual(generatorSourceOf(first.version), { id: 'haus', version: gen('haus').version, params: run.values });
  assert.equal((await checkReproducible(first.version)).status, 'gleich');
  // Same parameters, same content address (label and asset id equal).
  const again = await createGeneratedAsset(run, { name: 'Mein Haus' });
  assert.equal(again.version.payloadHash, first.version.payloadHash);
  await assert.rejects(addGeneratedVersion(first.asset, run, '1.0'), /existiert bereits/);
  const second = await addGeneratedVersion(first.asset, runGenerator('haus', { ...run.values, geschosse: 2 }));
  assert.deepEqual(second.asset.versionIds, [first.version.id, second.version.id]);
  assert.equal(second.version.label, '2.0');
  assert.notEqual(second.version.payloadHash, first.version.payloadHash);
  // Tampered parameters or an older algorithm are reported, never passed as equal.
  const tampered = { ...first.version, source: { ...first.version.source, generator: { ...first.version.source.generator, params: { ...run.values, geschosse: 1 } } } };
  assert.equal((await checkReproducible(tampered)).status, 'abweichend');
  const older = { ...first.version, source: { ...first.version.source, generator: { ...first.version.source.generator, version: 0 } } };
  assert.equal((await checkReproducible(older)).status, 'aeltere-version');
  assert.equal((await checkReproducible({ ...first.version, source: { format: 'demo' } })).status, 'kein-generator');
  const edited = { ...first.version, connectors: [{ id: 'x', position: [0, 0, 1], normal: [-1, 0, 0], up: [0, 1, 0], type: 't', profile: 'p' }] };
  assert.equal((await checkReproducible(edited)).connectorsEdited, true);
  // Backups carry the generator source unchanged.
  const backup = await createBackup({ projects: [], assets: [second.asset], versions: new Map([[first.version.id, first.version], [second.version.id, second.version]]), getOriginal: async () => null }, 'all');
  const read = await readBackup(JSON.stringify(backup));
  assert.deepEqual(read.versions.find(v => v.id === second.version.id).source.generator, second.version.source.generator);
});

test('generated assets join the catalogue as own entries with computed metrics', async () => {
  const [lib, samples] = await Promise.all([createBuildingLibrary(), createSampleLibrary()]);
  const g = await createGeneratedAsset(runGenerator('bruecke', { form: 'haenge', laenge: 30 }));
  const assets = [...samples.assets, ...lib.assets, g.asset], versions = new Map([...samples.versions, ...lib.versions, g.version].map(v => [v.id, v]));
  const { entries } = buildCatalog(assets, versions);
  const e = entries.find(x => x.asset.id === g.asset.id);
  assert.ok(e && !e.asset.demo);
  assert.equal(e.metrics.size[0], 30);
  assert.deepEqual(e.facets.kategorie, ['infrastruktur']);
});

test('geometry follows the parameters', () => {
  const wall = (v) => runGenerator('mauer', v).payload.bounds.maxExclusive;
  assert.deepEqual(wall({ laenge: 20, hoehe: 6, staerke: 3 }), [20, 7, 3]);
  assert.deepEqual(wall({ laenge: 20, hoehe: 6, staerke: 3, pfeiler: 5, krone: 'keine' }), [20, 6, 4], 'Pfeiler eine Reihe tiefer, ohne Krone');
  const blocks = v => runGenerator('turm', v).payload.cells.filter(c => c.kind === 'block').length;
  assert.ok(blocks({ hoehe: 20 }) > blocks({ hoehe: 10 }), 'höher ⇒ mehr Blöcke');
  assert.deepEqual(runGenerator('turm', { radius: 5 }).payload.bounds.maxExclusive.filter((_, i) => i !== 1), [11, 11]);
  const house = runGenerator('haus', { breite: 9, tiefe: 7, ueberstand: 1, vordach: false, vorkragung: 0 }).payload.bounds.maxExclusive;
  assert.deepEqual([house[0], house[2]], [11, 9], 'Hausmaß + Überstand');
  const jettied = runGenerator('haus', { breite: 9, tiefe: 7, ueberstand: 1, vordach: false, vorkragung: 1 }).payload.bounds.maxExclusive;
  assert.deepEqual([jettied[0], jettied[2]], [11, 11], 'Vorkragung vorn und hinten (LIB-05)');
  const roof = runGenerator('dach', { breite: 9, tiefe: 7, ueberstand: 0, form: 'sattel', neigung: 'steil', first: 'x' });
  assert.deepEqual(roof.payload.bounds.maxExclusive, [9, 5, 7], 'Satteldach 7 tief, steil: 4 Lagen und Firstspitzen (LIB-05)');
  const bridge = runGenerator('bruecke', { form: 'bogen', laenge: 8, hoehe: 12 });
  assert.ok(bridge.notes.some(n => /nicht erreichbar/.test(n)), 'unerreichbare Höhe wird gemeldet');
  // Walkable: the deck never rises more than one block per step (stairs bridge every step).
  const doors = runGenerator('haus', { geschosse: 3 }).payload.palette.filter(s => s.id.endsWith('_door'));
  assert.equal(doors.length, 2, 'eine Tür (zwei Hälften)');
  const ladders = runGenerator('haus', { geschosse: 3, geschoss: 4 }).payload.cells.filter(c => runGenerator('haus', { geschosse: 3, geschoss: 4 }).payload.palette[c.paletteIndex].id === 'minecraft:ladder');
  assert.equal(ladders.length, 10, 'Leiter bis ins oberste Geschoss');
});

test('pinned generator output: same parameters keep their geometry until the generator version is raised', async () => {
  const pinned = {};
  for (const g of GENERATORS) pinned[g.id] = (await createGeneratedAsset(runGenerator(g.id), { name: 'Pin' })).version.payloadHash.slice(0, 16);
  // Update these hashes only together with a raised `version` of the changed generator (BLOCK-02 raised kirche, hafen, windmuehle, bruecke, treppenhaus, torhaus, brunnen; LIB-05 raised all eleven for the design kit; GEN-03 added arena).
  assert.deepEqual(pinned, PINNED);
});
const PINNED = { haus: "86b653adf27a1116", turm: "305be143c97ba8f8", mauer: "bce307b15c0977d2", bruecke: "b6fcf5cbef91853f", dach: "0eca3766a7ef319a", treppenhaus: "6649f6b36d559aa8", kirche: "4ddc2030741cd73f", hafen: "d3f2b1f998647248", torhaus: "75ee60a4e5189e68", windmuehle: "98a036222a6f388c", brunnen: "f727b1daddaf9604", arena: "bd0da77e88c87aa9" };

test('compounds: castle and street become conflict-free projects with shared generated assets', async () => {
  for (const c of COMPOUNDS) {
    const sets = [defaultsOf(c.params), ...c.presets.map(p => p.values), ...[1, 2, 3, 4, 5, 6].map(s => rollParams(c.params, s * 104729))];
    for (const raw of sets) {
      const b = await createCompoundProject(c.id, raw);
      const versions = new Map(b.versions.map(v => [v.id, v]));
      const r = resolveProject(b.project, versions);
      assert.equal(r.conflicts.length, 0, `${c.id} ${JSON.stringify(b.values)}: ${r.conflicts.length} Konflikte`);
      assert.deepEqual(r.exportBlockers, []);
      assert.ok(b.assets.every(a => !a.demo && a.tags.includes(GENERATOR_TAG)));
      assert.ok(b.versions.every(v => generatorSourceOf(v)));
      assert.equal(new Set(b.project.instances.map(i => i.assetVersionId)).size, b.assets.length, 'gleiche Teile ⇒ ein Asset');
    }
  }
  const village = await createCompoundProject('dorfplatz', {});
  assert.deepEqual(village.project.instances.map(i => i.name), ['Kirche', 'Windmühle', 'Brunnen', 'Haus 1', 'Haus 2', 'Haus 3', 'Haus 4']);
  assert.equal(village.project.instances.find(i => i.name === 'Kirche').transform.quarterTurns, 2, 'Kirchenportal zeigt zum Platz');
  const castle = await createCompoundProject('burganlage', { hofBreite: 16, hofTiefe: 16, tor: true, bergfried: true });
  assert.equal(castle.project.instances.length, 9);
  assert.equal(castle.assets.length, 4, 'Turm, Tormauer, Mauer, Bergfried');
  const street = await createCompoundProject('haeuserzeile', { anzahl: 6, abstand: 0 });
  assert.equal(street.project.instances.length, 6);
  const again = await createCompoundProject('haeuserzeile', { anzahl: 6, abstand: 0 });
  assert.deepEqual(again.versions.map(v => v.payloadHash), street.versions.map(v => v.payloadHash), 'deterministisch');
});

// ------------------------------------------------------------ GEN-02: new generators and stair corners

/** Standing cells reachable on foot from `start`: one block up only onto a stair from its low side. */
function walk(payload, start) {
  const grid = new Map();
  for (const c of payload.cells) grid.set(c.position.join(','), c.kind === 'air' ? null : payload.palette[c.paletteIndex]);
  const g = (x, y, z) => grid.get(`${x},${y},${z}`);
  const free = s => !s || /_door$|ladder|_carpet$|_pressure_plate$/.test(s.id);
  const solid = s => s && !free(s) && !/_fence$|_wall$|_fence_gate$|chain|lantern|_pane$|_bars$|water/.test(s.id) && !(s.id.endsWith('_slab') && s.properties.type === 'bottom');
  const stand = (x, y, z) => solid(g(x, y - 1, z)) && free(g(x, y, z)) && free(g(x, y + 1, z));
  const opp = { north: 'south', south: 'north', east: 'west', west: 'east' };
  const seen = new Set([start.join(',')]), queue = [start];
  while (queue.length) {
    const [x, y, z] = queue.shift();
    for (const [dx, dz, dir] of [[1, 0, 'east'], [-1, 0, 'west'], [0, 1, 'south'], [0, -1, 'north']]) for (const dy of [-1, 0, 1]) {
      const n = [x + dx, y + dy, z + dz], k = n.join(',');
      if (seen.has(k) || !stand(...n)) continue;
      if (dy === 1) { const s = g(n[0], y, n[2]); if (!s?.id.endsWith('_stairs') || s.properties.facing === opp[dir]) continue; }
      if (dy === -1) { const s = g(x, y - 1, z); if (!s?.id.endsWith('_stairs')) continue; }
      seen.add(k); queue.push(n);
    }
  }
  return seen;
}

test('stairwell: every storey is reachable on foot, doors sit at the house floor heights', () => {
  for (const [id, label, values] of CASES.filter(c => c[0] === 'treppenhaus')) {
    const run = runGenerator(id, values), v = run.values, R = v.geschoss + 1, oz = v.balkone ? 2 : 0, c = Math.floor(v.breite / 2);
    const reach = walk(run.payload, [c, 1, oz + 1]);
    for (let k = 0; k < v.geschosse; k++) assert.ok(reach.has(`${c},${k * R + 1},${oz + 1}`), `${label}: Geschoss ${k + 1} (Treppenabsatz) erreichbar`);
    const doors = run.payload.cells.filter(cell => cell.kind === 'block' && run.payload.palette[cell.paletteIndex].id.endsWith('_door') && run.payload.palette[cell.paletteIndex].properties.half === 'lower');
    assert.deepEqual(doors.map(d => d.position[1]).sort((a, b) => a - b), Array.from({ length: v.geschosse }, (_, k) => k * R + 1), `${label}: eine Tür je Geschoss`);
    assert.ok(doors.every(d => d.position[0] === c && d.position[2] === oz), `${label}: Türen übereinander`);
  }
  const house = runGenerator('haus', { geschosse: 3, geschoss: 4 }), well = runGenerator('treppenhaus', { geschosse: 3, geschoss: 4 });
  assert.ok(well.notes.some(n => /Geschosshöhe 4/.test(n)));
  assert.equal(house.payload.bounds.maxExclusive[1] > 3 * 5, true);
});

test('stair corners: hip roofs get the outer and inner shapes the game would compute', async () => {
  const roof = runGenerator('dach', { breite: 7, tiefe: 7, ueberstand: 0, form: 'walm', neigung: 'steil' }).payload;
  const at = (x, y, z) => { const c = roof.cells.find(c => c.position[0] === x && c.position[1] === y && c.position[2] === z); return c && roof.palette[c.paletteIndex]; };
  for (const [x, z] of [[0, 0], [6, 0], [0, 6], [6, 6]]) assert.match(at(x, 0, z).properties.shape, /^outer_/, `Ecke ${x},${z}`);
  assert.equal(at(3, 0, 0).properties.shape, 'straight');
  // Game rule: a stair facing east whose back neighbour faces south (not its counter-clockwise north) is outer_right.
  assert.deepEqual([at(0, 0, 0).properties.facing, at(1, 0, 0).properties.facing, at(0, 0, 0).properties.shape], ['east', 'south', 'outer_right']);
  // Inner corners: a stair whose front neighbour is perpendicular (game rule, checked on the plot directly).
  const { Plot } = await import('../dist/domain/src/catalog/build/plot.js');
  const p = new Plot([3, 1, 3]);
  p.set(1, 0, 1, 'oak_stairs', { facing: 'north', half: 'bottom', shape: 'straight', waterlogged: 'false' });
  p.set(1, 0, 2, 'oak_stairs', { facing: 'east', half: 'bottom', shape: 'straight', waterlogged: 'false' });
  p.shapeStairs();
  assert.equal(p.get(1, 0, 1).properties.shape, 'inner_right', 'Front (Süden) zeigt nach Osten ≠ gegen den Uhrzeigersinn (Westen)');
  assert.equal(p.get(1, 0, 2).properties.shape, 'straight', 'Rücken und Front ohne Treppe: gerade');
  const tower = runGenerator('turm', { form: 'rund', radius: 5, dach: 'kegel' }).payload;
  const shapes = new Set(tower.palette.filter(s => s.id.endsWith('_stairs')).map(s => s.properties.shape));
  assert.ok(shapes.has('outer_left') || shapes.has('outer_right'));
  // A gable roof stays straight; the stored v1 generator versions are reported as older.
  const gable = runGenerator('dach', { form: 'sattel' }).payload;
  assert.deepEqual([...new Set(gable.palette.filter(s => s.id.endsWith('_stairs')).map(s => s.properties.shape))], ['straight']);
  for (const id of ['haus', 'turm', 'dach']) assert.ok(gen(id).version >= 2, `${id}: Version wegen Eckformen erhöht`);
});

test('church, harbour, gatehouse, windmill and well follow their parameters', () => {
  const ids = run => run.payload.palette.map(s => s.id);
  const church = runGenerator('kirche', { turm: 'front', glocke: true, turmhoehe: 14, wandhoehe: 7 });
  assert.ok(ids(church).includes('minecraft:bell') && ids(church).includes('minecraft:lightning_rod'));
  assert.ok(church.payload.bounds.maxExclusive[1] >= 7 + 14, 'Turm über der Wand');
  assert.ok(!ids(runGenerator('kirche', { turm: 'keiner', glocke: true })).includes('minecraft:bell'), 'ohne Turm keine Glocke');
  assert.ok(runGenerator('kirche', { seitenschiffe: true, wandhoehe: 6 }).notes.some(n => /Seitenschiffe erst ab/.test(n)));
  const nave = v => runGenerator('kirche', v).payload.bounds.maxExclusive;
  assert.ok(nave({ seitenschiffe: true, wandhoehe: 10 })[0] === nave({ wandhoehe: 10 })[0] + 6, 'Seitenschiffe je 3 breit');
  const church2 = runGenerator('kirche', { turm: 'front' }), reach = walk(church2.payload, [church2.payload.bounds.maxExclusive[0] >> 1, 1, 1]);
  assert.ok([...reach].some(k => Number(k.split(',')[2]) > 10), 'vom Portal durch das Langhaus begehbar');

  const harbor = runGenerator('hafen', { wassertiefe: 4, stege: 2, stegbreite: 3, steglaenge: 10 });
  const deck = harbor.payload.cells.filter(c => c.position[2] < 10 && harbor.payload.palette[c.paletteIndex].id.endsWith('_planks')).map(c => c.position[1]);
  assert.deepEqual([...new Set(deck)], [5], 'Stege einen Block über dem Wasserspiegel');
  assert.deepEqual(harbor.connectors.map(c => [c.type, c.profile]), [['path_joint', 'weg_4']]);
  assert.ok(runGenerator('hafen', { laenge: 10, stege: 5, stegbreite: 5 }).notes.some(n => /passen/.test(n)), 'zu viele Stege gemeldet');

  const gate = runGenerator('torhaus', { mauerStaerke: 2, mauerHoehe: 7, torhoehe: 4 });
  assert.deepEqual(gate.connectors.map(c => c.profile), ['wall_2x7', 'wall_2x7']);
  assert.ok(gate.notes.some(n => /Wehrgang führt durch/.test(n)));
  assert.ok(runGenerator('torhaus', { mauerStaerke: 2, mauerHoehe: 5, torhoehe: 4 }).notes.some(n => /kein Durchgang/.test(n)));
  const passage = walk(gate.payload, [5, 1, 0]);
  assert.ok(passage.has(`5,1,${gate.payload.bounds.maxExclusive[2] - 1}`), 'Durchfahrt offen');
  assert.ok(!walk(runGenerator('torhaus', { fallgitter: true }).payload, [5, 1, 0]).has('5,1,6'), 'Fallgitter schließt');

  const mill = runGenerator('windmuehle', { hoehe: 8, fluegel: 12 });
  assert.ok(mill.notes.some(n => /gekürzt/.test(n)));
  assert.ok(mill.payload.cells.every(c => c.position[1] >= 0));
  assert.ok(ids(runGenerator('windmuehle', {})).includes('minecraft:white_wool'));

  const dry = runGenerator('brunnen', { wasser: false });
  assert.ok(!ids(dry).includes('minecraft:water'));
  assert.equal(computeMaterials(runGenerator('brunnen', {}).payload).unresolved.every(u => u.state.id === 'minecraft:water'), true);
});

test('gatehouse docks between walls of the castle: joints meet exactly', async () => {
  const b = await createCompoundProject('burganlage', { hofBreite: 20, torhaus: true });
  const versions = new Map(b.versions.map(v => [v.id, v]));
  const placed = name => { const i = b.project.instances.find(x => x.name === name), v = versions.get(i.assetVersionId); return v.connectors.map(c => transformConnector(c, v.payload.pivot, i.transform)); };
  const gate = placed('Torhaus'), west = placed('Mauer Nord (West)'), east = placed('Mauer Nord (Ost)');
  assert.deepEqual(gate[0].position, west[1].position, 'Torhaus West = Mauer-Ende');
  assert.deepEqual(gate[1].position, east[0].position, 'Torhaus Ost = Mauer-Anfang');
  assert.equal(gate[0].profile, west[1].profile);
  assert.equal(resolveProject(b.project, versions).conflicts.length, 0);
});
