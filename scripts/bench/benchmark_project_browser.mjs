import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir, cpus, platform, release, totalmem } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { build, normalizePath } from 'vite';
import { chromium } from 'playwright';

// Isolated production harness: never writes the application's dist or dist-web.
const side = Number(process.env.LMNT_BENCH_SIDE ?? 40);
const repetitions = Number(process.env.LMNT_BENCH_RUNS ?? 3);
assert.ok(Number.isSafeInteger(side) && side >= 10 && side <= 60, 'LMNT_BENCH_SIDE must be 10..60');
assert.ok(Number.isSafeInteger(repetitions) && repetitions >= 1 && repetitions <= 10, 'LMNT_BENCH_RUNS must be 1..10');
const root = process.cwd(), directory = await mkdtemp(path.join(tmpdir(), 'bauplaner-browser-perf-'));
assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()), 'cleanup target must stay in the named temporary directory');
let server, browser;
try {
  const source = name => normalizePath(path.join(root, name));
  await writeFile(path.join(directory, 'index.html'), '<!doctype html><meta charset="utf-8"><title>Isolated project benchmark</title><button id="probe">Responsiveness probe</button><output id="feedback"></output><script type="module" src="/benchmark-entry.js"></script>');
  await build({ configFile: false, root: directory, base: '../', logLevel: 'error',
    plugins: [{ name: 'project-benchmark-entry', resolveId(id) { if (id === '/benchmark-entry.js') return '\0benchmark-entry'; },
      load(id) { if (id === '\0benchmark-entry') return `
        import {computeProject} from ${JSON.stringify(source('packages/application/src/projectComputation.ts'))};
        import {createProjectComputationClient} from ${JSON.stringify(source('apps/web/src/computation/client.ts'))};
        import {createProject} from ${JSON.stringify(source('packages/domain/src/core/project.ts'))};
        import {createAsset,addAssetVersion} from ${JSON.stringify(source('packages/domain/src/catalog/library.ts'))};
        window.benchmarkModules={computeProject,createProjectComputationClient,createProject,createAsset,addAssetVersion};`;
      } }], build: { outDir: path.join(directory, 'output'), emptyOutDir: true, sourcemap: false } });
  const output = path.join(directory, 'output');
  server = createServer(async (request, response) => {
    try {
      const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
      const filename = path.resolve(output, relative);
      if (!filename.startsWith(output + path.sep)) throw new Error('Invalid path');
      response.setHeader('Content-Type', filename.endsWith('.js') ? 'text/javascript' : 'text/html');
      response.end(await readFile(filename));
    } catch { response.statusCode = 404; response.end('Not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch();
  const report = { at: new Date().toISOString(), sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    workingTreeDirty: Boolean(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()),
    computationSourceFilesDirty: Boolean(execFileSync('git', ['diff', '--name-only', 'HEAD', '--', 'packages', 'apps/web/src/computation'], { encoding: 'utf8' }).trim()),
    sourceDescription: 'sourceCommit identifies the existing calculation/client baseline. The benchmark harness and evidence may be uncommitted; workingTreeDirty describes the entire shared checkout. This compares the same current calculation synchronously and through its production worker client, not two historical Git checkouts.',
    browser: browser.version(), node: process.version, host: { cpu: cpus()[0]?.model, logicalCpus: cpus().length, memoryGiB: Math.round(totalmem() / 2 ** 30), platform: platform(), release: release() },
    model: { synthetic: true, side, cells: side ** 3, instances: 1, palette: ['minecraft:stone'], origin: [-side, 0, -side], repetitions, warmupPerModePerViewport: 1, measurementOrder: 'alternating sync/worker then worker/sync' },
    scope: 'Isolated production Vite harness, actual shared computeProject and shipped worker client; scheduled DOM event and 5ms heartbeat, no React/viewer/GPU rendering, no CPU throttling.', viewports: [] };
  for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, hasTouch: viewport.width < 600 });
    try {
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${server.address().port}/`);
      await page.waitForFunction(() => Boolean(window.benchmarkModules));
      const result = await page.evaluate(async ({ side, repetitions }) => {
        const { computeProject, createProjectComputationClient, createProject, createAsset, addAssetVersion } = window.benchmarkModules;
        const cells = [];
        for (let y = 0; y < side; y++) for (let z = 0; z < side; z++) for (let x = 0; x < side; x++) cells.push({ kind: 'block', position: [x, y, z], paletteIndex: 0 });
        const payload = { schemaVersion: 1, profileId: 'java:registry-unverified', bounds: { min: [0, 0, 0], maxExclusive: [side, side, side] }, pivot: [0, 0, 0], sourceOrigin: [0, 0, 0], palette: [{ id: 'minecraft:stone', properties: {} }], cells, blockEntities: [] };
        const asset = createAsset({ id: 'benchmark-asset', name: 'Synthetic benchmark cube', demo: true, provenance: { author: 'Bauplaner benchmark', source: 'synthetic integer cube', license: 'eigener Testentwurf' } });
        const { version } = await addAssetVersion(asset, { payload, label: 'benchmark-v1', source: { format: 'demo' } });
        const project = { ...createProject({ name: 'Synthetic browser benchmark', id: 'benchmark-project' }), instances: [{ id: 'benchmark-instance', name: 'Cube', assetVersionId: version.id, transform: { position: [-side, 0, -side], quarterTurns: 0, mirrorX: false }, override: false }] };
        const input = { project, versions: new Map([[version.id, version]]) };
        const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
        const digest = async value => {
          const data = new TextEncoder().encode(JSON.stringify(value, (_, item) => item instanceof Map ? { $map: [...item] } : item));
          return [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map(b => b.toString(16).padStart(2, '0')).join('');
        };
        const measure = async mode => {
          const gaps = []; let previous = performance.now(), ticks = 0;
          const timer = setInterval(() => { const now = performance.now(); gaps.push(now - previous); previous = now; ticks++; }, 5);
          await pause(35);
          const button = document.getElementById('probe'), feedback = document.getElementById('feedback');
          let eventAt, expectedAt;
          const clicked = new Promise(resolve => button.addEventListener('click', () => { eventAt = performance.now(); feedback.textContent = 'handled'; resolve(); }, { once: true }));
          expectedAt = performance.now() + 10;
          const interaction = setTimeout(() => button.click(), 10);
          const client = mode === 'worker' ? createProjectComputationClient() : null;
          let result, elapsed;
          try {
            const start = performance.now();
            result = client ? await client.run(input) : computeProject(input);
            elapsed = performance.now() - start;
            await clicked;
            await pause(35);
          } finally { clearInterval(timer); clearTimeout(interaction); client?.dispose(); }
          const cloneStart = performance.now(); structuredClone(result); const resultCloneMs = performance.now() - cloneStart;
          const inputCloneStart = performance.now(); structuredClone(input); const inputCloneMs = performance.now() - inputCloneStart;
          return { mode, elapsedMs: elapsed, maxHeartbeatGapMs: Math.max(...gaps), heartbeatTicks: ticks, scheduledDomEventDelayMs: Math.max(0, eventAt - expectedAt), standaloneInputCloneMs: inputCloneMs, standaloneResultCloneMs: resultCloneMs, digest: await digest(result),
            invariants: { cells: result.resolution.world?.cells.length, items: result.materials.totals.items, conflicts: result.resolution.conflicts.length, steps: result.guide.steps.length, owners: result.resolution.owners.size, mapPreserved: result.resolution.owners instanceof Map && result.guide.byId instanceof Map && result.stepMaterials instanceof Map && result.instanceMaterials instanceof Map } };
        };
        // Warm both module paths; the production client still creates one fresh worker per measured request.
        await measure('sync'); await measure('worker');
        const runs = [];
        for (let iteration = 0; iteration < repetitions; iteration++) {
          for (const mode of iteration % 2 ? ['worker', 'sync'] : ['sync', 'worker']) { runs.push({ iteration, ...await measure(mode) }); await pause(100); }
        }
        return { userAgent: navigator.userAgent, hardwareConcurrency: navigator.hardwareConcurrency, runs };
      }, { side, repetitions });
      const digest = result.runs[0].digest;
      for (const run of result.runs) {
        assert.equal(run.digest, digest, 'full result including all Maps must match in every run');
        assert.deepEqual(run.invariants, { cells: side ** 3, items: side ** 3, conflicts: 0, steps: side, owners: side ** 3, mapPreserved: true });
      }
      const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
      const fields = ['elapsedMs', 'maxHeartbeatGapMs', 'scheduledDomEventDelayMs', 'standaloneInputCloneMs', 'standaloneResultCloneMs'];
      const medians = {};
      for (const mode of ['sync', 'worker']) {
        const runs = result.runs.filter(run => run.mode === mode);
        medians[mode] = Object.fromEntries(fields.map(field => [field, median(runs.map(run => run[field]))]));
      }
      report.viewports.push({ viewport, ...result, medians });
    } finally { await context.close(); }
  }
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
  const cleanupTarget = path.resolve(directory);
  assert.equal(path.dirname(cleanupTarget), path.resolve(tmpdir()), 'cleanup target must stay in the named temporary directory');
  assert.ok(path.basename(cleanupTarget).startsWith('bauplaner-browser-perf-'), 'unexpected cleanup directory');
  await rm(cleanupTarget, { recursive: true, force: true });
}
