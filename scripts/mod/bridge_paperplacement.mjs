// Real-server test of MAP-07 (turned and mirrored world placement, docs/architecture/welt/WORLDMAP.md): the game itself
// is the reference. A probe structure with many direction-bearing blocks (stairs, door, double chest, bed, rails,
// fence, wall, pane, sign, banner, log, piston, ladder, lever, trapdoor, jigsaw, repeater) is built on a real Paper
// server, saved with a structure block and placed again with the game's own `/place template <rotation> <mirror>`
// for all 8 placements. Every cell of the placed box is then compared block by block (`execute if block`) with
//   1. the mod's rule (mod-core Placement.java, run through scripts/mod/PlacementProbe.java) and
//   2. the planner's rule (placeToWorld + turnState from packages/domain, used for "Ins Spiel senden"),
// which both have to agree with each other and with the game. Finally the planner sends a turned + mirrored and
// then a turned placement to the plugin as team header (teamServerFile, via the team room): the plugin's section
// boxes must cover exactly the cells where the game placed that section's blocks.
// Needs `npm run build:core`, mod-core classes (gradle :mod-core:classes), JDK 25, network to fill.papermc.io and a
// running team room (npx wrangler dev in services/team-room). Not part of `npm run check`.
import { spawn, execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { placeToWorld, turnState, createTeam, appendEvents, teamEvent, teamView, teamServerFile } from '../../dist/domain/src/index.js';

const [work, pluginJar, version, java, modCore] = process.argv.slice(2);
const roomBase = (process.argv[7] ?? 'http://127.0.0.1:8787').replace(/\/+$/, '');
if (!work || !pluginJar || !version || !java || !modCore) throw new Error('usage: bridge_paperplacement.mjs <work> <plugin.jar> <version> <java> <mod-core classes> [raum]');

// ------------------------------------------------------------------ probe structure (project coordinates)
// Box 9 × 3 × 7, floor at y 0 with three different corner blocks so every position mistake shows.
const SIZE = [9, 3, 7];
const probe = new Map();
for (let x = 0; x < SIZE[0]; x++) for (let z = 0; z < SIZE[2]; z++) probe.set(`${x},0,${z}`, 'minecraft:smooth_stone');
const put = (x, y, z, s) => probe.set(`${x},${y},${z}`, s);
put(0, 0, 0, 'minecraft:gold_block'); put(8, 0, 0, 'minecraft:diamond_block'); put(0, 0, 6, 'minecraft:emerald_block');
put(0, 1, 0, 'minecraft:oak_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]');
put(2, 1, 0, 'minecraft:oak_door[facing=north,half=lower,hinge=left,open=false,powered=false]');
put(2, 2, 0, 'minecraft:oak_door[facing=north,half=upper,hinge=left,open=false,powered=false]');
put(4, 1, 0, 'minecraft:rail[shape=north_east,waterlogged=false]');
put(6, 1, 0, 'minecraft:oak_fence[east=true,north=false,south=false,waterlogged=false,west=false]');
put(7, 1, 0, 'minecraft:stone');
put(0, 1, 2, 'minecraft:chest[facing=south,type=right,waterlogged=false]');
put(1, 1, 2, 'minecraft:chest[facing=south,type=left,waterlogged=false]');
put(3, 1, 2, 'minecraft:oak_sign[rotation=3,waterlogged=false]');
put(5, 1, 2, 'minecraft:oak_log[axis=x]');
put(7, 1, 2, 'minecraft:repeater[delay=2,facing=west,locked=false,powered=false]');
put(0, 1, 4, 'minecraft:ladder[facing=north,waterlogged=false]');
put(0, 1, 5, 'minecraft:stone');
put(2, 1, 4, 'minecraft:piston[extended=false,facing=east]');
put(4, 1, 3, 'minecraft:stone');
put(4, 1, 4, 'minecraft:glass_pane[east=false,north=true,south=false,waterlogged=false,west=false]');
put(6, 1, 4, 'minecraft:white_banner[rotation=11]');
put(8, 1, 4, 'minecraft:lever[face=floor,facing=east,powered=false]');
put(2, 1, 6, 'minecraft:oak_trapdoor[facing=east,half=top,open=true,powered=false,waterlogged=false]');
put(0, 2, 6, 'minecraft:red_bed[facing=east,occupied=false,part=foot]');
put(1, 2, 6, 'minecraft:red_bed[facing=east,occupied=false,part=head]');
put(0, 1, 6, 'minecraft:stone'); put(1, 1, 6, 'minecraft:stone');
put(4, 1, 6, 'minecraft:jigsaw[orientation=east_up]');
put(6, 1, 6, 'minecraft:stone_brick_wall[east=low,north=none,south=none,up=true,waterlogged=false,west=none]');
put(7, 1, 6, 'minecraft:stone');
// Stairs corner: the east-facing stairs has a north-facing one in front of it, so it is outer_left.
put(4, 2, 2, 'minecraft:oak_stairs[facing=east,half=bottom,shape=outer_left,waterlogged=false]');
put(5, 2, 2, 'minecraft:oak_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]');
const cells = [];
for (let x = 0; x < SIZE[0]; x++) for (let y = 0; y < SIZE[1]; y++) for (let z = 0; z < SIZE[2]; z++) cells.push({ p: [x, y, z], state: probe.get(`${x},${y},${z}`) ?? 'minecraft:air' });

const parseState = text => {
  const open = text.indexOf('[');
  if (open < 0) return { id: text, properties: {} };
  return { id: text.slice(0, open), properties: Object.fromEntries(text.slice(open + 1, -1).split(',').map(kv => kv.split('='))) };
};
const stateText = s => { const p = Object.entries(s.properties).sort(([a], [b]) => a.localeCompare(b)); return p.length ? `${s.id}[${p.map(([k, v]) => `${k}=${v}`).join(',')}]` : s.id; };
const norm = t => stateText(parseState(t));

const PLACEMENTS = [0, 1, 2, 3].flatMap(turns => [false, true].map(mirror => ({ turns, mirror })));
const ROTATION = ['none', 'clockwise_90', '180', 'counterclockwise_90'];

// The mod's rule for every cell and placement in one Java run.
const input = PLACEMENTS.flatMap(pl => cells.map(c => `${pl.turns} ${pl.mirror} ${c.p.join(' ')} ${c.state}`)).join('\n') + '\n';
const javaOut = execFileSync(java, ['-cp', modCore, 'scripts/mod/PlacementProbe.java'], { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim().split('\n');
assert.equal(javaOut.length, PLACEMENTS.length * cells.length, 'PlacementProbe-Ausgabe');

// ------------------------------------------------------------------ Paper download (cached, shared with the other real-server tests)
const cache = join(process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'bauplaner-paper');
mkdirSync(cache, { recursive: true });
const builds = await (await fetch(`https://fill.papermc.io/v3/projects/paper/versions/${version}/builds`)).json();
const build = builds.find(b => b.channel === 'STABLE') ?? builds[0];
const dl = build.downloads['server:default'];
const serverJar = join(cache, dl.name);
if (!existsSync(serverJar)) {
  const bytes = Buffer.from(await (await fetch(dl.url)).arrayBuffer());
  assert.equal(createHash('sha256').update(bytes).digest('hex'), dl.checksums.sha256, 'Prüfsumme des Paper-Downloads');
  writeFileSync(serverJar, bytes);
}
const dir = join(work, `placement-${version}`);
mkdirSync(join(dir, 'plugins/BauplanerBridge'), { recursive: true });
copyFileSync(pluginJar, join(dir, 'plugins', 'bauplaner-bridge-paper.jar'));
writeFileSync(join(dir, 'eula.txt'), 'eula=true\n');
const port = 26_600 + Math.floor(Math.random() * 300);
writeFileSync(join(dir, 'server.properties'), ['online-mode=false', `server-port=${port}`, 'level-type=minecraft\\:flat', 'generate-structures=false', 'spawn-protection=0',
  'view-distance=3', 'simulation-distance=3', 'spawn-monsters=false', 'spawn-animals=false', 'enable-rcon=false', 'enable-command-block=true'].join('\n') + '\n');

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
  const onData = chunk => { log += chunk.toString(); for (const w of [...waiters]) if (w.pattern.test(log.slice(w.from))) { waiters.splice(waiters.indexOf(w), 1); w.resolve(); } };
  server.stdout.on('data', onData); server.stderr.on('data', onData);
  exited = new Promise(r => server.on('exit', code => r(code)));
  await waitFor(/Done \(\d/, 900);
}
const send = line => server.stdin.write(line + '\n');
const run = async (line, pattern, seconds = 30) => { const from = log.length; send(line); await waitFor(pattern, seconds, from); return log.slice(from); };
const stop = async () => { send('stop'); await exited; };
let seq = 0;
/** `execute if block` for many cells; the game answers each with "Test passed" or "Test failed". */
async function checkBlocks(list) {
  const fails = [];
  for (let i = 0; i < list.length; i += 40) {
    const part = list.slice(i, i + 40), from = log.length, mark = `bpcheck${++seq}`;
    for (const c of part) send(`execute if block ${c.w.join(' ')} ${c.state}`);
    send(`say ${mark}`);
    await waitFor(new RegExp(mark), 60, from);
    const answers = log.slice(from).match(/Test (passed|failed)/g) ?? [];
    assert.equal(answers.length, part.length, `Antworten auf execute if block\n${log.slice(from, from + 2000)}`);
    answers.forEach((a, k) => { if (a.endsWith('failed')) fails.push(part[k]); });
  }
  return fails;
}
/** For a failed cell: the state the game actually has there, property by property (for the report). */
const VALUES = ['north', 'east', 'south', 'west', 'up', 'down', 'left', 'right', 'single', 'x', 'y', 'z', 'true', 'false', 'none', 'low', 'tall',
  'straight', 'inner_left', 'inner_right', 'outer_left', 'outer_right', 'top', 'bottom', 'upper', 'lower', 'head', 'foot', 'floor', 'wall', 'ceiling',
  'north_south', 'east_west', 'north_east', 'north_west', 'south_east', 'south_west', ...Array.from({ length: 16 }, (_, k) => String(k)),
  ...['down', 'up', 'north', 'south', 'west', 'east'].flatMap(a => ['down', 'up', 'north', 'south', 'west', 'east'].map(b => `${a}_${b}`))];
async function actualState(c) {
  const { id, properties } = parseState(c.state);
  if (!/passed/.test(await run(`execute if block ${c.w.join(' ')} ${id}`, /Test (passed|failed)/))) return 'anderer Block';
  const found = {};
  for (const k of Object.keys(properties)) {
    for (const v of VALUES) if (/passed/.test(await run(`execute if block ${c.w.join(' ')} ${id}[${k}=${v}]`, /Test (passed|failed)|HERE/))) { found[k] = v; break; }
  }
  return `im Spiel ${stateText({ id, properties: { ...properties, ...found } })}`;
}

const Y = -60; // flat world: grass at -61, first free layer -60
const SRC = [0, Y, 0];
const anchorOf = i => [40 + 24 * (i % 4), Y, 40 + 24 * Math.floor(i / 4)];

try {
  await start();
  await run('forceload add -16 -16 160 120', /chunks? (forcibly loaded|marked)|already|Marked/i, 120);
  // 1. Build the probe with setblock and check that the game keeps exactly these states.
  for (const c of cells) if (c.state !== 'minecraft:air') send(`setblock ${c.p[0] + SRC[0]} ${c.p[1] + SRC[1]} ${c.p[2] + SRC[2]} ${c.state}`);
  await run('say gebaut', /gebaut/);
  const srcFails = await checkBlocks(cells.map(c => ({ ...c, w: [c.p[0] + SRC[0], c.p[1] + SRC[1], c.p[2] + SRC[2]] })));
  assert.deepEqual(srcFails.map(f => `${f.p} ${f.state}`), [], 'Probe steht wie gesetzt');
  // 2. Save it with a structure block (west of the box, offset 1) – powered in SAVE mode it stores the template.
  const sb = [SRC[0] - 1, SRC[1], SRC[2]];
  await run(`setblock ${sb.join(' ')} minecraft:structure_block[mode=save]{mode:"SAVE",name:"bauplaner:probe",posX:1,posY:0,posZ:0,sizeX:${SIZE[0]},sizeY:${SIZE[1]},sizeZ:${SIZE[2]},ignoreEntities:1b,showboundingbox:0b}`, /Changed the block|Could not set/);
  await run(`setblock ${sb[0] - 1} ${sb[1]} ${sb[2]} minecraft:redstone_block`, /Changed the block|Could not set/);
  await new Promise(r => setTimeout(r, 1500));

  let checked = 0, chestQuirks = 0;
  for (const [i, pl] of PLACEMENTS.entries()) {
    const anchor = anchorOf(i);
    const placed = await run(`place template bauplaner:probe ${anchor.join(' ')} ${ROTATION[pl.turns]} ${pl.mirror ? 'front_back' : 'none'}`, /(Loaded template|Placed structure)[^\n]*|Failed[^\n]*|[Ii]nvalid[^\n]*|Unknown[^\n]*/, 60);
    assert.match(placed, /Loaded template|Placed structure/, placed);
    const list = cells.map((c, k) => {
      const [jx, jy, jz, js] = javaOut[i * cells.length + k].split(' ');
      const mod = { w: [Number(jx) + anchor[0], Number(jy) + anchor[1], Number(jz) + anchor[2]], state: norm(js) };
      const planner = { w: placeToWorld(c.p, { origin: anchor, ...(pl.turns && { turns: pl.turns }), ...(pl.mirror && { mirror: true }) }), state: stateText(turnState(parseState(c.state), pl)) };
      assert.deepEqual(planner.w, mod.w, `Planer und Mod: Position von ${c.p} bei ${JSON.stringify(pl)}`);
      assert.equal(planner.state, mod.state, `Planer und Mod: Zustand von ${c.state} bei ${JSON.stringify(pl)}`);
      return { ...mod, src: c.state, p: c.p };
    });
    const fails = await checkBlocks(list);
    const report = [], chests = [];
    for (const f of fails) {
      const actual = await actualState(f);
      // The game's own structure mirror keeps a double chest's type and then splits it into two single chests
      // (vanilla ChestBlock.mirror only turns the facing). The rule flips left/right so the pair stays one double
      // chest; that this is a valid double chest is checked below by setting it and reading it back.
      if (pl.mirror && /chest\[/.test(f.state) && /type=(left|right)/.test(f.state) && /type=single/.test(actual)) chests.push(f);
      else report.push(`${f.p} ${f.src} → erwartet ${f.w.join(' ')} ${f.state}: ${actual}`);
    }
    assert.deepEqual(report, [], `Spiel weicht von der Regel ab bei Drehung ${pl.turns}, gespiegelt ${pl.mirror}`);
    if (chests.length) {
      assert.equal(chests.length, 2, 'nur die Doppelkiste');
      for (const c of chests) send(`setblock ${c.w.join(' ')} ${c.state}`);
      await run('say kisten', /kisten/);
      assert.deepEqual((await checkBlocks(chests)).map(f => f.state), [], 'gespiegelte Doppelkiste der Regel bleibt im Spiel eine Doppelkiste');
      chestQuirks++;
    }
    checked += list.length;
    console.log(`  ${ROTATION[pl.turns]}${pl.mirror ? ' + front_back' : ''}: ${list.length} Zellen wie Spiel, Mod und Planer${chests.length ? ' (Doppelkiste: Spiel teilt sie beim Spiegeln, Regel hält sie zusammen – vom Spiel bestätigt)' : ''}`);
  }

  // 3. Plugin: sections of a turned + mirrored, then a turned placement (team header from the team room, no file).
  const sectionsOf = { sec_boden: 'Boden', sec_tuer: 'Tür und Treppe' };
  let team = createTeam({ name: 'Drehprobe', founder: 'bld_phil', server: 'localhost' });
  team = appendEvents(team, [teamEvent('bld_phil', { kind: 'plan.release', revisionId: 'rev_1', revisionNumber: 1, summary: 'Probe' })]);
  const ctx = { sections: Object.entries(sectionsOf).map(([id, name]) => ({ id, name })), builders: [{ id: 'bld_phil', name: 'Philipp' }] };
  // Step boxes as the planner's guide has them: layer 0 the floor, layer 1–2 the door column and the stairs.
  const steps = [{ instanceId: 'i1', layer: 0, bounds: { min: [0, 0, 0], maxExclusive: [9, 1, 7] } },
    { instanceId: 'i1', layer: 1, bounds: { min: [0, 1, 0], maxExclusive: [3, 3, 1] } }];
  const header = (pl, anchor) => {
    const file = teamServerFile({ team, view: teamView(team, ctx), projectName: 'Drehprobe', origin: anchor, dimension: 'minecraft:overworld', turns: pl.turns, mirror: pl.mirror,
      sections: [{ id: 'sec_boden', name: 'Boden', members: [{ instanceId: 'i1', toLayer: 0 }] }, { id: 'sec_tuer', name: 'Tür und Treppe', members: [{ instanceId: 'i1', fromLayer: 1 }] }], steps });
    const { events: _e, ...rest } = file;
    return rest;
  };
  // Expected: the bounding box of the cells the game placed for those project cells (from the checked mod rule).
  const expectBox = (i, min, max) => {
    const pts = cells.filter(c => c.p.every((v, k) => v >= min[k] && v <= max[k])).map(c => { const [x, y, z] = javaOut[i * cells.length + cells.indexOf(c)].split(' ').map(Number); const a = anchorOf(i); return [x + a[0], y + a[1], z + a[2]]; });
    const lo = [0, 1, 2].map(k => Math.min(...pts.map(p => p[k]))), hi = [0, 1, 2].map(k => Math.max(...pts.map(p => p[k])));
    return `${lo.join(' ')} bis ${hi.join(' ')}`;
  };
  const call = async (path, init = {}, key) => {
    const r = await fetch(roomBase + path, { ...init, headers: { 'Content-Type': 'application/json', ...(key && { Authorization: `Bearer ${key}` }), ...init.headers } });
    const text = await r.text(); let body; try { body = JSON.parse(text); } catch { body = text; }
    return { status: r.status, body };
  };
  const created = await call('/v1/rooms', { method: 'POST', body: JSON.stringify({ teamId: team.teamId, name: 'Drehprobe' }) });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const { room, adminKey, serverKey } = created.body;
  const plugin = [[PLACEMENTS.findIndex(p => p.turns === 1 && p.mirror), 'a'], [PLACEMENTS.findIndex(p => p.turns === 3 && !p.mirror), 'b']];
  for (const [n, [i, sha]] of plugin.entries()) {
    const pl = PLACEMENTS[i];
    const h = { ...header(pl, anchorOf(i)), events: [], plan: { sha: sha.repeat(64), revisionNumber: n + 1, at: new Date().toISOString() } };
    assert.equal((await call(`/v1/rooms/${room}/header`, { method: 'PUT', body: JSON.stringify(h) }, adminKey)).status, 200);
    if (n === 0) {
      const link = `https://freadeax.github.io/Minecraft-Bauplaner/#/team/beitreten?raum=${encodeURIComponent(roomBase)}&id=${room}&s=${encodeURIComponent(serverKey)}`;
      const connected = await run(`bauplaner team verbinden ${link}`, /Mit dem Team-Raum von „Drehprobe“ verbunden|Verbindung nicht möglich[^\n]*/);
      assert.match(connected, /verbunden/, connected);
    }
    const want = [`1. Boden[^\\n]*Box ${expectBox(i, [0, 0, 0], [8, 0, 6])}`, `2. Tür und Treppe[^\\n]*Box ${expectBox(i, [0, 1, 0], [2, 2, 0])}`];
    let out = '';
    for (let t = 0; t < 60; t++) {
      out = await run('bauplaner abschnitte', /2\. Tür und Treppe[^\n]*/);
      if (want.every(w => new RegExp(w).test(out))) break;
      await new Promise(r => setTimeout(r, 1000));
    }
    for (const w of want) assert.match(out, new RegExp(w), `Plugin-Abschnitt bei Drehung ${pl.turns}, gespiegelt ${pl.mirror}`);
    console.log(`  Plugin: Abschnitte bei ${ROTATION[pl.turns]}${pl.mirror ? ' + front_back' : ''} genau über den vom Spiel gesetzten Blöcken`);
  }
  await stop();
  console.log(`  Paper ${version} (Build ${build.id}): ${checked} Zellen in 8 Lagen, Spiel = Placement.java = Planer; Plugin-Abschnitte gedreht/gespiegelt richtig.`);
} catch (e) {
  if (server && server.exitCode === null) server.kill('SIGKILL');
  throw e;
}
