import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { buildsFor, compareVersions, loadersFor, minecraftVersions, parseSelectionSearch, resolveSelection, selectionSearch, versionsOf } from '../apps/web/src/views/mod/releases.ts';

const { releases } = JSON.parse(readFileSync('apps/web/src/views/mod/releases.json', 'utf8'));
const r = (minecraft, loader, modVersion) => ({ file: `x-${loader}-${minecraft}-${modVersion}.jar`, modVersion, loader, minecraft, loaderMin: '0', java: '25', bytes: 1, sha256: '0'.repeat(64), releasedAt: '2026-11-01', sourceCommit: '0'.repeat(40), tested: 't' });

test('every offered jar is in downloads/mod with the listed size and SHA-256', () => {
  assert.ok(releases.length > 0);
  const files = new Set();
  for (const rel of releases) {
    assert.ok(!files.has(rel.file), `doppelt: ${rel.file}`); files.add(rel.file);
    if (rel.minecraftVersions) {
      // One jar for several Minecraft versions (Paper plugin): no version in the name, newest listed version first in `minecraft`.
      assert.equal(rel.file, `bauplaner-bridge-${rel.loader}-${rel.modVersion}.jar`);
      assert.ok(rel.minecraftVersions.includes(rel.minecraft));
      assert.equal(rel.minecraft, rel.minecraftVersions.toSorted((a, b) => compareVersions(b, a))[0]);
    } else {
      assert.match(rel.file, /^bauplaner-bridge-[a-z]+-[0-9.]+-[0-9.]+\.jar$/);
      assert.equal(rel.file, `bauplaner-bridge-${rel.loader}-${rel.minecraft}-${rel.modVersion}.jar`);
    }
    const bytes = readFileSync(`downloads/mod/${rel.file}`);
    assert.equal(bytes.length, rel.bytes, rel.file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), rel.sha256, rel.file);
    assert.match(rel.sourceCommit, /^[0-9a-f]{40}$/);
    assert.ok(rel.tested.length > 20, 'Prüfstand angeben');
  }
});

test('versions sort numerically and selections fall back to existing builds', () => {
  assert.ok(compareVersions('26.10', '26.3') > 0);
  assert.equal(compareVersions('0.164.0+26.3', '0.164.0'), 0);
  const list = [r('26.3', 'fabric', '0.1.0'), r('26.3', 'fabric', '0.2.0'), r('26.10', 'fabric', '0.2.0'), r('26.3', 'neoforge', '0.2.0')];
  assert.deepEqual(minecraftVersions(list), ['26.10', '26.3']);
  assert.deepEqual(loadersFor(list, '26.3'), ['fabric', 'neoforge']);
  assert.deepEqual(buildsFor(list, '26.3', 'fabric').map(b => b.modVersion), ['0.2.0', '0.1.0']);
  assert.deepEqual(resolveSelection(list, {}), { minecraft: '26.10', loader: 'fabric', modVersion: '0.2.0' });
  assert.deepEqual(resolveSelection(list, { minecraft: '26.3', modVersion: '0.1.0' }), { minecraft: '26.3', loader: 'fabric', modVersion: '0.1.0' });
  assert.deepEqual(resolveSelection(list, { minecraft: '1.21', loader: 'paper', modVersion: '9' }), { minecraft: '26.10', loader: 'fabric', modVersion: '0.2.0' });
  assert.deepEqual(resolveSelection(list, { minecraft: '26.10', loader: 'neoforge' }), { minecraft: '26.10', loader: 'fabric', modVersion: '0.2.0' });
  assert.equal(resolveSelection([], {}), null);
  const s = { minecraft: '26.3', loader: 'fabric', modVersion: '0.1.0' };
  assert.deepEqual(parseSelectionSearch(selectionSearch(s)), s);
});

test('one jar for several Minecraft versions is offered for each of them', () => {
  const paper = { ...r('26.3', 'paper', '0.1.0'), minecraftVersions: ['1.18.2', '1.21.11', '26.3'] };
  const list = [r('26.3', 'fabric', '0.1.0'), paper];
  assert.deepEqual(versionsOf(paper), ['1.18.2', '1.21.11', '26.3']);
  assert.deepEqual(versionsOf(list[0]), ['26.3']);
  assert.deepEqual(minecraftVersions(list), ['26.3', '1.21.11', '1.18.2']);
  assert.deepEqual(loadersFor(list, '26.3'), ['fabric', 'paper']);
  assert.deepEqual(loadersFor(list, '1.21.11'), ['paper']);
  assert.deepEqual(buildsFor(list, '1.18.2', 'paper'), [paper]);
  assert.deepEqual(resolveSelection(list, { minecraft: '1.21.11', loader: 'fabric' }), { minecraft: '1.21.11', loader: 'paper', modVersion: '0.1.0' });
});
