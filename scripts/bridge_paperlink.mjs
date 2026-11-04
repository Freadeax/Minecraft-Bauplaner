// Real-server test of „Server ohne Befehle“ on the Paper plugin side (LINK-01/02, docs/architecture/AUTO_LINK.md,
// ServerLink.java): a real Paper server sets itself up (link.json), a protocol client speaks the team channel
// `bauplaner:team` like the Bauplaner mod does and pairs the server as operator, then sends signed control
// messages (status, settings, team file, rename, forget). Replays, wrong signatures, non-operators and settings
// outside the list are refused. Nobody types a server command; the console is only read.
// Needs `minecraft-protocol` (scripts/test_bridge_paper_link.sh installs it into the work folder).
import { spawn } from 'node:child_process';
import { createHash, createHmac } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { createTeam, teamEvent, appendEvents, teamView, teamServerFile } from '../dist/domain/src/index.js';

const [work, pluginJar, version, java, protocolDir, roomArg] = process.argv.slice(2);
// Optional: a running team room (npx wrangler dev in services/team-room) for the second way (LINK-05).
const roomBase = roomArg ? roomArg.replace(/\/+$/, '') : '';
if (!work || !pluginJar || !version || !java || !protocolDir) throw new Error('usage: bridge_paperlink.mjs <work> <plugin.jar> <version> <java> <minecraft-protocol-dir>');
const mc = createRequire(join(protocolDir, 'package.json'))('minecraft-protocol');
if (!mc.supportedVersions.includes(version)) throw new Error(`minecraft-protocol kann ${version} nicht (kann: ${mc.supportedVersions.slice(-4).join(', ')})`);

// ------------------------------------------------------------------ Paper download (cached, shared with the other Paper tests)
const cache = join(process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'bauplaner-paper');
mkdirSync(cache, { recursive: true });
const builds = await (await fetch(`https://fill.papermc.io/v3/projects/paper/versions/${version}/builds`)).json();
const build = builds.find(b => b.channel === 'STABLE') ?? builds[0];
if (!build) throw new Error(`Kein Paper-Build für ${version}`);
const download = build.downloads['server:default'];
const serverJar = join(cache, download.name);
if (!existsSync(serverJar)) {
  const bytes = Buffer.from(await (await fetch(download.url)).arrayBuffer());
  assert.equal(createHash('sha256').update(bytes).digest('hex'), download.checksums.sha256, 'Prüfsumme des Paper-Downloads');
  writeFileSync(serverJar, bytes);
}

const dir = join(work, `link-${version}`);
const data = join(dir, 'plugins/BauplanerBridge');
mkdirSync(join(dir, 'plugins'), { recursive: true });
copyFileSync(pluginJar, join(dir, 'plugins', 'bauplaner-bridge-paper.jar'));
writeFileSync(join(dir, 'eula.txt'), 'eula=true\n');
const port = 26_300 + Math.floor(Math.random() * 300);
writeFileSync(join(dir, 'server.properties'), [
  'online-mode=false', `server-port=${port}`, 'level-type=minecraft\\:flat', 'generate-structures=false', 'spawn-protection=0',
  'view-distance=3', 'simulation-distance=3', 'spawn-monsters=false', 'spawn-animals=false', 'enable-rcon=false',
].join('\n') + '\n');
// The owner is operator already (as on a real server); written as a file, not typed.
const offlineUuid = name => {
  const h = createHash('md5').update(`OfflinePlayer:${name}`).digest();
  h[6] = (h[6] & 0x0f) | 0x30; h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
};
writeFileSync(join(dir, 'ops.json'), JSON.stringify([{ uuid: offlineUuid('Bauleiterin'), name: 'Bauleiterin', level: 4, bypassesPlayerLimit: false }]));

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
  const onData = chunk => {
    log += chunk.toString();
    for (const w of [...waiters]) if (w.pattern.test(log.slice(w.from))) { waiters.splice(waiters.indexOf(w), 1); w.resolve(); }
  };
  server.stdout.on('data', onData); server.stderr.on('data', onData);
  exited = new Promise(r => server.on('exit', code => r(code)));
  await waitFor(/Done \(\d/, 600);
}
// `stop` on the console only ends the test server; it is not part of the tested flow.
const stop = async () => { server.stdin.write('stop\n'); await exited; };

// ------------------------------------------------------------------ a player with the Bauplaner mod (team channel only)
const CHANNEL = 'bauplaner:team';
async function player(name) {
  const client = mc.createClient({ host: '127.0.0.1', port, username: name, version, auth: 'offline', hideErrors: true });
  const answers = new Map(), chat = [];
  let req = 0;
  client.on('custom_payload', p => {
    if (p.channel !== CHANNEL) return;
    const m = JSON.parse(p.data.toString('utf8'));
    if (m.t === 'answer' && answers.has(m.req)) { answers.get(m.req)(m); answers.delete(m.req); }
  });
  const text = p => { try { return JSON.stringify(p); } catch { return ''; } };
  client.on('system_chat', p => chat.push(text(p)));
  client.on('profileless_chat', p => chat.push(text(p)));
  await new Promise((resolve, reject) => { client.once('login', resolve); client.once('error', reject); client.once('end', r => reject(new Error(`${name} getrennt: ${r}`))); });
  // Like the mod: announce the channel (minecraft:register), then talk on it.
  client.write('custom_payload', { channel: 'minecraft:register', data: Buffer.from(CHANNEL) });
  await new Promise(r => setTimeout(r, 500));
  const ask = (t, fields = {}) => new Promise((resolve, reject) => {
    const id = `r${++req}`;
    const timer = setTimeout(() => reject(new Error(`keine Antwort auf ${t}\n${log.slice(-2000)}`)), 15_000);
    answers.set(id, m => { clearTimeout(timer); resolve(m); });
    client.write('custom_payload', { channel: CHANNEL, data: Buffer.from(JSON.stringify({ v: 1, t, req: id, ...fields })) });
  });
  return { ask, chat, quit: () => { client.end(); return new Promise(r => setTimeout(r, 500)); } };
}

// Signed like packages/domain/src/serverControl.ts (controlMessage).
let lastSeq = 0;
const signed = (pair, op, fields = {}, serverId = pair.serverId) => {
  const seq = lastSeq = Math.max(Date.now(), lastSeq + 1);
  const body = JSON.stringify({ ...fields, server: serverId, op });
  const sig = createHmac('sha256', pair.key).update(`${pair.owner}\n${seq}\n${body}`).digest('base64url');
  return { owner: pair.owner, seq, body, sig };
};
const linkFile = () => JSON.parse(readFileSync(join(data, 'link.json'), 'utf8'));
const config = () => readFileSync(join(data, 'config.yml'), 'utf8');

// Team file as the planner writes it (one section is enough here).
let team = createTeam({ name: 'Burg am See', founder: 'bld_phil', server: 'localhost' });
team = appendEvents(team, [teamEvent('bld_phil', { kind: 'plan.release', revisionId: 'rev_1', revisionNumber: 1, summary: 'Erster Stand' })]);
const ctx = { sections: [{ id: 'sec_fund', name: 'Fundament' }], builders: [{ id: 'bld_phil', name: 'Philipp' }] };
const teamFile = teamServerFile({ team, view: teamView(team, ctx), projectName: 'Burg', origin: [0, -60, 0], dimension: 'minecraft:overworld',
  sections: [{ id: 'sec_fund', name: 'Fundament', members: [{ instanceId: 'i1', toLayer: 0 }] }],
  steps: [{ instanceId: 'i1', layer: 0, bounds: { min: [0, 0, 0], maxExclusive: [5, 1, 5] } }] });

try {
  // 1. First start: the plugin sets itself up.
  await start();
  assert.match(log, /Bauplaner eingerichtet \(Server-ID srv_[A-Za-z0-9_-]+\)/, 'Einrichtung im Log');
  const first = linkFile();
  assert.match(first.serverId, /^srv_/); assert.deepEqual(first.owners, []);

  // 2. A guest (no operator) sees the server but may not pair it.
  const guest = await player('Gast');
  const guestInfo = await guest.ask('link.info');
  assert.equal(guestInfo.serverId, first.serverId); assert.equal(guestInfo.paired, false); assert.equal(guestInfo.canClaim, false);
  assert.match((await guest.ask('link.claim', { device: 'Gast-PC' })).error, /Koppeln darf nur ein Operator/);
  await guest.quit();

  // 3. The operator joins: one hint in the chat, then pairing with one click (no command).
  const boss = await player('Bauleiterin');
  await new Promise(r => setTimeout(r, 4000));
  assert.ok(boss.chat.some(c => c.includes('noch nicht mit dem Bauplaner gekoppelt')), `Hinweis für den OP im Chat: ${boss.chat.join(' | ').slice(0, 400)}`);
  const info = await boss.ask('link.info');
  assert.equal(info.canClaim, true); assert.equal(info.paired, false);
  const claim = await boss.ask('link.claim', { device: 'Planer · Chrome · Windows' });
  assert.ok(!claim.error, claim.error);
  assert.match(claim.owner, /^own_/); assert.match(claim.key, /^[A-Za-z0-9_-]{43}$/);
  const pair = { serverId: claim.serverId, owner: claim.owner, key: claim.key };
  assert.ok(!log.includes(pair.key), 'Schlüssel steht nie im Log');
  assert.equal(linkFile().owners.length, 1);
  await waitFor(/Bauleiterin hat den Server mit einem Planer gekoppelt/, 5);

  // 4. Status and settings by signed control messages.
  const status = await boss.ask('link.ctl', signed(pair, 'status'));
  assert.ok(!status.error, status.error);
  assert.equal(status.serverId, pair.serverId);
  assert.ok(status.schema.some(s => s.key === 'team.schutz'), 'Einstellungsliste kommt mit');
  assert.ok(!status.schema.some(s => s.key === 'team.kanal'), 'Teamkanal ist nicht fernsteuerbar');
  const set = await boss.ask('link.ctl', signed(pair, 'config', { set: { 'team.schutz': 'sperren', 'max-chunks': 1234 } }));
  assert.ok(!set.error, set.error);
  assert.match(set.text, /2 Einstellungen übernommen/);
  assert.equal(set.settings['team.schutz'], 'sperren');
  assert.match(config(), /max-chunks: 1234/); assert.match(config(), /schutz: sperren/);

  // 5. Refused: replay, wrong signature, other server, setting outside the list (all or nothing).
  const once = signed(pair, 'status');
  assert.ok(!(await boss.ask('link.ctl', once)).error);
  assert.match((await boss.ask('link.ctl', once)).error, /schon verarbeitet/);
  assert.match((await boss.ask('link.ctl', { ...signed(pair, 'status'), sig: 'A'.repeat(43) })).error, /Unterschrift/);
  assert.match((await boss.ask('link.ctl', signed(pair, 'status', {}, 'srv_anderer01'))).error, /anderen Server/);
  const bad = await boss.ask('link.ctl', signed(pair, 'config', { set: { 'team.schutz': 'aus', 'team.kanal': false } }));
  assert.match(bad.error, /team\.kanal/);
  assert.match(config(), /schutz: sperren/, 'nichts übernommen');

  // 6. Team file and new name from the planner.
  const t = await boss.ask('link.ctl', signed(pair, 'team', { file: teamFile }));
  assert.ok(!t.error, t.error);
  const renamed = await boss.ask('link.ctl', signed(pair, 'rename', { name: 'LMNT Burgserver' }));
  assert.equal(renamed.name, 'LMNT Burgserver');
  const after = await boss.ask('link.ctl', signed(pair, 'status'));
  assert.equal(after.teams.length, 1); assert.equal(after.teams[0].name, 'Burg am See');
  assert.ok(!log.includes(pair.key), 'Schlüssel steht nie im Log');

  // 6b. Second way (LINK-05): the planner connects the server with a team room by a control message, then
  //     controls it through the room over HTTP – no mod involved on that side.
  let roomWay = '';
  if (roomBase) {
    const created = await (await fetch(`${roomBase}/v1/rooms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamId: teamFile.teamId, name: 'Burg am See' }) })).json();
    assert.ok(created.serverKey, JSON.stringify(created));
    // The Bauleitung's planner puts the plan header into the room (as „Live schalten“ does).
    const put = await fetch(`${roomBase}/v1/rooms/${created.room}/header`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${created.adminKey}` }, body: JSON.stringify({ ...teamFile, events: [] }) });
    assert.equal(put.status, 200);
    const link = `https://freadeax.github.io/Minecraft-Bauplaner/#/team/beitreten?raum=${encodeURIComponent(roomBase)}&id=${created.room}&s=${encodeURIComponent(created.serverKey)}`;
    const connected = await boss.ask('link.ctl', signed(pair, 'room', { link }));
    assert.ok(!connected.error, connected.error);
    assert.ok(!log.includes(created.serverKey), 'Serverschlüssel steht nie im Log');
    const viaRoom = async (msg, key = created.memberKey) => {
      const r = await fetch(`${roomBase}/v1/rooms/${created.room}/control`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(msg) });
      return { status: r.status, body: await r.json() };
    };
    let online = false;
    for (let i = 0; i < 80 && !online; i++) {
      online = (await (await fetch(`${roomBase}/v1/rooms/${created.room}`, { headers: { Authorization: `Bearer ${created.memberKey}` } })).json()).serverOnline === true;
      if (!online) await new Promise(r => setTimeout(r, 250));
    }
    assert.ok(online, `Server im Raum online\n${log.slice(-1500)}`);
    const st = await viaRoom(signed(pair, 'status'));
    assert.equal(st.status, 200, JSON.stringify(st.body)); assert.equal(st.body.name, 'LMNT Burgserver');
    const cfg = await viaRoom(signed(pair, 'config', { set: { 'lager.modus': 'hinweis' } }));
    assert.ok(!cfg.body.error, cfg.body.error); assert.match(config(), /modus: hinweis/);
    const replay = signed(pair, 'status');
    assert.equal((await viaRoom(replay)).status, 200);
    assert.match((await viaRoom(replay)).body.error, /schon verarbeitet/, 'Wiederholung auch über den Raum abgewiesen');
    assert.equal((await viaRoom(signed(pair, 'status'), 'falscher-schluessel')).status, 401);
    assert.equal((await viaRoom({ owner: 'x' })).status, 400);
    await waitFor(/Einstellungen aus dem Planer[^\n]*lager\.modus/, 5);
    roomWay = ', Steuerung über den Team-Raum (Status, Einstellung, Wiederholung abgewiesen)';
  }
  await boss.quit();
  await stop();

  // 7. Restart: pairing, name and the last sequence number stay; a recorded message still does not work.
  await start();
  assert.match(log, /Bauplaner-Kopplung: 1 Planer gekoppelt/);
  const again = await player('Bauleiterin');
  assert.match((await again.ask('link.ctl', once)).error, /schon verarbeitet/);
  const st2 = await again.ask('link.ctl', signed(pair, 'status'));
  assert.equal(st2.name, 'LMNT Burgserver'); assert.equal(st2.settings['team.schutz'], 'sperren');
  // 8. Disconnect this planner: afterwards its key no longer works.
  const gone = await again.ask('link.ctl', signed(pair, 'forget', { owner: pair.owner }));
  assert.ok(!gone.error, gone.error);
  assert.match((await again.ask('link.ctl', signed(pair, 'status'))).error, /nicht \(mehr\) gekoppelt/);
  assert.deepEqual(linkFile().owners, []);
  await again.quit();
  await stop();
  console.log(`  Paper ${version} (Build ${build.id}): Server ohne Befehle – selbst eingerichtet, per Klick gekoppelt, 2 Einstellungen und ein Team per signierter Nachricht, Wiederholung/falsche Unterschrift/fremder Server/Nicht-OP abgewiesen, Neustart behält die Kopplung${roomWay}.`);
} catch (e) {
  if (server && server.exitCode === null) server.kill('SIGKILL');
  throw e;
}
process.exit(0);
