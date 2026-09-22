import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    outDir: 'build',
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://novox-dashboard-w7d5.onrender.com',
        changeOrigin: true,
        secure: false,
      },
      '/scraper-api': {
        target: 'https://novox-job-scraper.onrender.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/scraper-api/, '')
      }
    }
  }
})
