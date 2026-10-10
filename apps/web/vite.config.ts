/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Heart logo (public/): favicons, iPhone home-screen icon and the login logo.
      includeAssets: ['favicon-32x32.png', 'favicon-48x48.png', 'apple-touch-icon.png', 'logo-heart.png'],
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: 'Ventra',
        short_name: 'Ventra',
        description: 'Heart-failure self-care companion',
        theme_color: '#7CC7FE',
        background_color: '#F5F3EE',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts'],
  },
});
