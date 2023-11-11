import { defineConfig } from 'vitest/config'

export default defineConfig({
  root: 'prismarine-viewer/viewer',
  test: {
    include: [
      '**/*.test.ts'
    ],
  },
})
