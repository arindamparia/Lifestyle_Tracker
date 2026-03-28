import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:9888',
        changeOrigin: true,
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Copy icon assets into the dist root
      includeAssets: ['icon.svg'],

      manifest: {
        name: 'LifeStyle Tracker',
        short_name: 'Tracker',
        description: 'Daily habit, workout, nutrition and hydration tracker',
        theme_color: '#0a0b0f',
        background_color: '#0a0b0f',
        display: 'standalone',
        start_url: '/',
        orientation: 'portrait',
        scope: '/',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ]
      },

      // Workbox: cache the app shell and static assets for offline use
      workbox: {
        // Pre-cache all built JS, CSS, HTML and the icon
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],

        runtimeCaching: [
          // Cache Google Fonts (used by the Outfit font)
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          // Netlify function calls: network-first, fall back to cache
          {
            urlPattern: /\/\.netlify\/functions\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 }
            }
          }
        ]
      },

      // Enable SW in dev mode so you can test offline behaviour locally
      devOptions: {
        enabled: false  // flip to true when you want to test SW locally
      }
    })
  ]
})
