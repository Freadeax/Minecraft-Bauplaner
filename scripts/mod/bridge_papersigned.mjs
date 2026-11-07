// Real-server test of GAME-06 (docs/architecture/team/SIGNED_EVENTS.md, EventTrust.java): a running services/team-room
// (npx wrangler dev) and a real Paper server. The plugin gets the Bauleitung's public key with the server link (p),
// takes the room's past once the Bauleitung confirms it (signed team.trust), takes the signed protection setting
// and refuses unsigned events in the Bauleitung's name, with its rights or with a stolen player name – also after a restart.
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { createTeam, teamEvent, appendEvents, teamView, teamServerFile, deriveLeaderSeed, leaderPublicKey, signLeaderBatch } from '../../dist/domain/src/index.js';

const [work, pluginJar, version, java] = process.argv.slice(2);
const roomBase = (process.argv[6] ?? 'http://127.0.0.1:8787').replace(/\/+$/, '');
if (!work || !pluginJar || !version || !java) throw new Error('usage: bridge_papersigned.mjs <work> <plugin.jar> <version> <java> [raum]');

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

const dir = join(work, `signed-${version}`);
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


// ------------------------------------------------------------------ room as the planner sets it up (before GAME-06: unsigned)
const call = async (path, init = {}, key) => {
  const r = await fetch(roomBase + path, { ...init, headers: { 'Content-Type': 'application/json', ...(key && { Authorization: `Bearer ${key}` }), ...init.headers } });
  const text = await r.text(); let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: r.status, body };
};
const created = await call('/v1/rooms', { method: 'POST', body: JSON.stringify({ teamId: team.teamId, name: team.name }) });
assert.equal(created.status, 201, JSON.stringify(created.body));
const { room, adminKey, memberKey, serverKey } = created.body;
const seed = await deriveLeaderSeed(adminKey);
const publicKey = await leaderPublicKey(seed);
const { events: _fileEvents, ...headerOnly } = file;
assert.equal((await call(`/v1/rooms/${room}/header`, { method: 'PUT', body: JSON.stringify({ ...headerOnly, events: [], plan: { sha: 'a'.repeat(64), revisionNumber: 1, at: new Date().toISOString() } }) }, adminKey)).status, 200);
const post = async (batch, events, key = memberKey) => {
  const up = await call(`/v1/rooms/${room}/events`, { method: 'POST', body: JSON.stringify({ batch, events }) }, key);
  assert.equal(up.status, 200, JSON.stringify(up.body));
  assert.deepEqual(up.body.rejected, [], JSON.stringify(up.body.rejected));
  return up.body;
};
// The past (unsigned, as up to 0.23.0): Ben becomes Baumeister.
team = appendEvents(team, [teamEvent('bld_phil', { kind: 'member.role', member: 'bld_ben', role: 'meister' })]);
const past = await post('b_past', team.events.filter(e => e.origin !== 'server'), adminKey);
await post('b_past_srv', team.events.filter(e => e.origin === 'server'), serverKey);
const link = `https://freadeax.github.io/Minecraft-Bauplaner/#/team/beitreten?raum=${encodeURIComponent(roomBase)}&id=${room}&s=${encodeURIComponent(serverKey)}&p=${publicKey}`;
const until = async (what, test, seconds = 20) => { for (let i = 0; i < seconds * 4; i++) { if (await test()) return; await new Promise(r => setTimeout(r, 250)); } throw new Error(`Zeitüberschreitung: ${what}\n${log.slice(-2000)}`); };
const status = () => run('bauplaner team raum', /Rollen und Schutz[^\n]*|Ereignisse aus Teamdatei[^\n]*/);
const founder = { teamId: team.teamId, founder: team.founder };

try {
  await start();
  const connected = await run(`bauplaner team verbinden ${link}`, /Mit dem Team-Raum von „Burg am See“ verbunden|Verbindung nicht möglich[^\n]*/);
  assert.match(connected, /verbunden/, connected);
  assert.ok(!log.includes(seed) && !log.includes(adminKey), 'Schlüssel stehen nie im Log');
  await until('Raum live', async () => /Burg am See: live/.test(await run('bauplaner team raum', /Burg am See: [^\n]*/)), 30);
  assert.match(await status(), /noch ungeprüft: die Bauleitung bestätigt/, 'ohne team.trust nichts gefiltert');

  // The Bauleitung's planner confirms the past and sets the protection – signed.
  const trust = teamEvent('bld_phil', { kind: 'team.trust', upTo: past.cursor });
  const protect = teamEvent('bld_phil', { kind: 'team.protect', mode: 'sperren', free: 'team' });
  await post('b_trust', await signLeaderBatch(seed, founder, [trust, protect]), adminKey);
  // Somebody with the invitation pretends to be the Bauleitung, switches the protection off and takes Anna's player name.
  const forgedRole = teamEvent('bld_phil', { kind: 'member.role', member: 'bld_carl', role: 'leitung' });
  const forgedOff = teamEvent('bld_ben', { kind: 'team.protect', mode: 'aus' });
  const stolen = teamEvent('bld_carl', { kind: 'member.join', member: 'bld_carl', name: 'Carl', player: 'Anna_MC' });
  const forgedSig = { ...teamEvent('bld_phil', { kind: 'team.protect', mode: 'hinweis' }), sig: 'uJdu-WGDe5BtEiw7UzdcBYFNBAoWl_yT8t6dwlDjnC4' };
  const ok = teamEvent('bld_ben', { kind: 'section.claim', section: 'sec_roh' });
  // The room itself refuses them with the shared invitation (TEAM-SEC-01) …
  const refused = await call(`/v1/rooms/${room}/events`, { method: 'POST', body: JSON.stringify({ batch: 'b_invite', events: [forgedRole, forgedOff, forgedSig] }) }, memberKey);
  assert.equal(refused.body.rejected?.length, 3, JSON.stringify(refused.body));
  // … but the server must not trust the room alone: as if the room were compromised, they get in with the admin key.
  await post('b_forged', [forgedRole, forgedOff, stolen, forgedSig, ok], adminKey);
  await until('Prüfung aktiv', async () => /geprüft \(Prüfschlüssel der Bauleitung\) · Schutz sperren, freie Abschnitte team · 4 Ereignisse nicht übernommen/.test(await status()), 30);
  const list = await run('bauplaner team raum pruefen', /(?:\n[^\n]*· [a-z]+\.[a-z]+ von [^\n]*){4}/);
  assert.match(list, /member\.role von Philipp: im Namen der Bauleitung, aber ohne ihre Unterschrift/);
  assert.match(list, /team\.protect von Ben: nur die Bauleitung darf das/);
  assert.match(list, /Spieler Anna_MC gehört schon zu Anna/);
  assert.match(list, /Unterschrift der Bauleitung passt nicht/);
  await until('Bens Übernahme gilt', async () => /2\. Rohbau[^\n]*Ben/.test(await run('bauplaner abschnitte', /2\. Rohbau[^\n]*/)));
  // Ben stays Baumeister (from the confirmed past); Carl did not become Bauleitung.
  assert.match(await run(as('Ben_MC', 'team'), /Du: [^\n]*/), /Du: Ben · Baumeister/);
  // The same event sent again (a resend) changes nothing: one id, one effect.
  await post('b_forged', [forgedRole, forgedOff, stolen, forgedSig, ok], adminKey);
  await stop();

  // Restart: signing key, arrival numbers and the check survive.
  await start();
  await until('Raum live', async () => /Burg am See: live/.test(await run('bauplaner team raum', /Burg am See: [^\n]*/)), 30);
  assert.match(await status(), /geprüft[^\n]*Schutz sperren[^\n]*4 Ereignisse nicht übernommen/);
  // Server admin keeps the decision: team.schutz-quelle server → the file's setting (hinweis) applies.
  await stop();
  const cfg = join(dir, 'plugins/BauplanerBridge/config.yml');
  writeFileSync(cfg, readFileSync(cfg, 'utf8').replace('schutz-quelle: raum', 'schutz-quelle: server'));
  await start();
  await until('Raum live', async () => /Burg am See: live/.test(await run('bauplaner team raum', /Burg am See: [^\n]*/)), 30);
  assert.match(await status(), /Schutz hinweis, freie Abschnitte alle/);
  await stop();
  console.log(`  Paper ${version} (Build ${build.id}): unterschriebene Ereignisse – Vergangenheit bestätigt, Schutz „sperren/team“ aus dem Raum, 4 gefälschte Ereignisse abgewiesen, nach Neustart gleich, Serverhoheit per schutz-quelle.`);
} catch (e) {
  if (server && server.exitCode === null) server.kill('SIGKILL');
  throw e;
}
