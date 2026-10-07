/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works when served from https://swaruplab.bio.uci.edu/rihaan-math/
// (or any other sub-path) without server rewrites. Routing is hash-based for the same reason.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/tests/setup.ts'],
    testTimeout: 30000,
  },
});
