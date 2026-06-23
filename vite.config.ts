/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import type { Connect } from 'vite'

// Custom middleware to proxy EPUB fetches
function epubProxyMiddleware(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    if (!req.url?.startsWith('/api/epub?')) {
      return next();
    }

    try {
      const urlParams = new URL(req.url, `http://${req.headers.host}`);
      const targetUrl = urlParams.searchParams.get('url');

      if (!targetUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing url parameter' }));
        return;
      }

      console.log('[EPUB Proxy] Fetching:', targetUrl);

      const response = await fetch(targetUrl);

      if (!response.ok) {
        res.writeHead(response.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Failed to fetch: ${response.status}` }));
        return;
      }

      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'application/epub+zip';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': buffer.byteLength.toString()
      });
      res.end(Buffer.from(buffer));

    } catch (error) {
      console.error('[EPUB Proxy] Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Fetch failed' }));
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'epub-proxy',
      configureServer(server) {
        server.middlewares.use(epubProxyMiddleware());
      }
    }
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  server: {
    host: true,
  }
})
