import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vitest/config';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', '.next']
  },
  resolve: {
    alias: {
      '@': rootDir
    }
  }
});
