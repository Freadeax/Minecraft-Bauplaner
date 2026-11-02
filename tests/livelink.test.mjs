import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readLiveHello, liveCan, readLivePairing, readLiveStatus, readLiveChunks, classifyRuns, chunkColumns, wantedChunks, chunkQuery, liveSurvey, compareHologram, hologramProject,
  liveShare, playerBlock, originFromPlayer, planUploadQuery, marksBody, liveBaseUrl, originAllowed, columnAt, encodeSurvey, decodeSurvey, createPlacement,
  LIVE_PROTOCOL, SURVEY_UNKNOWN, marksForMod, readLivePlayers,
} from '../dist/domain/src/index.js';

const hello = { app: 'bauplaner-mod', protocol: LIVE_PROTOCOL, mod: { version: '0.5.0', loader: 'fabric', minecraft: '26.3' }, pairing: true };
const hologram = {
  planFile: 'turm-rev2.schem', name: 'Turm · Revision 2', projectId: 'p_turm', revisionNumber: 2,
  placement: { dimension: 'minecraft:overworld', x: 100, y: 64, z: -20, turns: 0, mirror: false }, visible: true,
  box: [100, 64, -20, 104, 70, -16], counts: { ok: 60, state: 5, missing: 20, wrong: 5, unknown: 10 }, total: 100,
};
const status = { time: '2026-11-02T10:00:00Z', player: { x: 101.7, y: 64, z: -18.2, yaw: 180, pitch: 10, dimension: 'minecraft:overworld', name: 'Philipp' },
  world: { key: 'server.lmnt-gaming.net', server: 'server.lmnt-gaming.net', singleplayer: false }, hologram, marks: 3 };

test('Begrüßung, Kopplung und Status werden streng gelesen', () => {
  assert.deepEqual(readLiveHello(hello), { ...hello, features: [] }, 'ältere Mod ohne Fähigkeitenliste');
  const withScan = readLiveHello({ ...hello, features: ['scan', 'BÖSE', 42] });
  assert.deepEqual(withScan.features, ['scan']);
  assert.equal(liveCan(withScan, 'scan'), true);
  assert.equal(liveCan(readLiveHello(hello), 'scan'), false);
  assert.throws(() => readLiveHello({ ...hello, app: 'etwas' }), /keine Bauplaner-Mod/);
  assert.throws(() => readLiveHello({ ...hello, protocol: 3 }), /Protokoll 3/);
  assert.equal(readLivePairing({ token: 'a'.repeat(32) }), 'a'.repeat(32));
  assert.throws(() => readLivePairing({ token: 'kurz' }), /Schlüssel/);
  const s = readLiveStatus(status);
  assert.deepEqual(s.hologram, { ...hologram, section: 0, sections: [] }, 'ältere Mods ohne Abschnitte');
  // Mod 0.7.0: build sections with progress and the active one.
  const sections = [{ name: 'Fundament', ok: 40, total: 40 }, { name: 'Erdgeschoss', ok: 20, total: 60 }];
  assert.deepEqual(readLiveStatus({ ...status, hologram: { ...hologram, section: 2, sections } }).hologram.sections, sections);
  assert.equal(readLiveStatus({ ...status, hologram: { ...hologram, section: 2, sections } }).hologram.section, 2);
  assert.throws(() => readLiveStatus({ ...status, hologram: { ...hologram, section: 300 } }), /Abschnitt/);
  assert.throws(() => readLiveStatus({ ...status, hologram: { ...hologram, sections: [{ name: 'x', ok: -1, total: 1 }] } }), /Abschnitt 1 richtig/);
  assert.equal(s.player.name, 'Philipp');
  assert.equal(readLiveStatus({ time: 'x', player: null, world: null, hologram: null }).player, null);
  assert.throws(() => readLiveStatus({ ...status, player: { ...status.player, x: Number.NaN } }), /X/);
  assert.throws(() => readLiveStatus({ ...status, player: { ...status.player, dimension: '../x' } }), /Dimension/);
  assert.throws(() => readLiveStatus({ ...status, hologram: { ...hologram, box: [1, 2, 3] } }), /Hologrammbox/);
  assert.throws(() => readLiveStatus({ ...status, hologram: { ...hologram, placement: { ...hologram.placement, turns: 4 } } }), /Drehung/);
  assert.throws(() => readLiveStatus({ ...status, hologram: { ...hologram, counts: { ...hologram.counts, ok: -1 } } }), /Zählung/);
});

test('Spalten: Oberfläche und Boden nach derselben Regel wie die Geländeaufnahme', () => {
  const ids = ['minecraft:short_grass', 'minecraft:oak_leaves', 'minecraft:oak_log', 'minecraft:grass_block', 'minecraft:water', 'minecraft:sand'];
  // Grass plant, leaves, trunk, then ground.
  assert.deepEqual(classifyRuns([80, 0, 79, 1, 75, 2, 70, 3], ids), { surface: 79, surfaceId: 'minecraft:oak_leaves', ground: 70, groundId: 'minecraft:grass_block' });
  // Water over sand: surface is water, ground is sand.
  assert.deepEqual(classifyRuns([62, 4, 58, 5], ids), { surface: 62, surfaceId: 'minecraft:water', ground: 58, groundId: 'minecraft:sand' });
  // Only plants: unknown.
  assert.equal(classifyRuns([70, 0], ids), null);
  // No ground within the runs: ground falls back to the surface.
  assert.deepEqual(classifyRuns([90, 1], ids), { surface: 90, surfaceId: 'minecraft:oak_leaves', ground: 90, groundId: 'minecraft:oak_leaves' });
});

const chunkOf = (cx, cz, f) => ({ x: cx, z: cz, columns: Array.from({ length: 256 }, (_, i) => f(cx * 16 + (i & 15), cz * 16 + (i >> 4))) });

test('Chunks lesen, auswählen und zu einer Geländeaufnahme zusammensetzen', () => {
  const raw = { dimension: 'minecraft:overworld', ids: ['minecraft:grass_block', 'minecraft:stone'],
    chunks: [chunkOf(0, 0, (x, z) => [64 + (x % 3), 0]), chunkOf(-1, 0, (x) => x === -1 ? [] : [70, 1])], missing: [[5, 5]] };
  const read = readLiveChunks(raw);
  assert.equal(read.chunks.length, 2);
  assert.deepEqual(read.missing, [[5, 5]]);
  assert.throws(() => readLiveChunks({ ...raw, chunks: [{ x: 0, z: 0, columns: [] }] }), /256/);
  assert.throws(() => readLiveChunks({ ...raw, chunks: [chunkOf(0, 0, () => [64, 7])] }), /Blockindex/);
  assert.throws(() => readLiveChunks({ ...raw, chunks: [chunkOf(0, 0, () => [64])] }), /Spalte/);
  assert.throws(() => readLiveChunks({ ...raw, ids: ['Gras'] }), /Block-ID/);
  const cols = chunkColumns(read, 1000);
  const cache = new Map(cols.map(c => [`${c.x},${c.z}`, c]));
  // Area across both chunks plus one unknown chunk row.
  const survey = liveSurvey({ minX: -4, minZ: 14, width: 8, length: 4 }, 'minecraft:overworld', (cx, cz) => cache.get(`${cx},${cz}`), '2026-11-02T10:00:00Z');
  assert.deepEqual(columnAt(survey, 2, 15), { surface: 66, surfaceId: 'minecraft:grass_block', ground: 66, groundId: 'minecraft:grass_block', fluid: false });
  assert.equal(columnAt(survey, -3, 15).ground, 70);
  assert.equal(columnAt(survey, -1, 15), null, 'column without runs stays unknown');
  assert.equal(columnAt(survey, 2, 16), null, 'chunk 0,1 was never delivered');
  assert.equal(survey.surface[0 + 2 * 8], SURVEY_UNKNOWN);
  // The live survey is a normal stored survey.
  assert.deepEqual(decodeSurvey(encodeSurvey(survey)).ground, survey.ground);
  // Chunk choice: nearest first, fresh ones skipped, stale ones re-read.
  const known = new Map([['0,0', 900], ['1,0', 0]]);
  const wanted = wantedChunks(8, 8, 1, known, 1000, 500);
  assert.deepEqual(wanted[0], [-1, 0]);
  assert.ok(!wanted.some(c => c[0] === 0 && c[1] === 0), 'fresh chunk skipped');
  assert.ok(wanted.some(c => c[0] === 1 && c[1] === 0), 'stale chunk re-read');
  assert.equal(wantedChunks(0, 0, 20, new Map(), 0, 1).length, 64);
  assert.equal(chunkQuery([[1, -2], [3, 4]]), '1,-2;3,4');
});

test('Hologramm ↔ Projekt, Fortschritt, Spieler', () => {
  const project = { id: 'p_turm', world: createPlacement([100, 64, -20]) };
  assert.equal(hologramProject(hologram, [{ id: 'x' }, project]), project);
  assert.equal(hologramProject({ ...hologram, projectId: null }, [project]), null);
  assert.equal(compareHologram(hologram, project), 'same');
  assert.equal(compareHologram({ ...hologram, placement: { ...hologram.placement, x: 101 } }, project), 'moved');
  assert.equal(compareHologram({ ...hologram, placement: { ...hologram.placement, turns: 1 } }, project), 'turned');
  assert.equal(compareHologram({ ...hologram, placement: { ...hologram.placement, dimension: 'minecraft:the_nether' } }, project), 'dimension');
  assert.equal(compareHologram(hologram, { world: undefined }), 'unplaced');
  assert.deepEqual(liveShare(hologram), { done: 60, known: 90, share: 60 / 90 });
  assert.deepEqual(liveShare({ counts: { ok: 0, state: 0, missing: 0, wrong: 0, unknown: 5 }, total: 5 }).share, 0);
  assert.deepEqual(playerBlock(status.player), { x: 101, y: 64, z: -19, facing: 'Norden' });
  assert.equal(playerBlock({ ...status.player, yaw: -90 }).facing, 'Osten');
  assert.equal(playerBlock({ ...status.player, yaw: 0 }).facing, 'Süden');
  assert.equal(playerBlock({ ...status.player, yaw: 450 }).facing, 'Westen');
  assert.deepEqual(originFromPlayer(status.player), [101, 64, -19]);
});

test('Übergabe: Planabfrage, Markierungen, Adresse, Ursprünge', () => {
  const q = new URLSearchParams(planUploadQuery('turm-rev2.schem', hologram.placement));
  assert.equal(q.get('x'), '100'); assert.equal(q.get('mirror'), 'false'); assert.equal(q.get('dimension'), 'minecraft:overworld');
  assert.throws(() => planUploadQuery('../böse.schem', hologram.placement), /Dateiname/);
  assert.throws(() => planUploadQuery('a.txt', hologram.placement), /Dateiname/);
  const items = [{ kind: 'point', id: 'a', name: 'A', note: '', dimension: 'minecraft:overworld', type: 'anker', x: 0, y: 64, z: 0 },
    { kind: 'point', id: 'b', name: 'B', note: '', dimension: 'minecraft:the_nether', type: 'portal', x: 0, y: 64, z: 0 }];
  assert.deepEqual(marksBody('minecraft:overworld', items).items.map(i => i.id), ['a']);
  assert.throws(() => marksBody('minecraft:overworld', Array.from({ length: 501 }, (_, i) => ({ ...items[0], id: `p${i}` }))), /höchstens 500/);
  // MAP-06: a mod without `marks2` gets only what it understands (sites, paths, old point types, no layer/colour).
  const v2 = [{ ...items[0], layer: 'Nord', color: '#112233' }, { ...items[0], id: 'n', type: 'notiz' },
    { kind: 'zone', id: 'z', name: 'Z', note: '', dimension: 'minecraft:overworld', category: 'farm', points: [[0, 0], [5, 0], [5, 5]] }];
  const old = marksForMod(v2, { app: 'bauplaner-mod', protocol: 1, mod: { version: '0.7.2', loader: 'fabric', minecraft: '26.3' }, pairing: false, features: ['scan'] });
  assert.deepEqual(old.items, [items[0]]); assert.equal(old.skipped, 2); assert.deepEqual(old.skippedKinds, ['Punkte „Notiz“', 'Zonen']);
  const neu = marksForMod(v2, { app: 'bauplaner-mod', protocol: 2, mod: { version: '0.8.0', loader: 'fabric', minecraft: '26.3' }, pairing: false, features: ['scan', 'marks2'] });
  assert.equal(neu.items.length, 3); assert.equal(neu.skipped, 0);
  assert.equal(readLiveHello({ app: 'bauplaner-mod', protocol: 2, mod: { version: '0.8.0', loader: 'fabric', minecraft: '26.3' }, features: ['marks2', 'players'] }).protocol, 2);
  assert.throws(() => readLiveHello({ app: 'bauplaner-mod', protocol: 3, mod: { version: '1', loader: 'f', minecraft: '1' } }), /spricht 1 und 2/);
  const pl = readLivePlayers({ dimension: 'minecraft:overworld', players: [{ name: 'Anna', x: 1.5, y: 64, z: -2.5 }] });
  assert.equal(pl.players[0].yaw, 0); assert.equal(pl.players[0].name, 'Anna');
  assert.throws(() => readLivePlayers({ dimension: 'minecraft:overworld', players: [{ name: 'A', x: 'x', y: 0, z: 0 }] }), /X ungültig/);
  assert.equal(liveBaseUrl(47615), 'http://127.0.0.1:47615');
  assert.throws(() => liveBaseUrl(80), /Port/);
  assert.ok(originAllowed('https://freadeax.github.io'));
  assert.ok(originAllowed('http://127.0.0.1:4173'));
  assert.ok(originAllowed('http://localhost:5173'));
  assert.ok(!originAllowed('https://freadeax.github.io.evil.example'));
  assert.ok(!originAllowed('http://localhost.evil.example'));
  assert.ok(!originAllowed('null'));
});
