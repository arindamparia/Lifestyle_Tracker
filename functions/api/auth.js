import crypto from 'crypto';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

function createToken(secret) {
  const payload = Buffer.from(
    JSON.stringify({ ts: Date.now(), exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json().catch(() => ({}));
    const { password } = body;
    if (!password || password !== env.APP_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Invalid password' }), {
        status: 401,
        headers: CORS_HEADERS,
      });
    }
    const token = createToken(env.APP_SECRET);
    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Bad request' }), {
      status: 400,
      headers: CORS_HEADERS,
    });
  }
}

export async function onRequest() {
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: CORS_HEADERS,
  });
}
