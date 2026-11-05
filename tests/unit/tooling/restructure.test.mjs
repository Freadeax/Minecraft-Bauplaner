import test from 'node:test';
import assert from 'node:assert/strict';
import { expandMoves, planRewrites } from '../../../scripts/dev/restructure.mjs';

const repo = {
  'scripts/dev/restructure.mjs': "// packages/domain/src/team.ts → packages/domain/src/team/team.ts\n",
  'packages/domain/src/index.ts': "export { a } from './team.js';\nexport * from './types.js';\n",
  'packages/domain/src/team.ts': "import { T } from './types.js';\nimport { v } from '../../voxel/src/index.js';\nconst dot = '.', up = '..';\n",
  'packages/domain/src/types.ts': 'export type T = 1;\n',
  'packages/voxel/src/index.ts': 'export const v = 1;\n',
  'apps/web/src/views/Team.tsx': "import { a } from '../../../../packages/domain/src/team.ts';\nimport './team.css';\n",
  'apps/web/src/views/team.css': '.x{}\n',
  'tests/team.test.mjs': "import { a } from '../dist/domain/src/team.js';\n",
  'docs/A.md': 'Siehe [Team](../packages/domain/src/team.ts) und `packages/domain/src/team.ts`.\n',
  'package.json': '{"scripts":{"x":"node packages/domain/src/team.ts"}}\n',
};
const pairs = [['packages/domain/src/team.ts', 'packages/domain/src/team/team.ts'], ['apps/web/src/views/team.css', 'apps/web/src/styles/team.css']];

test('restructure: rewrites imports, dist references, markdown links and root paths; leaves bare dots alone', () => {
  const files = new Set(Object.keys(repo));
  const { map, virtual } = expandMoves(pairs, files);
  assert.equal(virtual.size, 0);
  const out = planRewrites(p => repo[p], files, map, virtual);
  assert.match(out.get('packages/domain/src/index.ts'), /from '\.\/team\/team\.js'/);
  const team = out.get('packages/domain/src/team/team.ts');
  assert.match(team, /from '\.\.\/types\.js'/);
  assert.match(team, /from '\.\.\/\.\.\/\.\.\/voxel\/src\/index\.js'/);
  assert.match(team, /dot = '\.', up = '\.\.'/);
  assert.match(out.get('apps/web/src/views/Team.tsx'), /packages\/domain\/src\/team\/team\.ts'/);
  assert.match(out.get('apps/web/src/views/Team.tsx'), /import '\.\.\/styles\/team\.css'/);
  assert.match(out.get('tests/team.test.mjs'), /'\.\.\/dist\/domain\/src\/team\/team\.js'/);
  assert.equal(out.get('docs/A.md'), 'Siehe [Team](../packages/domain/src/team/team.ts) und `packages/domain/src/team/team.ts`.\n');
  assert.match(out.get('package.json'), /node packages\/domain\/src\/team\/team\.ts/);
});

test('restructure: a rerun after a rebase pulls stale references to old paths forward', () => {
  const moved = { ...repo };
  moved['packages/domain/src/team/team.ts'] = "import { T } from '../types.js';\nimport { v } from '../../voxel/src/index.js'; // vor dem Umzug geschrieben\n";
  moved['packages/domain/src/keep.ts'] = "const old = 'packages/domain/src/team.ts'; // restructure:keep\n";
  delete moved['packages/domain/src/team.ts'];
  const files = new Set(Object.keys(moved));
  const { map, virtual } = expandMoves(pairs.slice(0, 1), files);
  assert.ok(virtual.has('packages/domain/src/team.ts'));
  const out = planRewrites(p => moved[p], files, map, virtual);
  assert.match(out.get('packages/domain/src/index.ts'), /'\.\/team\/team\.js'/);
  assert.equal(out.get('packages/domain/src/team/team.ts'), "import { T } from '../types.js';\nimport { v } from '../../../voxel/src/index.js'; // vor dem Umzug geschrieben\n", 'stale import from before the move is corrected, correct one kept');
  assert.ok(!out.has('packages/domain/src/keep.ts'), 'lines marked restructure:keep stay');
  assert.ok(!out.has('scripts/dev/restructure.mjs'));
});
