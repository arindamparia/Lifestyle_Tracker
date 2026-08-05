const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet(context) {
  const { env } = context;
  const config = {
    pusherKey: env.PUSHER_KEY,
    pusherCluster: env.PUSHER_CLUSTER,
  };

  return new Response(JSON.stringify(config), {
    status: 200,
    headers: CORS_HEADERS,
  });
}

export async function onRequest() {
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: CORS_HEADERS,
  });
}
