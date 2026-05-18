import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Auto-update the service worker when a new deploy is detected.
      registerType: 'autoUpdate',

      // Use our hand-written manifest in public/ rather than generating one,
      // so the name/icons stay in one obvious place.
      manifest: false,
      includeAssets: [
        'favicon-32.png',
        'apple-touch-icon.png',
        'icon-192.png',
        'icon-512.png',
        'icon-maskable-512.png',
      ],

      workbox: {
        // Precache the built app shell + all bundled JSON data so the app
        // works fully offline after the first visit.
        globPatterns: ['**/*.{js,css,html,json,png,svg,woff2}'],
        // The vocabulary/verb/sentence JSON bundles are large; bump the
        // single-file precache cap so they are included.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },

      devOptions: {
        enabled: true,
      },
    }),
  ],
});
