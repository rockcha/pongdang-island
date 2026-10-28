import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'
import { imageRuntimeCaching } from './build/image-cache.ts'

// https://vite.dev/config/
export default defineConfig({
  build:{manifest:true},
  // Temporary HTML previews and browser profiles are not application entries.
  optimizeDeps: { entries: ['index.html'] },
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'prompt',
    workbox: { globPatterns: ['**/*.{js,css,html,woff2}'],runtimeCaching:imageRuntimeCaching,importScripts:['/push-worker.js','/image-cache-migration.js'] },
      includeAssets: ['fallback-image.svg', 'favicon-32.png', 'favicon-64.png', 'apple-touch-icon.png', 'branding/pongi.png', 'branding/pongi-welcome.png', 'branding/pongi-startup.png', 'branding/pongi-startup-error.png', 'branding/pongi-aquarium-loading.png', 'branding/confirm/*.png', 'region-icons/*.svg', 'notification-icons/*.png', 'app-icons/*.png'],
    manifest: {
      id: '/', name: '퐁당섬', short_name: '퐁당섬', lang: 'ko',
      description: '손끝에서 시작하는 작은 낚시 여행, 퐁당섬',
      theme_color: '#fff8ee', background_color: '#fff8ee',
      display: 'standalone', start_url: '/', scope: '/',
      orientation: 'portrait-primary',
      icons: [
        { src: '/pwa-192x192.png?v=20261021-clean-start', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/branding/pongi-startup.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      ],
    },
  })],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
})
