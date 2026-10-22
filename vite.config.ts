import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    watch: {
      ignored: [
        '**/.rea-browser-profile/**',
        '**/research/**',
        '**/server/data/**',
        '**/*.sqlite*',
        '**/.git/**'
      ]
    },
    proxy: {
      '/api': { target: 'http://127.0.0.1:4000', changeOrigin: true }
    },
    open: false
  }
});

