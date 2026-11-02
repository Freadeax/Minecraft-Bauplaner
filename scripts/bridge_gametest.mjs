// Real-game check of the bridge (GAME-02, GAME-04). Used by scripts/test_bridge_ingame.sh around the
// Fabric client game test in mods/bauplaner-bridge/fabric-26.3/src/gametest and by scripts/test_bridge_paper.sh
// around a real Paper server:
//   prepare <dir>  website exports a plan; writes plan.schem plus setblocks.txt (plan cells relative to the
//                  origin, one block wrong and one missing; only the test harness places blocks)
//   verify <dir>   reads the scan.schem the mod recorded in the running game and compares it like the
//                  website's "Spielaufnahme importieren" does
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { readWorldScan } from '../dist/formats/src/index.js';
import { exportRevisionSchem } from '../dist/application/src/index.js';
import { applyOperation, buildGuide, checkScan, createProject, createSampleLibrary, freezeRevision, newInstance, resolveProject, scanTarget } from '../dist/domain/src/index.js';

const [mode, dir] = process.argv.slice(2);
if (!['prepare', 'verify'].includes(mode) || !dir) throw new Error('usage: bridge_gametest.mjs prepare|verify <dir>');
/** DataVersion of Minecraft 26.3 (version.json world_version of the client jar). */
const DATA_VERSION = 5023;

const lib = await createSampleLibrary();
const versions = new Map(lib.versions.map(v => [v.id, v]));
const latest = id => lib.versions.find(v => v.assetId === id).id;
const at = (id, name, position) => newInstance({ assetVersionId: latest(id), name, transform: { position, quarterTurns: 0, mirrorX: false } });
// Deterministic project: same ids are not needed, the scan names its revision and plan hash.
const base = applyOperation(createProject({ name: 'Spieltest Brücke' }), { kind: 'batch', label: 't', operations: [
  at('sample_tower', 'Turm West', [0, 0, 0]), at('sample_wall', 'Mauer', [4, 0, 1]),
].map(instance => ({ kind: 'instance.add', instance })) }).project;

const stateString = s => s.id + (Object.keys(s.properties).length ? `[${Object.entries(s.properties).sort(([a], [b]) => a < b ? -1 : 1).map(([k, v]) => `${k}=${v}`).join(',')}]` : '');

if (mode === 'prepare') {
  const { project, revision } = freezeRevision(base, 'Spieltest');
  const plan = await exportRevisionSchem(project, revision.id, versions, { dataVersion: DATA_VERSION, anchor: 'min-corner', unselected: 'air' });
  const resolution = resolveProject({ ...project, instances: revision.instances }, versions);
  const blocks = resolution.world.cells.filter(c => c.kind === 'block');
  const wrong = blocks[0], missing = blocks[blocks.length - 1];
  const commands = [];
  for (const cell of blocks) {
    if (cell === missing) continue;
    const state = cell === wrong ? 'minecraft:diamond_block' : stateString(resolution.world.palette[cell.paletteIndex]);
    commands.push(`${cell.position.join(' ')} ${state}`);
  }
  writeFileSync(join(dir, 'plan.schem'), plan.bytes);
  writeFileSync(join(dir, 'setblocks.txt'), commands.join('\n') + '\n');
  writeFileSync(join(dir, 'state.json'), JSON.stringify({ project, revisionId: revision.id, planSha256: plan.sha256, wrong: wrong.position, missing: missing.position, missingState: stateString(resolution.world.palette[missing.paletteIndex]) }));
  console.log(`Spieltest vorbereitet: ${blocks.length} Blöcke, Abweichungen bei ${wrong.position.join('/')} (Diamant) und ${missing.position.join('/')} (fehlt).`);
} else {
  const expected = JSON.parse(readFileSync(join(dir, 'state.json'), 'utf8'));
  const project = expected.project;
  const revision = project.revisions.find(r => r.id === expected.revisionId);
  const resolution = resolveProject({ ...project, instances: revision.instances }, versions);
  const guide = buildGuide(project, resolution);
  const bytes = readFileSync(join(dir, 'scan.schem'));
  const scan = await readWorldScan(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  assert.equal(scan.meta.revisionId, revision.id);
  assert.equal(scan.meta.planSha256, expected.planSha256);
  // The game test writes the anchor it chose on the ground; the mod must have recorded that block.
  assert.deepEqual(scan.meta.worldAnchor, readFileSync(join(dir, 'anchor.txt'), 'utf8').trim().split(' ').map(Number));
  const target = scanTarget(project, scan);
  const check = checkScan(guide, resolution.world, scan, target.projectMin, target.notes);
  const devs = [...check.deviations.values()];
  assert.equal(check.totals.unknown, 0, 'alle Zellen lagen in geladenen Chunks');
  assert.equal(check.totals.wrong, 1, JSON.stringify(devs.slice(0, 5)));
  assert.equal(check.totals.missing, 1, JSON.stringify(devs.slice(0, 5)));
  assert.equal(check.totals.ok, check.totals.cells - 2, JSON.stringify(devs.slice(0, 5)));
  const byVerdict = Object.fromEntries(devs.map(d => [d.verdict, d]));
  assert.deepEqual(byVerdict.wrong.position, expected.wrong);
  assert.equal(byVerdict.wrong.actual, 'minecraft:diamond_block');
  assert.deepEqual(byVerdict.missing.position, expected.missing);
  hologram(join(dir, 'game.log'), check.totals.cells);
  console.log(`Spieltest bestanden: Minecraft ${scan.meta.gameVersion ?? '26.3'} (${scan.meta.loader ?? '?'}), ${check.totals.cells} Zellen aus ${scan.meta.source === 'server' ? 'der echten Serverwelt' : 'dem echten Client'} gelesen, ${check.totals.ok} korrekt, 1 falscher Block und 1 fehlender Block an den erwarteten Stellen erkannt.`);
}

/**
 * Mod 2.0 hologram (Fabric only, skipped when the log has no hologram lines, e.g. the Paper server test):
 * live progress after placing, after building the missing block, turned and turned back; placement saved.
 */
function hologram(logFile, cells) {
  let log;
  try { log = readFileSync(logFile, 'utf8'); } catch { return; }
  const progress = [...log.matchAll(/\[Bauplaner\] .*?: (\d+) % · richtig (\d+) · fehlt (\d+) · falsch (\d+) · Zustand (\d+) · nicht geladen (\d+)/g)]
    .map(m => m.slice(1).map(Number));
  if (progress.length === 0) return;
  assert.equal(progress.length, 4, 'vier Fortschrittszeilen');
  const [placed, built, turned, back] = progress;
  const planned = placed[1] + placed[2] + placed[3] + placed[4] + placed[5];
  assert.deepEqual(placed.slice(2), [1, 1, 0, 0], 'nach dem Platzieren: 1 fehlt, 1 falsch');
  assert.deepEqual(built.slice(2), [0, 1, 0, 0], 'fehlender Block gesetzt: Live-Abgleich erkennt ihn');
  assert.equal(built[1], placed[1] + 1);
  assert.ok(turned[1] < built[1], 'gedreht passt der Plan nicht mehr');
  assert.deepEqual(back.slice(1), built.slice(1), 'zurückgedreht wieder wie vorher');
  assert.ok(planned > 0 && planned <= cells);
  assert.match(log, /\[Bauplaner\] Nächster Fehler bei -?\d+ -?\d+ -?\d+: erwartet /);
  assert.match(readFileSync(join(dir, 'platzierung.properties'), 'utf8'), /\.plan=spieltest\.schem/);
  // Stage 2: material list (only the diamond block is still wrong → one cobblestone open), layer mode.
  const material = [...log.matchAll(/\[Bauplaner\] Material offen: (\d+) Blöcke in (\d+) Sorten\./g)].map(m => [Number(m[1]), Number(m[2])]);
  assert.equal(material.length, 2, 'zwei Materiallisten');
  assert.deepEqual(material[0], [1, 1], 'nur der falsche Block ist offen');
  assert.match(log, /\[Bauplaner\] +1 × minecraft:cobblestone \(von \d+\)/);
  assert.ok(material[1][0] > 1, 'abgerissene Mauer erscheint in der Materialliste');
  const finder = [...log.matchAll(/\[Bauplaner\] (Nächster Fehler bei -?\d+ (-?\d+) -?\d+|Keine Fehler in geladenen Chunks)/g)].map(m => m[2] ?? 'keiner');
  const anchorY = Number(readFileSync(join(dir, 'anchor.txt'), 'utf8').trim().split(' ')[1]);
  assert.deepEqual(finder.slice(-2), [String(anchorY), 'keiner'], 'Fehlerfinder bleibt in der gewählten Ebene');
  console.log(`Hologramm bestanden: ${planned} Planblöcke, Fortschritt ${placed[0]} % → ${built[0]} % nach dem Setzen des fehlenden Blocks, Drehen, Speichern, Materialliste (${material[1][0]} offen nach Teilabriss) und Ebenenmodus geprüft.`);
}
