import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // served at the root of the custom domain character-builder.sidherun.com
  test: {
    environment: 'jsdom',
    globals: true,
    // Playwright specs live in e2e/ and start a browser. Keep them out of Vitest.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      'e2e/**',
    ],
  },
})
