// Stand-in for the Build Studio mod's live link (protocol 1, docs/architecture/team/LIVE_LINK.md) for browser tests:
// the same routes, pairing, token and origin rules as mod-core LiveLinkServer, with a small synthetic world.
import http from 'node:http';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
import { readNbt, writeNbt } from '../../dist/formats/src/index.js';

/**
 * Baustand (MAP-05) from the last plan sent: the bottom layer is built, with its first block wrong
 * (diamond block); every higher block is still missing. Same file shape as the mod's GET /v1/scan.
 */
export function scanFromPlan(planBytes, worldAnchor) {
  const root = readNbt(new Uint8Array(gunzipSync(planBytes)));
  const s = root.tag.value.Schematic.value, b = s.Metadata.value.Bauplaner.value;
  const W = s.Width.value, L = s.Length.value;
  const plan = Object.fromEntries(Object.entries(s.Blocks.value.Palette.value).map(([k, v]) => [v.value, k]));
  const bytes = s.Blocks.value.Data.value, palette = new Map(), out = [];
  const id = state => { if (!palette.has(state)) palette.set(state, palette.size); return palette.get(state); };
  const air = st => st.startsWith('minecraft:air') || st.startsWith('minecraft:structure_void') || st.startsWith('minecraft:cave_air');
  let pos = 0, n = 0, wrongDone = false;
  while (pos < bytes.length) {
    let v = 0, shift = 0, x;
    do { x = bytes[pos++] & 0xff; v |= (x & 0x7f) << shift; shift += 7; } while (x & 0x80);
    const planned = plan[v], y = Math.floor(n / (W * L));
    let state = air(planned) || y >= 1 ? 'minecraft:air' : planned;
    if (state !== 'minecraft:air' && !wrongDone) { state = 'minecraft:diamond_block'; wrongDone = true; }
    let k = id(state);
    while (k & ~0x7f) { out.push((k & 0x7f) | 0x80); k >>>= 7; }
    out.push(k);
    n++;
  }
  const str = value => ({ type: 'string', value }), int = value => ({ type: 'int', value });
  const meta = { ...b, Kind: str('scan'), ScanVersion: int(1), WorldAnchor: { type: 'intArray', value: worldAnchor }, Dimension: str('minecraft:overworld'),
    ScannedAt: str(new Date().toISOString()), Source: str('client'), Unloaded: int(0), GameVersion: str('26.3'), ModVersion: str('0.7.0-sim'), Loader: str('fabric') };
  const tag = { type: 'compound', value: { Schematic: { type: 'compound', value: {
    ...s, Metadata: { type: 'compound', value: { ...s.Metadata.value, Bauplaner: { type: 'compound', value: meta } } },
    Blocks: { type: 'compound', value: { Palette: { type: 'compound', value: Object.fromEntries([...palette].map(([k, v]) => [k, int(v)])) },
      Data: { type: 'byteArray', value: out.map(v => v > 127 ? v - 256 : v) }, BlockEntities: { type: 'list', elementType: 'compound', value: [] } } },
  } } } };
  return gzipSync(writeNbt({ name: root.name, tag }));
}

/**
 * `options.protocol` (1 or 2) and `options.features` (default ['scan']) model the mod version: a mod without
 * `marks2` rejects zones and unknown point types exactly like mod-core WorldMarks.parse; with `players` it
 * answers GET /v1/players (MAP-06, protocol 2 draft).
 */
export function startModSimulator(port, options = {}) {
  const state = {
    pairingCode: null, tokens: new Set(),
    player: { x: 40.5, y: 65, z: -20.5, yaw: 0, pitch: 0, dimension: 'minecraft:overworld', name: 'Philipp' },
    others: [{ name: 'Anna', x: 52.5, y: 64, z: -14.5, yaw: 90 }],
    hologram: null, marks: [], plans: [], placements: [], requests: [], planBytes: null, teamPushed: null, teamOutbox: [], teamAcked: [], teamRejections: [], teamServerEvents: [], teamLink: 'none', gameMarks: [], gameMarksAcked: [], features: options.features ?? ['scan'], protocol: options.protocol ?? 1,
    // LINK-03/02: pairing by click and a stand-in for the Paper plugin behind the game (LinkCore rules).
    asks: [], op: true,
    plugin: { serverId: 'srv_simserver1', name: 'LMNT Testserver', owners: [], controls: [],
      settings: { 'team.schutz': 'hinweis', 'team.nachweis': true, 'lager.modus': 'sperren', 'max-chunks': 4096 },
      schema: [{ key: 'team.schutz', kind: 'choice', label: 'Bauen in fremden Abschnitten', choices: ['hinweis', 'sperren', 'aus'] },
        { key: 'team.nachweis', kind: 'bool', label: 'Baunachweis je Spieler' },
        { key: 'lager.modus', kind: 'choice', label: 'Lagerschutz', choices: ['sperren', 'hinweis'] },
        { key: 'max-chunks', kind: 'int', label: 'Aufnahme: höchstens nachzuladende Chunks', min: 0, max: 65536 }],
      teams: [], rooms: [] },
  };
  const b64url = b => Buffer.from(b).toString('base64url');
  const plugin = state.plugin;
  const pluginStatus = () => ({ serverId: plugin.serverId, name: plugin.name, plugin: '0.12.0-sim', minecraft: '26.3', protocol: 1,
    owners: plugin.owners.map(o => ({ id: o.id, name: o.name, seq: o.seq, created: '', by: 'Philipp' })), settings: plugin.settings, schema: plugin.schema,
    teams: plugin.teams, rooms: plugin.rooms, plans: (plugin.plans ?? []).map(x => x.name), worlds: ['minecraft:overworld'], online: 1 });
  /** Plan facts as Plan.parse reads them (name from Metadata.Name, project and revision from Metadata.Bauplaner). */
  const planFacts = x => {
    const sch = readNbt(new Uint8Array(gunzipSync(x.data))).tag.value.Schematic.value, md = sch.Metadata.value, bp = md.Bauplaner.value;
    return { file: x.name, name: md.Name?.value ?? x.name, projectId: bp.ProjectId?.value, revision: bp.RevisionNumber?.value ?? 0, cells: sch.Width.value * sch.Height.value * sch.Length.value,
      ...(x.anchor && { anchor: x.anchor, dimension: x.dimension ?? 'minecraft:overworld' }) };
  };
  plugin.scans = [];
  /** ServerLink.scan: list/start/cancel/fetch; a started recording runs over a few list calls like the real tick loop. */
  const pluginScan = b => {
    const list = () => {
      const r = plugin.running;
      if (r && ++r.polls >= 3) {
        plugin.running = null;
        const f = planFacts(r.plan);
        const base = (f.name.replace(/ · Revision \d+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'projekt').slice(0, 40);
        const file = `${base}_r${f.revision}_${new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-')}.schem`;
        const data = Buffer.from(scanFromPlan(r.plan.data, r.plan.anchor));
        plugin.scans.unshift({ file, data, at: new Date().toISOString() });
        plugin.lastScan = { plan: r.plan.name, file, summary: '', at: new Date().toISOString() };
      }
      const now = plugin.running;
      return { ok: true, plans: (plugin.plans ?? []).filter(x => x.data).map(planFacts), scans: plugin.scans.map(x => ({ file: x.file, bytes: x.data.length, at: x.at })),
        ...(now && { running: { plan: now.plan.name, percent: 30 * now.polls + 10, by: 'Planer (sim)', phase: 'lesen' } }),
        ...(plugin.lastScan && { last: plugin.lastScan }), partBytes: 384 * 1024 };
    };
    if (b.do === 'start') {
      const plan = (plugin.plans ?? []).find(x => x.name === b.plan && x.data);
      if (!plan) return { error: 'Den Plan gibt es auf dem Server nicht (zuerst „Auf den Server legen“).' };
      if (!plan.anchor) return { error: 'Für diesen Plan ist kein Anker gespeichert.' };
      if (plugin.running) return { error: 'Es läuft bereits eine Aufnahme.' };
      plugin.running = { plan, polls: 0 };
      return { ...list(), text: 'Aufnahme gestartet: nur bereits geladene Chunks werden gelesen.' };
    }
    if (b.do === 'cancel') { const had = !!plugin.running; if (had) plugin.lastScan = { plan: plugin.running.plan.name, error: 'Aufnahme abgebrochen.', at: new Date().toISOString() }; plugin.running = null; return { ...list(), text: had ? 'Aufnahme abgebrochen.' : 'Es lief keine Aufnahme.' }; }
    if (b.do === 'fetch') {
      const f = plugin.scans.find(x => x.file === b.file);
      if (!f) return { error: 'Diese Aufnahme gibt es auf dem Server nicht.' };
      const offset = Number(b.offset ?? 0), part = f.data.subarray(offset, offset + (options.scanPart ?? 384 * 1024));
      return { ok: true, file: f.file, size: f.data.length, offset, data: part.toString('base64') };
    }
    return list();
  };
  /** Same checks as LinkCore.verify + ServerLink.control in the plugin. */
  const pluginControl = m => {
    const o = plugin.owners.find(x => x.id === m.owner);
    if (!o) return { error: 'Dieser Planer ist mit dem Server nicht (mehr) gekoppelt. Neu koppeln.' };
    const want = Buffer.from(createHmac('sha256', o.key).update(`${o.id}\n${m.seq}\n${m.body}`).digest('base64url'));
    const got = Buffer.from(String(m.sig));
    if (want.length !== got.length || !timingSafeEqual(want, got)) return { error: 'Unterschrift stimmt nicht.' };
    if (!(m.seq > o.seq)) return { error: `Diese Steuernachricht wurde schon verarbeitet (Nummer ${m.seq}).` };
    const b = JSON.parse(m.body);
    if (b.server !== plugin.serverId) return { error: 'Die Steuernachricht ist für einen anderen Server.' };
    o.seq = m.seq;
    plugin.controls.push(b);
    if (b.op === 'status') return pluginStatus();
    if (b.op === 'config') {
      for (const [k, v] of Object.entries(b.set ?? {})) { if (!plugin.schema.some(x => x.key === k)) return { error: `Diese Einstellung kann der Planer nicht ändern: ${k}` }; }
      Object.assign(plugin.settings, b.set);
      return { ...pluginStatus(), ok: true, text: `${Object.keys(b.set).length} Einstellung(en) übernommen.` };
    }
    if (b.op === 'team') { plugin.teams = [{ teamId: b.file.teamId, name: b.file.name, events: (b.file.events ?? []).length, sections: (b.file.sections ?? []).length }]; return { ok: true, text: `Team „${b.file.name}“ geladen.` }; }
    if (b.op === 'room') { plugin.rooms = [`verbunden mit ${new URL(b.link.replace('#/team/beitreten?', '?')).searchParams.get('raum') ?? 'Raum'}`]; return { ok: true, text: 'Mit dem Team-Raum verbunden.' }; }
    if (b.op === 'rename') { plugin.name = b.name; return { ...pluginStatus(), ok: true, text: `Server heißt jetzt „${b.name}“.` }; }
    if (b.op === 'plan') {
      const bytes = Buffer.from(String(b.data ?? ''), 'base64');
      if (!bytes.length) return { error: 'Plan fehlt.' };
      plugin.plans = [...(plugin.plans ?? []).filter(x => x.name !== b.name), { name: b.name, magic: bytes.subarray(0, 2).toString('hex'), bytes: bytes.length, dimension: b.dimension ?? null, anchor: b.anchor ?? null, data: bytes }];
      return { ok: true, file: b.name, text: `Plan „${b.name.replace(/\.schem$/, '')}“ liegt auf dem Server.${b.anchor ? ` Anker ${b.anchor.join(' ')} (${b.dimension}).` : ''}` };
    }
    if (b.op === 'scan') return pluginScan(b);
    if (b.op === 'invite') { const n = { id: `own_${b64url(randomBytes(6))}`, name: b.name, key: b64url(randomBytes(32)), seq: 0 }; plugin.owners.push(n); return { ok: true, serverId: plugin.serverId, name: plugin.name, owner: n.id, key: n.key, text: `Weiteres Gerät „${b.name}“ freigegeben.` }; }
    if (b.op === 'forget') { plugin.owners = plugin.owners.filter(x => x.id !== b.owner); return { ...pluginStatus(), ok: true, text: 'Gerät entfernt.' }; }
    return { error: 'Unbekannte Steueraktion.' };
  };
  const V1_POINT_TYPES = new Set(['anker', 'ziel', 'lager', 'portal', 'farm', 'treffpunkt']);
  const allowed = o => o === 'https://freadeax.github.io' || /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(o);
  // Ground: grass at y 64, a pond (water at 62 over sand at 60) for x in 48..55, z in -8..-1.
  // `options.column(x, z)` may replace it (Block B, KARTE-06: a plateau with a cliff); undefined keeps the default.
  const pond = (x, z) => x >= 48 && x < 56 && z >= -8 && z < 0 ? [62, 1, 60, 2] : [64, 0, 63, 3];
  const column = (x, z) => options.column?.(x, z) ?? pond(x, z);
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks), url = new URL(req.url, `http://127.0.0.1:${port}`);
      state.requests.push(`${req.method} ${url.pathname}`);
      const h = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
      const send = (status, obj) => { res.writeHead(status, h); res.end(obj === null ? '' : JSON.stringify(obj)); };
      if (req.headers.host !== `127.0.0.1:${port}` && req.headers.host !== `localhost:${port}`) return send(403, { error: 'Nur über 127.0.0.1 erreichbar.' });
      const origin = req.headers.origin;
      if (origin) {
        if (!allowed(origin)) return send(403, { error: 'Diese Website darf die Build-Studio-Mod nicht abfragen.' });
        h['Access-Control-Allow-Origin'] = origin; h.Vary = 'Origin';
      }
      if (req.method === 'OPTIONS') {
        h['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'; h['Access-Control-Allow-Headers'] = 'Content-Type, X-Bauplaner-Token';
        if (req.headers['access-control-request-private-network']) h['Access-Control-Allow-Private-Network'] = 'true';
        return send(204, null);
      }
      const route = `${req.method} ${url.pathname}`;
      if (route === 'GET /v1/hello') return send(200, { app: 'bauplaner-mod', protocol: state.protocol, mod: { version: state.protocol === 2 ? '0.8.0-sim' : '0.5.0-sim', loader: 'fabric', minecraft: '26.3' }, pairing: state.pairingCode !== null, features: state.features });
      if (route === 'POST /v1/pair/ask' && state.features.includes('pairask')) {
        const a = { id: b64url(randomBytes(18)), device: JSON.parse(body.toString() || '{}').device ?? 'Browser', state: 'waiting', token: null };
        state.asks.push(a);
        return send(200, { request: a.id, state: 'waiting', seconds: 180 });
      }
      if (route === 'GET /v1/pair/ask' && state.features.includes('pairask')) {
        const a = state.asks.find(x => x.id === url.searchParams.get('request'));
        if (!a) return send(200, { state: 'expired' });
        if (a.state === 'ok' && a.token) { const token = a.token; a.token = null; a.state = 'done'; return send(200, { state: 'ok', token }); }
        return send(200, { state: a.state === 'done' ? 'expired' : a.state });
      }
      if (route === 'POST /v1/pair') {
        const code = JSON.parse(body.toString() || '{}').code;
        if (!state.pairingCode) return send(403, { error: 'Keine Kopplung offen. Im Spiel /bauplaner verbinden eingeben und den Code hier eintragen.' });
        if (code !== state.pairingCode) return send(403, { error: 'Code stimmt nicht.' });
        state.pairingCode = null;
        const token = `sim${Math.random().toString(36).slice(2).padEnd(30, 'x')}`;
        state.tokens.add(token);
        return send(200, { token });
      }
      if (!state.tokens.has(req.headers['x-bauplaner-token'])) return send(401, { error: 'Nicht gekoppelt.' });
      if (route === 'GET /v1/status') return send(200, { time: new Date().toISOString(), player: state.player, world: { key: 'sim', server: 'server.lmnt-gaming.net', singleplayer: false }, hologram: state.hologram && state.features.includes('groups')
        ? { group: null, ...state.hologram, locked: state.marks.filter(m => m.locked && m.kind !== 'point').length * 10 } : state.hologram, marks: state.marks.length });
      if (route === 'GET /v1/chunks') {
        const list = (url.searchParams.get('c') ?? '').split(';').filter(Boolean).map(s => s.split(',').map(Number));
        const ids = ['minecraft:grass_block', 'minecraft:water', 'minecraft:sand', 'minecraft:dirt'];
        const loaded = ([cx, cz]) => Math.abs(cx - 2) <= 6 && Math.abs(cz + 2) <= 6;
        return send(200, {
          dimension: state.player.dimension, ids,
          chunks: list.filter(loaded).map(([cx, cz]) => ({ x: cx, z: cz, columns: Array.from({ length: 256 }, (_, i) => column(cx * 16 + (i & 15), cz * 16 + (i >> 4))) })),
          missing: list.filter(c => !loaded(c)),
        });
      }
      // TERRAIN-04 (mod 0.20.0): Geländegedächtnis (wider than the loaded chunks, seen 10 minutes ago) and box reads.
      const remembered = ([cx, cz]) => Math.abs(cx - 2) <= 12 && Math.abs(cz + 2) <= 12;
      const biomeOf = (x, z) => x >= 48 && x < 56 && z >= -8 && z < 0 ? 1 : x < 0 ? 2 : 0;
      if (route === 'GET /v1/terrain' || route === 'GET /v1/terrain/known') {
        if (!state.features.includes('terrain')) return send(404, { error: 'Diese Mod hat kein Geländegedächtnis.' });
        const loaded = ([cx, cz]) => Math.abs(cx - 2) <= 6 && Math.abs(cz + 2) <= 6;
        const seen = state.terrainSeenAt ??= Date.now() - 10 * 60_000;
        if (route === 'GET /v1/terrain/known') {
          const [x0, z0, x1, z1] = (url.searchParams.get('a') ?? '').split(',').map(Number);
          const chunks = [];
          for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (remembered([x, z])) chunks.push([x, z, loaded([x, z]) ? Date.now() : seen]);
          return send(200, { dimension: state.player.dimension, total: 625, chunks });
        }
        const list = (url.searchParams.get('c') ?? '').split(';').filter(Boolean).map(t => t.split(',').map(Number));
        if (list.length > 64) return send(400, { error: 'Höchstens 64 Chunks je Anfrage.' });
        return send(200, {
          dimension: state.player.dimension, ids: ['minecraft:grass_block', 'minecraft:water', 'minecraft:sand', 'minecraft:dirt'], biomes: ['minecraft:plains', 'minecraft:river', 'minecraft:forest'],
          chunks: list.filter(remembered).map(([cx, cz]) => ({ x: cx, z: cz, at: loaded([cx, cz]) ? Date.now() : seen, live: loaded([cx, cz]),
            columns: Array.from({ length: 256 }, (_, i) => column(cx * 16 + (i & 15), cz * 16 + (i >> 4))), biome: Array.from({ length: 256 }, (_, i) => biomeOf(cx * 16 + (i & 15), cz * 16 + (i >> 4))) })),
          missing: list.filter(c => !remembered(c)),
        });
      }
      if (route === 'GET /v1/box') {
        if (!state.features.includes('box')) return send(404, { error: 'Diese Mod kann keinen Geländebereich lesen.' });
        const b = (url.searchParams.get('b') ?? '').split(',').map(Number);
        const [w, h, l] = [b[3] - b[0], b[4] - b[1], b[5] - b[2]];
        if (b.length !== 6 || !(w > 0 && h > 0 && l > 0)) return send(400, { error: 'Bereich ungültig.' });
        if (w * h * l > 2_000_000) return send(413, { error: 'Bereich zu groß.' });
        const palette = ['minecraft:air', 'minecraft:grass_block[snowy=false]', 'minecraft:dirt', 'minecraft:water[level=0]', 'minecraft:sand', 'bauplaner:unloaded'];
        const data = Buffer.alloc(w * h * l * 2);
        let unloaded = 0;
        for (let y = 0; y < h; y++) for (let z = 0; z < l; z++) for (let x = 0; x < w; x++) {
          const wx = b[0] + x, wy = b[1] + y, wz = b[2] + z;
          const inLoaded = Math.abs(Math.floor(wx / 16) - 2) <= 6 && Math.abs(Math.floor(wz / 16) + 2) <= 6;
          const pond = wx >= 48 && wx < 56 && wz >= -8 && wz < 0;
          const v = !inLoaded ? 5 : pond ? (wy > 62 ? 0 : wy >= 61 ? 3 : 4) : wy > 64 ? 0 : wy === 64 ? 1 : 2;
          if (v === 5) unloaded++;
          data.writeUInt16LE(v, 2 * (x + z * w + y * w * l));
        }
        state.boxReads = (state.boxReads ?? 0) + 1;
        return send(200, { dimension: state.player.dimension, box: b, palette, data: data.toString('base64'), unloaded });
      }
      if (route === 'POST /v1/plan') {
        const q = Object.fromEntries(url.searchParams);
        state.plans.push({ ...q, bytes: body.length, magic: body.subarray(0, 2).toString('hex') });
        state.planBytes = body;
        const placement = { dimension: q.dimension, x: +q.x, y: +q.y, z: +q.z, turns: +q.turns, mirror: q.mirror === 'true' };
        state.hologram = { planFile: q.name, name: q.name.replace(/\.schem$/, ''), projectId: state.nextProjectId ?? null, revisionNumber: 1, placement, visible: true,
          box: [placement.x, placement.y, placement.z, placement.x + 4, placement.y + 4, placement.z + 4], counts: { ok: 30, state: 2, missing: 60, wrong: 8, unknown: 0 }, total: 100,
          section: 0, sections: [{ name: 'Mauer', ok: 25, total: 60 }, { name: 'Tor', ok: 5, total: 40 }] };
        return send(200, { placed: true, planFile: q.name, message: `„${q.name}“ von der Website platziert.` });
      }
      if (route === 'POST /v1/placement') { state.placements.push(JSON.parse(body.toString())); return send(200, { moved: true }); }
      if (route === 'POST /v1/marks') {
        const m = JSON.parse(body.toString());
        if (!state.features.includes('marks2')) {
          for (const it of m.items) {
            if (!['site', 'path', 'point'].includes(it.kind)) return send(400, { error: 'Unbekannte Art' });
            if (it.kind === 'point' && !V1_POINT_TYPES.has(it.type)) return send(400, { error: 'Punktart unbekannt' });
          }
        }
        state.marks = m.items; return send(200, { marks: m.items.length });
      }
      if (route === 'GET /v1/marks/game') {
        if (!state.features.includes('marks3')) return send(404, { error: 'Unbekannte Adresse.' });
        return send(200, { marks: state.gameMarks });
      }
      if (route === 'POST /v1/marks/game/ack') {
        if (!state.features.includes('marks3')) return send(404, { error: 'Unbekannte Adresse.' });
        const ids = JSON.parse(body.toString()).ids; state.gameMarksAcked.push(...ids);
        state.gameMarks = state.gameMarks.filter(m => !ids.includes(m.id)); return send(200, { removed: ids.length });
      }
      if (route === 'GET /v1/players') {
        if (!state.features.includes('players')) return send(404, { error: 'Unbekannte Adresse.' });
        return send(200, { dimension: state.player.dimension, players: state.others });
      }
      if (route === 'POST /v1/section') {
        if (!state.hologram) return send(409, { error: 'Im Spiel ist kein Plan platziert.' });
        const n = JSON.parse(body.toString()).section;
        state.hologram = { ...state.hologram, section: n };
        return send(200, { section: n });
      }
      // GAME-07-S11 (feature `groups`, mod 0.19.0): hologram limited to one Weltplan group; locked count from the locked marks with an area.
      if (route === 'POST /v1/group') {
        if (!state.features.includes('groups')) return send(404, { error: 'Diese Mod kennt keine Weltplan-Gruppen.' });
        if (!state.hologram) return send(409, { error: 'Im Spiel ist kein Plan platziert.' });
        const g = JSON.parse(body.toString()).group ?? null;
        if (g !== null && !state.marks.some(m => m.group === g)) return send(400, { error: `Keine Weltplan-Gruppe „${g}“.` });
        state.hologram = { ...state.hologram, group: g };
        return send(200, { group: g });
      }
      if (route === 'GET /v1/scan') {
        if (!state.features.includes('scan')) return send(404, { error: 'Unbekannte Adresse.' });
        if (!state.planBytes || !state.hologram) return send(409, { error: 'Im Spiel ist kein Plan platziert.' });
        const pl = state.hologram.placement, file = scanFromPlan(state.planBytes, [pl.x, pl.y, pl.z]);
        res.writeHead(200, { ...h, 'Content-Type': 'application/octet-stream', 'X-Bauplaner-File': 'burgmauer_r1_20261102-180000.schem', 'Access-Control-Expose-Headers': 'X-Bauplaner-File' });
        return res.end(file);
      }
      // Teambau (COOP-03, feature `team`): team view in, own actions out (outbox), acknowledgements, server only when `teamLink` is 'live'.
      if (url.pathname.startsWith('/v1/team') && !state.features.includes('team')) return send(404, { error: 'Unbekannte Adresse.' });
      if (route === 'POST /v1/team') { state.teamPushed = JSON.parse(body.toString()); return send(200, { ok: true, sections: state.teamPushed.sections.length, inPlan: state.hologram ? state.teamPushed.sections.length : 0, link: state.teamLink }); }
      if (route === 'GET /v1/team') return send(200, { link: state.teamLink, linkText: state.teamLink, allowed: state.teamLink === 'live', outbox: state.teamOutbox, waiting: state.teamOutbox.length, rejections: state.teamRejections,
        ...(state.teamPushed && { shown: { teamId: state.teamPushed.teamId, name: state.teamPushed.name, source: 'planer', me: state.teamPushed.me, sections: state.teamPushed.sections.length } }) });
      if (route === 'POST /v1/team/ack') { const ids = JSON.parse(body.toString()).ids; state.teamAcked.push(...ids); state.teamOutbox = state.teamOutbox.filter(e => !ids.includes(e.id)); return send(200, { removed: ids.length }); }
      if (route === 'GET /v1/team/pull') {
        if (state.teamLink !== 'live') return send(409, { error: 'team-plugin-fehlt: Auf diesem Server läuft kein Build-Studio-Plugin mit Teambau.' });
        const since = url.searchParams.get('since'), i = since ? state.teamServerEvents.findIndex(e => e.id === since) + 1 : 0;
        return send(200, { teamId: url.searchParams.get('teamId'), name: 'Server', events: state.teamServerEvents.slice(i), more: false, total: state.teamServerEvents.length });
      }
      // LINK-07: team room without a server file (RoomClient in mod-core); the key is never answered back.
      if (url.pathname === '/v1/room' && !state.features.includes('room')) return send(404, { error: 'Unbekannte Adresse.' });
      if (route === 'GET /v1/room') return send(200, state.room ? { connected: true, url: state.room.url, room: state.room.room, member: state.room.member, status: 'live', statusText: state.room.statusText ?? 'live über den Team-Raum', mode: state.room.mode ?? 'ws', syncedAt: state.room.syncedAt ?? new Date().toISOString(), pendingReports: state.room.pendingReports ?? 0 } : { connected: false, status: 'off' });
      if (route === 'POST /v1/room') {
        const b = JSON.parse(body.toString());
        if (b.off) { state.room = null; return send(200, { ok: true, text: 'Team-Raum getrennt. Die Mod spricht mit keinem Raum mehr.' }); }
        if (!/^https:\/\//.test(b.url) || !b.room || !b.key || !b.member) return send(400, { error: 'Der Team-Raum muss über https erreichbar sein.' });
        state.room = b;
        return send(200, { ok: true, text: 'Spiel mit dem Team-Raum verbunden.' });
      }
      if (url.pathname.startsWith('/v1/server') && !state.features.includes('server')) return send(404, { error: 'Unbekannte Adresse.' });
      if (route === 'GET /v1/server') {
        const out = { link: state.teamLink, linkText: state.teamLink, allowed: state.teamLink === 'live' };
        if (state.teamLink === 'live') out.server = { serverId: plugin.serverId, name: plugin.name, paired: plugin.owners.length > 0, canClaim: state.op, plugin: '0.12.0-sim', minecraft: '26.3', protocol: 1 };
        return send(200, out);
      }
      if (route === 'POST /v1/server/claim') {
        if (state.teamLink !== 'live') return send(409, { error: 'team-nicht-erlaubt: Im Spiel J drücken und „Teambau erlauben“ klicken.' });
        if (!state.op) return send(403, { error: 'Koppeln darf nur ein Operator (OP) oder wer das Recht bauplaner.team.leitung hat.' });
        const o = { id: `own_${b64url(randomBytes(6))}`, name: JSON.parse(body.toString() || '{}').device ?? 'Planer', key: b64url(randomBytes(32)), seq: 0 };
        plugin.owners.push(o);
        return send(200, { serverId: plugin.serverId, name: plugin.name, paired: true, canClaim: true, plugin: '0.12.0-sim', minecraft: '26.3', owner: o.id, key: o.key });
      }
      if (route === 'POST /v1/server/control') {
        if (state.teamLink !== 'live') return send(409, { error: 'team-nicht-erlaubt: Im Spiel J drücken und „Teambau erlauben“ klicken.' });
        const a = pluginControl(JSON.parse(body.toString()));
        return a.error ? send(409, a) : send(200, a);
      }
      if (route === 'POST /v1/unpair') { state.tokens.delete(req.headers['x-bauplaner-token']); return send(200, { unpaired: true }); }
      return send(404, { error: 'Unbekannte Adresse.' });
    });
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve({ state, close: () => new Promise(r => server.close(r)), /** The plugin stand-in, e.g. behind a simulated team room (LINK-05). */
    pluginControl,
    openPairing: () => { state.pairingCode = '482913'; return state.pairingCode; },
    /** The player clicks „Planer zulassen“ in the game. */
    approveAsk: () => { const a = state.asks.find(x => x.state === 'waiting'); if (!a) return false; a.token = `sim${b64url(randomBytes(24))}`; state.tokens.add(a.token); a.state = 'ok'; return true; } })));
}
