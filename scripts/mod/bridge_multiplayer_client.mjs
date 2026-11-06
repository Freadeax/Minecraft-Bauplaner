// Driver of the multiplayer game test with the real client (Roadmap block 4, GAME-02 Mehrspieler, TEAMBAU-06 with the
// mod, LINK-12): team room as the planner sets it up, a real Paper server with the plugin, then waits for the
// Minecraft client (PaperMultiplayerTest.java) to join, makes it operator (like the server owner), and checks the
// team room and the server afterwards. Started by scripts/mod/test_multiplayer_client.sh.
//   node scripts/mod/bridge_multiplayer_client.mjs <io dir> <plugin.jar> <version> <java> <room url>
// Writes <io>/mp-paper.txt (address) and <io>/mp-room.json for the game; reads mp-player.txt and mp-done.txt.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { createTeam, teamEvent, appendEvents, teamView, teamServerFile, mergeTeam } from '../../dist/domain/src/index.js';
import { paperServer, room as openRoom, until } from './lib/multiplayer.mjs';

const [io, pluginJar, version, java, roomUrl] = process.argv.slice(2);
if (!io || !pluginJar || !version || !java || !roomUrl) throw new Error('usage: bridge_multiplayer_client.mjs <io> <plugin.jar> <version> <java> <room url>');

const ctx = { sections: [{ id: 'sec_fund', name: 'Fundament' }, { id: 'sec_roh', name: 'Rohbau' }], builders: [{ id: 'bld_phil', name: 'Philipp' }] };
let team = createTeam({ name: 'Burg am See', founder: 'bld_phil', server: 'localhost' });
team = appendEvents(team, [teamEvent('bld_phil', { kind: 'plan.release', revisionId: 'rev_1', revisionNumber: 1, summary: 'Erster Stand' })]);
const Y = -60;
const file = teamServerFile({ team, view: teamView(team, ctx), projectName: 'Burg', origin: [0, Y, 0], dimension: 'minecraft:overworld',
  sections: ctx.sections.map((s, i) => ({ id: s.id, name: s.name, members: [{ instanceId: `i${i + 1}` }] })),
  steps: ctx.sections.flatMap((_, i) => [0, 1].map(layer => ({ instanceId: `i${i + 1}`, layer, bounds: { min: [i * 10, layer, 0], maxExclusive: [i * 10 + 5, layer + 1, 5] } }))) });
// Material of section 1 for „/bauplaner team material“: the plan needs stone there.
const room = await openRoom(roomUrl, { teamId: team.teamId, name: team.name });
const { events: _e, ...header } = file;
await room.header({ ...header, events: [], plan: { sha: 'c'.repeat(64), revisionNumber: 1, at: new Date().toISOString() } });
assert.deepEqual((await room.append(team.events)).rejected, []);
// „Mein Spiel verbinden“ as Bauleitung: the planner hands room, member key and server key to the mod.
writeFileSync(join(io, 'mp-room.json'), JSON.stringify({ url: room.base, room: room.id, key: room.memberKey, member: 'bld_phil', memberName: 'Philipp', teamName: team.name, device: 'Minecraft', serverKey: room.serverKey }));

const dir = join(io, `paper-${version}`);
mkdirSync(dir, { recursive: true });
const server = await paperServer({ dir, version, java, pluginJar });
try {
  await server.start();
  server.send('time set noon'); server.send('forceload add -16 -16 32 16');
  writeFileSync(join(io, 'mp-paper.txt'), `127.0.0.1:${server.port}\n`);
  console.log(`  Paper ${version} (Build ${server.build}) läuft auf Port ${server.port}, Team-Raum ${room.id}.`);

  await until('Spieler-Name vom Spiel', async () => existsSync(join(io, 'mp-player.txt')), 900);
  const name = readFileSync(join(io, 'mp-player.txt'), 'utf8').trim();
  await server.waitFor(new RegExp(`${name} joined the game`), 600);
  // Setup like the server owner: operator, building material, standing south of section 1.
  await server.run(`op ${name}`, /Made .* a server operator|Nothing changed/);
  await server.run(`give ${name} minecraft:stone 16`, /Gave|Given/);
  await server.run(`tp ${name} 2.5 ${Y} -1.5 0 40`, /Teleported/);
  writeFileSync(join(io, 'mp-op.txt'), 'ok\n');

  await until('Spiel fertig', async () => existsSync(join(io, 'mp-done.txt')), 600, () => server.log);
  await server.waitFor(new RegExp(`${name} übergibt dem Server einen Team-Raum`), 5);
  assert.ok(!server.log.includes(room.serverKey), 'Serverschlüssel steht nie im Serverprotokoll');
  assert.equal((await room.info()).serverOnline, true, 'Server ist im Team-Raum');
  let view, feed;
  await until('Abschnitt und Baunachweis im Raum', async () => {
    feed = await room.feed();
    view = teamView(mergeTeam(team, { ...team, events: feed }).team, ctx);
    const me = view.members.find(m => m.player === name);
    return me && view.sections.find(s => s.sectionId === 'sec_fund')?.owner === me.id && me.placed === 3;
  }, 30, () => server.log);
  const me = view.members.find(m => m.player === name);
  const claim = feed.find(e => e.kind === 'section.claim' && e.section === 'sec_fund');
  assert.equal(claim.origin, 'server', 'Nehmen kam über den Teamkanal ins Plugin und von dort in den Raum');
  assert.equal(new Set(feed.map(e => e.id)).size, feed.length, 'keine doppelten Ereignisse');
  writeFileSync(join(io, 'mp-result.json'), JSON.stringify({ player: name, member: me.id, placed: me.placed, events: feed.length, server: feed.filter(e => e.origin === 'server').length, build: server.build }));
  await until('Spieler weg', async () => /left the game/.test(server.log), 60);
  await server.stop();
  assert.deepEqual(server.problems(), [], 'keine Warnungen oder Fehler des Plugins im Serverprotokoll');
  console.log(`  Paper ${version}: echter Client „${name}“ – Raum übergeben, Abschnitt 1 genommen, 3 Blöcke gezählt; Raum ${feed.length} Ereignisse (${feed.filter(e => e.origin === 'server').length} vom Server), Planer-Faltung = Serverstand.`);
} catch (e) {
  writeFileSync(join(io, 'mp-fehler.txt'), String(e?.stack ?? e));
  server.kill();
  throw e;
}
process.exit(0);
