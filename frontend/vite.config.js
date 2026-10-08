import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/uploads': 'http://localhost:5000',
      '/avatars': 'http://localhost:5000',
    },
  },
  build: {
    // Disable source maps completely so no source files/folders appear in browser DevTools Sources
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Obfuscate / hash chunk and asset filenames
        entryFileNames: 'assets/[hash].js',
        chunkFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash].[ext]',
      },
    },
  },
  esbuild: {
    // Remove console.log and debugger statements from production bundle
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
});
