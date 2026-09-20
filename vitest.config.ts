import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@common': path.resolve(__dirname, 'src/common'),
      '@main': path.resolve(__dirname, 'src/main'),
    },
  },
});
