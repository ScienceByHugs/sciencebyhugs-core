import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      includeAssets: ['brand-mark.svg'],
      manifest: {
        name: 'Science By HUGs Core',
        short_name: 'Core',
        description: 'Internal operations and administration PWA for Science By HUGs.',
        theme_color: '#050505',
        background_color: '#050505',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          {
            src: `${base}brand-mark.svg`,
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})
