import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { planPagesRecovery, probePagesRestore } from '../scripts/probe_pages_restore.mjs';

const source = 'a'.repeat(40), parent = 'b'.repeat(40), known = 'c'.repeat(40);
function artifacts(extra = {}) {
  const files = new Map(Object.entries({ '.nojekyll': '', 'index.html': '<html>known</html>', 'THIRD_PARTY_NOTICES.txt': 'notices', ...extra }).map(([name, value]) => [name, Buffer.from(value)]));
  files.set('deployment.json', Buffer.from(JSON.stringify({ schemaVersion: 1, sourceCommit: source, builtAt: 'known-build-time', files: [...files].map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })) })));
  return files;
}

test('recovery preserves original build provenance and records the forward deployment parent', () => {
  const good = artifacts({ 'assets/good.js': 'good' });
  const current = artifacts({ 'assets/successor.js': 'successor' });
  current.set('docs/newer-source.md', Buffer.from('keep newer source'));
  const before = Buffer.from(good.get('deployment.json'));
  const plan = planPagesRecovery(current, good, parent, known);
  assert.deepEqual(plan.remove, ['assets/successor.js']);
  assert.equal(plan.write.has('docs/newer-source.md'), false);
  const manifest = JSON.parse(plan.write.get('deployment.json'));
  assert.equal(manifest.sourceCommit, source);
  assert.equal(manifest.builtAt, 'known-build-time');
  assert.deepEqual(manifest.recovery, { parentCommit: parent, restoredFromArtifactCommit: known, artifactSourceCommit: source });
  assert.deepEqual(good.get('deployment.json'), before, 'known manifest is immutable');
});

test('tampered known artifacts or current deployment abort recovery', () => {
  const damagedGood = artifacts(); damagedGood.set('index.html', Buffer.from('tampered'));
  assert.throws(() => planPagesRecovery(artifacts(), damagedGood, parent, known), /Builddatei verändert/);
  const damagedCurrent = artifacts(); damagedCurrent.set('index.html', Buffer.from('edited newer source'));
  assert.throws(() => planPagesRecovery(damagedCurrent, artifacts(), parent, known), /außerhalb des Publishers/);
});

test('recovery refuses unknown files, source collisions and invalid provenance identifiers', () => {
  const extra = artifacts(); extra.set('private.txt', Buffer.from('not an artifact'));
  assert.throws(() => planPagesRecovery(artifacts(), extra, parent, known), /Nicht manifestierte/);
  assert.throws(() => planPagesRecovery(new Map([['index.html', Buffer.from('actual source')]]), artifacts(), parent, known), /Quellpfad/);
  assert.throws(() => planPagesRecovery(artifacts(), artifacts(), 'main', known), /ungültiger Commit/);
});

test('isolated Git drill retains newer source blobs and executable modes without moving input HEAD', async () => {
  const { mkdtemp, mkdir, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { execFileSync } = await import('node:child_process');
  const path = await import('node:path');
  const temporary = await mkdtemp(path.join(tmpdir(), 'bauplaner-restore-test-'));
  const repository = path.join(temporary, 'input'), directory = path.join(temporary, 'build');
  const env = { ...process.env, GIT_AUTHOR_NAME: 'Probe test', GIT_AUTHOR_EMAIL: 'test@example.invalid', GIT_COMMITTER_NAME: 'Probe test', GIT_COMMITTER_EMAIL: 'test@example.invalid' };
  const git = args => execFileSync('git', args, { cwd: repository, env }).toString('utf8').trim();
  try {
    await mkdir(repository); await mkdir(directory);
    git(['init', '-q']);
    await writeFile(path.join(repository, 'README.md'), 'real source\n');
    git(['add', 'README.md']); git(['commit', '-qm', 'source']);
    const head = git(['rev-parse', 'HEAD']);
    const files = artifacts({ 'assets/good.js': 'known bytes' });
    const manifest = JSON.parse(files.get('deployment.json')); manifest.sourceCommit = head;
    files.set('deployment.json', Buffer.from(JSON.stringify(manifest)));
    for (const [name, bytes] of files) {
      await mkdir(path.dirname(path.join(directory, name)), { recursive: true });
      await writeFile(path.join(directory, name), bytes);
    }
    const report = await probePagesRestore(repository, directory);
    assert.equal(report.artifactSourceCommit, head);
    assert.equal(report.preservedSourcePaths, 3);
    assert.equal(report.artifactFiles, 4);
    assert.match(report.recoveryCommit, /^[a-f0-9]{40}$/);
    assert.notEqual(report.recoveryCommit, report.syntheticSuccessorCommit);
    assert.equal(git(['rev-parse', 'HEAD']), head, 'input HEAD never moves');
    assert.equal(git(['status', '--porcelain']), '', 'input working tree remains clean');
    assert.equal(git(['branch', '--format=%(refname)']).split('\n').length, 1, 'no input branch added');
  } finally {
    assert.equal(path.dirname(path.resolve(temporary)), path.resolve(tmpdir()));
    assert.ok(path.basename(temporary).startsWith('bauplaner-restore-test-'));
    await rm(temporary, { recursive: true, force: true });
  }
});
