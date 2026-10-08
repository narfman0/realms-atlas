import { defineConfig } from 'vite';

// base './' so dist/ works from any sub-path (GitHub Pages) and as a claude.ai artifact.
export default defineConfig({
  base: './',
  server: { port: 5280, host: '127.0.0.1' },
  preview: { port: 5281, host: '127.0.0.1' },
  build: { chunkSizeWarningLimit: 1200, assetsInlineLimit: 0 },
});
