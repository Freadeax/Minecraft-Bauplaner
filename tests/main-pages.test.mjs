import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { planMainPages, isPagesArtifact } from '../scripts/prepare_main_pages.mjs';
const source = 'a'.repeat(40);
function build(extra = {}) {
  const files = new Map(Object.entries({ '.nojekyll': '', 'index.html': '<html>', 'THIRD_PARTY_NOTICES.txt': 'licenses', ...extra }).map(([p, v]) => [p, Buffer.from(v)]));
  const manifest = { schemaVersion: 1, sourceCommit: source, files: [...files].map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })) };
  files.set('deployment.json', Buffer.from(JSON.stringify(manifest))); return files;
}
test('initial Main publication adds only artifact files and preserves source', () => {
  const tracked = new Map([['README.md', Buffer.from('source')], ['apps/web/index.html', Buffer.from('source html')]]);
  const plan = planMainPages(tracked, build({ 'assets/app-a.js': 'a()' }), source);
  assert.deepEqual(plan.remove, []); assert.equal(plan.write.has('README.md'), false); assert.equal(tracked.get('README.md').toString(), 'source');
});
test('only previous verified artifacts can be removed; stale hashed chunks disappear', () => {
  const old = build({ 'assets/app-old.js': 'old' }); old.set('AGENTS.md', Buffer.from('rules'));
  const plan = planMainPages(old, build({ 'assets/app-new.js': 'new' }), source);
  assert.deepEqual(plan.remove, ['assets/app-old.js']); assert.equal(plan.write.has('AGENTS.md'), false);
});
test('source collisions and manually changed old artifacts abort', () => {
  assert.throws(() => planMainPages(new Map([['index.html', Buffer.from('source')]]), build(), source), /Quellpfad/);
  const old = build(); old.set('index.html', Buffer.from('edited source'));
  assert.throws(() => planMainPages(old, build(), source), /außerhalb des Publishers/);
});
test('foreign source commits, extra files, missing files and altered bytes abort', () => {
  assert.throws(() => planMainPages(new Map(), build(), 'b'.repeat(40)), /Quellcommit/);
  const extra = build(); extra.set('private.txt', Buffer.from('secret'));
  assert.throws(() => planMainPages(new Map(), extra, source), /Nicht manifestierte/);
  for (const edit of [files => files.delete('index.html'), files => files.set('index.html', Buffer.from('bad'))]) {
    const files = build(); edit(files); assert.throws(() => planMainPages(new Map(), files, source), /Builddatei|manifestierte/);
  }
});
test('untrusted previous manifests cannot delete source or traverse paths', () => {
  for (const p of ['AGENTS.md', '../outside', 'assets/../../AGENTS.md', 'packages/domain/src/index.ts', '/index.html', 'assets/a.js/other']) {
    assert.equal(isPagesArtifact(p), false, p);
    const old = build(); const manifest = JSON.parse(old.get('deployment.json'));
    manifest.files.push({ path: p, bytes: 0, sha256: 'a'.repeat(64) }); old.set('deployment.json', Buffer.from(JSON.stringify(manifest)));
    assert.throws(() => planMainPages(old, build(), source), /unzulässigen/);
  }
});
test('duplicate manifest entries and non-allowlisted build paths abort', () => {
  const files = build(); const manifest = JSON.parse(files.get('deployment.json')); manifest.files.push(manifest.files[0]); files.set('deployment.json', Buffer.from(JSON.stringify(manifest)));
  assert.throws(() => planMainPages(new Map(), files, source), /doppelten/);
  assert.throws(() => planMainPages(new Map(), build({ 'scripts/publish_main_pages.sh': 'bad' }), source), /unzulässigen/);
});

test('CLI creates a merged Git tree with source retained and obsolete chunks removed', async () => {
  const { mkdtemp, mkdir, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { execFileSync } = await import('node:child_process');
  const path = await import('node:path');
  const directory = await mkdtemp(path.join(tmpdir(), 'bauplaner-main-pages-'));
  const env = { ...process.env, GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.invalid', GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.invalid' };
  const git = args => execFileSync('git', args, { cwd: directory, env }).toString().trim();
  try {
    git(['init', '-q']);
    const previous = build({ 'assets/old.js': 'old' }); previous.set('README.md', Buffer.from('source kept'));
    for (const [p, bytes] of previous) { await mkdir(path.dirname(path.join(directory, p)), { recursive: true }); await writeFile(path.join(directory, p), bytes); }
    git(['add', '.']); const tree = git(['write-tree']);
    const commit = git(['commit-tree', tree, '-m', 'source']);
    const next = build({ 'assets/new.js': 'new' }); const manifest = JSON.parse(next.get('deployment.json')); manifest.sourceCommit = commit; next.set('deployment.json', Buffer.from(JSON.stringify(manifest)));
    const dist = path.join(directory, 'dist');
    for (const [p, bytes] of next) { await mkdir(path.dirname(path.join(dist, p)), { recursive: true }); await writeFile(path.join(dist, p), bytes); }
    const helper = new URL('../scripts/prepare_main_pages.mjs', import.meta.url);
    const merged = execFileSync(process.execPath, [helper.pathname, commit, dist, path.join(directory, 'temporary-index')], { cwd: directory, env }).toString().trim();
    assert.equal(git(['show', `${merged}:README.md`]), 'source kept');
    assert.equal(git(['show', `${merged}:assets/new.js`]), 'new');
    assert.ok(!git(['ls-tree', '-r', '--name-only', merged]).split('\n').includes('assets/old.js'));
    assert.equal(git(['show', `${commit}:assets/old.js`]), 'old', 'original source commit remains unchanged');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
