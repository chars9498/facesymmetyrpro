import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    define: {
      'process.env': { ...env, ...process.env },
      'process.env.GEMINI_API_KEY': JSON.stringify(env.REAL_KEY || process.env.REAL_KEY || env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''),
      'process.env.REAL_KEY': JSON.stringify(env.REAL_KEY || process.env.REAL_KEY || ''),
    },
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        filename: 'sw.js',
        injectRegister: 'auto',
        manifest: false,
        devOptions: {
          enabled: true
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'icon-192.png', 'icon-512.png', 'icon-192.svg', 'icon-512.svg', 'manifest.webmanifest'],
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
