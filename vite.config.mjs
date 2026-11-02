import { defineConfig } from 'vite';
export default defineConfig({
  root: 'apps/web', base: '/Minecraft-Bauplaner/',
  // three.js is split into the lazily loaded viewer chunk (~580 kB, ~146 kB gzip); the limit documents that size.
  build: { outDir: '../../dist-web', emptyOutDir: true, sourcemap: false, chunkSizeWarningLimit: 650 },
  // Module workers (all are created with type: 'module'); lets the background worker load each job's code on demand (PERF-04).
  worker: { format: 'es' },
  server: { host: '0.0.0.0' }, preview: { host: '0.0.0.0' },
});
