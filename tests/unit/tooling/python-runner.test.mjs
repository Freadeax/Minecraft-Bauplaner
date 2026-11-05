import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const runner = fileURLToPath(new URL('../../../scripts/dev/python.mjs', import.meta.url));

test('Python launcher preserves Unicode and literal arguments without a shell', () => {
  const value = 'Süd 😀 / spaces & literal $(nothing)';
  const result = spawnSync(process.execPath, [runner, '-I', '-c', 'import sys; print(sys.argv[1])', value], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), value);
});

test('Python launcher propagates a failed documentation or verifier process', () => {
  const result = spawnSync(process.execPath, [runner, '-I', '-c', 'import sys; sys.exit(7)'], { encoding: 'utf8' });
  assert.equal(result.status, 7, result.stderr);
});
