import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Tests use explicit mocks, never the developer's real Supabase credentials.
  envDir: false,
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'jsdom', include: ['tests/**/*.test.{ts,tsx}'], clearMocks: true },
})
