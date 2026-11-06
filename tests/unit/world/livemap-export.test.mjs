// MAP-02: gespeicherte Kartenziele, Markerdatei → Weltplan-Punkte, BlueMap-Markerkonfiguration und Dynmap-Befehle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSavedLiveMap, upsertSavedLiveMap, createLiveMapTargetsFile, readLiveMapTargetsFile, mergeSavedLiveMaps, LIVE_MAP_SAVED_MAX,
  mapShapes, markersToPoints, pointMarkers, blueMapMarkerConfig, dynmapMarkerCommands, createLiveMapMarkerFile } from '../../../dist/domain/src/index.js';

const BLUE = { name: 'BlueMap', urlTemplate: 'https://karte.example/#{world}:{x}:{y}:{z}:150:0:0.9:0:0:perspective', worlds: { 'minecraft:overworld': 'world', 'minecraft:the_nether': '' } };
const ow = 'minecraft:overworld';
const items = [
  { kind: 'site', id: 'site_a', name: 'Marktplatz', note: '', dimension: ow, minX: 0, minZ: 0, width: 20, length: 10, y: 70, projectId: null },
  { kind: 'path', id: 'path_a', name: 'Hauptweg "Nord"', note: 'gepflastert', dimension: ow, style: 'strasse', width: 3, points: [[0, 0], [10, 0], [10, 10]] },
  { kind: 'zone', id: 'zone_a', name: 'Farmen <neu>', note: '', dimension: ow, category: 'farm', points: [[0, 0], [5, 0], [5, 5]] },
  { kind: 'point', id: 'point_a', name: 'Portal', note: '', dimension: ow, type: 'portal', x: 5, y: 64, z: -3 },
  { kind: 'point', id: 'point_n', name: 'Festung', note: '', dimension: 'minecraft:the_nether', type: 'ziel', x: 1, y: 40, z: 1 },
];
const map = { dimension: ow, entries: [{ index: 0, projectId: 'p1', name: 'Burg', placement: {}, worldBounds: { min: [100, 60, 200], maxExclusive: [130, 90, 220] }, blocks: 5000, share: 0.4 }] };

test('gespeicherte Karten: prüfen, ersetzen gleichen Namen, Datei hin und zurück', () => {
  const m = checkSavedLiveMap(BLUE);
  assert.deepEqual(m.worlds, { [ow]: 'world' }, 'leere Kartennamen fallen weg');
  assert.throws(() => checkSavedLiveMap({ ...BLUE, urlTemplate: 'https://{world}.example/' }), /festen/);
  assert.throws(() => checkSavedLiveMap({ ...BLUE, extra: 1 }), /unbekannte/);
  let list = upsertSavedLiveMap([], m);
  list = upsertSavedLiveMap(list, { ...m, name: 'Dynmap', urlTemplate: 'https://d.example/?worldname={world}&x={x}&y={y}&z={z}' });
  list = upsertSavedLiveMap(list, { ...m, name: 'bluemap', worlds: { [ow]: 'survival' } });
  assert.equal(list.length, 2); assert.equal(list[0].worlds[ow], 'survival');
  const file = JSON.parse(JSON.stringify(createLiveMapTargetsFile(list)));
  assert.equal(file.format, 'bauplaner-live-maps');
  assert.deepEqual(readLiveMapTargetsFile(file).maps, list);
  assert.throws(() => readLiveMapTargetsFile({ ...file, format: 'x' }), /keine Bauplaner-Kartendatei/);
  const merged = mergeSavedLiveMaps([m], file.maps);
  assert.equal(merged.added, 1); assert.equal(merged.skipped, 1);
  assert.equal(mergeSavedLiveMaps([m], file.maps, true).replaced, 1);
  const many = Array.from({ length: LIVE_MAP_SAVED_MAX }, (_, i) => ({ ...m, name: `K${i}` }));
  assert.throws(() => upsertSavedLiveMap(many, { ...m, name: 'neu' }), /Höchstens/);
});

test('Markerdatei wird zu Weltplan-Punkten, doppelter Import fügt nichts hinzu', () => {
  const file = createLiveMapMarkerFile([
    { id: 'm1', label: 'Dorf', position: { x: 10, y: 70, z: -5, world: 'world', dimension: ow } },
    { id: 'm2', label: 'Portal', position: { x: 5, y: 64, z: -3, world: 'world', dimension: ow } },
    { id: 'm3', label: 'Komisch', position: { x: 1, y: 1, z: 1, world: 'w', dimension: 'Kein Format' } },
  ]);
  const r = markersToPoints(JSON.parse(JSON.stringify(file)), items, 'ziel');
  assert.equal(r.points.length, 1); assert.equal(r.skipped, 2);
  assert.equal(r.points[0].name, 'Dorf'); assert.equal(r.points[0].type, 'ziel'); assert.match(r.points[0].note, /m1/);
  assert.equal(markersToPoints(file, [...items, ...r.points]).points.length, 0);
  assert.throws(() => markersToPoints({ format: 'x' }, items), /Markerdatei|unbekannte/);
  assert.deepEqual(pointMarkers(items, ow, 'world').map(m => m.label), ['Portal']);
});

test('Kartenformen: Projekt, Bauplatz, Weg, Zone, Punkt der Dimension; Gruppenfilter', () => {
  const s = mapShapes(map, items, ow);
  assert.deepEqual(s.map(x => `${x.group}:${x.kind}`), ['projekte:area', 'bauplaetze:area', 'wege:line', 'zonen:area', 'punkte:poi']);
  assert.equal(s[0].minY, 60); assert.equal(s[0].maxY, 90);
  assert.match(s[0].detail, /40 % gebaut/);
  assert.equal(mapShapes(map, items, 'minecraft:the_nether').length, 1, 'Projekte nur für ihre Dimension');
  assert.deepEqual(mapShapes(map, items, ow, { groups: ['wege'] }).map(x => x.id), ['path_a']);
});

test('BlueMap: marker-sets mit extrude, shape, line und poi im Wiki-Format', () => {
  const conf = blueMapMarkerConfig(mapShapes(map, items, ow));
  assert.match(conf, /^marker-sets: \{$/m);
  assert.match(conf, /"bauplaner-projekte": \{\n {4}label: "Bauplaner: Projekte"\n {4}toggleable: true\n {4}default-hidden: false\n {4}sorting: 0\n {4}markers: \{/);
  assert.match(conf, /type: "extrude"[\s\S]*shape: \[ \{ x: 100, z: 200 \}, \{ x: 130, z: 200 \}, \{ x: 130, z: 220 \}, \{ x: 100, z: 220 \} \][\s\S]*shape-min-y: 60\n\s*shape-max-y: 90/);
  assert.match(conf, /type: "shape"[\s\S]*shape-y: 70/);
  assert.match(conf, /type: "line"[\s\S]*line: \[ \{ x: 0\.5, y: 64, z: 0\.5 \}, \{/);
  // HOCON merges `{…} {…}` on one line into one object; BlueMap then rejects the map (real server, KARTE-08).
  assert.doesNotMatch(conf, /\}\s+\{/);
  // Every Bauplaner set is reset first, so a later block below an older one replaces it (HOCON merge, BlueMap 5.29).
  assert.match(conf, /marker-sets: \{\n  "bauplaner-projekte": null\n  "bauplaner-bauplaetze": null\n  "bauplaner-wege": null\n  "bauplaner-zonen": null\n  "bauplaner-punkte": null\n/);
  assert.match(conf, /type: "poi"\n\s*position: \{ x: 5, y: 64, z: -3 \}/);
  assert.match(conf, /line-color: \{ r: \d+, g: \d+, b: \d+, a: 1 \}/);
  assert.match(conf, /label: "Hauptweg \\"Nord\\""/, 'Anführungszeichen JSON-maskiert');
  assert.match(conf, /Farmen &lt;neu&gt;/, 'HTML im Detail maskiert');
  // Balanced braces: the block can be pasted as a whole.
  const body = conf.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/^#.*$/gm, '');
  assert.equal((body.match(/\{/g) ?? []).length, (body.match(/\}/g) ?? []).length);
});

test('Dynmap: Befehle je Set, Ecken, Bereiche, Linien und Punkte für die Konsole', () => {
  const cmds = dynmapMarkerCommands(mapShapes(map, items, ow), 'world').split('\n').filter(l => l && !l.startsWith('#'));
  // All five sets are deleted first, also empty ones, so a removed last point disappears (real server, KARTE-08).
  assert.deepEqual(cmds.slice(0, 5), ['projekte', 'bauplaetze', 'wege', 'zonen', 'punkte'].map(g => `dmarker deleteset id:bauplaner-${g}`));
  assert.equal(cmds[5], 'dmarker addset id:bauplaner-projekte "Bauplaner: Projekte" hide:false');
  const none = dynmapMarkerCommands(mapShapes(map, items.filter(i => i.kind !== 'point'), ow), 'world');
  assert.match(none, /dmarker deleteset id:bauplaner-punkte/);
  assert.doesNotMatch(none, /addset id:bauplaner-punkte/);
  assert.ok(cmds.includes('dmarker addcorner 100 60 200 world'));
  assert.ok(cmds.some(c => /^dmarker addarea id:projekt_p1 "Burg" set:bauplaner-projekte color:F2B84B fillcolor:F2B84B fillopacity:0\.25 weight:2 ybottom:60 ytop:90$/.test(c)));
  assert.ok(cmds.some(c => /^dmarker addline id:path_a "Hauptweg 'Nord'" set:bauplaner-wege color:[0-9A-F]{6} weight:3$/.test(c)));
  assert.ok(cmds.includes('dmarker add id:point_a "Portal" icon:default set:bauplaner-punkte x:5 y:64 z:-3 world:world'));
  assert.ok(cmds.every(c => c.startsWith('dmarker ')));
  assert.throws(() => dynmapMarkerCommands([], 'meine welt'), /Weltnamen/);
});
