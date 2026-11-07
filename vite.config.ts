/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Connect, type Plugin, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Room names contain dots (e.g. "...@readie.io~~a39..."), which Vite's default SPA
 * fallback treats as file requests. Serve index.html for every app route instead,
 * so pasted links and refreshes work in dev and preview.
 */
function spaRoutesFallback(): Plugin {
  const rewrite: Connect.NextHandleFunction = (req, _res, next) => {
    const accept = req.headers.accept ?? '';
    if (req.method === 'GET' && req.url && /^\/(jobs|help)(\/|$|\?)/.test(req.url) && accept.includes('text/html')) {
      req.url = '/index.html';
    }
    next();
  };
  return {
    name: 'spa-routes-fallback',
    configureServer: (server) => {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer: (server) => {
      server.middlewares.use(rewrite);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.API_PROXY_TARGET;
  const basePath = env.VITE_API_BASE_PATH ?? '/api';
  const serverAuth =
    env.API_AUTH_KEY && env.API_BASIC_TOKEN ? { MyAuthorizationx: env.API_AUTH_KEY, Authorization: `Basic ${env.API_BASIC_TOKEN}` } : null;

  // The Readie API rejects CORS preflight (403 on OPTIONS), so the browser talks
  // to this same-origin proxy. The path is forwarded verbatim: no re-encoding.
  const proxy: Record<string, ProxyOptions> | undefined = target
    ? {
        [basePath]: {
          target,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.slice(basePath.length),
          // Proxy-credentials mode: inject server-only secrets so nothing sensitive ships in the bundle.
          ...(serverAuth ? { headers: serverAuth } : {}),
        },
      }
    : undefined;

  return {
    plugins: [spaRoutesFallback(), react(), tailwindcss()],
    server: proxy ? { proxy } : {},
    preview: proxy ? { proxy } : {},
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
      env: { VITE_API_MODE: 'mock', VITE_API_BASE_PATH: 'http://localhost:3000/api' },
    },
  };
});
