// Real-server test of the Paper plugin (GAME-04), driven by scripts/test_bridge_paper.sh:
//   node scripts/bridge_papertest.mjs <work dir> <plugin jar> <minecraft version> <java binary>
// Downloads the newest stable Paper build of that version (fill.papermc.io, cached), starts a flat
// test world, builds the plan from setblocks.txt (only the test places blocks: one wrong, one missing),
// lets the chunks unload again and records the plan with console commands as a server admin would.
// Writes <work>/<version>/scan.schem and anchor.txt for `bridge_gametest.mjs verify`, and checks that a
// plan box in never-generated terrain is recorded as "not loaded" without generating anything.
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { readWorldScan } from '../dist/formats/src/index.js';

const [work, pluginJar, version, java] = process.argv.slice(2);
if (!work || !pluginJar || !version || !java) throw new Error('usage: bridge_papertest.mjs <work> <plugin.jar> <version> <java>');
const ANCHOR = [1000, -60, 1000];
const FAR = [1_600_000, -60, 1_600_000];

// ------------------------------------------------------------------ Paper download (cached)
const cache = join(process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'bauplaner-paper');
mkdirSync(cache, { recursive: true });
const builds = await (await fetch(`https://fill.papermc.io/v3/projects/paper/versions/${version}/builds`)).json();
const build = builds.find(b => b.channel === 'STABLE') ?? builds[0];
if (!build) throw new Error(`Kein Paper-Build für ${version}`);
const download = build.downloads['server:default'];
const serverJar = join(cache, download.name);
if (!existsSync(serverJar)) {
  const bytes = Buffer.from(await (await fetch(download.url)).arrayBuffer());
  const { createHash } = await import('node:crypto');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), download.checksums.sha256, 'Prüfsumme des Paper-Downloads');
  writeFileSync(serverJar, bytes);
}

// ------------------------------------------------------------------ server folder
const dir = join(work, version);
mkdirSync(join(dir, 'plugins/BauplanerBridge/plans'), { recursive: true });
copyFileSync(pluginJar, join(dir, 'plugins', 'bauplaner-bridge-paper.jar'));
copyFileSync(join(work, 'plan.schem'), join(dir, 'plugins/BauplanerBridge/plans/spieltest.schem'));
writeFileSync(join(dir, 'eula.txt'), 'eula=true\n');
const port = 25_600 + Math.floor(Math.random() * 300);
writeFileSync(join(dir, 'server.properties'), [
  'online-mode=false', `server-port=${port}`, 'level-type=' + (version.startsWith('1.18') ? 'flat' : 'minecraft\\:flat'),
  'generate-structures=false', 'spawn-protection=0', 'view-distance=3', 'simulation-distance=3', 'spawn-monsters=false', 'spawn-animals=false', 'enable-rcon=false',
].join('\n') + '\n');

let server, log = '', exited;
const waiters = [];
/** Starts the server process; resolves once the world is ready. */
async function start() {
  log = '';
  waiters.length = 0;
  server = spawn(java, ['-Xmx2G', '-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', '-jar', serverJar, '--nogui'], { cwd: dir, stdio: ['pipe', 'pipe', 'pipe'] });
  const onData = chunk => {
    log += chunk.toString();
    for (const w of [...waiters]) if (w.pattern.test(log.slice(w.from))) { waiters.splice(waiters.indexOf(w), 1); w.resolve(); }
  };
  server.stdout.on('data', onData);
  server.stderr.on('data', onData);
  exited = new Promise(r => server.on('exit', code => r(code)));
  await waitFor(/Done \(\d/, 600);
}
const waitFor = (pattern, seconds, from = 0) => new Promise((resolve, reject) => {
  const w = { pattern, from, resolve };
  if (pattern.test(log.slice(from))) return resolve();
  waiters.push(w);
  const timer = setTimeout(() => reject(new Error(`Zeitüberschreitung (${seconds} s) beim Warten auf ${pattern}\n${log.slice(-3000)}`)), seconds * 1000);
  const done = w.resolve; w.resolve = () => { clearTimeout(timer); done(); };
  exited.then(code => { clearTimeout(timer); reject(new Error(`Server beendet (${code}) beim Warten auf ${pattern}\n${log.slice(-3000)}`)); });
});
const send = line => server.stdin.write(line + '\n');
/** Sends a command and waits for a line of its answer that appears after it. */
const run = async (line, pattern, seconds = 60) => { const from = log.length; send(line); await waitFor(pattern, seconds, from); };
const stop = async () => { send('stop'); await exited; };

try {
  await start();
  await run(`forceload add ${ANCHOR[0] - 4} ${ANCHOR[2] - 4} ${ANCHOR[0] + 27} ${ANCHOR[2] + 27}`, /(Marking|Chunk|chunks|forceload|Forceloaded)/i);
  const lines = readFileSync(join(work, 'setblocks.txt'), 'utf8').split('\n').filter(Boolean);
  for (const l of lines) {
    const [x, y, z, state] = l.split(' ');
    send(`setblock ${ANCHOR[0] + +x} ${ANCHOR[1] + +y} ${ANCHOR[2] + +z} ${state}`);
  }
  await run('say bauplaner-test-gebaut', /bauplaner-test-gebaut/);
  const failed = log.match(/(Unknown block type|Could not set the block|Incorrect argument|Invalid)[^\n]*/g);
  assert.equal(failed, null, 'alle Testblöcke gesetzt');
  // Restart without the force-load: the build area (far from spawn) is not loaded any more, so the
  // plugin has to load the existing chunks itself.
  await run('forceload remove all', /(Unmarked|forceload|No chunks|removed)/i);
  await stop();
  await start();

  await run('bauplaner plaene', /spieltest\.schem/);
  await run('bauplaner plan spieltest.schem', /Plan geladen/);
  await run(`bauplaner anker ${ANCHOR.join(' ')} world`, /Anker gespeichert/);
  await run('bauplaner status', new RegExp(`Anker: ${ANCHOR.join(' ')}`));
  await run('bauplaner scan', /Aufnahme gespeichert: plugins\/BauplanerBridge\/scans\/([^ ]+\.schem)/, 120);
  const scanName = log.match(/Aufnahme gespeichert: plugins\/BauplanerBridge\/scans\/([^ ]+\.schem)/)[1];
  const reloaded = log.match(/(\d+) Chunks wurden dafür nachgeladen/)?.[1] ?? '0';
  copyFileSync(join(dir, 'plugins/BauplanerBridge/scans', scanName), join(dir, 'scan.schem'));
  writeFileSync(join(dir, 'anchor.txt'), ANCHOR.join(' ') + '\n');
  writeFileSync(join(dir, 'state.json'), readFileSync(join(work, 'state.json')));

  // Never-generated terrain: every cell "not loaded", no region file created.
  const before = log.length;
  await run(`bauplaner anker ${FAR.join(' ')} world`, /Anker gespeichert/);
  await new Promise(r => setTimeout(r, 1200)); // distinct file name (seconds)
  await run('bauplaner scan', /Aufnahme gespeichert: plugins\/BauplanerBridge\/scans\/([^ ]+\.schem)/, 120);
  const farName = log.slice(before).match(/Aufnahme gespeichert: plugins\/BauplanerBridge\/scans\/([^ ]+\.schem)/)[1];
  const farBytes = readFileSync(join(dir, 'plugins/BauplanerBridge/scans', farName));
  const far = await readWorldScan(farBytes.buffer.slice(farBytes.byteOffset, farBytes.byteOffset + farBytes.byteLength));
  assert.equal(far.meta.unloaded, far.size[0] * far.size[1] * far.size[2], 'nie erzeugtes Gelände gilt vollständig als nicht aufgenommen');
  await run('save-all flush', /Saved the game|saved/i, 120);
  const regionDir = ['world/region', 'world/dimensions/minecraft/overworld/region'].map(p => join(dir, p)).find(existsSync);
  const farRegion = `r.${FAR[0] >> 9}.${FAR[2] >> 9}.mca`;
  assert.ok(regionDir && !readdirSync(regionDir).includes(farRegion), `kein Gelände erzeugt (${farRegion} fehlt)`);

  const scanBytes = readFileSync(join(dir, 'scan.schem'));
  const scan = await readWorldScan(scanBytes.buffer.slice(scanBytes.byteOffset, scanBytes.byteOffset + scanBytes.byteLength));
  console.log(`  Paper ${version} (Build ${build.id}, ${scan.meta.loader}, DataVersion ${scan.dataVersion}): Aufnahme ${scanName}, ${reloaded} Chunks nachgeladen; fernes Gelände ${far.meta.unloaded} Zellen „nicht aufgenommen“, nichts erzeugt.`);
  for (const l of log.split('\n').filter(l => /\[Bauplaner\]|BauplanerBridge\]/.test(l) && !/Loading|Enabling|Disabling/.test(l)).slice(0, 4)) console.log('    ' + l.trim());
  assert.ok(+reloaded > 0, 'Plugin hat die nicht geladenen Chunks selbst nachgeladen');
  const problems = log.split('\n').filter(l => /bauplaner/i.test(l) && /(WARN|ERROR|Exception|deprecat)/i.test(l));
  assert.deepEqual(problems, [], 'keine Warnungen oder Fehler des Plugins im Serverprotokoll');
  await stop();
} catch (error) {
  server?.kill('SIGKILL');
  throw error;
}
