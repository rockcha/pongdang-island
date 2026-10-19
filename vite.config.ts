import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'prompt',
    workbox: { globPatterns: ['**/*.{js,css,html,woff2}'] },
      includeAssets: ['fallback-image.svg', 'favicon-32.png', 'favicon-64.png', 'apple-touch-icon.png', 'branding/pongi.png', 'branding/pongi-welcome.png', 'branding/pongi-aquarium-loading.png', 'branding/confirm/*.png', 'region-icons/*.svg', 'notification-icons/*.png', 'app-icons/*.png'],
    manifest: {
      name: '퐁당섬', short_name: '퐁당섬', lang: 'ko',
      description: '손끝에서 시작하는 작은 낚시 여행, 퐁당섬',
      theme_color: '#fff8ee', background_color: '#fff8ee',
      display: 'standalone', start_url: '/', scope: '/',
      orientation: 'portrait-primary',
      icons: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
  })],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
})
