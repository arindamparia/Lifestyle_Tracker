import crypto from 'crypto';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

function createToken() {
  const secret = process.env.APP_SECRET;
  const payload = Buffer.from(
    JSON.stringify({ ts: Date.now(), exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod === 'POST') {
    try {
      const { password } = JSON.parse(event.body || '{}');
      if (!password || password !== process.env.APP_PASSWORD) {
        return { statusCode: 401, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid password' }) };
      }
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ token: createToken() }) };
    } catch {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Bad request' }) };
    }
  }

  return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
};
