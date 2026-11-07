// Shared test bench for multiplayer acceptance tests (Roadmap block 4, „Mehrspieler und Server automatisch abnehmen“):
// a real Paper server with the Build Studio plugin, real players as bots (mineflayer: they move, place and break blocks,
// open chests, read chat and the action bar) and the team room (services/team-room, e.g. `npx wrangler dev`).
// Players can additionally speak the team channel `bauplaner:team` like the Build Studio mod does.
//
//   import { paperServer, players, room, roomFold } from './lib/multiplayer.mjs';
//
// The bots need `mineflayer` (installed into a work folder by the shell script, never into the repo), so the
// library takes the folder it lives in. Other block threads (Lagerkisten, Mod) use the same bench.
import { spawn } from 'node:child_process';
import { createHash, createHmac } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

export const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Offline-mode UUID like the server computes it (for ops.json written as a file, not typed). */
export function offlineUuid(name) {
  const h = createHash('md5').update(`OfflinePlayer:${name}`).digest();
  h[6] = (h[6] & 0x0f) | 0x30; h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

/** Downloads (cached, checksum checked) the newest stable Paper build of a version; shared with the other Paper tests. */
export async function paperJar(version) {
  const cache = join(process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'bauplaner-paper');
  mkdirSync(cache, { recursive: true });
  const builds = await (await fetch(`https://fill.papermc.io/v3/projects/paper/versions/${version}/builds`)).json();
  const build = builds.find(b => b.channel === 'STABLE') ?? builds[0];
  if (!build) throw new Error(`Kein Paper-Build für ${version}`);
  const download = build.downloads['server:default'];
  const file = join(cache, download.name);
  if (!existsSync(file)) {
    const bytes = Buffer.from(await (await fetch(download.url)).arrayBuffer());
    assert.equal(createHash('sha256').update(bytes).digest('hex'), download.checksums.sha256, 'Prüfsumme des Paper-Downloads');
    writeFileSync(file, bytes);
  }
  return { file, build: build.id };
}

/**
 * A real Paper server in `dir` with the plugin jar (and optional extra plugin jars). `ops` are written to ops.json
 * (as an owner would have it), `config` (text) to plugins/BauplanerBridge/config.yml before the first start.
 * The console is used for test setup only (give, tp, setblock) – the tested flow runs through players.
 */
export async function paperServer({ dir, version, java, pluginJar, extraPlugins = [], ops = [], properties = {}, memory = '2G' }) {
  const { file: serverJar, build } = await paperJar(version);
  mkdirSync(join(dir, 'plugins'), { recursive: true });
  copyFileSync(pluginJar, join(dir, 'plugins', 'bauplaner-bridge-paper.jar'));
  for (const p of extraPlugins) copyFileSync(p, join(dir, 'plugins', p.split('/').pop()));
  writeFileSync(join(dir, 'eula.txt'), 'eula=true\n');
  const port = 27_000 + Math.floor(Math.random() * 2000);
  const props = {
    'online-mode': 'false', 'server-port': String(port), 'level-type': version.startsWith('1.18') ? 'flat' : 'minecraft\\:flat',
    'generate-structures': 'false', 'spawn-protection': '0', 'view-distance': '4', 'simulation-distance': '4',
    'spawn-monsters': 'false', 'spawn-animals': 'false', 'spawn-npcs': 'false', 'enable-rcon': 'false', 'gamemode': 'survival', 'difficulty': 'peaceful', 'white-list': 'false', 'enforce-whitelist': 'false',
    ...properties,
  };
  writeFileSync(join(dir, 'server.properties'), Object.entries(props).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
  writeFileSync(join(dir, 'ops.json'), JSON.stringify(ops.map(name => ({ uuid: offlineUuid(name), name, level: 4, bypassesPlayerLimit: false }))));

  let proc, log = '', exited = Promise.resolve(0);
  const waiters = [];
  const waitFor = (pattern, seconds = 30, from = 0) => new Promise((resolve, reject) => {
    if (pattern.test(log.slice(from))) return resolve(log.slice(from));
    const w = { pattern, from };
    const timer = setTimeout(() => { waiters.splice(waiters.indexOf(w), 1); reject(new Error(`Zeitüberschreitung (${seconds} s) beim Warten auf ${pattern}\n${log.slice(-3000)}`)); }, seconds * 1000);
    w.resolve = () => { clearTimeout(timer); resolve(log.slice(from)); };
    waiters.push(w);
    exited.then(code => { clearTimeout(timer); reject(new Error(`Server beendet (${code}) beim Warten auf ${pattern}\n${log.slice(-3000)}`)); });
  });
  const server = {
    dir, port, version, build,
    data: join(dir, 'plugins/BauplanerBridge'),
    get log() { return log; },
    get running() { return !!proc && proc.exitCode === null; },
    waitFor,
    async start() {
      log = ''; waiters.length = 0;
      proc = spawn(java, [`-Xmx${memory}`, '-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', '-jar', serverJar, '--nogui'], { cwd: dir, stdio: ['pipe', 'pipe', 'pipe'] });
      const onData = chunk => {
        log += chunk.toString();
        for (const w of [...waiters]) if (w.pattern.test(log.slice(w.from))) { waiters.splice(waiters.indexOf(w), 1); w.resolve(); }
      };
      proc.stdout.on('data', onData); proc.stderr.on('data', onData);
      exited = new Promise(r => proc.on('exit', code => r(code)));
      await waitFor(/Done \(\d/, 600);
    },
    send(line) { proc.stdin.write(line + '\n'); },
    /** Console line, waits for `pattern` in the log written after it. */
    async run(line, pattern, seconds = 30) { const from = log.length; server.send(line); return waitFor(pattern, seconds, from); },
    async stop() { if (!server.running) return; server.send('stop'); await exited; },
    kill() { if (server.running) proc.kill('SIGKILL'); },
    /** Plugin warnings and errors (none expected in a green run). */
    problems() { return log.split('\n').filter(l => /(WARN|ERROR)\]?:? .*BauplanerBridge|BauplanerBridge.*(Exception|Fehler beim)/.test(l) && !/Plugin-Kanal|not registered/.test(l)); },
  };
  return server;
}

const CHANNEL = 'bauplaner:team';
const flat = msg => {
  if (msg == null) return '';
  if (typeof msg === 'string') return msg;
  if (typeof msg.toString === 'function' && msg.constructor?.name === 'ChatMessage') return msg.toString();
  try { return JSON.stringify(msg); } catch { return String(msg); }
};

/** Plain text of a chat component (JSON string, object or NBT-shaped object as mineflayer delivers it). */
function plain(c) {
  if (c == null) return '';
  if (typeof c === 'string') { try { return plain(JSON.parse(c)); } catch { return c; } }
  if (Array.isArray(c)) return c.map(plain).join('');
  if (typeof c === 'object') {
    if ('type' in c && 'value' in c) return plain(c.value); // NBT tag
    return (c.text ?? c[''] ?? '') + (c.extra ? plain(c.extra) : '') + (c.with ? plain(c.with) : '');
  }
  return String(c);
}

/**
 * Real players as bots. `mineflayerDir` is a folder with `mineflayer` installed. Each player can chat commands and wait
 * for the answer, read action bars, place and break blocks, open containers and – like the Build Studio mod – ask on the
 * team channel (`withMod: true`).
 */
export function players(server, mineflayerDir, clientVersion = server.version) {
  const require = createRequire(join(mineflayerDir, 'package.json'));
  const mineflayer = require('mineflayer');
  const { Vec3 } = require('vec3');
  return {
    Vec3,
    async join(name, { withMod = false } = {}) {
      const bot = mineflayer.createBot({ host: '127.0.0.1', port: server.port, username: name, version: clientVersion, auth: 'offline', hideErrors: true, checkTimeoutInterval: 120_000 });
      const chat = [], bars = [], particles = [];
      let channelAnswers = new Map(), req = 0;
      bot.on('messagestr', (text, position) => { if (position === 'game_info') bars.push(text); else chat.push(text); });
      bot.on('actionBar', msg => bars.push(flat(msg)));
      await new Promise((resolve, reject) => {
        bot.once('spawn', resolve);
        bot.once('kicked', r => reject(new Error(`${name} gekickt: ${flat(r)}`)));
        bot.once('error', reject);
        bot.once('end', r => reject(new Error(`${name} getrennt: ${r}`)));
      });
      bot._client.on('world_particles', p => particles.push(p));
      // Action bar straight from the packets (mineflayer's own events differ between versions).
      bot._client.on('system_chat', p => { if (p.isActionBar || p.overlay) bars.push(plain(p.content ?? p.formattedMessage)); });
      bot._client.on('action_bar', p => bars.push(plain(p.text)));
      bot._client.on('set_action_bar_text', p => bars.push(plain(p.text)));
      if (withMod) {
        bot._client.on('custom_payload', p => {
          if (p.channel !== CHANNEL) return;
          let m; try { m = JSON.parse(Buffer.from(p.data).toString('utf8')); } catch { return; }
          if (m.t === 'answer' && channelAnswers.has(m.req)) { channelAnswers.get(m.req)(m); channelAnswers.delete(m.req); }
        });
        bot._client.write('custom_payload', { channel: 'minecraft:register', data: Buffer.from(CHANNEL) });
        await sleep(500);
      }
      const player = {
        name, bot, chat, bars, particles, Vec3,
        /** Chat command (without slash) and wait for a chat line matching `pattern`; returns that line. */
        async cmd(line, pattern, seconds = 15) {
          const from = chat.length;
          bot.chat('/' + line);
          for (let i = 0; i < seconds * 10; i++) {
            const hit = chat.slice(from).find(l => pattern.test(l));
            if (hit) return hit;
            await sleep(100);
          }
          throw new Error(`${name}: keine Antwort auf /${line} passend zu ${pattern}\nChat: ${chat.slice(from).join(' | ')}\n${server.log.slice(-1500)}`);
        },
        /** All chat lines after `from` (index) joined. */
        since(from) { return chat.slice(from).join('\n'); },
        async bar(pattern, seconds = 6) {
          const from = Math.max(0, bars.length - 1);
          for (let i = 0; i < seconds * 10; i++) { const hit = bars.slice(from).find(b => pattern.test(b)); if (hit) return hit.match(pattern)[0]; await sleep(100); }
          throw new Error(`${name}: keine Aktionsleiste passend zu ${pattern} (zuletzt: ${bars.slice(-3).join(' | ')})`);
        },
        /** Places the held item on top of the block below `pos` (x y z of the new block). */
        async place(x, y, z, item) {
          if (item) await player.hold(item);
          const ref = bot.blockAt(new Vec3(x, y - 1, z));
          await bot.lookAt(new Vec3(x + 0.5, y, z + 0.5), true);
          try { await bot.placeBlock(ref, new Vec3(0, 1, 0)); } catch (e) { if (!/blockUpdate|did not fire|Server refused/.test(String(e.message))) throw e; }
          await sleep(300);
          return bot.blockAt(new Vec3(x, y, z))?.name;
        },
        async dig(x, y, z) {
          const b = bot.blockAt(new Vec3(x, y, z));
          await bot.lookAt(new Vec3(x + 0.5, y + 0.5, z + 0.5), true);
          try { await bot.dig(b, true); } catch { /* cancelled by the server */ }
          await sleep(400);
          return bot.blockAt(new Vec3(x, y, z))?.name;
        },
        /** Teleports the player (console, setup only) and waits until the client stands there with the chunks loaded. */
        async tp(x, y, z) {
          server.send(`tp ${name} ${x} ${y} ${z}`);
          for (let i = 0; i < 100; i++) {
            const pos = bot.entity?.position;
            if (pos && Math.abs(pos.x - x) < 0.6 && Math.abs(pos.z - z) < 0.6 && bot.blockAt(new Vec3(Math.floor(x), Math.floor(y) - 1, Math.floor(z)))) { await sleep(700); return; }
            await sleep(100);
          }
          throw new Error(`${name}: Teleport nach ${x} ${y} ${z} kam nicht an`);
        },
        async hold(item) {
          const it = bot.inventory.items().find(i => i.name === item.replace('minecraft:', ''));
          if (!it) throw new Error(`${name} hat kein ${item}`);
          await bot.equip(it, 'hand');
        },
        count(item) { return bot.inventory.items().filter(i => i.name === item.replace('minecraft:', '')).reduce((a, i) => a + i.count, 0); },
        async lookAt(x, y, z) { await bot.lookAt(new Vec3(x + 0.5, y + 0.5, z + 0.5), true); await sleep(200); },
        /** Opens the container at x y z, runs `fn(window)` (deposit/withdraw), closes it. */
        async container(x, y, z, fn) {
          const block = bot.blockAt(new Vec3(x, y, z));
          await bot.lookAt(new Vec3(x + 0.5, y + 0.5, z + 0.5), true);
          const win = await bot.openContainer(block);
          try { await fn(win); } finally { win.close(); }
          await sleep(600);
        },
        /** Team channel like the mod (needs `withMod`). */
        ask(t, fields = {}) {
          return new Promise((resolve, reject) => {
            const id = `r${++req}`;
            const timer = setTimeout(() => reject(new Error(`${name}: keine Antwort auf ${t}\n${server.log.slice(-2000)}`)), 15_000);
            channelAnswers.set(id, m => { clearTimeout(timer); resolve(m); });
            bot._client.write('custom_payload', { channel: CHANNEL, data: Buffer.from(JSON.stringify({ v: 1, t, req: id, ...fields })) });
          });
        },
        async quit() { bot.quit(); await sleep(500); },
      };
      return player;
    },
  };
}

/** Signed control message like packages/domain/src/team/serverControl.ts (controlMessage). */
let lastSeq = 0;
export function signed(pair, op, fields = {}, serverId = pair.serverId) {
  const seq = lastSeq = Math.max(Date.now(), lastSeq + 1);
  const body = JSON.stringify({ ...fields, server: serverId, op });
  const sig = createHmac('sha256', pair.key).update(`${pair.owner}\n${seq}\n${body}`).digest('base64url');
  return { owner: pair.owner, seq, body, sig };
}

/**
 * Team room as the planner uses it (services/team-room protocol v1): create a room, put the plan header, append
 * events, read the feed, control the server (LINK-05).
 */
export async function room(base, { teamId, name }) {
  base = base.replace(/\/+$/, '');
  const call = async (path, init = {}, key) => {
    const r = await fetch(base + path, { ...init, headers: { 'Content-Type': 'application/json', ...(key && { Authorization: `Bearer ${key}` }), ...init.headers } });
    const text = await r.text(); let body; try { body = JSON.parse(text); } catch { body = text; }
    return { status: r.status, body };
  };
  const created = await call('/v1/rooms', { method: 'POST', body: JSON.stringify({ teamId, name }) });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const { room: id, adminKey, memberKey, serverKey } = created.body;
  let batch = 0;
  return {
    base, id, adminKey, memberKey, serverKey, call,
    link: `https://freadeax.github.io/Minecraft-Bauplaner/#/team/beitreten?raum=${encodeURIComponent(base)}&id=${id}&s=${encodeURIComponent(serverKey)}`,
    async header(header) { const r = await call(`/v1/rooms/${id}/header`, { method: 'PUT', body: JSON.stringify(header) }, adminKey); assert.equal(r.status, 200, JSON.stringify(r.body)); },
    async append(events, key = adminKey) {
      const r = await call(`/v1/rooms/${id}/events`, { method: 'POST', body: JSON.stringify({ batch: `b_test_${++batch}_${Date.now()}`, events }) }, key);
      assert.equal(r.status, 200, JSON.stringify(r.body));
      return r.body;
    },
    async feed() { const all = []; let after = ''; for (;;) { const p = (await call(`/v1/rooms/${id}/events?after=${after}`, {}, memberKey)).body; all.push(...p.events); after = p.cursor; if (!p.more) return all; } },
    async info() { return (await call(`/v1/rooms/${id}`, {}, memberKey)).body; },
    async control(msg, key = memberKey) { return call(`/v1/rooms/${id}/control`, { method: 'POST', body: JSON.stringify(msg) }, key); },
    /** A device key of its own, as „Mein Spiel verbinden“ hands it to the mod (never the invitation or the admin key). */
    async deviceKey(key = adminKey, label = 'Minecraft') {
      const r = await call(`/v1/rooms/${id}/keys`, { method: 'POST', body: JSON.stringify({ label }) }, key);
      assert.equal(r.status, 201, JSON.stringify(r.body));
      return r.body.key;
    },
  };
}

/** Polls `test` (async) until true. */
export async function until(what, test, seconds = 20, log = () => '') {
  for (let i = 0; i < seconds * 4; i++) { if (await test()) return; await sleep(250); }
  throw new Error(`Zeitüberschreitung: ${what}\n${log().slice(-2000)}`);
}

/** Reads a JSON file of the plugin's data folder. */
export const readJson = file => JSON.parse(readFileSync(file, 'utf8'));
