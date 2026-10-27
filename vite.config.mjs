import { defineConfig } from 'vite';
export default defineConfig({
  root: 'apps/web', base: '/Minecraft-Bauplaner/',
  build: { outDir: '../../dist-web', emptyOutDir: true, sourcemap: false },
  server: { host: '0.0.0.0' }, preview: { host: '0.0.0.0' },
});
