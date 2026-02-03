import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // Modo embebido: npm run build:embed
    const isEmbed = process.env.BUILD_MODE === 'embed';
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [preact()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          'react': 'preact/compat',
          'react-dom': 'preact/compat',
          'react/jsx-runtime': 'preact/jsx-runtime'
        }
      },
      
      // Configuración para build embebido (Web Component)
      ...(isEmbed && {
        build: {
          lib: {
            entry: path.resolve(__dirname, 'src/webcomponent.tsx'),
            name: 'CargoImpConnector',
            fileName: () => 'cargo-imp-connector.js',
            formats: ['iife'] // Inmediately Invoked Function Expression - un solo archivo
          },
          rollupOptions: {
            output: {
              // Asegurar que todo quede en un solo archivo
              inlineDynamicImports: true,
              // No generar chunks separados
              manualChunks: undefined,
              // Nombre del archivo
              entryFileNames: 'cargo-imp-connector.js',
              // Sin CSS externo - todo embebido
              assetFileNames: (assetInfo) => {
                if (assetInfo.name === 'style.css') return 'cargo-imp-connector.css';
                return assetInfo.name || 'asset';
              }
            }
          },
          // Output directory para el bundle embebido
          outDir: 'dist-embed',
          // No minificar para debug (cambiar a true en prod)
          minify: true,
          // Generar sourcemap para debug
          sourcemap: false,
          // No limpiar el directorio para mantener archivos anteriores
          emptyOutDir: true,
          // Incluir CSS inline
          cssCodeSplit: false
        }
      })
    };
});
