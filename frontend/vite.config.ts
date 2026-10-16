import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const studioPort = Number(process.env.BOOK_PORT || 43824);
const studioProxy = {target: `http://127.0.0.1:${studioPort}`, changeOrigin: true};
async function startPageStudio() {
  try {
    const response = await fetch(`http://127.0.0.1:${studioPort}/studio-app/health`, {signal: AbortSignal.timeout(1500)});
    if (response.ok && (await response.json()).version === 'root-migration-v1') return;
  } catch { /* Start the local application when it is not already running. */ }
  await require('../apps/page-studio/integration/host.cjs').start(studioPort);
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), {
      name: 'page-studio-original-app',
      async configureServer() { await startPageStudio(); },
      async configurePreviewServer() { await startPageStudio(); },
    }],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/studio-app': studioProxy,
        '/api': {
          target: process.env.BACKEND_URL || `http://localhost:${process.env.BACKEND_PORT || 8000}`,
          changeOrigin: true,
        },
      },
      port: Number(process.env.PORT) || 3000,
      host: true,
    },
    preview: {
      proxy: {
        '/studio-app': studioProxy,
      },
    },
  };
});
