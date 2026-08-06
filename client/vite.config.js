import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // Same-origin in development, so no CORS round trip and no base-URL config.
      '/api': {
        target: 'https://embelliish.onrender.com',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'https://embelliish.onrender.com',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Vendor code changes far less often than app code; splitting it keeps
        // the cached chunk stable across deploys.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          icons: ['lucide-react'],
        },
      },
    },
  },
});
