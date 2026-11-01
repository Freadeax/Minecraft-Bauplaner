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
  writeFileSync(join(dir, 'state.json'), JSON.stringify({ project, revisionId: revision.id, planSha256: plan.sha256, wrong: wrong.position, missing: missing.position }));
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
  console.log(`Spieltest bestanden: Minecraft ${scan.meta.gameVersion ?? '26.3'} (${scan.meta.loader ?? '?'}), ${check.totals.cells} Zellen aus ${scan.meta.source === 'server' ? 'der echten Serverwelt' : 'dem echten Client'} gelesen, ${check.totals.ok} korrekt, 1 falscher Block und 1 fehlender Block an den erwarteten Stellen erkannt.`);
}
