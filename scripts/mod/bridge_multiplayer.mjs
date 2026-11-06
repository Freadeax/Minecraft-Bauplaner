// Multiplayer acceptance on a real Paper server (Roadmap block 4): real players (mineflayer bots) and the team room.
// Plays the testphase cases TEAMBAU-06 (team on the server), LINK-12 (the server gets the team from the mod by
// itself), LINK-01/LINK-04 (pair the server, change its settings through the team room as from an iPad) end to end:
//   node scripts/mod/bridge_multiplayer.mjs <work> <plugin.jar> <version> <java> <mineflayer dir> <room url>
// Nobody types a server command in the tested flow; the console only sets up the world (give, tp, setblock) and
// stops the server. At the end the planner folds the room feed and must see exactly what the players did.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { createTeam, teamEvent, appendEvents, teamView, teamServerFile, mergeTeam } from '../../dist/domain/src/index.js';
import { paperServer, players, room as openRoom, signed, sleep, until } from './lib/multiplayer.mjs';

const [work, pluginJar, version, java, mineflayerDir, roomUrl, clientArg] = process.argv.slice(2);
// Bot protocol version: the server version, or the matching one the bot library knows (Paper 26.1.2 → 26.1).
const clientVersion = clientArg || version;
if (!work || !pluginJar || !version || !java || !mineflayerDir || !roomUrl) throw new Error('usage: bridge_multiplayer.mjs <work> <plugin.jar> <version> <java> <mineflayer dir> <room url>');

// ------------------------------------------------------------------ team as the planner sets it up
// Three sections side by side on the ground (one instance each), so players can build in each from the grass.
const ctx = { sections: [{ id: 'sec_fund', name: 'Fundament' }, { id: 'sec_roh', name: 'Rohbau' }, { id: 'sec_dach', name: 'Dach' }],
  builders: [{ id: 'bld_phil', name: 'Philipp' }, { id: 'bld_anna', name: 'Anna' }, { id: 'bld_ben', name: 'Ben' }] };
let team = createTeam({ name: 'Burg am See', founder: 'bld_phil', server: 'localhost' });
team = appendEvents(team, [
  teamEvent('bld_phil', { kind: 'member.player', member: 'bld_phil', player: 'Philipp' }),
  teamEvent('bld_anna', { kind: 'member.player', member: 'bld_anna', player: 'Anna' }),
  teamEvent('bld_ben', { kind: 'member.player', member: 'bld_ben', player: 'Ben' }),
  teamEvent('bld_phil', { kind: 'plan.release', revisionId: 'rev_1', revisionNumber: 1, summary: 'Erster Stand' }),
]);
const Y = -60; // first free layer of the flat world
const file = teamServerFile({ team, view: teamView(team, ctx), projectName: 'Burg', origin: [0, Y, 0], dimension: 'minecraft:overworld',
  sections: ctx.sections.map((s, i) => ({ id: s.id, name: s.name, members: [{ instanceId: `i${i + 1}` }] })),
  steps: ctx.sections.flatMap((_, i) => [0, 1, 2].map(layer => ({ instanceId: `i${i + 1}`, layer, bounds: { min: [i * 10, layer, 0], maxExclusive: [i * 10 + 5, layer + 1, 5] } }))) });
assert.deepEqual(file.sections.map(s => s.boxes[0]), [[0, Y, 0, 4, Y + 2, 4], [10, Y, 0, 14, Y + 2, 4], [20, Y, 0, 24, Y + 2, 4]]);
const OUTSIDE = [40, Y, 2], CHEST = [12, Y, 8];

const room = await openRoom(roomUrl, { teamId: team.teamId, name: team.name });
const { events: _fileEvents, ...headerOnly } = file;
await room.header({ ...headerOnly, events: [], plan: { sha: 'a'.repeat(64), revisionNumber: 1, at: new Date().toISOString() } });
assert.deepEqual((await room.append(team.events)).rejected, []);

const dir = join(work, `mp-${version}`);
mkdirSync(dir, { recursive: true });
const server = await paperServer({ dir, version, java, pluginJar, ops: ['Philipp'] });
const mp = players(server, mineflayerDir, clientVersion);
const results = [];
const step = text => { results.push(text); console.log(`    ✓ ${text}`); };

try {
  await server.start();
  assert.match(server.log, /Keine Teamdatei|keine Teamdatei|0 Team/i, 'Server startet ohne Teamdatei');
  // Setup only: grass floor is there (flat), give items, put a chest outside the sections, keep it day.
  for (const line of ['gamerule doDaylightCycle false', 'time set day', `forceload add -16 -16 48 16`]) server.send(line);
  await server.run(`setblock ${CHEST.join(' ')} minecraft:chest`, /Changed the block|Could not set/);

  // ---------------------------------------------------------------- LINK-12: the mod hands the room to the server
  const gast = await mp.join('Gast', { withMod: true });
  assert.match((await gast.ask('link.room', { link: room.link })).error ?? '', /nur ein Operator/, 'Nicht-OP darf keinen Raum übergeben');
  await gast.quit();
  const phil = await mp.join('Philipp', { withMod: true });
  const handed = await phil.ask('link.room', { link: room.link, teamName: team.name });
  assert.ok(!handed.error, handed.error);
  assert.match(handed.text, /Mit dem Team-Raum von „Burg am See“ verbunden/);
  assert.ok(!server.log.includes(room.serverKey), 'Serverschlüssel steht nie im Log');
  await until('Server im Raum online', async () => (await room.info()).serverOnline === true, 30, () => server.log);
  step('LINK-12: Nicht-OP abgewiesen, Mod der Bauleitung übergibt den Raum, Server ist ohne Datei und ohne Befehl im Team-Raum');

  // ---------------------------------------------------------------- TEAMBAU-06: sections, action bar, outline
  const anna = await mp.join('Anna');
  const ben = await mp.join('Ben', { withMod: true });
  for (const p of ['Anna', 'Ben', 'Philipp']) server.send(`give ${p} minecraft:stone 64`);
  server.send('give Anna minecraft:shulker_box[minecraft:container=[{slot:0,item:{id:"minecraft:oak_planks",count:16}}]] 1');
  await sleep(1500);
  await anna.cmd('bp abschnitte', /3\. Dach/);
  await anna.cmd('bp nehmen 2', /Abschnitt 2 „Rohbau“ gehört jetzt dir/);
  await anna.tp(12.5, Y, 2.5);
  const bar = await anna.bar(/Abschnitt 2 · Rohbau · in Arbeit · Anna/);
  const before = anna.particles.length;
  await anna.cmd('bp zeigen 2', /Umriss|Abschnitt 2/);
  await until('Partikelumriss', async () => anna.particles.length - before > 20, 6);
  step(`TEAMBAU-06: /bp abschnitte, /bp nehmen 2, Aktionsleiste „${bar.trim()}“, /bp zeigen 2 (${anna.particles.length - before} Partikel)`);

  // ---------------------------------------------------------------- building: inside, outside, foreign (hint)
  for (const x of [11, 12, 13]) assert.equal(await anna.place(x, Y, 3, 'minecraft:stone'), 'stone', `Anna setzt in Abschnitt 2 (${x})`);
  await anna.tp(OUTSIDE[0] + 0.5, Y, OUTSIDE[2] - 1.5);
  assert.equal(await anna.place(...OUTSIDE, 'minecraft:stone'), 'stone', 'Anna setzt außerhalb der Abschnitte');
  await ben.tp(12.5, Y, 0.5);
  const benFrom = ben.chat.length;
  assert.equal(await ben.place(12, Y, 1, 'minecraft:stone'), 'stone', 'Schutz „hinweis“: Ben darf im fremden Abschnitt setzen');
  await until('Hinweis im fremden Abschnitt', async () => /Abschnitt 2 „Rohbau“ baut Anna\. Bitte absprechen\./.test(ben.since(benFrom)), 6);
  step('TEAMBAU-06: Blöcke im eigenen Abschnitt, außerhalb und im fremden Abschnitt (Schutz „hinweis“ meldet „baut Anna. Bitte absprechen.“)');

  // ---------------------------------------------------------------- LINK-01 + LINK-04: pair, then switch protection from the „iPad“ (team room)
  const claim = await phil.ask('link.claim', { device: 'Planer · Test' });
  assert.ok(!claim.error, claim.error);
  const pair = { serverId: claim.serverId, owner: claim.owner, key: claim.key };
  assert.ok(!server.log.includes(pair.key), 'Kopplungsschlüssel steht nie im Log');
  const viaRoom = await room.control(signed(pair, 'config', { set: { 'team.schutz': 'sperren' } }));
  assert.equal(viaRoom.status, 200, JSON.stringify(viaRoom.body));
  assert.ok(!viaRoom.body.error, viaRoom.body.error);
  await server.waitFor(/Einstellungen aus dem Planer[^\n]*team\.schutz/, 10);
  const benFrom2 = ben.chat.length;
  assert.equal(await ben.place(13, Y, 1, 'minecraft:stone'), 'air', 'Schutz „sperren“: Setzen im fremden Abschnitt wird verhindert');
  assert.equal(await ben.dig(12, Y, 3), 'stone', 'Schutz „sperren“: Abbauen von Annas Block wird verhindert');
  await until('Sperrhinweis', async () => /baut Anna\. Hier kannst du nichts ändern\./.test(ben.since(benFrom2)), 6);
  assert.match(server.log, /team\.schutz/);
  step('LINK-01/LINK-04: Server per Klick gekoppelt, „Bauen in fremden Abschnitten: sperren“ über den Team-Raum (ohne Mod) – Bens Setzen und Abbauen im fremden Abschnitt werden verhindert');

  // ---------------------------------------------------------------- Baunachweis, nachweis aus, fertig, notiz
  await ben.cmd('bp nehmen 3', /Abschnitt 3 „Dach“ gehört jetzt dir/);
  await ben.tp(22.5, Y, 0.5);
  for (const x of [21, 22]) assert.equal(await ben.place(x, Y, 2, 'minecraft:stone'), 'stone');
  assert.equal(await ben.dig(21, Y, 2), 'air', 'Ben baut im eigenen Abschnitt ab');
  const fromAll = anna.chat.length;
  await anna.cmd('bp beitrag alle', /3\. Dach: 2 Blöcke · Ben 2/);
  const all1 = anna.since(fromAll);
  assert.match(all1, /2\. Rohbau: 4 Blöcke · Anna 3, Ben 1/);
  assert.match(all1, /Anna: 3 gesetzt, 0 abgebaut/);
  assert.match(all1, /Ben: 3 gesetzt, 1 abgebaut/);
  assert.ok(!/Anna: 4/.test(all1), 'Block außerhalb der Abschnitte zählt nicht');
  await ben.cmd('bp nachweis aus', /Baunachweis aus/);
  const fromAll2 = anna.chat.length;
  await anna.cmd('bp beitrag alle', /2\. Rohbau: 3 Blöcke · Anna 3/);
  await sleep(500);
  assert.ok(!/Ben/.test(anna.since(fromAll2)), `nach „nachweis aus“ keine Zahlen von Ben: ${anna.since(fromAll2)}`);
  await anna.cmd('bp fertig 2 Rohbau steht', /Abschnitt 2 „Rohbau“ als fertig gemeldet/);
  await anna.cmd('bp notiz frage Wo kommt die Treppe hin?', /Notiz gespeichert/);
  step('TEAMBAU-06: Baunachweis nur in Teamabschnitten (Anna 3, Ben 3/1, außerhalb nicht gezählt), „nachweis aus“ blendet Ben überall aus, fertig gemeldet, Notiz');

  // ---------------------------------------------------------------- team chest: mark, deposit (with shulker), take
  await phil.tp(CHEST[0] + 0.5, Y, CHEST[2] - 2.5);
  await phil.lookAt(...CHEST);
  await phil.cmd('bp lager markieren Hauptlager', /Lager „Hauptlager“ markiert/);
  await anna.tp(CHEST[0] + 0.5, Y, CHEST[2] - 2.5);
  await sleep(800);
  const fromIn = anna.chat.length;
  const stoneBefore = anna.count('stone');
  await anna.container(...CHEST, async win => {
    await win.deposit(anna.bot.registry.itemsByName.stone.id, null, stoneBefore);
    await win.deposit(anna.bot.registry.itemsByName.shulker_box.id, null, 1);
  });
  await until('Buchung Einlegen', async () => /Gebucht im Lager „Hauptlager“/.test(anna.since(fromIn)), 8);
  const booked = anna.since(fromIn);
  assert.match(booked, new RegExp(`\\+${stoneBefore} stone`), booked);
  assert.match(booked, /\+16 oak_planks|oak_planks|shulker/, `Shulkerinhalt wird mitgezählt: ${booked}`);
  const fromOut = anna.chat.length;
  await anna.container(...CHEST, async win => { await win.withdraw(anna.bot.registry.itemsByName.stone.id, null, 32); });
  await until('Buchung Entnehmen', async () => /Gebucht im Lager „Hauptlager“/.test(anna.since(fromOut)), 8);
  assert.match(anna.since(fromOut), /[−-]32 stone/);
  assert.equal(anna.count('stone'), 32);
  step(`TEAMBAU-06: Bauleitung markiert die Teamkiste mit Blick darauf, Anna legt ${stoneBefore} Stein und eine gefüllte Shulkerkiste ein und nimmt 32 heraus – jeweils gebucht`);

  // ---------------------------------------------------------------- planner side: room feed = server state
  await anna.cmd('bp beitrag', /Anna: 3 Blöcke gesetzt/); // flushes pending tallies
  let view;
  await until('Stand im Raum', async () => {
    const merged = mergeTeam(team, { ...team, events: await room.feed() });
    view = teamView(merged.team, ctx);
    const st = view.sections.find(s => s.sectionId === 'sec_roh');
    return st?.status === 'gemeldet' || (st?.status === 'fertig' && view.stores.length === 1 && view.members.find(m => m.id === 'bld_anna')?.placed === 3);
  }, 30, () => server.log);
  const st = id => view.sections.find(s => s.sectionId === id);
  const member = id => view.members.find(m => m.id === id);
  assert.equal(st('sec_roh').owner, 'bld_anna'); assert.equal(st('sec_dach').owner, 'bld_ben');
  assert.equal(member('bld_anna').placed, 3);
  assert.equal(member('bld_ben').tally, false); assert.equal(member('bld_ben').placed, 0, 'Bens Zahlen sind im Planer ausgeblendet');
  assert.equal(view.notes.length, 1); assert.equal(view.notes[0].tag, 'frage');
  assert.equal(view.stores.length, 1); assert.equal(view.stores[0].name, 'Hauptlager');
  assert.equal(view.stock['minecraft:stone'], stoneBefore - 32, JSON.stringify(view.stock));
  assert.equal(view.rejected.length, 0, JSON.stringify(view.rejected));
  const feed = await room.feed();
  assert.equal(new Set(feed.map(e => e.id)).size, feed.length, 'keine doppelten Ereignisse im Raum');
  step(`Planer: Raum-Feed (${feed.length} Ereignisse, ${feed.filter(e => e.origin === 'server').length} vom Server) gefaltet = Serverstand (Abschnitte, Baunachweis, Notiz, Lager ${JSON.stringify(view.stock)})`);

  // ---------------------------------------------------------------- restart: back in the room, protection stays
  for (const p of [anna, ben, phil]) await p.quit();
  await server.stop();
  await server.start();
  await until('Server nach Neustart wieder im Raum', async () => (await room.info()).serverOnline === true, 40, () => server.log);
  const anna2 = await mp.join('Anna');
  await anna2.tp(12.5, Y, 2.5);
  await anna2.bar(/Abschnitt 2 · Rohbau · (fertig|gemeldet)[^·]* · Anna/);
  const ben2 = await mp.join('Ben');
  await ben2.tp(12.5, Y, 0.5);
  assert.equal(await ben2.dig(11, Y, 3), 'stone', 'Schutz gilt nach dem Neustart weiter');
  await anna2.quit(); await ben2.quit();
  const feed2 = await room.feed();
  assert.equal(new Set(feed2.map(e => e.id)).size, feed2.length, 'nach Neustart keine doppelten Ereignisse');
  step('Neustart: Server verbindet sich selbst wieder mit dem Raum, Aktionsleiste und Schutz bleiben, keine doppelten Ereignisse');

  await server.stop();
  assert.deepEqual(server.problems(), [], 'keine Warnungen oder Fehler des Plugins im Serverprotokoll');
  console.log(`  Paper ${version} (Build ${server.build}): Mehrspieler-Abnahme bestanden – ${results.length} Schritte mit echten Spielern und Team-Raum.`);
} catch (e) {
  server.kill();
  throw e;
}
process.exit(0);
