import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: true,
      port: 5173,
      https: {
        key: './key.pem',
        cert: './cert.pem',
      },
      // PROXY: forward /api requests to backend
      proxy: {
        '/api': {
          target: env.VITE_API_TARGET || 'http://127.0.0.1:5000',
          changeOrigin: true,
          secure: false,  // Allow proxy to non-HTTPS backend
        },
      },
    },
    assetsInclude: ['**/*.svg', '**/*.csv'],
  };
});
