// Real-server test of WORLD-SHARE-01 (docs/architecture/welt/WORLD_SHARE.md): the planner puts the Weltplan into the
// Team-Raum, the Paper plugin (connected with the server key, no file) reads it and writes the markers into the web map
// itself – BlueMap (API, live markers.json of its web server) or Dynmap (marker API, marker_<world>.json) – and knows
// the locked entries. Needs a running services/team-room (npx wrangler dev), network to fill.papermc.io, Modrinth CDN
// and the Mojang servers (BlueMap downloads the client resources itself).
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildWorldShareDoc, mapShapes } from '../../dist/domain/src/index.js';

const [work, pluginJar, version, java, mapKind] = process.argv.slice(2);
const roomBase = (process.argv[7] ?? 'http://127.0.0.1:8787').replace(/\/+$/, '');
if (!work || !pluginJar || !version || !java || !['bluemap', 'dynmap'].includes(mapKind)) throw new Error('usage: bridge_paperworld.mjs <work> <plugin.jar> <version> <java> <bluemap|dynmap> [raum]');

// Web map plugins from Modrinth (exact versions, checked by SHA-512 from the Modrinth API).
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

const dir = join(work, `world-${version}-${mapKind}`);
mkdirSync(join(dir, 'plugins/BauplanerBridge'), { recursive: true });
copyFileSync(pluginJar, join(dir, 'plugins', 'bauplaner-bridge-paper.jar'));
copyFileSync(mapJar, join(dir, 'plugins', m.file));
const webPort = 8100 + Math.floor(Math.random() * 400);
if (mapKind === 'bluemap') {
  mkdirSync(join(dir, 'plugins/BlueMap'), { recursive: true });
  writeFileSync(join(dir, 'plugins/BlueMap/core.conf'), 'accept-download: true\nrender-thread-count: 1\nmetrics: false\n');
  writeFileSync(join(dir, 'plugins/BlueMap/webserver.conf'), `enabled: true\nwebroot: "bluemap/web"\nport: ${webPort}\n`);
}
writeFileSync(join(dir, 'plugins/BauplanerBridge/config.yml'), 'weltplan:\n  sperren: sperren\n');
writeFileSync(join(dir, 'eula.txt'), 'eula=true\n');
const port = 26_300 + Math.floor(Math.random() * 300);
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
const call = async (path, init = {}, key) => {
  const r = await fetch(roomBase + path, { ...init, headers: { 'Content-Type': 'application/json', ...(key && { Authorization: `Bearer ${key}` }), ...init.headers } });
  const text = await r.text(); let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: r.status, body };
};

// ------------------------------------------------------------------ the planner's Weltplan
const OW = 'minecraft:overworld';
const items = [
  { kind: 'site', id: 'site_markt', name: 'Marktplatz', note: 'Mit Brunnen', dimension: OW, minX: 0, minZ: 0, width: 16, length: 12, y: -60, projectId: null, group: 'Dorf', locked: true },
  { kind: 'path', id: 'path_haupt', name: 'Hauptweg', note: '', dimension: OW, style: 'strasse', width: 5, points: [[0, 20], [40, 20], [40, 60]] },
  { kind: 'zone', id: 'zone_wald', name: 'Schutzwald', note: '', dimension: OW, category: 'natur', points: [[-40, -40], [-20, -40], [-20, -20], [-40, -20]], locked: true },
  { kind: 'point', id: 'pt_portal', name: 'Netherportal', note: '', dimension: OW, type: 'portal', x: 5, y: -60, z: 30 },
];
const doc = buildWorldShareDoc(items, { [OW]: mapShapes(null, items, OW) }, 'bld_phil');

const created = await call('/v1/rooms', { method: 'POST', body: JSON.stringify({ teamId: 'team_welt01', name: 'Dorf am Fluss' }) });
assert.equal(created.status, 201, JSON.stringify(created.body));
const { room, adminKey, memberKey, serverKey } = created.body;
const header = { format: 'minecraft-bauplaner-team-server', formatVersion: 1, teamId: 'team_welt01', name: 'Dorf am Fluss', founder: 'bld_phil', dimension: OW,
  members: [{ id: 'bld_phil', name: 'Philipp' }], sections: [{ id: 'sec_a', name: 'Markt', boxes: [[0, -60, 0, 15, -50, 11]] }], events: [] };
assert.equal((await call(`/v1/rooms/${room}/header`, { method: 'PUT', body: JSON.stringify(header) }, adminKey)).status, 200);
const put = await call(`/v1/rooms/${room}/doc/weltplan?by=bld_phil`, { method: 'PUT', body: JSON.stringify(doc), headers: { 'If-Match': '0' } }, memberKey);
assert.equal(put.status, 200, JSON.stringify(put.body));
const link = `https://freadeax.github.io/Minecraft-Bauplaner/#/team/beitreten?raum=${encodeURIComponent(roomBase)}&id=${room}&s=${encodeURIComponent(serverKey)}`;

const blueMarkers = async () => {
  const r = await fetch(`http://127.0.0.1:${webPort}/maps/world/live/markers.json`);
  return r.ok ? await r.json() : null;
};
const dynMarkers = () => JSON.parse(readFileSync(join(dir, 'plugins/dynmap/web/tiles/_markers_/marker_world.json'), 'utf8'));

try {
  await start();
  const connected = await run(`bauplaner team verbinden ${link}`, /Mit dem Team-Raum von „Dorf am Fluss“ verbunden|Verbindung nicht möglich[^\n]*/);
  assert.match(connected, /verbunden/, connected);
  await waitFor(/Weltplan des Teams team_welt01 \(Stand 1, von bld_phil\): 4 Einträge, 4 Marker[^\n]*2 gesperrt/, 60);
  assert.match(log, new RegExp(`Weltplan des Teams[^\\n]*→ ${mapKind === 'bluemap' ? 'BlueMap' : 'Dynmap'}`), 'Webkarte erkannt');
  const status = await run('bauplaner weltplan', /Sperren: [^\n]*/);
  assert.match(status, /4 Einträge, 4 Marker, 2 gesperrt/);
  assert.match(status, /Sperren: sperren/);

  if (mapKind === 'bluemap') {
    let sets;
    await until('BlueMap-Marker', async () => { sets = await blueMarkers(); return sets && sets['bauplaner-bauplaetze'] && sets['bauplaner-wege'] && sets['bauplaner-zonen'] && sets['bauplaner-punkte']; }, 600);
    assert.equal(sets['bauplaner-bauplaetze'].label, 'Build Studio: Bauplätze');
    const markt = sets['bauplaner-bauplaetze'].markers.site_markt;
    assert.equal(markt.type, 'shape'); assert.equal(markt.label, 'Marktplatz'); assert.match(markt.detail, /<b>Marktplatz<\/b>/);
    assert.equal(sets['bauplaner-wege'].markers.path_haupt.type, 'line');
    assert.equal(sets['bauplaner-punkte'].markers.pt_portal.type, 'poi');
  } else {
    let m;
    await until('Dynmap-Marker', async () => { m = dynMarkers(); return m.sets?.['bauplaner-bauplaetze']?.areas?.site_markt; }, 600);
    assert.equal(m.sets['bauplaner-bauplaetze'].label, 'Build Studio: Bauplätze');
    assert.ok(m.sets['bauplaner-wege'].lines.path_haupt, 'Weg als Linie');
    assert.ok(m.sets['bauplaner-punkte'].markers.pt_portal, 'Punkt als Marker');
  }

  // A new version from the planner arrives by push: one point less, markers replaced (not doubled).
  const doc2 = buildWorldShareDoc(items.slice(0, 3), { [OW]: mapShapes(null, items.slice(0, 3), OW) }, 'bld_anna');
  assert.equal((await call(`/v1/rooms/${room}/doc/weltplan?by=bld_anna`, { method: 'PUT', body: JSON.stringify(doc2), headers: { 'If-Match': '1' } }, memberKey)).status, 200);
  await waitFor(/Weltplan des Teams team_welt01 \(Stand 2, von bld_anna\): 3 Einträge, 3 Marker/, 60);
  if (mapKind === 'bluemap') await until('Punkt entfernt', async () => { const s = await blueMarkers(); return s && !s['bauplaner-punkte'] && s['bauplaner-bauplaetze']; }, 120);
  else await until('Punkt entfernt', async () => { const s = dynMarkers(); return !s.sets?.['bauplaner-punkte'] && s.sets?.['bauplaner-bauplaetze']; }, 120);
  await stop();

  // Restart without room contact first: the cached Weltplan is drawn again right away.
  assert.ok(existsSync(join(dir, 'plugins/BauplanerBridge/team/team_welt01.weltplan.json')), 'Weltplan im Plugin-Ordner gemerkt');
  await start();
  const again = await run('bauplaner weltplan', /Sperren: [^\n]*/);
  assert.match(again, /Stand 2 von bld_anna: 3 Einträge, 3 Marker, 2 gesperrt/);
  await stop();
  console.log(`  Paper ${version} (Build ${build.id}) + ${m.file}: Weltplan aus dem Team-Raum, Marker selbst geschrieben, Neuladen per Push, Neustart aus dem Speicher.`);
} catch (e) {
  if (server && server.exitCode === null) server.kill('SIGKILL');
  throw e;
}
