import { spawnSync } from 'node:child_process';
import { python } from './python.mjs';

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} beendet mit ${result.status ?? result.signal}`);
}

// Called through npm so its installed CLI can run without shell-specific quoting.
if (!process.env.npm_execpath) throw new Error('Bitte npm run setup verwenden.');
run(python, ['--version']);
run('git', ['rev-parse', '--show-toplevel']);
for (const args of [['ci', '--ignore-scripts'], ['run', 'setup:hooks'], ['run', 'build']]) {
  run(process.execPath, [process.env.npm_execpath, ...args]);
}
console.log('Lokales Setup abgeschlossen. Nächste Prüfung: npm run check; Browser separat: npm run setup:browser.');
