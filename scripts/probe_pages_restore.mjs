import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isPagesArtifact, planMainPages } from './prepare_main_pages.mjs';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const commitPattern = /^[a-f0-9]{40}$/;

/** Preserve the actual build source; recovery is a new deployment, not a new build. */
export function planPagesRecovery(currentFiles, knownGoodFiles, parentCommit, artifactCommit) {
  if (!commitPattern.test(parentCommit) || !commitPattern.test(artifactCommit)) throw new Error('Recovery: ungültiger Commit');
  const original = JSON.parse(knownGoodFiles.get('deployment.json')?.toString('utf8') ?? 'null');
  // The publisher validates paths, sizes, hashes, old-file integrity and collisions.
  const checked = planMainPages(currentFiles, knownGoodFiles, original?.sourceCommit);
  const manifest = {
    ...original,
    recovery: { parentCommit, restoredFromArtifactCommit: artifactCommit, artifactSourceCommit: original.sourceCommit },
  };
  const write = new Map(checked.write);
  write.set('deployment.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));
  return { remove: checked.remove, write };
}

async function readBuild(directory) {
  const files = new Map();
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) files.set(path.relative(directory, full).split(path.sep).join('/'), await readFile(full));
      else throw new Error(`Recovery: kein reguläres Buildfile: ${full}`);
    }
  }
  await walk(directory);
  return files;
}

/** Local-only drill. All Git writes and synthetic changes stay in a disposable clone. */
export async function probePagesRestore(repository, directory) {
  const build = await readBuild(path.resolve(directory));
  const manifest = JSON.parse(build.get('deployment.json')?.toString('utf8') ?? 'null');
  planMainPages(new Map(), build, manifest?.sourceCommit);
  const temporary = await mkdtemp(path.join(tmpdir(), 'bauplaner-restore-'));
  const clone = path.join(temporary, 'repository');
  const env = {
    ...process.env, GIT_AUTHOR_NAME: 'Isolated restore probe', GIT_AUTHOR_EMAIL: 'probe@example.invalid',
    GIT_COMMITTER_NAME: 'Isolated restore probe', GIT_COMMITTER_EMAIL: 'probe@example.invalid',
  };
  const git = (args, input, extra = {}) => execFileSync('git', args, {
    cwd: clone, env: { ...env, ...extra }, maxBuffer: 128 * 1024 * 1024, ...(input === undefined ? {} : { input }),
  });
  const str = (args, input) => git(args, input).toString('utf8').trim();
  const entries = commit => str(['ls-tree', '-rz', '--full-tree', commit]).split('\0').filter(Boolean).map(entry => {
    const separator = entry.indexOf('\t');
    return [entry.slice(separator + 1), entry.slice(0, separator)];
  });
  const artifactFiles = commit => new Map(entries(commit).filter(([name]) => isPagesArtifact(name)).map(([name, meta]) => {
    assert.match(meta, /^100(?:644|755) blob /, `regular artifact: ${name}`);
    return [name, git(['show', `${commit}:${name}`])];
  }));
  const sourceEntries = commit => entries(commit).filter(([name]) => !isPagesArtifact(name));
  let indexNumber = 0;
  const mergeTree = (base, plan, additions = []) => {
    const index = path.join(temporary, `index-${++indexNumber}`);
    const indexed = (args, input) => git(args, input, { GIT_INDEX_FILE: index });
    indexed(['read-tree', base]);
    for (const name of plan.remove) indexed(['update-index', '--force-remove', '--', name]);
    for (const [name, bytes, mode = '100644'] of [...plan.write, ...additions]) {
      const blob = indexed(['hash-object', '-w', '--stdin'], bytes).toString('utf8').trim();
      indexed(['update-index', '--add', '--cacheinfo', `${mode},${blob},${name}`]);
    }
    return indexed(['write-tree']).toString('utf8').trim();
  };
  const commitTree = (tree, parent, message) => str(['commit-tree', tree, '-p', parent, '-m', message]);
  try {
    // No network: source is the explicit local repository path. No checkout/build/hooks.
    execFileSync('git', ['clone', '--quiet', '--no-hardlinks', '--no-checkout', '--', path.resolve(repository), clone], { env });
    git(['remote', 'remove', 'origin']);
    str(['rev-parse', '--verify', `${manifest.sourceCommit}^{commit}`]);
    const knownTree = mergeTree(manifest.sourceCommit, planMainPages(artifactFiles(manifest.sourceCommit), build, manifest.sourceCommit));
    const known = commitTree(knownTree, manifest.sourceCommit, 'probe: known-good artifacts');
    const newerSourceTree = mergeTree(known, { remove: [], write: new Map() }, [
      ['docs/restore-probe-newer-source.txt', Buffer.from('Synthetic newer source; must survive recovery.\n')],
      ['scripts/restore-probe-executable.sh', Buffer.from('#!/bin/sh\nexit 0\n'), '100755'],
    ]);
    const newerSource = commitTree(newerSourceTree, known, 'probe: newer source retained');
    const successor = new Map(build);
    successor.set('index.html', Buffer.concat([build.get('index.html'), Buffer.from('\n<!-- synthetic successor for recovery drill -->\n')]));
    successor.set('assets/restore-probe-successor.js', Buffer.from('/* synthetic successor only */\n'));
    successor.set('deployment.json', Buffer.from(JSON.stringify({
      ...manifest, sourceCommit: newerSource,
      files: [...successor].filter(([name]) => name !== 'deployment.json').map(([name, bytes]) => ({ path: name, bytes: bytes.length, sha256: sha256(bytes) })),
    })));
    const successorTree = mergeTree(newerSource, planMainPages(artifactFiles(newerSource), successor, newerSource));
    const successorCommit = commitTree(successorTree, newerSource, 'probe: synthetic successor deployment');
    const recovery = planPagesRecovery(artifactFiles(successorCommit), artifactFiles(known), successorCommit, known);
    const restoredTree = mergeTree(successorCommit, recovery);
    const restored = commitTree(restoredTree, successorCommit, 'probe: forward recovery without history rewrite');
    assert.equal(str(['rev-parse', `${restored}^`]), successorCommit);
    assert.deepEqual(sourceEntries(restored), sourceEntries(successorCommit), 'all source paths, modes and blob hashes survive');
    const restoredFiles = artifactFiles(restored);
    const recoveredManifest = JSON.parse(restoredFiles.get('deployment.json'));
    assert.equal(recoveredManifest.sourceCommit, manifest.sourceCommit, 'original build source stays honest');
    assert.deepEqual(recoveredManifest.recovery, {
      parentCommit: successorCommit, restoredFromArtifactCommit: known, artifactSourceCommit: manifest.sourceCommit,
    });
    for (const [name, bytes] of build) if (name !== 'deployment.json') assert.deepEqual(restoredFiles.get(name), bytes, name);
    assert.deepEqual([...restoredFiles.keys()].sort(), [...build.keys()].sort(), 'successor-only chunks removed');
    assert.deepEqual(git(['show', `${known}:deployment.json`]), build.get('deployment.json'), 'known deployment unchanged');
    assert.equal(str(['show', `${restored}:docs/restore-probe-newer-source.txt`]), 'Synthetic newer source; must survive recovery.');
    assert.equal(sourceEntries(restored).find(([name]) => name === 'scripts/restore-probe-executable.sh')[1].slice(0, 6), '100755');
    assert.equal(str(['remote']), '', 'no remote exists in scratch repository');
    return {
      kind: 'isolated-local-recovery-probe', artifactSourceCommit: manifest.sourceCommit,
      artifactFiles: manifest.files.length, preservedSourcePaths: sourceEntries(restored).length,
      knownArtifactCommit: known, syntheticSuccessorCommit: successorCommit, recoveryCommit: restored,
      checks: ['all artifact bytes/hashes', 'original source provenance', 'new source paths/blob hashes/modes', 'forward parent chain', 'obsolete successor chunk removed', 'known deployment unchanged'],
      limits: 'Real local build artifacts; synthetic successor and scratch-only commits. No remote push, Pages deploy, CDN or live rollback tested.',
    };
  } finally {
    // mkdtemp above is the sole deletion target; never touch the working repository.
    assert.equal(path.dirname(path.resolve(temporary)), path.resolve(tmpdir()));
    assert.ok(path.basename(temporary).startsWith('bauplaner-restore-'));
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const repository = fileURLToPath(new URL('../', import.meta.url));
  console.log(JSON.stringify(await probePagesRestore(repository, process.argv[2] ?? path.join(repository, 'dist-web')), null, 2));
}
