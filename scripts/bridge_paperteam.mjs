// Real-server test of the Teambau module of the Paper plugin (COOP-02), driven by scripts/test_bridge_paper_team.sh:
//   node scripts/bridge_paperteam.mjs <work dir> <plugin jar> <minecraft version> <java binary>
// Writes a server team file exactly as the planner does (teamServerFile), starts a real Paper server,
// plays a building day with console commands for several players (`bauplaner team als <spieler> …`):
// take sections, a double claim, joining, reporting, a refused check by a Helfer, a role change,
// deliveries, a note; restarts the server (the log must survive) and reads the export back with the
// planner's reader. The planner's fold (teamView) must give the state the server announced.
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { createTeam, teamEvent, appendEvents, teamView, teamServerFile, teamServerFileName, readTeamServerFile, mergeTeam } from '../dist/domain/src/index.js';

const [work, pluginJar, version, java] = process.argv.slice(2);
if (!work || !pluginJar || !version || !java) throw new Error('usage: bridge_paperteam.mjs <work> <plugin.jar> <version> <java>');

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

const dir = join(work, `team-${version}`);
const teamDir = join(dir, 'plugins/BauplanerBridge/team');
mkdirSync(teamDir, { recursive: true });
copyFileSync(pluginJar, join(dir, 'plugins', 'bauplaner-bridge-paper.jar'));
writeFileSync(join(teamDir, teamServerFileName(team)), JSON.stringify(file, null, 1));
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

try {
  await start();
  assert.match(log, /1 Team\(s\): Burg am See \(3 Abschnitte, 5 Ereignisse\)/, 'Teamdatei beim Start gelesen');
  await run('bauplaner team laden', /1 Team\(s\)/);
  await run(as('Anna_MC', 'nehmen 1'), /Abschnitt 1 „Fundament“ gehört jetzt dir/);
  await run(as('Ben_MC', 'nehmen 1'), /schon an Anna vergeben/);
  await run(as('Carla', 'nehmen rohbau'), /Abschnitt 2 „Rohbau“ gehört jetzt dir/);
  assert.match(log, /Du bist dem Team „Burg am See“ als Helfer beigetreten/);
  await run(as('Anna_MC', 'fertig 1 Fundament steht'), /als fertig gemeldet/);
  await run(as('Ben_MC', 'pruefen 1 ok'), /Ben ist Helfer und darf das nicht/);
  await run('bauplaner rolle Ben_MC baumeister', /Ben ist jetzt Baumeister/);
  await run(as('Ben_MC', 'pruefen 1 ok'), /Abschnitt 1 bestätigt/);
  await run(as('Carla', 'geliefert stone 3x64'), /192 × stone als geliefert vermerkt/);
  await run(as('Carla', 'sammle oak_log 128'), /Du sammelst 128 × oak_log/);
  await run(as('Carla', 'notiz frage Wo kommt die Treppe hin?'), /Notiz gespeichert/);
  await run(as('Ben_MC', 'zuweisen 3 Anna_MC'), /Abschnitt 3 „Dach“ an Anna zugewiesen/);
  // COOP-06: Übergabe mit Annahme, Abwesenheit.
  await run(as('Anna_MC', 'uebergeben 3 Carla Dachlatten liegen bereit'), /Übergabe von Abschnitt 3 „Dach“ an Carla angeboten/);
  await run(as('Carla', 'team'), /Übergabe an dich: 3 Dach \(von Anna: Dachlatten liegen bereit\)/);
  await run('bauplaner abschnitte', /3\. Dach[^\n]*Anna[^\n]*Übergabe an Carla offen/);
  await run(as('Ben_MC', 'annehmen 3'), /kein Übergabeangebot/);
  await run(as('Carla', 'annehmen'), /Abschnitt 3 „Dach“ gehört jetzt dir/);
  await run(as('Anna_MC', 'abwesend bis 2026-11-10 Urlaub'), /abwesend eingetragen bis einschließlich 2026-11-10/);
  await run(as('Ben_MC', 'abwesend'), /abwesend eingetragen/);
  await run(as('Ben_MC', 'zurueck'), /wieder als anwesend/);
  await run(as('Ben_MC', 'team'), /Abwesend: Anna \(bis 2026-11-10\)/);
  // Lagerkiste (COOP-04): a real chest, filled and emptied with vanilla commands, counted by the plugin.
  await run('forceload add 1000 1010', /forceload|Marked|already/i);
  await run('setblock 1000 -60 1010 minecraft:chest', /Changed the block|Could not set/);
  await run('item replace block 1000 -60 1010 container.0 with minecraft:stone 64', /Replaced|Changed/i);
  await run(as('Ben_MC', 'lager setzen Hauptlager 1000 -60 1010'), /erstmals gezählt: 64 Items/);
  await run('item replace block 1000 -60 1010 container.1 with minecraft:oak_log 32', /Replaced|Changed/i);
  await run(as('Carla', 'lager zaehlen'), /\+32 oak_log/);
  await run(as('Carla', 'lager zaehlen'), /unverändert/);
  await run('item replace block 1000 -60 1010 container.0 with minecraft:air', /Replaced|Changed/i);
  await run(as('Anna_MC', 'lager zaehlen'), /[−-]64 stone/);
  await run(as('Ben_MC', 'lager'), /Bestand: 32 oak_log/);
  await run(as('Anna_MC', 'beitrag'), /Anna: 300 Blöcke gesetzt, 12 abgebaut/);
  await run(as('Ben_MC', 'beitrag alle'), /1\. Fundament: 340 Blöcke · Anna 300, Ben 40/);
  await run(as('Ben_MC', 'nachweis aus'), /Baunachweis aus/);
  await run(as('Ben_MC', 'beitrag alle'), /1\. Fundament: 300 Blöcke · Anna 300/);
  await run(as('Anna_MC', 'nachweis'), /Baunachweis für dich: an/);
  const list = await run('bauplaner abschnitte', /3\. Dach/);
  assert.match(list, /1\. Fundament[^\n]*bestätigt · Anna/);
  assert.match(list, /2\. Rohbau[^\n]*in Arbeit · Carla/);
  await run(as('Ben_MC', 'team'), /Deine Abschnitte|Du hast keinen Abschnitt/);
  await stop();

  // The log survives a restart; a confirmed section cannot be taken again.
  await start();
  await run(as('Ben_MC', 'nehmen 1'), /schon an Anna vergeben|schon bestätigt/);
  const exported = await run('bauplaner team export', /Teamstand geschrieben: plugins\/BauplanerBridge\/team\/([^ ]+\.export\.json)/);
  const exportName = exported.match(/team\/([^ ]+\.export\.json)/)[1];
  await stop();

  // ---------------------------------------------------------------- planner side: same state
  const back = readTeamServerFile(readFileSync(join(teamDir, exportName), 'utf8'));
  assert.equal(back.teamId, team.teamId);
  const merged = mergeTeam(team, { ...team, events: back.events });
  assert.equal(merged.clashes.length, 0);
  const view = teamView(merged.team, ctx);
  const st = id => view.sections.find(s => s.sectionId === id);
  const carla = view.members.find(m => m.player === 'Carla');
  assert.ok(carla, 'Carla im Team');
  assert.ok(carla && carla.role === 'helfer', 'Carla ist als Helfer beigetreten');
  assert.equal(st('sec_fund').status, 'bestaetigt'); assert.equal(st('sec_fund').owner, 'bld_anna'); assert.equal(st('sec_fund').verifiedBy, 'bld_ben');
  assert.equal(st('sec_roh').owner, carla.id);
  assert.equal(st('sec_dach').owner, carla.id, 'Übergabe angenommen');
  assert.equal(st('sec_dach').offer, undefined); assert.equal(st('sec_dach').note, 'Dachlatten liegen bereit');
  assert.deepEqual(view.members.find(m => m.id === 'bld_anna').away, { until: '2026-11-10', note: 'Urlaub' });
  assert.equal(view.members.find(m => m.id === 'bld_ben').away, undefined);
  assert.equal(view.members.find(m => m.id === 'bld_ben').role, 'meister');
  assert.deepEqual(view.delivered, { 'minecraft:stone': 192 });
  assert.deepEqual(view.gather.map(g => [g.item, g.count]), [['minecraft:oak_log', 128]]);
  assert.equal(view.notes.length, 1); assert.equal(view.notes[0].tag, 'frage');
  assert.ok(back.events.filter(e => e.origin === 'server').length >= 9, 'Ereignisse vom Server tragen die Herkunft server');
  assert.equal(view.rejected.length, 0, 'abgelehnte Befehle wurden gar nicht erst geschrieben');
  assert.equal(view.stores.length, 1); assert.equal(view.stores[0].name, 'Hauptlager'); assert.deepEqual(view.stores[0].pos, [1000, -60, 1010]);
  assert.deepEqual(view.stock, { 'minecraft:oak_log': 32 });
  assert.deepEqual(carla.stored, { 'minecraft:oak_log': 32 });
  assert.deepEqual(view.members.find(m => m.id === 'bld_anna').taken, { 'minecraft:stone': 64 });
  assert.equal(view.members.find(m => m.id === 'bld_anna').placed, 300);
  assert.equal(view.members.find(m => m.id === 'bld_ben').tally, false); assert.equal(view.members.find(m => m.id === 'bld_ben').placed, 0);
  assert.equal(st('sec_fund').placed, 300);
  const problems = log.split('\n').filter(l => /bauplaner/i.test(l) && /(WARN|ERROR|Exception)/i.test(l));
  assert.deepEqual(problems, [], 'keine Warnungen oder Fehler des Plugins im Serverprotokoll');
  console.log(`  Paper ${version} (Build ${build.id}): Teambau – ${back.events.length} Ereignisse, ${back.events.filter(e => e.origin === 'server').length} vom Server; Planer-Faltung = Serverzustand.`);
} catch (error) {
  server?.kill('SIGKILL');
  throw error;
}

