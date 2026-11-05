/** Node-only composition comparison. Build core first; pass the baseline Git ref. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir, cpus, totalmem } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { createPayload } from '../dist/voxel/src/index.js';
import { createProject, newInstance, resolveProject } from '../dist/domain/src/index.js';

const baselineRef = process.argv[2];
if (!baselineRef || !/^[a-zA-Z0-9_.\/-]+$/.test(baselineRef)) throw new Error('Usage: node --expose-gc scripts/benchmark_composition.mjs <baseline-git-ref>');
// Nach STRUCT-01 liegen die Kernmodule in Fachordnern; ein Vergleich mit älteren Ständen braucht einen eigenen dist-Build jenes Stands.
const root = new URL('../', import.meta.url);
const source = execFileSync('git', ['show', `${baselineRef}:packages/domain/src/compose.ts`], { cwd: root, encoding: 'utf8' });
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText;
const baselineModule = compiled.replace(/from (['"])([^'"]+)\1/g, (_, quote, specifier) => `from ${quote}${new URL(specifier, new URL('../dist/domain/src/compose.js', import.meta.url)).href}${quote}`);
const temporary = await mkdtemp(join(tmpdir(), 'bauplaner-composition-'));
try {
  const modulePath = join(temporary, 'baseline.mjs');
  await writeFile(modulePath, baselineModule);
  const baseline = (await import(pathToFileURL(modulePath).href)).resolveProject;
  const sx = 96, sy = 36, sz = 96, cells = [];
  for (let x = 0; x < sx; x++) for (let y = 0; y < sy; y++) for (let z = 0; z < sz; z++) {
    const wall = x === 0 || z === 0 || x === sx - 1 || z === sz - 1;
    if (wall || y % 6 === 0) cells.push({ position: [x, y, z], kind: 'block', paletteIndex: wall ? 0 : 1 });
  }
  const payload = createPayload({ schemaVersion: 1, profileId: 'java:registry-unverified', bounds: { min: [0, 0, 0], maxExclusive: [sx, sy, sz] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette: [{ id: 'minecraft:stone', properties: {} }, { id: 'minecraft:oak_planks', properties: {} }], cells, blockEntities: [] });
  const version = { id: 'fixture-version', assetId: 'fixture', payload, connectors: [], source: { format: 'demo' }, label: 'fixture', payloadHash: 'benchmark-only', schemaVersion: 1, createdAt: '2026-11-01T00:00:00Z' };
  const instances = [[-98, -12, -98], [0, -12, -98], [-98, -12, 0], [0, -12, 0]].map((position, i) => ({ ...newInstance({ assetVersionId: version.id, name: `Halle ${i}`, transform: { position, quarterTurns: 0, mirrorX: false } }), id: `hall-${i}` }));
  const project = { ...createProject({ id: 'benchmark', name: 'Hallen' }), instances };
  const versions = new Map([[version.id, version]]);
  const digest = resolution => createHash('sha256').update(JSON.stringify(resolution, (_, value) => value instanceof Map ? [...value] : value)).digest('hex');
  const samples = { baseline: [], numeric: [] }, hashes = new Set();
  // Two alternating orders reduce the effect of warm-up and systematic GC order.
  for (let round = 0; round < 3; round++) for (const name of round % 2 ? ['numeric', 'baseline'] : ['baseline', 'numeric']) {
    globalThis.gc?.();
    const start = performance.now();
    const result = (name === 'baseline' ? baseline : resolveProject)(project, versions);
    samples[name].push(Number((performance.now() - start).toFixed(2)));
    hashes.add(digest(result));
  }
  assert.equal(hashes.size, 1, 'entire public resolution including Map entries/order must be identical');
  const median = values => [...values].sort((a, b) => a - b)[1];
  const before = median(samples.baseline), after = median(samples.numeric);
  console.log(JSON.stringify({ baselineRef, node: process.version, cpu: cpus()[0]?.model, logicalCpus: cpus().length, memoryGiB: Number((totalmem() / 2 ** 30).toFixed(2)), gcExposed: !!globalThis.gc, scenario: '4 separated 96×36×96 hollow halls; negative origins; two materials; floors every 6 Y; no entities', uniqueCells: cells.length * 4, runsMilliseconds: samples, medianMilliseconds: { baseline: before, numeric: after }, reductionPercent: Number(((1 - after / before) * 100).toFixed(1)), completeResolutionSha256: [...hashes][0], note: 'Node only; payload preparation and digest excluded; no browser/GPU claim' }, null, 2));
} finally { await rm(temporary, { recursive: true, force: true }); }
