// Real-server test of the planner's emergency way to the server web map (MAP-02, KARTE-08 „Notfall ohne Team-Raum oder
// Plugin“, packages/domain/src/world/liveMapExport.ts): no Build Studio plugin on the server. BlueMap 5.29 on Paper 26.3
// gets the exported `marker-sets` block at the end of maps/world.conf and `bluemap reload`; Dynmap 3.7 on Paper 1.21.4
// gets the exported `dmarker` lines in the server console. Checked in the files the web maps really serve: sets,
// marker types, place and height; a second, smaller export replaces the old markers instead of doubling them.
// Needs `npm run build:core`, JDK 21 and 25, network to fill.papermc.io, the Modrinth CDN and the Mojang servers.
// Not part of `npm run check`.
import { spawn } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { blueMapMarkerConfig, dynmapMarkerCommands, mapShapes } from '../../dist/domain/src/index.js';

const [work, version, java, mapKind] = process.argv.slice(2);
if (!work || !version || !java || !['bluemap', 'dynmap'].includes(mapKind)) throw new Error('usage: bridge_papermapfallback.mjs <work> <version> <java> <bluemap|dynmap>');

const MAPS = {
  bluemap: { project: 'bluemap', version: '5.29-paper', file: 'bluemap-5.29-paper.jar' },
  dynmap: { project: 'dynmap', version: '3.7-beta-8', file: 'Dynmap-3.7-beta-8-spigot.jar' },
};
const cache = join(process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'bauplaner-paper');
mkdirSync(cache, { recursive: true });
async function cached(name, url, check) {
  const path = join(cache, name);
  if (!existsSync(path)) {
    const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
    check(bytes);
    writeFileSync(path, bytes);
  }
  return path;
}
const builds = await (await fetch(`https://fill.papermc.io/v3/projects/paper/versions/${version}/builds`)).json();
const build = builds.find(b => b.channel === 'STABLE') ?? builds[0];
const dl = build.downloads['server:default'];
const serverJar = await cached(dl.name, dl.url, b => assert.equal(createHash('sha256').update(b).digest('hex'), dl.checksums.sha256));
const m = MAPS[mapKind];
const versions = await (await fetch(`https://api.modrinth.com/v2/project/${m.project}/version`)).json();
const file = versions.filter(v => v.version_number === m.version).flatMap(v => v.files).find(f => f.filename === m.file);
assert.ok(file, `${m.file} auf Modrinth`);
const mapJar = await cached(m.file, file.url, b => assert.equal(createHash('sha512').update(b).digest('hex'), file.hashes.sha512));

const dir = join(work, `fallback-${version}-${mapKind}`);
mkdirSync(join(dir, 'plugins'), { recursive: true });
copyFileSync(mapJar, join(dir, 'plugins', m.file));
const webPort = 8500 + Math.floor(Math.random() * 400);
if (mapKind === 'bluemap') {
  mkdirSync(join(dir, 'plugins/BlueMap'), { recursive: true });
  writeFileSync(join(dir, 'plugins/BlueMap/core.conf'), 'accept-download: true\nrender-thread-count: 1\nmetrics: false\n');
  writeFileSync(join(dir, 'plugins/BlueMap/webserver.conf'), `enabled: true\nwebroot: "bluemap/web"\nport: ${webPort}\n`);
}
writeFileSync(join(dir, 'eula.txt'), 'eula=true\n');
const port = 27_000 + Math.floor(Math.random() * 300);
writeFileSync(join(dir, 'server.properties'), ['online-mode=false', `server-port=${port}`, 'level-type=minecraft\\:flat', 'generate-structures=false',
  'view-distance=3', 'simulation-distance=3', 'spawn-monsters=false', 'spawn-animals=false', 'enable-rcon=false'].join('\n') + '\n');

let server, log = '', exited;
const waiters = [];
const waitFor = (pattern, seconds, from = 0) => new Promise((resolve, reject) => {
  const w = { pattern, from, resolve };
  if (pattern.test(log.slice(from))) return resolve();
  waiters.push(w);
  const timer = setTimeout(() => reject(new Error(`Zeitüberschreitung (${seconds} s) beim Warten auf ${pattern}\n${log.slice(-3000)}`)), seconds * 1000);
  const done = w.resolve; w.resolve = () => { clearTimeout(timer); done(); };
  exited.then(code => { clearTimeout(timer); reject(new Error(`Server beendet (${code}) beim Warten auf ${pattern}\n${log.slice(-3000)}`)); });
});
async function start() {
  log = ''; waiters.length = 0;
  server = spawn(java, ['-Xmx2G', '-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', '-jar', serverJar, '--nogui'], { cwd: dir, stdio: ['pipe', 'pipe', 'pipe'] });
  const onData = chunk => { log += chunk.toString(); for (const w of [...waiters]) if (w.pattern.test(log.slice(w.from))) { waiters.splice(waiters.indexOf(w), 1); w.resolve(); } };
  server.stdout.on('data', onData); server.stderr.on('data', onData);
  exited = new Promise(r => server.on('exit', code => r(code)));
  await waitFor(/Done \(\d/, 900);
}
const send = line => server.stdin.write(line + '\n');
const run = async (line, pattern, seconds = 30) => { const from = log.length; send(line); await waitFor(pattern, seconds, from); return log.slice(from); };
const stop = async () => { send('stop'); await exited; };
const until = async (what, test, seconds = 60) => { for (let i = 0; i < seconds * 2; i++) { try { if (await test()) return; } catch { /* not yet */ } await new Promise(r => setTimeout(r, 500)); } throw new Error(`Zeitüberschreitung: ${what}\n${log.slice(-3000)}`); };

// ------------------------------------------------------------------ the planner's Weltplan (same as bridge_paperworld.mjs)
const OW = 'minecraft:overworld';
const items = [
  { kind: 'site', id: 'site_markt', name: 'Marktplatz', note: 'Mit Brunnen', dimension: OW, minX: 0, minZ: 0, width: 16, length: 12, y: -60, projectId: null, group: 'Dorf' },
  { kind: 'path', id: 'path_haupt', name: 'Hauptweg', note: '', dimension: OW, style: 'strasse', width: 5, points: [[0, 20], [40, 20], [40, 60]] },
  { kind: 'zone', id: 'zone_wald', name: 'Schutzwald „Nord“', note: '', dimension: OW, category: 'natur', points: [[-40, -40], [-20, -40], [-20, -20], [-40, -20]] },
  { kind: 'point', id: 'pt_portal', name: 'Netherportal', note: '', dimension: OW, type: 'portal', x: 5, y: -60, z: 30 },
];
const v1 = mapShapes(null, items, OW), v2 = mapShapes(null, items.slice(0, 3), OW);
const shape = id => v1.find(s => s.id === id);

try {
  await start();
  if (mapKind === 'bluemap') {
    const conf = join(dir, 'plugins/BlueMap/maps/world.conf');
    const markers = async () => { const r = await fetch(`http://127.0.0.1:${webPort}/maps/world/live/markers.json`); return r.ok ? await r.json() : null; };
    await until('BlueMap-Karte world', async () => existsSync(conf) && !!(await markers()), 600);
    const reload = async () => { const out = await run('bluemap reload', /BlueMap reloaded!|Failed to load|[Ee]rror[^\n]*BlueMap/, 600); assert.doesNotMatch(out, /Failed to load/, out.slice(0, 3000)); };
    // v1: block at the end of the map config, as the export says.
    appendFileSync(conf, '\n' + blueMapMarkerConfig(v1));
    await reload();
    let sets;
    await until('Marker aus der .conf', async () => { sets = await markers(); return sets?.['bauplaner-punkte']; }, 300);
    assert.equal(sets['bauplaner-bauplaetze'].label, 'Build Studio: Bauplätze');
    const markt = sets['bauplaner-bauplaetze'].markers.site_markt;
    assert.equal(markt.type, 'shape');
    assert.deepEqual(markt.shape.map(p => [p.x, p.z]), shape('site_markt').points.map(([x, z]) => [x, z]), 'Bauplatz an der richtigen Stelle');
    assert.equal(markt.shapeY, -60, 'Bauplatz auf der richtigen Höhe');
    const weg = sets['bauplaner-wege'].markers.path_haupt;
    assert.equal(weg.type, 'line');
    assert.deepEqual(weg.line.map(p => [p.x, p.z]), shape('path_haupt').points.map(([x, z]) => [x, z]));
    assert.equal(sets['bauplaner-zonen'].markers.zone_wald.label, 'Schutzwald „Nord“', 'Sonderzeichen');
    const portal = sets['bauplaner-punkte'].markers.pt_portal;
    assert.equal(portal.type, 'poi');
    assert.deepEqual([portal.position.x, portal.position.y, portal.position.z], [5, -60, 30], 'Punkt an Stelle und Höhe');
    console.log(`    BlueMap: ${Object.keys(sets).filter(k => k.startsWith('bauplaner-')).length} Sets aus der .conf, Stelle und Höhe stimmen`);
    // v2 appended once more at the end (a user who does not delete the old block): must replace, not keep the point.
    appendFileSync(conf, '\n' + blueMapMarkerConfig(v2));
    await reload();
    await new Promise(r => setTimeout(r, 3000));
    await until('neue Marker', async () => { sets = await markers(); return sets?.['bauplaner-bauplaetze']; }, 300);
    console.log('    v2 angehängt: Punkte-Set', sets['bauplaner-punkte'] ? 'NOCH DA' : 'weg', JSON.stringify(Object.keys(sets)));
    assert.ok(!sets['bauplaner-punkte'], 'zweiter Export ersetzt den ersten (kein alter Punkt mehr)');
    assert.ok(sets['bauplaner-bauplaetze'].markers.site_markt && sets['bauplaner-wege'].markers.path_haupt, 'übrige Marker bleiben');
  } else {
    const file = join(dir, 'plugins/dynmap/web/tiles/_markers_/marker_world.json');
    await until('Dynmap bereit', async () => existsSync(file), 600);
    const lines = text => text.split('\n').filter(l => l && !l.startsWith('#'));
    const paste = async text => { for (const l of lines(text)) send(l); await run('say eingefuegt', /eingefuegt/, 60); };
    const json = () => JSON.parse(readFileSync(file, 'utf8'));
    await paste(dynmapMarkerCommands(v1, 'world'));
    let mk;
    await until('Dynmap-Marker', async () => { mk = json(); return mk.sets?.['bauplaner-punkte']?.markers?.pt_portal; }, 120);
    const area = mk.sets['bauplaner-bauplaetze'].areas.site_markt;
    assert.deepEqual(area.x, shape('site_markt').points.map(p => p[0])); assert.deepEqual(area.z, shape('site_markt').points.map(p => p[1]));
    assert.equal(area.ybottom, -60, 'Bauplatz auf der richtigen Höhe');
    const line = mk.sets['bauplaner-wege'].lines.path_haupt;
    assert.deepEqual(line.x, shape('path_haupt').points.map(p => p[0])); assert.deepEqual(line.z, shape('path_haupt').points.map(p => p[1]));
    const pt = mk.sets['bauplaner-punkte'].markers.pt_portal;
    assert.deepEqual([pt.x, pt.y, pt.z], [5, -60, 30], 'Punkt an Stelle und Höhe');
    assert.equal(mk.sets['bauplaner-zonen'].label, 'Build Studio: Zonen');
    const count = j => Object.values(j.sets).reduce((n, s) => n + Object.keys(s.markers ?? {}).length + Object.keys(s.areas ?? {}).length + Object.keys(s.lines ?? {}).length, 0);
    const before = count(mk);
    console.log(`    Dynmap: ${before} Marker aus den Befehlen, Stelle und Höhe stimmen`);
    // Same list once more: nothing doubles. Then the smaller list: the point is gone.
    await paste(dynmapMarkerCommands(v1, 'world'));
    await new Promise(r => setTimeout(r, 3000));
    assert.equal(count(json()), before, 'nochmal eingefügt: keine doppelten Marker');
    await paste(dynmapMarkerCommands(v2, 'world'));
    await until('Punkt entfernt', async () => { const j = json(); return !j.sets?.['bauplaner-punkte'] && j.sets?.['bauplaner-bauplaetze']?.areas?.site_markt; }, 120);
  }
  await stop();
  console.log(`  Paper ${version} (Build ${build.id}) + ${m.file}: Notfallweg ohne Plugin, Marker an Stelle und Höhe, zweiter Export ersetzt den ersten.`);
} catch (e) {
  if (server && server.exitCode === null) server.kill('SIGKILL');
  throw e;
}
