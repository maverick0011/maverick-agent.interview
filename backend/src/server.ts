import express, { type Request, type Response, type NextFunction } from 'express';
import { setTimeout as delay } from 'node:timers/promises';

const app = express();
const HOST = '127.0.0.1';
const PORT = Number(process.env.MAVERICK_PORT || 3001);
const OLLAMA_URL = 'http://127.0.0.1:11434';

const defaultOrigins = [
  'https://maverick0011.github.io',
  'https://interview.cloudnativeacademy.in',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];
const allowedOrigins = new Set([
  ...defaultOrigins,
  ...(process.env.MAVERICK_ALLOWED_ORIGINS || '').split(',').map((v) => v.trim()).filter(Boolean),
]);
if (process.env.MAVERICK_ALLOW_NULL_ORIGIN === 'true') allowedOrigins.add('null');

// Small in-memory per-client limiter. This is intentionally local-only.
const windows = new Map<string, { count: number; resetAt: number }>();
function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.socket.remoteAddress || 'local';
  const now = Date.now();
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + 60_000 });
    return next();
  }
  current.count += 1;
  if (current.count > 180) return res.status(429).json({ error: 'Local request rate limit exceeded' });
  return next();
}

app.disable('x-powered-by');
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.has(origin)) {
    return res.status(403).json({ error: 'Origin is not allowed by Maverick AI local backend' });
  }
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '600');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});
app.use(rateLimit);
app.use(express.json({ limit: '2mb', strict: true }));

app.get('/api/health', async (_req, res) => {
  let ollama = false;
  try {
    const response = await fetch(`${OLLAMA_URL}/api/version`, { signal: AbortSignal.timeout(1500) });
    ollama = response.ok;
  } catch {
    // The API itself remains healthy while Ollama is stopped.
  }
  res.json({
    status: 'online',
    service: 'Maverick AI local backend',
    ollama: ollama ? 'online' : 'offline',
    modelRuntime: 'local',
  });
});

const allowedRoutes = new Set([
  'GET /api/version',
  'GET /api/tags',
  'GET /api/ps',
  'POST /api/chat',
  'POST /api/generate',
  'POST /api/pull',
  'POST /api/embed',
  'POST /api/embeddings',
  'POST /api/show',
]);

app.use('/ollama', async (req, res) => {
  const route = `${req.method} ${req.path}`;
  if (!allowedRoutes.has(route)) {
    return res.status(404).json({ error: 'Ollama endpoint is not exposed by this local proxy' });
  }

  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });

  try {
    const upstream = await fetch(`${OLLAMA_URL}${req.path}`, {
      method: req.method,
      headers: req.method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body: req.method === 'POST' ? JSON.stringify(req.body ?? {}) : undefined,
      signal: controller.signal,
    });

    res.status(upstream.status);
    const contentType = upstream.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store');

    if (!upstream.body) return res.end();
    for await (const chunk of upstream.body) {
      if (res.destroyed) break;
      res.write(chunk);
    }
    res.end();
  } catch (error) {
    if (res.headersSent || res.destroyed) return;
    const message = error instanceof Error ? error.message : 'Unknown local Ollama error';
    res.status(502).json({
      error: 'Cannot reach local Ollama. Start Ollama on this Mac and try again.',
      detail: message,
    });
  }
});

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

app.listen(PORT, HOST, () => {
  console.log(`Maverick AI local backend listening on http://${HOST}:${PORT}`);
  console.log(`Ollama upstream: ${OLLAMA_URL}`);
  console.log('Only loopback clients can connect; remote network binding is disabled.');
});
