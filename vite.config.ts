import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the static build works from any path: the local 8070 server (/) and GitHub Pages (/gearsmith/).
// index.html, manifest (start_url/scope "./"), icons, SW registration ("./sw.js") and the SW precache list are all relative too.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2020', sourcemap: false, chunkSizeWarningLimit: 900 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
} as any);
