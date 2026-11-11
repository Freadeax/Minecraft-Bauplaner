// Local Team-Raum for the browser acceptance tests (Block 4c, 06.11.2026): the real Cloudflare worker
// (services/team-room, Durable Object with SQLite) under `wrangler dev`, with its own empty storage per run.
// Wrangler is not a dependency of the planner; it comes through npx in the pinned version, or from WRANGLER_BIN.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const WRANGLER_VERSION = '4.160.0';

/** Starts `wrangler dev` on 127.0.0.1:port; resolves when the worker answers. */
/** `vars` become `--var NAME:value` (e.g. BACKUP_DELAY_MS for automatic backups after seconds, Block B). */
export async function startTeamRoomDev(port, { timeout = 180_000, vars = {} } = {}) {
  const persist = mkdtempSync(join(tmpdir(), 'team-room-dev-'));
  const args = ['dev', '--port', String(port), '--ip', '127.0.0.1', '--persist-to', persist, '--log-level', 'warn', '--show-interactive-dev-session=false', ...Object.entries(vars).flatMap(([k, v]) => ['--var', `${k}:${v}`])];
  const [cmd, pre] = process.env.WRANGLER_BIN ? [process.env.WRANGLER_BIN, []] : ['npx', ['--yes', `wrangler@${WRANGLER_VERSION}`]];
  const child = spawn(cmd, [...pre, ...args], { cwd: new URL('../../services/team-room/', import.meta.url), env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: '1' }, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  let log = '';
  child.stdout.on('data', d => { log += d; });
  child.stderr.on('data', d => { log += d; });
  const url = `http://127.0.0.1:${port}`;
  const until = Date.now() + timeout;
  for (;;) {
    if (child.exitCode !== null) throw new Error(`wrangler dev ist beendet (${child.exitCode}):\n${log.slice(-2000)}`);
    try { if ((await fetch(`${url}/v1/nichts`)).status === 404) break; } catch {}
    if (Date.now() > until) { kill(child); throw new Error(`wrangler dev antwortet nicht:\n${log.slice(-2000)}`); }
    await new Promise(r => setTimeout(r, 500));
  }
  return { url, log: () => log, close: async () => { kill(child); await new Promise(r => setTimeout(r, 300)); rmSync(persist, { recursive: true, force: true }); } };
}

function kill(child) {
  try { process.kill(-child.pid, 'SIGTERM'); } catch { try { child.kill('SIGTERM'); } catch {} }
}

/**
 * A player's mod in the room, as mod-core RoomClient talks to it: WebSocket with the member key, presence
 * `where: 'spiel'`, appends without guards. Used for the client-first reports (COOP-10, section.seen/store.seen).
 */
export async function modClient(url, room, key, { member, player, device = 'dev_spiel0001', pos } = {}) {
  const ws = new WebSocket(`${url.replace(/^http/, 'ws')}/v1/rooms/${room}/live`);
  const answers = new Map(), seen = [];
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error('Mod-WebSocket geht nicht auf')); });
  const welcome = new Promise(resolve => {
    ws.onmessage = m => {
      const msg = JSON.parse(String(m.data));
      if (msg.type === 'welcome') resolve(msg);
      if (msg.type === 'events') seen.push(...msg.events);
      if (msg.type === 'appended') answers.get(msg.batch)?.(msg);
    };
  });
  ws.send(JSON.stringify({ type: 'hello', key, member, device, where: 'spiel', player, ...(pos && { pos }), after: '' }));
  await welcome;
  return {
    seen,
    /** Sends one batch like RoomClient.append and waits for the room's answer. */
    append: (batch, events) => new Promise(resolve => { answers.set(batch, resolve); ws.send(JSON.stringify({ type: 'append', batch, events })); }),
    close: () => ws.close(),
  };
}
