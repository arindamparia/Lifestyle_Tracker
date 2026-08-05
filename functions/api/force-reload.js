import Pusher from 'pusher';
import crypto from 'crypto';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'OPTIONS, GET, POST',
  'Content-Type': 'application/json',
};

function verifyToken(token, secret) {
  if (!token || !secret) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (parsed.exp < Date.now()) return false;
  } catch { return false; }
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (method !== 'POST' && method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  const url = new URL(request.url);
  let authorized = false;

  if (method === 'GET') {
    const pwd = url.searchParams.get('pwd');
    if (pwd && pwd === env.APP_PASSWORD) {
      authorized = true;
    }
  } else {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (token && verifyToken(token, env.APP_SECRET)) {
      authorized = true;
    }
  }

  if (!authorized) {
    return new Response(
      JSON.stringify({
        error: 'Unauthorized. If using the browser URL bar, append ?pwd=YOUR_PASSWORD to the URL.',
      }),
      { status: 401, headers: CORS_HEADERS }
    );
  }

  if (!env.PUSHER_APP_ID || !env.PUSHER_KEY || !env.PUSHER_SECRET || !env.PUSHER_CLUSTER) {
    return new Response(JSON.stringify({ error: 'Pusher not configured' }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }

  try {
    const pusher = new Pusher({
      appId: env.PUSHER_APP_ID,
      key: env.PUSHER_KEY,
      secret: env.PUSHER_SECRET,
      cluster: env.PUSHER_CLUSTER,
      useTLS: true,
    });

    await pusher.trigger('dailyalign-channel', 'app_update', { timestamp: Date.now() });

    return new Response(
      JSON.stringify({ success: true, message: 'App update broadcast sent!' }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}
