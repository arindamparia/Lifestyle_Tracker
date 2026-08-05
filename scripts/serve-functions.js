/**
 * Local Functions Dev Server (Cloudflare Pages Functions with Local D1 SQLite)
 * Run in a separate terminal: npm run functions
 * Vite proxies /api/* here automatically (see vite.config.js)
 *
 * Uses Node built-in node:sqlite — zero external database dependencies needed.
 */

import http from 'http';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';

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
      process.env[key] ??= val.replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  console.log('✅ Loaded .env');
}

// ── Local SQLite D1 Mock ────────────────────────────────────────────────────
const localDbPath = resolve(ROOT, '.local-d1.sqlite');
const rawDb = new DatabaseSync(localDbPath);

const localD1 = {
  async exec(query) {
    return rawDb.exec(query);
  },
  prepare(query) {
    let boundValues = [];
    const helper = {
      bind(...values) {
        boundValues = values;
        return helper;
      },
      async first() {
        const stmt = rawDb.prepare(query);
        return stmt.get(...boundValues) || null;
      },
      async all() {
        const stmt = rawDb.prepare(query);
        const results = stmt.all(...boundValues);
        return { results };
      },
      async run() {
        const stmt = rawDb.prepare(query);
        const info = stmt.run(...boundValues);
        return { success: true, meta: info };
      }
    };
    return helper;
  }
};

// ── Function registry: Cloudflare functions/api/ ────────────────────────────
const FUNCTIONS = {
  'daily-log':     resolve(ROOT, 'functions/api/daily-log.js'),
  'auth':          resolve(ROOT, 'functions/api/auth.js'),
  'pusher-config': resolve(ROOT, 'functions/api/pusher-config.js'),
  'force-reload':  resolve(ROOT, 'functions/api/force-reload.js'),
};

// ── HTTP server ──────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-socket-id');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // Match /api/<name> or /.netlify/functions/<name>
  const match = url.pathname.match(/^(?:\/api|\/\.netlify\/functions)\/(.+)$/);
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

  // Read body
  let body = '';
  if (req.method === 'POST') {
    await new Promise(ok => { req.on('data', c => (body += c)); req.on('end', ok); });
  }

  console.log(`[${req.method}] ${url.pathname} - body:`, body ? body : '<empty>');

  try {
    const mod = await import(`${fnPath}?t=${Date.now()}`); // cache-bust each request

    // Check if Cloudflare Pages function or Netlify handler
    if (typeof mod.onRequest === 'function' || typeof mod.onRequestPost === 'function' || typeof mod.onRequestGet === 'function' || typeof mod.onRequestOptions === 'function') {
      const fullUrl = `http://localhost:${PORT}${url.pathname}${url.search}`;
      const webReq = new Request(fullUrl, {
        method: req.method,
        headers: req.headers,
        body: (req.method !== 'GET' && req.method !== 'HEAD' && body) ? body : undefined,
      });

      const context = {
        request: webReq,
        env: {
          ...process.env,
          DB: localD1,
        },
        params: {},
        waitUntil: () => {},
        next: () => {},
      };

      let response;
      if (req.method === 'OPTIONS' && typeof mod.onRequestOptions === 'function') {
        response = await mod.onRequestOptions(context);
      } else if (req.method === 'GET' && typeof mod.onRequestGet === 'function') {
        response = await mod.onRequestGet(context);
      } else if (req.method === 'POST' && typeof mod.onRequestPost === 'function') {
        response = await mod.onRequestPost(context);
      } else if (typeof mod.onRequest === 'function') {
        response = await mod.onRequest(context);
      } else {
        response = new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
      }

      res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
      const responseText = await response.text();
      res.end(responseText);
    } else if (typeof mod.handler === 'function') {
      const event = {
        httpMethod: req.method,
        path: url.pathname,
        queryStringParameters: Object.fromEntries(url.searchParams),
        headers: req.headers,
        body: body || null,
      };
      const result = await mod.handler(event);
      res.writeHead(result.statusCode ?? 200, result.headers ?? {});
      res.end(result.body ?? '');
    } else {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'No valid handler exported from function' }));
    }
  } catch (err) {
    console.error(`[${fnName}] Error:`, err.message);
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 Local functions server with SQLite D1 listening on http://localhost:${PORT}`);
  console.log(`   Database: ${localDbPath}`);
  console.log(`   /api/daily-log  →  functions/api/daily-log.js`);
  console.log(`   /api/auth       →  functions/api/auth.js`);
  console.log(`\n   Keep this terminal open. Open another for: npm run dev\n`);
});
