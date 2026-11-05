import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Fingerprint of everything that shapes the shipped catalogue (PERF-04-S07): every
 * core source file (geometry, hashing, ids, metrics). The app start keeps the built
 * catalogue under this key and builds it again only when the key changes. Shared by
 * vite.config.mjs (`__CATALOG_KEY__`) and the catalogue file of the page (PERF-05,
 * scripts/pages/build_catalog_snapshot.mjs), so both always name the same key.
 */
export function catalogFingerprint(root) {
  const hash = createHash('sha256'), files = [];
  const walk = dir => { for (const e of readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.ts')) files.push(path.relative(root, p).replaceAll('\\', '/')); } };
  walk(path.join(root, 'packages'));
  for (const f of files.sort()) hash.update(f).update('\0').update(readFileSync(path.join(root, f))).update('\0');
  return hash.digest('hex').slice(0, 32);
}
