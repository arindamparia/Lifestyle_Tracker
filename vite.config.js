import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    host: true,   // expose on local network so Android can reach it
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
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
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

      // injectManifest: only controls which files go into the precache manifest.
      // Runtime caching is handled directly in src/sw.js using workbox APIs.
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
      },

      // Enable SW in dev mode so you can test offline behaviour locally
      devOptions: {
        enabled: true,
        type: 'module',   // required for injectManifest in dev
      }
    })
  ]
})
