import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./client', import.meta.url))
    }
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: [
      'client/**/__tests__/*.{spec,test}.{js,ts}',
      'worker/**/__tests__/*.{spec,test}.{js,ts}'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'client/stores/**/*.js',
        'client/services/**/*.js',
        'worker/services/**/*.ts'
      ],
      exclude: [
        '**/node_modules/**',
        '**/__tests__/**'
      ]
    }
  }
})
