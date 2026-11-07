// PERF-07 O-9: the build points imports from the package barrels at the declaring modules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { barrelMaps, rewriteBarrelImports } from '../../../scripts/pages/barrel_imports.mjs';

const root = path.resolve('.');
const barrel = path.join(root, 'packages/domain/src/index.ts');
const maps = barrelMaps(root, [barrel]);
const importer = path.join(root, 'apps/web/src/views/Example.tsx');

test('Barrel-Importe zeigen auf das deklarierende Modul, auch über Weiterleitungen', () => {
  const map = maps.get(barrel);
  assert.equal(path.relative(root, map.get('MAX_BACKUP_BYTES').file), 'packages/domain/src/data/backupLimits.ts');
  assert.equal(path.relative(root, map.get('checkProjectRecord').file), 'packages/domain/src/data/backup.ts');
  assert.equal(path.relative(root, map.get('hasTeamAccess').file), 'packages/domain/src/team/teamAccessBasics.ts');
  const out = rewriteBarrelImports(`import { MAX_BACKUP_BYTES, checkProjectRecord as check } from '../../../../packages/domain/src/index.js';\nexport { hasTeamAccess } from '../../../../packages/domain/src/index.js';`, importer, maps);
  assert.match(out, /import \{ MAX_BACKUP_BYTES \} from '\.\.\/\.\.\/\.\.\/\.\.\/packages\/domain\/src\/data\/backupLimits\.js';/);
  assert.match(out, /import \{ checkProjectRecord as check \} from '\.\.\/\.\.\/\.\.\/\.\.\/packages\/domain\/src\/data\/backup\.js';/);
  assert.match(out, /export \{ hasTeamAccess \} from '\.\.\/\.\.\/\.\.\/\.\.\/packages\/domain\/src\/team\/teamAccessBasics\.js';/);
});

test('Unbekannte Namen und fremde Pfade bleiben unverändert', () => {
  const unknown = `import { gibtEsNicht } from '../../../../packages/domain/src/index.js';`;
  assert.equal(rewriteBarrelImports(unknown, importer, maps), null);
  assert.equal(rewriteBarrelImports(`import { useState } from 'react';`, importer, maps), null);
});
