import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import type { Plugin } from 'vite';

/**
 * Copies the migration .sql files next to the bundled main.js on every
 * build. electron-vite bundles src/main/**\/*.ts into a single
 * dist/main/main.js — the migrations directory (read from disk at runtime,
 * see src/main/database/index.ts DEFAULT_MIGRATIONS_DIR) is NOT part of
 * that JS bundle and must be copied explicitly.
 */
function copyMigrationsPlugin(): Plugin {
  return {
    name: 'copy-migrations',
    closeBundle() {
      const src = resolve(__dirname, 'src/main/database/migrations');
      const dest = resolve(__dirname, 'dist/main/migrations');
      if (existsSync(src)) {
        cpSync(src, dest, { recursive: true });
      }
    },
  };
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), copyMigrationsPlugin()],
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        input: resolve(__dirname, 'src/main/app/main.ts'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        input: resolve(__dirname, 'src/preload/index.ts'),
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
      },
    },
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html'),
      },
    },
    plugins: [react()],
  },
});
