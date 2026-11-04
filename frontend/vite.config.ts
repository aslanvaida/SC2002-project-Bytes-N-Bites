import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base './' makes dist/ work from any folder or server path. The API base URL is set at run time in
// public/config.js (copied to dist/config.js), so it can be changed without rebuilding.
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
})
