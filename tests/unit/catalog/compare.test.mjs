import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyPalette, BUILDING_SPECS, buildCatalog, checkStatus, compareFacts, createBuildingLibrary, createTemplate, checkTemplateRecord, editTemplate, generatorCheck, GENERATORS, groupFacts,
  ENSEMBLES, isGameChecked, modsAvailable, paletteFromPayload, paletteProblems, paletteRolesOf, PLOT_PRESETS, plotPresetOf, profileLabel, queryCatalog, smallestPlot,
  STYLE_PALETTES, survivalEffort, SORT_LABEL,
} from '../../../dist/domain/src/index.js';
import { PRUEFSTAND } from '../../../dist/domain/src/catalog/pruefstand.js';
import { materialSet } from '../../../dist/domain/src/materials/variants.js';
import { decodeLibraryState, encodeLibraryState } from '../../../apps/web/src/views/library/urlState.ts';
import { interiorCutY } from '../../../apps/web/src/thumbnail/views.ts';

const library = await createBuildingLibrary();
const { entries } = buildCatalog(library.assets, new Map(library.versions.map(v => [v.id, v])));
const byId = new Map(entries.map(e => [e.asset.id, e]));

test('Survival-Aufwand: Sammelmenge und Spielphase, Formel offen, 1 bis 5', () => {
  const m = (total, stage) => ({ items: { total }, progression: { stage, reasons: [] } });
  assert.equal(survivalEffort(m(100, 'start')).level, 1);
  assert.equal(survivalEffort(m(299, 'frueh')).level, 1);
  assert.equal(survivalEffort(m(300, 'start')).level, 2);
  assert.equal(survivalEffort(m(6000, 'start')).level, 4);
  assert.equal(survivalEffort(m(100, 'mitte')).level, 2);
  assert.equal(survivalEffort(m(100, 'spaet')).level, 3);
  assert.equal(survivalEffort(m(50000, 'spaet')).level, 5, 'gedeckelt');
  const e = survivalEffort(m(1500, 'mitte'));
  assert.equal(e.level, 4);
  assert.deepEqual(e.factors.map(f => f.points), [2, 1]);
  assert.match(e.formula, /Heuristik/);
  for (const entry of entries) { const l = survivalEffort(entry.metrics).level; assert.ok(l >= 1 && l <= 5); }
  assert.ok(new Set(entries.map(x => survivalEffort(x.metrics).level)).size >= 4, 'die Bibliothek streut über mehrere Stufen');
});

test('Profil, Mods und Grundstücke', () => {
  assert.equal(profileLabel('java-26.3'), 'Java 26.3');
  assert.equal(profileLabel('bedrock-1'), 'bedrock-1');
  assert.equal(modsAvailable({ modNamespaces: [] }, []), true);
  assert.equal(modsAvailable({ modNamespaces: ['create'] }, []), false);
  assert.equal(modsAvailable({ modNamespaces: ['create'] }, ['create', 'x']), true);
  assert.equal(smallestPlot({ size: [5, 9, 7] }).id, '8');
  assert.equal(smallestPlot({ size: [20, 9, 9] }).id, '24', 'drehbar: lange Seite gegen lange Seite');
  assert.equal(smallestPlot({ size: [65, 3, 2] }), undefined);
  assert.equal(plotPresetOf({ width: 16, depth: 16, allowRotation: true }).id, '16');
  assert.equal(plotPresetOf({ width: 16, depth: 16, height: 10, allowRotation: true }), undefined);
  // Grundstück-Schnellwahl filtert wie der Bauplatz: alles, was auf 16 × 16 passt, auch auf 32 × 32.
  const n = id => queryCatalog(entries, { plot: PLOT_PRESETS.find(p => p.id === id).plot }).length;
  assert.ok(n('8') < n('16') && n('16') <= n('32') && n('32') <= n('64'));
  for (const e of queryCatalog(entries, { plot: PLOT_PRESETS[1].plot })) assert.ok(Math.max(e.metrics.size[0], e.metrics.size[2]) <= 16);
});

test('Prüfstand: jedes mitgelieferte Gebäude und jeder Generator ist im festgehaltenen Lauf, Abgleich über den Inhalts-Hash', () => {
  assert.equal(PRUEFSTAND.format, 'bauplaner/pruefstand-v1');
  assert.match(PRUEFSTAND.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
  for (const s of BUILDING_SPECS) assert.ok(PRUEFSTAND.buildings[s.id], `${s.id} im Prüfstand`);
  for (const g of GENERATORS) { const c = generatorCheck(g.id); assert.ok(c && c.cases >= 5, g.id); }
  for (const s of BUILDING_SPECS) {
    const st = checkStatus(byId.get(s.id));
    assert.ok(['spiel', 'hinweis', 'neu'].includes(st.state), `${s.id}: ${st.state}`);
  }
  const e = byId.get(BUILDING_SPECS[0].id);
  const record = { ...PRUEFSTAND, buildings: { [e.asset.id]: [e.version.payloadHash.slice(0, 16), 'ok'] } };
  assert.equal(checkStatus(e, record).state, 'spiel');
  assert.equal(checkStatus({ asset: e.asset, version: { payloadHash: 'f'.repeat(64) } }, record).state, 'neu', 'geänderter Inhalt wird nicht als geprüft gezeigt');
  assert.equal(checkStatus({ asset: { id: 'eigen' }, version: e.version }, record).state, 'spiel', 'gleicher Inhalt unter anderer Id gilt');
  assert.equal(checkStatus({ asset: { id: 'eigen' }, version: { payloadHash: '0'.repeat(64) } }, record).state, 'offen');
  assert.equal(checkStatus(e, { ...record, buildings: { [e.asset.id]: [e.version.payloadHash.slice(0, 16), 'abweichung'] } }).state, 'abweichung');
  assert.equal(isGameChecked(checkStatus(e, record)), true);
});

test('Katalogabfrage: Aufwand, Mods, Profil, nur geprüft, Sortierung nach Aufwand', () => {
  const low = queryCatalog(entries, { effortMax: 2 });
  assert.ok(low.length > 0 && low.length < entries.length);
  for (const e of low) assert.ok(survivalEffort(e.metrics).level <= 2);
  assert.equal(queryCatalog(entries, { mods: [] }).length, entries.length, 'mitgelieferte Bauten brauchen keine Mods');
  assert.equal(queryCatalog(entries, { profiles: ['java-26.3'] }).length, entries.length);
  assert.equal(queryCatalog(entries, { profiles: ['java-1.0'] }).length, 0);
  const checked = queryCatalog(entries, { gameChecked: true });
  for (const e of checked) assert.ok(isGameChecked(checkStatus(e)));
  assert.ok(SORT_LABEL.effort);
  const sorted = queryCatalog(entries, { sort: 'effort' });
  for (let i = 1; i < sorted.length; i++) assert.ok(survivalEffort(sorted[i - 1].metrics).level <= survivalEffort(sorted[i].metrics).level);
});

test('Kartenwerte: jede Karte hat Grundfläche, Höhe, Material, Aufwand, Profil und Prüfstand', () => {
  for (const e of entries.slice(0, 40)) {
    const f = compareFacts(e);
    assert.match(f.footprint, /^\d+ × \d+$/);
    assert.match(f.height, /^\d+ hoch$/);
    assert.match(f.material, /Items/);
    assert.equal(f.profile, 'Java 26.3');
    assert.ok(f.check.label && f.check.detail);
  }
});

test('Ensembles: Rechteck aus Lage und gedrehter Größe, Summen, Prüfstand-Anteil', () => {
  for (const ens of ENSEMBLES) {
    const f = groupFacts(ens.members, id => byId.get(id));
    assert.ok(f, ens.id);
    assert.equal(f.members, ens.members.length);
    assert.equal(f.items, ens.members.reduce((n, m) => n + byId.get(m.assetId).metrics.items.total, 0));
    for (const m of ens.members) assert.ok(f.size[1] >= byId.get(m.assetId).metrics.size[1]);
  }
  const a = entries.find(e => e.metrics.size[0] !== e.metrics.size[2]);
  const [w, , d] = a.metrics.size;
  assert.deepEqual(groupFacts([{ assetId: a.asset.id, at: [0, 0], turns: 1 }], id => byId.get(id)).size, [d, a.metrics.size[1], w]);
  assert.equal(groupFacts([{ assetId: 'fehlt', at: [0, 0] }], id => byId.get(id)), undefined);
});

test('URL hält die neuen Filter, unbekannte Werte fallen weg', () => {
  const s = { query: '', filters: { effortMax: 3, mods: ['create'], profiles: ['java-26.3'], gameChecked: true, plot: { width: 16, depth: 16, allowRotation: true } },
    descending: false, collapse: true, layout: 'raster', onlyFavorites: false };
  const enc = encodeLibraryState(s, []);
  assert.match(enc, /aufwand=3/); assert.match(enc, /geprueft=1/); assert.match(enc, /mods=create/);
  const dec = decodeLibraryState(enc, [], { sorts: Object.keys(SORT_LABEL), stages: [] });
  assert.deepEqual(dec.filters, s.filters);
  assert.equal(decodeLibraryState('aufwand=9', [], { sorts: [], stages: [] }).filters.effortMax, undefined);
});

test('Innenansicht: Schnitt in Augenhöhe über dem untersten durchgehenden Boden', () => {
  const blocks = [];
  for (let x = 0; x < 6; x++) for (let z = 0; z < 6; z++) blocks.push({ x, y: 3, z }); // Boden auf y = 3
  for (let y = 4; y < 10; y++) for (let x = 0; x < 6; x++) { blocks.push({ x, y, z: 0 }); blocks.push({ x, y, z: 5 }); }
  assert.equal(interiorCutY(blocks), 5);
  assert.equal(interiorCutY([{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }]), undefined, 'zu flach');
  assert.equal(interiorCutY([]), undefined);
  // Ein schlanker Turm hat in jeder Schicht dieselben Spalten: Schnitt über dem Fuß.
  const tower = []; for (let y = 0; y < 12; y++) tower.push({ x: 0, y, z: 0 });
  assert.equal(interiorCutY(tower), 2);
});

test('Baustil-Paletten: mitgelieferte gültig, Rollen nach Häufigkeit, Tausch exakt, eigene Palette als Vorlage', () => {
  assert.ok(STYLE_PALETTES.length >= 8);
  for (const p of STYLE_PALETTES) assert.deepEqual(paletteProblems(p.roles), [], p.id);
  assert.ok(paletteProblems({ holz_haupt: 'stone_bricks' }).length, 'Stein ist kein Holz');
  assert.ok(paletteProblems({ quatsch: 'oak' }).length);
  assert.ok(paletteProblems({}).length);

  const e = entries.find(x => paletteRolesOf(x.version.payload).some(a => a.role === 'holz_haupt') && paletteRolesOf(x.version.payload).some(a => a.role === 'stein_haupt'));
  const roles = paletteRolesOf(e.version.payload);
  const wood = roles.find(a => a.role === 'holz_haupt');
  const target = wood.use.set.id === 'cherry' ? 'spruce' : 'cherry';
  const r = applyPalette(e.version.payload, { holz_haupt: target });
  assert.ok(r && r.replaced > 0);
  assert.equal(r.payload.cells.length, e.version.payload.cells.length, 'gleiche Zellen');
  const before = e.version.payload, after = r.payload;
  for (let i = 0; i < before.cells.length; i++) {
    const a = before.palette[before.cells[i].paletteIndex], b = after.palette[after.cells[i].paletteIndex];
    assert.deepEqual(b.properties, a.properties, 'Ausrichtung und Form bleiben');
  }
  assert.ok(after.palette.some(s => s.id.includes(materialSet(target).forms.planks ?? target)));
  // Die eigene Palette eines Gebäudes ändert es nicht.
  assert.equal(applyPalette(e.version.payload, paletteFromPayload(e.version.payload)), null);

  const t = createTemplate({ name: 'Meine Siedlung', body: { kind: 'palette', roles: { holz_haupt: 'spruce', stein_haupt: 'deepslate_bricks' } } });
  assert.equal(checkTemplateRecord(JSON.parse(JSON.stringify(t))).body.kind, 'palette', 'übersteht Speicher und Sicherung');
  const t2 = editTemplate(t, { body: { kind: 'palette', roles: { holz_haupt: 'oak' } } });
  assert.equal(t2.number, 2); assert.equal(t2.history.length, 1);
  assert.throws(() => createTemplate({ name: 'Kaputt', body: { kind: 'palette', roles: { holz_haupt: 'nicht_da' } } }), /Baustil-Palette/);
});
