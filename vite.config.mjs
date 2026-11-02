import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Fingerprint of everything that shapes the shipped catalogue (PERF-04-S07): every
 * core source file (geometry, hashing, ids, metrics). The app start keeps the built
 * catalogue under this key and builds it again only when the key changes. The dev
 * server gives no key, so edits there never meet a stale catalogue.
 */
function catalogFingerprint() {
  const root = path.dirname(fileURLToPath(import.meta.url)), hash = createHash('sha256'), files = [];
  const walk = dir => { for (const e of readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.ts')) files.push(path.relative(root, p).replaceAll('\\', '/')); } };
  walk(path.join(root, 'packages'));
  for (const f of files.sort()) hash.update(f).update('\0').update(readFileSync(path.join(root, f))).update('\0');
  return hash.digest('hex').slice(0, 32);
}

export default defineConfig(({ command }) => ({
  root: 'apps/web', base: '/Minecraft-Bauplaner/',
  // three.js is split into the lazily loaded viewer chunk (~580 kB, ~146 kB gzip); the limit documents that size.
  build: { outDir: '../../dist-web', emptyOutDir: true, sourcemap: false, chunkSizeWarningLimit: 650 },
  // Module workers (all are created with type: 'module'); lets the background worker load each job's code on demand (PERF-04).
  worker: { format: 'es' },
  define: { __CATALOG_KEY__: JSON.stringify(command === 'build' ? catalogFingerprint() : '') },
  server: { host: '0.0.0.0' }, preview: { host: '0.0.0.0' },
}));
