import { readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Ship src/data/patches.json at a stable URL (./patches.json) so the service worker can
// refresh it network-first without waiting on a new JS bundle hash.
function publishPatches(): Plugin {
  const file = path.resolve('src/data/patches.json');
  const load = () => readFileSync(file);
  return {
    name: 'publish-patches',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== '/patches.json') return next();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(load());
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'patches.json', source: load() });
    },
  };
}

// Relative base so the static build works from any path: the local 8070 server (/) and GitHub Pages (/gearsmith/).
// index.html, manifest (start_url/scope "./"), icons, SW registration ("./sw.js") and the SW precache list are all relative too.
export default defineConfig({
  base: './',
  plugins: [react(), publishPatches()],
  build: { target: 'es2020', sourcemap: false, chunkSizeWarningLimit: 900 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
} as any);
