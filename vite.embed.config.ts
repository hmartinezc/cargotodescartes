import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Configuración de Vite para compilar el Web Component embebible
 * Uso: npx vite build --config vite.embed.config.ts
 */
export default defineConfig({
  plugins: [react()],
  define: {
    // CRÍTICO: Reemplazar process.env.NODE_ENV para que funcione en el navegador
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': JSON.stringify({})
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/webcomponent.tsx'),
      name: 'TraxonConnector',
      fileName: () => 'traxon-connector.js',
      formats: ['iife']
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
        entryFileNames: 'traxon-connector.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'traxon-connector.css';
          return assetInfo.name || 'asset';
        }
      }
    },
    outDir: 'dist-embed',
    minify: true,
    sourcemap: false,
    emptyOutDir: true,
    cssCodeSplit: false
  }
});
