import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from '@typescript/typescript6';
import { MemoryRepository, AssetRevisionConflictError } from '../../../dist/application/src/index.js';
import { updateAssetMeta, BUILDING_SPECS } from '../../../dist/domain/src/index.js';

// Execute the real browser-independent seed function against compiled package ports.
let code = ts.transpileModule(readFileSync('apps/web/src/app/repository.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText;
code = code.replaceAll(/\.\.\/\.\.\/\.\.\/\.\.\/packages\/(domain|application)\/src\/([A-Za-z]+)\.js/g,
  (_, pkg, name) => pathToFileURL(resolve(`dist/${pkg}/src/${name}.js`)).href);
const { seedSamples } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

test('two initial tabs seed atomically and retry current metadata without duplicate assets', async () => {
  let conflicts = 0;
  class CountingRepository extends MemoryRepository {
    async applyBatch(batch) { try { return await super.applyBatch(batch); } catch (e) { if (e instanceof AssetRevisionConflictError) conflicts++; throw e; } }
  }
  const repo = new CountingRepository();
  await Promise.all([seedSamples(repo), seedSamples(repo)]);
  const assets = await repo.listAssets();
  // three B0 modules plus every shipped building
  assert.equal(assets.length, BUILDING_SPECS.length + 3);
  assert.equal(new Set(assets.map(a => a.id)).size, assets.length);
  assert.ok(conflicts >= 1, 'one stale initialization must retry');
  const first = assets[0];
  await repo.saveAsset(updateAssetMeta(first, { archived: true, description: 'veraltete Katalogangabe' }));
  const versions = first.versionIds;
  await seedSamples(repo);
  const refreshed = (await repo.listAssets()).find(a => a.id === first.id);
  assert.equal(refreshed.archived, true);
  assert.deepEqual(refreshed.versionIds, versions);
  assert.notEqual(refreshed.description, 'veraltete Katalogangabe');
  assert.equal(refreshed.revision, 3);
});
