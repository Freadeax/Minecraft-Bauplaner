#!/usr/bin/env node
// Verschiebt Dateien nach einer Verschiebeliste und schreibt alle Verweise um (STRUCT-01, docs/STRUKTUR.md).
//
//   node scripts/dev/restructure.mjs <liste.json> [--dry]
//
// Die Liste ist ein Array aus [alt, neu]-Paaren (Datei oder Ordner, relativ zur Repo-Wurzel).
// Bereits verschobene Einträge werden übersprungen; das Skript ist also wiederholbar. Wer nach einem
// Rebase Konflikte in umgeschriebenen Importen hat, nimmt seine Fassung und lässt das Skript erneut
// laufen: Verweise auf alte Pfade werden dann nachgezogen.
//
// Umgeschrieben werden:
//  1. relative Zeichenketten in Code ('./x.js', '../../packages/domain/src/team.ts', new URL('../', import.meta.url)),
//     auch Verweise auf gebaute Dateien unter dist/<paket>/src/…;
//  2. relative Markdown-Links;
//  3. Pfade ab Repo-Wurzel in Text, Skripten, Java-Kommentaren und package.json (z. B. `node scripts/roadmap.mjs`);
//  4. in docs/roadmap.json nur `scope` und `evidence` der Aufgaben (alte Verlaufseinträge bleiben unverändert).
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const posix = path.posix;
const CODE = /\.(?:[cm]?js|tsx?|mts)$/;
const TEXT = /\.(?:md|json|sh|py|java|gradle|toml|ya?ml|txt|css|properties|html)$/;
// Pages-Ausgabe, erzeugte Ansichten und Binärdaten fassen wir nicht an.
// Das Werkzeug selbst, seine Listen und sein Test bleiben ebenfalls unberührt; Dateien mit der Marke
// Zeilen mit der Marke `restructure:keep` (z. B. Verweise auf alte Stände) auch.
const SKIP = p => /^(?:assets\/|downloads\/|examples\/|scripts\/dev\/)/.test(p) || (/^fixtures\//.test(p) && !p.endsWith('.md')) || ['index.html', 'deployment.json', 'package-lock.json', 'docs/ROADMAP.md', 'docs/ROADMAP_HISTORY.md', 'tests/unit/tooling/restructure.test.mjs'].includes(p);
const KEEP = 'restructure:keep';

/** Expands directory entries into file moves over the tracked file list. */
export function expandMoves(pairs, files) {
  const map = new Map(), virtual = new Set();
  for (const [from, to] of pairs) {
    const f = from.replace(/\/$/, ''), t = to.replace(/\/$/, '');
    if (files.has(f)) { map.set(f, t); continue; }
    let found = false;
    for (const p of files) if (p.startsWith(`${f}/`)) { map.set(p, t + p.slice(f.length)); found = true; }
    if (found) continue;
    // Already moved (rerun after a rebase): old paths stay resolvable so stale references get rewritten.
    if (files.has(t)) { map.set(f, t); virtual.add(f); continue; }
    for (const p of files) if (p.startsWith(`${t}/`)) { const old = f + p.slice(t.length); if (!files.has(old)) { map.set(old, p); virtual.add(old); } }
  }
  return { map, virtual };
}

const EXT_TRY = ['', '.ts', '.tsx', '.mjs', '.js', '/index.ts', '/index.js'];
/** Resolves a repo path (maybe written with .js for a .ts source, or as dist/…/src/x.js) to a tracked source file or directory. */
function resolveTarget(p, files, dirs) {
  const n = p.replace(/\/$/, '');
  if (files.has(n)) return { kind: 'file', path: n, written: n };
  if (n === '' || n === '.' || dirs.has(n)) return { kind: 'dir', path: n === '.' ? '' : n, written: n };
  const dist = /^dist\/([a-z]+)\/src\/(.+)\.(?:js|d\.ts)$/.exec(n);
  if (dist) {
    const src = `packages/${dist[1]}/src/${dist[2]}.ts`;
    if (files.has(src)) return { kind: 'dist', path: src, written: n };
  }
  const js = /\.js$/.test(n) ? n.replace(/\.js$/, '') : null;
  for (const base of js ? [js] : [n]) for (const ext of EXT_TRY) if (files.has(base + ext)) return { kind: 'file', path: base + ext, written: n };
  return null;
}

/** Writes the new location in the same style as the old reference (extension, dist form, trailing slash). */
function restyle(target, newPath, oldWritten) {
  if (target.kind === 'dist') {
    const m = /^packages\/([a-z]+)\/src\/(.+)\.ts$/.exec(newPath);
    return m ? `dist/${m[1]}/src/${m[2]}${oldWritten.endsWith('.d.ts') ? '.d.ts' : '.js'}` : oldWritten;
  }
  if (target.kind === 'dir') return newPath;
  // Same suffix that the old reference left out or replaced (.js for .ts, no extension, /index).
  const oldSrc = target.path;
  const suffix = oldSrc.slice(oldWritten.replace(/\.js$/, '').length);
  const stem = newPath.slice(0, newPath.length - suffix.length);
  if (oldWritten === oldSrc) return newPath;
  if (oldWritten.endsWith('.js') && !oldSrc.endsWith('.js')) return `${stem}.js`;
  return stem;
}

function rel(fromDir, to, trailingSlash) {
  let r = posix.relative(fromDir, to);
  if (r === '') r = '.';
  if (!r.startsWith('.')) r = `./${r}`;
  if (trailingSlash && !r.endsWith('/')) r += '/';
  return r;
}

/** Plans all content rewrites; returns Map(newPath → newContent) for changed files. */
export function planRewrites(read, realFiles, moves, virtual = new Set()) {
  const files = new Set([...realFiles, ...virtual]);
  const dirs = new Set();
  for (const f of files) { let d = posix.dirname(f); while (d !== '.' && !dirs.has(d)) { dirs.add(d); d = posix.dirname(d); } }
  const moveDir = d => { // moved directory prefix (a dir whose every file moved to one place)
    for (const [from, to] of moves) if (from.startsWith(`${d}/`)) {
      const restFrom = from.slice(d.length), restTo = to.slice(to.length - restFrom.length);
      if (restFrom === restTo) { const cand = to.slice(0, to.length - restFrom.length); if ([...files].filter(p => p.startsWith(`${d}/`)).every(p => moves.get(p)?.startsWith(`${cand}/`))) return cand; }
    }
    return d;
  };
  const newOf = t => t.kind === 'dir' ? moveDir(t.path) : (moves.get(t.path) ?? t.path);
  const out = new Map();
  const earlier = new Map([...virtual].map(old => [moves.get(old), old]));
  const rootPaths = [...moves.keys()].filter(p => p.includes('/')).sort((a, b) => b.length - a.length);
  const rootRe = rootPaths.length ? new RegExp(`(?<![\\w./@-])(${rootPaths.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\w/-])`, 'g') : null;

  for (const oldPath of realFiles) {
    if (SKIP(oldPath) || !(CODE.test(oldPath) || TEXT.test(oldPath))) continue;
    const newPath = moves.get(oldPath) ?? oldPath;
    const oldDir = posix.dirname(oldPath), newDir = posix.dirname(newPath);
    const original = read(oldPath);
    const kept = [];
    let text = original.split('\n').map(l => l.includes(KEEP) ? `\u0000${kept.push(l) - 1}\u0000` : l).join('\n');
    // A file that already sits at its new place but still carries imports written for its old place (rebase).
    const formerDir = earlier.has(oldPath) ? posix.dirname(earlier.get(oldPath)) : null;
    const fixRelative = spec => {
      if (!/^\.\.?(?:\/|$)/.test(spec)) return spec;
      const [pathPart, hash = ''] = spec.split(/(?=#)/);
      const resolveFrom = dir => { const j = posix.normalize(posix.join(dir, pathPart)); return j.startsWith('..') ? null : resolveTarget(j === '.' ? '' : j, files, dirs); };
      let target = resolveFrom(oldDir), stale = false;
      if (!target && formerDir) { target = resolveFrom(formerDir); stale = !!target; }
      if (!target) return spec;
      const targetNew = newOf(target);
      if (!stale && targetNew === target.path && newDir === oldDir) return spec;
      const written = restyle(target, targetNew, target.written);
      const r = rel(newDir, written, /\/$/.test(pathPart));
      // Keep './' only where the original had it or where it is required.
      return r + hash;
    };
    if (CODE.test(oldPath)) {
      text = text.replace(/(['"`])(\.\.?\/[^'"`\s$]*)\1/g, (m, q, spec) => `${q}${fixRelative(spec)}${q}`);
    }
    if (oldPath.endsWith('.md')) {
      text = text.replace(/\]\(([^)\s]+)\)/g, (m, target) => {
        if (target.includes('://') || target.startsWith('#') || target.startsWith('/')) return m;
        const spec = /^\.\.?\//.test(target) ? target : `./${target}`;
        const fixed = fixRelative(spec);
        if (fixed === spec) return m;
        return `](${/^\.\.?\//.test(target) || fixed.startsWith('../') ? fixed : fixed.replace(/^\.\//, '')})`;
      });
    }
    if (oldPath === 'docs/roadmap.json') {
      const data = JSON.parse(text);
      for (const item of data.items) {
        item.scope = item.scope?.map(p => moves.get(p) ?? p);
        for (const e of item.evidence ?? []) e.path = moves.get(e.path) ?? e.path;
      }
      const next = JSON.stringify(data, null, 2) + '\n';
      if (next !== original) out.set(newPath, next);
      continue;
    }
    if (rootRe) text = text.replace(rootRe, p => moves.get(p) ?? p);
    text = text.replace(/\u0000(\d+)\u0000/g, (_, i) => kept[Number(i)]);
    if (text !== original) out.set(newPath, text);
  }
  return out;
}

function main() {
  const [listFile, flag] = process.argv.slice(2);
  if (!listFile) throw new Error('Aufruf: node scripts/dev/restructure.mjs <liste.json> [--dry]');
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  process.chdir(root);
  const files = new Set(execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 << 20 }).split('\0').filter(Boolean).filter(p => existsSync(p)));
  const pairs = JSON.parse(readFileSync(listFile, 'utf8'));
  const { map: moves, virtual } = expandMoves(pairs, files);
  for (const [from, to] of moves) if (!virtual.has(from) && files.has(to) && from !== to) throw new Error(`Ziel existiert schon: ${to}`);
  const changes = planRewrites(p => readFileSync(p, 'utf8'), files, moves, virtual);
  console.log(`${moves.size - virtual.size} Dateien verschieben, ${changes.size} Dateien umschreiben.`);
  if (flag === '--dry') { for (const [a, b] of moves) if (!virtual.has(a)) console.log(`  ${a} → ${b}`); for (const p of changes.keys()) console.log(`  ~ ${p}`); return; }
  for (const [from, to] of moves) {
    if (virtual.has(from)) continue;
    execFileSync('mkdir', ['-p', posix.dirname(to)]);
    execFileSync('git', ['mv', from, to]);
  }
  for (const [p, text] of changes) writeFileSync(p, text);
  // Leere Ordner, die der Umzug hinterlässt, entfernen.
  for (const from of moves.keys()) for (let d = posix.dirname(from); d !== '.'; d = posix.dirname(d)) {
    try { if (readdirSync(d).length) break; rmdirSync(d); } catch { break; }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { main(); } catch (e) { console.error(e.message); process.exitCode = 1; }
}
