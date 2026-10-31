import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const fixed = new Set(['.nojekyll', 'index.html', 'favicon.svg', 'THIRD_PARTY_NOTICES.txt', 'deployment.json', 'examples/contract-v3.schem', 'examples/contract-multiregion.litematic']);
export const isPagesArtifact = p => fixed.has(p) || /^assets\/[A-Za-z0-9_.-]+\.(?:js|css|woff2?|png|webp|svg)$/.test(p);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error(`Main-Pages: ${message}`); };

function manifestFiles(bytes) {
  let value;
  try { value = JSON.parse(bytes.toString('utf8')); } catch { fail('Manifest nicht lesbar'); }
  if (value?.schemaVersion !== 1 || !/^[a-f0-9]{40}$/.test(value.sourceCommit) || !Array.isArray(value.files)) fail('Manifeststruktur ungültig');
  const seen = new Set();
  for (const f of value.files) {
    if (!f || typeof f.path !== 'string' || !isPagesArtifact(f.path) || f.path === 'deployment.json' || seen.has(f.path)
      || !Number.isSafeInteger(f.bytes) || f.bytes < 0 || !/^[a-f0-9]{64}$/.test(f.sha256)) fail('Manifest enthält unzulässigen oder doppelten Artefaktpfad');
    seen.add(f.path);
  }
  for (const p of ['.nojekyll', 'index.html', 'THIRD_PARTY_NOTICES.txt']) if (!seen.has(p)) fail(`Pflichtartefakt fehlt: ${p}`);
  return value;
}

/** Merge only verified build files into a source tree; every other source byte stays untouched. */
export function planMainPages(sourceFiles, buildFiles, sourceCommit) {
  if (!/^[a-f0-9]{40}$/.test(sourceCommit)) fail('Quellcommit ungültig');
  if (!buildFiles.has('deployment.json')) fail('Buildmanifest fehlt');
  const next = manifestFiles(buildFiles.get('deployment.json'));
  if (next.sourceCommit !== sourceCommit) fail('Build gehört nicht zum Quellcommit');
  const nextPaths = new Set(next.files.map(f => f.path));
  nextPaths.add('deployment.json');
  if (buildFiles.size !== nextPaths.size || [...buildFiles.keys()].some(p => !nextPaths.has(p))) fail('Nicht manifestierte Builddatei');
  for (const f of next.files) {
    const bytes = buildFiles.get(f.path);
    if (!bytes || bytes.length !== f.bytes || sha256(bytes) !== f.sha256) fail(`Builddatei verändert/fehlend: ${f.path}`);
  }
  const oldPaths = new Set();
  if (sourceFiles.has('deployment.json')) {
    const previous = manifestFiles(sourceFiles.get('deployment.json'));
    for (const f of previous.files) {
      oldPaths.add(f.path);
      const bytes = sourceFiles.get(f.path);
      if (!bytes || bytes.length !== f.bytes || sha256(bytes) !== f.sha256) fail(`Vorheriges Artefakt wurde außerhalb des Publishers geändert: ${f.path}`);
    }
    oldPaths.add('deployment.json');
  }
  for (const p of nextPaths) if (sourceFiles.has(p) && !oldPaths.has(p)) fail(`Quellpfad würde überschrieben: ${p}`);
  return { remove: [...oldPaths].filter(p => !nextPaths.has(p)), write: new Map(buildFiles) };
}

async function main() {
  const [source, directory, indexFile] = process.argv.slice(2);
  if (!source || !directory || !indexFile || !/^[a-f0-9]{40}$/.test(source)) fail('Aufruf: node scripts/prepare_main_pages.mjs <source-sha> <build-directory> <unused-index-path>');
  const git = args => execFileSync('git', args, { maxBuffer: 128 * 1024 * 1024 });
  const tracked = git(['ls-tree', '-rz', '--full-tree', source]).toString('utf8').split('\0').filter(Boolean);
  const sourceFiles = new Map();
  // Only potential artifact paths need bytes; other source paths are retained by read-tree.
  for (const entry of tracked) {
    const [meta, p] = entry.split('\t');
    if (isPagesArtifact(p)) {
      if (!meta.startsWith('100644 blob ') && !meta.startsWith('100755 blob ')) fail(`Artefaktpfad ist kein reguläres File: ${p}`);
      sourceFiles.set(p, git(['show', `${source}:${p}`]));
    }
  }
  const buildFiles = new Map();
  const root = path.resolve(directory);
  async function walk(dir) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name), p = path.relative(root, full).split(path.sep).join('/');
      if (e.isSymbolicLink()) fail(`Symlink im Build: ${p}`);
      if (e.isDirectory()) await walk(full);
      else if (e.isFile()) buildFiles.set(p, await readFile(full));
      else fail(`Kein reguläres Buildfile: ${p}`);
    }
  }
  await walk(root);
  const plan = planMainPages(sourceFiles, buildFiles, source);
  const env = { ...process.env, GIT_INDEX_FILE: path.resolve(indexFile) };
  const indexedGit = (args, input) => execFileSync('git', args, { env, ...(input === undefined ? {} : { input }), maxBuffer: 128 * 1024 * 1024 });
  indexedGit(['read-tree', source]);
  for (const p of plan.remove) indexedGit(['update-index', '--force-remove', '--', p]);
  for (const [p, bytes] of plan.write) {
    const blob = indexedGit(['hash-object', '-w', '--stdin'], bytes).toString('utf8').trim();
    indexedGit(['update-index', '--add', '--cacheinfo', `100644,${blob},${p}`]);
  }
  process.stdout.write(indexedGit(['write-tree']));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
