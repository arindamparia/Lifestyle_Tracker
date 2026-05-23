const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  // Safe to expose to the frontend. Secret key is kept secure on the server.
  const config = {
    pusherKey: process.env.PUSHER_KEY,
    pusherCluster: process.env.PUSHER_CLUSTER
  };

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify(config)
  };
};
