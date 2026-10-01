import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'grain.svg'],
      manifest: {
        name: 'TrackBoii',
        short_name: 'TrackBoii',
        description: 'Prends ton plat en photo. On s\'occupe du reste.',
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        background_color: '#eef1f6',
        theme_color: '#eef1f6',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        globIgnores: ['**/DemoProvider-*.js'],
        navigateFallbackDenylist: [/^\/api\//, /^\/__\//]
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      output: {
        // Firebase dans son propre fichier : il change rarement, donc reste en cache entre deux mises à jour de l'app
        codeSplitting: {
          groups: [
            { name: 'firebase', test: /node_modules[\\/]@?firebase/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ }
          ]
        }
      }
    }
  },
  test: { environment: 'node' }
});
