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
    const configuredPassword = (env.APP_PASSWORD || '').replace(/^["']|["']$/g, '').trim();
    const configuredSecret = (env.APP_SECRET || '').replace(/^["']|["']$/g, '').trim();

    if (!configuredPassword || !configuredSecret) {
      const missingVar = !configuredPassword ? 'APP_PASSWORD' : 'APP_SECRET';
      return new Response(
        JSON.stringify({
          error: `Server misconfiguration: ${missingVar} is missing in Cloudflare Pages Environment variables. Please ensure it is set under Settings > Environment variables in Cloudflare and trigger a redeployment.`,
        }),
        {
          status: 500,
          headers: CORS_HEADERS,
        }
      );
    }

    const body = await request.json().catch(() => ({}));
    const inputPassword = (body.password || '').trim();

    if (!inputPassword || inputPassword !== configuredPassword) {
      return new Response(JSON.stringify({ error: 'Invalid password' }), {
        status: 401,
        headers: CORS_HEADERS,
      });
    }

    const token = createToken(configuredSecret);
    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Bad request' }), {
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
