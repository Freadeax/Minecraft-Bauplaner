import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogFingerprint } from './scripts/pages/catalog_key.mjs';

export default defineConfig(({ command }) => ({
  root: 'apps/web', base: '/Minecraft-Bauplaner/',
  // three.js is split into the lazily loaded viewer chunk (~580 kB, ~146 kB gzip); the limit documents that size.
  build: { outDir: '../../dist-web', emptyOutDir: true, sourcemap: false, chunkSizeWarningLimit: 650,
    // Workspace packages have no side-effect imports (tables are filled module-locally): unused modules stay out of the
    // start bundle (PERF-05 O-3, PERF-07). Building sets and domain code load with their page or in the worker.
    rolldownOptions: { treeshake: { moduleSideEffects: id => !/[\\/]packages[\\/]/.test(id) } } },
  // Module workers (all are created with type: 'module'); lets the background worker load each job's code on demand (PERF-04).
  worker: { format: 'es' },
  define: { __CATALOG_KEY__: JSON.stringify(command === 'build' ? catalogFingerprint(path.dirname(fileURLToPath(import.meta.url))) : '') },
  server: { host: '0.0.0.0' }, preview: { host: '0.0.0.0' },
}));
