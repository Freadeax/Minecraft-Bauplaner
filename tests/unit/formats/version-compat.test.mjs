// COMPAT-01: Kompatibilitätscheck gegen ältere Minecraft-Versionen, Loader und Einfügewerkzeug.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  checkCompatibility, paletteCounts, parseGameSetup, dataVersionOf, GAME_VERSIONS, DEFAULT_GAME_SETUP, COMPAT_VERSIONS, COMPAT_BASE_VERSION,
  BLOCK_FACTS_VERSION, BLOCK_FACTS_DATA_VERSION, BLOCK_FACTS_REPORT_SHA256, factBlockIds,
} from '../../../dist/voxel/src/index.js';
import { KNOWN_DATA_VERSIONS } from '../../../dist/application/src/index.js';
import { modForGame } from '../../../apps/web/src/views/mod/releases.ts';

const mc = (id, properties = {}) => ({ id: `minecraft:${id}`, properties });
const setup = (version, loader = 'fabric', tool = 'litematica') => ({ version, loader, tool });

test('Versionsdaten: an den Blockbericht des Profils gebunden, neueste zuerst, echte DataVersions', () => {
  assert.equal(COMPAT_BASE_VERSION, BLOCK_FACTS_VERSION);
  assert.match(readFileSync('packages/voxel/src/versionCompatData.ts', 'utf8'), new RegExp(BLOCK_FACTS_REPORT_SHA256));
  assert.deepEqual(GAME_VERSIONS[0], { version: BLOCK_FACTS_VERSION, dataVersion: BLOCK_FACTS_DATA_VERSION });
  for (let i = 1; i < GAME_VERSIONS.length; i++) assert.ok(GAME_VERSIONS[i - 1].dataVersion > GAME_VERSIONS[i].dataVersion, 'neueste zuerst');
  // Bekannte Werte aus den Server-Jars (world_version).
  assert.equal(dataVersionOf('1.20.1'), 3465);
  assert.equal(dataVersionOf('1.21.1'), 3955);
  assert.equal(dataVersionOf('1.21.4'), 4189);
  assert.equal(KNOWN_DATA_VERSIONS.at(-1).version, BLOCK_FACTS_VERSION, 'Auswahlhilfe reicht bis zum Profil');
  const known = new Set(factBlockIds().map(id => id.replace(/^minecraft:/, '')));
  for (const v of COMPAT_VERSIONS) {
    assert.match(v.serverSha1, /^[0-9a-f]{40}$/);
    for (const id of v.missing.split('\n').filter(Boolean)) assert.ok(known.has(id), `${v.version}: ${id} gehört zum Profil`);
  }
  // Ältere Versionen haben nie weniger fehlende Blöcke als neuere.
  const miss = COMPAT_VERSIONS.map(v => v.missing.split('\n').filter(Boolean).length);
  for (let i = 1; i < miss.length; i++) assert.ok(miss[i] >= miss[i - 1], `${COMPAT_VERSIONS[i].version} fehlt mindestens so viel wie ${COMPAT_VERSIONS[i - 1].version}`);
});

test('Profilversion: Vanilla-Plan passt ohne Verlust', () => {
  const r = checkCompatibility({ palette: [mc('stone'), mc('oak_planks')], counts: [10, 5] }, setup(BLOCK_FACTS_VERSION));
  assert.equal(r.level, 'ok');
  assert.equal(r.missingCells, 0);
  assert.match(r.headline, /passt, nichts geht verloren/);
});

test('Ältere Version: fehlende Blöcke mit Zellenzahl, angepasste Zustände, unbenutzte Palette zählt nicht', () => {
  const missing = COMPAT_VERSIONS.find(v => v.version === '1.21.1').missing.split('\n')[0];
  const palette = [mc('stone'), mc(missing), mc('note_block', { instrument: 'harp', note: '0', powered: 'false' }), mc('creaking_heart', { axis: 'y' })];
  const r = checkCompatibility({ palette, counts: [100, 7, 3, 0] }, setup('1.21.1'));
  assert.equal(r.level, 'loss');
  assert.equal(r.missingCells, 7);
  const m = r.issues.find(i => i.kind === 'missing-block');
  assert.deepEqual(m.ids, [missing]);
  assert.match(m.message, /in 1\.21\.1 noch nicht \(7 Blöcke\)/);
  assert.match(r.headline, /Minecraft 1\.21\.1 · Fabric · Litematica: 7 Blöcke fehlen/);
  assert.equal(r.dataVersion, 3955);
  assert.ok(!r.issues.some(i => i.ids?.includes('creaking_heart')), 'nicht benutzter Palettenplatz bleibt außen vor');
});

test('Eigenschaften: ungültiger Wert in der Zielversion wird als Anpassung gemeldet', () => {
  // 1.20.1 kennt keine Kopf-Eigenschaft „powered“.
  const r = checkCompatibility({ palette: [mc('creeper_head', { rotation: '0', powered: 'false' })], counts: [2] }, setup('1.20.1'));
  const c = r.issues.find(i => i.kind === 'changed-state');
  assert.ok(c, JSON.stringify(r.issues));
  assert.equal(r.changedCells, 2);
  assert.equal(r.level, 'warn');
});

test('Mods, Loader und Werkzeug', () => {
  const palette = [mc('stone'), { id: 'create:cogwheel', properties: {} }];
  const fabric = checkCompatibility({ palette, counts: [1, 4] }, setup(BLOCK_FACTS_VERSION, 'fabric', 'litematica'));
  assert.deepEqual(fabric.mods, ['create']);
  assert.equal(fabric.issues.find(i => i.kind === 'mod-block').severity, 'warn');
  const paper = checkCompatibility({ palette, counts: [1, 4] }, setup(BLOCK_FACTS_VERSION, 'paper', 'worldedit'));
  assert.equal(paper.level, 'loss', 'Mod-Blöcke gibt es auf Paper nicht');
  assert.equal(paper.format, 'schem');
  const vanilla = checkCompatibility({ palette: [mc('stone')] }, setup(BLOCK_FACTS_VERSION, 'vanilla', 'litematica'));
  assert.equal(vanilla.level, 'loss');
  const neo = checkCompatibility({ palette: [mc('stone')] }, setup(BLOCK_FACTS_VERSION, 'neoforge', 'litematica'));
  assert.equal(neo.level, 'warn');
  assert.match(neo.issues.find(i => i.kind === 'tool').message, /offiziell nur für Fabric/);
  const ents = checkCompatibility({ palette: [mc('stone')], entities: 2 }, setup(BLOCK_FACTS_VERSION, 'paper', 'worldedit'));
  assert.match(ents.issues.find(i => i.kind === 'entities').message, /\/\/paste -e/);
});

test('Gespeicherte Auswahl und Palettenzählung', () => {
  assert.deepEqual(parseGameSetup(null), DEFAULT_GAME_SETUP);
  assert.deepEqual(parseGameSetup({ version: '1.21.1', loader: 'neoforge', tool: 'litematica' }), { version: '1.21.1', loader: 'neoforge', tool: 'litematica' });
  assert.deepEqual(parseGameSetup({ version: '9.9', loader: 'quilt', tool: 'axiom' }), DEFAULT_GAME_SETUP);
  assert.deepEqual(paletteCounts([{ kind: 'block', paletteIndex: 0 }, { kind: 'air', paletteIndex: 1 }, { kind: 'erase' }, { kind: 'block', paletteIndex: 0 }], 2), [2, 1]);
});

test('Mod-Datei für das eigene Spiel', () => {
  const releases = JSON.parse(readFileSync('apps/web/src/views/mod/releases.json', 'utf8')).releases;
  const fabric = modForGame(releases, { version: '26.3', loader: 'fabric' });
  assert.equal(fabric.level, 'ok');
  assert.equal(fabric.build.loader, 'fabric');
  const old = modForGame(releases, { version: '1.21.1', loader: 'neoforge' });
  assert.equal(old.level, 'loss');
  assert.match(old.issues[0].message, /26\.3/);
  const paper = modForGame(releases, { version: '1.21.4', loader: 'paper' });
  assert.equal(paper.level, 'ok', 'Paper-Plugin läuft auf 1.21.4');
  assert.equal(modForGame(releases, { version: '26.3', loader: 'vanilla' }).level, 'loss');
});
