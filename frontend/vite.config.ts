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
    if (response.ok) {
      const health=await response.json();
      if(health.version==='root-migration-v1'&&health.queueSupported&&health.qqOnly&&health.agentSearchSupported){
        const hostFile=require.resolve('../apps/page-studio/integration/host.cjs');
        // Refresh cached adapters on Vite restart while preserving the active engine.
        if(require.cache[hostFile]?.exports.queue){
          const loader=require.resolve('../apps/page-studio/integration/reload.cjs');delete require.cache[loader];
          await require(loader).loadHost();
        }
        return;
      }
    }
  } catch { /* Start the local application when it is not already running. */ }
  const loader=require.resolve('../apps/page-studio/integration/reload.cjs');delete require.cache[loader];
  const host=await require(loader).loadHost();
  await host.start(studioPort);
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), {
      name: 'page-studio-original-app-v2',
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

