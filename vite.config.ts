import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  define: {
    // Suppress vendor.js HMR errors in development
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    // Add version for cache busting
    '__APP_VERSION__': JSON.stringify('2.0.0'),
  },
  server: {
    port: 3000,
    host: true,
    hmr: {
      // Suppress HMR connection errors
      overlay: false,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          twa: ['@twa-dev/sdk'],
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/\.(css)$/.test(assetInfo.name)) {
            return `assets/[name]-[hash].${ext}`
          }
          return `assets/[name]-[hash].${ext}`
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  preview: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    host: '0.0.0.0',
    allowedHosts: ['healthcheck.railway.app', 'localhost', '.railway.app'],
    headers: {
      // Force no caching for HTML files
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      // Add version header
      'X-App-Version': '2.0.0',
    },
  },
}) 