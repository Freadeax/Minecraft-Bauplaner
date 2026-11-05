import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

// PYTHON is an optional executable path, never a shell command.
export const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = spawnSync(python, ['-X', 'utf8', ...process.argv.slice(2)], { stdio: 'inherit' });
  if (result.error) console.error(`Python konnte nicht gestartet werden: ${result.error.message}`);
  process.exitCode = result.status ?? 1;
}
