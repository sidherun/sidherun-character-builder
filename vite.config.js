import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // served at the root of the custom domain character-builder.sidherun.com
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
