// Real-player test of the checked storage chests (COOP-05, docs/architecture/team/LAGERKISTEN.md) with two bot players,
// driven by scripts/mod/test_bridge_paper_bots.sh:
//   node scripts/mod/bridge_paperbots.mjs <work> <plugin.jar> <minecraft version> <java> <mineflayer dir> <team room url> [teil]
// A real Paper server with the plugin takes its team from a local team room (wrangler dev, LINK-12 – no file). Two
// mineflayer players do what testers do in #/testphase: Anna_MC (Baumeister) and Ben_MC (Helfer) place, look at,
// open, fill, empty, shift- and double-click, extend and break chests. Every step is checked three ways: what the
// player sees (chat, action bar, own inventory), what the server counts (/bauplaner lager …) and what the planner
// folds from the team room (teamView). Teil „lager“ covers LAGER-01..05, -07, -11 (server side); teil „farm“ builds a
// real sugar cane farm (observer, piston, hopper minecart, hopper) into a yield store and checks the rate (LAGER-10).
// Server and team room come from the shared bench scripts/mod/lib/multiplayer.mjs. mineflayer 4.39 speaks up to 26.1
// (Paper 26.1.x is played with protocol 26.1); Paper 26.3 is not reachable for it yet – see docs/TESTING.md.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { createTeam, teamEvent, appendEvents, teamView, teamServerFile, mergeTeam, buildWorldShareDoc, mapShapes } from '../../dist/domain/src/index.js';
import { farmStatuses } from '../../dist/domain/src/materials/productionPlan.js';
import { paperServer, room } from './lib/multiplayer.mjs';

const [work, pluginJar, version, java, botDir, roomArg, part = 'lager'] = process.argv.slice(2);
if (!work || !pluginJar || !version || !java || !botDir || !roomArg) throw new Error('usage: bridge_paperbots.mjs <work> <plugin.jar> <version> <java> <mineflayer dir> <raum> [lager|farm]');
const roomBase = roomArg.replace(/\/+$/, '');
const need = createRequire(join(botDir, 'package.json'));
const mineflayer = need('mineflayer');
const { Vec3 } = need('vec3');
const BOT_VERSION = version.startsWith('26.1') ? '26.1' : version;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const t0 = Date.now();
const step = text => console.log(`    ${((Date.now() - t0) / 1000).toFixed(0).padStart(4)} s  ${text}`);

// ------------------------------------------------------------------ team as the planner sets it up
const ctx = { sections: [{ id: 'sec_fund', name: 'Fundament' }, { id: 'sec_roh', name: 'Rohbau' }],
  builders: [{ id: 'bld_phil', name: 'Philipp' }, { id: 'bld_anna', name: 'Anna' }, { id: 'bld_ben', name: 'Ben' }] };
let team = createTeam({ name: 'Lager am See', founder: 'bld_phil', server: 'localhost' });
team = appendEvents(team, [
  teamEvent('bld_anna', { kind: 'member.player', member: 'bld_anna', player: 'Anna_MC' }),
  teamEvent('bld_ben', { kind: 'member.player', member: 'bld_ben', player: 'Ben_MC' }),
]);
const ORIGIN = [1000, -60, 1000];
const file = teamServerFile({ team, view: teamView(team, ctx), projectName: 'Lager', origin: ORIGIN, dimension: 'minecraft:overworld',
  sections: [{ id: 'sec_fund', name: 'Fundament', members: [{ instanceId: 'i1', toLayer: 1 }] }, { id: 'sec_roh', name: 'Rohbau', members: [{ instanceId: 'i1', fromLayer: 2 }] }],
  steps: Array.from({ length: 6 }, (_, layer) => ({ instanceId: 'i1', layer, bounds: { min: [0, layer, 0], maxExclusive: [16, layer + 1, 16] } })),
  farms: [{ id: 'farm_rohr', name: 'Zuckerrohrfarm', items: ['minecraft:sugar_cane'] }] });
file.sections[0].need ??= [{ item: 'minecraft:stone', count: 100 }, { item: 'minecraft:oak_log', count: 5 }];
file.need ??= [{ item: 'minecraft:stone', count: 300 }, { item: 'minecraft:oak_log', count: 20 }];

// ------------------------------------------------------------------ server and team room: shared bench (scripts/mod/lib/multiplayer.mjs)
const dir = join(work, `bots-${part}-${version}`);
const server = await paperServer({ dir, version, java, pluginJar, properties: { 'allow-flight': 'true' } });
const build = { id: server.build };
const log_ = () => server.log.replace(/\x1b\[[0-9;]*m/g, '');
let running = false;
async function start() { await server.start(); running = true; }
async function until(what, test, seconds = 20) {
  const end = Date.now() + seconds * 1000;
  for (;;) {
    if (await test()) return;
    if (running && !server.running) throw new Error(`Server beendet beim Warten auf ${what}\n${log_().slice(-3000)}`);
    if (Date.now() > end) throw new Error(`Zeitüberschreitung (${seconds} s): ${what}\n--- Server\n${log_().slice(-2500)}\n--- Spieler\n${Object.values(bots).map(b => `${b.username}: ${b.text.slice(-1200)}`).join('\n')}`);
    await sleep(150);
  }
}
const console_ = async (line, pattern, seconds = 30) => (await server.run(line, pattern, seconds)).replace(/\x1b\[[0-9;]*m/g, '');
const stop = async () => { for (const b of Object.values(bots)) b.quit?.(); await sleep(300); running = false; await server.stop(); };

const teamRoom = await room(roomBase, { teamId: team.teamId, name: team.name });
const { events: _events, ...headerOnly } = file;
await teamRoom.header({ ...headerOnly, events: [], plan: { sha: 'c'.repeat(64), revisionNumber: 1, at: new Date().toISOString() } });
assert.deepEqual((await teamRoom.append(team.events)).rejected, []);
const feed = () => teamRoom.feed();
// KARTE-12: the planner's Weltplan with one locked site, put into the room like the planner does (document „weltplan“).
const OW = 'minecraft:overworld', LX = 1040, LZ = 1000;
if (part === 'weltplan') {
  const items = [{ kind: 'site', id: 'site_schmiede', name: 'Schmiede', note: '', dimension: OW, minX: LX, minZ: LZ, width: 8, length: 8, y: -60, projectId: null, locked: true }];
  const put = await teamRoom.call(`/v1/rooms/${teamRoom.id}/doc/weltplan?by=bld_phil`, { method: 'PUT', body: JSON.stringify(buildWorldShareDoc(items, { [OW]: mapShapes(null, items, OW) }, 'Philipp')), headers: { 'If-Match': '0' } }, teamRoom.memberKey);
  assert.equal(put.status, 200, JSON.stringify(put.body));
}
const plannerView = async () => { const merged = mergeTeam(team, { ...team, events: await feed() }); assert.equal(merged.clashes.length, 0); return { team: merged.team, view: teamView(merged.team, ctx) }; };
const link = teamRoom.link;

// ------------------------------------------------------------------ bot players
const bots = {};
async function login(name) {
  const bot = mineflayer.createBot({ host: '127.0.0.1', port: server.port, username: name, version: BOT_VERSION, auth: 'offline', hideErrors: true, checkTimeoutInterval: 120_000 });
  bot.text = ''; bot.bar = '';
  bot.on('messagestr', (m, position) => { if (position === 'game_info') bot.bar += m + '\n'; else bot.text += m + '\n'; });
  // Paper sends the action bar as its own packet (set_action_bar_text), not as overlay chat.
  const nbt = need('prismarine-nbt');
  bot._client.on('action_bar', d => { const raw = d.text?.type ? nbt.simplify(d.text) : typeof d.text === 'string' ? JSON.parse(d.text) : d.text; bot.bar += new (need('prismarine-chat')(bot.registry))(raw).toString() + '\n'; });
  if (process.env.BOT_PACKETS) bot._client.on('packet', (d, meta) => { if (!/entity|chunk|light|keep|time|position|move|head|velocity|bundle|ping|sound|particle|tick/.test(meta.name)) console.log('   >', name, meta.name, JSON.stringify(d).slice(0, 200)); });
  bot.on('error', e => { bot.text += `[Fehler] ${e.message}\n`; });
  bot.on('kicked', reason => { bot.text += `[Gekickt] ${JSON.stringify(reason)}\n`; });
  await new Promise((resolve, reject) => { bot.once('spawn', resolve); bot.once('end', r => reject(new Error(`${name} getrennt: ${r}\n${bot.text}`))); });
  bots[name] = bot;
  await sleep(500);
  return bot;
}
async function leave(bot) { const gone = new Promise(r => bot.once('end', r)); bot.quit(); await gone; delete bots[bot.username]; await sleep(500); }
/** Runs a command as the player and waits until its chat shows the pattern. */
async function say(bot, line, pattern, seconds = 20) {
  const from = bot.text.length;
  bot.chat(line);
  await until(`${bot.username}: ${line} → ${pattern}`, () => pattern.test(bot.text.slice(from)), seconds);
  await sleep(250);
  return bot.text.slice(from);
}
const center = (x, y, z) => new Vec3(x + 0.5, y + 0.5, z + 0.5);
async function goTo(bot, x, y, z) { await console_(`tp ${bot.username} ${x + 0.5} ${y} ${z + 0.5} 180 30`, /Teleported|teleportiert/i); await until(`${bot.username} steht bei ${x} ${z}`, () => bot.entity.position.distanceTo(new Vec3(x + 0.5, y, z + 0.5)) < 1.5); await sleep(400); }
async function look(bot, x, y, z) { await bot.lookAt(center(x, y, z), true); await sleep(200); }
/** Items of one kind the player really has (server side: /clear with count 0 only counts). */
const has = async (bot, item) => { const out = await console_(`clear ${bot.username} minecraft:${item} 0`, /Found \d+ matching|No items were found|Keine Gegenst/i); const m = out.match(/Found (\d+) matching/); return m ? Number(m[1]) : 0; };
const count = (bot, item) => bot.inventory.items().filter(i => i.name === item).reduce((n, i) => n + i.count, 0);
async function give(bot, what, n) { const before = count(bot, what.replace(/\[.*$/, '').replace('minecraft:', '')); await console_(`give ${bot.username} ${what} ${n}`, /Gave|gegeben/i); await until(`${bot.username} hat ${what}`, () => count(bot, what.replace(/\[.*$/, '').replace('minecraft:', '')) >= before + n); }
/** Places the held item on top of the block below (x, y-1, z); resolves true if the block appeared. */
async function place(bot, item, x, y, z) {
  await bot.equip(bot.registry.itemsByName[item].id, 'hand');
  const under = bot.blockAt(new Vec3(x, y - 1, z));
  try { await bot.placeBlock(under, new Vec3(0, 1, 0)); } catch { /* refused placement: checked below */ }
  await sleep(1000);
  return await blockIs(x, y, z, item);
}
/** Server truth for a block (the bot's own world may show a refused placement for a moment). */
const blockIs = async (x, y, z, item) => /Test passed/.test(await console_(`execute if block ${x} ${y} ${z} minecraft:${item}`, /Test (passed|failed)/));
async function open(bot, x, y, z) { await look(bot, x, y, z); const from = bot.bar.length; const w = await bot.openContainer(bot.blockAt(new Vec3(x, y, z))); await until(`${bot.username}: Aktionsleiste`, () => /Lager „/.test(bot.bar.slice(from)), 10); return { w, bar: bot.bar.slice(from) }; }
async function close(bot, w) { const from = bot.text.length; w.close(); await sleep(700); return bot.text.slice(from); }
const firstSlot = (w, item, top = true) => w.slots.findIndex((s, i) => s && s.name === item && (top ? i < w.inventoryStart : i >= w.inventoryStart));
const topCount = (w, item) => w.slots.slice(0, w.inventoryStart).filter(s => s && s.name === item).reduce((n, s) => n + s.count, 0);
async function click(bot, slot, button, mode) { try { await bot.clickWindow(slot, button, mode); } catch { /* refused by the server, resynced below */ } await sleep(500); }

const X = 1004, Y = -60, Z = 1004; // section 1 (layers 0–1 = y −60…−59), well inside its 16×16 box
try {
  await start();
    const connected = await console_(`bauplaner team verbinden ${link}`, /Mit dem Team-Raum von „Lager am See“ verbunden|Verbindung nicht möglich[^\n]*/);
  assert.match(connected, /verbunden/, connected);
  await until('Team-Raum live', async () => /Lager am See: live/.test(await console_('bauplaner team raum', /Lager am See: [^\n]*/)), 40);
  await console_('bauplaner rolle Anna_MC baumeister', /Anna ist jetzt Baumeister/);
  await console_(`forceload add ${X - 16} ${Z - 16} ${X + 16} ${Z + 16}`, /forceload|Chunk|marked/i);
  const anna = await login('Anna_MC'), ben = await login('Ben_MC');
  step(`Paper ${version} (Build ${build.id}), Spieler Anna_MC (Baumeister) und Ben_MC (Helfer) mit ${BOT_VERSION}`);

  if (part === 'lager') await storageDay(anna, ben);
  else if (part === 'farm') await farmDay(anna, ben);
  else if (part === 'weltplan') await worldPlanDay(anna, ben);
  else throw new Error(`Unbekannter Teil ${part}`);

  assert.deepEqual(server.problems(), [], 'keine Warnungen oder Fehler des Plugins im Serverprotokoll');
  console.log(`  Paper ${version} (Build ${build.id}): ${{ lager: 'Lagerkisten mit zwei Spielern', farm: 'Ertragsfarm', weltplan: 'gesperrter Bauplatz' }[part]} – bestanden in ${Math.round((Date.now() - t0) / 1000)} s.`);
} catch (error) {
  server.kill();
  throw error;
}
process.exit(0);

// ================================================================== KARTE-12 (Block B, 07.11.2026)
async function worldPlanDay(anna, ben) {
  const x = LX + 3, z = LZ + 3;
  await console_(`forceload add ${LX - 8} ${LZ - 8} ${LX + 16} ${LZ + 16}`, /forceload|Chunk|marked/i);
  await until('Weltplan aus dem Team-Raum', async () => /1 Eintr[^\n]*1 gesperrt/.test(await console_('bauplaner weltplan', /Sperren: [^\n]*/)), 60);
  assert.match(await console_('bauplaner weltplan sperren sperren', /Gesperrte Weltplan-Einträge: [^\n]*/), /geschützt/);
  // Ben (no OP) in the locked site: placing, breaking and emptying a bucket are refused, the chat names the site.
  await give(ben, 'minecraft:cobblestone', 4);
  await goTo(ben, x, Y, z + 2);
  let from = ben.text.length;
  assert.equal(await place(ben, 'cobblestone', x, Y, z), false, 'Setzen im gesperrten Bauplatz verhindert');
  assert.match(ben.text.slice(from), /Bauplatz „Schmiede“ ist im Weltplan gesperrt\. Hier kannst du nichts ändern\./);
  await console_(`setblock ${x + 1} ${Y} ${z} minecraft:oak_planks`, /Changed the block|geändert/i);
  await sleep(500);
  await look(ben, x + 1, Y, z);
  try { await ben.dig(ben.blockAt(new Vec3(x + 1, Y, z)), true); } catch { /* refused */ }
  await sleep(800);
  assert.ok(await blockIs(x + 1, Y, z, 'oak_planks'), 'Abbauen im gesperrten Bauplatz verhindert');
  await give(ben, 'minecraft:water_bucket', 1);
  await ben.equip(ben.registry.itemsByName.water_bucket.id, 'hand');
  await look(ben, x - 1, Y - 1, z);
  await sleep(300);
  ben.activateItem(); await sleep(300); ben.deactivateItem(); await sleep(1000);
  assert.equal(await blockIs(x - 1, Y, z, 'water'), false, 'Eimer im gesperrten Bauplatz verhindert');
  step('KARTE-12 „sperren“: Setzen, Abbauen und Eimer im gesperrten Bauplatz verhindert, Chat nennt „Schmiede“');
  // Outside the site Ben builds as usual.
  await goTo(ben, LX - 4, Y, LZ - 2);
  from = ben.text.length;
  assert.equal(await place(ben, 'cobblestone', LX - 4, Y, LZ - 4), true, 'außerhalb frei');
  assert.doesNotMatch(ben.text.slice(from), /gesperrt/);
  // Gegenprobe für den Eimer: außerhalb läuft das Wasser aus (der Eimer-Test oben prüft also wirklich die Sperre).
  await give(ben, 'minecraft:water_bucket', 1);
  await ben.equip(ben.registry.itemsByName.water_bucket.id, 'hand');
  await look(ben, LX - 6, Y - 1, LZ - 4);
  await sleep(300);
  ben.activateItem(); await sleep(300); ben.deactivateItem(); await sleep(1000);
  assert.ok(await blockIs(LX - 6, Y, LZ - 4, 'water'), 'außerhalb leert der Eimer');
  // „hinweis“: only the chat line, building goes through (right away after switching, no waiting).
  assert.match(await console_('bauplaner weltplan sperren hinweis', /Gesperrte Weltplan-Einträge: [^\n]*/), /Hinweis im Chat/);
  await goTo(ben, x, Y, z + 2);
  from = ben.text.length;
  assert.equal(await place(ben, 'cobblestone', x, Y, z), true, 'mit „hinweis“ erlaubt');
  await until('Hinweiszeile', () => /„Schmiede“ ist im Weltplan gesperrt\. Bitte nur nach Absprache bauen\./.test(ben.text.slice(from)), 5);
  step('KARTE-12 „hinweis“: Bauen erlaubt, nur die Chatzeile');
  // OPs (bauplaner.weltplan.umgehen) are exempt from „sperren“.
  await console_('bauplaner weltplan sperren sperren', /Gesperrte Weltplan-Einträge: [^\n]*/);
  await console_('op Anna_MC', /Made Anna_MC a server operator|operator/i);
  await give(anna, 'minecraft:cobblestone', 2);
  await goTo(anna, x + 2, Y, z + 2);
  from = anna.text.length;
  assert.equal(await place(anna, 'cobblestone', x + 2, Y, z), true, 'OP darf im gesperrten Bauplatz bauen');
  assert.doesNotMatch(anna.text.slice(from), /gesperrt/);
  from = ben.text.length;
  await goTo(ben, x + 1, Y, z + 3);
  assert.equal(await place(ben, 'cobblestone', x + 1, Y, z + 1), false, 'für Ben weiter gesperrt');
  step('KARTE-12 OP (bauplaner.weltplan.umgehen) ausgenommen, Ben weiter gesperrt');
}

// ================================================================== LAGER-01..05, -07, -11
async function storageDay(anna, ben) {
  let { view } = await plannerView();
  // LAGER-01: Baumeister places a chest, looks at it and marks it.
  await give(anna, 'minecraft:chest', 4);
  await goTo(anna, X, Y, Z + 2);
  assert.ok(await place(anna, 'chest', X, Y, Z), 'Anna setzt die Kiste');
  await look(anna, X, Y, Z);
  const marked = await say(anna, '/bp lager markieren Steinlager', /erstmals gezählt/);
  assert.match(marked, /Lager „Steinlager“ markiert/); assert.match(marked, /Zugeordnet: Abschnitt 1 Fundament/);
  assert.match(await say(anna, '/bp lager liste', /Steinlager · [^\n]*/), /Steinlager · [^\n]*geprüft/);
  step('LAGER-01 Kiste gesetzt, angeschaut und markiert: zugeordnet, erstmals gezählt, geprüft');

  // LAGER-02: the Helfer opens it (action bar), puts 64 stone in, takes 10 out, closes: booked to him.
  await give(ben, 'minecraft:stone', 64);
  await goTo(ben, X + 1, Y, Z + 2);
  let { w, bar } = await open(ben, X, Y, Z);
  assert.match(bar, /Lager „Steinlager“ · Abschnitt 1 Fundament · geprüft · du darfst einlegen und entnehmen/);
  await w.deposit(ben.registry.itemsByName.stone.id, null, 64);
  await sleep(400);
  await w.withdraw(ben.registry.itemsByName.stone.id, null, 10);
  assert.equal(topCount(w, 'stone'), 54);
  assert.match(await close(ben, w), /Gebucht im Lager „Steinlager“: \+54 stone/);
  assert.equal(await has(ben, 'stone'), 10);
  assert.match(await say(ben, `/bp lager verlauf bei ${X} ${Y} ${Z}`, /Ben[^\n]*\+64|Ben[^\n]*stone/), /Ben/);
  // A second chest next to it: refused for the Helfer, joins the store for the Baumeister.
  await give(ben, 'minecraft:chest', 1);
  const benPlaced = await place(ben, 'chest', X + 1, Y, Z);
  assert.equal(benPlaced, false, `Helfer darf nicht an das Lager anbauen (Kiste einzeln: ${await blockIs(X + 1, Y, Z, 'chest[type=single]')}, facing south: ${await blockIs(X + 1, Y, Z, 'chest[facing=south]')} / ${await blockIs(X, Y, Z, 'chest[facing=south]')})`);
  assert.match(ben.text, /An das Lager „Steinlager“ darf nur ein Baumeister anbauen/, ben.text);
  await goTo(anna, X + 1, Y, Z + 2);
  assert.ok(await place(anna, 'chest', X + 1, Y, Z), 'Baumeister baut an');
  assert.match(anna.blockAt(new Vec3(X + 1, Y, Z)).getProperties().type ?? '', /left|right/, 'Doppelkiste');
  // A filled shulker box is counted with its content.
  await give(ben, 'minecraft:shulker_box[minecraft:container=[{slot:0,item:{id:"minecraft:stone",count:32}}]]', 1);
  ({ w } = await open(ben, X, Y, Z));
  assert.equal(w.inventoryStart, 54, 'Doppelkiste: 54 Plätze');
  await w.deposit(ben.registry.itemsByName.shulker_box.id, null, 1);
  assert.match(await close(ben, w), /Gebucht im Lager „Steinlager“: [^\n]*\+1 shulker_box/);
  const info = await say(anna, `/bp lager info bei ${X} ${Y} ${Z}`, /Items: [^\n]*/);
  assert.match(info, /87 Items: [^\n]*86 stone/, 'Shulkerinhalt zählt mit');
  ({ view } = await plannerView());
  let store = view.stores.find(s => s.name === 'Steinlager');
  assert.ok(store.pos2, 'beide Hälften gehören zum Lager');
  assert.deepEqual(store.movedIn.bld_ben, { 'minecraft:shulker_box': 1, 'minecraft:stone': 86 }, 'Buchung zählt den Shulkerinhalt mit');
  step('LAGER-02 Aktionsleiste, +64/−10 gebucht, Anbau Helfer verhindert, Doppelkiste, Shulkerinhalt gezählt, Verlauf im Planer');

  // LAGER-03: Schutz abschnitt – the Helfer without the section can put in, not take out (click, shift, double click).
  await goTo(anna, X - 1, Y, Z + 2);
  await look(anna, X, Y, Z);
  assert.match(await say(anna, '/bp lager schutz abschnitt', /Schutz „abschnitt“/), /Schutz „abschnitt“/);
  ({ w } = await open(ben, X, Y, Z));
  assert.match(ben.bar, /du darfst nur einlegen/);
  const stoneTop = topCount(w, 'stone');
  await click(ben, firstSlot(w, 'stone'), 0, 0);                       // pick up
  if (w.selectedItem) await click(ben, firstSlot(w, 'stone'), 0, 0);
  await click(ben, firstSlot(w, 'stone'), 0, 1);                       // shift click
  const own = firstSlot(w, 'stone', false);
  await click(ben, own, 0, 0); await click(ben, own, 0, 6);           // pick up own stone, double click gathers
  if (w.selectedItem) await click(ben, own, 0, 0);
  await sleep(500);
  assert.equal(topCount(w, 'stone'), stoneTop, 'nichts aus dem Lager genommen');
  assert.match(ben.text, /Im Lager „Steinlager“ darfst du nicht entnehmen/);
  assert.equal(/Gebucht/.test(await close(ben, w)), false, 'verhinderte Klicks buchen nichts');
  assert.equal(await has(ben, 'stone'), 10, 'kein Item verschwunden oder verdoppelt');
  ({ w } = await open(ben, X, Y, Z));   // fresh window: the client's view after refused clicks is resynced
  await w.deposit(ben.registry.itemsByName.stone.id, null, 5);
  assert.match(await close(ben, w), /Gebucht im Lager „Steinlager“: \+5 stone/);
  assert.equal(await has(ben, 'stone'), 5, 'kein Item verschwunden oder verdoppelt');
  // Schutz gesperrt: putting in is refused too.
  assert.match(await say(anna, '/bp lager schutz gesperrt', /Schutz „gesperrt“/), /nur Baumeister und Bauleitung/);
  ({ w } = await open(ben, X, Y, Z));
  assert.match(ben.bar, /nur ansehen/);
  await click(ben, firstSlot(w, 'stone', false), 0, 1);
  await sleep(500);
  assert.equal(topCount(w, 'stone'), stoneTop + 5);
  assert.equal(await close(ben, w).then(t => /Gebucht/.test(t)), false);
  assert.equal(await has(ben, 'stone'), 5);
  step('LAGER-03 Schutz abschnitt (Klick, Umschalt, Doppelklick verhindert; Einlegen geht), gesperrt (beides verhindert), keine Verluste');

  // LAGER-04: the Helfer cannot break it; hoppers below/above; TNT next to it.
  await console_(`gamemode creative ${ben.username}`, /Set|gesetzt|game mode/i);
  await sleep(500);
  await look(ben, X, Y, Z);
  try { await ben.dig(ben.blockAt(new Vec3(X, Y, Z)), true); } catch { /* refused */ }
  await sleep(800);
  assert.equal(ben.blockAt(new Vec3(X, Y, Z))?.name, 'chest', 'Helfer kann das Lager nicht abbauen');
  assert.match(ben.text, /Das Lager „Steinlager“ darf nur die Bauleitung abbauen|darf nur ein Baumeister abbauen/);
  await console_(`gamemode survival ${ben.username}`, /Set|gesetzt|game mode/i);
  await console_(`setblock ${X} ${Y - 1} ${Z} minecraft:hopper`, /Changed the block|Block geändert/i);
  await console_(`setblock ${X + 1} ${Y + 1} ${Z} minecraft:hopper[facing=down]`, /Changed the block|Block geändert/i);
  await console_(`item replace block ${X + 1} ${Y + 1} ${Z} container.0 with minecraft:oak_log 5`, /Replaced|ersetzt/i);
  await sleep(6000);
  assert.match(await console_(`bauplaner lager pruefen bei ${X} ${Y} ${Z}`, /Steinlager“: [^\n]*/), /geprüft[^\n]*97 Items/, 'oberer Trichter füllt ein (87 + 5 stone + 5 oak_log), unterer zieht nichts');
  assert.match(await say(anna, `/bp lager verlauf bei ${X} ${Y} ${Z}`, /Trichter: \+\d oak_log/), /Trichter/);
  await console_(`summon minecraft:tnt ${X} ${Y} ${Z + 1} {Fuse:1s,fuse:1}`, /Summoned|beschworen/i);
  await sleep(3000);
  assert.equal(anna.blockAt(new Vec3(X, Y, Z))?.name, 'chest', 'Lager übersteht die Explosion');
  assert.match(await console_(`bauplaner lager pruefen bei ${X} ${Y} ${Z}`, /Steinlager“: [^\n]*/), /geprüft[^\n]*97 Items/);
  step('LAGER-04 Abbau durch Helfer verhindert, Trichter unten zieht nichts, oben füllt ein (Verlauf „Trichter“), TNT: Lager samt Inhalt bleibt');

  // LAGER-05: content changed without opening → found on the next look, Baumeister told (also on joining), seal.
  await console_(`item replace block ${X} ${Y} ${Z} container.20 with minecraft:dirt 5`, /Replaced|ersetzt/i);
  await leave(anna);
  const pruef = await say(ben, `/bp lager pruefen bei ${X} ${Y} ${Z}`, /Steinlager“: [^\n]*/);
  assert.match(pruef, /abweichend – \+5 dirt/);
  const anna2 = await login('Anna_MC');
  await until('Meldung beim Betreten', () => /1 Lager mit Abweichung oder fehlender Kiste \(Steinlager\)/.test(anna2.text), 15);
  await goTo(anna2, X - 1, Y, Z + 2);
  ({ w } = await open(anna2, X, Y, Z));
  await until('Abweichung beim Öffnen', () => /Offene Abweichung: \+5 dirt/.test(anna2.text), 5);
  await close(anna2, w);
  await look(anna2, X, Y, Z);
  assert.match(await say(anna2, '/bp lager siegeln Aufgeräumt', /gesiegelt/), /Abweichung \+5 dirt angenommen/);
  const sealed = await say(anna2, `/bp lager info bei ${X} ${Y} ${Z}`, /Zuletzt gesiegelt von [^\n]*/);
  assert.match(sealed, /Steinlager · geprüft/); assert.match(sealed, /Zuletzt gesiegelt von Anna/);
  step('LAGER-05 Änderung ohne Öffnen: „abweichend – +5 dirt“, Meldung beim Betreten und Öffnen, gesiegelt von Anna');

  // LAGER-03 (Rest): lager.modus hinweis – taking from „gesperrt“ is allowed, booked and reported to the Baumeister.
  await stop();
  const cfg = join(server.data, 'config.yml');
  writeFileSync(cfg, readFileSync(cfg, 'utf8').replace(/(lager:\n(?:.*\n)*?\s+modus: )sperren/, '$1hinweis'));
  assert.match(readFileSync(cfg, 'utf8'), /modus: hinweis/);
  await start();
  await until('Team-Raum live nach Neustart', async () => /Lager am See: live/.test(await console_('bauplaner team raum', /Lager am See: [^\n]*/)), 40);
  const a3 = await login('Anna_MC'), b3 = await login('Ben_MC');
  await goTo(a3, X - 1, Y, Z + 2); await goTo(b3, X + 1, Y, Z + 2);
  ({ w } = await open(b3, X, Y, Z));
  const before = topCount(w, 'dirt');
  await w.withdraw(b3.registry.itemsByName.dirt.id, null, 2);
  assert.equal(topCount(w, 'dirt'), before - 2);
  await until('Hinweis an den Helfer', () => /entnehmen ist hier eigentlich der Bauleitung vorbehalten – es wird gebucht/.test(b3.text), 5);
  assert.match(await close(b3, w), /Gebucht im Lager „Steinlager“: −2 dirt/);
  await until('Meldung an den Baumeister', () => /Ben_MC[^\n]*Steinlager[^\n]*−2 dirt|Steinlager[^\n]*Ben[^\n]*−2 dirt/.test(a3.text), 5);
  step('LAGER-03 Modus „hinweis“: Entnahme aus „gesperrt“ geht, wird gebucht, Baumeister bekommt eine Meldung');

  // LAGER-07: need per section and project, „sammle“ without amount, restart, planner.
  const need1 = await say(b3, '/bp lager bedarf 1', /Materialien liegen bereit/);
  const s1 = need1.match(/stone[^\n]*Bedarf 100 · im Lager (\d+)/);
  assert.ok(s1, need1); assert.match(need1, /oak_log[^\n]*Bedarf 5 · im Lager 5[^\n]*✓/);
  const needAll = await say(b3, '/bp lager bedarf', /Materialien liegen bereit/);
  // Amounts in stacks as the plugin prints them: 4×64+44 = 300.
  const amount = t => t.split('+').reduce((n, part) => n + (part.includes('×') ? part.split('×').reduce((a, b) => a * Number(b), 1) : Number(part)), 0);
  const sAll = needAll.match(/stone[^\n]*Bedarf ([\d×+]+) · im Lager ([\d×+]+) · fehlt ([\d×+]+)/);
  assert.ok(sAll, needAll);
  assert.equal(amount(sAll[1]), 300); assert.equal(amount(sAll[1]) - amount(sAll[2]), amount(sAll[3]));
  await say(a3, '/bp sammle stone 20', /Du sammelst 20 × stone/);
  const gather = await say(b3, '/bp sammle stone', /Du sammelst \d+ × stone/);
  assert.equal(Number(gather.match(/Du sammelst (\d+) × stone/)[1]), amount(sAll[3]) - 20, 'sammle ohne Menge = fehlt minus was andere sammeln');
  await stop();
  await start();
  await until('Team-Raum live nach zweitem Neustart', async () => /Lager am See: live/.test(await console_('bauplaner team raum', /Lager am See: [^\n]*/)), 40);
  const a4 = await login('Anna_MC');
  assert.match(await say(a4, '/bp lager liste', /Steinlager · [^\n]*/), /Steinlager · [^\n]*geprüft · Abschnitt 1 Fundament/);
  step('LAGER-07 Bedarf je Abschnitt/Projekt, „sammle“ ohne Menge, nach Neustart alle Lager da');

  // Planner (and LAGER-11 data): the team room has every store with status, section, protection, seal and bookings.
  await until('Serverereignisse im Raum', async () => (await feed()).some(e => e.kind === 'store.seal'), 30);
  ({ view } = await plannerView());
  store = view.stores.find(s => s.name === 'Steinlager');
  assert.equal(store.status, 'geprueft'); assert.equal(store.section, 'sec_fund'); assert.equal(store.protection, 'gesperrt');
  assert.equal(store.sealedBy, 'bld_anna'); assert.deepEqual(store.deviation, {});
  assert.equal(store.items['minecraft:dirt'], 3); assert.equal(store.items['minecraft:oak_log'], 5);
  assert.deepEqual(store.hopperIn, { 'minecraft:oak_log': 5 });
  assert.equal(store.movedOut.bld_ben['minecraft:dirt'], 2);
  assert.ok(store.countedAt && Date.now() - Date.parse(store.countedAt) < 15 * 60_000, 'vom Server gezählt vor wenigen Minuten');
  assert.equal(view.rejected.length, 0, 'keine abgelehnten Ereignisse');
  const events = await feed();
  assert.equal(new Set(events.map(e => e.id)).size, events.length, 'keine doppelten Ereignisse im Raum');
  step(`Planer: Team-Raum faltet ${events.filter(e => e.kind.startsWith('store.')).length} Lagerereignisse = Serverzustand (Status, Abschnitt, Schutz, Siegel, Buchungen je Spieler, Trichter)`);
  await stop();
}

// ================================================================== LAGER-10: a real sugar cane farm into a yield store
async function farmDay(anna, ben) {
  // Yield every 5 minutes (the plugin's minimum) so a test run sees two reports.
  await stop();
  const cfg = join(server.data, 'config.yml');
  writeFileSync(cfg, readFileSync(cfg, 'utf8').replace(/ertrag-minuten: \d+/, 'ertrag-minuten: 5'));
  await start();
  await until('Team-Raum live', async () => /Lager am See: live/.test(await console_('bauplaner team raum', /Lager am See: [^\n]*/)), 40);
  anna = await login('Anna_MC'); ben = await login('Ben_MC');
  // Faster growth (random ticks); the rule is random_tick_speed since 1.21.11, randomTickSpeed before.
  const rule = await console_('gamerule random_tick_speed 300', /now set|Incorrect|Unknown|unknown/i);
  if (!/now set/i.test(rule)) assert.match(await console_('gamerule randomTickSpeed 300', /now set|Incorrect|Unknown/i), /now set/i);
  // Farm in the air above the site: cane on sand (water beside it), a hopper minecart under the sand collects through it,
  // a hopper under the rail moves into the yield chest; an observer sees the third cane block and fires the piston.
  const fx = 1008, fz = 1008, base = -52;                       // cane base block
  const chestY = base - 4, hopperY = base - 3, railY = base - 2, sandY = base - 1;
  const cmds = [
    `fill ${fx - 3} ${chestY - 1} ${fz - 3} ${fx + 3} ${chestY - 1} ${fz + 3} minecraft:stone`,
    `setblock ${fx} ${chestY} ${fz} minecraft:chest`,
    `setblock ${fx} ${hopperY} ${fz} minecraft:hopper[facing=down]`,
    `setblock ${fx} ${railY} ${fz} minecraft:rail`,
    `setblock ${fx} ${sandY} ${fz} minecraft:sand`,
    `setblock ${fx - 1} ${sandY - 1} ${fz} minecraft:stone`, `setblock ${fx - 2} ${sandY} ${fz} minecraft:stone`,
    `setblock ${fx - 1} ${sandY} ${fz - 1} minecraft:stone`, `setblock ${fx - 1} ${sandY} ${fz + 1} minecraft:stone`,
    `setblock ${fx - 1} ${sandY} ${fz} minecraft:water`,
    `setblock ${fx} ${base} ${fz} minecraft:sugar_cane`,
    // glass around the cane column, so broken cane falls onto the sand above the hopper minecart
    `setblock ${fx - 1} ${base} ${fz} minecraft:glass`, `setblock ${fx + 1} ${base} ${fz} minecraft:glass`, `setblock ${fx} ${base} ${fz - 1} minecraft:glass`, `setblock ${fx} ${base} ${fz + 1} minecraft:glass`,
    `setblock ${fx - 1} ${base + 1} ${fz} minecraft:glass`, `setblock ${fx} ${base + 1} ${fz - 1} minecraft:glass`, `setblock ${fx} ${base + 1} ${fz + 1} minecraft:glass`,
    `setblock ${fx - 1} ${base + 2} ${fz} minecraft:glass`, `setblock ${fx} ${base + 2} ${fz - 1} minecraft:glass`, `setblock ${fx} ${base + 3} ${fz} minecraft:glass`,
    // piston pushes into the third cane block; observer watches it; its output strongly powers a block, dust leads to the piston
    `setblock ${fx + 1} ${base + 1} ${fz} minecraft:stone`, `setblock ${fx + 1} ${base + 2} ${fz} minecraft:piston[facing=west]`,
    `setblock ${fx} ${base + 2} ${fz + 1} minecraft:observer[facing=north]`,
    `setblock ${fx} ${base + 1} ${fz + 2} minecraft:stone`, `setblock ${fx} ${base + 2} ${fz + 2} minecraft:stone`,
    `setblock ${fx + 1} ${base + 1} ${fz + 2} minecraft:stone`, `setblock ${fx + 1} ${base + 1} ${fz + 1} minecraft:stone`,
    `setblock ${fx + 1} ${base + 2} ${fz + 2} minecraft:redstone_wire`, `setblock ${fx + 1} ${base + 2} ${fz + 1} minecraft:redstone_wire`,
  ];
  for (const c of cmds) await console_(c, /Changed the block|Block geändert|Successfully filled|filled|Could not set/i);
  await console_(`summon minecraft:hopper_minecart ${fx + 0.5} ${railY} ${fz + 0.5}`, /Summoned|beschworen/i);
  // Mark the collecting chest as yield store of the farm.
  await console_(`bauplaner lager markieren bei ${fx} ${chestY} ${fz} Rohrkiste`, /erstmals gezählt/);
  await console_(`bauplaner lager farm bei ${fx} ${chestY} ${fz} Zuckerrohrfarm`, /Ertragskiste der Farm „Zuckerrohrfarm“/);
  // Players stay near the farm (random ticks need a player in range), as an AFK spot would.
  await goTo(anna, fx - 3, chestY, fz - 3); await goTo(ben, fx + 3, chestY, fz - 3);
  step('LAGER-10 Zuckerrohrfarm gebaut (Beobachter, Kolben, Trichterlore, Trichter), Sammeltruhe als Ertragskiste der Farm markiert');

  if (process.env.FARM_DEBUG) for (let i = 0; i < 6; i++) {
    await sleep(15_000);
    const probe = [];
    for (const [what, cmd] of [['Rohr 2', `execute if block ${fx} ${base + 1} ${fz} minecraft:sugar_cane`], ['Rohr 3', `execute if block ${fx} ${base + 2} ${fz} minecraft:sugar_cane`],
      ['Kolben aus', `execute if block ${fx + 1} ${base + 2} ${fz} minecraft:piston[extended=true]`], ['Items', 'execute if entity @e[type=item]'], ['Lore', 'execute if entity @e[type=hopper_minecart]'],
      ['Draht', `execute if block ${fx + 1} ${base + 2} ${fz + 1} minecraft:redstone_wire`], ['Wasser', `execute if block ${fx - 1} ${sandY} ${fz} minecraft:water`]])
      probe.push(`${what}: ${(await console_(cmd, /Test (passed|failed)[^\n]*/)).match(/Test (passed|failed)[^\n]*/)[0]}`);
    probe.push((await console_('data get entity @e[type=hopper_minecart,limit=1] Items', /entity data|No entity|found/i)).split('\n').find(l => /data|No entity/.test(l)) ?? '');
    probe.push((await console_('data get entity @e[type=item,limit=1] Pos', /entity data|No entity|found/i)).split('\n').find(l => /data|No entity/.test(l)) ?? '');
    step('Sonde ' + probe.join(' · '));
  }
  const yieldNow = async () => Number((await console_(`bauplaner lager info bei ${fx} ${chestY} ${fz}`, /Ertragskiste der Farm „Zuckerrohrfarm“: \d+ Items/)).match(/: (\d+) Items in/)[1]);
  // Polled every 10 s: the server log (and the bench's copy of it) grows with every console answer.
  await until('Farm liefert in die Ertragskiste', async () => (await yieldNow()) > 0 || (await sleep(10_000), false), 300);
  step(`Farm läuft: ${await yieldNow()} Zuckerrohr in der Ertragskiste`);
  // Taking out does not count as yield: Ben takes what is there.
  await goTo(ben, fx + 1, chestY, fz + 1);
  const { w } = await open(ben, fx, chestY, fz);
  const inChest = topCount(w, 'sugar_cane');
  const yBefore = await yieldNow();
  if (inChest) await w.withdraw(ben.registry.itemsByName.sugar_cane.id, null, inChest);
  await close(ben, w);
  const yAfter = await yieldNow();
  assert.ok(yAfter >= yBefore, `Entnahme zählt nicht als Ertrag (${yBefore} → ${yAfter})`);
  await goTo(ben, fx + 3, chestY, fz - 3);
  // After 10 loaded minutes the server shows the rate per hour.
  const info = await (async () => { let out = ''; await until('Rate je Stunde nach 10 min', async () => /je Stunde/.test(out = await console_(`bauplaner lager info bei ${fx} ${chestY} ${fz}`, /Ertragskiste der Farm[^\n]*/)) || (await sleep(20_000), false), 13 * 60); return out; })();
  const m = info.match(/: (\d+) Items in (\d+) min geladen · (\d+) je Stunde/);
  assert.ok(m, info);
  step(`/bp lager info: ${m[1]} Items in ${m[2]} min · ${m[3]} je Stunde`);
  // The plugin reports every lager.ertrag-minuten counted from the server start, the chest was marked later: wait until
  // the reports in the room cover 10 loaded minutes (the planner, like /bp lager info, uses the rate from then on).
  const roomMinutes = async () => (await feed()).filter(e => e.kind === 'store.yield').reduce((n, e) => n + e.minutes, 0);
  await until('store.yield im Team-Raum über 10 min', async () => (await roomMinutes()) >= 10 || (await sleep(5_000), false), 420);
  await stop();

  // Planner: farm in the Produktion tab, rate from the yield store reported by the server.
  const { team: t, view } = await plannerView();
  const store = view.stores.find(s => s.name === 'Rohrkiste');
  assert.equal(store.purpose, 'ertrag'); assert.equal(store.farm, 'farm_rohr');
  const total = store.yieldIn['minecraft:sugar_cane'];
  assert.ok(total >= Number(m[1]), `Ertrag im Planer ${total} ≥ ${m[1]}`);
  assert.ok(!store.movedOut.bld_ben || store.yieldIn['minecraft:sugar_cane'] >= (store.movedOut.bld_ben['minecraft:sugar_cane'] ?? 0));
  const production = { schemaVersion: 1, farms: [{ id: 'farm_rohr', name: 'Zuckerrohrfarm', type: 'zuckerrohr', units: 1, state: 'laeuft' }], log: [], gatherHoursPerDay: 2, afkHoursPerDay: 0, simulationDistance: 10 };
  const [status] = farmStatuses(production, t);
  const rate = status.rates.find(r => r.itemId === 'minecraft:sugar_cane');
  assert.equal(rate.source, 'Lagerkiste', `Planer rechnet mit der Ertragskiste (${JSON.stringify(status.chest)} · ${status.issues.join(' | ')})`);
  assert.equal(status.chest.basis, 'server');
  const expected = Math.round(total / (store.yieldMinutes / 60) * 10) / 10;
  assert.ok(Math.abs(rate.perHour - expected) <= 1, `Rate im Planer ${rate.perHour}/h ≈ ${expected}/h`);
  step(`Planer „Produktion“: ${rate.perHour} Zuckerrohr/h, Quelle Lagerkiste (Server) über ${rate.measuredHours} h`);
}
