// Cross-language check of the recording format (B8): the website exports a plan, the Java
// bridge core records a world built from it (one block wrong), the independent Python reader
// and the website's reader/comparison must agree. Run via scripts/test_bridge.sh.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { readWorldScan } from '../dist/formats/src/index.js';
import { applyOperation, buildGuide, checkScan, createProject, createSampleLibrary, exportRevisionSchem, freezeRevision, newInstance, resolveProject, scanTarget } from '../dist/domain/src/index.js';

const classpath = process.argv[2];
const dir = mkdtempSync(join(tmpdir(), 'bridge-'));
const lib = await createSampleLibrary();
const versions = new Map(lib.versions.map(v => [v.id, v]));
const latest = id => lib.versions.find(v => v.assetId === id).id;
const at = (id, name, position) => newInstance({ assetVersionId: latest(id), name, transform: { position, quarterTurns: 0, mirrorX: false } });
const base = applyOperation(createProject({ name: 'Burgmauer Brücke' }), { kind: 'batch', label: 't', operations: [
  at('sample_tower', 'Turm West', [0, 0, 0]), at('sample_wall', 'Mauer', [4, 0, 1]), at('sample_tower', 'Turm Ost', [10, 0, 0]),
].map(instance => ({ kind: 'instance.add', instance })) }).project;
const { project, revision } = freezeRevision(base, 'Brückentest');
const plan = await exportRevisionSchem(project, revision.id, versions, { dataVersion: 4189, anchor: 'min-corner', unselected: 'air' });
const planFile = join(dir, 'plan.schem'), scanFile = join(dir, 'scan.schem');
writeFileSync(planFile, plan.bytes);

const resolution = resolveProject({ ...project, instances: revision.instances }, versions);
const guide = buildGuide(project, resolution);
const victim = resolution.world.cells.find(c => c.kind === 'block');
const anchor = [1000, 64, -300];
const w = victim.position.map((v, i) => v + anchor[i]);
const run = spawnSync('java', ['-cp', classpath, 'io.github.freadeax.bauplaner.bridge.SimulateScan', planFile, scanFile, ...anchor.map(String), `${w.join(',')}=minecraft:diamond_block`], { encoding: 'utf8' });
assert.equal(run.status, 0, run.stderr);

const py = spawnSync('python3', ['-I', 'scripts/verify_schem.py', scanFile], { encoding: 'utf8' });
assert.equal(py.status, 0, py.stdout + py.stderr);
const summary = JSON.parse(py.stdout);
assert.equal(summary.dataVersion, 4189);
assert.deepEqual(summary.size, resolution.world.bounds.maxExclusive.map((v, i) => v - resolution.world.bounds.min[i]));
const local = victim.position.map((v, i) => v - resolution.world.bounds.min[i]);
assert.equal(summary.cells[local.join(',')], 'minecraft:diamond_block', 'Python reads the wrong block at the same cell');

const bytes = readFileSync(scanFile);
const scan = await readWorldScan(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
assert.equal(scan.meta.revisionId, revision.id);
assert.equal(scan.meta.planSha256, plan.sha256, 'PlanSha256 = SHA-256 of the exported plan file');
assert.deepEqual(scan.meta.worldAnchor, anchor);
assert.deepEqual(scan.meta.projectMin, resolution.world.bounds.min);
const target = scanTarget(project, scan);
assert.equal(target.revision.id, revision.id);
const check = checkScan(guide, resolution.world, scan, target.projectMin, target.notes);
assert.equal(check.totals.wrong, 1);
assert.equal(check.totals.ok, check.totals.cells - 1);
const dev = [...check.deviations.values()][0];
assert.deepEqual(dev.position, victim.position);
assert.equal(dev.actual, 'minecraft:diamond_block');
const deviating = [...check.steps.values()].filter(s => s.status === 'deviating');
assert.equal(deviating.length, 1);
console.log(`Brückenprüfung bestanden: ${check.totals.cells} Zellen, ${guide.steps.length} Schritte, 1 Abweichung bei ${dev.position.join('/')} erkannt; Python-Leser bestätigt Box ${summary.size.join('×')} und dieselbe Zelle.`);
