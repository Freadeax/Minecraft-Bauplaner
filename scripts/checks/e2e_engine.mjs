#!/usr/bin/env node
// Block 5 (06.11.2026): Browsertests in Firefox oder WebKit (Safari-Engine).
//   node scripts/checks/e2e_engine.mjs webkit [tests/e2e/shell.e2e.mjs …]
//   node scripts/checks/e2e_engine.mjs firefox --part 1/3
// Die Tests selbst bleiben unverändert: tests/e2e/engine-hook.mjs leitet ihr
// chromium.launch() auf die gewählte Engine um. Firefox braucht eine Anzeige
// für WebGL und läuft deshalb unter xvfb-run, wenn kein DISPLAY gesetzt ist.
// Einmalig: npx playwright install firefox webkit && npx playwright install-deps firefox webkit
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const [engine, ...rest] = process.argv.slice(2);
if (!['chromium', 'firefox', 'webkit'].includes(engine)) {
  console.error('Aufruf: node scripts/checks/e2e_engine.mjs <chromium|firefox|webkit> [--part n/m] [Testdateien …]');
  process.exit(2);
}
let part = null;
const files = [];
for (let i = 0; i < rest.length; i++) {
  if (rest[i] === '--part') part = rest[++i];
  else files.push(rest[i]);
}
let list = files.length ? files : readdirSync('tests/e2e').filter(f => f.endsWith('.e2e.mjs')).sort().map(f => `tests/e2e/${f}`);
if (part) {
  const [n, m] = part.split('/').map(Number);
  const size = Math.ceil(list.length / m);
  list = list.slice((n - 1) * size, n * size);
}
const node = [process.execPath, '--import', './tests/e2e/engine-hook.mjs', '--test', '--test-concurrency=1', ...list];
const needsDisplay = engine === 'firefox' && !process.env.DISPLAY && process.platform === 'linux';
const [cmd, args] = needsDisplay ? ['xvfb-run', ['-a', ...node]] : [node[0], node.slice(1)];
const result = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, BAUPLANER_ENGINE: engine } });
process.exit(result.status ?? 1);
