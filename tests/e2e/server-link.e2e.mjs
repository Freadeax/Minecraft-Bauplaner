// Browser check of „Spiel und Server verbinden – ohne Befehle“ (LINK-03/04, docs/architecture/AUTO_LINK.md)
// against the mod simulator with a stand-in for the Paper plugin: pairing with the game by a click in the game,
// pairing the server with one click and changing a server setting by a signed control message.
// Run after `npm run build`: `npm run test:e2e`.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startModSimulator } from './modSimulator.mjs';
import { openSampleProject } from './start.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4318, MOD_PORT = 47733, ROOM_PORT = 47734, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
// TEAM_ROOM_URL=https://bauplaner-team.team-room.workers.dev: the iPad part goes through the real deployed team room;
// a WebSocket with the server key stands in for the Paper plugin and answers with the plugin stand-in.
const REAL = process.env.TEAM_ROOM_URL?.replace(/\/+$/, '');
let ROOM = { url: `http://127.0.0.1:${ROOM_PORT}`, room: 'r_simroom0001', key: 'simroommemberkey0123456789' };
let server, browser, mod, room, roomCalls = [], roomServerOnline = true, invite = '', serverKey = '', serverWs = null;

/** The Paper plugin side of the real room: hello with the server key, answers control frames (RoomLink.control). */
async function connectServerSocket() {
  const ws = new WebSocket(`${REAL.replace(/^http/, 'ws')}/v1/rooms/${ROOM.room}/live`);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error('Raum-WebSocket nicht erreichbar')); });
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.type === 'control') ws.send(JSON.stringify({ type: 'control.answer', id: m.id, answer: mod.pluginControl(m) }));
  };
  ws.send(JSON.stringify({ type: 'hello', key: serverKey, member: 'server', device: 'sim-plugin', where: 'server' }));
  for (let i = 0; i < 40; i++) {
    const info = await (await fetch(`${REAL}/v1/rooms/${ROOM.room}`, { headers: { Authorization: `Bearer ${ROOM.key}` } })).json();
    if (info.serverOnline) return ws;
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('Simulierter Server im echten Raum nicht online');
}

/** Team room stand-in (services/team-room LINK-05): passes control messages to the plugin stand-in behind the mod simulator. */
function startRoom() {
  return new Promise(resolve => {
    const r = http.createServer(async (req, res) => {
      const cors = { 'Access-Control-Allow-Origin': req.headers.origin ?? '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
      const send = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', ...cors }); res.end(JSON.stringify(body)); };
      if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
      if (req.headers.authorization !== `Bearer ${ROOM.key}`) return send(401, { error: 'schluessel-falsch', message: 'Der Schlüssel passt nicht.' });
      const chunks = []; for await (const c of req) chunks.push(c);
      const path = new URL(req.url, ROOM.url).pathname;
      roomCalls.push(`${req.method} ${path}`);
      if (req.method === 'GET' && path === `/v1/rooms/${ROOM.room}`) return send(200, { protocol: 'team-room', room: ROOM.room, serverOnline: roomServerOnline });
      if (req.method === 'POST' && path === `/v1/rooms/${ROOM.room}/control`) {
        if (!roomServerOnline) return send(409, { error: 'server-offline', message: 'Der Server ist gerade nicht mit dem Team-Raum verbunden.' });
        return send(200, mod.pluginControl(JSON.parse(Buffer.concat(chunks).toString())));
      }
      send(404, { error: 'nicht-gefunden', message: 'Unbekannte Adresse.' });
    });
    r.listen(ROOM_PORT, '127.0.0.1', () => resolve(r));
  });
}

before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  mod = await startModSimulator(MOD_PORT, { protocol: 2, features: ['scan', 'marks2', 'players', 'bigplans', 'team', 'pairask', 'server'] });
  if (REAL) {
    const created = await (await fetch(`${REAL}/v1/rooms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamId: 'team_linktest', name: 'LINK-Browsertest' }) })).json();
    ROOM = { url: REAL, room: created.room, key: created.memberKey };
    serverKey = created.serverKey;
    serverWs = await connectServerSocket();
  } else room = await startRoom();
  browser = await chromium.launch();
});
after(async () => { serverWs?.close(); await browser?.close(); await mod?.close(); room?.close(); server?.kill(); });

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Server ohne Befehle: Spiel per Klick, Server koppeln, Einstellung ändern (${viewport.width}px)`, async () => {
    Object.assign(mod.state, { teamLink: 'none', asks: [], op: true });
    Object.assign(mod.state.plugin, { owners: [], controls: [] });
    mod.state.plugin.settings['team.schutz'] = 'hinweis';
    const context = await browser.newContext({ viewport });
    await context.addInitScript(port => { if (!sessionStorage.getItem('init')) { sessionStorage.setItem('init', '1'); localStorage.setItem('bauplaner.spielverbindung', JSON.stringify({ port, token: '', auto: false })); } }, MOD_PORT);
    const p = await context.newPage();
    p.setDefaultTimeout(20_000);
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|clipboard|status of 40/i.test(m.text())) errors.push(m.text()); });

    await p.goto(`${BASE}#/mod`);
    const panel = p.locator('[data-server-view]');
    await panel.scrollIntoViewIfNeeded();
    await p.waitForFunction(() => document.querySelector('[data-server-view]')?.getAttribute('data-server-view') === 'unpaired');

    // 1. Pair with the game: the question appears in the game, the player clicks „Planer zulassen“.
    await panel.getByRole('button', { name: 'Mit dem Spiel verbinden' }).click();
    await panel.getByText('Jetzt im Spiel J drücken und „Planer zulassen“ klicken.').waitFor();
    assert.equal(mod.state.asks.length, 1, 'eine Anfrage an die Mod');
    assert.ok(mod.approveAsk(), 'im Spiel zugelassen');
    await panel.getByText(/verbunden · Mod/).waitFor();
    await panel.getByText('Mit dem Spiel verbunden.').waitFor();
    const token = await p.evaluate(() => JSON.parse(localStorage.getItem('bauplaner.spielverbindung')).token);
    assert.ok(mod.state.tokens.has(token), 'Schlüssel aus dem Spiel gespeichert');
    await panel.getByText('Das Spiel ist mit keinem Server verbunden').waitFor();

    // 2. The server has the plugin, the player still has to allow team play in the game.
    mod.state.teamLink = 'ask';
    await panel.getByText('Im Spiel J drücken und „Teambau erlauben“ klicken.').waitFor({ timeout: 12_000 });
    mod.state.teamLink = 'live';
    await panel.getByText('„LMNT Testserver“ · Bauplaner-Plugin 0.12.0-sim').waitFor({ timeout: 12_000 });

    // 3. Pair the server with one click.
    await panel.getByRole('button', { name: 'Server koppeln' }).click();
    await panel.getByText('dieser Browser steuert den Server').waitFor();
    assert.equal(mod.state.plugin.owners.length, 1, 'ein gekoppeltes Gerät');
    await panel.getByRole('heading', { name: 'Einstellungen von „LMNT Testserver“' }).waitFor();
    const pairings = await p.evaluate(() => JSON.parse(localStorage.getItem('bauplaner.server.kopplungen')));
    assert.equal(pairings.srv_simserver1.owner, mod.state.plugin.owners[0].id);

    // 4. Change a setting: a signed config message reaches the plugin.
    await panel.getByLabel('Bauen in fremden Abschnitten').selectOption('sperren');
    await panel.getByRole('button', { name: '1 Änderung übernehmen' }).click();
    await panel.getByText('1 Einstellung(en) übernommen.').waitFor();
    assert.equal(mod.state.plugin.settings['team.schutz'], 'sperren');
    const config = mod.state.plugin.controls.find(c => c.op === 'config');
    assert.deepEqual(config, { set: { 'team.schutz': 'sperren' }, server: 'srv_simserver1', op: 'config' });
    assert.ok(mod.state.plugin.controls.some(c => c.op === 'status'), 'Status signiert gelesen');

    // 5. Another own device: the server is connected with a team room (as by „Server mit dem Raum verbinden“), the
    //    PC makes a link for the iPad.
    await p.evaluate(r => { const all = JSON.parse(localStorage.getItem('bauplaner.server.kopplungen')); all.srv_simserver1.room = r; localStorage.setItem('bauplaner.server.kopplungen', JSON.stringify(all)); }, ROOM);
    await panel.getByText('Weiteres Gerät freigeben (z. B. iPad)').click();
    await panel.getByRole('button', { name: 'Freigabe-Link erstellen' }).click();
    await panel.getByText('Freigabe für „iPad“ erstellt.').waitFor();
    invite = await panel.getByLabel('Freigabe-Link').inputValue();
    assert.match(invite, /#\/mod\?geraet=[A-Za-z0-9_-]+$/);
    assert.equal(mod.state.plugin.owners.length, 2, 'zweites Gerät im Plugin');

    // 6. No horizontal overflow, no errors.
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `kein waagrechtes Scrollen (${overflow}px)`);
    await p.screenshot({ path: `/tmp/claude-0/server-link-${viewport.width}.png`, fullPage: false });
    assert.deepEqual(errors, []);
    await context.close();
  });
}

test('iPad ohne Mod: Freigabe-Link öffnen, Server über den Team-Raum einstellen', async () => {
  assert.ok(invite, 'Freigabe-Link aus dem PC-Test');
  roomCalls = []; roomServerOnline = true;
  const context = await browser.newContext({ viewport: { width: 820, height: 1180 } });
  // No Minecraft on this device: the mod port answers nothing.
  await context.addInitScript(() => { if (!sessionStorage.getItem('init')) { sessionStorage.setItem('init', '1'); localStorage.setItem('bauplaner.spielverbindung', JSON.stringify({ port: 47799, token: '', auto: false })); } });
  const p = await context.newPage();
  p.setDefaultTimeout(20_000);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|clipboard|status of 40|ERR_CONNECTION_REFUSED/i.test(m.text())) errors.push(m.text()); });
  await p.goto(invite.replace('https://freadeax.github.io/Minecraft-Bauplaner/', BASE).replace(/^http:\/\/127\.0\.0\.1:\d+\/Minecraft-Bauplaner\//, BASE));
  const panel = p.locator('[data-server-view]');
  await panel.getByText('Dieses Gerät steuert jetzt „LMNT Testserver“ – auch ohne Mod über den Team-Raum.').waitFor();
  assert.equal(new URL(p.url()).hash, '#/mod', 'Schlüssel aus der Adresszeile entfernt');
  await p.waitForFunction(() => document.querySelector('[data-server-view]')?.getAttribute('data-server-view') === 'no-mod');
  await panel.getByRole('heading', { name: /Einstellungen von „LMNT Testserver“/ }).waitFor();
  await panel.getByText('· über den Team-Raum').waitFor();
  await panel.getByLabel('Lagerschutz').selectOption('hinweis');
  await panel.getByRole('button', { name: '1 Änderung übernehmen' }).click();
  await panel.getByText('1 Einstellung(en) übernommen.').waitFor();
  assert.equal(mod.state.plugin.settings['lager.modus'], 'hinweis');
  if (!REAL) assert.ok(roomCalls.includes(`POST /v1/rooms/${ROOM.room}/control`), 'über den Raum gesendet');
  const owners = mod.state.plugin.owners.map(o => o.name);
  assert.deepEqual(owners.slice(-1), ['iPad']);
  await panel.getByText('iPad (dieses Gerät)').waitFor();

  // LINK-06: a project from the world map onto the server, anchored at its map position (no mod on this device).
  await p.goto(`${BASE}#/`);
  await openSampleProject(p);
  await p.waitForURL(/#\/projekt\//);
  await p.goto(`${BASE}#/karte`);
  await p.locator('.map-page[data-map-state=ready]').waitFor({ timeout: 30_000 });
  await p.getByRole('button', { name: 'Platzieren' }).first().click();
  await p.getByRole('status').filter({ hasText: 'Auf die Weltkarte gesetzt' }).waitFor();
  await p.getByRole('complementary', { name: 'Projekte auf der Karte' }).getByRole('button', { name: /Burgmauer/ }).first().click();
  await p.getByRole('button', { name: '⇪ Auf den Server legen' }).click();
  await p.getByRole('status').filter({ hasText: /„LMNT Testserver“ \(über den Team-Raum\): Plan „burgmauer-beispiel-rev\d+“ liegt auf dem Server\. Anker -?\d+ -?\d+ -?\d+ \(minecraft:overworld\)\. Revision \d+\./ }).waitFor();
  const plan = mod.state.plugin.plans.at(-1);
  assert.equal(plan.magic, '1f8b', 'gzip-komprimierte .schem');
  assert.equal(plan.anchor.length, 3);
  await p.goto(`${BASE}#/mod`);

  // Server offline: a clear message instead of a hang.
  roomServerOnline = false;
  if (REAL) { serverWs.close(); serverWs = null; await new Promise(r => setTimeout(r, 1500)); }
  await p.reload();
  await panel.getByRole('button', { name: '„LMNT Testserver“ einstellen' }).click();
  await panel.getByText('Der Server ist gerade nicht mit dem Team-Raum verbunden').waitFor();
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `kein waagrechtes Scrollen (${overflow}px)`);
  assert.deepEqual(errors, []);
  await context.close();
});
