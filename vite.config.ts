/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { appConfig } from './app.config.ts'

export default defineConfig({
  base: appConfig.basePath,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: appConfig.productName,
        short_name: appConfig.productName,
        description: 'Ferramenta educacional de farmacocinética.',
        lang: 'pt-BR',
        id: appConfig.basePath,
        scope: appConfig.basePath,
        start_url: appConfig.basePath,
        display: 'standalone',
        background_color: '#0b1220',
        theme_color: '#0f766e',
        icons: [
          {
            src: 'icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html}', '**/*.png', 'manifest.webmanifest'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    testTimeout: 20_000,
  },
})
