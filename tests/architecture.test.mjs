import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkImport, importsOf, checkArchitecture } from '../scripts/check_architecture.mjs';

test('architecture guard includes type imports, reexports and lazy dependencies', () => {
  assert.deepEqual(importsOf("import type { X } from './a.js'; export * from './b.js'; const c = import('./c.js'); // import('ignored')"), ['./a.js', './b.js', './c.js']);
});
test('dependency direction forbids domain writers, UI, runtime packages and hidden dynamic adapters', () => {
  for (const [file, spec] of [['packages/domain/src/a.ts', '../../formats/src/a.js'], ['packages/voxel/src/a.ts', '../../domain/src/a.js'], ['packages/domain/src/a.ts', '../../../apps/web/src/main.js'], ['packages/application/src/a.ts', 'react'], ['packages/formats/src/a.ts', '../../application/src/a.js']]) assert.ok(checkImport(file, spec));
  assert.equal(checkImport('packages/application/src/a.ts', '../../domain/src/types.js'), null);
  assert.equal(checkImport('packages/formats/src/a.ts', '../../voxel/src/types.js'), null);
});
test('all current package imports obey the architecture contract', () => assert.deepEqual(checkArchitecture(), []));
