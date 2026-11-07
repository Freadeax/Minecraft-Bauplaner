// LINK-09 game test helper: a TCP relay between the mod and the team room that can cut the line like a lost
// internet connection. The mod only knows the relay's address (room.json), so cutting the relay cuts the mod off
// the room without touching the room itself (its state stays, as on the real service).
//   node scripts/mod/bridge_netcut.mjs <dir> <listen port> <room url>
// The Fabric game test writes <dir>/net-off and <dir>/net-on; the relay answers with <dir>/net-is-off and
// <dir>/net-is-on once every open connection is cut or new ones get through again. While off, every new
// connection is reset at once (what the mod sees when the router is down). Runs until the test script kills it
// (after the verify step, which still reads the room through it).
import { createServer, connect } from 'node:net';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [dir, port, target] = process.argv.slice(2);
if (!dir || !port || !target) throw new Error('usage: bridge_netcut.mjs <dir> <listen port> <room url>');
const room = new URL(target);
const open = new Set();
let off = false, cuts = 0, refused = 0;

const server = createServer(client => {
  if (off) { refused++; client.destroy(); return; }
  const upstream = connect(Number(room.port || 80), room.hostname);
  const pair = { client, upstream };
  open.add(pair);
  const drop = () => { client.destroy(); upstream.destroy(); open.delete(pair); };
  client.on('error', drop); upstream.on('error', drop);
  client.on('close', drop); upstream.on('close', drop);
  client.pipe(upstream); upstream.pipe(client);
});
server.listen(Number(port), '127.0.0.1', () => console.log(`Netz-Relais 127.0.0.1:${port} → ${room.host}`));

const tick = setInterval(() => {
  if (!off && existsSync(join(dir, 'net-off'))) {
    rmSync(join(dir, 'net-off'));
    off = true;
    cuts++;
    for (const { client, upstream } of open) { client.destroy(); upstream.destroy(); }
    open.clear();
    rmSync(join(dir, 'net-is-on'), { force: true });
    writeFileSync(join(dir, 'net-is-off'), new Date().toISOString());
    console.log('Netz getrennt');
  }
  if (off && existsSync(join(dir, 'net-on'))) {
    rmSync(join(dir, 'net-on'));
    off = false;
    rmSync(join(dir, 'net-is-off'), { force: true });
    writeFileSync(join(dir, 'net-is-on'), new Date().toISOString());
    console.log(`Netz wieder da (${refused} Verbindungsversuche abgewiesen)`);
  }
}, 100);

function stop() {
  clearInterval(tick);
  writeFileSync(join(dir, 'netcut.json'), JSON.stringify({ cuts, refused }));
  server.close();
  for (const { client, upstream } of open) { client.destroy(); upstream.destroy(); }
  process.exit(0);
}
process.on('SIGTERM', stop);
