import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Direct Android APK file download endpoint
  app.get('/sonarr-android.apk', (_req, res) => {
    const apkPath = path.resolve(__dirname, 'public', 'sonarr-android.apk');
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="sonarr-android.apk"');
    res.sendFile(apkPath);
  });

  // Sonarr API CORS bypass proxy endpoint
  // Allows connecting to local Sonarr servers (e.g. http://192.168.1.50:8989) from browser without CORS issues
  app.all('/api/sonarr/proxy', async (req, res) => {
    try {
      const targetUrl = (req.query.url as string) || (req.body?.targetUrl as string);
      const apiKey = (req.headers['x-api-key'] as string) || (req.body?.apiKey as string);

      if (!targetUrl) {
        return res.status(400).json({ error: 'Missing targetUrl parameter' });
      }

      // Validate URL format
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(targetUrl);
      } catch {
        return res.status(400).json({ error: `Invalid URL format: ${targetUrl}` });
      }

      const method = (req.method === 'POST' && req.body?.method) ? req.body.method : req.method;
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };

      if (apiKey) {
        headers['X-Api-Key'] = apiKey;
      }

      const requestOptions: RequestInit = {
        method,
        headers,
      };

      if (req.method !== 'GET' && req.method !== 'HEAD' && req.body?.data) {
        headers['Content-Type'] = 'application/json';
        requestOptions.body = JSON.stringify(req.body.data);
      }

      // Add 12 second abort timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      requestOptions.signal = controller.signal;

      const response = await fetch(parsedUrl.toString(), requestOptions);
      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return res.status(response.status).json(data);
      } else {
        const text = await response.text();
        return res.status(response.status).send(text);
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('[Sonarr Proxy Error]', error.message);
      return res.status(502).json({
        error: 'Failed to communicate with Sonarr server',
        details: error.name === 'AbortError' ? 'Connection timed out after 12s' : error.message,
      });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sonarr Android server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
