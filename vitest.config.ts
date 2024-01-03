import { defineConfig } from 'vitest/config'

export default defineConfig({
  root: 'prismarine-viewer/viewer',
  test: {
    include: [
      '../../src/botUtils.test.ts',
      'sign-renderer/tests.test.ts'
    ],
  },
})
