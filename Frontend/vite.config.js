import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';

  // Only use HTTPS certs in dev if they exist (not needed in production)
  const httpsConfig = (!isProd && fs.existsSync('./key.pem') && fs.existsSync('./cert.pem'))
    ? { key: './key.pem', cert: './cert.pem' }
    : false;

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
      https: httpsConfig,
      // PROXY: forward /api requests to backend (dev only)
      proxy: {
        '/api': {
          target: env.VITE_API_TARGET || 'http://127.0.0.1:5002',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      port: 10000,   // Render uses port 10000
      host: true,
    },
    assetsInclude: ['**/*.svg', '**/*.csv'],
  };
});
