// Stand-in for the Bauplaner mod's live link (protocol 1, docs/architecture/LIVE_LINK.md) for browser tests:
// the same routes, pairing, token and origin rules as mod-core LiveLinkServer, with a small synthetic world.
import http from 'node:http';

export function startModSimulator(port) {
  const state = {
    pairingCode: null, tokens: new Set(),
    player: { x: 40.5, y: 65, z: -20.5, yaw: 0, pitch: 0, dimension: 'minecraft:overworld', name: 'Philipp' },
    hologram: null, marks: [], plans: [], placements: [], requests: [],
  };
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
      if (route === 'GET /v1/hello') return send(200, { app: 'bauplaner-mod', protocol: 1, mod: { version: '0.5.0-sim', loader: 'fabric', minecraft: '26.3' }, pairing: state.pairingCode !== null });
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
        const placement = { dimension: q.dimension, x: +q.x, y: +q.y, z: +q.z, turns: +q.turns, mirror: q.mirror === 'true' };
        state.hologram = { planFile: q.name, name: q.name.replace(/\.schem$/, ''), projectId: state.nextProjectId ?? null, revisionNumber: 1, placement, visible: true,
          box: [placement.x, placement.y, placement.z, placement.x + 4, placement.y + 4, placement.z + 4], counts: { ok: 30, state: 2, missing: 60, wrong: 8, unknown: 0 }, total: 100 };
        return send(200, { placed: true, planFile: q.name, message: `„${q.name}“ von der Website platziert.` });
      }
      if (route === 'POST /v1/placement') { state.placements.push(JSON.parse(body.toString())); return send(200, { moved: true }); }
      if (route === 'POST /v1/marks') { const m = JSON.parse(body.toString()); state.marks = m.items; return send(200, { marks: m.items.length }); }
      if (route === 'POST /v1/unpair') { state.tokens.delete(req.headers['x-bauplaner-token']); return send(200, { unpaired: true }); }
      return send(404, { error: 'Unbekannte Adresse.' });
    });
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve({ state, close: () => new Promise(r => server.close(r)), openPairing: () => { state.pairingCode = '482913'; return state.pairingCode; } })));
}
