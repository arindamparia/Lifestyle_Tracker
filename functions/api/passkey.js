import crypto from 'crypto';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

const PASSKEY_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS passkeys (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  credential_id TEXT UNIQUE NOT NULL,
  public_key    TEXT NOT NULL,
  algorithm     INTEGER NOT NULL DEFAULT -7,
  counter       INTEGER NOT NULL DEFAULT 0,
  device_name   TEXT DEFAULT 'Passkey Device',
  created_at    TEXT DEFAULT (CURRENT_TIMESTAMP),
  last_used_at  TEXT DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_passkeys_cred ON passkeys(credential_id);

CREATE TABLE IF NOT EXISTS passkey_challenges (
  challenge   TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  expires_at  INTEGER NOT NULL
);
`;

let schemaInitialized = false;
async function ensurePasskeySchema(db) {
  if (schemaInitialized || !db) return;
  try {
    await db.exec(PASSKEY_SCHEMA_SQL);
    schemaInitialized = true;
  } catch (err) {
    console.error('[Passkey] Schema initialization error:', err);
  }
}

function verifyToken(token, rawSecret) {
  const secret = (rawSecret || '').replace(/^["']|["']$/g, '').trim();
  if (!token || !secret) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'base64url'), Buffer.from(expected, 'base64url'))) return false;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.exp > Date.now();
  } catch { return false; }
}

function createToken(secret) {
  const payload = Buffer.from(
    JSON.stringify({ ts: Date.now(), exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function base64UrlToBase64(base64url) {
  let b64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  return b64;
}

function loadPublicKey(storedKey) {
  if (!storedKey) throw new Error('Stored public key is empty');
  
  // 1. Try parsing directly as SPKI DER buffer (covers standard Base64URL and Base64)
  try {
    let derBuf;
    if (typeof storedKey === 'string') {
      if (storedKey.includes('-----BEGIN')) {
        return crypto.createPublicKey(storedKey);
      }
      derBuf = Buffer.from(storedKey, 'base64url');
    } else {
      derBuf = Buffer.from(storedKey);
    }
    return crypto.createPublicKey({ key: derBuf, format: 'der', type: 'spki' });
  } catch (e1) {
    // 2. Fallback to standard PEM reconstruction with proper line formatting
    try {
      const b64 = base64UrlToBase64(typeof storedKey === 'string' ? storedKey : storedKey.toString());
      const formatted = b64.match(/.{1,64}/g)?.join('\n') || b64;
      const pem = `-----BEGIN PUBLIC KEY-----\n${formatted}\n-----END PUBLIC KEY-----\n`;
      return crypto.createPublicKey(pem);
    } catch (e2) {
      throw new Error(`Decoder unsupported: ${e1.message}`);
    }
  }
}

function parseClientData(clientDataBase64Url) {
  try {
    const jsonStr = Buffer.from(clientDataBase64Url, 'base64url').toString('utf8');
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || '';
  const configuredSecret = (env.APP_SECRET || '').replace(/^["']|["']$/g, '').trim();

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const db = env.DB || env.DATABASE;
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database (D1) binding is missing in Cloudflare environment.' }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }

  await ensurePasskeySchema(db);

  // Clean expired challenges periodically
  try {
    await db.prepare('DELETE FROM passkey_challenges WHERE expires_at < ?').bind(Date.now()).run();
  } catch {}

  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  // ──────────────────────────────────────────────────────────────────────────
  // ACTION: register-options (Generate challenge for passkey creation)
  // Requires valid token
  // ──────────────────────────────────────────────────────────────────────────
  if (action === 'register-options' && request.method === 'POST') {
    if (!verifyToken(token, configuredSecret)) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Valid session required to register a Passkey' }), {
        status: 401,
        headers: CORS_HEADERS,
      });
    }

    const challenge = crypto.randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + 5 * 60 * 1000;

    await db.prepare('INSERT INTO passkey_challenges (challenge, type, expires_at) VALUES (?, ?, ?)')
      .bind(challenge, 'registration', expiresAt)
      .run();

    // Get existing credentials to exclude
    const { results: existingKeys } = await db.prepare('SELECT credential_id FROM passkeys').all();
    const excludeCredentials = (existingKeys || []).map(k => ({
      id: k.credential_id,
      type: 'public-key',
    }));

    const host = url.hostname;
    const rpId = host === 'localhost' || host === '127.0.0.1' ? host : host;

    const options = {
      challenge,
      rp: {
        name: 'DailyAlign Tracker',
        id: rpId,
      },
      user: {
        id: Buffer.from('dailyalign-user').toString('base64url'),
        name: 'user@dailyalign',
        displayName: 'DailyAlign User',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256 (ECDSA P-256)
        { type: 'public-key', alg: -257 }, // RS256 (RSA SHA-256)
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
      excludeCredentials,
    };

    return new Response(JSON.stringify(options), { status: 200, headers: CORS_HEADERS });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ACTION: register-verify (Verify registration & store public key)
  // Requires valid token
  // ──────────────────────────────────────────────────────────────────────────
  if (action === 'register-verify' && request.method === 'POST') {
    if (!verifyToken(token, configuredSecret)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
    }

    const body = await request.json().catch(() => ({}));
    const { id: credentialId, response, deviceName } = body;

    if (!credentialId || !response || !response.clientDataJSON) {
      return new Response(JSON.stringify({ error: 'Malformed registration payload' }), { status: 400, headers: CORS_HEADERS });
    }

    const clientData = parseClientData(response.clientDataJSON);
    if (!clientData || clientData.type !== 'webauthn.create') {
      return new Response(JSON.stringify({ error: 'Invalid clientData type' }), { status: 400, headers: CORS_HEADERS });
    }

    // Verify and consume challenge
    const challengeRow = await db.prepare('SELECT challenge FROM passkey_challenges WHERE challenge = ? AND type = ? AND expires_at >= ?')
      .bind(clientData.challenge, 'registration', Date.now())
      .first();

    if (!challengeRow) {
      return new Response(JSON.stringify({ error: 'Passkey registration challenge expired or invalid' }), { status: 400, headers: CORS_HEADERS });
    }

    // Delete challenge
    await db.prepare('DELETE FROM passkey_challenges WHERE challenge = ?').bind(clientData.challenge).run();

    // The public key is sent in SPKI DER format from getPublicKey()
    const spkiDerBase64 = response.publicKey;
    if (!spkiDerBase64) {
      return new Response(JSON.stringify({ error: 'Public key missing in registration response' }), { status: 400, headers: CORS_HEADERS });
    }

    const algorithm = response.algorithm || -7;
    const name = (deviceName || 'Passkey Device').trim().slice(0, 50);

    await db.prepare(
      'INSERT INTO passkeys (credential_id, public_key, algorithm, counter, device_name, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP) ' +
      'ON CONFLICT(credential_id) DO UPDATE SET public_key = excluded.public_key, device_name = excluded.device_name'
    ).bind(credentialId, spkiDerBase64, algorithm, 0, name).run();

    return new Response(JSON.stringify({ success: true, message: 'Passkey registered successfully!' }), {
      status: 200,
      headers: CORS_HEADERS,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ACTION: login-options (Generate challenge for Passkey authentication)
  // Public
  // ──────────────────────────────────────────────────────────────────────────
  if (action === 'login-options' && request.method === 'POST') {
    const challenge = crypto.randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + 5 * 60 * 1000;

    await db.prepare('INSERT INTO passkey_challenges (challenge, type, expires_at) VALUES (?, ?, ?)')
      .bind(challenge, 'login', expiresAt)
      .run();

    const { results: passkeys } = await db.prepare('SELECT credential_id FROM passkeys').all();
    const allowCredentials = (passkeys || []).map(k => ({
      id: k.credential_id,
      type: 'public-key',
    }));

    const host = url.hostname;
    const rpId = host === 'localhost' || host === '127.0.0.1' ? host : host;

    const options = {
      challenge,
      rpId,
      timeout: 60000,
      userVerification: 'preferred',
      allowCredentials,
    };

    return new Response(JSON.stringify(options), { status: 200, headers: CORS_HEADERS });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ACTION: login-verify (Verify Passkey signature & return session token)
  // Public
  // ──────────────────────────────────────────────────────────────────────────
  if (action === 'login-verify' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const { id: credentialId, response } = body;

    if (!credentialId || !response || !response.clientDataJSON || !response.authenticatorData || !response.signature) {
      return new Response(JSON.stringify({ error: 'Malformed authentication assertion payload' }), { status: 400, headers: CORS_HEADERS });
    }

    const clientData = parseClientData(response.clientDataJSON);
    if (!clientData || clientData.type !== 'webauthn.get') {
      return new Response(JSON.stringify({ error: 'Invalid clientData type' }), { status: 400, headers: CORS_HEADERS });
    }

    // Verify challenge
    const challengeRow = await db.prepare('SELECT challenge FROM passkey_challenges WHERE challenge = ? AND type = ? AND expires_at >= ?')
      .bind(clientData.challenge, 'login', Date.now())
      .first();

    if (!challengeRow) {
      return new Response(JSON.stringify({ error: 'Passkey login challenge expired or invalid' }), { status: 400, headers: CORS_HEADERS });
    }

    await db.prepare('DELETE FROM passkey_challenges WHERE challenge = ?').bind(clientData.challenge).run();

    // Fetch registered passkey
    const passkey = await db.prepare('SELECT * FROM passkeys WHERE credential_id = ?').bind(credentialId).first();
    if (!passkey) {
      return new Response(JSON.stringify({ error: 'Passkey not recognized' }), { status: 401, headers: CORS_HEADERS });
    }

    // Cryptographic signature verification
    try {
      const clientDataHash = crypto.createHash('sha256')
        .update(Buffer.from(response.clientDataJSON, 'base64url'))
        .digest();

      const authData = Buffer.from(response.authenticatorData, 'base64url');
      const signature = Buffer.from(response.signature, 'base64url');
      const signedData = Buffer.concat([authData, clientDataHash]);

      // Load stored public key object
      const publicKey = loadPublicKey(passkey.public_key);

      const isValid = crypto.verify('sha256', signedData, publicKey, signature);
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Passkey biometric signature verification failed' }), { status: 401, headers: CORS_HEADERS });
      }
    } catch (verErr) {
      console.error('[Passkey] Signature verification error:', verErr);
      return new Response(JSON.stringify({ error: `Verification failed: ${verErr.message}` }), { status: 401, headers: CORS_HEADERS });
    }

    // Update last used timestamp
    try {
      await db.prepare('UPDATE passkeys SET last_used_at = CURRENT_TIMESTAMP WHERE credential_id = ?')
        .bind(credentialId)
        .run();
    } catch {}

    const token = createToken(configuredSecret);
    return new Response(JSON.stringify({ success: true, token }), { status: 200, headers: CORS_HEADERS });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ACTION: list (List registered passkeys)
  // Requires valid token
  // ──────────────────────────────────────────────────────────────────────────
  if (action === 'list' && request.method === 'GET') {
    if (!verifyToken(token, configuredSecret)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
    }

    const { results } = await db.prepare(
      'SELECT id, credential_id, device_name, created_at, last_used_at FROM passkeys ORDER BY created_at DESC'
    ).all();

    return new Response(JSON.stringify({ passkeys: results || [] }), { status: 200, headers: CORS_HEADERS });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ACTION: delete (Delete registered passkey)
  // Requires valid token
  // ──────────────────────────────────────────────────────────────────────────
  if (action === 'delete' && request.method === 'DELETE') {
    if (!verifyToken(token, configuredSecret)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS });
    }

    const keyId = url.searchParams.get('id');
    const credId = url.searchParams.get('credential_id');

    if (keyId) {
      await db.prepare('DELETE FROM passkeys WHERE id = ?').bind(keyId).run();
    } else if (credId) {
      await db.prepare('DELETE FROM passkeys WHERE credential_id = ?').bind(credId).run();
    } else {
      return new Response(JSON.stringify({ error: 'Missing passkey ID' }), { status: 400, headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({ success: true, message: 'Passkey removed' }), { status: 200, headers: CORS_HEADERS });
  }

  return new Response(JSON.stringify({ error: 'Invalid action or method' }), { status: 400, headers: CORS_HEADERS });
}
