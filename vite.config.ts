import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1800,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/phaser')) return 'phaser';
          if (id.includes('@mediapipe')) return 'mediapipe';
          return undefined;
        },
      },
    },
  },
  server: { host: true },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
