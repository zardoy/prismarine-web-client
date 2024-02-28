import { defineConfig } from 'vite';

export default defineConfig({
  root: 'experiments',
  // set latest target
  esbuild: {
    target: 'esnext',
  },
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },
})
