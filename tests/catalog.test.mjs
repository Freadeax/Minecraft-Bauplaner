import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPayload, transformBlockState, stateRuleFor } from '../dist/voxel/src/index.js';
import {
  createBuildingLibrary, createSampleLibrary, BUILDING_SPECS, PATH_PROFILE, analyzeVersion, buildCatalog, queryCatalog, facetCounts, facetTags, facetsOf,
  plainTags, withFacets, fitsPlot, materialOverlap, projectContext, suggestForProject, similarEntries, needsOrientation, materialGroupOf, computeMaterials,
  validateConnectors, createProject, applyOperation, newInstance, resolveProject, buildGuide, assertGuideAcyclic, createAsset, addAssetVersion,
  FAMILY_PREFIX, familyMembers, buildingInfo, familyLabel, stageOf, stageIndex, STAGES, STAGE_LABEL, ENSEMBLES, latestVersions, missingMembers, createEnsembleProject, ensemblesWith,
} from '../dist/domain/src/index.js';

const buildings = await createBuildingLibrary();
const samples = await createSampleLibrary();
const assets = [...samples.assets, ...buildings.assets];
const versions = new Map([...samples.versions, ...buildings.versions].map(v => [v.id, v]));
const { entries, missing } = buildCatalog(assets, versions);
const entry = id => entries.find(e => e.asset.id === id);
const names = list => list.map(e => e.asset.name);
// The 16 original B9 designs plus the 3 samples: exact-name assertions run on this fixed subset,
// so the growing themed sets do not change them.
const CLASSIC = new Set(['bld_fachwerkhaus', 'bld_blockhuette', 'bld_wuestenhaus', 'bld_leuchtturm', 'bld_dorfbrunnen', 'bld_schmiede', 'bld_scheune', 'bld_marktstand',
  'bld_kapelle', 'bld_gewaechshaus', 'bld_villa', 'bld_iglu', 'bld_steinbruecke', 'bld_hafensteg', 'bld_wachturm', 'bld_baumhaus']);
const classic = entries.filter(e => CLASSIC.has(e.asset.id) || !e.asset.id.startsWith('bld_'));
const specOf = new Map(BUILDING_SPECS.map(s => [s.id, s]));
const T0 = { position: [0, 0, 0], quarterTurns: 0, mirrorX: false };

test('shipped buildings: deterministic, demo-labelled, with provenance and one version each', async () => {
  assert.ok(BUILDING_SPECS.length >= 150, `${BUILDING_SPECS.length} Gebäude`);
  assert.equal(classic.length, 19);
  assert.equal(new Set(BUILDING_SPECS.map(s => s.id)).size, BUILDING_SPECS.length, 'ids unique');
  assert.equal(new Set(BUILDING_SPECS.map(s => s.name)).size, BUILDING_SPECS.length, 'names unique');
  assert.equal(missing.length, 0);
  const again = await createBuildingLibrary();
  assert.deepEqual(again.versions.map(v => v.id), buildings.versions.map(v => v.id), 'same code ⇒ same content addresses');
  for (const a of buildings.assets) {
    assert.ok(a.demo && a.id.startsWith('bld_'), a.id);
    assert.equal(a.versionIds.length, 1);
    assert.match(a.provenance.source, /synthetisch/);
    const f = facetsOf(a);
    assert.equal(f.kategorie.length, 1, `${a.id}: genau eine Kategorie`);
    assert.ok(f.stil.length && f.biom.length && f.funktion.length, `${a.id}: Stil, Biom, Funktion angegeben`);
  }
});

test('every building state is in the B7 catalogue: four turns and double mirror are the identity', () => {
  for (const v of buildings.versions) {
    for (const state of v.payload.palette.filter(s => s.id !== 'minecraft:air')) {
      const props = Object.keys(state.properties);
      if (props.length) {
        const rule = stateRuleFor(state.id);
        assert.ok(rule, `${v.assetId}: ${state.id} hat Properties, aber keine B7-Regel`);
        assert.deepEqual(props.sort(), Object.keys(rule.schema).sort(), `${v.assetId}: ${state.id} Schema exakt`);
      }
      let s = state;
      for (let i = 0; i < 4; i++) { const r = transformBlockState(s, { ...T0, quarterTurns: 1 }); assert.ok(r.resolved, `${state.id} drehbar`); s = r.state; }
      assert.deepEqual(s, state, `${state.id}: vier Vierteldrehungen`);
      const m1 = transformBlockState(state, { ...T0, mirrorX: true }), m2 = transformBlockState(m1.state, { ...T0, mirrorX: true });
      assert.ok(m1.resolved && m2.resolved); assert.deepEqual(m2.state, state, `${state.id}: doppelte Spiegelung`);
    }
    const m = analyzeVersion(v);
    assert.ok(m.transform.rotatable && m.transform.mirrorable, v.assetId);
  }
});

test('materials of buildings: only the gaps and assumptions declared in the spec stay visible', () => {
  for (const v of buildings.versions) {
    const r = computeMaterials(v.payload), spec = specOf.get(v.assetId);
    const unresolved = [...new Set(r.unresolved.map(u => u.state.id))].sort(), assumed = r.items.filter(i => i.confidence === 'assumed').map(i => i.itemId).sort();
    assert.deepEqual(unresolved, [...(spec.gaps ?? [])].sort(), `${v.assetId} ungelöst`);
    assert.deepEqual(assumed, [...(spec.assumed ?? [])].sort(), `${v.assetId} Annahmen`);
    assert.ok(unresolved.every(id => ['minecraft:water', 'minecraft:lava'].includes(id)), `${v.assetId}: nur Flüssigkeiten ungelöst`);
    assert.equal(analyzeVersion(v).items.complete, !unresolved.length && !assumed.length, v.assetId);
  }
  assert.deepEqual(specOf.get('bld_dorfbrunnen').gaps, ['minecraft:water']);
  assert.deepEqual(specOf.get('bld_gewaechshaus').assumed, ['minecraft:dirt']);
});

test('building connectors are valid boundary anchors and share the path profile', () => {
  for (const v of buildings.versions) {
    const errors = validateConnectors(v.payload, v.connectors).filter(i => i.severity === 'error');
    assert.deepEqual(errors, [], v.assetId);
  }
  assert.deepEqual(entry('bld_steinbruecke').metrics.connectors.map(c => c.profile), [PATH_PROFILE, PATH_PROFILE]);
  assert.deepEqual(entry('bld_hafensteg').metrics.connectors.map(c => c.profile), [PATH_PROFILE]);
});

test('every building resolves alone and yields an acyclic build guide', () => {
  for (const v of buildings.versions) {
    let p = createProject({ name: v.assetId });
    p = applyOperation(p, { kind: 'instance.add', instance: newInstance({ assetVersionId: v.id, name: v.assetId }) }).project;
    const r = resolveProject(p, versions);
    assert.equal(r.conflicts.length, 0); assert.deepEqual(r.exportBlockers, [], v.assetId);
    const guide = buildGuide(p, r); assertGuideAcyclic(guide);
    assert.equal(guide.totals.blocks, analyzeVersion(v).blocks, `${v.assetId}: Anleitung zählt dieselben Blöcke`);
  }
});

test('analyzeVersion on an independent hand-made payload', () => {
  const S = (id, properties = {}) => ({ id: `minecraft:${id}`, properties });
  const palette = [S('air'), S('stone'), S('red_bed', { facing: 'east', occupied: 'false', part: 'foot' }), S('red_bed', { facing: 'east', occupied: 'false', part: 'head' }),
    S('oak_door', { facing: 'north', half: 'lower', hinge: 'left', open: 'false', powered: 'false' }), S('oak_door', { facing: 'north', half: 'upper', hinge: 'left', open: 'false', powered: 'false' }),
    S('chest', { facing: 'south', type: 'single', waterlogged: 'false' }), S('torch'), S('glass'), S('oak_log', { axis: 'y' }), S('oak_log', { axis: 'x' }), S('furnace', { facing: 'north', lit: 'false' }), S('lectern', { facing: 'north', has_book: 'false', powered: 'false' })];
  const cell = (x, y, z, i) => ({ position: [x, y, z], kind: i === 0 ? 'air' : 'block', paletteIndex: i });
  const payload = createPayload({ schemaVersion: 1, profileId: 'test', bounds: { min: [0, 0, 0], maxExclusive: [4, 2, 2] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette, blockEntities: [],
    cells: [cell(0, 0, 0, 1), cell(1, 0, 0, 1), cell(2, 0, 0, 1), cell(3, 0, 0, 1), cell(0, 1, 0, 2), cell(1, 1, 0, 3), cell(2, 0, 1, 4), cell(2, 1, 1, 5), cell(3, 1, 0, 6),
      cell(0, 0, 1, 7), cell(1, 0, 1, 8), cell(3, 0, 1, 9), cell(2, 1, 0, 10), cell(1, 1, 1, 11), cell(0, 1, 1, 12), cell(3, 1, 1, 0)] });
  const m = analyzeVersion({ id: 'av_test', payload, connectors: [] });
  assert.deepEqual(m.size, [4, 2, 2]); assert.equal(m.volume, 16); assert.equal(m.blocks, 15); assert.equal(m.air, 1);
  assert.equal(m.footprint, 8); assert.equal(m.sizeClass, 'klein'); assert.equal(m.layers, 2); assert.equal(m.fillRatio, 0.938);
  assert.equal(m.beds, 1); assert.equal(m.doors, 1); assert.equal(m.windows, 1); assert.equal(m.storageSlots, 27);
  assert.equal(m.lightSources, 1, 'torch; furnace lit=false emits nothing'); assert.equal(m.lightSum, 14);
  assert.deepEqual(m.workstations.map(w => w.profession), ['Bibliothekar']);
  // oriented: 2 bed + 2 door + chest + furnace + lectern + log axis x = 8 (log axis y and plain blocks are default placements)
  assert.equal(m.oriented, 8);
  assert.equal(m.topBlocks[0].id, 'minecraft:stone'); assert.equal(m.topBlocks[0].count, 4); assert.equal(m.topBlocks[0].share, 0.267);
  assert.equal(m.phases.attached + m.phases.structure + m.phases.gravity + m.phases.liquid, 15);
  assert.equal(m.items.total, 13, 'bed and door count once each'); assert.ok(m.items.complete);
  assert.ok(m.buildTime.minutes >= 1); assert.match(m.buildTime.assumptions, /Schätzung/);
  assert.ok(m.difficulty.level >= 1 && m.difficulty.level <= 5);
});

test('needsOrientation and material groups follow explicit rules', () => {
  assert.equal(needsOrientation({ axis: 'y' }), false); assert.equal(needsOrientation({ axis: 'z' }), true);
  assert.equal(needsOrientation({ type: 'bottom', waterlogged: 'false' }), false); assert.equal(needsOrientation({ type: 'top', waterlogged: 'false' }), true);
  assert.equal(needsOrientation({ facing: 'up', open: 'false' }), true);
  assert.equal(materialGroupOf('minecraft:spruce_planks'), 'holz'); assert.equal(materialGroupOf('minecraft:stone_bricks'), 'stein');
  assert.equal(materialGroupOf('minecraft:glass_pane'), 'glas'); assert.equal(materialGroupOf('minecraft:lantern'), 'licht');
  assert.equal(materialGroupOf('minecraft:chest'), 'funktion'); assert.equal(materialGroupOf('minecraft:water'), 'fluessig');
  assert.equal(materialGroupOf('minecraft:white_concrete'), 'beton'); assert.equal(materialGroupOf('mod:thing'), 'sonstiges');
});

test('facet tags round-trip and keep plain tags', () => {
  const tags = facetTags({ stil: ['Modern', 'rustikal'], kategorie: ['wohnhaus'], biom: [''] });
  assert.deepEqual(tags, ['kategorie:wohnhaus', 'stil:modern', 'stil:rustikal']);
  const asset = createAsset({ name: 'X', tags: ['hafen', ...tags, 'biom:mondbasis'], provenance: { author: '', source: '', license: '' } });
  assert.deepEqual(facetsOf(asset), { kategorie: ['wohnhaus'], stil: ['modern', 'rustikal'], biom: ['mondbasis'], funktion: [] }, 'unknown values are kept');
  assert.deepEqual(plainTags(asset), ['hafen']);
  assert.deepEqual(withFacets(asset.tags, { funktion: ['lagern'] }), ['funktion:lagern', 'hafen']);
});

test('queryCatalog: facets OR within a group and AND across groups; "überall" fits every biome', () => {
  const houses = queryCatalog(classic, { facets: { kategorie: ['wohnhaus'] } });
  assert.deepEqual(names(houses), ['Baumhaus', 'Blockhütte', 'Fachwerkhaus', 'Iglu', 'Moderne Villa', 'Wüstenhaus']);
  assert.deepEqual(names(queryCatalog(classic, { facets: { kategorie: ['wohnhaus'], stil: ['modern', 'nordisch'] } })), ['Blockhütte', 'Iglu', 'Moderne Villa']);
  const snow = names(queryCatalog(classic, { facets: { biom: ['schnee'] } }));
  assert.ok(snow.includes('Iglu') && snow.includes('Dorfbrunnen') && snow.includes('Eckturm') && !snow.includes('Wüstenhaus'));
  assert.equal(queryCatalog(entries, { origin: 'eigene' }).length, 0);
  assert.equal(queryCatalog(entries, { origin: 'beispiele' }).length, entries.length);
  assert.equal(queryCatalog(classic, { origin: 'beispiele' }).length, 19);
});

test('queryCatalog: building site with and without rotation, height, difficulty, flags', () => {
  const steg = entry('bld_hafensteg');
  assert.deepEqual(steg.metrics.size, [4, 4, 12]);
  assert.ok(fitsPlot(steg.metrics, { width: 12, depth: 4, allowRotation: true }));
  assert.ok(!fitsPlot(steg.metrics, { width: 12, depth: 4, allowRotation: false }));
  assert.ok(!fitsPlot(steg.metrics, { width: 12, depth: 12, height: 3, allowRotation: true }));
  const small = queryCatalog(entries, { plot: { width: 7, depth: 7, height: 10, allowRotation: true } });
  for (const e of small) { const [w, h, d] = e.metrics.size; assert.ok(h <= 10 && Math.max(w, d) <= 7, e.asset.id); }
  assert.ok(names(small).includes('Iglu') && !names(small).includes('Leuchtturm'));
  for (const e of queryCatalog(entries, { difficultyMax: 2 })) assert.ok(e.metrics.difficulty.level <= 2);
  assert.ok(queryCatalog(entries, { withBeds: true }).every(e => e.metrics.beds > 0));
  assert.deepEqual(names(queryCatalog(classic, { withConnectors: true, connectorType: 'path_joint' })), ['Hafensteg', 'Steinbrücke']);
  assert.ok(names(queryCatalog(entries, { withConnectors: true, connectorType: 'path_joint' })).includes('Holzbrücke'));
  assert.ok(queryCatalog(entries, { onlyComplete: true }).every(e => e.metrics.items.complete));
  assert.ok(!names(queryCatalog(entries, { onlyComplete: true })).includes('Dorfbrunnen'));
});

test('queryCatalog: text finds names, facet labels, block ids and professions; sorting is deterministic', () => {
  assert.deepEqual(names(queryCatalog(classic, { text: 'bibliothekar' })), ['Kapelle']);
  assert.ok(names(queryCatalog(entries, { text: 'bibliothekar' })).includes('Werkstatt: Bibliothek'));
  assert.ok(names(queryCatalog(entries, { text: 'sandstone' })).includes('Wüstenhaus'));
  assert.ok(names(queryCatalog(entries, { text: 'küstenstil' })).includes('Leuchtturm'));
  const byBlocks = queryCatalog(entries, { sort: 'blocks' });
  for (let i = 1; i < byBlocks.length; i++) assert.ok(byBlocks[i - 1].metrics.blocks <= byBlocks[i].metrics.blocks);
  assert.deepEqual(queryCatalog(entries, { sort: 'blocks', descending: true }).map(e => e.asset.id), [...queryCatalog(entries, { sort: 'blocks', descending: true })].map(e => e.asset.id));
  assert.equal(queryCatalog(classic, { sort: 'height', descending: true })[0].asset.id, 'bld_leuchtturm');
  const archived = entries.map(e => e.asset.id === 'bld_iglu' ? { ...e, asset: { ...e.asset, archived: true } } : e);
  assert.ok(!names(queryCatalog(archived, {})).includes('Iglu')); assert.ok(names(queryCatalog(archived, { includeArchived: true })).includes('Iglu'));
});

test('facetCounts ignore the own facet but respect all other filters', () => {
  const c = facetCounts(classic, { facets: { kategorie: ['wohnhaus'], stil: ['modern'] } });
  assert.equal(c.kategorie.wohnhaus, 1, 'only Villa is a modern Wohnhaus');
  assert.equal(c.kategorie.landwirtschaft, 1, 'Gewächshaus is modern Landwirtschaft');
  assert.equal(c.stil.modern, 1); assert.equal(c.stil.nordisch, 2, 'Blockhütte and Iglu among Wohnhäuser');
});

test('materialOverlap is symmetric and bounded', () => {
  const a = { 'minecraft:stone': 3, 'minecraft:glass': 1 }, b = { 'minecraft:stone': 1, 'minecraft:dirt': 1 };
  assert.equal(materialOverlap(a, a), 1); assert.equal(materialOverlap(a, { 'minecraft:dirt': 5 }), 0);
  assert.equal(materialOverlap(a, b), materialOverlap(b, a)); assert.equal(materialOverlap(a, b), 0.5);
  assert.equal(materialOverlap({}, a), 0);
});

function projectOf(...assetIds) {
  let p = createProject({ name: 'Vorschlagstest', profileId: 'java:registry-unverified' });
  let x = 0;
  for (const id of assetIds) {
    const v = versions.get(assets.find(a => a.id === id).versionIds.at(-1));
    p = applyOperation(p, { kind: 'instance.add', instance: newInstance({ assetVersionId: v.id, name: id, transform: { position: [x, 0, 0], quarterTurns: 0, mirrorX: false } }) }).project;
    x += v.payload.bounds.maxExclusive[0] + 1;
  }
  return p;
}

test('suggestForProject explains every point and is deterministic', () => {
  const p = projectOf('sample_tower', 'sample_wall', 'sample_tower');
  const ctx = projectContext(p, resolveProject(p, versions), versions, assets);
  assert.deepEqual(ctx.used, { sample_tower: 2, sample_wall: 1 });
  assert.equal(ctx.facetWeights.stil.mittelalterlich, 3);
  const list = suggestForProject(entries, ctx);
  assert.deepEqual(list, suggestForProject(entries, ctx));
  for (const s of list) {
    assert.ok(s.score >= 0 && s.score <= 100);
    assert.equal(s.score, Math.max(0, Math.min(100, s.reasons.reduce((n, r) => n + r.points, 0))), `${s.assetId}: Punkte = Summe der Gründe`);
  }
  const tower = list.find(s => s.assetId === 'sample_tower');
  assert.ok(tower.reasons.some(r => r.label === 'Bereits 2× im Projekt' && r.points === -10));
  const gate = list.find(s => s.assetId === 'sample_gate');
  assert.ok(gate.reasons.some(r => r.label.startsWith('Freier Anschluss passt (wall_joint)')), 'free wall joints on the tower');
  assert.ok(gate.reasons.some(r => r.label.startsWith('Stil wie 100 %')));
  const villa = list.find(s => s.assetId === 'bld_villa');
  assert.ok(!villa.reasons.some(r => r.label.startsWith('Stil')), 'modern ≠ mittelalterlich');
  assert.ok(villa.reasons.some(r => r.label === 'Ergänzt eine neue Kategorie'));
  assert.ok(list.findIndex(s => s.assetId === 'sample_gate') < list.findIndex(s => s.assetId === 'bld_villa'));
});

test('suggestForProject: path connectors, profile mismatch and empty projects', () => {
  const p = projectOf('bld_steinbruecke');
  const ctx = projectContext(p, resolveProject(p, versions), versions, assets);
  assert.deepEqual(ctx.openConnectors, [`path_joint|${PATH_PROFILE}`]);
  const steg = suggestForProject(entries, ctx).find(s => s.assetId === 'bld_hafensteg');
  assert.ok(steg.reasons.some(r => r.label === 'Freier Anschluss passt (path_joint)' && r.points === 15));
  // A link that uses up both bridge ends leaves no free path connector.
  const [a] = p.instances;
  const linked = { ...p, links: [{ id: 'l1', a: { instanceId: a.id, connectorId: 'west' }, b: { instanceId: 'x', connectorId: 'y' } }, { id: 'l2', a: { instanceId: a.id, connectorId: 'east' }, b: { instanceId: 'x', connectorId: 'z' } }] };
  assert.deepEqual(projectContext(linked, null, versions, assets).openConnectors, []);
  const other = projectContext({ ...p, profileId: 'java:1.21.4' }, null, versions, assets);
  const s = suggestForProject(entries, other).find(x => x.assetId === 'bld_iglu');
  assert.ok(s.notes.some(n => /weicht vom Projektprofil/.test(n)) && !s.reasons.some(r => r.label === 'Gleiches Versionsprofil'));
  const empty = projectContext(createProject({ name: 'Leer' }), null, versions, assets);
  const e = suggestForProject(entries, empty);
  assert.ok(e.every(x => x.notes.some(n => /noch keine Bauteile/.test(n))));
  assert.ok(e.every(x => !x.reasons.some(r => r.label.startsWith('Materialähnlichkeit'))));
});

test('similarEntries ranks shared materials and facets, never the target itself', () => {
  const sim = similarEntries(entry('bld_fachwerkhaus'), entries, 5);
  assert.ok(sim.length > 0 && sim.length <= 5);
  assert.ok(!sim.some(s => s.entry.asset.id === 'bld_fachwerkhaus'));
  for (let i = 1; i < sim.length; i++) assert.ok(sim[i - 1].score >= sim[i].score);
  assert.ok(sim.some(s => s.entry.facets.kategorie.includes('wohnhaus')));
});

test('catalogue entries of user assets: no facets, missing versions reported', async () => {
  const user = createAsset({ name: 'Eigenes', provenance: { author: 'P', source: 'Datei', license: '' } });
  const r = await addAssetVersion(user, { payload: samples.versions[0].payload, label: '1.0', source: { format: 'voxel-json' } });
  const lonely = createAsset({ name: 'Ohne Version', provenance: { author: '', source: '', license: '' } });
  const withV = { ...lonely, versionIds: ['av_fehlt'] };
  const c = buildCatalog([r.asset, withV], new Map([[r.version.id, r.version]]));
  assert.equal(c.entries.length, 1); assert.deepEqual(c.missing.map(a => a.name), ['Ohne Version']);
  assert.deepEqual(c.entries[0].facets, { kategorie: [], stil: [], biom: [], funktion: [] });
  assert.deepEqual(names(queryCatalog(c.entries, { origin: 'eigene' })), ['Eigenes']);
  const cache = new Map();
  buildCatalog([r.asset], new Map([[r.version.id, r.version]]), cache);
  assert.ok(cache.has(r.version.id));
});

test('block-count scope classes and vanilla filter', async () => {
  const { blockClassOf } = await import('../dist/domain/src/index.js');
  assert.deepEqual([0, 499, 500, 1999, 2000, 9999, 10000, 49999, 50000].map(blockClassOf), ['xs', 'xs', 's', 's', 'm', 'm', 'l', 'l', 'xl']);
  assert.ok(entries.every(e => e.metrics.blockClass === blockClassOf(e.metrics.blocks)));
  assert.equal(queryCatalog(entries, { vanillaOnly: true }).length, entries.length, 'shipped buildings use only minecraft:');
  assert.equal(queryCatalog(entries, { blockClasses: ['xl'] }).length, 0);
  assert.equal(entry('bld_iglu').metrics.dataVersion, undefined, 'no file import ⇒ no DataVersion claimed');
});

test('sort "match" always lists the best match first, whatever the direction flag', () => {
  const scores = new Map([['bld_iglu', 90], ['bld_villa', 10]]);
  for (const descending of [false, true, undefined]) assert.equal(queryCatalog(entries, { sort: 'match', ...(descending !== undefined && { descending }) }, scores)[0].asset.id, 'bld_iglu');
});

// ------------------------------------------------------------------ catalogue extension (families, play stage, ensembles)

/** Version ids of the samples and the 16 original buildings before the extension: content addresses must not move. */
const STABLE_IDS = {
  "sample_tower": "av_10868f41c30db28a998b712b3ff28906",
  "sample_wall": "av_2364aa8e50e630d75286475dcaa02bfd",
  "sample_gate": "av_232e4073dde45df918ee8dd851c7b950",
  "bld_fachwerkhaus": "av_fd29e080b20522ebeb8a4604b1c4404f",
  "bld_blockhuette": "av_6d57766cf83ad16ac7cf6eba289cf6db",
  "bld_wuestenhaus": "av_4334b47f14b9a245ab98f31e63f372b9",
  "bld_leuchtturm": "av_7381dc8ac7a87bbb8f676b108c365c62",
  "bld_dorfbrunnen": "av_1c1f494915b946bab90a0b1f8d95246d",
  "bld_schmiede": "av_76190f1b0adca7269f03fb0bf5c723b5",
  "bld_scheune": "av_d3861f67fd6c645dbe85032c02a0a5eb",
  "bld_marktstand": "av_293f2ab7e7a9bf483a67f9604a40f77d",
  "bld_kapelle": "av_3a477ee1819c80fef039d35857eeb9e5",
  "bld_gewaechshaus": "av_932d26fba4c83a254b03853641b53f78",
  "bld_villa": "av_b7c1fe8edd3b13a277eb1995f2b010e5",
  "bld_iglu": "av_4018067748565430daa8029bf0418229",
  "bld_steinbruecke": "av_593e75b5a07da133e6a451f42195052e",
  "bld_hafensteg": "av_39fe4d3fc8b939fda6439479da1e0d93",
  "bld_wachturm": "av_9fa54ab1f4633842ac2fc3de73398700",
  "bld_baumhaus": "av_4b1086b4da1164c57c7b3feb4c3bacda"
};


test('extension keeps the content addresses of the samples and the 16 original buildings', () => {
  const all = new Map([...samples.versions, ...buildings.versions].map(v => [v.assetId, v.id]));
  for (const [assetId, id] of Object.entries(STABLE_IDS)) assert.equal(all.get(assetId), id, assetId);
});

test('variant families: tags, info, collapsed query and member lists', () => {
  const starter = entries.filter(e => e.family === 'starterhaus');
  assert.equal(starter.length, 8);
  for (const e of starter) {
    assert.ok(e.asset.tags.includes(`${FAMILY_PREFIX}starterhaus`));
    assert.ok(!e.tags.includes(`${FAMILY_PREFIX}starterhaus`), 'family tag is not a plain tag');
  }
  const collapsed = queryCatalog(entries, { collapseFamilies: true });
  assert.equal(collapsed.filter(e => e.family === 'starterhaus').length, 1);
  assert.equal(collapsed.length, entries.length - [...familyMembers(entries).values()].reduce((n, list) => n + list.length - 1, 0));
  const info = buildingInfo('bld_starterhaus_spruce');
  assert.equal(info.family.label, 'Starterhaus');
  assert.equal(info.variants.length, 8);
  assert.ok(info.tips.length > 0);
  assert.equal(buildingInfo('own_asset'), undefined);
  for (const s of BUILDING_SPECS) for (const l of s.inspiration ?? []) assert.match(l.url, /^https:\/\/minecraft\.wiki\/w\//, s.id);
});

test('play stage: explicit rules, latest stage wins, filter and sort', () => {
  assert.equal(stageOf('minecraft:oak_planks'), 'start');
  assert.equal(stageOf('minecraft:obsidian'), 'mitte');
  assert.equal(stageOf('minecraft:purpur_block'), 'spaet');
  assert.equal(entry('bld_leuchtfeuer').metrics.progression.stage, 'spaet');
  for (const e of queryCatalog(entries, { stageMax: 'frueh' })) assert.ok(stageIndex(e.metrics.progression.stage) <= 1, e.asset.id);
  const byStage = queryCatalog(entries, { sort: 'stage' });
  for (let i = 1; i < byStage.length; i++) assert.ok(stageIndex(byStage[i - 1].metrics.progression.stage) <= stageIndex(byStage[i].metrics.progression.stage));
  assert.deepEqual(STAGES, ['start', 'frueh', 'mitte', 'spaet']);
  assert.ok(STAGE_LABEL.spaet);
});

test('ensembles: every member exists, projects resolve without conflicts, min corner lands at "at"', () => {
  const byAsset = latestVersions(assets, versions);
  assert.ok(ENSEMBLES.length >= 9);
  assert.equal(new Set(ENSEMBLES.map(e => e.id)).size, ENSEMBLES.length);
  for (const e of ENSEMBLES) {
    assert.deepEqual(missingMembers(e, byAsset), [], e.id);
    const p = createEnsembleProject(e, byAsset);
    assert.equal(p.instances.length, e.members.length);
    const r = resolveProject(p, versions);
    assert.equal(r.conflicts.length, 0, `${e.id}: keine Überschneidungen`);
    e.members.forEach((mb, i) => {
      const min = r.placed.find(pl => pl.instance.id === p.instances[i].id).payload.bounds.min;
      assert.deepEqual([min[0], min[2]], [...mb.at], `${e.id} ${mb.assetId}`);
    });
  }
  assert.throws(() => createEnsembleProject({ ...ENSEMBLES[0], members: [{ assetId: 'bld_fehlt', at: [0, 0] }] }, byAsset), /fehlen/);
  assert.ok(ensemblesWith('bld_torhaus').some(e => e.id === 'ens_burg'));
});
