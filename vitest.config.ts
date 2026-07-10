import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Architecture §8: 80%+ overall target, enforced once real modules exist.
    },
  },
});
