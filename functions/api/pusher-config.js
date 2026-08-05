const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  const pusherKey = (env.PUSHER_KEY || '').replace(/^["']|["']$/g, '').trim();
  const pusherCluster = (env.PUSHER_CLUSTER || '').replace(/^["']|["']$/g, '').trim();

  return new Response(
    JSON.stringify({
      pusherKey,
      pusherCluster,
    }),
    {
      status: 200,
      headers: CORS_HEADERS,
    }
  );
}
