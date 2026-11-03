// Real-server test of the live team room on the Paper plugin side (COOP-07, docs/architecture/TEAM_LIVE.md,
// RoomLink.java): a running services/team-room (npx wrangler dev), a real Paper server without team file.
// /bauplaner team verbinden takes the plan from the room, server events go up live with the server key,
// planner events come down live, a new plan (type header) is reloaded, a restart resumes at the cursor.
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { createTeam, teamEvent, appendEvents, teamView, teamServerFile, teamServerFileName, readTeamServerFile, mergeTeam } from '../dist/domain/src/index.js';

const [work, pluginJar, version, java] = process.argv.slice(2);
const roomBase = (process.argv[6] ?? 'http://127.0.0.1:8787').replace(/\/+$/, '');
if (!work || !pluginJar || !version || !java) throw new Error('usage: bridge_paperroom.mjs <work> <plugin.jar> <version> <java> [raum]');

// ------------------------------------------------------------------ team file as the planner writes it
const ctx = { sections: [{ id: 'sec_fund', name: 'Fundament' }, { id: 'sec_roh', name: 'Rohbau' }, { id: 'sec_dach', name: 'Dach' }],
  builders: [{ id: 'bld_phil', name: 'Philipp' }, { id: 'bld_anna', name: 'Anna' }, { id: 'bld_ben', name: 'Ben' }] };
let team = createTeam({ name: 'Burg am See', founder: 'bld_phil', server: 'localhost' });
team = appendEvents(team, [
  teamEvent('bld_anna', { kind: 'member.player', member: 'bld_anna', player: 'Anna_MC' }),
  teamEvent('bld_ben', { kind: 'member.player', member: 'bld_ben', player: 'Ben_MC' }),
  teamEvent('bld_phil', { kind: 'plan.release', revisionId: 'rev_1', revisionNumber: 1, summary: 'Erster Stand' }),
  // Baunachweis of an earlier building day on this server (COOP-04): the server fold must sum it like the planner.
  teamEvent('bld_anna', { kind: 'build.tally', section: 'sec_fund', placed: 300, broken: 12, blocks: [{ item: 'minecraft:stone_bricks', count: 300 }], from: '2026-11-02T18:00:00Z', until: '2026-11-02T18:05:00Z' }, undefined, 'server'),
  teamEvent('bld_ben', { kind: 'build.tally', section: 'sec_fund', placed: 40, broken: 0, from: '2026-11-02T18:00:00Z', until: '2026-11-02T18:05:00Z' }, undefined, 'server'),
]);
const members = [{ instanceId: 'i1', toLayer: 0 }];
const file = teamServerFile({ team, view: teamView(team, ctx), projectName: 'Burg', origin: [1000, -60, 1000], dimension: 'minecraft:overworld',
  sections: [{ id: 'sec_fund', name: 'Fundament', members }, { id: 'sec_roh', name: 'Rohbau', members: [{ instanceId: 'i1', fromLayer: 1, toLayer: 4 }] }, { id: 'sec_dach', name: 'Dach', members: [{ instanceId: 'i1', fromLayer: 5 }] }],
  steps: Array.from({ length: 8 }, (_, layer) => ({ instanceId: 'i1', layer, bounds: { min: [0, layer, 0], maxExclusive: [9, layer + 1, 7] } })) });
assert.deepEqual(file.sections[0].boxes, [[1000, -60, 1000, 1008, -60, 1006]]);
assert.deepEqual(file.sections[2].boxes, [[1000, -55, 1000, 1008, -53, 1006]]);

// ------------------------------------------------------------------ Paper download (cached, shared with bridge_papertest.mjs)
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

const dir = join(work, `room-${version}`);
const teamDir = join(dir, 'plugins/BauplanerBridge/team');
mkdirSync(teamDir, { recursive: true });
copyFileSync(pluginJar, join(dir, 'plugins', 'bauplaner-bridge-paper.jar'));
writeFileSync(join(dir, 'eula.txt'), 'eula=true\n');
const port = 25_900 + Math.floor(Math.random() * 300);
writeFileSync(join(dir, 'server.properties'), [
  'online-mode=false', `server-port=${port}`, 'level-type=' + (version.startsWith('1.18') ? 'flat' : 'minecraft\\:flat'),
  'generate-structures=false', 'spawn-protection=0', 'view-distance=3', 'simulation-distance=3', 'spawn-monsters=false', 'spawn-animals=false', 'enable-rcon=false',
].join('\n') + '\n');

let server, log = '', exited;
const waiters = [];
async function start() {
  log = ''; waiters.length = 0;
  server = spawn(java, ['-Xmx2G', '-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', '-jar', serverJar, '--nogui'], { cwd: dir, stdio: ['pipe', 'pipe', 'pipe'] });
  const onData = chunk => {
    log += chunk.toString();
    for (const w of [...waiters]) if (w.pattern.test(log.slice(w.from))) { waiters.splice(waiters.indexOf(w), 1); w.resolve(); }
  };
  server.stdout.on('data', onData); server.stderr.on('data', onData);
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
const run = async (line, pattern, seconds = 30) => { const from = log.length; send(line); await waitFor(pattern, seconds, from); return log.slice(from); };
const stop = async () => { send('stop'); await exited; };
const as = (player, cmd) => `bauplaner team als ${player} ${cmd}`;


// ------------------------------------------------------------------ room as the planner sets it up
const call = async (path, init = {}, key) => {
  const r = await fetch(roomBase + path, { ...init, headers: { 'Content-Type': 'application/json', ...(key && { Authorization: `Bearer ${key}` }), ...init.headers } });
  const text = await r.text(); let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: r.status, body };
};
const created = await call('/v1/rooms', { method: 'POST', body: JSON.stringify({ teamId: team.teamId, name: team.name }) });
assert.equal(created.status, 201, JSON.stringify(created.body));
const { room, adminKey, memberKey, serverKey } = created.body;
assert.ok(serverKey, 'Raum liefert einen Serverschlüssel');
const { events: fileEvents, ...headerOnly } = file;
assert.equal((await call(`/v1/rooms/${room}/header`, { method: 'PUT', body: JSON.stringify({ ...headerOnly, events: [], plan: { sha: 'a'.repeat(64), revisionNumber: 1, at: new Date().toISOString() } }) }, adminKey)).status, 200);
for (const [batch, events, key] of [['b_start', team.events.filter(e => e.origin !== 'server'), adminKey], ['b_start_srv', team.events.filter(e => e.origin === 'server'), serverKey]]) {
  const up = await call(`/v1/rooms/${room}/events`, { method: 'POST', body: JSON.stringify({ batch, events }) }, key);
  assert.equal(up.body.rejected.length, 0, JSON.stringify(up.body.rejected));
}
const feed = async () => { const all = []; let after = ''; for (;;) { const p = (await call(`/v1/rooms/${room}/events?after=${after}`, {}, memberKey)).body; all.push(...p.events); after = p.cursor; if (!p.more) return all; } };
const link = `https://freadeax.github.io/Minecraft-Bauplaner/#/team/beitreten?raum=${encodeURIComponent(roomBase)}&id=${room}&s=${encodeURIComponent(serverKey)}`;
const until = async (what, test, seconds = 20) => { for (let i = 0; i < seconds * 4; i++) { if (await test()) return; await new Promise(r => setTimeout(r, 250)); } throw new Error(`Zeitüberschreitung: ${what}\n${log.slice(-2000)}`); };

try {
  await start();
  assert.match(log, /Keine Teamdatei/, 'ohne Raum keine Teamdatei');
  const connected = await run(`bauplaner team verbinden ${link}`, /Mit dem Team-Raum von „Burg am See“ verbunden|Verbindung nicht möglich[^\n]*/);
  assert.match(connected, /verbunden/, connected);
  assert.ok(!log.includes(serverKey), 'Schlüssel steht nie im Log');
  await until('Raum live', async () => /Burg am See: live/.test(await run('bauplaner team raum', /Burg am See: [^\n]*/)), 30);
  await run('bauplaner abschnitte', /3\. Dach/);
  // Server events go up live (origin server, written with the server key).
  await run(as('Anna_MC', 'nehmen 1'), /Abschnitt 1 „Fundament“ gehört jetzt dir/);
  await run(as('Ben_MC', 'notiz info Gerüst steht'), /Notiz gespeichert/);
  await until('Serverereignisse im Raum', async () => (await feed()).filter(e => e.origin === 'server' && e.kind === 'section.claim').length === 1);
  // A planner event comes down live.
  const planner = teamEvent('bld_phil', { kind: 'section.assign', section: 'sec_dach', member: 'bld_ben' });
  assert.deepEqual((await call(`/v1/rooms/${room}/events`, { method: 'POST', body: JSON.stringify({ batch: 'b_p1', events: [planner] }) }, memberKey)).body.rejected, []);
  await until('Planerereignis auf dem Server', async () => { const out = await run('bauplaner abschnitte', /3\. Dach[^\n]*/); return /3\. Dach[^\n]*Ben/.test(out); });
  // New plan: section renamed, the server reloads the header.
  assert.equal((await call(`/v1/rooms/${room}/header`, { method: 'PUT', body: JSON.stringify({ ...headerOnly, events: [], sections: headerOnly.sections.map(s => s.id === 'sec_dach' ? { ...s, name: 'Dachstuhl' } : s), plan: { sha: 'b'.repeat(64), revisionNumber: 2, at: new Date().toISOString() } }) }, adminKey)).status, 200);
  await until('neuer Planstand', async () => /Dachstuhl/.test(await run('bauplaner abschnitte', /3\. Dach/)));
  await stop();

  // Offline: an event is written while the room is unreachable for the server? Here: written before restart, sent after.
  await start();
  await until('Raum live', async () => /Burg am See: live/.test(await run('bauplaner team raum', /Burg am See: [^\n]*/)), 30);
  await run(as('Carla', 'nehmen 2'), /Abschnitt 2 „Rohbau“ gehört jetzt dir/);
  await until('Ereignis nach Neustart im Raum', async () => (await feed()).some(e => e.kind === 'section.claim' && e.section === 'sec_roh'));
  const all = await feed();
  assert.equal(new Set(all.map(e => e.id)).size, all.length, 'keine doppelten Ereignisse im Raum');
  // Wrong key: 4401/4403 stops retrying with a clear status.
  const rot = await call(`/v1/rooms/${room}/rotate?wer=server`, { method: 'POST' }, adminKey);
  assert.equal(rot.status, 200, JSON.stringify(rot.body));
  await until('Schlüssel erneuert erkannt', async () => /Schlüssel ungültig oder erneuert/.test(await run('bauplaner team raum', /Burg am See: [^\n]*/)), 30);
  await stop();

  // ---------------------------------------------------------------- planner side: same state as the server
  const merged = mergeTeam(team, { ...team, events: await feed() });
  const view = teamView(merged.team, ctx);
  const st = id => view.sections.find(s => s.sectionId === id);
  assert.equal(st('sec_fund').owner, 'bld_anna'); assert.equal(st('sec_dach').owner, 'bld_ben');
  assert.equal(view.notes.length, 1); assert.equal(view.rejected.length, 0);
  const carla = view.members.find(m => m.player === 'Carla');
  assert.ok(carla && st('sec_roh').owner === carla.id, 'Carla hat den Rohbau');
  console.log(`  Paper ${version} (Build ${build.id}): Team-Raum – ${all.length} Ereignisse im Raum, ${all.filter(e => e.origin === 'server').length} vom Server; Planer-Faltung = Serverzustand.`);
} catch (e) {
  if (server && server.exitCode === null) server.kill('SIGKILL');
  throw e;
}
