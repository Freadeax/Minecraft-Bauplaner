// Zweite Adresse auf Cloudflare Pages (PERF-06-S02, docs/architecture/betrieb/OFFLINE.md).
// Lädt dasselbe geprüfte Pages-Artefakt wie GitHub Pages hoch: dist-web unter
// Minecraft-Bauplaner/ (gleiche Pfade, gleicher Katalogschlüssel, gleiche sw.js) plus die
// Mod-Downloads aus downloads/, die GitHub Pages direkt aus main ausliefert.
// Gratis-Tarif; braucht CLOUDFLARE_API_TOKEN und CLOUDFLARE_ACCOUNT_ID als Umgebungsvariablen.
//
//   npm run build && node scripts/pages/publish_cloudflare.mjs [--dry-run]
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { SECURITY_HEADERS } from './security_headers.mjs';

export const PROJECT = 'bauplaner';
const WRANGLER = 'wrangler@4.160.0';
const BASE = 'Minecraft-Bauplaner';

/** `_headers`: hashed program files and the catalogue never change; entry points always revalidate.
 * Every response carries the browser protection from security_headers.mjs (RELEASE-01). */
export const HEADERS = `/${BASE}/assets/*
  Cache-Control: public, max-age=31536000, immutable
/${BASE}/sw.js
  Cache-Control: no-cache
/${BASE}/index.html
  Cache-Control: no-cache
/${BASE}/
  Cache-Control: no-cache
/${BASE}/deployment.json
  Cache-Control: no-cache
/*
${Object.entries(SECURITY_HEADERS).map(([k, v]) => `  ${k}: ${v}`).join('\n')}
`;
export const REDIRECTS = `/ /${BASE}/ 302
/${BASE} /${BASE}/ 301
`;

/** Builds the upload folder; returns its path. */
export function stage(root = process.cwd()) {
  const dist = path.join(root, 'dist-web');
  if (!existsSync(path.join(dist, 'deployment.json')) || !existsSync(path.join(dist, 'sw.js'))) throw new Error('dist-web unvollständig: erst `npm run build`.');
  const out = mkdtempSync(path.join(tmpdir(), 'bauplaner-cf-'));
  cpSync(dist, path.join(out, BASE), { recursive: true });
  if (existsSync(path.join(root, 'downloads'))) cpSync(path.join(root, 'downloads'), path.join(out, BASE, 'downloads'), { recursive: true });
  writeFileSync(path.join(out, '_headers'), HEADERS);
  writeFileSync(path.join(out, '_redirects'), REDIRECTS);
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const dry = process.argv.includes('--dry-run');
  for (const v of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID']) if (!dry && !process.env[v]) throw new Error(`${v} fehlt.`);
  const dir = stage();
  const { sourceCommit } = JSON.parse(readFileSync(path.join(dir, BASE, 'deployment.json'), 'utf8'));
  console.log(`Cloudflare Pages: Projekt ${PROJECT}, Quellcommit ${sourceCommit.slice(0, 7)}, Ordner ${dir}`);
  try {
    if (!dry) execFileSync('npx', ['--yes', WRANGLER, 'pages', 'deploy', dir, '--project-name', PROJECT, '--branch', 'main',
      '--commit-hash', sourceCommit, '--commit-message', `main ${sourceCommit.slice(0, 7)}`, '--commit-dirty=true'], { stdio: 'inherit' });
  } finally { if (!dry) rmSync(dir, { recursive: true, force: true }); }
}
