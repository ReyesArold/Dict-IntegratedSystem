import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: '192.168.1.235',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://192.168.1.235:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // PDF and spreadsheet engines are lazy-loaded report chunks; the initial
    // application shell should stay below 500 kB.
    chunkSizeWarningLimit: 800,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'DICT Abra — Integrated PMIS, Training & Trip Tracker System',
        short_name: 'DICT Abra',
        description:
          'Offline-first integrated PMIS, training management, and trip tracker system for DICT Abra.',
        theme_color: '#0b2a4a',
        background_color: '#f4f7fb',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
