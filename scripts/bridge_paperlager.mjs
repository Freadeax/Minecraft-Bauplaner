// Real-server test of the checked storage chests (COOP-05, docs/architecture/LAGERKISTEN.md), driven by
// scripts/test_bridge_paper_lager.sh:  node scripts/bridge_paperlager.mjs <work dir> <plugin jar> <minecraft version> <java binary>
// Writes a server team file with material need, starts a real Paper server and plays a storage day with
// console commands: mark a chest (it is assigned to the section around it), fill it with a vanilla command
// (an unbooked change → „abweichend“), refuse a seal by a Helfer, seal as Baumeister, a hopper below must
// not empty the store, a hopper above fills it (booked as „Trichter“), TNT next to it must not destroy it,
// a double chest, a removed chest becomes „fehlt“, the need report, restart, export. The planner's fold
// must give the same stores, statuses and bookings as the server.
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { createTeam, teamEvent, appendEvents, teamView, teamServerFile, teamServerFileName, readTeamServerFile, mergeTeam } from '../dist/domain/src/index.js';

const [work, pluginJar, version, java] = process.argv.slice(2);
if (!work || !pluginJar || !version || !java) throw new Error('usage: bridge_paperlager.mjs <work> <plugin.jar> <version> <java>');

// ------------------------------------------------------------------ team file as the planner writes it
const ctx = { sections: [{ id: 'sec_fund', name: 'Fundament' }, { id: 'sec_roh', name: 'Rohbau' }],
  builders: [{ id: 'bld_phil', name: 'Philipp' }, { id: 'bld_ben', name: 'Ben' }] };
let team = createTeam({ name: 'Lager am See', founder: 'bld_phil', server: 'localhost' });
team = appendEvents(team, [teamEvent('bld_ben', { kind: 'member.player', member: 'bld_ben', player: 'Ben_MC' })]);
const file = teamServerFile({ team, view: teamView(team, ctx), projectName: 'Lager', origin: [1000, -60, 1000], dimension: 'minecraft:overworld',
  sections: [{ id: 'sec_fund', name: 'Fundament', members: [{ instanceId: 'i1', toLayer: 1 }] }, { id: 'sec_roh', name: 'Rohbau', members: [{ instanceId: 'i1', fromLayer: 2 }] }],
  steps: Array.from({ length: 6 }, (_, layer) => ({ instanceId: 'i1', layer, bounds: { min: [0, layer, 0], maxExclusive: [16, layer + 1, 16] } })),
  // COOP-08: farms of the project (production.serverFarms) for yield stores.
  farms: [{ id: 'farm_kuerbis', name: 'Kürbisfarm', items: ['minecraft:pumpkin'] }] });
assert.deepEqual(file.farms, [{ id: 'farm_kuerbis', name: 'Kürbisfarm', items: ['minecraft:pumpkin'] }]);
// Material need as the planner writes it (sections[].need, need for the whole project).
file.sections[0].need ??= [{ item: 'minecraft:stone', count: 100 }, { item: 'minecraft:oak_log', count: 5 }];
file.need ??= [{ item: 'minecraft:stone', count: 300 }, { item: 'minecraft:oak_log', count: 20 }, { item: 'minecraft:glass', count: 10 }];

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

const dir = join(work, `lager-${version}`);
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
    log += chunk.toString().replace(/\x1b\[[0-9;]*m/g, '');
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
const settle = async (line, pattern) => { const from = log.length; send(line); await waitFor(pattern, 30, from); await new Promise(r => setTimeout(r, 800)); return log.slice(from); };
const as = (player, cmd) => `bauplaner team als ${player} ${cmd}`;


const X = 1002, Y = -60, Z = 1002; // inside section 1 (layers 0–1 = y −60…−59)
const at = (x = X, y = Y, z = Z) => `bei ${x} ${y} ${z}`;
try {
  await start();
  await run('bauplaner team laden', /1 Team\(s\)/);
  // Chunks of the building site stay loaded (vanilla), chest blocks are set by vanilla commands.
  await run(`forceload add ${X} ${Z}`, /(Marked|marked|markiert|chunk)/i);
  await run(`setblock ${X} ${Y} ${Z} minecraft:chest`, /Changed the block|Block geändert/i);
  const marked = await run(`bauplaner lager markieren ${at()} Stein Nord`, /erstmals gezählt/);
  assert.match(marked, /Lager „Stein Nord“ markiert/);
  assert.match(marked, /Zugeordnet: Abschnitt 1 Fundament/);
  await run(as('Ben_MC', `lager markieren ${at(X + 3)} Fremd`), /Baumeister und die Bauleitung|Dort steht keine Kiste/);

  // An unbooked change (vanilla command, like another plugin or a rollback) is found and kept until a seal.
  await run(`item replace block ${X} ${Y} ${Z} container.0 with minecraft:stone 64`, /Replaced|ersetzt/i);
  await run(`bauplaner lager pruefen ${at()}`, /abweichend – \+64 stone/);
  await run(`bauplaner lager pruefen ${at()}`, /abweichend[^\n]*offene Abweichung \+64 stone/);
  await run(as('Ben_MC', `lager siegeln ${at()}`), /Siegeln dürfen Baumeister/);
  await run('bauplaner rolle Ben_MC baumeister', /Ben ist jetzt Baumeister/);
  await run(as('Ben_MC', `lager siegeln ${at()} Steinlieferung von Hand`), /gesiegelt: der jetzige Inhalt gilt als richtig \(Abweichung \+64 stone angenommen\)/);
  await run(`bauplaner lager info ${at()}`, /Stein Nord[^\n]*geprüft/);

  // Hopper below must not empty the store (lager.trichter: einlegen), hopper above fills it and is booked.
  await run(`setblock ${X} ${Y - 1} ${Z} minecraft:hopper`, /Changed the block|Block geändert/i);
  await run(`setblock ${X} ${Y + 1} ${Z} minecraft:hopper[facing=down]`, /Changed the block|Block geändert/i);
  await run(`item replace block ${X} ${Y + 1} ${Z} container.0 with minecraft:oak_log 5`, /Replaced|ersetzt/i);
  await new Promise(r => setTimeout(r, 6000));
  const afterHopper = await run(`bauplaner lager pruefen ${at()}`, /Stein Nord“: /);
  assert.match(afterHopper, /geprüft[^\n]*69 Items in 2 Sorten/, 'Trichter oben füllt ein, Trichter unten zieht nichts heraus');
  await run(`bauplaner lager verlauf ${at()}`, /Trichter: \+\d oak_log/);
  await run(`bauplaner lager wer oak_log ${at()}`, /Trichter: \+5 \/ −0/);

  // COOP-08: yield store of a farm – everything a hopper puts in counts as yield, hopper moves are bundled.
  const F = X + 14;
  await run(`setblock ${F} ${Y} ${Z} minecraft:chest`, /Changed the block|Block geändert/i);
  await run(`bauplaner lager markieren ${at(F)} Kürbistruhe`, /erstmals gezählt/);
  await run(`bauplaner lager farm ${at(F)} Kürbisfarm`, /Ertragskiste der Farm „Kürbisfarm“/);
  await run(`setblock ${F} ${Y + 1} ${Z} minecraft:hopper[facing=down]`, /Changed the block|Block geändert/i);
  await run(`item replace block ${F} ${Y + 1} ${Z} container.0 with minecraft:pumpkin 6`, /Replaced|ersetzt/i);
  await new Promise(r => setTimeout(r, 6000));
  await run(`bauplaner lager pruefen ${at(F)}`, /Kürbistruhe“: [^\n]*geprüft/);
  await run(`bauplaner lager info ${at(F)}`, /Ertragskiste der Farm „Kürbisfarm“: 6 Items in \d+ min geladen/);

  // TNT next to the store: the store survives.
  await run(`summon minecraft:tnt ${X + 1} ${Y} ${Z} {Fuse:1s,fuse:1}`, /Summoned|beschworen/i);
  await new Promise(r => setTimeout(r, 3000));
  await run(`bauplaner lager pruefen ${at()}`, /Stein Nord“: [^\n]*geprüft/);

  // Double chest: both halves belong to the store.
  await run(`setblock ${X + 6} ${Y} ${Z} minecraft:chest[facing=north,type=left]`, /Changed the block|Block geändert/i);
  await run(`setblock ${X + 7} ${Y} ${Z} minecraft:chest[facing=north,type=right]`, /Changed the block|Block geändert/i);
  await run(`bauplaner lager markieren ${at(X + 6)} Doppelkiste`, /erstmals gezählt/);
  await run(`item replace block ${X + 7} ${Y} ${Z} container.0 with minecraft:glass 7`, /Replaced|ersetzt/i);
  await run(`bauplaner lager pruefen ${at(X + 7)}`, /Doppelkiste“: [^\n]*abweichend – \+7 glass/);
  await run(`bauplaner lager zweck ${at(X + 6)} eingang`, /Zweck: eingang/);
  await run(`bauplaner lager abschnitt ${at(X + 6)} projekt`, /ganze Projekt/);

  // A chest that disappears (not broken by a player: /setblock) is reported as missing, the mark stays.
  await run(`setblock ${X + 10} ${Y} ${Z} minecraft:barrel`, /Changed the block|Block geändert/i);
  await run(`bauplaner lager markieren ${at(X + 10)} Fass`, /erstmals gezählt/);
  await run(`setblock ${X + 10} ${Y} ${Z} minecraft:air`, /Changed the block|Block geändert/i);
  await run(`bauplaner lager pruefen ${at(X + 10)}`, /keine Kiste mehr/);

  await run(`setblock ${X + 12} ${Y} ${Z} minecraft:chest`, /Changed the block|Block geändert/i);
  await run(`bauplaner lager markieren ${at(X + 12)} Kurz`, /erstmals gezählt/);
  await run(`bauplaner lager schutz ${at(X + 12)} gesperrt`, /Schutz „gesperrt“: nur Baumeister und Bauleitung/);
  await run(`bauplaner lager entmarkieren ${at(X + 12)}`, /Markierung von „Kurz“ aufgehoben/);

  const need = await settle('bauplaner lager bedarf 1', /Materialien liegen bereit/);
  assert.match(need, /Bedarf Abschnitt 1 Fundament[^\n]*: 1 von 2 Materialien/);
  assert.match(need, /stone[^\n]*Bedarf 100 · im Lager 64 · fehlt 36/);
  const projectNeed = await settle('bauplaner lager bedarf', /Materialien liegen bereit/);
  assert.match(projectNeed, /glass[^\n]*im Lager 7/);
  await run(as('Carla', 'sammle glass'), /Du sammelst 3 × glass/);
  const list = await settle('bauplaner lager liste', /Fass/);
  assert.match(list, /Stein Nord · [^\n]*geprüft · Abschnitt 1 Fundament/);
  assert.match(list, /Fass · [^\n]*Kiste fehlt/);
  await stop();

  // The log survives a restart; the chunk load check finds the store unchanged.
  await start();
  const again = await settle('bauplaner lager liste', /Fass/);
  assert.match(again, /Stein Nord · [^\n]*geprüft/);
  assert.match(again, /Doppelkiste · [^\n]*abweichend/);
  const exported = await run('bauplaner team export', /Teamstand geschrieben: plugins\/BauplanerBridge\/team\/([^ ]+\.export\.json)/);
  const exportName = exported.match(/team\/([^ ]+\.export\.json)/)[1];
  await stop();

  // ---------------------------------------------------------------- planner side: same stores
  const back = readTeamServerFile(readFileSync(join(teamDir, exportName), 'utf8'));
  const merged = mergeTeam(team, { ...team, events: back.events });
  assert.equal(merged.clashes.length, 0);
  const kinds = back.events.map(e => e.kind);
  for (const k of ['store.chest', 'store.config', 'store.count', 'store.check', 'store.seal', 'store.move']) assert.ok(kinds.includes(k), `Ausfuhr enthält ${k}`);
  const view = teamView(merged.team, ctx);
  assert.equal(view.rejected.length, 0, 'keine abgelehnten Ereignisse');
  {
    const byName = n => view.stores.find(s => s.name === n);
    assert.equal(byName('Stein Nord').status, 'geprueft');
    assert.equal(byName('Stein Nord').section, 'sec_fund');
    assert.deepEqual(byName('Stein Nord').items, { 'minecraft:oak_log': 5, 'minecraft:stone': 64 });
    assert.equal(byName('Doppelkiste').status, 'abweichend');
    assert.equal(byName('Doppelkiste').purpose, 'eingang');
    assert.ok(byName('Doppelkiste').pos2, 'zweite Hälfte der Doppelkiste');
    assert.equal(byName('Fass').status, 'fehlt');
    assert.equal(byName('Kurz'), undefined, 'aufgehobene Markierung');
    assert.deepEqual(byName('Stein Nord').hopperIn, { 'minecraft:oak_log': 5 });
    assert.deepEqual(byName('Stein Nord').deviation, {}, 'gesiegelt');
    assert.deepEqual(byName('Doppelkiste').deviation, { 'minecraft:glass': 7 });
    const farm = byName('Kürbistruhe');
    assert.equal(farm.purpose, 'ertrag'); assert.equal(farm.farm, 'farm_kuerbis'); assert.equal(farm.status, 'geprueft');
    assert.deepEqual(farm.yieldIn, { 'minecraft:pumpkin': 6 }, 'Ertrag beim Herunterfahren geschrieben');
    const y = view.yields.filter(x => x.chest === farm.id);
    assert.equal(y.length, 1); assert.equal(y[0].farm, 'farm_kuerbis'); assert.deepEqual(y[0].items, { 'minecraft:pumpkin': 6 });
    assert.ok(y[0].minutes >= 0 && y[0].until >= y[0].from);
    const hopperMoves = back.events.filter(e => e.kind === 'store.move' && e.chest === farm.id && e.via === 'trichter');
    assert.ok(hopperMoves.length <= 2, `Trichterbuchungen gebündelt (${hopperMoves.length})`);
  }
  const problems = log.split('\n').filter(l => /bauplaner/i.test(l) && /(WARN|ERROR|Exception)/i.test(l));
  assert.deepEqual(problems, [], 'keine Warnungen oder Fehler des Plugins im Serverprotokoll');
  console.log(`  Paper ${version} (Build ${build.id}): Lagerkisten – ${back.events.filter(e => e.kind.startsWith('store.')).length} Lagerereignisse; Planer-Faltung = Serverzustand.`);
} catch (error) {
  server?.kill('SIGKILL');
  throw error;
}
