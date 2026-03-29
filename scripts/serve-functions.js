/**
 * Local Netlify Functions dev server
 * Run in a separate terminal: npm run functions
 * Vite proxies /.netlify/functions/* here automatically (see vite.config.js)
 *
 * Uses only Node built-in modules — no extra packages needed.
 */

import http from 'http';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PORT = 9888;

// ── Load .env ────────────────────────────────────────────────────────────────
const envFile = resolve(ROOT, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([^#=][^=]*?)\s*=\s*(.*?)\s*$/);
    if (m) {
      const [, key, val] = m;
      // strip surrounding quotes if present
      process.env[key] ??= val.replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  console.log('✅ Loaded .env');
} else {
  console.warn('⚠️  No .env file found — DATABASE_URL must be set in the environment');
}

// ── Function registry: add more functions here if needed ─────────────────────
const FUNCTIONS = {
  'daily-log': resolve(ROOT, 'netlify/functions/daily-log.js'),
  'auth':      resolve(ROOT, 'netlify/functions/auth.js'),
};

// ── HTTP server ──────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS — allow Vite dev server to call us
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // Match /.netlify/functions/<name>
  const match = url.pathname.match(/^\/.netlify\/functions\/(.+)$/);
  if (!match) {
    res.writeHead(404);
    return res.end(JSON.stringify({ error: 'Route not found' }));
  }

  const fnName = match[1];
  const fnPath = FUNCTIONS[fnName];
  if (!fnPath || !existsSync(fnPath)) {
    res.writeHead(404);
    return res.end(JSON.stringify({ error: `Function "${fnName}" not found` }));
  }

  // Read POST body
  let body = '';
  if (req.method === 'POST') {
    await new Promise(ok => { req.on('data', c => (body += c)); req.on('end', ok); });
  }

  // Build event object identical to what Netlify passes
  const event = {
    httpMethod: req.method,
    path: url.pathname,
    queryStringParameters: Object.fromEntries(url.searchParams),
    headers: req.headers,
    body: body || null,
  };

  try {
    // Dynamic import — Node caches modules, so restart the server if you edit functions
    const { handler } = await import(`${fnPath}?t=${Date.now()}`); // cache-bust each request
    const result = await handler(event);
    res.writeHead(result.statusCode ?? 200, result.headers ?? {});
    res.end(result.body ?? '');
  } catch (err) {
    console.error(`[${fnName}] Error:`, err.message);
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 Local functions server listening on http://localhost:${PORT}`);
  console.log(`   /.netlify/functions/daily-log  →  netlify/functions/daily-log.js`);
  console.log(`\n   Keep this terminal open. Open another for: npm run dev\n`);
});
