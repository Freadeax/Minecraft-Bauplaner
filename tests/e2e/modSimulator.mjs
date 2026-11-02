// Stand-in for the Bauplaner mod's live link (protocol 1, docs/architecture/LIVE_LINK.md) for browser tests:
// the same routes, pairing, token and origin rules as mod-core LiveLinkServer, with a small synthetic world.
import http from 'node:http';
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
    hologram: null, marks: [], plans: [], placements: [], requests: [], planBytes: null, features: options.features ?? ['scan'], protocol: options.protocol ?? 1,
  };
  const V1_POINT_TYPES = new Set(['anker', 'ziel', 'lager', 'portal', 'farm', 'treffpunkt']);
  const allowed = o => o === 'https://freadeax.github.io' || /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(o);
  // Ground: grass at y 64, a pond (water at 62 over sand at 60) for x in 48..55, z in -8..-1.
  const column = (x, z) => x >= 48 && x < 56 && z >= -8 && z < 0 ? [62, 1, 60, 2] : [64, 0, 63, 3];
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
        if (!allowed(origin)) return send(403, { error: 'Diese Website darf die Bauplaner-Mod nicht abfragen.' });
        h['Access-Control-Allow-Origin'] = origin; h.Vary = 'Origin';
      }
      if (req.method === 'OPTIONS') {
        h['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'; h['Access-Control-Allow-Headers'] = 'Content-Type, X-Bauplaner-Token';
        if (req.headers['access-control-request-private-network']) h['Access-Control-Allow-Private-Network'] = 'true';
        return send(204, null);
      }
      const route = `${req.method} ${url.pathname}`;
      if (route === 'GET /v1/hello') return send(200, { app: 'bauplaner-mod', protocol: state.protocol, mod: { version: state.protocol === 2 ? '0.8.0-sim' : '0.5.0-sim', loader: 'fabric', minecraft: '26.3' }, pairing: state.pairingCode !== null, features: state.features });
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
      if (route === 'GET /v1/status') return send(200, { time: new Date().toISOString(), player: state.player, world: { key: 'sim', server: 'server.lmnt-gaming.net', singleplayer: false }, hologram: state.hologram, marks: state.marks.length });
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
      if (route === 'GET /v1/scan') {
        if (!state.features.includes('scan')) return send(404, { error: 'Unbekannte Adresse.' });
        if (!state.planBytes || !state.hologram) return send(409, { error: 'Im Spiel ist kein Plan platziert.' });
        const pl = state.hologram.placement, file = scanFromPlan(state.planBytes, [pl.x, pl.y, pl.z]);
        res.writeHead(200, { ...h, 'Content-Type': 'application/octet-stream', 'X-Bauplaner-File': 'burgmauer_r1_20261102-180000.schem', 'Access-Control-Expose-Headers': 'X-Bauplaner-File' });
        return res.end(file);
      }
      if (route === 'POST /v1/unpair') { state.tokens.delete(req.headers['x-bauplaner-token']); return send(200, { unpaired: true }); }
      return send(404, { error: 'Unbekannte Adresse.' });
    });
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve({ state, close: () => new Promise(r => server.close(r)), openPairing: () => { state.pairingCode = '482913'; return state.pairingCode; } })));
}
