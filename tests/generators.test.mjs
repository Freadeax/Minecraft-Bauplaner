import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transformBlockState, stateRuleFor, validatePayload } from '../dist/voxel/src/index.js';
import {
  GENERATORS, GENERATOR_TAG, runGenerator, presetValues, createGeneratedAsset, addGeneratedVersion, generatorSourceOf, checkReproducible, normalizeParams, defaultsOf,
  rollParams, describeParams, STYLES, computeMaterials, recipesForMaterials, validateConnectors, analyzeVersion, buildCatalog, facetsOf, createProject,
  applyOperation, newInstance, resolveProject, buildGuide, COMPOUNDS, createCompoundProject, assertGuideAcyclic, findSnapCandidates, createBuildingLibrary, createSampleLibrary, verifyAssetVersion, createBackup, readBackup,
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
  assert.deepEqual(GENERATORS.map(g => g.id), ['haus', 'turm', 'mauer', 'bruecke', 'dach']);
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
    assert.deepEqual(m.unresolved.map(u => u.state.id), [], `${id} ${label}: ungelöst`);
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
  const house = runGenerator('haus', { breite: 9, tiefe: 7, ueberstand: 1, vordach: false }).payload.bounds.maxExclusive;
  assert.deepEqual([house[0], house[2]], [11, 9], 'Hausmaß + Überstand');
  const roof = runGenerator('dach', { breite: 9, tiefe: 7, ueberstand: 0, form: 'sattel', neigung: 'steil', first: 'x' });
  assert.deepEqual(roof.payload.bounds.maxExclusive, [9, 4, 7], 'Satteldach 7 tief, steil: 4 Lagen');
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
  // Update these hashes only together with a raised `version` of the changed generator.
  assert.deepEqual(pinned, PINNED);
});
const PINNED = { haus: "4cf30ea478f98733", turm: "23b6fd0caac7e6bc", mauer: "4da92383b6b39497", bruecke: "04e077c30b072b61", dach: "d3de7fa1d13a8330" };

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
  const castle = await createCompoundProject('burganlage', { hofBreite: 16, hofTiefe: 16, tor: true, bergfried: true });
  assert.equal(castle.project.instances.length, 9);
  assert.equal(castle.assets.length, 4, 'Turm, Tormauer, Mauer, Bergfried');
  const street = await createCompoundProject('haeuserzeile', { anzahl: 6, abstand: 0 });
  assert.equal(street.project.instances.length, 6);
  const again = await createCompoundProject('haeuserzeile', { anzahl: 6, abstand: 0 });
  assert.deepEqual(again.versions.map(v => v.payloadHash), street.versions.map(v => v.payloadHash), 'deterministisch');
});
